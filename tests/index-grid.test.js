import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { relative, resolve } from 'path';
import { findFilesRecursively } from '../scripts/lib/blog-file-inventory.mjs';
import { getIndexGridRow } from '../src/lib/index-grid';

// The six-row index geometry is shared by two surfaces: /projects/ and /blog/.
// `.ai_context.md` calls it a single source, and until #910 nothing tested it
// at all — neither the geometry nor the claim. A second inline copy in one of
// the two indexes would let them diverge with every gate green, which is the
// failure mode `lifecycle-marker.ts` already earned a guard for.

const SRC = resolve(__dirname, '../src');
const CYCLE = 6;

describe('index grid geometry', () => {
  it('walks the six opening rows in order', () => {
    expect([...Array(CYCLE)].map((_, i) => getIndexGridRow(i).rowClass)).toEqual([
      'grid-row--1',
      'grid-row--2',
      'grid-row--3',
      'grid-row--4',
      'grid-row--overflow-a',
      'grid-row--overflow-b',
    ]);
  });

  it('repeats the row classes on the next cycle', () => {
    for (let i = 0; i < CYCLE; i += 1) {
      expect(getIndexGridRow(i + CYCLE).rowClass, `row ${i + CYCLE}`).toBe(
        getIndexGridRow(i).rowClass,
      );
    }
  });

  it('gives a later cycle its own opening accents rather than repeating row 1', () => {
    // The boundary case the module exists for. Index 0 opens red/paper; index
    // 6 opens the same ROW but must not re-open with the same accents, or the
    // ramp restarts mid-grid and two entries six apart look identical.
    expect(getIndexGridRow(0).accentClasses).toEqual(['accent-red', 'accent-paper']);
    expect(getIndexGridRow(CYCLE).accentClasses).toEqual(['accent-yellow', 'accent-paper']);
    expect(getIndexGridRow(CYCLE * 2).accentClasses).toEqual(['accent-yellow', 'accent-paper']);
  });

  it('only special-cases the row that opens a later cycle', () => {
    // Every non-boundary index returns the plain opening row, so the override
    // above cannot leak into the middle of a cycle.
    for (const i of [1, 2, 3, 4, 5, 7, 8, 11]) {
      expect(getIndexGridRow(i).accentClasses, `row ${i} should not be overridden`).toEqual(
        getIndexGridRow(i % CYCLE).accentClasses,
      );
    }
  });

  it('is the only place src/ declares the row → accent mapping', () => {
    // The residue guard, modelled on tests/lifecycle-marker.test.js. Consumers
    // read `row.rowClass` / `row.accentClasses` as properties; only a second
    // COPY declares them as object keys, which is what this looks for. Matching
    // on `grid-row--` alone would false-positive on the static `grid-row--rss`
    // in the blog index, which is not part of the cycle.
    const offenders = findFilesRecursively(SRC, (f) => /\.(astro|ts|js|mjs)$/.test(f))
      .filter((f) => relative(SRC, f) !== 'lib/index-grid.ts')
      .filter((f) => /(rowClass|accentClasses)\s*[:=]/.test(readFileSync(f, 'utf-8')))
      .map((f) => relative(SRC, f));
    expect(offenders, 'index row → accent mapping duplicated outside index-grid.ts').toEqual([]);
  });

  it('both indexes import the shared helper', () => {
    // The control for the guard above: a zero-hit "no duplicates" assertion
    // proves nothing unless the same walk demonstrably reaches the files that
    // would carry a duplicate.
    const surfaces = ['pages/projects/index.astro', 'pages/blog/index.astro'];
    const walked = findFilesRecursively(SRC, (f) => /\.(astro|ts|js|mjs)$/.test(f)).map((f) =>
      relative(SRC, f),
    );
    for (const surface of surfaces) {
      expect(walked, `the residue walk never reached ${surface}`).toContain(surface);
      expect(
        readFileSync(resolve(SRC, surface), 'utf-8'),
        `${surface} does not import the shared index geometry`,
      ).toMatch(/from '[./]*lib\/index-grid'/);
    }
  });
});
