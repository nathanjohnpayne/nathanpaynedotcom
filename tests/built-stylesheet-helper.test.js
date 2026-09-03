import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readBuiltStylesheet } from './helpers/dom.js';

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

  it('keeps the short dist/_astro wording for the default', () => {
    // The absolute build path is already in the hint, so repeating it in the
    // subject would be noise for the case every caller actually hits.
    expect(() => readBuiltStylesheet(join(dir, 'nope'))).not.toThrow(/^dist\/_astro/);
  });

  it('reads the real build through the default argument', () => {
    // The seam exists for the tests above; this is what every caller actually
    // invokes, so it has to keep working with no argument at all.
    expect(readBuiltStylesheet()).toContain(':root');
  });
});
