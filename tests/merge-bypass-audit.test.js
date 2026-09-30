import { describe, expect, it } from 'vitest';
import {
  contextStateAtMerge,
  evaluateMerge,
  markerFor,
  renderIssue,
  requiredContexts,
} from '../scripts/merge-bypass-audit.mjs';

// Synthetic fixtures for the pure half of scripts/merge-bypass-audit.mjs
// (#1024). The I/O half was validated against real merges when it landed:
// the six bypasses #1024 names (#1001, #973, #958, #904, #893, #885) plus
// #1067 flag, and #1066, #1068, #1069, #1070 and #1058 come back clean.

const ACTIONS = 15368;
const MERGED = '2026-09-26T17:45:27Z';

let nextId = 1;
function run({
  name = 'lint',
  suite = 1,
  started,
  completed,
  conclusion = 'success',
  app = ACTIONS,
}) {
  return {
    id: nextId++,
    name,
    app: { id: app },
    check_suite: { id: suite },
    started_at: started,
    completed_at: completed ?? null,
    status: completed ? 'completed' : 'in_progress',
    conclusion: completed ? conclusion : null,
    html_url: `https://example.test/runs/${nextId}`,
  };
}

function state(opts) {
  return contextStateAtMerge({
    context: 'lint',
    appId: ACTIONS,
    statuses: [],
    mergedAt: MERGED,
    ...opts,
  }).state;
}

describe('contextStateAtMerge', () => {
  it('is success when the only suite passed before the merge', () => {
    const checkRuns = [run({ started: '2026-09-26T17:00:00Z', completed: '2026-09-26T17:01:00Z' })];
    expect(state({ checkRuns })).toBe('success');
  });

  it('treats neutral and skipped as passing, like branch protection does', () => {
    const checkRuns = [
      run({
        suite: 1,
        started: '2026-09-26T17:00:00Z',
        completed: '2026-09-26T17:01:00Z',
        conclusion: 'neutral',
      }),
      run({
        suite: 2,
        started: '2026-09-26T17:00:00Z',
        completed: '2026-09-26T17:01:00Z',
        conclusion: 'skipped',
      }),
    ];
    expect(state({ checkRuns })).toBe('success');
  });

  it('does not let a later green run in another suite supersede a red one', () => {
    const checkRuns = [
      run({
        suite: 1,
        started: '2026-09-26T17:00:00Z',
        completed: '2026-09-26T17:01:00Z',
        conclusion: 'failure',
      }),
      run({ suite: 2, started: '2026-09-26T17:30:00Z', completed: '2026-09-26T17:31:00Z' }),
    ];
    expect(state({ checkRuns })).toBe('failure');
  });

  it('lets a rerun inside the same suite replace the earlier failure', () => {
    const checkRuns = [
      run({
        suite: 1,
        started: '2026-09-26T17:00:00Z',
        completed: '2026-09-26T17:01:00Z',
        conclusion: 'failure',
      }),
      run({ suite: 1, started: '2026-09-26T17:30:00Z', completed: '2026-09-26T17:31:00Z' }),
    ];
    expect(state({ checkRuns })).toBe('success');
  });

  it('ignores red suites the rollup does not count (the #1068 case)', () => {
    const checkRuns = [
      run({ suite: 1, started: '2026-09-26T17:00:00Z', completed: '2026-09-26T17:01:00Z' }),
      run({
        suite: 2,
        started: '2026-09-26T17:40:00Z',
        completed: '2026-09-26T17:40:30Z',
        conclusion: 'failure',
      }),
    ];
    expect(state({ checkRuns })).toBe('failure');
    expect(state({ checkRuns, countedSuites: new Set([1]) })).toBe('success');
  });

  it('judges a suite by what it showed at the merge, not by a later rerun', () => {
    const checkRuns = [
      run({
        suite: 1,
        started: '2026-09-26T17:00:00Z',
        completed: '2026-09-26T17:01:00Z',
        conclusion: 'failure',
      }),
      run({ suite: 1, started: '2026-09-26T17:50:00Z', completed: '2026-09-26T17:51:00Z' }),
    ];
    expect(state({ checkRuns })).toBe('failure');
  });

  it('is pending when a run had started but not finished at the merge', () => {
    const checkRuns = [run({ started: '2026-09-26T17:45:00Z', completed: '2026-09-26T17:46:00Z' })];
    expect(state({ checkRuns })).toBe('pending');
    expect(state({ checkRuns: [run({ started: '2026-09-26T17:45:00Z' })] })).toBe('pending');
  });

  it('is missing when nothing had reported by the merge', () => {
    expect(state({ checkRuns: [] })).toBe('missing');
    expect(
      state({
        checkRuns: [run({ started: '2026-09-26T17:46:00Z', completed: '2026-09-26T17:47:00Z' })],
      }),
    ).toBe('missing');
  });

  it('counts only check runs from the pinned app', () => {
    const checkRuns = [
      run({ started: '2026-09-26T17:00:00Z', completed: '2026-09-26T17:01:00Z', app: 999 }),
    ];
    expect(state({ checkRuns })).toBe('missing');
    expect(state({ checkRuns, appId: null })).toBe('success');
  });

  it('uses the latest commit status before the merge only when the context is not app-pinned', () => {
    const statuses = [
      { id: 1, context: 'lint', state: 'success', created_at: '2026-09-26T17:00:00Z' },
      { id: 2, context: 'lint', state: 'failure', created_at: '2026-09-26T17:10:00Z' },
      { id: 3, context: 'lint', state: 'success', created_at: '2026-09-26T17:50:00Z' },
    ];
    expect(state({ checkRuns: [], statuses, appId: null })).toBe('failure');
    expect(state({ checkRuns: [], statuses, appId: ACTIONS })).toBe('missing');
  });
});

