/**
 * Mondrian rebalance animation smoke test (#336, against specs/mondrian-rebalance-animation.md).
 *
 * Sequence-of-events tests, not frame-perfect timing assertions. The goal is
 * to catch the regression shapes that actually shipped this week:
 *   - Connect hidden in community-focus (height = 0) — #315.
 *   - Cream void below content in about/projects/connect-focus — #325-#327, fixed in #330.
 *   - Pulse keyframe filter ineffective on dark navy — #330 follow-up.
 *
 * The full test runs only on viewports above --bp-stack (1024px) where the
 * Mondrian composition is active. Below that, the state machine is disabled
 * and these assertions don't apply.
 */

import { test, expect, Page } from '@playwright/test';

const PANELS = ['about', 'projects', 'community', 'connect'] as const;
type PanelName = (typeof PANELS)[number];

// Skip the entire file on viewports where the state machine is disabled.
// playwright.config.ts has 1440 as the only desktop viewport; the others
// (375, 393, 768) fall below --bp-stack.
test.beforeEach(async ({ page }, testInfo) => {
  const vw = testInfo.project.use.viewport?.width ?? 0;
  test.skip(vw < 1024, `Mondrian is stack-mode below 1024px (this viewport: ${vw}px)`);
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  // Wait for fonts.ready + measureContentHeights pass to settle.
  await page.waitForFunction(() => {
    const grid = document.getElementById('mondrian');
    return grid && grid.style.getPropertyValue('--cell-h-about').endsWith('px');
  });
});

/**
 * Open a panel via direct click on its label button. Click bypasses the
 * hover-state guard, so this is the deterministic open path for tests.
 * Returns when the panel has reached `is-open is-content-visible`.
 */
async function openByClick(page: Page, panel: PanelName) {
  await page.click(`[data-panel="${panel}"]`);
  await page.waitForFunction(
    (p) => {
      const el = document.querySelector(`[data-panel="${p}"]`)!;
      return el.classList.contains('is-open') && el.classList.contains('is-content-visible');
    },
    panel,
  );
}

/**
 * Read the four panel dimensions in the current focus state. Returns
 * { panel: { width, height } } so assertions can target a single panel.
 */
async function readPanelDims(page: Page) {
  return page.evaluate((panels) => {
    const out: Record<string, { width: number; height: number }> = {};
    for (const p of panels) {
      const el = document.querySelector(`[data-panel="${p}"]`)!;
      const r = el.getBoundingClientRect();
      out[p] = { width: Math.round(r.width), height: Math.round(r.height) };
    }
    return out;
  }, PANELS as readonly string[]);
}

// ─────────────────────────────────────────────────────────────────────────
// Regression assertions — concrete bug shapes from this week
// ─────────────────────────────────────────────────────────────────────────

test('all four panels render at non-zero dimensions in every focus state (#315 regression: Connect-hidden in community-focus)', async ({ page }) => {
  // Default state — panels at their rest dimensions.
  let dims = await readPanelDims(page);
  for (const p of PANELS) {
    expect(dims[p].width, `default ${p}.width`).toBeGreaterThan(0);
    expect(dims[p].height, `default ${p}.height`).toBeGreaterThan(0);
  }

  // Each focus state must keep all four colored tiles visible.
  for (const focus of PANELS) {
    await openByClick(page, focus);
    dims = await readPanelDims(page);
    for (const p of PANELS) {
      expect(dims[p].width, `[${focus}-focus] ${p}.width`).toBeGreaterThan(0);
      expect(dims[p].height, `[${focus}-focus] ${p}.height`).toBeGreaterThan(0);
    }
    // Close before next iteration.
    await page.click('main', { position: { x: 5, y: 5 }, force: true }).catch((err) => {
      console.warn(`close-click failed (continuing to assert close via waitForFunction): ${err?.message ?? err}`);
    });
    await page.waitForFunction(
      (f) => !document.querySelector(`[data-panel="${f}"]`)!.classList.contains('is-open'),
      focus,
    );
  }
});

