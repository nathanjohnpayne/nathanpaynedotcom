/**
 * Findings that are expected to stay open until Nathan decides. Each test
 * asserts the CLEAN outcome the contract asks for and is marked expected-to-
 * fail, so CI stays green while the finding is real and turns red the day it
 * stops being true (an expected failure that passes is reported as a failure).
 * When Nathan resolves an item, delete its `test.fail` line and the test
 * becomes an ordinary gate.
 *
 * Reported as PRIV-2 / PRIV-13 "not verified, pending Nathan", not as pass.
 */
import { CANARIES, FIXTURE_PATH } from './harness/constants';
import {
  canaryHits,
  clickOutbound,
  expectCollecting,
  fillContactForm,
  noteGa4Provenance,
  humanActivity,
  replayItems,
  urlViolations,
} from './harness/helpers';
import { expect, test } from './harness/test';

/** The GA4 enhanced-measurement parameters the contract names (video_url: no embedded video on this site). */
const ENHANCED_PARAMS = [
  'ep.link_url',
  'ep.link_domain',
  'ep.file_name',
  'ep.form_destination',
  'ep.search_term',
  'ep.video_url',
];

test.describe('pending Nathan', () => {
  test('PRIV-2 [PENDING NATHAN: expected to fail] GA4 enhanced-measurement parameters carry no sensitive query value or visitor-entered term', async ({
    open,
    fixtureState,
  }) => {
    test.setTimeout(120_000);
    test.skip(!fixtureState.gtag.available, 'not verified: no gtag.js fixture');
    test.fail(
      true,
      'Contract: gtag has no client-side hook for link_url, link_domain, file_name, form_destination, search_term, or video_url, so the runtime cannot scrub them. PRIV-2 stays NOT VERIFIED for GA4 enhanced measurement until Nathan changes the property settings (data redaction of query parameters, or which enhanced-measurement events stay on).',
    );
    noteGa4Provenance();
    const s = await open();
    await s.goto(`${FIXTURE_PATH}?q=${CANARIES.search}&utm_source=fixture#${CANARIES.fragment}`);
    await expectCollecting(s, { ga4: true });
    await humanActivity(s.page);
    // A sensitive value that is not email-shaped: the property's email redaction does not catch it.
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
    await fillContactForm(s.page);
    await s.page.waitForTimeout(3000);
    await s.page.goto('about:blank'); // unload flushes the delayed enhanced-measurement hits
    await s.page.waitForTimeout(2000);

    const leaks: string[] = [];
    const produced = new Set<string>();
    for (const { event } of s.sink.ga4Events()) {
      for (const key of ENHANCED_PARAMS) {
        const value = event.params[key];
        if (value === undefined) continue;
        produced.add(`${event.name}.${key.slice(3)}`);
        const hits = [...canaryHits(value), ...urlViolations(value).map((v) => v.reason)];
        if (hits.length > 0) leaks.push(`${event.name} ${key.slice(3)} (${hits.join('; ')})`);
      }
    }
    console.log(
      `[PRIV-2 finding] GA4 enhanced-measurement parameters produced: ${[...produced].join(', ')}`,
    );
    console.log(`[PRIV-2 finding] GA4 enhanced-measurement leaks: ${leaks.join(' | ') || 'none'}`);
    // `test.fail` above covers the leak assertion only: with nothing produced there is nothing to leak, which
    // means Nathan turned the events off (the finding is resolved) or gtag.js changed, so this skips as a
    // changed state rather than staying green as another expected failure.
    test.skip(
      produced.size === 0,
      'not verified: no enhanced-measurement parameters were produced. If the events were turned off, the finding is resolved: delete this test.fail and the skip.',
    );
    expect(leaks, 'enhanced-measurement parameters carrying a sensitive value').toEqual([]);
  });

  test('PRIV-2 PRIV-13 [PENDING NATHAN: expected to fail] URLs in console records are scrubbed like every other URL the recording holds', async ({
    open,
  }) => {
    test.fail(
      true,
      'Contract: with console capture on in PostHog remote config (Capture Conflicts C1) the runtime leaves it alone, yet "URL scrubbing still applies to any URL those features record". Console text is not rewritten, so a URL a page logs reaches the recording unscrubbed. Nathan decides: turn console capture off in the project, or accept and disclose.',
    );
    const s = await open();
    await s.goto(FIXTURE_PATH);
    await expectCollecting(s, { ga4: false });
    await s.page.evaluate(
      (m) => console.log(m),
      `np-console-probe https://nathanpayne.test/x?email=${CANARIES.query}%40example.test#${CANARIES.fragment}`,
    );
    await s.page.waitForTimeout(4000);
    await s.page.goto('about:blank');
    await s.page.waitForTimeout(1500); // let the unload flush reach the sink
    const consoleRecords = replayItems(s).filter(
      (i) => i.type === 6 && i.data?.plugin === 'rrweb/console@1',
    );
    // As above: no console records means console capture was turned off (resolved) or the probe was not
    // recorded, so the test skips instead of counting that as the expected failure.
    test.skip(
      consoleRecords.length === 0,
      'not verified: the console probe was not recorded. If console capture was turned off in the project, the finding is resolved: delete this test.fail and the skip.',
    );
    const text = JSON.stringify(consoleRecords);
    expect(canaryHits(text), 'sensitive URL parts in console records').toEqual([]);
  });
});
