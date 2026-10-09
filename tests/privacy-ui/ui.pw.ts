/**
 * #1229 privacy UI in a real browser (specs/analytics-privacy.md § UI Hooks;
 * PRIV-6, PRIV-10, PRIV-14). Runs against the flag-on test build in
 * dist-privacy-test/, served as `nathanpayne.test`.
 *
 * Egress: Chromium's only network path is the refusing proxy from
 * tests/privacy-runtime/egress.ts (`--proxy-server`, loopback not bypassed,
 * every other hostname unresolvable, non-proxied WebRTC UDP off). A
 * default-deny route installed before the first navigation aborts every
 * request whose origin is not exactly the site under test, so the analytics
 * SDK loads and collection requests never leave the browser; service workers
 * are blocked. No vendor SDK is served here: these checks exercise the UI's
 * contract with window.npPrivacy, which the gate provides on every page.
 */
import {
  test,
  expect,
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from '@playwright/test';
import { existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  SITE_HOST,
  egressArgs,
  startEgressProxy,
  type EgressProxy,
} from '../privacy-runtime/egress';

const ROOT = resolve(import.meta.dirname, '..', '..');
const DIST = join(ROOT, 'dist-privacy-test');
const SITE = `http://${SITE_HOST}`;
const SHOTS = join(ROOT, 'screenshots', 'privacy');
const AXE = process.env.NP_AXE_CORE ?? '';
const WRITE_SHOTS = process.env.NP_PRIVACY_SCREENSHOTS === '1';

const DESKTOP = { width: 1280, height: 900 };
const MOBILE = { width: 375, height: 667 };
const NARROW = { width: 320, height: 568 };

/** Page-side scripts, injected before any page script runs. */
const GPC_ON =
  "Object.defineProperty(Navigator.prototype, 'globalPrivacyControl', { get: () => true, configurable: true });";
const STORAGE_WRITE_THROWS =
  "Storage.prototype.setItem = function () { throw new DOMException('full', 'QuotaExceededError'); };";

let proxy: EgressProxy;
let browser: Browser;
/** Every request the default-deny route aborted, for the egress assertions. */
const aborted: string[] = [];

test.beforeAll(async () => {
  expect(
    existsSync(join(DIST, 'privacy/index.html')),
    'dist-privacy-test/ with /privacy/: run `npm run build:privacy-test`',
  ).toBe(true);
  proxy = await startEgressProxy(DIST);
  browser = await chromium.launch({ args: egressArgs(proxy.port) });
  if (WRITE_SHOTS) mkdirSync(SHOTS, { recursive: true });
});

test.afterAll(async () => {
  await browser?.close();
  await proxy?.close();
  // The proxy served nothing but the site under test; everything else it saw
  // was refused, and the route never let a request reach it.
  for (const record of proxy?.log ?? []) {
    if (record.kind === 'served') expect(record.target.startsWith(`${SITE}/`)).toBe(true);
  }
  expect(aborted.filter((url) => url.startsWith(`${SITE}/`))).toEqual([]);
});

async function open(
  viewport = DESKTOP,
  initScripts: string[] = [],
  extra: { reducedMotion?: 'reduce' | 'no-preference' } = {},
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ serviceWorkers: 'block', viewport, ...extra });
  // The allowlist is one exact origin. Analytics collection endpoints are
  // never on it, so they are aborted here and, if anything slipped past the
  // route (an unload-time beacon), refused by the proxy.
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === SITE) {
      await route.continue();
      return;
    }
    aborted.push(route.request().url());
    await route.abort('blockedbyclient');
  });
  for (const content of initScripts) await context.addInitScript({ content });
  const page = await context.newPage();
  return { context, page };
}

const notice = (page: Page) => page.locator('#np-privacy-notice');
const status = (page: Page) => page.locator('[data-np-privacy-ui="status"]');
const noticeAction = (page: Page, name: string) =>
  page.locator(`#np-privacy-notice [data-np-privacy-action="${name}"]`);
