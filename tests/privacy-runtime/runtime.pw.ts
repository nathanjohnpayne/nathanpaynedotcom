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
  POSTHOG_TOKEN,
  SITE_HOST,
  egressArgs,
  gaHits,
  installDefaultDenyRoute,
  isAnalyticsHost,
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
  expect(
    await waitFor(
      () => eventNames(sink).includes('$snapshot') && eventNames(sink).includes('$autocapture'),
      25_000,
    ),
  ).toBe(true);
  await pause(4_000);

  await page.locator('#fixture-sensitive-link').click();
  await page.waitForURL(/NP-CANARY-QUERY/);
  const pageviewAt = (pattern: RegExp) =>
    posthogEvents(sink).some(
      (e) => e.event === '$pageview' && pattern.test(String(props(e).$current_url)),
    );
  const fixtureWithUtm = `${SITE}/test-fixtures/privacy/?utm_source=fixture`;
  const gaHas = (needle: string) => gaHits(sink).some((r) => r.text.includes(needle));
  // GA4 batches and flushes on unload by beacon, which the proxy refuses, so
  // each page's hit is awaited before leaving it.
  expect(await waitFor(() => pageviewAt(/utm_source=fixture/) && gaHas('utm_source=fixture'))).toBe(
    true,
  );
  await page.locator('#fixture-privacy-link').click();
  await page.waitForURL(`${SITE}/privacy/`);
  expect(await waitFor(() => pageviewAt(/\/privacy\/$/) && gaHas(`dl=${SITE}/privacy/`))).toBe(
    true,
  );
  await pause(4_000);
  await page.goto(`${SITE}/`);
  await pause(2_000);

  const text = allText(sink);
  for (const canary of CANARIES) {
    expect.soft(text, `${canary} reached the sink`).not.toContain(canary);
  }
  // Positive controls: the allowlisted parameter survives in both tools, the
  // replay really ran, and masked inputs are present as asterisks.
  // (PostHog's $referrer is the session's first referrer, $direct here; GA4's
  // dr is per page, so the /privacy/ hit is the referrer control.)
  const exactParam = (name: string) =>
    new RegExp(`[?&]${name}=${fixtureWithUtm.replace(/[.?/]/g, '\\$&')}(&|$)`, 'm');
  expect(gaHits(sink).some((r) => exactParam('dl').test(r.text))).toBe(true);
  expect(gaHits(sink).some((r) => exactParam('dr').test(r.text))).toBe(true);
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

test("set('denied') mid-visit stops every further analytics request", async () => {
  const { context, page, sink } = await open([LOG_SENT]);
  await page.goto(FIXTURE);
  await activate(page);
  expect(
    await waitFor(() => eventNames(sink).includes('$snapshot') && gaHits(sink).length > 0, 25_000),
  ).toBe(true);
  // Queue fresh work right before withdrawing, so the batch queue and the
  // replay buffer both hold unsent data at the moment of withdrawal.
  await page.locator('#fixture-text').fill('before withdrawal');
  await page.locator('#fixture-pii-button').click();
  const withdrawnAt = Date.now();
  const tPage = await page.evaluate(() => {
    (window as unknown as NpWindow).npPrivacy.set('denied');
    return performance.now();
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
  const sentAfter = await page.evaluate(
    (t) => (window as unknown as NpWindow).__npSent.filter((r) => r.t > t).map((r) => r.url),
    tPage,
  );
  expect(sentAfter.filter((url) => isAnalyticsHost(new URL(url, SITE).host))).toEqual([]);
  expect(
    await page.evaluate(() => (window as unknown as NpWindow).posthog?.has_opted_out_capturing()),
  ).toBe(true);
  expect(
    await page.evaluate(() => (window as unknown as NpWindow).posthog?.sessionRecordingStarted()),
  ).toBe(false);
  // Unload: anything still queued would be beaconed now.
  await page.goto(`${SITE}/blog/`);
  await noSdk(page);
  await pause(3_000);
  expect(sink.records.filter((r) => r.at > withdrawnAt + 1_000).map((r) => r.url)).toEqual([]);
  const text = allText(sink);
  for (const marker of ['np_after_withdrawal', 'NP-AFTER-WITHDRAWAL', 'after withdrawal']) {
    expect(text).not.toContain(marker);
  }
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
  __npSent: Array<{ url: string; t: number }>;
}
