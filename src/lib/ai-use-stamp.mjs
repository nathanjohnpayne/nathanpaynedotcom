/**
 * The stamp behind `aiUse.reviewed.content` (#1492, #1510, epic #1490).
 *
 * An entry's `aiUse.statement` says how its text was written. The stamp records
 * the SHA-256 of the entry's reader-facing content and of the statement itself
 * when the owner last confirmed that statement, so a later edit to either one
 * cannot merge without a visible `aiUse.reviewed` change in the same diff. It
 * binds the text and its disclosure together; it does not prove that anyone
 * reviewed either, or that the statement is accurate.
 * tests/ai-use-stamp.test.js recomputes the hash for every entry that carries
 * `aiUse` and fails on a mismatch.
 *
 * Reader-facing content is the entry's body plus every frontmatter field except
 * `aiUse` itself and the fields in AI_USE_NON_PROSE_FIELDS. It is an exclusion
 * list, not an inclusion list, so a new prose field is covered by default.
 * Case-study prose lives largely in frontmatter (`decisions`, `learnings`,
 * `constraints`), so hashing the body alone would miss it. Of `aiUse`, only
 * `statement` is hashed: `aiUse.reviewed` is the stamp, and hashing it would
 * make the stamp depend on itself.
 *
 * The hash is defined over the source file, not Astro's parsed entry, so the
 * test, the CLI and a reviewer all compute it from the bytes in the diff:
 *
 * - Body: everything after the line that closes the frontmatter, with leading
 *   and trailing whitespace removed (the same split as the #1165 claims-review
 *   `resume` hash). Every other byte counts, including whitespace inside the
 *   text and, in `.mdx`, imports and component tags.
 * - Frontmatter: the YAML parsed with js-yaml's FAILSAFE_SCHEMA, so every leaf
 *   is a string. Quoting or reflowing a value does not move the hash, and an
 *   unquoted date hashes the same as a quoted one. `aiUse` is dropped whole.
 * - Statement: `aiUse.statement` from the same FAILSAFE parse, with leading and
 *   trailing whitespace removed, as the schema trims it before it renders. It
 *   is `null` for an entry without `aiUse`, which has no stamp to check. An
 *   entry that carries `aiUse` without a non-empty string statement throws:
 *   the schema rejects it, and a hash printed for it could only ever stamp a
 *   statement nobody has written.
 * - Payload: canonical JSON of `{ body, frontmatter, statement }`, object keys
 *   sorted at every depth, array order kept, no whitespace, so frontmatter key
 *   order does not move the hash. The statement is its own top-level member,
 *   outside `frontmatter`, so no frontmatter field can stand in for it. The
 *   digest is lowercase hex of the payload's UTF-8 bytes.
 *
 * Plain JavaScript with no Astro import, so `scripts/ai-use-hash.mjs` runs it
 * under Node directly.
 */
import { createHash } from 'node:crypto';
import { load as parseYaml, FAILSAFE_SCHEMA } from 'js-yaml';

/**
 * The disclosure field. Dropped from the hashed frontmatter: its statement is
 * hashed on its own, and its stamp is not hashed at all.
 */
export const AI_USE_FIELD = 'aiUse';

/**
 * Top-level frontmatter fields that are not reader-facing prose, and so do not
 * invalidate the stamp. Defined once; the helper and the tests import it.
 *
 * A field belongs here only when it is placement or ordering, publication
 * state, visual presentation, or a media asset reference. Everything else
 * stays hashed, including identifiers, URLs, tags, dates and labels. When in
 * doubt, leave a field hashed: an unneeded re-stamp costs a review, a missed
 * one lets a statement go stale.
 *
 * Only whole top-level keys are excluded. Nested non-prose values
 * (`screenshotSecondary.src`, `pullquotes[].accent`, a sidebar image's
 * `content` path) stay hashed, because the objects that hold them also hold
 * prose (`alt`, `text`, `caption`).
 */
