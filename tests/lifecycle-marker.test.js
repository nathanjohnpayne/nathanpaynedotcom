import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { relative, resolve } from 'path';
import * as csstree from 'css-tree';
import { JSDOM } from 'jsdom';
import { findFilesRecursively } from '../scripts/lib/blog-file-inventory.mjs';
import { STATUS_MARKER, stateMarkerClass } from '../src/lib/lifecycle-marker';
import { builtPages, readBuiltStylesheet } from './helpers/dom.js';
import { builtPrintBlocks, withoutPrintBlocks } from './helpers/print-css.js';

// The lifecycle marker vocabulary is shared by four surfaces: the homepage
// Builds row, the /projects/ card kicker, the project detail page's STATUS
// cell, and the résumé's Projects kicker (#944). It used to be a copy-pasted
// literal per surface. These tests cover the module and, more importantly,
// guard against the copies coming back.

const SRC = resolve(__dirname, '../src');

/** The one module allowed to declare the mapping — and to declare the helper. */
const MARKER_MODULE = 'lib/lifecycle-marker.ts';

/**
 * Every surface that renders a lifecycle status, as a path under `src/`.
 *
 * The list is a control, not a contract: the checks below derive their real
 * subject from the code, and this proves the derivation reached each file that
 * is known to matter. A fifth surface has to be added here as well, which is
 * the point — `docs/agents/code-modification-rules.md` says so, and it went
 * stale exactly once, when the résumé became the fourth.
 */
const SURFACES = [
  'components/MetadataStrip.astro',
  'components/resume/ProjectsSection.astro',
  'pages/index.astro',
  'pages/projects/index.astro',
];

/** The mark primitive, and the modifiers the vocabulary can emit. */
const MARK_PRIMITIVE = 'state-marker';
const MODIFIER_CLASSES = Object.values(STATUS_MARKER).map(
  (modifier) => `${MARK_PRIMITIVE}--${modifier}`,
);
const MARK_CLASSES = [MARK_PRIMITIVE, ...MODIFIER_CLASSES];

/**
 * Reading `stateMarkerClass()` call sites (#968).
 *
 * The scanner below is deliberately small and deliberately fails CLOSED. It
 * knows three things — brackets nest, string literals suspend that nesting, and
 * a backslash escapes the next character — and everything it cannot reduce to a
 * plain string literal is reported as `readable: false` rather than skipped.
 * That is the whole difference from the version it replaces, which collected
 * single-quoted literals anywhere inside the call and silently contributed
 * nothing for a double-quoted string, a template literal, or an identifier: a
 * surface that was never policed looked exactly like a surface that did not
 * exist. An unreadable argument now fails the lint in § declarations and names
 * itself.
 *
 * It is not a JavaScript parser and does not need to be. The question it
 * answers is closed — *is this argument a string literal, and if so which one*
 * — and a shape it cannot read (a nested template literal, say) is an error
 * message asking for a literal, not a miss.
 */

/** Index of the `)` matching the `(` at `openIndex`, or -1. */
function matchingParen(source, openIndex) {
  let depth = 0;
  let quote = null;
  for (let index = openIndex; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (character === '\\') index += 1;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === "'" || character === '"' || character === '`') quote = character;
    else if (character === '(') depth += 1;
    else if (character === ')' && (depth -= 1) === 0) return index;
  }
  return -1;
}

/** A call's argument text, split on its top-level commas. */
function splitArguments(text) {
  const parts = [];
  let current = '';
  let depth = 0;
  let quote = null;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quote) {
      current += character;
      if (character === '\\') {
        current += text[index + 1] ?? '';
        index += 1;
      } else if (character === quote) quote = null;
      continue;
    }
    if (character === "'" || character === '"' || character === '`') quote = character;
    else if ('([{'.includes(character)) depth += 1;
    else if (')]}'.includes(character)) depth -= 1;
    else if (character === ',' && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += character;
  }
  return [...parts, current].map((part) => part.trim()).filter(Boolean);
}

/**
 * `source` with every comment replaced by spaces, offsets preserved.
 *
 * Two things go wrong without it, and only one of them is loud: a
 * `stateMarkerClass(...)` written inside a comment is scanned as a call, and —
 * the dangerous one — a comment INSIDE a call ends the argument scan early.
 * a call whose first argument is followed by a block comment containing a `)`
 * closes on the comment's paren, yields an empty surface list, and never trips
 * the unreadable check, so that surface is silently unpoliced (Codex, PR #973).
 * The fixture below writes that call out; it cannot be written in this comment.
 *
 * Blanking rather than deleting keeps every offset, so the call sites are found
 * at the positions they occupy in the file. Regular-expression literals are not
 * modelled; the SURFACES control below is what would catch a blanking that ate
 * a real call, and it is asserted before anything is concluded from the result.
 */
function withoutComments(source) {
  let out = '';
  let quote = null;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      out += character;
      if (character === '\\') {
        out += source[index + 1] ?? '';
        index += 1;
      } else if (character === quote) quote = null;
      continue;
    }
    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      out += character;
      continue;
    }
    const block = character === '/' && source[index + 1] === '*';
    const line = character === '/' && source[index + 1] === '/';
    if (block || line) {
      const end = block ? source.indexOf('*/', index + 2) : source.indexOf('\n', index);
      const stop = end === -1 ? source.length : end + (block ? 2 : 0);
      out += ' '.repeat(stop - index);
      index = stop - 1;
      continue;
    }
    out += character;
  }
  return out;
}

/**
 * A complete string literal in any of the three forms, and nothing else.
 *
 * `$` is excluded from the template-literal form so `` `x-${y}` `` cannot pass
 * as the literal `x-${y}`; a backslash is excluded from all three so an escape
 * is never silently taken at face value. Both land in the unreadable bucket,
 * which is the safe direction.
 */
