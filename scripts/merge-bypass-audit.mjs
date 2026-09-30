#!/usr/bin/env node
// Merge bypass audit (#1024).
//
// `main`'s branch protection requires seven status checks, but with
// `enforce_admins: false` (the branch API reports it as
// `enforcement_level: non_admins`) the admin account that performs every
// merge can merge past a red or missing required check. The weekly
// pr-audit.yml is the only other detector, so a bypass could sit
// unnoticed for up to seven days.
//
// This script runs on every push to `main` and answers one question for
// each pushed commit: at the moment it landed, would branch protection have
// blocked a non-admin? Concretely:
//
//   - A commit with no merged pull request behind it is a direct push.
//   - For a merged PR, every required context is rebuilt as of `merged_at`
//     on the PR's head commit. A context is `missing` when nothing had
//     reported, `pending` when a run had started but not finished, and
//     `failure` when any run GitHub was still counting had failed.
//
// "Still counting" defers to GitHub's own rollup rather than to intuition.
// The rollup evaluates the latest run of every check suite it associates
// with the PR, so a later green run in a different suite does NOT supersede
// an earlier red one; only a rerun inside the same suite replaces a result.
// Which suites it associates is GitHub's call, and it is not "every suite on
// the commit": on #1068 three red `pull_request_review_comment` suites sat on
// the head commit and the merge was still CLEAN. So the script reads the set
// of counted suites from the PR's `statusCheckRollup` and uses the REST
// check-run history only to rebuild each counted suite's state as of the
// merge. See REVIEW_POLICY.md § Do the merge gates bind the merging identity?
//
// When a required check is pinned to an app (`checks[].app_id`), only check
// runs from that app count, matching how GitHub resolves it. Commit statuses
// count only for contexts with no app pin.
//
// It is repo-owned, not a mergepath mirror: pr-audit.yml is canonical and
// would be overwritten by the next sync wave, so the signal lives here.
//
// Usage (CI):
//   GITHUB_TOKEN=... GITHUB_REPOSITORY=owner/repo \
//     node scripts/merge-bypass-audit.mjs --before <sha> --after <sha>
//   node scripts/merge-bypass-audit.mjs --pr <number>     # backfill one PR
//   node scripts/merge-bypass-audit.mjs --since-minutes <n>  # scheduled sweep
//   add --dry-run to print findings without opening issues
//
// Exit codes: 0 clean or every finding already filed, 1 a new bypass was
// filed (or any finding under --dry-run), 2 infrastructure or usage error
// (nothing can be concluded).

import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const PASSING_CONCLUSIONS = new Set(['success', 'neutral', 'skipped']);
const MARKER_PREFIX = 'merge-bypass-audit:';
export const ISSUE_LABELS = ['policy-violation', 'audit'];

const byTime = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

const NOT_STARTED = new Set(['queued', 'waiting', 'pending', 'requested']);

/**
 * State of one check run as of `mergedAt`, or null if it did not exist then.
 * ISO-8601 UTC strings compare correctly as strings.
 *
 * A run queued but not yet started has `started_at: null`. It still counts
 * (as pending) when its check suite existed by the merge: a queued rerun is
 * the newest run in its suite, and a non-admin would have seen it pending.
 * `suiteCreatedAt` maps suite id -> created_at; without it a queued run is
 * treated as not yet existing.
 */
function runStateAt(run, mergedAt, suiteCreatedAt) {
  if (!run.started_at) {
    const created = suiteCreatedAt?.get(run.check_suite?.id);
    return NOT_STARTED.has(run.status) && created && created <= mergedAt ? 'pending' : null;
  }
  if (run.started_at > mergedAt) return null;
  if (run.status !== 'completed' || !run.completed_at || run.completed_at > mergedAt) {
    return 'pending';
  }
  return PASSING_CONCLUSIONS.has(run.conclusion) ? 'success' : 'failure';
}

function statusStateAt(status) {
  if (status.state === 'success') return 'success';
  if (status.state === 'pending') return 'pending';
  return 'failure'; // failure, error
}

/**
 * Rebuild one required context as of the merge.
 *
 * `countedSuites`, when given, is the set of check-suite ids GitHub's rollup
 * counts for this context; runs in any other suite are ignored. Omitting it
 * counts every suite, which is only right for synthetic inputs.
 *
 * Returns { state, evidence } where state is success | failure | pending |
 * missing and evidence lists the entries that decided it.
 */
