/**
 * Load-time resolution of the base64-assembled mail links (#790).
 *
 * The homepage Connect line and the end-of-post blog CTA ship `href="#"` in
 * the static HTML and assemble `mailto:hire@nathanpayne.com` client-side, so
 * the literal address never appears in the served markup. That obfuscation is
 * only acceptable because the assembly runs at LOAD. An anchor whose href is
 * resolved in a click handler is not a link: hovering shows no destination,
 * "Copy link address" yields the page URL, ⌘-click and middle-click do not
 * reach a mail client, and assistive tech announces a link to nowhere.
 *
 * #790 reported that regression. It did not reproduce — both surfaces already
 * assemble at parse time, and the only click listener on either anchor fires
 * `contact_email_clicked` / `blog_cta_clicked` without touching href. What was
 * missing was a guard: nothing asserted the timing, so moving the assembly
 * into a listener would have shipped silently. `tests/analytics.test.js`
 * exercises the click listener but never reads href;
 * `tests/connect-booking.test.js` covers the plain booking href beside it and
 * treats the mailto as out of scope; `tests/blog-takeaways-cta.test.js`
 * asserts the anchor exists, not that it resolves.
 *
 * The contract is asserted the way a browser establishes it: parse the built
 * page, run its own inline scripts in document order, dispatch NOTHING, then
 * read href. Discovery is `a[data-u]` across every built page rather than a
 * hardcoded pair of ids, so a third surface adopting the pattern is covered on
 * arrival instead of being quietly exempt.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { resolve, join, relative, sep } from 'path';
import { writeSanitizedDOM } from './helpers/dom.js';

const DIST = resolve(__dirname, '../dist');

/** The address the assembly must produce, and must never ship contiguously. */
const ADDRESS = 'hire@nathanpayne.com';

/** Recursively collect built HTML files under `dir`. */
function htmlFiles(dir) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...htmlFiles(full));
    else if (entry.name.endsWith('.html')) found.push(full);
  }
  return found;
}

/** Route label for a built file, for readable assertion messages. */
function routeOf(file) {
  const rel = relative(DIST, file).split(sep).join('/');
  return `/${rel.replace(/(^|\/)index\.html$/, '$1')}`;
}

/**
 * Parse built markup without executing any of it.
 *
 * `DOMParser` never runs scripts, which is what makes it safe to parse a page
 * here and separately decide what to execute. It is also why the queries below
 * are DOM queries rather than regexes: an earlier revision matched `<script>`
 * with `/<script\b([^>]*)>/` and CodeQL js/bad-tag-filter correctly objected
 * that it misses `<SCRIPT>` — the same finding, for the same reason, that
 * `tests/helpers/dom.js` documents at length. Case, attributes, and nesting
 * are the parser's problem, not a pattern's.
 */
function parse(html) {
  return new DOMParser().parseFromString(html, 'text/html');
}

/**
 * Inline script bodies, in document order, that a browser would execute.
 *
 * External (`src=`) and JSON-LD scripts are skipped because neither is
 * executable page behaviour here. Every remaining body is run — not just the
 * one that mentions the anchor — so the assertion stays honest if the assembly
 * moves to a different script or switches from an id lookup to a class one.
 */
function inlineScripts(html) {
  return [...parse(html).querySelectorAll('script')]
    .filter((el) => !el.hasAttribute('src') && el.getAttribute('type') !== 'application/ld+json')
    .map((el) => el.textContent);
}

/**
 * Run every inline script against the live document, exactly once, with no
 * user interaction. Individual failures are swallowed the way a browser
 * swallows them: one `<script>` element throwing does not stop the next. The
 * assertions read the DOM afterwards, so a script that mattered and threw
 * still fails the test — through the href it did not set, not through the
 * exception, which is the symptom a reader would actually see.
 *
 * `DOMContentLoaded` and `load` are then dispatched because `writeSanitizedDOM`
 * finishes parsing before any of this runs, so both events have already passed
 * by the time a script registers for them. #790 named
 * `document.addEventListener('DOMContentLoaded', …)` as an acceptable place to
 * assemble the href; without these two lines that implementation would read as
 * an inert anchor and the guard would block a valid fix instead of the
 * click-handler regression it targets.
 */
