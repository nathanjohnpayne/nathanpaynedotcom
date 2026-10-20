/**
 * inline-script-csp.mjs — Astro integration that gives every built page a
 * `<meta http-equiv="Content-Security-Policy">` whose `script-src` lists the
 * SHA-256 hash of each inline script on that page (#1080).
 *
 * Why this exists
 * ---------------
 * The site's analytics, privacy and interaction scripts are `is:inline`, and
 * several carry per-page `define:vars` values, so the set of inline-script
 * hashes differs from page to page and changes with content. The
 * `Content-Security-Policy` header in `firebase.json` is one value for every
 * path and cannot carry them, so it keeps `'unsafe-inline'` in `script-src`.
 * Browsers enforce every policy a page delivers, header and meta alike, and a
 * script runs only if each policy allows it. This meta policy drops
 * `'unsafe-inline'`, so an inline script runs only if its exact text was in
 * the page at build time. Astro's own `security.csp` does not hash `is:inline`
 * scripts and places its meta after them, so it cannot do this.
 *
 * How it works
 * ------------
 * Runs at `astro:build:done`. For each `.html` file in the output directory:
 *   1. hashes the text of every inline script the browser would execute
 *      (classic or module; JSON-LD and other data blocks are skipped), and
 *      the value of every inline event-handler attribute (`onerror=` on the
 *      résumé logos), which needs `'unsafe-hashes'` as well;
 *   2. builds `script-src 'self' https:` plus those hashes. The meta names no
 *      host: an external script must also pass the header's `script-src`, so
 *      the header in `firebase.json` stays the only host allowlist, and the
 *      markup names no analytics host outside the gated scripts
 *      (specs/analytics-privacy.md § Gate);
 *   3. inserts the meta directly after `<meta charset>` (or `<head>`), ahead
 *      of every script, by splicing the source text: the rest of the file is
 *      left byte-for-byte as Astro wrote it.
 * Throws on a page with no `<head>`, a script before the insertion point, or
 * a `javascript:` URL, so a page the policy would break fails the build
 * rather than shipping.
 *
 * @see Issue #1080 — Move the CSP from report-only to enforcing
 */

import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

/** Script `type` values the browser executes; anything else is a data block. */
export function isExecutableScript(type) {
  const t = (type ?? '').trim().toLowerCase();
  return t === '' || t === 'module' || /^(text|application)\/(x-)?(java|ecma)script$/.test(t);
}

/** CSP source expression for the SHA-256 of `text` (UTF-8, as browsers hash it). */
export function sha256Source(text) {
  return `'sha256-${createHash('sha256').update(text, 'utf8').digest('base64')}'`;
}

/**
 * The meta policy's sources before the page's hashes. `https:` admits any
 * https script as far as this policy goes; the header's host list is what
 * limits them. `'unsafe-inline'` is absent, which is the point.
 */
export const BASE_SOURCES = ["'self'", 'https:'];

/**
 * Return `html` with the hash-based meta policy inserted, or throw if the
 * page cannot be covered.
 */
export function addInlineScriptCsp(html, label = 'page') {
  const dom = new JSDOM(html, { includeNodeLocations: true });
  const { document } = dom.window;

  const head = document.head;
  const headLocation = head && dom.nodeLocation(head);
  if (!headLocation?.startTag) throw new Error(`[inline-script-csp] ${label}: no <head> start tag`);
  const charset = head.querySelector(':scope > meta[charset]');
  const anchor = charset ? dom.nodeLocation(charset) : headLocation.startTag;
  const insertAt = anchor.endOffset;

  const hashes = new Set();
  for (const script of document.querySelectorAll('script')) {
    if (script.hasAttribute('src') || !isExecutableScript(script.getAttribute('type'))) continue;
    if (dom.nodeLocation(script).startOffset < insertAt) {
      throw new Error(
        `[inline-script-csp] ${label}: an inline script precedes the policy insertion point`,
      );
    }
    hashes.add(sha256Source(script.textContent));
  }

  const handlerHashes = new Set();
  for (const element of document.querySelectorAll('*')) {
    for (const { name, value } of element.attributes) {
      if (/^on/i.test(name)) handlerHashes.add(sha256Source(value));
      if (/^\s*javascript:/i.test(value)) {
        throw new Error(
          `[inline-script-csp] ${label}: javascript: URL in ${element.tagName.toLowerCase()} ${name}`,
        );
      }
    }
  }

  const sources = [...BASE_SOURCES];
  if (handlerHashes.size) sources.push("'unsafe-hashes'");
  sources.push(...hashes, ...handlerHashes);

  const meta = `<meta http-equiv="Content-Security-Policy" content="script-src ${sources.join(' ')}">`;
  return html.slice(0, insertAt) + meta + html.slice(insertAt);
}

async function htmlFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await htmlFiles(path)));
    else if (entry.name.endsWith('.html')) out.push(path);
  }
  return out;
}

export default function inlineScriptCsp() {
  return {
    name: 'inline-script-csp',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        const files = await htmlFiles(root);
        for (const file of files) {
          const html = await readFile(file, 'utf8');
          await writeFile(file, addInlineScriptCsp(html, file.slice(root.length)));
        }
        logger.info(`script-src hash policy added to ${files.length} page(s)`);
      },
    },
  };
}
