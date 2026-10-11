/**
 * #1264: Mux Data (mux-embed 5.18.1, the playback analytics behind the Swipe
 * Watch hero) under the #1079 privacy controls, checked in a real browser
 * against the flag-on test build with the real bundled mux-embed and
 * @mux/mux-background-video. The bridge under test is src/lib/privacy/mux-data.js.
 *
 * Egress is the same as runtime.pw.ts: Chromium's only network path is the
 * refusing proxy in egress.ts, every other hostname is unresolvable, WebRTC
 * UDP outside the proxy is off, and a default-deny route and blocked service
 * workers are installed before the first navigation. The HLS stream
 * (stream.mux.com) is aborted by that route, so the video never plays here;
 * what these tests read is what Mux Data attempts. Requests to litix.io are
 * recorded by the route and answered locally, never forwarded; a request sent
 * while the page unloads bypasses the route and reaches the proxy, which
 * records its host and refuses it. Both records are checked.
 *
 * mux-embed queues events and sends them in one batch every 10 seconds, and
 * flushes on pagehide, so every "nothing was sent" check waits past the first
 * batch and then leaves the page.
 */
import {
  test,
  expect,
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from '@playwright/test';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  SITE_HOST,
  egressArgs,
  installDefaultDenyRoute,
  isHostOrSubdomain,
  startEgressProxy,
  type EgressProxy,
  type Sink,
  type SinkRecord,
} from './egress';

const ROOT = resolve(import.meta.dirname, '..', '..');
const DIST = join(ROOT, 'dist-privacy-test');
const SITE = `http://${SITE_HOST}`;
const PAGE = `${SITE}/projects/swipe-watch/`;
const SENSITIVE_PAGE = `${PAGE}?email=NP-CANARY-QUERY%40example.test&utm_source=fixture#NP-CANARY-FRAGMENT`;
const SCRUBBED_PAGE = `${PAGE}?utm_source=fixture`;
/** mux-embed's first batch leaves 10 s after the first event; wait past it. */
const PAST_FIRST_BATCH = 13_000;

// The page also loads PostHog and GA4, which the default-deny route serves
// from these local files, as in runtime.pw.ts. The Mux checks read none of it.
const vendor = {
  posthogDist: process.env.NP_POSTHOG_JS_DIST ?? '',
  gtagFile: process.env.NP_GTAG_JS ?? '',
};

const saveChoice = (choice: string) =>
  `if (!localStorage.getItem('np-privacy')) localStorage.setItem('np-privacy', ${JSON.stringify(
    JSON.stringify({ v: 1, choice, noticeDismissed: false }),
  )});`;
const GPC_ON =
  "Object.defineProperty(Navigator.prototype, 'globalPrivacyControl', { get: () => true, configurable: true });";
const DNT_ON =
  "Object.defineProperty(Navigator.prototype, 'doNotTrack', { get: () => '1', configurable: true });";
// As in runtime.pw.ts: logs every request that gets past the gate's transport
// guard (installed later, so it wraps this), with the page clock.
const LOG_SENT = `(() => {
  const log = [];
  window.__npSent = log;
  const nativeFetch = window.fetch;
  window.fetch = function (input, init) {
    log.push({ url: String(input && input.url ? input.url : input), t: performance.now() });
    return nativeFetch.call(this, input, init);
  };
  const nativeBeacon = navigator.sendBeacon.bind(navigator);
  navigator.sendBeacon = (url, data) => {
    log.push({ url: String(url), t: performance.now() });
    return nativeBeacon(url, data);
  };
})();`;

let proxy: EgressProxy;
let browser: Browser;

test.beforeAll(async () => {
  const missing: string[] = [];
  if (!existsSync(join(DIST, 'projects/swipe-watch/index.html'))) {
    missing.push('dist-privacy-test/ with the Swipe Watch page: run `npm run build:privacy-test`');
  }
  if (!vendor.posthogDist || !existsSync(join(vendor.posthogDist, 'array.js'))) {
    missing.push('NP_POSTHOG_JS_DIST: the dist/ directory of posthog-js@1.438.3');
  }
  if (!vendor.gtagFile || !existsSync(vendor.gtagFile)) {
    missing.push('NP_GTAG_JS: a local copy of gtag.js');
  }
  expect(missing, `missing prerequisites:\n${missing.join('\n')}`).toEqual([]);
  proxy = await startEgressProxy(DIST);
  browser = await chromium.launch({ args: egressArgs(proxy.port) });
});

test.afterAll(async () => {
  await browser?.close();
  await proxy?.close();
});

