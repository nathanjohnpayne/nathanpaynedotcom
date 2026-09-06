import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readBuiltPage, writeSanitizedDOM } from './helpers/dom.js';
import { serveStatic } from '../src/integrations/og-images.mjs';

/**
 * The Selected Projects footer's content line, under the #984 build switch.
 *
 * Every other panel footer ends on a bounded line — four scope terms in
 * Community, one title in Connect, one date in About. Builds ended on ten stack
 * items, which at this site's most common desktop viewport measured 776px of a
 * 787px ribbon (#930's own figure): the full measure, running under the exit
 * link on the row above, so the eyebrow row and the content line fused into one
 * block of same-weight gray text.
 *
 * #984 shipped DOMAINS and STACK behind a build-time switch so the two could be
 * compared on the live page; #991 settled it on DOMAINS and deleted the losing
 * branch. What remains here is the surviving line's geometry — an unconditional
 * clearance assertion, a one-line floor and a ratio ceiling — which is what
 * "bounded" meant all along and outlives the comparison.
 *
 * ## What is measured in a browser, and why
 *
 * "Bounded" is a rendered width, and the two facts that decide it — how wide
 * the ribbon is, and how wide the text runs inside it — are both invisible to
 * JSDOM, which does no layout. The ribbon's width in particular cannot be
 * derived from viewport WIDTH: the Mondrian square is `min(95vw, 95vh, 1280px)`,
 * so 1440x1024 gives a 673.1px ribbon while the wider 1024x1200 gives the same
 * one — height decides it above 1024px of width. (Before #992 that produced the
 * inversion this suite was built around: 1280x700 gave a narrower ribbon than
 * 1024x768. Both now stack.) A CSS-text assertion would pin a declaration
 * instead of the behaviour, and the declaration here is just a font-size.
 *
 * The dependency is not a new one: `npm test` runs `astro build` first, and the
 * build renders Mermaid diagrams through Playwright's Chromium, so a runner
 * without it fails long before this file. `tests/mermaid-legibility.test.js`
 * takes the same approach for the same reason.
 */

/**
 * Where the readings are taken.
 *
 * `stacked` is not a property of this file's opinion — it is
 * `min(width, height) < 1024`, the composition's minimum viewport dimension
 * (#992). The desktop Mondrian is a square sized `min(95vw, 95vh, 1280px)`, so
 * a short window shrinks it exactly as a narrow one does; below a 972.8px
 * square the panel footers stop setting as designed, and the page renders the
 * responsive composition instead.
 *
 * The first two entries are that floor, reached from each axis: 1024x1200 is
 * the narrowest legal desktop window and 1440x1024 the shortest, and both
 * produce a 972.8px square. They are the tightest desktop geometry that
 * exists, which is what makes them the readings worth taking — the rest of the
 * desktop set is looser by construction.
 *
 * The four short-window entries below were desktop readings until #992 and are
 * kept as stacked ones. They are #930's measurement set, chosen back when the
 * narrowest ribbon in the suite belonged to the second WIDEST viewport; that
 * inversion was the symptom. Their assertion now is that nothing opens there.
 */
const VIEWPORTS = [
  { name: '1024x1200', width: 1024, height: 1200, stacked: false },
  { name: '1440x1024', width: 1440, height: 1024, stacked: false },
  { name: '1503x1180', width: 1503, height: 1180, stacked: false },
  { name: '1920x1080', width: 1920, height: 1080, stacked: false },
  { name: '2560x1330', width: 2560, height: 1330, stacked: false },
  { name: '1024x768', width: 1024, height: 768, stacked: true },
  { name: '1280x700', width: 1280, height: 700, stacked: true },
  { name: '1440x900', width: 1440, height: 900, stacked: true },
  { name: '1728x1005', width: 1728, height: 1005, stacked: true },
  { name: '390x844', width: 390, height: 844, stacked: true },
  { name: '768x1024', width: 768, height: 1024, stacked: true },
];

/**
 * The two geometries at the floor, which must measure identically.
 *
 * 1024x1200 reaches a 972.8px square by width, 1440x1024 by height. The
 * composition cannot tell which axis constrained it — that is the whole
 * argument for one floor governing both — so if these two ever diverge, the
 * square has stopped being a function of `min(vw, vh)` and the breakpoint's
 * premise is gone.
 */
