#!/usr/bin/env bash
# Rerunnable driver that creates every parent + child issue for the
# Matchline V1 initiative (GitHub Project #6), links them as native
# sub-issues, and adds each to the project board.
#
# Sibling to examples/mux-video-integration/create-issues.sh — same
# pattern, different phase layout. See scripts/gh-projects/README.md for
# the mechanics.
#
# Preconditions:
#   eval "$(scripts/op-preflight.sh --agent claude --mode all)"
#   export GH_TOKEN="$OP_PREFLIGHT_AUTHOR_PAT"
#
# Not idempotent — each run creates a duplicate set. Use only against a
# fresh project or after wiping existing issues.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

export REPO="nathanjohnpayne/matchline"
export OWNER="nathanjohnpayne"
export PROJECT=6

# shellcheck source=../../lib.sh
source "$SCRIPT_DIR/../../lib.sh"

# -----------------------------------------------------------------------------
# Labels (idempotent)
# -----------------------------------------------------------------------------
ensure_label "matchline" "6F42C1" "Matchline V1 initiative"
ensure_label "phase-0" "A0A0A0" "Phase 0: Foundations & access"
ensure_label "phase-1" "0E8A16" "Phase 1: Core loop"
ensure_label "phase-2" "1D76DB" "Phase 2: Completeness"
ensure_label "phase-3" "5319E7" "Phase 3: Real use"
ensure_label "human-action" "D93F0B" "Requires action from a human (not an agent)"
ensure_label "agent-action" "0366D6" "Agent-executable task"
ensure_label "needs-external-review" "ededed" "PR exceeds external-review threshold"

# -----------------------------------------------------------------------------
# Phase 0 — Foundations & access
# -----------------------------------------------------------------------------
P0_URL=$(create_parent "Phase 0: Foundations & access" \
  "$SCRIPT_DIR/phase-0/parent.md" "matchline,phase-0")
P0_NUM="${P0_URL##*/}"
echo "P0 PARENT: $P0_URL"

F=$(prep_body "$SCRIPT_DIR/phase-0/c1.md" "$P0_NUM")
read -r P0_C1_URL P0_C1_NUM _ <<<"$(create_child "Fix P0: invalid Anthropic Haiku model ID in functions/src/llm/config.ts" \
  "$F" "matchline,phase-0,agent-action" "$P0_NUM")"
echo "  C1: $P0_C1_URL"

F=$(prep_body "$SCRIPT_DIR/phase-0/c2.md" "$P0_NUM")
read -r P0_C2_URL P0_C2_NUM _ <<<"$(create_child "Fix P1: owner-scoping seam between firestore.rules and service queries" \
  "$F" "matchline,phase-0,agent-action" "$P0_NUM")"
echo "  C2: $P0_C2_URL"

F=$(prep_body "$SCRIPT_DIR/phase-0/c3.md" "$P0_NUM")
read -r P0_C3_URL P0_C3_NUM _ <<<"$(create_child "Fix broken CI workflows: needs-external-review label + github-token input" \
  "$F" "matchline,phase-0,agent-action" "$P0_NUM")"
echo "  C3: $P0_C3_URL"

F=$(prep_body "$SCRIPT_DIR/phase-0/c4.md" "$P0_NUM" "$P0_C1_NUM" "$P0_C2_NUM" "$P0_C3_NUM")
read -r P0_C4_URL P0_C4_NUM _ <<<"$(create_child "Merge PR #4 after review and CI are clean" \
  "$F" "matchline,phase-0,agent-action" "$P0_NUM")"
echo "  C4: $P0_C4_URL"

F=$(prep_body "$SCRIPT_DIR/phase-0/c5.md" "$P0_NUM")
read -r P0_C5_URL P0_C5_NUM _ <<<"$(create_child "[Human] Add reviewer identities (nathanpayne-claude/cursor/codex) as write collaborators" \
  "$F" "matchline,phase-0,human-action" "$P0_NUM")"
echo "  C5: $P0_C5_URL"

F=$(prep_body "$SCRIPT_DIR/phase-0/c6.md" "$P0_NUM")
read -r P0_C6_URL P0_C6_NUM _ <<<"$(create_child "[Human] Create Firebase project matchline-dev (and optionally matchline-prod)" \
  "$F" "matchline,phase-0,human-action" "$P0_NUM")"
echo "  C6: $P0_C6_URL"

