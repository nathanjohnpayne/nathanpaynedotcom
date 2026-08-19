# AI Agent Code Review Policy

## Overview

This policy governs how AI coding agents author, review, and merge code across repositories owned by the `nathanjohnpayne` GitHub account. It enforces a structured peer review process where a single agent performs both authoring and self-review under separate GitHub identities, with mandatory external review by a different agent when complexity thresholds are met. All review activity occurs through GitHub PRs, producing a complete audit trail indistinguishable from multi-developer collaboration.

## Identities

### Author Identity

All agents commit and push code under a single shared author identity:

- **GitHub ID:** `nathanjohnpayne`
- **Role:** Author, committer, and merger for all code changes
- **Used by:** Whichever agent is currently writing or fixing code

### Reviewer Identities

Each agent has a dedicated reviewer identity used exclusively for code review:

| Agent | Reviewer Identity |
|-------|-------------------|
| Claude | `nathanpayne-claude` |
| Cursor | `nathanpayne-cursor` |
| Codex | `nathanpayne-codex` |

To add a new agent, register a GitHub account following the pattern `nathanpayne-{agent}` and add it to the `available_reviewers` list in the repo's `review-policy.yml`.

### Identity Rules

- An agent **never** reviews its own code under the same identity that authored it.
- The author identity (`nathanjohnpayne`) is always the one that merges to the target branch.
- Reviewer identities only post review comments, request changes, and approve PRs. They do not merge.

### Reviewer PAT Quick Start

When posting a PR review as a reviewer identity, always pass a PAT from 1Password
to `gh` explicitly. Do not rely on the GitHub connector session or on the
account shown by `gh auth status`.

#### PAT lookup table

| Agent | Reviewer Identity | 1Password Item ID | `op read` path |
|-------|-------------------|-------------------|----------------|
| Claude | `nathanpayne-claude` | `pvbq24vl2h6gl7yjclxy2hbote` | `op://Private/pvbq24vl2h6gl7yjclxy2hbote/token` |
| Cursor | `nathanpayne-cursor` | `bslrih4spwxgookzfy6zedz5g4` | `op://Private/bslrih4spwxgookzfy6zedz5g4/token` |
| Codex | `nathanpayne-codex` | `o6ekjxjjl5gq6rmcneomrjahpu` | `op://Private/o6ekjxjjl5gq6rmcneomrjahpu/token` |
| Human | `nathanjohnpayne` | `sm5kopwk6t6p3xmu2igesndzhe` | `op://Private/sm5kopwk6t6p3xmu2igesndzhe/token` |

```bash
# Example: verify the Claude reviewer identity before approving a PR
GH_TOKEN="$(op read 'op://Private/pvbq24vl2h6gl7yjclxy2hbote/token')" \
  gh api user --jq '.login'
# expected: nathanpayne-claude

GH_TOKEN="$(op read 'op://Private/pvbq24vl2h6gl7yjclxy2hbote/token')" \
  gh pr review <PR#> --repo <owner/repo> --approve --body "Review comment"
```

- Use the item ID from the lookup table above for your agent identity. Do not use the 1Password item title.
- If `gh auth status` still shows `nathanjohnpayne`, that is okay.
  `GH_TOKEN=...` overrides the ambient login for that command.
- If `op whoami` says you are not signed in, still run the `op read ...`
  command in an interactive TTY. That is what triggers the 1Password biometric
  prompt on local machines.
- If GitHub returns `Review Can not approve your own pull request`, the wrong
  reviewer identity is still being used. Check the lookup table and verify you
  are using your agent's item ID, not the author identity's.

### No-self-approve scoping

The no-self-approve rule applies only to PRs that meet
`external_review_threshold` or match `external_review_paths` (the Phase 4
PRs). For those, the agent's own reviewer identity posts `--comment`
only. The merge gate is carried by Codex in Phase 4a or by a different
agent's `APPROVED` review in Phase 4b. Posting `--approve` from the
authoring agent's own reviewer identity on a Phase 4 PR would
short-circuit the cross-agent gate the threshold exists to enforce.

For PRs that do not meet the threshold, the reviewer identity posting
`gh pr review --approve` after CodeRabbit has cleared the current HEAD is
the intended path. It satisfies branch protection's required-approving-review
check without bouncing a small, self-contained change to an external
agent. GitHub blocks true self-approval only when the approving account is
the same GitHub account as the PR author; in this repo's normal flow,
the PR author is `nathanjohnpayne` and the reviewer identity is
`nathanpayne-<agent>`.

## Workflow

### Phase 0: Credential Preflight

> Run this once at the start of every PR review or deploy session. It front-loads all 1Password credential reads and SSH key authorization into a single burst of biometric prompts (~15 seconds), so the human can step away for the rest of the session.

```bash
eval "$(scripts/op-preflight.sh --agent claude --mode all)"
```

Replace `claude` with `cursor` or `codex` depending on which agent is running. The `--mode` flag controls what is loaded:

| Mode | What's loaded |
|------|--------------|
| `review` | Reviewer PAT + author PAT + SSH keys |
| `deploy` | GCP ADC credential |
| `all` | Everything (recommended) |

After preflight, these environment variables are set:
- `OP_PREFLIGHT_REVIEWER_PAT`—use with `GH_TOKEN=` for reviewer commands
- `OP_PREFLIGHT_AUTHOR_PAT`—use with `GH_TOKEN=` for author commands
- `GOOGLE_APPLICATION_CREDENTIALS`—used automatically by gcloud/Firebase scripts
- `OP_PREFLIGHT_DONE=1`—flag indicating preflight has been run

If any `op` command fails mid-session (rare—only if 1Password locks or the 12-hour hard limit is reached), re-run the preflight command.

### Phase 1: Authoring

