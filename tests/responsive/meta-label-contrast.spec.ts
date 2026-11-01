import { test, expect } from '@playwright/test';
import { contrastRatio, parseComputedColor } from '../helpers/contrast';

/**
 * The ~10px uppercase metadata labels clear WCAG AA (#1502).
 *
 * The blog metadata panel's dt labels, the blog pull-quote credit and the
 * résumé metadata panel's dt labels were 48% ink: 3.07:1 on the #d4d4d4
 * panel and 3.28:1 on the pull-quote surface. They now take --ink-62
 * (4.62:1 and 5.16:1). Each label is measured against its composited
 * background, and must stay lighter than the values it labels.
 *
 * Run: `npm run test:e2e` (see the note in shared-chrome.spec.ts on ports).
 */

const CASES: [string, string, number[]][] = [
  ['/blog/six-prs-one-bug-agent-failure-modes/', '.blog-sidebar-meta dt', [1440]],
  ['/blog/six-prs-one-bug-agent-failure-modes/', '.blog-sidebar-pullquote cite', [1440]],
  ['/resume/', '.resume-canvas-meta dt', [1440, 390]],
];

for (const [path, selector, widths] of CASES) {
  for (const width of widths) {
    test(`${path} ${selector} clears AA @${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      const rows = await page.locator(selector).evaluateAll((els) => {
        const plane = (start: Element) => {
          const layers: string[] = [];
          for (let el: Element | null = start; el; el = el.parentElement) {
            const bg = getComputedStyle(el).backgroundColor;
            if (/,\s*0\)$/.test(bg) || bg === 'transparent') continue;
            layers.push(bg);
            if (!/rgba|\/ 0?\.\d/.test(bg)) break;
          }
          return layers;
        };
        return els
          .filter((e) => e.getBoundingClientRect().width > 0)
          .map((e) => ({
            text: (e.textContent || '').trim().slice(0, 24),
            ink: getComputedStyle(e).color,
            layers: plane(e),
            valueInk: e.nextElementSibling ? getComputedStyle(e.nextElementSibling).color : null,
          }));
      });
      expect(rows.length, `${selector} renders on ${path}`).toBeGreaterThan(0);

      for (const r of rows) {
        // Composite the background stack (bottom first), then the label's
        // own alpha over it.
        let bg = { r: 255, g: 255, b: 255, a: 1 };
        for (const raw of [...r.layers].reverse()) {
          const c = parseComputedColor(raw)!;
          bg = {
            r: c.r * c.a + bg.r * (1 - c.a),
            g: c.g * c.a + bg.g * (1 - c.a),
            b: c.b * c.a + bg.b * (1 - c.a),
            a: 1,
          };
        }
        const ink = parseComputedColor(r.ink)!;
        const fg = {
          r: ink.r * ink.a + bg.r * (1 - ink.a),
          g: ink.g * ink.a + bg.g * (1 - ink.a),
          b: ink.b * ink.a + bg.b * (1 - ink.a),
          a: 1,
        };
        const ratio = contrastRatio(fg, bg);
        expect(ratio, `${r.text}: ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
        // The label stays lighter than its value: less ink alpha, or the
        // value at full ink.
        if (r.valueInk) {
          const value = parseComputedColor(r.valueInk)!;
          expect(ink.a, `${r.text}: label lighter than its value`).toBeLessThan(value.a);
        }
      }
    });
  }
}
