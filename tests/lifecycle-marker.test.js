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
 * ## One tokenizer, three consumers
 *
 * There used to be three scanners here — a comment/string masker, a
 * paren matcher, and an argument splitter — each with its own notion of what a
 * string is and only two of which knew what a regex literal was. Every round of
 * review found a shape one of them handled and another did not, because they
 * were three approximations of the same lexical rule. `scanJs` is now that rule,
 * stated once: it walks the source and reports each span as code, a string, a
 * comment, or a regex, with template interpolations recursing back into code.
 * Everything below is a projection of that one walk.
 *
 * ## What the inventory actually needs, and why arguments are not split
 *
 * The question is not "what are this call's arguments" but "which surface
 * classes can carry a mark". Argument POSITION was only ever a proxy for
 * telling the status argument from the base ones — and the status argument, when
 * it is a literal at all, is a key of `STATUS_MARKER`, which is a closed set. So
 * the literals are collected and classified by that set instead. No commas, no
 * bracket depth, no argument boundaries, and therefore no way for a regex or a
 * conditional expression to fabricate a boundary and with it a bogus surface.
 * That fabrication was the source of every false failure this scanner produced.
 *
 * ## Where the remaining ambiguity goes
 *
 * A lexer without a full JavaScript grammar can still guess wrong about whether
 * a `/` divides or opens a regex. The consequence is bounded, and it is bounded
 * by the inventory cross-check rather than by more grammar: a missed literal
 * removes a surface from `declared`, and § declarations asserts
 * `rendered ⊆ declared`, so any surface that actually reaches a rendered mark
 * fails there by name. A surface that renders nowhere has no element for a
 * `::before` override to reach, which is the residue and it is inert.
 *
 * That is why the old "this argument is not a string literal" lint is gone. It
 * could not tell a genuinely dynamic argument from a mis-split one, so it turned
 * lexer uncertainty into a hard failure on correct code — the exact inversion
 * this PR exists to stop.
 */

/**
 * Characters after which a `/` opens a REGEX rather than dividing, and the
 * keywords that do the same without ending in punctuation.
 *
 * Stated once, used by every consumer of `scanJs`. `>` is here because an arrow
 * head ends in one; the keyword list exists because `return`, `throw` and their
 * peers introduce an expression and end in a letter (CodeRabbit and Codex,
 * PR #973). Both are lexical facts about JavaScript rather than a list of
 * reported bugs, and a miss is bounded by the cross-check described above.
 */
const EXPRESSION_POSITION = '(,=:[!&|?{};+-*%~^<>';
const EXPRESSION_KEYWORDS =
  /(?:^|[^\w$])(return|throw|yield|await|typeof|instanceof|case|in|of|new|void|delete|do|else)\s*$/;

/**
 * Walk JavaScript-ish source once, reporting every span with its kind.
 *
 * `visit(kind, from, to)` is called for each span in order, covering the whole
 * input exactly once. Kinds: `code`, `string`, `comment`, `regex`. A template
 * literal's `${…}` is emitted as `code`, so a call written inside one is seen.
 *
 * Not a JavaScript parser, and it does not need to be — see the note above for
 * what the remaining ambiguity costs and where it is caught.
 */
function scanJs(source, visit) {
  let index = 0;
  let codeFrom = 0;
  const interpolations = []; // brace depth per open `${ … }`
  const flush = (to) => {
    if (to > codeFrom) visit('code', codeFrom, to);
  };
  const emit = (kind, from, to) => {
    visit(kind, from, to);
    index = to;
    codeFrom = to;
  };

  // From a backtick (or the `}` resuming one), find where this chunk ends.
  const templateChunk = (from) => {
    for (let j = from + 1; j < source.length; j += 1) {
      const c = source[j];
      if (c === '\\') {
        j += 1;
        continue;
      }
      if (c === '`') return { end: j + 1, interp: false };
      if (c === '$' && source[j + 1] === '{') return { end: j, interp: true };
    }
    return { end: source.length, interp: false };
  };

  while (index < source.length) {
    const c = source[index];
    const n = source[index + 1];
    const top = interpolations.length ? interpolations[interpolations.length - 1] : null;

    if (top !== null && c === '{') {
      top.depth += 1;
      index += 1;
      continue;
    }
    if (top !== null && c === '}') {
      if (top.depth > 0) {
        top.depth -= 1;
        index += 1;
        continue;
      }
      flush(index + 1); // the `}` closes the interpolation: still code
      interpolations.pop();
      const { end, interp } = templateChunk(index);
      const to = interp ? end + 2 : end;
      visit('string', index + 1, interp ? end : to);
      if (interp) {
        interpolations.push({ depth: 0 });
        visit('code', end, end + 2);
      }
      index = to;
      codeFrom = to;
      continue;
    }

    if (c === '/' && (n === '/' || n === '*')) {
      flush(index);
      const block = n === '*';
      const found = block ? source.indexOf('*/', index + 2) : source.indexOf('\n', index);
      emit('comment', index, found === -1 ? source.length : found + (block ? 2 : 0));
      continue;
    }

    if (c === '/') {
      const before = source.slice(0, index).replace(/\s+$/, '');
      const last = before.slice(-1);
      if (last === '' || EXPRESSION_POSITION.includes(last) || EXPRESSION_KEYWORDS.test(before)) {
        let escaped = false,
          inClass = false,
          closed = -1;
        for (let j = index + 1; j < source.length; j += 1) {
          const d = source[j];
          if (escaped) escaped = false;
          else if (d === '\\') escaped = true;
          else if (d === '[') inClass = true;
          else if (d === ']') inClass = false;
          else if (d === '\n') break;
          else if (d === '/' && !inClass) {
            closed = j;
            break;
          }
        }
        if (closed !== -1) {
          flush(index);
          emit('regex', index, closed + 1);
          continue;
        }
      }
    }

    if (c === "'" || c === '"') {
      flush(index);
      let end = source.length;
      for (let j = index + 1; j < source.length; j += 1) {
        const d = source[j];
        if (d === '\\') {
          j += 1;
          continue;
        }
        if (d === c) {
          end = j + 1;
          break;
        }
        if (d === '\n') {
          end = j;
          break;
        } // not a string: an apostrophe in markup
      }
      emit('string', index, end);
      continue;
    }

    if (c === '`') {
      flush(index);
      const { end, interp } = templateChunk(index);
      visit('string', index, end);
      if (interp) {
        interpolations.push({ depth: 0 });
        visit('code', end, end + 2);
        index = end + 2;
      } else index = end;
      codeFrom = index;
      continue;
    }

    index += 1;
  }
  flush(source.length);
}
/** `source` with every span of the given kinds replaced by spaces, offsets kept. */
function mask(source, kinds) {
  const out = source.split('');
  scanJs(source, (kind, from, to) => {
    if (!kinds.includes(kind)) return;
    for (let i = from; i < to; i += 1) if (out[i] !== '\n') out[i] = ' ';
  });
  return out.join('');
}

/** Comments blanked; string contents kept. */
const withoutComments = (source) => mask(source, ['comment']);

/**
 * Comments, string contents and regex literals blanked.
 *
 * Used only to FIND call sites, never to read them: helper text quoted in a
 * string literal or written in a comment is not an invocation.
 */
const withoutCommentsOrStrings = (source) => mask(source, ['comment', 'string', 'regex']);

/**
 * Index of the `)` closing the call whose `(` is at `openIndex`, or -1.
 *
 * Counts parentheses in CODE spans only, so a `(` inside a string, a comment or
 * a regex character class cannot unbalance it — the defect that made
 * `stateMarkerClass(/[(]/.test(v) ? …)` read as an unreadable call.
 */
function matchingParen(source, openIndex) {
  let depth = 0;
  let close = -1;
  scanJs(source, (kind, from, to) => {
    if (close !== -1 || kind !== 'code') return;
    for (let i = Math.max(from, openIndex); i < to; i += 1) {
      if (source[i] === '(') depth += 1;
      else if (source[i] === ')' && (depth -= 1) === 0) {
        close = i;
        return;
      }
    }
  });
  return close;
}

