import { test, expect, type Page } from '@playwright/test';
import { contrastRatio, parseComputedColor, type ParsedColor } from '../helpers/contrast';

/**
 * Interactive text on the home page clears WCAG AA against the plane it is
 * actually rendered on (#977, #979).
 *
 * The four Mondrian panels each show two very different surfaces — their own
 * high-chroma plane when closed, warm parchment when open — and a foreground
 * tuned for one can fail badly on the other. Both tickets were exactly that:
 * six red-plane links at 4.35:1 that had only ever been checked open, and a
 * Latest Post title carrying a *label* ink that failed in both states.
 *
 * Three things this spec does deliberately, each because getting them wrong
 * produced a wrong number while the tickets were being written:
 *
 *   1. Transitions AND animations are killed before any color is read. An
 *      agent's browser pane can be hidden, which freezes the animation clock,
 *      and a property mid-transition then reports its START value forever —
 *      indistinguishable from a rule that never applied.
 *   2. Only natural states are sampled. At <=1023px no panel opens, and on
 *      desktop exactly one opens at a time, driven by hovering the panel
 *      rather than by stamping `.is-open` on it. Forcing every panel open at
 *      once reports ink-on-plane pairs the site never renders.
 *   3. The plane is composited from the ancestor chain, and element `opacity`
 *      is folded in, so a semi-transparent ink is measured against what is
 *      really behind it rather than against its own declared value.
 *
 * Arrows are out of scope here: every `.link-arrow` is `aria-hidden` beside
 * link text that names the control, so 4.5:1 is the wrong test for one. Their
 * floor and their per-plane color are #978's.
 *
 * Run: `npm run test:e2e` (see the note in shared-chrome.spec.ts on ports).
 */

const STACK_BREAKPOINT = 1024; // --bp-stack
const AA_TEXT = 4.5;
const PANELS = ['panel--red', 'panel--yellow', 'panel--black', 'panel--blue'] as const;

type Sample = {
  panel: string;
  cls: string;
  text: string;
  rawInk: string;
  rawPlane: string[];
  opacity: number;
};

const KILL_MOTION =
  '*, *::before, *::after { transition: none !important; animation: none !important }';

/**
 * Collect every rendered link inside the grid with the raw computed strings
 * needed to reconstruct its ink and its plane. Parsing happens in Node so the
 * one parser under test is the one the assertions use.
 */
