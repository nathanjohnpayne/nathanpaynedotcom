import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

// scripts/deploy-artifact.sh (#1239) runs against a real throwaway git repo
// (an origin and a clone) with stub gh, firebase, op-firebase-deploy, curl and
// op on a controlled safe PATH. Every stub records its argv, cwd and full
// environment. The parent environment carries canary credentials, and each
// tool must see only its own.

const rootDir = resolve(__dirname, '..');

const CANARY = {
  GH_TOKEN: 'canary-gh-token-6f1d',
  GITHUB_TOKEN: 'canary-github-token-93ab',
  OP_PREFLIGHT_AUTHOR_PAT: 'canary-author-pat-2c77',
  OP_PREFLIGHT_REVIEWER_PAT: 'canary-reviewer-pat-41e0',
  CF_API_TOKEN: 'canary-cf-token-8d2b',
  OP_SESSION_canary: 'canary-op-session-5a19',
  OP_SERVICE_ACCOUNT_TOKEN: 'canary-op-sa-token-7c4e',
  FIREBASE_TOKEN: 'canary-firebase-token-0b3f',
  GOOGLE_APPLICATION_CREDENTIALS: '/nonexistent/canary-gac-3e8a.json',
};
const NOT_FOR_ANYONE = [
  'GITHUB_TOKEN',
  'OP_PREFLIGHT_AUTHOR_PAT',
  'OP_PREFLIGHT_REVIEWER_PAT',
  'OP_SESSION_canary',
  'OP_SERVICE_ACCOUNT_TOKEN',
  'FIREBASE_TOKEN',
];

const INDEX_HTML = '<!doctype html><title>fixture</title>';

// Writes a tar from a member list, including shapes `tar` itself will not
// produce on request (absolute names, `..`, devices).
const TAR_WRITER = `
import io, json, sys, tarfile
out, spec = sys.argv[1], json.loads(sys.argv[2])
with tarfile.open(out, "w", format=tarfile.PAX_FORMAT) as tf:
    for m in spec:
        ti = tarfile.TarInfo(m["name"])
        ti.mtime = 0
        kind = m.get("type", "file")
        if kind == "dir":
            ti.type, ti.mode = tarfile.DIRTYPE, 0o755
            tf.addfile(ti)
        elif kind == "symlink":
            ti.type, ti.linkname = tarfile.SYMTYPE, m["linkname"]
            tf.addfile(ti)
        elif kind == "hardlink":
            ti.type, ti.linkname = tarfile.LNKTYPE, m["linkname"]
            tf.addfile(ti)
        elif kind == "chr":
            ti.type, ti.devmajor, ti.devminor = tarfile.CHRTYPE, 1, 3
            tf.addfile(ti)
        else:
            data = m.get("data", "").encode()
            ti.size, ti.mode = len(data), 0o644
            tf.addfile(ti, io.BytesIO(data))
`;

const DEFAULT_MEMBERS = [
  { name: '.', type: 'dir' },
  { name: './index.html', data: INDEX_HTML },
  { name: './blog', type: 'dir' },
  { name: './blog/index.html', data: '<p>blog</p>' },
];

const roots = [];
afterEach(() => {
  while (roots.length) rmSync(roots.pop(), { recursive: true, force: true });
});

function git(cwd, ...args) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf-8',
    env: {
      PATH: process.env.PATH,
      HOME: cwd,
      GIT_CONFIG_GLOBAL: '/dev/null',
      GIT_CONFIG_NOSYSTEM: '1',
      GIT_AUTHOR_NAME: 'Test',
      GIT_AUTHOR_EMAIL: 'test@example.com',
      GIT_COMMITTER_NAME: 'Test',
      GIT_COMMITTER_EMAIL: 'test@example.com',
    },
  }).trim();
}

function writeExec(path, body) {
  writeFileSync(path, body, 'utf-8');
  chmodSync(path, 0o755);
}

