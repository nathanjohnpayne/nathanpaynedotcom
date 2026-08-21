import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const rootDir = resolve(__dirname, '..');
const scriptPath = resolve(rootDir, 'scripts/check-deploy-env.sh');

const TEMPLATE = [
  'PUBLIC_LOGODEV_KEY={{ op://Private/aaa/publishable API key }}',
  'PUBLIC_POSTHOG_PROJECT_TOKEN={{ op://Private/bbb/project token }}',
  'PUBLIC_GA_MEASUREMENT_ID={{ op://Private/ccc/measurement id }}',
].join('\n');

const RESOLVED = [
  'PUBLIC_LOGODEV_KEY=pk_resolved',
  'PUBLIC_POSTHOG_PROJECT_TOKEN="phc_resolved"',
  'PUBLIC_GA_MEASUREMENT_ID=G-RESOLVED',
].join('\n');

/**
 * Run the guard against a throwaway checkout. The script resolves its own root
 * from $BASH_SOURCE, so the sandbox gets a copy of the script rather than a
 * flag — which also proves the root resolution works from an arbitrary path.
 */
function runCheck({ template = TEMPLATE, envFiles = {}, env = {} } = {}) {
  const workDir = mkdtempSync(join(tmpdir(), 'check-deploy-env-test-'));
  try {
    mkdirSync(join(workDir, 'scripts'));
    copyFileSync(scriptPath, join(workDir, 'scripts/check-deploy-env.sh'));
    if (template !== null) writeFileSync(join(workDir, '.env.tpl'), `${template}\n`, 'utf-8');
    for (const [name, contents] of Object.entries(envFiles)) {
      writeFileSync(join(workDir, name), `${contents}\n`, 'utf-8');
    }

    // Scrub any real PUBLIC_* vars from the ambient environment so the sandbox
    // decides the outcome, not the developer's shell.
    const baseEnv = Object.fromEntries(
      Object.entries(process.env).filter(([key]) => !key.startsWith('PUBLIC_')),
    );

    // 2>&1 so the diagnostic block is captured on the success path too — the
    // break-glass override exits 0 while still writing its warning to stderr.
    const command = `'${join(workDir, 'scripts/check-deploy-env.sh')}' 2>&1`;
    try {
      return {
        status: 0,
        output: execFileSync('bash', ['-c', command], {
          env: { ...baseEnv, ...env },
          encoding: 'utf-8',
          stdio: ['ignore', 'pipe', 'pipe'],
        }),
      };
    } catch (error) {
      return { status: error.status, output: `${error.stdout ?? ''}${error.stderr ?? ''}` };
    }
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

describe('deploy client-env guard', () => {
  it('passes when every PUBLIC_* var resolves from .env.local', () => {
    const { status, output } = runCheck({ envFiles: { '.env.local': RESOLVED } });

    expect(status).toBe(0);
    expect(output).toContain('PUBLIC_* client vars resolved');
  });

  it('fails the deploy when .env.local is absent, naming every missing var', () => {
    // The worktree case: no .env.local, so the build would silently bake in
    // empty strings and publish a site with no logos and no analytics.
    const { status, output } = runCheck();

    expect(status).toBe(1);
    expect(output).toContain('Refusing to deploy');
    for (const key of [
      'PUBLIC_LOGODEV_KEY',
      'PUBLIC_POSTHOG_PROJECT_TOKEN',
      'PUBLIC_GA_MEASUREMENT_ID',
    ]) {
      expect(output, `${key} should be reported as missing`).toContain(key);
    }
  });

  it('explains the worktree cause and the fix rather than just failing', () => {
    const { output } = runCheck();

    expect(output).toMatch(/worktree/i);
    expect(output).toContain('.env.local');
    expect(output).toContain('bootstrap.sh --force');
  });

  it('rejects a value that is still an unresolved op:// reference', () => {
    // `op inject` not having run is indistinguishable from success at build
    // time — the literal op:// string would be baked into the HTML.
    const { status, output } = runCheck({
      envFiles: {
        '.env.local': RESOLVED.replace(
          'PUBLIC_LOGODEV_KEY=pk_resolved',
          'PUBLIC_LOGODEV_KEY=op://Private/aaa/publishable API key',
        ),
      },
    });

    expect(status).toBe(1);
    expect(output).toContain('unresolved:  PUBLIC_LOGODEV_KEY');
  });

  it('rejects the .env.example placeholder', () => {
    const { status } = runCheck({
      envFiles: {
        '.env.local': RESOLVED.replace(
          'PUBLIC_LOGODEV_KEY=pk_resolved',
          'PUBLIC_LOGODEV_KEY=pk_your_publishable_token_here',
        ),
      },
    });

    expect(status).toBe(1);
  });

  it('accepts a var supplied by the shell environment', () => {
    const { status } = runCheck({
      envFiles: {
        '.env.local': [
          'PUBLIC_POSTHOG_PROJECT_TOKEN=phc_resolved',
          'PUBLIC_GA_MEASUREMENT_ID=G-RESOLVED',
        ].join('\n'),
      },
      env: { PUBLIC_LOGODEV_KEY: 'pk_from_shell' },
    });

    expect(status).toBe(0);
  });

  it('derives required keys from .env.tpl, so a new client var is covered for free', () => {
    // The list is not hardcoded: adding PUBLIC_FOO to .env.tpl must be enough.
    const { status, output } = runCheck({
      template: `${TEMPLATE}\nPUBLIC_FOO={{ op://Private/ddd/field }}`,
      envFiles: { '.env.local': RESOLVED },
    });

    expect(status).toBe(1);
    expect(output).toContain('PUBLIC_FOO');
  });

  it('never prints a resolved token value', () => {
    // The output is read in deploy logs and pasted into issues; key names are
    // safe to show, values are not.
    const { output } = runCheck({
      envFiles: {
        '.env.local': [
          'PUBLIC_LOGODEV_KEY=pk_super_secret_value',
          'PUBLIC_POSTHOG_PROJECT_TOKEN=phc_resolved',
        ].join('\n'),
      },
    });

    expect(output).not.toContain('pk_super_secret_value');
  });

  it('downgrades to a warning under the documented break-glass override', () => {
    const { status, output } = runCheck({ env: { DEPLOY_ALLOW_MISSING_PUBLIC_ENV: '1' } });

    expect(status).toBe(0);
    expect(output).toContain('continuing anyway');
  });

  it('fails loudly when .env.tpl itself is missing', () => {
    // Without the template there is no key list, so passing would be a silent
    // no-op guard — the exact failure mode this script exists to prevent.
    const { status, output } = runCheck({ template: null });

    expect(status).toBe(1);
    expect(output).toContain('.env.tpl not found');
  });
});
