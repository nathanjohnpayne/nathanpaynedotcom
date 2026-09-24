import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { serveStatic } from '../src/integrations/og-images.mjs';

/**
 * Ordinary desktop browser windows get the desktop composition (#1042).
 *
 * #1003 gave the homepage a height floor of 1024px (#992), by symmetry with
 * the width floor. Real desktop windows are almost all shorter than that once
 * the browser's own tab strip and toolbar are subtracted, so production served
 * the phone stack to a maximized Chrome on a 1080p monitor, on every MacBook,
 * and at the 1885x987 window the regression was reported from. The suite was
 * green throughout: the JSDOM tests mock `matchMedia` and never see a real
 * viewport, and the browser-measured tests had been reclassified to assert that
 * 1440x900 and 1728x1005 stack, which is the bug stated as a requirement.
 *
 * This file asserts the property from the reader's side, in a real browser
 * against the built page. The viewports are browser VIEWPORTS, not screen
 * sizes, because that is what a media query sees.
 *
 * The floor is 960px tall: the lowest height at which no open panel's own text
 * is clipped by the grid. The binding panel is About, whose content track is
 * its measured text height; below 942px tall its text runs past the grid's
 * bottom edge and `.mondrian { overflow: hidden }` cuts it. The first version
 * of this file measured content against its PANEL, which grows with that track,
 * and so passed a floor of 840 at which About lost 167px of text (Codex, PR
 * #1043). Measuring against the GRID is the check that matters.
 *
 * Not asserted here, and tracked in #1044: with About open, the bottom band of
 * the composition is pushed past the grid — 87px at the 960 floor, and 27px at
 * the 1024x1200 width floor on main before #1042. Fixing About's row model is
 * what would let this floor come down.
 */

const DESKTOP = [
  // The window the production regression was reported from.
  { name: 'reported Chrome window 1885x987', width: 1885, height: 987 },
  { name: '1080p monitor on macOS, maximized 1920x970', width: 1920, height: 970 },
  { name: '1440p monitor, maximized 2560x1300', width: 2560, height: 1300 },
  { name: '16-inch MacBook Pro 1728x1005', width: 1728, height: 1005 },
  // The height floor itself: the tightest desktop geometry there is.
  { name: 'height floor 1440x960', width: 1440, height: 960 },
  // The width floor.
  { name: 'width floor 1024x1200', width: 1024, height: 1200 },
];

const STACKED = [
  // One pixel under each floor, so the floor cannot drift in either direction
  // without failing here or in the fit assertions above it.
  { name: 'under the height floor 1440x959', width: 1440, height: 959 },
  { name: 'under the width floor 1023x1200', width: 1023, height: 1200 },
  // Real windows that stay stacked until #1044: About's text does not fit.
  { name: '1080p monitor on Windows, maximized 1920x945', width: 1920, height: 945 },
  { name: '14-inch MacBook Pro 1512x860', width: 1512, height: 860 },
  { name: '1280x700 (#992)', width: 1280, height: 700 },
  { name: 'phone 390x844', width: 390, height: 844 },
];

const PANELS = ['about', 'projects', 'community', 'connect'];

/** Tolerance for sub-pixel rounding; a real clip measured 2px to 167px. */
const OVERFLOW_TOLERANCE_PX = 1;

/**
 * How long a hover must go unanswered before "did not open" means the guard
 * held. The open sequence in index.astro reveals content one --motion-plane
 * (460ms) after the grid morphs; 1.2s is well past it, and waiting out a full
 * selector timeout instead cost 5s per stacked viewport (Codex, PR #1043).
 */
const NO_OPEN_WAIT_MS = 1_200;

/**
 * "Closed" is the grid back at rest (no `.is-open`, no `data-focus`) AND the
 * state machine back to idle, which the close sequence in index.astro reaches
 * one `--motion-plane` (460ms) after the grid resets. A hover landing before
 * then is swallowed, which reads as "did not open" for a reason that has
 * nothing to do with the layout.
 */
const IDLE_SETTLE_MS = 700;

let server;
let port;
let browser;

beforeAll(async () => {
  const { chromium } = await import('playwright');
  ({ server, port } = await serveStatic('dist'));
  browser = await chromium.launch();
}, 60_000);

