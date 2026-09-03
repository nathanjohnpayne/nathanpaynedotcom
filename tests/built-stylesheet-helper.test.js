import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
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

  it('only concatenates while every built page loads every chunk', () => {
    // Concatenating is right today and would stop being right the moment Astro
    // route-scopes CSS: a suite could then satisfy an assertion from a chunk
    // its own page never loads, and report a rule the page does not have. That
    // is a false green, which is worse than the bug this PR fixed.
    //
    // The property that makes concatenation equivalent to "what this page
    // loads" is that every page links every emitted chunk. It holds now — one
    // chunk, linked by all 37 pages — so rather than leave the assumption
    // implicit, this fails the moment it stops holding. See #935 for reading
    // each page's own <link> set instead, which is what the split would need.
    const emitted = new Set(
      readdirSync(resolve(DIST, '_astro')).filter((f) => f.endsWith('.css')),
    );
    expect(emitted.size, 'no stylesheet emitted').toBeGreaterThan(0);

    for (const { route, html } of builtPages()) {
      const linked = new Set(
        [...html.matchAll(/href="\/_astro\/([^"]+\.css)"/g)].map((m) => m[1]),
      );
      // Pages with no stylesheet at all are not the case this guards.
      if (linked.size === 0) continue;
      expect(
        [...emitted].filter((chunk) => !linked.has(chunk)),
        `${route} does not link every emitted stylesheet, so concatenating them ` +
          'no longer matches what this page loads — see #935',
      ).toEqual([]);
    }
  });
});
