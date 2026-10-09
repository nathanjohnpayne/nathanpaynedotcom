/**
 * PostHog event payloads (specs/analytics-privacy.md § Capture Minimization, PRIV-2).
 *
 * Each absence assertion is preceded by the positive controls that show the
 * event it inspects was really sent and carried what it was supposed to
 * (the allowlisted parameter survives, the autocapture event exists, and so on).
 */
import { CANARIES, FIXTURE_PATH, SITE_ORIGIN } from './harness/constants';
import {
  ALLOWED_QUERY_PARAMS,
  canaryHits,
  clickOutbound,
  eventsNamed,
  expectCollecting,
  fillContactForm,
  humanActivity,
  interactWithFixture,
  sensitiveFixtureUrl,
  urlViolations,
} from './harness/helpers';
import { expect, test } from './harness/test';

const SCRUBBED_FIXTURE_URL = `${SITE_ORIGIN}${FIXTURE_PATH}?utm_source=fixture`;

test.describe('PostHog events', () => {
  test('PRIV-2 (instrument) a canary the page itself sends IS found in the sink, so the absence checks below can fail', async ({
    open,
  }) => {
    const s = await open();
    await s.goto(FIXTURE_PATH);
    await expectCollecting(s, { ga4: false });
    await s.page.evaluate(
      (canary) =>
        (window as unknown as { posthog: { capture(n: string, p: object): void } }).posthog.capture(
          'np_detector_control',
          { leak: canary },
        ),
      CANARIES.input,
    );
    await expect
      .poll(() => canaryHits(s.sink.searchableText('posthog')), {
        message: 'the detector sees a deliberate leak in real SDK traffic',
      })
      .toEqual([CANARIES.input]);
  });

  test('PRIV-2 no canary reaches any PostHog event, URLs are reduced to origin, path, and allowlisted parameters, and utm_source survives', async ({
    open,
  }) => {
    test.setTimeout(120_000);
    const s = await open();
    await s.goto(sensitiveFixtureUrl());
    await expectCollecting(s, { ga4: false });

    // Everything a visitor can do on the fixture: type, submit forms, click the PII button,
    // follow outbound and download links, fill the contact form.
    await interactWithFixture(s.page);
    await clickOutbound(s);
    const download = s.page.waitForEvent('download', { timeout: 10_000 });
    await s.page.click('#fixture-download-link');
    await download;
    await fillContactForm(s.page);
    await humanActivity(s.page);
    await s.page.waitForTimeout(3500);
    const beforeLink = s.sink.mark();
    // Follow the sensitive link: a second document, whose referrer is the first (sensitive) URL.
    await Promise.all([s.page.waitForLoadState('load'), s.page.click('#fixture-sensitive-link')]);
    await humanActivity(s.page);
    await expect
      .poll(() => eventsNamed(s.sink.posthogEvents(beforeLink), '$pageview').length, {
        message: 'the second document sent a $pageview',
      })
      .toBeGreaterThan(0);
    await s.page.waitForTimeout(5000);
    const cookies = await s.context.cookies();
    await s.page.goto('about:blank'); // unload flushes the rest through a beacon the proxy records

    await expect.poll(() => s.sink.posthogEvents().length).toBeGreaterThan(5);
    const all = s.sink.posthogEvents();
    const events = all.map(({ event }) => event);

    // --- Positive controls: each scrubbing rule had something to scrub, and the allowlist kept what it should.
    const pageviews = eventsNamed(all, '$pageview');
    expect(pageviews.length, 'a $pageview per document').toBeGreaterThanOrEqual(2);
    for (const pv of pageviews) {
      expect(
        pv.properties.$current_url,
        'sensitive query and fragment removed, utm_source=fixture kept',
      ).toBe(SCRUBBED_FIXTURE_URL);
    }
    const autocaptures = eventsNamed(all, '$autocapture');
    const piiClick = autocaptures.find(
      (e) =>
        String(e.properties.$elements_chain).includes('fixture-pii-button') &&
        e.properties.$event_type === 'click',
    );
    expect(piiClick, 'the click on the data-fixture-pii button was captured').toBeDefined();
    expect(String(piiClick?.properties.$el_text)).toBe('Fixture button');
    const outbound = autocaptures.find((e) => e.properties.$external_click_url !== undefined);
    expect(
      outbound?.properties.$external_click_url,
      'outbound click URL reduced, allowlisted parameter kept',
    ).toBe('https://outbound.example.test/landing?utm_source=fixture');
    expect(
      autocaptures.some((e) =>
        String(e.properties.$elements_chain).includes('fixture-download.pdf'),
      ),
      'the download link click was captured',
    ).toBe(true);
    expect(
      autocaptures.some((e) => e.properties.$event_type === 'submit'),
      'a form submission was captured',
    ).toBe(true);
    expect(
      autocaptures.some(
        (e) =>
          e.properties.$event_type === 'change' &&
          String(e.properties.$elements_chain).includes('fixture-text'),
      ),
      'typing into the text input was captured as a change event',
    ).toBe(true);
    const heatmaps = eventsNamed(all, '$$heatmap');
    expect(heatmaps.length).toBeGreaterThan(0);
    for (const h of heatmaps) {
      expect(
        Object.keys(h.properties.$heatmap_data as object),
        'heatmap keys are scrubbed page URLs',
      ).toEqual([SCRUBBED_FIXTURE_URL]);
    }
    expect(eventsNamed(all, '$web_vitals').length, 'web vitals events were sent').toBeGreaterThan(
      0,
    );

    // --- Absence checks, each over fully decoded payloads.
    expect(s.sink.undecodedCollection(), 'every collection body was decodable').toEqual([]);
    expect(
      canaryHits(s.sink.searchableText('posthog')),
      'no NP-CANARY-* string in any PostHog payload',
    ).toEqual([]);
    expect(
      urlViolations(s.sink.plainText('posthog')),
      'every URL is origin, path, and allowlisted parameters only',
    ).toEqual([]);

    // Element attributes: no data-* attribute and no inline style reaches an event.
    for (const e of autocaptures) {
      const chain = String(e.properties.$elements_chain);
      expect(chain, 'no data-* attribute in the elements chain').not.toMatch(/data-[a-z]/);
      expect(chain, 'no inline style in the elements chain').not.toMatch(/attr__style|style=/);
    }
    // The PostHog cookie is sent to the proxy host on every request in production (its domain is the
    // registrable domain), so what it stores is transmitted data too.
    const posthogCookies = cookies.filter((c) => c.name.startsWith('ph_'));
    expect(
      posthogCookies.length,
      'PostHog set its first-party cookie (positive control)',
    ).toBeGreaterThan(0);
    for (const c of posthogCookies) {
      expect(canaryHits(decodeURIComponent(c.value)), `cookie ${c.name} holds no canary`).toEqual(
        [],
      );
      expect(
        urlViolations(decodeURIComponent(c.value)),
        `cookie ${c.name} holds only scrubbed URLs`,
      ).toEqual([]);
    }
    // Event counts, for the evidence summary.
    test.info().annotations.push({
      type: 'evidence',
      description: `${events.length} PostHog events inspected: ${[...new Set(events.map((e) => e.event))].join(', ')}`,
    });
  });

  test('PRIV-2 every allowlisted parameter survives and everything else is dropped from $current_url', async ({
    open,
  }) => {
    const s = await open();
    const allowed = [...ALLOWED_QUERY_PARAMS].map((name) => `${name}=${name}-value`).join('&');
    await s.goto(
      `${FIXTURE_PATH}?email=${CANARIES.query}&token=${CANARIES.query}-2&ref=${CANARIES.fragment}&${allowed}#${CANARIES.fragment}`,
    );
    await expectCollecting(s, { ga4: false });
    const pageview = eventsNamed(s.sink.posthogEvents(), '$pageview')[0];
    const url = new URL(String(pageview?.properties.$current_url));
    expect([...url.searchParams.keys()].sort()).toEqual([...ALLOWED_QUERY_PARAMS].sort());
    expect(url.hash).toBe('');
    expect(url.origin + url.pathname).toBe(`${SITE_ORIGIN}${FIXTURE_PATH}`);
    expect(canaryHits(s.sink.searchableText('posthog'))).toEqual([]);
  });

  test('PRIV-2 a referrer that carries a sensitive query and fragment reaches PostHog reduced, with the allowlisted parameter kept', async ({
    open,
  }) => {
    // A cross-origin Referer is trimmed to its origin by the default policy, but a source page that sends
    // its full URL (Referrer-Policy: unsafe-url, or a same-origin navigation) gives the page one that is not.
    const sensitiveReferrer = `https://referrer.example.test/in?email=${CANARIES.query}%40example.test&utm_medium=fixture#${CANARIES.fragment}`;
    const s = await open({
      referrer: sensitiveReferrer,
    });
    await s.goto(FIXTURE_PATH);
    await expectCollecting(s, { ga4: false });
    const pageview = eventsNamed(s.sink.posthogEvents(), '$pageview')[0];
    expect(pageview?.properties.$referrer, 'referrer reduced, utm_medium kept').toBe(
      'https://referrer.example.test/in?utm_medium=fixture',
    );
    expect(pageview?.properties.$referring_domain).toBe('referrer.example.test');
    expect(canaryHits(s.sink.searchableText('posthog'))).toEqual([]);
    expect(urlViolations(s.sink.plainText('posthog'))).toEqual([]);
  });

  test('PRIV-2 site search values do not reach PostHog (the ?q= value is not allowlisted)', async ({
    open,
  }) => {
    const s = await open();
    await s.goto(`${FIXTURE_PATH}?q=${CANARIES.search}&utm_source=fixture`);
    await expectCollecting(s, { ga4: false });
    const pageview = eventsNamed(s.sink.posthogEvents(), '$pageview')[0];
    expect(pageview?.properties.$current_url).toBe(SCRUBBED_FIXTURE_URL);
    expect(canaryHits(s.sink.searchableText('posthog'))).toEqual([]);
  });

  test('PRIV-2 (observation) click identifiers outside the allowlist are copied into their own properties, a documented residual', async ({
    open,
  }) => {
    // specs/analytics.md § Not Changed: PostHog copies fbclid and similar identifiers into separate
    // properties; removing them would disable existing attribution, which needs Nathan's approval.
    // Recorded here so the behavior is visible; it is reported, not asserted, because the contract's
    // allowlist rule governs URLs and leaves these to Nathan's decision.
    const s = await open();
    await s.goto(`${FIXTURE_PATH}?fbclid=np-observation-fbclid&utm_source=fixture`);
    await expectCollecting(s, { ga4: false });
    const pageview = eventsNamed(s.sink.posthogEvents(), '$pageview')[0];
    expect(pageview?.properties.$current_url).toBe(SCRUBBED_FIXTURE_URL);
    test.info().annotations.push({
      type: 'finding',
      description: `fbclid copied into its own property outside the URL: ${'fbclid' in (pageview?.properties ?? {}) ? 'yes' : 'no'}`,
    });
  });
});
