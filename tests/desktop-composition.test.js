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
 * The floor itself is 840px tall: the height at which every open panel still
 * fits inside its cell. Measured at every width from 1280 to 2560 (the
 * geometry is a function of height alone there), Community's content overflows
 * its panel below 824px — 0.4px at 823, 36.8px at 800 — and that is the binding
 * constraint; Projects' footer line meets its exit link lower, at 740px.
 */

const DESKTOP = [
  // The window the production regression was reported from.
  { name: 'reported Chrome window 1885x987', width: 1885, height: 987 },
  { name: '1080p monitor, maximized 1920x950', width: 1920, height: 950 },
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
  // without failing here or in the fit assertion above it.
  { name: 'under the height floor 1440x839', width: 1440, height: 839 },
  { name: 'under the width floor 1023x1200', width: 1023, height: 1200 },
  { name: '1366x768 laptop, maximized 1366x657', width: 1366, height: 657 },
  { name: '1280x700 (#992)', width: 1280, height: 700 },
  { name: 'phone 390x844', width: 390, height: 844 },
];

const PANELS = ['about', 'projects', 'community', 'connect'];

/** Tolerance for sub-pixel rounding; a real overflow measured 0.4px to 37px. */
const OVERFLOW_TOLERANCE_PX = 1;

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
 * Hover a panel the way a reader does and report whether it opened, and how
 * far its content runs past the bottom of its cell. The cursor is parked and
 * every panel allowed to close first, because an open neighbor moves this
 * panel's cell and a box read before that would aim at the wrong place.
 *
 * "Closed" is the grid back at rest (no `.is-open`, no `data-focus`) AND the
 * state machine back to idle, which the close sequence in index.astro reaches
 * one `--motion-plane` (460ms) after the grid resets. A hover landing before
 * then is swallowed, which reads as "did not open" for a reason that has
 * nothing to do with the layout.
 */
const IDLE_SETTLE_MS = 700;

async function hoverPanel(page, name) {
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
  const opened = await page
    .waitForSelector(`[data-panel="${name}"].is-content-visible`, { timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  const overflow = await page.evaluate((panelName) => {
    const panel = document.querySelector(`[data-panel="${panelName}"]`);
    const bottom = panel.getBoundingClientRect().bottom;
    return Math.max(
      0,
      ...[...panel.querySelectorAll('*')].map((el) => el.getBoundingClientRect().bottom - bottom),
    );
  }, name);
  return { opened, overflow };
}

/** The composition is a square; the stack is a column far taller than wide. */
async function isComposition(page) {
  return page.evaluate(() => {
    const rect = document.querySelector('.mondrian').getBoundingClientRect();
    return rect.height / rect.width < 1.05;
  });
}

describe.each(DESKTOP)('desktop composition at $name', (viewport) => {
  it('renders the Mondrian square, and every panel opens and fits', async () => {
    const page = await openPage(viewport);
    try {
      expect(await isComposition(page), 'rendered the stack on a desktop window').toBe(true);
      for (const name of PANELS) {
        const { opened, overflow } = await hoverPanel(page, name);
        expect(opened, `${name} did not open on hover`).toBe(true);
        expect(overflow, `${name} content overflows its panel`).toBeLessThanOrEqual(
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
      // Control for the negative: the panel exists and was hovered, so "did
      // not open" means the guard held, not that nothing was there to open.
      const { opened } = await hoverPanel(page, 'projects');
      expect(opened).toBe(false);
    } finally {
      await page.close();
    }
  }, 60_000);
});
