import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * Reading `@media print` rules out of the emitted stylesheets.
 *
 * These tests assert the print cascade from `dist/_astro/*.css` rather than
 * from a rendered artifact, because the path most of those rules exist for —
 * a reader pressing Cmd-P — produces no artifact to read. The résumé PDF is
 * the only printed output this repo builds, and it is generated with
 * `printBackground: true`, which paints backgrounds whether or not the
 * stylesheet asks for them; see tests/helpers/pdf-oracle.js
 * § filledLifecycleMarksPerPage for why that makes the file blind to exactly
 * the rules asserted here.
 *
 * Lifted out of tests/resume.test.js in #950, when a second test file needed
 * the same parser. The block extractor is the part worth sharing: a stylesheet
 * carries several `@media print` blocks (the blog's #622 rules, the résumé's
 * #420 cascade, the lifecycle primitive's #950 rule), so anything that slices
 * at the FIRST one silently stops guarding every line after it.
 */

const DIST = resolve(import.meta.dirname, '../../dist');

/** Every emitted stylesheet's source text. */
export function emittedStylesheets() {
  const astroDir = resolve(DIST, '_astro');
  if (!existsSync(astroDir)) return [];
  return readdirSync(astroDir)
    .filter((f) => f.endsWith('.css'))
    .map((f) => readFileSync(join(astroDir, f), 'utf-8'));
}

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

/** Every `@media print` block across every emitted stylesheet. */
export function allPrintBlocks() {
  return emittedStylesheets().flatMap(printBlocks);
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
