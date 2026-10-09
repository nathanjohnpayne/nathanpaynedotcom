/**
 * Choice, gate, withdrawal, re-enable, and GPC scenarios
 * (specs/analytics-privacy.md § Choice Model, Storage, Gate, Withdrawal, Re-Enable).
 * Covers PRIV-3, PRIV-4, PRIV-5, PRIV-10, and the API-level part of PRIV-14.
 *
 * Every "nothing is sent" assertion follows a positive control in the default-on
 * case, and one test shows that control failing when collection is disabled.
 */
import { FIXTURE_PATH } from './harness/constants';
import {
  auditSdk,
  clickOutbound,
  expectCollecting,
  expectCollectionContinues,
  expectNoAnalytics,
  gateReady,
  recordChanges,
  recordedChanges,
  storageRaw,
  storageWith,
  storedValue,
  typeCanaries,
} from './harness/helpers';
import { expect, test, type Session } from './harness/test';

const htmlGate = (page: import('@playwright/test').Page) =>
  page.evaluate(() => ({
    decision: document.documentElement.getAttribute('data-np-privacy'),
    reason: document.documentElement.getAttribute('data-np-privacy-reason'),
  }));

test.describe('fresh visit and positive controls', () => {
  test('PRIV-3 PRIV-14 a fresh visit is default-on: the gate grants, both tools load, events and replay reach the sink', async ({
    open,
    fixtureState,
  }) => {
    const ga4 = fixtureState.gtag.available;
    const s = await open();
    await s.goto(FIXTURE_PATH);
    await gateReady(s.page);
    expect(await s.privacy()).toMatchObject({
      saved: 'unset',
      effective: 'granted',
      reason: 'default',
      loadedThisPage: true,
    });
    expect(await htmlGate(s.page)).toEqual({ decision: 'granted', reason: 'default' });
    const audit = await auditSdk(s.page);
    expect(audit.sdkScripts.some((src) => src.includes('/static/array.js'))).toBe(true);
    if (ga4) expect(audit.sdkScripts.some((src) => src.includes('gtag/js'))).toBe(true);
    // The notice is due while no choice has been made (API level; the UI is checked in accessibility.pw.ts).
    expect(await s.page.evaluate(() => window.npPrivacy?.notice.shouldShow())).toBe(true);
    await expectCollecting(s, { ga4 });
    test.info().annotations.push({
      type: 'ga4',
      description: ga4 ? 'GA4 hit observed' : 'not verified: no gtag.js fixture',
    });
  });

  test('PRIV-3 PRIV-10 negative control: the positive-control assertion FAILS when collection is disabled', async ({
    open,
    fixtureState,
  }) => {
    const s = await open({ gpc: true });
    await s.goto(FIXTURE_PATH);
    // The same helper that passes in the default-on case must reject here, or opt-out tests prove nothing.
    await expect(
      expectCollecting(s, { ga4: fixtureState.gtag.available, timeout: 8000 }),
    ).rejects.toThrow();
  });
});

test.describe('opt-out before initialization and return visits', () => {
  for (const path of [FIXTURE_PATH, '/', '/blog/']) {
    test(`PRIV-4 a saved opt-out prevents both tools from initializing on ${path}: no SDK script, zero analytics requests`, async ({
      open,
    }) => {
      const s = await open({ storageState: storageWith('denied') });
      await s.goto(path);
      await gateReady(s.page);
      expect(await s.privacy()).toMatchObject({
        saved: 'denied',
        effective: 'denied',
        reason: 'choice',
        loadedThisPage: false,
      });
      expect(await htmlGate(s.page)).toEqual({ decision: 'denied', reason: 'choice' });
      expect(await s.page.evaluate(() => window.npPrivacy?.notice.shouldShow())).toBe(false);
      await expectNoAnalytics(s, 0, path === FIXTURE_PATH ? 8000 : 4000);
    });
  }

  test('PRIV-3 PRIV-4 opt out during a first visit, then return: the choice persists and the return visit sends nothing', async ({
    open,
    fixtureState,
  }) => {
    const ga4 = fixtureState.gtag.available;
    const first = await open();
    await first.goto(FIXTURE_PATH);
    await expectCollecting(first, { ga4 }); // positive control for this very flow
    expect(await first.page.evaluate(() => window.npPrivacy?.set('denied'))).toBe(true);
    expect(await first.privacy()).toMatchObject({
      saved: 'denied',
      effective: 'denied',
      reason: 'choice',
      persisted: true,
    });
    const storage = await first.context.storageState();

    for (const path of [FIXTURE_PATH, '/', '/resume/']) {
      const returning = await open({ storageState: storage });
      const mark = returning.sink.mark(); // the first visit's own traffic is in the same sink
      await returning.goto(path);
      expect(await returning.privacy()).toMatchObject({
        saved: 'denied',
        effective: 'denied',
        reason: 'choice',
        loadedThisPage: false,
      });
      await expectNoAnalytics(returning, mark, path === FIXTURE_PATH ? 8000 : 4000);
    }
  });
});

