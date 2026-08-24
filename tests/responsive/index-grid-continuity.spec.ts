import { test, expect } from '@playwright/test';

const expectedRows = [
  { axes: [0.5, 0.72], accents: ['accent-red', 'accent-blue'] },
  { axes: [0.72], accents: ['accent-black'] },
  { axes: [0.5], accents: ['accent-white'] },
  { axes: [0.5, 0.72], accents: ['accent-yellow', 'accent-paper'] },
  { axes: [0.72], accents: ['accent-lightblue'] },
  { axes: [0.5], accents: ['accent-red'] },
];

for (const route of ['/projects/', '/blog/']) {
  test(`${route} repeats the established Mondrian axes and accents through row 6`, async (
    { page },
    testInfo,
  ) => {
    test.skip(testInfo.project.name !== 'Desktop 1440', 'Desktop composition only');

    await page.goto(route);
    await page.waitForLoadState('domcontentloaded');

    const rows = await page.locator('.blog-grid > div:not(.grid-row--rss)').evaluateAll((elements) =>
      elements.slice(0, 6).map((row) => {
        const rowRect = row.getBoundingClientRect();
        const children = [...row.children];
        const gap = Number.parseFloat(getComputedStyle(row).columnGap);

        return {
          axes: children.slice(0, -1).map((child) => {
            const ruleCenter = child.getBoundingClientRect().right + gap / 2;
            return Number(((ruleCenter - rowRect.left) / rowRect.width).toFixed(2));
          }),
          accents: children.slice(1).map((accent) =>
            [...accent.classList].find((className) => className.startsWith('accent-')),
          ),
        };
      }),
    );

    expect(rows).toEqual(expectedRows);
  });
}
