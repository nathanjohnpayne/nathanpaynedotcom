/**
 * #1228 privacy runtime, checked in a real browser against the flag-on test
 * build with the real vendor SDKs (posthog-js 1.438.3 and gtag.js, served
 * from local files). Focused on the runtime's own guarantees; the independent
 * acceptance suite is #1230's.
 *
 * Egress: Chromium's only network path is the proxy in egress.ts, which
 * serves `nathanpayne.test` from dist-privacy-test/ and refuses everything
 * else; a default-deny route answers analytics requests locally. Collection
 * requests are recorded in the sink and never forwarded. Service workers are
 * blocked.
 */
import {
  test,
  expect,
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from '@playwright/test';
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  POSTHOG_HOST,
  POSTHOG_TOKEN,
  REMOTE_CONFIG,
  SITE_HOST,
  egressArgs,
  gaHasParam,
  gaHitParams,
  gaHits,
  installDefaultDenyRoute,
  isAnalyticsHost,
  isHostOrSubdomain,
  posthogEvents,
  startEgressProxy,
  type EgressProxy,
  type Sink,
} from './egress';

const ROOT = resolve(import.meta.dirname, '..', '..');
const DIST = join(ROOT, 'dist-privacy-test');
const SITE = `http://${SITE_HOST}`;
const FIXTURE = `${SITE}/test-fixtures/privacy/`;
const GA_ID = 'G-PRIVACYTEST';
const CANARIES = [
  'NP-CANARY-INPUT',
  'NP-CANARY-FORM',
  'NP-CANARY-MASKED-TEXT',
  'NP-CANARY-BLOCKED-TEXT',
  'NP-CANARY-ATTR',
  'NP-CANARY-QUERY',
  'NP-CANARY-FRAGMENT',
];

const vendor = {
  posthogDist: process.env.NP_POSTHOG_JS_DIST ?? '',
  gtagFile: process.env.NP_GTAG_JS ?? '',
};

/** Page-side scripts, injected before any page script runs. */
const saveChoice = (choice: string) =>
  `if (!localStorage.getItem('np-privacy')) localStorage.setItem('np-privacy', ${JSON.stringify(
    JSON.stringify({ v: 1, choice, noticeDismissed: false }),
  )});`;
const GPC_ON =
  "Object.defineProperty(Navigator.prototype, 'globalPrivacyControl', { get: () => true, configurable: true });";
// Logs every request that gets past the gate's transport guard, with the page
// clock, so "after the withdrawal" is exact rather than inferred from arrival.
// It covers every way the SDKs here start a request: fetch, sendBeacon, XHR,
// and the `src` of a script, img, or iframe element, set by property or by
// setAttribute (#1278). It runs before the gate, so the guard wraps these
// hooks and only what the guard lets through is logged. Each entry is also
// kept in sessionStorage with its document's time origin, so what a page
// starts while it unloads can be read from the next page in the tab. A
// request started at pagehide often loses its race with the navigation and
// never reaches the network, so the network side alone sees it only sometimes.
const LOG_SENT = `(() => {
  const doc = performance.timeOrigin;
  const record = (via, url) => {
    let href = String(url);
    try {
      href = new URL(href, location.href).href;
    } catch {}
    try {
      const kept = JSON.parse(sessionStorage.getItem('np-sent-log') || '[]');
      kept.push({ via, url: href, t: performance.now(), doc });
      sessionStorage.setItem('np-sent-log', JSON.stringify(kept));
    } catch {}
  };
  const nativeFetch = window.fetch;
  window.fetch = function (input, init) {
    record('fetch', input && input.url ? input.url : input);
    return nativeFetch.call(this, input, init);
  };
  const nativeBeacon = navigator.sendBeacon.bind(navigator);
  navigator.sendBeacon = (url, data) => {
    record('sendBeacon', url);
    return nativeBeacon(url, data);
  };
  const xhrUrls = new WeakMap();
  const nativeOpen = XMLHttpRequest.prototype.open;
  const nativeSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url) {
    xhrUrls.set(this, url);
    return nativeOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function () {
    record('xhr', xhrUrls.get(this));
    return nativeSend.apply(this, arguments);
  };
  const loaders = [HTMLScriptElement, HTMLImageElement, HTMLIFrameElement];
  for (const Loader of loaders) {
    const src = Object.getOwnPropertyDescriptor(Loader.prototype, 'src');
    Object.defineProperty(Loader.prototype, 'src', {
      configurable: true,
      enumerable: src.enumerable,
      get: src.get,
      set(value) {
        record(Loader.name, value);
        src.set.call(this, value);
      },
    });
  }
  const nativeSetAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (name, value) {
    const loader = loaders.find((Loader) => this instanceof Loader);
    if (loader && String(name).toLowerCase() === 'src') record(loader.name, value);
    return nativeSetAttribute.apply(this, arguments);
  };
})();`;

/** One entry of LOG_SENT's log. `doc` is the time origin of the page that sent it. */
interface SentEntry {
  via: string;
  url: string;
  t: number;
  doc: number;
}

/** LOG_SENT's log for this tab, read from whichever page the tab is on now. */
async function sentLog(page: Page): Promise<SentEntry[]> {
  return JSON.parse(
    await page.evaluate(() => sessionStorage.getItem('np-sent-log') ?? '[]'),
  ) as SentEntry[];
}

/** True for a log entry addressed to an analytics host. */
function toAnalytics(entry: SentEntry): boolean {
  return isAnalyticsHost(new URL(entry.url).host);
}

// gtag.js decides once per page load, from a Math.random() draw it makes while
// its script first runs, whether to send tag diagnostics (#1278). A draw near
// 1 turns them on, as it does on a few percent of real page loads; draws made
// by anything other than gtag.js's first run are left alone.
const GTAG_DIAGNOSTICS_DRAWN = `(() => {
  const random = Math.random;
  Math.random = function () {
    const script = document.currentScript;
    return script && /^https:\\/\\/www\\.googletagmanager\\.com\\/gtag\\/js\\?/.test(script.src)
      ? 0.999999
      : random.call(Math);
  };
})();`;

// posthog-js drops every event from a browser it classifies as a bot: a
// HeadlessChrome user agent or brand, or navigator.webdriver (blocked-uas.ts,
// v1.438.3). Inside this sealed harness the page is presented as an ordinary
// Chrome so the real SDK behaves as it does for a visitor. Nothing here
// ships; the site itself never forces initialization.
const AS_A_BROWSER = `(() => {
  Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false, configurable: true });
  Object.defineProperty(Navigator.prototype, 'userAgentData', {
    get: () => ({ brands: [{ brand: 'Chromium', version: '146' }], mobile: false, platform: 'macOS' }),
    configurable: true,
  });
})();`;