const SURFACE_LITERAL = /^(?:'([^'\\\n]*)'|"([^"\\\n]*)"|`([^`\\$\n]*)`)$/;

/**
 * The surface arguments of one `stateMarkerClass(...)` call.
 *
 * Argument 0 is the status and is dropped; the rest are the `...base` classes.
 *
 * Each readable argument yields a class **list**, not one name. `stateMarkerClass(status,
 * 'post-meta project-status')` is what `/projects/` would look like written as
 * one argument, and the helper joins base strings with spaces either way — so
 * reading the literal whole recorded an alias no element ever carries, and the
 * declared-versus-rendered cross-check then failed on behaviourally identical
 * code (Codex, PR #973).
 *
 * @param {string} callText `stateMarkerClass(` through its matching `)`.
 * @returns {({readable: true, classes: string[]} | {readable: false, text: string})[]}
 */
function readSurfaceArguments(callText) {
  const open = callText.indexOf('(');
  const close = open === -1 ? -1 : matchingParen(callText, open);
  if (close === -1) return [{ readable: false, text: callText }];
  return splitArguments(callText.slice(open + 1, close))
    .slice(1)
    .map((text) => {
      const literal = text.match(SURFACE_LITERAL);
      if (!literal) return { readable: false, text };
      const value = literal[1] ?? literal[2] ?? literal[3];
      return { readable: true, classes: value.split(/\s+/).filter(Boolean) };
    });
}