const controlAction = (page: Page, name: string) =>
  page.locator(`#np-privacy-controls [data-np-privacy-action="${name}"]`);

async function shot(page: Page, name: string, options: { fullPage?: boolean } = {}) {
  if (!WRITE_SHOTS) return;
  await page.screenshot({ path: join(SHOTS, `${name}.png`), ...options });
}

async function elementShot(page: Page, selector: string, name: string) {
  if (!WRITE_SHOTS) return;
  await page.locator(selector).screenshot({ path: join(SHOTS, `${name}.png`) });
}

/**
 * axe-core, injected from the local file NP_AXE_CORE names (never fetched).
 * WCAG 2.x A/AA for a whole page; axe's full default ruleset, best practices
 * included, when the context is one of this track's own surfaces.
 */
async function axeViolations(page: Page, selector?: string) {
  await page.addScriptTag({ path: AXE });
  return page.evaluate(
    async ({ selector, full }) => {
      const axe = (
        window as unknown as { axe: { run: (c: unknown, o: unknown) => Promise<AxeResults> } }
      ).axe;
      const context = selector ? document.querySelector(selector) : document;
      const options = full
        ? {}
        : {
            runOnly: {
              type: 'tag',
              values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
            },
          };
      const result = await axe.run(context, options);
      return result.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.map((n) => n.target.join(' ')),
      }));
    },
    { selector, full: Boolean(selector) },
  );
}

interface AxeResults {
  violations: Array<{
    id: string;
    impact: string | null;
    help: string;
    nodes: Array<{ target: string[] }>;
  }>;
}

for (const viewport of [DESKTOP, MOBILE, NARROW]) {
  test(`first visit at ${viewport.width}px: the notice is in flow above the page, non-modal, and reachable`, async () => {
    const { context, page } = await open(viewport);
    await page.goto(`${SITE}/blog/`);
    await expect(notice(page)).toBeVisible();
    const geometry = await page.evaluate(() => {
      const n = document.getElementById('np-privacy-notice') as HTMLElement;
      const main = document.querySelector('main') as HTMLElement;
      const html = document.documentElement;
      return {
        position: getComputedStyle(n).position,
        firstInBody: document.body.firstElementChild === n,
        noticeBottom: n.getBoundingClientRect().bottom,
        mainTop: main.getBoundingClientRect().top,
        role: n.getAttribute('role'),
        modal: n.getAttribute('aria-modal'),
        mainInert: main.hasAttribute('inert') || main.getAttribute('aria-hidden') === 'true',
        bodyOverflow: getComputedStyle(document.body).overflow,
        htmlOverflow: getComputedStyle(html).overflow,
        focusedOnLoad: document.activeElement === document.body,
        overflowsHorizontally: html.scrollWidth > html.clientWidth,
      };
    });
    expect(geometry.position).toBe('static');
    expect(geometry.firstInBody).toBe(true);
    // Above the content, not over it: the notice ends before the main starts.
    expect(geometry.noticeBottom).toBeLessThanOrEqual(geometry.mainTop + 0.5);
    expect(geometry.role).toBeNull();
    expect(geometry.modal).toBeNull();
    expect(geometry.mainInert).toBe(false);
    expect(geometry.bodyOverflow).not.toBe('hidden');
    expect(geometry.htmlOverflow).not.toBe('hidden');
    expect(geometry.focusedOnLoad).toBe(true);
    expect(geometry.overflowsHorizontally).toBe(false);
    // Keyboard, from a fresh load: link, deny, dismiss, then out of the notice
    // into the page. (Checked before the trial click below, which moves
    // Chromium's sequential-focus starting point to the clicked element.)
    const focusPath: string[] = [];
    for (let i = 0; i < 4; i += 1) {
      await page.keyboard.press('Tab');
      focusPath.push(
        await page.evaluate(() => {
          const el = document.activeElement as HTMLElement;
          const inNotice = Boolean(el.closest('#np-privacy-notice'));
          return inNotice ? (el.getAttribute('data-np-privacy-action') ?? 'link') : 'page';
        }),
      );
    }
    expect(focusPath).toEqual(['link', 'deny', 'dismiss', 'page']);
    // The page behind it stays interactive: a trial click checks the link is
    // visible, stable, and not obscured by anything.
    await page.locator('main a').first().click({ trial: true });
    await context.close();
  });
}

