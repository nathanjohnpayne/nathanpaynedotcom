/**
 * Playwright fixtures for the #1079 privacy acceptance suite (#1230).
 *
 * Every browser the suite starts goes through `launchBrowser`, which applies
 * the egress boundary described in egress.ts, and every context goes through
 * `Session.open`, which installs the default-deny route, blocks service
 * workers, and denies WebSockets before the first navigation.
 */
import {
  chromium,
  expect,
  test as base,
  type Browser,
  type BrowserContext,
  type Page,
} from '@playwright/test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { CHROME_UA, DIST_DIR, SITE_ORIGIN, TEST_HOST } from './constants';
import { classify, Egress, installOutboundGuard, type Sink } from './egress';
import { loadFixtureState, loadManifest, type FixtureState } from './fixtures';

export { expect };

export const BOT_SCRUB = `
  (() => {
    try { Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false, configurable: true }); } catch {}
    try {
      const real = navigator.userAgentData;
      const brands = [
        { brand: 'Not.A/Brand', version: '99' },
        { brand: 'Chromium', version: '153' },
        { brand: 'Google Chrome', version: '153' },
      ];
      Object.defineProperty(Navigator.prototype, 'userAgentData', {
        configurable: true,
        get() {
          return {
            brands, mobile: false, platform: 'macOS',
            toJSON() { return { brands, mobile: false, platform: 'macOS' }; },
            getHighEntropyValues: (hints) => real ? real.getHighEntropyValues(hints) : Promise.resolve({}),
          };
        },
      });
    } catch {}
  })();
`;

const GPC_ON = `Object.defineProperty(Navigator.prototype, 'globalPrivacyControl', { get: () => true, configurable: true });`;

export interface LaunchOptions {
  /** Pass the WebRTC UDP policy flag. The negative control launches without it. */
  webrtcPolicy?: boolean;
  /** Route through the harness proxy. The resolver-only control launches without it. */
  proxyPort?: number;
}

/** Chromium arguments for the egress boundary (contract § Test Fixture, Egress). */
export function chromiumArgs(options: LaunchOptions): string[] {
  const args = [
    // Accept exactly one certificate: the harness proxy's throwaway one. (Service workers refuse
    // certificate overrides that `ignoreHTTPSErrors` grants, so a pinned SPKI is also what lets the
    // service-worker control register.)
    `--ignore-certificate-errors-spki-list=${loadFixtureState().spkiSha256}`,
    // Resolver deny: every hostname but the test host is NOTFOUND (loopback excluded for the proxy).
    `--host-resolver-rules=MAP ${TEST_HOST} 127.0.0.1, MAP * ~NOTFOUND, EXCLUDE 127.0.0.1`,
    '--disable-features=NetworkErrorLogging,ReportingAPI',
  ];
  if (options.proxyPort !== undefined) {
    args.push(
      `--proxy-server=http://127.0.0.1:${options.proxyPort}`,
      '--proxy-bypass-list=<-loopback>',
    );
  }
  if (options.webrtcPolicy !== false)
    args.push('--force-webrtc-ip-handling-policy=disable_non_proxied_udp');
  return args;
}

export function launchBrowser(options: LaunchOptions): Promise<Browser> {
  return chromium.launch({ args: chromiumArgs(options) });
}

export interface RequestRecord {
  url: string;
  method: string;
  resourceType: string;
  failure?: string;
}

export interface SessionOptions {
  /** Report `navigator.globalPrivacyControl === true`. */
  gpc?: boolean;
  storageState?: Awaited<ReturnType<BrowserContext['storageState']>>;
  viewport?: { width: number; height: number };
  reducedMotion?: 'reduce' | 'no-preference';
  /** Leave the headless bot signals alone (only the bot-filter self-check uses this). */
  exposeHeadless?: boolean;
  /** Report this `document.referrer` (a source page that sends its full URL), in every document. */
  referrer?: string;
  /** Make `localStorage` and `sessionStorage` throw SecurityError, as blocked site data does. */
  blockStorage?: boolean;
  /** `allow` exists only so a control can show that the default `block` is what stops registration. */
  serviceWorkers?: 'block' | 'allow';
}

/** Shape of `window.npPrivacy.get()` (contract § Runtime API). */
export interface PrivacyState {
  saved: 'unset' | 'granted' | 'denied';
  effective: 'granted' | 'denied';
  reason: 'default' | 'choice' | 'gpc';
  persisted: boolean;
  loadedThisPage: boolean;
}

export class Session {
  readonly requests: RequestRecord[] = [];
  readonly pageErrors: string[] = [];
  private constructor(
    readonly context: BrowserContext,
    readonly page: Page,
    private readonly egress: Egress,
    /** Requests the default-deny route aborted. */
    readonly denied: string[],
    readonly wsDenied: string[],
  ) {}

  get sink(): Sink {
    return this.egress.sink;
  }

