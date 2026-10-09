/**
 * The notice and the controls (specs/analytics-privacy.md § UI Hooks; PRIV-6,
 * PRIV-10 UI, PRIV-14). Written from the contract's hook table only: element
 * ids, `data-np-privacy-ui` and `data-np-privacy-action` attributes, and the
 * `window.npPrivacy` API. Nothing here depends on copy.
 *
 * These tests need the #1229 UI in the build under test. When it is absent
 * they skip with a "not verified" reason, because failing would block the
 * unrelated PRs that merge before #1229 does. Set NP_PRIVACY_REQUIRE_UI=1 to
 * turn that skip into a failure; #1233 (the flag flip) must run with it set.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { Page } from '@playwright/test';
import { DIST_DIR, FIXTURE_PATH } from './harness/constants';
import {
  expectCollecting,
  expectCollectionContinues,
  expectNoAnalytics,
  gateReady,
  storageWith,
} from './harness/helpers';
import { expect, test } from './harness/test';

function distContains(needle: string): boolean {
  const walk = (dir: string): boolean => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        if (name === 'og' || name === 'images' || name === 'fonts') continue;
        if (walk(full)) return true;
      } else if (/\.(html|js|mjs)$/.test(name) && readFileSync(full, 'utf8').includes(needle))
        return true;
    }
    return false;
  };
  return walk(DIST_DIR);
}

const noticeBuilt = distContains('np-privacy-notice');
const controlsBuilt =
  existsSync(join(DIST_DIR, 'privacy', 'index.html')) && distContains('np-privacy-controls');
const requireUi = process.env.NP_PRIVACY_REQUIRE_UI === '1';

function needs(built: boolean, what: string): void {
  if (built) return;
  const reason = `not verified: ${what} is not in this build (sub-issue #1229)`;
  if (requireUi) throw new Error(`NP_PRIVACY_REQUIRE_UI=1 but ${reason}`);
  test.skip(true, reason);
}

const NOTICE = '[data-np-privacy-ui="notice"]';
const CONTROLS = '[data-np-privacy-ui="controls"]';
const action = (name: string): string => `[data-np-privacy-action="${name}"]`;

/** Tab until `selector` has focus, counting presses. Fails if it is never reached. */
async function tabTo(page: Page, selector: string, limit = 60): Promise<number> {
  for (let presses = 1; presses <= limit; presses += 1) {
    await page.keyboard.press('Tab');
    if (await page.evaluate((sel) => document.activeElement?.matches(sel) ?? false, selector))
      return presses;
  }
  throw new Error(`${selector} was not reached by keyboard within ${limit} Tab presses`);
}

/**
 * The focused element, reached by keyboard, must look different from the same element unfocused, and the
 * difference must be a painted (non-transparent) outline or shadow. Reading only "is there a shadow" passes a
 * permanent or transparent one, and so misses a lost `:focus-visible` treatment.
 */
async function expectFocusIndicator(page: Page, selector: string, label: string): Promise<void> {
  await tabTo(page, selector, 200);
  const paint = (): Promise<string> =>
    page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return 'missing';
      const style = getComputedStyle(el);
      const opaque = (color: string): boolean => {
        const m = /rgba?\(([^)]+)\)/.exec(color);
        if (!m) return color !== 'transparent' && color !== '';
        const parts = m[1]!.split(/[ ,/]+/).filter(Boolean);
        return parts.length < 4 || parseFloat(parts[3]!) > 0;
      };
      const outline =
        style.outlineStyle !== 'none' &&
        parseFloat(style.outlineWidth) > 0 &&
        opaque(style.outlineColor)
          ? `${style.outlineStyle} ${style.outlineWidth} ${style.outlineColor} ${style.outlineOffset}`
          : '';
      const shadowColor = /rgba?\([^)]*\)/.exec(style.boxShadow)?.[0] ?? '';
      const shadow = style.boxShadow !== 'none' && opaque(shadowColor) ? style.boxShadow : '';
      return `${outline}|${shadow}`;
    }, selector);
  const focused = await paint();
  await page.evaluate(
    (sel) => (document.querySelector(sel) as HTMLElement | null)?.blur(),
    selector,
  );
  const unfocused = await paint();
  expect(focused, `${label}: focusing paints an outline or shadow`).not.toBe('|');
  expect(focused, `${label}: the focused look differs from the unfocused look`).not.toBe(unfocused);
  // Restore focus so the caller can keep driving the control from the keyboard.
  await page.evaluate(
    (sel) => (document.querySelector(sel) as HTMLElement | null)?.focus(),
    selector,
  );
}

