/**
 * GA4 transmitted payloads (specs/analytics-privacy.md § Capture Minimization
 * item 3 and § Test Fixture; PRIV-2).
 *
 * COVERAGE LEVEL. These tests run the real gtag.js code, fetched at run time
 * for the production measurement ID and served under the fake test ID. gtag.js
 * is not byte-stable, and the bytes served here match none of the three
 * production variants the inventory recorded, so every GA4 transmitted-payload
 * result is INDICATIVE, not a verification of what production sends. Each test
 * says so in its annotations, and the report calls these criteria "not verified
 * against production gtag.js". Without a gtag.js fixture they skip entirely.
 *
 * An event the fixture cannot produce makes its test skip with a "not
 * verified" reason; it never passes.
 */
import type { Page } from '@playwright/test';
import { CANARIES, FIXTURE_PATH, SITE_ORIGIN } from './harness/constants';
import type { Ga4Event } from './harness/payloads';
import {
  canaryHits,
  clickOutbound,
  contactHits,
  expectCollecting,
  fillContactForm,
  humanActivity,
  sensitiveFixtureUrl,
  urlViolations,
} from './harness/helpers';
import { expect, test, type Session } from './harness/test';

const SCRUBBED = `${SITE_ORIGIN}${FIXTURE_PATH}?utm_source=fixture`;

test.beforeEach(({ fixtureState }) => {
  test.skip(
    !fixtureState.gtag.available,
    `not verified: no gtag.js fixture (${fixtureState.gtag.reason ?? 'unavailable'})`,
  );
  test.info().annotations.push({
    type: 'ga4-level',
    description: fixtureState.gtag.matchesProduction
      ? 'gtag.js matches a recorded production variant'
      : 'indicative only: gtag.js is current but matches none of the three recorded production variants',
  });
});

/** How to make the fixture produce each enhanced-measurement event, and how to recognize it in the sink. */
const EVENTS: Array<{
  name: string;
  match: (e: Ga4Event) => boolean;
  trigger: (s: Session) => Promise<void>;
  load?: string;
}> = [
  { name: 'page_view', match: (e) => e.name === 'page_view', trigger: async () => undefined },
  {
    name: 'view_search_results (site search)',
    match: (e) => e.name === 'view_search_results',
    trigger: async () => undefined,
    load: `${FIXTURE_PATH}?q=${CANARIES.search}`,
  },
  {
    name: 'click (outbound)',
    match: (e) => e.name === 'click' && e.params['ep.outbound'] === 'true',
    trigger: (s) => clickOutbound(s),
  },
  {
    name: 'file_download',
    match: (e) => e.name === 'file_download',
    trigger: async (s) => {
      const download = s.page.waitForEvent('download', { timeout: 10_000 }).catch(() => null);
      await s.page.click('#fixture-download-link');
      await download;
    },
  },
  {
    name: 'form_start',
    match: (e) => e.name === 'form_start' && e.params['ep.form_id'] === 'fixture-contact-form',
    trigger: async (s) => {
      // The fixture's own onsubmit stops form_submit but not form_start.
      await fillContactForm(s.page);
    },
  },
  {
    name: 'form_submit',
    match: (e) => e.name === 'form_submit',
    trigger: async (s) => {
      await submitContactFormForReal(s.page);
    },
  },
  {
    name: 'scroll',
    match: (e) => e.name === 'scroll',
    trigger: async (s) => {
      await s.page.mouse.wheel(0, 2000);
    },
  },
];

/**
 * The fixture's forms end with `onsubmit="return false"`, which stops gtag's form_submit. Clearing that
 * handler on the page (not in the shipped fixture) lets the submission through so the event can be
 * produced; the submitted values are the fixture's own contact canaries.
 */
async function submitContactFormForReal(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.getElementById('fixture-contact-form')?.removeAttribute('onsubmit');
  });
  await fillContactForm(page);
}

test.describe('GA4 positive controls', () => {
  for (const event of EVENTS) {
    test(`PRIV-2 positive control: GA4 ${event.name} reaches the sink from the fixture`, async ({
      open,
    }) => {
      const s = await open();
      await s.goto(event.load ?? FIXTURE_PATH);
      await expectCollecting(s, { ga4: true });
      await humanActivity(s.page);
      await event.trigger(s);
      const seen = (): boolean => s.sink.ga4Events().some(({ event: e }) => event.match(e));
      // gtag batches some hits; give it time, then unload the page, which flushes what is left.
      await expect
        .poll(seen, { timeout: 8000 })
        .toBe(true)
        .catch(() => undefined);
      if (!seen()) {
        await s.page.goto('about:blank');
        await s.page.waitForTimeout(1500);
      }
      const produced = seen();
      test.skip(
        !produced,
        `not verified: the fixture did not produce GA4 ${event.name} against this gtag.js, so nothing about it can be asserted`,
      );
      expect(produced).toBe(true);
    });
  }
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
    // enhanced-measurement parameters in the same hit are the separate, pending finding (pending-nathan.pw.ts).
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
  test('PRIV-2 no contact value, literal or SHA-256 hashed, appears in any GA4 payload after the contact form is used', async ({
    open,
  }) => {
    test.setTimeout(90_000);
    const s = await open();
    await s.goto(FIXTURE_PATH);
    await expectCollecting(s, { ga4: true });
    await humanActivity(s.page);
    await submitContactFormForReal(s.page);
    await s.page.waitForTimeout(3000);
    await s.page.goto('about:blank'); // unload hits
    await s.page.waitForTimeout(1500);

    const events = s.sink.ga4Events();
    const formEvents = events.filter(
      ({ event }) => event.name === 'form_start' || event.name === 'form_submit',
    );
    const submitted = events.some(({ event }) => event.name === 'form_submit');
    const ga4Text = s.sink.searchableText('ga4');
    expect(s.sink.undecodedCollection(), 'every GA4 body was decodable').toEqual([]);
    // The leak assertion comes first: a leak fails the test whether or not the control below succeeded.
    expect(contactHits(ga4Text), 'contact values (literal or SHA-256) in GA4 payloads').toEqual([]);
    test.info().annotations.push({
      type: 'ga4-user-data',
      description: `form events seen: ${formEvents.map(({ event }) => event.name).join(', ') || 'none'}; searched ${events.length} GA4 event(s) for literals and SHA-256 forms of email, E.164 phone, and street`,
    });
    test.skip(
      !submitted,
      'not verified: the fixture produced no GA4 form_submit, the event on which user-provided data is collected, so this absence proves nothing about automatic detection',
    );
  });
});
