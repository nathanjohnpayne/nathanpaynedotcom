import { describe, expect, it } from 'vitest';
import {
  bindPushToPrs,
  contextStateAtMerge,
  evaluateMerge,
  issueHasMarker,
  markerFor,
  renderIssue,
  requiredContexts,
  rulesetHidesRules,
  rulesRequireUpToDate,
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
  const bind = (before, shas, assoc) =>
    bindPushToPrs({
      before,
      commits: shas.map((sha) => ({ sha })),
      associations: new Map(Object.entries(assoc)),
    });

  it('binds a squash merge to its PR with the pre-push tip as base', () => {
    const out = bind('b0', ['s1'], { s1: [pr(7, 's1')] });
    expect(out.direct).toEqual([]);
    expect(out.groups.map((g) => [g.pr.number, g.shas, g.baseSha])).toEqual([[7, ['s1'], 'b0']]);
  });

  it('binds every commit of a rebase or merge-commit push to one PR', () => {
    const rebase = bind('b0', ['r1', 'r2', 'r3'], {
      r1: [pr(8, 'r3')],
      r2: [pr(8, 'r3')],
      r3: [pr(8, 'r3')],
    });
    expect(rebase.groups.map((g) => [g.pr.number, g.shas.length, g.baseSha])).toEqual([
      [8, 3, 'b0'],
    ]);
    const merge = bind('b0', ['c1', 'm1'], { c1: [pr(9, 'm1')], m1: [pr(9, 'm1')] });
    expect(merge.groups.map((g) => [g.pr.number, g.baseSha])).toEqual([[9, 'b0']]);
    expect(merge.direct).toEqual([]);
  });

  it('treats a commit associated only with an older merged PR as a direct push', () => {
    // h1 was the head of #5, which squash-merged long ago as `old`.
    const out = bind('b0', ['h1'], { h1: [pr(5, 'old')] });
    expect(out.direct).toEqual(['h1']);
    expect(out.groups).toEqual([]);
  });

  it('advances the base across a direct push followed by a merge', () => {
    const out = bind('b0', ['d1', 's2'], { d1: [], s2: [pr(10, 's2')] });
    expect(out.direct).toEqual(['d1']);
    expect(out.groups[0].baseSha).toBe('d1');
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
