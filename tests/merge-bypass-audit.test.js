import { describe, expect, it } from 'vitest';
import {
  bindPushToPrs,
  cell,
  contextStateAtMerge,
  evaluateMerge,
  issueHasMarker,
  markerFor,
  parseArgs,
  renderIssue,
  requiredContexts,
  rulesetHidesRules,
  rulesRequireUpToDate,
  suiteGroup,
} from '../scripts/merge-bypass-audit.mjs';

// Synthetic fixtures for the pure half of scripts/merge-bypass-audit.mjs
// (#1024). The I/O half is validated against real merges whose outcome is
// known; the ground-truth set and results are in the #1072 PR description.

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
    expect(state({ checkRuns, suiteGroups: new Map([[1, 'event:pull_request']]) })).toBe('success');
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
    const rollupSuites = new Map([['lint', new Map([[1, 'event:pull_request']])]]);
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
    expect(title).toBe('Merge bypass: #1067 merged past 1 protection requirement');
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
    expect(body).toContain('no pull request merge produced this update');
    expect(body).not.toContain('no merged pull request contains it');
  });
});

describe('review round 1 (#1072)', () => {
  it('labels a run by what it showed at the merge, noting a later finish', () => {
    const checkRuns = [run({ started: '2026-09-26T17:45:00Z', completed: '2026-09-26T17:46:00Z' })];
    const { state: s, evidence } = contextStateAtMerge({
      context: 'lint',
      appId: ACTIONS,
      checkRuns,
      statuses: [],
      mergedAt: MERGED,
    });
    expect(s).toBe('pending');
    expect(evidence[0].conclusion).toBe('in progress, finished later: success');
  });

  it('unions ruleset-required checks with classic protection', () => {
    const protection = {
      enabled: true,
      required_status_checks: { checks: [{ context: 'lint', app_id: ACTIONS }] },
    };
    const rules = [
      { type: 'pull_request', parameters: {} },
      {
        type: 'required_status_checks',
        parameters: {
          strict_required_status_checks_policy: true,
          required_status_checks: [
            { context: 'lint', integration_id: ACTIONS },
            { context: 'deploy-preview' },
          ],
        },
      },
    ];
    expect(requiredContexts(protection, rules)).toEqual([
      { context: 'lint', app_id: ACTIONS },
      { context: 'deploy-preview', app_id: null },
    ]);
    expect(requiredContexts(undefined, rules)).toHaveLength(2);
    expect(rulesRequireUpToDate(rules)).toBe(true);
    expect(rulesRequireUpToDate([])).toBe(false);
  });

  const pr = (number, merge) => ({
    number,
    merged_at: MERGED,
    base: { ref: 'main' },
    merge_commit_sha: merge,
  });
  // commits: [[sha, ...parentShas]] in compare (chronological) order.
  const bind = (commits, assoc) =>
    bindPushToPrs({
      commits: commits.map(([sha, ...parents]) => ({
        sha,
        parents: parents.map((p) => ({ sha: p })),
      })),
      associations: new Map(Object.entries(assoc)),
    });

  it('binds a squash merge to its PR with its parent as base', () => {
    const out = bind([['s1', 'b0']], { s1: [pr(7, 's1')] });
    expect(out.direct).toEqual([]);
    expect(out.groups.map((g) => [g.pr.number, g.shas, g.baseSha])).toEqual([[7, ['s1'], 'b0']]);
  });

  it('binds every commit of a rebase or merge-commit push to one PR', () => {
    const rebase = bind(
      [
        ['r1', 'b0'],
        ['r2', 'r1'],
        ['r3', 'r2'],
      ],
      { r1: [pr(8, 'r3')], r2: [pr(8, 'r3')], r3: [pr(8, 'r3')] },
    );
    expect(rebase.groups.map((g) => [g.pr.number, g.shas.length, g.baseSha])).toEqual([
      [8, 3, 'b0'],
    ]);
    const merge = bind(
      [
        ['c1', 'x0'],
        ['m1', 'b0', 'c1'],
      ],
      { c1: [pr(9, 'm1')], m1: [pr(9, 'm1')] },
    );
    expect(merge.groups.map((g) => [g.pr.number, g.baseSha])).toEqual([[9, 'b0']]);
    expect(merge.direct).toEqual([]);
  });

  it('derives interleaved merge-commit bases from ancestry, not list order', () => {
    // Chronological order interleaves the two PRs: a1, b1, mergeA, mergeB.
    const out = bind(
      [
        ['a1', 'x0'],
        ['b1', 'x0'],
        ['mA', 'b0', 'a1'],
        ['mB', 'mA', 'b1'],
      ],
      { a1: [pr(1, 'mA')], mA: [pr(1, 'mA')], b1: [pr(2, 'mB')], mB: [pr(2, 'mB')] },
    );
    expect(out.groups.map((g) => [g.pr.number, g.baseSha])).toEqual([
      [1, 'b0'],
      [2, 'mA'],
    ]);
  });

  it('treats a commit associated only with an older merged PR as a direct push', () => {
    // h1 was the head of #5, which squash-merged long ago as `old`.
    const out = bind([['h1', 'b0']], { h1: [pr(5, 'old')] });
    expect(out.direct).toEqual(['h1']);
    expect(out.groups).toEqual([]);
  });

  it('bases a merge after a direct push on the direct commit', () => {
    const out = bind(
      [
        ['d1', 'b0'],
        ['s2', 'd1'],
      ],
      { d1: [], s2: [pr(10, 's2')] },
    );
    expect(out.direct).toEqual(['d1']);
    expect(out.groups[0].baseSha).toBe('d1');
  });

  it('reports an unfollowable ancestry as an unknown base', () => {
    const out = bind([['s1']], { s1: [pr(11, 's1')] });
    expect(out.groups[0].baseSha).toBeNull();
  });

  it('renders a forced rewind with its own marker', () => {
    const finding = {
      kind: 'force-push',
      before: 'aaaaaaa1',
      after: 'bbbbbbb2',
      status: 'behind',
      pusher: 'x',
    };
    const { title, body } = renderIssue(finding, { repo: 'o/r' });
    expect(title).toBe('Merge bypass: main was rewritten from aaaaaaa to bbbbbbb');
    expect(markerFor(finding)).toBe('merge-bypass-audit:force=aaaaaaa1..bbbbbbb2');
    expect(body).toContain('`behind`');
  });

  it('adds the backfill caveat only to backfilled findings', () => {
    const finding = { kind: 'direct-push', sha: 'abcdef1234567', message: 'm' };
    expect(renderIssue(finding, { repo: 'o/r', backfill: true }).body).toContain('Backfill caveat');
    expect(renderIssue(finding, { repo: 'o/r' }).body).not.toContain('Backfill caveat');
  });
});

