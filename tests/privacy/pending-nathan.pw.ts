/**
 * Findings that stayed open until Nathan decided. Each finding was a serial pair:
 * an ordinary measuring test and an expected-to-fail assertion on its stored
 * result, so CI stayed green while the finding was real and turned red the day it
 * stopped being true.
 *
 * Both findings have since closed, and this file keeps only the resulting gate:
 * - GA4 enhanced measurement (PRIV-2) closed on 2026-10-10, when Nathan turned
 *   the leaking events off in the property. Its gate lives in ga4.pw.ts (#1262).
 * - Console records (PRIV-2, PRIV-13) closed with #1261. Its gate is below.
 */
import { CANARIES, FIXTURE_PATH } from './harness/constants';
import {
  canaryHits,
  expectCollecting,
  humanActivity,
  replayItems,
  unloadAndSettle,
} from './harness/helpers';
import { expect, test } from './harness/test';

// Resolved by #1261 (Nathan's decision 1 on #1079): console-log capture is off in client config, which wins over
// the project's remote config (Capture Conflicts C1), so the expected failure became an ordinary gate. The served
// remote config still turns console capture on, so this fails the day the client setting stops winning.
test.describe('resolved (#1261): console records', () => {
  test('PRIV-2 PRIV-13 a URL logged to the console never reaches the recording: no console record, while replay records the page around it', async ({
    open,
  }) => {
    const s = await open();
    await s.goto(FIXTURE_PATH);
    await expectCollecting(s, { ga4: false });
    await s.page.evaluate(
      (m) => console.log(m),
      `np-console-probe https://nathanpayne.test/x?email=${CANARIES.query}%40example.test#${CANARIES.fragment}`,
    );
    // Positive control: replay is still recording after the console call, so a console record would have been
    // sent along with this DOM change.
    await s.page.evaluate(() => {
      const p = document.createElement('p');
      p.id = 'np-after-console-probe';
      p.textContent = 'Recorded after the console probe';
      document.body.append(p);
    });
    await humanActivity(s.page);
    await s.page.waitForTimeout(4000);
    await unloadAndSettle(s.page); // let the unload flush reach the sink
    expect(s.sink.undecodedCollection(), 'every replay body was decodable').toEqual([]);
    const items = replayItems(s);
    expect(
      JSON.stringify(items),
      'replay recorded the page after the console call (positive control)',
    ).toContain('np-after-console-probe');
    expect(
      items.filter((i) => i.type === 6 && i.data?.plugin === 'rrweb/console@1'),
      'console records in the recording',
    ).toEqual([]);
    const replayText = s.sink
      .snapshotEvents()
      .map(({ req }) => req.searchable)
      .join('\n');
    expect(replayText, 'the console probe in any replay payload').not.toContain('np-console-probe');
    expect(canaryHits(replayText), 'sensitive URL parts in any replay payload').toEqual([]);
  });
});
