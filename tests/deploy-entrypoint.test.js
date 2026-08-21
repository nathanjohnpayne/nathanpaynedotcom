import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const rootDir = resolve(__dirname, '..');
const packageJson = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf-8'));
const deploymentDoc = readFileSync(resolve(rootDir, 'DEPLOYMENT.md'), 'utf-8');
const agentsDeploymentDoc = readFileSync(
  resolve(rootDir, 'docs/agents/deployment-process.md'),
  'utf-8',
);

describe('deploy entrypoint contract', () => {
  it('builds, deploys with the PATH-provided helper, then purges Cloudflare', () => {
    const deployScript = packageJson.scripts.deploy;

    expect(deployScript).toBe('npm run build && op-firebase-deploy && scripts/cf-cache-purge.sh');
    expect(deployScript).not.toMatch(/\bfirebase\s+deploy\b/);
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
