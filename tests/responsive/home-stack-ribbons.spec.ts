import { test, expect } from '@playwright/test';
import { parseComputedColor } from '../helpers/contrast';

/**
 * In the homepage stack, the three panel ribbons (About's LAST UPDATED,
 * Projects' DOMAINS, Connect's LATEST POST) are one kind of chrome: each
 * rule and exit link runs to its sheet's right edge in the same muted ink.
 *
 * About's ribbon used to inherit the About sheet's 37rem prose measure, so at
 * tablet widths its rule and VIEW ALL WRITING stopped ~350px short of the
 * other two, and its exit carried full ink where the others carry 72%. The
 * prose keeps its measure, and the NOW cover's prose takes the same one; only
 * the ribbon is chrome.
 *
 * Run: `npm run test:e2e` (see the note in shared-chrome.spec.ts on ports).
 */

for (const [width, height] of [
  [1000, 800],
  [390, 844],
] as const) {
  test.describe(`@${width}px`, () => {
    test.use({ viewport: { width, height } });

    test('stack text shares one left edge; ribbons share a right edge and exit ink', async ({
      page,
    }) => {
      await page.goto('/');
      // A color mid-transition reads as its start value (see home-panel-contrast).
      await page.addStyleTag({
        content: '*,*::before,*::after{transition:none!important;animation:none!important}',
      });
      const m = await page.evaluate(() => ({
        // Text left edges: the cover's name (inside its padding), the NOW
        // prose, the About prose, and the Projects and Connect sheets.
        lefts: [
          (() => {
            const h = document.querySelector('.panel--red .content-inner > h1')!;
            return h.getBoundingClientRect().left + parseFloat(getComputedStyle(h).paddingLeft);
          })(),
          ...[
            '.about-block--now .about-now-flow',
            '.panel--red .about-block--writing p',
            '.panel--yellow .content-inner p',
            '.panel--blue .content-inner p',
          ].map((sel) => document.querySelector(sel)!.getBoundingClientRect().left),
        ].map(Math.round),
        rights: [...document.querySelectorAll('.ribbon-row')].map((r) =>
          Math.round(r.getBoundingClientRect().right),
        ),
        exits: [...document.querySelectorAll('.ribbon-exit')].map((e) => getComputedStyle(e).color),
        prose: document
          .querySelector('.panel--red .about-block--writing p')!
          .getBoundingClientRect().width,
        rowWidth: document.querySelector('.now-ribbon .ribbon-row')!.getBoundingClientRect().width,
        nowRight: document
          .querySelector('.about-block--now .about-now-flow')!
          .getBoundingClientRect().right,
        proseRight: document
          .querySelector('.panel--red .about-block--writing p')!
          .getBoundingClientRect().right,
      }));

      expect(m.rights.length).toBe(3);
      // One left edge down the whole stack: the cover indents by the rail it lacks.
      expect(Math.max(...m.lefts) - Math.min(...m.lefts)).toBeLessThanOrEqual(1);
      expect(Math.max(...m.rights) - Math.min(...m.rights)).toBeLessThanOrEqual(1);
      // Every exit is the muted warm ink: 72% alpha over a near-ink RGB. Red and
      // blue use --ink-warm (23, 18, 8); yellow's literal is (23, 19, 15).
      for (const raw of m.exits) {
        const c = parseComputedColor(raw);
        expect(c, raw).not.toBeNull();
        expect(c!.a, raw).toBeCloseTo(0.72, 2);
        expect(c!.r, raw).toBe(23);
        expect(c!.g, raw).toBeGreaterThanOrEqual(18);
        expect(c!.g, raw).toBeLessThanOrEqual(19);
        expect(c!.b, raw).toBeGreaterThanOrEqual(8);
        expect(c!.b, raw).toBeLessThanOrEqual(15);
      }
      // The prose keeps its measure where there is room for one.
      // ...and so does the NOW cover's prose: both end at one right edge.
      if (width >= 1000) {
        // 37rem less the rail and its line (24px): 568px at this width.
        expect(m.prose).toBeGreaterThan(560);
        expect(m.prose).toBeLessThan(m.rowWidth - 100);
        expect(Math.abs(m.nowRight - m.proseRight)).toBeLessThanOrEqual(1);
      }
    });
  });
}