export const AI_USE_NON_PROSE_FIELDS = Object.freeze([
  // Color token derived from `order` (projects).
  'accent',
  // Publication state (both).
  'draft',
  // Sort flag for the /blog/ index (blog).
  'featured',
  // Build-time hero refresh mode (projects).
  'heroRefresh',
  // Position in the homepage Writing list (blog).
  'homepageRank',
  // Share-card image path (blog).
  'image',
  // Hero video ID (projects).
  'muxPlaybackId',
  // Sort position, which also derives `accent` (projects).
  'order',
  // Hero screenshot layout (projects).
  'screenshotAspect',
  // Hero figure surface flag (projects).
  'screenshotDarkSurface',
  // Hero screenshot path (projects).
  'screenshotSrc',
]);

/** The command that prints an entry's current hash. The test's remedy names it. */
export const AI_USE_HASH_SCRIPT = 'ai-use:hash';

/** @param {string} entryPath - repo-relative path to the entry */
export function aiUseHashCommand(entryPath) {
  return `npm run --silent ${AI_USE_HASH_SCRIPT} -- ${entryPath}`;
}

/**
 * The opening frontmatter block, through the newline that ends its closing
 * `---` line. Anchored at the start of the file, and the closing delimiter
 * must be a whole line, so `----` or `--- x` inside the YAML does not end it.
 */
const FRONTMATTER_BLOCK = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

/**
 * Split an entry into its parsed frontmatter and its trimmed body.
 *
 * @param {string} source - the full entry file
 * @returns {{ frontmatter: Record<string, unknown>, body: string }}
 */
export function splitEntry(source) {
  const match = FRONTMATTER_BLOCK.exec(source);
  if (!match) throw new Error('entry has no frontmatter block');
  const parsed = parseYaml(match[1], { schema: FAILSAFE_SCHEMA });
  if (
    parsed !== undefined &&
    parsed !== null &&
    (typeof parsed !== 'object' || Array.isArray(parsed))
  ) {
    throw new Error('entry frontmatter is not a mapping');
  }
  return {
    frontmatter: /** @type {Record<string, unknown>} */ (parsed ?? {}),
    body: source.slice(match[0].length).trim(),
  };
}

/**
 * Canonical JSON: object keys sorted at every depth, array order kept, no
 * whitespace. Keys whose value is `undefined` are dropped, as JSON.stringify
 * drops them.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const record = /** @type {Record<string, unknown>} */ (value);
    return `{${Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

/**
 * The statement the stamp covers: `aiUse.statement`, trimmed. `null` when the
 * entry carries no `aiUse`; throws when it carries `aiUse` without a non-empty
 * string statement.
 *
 * @param {Record<string, unknown>} frontmatter - FAILSAFE-parsed frontmatter
 * @returns {string | null}
 */
function aiUseStatement(frontmatter) {
  if (!Object.hasOwn(frontmatter, AI_USE_FIELD)) return null;
  const aiUse = frontmatter[AI_USE_FIELD];
  const statement =
    aiUse !== null && typeof aiUse === 'object' && !Array.isArray(aiUse)
      ? /** @type {Record<string, unknown>} */ (aiUse).statement
      : undefined;
  if (typeof statement !== 'string' || statement.trim() === '') {
    throw new Error(
      `${AI_USE_FIELD} has no statement: write aiUse.statement before stamping, since the stamp covers it`,
    );
  }
  return statement.trim();
}

/**
 * The content the stamp covers: the body, the frontmatter without `aiUse` and
 * without AI_USE_NON_PROSE_FIELDS, and the trimmed `aiUse.statement` (`null`
 * without `aiUse`). `aiUse.reviewed` is never part of it.
 *
 * @param {string} source - the full entry file
 * @returns {{ body: string, frontmatter: Record<string, unknown>, statement: string | null }}
 */
export function readerFacingContent(source) {
  const { frontmatter, body } = splitEntry(source);
  const excluded = new Set([AI_USE_FIELD, ...AI_USE_NON_PROSE_FIELDS]);
  const kept = Object.fromEntries(
    Object.entries(frontmatter).filter(([key]) => !excluded.has(key)),
  );
  return { body, frontmatter: kept, statement: aiUseStatement(frontmatter) };
}

/**
 * The value `aiUse.reviewed.content` must hold: the SHA-256 of the canonical
 * JSON of the entry's reader-facing content and statement, as lowercase hex.
 *
 * @param {string} source - the full entry file
 * @returns {string}
 */
export function aiUseContentHash(source) {
  return createHash('sha256')
    .update(canonicalJson(readerFacingContent(source)), 'utf8')
    .digest('hex');
}
