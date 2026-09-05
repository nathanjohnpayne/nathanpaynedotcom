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
 * The two columns answer the problem differently, and #986 is why. The article
 * column contains a wide diagram — it holds it at natural width and scrolls the
 * figure — because it is wide enough (528–636px) that most diagrams fit outright
 * and the rest stay legible scaled. The sidebar cannot do either: it is 192–238px
 * and barely grows with the viewport, so a wide diagram there is unreadable
 * scaled and a fifth-visible scrolled. It therefore holds no wide diagram at all.
 * The build refuses one, and a diagram that needs the room is authored into the
 * post body instead. So the sidebar arm below asserts the absence of a
 * horizontal scrollbar where it once asserted the presence of a working one.
 *
 * Every diagram on every built page goes through the same rule, so the routes
 * are discovered by scanning dist rather than named here.
 *
 * These assertions are deliberately about what a reader sees, not about which
 * declaration produced it: a diagram may scroll, or scale, or be re-authored
 * narrow, or move to a wider column, as long as its type lands above the floor
 * and the overflow stays inside the figure. The one implementation fact they do
 * pin is that a figure a mouse can scroll is a figure a keyboard can reach.
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
 *
 * Not 1024px, though that is where the desktop composition starts and where
 * both columns are narrowest. Three article-column diagrams predating #986 paint
 * below the floor there, so adding it is a fix rather than a widening — #987.
 * The sidebar-column assertion reads 1024px on its own for a different question.
 */
const VIEWPORTS = [
  { name: 'phone', width: 375, height: 812 },
  { name: 'desktop', width: 1280, height: 900 },
];

/**
 * The two page widths print has to be checked at, because the trap is two-sided.
 *
 * Paper cannot scroll, so both containment rules are scoped `@media screen` and
 * print keeps fitting the diagram to its column. What makes that scoping easy to
 * lose is that a print page has a width like any other, and either kind of width
 * query can match it. #894 found a narrow one: a printed page is roughly 816px,
 * so a bare `max-width: 1023px` matches it, and `min-width` beats the print
 * block's `max-width` and turns a scrollable diagram into a clipped one. #897
 * was the same trap mirrored — an unscoped sidebar rule, or one bounded
 * `min-width: 1024px`, matches a print render at a wide viewport instead.
 *
 * Only the narrow trap has a live rule behind it now: #986 deleted the sidebar's
 * containment entirely, so there is no wide-viewport screen rule left to leak.
 * The desktop page stays measured anyway. It costs one page load, and what it
 * guards is a shape of mistake rather than a particular declaration — the next
 * containment rule written for a wide column would reintroduce it the same way,
 * and a suite that stopped looking would not say so.
 */
