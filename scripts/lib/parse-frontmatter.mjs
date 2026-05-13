/**
 * parse-frontmatter.mjs — minimal YAML frontmatter extractor for the
 * prebuild scripts (`refresh-hero-images.mjs`, `refresh-mux-gifs.mjs`).
 *
 * Runtime frontmatter parsing happens inside Astro's Content Loader
 * (see `src/content.config.ts`). This helper exists only for the
 * prebuild step, which needs to read `src/content/projects/*.md`
 * before Astro starts building, to decide whether to refresh GitHub
 * social images and Mux GIFs.
 *
 * Previous implementations of this function in each script were
 * hand-rolled line-by-line splitters that only stripped double quotes
 * and silently dropped single-quoted strings, arrays, multi-line
 * scalars, and nested objects (#193, #64). All those forms appear in
 * the project frontmatter today (e.g. `tags: ["Consumer", ...]` and
 * the nested `metadata:` block on every project page). Production
 * callers only access flat string fields so the bug was not
 * load-bearing, but the brittle parsing made the surface easy to
 * regress whenever a new prebuild consumer touched a richer key.
 *
 * `js-yaml` is already in the dep graph transitively (Astro consumes
 * it); we pin a direct devDependency to make the import contract
 * explicit and decouple from Astro version drift.
 */

import { load as parseYaml } from 'js-yaml';

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/;

/**
 * Top-level primitive coercion. js-yaml correctly types scalars (a bare
 * `123` parses to a JS number, `true` to a boolean, etc.), but the
 * production callers (`refresh-hero-images.mjs`, `refresh-mux-gifs.mjs`)
 * inherited the previous hand-rolled parser's "every value is a string"
 * contract: e.g. `data?.screenshotSrc?.startsWith('/')` would throw a
 * TypeError if the value parsed to a number, and `parseGithubRepo(githubUrl)`
 * calls `.match()` on its input. Coerce top-level primitives back to
 * strings to preserve the old contract, leaving arrays / nested objects
 * untouched (those are new capabilities the old parser silently mangled).
 *
 * Codex P2 catch on PR #348.
 */
function coerceTopLevelPrimitives(obj) {
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;
    const t = typeof value;
    if (t === 'number' || t === 'boolean' || t === 'bigint') {
      obj[key] = String(value);
    }
    // strings: no-op. arrays / objects: untouched.
  }
  return obj;
}

/**
 * Extract and parse the YAML frontmatter block from a Markdown string.
 * Returns the parsed data object, or `null` if the input has no
 * frontmatter block. Throws if the block exists but fails to parse —
 * caller decides whether to swallow.
 *
 * Top-level primitive scalars (numbers, booleans, bigints) are coerced
 * to strings to preserve the legacy hand-rolled parser's "every value
 * is a string" contract for production callers. Arrays and nested
 * objects pass through with their js-yaml types intact.
 *
 * @param {string} markdown - the full Markdown file contents
 * @returns {object | null} parsed frontmatter, or null when absent
 */
export function parseFrontmatter(markdown) {
  const match = markdown.match(FRONTMATTER_RE);
  if (!match) return null;
  const parsed = parseYaml(match[1]);
  // js-yaml returns undefined for an empty document; normalize to {}
  // so consumers can do `data?.field` without an extra null check.
  if (parsed === undefined || parsed === null) return {};
  if (typeof parsed !== 'object') {
    // Top-level scalar frontmatter (e.g. just `123` between dashes)
    // is technically valid YAML but never appears in this codebase.
    // Returning {} keeps consumers safe.
    return {};
  }
  return coerceTopLevelPrimitives(parsed);
}
