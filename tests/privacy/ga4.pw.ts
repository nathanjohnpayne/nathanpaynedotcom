/**
 * GA4 transmitted payloads (specs/analytics-privacy.md § Capture Minimization
 * item 3 and § Test Fixture; PRIV-2).
 *
 * COVERAGE LEVEL. These tests run the real gtag.js, fetched at run time for the
 * production measurement ID (Node side only) and served under the fake test ID.
 * The results are VERIFIED against production when those bytes were fetched
 * from production this run and the fingerprint of their embedded configuration
 * (resource.tags, canonicalized) equals the one recorded in
 * tests/privacy/manifest.json and docs/privacy/inventory.md, with no
 * configuration findings (the provenance test below). The bytes themselves are
 * not pinned: Google rotates them roughly daily with the configuration
 * unchanged, so their SHA-256 and size are reported per run (setup log and a
 * `ga4-gtag-bytes` annotation) as evidence, not compared. A different
 * fingerprint means the property configuration changed: the provenance test is
 * skipped with a "re-record" reason (never passes), every GA4 test carries a
 * `ga4-not-verified` annotation, and the change goes to Nathan before anything
 * is recorded (docs/agents/testing-requirements.md, GA4 tag refresh). A cached
 * copy reused without a fetch has the recorded configuration but does not show
 * production still serves it, so the provenance test skips on it too. Without
 * a gtag.js fixture the GA4 tests skip entirely. With NP_PRIVACY_REQUIRE_GA4=1
 * (the #1233 release run) every one of those skips is a failure instead.
 *
 * Since 2026-10-10 the GA4 property has enhanced measurement limited to page
 * views and scrolls and user-provided data off. This file holds both halves:
 * page_view and scroll still reach the sink (positive controls), and the
 * disabled events and their parameters are not sent. The second half is NOT a
 * PRIV-2 scrubbing pass: a disabled event cannot be produced, so its positive
 * control is impossible and PRIV-2 for those fields is reported as not
 * applicable, disabled in configuration (verified by the configuration test).
 */
import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { CANARIES, FIXTURE_PATH, SITE_ORIGIN } from './harness/constants';
import {
  gtagConfigFindings,
  gtagEmbeddedTags,
  gtagProvenance,
  loadManifest,
  requireGa4,
  sha256Hex,
  type GtagState,
} from './harness/fixtures';
import type { Ga4Event } from './harness/payloads';
import {
  canaryHits,
  noteGa4Provenance,
  clickOutbound,
  contactHits,
  disabledEnhancedMeasurement,
  expectCollecting,
  fillContactForm,
  humanActivity,
  sensitiveFixtureUrl,
  urlViolations,
} from './harness/helpers';
import { expect, test, type Session } from './harness/test';

const SCRUBBED = `${SITE_ORIGIN}${FIXTURE_PATH}?utm_source=fixture`;

/** Skip with the reason, or fail with it under NP_PRIVACY_REQUIRE_GA4=1 (the release run accepts no GA4 skip). */
function skipOrRequire(condition: boolean, reason: string): void {
  if (condition && requireGa4()) throw new Error(`NP_PRIVACY_REQUIRE_GA4=1 but ${reason}`);
  test.skip(condition, reason);
}

/** Where the configuration evidence came from, for annotations: verified only on the recorded production configuration. */
function configEvidence(gtag: GtagState): string {
  return gtag.matchesProduction
    ? 'verified by the configuration test on the recorded production configuration'
    : 'indicative only: the configuration test read a gtag.js whose configuration is not the recorded production one';
}

test.beforeEach(({ fixtureState }) => {
  skipOrRequire(
    !fixtureState.gtag.available,
    `not verified: no gtag.js fixture (${fixtureState.gtag.reason ?? 'unavailable'})`,
  );
  noteGa4Provenance();
});