test('the footer link is on every surface, including the homepage and the 404', async () => {
  for (const viewport of [DESKTOP, MOBILE]) {
    const { context, page } = await open(viewport);
    for (const route of [
      '/',
      '/blog/',
      '/blog/six-prs-one-bug-agent-failure-modes/',
      '/projects/',
      '/projects/matchline/',
      '/resume/',
      '/404.html',
    ]) {
      await page.goto(`${SITE}${route}`);
      const link = page.locator('[data-np-privacy-ui="footer-link"]');
      await expect(link, `${route} at ${viewport.width}px`).toHaveCount(1);
      await expect(link).toHaveAttribute('href', '/privacy/');
      await expect(link).toHaveText(/^Privacy/);
      // The homepage link lives in the Connect panel, whose content shows on
      // the phone stack and, on the desktop composition, once the panel opens
      // (by keyboard here: Enter on the label, the documented path).
      if (route === '/' && viewport === DESKTOP) {
        await page.locator('.panel--blue .panel-label').focus();
        await page.keyboard.press('Enter');
      }
      await expect(link, `${route} at ${viewport.width}px`).toBeVisible();
    }
    await context.close();
  }
});

test('turning analytics off from the notice is one step and holds across loads; re-enabling waits for the next load', async () => {
  const { context, page } = await open();
  await page.goto(`${SITE}/blog/`);
  await noticeAction(page, 'deny').focus();
  await page.keyboard.press('Enter');
  await expect(notice(page)).toBeHidden();
  const announced = page.locator('#np-privacy-notice-status');
  await expect(announced).toHaveText('Analytics are off on this site.');
  await expect(announced).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.getAttribute('data-np-privacy'))).toBe(
    'denied',
  );
  expect(await page.evaluate(() => localStorage.getItem('np-privacy'))).toBe(
    JSON.stringify({ v: 1, choice: 'denied', noticeDismissed: false }),
  );
  await page.reload();
  await expect(notice(page)).toBeHidden();
  await page.locator('[data-np-privacy-ui="footer-link"]').click();
  await page.waitForURL(`${SITE}/privacy/`);
  await expect(status(page)).toHaveText('Analytics are off. You turned them off.');
  await controlAction(page, 'grant').click();
  await expect(status(page)).toHaveText(
    'Analytics are on. You turned them on. They start on the next page you load.',
  );
  await page.reload();
  await expect(status(page)).toHaveText('Analytics are on. You turned them on.');
  await expect(notice(page)).toBeHidden();
  await context.close();
});

test('dismissing the notice is not a choice', async () => {
  const { context, page } = await open(MOBILE);
  await page.goto(`${SITE}/`);
  await expect(notice(page)).toBeVisible();
  await shot(page, 'notice-home-mobile');
  await noticeAction(page, 'dismiss').click();
  await expect(notice(page)).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem('np-privacy'))).toBe(
    JSON.stringify({ v: 1, choice: 'unset', noticeDismissed: true }),
  );
  await page.goto(`${SITE}/blog/`);
  await expect(notice(page)).toBeHidden();
  await page.goto(`${SITE}/privacy/`);
  await expect(status(page)).toHaveText(
    'Analytics are on. You have not made a choice, so they run by default.',
  );
  await context.close();
});