async function open(
  initScripts: string[] = [],
): Promise<{ context: BrowserContext; page: Page; sink: Sink }> {
  const context = await browser.newContext({
    serviceWorkers: 'block',
    viewport: { width: 1280, height: 900 },
  });
  const sink = await installDefaultDenyRoute(context, vendor);
  for (const content of initScripts) await context.addInitScript({ content });
  const page = await context.newPage();
  return { context, page, sink };
}

async function waitFor(predicate: () => boolean, timeout = 20_000): Promise<boolean> {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (predicate()) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  return predicate();
}

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

const isLitix = (host: string) => isHostOrSubdomain(host.replace(/:\d+$/, ''), 'litix.io');

/** Mux Data requests the route recorded (answered locally) since `since`. */
function muxBeacons(sink: Sink, since = 0): SinkRecord[] {
  return sink.records.filter((r) => r.at >= since && isLitix(new URL(r.url).host));
}

/** Every Mux Data request attempted since `since`, through the route or at the proxy. */
function muxAttempts(sink: Sink, since = 0): string[] {
  const routed = muxBeacons(sink, since).map((r) => r.url);
  const aborted = sink.blocked.filter((url) => isLitix(new URL(url).host));
  const atProxy = proxy.log
    .filter((r) => r.at >= since)
    .map((r) => r.target)
    .filter((target) => isLitix(target.includes('://') ? new URL(target).host : target));
  return [...routed, ...aborted, ...atProxy];
}

/** The events in Mux Data batches (`{ metadata, events: [...] }`). */
function muxEvents(records: SinkRecord[]): Array<Record<string, unknown>> {
  return records.flatMap((r) => {
    const json = r.json as { events?: unknown[] } | null;
    return Array.isArray(json?.events) ? (json.events as Array<Record<string, unknown>>) : [];
  });
}

/** mux-embed's beacon key for `page_url`: `page` is `w`, `url` is `ur`. */
const PAGE_URL_KEY = 'wur';

async function muxCookies(context: BrowserContext, page: Page): Promise<string[]> {
  const jar = (await context.cookies()).map((c) => c.name).filter((n) => /^muxData/i.test(n));
  const doc = await page.evaluate(() => document.cookie);
  return /muxData/i.test(doc) ? [...jar, 'document.cookie'] : jar;
}

/**
 * Waits until the hero's bundled script has run end to end: the component is
 * defined and its playback monitor has settled the hero into a state (here
 * `fallback`, because the stream is unreachable). Then reports what Mux Data
 * looks like on the page.
 */
async function heroSettled(page: Page) {
  await page.waitForFunction(
    () => {
      const shell = document.querySelector<HTMLElement>('[data-mux-hero]');
      return (
        Boolean(customElements.get('mux-background-video')) &&
        Boolean(shell) &&
        shell?.dataset.playbackState !== 'loading'
      );
    },
    undefined,
    { timeout: 15_000 },
  );
  return page.evaluate(() => {
    const host = document.querySelector('mux-background-video');
    const video = host?.shadowRoot?.querySelector('video') as
      (HTMLVideoElement & { mux?: { deleted?: boolean } }) | null;
    return {
      globalMux: typeof (window as unknown as { mux?: unknown }).mux,
      monitored: Boolean(video?.mux),
      monitorDeleted: video?.mux?.deleted ?? null,
      effective: (window as unknown as NpWindow).npPrivacy.get().effective,
    };
  });
}

/** Playback is attempted: the component asked for the HLS manifest. */
function streamRequested(sink: Sink): boolean {
  return sink.blocked.some((url) => /^https:\/\/stream\.mux\.com\/[^/]+\.m3u8/.test(url));
}

test('granted: Mux Data sends a scrubbed page_url and sets no cookie', async () => {
  const { context, page, sink } = await open();
  await page.goto(SENSITIVE_PAGE);
  expect(await heroSettled(page)).toMatchObject({
    effective: 'granted',
    monitored: true,
  });
  expect(streamRequested(sink)).toBe(true);
  // Positive control: Mux Data really sends here, so the checks below inspect
  // a beacon that exists.
  expect(await waitFor(() => muxBeacons(sink).length > 0)).toBe(true);
  const records = muxBeacons(sink);
  const pageUrls = muxEvents(records)
    .map((e) => e[PAGE_URL_KEY])
    .filter((v) => v !== undefined);
  // Soft from here, so a run without one of the options reports every
  // assertion it breaks rather than only the first.
  expect.soft(pageUrls.length).toBeGreaterThan(0);
  expect.soft(new Set(pageUrls)).toEqual(new Set([SCRUBBED_PAGE]));
  for (const record of records) {
    expect.soft(record.text).not.toContain('NP-CANARY');
    expect.soft(record.text).not.toContain('example.test');
  }
  expect.soft(await muxCookies(context, page)).toEqual([]);
  await context.close();
});