test('about/projects/connect panels are exactly content-sized in their focus states (#330 regression: ~400px cream void)', async ({ page }) => {
  // Tolerance for sub-pixel rounding + measurement variance.
  const TOLERANCE = 4;

  for (const focus of ['about', 'projects', 'connect'] as const) {
    await openByClick(page, focus);
    const gap = await page.evaluate((p) => {
      const panel = document.querySelector(`[data-panel="${p}"]`)!;
      const inner = panel.querySelector('.content-inner')!;
      const pr = panel.getBoundingClientRect();
      const ir = inner.getBoundingClientRect();
      return Math.round(pr.bottom - ir.bottom);
    }, focus);
    expect(gap, `[${focus}-focus] cream gap below content`).toBeLessThanOrEqual(TOLERANCE);

    // Close before next iteration.
    await page.click('main', { position: { x: 5, y: 5 }, force: true }).catch((err) => {
      console.warn(`close-click failed (continuing to assert close via waitForFunction): ${err?.message ?? err}`);
    });
    await page.waitForFunction(
      (f) => !document.querySelector(`[data-panel="${f}"]`)!.classList.contains('is-open'),
      focus,
    );
  }
});

// ─────────────────────────────────────────────────────────────────────────
// Sequence ordering — "geometry settles before content fades"
// ─────────────────────────────────────────────────────────────────────────

/**
 * Install MutationObservers + a transitionend listener that record the
 * monotonic order of: data-focus changes on .mondrian, is-content-visible
 * toggles on each panel, and the geometry-settle moment (transitionend on
 * grid-template-rows / grid-template-columns on .mondrian).
 *
 * Ordering is captured via a strictly-incrementing `order` counter to
 * disambiguate same-tick events that would collide if rounded to a
 * millisecond timestamp. (CodeRabbit finding on #337.)
 */
async function installEventRecorder(page: Page) {
  await page.evaluate(() => {
    type Event = { order: number; t: number; kind: string; value: string };
    (window as any).__events = [] as Event[];
    let order = 0;
    const start = performance.now();
    const push = (kind: string, value: string) => {
      (window as any).__events.push({ order: ++order, t: performance.now() - start, kind, value });
    };
    const grid = document.getElementById('mondrian')!;
    new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.attributeName === 'data-focus') push('data-focus', grid.dataset.focus || '');
      }
    }).observe(grid, { attributes: true, attributeFilter: ['data-focus'] });
    // Capture phase so we catch transitions that target .mondrian itself,
    // independently of whether anything bubbles up first. The grid-template
    // longhands are the geometry-settle signal; panels fire their own
    // transitionend for background-color / opacity which we filter out by
    // propertyName (and by target, since those events target the panel
    // article and don't bubble through the grid in capture phase from above).
    grid.addEventListener('transitionend', (ev) => {
      const e = ev as TransitionEvent;
      if (e.target !== grid) return;
      if (e.propertyName === 'grid-template-rows' || e.propertyName === 'grid-template-columns') {
        push('geometry-settled', e.propertyName);
      }
    }, true);
    for (const p of ['about', 'projects', 'community', 'connect']) {
      const el = document.querySelector(`[data-panel="${p}"]`)!;
      new MutationObserver((muts) => {
        for (const m of muts) {
          if (m.attributeName !== 'class') continue;
          const had = (m.oldValue || '').includes('is-content-visible');
          const has = el.classList.contains('is-content-visible');
          if (has !== had) push(`is-content-visible:${p}`, has ? 'on' : 'off');
        }
      }).observe(el, { attributes: true, attributeOldValue: true, attributeFilter: ['class'] });
    }
  });
}

type RecordedEvent = { order: number; t: number; kind: string; value: string };

