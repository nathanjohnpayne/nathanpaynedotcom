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
 * The 404's eight destinations (#1494) sit in equal columns above 480px:
 * two columns up to 899px, four from 900px, where a column first holds the
 * widest button with room to spare (global.css, `.e-actions`). Order is
 * always Homepage, Résumé, Projects, Blog, Book, Brand, How I write, Privacy.
 * At every width no button is narrower than its own content (padding, icon
 * and an unbreakable label), no button runs into the next column, and the
 * page does not scroll sideways. The widths bracket the breakpoint and the
 * old failure: four forced columns at 520px overflowed (Codex, PR #1505).
 */
const ORDER = ['Homepage', 'Résumé', 'Projects', 'Blog', 'Book', 'Brand', 'How I write', 'Privacy'];

for (const [width, columns] of [
  [481, 2],
  [520, 2],
  [600, 2],
  [700, 2],
  [834, 2],
  [899, 2],
  [900, 4],
  [901, 4],
  [1024, 4],
  [1440, 4],
] as const) {
  test.describe(`@${width}px grid`, () => {
    test.use({ viewport: { width, height: 900 } });

    test(`404 destinations sit in ${columns} equal columns that hold their labels`, async ({
      page,
    }) => {
      await page.goto(PATH);
      await page.evaluate(() => document.fonts.ready);
      const m = await page.evaluate(() => {
        const list = document.querySelector('.e-actions')!;
        const content = document.querySelector('.e-content')!.getBoundingClientRect();
        const buttons = [...list.querySelectorAll<HTMLElement>('.nav-button')];
        return {
          overflow: document.documentElement.scrollWidth > innerWidth,
          buttons: buttons.map((b) => {
            const r = b.getBoundingClientRect();
            // The button's own content at its natural width, measured on a
            // detached copy so the grid cannot squeeze it.
            const probe = b.cloneNode(true) as HTMLElement;
            probe.style.cssText = 'position:absolute;width:max-content;visibility:hidden';
            list.appendChild(probe);
            const need = probe.getBoundingClientRect().width;
            probe.remove();
            return {
              label: b.textContent!.trim(),
              top: Math.round(r.top),
              left: r.left,
              right: r.right,
              width: r.width,
              need,
              scrolls: b.scrollWidth > b.clientWidth + 1,
              inside: r.left >= content.left - 0.5 && r.right <= content.right + 0.5,
            };
          }),
        };
      });
      const b = m.buttons;
      expect(b.map((x) => x.label)).toEqual(ORDER);
      expect(m.overflow).toBe(false);

      const rows = [...new Set(b.map((x) => x.top))];
      expect(rows).toHaveLength(8 / columns);
      for (const row of rows) expect(b.filter((x) => x.top === row)).toHaveLength(columns);
      // Columns line up from row to row and share one width.
      for (let i = columns; i < b.length; i++) {
        expect(Math.abs(b[i].left - b[i % columns].left)).toBeLessThanOrEqual(1);
      }
      expect(
        Math.max(...b.map((x) => x.width)) - Math.min(...b.map((x) => x.width)),
      ).toBeLessThanOrEqual(1);

      for (let i = 0; i < b.length; i++) {
        const x = b[i];
        expect(x.inside, `${x.label} leaves the card`).toBe(true);
        expect(x.scrolls, `${x.label} scrolls inside its button`).toBe(false);
        expect(
          x.need,
          `${x.label} needs ${x.need}px, its column is ${x.width}px`,
        ).toBeLessThanOrEqual(x.width + 0.5);
        const next = b[i + 1];
        if (next && next.top === x.top) {
          expect(x.right, `${x.label} runs into ${next.label}`).toBeLessThanOrEqual(next.left);
        }
      }
    });
  });
}