export function contextStateAtMerge({ context, appId, checkRuns, statuses, mergedAt, countedSuites, suiteCreatedAt }) {
  const pinned = appId !== null && appId !== undefined && appId !== -1;
  const evidence = [];

  // Latest run per check suite, among runs that had started by the merge.
  const latestPerSuite = new Map();
  for (const run of checkRuns) {
    if (run.name !== context) continue;
    if (pinned && run.app?.id !== appId) continue;
    if (countedSuites && !countedSuites.has(run.check_suite?.id)) continue;
    if (runStateAt(run, mergedAt, suiteCreatedAt) === null) continue;
    const suite = run.check_suite?.id ?? `run-${run.id}`;
    const prev = latestPerSuite.get(suite);
    // A queued run (no start time yet) is the newest in its suite.
    const key = (r) => r.started_at ?? '\uffff';
    if (!prev || byTime(key(prev), key(run)) < 0 || (key(prev) === key(run) && prev.id < run.id)) {
      latestPerSuite.set(suite, run);
    }
  }
  for (const run of latestPerSuite.values()) {
    const atMerge = runStateAt(run, mergedAt, suiteCreatedAt);
    // Label what the run showed AT the merge. A run still going then may
    // have finished since; say so rather than print the later outcome as
    // though it were the state being judged.
    let conclusion = atMerge === 'pending' ? (run.started_at ? 'in progress' : 'queued') : run.conclusion;
    if (atMerge === 'pending' && run.status === 'completed') conclusion += `, finished later: ${run.conclusion}`;
    evidence.push({
      kind: 'check_run',
      state: atMerge,
      conclusion,
      url: run.html_url,
      at: run.completed_at ?? run.started_at,
    });
  }

  if (!pinned) {
    const latest = statuses
      .filter((s) => s.context === context && s.created_at <= mergedAt)
      .sort((a, b) => byTime(b.created_at, a.created_at) || b.id - a.id)[0];
    if (latest) {
      evidence.push({
        kind: 'status',
        state: statusStateAt(latest),
        conclusion: latest.state,
        url: latest.target_url,
        at: latest.created_at,
      });
    }
  }

  let state = 'missing';
  if (evidence.some((e) => e.state === 'failure')) state = 'failure';
  else if (evidence.some((e) => e.state === 'pending')) state = 'pending';
  else if (evidence.length > 0) state = 'success';
  return { state, evidence };
}

/**
 * Evaluate a merged PR against the required contexts. Returns the contexts
 * that were not green at merge; an empty array means the merge was clean.
 */
export function evaluateMerge({ required, checkRuns, statuses, mergedAt, rollupSuites, suiteCreatedAt }) {
  if (!Array.isArray(required) || required.length === 0) {
    // An empty list would make every merge look clean. Refuse to conclude.
    throw new Error('no required status checks visible on the protected branch; cannot audit');
  }
  const violations = [];
  for (const { context, app_id: appId } of required) {
    const countedSuites = rollupSuites ? (rollupSuites.get(context) ?? new Set()) : undefined;
    const result = contextStateAtMerge({
      context,
      appId,
      checkRuns,
      statuses,
      mergedAt,
      countedSuites,
      suiteCreatedAt,
    });
    // An unpinned context can be satisfied by a commit status, and GitHub
    // may evaluate statuses on the PR's test merge commit, which cannot be
    // recovered after the merge. Its verdict is therefore from the head only.
    const headOnly = appId === null || appId === undefined || appId === -1;
    if (result.state !== 'success') violations.push({ context, ...result, ...(headOnly ? { headOnly } : {}) });
  }
  return violations;
}

/**
 * Required contexts as [{ context, app_id }]: the union of classic branch
 * protection (the branch API's `protection` block) and every active ruleset
 * rule of type `required_status_checks` that applies to the branch
 * (`GET /rules/branches/{branch}`). GitHub enforces both surfaces together,
 * so reading only one would let a bypass of the other report clean.
 */
export function requiredContexts(protection, rules = []) {
  const out = [];
  const seen = new Set();
  const add = (context, appId) => {
    const key = `${context}\u0000${appId ?? ''}`;
    if (!context || seen.has(key)) return;
    seen.add(key);
    out.push({ context, app_id: appId ?? null });
  };
  const rsc = protection?.required_status_checks;
  if (protection?.enabled && rsc) {
    if (Array.isArray(rsc.checks) && rsc.checks.length > 0) {
      for (const c of rsc.checks) add(c.context, c.app_id);
    } else {
      for (const context of rsc.contexts ?? []) add(context, null);
    }
  }
  for (const rule of rules) {
    if (rule?.type !== 'required_status_checks') continue;
    for (const c of rule.parameters?.required_status_checks ?? []) add(c.context, c.integration_id);
  }
  return out;
}

/**
 * Why a ruleset's detail leaves the viewer-scoped rules read unproven, or
 * null if it cannot have hidden anything.
 *
 * `GET /rules/branches/main` returns only the rules enforced on the
 * REQUESTING identity. A ruleset the workflow token may bypass but the
 * merging account may not is simply absent from it, and a check it
 * requires would never be audited. A ruleset with no bypass actors cannot
 * be hidden from anyone, so the rules read is trusted only when every
 * active branch ruleset reports an empty `bypass_actors` array. GitHub
 * omits the field when the token cannot see it; absence is not emptiness.
 * Same probe as scripts/lib/branch-requirements.sh.
 */
