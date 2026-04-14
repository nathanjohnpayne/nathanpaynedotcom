/**
 * Integration contract tests — Windows portability enforcement.
 *
 * Astro's `astro:build:done` hook passes `dir` as a URL object. Reading
 * `dir.pathname` directly produces `/C:/path/...` on Windows, which
 * breaks `path.join` downstream and generates malformed paths like
 * `C:\C:\path\to\dist`. The documented cross-platform pattern is
 * `fileURLToPath(dir)` from `node:url`.
 *
 * #171 applied this fix to `robots-sitemap.mjs`. #173 applied it to
 * `og-images.mjs`. This test file enforces the contract for every
 * current and future integration — cross-platform, so it catches a
 * regression at `npm test` time on macOS/Linux without needing a
 * Windows CI runner.
 *
 * The cheapest implementation would be a grep, but that trips on the
 * explanatory comments (`// dir.pathname yields /C:/path/...`) each
 * integration carries. Instead, strip comments before matching, and
 * run two independent assertions per integration:
 *
 *   1. The runtime (comment-stripped) source must not contain
 *      `dir.pathname`.
 *   2. Any integration that uses `astro:build:done` must also import
 *      `fileURLToPath` from `node:url`.
 *
 * A new integration that touches `astro:build:done` without using
 * `fileURLToPath` will fail this test immediately. A contributor who
 * regresses one of the existing integrations back to `dir.pathname`
 * will fail (1) on that file. Either way, the Windows bug can't
 * silently re-enter the repo.
 *
 * @see Issue #171 — robots-sitemap drift prevention (original Windows fix)
 * @see Issue #173 — og-images Windows portability follow-up
 * @see https://docs.astro.build/en/reference/integrations-reference/
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const integrationsDir = resolve(__dirname, '../src/integrations');

function listIntegrationFiles() {
  // Recursive walk so integrations nested under subdirectories
  // (e.g. src/integrations/og/index.mjs) are also covered. The
  // top-level-only version of this would silently skip a new
  // integration that organized itself into a folder — exactly the
  // kind of drift this test file is meant to prevent.
  const walk = (dir) =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) return walk(fullPath);
      const isIntegrationSource =
        entry.isFile() && (entry.name.endsWith('.mjs') || entry.name.endsWith('.js'));
      return isIntegrationSource ? [fullPath] : [];
    });
  return walk(integrationsDir);
}

/**
 * Strip block and line comments from JavaScript source so contract
 * assertions run against only the runtime code path.
 *
 * This is not a full parser — it doesn't correctly handle comment-like
 * syntax inside string or template literals. That's acceptable here
 * because the repo's integration files don't have any `dir.pathname`
 * or `fileURLToPath` inside strings, and the test would catch any
 * regression that did try to hide the bug inside a string literal.
 */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '') // block comments
    .replace(/\/\/.*$/gm, '');         // line comments
}

const integrationFiles = listIntegrationFiles();

describe('Astro integration contracts (Windows portability)', () => {
  it('finds at least one integration file', () => {
    // Canary: if the integrations directory goes empty or gets renamed,
    // fail loudly rather than passing an empty suite.
    expect(integrationFiles.length).toBeGreaterThan(0);
  });

  describe.each(integrationFiles.map((file) => [file]))('%s', (file) => {
    const source = readFileSync(file, 'utf-8');
    const runtime = stripComments(source);
    // Check the comment-stripped runtime, not raw source — otherwise a
    // comment mentioning `astro:build:done` could falsely trigger the
    // import assertion on a file that never actually hooks the build.
    const usesBuildDoneHook = runtime.includes('astro:build:done');

    it('does not reference dir.pathname in runtime code', () => {
      // The explanatory comments (`// dir.pathname yields /C:/path/...`)
      // are allowed — they document WHY we use fileURLToPath. Only the
      // runtime code path is checked, after stripping comments.
      expect(
        runtime,
        `${file} still references dir.pathname in runtime code. ` +
          `Use fileURLToPath(dir) from node:url instead — dir.pathname ` +
          `yields /C:/path/... on Windows and breaks path.join. ` +
          `See #171 / #173 for the documented pattern.`
      ).not.toMatch(/\bdir\.pathname\b/);
    });

    it.runIf(usesBuildDoneHook)(
      'imports fileURLToPath from node:url when it uses astro:build:done',
      () => {
        // Match against the comment-stripped runtime so a commented-out
        // `// import { fileURLToPath } from 'node:url'` can't falsely
        // satisfy the contract.
        expect(
          runtime,
          `${file} uses the astro:build:done hook but does not import ` +
            `fileURLToPath. Every integration that consumes the 'dir' ` +
            `parameter must convert it via fileURLToPath(dir) — see ` +
            `specs/seo-metadata.md requirement 16.`
        ).toMatch(/import\s*\{[^}]*\bfileURLToPath\b[^}]*\}\s*from\s*['"]node:url['"]/);
      }
    );
  });
});
