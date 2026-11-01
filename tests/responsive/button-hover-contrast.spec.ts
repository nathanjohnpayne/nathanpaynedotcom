import { test, expect } from '@playwright/test';
import { contrastRatio, parseComputedColor } from '../helpers/contrast';

/**
 * Every .nav-button label clears WCAG AA against its own fill while hovered
 * and while keyboard-focused (:focus-visible).
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
      test(`${path} buttons keep an AA label on hover and focus`, async ({ page }) => {
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
          for (const state of ['hover', 'focus-visible'] as const) {
            if (state === 'hover') {
              await button.hover({ timeout: 5000 });
            } else {
              // A key press puts the page in keyboard modality, so the
              // scripted focus that follows matches :focus-visible.
              await page.mouse.move(0, 0);
              await page.keyboard.press('Shift');
              await button.focus();
            }
            const { active, ink, fill, name } = await button.evaluate((e, st) => {
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
                active: e.matches(`:${st}`),
                ink: getComputedStyle(e).color,
                fill,
                name: (e.getAttribute('aria-label') || (e as HTMLElement).innerText).trim(),
              };
            }, state);
            // Measure only the real state: an overlay taking the pointer, or a
            // focus that isn't :focus-visible, would leave the button at rest
            // and pass on its resting colors.
            if (!active) {
              failures.push(`${name}: not in :${state}`);
              continue;
            }
            const a = parseComputedColor(ink);
            const b = parseComputedColor(fill);
            if (!a || !b) {
              failures.push(`${name} (${state}): unparsed ${ink} on ${fill}`);
              continue;
            }
            const ratio = contrastRatio(a, b);
            if (ratio < 4.5) {
              failures.push(`${name} (${state}): ${ratio.toFixed(2)}:1 (${ink} on ${fill})`);
            }
          }
          await button.blur();
        }
        await page.mouse.move(0, 0);
        expect(failures).toEqual([]);
      });
    }
  });
}