export function rulesetHidesRules(detail) {
  if (!Array.isArray(detail?.bypass_actors)) {
    return `ruleset ${detail?.id} did not report a bypass_actors array, so it may hide rules from this token`;
  }
  if (detail.bypass_actors.length > 0) {
    return `ruleset ${detail.id} has bypass actors, so a rule binding the merging identity may be hidden from this token`;
  }
  return null;
}

/** True when any applicable ruleset requires an up-to-date branch. */
export function rulesRequireUpToDate(rules = []) {
  return rules.some(
    (r) => r?.type === 'required_status_checks' && r.parameters?.strict_required_status_checks_policy === true,
  );
}

/**
 * Bind each pushed commit to the merged PR that produced it. A PR owns a
 * push only when its merge commit is one of the pushed commits: that holds
 * for squash (the merge commit is the squash), rebase (the merge commit is
 * the last rebased commit) and merge commits alike. Any other association,
 * such as an old squash-merged PR whose original head commit is being
 * pushed directly, does not count.
 *
 * `associations` maps sha -> [PR objects from GET /commits/{sha}/pulls].
 * `commits` carry `parents` ([{ sha }]) as the compare API returns them.
 * Returns { groups: [{ pr, shas, baseSha }], direct: [sha] } in push order.
 *
 * baseSha is the tip of main the PR merged onto, derived from ANCESTRY, not
 * from list position: the compare API orders commits chronologically, so
 * two merge-commit PRs can interleave (a1, b1, mergeA, mergeB) and "the
 * entry before" would hand B the base a1 instead of mergeA. A merge commit's
 * first parent is the base. Otherwise (squash, rebase) walk first parents
 * from the merge commit back past the PR's own commits. When the ancestry
 * cannot be followed, baseSha is null and freshness is reported unaudited.
 */
export function bindPushToPrs({ commits, associations }) {
  const pushed = new Set(commits.map((c) => c.sha));
  const bySha = new Map(commits.map((c) => [c.sha, c]));
  const owner = new Map();
  for (const { sha } of commits) {
    const pr = (associations.get(sha) ?? []).find(
      (p) => p.merged_at && p.base?.ref === 'main' && pushed.has(p.merge_commit_sha),
    );
    if (pr) owner.set(sha, pr);
  }
  const groups = [];
  const direct = [];
  const byPr = new Map();
  for (const { sha } of commits) {
    const pr = owner.get(sha);
    if (!pr) {
      direct.push(sha);
      continue;
    }
    if (!byPr.has(pr.number)) {
      const group = { pr, shas: [], baseSha: null };
      byPr.set(pr.number, group);
      groups.push(group);
    }
    byPr.get(pr.number).shas.push(sha);
  }
  for (const group of groups) {
    const own = new Set(group.shas);
    const merge = bySha.get(group.pr.merge_commit_sha);
    const parents = merge?.parents ?? [];
    if (parents.length >= 2) {
      group.baseSha = parents[0].sha;
      continue;
    }
    let cur = group.pr.merge_commit_sha;
    for (let steps = 0; own.has(cur) && steps <= own.size; steps++) {
      cur = bySha.get(cur)?.parents?.[0]?.sha ?? null;
    }
    group.baseSha = cur && !own.has(cur) ? cur : null;
  }
  return { groups, direct };
}

export function markerFor(finding) {
  if (finding.kind === 'direct-push') return `${MARKER_PREFIX}commit=${finding.sha}`;
  if (finding.kind === 'force-push') return `${MARKER_PREFIX}force=${finding.before}..${finding.after}`;
  return `${MARKER_PREFIX}pr=${finding.pr.number}`;
}

/**
 * Escape a value for a Markdown table cell: a `|` would split the cell and
 * a line break would end the row, so the issue could no longer say which
 * state and evidence belong to which requirement.
 */
export function cell(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ');
}

/** Name what was breached: failing checks, a stale branch, or both. */
function breach(violations, headSha) {
  const checks = violations.filter((v) => v.state !== 'behind').length;
  const stale = violations.some((v) => v.state === 'behind');
  const head = `\`${headSha.slice(0, 7)}\``;
  if (checks && stale) return `required checks on its head commit ${head} were not green and the branch was not up to date`;
  if (stale) return `its head commit ${head} was not up to date with \`main\`, which protection requires`;
  return `required checks on its head commit ${head} were not green`;
}