/** A complete string literal, with its delimiters, to its value. */
const STRING_LITERAL = /^(?:'([^'\\\n]*)'|"([^"\\\n]*)"|`([^`\\$\n]*)`)$/;

/**
 * The surface classes named by one `stateMarkerClass(...)` call.
 *
 * Every string literal inside the call, minus the ones that are lifecycle
 * STATUS words — which is what the first argument would be if it were a literal
 * at all. Positions are not used; see the note at the top of this section for
 * why the closed status vocabulary replaces argument boundaries, and where the
 * residual lexer ambiguity is caught.
 *
 * @param {string} callText `stateMarkerClass(` through its matching `)`.
 * @returns {{classes: string[], readable: boolean}}
 */
function readSurfaceArguments(callText) {
  const open = callText.indexOf('(');
  const close = open === -1 ? -1 : matchingParen(callText, open);
  if (close === -1) return { classes: [], readable: false };
  const inner = callText.slice(open + 1, close);
  const classes = [];
  scanJs(inner, (kind, from, to) => {
    if (kind !== 'string') return;
    const literal = inner.slice(from, to).match(STRING_LITERAL);
    if (!literal) return;
    const value = literal[1] ?? literal[2] ?? literal[3];
    if (Object.hasOwn(STATUS_MARKER, value)) return;
    classes.push(...value.split(/\s+/).filter(Boolean));
  });
  return { classes, readable: true };
}