test.describe('GA4 provenance', () => {
  test('PRIV-2 GA4 transmitted-payload criteria are verified against the recorded production gtag.js configuration', ({
    fixtureState,
  }) => {
    // This is the criterion-level reading of every GA4 result in the suite. It passes only when the gtag.js the
    // suite serves was fetched from production this run and the fingerprint of its embedded configuration equals
    // the one recorded in the manifest, with no configuration findings. Anything else reads "re-record" (the
    // configuration changed) or "not checked" (a cached copy): skipped, never passed, and the other GA4 tests below
    // stay indicative. Under NP_PRIVACY_REQUIRE_GA4=1 either skip is a failure. The bytes are reported, not compared.
    const { gtag } = fixtureState;
    test.info().annotations.push({
      type: 'ga4-gtag-bytes',
      description: `gtag.js bytes this run (${gtag.source ?? 'unknown'}): SHA-256 ${gtag.rawSha256 ?? 'unknown'}, ${gtag.rawBytes ?? 'unknown'} bytes; configuration fingerprint ${gtag.configSha256 ?? 'unreadable'}. Evidence for this run, not a pin: Google rotates the bytes.`,
    });
    const recorded = loadManifest().gtag.production.configSha256;
    const verdict = gtagProvenance(gtag.configSha256, recorded, gtag.configFindings);
    skipOrRequire(
      verdict.status === 're-record',
      `re-record: ${(verdict as { reason?: string }).reason}`,
    );
    skipOrRequire(
      gtag.source !== 'fetched',
      'not checked against production: the cached gtag.js has the recorded configuration, but this run did not fetch it, so it does not show production still serves that configuration (run with CI=1, NP_PRIVACY_REFRESH=1, or NP_PRIVACY_REQUIRE_GA4=1)',
    );
    expect(gtag.matchesProduction, 'the setup reached the same verdict').toBe(true);
    expect(gtag.configSha256, 'fingerprint of the configuration as Google served it').toBe(
      recorded,
    );
    expect(gtag.configFindings, 'departures from the 2026-10-10 property settings').toEqual([]);
    // The bytes are evidence, not a pin: they were obtained and are not empty.
    expect(gtag.rawSha256, 'raw bytes as Google served them').toMatch(/^[0-9a-f]{64}$/);
    expect(gtag.rawBytes, 'size of the bytes as Google served them').toBeGreaterThan(100_000);
    // The copy the browser is served is the very file those bytes became, with only the ID substituted.
    expect(
      sha256Hex(readFileSync(fixtureState.gtagPath)),
      'the served copy is the measured copy',
    ).toBe(gtag.servedSha256);
    expect(gtag.substitutions, 'the production ID was replaced').toBeGreaterThan(0);
  });

  test('PRIV-2 the served gtag.js configuration has enhanced measurement on page views and scrolls only, and user-provided data off', ({
    fixtureState,
  }) => {
    const tags = gtagEmbeddedTags(readFileSync(fixtureState.gtagPath, 'utf8'));
    expect(
      tags,
      'the property configuration could be read from gtag.js (did Google change its format?)',
    ).toBeDefined();
    // Positive control: the parse found the tags that are on, so an empty "extra" list is not an empty parse.
    expect(tags!.map((t) => t.function)).toContain('__ccd_em_page_view');
    expect(gtagConfigFindings(tags!), 'departures from the 2026-10-10 property settings').toEqual(
      [],
    );
  });
});

/** How to make the fixture produce each enhanced-measurement event that is still on, and how to recognize it in the sink. */
const EVENTS: Array<{
  name: string;
  match: (e: Ga4Event) => boolean;
  trigger: (s: Session) => Promise<void>;
}> = [
  { name: 'page_view', match: (e) => e.name === 'page_view', trigger: async () => undefined },
  {
    name: 'scroll',
    match: (e) => e.name === 'scroll',
    trigger: async (s) => {
      await s.page.mouse.wheel(0, 2000);
    },
  },
];

/**
 * The fixture's forms end with `onsubmit="return false"`, which would stop a form_submit if the property sent
 * one. Clearing that handler on the page (not in the shipped fixture) lets the submission through, so a disabled
 * form event has every chance to appear; the submitted values are the fixture's own contact canaries.
 */
async function submitContactFormForReal(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.getElementById('fixture-contact-form')?.removeAttribute('onsubmit');
  });
  await fillContactForm(page);
}

/** Wait for the sink to hold an event, flushing the page's unload-time hits if it does not arrive on its own. */
async function eventually(s: Session, seen: () => boolean): Promise<boolean> {
  // gtag batches some hits; give it time, then unload the page, which flushes what is left.
  await expect
    .poll(seen, { timeout: 8000 })
    .toBe(true)
    .catch(() => undefined);
  if (!seen()) {
    await s.page.goto('about:blank');
    await s.page.waitForTimeout(1500);
  }
  return seen();
}

test.describe('GA4 positive controls', () => {
  for (const event of EVENTS) {
    test(`PRIV-2 positive control: GA4 ${event.name} reaches the sink from the fixture`, async ({
      open,
    }) => {
      const s = await open();
      await s.goto(FIXTURE_PATH);
      await expectCollecting(s, { ga4: true });
      await humanActivity(s.page);
      await event.trigger(s);
      const produced = await eventually(s, () =>
        s.sink.ga4Events().some(({ event: e }) => event.match(e)),
      );
      // These two events are on in the property, so a missing one is a defect (or a gtag.js change), not a skip.
      expect(produced, `GA4 ${event.name} reached the sink`).toBe(true);
    });
  }
});

