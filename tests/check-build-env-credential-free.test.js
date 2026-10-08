import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const scriptPath = resolve(__dirname, '..', 'scripts/check-build-env-credential-free.sh');

// What a clean build job looks like: GitHub's runtime variables, runner image
// paths, the runner's artifact-service token, and the three public values.
const CLEAN_ENV = {
  PATH: process.env.PATH,
  HOME: '/home/runner',
  CI: 'true',
  GITHUB_ACTIONS: 'true',
  GITHUB_SHA: '5d688d6920604e395c7c29b39d201a59dbf125fe',
  GITHUB_REF: 'refs/heads/main',
  GITHUB_WORKSPACE: '/home/runner/work/nathanpaynedotcom/nathanpaynedotcom',
  GITHUB_ENV: '/home/runner/work/_temp/_runner_file_commands/set_env',
  RUNNER_OS: 'Linux',
  RUNNER_TEMP: '/home/runner/work/_temp',
  ACTIONS_RUNTIME_URL: 'https://pipelines.actions.githubusercontent.com/x/',
  ACTIONS_RESULTS_URL: 'https://results-receiver.actions.githubusercontent.com/',
  ACTIONS_RUNTIME_TOKEN: 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJydW50aW1lIn0.c2ln',
  SELENIUM_JAR_PATH: '/usr/share/java/selenium-server.jar',
  KEYBOARD: 'us',
  GIT_AUTHOR_NAME: 'runner',
  PUBLIC_POSTHOG_PROJECT_TOKEN: 'phc_test',
  PUBLIC_GA_MEASUREMENT_ID: 'G-TEST',
  PUBLIC_LOGODEV_KEY: 'pk_test',
};

/** The env is replaced, never merged: the developer's shell must not decide the outcome. */
function runCheck(extraEnv = {}, args = []) {
  try {
    const output = execFileSync('bash', [scriptPath, ...args], {
      env: { ...CLEAN_ENV, ...extraEnv },
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { status: 0, output };
  } catch (error) {
    return { status: error.status, output: `${error.stdout ?? ''}${error.stderr ?? ''}` };
  }
}

describe('build environment credential check (#1238)', () => {
  it('passes a clean build-job environment', () => {
    const result = runCheck();
    expect(result.status, result.output).toBe(0);
  });

  it('fails when the job can request an OIDC token, even with an empty value', () => {
    for (const name of ['ACTIONS_ID_TOKEN_REQUEST_URL', 'ACTIONS_ID_TOKEN_REQUEST_TOKEN']) {
      for (const value of ['https://token.actions.githubusercontent.com/x', '']) {
        const result = runCheck({ [name]: value });
        expect(result.status, `${name}=${value}`).toBe(1);
        expect(result.output).toContain(name);
      }
    }
  });

  it('fails on GitHub, deploy and 1Password credential names', () => {
    for (const name of [
      'GITHUB_TOKEN',
      'GH_TOKEN',
      'GOOGLE_APPLICATION_CREDENTIALS',
      'CLOUDFLARE_API_TOKEN',
      'FIREBASE_TOKEN',
      'OP_SERVICE_ACCOUNT_TOKEN',
      'OP_PREFLIGHT_REVIEWER_PAT',
      'NODE_AUTH_TOKEN',
      'NPM_CONFIG__AUTH',
      'AWS_SECRET_ACCESS_KEY',
      'DEPLOY_KEY',
      'some_password',
    ]) {
      const result = runCheck({ [name]: 'x' });
      expect(result.status, name).toBe(1);
      expect(result.output).toContain(name);
    }
  });

  it('allows only the three named PUBLIC_* values, not the prefix', () => {
    const result = runCheck({ PUBLIC_OTHER_API_KEY: 'x' });
    expect(result.status).toBe(1);
    expect(result.output).toContain('PUBLIC_OTHER_API_KEY');
  });

  it('fails on a credential-shaped value under an innocent name, without printing it', () => {
    const values = {
      'GitHub token': `ghp_${'a'.repeat(36)}`,
      'PEM private key':
        '-----BEGIN OPENSSH PRIVATE KEY-----\nabc\n-----END OPENSSH PRIVATE KEY-----',
      'Google credential': '{"type": "service_account", "private_key": "x"}',
      JWT: 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJyZXBvIn0.c2lnbmF0dXJl',
    };
    for (const [kind, value] of Object.entries(values)) {
      const result = runCheck({ HARMLESS_LOOKING: value });
      expect(result.status, kind).toBe(1);
      expect(result.output).toContain(`HARMLESS_LOOKING: value looks like a ${kind}`);
      expect(result.output).not.toContain(value);
    }
  });

  it('fails on a checkout that kept its token, and passes one that did not', () => {
    const repo = mkdtempSync(join(tmpdir(), 'build-env-checkout-'));
    try {
      execFileSync('git', ['init', '-q', repo]);
      expect(runCheck({}, ['--checkout', repo]).status).toBe(0);

      execFileSync('git', [
        '-C',
        repo,
        'config',
        'http.https://github.com/.extraheader',
        'AUTHORIZATION: basic c2VjcmV0',
      ]);
      const result = runCheck({}, ['--checkout', repo]);
      expect(result.status).toBe(1);
      expect(result.output).toContain('extraheader');
      expect(result.output).not.toContain('c2VjcmV0');
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it('fails closed on a --checkout that is not a git checkout', () => {
    expect(runCheck({}, ['--checkout', join(tmpdir(), 'no-such-checkout-1238')]).status).toBe(1);
  });
});
