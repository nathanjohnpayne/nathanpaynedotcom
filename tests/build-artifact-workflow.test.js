import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import YAML from 'yaml';

// Structural contract for the credential-free build (#1238, part of #1104).
// The workflow cannot run here, so these assertions pin the properties a
// reviewer would otherwise have to re-derive from the YAML on every edit.
const source = readFileSync(
  resolve(__dirname, '..', '.github/workflows/build-artifact.yml'),
  'utf-8',
);
const workflow = YAML.parse(source);
const { build, attest } = workflow.jobs;
const usesOf = (job) => job.steps.filter((step) => step.uses).map((step) => step.uses);
const PUBLIC_KEYS = [
  'PUBLIC_POSTHOG_PROJECT_TOKEN',
  'PUBLIC_GA_MEASUREMENT_ID',
  'PUBLIC_LOGODEV_KEY',
];

describe('build-artifact workflow (#1238)', () => {
  it('reads no secrets anywhere', () => {
    expect(source).not.toMatch(/secrets\./);
  });

  it('runs on main, on dispatch, and on PRs that touch the pipeline', () => {
    expect(workflow.on.push.branches).toEqual(['main']);
    expect(workflow.on).toHaveProperty('workflow_dispatch');
    // Every file only this job reads, so a PR that changes one proves the job before main.
    expect(workflow.on.pull_request.paths).toEqual(
      expect.arrayContaining([
        '.github/workflows/build-artifact.yml',
        'scripts/check-build-env-credential-free.sh',
        'scripts/check-deploy-env.sh',
        '.env.tpl',
        '.nvmrc',
      ]),
    );
    expect(workflow.permissions).toEqual({});
  });

  it('gives the build job read-only contents and nothing else', () => {
    expect(build.permissions).toEqual({ contents: 'read' });
  });

  it('passes the build job only the three public values, from vars', () => {
    expect(Object.keys(build.env).sort()).toEqual([...PUBLIC_KEYS].sort());
    for (const key of PUBLIC_KEYS) {
      expect(build.env[key]).toBe(`\${{ vars.${key} }}`);
    }
    for (const step of build.steps) {
      const values = Object.values({ ...step.env, ...step.with }).map(String);
      expect(
        values.some((value) => /secrets|github\.token/.test(value)),
        step.name ?? step.uses,
      ).toBe(false);
    }
  });

  it('checks out without persisting credentials and asserts the environment before npm ci', () => {
    const checkout = build.steps.find((step) => step.uses?.startsWith('actions/checkout@'));
    expect(checkout.with['persist-credentials']).toBe(false);

    const names = build.steps.map((step) => step.name ?? step.uses);
    const assertIndex = build.steps.findIndex((step) =>
      step.run?.includes('scripts/check-build-env-credential-free.sh --checkout'),
    );
    const npmCiIndex = names.indexOf('npm ci');
    expect(assertIndex).toBeGreaterThan(-1);
    expect(assertIndex).toBeLessThan(npmCiIndex);
  });

  it('restores no dependency cache', () => {
    const setupNode = build.steps.find((step) => step.uses?.startsWith('actions/setup-node@'));
    expect(setupNode.with['package-manager-cache']).toBe(false);
    expect(setupNode.with.cache).toBeUndefined();
    expect(usesOf(build).some((uses) => uses.startsWith('actions/cache'))).toBe(false);
  });

  it('builds in production mode, never the privacy-test mode', () => {
    const buildStep = build.steps.find((step) => step.name === 'Production build');
    expect(buildStep.run).toBe('npm run build -- --mode production');
    expect(source).not.toMatch(/privacy-test --|build:privacy-test/);
  });

  it('uploads only from main, under the commit SHA', () => {
    const upload = build.steps.find((step) => step.uses?.startsWith('actions/upload-artifact@'));
    expect(upload.if).toBe(
      "github.event_name != 'pull_request' && github.ref == 'refs/heads/main'",
    );
    expect(upload.with.name).toBe('nathanpaynedotcom-dist-${{ github.sha }}');
    expect(upload.with['if-no-files-found']).toBe('error');
  });

  it('attests from main only, with OIDC, and never checks out or runs repository code', () => {
    expect(attest.needs).toBe('build');
    expect(attest.if).toBe(
      "github.event_name != 'pull_request' && github.ref == 'refs/heads/main'",
    );
    expect(attest.permissions).toEqual({
      contents: 'read',
      'id-token': 'write',
      attestations: 'write',
    });
    expect(usesOf(attest).map((uses) => uses.split('@')[0])).toEqual([
      'actions/download-artifact',
      'actions/attest-build-provenance',
    ]);
    for (const step of attest.steps.filter((s) => s.run)) {
      expect(step.run).not.toMatch(/scripts\/|npm|npx|node /);
      expect(step.run).toContain('sha256sum --strict --check SHA256SUMS');
    }
    const provenance = attest.steps.find((step) =>
      step.uses?.startsWith('actions/attest-build-provenance@'),
    );
    expect(provenance.with['subject-path']).toBe(
      '${{ runner.temp }}/artifact/nathanpaynedotcom-dist-${{ github.sha }}.tar',
    );
    expect(source).not.toMatch(/needs\.build\.outputs/);
  });

  it('pins every action by full commit SHA with a version comment', () => {
    const lines = source.split('\n').filter((line) => /^\s*(-\s+)?uses:/.test(line));
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(line).toMatch(/uses: [\w.-]+\/[\w.-]+@[0-9a-f]{40} # v\d+\.\d+\.\d+$/);
    }
  });
});