test('with GPC active, the notice stays away and the controls say why re-enabling is unavailable', async () => {
  const { context, page } = await open(DESKTOP, [GPC_ON]);
  await page.goto(`${SITE}/blog/`);
  await expect(notice(page)).toBeHidden();
  await page.goto(`${SITE}/privacy/`);
  const controls = page.locator('#np-privacy-controls');
  await expect(controls).toHaveAttribute('data-np-privacy-gpc', '');
  await expect(status(page)).toHaveText(
    'Analytics are off because your browser sends Global Privacy Control.',
  );
  await expect(page.locator('[data-np-privacy-action="grant"]')).toBeDisabled();
  await expect(page.locator('[data-np-privacy-ui="gpc-explanation"]')).toBeVisible();
  await elementShot(page, '#np-privacy-controls', 'controls-gpc-desktop');
  await controlAction(page, 'deny').click();
  await expect(status(page)).toContainText(
    'they stay off if your browser stops sending the signal',
  );
  await context.close();
});

test('when the choice cannot be saved, the controls say it applies only to this page', async () => {
  const { context, page } = await open(DESKTOP, [STORAGE_WRITE_THROWS]);
  await page.goto(`${SITE}/privacy/`);
  // The notice never shows on the page that carries the controls.
  await expect(notice(page)).toBeHidden();
  await controlAction(page, 'deny').click();
  await expect(status(page)).toHaveText(
    'Analytics are off. You turned them off. Your browser did not save this choice, so it applies only to this page.',
  );
  expect(await page.evaluate(() => document.documentElement.getAttribute('data-np-privacy'))).toBe(
    'denied',
  );
  await context.close();
});

test('reduced motion leaves the notice and its buttons without transitions', async () => {
  const { context, page } = await open(DESKTOP, [], { reducedMotion: 'reduce' });
  await page.goto(`${SITE}/blog/`);
  await expect(notice(page)).toBeVisible();
  const durations = await page.evaluate(() =>
    ['#np-privacy-notice', '#np-privacy-notice .nav-button', '#np-privacy-notice a'].map((sel) => {
      const cs = getComputedStyle(document.querySelector(sel) as Element);
      return `${cs.transitionDuration}|${cs.animationDuration}`;
    }),
  );
  for (const d of durations) expect(d).toBe('0s|0s');
  await context.close();
});

test('reference screenshots: notice, controls, and /privacy/ (light; the site has no dark theme)', async () => {
  test.skip(!WRITE_SHOTS, 'set NP_PRIVACY_SCREENSHOTS=1 to write screenshots/privacy/');
  for (const [name, viewport] of [
    ['desktop', DESKTOP],
    ['mobile', MOBILE],
  ] as const) {
    const { context, page } = await open(viewport);
    await page.goto(`${SITE}/blog/`);
    await expect(notice(page)).toBeVisible();
    await shot(page, `notice-${name}`);
    await page.goto(`${SITE}/privacy/`);
    await expect(status(page)).toContainText('Analytics are on');
    await elementShot(page, '#np-privacy-controls', `controls-${name}`);
    await shot(page, `privacy-page-${name}`, { fullPage: true });
    await context.close();
  }
});

for (const viewport of [DESKTOP, NARROW]) {
  test(`axe at ${viewport.width}px: notice, controls, and /privacy/ are clean`, async () => {
    test.skip(!AXE || !existsSync(AXE), 'NP_AXE_CORE must point at axe-core/axe.min.js');
    const { context, page } = await open(viewport);
    await page.goto(`${SITE}/blog/`);
    await expect(notice(page)).toBeVisible();
    expect(await axeViolations(page, '#np-privacy-notice')).toEqual([]);
    await page.goto(`${SITE}/privacy/`);
    await expect(status(page)).toContainText('Analytics are on');
    expect(await axeViolations(page, '#np-privacy-controls')).toEqual([]);
    expect(await axeViolations(page)).toEqual([]);
    // The GPC rendering of the controls, with the disabled button and its explanation.
    await context.close();
    const gpc = await open(viewport, [GPC_ON]);
    await gpc.page.goto(`${SITE}/privacy/`);
    await expect(gpc.page.locator('#np-privacy-controls')).toHaveAttribute(
      'data-np-privacy-gpc',
      '',
    );
    expect(await axeViolations(gpc.page, '#np-privacy-controls')).toEqual([]);
    await gpc.context.close();
  });
}
