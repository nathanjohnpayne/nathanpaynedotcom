/**
 * Mermaid diagrams must stay readable at phone widths.
 *
 * `width: 100%` on an SVG carrying a `viewBox` scales the whole graphic rather
 * than reflowing it, so a diagram drawn 937px wide for the desktop column was
 * painting its labels — pinned at 14px since #753 — at 3.9px in a 262px phone
 * column (#894). Every diagram on the site went through the same rule, so this
 * measures every diagram on every built page rather than a named list.
 *
 * These assertions are deliberately about what a reader sees, not about which
 * declaration produced it: a diagram may scroll, or scale, or be re-authored
 * narrow, as long as its type lands above the floor and the overflow stays
 * inside the figure. The one implementation fact they do pin is that a figure
 * a mouse can scroll is a figure a keyboard can reach.
 *
 * This is the only Vitest suite that drives a real browser, which is worth a
 * word. The measurement has no cheaper form: the defect is a used width, and
 * the input to it — the `viewBox` — is invisible to JSDOM, which does no
 * layout, and to a CSS-text assertion, which would pin today's fix instead of
 * the behavior. The dependency is not a new one either. `npm test` runs
 * `astro build` first, and rehype-mermaid renders these diagrams through
 * Playwright's Chromium during that build (see the Playwright install step in
 * .github/workflows/build-and-test.yml), so a runner without Chromium fails at
 * the build long before it reaches this file.
 */

import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, relative, resolve, sep } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { findFilesRecursively } from '../scripts/lib/blog-file-inventory.mjs';
import { serveStatic } from '../src/integrations/og-images.mjs';

const DIST = resolve('dist');
// iPhone SE, the narrowest viewport the Playwright suite already targets and
// the one #894's measurements were taken at.
const MOBILE_VIEWPORT = { width: 375, height: 812 };

// The smallest type the site sets on purpose is the `.eyebrow` label at
// 0.56rem. A diagram label painting below that is smaller than anything a
// reader is ever intentionally asked to read here, which is the floor #894's
// acceptance criterion names. Rounded down by a hair to leave subpixel
// measurement noise somewhere to go.
const MIN_LEGIBLE_PX = 8.9;

/** Every built page carrying at least one diagram, as a site route. */
function routesWithDiagrams() {
  if (!existsSync(DIST)) return [];

  return findFilesRecursively(DIST, (filePath) => basename(filePath) === 'index.html')
    .filter((filePath) => readFileSync(filePath, 'utf8').includes('class="mermaid-figure"'))
    .map((filePath) =>
      `/${relative(DIST, dirname(filePath)).split(sep).join('/')}/`.replace('//', '/'),
    );
}

/**
 * Read every diagram on the current page as its reader meets it.
 *
 * A diagram the layout hides at this width reports a zero-width rect — the
 * blog sidebar is display: none below the stacked breakpoint — and is dropped
 * rather than measured, because there is nothing on screen to be illegible.
 */
function readDiagrams() {
  const root = document.documentElement;

  return {
    pageOverflow: root.scrollWidth - root.clientWidth,
    diagrams: [...document.querySelectorAll('.mermaid-figure svg.mermaid')].flatMap((svg) => {
      const bounds = svg.getBoundingClientRect();
      const viewBoxWidth = svg.viewBox.baseVal.width;
      if (!bounds.width || !viewBoxWidth) return [];

      const figure = svg.closest('.mermaid-figure');
      const label = svg.querySelector('.nodeLabel p') ?? svg.querySelector('.nodeLabel');
      // The scale the browser applied to the whole graphic. Every length inside
      // the SVG — type included — is multiplied by it.
      const scale = bounds.width / viewBoxWidth;

      return [
        {
          title: figure?.getAttribute('aria-label') ?? '(untitled)',
          naturalWidth: viewBoxWidth,
          renderedWidth: bounds.width,
          scale,
          // Read rather than assumed: the 14px pin is #753's, not this test's,
          // and this assertion should still be measuring the real painted size
          // if that pin ever moves.
          declaredType: label ? Number.parseFloat(getComputedStyle(label).fontSize) : 0,
          paintedType: label ? Number.parseFloat(getComputedStyle(label).fontSize) * scale : 0,
          columnWidth: figure?.clientWidth ?? 0,
          scrollableWidth: figure?.scrollWidth ?? 0,
          // A tab stop of any non-negative index makes the region reachable.
          tabIndex: figure?.tabIndex ?? -1,
        },
      ];
    }),
  };
}

