import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Shared DOM setup for the tests that read built pages out of `dist/`.
 *
 * Every one of those tests wants the same thing: the built markup in the live
 * jsdom document, with the page's own behaviour removed, so the assertions
 * describe what a JS-disabled reader gets rather than what the page does to
 * itself after load.
 *
 * ## Why scripts are removed through the DOM and not by regex
 *
 * The original `/<script>...<\/script>/g` matched only lowercase `<script>`
 * with no attributes, so Astro's own `<script type="module" src="...">`
 * survived and the no-JavaScript premise was not actually achieved (CodeQL
 * js/bad-tag-filter, alert #17). Making the regex case-insensitive and
 * attribute-tolerant fixed that but traded it for
 * js/incomplete-multi-character-sanitization: any single-pass string replace
 * can leave `<script` behind through nesting, so CodeQL objects to the
 * technique itself, not to one pattern.
 *
 * Removing the parsed elements sidesteps the whole class. It is also exact:
 * case, attributes, and nesting are the parser's problem, not a pattern's.
 *
 * ## Why the removal runs on a detached document
 *
 * Vitest's jsdom environment defaults to `runScripts: "dangerously"`, so
 * anything written into the live document with `document.write` executes
 * immediately and pruning afterwards would be too late. `DOMParser` never
 * executes scripts, so stripping there means nothing runs at all. (An earlier
 * revision of this comment claimed jsdom does not execute scripts under
 * vitest.config.js; that is wrong. Writing the built homepage into the live
 * document and clicking a panel with no `loadScript()` call opens the panel,
 * which only the page's own inline script can do.)
 *
 * JSON-LD is kept because it is content, not behaviour—several test files
 * assert on it.
 *
 * ## Why the doctype is re-serialized
 *
 * `documentElement.outerHTML` covers `<html>` down and nothing above it, so
 * writing that alone drops the `<!doctype html>` the parser saw and leaves the
 * live document in quirks mode (`document.compatMode === 'BackCompat'`). Astro
 * emits a doctype and production runs in standards mode, so a quirks-mode
 * document is a materially different thing to assert against. The doctype is
 * rebuilt from `parsed.doctype` rather than hardcoded, so a page with a
 * different doctype—or none at all—round-trips faithfully instead of acquiring
 * one it never had.
 */

/**
 * Serialize a `DocumentType` node back to markup, following the HTML
 * serialization rules for the node. Returns `''` for a document that had no
 * doctype, which is what preserves that page's (correct) quirks mode.
 *
 * @param {DocumentType | null} doctype
 * @returns {string}
 */
function serializeDoctype(doctype) {
  if (!doctype) return '';
  let markup = `<!DOCTYPE ${doctype.name}`;
  if (doctype.publicId) {
    markup += ` PUBLIC "${doctype.publicId}"`;
    if (doctype.systemId) markup += ` "${doctype.systemId}"`;
  } else if (doctype.systemId) {
    markup += ` SYSTEM "${doctype.systemId}"`;
  }
  return `${markup}>`;
}

/**
 * Parse built HTML detached, drop every script except JSON-LD, and write the
 * result—doctype included—into the live jsdom document.
 *
 * @param {string} rawHtml Built markup, as read from `dist/`.
 * @returns {Document} The live document, for convenience.
 */
export function writeSanitizedDOM(rawHtml) {
  const parsed = new DOMParser().parseFromString(rawHtml, 'text/html');
  for (const script of parsed.querySelectorAll('script:not([type="application/ld+json"])')) {
    script.remove();
  }
  document.documentElement.innerHTML = '';
  document.write(serializeDoctype(parsed.doctype) + parsed.documentElement.outerHTML);
  document.close();
  return document;
}

/**
 * ## Reading the build
 *
 * Four suites assert against `dist/` and each used to resolve its own paths at
 * module load with no existence guard, so running `vitest` without a build
 * first threw `ENOENT` during collection: the file failed to collect rather
 * than failing an assertion, and the error named an absolute path but not the
 * step that produces it (#794).
 *
 * `npm test` is `astro build && vitest run`, so the build is not an optional
 * prerequisite a reader can forget — which is why a bespoke guard in one of
 * the four was declined on #792. Doing it once for all four is the version
 * that does not make the shared convention less legible.
 */

/** Absolute path to the build output every `readBuilt*` helper reads from. */
export const DIST = resolve(dirname(fileURLToPath(import.meta.url)), '../../dist');

/** Appended to every missing-build error, so the fix is in the message. */
const BUILD_HINT = 'Run `npm test` (which builds first) or `npm run build` before `vitest run`.';

/**
 * Rethrow an `ENOENT` as an error that names the route and the build step.
 * Anything else propagates untouched — a permissions error is not a missing
 * build and must not be reported as one.
 *
 * @param {NodeJS.ErrnoException} error
 * @param {string} what Human-readable description of what was being read.
 * @returns {never}
 */
function rethrowAsMissingBuild(error, what) {
  if (error.code !== 'ENOENT') throw error;
  throw new Error(`${what} is not in the build (looked under ${DIST}). ${BUILD_HINT}`);
}

/**
 * Read one built page out of `dist/`.
 *
 * @param {string} relativePath Path under `dist/`, e.g. `'index.html'` or
 *   `'blog/some-slug/index.html'`.
 * @returns {string} The built markup.
 */
export function readBuiltPage(relativePath) {
  try {
    return readFileSync(resolve(DIST, relativePath), 'utf-8');
  } catch (error) {
    return rethrowAsMissingBuild(error, `dist/${relativePath}`);
  }
}

/**
 * Absolute paths of every built `.html` file under `dist/`, or under one
 * subdirectory of it.
 *
 * @param {string} [subdir] Path under `dist/`; defaults to the whole build.
 * @returns {string[]}
 */
export function builtPagePaths(subdir = '.') {
  const root = resolve(DIST, subdir);
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch (error) {
      return rethrowAsMissingBuild(error, `dist/${relative(DIST, dir) || '.'}`);
    }
    const found = [];
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) found.push(...walk(full));
      else if (entry.name.endsWith('.html')) found.push(full);
    }
    return found;
  };
  return walk(root);
}

