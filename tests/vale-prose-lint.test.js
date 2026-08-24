import { spawnSync } from 'node:child_process';
import {
  accessSync,
  chmodSync,
  constants,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const valeAvailable = (() => {
  const result = spawnSync('vale', ['--version'], { encoding: 'utf8' });
  return result.status === 0;
})();

describe('Vale provisioning', () => {
  it('installs and verifies a pinned CI archive through the test seams', () => {
    const directory = mkdtempSync(join(tmpdir(), 'ensure-vale-test-'));
    try {
      const sourceDirectory = join(directory, 'source');
      const destinationDirectory = join(directory, 'destination');
      mkdirSync(sourceDirectory);
      mkdirSync(destinationDirectory);
      const fakeVale = join(sourceDirectory, 'vale');
      writeFileSync(fakeVale, '#!/usr/bin/env sh\necho "vale version 3.18.0"\n');
      chmodSync(fakeVale, 0o755);
      const archive = join(directory, 'vale.tar.gz');
      const archived = spawnSync('tar', ['-czf', archive, '-C', sourceDirectory, 'vale'], {
        encoding: 'utf8',
      });
      expect(archived.status).toBe(0);
      const checksum = createHash('sha256').update(readFileSync(archive)).digest('hex');
      const destination = join(destinationDirectory, 'vale');

      const result = spawnSync('bash', ['scripts/lib/ensure-vale.sh', '--ci-only'], {
        encoding: 'utf8',
        env: {
          ...process.env,
          ENSURE_VALE_ARCHIVE_PATH: archive,
          ENSURE_VALE_DEST: destination,
          ENSURE_VALE_MACHINE: 'x86_64',
          ENSURE_VALE_SHA256: checksum,
          ENSURE_VALE_SYSTEM: 'Linux',
          GITHUB_ACTIONS: 'true',
          PATH: `${destinationDirectory}:/usr/bin:/bin`,
        },
      });

      expect(result.status).toBe(0);
      expect(spawnSync(destination, ['--version'], { encoding: 'utf8' }).stdout).toContain(
        '3.18.0',
      );
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
  });

  it('fails closed when PATH resolves an unpinned Vale version', () => {
    const directory = mkdtempSync(join(tmpdir(), 'ensure-vale-stale-test-'));
    try {
      const staleVale = join(directory, 'vale');
      writeFileSync(staleVale, '#!/usr/bin/env sh\necho "vale version 0.0.0"\n');
      chmodSync(staleVale, 0o755);

      const result = spawnSync('bash', ['scripts/lib/ensure-vale.sh', '--ci-only'], {
        encoding: 'utf8',
        env: {
          ...process.env,
          ENSURE_VALE_ARCHIVE_PATH: '/does/not/exist',
          GITHUB_ACTIONS: 'true',
          PATH: `${directory}:/usr/bin:/bin`,
        },
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain('Vale 0.0.0 does not match pinned 3.18.0');
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
  });

  it('reprovisions a matching but unverified CI binary and owns command resolution', () => {
    const directory = mkdtempSync(join(tmpdir(), 'ensure-vale-provenance-test-'));
    try {
      const sourceDirectory = join(directory, 'source');
      const staleDirectory = join(directory, 'stale');
      const destinationDirectory = join(directory, 'destination');
      mkdirSync(sourceDirectory);
      mkdirSync(staleDirectory);
      mkdirSync(destinationDirectory);
      const verifiedVale = join(sourceDirectory, 'vale');
      writeFileSync(verifiedVale, '#!/usr/bin/env sh\necho "vale verified version 3.18.0"\n');
      chmodSync(verifiedVale, 0o755);
      const staleVale = join(staleDirectory, 'vale');
      writeFileSync(staleVale, '#!/usr/bin/env sh\necho "vale stale version 3.18.0"\n');
      chmodSync(staleVale, 0o755);
      const archive = join(directory, 'vale.tar.gz');
      expect(spawnSync('tar', ['-czf', archive, '-C', sourceDirectory, 'vale']).status).toBe(0);
      const checksum = createHash('sha256').update(readFileSync(archive)).digest('hex');
      const destination = join(destinationDirectory, 'vale');
      const runtimePath = `${destinationDirectory}:${staleDirectory}:/usr/bin:/bin`;

      const result = spawnSync('bash', ['scripts/lib/ensure-vale.sh', '--ci-only'], {
        encoding: 'utf8',
        env: {
          ...process.env,
          ENSURE_VALE_ARCHIVE_PATH: archive,
          ENSURE_VALE_DEST: destination,
          ENSURE_VALE_MACHINE: 'x86_64',
          ENSURE_VALE_SHA256: checksum,
          ENSURE_VALE_SYSTEM: 'Linux',
          GITHUB_ACTIONS: 'true',
          PATH: runtimePath,
        },
      });

      expect(result.status).toBe(0);
      expect(
        spawnSync('sh', ['-c', 'command -v vale'], {
          encoding: 'utf8',
          env: { ...process.env, PATH: runtimePath },
        }).stdout.trim(),
      ).toBe(destination);
      expect(spawnSync(destination, ['--version'], { encoding: 'utf8' }).stdout).toContain(
        'verified',
      );
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
  });
});

describe.skipIf(!valeAvailable)('Vale prose lint', () => {
  const frontmatterCases = [
    ['mapping-scalar.md', 2],
    ['quoted-prose.md', 3],
    ['unquoted-prose.md', 3],
    ['short-quoted.md', 3],
    ['tag-style.md', 3],
    ['doubly-nested-leading-blank.md', 5],
    ['folded-sequence.md', 4],
  ];

  it('discovers repo-owned Markdown and excludes mirrors and violation fixtures', () => {
    const result = spawnSync(process.execPath, ['scripts/lint-prose.mjs', '--list-files'], {
      encoding: 'utf8',
    });

    expect(result.status).toBe(0);
    const files = result.stdout.trim().split('\n');
    expect(files).toContain('README.md');
    expect(files).toContain('src/content/blog/perfect-score-wrong-axis.md');
    expect(files).toContain('src/content/skills/technical.yaml');
    for (const propagated of [
      '.github/ISSUE_TEMPLATE/bug_report.md',
      '.github/pull_request_template.md',
      'docs/agents/code-review-requirements.md',
      'docs/agents/decision-records.md',
      'docs/agents/prose-line-wrapping.md',
      'docs/agents/shared-operating-rules.md',
      'docs/agents/worktree-placement.md',
      'scripts/ci/README.md',
      'scripts/gh-projects/README.md',
      'scripts/phase-4b/README.md',
    ]) {
      expect(files).not.toContain(propagated);
    }
    expect(files).not.toContain('tests/fixtures/vale-em-dash/behavior.md');
  });

  it('does not let an untracked draft enter automatic discovery', () => {
    const draft = `tests/.vale-untracked-${process.pid}.md`;
    writeFileSync(draft, 'Draft — prose.\n');
    try {
      const result = spawnSync(process.execPath, ['scripts/lint-prose.mjs', '--list-files'], {
        encoding: 'utf8',
      });

      expect(result.status).toBe(0);
      expect(result.stdout.trim().split('\n')).not.toContain(draft);
    } finally {
      rmSync(draft, { force: true });
    }
  });

  it('excludes an unmarked propagated mirror passed as an absolute path', () => {
    const mirror = join(process.cwd(), '.github/pull_request_template.md');
    const result = spawnSync(
      process.execPath,
      ['scripts/lint-prose.mjs', '--output=JSON', mirror],
      { encoding: 'utf8' },
    );

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({});
  });

  it('retains findings when an explicit path has a dot-slash prefix', () => {
    const fixture = './tests/fixtures/vale-em-dash/behavior.md';
    const result = spawnSync(
      process.execPath,
      ['scripts/lint-prose.mjs', '--output=JSON', fixture],
      { encoding: 'utf8' },
    );

    expect(result.status).toBe(1);
    const alerts = JSON.parse(result.stdout)['tests/fixtures/vale-em-dash/behavior.md'].filter(
      (alert) => alert.Check === 'CMOS.EmDash',
    );
    expect(alerts.map((alert) => alert.Line)).toEqual([3, 6, 7, 8]);
  });

  it('emits complete machine-readable output for the whole repository', () => {
    const result = spawnSync(process.execPath, ['scripts/lint-prose.mjs', '--output=JSON'], {
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
    });

    expect([0, 1]).toContain(result.status);
    expect(() => JSON.parse(result.stdout)).not.toThrow();
  });

  it.each(frontmatterCases)('reports the known frontmatter violation in %s', (name, line) => {
    const fixture = `tests/fixtures/vale-frontmatter/${name}`;
    accessSync(fixture, constants.R_OK);

    const result = spawnSync(
      process.execPath,
      ['scripts/lint-prose.mjs', '--output=JSON', fixture],
      { encoding: 'utf8' },
    );

    expect(result.status).toBe(1);
    const report = JSON.parse(result.stdout);
    expect(report[fixture]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          Check: 'CMOS.EmDash',
          Line: line,
          Origin: 'frontmatter',
          Severity: 'error',
        }),
      ]),
    );
  });

  it('does not confuse a body horizontal rule with another frontmatter block', () => {
    const fixture = 'tests/fixtures/vale-frontmatter/body-horizontal-rule.md';
    const result = spawnSync(
      process.execPath,
      ['scripts/lint-prose.mjs', '--output=JSON', fixture],
      {
        encoding: 'utf8',
      },
    );

    expect(result.status).toBe(1);
    const alerts = JSON.parse(result.stdout)[fixture];
    expect(alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ Check: 'CMOS.EmDash', Line: 9, Severity: 'error' }),
      ]),
    );
  });

  it('keeps an indented delimiter inside a folded frontmatter scalar', () => {
    const fixture = 'tests/fixtures/vale-frontmatter/folded-delimiter.md';
    const result = spawnSync(
      process.execPath,
      ['scripts/lint-prose.mjs', '--output=JSON', fixture],
      {
        encoding: 'utf8',
      },
    );

    expect(result.status).toBe(1);
    expect(JSON.parse(result.stdout)[fixture]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ Check: 'CMOS.EmDash', Line: 5, Origin: 'frontmatter' }),
      ]),
    );
  });

  it('fails loudly on unterminated frontmatter', () => {
    const fixture = 'tests/fixtures/vale-frontmatter/unterminated.md';
    const result = spawnSync(
      process.execPath,
      ['scripts/lint-prose.mjs', '--output=JSON', fixture],
      {
        encoding: 'utf8',
      },
    );

    expect(result.status).toBe(1);
    expect(JSON.parse(result.stdout)[fixture]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ Check: 'CMOS.Frontmatter', Line: 1, Severity: 'error' }),
      ]),
    );
  });

  it('returns a distinct clean report when a file has no frontmatter', () => {
    const fixture = 'tests/fixtures/vale-frontmatter/no-frontmatter.md';
    const result = spawnSync(
      process.execPath,
      ['scripts/lint-prose.mjs', '--output=JSON', fixture],
      {
        encoding: 'utf8',
      },
    );

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({});
  });

  it('lints a missing opening delimiter as Markdown body prose', () => {
    const fixture = 'tests/fixtures/vale-frontmatter/missing-opener.md';
    const result = spawnSync(
      process.execPath,
      ['scripts/lint-prose.mjs', '--output=JSON', fixture],
      {
        encoding: 'utf8',
      },
    );

    expect(result.status).toBe(1);
    expect(JSON.parse(result.stdout)[fixture]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ Check: 'CMOS.EmDash', Line: 1, Severity: 'error' }),
      ]),
    );
    expect(JSON.parse(result.stdout)[fixture]).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ Origin: 'frontmatter' })]),
    );
  });

  it('reports heading and table-header capitalization as warnings', () => {
    const fixture = 'tests/fixtures/vale-capitalization/violations.md';
    const result = spawnSync(
      process.execPath,
      ['scripts/lint-prose.mjs', '--output=JSON', fixture],
      {
        encoding: 'utf8',
      },
    );

    expect(result.status).toBe(0);
    const alerts = JSON.parse(result.stdout)[fixture];
    expect(alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ Check: 'CMOS.Titles', Severity: 'warning' }),
        expect.objectContaining({ Check: 'CMOS.Capitalization', Severity: 'warning' }),
      ]),
    );
  });

  it('allows technical identifiers in otherwise Chicago-cased headings and headers', () => {
    const fixture = 'tests/fixtures/vale-capitalization/technical-identifiers.md';
    const result = spawnSync(
      process.execPath,
      ['scripts/lint-prose.mjs', '--output=JSON', fixture],
      {
        encoding: 'utf8',
      },
    );

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({});
  });

  it('is markup-aware, NBSP-aware, entity-aware, and preserves identifier separators', () => {
    const fixture = 'tests/fixtures/vale-em-dash/behavior.md';
    const result = spawnSync(
      process.execPath,
      ['scripts/lint-prose.mjs', '--output=JSON', fixture],
      {
        encoding: 'utf8',
      },
    );

    expect(result.status).toBe(1);
    const alerts = JSON.parse(result.stdout)[fixture].filter(
      (alert) => alert.Check === 'CMOS.EmDash',
    );
    expect(alerts.map((alert) => alert.Line)).toEqual([3, 6, 7, 8]);
  });

  it('lints standalone YAML prose retained from the legacy gate', () => {
    const fixture = 'tests/fixtures/vale-em-dash/standalone.yaml';
    const result = spawnSync(
      process.execPath,
      ['scripts/lint-prose.mjs', '--output=JSON', fixture],
      { encoding: 'utf8' },
    );

    expect(result.status).toBe(1);
    const alerts = JSON.parse(result.stdout)[fixture].filter(
      (alert) => alert.Check === 'CMOS.EmDash',
    );
    expect(alerts).toHaveLength(13);
    expect(alerts.map((alert) => alert.Line)).toEqual([
      5, 7, 9, 11, 14, 15, 18, 20, 22, 25, 27, 29, 43,
    ]);
    expect(alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ Line: 5, Severity: 'error' }),
        expect.objectContaining({ Line: 7, Severity: 'error' }),
        expect.objectContaining({ Line: 9, Severity: 'error' }),
        expect.objectContaining({ Line: 11, Severity: 'error' }),
        expect.objectContaining({ Line: 14, Severity: 'error' }),
        expect.objectContaining({ Line: 15, Severity: 'error' }),
        expect.objectContaining({ Line: 18, Severity: 'error' }),
        expect.objectContaining({ Line: 20, Severity: 'error' }),
        expect.objectContaining({ Line: 22, Severity: 'error' }),
        expect.objectContaining({ Line: 25, Severity: 'error' }),
        expect.objectContaining({ Line: 27, Severity: 'error' }),
        expect.objectContaining({ Line: 29, Severity: 'error' }),
        expect.objectContaining({ Line: 43, Severity: 'error' }),
      ]),
    );
  });

  it('lints a multiline quoted scalar at the YAML document root', () => {
    const fixture = 'tests/fixtures/vale-em-dash/root-multiline.yaml';
    const result = spawnSync(
      process.execPath,
      ['scripts/lint-prose.mjs', '--output=JSON', fixture],
      { encoding: 'utf8' },
    );

    expect(result.status).toBe(1);
    expect(JSON.parse(result.stdout)[fixture]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ Check: 'CMOS.EmDash', Line: 2, Severity: 'error' }),
      ]),
    );
  });

  it('reports named and numeric NBSP character references', () => {
    const fixture = 'tests/fixtures/vale-em-dash/entities.md';
    const result = spawnSync(
      process.execPath,
      ['scripts/lint-prose.mjs', '--output=JSON', fixture],
      {
        encoding: 'utf8',
      },
    );

    expect(result.status).toBe(1);
    expect(JSON.parse(result.stdout)[fixture]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ Check: 'CMOS.EmDash', Line: 1, Severity: 'error' }),
      ]),
    );
  });

  it('lints MDX prose without treating expressions or JSX attributes as prose', () => {
    const fixture = 'tests/fixtures/vale-em-dash/behavior.mdx';
    const result = spawnSync(
      process.execPath,
      ['scripts/lint-prose.mjs', '--output=JSON', fixture],
      {
        encoding: 'utf8',
      },
    );

    expect(result.status).toBe(1);
    const alerts = JSON.parse(result.stdout)[fixture].filter(
      (alert) => alert.Check === 'CMOS.EmDash',
    );
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ Line: 3, Severity: 'error' });
  });

  it('lints YAML values without mistaking mapping syntax or keys for prose padding', () => {
    const fixture = 'tests/fixtures/vale-frontmatter/yaml-structure.md';
    const result = spawnSync(
      process.execPath,
      ['scripts/lint-prose.mjs', '--output=JSON', fixture],
      {
        encoding: 'utf8',
      },
    );

    expect(result.status).toBe(1);
    const alerts = JSON.parse(result.stdout)[fixture].filter(
      (alert) => alert.Check === 'CMOS.EmDash',
    );
    expect(alerts).toHaveLength(2);
    expect(alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ Line: 2, Origin: 'frontmatter' }),
        expect.objectContaining({ Line: 4, Origin: 'frontmatter' }),
      ]),
    );
  });

  it('rejects autofix flags and leaves the source unchanged', () => {
    const fixture = 'tests/fixtures/vale-em-dash/behavior.md';
    const before = readFileSync(fixture, 'utf8');
    const result = spawnSync(process.execPath, ['scripts/lint-prose.mjs', '--write', fixture], {
      encoding: 'utf8',
    });

    expect(result.status).toBe(2);
    expect(result.stderr).toContain('unknown argument: --write');
    expect(readFileSync(fixture, 'utf8')).toBe(before);
  });
});

