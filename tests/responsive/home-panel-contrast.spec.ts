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

const AA_TEXT = 4.5;
const PANELS = ['panel--red', 'panel--yellow', 'panel--black', 'panel--blue'] as const;

type Sample = {
  panel: string;
  cls: string;
  text: string;
  rawInk: string;
  rawPlane: string[];
  opacity: number;
  /** The trailing glyph this link carries, if any. */
  arrow: { kind: 'link-arrow' | 's-arrow'; rawInk: string; opacity: number } | null;
  /**
   * The panel's declared --arrow-accent, resolved to a computed color, or
   * `null` when the panel declares none.
   *
   * The null is load-bearing and must not be collapsed into "some color". An
   * undeclared custom property paints as `inherit`, so a probe would report
   * the panel's own text ink — which is a plausible-looking value that makes
   * "this arrow did not come from the accent rule" and "there is no accent
   * rule" indistinguishable, and would have made the social-row assertion
   * below fail for the wrong stated reason.
   */
  declaredAccent: string | null;
};

const KILL_MOTION =
  '*, *::before, *::after { transition: none !important; animation: none !important }';

/**
 * Which layout the page is actually in, asked of the browser in the same terms
 * the stylesheet asks it (`--bp-stack: 1024px`).
 *
 * Deliberately not derived from a viewport number. `testInfo.project.use.viewport`
 * is config that can drift from what is rendering, and `page.viewportSize()`
 * returns `null` for a context with no explicit viewport — which, collapsed to a
 * width of 0, would silently select the stack branch and skip every desktop
 * assertion. A gap in coverage that reports as a pass is the failure mode this
 * whole spec exists to prevent, so the question is put to `matchMedia` instead:
 * no null, no fallback, and no breakpoint restated away from the one in the CSS.
 */
async function readLayout(page: Page): Promise<{ isStack: boolean; width: number }> {
  return page.evaluate(() => ({
    isStack: window.matchMedia('(max-width: 1023px)').matches,
    width: window.innerWidth,
  }));
}

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

      const glyph = anchor.querySelector<HTMLElement>('.link-arrow, .s-arrow');
      let arrow: Sample['arrow'] = null;
      if (glyph) {
        let glyphOpacity = 1;
        for (let node: Element | null = glyph; node; node = node.parentElement) {
          const value = Number.parseFloat(getComputedStyle(node).opacity);
          if (!Number.isNaN(value)) glyphOpacity *= value;
        }
        arrow = {
          kind: glyph.classList.contains('s-arrow') ? 's-arrow' : 'link-arrow',
          rawInk: getComputedStyle(glyph).color,
          opacity: glyphOpacity,
        };
      }

      // Resolve the panel's --arrow-accent the way the browser would, by
      // painting it onto a throwaway span inside that panel. Reading the raw
      // custom-property value would return the unresolved `var(--blue)` text.
      const rawAccent = getComputedStyle(panel).getPropertyValue('--arrow-accent').trim();
      let declaredAccent: string | null = null;
      if (rawAccent) {
        const probe = document.createElement('span');
        probe.style.color = rawAccent;
        panel.appendChild(probe);
        declaredAccent = getComputedStyle(probe).color;
        probe.remove();
      }

      out.push({
        panel: [...panel.classList].find((c) => c.startsWith('panel--')) ?? '?',
        cls: [...anchor.classList].join('.') || '(bare)',
        text: (anchor.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40),
        rawInk: style.color,
        rawPlane,
        opacity,
        arrow,
        declaredAccent,
      });
    });
    return out;
  });
}

/**
 * Composite a possibly-transparent foreground onto an opaque background.
 * Returns an opaque color, because a contrast ratio is only meaningful
 * between two colors that are actually painted.
 */
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

/**
 * A link's text contrast against the plane it renders on, with both its
 * color alpha and any inherited element `opacity` folded in.
 */
function contrastOf(sample: Sample): number {
  const plane = planeOf(sample);
  const ink = parseComputedColor(sample.rawInk);
  expect(ink, `Unable to parse ink color: ${sample.rawInk}`).not.toBeNull();
  const composited = over({ ...ink!, a: ink!.a * sample.opacity }, plane);
  return contrastRatio(composited, plane);
}

/**
 * Assert every sampled link clears the 4.5:1 text floor, reporting all the
 * failures at once rather than stopping at the first: which links fail, and
 * by how much, is the useful output when a plane's foreground moves.
 */
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