export function renderIssue(finding, { repo, enforcementLevel, backfill = false }) {
  const marker = `<!-- ${markerFor(finding)} -->`;
  const footer = [
    '',
    '## What to do',
    '',
    'Confirm whether this was an authorized break-glass merge. If it was, record who authorized it and why in a comment and close this issue. If it was not, review the change now as if it had not merged: read the failing check, and revert or follow up if it caught something real.',
    '',
    `Branch protection currently reports \`enforcement_level: ${enforcementLevel ?? 'unknown'}\`. Background: #1024 and REVIEW_POLICY.md § Do the merge gates bind the merging identity?`,
    '',
    `Opened by \`.github/workflows/merge-bypass-audit.yml\` in ${repo}.`,
  ];
  if (backfill) {
    footer.push(
      '',
      "**Backfill caveat:** this was audited on demand against today's required checks, not the set in force at the merge. A check added to protection after this merge shows as `missing`, and one removed since is not audited at all.",
    );
  }

  if (finding.kind === 'force-push') {
    return {
      title: `Merge bypass: main was rewritten from ${finding.before.slice(0, 7)} to ${finding.after.slice(0, 7)}`,
      body: [
        marker,
        `\`main\` moved from ${finding.before} to ${finding.after} in a push that is not a fast-forward (compare status \`${finding.status}\`). Branch protection forbids force pushes, so only an administrator could have made it, and commits reachable from the old tip may no longer be on \`main\`.`,
        '',
        `- Pushed by: \`${finding.pusher ?? 'unknown'}\``,
        ...footer,
      ].join('\n'),
    };
  }

  if (finding.kind === 'direct-push') {
    return {
      title: `Merge bypass: commit ${finding.sha.slice(0, 7)} reached main without a pull request`,
      body: [
        marker,
        `Commit ${finding.sha} was pushed to \`main\` and no merged pull request contains it. Branch protection requires a pull request, so only an administrator could have made this push.`,
        '',
        `- Pushed by: \`${finding.pusher ?? 'unknown'}\``,
        `- Commit message: ${JSON.stringify(finding.message ?? '')}`,
        ...footer,
      ].join('\n'),
    };
  }

  const { pr, violations } = finding;
  const rows = violations.map((v) => {
    const evidence = v.evidence.length
      ? v.evidence.map((e) => (e.url ? `[${cell(e.conclusion)}](${e.url})` : cell(e.conclusion))).join(', ')
      : 'nothing reported';
    return `| ${cell(v.context)}${v.headOnly ? ' (head commit only)' : ''} | **${v.state}** | ${evidence} |`;
  });
  return {
    title: `Merge bypass: #${pr.number} merged past ${violations.length} protection requirement${violations.length === 1 ? "" : "s"}`,
    body: [
      marker,
      `#${pr.number} ("${pr.title}") merged into \`main\` at ${pr.merged_at} by \`${pr.merged_by ?? 'unknown'}\` while ${breach(violations, pr.head_sha)}. A non-admin merge would have been blocked.`,
      '',
      '| Required check | State at merge | Runs GitHub was counting |',
      '|---|---|---|',
      ...rows,
      ...(finding.freshness ? ['', `**Branch freshness:** ${finding.freshness}`] : []),
      '',
      "`failure` means at least one check suite's latest run had failed. A later green run in a different suite does not supersede it, which is how GitHub's own rollup evaluates it. `pending` means a run had started but not finished, and `missing` means nothing had reported. `behind` means protection requires an up-to-date branch and the PR head did not contain the tip of `main` it merged onto.",
      ...footer,
    ].join('\n'),
  };
}

// ---------------------------------------------------------------- GitHub I/O

function makeClient(token, repo) {
  const base = `https://api.github.com/repos/${repo}`;
  // `allow` lists non-2xx statuses the caller handles itself; the call
  // then returns { status, data: null } instead of throwing.
  async function request(path, { allow = [], ...init } = {}) {
    const url = path.startsWith('https://') ? path : `${base}${path}`;
    const res = await fetch(url, {
      ...init,
      headers: {
        accept: 'application/vnd.github+json',
        'x-github-api-version': '2022-11-28',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(init.body ? { 'content-type': 'application/json' } : {}),
        ...init.headers,
      },
    });
    if (!res.ok) {
      if (allow.includes(res.status)) return { status: res.status, data: null, link: null };
      throw new Error(`${init.method ?? 'GET'} ${url} -> ${res.status} ${await res.text()}`);
    }
    return { status: res.status, data: await res.json(), link: res.headers.get('link') };
  }
  async function paginate(path, pick = (d) => d) {
    const out = [];
    let next = `${path}${path.includes('?') ? '&' : '?'}per_page=100`;
    while (next) {
      const { data, link } = await request(next);
      out.push(...pick(data));
      next = link?.match(/<([^>]+)>;\s*rel="next"/)?.[1] ?? null;
    }
    return out;
  }
  async function graphql(query, variables) {
    const { data } = await request('https://api.github.com/graphql', {
      method: 'POST',
      body: JSON.stringify({ query, variables }),
    });
    if (data.errors?.length) throw new Error(`GraphQL: ${JSON.stringify(data.errors)}`);
    return data.data;
  }
  return { request, paginate, graphql };
}

