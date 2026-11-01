import { test, expect } from '@playwright/test';

/**
 * In the homepage stack, the three panel ribbons (About's LAST UPDATED,
 * Projects' DOMAINS, Connect's LATEST POST) are one kind of chrome: each
 * rule and exit link runs to its sheet's right edge in the same muted ink.
 *
 * About's ribbon used to inherit the About sheet's 37rem prose measure, so at
 * tablet widths its rule and VIEW ALL WRITING stopped ~350px short of the
 * other two, and its exit carried full ink where the others carry 72%. The
 * prose keeps its measure; only the ribbon is chrome.
 *
 * Run: `npm run test:e2e` (see the note in shared-chrome.spec.ts on ports).
 */

for (const [width, height] of [
  [1000, 800],
  [390, 844],
] as const) {
  test.describe(`@${width}px`, () => {
    test.use({ viewport: { width, height } });

    test('stack ribbons share a right edge and exit ink', async ({ page }) => {
      await page.goto('/');
      // A color mid-transition reads as its start value (see home-panel-contrast).
      await page.addStyleTag({
        content: '*,*::before,*::after{transition:none!important;animation:none!important}',
      });
      const m = await page.evaluate(() => ({
        rights: [...document.querySelectorAll('.ribbon-row')].map((r) =>
          Math.round(r.getBoundingClientRect().right),
        ),
        exits: [...document.querySelectorAll('.ribbon-exit')].map(
          (e) =>
            getComputedStyle(e)
              .color.replace(/\s+/g, ' ')
              .match(/[\d.]+/g)
              ?.slice(-1)[0],
        ),
        prose: document
          .querySelector('.panel--red .about-block--writing p')!
          .getBoundingClientRect().width,
        rowWidth: document.querySelector('.now-ribbon .ribbon-row')!.getBoundingClientRect().width,
      }));

      expect(m.rights.length).toBe(3);
      expect(Math.max(...m.rights) - Math.min(...m.rights)).toBeLessThanOrEqual(1);
      // Every exit carries the same 72% alpha.
      expect(new Set(m.exits)).toEqual(new Set(['0.72']));
      // The prose keeps its measure where there is room for one.
      if (width >= 1000) expect(m.prose).toBeLessThan(m.rowWidth - 100);
    });
  });
}