const FLOOR_TWINS = ['1024x1200', '1440x1024'];

/*
 * The clearance floor and its exemption list are gone with #992.
 *
 * They existed because the desktop composition was allowed into geometries
 * where its own criterion could not be met: at a 665px square the ribbon is
 * 427px, the exit link takes ~136px of the row above, and no line worth
 * printing fits the remainder. The suite handled that by classifying such
 * viewports as exempt — `CLEARANCE_FLOOR_PX = 450` and
 * `BELOW_FLOOR = ['1280x700']` — which is a desktop invariant asserted against
 * a viewport that cannot satisfy it, and then excused for not satisfying it.
 *
 * The minimum-dimension floor removes the geometries instead of the assertion.
 * The tightest desktop ribbon that now exists is 673.1px, at the 972.8px square
 * both floor twins produce, where the line clears by 212.7px. Every desktop
 * reading clears, so the assertion below is unconditional and there is no
 * exemption list left to keep from widening.
 */

/**
 * How much of the clearance margin is allowed to be an artefact of which font
 * rendered, rather than of the layout.
 *
 * `document.fonts.ready` settles whether the faces loaded or failed, so a
 * runner that cannot reach fonts.gstatic.com measures the fallback stack and
 * not Inter (Codex, PR #985). Serving a local fixture would fix the determinism
 * by measuring a typography the site does not ship — Inter is Google-hosted by
 * design (docs/agents/code-modification-rules.md § Typography) — so the
 * assertion is made insensitive to the difference instead.
 *
 * Measured with fonts.gstatic.com blocked: the DOMAINS line renders 326.2px
 * against 323.7px loaded, 2.5px and 0.8%. Requiring the clearance to exceed 4px
 * rather than 0 puts the whole of that delta inside the margin, so the
 * assertion holds under either typography and fails only on a real regression.
 * The tightest reading in the set clears by 23.3px, so this costs nothing.
 *
 * The ratio ceilings need no equivalent: their headroom is 0.043 against a
 * font delta of 0.003.
 */
const FONT_DELTA_PX = 4;

/**
 * The ribbon width below which this mode's line is not expected to hold one
 * line, and the viewports that fall under it.
 *
 * Classified by measured ribbon width rather than by layout. An earlier form of
 * this excused BOTH stacked viewports under `stack`, and only one of them wraps
 * — the tablet's 706px ribbon holds the capped rung on one line at 413.5px, so
 * a spacing or typography regression that wrapped it there would have passed
 * (Codex, PR #985). `domains` takes 0: it wraps nowhere in the set, including
 * the 328px phone column, which is the ticket's whole claim.
 *
 * `stack` takes 350, between the phone's 328px row and the tablet's 706px one.
 * #930 states rung 6 needs ~37em and calls that floor editorial rather than a
 * fit guarantee, so the phone wrap is expected there and is not a defect.
 */
const ONE_LINE_FLOOR_PX = 0;

/** The viewports that fall under it, pinned so the exemption cannot widen. */
const WRAPS_BELOW_FLOOR = [];

/**
 * The widest fraction of the ribbon the content line may occupy, per mode.
 *
 * Desktop only. Below `--bp-stack` the panel is a 328px phone column and any
 * line worth printing fills most of it; "bounded fraction of the measure" is a
 * claim about the composition, which is where the ten-item line ran 0.986.
 *
 * Recalibrated with #992. The old ceiling of 0.8 sat just over 0.757, the
 * maximum measured at 1280x700 — a viewport that no longer renders the
 * composition at all. The tightest desktop reading is now 0.481, at the 972.8px
 * square both floor twins produce, so 0.8 would let the line run two thirds
 * longer before failing. 0.6 keeps the same job the ceiling always had: catch
 * the line growing back toward the full measure, where the ten-item line it
 * replaced ran 0.986. It is not a re-derivation of today's number.
 */
const MEASURE_CEILING = 0.6;

/** Selectors for the footer's content line. */
const ACTIVE = { ribbon: '.domains-ribbon', label: '.domains-label', items: '.domains-items' };

/**
 * The four domains, in render order.
 *
 * Pinned as a literal here rather than imported. It used to come from
 * `src/lib/projects-ribbon.ts`, and reading it from the module the page also
 * reads would have asserted that the page renders whatever the array holds —
 * true of any array. The module is gone with the switch (#991); the list now
 * lives inline in `src/pages/index.astro` and this is its independent copy.
 */
