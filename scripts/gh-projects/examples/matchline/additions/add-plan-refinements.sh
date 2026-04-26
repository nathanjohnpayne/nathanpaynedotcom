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

# Existing parents
P0_NUM=5
P1_NUM=15

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