let proxy: EgressProxy;
let browser: Browser;
let userAgent = '';

test.beforeAll(async () => {
  const missing: string[] = [];
  if (!existsSync(join(DIST, 'test-fixtures/privacy/index.html'))) {
    missing.push('dist-privacy-test/ with the fixture page: run `npm run build:privacy-test`');
  }
  if (!vendor.posthogDist || !existsSync(join(vendor.posthogDist, 'array.js'))) {
    missing.push('NP_POSTHOG_JS_DIST: the dist/ directory of posthog-js@1.438.3');
  } else if (!readFileSync(join(vendor.posthogDist, 'array.js'), 'utf8').includes('1.438.3')) {
    missing.push('NP_POSTHOG_JS_DIST must be posthog-js 1.438.3, the production version');
  }
  if (!vendor.gtagFile || !existsSync(vendor.gtagFile)) {
    missing.push('NP_GTAG_JS: a local copy of gtag.js');
  }
  expect(missing, `missing prerequisites:\n${missing.join('\n')}`).toEqual([]);
  proxy = await startEgressProxy(DIST);
  browser = await chromium.launch({ args: egressArgs(proxy.port) });
  const major = browser.version().split('.')[0];
  userAgent = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${major}.0.0.0 Safari/537.36`;
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
    userAgent,
  });
  const sink = await installDefaultDenyRoute(context, vendor);
  for (const content of [AS_A_BROWSER, ...initScripts]) await context.addInitScript({ content });
  const page = await context.newPage();
  return { context, page, sink };
}

async function waitFor(predicate: () => boolean, timeout = 15_000): Promise<boolean> {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (predicate()) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  return predicate();
}

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The recorder holds an interaction-free buffer back, so replay ships only after activity. */
async function activate(page: Page): Promise<void> {
  await page.mouse.move(100, 100);
  await page.mouse.move(400, 250);
  await page.locator('h1').first().click();
}

/** Requests to an analytics host the proxy refused since `since`. */
function analyticsRefusals(since: number): string[] {
  return proxy.log
    .filter((r) => r.at >= since && r.kind === 'refused')
    .map((r) => r.target)
    .filter((target) => isAnalyticsHost(target.includes('://') ? new URL(target).host : target));
}

function props(event: Record<string, unknown>): Record<string, unknown> {
  return (event.properties as Record<string, unknown>) ?? {};
}

function eventNames(sink: Sink, since = 0): string[] {
  return posthogEvents(sink, since).map((e) => String(e.event));
}

function allText(sink: Sink): string {
  return sink.records.map((r) => r.text).join('\n');
}

/**
 * The decoded, decompressed rrweb data of every `$snapshot` event only, not
 * the analytics events that `allText` also holds. Network-timing entries ride
 * in this data too (as rrweb plugin events), so a positive control for a DOM
 * attribute should also match something only that attribute carries.
 */
function replayText(sink: Sink): string {
  return posthogEvents(sink)
    .filter((e) => e.event === '$snapshot')
    .map((e) => JSON.stringify(props(e).$snapshot_data ?? null))
    .join('\n');
}

/** Every rrweb item of every `$snapshot` event, decompressed. */
function replayItems(sink: Sink): Array<{ type?: number; data?: Record<string, unknown> }> {
  return posthogEvents(sink)
    .filter((e) => e.event === '$snapshot')
    .flatMap((e) => {
      const data = props(e).$snapshot_data;
      return Array.isArray(data)
        ? (data as Array<{ type?: number; data?: Record<string, unknown> }>)
        : [];
    });
}

async function noSdk(page: Page): Promise<void> {
  const scripts = page.locator(
    'script[src*="/static/array.js"], script[src*="googletagmanager.com"]',
  );
  expect(await scripts.count()).toBe(0);
  expect(
    await page.evaluate(() => {
      const w = window as unknown as Record<string, unknown>;
      return [typeof w.posthog, typeof w.gtag, typeof w.dataLayer];
    }),
  ).toEqual(['undefined', 'undefined', 'undefined']);
}

test('the egress proxy has no way to forward a request', () => {
  const source = readFileSync(join(import.meta.dirname, 'egress.ts'), 'utf8');
  expect(source).toContain("import { createServer, type Server } from 'node:http';");
  // Value imports only; `import type` brings in no code.
  const valueImports = source.match(/^import (?!type )[^;]+;$/gm) ?? [];
  for (const line of valueImports) expect(line).not.toMatch(/node:(https|net|tls|dgram|http2)'/);
  expect(source).not.toMatch(
    /\b(?:http|https|net|tls)\.(?:request|get|connect)\(|createConnection|\bfetch\(|route\.fetch/,
  );
});

test('a beacon sent during pagehide reaches only the proxy, which refuses it', async () => {
  let canaryHits = 0;
  const canary = createServer((_req, res) => {
    canaryHits += 1;
    res.end('reached');
  });
  await new Promise<void>((r) => canary.listen(0, '127.0.0.1', r));
  const address = canary.address();
  const canaryPort = typeof address === 'object' && address ? address.port : 0;
  const { context, page, sink } = await open();
  await page.goto(FIXTURE);
  await page.evaluate((port) => {
    window.addEventListener('pagehide', () => {
      navigator.sendBeacon('https://unlisted.example/beacon', 'np-egress-check');
      navigator.sendBeacon('http://unlisted-http.example/beacon', 'np-egress-check');
      navigator.sendBeacon(`http://127.0.0.1:${port}/beacon`, 'np-egress-check');
      void fetch('https://unlisted-keepalive.example/k', {
        method: 'POST',
        body: 'np-egress-check',
        keepalive: true,
      }).catch(() => {});
    });
  }, canaryPort);
  const since = Date.now();
  await page.goto(`${SITE}/`);
  const refused = () =>
    proxy.log.filter((r) => r.at >= since && r.kind === 'refused').map((r) => r.target);
  await waitFor(() => refused().filter((t) => /unlisted|127\.0\.0\.1/.test(t)).length >= 4, 10_000);
  expect(refused()).toEqual(
    expect.arrayContaining([
      'unlisted.example:443',
      'http://unlisted-http.example/beacon',
      `http://127.0.0.1:${canaryPort}/beacon`,
      'unlisted-keepalive.example:443',
    ]),
  );
  expect(proxy.log.find((r) => r.target === 'http://unlisted-http.example/beacon')?.body).toBe(
    'np-egress-check',
  );
  // The route never saw them: unload requests bypass Playwright routing,
  // which is why the proxy, not the route, is the egress boundary.
  expect(sink.blocked.filter((u) => /unlisted/.test(u))).toEqual([]);
  expect(canaryHits).toBe(0);
  await context.close();
  await new Promise<void>((r) => canary.close(() => r()));
});