afterAll(async () => {
  await browser?.close();
  server?.closeAllConnections?.();
  server?.close();
});

async function openPage({ width, height }) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  // A hidden pane freezes the animation clock; read settled geometry only.
  await page.addStyleTag({
    content: '*,*::before,*::after{transition:none!important;animation:none!important}',
  });
  return page;
}

/**
 * Hover a panel the way a reader does and report whether it opened. The
 * cursor is parked and every panel allowed to close first, because an open
 * neighbor moves this panel's cell and a box read before that would aim at
 * the wrong place.
 */
async function hoverPanel(page, name, { expectOpen }) {
  await page.mouse.move(1, 1);
  await page
    .waitForFunction(
      () =>
        !document.querySelector('[data-panel].is-open') &&
        !document.querySelector('.mondrian').dataset.focus,
      null,
      { timeout: 5_000 },
    )
    .catch(() => {});
  await page.waitForTimeout(IDLE_SETTLE_MS);
  const box = await page.locator(`[data-panel="${name}"]`).boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const selector = `[data-panel="${name}"].is-content-visible`;
  if (expectOpen) {
    return page
      .waitForSelector(selector, { timeout: 5_000 })
      .then(() => true)
      .catch(() => false);
  }
  await page.waitForTimeout(NO_OPEN_WAIT_MS);
  return page.evaluate((sel) => document.querySelector(sel) !== null, selector);
}

/**
 * Where the open panel's visible text ends, against the two boxes that can
 * clip it: its own panel, and the grid, which is `overflow: hidden`.
 * Positive means past the edge.
 */
async function readFit(page, name) {
  return page.evaluate((panelName) => {
    const grid = document.querySelector('.mondrian').getBoundingClientRect();
    const panel = document.querySelector(`[data-panel="${panelName}"]`);
    const text = [...panel.querySelectorAll('.panel-content *')].filter(
      (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden',
    );
    const bottom = Math.max(...text.map((el) => el.getBoundingClientRect().bottom));
    return {
      textElements: text.length,
      pastGrid: bottom - grid.bottom,
      pastPanel: bottom - panel.getBoundingClientRect().bottom,
      gridSquare: Math.abs(grid.height - grid.width) < 1.5,
    };
  }, name);
}

/** The composition is a square; the stack is a column far taller than wide. */
async function isComposition(page) {
  return page.evaluate(() => {
    const rect = document.querySelector('.mondrian').getBoundingClientRect();
    return rect.height / rect.width < 1.05;
  });
}

describe.each(DESKTOP)('desktop composition at $name', (viewport) => {
  it('renders the Mondrian square, and every panel opens with its text inside the grid', async () => {
    const page = await openPage(viewport);
    try {
      expect(await isComposition(page), 'rendered the stack on a desktop window').toBe(true);
      for (const name of PANELS) {
        expect(
          await hoverPanel(page, name, { expectOpen: true }),
          `${name} did not open on hover`,
        ).toBe(true);
        const fit = await readFit(page, name);
        // Control: an empty selection would make both bounds -Infinity and pass.
        expect(fit.textElements, `${name} has no visible text to measure`).toBeGreaterThan(0);
        expect(fit.gridSquare, `the grid stopped being square with ${name} open`).toBe(true);
        expect(fit.pastGrid, `${name} text is clipped by the grid`).toBeLessThanOrEqual(
          OVERFLOW_TOLERANCE_PX,
        );
        expect(fit.pastPanel, `${name} text overflows its panel`).toBeLessThanOrEqual(
          OVERFLOW_TOLERANCE_PX,
        );
      }
    } finally {
      await page.close();
    }
  }, 60_000);
});

describe.each(STACKED)('responsive stack at $name', (viewport) => {
  it('renders the stack, and hover opens nothing', async () => {
    const page = await openPage(viewport);
    try {
      expect(await isComposition(page), 'rendered the composition below a floor').toBe(false);
      // The panel exists and was hovered, so "did not open" means the guard
      // held, not that nothing was there to open.
      expect(await page.locator('[data-panel="projects"]').count()).toBe(1);
      expect(await hoverPanel(page, 'projects', { expectOpen: false })).toBe(false);
    } finally {
      await page.close();
    }
  }, 60_000);
});