describe('Vale availability behavior', () => {
  it('skips cached prose paths that are deleted only from the working tree', () => {
    const directory = mkdtempSync(join(tmpdir(), 'vale-deleted-path-'));
    const linter = join(process.cwd(), 'scripts/lint-prose.mjs');
    try {
      expect(spawnSync('git', ['init', '--quiet'], { cwd: directory }).status).toBe(0);
      const deleted = join(directory, 'deleted.md');
      writeFileSync(deleted, 'Tracked prose.\n');
      expect(spawnSync('git', ['add', 'deleted.md'], { cwd: directory }).status).toBe(0);
      rmSync(deleted);

      const result = spawnSync(process.execPath, [linter, '--list-files'], {
        cwd: directory,
        encoding: 'utf8',
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toBe('\n');
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
  });

  it.each([
    ['soft-passes locally', 'false', 0, 'skipping outside CI'],
    ['fails closed in CI', 'true', 2, 'Vale is required in CI'],
  ])('%s when Vale is unavailable', (_name, githubActions, status, message) => {
    const emptyPath = mkdtempSync(join(tmpdir(), 'vale-empty-path-'));
    try {
      const result = spawnSync(
        process.execPath,
        ['scripts/lint-prose.mjs', 'tests/fixtures/vale-frontmatter/no-frontmatter.md'],
        {
          encoding: 'utf8',
          env: { ...process.env, GITHUB_ACTIONS: githubActions, PATH: emptyPath },
        },
      );

      expect(result.status).toBe(status);
      expect(result.stderr).toContain(message);
    } finally {
      rmSync(emptyPath, { force: true, recursive: true });
    }
  });

  it('preserves the JSON contract when Vale is unavailable locally', () => {
    const emptyPath = mkdtempSync(join(tmpdir(), 'vale-empty-path-'));
    try {
      const result = spawnSync(
        process.execPath,
        [
          'scripts/lint-prose.mjs',
          '--output=JSON',
          'tests/fixtures/vale-frontmatter/no-frontmatter.md',
        ],
        {
          encoding: 'utf8',
          env: { ...process.env, GITHUB_ACTIONS: 'false', PATH: emptyPath },
        },
      );

      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual({});
      expect(result.stderr).toContain('skipping outside CI');
    } finally {
      rmSync(emptyPath, { force: true, recursive: true });
    }
  });
});
