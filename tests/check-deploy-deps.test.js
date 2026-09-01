import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const rootDir = resolve(__dirname, '..');
const scriptPath = resolve(rootDir, 'scripts/check-deploy-deps.sh');

/**
 * Run the guard against a throwaway checkout with a synthetic lockfile and a
 * synthetic node_modules. Same sandbox shape as check-deploy-env.test.js: the
 * script resolves its own root from $BASH_SOURCE, so it gets a copy rather
 * than a flag, which also proves root resolution works from an arbitrary path.
 *
 * `packages` is the lockfile's `packages` map. `installed` maps a package name
 * to the version to write into its manifest, or `null` to leave it uninstalled.
 */
function runCheck({ packages, installed, env = {}, omitLock = false, omitModules = false } = {}) {
  const workDir = mkdtempSync(join(tmpdir(), 'check-deploy-deps-test-'));
  try {
    mkdirSync(join(workDir, 'scripts'));
    copyFileSync(scriptPath, join(workDir, 'scripts/check-deploy-deps.sh'));

    if (!omitLock) {
      writeFileSync(
        join(workDir, 'package-lock.json'),
        JSON.stringify({ lockfileVersion: 3, packages: { '': { name: 'sandbox' }, ...packages } }),
        'utf-8',
      );
    }

    if (!omitModules) {
      mkdirSync(join(workDir, 'node_modules'));
      for (const [name, version] of Object.entries(installed ?? {})) {
        if (version === null) continue;
        const dir = join(workDir, 'node_modules', name);
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, 'package.json'), JSON.stringify({ name, version }), 'utf-8');
      }
    }

    // spawnSync rather than execFileSync: the guard writes its refusal AND its
    // break-glass notice to stderr, and execFileSync surfaces stderr only on a
    // non-zero exit. The break-glass path exits 0 while still printing to
    // stderr, so an execFileSync harness cannot see the one line that proves
    // the override announced itself.
    const run = spawnSync('bash', [join(workDir, 'scripts/check-deploy-deps.sh')], {
      encoding: 'utf-8',
      env: { ...process.env, ...env },
    });

    return { status: run.status, output: `${run.stdout ?? ''}${run.stderr ?? ''}` };
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

describe('check-deploy-deps.sh', () => {
  it('passes when every installed package matches the lockfile', () => {
    const result = runCheck({
      packages: {
        'node_modules/astro': { version: '7.2.9' },
        'node_modules/zod': { version: '4.3.6' },
      },
      installed: { astro: '7.2.9', zod: '4.3.6' },
    });

    expect(result.status).toBe(0);
    expect(result.output).toContain('match package-lock.json');
  });

  it('refuses the deploy on the exact drift that shipped in #900', () => {
    // astro@7.2.4 against a lockfile pinning 7.2.9 is not a hypothetical
    // shape: it is what published ~4px Mermaid labels for an already-merged,
    // already-green fix. The diagnostic has to name both versions, because
    // "something is stale" does not tell you what to reinstall.
    const result = runCheck({
      packages: { 'node_modules/astro': { version: '7.2.9' } },
      installed: { astro: '7.2.4' },
    });

    expect(result.status).toBe(1);
    expect(result.output).toContain('astro');
    expect(result.output).toContain('7.2.9');
    expect(result.output).toContain('7.2.4');
    expect(result.output).toContain('npm ci');
  });

  it('refuses when a non-optional package is absent entirely', () => {
    const result = runCheck({
      packages: { 'node_modules/zod': { version: '4.3.6' } },
      installed: { zod: null },
    });

    expect(result.status).toBe(1);
    expect(result.output).toContain('zod');
    expect(result.output).toContain('not installed');
  });

  it('ignores an optional package that this platform did not install', () => {
    // The lockfile enumerates every platform's prebuilt binaries — 107 of them
    // in this repo — and npm installs only the ones matching the host. Treating
    // those as drift would make the guard fail on every correct checkout, which
    // is the failure mode that gets a guard deleted rather than fixed.
    const result = runCheck({
      packages: {
        '@rollup/rollup-linux-x64-gnu': { version: '4.0.0', optional: true },
        'node_modules/@rollup/rollup-linux-x64-gnu': { version: '4.0.0', optional: true },
        'node_modules/astro': { version: '7.2.9' },
      },
      installed: { astro: '7.2.9' },
    });

    expect(result.status).toBe(0);
  });

  it('still version-checks an optional package that IS installed', () => {
    // Exempting absent optional packages must not become exempting optional
    // packages. A drifted binary that is actually being linked into the build
    // is exactly as dangerous as a drifted direct dependency.
    const result = runCheck({
      packages: { 'node_modules/esbuild-darwin-arm64': { version: '0.21.5', optional: true } },
      installed: { 'esbuild-darwin-arm64': '0.19.0' },
    });

    expect(result.status).toBe(1);
    expect(result.output).toContain('esbuild-darwin-arm64');
    expect(result.output).toContain('0.19.0');
  });

  it('skips workspace link entries, which carry no version of their own', () => {
    const result = runCheck({
      packages: {
        'node_modules/some-workspace': { link: true, resolved: 'packages/some-workspace' },
        'node_modules/astro': { version: '7.2.9' },
      },
      installed: { astro: '7.2.9' },
    });

    expect(result.status).toBe(0);
  });

  it('reports every drifted package, not just the first', () => {
    const result = runCheck({
      packages: {
        'node_modules/astro': { version: '7.2.9' },
        'node_modules/zod': { version: '4.3.6' },
      },
      installed: { astro: '7.2.4', zod: '3.0.0' },
    });

    expect(result.status).toBe(1);
    expect(result.output).toContain('astro');
    expect(result.output).toContain('zod');
    expect(result.output).toContain('2 package(s) differ');
  });

  it('downgrades to a warning under the documented break-glass', () => {
    const result = runCheck({
      packages: { 'node_modules/astro': { version: '7.2.9' } },
      installed: { astro: '7.2.4' },
      env: { DEPLOY_ALLOW_DEP_DRIFT: '1' },
    });

    expect(result.status).toBe(0);
    expect(result.output).toContain('DEPLOY_ALLOW_DEP_DRIFT=1');
  });

  it('refuses when node_modules is missing entirely', () => {
    const result = runCheck({
      packages: { 'node_modules/astro': { version: '7.2.9' } },
      omitModules: true,
    });

    expect(result.status).toBe(1);
    expect(result.output).toContain('node_modules');
    expect(result.output).toContain('npm ci');
  });

  it('refuses when there is no lockfile to compare against', () => {
    // Failing closed rather than open: a checkout with no lockfile cannot be
    // shown to match CI, and "cannot verify" is not "verified".
    const result = runCheck({ packages: {}, installed: {}, omitLock: true });

    expect(result.status).toBe(1);
    expect(result.output).toContain('package-lock.json');
  });
});
