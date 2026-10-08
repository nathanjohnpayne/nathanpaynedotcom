// @vitest-environment node
//
// #1079 analytics privacy controls — the feature flag and its flag-off
// regression check (specs/analytics-privacy.md § Feature Flag, PRIV-15).
//
// The flag-off check builds the site in mode `production` with fixed fake
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
  isPrivacyTestBuild,
  privacyControlsEnabled,
} from '../src/lib/privacy-flag.ts';
import {
  FLAG_OFF_ENV,
  RUNTIME_MARKERS,
  analyticsRegion,
  buildFlagOff,
  readTextFiles,
} from './helpers/analytics-region.js';

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
    expect(privacyControlsEnabled('privacy-test')).toBe(true);
    for (const mode of ['production', 'development', 'test', '', 'privacy-test ', 'PRIVACY-TEST']) {
      expect(privacyControlsEnabled(mode)).toBe(false);
      expect(isPrivacyTestBuild(mode)).toBe(false);
    }
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

  beforeAll(async () => {
    outDir = await mkdtemp(join(tmpdir(), 'np-flag-off-'));
    await buildFlagOff(outDir, ROOT);
    files = await readTextFiles(outDir);
  }, 600_000);

  afterAll(async () => {
    if (outDir) await rm(outDir, { recursive: true, force: true });
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

  it('emits no privacy runtime marker in any file', () => {
    const hits = [];
    for (const f of files) {
      for (const marker of RUNTIME_MARKERS) {
        if (f.text.includes(marker)) hits.push(`${f.path}: ${marker}`);
      }
    }
    expect(hits).toEqual([]);
  });
});
