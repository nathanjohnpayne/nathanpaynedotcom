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
 *   - one breadcrumb color ramp on every page (#452): token-driven, never
 *     container-inherited, with parent links a step darker than the muted
 *     current segment and an underline hover affordance;
 *   - the footer column-stack at <=1023px.
 *
 * Every invariant is checked at all four target breakpoints (320/375/800/1440)
 * so mobile/tablet-only regressions are caught too (per #440).
 *
 * Run: `npm run test:e2e` (reuses a dev server on :4321 if one is running).
 * There are no baselines to update — the assertions are the contract.
 */

const RED = 'rgb(193, 29, 25)'; // var(--red) #c11d19
const BLACK_ACCENT = 'rgb(51, 51, 51)'; // matchline's per-project accent (#333)
// The single breadcrumb ramp (#452, AA-raised in #454) — the --breadcrumb-*
// tokens in :root. Current is the quietest AA-passing ink on the darkest
// breadcrumb background; links keep a visible step above it.
const CRUMB_LINK = 'rgba(17, 16, 13, 0.68)';
const CRUMB_LINK_HOVER = 'rgba(17, 16, 13, 0.85)';
const CRUMB_CURRENT = 'rgba(17, 16, 13, 0.6)';
const CRUMB_SEP = 'rgba(17, 16, 13, 0.35)';
// The shared ink drop shadow: var(--canvas-shadow) is 0.12; .project-detail
// reduces it to 0.1 at <=1023. Accept both alphas, reject any other.
const CANVAS_SHADOW = /rgba\(17, 16, 13, 0\.12?\)/;
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

for (const width of BREAKPOINTS) {
  test.describe(`@${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });

    test.describe('shared footer — a single hover affordance (#428/#434)', () => {
      test('white footer hovers red even when the page accent is not red', async ({ page }) => {
        await page.goto('/blog/'); // page accent is blue
        await page.waitForLoadState('domcontentloaded');
        expect(await hoverBackground(page, '.site-footer .nav-button')).toBe(RED);
      });

      test('project-detail footer hovers its per-project accent, not red', async ({ page }) => {
        await page.goto('/projects/matchline/'); // accent is black (#333)
        await page.waitForLoadState('domcontentloaded');
        expect(await hoverBackground(page, '.site-footer .nav-button')).toBe(BLACK_ACCENT);
      });
    });

    test.describe('shared page canvas — centered with the shared shadow (#428/#435)', () => {
      for (const path of CANVAS_PAGES) {
        test(`${path} canvas is centered and carries the drop shadow`, async ({ page }) => {
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
          // The shared ink drop shadow is present (full 0.12 or the <=1023 0.1).
          expect(result!.shadow).toMatch(CANVAS_SHADOW);
        });
      }
    });

    test.describe('shared breadcrumbs — one impl, current item flagged (#436), one color ramp (#452)', () => {
      for (const path of CANVAS_PAGES) {
        test(`${path} has one .breadcrumbs with an aria-current current item and the shared ramp`, async ({ page }) => {
          await page.goto(path);
          await page.waitForLoadState('domcontentloaded');
          const result = await page.evaluate(() => {
            const color = (sel: string) => {
              const el = document.querySelector(sel);
              return el ? getComputedStyle(el).color : null;
            };
            return {
              count: document.querySelectorAll('.breadcrumbs').length,
              hasCurrent: !!document.querySelector(
                '.breadcrumbs .breadcrumb-current[aria-current="page"]',
              ),
              link: color('.breadcrumbs a'),
              current: color('.breadcrumbs .breadcrumb-current'),
              sep: color('.breadcrumbs .breadcrumb-sep'),
            };
          });
          expect(result.count).toBe(1);
          expect(result.hasCurrent).toBe(true);
          // The ramp is the same on every page — token values, not the
          // container's inherited color (#452). Parent links sit a step
          // darker than the current segment so the hierarchy reads.
          expect(result.link).toBe(CRUMB_LINK);
          expect(result.current).toBe(CRUMB_CURRENT);
          expect(result.sep).toBe(CRUMB_SEP);
        });
      }

      test('parent links carry the hover affordance (underline + darker step)', async ({ page }) => {
        await page.goto('/blog/');
        await page.waitForLoadState('domcontentloaded');
        await page.addStyleTag({
          content: '*, *::before, *::after { transition: none !important; }',
        });
        await page.hover('.breadcrumbs a');
        const hovered = await page.evaluate(() => {
          const el = document.querySelector('.breadcrumbs a') as Element;
          const style = getComputedStyle(el);
          return { color: style.color, decoration: style.textDecorationLine };
        });
        expect(hovered.color).toBe(CRUMB_LINK_HOVER);
        expect(hovered.decoration).toContain('underline');
      });
    });

    test('footer is a centered column at <=1023px, a row above (#434)', async ({ page }) => {
      await page.goto('/blog/six-prs-one-bug-agent-failure-modes/');
      await page.waitForLoadState('domcontentloaded');
      const direction = await page.evaluate(
        () => getComputedStyle(document.querySelector('.site-footer') as Element).flexDirection,
      );
      expect(direction).toBe(width <= 1023 ? 'column' : 'row');
    });
  });
}