/**
 * Everything that was being recorded or counted, repeated across several flush intervals: typing, pointer
 * movement, a click, a scroll, and (with GA4) an outbound click. The withdrawal test runs it after
 * withdrawing; its control runs it without.
 */
async function keepActive(s: Session, ga4: boolean): Promise<void> {
  for (let round = 0; round < 3; round += 1) {
    await s.page.fill('#fixture-text', `round ${round}`);
    await s.page.mouse.move(120 + round * 40, 140 + round * 30);
    await s.page.click('#fixture-pii-button');
    await s.page.evaluate(() => window.scrollBy(0, 400));
    if (ga4) await clickOutbound(s);
    await s.page.waitForTimeout(3000);
  }
}

/** Statements that queue one PostHog event and one GA4 event which only a flush could send. */
const QUEUE_PROBES = `
  window.posthog?.capture('np_pending_probe', { probe: 'queued-before-withdrawal' });
  if (typeof window.gtag === 'function') window.gtag('event', 'np_pending_probe');
`;

test.describe('withdrawal', () => {
  test('PRIV-5 withdrawal while a recording is active stops PostHog and GA4 immediately and drops what was queued', async ({
    open,
    fixtureState,
  }) => {
    test.setTimeout(120_000);
    const ga4 = fixtureState.gtag.available;
    const s = await open();
    await s.goto(FIXTURE_PATH);
    await expectCollecting(s, { ga4 });
    if (ga4) {
      // Positive control for the GA4 trigger used after withdrawal: an outbound click does send a GA4 hit now.
      const before = s.sink.mark();
      await clickOutbound(s);
      await expect
        .poll(() => s.sink.ga4Events(before).some(({ event }) => event.name === 'click'), {
          message: 'GA4 outbound click reached the sink before withdrawal (positive control)',
        })
        .toBe(true);
    }
    // The recording is demonstrably live and flowing.
    const snapshotsBefore = s.sink.snapshotEvents().length;
    await recordChanges(s.page);
    await typeCanaries(s.page);
    await s.page.mouse.move(100, 120);
    await s.page.mouse.move(300, 260);

    // Queue an event and a GA4 event, then withdraw in the same task: neither may be flushed afterwards.
    const withdrawn = (await s.page.evaluate(
      `(() => { ${QUEUE_PROBES} return { ok: window.npPrivacy.set('denied'), at: Date.now() }; })()`,
    )) as { ok: boolean; at: number };
    expect(withdrawn.ok).toBe(true);
    // A request already handed to the network at the instant of withdrawal may still complete (contract, Withdrawal).
    const cutoff = withdrawn.at + 1000;

    await keepActive(s, ga4);

    const state = await s.privacy();
    expect(state).toMatchObject({ saved: 'denied', effective: 'denied', reason: 'choice' });
    const changes = await recordedChanges(s.page);
    expect(changes.at(-1)).toMatchObject({ effective: 'denied' });

    const late = s.sink.requests.filter(
      (r) => r.at > cutoff && (r.vendor === 'posthog' || r.vendor === 'ga4' || r.vendor === 'gtm'),
    );
    expect(
      late.map((r) => `${r.method} ${r.host}${r.path}`),
      'no analytics request after the in-flight grace',
    ).toEqual([]);
    const inFlight = s.sink.requests.filter(
      (r) => r.at > withdrawn.at && r.at <= cutoff && r.isCollection,
    );
    test.info().annotations.push({
      type: 'in-flight',
      description: `${inFlight.length} collection request(s) completed within 1 s of withdrawal (allowed by the contract)`,
    });
    // Pending items were dropped, not flushed.
    expect(
      s.sink.posthogEvents().filter(({ event }) => event.event === 'np_pending_probe'),
      'the PostHog event queued at withdrawal was not flushed',
    ).toEqual([]);
    expect(
      s.sink.ga4Events().filter(({ event }) => event.name === 'np_pending_probe'),
      'the GA4 event issued at withdrawal was not sent',
    ).toEqual([]);
    // Recording stopped: not one replay request after the grace, though the page kept changing.
    expect(s.sink.snapshotEvents().length).toBeGreaterThanOrEqual(snapshotsBefore);
    expect(s.sink.collection('posthog').filter((r) => r.at > cutoff)).toEqual([]);

    // The transport guard must refuse only analytics hosts: ordinary same-origin traffic still works (#1243 review).
    const ordinary = await s.page.evaluate(async () => {
      const fetched = await fetch('/__np/ping').then((r) => r.text());
      const xhr = await new Promise<string>((resolve) => {
        const x = new XMLHttpRequest();
        x.open('GET', '/__np/ping');
        x.onload = () => resolve(x.responseText);
        x.onerror = () => resolve('error');
        x.send();
      });
      const beacon = navigator.sendBeacon('/__np/sink?control=after-withdrawal', 'ok');
      // A cross-origin request to a host that is not an analytics host.
      const crossOrigin = await fetch('https://assets.nathanpayne.test/__np/ping').then((r) =>
        r.text(),
      );
      return { fetched, xhr, beacon, crossOrigin };
    });
    expect(ordinary).toEqual({ fetched: 'pong', xhr: 'pong', beacon: true, crossOrigin: 'pong' });
    await expect
      .poll(() =>
        s.sink.requests.some(
          (r) => r.path === '/__np/sink' && r.url.includes('control=after-withdrawal'),
        ),
      )
      .toBe(true);

    // Unloading the page after withdrawal sends nothing either (beacons bypass the route; the proxy sees them).
    await s.page.goto('about:blank');
    await s.page.waitForTimeout(2000);
    expect(
      s.sink.requests.filter(
        (r) => r.at > cutoff && (r.vendor === 'posthog' || r.vendor === 'ga4'),
      ),
    ).toEqual([]);
    expect(s.sink.refusals.map((r) => r.target)).toEqual([]);
  });

  test('PRIV-5 (control) the same queued events and activity WITHOUT a withdrawal do reach the sink, so the test above can fail', async ({
    open,
    fixtureState,
  }) => {
    test.setTimeout(120_000);
    const ga4 = fixtureState.gtag.available;
    const s = await open();
    await s.goto(FIXTURE_PATH);
    await expectCollecting(s, { ga4 });
    const queuedAt = (await s.page.evaluate(
      `(() => { ${QUEUE_PROBES} return Date.now(); })()`,
    )) as number;
    const cutoff = queuedAt + 1000;
    await keepActive(s, ga4);
    await s.page.goto('about:blank');
    await s.page.waitForTimeout(1500);
    await expect
      .poll(() => s.sink.posthogEvents().some(({ event }) => event.event === 'np_pending_probe'), {
        message: 'the queued PostHog event is flushed when nothing withdraws',
      })
      .toBe(true);
    if (ga4) {
      expect(s.sink.ga4Events().some(({ event }) => event.name === 'np_pending_probe')).toBe(true);
    }
    expect(
      s.sink.collection('posthog').filter((r) => r.at > cutoff).length,
      'PostHog requests keep arriving after the cutoff',
    ).toBeGreaterThan(0);
    expect(
      s.sink.snapshotEvents().filter(({ req }) => req.at > cutoff).length,
      'replay snapshots keep arriving after the cutoff',
    ).toBeGreaterThan(0);
    if (ga4) {
      expect(
        s.sink.collection('ga4').filter((r) => r.at > cutoff).length,
        'GA4 hits keep arriving after the cutoff',
      ).toBeGreaterThan(0);
    }
  });

  test('PRIV-5 a change in another tab withdraws in every open tab (storage event)', async ({
    open,
    fixtureState,
  }) => {
    const ga4 = fixtureState.gtag.available;
    const s = await open();
    await s.goto(FIXTURE_PATH);
    await expectCollecting(s, { ga4 });
    const other = await s.context.newPage();
    await s.goto(`${FIXTURE_PATH}?tab=2`, other);
    await gateReady(other);
    expect((await s.privacy(other))?.effective).toBe('granted');

    const at = await s.page.evaluate(() => {
      window.npPrivacy?.set('denied');
      return Date.now();
    });
    await expect
      .poll(async () => (await s.privacy(other))?.effective, {
        message: 'the other tab applied the change',
      })
      .toBe('denied');
    // Activity in the second tab, past the grace period, sends nothing.
    await other.waitForTimeout(1200);
    const cutoff = Math.max(at, Date.now()) + 0;
    await other.fill('#fixture-text', 'still typing');
    await other.mouse.move(200, 200);
    await other.waitForTimeout(6000);
    expect(
      s.sink.requests.filter(
        (r) => r.at > cutoff && (r.vendor === 'posthog' || r.vendor === 'ga4'),
      ),
    ).toEqual([]);
  });
});

