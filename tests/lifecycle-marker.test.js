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
   * The exact property set each modifier carries, and the exact value of each.
   *
   * `paused` and `in-progress` carry none: the bare outline the base rule
   * already draws IS their mark, so anything at all is a defect there.
   *
   * Values are compared as whole values, not searched for inside the rule.
   * `padding: .1em` as a substring also matches `padding: .1em .2em`, which
   * keeps the property set identical, produces an asymmetric core, and stays
   * inside the PDF classifier's centre-row tolerance — passing every check
   * while being wrong (Codex, PR #964).
   */
  const VARIANTS = {
    shipped: { 'background-color': /^currentcolor$/i },
    archived: {
      'background-color': /^currentcolor$/i,
      'background-clip': /^content-box$/i,
      padding: /^0?\.1em$/i,
    },
    // The stop, not merely that a gradient is there, and the second stop as a
    // colour token and ONE position. A drifted stop still renders as two runs
    // with a wide first one and the classifier reads that window coarsely on
    // purpose, so `linear-gradient` alone pinned nothing; `[^,)]+` admitted
    // `#0000 80% 50%`, which the minifier really does emit; and any hex
    // admitted `#ff0`, a visibly yellow half that a greyscale oracle reads as
    // paper. All three passed both checks at the time (Codex, PR #958).
    experiment: {
      'background-image':
        /^linear-gradient\(\s*90deg\s*,\s*currentcolor\s+0\s+50%\s*,\s*(?:transparent|#0{4}|#0{8})\s+50%\s*\)$/i,
    },
    paused: {},
    'in-progress': {},
  };

  /** The `::before` / `:before` tail; the minifier emits the legacy form. */
  const PSEUDO = /::?before(?![\w-])/;

  /**
   * Every class name anywhere in a selector, as whole tokens.
   *
   * Anywhere, including inside `:is()` and `:where()`. Reading only the last
   * compound and dropping everything from its first `:` reduced
   * `.resume :is(.state-marker--paused)::before` to an empty string, so the
   * rule was not collected at all and a fill or geometry override behind a
   * functional pseudo-class passed the whole suite (CodeRabbit, PR #964).
   *
   * Whole tokens, so `.state-marker` does not match `.state-marker--shipped`:
   * the two are different class names, and the base rule's expectations are not
   * the variants'.
   */
  const classesIn = (selector) =>
    [...selector.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((match) => match[1]);

  /**
   * Split a selector list on its TOP-LEVEL commas only.
   *
   * `:is(.state-marker--shipped, .resume-entry__status)::before` is one
   * selector, and splitting it blindly produced two fragments — the first
   * without a `::before`, the second without the mark class — so neither was
   * collected and a per-surface override passed everything (Codex, PR #964).
   */
  function topLevelSelectors(list) {
    const parts = [];
    let depth = 0;
    let current = '';
    for (const character of list) {
      if (character === '(') depth += 1;
      else if (character === ')') depth -= 1;
      if (character === ',' && depth === 0) {
        parts.push(current);
        current = '';
      } else current += character;
    }
    return [...parts, current].map((selector) => selector.trim()).filter(Boolean);
  }

  /**
   * `[from, to)` of every balanced CONDITIONAL `@…{ … }` block.
   *
   * `@layer` is excluded: it groups rules for cascade ordering and applies at
   * every viewport, so treating it as conditional would reject a
   * behaviour-preserving refactor — a false failure, which is worse here than
   * a missed one (Codex, PR #964). `@media`, `@supports` and `@container` all
   * gate on something and stay in.
   */
  function atRuleRanges(css) {
    const ranges = [];
    for (const at of css.matchAll(/@(?!layer\b)[\w-]+/g)) {
      const start = css.indexOf('{', at.index);
      if (start === -1) continue;
      if (ranges.some(([from, to]) => at.index > from && at.index < to)) continue;
      let depth = 0;
      for (let j = start; j < css.length; j += 1) {
        if (css[j] === '{') depth += 1;
        else if (css[j] === '}' && (depth -= 1) === 0) {
          ranges.push([at.index, j + 1]);
          break;
        }
      }
    }
    return ranges;
  }

  /**
   * The screen cascade, split into what applies unconditionally and what sits
   * behind an at-rule.
   *
   * A rule extracted out of `@media (min-width: 700px)` reads identically to an
   * unconditional one, so a fill moved under a breakpoint satisfied every
   * declaration check while the mark was a bare outline on every narrower
   * viewport — and the résumé PDF, rendered wide, would not have caught it
   * either (Codex, PR #964). The print block is already gone by this point and
   * has its own tests; anything else conditional is rejected below.
   */
  function screenCascade() {
    const css = withoutPrintBlocks(readBuiltStylesheet());
    const ranges = atRuleRanges(css);
    let unconditional = '';
    let cursor = 0;
    for (const [from, to] of ranges) {
      unconditional += css.slice(cursor, from);
      cursor = to;
    }
    return {
      unconditional: unconditional + css.slice(cursor),
      conditional: ranges.map(([from, to]) => css.slice(from, to)).join('\n'),
    };
  }

  /** Every rule in a stretch of CSS, with its selector list split out. */
  const rulesIn = (css) =>
    [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selectors, body]) => ({
      selectors: topLevelSelectors(selectors),
      body,
    }));

  const screenRules = () => rulesIn(screenCascade().unconditional);

  /**
   * Every rule in the stylesheet, conditional or not.
   *
   * The surface-alias check needs this rather than the unconditional set: a
   * `.p-status::before` override that is ALSO behind a media query fell between
   * the two scans, because the conditional one looked only for mark classes and
   * the alias one looked only at unconditional rules (Codex, PR #964). A
   * surface may not restyle the mark at any width.
   */
  const allRules = () => {
    const cascade = screenCascade();
    return [...rulesIn(cascade.unconditional), ...rulesIn(cascade.conditional)];
  };

  /**
   * Every `::before` rule that TARGETS one mark class, however it is qualified.
   *
   * An exact selector comparison was the first version of this and it had the
   * hole both reviewers found independently: `.resume-canvas
   * .state-marker--archived::before` and `.p-status.state-marker--shipped::before`
   * are rules that change the mark, and neither is equal to the bare selector,
   * so their declarations were simply not collected and every assertion below
   * passed while a surface overrode the primitive (CodeRabbit and Codex,
   * PR #964).
   *
   * So a rule is **collected broadly and rejected narrowly**: any `::before`
   * rule whose selector names the class at all is picked up, and
   * `expectUnqualified` then requires it to be the bare primitive. Working out
   * which compound a selector really targets is what produced two holes in a
   * row — exact equality missed descendants and compounds, reading the last
   * compound missed `:is()` — while the broad form has none to miss.
   *
   * The trade is a selector naming the mark as an ANCESTOR of some other
   * element's `::before`, which this rejects. Nothing is nested inside the mark
   * — it is a leaf pseudo-element on the status element — so that selector
   * cannot occur here, and failing loudly on one is the safe direction.
   *
   * Scoped to `::before` deliberately. The mark is a pseudo-element; the
   * element itself carries the status word and each surface legitimately styles
   * it (`.p-status`, `.metadata-strip__status`, `.resume-entry__status`), so
   * policing the element would be asserting a rule the vocabulary does not have.
   */
  function targeting(className, rules = screenRules()) {
    const found = [];
    for (const rule of rules) {
      for (const selector of rule.selectors) {
        if (!PSEUDO.test(selector)) continue;
        if (!classesIn(selector).includes(className)) continue;
        found.push({ selector, body: rule.body });
      }
    }
    return found;
  }

  /** The declarations of every rule targeting a class, in cascade order. */
  const declarationsFor = (className) =>
    targeting(className)
      .map((rule) => rule.body)
      .join(';');

  const properties = (body) =>
    body
      .split(';')
      .map((declaration) => declaration.split(':')[0].trim().toLowerCase())
      .filter(Boolean)
      .sort();

  /** One property's whole value, or null unless it is declared exactly once. */
  function valueOf(body, property) {
    const matches = body
      .split(';')
      .map((declaration) => declaration.split(':'))
      .filter(([name]) => name.trim().toLowerCase() === property)
      .map((parts) => parts.slice(1).join(':').trim());
    return matches.length === 1 ? matches[0] : null;
  }

  /**
   * Every mark selector has to be the bare primitive, on the same reasoning as
   * the print-fidelity test above: a qualifier — an ancestor, a second class, a
   * pseudo-class — is a per-surface narrowing, and one surface disagreeing with
   * the others about what a state looks like is the defect the shared module
   * exists to prevent. Collecting qualified rules above is what lets this
   * reject them here rather than silently ignore them.
   */
  function expectUnqualified(className) {
    // Compared against the two literal forms rather than a regex built from
    // the class name. Interpolating into a pattern needs escaping, escaping
    // one metacharacter is the incomplete-sanitization shape CodeQL objects to
    // as a technique rather than as one bad pattern (alert 28) — and `-` does
    // not need escaping outside a character class in the first place. Two
    // string comparisons sidestep the question, which is the same answer
    // tests/helpers/dom.js reached about script stripping.
    const bare = [`.${className}::before`, `.${className}:before`];
    for (const { selector } of targeting(className)) {
      expect(
        bare,
        `${selector} qualifies the mark; geometry and fill belong to the bare ` +
          '.state-marker primitive, not to one surface',
      ).toContain(selector);
    }
  }

  it('gives the base rule the geometry, and states the box-sizing that keeps it', () => {
    // `STATUS_MARK_SIZE` in tests/helpers/pdf-oracle.js is derived from these
    // values — 0.72em of the résumé's 7.5pt kicker plus a 1px border each side
    // — and the classifier's size window is built around it, so a drift here
    // points the oracle at the wrong column.
    //
    // `box-sizing` belongs with them rather than reading as boilerplate. The
    // `*` reset does not match a pseudo-element, so without it the box is
    // content-box and a variant's own padding grows the mark instead of eating
    // into its fill — which is how the cored ARCHIVED variant came to render
    // 22% larger than its peers on every surface (#959). The width restates the
    // border for the same reason: under border-box it has to be inside the
    // declared size.
    const base = declarationsFor('state-marker');
    expect(base, 'no .state-marker::before rule in the screen cascade').toBeTruthy();
    expectUnqualified('state-marker');
    expect(
      valueOf(base, 'box-sizing'),
      'the mark box is not border-box, so a variant padding grows it (#959)',
    ).toMatch(/^border-box$/i);
    expect(valueOf(base, 'width'), 'mark width drifted from what the PDF oracle measures').toMatch(
      /^calc\(\s*0?\.72em\s*\+\s*2px\s*\)$/i,
    );
    expect(
      valueOf(base, 'height'),
      'mark height drifted from what the PDF oracle measures',
    ).toMatch(/^calc\(\s*0?\.72em\s*\+\s*2px\s*\)$/i);
    // The shorthand's first component is its width, and the width is the only
    // part the oracle's box derivation depends on.
    expect(
      valueOf(base, 'border'),
      'the 1px outline the oracle adds to the mark box is gone',
    ).toMatch(/^1px(\s|$)/i);
  });

  it('expects every modifier the vocabulary can emit', () => {
    // The coverage guard. A new lifecycle state adds a modifier through
    // STATUS_MARKER, and without this the table above would simply not mention
    // it — the enumeration would still pass while enumerating less than all of
    // it, which is the failure mode an exhaustive check is for.
    expect(
      Object.values(STATUS_MARKER).filter((modifier) => !(modifier in VARIANTS)),
      'a lifecycle modifier has no declaration expectation — add it to VARIANTS',
    ).toEqual([]);
  });

  for (const [modifier, expected] of Object.entries(VARIANTS)) {
    const names = Object.keys(expected);
    it(`declares exactly ${names.length || 'no'} fill propert${
      names.length === 1 ? 'y' : 'ies'
    } for --${modifier}`, () => {
      const className = `state-marker--${modifier}`;
      const body = declarationsFor(className);

      expectUnqualified(className);

      // Exactly the expected set: must-carry and must-not-carry in one
      // assertion. A missing fill collapses that state into another; an extra
      // property is either a fill the state should not have or a geometry
      // override the base rule owns.
      expect(properties(body), `--${modifier} does not declare exactly its own fill`).toEqual(
        [...names].sort(),
      );

      for (const [property, pattern] of Object.entries(expected)) {
        expect(valueOf(body, property), `--${modifier} declares the wrong ${property}`).toMatch(
          pattern,
        );
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

  it('defines the marks unconditionally, not behind a media query', () => {
    // A required fill moved under `@media (min-width: 700px)` reads exactly
    // like an unconditional one to a rule extractor, so every declaration check
    // above would pass while the mark rendered as a bare outline on every
    // narrower viewport. The résumé PDF would not catch it either — it renders
    // at one wide page size (Codex, PR #964).
    //
    // The @media print block is exempt by construction: it is stripped before
    // any of this, and has its own assertions in § print fidelity.
    const conditional = rulesIn(screenCascade().conditional);
    const classNames = [
      'state-marker',
      ...Object.values(STATUS_MARKER).map((modifier) => `state-marker--${modifier}`),
    ];
    const marks = classNames.flatMap((className) =>
      targeting(className, conditional).map(({ selector }) => selector),
    );
    expect(
      marks,
      'a lifecycle mark is defined behind an at-rule, so it is one viewport away ' +
        'from being a different mark',
    ).toEqual([]);

    // The control: prove the same walk reaches conditional rules at all,
    // otherwise the empty result above means only that nothing was parsed.
    expect(
      rulesIn(screenCascade().conditional).length,
      'the at-rule walk found no conditional rules anywhere in the stylesheet',
    ).toBeGreaterThan(0);
  });

  it('leaves the mark pseudo-element to the primitive, on every surface class', () => {
    // The marks sit on an element that also carries a per-surface class, and
    // the mark IS that element's `::before` — so `.p-status::before` restyles
    // it without ever naming `.state-marker` (Codex, PR #964). The checks above
    // all key on the mark class and cannot see that.
    //
    // The surface classes are read from the `stateMarkerClass()` call sites
    // rather than listed here, so a fifth surface is covered when it is added
    // rather than when someone remembers this test.
    const aliases = new Set();
    for (const file of findFilesRecursively(SRC, (f) => /\.(astro|ts|js|mjs)$/.test(f))) {
      const source = readFileSync(file, 'utf-8');
      for (const call of source.matchAll(/stateMarkerClass\(/g)) {
        // Walked to the MATCHING paren, not the first one. A call site can
        // nest — `stateMarkerClass(statusOf(slug), 'p-status')` — and stopping
        // at the first `)` dropped that surface silently, which is the same
        // class of parsing shortcut this whole round is about.
        let depth = 0;
        let end = call.index + call[0].length - 1;
        for (; end < source.length; end += 1) {
          if (source[end] === '(') depth += 1;
          else if (source[end] === ')' && (depth -= 1) === 0) break;
        }
        const args = source.slice(call.index + call[0].length, end);
        for (const literal of args.matchAll(/'([^']+)'/g)) aliases.add(literal[1]);
      }
    }
    // Controls for a derived list. Non-empty, or the loop below is vacuous —
    // and a known positive, because "found nothing" and "there is nothing to
    // find" arrive as the same empty set.
    expect(
      aliases.size,
      'no surface classes found at any stateMarkerClass() call site',
    ).toBeGreaterThan(0);
    expect(
      [...aliases].sort(),
      'the call-site walk missed a surface it is known to cover',
    ).toContain('p-status');

    for (const alias of aliases) {
      expect(
        targeting(alias, allRules()).map(({ selector }) => selector),
        `${alias}::before restyles the lifecycle mark from one surface; the mark ` +
          'is .state-marker::before and belongs to the primitive',
      ).toEqual([]);
    }
  });

  it('can see a declaration at all', () => {
    // The control for every negative above. `paused` and `in-progress` assert
    // an EMPTY property set, and an extractor that silently found nothing would
    // satisfy that for entirely the wrong reason — so prove the same lookup
    // returns declarations for a selector that has them.
    expect(
      properties(declarationsFor('state-marker--shipped')),
      'the extractor found no declarations anywhere',
    ).not.toEqual([]);
  });
});
