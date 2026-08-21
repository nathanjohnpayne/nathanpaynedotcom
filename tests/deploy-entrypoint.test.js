import { describe, expect, it } from 'vitest';
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
  it('checks client env, builds, deploys with the PATH-provided helper, then purges Cloudflare', () => {
    const deployScript = packageJson.scripts.deploy;

    expect(deployScript).toBe(
      'scripts/check-deploy-env.sh && npm run build && op-firebase-deploy && scripts/cf-cache-purge.sh',
    );
    expect(deployScript).not.toMatch(/\bfirebase\s+deploy\b/);
  });

  it('gates both deploy aliases on the client env check, before the build', () => {
    // Every PUBLIC_* var degrades gracefully when unset, so `astro build`
    // cannot fail on a missing one — it just publishes a site with no brand
    // logos and no analytics. The only place that can catch it is here, and it
    // has to run before the build so the failure costs seconds, not a full
    // Playwright OG-image pass.
    for (const alias of ['deploy', 'deploy:hosting']) {
      const script = packageJson.scripts[alias];

      expect(script, `package.json needs a ${alias} script`).toBeDefined();
      expect(
        script.indexOf('scripts/check-deploy-env.sh'),
        `${alias} must run the client env check`,
      ).toBeGreaterThanOrEqual(0);
      expect(
        script.indexOf('scripts/check-deploy-env.sh'),
        `${alias} must run the client env check before the build`,
      ).toBeLessThan(script.indexOf('npm run build'));
    }
  });

  it('ships the client env check as an executable repo script', () => {
    const checkPath = resolve(rootDir, 'scripts/check-deploy-env.sh');

    expect(existsSync(checkPath), 'scripts/check-deploy-env.sh is missing').toBe(true);
    expect(
      statSync(checkPath).mode & 0o111,
      'scripts/check-deploy-env.sh is not executable',
    ).toBeGreaterThan(0);
  });

  it('documents the worktree deploy trap wherever the deploy flow is described', () => {
    // Knowing the check exists is not the useful part; knowing that only the
    // main checkout has .env.local is. That is the fact that was missing when
    // a worktree deploy stripped the tokens out of production.
    for (const [label, doc] of [
      ['DEPLOYMENT.md', deploymentDoc],
      ['docs/agents/deployment-process.md', agentsDeploymentDoc],
    ]) {
      expect(doc, `${label} does not mention the client env check`).toContain(
        'scripts/check-deploy-env.sh',
      );
      expect(
        /worktree/i.test(doc),
        `${label} describes the deploy flow without warning that a worktree has no .env.local`,
      ).toBe(true);
    }
  });

  it('does not point at a missing repo-local script', () => {
    const firstToken = packageJson.scripts.deploy.split(/\s+/)[0];

    if (firstToken.startsWith('scripts/')) {
      expect(
        existsSync(resolve(rootDir, firstToken)),
        `${firstToken} is referenced by package.json scripts.deploy but does not exist`,
      ).toBe(true);
    }
  });

  it('keeps DEPLOYMENT.md aligned with the package deploy alias', () => {
    expect(deploymentDoc).toContain('npm run deploy');
    expect(deploymentDoc).toContain('npm run build');
    expect(deploymentDoc).toContain('scripts/cf-cache-purge.sh');
    expect(deploymentDoc).toContain('op-firebase-deploy --only hosting');
  });

  it('offers a hosting-only alias that still purges Cloudflare', () => {
    // The bare `op-firebase-deploy --only hosting` reaches Firebase but leaves
    // the Cloudflare edge serving the previous build, so a deploy can look
    // successful and change nothing users see. There has to be a short form
    // that does the whole job, or people reach for the incomplete one.
    const hostingScript = packageJson.scripts['deploy:hosting'];

    expect(hostingScript, 'package.json needs a deploy:hosting alias').toBeDefined();
    expect(hostingScript).toContain('npm run build');
    expect(hostingScript).toContain('--only hosting');
    expect(hostingScript).toMatch(/scripts\/cf-cache-purge\.sh$/);
    expect(hostingScript).not.toMatch(/\bfirebase\s+deploy\b/);
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

  it('tells agents that merging does not deploy', () => {
    // There is no deploy workflow; a merged PR publishes nothing until someone
    // runs a deploy alias by hand.
    expect(agentsDeploymentDoc).toMatch(/deploys? nothing|no deploy workflow|deploys are manual/i);
  });
});
