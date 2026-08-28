import { test, expect } from '@playwright/test';

const routes = [
  '/',
  '/blog/',
  '/blog/six-prs-one-bug-agent-failure-modes/',
  '/projects/device-source-of-truth/',
  '/projects/friends-and-family-billing/',
  '/projects/mergepath/',
  '/projects/override/',
  '/projects/swipe-watch/',
];

for (const route of routes) {
  test(`no horizontal overflow on ${route}`, async ({ page }) => {
    await page.goto(route);
    await page.waitForLoadState('domcontentloaded');

    const overflows = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;

      // Elements inside a scrollable container are allowed to exceed viewport
      function isInsideScrollable(el: Element): boolean {
        let parent = el.parentElement;
        while (parent && parent !== document.documentElement) {
          const overflow = getComputedStyle(parent).overflowX;
          if (overflow === 'auto' || overflow === 'scroll') return true;
          parent = parent.parentElement;
        }
        return false;
      }

      return Array.from(document.querySelectorAll('*'))
        .filter((el) => {
          // Exclude Astro dev toolbar
          if (el.closest('astro-dev-toolbar')) return false;
          // Exclude Mermaid SVG internals (rendered client-side, may extend)
          if (el.closest('.mermaid') || el.closest('svg')) return false;
          // Exclude elements inside scrollable containers (code blocks)
          if (isInsideScrollable(el)) return false;
          const rect = el.getBoundingClientRect();
          return rect.right > vw + 1; // 1px tolerance for subpixel rounding
        })
        .map((el) => ({
          tag: el.tagName.toLowerCase(),
          class: el.className?.toString().slice(0, 60) || '',
          right: Math.round(el.getBoundingClientRect().right),
          viewportWidth: vw,
        }));
    });

    expect(overflows, `Elements overflowing viewport on ${route}`).toEqual([]);
  });
}
