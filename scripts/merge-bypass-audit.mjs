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
//   add --dry-run to print findings without opening issues
//
// Exit codes: 0 clean, 1 bypass found (issue opened or already open),
// 2 infrastructure or usage error (nothing can be concluded).

import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const PASSING_CONCLUSIONS = new Set(['success', 'neutral', 'skipped']);
const MARKER_PREFIX = 'merge-bypass-audit:';
export const ISSUE_LABELS = ['policy-violation', 'audit'];

const byTime = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * State of one check run as of `mergedAt`, or null if it had not started.
 * ISO-8601 UTC strings compare correctly as strings.
 */
function runStateAt(run, mergedAt) {
  if (!run.started_at || run.started_at > mergedAt) return null;
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
export function contextStateAtMerge({ context, appId, checkRuns, statuses, mergedAt, countedSuites }) {
  const pinned = appId !== null && appId !== undefined && appId !== -1;
  const evidence = [];

  // Latest run per check suite, among runs that had started by the merge.
  const latestPerSuite = new Map();
  for (const run of checkRuns) {
    if (run.name !== context) continue;
    if (pinned && run.app?.id !== appId) continue;
    if (countedSuites && !countedSuites.has(run.check_suite?.id)) continue;
    if (runStateAt(run, mergedAt) === null) continue;
    const suite = run.check_suite?.id ?? `run-${run.id}`;
    const prev = latestPerSuite.get(suite);
    if (!prev || byTime(prev.started_at, run.started_at) < 0 || (prev.started_at === run.started_at && prev.id < run.id)) {
      latestPerSuite.set(suite, run);
    }
  }
  for (const run of latestPerSuite.values()) {
    evidence.push({
      kind: 'check_run',
      state: runStateAt(run, mergedAt),
      conclusion: run.conclusion ?? run.status,
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
export function evaluateMerge({ required, checkRuns, statuses, mergedAt, rollupSuites }) {
  if (!Array.isArray(required) || required.length === 0) {
    // An empty list would make every merge look clean. Refuse to conclude.
    throw new Error('no required status checks visible on the protected branch; cannot audit');
  }
  const violations = [];
  for (const { context, app_id: appId } of required) {
    const countedSuites = rollupSuites ? (rollupSuites.get(context) ?? new Set()) : undefined;
    const result = contextStateAtMerge({ context, appId, checkRuns, statuses, mergedAt, countedSuites });
    if (result.state !== 'success') violations.push({ context, ...result });
  }
  return violations;
}

/** Normalize the branch API's protection block into [{ context, app_id }]. */
export function requiredContexts(protection) {
  const rsc = protection?.required_status_checks;
  if (!protection?.enabled || !rsc) return [];
  if (Array.isArray(rsc.checks) && rsc.checks.length > 0) {
    return rsc.checks.map((c) => ({ context: c.context, app_id: c.app_id ?? null }));
  }
  return (rsc.contexts ?? []).map((context) => ({ context, app_id: null }));
}

export function markerFor(finding) {
  return finding.kind === 'direct-push'
    ? `${MARKER_PREFIX}commit=${finding.sha}`
    : `${MARKER_PREFIX}pr=${finding.pr.number}`;
}

export function renderIssue(finding, { repo, enforcementLevel }) {
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
      ? v.evidence.map((e) => (e.url ? `[${e.conclusion}](${e.url})` : e.conclusion)).join(', ')
      : 'nothing reported';
    return `| ${v.context} | **${v.state}** | ${evidence} |`;
  });
  return {
    title: `Merge bypass: #${pr.number} merged past ${violations.length} required check${violations.length === 1 ? '' : 's'}`,
    body: [
      marker,
      `#${pr.number} ("${pr.title}") merged into \`main\` at ${pr.merged_at} by \`${pr.merged_by ?? 'unknown'}\` while required checks on its head commit \`${pr.head_sha.slice(0, 7)}\` were not green. A non-admin merge would have been blocked.`,
      '',
      '| Required check | State at merge | Runs GitHub was counting |',
      '|---|---|---|',
      ...rows,
      '',
      '`failure` means at least one check suite\'s latest run had failed. A later green run in a different suite does not supersede it, which is how GitHub\'s own rollup evaluates it. `pending` means a run had started but not finished, and `missing` means nothing had reported.',
      ...footer,
    ].join('\n'),
  };
}

// ---------------------------------------------------------------- GitHub I/O

function makeClient(token, repo) {
  const base = `https://api.github.com/repos/${repo}`;
  async function request(path, init = {}) {
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
      throw new Error(`${init.method ?? 'GET'} ${url} -> ${res.status} ${await res.text()}`);
    }
    return { data: await res.json(), link: res.headers.get('link') };
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

async function mergedPrFor(gh, sha) {
  // A squash merge commit is associated with its PR as soon as it exists,
  // but give the association a moment before calling it a direct push.
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data } = await gh.request(`/commits/${sha}/pulls`);
    const merged = data.filter((p) => p.merged_at && p.base?.ref === 'main');
    if (merged.length > 0) return merged[0];
    if (attempt < 2) await new Promise((r) => setTimeout(r, 10_000));
  }
  return null;
}

async function auditPr(gh, repo, prNumber, required) {
  const { data: pr } = await gh.request(`/pulls/${prNumber}`);
  if (!pr.merged_at) return null;
  const head = pr.head.sha;
  const checkRuns = await gh.paginate(`/commits/${head}/check-runs?filter=all`, (d) => d.check_runs);
  const statuses = await gh.paginate(`/commits/${head}/statuses`);
  const rollupSuites = await rollupSuitesFor(gh, repo, pr.number, head);
  const violations = evaluateMerge({ required, checkRuns, statuses, mergedAt: pr.merged_at, rollupSuites });
  if (violations.length === 0) return null;
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
  };
}

async function existingIssue(gh, marker) {
  const issues = await gh.paginate(`/issues?state=all&labels=${encodeURIComponent(ISSUE_LABELS[0])}`);
  return issues.find((i) => (i.body ?? '').includes(marker)) ?? null;
}

function parseArgs(argv) {
  const args = { dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === '--dry-run') args.dryRun = true;
    else if (['--before', '--after', '--pr', '--pusher'].includes(flag)) args[flag.slice(2)] = argv[++i];
    else throw new Error(`unknown argument: ${flag}`);
  }
  if (!args.pr && !args.after) throw new Error('pass --pr <number> or --after <sha>');
  if (args.pr && !/^\d+$/.test(args.pr)) throw new Error(`--pr must be a number, got ${JSON.stringify(args.pr)}`);
  for (const key of ['before', 'after']) {
    if (args[key] && !/^[0-9a-f]{7,40}$/.test(args[key])) throw new Error(`--${key} must be a commit sha`);
  }
  return args;
}