test.describe('re-enable', () => {
  test('PRIV-3 a deliberate re-enable is saved but takes effect only on the next load, and the SDK opt-out state does not block it', async ({
    open,
    fixtureState,
  }) => {
    const ga4 = fixtureState.gtag.available;
    const s = await open();
    await s.goto(FIXTURE_PATH);
    await expectCollecting(s, { ga4 });
    expect(await s.page.evaluate(() => window.npPrivacy?.set('denied'))).toBe(true); // withdrawal makes the SDK persist its own opt-out
    await s.page.waitForTimeout(1500);

    const mark = s.sink.mark();
    const at = Date.now();
    expect(await s.page.evaluate(() => window.npPrivacy?.set('granted'))).toBe(true);
    expect(await s.privacy()).toMatchObject({
      saved: 'granted',
      effective: 'granted',
      reason: 'choice',
      loadedThisPage: true,
    });
    // Never resumed in this page view:
    await typeCanaries(s.page);
    await s.page.mouse.move(150, 150);
    await s.page.waitForTimeout(7000);
    expect(
      s.sink
        .since(mark)
        .filter((r) => r.at > at + 1000 && (r.vendor === 'posthog' || r.vendor === 'ga4')),
    ).toEqual([]);

    // The next load initializes both tools and captures normally.
    const reloadMark = s.sink.mark();
    await s.page.reload();
    expect(await s.privacy()).toMatchObject({
      saved: 'granted',
      effective: 'granted',
      reason: 'choice',
      loadedThisPage: true,
    });
    await expectCollecting(s, { ga4, mark: reloadMark });
  });

  test('PRIV-3 unset to granted changes nothing observable except the saved value', async ({
    open,
    fixtureState,
  }) => {
    const ga4 = fixtureState.gtag.available;
    const s = await open();
    await s.goto(FIXTURE_PATH);
    await expectCollecting(s, { ga4 });
    const before = await s.privacy();
    const scriptsBefore = (await auditSdk(s.page)).sdkScripts;
    expect(await s.page.evaluate(() => window.npPrivacy?.set('granted'))).toBe(true);
    const after = await s.privacy();
    expect(after).toMatchObject({ saved: 'granted', effective: 'granted', loadedThisPage: true });
    expect(before?.effective).toBe(after?.effective);
    expect((await auditSdk(s.page)).sdkScripts).toEqual(scriptsBefore);
    // Collection simply continues: an interaction after the call still produces an event.
    const mark = s.sink.mark();
    await s.page.click('#fixture-pii-button');
    await expect
      .poll(() => s.sink.posthogEvents(mark).some(({ event }) => event.event === '$autocapture'), {
        message: 'capture continued',
      })
      .toBe(true);
  });
});

