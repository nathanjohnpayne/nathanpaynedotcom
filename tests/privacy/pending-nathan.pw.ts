/**
 * Findings that are expected to stay open until Nathan decides. Each finding is
 * two tests in a serial pair. The first MEASURES and is an ordinary test: it must
 * navigate, collect, interact, and decode, or it fails for real, and it stores
 * what it found. The second asserts the CLEAN outcome the contract asks for on
 * that stored result and is marked expected-to-fail, so CI stays green while the
 * finding is real and turns red the day it stops being true (an expected failure
 * that passes is reported as a failure). Because the expected failure covers the
 * assertion only, a broken navigation or decode can never be counted as the
 * finding. When Nathan resolves an item, delete its `test.fail` line and the
 * second test becomes an ordinary gate.
 *
 * Reported as PRIV-2 / PRIV-13 "not verified, pending Nathan", not as pass.
 *
 * The GA4 enhanced-measurement finding that lived here closed on 2026-10-10,
 * when Nathan turned the leaking events off in the property. Its test is now an
 * ordinary gate in ga4.pw.ts. The console-record pair is the only open finding.
 */
import { CANARIES, FIXTURE_PATH } from './harness/constants';
import { canaryHits, expectCollecting, replayItems, unloadAndSettle } from './harness/helpers';
import { expect, test } from './harness/test';

let consoleMeasurement: { text: string } | undefined;

test.describe.serial('pending Nathan: console records', () => {
  test('PRIV-2 PRIV-13 (measurement) a URL logged to the console is recorded, and the recording decodes', async ({
    open,
  }) => {
    consoleMeasurement = undefined;
    const s = await open();
    await s.goto(FIXTURE_PATH);
    await expectCollecting(s, { ga4: false });
    await s.page.evaluate(
      (m) => console.log(m),
      `np-console-probe https://nathanpayne.test/x?email=${CANARIES.query}%40example.test#${CANARIES.fragment}`,
    );
    await s.page.waitForTimeout(4000);
    await unloadAndSettle(s.page); // let the unload flush reach the sink
    expect(s.sink.undecodedCollection(), 'every replay body was decodable').toEqual([]);
    const consoleRecords = replayItems(s).filter(
      (i) => i.type === 6 && i.data?.plugin === 'rrweb/console@1',
    );
    // No console records means console capture was turned off (resolved) or the probe was not recorded.
    test.skip(
      consoleRecords.length === 0,
      'not verified: the console probe was not recorded. If console capture was turned off in the project, the finding is resolved: delete the test.fail in the next test and this skip.',
    );
    consoleMeasurement = { text: JSON.stringify(consoleRecords) };
  });

  test('PRIV-2 PRIV-13 [PENDING NATHAN: expected to fail] URLs in console records are scrubbed like every other URL the recording holds', () => {
    test.fail(
      true,
      'Contract: with console capture on in PostHog remote config (Capture Conflicts C1) the runtime leaves it alone, yet "URL scrubbing still applies to any URL those features record". Console text is not rewritten, so a URL a page logs reaches the recording unscrubbed. Nathan decides: turn console capture off in the project, or accept and disclose.',
    );
    test.skip(!consoleMeasurement, 'not verified: the measurement test did not complete');
    expect(
      canaryHits(consoleMeasurement?.text ?? ''),
      'sensitive URL parts in console records',
    ).toEqual([]);
  });
});