test.describe('GA4 enhanced measurement', () => {
  test('PRIV-2 (not sent) the events and parameters the property disabled (search_term, link_url, form_destination, video) are not sent', async ({
    open,
    fixtureState,
  }) => {
    test.setTimeout(120_000);
    // What this test claims, and what it does not. The property disabled these events, so the page cannot produce
    // them and the contract's positive control ("the event reaches the sink first", specs/analytics-privacy.md §
    // Test Fixture) is impossible by construction. This test therefore does NOT report PRIV-2 scrubbing as passed
    // for these fields: it reports it as not applicable, because the events are disabled in the served
    // configuration, and the configuration test is the positive evidence. What is asserted below is the narrower
    // fact that none of them is sent.
    const tags = gtagEmbeddedTags(readFileSync(fixtureState.gtagPath, 'utf8'));
    expect(
      tags && gtagConfigFindings(tags),
      'the events are disabled in the served configuration (the positive evidence)',
    ).toEqual([]);
    test.info().annotations.push({
      type: 'ga4-priv2-disabled-fields',
      description: `PRIV-2 for search_term, link_url, link_domain, file_name, form_destination, and video_url: not applicable, disabled in configuration (${configEvidence(fixtureState.gtag)}). Not a scrubbing pass.`,
    });
    const s = await open();
    await s.goto(`${FIXTURE_PATH}?q=${CANARIES.search}&utm_source=fixture#${CANARIES.fragment}`);
    await expectCollecting(s, { ga4: true });
    await humanActivity(s.page);
    // Every interaction that used to send one of them: an outbound link whose query holds a non-email-shaped
    // sensitive value (which the property's email redaction would not catch), the fixture's own outbound link, a
    // download, and the contact form (typed into, then submitted for real).
    await s.page.evaluate((canary) => {
      const link = document.createElement('a');
      link.id = 'np-injected-outbound';
      link.target = '_blank';
      link.rel = 'noopener';
      link.href = `https://outbound.example.test/landing?token=${canary}&utm_source=fixture#${canary}`;
      link.textContent = 'Injected outbound link';
      document.getElementById('privacy-fixture')?.append(link);
    }, `${CANARIES.query}-TOKEN`);
    const popup = s.context.waitForEvent('page', { timeout: 5000 }).catch(() => null);
    await s.page.click('#np-injected-outbound');
    await (await popup)?.close().catch(() => undefined);
    await clickOutbound(s);
    const download = s.page.waitForEvent('download', { timeout: 10_000 }).catch(() => null);
    await s.page.click('#fixture-download-link');
    await download;
    await submitContactFormForReal(s.page);
    await s.page.mouse.wheel(0, 2000); // the one enhanced event still on, as the positive control
    const scrolled = await eventually(s, () =>
      s.sink.ga4Events().some(({ event }) => event.name === 'scroll'),
    );
    await s.page.goto('about:blank'); // unload flushes the delayed enhanced-measurement hits
    await s.page.waitForTimeout(2000);

    expect(s.sink.undecodedCollection(), 'every GA4 body was decodable').toEqual([]);
    const events = s.sink.ga4Events().map(({ event }) => event);
    // Positive controls: the page was collecting, and an enhanced-measurement event that is on was produced.
    expect(
      events.some((e) => e.name === 'page_view'),
      'GA4 page_view reached the sink',
    ).toBe(true);
    expect(scrolled, 'GA4 scroll reached the sink (enhanced measurement is live)').toBe(true);
    expect(
      disabledEnhancedMeasurement(events),
      'disabled enhanced-measurement events sent',
    ).toEqual([]);
    // Belt and braces: no value the interactions carried rode on any other event either.
    const text = s.sink.searchableText('ga4');
    expect(canaryHits(text), 'visitor-entered or sensitive values in GA4 payloads').toEqual([]);
  });

  test('PRIV-2 (control) the check sees a disabled enhanced-measurement event when one is sent', async ({
    open,
  }) => {
    const s = await open();
    await s.goto(FIXTURE_PATH);
    await expectCollecting(s, { ga4: true });
    // Simulate each disabled event the way the property used to send it (a hand-sent event carries the same
    // parameters), so the absence assertion above is shown to fail when the events come back.
    await s.page.evaluate(() => {
      window.gtag?.('event', 'file_download', {
        link_url: 'https://assets.example.test/report.pdf',
        file_name: 'report.pdf',
      });
      window.gtag?.('event', 'click', {
        outbound: true,
        link_url: 'https://outbound.example.test/landing',
        link_domain: 'outbound.example.test',
      });
      window.gtag?.('event', 'view_search_results', { search_term: 'np-control-term' });
      window.gtag?.('event', 'form_submit', {
        form_destination: 'https://outbound.example.test/f',
      });
      window.gtag?.('event', 'video_start', { video_url: 'https://outbound.example.test/v.mp4' });
    });
    const sent = await eventually(
      s,
      () => s.sink.ga4Events().filter(({ event }) => event.name === 'video_start').length > 0,
    );
    expect(sent, 'the hand-sent events reached the sink').toBe(true);
    const found = disabledEnhancedMeasurement(s.sink.ga4Events().map(({ event }) => event));
    for (const expected of [
      'event file_download',
      'event view_search_results',
      'event form_submit',
      'event video_start',
      'click parameter link_url',
      'click parameter outbound',
      'file_download parameter file_name',
      'form_submit parameter form_destination',
      'video_start parameter video_url',
      'view_search_results parameter search_term',
    ])
      expect(found, `detected: ${expected}`).toContain(expected);
  });
});

