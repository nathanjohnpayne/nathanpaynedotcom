import { test, expect } from '@playwright/test';
import { contrastRatio, parseComputedColor } from '../helpers/contrast';

/**
 * The ~10px uppercase metadata labels clear WCAG AA (#1502).
 *
 * The blog metadata panel's dt labels, the blog pull-quote credit and the
 * résumé metadata panel's dt labels were 48% ink: 3.07:1 on the #d4d4d4
 * panel and 3.28:1 on the pull-quote surface. They now take --ink-62
 * (4.62:1 and 5.16:1). Each label is measured against its composited
 * background, and must paint lighter (lower contrast) than the value text it
 * labels, compared as composited colors, including the Topics pills.
 *
 * Run: `npm run test:e2e` (see the note in shared-chrome.spec.ts on ports).
 */

/** Composite a background stack (nearest first) and a text color over it,
 *  and return the painted contrast ratio. */
function paintedContrast(ink: string, layers: string[]): number {
  let bg = { r: 255, g: 255, b: 255, a: 1 };
  for (const raw of [...layers].reverse()) {
    const c = parseComputedColor(raw)!;
    bg = {
      r: c.r * c.a + bg.r * (1 - c.a),
      g: c.g * c.a + bg.g * (1 - c.a),
      b: c.b * c.a + bg.b * (1 - c.a),
      a: 1,
    };
  }
  const t = parseComputedColor(ink)!;
  const fg = {
    r: t.r * t.a + bg.r * (1 - t.a),
    g: t.g * t.a + bg.g * (1 - t.a),
    b: t.b * t.a + bg.b * (1 - t.a),
    a: 1,
  };
  return contrastRatio(fg, bg);
}

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
        // Background stack, nearest first, up to the first opaque layer.
        const layers = (start: Element) => {
          const out: string[] = [];
          for (let el: Element | null = start; el; el = el.parentElement) {
            const bg = getComputedStyle(el).backgroundColor;
            if (/,\s*0\)$/.test(bg) || bg === 'transparent') continue;
            out.push(bg);
            if (!/rgba|\/ 0?\.\d/.test(bg)) break;
          }
          return out;
        };
        // The element that actually paints the value's first text: a Topics
        // dd paints its words in pill spans on their own tinted background.
        const painter = (dd: Element | null) => {
          if (!dd) return null;
          const walker = document.createTreeWalker(dd, NodeFilter.SHOW_TEXT, {
            acceptNode: (n) =>
              n.textContent && n.textContent.trim()
                ? NodeFilter.FILTER_ACCEPT
                : NodeFilter.FILTER_SKIP,
          });
          const text = walker.nextNode();
          return text ? text.parentElement : null;
        };
        return els
          .filter((e) => e.getBoundingClientRect().width > 0)
          .map((e) => {
            const v = painter(e.nextElementSibling);
            return {
              text: (e.textContent || '').trim().slice(0, 24),
              label: { ink: getComputedStyle(e).color, layers: layers(e) },
              value: v ? { ink: getComputedStyle(v).color, layers: layers(v) } : null,
            };
          });
      });
      expect(rows.length, `${selector} renders on ${path}`).toBeGreaterThan(0);

      for (const r of rows) {
        const label = paintedContrast(r.label.ink, r.label.layers);
        expect(label, `${r.text}: ${label.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
        // The label stays visually lighter than the value it labels: its
        // composited contrast is lower than the value text's.
        if (r.value) {
          const value = paintedContrast(r.value.ink, r.value.layers);
          // The value text clears AA on its own, Topics pills included.
          expect(value, `${r.text} value: ${value.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
          expect(
            label,
            `${r.text}: label ${label.toFixed(2)} vs value ${value.toFixed(2)}`,
          ).toBeLessThan(value);
        }
      }
    });
  }
}
