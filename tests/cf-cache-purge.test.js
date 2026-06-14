import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const rootDir = resolve(__dirname, '..');
const scriptPath = resolve(rootDir, 'scripts/cf-cache-purge.sh');

function makeStubBin({ opScript, curlScript }) {
  const workDir = mkdtempSync(join(tmpdir(), 'cf-cache-purge-test-'));
  const binDir = join(workDir, 'bin');
  execFileSync('mkdir', ['-p', binDir]);

  writeFileSync(join(binDir, 'op'), opScript, 'utf-8');
  chmodSync(join(binDir, 'op'), 0o755);

  writeFileSync(join(binDir, 'curl'), curlScript, 'utf-8');
  chmodSync(join(binDir, 'curl'), 0o755);

  return { workDir, binDir };
}

function runPurge({ env = {}, opScript, curlScript }) {
  const { workDir, binDir } = makeStubBin({ opScript, curlScript });
  try {
    const output = execFileSync('bash', [scriptPath], {
      cwd: rootDir,
      env: {
        ...process.env,
        ...env,
        PATH: `${binDir}:${process.env.PATH}`,
        CURL_LOG: join(workDir, 'curl.log'),
      },
      encoding: 'utf-8',
    });

    let curlLog = '';
    try {
      curlLog = readFileSync(join(workDir, 'curl.log'), 'utf-8');
    } catch {
      // No curl call is expected for skip paths.
    }

    return { output, curlLog };
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

const failingOp = `#!/usr/bin/env bash
echo "op should not have been called" >&2
exit 99
`;

const failingCurl = `#!/usr/bin/env bash
echo "curl should not have been called" >&2
exit 98
`;

const loggingCurl = `#!/usr/bin/env bash
printf '%s\\n' "$*" > "$CURL_LOG"
printf '{"success":true}\\n'
`;

describe('Cloudflare cache purge helper', () => {
  it('uses CF_API_TOKEN from credential preflight without reading 1Password', () => {
    const { output, curlLog } = runPurge({
      env: { CF_API_TOKEN: 'preflight-token' },
      opScript: failingOp,
      curlScript: loggingCurl,
    });

    expect(output).toContain('Cloudflare cache purged');
    expect(curlLog).toContain('Authorization: Bearer preflight-token');
  });

  it('skips successfully when preflight ran but did not export a Cloudflare token', () => {
    const { output, curlLog } = runPurge({
      env: { OP_PREFLIGHT_DONE: '1', CF_API_TOKEN: '' },
      opScript: failingOp,
      curlScript: failingCurl,
    });

    expect(output).toContain('skipping Cloudflare cache purge');
    expect(curlLog).toBe('');
  });

  it('falls back to 1Password when run directly without preflight', () => {
    const { output, curlLog } = runPurge({
      env: { CF_API_TOKEN: '', OP_PREFLIGHT_DONE: '' },
      opScript: `#!/usr/bin/env bash
printf 'op-token\\n'
`,
      curlScript: loggingCurl,
    });

    expect(output).toContain('Cloudflare cache purged');
    expect(curlLog).toContain('Authorization: Bearer op-token');
  });
});
