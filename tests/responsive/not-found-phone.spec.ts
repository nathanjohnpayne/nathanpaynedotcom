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
