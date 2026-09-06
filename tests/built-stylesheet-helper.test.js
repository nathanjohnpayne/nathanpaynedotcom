import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { DIST, builtPages, readBuiltStylesheet } from './helpers/dom.js';

// Guards readBuiltStylesheet() against the single-chunk assumption (#932).
//
// The helper used to take `readdirSync(...).find(f => f.endsWith('.css'))` —
// whichever stylesheet the filesystem happened to return first. Astro emits one
// chunk today, so that was right by accident, and every assertion in the four
// suites that read built CSS would still pass if the fix were reverted. An
// assertion that cannot fail is not a guard, so these run against a temp
// directory holding the case the real build does not produce: two stylesheets.
//
// A temp directory rather than a second file written into the real dist/,
// because vitest runs suites in parallel and a stray stylesheet in the shared
// build output would be visible to every other suite reading that directory.

let dir;

/** A throwaway `_astro`-shaped directory containing exactly these files. */
function givenAstroDir(files) {
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(dir, name), content);
  }
  return dir;
}

describe('readBuiltStylesheet (#932)', () => {
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'astro-css-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('reads every emitted stylesheet, not just the first', () => {
    const astroDir = givenAstroDir({
      'a.hash.css': '.from-first{color:red}',
      'b.hash.css': '.from-second{color:blue}',
      'index.hash.js': 'console.log(1)',
    });

    const css = readBuiltStylesheet(astroDir);

    // The pre-#932 helper returned only one of these, so this is the assertion
    // that fails on a revert.
    expect(css).toContain('.from-first{color:red}');
    expect(css).toContain('.from-second{color:blue}');
    expect(css, 'only stylesheets, not sibling JS chunks').not.toContain('console.log');
  });

  it('separates chunks so no token spans the seam', () => {
    // Joined with a newline, not concatenated bare: otherwise a rule ending one
    // file and a selector opening the next fuse into a string present in
    // neither, and a matcher could report a rule the build never emitted.
    const astroDir = givenAstroDir({ 'a.css': '.a{}', 'b.css': '.b{}' });

    expect(readBuiltStylesheet(astroDir)).toBe('.a{}\n.b{}');
  });

  it('returns the one chunk unchanged when the build emits one', () => {
    // The shape the real build produces. Reading N files must not add a
    // trailing separator that a matcher anchored at the end would trip over.
    const astroDir = givenAstroDir({ 'only.css': '.solo{}' });

    expect(readBuiltStylesheet(astroDir)).toBe('.solo{}');
  });

  it('names the missing build step when the directory holds no stylesheet', () => {
    const astroDir = givenAstroDir({ 'index.hash.js': '' });

    expect(() => readBuiltStylesheet(astroDir)).toThrow(/No stylesheet emitted/);
  });

  it('reports an absent directory as a build that did not run', () => {
    expect(() => readBuiltStylesheet(join(dir, 'does-not-exist'))).toThrow(/is not in the build/);
  });

  it('names the directory it actually tried to read', () => {
    // Both error paths used to say `dist/_astro` regardless of the argument,
    // which sends a reader to a path the call never touched.
    const missing = join(dir, 'nope');
    expect(() => readBuiltStylesheet(missing)).toThrow(missing);

    const empty = givenAstroDir({ 'index.hash.js': '' });
    expect(() => readBuiltStylesheet(empty)).toThrow(empty);
  });

  // There is deliberately no assertion here that the default keeps its short
  // `dist/_astro` wording. Reaching that branch's error path needs the real
  // dist/_astro to be missing, and the only way to arrange that is to move or
  // delete the shared build output — which vitest's parallel suites are all
  // reading. An earlier revision asserted it by passing a custom directory and
  // checking the message did NOT start with `dist/_astro`, which exercised the
  // other branch entirely and could not have failed. A test that cannot fail
  // is worse than no test: it reports coverage that does not exist.

  it('reads the real build through the default argument', () => {
    // The seam exists for the tests above; this is what every caller actually
    // invokes, so it has to keep working with no argument at all.
    expect(readBuiltStylesheet()).toContain(':root');
  });

  /** Every stylesheet chunk the build emitted. */
  const emittedChunks = () =>
    new Set(readdirSync(resolve(DIST, '_astro')).filter((f) => f.endsWith('.css')));

  /**
   * `href` values of a page's stylesheet `<link>` elements, in document order.
   *
   * Derived from the parsed links rather than by matching `/_astro/*.css`
   * across the whole document, because `rel` is what makes a link a
   * stylesheet. Scanning the document instead lets any element carrying a
   * chunk URL — `<link rel="preload">`, a download anchor — answer for a page
   * that applies no stylesheet at all, which passed the first version of this
   * hardening (Codex, PR #1002).
   *
   * It also keeps the two reads below consistent by construction: the chunk
   * names can only ever come from hrefs that are genuinely stylesheet links,
   * so the pair cannot disagree in the direction that passes.
   */
  function stylesheetHrefs(html) {
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    return [...parsed.querySelectorAll('link[rel][href]')]
      .filter((link) =>
        (link.getAttribute('rel') ?? '')
          .split(/\s+/)
          .some((token) => token.toLowerCase() === 'stylesheet'),
      )
      .map((link) => link.getAttribute('href'));
  }

  /**
   * Emitted-chunk filenames among `hrefs`.
   *
   * Deliberately strict: a chunk URL carrying a query string or written
   * relatively does not match, so it surfaces as a blind extractor below
   * rather than being quietly normalized into a pass.
   */
  const chunkNamesIn = (hrefs) =>
    new Set(hrefs.map((href) => /^\/_astro\/([^/]+\.css)$/.exec(href)?.[1]).filter(Boolean));

  /**
   * Assert one page links every emitted chunk.
   *
   * A named predicate rather than a loop body, so the mutation tests below can
   * run it over markup built to carry each defect — the same reason
   * `tests/lifecycle-marker.test.js` names `modifierElementDeclarations`.
   *
   * @param {string} route
   * @param {string} html
   * @param {Set<string>} emitted
   */
  function expectPageLinksEveryChunk(route, html, emitted) {
    const hrefs = stylesheetHrefs(html);
    const linked = chunkNamesIn(hrefs);
    // Both of these used to be one `if (linked.size === 0) continue;`. That
    // treated "could not look" as "nothing to look at", so any change to how
    // Astro writes the href made every page skip and the suite pass having
    // asserted nothing (#935). They are separate assertions because the two
    // causes need different fixes, and a reader must not have to guess which
    // one they are looking at.
    expect(
      hrefs.length,
      `${route} links no stylesheet at all, so this guard cannot speak for it. If a page is ` +
        'meant to ship without CSS it needs an explicit exemption here, not a silent skip.',
    ).toBeGreaterThan(0);
    expect(
      linked.size,
      `${route} carries ${hrefs.length} stylesheet link(s) — ${JSON.stringify(hrefs)} — and ` +
        'none matched the /_astro/ chunk pattern: the EXTRACTOR is blind, not the page. ' +
        'Everything below this line asserts nothing until it is fixed — see #935.',
    ).toBeGreaterThan(0);
    expect(
      [...emitted].filter((chunk) => !linked.has(chunk)),
      `${route} does not link every emitted stylesheet, so concatenating them ` +
        'no longer matches what this page loads — see #935',
    ).toEqual([]);
  }

  it('only concatenates while every built page loads every chunk', () => {
    // Concatenating is right today and would stop being right the moment Astro
    // route-scopes CSS: a suite could then satisfy an assertion from a chunk
    // its own page never loads, and report a rule the page does not have. That
    // is a false green, which is worse than the bug #932 fixed.
    //
    // The property that makes concatenation equivalent to "what this page
    // loads" is that every page links every emitted chunk. It holds now — one
    // chunk, linked by all of them — so rather than leave the assumption
    // implicit, this fails the moment it stops holding. See #935 for reading
    // each page's own <link> set instead, which is what the split would need.
    const emitted = emittedChunks();
    expect(emitted.size, 'no stylesheet emitted').toBeGreaterThan(0);

    for (const { route, html } of builtPages()) {
      expectPageLinksEveryChunk(route, html, emitted);
    }
  });

  it('fails, rather than skipping, when the href shape defeats the extractor', () => {
    const emitted = emittedChunks();
    const html = readFileSync(resolve(DIST, 'index.html'), 'utf-8');

    // Control: the unmutated page passes, so a throw below is the mutation's
    // doing and not a broken fixture.
    expect(() => expectPageLinksEveryChunk('/', html, emitted)).not.toThrow();

    // A cache-busting query is one plausible way Vite could write the same
    // link. The pattern requires `.css` immediately before the quote, so this
    // matches nothing — and under the old `continue` the page was skipped and
    // the suite stayed green.
    const busted = html.replace(/href="(\/_astro\/[^"]+\.css)"/g, 'href="$1?v=1"');
    expect(busted, 'fixture did not mutate the page').not.toBe(html);
    expect(() => expectPageLinksEveryChunk('/', busted, emitted)).toThrow(/EXTRACTOR is blind/);
  });

  it('tells a page with no stylesheet apart from a blind extractor', () => {
    // The other branch of the same message: nothing to find, rather than a
    // pattern that can no longer find it. Both fail; they must not read alike.
    const bare = '<!doctype html><html><head><title>x</title></head><body></body></html>';

    expect(() => expectPageLinksEveryChunk('/bare/', bare, emittedChunks())).toThrow(
      /links no stylesheet at all/,
    );
  });

  it('does not let a non-stylesheet link answer for a page with no stylesheet', () => {
    // A page that preloads every emitted chunk but applies none of them. The
    // first version of this hardening scanned the whole document for
    // `/_astro/*.css`, so the preload satisfied it and the page passed while
    // applying no CSS at all (Codex, PR #1002).
    const emitted = emittedChunks();
    const preloads = [...emitted]
      .map((chunk) => `<link rel="preload" as="style" href="/_astro/${chunk}">`)
      .join('');

    expect(() =>
      expectPageLinksEveryChunk(
        '/preload-only/',
        `<!doctype html><html><head>${preloads}</head><body></body></html>`,
        emitted,
      ),
    ).toThrow(/links no stylesheet at all/);
  });
});