describe('review round 2 (#1072)', () => {
  it('trusts a viewer-scoped rules read only past rulesets with an empty bypass list', () => {
    expect(rulesetHidesRules({ id: 1, bypass_actors: [] })).toBeNull();
    expect(rulesetHidesRules({ id: 2, bypass_actors: [{ actor_type: 'Integration' }] })).toMatch(
      /has bypass actors/,
    );
    // GitHub omits the field when the token cannot see it: not the same as empty.
    expect(rulesetHidesRules({ id: 3 })).toMatch(/did not report a bypass_actors array/);
  });
});

describe('review round 3 (#1072)', () => {
  it('states when branch freshness was required but not audited', () => {
    const finding = {
      kind: 'merged-pr',
      pr: { number: 9, title: 't', merged_at: MERGED, merged_by: 'x', head_sha: 'abcdef1234' },
      violations: [{ context: 'lint', state: 'failure', evidence: [] }],
      freshness: 'not audited: ambiguous base',
    };
    expect(renderIssue(finding, { repo: 'o/r' }).body).toContain(
      '**Branch freshness:** not audited: ambiguous base',
    );
    const { freshness, ...withoutNote } = finding;
    expect(freshness).toBeTruthy();
    expect(renderIssue(withoutNote, { repo: 'o/r' }).body).not.toContain('Branch freshness');
  });
});