/** Records argv, cwd and env as `<tool>-<pid>.log` in the log directory. */
function recorder(log, tool) {
  return `f="${log}/${tool}-$$.log"
{ printf 'ARGV%s\\n' "\${*:+ $*}"; printf 'CWD %s\\n' "$(pwd -P)"; printf 'ENV\\n'; env; } > "$f"
`;
}

function makeHarness() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'deploy-artifact-test-')));
  roots.push(root);
  const dirs = {
    root,
    origin: join(root, 'origin.git'),
    repo: join(root, 'repo'),
    bin: join(root, 'bin'),
    home: join(root, 'home'),
    tmp: join(root, 'tmp'),
    log: join(root, 'log'),
    ctl: join(root, 'ctl'),
    artifact: join(root, 'artifact'),
  };
  for (const d of [dirs.bin, dirs.home, dirs.tmp, dirs.log, dirs.ctl, dirs.artifact]) {
    mkdirSync(d, { recursive: true });
  }

  git(root, 'init', '--quiet', '--bare', '-b', 'main', dirs.origin);
  mkdirSync(dirs.repo);
  git(dirs.repo, 'init', '--quiet', '-b', 'main');
  git(dirs.repo, 'remote', 'add', 'origin', dirs.origin);
  mkdirSync(join(dirs.repo, 'scripts'), { recursive: true });
  for (const f of [
    'firebase.json',
    '.firebaserc',
    'scripts/cf-cache-purge.sh',
    'scripts/deploy-artifact.sh',
  ]) {
    copyFileSync(join(rootDir, f), join(dirs.repo, f));
  }
  git(dirs.repo, 'add', '-A');
  git(dirs.repo, 'commit', '--quiet', '-m', 'fixture');
  git(dirs.repo, 'push', '--quiet', 'origin', 'main');
  const sha = git(dirs.repo, 'rev-parse', 'HEAD');

  // A commit that exists locally and on origin, but not on main.
  git(dirs.repo, 'checkout', '--quiet', '-b', 'feature');
  writeFileSync(join(dirs.repo, 'feature.txt'), 'off main\n');
  git(dirs.repo, 'add', '-A');
  git(dirs.repo, 'commit', '--quiet', '-m', 'off main');
  git(dirs.repo, 'push', '--quiet', 'origin', 'feature');
  const offMainSha = git(dirs.repo, 'rev-parse', 'HEAD');
  git(dirs.repo, 'checkout', '--quiet', 'main');

  const h = { ...dirs, sha, offMainSha };
  writeStubs(h);
  setRuns(h, [{ databaseId: 101, headSha: sha }]);
  buildArtifact(h, sha);
  return h;
}

function writeStubs(h) {
  const { bin, log, ctl, artifact, home } = h;
  writeExec(
    join(bin, 'gh'),
    `#!/bin/bash
${recorder(log, 'gh')}
case "$1 $2" in
  "attestation verify")
    if [ "$3" = "--help" ]; then
      echo "--signer-workflow --source-ref --source-digest --deny-self-hosted-runners"
      exit 0
    fi
    if [ "$(cat "${ctl}/attest" 2>/dev/null)" = "fail" ]; then
      echo "verification failed" >&2
      exit 1
    fi
    echo "Verification succeeded"
    ;;
  "run list") cat "${ctl}/runs.json" ;;
  "run download")
    dir=""
    while [ "$#" -gt 0 ]; do
      if [ "$1" = "--dir" ]; then dir="$2"; fi
      shift
    done
    cp -R "${artifact}/." "$dir/"
    ;;
  *) echo "unexpected gh call: $*" >&2; exit 64 ;;
esac
`,
  );
  // Like the real helper: invoked by path, finds firebase on its PATH.
  mkdirSync(join(home, '.local/bin'), { recursive: true });
  writeExec(
    join(home, '.local/bin/op-firebase-deploy'),
    `#!/bin/bash
${recorder(log, 'helper')}
exec firebase deploy --project nathanpaynedotcom --non-interactive "$@"
`,
  );
  writeExec(
    join(bin, 'firebase'),
    `#!/bin/bash
${recorder(log, 'firebase')}
{
  printf 'LINKS %s\\n' "$(find . -type l | tr '\\n' ' ')"
  printf 'FILES %s\\n' "$(ls -A | tr '\\n' ' ')"
  printf 'REACHABLE %s\\n' "$(find -L .. -name cf-cache-purge.sh -o -name deploy-artifact.sh 2>/dev/null | tr '\\n' ' ')"
} >> "$f"
cp dist/index.html "${log}/deployed-index.html"
cp firebase.json "${log}/deployed-firebase.json"
/bin/sh -c 'env' > "${log}/child-$$.log"
`,
  );
  writeExec(
    join(bin, 'curl'),
    `#!/bin/bash
${recorder(log, 'curl')}
printf '{"success":true}\\n'
`,
  );
  writeExec(
    join(bin, 'op'),
    `#!/bin/bash
${recorder(log, 'op')}
exit 99
`,
  );
}