test.describe('Global Privacy Control', () => {
  test('PRIV-10 GPC on with no saved choice: both tools stay off, reason gpc, no notice', async ({
    open,
  }) => {
    const s = await open({ gpc: true });
    await s.goto(FIXTURE_PATH);
    await gateReady(s.page);
    expect(await s.privacy()).toMatchObject({
      saved: 'unset',
      effective: 'denied',
      reason: 'gpc',
      loadedThisPage: false,
    });
    expect(await s.page.evaluate(() => window.npPrivacy?.gpc())).toBe(true);
    expect(await htmlGate(s.page)).toEqual({ decision: 'denied', reason: 'gpc' });
    expect(await s.page.evaluate(() => window.npPrivacy?.notice.shouldShow())).toBe(false);
    await expectNoAnalytics(s, 0, 8000);
  });

  test('PRIV-10 GPC on with a saved granted: still off, set(granted) is rejected and changes nothing, set(denied) is accepted', async ({
    open,
  }) => {
    const s = await open({ gpc: true, storageState: storageWith('granted') });
    await s.goto(FIXTURE_PATH);
    await gateReady(s.page);
    expect(await s.privacy()).toMatchObject({
      saved: 'granted',
      effective: 'denied',
      reason: 'gpc',
      loadedThisPage: false,
    });
    expect(await s.page.evaluate(() => window.npPrivacy?.set('granted'))).toBe(false);
    expect(await s.privacy()).toMatchObject({
      saved: 'granted',
      effective: 'denied',
      reason: 'gpc',
    });
    expect(JSON.parse((await storedValue(s.page)) ?? '{}')).toMatchObject({ choice: 'granted' });
    await expectNoAnalytics(s, 0, 8000);

    expect(await s.page.evaluate(() => window.npPrivacy?.set('denied'))).toBe(true);
    expect(await s.privacy()).toMatchObject({ saved: 'denied', effective: 'denied' });
    expect(JSON.parse((await storedValue(s.page)) ?? '{}')).toMatchObject({ choice: 'denied' });
  });

  test('PRIV-10 turning GPC off after an opt-out keeps both tools off', async ({ open }) => {
    const withGpc = await open({ gpc: true });
    await withGpc.goto(FIXTURE_PATH);
    expect(await withGpc.page.evaluate(() => window.npPrivacy?.set('denied'))).toBe(true); // accepted and saved while GPC is on
    const storage = await withGpc.context.storageState();

    const later = await open({ storageState: storage }); // the signal is gone
    const mark = later.sink.mark();
    await later.goto(FIXTURE_PATH);
    expect(await later.page.evaluate(() => window.npPrivacy?.gpc())).toBe(false);
    expect(await later.privacy()).toMatchObject({
      saved: 'denied',
      effective: 'denied',
      reason: 'choice',
      loadedThisPage: false,
    });
    await expectNoAnalytics(later, mark, 8000);
  });
});

