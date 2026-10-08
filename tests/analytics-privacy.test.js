// @vitest-environment node
//
// #1079 analytics privacy controls — the feature flag and its flag-off
// regression check (specs/analytics-privacy.md § Feature Flag, PRIV-15).
//
// The flag-off check reads a site built in mode `production` with fixed fake
// tokens and requires the result to be indistinguishable from `main` at the
// contract's base commit: every page's analytics region byte-identical to the
// captured fixture, no privacy route or test fixture, and no runtime marker in
// any emitted file. Do not regenerate the fixture to make this pass; a
// difference means the flag-off build changed. #1233 replaces this check when
// it commits the flag on.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  PRIVACY_CONTROLS_COMMITTED,
  PRIVACY_TEST_MODE,
  flagStateForMode,
  isPrivacyTestBuild,
  privacyControlsEnabled,
} from '../src/lib/privacy-flag.ts';
import { execFileSync } from 'node:child_process';
import {
  FLAG_OFF_ENV,
  analyticsRegion,
  buildFlagOff,
  findRuntimeMarkers,
  readTextFiles,
} from '../scripts/lib/analytics-region.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const fixture = JSON.parse(
  readFileSync(join(ROOT, 'tests/fixtures/privacy/flag-off-analytics-region.json'), 'utf8'),
);
const flagSrc = readFileSync(join(ROOT, 'src/lib/privacy-flag.ts'), 'utf8');
const fixturePageSrc = readFileSync(
  join(ROOT, 'src/pages/test-fixtures/privacy/[...index].astro'),
  'utf8',
);
const baseLayoutSrc = readFileSync(join(ROOT, 'src/layouts/BaseLayout.astro'), 'utf8');

describe('privacy flag', () => {
  it('is committed off until #1233', () => {
    expect(PRIVACY_CONTROLS_COMMITTED).toBe(false);
  });

  it('is enabled by the privacy-test mode and by nothing else', () => {
    expect(PRIVACY_TEST_MODE).toBe('privacy-test');
    expect(flagStateForMode('privacy-test')).toEqual({ enabled: true, testBuild: true });
    for (const mode of ['production', 'development', 'test', '', 'privacy-test ', 'PRIVACY-TEST']) {
      expect(flagStateForMode(mode)).toEqual({ enabled: false, testBuild: false });
    }
  });

  it('exposes parameterless gates bound to the actual Astro mode', () => {
    // Vitest runs in mode `test`, so both gates read false here.
    expect(privacyControlsEnabled.length).toBe(0);
    expect(isPrivacyTestBuild.length).toBe(0);
    expect(privacyControlsEnabled()).toBe(false);
    expect(isPrivacyTestBuild()).toBe(false);
  });

  it('keeps the mode-taking decision table out of every component', () => {
    // git grep exits 1 on no match; that is the expected, passing outcome.
    const gitGrep = (...args) => {
      try {
        return execFileSync('git', ['grep', '--untracked', ...args, '--', 'src'], { cwd: ROOT })
          .toString()
          .trim()
          .split('\n');
      } catch (err) {
        if (err.status === 1) return [];
        throw err;
      }
    };
    expect(gitGrep('-l', 'flagStateForMode')).toEqual(['src/lib/privacy-flag.ts']);
    const withArgs = gitGrep('-nE', '(privacyControlsEnabled|isPrivacyTestBuild)\\([^)]').filter(
      (line) => !line.startsWith('src/lib/privacy-flag.ts:'),
    );
    expect(withArgs).toEqual([]);
  });

  it('reads only the Astro mode, so no env var, file, or query string can override it', () => {
    const envReads = flagSrc.match(/import\.meta\.env\.[A-Z_]+/g) ?? [];
    expect(new Set(envReads)).toEqual(new Set(['import.meta.env.MODE']));
    expect(flagSrc).not.toMatch(/process\.env|location|localStorage|readFile/);
  });

  it('builds the test fixture page only in the privacy-test mode', () => {
    expect(fixturePageSrc).toMatch(/isPrivacyTestBuild\(\)\s*\?/);
    expect(fixturePageSrc).not.toMatch(/privacyControlsEnabled/);
  });

  it('mounts every privacy component in BaseLayout behind the flag', () => {
    expect(baseLayoutSrc).toContain('{privacyEnabled && <PrivacyHead />}');
    expect(baseLayoutSrc).toContain('{privacyEnabled && <PrivacyBody />}');
    expect(baseLayoutSrc.indexOf('<PrivacyHead />')).toBeLessThan(
      baseLayoutSrc.indexOf('<!-- PostHog -->'),
    );
  });
});

describe('flag-off build is unchanged (PRIV-15)', () => {
  let outDir;
  let files;

  // `npm test` builds dist-flag-off/ before the main build and passes it in
  // NP_FLAG_OFF_DIST, so no build runs while other suites read `.astro/`.
  // Run on its own (vitest run tests/analytics-privacy.test.js), the suite
  // builds a fresh copy into a temp directory instead of trusting a stale one.
  let ownBuild = false;

  beforeAll(async () => {
    if (process.env.NP_FLAG_OFF_DIST) {
      outDir = resolve(ROOT, process.env.NP_FLAG_OFF_DIST);
    } else {
      outDir = await mkdtemp(join(tmpdir(), 'np-flag-off-'));
      ownBuild = true;
      await buildFlagOff(outDir, ROOT);
    }
    files = await readTextFiles(outDir);
  }, 600_000);

  afterAll(async () => {
    if (ownBuild) await rm(outDir, { recursive: true, force: true });
  });

  it('compares against an intact fixture captured with the same tokens', () => {
    expect(createHash('sha256').update(fixture.region).digest('hex')).toBe(fixture.sha256);
    expect(fixture.tokens).toEqual({
      PUBLIC_POSTHOG_PROJECT_TOKEN: FLAG_OFF_ENV.PUBLIC_POSTHOG_PROJECT_TOKEN,
      PUBLIC_GA_MEASUREMENT_ID: FLAG_OFF_ENV.PUBLIC_GA_MEASUREMENT_ID,
    });
    expect(fixture.region).toContain(FLAG_OFF_ENV.PUBLIC_POSTHOG_PROJECT_TOKEN);
    expect(fixture.region).toContain(FLAG_OFF_ENV.PUBLIC_GA_MEASUREMENT_ID);
  });

  it('keeps every page analytics region byte-identical to the base commit', () => {
    const pages = files.filter((f) => f.path.endsWith('.html'));
    expect(pages.length).toBeGreaterThan(10);
    const mismatched = pages
      .filter((p) => analyticsRegion(p.text) !== fixture.region)
      .map((p) => p.path);
    expect(mismatched).toEqual([]);
  });

  it('emits no privacy route and no test fixture', () => {
    expect(existsSync(join(outDir, 'privacy'))).toBe(false);
    expect(existsSync(join(outDir, 'test-fixtures'))).toBe(false);
    const linked = files
      .filter((f) => /href="\/(privacy|test-fixtures)\//.test(f.text))
      .map((f) => f.path);
    expect(linked).toEqual([]);
  });

  it('emits no privacy runtime marker in any file, of any type', async () => {
    expect(await findRuntimeMarkers(outDir)).toEqual([]);
  });
});
