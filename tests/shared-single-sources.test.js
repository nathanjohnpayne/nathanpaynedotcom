import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { SINGLE_SOURCES, assertImportersUseIt } from './helpers/single-source-guard.js';

/**
 * #910 — the enforceable half of the shared-single-source contract.
 *
 * `.ai_context.md` lists `src/lib/` modules as shared single sources. This
 * suite checks the parts of that claim which are closed questions with
 * enumerable answers, and deliberately does not attempt the part that is not.
 *
 * WHAT THIS ENFORCES
 *   - the documented set and the registry name the same modules
 *   - every documented module exists on disk
 *   - every surface the registry names actually imports its module
 *
 * WHAT IT DOES NOT
 *   - that no OTHER file re-declares the vocabulary. Five review rounds
 *     established that a text scan cannot decide it; see the header of
 *     helpers/single-source-guard.js. That rule lives in rules/repo_rules.md
 *     and is carried by review.
 *
 * The distinction matters more than the coverage: a scan claiming universal
 * duplicate detection that quietly misses a tuple, a template literal or an
 * MDX body is worse than a documented rule, because it converts "someone must
 * look" into "CI has it".
 */

const ROOT = resolve(__dirname, '..');
const contextText = readFileSync(resolve(ROOT, '.ai_context.md'), 'utf-8');

// Table rows look like: | `src/lib/name.ts` | Shared … |
const SHARED_LIB_ROW = /^\|\s*`(src\/lib\/[^`]+)`\s*\|\s*Shared\b/gm;
const documented = [...contextText.matchAll(SHARED_LIB_ROW)].map((m) => m[1]);

describe('shared single sources (#910)', () => {
  it('finds the documented shared modules in .ai_context.md', () => {
    // The control. The assertions below iterate a parsed or registered list,
    // so an empty parse would let them pass while checking nothing.
    expect(
      documented.length,
      'the .ai_context.md row pattern matched nothing — the parse broke, or the ' +
        'table no longer marks shared src/lib modules with "Shared"',
    ).toBeGreaterThanOrEqual(3);
  });

  it('the registry and the documentation name the same modules', () => {
    // Both directions, and the reason this check is worth having at all: two
    // closed lists compared for equality, which is exactly the shape #825
    // showed a check can settle. A row with no entry is an unenforced claim;
    // an entry with no row is a rule nobody can find from the docs.
    expect(
      SINGLE_SOURCES.map((entry) => entry.module).sort(),
      'tests/helpers/single-source-guard.js and the .ai_context.md table disagree',
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
    it('is imported by every surface the registry names', () => {
      assertImportersUseIt(entry);
    });
  });
});