F=$(prep_body "$SCRIPT_DIR/phase-0/c7.md" "$P0_NUM" "$P0_C6_NUM")
read -r P0_C7_URL P0_C7_NUM _ <<<"$(create_child "[Human] Run op-firebase-setup for matchline-dev" \
  "$F" "matchline,phase-0,human-action" "$P0_NUM")"
echo "  C7: $P0_C7_URL"

F=$(prep_body "$SCRIPT_DIR/phase-0/c8.md" "$P0_NUM" "$P0_C6_NUM")
read -r P0_C8_URL P0_C8_NUM _ <<<"$(create_child "[Human] Store ANTHROPIC_API_KEY and OPENAI_API_KEY in Firebase secrets" \
  "$F" "matchline,phase-0,human-action" "$P0_NUM")"
echo "  C8: $P0_C8_URL"

F=$(prep_body "$SCRIPT_DIR/phase-0/c9.md" "$P0_NUM" "$P0_C6_NUM")
read -r P0_C9_URL P0_C9_NUM _ <<<"$(create_child "[Human] Populate .env.local from .env.example" \
  "$F" "matchline,phase-0,human-action" "$P0_NUM")"
echo "  C9: $P0_C9_URL"

# -----------------------------------------------------------------------------
# Phase 1 — Core loop
# -----------------------------------------------------------------------------
P1_URL=$(create_parent "Phase 1: Core loop (Career → Experience Units → Matching → Application)" \
  "$SCRIPT_DIR/phase-1/parent.md" "matchline,phase-1")
P1_NUM="${P1_URL##*/}"
echo "P1 PARENT: $P1_URL"

F=$(prep_body "$SCRIPT_DIR/phase-1/c1.md" "$P1_NUM")
read -r P1_C1_URL P1_C1_NUM _ <<<"$(create_child "Auth + owner_uid wiring (schema, rules, service-layer queries)" \
  "$F" "matchline,phase-1,agent-action" "$P1_NUM")"
echo "  C1: $P1_C1_URL"

F=$(prep_body "$SCRIPT_DIR/phase-1/c2.md" "$P1_NUM" "$P1_C1_NUM")
read -r P1_C2_URL P1_C2_NUM _ <<<"$(create_child "Experience Unit extraction endpoint (pasted resume → ExperienceUnit[])" \
  "$F" "matchline,phase-1,agent-action" "$P1_NUM")"
echo "  C2: $P1_C2_URL"

F=$(prep_body "$SCRIPT_DIR/phase-1/c3.md" "$P1_NUM" "$P1_C2_NUM")
read -r P1_C3_URL P1_C3_NUM _ <<<"$(create_child "Unit Review surface (list, filter, inline edit, approve/reject, manual add)" \
  "$F" "matchline,phase-1,agent-action" "$P1_NUM")"
echo "  C3: $P1_C3_URL"

F=$(prep_body "$SCRIPT_DIR/phase-1/c4.md" "$P1_NUM" "$P1_C1_NUM")
read -r P1_C4_URL P1_C4_NUM _ <<<"$(create_child "Job Requirement parsing endpoint (pasted JD → JobRequirementUnit[])" \
  "$F" "matchline,phase-1,agent-action" "$P1_NUM")"
echo "  C4: $P1_C4_URL"

F=$(prep_body "$SCRIPT_DIR/phase-1/c5.md" "$P1_NUM" "$P1_C2_NUM" "$P1_C4_NUM")
read -r P1_C5_URL P1_C5_NUM _ <<<"$(create_child "Matching engine + canonical skill/tool/domain ontology seed" \
  "$F" "matchline,phase-1,agent-action" "$P1_NUM")"
echo "  C5: $P1_C5_URL"

F=$(prep_body "$SCRIPT_DIR/phase-1/c6.md" "$P1_NUM" "$P1_C5_NUM")
read -r P1_C6_URL P1_C6_NUM _ <<<"$(create_child "Role Detail → Matches tab (ranked matches, rationale, gaps, approve/reject)" \
  "$F" "matchline,phase-1,agent-action" "$P1_NUM")"
echo "  C6: $P1_C6_URL"

F=$(prep_body "$SCRIPT_DIR/phase-1/c7.md" "$P1_NUM" "$P1_C6_NUM")
read -r P1_C7_URL P1_C7_NUM _ <<<"$(create_child "Resume generation (grounded-generation prompt, functions endpoint)" \
  "$F" "matchline,phase-1,agent-action" "$P1_NUM")"
echo "  C7: $P1_C7_URL"