/** Every `stateMarkerClass()` call site under `src/`, with its surfaces read. */
function callSites() {
  const sites = [];
  for (const file of findFilesRecursively(SRC, (f) => /\.(astro|ts|js|mjs)$/.test(f))) {
    const name = relative(SRC, file);
    // The module's own `export function stateMarkerClass(status, ...base)` is a
    // declaration, not a call, and its parameter list is not a surface list.
    if (name === MARKER_MODULE) continue;
    const raw = readFileSync(file, 'utf-8');
    // Two projections of one scan, over the same offsets: call sites are FOUND
    // where no string, comment or regex covers them, and READ from a source that
    // still has its literals.
    const source = withoutComments(raw);
    for (const call of withoutCommentsOrStrings(raw).matchAll(/\bstateMarkerClass\s*\(/g)) {
      const close = matchingParen(source, call.index + call[0].length - 1);
      sites.push({
        file: name,
        ...readSurfaceArguments(close === -1 ? call[0] : source.slice(call.index, close + 1)),
      });
    }
  }
  return sites;
}

/**
 * Every surface class, from BOTH derivations — the call sites and the build.
 *
 * Shared so the print cascade is policed against the same list as the screen
 * one. A `@media print{.p-status::before{…}}` override is a per-surface
 * narrowing of the mark exactly as its screen counterpart is, and print is the
 * medium the résumé PDF renders in.
 */
function surfaceAliases() {
  const declared = callSites().flatMap((site) => site.classes);
  return new Set([...declared, ...renderedSurfaceClasses()]);
}

/**
 * Every non-mark class on an element that carries a mark, read off the build.
 *
 * The second, independent derivation of the surface list. This one is blind to
 * a surface whose status renders on no built page, and immune to how the
 * argument was written — which is the complement of what the call-site walk
 * can and cannot see.
 */
let renderedInventory;
/**
 * Every class on a rendered mark, classified against the closed vocabulary.
 *
 * Returns `{ surfaces, unknownModifiers }`. The primitive and the modifiers
 * `STATUS_MARKER` can emit are accounted for; anything else spelled
 * `state-marker--*` is an UNKNOWN modifier and is reported rather than dropped.
 *
 * It used to be dropped: the filter discarded every `state-marker--*` on its way
 * to the surface list, so a modifier the vocabulary cannot emit — a rename that
 * left its class behind, or a typo — vanished from the inventory silently while
 * rendering on the page. A class that is neither a known modifier nor a surface
 * has to be named, not classified into whichever bucket happens to swallow it.
 */
function renderedClassInventory() {
  if (renderedInventory) return renderedInventory;
  const surfaces = new Set();
  const unknownModifiers = new Map();
  const known = new Set(MARK_CLASSES);
  for (const { route, html } of builtPages()) {
    const { document } = new JSDOM(html).window;
    for (const element of document.querySelectorAll(`.${MARK_PRIMITIVE}`)) {
      for (const name of element.classList) {
        if (known.has(name)) continue;
        if (name.startsWith(`${MARK_PRIMITIVE}--`)) {
          if (!unknownModifiers.has(name)) unknownModifiers.set(name, route);
          continue;
        }
        surfaces.add(name);
      }
    }
  }
  renderedInventory = { surfaces, unknownModifiers };
  return renderedInventory;
}

/** Every non-mark class on an element that carries a mark, read off the build. */
const renderedSurfaceClasses = () => renderedClassInventory().surfaces;

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
   *
   * `@scope` is here for a related reason and a sharper consequence. It narrows
   * by DOM POSITION, not by viewport or capability, so a mark inside it is not
   * "one viewport away from being a different mark" — and its rules resolve to
   * ordinary selectors through `:scope`, so leaving it conditional dropped them
   * out of `screenRules()` entirely and a scoped `::before` override bypassed
   * every fill and geometry check (CodeRabbit, PR #973).
   */
  const UNCONDITIONAL_AT_RULES = new Set(['layer', 'scope']);

  /**
   * `[class~="x"]` and friends: the same targeting written as an attribute.
   *
   * `[class~="state-marker--shipped"]::before` selects exactly what
   * `.state-marker--shipped::before` does, and a ClassSelector-only walk sees
   * no lifecycle class in it at all (Codex, PR #973). The two exact matchers
   * name their classes literally and are read as such; every other matcher is a
   * predicate over the whole attribute string, so it is treated as matching
   * ANY class rather than modelled — broad collection, the same trade
   * `targeting` already makes, and the built stylesheet carries no `class`
   * attribute selector for it to over-collect.
   *
   * @param {object} node An `AttributeSelector`.
   * @returns {{exact: string[]} | {any: true} | null} null if not on `class`.
   */
  function classAttributeSelector(node) {
    if (csstree.ident.decode(node.name.name).toLowerCase() !== 'class') return null;
    // A QUOTED value is a `String` node whose `.value` is already the literal
    // text; an UNQUOTED one is an `Identifier` whose `.name` retains CSS
    // escapes, so `[class~=state\\-marker]` reads as `state\\-marker` and misses
    // the class (CodeRabbit, PR #973). The fourth identifier kind in this file
    // to need decoding, after class names, pseudo-element names and property
    // names — decode where the node type says it is an identifier, and leave
    // the string alone where it says it is a string.
    const value = node.value;
    const operand =
      value == null
        ? ''
        : value.type === 'Identifier'
          ? csstree.ident.decode(value.name)
          : String(value.value ?? '');
    // `[class~="STATE-MARKER--SHIPPED" i]` matches the lowercase class the
    // vocabulary emits, so the operand has to be folded before it is compared
    // (Codex, PR #973). The vocabulary is lowercase throughout, so folding the
    // operand is enough — no comparison site needs to change.
    // The flag is an identifier as well, so css-tree keeps ITS source spelling
    // too: `[class~="X" \\69]` is a valid case-insensitive match whose flag
    // reads as `\\69 ` (Codex, PR #973). Fifth identifier kind in this file to
    // need the same treatment — class names, pseudo-elements, properties,
    // attribute values, and now attribute flags.
    const flags = csstree.ident.decode(node.flags ?? '').trim();
    const folded = /^i$/i.test(flags) ? operand.toLowerCase() : operand;
    const tokens = folded.split(/\s+/).filter(Boolean);
    // `~=` matches ONE token in the list, so it names that class outright.
    if (node.matcher === '~=') return { exact: tokens };
    // `=` matches the WHOLE attribute, so its operand is the element's entire
    // class list rather than a set of independently matched names. Reading it
    // token-wise rejected `[class="p-status"]::before` as a surface override —
    // but a rendered mark always carries `state-marker` too, so that selector
    // cannot match one and is styling something else entirely. A false
    // failure, and the worse direction (Codex, PR #973).
    if (node.matcher === '=') {
      return tokens.includes(MARK_PRIMITIVE) ? { exact: tokens } : { exact: [] };
    }
    return { any: true };
  }

  /**
   * Every class name a selector names literally, escapes decoded, plus whether
   * it also selects on the `class` attribute in a way no literal name covers.
   */
  function classesIn(node) {
    const names = [];
    const excluded = [];
    let anyClass = false;
    // Two pseudo-classes do not name a target the way a bare class does, and
    // collecting from them produced false failures on correct CSS (Codex,
    // PR #973, corroborated by an independent adversarial pass):
    //
    //   `:has()` holds a DESCENDANT. `.project-card:has(.state-marker--shipped)
    //   .title::before` styles a title, not a mark, and was read as overriding
    //   the shipped mark. Excluded at any depth.
    //
    //   `:not()` FLIPS the requirement. `.p-status:not(.state-marker)::before`
    //   explicitly excludes marks and was read as narrowing them. Polarity is
    //   tracked rather than the pseudo being skipped, so
    //   `:not(:not(.state-marker--shipped))` — which REQUIRES the modifier — is
    //   still collected.
    //
    // `subjectClassNames` already drew both distinctions; this is that reasoning
    // reaching the walk `targeting()` keys on.
    const walk = (current, negated) => {
      if (current.type === 'ClassSelector') {
        (negated ? excluded : names).push(csstree.ident.decode(current.name));
        return;
      }
      if (current.type === 'AttributeSelector') {
        const attribute = classAttributeSelector(current);
        if (!attribute || negated) return;
        if (attribute.any) anyClass = true;
        else names.push(...attribute.exact);
        return;
      }
      if (current.type === 'PseudoClassSelector') {
        const name = csstree.ident.decode(current.name).toLowerCase();
        if (name === 'has') return;
        const inner = name === 'not' ? !negated : negated;
        for (const child of current.children ?? []) walk(child, inner);
        return;
      }
      for (const child of current.children ?? []) walk(child, negated);
    };
    walk(node, false);
    // A selector that NEGATES the primitive cannot match a mark: every rendered
    // mark carries `.state-marker`. `.p-status:not(.state-marker)::before` is
    // therefore a surface styling its non-mark elements, and rejecting it as a
    // per-surface narrowing of the mark is a false failure.
    return { names, anyClass, excludesMark: excluded.includes(MARK_PRIMITIVE) };
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
  const SUBJECT_PSEUDOS = new Set(['is', 'where', 'nth-child', 'nth-last-child']);

  /**
   * The selector lists a functional pseudo-class OWNS — its own arguments, and
   * nothing nested deeper.
   *
   * `csstree.walk(node, { visit: 'SelectorList' })` was the first version and
   * it reached too far: for `:is(.p-status:not(.state-marker--shipped))` it
   * found the inner `:not()`'s list as well and processed it at the OUTER
   * polarity, recording the modifier as required and rejecting a rule whose
   * unwrapped equivalent this suite explicitly allows (Codex, PR #973). A false
   * failure, and one this file's own fixtures assert against two tests apart.
   *
   * Taking only the owned lists puts the nested pseudo back where it belongs:
   * the recursive `subjectClassNames` call reaches it through its parent
   * selector and applies that pseudo's own polarity.
   */
  function ownedSelectorLists(pseudo) {
    const lists = [];
    for (const child of pseudo.children ?? []) {
      if (child.type === 'SelectorList') lists.push(child);
      // `:nth-child(n of S)` keeps its list one level down, under `Nth`.
      else if (child.type === 'Nth' && child.selector?.type === 'SelectorList') {
        lists.push(child.selector);
      }
    }
    return lists;
  }

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
  function subjectClassNames(selector, negated = false) {
    const names = [];
    for (const node of subjectCompound(selector)) {
      if (node.type === 'ClassSelector') {
        if (!negated) names.push(csstree.ident.decode(node.name));
        continue;
      }
      if (node.type === 'AttributeSelector') {
        const attribute = classAttributeSelector(node);
        if (!negated && attribute && !attribute.any) names.push(...attribute.exact);
        continue;
      }
      if (node.type !== 'PseudoClassSelector') continue;
      const pseudo = csstree.ident.decode(node.name).toLowerCase();
      // `:not()` FLIPS the requirement rather than removing it. Skipping it
      // wholesale read `.p-status:not(:not(.state-marker--shipped))` — which
      // requires the modifier — as naming only `p-status`, so a state-specific
      // element declaration bypassed the modifier rule (Codex, PR #973).
      // Polarity is tracked instead: at even depth the classes inside are
      // required and count, at odd depth they are excluded and do not.
      if (pseudo === 'not') {
        for (const list of ownedSelectorLists(node)) {
          for (const inner of list.children) names.push(...subjectClassNames(inner, !negated));
        }
        continue;
      }
      if (!SUBJECT_PSEUDOS.has(pseudo)) continue;
      // `:nth-child(1 of .state-marker--shipped)` puts its selector list under
      // an `Nth` node rather than beside the pseudo's own children, so a walk
      // that only reads direct `SelectorList` children finds nothing and the
      // rule gets an empty subject (Codex, PR #973). The lists are collected
      // wherever they sit.
      for (const list of ownedSelectorLists(node)) {
        for (const inner of list.children) names.push(...subjectClassNames(inner, negated));
      }
    }
    return names;
  }

  /**
   * Does the subject compound select on `class` in a way no literal name
   * covers — `[class*="state-marker--"]`, or a bare `[class]`?
   *
   * The modifier-element rule keys on named classes, so without this an
   * attribute predicate over the class string is a subject the rule cannot see.
   * Answered broadly, on the same trade as `targeting`: an unmodelled predicate
   * counts as possibly-a-modifier rather than as definitely-not.
   */
  function subjectAnyClass(selector, negated = false) {
    for (const node of subjectCompound(selector)) {
      if (node.type === 'AttributeSelector') {
        if (!negated && classAttributeSelector(node)?.any) return true;
        continue;
      }
      if (node.type !== 'PseudoClassSelector') continue;
      const pseudo = csstree.ident.decode(node.name).toLowerCase();
      const recurse = pseudo === 'not' ? !negated : negated;
      if (pseudo !== 'not' && !SUBJECT_PSEUDOS.has(pseudo)) continue;
      for (const list of ownedSelectorLists(node)) {
        for (const inner of list.children) if (subjectAnyClass(inner, recurse)) return true;
      }
    }
    return false;
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
        // `&` under a style rule and `:scope` under `@scope` are the same
        // thing wearing different syntax: a placeholder for the enclosing
        // selector. `@scope (.state-marker--shipped) { :scope::before { … } }`
        // names no modifier class in the inner rule, so the collector saw
        // nothing (Codex, PR #973).
        const placeholder =
          node.type === 'NestingSelector' ||
          (node.type === 'PseudoClassSelector' &&
            csstree.ident.decode(node.name).toLowerCase() === 'scope');
        if (!placeholder || !list) return;
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
   * The class a selector is the BARE `::before` primitive of, or null.
   *
   * Structural, not textual. `expectUnqualified` used to compare
   * `csstree.generate()`'s output against the two literal spellings, which
   * rejected `.state-marker\\2d \\2d shipped::before` — a valid escaped spelling
   * of the bare selector, with no surface narrowing in it — as though it were
   * qualified (Codex, PR #973). The identifier walkers had been taught to
   * decode while the final comparison still read the raw serialization, which
   * is the same half-applied fix twice over.
   *
   * Bare means exactly two parts: one class selector, then `::before` (or the
   * legacy `:before` the minifier emits). Anything else — an ancestor, a second
   * class, an attribute, a pseudo-class — is a narrowing and returns null.
   */
  function bareTarget(selector) {
    const parts = selector.children.toArray();
    if (parts.length !== 2) return null;
    const [subject, pseudo] = parts;
    if (subject.type !== 'ClassSelector') return null;
    const isPseudo =
      pseudo.type === 'PseudoElementSelector' || pseudo.type === 'PseudoClassSelector';
    if (!isPseudo || csstree.ident.decode(pseudo.name).toLowerCase() !== 'before') return null;
    return csstree.ident.decode(subject.name);
  }

  /**
   * The scoping root of an `@scope`, as selector nodes — or `null` when there
   * is no readable one.
   *
   * Read off the parsed `Scope` node. css-tree 3.2.1 exposes
   * `{ root: SelectorList | null, limit: SelectorList | null }`, so root and
   * limit are structurally distinct and a root containing any syntax at all —
   * `(.a[data-x=")"])` — arrives already parsed.
   *
   * This replaces a scan that balanced parentheses over `csstree.generate()`
   * output. That scan had two defects with one cause: it truncated a root whose
   * attribute value contained `)`, and it could not tell `@scope (root)` from
   * `@scope to (limit)` without a prefix heuristic. Both were serialized-text
   * problems invented on top of an AST that already answered the question. An
   * earlier reply on this PR claimed no `Scope` node exists in 3.2.1; that was
   * wrong, and it was wrong because only `prelude.type` and `generate()` were
   * inspected, never the prelude's children.
   *
   * `limit` is deliberately unread: it bounds where the scope ENDS, which can
   * only narrow what the rules inside match, and narrower is the safe direction
   * for a collector that collects broadly and rejects narrowly.
   */
  function scopeRoot(atrule) {
    if (!atrule.prelude) return null;
    let scope = null;
    csstree.walk(atrule.prelude, {
      enter(node) {
        if (node.type === 'Scope') scope = node;
      },
    });
    if (!scope || scope.root?.type !== 'SelectorList') return null;
    return scope.root.children.toArray();
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
    // Decoded, and only for standard properties: `f\6f nt-size` is a real
    // `font-size` that css-tree stores in its source spelling, while a custom
    // property is case-sensitive and its name is its identity (Codex, PR #973).
    const declarationsOf = (nodes) =>
      nodes.map((child) => ({
        property: child.property.startsWith('--')
          ? child.property
          : csstree.ident.decode(child.property).toLowerCase(),
        // `!important` is carried INTO the value rather than dropped. css-tree
        // stores the priority separately, so `background-color: currentcolor
        // !important` normalised to the allowed `currentcolor` and passed the
        // exact variant check while shipping a different cascade priority
        // (Codex, PR #973). Every VARIANTS pattern is anchored `^…$`, so
        // appending it makes the rule fail rather than needing its own
        // assertion — a variant may say what its fill IS, not how hard it
        // fights for it.
        value: `${csstree.generate(child.value).trim()}${child.important ? ' !important' : ''}`,
      }));
    const entry = (selector, declarations, conditional) => {
      const { names, anyClass, excludesMark } = classesIn(selector);
      return {
        selector: csstree.generate(selector),
        classes: names,
        anyClass,
        excludesMark,
        subject: subjectClassNames(selector),
        subjectAnyClass: subjectAnyClass(selector),
        bare: bareTarget(selector),
        before: targetsBefore(selector),
        declarations,
        conditional,
      };
    };
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
    // Parallel to `atRules`: did this at-rule push an `enclosing` frame?
    const scoped = [];
    csstree.walk(ast, {
      enter(node) {
        if (node.type === 'Atrule') {
          atRules.push(csstree.ident.decode(node.name).toLowerCase());
          // One frame per at-rule, so the pops stay in lockstep with atRules.
          scoped.push(false);
          // Declarations sitting DIRECTLY inside a group rule that is itself
          // inside a style rule belong to the enclosing selectors, under the
          // group's condition: `.state-marker--shipped::before { @media (…) {
          // padding: 9px } }`. css-tree stores them under the `Atrule` block,
          // so the outer rule reads as empty and no conditional rule is created
          // for them at all — the declaration checks and the conditional-mark
          // check both pass on a real override (Codex, PR #973).
          // `@scope (<root>)` establishes an enclosing selector for the rules
          // inside it, exactly as a style rule does for nested ones — so its
          // root joins the same stack and `:scope` resolves against it.
          if (csstree.ident.decode(node.name).toLowerCase() === 'scope') {
            // A rootless `@scope` — `@scope to (.limit)`, or `@scope` bare — is
            // VALID CSS with an IMPLICIT root, not an unreadable one. It used to
            // be reported unreadable because a text scan could not tell a root
            // from a limit; the `Scope` node distinguishes them, so the honest
            // answer is "there is no explicit root to resolve `:scope` against"
            // and the rules inside are analysed on their own selectors.
            const root = scopeRoot(node);
            if (root === null) return;
            enclosing.push(root);
            scoped[scoped.length - 1] = true;
            return;
          }
          const grouped = (node.block?.children.toArray() ?? []).filter(
            (child) => child.type === 'Declaration',
          );
          if (!grouped.length || !enclosing.length) return;
          const conditional = atRules.some((name) => !UNCONDITIONAL_AT_RULES.has(name));
          for (const selector of enclosing[enclosing.length - 1]) {
            rules.push(entry(selector, declarationsOf(grouped), conditional));
          }
          return;
        }
        if (node.type !== 'Rule') return;
        const conditional = atRules.some((name) => !UNCONDITIONAL_AT_RULES.has(name));
        if (node.prelude.type !== 'SelectorList') {
          unreadable.push(csstree.generate(node.prelude));
          enclosing.push([]);
          return;
        }
        const declarations = declarationsOf(
          node.block.children.toArray().filter((child) => child.type === 'Declaration'),
        );
        const parents = enclosing.length ? enclosing[enclosing.length - 1] : [];
        const resolved = [];
        for (const selector of node.prelude.children) {
          for (const parent of parents.length ? parents : [null]) {
            resolved.push(resolveNesting(selector, parent));
          }
        }
        for (const selector of resolved) rules.push(entry(selector, declarations, conditional));
        enclosing.push(resolved);
      },
      leave(node) {
        if (node.type === 'Atrule') {
          atRules.pop();
          if (scoped.pop()) enclosing.pop();
        } else if (node.type === 'Rule') enclosing.pop();
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
   * Every `::before` rule whose SUBJECT carries one class — the rules that
   * create that element's mark.
   *
   * Ownership of a pseudo-element belongs to the compound the selector
   * subjects, and to nothing else in the selector. This keyed on "the class
   * appears anywhere" for several rounds, which is a different question, and
   * every difference between the two was a false failure on correct CSS:
   *
   *   `.project-card:has(.state-marker--shipped) .title::before` styles a TITLE;
   *   `.state-marker--shipped ~ .note::before` styles a SIBLING;
   *   `.resume .state-marker--shipped .icon::before` styles a DESCENDANT.
   *
   * None of them touches a mark, and all three were rejected as narrowing one.
   * `subjectClassNames` already answered the ownership question correctly, with
   * polarity and functional-selector handling; this is `targeting()` asking it
   * rather than keeping a second, looser notion of the same thing.
   *
   * Broad collection was the right call while the subject was computed by
   * string manipulation — reading "the last compound" out of selector text was
   * itself a hole twice. It is not a string question any more.
   *
   * Scoped to `::before` deliberately. The mark IS a pseudo-element; the status
   * element carries the word and each surface legitimately styles it, so
   * policing the element in general would assert a rule the vocabulary does not
   * have. A modifier is the exception and has `modifierElementDeclarations`.
   */
  function targeting(className, rules = screenRules()) {
    return rules.filter(
      (rule) =>
        rule.before &&
        !rule.excludesMark &&
        (rule.subjectAnyClass || rule.subject.includes(className)),
    );
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
      .filter(
        (rule) =>
          rule.subjectAnyClass || rule.subject.some((name) => MODIFIER_CLASSES.includes(name)),
      )
      .flatMap((rule) =>
        rule.declarations.map(
          ({ property, value }) => `${rule.selector} { ${property}: ${value} }`,
        ),
      );

  const properties = (declarations) =>
    declarations.map((declaration) => declaration.property).sort();

  /**
   * One property's whole value, following the cascade: the LAST declaration
   * wins, as it does in the browser.
   *
   * This used to return null unless the property was declared exactly once,
   * which turned every duplicate into a `null` that failed the value matcher
   * with a message about the wrong thing — "the mark box is not border-box"
   * when the box-sizing was fine and merely declared twice. Two ordinary
   * situations produce that: a fallback pair
   * (`background-color:#000;background-color:currentcolor`), and
   * `readBuiltStylesheet()` concatenating every emitted chunk, which is safe
   * for the substring matchers in other suites and not for a file that counts.
   *
   * Duplication is still a defect here — it is just reported as itself, by
   * `expectDeclaredOnce` below, rather than smuggled through a value matcher.
   */
  function valueOf(declarations, property) {
    const matches = declarations.filter((declaration) => declaration.property === property);
    return matches.length ? matches[matches.length - 1].value : null;
  }

  /** No property may be declared twice across the rules collected for a class. */
  function expectDeclaredOnce(className, declarations) {
    const seen = new Map();
    for (const { property } of declarations) seen.set(property, (seen.get(property) ?? 0) + 1);
    expect(
      [...seen].filter(([, count]) => count > 1).map(([property]) => property),
      `${className} declares a property more than once across the rules that target it — ` +
        'either the stylesheet carries a fallback pair, or the build emitted the same rule in ' +
        'more than one chunk and readBuiltStylesheet() concatenated them',
    ).toEqual([]);
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
    // Asked of the parsed selector rather than of its serialization. Comparing
    // text needed a regex built from the class name — escaping one
    // metacharacter is the incomplete-sanitization shape CodeQL objects to as a
    // technique (alert 28) — so it compared against the two literal spellings
    // instead, and then rejected every OTHER valid spelling of the same bare
    // selector. `bareTarget` answers the question the check actually has.
    for (const rule of targeting(className)) {
      expect(
        rule.bare,
        `${rule.selector} qualifies the mark; geometry and fill belong to the bare ` +
          '.state-marker primitive, not to one surface',
      ).toBe(className);
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
    expectDeclaredOnce(MARK_PRIMITIVE, base);
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
    // nothing and pass (CodeRabbit, PR #964).
    //
    // Stated as the CLOSED set the primitive may declare, not as a list of the
    // fills it may not. The prefix filter this replaces named `background*` and
    // `padding` and claimed to close the family — it did not:
    // `box-shadow: inset 0 0 0 1em currentcolor` fills every mark solid,
    // collapsing all four states into the SHIPPED shape, and passed every check
    // in this file. So did `mask-image` and `outline`. That is the same
    // list-of-past-mistakes shape the variant rules were closed against, left
    // standing on the one rule that reaches all four states at once.
    const ALLOWED_ON_BASE = [
      'content',
      'flex',
      'box-sizing',
      'width',
      'height',
      'border',
      'display',
      'vertical-align',
    ];
    expect(
      properties(base).filter((name) => !ALLOWED_ON_BASE.includes(name)),
      'the base mark rule declares something outside the geometry the primitive owns — ' +
        'anything it declares reaches all four states at once, so a fill or a shadow here ' +
        'collapses the vocabulary into one shape',
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
      expectDeclaredOnce(className, body);

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

    // A call whose extent cannot be bounded at all is the one thing the scanner
    // still reports as a failure, because it means no literal inside it was
    // read and the file's contribution is unknown rather than empty. Every
    // OTHER ambiguity is reconciled by the containment below rather than
    // failing here — see the note at the top of the scanner for why a lint on
    // "this argument is not a literal" could not tell a dynamic surface from a
    // mis-split one, and so failed on correct code.
    expect(
      sites.filter((site) => !site.readable).map((site) => site.file),
      'a stateMarkerClass() call could not be bounded, so no literal in it was read',
    ).toEqual([]);

    const declared = new Set(sites.flatMap((site) => site.classes));
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

    // The load-bearing containment, and the reason the scanner is allowed to be
    // a lexer rather than a parser: every surface class that actually reaches a
    // rendered mark must also be named at a call site. A literal the tokenizer
    // misses fails HERE, by name, instead of silently shrinking the alias set.
    //
    // The residue is bounded by construction rather than by more grammar: a
    // surface that renders nowhere has no element for a `::before` override to
    // reach, so it can only become live by starting to render — at which point
    // this fires.
    //
    // The reverse containment is deliberately NOT asserted. A declared surface
    // that renders on no page is ordinary — a status no project currently
    // holds renders no mark — so requiring it would fail on correct code.
    expect(
      [...rendered].filter((alias) => !declared.has(alias)).sort(),
      'a surface class renders on a mark but is named at no stateMarkerClass() call site — ' +
        'either a call site was missed by the source scan, or the class is applied somewhere ' +
        'that bypasses the shared helper',
    ).toEqual([]);

    // The same ownership contract the print cascade is held to, applied here.
    // One invariant, two media — the only difference is which properties the
    // primitive may declare, and on screen that is left to the declaration
    // checks above rather than restated.
    expectCascadeOwnership(allRules(), { medium: 'screen' });
  });

  /**
   * The ownership invariant, stated once and applied to both cascades.
   *
   * The mark is `.state-marker::before` and belongs to the primitive. Nobody —
   * no surface, no modifier, no medium — may narrow it. Print used to have a
   * separate, weaker contract: § declarations stripped `@media print` before
   * parsing and § print fidelity only inspected rules declaring
   * `print-color-adjust`, so an override inside a print block was invisible to
   * both. Print is the medium the résumé PDF renders in, so that gap mattered
   * more than a screen one, not less.
   *
   * The only difference between the two cascades is which properties the bare
   * primitive may declare, which is a statement about what each medium NEEDS
   * rather than a second contract.
   *
   * Scoped to `::before` for the reason `targeting()` is: the status ELEMENT is
   * the surface's, and a surface legitimately restyles its own label on paper —
   * `.resume-entry__status` really is in the print block.
   */
  function expectCascadeOwnership(rules, { medium, allowedOnPrimitive }) {
    const policed = [...MARK_CLASSES, ...surfaceAliases()];
    // The same predicate `targeting()` uses, so ownership means one thing in
    // both cascades — including the exclusions: a selector that negates the
    // primitive cannot match a mark, and a class that is not the subject does
    // not own the pseudo-element.
    const touching = policed.flatMap((name) => targeting(name, rules));

    expect(
      touching.filter((rule) => !MARK_CLASSES.includes(rule.bare)).map(({ selector }) => selector),
      `a lifecycle mark is narrowed in the ${medium} cascade; the mark is ` +
        '.state-marker::before and belongs to the primitive, not to one surface or one state',
    ).toEqual([]);

    if (allowedOnPrimitive) {
      expect(
        touching.flatMap((rule) =>
          rule.declarations
            .map(({ property }) => property)
            .filter((property) => !allowedOnPrimitive.includes(property)),
        ),
        `the ${medium} cascade declares something on the mark beyond what that medium needs`,
      ).toEqual([]);
    }

    // The element side of the same invariant: a modifier owns nothing there.
    expect(
      modifierElementDeclarations(rules),
      `a lifecycle modifier declares something on the status element in the ${medium} cascade`,
    ).toEqual([]);
  }

  it('gives the mark to the primitive in the print cascade too', () => {
    const printed = analyze(builtPrintBlocks().join('\n')).rules;

    // Control first: the print cascade really does carry the primitive's rule,
    // so an empty offender list means "nothing else", not "nothing read".
    expect(
      printed.filter((rule) => rule.before && rule.classes.includes(MARK_PRIMITIVE)).length,
      'the print cascade carries no lifecycle mark rule at all, so the scan is vacuous',
    ).toBeGreaterThan(0);

    expectCascadeOwnership(printed, {
      medium: 'print',
      // Exactly what #950 needs on paper, and nothing else. Geometry and fill
      // belong to the screen cascade, where every other check can see them.
      allowedOnPrimitive: ['print-color-adjust', '-webkit-print-color-adjust'],
    });
  });

  it('has no rendered modifier class the vocabulary cannot emit', () => {
    // The rendered half of the closed vocabulary. A `state-marker--*` on a
    // real element that STATUS_MARKER cannot emit used to be filtered out on
    // the way to the surface list and vanish from the inventory entirely —
    // neither policed as a modifier nor policed as a surface.
    const { unknownModifiers, surfaces } = renderedClassInventory();
    expect(
      [...unknownModifiers].map(([name, route]) => `${name} (first seen on ${route})`),
      'a rendered lifecycle element carries a state-marker--* class STATUS_MARKER cannot emit — ' +
        'either a modifier was renamed and a surface still applies the old one, or it is ' +
        'misspelled and that element renders as the bare outline',
    ).toEqual([]);

    // Controls, both directions: the walk does see modifiers (or the emptiness
    // above is vacuous), and it does not sweep surfaces into that bucket.
    expect(
      [...surfaces],
      'no surface class was seen on any rendered mark, so the scan above is vacuous',
    ).not.toEqual([]);
    expect(
      [...surfaces].filter((name) => name.startsWith(`${MARK_PRIMITIVE}--`)),
      'a modifier class was classified as a surface',
    ).toEqual([]);
  });

  it('has no stylesheet modifier class the vocabulary cannot emit', () => {
    // `STATUS_MARKER` is the closed source of modifiers, so any other
    // `.state-marker--*` in the stylesheet is either a typo for a real one — in
    // which case that state silently lost its fill and renders as the bare
    // outline — or dead CSS shipped to every reader. Neither is caught by the
    // per-variant checks, which only ever look up the modifiers they expect
    // (Codex, PR #973).
    const emitted = new Set(MODIFIER_CLASSES);
    const rogue = new Set();
    for (const rule of allRules()) {
      for (const name of rule.classes) {
        if (name.startsWith(`${MARK_PRIMITIVE}--`) && !emitted.has(name)) rogue.add(name);
      }
    }
    expect(
      [...rogue].sort(),
      'a .state-marker--* class appears in the stylesheet that STATUS_MARKER cannot emit — ' +
        'either a modifier was renamed and its rule left behind, or a variant is misspelled ' +
        'and that state now renders as the bare outline',
    ).toEqual([]);

    // The control: the walk does reach modifier classes, so an empty rogue set
    // means "none unknown", not "none seen".
    expect(
      allRules()
        .flatMap((rule) => rule.classes)
        .filter((name) => emitted.has(name)),
      'no known modifier class was seen anywhere, so the rogue scan is vacuous',
    ).not.toEqual([]);
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
      // Nor this one. A nested rule has no selector of its own in the flat
      // text, so a top-level `{...}` scan never reached it — and the second
      // form is the one that survived the first fix, because the modifier is on
      // the OUTER rule and the `::before` on the inner, so neither half names
      // both (Codex, PR #973).
      'CSS nesting': '.resume{color:red;& .state-marker--shipped::before{padding:9px}}',
      'a nested rule two deep': '.resume{& .card{& .state-marker--shipped::before{padding:9px}}}',
      // The same targeting written as an attribute rather than a class, which a
      // ClassSelector-only walk does not see at all (Codex, PR #973). The two
      // exact matchers name their class literally; the predicate forms are
      // treated as matching anything, so they are collected too.
      'a class-token attribute selector': '[class~="state-marker--shipped"]::before{padding:9px}',
      // A COMPLETE class value: `=` matches the whole attribute, and a rendered
      // mark always carries the primitive alongside its modifier.
      'an exact class attribute selector':
        '[class="state-marker state-marker--shipped"]::before{padding:9px}',
      'a substring class attribute selector': '[class*="state-marker--"]::before{padding:9px}',
      // Unquoted, so css-tree hands back an `Identifier` whose name keeps its
      // escapes — the fourth identifier kind in this file to need decoding
      // (CodeRabbit, PR #973). The escaped space in the exact form decodes to a
      // real one, which is why the operand is decoded BEFORE it is split.
      'an unquoted class-token attribute selector':
        '[class~=state\\-marker\\-\\-shipped]::before{padding:9px}',
      'an unquoted exact class attribute selector':
        '[class=state\\-marker\\ state\\-marker\\-\\-shipped]::before{padding:9px}',
      // The `i` flag makes the match case-insensitive, so an uppercase operand
      // selects the lowercase class the vocabulary emits.
      'a case-insensitive class attribute selector':
        '[class~="STATE-MARKER--SHIPPED" i]::before{padding:9px}',
      // The flag is an identifier too, so it can be escaped like any other.
      'an escaped case-insensitive flag':
        '[class~="STATE-MARKER--SHIPPED" \\69]::before{padding:9px}',
    };

    for (const [shape, css] of Object.entries(QUALIFIED)) {
      it(`collects a mark override behind ${shape}`, () => {
        const { rules, unreadable, errors } = analyze(PRIMITIVE + css);
        expect(errors, 'the fixture did not parse').toEqual([]);
        expect(unreadable, 'the fixture prelude did not parse').toEqual([]);
        // The same predicate `targeting()` uses, so a shape that names the
        // class only through a class-attribute predicate counts too.
        const qualified = rules
          .filter(
            (rule) =>
              rule.before && (rule.anyClass || rule.classes.includes('state-marker--shipped')),
          )
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

    it('attributes a nested group rule to the selectors it sits inside', () => {
      // Valid nesting puts declarations directly inside a group rule:
      // `.state-marker--shipped::before { @media (…) { padding: 9px } }`.
      // css-tree stores them under the `Atrule` block, so the outer rule reads
      // as empty and no conditional rule is created for them either — the
      // declaration checks and the conditional-mark check both passed on a real
      // override (Codex, PR #973).
      const { rules, errors } = analyze(
        `${PRIMITIVE}.state-marker--shipped::before{@media (min-width:700px){padding:9px}}`,
      );
      expect(errors, 'the fixture did not parse').toEqual([]);
      const grouped = rules.filter(
        (rule) =>
          rule.conditional &&
          rule.before &&
          rule.classes.includes('state-marker--shipped') &&
          rule.declarations.some(({ property }) => property === 'padding'),
      );
      expect(
        grouped.map(({ selector }) => selector),
        'a declaration inside a nested group rule was attributed to nothing',
      ).toEqual(['.state-marker--shipped::before']);
    });

    it('reaches the subject inside an nth-child selector list', () => {
      // `:nth-child(1 of .state-marker--shipped)` selects an element that
      // carries the modifier, but css-tree puts the list under an `Nth` node
      // rather than beside the pseudo's own children, so a direct-child walk
      // found nothing and the rule got an empty subject (Codex, PR #973).
      const subjects = (css) => analyze(css).rules.map((rule) => rule.subject);
      for (const pseudo of ['nth-child', 'nth-last-child']) {
        expect(
          subjects(`:${pseudo}(1 of .state-marker--shipped){font-size:1.1em}`)[0],
          `a modifier inside :${pseudo}() was not read as the subject`,
        ).toContain('state-marker--shipped');
      }
      // And the attribute forms of the same thing.
      expect(
        subjects('[class~="state-marker--shipped"]{font-size:1.1em}')[0],
        'a class-token attribute selector was not read as the subject',
      ).toContain('state-marker--shipped');
      expect(
        analyze('[class*="state-marker--"]{font-size:1.1em}').rules[0].subjectAnyClass,
        'a predicate over the class attribute was not treated as possibly-a-modifier',
      ).toBe(true);
      expect(
        analyze('.resume-entry__status{font-size:7.5pt}').rules[0].subjectAnyClass,
        'a plain surface class was treated as a class-attribute predicate',
      ).toBe(false);
    });

    it('does not read an exact class value that cannot match a mark as targeting one', () => {
      // The other direction of the same matcher. `[class="p-status"]` selects
      // an element whose class attribute is EXACTLY `p-status`, and a rendered
      // lifecycle element always carries `state-marker` too — so that selector
      // cannot match a mark and is styling something else. Reading the operand
      // token-wise rejected it as a surface override: a false failure, and the
      // worse direction (Codex, PR #973).
      const targets = (css, className) =>
        analyze(css).rules.filter(
          (rule) => rule.before && (rule.anyClass || rule.classes.includes(className)),
        ).length;
      expect(
        targets('[class="p-status"]::before{padding:9px}', 'p-status'),
        'an exact class value that cannot carry a mark was read as a surface override',
      ).toBe(0);
      expect(
        targets('[class="p-status state-marker"]::before{padding:9px}', 'p-status'),
        'an exact class value that CAN carry a mark was not read as a surface override',
      ).toBe(1);
      // `~=` is unaffected: it matches one token among many.
      expect(
        targets('[class~="p-status"]::before{padding:9px}', 'p-status'),
        'a class-token attribute selector on a surface was not collected',
      ).toBe(1);
    });

    it('tracks polarity through nested negations', () => {
      // `:not(:not(.x))` REQUIRES `.x`. Skipping `:not()` wholesale recorded
      // the subject as `p-status` alone and let a state-specific element
      // declaration through (Codex, PR #973).
      const subjects = (css) => analyze(css).rules.map((rule) => rule.subject);
      expect(
        subjects('.p-status:not(:not(.state-marker--shipped)){font-size:1.1em}')[0],
        'a double negation was not read as requiring the modifier',
      ).toContain('state-marker--shipped');
      // And one level of negation still excludes, as before.
      expect(
        subjects('.p-status:not(.state-marker--shipped){font-size:1.1em}')[0],
        'a single negation was read as requiring the modifier',
      ).not.toContain('state-marker--shipped');
      expect(
        subjects('.p-status:not(:not(:not(.state-marker--shipped))){font-size:1.1em}')[0],
        'a triple negation was read as requiring the modifier',
      ).not.toContain('state-marker--shipped');
      // Composed with a functional selector, which is where the first version
      // of this went wrong: a walk for every descendant `SelectorList` reached
      // the inner `:not()`'s list and processed it at the OUTER polarity, so a
      // behaviour-preserving wrapper around an explicitly-allowed selector was
      // rejected (Codex, PR #973).
      expect(
        subjects(':is(.p-status:not(.state-marker--shipped)){font-size:1.1em}')[0],
        'a negation nested inside :is() was read at the wrong polarity',
      ).not.toContain('state-marker--shipped');
      expect(
        subjects(':is(.p-status:not(:not(.state-marker--shipped))){font-size:1.1em}')[0],
        'a double negation nested inside :is() was not read as requiring the modifier',
      ).toContain('state-marker--shipped');
      expect(
        subjects(':not(:is(.state-marker--shipped)){font-size:1.1em}')[0],
        ':is() nested inside :not() was read as requiring the modifier',
      ).not.toContain('state-marker--shipped');
    });

    it('resolves :scope against its @scope root', () => {
      // `@scope (<root>) { :scope::before { … } }` names no modifier class in
      // the inner rule, so the collector saw nothing at all (Codex, PR #973).
      // `:scope` is `&` in different syntax, and the root joins the same
      // enclosing stack a style rule uses for nesting.
      const { rules, errors, unreadable } = analyze(
        `${PRIMITIVE}@scope (.state-marker--shipped){:scope::before{padding:9px}}`,
      );
      expect(errors, 'the fixture did not parse').toEqual([]);
      expect(unreadable, 'the scope root was not readable').toEqual([]);
      // Like the `&::before` nesting case, resolving produces the BARE
      // selector, so `expectUnqualified` accepts it and the declaration checks
      // are what reject the stray geometry.
      const scoped = rules.filter(
        (rule) => rule.before && rule.classes.includes('state-marker--shipped'),
      );
      expect(
        scoped.map(({ selector }) => selector),
        'a :scope override inside @scope was not attributed to its root',
      ).toEqual(['.state-marker--shipped::before', '.state-marker--shipped::before']);
      expect(
        scoped.flatMap((rule) => rule.declarations.map(({ property }) => property)).sort(),
        'the scoped declaration was not attributed to the mark',
      ).toEqual(['background-color', 'padding']);
      // A scope root the extractor cannot read is reported, not treated as an
      // absent one — an at-rule whose root is unknown must not quietly become
      // an unscoped rule.
      // A rootless @scope is valid CSS with an implicit root, so it is not an
      // error — there is simply no explicit root for `:scope` to resolve
      // against, and the rules inside stand on their own selectors.
      for (const rootless of [
        '@scope { :scope::before { padding: 9px } }',
        '@scope to (.state-marker--shipped) { .card::before { content: "x" } }',
      ]) {
        expect(analyze(rootless).unreadable, `${rootless} was reported unreadable`).toEqual([]);
        expect(
          analyze(rootless).rules.filter((rule) => rule.subject.includes('state-marker--shipped'))
            .length,
          `${rootless} resolved a selector against its limit`,
        ).toBe(0);
      }

      // `@scope` narrows by DOM position, not by viewport, so its rules must
      // reach the UNCONDITIONAL set — otherwise `screenRules()` drops them and
      // the fill and geometry checks never see a scoped override at all.
      expect(
        analyze(`${PRIMITIVE}@scope (.state-marker--shipped){:scope::before{padding:9px}}`)
          .rules.filter((rule) => rule.before && rule.classes.includes('state-marker--shipped'))
          .every((rule) => rule.conditional === false),
        'a rule inside @scope was classified conditional and would be dropped from screenRules()',
      ).toBe(true);

      // Both halves of the prelude are optional, and `to (…)` is the LIMIT.
      // Reading it as the root rewrote `:scope` against the wrong selector and
      // rejected a rule targeting the implicit root.
      // `to (…)` is the LIMIT. Reading it as the root rewrote `:scope` against
      // the wrong selector; the `Scope` node keeps them apart structurally.
      const rootless = analyze('@scope to (.state-marker--shipped){:scope::before{padding:9px}}');
      expect(rootless.unreadable, 'a valid rootless @scope was reported unreadable').toEqual([]);
      expect(
        rootless.rules.filter((rule) => rule.subject.includes('state-marker--shipped')).length,
        'a rootless @scope resolved :scope against its limit',
      ).toBe(0);

      // A root carrying syntax that a paren-balancing text scan truncates. The
      // AST hands it back parsed, so there is nothing to balance.
      const awkward = analyze(
        `${PRIMITIVE}@scope (.state-marker--shipped[data-x=")"]){:scope::before{padding:9px}}`,
      );
      expect(awkward.errors, 'the fixture did not parse').toEqual([]);
      expect(awkward.unreadable, 'a root containing ) was reported unreadable').toEqual([]);
      expect(
        awkward.rules
          .filter((rule) => rule.before && rule.classes.includes('state-marker--shipped'))
          .map(({ selector }) => selector),
        'a scope root whose attribute value contains ) was truncated',
      ).toEqual(['.state-marker--shipped::before', '.state-marker--shipped[data-x=")"]::before']);

      // Neighbouring must-pass: the same awkward syntax in a root that is NOT a
      // lifecycle class must not be attributed to one.
      expect(
        analyze('@scope (.card[data-x=")"]){:scope::before{padding:9px}}').rules.filter((rule) =>
          rule.classes.includes('state-marker--shipped'),
        ).length,
        'an unrelated scope root was attributed to the lifecycle vocabulary',
      ).toBe(0);

      // And a multi-member root: `Scope.root` is a SelectorList, so both
      // members resolve rather than only the first.
      expect(
        analyze('@scope (.a, .state-marker--shipped){:scope::before{padding:9px}}').rules.filter(
          (rule) => rule.classes.includes('state-marker--shipped'),
        ).length,
        'only the first member of a multi-member scope root resolved',
      ).toBe(1);
    });

    it('reads an escaped bare selector as bare, and still checks what it declares', () => {
      // These are all valid spellings of `.state-marker--shipped::before` — a
      // BARE selector with no narrowing in it. They belong here rather than in
      // the qualified-override table above, which is where they started: the
      // qualification check compared serialized text, so it rejected every
      // spelling but the two it listed, producing a false failure on a
      // behaviour-preserving rule (Codex, PR #973).
      //
      // What must still hold is that they are collected and their declarations
      // read — the escapes must not hide the rule from the fill checks either.
      for (const [shape, css] of Object.entries({
        'an escaped class name': '.state-marker\\-\\-shipped::before{padding:9px}',
        'a hex-escaped class name': '.state-marker\\2d \\2d shipped::before{padding:9px}',
        'an escaped pseudo-element name': '.state-marker--shipped::be\\66 ore{padding:9px}',
      })) {
        const collected = analyze(css).rules.filter(
          (rule) => rule.before && rule.classes.includes('state-marker--shipped'),
        );
        expect(collected.length, `${shape} was not collected at all`).toBe(1);
        expect(collected[0].bare, `${shape} was read as qualifying the mark`).toBe(
          'state-marker--shipped',
        );
        expect(
          collected[0].declarations.map(({ property }) => property),
          `${shape} hid its declarations from the fill checks`,
        ).toEqual(['padding']);
      }
      // And the narrowing forms are still NOT bare, escaped or not.
      for (const css of [
        '.resume .state-marker--shipped::before{padding:9px}',
        '.p-status.state-marker--shipped::before{padding:9px}',
        '.state-marker\\-\\-shipped:hover::before{padding:9px}',
      ]) {
        expect(analyze(css).rules[0].bare, `${css} was read as bare`).not.toBe(
          'state-marker--shipped',
        );
      }
    });

    it('tokenizes one lexical rule for every consumer of it', () => {
      // The tokenizer is the single lexical rule three things now derive from:
      // where call sites may be found, where a call ends, and which literals it
      // names. Asserted through the CONSUMERS rather than on span shapes, since
      // that is what the divergence between three hand-written scanners cost.
      const spanKinds = (source) => {
        const kinds = [];
        scanJs(source, (kind, from, to) => kinds.push([kind, source.slice(from, to)]));
        return kinds;
      };

      // Total coverage: every character is reported exactly once, in order. A
      // gap here is how a scanner silently skips a region.
      for (const source of [
        "const a = 'x'; // c",
        'const t = `a${ f(`d${e}f`) }c`;',
        "throw /a,b/.test(v) ? 'S' : s",
        '`unterminated',
        "<dt>Nathan's topics</dt>\nclass={x}",
      ]) {
        let at = 0;
        scanJs(source, (kind, from, to) => {
          expect(from, `span gap or overlap in ${JSON.stringify(source)}`).toBe(at);
          at = to;
        });
        expect(at, `span walk stopped early on ${JSON.stringify(source)}`).toBe(source.length);
      }

      // A regex is a regex after punctuation AND after a keyword; a division is
      // still a division. The keyword list is a lexical fact, so the must-pass
      // neighbour matters as much as the rejecting case.
      for (const keyword of ['return', 'throw', 'yield', 'instanceof', 'typeof', 'case']) {
        expect(
          spanKinds(`${keyword} /a,b/.test(v)`).some(
            ([kind, text]) => kind === 'regex' && text === '/a,b/',
          ),
          `a regex after ${keyword} was not lexed`,
        ).toBe(true);
      }
      expect(
        spanKinds('total / count / 2').every(([kind]) => kind === 'code'),
        'a division was lexed as a regex',
      ).toBe(true);
      expect(
        spanKinds('doReturn / count').every(([kind]) => kind === 'code'),
        'an identifier ending in a keyword was read as expression position',
      ).toBe(true);
    });

    it('bounds a call the same way wherever the lexer is used', () => {
      // `matchingParen` counts parentheses in CODE spans only, so the same
      // tokenizer that hides a `(` from the masker hides it here. Before that,
      // the two disagreed and a regex character class unbalanced the call.
      const bounded = (call) => {
        const open = call.indexOf('(');
        const close = matchingParen(call, open);
        return close === call.length - 1;
      };
      for (const call of [
        "stateMarkerClass(/[(]/.test(v) ? 'SHIPPED' : s, 'p-status')",
        "stateMarkerClass(f('('), 'p-status')",
        'stateMarkerClass(/* ) */ s, `p-status`)',
        "stateMarkerClass(throw /[)]/.test(v) ? a : b, 'p-status')",
      ]) {
        expect(bounded(call), `call not bounded: ${call}`).toBe(true);
      }
      // Must-pass neighbour: a genuinely unterminated call is still reported.
      expect(matchingParen('stateMarkerClass(s, ', 16), 'an unbounded call was bounded').toBe(-1);
    });

    it('names surfaces by the closed status vocabulary, not by argument position', () => {
      const surfaces = (call) => readSurfaceArguments(call).classes.sort();

      // The reported forms. Position is not consulted, so a regex, a comment or
      // a conditional in the status expression cannot fabricate a boundary.
      expect(surfaces("stateMarkerClass(status, 'p-status')")).toEqual(['p-status']);
      expect(surfaces('stateMarkerClass(status, "p-status")')).toEqual(['p-status']);
      expect(surfaces('stateMarkerClass(status, `p-status`)')).toEqual(['p-status']);
      expect(surfaces("stateMarkerClass(status, 'post-meta project-status')")).toEqual([
        'post-meta',
        'project-status',
      ]);
      expect(surfaces("stateMarkerClass(statusOf(slug), 'p-status')")).toEqual(['p-status']);
      expect(surfaces("stateMarkerClass(/a,b/.test(v) ? 'SHIPPED' : s, 'p-status')")).toEqual([
        'p-status',
      ]);
      expect(surfaces("stateMarkerClass(throw /a,b/.test(v) ? 'SHIPPED' : s, 'p-status')")).toEqual(
        ['p-status'],
      );
      expect(
        surfaces("stateMarkerClass((v) => /a,b/.test(v) ? 'SHIPPED' : s, 'p-status')"),
      ).toEqual(['p-status']);
      expect(surfaces("stateMarkerClass(`${x}`, 'p-status')")).toEqual(['p-status']);

      // A literal STATUS word is not a surface, wherever it sits. This is what
      // replaces argument position, so it needs its own must-pass neighbour:
      // a class whose name merely resembles a status still counts.
      expect(surfaces("stateMarkerClass('SHIPPED', 'p-status')")).toEqual(['p-status']);
      expect(surfaces("stateMarkerClass('IN PROGRESS', 'p-status')")).toEqual(['p-status']);
      expect(surfaces("stateMarkerClass(s, 'shipped')")).toEqual(['shipped']);

      // A dynamic surface argument is no longer an error — it contributes
      // nothing here and is caught by rendered-subset-declared if it ships.
      expect(surfaces('stateMarkerClass(status, surfaceClass)')).toEqual([]);
      expect(readSurfaceArguments('stateMarkerClass(status, surfaceClass)').readable).toBe(true);
    });

    it('finds call sites only where code is', () => {
      const found = (source) =>
        [...withoutCommentsOrStrings(source).matchAll(/\bstateMarkerClass\s*\(/g)].length;
      // Quoted or commented helper text is not an invocation.
      expect(found(`const e = "stateMarkerClass(s, x)";`), 'quoted text read as a call').toBe(0);
      expect(
        found('// stateMarkerClass(s, x)\nconst a = 1;'),
        'commented text read as a call',
      ).toBe(0);
      expect(found('/* stateMarkerClass(s, x) */'), 'block comment read as a call').toBe(0);
      // Must-pass neighbours: real calls, including inside an interpolation and
      // on a line that also carries a string containing a paren.
      expect(found("const c = stateMarkerClass(s, 'p-status');"), 'a real call was masked').toBe(1);
      expect(found('const c = `${stateMarkerClass(s, "p-status")}`;'), 'interpolated call').toBe(1);
      expect(
        found(`const s = "x)"; const c = stateMarkerClass(s, 'p');`),
        'call after string',
      ).toBe(1);
      // Offsets survive masking, so a call is found where it actually sits.
      const mixed = `/* note */ stateMarkerClass(s, 'p-status')`;
      expect(withoutCommentsOrStrings(mixed).indexOf('stateMarkerClass(')).toBe(
        mixed.indexOf('stateMarkerClass('),
      );
      // And an apostrophe in markup does not swallow the line after it.
      const prose = `<dt>Nathan's topics</dt>\nclass={stateMarkerClass(s, 'p-status')}`;
      expect(found(prose), 'an apostrophe in prose ate the call below it').toBe(1);
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
  });
});