1. The agent creates a feature branch from the target branch (e.g., `main`).
2. The agent writes code as `nathanjohnpayne`, following all project-level rules (linting, testing, conventions).
3. The agent files a PR from the feature branch to the target branch under `nathanjohnpayne`. The PR description must include an `Authoring-Agent:` line identifying which agent wrote the code (e.g., `Authoring-Agent: claude`). This is required because all PRs share the `nathanjohnpayne` author identity, and the workflow uses this line to assign the correct reviewer identity for internal self-peer review.

### Phase 2: Internal Review (Self-Peer Review)

4. The agent switches its Git identity to its reviewer account (e.g., `nathanpayne-claude`).
5. The reviewer identity checks out the PR branch, reviews the diff, and posts review comments on the PR with specific, actionable feedback.
6. The agent switches back to `nathanjohnpayne` and addresses each comment—pushing fix commits to the same branch.
7. Steps 4–6 repeat until the reviewer identity approves the PR with no outstanding issues. The mechanism of "approves" is scope-dependent: for under-threshold PRs (Phase 3 below), the reviewer identity posts `gh pr review --approve` to satisfy branch protection's required-approving-review check. For above-threshold PRs (Phase 4), the reviewer identity posts `gh pr review --comment` only; the cross-agent merge gate is carried by Phase 4. See [No-self-approve scoping](#no-self-approve-scoping) above.

**All review rounds are captured as GitHub PR comments and commits.** The back-and-forth should read like two developers collaborating.

### Phase 2.5: Automated External Review (CodeRabbit)

> **Applies only to repos with `coderabbit.enabled: true` in `.github/review-policy.yml`.** Skip this phase for repos where CodeRabbit is not enabled.

After internal review passes (Phase 2), CodeRabbit provides an independent automated review:

1. **Wait for CodeRabbit.** CodeRabbit automatically posts a review when the PR is opened or updated. The agent must wait for CodeRabbit to finish before proceeding. If CodeRabbit has not posted after 3 minutes, ask the human whether to continue waiting or skip.
2. **Read both API endpoints.** CodeRabbit posts two types of comments that must both be checked:
   - **PR-level summary:** `gh api repos/{owner}/{repo}/issues/{pr_number}/comments`—contains the high-level walkthrough and summary.
   - **Inline review comments on the diff:** `gh api repos/{owner}/{repo}/pulls/{pr_number}/comments`—contains line-by-line findings anchored to specific code.
3. **Scan for potential issues.** Before proceeding, grep CodeRabbit's inline review comments for `Potential issue` or `⚠️`. These markers indicate findings CodeRabbit considers high-severity. Every such finding must be explicitly addressed (fixed or dismissed with reasoning).
4. The agent addresses substantive CodeRabbit findings—fixing issues or posting a reply explaining why a finding is not applicable.
5. The agent is not required to resolve every CodeRabbit comment. Use judgment: fix genuine issues, dismiss false positives with a brief explanation. However, all `Potential issue` / `⚠️` findings require an explicit response.
6. CodeRabbit review is advisory. It does not block merge via CI and does not submit a "Changes Requested" review state.

**CodeRabbit runs on ALL PRs** in enabled repos, regardless of size or whether the external review threshold is met. It provides a consistent automated second opinion on every change.

The agent proceeds to Phase 3 (Threshold Check) after addressing CodeRabbit comments, even if some remain open. CodeRabbit is an additional review layer, not a replacement for the existing threshold-based external agent handoff.

#### CodeRabbit Review Checklist

Before moving past Phase 2.5, confirm all of the following:

- [ ] CodeRabbit has posted its review (waited up to 3 minutes, or human approved skip)
- [ ] Read PR-level comments via `issues/{pr}/comments` endpoint
- [ ] Read inline diff comments via `pulls/{pr}/comments` endpoint
- [ ] Grepped inline comments for `Potential issue` and `⚠️`—all flagged findings addressed
- [ ] Substantive findings fixed or dismissed with reasoning

### Phase 3: External Review Threshold Check

> **Note on automation timing:** CI workflows may apply the `needs-external-review` label automatically when a PR is opened or updated, as an early advisory based on line count and protected paths. The label blocks merge via the label-gate until external review clears. When the label is present, the agent's responsibility after internal review passes is to proceed to [Phase 4](#phase-4-external-review)—which routes the PR to Phase 4a (automated via the Codex GitHub App) or Phase 4b (the external review fallback) depending on `codex.enabled` and on whether 4a converges. The label itself does NOT imply immediate human mediation; Phase 4b tries its automated orchestrator leg first and only posts the handoff message when that leg declines.

