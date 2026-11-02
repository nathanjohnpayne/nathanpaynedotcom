import { test, expect } from '@playwright/test';

/**
 * Footer and 404 buttons lead with a Lucide content icon (NavIcon.astro) that
 * says what the destination is, instead of ←/→ arrows that pointed both ways
 * in one row ("Résumé →" beside "← Back to Homepage"). Every button carries
 * exactly one .nav-icon, no label carries an arrow, and the icon never
 * changes the button's height.
 *
 * Run: `npm run test:e2e` (see the note in shared-chrome.spec.ts on ports).
 */

const SURFACES: [string, string][] = [
  ['/projects/', '.site-footer__nav .nav-button'],
  ['/blog/six-prs-one-bug-agent-failure-modes/', '.site-footer__nav .nav-button'],
  ['/projects/matchline/', '.site-footer__nav .nav-button'],
  ['/resume/', '.site-footer__nav .nav-button'],
  ['/how-i-write/', '.site-footer__nav .nav-button'],
  ['/404', '.e-content .nav-button'],
];

for (const width of [1440, 390] as const) {
  test.describe(`@${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });

    for (const [path, selector] of SURFACES) {
      test(`${path} buttons lead with one content icon and carry no arrow`, async ({ page }) => {
        await page.goto(path);
        const rows = await page.locator(selector).evaluateAll((els) =>
          els.map((e) => ({
            name: (e.getAttribute('aria-label') || e.textContent || '').trim(),
            icons: e.querySelectorAll('svg.nav-icon').length,
            iconFirst: e.firstElementChild?.matches('svg.nav-icon') ?? false,
            height: Math.round(e.getBoundingClientRect().height),
          })),
        );
        expect(rows.length, `${path} has buttons`).toBeGreaterThan(0);
        for (const r of rows) {
          expect(r.icons, r.name).toBe(1);
          expect(r.iconFirst, `${r.name}: icon leads the label`).toBe(true);
          expect(r.name, `${r.name}: no arrow`).not.toMatch(/[←→]/);
        }
        expect(new Set(rows.map((r) => r.height)).size, 'one button height').toBe(1);
      });
    }
  });
}
