import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { relative, resolve } from 'path';
import { findFilesRecursively } from '../scripts/lib/blog-file-inventory.mjs';
import { STATUS_MARKER, stateMarkerClass } from '../src/lib/lifecycle-marker';
import { readBuiltStylesheet } from './helpers/dom.js';
import { builtPrintBlocks, withoutPrintBlocks } from './helpers/print-css.js';

// The lifecycle marker vocabulary is shared by four surfaces: the homepage
// Builds row, the /projects/ card kicker, the project detail page's STATUS
// cell, and the résumé's Projects kicker (#944). It used to be a copy-pasted
// literal per surface. These tests cover the module and, more importantly,
// guard against the copies coming back.

const SRC = resolve(__dirname, '../src');

describe('lifecycle marker vocabulary', () => {
  it('covers every status the projects collection can declare', () => {
    // Read the enum out of the schema rather than restating it, so a new
    // status fails here instead of shipping an unmapped mark.
    const config = readFileSync(resolve(SRC, 'content.config.ts'), 'utf-8');
    const enumMatch = config.match(/status:\s*z\.enum\(\[([^\]]*)\]\)/);
    expect(enumMatch, 'could not find the project status enum').not.toBeNull();
    const statuses = [...enumMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    expect(statuses.length).toBeGreaterThan(0);
    for (const status of statuses) {
      expect(Object.hasOwn(STATUS_MARKER, status), `no mark mapped for ${status}`).toBe(true);
    }
  });

  it('maps each status to its own modifier', () => {
    expect(STATUS_MARKER).toEqual({
      SHIPPED: 'shipped',
      ARCHIVED: 'archived',
      PAUSED: 'paused',
      EXPERIMENT: 'experiment',
      'IN PROGRESS': 'in-progress',
    });
    // ARCHIVED (cored ring) and PAUSED (bare outline) must stay distinct: the
    // whole reason the cored variant exists is that a closed history is not a
    // project merely set down.
    expect(STATUS_MARKER.ARCHIVED).not.toBe(STATUS_MARKER.PAUSED);
  });

  it('keeps each surface class list, then appends the mark', () => {
    expect(stateMarkerClass('SHIPPED', 'p-status')).toBe(
      'p-status state-marker state-marker--shipped',
    );
    expect(stateMarkerClass('ARCHIVED', 'post-meta', 'project-status')).toBe(
      'post-meta project-status state-marker state-marker--archived',
    );
    expect(stateMarkerClass('EXPERIMENT', 'metadata-strip__status')).toBe(
      'metadata-strip__status state-marker state-marker--experiment',
    );
  });

  it('falls through to the bare outline for an unmapped status', () => {
    // Not an error: an unknown status is "nothing is running yet", which the
    // bare `.state-marker` outline says correctly.
    expect(stateMarkerClass('SOMETHING NEW', 'p-status')).toBe('p-status state-marker');
    expect(stateMarkerClass('SHIPPED')).toBe('state-marker state-marker--shipped');
  });

  it('is the only place src/ declares a status→marker mapping', () => {
    // The residue guard. Every surface that shows lifecycle must import this
    // module; a second literal is how two surfaces start disagreeing about
    // what ARCHIVED looks like without failing a build.
    const offenders = findFilesRecursively(SRC, (f) => /\.(astro|ts|js|mjs)$/.test(f))
      .filter((f) => relative(SRC, f) !== 'lib/lifecycle-marker.ts')
      .filter((f) => /STATUS_MARKER\s*[:=]|state-marker--\$\{/.test(readFileSync(f, 'utf-8')))
      .map((f) => relative(SRC, f));
    expect(offenders, 'status→marker mapping duplicated outside lifecycle-marker.ts').toEqual([]);
  });

  it('every surface that renders a lifecycle status imports the shared helper', () => {
    // The control for the guard above: prove the search can find something.
    // A zero-hit assertion on "no duplicates" is worthless if the same walk
    // never reaches these files in the first place.
    const surfaces = [
      'pages/index.astro',
      'pages/projects/index.astro',
      'components/MetadataStrip.astro',
      'components/resume/ProjectsSection.astro',
    ];
    const walked = findFilesRecursively(SRC, (f) => /\.(astro|ts|js|mjs)$/.test(f)).map((f) =>
      relative(SRC, f),
    );
    for (const surface of surfaces) {
      expect(walked, `the residue walk never reached ${surface}`).toContain(surface);
      expect(
        readFileSync(resolve(SRC, surface), 'utf-8'),
        `${surface} does not import the shared marker vocabulary`,
      ).toMatch(/from '[./]*lib\/lifecycle-marker'/);
    }
  });
});

/**
 * The vocabulary has to survive the printer too (#950).
 *
 * Three of the four marks ARE CSS backgrounds — filled for SHIPPED, cored for
 * ARCHIVED, half-filled for EXPERIMENT — and only the 1px outline is a border.
 * Chrome's print dialog leaves "Background graphics" OFF by default, so
 * without an explicit `print-color-adjust: exact` every state prints as the
 * empty square PAUSED uses: right size, right place, four states collapsed
 * into one.
 *
 * This is asserted against the emitted stylesheet rather than a rendered file
 * because no build artifact can decide it. The only printed output this repo
 * generates is the résumé PDF, and it is written with `printBackground: true`,
 * which paints the same fills on its own — so the file is identical whether or
 * not this rule exists (tests/helpers/pdf-oracle.js
 * § lifecycleMarkSignaturesPerPage). The path the rule exists for is a reader
 * pressing Cmd-P, which produces nothing to read back.
 *
 * The effect itself was measured, not assumed: `/`, `/projects/` and the four
 * project detail pages were rendered to PDF with `printBackground: false`,
 * with and without the rule. The two rasters differ in exactly the six mark
 * squares whose fill is a background and are pixel-identical everywhere else,
 * across all 60 printed pages (3 + 3 + 16 + 11 + 10 + 17).
 */
describe('lifecycle marker — print fidelity', () => {
  it('pins the marks to print their fills, on every surface', () => {
    const block = builtPrintBlocks().find((b) => b.includes('state-marker'));
    expect(block, 'no @media print block sets anything on .state-marker').toBeTruthy();
    expect(block, 'the lifecycle marks are not pinned to print their fills').toMatch(
      /print-color-adjust:\s*exact/,
    );
  });

  it('scopes that rule to the mark itself, not to one surface and not to the page', () => {
    // Both halves matter, and they pull in opposite directions.
    //
    // Too narrow — `.resume-canvas .state-marker::before`, which is where this
    // rule lived from #944 until #950 — and the homepage Builds row, the
    // /projects/ card kicker and the detail page's STATUS cell keep collapsing
    // to one shape. That is the same failure the shared status→modifier module
    // above exists to prevent, in a different medium: one surface quietly
    // disagreeing with the others about what ARCHIVED looks like.
    //
    // Too wide — this rule's own selector list growing a page, a shell or a
    // wildcard alongside the mark — and it stops being a property of the mark
    // and becomes a print-cascade decision for pages that have no print
    // cascade, which is the cost #950 had to rule out before unscoping.
    //
    // What this does NOT guard: a SEPARATE `print-color-adjust: exact` rule
    // elsewhere in the print cascade, targeting something that is not the
    // mark. That is deliberate — the bullet-marker fix (#953) adds exactly
    // such a rule, and a test that failed on it would be asserting a
    // site-wide policy this one has no standing to set.
    //
    // Every print block, not the first one that mentions the mark: a second,
    // narrower copy added later would sit behind the correct one and never be
    // reached by a `.find()`. That is how the duplicate this fix removed got
    // in — see the status→modifier residue guard above, same failure mode.
    const rules = builtPrintBlocks().flatMap((block) =>
      [...block.matchAll(/([^{}]*)\{[^{}]*print-color-adjust:\s*exact[^{}]*\}/g)]
        .map((m) => m[1].trim())
        .filter((sel) => sel.includes('state-marker')),
    );
    expect(rules, 'no @media print rule pins the marks to print their fills').toHaveLength(1);

    for (const selector of rules[0].split(',').map((sel) => sel.trim())) {
      // Exact, not a prefix. A pattern like /^\.state-marker[^\s]*::?before$/
      // reads as "starts with the primitive" and passes
      // `.state-marker.resume-entry__status::before` — a compound qualifier is
      // a per-surface narrowing with no descendant combinator to give it away,
      // so a whitespace-token count does not see it either. It also passes
      // `.state-marker--shipped::before`, which would print one state's fill
      // and leave the other three collapsed. Both are the regression this test
      // exists for. (Codex, #952.)
      //
      // Single colon: the minifier emits the legacy `:before` form.
      expect(
        selector,
        `${selector} is not the bare primitive — a qualifier here, whether an ` +
          'ancestor, a second class, or a --modifier, puts the mark back on one surface',
      ).toMatch(/^\.state-marker::?before$/);
    }
  });

  it('does not leak print-color-adjust into the screen cascade', () => {
    // The screen never needs it, and a copy outside @media print is how the
    // rule survives someone deleting the print block it was meant to live in.
    const screenCascade = withoutPrintBlocks(readBuiltStylesheet());
    // Control: a "no match" result means nothing unless the same string is
    // where the mark rules actually live.
    expect(screenCascade, 'the screen cascade does not declare .state-marker at all').toContain(
      '.state-marker',
    );
    expect(screenCascade, 'print-color-adjust on .state-marker escaped @media print').not.toMatch(
      /\.state-marker[^{}]*\{[^{}]*print-color-adjust/,
    );
  });
});

/**
 * What each mark is made of (#962).
 *
 * The lifecycle marks are four shapes drawn by a handful of declarations, and
 * for a while nothing said so. The résumé's PDF classifier was left to notice
 * a malformed mark from its pixels, and #958 spent five review rounds closing
 * one degree of freedom at a time — an opaque gradient stop, a scaled mark, a
 * band that is not solid edge to edge, a fill on the side the classification
 * did not look at. Each was real. The family is unbounded, because a bitmap
 * has arbitrarily many degrees of freedom and every fix constrains exactly one.
 *
 * The declarations are the closed version of the same question: five
 * modifiers, a fixed set of properties, an exact expectation for each. So this
 * enumerates them, and the classifier goes back to doing the one thing a
 * stylesheet check cannot — proving the fills survive into a rendered file.
 *
 * **The invariant is a division of labour: the base rule owns geometry, a
 * variant rule owns fill and nothing else.** That is what makes the check
 * closed rather than a list of the mistakes made so far. A `transform` on one
 * modifier, a second `background-image` on another, a `width` override — none
 * of them needs its own assertion, because none of them is a fill.
 */
describe('lifecycle marker — declarations', () => {
  /** Everything a variant rule is allowed to say. Geometry is not on it. */
  const FILL_PROPERTIES = ['background-color', 'background-image', 'background-clip', 'padding'];

  /**
   * The exact property set each modifier carries, and the values that are not
   * free. `paused` and `in-progress` carry none: the bare outline the base
   * rule already draws IS their mark, so anything at all is a defect there.
   */
  const VARIANTS = {
    shipped: {
      properties: ['background-color'],
      values: [[/background-color:\s*currentcolor/i, 'SHIPPED lost its solid fill']],
    },
    archived: {
      properties: ['background-color', 'background-clip', 'padding'],
      values: [
        [/background-color:\s*currentcolor/i, 'ARCHIVED lost its cored fill'],
        [/background-clip:\s*content-box/i, 'ARCHIVED fills its whole box, so it has no ring'],
        [/padding:\s*0?\.1em/i, 'ARCHIVED lost the padding that IS its ring'],
      ],
    },
    experiment: {
      properties: ['background-image'],
      // The stop, not merely that a gradient is there, and the second stop as a
      // colour token and ONE position. A drifted stop still renders as two runs
      // with a wide first one and the classifier reads that window coarsely on
      // purpose, so `linear-gradient` alone pinned nothing; `[^,)]+` admitted
      // `#0000 80% 50%`, which the minifier really does emit; and any hex
      // admitted `#ff0`, a visibly yellow half that a greyscale oracle reads as
      // paper. All three passed both checks at the time (Codex, PR #958).
      values: [
        [
          /background-image:\s*linear-gradient\(\s*90deg\s*,\s*currentcolor\s+0\s+50%\s*,\s*(?:transparent|#0{4}|#0{8})\s+50%\s*\)/i,
          'EXPERIMENT lost its half fill',
        ],
      ],
    },
    paused: { properties: [], values: [] },
    'in-progress': { properties: [], values: [] },
  };

  /**
   * Every declaration the screen cascade makes for one selector, from EVERY
   * rule that names it rather than the first.
   *
   * Both halves matter. Selector lists are split so a grouped rule counts, and
   * later rules are concatenated so a second block adding a forbidden property
   * cannot hide behind a correct first one — which is the same residue shape
   * the print-fidelity test above guards with its `.flatMap`.
   */
  function declarationsFor(selector) {
    const screen = withoutPrintBlocks(readBuiltStylesheet());
    return [...screen.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter(([, selectors]) => selectors.split(',').some((sel) => sel.trim() === selector))
      .map(([, , body]) => body)
      .join(';');
  }

  const properties = (body) =>
    body
      .split(';')
      .map((declaration) => declaration.split(':')[0].trim().toLowerCase())
      .filter(Boolean)
      .sort();

  it('gives the base rule the geometry, and states the box-sizing that keeps it', () => {
    // `STATUS_MARK_SIZE` in tests/helpers/pdf-oracle.js is derived from these
    // three values — 0.72em of the résumé's 7.5pt kicker plus a 1px border each
    // side — and the classifier's size window is built around it, so a drift
    // here points the oracle at the wrong column.
    //
    // `box-sizing` belongs with them rather than reading as boilerplate. The
    // `*` reset does not match a pseudo-element, so without it the box is
    // content-box and a variant's own padding grows the mark instead of eating
    // into its fill — which is how the cored ARCHIVED variant came to render
    // 22% larger than its peers on every surface (#959). The width restates the
    // border for the same reason: under border-box it has to be inside the
    // declared size.
    const base =
      declarationsFor('.state-marker::before') || declarationsFor('.state-marker:before');
    expect(base, 'no .state-marker::before rule in the screen cascade').toBeTruthy();
    expect(base, 'the mark box is not border-box, so a variant padding grows it (#959)').toMatch(
      /box-sizing:\s*border-box/,
    );
    expect(base, 'mark width drifted from what the PDF oracle measures').toMatch(
      /width:\s*calc\(\s*0?\.72em\s*\+\s*2px\s*\)/,
    );
    expect(base, 'mark height drifted from what the PDF oracle measures').toMatch(
      /height:\s*calc\(\s*0?\.72em\s*\+\s*2px\s*\)/,
    );
    expect(base, 'the 1px outline the oracle adds to the mark box is gone').toMatch(
      /border:\s*1px/,
    );
  });

  it('expects every modifier the vocabulary can emit', () => {
    // The coverage guard. A new lifecycle state adds a modifier through
    // STATUS_MARKER, and without this the table below would simply not mention
    // it — the enumeration would still pass while enumerating less than all of
    // it, which is the failure mode an exhaustive check is for.
    expect(
      Object.values(STATUS_MARKER).filter((modifier) => !(modifier in VARIANTS)),
      'a lifecycle modifier has no declaration expectation — add it to VARIANTS',
    ).toEqual([]);
  });

  for (const [modifier, expected] of Object.entries(VARIANTS)) {
    it(`declares exactly ${expected.properties.length || 'no'} fill propert${
      expected.properties.length === 1 ? 'y' : 'ies'
    } for --${modifier}`, () => {
      const selector = `.state-marker--${modifier}`;
      const body = declarationsFor(`${selector}::before`) || declarationsFor(`${selector}:before`);

      // Exactly the expected set: must-carry and must-not-carry in one
      // assertion. A missing fill collapses that state into another; an extra
      // property is either a fill the state should not have or a geometry
      // override the base rule owns.
      expect(properties(body), `--${modifier} does not declare exactly its own fill`).toEqual(
        [...expected.properties].sort(),
      );

      for (const [pattern, message] of expected.values) {
        expect(body, message).toMatch(pattern);
      }

      // And nothing outside the fill vocabulary, stated separately so the
      // failure names the rule rather than a set diff. This is what closes the
      // family: `transform`, `width`, `margin` and every other geometry
      // property are rejected without being listed.
      const strays = properties(body).filter((name) => !FILL_PROPERTIES.includes(name));
      expect(
        strays,
        `--${modifier} declares something that is not a fill; geometry belongs to ` +
          '.state-marker::before, and a variant that overrides it stops being one primitive',
      ).toEqual([]);
    });
  }

  it('can see a declaration at all', () => {
    // The control for every negative above. `paused` and `in-progress` assert
    // an EMPTY property set, and an extractor that silently found nothing would
    // satisfy that for entirely the wrong reason — so prove the same lookup
    // returns declarations for a selector that has them.
    const shipped =
      declarationsFor('.state-marker--shipped::before') ||
      declarationsFor('.state-marker--shipped:before');
    expect(properties(shipped), 'the extractor found no declarations anywhere').not.toEqual([]);
  });
});