8. After internal review passes, the agent evaluates whether the PR meets the external review threshold (see [Review Policy Configuration](#review-policy-configuration)).
9. If the threshold is **not** met, the agent merges the PR as `nathanjohnpayne`. Done.
10. If the threshold **is** met, the agent proceeds to [Phase 4: External Review](#phase-4-external-review). Phase 4 itself routes the PR to Phase 4a (automated, via the Codex GitHub App) or Phase 4b (the external review fallback) based on `codex.enabled` in `.github/review-policy.yml` and on whether 4a's automated loop converges. The agent does NOT post a handoff message directly from this step—Phase 4b posts its own handoff message if and when its automated leg declines.

### Phase 4: External Review

Phase 4 has two sub-phases that together cover the two ways external review can run:

- **Phase 4a—Automated external review** via the ChatGPT Codex Connector GitHub App. This is the default happy path. The authoring agent drives the review loop without human intervention until Codex signals clearance, then runs a merge-gate check and merges.
- **Phase 4b—External review fallback** via a different agent's CLI (e.g., Codex CLI as `nathanpayne-codex`, or Claude Code). This is the escape hatch when 4a **times out** or is unavailable because `codex.enabled: false`. It runs in two legs: an **automated orchestrator** leg that drives that CLI headlessly, and a **manual handoff** leg the human mediates when the orchestrator declines. Disagreement and runaway do *not* come here—see below.

An agent proceeds to 4a first. If 4a **times out or is disabled**, the agent falls back to 4b—running the orchestrator first and surfacing the handoff to the human per [Handoff Message Format](#handoff-message-format) only if the orchestrator declines. If 4a instead **escalates** (disagreement or runaway), the agent stops and hands the decision to the human per [Disagreements and Tiebreaking](#disagreements-and-tiebreaking); it does not fall back to 4b, because a second reviewer would settle a dispute the human is supposed to settle.

#### Phase 4a: Automated External Review (Codex GitHub App)

> **Applies only to repos with `codex.enabled: true` in `.github/review-policy.yml`.** The **ChatGPT Codex Connector GitHub App must also be review-ready on the repository**, meaning installed, with Code Review enabled at [chatgpt.com/codex/cloud/settings/code-review](https://chatgpt.com/codex/cloud/settings/code-review), AND with a Codex environment configured at [chatgpt.com/codex/cloud/settings/environments](https://chatgpt.com/codex/cloud/settings/environments). "Installed" alone is not sufficient—a PR in a repo where the App is present but the environment is not configured will receive a "create an environment for this repo" comment from `chatgpt-codex-connector[bot]` instead of a review (observed on PR #62 on 2026-04-14). The only verification available from an agent reviewer PAT is observational: check whether a recent PR in this repo received an auto-review from `chatgpt-codex-connector[bot]`; `gh api repos/{owner}/{repo}/installation` requires a GitHub App JWT and is NOT usable from normal tokens. If any of these conditions is not met, skip directly to Phase 4b.

11a. The authoring agent runs `scripts/codex-review-request.sh <PR#>` to trigger or await a Codex review. If the Codex App's "Automatic reviews" setting has already caused Codex to review the PR on open (typical latency ~2 minutes for small PRs), the script skips posting `@codex review` and goes straight to polling.

12a. `codex-review-request.sh` polls the PR until one of the following:

     - **Codex posts a review.** Always in `COMMENTED` state—the Codex GitHub App never uses `APPROVED` or `CHANGES_REQUESTED`. Findings appear as **inline comments on the diff** (`/pulls/{pr}/comments` endpoint), not in the top-level review body. Inline findings carry priority markers: `![P0 Badge]`, `![P1 Badge]`, `![P2 Badge]`, or `![P3 Badge]`.
     - **Codex reacts 👍 / `+1`** on the PR issue with no review body. This is Codex's no-findings clearance signal per the ChatGPT Codex Connector documentation.
     - **Timeout.** No review and no reaction within `codex.review_timeout_seconds` (default: 600s / 10 min). The script exits with code `4` (`FALLBACK_REQUIRED`).

13a. If Codex posted inline findings, the agent addresses each P0/P1 by either:

     - **Fixing the code** and pushing a new commit to the same branch, or
     - **Replying on the finding thread** with a clear rebuttal explaining why the finding does not apply (for false positives or scope disagreements).

     P2 and P3 findings are addressed at the agent's judgment—not every cosmetic or nit-level finding needs a fix or a rebuttal.

14a. The agent increments its round counter and re-runs `scripts/codex-review-request.sh` to request a re-review of the new HEAD.

15a. The loop continues until one of the following terminates it:

     - **Clearance (happy path).** Codex posts a review with no unaddressed P0/P1 inline findings on the current HEAD, OR reacts 👍 on or after the current HEAD commit. Proceed to step 16a.
     - **Disagreement (escalate).** Codex re-flags the same finding after the agent posted a rebuttal. This is "repeat-after-rebuttal." See [Disagreements and Tiebreaking](#disagreements-and-tiebreaking).
     - **Runaway (escalate).** The round counter exceeds `codex.max_review_rounds` (default: 2). The 3rd round trips this guard. See [Disagreements and Tiebreaking](#disagreements-and-tiebreaking).
     - **Timeout (fall back).** `codex-review-request.sh` exits with code `4` (`FALLBACK_REQUIRED`) for the current round. The agent falls back to Phase 4b. There is no "second timeout" escalation—a single timeout already routes to human mediation via the 4b handoff.

16a. Before merging, the agent runs `scripts/codex-review-check.sh <PR#>` to verify the merge gate. All of the following must be true:

     - `gh pr checks` reports all required CI checks green
     - **Gate (b)** is satisfied by either:
       - **Branch 1 (cross-agent):** a reviewer identity from `available_reviewers` has posted an `APPROVED` review, and that reviewer is not the authoring agent's own reviewer identity.
       - **Branch 2 (same-agent fallback):** when `codex.enabled: true`, the PR's `Authoring-Agent:` matches an entry in `available_reviewers`, and `chatgpt-codex-connector[bot]` has a fresh thumbs-up reaction on the PR issue. This covers single-agent Phase 4 sessions where the no-self-approve rule correctly keeps the authoring agent's reviewer identity in `--comment` mode.
     - **Gate (c)** is satisfied when Codex has signaled clearance on the current HEAD via one of the two forms in step 12a, or when Phase 4b has landed an `APPROVED` review on the current HEAD from a non-author identity in `available_reviewers`.

     **The merge gate must never require an `APPROVED` review state from `chatgpt-codex-connector[bot]`—the app does not emit that state.** This point is load-bearing; a merge gate that looks for Codex APPROVED will never be satisfied and the Phase 4a happy path will be unreachable.

     **No-self-approve rule + branch 2 interaction:** for Phase 4 PRs, the authoring agent's own reviewer identity posts `--comment` only. Branch 2 prevents that rule from deadlocking the merge gate: Codex's thumbs-up carries the cross-check weight for same-agent sessions, while a different agent's `APPROVED` review carries it for cross-agent/Phase 4b sessions.

17a. On a passing merge gate, `nathanjohnpayne` merges the PR with `gh pr merge <n> --squash --delete-branch`. Never `--admin` unless the human explicitly authorizes a break-glass override in chat.

#### Phase 4b: External Review Fallback

Phase 4b is invoked when Phase 4a **times out** (single timeout, exit code `4` from `codex-review-request.sh`) or when `codex.enabled: false` in the repo.

**Phase 4a disagreement and runaway do NOT enter Phase 4b—either leg.** They stay in the human tiebreaking flow described in [Disagreements and Tiebreaking](#disagreements-and-tiebreaking): stop, post both positions, alert the human, wait for an explicit decision. Routing them here would hand a disputed review to a different reviewer and could obtain a substitute `APPROVED` without the human tiebreaker the disagreement procedure exists to require—the same failure A6 below rules out for Phase 4b's own exhausted rounds. A timeout is not a disagreement: nobody disagreed, the reviewer never answered, and there is no position to tiebreak.

Phase 4b has **two legs, tried in order**:

1. **Leg 1—automated orchestrator** (`scripts/phase-4b-review.sh`, steps A1–A5 below). This is the prescribed first move whenever `phase_4b_automation.enabled: true` and `phase_4b_automation.mode: local` in `.github/review-policy.yml`. It produces a genuine `APPROVED` (or `CHANGES_REQUESTED`) review from a non-author reviewer identity, which is both the "Phase 4b substitute" clearance the merge gate already accepts (`codex.allow_phase_4b_substitute`) and the approving review branch protection asks for.
2. **Leg 2—manual CLI handoff** (steps 11b–19b below). The fallback of the fallback. It preserves the cross-agent review flow that existed before the Codex GitHub App integration and remains the human-mediated escape hatch.

Ordering is safe: every fail-closed path in leg 1 falls back to leg 2, so trying the orchestrator first cannot remove the human escape hatch. Leg 1's steps are lettered `A1`–`A5` so leg 2 keeps its historical `11b`–`19b` numbering unchanged.

##### Leg 1: Automated orchestrator (`scripts/phase-4b-review.sh`)

**A1. Trusted-path rule (mergepath#628)—read this before running anything.** The orchestrator, its adapters, and `scripts/gh-as-reviewer.sh` MUST be run from a **trusted `main`-ref checkout, never from the checkout of the PR under review**. The PR is passed **by number** and its diff is fetched and reviewed as data, so a PR that edits the phase-4b scripts, the adapters, or the review policy cannot shape its own verdict. This rule binds per invocation—it is the single step most likely to be gotten wrong under time pressure.

**A2. Run it.** From that trusted checkout:

```bash
scripts/phase-4b-review.sh <PR#> [--repo owner/repo] [--reviewer nathanpayne-<agent>] \
    [--author <agent>] [--head <sha>] [--diff-file <path>] [--dry-run]
```

Only `<PR#>` is required. The repo, the HEAD sha, and the authoring agent (parsed from the PR body's `Authoring-Agent:` line) are resolved from the GitHub API; the reviewer PAT is auto-sourced from the op-preflight cache. The overrides exist mainly for tests and non-git contexts; `--dry-run` does everything except post the review.

**A3. What it guarantees.** It selects an external reviewer from `available_reviewers` whose **agent differs from the authoring agent**—a forced `--reviewer` is checked against the same invariant, and the run exits `3` rather than proceed when no eligible reviewer exists. It then dispatches the diff to that reviewer's headless CLI adapter (`codex exec` / `claude -p`), validates the returned verdict against `scripts/phase-4b/verdict.schema.json`, and posts `APPROVED` or `CHANGES_REQUESTED` as a real GitHub review under the reviewer identity via `scripts/gh-as-reviewer.sh`, pinned to the reviewed HEAD.

**A4. Act on the exit code and the JSON summary printed on stdout.**

| Exit | Meaning | Next step |
|------|---------|-----------|
| `0` | `APPROVED` posted on the reviewed HEAD. | If the verdict carried discretionary findings and `phase_4b_automation.post_review_issues: true`, the orchestrator has already filed the [Post-Merge Issue Creation](#post-merge-issue-creation) issues under the author identity and linked them in the approval body—do not file them again. Run `scripts/codex-review-check.sh <PR#>` to verify the merge gate, then merge as `nathanjohnpayne`. Done. |
| `1` | `CHANGES_REQUESTED` posted. | Address the findings as `nathanjohnpayne`, push fix commits, and re-run. The orchestrator does one adapter pass per invocation and persists no round state, so the caller enforces `phase_4b_automation.max_review_rounds`. On exhausting that cap, see **A6**. |
| `3` | Usage or infrastructure error (missing `jq`/`gh`, unresolvable repo/HEAD/authoring agent, no eligible external reviewer, malformed timeout or effort config). | Fix the environment and re-run, or go to leg 2. |
| `4` | Fell back to the manual handoff—`fell_back_to_manual: true` with a `reason` in the JSON. Triggers: a non-conformant or unexpected adapter verdict, an adapter error or timeout, no adapter for the selected reviewer, PR head drift between review and posting, failed post-review issue filing on an approved verdict, and the same-head unresolved-required-finding gate. The chat-side handoff block is emitted on stderr. | Go to leg 2. |
| `5` | Automation is off for this repo (`phase_4b_automation.enabled: false`, or `mode` other than `local`); the JSON reports `skipped: true`. Not an error. | Go to leg 2. |

**A5. Fall through to leg 2 only on exit `3`, `4`, or `5`,** or when `scripts/phase-4b-review.sh` is not on disk. An `APPROVED` or `CHANGES_REQUESTED` verdict is a completed Phase 4b review—do not also post the manual handoff for it.

**A6. Exhausted rounds are an escalation, not a fall-through.** When repeated exit-`1` rounds reach `phase_4b_automation.max_review_rounds`, stop. Do not re-run the orchestrator, do not post the leg 2 handoff, and do not merge. Escalate exactly as Phase 4a does for runaway and repeat-after-rebuttal: post a PR comment summarising both positions with links to each review round, alert the human, and wait. See [Disagreements and Tiebreaking](#disagreements-and-tiebreaking)—the human is the tiebreaker, and the resolutions available there (approve the existing state, give feedback directly in chat, or take the PR over manually) apply unchanged.

Leg 2 is deliberately *not* the answer here. A cap reached through repeated substantive disagreement means the reviewer keeps finding problems, and shuttling the same disagreement to a second external reviewer restarts the argument rather than settling it. Leg 2 exists for when leg 1 could not run, not for when it ran and disagreed.

##### Leg 2: Manual CLI handoff (fallback of the fallback)

Reached only when leg 1 declines per A5.

11b. The authoring agent posts the handoff message (see [Handoff Message Format](#handoff-message-format)) as a PR comment and alerts the human.

12b. The human takes the handoff message to a different agent session (e.g., from Claude to Cursor, or to a Codex CLI session authenticated as `nathanpayne-codex`).

13b. The external agent's reviewer identity reviews the PR and posts review comments. Unlike the Codex GitHub App, CLI-driven reviews use the standard GitHub review states (`APPROVED`, `CHANGES_REQUESTED`, `COMMENTED`) as expected.

14b. The human relays the external reviewer's feedback back to the originating agent.

15b. The originating agent, as `nathanjohnpayne`, addresses the feedback and pushes fix commits to the same branch.

16b. The human shuttles updated code back to the external reviewer.

17b. Steps 13b–16b repeat until the external reviewer submits an `APPROVED` review.

18b. If the external reviewer flags **observations** or **risks** while approving, those are converted to GitHub Issues on the repo, assigned to `nathanjohnpayne` (see [Post-Merge Issue Creation](#post-merge-issue-creation)).

19b. `nathanjohnpayne` merges the PR. Done.

### Flow Diagram

```
  ┌─────────────────────────────────────────────────────────┐
  │  PHASE 1: AUTHOR                                        │
  │  Agent writes code as nathanjohnpayne → files PR         │
  └──────────────────────────┬──────────────────────────────┘
                             │
                             ▼
  ┌─────────────────────────────────────────────────────────┐
  │  PHASE 2: INTERNAL REVIEW                                │
  │  Agent switches to nathanpayne-{agent}                   │
  │  Reviews PR → posts comments                             │
  │  Agent switches to nathanjohnpayne → fixes               │
  │  ↻ Repeat until approved                                 │
  └──────────────────────────┬──────────────────────────────┘
                             │
                             ▼
  ┌─────────────────────────────────────────────────────────┐
  │  PHASE 2.5: CODERABBIT REVIEW (if enabled)               │
  │  CodeRabbit auto-posts review on PR                      │
  │  Agent reads findings, addresses substantive issues      │
  │  Advisory only — does not block merge                    │
  └──────────────────────────┬──────────────────────────────┘
                             │
                             ▼
  ┌─────────────────────────────────────────────────────────┐
  │  PHASE 3: THRESHOLD CHECK                                │
  │  Lines changed ≥ threshold OR protected paths touched?   │
  │                                                          │
  │  NO ──→ nathanjohnpayne merges. Done.                    │
  │  YES ──→ Proceed to Phase 4                              │
  └──────────────────────────┬──────────────────────────────┘
                             │
                             ▼
  ┌─────────────────────────────────────────────────────────┐
  │  PHASE 4a: AUTOMATED EXTERNAL REVIEW                    │
  │  (Codex GitHub App, default when codex.enabled: true)   │
  │                                                         │
  │  round ← 1                                              │
  │  Agent runs codex-review-request.sh                     │
  │    → Codex posts COMMENTED review OR 👍 reaction        │
  │                                                         │
  │  ┌─ no unaddressed P0/P1 findings → clearance           │
  │  ├─ P0/P1 findings → fix or reply; round += 1; repeat   │
  │  ├─ repeat-after-rebuttal → ESCALATE (Disagreements)    │
  │  ├─ round > max_review_rounds → ESCALATE (Disagreements)│
  │  └─ timeout (exit code 4) → FALL BACK to Phase 4b       │
  └──────────────┬───────────────────────┬──────────────────┘
                 │ clearance              │ escalate / fallback
                 ▼                        ▼
  ┌──────────────────────────┐  ┌────────────────────────────┐
  │  MERGE GATE:             │  │  PHASE 4b: EXTERNAL REVIEW │
  │  codex-review-check.sh   │  │  FALLBACK                  │
  │                          │  │                            │
  │  • gh pr checks = green  │  │  LEG 1 (first): run        │
  │  • gate (b): cross-agent │  │  phase-4b-review.sh <PR#>  │
  │    APPROVED OR same-agent│  │  from a TRUSTED main-ref   │
  │    + Codex thumbs-up     │  │  checkout, never the PR's  │
  │  • Codex cleared on HEAD │  │  own checkout.             │
  │    via COMMENTED-no-P0/1 │  │                            │
  │    OR 👍 reaction        │  │  exit 0 → APPROVED posted  │
  │                          │  │    by a non-author agent   │
  │  (NEVER expects APPROVED │  │    → merge gate → merge.   │
  │   state from Codex bot —  │  │  exit 1 → CHANGES_REQUESTED│
  │   the app does not emit  │  │    → fix, push, re-run.    │
  │   that state.)           │  │  exit 3/4/5 → LEG 2.       │
  └──────────┬───────────────┘  │                            │
             │                  │  LEG 2 (only if leg 1      │
             ▼                  │  declines): post handoff,  │
  ┌──────────────────────────┐  │  alert human. Human takes  │
  │  nathanjohnpayne merges  │  │  handoff to a different    │
  │  (--squash). Done.       │  │  agent CLI, relays feedback│
  └──────────────────────────┘  │  → APPROVED; issues filed. │
                                │  nathanjohnpayne merges.   │
                                └────────────────────────────┘
```

## Handoff Message Format

When external review is required, the originating agent posts a PR comment and surfaces the following to the human:

```
## External Review Required

**PR:** #{pr_number}—{pr_title}
**Branch:** {branch_name}
**Author Agent:** {originating_agent}

### Summary
{2–4 sentence summary of what changed and why}

### Focus Areas
- {specific area 1 the external reviewer should scrutinize}
- {specific area 2}
- {specific area 3, if applicable}

### Observations from Internal Review
- {any concerns, trade-offs, or risks flagged during self-review}

### Suggested External Reviewer
nathanpayne-{suggested_agent}

### Rationale for External Review
{why the threshold was triggered: line count, protected paths, or both}
```

The human uses this message to brief the external agent. The external agent does not need access to the internal review thread—the handoff message contains everything needed to begin.

## Post-Merge Issue Creation

When an external reviewer approves a PR but flags observations or risks, the merging agent creates a GitHub Issue for each item before or immediately after merging:

- **Title:** `[Post-Review] {brief description of observation/risk}`
- **Body:** Full context from the reviewer's comment, including the PR number and relevant code references
- **Assignee:** `nathanjohnpayne`
- **Labels:** `post-review`, `observation` or `risk` as appropriate

These issues are tracked like any other work item. They are not blockers to the merge—the external reviewer has approved—but they represent acknowledged technical debt or areas requiring follow-up.

## Disagreements and Tiebreaking

When the internal reviewer and external reviewer disagree on whether code is ready to merge, the human is the tiebreaker. The agent surfaces the disagreement clearly, summarizing both positions, and waits for the human's explicit decision before taking further action.

### Concrete detection signals (Phase 4a)

In Phase 4a, the agent escalates to the human when either of the following fires:

1. **Repeat-after-rebuttal.** The agent posted a reply to a Codex inline finding explaining why the finding does not apply. Codex's next review re-flags the same or substantively-equivalent finding. The agent treats this as a disagreement: Codex is not convinced by the rebuttal, and the agent stops trying to change Codex's mind autonomously. Continuing the loop past this point is rude to the reviewer and wastes API calls.

2. **Runaway rounds.** The round counter exceeds `codex.max_review_rounds` (default: 2). The 3rd `@codex review` request trips this guard. This catches cases where Codex keeps finding new, distinct issues on each pass without the review converging. Even if each individual finding is valid, three rounds of novel issues is a signal that the PR scope is too broad and a human should weigh in.

**Timeout is NOT a disagreement signal.** A Codex response timeout (`codex-review-request.sh` exit code `4` = `FALLBACK_REQUIRED`) routes the PR directly to Phase 4b per step 15a above. It is a fallback trigger, not a tiebreaker trigger. Phase 4b resolves it on its own—first via the automated orchestrator, then via the human-mediated handoff if the orchestrator declines—so there is nothing for the disagreement detector to add on top.

Phase 4b escalation (the traditional cross-agent CLI flow) uses the human's judgment directly—there is no automated detection loop to fire, so this subsection does not apply there.

### Escalation procedure

When either of the two signals above fires, the agent:

1. **Stops the automated loop immediately.** Does NOT push more commits, does NOT re-run `@codex review`, does NOT run the merge gate, does NOT merge.
2. **Posts a comment on the PR** summarizing:
   - Which signal fired and what triggered it
   - Both positions (the agent's and Codex's) in plain language, with links to the specific review rounds and the rebuttal replies
   - The current round counter and a link to the `scripts/codex-review-request.sh` output from the terminating round
3. **Alerts the human via chat** and waits for an explicit decision before taking any further action on the PR.

Note that timeout does NOT go through this escalation procedure. On a timeout (exit code `4` from `codex-review-request.sh`), the agent routes to [Phase 4b](#phase-4b-external-review-fallback) directly from step 15a—no in-place tiebreaker. Phase 4b starts at its automated leg (step A1); the handoff message per [Handoff Message Format](#handoff-message-format) is posted only if that leg declines.

The human resolves by one of:

- **Approving the existing state**—posting an `APPROVED` review as `nathanjohnpayne` or removing the `needs-external-review` label manually. This unblocks merge under the label-gate rules in [Review Policy Configuration](#review-policy-configuration).
- **Requesting additional changes**—typing the feedback directly in chat. The agent addresses it as normal edits. No `@codex review` loop, no round counter.
- **Taking the PR over manually**—the human merges on behalf of the agent, or closes and reopens with a different approach, or promotes the escalation to Phase 4b manually.

The agent never resolves a fired escalation signal on its own.

## Review Policy Configuration

Each repository contains a `.github/review-policy.yml` file that governs review behavior. This file is read by the agent at the start of every review cycle.

The following is an **illustrative example with default values**. Each repository's actual `.github/review-policy.yml` may have different `external_review_paths` customized to its directory structure. Always read the repo's actual file, not this example.

```yaml
# .github/review-policy.yml (example defaults—actual config may differ)

# Lines changed (additions + deletions, excluding generated/lockfiles) that trigger external review.
# Set to 0 to require external review on every PR.
# Set to a very high number to effectively disable.
external_review_threshold: 300

# Paths that always require external review regardless of line count.
# Glob patterns supported.
external_review_paths:
  - "src/auth/**"
  - "src/payments/**"
  - "**/*secret*"
  - "**/*credential*"
  - ".github/**"

# Registered reviewer identities. Add new agents here.
available_reviewers:
  - nathanpayne-claude
  - nathanpayne-cursor
  - nathanpayne-codex

# Default suggestion when the agent needs to recommend an external reviewer.
# The agent may override this suggestion based on context.
default_external_reviewer: nathanpayne-codex

# Author identity under which all agents commit and merge.
author_identity: nathanjohnpayne

# CodeRabbit (Phase 2.5 advisory automated review).
# Enabled on public repos only; advisory, does not block merge.
# NOTE: This flag governs AGENT behavior only (whether agents wait for
# CodeRabbit in Phase 2.5). It does NOT control whether the CodeRabbit
# GitHub App itself runs—the App runs based on its own install state.
# To fully disable CodeRabbit, uninstall the GitHub App AND set this flag.
coderabbit:
  enabled: false

# Codex (Phase 4a automated external review)—see Phase 4a above.
# Same semantics note as coderabbit: this flag governs agent behavior,
# not app runtime. The ChatGPT Codex Connector App runs based on its
# per-repo install state and its "Automatic reviews" setting.
codex:
  enabled: true
  bot_login: "chatgpt-codex-connector[bot]"   # REST API form, with [bot] suffix
  cli_login: nathanpayne-codex                # external reviewer identity for Phase 4b
  max_review_rounds: 2                        # runaway guard; 3rd round escalates
  review_timeout_seconds: 600                 # per-round poll timeout
  require_ci_green: true                      # merge gate
```

> **Note on `enabled` flags (both `coderabbit` and `codex`).** These flags govern **agent behavior only**—whether the authoring agent waits for the corresponding review in its phase. They do NOT control whether the underlying GitHub App runs. Both apps run based on their own install state on GitHub, independent of what this YAML says. Setting `enabled: false` alone will cause the agent to skip the corresponding phase while the app continues to post reviews silently in the background. This may be desired as a "dark launch," but can confuse readers who expect the flag to mean "off." To fully disable an integration, uninstall the GitHub App AND set the flag to false.

### Threshold Evaluation

A PR requires external review if **either** condition is true:

1. Total non-generated lines changed (additions + deletions) ≥ `external_review_threshold`. Lockfiles (`*.lock`, `*lock.json`), minified files (`*.min.js`, `*.min.css`), and generated files (`*.generated.*`) are excluded from the count.
2. Any file in the PR diff matches a pattern in `external_review_paths`

The agent evaluates this after internal review passes, before merging. CI workflows may also evaluate and label earlier as an advisory (see Phase 3 note above).

## Git Identity Switching

Agents must automate identity switching so that commits and PR activity are attributed to the correct GitHub account. The mechanism depends on the agent's environment, but the result must be:

- Commits during authoring use `nathanjohnpayne`'s name and email.
- Review comments and PR reviews are posted via `nathanpayne-{agent}`'s GitHub credentials.
- The switch is fully automated within the agent session—no human intervention required for internal review.

### Git commit identity (user.name / user.email)

```bash
# Switch to author identity
git config user.name "nathanjohnpayne"
git config user.email "nathan@nathanjohnpayne.example"

# Switch to reviewer identity
git config user.name "nathanpayne-claude"
git config user.email "claude@nathanpayne-claude.example"
```

### SSH identity switching (push / pull)

All repos use SSH remotes (`git@github.com:nathanjohnpayne/...`). SSH keys are managed by 1Password and served through its SSH agent. `~/.ssh/config` maps host aliases to specific keys:

| SSH Host | GitHub Account | Key (1Password) |
|----------|----------------|-----------------|
| `github.com` | nathanjohnpayne | GitHub (nathanjohnpayne) |
| `github-claude` | nathanpayne-claude | GitHub Claude |
| `github-cursor` | nathanpayne-cursor | GitHub Cursor |
| `github-codex` | nathanpayne-codex | GitHub Codex |

The public key files (`~/.ssh/id_nathanjohnpayne.pub`, etc.) tell the 1Password agent which private key to sign with. `IdentitiesOnly yes` prevents SSH from trying all keys.

To push/pull as the default author identity (`nathanjohnpayne`), no change is needed—the `github.com` host is the default.

> **If preflight was run:** SSH keys for both the author and reviewer identities were pre-warmed during Phase 0. The `git push` / `git pull` commands below will not trigger additional biometric prompts.

To push/pull as a reviewer identity, temporarily switch the remote:

```bash
# Switch remote to reviewer identity
git remote set-url origin git@github-claude:nathanjohnpayne/repo-name.git

# ... do review work, push review branch ...

# Switch back to author identity
git remote set-url origin git@github.com:nathanjohnpayne/repo-name.git
```

### GitHub API authentication (gh CLI)

For posting PR reviews and comments under a reviewer identity, use `gh` with an
explicit PAT from 1Password. Do not rely on the GitHub connector session or on
the ambient `gh` login. Refer to the [PAT lookup table](#pat-lookup-table) for
your agent's 1Password item ID.

```bash
# ── Preferred: use preflight-cached PATs (no biometric prompts) ──

# As reviewer (after running op-preflight.sh):
GH_TOKEN="$OP_PREFLIGHT_REVIEWER_PAT" gh api user --jq '.login'
# expected: nathanpayne-claude

GH_TOKEN="$OP_PREFLIGHT_REVIEWER_PAT" \
  gh pr review <PR#> --repo <owner/repo> --approve --body "Review comment"

# As author (merge, address comments, etc.):
GH_TOKEN="$OP_PREFLIGHT_AUTHOR_PAT" gh pr merge <PR#> --merge

# ── Fallback: inline op read (triggers biometric if session expired) ──

GH_TOKEN="$(op read 'op://Private/pvbq24vl2h6gl7yjclxy2hbote/token')" \
  gh pr review <PR#> --repo <owner/repo> --approve --body "Review comment"
```

- Use the item ID from the [PAT lookup table](#pat-lookup-table) for your agent identity. Do not use the 1Password item title.
- If `gh auth status` shows `nathanjohnpayne`, that is fine.
  `GH_TOKEN=...` overrides the ambient login for that command.
- If `op whoami` says you are not signed in, still run the `op read ...`
  command in an interactive TTY. That is what triggers the 1Password biometric
  prompt on local machines.
- If GitHub returns `Review Can not approve your own pull request`, the wrong
  reviewer identity is still being used. Check the [PAT lookup table](#pat-lookup-table)
  and verify you are using your agent's item ID, not the author identity's.

> **If `op read` fails with a sign-in or biometric error here**, follow the pause-and-prompt procedure in `docs/agents/operating-rules.md` under "1Password CLI authentication failures." Do not hardcode tokens, skip review, or retry in a loop.

### PAT requirements for reviewer identities

Reviewer accounts are **collaborators** on repos owned by `nathanjohnpayne`. This constrains the PAT type:

- **Classic PATs with `repo` scope**—required for collaborator accounts. Fine-grained PATs on personal (non-org) GitHub accounts only cover repos the account *owns*. The "All repositories" scope means all owned repos (zero for collaborators), and "Only select repositories" does not list collaborator repos.
- Store each PAT in 1Password as `GitHub PAT (pr-review-{agent})` with a concealed field named `token`.
- Access via item ID to avoid shell escaping issues with parentheses in the title. See the [PAT lookup table](#pat-lookup-table) for all current item IDs.

### 1Password SSH agent setup (one-time)

If `~/.ssh/config` does not exist or is missing the host aliases above:

```bash
# 1. Export public keys from the 1Password SSH agent
export SSH_AUTH_SOCK="$HOME/Library/Group Containers/2BUA8C4S2C.com.1password/t/agent.sock"
ssh-add -L | grep "nathanjohnpayne" > ~/.ssh/id_nathanjohnpayne.pub
ssh-add -L | grep "Claude"          > ~/.ssh/id_nathanpayne_claude.pub
ssh-add -L | grep "Cursor"          > ~/.ssh/id_nathanpayne_cursor.pub
ssh-add -L | grep "Codex"           > ~/.ssh/id_nathanpayne_codex.pub

# 2. Create ~/.ssh/config (see the host alias table above for the full file)
# 3. chmod 600 ~/.ssh/config

# 4. Verify
ssh -T git@github.com          # → Hi nathanjohnpayne!
ssh -T git@github-claude        # → Hi nathanpayne-claude!
```

### Switching all repos to SSH remotes

```bash
for repo in mergepath swipewatch nathanpaynedotcom \
            device-platform-reporting device-source-of-truth \
            overridebroadway friends-and-family-billing docs; do
  cd ~/Documents/GitHub/$repo
  CURRENT=$(git remote get-url origin)
  if [[ "$CURRENT" == https* ]]; then
    SLUG=$(echo "$CURRENT" | sed 's|https://github.com/||;s|\.git$||')
    git remote set-url origin "git@github.com:${SLUG}.git"
    echo "$repo: https → ssh"
  else
    echo "$repo: already ssh"
  fi
done
```

## Adding a New Agent

1. Create a GitHub account: `nathanpayne-{agent}`
2. Add it as a collaborator with Write access on each relevant repo.
3. Accept the invitation (browser or classic PAT—fine-grained PATs cannot accept invites).
4. Generate a **classic** PAT with `repo` scope for the new account.
5. Store the PAT in 1Password as `GitHub PAT (pr-review-{agent})`, field name `token`.
6. Create an SSH key in 1Password named `GitHub {Agent}`. Add the public key to the new GitHub account under Settings → SSH and GPG keys.
7. Export the public key: `ssh-add -L | grep "{Agent}" > ~/.ssh/id_nathanpayne_{agent}.pub`
8. Add a `Host github-{agent}` block to `~/.ssh/config` pointing at the new public key file.
9. Add the identity to `available_reviewers` in each relevant repo's `.github/review-policy.yml`.
10. Add the PAT as a repository secret (e.g., `{AGENT}_PAT`) for CI workflows.
11. Configure the new agent's environment with both the `nathanjohnpayne` author credentials and the `nathanpayne-{agent}` reviewer credentials.
12. The new agent follows the same workflow described above.

## Template Usage

This policy and the accompanying `review-policy.yml` should be included in every new repository created under `nathanjohnpayne`. To bootstrap a new repo:

1. Copy `.github/review-policy.yml` into the new repo's `.github/` directory.
2. Copy this document into the repo as `REVIEW_POLICY.md` (or the location specified by your project template).
3. Copy the governance files from the template:
   - `.github/dependabot.yml`—Dependabot version update schedule
   - `.github/CODEOWNERS`—code ownership routing
   - `SECURITY.md`—vulnerability reporting policy (update the repo name in the advisory URL)
4. Adjust `external_review_threshold`, `external_review_paths`, and `default_external_reviewer` to fit the project.
5. Ensure all agent environments have credentials configured for the repo.
6. If the repo is public, enable secret scanning and push protection via GitHub settings (or API).
7. If the repo is public and using CodeRabbit, set `coderabbit.enabled: true` in `.github/review-policy.yml` and install the CodeRabbit GitHub App on the repo.
8. The `.coderabbit.yml` file at the repo root ships with the template and works out of the box. Customize `reviews.path_instructions` to add repo-specific review guidance (e.g., flag currency rounding in billing code, verify type compatibility in shared packages).

### CodeRabbit Removal

To reverse the CodeRabbit integration (e.g., if the trial ends):

1. Uninstall the CodeRabbit GitHub App from the `nathanjohnpayne` GitHub account.
2. In each repo where CodeRabbit was enabled: set `coderabbit.enabled: false` in `.github/review-policy.yml` and delete `.coderabbit.yml`.
3. No documentation changes are needed—all agent instructions use conditional language (`"if coderabbit.enabled: true"`) and will skip Phase 2.5 automatically.
4. Optionally remove `.coderabbit.yml` from the template if CodeRabbit will not be used for future repos.