describe('review round 4 (#1072 Phase 4b)', () => {
  const prFinding = (number) => ({ kind: 'merged-pr', pr: { number } });

  it('matches the complete dedupe marker, never a prefix', () => {
    const body10 = 'x\n<!-- merge-bypass-audit:pr=10 -->\ny';
    const body1072 = '<!-- merge-bypass-audit:pr=1072 -->';
    expect(issueHasMarker(body10, prFinding(10))).toBe(true);
    expect(issueHasMarker(body10, prFinding(1))).toBe(false);
    expect(issueHasMarker(body1072, prFinding(107))).toBe(false);
    expect(issueHasMarker(body1072, prFinding(1072))).toBe(true);
    expect(issueHasMarker(null, prFinding(1))).toBe(false);
  });

  it('marks unpinned contexts as judged on the head commit only', () => {
    const violations = evaluateMerge({
      required: [
        { context: 'lint', app_id: ACTIONS },
        { context: 'external-ci', app_id: null },
      ],
      checkRuns: [],
      statuses: [],
      mergedAt: MERGED,
    });
    expect(violations.map((v) => [v.context, Boolean(v.headOnly)])).toEqual([
      ['lint', false],
      ['external-ci', true],
    ]);
    const { body } = renderIssue(
      {
        kind: 'merged-pr',
        pr: { number: 3, title: 't', merged_at: MERGED, head_sha: 'abcdef1' },
        violations,
      },
      { repo: 'o/r' },
    );
    expect(body).toContain('| external-ci (head commit only) | **missing** |');
    expect(body).toContain('| lint | **missing** |');
  });
});

describe('parseArgs (#1072 round 5)', () => {
  const sha = 'abcdef1234567';

  it('rejects a value flag with no operand instead of treating it as absent', () => {
    expect(() => parseArgs(['--after', sha, '--before'])).toThrow(/--before needs a value/);
    expect(() => parseArgs(['--after', '--before', sha])).toThrow(/--after needs a value/);
    expect(() => parseArgs(['--pr'])).toThrow(/--pr needs a value/);
  });

  it('requires a positive sweep window and PR number', () => {
    expect(() => parseArgs(['--since-minutes', '0'])).toThrow(/positive integer/);
    expect(() => parseArgs(['--pr', '0'])).toThrow(/must be a number/);
    expect(parseArgs(['--since-minutes', '180']).sinceMinutes).toBe('180');
  });

  it('accepts the push invocation, including an empty pusher name', () => {
    expect(parseArgs(['--before', sha, '--after', sha, '--pusher', ''])).toMatchObject({
      before: sha,
      after: sha,
      pusher: '',
    });
  });
});

describe('Codex round 3 (#1072)', () => {
  it('counts a rerun queued before the merge as pending, superseding an earlier green run', () => {
    const green = run({
      suite: 7,
      started: '2026-09-26T17:00:00Z',
      completed: '2026-09-26T17:01:00Z',
    });
    const queued = { ...run({ suite: 7, started: null }), started_at: null, status: 'queued' };
    // The rerun itself was queued before the merge (17:40 < 17:45:27).
    const queuedAt = new Map([[queued.id, '2026-09-26T17:40:00Z']]);
    const result = contextStateAtMerge({
      context: 'lint',
      appId: ACTIONS,
      checkRuns: [green, queued],
      statuses: [],
      mergedAt: MERGED,
      queuedAt,
    });
    expect(result.state).toBe('pending');
    expect(result.evidence[0].conclusion).toBe('queued');
    // A rerun queued AFTER the merge in the same, older suite is ignored.
    expect(
      contextStateAtMerge({
        context: 'lint',
        appId: ACTIONS,
        checkRuns: [green, queued],
        statuses: [],
        mergedAt: MERGED,
        queuedAt: new Map([[queued.id, '2026-09-26T18:00:00Z']]),
      }).state,
    ).toBe('success');
    // Without a queue time for the run itself, it is ignored.
    expect(
      contextStateAtMerge({
        context: 'lint',
        appId: ACTIONS,
        checkRuns: [green, queued],
        statuses: [],
        mergedAt: MERGED,
      }).state,
    ).toBe('success');
  });

  it('escapes table delimiters, backslashes and line breaks in dynamic cells', () => {
    expect(cell('a|b')).toBe('a\\|b');
    expect(cell('a\\b')).toBe('a\\\\b');
    expect(cell('a\nb')).toBe('a b');
    const { body } = renderIssue(
      {
        kind: 'merged-pr',
        pr: { number: 4, title: 't', merged_at: MERGED, head_sha: 'abcdef1' },
        violations: [
          { context: 'lint | fast', state: 'failure', evidence: [{ conclusion: 'failure' }] },
        ],
      },
      { repo: 'o/r' },
    );
    expect(body).toContain('| lint \\| fast | **failure** | failure |');
  });

  it('names a freshness-only breach as a stale branch, not failing checks', () => {
    const stale = {
      kind: 'merged-pr',
      pr: { number: 5, title: 't', merged_at: MERGED, head_sha: 'abcdef1' },
      violations: [
        { context: 'Branch up to date with `main` (strict)', state: 'behind', evidence: [] },
      ],
    };
    const { body } = renderIssue(stale, { repo: 'o/r' });
    expect(body).toContain('was not up to date with `main`');
    expect(body).not.toContain('were not green');
  });
});