test.describe('GA4 page URLs', () => {
  test('PRIV-2 page_location and page_referrer are origin, path, and allowlisted parameters, with utm_source kept', async ({
    open,
  }) => {
    const sensitiveReferrer = `https://referrer.example.test/in?email=${CANARIES.query}%40example.test&utm_medium=fixture#${CANARIES.fragment}`;
    const s = await open({
      referrer: sensitiveReferrer,
    });
    await s.goto(sensitiveFixtureUrl());
    await expectCollecting(s, { ga4: true });
    const pageView = s.sink.ga4Events().find(({ event }) => event.name === 'page_view')?.event;
    // Positive controls: both fields are present, and the allowlisted parameters survived.
    expect(pageView?.params.dl, 'page_location').toBe(SCRUBBED);
    expect(pageView?.params.dr, 'page_referrer').toBe(
      'https://referrer.example.test/in?utm_medium=fixture',
    );
    // The sensitive page query is gone from every URL the standard hit carries.
    for (const { event } of s.sink.ga4Events()) {
      expect(event.params.dl, `${event.name} page_location`).toBe(SCRUBBED);
      if (event.params.dr)
        expect(event.params.dr).toBe('https://referrer.example.test/in?utm_medium=fixture');
    }
    expect(s.sink.undecodedCollection()).toEqual([]);
    // dl and dr are the two parameters the contract names. Check them rather than the whole hit, because
    // the GA4 enhanced-measurement test above covers the parameters the property no longer sends.
    const standard = s.sink
      .ga4Events()
      .flatMap(({ event }) =>
        [event.params.dl, event.params.dr].filter((v): v is string => Boolean(v)),
      )
      .join('\n');
    expect(canaryHits(standard)).toEqual([]);
    expect(urlViolations(standard)).toEqual([]);
  });
});

test.describe('GA4 user-provided data', () => {
  test('PRIV-2 no contact value, literal or SHA-256 hashed, and no user-data parameter appears in any GA4 payload after the contact form is used', async ({
    open,
    fixtureState,
  }) => {
    test.setTimeout(90_000);
    // User-provided data is off in the property (2026-10-10). The served configuration says so, which is why the
    // form events below no longer carry anything: the absence is explained, not just observed.
    const tags = gtagEmbeddedTags(readFileSync(fixtureState.gtagPath, 'utf8'));
    expect(
      tags?.filter((t) => t.function === '__ogt_1p_data_v2').map((t) => t.vtp_isEnabled),
      'user-provided data is disabled in the served configuration',
    ).toEqual([false]);

    const s = await open();
    await s.goto(FIXTURE_PATH);
    await expectCollecting(s, { ga4: true });
    await humanActivity(s.page);
    await submitContactFormForReal(s.page);
    await s.page.waitForTimeout(3000);
    await s.page.goto('about:blank'); // unload hits
    await s.page.waitForTimeout(1500);

    const events = s.sink.ga4Events();
    const ga4Text = s.sink.searchableText('ga4');
    expect(s.sink.undecodedCollection(), 'every GA4 body was decodable').toEqual([]);
    expect(
      events.some(({ event }) => event.name === 'page_view'),
      'GA4 was collecting while the form was used',
    ).toBe(true);
    expect(contactHits(ga4Text), 'contact values (literal or SHA-256) in GA4 payloads').toEqual([]);
    const userDataKeys = [
      ...new Set(events.flatMap(({ event }) => Object.keys(event.params))),
    ].filter((k) => /^(ep\.|epn\.)?(em|ph|ud|_ud)$/.test(k));
    expect(userDataKeys, 'user-data parameters in GA4 payloads').toEqual([]);
    test.info().annotations.push({
      type: 'ga4-user-data',
      description: `searched ${events.length} GA4 event(s) for literals and SHA-256 forms of email, E.164 phone, and street, and for user-data parameter names`,
    });
    test.info().annotations.push({
      type: 'ga4-priv2-disabled-fields',
      description: `PRIV-2 for user-provided data (automatic detection of email, phone, and address): not applicable, disabled in configuration (${configEvidence(fixtureState.gtag)}). The absence here is not a scrubbing pass; no GA4 form_submit can be produced to exercise detection.`,
    });
  });
});
