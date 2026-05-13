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

import { load as parseYaml, FAILSAFE_SCHEMA } from 'js-yaml';

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/;

/**
 * Schema choice: FAILSAFE_SCHEMA, not the default.
 *
 * js-yaml's DEFAULT_SCHEMA resolves implicit tags for numbers, booleans,
 * null, AND timestamps (ISO-like bare scalars → Date objects). The
 * production callers in this repo (`refresh-hero-images.mjs`,
 * `refresh-mux-gifs.mjs`) inherited the previous hand-rolled parser's
 * "every leaf is a string" contract — e.g.
 *   data?.screenshotSrc?.startsWith('/')
 *   parseGithubRepo(githubUrl).match(...)
 * would throw `TypeError: …is not a function` on a number or Date.
 *
 * FAILSAFE_SCHEMA resolves only `!!str`, `!!seq`, `!!map`. Bare scalars
 * stay as strings ("42", "true", "2026-05-13" remain strings, not
 * coerced to JS number / boolean / Date). Containers — arrays and
 * nested objects — are still parsed structurally (the actual #193 +
 * #64 win), but their leaf values are strings too.
 *
 * This matches the production contract exactly. Two Codex P2 catches
 * on PR #348 led to this choice:
 *   1. Top-level number/boolean coercion needed (first pass: solved
 *      via post-parse coerceTopLevelPrimitives()).
 *   2. Top-level Date coercion needed (DEFAULT_SCHEMA auto-converts
 *      `lastUpdated: 2026-05-13` to a JS Date). Adding Date to the
 *      post-parse coercion would have worked but kept piling up
 *      special cases. Switching schemas closes the whole class.
 */
const SCHEMA = FAILSAFE_SCHEMA;

/**
 * Extract and parse the YAML frontmatter block from a Markdown string.
 * Returns the parsed data object, or `null` if the input has no
 * frontmatter block. Throws if the block exists but fails to parse —
 * caller decides whether to swallow.
 *
 * Uses js-yaml's FAILSAFE_SCHEMA so every leaf scalar stays a string,
 * matching the legacy hand-rolled parser's contract. Arrays and nested
 * objects parse structurally; their leaf values are strings too.
 *
 * @param {string} markdown - the full Markdown file contents
 * @returns {object | null} parsed frontmatter, or null when absent
 */
export function parseFrontmatter(markdown) {
  const match = markdown.match(FRONTMATTER_RE);
  if (!match) return null;
  const parsed = parseYaml(match[1], { schema: SCHEMA });
  // js-yaml returns undefined for an empty document; normalize to {}
  // so consumers can do `data?.field` without an extra null check.
  if (parsed === undefined || parsed === null) return {};
  if (typeof parsed !== 'object') {
    // Top-level scalar frontmatter (e.g. just `123` between dashes)
    // is technically valid YAML but never appears in this codebase.
    // Returning {} keeps consumers safe.
    return {};
  }
  return parsed;
}
