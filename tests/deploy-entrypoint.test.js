import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const rootDir = resolve(__dirname, '..');
const packageJson = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf-8'));
const deploymentDoc = readFileSync(resolve(rootDir, 'DEPLOYMENT.md'), 'utf-8');

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
});