const PROJECT_DOMAINS = ['Consumer', 'Enterprise', 'Finance', 'Developer tooling'];

describe('Selected Projects footer line (#984, switch removed in #991)', () => {
  let panel;

  beforeAll(() => {
    writeSanitizedDOM(readBuiltPage('index.html'));
    panel = document.querySelector('[data-panel="projects"]');
    expect(panel, 'homepage Projects panel missing from the build').not.toBeNull();
  });

  it('renders exactly one content line, and no residue of the deleted branch', () => {
    expect(panel.querySelectorAll(ACTIVE.ribbon)).toHaveLength(1);
    expect(panel.querySelectorAll(ACTIVE.items)).toHaveLength(1);
    // The STACK branch is gone (#991), and this is the residue guard for it:
    // asserted across the whole DOCUMENT, not the panel, because a stray that
    // landed in a different panel is exactly what a per-panel check would miss.
    for (const selector of ['.stack-ribbon', '.stack-items', '.stack-item', '.stack-label']) {
      expect(
        document.querySelectorAll(selector),
        `${selector} survives the removal of the STACK branch`,
      ).toHaveLength(0);
    }
  });

  it('keeps the panel exit on the ribbon row, in either mode', () => {
    // #975 put every panel's exit on its footer's eyebrow row. The switch
    // rebuilds that row in both branches, which is exactly where a copied
    // block loses a link — and the analytics event that reports the click
    // keys off `.ribbon-exit` inside `[data-panel]` (specs/analytics.md).
    const exits = panel.querySelectorAll('.ribbon-exit');
    expect(exits).toHaveLength(1);
    expect(exits[0].getAttribute('href')).toBe('/projects/');
    expect(
      exits[0].closest('.ribbon-row')?.parentElement?.classList.contains(ACTIVE.ribbon.slice(1)),
      `the exit is not on the ${ACTIVE.ribbon} row`,
    ).toBe(true);
    expect(exits[0].closest('.ribbon-row').querySelector(ACTIVE.label)).not.toBeNull();
  });

  it('says the four domains, in order, and stops saying them in the intro', () => {
    const items = panel.querySelector('.domains-items');
    // Split on the separator, then normalise the non-breaking spaces back —
    // the terms are compared as words, and the NBSP is asserted separately
    // below as the thing it is: a line-breaking decision.
    const rendered = items.textContent.split(' · ').map((term) => term.replaceAll('\u00a0', ' '));
    expect(rendered).toEqual([...PROJECT_DOMAINS]);
    expect(panel.querySelector('.domains-label').textContent).toBe('Domains');

    // A multi-word term must not be splittable across the two lines the
    // ribbon can produce, so its internal space is non-breaking — the same
    // treatment Community gives "Campaign Building". Written as escapes
    // because the two characters are indistinguishable on screen, which is
    // the whole reason this can regress unnoticed.
    expect(items.textContent).toContain('Developer\u00a0tooling');
    expect(items.textContent, 'a domain broke across a breakable space').not.toContain(
      'Developer tooling',
    );

    // The line the footer now carries left the intro rather than being said
    // twice. Asserted on the first sentence, not on the whole paragraph:
    // tests/project-pages.test.js pins the paragraph verbatim.
    const intro = panel.querySelector('.content-inner > p');
    expect(intro.textContent).not.toContain('The projects span');
    expect(intro.textContent.startsWith('The case studies focus')).toBe(true);
  });
});

/**
 * One reading of the footer as a reader meets it, at one viewport.
 *
 * The text width is taken from a `Range` over the items element's contents, not
 * from the element's own box. The element is a flex item and so is blockified
 * to the full ribbon width whatever its text does — measuring the box would
 * report 100% at every viewport in every mode, which is a number that always
 * passes and never means anything.
 */
