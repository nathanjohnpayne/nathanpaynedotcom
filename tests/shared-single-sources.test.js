import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import {
  SINGLE_SOURCES,
  assertImportersUseIt,
  assertSoleDeclaration,
} from './helpers/single-source-guard.js';

/**
 * #910 — closing the class rather than the instances.
 *
 * `.ai_context.md` lists `src/lib/` modules as shared single sources: one copy
 * of a vocabulary that several surfaces import. Three were documented that way
 * and only `lifecycle-marker.ts` enforced it. `blog-order.ts` had behavioural
 * tests and no duplicate guard; `index-grid.ts` had no tests at all. The claim
 * lived in prose and nothing read both sides — #825, one directory over.
 *
 * This suite RUNS the guard for every documented module. An earlier version
 * only checked that each module's own suite mentioned the walker, which a bare
 * import satisfied; enforcement that can be satisfied by a substring is not
 * enforcement. The guard itself lives in `helpers/single-source-guard.js`, so
 * there is one implementation rather than one per module.
 */

const ROOT = resolve(__dirname, '..');
const contextText = readFileSync(resolve(ROOT, '.ai_context.md'), 'utf-8');

// Table rows look like: | `src/lib/name.ts` | Shared … |
const SHARED_LIB_ROW = /^\|\s*`(src\/lib\/[^`]+)`\s*\|\s*Shared\b/gm;
const documented = [...contextText.matchAll(SHARED_LIB_ROW)].map((m) => m[1]);

describe('shared single-source modules (#910)', () => {
  it('finds the documented shared modules in .ai_context.md', () => {
    // The control. Everything below iterates a parsed or registered list, so an
    // empty parse would let the suite pass while checking nothing — the exact
    // trap this file exists to close, reproduced in its own closer.
    expect(
      documented.length,
      'the .ai_context.md row pattern matched nothing — the parse broke, or the ' +
        'table no longer marks shared src/lib modules with "Shared"',
    ).toBeGreaterThanOrEqual(3);

    expect(documented).toEqual(
      expect.arrayContaining([
        'src/lib/blog-order.ts',
        'src/lib/index-grid.ts',
        'src/lib/lifecycle-marker.ts',
      ]),
    );
  });

  it('the registry and the documentation name the same modules', () => {
    // Both directions. A row added without a registry entry is an unguarded
    // claim; a registry entry with no row is a guard nobody can discover from
    // the docs. Either way the two surfaces have drifted.
    const registered = SINGLE_SOURCES.map((entry) => entry.module);

    expect(
      [...registered].sort(),
      'tests/helpers/single-source-guard.js and the .ai_context.md table disagree. ' +
        'Add the missing registry entry (module, label, declares, importers) or the ' +
        'missing table row.',
    ).toEqual([...documented].sort());
  });

  it('every documented shared module exists on disk', () => {
    for (const modulePath of documented) {
      expect(existsSync(resolve(ROOT, modulePath)), `${modulePath} is documented but absent`).toBe(
        true,
      );
    }
  });

  describe.each(SINGLE_SOURCES.map((entry) => [entry.module, entry]))('%s', (_module, entry) => {
    it('is the only place src/ declares its vocabulary', () => {
      assertSoleDeclaration(entry);
    });

    it('is imported by every surface that would otherwise carry a copy', () => {
      assertImportersUseIt(entry);
    });
  });
});