const ROLLUP_QUERY = `
query($owner: String!, $name: String!, $pr: Int!, $after: String) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $pr) {
      commits(last: 1) { nodes { commit { oid statusCheckRollup {
        contexts(first: 100, after: $after) {
          pageInfo { hasNextPage endCursor }
          nodes { ... on CheckRun { name checkSuite { databaseId } } }
        }
      } } } }
    }
  }
}`;

/**
 * Map of check-run name -> set of check-suite ids that GitHub's rollup
 * counts for the PR's head commit. Paginated: a disposition-heavy PR carries
 * well over 100 contexts, and a truncated read would drop counted suites.
 */
async function rollupSuitesFor(gh, repo, prNumber, headSha) {
  const [owner, name] = repo.split('/');
  const suites = new Map();
  let after = null;
  do {
    const data = await gh.graphql(ROLLUP_QUERY, { owner, name, pr: prNumber, after });
    const commit = data.repository.pullRequest.commits.nodes[0]?.commit;
    if (!commit || commit.oid !== headSha) {
      throw new Error(`PR #${prNumber}: rollup head ${commit?.oid} does not match head ${headSha}`);
    }
    const contexts = commit.statusCheckRollup?.contexts;
    if (!contexts) break;
    for (const node of contexts.nodes) {
      if (!node?.name || !node.checkSuite) continue;
      if (!suites.has(node.name)) suites.set(node.name, new Set());
      suites.get(node.name).add(node.checkSuite.databaseId);
    }
    after = contexts.pageInfo.hasNextPage ? contexts.pageInfo.endCursor : null;
  } while (after);
  return suites;
}


/**
 * Whether protection requires an up-to-date branch: true, false, or null
 * when it cannot be read. Rulesets are public; classic `strict` needs
 * Administration:read, which GITHUB_TOKEN lacks, so the workflow declares
 * it in MERGE_BYPASS_CLASSIC_STRICT and the script uses that only when the
 * live read is refused.
 */
async function resolveStrict(gh, rules) {
  if (rulesRequireUpToDate(rules)) return true;
  const live = await gh.request('/branches/main/protection/required_status_checks', { allow: [401, 403, 404] });
  if (live.status === 200) return live.data.strict === true;
  const declared = process.env.MERGE_BYPASS_CLASSIC_STRICT;
  if (declared === 'true') return true;
  if (declared === 'false') return false;
  return null;
}

/**
 * Throw unless the viewer-scoped rules read can be shown complete: every
 * active branch-targeted ruleset (repository or organization) must report
 * an empty bypass list. See rulesetHidesRules. Deliberately no ref-pattern
 * matching: if nothing anywhere can be bypassed, nothing was hidden, and a
 * wrong glob translation would fail open.
 */
async function assertRulesComplete(gh, repo) {
  const listing = await gh.paginate('/rulesets?includes_parents=true');
  const active = listing.filter((r) => r?.enforcement === 'active' && (r.target ?? 'branch') === 'branch');
  for (const rs of active) {
    let path;
    if (rs.source_type === 'Organization') path = `https://api.github.com/orgs/${rs.source}/rulesets/${rs.id}`;
    else if (!rs.source_type || rs.source_type === 'Repository') path = `/rulesets/${rs.id}`;
    else throw new Error(`ruleset ${rs.id} has unreadable scope ${rs.source_type}; required checks cannot be shown complete`);
    const { data } = await gh.request(path);
    const reason = rulesetHidesRules(data);
    if (reason) throw new Error(`${reason}; required checks cannot be shown complete for ${repo}`);
  }
}

/** True when `baseSha` is an ancestor of (or equal to) `headSha`. */
async function containsBase(gh, baseSha, headSha) {
  const { data } = await gh.request(`/compare/${baseSha}...${headSha}`);
  return data.status === 'ahead' || data.status === 'identical';
}

/**
 * The tip of main a backfilled PR merged onto. Unambiguous for a merge
 * commit (first parent) and for a one-commit PR (the commit's parent,
 * squash or rebase alike). A multi-commit PR landed as a single-parent
 * commit is a squash or a rebase, and the API does not say which, so the
 * base is unknown and the up-to-date check is skipped for it.
 */
async function backfillBase(gh, pr) {
  if (!pr.merge_commit_sha) return null;
  const { data } = await gh.request(`/commits/${pr.merge_commit_sha}`);
  const parents = data.parents ?? [];
  if (parents.length === 2 || pr.commits === 1) return parents[0]?.sha ?? null;
  return null;
}