interface AxeViolation {
  id: string;
  impact: string | null;
  targets: string[];
}

/** Run axe-core (fetched and integrity-checked by the harness) over `include`, or the whole document. */
async function runAxe(page: Page, axePath: string, include?: string[]): Promise<AxeViolation[]> {
  await page.addScriptTag({ path: axePath });
  return page.evaluate(async (scope) => {
    const axe = (
      window as unknown as {
        axe: {
          run(
            ctx: unknown,
            opts: object,
          ): Promise<{
            violations: Array<{
              id: string;
              impact: string | null;
              nodes: Array<{ target: unknown[] }>;
            }>;
          }>;
        };
      }
    ).axe;
    const context = scope ? { include: scope.map((s) => [s]) } : document;
    const result = await axe.run(context, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'],
      },
    });
    return result.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      targets: v.nodes.map((n) => n.target.join(' ')),
    }));
  }, include);
}

test.describe('notice', () => {
  test.beforeEach(() => needs(noticeBuilt, 'the privacy notice'));

  test('PRIV-14 PRIV-6 a fresh visitor sees a labelled, non-modal notice with deny, dismiss, and a link to /privacy/', async ({
    open,
  }) => {
    const s = await open();
    await s.goto(FIXTURE_PATH);
    await gateReady(s.page);
    const notice = s.page.locator(NOTICE);
    await expect(notice).toBeVisible();
    await expect(notice).toHaveAttribute('id', 'np-privacy-notice');
    expect(await notice.evaluate((el) => el.tagName)).toBe('ASIDE');
    // Labelled: the landmark has an accessible name.
    await expect(
      s.page
        .getByRole('complementary', { name: /.+/ })
        .filter({ has: s.page.locator(action('deny')) }),
    ).toHaveCount(1);
    // Non-modal.
    await expect(notice).not.toHaveAttribute('aria-modal', 'true');
    expect(
      await notice.evaluate((el) => el.closest('[role="dialog"], [role="alertdialog"], dialog')),
    ).toBeNull();
    // Both buttons and the link are named controls.
    for (const name of ['deny', 'dismiss']) {
      const button = notice.locator(action(name));
      await expect(button).toBeVisible();
      expect(
        ((await button.getAttribute('aria-label')) ?? (await button.innerText())).trim().length,
      ).toBeGreaterThan(0);
    }
    await expect(notice.locator('a[href="/privacy/"]')).toBeVisible();
  });

  test('PRIV-14 the notice never covers content or blocks interaction, at desktop and 320 px', async ({
    open,
  }) => {
    for (const viewport of [
      { width: 1280, height: 900 },
      { width: 320, height: 568 },
    ]) {
      const s = await open({ viewport });
      await s.goto(FIXTURE_PATH);
      await gateReady(s.page);
      await expect(s.page.locator(NOTICE)).toBeVisible();
      // Content stays reachable: at the top and at the bottom of the page, no interactive element in view
      // sits under the notice (a fixed bottom overlay is the usual way this fails, and only at the bottom).
      for (const edge of ['top', 'bottom'] as const) {
        const covered = await s.page.evaluate(
          ({ sel, where }) => {
            const notice = document.querySelector(sel);
            if (!notice) return ['notice missing'];
            window.scrollTo(0, where === 'top' ? 0 : document.documentElement.scrollHeight);
            const n = notice.getBoundingClientRect();
            const hits: string[] = [];
            for (const el of document.querySelectorAll<HTMLElement>(
              'a[href], button, input, textarea, select, summary, [tabindex]:not([tabindex="-1"])',
            )) {
              if (notice.contains(el)) continue;
              const r = el.getBoundingClientRect();
              if (r.width === 0 || r.height === 0) continue;
              if (r.bottom < 0 || r.top > window.innerHeight) continue; // not in view at this scroll position
              const overlaps =
                r.left < n.right && r.right > n.left && r.top < n.bottom && r.bottom > n.top;
              if (overlaps) hits.push(el.id || el.tagName.toLowerCase());
            }
            return hits;
          },
          { sel: NOTICE, where: edge },
        );
        expect(
          covered,
          `${viewport.width}px, scrolled to the ${edge}: nothing in view is under the notice`,
        ).toEqual([]);
      }
      // And the page responds while the notice is up.
      await s.page.click('#fixture-pii-button');
      await expect(s.page.locator(NOTICE)).toBeVisible();
      const box = await s.page.locator(NOTICE).boundingBox();
      expect(
        box && box.x >= 0 && box.x + box.width <= viewport.width + 1,
        'notice fits the viewport width',
      ).toBe(true);
      expect(
        await s.page.evaluate(() => document.documentElement.scrollWidth),
        'no horizontal scroll',
      ).toBeLessThanOrEqual(viewport.width);
    }
  });

  test('PRIV-14 dismissing is not a choice: the notice goes away, the choice stays unset, collection continues in the same page view, and it stays gone on reload', async ({
    open,
    fixtureState,
  }) => {
    const s = await open();
    await s.goto(FIXTURE_PATH);
    await expectCollecting(s, { ga4: fixtureState.gtag.available });
    await s.page.locator(NOTICE).locator(action('dismiss')).click();
    await expect(s.page.locator(NOTICE)).toBeHidden();
    expect(await s.privacy()).toMatchObject({ saved: 'unset', effective: 'granted' });
    await expectCollectionContinues(s, { ga4: fixtureState.gtag.available });
    const mark = s.sink.mark();
    // A fresh load of the fixture, not `reload()`: the continuation helper may have unloaded this page to flush
    // an unload-only GA4 hit, which would leave a reload on about:blank.
    await s.goto(FIXTURE_PATH);
    await expect(s.page.locator(NOTICE)).toBeHidden();
    await expectCollecting(s, { ga4: false, mark });
  });

  test('PRIV-14 opting out from the notice is one action and stops collection; no choice is made by dismissing', async ({
    open,
  }) => {
    const s = await open();
    await s.goto(FIXTURE_PATH);
    await expectCollecting(s, { ga4: false });
    await s.page.locator(NOTICE).locator(action('deny')).click(); // one click
    const cutoff = Date.now() + 1000; // a request already in flight at the click may still complete
    expect(await s.privacy()).toMatchObject({
      saved: 'denied',
      effective: 'denied',
      reason: 'choice',
    });
    await expect(s.page.locator(NOTICE)).toBeHidden();
    // Collection really stopped, not just the saved value: activity past the grace sends nothing.
    await s.page.fill('#fixture-text', 'after deny');
    await s.page.mouse.move(200, 200);
    await s.page.waitForTimeout(6000);
    expect(
      s.sink.requests.filter(
        (r) => r.at > cutoff && (r.vendor === 'posthog' || r.vendor === 'ga4'),
      ),
    ).toEqual([]);
  });

  test('PRIV-6 the notice works by keyboard alone, with a visible focus indicator', async ({
    open,
  }) => {
    const s = await open();
    await s.goto(FIXTURE_PATH);
    await gateReady(s.page);
    await expectFocusIndicator(s.page, `${NOTICE} ${action('deny')}`, 'notice deny button');
    await expectFocusIndicator(s.page, `${NOTICE} ${action('dismiss')}`, 'notice dismiss button');
    await s.page.keyboard.press('Enter'); // dismiss still has focus
    await expect(s.page.locator(NOTICE)).toBeHidden();
    expect(await s.privacy()).toMatchObject({ saved: 'unset', effective: 'granted' });
    // Focus is not trapped: the page's own controls are still reachable afterwards.
    await tabTo(s.page, '#fixture-text');
  });

  test('PRIV-6 deny works with Space, and the notice does not trap focus while it is open', async ({
    open,
  }) => {
    const s = await open();
    await s.goto(FIXTURE_PATH);
    await gateReady(s.page);
    // While the notice is open, the page's own controls are still reachable by Tab (no focus trap).
    await tabTo(s.page, '#fixture-text', 120);
    await tabTo(s.page, `${NOTICE} ${action('deny')}`, 200);
    await s.page.keyboard.press('Space');
    expect(await s.privacy()).toMatchObject({ saved: 'denied', effective: 'denied' });
  });

  test('PRIV-6 reduced motion: nothing in the notice animates or transitions when the visitor asks for none', async ({
    open,
  }) => {
    const s = await open({ reducedMotion: 'reduce' });
    // Record every animation and transition that STARTS inside the notice from the first script onward, so
    // motion shorter than any sleep cannot finish unseen.
    await s.context.addInitScript((sel: string) => {
      const started: string[] = [];
      (window as unknown as { __npMotion: string[] }).__npMotion = started;
      for (const type of ['animationstart', 'transitionrun', 'transitionstart']) {
        window.addEventListener(
          type,
          (e) => {
            const target = e.target;
            if (target instanceof Element && target.closest(sel))
              started.push(`${type} ${target.tagName}`);
          },
          true,
        );
      }
    }, NOTICE);
    await s.goto(FIXTURE_PATH);
    await gateReady(s.page);
    await expect(s.page.locator(NOTICE)).toBeVisible();
    await s.page.locator(NOTICE).locator(action('dismiss')).click(); // the state change that could animate it away
    await expect(s.page.locator(NOTICE)).toBeHidden();
    expect(
      await s.page.evaluate(() => (window as unknown as { __npMotion: string[] }).__npMotion),
      'no animation or transition started in the notice',
    ).toEqual([]);
    // And the styles themselves declare none: every duration in the notice subtree is zero.
    const s2 = await open({ reducedMotion: 'reduce' });
    await s2.goto(FIXTURE_PATH);
    await gateReady(s2.page);
    const durations = await s2.page.evaluate((sel) => {
      const toMs = (v: string): number[] =>
        v.split(',').map((x) => (x.trim().endsWith('ms') ? parseFloat(x) : parseFloat(x) * 1000));
      const found: string[] = [];
      for (const el of [document.querySelector(sel), ...document.querySelectorAll(`${sel} *`)]) {
        if (!el) continue;
        const style = getComputedStyle(el);
        const longest = Math.max(
          ...toMs(style.transitionDuration),
          ...toMs(style.animationDuration),
        );
        if (longest > 0) found.push(`${el.tagName} ${longest}ms`);
      }
      return found;
    }, NOTICE);
    expect(durations, 'no declared transition or animation duration under reduced motion').toEqual(
      [],
    );
  });

  test('PRIV-6 PRIV-14 the notice is absent when a choice exists, and when GPC is active', async ({
    open,
  }) => {
    const denied = await open({ storageState: storageWith('denied') });
    await denied.goto(FIXTURE_PATH);
    await gateReady(denied.page);
    await expect(denied.page.locator(NOTICE)).toBeHidden();
    const gpc = await open({ gpc: true });
    await gpc.goto(FIXTURE_PATH);
    await gateReady(gpc.page);
    await expect(gpc.page.locator(NOTICE)).toBeHidden();
  });

  test('PRIV-6 axe finds no violations in the notice, at desktop and 320 px', async ({
    open,
    fixtureState,
  }) => {
    for (const viewport of [
      { width: 1280, height: 900 },
      { width: 320, height: 568 },
    ]) {
      const s = await open({ viewport });
      await s.goto(FIXTURE_PATH);
      await gateReady(s.page);
      await expect(s.page.locator(NOTICE)).toBeVisible();
      // Scoped to the notice: the fixture page around it is not part of this criterion.
      expect(
        await runAxe(s.page, fixtureState.axePath, [NOTICE]),
        `axe on the notice at ${viewport.width}px`,
      ).toEqual([]);
    }
  });
});

