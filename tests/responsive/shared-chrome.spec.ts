import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, expect, type Page } from '@playwright/test';
import { blogSlugFromPath, findBlogMarkdownFiles } from '../../scripts/lib/blog-file-inventory.mjs';
import { splitEntry } from '../../src/lib/ai-use-stamp.mjs';
import { contrastRatio, parseComputedColor, type ParsedColor } from '../helpers/contrast';

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
 *   - one page-canvas: centered (equal gutters) with the shared drop shadow,
 *     and edge to edge with no shadow in the phone stack (<=1023px, #1479);
 *   - one breadcrumbs impl with an aria-current current item;
 *   - one breadcrumb color ramp on every page (#452): token-driven, never
 *     container-inherited, with parent links a step darker than the muted
 *     current segment and an underline hover affordance;
 *   - the footer column-stack at <=1023px.
 *
 * Every invariant is checked at all four target breakpoints (320/375/800/1440)
 * so mobile/tablet-only regressions are caught too (per #440).
 *
 * Run: `npm run test:e2e`. Playwright builds and serves the site itself and
 * will not adopt a server it did not start (#875); if :4321 is busy, run on
 * another port with `E2E_PORT=4400 npm run test:e2e`.
 * There are no baselines to update — the assertions are the contract.
 */

const RED = 'rgb(232, 120, 74)'; // var(--red) #e8784a on interior pages
const BLACK_ACCENT = 'rgb(51, 51, 51)'; // matchline's per-project accent (#333)
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

function extractComputedColor(value: string): string | null {
  return value.match(/color\(srgb\s+[^)]+\)|rgba?\([^)]+\)/)?.[0] ?? null;
}

function expectInkColor(value: string | null, alpha: number): void {
  expect(value).not.toBeNull();
  const color = parseComputedColor(value!);
  expect(color, `Unable to parse computed color: ${value}`).not.toBeNull();
  expect(color!.r).toBe(17);
  expect(color!.g).toBe(16);
  expect(color!.b).toBe(13);
  expect(color!.a).toBeCloseTo(alpha, 3);
}

function expectInkShadow(value: string): void {
  const colorToken = extractComputedColor(value);
  expect(colorToken, `Unable to extract computed shadow color: ${value}`).not.toBeNull();
  const color = parseComputedColor(colorToken!);
  expect(color, `Unable to parse computed shadow color: ${colorToken}`).not.toBeNull();
  expect(color!.r).toBe(17);
  expect(color!.g).toBe(16);
  expect(color!.b).toBe(13);
  expect([0.1, 0.12].some((alpha) => Math.abs(color!.a - alpha) < 0.001)).toBe(true);
}

function compositeColor(foreground: ParsedColor, background: ParsedColor): ParsedColor {
  const alpha = foreground.a + background.a * (1 - foreground.a);
  const channel = (foregroundValue: number, backgroundValue: number) =>
    (foregroundValue * foreground.a + backgroundValue * background.a * (1 - foreground.a)) / alpha;

  return {
    r: channel(foreground.r, background.r),
    g: channel(foreground.g, background.g),
    b: channel(foreground.b, background.b),
    a: alpha,
  };
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

    // Below --bp-stack the canvas runs edge to edge like the homepage stack:
    // no gutter and no shadow (#1479). At desktop it keeps the shared shadow.
    const stacked = width <= 1023;

    test.describe('shared page canvas — centered with the shared shadow (#428/#435), edge-to-edge in the stack (#1479)', () => {
      for (const path of CANVAS_PAGES) {
        test(`${path} canvas is centered and ${stacked ? 'edge-to-edge with no shadow' : 'carries the drop shadow'}`, async ({
          page,
        }) => {
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
          if (stacked) {
            // Edge to edge: the canvas fills its shell and drops the shadow.
            expect(Math.abs(result!.leftGap)).toBeLessThanOrEqual(1);
            expect(Math.abs(result!.rightGap)).toBeLessThanOrEqual(1);
            expect(result!.shadow).toBe('none');
          } else {
            // The shared ink drop shadow is present. Compare color values,
            // not computed-style serialization: color-mix() may produce CSS
            // Color 4 `color(srgb ...)` strings in Chromium.
            expectInkShadow(result!.shadow);
          }
        });
      }
    });

    test.describe('shared breadcrumbs — one impl, current item flagged (#436), one color ramp (#452)', () => {
      for (const path of CANVAS_PAGES) {
        test(`${path} has one .breadcrumbs with an aria-current current item and the shared ramp`, async ({
          page,
        }) => {
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
          expectInkColor(result.link, 0.68);
          expectInkColor(result.current, 0.6);
          expectInkColor(result.sep, 0.35);
        });

        for (const textScale of ['100%', '200%']) {
          test(`${path} keeps its breadcrumb trail on one line at ${textScale} text`, async ({
            page,
          }) => {
            await page.goto(path);
            await page.waitForLoadState('domcontentloaded');
            await page.evaluate((scale) => {
              document.documentElement.style.fontSize = scale;
            }, textScale);
            await page.evaluate(() => document.fonts.ready);
            const trail = await page.evaluate(() => {
              const nav = document.querySelector('.breadcrumbs') as HTMLElement;
              const navBox = nav.getBoundingClientRect();
              const parentBox = (nav.parentElement as HTMLElement).getBoundingClientRect();
              const children = [...nav.children].map((el) => el.getBoundingClientRect());
              return {
                tops: children.map((box) => Math.round(box.top)),
                navOverflow: navBox.right - parentBox.right,
                childOverflow: Math.max(...children.map((box) => box.right)) - navBox.right,
                scrolls:
                  nav.scrollWidth > nav.clientWidth &&
                  ['auto', 'scroll'].includes(getComputedStyle(nav).overflowX),
                // Room inside the scrollport around each link for its focus
                // ring (2px outline + 2px offset), which the scrollport clips.
                focusRoom: Math.min(
                  ...[...nav.querySelectorAll('a')].flatMap((link) => {
                    const box = link.getBoundingClientRect();
                    return [
                      box.left - navBox.left,
                      box.top - navBox.top,
                      navBox.bottom - box.bottom,
                    ];
                  }),
                ),
              };
            });
            // Parent links never wrap ("Nathan / Payne"); only the current
            // segment gives up width, by truncating.
            expect(new Set(trail.tops).size).toBe(1);
            expect(trail.navOverflow).toBeLessThanOrEqual(1);
            // A link past the trail's edge must still be reachable, by
            // scrolling the trail, rather than clipped by an ancestor.
            if (trail.childOverflow > 1) expect(trail.scrolls).toBe(true);
            expect(trail.focusRoom).toBeGreaterThanOrEqual(3.5);
          });
        }
      }

      test('parent links carry the hover affordance (underline + darker step)', async ({
        page,
      }) => {
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
        expectInkColor(hovered.color, 0.85);
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

    if (width <= 1023) {
      // Every post carries `aiUse` (#1498), so its phone kicker ends in the
      // AI-use link, and that line once closed the kicker without .post-meta's
      // bottom margin, so the title sat 8px closer to it than on a post
      // without the link (#1513). Read the post files the blog collection
      // loads (recursive `.md`, drafts excluded, as tests/ai-use-render.test.js
      // does), so a new post is covered and no unrouted draft is visited. A
      // frontmatter `slug` wins over the path, as Astro's glob loader does.
      // six-prs stays first as the reference.
      const blogDir = fileURLToPath(new URL('../../src/content/blog/', import.meta.url));
      const publishedSlugs = findBlogMarkdownFiles(blogDir)
        .map((file: string) => ({
          file,
          frontmatter: splitEntry(readFileSync(file, 'utf8')).frontmatter as Record<
            string,
            unknown
          >,
        }))
        .filter(
          ({ frontmatter }: { frontmatter: Record<string, unknown> }) =>
            frontmatter.draft !== 'true',
        )
        .map(({ file, frontmatter }: { file: string; frontmatter: Record<string, unknown> }) =>
          typeof frontmatter.slug === 'string' && frontmatter.slug.trim()
            ? frontmatter.slug.trim()
            : blogSlugFromPath(file, blogDir),
        );
      const evennessPosts = [
        ...new Set(['six-prs-one-bug-agent-failure-modes', ...publishedSlugs]),
      ];

      for (const slug of evennessPosts) {
        test(`article title sits evenly between its kicker and its deck (${slug})`, async ({
          page,
        }) => {
          await page.goto(`/blog/${slug}/`);
          await page.waitForLoadState('domcontentloaded');
          await page.evaluate(() => document.fonts.ready);
          const gaps = await page.evaluate(() => {
            // Ink-to-ink, not box-to-box: a Range over each element's text.
            const ink = (sel: string) => {
              const range = document.createRange();
              range.selectNodeContents(document.querySelector(sel) as Element);
              const rects = [...range.getClientRects()];
              return {
                top: Math.min(...rects.map((r) => r.top)),
                bottom: Math.max(...rects.map((r) => r.bottom)),
              };
            };
            const kicker = ink('.blog-header-kicker');
            const title = ink('.blog-canvas-header h1');
            const deck = ink('.blog-canvas-header .deck');
            return { above: title.top - kicker.bottom, below: deck.top - title.bottom };
          });
          // The title belongs to both, so neither gap may run away from the
          // other (the desktop margins left 8px above and ~29px below).
          expect(Math.abs(gaps.above - gaps.below)).toBeLessThanOrEqual(4);
        });
      }

      test('mobile blog metadata text retains AA contrast on the accent plane', async ({
        page,
      }) => {
        await page.goto('/blog/six-prs-one-bug-agent-failure-modes/');
        await page.waitForLoadState('domcontentloaded');
        const colors = await page.evaluate(() => {
          const panel = document.querySelector('.blog-sidebar-meta') as Element;
          const label = panel.querySelector('dt') as Element;
          const topic = panel.querySelector('.blog-sidebar-topic') as Element;
          return {
            background: getComputedStyle(panel).backgroundColor,
            labelForeground: getComputedStyle(label).color,
            topicBackground: getComputedStyle(topic).backgroundColor,
            topicForeground: getComputedStyle(topic).color,
          };
        });
        const background = parseComputedColor(colors.background);
        const labelForeground = parseComputedColor(colors.labelForeground);
        const topicBackground = parseComputedColor(colors.topicBackground);
        const topicForeground = parseComputedColor(colors.topicForeground);

        expect(background, `Unable to parse computed color: ${colors.background}`).not.toBeNull();
        expect(
          labelForeground,
          `Unable to parse computed color: ${colors.labelForeground}`,
        ).not.toBeNull();
        expect(
          topicBackground,
          `Unable to parse computed color: ${colors.topicBackground}`,
        ).not.toBeNull();
        expect(
          topicForeground,
          `Unable to parse computed color: ${colors.topicForeground}`,
        ).not.toBeNull();
        expect(background!.a).toBe(1);
        expect(labelForeground!.a).toBe(1);
        expect(topicForeground!.a).toBe(1);
        expect(contrastRatio(labelForeground!, background!)).toBeGreaterThanOrEqual(4.5);
        expect(
          contrastRatio(topicForeground!, compositeColor(topicBackground!, background!)),
        ).toBeGreaterThanOrEqual(4.5);
      });
    }
  });
}