async function auditPr(gh, repo, pr, { required, strict, baseSha }) {
  if (!pr.merged_at) return null;
  // A merged PR's head is frozen at the merge: later pushes to the branch do
  // not attach to a closed PR (#610's branch gained a commit 34s after its
  // merge and `head.sha` still names the pre-merge head). So this IS the
  // commit GitHub evaluated required checks on.
  const head = pr.head.sha;
  const checkRuns = await gh.paginate(`/commits/${head}/check-runs?filter=all`, (d) => d.check_runs);
  const statuses = await gh.paginate(`/commits/${head}/statuses`);
  const rollupSuites = await rollupSuitesFor(gh, repo, pr.number, head);
  const suites = await gh.paginate(`/commits/${head}/check-suites`, (d) => d.check_suites);
  const suiteCreatedAt = new Map(suites.map((cs) => [cs.id, cs.created_at]));
  const violations = evaluateMerge({
    required,
    checkRuns,
    statuses,
    mergedAt: pr.merged_at,
    rollupSuites,
    suiteCreatedAt,
  });
  let upToDate = 'not evaluated';
  if (strict && baseSha) {
    upToDate = (await containsBase(gh, baseSha, head)) ? 'yes' : 'no';
    if (upToDate === 'no') {
      violations.push({
        context: 'Branch up to date with `main` (strict)',
        state: 'behind',
        evidence: [{ conclusion: `head ${head.slice(0, 7)} does not contain main@${baseSha.slice(0, 7)}` }],
      });
    }
  }
  if (violations.length === 0) return { clean: true, upToDate };
  return {
    kind: 'merged-pr',
    pr: {
      number: pr.number,
      title: pr.title,
      merged_at: pr.merged_at,
      merged_by: pr.merged_by?.login,
      head_sha: head,
    },
    violations,
    // Say so when freshness was required but could not be audited, so the
    // issue never implies a check that did not run.
    freshness:
      strict && upToDate === 'not evaluated'
        ? 'not audited: the merge base is ambiguous (a multi-commit squash or rebase), so this issue does not say whether the branch was up to date.'
        : undefined,
  };
}

/** Every commit in before...after, following pagination past 250. */
async function compareAll(gh, before, after) {
  const first = await gh.request(`/compare/${before}...${after}?per_page=100`);
  const commits = [...first.data.commits];
  let next = first.link?.match(/<([^>]+)>;\s*rel="next"/)?.[1] ?? null;
  while (next) {
    const page = await gh.request(next);
    commits.push(...page.data.commits);
    next = page.link?.match(/<([^>]+)>;\s*rel="next"/)?.[1] ?? null;
  }
  if (commits.length !== first.data.total_commits) {
    throw new Error(`compare ${before}...${after}: read ${commits.length} of ${first.data.total_commits} commits`);
  }
  return { status: first.data.status, commits };
}

async function associate(gh, shas, associations) {
  for (const sha of shas) {
    const { data } = await gh.request(`/commits/${sha}/pulls`);
    associations.set(sha, data);
  }
}

/**
 * True when an issue body carries exactly this finding's marker. Matches the
 * whole HTML comment, delimiters included, so `pr=1` never matches `pr=10`.
 */
export function issueHasMarker(body, finding) {
  return (body ?? '').includes(`<!-- ${markerFor(finding)} -->`);
}

async function existingIssue(gh, finding) {
  const issues = await gh.paginate(`/issues?state=all&labels=${encodeURIComponent(ISSUE_LABELS[0])}`);
  return issues.find((i) => issueHasMarker(i.body, finding)) ?? null;
}

export function parseArgs(argv) {
  const args = { dryRun: false };
  // A value flag with no operand, or with another flag where its operand
  // should be, is an error, never "flag absent": a trailing `--before` would
  // otherwise audit one commit and call the rest of the push clean.
  const operand = (flag, i) => {
    const value = argv[i];
    if (value === undefined || value.startsWith('--')) throw new Error(`${flag} needs a value`);
    return value;
  };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === '--dry-run') args.dryRun = true;
    else if (['--before', '--after', '--pr', '--pusher'].includes(flag)) args[flag.slice(2)] = operand(flag, ++i);
    else if (flag === '--since-minutes') args.sinceMinutes = operand(flag, ++i);
    else throw new Error(`unknown argument: ${flag}`);
  }
  if (args.pr === undefined && args.after === undefined && args.sinceMinutes === undefined) {
    throw new Error('pass --pr <number>, --after <sha>, or --since-minutes <n>');
  }
  if (args.sinceMinutes !== undefined && !/^[1-9]\d*$/.test(args.sinceMinutes)) {
    throw new Error('--since-minutes must be a positive integer');
  }
  if (args.pr !== undefined && !/^[1-9]\d*$/.test(args.pr)) {
    throw new Error(`--pr must be a number, got ${JSON.stringify(args.pr)}`);
  }
  for (const key of ['before', 'after']) {
    if (args[key] !== undefined && !/^[0-9a-f]{7,40}$/.test(args[key])) throw new Error(`--${key} must be a commit sha`);
  }
  return args;
}