test('default-on loads both SDKs and sends scrubbed, masked data only', async () => {
  const { context, page, sink } = await open();
  await page.goto(FIXTURE);
  expect(await page.evaluate(() => (window as unknown as NpWindow).npPrivacy.get())).toMatchObject({
    effective: 'granted',
    reason: 'default',
    loadedThisPage: true,
  });
  await expect(page.locator('script[src$="/static/array.js"]')).toHaveCount(1);
  await expect(page.locator('script[src^="https://www.googletagmanager.com/gtag/js"]')).toHaveCount(
    1,
  );
  expect(
    await waitFor(() => eventNames(sink).includes('$pageview') && gaHits(sink).length > 0),
  ).toBe(true);

  for (const id of ['#fixture-text', '#fixture-email', '#fixture-textarea', '#fixture-form-text']) {
    await page.locator(id).fill('NP-CANARY-INPUT');
  }
  await page.locator('#fixture-pii-button').click();
  await page.locator('#fixture-masked').click({ clickCount: 3 });
  // URL-bearing attributes on non-link elements, added while recording: they
  // reach replay as mutations, and the image fetches as network-timing entries.
  await page.evaluate(() => {
    const img = document.createElement('img');
    img.src = '/np-asset.png?token=NP-CANARY-ASSET-SRC';
    img.srcset =
      '/np-asset.png?a=NP-CANARY-ASSET-SRCSET-1 1x, /np-asset@2x.png?b=NP-CANARY-ASSET-SRCSET-2 2x';
    const video = document.createElement('video');
    video.poster = 'https://image.mux.example/poster.webp?time=NP-CANARY-ASSET-POSTER';
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = '/np-asset.css?sig=NP-CANARY-ASSET-LINK';
    document.body.append(img, video, link);
  });
  expect(
    await waitFor(
      () => eventNames(sink).includes('$snapshot') && eventNames(sink).includes('$autocapture'),
      25_000,
    ),
  ).toBe(true);
  // Positive control: the injected image reached the recorded DOM. It reads
  // only $snapshot data and requires the srcset descriptor (` 2x`), which the
  // <img> attribute carries and a network-timing entry for the fetch does not.
  // Scrub-agnostic, so a negative control still reaches the canary check; the
  // exact scrubbed form is asserted below.
  const imageInReplay = () => /np-asset@2x\.png[^"]* 2x/.test(replayText(sink));
  expect(await waitFor(imageInReplay, 15_000)).toBe(true);
  await pause(4_000);

  await page.locator('#fixture-sensitive-link').click();
  await page.waitForURL(/NP-CANARY-QUERY/);
  const pageviewAt = (pattern: RegExp) =>
    posthogEvents(sink).some(
      (e) => e.event === '$pageview' && pattern.test(String(props(e).$current_url)),
    );
  const fixtureWithUtm = `${SITE}/test-fixtures/privacy/?utm_source=fixture`;
  // GA4 batches and flushes on unload by beacon, which the proxy refuses, so
  // each page's hit is awaited before leaving it. The first wait accepts the
  // fixture URL scrubbed or not, so a negative control still reaches the
  // canary checks below.
  const gaLandedOnFixture = () =>
    gaHits(sink).some((r) =>
      gaHitParams(r).some((hit) => (hit.get('dl') ?? '').includes('utm_source=fixture')),
    );
  expect(await waitFor(() => pageviewAt(/utm_source=fixture/) && gaLandedOnFixture())).toBe(true);
  await page.locator('#fixture-privacy-link').click();
  await page.waitForURL(`${SITE}/privacy/`);
  expect(
    await waitFor(() => pageviewAt(/\/privacy\/$/) && gaHasParam(sink, 'dl', `${SITE}/privacy/`)),
  ).toBe(true);
  await pause(4_000);
  await page.goto(`${SITE}/`);
  await pause(2_000);

  const text = allText(sink);
  for (const canary of CANARIES) {
    expect.soft(text, `${canary} reached the sink`).not.toContain(canary);
  }
  expect
    .soft(text, 'an injected asset URL query reached the sink')
    .not.toContain('NP-CANARY-ASSET');
  // In the replay data, rrweb records the srcset with absolute URLs; both
  // candidates keep their path and descriptor and lose their query.
  expect(replayText(sink)).toContain(`${SITE}/np-asset.png 1x, ${SITE}/np-asset@2x.png 2x`);
  // Positive controls: the allowlisted parameter survives in both tools, the
  // replay really ran, and masked inputs are present as asterisks.
  // (PostHog's $referrer is the session's first referrer, $direct here; GA4's
  // dr is per page, so the /privacy/ hit is the referrer control.)
  expect(gaHasParam(sink, 'dl', fixtureWithUtm)).toBe(true);
  expect(gaHasParam(sink, 'dr', fixtureWithUtm)).toBe(true);
  const pageviews = posthogEvents(sink).filter((e) => e.event === '$pageview');
  expect(pageviews.map((e) => props(e).$current_url)).toContain(fixtureWithUtm);
  expect(text).toContain('"type":2');
  expect(text).toContain('*'.repeat('NP-CANARY-INPUT'.length));
  // No data-* value and no non-structural attribute in any autocapture chain.
  const chains = posthogEvents(sink)
    .map((e) => props(e).$elements_chain)
    .filter((c): c is string => typeof c === 'string' && c.length > 0);
  expect(chains.length).toBeGreaterThan(0);
  for (const chain of chains) expect(chain).not.toMatch(/attr__(data-|style|target|onsubmit)/);
  await context.close();
});

// #1261. The remote config served here turns console logs, canvas, and
// network timing on, as production does; the client config turns all three
// off. Each feature gets something to record while replay runs: a console line
// carrying a URL, a canvas drawn on for over a second, and a fetch.
test('replay records no console, canvas, or network-timing data over the project config, and replay and web vitals still flow', async () => {
  expect(REMOTE_CONFIG.sessionRecording).toMatchObject({
    consoleLogRecordingEnabled: true,
    recordCanvas: true,
  });
  expect(REMOTE_CONFIG.capturePerformance).toMatchObject({
    network_timing: true,
    web_vitals: true,
  });
  const { context, page, sink } = await open();
  await page.goto(FIXTURE);
  await activate(page);
  expect(await waitFor(() => eventNames(sink).includes('$snapshot'), 25_000)).toBe(true);
  await page.evaluate(async () => {
    console.log(
      'np-console-probe https://nathanpayne.test/x?email=NP-CANARY-QUERY#NP-CANARY-FRAGMENT',
    );
    const canvas = document.createElement('canvas');
    canvas.id = 'np-canvas-probe';
    canvas.width = 160;
    canvas.height = 80;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    ctx.fillStyle = '#c03';
    ctx.fillRect(0, 0, 160, 80);
    document.body.append(canvas);
    for (let i = 0; i < 10; i += 1) {
      ctx.fillStyle = `hsl(${i * 36} 80% 50%)`;
      ctx.fillRect(i * 16, 0, 16, 80);
      await new Promise((r) => setTimeout(r, 150));
    }
    await fetch('/favicon.svg?np-network-probe=1', { cache: 'no-store' });
  });
  await activate(page);
  // Positive controls: replay kept recording after the probes (the canvas
  // element itself reached the recorded DOM), and web vitals were sent.
  expect(
    await waitFor(() => replayText(sink).includes('np-canvas-probe'), 20_000),
    'the canvas element reached the recorded DOM',
  ).toBe(true);
  expect(
    await waitFor(() => eventNames(sink).includes('$web_vitals'), 25_000),
    'web vitals events were sent',
  ).toBe(true);
  await pause(4_000);

  const items = replayItems(sink);
  expect(
    items.some((i) => i.type === 2),
    'a full DOM snapshot',
  ).toBe(true);
  expect(
    items.some((i) => i.type === 3),
    'incremental snapshots',
  ).toBe(true);
  const plugins = items.filter((i) => i.type === 6).map((i) => String(i.data?.plugin));
  expect(
    plugins.filter((p) => p === 'rrweb/console@1'),
    'console records',
  ).toEqual([]);
  expect(
    plugins.filter((p) => p === 'rrweb/network@1'),
    'network-timing records',
  ).toEqual([]);
  expect(
    items.filter((i) => i.type === 3 && i.data?.source === 9),
    'canvas mutation records',
  ).toEqual([]);
  const text = replayText(sink);
  expect(text, 'a canvas image in a recorded node').not.toContain('rr_dataURL');
  expect(text, 'the console probe').not.toContain('np-console-probe');
  expect(text, 'the fetched URL').not.toContain('np-network-probe');
  // The recorder's own report of what it ran with.
  const sessionOptions = items.find((i) => i.type === 5 && i.data?.tag === '$session_options')?.data
    ?.payload as
    { sessionRecordingOptions: { recordCanvas?: unknown }; activePlugins: string[] } | undefined;
  expect(sessionOptions, 'the recorder reported its options').toBeDefined();
  expect(Boolean(sessionOptions?.sessionRecordingOptions.recordCanvas)).toBe(false);
  expect(sessionOptions?.activePlugins).not.toContain('rrweb/console@1');
  expect(sessionOptions?.activePlugins).not.toContain('rrweb/network@1');
  await context.close();
});

test('landing on a sensitive URL keeps it out of the first URL PostHog stores and sends', async () => {
  const { context, page, sink } = await open();
  await page.goto(
    `${SITE}/test-fixtures/privacy/?email=NP-CANARY-QUERY%40example.test&utm_source=fixture#NP-CANARY-FRAGMENT`,
  );
  await activate(page);
  expect(await waitFor(() => eventNames(sink).includes('$pageview'))).toBe(true);
  await pause(1_000);
  const stored = await page.evaluate(() => ({
    cookie: document.cookie,
    local: JSON.stringify({ ...window.localStorage }),
    session: JSON.stringify({ ...window.sessionStorage }),
  }));
  expect(stored.cookie).toContain('_posthog');
  expect(stored.cookie).not.toContain('NP-CANARY');
  expect(decodeURIComponent(stored.cookie)).toContain(
    '"u":"http://nathanpayne.test/test-fixtures/privacy/?utm_source=fixture"',
  );
  const local = JSON.parse(stored.local) as Record<string, string>;
  const persisted = JSON.parse(local[`ph_${POSTHOG_TOKEN}_posthog`] ?? '{}') as Record<
    string,
    { u?: string; props?: { u?: string } }
  >;
  expect(persisted.$initial_person_info?.u).toBe(
    'http://nathanpayne.test/test-fixtures/privacy/?utm_source=fixture',
  );
  const setOnce = posthogEvents(sink)
    .map((e) => e.$set_once as Record<string, unknown> | undefined)
    .find((s) => s && s.$initial_current_url);
  expect(setOnce?.$initial_current_url).toBe(
    'http://nathanpayne.test/test-fixtures/privacy/?utm_source=fixture',
  );
  expect(allText(sink)).not.toContain('NP-CANARY');
  // The session-entry URL the SDK keeps on the device ($client_session_props
  // in localStorage, and sessionStorage) is never transmitted and is left
  // as the SDK wrote it; the run logs whether it holds the canary.
  console.log(
    `device-only session-entry copy holds a canary: localStorage ${String(
      persisted.$client_session_props?.props?.u ?? '',
    ).includes('NP-CANARY')}, sessionStorage ${stored.session.includes('NP-CANARY')}`,
  );
  await context.close();
});

/**
 * posthog-js's own campaign-parameter lists, read out of the bundle under
 * test: PERSONAL_DATA_CAMPAIGN_PARAMS minifies to `<id>=["gclid",…]` and
 * CAMPAIGN_PARAMS to `<id>=["utm_source",…,...<that id>]`
 * (packages/browser-common/src/utils/event-utils.ts, v1.438.3). Each must be
 * found exactly once, so a reshaped bundle fails here rather than passing on
 * an empty list.
 */
function sdkCampaignParams(): { personal: string[]; campaign: string[] } {
  const bundle = readFileSync(join(vendor.posthogDist, 'array.js'), 'utf8');
  const personal = [...bundle.matchAll(/([A-Za-z_$][\w$]*)=\[("gclid"(?:,"[^"]+")*)\]/g)];
  expect(personal, 'PERSONAL_DATA_CAMPAIGN_PARAMS in array.js').toHaveLength(1);
  const [, id, personalList] = personal[0];
  // Escape every regex metacharacter, not just `$`, so the pattern stays literal.
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const campaign = [
    ...bundle.matchAll(new RegExp(`=\\[((?:"[^"]+",)+)\\.\\.\\.${escaped}\\]`, 'g')),
  ];
  expect(campaign, 'CAMPAIGN_PARAMS in array.js').toHaveLength(1);
  const names = (list: string) => JSON.parse(`[${list.replace(/,$/, '')}]`) as string[];
  const personalNames = names(personalList);
  return { personal: personalNames, campaign: [...names(campaign[0][1]), ...personalNames] };
}

/** Every `[key, value]` entry of every object in a decoded payload, at any depth. */
function entriesIn(value: unknown, out: Array<[string, unknown]> = []): Array<[string, unknown]> {
  if (Array.isArray(value)) for (const item of value) entriesIn(item, out);
  else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      out.push([key, item]);
      entriesIn(item, out);
    }
  }
  return out;
}

test('non-Google click identifiers never reach PostHog; the UTMs and Google identifiers are sent as before (#1263)', async () => {
  test.setTimeout(150_000);
  const { personal, campaign } = sdkCampaignParams();
  // Google's entries in the SDK's list. Their handling is unchanged until
  // Nathan checks the Ads links; gad_source is Google's too.
  const google = ['gclid', 'gclsrc', 'dclid', 'gbraid', 'wbraid', 'gad_source'];
  const dropped = personal.filter((name) => !google.includes(name));
  const kept = campaign.filter((name) => !dropped.includes(name));
  expect(dropped).toEqual(expect.arrayContaining(['fbclid', 'msclkid']));
  expect(kept).toEqual(expect.arrayContaining([...google, 'utm_source', 'utm_term']));
  // Every name the SDK sends a campaign parameter under, plus $fbc, which it
  // builds from fbclid.
  const droppedKeys = new Set([
    ...dropped.flatMap((name) => [name, `$initial_${name}`, `$session_entry_${name}`]),
    '$fbc',
  ]);
  const urlAllowlist = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'gclid',
    'gbraid',
    'wbraid',
    'dclid',
  ];
  // A distinct value per parameter, none a substring of another.
  const value = (name: string) => `NP-CLICKID-${name}-END`;
  const landing = new URLSearchParams(campaign.map((name) => [name, value(name)]));
  const allowlisted = new URLSearchParams(
    [...landing].filter(([name]) => urlAllowlist.includes(name)),
  );
  const { context, page, sink } = await open();
  const since = Date.now();
  await page.goto(`${FIXTURE}?${landing}`);
  // The gate removes exactly the SDK's non-Google personal-data parameters.
  // Soft, so a gate without the list still reaches the payload checks below.
  expect
    .soft(
      await page.evaluate(() => {
        const privacy = (
          window as unknown as {
            npPrivacy: Record<symbol, { DROPPED_CLICK_IDS?: readonly string[] }>;
          }
        ).npPrivacy;
        const list = privacy[Symbol.for('np-privacy.internal')].DROPPED_CLICK_IDS;
        return list ? [...list] : null;
      }),
      "the gate's list is the SDK's, minus Google",
    )
    .toEqual(dropped);
  await activate(page);
  expect(
    await waitFor(
      () => eventNames(sink).includes('$pageview') && eventNames(sink).includes('$snapshot'),
      25_000,
    ),
  ).toBe(true);
  // A later event on the same page: the values the SDK registered on landing
  // ride along on it.
  await page.locator('#fixture-pii-button').click();
  await page.evaluate(() =>
    (window as unknown as NpWindow).posthog?.capture('np_click_id_followup'),
  );
  expect(await waitFor(() => eventNames(sink).includes('np_click_id_followup'))).toBe(true);
  await pause(4_000);
  // Up to here nothing went around the sink, so every PostHog request this
  // page sent is inspected below. (Leaving the page sends its last batch by
  // beacon, which bypasses the route and is refused by the proxy unread.)
  expect(analyticsRefusals(since)).toEqual([]);
  const stored = await page.evaluate(() => {
    const ph = (window as unknown as { posthog?: { get_property(k: string): unknown } }).posthog;
    return {
      cookie: document.cookie,
      local: JSON.stringify({ ...window.localStorage }),
      session: JSON.stringify({ ...window.sessionStorage }),
      flagPersonProperties: ph?.get_property('$stored_person_properties') ?? null,
      fbcRecord: ph?.get_property('$fbc_persistence') ?? null,
    };
  });
  // A second page in the same session, with a fresh SDK instance that reads
  // what the first one stored, then a third.
  const secondLoad = Date.now();
  await page.goto(`${SITE}/blog/`);
  await activate(page);
  expect(
    await waitFor(() => posthogEvents(sink, secondLoad).some((e) => e.event === '$pageview')),
  ).toBe(true);
  await pause(4_000);
  await page.goto(`${SITE}/`);
  await pause(2_000);

  const events = posthogEvents(sink);
  const pageviews = events.filter((e) => e.event === '$pageview');
  const landed = pageviews[0];
  const setOnce = events
    .map((e) => e.$set_once as Record<string, unknown> | undefined)
    .find((s) => s && '$initial_current_url' in s);
  const posthogRecords = sink.records.filter((r) => {
    const host = new URL(r.url).hostname;
    return host === POSTHOG_HOST || isHostOrSubdomain(host, 'posthog.com');
  });
  const flagRequests = posthogRecords.filter((r) => new URL(r.url).pathname.startsWith('/flags'));
  const flagPersonProperties = flagRequests.map(
    (r) => (r.json as { person_properties?: Record<string, unknown> })?.person_properties ?? {},
  );
  console.log(`/flags requests: ${flagRequests.length}`);

  // Positive controls: the landing $pageview, the person's first-touch
  // properties, the follow-up event, and a /flags request made after the
  // first capture were all sent, and what is kept is exactly what the SDK
  // copied. These hold with or without the change.
  expect(props(landed).$current_url).toBe(`${FIXTURE}?${allowlisted}`);
  expect(setOnce, 'the first-touch $set_once was sent').toBeDefined();
  const later = events.filter((e) => e.event === 'np_click_id_followup' || e.event === '$pageview');
  expect(later.length).toBeGreaterThanOrEqual(3);
  for (const name of kept) {
    for (const event of later) {
      expect.soft(props(event)[name], `${String(event.event)} ${name}`).toBe(value(name));
      expect
        .soft(
          props(event)[`$session_entry_${name}`],
          `${String(event.event)} $session_entry_${name}`,
        )
        .toBe(value(name));
    }
    expect.soft(setOnce?.[`$initial_${name}`], `$set_once.$initial_${name}`).toBe(value(name));
    expect.soft(setOnce?.[name], `$set_once.${name}`).toBe(value(name));
  }
  const flagsAfterCapture = flagPersonProperties.filter((p) => '$initial_current_url' in p);
  expect(flagsAfterCapture.length, 'a /flags request after the first capture').toBeGreaterThan(0);
  for (const p of flagsAfterCapture) {
    // The first URL the SDK stores is scrubbed, so its /flags copies carry
    // the URL-allowlisted parameters only.
    for (const name of urlAllowlist) {
      expect.soft(p[`$initial_${name}`], `/flags $initial_${name}`).toBe(value(name));
    }
  }

  // No non-Google identifier anywhere in any PostHog request, as any value
  // under any key: events, person updates, replay, /flags, every endpoint.
  const sent = posthogRecords.map((r) => r.text).join('\n');
  for (const name of dropped) {
    expect.soft(sent, `${name}'s value reached PostHog`).not.toContain(value(name));
  }
  // No event carries a dropped name at all, null included.
  const eventKeys = new Set(
    events.flatMap((e) =>
      entriesIn([props(e), e.$set ?? null, e.$set_once ?? null]).map(([key]) => key),
    ),
  );
  for (const key of droppedKeys) {
    expect.soft(eventKeys.has(key), `an event carried ${key}`).toBe(false);
  }
  // Outside events, a dropped name appears only where the SDK lists every
  // campaign key from the scrubbed first URL, so its value is always null.
  for (const record of posthogRecords) {
    for (const [key, item] of entriesIn(record.json)) {
      if (droppedKeys.has(key)) {
        expect.soft(item, `${new URL(record.url).pathname} ${key}`).toBeNull();
      }
    }
  }
  // The flag person properties the SDK keeps for every later /flags request,
  // and its $fbc record, no longer hold the identifier.
  expect.soft(JSON.stringify(stored.flagPersonProperties ?? {})).not.toContain(value('fbclid'));
  expect.soft(stored.fbcRecord, 'the SDK still holds a $fbc record').toBeNull();
  // The first URL the SDK keeps in its cookie, which rides on requests to the
  // site, was scrubbed too.
  for (const name of dropped) expect(stored.cookie).not.toContain(value(name));
  // Device-only copies the SDK keeps in its storage and never sends; logged
  // for the record (specs/analytics.md § Privacy Runtime).
  const carrying = (text: string) => dropped.filter((name) => text.includes(value(name)));
  console.log(
    `device-only click-identifier copies: localStorage [${carrying(stored.local).join(', ')}], sessionStorage [${carrying(stored.session).join(', ')}]`,
  );
  const gaText = sink.records
    .filter((r) => !posthogRecords.includes(r))
    .map((r) => r.text)
    .join('\n');
  console.log(
    `GA4 requests carrying a non-Google identifier (GA4 is out of scope): [${carrying(gaText).join(', ')}]`,
  );
  await context.close();
});

test('a $fbc the SDK stored on an earlier visit is gone before the next /flags request (#1263)', async () => {
  // A returning visitor who landed with fbclid before the change: the SDK
  // kept $fbc in the flag person properties it sends with every /flags
  // request, and in its own $fbc record (persistence keys, v1.438.3).
  // The project has no flags, so in this harness nothing requests /flags on
  // its own; the test asks for one, as a project with flags does on every load.
  const fbc = 'fb.1.1760000000000.NP-CLICKID-stored-fbclid-END';
  const key = `ph_${POSTHOG_TOKEN}_posthog`;
  const seed = JSON.stringify({
    $stored_person_properties: { $fbc: fbc },
    $fbc_persistence: { value: fbc, delivered: true },
  });
  const { context, page, sink } = await open([
    `if (!localStorage.getItem(${JSON.stringify(key)})) localStorage.setItem(${JSON.stringify(key)}, ${JSON.stringify(seed)});`,
  ]);
  const since = Date.now();
  await page.goto(FIXTURE);
  await activate(page);
  const flagRequests = () =>
    sink.records.filter(
      (r) =>
        new URL(r.url).hostname === POSTHOG_HOST && new URL(r.url).pathname.startsWith('/flags'),
    );
  expect(await waitFor(() => eventNames(sink).includes('$pageview'))).toBe(true);
  await page.evaluate(() =>
    (
      window as unknown as { posthog?: { reloadFeatureFlags(): void } }
    ).posthog?.reloadFeatureFlags(),
  );
  // Positive control: /flags was requested, with person properties. Without
  // dropStoredClickIds (gate.js), the seeded $fbc rides in them.
  expect(await waitFor(() => flagRequests().length > 0)).toBe(true);
  await pause(4_000);
  expect(analyticsRefusals(since)).toEqual([]);
  expect(flagRequests()[0].json).toMatchObject({ person_properties: expect.any(Object) });
  expect(allText(sink)).not.toContain('NP-CLICKID-stored-fbclid-END');
  expect(
    await page.evaluate(() => {
      const ph = (window as unknown as { posthog?: { get_property(k: string): unknown } }).posthog;
      return [
        ph?.get_property('$stored_person_properties') ?? null,
        ph?.get_property('$fbc_persistence') ?? null,
      ];
    }),
  ).toEqual([null, null]);
  await context.close();
});

test('a saved opt-out creates no SDK script element and sends zero requests', async () => {
  const { context, page, sink } = await open([saveChoice('denied')]);
  const since = Date.now();
  await page.goto(FIXTURE);
  expect(await page.evaluate(() => (window as unknown as NpWindow).npPrivacy.get())).toMatchObject({
    saved: 'denied',
    effective: 'denied',
    reason: 'choice',
    loadedThisPage: false,
  });
  await page.locator('#fixture-text').fill('typed');
  await page.locator('#fixture-pii-button').click();
  await noSdk(page);
  await pause(4_000);
  await page.goto(`${SITE}/blog/`);
  await noSdk(page);
  await pause(3_000);
  await page.goto(`${SITE}/`);
  await noSdk(page);
  await pause(2_000);
  expect(sink.served).toEqual([]);
  expect(sink.records).toEqual([]);
  expect(analyticsRefusals(since)).toEqual([]);
  await context.close();
});

test('GPC forces denied over a saved grant', async () => {
  const { context, page, sink } = await open([GPC_ON, saveChoice('granted')]);
  const since = Date.now();
  await page.goto(FIXTURE);
  expect(await page.evaluate(() => (window as unknown as NpWindow).npPrivacy.get())).toMatchObject({
    saved: 'granted',
    effective: 'denied',
    reason: 'gpc',
  });
  expect(await page.evaluate(() => (window as unknown as NpWindow).npPrivacy.set('granted'))).toBe(
    false,
  );
  await noSdk(page);
  await pause(4_000);
  await page.goto(`${SITE}/`);
  await noSdk(page);
  await pause(2_000);
  expect(sink.served).toEqual([]);
  expect(sink.records).toEqual([]);
  expect(analyticsRefusals(since)).toEqual([]);
  await context.close();
});

/**
 * § Withdrawal, end to end: withdraw mid-visit, try hard to produce more
 * traffic, leave the page, and check that nothing was started or sent after
 * the withdrawal. `diagnostics` marks a page load on which gtag.js sends tag
 * diagnostics, which reach Google through elements it creates rather than
 * through fetch, sendBeacon, or XHR, and which `ga-disable-<ID>` does not stop
 * (#1278).
 */
async function withdrawMidVisit({
  initScripts = [],
  query = '',
  diagnostics,
}: {
  initScripts?: string[];
  query?: string;
  diagnostics: boolean;
}): Promise<void> {
  const { context, page, sink } = await open([LOG_SENT, ...initScripts]);
  await page.goto(`${FIXTURE}${query}`);
  await activate(page);
  expect(
    await waitFor(() => eventNames(sink).includes('$snapshot') && gaHits(sink).length > 0, 25_000),
  ).toBe(true);
  const diagnosticsPing = (url: string) => url.startsWith('https://www.googletagmanager.com/td?');
  if (diagnostics) {
    // Positive control: gtag.js sent tag diagnostics on this page load.
    expect(
      await waitFor(() => sink.records.some((r) => diagnosticsPing(r.url))),
      'gtag.js sent a tag-diagnostics ping before the withdrawal',
    ).toBe(true);
  }
  // Queue fresh work right before withdrawing, so the batch queue and the
  // replay buffer both hold unsent data at the moment of withdrawal.
  await page.locator('#fixture-text').fill('before withdrawal');
  await page.locator('#fixture-pii-button').click();
  const withdrawnAt = Date.now();
  // The page clock just before set(): nothing else runs on the page between
  // this reading and the withdrawal, so a request logged later started after it.
  const { tBefore, doc } = await page.evaluate(() => {
    const t = performance.now();
    (window as unknown as NpWindow).npPrivacy.set('denied');
    return { tBefore: t, doc: performance.timeOrigin };
  });
  expect(
    await page.evaluate(
      (id) => (window as unknown as Record<string, unknown>)[`ga-disable-${id}`],
      GA_ID,
    ),
  ).toBe(true);
  // Try hard to produce more traffic.
  await page.locator('#fixture-textarea').fill('after withdrawal');
  await page.locator('#fixture-pii-button').click();
  await page.mouse.move(10, 10);
  await page.mouse.move(400, 300);
  await page.evaluate(() => {
    const w = window as unknown as NpWindow;
    w.posthog?.capture('np_after_withdrawal');
    w.gtag?.('event', 'np_after_withdrawal');
    const p = document.createElement('p');
    p.textContent = 'NP-AFTER-WITHDRAWAL';
    document.body.append(p);
  });
  await pause(7_000);
  expect(
    await page.evaluate(() => (window as unknown as NpWindow).posthog?.has_opted_out_capturing()),
  ).toBe(true);
  expect(
    await page.evaluate(() => (window as unknown as NpWindow).posthog?.sessionRecordingStarted()),
  ).toBe(false);
  // Unload: anything still queued would be beaconed now, and gtag.js sends
  // its last tag diagnostics at pagehide.
  await page.goto(`${SITE}/blog/`);
  await noSdk(page);
  await pause(3_000);
  // Every analytics request the guard let through, by the page clock: on the
  // fixture page, while it unloaded, and on the next page.
  const log = await sentLog(page);
  const before = log.filter((r) => r.doc === doc && r.t < tBefore && toAnalytics(r));
  // Positive controls: the log saw this page's analytics requests through
  // both kinds of hook, and the diagnostics ping where there was one.
  expect(before.some((r) => r.via === 'fetch')).toBe(true);
  expect(before.some((r) => r.via === 'HTMLScriptElement')).toBe(true);
  if (diagnostics) {
    expect(before.some((r) => r.via === 'HTMLImageElement' && diagnosticsPing(r.url))).toBe(true);
  }
  expect(
    log
      .filter((r) => toAnalytics(r) && (r.doc !== doc || r.t > tBefore))
      .map((r) => `${r.via} ${r.url}`),
    'analytics requests started after the withdrawal',
  ).toEqual([]);
  // The network side, which also sees any way of starting a request that the
  // log does not hook. Arrival is timed in Node, so the margin absorbs a
  // request the page started before the withdrawal that lands after it.
  expect(sink.records.filter((r) => r.at > withdrawnAt + 1_000).map((r) => r.url)).toEqual([]);
  const text = allText(sink);
  for (const marker of ['np_after_withdrawal', 'NP-AFTER-WITHDRAWAL', 'after withdrawal']) {
    expect(text).not.toContain(marker);
  }
  expect(analyticsRefusals(withdrawnAt)).toEqual([]);
  await context.close();
}

test("set('denied') mid-visit stops every further analytics request", async () => {
  await withdrawMidVisit({ diagnostics: false });
});

// #1278. On a few percent of page loads gtag.js draws itself into tag
// diagnostics, and at pagehide it then requests gtag/js again through a new
// script element, with the page's host and path in the query. This draws it
// in every time.
test("set('denied') mid-visit stops gtag.js tag diagnostics too (#1278)", async () => {
  await withdrawMidVisit({ initScripts: [GTAG_DIAGNOSTICS_DRAWN], diagnostics: true });
});

// #1278. gtag.js also turns tag diagnostics on for any page whose URL carries
// `gtm_latency=`, and then sends latency pings as images too.
test("set('denied') mid-visit stops gtag.js tag diagnostics on a gtm_latency URL (#1278)", async () => {
  await withdrawMidVisit({ query: '?gtm_latency=1', diagnostics: true });
});

// #1286. `ga-disable-<ID>` stops gtag.js accepting new events, but not one it
// accepted before the withdrawal: gtag.js checks ga-disable when it accepts
// an event, not when it sends it, and holds an accepted event (5 seconds here)
// before sending it. This pushes an event in the same task as the withdrawal,
// so a hit is held every time rather than only when the timing happens to
// line up, and shows that gtag.js still asks for it after ga-disable is set
// and that the transport guard refuses it.
test("a GA4 hit gtag.js holds at set('denied') is refused by the guard, not left to ga-disable (#1286)", async () => {
  const { context, page, sink } = await open([LOG_SENT]);
  await page.goto(FIXTURE);
  expect(await waitFor(() => gaHits(sink).length > 0)).toBe(true);
  // Every request gtag.js asks for, seen above the gate's transport guard: a
  // wrapper installed after the guard, which gtag.js reaches because it looks
  // `fetch` and `sendBeacon` up on each call. A request the guard refuses is
  // still recorded here; LOG_SENT, beneath the guard, sees only what passed.
  await page.evaluate(() => {
    const asked: Array<{ url: string; body: string; t: number }> = [];
    (window as unknown as { __npAsked: typeof asked }).__npAsked = asked;
    const guardedFetch = window.fetch;
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      asked.push({
        url: String(input instanceof Request ? input.url : input),
        body: typeof init?.body === 'string' ? init.body : '',
        t: performance.now(),
      });
      return guardedFetch.call(window, input, init);
    };
    const guardedBeacon = navigator.sendBeacon;
    navigator.sendBeacon = (url: string | URL, data?: BodyInit | null) => {
      asked.push({
        url: String(url),
        body: typeof data === 'string' ? data : '',
        t: performance.now(),
      });
      return guardedBeacon.call(navigator, url, data);
    };
  });
  const withdrawnAt = Date.now();
  const { tBefore, doc } = await page.evaluate(() => {
    const w = window as unknown as NpWindow;
    // Accepted now, while analytics are on, and held in gtag.js's batch.
    w.gtag?.('event', 'np_held_at_withdrawal');
    const t = performance.now();
    w.npPrivacy.set('denied');
    return { tBefore: t, doc: performance.timeOrigin };
  });
  expect(
    await page.evaluate(
      (id) => (window as unknown as Record<string, unknown>)[`ga-disable-${id}`],
      GA_ID,
    ),
  ).toBe(true);
  // Past the 5-second hold.
  await pause(8_000);
  // Positive control: ga-disable did not stop the held hit. gtag.js asked
  // for it after the withdrawal.
  const askedAfter = await page.evaluate(
    (t) =>
      (
        window as unknown as { __npAsked: Array<{ url: string; body: string; t: number }> }
      ).__npAsked
        .filter((r) => r.t > t)
        .map((r) => `${r.url}\n${r.body}`),
    tBefore,
  );
  expect(
    askedAfter.filter((r) => r.includes('/g/collect') && r.includes('en=np_held_at_withdrawal'))
      .length,
    'gtag.js asked to send the held hit after ga-disable was set',
  ).toBeGreaterThan(0);
  // The guard refused it: nothing got past the guard after the withdrawal,
  // the hit never reached the sink, and nothing went around the route.
  const log = await sentLog(page);
  expect(
    log
      .filter((r) => r.doc === doc && r.t > tBefore && toAnalytics(r))
      .map((r) => `${r.via} ${r.url}`),
  ).toEqual([]);
  expect(allText(sink)).not.toContain('np_held_at_withdrawal');
  expect(analyticsRefusals(withdrawnAt)).toEqual([]);
  await context.close();
});

test('a withdrawal in one tab withdraws every other open tab', async () => {
  const { context, page, sink } = await open();
  const other = await context.newPage();
  await page.goto(FIXTURE);
  await other.goto(`${SITE}/`);
  await activate(page);
  expect(await waitFor(() => eventNames(sink).filter((e) => e === '$pageview').length >= 2)).toBe(
    true,
  );
  const withdrawnAt = Date.now();
  await page.evaluate(() => (window as unknown as NpWindow).npPrivacy.set('denied'));
  await other.waitForFunction(
    () => (window as unknown as NpWindow).npPrivacy.get().effective === 'denied',
  );
  expect(
    await other.evaluate(
      (id) => (window as unknown as Record<string, unknown>)[`ga-disable-${id}`],
      GA_ID,
    ),
  ).toBe(true);
  expect(
    await other.evaluate(() => (window as unknown as NpWindow).posthog?.has_opted_out_capturing()),
  ).toBe(true);
  await other.mouse.move(50, 50);
  await other.mouse.move(500, 400);
  await other.evaluate(() => (window as unknown as NpWindow).posthog?.capture('np_other_tab'));
  await pause(6_000);
  await other.goto(`${SITE}/blog/`);
  await pause(2_000);
  expect(sink.records.filter((r) => r.at > withdrawnAt + 1_000).map((r) => r.url)).toEqual([]);
  expect(allText(sink)).not.toContain('np_other_tab');
  expect(analyticsRefusals(withdrawnAt)).toEqual([]);
  await context.close();
});

test('re-enabling takes effect on the next load, past the SDK opt-out the withdrawal stored', async () => {
  const { context, page, sink } = await open();
  await page.goto(FIXTURE);
  expect(await waitFor(() => eventNames(sink).includes('$pageview'))).toBe(true);
  const optOutKey = `__ph_opt_in_out_${POSTHOG_TOKEN}`;
  await page.evaluate(() => (window as unknown as NpWindow).npPrivacy.set('denied'));
  await page.waitForFunction((k) => window.localStorage.getItem(k) === '0', optOutKey);
  expect(await page.evaluate(() => (window as unknown as NpWindow).npPrivacy.set('granted'))).toBe(
    true,
  );
  const reGrantedAt = Date.now();
  await pause(4_000);
  expect(sink.records.filter((r) => r.at > reGrantedAt + 1_000)).toEqual([]);
  await page.reload();
  expect(
    await waitFor(() => posthogEvents(sink, reGrantedAt).some((e) => e.event === '$pageview')),
  ).toBe(true);
  expect(await waitFor(() => gaHits(sink, reGrantedAt).length > 0)).toBe(true);
  expect(
    await page.evaluate(() => (window as unknown as NpWindow).posthog?.has_opted_out_capturing()),
  ).toBe(false);
  expect(await page.evaluate((k) => window.localStorage.getItem(k), optOutKey)).toBeNull();
  await context.close();
});

test('replay never records an excluded path, by pushState or by navigation', async () => {
  const { context, page, sink } = await open();
  await page.goto(FIXTURE);
  await activate(page);
  expect(await waitFor(() => eventNames(sink).includes('$snapshot'), 25_000)).toBe(true);
  const recording = () =>
    page.evaluate(() => (window as unknown as NpWindow).posthog?.sessionRecordingStarted());
  expect(await recording()).toBe(true);

  await page.evaluate(() => {
    history.pushState({}, '', '/privacy/');
    const p = document.createElement('p');
    p.id = 'np-excluded-marker';
    p.textContent = 'NP-ON-EXCLUDED-PUSH';
    document.body.append(p);
  });
  expect(await recording()).toBe(false);
  await pause(6_000);
  expect(allText(sink)).not.toContain('NP-ON-EXCLUDED-PUSH');

  // Leaving the excluded path restarts recording (positive control).
  await page.evaluate(() => {
    document.getElementById('np-excluded-marker')?.remove();
    history.pushState({}, '', '/test-fixtures/privacy/');
    const p = document.createElement('p');
    p.textContent = 'NP-BACK-ON-ALLOWED';
    document.body.append(p);
  });
  expect(await waitFor(() => allText(sink).includes('NP-BACK-ON-ALLOWED'), 20_000)).toBe(true);

  await page.locator('#fixture-privacy-link').click();
  await page.waitForURL(`${SITE}/privacy/`);
  await page.waitForFunction(() =>
    Boolean((window as unknown as { posthog?: { __loaded?: boolean } }).posthog?.__loaded),
  );
  await page.evaluate(() => {
    const p = document.createElement('p');
    p.textContent = 'NP-ON-EXCLUDED-PAGE';
    document.body.append(p);
  });
  await pause(6_000);
  expect(await recording()).toBe(false);
  expect(allText(sink)).not.toContain('NP-ON-EXCLUDED-PAGE');
  await context.close();
});

interface NpWindow {
  npPrivacy: {
    get(): {
      saved: string;
      effective: string;
      reason: string;
      persisted: boolean;
      loadedThisPage: boolean;
    };
    set(choice: string): boolean;
  };
  posthog?: {
    capture(event: string): void;
    has_opted_out_capturing(): boolean;
    sessionRecordingStarted(): boolean;
  };
  gtag?: (...args: unknown[]) => void;
}