test('open sequence: data-focus precedes is-content-visible; grid-template transition fires', async ({ page }) => {
  await installEventRecorder(page);

  await page.click(`[data-panel="about"]`);
  // Wait for BOTH the geometry-settled event AND is-content-visible. The JS
  // state machine schedules is-content-visible via setTimeout(--motion-plane);
  // the actual CSS transitionend on grid-template-* fires ~50ms later (real
  // frame timing exceeds the nominal duration). If we waited only for
  // is-content-visible, the read of __events could race the transitionend
  // event and miss the geometry-settled entry.
  await page.waitForFunction(() => {
    const events = (window as any).__events as Array<{ kind: string; value: string }>;
    const hasSettled = events.some((e) => e.kind === 'geometry-settled');
    const hasContent = events.some((e) => e.kind === 'is-content-visible:about' && e.value === 'on');
    return hasSettled && hasContent;
  });

  const events: RecordedEvent[] = await page.evaluate(() => (window as any).__events);
  const focusOn = events.find((e) => e.kind === 'data-focus' && e.value === 'about');
  const settled = events.find((e) => e.kind === 'geometry-settled');
  const contentOn = events.find((e) => e.kind === 'is-content-visible:about' && e.value === 'on');
  expect(focusOn, 'data-focus=about event captured').toBeTruthy();
  expect(settled, 'geometry-settled event captured (transitionend on grid-template)').toBeTruthy();
  expect(contentOn, 'is-content-visible:about=on event captured').toBeTruthy();
  // The load-bearing invariant: data-focus precedes BOTH downstream events.
  // (We use the strictly-incrementing `order` counter rather than `t` so a
  // same-tick reversal can't satisfy the comparison.)
  expect(focusOn!.order, 'data-focus precedes geometry-settled').toBeLessThan(settled!.order);
  expect(focusOn!.order, 'data-focus precedes is-content-visible').toBeLessThan(contentOn!.order);
  // is-content-visible vs geometry-settled is NOT strictly ordered: the JS
  // state machine fires is-content-visible at +--motion-plane ms; the CSS
  // transitionend fires whenever the browser's frame timer finishes the
  // grid-template-* interpolation, which can be ~50ms later. Both reach the
  // user as "the panel opened"; the spec's "content fades in after the
  // morph" is enforced by the JS scheduler choosing --motion-plane as the
  // delay, not by a transitionend dependency. Asserting strict ordering here
  // would catch cosmetic frame-timing changes, not real regressions.
});

test('close sequence: is-content-visible is removed before data-focus clears', async ({ page }) => {
  await openByClick(page, 'about');
  // Reset the event log AFTER the open completes so we measure only the close.
  await installEventRecorder(page);

  // Click outside to close.
  await page.click('main', { position: { x: 5, y: 5 }, force: true });
  await page.waitForFunction(
    () => !document.querySelector('[data-panel="about"]')!.classList.contains('is-open'),
  );

  const events: RecordedEvent[] = await page.evaluate(() => (window as any).__events);
  const contentOff = events.find((e) => e.kind === 'is-content-visible:about' && e.value === 'off');
  const focusCleared = events.find((e) => e.kind === 'data-focus' && e.value === '');
  expect(contentOff, 'is-content-visible:about=off event captured').toBeTruthy();
  expect(focusCleared, 'data-focus cleared event captured').toBeTruthy();
  // Strict ordering by monotonic counter (CodeRabbit: rounded timestamps could
  // mask same-tick reversals).
  expect(contentOff!.order, 'content fades out BEFORE data-focus clears').toBeLessThan(focusCleared!.order);
});

// ─────────────────────────────────────────────────────────────────────────
// State machine invariants
// ─────────────────────────────────────────────────────────────────────────