function setRuns(h, runs) {
  const full = runs.map((r) => ({
    headBranch: 'main',
    event: 'push',
    status: 'completed',
    conclusion: 'success',
    workflowName: 'Build Artifact',
    ...r,
  }));
  writeFileSync(join(h.ctl, 'runs.json'), JSON.stringify(full));
}

function buildArtifact(h, sha, { members = DEFAULT_MEMBERS, digest, sumsName, extra } = {}) {
  rmSync(h.artifact, { recursive: true, force: true });
  mkdirSync(h.artifact);
  const archive = `nathanpaynedotcom-dist-${sha}.tar`;
  const archivePath = join(h.artifact, archive);
  execFileSync('python3', ['-c', TAR_WRITER, archivePath, JSON.stringify(members)]);
  const actual = createHash('sha256').update(readFileSync(archivePath)).digest('hex');
  writeFileSync(join(h.artifact, 'SHA256SUMS'), `${digest ?? actual}  ${sumsName ?? archive}\n`);
  if (extra) writeFileSync(join(h.artifact, extra), 'extra\n');
}

function run(h, args, { safePath, parentPathFirst, extraEnv } = {}) {
  const env = {
    ...CANARY,
    // The caller's PATH is ignored by design; put a hostile firebase first
    // to prove it.
    PATH: `${parentPathFirst ?? join(h.repo, 'node_modules/.bin')}:${process.env.PATH}`,
    HOME: h.home,
    TMPDIR: h.tmp,
    DEPLOY_ARTIFACT_SAFE_PATH: safePath ?? `${h.bin}:/usr/bin:/bin`,
    ...extraEnv,
  };
  // Executed directly, never as `bash script`, so the shebang's interpreter lookup is
  // exercised against the hostile PATH too (Codex P1, PR #1244).
  const script = join(h.repo, 'scripts/deploy-artifact.sh');
  chmodSync(script, 0o755);
  const result = spawnSync(script, args, {
    cwd: h.repo,
    env,
    encoding: 'utf-8',
  });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

function logs(h, tool) {
  return readdirSync(h.log)
    .filter((f) => f.startsWith(`${tool}-`) && f.endsWith('.log'))
    .map((f) => readFileSync(join(h.log, f), 'utf-8'));
}

function envOf(record) {
  return record.split('\nENV\n')[1] ?? '';
}

function expectAbsent(text, names, label) {
  for (const name of names) {
    expect(text, `${label} saw ${name}`).not.toContain(CANARY[name]);
  }
}

function expectNothingCredentialed(h) {
  for (const tool of ['helper', 'firebase', 'curl', 'op', 'child']) {
    expect(logs(h, tool), `${tool} must not run`).toEqual([]);
  }
}

function expectTempRemoved(h) {
  expect(readdirSync(h.tmp).filter((f) => f.startsWith('deploy-artifact.'))).toEqual([]);
}

function plantHostileFirebase(h) {
  const dir = join(h.repo, 'node_modules/.bin');
  mkdirSync(dir, { recursive: true });
  writeExec(join(dir, 'firebase'), `#!/bin/bash\ntouch "${h.log}/hostile-firebase-ran"\n`);
  // Utilities the script itself calls: any of them running from the caller's PATH
  // would see the full parent environment (Codex P1, PR #1244).
  for (const tool of HOSTILE_UTILITIES) {
    writeExec(join(dir, tool), `#!/bin/bash\ntouch "${h.log}/hostile-${tool}-ran"\n`);
  }
}

const HOSTILE_UTILITIES = [
  'bash',
  'dirname',
  'mktemp',
  'mkdir',
  'find',
  'sed',
  'wc',
  'cat',
  'head',
  'rm',
  'awk',
  'tr',
];

function expectNoHostileUtilityRan(h) {
  for (const tool of HOSTILE_UTILITIES) {
    expect(existsSync(join(h.log, `hostile-${tool}-ran`)), `hostile ${tool} ran`).toBe(false);
  }
}

describe('deploy-artifact.sh happy path (#1239)', () => {
  it('deploys the verified artifact from a temp dir, giving each tool only its own credential', () => {
    const h = makeHarness();
    plantHostileFirebase(h);
    const result = run(h, ['--sha', h.sha, '--hosting-only']);
    expect(result.status, result.output).toBe(0);

    // gh: the pinned lookup, download and attestation.
    const gh = logs(h, 'gh');
    const ghArgv = gh.map((r) => r.split('\n')[0]).join('\n');
    expect(ghArgv).toContain(
      `run list --repo nathanjohnpayne/nathanpaynedotcom --workflow build-artifact.yml --branch main --commit ${h.sha}`,
    );
    expect(ghArgv).toContain(
      `run download 101 --repo nathanjohnpayne/nathanpaynedotcom --name nathanpaynedotcom-dist-${h.sha}`,
    );
    const verify = gh.find((r) => r.startsWith('ARGV attestation verify /'));
    expect(verify).toBeDefined();
    for (const pin of [
      '--repo nathanjohnpayne/nathanpaynedotcom',
      '--signer-workflow nathanjohnpayne/nathanpaynedotcom/.github/workflows/build-artifact.yml',
      '--source-ref refs/heads/main',
      `--source-digest ${h.sha}`,
      '--cert-oidc-issuer https://token.actions.githubusercontent.com',
      '--deny-self-hosted-runners',
    ]) {
      expect(verify).toContain(pin);
    }
    for (const record of gh) {
      expectAbsent(
        envOf(record),
        [...NOT_FOR_ANYONE, 'CF_API_TOKEN', 'GOOGLE_APPLICATION_CREDENTIALS'],
        'gh',
      );
    }

    // firebase: helper then firebase, --only hosting, from the assembled dir.
    const [helper] = logs(h, 'helper');
    const [firebase] = logs(h, 'firebase');
    expect(helper.split('\n')[0]).toBe('ARGV --only hosting');
    expect(firebase.split('\n')[0]).toBe(
      'ARGV deploy --project nathanpaynedotcom --non-interactive --only hosting',
    );
    const cwd = firebase.match(/^CWD (.*)$/m)[1];
    expect(cwd.startsWith(`${h.tmp}/deploy-artifact.`)).toBe(true);
    expect(cwd.endsWith('/site')).toBe(true);
    expect(firebase).toMatch(/^FILES \.firebaserc dist firebase\.json $/m);
    expect(firebase).toMatch(/^LINKS $/m);
    expect(firebase).toMatch(/^REACHABLE $/m);
    expect(readFileSync(join(h.log, 'deployed-index.html'), 'utf-8')).toBe(INDEX_HTML);
    for (const [label, record] of [
      ['helper', helper],
      ['firebase', firebase],
    ]) {
      const env = envOf(record);
      expectAbsent(env, [...NOT_FOR_ANYONE, 'GH_TOKEN', 'CF_API_TOKEN'], label);
      expect(env, `${label} needs its own credential pointer`).toContain(
        `GOOGLE_APPLICATION_CREDENTIALS=${CANARY.GOOGLE_APPLICATION_CREDENTIALS}`,
      );
    }

    // A child of firebase inherits the scrubbed environment and nothing else.
    const [child] = logs(h, 'child');
    expectAbsent(child, [...NOT_FOR_ANYONE, 'GH_TOKEN', 'CF_API_TOKEN'], 'firebase child');

    // purge: the verified commit's script, with only CF_API_TOKEN.
    const [curl] = logs(h, 'curl');
    expect(curl).toContain(`Authorization: Bearer ${CANARY.CF_API_TOKEN}`);
    expectAbsent(
      envOf(curl),
      [...NOT_FOR_ANYONE, 'GH_TOKEN', 'GOOGLE_APPLICATION_CREDENTIALS'],
      'purge',
    );
    expect(result.output).toContain('Cloudflare cache purged');

    expect(logs(h, 'op')).toEqual([]);
    expect(existsSync(join(h.log, 'hostile-firebase-ran'))).toBe(false);
    expectNoHostileUtilityRan(h);
    expectTempRemoved(h);
  });

  it('defaults to origin/main and deploys every firebase.json target without --hosting-only', () => {
    const h = makeHarness();
    const result = run(h, []);
    expect(result.status, result.output).toBe(0);
    expect(logs(h, 'helper')[0].split('\n')[0]).toBe('ARGV');
    expect(logs(h, 'firebase')[0].split('\n')[0]).toBe(
      'ARGV deploy --project nathanpaynedotcom --non-interactive',
    );
    expect(result.output).toContain(`commit ${h.sha} is on main`);
  });

  it('takes firebase.json and the purge script from the verified commit, not the working tree', () => {
    const h = makeHarness();
    const committed = readFileSync(join(h.repo, 'firebase.json'), 'utf-8');
    writeFileSync(
      join(h.repo, 'firebase.json'),
      '{"hosting":{"public":"dist","predeploy":["touch pwned"]}}',
    );
    writeFileSync(
      join(h.repo, 'scripts/cf-cache-purge.sh'),
      `#!/usr/bin/env bash\ntouch "${h.log}/working-tree-purge-ran"\n`,
    );
    const result = run(h, ['--sha', h.sha]);
    expect(result.status, result.output).toBe(0);
    expect(readFileSync(join(h.log, 'deployed-firebase.json'), 'utf-8')).toBe(committed);
    expect(existsSync(join(h.log, 'working-tree-purge-ran'))).toBe(false);
    expect(logs(h, 'curl')).toHaveLength(1);
  });

  it('accepts firebase from a global npm prefix (<prefix>/bin -> <prefix>/lib/node_modules/<pkg>)', () => {
    const h = makeHarness();
    const prefix = join(h.root, 'prefix');
    const pkgBin = join(prefix, 'lib/node_modules/firebase-tools/lib/bin');
    mkdirSync(pkgBin, { recursive: true });
    mkdirSync(join(prefix, 'bin'));
    copyFileSync(join(h.bin, 'firebase'), join(pkgBin, 'firebase'));
    chmodSync(join(pkgBin, 'firebase'), 0o755);
    symlinkSync(
      '../lib/node_modules/firebase-tools/lib/bin/firebase',
      join(prefix, 'bin/firebase'),
    );
    rmSync(join(h.bin, 'firebase'));
    const result = run(h, ['--sha', h.sha], { safePath: `${h.bin}:${prefix}/bin:/usr/bin:/bin` });
    expect(result.status, result.output).toBe(0);
    expect(logs(h, 'firebase')).toHaveLength(1);
  });
});

describe('deploy-artifact.sh sanitizes its own environment on entry (Codex P1, PR #1244)', () => {
  it('never sources a BASH_ENV hook', () => {
    const h = makeHarness();
    const hook = join(h.root, 'hook.sh');
    writeFileSync(hook, `touch "${h.log}/bash-env-hook-ran"\n`);
    const result = run(h, ['--sha', h.sha, '--dry-run'], {
      extraEnv: { BASH_ENV: hook, ENV: hook },
    });
    expect(result.status, result.output).toBe(0);
    expect(existsSync(join(h.log, 'bash-env-hook-ran'))).toBe(false);
  });

  it('never imports an exported function that shadows a utility', () => {
    const h = makeHarness();
    const result = run(h, ['--sha', h.sha, '--dry-run'], {
      extraEnv: { 'BASH_FUNC_dirname%%': `() { touch "${h.log}/function-ran"; }` },
    });
    expect(result.status, result.output).toBe(0);
    expect(existsSync(join(h.log, 'function-ran'))).toBe(false);
  });

  it('refuses a forged sanitized marker that arrives with other variables', () => {
    const h = makeHarness();
    const result = run(h, ['--sha', h.sha, '--dry-run'], {
      extraEnv: { DEPLOY_ARTIFACT_SANITIZED: '1' },
    });
    expect(result.status).toBe(1);
    expect(result.output).toMatch(/is not allowed in the sanitized environment/);
    expect(logs(h, 'gh')).toEqual([]);
  });
});

describe('deploy-artifact.sh --dry-run and --no-purge', () => {
  it('--dry-run verifies and assembles but never invokes firebase or the purge', () => {
    const h = makeHarness();
    const result = run(h, ['--sha', h.sha, '--hosting-only', '--dry-run']);
    expect(result.status, result.output).toBe(0);
    expect(result.output).toContain('dry run: verified and assembled');
    expect(result.output).toContain('attestation verified');
    expect(logs(h, 'gh').length).toBeGreaterThan(0);
    expectNothingCredentialed(h);
    expectTempRemoved(h);
  });

  it('--dry-run prints the env names each child would get, never a value', () => {
    const h = makeHarness();
    const result = run(h, ['--sha', h.sha, '--dry-run']);
    expect(result.status, result.output).toBe(0);
    expect(result.output).toMatch(/firebase env: .*GOOGLE_APPLICATION_CREDENTIALS/);
    expect(result.output).toMatch(/purge env: .*CF_API_TOKEN/);
    for (const value of Object.values(CANARY)) expect(result.output).not.toContain(value);
  });

  it('--no-purge deploys without running the purge', () => {
    const h = makeHarness();
    const result = run(h, ['--sha', h.sha, '--no-purge']);
    expect(result.status, result.output).toBe(0);
    expect(logs(h, 'firebase')).toHaveLength(1);
    expect(logs(h, 'curl')).toEqual([]);
  });
});

describe('deploy-artifact.sh refuses before any credential exists', () => {
  const refusals = [
    [
      'a failed attestation',
      (h) => writeFileSync(join(h.ctl, 'attest'), 'fail'),
      /attestation verification failed/,
    ],
    [
      'a digest mismatch',
      (h) => buildArtifact(h, h.sha, { digest: 'a'.repeat(64) }),
      /digest mismatch/,
    ],
    [
      'an extra file in the artifact',
      (h) => buildArtifact(h, h.sha, { extra: 'notes.txt' }),
      /exactly SHA256SUMS/,
    ],
    [
      'a manifest naming another archive',
      (h) => buildArtifact(h, h.sha, { sumsName: 'other.tar' }),
      /SHA256SUMS must name exactly/,
    ],
    ['no run for the SHA', (h) => setRuns(h, []), /no successful build-artifact\.yml run/],
    [
      'a failed build',
      (h) => setRuns(h, [{ databaseId: 101, headSha: h.sha, conclusion: 'failure' }]),
      /did the build fail/,
    ],
    [
      'a run for the SHA on another branch',
      (h) => setRuns(h, [{ databaseId: 101, headSha: h.sha, headBranch: 'feature' }]),
      /no successful build-artifact\.yml run/,
    ],
    [
      'a pull_request run',
      (h) => setRuns(h, [{ databaseId: 101, headSha: h.sha, event: 'pull_request' }]),
      /no successful build-artifact\.yml run/,
    ],
  ];

  for (const [label, arrange, message] of refusals) {
    it(`refuses ${label}`, () => {
      const h = makeHarness();
      arrange(h);
      const result = run(h, ['--sha', h.sha]);
      expect(result.status, result.output).toBe(1);
      expect(result.output).toMatch(message);
      expectNothingCredentialed(h);
      expectTempRemoved(h);
    });
  }

  it('refuses an off-main SHA before looking up any run', () => {
    const h = makeHarness();
    const result = run(h, ['--sha', h.offMainSha]);
    expect(result.status, result.output).toBe(1);
    expect(result.output).toContain('is not on main');
    expect(logs(h, 'gh').filter((r) => r.startsWith('ARGV run '))).toEqual([]);
    expectNothingCredentialed(h);
    expectTempRemoved(h);
  });

  for (const bad of ['abc1234', 'A'.repeat(40), `${'a'.repeat(40)}0`]) {
    it(`refuses a malformed SHA (${bad.slice(0, 12)}…)`, () => {
      const h = makeHarness();
      const result = run(h, ['--sha', bad]);
      expect(result.status, result.output).toBe(1);
      expect(result.output).toContain('full 40-character');
      expect(logs(h, 'gh')).toEqual([]);
      expectNothingCredentialed(h);
    });
  }

  it('refuses a firebase.json at the verified commit that declares a predeploy hook', () => {
    const h = makeHarness();
    writeFileSync(
      join(h.repo, 'firebase.json'),
      JSON.stringify({ hosting: { public: 'dist', predeploy: ['npm run build'] } }),
    );
    git(h.repo, 'commit', '--quiet', '-am', 'hook');
    git(h.repo, 'push', '--quiet', 'origin', 'main');
    const sha = git(h.repo, 'rev-parse', 'HEAD');
    setRuns(h, [{ databaseId: 102, headSha: sha }]);
    buildArtifact(h, sha);
    const result = run(h, ['--sha', sha]);
    expect(result.status, result.output).toBe(1);
    expect(result.output).toContain('predeploy hook');
    expectNothingCredentialed(h);
    expectTempRemoved(h);
  });

  it('rejects an unknown argument with usage', () => {
    const h = makeHarness();
    const result = run(h, ['--force']);
    expect(result.status).toBe(2);
    expect(result.output).toContain('unknown argument');
  });
});

describe('deploy-artifact.sh extracts only safe archives', () => {
  const unsafe = [
    ['a ../ escape', [{ name: '../escape.html', data: 'x' }], /parent-directory component/],
    ['an absolute path', [{ name: '/tmp/abs-escape.html', data: 'x' }], /absolute path/],
    [
      'a symlink to outside',
      [{ name: './out', type: 'symlink', linkname: '/etc' }],
      /only regular files/,
    ],
    [
      'a relative symlink',
      [{ name: './up', type: 'symlink', linkname: '../../..' }],
      /only regular files/,
    ],
    [
      'a hardlink',
      [{ name: './hard', type: 'hardlink', linkname: '/etc/passwd' }],
      /only regular files/,
    ],
    ['a device file', [{ name: './dev', type: 'chr' }], /only regular files/],
    ['a duplicate entry', [{ name: './index.html', data: 'second' }], /duplicate entry/],
  ];

  for (const [label, members, message] of unsafe) {
    it(`rejects ${label}`, () => {
      const h = makeHarness();
      buildArtifact(h, h.sha, { members: [...DEFAULT_MEMBERS, ...members] });
      const result = run(h, ['--sha', h.sha]);
      expect(result.status, result.output).toBe(1);
      expect(result.output).toMatch(message);
      expect(existsSync(join(h.tmp, 'escape.html'))).toBe(false);
      expect(existsSync('/tmp/abs-escape.html')).toBe(false);
      expectNothingCredentialed(h);
      expectTempRemoved(h);
    });
  }

  it('rejects an archive with no index.html', () => {
    const h = makeHarness();
    buildArtifact(h, h.sha, { members: [{ name: './other.html', data: 'x' }] });
    const result = run(h, ['--sha', h.sha]);
    expect(result.status, result.output).toBe(1);
    expect(result.output).toContain('no index.html');
    expectNothingCredentialed(h);
  });
});

describe('deploy-artifact.sh resolves firebase outside the checkout and node_modules', () => {
  function expectRefusedBeforeGh(h, result, message) {
    expect(result.status, result.output).toBe(1);
    expect(result.output).toMatch(message);
    expect(logs(h, 'gh')).toEqual([]);
    expectNothingCredentialed(h);
  }

  it('refuses a safe PATH entry inside node_modules', () => {
    const h = makeHarness();
    plantHostileFirebase(h);
    const result = run(h, ['--sha', h.sha], {
      safePath: `${join(h.repo, 'node_modules/.bin')}:${h.bin}:/usr/bin:/bin`,
    });
    expectRefusedBeforeGh(h, result, /inside node_modules/);
    expect(existsSync(join(h.log, 'hostile-firebase-ran'))).toBe(false);
  });

  it('refuses a safe PATH entry inside the repository', () => {
    const h = makeHarness();
    mkdirSync(join(h.repo, 'tools'));
    const result = run(h, ['--sha', h.sha], {
      safePath: `${join(h.repo, 'tools')}:${h.bin}:/usr/bin:/bin`,
    });
    expectRefusedBeforeGh(h, result, /inside this repository/);
  });

  it('refuses an empty or relative safe PATH entry', () => {
    const h = makeHarness();
    expectRefusedBeforeGh(
      h,
      run(h, ['--sha', h.sha], { safePath: `${h.bin}::/usr/bin:/bin` }),
      /empty entry/,
    );
    expectRefusedBeforeGh(
      h,
      run(h, ['--sha', h.sha], { safePath: `bin:/usr/bin:/bin` }),
      /not absolute/,
    );
  });

  it('refuses a firebase that symlinks into the repository', () => {
    const h = makeHarness();
    mkdirSync(join(h.repo, 'tools'));
    writeExec(
      join(h.repo, 'tools/firebase'),
      `#!/bin/bash\ntouch "${h.log}/hostile-firebase-ran"\n`,
    );
    rmSync(join(h.bin, 'firebase'));
    symlinkSync(join(h.repo, 'tools/firebase'), join(h.bin, 'firebase'));
    expectRefusedBeforeGh(h, run(h, ['--sha', h.sha]), /firebase is not a trusted executable/);
    expect(existsSync(join(h.log, 'hostile-firebase-ran'))).toBe(false);
  });

  it('refuses a firebase that symlinks into a project node_modules outside the repository', () => {
    const h = makeHarness();
    const target = join(h.root, 'otherproject/node_modules/firebase-tools/lib/bin');
    mkdirSync(target, { recursive: true });
    writeExec(join(target, 'firebase'), `#!/bin/bash\ntouch "${h.log}/hostile-firebase-ran"\n`);
    rmSync(join(h.bin, 'firebase'));
    symlinkSync(join(target, 'firebase'), join(h.bin, 'firebase'));
    expectRefusedBeforeGh(h, run(h, ['--sha', h.sha]), /inside a node_modules directory/);
  });

  it('refuses an op that symlinks into the repository before any credentialed child runs', () => {
    const h = makeHarness();
    mkdirSync(join(h.repo, 'tools'));
    writeExec(join(h.repo, 'tools/op'), `#!/bin/bash\ntouch "${h.log}/hostile-op-ran"\n`);
    rmSync(join(h.bin, 'op'), { force: true });
    symlinkSync(join(h.repo, 'tools/op'), join(h.bin, 'op'));
    expectRefusedBeforeGh(h, run(h, ['--sha', h.sha]), /op is not a trusted executable/);
    expect(existsSync(join(h.log, 'hostile-op-ran'))).toBe(false);
  });

  it('refuses a helper that resolves inside the repository', () => {
    const h = makeHarness();
    const helper = join(h.home, '.local/bin/op-firebase-deploy');
    copyFileSync(helper, join(h.repo, 'scripts/op-firebase-deploy'));
    rmSync(helper);
    symlinkSync(join(h.repo, 'scripts/op-firebase-deploy'), helper);
    expectRefusedBeforeGh(
      h,
      run(h, ['--sha', h.sha]),
      /op-firebase-deploy is not a trusted executable/,
    );
  });
});