/* ── The accent-arrow contract (#978) ───────────────────────────────────────
   global.css § Accent arrows states the rule; this restates it as assertions.
   The set is editorial and cannot be derived from structure, which is why it
   drifted across two hand-maintained allow-lists — so it is named here, and a
   panel link that is not on one of these three lists fails the test. Adding an
   arrow is then a deliberate edit to a named list, in two places that must
   agree, rather than a silent consequence of picking a class.

   Names are the discriminating class, not every class the anchor carries.
   `p-name` identifies the project titles: they share `p-name-link` with the
   résumé link and with the five article titles, and only the first two of
   those three carry an arrow. */
const CARRIES_ACCENT_ARROW = [
  'about-resume-link', // prominent action
  'availability-mailto',
  'availability-booking',
  'availability-resume',
  'ribbon-exit', // exit action — About, Projects, Connect
  'p-name', // project titles — linked entity
  'effort-link', // organizations — linked entity
  'blog-callout-link', // Latest Post — prominent linked entity
];

/** Deliberately arrowless: a compact article list should read as a list. */
const CARRIES_NO_ARROW = ['writing-link'];

/** Its own list-row affordance, a different element by design (#302). */
const CARRIES_S_ARROW = ['social-row'];

/**
 * The accent each plane gives its arrows, as the contrast ratio it produces
 * against that plane — the currency the decision was made in (#978).
 *
 * Ratios rather than hexes so the assertion tracks the DECISION, not the
 * spelling of a token. Every rejected candidate lands on a different number:
 * on black, --veil-on-black reads 10.35 where --blue-contrast reads 11.49; on
 * blue, --blue-contrast reads 6.28 and --paper 6.91 where --cream reads 6.08;
 * on yellow, the --ink-warm this arrow moved off reads 11.51 against 4.27. So
 * a swap back to any of them fails here rather than passing quietly.
 */
const PLANE_ACCENT_RATIO: Record<string, number> = {
  'panel--red': 4.95, // --paper. A known limitation: see the CSS note.
  'panel--yellow': 4.27, // --blue
  'panel--black': 11.49, // --blue-contrast
  'panel--blue': 6.08, // --cream
};

/** Parchment, which is what any open panel shows. --blue on all four. */
const OPEN_ACCENT_RATIO = 5.15;

/** An aria-hidden glyph beside link text that names the control (WCAG 1.4.11). */
const AA_ARROW = 3;

/**
 * Which named entries of the three lists above this link matches. Exactly one
 * is the contract; zero means an unnamed panel link, and more than one means
 * the lists have stopped being disjoint. Both are failures, and the caller
 * reports them differently.
 */
function identify(sample: Sample): string[] {
  const classes = sample.cls.split('.');
  return [...CARRIES_ACCENT_ARROW, ...CARRIES_NO_ARROW, ...CARRIES_S_ARROW].filter((name) =>
    classes.includes(name),
  );
}

/** The arrow glyph's own contrast against the plane, composited like the link's. */
function arrowContrast(sample: Sample): number {
  const plane = planeOf(sample);
  const ink = parseComputedColor(sample.arrow!.rawInk);
  expect(ink, `Unable to parse arrow color: ${sample.arrow!.rawInk}`).not.toBeNull();
  return contrastRatio(over({ ...ink!, a: ink!.a * sample.arrow!.opacity }, plane), plane);
}

/**
 * The three halves of the accent-arrow contract for one panel in one state:
 * the arrow-bearing set matches the named lists, every accent arrow resolves
 * from the panel's `--arrow-accent` rather than inheriting, and each clears
 * the 3:1 floor at the ratio this plane decided on.
 */