function summarize(lines) {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (file) appendFileSync(file, `${lines.join('\n')}\n`);
  for (const line of lines) console.log(line);
}

/**
 * Audit one update of main (before -> after): classify a rewrite, bind each
 * pushed commit to the merged PR that produced it, report direct pushes,
 * and evaluate each merged PR. `ctx.auditMerge(pr, baseSha)` returns a
 * finding, a clean result, or throws when PRs cannot be audited.
 */
async function auditPushRange(gh, { before, after, pusher, forced = false }, ctx) {
  const findings = [];
  let commits;
  if (!before || /^0+$/.test(before)) {
    // No prior tip (a new branch): audit the pushed commit alone. Its merge
    // base comes from its own parents in bindPushToPrs.
    const { data } = await gh.request(`/commits/${after}`);
    commits = [data];
  } else {
    const compared = await compareAll(gh, before, after);
    if (forced || compared.status === 'behind' || compared.status === 'diverged') {
      // Not a fast-forward: history on main was rewritten.
      findings.push({ kind: 'force-push', before, after, status: forced ? 'forced' : compared.status, pusher });
    }
    commits = compared.commits;
  }

  // Bind commits to the PRs that produced them. A fresh merge commit is
  // associated with its PR almost at once; give any stragglers two short
  // grace periods in aggregate, never per commit, so a long direct push
  // cannot exhaust the job timeout before anything is filed.
  const associations = new Map();
  await associate(
    gh,
    commits.map((c) => c.sha),
    associations,
  );
  let bound = bindPushToPrs({ commits, associations });
  for (let attempt = 0; attempt < 2 && bound.direct.length > 0; attempt++) {
    await new Promise((r) => setTimeout(r, 10_000));
    await associate(gh, bound.direct, associations);
    bound = bindPushToPrs({ commits, associations });
  }

  const messages = new Map(commits.map((c) => [c.sha, c.commit?.message?.split('\n')[0]]));
  for (const sha of bound.direct) {
    findings.push({ kind: 'direct-push', sha, message: messages.get(sha), pusher });
  }
  for (const group of bound.groups) {
    if (ctx.seen.has(group.pr.number)) continue;
    ctx.seen.add(group.pr.number);
    const { data: pr } = await gh.request(`/pulls/${group.pr.number}`);
    const result = await ctx.auditMerge(pr, group.baseSha);
    if (result && !result.clean) findings.push(result);
  }
  return findings;
}

/**
 * Every update of main that ARRIVED in the last `minutes`, from the
 * repository activity API. Commit dates are author-controlled and say
 * nothing about when a ref moved, so they cannot be a sweep cursor: an old
 * commit pushed today, or a forced rewind to an old tip, would fall outside
 * a date window. Activity records each push with its before/after SHAs and
 * the time it happened. Newest first; paginated until the window closes.
 */
