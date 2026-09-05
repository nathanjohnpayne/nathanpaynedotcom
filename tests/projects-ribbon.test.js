import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readBuiltPage, writeSanitizedDOM } from './helpers/dom.js';
import { serveStatic } from '../src/integrations/og-images.mjs';
import { PROJECTS_RIBBON, PROJECT_DOMAINS, STACK_CAP } from '../src/lib/projects-ribbon';

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
 * `PROJECTS_RIBBON` picks which line the build renders. Both branches are
 * asserted here, the inactive one by its absence, so flipping the switch is a
 * one-word change the suite validates either way.
 *
 * ## What is measured in a browser, and why
 *
 * "Bounded" is a rendered width, and the two facts that decide it — how wide
 * the ribbon is, and how wide the text runs inside it — are both invisible to
 * JSDOM, which does no layout. The ribbon's width in particular cannot be
 * derived from the viewport: the Mondrian square is sized from viewport
 * HEIGHT, so a short-and-wide window (1280x700) gives a NARROWER ribbon than a
 * small one (1024x768). A CSS-text assertion would pin a declaration instead of
 * the behaviour, and the declaration here is just a font-size.
 *
 * The dependency is not a new one: `npm test` runs `astro build` first, and the
 * build renders Mermaid diagrams through Playwright's Chromium, so a runner
 * without it fails long before this file. `tests/mermaid-legibility.test.js`
 * takes the same approach for the same reason.
 */

/**
 * Where the readings are taken.
 *
 * The seven desktop entries are #930's measurement set — chosen because the
 * ribbon's width tracks viewport height, so they span 427px to 897px of ribbon
 * without moving in width order. The two starred entries are below
 * `--bp-stack`, where the composition is gone and the panel is full-width.
 */
const VIEWPORTS = [
  { name: '1024x768', width: 1024, height: 768, stacked: false },
  { name: '1280x700', width: 1280, height: 700, stacked: false },
  { name: '1440x900', width: 1440, height: 900, stacked: false },
  { name: '1503x1180', width: 1503, height: 1180, stacked: false },
  { name: '1728x1005', width: 1728, height: 1005, stacked: false },
  { name: '1920x1080', width: 1920, height: 1080, stacked: false },
  { name: '2560x1330', width: 2560, height: 1330, stacked: false },
  { name: '390x844', width: 390, height: 844, stacked: true },
  { name: '768x1024', width: 768, height: 1024, stacked: true },
];

/**
 * The ribbon width at which "nothing renders under the exit link" starts to be
 * geometrically available — **per mode**, because the two lines are not the
 * same length and do not become feasible at the same width.
 *
 * The exit link sits at the right of the row above the content line and takes
 * ~136px of it, so the content line clears the link's column only when the
 * ribbon is wide enough to hold both. Below some width no line of this kind
 * clears it, whichever words it holds — that is a property of the ribbon, not
 * of the copy. Measured clearance in px, positive when the line ends before the
 * link's left edge:
 *
 *     ribbon   viewport      domains    stack
 *      427.4   1280x700        -33.1   -109.1
 *      483.8   1024x768        +23.3    -52.7
 *      582.5   1440x900       +122.1    +46.1
 *      659.3   1728x1005      +198.8   +122.8
 *      714.1   1920x1080      +253.6   +177.6
 *      787.2   1503x1180      +326.7   +250.7
 *      896.8   2560x1330      +436.3   +360.3
 *
 * A single floor at 580 would have been true of both columns and would have
 * thrown away the 1024x768 reading under `domains`, where the shorter line
 * clears by 23.3px: a later copy or typography change could have spent that
 * margin at the stacked breakpoint with the suite still green (Codex, PR #985).
 * So each mode takes the floor its own column supports, placed in the gap
 * between the last reading that fails and the first that clears — 427.4/483.8
 * for `domains`, 483.8/582.5 for `stack` — rather than on a reading.
 *
 * The ribbon's width tracks viewport HEIGHT, because the Mondrian square is
 * sized from it. That is why the narrowest ribbon in the set belongs to the
 * second WIDEST viewport, and why the floor cannot be stated as a breakpoint.
 */
const CLEARANCE_FLOOR_PX = { domains: 450, stack: 530 };

/**
 * The viewports whose ribbon falls under that floor, per mode.
 *
 * Pinned as a set rather than left implicit. These are the widths at which the
 * criterion is unreachable, and naming them is what keeps the exception from
 * widening quietly — a third viewport arriving here fails, whether it got here
 * because the composition changed or because the line grew.
 */
const BELOW_FLOOR = { domains: ['1280x700'], stack: ['1024x768', '1280x700'] };

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
const ONE_LINE_FLOOR_PX = { domains: 0, stack: 350 };

/** The viewports that fall under it, pinned so the exemption cannot widen. */
const WRAPS_BELOW_FLOOR = { domains: [], stack: ['390x844'] };

