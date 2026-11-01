import { test, expect } from '@playwright/test';
import { contrastRatio, parseComputedColor } from '../helpers/contrast';

/**
 * Every .nav-button label clears WCAG AA against its own fill while hovered.
 *
 * The white footers' red hover painted a cream label at 2.56:1 on every page
 * with that footer, and the blue accent's ink-on-blue fill (/privacy/, /blog/)
 * measured 4.53:1 and read poorly. The footer label is now ink (6.54:1), a
 * blue fill uses --blue-ink with a paper label (6.06:1), and the /privacy/
 * controls take the notice's light ink tint.
 *
 * Run: `npm run test:e2e` (see the note in shared-chrome.spec.ts on ports).
 */

const PAGES = ['/blog/', '/privacy/', '/projects/matchline/', '/resume/', '/book/'];

for (const width of [1440, 390] as const) {
  test.describe(`@${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });

    for (const path of PAGES) {
      test(`${path} buttons keep an AA label on hover`, async ({ page }) => {
        // A valid dismissed-notice state (gate.js reads anything else as
        // unset and shows the notice), so it can't cover the page's buttons.
        await page.addInitScript(() => {
          try {
            localStorage.setItem(
              'np-privacy',
              JSON.stringify({ v: 1, choice: 'unset', noticeDismissed: true }),
            );
          } catch {}
        });
        test.setTimeout(60_000);
        await page.goto(path);
        await page.addStyleTag({
          content: '*,*::before,*::after{transition:none!important;animation:none!important}',
        });
        const buttons = page.locator('.nav-button:visible');
        const count = await buttons.count();
        expect(count, `${path} has buttons to hover`).toBeGreaterThan(0);

        const failures: string[] = [];
        for (let i = 0; i < count; i++) {
          const button = buttons.nth(i);
          await button.scrollIntoViewIfNeeded();
          await button.hover({ timeout: 5000 });
          const { hovered, ink, fill, name } = await button.evaluate((e) => {
            let el: Element | null = e;
            let fill = 'rgb(255, 255, 255)';
            for (; el; el = el.parentElement) {
              const bg = getComputedStyle(el).backgroundColor;
              if (!/rgba\(.*,\s*0\)$/.test(bg) && bg !== 'transparent') {
                fill = bg;
                break;
              }
            }
            return {
              hovered: e.matches(':hover'),
              ink: getComputedStyle(e).color,
              fill,
              name: (e.getAttribute('aria-label') || (e as HTMLElement).innerText).trim(),
            };
          });
          // Measure only a real hover: an overlay taking the pointer would
          // leave the button at rest and pass on its resting colors.
          if (!hovered) {
            failures.push(`${name}: not hovered`);
            continue;
          }
          const a = parseComputedColor(ink);
          const b = parseComputedColor(fill);
          if (!a || !b) {
            failures.push(`${name}: unparsed ${ink} on ${fill}`);
            continue;
          }
          const ratio = contrastRatio(a, b);
          if (ratio < 4.5) failures.push(`${name}: ${ratio.toFixed(2)}:1 (${ink} on ${fill})`);
        }
        await page.mouse.move(0, 0);
        expect(failures).toEqual([]);
      });
    }
  });
}
