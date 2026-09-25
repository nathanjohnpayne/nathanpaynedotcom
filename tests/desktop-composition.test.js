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
 * held. The open sequence in index.astro reveals content once the grid morph
 * is handed back (--motion-plane + 60ms, 520ms); 1.2s is well past it, and
 * waiting out a full selector timeout instead cost 5s per stacked viewport
 * (Codex, PR #1043).
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
  // The scroll event that clears the cue is dispatched asynchronously, so wait
  // for the class to clear rather than for a fixed interval (CodeRabbit, PR
  // #1046). Bounded, and a timeout is swallowed, so a cue that never clears
  // still reaches the `cueAfter` assertion below and fails there with its
  // message, instead of surfacing as a bare timeout.
  await page
    .waitForFunction(
      (panelName) =>
        !document
          .querySelector(`[data-panel="${panelName}"] .content-inner`)
          .classList.contains('has-more-below'),
      name,
      { timeout: 2_000 },
    )
    .catch(() => {});
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

describe('keyboard access to a capped panel', () => {
  it('opens with Enter, moves focus into the scrollable text, and scrolls with PageDown', async () => {
    // A capped panel's content is the only thing that can scroll its hidden
    // text, so it must be reachable from the keyboard (Codex, PR #1046).
    const page = await openPage({ width: 1440, height: 900 });
    try {
      await page.focus('[data-panel="about"] .panel-label');
      await page.keyboard.press('Enter');
      await page.waitForSelector('[data-panel="about"].is-content-visible', { timeout: 5_000 });
      const state = await page.evaluate(() => {
        const ci = document.querySelector('[data-panel="about"] .content-inner');
        return {
          focused: document.activeElement === ci,
          tabindex: ci.getAttribute('tabindex'),
          label: ci.getAttribute('aria-label'),
          capped: ci.scrollHeight - ci.clientHeight > 1,
        };
      });
      // Control: this viewport really caps About.
      expect(state.capped).toBe(true);
      expect(state.tabindex).toBe('0');
      expect(state.label).toMatch(/scrollable$/);
      expect(state.focused, 'focus did not move into the scrollable content').toBe(true);
      await page.keyboard.press('PageDown');
      await page.waitForTimeout(300);
      const scrolled = await page.evaluate(
        () => document.querySelector('[data-panel="about"] .content-inner').scrollTop,
      );
      expect(scrolled).toBeGreaterThan(0);
    } finally {
      await page.close();
    }
  }, 60_000);

  it('returns focus to the label when Escape closes the scrollable panel', async () => {
    const page = await openPage({ width: 1440, height: 900 });
    try {
      await page.focus('[data-panel="about"] .panel-label');
      await page.keyboard.press('Enter');
      await page.waitForSelector('[data-panel="about"].is-content-visible', { timeout: 5_000 });
      // Control: focus really is inside the scroll region before Escape.
      expect(
        await page.evaluate(() =>
          document
            .querySelector('[data-panel="about"] .content-inner')
            .contains(document.activeElement),
        ),
      ).toBe(true);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(IDLE_SETTLE_MS);
      const after = await page.evaluate(() => ({
        onLabel:
          document.activeElement === document.querySelector('[data-panel="about"] .panel-label'),
        reopened: document.querySelector('[data-panel="about"]').classList.contains('is-open'),
      }));
      expect(after.onLabel, 'focus was not returned to the About label').toBe(true);
      expect(after.reopened, 'returning focus reopened the panel').toBe(false);
    } finally {
      await page.close();
    }
  }, 60_000);

  it('hands focus to the scroll region when Tab opens the panel', async () => {
    const page = await openPage({ width: 1440, height: 900 });
    try {
      // Reach the About label by real Tab presses, so focus is keyboard focus.
      let onAbout = false;
      for (let i = 0; i < 30 && !onAbout; i++) {
        await page.keyboard.press('Tab');
        onAbout = await page.evaluate(
          () =>
            document.activeElement === document.querySelector('[data-panel="about"] .panel-label'),
        );
      }
      expect(onAbout, 'Tab never reached the About label').toBe(true);
      await page.waitForSelector('[data-panel="about"].is-content-visible', { timeout: 5_000 });
      await page.waitForTimeout(200);
      expect(
        await page.evaluate(
          () =>
            document.activeElement ===
            document.querySelector('[data-panel="about"] .content-inner'),
        ),
        'focus stayed on the hidden label',
      ).toBe(true);
    } finally {
      await page.close();
    }
  }, 60_000);

  it('scrolls the focused region with Space and Shift+Space', async () => {
    // The panel's keydown handler took Enter and Space from anywhere inside
    // the panel, cancelled them, and then did nothing because the panel was
    // already open, so Space never reached the focused scroll region (#1049).
    const page = await openPage({ width: 1440, height: 900 });
    try {
      await page.focus('[data-panel="about"] .panel-label');
      await page.keyboard.press('Enter');
      await page.waitForSelector('[data-panel="about"].is-content-visible', { timeout: 5_000 });
      // Control: Enter on the label still opened the panel and handed focus
      // to a region that really scrolls, starting at its top.
      const before = await page.evaluate(() => {
        const ci = document.querySelector('[data-panel="about"] .content-inner');
        return {
          focused: document.activeElement === ci,
          capped: ci.scrollHeight - ci.clientHeight > 1,
          top: ci.scrollTop,
        };
      });
      expect(before).toEqual({ focused: true, capped: true, top: 0 });
      await page.keyboard.press('Space');
      await page.waitForTimeout(300);
      const down = await page.evaluate(
        () => document.querySelector('[data-panel="about"] .content-inner').scrollTop,
      );
      expect(down, 'Space did not scroll the focused region').toBeGreaterThan(0);
      await page.keyboard.press('Shift+Space');
      await page.waitForTimeout(300);
      const up = await page.evaluate(
        () => document.querySelector('[data-panel="about"] .content-inner').scrollTop,
      );
      expect(up, 'Shift+Space did not scroll the focused region back').toBeLessThan(down);
    } finally {
      await page.close();
    }
  }, 60_000);

  it('follows a link in the open text with Enter', async () => {
    // The same handler cancelled Enter on a link inside the open panel.
    const page = await openPage({ width: 1440, height: 900 });
    try {
      await page.focus('[data-panel="about"] .panel-label');
      await page.keyboard.press('Enter');
      await page.waitForSelector('[data-panel="about"].is-content-visible', { timeout: 5_000 });
      await page.evaluate(() => {
        window.__linkActivated = false;
        const link = document.querySelector('[data-panel="about"] .about-resume-link');
        // Record the activation and stay on the page.
        link.addEventListener('click', (event) => {
          window.__linkActivated = true;
          event.preventDefault();
        });
        link.focus();
      });
      await page.keyboard.press('Enter');
      await page.waitForTimeout(200);
      expect(
        await page.evaluate(() => window.__linkActivated),
        'Enter on a link in the open panel did not activate it',
      ).toBe(true);
    } finally {
      await page.close();
    }
  }, 60_000);

  describe('a pointer close or switch while focus is in the open text', () => {
    // A mouse leaving the panel, a click on a part of the page that takes no
    // focus, or a hover onto another panel hid the text that held keyboard
    // focus, and focus was left on the hidden content or the document body.
    // Chromium also blurs a focused element it hides, and the focusout that
    // produced turned a hover switch into a close of every panel (#1049).

    /** Keyboard-open About at 1440x900, where it is capped and takes focus. */
    async function keyboardOpenAbout(page) {
      await page.mouse.move(1, 1);
      await page.focus('[data-panel="about"] .panel-label');
      await page.keyboard.press('Enter');
      await page.waitForSelector('[data-panel="about"].is-content-visible', { timeout: 5_000 });
      // Control: focus really is in the scroll region before the pointer acts.
      expect(
        await page.evaluate(
          () =>
            document.activeElement ===
            document.querySelector('[data-panel="about"] .content-inner'),
        ),
        'the keyboard open did not put focus in the scroll region',
      ).toBe(true);
    }

    /** Where focus is, and whether a reader can see it. */
    function readFocus(page) {
      return page.evaluate(() => {
        const ae = document.activeElement;
        const panel = ae && ae.closest('.panel');
        const inHiddenText = Boolean(
          panel && ae.closest('.panel-content') && !panel.classList.contains('is-content-visible'),
        );
        return {
          visible: Boolean(ae) && ae !== document.body && ae.checkVisibility() && !inHiddenText,
          on: ae === document.body ? 'body' : ae.className,
          aboutLabel: ae === document.querySelector('[data-panel="about"] .panel-label'),
          projectsRegion: ae === document.querySelector('[data-panel="projects"] .content-inner'),
          open: [...document.querySelectorAll('[data-panel].is-open')].map((p) => p.dataset.panel),
        };
      });
    }

    /** A point beside the grid, on page background that takes no focus. */
    async function backgroundPoint(page) {
      const grid = await page.locator('.mondrian').boundingBox();
      const x = grid.x / 2;
      const y = grid.y + grid.height / 2;
      // Control: the point is off every panel and on nothing focusable.
      expect(
        await page.evaluate(
          ([px, py]) => {
            const el = document.elementFromPoint(px, py);
            return Boolean(el) && !el.closest('.panel') && !el.closest('a, button, [tabindex]');
          },
          [x, y],
        ),
        'the background point is on a panel or a focusable element',
      ).toBe(true);
      return { x, y };
    }

    it('returns focus to the label when the mouse leaves the panel', async () => {
      const page = await openPage({ width: 1440, height: 900 });
      try {
        await keyboardOpenAbout(page);
        const about = await page.locator('[data-panel="about"]').boundingBox();
        const out = await backgroundPoint(page);
        await page.mouse.move(about.x + about.width / 2, about.y + about.height / 2);
        await page.waitForTimeout(200);
        await page.mouse.move(out.x, out.y);
        await page.waitForTimeout(IDLE_SETTLE_MS + 300);
        const focus = await readFocus(page);
        expect(focus.open, 'the mouse leaving did not close About').toEqual([]);
        expect(focus.visible, `focus was left on hidden content (${focus.on})`).toBe(true);
        expect(focus.aboutLabel, `focus is not on the About label (${focus.on})`).toBe(true);
      } finally {
        await page.close();
      }
    }, 60_000);

    it('returns focus to the label when a click on the background closes the panel', async () => {
      const page = await openPage({ width: 1440, height: 900 });
      try {
        await keyboardOpenAbout(page);
        const out = await backgroundPoint(page);
        await page.mouse.click(out.x, out.y);
        await page.waitForTimeout(IDLE_SETTLE_MS + 300);
        const focus = await readFocus(page);
        expect(focus.visible, `focus was left on hidden content (${focus.on})`).toBe(true);
        expect(focus.aboutLabel, `focus is not on the About label (${focus.on})`).toBe(true);
        expect(focus.open, 'returning focus reopened a panel').toEqual([]);
      } finally {
        await page.close();
      }
    }, 60_000);

    it('moves focus into the new panel when a hover switches to it', async () => {
      const page = await openPage({ width: 1440, height: 900 });
      try {
        await keyboardOpenAbout(page);
        const projects = await page.locator('[data-panel="projects"]').boundingBox();
        await page.mouse.move(projects.x + projects.width / 2, projects.y + projects.height / 2);
        await page.waitForTimeout(IDLE_SETTLE_MS + 300);
        const focus = await readFocus(page);
        expect(focus.open, 'the hover did not switch to Projects').toEqual(['projects']);
        // Control: Projects is capped here, so its region is the target.
        expect(
          await page.evaluate(
            () =>
              document
                .querySelector('[data-panel="projects"] .content-inner')
                .getAttribute('tabindex') === '0',
          ),
        ).toBe(true);
        expect(focus.visible, `focus was left on hidden content (${focus.on})`).toBe(true);
        expect(focus.projectsRegion, `focus is not in the Projects region (${focus.on})`).toBe(
          true,
        );
      } finally {
        await page.close();
      }
    }, 60_000);

    it('keeps the open panel open when a click in it moves focus off a closed panel label', async () => {
      // A switch to a panel with no scroll region returns focus to the
      // previous panel's label, so focus sits in a panel that is not open. A
      // click on the open panel's text then blurred that label, and the
      // label's panel ran closePanel(), which closes whichever panel is open:
      // the one the reader had just clicked (#1049).
      const page = await openPage({ width: 1440, height: 900 });
      try {
        expect(await hoverPanel(page, 'about', { expectOpen: true })).toBe(true);
        const h1 = await page.locator('[data-panel="about"] h1').boundingBox();
        await page.mouse.click(h1.x + h1.width / 2, h1.y + h1.height / 2);
        // Control: the click put focus in About's scroll region.
        expect(
          await page.evaluate(
            () =>
              document.activeElement ===
              document.querySelector('[data-panel="about"] .content-inner'),
          ),
          'the click on About text did not focus its scroll region',
        ).toBe(true);
        const connect = await page.locator('[data-panel="connect"]').boundingBox();
        await page.mouse.move(connect.x + connect.width / 2, connect.y + connect.height / 2);
        await page.waitForTimeout(IDLE_SETTLE_MS + 300);
        const switched = await readFocus(page);
        // Control: the switch left focus on About's label with Connect open.
        expect(switched.open, 'the hover did not switch to Connect').toEqual(['connect']);
        expect(switched.aboutLabel, `focus is not on the About label (${switched.on})`).toBe(true);
        const h2 = await page.locator('[data-panel="connect"] h2').boundingBox();
        await page.mouse.click(h2.x + h2.width / 2, h2.y + h2.height / 2);
        await page.waitForTimeout(IDLE_SETTLE_MS + 300);
        expect((await readFocus(page)).open, 'a click on the open panel closed it').toEqual([
          'connect',
        ]);
      } finally {
        await page.close();
      }
    }, 60_000);

    it('returns focus to the label when a hover switches to a panel with no scroll region', async () => {
      // Connect fits at 1440x900, so there is no region to move focus into;
      // the previous panel's label, visible again, takes it (the new panel's
      // own label is hidden while it is open).
      const page = await openPage({ width: 1440, height: 900 });
      try {
        await keyboardOpenAbout(page);
        const connect = await page.locator('[data-panel="connect"]').boundingBox();
        await page.mouse.move(connect.x + connect.width / 2, connect.y + connect.height / 2);
        await page.waitForTimeout(IDLE_SETTLE_MS + 300);
        const focus = await readFocus(page);
        expect(focus.open, 'the hover did not switch to Connect').toEqual(['connect']);
        // Control: Connect has no scroll region here, so the fallback is taken.
        expect(
          await page.evaluate(() =>
            document
              .querySelector('[data-panel="connect"] .content-inner')
              .getAttribute('tabindex'),
          ),
          'Connect is capped here, so the fallback is not exercised',
        ).toBeNull();
        expect(focus.visible, `focus was left on hidden content (${focus.on})`).toBe(true);
        expect(focus.aboutLabel, `focus is not on the About label (${focus.on})`).toBe(true);
      } finally {
        await page.close();
      }
    }, 60_000);

    it('leaves focus where the reader moved it during a switch', async () => {
      const page = await openPage({ width: 1440, height: 900 });
      try {
        await keyboardOpenAbout(page);
        await page.evaluate(() => {
          const button = document.createElement('button');
          button.id = 'elsewhere';
          button.textContent = 'Elsewhere';
          button.style.cssText = 'position:fixed;top:8px;left:8px;z-index:99';
          document.body.append(button);
          // Slow the switch's last phase so the reader's move lands inside it.
          document.documentElement.style.setProperty('--motion-plane', '2000ms');
        });
        const projects = await page.locator('[data-panel="projects"]').boundingBox();
        await page.mouse.move(projects.x + projects.width / 2, projects.y + projects.height / 2);
        // Past phase 2: Projects is open and About is not, so the move below
        // is not focus leaving the open panel, which would close it.
        await page.waitForFunction(
          () =>
            document.querySelector('[data-panel="projects"]').classList.contains('is-open') &&
            !document.querySelector('[data-panel="about"]').classList.contains('is-open'),
          null,
          { timeout: 5_000 },
        );
        const switching = await page.evaluate(() => {
          document.getElementById('elsewhere').focus();
          return !document
            .querySelector('[data-panel="projects"]')
            .classList.contains('is-content-visible');
        });
        // Precondition, read after the move: the switch has not yet returned focus.
        expect(switching, 'the move landed after the switch settled').toBe(true);
        await page.evaluate(() => document.documentElement.style.removeProperty('--motion-plane'));
        await page.waitForSelector('[data-panel="projects"].is-content-visible', {
          timeout: 5_000,
        });
        await page.waitForTimeout(300);
        const after = await page.evaluate(() => ({
          id: document.activeElement.id,
          open: [...document.querySelectorAll('[data-panel].is-open')].map((p) => p.dataset.panel),
        }));
        expect(after.open, 'the move closed the switch').toEqual(['projects']);
        expect(after.id, 'the switch took focus back from where the reader moved it').toBe(
          'elsewhere',
        );
      } finally {
        await page.close();
      }
    }, 60_000);

    it('leaves focus where the reader moved it during the close', async () => {
      const page = await openPage({ width: 1440, height: 900 });
      try {
        // Slow the close so the reader's own move lands inside it.
        await page.evaluate(() =>
          document.documentElement.style.setProperty('--motion-fast', '600ms'),
        );
        await keyboardOpenAbout(page);
        const out = await backgroundPoint(page);
        // The homepage has nothing focusable outside the grid, and a panel
        // label would open its panel, so the visible target is a fixture.
        await page.evaluate(() => {
          const button = document.createElement('button');
          button.id = 'elsewhere';
          button.textContent = 'Elsewhere';
          button.style.cssText = 'position:fixed;top:8px;left:8px;z-index:99';
          document.body.append(button);
        });
        await page.mouse.click(out.x, out.y);
        // A genuine move to a visible element before the close settles. The
        // precondition is read after the move, in the same task: About loses
        // is-open in the same timer callback that returns focus, so a move
        // that landed after that (a stalled round trip) fails here instead of
        // passing whether or not the guard exists.
        const closing = await page.evaluate(() => {
          document.getElementById('elsewhere').focus();
          return document.querySelector('[data-panel="about"]').classList.contains('is-open');
        });
        expect(closing, 'the move landed after the close settled').toBe(true);
        await page.evaluate(() => document.documentElement.style.removeProperty('--motion-fast'));
        await page.waitForTimeout(IDLE_SETTLE_MS + 600);
        expect(
          await page.evaluate(() => document.activeElement.id),
          'the focus return overrode where the reader moved focus',
        ).toBe('elsewhere');
      } finally {
        await page.close();
      }
    }, 60_000);
  });

  it('keeps the panel open and focus in place when a resize lets the focused region fit', async () => {
    // The measure pass removed the "scrollable" tab stop from the region that
    // held focus, the browser blurred it, and the focusout read the blur as the
    // reader leaving and closed the panel under them (#1049).
    const page = await openPage({ width: 1440, height: 900 });
    try {
      await page.focus('[data-panel="about"] .panel-label');
      await page.keyboard.press('Enter');
      await page.waitForSelector('[data-panel="about"].is-content-visible', { timeout: 5_000 });
      const regionState = () =>
        page.evaluate(() => {
          const ci = document.querySelector('[data-panel="about"] .content-inner');
          return {
            focused: document.activeElement === ci,
            below: ci.scrollHeight - ci.clientHeight,
            tabindex: ci.getAttribute('tabindex'),
            role: ci.getAttribute('role'),
            open: [...document.querySelectorAll('[data-panel].is-open')].map(
              (p) => p.dataset.panel,
            ),
          };
        });
      // Control: focus is in a region that really scrolls before the resize.
      const before = await regionState();
      expect(before.focused, 'the keyboard open did not put focus in the region').toBe(true);
      expect(before.tabindex).toBe('0');
      expect(before.below).toBeGreaterThan(1);
      await page.setViewportSize({ width: 2560, height: 1440 });
      await page.waitForTimeout(IDLE_SETTLE_MS + 300);
      const after = await regionState();
      expect(after.open, 'the resize closed the panel the reader was in').toEqual(['about']);
      // Control: the resize really let About fit, so the tab stop had to go.
      expect(after.below, 'About is still capped at 2560x1440').toBeLessThanOrEqual(1);
      expect(after.focused, 'focus left the region the reader was in').toBe(true);
      expect(after.tabindex, 'a region that fits is still a tab stop').not.toBe('0');
      expect(after.role, 'a region that fits is still announced as scrollable').toBeNull();
      // Once focus moves on, the region keeps no tabindex at all.
      await page.keyboard.press('Tab');
      expect(
        await page.evaluate(() =>
          document.querySelector('[data-panel="about"] .content-inner').getAttribute('tabindex'),
        ),
        'the region kept its tabindex after focus moved on',
      ).toBeNull();
    } finally {
      await page.close();
    }
  }, 60_000);

  it('keeps the reader scroll position across a desktop resize', async () => {
    // A guard, not a fix: the measure pass briefly switches panel scrolling
    // off, and Codex asked whether that resets a capped panel's scrollTop.
    // Measured, it does not, in Chromium, WebKit or Firefox (120 before, 120
    // after, with the pass observed to run), so no restore code was added.
    // This pins the behavior so a future change to the pass cannot regress it.
    const page = await openPage({ width: 1440, height: 900 });
    try {
      expect(await hoverPanel(page, 'about', { expectOpen: true })).toBe(true);
      await page.evaluate(() => {
        document.querySelector('[data-panel="about"] .content-inner').scrollTop = 120;
      });
      await page.setViewportSize({ width: 1500, height: 920 });
      await page.waitForTimeout(IDLE_SETTLE_MS);
      const top = await page.evaluate(
        () => document.querySelector('[data-panel="about"] .content-inner').scrollTop,
      );
      expect(top, 'the resize measure pass reset the scroll position').toBeGreaterThan(100);
    } finally {
      await page.close();
    }
  }, 60_000);

  it('does not carry an interrupted keyboard open over to a later mouse open', async () => {
    const page = await openPage({ width: 1440, height: 900 });
    try {
      // Slow the reveal so Escape is guaranteed to interrupt it: focusing the
      // label already starts an open, and if its reveal ran first it would
      // clear the flag itself and this test would pass vacuously (CodeRabbit,
      // PR #1046).
      await page.evaluate(() =>
        document.documentElement.style.setProperty('--motion-plane', '2000ms'),
      );
      await page.focus('[data-panel="about"] .panel-label');
      await page.keyboard.press('Enter');
      // Precondition: the reveal has not happened yet.
      expect(
        await page.evaluate(
          () =>
            !document
              .querySelector('[data-panel="about"]')
              .classList.contains('is-content-visible'),
        ),
      ).toBe(true);
      await page.evaluate(() => document.documentElement.style.removeProperty('--motion-plane'));
      await page.keyboard.press('Escape');
      await page.waitForTimeout(IDLE_SETTLE_MS);
      await page.evaluate(() => document.activeElement && document.activeElement.blur());
      expect(await hoverPanel(page, 'about', { expectOpen: true })).toBe(true);
      await page.waitForTimeout(200);
      expect(
        await page.evaluate(() =>
          document
            .querySelector('[data-panel="about"] .content-inner')
            .contains(document.activeElement),
        ),
        'a mouse open took focus left armed by an interrupted keyboard open',
      ).toBe(false);
    } finally {
      await page.close();
    }
  }, 60_000);

  it('adds no tab stop when the panel fits', async () => {
    const page = await openPage({ width: 1920, height: 1200 });
    try {
      expect(await hoverPanel(page, 'about', { expectOpen: true })).toBe(true);
      const state = await page.evaluate(() => {
        const ci = document.querySelector('[data-panel="about"] .content-inner');
        return {
          tabindex: ci.getAttribute('tabindex'),
          capped: ci.scrollHeight - ci.clientHeight > 1,
        };
      });
      expect(state.capped).toBe(false);
      expect(state.tabindex).toBeNull();
    } finally {
      await page.close();
    }
  }, 60_000);
});

describe('scroll cue across a desktop resize', () => {
  it('keeps the cue on a panel that is still capped after the measure pass', async () => {
    // A resize runs the measure pass, which switches panel scrolling off while
    // it measures. The cue must be recomputed after that, not during it, or it
    // reads "nothing below" and clears the fade on a still-capped panel
    // (CodeRabbit, PR #1046).
    const page = await openPage({ width: 1440, height: 900 });
    try {
      expect(await hoverPanel(page, 'about', { expectOpen: true })).toBe(true);
      // Clear the cue the open already set, so the assertion below proves the
      // measure pass put it back rather than that nothing touched it
      // (CodeRabbit, PR #1046).
      const cleared = await page.evaluate(() => {
        const ci = document.querySelector('[data-panel="about"] .content-inner');
        ci.classList.remove('has-more-below');
        return !ci.classList.contains('has-more-below');
      });
      expect(cleared).toBe(true);
      await page.setViewportSize({ width: 1500, height: 920 });
      // The measure pass is debounced 150ms after resize, then ends a frame later.
      await page.waitForTimeout(IDLE_SETTLE_MS);
      const state = await page.evaluate(() => {
        const ci = document.querySelector('[data-panel="about"] .content-inner');
        return {
          below: ci.scrollHeight - ci.clientHeight,
          cue: ci.classList.contains('has-more-below'),
        };
      });
      // Control: still capped, so there is text below to cue.
      expect(state.below).toBeGreaterThan(1);
      expect(state.cue, 'cue cleared by the measure pass on a capped panel').toBe(true);
    } finally {
      await page.close();
    }
  }, 60_000);
});

describe('scroll cue on a keyboard open, with the morph animating', () => {
  it('decides scrollability against the settled panel, not the morph in flight', async () => {
    // The reveal ran one --motion-plane after the morph was committed, but the
    // pixel morph's transition starts a frame later, so at the reveal the
    // tracks could still be a pixel or two short (a narrower column wrapping
    // one more line). A panel that fits by a pixel was then given the fade and
    // a "scrollable" tab stop, and a keyboard open moved focus into a region
    // that does not scroll; nothing corrected it until a scroll (#1049). These
    // heights at 1920 wide are the ones a sweep caught it at: each panel
    // settles within a pixel of fitting.
    const page = await browser.newPage({ viewport: { width: 1920, height: 1061 } });
    try {
      await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(IDLE_SETTLE_MS);
      const cases = [
        { height: 1061, name: 'about' },
        { height: 1036, name: 'projects' },
        { height: 1052, name: 'projects' },
      ];
      let fitsByAPixel = 0;
      for (const { height, name } of cases) {
        await page.setViewportSize({ width: 1920, height });
        // The measure pass is debounced 150ms after the resize.
        await page.waitForTimeout(IDLE_SETTLE_MS);
        await page.focus(`[data-panel="${name}"] .panel-label`);
        await page.keyboard.press('Enter');
        await page.waitForSelector(`[data-panel="${name}"].is-content-visible`, { timeout: 5_000 });
        // Past the morph's hand-back to the stylesheet (--motion-plane + 60ms).
        await page.waitForTimeout(IDLE_SETTLE_MS);
        const s = await page.evaluate((n) => {
          const ci = document.querySelector(`[data-panel="${n}"] .content-inner`);
          return {
            below: ci.scrollHeight - ci.clientHeight,
            tabindex: ci.getAttribute('tabindex'),
            cue: ci.classList.contains('has-more-below'),
            focused: document.activeElement === ci,
          };
        }, name);
        const at = `${name} at 1920x${height} (${s.below}px below)`;
        if (s.below <= 1) {
          fitsByAPixel++;
          expect(s.tabindex, `${at} fits but kept a "scrollable" tab stop`).toBeNull();
          expect(s.cue, `${at} fits but kept the fade`).toBe(false);
          expect(s.focused, `${at} fits but took focus into its text`).toBe(false);
        } else {
          expect(s.tabindex, `${at} scrolls but has no tab stop`).toBe('0');
        }
        await page.keyboard.press('Escape');
        await page.waitForTimeout(IDLE_SETTLE_MS + 300);
        await page.evaluate(() => document.activeElement && document.activeElement.blur());
      }
      // Control: the heights still put a panel within a pixel of fitting, so
      // the fit assertions above ran.
      expect(fitsByAPixel, 'no case settled within a pixel of fitting').toBeGreaterThan(0);
    } finally {
      await page.close();
    }
  }, 90_000);
});

describe('scroll cue across a resize into the stack', () => {
  it('does not fade panel text in the stack after a desktop open set the cue', async () => {
    // The cue class is only recomputed on desktop, so a panel opened there
    // and then resized under the floor keeps it. The fade must be scoped to
    // the composition, or it would cover the bottom 3rem of that panel's
    // text in the stack.
    const page = await openPage({ width: 1440, height: 900 });
    try {
      expect(await hoverPanel(page, 'about', { expectOpen: true })).toBe(true);
      const cue = () =>
        page.evaluate(() => {
          const ci = document.querySelector('[data-panel="about"] .content-inner');
          return {
            cls: ci.classList.contains('has-more-below'),
            mask: getComputedStyle(ci).maskImage,
          };
        });
      // Control: the cue is really set before the resize.
      const before = await cue();
      expect(before.cls).toBe(true);
      expect(
        await page.evaluate(() =>
          document.querySelector('[data-panel="about"] .content-inner').getAttribute('tabindex'),
        ),
      ).toBe('0');
      expect(before.mask).not.toBe('none');
      await page.setViewportSize({ width: 1440, height: 800 });
      await page.waitForTimeout(IDLE_SETTLE_MS);
      expect(await isComposition(page), 'did not reach the stack').toBe(false);
      expect((await cue()).mask).toBe('none');
      // And no leftover "scrollable" tab stop in the stack (CodeRabbit, PR #1046).
      const attrs = await page.evaluate(() => {
        const ci = document.querySelector('[data-panel="about"] .content-inner');
        return { tabindex: ci.getAttribute('tabindex'), label: ci.getAttribute('aria-label') };
      });
      expect(attrs).toEqual({ tabindex: null, label: null });
    } finally {
      await page.close();
    }
  }, 60_000);
});

/**
 * The grid morph animates instead of snapping.
 *
 * Every focus template mixes `fr` tracks with fixed-length ones, and a track
 * list only interpolates when each track keeps the same kind of size, so the
 * plain CSS transition flipped the whole list at its midpoint: opening About,
 * Projects or Connect crept a few pixels and then jumped, a single-frame step
 * of 87-104% of the track's travel in Chromium, WebKit and Firefox alike. The
 * state machine now drives the morph between resolved pixel track lists.
 *
 * Sampled every animation frame with transitions ON (openPage kills them for
 * the geometry tests above). A real animation over the 460ms --motion-plane
 * moves a track about 10% per frame at 60fps; 35% leaves room for a slow
 * frame and still fails a snap by a wide margin.
 */
const MAX_FRAME_STEP = 0.35;

async function sampleMorph(page, action) {
  return page.evaluate(async (act) => {
    const grid = document.querySelector('.mondrian');
    const read = () => {
      const cs = getComputedStyle(grid);
      return [...cs.gridTemplateRows.split(' '), ...cs.gridTemplateColumns.split(' ')].map(
        parseFloat,
      );
    };
    const samples = [read()];
    if (act.type === 'open') document.querySelector(`[data-panel="${act.panel}"]`).click();
    else document.body.click();
    const t0 = performance.now();
    await new Promise((resolve) => {
      const frame = () => {
        samples.push(read());
        if (performance.now() - t0 < 900) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });
    let worst = 0;
    let moved = 0;
    for (let t = 0; t < samples[0].length; t++) {
      const travel = Math.abs(samples[samples.length - 1][t] - samples[0][t]);
      if (travel < 20) continue;
      moved++;
      let step = 0;
      for (let i = 1; i < samples.length; i++)
        step = Math.max(step, Math.abs(samples[i][t] - samples[i - 1][t]));
      worst = Math.max(worst, step / travel);
    }
    return {
      worst,
      moved,
      inlineLeft: grid.style.gridTemplateRows || grid.style.gridTemplateColumns,
      focus: grid.dataset.focus || null,
      open: [...document.querySelectorAll('[data-panel].is-open')].map((p) => p.dataset.panel),
    };
  }, action);
}

async function openMorphPage() {
  const page = await browser.newPage({ viewport: { width: 1885, height: 987 } });
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(IDLE_SETTLE_MS);
  return page;
}

describe('the grid morph animates', () => {
  it('opens and closes every panel without a single-frame jump, and hands back to the stylesheet', async () => {
    const page = await openMorphPage();
    try {
      for (const panel of PANELS) {
        const open = await sampleMorph(page, { type: 'open', panel });
        // Control: the open really moved tracks, or "no jump" is vacuous.
        expect(open.moved, `${panel} open moved no track`).toBeGreaterThan(0);
        expect(open.open, `${panel} did not open from rest`).toEqual([panel]);
        expect(open.worst, `${panel} open jumps`).toBeLessThan(MAX_FRAME_STEP);
        expect(open.inlineLeft, `${panel} left inline tracks after the morph`).toBe('');
        const close = await sampleMorph(page, { type: 'close' });
        // Control: the close really happened and moved tracks. With no close,
        // nothing moves, the worst step stays 0, and "no jump" passed, while
        // each later "open" was really a switch.
        expect(close.focus, `${panel} did not close: the grid kept data-focus`).toBeNull();
        expect(close.open, `${panel} did not close: a panel kept is-open`).toEqual([]);
        expect(close.moved, `${panel} close moved no track`).toBeGreaterThan(0);
        expect(close.worst, `${panel} close jumps`).toBeLessThan(MAX_FRAME_STEP);
        expect(close.inlineLeft, `${panel} left inline tracks after the close`).toBe('');
        await page.waitForTimeout(IDLE_SETTLE_MS);
      }
    } finally {
      await page.close();
    }
  }, 90_000);

  it('switches between panels without a single-frame jump, and hands back to the stylesheet', async () => {
    // A switch is the third place the morph runs (startSwitch). Every pair
    // except About and Projects snapped without it (a worst step of 0.9-1.35
    // of the travel), so the chain below is made of the pairs that snapped.
    const chain = ['about', 'community', 'connect', 'projects', 'community', 'about', 'connect'];
    const page = await openMorphPage();
    try {
      const first = await sampleMorph(page, { type: 'open', panel: chain[0] });
      expect(first.open, `${chain[0]} did not open`).toEqual([chain[0]]);
      await page.waitForTimeout(IDLE_SETTLE_MS);
      for (let i = 1; i < chain.length; i++) {
        const pair = `${chain[i - 1]} -> ${chain[i]}`;
        const sw = await sampleMorph(page, { type: 'open', panel: chain[i] });
        // Control: the switch really landed and moved tracks.
        expect(sw.open, `${pair} did not switch`).toEqual([chain[i]]);
        expect(sw.moved, `${pair} moved no track`).toBeGreaterThan(0);
        expect(sw.worst, `${pair} jumps`).toBeLessThan(MAX_FRAME_STEP);
        expect(sw.inlineLeft, `${pair} left inline tracks after the morph`).toBe('');
        await page.waitForTimeout(IDLE_SETTLE_MS);
      }
    } finally {
      await page.close();
    }
  }, 90_000);
});

describe('the grid morph in the stack', () => {
  // Inline pixel tracks override the stack's media-query template. The morph
  // ran in the stack (the stack's resize handler closes the open panel), and a
  // desktop morph still in flight on entering the stack was only cleared by
  // its own timer, so for up to half a second the stack kept nine desktop
  // columns, or a 986px-wide grid in a 600px viewport (#1049).

  /** Record every animation frame in the stack that still has inline tracks. */
  async function watchStack(page) {
    await page.evaluate(() => {
      const grid = document.querySelector('.mondrian');
      window.__stack = { frames: 0, bad: [] };
      const frame = () => {
        if (matchMedia('(max-width: 1023px), (max-height: 839px)').matches) {
          window.__stack.frames++;
          const inline = grid.style.gridTemplateRows || grid.style.gridTemplateColumns;
          const widest = Math.max(
            ...[...grid.querySelectorAll('.panel')].map((p) => p.getBoundingClientRect().right),
          );
          if (inline || widest > window.innerWidth + 1) {
            window.__stack.bad.push({ inline, widest, viewport: window.innerWidth });
          }
        }
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
  }

  async function openMidMorph(page) {
    await page.evaluate(() => document.querySelector('[data-panel="about"]').click());
    await page.waitForTimeout(100);
    // Precondition: the desktop morph is in flight.
    expect(
      await page.evaluate(() => document.querySelector('.mondrian').style.gridTemplateColumns),
      'no desktop morph was in flight',
    ).not.toBe('');
  }

  it('leaves no pixel tracks over the stack when a resize lands mid-morph', async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    try {
      await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(IDLE_SETTLE_MS);
      await watchStack(page);
      await openMidMorph(page);
      await page.setViewportSize({ width: 900, height: 900 });
      await page.waitForTimeout(900);
      const seen = await page.evaluate(() => window.__stack);
      // Control: the page really spent frames in the stack.
      expect(seen.frames, 'never reached the stack').toBeGreaterThan(0);
      expect(
        seen.bad.length,
        `the stack kept inline morph tracks: ${JSON.stringify(seen.bad[0])}`,
      ).toBe(0);
    } finally {
      await page.close();
    }
  }, 60_000);

  it('leaves no pixel tracks over the stack when an open panel is resized down through it', async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    try {
      await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(IDLE_SETTLE_MS);
      await page.evaluate(() => document.querySelector('[data-panel="about"]').click());
      await page.waitForSelector('[data-panel="about"].is-content-visible', { timeout: 5_000 });
      await page.waitForTimeout(IDLE_SETTLE_MS);
      await watchStack(page);
      await page.setViewportSize({ width: 1000, height: 900 });
      await page.waitForTimeout(250);
      await page.setViewportSize({ width: 600, height: 900 });
      await page.waitForTimeout(900);
      const seen = await page.evaluate(() => window.__stack);
      expect(seen.frames, 'never reached the stack').toBeGreaterThan(0);
      expect(
        seen.bad.length,
        `the stack kept inline morph tracks: ${JSON.stringify(seen.bad[0])}`,
      ).toBe(0);
    } finally {
      await page.close();
    }
  }, 60_000);
});

describe('the on-load pulse', () => {
  async function pulsedPanels(viewport) {
    const page = await browser.newPage({ viewport });
    try {
      await page.addInitScript(() => {
        window.__pulsed = [];
        new MutationObserver((records) => {
          for (const r of records) {
            if (r.target.classList && r.target.classList.contains('panel--pulsing')) {
              window.__pulsed.push(r.target.dataset.panel);
            }
          }
        }).observe(document, { subtree: true, attributes: true, attributeFilter: ['class'] });
      });
      await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      // The sequence starts ~300ms after fonts settle and steps panel by panel.
      await page.waitForTimeout(4_500);
      return page.evaluate(() => [...new Set(window.__pulsed)]);
    } finally {
      await page.close();
    }
  }

  it('pulses the panels in the composition, where they open', async () => {
    // Control for the stack case: the sequence really runs on this page.
    expect(await pulsedPanels({ width: 1885, height: 987 })).toHaveLength(4);
  }, 60_000);

  it('does not pulse after a resize into the stack during load', async () => {
    // The stack check was made once, when the sequence was scheduled, so a
    // window resized into the stack before the first pulse fired still pulsed
    // all four panels there (#1049).
    const page = await browser.newPage({ viewport: { width: 1885, height: 987 } });
    try {
      await page.addInitScript(() => {
        window.__pulsedInStack = [];
        new MutationObserver((records) => {
          for (const r of records) {
            if (
              r.target.classList &&
              r.target.classList.contains('panel--pulsing') &&
              matchMedia('(max-width: 1023px), (max-height: 839px)').matches
            ) {
              window.__pulsedInStack.push(r.target.dataset.panel);
            }
          }
        }).observe(document, { subtree: true, attributes: true, attributeFilter: ['class'] });
      });
      await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
      // The sequence is scheduled at desktop size; the first pulse is ~300ms
      // after fonts settle, so this resize lands before it.
      await page.setViewportSize({ width: 900, height: 900 });
      await page.waitForTimeout(4_500);
      // Control: the page really is in the stack.
      expect(await isComposition(page), 'did not reach the stack').toBe(false);
      expect(
        await page.evaluate(() => [...new Set(window.__pulsedInStack)]),
        'panels pulsed in the stack',
      ).toEqual([]);
    } finally {
      await page.close();
    }
  }, 60_000);

  it('does not pulse in the stack, where nothing opens', async () => {
    // It says "these tiles open"; a wide stacked page was flashing a
    // full-width block for nothing.
    expect(await pulsedPanels({ width: 1920, height: 800 })).toEqual([]);
    expect(await pulsedPanels({ width: 390, height: 844 })).toEqual([]);
  }, 60_000);
});
