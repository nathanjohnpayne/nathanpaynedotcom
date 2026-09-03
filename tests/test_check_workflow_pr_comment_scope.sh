#!/usr/bin/env bash
# tests/test_check_workflow_pr_comment_scope.sh
#
# Unit tests for scripts/ci/check_workflow_pr_comment_scope — the #881 gate
# requiring any job that comments on a PULL REQUEST to hold
# `pull-requests: write` in its effective permissions.
#
# The bug is expensive because everything about it reads as correct: the
# endpoint path says `issues`, the run log prints `Issues: write`, and only the
# code paths that actually POST fail — so the runs that appear to succeed are
# the ones that never attempted the write.
#
# The negative cases carry the weight here. A permission gate can be wrong in
# two directions and both do harm, so each is pinned:
#   - UNDER-granting is #881 itself, including the job-level case where a
#     workflow-level grant hides a job that re-declares `pull-requests: read`.
#   - OVER-granting would be demanding `pull-requests: write` from a workflow
#     that only ever comments on real issues.
# Review on #936 found the first version wrong in both directions.

set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CHECK="$ROOT/scripts/ci/check_workflow_pr_comment_scope"

pass=0
fail=0

if [ ! -x "$CHECK" ]; then
  echo "FAIL: $CHECK missing or not executable" >&2
  exit 1
fi

run_case() {
  local body="$1" scratch
  scratch="$(mktemp -d)"
  mkdir -p "$scratch/.github/workflows" "$scratch/scripts/ci"
  printf '%s\n' "$body" >"$scratch/.github/workflows/sample.yml"
  cp "$CHECK" "$scratch/scripts/ci/"
  ( cd "$scratch" && ./scripts/ci/check_workflow_pr_comment_scope >/dev/null 2>&1 )
  local rc=$?
  rm -rf "$scratch"
  return $rc
}

expect() {
  local label="$1" want="$2" body="$3"
  run_case "$body"
  local got=$?
  if [ "$got" = "$want" ]; then
    echo "  ok: $label"
    pass=$((pass + 1))
  else
    echo "  FAIL: $label (expected exit $want, got $got)" >&2
    fail=$((fail + 1))
  fi
}

echo "check_workflow_pr_comment_scope tests"

# ── The #881 shape itself.
expect "issues:write alone on a PR-triggered job is rejected" 1 'on:
  pull_request_review_comment:
    types: [edited]
jobs:
  archive:
    permissions:
      issues: write
      pull-requests: read
    steps:
      - run: gh api --method POST "repos/$REPO/issues/$pr/comments" --input p.json'

expect "pull-requests:write is accepted" 0 'on:
  pull_request_review_comment:
    types: [edited]
jobs:
  archive:
    permissions:
      issues: write
      pull-requests: write
    steps:
      - run: gh api --method POST "repos/$REPO/issues/$pr/comments" --input p.json'

# ── Job-level scoping. A job block REPLACES the workflow default, so a
# workflow-level grant does not authorise a job that re-declares read. The
# first version of this check passed this case while the POST still 403'd.
expect "job-level read under a workflow-level write is rejected" 1 'on:
  pull_request:
permissions:
  pull-requests: write
jobs:
  poster:
    permissions:
      issues: write
      pull-requests: read
    steps:
      - run: gh api --method POST "repos/$REPO/issues/$pr/comments" --input p.json'

expect "a job with no block inherits the workflow grant" 0 'on:
  pull_request:
permissions:
  issues: write
  pull-requests: write
jobs:
  poster:
    steps:
      - run: gh api --method POST "repos/$REPO/issues/$pr/comments" --input p.json'

expect "an unrelated job holding the scope does not cover the poster" 1 'on:
  pull_request:
jobs:
  innocent:
    permissions:
      pull-requests: write
    steps:
      - run: echo hi
  poster:
    permissions:
      issues: write
      pull-requests: read
    steps:
      - run: gh api --method POST "repos/$REPO/issues/$pr/comments" --input p.json'

# ── Over-granting is the opposite harm. The target kind cannot be read off the
# command text, so an issues-endpoint write is only required to hold the scope
# where the workflow can actually receive a pull request.
expect "gh issue comment without a PR trigger is not flagged" 0 'on:
  schedule:
    - cron: "0 0 * * *"
jobs:
  triage:
    permissions:
      issues: write
    steps:
      - run: gh issue comment 12 --body hi'