  static async open(
    browser: Browser,
    egress: Egress,
    options: SessionOptions = {},
  ): Promise<Session> {
    const manifest = loadManifest();
    const paths = new Set(Object.values(manifest.posthog.files).map((f) => f.servedAt));
    const context = await browser.newContext({
      serviceWorkers: options.serviceWorkers ?? 'block',
      viewport: options.viewport ?? { width: 1280, height: 900 },
      locale: 'en-US',
      timezoneId: 'America/Los_Angeles',
      userAgent: options.exposeHeadless ? undefined : CHROME_UA,
      reducedMotion: options.reducedMotion,
      storageState: options.storageState,
    });
    const denied: string[] = [];
    const wsDenied: string[] = [];
    // Layer 1: default-deny. Installed before any page exists, so before the first navigation.
    await context.route('**/*', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (classify(url, request.method(), paths) === 'deny') {
        denied.push(`${request.method()} ${url.origin}${url.pathname}`);
        await route.abort('blockedbyclient');
        return;
      }
      await route.continue();
    });
    await context.routeWebSocket(/.*/, (ws) => {
      wsDenied.push(ws.url());
      void ws.close();
    });
    if (!options.exposeHeadless) await context.addInitScript(BOT_SCRUB);
    if (options.gpc) await context.addInitScript(GPC_ON);
    // Values travel as arguments to a function, never spliced into script source.
    if (options.referrer !== undefined) {
      await context.addInitScript((value: string) => {
        Object.defineProperty(document, 'referrer', { get: () => value, configurable: true });
      }, options.referrer);
    }
    if (options.blockStorage) {
      await context.addInitScript(() => {
        for (const name of ['localStorage', 'sessionStorage']) {
          Object.defineProperty(window, name, {
            configurable: true,
            get() {
              throw new DOMException('blocked', 'SecurityError');
            },
          });
        }
      });
    }
    const page = await context.newPage();
    const session = new Session(context, page, egress, denied, wsDenied);
    context.on('request', (r) =>
      session.requests.push({ url: r.url(), method: r.method(), resourceType: r.resourceType() }),
    );
    context.on('requestfailed', (r) => {
      const entry = session.requests.find((x) => x.url === r.url() && x.failure === undefined);
      if (entry) entry.failure = r.failure()?.errorText;
    });
    page.on('pageerror', (e) => session.pageErrors.push(e.message));
    return session;
  }

  /** Navigate to a site path and wait for the load event. */
  async goto(path: string, target: Page = this.page): Promise<void> {
    await target.goto(`${SITE_ORIGIN}${path}`, { waitUntil: 'load' });
  }

  /** `window.npPrivacy.get()` or null when the gate is absent. */
  async privacy(target: Page = this.page): Promise<PrivacyState | null> {
    return target.evaluate(() => {
      const gate = (window as unknown as { npPrivacy?: { get(): unknown } }).npPrivacy;
      return gate ? (gate.get() as PrivacyState) : null;
    });
  }

  /** Requests the page attempted to analytics vendor hosts, whether or not they were allowed. */
  attemptedVendorRequests(): RequestRecord[] {
    return this.requests.filter((r) => {
      const host = new URL(r.url).hostname;
      return (
        host === 'd.nathanpayne.com' ||
        /(^|\.)posthog\.com$/.test(host) ||
        /(^|\.)(google-analytics\.com|analytics\.google\.com|googletagmanager\.com|doubleclick\.net|googleadservices\.com)$/.test(
          host,
        )
      );
    });
  }

  async close(): Promise<void> {
    await this.context.close();
  }
}

interface WorkerFixtures {
  fixtureState: FixtureState;
  egress: Egress;
  browser: Browser;
}

interface TestFixtures {
  open: (options?: SessionOptions) => Promise<Session>;
}

/** Is the /privacy/ page (sub-issue #1229) present in the build under test? */
export function privacyPageBuilt(): boolean {
  return existsSync(join(DIST_DIR, 'privacy', 'index.html'));
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  fixtureState: [
    // Playwright requires the destructuring pattern even when a fixture depends on nothing.
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      await use(loadFixtureState());
    },
    { scope: 'worker' },
  ],
  egress: [
    async ({ fixtureState }, use) => {
      installOutboundGuard();
      const egress = await Egress.start({ state: fixtureState });
      await use(egress);
      await egress.close();
    },
    { scope: 'worker' },
  ],
  // Overrides Playwright's own browser fixture so no test can launch an unbounded browser.
  browser: [
    async ({ egress }, use) => {
      const browser = await launchBrowser({ proxyPort: egress.port });
      await use(browser);
      await browser.close();
    },
    { scope: 'worker' },
  ],
  open: async ({ browser, egress }, use) => {
    egress.reset();
    const sessions: Session[] = [];
    await use(async (options) => {
      const session = await Session.open(browser, egress, options);
      sessions.push(session);
      return session;
    });
    for (const s of sessions) await s.close().catch(() => undefined);
  },
});
