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
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const valeAvailable = (() => {
  const result = spawnSync('vale', ['--version'], { encoding: 'utf8' });
  return result.status === 0;
})();
const pinnedValeVersion = readFileSync('.vale-version', 'utf8').trim();

describe('Vale configuration', () => {
  it('keeps the style and token-ignore settings in one prose section', () => {
    const configuration = readFileSync('.vale.ini', 'utf8');
    const proseSection = '[*.{md,mdx,yaml,yml}]';

    expect(configuration.split(proseSection)).toHaveLength(2);
    expect(configuration).toContain(`${proseSection}\nBasedOnStyles = CMOS\nTokenIgnores = `);
  });
});

describe('Vale provisioning', () => {
  it('rejects a multiline repository version pin', () => {
    const directory = mkdtempSync(join(process.cwd(), '.ensure-vale-invalid-pin-'));
    try {
      const scriptDirectory = join(directory, 'scripts', 'lib');
      mkdirSync(scriptDirectory, { recursive: true });
      writeFileSync(join(directory, '.vale-version'), '3.18.\n0\n');
      writeFileSync(
        join(scriptDirectory, 'ensure-vale.sh'),
        readFileSync('scripts/lib/ensure-vale.sh', 'utf8'),
      );

      const result = spawnSync('bash', [join(scriptDirectory, 'ensure-vale.sh')], {
        encoding: 'utf8',
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain('invalid pinned version');
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
  });

  it('installs and verifies a pinned CI archive through the test seams', () => {
    const directory = mkdtempSync(join(tmpdir(), 'ensure-vale-test-'));
    try {
      const sourceDirectory = join(directory, 'source');
      const destinationDirectory = join(directory, 'destination');
      mkdirSync(sourceDirectory);
      mkdirSync(destinationDirectory);
      const fakeVale = join(sourceDirectory, 'vale');
      writeFileSync(fakeVale, `#!/usr/bin/env sh\necho "vale version ${pinnedValeVersion}"\n`);
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
        pinnedValeVersion,
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
      expect(result.stderr).toContain(`Vale 0.0.0 does not match pinned ${pinnedValeVersion}`);
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
      writeFileSync(
        verifiedVale,
        `#!/usr/bin/env sh\necho "vale verified version ${pinnedValeVersion}"\n`,
      );
      chmodSync(verifiedVale, 0o755);
      const staleVale = join(staleDirectory, 'vale');
      writeFileSync(
        staleVale,
        `#!/usr/bin/env sh\necho "vale stale version ${pinnedValeVersion}"\n`,
      );
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
    expect(alerts).toHaveLength(18);
    expect(alerts.map((alert) => alert.Line)).toEqual([
      5, 7, 9, 11, 14, 15, 18, 20, 22, 25, 27, 29, 43, 51, 62, 63, 67, 70,
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
        expect.objectContaining({ Line: 51, Severity: 'error' }),
        expect.objectContaining({ Line: 62, Severity: 'error' }),
        expect.objectContaining({ Line: 63, Severity: 'error' }),
        expect.objectContaining({ Line: 67, Severity: 'error' }),
        expect.objectContaining({ Line: 70, Severity: 'error' }),
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

  it.each([
    'tests/fixtures/vale-em-dash/invalid.yaml',
    'tests/fixtures/vale-em-dash/duplicate-key.yaml',
  ])('fails closed on invalid YAML while preserving Vale findings in %s', (fixture) => {
    const result = spawnSync(
      process.execPath,
      ['scripts/lint-prose.mjs', '--output=JSON', fixture],
      { encoding: 'utf8' },
    );

    expect(result.status).toBe(1);
    expect(JSON.parse(result.stdout)[fixture]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ Check: 'CMOS.EmDash', Line: 1, Severity: 'error' }),
      ]),
    );
  });

  it('applies YAML flow folding before treating line-edge spaces as prose padding', () => {
    const directory = mkdtempSync(join(tmpdir(), 'vale-yaml-line-edge-'));
    const fixture = join(directory, 'line-edge.yaml');
    try {
      writeFileSync(
        fixture,
        [
          'quotedBlank: "word—   ',
          '',
          '  continuation"',
          'plainBlank: word—   ',
          '',
          '  continuation',
          'quotedFold: "word—   ',
          '  continuation"',
          'plainFold: word—   ',
          '  continuation',
          'literalLeading: |',
          '  word',
          '  —next',
          'quotedLeadingBlank: "word',
          '',
          '  —next"',
          'quotedLeadingFold: "word',
          '  —next"',
          'foldedLeadingBlank: >',
          '  word',
          '',
          '  —next',
          'foldedLeading: >',
          '  word',
          '  —next',
          'rightNbsp: "word—\u00a0',
          '',
          '  continuation"',
          'leftNbsp: \u00a0—word',
          'escapedContinuation: "word\\',
          '  —next"',
          'escapedBackslash: "word\\\\',
          '  —next"',
          'emptyDouble: "',
          '  —next"',
          "emptySingle: '",
          "  —next'",
          '',
        ].join('\n'),
      );

      const result = spawnSync(
        process.execPath,
        ['scripts/lint-prose.mjs', '--output=JSON', fixture],
        { encoding: 'utf8' },
      );

      expect(result.status).toBe(1);
      const reportedPath = relative(process.cwd(), fixture);
      const alerts = JSON.parse(result.stdout)[reportedPath].filter(
        (alert) => alert.Check === 'CMOS.EmDash',
      );
      expect(alerts.map((alert) => alert.Line)).toEqual([7, 9, 17, 24, 26, 29, 32, 34, 36]);

      const crlfFixture = join(directory, 'line-edge-crlf.yaml');
      writeFileSync(
        crlfFixture,
        [
          'odd: "word\\',
          '  —next"',
          'even: "word\\\\',
          '  —next"',
          'blank: "word',
          '',
          '  —next"',
          'ordinary: "word',
          '  —next"',
          '',
        ].join('\r\n'),
      );
      const crlfResult = spawnSync(
        process.execPath,
        ['scripts/lint-prose.mjs', '--output=JSON', crlfFixture],
        { encoding: 'utf8' },
      );

      expect(crlfResult.status).toBe(1);
      const crlfReportedPath = relative(process.cwd(), crlfFixture);
      const crlfAlerts = JSON.parse(crlfResult.stdout)[crlfReportedPath].filter(
        (alert) => alert.Check === 'CMOS.EmDash',
      );
      expect(crlfAlerts.map((alert) => alert.Line)).toEqual([3, 8]);
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
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
  it('rejects a multiline repository version pin', () => {
    const directory = mkdtempSync(join(process.cwd(), '.lint-prose-invalid-pin-'));
    try {
      const scriptDirectory = join(directory, 'scripts');
      mkdirSync(scriptDirectory);
      writeFileSync(join(directory, '.vale-version'), '3.18.\n0\n');
      const linter = join(scriptDirectory, 'lint-prose.mjs');
      writeFileSync(linter, readFileSync('scripts/lint-prose.mjs', 'utf8'));

      const result = spawnSync(process.execPath, [linter, '--list-files'], {
        encoding: 'utf8',
      });

      expect(result.status).toBe(2);
      expect(result.stderr).toContain('invalid pinned version');
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
  });

  it('runs when Vale matches the repository pin', () => {
    const directory = mkdtempSync(join(tmpdir(), 'vale-version-match-'));
    try {
      const fakeVale = join(directory, 'vale');
      writeFileSync(
        fakeVale,
        `#!/usr/bin/env sh\nif [ "$1" = "--version" ]; then echo "vale version ${pinnedValeVersion}"; else echo "{}"; fi\n`,
      );
      chmodSync(fakeVale, 0o755);

      const result = spawnSync(
        process.execPath,
        [
          'scripts/lint-prose.mjs',
          '--output=JSON',
          'tests/fixtures/vale-frontmatter/no-frontmatter.md',
        ],
        {
          encoding: 'utf8',
          env: { ...process.env, PATH: `${directory}:/usr/bin:/bin` },
        },
      );

      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual({});
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
  });

  it('fails closed with a clear message when Vale does not match the repository pin', () => {
    const directory = mkdtempSync(join(tmpdir(), 'vale-version-mismatch-'));
    try {
      const fakeVale = join(directory, 'vale');
      writeFileSync(
        fakeVale,
        '#!/usr/bin/env sh\nif [ "$1" = "--version" ]; then echo "vale version 9.9.9"; else echo "{}"; fi\n',
      );
      chmodSync(fakeVale, 0o755);

      const result = spawnSync(
        process.execPath,
        [
          'scripts/lint-prose.mjs',
          '--output=JSON',
          'tests/fixtures/vale-frontmatter/no-frontmatter.md',
        ],
        {
          encoding: 'utf8',
          env: { ...process.env, PATH: `${directory}:/usr/bin:/bin` },
        },
      );

      expect(result.status).toBe(2);
      expect(result.stderr).toContain(`Vale 9.9.9 does not match pinned ${pinnedValeVersion}`);
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
  });

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
