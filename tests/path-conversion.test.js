import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * path-conversion.test.js — lock in the cross-platform contract for
 * `import.meta.url` → filesystem-path conversion in build scripts.
 *
 * PR #174 fixed a Windows-only break where a build script used
 *
 *     const filePath = import.meta.url.replace('file://', '');
 *
 * to convert a module URL to a path. On POSIX that almost works
 * (modulo a leading slash); on Windows it produces invalid paths like
 * `/C:/Users/...` that no filesystem call accepts.
 *
 * The fix is to use `fileURLToPath(import.meta.url)` from `node:url`,
 * which handles both platforms correctly. This test locks that
 * contract in two ways:
 *
 *   1. **Platform contract** — assert that `fileURLToPath` on
 *      `import.meta.url` (this test file itself) yields a string that
 *      has no scheme prefix and that `existsSync` accepts. Catches a
 *      regression in the Node runtime / build environment.
 *
 *   2. **Source-shape contract** — assert that the production build
 *      scripts (`refresh-hero-images.mjs`, `refresh-mux-gifs.mjs`)
 *      both contain the `fileURLToPath(import.meta.url)` pattern and
 *      do NOT contain the buggy `import.meta.url.replace(` pattern.
 *      Fragile to *intentional* refactor — that's the point. If someone
 *      ever refactors back into a string replacement on a Mac/Linux
 *      machine, this test fails on every CI lane the repo runs.
 *
 * See issue #355 for the design conversation that led to choosing
 * this targeted test over a full Windows CI lane.
 */

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');

const BUILD_SCRIPTS = ['scripts/refresh-hero-images.mjs', 'scripts/refresh-mux-gifs.mjs'];

// The buggy pattern. Match the call form, not the literal substring —
// `import.meta.url.replace(...)` with any args is suspicious in the
// context of these scripts. `String.prototype.replace` exists for
// real reasons elsewhere, so this regex is scoped to call sites on
// `import.meta.url` specifically.
const BUGGY_REPLACE = /import\.meta\.url\s*\.\s*replace\s*\(/;

// The good pattern.
const GOOD_FILEURL_CALL = /fileURLToPath\s*\(\s*import\.meta\.url\s*\)/;

describe('cross-platform path conversion (#174 / #355)', () => {
  it('fileURLToPath(import.meta.url) yields a usable filesystem path', () => {
    const path = fileURLToPath(import.meta.url);
    expect(path).not.toMatch(/^file:/);
    expect(path).not.toContain('://');
    // The path resolves to this very test file, which obviously exists.
    expect(existsSync(path)).toBe(true);
  });

  it.each(BUILD_SCRIPTS)(
    '%s converts import.meta.url via fileURLToPath, not string replacement',
    (relativeScriptPath) => {
      const fullPath = resolve(REPO_ROOT, relativeScriptPath);
      const source = readFileSync(fullPath, 'utf-8');
      expect(
        GOOD_FILEURL_CALL.test(source),
        `${relativeScriptPath} should call fileURLToPath(import.meta.url) — the cross-platform path-conversion idiom`,
      ).toBe(true);
      expect(
        BUGGY_REPLACE.test(source),
        `${relativeScriptPath} must not use \`import.meta.url.replace(...)\` — that string-munging pattern breaks on Windows (see PR #174, issue #355)`,
      ).toBe(false);
    },
  );
});