F=$(prep_body "$SCRIPT_DIR/phase-1/c8.md" "$P1_NUM" "$P1_C7_NUM")
read -r P1_C8_URL P1_C8_NUM _ <<<"$(create_child "Validation layer (claim extraction, traceability, specificity)" \
  "$F" "matchline,phase-1,agent-action" "$P1_NUM")"
echo "  C8: $P1_C8_URL"

F=$(prep_body "$SCRIPT_DIR/phase-1/c9.md" "$P1_NUM" "$P1_C7_NUM" "$P1_C8_NUM")
read -r P1_C9_URL P1_C9_NUM _ <<<"$(create_child "Application Editor surface (two-pane, inline annotations, flag badges, export block)" \
  "$F" "matchline,phase-1,agent-action" "$P1_NUM")"
echo "  C9: $P1_C9_URL"

F=$(prep_body "$SCRIPT_DIR/phase-1/c10.md" "$P1_NUM")
read -r P1_C10_URL P1_C10_NUM _ <<<"$(create_child "Evaluation harness (extraction ≥80%, match ≥80%, zero-fabrication invariant)" \
  "$F" "matchline,phase-1,agent-action" "$P1_NUM")"
echo "  C10: $P1_C10_URL"

F=$(prep_body "$SCRIPT_DIR/phase-1/c11.md" "$P1_NUM")
read -r P1_C11_URL P1_C11_NUM _ <<<"$(create_child "Phase 1 milestone: end-to-end QA on 3+ real JDs" \
  "$F" "matchline,phase-1,agent-action" "$P1_NUM")"
echo "  C11: $P1_C11_URL"

# -----------------------------------------------------------------------------
# Phase 2 — Completeness
# -----------------------------------------------------------------------------
P2_URL=$(create_parent "Phase 2: Completeness (LinkedIn, cover letters, pipeline, exports)" \
  "$SCRIPT_DIR/phase-2/parent.md" "matchline,phase-2")
P2_NUM="${P2_URL##*/}"
echo "P2 PARENT: $P2_URL"

F=$(prep_body "$SCRIPT_DIR/phase-2/c1.md" "$P2_NUM")
read -r P2_C1_URL P2_C1_NUM _ <<<"$(create_child "LinkedIn HTML parser (view-source paste → Experience Units)" \
  "$F" "matchline,phase-2,agent-action" "$P2_NUM")"
echo "  C1: $P2_C1_URL"

F=$(prep_body "$SCRIPT_DIR/phase-2/c2.md" "$P2_NUM")
read -r P2_C2_URL P2_C2_NUM _ <<<"$(create_child "Long-form career context parser with source provenance" \
  "$F" "matchline,phase-2,agent-action" "$P2_NUM")"
echo "  C2: $P2_C2_URL"

F=$(prep_body "$SCRIPT_DIR/phase-2/c3.md" "$P2_NUM")
read -r P2_C3_URL P2_C3_NUM _ <<<"$(create_child "Cover letter generation (same grounding + validation as resumes)" \
  "$F" "matchline,phase-2,agent-action" "$P2_NUM")"
echo "  C3: $P2_C3_URL"

F=$(prep_body "$SCRIPT_DIR/phase-2/c4.md" "$P2_NUM")
read -r P2_C4_URL P2_C4_NUM _ <<<"$(create_child "Application Editor polish (hover-source, edit-preserves-traceability)" \
  "$F" "matchline,phase-2,agent-action" "$P2_NUM")"
echo "  C4: $P2_C4_URL"

F=$(prep_body "$SCRIPT_DIR/phase-2/c5.md" "$P2_NUM")
read -r P2_C5_URL P2_C5_NUM _ <<<"$(create_child "Pipeline Kanban (7 stages, cards, click-through to Role Detail)" \
  "$F" "matchline,phase-2,agent-action" "$P2_NUM")"
echo "  C5: $P2_C5_URL"

F=$(prep_body "$SCRIPT_DIR/phase-2/c6.md" "$P2_NUM")
read -r P2_C6_URL P2_C6_NUM _ <<<"$(create_child "Export to PDF, DOCX, and plain text" \
  "$F" "matchline,phase-2,agent-action" "$P2_NUM")"
echo "  C6: $P2_C6_URL"

F=$(prep_body "$SCRIPT_DIR/phase-2/c7.md" "$P2_NUM")
read -r P2_C7_URL P2_C7_NUM _ <<<"$(create_child "Tasks + follow-up reminders sidebar" \
  "$F" "matchline,phase-2,agent-action" "$P2_NUM")"
