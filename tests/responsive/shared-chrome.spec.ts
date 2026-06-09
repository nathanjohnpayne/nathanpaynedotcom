import { test, expect, type Page } from '@playwright/test';

/**
 * Visual-regression guardrails for the #429 shared-chrome refactor (#440).
 *
 * Assertion-based, matching this repo's Playwright convention (no pixel
 * baselines — those are environment-fragile and CI doesn't run e2e). These
 * lock the invariants the refactor unified so the #428 class of drift
 * (footer hover-color, canvas centering/shadow) is caught:
 *
 *   - one footer hover affordance: white footers go red regardless of page
 *     accent; only the color-themed project-detail footer keeps its accent;
 *   - one page-canvas: centered (equal gutters) with the shared drop shadow;
 *   - one breadcrumbs impl with an aria-current current item;
 *   - the footer column-stack at <=1023px.
 *
 * Run: `npm run test:e2e` (reuses a dev server on :4321 if one is running).
 * There are no baselines to update — assertions are the contract.
 */

const RED = 'rgb(193, 29, 25)'; // var(--red) #c11d19
const BREAKPOINTS = [320, 375, 800, 1440];

const CANVAS_PAGES = [
  '/blog/',
  '/projects/',
  '/projects/matchline/',
  '/resume/',
  '/blog/six-prs-one-bug-agent-failure-modes/',
  '/404',
];

async function hoverBackground(page: Page, selector: string): Promise<string> {
  // Disable transitions so the :hover background is its final value (not a
  // mid-tween of the --motion-hover transition) at read time.
  await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; }' });
  await page.hover(selector);
  return page.evaluate(
    (sel) => getComputedStyle(document.querySelector(sel) as Element).backgroundColor,
    selector,
  );
}

test.describe('shared footer — a single hover affordance (#428/#434)', () => {
  test('white footer hovers red even when the page accent is not red', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/blog/'); // page accent is blue
    await page.waitForLoadState('domcontentloaded');
    expect(await hoverBackground(page, '.site-footer .nav-button')).toBe(RED);
  });

  test('project-detail footer hovers its per-project accent, not red', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/projects/matchline/'); // accent is black (#333)
    await page.waitForLoadState('domcontentloaded');
    expect(await hoverBackground(page, '.site-footer .nav-button')).toBe('rgb(51, 51, 51)');
  });
});

test.describe('shared page canvas — centered with the shared shadow (#428/#435)', () => {
  for (const path of CANVAS_PAGES) {
    test(`${path} canvas is centered and carries the drop shadow`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(path);
      await page.waitForLoadState('domcontentloaded');
      const result = await page.evaluate(() => {
        const el = document.querySelector('.page-canvas');
        if (!el) return null;
        const shell =
          el.closest('.page-shell, .shell, .resume-shell, .error-shell') ?? el.parentElement!;
        const eb = el.getBoundingClientRect();
        const sb = shell.getBoundingClientRect();
        return {
          leftGap: Math.round(eb.left - sb.left),
          rightGap: Math.round(sb.right - eb.right),
          shadow: getComputedStyle(el).boxShadow,
        };
      });
      expect(result, `.page-canvas missing on ${path}`).not.toBeNull();
      // Centered: symmetric gutters (allow 2px for sub-pixel rounding).
      expect(Math.abs(result!.leftGap - result!.rightGap)).toBeLessThanOrEqual(2);
      // The shared --canvas-shadow.
      expect(result!.shadow).toContain('rgba(17, 16, 13, 0.12)');
    });
  }
});

test.describe('shared breadcrumbs — one impl, current item flagged (#436)', () => {
  for (const path of CANVAS_PAGES) {
    test(`${path} has one .breadcrumbs with an aria-current current item`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('domcontentloaded');
      const result = await page.evaluate(() => ({
        count: document.querySelectorAll('.breadcrumbs').length,
        hasCurrent: !!document.querySelector(
          '.breadcrumbs .breadcrumb-current[aria-current="page"]',
        ),
      }));
      expect(result.count).toBe(1);
      expect(result.hasCurrent).toBe(true);
    });
  }
});

test.describe('footer responsive column-stack at <=1023px (#434)', () => {
  for (const width of BREAKPOINTS) {
    test(`footer is ${width <= 1023 ? 'a centered column' : 'a row'} at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/blog/six-prs-one-bug-agent-failure-modes/');
      await page.waitForLoadState('domcontentloaded');
      const direction = await page.evaluate(
        () => getComputedStyle(document.querySelector('.site-footer') as Element).flexDirection,
      );
      expect(direction).toBe(width <= 1023 ? 'column' : 'row');
    });
  }
});
