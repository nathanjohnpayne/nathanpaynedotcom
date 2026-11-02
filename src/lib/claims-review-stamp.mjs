/**
 * The bytes behind `claimsReviewed.caseStudy`, the case-study side of the
 * résumé claims-review stamp (#1165, #1514, epic #1490).
 *
 * The stamp is the SHA-256 of the case-study file as stored, with one
 * exception: its top-level `aiUse` frontmatter block is removed first. The
 * disclosure says how the page was written and makes no project claim, so
 * adding it, or later editing its statement or its own stamp, must not send
 * the résumé entry back for a claims review. Every other byte counts: the
 * body, every other frontmatter field, comments, blank lines and line endings.
 * A file without `aiUse` hashes exactly as its raw bytes, so no stamp written
 * before #1514 moved.
 *
 * What is removed: inside the opening frontmatter block only (the body is
 * never touched, even where it contains the text `aiUse:`), each line that
 * opens the top-level key (`aiUse` at column 0, unquoted, then `:` followed by
 * a space, a tab or the end of the line), and the lines nested under it, which
 * are the indented lines that follow it and any blank lines between them. The
 * block ends at the first line that starts at column 0. Blank lines after its
 * last indented line belong to whatever follows, and are kept.
 *
 * The scan works on the bytes, so it cannot re-encode anything it keeps. Its
 * result is then checked against a YAML parse: the stripped frontmatter must
 * parse to the original minus `aiUse` and nothing else, and the body must be
 * unchanged. A file the scan cannot strip exactly (a quoted `"aiUse":` key, or
 * one written in a shape the line scan misreads) throws instead of hashing
 * something nobody reviewed.
 *
 * Plain JavaScript with no Astro import, like src/lib/ai-use-stamp.mjs, whose
 * `AI_USE_FIELD` names the key and whose parser does the check.
 * tests/resume-claims-review.test.js is the one caller; see specs/resume.md
 * § Claims review.
 */
import { createHash } from 'node:crypto';
import { AI_USE_FIELD, canonicalJson, splitEntry } from './ai-use-stamp.mjs';

/**
 * The opening frontmatter block, as src/lib/ai-use-stamp.mjs and the claims
 * review test split it: anchored at the start of the file, closed by a whole
 * `---` line. Group 1 is the opening delimiter line; group 2 the YAML, up to
 * but excluding the line break before the closing delimiter.
 */
const FRONTMATTER_BLOCK = /^(---\r?\n)([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

/** A line that opens the top-level `aiUse` key. */
const AI_USE_KEY_LINE = new RegExp(`^${AI_USE_FIELD}[ \\t]*:(?:[ \\t]|\\r?$)`);

/** A line with nothing on it but spaces, tabs or a carriage return. */
const BLANK_LINE = /^[ \t]*\r?$/;

/** A line nested under the key above it: indented, with something on it. */
const NESTED_LINE = /^[ \t]+\S/;

/**
 * The byte ranges `[start, end)` of every top-level `aiUse` block in the
 * frontmatter, each ending after the line break of its last nested line.
 *
 * @param {string} text - the file decoded as latin1, so index i is byte i
 * @returns {Array<[number, number]>}
 */
function aiUseBlockRanges(text) {
  const match = FRONTMATTER_BLOCK.exec(text);
  if (!match) return [];
  const yamlStart = match[1].length;
  const yamlEnd = yamlStart + match[2].length;
  // Every frontmatter line, each with its own line break. The last one ends
  // at the break before the closing `---`, so it carries one too.
  const lines = [];
  for (let at = yamlStart; at < yamlEnd;) {
    const lf = text.indexOf('\n', at);
    const end = lf === -1 ? text.length : lf + 1;
    lines.push({ start: at, end, text: text.slice(at, end).replace(/\n$/, '') });
    at = end;
  }

  const ranges = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (!AI_USE_KEY_LINE.test(lines[i].text)) continue;
    let last = i;
    for (let j = i + 1; j < lines.length; j += 1) {
      if (NESTED_LINE.test(lines[j].text)) last = j;
      else if (!BLANK_LINE.test(lines[j].text)) break;
    }
    ranges.push([lines[i].start, lines[last].end]);
    i = last;
  }
  return ranges;
}

/**
 * The case-study bytes the stamp covers: the file exactly as stored, minus its
 * top-level `aiUse` frontmatter block. Returns `bytes` itself when there is no
 * block to remove. Throws when the removal is not exact (see the header).
 *
 * @param {Buffer} bytes - the case study file exactly as stored
 * @returns {Buffer}
 */
export function caseStudyClaimsBytes(bytes) {
  const ranges = aiUseBlockRanges(bytes.toString('latin1'));
  if (ranges.length === 0) {
    assertNoAiUse(bytes);
    return bytes;
  }

  const kept = [];
  let at = 0;
  for (const [start, end] of ranges) {
    kept.push(bytes.subarray(at, start));
    at = end;
  }
  kept.push(bytes.subarray(at));
  const stripped = Buffer.concat(kept);

  const before = splitEntry(bytes.toString('utf8'));
  const after = splitEntry(stripped.toString('utf8'));
  const { [AI_USE_FIELD]: removed, ...rest } = before.frontmatter;
  if (
    removed === undefined ||
    Object.hasOwn(after.frontmatter, AI_USE_FIELD) ||
    canonicalJson(after.frontmatter) !== canonicalJson(rest) ||
    after.body !== before.body
  ) {
    throw new Error(
      `could not remove the ${AI_USE_FIELD} block exactly: write it as a top-level \`${AI_USE_FIELD}:\` key with every nested line indented`,
    );
  }
  return stripped;
}

/**
 * A file the scan found no block in must not carry `aiUse` some other way (a
 * quoted key, say), or the stamp would quietly cover it after all.
 *
 * @param {Buffer} bytes
 */
function assertNoAiUse(bytes) {
  const source = bytes.toString('utf8');
  if (!FRONTMATTER_BLOCK.test(source)) return;
  if (Object.hasOwn(splitEntry(source).frontmatter, AI_USE_FIELD)) {
    throw new Error(
      `found ${AI_USE_FIELD} in the frontmatter but no top-level \`${AI_USE_FIELD}:\` line to remove: write the key unquoted at column 0`,
    );
  }
}

/**
 * The value `claimsReviewed.caseStudy` must hold: the SHA-256 of
 * `caseStudyClaimsBytes(bytes)`, as lowercase hex.
 *
 * @param {Buffer} bytes - the case study file exactly as stored
 * @returns {string}
 */
export function caseStudyClaimsHash(bytes) {
  return createHash('sha256').update(caseStudyClaimsBytes(bytes)).digest('hex');
}