echo "  C7: $P2_C7_URL"

F=$(prep_body "$SCRIPT_DIR/phase-2/c8.md" "$P2_NUM")
read -r P2_C8_URL P2_C8_NUM _ <<<"$(create_child "Capability Graph JSON export (portability)" \
  "$F" "matchline,phase-2,agent-action" "$P2_NUM")"
echo "  C8: $P2_C8_URL"

F=$(prep_body "$SCRIPT_DIR/phase-2/c9.md" "$P2_NUM")
read -r P2_C9_URL P2_C9_NUM _ <<<"$(create_child "Phase 2 milestone: first real application submitted end-to-end" \
  "$F" "matchline,phase-2,agent-action" "$P2_NUM")"
echo "  C9: $P2_C9_URL"

# -----------------------------------------------------------------------------
# Phase 3 — Real use
# -----------------------------------------------------------------------------
P3_URL=$(create_parent "Phase 3: Real use (tuning, telemetry, 10 applications)" \
  "$SCRIPT_DIR/phase-3/parent.md" "matchline,phase-3")
P3_NUM="${P3_URL##*/}"
echo "P3 PARENT: $P3_URL"

F=$(prep_body "$SCRIPT_DIR/phase-3/c1.md" "$P3_NUM")
read -r P3_C1_URL P3_C1_NUM _ <<<"$(create_child "Extraction prompt tuning on Nathan's real resumes" \
  "$F" "matchline,phase-3,agent-action" "$P3_NUM")"
echo "  C1: $P3_C1_URL"

F=$(prep_body "$SCRIPT_DIR/phase-3/c2.md" "$P3_NUM")
read -r P3_C2_URL P3_C2_NUM _ <<<"$(create_child "Matching rationale + weight tuning from approval/rejection patterns" \
  "$F" "matchline,phase-3,agent-action" "$P3_NUM")"
echo "  C2: $P3_C2_URL"

F=$(prep_body "$SCRIPT_DIR/phase-3/c3.md" "$P3_NUM")
read -r P3_C3_URL P3_C3_NUM _ <<<"$(create_child "Generation prompt tuning (tone + specificity)" \
  "$F" "matchline,phase-3,agent-action" "$P3_NUM")"
echo "  C3: $P3_C3_URL"

F=$(prep_body "$SCRIPT_DIR/phase-3/c4.md" "$P3_NUM")
read -r P3_C4_URL P3_C4_NUM _ <<<"$(create_child "Cost + latency telemetry + lightweight dashboard" \
  "$F" "matchline,phase-3,agent-action" "$P3_NUM")"
echo "  C4: $P3_C4_URL"

F=$(prep_body "$SCRIPT_DIR/phase-3/c5.md" "$P3_NUM")
read -r P3_C5_URL P3_C5_NUM _ <<<"$(create_child "Bug triage during real use (umbrella — split as needed)" \
  "$F" "matchline,phase-3,agent-action" "$P3_NUM")"
echo "  C5: $P3_C5_URL"

F=$(prep_body "$SCRIPT_DIR/phase-3/c6.md" "$P3_NUM")
read -r P3_C6_URL P3_C6_NUM _ <<<"$(create_child "Phase 3 milestone: 10 serious applications shipped through Matchline" \
  "$F" "matchline,phase-3,agent-action" "$P3_NUM")"
echo "  C6: $P3_C6_URL"

# -----------------------------------------------------------------------------
# Assign human-action tickets to nathanjohnpayne
# -----------------------------------------------------------------------------
# Phase 0 human-action children. Tolerate per-issue failures (e.g. transient API
# errors) rather than aborting the whole run under `set -e`.
for num in "$P0_C5_NUM" "$P0_C6_NUM" "$P0_C7_NUM" "$P0_C8_NUM" "$P0_C9_NUM"; do
  if gh issue edit "$num" --repo "$REPO" --add-assignee nathanjohnpayne > /dev/null 2>&1; then
    echo "assigned #$num → nathanjohnpayne"
  else
    echo "warning: failed to assign #$num (continuing)" >&2
  fi
done

# -----------------------------------------------------------------------------
# Output summary
# -----------------------------------------------------------------------------
echo ""
echo "=== DONE ==="
echo "Phase 0: $P0_URL"
echo "Phase 1: $P1_URL"
echo "Phase 2: $P2_URL"
echo "Phase 3: $P3_URL"
