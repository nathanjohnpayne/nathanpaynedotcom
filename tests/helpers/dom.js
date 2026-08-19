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