function assertArrowContract(samples: Sample[], state: string, expectedRatio: number): void {
  expect(samples.length, `no links sampled in ${state}`).toBeGreaterThan(0);

  // 1. Every panel link is on exactly one named list, and carries what that
  //    list says it carries. This is the pin: a new link cannot acquire or
  //    omit an arrow without failing here.
  const wrong: string[] = [];
  for (const sample of samples) {
    const names = identify(sample);
    const where = `${state} · ${sample.panel} .${sample.cls} "${sample.text}"`;
    if (names.length !== 1) {
      wrong.push(`${where}: matches ${names.length} named entries (${names.join(', ') || 'none'})`);
      continue;
    }
    const [name] = names;
    const want = CARRIES_ACCENT_ARROW.includes(name)
      ? 'link-arrow'
      : CARRIES_S_ARROW.includes(name)
        ? 's-arrow'
        : null;
    const got = sample.arrow?.kind ?? null;
    if (got !== want)
      wrong.push(`${where}: expected ${want ?? 'no arrow'}, found ${got ?? 'none'}`);
  }
  expect(wrong, `arrow-bearing set does not match the named lists in ${state}`).toEqual([]);

  // 2. Every accent arrow takes its color from the one rule, via the plane's
  //    declared --arrow-accent. An arrow inheriting its link's ink by omission
  //    — the defect #978 was filed for — fails here even when it looks fine.
  const accented = samples.filter((s) => s.arrow?.kind === 'link-arrow');
  expect(accented.length, `no accent arrows sampled in ${state}`).toBeGreaterThan(0);
  const undeclared = [
    ...new Set(accented.filter((s) => s.declaredAccent === null).map((s) => s.panel)),
  ];
  expect(undeclared, `panels declaring no --arrow-accent in ${state}`).toEqual([]);
  const inherited = accented
    .filter((s) => s.arrow!.rawInk !== s.declaredAccent)
    .map((s) => `${s.panel} .${s.cls}: ${s.arrow!.rawInk} != declared ${s.declaredAccent}`);
  expect(inherited, `accent arrows not resolved from --arrow-accent in ${state}`).toEqual([]);

  // 3. The floor, and the decision. Both measured on the composited plane.
  const failures = accented
    .map((s) => ({ s, ratio: arrowContrast(s) }))
    .filter(({ ratio }) => ratio < AA_ARROW)
    .map(({ s, ratio }) => `${s.panel} .${s.cls} = ${ratio.toFixed(2)}:1`);
  expect(failures, `accent arrows below ${AA_ARROW}:1 in ${state}`).toEqual([]);

  for (const sample of accented) {
    expect(
      arrowContrast(sample),
      `${state} · ${sample.panel} .${sample.cls} accent is not the one this plane decided on`,
    ).toBeCloseTo(expectedRatio, 1);
  }
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
    await page.goto('/');
    await page.addStyleTag({ content: KILL_MOTION });
    const { isStack, width } = await readLayout(page);

    if (isStack) {
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

  test("accent arrows: the set is the named one, and each takes its plane's accent", async ({
    page,
  }) => {
    await page.goto('/');
    await page.addStyleTag({ content: KILL_MOTION });
    const { isStack, width } = await readLayout(page);

    if (isStack) {
      expect(await page.locator('.panel.is-open').count(), 'a panel opened in stack mode').toBe(0);
      const samples = await sampleLinks(page);
      // Each closed panel shows its own plane, so each has its own accent.
      for (const panel of PANELS) {
        assertArrowContract(
          samples.filter((s) => s.panel === panel),
          `stack ${width}px, ${panel} closed`,
          PLANE_ACCENT_RATIO[panel],
        );
      }
      return;
    }

    for (const panel of PANELS) {
      await page.hover(`.${panel}`);
      await expect(page.locator(`.${panel}.is-content-visible`)).toHaveCount(1);
      assertArrowContract(
        (await sampleLinks(page)).filter((s) => s.panel === panel),
        `desktop ${width}px, ${panel} open`,
        OPEN_ACCENT_RATIO,
      );
    }
  });

  test('social rows keep .s-arrow, outside the accent rule', async ({ page }) => {
    // #978 owns .link-arrow and nothing else. .s-arrow is a list-row
    // affordance with its own layout and opacity ramp (#302), and the way to
    // prove it did not get swept into the accent rule is that its color is not
    // the plane's accent — not merely that the element still exists.
    await page.goto('/');
    await page.addStyleTag({ content: KILL_MOTION });
    const { isStack } = await readLayout(page);
    // The rows live in Connect, and on desktop a closed panel's content is
    // visibility:hidden — so it has to be open before there is anything to read.
    if (!isStack) {
      await page.hover('.panel--blue');
      await expect(page.locator('.panel--blue.is-content-visible')).toHaveCount(1);
    }

    const rows = (await sampleLinks(page)).filter((s) => s.cls.split('.').includes('social-row'));
    expect(rows.length, 'no social rows rendered').toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.arrow?.kind, `${row.text} lost its .s-arrow`).toBe('s-arrow');
      // Precondition, stated separately so its absence cannot masquerade as a
      // sweep: there has to BE an accent before "not the accent" means anything.
      expect(row.declaredAccent, `${row.panel} declares no --arrow-accent`).not.toBeNull();
      expect(row.arrow!.rawInk, `${row.text} .s-arrow was swept into the accent rule`).not.toBe(
        row.declaredAccent,
      );
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
    await page.goto('/');
    await page.addStyleTag({ content: KILL_MOTION });
    const { isStack } = await readLayout(page);
    test.skip(isStack, 'no panel opens below --bp-stack; see the note above');

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
