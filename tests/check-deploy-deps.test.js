import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
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
function runCheck({
  packages,
  installed,
  env = {},
  omitLock = false,
  omitModules = false,
  rawLock,
  extraneous = {},
  gitCommitThenDirty = false,
  gitStageRemoval = false,
  symlinked = {},
  nested = {},
} = {}) {
  const workDir = mkdtempSync(join(tmpdir(), 'check-deploy-deps-test-'));
  try {
    mkdirSync(join(workDir, 'scripts'));
    copyFileSync(scriptPath, join(workDir, 'scripts/check-deploy-deps.sh'));

    if (!omitLock) {
      // `rawLock` writes the file verbatim, for the malformed shapes that the
      // normal `packages` path cannot express — a v1 tree, a null map, an array.
      writeFileSync(
        join(workDir, 'package-lock.json'),
        JSON.stringify(
          rawLock ?? { lockfileVersion: 3, packages: { '': { name: 'sandbox' }, ...packages } },
        ),
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

    for (const [name, version] of Object.entries(extraneous)) {
      const dir = join(workDir, 'node_modules', name);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'package.json'), JSON.stringify({ name, version }), 'utf-8');
    }

    if (gitStageRemoval) {
      // `git ls-files` reads the index, so staging the lockfile for removal
      // made the original guard skip itself entirely. HEAD still has the file,
      // which is what the comparison must be against.
      const git = (...args) =>
        spawnSync('git', args, { cwd: workDir, encoding: 'utf-8', env: { ...process.env } });
      git('init', '-q');
      git('config', 'user.email', 'test@example.com');
      git('config', 'user.name', 'test');
      git('config', 'commit.gpgsign', 'false');
      git('add', '-A');
      git('commit', '-q', '-m', 'init');
      git('rm', '--cached', '-q', 'package-lock.json');
    }

    for (const [relPath, version] of Object.entries(nested)) {
      const dir = join(workDir, 'node_modules', ...relPath.split('/'));
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        join(dir, 'package.json'),
        JSON.stringify({ name: relPath.split('/').pop(), version }),
        'utf-8',
      );
    }

    for (const [name, version] of Object.entries(symlinked)) {
      // npm and pnpm link workspace and `npm link`ed packages. A Dirent for a
      // symlink is NOT isDirectory(), so an entry like this was skipped.
      const target = join(workDir, `__linked-${name}`);
      mkdirSync(target, { recursive: true });
      writeFileSync(join(target, 'package.json'), JSON.stringify({ name, version }), 'utf-8');
      symlinkSync(target, join(workDir, 'node_modules', name));
    }

    if (gitCommitThenDirty) {
      // The committed-lockfile check only engages inside a git repo, so this
      // arm builds a real one: commit the lockfile, then modify the working
      // copy the way a bare `npm install` would.
      const git = (...args) =>
        spawnSync('git', args, { cwd: workDir, encoding: 'utf-8', env: { ...process.env } });
      git('init', '-q');
      git('config', 'user.email', 'test@example.com');
      git('config', 'user.name', 'test');
      git('config', 'commit.gpgsign', 'false');
      git('add', 'package-lock.json');
      git('commit', '-q', '-m', 'lock');
      const lockPath = join(workDir, 'package-lock.json');
      const committed = JSON.parse(readFileSync(lockPath, 'utf-8'));
      committed.packages['node_modules/astro'].version = '9.9.9';
      writeFileSync(lockPath, JSON.stringify(committed), 'utf-8');
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

  it('refuses while package-lock.json has uncommitted changes', () => {
    // Codex P1 on #903. CI built this SHA from the COMMITTED lockfile. A
    // working copy modified by a bare `npm install` matches the tree that same
    // install produced, so a naive comparison passes against a dependency set
    // CI never tested — the guard agreeing with itself instead of with CI.
    const result = runCheck({
      packages: { 'node_modules/astro': { version: '7.2.9' } },
      installed: { astro: '7.2.9' },
      gitCommitThenDirty: true,
    });

    expect(result.status).toBe(1);
    expect(result.output).toContain('uncommitted changes');
  });

  it('reports an absent optional package that targets this host', () => {
    // Codex P2 on #903. Exempting every absent optional also exempts one that
    // DOES target this machine — a missing sharp or Astro compiler binding
    // changes the build while the guard reports a match.
    const result = runCheck({
      packages: {
        'node_modules/host-binding': {
          version: '1.0.0',
          optional: true,
          os: [process.platform],
          cpu: [process.arch],
        },
      },
      installed: {},
    });

    expect(result.status).toBe(1);
    expect(result.output).toContain('host-binding');
  });

  it('exempts an absent optional package constrained to a different host', () => {
    const result = runCheck({
      packages: {
        'node_modules/other-host': {
          version: '1.0.0',
          optional: true,
          os: ['sunos'],
          cpu: ['mips'],
        },
        'node_modules/astro': { version: '7.2.9' },
      },
      installed: { astro: '7.2.9' },
    });

    expect(result.status).toBe(0);
  });

  it('exempts an absent optional package with no os/cpu constraints at all', () => {
    // Unconstrained entries are usually transitive deps of a platform-specific
    // parent — the wasm32 fallbacks pull in @emnapi/* and tslib, none of them
    // constrained. Treating "unconstrained" as "targets this host" flagged
    // eleven packages on a clean tree. A guard that is noisy when correct gets
    // switched off, so absence of proof is not proof of applicability.
    const result = runCheck({
      packages: {
        'node_modules/unconstrained-helper': { version: '1.0.0', optional: true },
        'node_modules/astro': { version: '7.2.9' },
      },
      installed: { astro: '7.2.9' },
    });

    expect(result.status).toBe(0);
  });

  it('reports a package installed but absent from the lockfile', () => {
    // Codex P2 on #903. The version loop only looks at what the lockfile knows
    // about, so a `--no-save` install or a leftover from a removed dependency
    // is invisible to it. `npm ci` deletes node_modules outright, so CI never
    // has one.
    const result = runCheck({
      packages: { 'node_modules/astro': { version: '7.2.9' } },
      installed: { astro: '7.2.9' },
      extraneous: { 'ghost-package': '9.9.9' },
    });

    expect(result.status).toBe(1);
    expect(result.output).toContain('ghost-package');
    expect(result.output).toContain('not in lockfile');
  });

  it('refuses when HEAD carries no lockfile, even though one exists on disk', () => {
    // CodeRabbit on #903. `git ls-files --error-unmatch` reads the INDEX, so
    // staging the lockfile for removal made it fail and skipped the guard
    // outright — after which a regenerated, now-untracked lockfile and its
    // matching node_modules pass a comparison CI never made.
    const result = runCheck({
      packages: { 'node_modules/astro': { version: '7.2.9' } },
      installed: { astro: '7.2.9' },
      gitStageRemoval: true,
    });

    expect(result.status).toBe(1);
    expect(result.output).toContain('does not match HEAD');
  });

  it('reports an extraneous package nested under another package', () => {
    // Codex P2 on #903. Node resolves a nested copy ahead of the hoisted one,
    // so an obsolete package left under a parent changes the build while a
    // top-level-only scan reports a clean tree. The lockfile keys nested
    // installs by full path, so this compares exactly like a hoisted one.
    const result = runCheck({
      packages: { 'node_modules/astro': { version: '7.2.9' } },
      installed: { astro: '7.2.9' },
      nested: { 'astro/node_modules/nested-ghost': '6.6.6' },
    });

    expect(result.status).toBe(1);
    expect(result.output).toContain('astro/node_modules/nested-ghost');
    expect(result.output).toContain('not in lockfile');
  });

  it('accepts a nested package the lockfile declares at that exact path', () => {
    // The other half: npm legitimately nests a package when versions conflict,
    // and the lockfile records it at its full path. Reporting those would make
    // the guard fail on every correct tree.
    const result = runCheck({
      packages: {
        'node_modules/astro': { version: '7.2.9' },
        'node_modules/astro/node_modules/js-yaml': { version: '4.3.1' },
      },
      installed: { astro: '7.2.9' },
      nested: { 'astro/node_modules/js-yaml': '4.3.1' },
    });

    expect(result.status).toBe(0);
  });

  it('reports a symlinked package absent from the lockfile', () => {
    const result = runCheck({
      packages: { 'node_modules/astro': { version: '7.2.9' } },
      installed: { astro: '7.2.9' },
      symlinked: { 'ghost-link': '9.9.9' },
    });

    expect(result.status).toBe(1);
    expect(result.output).toContain('ghost-link');
    expect(result.output).toContain('not in lockfile');
  });

  it('exempts an absent optional package whose libc cannot match this host', () => {
    // A libc constraint is meaningful only on Linux. On any other platform a
    // package declaring one cannot be targeting this host, so its absence is
    // not drift. Guarded so the suite does not depend on the runner's libc.
    const result = runCheck({
      packages: {
        'node_modules/musl-only': {
          version: '1.0.0',
          optional: true,
          os: ['linux'],
          cpu: [process.arch],
          libc: ['musl'],
        },
        'node_modules/astro': { version: '7.2.9' },
      },
      installed: { astro: '7.2.9' },
    });

    if (process.platform === 'linux') return;
    expect(result.status).toBe(0);
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

  // A guard that fails open is worse than no guard: it also reports that it
  // passed. Every shape below made the original version print "safe to build"
  // over an empty node_modules, because `lock.packages ?? {}` turned "cannot
  // read this" into "nothing to check". Found by CodeRabbit on #903.
  it.each([
    {
      shape: 'a lockfileVersion 1 tree, which keys packages under "dependencies"',
      rawLock: { lockfileVersion: 1, dependencies: { astro: { version: '7.2.9' } } },
    },
    { shape: 'a null packages map', rawLock: { lockfileVersion: 3, packages: null } },
    // typeof [] === 'object', and Object.entries([]) is happily empty, so an
    // array slips past a naive object check and verifies nothing.
    { shape: 'an array in place of the packages map', rawLock: { lockfileVersion: 3, packages: [] } },
  ])('refuses $shape rather than verifying nothing', ({ rawLock }) => {
    const result = runCheck({ rawLock, installed: {} });

    expect(result.status).toBe(1);
    expect(result.output).toContain('cannot verify dependencies');
  });

  it('refuses a lockfile that parses but declares no installable packages', () => {
    // The same failure one step later: a well-formed map containing only the
    // root entry checks zero packages, and an empty drift report is
    // indistinguishable from a clean one unless the count is asserted.
    const result = runCheck({
      rawLock: { lockfileVersion: 3, packages: { '': { name: 'sandbox' } } },
      installed: {},
    });

    expect(result.status).toBe(1);
    expect(result.output).toContain('cannot verify dependencies');
  });

  it('refuses when there is no lockfile to compare against', () => {
    // Failing closed rather than open: a checkout with no lockfile cannot be
    // shown to match CI, and "cannot verify" is not "verified".
    const result = runCheck({ packages: {}, installed: {}, omitLock: true });

    expect(result.status).toBe(1);
    expect(result.output).toContain('package-lock.json');
  });

  it('honours the break-glass on the missing-lockfile path too', () => {
    // Codex P2 on #903. This refusal used to `exit 1` directly, so the
    // documented override worked for malformed lockfiles and for version drift
    // but not for the most drastic case of all — a break-glass that silently
    // does not cover the condition someone reaching for it is most likely
    // hitting.
    const result = runCheck({
      packages: {},
      installed: {},
      omitLock: true,
      env: { DEPLOY_ALLOW_DEP_DRIFT: '1' },
    });

    expect(result.status).toBe(0);
    expect(result.output).toContain('DEPLOY_ALLOW_DEP_DRIFT=1');
  });
});