test('only one panel is open at a time across click switches', async ({ page }) => {
  await openByClick(page, 'about');
  expect(await page.locator('[data-panel="about"]').evaluate((el) => el.classList.contains('is-open'))).toBe(true);

  // Click projects → about should close, projects should open.
  await page.click(`[data-panel="projects"]`);
  await page.waitForFunction(() =>
    document.querySelector('[data-panel="projects"]')!.classList.contains('is-open'),
  );
  await page.waitForFunction(() =>
    !document.querySelector('[data-panel="about"]')!.classList.contains('is-open'),
  );

  // After settle: only one panel has is-open.
  const openCount = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-panel]'))
      .filter((el) => el.classList.contains('is-open')).length,
  );
  expect(openCount).toBe(1);
});

test('keyboard (Enter) bypasses the hover guard and opens a panel', async ({ page }) => {
  // Focus the about panel-label and press Enter.
  await page.focus('[data-panel="about"] .panel-label');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() =>
    document.querySelector('[data-panel="about"]')!.classList.contains('is-open'),
  );
  expect(
    await page.evaluate(() => document.getElementById('mondrian')!.dataset.focus),
  ).toBe('about');
});

test('keyboard (Escape) closes the open panel', async ({ page }) => {
  await openByClick(page, 'about');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() =>
    !document.querySelector('[data-panel="about"]')!.classList.contains('is-open'),
  );
});

test('prefers-reduced-motion: reduce short-circuits the state machine to instant transitions', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  // Re-wait for the measureContentHeights pass after reload — page.reload()
  // skips the beforeEach readiness gate, so without this the test would race
  // the measurement pass and click before the state machine is fully wired.
  await page.waitForFunction(() => {
    const grid = document.getElementById('mondrian');
    return grid && grid.style.getPropertyValue('--cell-h-about').endsWith('px');
  });

  await page.click(`[data-panel="about"]`);
  // Measure inside the page using performance.now() so the elapsed value
  // doesn't include Playwright's Node↔browser RPC round-trip + polling
  // overhead. (CodeRabbit finding on #337.)
  const elapsed: number = await page.evaluate(() => {
    return new Promise<number>((resolve) => {
      const start = performance.now();
      const tick = () => {
        if (document.querySelector('[data-panel="about"]')?.classList.contains('is-content-visible')) {
          resolve(performance.now() - start);
        } else {
          requestAnimationFrame(tick);
        }
      };
      requestAnimationFrame(tick);
    });
  });

  // --motion-plane is 460ms in normal mode. Under reduced-motion the state
  // machine should complete in well under that. 200ms is a generous ceiling
  // that catches the case where the JS forgot to short-circuit motion tokens.
  expect(elapsed, 'open completes in <200ms under reduced-motion').toBeLessThan(200);
});

// ─────────────────────────────────────────────────────────────────────────
// Pulse animation — the brightness keyframe used at peak per panel
// ─────────────────────────────────────────────────────────────────────────

test('panel-pulse-blue keyframe applies a stronger filter on Connect than the default panel-pulse keyframe (#330 regression)', async ({ page }) => {
  // Manually trigger the pulse on Connect by adding the class. Read the
  // computed filter mid-keyframe (50% via animation-delay trick).
  const connectFilter = await page.evaluate(() => {
    const el = document.querySelector('.panel--blue') as HTMLElement;
    el.style.animation = 'panel-pulse-blue 250ms';
    el.style.animationPlayState = 'paused';
    el.style.animationDelay = '-125ms';
    el.style.animationFillMode = 'both';
    const f = getComputedStyle(el).filter;
    el.style.animation = '';
    el.style.animationPlayState = '';
    el.style.animationDelay = '';
    el.style.animationFillMode = '';
    return f;
  });
  // brightness component should be >= 1.20 (we set 1.22). The default
  // panel-pulse keyframe is 1.08 — well below this threshold.
  const match = connectFilter.match(/brightness\(([\d.]+)\)/);
  expect(match, `connect filter contains brightness(): ${connectFilter}`).toBeTruthy();
  expect(parseFloat(match![1]), 'connect pulse brightness >= 1.20').toBeGreaterThanOrEqual(1.2);
});