async function recentMainUpdates(gh, minutes) {
  const since = new Date(Date.now() - minutes * 60_000).toISOString();
  const updates = [];
  let next = `/activity?ref=${encodeURIComponent('refs/heads/main')}&per_page=100`;
  while (next) {
    const page = await gh.request(next);
    if (!Array.isArray(page.data)) throw new Error('activity API returned a non-array page');
    let older = false;
    for (const a of page.data) {
      if (a.timestamp < since) {
        older = true;
        break;
      }
      updates.push(a);
    }
    next = older ? null : (page.link?.match(/<([^>]+)>;\s*rel="next"/)?.[1] ?? null);
  }
  return { since, updates };
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo) throw new Error('GITHUB_REPOSITORY is not set');
  const gh = makeClient(process.env.GITHUB_TOKEN, repo);

  const { data: branch } = await gh.request('/branches/main');
  const rules = await gh.paginate('/rules/branches/main');
  await assertRulesComplete(gh, repo);
  const required = requiredContexts(branch.protection, rules);
  const enforcementLevel = branch.protection?.required_status_checks?.enforcement_level;
  const strict = await resolveStrict(gh, rules);

  const notes = [];
  if (strict === null) {
    notes.push('up-to-date requirement unreadable and MERGE_BYPASS_CLASSIC_STRICT unset: branch freshness not audited');
  }

  // Direct pushes and rewrites do not depend on the required-check list, so
  // an empty list must not stop them being filed. Only merged-PR evaluation
  // needs it; that path records the failure and the run exits 2 after
  // filing whatever push-level findings it has.
  let unauditable = null;
  const ctx = {
    seen: new Set(),
    async auditMerge(pr, baseSha) {
      if (required.length === 0) {
        unauditable = `#${pr.number}: no required status checks visible on main, so its merge cannot be audited`;
        return null;
      }
      const result = await auditPr(gh, repo, pr, { required, strict, baseSha });
      if (result?.clean && strict && result.upToDate === 'not evaluated') {
        notes.push(`#${pr.number}: merge base ambiguous (multi-commit squash or rebase); branch freshness not audited`);
      }
      return result;
    },
  };

  const findings = [];
  if (args.pr) {
    const { data: pr } = await gh.request(`/pulls/${args.pr}`);
    if (!pr.merged_at) throw new Error(`#${args.pr} is not merged`);
    if (pr.base?.ref !== 'main') throw new Error(`#${args.pr} merged into ${pr.base?.ref}, not main; nothing to audit`);
    const baseSha = strict ? await backfillBase(gh, pr) : null;
    const result = await ctx.auditMerge(pr, baseSha);
    if (result && !result.clean) findings.push(result);
  } else if (args.sinceMinutes) {
    // Scheduled sweep. A push carrying `[skip ci]` never starts the
    // push-triggered run, so an admin could bypass and silence the detector
    // in one push. Schedules ignore skip instructions: re-audit every update
    // of main that arrived in the window. Overlap is harmless: issues are
    // deduped, and an already-filed finding exits 0.
    const { since, updates } = await recentMainUpdates(gh, Number(args.sinceMinutes));
    if (updates.length === 0) {
      summarize([`merge-bypass-audit: sweep found no updates to main since ${since}.`]);
      return 0;
    }
    for (const u of [...updates].reverse()) {
      const forced = u.activity_type === 'force_push';
      findings.push(
        ...(await auditPushRange(
          gh,
          { before: u.before, after: u.after, pusher: u.actor?.login, forced },
          ctx,
        )),
      );
    }
  } else {
    findings.push(...(await auditPushRange(gh, { before: args.before, after: args.after, pusher: args.pusher }, ctx)));
  }

  const unpinned = required.filter((r) => r.app_id === null || r.app_id === undefined || r.app_id === -1);
  if (unpinned.length > 0) {
    notes.push(
      `incomplete for ${unpinned.map((r) => r.context).join(', ')}: no app pin, so GitHub may judge them on the test merge commit, whose statuses cannot be recovered after the merge; verdicts are head-only`,
    );
  }

  // Deduplicate findings reached through more than one update in a sweep.
  const unique = [...new Map(findings.map((f) => [markerFor(f), f])).values()];

  if (unique.length === 0) {
    summarize([
      unauditable
        ? `merge-bypass-audit: no push-level bypass found, but ${unauditable}.`
        : `merge-bypass-audit: clean. Every audited merge had all ${required.length} required checks green` +
          (strict && !notes.some((n) => n.includes('freshness')) ? ' on an up-to-date branch.' : '.'),
      ...notes.map((n) => `- note: ${n}`),
    ]);
    if (unauditable) throw new Error(unauditable);
    return 0;
  }

  let filed = 0;
  const lines = [`merge-bypass-audit: ${unique.length} bypass finding(s).`, ...notes.map((n) => `- note: ${n}`)];
  for (const finding of unique) {
    const { title, body } = renderIssue(finding, { repo, enforcementLevel, backfill: Boolean(args.pr) });
    lines.push(`- ${title}`);
    if (args.dryRun) {
      console.log(`\n--- ${title}\n${body}\n`);
      continue;
    }
    const open = await existingIssue(gh, finding);
    if (open) {
      lines.push(`  already filed: ${open.html_url}`);
      continue;
    }
    const { data: issue } = await gh.request('/issues', {
      method: 'POST',
      body: JSON.stringify({ title, body, labels: ISSUE_LABELS }),
    });
    lines.push(`  filed: ${issue.html_url}`);
    console.log(`::error title=Merge bypass::${title} (${issue.html_url})`);
    filed++;
  }
  summarize(lines);
  // Push-level findings are filed first; an unauditable merge still fails
  // the run (exit 2) so it is never read as clean.
  if (unauditable) throw new Error(unauditable);
  // Fail only on a new bypass (or any finding in a dry run). A finding that
  // is already filed stays visible in its issue; failing again on every
  // overlapping sweep would turn one bypass into a red run every half hour.
  return args.dryRun || filed > 0 ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().then(
    (code) => process.exit(code),
    (err) => {
      console.error(`::error title=merge-bypass-audit::${err.message}`);
      process.exit(2);
    },
  );
}