describe('per-event supersession (#1072 rework)', () => {
  const red = (suite, started) =>
    run({ suite, started, completed: started.replace(/:00Z$/, ':30Z'), conclusion: 'failure' });
  const green = (suite, started) =>
    run({ suite, started, completed: started.replace(/:00Z$/, ':30Z') });

  it('lets a newer run of the same event supersede an older suite (the #1078 shape)', () => {
    const checkRuns = [red(1, '2026-09-26T17:00:00Z'), green(2, '2026-09-26T17:30:00Z')];
    const suiteGroups = new Map([
      [1, 'event:pull_request'],
      [2, 'event:pull_request'],
    ]);
    expect(state({ checkRuns, suiteGroups })).toBe('success');
  });

  it('does not let a run of a different event supersede a red one (the #1071 shape)', () => {
    const checkRuns = [red(1, '2026-09-26T17:00:00Z'), green(2, '2026-09-26T17:30:00Z')];
    const suiteGroups = new Map([
      [1, 'event:pull_request'],
      [2, 'event:pull_request_review'],
    ]);
    expect(state({ checkRuns, suiteGroups })).toBe('failure');
  });

  it('keeps an older red run when the newer same-event run started after the merge', () => {
    const checkRuns = [red(1, '2026-09-26T17:00:00Z'), green(2, '2026-09-26T17:50:00Z')];
    const suiteGroups = new Map([
      [1, 'event:pull_request'],
      [2, 'event:pull_request'],
    ]);
    expect(state({ checkRuns, suiteGroups })).toBe('failure');
  });

  it('groups a suite with no workflow run by itself', () => {
    expect(suiteGroup({ databaseId: 9, workflowRun: { event: 'pull_request' } })).toBe(
      'event:pull_request',
    );
    expect(suiteGroup({ databaseId: 9, workflowRun: null })).toBe('suite:9');
  });
});

describe('reruns queued before the merge but started after it (#1072 Phase 4b round 3)', () => {
  const older = () =>
    run({ suite: 3, started: '2026-09-26T17:00:00Z', completed: '2026-09-26T17:01:00Z' });

  it('counts the rerun as pending at the merge, even after it starts and finishes', () => {
    const green = older();
    // Queued 17:40, merge 17:45:27, started 17:46, finished green 17:47.
    const rerun = run({
      suite: 3,
      started: '2026-09-26T17:46:00Z',
      completed: '2026-09-26T17:47:00Z',
    });
    const result = contextStateAtMerge({
      context: 'lint',
      appId: ACTIONS,
      checkRuns: [green, rerun],
      statuses: [],
      mergedAt: MERGED,
      queuedAt: new Map([[rerun.id, '2026-09-26T17:40:00Z']]),
    });
    expect(result.state).toBe('pending');
    expect(result.evidence[0].conclusion).toBe('queued, finished later: success');
  });

  it('ignores a rerun queued after the merge', () => {
    const green = older();
    const rerun = run({
      suite: 3,
      started: '2026-09-26T17:46:00Z',
      completed: '2026-09-26T17:47:00Z',
    });
    const result = contextStateAtMerge({
      context: 'lint',
      appId: ACTIONS,
      checkRuns: [green, rerun],
      statuses: [],
      mergedAt: MERGED,
      queuedAt: new Map([[rerun.id, '2026-09-26T17:46:00Z']]),
    });
    expect(result.state).toBe('success');
  });
});