expect "gh issue comment with a PR trigger is flagged" 1 'on:
  issue_comment:
    types: [created]
jobs:
  triage:
    permissions:
      issues: write
    steps:
      - run: gh issue comment 12 --body hi'

# ── gh pr comment is unambiguous regardless of trigger.
expect "gh pr comment always requires the scope" 1 'on:
  schedule:
    - cron: "0 0 * * *"
jobs:
  poster:
    permissions:
      issues: write
    steps:
      - run: gh pr comment 12 --body hi'

# ── POST spellings. gh documents -X as the short alias, and -f/-F switch the
# request to POST on their own; a line-broken command is valid too. Matching
# only a literal single-line `--method POST` left three ways to recreate #881.
expect "-X POST is recognised" 1 'on:
  pull_request:
jobs:
  poster:
    permissions:
      issues: write
    steps:
      - run: gh api -X POST "repos/$REPO/issues/$pr/comments" --input p.json'

expect "-f implying POST is recognised" 1 'on:
  pull_request:
jobs:
  poster:
    permissions:
      issues: write
    steps:
      - run: gh api "repos/$REPO/issues/$pr/comments" -f body=hello'

expect "a line-broken POST is recognised" 1 'on:
  pull_request:
jobs:
  poster:
    permissions:
      issues: write
    steps:
      - run: |
          gh api --method POST \
            "repos/$REPO/issues/$pr/comments" \
            --input p.json'

expect "--field implying POST is recognised" 1 'on:
  pull_request:
jobs:
  poster:
    permissions:
      issues: write
    steps:
      - run: gh api "repos/$REPO/issues/$pr/comments" --field body=hello'

expect "--raw-field implying POST is recognised" 1 'on:
  pull_request:
jobs:
  poster:
    permissions:
      issues: write
    steps:
      - run: gh api "repos/$REPO/issues/$pr/comments" --raw-field body=hello'

# ── The pull-request REVIEW-comment endpoint. pulls/{n}/comments only ever
# targets a PR, so it requires the scope regardless of trigger — and it was
# missed entirely by the first two revisions of this check.
expect "the pulls review-comment endpoint is recognised" 1 'on:
  schedule:
    - cron: "0 0 * * *"
jobs:
  poster:
    permissions:
      issues: write
    steps:
      - run: gh api --method POST "repos/$REPO/pulls/$pr/comments" --input p.json'

expect "pulls.createReviewComment is recognised" 1 'on:
  schedule:
    - cron: "0 0 * * *"
jobs:
  poster:
    permissions:
      issues: write
    steps:
      - uses: actions/github-script@v7
        with:
          script: |
            await github.rest.pulls.createReviewComment({pull_number: 1})'

expect "github-script createComment is recognised" 1 'on:
  pull_request:
jobs:
  poster:
    permissions:
      issues: write
    steps:
      - uses: actions/github-script@v7
        with:
          script: |
            await github.rest.issues.createComment({issue_number: 1})'

# ── Valid YAML spellings of the granted value must be accepted. The first
# version required an exact unquoted physical line and rejected these.
expect "a quoted write value is accepted" 0 'on:
  pull_request:
jobs:
  poster:
    permissions:
      issues: write
      pull-requests: "write"
    steps:
      - run: gh api --method POST "repos/$REPO/issues/$pr/comments" --input p.json'

expect "a trailing comment on the value is accepted" 0 'on:
  pull_request:
jobs:
  poster:
    permissions:
      issues: write
      pull-requests: write # needed for the archive POST
    steps:
      - run: gh api --method POST "repos/$REPO/issues/$pr/comments" --input p.json'

expect "a flow mapping is accepted" 0 'on:
  pull_request:
jobs:
  poster:
    permissions: {issues: write, pull-requests: write}
    steps:
      - run: gh api --method POST "repos/$REPO/issues/$pr/comments" --input p.json'

expect "write-all shorthand is accepted" 0 'on:
  pull_request:
jobs:
  poster:
    permissions: write-all
    steps:
      - run: gh api --method POST "repos/$REPO/issues/$pr/comments" --input p.json'

# ── Reads are not writes.
expect "read-only comment access is not flagged" 0 'on:
  pull_request:
jobs:
  reader:
    permissions:
      issues: read
      pull-requests: read
    steps:
      - run: gh api --paginate "repos/$REPO/issues/$pr/comments"'

echo
echo "check_workflow_pr_comment_scope: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
