import { readBuiltStylesheet } from './dom.js';

/**
 * Reading `@media print` rules out of the emitted stylesheet.
 *
 * These assertions read the built CSS rather than a rendered artifact, because
 * the path most print rules exist for — a reader pressing Cmd-P — produces no
 * artifact to read. The résumé PDF is the only printed output this repo
 * builds, and the generator writes it with `printBackground: true`, which
 * paints backgrounds whether or not the stylesheet asks for them; see
 * tests/helpers/pdf-oracle.js § lifecycleMarkSignaturesPerPage for why that makes
 * the file blind to exactly the rules asserted here.
 *
 * Lifted out of tests/resume.test.js in #950, when a second test file needed
 * the same parser. The block extractor is the part worth sharing: a stylesheet
 * carries several `@media print` blocks (the blog's #622 rules, the résumé's
 * #420 cascade, the lifecycle primitive's #950 rule), so anything that slices
 * at the FIRST one silently stops guarding every line after it.
 *
 * Reading the build is `dom.js`'s job, not this module's — `readBuiltStylesheet`
 * already concatenates every emitted chunk and turns a missing build into an
 * error that names the fix.
 */

/**
 * `[from, to)` offsets of every balanced `@media print { ... }` block in `css`.
 *
 * @param {string} css
 * @returns {[number, number][]}
 */
export function printBlockRanges(css) {
  const ranges = [];
  let i = css.indexOf('@media print');
  while (i !== -1) {
    let depth = 0;
    const start = css.indexOf('{', i);
    for (let j = start; j < css.length; j++) {
      if (css[j] === '{') depth++;
      else if (css[j] === '}' && --depth === 0) {
        ranges.push([i, j + 1]);
        break;
      }
    }
    i = css.indexOf('@media print', i + 1);
  }
  return ranges;
}

/**
 * Every `@media print` block in `css`, as text.
 *
 * @param {string} css
 * @returns {string[]}
 */
export function printBlocks(css) {
  return printBlockRanges(css).map(([from, to]) => css.slice(from, to));
}

/**
 * `css` with every `@media print` block cut out — i.e. everything the screen
 * cascade actually sees.
 *
 * @param {string} css
 * @returns {string}
 */
export function withoutPrintBlocks(css) {
  let out = '';
  let cursor = 0;
  for (const [from, to] of printBlockRanges(css)) {
    out += css.slice(cursor, from);
    cursor = to;
  }
  return out + css.slice(cursor);
}

/** Every `@media print` block in the emitted stylesheet. */
export function builtPrintBlocks() {
  return printBlocks(readBuiltStylesheet());
}

/**
 * Every `print-color-adjust` declaration across `blocks`, one entry per
 * individual selector, as `{ selector, value }`.
 *
 * Two flattenings, and both are the point. Across **every** block, because a
 * second block added later sits behind a `.find()` and is never reached — the
 * blind spot #956 reported in the résumé residue guard. And across every
 * selector in a comma-joined list, because a selector merged into an existing
 * rule's list is invisible to a whole-block `toMatch` and is exactly how a
 * per-surface narrowing gets in without a descendant combinator to give it
 * away.
 *
 * **`value` is carried because the property alone is not the contract.**
 * Matching on `print-color-adjust: exact` and matching on the bare property
 * each miss a different regression, so this returns both halves and lets the
 * caller assert on each:
 *
 * - Collecting only `: exact` rules would make a marker flipped to `economy`
 *   read as *absent*, which a caller can still catch — its "the rule that must
 *   be there" assertion fails — but with a message about a missing rule rather
 *   than a disabled one.
 * - Collecting on the property alone, and never checking `value`, lets that
 *   same flip pass silently: the scan finds the rule, the selector is still
 *   the marker, and Chrome omits the background again. That is the gap Codex
 *   flagged on #961, and it is the one that fails open.
 *
 * So: collect on the property, so an `economy` rule anywhere in scope still
 * surfaces as residue, and assert `value` on the rule that has to be `exact`.
 *
 * The value regex anchors to a declaration boundary, so `-webkit-print-color-
 * adjust` does not satisfy it — a rule carrying only the prefixed form reports
 * an empty value and fails a caller's assertion rather than passing as though
 * the unprefixed property were present.
 *
 * Lifted here in #953, on the same trigger that lifted `printBlockRanges` in
 * #950: a second caller needed the same parser. The property is now declared
 * by three rules across two test files — the lifecycle primitive, the résumé
 * bullet marker, and the blog takeaway marker — and each file asks the same
 * question of a different subset.
 *
 * `tests/lifecycle-marker.test.js` deliberately keeps its own rule-level
 * matcher rather than calling this. It asks a narrower question — how many
 * *rules* pin the mark, and is each selector in that one rule's list the bare
 * primitive — so collapsing its rules into a flat selector list would lose the
 * rule boundary its "exactly one" assertion counts.
 *
 * @param {string[]} blocks `@media print` block texts, e.g. from `printBlocks`.
 * @returns {{selector: string, value: string}[]} in source order.
 */
export function printColorAdjustRules(blocks) {
  return blocks.flatMap((block) =>
    [...block.matchAll(/([^{}]+)\{([^{}]*print-color-adjust[^{}]*)\}/g)].flatMap((match) => {
      const declared = match[2].match(/(?:^|;)\s*print-color-adjust:\s*([^;]+)/);
      const value = declared ? declared[1].trim() : '';
      return match[1].split(',').map((selector) => ({ selector: selector.trim(), value }));
    }),
  );
}
