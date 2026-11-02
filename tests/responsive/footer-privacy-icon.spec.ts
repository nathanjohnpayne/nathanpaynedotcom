import { test, expect } from '@playwright/test';

/**
 * The shared footer ends in two icon-only links: How I write (Lucide
 * pencil-sparkles, #1494) and then Privacy (Lucide shield-check, #1487), each
 * named by its aria-label. Each is a square the height of its text
 * neighbours, and both sit on the same row as the last text button at every
 * width. At <=480 the text buttons take full rows, so the last one's basis
 * leaves room for both icons beside it instead of sending them alone onto a
 * line of their own.
 *
 * Run: `npm run test:e2e` (see the note in shared-chrome.spec.ts on ports).
 */

for (const width of [390, 1440] as const) {
  test.describe(`@${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });

    for (const path of ['/blog/', '/projects/matchline/', '/how-i-write/']) {
      test(`${path} footer How I write and Privacy icons are named squares beside the last button`, async ({
        page,
      }) => {
        await page.goto(path);
        const privacy = page.locator('.site-footer [data-np-privacy-ui="footer-link"]');
        await expect(privacy).toHaveCount(1);
        await expect(privacy).toHaveAccessibleName('Privacy');
        await expect(privacy.locator('svg')).toHaveCount(1);
        const howIWrite = page.locator('.site-footer a[href="/how-i-write/"]');
        await expect(howIWrite).toHaveCount(1);
        await expect(howIWrite).toHaveAccessibleName('How I write');
        await expect(howIWrite).toHaveAttribute('title', 'How I write');
        await expect(howIWrite.locator('svg')).toHaveCount(1);

        const m = await page.evaluate(() => {
          const nav = document.querySelector('.site-footer__nav')!;
          const items = [...nav.children].map((e) => e.getBoundingClientRect());
          const privacy = items.at(-1)!;
          const howIWrite = items.at(-2)!;
          const last = items.at(-3)!;
          const square = (r: DOMRect) => Math.abs(r.width - r.height);
          return {
            howIWriteHref: nav.children[nav.children.length - 2].getAttribute('href'),
            squares: [square(howIWrite), square(privacy)],
            heights: [howIWrite.height, privacy.height, last.height],
            sameRow:
              Math.abs(privacy.top - last.top) <= 1 && Math.abs(howIWrite.top - last.top) <= 1,
            order: last.right <= howIWrite.left && howIWrite.right <= privacy.left,
            overflow: document.documentElement.scrollWidth > innerWidth,
          };
        });
        expect(m.howIWriteHref).toBe('/how-i-write/');
        for (const d of m.squares) expect(d).toBeLessThanOrEqual(1);
        expect(Math.abs(m.heights[0] - m.heights[2])).toBeLessThanOrEqual(1);
        expect(Math.abs(m.heights[1] - m.heights[2])).toBeLessThanOrEqual(1);
        expect(m.sameRow).toBe(true);
        expect(m.order).toBe(true);
        expect(m.overflow).toBe(false);
      });
    }
  });
}