function readFooter([ribbonSel, itemsSel]) {
  const ribbon = document.querySelector(ribbonSel);
  if (!ribbon) return null;
  const row = ribbon.querySelector('.ribbon-row');
  const exit = ribbon.querySelector('.ribbon-exit');
  const items = ribbon.querySelector(itemsSel);
  const range = document.createRange();
  range.selectNodeContents(items);
  // Every geometry reading is taken here, before the ink comparison below
  // inserts anything into the tree. The clones it inserts are removed as it
  // goes, so reading afterwards would give the same numbers today — but then
  // half the readings would be taken on a mutated DOM and half on a clean one,
  // which is a difference nothing in the result would show.
  const text = range.getBoundingClientRect();
  const rowBox = row.getBoundingClientRect();
  const geometry = {
    rowWidth: rowBox.width,
    textWidth: text.width,
    // Distinct line tops, not the raw rect count: under `stack` the range spans
    // six child spans and reports one rect each, all on the same line.
    lines: new Set([...range.getClientRects()].map((rect) => Math.round(rect.top))).size,
    // Positive when the line ends before the exit link's left edge.
    clearance: exit.getBoundingClientRect().left - text.right,
    opened: document
      .querySelector('[data-panel="projects"]')
      .classList.contains('is-content-visible'),
    // Recorded for diagnosis, not asserted: a runner with no route to Google
    // Fonts is a legitimate environment, and every margin here is set wide
    // enough to hold under either typography. What this turns into is a
    // readable failure message when one of them does not.
    interLoaded: document.fonts.check('1em Inter'),
  };

  return geometry;
}

const readings = new Map();
let server;
let browser;

beforeAll(async () => {
  const { chromium } = await import('playwright');
  const started = await serveStatic('dist');
  server = started.server;
  browser = await chromium.launch();

  for (const viewport of VIEWPORTS) {
    const page = await browser.newPage({
      viewport: { width: viewport.width, height: viewport.height },
    });
    await page.goto(`http://127.0.0.1:${started.port}/`, { waitUntil: 'load' });
    // Every reading here is a TEXT WIDTH, so it is a measurement of the font
    // family and not only of its size — and `load` does not mean the webfonts
    // have arrived. Inter is served `font-display: swap`, so a slow Google
    // Fonts response leaves the ribbon set in the fallback stack, which is
    // measurably wider; the ladder's own thresholds in global.css carry a note
    // about exactly that. Without this the line-count, ratio and clearance
    // assertions would turn on network timing rather than on the typography
    // the page ships (Codex, PR #985). `document.fonts.ready` also settles
    // before the page's own `measureContentHeights()`, which is gated on it.
    await page.evaluate(() => document.fonts.ready);
    // Transitions and animations are killed before anything is read: a hidden
    // browser pane freezes the animation clock, and a property read mid-
    // transition then reports its start value forever. Same guard, and the
    // same reason, as tests/responsive/home-panel-contrast.spec.ts.
    await page.addStyleTag({
      content: '*,*::before,*::after{transition:none!important;animation:none!important}',
    });

    // Desktop panels are closed until hovered, and a closed panel's cell is a
    // different width from an open one — so the ribbon has to be read in the
    // state a reader reads it in. Opened by moving a real cursor onto the
    // panel rather than by stamping `.is-open` on it, because the grid's focus
    // state is what resizes the cell and only the page's own state machine
    // sets it. Below `--bp-stack` nothing opens and the content is always
    // visible.
    if (!viewport.stacked) {
      const box = await page.locator('[data-panel="projects"]').boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForSelector('[data-panel="projects"].is-content-visible', {
        timeout: 10_000,
      });
    }

    readings.set(viewport.name, await page.evaluate(readFooter, [ACTIVE.ribbon, ACTIVE.items]));
    await page.close();
  }
}, 180_000);

afterAll(async () => {
  await browser?.close();
  // Playwright leaves keep-alive sockets open and `close` alone waits on them
  // rather than on the listener.
  server?.closeAllConnections?.();
  server?.close();
});