/**
 * Route label for a built file, for readable assertion messages:
 * `dist/blog/x/index.html` → `/blog/x/`, `dist/index.html` → `/`.
 *
 * @param {string} absolutePath
 * @returns {string}
 */
export function builtRoute(absolutePath) {
  const rel = relative(DIST, absolutePath).split(sep).join('/');
  return `/${rel.replace(/(^|\/)index\.html$/, '$1')}`;
}

/**
 * Every built page under `dist/` (or one subdirectory), read and labelled,
 * sorted by route so assertion output is stable across filesystems.
 *
 * @param {string} [subdir] Path under `dist/`; defaults to the whole build.
 * @returns {{ route: string, path: string, html: string }[]}
 */
export function builtPages(subdir = '.') {
  return builtPagePaths(subdir)
    .map((path) => ({ route: builtRoute(path), path, html: readFileSync(path, 'utf-8') }))
    .sort((a, b) => a.route.localeCompare(b.route));
}

/**
 * The build's single emitted stylesheet, read out of `dist/_astro/`.
 *
 * The filename is content-hashed, so it has to be discovered rather than
 * named. A build that emits none is reported the same way a missing build is:
 * as the build step that did not run, not as a `TypeError` from resolving
 * `undefined`.
 *
 * @returns {string} The stylesheet source.
 */
export function readBuiltStylesheet() {
  const astroDir = resolve(DIST, '_astro');
  let entries;
  try {
    entries = readdirSync(astroDir);
  } catch (error) {
    return rethrowAsMissingBuild(error, 'dist/_astro');
  }
  const cssFile = entries.find((name) => name.endsWith('.css'));
  if (!cssFile) {
    throw new Error(`No stylesheet emitted into dist/_astro. ${BUILD_HINT}`);
  }
  return readFileSync(resolve(astroDir, cssFile), 'utf-8');
}
