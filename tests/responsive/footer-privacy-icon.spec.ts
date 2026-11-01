import { test, expect } from '@playwright/test';

/**
 * The shared footer's Privacy link is an icon (Lucide shield-check) named
 * "Privacy": a square the height of its text neighbours, on the same row as
 * the last text button at every width. At <=480 the text buttons take full
 * rows, so the last one's basis leaves room for the icon beside it instead of
 * sending it alone onto a line of its own.
 *
 * Run: `npm run test:e2e` (see the note in shared-chrome.spec.ts on ports).
 */

for (const width of [390, 1440] as const) {
  test.describe(`@${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });

    for (const path of ['/blog/', '/projects/matchline/']) {
      test(`${path} footer Privacy icon is a named square beside the last button`, async ({
        page,
      }) => {
        await page.goto(path);
        const icon = page.locator('.site-footer [data-np-privacy-ui="footer-link"]');
        await expect(icon).toHaveCount(1);
        await expect(icon).toHaveAccessibleName('Privacy');
        await expect(icon.locator('svg')).toHaveCount(1);

        const m = await page.evaluate(() => {
          const nav = document.querySelector('.site-footer__nav')!;
          const items = [...nav.children].map((e) => e.getBoundingClientRect());
          const icon = items.at(-1)!;
          const last = items.at(-2)!;
          return {
            iconW: icon.width,
            iconH: icon.height,
            lastH: last.height,
            sameRow: Math.abs(icon.top - last.top) <= 1,
            overflow: document.documentElement.scrollWidth > innerWidth,
          };
        });
        expect(Math.abs(m.iconW - m.iconH)).toBeLessThanOrEqual(1);
        expect(Math.abs(m.iconH - m.lastH)).toBeLessThanOrEqual(1);
        expect(m.sameRow).toBe(true);
        expect(m.overflow).toBe(false);
      });
    }
  });
}