test.describe('footer link', () => {
  test.beforeEach(() => needs(noticeBuilt, 'the footer link'));

  for (const path of ['/', '/blog/', '/projects/', '/resume/', FIXTURE_PATH, '/404.html']) {
    test(`PRIV-6 ${path} has the footer link to /privacy/, reachable by keyboard`, async ({
      open,
    }) => {
      const s = await open();
      await s.goto(path);
      const link = s.page.locator('a[data-np-privacy-ui="footer-link"]');
      await expect(link).toHaveCount(1);
      await expect(link).toHaveAttribute('href', '/privacy/');
      expect((await link.innerText()).trim().length).toBeGreaterThan(0);
      await link.scrollIntoViewIfNeeded();
      await expectFocusIndicator(
        s.page,
        'a[data-np-privacy-ui="footer-link"]',
        `footer link on ${path}`,
      );
    });
  }
});

test.describe('controls on /privacy/', () => {
  test.beforeEach(() => needs(controlsBuilt, 'the /privacy/ page and its controls'));

  test('PRIV-6 PRIV-14 the controls expose a polite live status and deny and grant, each one action, and the status announces the change', async ({
    open,
  }) => {
    const s = await open();
    await s.goto('/privacy/');
    await gateReady(s.page);
    const controls = s.page.locator(CONTROLS);
    await expect(controls).toHaveAttribute('id', 'np-privacy-controls');
    const status = controls.locator('[data-np-privacy-ui="status"]');
    await expect(status).toHaveAttribute('aria-live', 'polite');
    const before = (await status.innerText()).trim();
    expect(before.length, 'status states the current setting').toBeGreaterThan(0);
    for (const name of ['deny', 'grant']) {
      const button = controls.locator(action(name));
      await expect(button).toBeVisible();
      expect(
        ((await button.getAttribute('aria-label')) ?? (await button.innerText())).trim().length,
      ).toBeGreaterThan(0);
    }
    // Opting out takes one action, and the live region reports it.
    await controls.locator(action('deny')).click();
    expect(await s.privacy()).toMatchObject({ saved: 'denied', effective: 'denied' });
    await expect
      .poll(async () => (await status.innerText()).trim(), { message: 'status text changed' })
      .not.toBe(before);
    const denied = (await status.innerText()).trim();
    // Re-enabling is also one action, is saved, and changes the status again.
    await controls.locator(action('grant')).click();
    expect(await s.privacy()).toMatchObject({ saved: 'granted' });
    await expect
      .poll(async () => (await status.innerText()).trim(), { message: 'status text changed again' })
      .not.toBe(denied);
  });

  test('PRIV-10 PRIV-6 with GPC active the controls show it, grant is unavailable, and the explanation is present', async ({
    open,
  }) => {
    const s = await open({ gpc: true, storageState: storageWith('granted') });
    await s.goto('/privacy/');
    await gateReady(s.page);
    const controls = s.page.locator(CONTROLS);
    await expect(controls).toHaveAttribute('data-np-privacy-gpc', /.*/);
    const grant = controls.locator(action('grant'));
    const unavailable = await grant.evaluate(
      (el) => (el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true',
    );
    expect(unavailable, 'the grant button is disabled').toBe(true);
    const explanation = controls.locator('[data-np-privacy-ui="gpc-explanation"]');
    await expect(explanation).toBeVisible();
    // Not exact copy (that belongs to #1229), but the contract's meaning: the explanation names the signal
    // the browser sends, and it is not the same text as the ordinary status.
    const explanationText = (await explanation.innerText()).trim();
    expect(explanationText, 'the explanation names GPC').toMatch(/gpc|global privacy control/i);
    expect(explanationText).not.toBe(
      (await controls.locator('[data-np-privacy-ui="status"]').innerText()).trim(),
    );
    expect(await s.page.evaluate(() => window.npPrivacy?.set('granted'))).toBe(false);
    // Without GPC the attribute is absent and grant is available (control).
    const plain = await open();
    await plain.goto('/privacy/');
    await gateReady(plain.page);
    await expect(plain.page.locator(CONTROLS)).not.toHaveAttribute('data-np-privacy-gpc', /.*/);
    await expect(plain.page.locator(CONTROLS).locator(action('grant'))).toBeEnabled();
  });

  test('PRIV-3 PRIV-6 when storage is blocked the controls report the choice differently from a saved one', async ({
    open,
  }) => {
    // The contract: a failed write still applies for this page view, and the controls tell the visitor plainly
    // that it could not be saved and applies only to this page. Exact wording is #1229's; the behavior is that
    // the announcement for an unsaved choice is not the one for a saved choice.
    const statusAfterDeny = async (blockStorage: boolean): Promise<string> => {
      const s = await open({ blockStorage });
      await s.goto('/privacy/');
      await gateReady(s.page);
      const status = s.page.locator(CONTROLS).locator('[data-np-privacy-ui="status"]');
      await s.page.locator(CONTROLS).locator(action('deny')).click();
      expect(await s.privacy()).toMatchObject({
        effective: 'denied',
        persisted: !blockStorage,
      });
      await expect.poll(async () => (await status.innerText()).trim()).not.toBe('');
      return (await status.innerText()).trim();
    };
    const saved = await statusAfterDeny(false);
    const unsaved = await statusAfterDeny(true);
    expect(unsaved, 'the unsaved-choice announcement differs from the saved-choice one').not.toBe(
      saved,
    );
  });

  test('PRIV-6 the controls work by keyboard alone', async ({ open }) => {
    const s = await open();
    await s.goto('/privacy/');
    await gateReady(s.page);
    await expectFocusIndicator(s.page, `${CONTROLS} ${action('deny')}`, 'controls deny button');
    await s.page.keyboard.press('Enter');
    expect(await s.privacy()).toMatchObject({ saved: 'denied', effective: 'denied' });
    await expectFocusIndicator(s.page, `${CONTROLS} ${action('grant')}`, 'controls grant button');
    await s.page.keyboard.press('Space');
    expect(await s.privacy()).toMatchObject({ saved: 'granted' });
  });

  test('PRIV-6 /privacy/ has no horizontal scroll at 320 px and axe finds no violations in the controls, the notice, and the footer link', async ({
    open,
    fixtureState,
  }) => {
    for (const storageState of [undefined, storageWith('denied')]) {
      const s = await open({ viewport: { width: 320, height: 568 }, storageState });
      await s.goto('/privacy/');
      await gateReady(s.page);
      expect(await s.page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        320,
      );
      const scope = [CONTROLS, 'a[data-np-privacy-ui="footer-link"]'];
      if (storageState === undefined) scope.push(NOTICE);
      expect(await runAxe(s.page, fixtureState.axePath, scope), 'axe on the privacy UI').toEqual(
        [],
      );
      // The rest of the page is reported, not gated: it is site chrome rather than this criterion's subject.
      const rest = await runAxe(s.page, fixtureState.axePath);
      test.info().annotations.push({
        type: 'axe-whole-page',
        description: rest.length
          ? rest.map((v) => `${v.id} (${v.targets.length})`).join(', ')
          : 'clean',
      });
    }
  });

  test('PRIV-10 PRIV-5 using the controls to opt out stops collection on the next page', async ({
    open,
  }) => {
    const first = await open();
    await first.goto('/privacy/');
    await gateReady(first.page);
    await first.page.locator(CONTROLS).locator(action('deny')).click();
    const storage = await first.context.storageState();
    const later = await open({ storageState: storage });
    const mark = later.sink.mark();
    await later.goto(FIXTURE_PATH);
    await expectNoAnalytics(later, mark, 6000);
  });
});
