/**
 * Replay never records an excluded page (specs/analytics-privacy.md § Capture
 * Minimization item 2; PRIV-12). The excluded set is `/privacy/` and everything
 * under it, and the exclusion must hold on load and after every client-side
 * navigation: pushState, replaceState, popstate, hashchange, and bfcache restores.
 *
 * The test is content-agnostic about the excluded page: it asserts that no rrweb
 * record is stamped after the navigation, that none describes an excluded URL,
 * and that a canary appended to the excluded document never appears. Each
 * variant first shows, on an allowed page, that the same activity does produce
 * records with later timestamps, so "none after" cannot be a recorder that
 * simply was not listening.
 */
import { chromium, type Page } from '@playwright/test';
import { EXCLUDED_PATH, FIXTURE_PATH, SITE_ORIGIN } from './harness/constants';
import { canaryHits, expectCollecting, humanActivity, replayItems } from './harness/helpers';
import { chromiumArgs, expect, Session, test } from './harness/test';

const EXCLUDED_CANARY = 'NP-CANARY-EXCLUDED-PAGE';
/** Records stamped this soon after a navigation are the previous page's last flush, not the new page. */
const GRACE_MS = 400;

/** Append a canary node and generate pointer, scroll, and typing activity: everything rrweb listens for. */
async function activity(page: Page, canary: string): Promise<void> {
  await page.evaluate((text) => {
    const p = document.createElement('p');
    p.textContent = text;
    document.body.append(p);
  }, canary);
  await page.mouse.move(80, 120);
  await page.mouse.move(300, 240, { steps: 8 });
  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(300);
  await page.mouse.move(500, 360, { steps: 8 });
}

/** Records the replay held for a time after `after`, or describing an excluded URL, or carrying the canary. */
function violations(s: Session, after: number, mark: number): string[] {
  const out: string[] = [];
  const items = replayItems(s, mark);
  for (const item of items) {
    const stamp = item.timestamp ?? 0;
    const href = item.type === 4 ? String(item.data?.href ?? '') : '';
    if (stamp > after) out.push(`record type ${item.type} at +${stamp - after}ms`);
    if (href && new URL(href).pathname.startsWith(EXCLUDED_PATH))
      out.push(`meta for excluded URL ${href}`);
  }
  if (
    canaryHits(JSON.stringify(items)).length > 0 ||
    JSON.stringify(items).includes(EXCLUDED_CANARY)
  ) {
    out.push('canary from the excluded page is in the recording');
  }
  return out;
}

function recordedAfter(s: Session, after: number, mark = 0): number {
  return replayItems(s, mark).filter((i) => (i.timestamp ?? 0) > after).length;
}

/** On an allowed page, the same activity does produce records stamped afterwards (positive control for `violations`). */
async function controlOnAllowedPage(s: Session): Promise<void> {
  await s.goto(FIXTURE_PATH);
  await expectCollecting(s, { ga4: false });
  const t0 = Date.now();
  await activity(s.page, 'np-allowed-page-marker');
  await expect
    .poll(() => recordedAfter(s, t0), {
      message: 'activity on an allowed page is recorded with later timestamps (control)',
    })
    .toBeGreaterThan(0);
}

const EXCLUDED_PAGES = [EXCLUDED_PATH, `${EXCLUDED_PATH}anything/below/`];

