#!/usr/bin/env bash
# tests/test_check_workflow_pr_comment_scope.sh
#
# Unit tests for scripts/ci/check_workflow_pr_comment_scope — the #881 gate
# that requires any workflow POSTing a PR comment to declare
# `pull-requests: write`, not merely `issues: write`.
#
# The bug this guards is expensive precisely because everything about it reads
# as correct: the endpoint path says `issues`, the run log prints
# `Issues: write`, and only the code paths that actually POST fail — so the
# runs that appear to succeed are the ones that never attempted the write.
# It has now been diagnosed twice in this repo (codex-feedback-archive-relay
# fixed itself; codex-p1-gate kept the bug and left a REQUIRED check red).
#
# Strategy: run the real check against scratch workflow directories, one per
# case. The negative cases matter more than the positive one — a gate that
# only ever passes proves nothing about the failure it names.

set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CHECK="$ROOT/scripts/ci/check_workflow_pr_comment_scope"

pass=0
fail=0

if [ ! -x "$CHECK" ]; then
  echo "FAIL: $CHECK missing or not executable" >&2
  exit 1
fi

# Run the check against a scratch repo root containing one workflow.
# Prints nothing; returns the check's exit code.
run_case() {
  local body="$1"
  local scratch
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

# ── The #881 bug itself: POSTs a PR comment with issues:write only.
expect "issues:write alone is rejected" 1 'permissions:
  issues: write
  pull-requests: read
jobs:
  a:
    steps:
      - run: gh api --method POST "repos/$REPO/issues/$pr/comments" --input p.json'

# ── The fix.
expect "pull-requests:write is accepted" 0 'permissions:
  issues: write
  pull-requests: write
jobs:
  a:
    steps:
      - run: gh api --method POST "repos/$REPO/issues/$pr/comments" --input p.json'

# ── Neither scope declared at all.
expect "no comment scope at all is rejected" 1 'permissions:
  contents: read
jobs:
  a:
    steps:
      - run: gh api --method POST "repos/$REPO/issues/$pr/comments" --input p.json'

# ── A workflow that only READS comments needs no write scope.
expect "read-only comment access is not flagged" 0 'permissions:
  issues: read
  pull-requests: read
jobs:
  a:
    steps:
      - run: gh api --paginate "repos/$REPO/issues/$pr/comments"'

# ── The gh CLI forms need the same scope.
expect "gh pr comment is covered" 1 'permissions:
  issues: write
jobs:
  a:
    steps:
      - run: gh pr comment 12 --body hi'

expect "gh issue comment is covered" 1 'permissions:
  issues: write
jobs:
  a:
    steps:
      - run: gh issue comment 12 --body hi'

# ── actions/github-script createComment takes the same path.
expect "createComment is covered" 1 'permissions:
  issues: write
jobs:
  a:
    steps:
      - uses: actions/github-script@v7
        with:
          script: github.rest.issues.createComment({issue_number: 1})'

# ── Prose ABOUT this rule must not register as a PR-comment write. Without
# comment-stripping the gate flags the very files that document it, which is
# the false positive that trains people to ignore a gate.
expect "a comment describing the rule is not a write" 0 'permissions:
  contents: read
# This workflow does not post. It only explains that a
# gh api --method POST repos/x/issues/1/comments call would need
# pull-requests: write rather than issues: write.
jobs:
  a:
    steps:
      - run: echo hi'

echo
echo "check_workflow_pr_comment_scope: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