for (const [label, scripts, reason] of [
  ['a saved opt-out', [saveChoice('denied')], 'choice'],
  ['GPC, over a saved grant', [GPC_ON, saveChoice('granted')], 'gpc'],
] as const) {
  test(`denied by ${label}: Mux Data never monitors or sends, sets no cookie, and the video still loads`, async () => {
    const { context, page, sink } = await open([...scripts]);
    const since = Date.now();
    await page.goto(SENSITIVE_PAGE);
    expect(
      await page.evaluate(() => (window as unknown as NpWindow).npPrivacy.get()),
    ).toMatchObject({ effective: 'denied', reason });
    expect.soft(await heroSettled(page)).toMatchObject({
      effective: 'denied',
      globalMux: 'undefined',
      monitored: false,
    });
    expect(streamRequested(sink)).toBe(true);
    await pause(PAST_FIRST_BATCH);
    expect.soft(await muxCookies(context, page)).toEqual([]);
    // Leaving the page is when mux-embed would flush.
    await page.goto(`${SITE}/`);
    await pause(2_000);
    expect(muxAttempts(sink, since)).toEqual([]);
    await context.close();
  });
}

test('Do Not Track: Mux Data monitors but sends nothing and sets no cookie', async () => {
  const { context, page, sink } = await open([DNT_ON]);
  const since = Date.now();
  await page.goto(SENSITIVE_PAGE);
  expect(await page.evaluate(() => navigator.doNotTrack)).toBe('1');
  // GPC is not active, so analytics are granted: DNT is the only signal here.
  expect(await heroSettled(page)).toMatchObject({
    effective: 'granted',
    monitored: true,
  });
  await pause(PAST_FIRST_BATCH);
  expect.soft(await muxCookies(context, page)).toEqual([]);
  await page.goto(`${SITE}/`);
  await pause(2_000);
  expect(muxAttempts(sink, since)).toEqual([]);
  await context.close();
});

test("set('denied') mid-visit stops Mux Data: monitor destroyed, nothing more sent", async () => {
  const { context, page, sink } = await open([LOG_SENT]);
  await page.goto(PAGE);
  expect(await heroSettled(page)).toMatchObject({ effective: 'granted', monitored: true });
  // Positive control: it was sending before the withdrawal.
  expect(await waitFor(() => muxBeacons(sink).length > 0)).toBe(true);
  const withdrawnAt = Date.now();
  // The page clock is read before set('denied'): destroying the monitor
  // flushes mux-embed's queue inside that call, and the transport guard must
  // refuse the flush.
  const tPage = await page.evaluate(() => {
    const t = performance.now();
    (window as unknown as NpWindow).npPrivacy.set('denied');
    return t;
  });
  const afterWithdrawal = await page.evaluate(() => {
    const video = document
      .querySelector('mux-background-video')
      ?.shadowRoot?.querySelector('video') as
      (HTMLVideoElement & { mux?: { deleted?: boolean } }) | null;
    return {
      globalMux: typeof (window as unknown as { mux?: unknown }).mux,
      monitorDeleted: video?.mux?.deleted ?? null,
    };
  });
  expect.soft(afterWithdrawal).toEqual({ globalMux: 'undefined', monitorDeleted: true });
  await pause(PAST_FIRST_BATCH);
  // Exact: every Mux Data request that got past the guard once the withdrawal
  // began. The log sees Mux Data's requests (the beacon before withdrawal is in
  // it), so an empty result is not the log missing them.
  const sent = await page.evaluate(() => (window as unknown as NpWindow).__npSent);
  const litixSent = sent.filter((r) => isLitix(new URL(r.url, SITE).host));
  expect(litixSent.filter((r) => r.t < tPage).length).toBeGreaterThan(0);
  expect(litixSent.filter((r) => r.t >= tPage).map((r) => r.url)).toEqual([]);
  expect.soft(await muxCookies(context, page)).toEqual([]);
  await page.goto(`${SITE}/`);
  await pause(2_000);
  // At the network: a batch already handed over at the instant of withdrawal
  // may still land; nothing may start after it, including at unload.
  expect(muxAttempts(sink, withdrawnAt + 1_000)).toEqual([]);
  await context.close();
});

interface NpWindow {
  npPrivacy: {
    get(): { saved: string; effective: string; reason: string };
    set(choice: string): boolean;
  };
  __npSent: Array<{ url: string; t: number }>;
}
