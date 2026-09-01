/**
 * Mermaid diagrams must stay readable in every column the site renders them in.
 *
 * `width: 100%` on an SVG carrying a `viewBox` scales the whole graphic rather
 * than reflowing it, so a diagram drawn wider than its column shrinks its
 * labels — pinned at 14px since #753 — along with everything else. The site has
 * two columns narrow enough for that to matter, and they sit on opposite sides
 * of the stacked breakpoint: the article column at phone widths, where a 937px
 * diagram painted 3.9px (#894), and the blog sidebar at desktop widths, where a
 * 976px diagram painted 3.4px (#897). A suite that measured only one viewport
 * would have passed straight over the other defect, so this one measures both.
 *
 * Every diagram on every built page goes through the same rule, so the routes
 * are discovered by scanning dist rather than named here.
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

/**
 * The two viewports the two defects were measured at.
 *
 * The phone is an iPhone SE, the narrowest viewport the Playwright suite
 * already targets and the one #894's measurements were taken at. The desktop is
 * where the blog sidebar exists at all — it is `display: none` below the
 * stacked breakpoint — and is the width #897 was filed against.
 */
const VIEWPORTS = [
  { name: 'phone', width: 375, height: 812 },
  { name: 'desktop', width: 1280, height: 900 },
];

// The smallest type the site sets on purpose is the `.eyebrow` label at
// 0.56rem. A diagram label painting below that is smaller than anything a
// reader is ever intentionally asked to read here, which is the floor #894's
// acceptance criterion names and #897 reuses. Rounded down by a hair to leave
// subpixel measurement noise somewhere to go.
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
          // The two narrow columns are contained by different rules and were
          // fixed by different issues, so the coverage assertions name them
          // apart rather than counting diagrams in bulk.
          container: svg.closest('.blog-sidebar-item') ? 'sidebar' : 'article',
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

// Keyed `${viewport.name}|${route}`. One browser and one server serve every
// viewport: the pages are identical bytes and only the viewport differs, so
// launching Chromium per arm would double the slowest hook in the suite for
// nothing.
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

  for (const viewport of VIEWPORTS) {
    const page = await browser.newPage({
      viewport: { width: viewport.width, height: viewport.height },
    });
    for (const route of routes) {
      await page.goto(`http://127.0.0.1:${started.port}${route}`, {
        waitUntil: 'domcontentloaded',
      });
      readings.set(`${viewport.name}|${route}`, await page.evaluate(readDiagrams));
    }
    await page.close();
  }
}, 180_000);

afterAll(async () => {
  await browser?.close();
  // Playwright leaves keep-alive sockets open, and `close` alone waits on them
  // rather than on the listener. Teardown here competes with 40-odd other
  // suites for the CPU, which is why vitest.config.js raises the hook ceiling
  // rather than leaving it at the 10s default this exceeded.
  server?.closeAllConnections?.();
  server?.close();
});

/** Every diagram visible at `viewport`, across all routes. */
function diagramsAt(viewport) {
  return routes.flatMap((route) =>
    readings.get(`${viewport.name}|${route}`).diagrams.map((diagram) => ({ ...diagram, route })),
  );
}

describe.each(VIEWPORTS)('Mermaid diagrams at $name width', (viewport) => {
  it('exercises a diagram drawn wider than its column', () => {
    // Without this the whole arm could pass on a site whose diagrams all happen
    // to fit, proving nothing about the defect it exists to catch.
    const tooWide = diagramsAt(viewport).filter(
      (diagram) => diagram.naturalWidth > diagram.columnWidth + 1,
    );

    expect(
      tooWide.map((diagram) => `${diagram.route} — ${diagram.title}`),
      'no built diagram is wider than its column, so the legibility assertions are vacuous',
    ).not.toHaveLength(0);
  });

  it.each(routes)('%s paints every visible diagram above the legibility floor', (route) => {
    // A route can legitimately measure nothing at a given viewport: four blog
    // posts carry their only diagram in the sidebar, which the layout drops
    // below the stacked breakpoint. The coverage assertions are what guarantee
    // these loops are not all empty.
    for (const diagram of readings.get(`${viewport.name}|${route}`).diagrams) {
      expect(
        diagram.declaredType,
        `${route} — ${diagram.title}: no label to measure`,
      ).toBeGreaterThan(0);
      expect(
        diagram.paintedType,
        `${route} — ${diagram.title} (${diagram.container}): ${diagram.declaredType}px type ` +
          `painted at ${diagram.paintedType.toFixed(2)}px, scaled ${diagram.scale.toFixed(3)} by ` +
          `rendering a ${diagram.naturalWidth.toFixed(0)}px diagram into ` +
          `${diagram.renderedWidth.toFixed(0)}px`,
      ).toBeGreaterThanOrEqual(MIN_LEGIBLE_PX);
    }
  });

  it.each(routes)('%s keeps diagram overflow inside the figure', (route) => {
    const reading = readings.get(`${viewport.name}|${route}`);

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

describe('Mermaid coverage of the two narrow columns', () => {
  // The generic coverage assertion above is satisfied by any wide diagram, and
  // at desktop an article-column one can satisfy it alone — so it would keep
  // passing with every sidebar diagram removed or hidden, leaving the desktop
  // arm measuring nothing #897 was about. Same exposure in reverse at phone
  // width. Name each container against the viewport where it is the narrow one.
  it.each([
    { container: 'sidebar', viewport: 'desktop', issue: '#897' },
    { container: 'article', viewport: 'phone', issue: '#894' },
  ])('measures a $container diagram wider than its column at $viewport width', (subject) => {
    const viewport = VIEWPORTS.find((candidate) => candidate.name === subject.viewport);
    const tooWide = diagramsAt(viewport).filter(
      (diagram) =>
        diagram.container === subject.container &&
        diagram.naturalWidth > diagram.columnWidth + 1,
    );

    expect(
      tooWide.map((diagram) => `${diagram.route} — ${diagram.title}`),
      `no visible ${subject.container} diagram is wider than its column at ${subject.viewport} ` +
        `width, so that arm no longer exercises the container ${subject.issue} was filed about`,
    ).not.toHaveLength(0);
  });
});
