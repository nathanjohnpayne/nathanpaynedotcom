#!/usr/bin/env bash
# One-shot driver that adds plan-refinement tickets to the Matchline
# initiative (Project #6). These are additions — they do NOT recreate
# the parent or existing children. Run after the main create-issues.sh
# has already populated the board.
#
# Added children:
#   Phase 0: Cost tracker (parent #5)
#   Phase 0: Eval harness bootstrap (parent #5)
#   Phase 1: Prompt versioning convention + loader (parent #15)
#   Phase 1: PDF rendering prototype on Nathan's real resume (parent #15)
#
# Preconditions:
#   eval "$(scripts/op-preflight.sh --agent claude --mode all)"
#   export GH_TOKEN="$OP_PREFLIGHT_AUTHOR_PAT"
#
# Not idempotent — each run creates duplicates. Run once.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

export REPO="nathanjohnpayne/matchline"
export OWNER="nathanjohnpayne"
export PROJECT=6

# shellcheck source=../../../lib.sh
source "$SCRIPT_DIR/../../../lib.sh"

# Resolve existing parent issue numbers by exact title. Issue numbers are
# repo-global, so they cannot be hardcoded — re-running create-issues.sh in a
# repo with prior issues will not place parents at #5/#15.
find_parent_num() {
  local title="$1"
  local num
  num=$(gh issue list --repo "$REPO" --state all --limit 200 \
    --search "in:title \"$title\"" \
    --json number,title \
    --jq ".[] | select(.title == \"$title\") | .number" \
    | head -1)
  if [ -z "$num" ]; then
    echo "ERROR: could not find parent issue with title: $title" >&2
    return 1
  fi
  echo "$num"
}

P0_NUM=$(find_parent_num "Phase 0: Foundations & access")
P1_NUM=$(find_parent_num "Phase 1: Core loop (Career → Experience Units → Matching → Application)")
echo "Resolved parents: P0=#$P0_NUM, P1=#$P1_NUM"

# -----------------------------------------------------------------------------
# Phase 0 additions
# -----------------------------------------------------------------------------
F=$(prep_body "$SCRIPT_DIR/p0-cost-tracker.md" "$P0_NUM")
read P0_COST_URL P0_COST_NUM _ <<<"$(create_child \
  "Cost tracker on LLM calls + CI budget alarm" \
  "$F" "matchline,phase-0,agent-action" "$P0_NUM")"
echo "  P0 cost-tracker: $P0_COST_URL"

F=$(prep_body "$SCRIPT_DIR/p0-eval-bootstrap.md" "$P0_NUM")
read P0_EVAL_URL P0_EVAL_NUM _ <<<"$(create_child \
  "Eval harness bootstrap (scaffolding; fixtures + 80/80 gate land in #25)" \
  "$F" "matchline,phase-0,agent-action" "$P0_NUM")"
echo "  P0 eval-bootstrap: $P0_EVAL_URL"

# -----------------------------------------------------------------------------
# Phase 1 additions
# -----------------------------------------------------------------------------
F=$(prep_body "$SCRIPT_DIR/p1-prompt-versioning.md" "$P1_NUM")
read P1_PROMPT_URL P1_PROMPT_NUM _ <<<"$(create_child \
  "Prompt versioning convention + loader (functions/src/prompts/<stage>/<name>.v<N>.md)" \
  "$F" "matchline,phase-1,agent-action" "$P1_NUM")"
echo "  P1 prompt-versioning: $P1_PROMPT_URL"

F=$(prep_body "$SCRIPT_DIR/p1-pdf-prototype.md" "$P1_NUM")
read P1_PDF_URL P1_PDF_NUM _ <<<"$(create_child \
  "PDF rendering prototype on Nathan's real resume (de-risk pulled from Phase 2)" \
  "$F" "matchline,phase-1,agent-action" "$P1_NUM")"
echo "  P1 pdf-prototype: $P1_PDF_URL"

echo ""
echo "=== DONE ==="
echo "Phase 0 additions: $P0_COST_URL $P0_EVAL_URL"
echo "Phase 1 additions: $P1_PROMPT_URL $P1_PDF_URL"
