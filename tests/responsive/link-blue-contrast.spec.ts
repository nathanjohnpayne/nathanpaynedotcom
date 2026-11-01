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
          const opaquePlane = (el: Element | null): string => {
            for (; el; el = el.parentElement) {
              const bg = getComputedStyle(el).backgroundColor;
              const alpha = bg.match(/[\d.]+/g)?.[3];
              if (alpha === undefined || Number(alpha) > 0.9) return bg;
            }
            return 'rgb(255, 255, 255)';
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