function summarize(lines) {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (file) appendFileSync(file, `${lines.join('\n')}\n`);
  for (const line of lines) console.log(line);
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo) throw new Error('GITHUB_REPOSITORY is not set');
  const gh = makeClient(process.env.GITHUB_TOKEN, repo);

  const { data: branch } = await gh.request('/branches/main');
  const required = requiredContexts(branch.protection);
  const enforcementLevel = branch.protection?.required_status_checks?.enforcement_level;
  if (required.length === 0) {
    throw new Error('no required status checks visible on main; cannot audit (a clean result would be meaningless)');
  }

  const findings = [];
  if (args.pr) {
    const finding = await auditPr(gh, repo, Number(args.pr), required);
    if (finding) findings.push(finding);
  } else {
    const zero = /^0+$/;
    let commits;
    if (!args.before || zero.test(args.before)) {
      const { data } = await gh.request(`/commits/${args.after}`);
      commits = [data];
    } else {
      const { data } = await gh.request(`/compare/${args.before}...${args.after}`);
      commits = data.commits;
    }
    const seen = new Set();
    for (const commit of commits) {
      const pr = await mergedPrFor(gh, commit.sha);
      if (!pr) {
        findings.push({
          kind: 'direct-push',
          sha: commit.sha,
          message: commit.commit?.message?.split('\n')[0],
          pusher: args.pusher,
        });
        continue;
      }
      if (seen.has(pr.number)) continue;
      seen.add(pr.number);
      const finding = await auditPr(gh, repo, pr.number, required);
      if (finding) findings.push(finding);
    }
  }

  if (findings.length === 0) {
    summarize([`merge-bypass-audit: clean. Every audited merge had all ${required.length} required checks green.`]);
    return 0;
  }

  const lines = [`merge-bypass-audit: ${findings.length} bypass finding(s).`];
  for (const finding of findings) {
    const { title, body } = renderIssue(finding, { repo, enforcementLevel });
    lines.push(`- ${title}`);
    if (args.dryRun) {
      console.log(`\n--- ${title}\n${body}\n`);
      continue;
    }
    const open = await existingIssue(gh, markerFor(finding));
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
  }
  summarize(lines);
  return 1;
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