test.describe('storage', () => {
  test('PRIV-3 when storage throws, the gate falls back to default-on and a withdrawal still applies to the page view (persisted false)', async ({
    open,
    fixtureState,
  }) => {
    const ga4 = fixtureState.gtag.available;
    const s = await open({ blockStorage: true });
    await s.goto(FIXTURE_PATH);
    await gateReady(s.page);
    expect(await s.privacy()).toMatchObject({
      saved: 'unset',
      effective: 'granted',
      reason: 'default',
    });
    await expectCollecting(s, { ga4 });

    const at = await s.page.evaluate(() => {
      const ok = window.npPrivacy?.set('denied');
      return { ok, at: Date.now() };
    });
    expect(at.ok).toBe(true);
    expect(await s.privacy()).toMatchObject({
      saved: 'denied',
      effective: 'denied',
      persisted: false,
    });
    await s.page.fill('#fixture-text', 'after');
    await s.page.waitForTimeout(6000);
    expect(
      s.sink.requests.filter(
        (r) => r.at > at.at + 1000 && (r.vendor === 'posthog' || r.vendor === 'ga4'),
      ),
    ).toEqual([]);
  });

  for (const [label, raw] of [
    ['unparseable JSON', '{not json'],
    ['an unknown version', JSON.stringify({ v: 2, choice: 'denied', noticeDismissed: false })],
    ['an unknown choice', JSON.stringify({ v: 1, choice: 'maybe', noticeDismissed: false })],
  ] as const) {
    test(`PRIV-3 a stored value with ${label} reads as unset and is not rewritten`, async ({
      open,
    }) => {
      const s = await open({ storageState: storageRaw(raw) });
      await s.goto('/__np/blank');
      await s.goto(FIXTURE_PATH);
      await gateReady(s.page);
      expect(await s.privacy()).toMatchObject({
        saved: 'unset',
        effective: 'granted',
        reason: 'default',
      });
      expect(await storedValue(s.page)).toBe(raw);
    });
  }

  test('PRIV-14 dismissing the notice is not a choice: it records the dismissal, leaves the choice unset, and collection continues', async ({
    open,
    fixtureState,
  }) => {
    const s = await open();
    await s.goto(FIXTURE_PATH);
    await expectCollecting(s, { ga4: fixtureState.gtag.available });
    expect(await s.page.evaluate(() => window.npPrivacy?.notice.shouldShow())).toBe(true);
    await s.page.evaluate(() => window.npPrivacy?.notice.dismiss());
    expect(await s.page.evaluate(() => window.npPrivacy?.notice.shouldShow())).toBe(false);
    expect(await s.privacy()).toMatchObject({
      saved: 'unset',
      effective: 'granted',
      reason: 'default',
    });
    expect(JSON.parse((await storedValue(s.page)) ?? '{}')).toMatchObject({
      v: 1,
      choice: 'unset',
      noticeDismissed: true,
    });
    // Collection continues in this very page view (not merely after a reload re-initializes it).
    await expectCollectionContinues(s, { ga4: fixtureState.gtag.available });
  });
});
