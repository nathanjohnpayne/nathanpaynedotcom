import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { basename, resolve } from 'path';

/**
 * #910 — closing the class rather than the instances.
 *
 * `.ai_context.md` lists `src/lib/` modules as shared single sources: one copy
 * of a vocabulary or geometry that several surfaces import. Three of them were
 * documented that way and only one, `lifecycle-marker.ts`, actually enforced
 * it. `blog-order.ts` had behavioural tests and no duplicate guard;
 * `index-grid.ts` had no tests at all. The claim lived in prose and nothing
 * read both sides — the same shape as #825, one directory over.
 *
 * So the table itself is now the contract. Add a "Shared …" `src/lib/` row and
 * this fails until that module has a suite performing a `src/`-wide residue
 * walk, which is what makes "the only copy" checkable instead of aspirational.
 *
 * Deliberately structural, not textual: it asserts the guard EXISTS (a suite
 * that walks `src/`), never how it is phrased. A check that breaks when
 * someone rewords a sentence teaches people to weaken the check.
 */

const ROOT = resolve(__dirname, '..');
const contextText = readFileSync(resolve(ROOT, '.ai_context.md'), 'utf-8');

// Table rows look like: | `src/lib/name.ts` | Shared … |
const SHARED_LIB_ROW = /^\|\s*`(src\/lib\/[^`]+)`\s*\|\s*Shared\b/gm;

const sharedModules = [...contextText.matchAll(SHARED_LIB_ROW)].map((m) => m[1]);

/** The walker every residue guard in this repo uses. */
const RESIDUE_WALK = /findFilesRecursively/;

describe('shared single-source modules (#910)', () => {
  it('finds the documented shared modules in .ai_context.md', () => {
    // The control. Every assertion below is a for-loop over `sharedModules`,
    // so a table rewrite that breaks the row pattern would empty the list and
    // let the whole suite pass while checking nothing. Assert the parse works
    // before trusting anything derived from it.
    expect(
      sharedModules.length,
      'the .ai_context.md row pattern matched nothing — the parse broke, or the ' +
        'table no longer marks shared src/lib modules with "Shared"',
    ).toBeGreaterThanOrEqual(3);

    expect(sharedModules).toEqual(
      expect.arrayContaining([
        'src/lib/blog-order.ts',
        'src/lib/index-grid.ts',
        'src/lib/lifecycle-marker.ts',
      ]),
    );
  });

  it('every documented shared module exists on disk', () => {
    // A row naming a module that was renamed or deleted is drift in the other
    // direction, and would otherwise fail below with a confusing "no test file".
    for (const modulePath of sharedModules) {
      expect(existsSync(resolve(ROOT, modulePath)), `${modulePath} is documented but absent`).toBe(
        true,
      );
    }
  });

  it('every documented shared module has a suite that guards against a second copy', () => {
    const missing = [];

    for (const modulePath of sharedModules) {
      const name = basename(modulePath).replace(/\.[^.]+$/, '');
      const testPath = resolve(ROOT, `tests/${name}.test.js`);

      if (!existsSync(testPath)) {
        missing.push(`${modulePath} — no tests/${name}.test.js`);
        continue;
      }
      if (!RESIDUE_WALK.test(readFileSync(testPath, 'utf-8'))) {
        missing.push(`${modulePath} — tests/${name}.test.js does not walk src/ for duplicates`);
      }
    }

    expect(
      missing,
      'A module documented as a shared single source needs a check that reads both sides. ' +
        'Add a residue guard to its suite: walk src/ with findFilesRecursively, exclude the ' +
        'module itself, and assert no other file declares the same vocabulary — plus a control ' +
        'proving the walk reaches the surfaces that would carry a copy. ' +
        'tests/lifecycle-marker.test.js is the model.',
    ).toEqual([]);
  });
});
