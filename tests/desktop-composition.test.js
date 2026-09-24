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
 * The floor is 840px tall, set by Community's content, which overflows its own
 * panel below 824px. About and Projects no longer bind: their content tracks
 * are capped at the space the square has, and when the cap binds the panel
 * scrolls its own text, with a fade at the bottom edge while more remains
 * (#1044). Before that, About's text ran past the grid below 942px tall and
 * `.mondrian { overflow: hidden }` cut it (Codex, PR #1043), and with About
 * open the bottom band was cut at every square under ~1010px, the 1024x1200
 * width floor included.
 *
 * So the assertions are about reachability, not just geometry: after every
 * open, every grid cell stays inside the grid, and every line of the open
 * panel's text is either visible or reachable by scrolling the panel, with the
 * cue shown while text remains below and cleared once the reader reaches it.
 */

const DESKTOP = [
  // The window the production regression was reported from.
  { name: 'reported Chrome window 1885x987', width: 1885, height: 987 },
  { name: '1080p monitor on macOS, maximized 1920x970', width: 1920, height: 970 },
  { name: '1080p monitor on Windows, maximized 1920x945', width: 1920, height: 945 },
  { name: '1440p monitor, maximized 2560x1300', width: 2560, height: 1300 },
  { name: '16-inch MacBook Pro 1728x1005', width: 1728, height: 1005 },
  { name: '14-inch MacBook Pro 1512x860', width: 1512, height: 860 },
  { name: '1440x900', width: 1440, height: 900 },
  // The height floor itself: the tightest desktop geometry there is.
  { name: 'height floor 1440x840', width: 1440, height: 840 },
  // The width floor.
  { name: 'width floor 1024x1200', width: 1024, height: 1200 },
];

const STACKED = [
  // One pixel under each floor, so the floor cannot drift in either direction
  // without failing here or in the fit assertions above it.
  { name: 'under the height floor 1440x839', width: 1440, height: 839 },
  { name: 'under the width floor 1023x1200', width: 1023, height: 1200 },
  { name: '1366x768 laptop, maximized 1366x657', width: 1366, height: 657 },
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
  // In the stack the panel can start below the fold, and a cursor sent to its
  // off-screen midpoint hovers nothing, so "did not open" would pass without
  // a hover ever happening (CodeRabbit, PR #1043). Scroll it into view, aim at
  // the middle of its VISIBLE part, and refuse to proceed if that point is not
  // on screen.
  const panel = page.locator(`[data-panel="${name}"]`);
  await panel.scrollIntoViewIfNeeded();
  // Let the page's scroll guard (`body.is-scrolling`, which suspends hover)
  // clear before the cursor arrives.
  await page
    .waitForFunction(() => !document.body.classList.contains('is-scrolling'), null, {
      timeout: 5_000,
    })
    .catch(() => {});
  await page.waitForTimeout(IDLE_SETTLE_MS);
  const box = await panel.boundingBox();
  const viewport = page.viewportSize();
  const top = Math.max(box.y, 0);
  const bottom = Math.min(box.y + box.height, viewport.height);
  const x = box.x + box.width / 2;
  const y = (top + bottom) / 2;
  if (!(bottom > top && x > 0 && x < viewport.width)) {
    throw new Error(`${name} is not on screen to hover (visible rows ${top}–${bottom})`);
  }
  await page.mouse.move(x, y);
  const selector = `[data-panel="${name}"].is-content-visible`;
  if (expectOpen) {
    return page
      .waitForSelector(selector, { timeout: 5_000 })
      .then(() => true)
      .catch(() => false);
  }
  await page.waitForTimeout(NO_OPEN_WAIT_MS);
  // Any sign the state machine engaged, not just the final reveal: with the
  // guard broken, a stacked panel takes `is-open` and the grid `data-focus`,
  // but `is-content-visible` never arrives, so asserting on it alone passed
  // with the guard deleted.
  return page.evaluate(
    ([sel, panelName]) =>
      document.querySelector(sel) !== null ||
      document.querySelector(`[data-panel="${panelName}"]`).classList.contains('is-open') ||
      Boolean(document.querySelector('.mondrian').dataset.focus),
    [selector, name],
  );
}

/**
 * Everything a reader needs from one open panel, read in the page.
 *
 * `band` is the furthest any grid cell runs past the grid's bottom edge. Cells
 * normally end inside it (the grid has a border), so this is negative when the
 * composition is intact and positive when a focus state pushed the bottom band
 * out of the square, which `overflow: hidden` then cuts.
 *
 * The text check scrolls the panel's content to its end first, then requires
 * every visible element to lie inside the panel's scroll box, the panel, and
 * the grid. A panel that does not scroll is unaffected by the scroll, so the
 * same check covers both.
 */
async function readFit(page, name) {
  const before = await page.evaluate((panelName) => {
    const ci = document.querySelector(`[data-panel="${panelName}"] .content-inner`);
    return {
      scrolls: ci.scrollHeight - ci.clientHeight > 1,
      overflowY: getComputedStyle(ci).overflowY,
      cueBefore: ci.classList.contains('has-more-below'),
    };
  }, name);
  await page.evaluate((panelName) => {
    const ci = document.querySelector(`[data-panel="${panelName}"] .content-inner`);
    ci.scrollTop = ci.scrollHeight;
  }, name);
  // The scroll event that clears the cue is dispatched asynchronously.
  await page.waitForTimeout(150);
  const after = await page.evaluate((panelName) => {
    const grid = document.querySelector('.mondrian');
    const gridBox = grid.getBoundingClientRect();
    const panel = document.querySelector(`[data-panel="${panelName}"]`);
    const panelBox = panel.getBoundingClientRect();
    const ci = panel.querySelector('.content-inner');
    const ciBox = ci.getBoundingClientRect();
    const text = [...panel.querySelectorAll('.panel-content *')].filter(
      (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden',
    );
    const bottom = Math.max(...text.map((el) => el.getBoundingClientRect().bottom));
    return {
      textElements: text.length,
      textPast: bottom - Math.min(ciBox.bottom, panelBox.bottom, gridBox.bottom),
      band:
        Math.max(...[...grid.children].map((c) => c.getBoundingClientRect().bottom)) -
        gridBox.bottom,
      gridSquare: Math.abs(gridBox.height - gridBox.width) < 1.5,
      cueAfter: ci.classList.contains('has-more-below'),
    };
  }, name);
  return { ...before, ...after };
}

/** The composition is a square; the stack is a column far taller than wide. */
async function isComposition(page) {
  return page.evaluate(() => {
    const rect = document.querySelector('.mondrian').getBoundingClientRect();
    return rect.height / rect.width < 1.05;
  });
}

describe.each(DESKTOP)('desktop composition at $name', (viewport) => {
  it('renders the Mondrian square, and every open panel keeps the grid intact and its text reachable', async () => {
    const page = await openPage(viewport);
    try {
      expect(await isComposition(page), 'rendered the stack on a desktop window').toBe(true);
      for (const name of PANELS) {
        expect(
          await hoverPanel(page, name, { expectOpen: true }),
          `${name} did not open on hover`,
        ).toBe(true);
        const fit = await readFit(page, name);
        // Control: an empty selection would make the text bound -Infinity and pass.
        expect(fit.textElements, `${name} has no visible text to measure`).toBeGreaterThan(0);
        expect(fit.gridSquare, `the grid stopped being square with ${name} open`).toBe(true);
        expect(fit.band, `${name} pushed a grid cell past the grid`).toBeLessThanOrEqual(
          OVERFLOW_TOLERANCE_PX,
        );
        expect(fit.textPast, `${name} text is cut off and not reachable`).toBeLessThanOrEqual(
          OVERFLOW_TOLERANCE_PX,
        );
        if (fit.scrolls) {
          // Reachable means the panel really scrolls, and says so while it can.
          expect(['auto', 'scroll'], `${name} overflows without scrolling`).toContain(
            fit.overflowY,
          );
          expect(fit.cueBefore, `${name} has text below its edge but no cue`).toBe(true);
          expect(fit.cueAfter, `${name} keeps the cue after reaching the end`).toBe(false);
        } else {
          expect(fit.cueBefore, `${name} shows the cue with nothing below`).toBe(false);
        }
      }
    } finally {
      await page.close();
    }
  }, 90_000);
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