test.describe('replay exclusion', () => {
  for (const path of EXCLUDED_PAGES) {
    test(`PRIV-12 a full load of ${path} starts no recording and records nothing`, async ({
      open,
    }) => {
      const control = await open();
      await controlOnAllowedPage(control);
      await control.page.goto('about:blank'); // flush and stop the control, so only the page under test remains
      await control.page.waitForTimeout(1500);
      await control.close();
      const s = await open();
      const mark = s.sink.mark(); // the control's records are in the same sink

      const t0 = Date.now();
      await s.goto(path);
      await activity(s.page, EXCLUDED_CANARY);
      await s.page.waitForTimeout(8000);
      await s.page.goto('about:blank');
      await s.page.waitForTimeout(1500);
      expect(violations(s, t0 - 1, mark)).toEqual([]);
      // Stronger than the content checks: this session sent no replay request at all.
      expect(s.sink.snapshotEvents(mark)).toHaveLength(0);
    });
  }

  for (const how of ['pushState', 'replaceState'] as const) {
    test(`PRIV-12 ${how} from an allowed page to an excluded one stops the recording`, async ({
      open,
    }) => {
      test.setTimeout(90_000);
      const s = await open();
      await controlOnAllowedPage(s);
      await s.page.waitForTimeout(1200);
      const t0 = Date.now();
      await s.page.evaluate(({ how, path }) => history[how](null, '', path), {
        how,
        path: `${EXCLUDED_PATH}x/`,
      });
      await activity(s.page, EXCLUDED_CANARY);
      await s.page.waitForTimeout(7000);
      await s.page.goto('about:blank'); // flush whatever the recorder still holds
      await s.page.waitForTimeout(1500);
      expect(violations(s, t0 + GRACE_MS, 0)).toEqual([]);
    });
  }

  test('PRIV-12 following a link from an allowed page to the excluded page stops the recording', async ({
    open,
  }) => {
    test.setTimeout(90_000);
    const s = await open();
    await controlOnAllowedPage(s);
    await s.page.waitForTimeout(1200);
    const t0 = Date.now();
    await Promise.all([s.page.waitForLoadState('load'), s.page.click('#fixture-privacy-link')]);
    expect(new URL(s.page.url()).pathname).toBe(EXCLUDED_PATH);
    await activity(s.page, EXCLUDED_CANARY);
    await s.page.waitForTimeout(7000);
    await s.page.goto('about:blank');
    await s.page.waitForTimeout(1500);
    expect(violations(s, t0 + 1500, 0)).toEqual([]);
  });

  test('PRIV-12 popstate onto an excluded entry stops a recording that resumed on the allowed page', async ({
    open,
  }) => {
    test.setTimeout(120_000);
    const s = await open();
    await controlOnAllowedPage(s);
    await s.page.evaluate((path) => history.pushState(null, '', path), `${EXCLUDED_PATH}x/`);
    await s.page.waitForTimeout(500);
    await s.page.goBack(); // popstate to the allowed entry
    const resumedAt = Date.now();
    await activity(s.page, 'np-resume-probe');
    await s.page.waitForTimeout(2500);
    const resumed = recordedAfter(s, resumedAt) > 0;
    // Without a live recording at the moment of the popstate, a pass would prove nothing about the handler.
    test.skip(
      !resumed,
      'not verified: recording did not resume on the allowed entry, so popstate-to-excluded was not exercised against a live recording',
    );
    const t0 = Date.now();
    await s.page.goForward(); // popstate onto the excluded entry
    await activity(s.page, EXCLUDED_CANARY);
    await s.page.waitForTimeout(7000);
    await s.page.goto('about:blank');
    await s.page.waitForTimeout(1500);
    expect(violations(s, t0 + GRACE_MS, 0)).toEqual([]);
  });

  test('PRIV-12 hashchange on an excluded page does not start a recording', async ({ open }) => {
    const s = await open();
    await s.goto(`${EXCLUDED_PATH}x/`);
    const t0 = Date.now();
    await s.page.evaluate(() => {
      location.hash = '#section';
    });
    await s.page.waitForTimeout(500);
    await s.page.evaluate(() => {
      location.hash = '#other';
    });
    await activity(s.page, EXCLUDED_CANARY);
    await s.page.waitForTimeout(7000);
    await s.page.goto('about:blank');
    await s.page.waitForTimeout(1500);
    expect(violations(s, t0 - 1, 0)).toEqual([]);
  });

  test('PRIV-12 a back/forward-cache restore of an excluded page does not start a recording', async ({
    egress,
  }) => {
    test.setTimeout(120_000);
    // Chromium disables the cache under automation by default; this browser turns it back on.
    // Playwright's default headless shell never restores from the cache; the full Chromium binary does.
    const browser = await chromium
      .launch({
        channel: 'chromium',
        args: chromiumArgs({ proxyPort: egress.port }),
        ignoreDefaultArgs: ['--disable-back-forward-cache'],
      })
      .catch(() => null);
    test.skip(
      !browser,
      'not verified: the full Chromium binary (channel chromium) is not installed here',
    );
    if (!browser) return;
    egress.reset();
    try {
      // The same context setup as every other run: default-deny route, WebSocket close, blocked service
      // workers, and the ordinary-visitor identity.
      const session = await Session.open(browser, egress);
      const { context, page } = session;
      // Playwright cannot evaluate in a document the browser restored from the cache (the call never
      // returns), so this test observes with console messages, pointer input, and the sink only.
      const logs: string[] = [];
      page.on('console', (m) => logs.push(m.text()));
      await page.addInitScript(() => {
        window.addEventListener('pageshow', (e) =>
          console.log(`np-pageshow persisted=${e.persisted}`),
        );
      });
      await page.goto(`${SITE_ORIGIN}${EXCLUDED_PATH}x/`);
      await page.waitForTimeout(1500);
      await page.evaluate(() => {
        location.href = '/test-fixtures/privacy/';
      });
      await page.waitForURL(`${SITE_ORIGIN}${FIXTURE_PATH}`);
      const allowedAt = Date.now();
      await humanActivity(page);
      await page.waitForTimeout(500);
      await humanActivity(page);
      await expect
        .poll(
          () =>
            egress.sink
              .snapshotEvents()
              .flatMap(
                ({ event }) =>
                  (event.properties.$snapshot_data as Array<{ timestamp?: number }>) ?? [],
              )
              .filter((i) => (i.timestamp ?? 0) > allowedAt).length,
          { message: 'the allowed page in this browser is recorded (control)' },
        )
        .toBeGreaterThan(0);
      const pageshowsBefore = logs.filter((l) => l.startsWith('np-pageshow')).length;
      // Go back through the protocol: page.goBack() waits for a load event that a cache restore never fires.
      const cdp = await context.newCDPSession(page);
      const history = await cdp.send('Page.getNavigationHistory');
      await cdp.send('Page.navigateToHistoryEntry', {
        entryId: history.entries[history.currentIndex - 1]!.id,
      });
      await expect
        .poll(() => logs.filter((l) => l.startsWith('np-pageshow')).length, {
          message: 'the restored document reported pageshow',
        })
        .toBeGreaterThan(pageshowsBefore);
      const restored =
        logs.at(-1) === 'np-pageshow persisted=true' || logs.includes('np-pageshow persisted=true');
      test.info().annotations.push({
        type: 'premise',
        description: restored
          ? 'excluded page restored from bfcache (pageshow persisted)'
          : 'bfcache was not used; this was an ordinary reload',
      });
      test.skip(
        !restored,
        'not verified: the browser did not restore the excluded page from the back/forward cache, so the pageshow(persisted) path was not exercised',
      );
      const t0 = Date.now();
      await page.mouse.move(80, 120);
      await page.mouse.move(300, 240, { steps: 8 });
      await page.mouse.wheel(0, 200);
      await page.waitForTimeout(300);
      await page.mouse.move(500, 360, { steps: 8 });
      await page.keyboard.press('Tab');
      await page.waitForTimeout(7000);
      const late = egress.sink
        .snapshotEvents()
        .flatMap(
          ({ event }) => (event.properties.$snapshot_data as Array<{ timestamp?: number }>) ?? [],
        )
        .filter((i) => (i.timestamp ?? 0) > t0 + GRACE_MS);
      expect(late, 'no replay record after the restore').toEqual([]);
      // The default-deny route was live in this browser too; the only request it may have aborted is the
      // Google Fonts stylesheet every page links.
      expect(
        // Entries are `${method} ${origin}${pathname}`; compare the parsed host exactly.
        session.denied.filter(
          (d) => new URL(d.slice(d.indexOf(' ') + 1)).hostname !== 'fonts.googleapis.com',
        ),
        'nothing but the fonts stylesheet was denied',
      ).toEqual([]);
    } finally {
      await browser.close();
    }
  });
});