describe('evaluateMerge', () => {
  const required = [
    { context: 'lint', app_id: ACTIONS },
    { context: 'build-and-test', app_id: ACTIONS },
  ];

  it('returns no violations when every required context was green', () => {
    const checkRuns = [
      run({ name: 'lint', started: '2026-09-26T17:00:00Z', completed: '2026-09-26T17:01:00Z' }),
      run({
        name: 'build-and-test',
        suite: 2,
        started: '2026-09-26T17:00:00Z',
        completed: '2026-09-26T17:05:00Z',
      }),
    ];
    expect(evaluateMerge({ required, checkRuns, statuses: [], mergedAt: MERGED })).toEqual([]);
  });

  it('reports each context that was not green', () => {
    const checkRuns = [
      run({
        name: 'lint',
        started: '2026-09-26T17:00:00Z',
        completed: '2026-09-26T17:01:00Z',
        conclusion: 'failure',
      }),
    ];
    const violations = evaluateMerge({ required, checkRuns, statuses: [], mergedAt: MERGED });
    expect(violations.map((v) => [v.context, v.state])).toEqual([
      ['lint', 'failure'],
      ['build-and-test', 'missing'],
    ]);
  });

  it('treats a context absent from the rollup as missing', () => {
    const checkRuns = [
      run({ name: 'lint', started: '2026-09-26T17:00:00Z', completed: '2026-09-26T17:01:00Z' }),
      run({
        name: 'build-and-test',
        suite: 2,
        started: '2026-09-26T17:00:00Z',
        completed: '2026-09-26T17:05:00Z',
      }),
    ];
    const rollupSuites = new Map([['lint', new Set([1])]]);
    const violations = evaluateMerge({
      required,
      checkRuns,
      statuses: [],
      mergedAt: MERGED,
      rollupSuites,
    });
    expect(violations.map((v) => [v.context, v.state])).toEqual([['build-and-test', 'missing']]);
  });

  it('refuses to conclude anything from an empty required set', () => {
    expect(() =>
      evaluateMerge({ required: [], checkRuns: [], statuses: [], mergedAt: MERGED }),
    ).toThrow(/cannot audit/);
  });
});

describe('requiredContexts', () => {
  it('reads app pins from the branch API', () => {
    const protection = {
      enabled: true,
      required_status_checks: {
        enforcement_level: 'non_admins',
        contexts: ['lint'],
        checks: [{ context: 'lint', app_id: ACTIONS }],
      },
    };
    expect(requiredContexts(protection)).toEqual([{ context: 'lint', app_id: ACTIONS }]);
  });

  it('falls back to bare contexts with no pin', () => {
    const protection = { enabled: true, required_status_checks: { contexts: ['lint'] } };
    expect(requiredContexts(protection)).toEqual([{ context: 'lint', app_id: null }]);
  });

  it('returns nothing for an unprotected branch', () => {
    expect(requiredContexts({ enabled: false })).toEqual([]);
    expect(requiredContexts(undefined)).toEqual([]);
  });
});

describe('renderIssue', () => {
  const merged = {
    kind: 'merged-pr',
    pr: {
      number: 1067,
      title: 'A post',
      merged_at: MERGED,
      merged_by: 'nathanjohnpayne',
      head_sha: '9b2fe8c87b61',
    },
    violations: [
      {
        context: 'Label Gate',
        state: 'failure',
        evidence: [{ conclusion: 'failure', url: 'https://x' }],
      },
    ],
  };

  it('carries a per-PR dedupe marker and one row per violation', () => {
    const { title, body } = renderIssue(merged, { repo: 'o/r', enforcementLevel: 'non_admins' });
    expect(title).toBe('Merge bypass: #1067 merged past 1 required check');
    expect(body).toContain(`<!-- ${markerFor(merged)} -->`);
    expect(markerFor(merged)).toBe('merge-bypass-audit:pr=1067');
    expect(body).toContain('| Label Gate | **failure** | [failure](https://x) |');
    expect(body).toContain('`enforcement_level: non_admins`');
  });

  it('describes a direct push', () => {
    const finding = {
      kind: 'direct-push',
      sha: 'abcdef1234567',
      message: 'oops',
      pusher: 'someone',
    };
    const { title, body } = renderIssue(finding, { repo: 'o/r' });
    expect(title).toBe('Merge bypass: commit abcdef1 reached main without a pull request');
    expect(body).toContain('<!-- merge-bypass-audit:commit=abcdef1234567 -->');
    expect(body).toContain('`someone`');
  });
});