function runPageScripts(html) {
  for (const body of inlineScripts(html)) {
    try {
      new Function(body)();
    } catch {
      /* browser-equivalent: report and continue to the next script element */
    }
  }
  document.dispatchEvent(new Event('DOMContentLoaded', { bubbles: true }));
  window.dispatchEvent(new Event('load'));
}

const pages = htmlFiles(DIST)
  .map((file) => ({ route: routeOf(file), html: readFileSync(file, 'utf-8') }))
  .filter(({ html }) => parse(html).querySelector('a[data-u]') !== null)
  .sort((a, b) => a.route.localeCompare(b.route));

describe('base64-assembled mail links resolve at load (#790)', () => {
  it('covers the homepage and the blog posts, so the suite cannot go vacuous', () => {
    // A renamed attribute or a dropped surface would otherwise leave every
    // assertion below iterating an empty list and reporting green.
    const routes = pages.map((p) => p.route);
    expect(routes, 'no built page carries an a[data-u] mail anchor').not.toHaveLength(0);
    expect(routes).toContain('/');
    expect(
      routes.some((route) => route.startsWith('/blog/') && route !== '/blog/'),
      `no built blog post carries a mail anchor; found ${routes.join(', ')}`,
    ).toBe(true);
  });

  it('ships no contiguous address, and no resolved href, in the static HTML', () => {
    for (const { route, html } of pages) {
      expect(html, `${route}: literal address shipped in the built HTML`).not.toContain(ADDRESS);

      writeSanitizedDOM(html);
      for (const anchor of document.querySelectorAll('a[data-u]')) {
        expect(
          anchor.getAttribute('href'),
          `${route}: #${anchor.id || anchor.className} should ship inert`,
        ).toBe('#');
      }
    }
  });

  it('resolves every mail anchor to a real mailto: with no click dispatched', () => {
    for (const { route, html } of pages) {
      writeSanitizedDOM(html);
      runPageScripts(html);

      const anchors = [...document.querySelectorAll('a[data-u]')];
      expect(anchors.length, `${route}: mail anchor vanished after load`).toBeGreaterThan(0);

      for (const anchor of anchors) {
        const label = `${route}: #${anchor.id || anchor.className}`;
        const href = anchor.getAttribute('href');

        // The failure this guards: href still '#' after load means the
        // assembly moved behind an interaction handler.
        expect(href, `${label} did not resolve at load — still inert`).not.toBe('#');
        // Split and compared as strings rather than matched against a regex
        // built from ADDRESS: `String.replace` with a string pattern escapes
        // only the FIRST match, so a second dot in the address would silently
        // become a wildcard.
        expect(href.startsWith('mailto:'), `${label} resolved to a non-mailto destination`).toBe(
          true,
        );
        // Decoded before comparing, so the assertion is about the destination
        // rather than the encoding an assembly happened to choose.
        const [recipient, query] = href.slice('mailto:'.length).split('?');
        expect(decodeURIComponent(recipient), `${label} resolved to the wrong address`).toBe(
          ADDRESS,
        );

        // A subject is optional, but an empty one is a broken assembly rather
        // than a deliberate omission.
        const subject = query === undefined ? null : new URLSearchParams(query).get('subject');
        if (subject !== null) {
          expect(subject.trim(), `${label} assembled an empty subject`).not.toBe('');
        }
      }
    }
  });

  it('keeps the no-JavaScript address reachable as plain text', () => {
    // The obfuscation is only defensible because a JS-disabled reader still
    // gets the address. If a surface drops its <noscript> line, the assembly
    // stops being a progressive enhancement and starts being a dead end.
    for (const { route, html } of pages) {
      writeSanitizedDOM(html);
      const noscript = [...document.querySelectorAll('noscript')]
        .map((el) => el.textContent)
        .join(' ');
      expect(noscript, `${route}: no <noscript> fallback for the mail address`).toMatch(
        /hire\s*\[at\]\s*nathanpayne\s*\[dot\]\s*com/,
      );
    }
  });
});