const PRINT_VIEWPORTS = [
  // US Letter at 96dpi, the page #894's measurement was taken against.
  { name: 'letter', width: 816, height: 1056 },
  // Where a wide-viewport print render — the shape Chromium's own print
  // emulation produces — would catch a `min-width` rule that forgot `screen`.
  // Nothing on the site declares one today; see the note above.
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
// Print is read into its own map rather than folded into `readings` under a
// third viewport name, because the assertions differ in kind: on screen a wide
// diagram must stay scrollable, and on paper the same diagram must instead have
// been fitted to its column. Sharing a map would invite one loop over both.
const printReadings = new Map();
let server;
let browser;
// Hoisted so the sidebar-column assertion can open its own 1024px page; see there
// for why that width is read separately rather than added to VIEWPORTS.
let port;

beforeAll(async () => {
  expect(existsSync(DIST), 'dist must exist; run npm run build first').toBe(true);
  expect(routes, 'the suite must find built pages carrying diagrams').not.toHaveLength(0);

  const { chromium } = await import('playwright');
  const started = await serveStatic(DIST);
  server = started.server;
  port = started.port;
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

  // Same pages, same reader, print media emulated. Chromium applies the print
  // stylesheet without producing a PDF, so `getBoundingClientRect` reports what
  // the print rules actually resolve to.
  for (const viewport of PRINT_VIEWPORTS) {
    const page = await browser.newPage({
      viewport: { width: viewport.width, height: viewport.height },
    });
    await page.emulateMedia({ media: 'print' });
    for (const route of routes) {
      await page.goto(`http://127.0.0.1:${started.port}${route}`, {
        waitUntil: 'domcontentloaded',
      });
      printReadings.set(`${viewport.name}|${route}`, await page.evaluate(readDiagrams));
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

describe('Mermaid coverage of the article column', () => {
  // The generic coverage assertion above is satisfied by any wide diagram, and
  // at desktop an article-column one can satisfy it alone — so it would keep
  // passing with every wide diagram removed or hidden, leaving the phone arm
  // measuring nothing #894 was about.
  //
  // This used to be an `it.each` over two containers. The sidebar row is gone
  // because #986 inverted what it was guarding: it asserted that a sidebar
  // diagram wider than its column *exists*, so that the scroll containment
  // #897 added would not be measured vacuously, and there is no longer any
  // such containment to measure. The sidebar's contract is now the opposite
  // one, and it is asserted below rather than here.
  it('measures an article diagram wider than its column at phone width', () => {
    const viewport = VIEWPORTS.find((candidate) => candidate.name === 'phone');
    const tooWide = diagramsAt(viewport).filter(
      (diagram) =>
        diagram.container === 'article' && diagram.naturalWidth > diagram.columnWidth + 1,
    );

    expect(
      tooWide.map((diagram) => `${diagram.route} — ${diagram.title}`),
      'no visible article diagram is wider than its column at phone width, so that arm no ' +
        'longer exercises the container #894 was filed about',
    ).not.toHaveLength(0);
  });
});

describe('Mermaid in the blog sidebar', () => {
  /**
   * Every sidebar diagram visible at a desktop width, across all routes.
   *
   * The sidebar is `display: none` below the stacked breakpoint, so the phone
   * arm reads none of these and the desktop arm reads all of them.
   */
  const sidebarDiagrams = () =>
    diagramsAt(VIEWPORTS.find((candidate) => candidate.name === 'desktop')).filter(
      (diagram) => diagram.container === 'sidebar',
    );

  it('renders a sidebar diagram at all', () => {
    // The two assertions that follow are both satisfied by an empty sidebar, so
    // without this the whole describe passes on a site that has quietly stopped
    // putting diagrams there — which is the failure mode #986's own fix could
    // produce if the ceiling were ever set low enough to exclude everything.
    expect(
      sidebarDiagrams().map((diagram) => `${diagram.route} — ${diagram.title}`),
      'no diagram renders in the blog sidebar, so these assertions are vacuous',
    ).not.toHaveLength(0);
  });

  it('never scrolls a sidebar diagram sideways', () => {
    // The contract #986 replaced #897 with. The sidebar column does not grow
    // with the viewport, so a diagram too wide for it is unreadable there at
    // every width — the 976px one showed a fifth of itself. A diagram that
    // reaches the sidebar now was drawn narrow enough to scale into it above the
    // legibility floor, which the arms above assert separately; here the claim
    // is only that nothing is hiding behind a horizontal scrollbar.
    for (const diagram of sidebarDiagrams()) {
      expect(
        diagram.scrollableWidth,
        `${diagram.route} — ${diagram.title}: a ${diagram.naturalWidth.toFixed(0)}px diagram ` +
          `renders ${diagram.renderedWidth.toFixed(0)}px into a ${diagram.columnWidth}px sidebar ` +
          'figure, so it can only be read by scrolling. It belongs in the post body as a ' +
          '```mermaid fence',
      ).toBeLessThanOrEqual(diagram.columnWidth + 1);
    }
  });

  it('is no narrower than the column width the build assumes', async () => {
    // The build refuses a sidebar diagram wider than SIDEBAR_MAX_NATURAL_WIDTH_PX,
    // and that ceiling is derived from SIDEBAR_COLUMN_PX — a width measured off
    // the built site, because `.blog-sidebar` is an `fr` track whose used width
    // the grid definition does not state. A measured constant goes stale in
    // silence, and this one would go stale in the dangerous direction: a
    // narrower sidebar makes the ceiling too generous, and the first symptom is
    // an unreadable diagram shipping.
    //
    // 1024px is the width to check it at — the sidebar's narrowest, since that
    // is where the three-column composition takes over. It is deliberately a
    // reading of its own rather than a third entry in VIEWPORTS: adding one
    // would run the legibility arms there too, where three article-column
    // diagrams predating #986 paint below the floor. That is #987, and it is a
    // separate fix.
    const { SIDEBAR_COLUMN_PX } = await import('../src/lib/render-sidebar-mermaid.mjs');
    const route = routes.find((candidate) =>
      readings.get(`desktop|${candidate}`).diagrams.some((d) => d.container === 'sidebar'),
    );

    const page = await browser.newPage({ viewport: { width: 1024, height: 900 } });
    await page.goto(`http://127.0.0.1:${port}${route}`, { waitUntil: 'domcontentloaded' });
    const measured = await page.evaluate(
      () => document.querySelector('.blog-sidebar-item .mermaid-figure')?.clientWidth ?? 0,
    );
    await page.close();

    expect(
      measured,
      `the sidebar figure measures ${measured}px at a 1024px viewport, but the build derives its ` +
        `width ceiling from ${SIDEBAR_COLUMN_PX}px (see SIDEBAR_COLUMN_PX in ` +
        'src/lib/render-sidebar-mermaid.mjs). Re-measure and update it, or a diagram the build ' +
        'accepts will paint below the legibility floor',
    ).toBeGreaterThanOrEqual(SIDEBAR_COLUMN_PX);
  });
});

describe.each(PRINT_VIEWPORTS)('Mermaid diagrams printed at $name width', (viewport) => {
  /** Every diagram on the printed page, across all routes. */
  const printedDiagrams = () =>
    routes.flatMap((route) =>
      printReadings.get(`${viewport.name}|${route}`).diagrams.map((d) => ({ ...d, route })),
    );

  it('exercises a diagram whose natural width exceeds its printed column', () => {
    // Without this the arm passes on a page whose diagrams all happen to fit,
    // proving nothing about the rule it exists to hold — the same vacuity guard
    // the screen arms carry.
    const tooWide = printedDiagrams().filter((d) => d.naturalWidth > d.columnWidth + 1);

    expect(
      tooWide.map((d) => `${d.route} — ${d.title}`),
      'no printed diagram is naturally wider than its column, so the containment ' +
        'assertions below are vacuous',
    ).not.toHaveLength(0);
  });

  it.each(routes)('%s fits every diagram inside the printed page', (route) => {
    const reading = printReadings.get(`${viewport.name}|${route}`);

    expect(
      reading.pageOverflow,
      `${route}: the printed page overflows horizontally by ${reading.pageOverflow}px, so the ` +
        'overflowing edge is cropped at the paper margin',
    ).toBeLessThanOrEqual(1);

    for (const diagram of reading.diagrams) {
      // The whole contract in one line. Paper cannot scroll, so a diagram held
      // wider than its column is not scrollable — it is clipped. Either
      // containment rule leaking past `@media screen` shows up here and nowhere
      // else: #894's `max-width: 1023px` matches an 816px page, and an unscoped
      // or `min-width: 1024px` sidebar rule matches a 1280px one.
      expect(
        diagram.renderedWidth,
        `${route} — ${diagram.title} (${diagram.container}): printed ` +
          `${diagram.renderedWidth.toFixed(0)}px into a ${diagram.columnWidth}px column, so ` +
          `${(diagram.renderedWidth - diagram.columnWidth).toFixed(0)}px is cropped off the page`,
      ).toBeLessThanOrEqual(diagram.columnWidth + 1);
    }
  });
});
