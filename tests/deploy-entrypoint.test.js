import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const rootDir = resolve(__dirname, '..');
const packageJson = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf-8'));
const deploymentDoc = readFileSync(resolve(rootDir, 'DEPLOYMENT.md'), 'utf-8');
const agentsDeploymentDoc = readFileSync(
  resolve(rootDir, 'docs/agents/deployment-process.md'),
  'utf-8',
);

describe('deploy entrypoint contract', () => {
  it('has no deploy or deploy:hosting npm script at all', () => {
    // npm runs its configured script-shell before any script body executes,
    // and a repository or untracked .npmrc can point it at checkout code, so
    // even an alias that only echoes would hand that code the preflight
    // environment. The only deploy command is scripts/deploy-artifact.sh.
    expect(packageJson.scripts).not.toHaveProperty('deploy');
    expect(packageJson.scripts).not.toHaveProperty('deploy:hosting');
    for (const [name, body] of Object.entries(packageJson.scripts)) {
      for (const forbidden of ['op-firebase-deploy', 'cf-cache-purge', 'deploy-artifact.sh']) {
        expect(body, `script ${name} must not reference ${forbidden}`).not.toContain(forbidden);
      }
    }
  });

  it.each(['deploy', 'deploy:hosting'])(
    "npm run %s fails with npm's missing-script error and runs nothing",
    (alias) => {
      const sandbox = mkdtempSync(join(tmpdir(), 'deploy-entrypoint-'));
      try {
        const bin = join(sandbox, 'bin');
        const home = join(sandbox, 'home');
        const ran = join(sandbox, 'ran');
        mkdirSync(bin);
        mkdirSync(home);
        for (const tool of ['firebase', 'op-firebase-deploy', 'op']) {
          const path = join(bin, tool);
          writeFileSync(path, `#!/bin/sh\ntouch "${ran}"\n`);
          chmodSync(path, 0o755);
        }
        const result = spawnSync('npm', ['run', alias], {
          cwd: rootDir,
          encoding: 'utf-8',
          env: {
            PATH: `${bin}:${dirname(process.execPath)}:/usr/bin:/bin`,
            HOME: home,
            npm_config_userconfig: join(home, '.npmrc'),
            npm_config_globalconfig: join(home, 'global-npmrc'),
            npm_config_update_notifier: 'false',
          },
        });

        expect(result.status).not.toBe(0);
        expect(`${result.stdout}${result.stderr}`).toMatch(/missing script/i);
        expect(existsSync(ran), 'a deploy tool ran').toBe(false);
      } finally {
        rmSync(sandbox, { recursive: true, force: true });
      }
    },
  );

  it('ships the client env check as an executable repo script', () => {
    // build-artifact.yml runs it before building, so it stays.
    const checkPath = resolve(rootDir, 'scripts/check-deploy-env.sh');

    expect(existsSync(checkPath), 'scripts/check-deploy-env.sh is missing').toBe(true);
    expect(
      statSync(checkPath).mode & 0o111,
      'scripts/check-deploy-env.sh is not executable',
    ).toBeGreaterThan(0);
  });

  it('ships the dependency check as an executable repo script', () => {
    const checkPath = resolve(rootDir, 'scripts/check-deploy-deps.sh');

    expect(existsSync(checkPath), 'scripts/check-deploy-deps.sh is missing').toBe(true);
    expect(
      statSync(checkPath).mode & 0o111,
      'scripts/check-deploy-deps.sh is not executable',
    ).toBeGreaterThan(0);
  });

  it('ships the artifact deploy script as an executable repo script', () => {
    const deployPath = resolve(rootDir, 'scripts/deploy-artifact.sh');

    expect(existsSync(deployPath), 'scripts/deploy-artifact.sh is missing').toBe(true);
    expect(statSync(deployPath).mode & 0o111).toBeGreaterThan(0);
  });

  it('documents the main-checkout rule wherever the deploy flow is described', () => {
    // Only the main checkout has .env.local, and it is where preflight and the
    // verified-copy check expect to run. A worktree is the wrong place to deploy.
    for (const [label, doc] of [
      ['DEPLOYMENT.md', deploymentDoc],
      ['docs/agents/deployment-process.md', agentsDeploymentDoc],
    ]) {
      expect(doc, `${label} does not mention the client env check`).toContain(
        'scripts/check-deploy-env.sh',
      );
      expect(
        /worktree/i.test(doc),
        `${label} describes the deploy flow without warning against a worktree`,
      ).toBe(true);
    }
  });

  it('keeps the docs aligned with the artifact deploy', () => {
    for (const [label, doc] of [
      ['DEPLOYMENT.md', deploymentDoc],
      ['docs/agents/deployment-process.md', agentsDeploymentDoc],
    ]) {
      // The dry run and the deploy are pinned to the same approved SHA (Codex P1, PR #1249).
      expect(doc, label).toContain('scripts/deploy-artifact.sh --sha "$SHA" --dry-run');
      expect(doc, label).toContain('scripts/deploy-artifact.sh --sha "$SHA" --hosting-only');
      // ...and the SHA is read only after refreshing origin/main (Codex P1, PR #1249).
      expect(doc, label).toMatch(
        /git pull --ff-only[^\n]*\n\s*SHA="\$\(git rev-parse origin\/main\)"/,
      );
      expect(doc, label).toContain('Build Artifact');
      expect(doc, label).toContain('--mode all');
      expect(doc, label).toContain('--sha');
      expect(doc, label).toMatch(/no npm deploy alias|There is no npm deploy alias/);
      expect(doc, label).not.toMatch(/not yet the default/i);
    }
    expect(deploymentDoc).toContain('scripts/cf-cache-purge.sh');
    expect(deploymentDoc).toContain('op-firebase-deploy --only hosting');
    expect(deploymentDoc).toContain('never through `npm run`');
    expect(deploymentDoc).toContain('Missing script');
    expect(deploymentDoc).toMatch(/script-shell/);
  });

  it('flags the bare hosting invocation as incomplete wherever it is shown', () => {
    // Documenting the bare form is fine; documenting it without the warning is
    // how it gets copied. Every place that shows it must say it skips the purge.
    for (const [label, doc] of [
      ['DEPLOYMENT.md', deploymentDoc],
      ['docs/agents/deployment-process.md', agentsDeploymentDoc],
    ]) {
      if (!doc.includes('op-firebase-deploy --only hosting')) continue;
      expect(
        /INCOMPLETE|does \*\*not\*\* purge|not purge Cloudflare|does not purge/i.test(doc),
        `${label} shows the bare hosting invocation without warning that it skips the Cloudflare purge`,
      ).toBe(true);
    }
  });

  it('tells agents that merging does not deploy and never to use the npm aliases', () => {
    expect(agentsDeploymentDoc).toMatch(/deploys? nothing|no deploy workflow|deploys are manual/i);
    expect(agentsDeploymentDoc).toContain('Never run `npm run deploy`');
  });
});
