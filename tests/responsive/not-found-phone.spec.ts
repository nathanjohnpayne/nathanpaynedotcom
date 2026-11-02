import { test, expect } from '@playwright/test';

/**
 * The 404 keeps its Mondrian composition at phone width.
 *
 * At <=768px the page used to hide every decorative block and centre a bare
 * cream card in the stage gray, with 35px buttons. It now starts at the top
 * like the other canvases, carries the inner pages' red accent rail, keeps the
 * desktop's lower two block rows at four tracks (the red block's color moves
 * to the rail), and sizes its buttons to the 44px tap floor. Tablet (>768) is
 * the full composition and must not pick up the rail.
 *
 * Run: `npm run test:e2e` (see the note in shared-chrome.spec.ts on ports).
 */

const PATH = '/404';

test.describe('@390px', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('404 card starts at the top with a rail, block rows and 44px buttons', async ({ page }) => {
    await page.goto(PATH);
    const m = await page.evaluate(() => {
      const box = (el: Element) => el.getBoundingClientRect();
      const content = document.querySelector('.e-content')!;
      return {
        canvasTop: box(document.querySelector('.error-mondrian')!).top,
        railWidth: parseFloat(getComputedStyle(content).borderLeftWidth),
        visibleBlocks: [...document.querySelectorAll('.e-block')]
          .filter((b) => box(b).width > 0 && box(b).height > 0)
          .map((b) => [...b.classList].find((c) => c !== 'e-block')),
        buttons: [...document.querySelectorAll('.e-content .nav-button')].map((b) => box(b).height),
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });

    expect(m.canvasTop).toBe(0);
    expect(m.railWidth).toBeGreaterThan(0);
    expect(m.visibleBlocks.sort()).toEqual(
      [
        'e-black',
        'e-blue',
        'e-white-a',
        'e-white-b',
        'e-white-c',
        'e-yellow-a',
        'e-yellow-b',
      ].sort(),
    );
    expect(m.buttons.length).toBeGreaterThan(0);
    for (const h of m.buttons) expect(h).toBeGreaterThanOrEqual(44);
    expect(m.overflow).toBe(false);
  });
});

test.describe('@834px', () => {
  test.use({ viewport: { width: 834, height: 1112 } });

  test('404 tablet keeps its red block and no rail', async ({ page }) => {
    await page.goto(PATH);
    const m = await page.evaluate(() => ({
      red: document.querySelector('.e-red')!.getBoundingClientRect().width,
      railWidth: parseFloat(
        getComputedStyle(document.querySelector('.e-content')!).borderLeftWidth,
      ),
    }));
    expect(m.red).toBeGreaterThan(0);
    expect(m.railWidth).toBe(0);
  });
});

/**
 * Above 480px the eight destinations form two even rows of four (#1494):
 * Homepage, Résumé, Projects, Blog; then Book, Brand, How I write, Privacy.
 * Every button sits inside the card and its label fits its column.
 */
for (const width of [1440, 834] as const) {
  test.describe(`@${width}px grid`, () => {
    test.use({ viewport: { width, height: 900 } });

    test('404 destinations form two rows of four equal columns', async ({ page }) => {
      await page.goto(PATH);
      const m = await page.evaluate(() => {
        const content = document.querySelector('.e-content')!.getBoundingClientRect();
        return [...document.querySelectorAll('.e-content .nav-button')].map((b) => {
          const r = b.getBoundingClientRect();
          return {
            label: b.textContent!.trim(),
            top: Math.round(r.top),
            left: Math.round(r.left),
            width: Math.round(r.width),
            inside: r.left >= content.left - 0.5 && r.right <= content.right + 0.5,
            fits: (b as HTMLElement).scrollWidth <= (b as HTMLElement).clientWidth + 1,
          };
        });
      });
      expect(m.map((b) => b.label)).toEqual([
        'Homepage',
        'Résumé',
        'Projects',
        'Blog',
        'Book',
        'Brand',
        'How I write',
        'Privacy',
      ]);
      const rows = [...new Set(m.map((b) => b.top))];
      expect(rows).toHaveLength(2);
      for (const row of rows) expect(m.filter((b) => b.top === row)).toHaveLength(4);
      // Columns line up between the rows, and every column is the same width.
      expect(m.slice(0, 4).map((b) => b.left)).toEqual(m.slice(4).map((b) => b.left));
      expect(
        Math.max(...m.map((b) => b.width)) - Math.min(...m.map((b) => b.width)),
      ).toBeLessThanOrEqual(1);
      for (const b of m) {
        expect(b.inside, b.label).toBe(true);
        expect(b.fits, `${b.label} overflows its column`).toBe(true);
      }
    });
  });
}
