/**
 * What the runtime must leave alone, and what it must not add
 * (specs/analytics-privacy.md § Gate item 4, § Storage, § Capture Minimization
 * item 5): PRIV-7 (person profiles and the internal/test-traffic basis),
 * PRIV-16 (no new identity, advertising, or enrichment feature), the
 * local-host skip, and "no cookie is added".
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FIXTURE_PATH, LOCAL_HOST_ALIAS, REPO_ROOT, TEST_HOST } from './harness/constants';
import {
  eventsNamed,
  expectCollecting,
  gateReady,
  humanActivity,
  interactWithFixture,
  storageWith,
} from './harness/helpers';
import { expect, test } from './harness/test';

test.describe('PostHog identity and exclusion basis (PRIV-7)', () => {
  test('PRIV-7 person_profiles stays "always", and the properties the internal/test-traffic exclusions match are untouched', async ({
    open,
  }) => {
    const s = await open();
    await s.goto(FIXTURE_PATH);
    await expectCollecting(s, { ga4: false });
    // The SDK's own effective config, read from the page.
    const config = await s.page.evaluate(
      () =>
        (window as unknown as { posthog: { config: { person_profiles: string } } }).posthog.config
          .person_profiles,
    );
    expect(config).toBe('always');

    const events = s.sink.posthogEvents();
    const pageview = eventsNamed(events, '$pageview')[0];
    expect(pageview, 'a $pageview was sent').toBeDefined();
    // Person profiles are processed (the cohort filter depends on person properties) ...
    expect(pageview?.properties.$process_person_profile).toBe(true);
    expect(
      (pageview?.$set_once as Record<string, unknown> | undefined)?.$initial_host,
      'person properties are still set',
    ).toBe(TEST_HOST);
    // ... and $host is the page's real host, unscrubbed: the project's test_account_filters exclude on it.
    expect(pageview?.properties.$host).toBe(TEST_HOST);
    expect(String(pageview?.properties.$current_url).startsWith(`https://${TEST_HOST}/`)).toBe(
      true,
    );
    for (const { event } of events) {
      if (event.event === '$snapshot') continue;
      expect(event.properties.$process_person_profile, `${event.event} processes the person`).toBe(
        true,
      );
      expect(event.properties.$host, `${event.event} $host`).toBe(TEST_HOST);
    }
  });

  test('PRIV-7 the localhost skip holds: on a *.localhost host the gate grants but PostHog never initializes and sends nothing', async ({
    open,
  }) => {
    const s = await open();
    // Positive control for the page itself: the same fixture on the non-local host initializes PostHog.
    await s.page.goto(`https://${LOCAL_HOST_ALIAS}${FIXTURE_PATH}`, { waitUntil: 'load' });
    await gateReady(s.page);
    expect(await s.page.evaluate(() => location.hostname)).toBe(LOCAL_HOST_ALIAS);
    expect(await s.privacy()).toMatchObject({ effective: 'granted' });
    await s.page.waitForTimeout(6000);
    expect(
      await s.page.evaluate(() => typeof (window as unknown as { posthog?: unknown }).posthog),
    ).toBe('undefined');
    expect(s.sink.vendorRequests().filter((r) => r.vendor === 'posthog')).toEqual([]);

    const nonLocal = await open();
    const mark = nonLocal.sink.mark();
    await nonLocal.goto(FIXTURE_PATH);
    await expectCollecting(nonLocal, { ga4: false, mark });
  });
});

test.describe('nothing new (PRIV-16)', () => {
  test('PRIV-16 a full visit identifies nobody, contacts no advertising host, and sends no PostHog identity event', async ({
    open,
    fixtureState,
  }) => {
    test.setTimeout(90_000);
    const s = await open();
    await s.goto(FIXTURE_PATH);
    await expectCollecting(s, { ga4: fixtureState.gtag.available });
    await interactWithFixture(s.page);
    await humanActivity(s.page);
    await s.page.waitForTimeout(3500);
    await s.page.goto('about:blank');
    await s.page.waitForTimeout(1500);

    // Hosts: only the three the site has always used.
    const hosts = new Set(s.sink.vendorRequests().map((r) => r.host));
    const expected = ['d.nathanpayne.com', 'www.googletagmanager.com', 'www.google-analytics.com'];
    expect(
      [...hosts].filter((h) => !expected.includes(h)),
      'no analytics-vendor host beyond the three in use',
    ).toEqual([]);
    expect(
      [...hosts].filter((h) =>
        /doubleclick|googleadservices|googlesyndication|facebook|linkedin|twitter|tiktok/.test(h),
      ),
      'no advertising host contacted',
    ).toEqual([]);
    expect(
      s
        .attemptedVendorRequests()
        .filter((r) => /doubleclick|googleadservices|google\.com\/(ads|pagead)/.test(r.url)),
    ).toEqual([]);

    // Identity: the site never calls identify(), and nothing new does.
    const names = new Set(s.sink.posthogEvents().map(({ event }) => event.event));
    for (const forbidden of [
      '$identify',
      '$create_alias',
      '$set',
      '$unset',
      '$groupidentify',
      '$merge_dangerously',
    ]) {
      expect(names.has(forbidden), `no ${forbidden} event`).toBe(false);
    }
    for (const { event } of s.sink.posthogEvents()) {
      expect(event.properties.$is_identified, `${event.event} is anonymous`).not.toBe(true);
    }

    // GA4: report any parameter the production capture did not record (informational: gtag.js moves under us).
    if (fixtureState.gtag.available) {
      const capture = readFileSync(join(REPO_ROOT, 'docs/privacy/capture-2026-10-08.md'), 'utf8');
      const line = /Query-string parameter names: ([^\n]+)/.exec(capture)?.[1] ?? '';
      const baseline = new Set([...line.matchAll(/`([^`]+)`/g)].map((m) => m[1]!));
      baseline.add('dr');
      const observed = new Set(
        s.sink.ga4Events().flatMap(({ event }) => Object.keys(event.params)),
      );
      const novel = [...observed].filter((k) => !baseline.has(k) && !/^(ep|epn|up|upn)\./.test(k));
      test.info().annotations.push({
        type: 'ga4-parameters',
        description: `${observed.size} parameter names observed; not in the production capture: ${novel.join(', ') || 'none'}`,
      });
    }
  });
});

test.describe('storage footprint', () => {
  test('PRIV-4 an opted-out visitor ends a visit with no cookie and only the np-privacy key in Web Storage', async ({
    open,
  }) => {
    const s = await open({ storageState: storageWith('denied') });
    await s.goto(FIXTURE_PATH);
    await s.page.waitForTimeout(4000);
    expect(await s.context.cookies()).toEqual([]);
    const storage = await s.page.evaluate(() => ({
      local: Object.keys(localStorage),
      session: Object.keys(sessionStorage),
    }));
    expect(storage.local).toEqual(['np-privacy']);
    expect(storage.session).toEqual([]);
  });

  test('PRIV-3 the gate adds no cookie: a default-on visit sets only the vendors cookies, never one for np-privacy', async ({
    open,
    fixtureState,
  }) => {
    const s = await open();
    await s.goto(FIXTURE_PATH);
    await expectCollecting(s, { ga4: fixtureState.gtag.available });
    await s.page.evaluate(() => window.npPrivacy?.set('denied'));
    const cookies = await s.context.cookies();
    expect(cookies.length, 'the vendors set their own cookies (positive control)').toBeGreaterThan(
      0,
    );
    expect(cookies.filter((c) => /np-?privacy/i.test(c.name))).toEqual([]);
    expect(
      cookies.filter((c) => !/^(ph_|_ga)/.test(c.name)),
      'no cookie other than PostHog and GA4',
    ).toEqual([]);
  });
});