/**
 * The widest fraction of the ribbon the content line may occupy, per mode.
 *
 * Desktop only. Below `--bp-stack` the panel is a 328px phone column and any
 * line worth printing fills most of it; "bounded fraction of the measure" is a
 * claim about the composition, which is where the ten-item line ran 0.986.
 *
 * Measured desktop maxima, both at 1280x700 where the ribbon is narrowest:
 * 0.757 under `domains` and 0.935 under `stack`. The ceilings leave a little
 * over that and exist to catch the line growing back toward the full measure,
 * not to re-derive today's numbers.
 */
const MEASURE_CEILING = { domains: 0.8, stack: 0.96 };

/** Selectors for the line this build actually rendered. */
const ACTIVE =
  PROJECTS_RIBBON === 'domains'
    ? { ribbon: '.domains-ribbon', label: '.domains-label', items: '.domains-items' }
    : { ribbon: '.stack-ribbon', label: '.stack-label', items: '.stack-items' };

/** Selectors for the branch this build did not take. */
const INACTIVE =
  PROJECTS_RIBBON === 'domains'
    ? { ribbon: '.stack-ribbon', label: '.stack-label', items: '.stack-items' }
    : { ribbon: '.domains-ribbon', label: '.domains-label', items: '.domains-items' };

describe(`Selected Projects footer line, mode "${PROJECTS_RIBBON}" (#984)`, () => {
  let panel;

  beforeAll(() => {
    writeSanitizedDOM(readBuiltPage('index.html'));
    panel = document.querySelector('[data-panel="projects"]');
    expect(panel, 'homepage Projects panel missing from the build').not.toBeNull();
  });

  it('renders one content line, and only the one this mode selects', () => {
    expect(panel.querySelectorAll(ACTIVE.ribbon)).toHaveLength(1);
    expect(panel.querySelectorAll(ACTIVE.items)).toHaveLength(1);
    // The branch that did not run leaves nothing behind anywhere on the page —
    // two content lines in one footer is the failure a per-panel check would
    // miss if the stray landed in a different panel.
    expect(document.querySelectorAll(INACTIVE.ribbon)).toHaveLength(0);
    expect(document.querySelectorAll(INACTIVE.items)).toHaveLength(0);
    expect(document.querySelectorAll(INACTIVE.label)).toHaveLength(0);
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

  it.runIf(PROJECTS_RIBBON === 'domains')(
    'says the four domains, in order, and stops saying them in the intro',
    () => {
      // Pinned as a literal as well as against the module: reading only the
      // module would assert that the page renders whatever the array holds,
      // which is true of any array.
      expect([...PROJECT_DOMAINS]).toEqual([
        'Consumer',
        'Enterprise',
        'Finance',
        'Developer tooling',
      ]);

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
    },
  );

  it.runIf(PROJECTS_RIBBON === 'stack')(
    'says the capped stack, and keeps the sentence in the intro',
    () => {
      // The ladder's own contents are tests/homepage-stack-ladder.test.js's
      // subject. What belongs here is the pair the switch controls: the cap,
      // and the intro sentence that only this mode keeps.
      // Which items those are is pinned in tests/homepage-stack-ladder.test.js,
      // against the hand-written rung table. What belongs here is the cap
      // itself: nothing above it ships, so no container query decides whether
      // an item appears. Asserted on the tier and not on the count — the two
      // are equal for every rung of #930's ladder, which makes a count check
      // look like it is testing the cap when it is testing a coincidence.
      const shipped = [...panel.querySelectorAll('.stack-items .stack-item')];
      expect(
        shipped.length,
        'control: no stack items found, so the sweep is vacuous',
      ).toBeGreaterThan(0);
      expect(
        shipped
          .map((item) => Number(item.getAttribute('data-stack-tier')))
          .filter((tier) => tier > STACK_CAP),
        'a shipped item is above the cap, so a container query decides whether it appears',
      ).toEqual([]);
      expect(panel.querySelector('.stack-label').textContent).toBe('Stack');

      const intro = panel.querySelector('.content-inner > p');
      expect(intro.textContent.startsWith('The projects span consumer')).toBe(true);
    },
  );
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
function readFooter([ribbonSel, itemsSel, labelSel, twin]) {
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

  /**
   * The properties the two modes must agree on, read off `el`, and read again
   * off a copy of `el` wearing the OTHER mode's class in the same position in
   * the tree.
   *
   * Measured rather than compared as CSS text. The inks are `color-mix()` and
   * `var()` values that resolve differently per plane and per open state, and
   * a rule can name both classes and still land differently through
   * specificity or source order — which a grep over the stylesheet cannot see.
   * The copy is inserted as the next sibling so it inherits the same cascade,
   * and removed before anything is measured for layout.
   */
  const agrees = (el, from, to, properties) => {
    const read = (node) => {
      const style = getComputedStyle(node);
      return properties.map((property) => `${property}: ${style[property]}`).join('; ');
    };
    const clone = el.cloneNode(false);
    clone.classList.remove(from);
    clone.classList.add(to);
    el.parentElement.insertBefore(clone, el.nextSibling);
    const twinStyle = read(clone);
    clone.remove();
    return { own: read(el), twin: twinStyle };
  };

  const inks = ['color', 'fontSize', 'letterSpacing', 'opacity'];
  return {
    ink: {
      label: agrees(ribbon.querySelector(labelSel), labelSel.slice(1), twin.label.slice(1), inks),
      items: agrees(items, itemsSel.slice(1), twin.items.slice(1), inks),
      ribbon: agrees(ribbon, ribbonSel.slice(1), twin.ribbon.slice(1), [
        'borderTopColor',
        'borderTopWidth',
        'marginTop',
        'paddingTop',
      ]),
    },
    ...geometry,
  };
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

    readings.set(
      viewport.name,
      await page.evaluate(readFooter, [ACTIVE.ribbon, ACTIVE.items, ACTIVE.label, INACTIVE]),
    );
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
    if (reading.rowWidth < ONE_LINE_FLOOR_PX[PROJECTS_RIBBON]) return;
    expect(reading.lines, `${reading.interLoaded ? '' : '(Inter did not load) '}wrapped`).toBe(1);
  });

  it.runIf(!viewport.stacked)('stays a bounded fraction of the measure', () => {
    const { textWidth, rowWidth } = readings.get(viewport.name);
    expect(textWidth / rowWidth).toBeLessThanOrEqual(MEASURE_CEILING[PROJECTS_RIBBON]);
  });

  it('gives DOMAINS and STACK the same inks on whatever plane is showing', () => {
    // The two are one line in one footer under a build switch, so a second set
    // of inks would be a second contrast surface to keep in step with
    // #977–#979 for no visible difference. Equality is the assertion, not a
    // ratio: the plane under this footer changes with the panel's open state
    // and with the layout, and the pair has to agree on all of them.
    //
    // Measured: 5.82:1 on the yellow plane in the stacked layout and 3.33:1 on
    // the parchment of an open panel, identical in both modes. The parchment
    // figure is the label voice #979 kept for static text — pre-existing, and
    // shared with SCOPE, LAST UPDATED and the rest of the footer labels.
    //
    // Two classes that both fall through to the same inherited value would
    // also compare equal, so the assertion was run against a known positive:
    // dropping `.domains-items` from one shared rule in global.css fails this
    // at all nine viewports (16px inherited type against the ribbon's
    // 0.68rem). It is measuring, not agreeing with itself.
    const { ink } = readings.get(viewport.name);
    for (const [part, reading] of Object.entries(ink)) {
      expect(reading.own, `${part} was read as empty`).not.toBe('');
      expect(reading.twin, `the two modes disagree on the ${part}`).toBe(reading.own);
    }
  });
});

describe('Selected Projects footer line against the exit link (#984)', () => {
  /** Desktop readings, split by whether this mode's line can clear at all. */
  const split = () => {
    const floor = CLEARANCE_FLOOR_PX[PROJECTS_RIBBON];
    const desktop = VIEWPORTS.filter((viewport) => !viewport.stacked).map((viewport) => ({
      name: viewport.name,
      ...readings.get(viewport.name),
    }));
    return {
      wide: desktop.filter((reading) => reading.rowWidth >= floor),
      narrow: desktop.filter((reading) => reading.rowWidth < floor),
    };
  };

  it('ends short of the link at every ribbon wide enough to hold both', () => {
    const { wide } = split();
    // Control: a clean pass has to mean "checked and clear", not "nothing was
    // wide enough to check". If the floor ever rose past the whole set this
    // assertion would be sweeping an empty list and reporting success.
    expect(wide.length, 'no desktop reading cleared the floor').toBeGreaterThan(0);
    for (const reading of wide) {
      expect(
        reading.clearance,
        `${reading.name} runs under the exit link` +
          (reading.interLoaded ? '' : ' (and Inter did not load, so this is fallback metrics)'),
      ).toBeGreaterThan(FONT_DELTA_PX);
    }
  });

  it('names the widths where this line is not expected to hold one line', () => {
    // Same shape as the clearance exemption below and pinned for the same
    // reason: an exemption nobody enumerates is an exemption that widens.
    const wrapping = VIEWPORTS.filter(
      (viewport) => readings.get(viewport.name).rowWidth < ONE_LINE_FLOOR_PX[PROJECTS_RIBBON],
    ).map((viewport) => viewport.name);
    expect(wrapping).toEqual(WRAPS_BELOW_FLOOR[PROJECTS_RIBBON]);
  });

  it('names the widths where the ribbon itself is too narrow for this line', () => {
    // Stated rather than skipped, and stated per mode: under `domains` only the
    // 427px ribbon is out of reach, and under `stack` the 484px one is too. A
    // shared list would have quietly excused a viewport the active mode can
    // actually clear.
    expect(split().narrow.map((reading) => reading.name)).toEqual(BELOW_FLOOR[PROJECTS_RIBBON]);
  });
});