describe.each(VIEWPORTS)('Selected Projects footer line as rendered at $name', (viewport) => {
  it('was read with the panel in the state a reader meets it in', () => {
    // The control for every assertion below. A reading taken from a page that
    // never opened the panel reports the closed cell's width, which is a
    // plausible number and a different question.
    const reading = readings.get(viewport.name);
    expect(reading, `no ${ACTIVE.ribbon} on the built page`).not.toBeNull();
    expect(reading.opened).toBe(!viewport.stacked);
    expect(reading.rowWidth).toBeGreaterThan(0);
    expect(reading.textWidth).toBeGreaterThan(0);
  });

  it('sets on one line, wherever the ribbon is wide enough to hold it', () => {
    // The property that makes this a line rather than a block, and the first
    // thing a fifth domain would break.
    //
    // Exempted by measured ribbon width, not by layout: `domains` holds one
    // line at every width in the set including the 328px phone column, and
    // `stack` holds it everywhere but there.
    const reading = readings.get(viewport.name);
    if (reading.rowWidth < ONE_LINE_FLOOR_PX) return;
    expect(reading.lines, `${reading.interLoaded ? '' : '(Inter did not load) '}wrapped`).toBe(1);
  });

  it.runIf(!viewport.stacked)('stays a bounded fraction of the measure', () => {
    const { textWidth, rowWidth } = readings.get(viewport.name);
    expect(textWidth / rowWidth).toBeLessThanOrEqual(MEASURE_CEILING);
  });

  /*
   * The ink-equality check lived here and is gone with the switch (#991): it
   * compared DOMAINS' inks against a clone of the same element wearing STACK's
   * class, and there is no second mode left to compare against.
   *
   * Its CONCLUSION is worth keeping, because it is a measurement nothing else
   * in the suite re-derives. The two lines rendered identical inks on every
   * plane: 5.82:1 on the yellow plane in the stacked layout, and 3.33:1 on the
   * parchment of an open panel. The parchment figure is the label voice #979
   * kept for static text — pre-existing, and shared with SCOPE, LAST UPDATED
   * and the rest of the footer labels, which is why DOMAINS needed no contrast
   * work of its own when it became the only line.
   *
   * That the check was measuring rather than agreeing with itself was itself
   * verified: dropping `.domains-items` from one shared rule in global.css
   * failed it at all nine viewports, 16px inherited type against the ribbon's
   * 0.68rem.
   */
});

describe('Selected Projects footer line against the exit link (#984)', () => {
  /** Every desktop reading. No longer split — see the #992 note above. */
  const desktop = () =>
    VIEWPORTS.filter((viewport) => !viewport.stacked).map((viewport) => ({
      name: viewport.name,
      ...readings.get(viewport.name),
    }));

  it('ends short of the link at every desktop geometry, with no exemptions', () => {
    const readingsToCheck = desktop();
    // Control: a clean pass has to mean "checked and clear", not "there was
    // nothing to check". If VIEWPORTS ever lost its desktop entries — which is
    // exactly what the #992 reclassification did to four of them — this would
    // sweep an empty list and report success.
    expect(readingsToCheck.length, 'no desktop reading to check').toBeGreaterThan(0);
    for (const reading of readingsToCheck) {
      expect(
        reading.clearance,
        `${reading.name} runs under the exit link` +
          (reading.interLoaded ? '' : ' (and Inter did not load, so this is fallback metrics)'),
      ).toBeGreaterThan(FONT_DELTA_PX);
    }
  });

  it('reaches the same geometry from either axis at the floor', () => {
    // The breakpoint's premise, asserted rather than assumed: the square is
    // min(95vw, 95vh, 1280px), so the narrowest legal desktop window and the
    // shortest one are the same composition. If these diverge, a floor stated
    // on one axis has stopped implying the other and #992's reasoning is void.
    const [byWidth, byHeight] = FLOOR_TWINS.map((name) => readings.get(name));
    expect(byWidth, `${FLOOR_TWINS[0]} was not read`).toBeTruthy();
    expect(byHeight, `${FLOOR_TWINS[1]} was not read`).toBeTruthy();
    expect(byHeight.rowWidth).toBeCloseTo(byWidth.rowWidth, 1);
    expect(byHeight.textWidth).toBeCloseTo(byWidth.textWidth, 1);
  });

  it('names the widths where this line is not expected to hold one line', () => {
    // Pinned rather than left implicit: an exemption nobody enumerates is an
    // exemption that widens. This list is empty and has been since #991 — the
    // line wraps nowhere in the set, including the 328px phone column.
    const wrapping = VIEWPORTS.filter(
      (viewport) => readings.get(viewport.name).rowWidth < ONE_LINE_FLOOR_PX,
    ).map((viewport) => viewport.name);
    expect(wrapping).toEqual(WRAPS_BELOW_FLOOR);
  });
});