async function sampleLinks(page: Page): Promise<Sample[]> {
  return page.evaluate(() => {
    const out: Sample[] = [];
    document.querySelectorAll<HTMLAnchorElement>('.mondrian a').forEach((anchor) => {
      const style = getComputedStyle(anchor);
      if (style.visibility === 'hidden' || style.display === 'none') return;
      const box = anchor.getBoundingClientRect();
      if (box.width === 0 && box.height === 0) return;
      const panel = anchor.closest('.panel');
      if (!panel) return;

      // Every background-color up the tree until an opaque one, outermost last.
      const rawPlane: string[] = [];
      for (let node: Element | null = anchor; node; node = node.parentElement) {
        const bg = getComputedStyle(node).backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') rawPlane.push(bg);
        if (/^rgb\(/.test(bg) || /^color\(srgb [^/]+\)$/.test(bg)) break;
      }

      let opacity = 1;
      for (let node: Element | null = anchor; node; node = node.parentElement) {
        const value = Number.parseFloat(getComputedStyle(node).opacity);
        if (!Number.isNaN(value)) opacity *= value;
      }

      out.push({
        panel: [...panel.classList].find((c) => c.startsWith('panel--')) ?? '?',
        cls: [...anchor.classList].join('.') || '(bare)',
        text: (anchor.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40),
        rawInk: style.color,
        rawPlane,
        opacity,
      });
    });
    return out;
  });
}

function over(foreground: ParsedColor, background: ParsedColor): ParsedColor {
  return {
    r: foreground.r * foreground.a + background.r * (1 - foreground.a),
    g: foreground.g * foreground.a + background.g * (1 - foreground.a),
    b: foreground.b * foreground.a + background.b * (1 - foreground.a),
    a: 1,
  };
}

/** Flatten the ancestor background chain onto white, outermost first. */
function planeOf(sample: Sample): ParsedColor {
  let base: ParsedColor = { r: 255, g: 255, b: 255, a: 1 };
  for (let i = sample.rawPlane.length - 1; i >= 0; i -= 1) {
    const layer = parseComputedColor(sample.rawPlane[i]);
    expect(layer, `Unable to parse plane color: ${sample.rawPlane[i]}`).not.toBeNull();
    base = over(layer!, base);
  }
  return base;
}

function contrastOf(sample: Sample): number {
  const plane = planeOf(sample);
  const ink = parseComputedColor(sample.rawInk);
  expect(ink, `Unable to parse ink color: ${sample.rawInk}`).not.toBeNull();
  const composited = over({ ...ink!, a: ink!.a * sample.opacity }, plane);
  return contrastRatio(composited, plane);
}

function assertAllClearAA(samples: Sample[], state: string): void {
  expect(samples.length, `no links sampled in ${state}`).toBeGreaterThan(0);
  const failures = samples
    .map((sample) => ({ sample, ratio: contrastOf(sample) }))
    .filter(({ ratio }) => ratio < AA_TEXT)
    .map(
      ({ sample, ratio }) =>
        `${sample.panel} .${sample.cls} "${sample.text}" = ${ratio.toFixed(2)}:1`,
    );
  expect(failures, `interactive text below ${AA_TEXT}:1 in ${state}`).toEqual([]);
}

test.describe('Home panel interactive text contrast', () => {
  test('the color(srgb) form is read on the 0-1 scale it is serialized on', () => {
    // The control for every ratio in this file. Chrome returns this form for
    // any color-mix() value; read as 0-255 it collapses to near-black and the
    // resulting ratio still looks like a real measurement. A parser regression
    // here would otherwise show up as the page passing, not failing.
    const mixed = parseComputedColor('color(srgb 0.0901961 0.0705882 0.0313725 / 0.72)');
    expect(mixed).toEqual({ r: 23, g: 18, b: 8, a: 0.72 });
    expect(parseComputedColor('rgb(218, 36, 24)')).toEqual({ r: 218, g: 36, b: 24, a: 1 });
    expect(parseComputedColor('not a color')).toBeNull();
  });

  test('every rendered link clears 4.5:1 on the plane it is shown against', async ({ page }) => {
    const width = page.viewportSize()?.width ?? 0;
    await page.goto('/');
    await page.addStyleTag({ content: KILL_MOTION });

    if (width < STACK_BREAKPOINT) {
      // The real phone state: all four panels closed, all content visible.
      expect(await page.locator('.panel.is-open').count(), 'a panel opened in stack mode').toBe(0);
      assertAllClearAA(await sampleLinks(page), `stack ${width}px`);
      return;
    }

    for (const panel of PANELS) {
      await page.hover(`.${panel}`);
      await expect(page.locator(`.${panel}.is-content-visible`)).toHaveCount(1);
      expect(
        await page.locator('.panel.is-open').count(),
        `more than one panel open while hovering ${panel}`,
      ).toBe(1);
      const samples = (await sampleLinks(page)).filter((s) => s.panel === panel);
      assertAllClearAA(samples, `desktop ${width}px, ${panel} open`);
    }
  });

  test('a color-mix() ink is actually exercised by a page reading', async ({ page }) => {
    // The other half of the parser control. The literal above proves the
    // color(srgb ...) branch is CORRECT; this proves it is REACHED, so the
    // guard cannot quietly become dead code that nothing on this page takes.
    //
    // Desktop only, and that is a fact about the page rather than a
    // convenience: in stack mode every link ink resolves to a flat token
    // (--paper on red, --blue-contrast on blue) and the only color-mix()
    // values left on those planes belong to labels and rules, which are not
    // what the AA sweep measures. The open parchment state is where a measured
    // link ink is a color-mix() — .blog-callout-link's 72% --ink-warm.
    const width = page.viewportSize()?.width ?? 0;
    test.skip(width < STACK_BREAKPOINT, 'no panel opens below --bp-stack; see the note above');

    await page.goto('/');
    await page.addStyleTag({ content: KILL_MOTION });

    const seen: string[] = [];
    for (const panel of PANELS) {
      await page.hover(`.${panel}`);
      await expect(page.locator(`.${panel}.is-content-visible`)).toHaveCount(1);
      (await sampleLinks(page))
        .filter((s) => s.panel === panel)
        .forEach((s) => seen.push(s.rawInk));
    }
    expect(
      seen.some((value) => value.startsWith('color(srgb')),
      'no color-mix() link ink was sampled, so the parser branch went untested',
    ).toBe(true);
  });
});
