import { test, expect } from '@playwright/test';

test('overflowing code blocks have visible scrollbar', async ({ page }) => {
  await page.goto('/blog/six-prs-one-bug-agent-failure-modes/');
  await page.waitForLoadState('domcontentloaded');

  const results = await page.evaluate(() => {
    const blocks = Array.from(document.querySelectorAll('pre.blog-code-block'));
    return blocks
      .filter((el) => el.scrollWidth > el.clientWidth)
      .map((el) => ({
        overflowX: getComputedStyle(el).overflowX,
        scrollable: el.scrollWidth > el.clientWidth,
        // scrollbar renders if offsetHeight > clientHeight
        scrollbarRendered: el.offsetHeight > el.clientHeight,
      }));
  });

  for (const block of results) {
    expect(block.overflowX).toBe('auto');
    expect(block.scrollbarRendered).toBe(true);
  }
});
