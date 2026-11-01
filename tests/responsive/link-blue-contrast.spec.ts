import { test, expect } from '@playwright/test';
import { contrastRatio, parseComputedColor } from '../helpers/contrast';

/**
 * Blue link text on the light reading surfaces clears WCAG AA.
 *
 * `--blue` (#2080ca) is a plane color. As link text it measured 4.20:1 on
 * paper, 3.66:1 on cream and 3.19:1 on --gray-plane — every one under 4.5:1
 * at the sizes it was set in: the /projects/ deck link at phone width, the
 * résumé's contact, action, project and writing links, and the /book/
 * "Everything on Cal.com" link. Text links now take `--blue-ink`.
 *
 * Every visible link whose own text is painted in either blue is measured
 * against the first opaque background up its ancestor chain. Arrows are
 * skipped for the reason home-panel-contrast.spec.ts gives: they are
 * `aria-hidden` beside text that names the link.
 *
 * Run: `npm run test:e2e` (see the note in shared-chrome.spec.ts on ports).
 */

const AA_TEXT = 4.5;
const AA_LARGE = 3;
const BLUES = ['rgb(32, 128, 202)', 'rgb(26, 102, 162)'];
const PAGES = ['/projects/', '/resume/', '/book/'] as const;
const WIDTHS = [375, 1440] as const;

type Sample = { text: string; ink: string; plane: string; size: number; weight: number };

for (const width of WIDTHS) {
  test.describe(`@${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });

    for (const path of PAGES) {
      test(`${path} blue link text clears AA`, async ({ page }) => {
        await page.goto(path);
        const samples: Sample[] = await page.evaluate((blues) => {
          // Composite every translucent background up the ancestor chain onto
          // the first opaque one (the résumé surface is 96% over ink), so the
          // plane is what is actually painted behind the text.
          const opaquePlane = (el: Element | null): string => {
            const layers: number[][] = [];
            for (; el; el = el.parentElement) {
              const raw = getComputedStyle(el).backgroundColor;
              const ch = raw.match(/[\d.]+/g)?.map(Number);
              if (!ch) continue;
              // color-mix() serializes as color(srgb r g b / a) in 0–1 channels.
              if (raw.startsWith('color(')) for (let i = 0; i < 3; i++) ch[i] *= 255;
              const a = ch.length > 3 ? ch[3] : 1;
              if (a === 0) continue;
              layers.push([ch[0], ch[1], ch[2], a]);
              if (a === 1) break;
            }
            let [r, g, b] = [255, 255, 255];
            for (const [lr, lg, lb, a] of layers.reverse()) {
              [r, g, b] = [lr * a + r * (1 - a), lg * a + g * (1 - a), lb * a + b * (1 - a)];
            }
            return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
          };
          return [...document.querySelectorAll('a')]
            .filter((a) => blues.includes(getComputedStyle(a).color))
            .filter((a) => a.getBoundingClientRect().width > 0 && a.innerText.trim())
            .map((a) => {
              const cs = getComputedStyle(a);
              return {
                text: a.innerText.trim().slice(0, 40),
                ink: cs.color,
                plane: opaquePlane(a),
                size: parseFloat(cs.fontSize),
                weight: Number(cs.fontWeight),
              };
            });
        }, BLUES);

        // Control: each page renders at least one blue link, so an empty pass
        // can't hide a selector that stopped matching.
        expect(samples.length, `${path} has blue links to measure`).toBeGreaterThan(0);

        const failures = samples.flatMap((s) => {
          const ink = parseComputedColor(s.ink);
          const plane = parseComputedColor(s.plane);
          if (!ink || !plane) return [`${s.text}: unparsed ${s.ink} on ${s.plane}`];
          const large = s.size >= 24 || (s.size >= 18.66 && s.weight >= 700);
          const ratio = contrastRatio(ink, plane);
          return ratio < (large ? AA_LARGE : AA_TEXT)
            ? [`${s.text}: ${ratio.toFixed(2)}:1 (${s.ink} on ${s.plane}, ${s.size}px)`]
            : [];
        });
        expect(failures).toEqual([]);
      });
    }
  });
}
