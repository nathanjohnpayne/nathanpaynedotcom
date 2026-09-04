import { readBuiltStylesheet } from './dom.js';

/**
 * Reading `@media print` rules out of the emitted stylesheet.
 *
 * These assertions read the built CSS rather than a rendered artifact, because
 * the path most print rules exist for — a reader pressing Cmd-P — produces no
 * artifact to read. The résumé PDF is the only printed output this repo
 * builds, and the generator writes it with `printBackground: true`, which
 * paints backgrounds whether or not the stylesheet asks for them; see
 * tests/helpers/pdf-oracle.js § filledLifecycleMarksPerPage for why that makes
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