/** Every `stateMarkerClass()` call site under `src/`, with its surfaces read. */
function callSites() {
  const sites = [];
  for (const file of findFilesRecursively(SRC, (f) => /\.(astro|ts|js|mjs)$/.test(f))) {
    const name = relative(SRC, file);
    // The module's own `export function stateMarkerClass(status, ...base)` is a
    // declaration, not a call, and its parameter list is not a surface list.
    if (name === MARKER_MODULE) continue;
    const source = withoutComments(readFileSync(file, 'utf-8'));
    for (const call of source.matchAll(/\bstateMarkerClass\s*\(/g)) {
      const close = matchingParen(source, call.index + call[0].length - 1);
      sites.push({
        file: name,
        surfaces: readSurfaceArguments(
          close === -1 ? call[0] : source.slice(call.index, close + 1),
        ),
      });
    }
  }
  return sites;
}

/**
 * Every non-mark class on an element that carries a mark, read off the build.
 *
 * The second, independent derivation of the surface list. This one is blind to
 * a surface whose status renders on no built page, and immune to how the
 * argument was written — which is the complement of what the call-site walk
 * can and cannot see.
 */
let renderedClasses;
function renderedSurfaceClasses() {
  if (renderedClasses) return renderedClasses;
  renderedClasses = new Set();
  for (const { html } of builtPages()) {
    const { document } = new JSDOM(html).window;
    for (const element of document.querySelectorAll(`.${MARK_PRIMITIVE}`)) {
      for (const name of element.classList) {
        if (name !== MARK_PRIMITIVE && !name.startsWith(`${MARK_PRIMITIVE}--`)) {
          renderedClasses.add(name);
        }
      }
    }
  }
  return renderedClasses;
}

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
      .filter((f) => relative(SRC, f) !== MARKER_MODULE)
      .filter((f) => /STATUS_MARKER\s*[:=]|state-marker--\$\{/.test(readFileSync(f, 'utf-8')))
      .map((f) => relative(SRC, f));
    expect(offenders, 'status→marker mapping duplicated outside lifecycle-marker.ts').toEqual([]);
  });

  it('every surface that renders a lifecycle status imports the shared helper', () => {
    // The control for the guard above: prove the search can find something.
    // A zero-hit assertion on "no duplicates" is worthless if the same walk
    // never reaches these files in the first place.
    const walked = findFilesRecursively(SRC, (f) => /\.(astro|ts|js|mjs)$/.test(f)).map((f) =>
      relative(SRC, f),
    );
    for (const surface of SURFACES) {
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
 *
 * ## Parsed, not matched (#967)
 *
 * The previous version of this section extracted rules with
 * `matchAll(/([^{}]+)\{([^{}]*)\}/g)` and hand-wrote the rest: a selector-list
 * splitter, a class-token matcher, an at-rule scanner. Thirteen of PR #964's
 * sixteen findings were one finding — *a regex approximating the CSS selector
 * grammar does not handle shape X* — arriving five rounds running as
 * descendant qualification, `:is()`/`:where()`, attribute and ID
 * qualification, commas inside `:is(a, b)`, and a comma inside an attribute
 * value. Each was real and each fix closed its case and left the shape.
 *
 * Round 5 is where approximating stopped being only a coverage question: the
 * at-rule scan classified `@layer components` as conditional and would have
 * rejected a behaviour-preserving cascade-layer refactor. A hand-rolled parser
 * tightened enough to catch the real cases had begun rejecting correct CSS,
 * which is the worse direction.
 *
 * `css-tree` is DECLARED in package.json rather than reached for transitively.
 * It was already in `node_modules` as a dependency of Astro's toolchain, and
 * depending on that inside a required check is its own defect — it vanishes on
 * a dependency bump. It is picked over `postcss` because one library covers
 * both halves of the job: `postcss` parses rules but not selectors, and the
 * modifier-versus-surface distinction below needs a selector AST, which would
 * have meant a second dependency (`postcss-selector-parser`).
 *
 * What did NOT change: the `VARIANTS` table, the fill vocabulary, the
 * surface-alias derivation, the bare-primitive rule, and every geometry
 * constant. This is a change of parser, not of contract.
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

  /**
   * At-rules that do NOT gate on anything, listed as the exception.
   *
   * Stated as a deny-everything-else rather than as an allow-list of
   * `@media`/`@supports`/`@container`, so an at-rule nobody has met yet reads
   * as conditional. `@layer` groups rules for cascade ordering and applies at
   * every viewport; treating it as conditional is the false failure round 5
   * found (Codex, PR #964).
   */
  const UNCONDITIONAL_AT_RULES = new Set(['layer']);

  /** Every class name under a selector node, escapes decoded. */
  function classNamesIn(node) {
    const names = [];
    csstree.walk(node, {
      visit: 'ClassSelector',
      enter(child) {
        // `.state-marker\,y` is a class literally named `state-marker,y`, not
        // `state-marker` — the shape the old token regex read as the primitive
        // because it stopped at the backslash. Decoding is the parser's job and
        // it has an API for it.
        names.push(csstree.ident.decode(child.name));
      },
    });
    return names;
  }

  /**
   * Does this selector target a `::before` (or the legacy `:before`)?
   *
   * The name is decoded first. `::be\66 ore` is a real `::before` and css-tree
   * keeps its source spelling, so a raw comparison reads it as some other
   * pseudo-element and drops the rule out of every check below (Codex, PR #973).
   */
  function targetsBefore(selector) {
    let found = false;
    csstree.walk(selector, {
      enter(node) {
        const pseudo = node.type === 'PseudoElementSelector' || node.type === 'PseudoClassSelector';
        if (pseudo && csstree.ident.decode(node.name).toLowerCase() === 'before') found = true;
      },
    });
    return found;
  }

  /**
   * Functional pseudo-classes whose arguments can BE the subject.
   *
   * `:is()` and `:where()` say the subject may be any of these. `:not()` says
   * the opposite — a class inside it is one the subject definitely does not
   * carry — and `:has()`'s argument is a descendant, not the subject. Reading
   * either as a subject would reject `.p-status:not(.state-marker--shipped)` as
   * a modifier rule, which is the reverse of what it means.
   */
  const SUBJECT_PSEUDOS = new Set(['is', 'where']);

  /** The nodes after a selector's last combinator — the compound it subjects. */
  function subjectCompound(selector) {
    const parts = selector.children.toArray();
    let subject = 0;
    parts.forEach((node, index) => {
      if (node.type === 'Combinator') subject = index + 1;
    });
    return parts.slice(subject);
  }

  /**
   * The classes on the compound the selector actually SUBJECTS.
   *
   * This is the distinction the regex could not make and the reason the
   * modifier-element rule below was recorded as a limit rather than patched
   * (#967). In `.resume-entry__status.state-marker--shipped` the rule is
   * modifier-scoped; in `.state-marker--shipped + .p-status` the subject is a
   * sibling that has nothing to do with the mark. Reading the last compound was
   * itself a hole once — it dropped everything after the first `:` and reduced
   * `:is(.state-marker--paused)` to nothing — but that was a string operation
   * guessing at structure. Here the combinators are AST nodes.
   *
   * The recursion into `:is()` / `:where()` takes each argument's OWN subject
   * rather than every class inside it. A functional selector has no top-level
   * combinator, so collecting the lot made `:is(.state-marker--shipped +
   * .p-status)` read as modifier-scoped when its subject is the sibling — and
   * the unwrapped form of exactly that selector is asserted to pass a few tests
   * down (Codex, PR #973).
   */
  function subjectClassNames(selector) {
    const names = [];
    for (const node of subjectCompound(selector)) {
      if (node.type === 'ClassSelector') {
        names.push(csstree.ident.decode(node.name));
      } else if (
        node.type === 'PseudoClassSelector' &&
        SUBJECT_PSEUDOS.has(csstree.ident.decode(node.name).toLowerCase())
      ) {
        for (const child of node.children ?? []) {
          if (child.type !== 'SelectorList') continue;
          for (const inner of child.children) names.push(...subjectClassNames(inner));
        }
      }
    }
    return names;
  }

  /**
   * A nested selector, rewritten as the selector it actually means.
   *
   * CSS nesting splits one selector across two rules, and neither half carries
   * what the other needs: in `.state-marker--shipped { &::before { padding } }`
   * the outer rule names the modifier and has no `::before`, the inner rule has
   * the `::before` and names no class, so a collector reading each rule's own
   * selector sees neither and a state-specific geometry override passes every
   * check (Codex, PR #973).
   *
   * Resolving is structural: each `&` is replaced by the parent selector's own
   * nodes, and a nested selector with no `&` at all gets the parent prepended as
   * a descendant, which is what the nesting spec says it means. Substituted
   * directly rather than wrapped in `:is()` — `:is()` takes the specificity of
   * its most specific argument, so the two are equivalent here, and the wrapper
   * would make a resolved `.state-marker::before` read as qualified.
   */
  function resolveNesting(selector, parent) {
    if (!parent) return selector;
    const resolved = csstree.clone(selector);
    let nested = false;
    csstree.walk(resolved, {
      enter(node, item, list) {
        if (node.type !== 'NestingSelector' || !list) return;
        nested = true;
        list.replace(item, csstree.clone(parent).children);
      },
    });
    if (nested) return resolved;
    const descendant = csstree.clone(parent);
    descendant.children.appendData({ type: 'Combinator', name: ' ' });
    for (const child of csstree.clone(selector).children) descendant.children.appendData(child);
    return descendant;
  }

  /**
   * Parse a stylesheet into flat, already-classified rules — one entry per
   * selector in a selector list.
   *
   * Takes CSS text rather than reading the build itself so the control block at
   * the end of this file can run the same machinery over a stylesheet built to
   * contain a defect. A check that has only ever seen correct input is not
   * known to reject anything.
   */
  function analyze(css) {
    const errors = [];
    const ast = csstree.parse(css, {
      // Collected rather than thrown. css-tree is tolerant by default and
      // turns what it cannot read into a `Raw` node, which would silently
      // shrink the rule set — "found nothing" and "could not look" must not
      // arrive as the same answer.
      onParseError: (error) => errors.push(error.message ?? String(error)),
    });
    const rules = [];
    const unreadable = [];
    const atRules = [];
    // The enclosing rule's RESOLVED selectors, so a rule nested two deep
    // resolves against what its parent already resolved to rather than against
    // the parent's literal `&`.
    const enclosing = [];
    csstree.walk(ast, {
      enter(node) {
        if (node.type === 'Atrule') {
          atRules.push(csstree.ident.decode(node.name).toLowerCase());
          return;
        }
        if (node.type !== 'Rule') return;
        const conditional = atRules.some((name) => !UNCONDITIONAL_AT_RULES.has(name));
        if (node.prelude.type !== 'SelectorList') {
          unreadable.push(csstree.generate(node.prelude));
          enclosing.push([]);
          return;
        }
        const declarations = node.block.children
          .toArray()
          .filter((child) => child.type === 'Declaration')
          // Decoded, and only for standard properties: `f\6f nt-size` is a real
          // `font-size` that css-tree stores in its source spelling, while a
          // custom property is case-sensitive and its name is its identity
          // (Codex, PR #973).
          .map((child) => ({
            property: child.property.startsWith('--')
              ? child.property
              : csstree.ident.decode(child.property).toLowerCase(),
            value: csstree.generate(child.value).trim(),
          }));
        const parents = enclosing.length ? enclosing[enclosing.length - 1] : [];
        const resolved = [];
        for (const selector of node.prelude.children) {
          for (const parent of parents.length ? parents : [null]) {
            resolved.push(resolveNesting(selector, parent));
          }
        }
        for (const selector of resolved) {
          rules.push({
            selector: csstree.generate(selector),
            classes: classNamesIn(selector),
            subject: subjectClassNames(selector),
            before: targetsBefore(selector),
            declarations,
            conditional,
          });
        }
        enclosing.push(resolved);
      },
      leave(node) {
        if (node.type === 'Atrule') atRules.pop();
        else if (node.type === 'Rule') enclosing.pop();
      },
    });
    return { rules, unreadable, errors };
  }

  /**
   * The emitted screen cascade, parsed once.
   *
   * The `@media print` block is cut before parsing rather than classified
   * after: it is not a viewport narrowing but a different medium, it has its
   * own assertions in § print fidelity, and `withoutPrintBlocks` is the shared
   * extractor three test files already agree on.
   */
  let cascade;
  const parsed = () => (cascade ??= analyze(withoutPrintBlocks(readBuiltStylesheet())));
  const allRules = () => parsed().rules;
  const screenRules = () => allRules().filter((rule) => !rule.conditional);

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
   * `expectUnqualified` then requires it to be the bare primitive. The
   * modifier-element rule below is the one place that needs to know which
   * compound a selector subjects, and it asks `subject` for that; everything
   * keyed on the mark class stays deliberately broad, because the two holes in a
   * row here both came from trying to be clever about the subject.
   *
   * The trade is a selector naming the mark as an ANCESTOR of some other
   * element's `::before`, which this rejects. Nothing is nested inside the mark
   * — it is a leaf pseudo-element on the status element — so that selector
   * cannot occur here, and failing loudly on one is the safe direction.
   *
   * Scoped to `::before` deliberately. The mark is a pseudo-element; the
   * element itself carries the status word and each *surface* legitimately
   * styles it (`.p-status`, `.metadata-strip__status`, `.resume-entry__status`),
   * so policing the element in general would be asserting a rule the vocabulary
   * does not have. A *modifier* is the exception, and has its own check below.
   */
  function targeting(className, rules = screenRules()) {
    return rules.filter((rule) => rule.before && rule.classes.includes(className));
  }

  /** The declarations of every rule targeting a class, in cascade order. */
  const declarationsFor = (className) => targeting(className).flatMap((rule) => rule.declarations);

  /**
   * Every declaration a modifier makes on the status ELEMENT rather than on its
   * mark, as `selector { property: value }`.
   *
   * A named predicate rather than a loop inside its own assertion, so the
   * fixture block at the end of this file can run it over a stylesheet built to
   * carry the defect.
   */
  const modifierElementDeclarations = (rules) =>
    rules
      .filter((rule) => !rule.before)
      .filter((rule) => rule.subject.some((name) => MODIFIER_CLASSES.includes(name)))
      .flatMap((rule) =>
        rule.declarations.map(
          ({ property, value }) => `${rule.selector} { ${property}: ${value} }`,
        ),
      );

  const properties = (declarations) =>
    declarations.map((declaration) => declaration.property).sort();

  /** One property's whole value, or null unless it is declared exactly once. */
  function valueOf(declarations, property) {
    const matches = declarations.filter((declaration) => declaration.property === property);
    return matches.length === 1 ? matches[0].value : null;
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

  it('reads the whole stylesheet, and says so when it cannot', () => {
    // The control for the parser itself. css-tree recovers from a construct it
    // cannot parse by producing a `Raw` node, so a stylesheet it half-read
    // would yield a smaller rule set and every negative assertion below would
    // pass for the wrong reason. Both are reported, not one.
    const { rules, unreadable, errors } = parsed();
    expect(errors, 'css-tree could not parse the emitted stylesheet').toEqual([]);
    expect(unreadable, 'a rule prelude did not parse as a selector list').toEqual([]);
    expect(rules.length, 'the parse produced no rules at all').toBeGreaterThan(0);
  });

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
    const base = declarationsFor(MARK_PRIMITIVE);
    expect(base.length, 'no .state-marker::before rule in the screen cascade').toBeGreaterThan(0);
    expectUnqualified(MARK_PRIMITIVE);
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

    // And no fill. The invariant read from the other side: a fill on the BASE
    // applies to every state, so `background-color: currentcolor` here makes
    // `--paused` and `--in-progress` solid while their own rules still declare
    // nothing and pass (CodeRabbit, PR #964). Matched by prefix so the
    // `background` shorthand and any `background-*` longhand are covered, not
    // only the three the variants use.
    expect(
      properties(base).filter((name) => name.startsWith('background') || name === 'padding'),
      'the base mark rule declares a fill, which every state then inherits — fill ' +
        'belongs to the variants, geometry to the primitive',
    ).toEqual([]);
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
      const className = `${MARK_PRIMITIVE}--${modifier}`;
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
    // any of this, and has its own assertions in § print fidelity. `@layer` is
    // exempt because it gates on nothing.
    const conditional = allRules().filter((rule) => rule.conditional);
    const marks = MARK_CLASSES.flatMap((className) =>
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
      conditional.length,
      'the at-rule walk found no conditional rules anywhere in the stylesheet',
    ).toBeGreaterThan(0);
  });

  it('gives a modifier nothing to say about the element the mark hangs off', () => {
    // The second of #967's recorded limits, and the one the old extractor could
    // not have closed. Every check above is scoped to `::before`, because the
    // mark IS a pseudo-element and the element carries the status word each
    // surface legitimately styles. But `.state-marker--shipped { font-size:
    // 1.1em }` never touches the pseudo-element and changes the mark anyway:
    // the box is `calc(0.72em + 2px)`, so moving the em basis on ONE state
    // makes that state's mark a different size from its neighbours' — #959
    // again, arriving through the element.
    //
    // Rejecting it needs the distinction a token regex cannot make. A SURFACE
    // may set `font-size` — `.resume-entry__status { font-size: 7.5pt }` is how
    // the mark comes to track that kicker — so the rule cannot be "no font-size
    // near a mark class"; it has to be "nothing on a compound a modifier
    // narrows". `subjectClassNames` answers that off the selector AST.
    //
    // **Nothing, rather than a list of the properties that reach the mark.**
    // `font-size`, `font` and `zoom` are what #967 recorded, and `transform:
    // scale()` and `color` reach it too — the first scales the box, the second
    // recolours a border and two fills that are all `currentcolor`. Enumerating
    // them is the failure mode this whole PR is about: five rounds of closing
    // one case and leaving the shape. The closed version is the division of
    // labour stated one level out. On the `::before`, a variant owns fill and
    // nothing else. On the ELEMENT, a variant owns nothing at all: the element
    // belongs to the surface, which sizes and positions its own label, and to
    // the primitive, which sets `display` / `align-items` / `gap` on bare
    // `.state-marker`. A state that needs to say something has two right
    // places to say it, and the failure message names both.
    expect(
      modifierElementDeclarations(allRules()),
      'a lifecycle modifier declares something on the status ELEMENT rather than ' +
        'on its mark, so one state can differ from the rest of the vocabulary in ' +
        'size, colour or position — put it on .state-marker::before if it belongs ' +
        'to that state, or on .state-marker if it belongs to every state',
    ).toEqual([]);
  });

  it('leaves the mark pseudo-element to the primitive, on every surface class', () => {
    // The marks sit on an element that also carries a per-surface class, and
    // the mark IS that element's `::before` — so `.p-status::before` restyles
    // it without ever naming `.state-marker` (Codex, PR #964). The checks above
    // all key on the mark class and cannot see that.
    //
    // The surface classes are derived rather than listed, so a fifth surface is
    // covered when it is added rather than when someone remembers this test.
    // They are derived TWICE, from independent sources, because each derivation
    // has a blind spot the other does not (#967 limit 3, #968):
    //
    //   - the call sites say what the source asks for, including a surface
    //     whose status happens to render on no built page;
    //   - the built pages say what actually shipped, whatever shape the
    //     argument was written in.
    //
    // The previous version had only the first, and read it by collecting every
    // single-quoted literal anywhere inside the call. `stateMarkerClass(status,
    // "new-surface")` and `stateMarkerClass(status, surfaceClass)` therefore
    // contributed no alias each, while the `p-status` control still passed —
    // the check reported on a surface list that silently excluded the new one.
    const sites = callSites();

    // Controls for the call-site walk: a known positive per surface, so "no
    // offenders" cannot mean "the walk never reached the file".
    for (const surface of SURFACES) {
      expect(
        sites.map((site) => site.file),
        `the call-site walk never reached ${surface}`,
      ).toContain(surface);
    }

    // The call-site lint (#968). An argument this cannot read is reported as
    // unreadable, never as absent: the whole defect being fixed is a surface
    // that contributed nothing and looked like a surface that did not exist.
    // Failing here asks for a string literal, which costs a call site nothing
    // and is what makes the alias set knowable from the repository.
    expect(
      sites.flatMap(({ file, surfaces }) =>
        surfaces.filter((surface) => !surface.readable).map(({ text }) => `${file}: ${text}`),
      ),
      'a stateMarkerClass() surface argument is not a string literal, so the mark-override ' +
        'check below cannot name the surface it would have to police — pass the class as a ' +
        "literal ('p-status'), not as an identifier or an interpolation",
    ).toEqual([]);

    const declared = new Set(
      sites.flatMap(({ surfaces }) =>
        surfaces.filter((surface) => surface.readable).flatMap(({ classes }) => classes),
      ),
    );
    const rendered = renderedSurfaceClasses();

    // Non-empty, and a known positive on each side: "found nothing" and "there
    // is nothing to find" arrive as the same empty set otherwise.
    expect(
      [...declared].sort(),
      'no surface classes found at any stateMarkerClass() call site',
    ).toContain('p-status');
    expect(
      [...rendered].sort(),
      'no lifecycle mark on any built page carries a surface class',
    ).toContain('p-status');

    // And the two derivations have to agree in the direction that can be
    // checked. A declared surface missing from the build is either a surface
    // that stopped rendering or a DOM walk that stopped working, and both are
    // worth failing on; the reverse does not hold, since the build may carry a
    // class the call site never named.
    expect(
      [...declared].filter((alias) => !rendered.has(alias)).sort(),
      'a surface class is asked for at a call site but appears on no rendered mark',
    ).toEqual([]);

    for (const alias of new Set([...declared, ...rendered])) {
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
      properties(declarationsFor(`${MARK_PRIMITIVE}--shipped`)),
      'the extractor found no declarations anywhere',
    ).not.toEqual([]);
  });

  /**
   * Every shape the old extractor could not see, rebuilt as a defect and run
   * through the same machinery.
   *
   * The checks above are negatives over a stylesheet that is currently correct,
   * which is exactly the arrangement that let five rounds of holes through:
   * each hole passed every assertion because the rule carrying the defect was
   * never collected. This block is the other half — for each shape, a
   * stylesheet that DOES carry the defect, and the assertion that the collector
   * finds it.
   *
   * The first nine are #964's own history. The rest are the limits #967
   * recorded rather than patched, plus the shapes nobody had reported —
   * escaped class names and CSS nesting — and, in both directions, the two
   * false positives that matter: `@layer`, and a class that merely looks like
   * the primitive.
   */
  describe('the collector rejects every shape it has been fooled by', () => {
    /** A correct primitive, so each fixture differs only by its defect. */
    const PRIMITIVE = [
      '.state-marker::before{box-sizing:border-box;width:calc(.72em + 2px);',
      'height:calc(.72em + 2px);border:1px solid currentcolor}',
      '.state-marker--shipped::before{background-color:currentcolor}',
    ].join('');

    /**
     * Rules that override `--shipped`'s mark, each qualified in a way that has
     * fooled a previous version of this extractor.
     */
    const QUALIFIED = {
      'a descendant combinator': '.resume-canvas .state-marker--shipped::before{padding:9px}',
      'a compound': '.p-status.state-marker--shipped::before{padding:9px}',
      'a pseudo-class': '.state-marker--shipped:hover::before{padding:9px}',
      'an attribute selector': '.state-marker--shipped[data-x]::before{padding:9px}',
      'an id': '#main .state-marker--shipped::before{padding:9px}',
      ':is()': ':is(.state-marker--shipped)::before{padding:9px}',
      ':where()': ':where(.state-marker--shipped)::before{padding:9px}',
      'a comma inside :is()': ':is(.state-marker--shipped, .p-status)::before{padding:9px}',
      'the legacy :before': '.resume .state-marker--shipped:before{padding:9px}',
      // #967's first recorded limit: the comma is inside an attribute value, so
      // splitting the selector list on commas produced two fragments, neither
      // of which was a rule.
      'a comma inside an attribute value':
        '.x[data-label=","] .state-marker--shipped::before{padding:9px}',
      // Nobody had reported this one. Both escape forms are the same class
      // name; the old token regex stopped at the backslash and read either as
      // the bare primitive, so a modifier override was measured against the
      // BASE rule's expectations.
      'an escaped class name': '.state-marker\\-\\-shipped::before{padding:9px}',
      'a hex-escaped class name': '.state-marker\\2d \\2d shipped::before{padding:9px}',
      // Nor this one. A nested rule has no selector of its own in the flat
      // text, so a top-level `{...}` scan never reached it — and the second
      // form is the one that survived the first fix, because the modifier is on
      // the OUTER rule and the `::before` on the inner, so neither half names
      // both (Codex, PR #973).
      'CSS nesting': '.resume{color:red;& .state-marker--shipped::before{padding:9px}}',
      'a nested rule two deep': '.resume{& .card{& .state-marker--shipped::before{padding:9px}}}',
      // An escape is valid in a pseudo-element identifier too, and css-tree
      // keeps the source spelling there as well.
      'an escaped pseudo-element name': '.state-marker--shipped::be\\66 ore{padding:9px}',
    };

    for (const [shape, css] of Object.entries(QUALIFIED)) {
      it(`collects a mark override behind ${shape}`, () => {
        const { rules, unreadable, errors } = analyze(PRIMITIVE + css);
        expect(errors, 'the fixture did not parse').toEqual([]);
        expect(unreadable, 'the fixture prelude did not parse').toEqual([]);
        const qualified = rules
          .filter((rule) => rule.before && rule.classes.includes('state-marker--shipped'))
          .map(({ selector }) => selector)
          .filter((selector) => !/^\.state-marker--shipped::?before$/.test(selector));
        expect(qualified.length, `an override behind ${shape} was not collected`).toBe(1);
      });
    }

    it('resolves a nested & against its parent, and attributes what it says', () => {
      // The nesting shape that survived the first fix: the modifier is on the
      // OUTER rule and the `::before` on the inner, so a collector reading each
      // rule's own selector sees a modifier with no pseudo-element and a
      // pseudo-element with no modifier, and the stray geometry belongs to
      // neither (Codex, PR #973).
      //
      // Not in the table above, because resolving it produces the BARE
      // primitive selector rather than a qualified one — `.state-marker--shipped
      // { &::before { … } }` simply IS `.state-marker--shipped::before { … }`.
      // So `expectUnqualified` is right to accept it and the declaration checks
      // are what reject it, which is the same treatment the unnested form gets.
      const { rules, errors } = analyze(
        `${PRIMITIVE}.state-marker--shipped{&::before{padding:9px}}`,
      );
      expect(errors, 'the fixture did not parse').toEqual([]);
      const mark = rules.filter(
        (rule) => rule.before && rule.classes.includes('state-marker--shipped'),
      );
      expect(
        mark.map(({ selector }) => selector),
        'the nested & did not resolve to its parent',
      ).toEqual(['.state-marker--shipped::before', '.state-marker--shipped::before']);
      expect(
        mark.flatMap((rule) => rule.declarations.map(({ property }) => property)).sort(),
        'the nested declaration was not attributed to the mark',
      ).toEqual(['background-color', 'padding']);
    });

    it('refuses to read a nested rule it cannot parse rather than skipping it', () => {
      // css-tree 3.2.1 does not accept a nested rule whose selector starts with
      // `.` and carries no `&` — the CSS-nesting spec allows it, the parser
      // reads it as a malformed declaration. That is a real gap, and the point
      // is where it lands: `analyze` collects the parse error, and the "reads
      // the whole stylesheet" control asserts there are none, so a stylesheet
      // containing this shape fails loudly instead of being half-read.
      // "Found nothing" and "could not look" stay apart even at the parser.
      const { errors } = analyze('.resume{.state-marker--shipped::before{padding:9px}}');
      expect(
        errors.length,
        'a nested rule with no & parsed silently, so the shape would be skipped rather than reported',
      ).toBeGreaterThan(0);
    });

    it('does not read an unrelated escaped class name as the primitive', () => {
      // The other direction, and the reason the escaped forms above are not
      // just "more coverage". `.state-marker\,y` is a class literally named
      // `state-marker,y` — a different class that happens to share a prefix.
      // The old token regex stopped at the backslash and reported it as
      // `state-marker`, so this rule would have been rejected as a qualified
      // override of the primitive: a false failure on correct CSS, which is
      // the direction round 5 established is the worse one.
      const { rules } = analyze(`${PRIMITIVE}.state-marker\\,y::before{padding:9px}`);
      expect(
        rules.filter((rule) => rule.classes.includes('state-marker')).map((r) => r.selector),
        'an unrelated class was read as the mark primitive',
      ).toEqual(['.state-marker::before']);
    });

    it('sees a mark defined behind a media query, and not one behind @layer', () => {
      const conditional = (css) => analyze(css).rules.filter((rule) => rule.conditional);
      expect(
        conditional(`@media (min-width:700px){${PRIMITIVE}}`).length,
        'a mark behind @media read as unconditional',
      ).toBeGreaterThan(0);
      // The false positive round 5 introduced and then fixed. A cascade-layer
      // refactor is behaviour-preserving and must stay passing.
      expect(
        conditional(`@layer components{${PRIMITIVE}}`),
        '@layer read as conditional, which would reject a cascade-layer refactor',
      ).toEqual([]);
      // And the nested case, which the flat range scan could not represent.
      expect(
        conditional(`@layer components{@media (min-width:700px){${PRIMITIVE}}}`).length,
        '@media nested inside @layer read as unconditional',
      ).toBeGreaterThan(0);
    });

    it('sees a surface override behind a media query', () => {
      // The rule fell between two scans: the conditional one looked only for
      // mark classes, the alias one looked only at unconditional rules.
      const rules = analyze('@media (min-width:700px){.p-status::before{padding:9px}}').rules;
      expect(
        rules.filter((rule) => rule.before && rule.classes.includes('p-status')).length,
        'a surface override behind a media query was not collected',
      ).toBeGreaterThan(0);
    });

    it("tells a modifier's compound from a surface's", () => {
      // #967's second recorded limit. Both fixtures set the same property on
      // the same kind of element; only the first is a defect.
      const subjects = (css) => analyze(css).rules.map((rule) => rule.subject);
      expect(
        subjects('.resume-entry__status.state-marker--shipped{font-size:1.1em}')[0],
        'a modifier in a compound was not read as the subject',
      ).toContain('state-marker--shipped');
      expect(
        subjects('.resume-entry__status{font-size:7.5pt}')[0],
        'a surface class was read as a modifier',
      ).not.toContain('state-marker--shipped');
      expect(
        subjects('.state-marker--shipped + .p-status{font-size:1.1em}')[0],
        'a modifier on the far side of a combinator was read as the subject',
      ).not.toContain('state-marker--shipped');
      expect(
        subjects(':is(.p-status, .state-marker--shipped){font-size:1.1em}')[0],
        'a modifier inside :is() was not read as the subject',
      ).toContain('state-marker--shipped');
      // A functional selector has no TOP-LEVEL combinator, so collecting every
      // class inside it made the wrapped form of the sibling selector two lines
      // up read as modifier-scoped — a false failure on the exact shape this
      // test asserts must pass unwrapped (Codex, PR #973).
      expect(
        subjects(':is(.state-marker--shipped + .p-status){font-size:1.1em}')[0],
        'a modifier inside :is() was read as the subject when its own subject is the sibling',
      ).not.toContain('state-marker--shipped');
      // `:not()` says the subject does NOT carry the class, and `:has()`'s
      // argument is a descendant. Reading either as a subject inverts them.
      expect(
        subjects('.p-status:not(.state-marker--shipped){font-size:1.1em}')[0],
        'a class inside :not() was read as the subject',
      ).not.toContain('state-marker--shipped');
      expect(
        subjects('.p-status:has(.state-marker--shipped){font-size:1.1em}')[0],
        'a descendant inside :has() was read as the subject',
      ).not.toContain('state-marker--shipped');
    });

    it('rejects whatever a modifier says on the element, not a list of properties', () => {
      // The point of the rule being closed. `font-size` is what #967 recorded;
      // `transform` scales the same box and `color` recolours a border and two
      // fills that are all `currentcolor`. None of them is enumerated, and all
      // of them are rejected — which is what stops this becoming another list
      // that closes one case and leaves the shape.
      const declarations = (css) => modifierElementDeclarations(analyze(css).rules);
      for (const declaration of [
        'font-size:1.1em',
        'font:700 1.1em/1 Inter',
        'zoom:1.2',
        'transform:scale(1.2)',
        'color:#888',
        'letter-spacing:.2em',
      ]) {
        expect(
          declarations(`.state-marker--shipped{${declaration}}`).length,
          `a modifier declaring ${declaration} on the element was not rejected`,
        ).toBe(1);
      }
      // Compound, and behind an at-rule: a modifier may not narrow the element
      // at any width either.
      expect(
        declarations('.resume-entry__status.state-marker--shipped{font-size:1.1em}').length,
        'a modifier narrowing a surface compound was not rejected',
      ).toBe(1);
      expect(
        declarations('@media (min-width:700px){.state-marker--shipped{font-size:1.1em}}').length,
        'a modifier element rule behind a media query was not rejected',
      ).toBe(1);

      // And the three shapes that must keep passing: the primitive's own
      // element rule, a surface sizing its own label, and a modifier that is
      // not the subject.
      expect(
        declarations('.state-marker{display:inline-flex;gap:.42em}'),
        "the primitive's own element rule was rejected",
      ).toEqual([]);
      expect(
        declarations('.resume-entry__status{font-size:7.5pt}'),
        'a surface sizing its own status label was rejected',
      ).toEqual([]);
      expect(
        declarations('.state-marker--shipped + .p-status{font-size:1.1em}'),
        'a sibling of a modifier was rejected',
      ).toEqual([]);
      expect(
        declarations('.state-marker--shipped::before{background-color:currentcolor}'),
        "a modifier's own mark rule was rejected as an element rule",
      ).toEqual([]);
    });

    it('reads every literal form a surface argument can take, and refuses the rest', () => {
      // #967's third recorded limit, filed as #968. Single quotes were the only
      // form the old scan read.
      const surfacesOf = (call) => readSurfaceArguments(call);
      expect(surfacesOf("stateMarkerClass(status, 'a')")).toEqual([
        { readable: true, classes: ['a'] },
      ]);
      expect(surfacesOf('stateMarkerClass(status, "b")')).toEqual([
        { readable: true, classes: ['b'] },
      ]);
      expect(surfacesOf('stateMarkerClass(status, `c`)')).toEqual([
        { readable: true, classes: ['c'] },
      ]);
      // One literal carrying two classes is what the helper joins anyway, so it
      // has to read as two aliases or the rendered cross-check fails on code
      // that behaves identically.
      expect(surfacesOf("stateMarkerClass(status, 'post-meta project-status')")).toEqual([
        { readable: true, classes: ['post-meta', 'project-status'] },
      ]);
      expect(surfacesOf("stateMarkerClass(statusOf(slug), 'd', 'e')")).toEqual([
        { readable: true, classes: ['d'] },
        { readable: true, classes: ['e'] },
      ]);
      // A comma inside a literal is not an argument boundary.
      expect(surfacesOf("stateMarkerClass(status, 'f,g')")).toEqual([
        { readable: true, classes: ['f,g'] },
      ]);
      // And everything else is unreadable, which fails the lint above rather
      // than contributing nothing and looking like no surface at all.
      expect(surfacesOf('stateMarkerClass(status, surfaceClass)')).toEqual([
        { readable: false, text: 'surfaceClass' },
      ]);
      expect(surfacesOf('stateMarkerClass(status, `x-${y}`)')).toEqual([
        { readable: false, text: '`x-${y}`' },
      ]);
    });

    it('blanks comments before scanning, in both directions', () => {
      // A block comment carrying a `)` closed the argument scan early, which
      // produced an EMPTY surface list — no alias, and no unreadable argument
      // to fail on either, so the surface went unpoliced silently. And a call
      // written inside a comment was scanned as a real one (Codex, PR #973).
      const inCall = `const c = stateMarkerClass(statusFor(slug) /${'*'} ) ${'*'}/, 'new-surface');`;
      expect(
        readSurfaceArguments(
          withoutComments(inCall).slice(withoutComments(inCall).indexOf('stateMarkerClass(')),
        ),
        'a block comment inside the call truncated its argument list',
      ).toEqual([{ readable: true, classes: ['new-surface'] }]);

      const inComment = `// stateMarkerClass(status, surfaceClass)\nconst x = 1;`;
      expect(
        withoutComments(inComment).includes('stateMarkerClass('),
        'a call written inside a comment was left in the scanned source',
      ).toBe(false);

      // Offsets are preserved, so a call after a comment is still found where
      // it actually sits.
      const after = `/${'*'} note ${'*'}/ stateMarkerClass(status, 'p-status')`;
      expect(withoutComments(after).indexOf('stateMarkerClass(')).toBe(
        after.indexOf('stateMarkerClass('),
      );
      // And a comment marker inside a string literal is not a comment.
      expect(withoutComments(`const u = 'https://x/y'; // gone`).trim()).toBe(
        "const u = 'https://x/y';",
      );
    });
  });
});
