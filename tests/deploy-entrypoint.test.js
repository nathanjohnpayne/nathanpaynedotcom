import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const rootDir = resolve(__dirname, '..');
const packageJson = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf-8'));
const deploymentDoc = readFileSync(resolve(rootDir, 'DEPLOYMENT.md'), 'utf-8');
const agentsDeploymentDoc = readFileSync(
  resolve(rootDir, 'docs/agents/deployment-process.md'),
  'utf-8',
);

describe('deploy entrypoint contract', () => {
  const aliases = {
    deploy: 'scripts/deploy-artifact.sh',
    'deploy:hosting': 'scripts/deploy-artifact.sh --hosting-only',
  };

  it('keeps both deploy aliases as names that fail closed and name the replacement', () => {
    // Deploying must never build locally with credentials present (#1104), and
    // the aliases must not run deploy-artifact.sh through npm either: npm
    // honors a repo .npmrc script-shell and prepends node_modules/.bin. So they
    // only print the replacement and exit 1.
    for (const [alias, replacement] of Object.entries(aliases)) {
      const script = packageJson.scripts[alias];

      expect(script, `package.json needs a ${alias} script`).toBeDefined();
      expect(script).toContain(replacement);
      expect(script).toContain('--dry-run');
      expect(script).toMatch(/>&2/);
      expect(script).toMatch(/exit 1$/);
      for (const forbidden of ['npm run build', 'op-firebase-deploy', 'cf-cache-purge']) {
        expect(script, `${alias} must not contain ${forbidden}`).not.toContain(forbidden);
      }
      expect(script).not.toMatch(/\bfirebase\s+deploy\b/);
    }
  });

  it.each(Object.keys(aliases))(
    'exits non-zero and prints the replacement for npm run %s',
    (alias) => {
      const result = spawnSync('sh', ['-c', packageJson.scripts[alias]], { encoding: 'utf-8' });

      expect(result.status).toBe(1);
      expect(result.stdout).toBe('');
      expect(result.stderr).toContain(aliases[alias]);
      expect(result.stderr).toContain('--dry-run');
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
      expect(doc, label).toContain('scripts/deploy-artifact.sh --dry-run');
      expect(doc, label).toContain('scripts/deploy-artifact.sh --hosting-only');
      expect(doc, label).toContain('Build Artifact');
      expect(doc, label).toContain('--mode all');
      expect(doc, label).toContain('--sha');
      expect(doc, label).toMatch(/no longer deploy/);
      expect(doc, label).not.toMatch(/not yet the default/i);
    }
    expect(deploymentDoc).toContain('scripts/cf-cache-purge.sh');
    expect(deploymentDoc).toContain('op-firebase-deploy --only hosting');
    expect(deploymentDoc).toContain('never through `npm run`');
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