const routes = routesWithDiagrams();

describe('Mermaid diagrams at phone width', () => {
  const readings = new Map();
  let server;
  let browser;

  beforeAll(async () => {
    expect(existsSync(DIST), 'dist must exist; run npm run build first').toBe(true);
    expect(routes, 'the suite must find built pages carrying diagrams').not.toHaveLength(0);

    const { chromium } = await import('playwright');
    const started = await serveStatic(DIST);
    server = started.server;
    browser = await chromium.launch();

    const page = await browser.newPage({ viewport: MOBILE_VIEWPORT });
    for (const route of routes) {
      await page.goto(`http://127.0.0.1:${started.port}${route}`, {
        waitUntil: 'domcontentloaded',
      });
      readings.set(route, await page.evaluate(readDiagrams));
    }
    await page.close();
  }, 180_000);

  afterAll(async () => {
    await browser?.close();
    // Playwright leaves keep-alive sockets open, and `close` alone waits on
    // them rather than on the listener. Teardown here competes with 40-odd
    // other suites for the CPU, which is why vitest.config.js raises the hook
    // ceiling rather than leaving it at the 10s default this exceeded.
    server?.closeAllConnections?.();
    server?.close();
  });

  it('exercises a diagram drawn wider than the phone column', () => {
    // Without this the whole suite could pass on a site whose diagrams all
    // happen to fit, proving nothing about the defect it exists to catch.
    const tooWide = [...readings.values()]
      .flatMap((reading) => reading.diagrams)
      .filter((diagram) => diagram.naturalWidth > diagram.columnWidth + 1);

    expect(
      tooWide.map((diagram) => diagram.title),
      'no built diagram is wider than the phone column, so the legibility assertions are vacuous',
    ).not.toHaveLength(0);
  });

  it.each(routes)('%s paints every visible diagram above the legibility floor', (route) => {
    // A route can legitimately measure nothing here: four blog posts carry
    // their only diagram in the sidebar, which the layout drops below the
    // stacked breakpoint. The suite-wide coverage assertion above is what
    // guarantees these loops are not all empty.
    for (const diagram of readings.get(route).diagrams) {
      expect(
        diagram.declaredType,
        `${route} — ${diagram.title}: no label to measure`,
      ).toBeGreaterThan(0);
      expect(
        diagram.paintedType,
        `${route} — ${diagram.title}: ${diagram.declaredType}px type painted at ` +
          `${diagram.paintedType.toFixed(2)}px, scaled ${diagram.scale.toFixed(3)} by rendering ` +
          `a ${diagram.naturalWidth.toFixed(0)}px diagram into ${diagram.renderedWidth.toFixed(0)}px`,
      ).toBeGreaterThanOrEqual(MIN_LEGIBLE_PX);
    }
  });

  it.each(routes)('%s keeps diagram overflow inside the figure', (route) => {
    const reading = readings.get(route);

    // Whatever a diagram does to stay legible, it does not push the page
    // sideways — the same contract the code blocks on these pages hold to.
    expect(
      reading.pageOverflow,
      `${route}: the page itself scrolls horizontally by ${reading.pageOverflow}px`,
    ).toBeLessThanOrEqual(1);

    for (const diagram of reading.diagrams) {
      // A diagram held wider than its column has to be scrollable, or the part
      // that does not fit is simply unreachable.
      if (diagram.renderedWidth > diagram.columnWidth + 1) {
        expect(
          diagram.scrollableWidth,
          `${route} — ${diagram.title}: rendered ${diagram.renderedWidth.toFixed(0)}px in a ` +
            `${diagram.columnWidth}px figure that does not scroll`,
        ).toBeGreaterThan(diagram.columnWidth);
        expect(
          diagram.tabIndex,
          `${route} — ${diagram.title}: scrollable figure no keyboard can focus`,
        ).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
