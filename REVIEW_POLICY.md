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
| Codex | `nathanpayne-codex` | `etak327mpz4drd4byxszfex4vm` | `op://Private/etak327mpz4drd4byxszfex4vm/token` |
| Human | `nathanjohnpayne` | `sm5kopwk6t6p3xmu2igesndzhe` | `op://Private/sm5kopwk6t6p3xmu2igesndzhe/token` |
| CI (not a reviewer) | `nathanpayne-robot` | `o6ekjxjjl5gq6rmcneomrjahpu` | `op://Private/o6ekjxjjl5gq6rmcneomrjahpu/token` |

> **A 1Password item ID is not a stable identity.** On 2026-08-21 the item `o6ekjxjjl5gq6rmcneomrjahpu` was repurposed from Codex to the `nathanpayne-robot` CI account and Codex was recreated at `etak327mpz4drd4byxszfex4vm`; every row above still pointed at the old ID, so `--agent codex` silently resolved a **robot** token and posted reviews under the CI byline. Nothing in the table catches that on its own—after any PAT rotation or item edit, re-verify each row by resolving **that row's** `op://` reference into `GH_TOKEN` and checking it: `GH_TOKEN="$(op read 'op://Private/<item-id>/token')" scripts/identity-check.sh --expect-token-identity <login>`. The bare `scripts/identity-check.sh --expect-token-identity <login>` form does **not** verify a table row: it checks whatever is already in `$GH_TOKEN`. **Origin:** the robot PAT was created that day by repurposing the existing Codex 1Password item rather than minting a fresh one, so the id every doc and lookup already named silently changed identity while nothing referencing it changed—create a new item for a new identity. The map correction (mergepath#1073) landed on the hub the same day but had not reached the consumers when a Codex session hit it ~5.5h later, so treat a canonical-manifest fix as unshipped until it reaches the consumers.

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
3. The agent files a PR from the feature branch to the target branch under `nathanjohnpayne`. For local agent sessions, the supported creation path is `scripts/gh-as-author.sh -- gh pr create ...`; the wrapper validates the description from `--body` or `--body-file` before writing. The PR description must include an `Authoring-Agent:` line identifying which agent wrote the code (e.g., `Authoring-Agent: claude`) and a `## Self-Review` section. This is required because all PRs share the `nathanjohnpayne` author identity, and the workflow uses this line to assign the correct reviewer identity for internal self-peer review. API-backed integrations that cannot invoke the wrapper must provide the same fields. The required `PR Review Policy / Self-Review Required` check validates the live body on PR open, edit, and synchronization, so REST, GraphQL, UI, and guarded CLI creation converge on the same contract before merge.

### Phase 2: Internal Review (Self-Peer Review)

4. The agent switches its Git identity to its reviewer account (e.g., `nathanpayne-claude`).
5. The reviewer identity checks out the PR branch, reviews the diff, and posts review comments on the PR with specific, actionable feedback.
6. The agent switches back to `nathanjohnpayne` and addresses each comment—pushing fix commits to the same branch.
7. Steps 4–6 repeat until the reviewer identity approves the PR with no outstanding issues. The mechanism of "approves" is scope-dependent: for under-threshold PRs (Phase 3 below), the reviewer identity posts `gh pr review --approve` to satisfy branch protection's required-approving-review check. For above-threshold PRs (Phase 4), the reviewer identity posts `gh pr review --comment` only; the cross-agent merge gate is carried by Phase 4. See [No-self-approve scoping](#no-self-approve-scoping) above.

**All review rounds are captured as GitHub PR comments and commits.** The back-and-forth should read like two developers collaborating.

### Phase 2.5: Automated External Review (CodeRabbit)

> **Phase 2.5 is non-blocking (#2166).** The agent does not wait for CodeRabbit before proceeding to Phase 3. The required severity gate is arrival-independent—it holds only once a completed CodeRabbit run exists on the head and reads green before one does—so the wait is not removed, it is moved: CodeRabbit's arrival on the merge head is checked once, at the pre-merge step (see [Pre-Merge Review Conversation Gate](#pre-merge-review-conversation-gate)), by running `scripts/coderabbit-wait.sh <PR#>`. That check runs after CI, and the required `lint` run (25 to 30 minutes) outlasts CodeRabbit's measured p99 (about 19 minutes), so it normally returns at once; what the change removes is the wait *before* Phase 3, which held every round's Codex request for up to `coderabbit.max_wait_seconds` plus `post_clearance_max_wait_seconds`. The required `CodeRabbit unresolved blocking findings` check then enforces every p0/p1 finding on that head, and the pre-merge conversation and accounting gates block merge until every finding is dispositioned. The disposition steps below apply to findings as they arrive. `coderabbit.wait_for_review: true` restores the blocking wait for a repo that wants it; `scripts/coderabbit-should-invoke.sh` reports the resolved value as `wait`.
>
> **Applies only when `scripts/coderabbit-should-invoke.sh <PR#>` exits 0.** That script is the decision procedure for whether Phase 2.5 runs at all (#1084): it honours `coderabbit.enabled` and the `coderabbit.invoke` mode—`always`, `complex-changes` (defer to the Phase 4b trigger classifier), or `never`. An absent `invoke` key means `always`, so a repo that has not adopted the knob behaves exactly as before.
>
> The script fails toward **invoking**, deliberately and asymmetrically: an unreadable config, an unrecognized mode, or a missing/failing classifier all resolve to invoke, because a wrong skip silently drops a review round while a wrong invoke only costs wall-clock. Only an explicit, well-formed instruction may suppress a reviewer. The `wait` field is the one exception, in the other direction: an unrecognized or ambiguous `wait_for_review` resolves to waiting, the slower and older behaviour, never to a faster one.
>
> **What this does not do.** It gates Phase 2.5—the agent's disposition pass—not the App's review. `.coderabbit.yml` sets `auto_review.enabled: true`, so the App starts on PR open regardless. Skipping saves the agent's disposition pass (and the wait, where enabled); it does **not** reduce provider invocations or rate-limit pressure, and findings the App posts afterwards remain unresolved conversations that the pre-merge gate blocks on, so a skipped PR can still need thread triage. Reducing invocations requires an App-side opt-out and is not attempted here.
>
> Reusing the Phase 4b classifier rather than defining a second notion of "complex" is intentional—that taxonomy is already this repo's definition of a change warranting more eyes, and a second threshold would drift from it.

> **Config posture & runbook:** the `.coderabbit.yml` posture audit (why we run `profile: chill`, the `base_branches`/`learnings.scope`/`auto_pause_after_reviewed_commits` decisions), the `@coderabbitai rate limit` diagnostic, and the author-seat coverage procedure live in mergepath's [`docs/agents/coderabbit-audit.md`](https://github.com/nathanjohnpayne/mergepath/blob/main/docs/agents/coderabbit-audit.md) (#491). Consult it before changing `.coderabbit.yml` or debugging a "CodeRabbit never ran" case. That audit is hub-only—it records the template repo's own posture and the fleet-wide seat-coverage sweep—so the link is absolute and stays resolvable from a consumer repo, which does not carry the file.

After internal review passes (Phase 2), CodeRabbit provides an independent automated review:

**Successful review-trigger acknowledgements in polling (#1386).** Polling selection treats a supported provider-owned `Actions performed` / `Review triggered` acknowledgement (including `Full review triggered`) as a new run in progress. It retains the newest acknowledgement above older clean or benign publications; a newer substantive publication is selected normally. The next older substantive pause or rate-limit notice still wins, preserving its recovery and exit routing. Ordinary polling, StatusContext arbitration, and the post-probe terminal upgrade consume that classification. Anchor-free refusal/window selectors skip structurally recognized successful acknowledgements as narration; only polling assigns them `in_progress`. Existing exact-head review and `--probe` contracts remain unchanged, and an acknowledgement supplies no review evidence. Quoted/fenced lookalikes remain content; an unreadable acknowledgement cannot clear the head.

1. **Do not wait for CodeRabbit before Phase 3; confirm its arrival before merge (#2166).** CodeRabbit automatically posts a review when the PR is opened or updated, on its own schedule; the agent proceeds to Phase 3 as soon as internal review passes and dispositions CodeRabbit's findings when they arrive. `scripts/coderabbit-wait.sh <PR#>` runs once per merge head, at the pre-merge step, to close the pre-review merge race (#136): the severity gate cannot block on a finding that has not been posted. It is also the diagnostic (`--probe`, or a bounded wait on a PR stalled in a CodeRabbit state—paused, rate-limited, draft, non-base-branch) and owns the rate-limit failover path below. `coderabbit.wait_for_review: true` additionally restores the blocking wait before Phase 3 for a repo that wants it. Whenever the helper runs, the following contract applies. Prefer it over an ad-hoc poll loop—the script anchors its "cleared" signal on the current HEAD, so it will not treat a stale review from a prior HEAD as current. Freshness resolves in three rungs: an exact SHA match wins over mutable-summary demotion and the HEAD-committer-date floor—a review whose commit is the current `HEAD_SHA` counts regardless of its timestamp, including when the HEAD committer date is in the future (#824)—and the HEAD-committer-date floor applies only to a review carrying no matching SHA. Treating the floor as the sole test would discard a legitimate current-HEAD review and wait needlessly. Beneath those sits the third rung (#968): a summary whose own commits range names a commit that is not the current HEAD is a verdict about that other commit and never clears this head, however recently CodeRabbit edited it—the bot rewrites that comment in place for reasons unrelated to reviewing the new head, and an edit bumps `updated_at` without a re-review, which the floor alone reads as currency. A body naming no SHA at all still falls to the floor for freshness, subject to the fallback status veto below (#940). The rungs are ORDERED, and the third yields to the first (#1003/#1022): a CodeRabbit review **object** pinned to the current HEAD by `commit_id` and carrying a clean report body satisfies the exact-SHA rung outright, and the mutable summary's commits range does not demote that head. Evaluating the demotion unconditionally inverted the published order and stalled a demonstrably-reviewed head to the advisory `exit 4`. The evidence is the #900 review-RUN selector rather than a bare `commit_id` match, so the body-LESS review object GitHub wraps around a single inline reply (CodeRabbit's `🐇 ✅` acknowledgement of a `[mergepath-resolve:…]` tag reply) never satisfies it (#919); neither does an unreadable reviews list, nor a run the finding counter never graded. The counter and rung share the body-bearing head-run selector (#1037), so a later body-less acknowledgement cannot replace the counted run. The rung is satisfied only when it credits that same run; if the existing comparison observes a different run, polling retries within its current budget and the post-probe terminal upgrade keeps its timeout instead of clearing from the superseded count. The demotion reads only the marker-selected summary's OWN commits range (#1023)—a range quoted by any other comment is not CodeRabbit's head claim and never vetoes a current-head summary. Fallback clearance also refuses a complete `final_review_risk_start`/`final_review_risk_end` block in that selected summary whose `up to` hex prefix names another commit (#1034). This is negative evidence only: matching, absent or unparseable risk claims preserve existing behavior, and a risk prefix never establishes completion or replaces the exact clean counted-run override. Status fast paths and finding escalation are unchanged. Fallback summary clearance also honors the configured per-SHA status (#940): after findings and clean counted-run evidence, a completed marker-selected summary naming this head retains the #851 content escape; otherwise trusted `pending` or `success` with a nonempty non-completion description holds polling and its post-probe terminal upgrade. Missing status and empty descriptions remain allowed, and trust=false adds no status read. Ordinary `--probe` keeps its existing #919 pending behavior. The script also handles CodeRabbit's rate-limit state, which the platform does NOT auto-retry (see nathanjohnpayne/mergepath#138), and CodeRabbit's auto-pause state (see nathanjohnpayne/mergepath#490). On exit code `0` CodeRabbit has cleared with no high-severity markers; on `2` it has findings to address; on `4` the `coderabbit.max_wait_seconds` grace window elapsed (the agent may log a warning and proceed since CodeRabbit is advisory); on `5` CodeRabbit refused the head and the helper immediately attempted Codex substitution, without sleeping or retrying CodeRabbit: `disposition: proceed_on_codex_clearance` requires exact-head Codex clearance before an under-threshold approval or the normal Phase 4 path, while `disposition: human_attention_required` requires a human alert because Codex was unavailable; on `6` CodeRabbit auto-review is skipped and not (re-)invocable—see the auto-pause / skip paragraph below. If exit `4` occurs and `coderabbit.status_probe_enabled` is true, the helper has posted `@coderabbitai, how is the review going?`, waited the bounded `coderabbit.status_probe_wait_seconds` window, and surfaced CodeRabbit's narrative reply in the output JSON's `status_probe` field. That reply is narration only; it is never counted as a review or clearance signal. A later or same-second trusted same-SHA rate-limit refusal supersedes an older clean run. Refresh trusted status after selecting review evidence at the polling and terminal clearance boundaries; only a clean run strictly newer than the refusal, or a completed summary created strictly after it, can retain clearance. An in-place summary edit does not prove a new review.

   **Auto-pause and other skips (exit `6`, #490).** CodeRabbit auto-pauses incremental review after `reviews.auto_review.auto_pause_after_reviewed_commits` reviewed commits (we set this deliberately in `.coderabbit.yml`; the upstream default is 5) and posts a durable "Reviews paused" NOTE that it does NOT auto-resume. Our long agent-loop PRs cross that threshold, so the helper detects the pause via the stable `review paused by coderabbit.ai` marker, posts **`@coderabbitai resume`** (a one-shot `@coderabbitai review` would re-pause after the next push), and resumes polling — bounded by `coderabbit.max_resume_retries`. The `paused` state is distinct from `rate_limit` (#489) and `in_progress`. If resume retries are exhausted, the helper exits `6` with `status: "paused"` and `skip_reason: "paused"`; raise `auto_pause_after_reviewed_commits` or intervene. The helper also surfaces — without re-invoking — the static skips where auto-review will never fire: a PR whose base branch is not in `reviews.auto_review.base_branches` (`skip_reason: "non-base-branch"`) and a draft PR when `drafts: false` (`skip_reason: "draft"`). All exit-`6` cases set the JSON `skip_reason` field so the caller can act (retarget the base, mark the PR ready, or escalate) rather than waiting out a full timeout.

   **Rate-limit → Codex failover (exit `5`, #489, #2139).** On a published refusal or trusted current-head `Review rate limited` status, immediately request Codex through `scripts/codex-review-request.sh --trigger-only`; never sleep out the CodeRabbit window or post a CodeRabbit retry. The helper remains HEAD-pinned, author-attributed and subject to the governing request/blocking budgets. Trigger-only deduplication accepts a fresh configured-author comment only when its complete body is `@codex review`, matched case-insensitively; prose or quoted containment does not suppress a genuine request. A successful or deduplicated request emits `codex_failover_requested: true` and `disposition: proceed_on_codex_clearance`. This is a request, not clearance. For an under-threshold PR, await the requester response and run the existing full `scripts/codex-review-check.sh --require-codex-on-head <PR#> <repo>`: it requires a completed exact-head review with no unaddressed required findings or an affirmative exact-head verdict; an unanchored reaction or stale-head response does not count. This pre-approval probe omits `CODEX_REVIEW_CHECK_REQUIRE_APPROVAL_ON_HEAD`; the automation caller combines that existing mode with `--require-codex-on-head` to require an audited approval submitted strictly after the Codex clearance. Then the reviewer identity may approve, recording `CodeRabbit rate-limited; cleared by Codex on <full-sha>.` If the pre-merge waiter discovers the refusal after an earlier step-4 approval, post a new exact-head approval with that audit body after Codex clears; the earlier approval cannot carry the substitution. Phase 4a continues its usual loop; Phase 4b follows #2120's independent adapter path without waiting for CodeRabbit. Findings from either provider still require normal accounting and conversation resolution. When the helper cannot request Codex (disabled, opted out, capped, blocked or unreadable), it emits `codex_failover_requested: false` and `disposition: human_attention_required`; alert the human. A response timeout likewise requires attention or the existing policy-authorized Phase 4b fallback. Only when Codex is unavailable too may the human choose to wait. The approval-triggered readiness job continues to rely on its dedicated required checks rather than invoking this agent-driven waiter.

   **Content-free heads (exit `5` failover only, #798).** In the auto-merge workflow the failover's trigger carries one further gate, because that step is the only automatic Codex request caller in the repo and `required_status_checks.strict: true` makes every merge force a `gh pr update-branch` on every other open PR—a new head SHA that changes no file in the PR's own diff, on which the failover re-requested a full Codex review. With `Codex P1 unresolved threads` required, a batch of N concurrent PRs cost O(N²) rounds that answered no code change. `agent-review.yml` therefore sets `MERGEPATH_CODEX_AUTO_TRIGGER=true` on that step, which makes `scripts/codex-review-request.sh` consult `scripts/workflow/codex_auto_trigger_gate.sh`. That gate does not decide "unchanged" itself: it delegates the whole question to `scripts/workflow/external_review_carryforward.sh`—the #705 helper `codex-review-check.sh` already uses to carry a prior Codex verdict across an `update-branch`, over the existing `external-review:v2` fingerprint—and skips the post if and only if that helper reports `carried: true`. Delegating rather than re-deriving the predicate is load-bearing: the suppression condition is then by construction the condition under which gate (c) clears this head, so the two cannot drift. A broader test would strand the head—a prior `COMMENTED` findings round proves Codex *looked* at the content but carries no clearance, so suppressing on it leaves a head with no head-anchored signal, no carry-forward, and no automatic caller left to re-request the review. Suppression requires the positive `carried: true`; a missing or non-executable helper, a nonzero exit, unparseable output, or any `carried: false` posts the trigger. The flag is set by CI and nothing else, so an agent's own `scripts/codex-review-request.sh <PR#> --trigger-only` is never suppressed and the #631/#648 explicit-invocation requirement is untouched—as is any push that changes PR content, which changes the fingerprint.
2. **Read both API endpoints.** CodeRabbit posts two types of comments that must both be checked:
   - **PR-level summary:** `gh api repos/{owner}/{repo}/issues/{pr_number}/comments`—contains the high-level walkthrough and summary.
   - **Inline review comments on the diff:** `gh api repos/{owner}/{repo}/pulls/{pr_number}/comments`—contains line-by-line findings anchored to specific code.
3. **Classify the inline findings with the shared ladder, not a text grep.** Before proceeding, grade each CodeRabbit inline review comment with `coderabbit_tier_of` (`scripts/lib/feedback-policy-helpers.sh`) and treat everything it grades `p0`/`p1` as a blocking finding. Do **not** key on the literal strings `Potential issue` / `⚠️`: CodeRabbit's current finding format can be blocking while containing neither—a Major renders as the severity-badge prefix `_🔒 Security & Privacy_ | _🟠 Major_ | _⚡ Quick win_` and carries the machine tag `cr-indicator-types:potential_issue`, so a literal grep silently returned zero and `coderabbit-wait.sh` reported `cleared` on a blocking finding (observed live on #835; fixed in #837). `scripts/coderabbit-wait.sh` and `scripts/coderabbit-severity-gate.sh` both count by that same ladder, so an ad-hoc grep can miss exactly what the gates report. Every blocking finding must be explicitly addressed (fixed or dismissed with reasoning). When `feedback_policy` marks additional CodeRabbit tiers `required` (e.g. `p2` / `nitpick`, or `mode: address-all`), disposition those too—map each finding onto the shared ladder per [§ Feedback Disposition Policy](#feedback-disposition-policy). The tier-aware CodeRabbit gate that *enforces* this at merge time shipped in #577 (`scripts/coderabbit-severity-gate.sh`, merged in #590); this step remains the agent-discipline complement that reviews and dispositions the findings the gate checks for.
4. The agent addresses substantive CodeRabbit findings—fixing issues or posting a reply explaining why a finding is not applicable.
5. The agent is not required to fix every CodeRabbit comment. Use judgment: fix genuine issues, dismiss false positives with a brief explanation. However, every finding the shared `coderabbit_tier_of` ladder grades `p0`/`p1`—`🟠 Major` and the `cr-indicator-types:potential_issue` machine tag included, not just a literal `Potential issue` / `⚠️`—requires an explicit response.
6. **Record the feedback disposition (#584).** After adjudicating each CodeRabbit finding (step 4), record a per-finding verdict via `scripts/coderabbit-record-feedback.sh <PR#> [--scan | --findings-json <FILE|->] --verdict <comment_id>=<verdict>[:<reason>]`:

   - **Validated as real and actioned (fixed)** → `--verdict <id>=fixed` (disposition `fixed`).
   - **Determined to be a false positive / rebutted** → `--verdict <id>=false-positive[:<reason>]` (disposition `rebutted`).
   - **Accepted but deferred** → `--verdict <id>=deferred:<follow-up reason>` (aliases `tracked`, `split`, `deferred-to-followup`; disposition `deferred-to-followup`). Legacy `real`/`useful`/`+1` aliases retain their fixed meaning. Use the matching `--auto-resolve-bots --rationale` path for a permitted deferral; a deferred ledger row is not evidence of a fix or rebuttal.

   This is the CodeRabbit counterpart of the Codex step 13a-bis recorder, with **one by-nature asymmetry**: Codex ends each finding with *"Useful? React with 👍 / 👎."*, so `scripts/codex-record-feedback.sh` POSTs the solicited reaction. CodeRabbit does **not** solicit per-finding reactions, so `scripts/coderabbit-record-feedback.sh` is **disposition-logging only**—it NEVER posts a reaction (or any other write) to GitHub; every GitHub call it makes is a read (REST GETs plus the read-only GraphQL `reviewThreads` query for the `resolved` bit). The helper:

   - Classifies each finding with the shared `coderabbit_tier_of` (the same classifier `scripts/coderabbit-severity-gate.sh` keys on), so the ledger tier vocabulary cannot drift.
   - Is **HEAD-pinned**: `--scan` collects only the current HEAD's CodeRabbit inline findings (bot-authored AND `commit_id`/`original_commit_id` == HEAD—the same current-finding scope the severity gate gates on). Findings supplied via `--findings-json` inherit the producer's scoping.
   - Is **idempotent / append-only**: re-recording a comment with the same disposition is a no-op; a different disposition appends a superseding row flagged `superseded_prior: true` without rewriting prior rows.
   - Writes a **durable per-finding verdict** (comment_id, tier, verdict, disposition, optional reason, resolved bit) to a JSONL ledger (`.mergepath/coderabbit-feedback-ledger.jsonl` by default) so CodeRabbit review precision is trackable over time, symmetric with the Codex ledger from #487.

   This step is disposition-tracking, not a merge gate—CodeRabbit remains advisory. It records the same fix, rebuttal or permitted-deferral decisions the agent already made in step 4; skipping it leaves the CodeRabbit ledger empty but does not block the merge.
7. CodeRabbit review is advisory. It does not block merge via CI and does not submit a "Changes Requested" review state.

CodeRabbit's advisory status does **not** override GitHub branch protection's `required_conversation_resolution` gate. A CodeRabbit comment may be left unfixed only when it is not an unresolved GitHub review conversation, or when the agent has posted an explicit rationale and used the allowed bot-thread resolution path in the [Pre-Merge Review Conversation Gate](#pre-merge-review-conversation-gate).

**CodeRabbit runs on ALL PRs** in enabled repos, regardless of size or whether the external review threshold is met. It provides a consistent automated second opinion on every change.

The agent proceeds to Phase 3 (Threshold Check) without waiting for CodeRabbit (#2166). Findings that have arrived are addressed as part of the normal disposition loop (ideally in the same batch as the Codex findings of the round, so one push answers both). Completeness is enforced before merge: the CodeRabbit arrival check on the merge head, then the required severity check, the conversation-resolution gate and feedback accounting. CodeRabbit is an additional review layer, not a replacement for the existing threshold-based external agent handoff or the pre-merge conversation-resolution gate.

#### CodeRabbit Review Checklist

Phase 2.5 is non-blocking (#2166): nothing here holds the agent before Phase 3 (unless `coderabbit.wait_for_review` is `true`; `scripts/coderabbit-should-invoke.sh <PR#> --json` reports the resolved `wait`). Confirm all of the following before merge:

- [ ] CodeRabbit has reported on the merge head: `scripts/coderabbit-wait.sh <PR#>` run at the pre-merge step exited `0` or `2` (`4` is a grace-window timeout that may be logged and skipped since CodeRabbit is advisory). It runs after CI and normally returns at once
- [ ] If `scripts/coderabbit-wait.sh` exited `5` (rate-limit stalled) **with `codex_failover_requested: false`**, the human has been alerted rather than the agent proceeding (an exit `5` with `codex_failover_requested: true` is a non-blocking note—the Codex failover engaged; under-threshold approval awaits exact-head Codex clearance, and Phase 4 follows its normal path, #2139)
- [ ] If `scripts/coderabbit-wait.sh` exited `6` (auto-review skipped—`skip_reason` is `paused` / `non-base-branch` / `draft`), the named cause has been resolved (raise `auto_pause_after_reviewed_commits` or wait out the bounded resume retries for `paused`; retarget the base for `non-base-branch`; mark the PR ready for `draft`) rather than the agent treating it as a clean clearance
- [ ] Read PR-level comments via the `issues/{pr}/comments` endpoint, **with `--paginate`** (`gh api --paginate repos/{owner}/{repo}/issues/{pr}/comments`)
- [ ] Read inline diff comments via the `pulls/{pr}/comments` endpoint, **with `--paginate`** (`gh api --paginate repos/{owner}/{repo}/pulls/{pr}/comments`)—an unpaginated read returns only the first page, so every "have I handled everything?" question gets answered against a partial finding list and the gap looks smaller than it is (#990). The helper scripts already paginate internally; this is for the ad-hoc reads an agent runs alongside them
- [ ] Graded inline comments with the shared `coderabbit_tier_of` ladder (not a literal `Potential issue` / `⚠️` grep)—every `p0`/`p1` finding addressed
- [ ] Substantive findings fixed or dismissed with reasoning
- [ ] Recorded each finding's disposition (fixed / rebutted / permitted deferral) via `scripts/coderabbit-record-feedback.sh` (disposition-logging only—no reaction posted; #584)

Trusted per-head CodeRabbit status selection uses numeric status IDs, including the polling clearance refresh: a later refusal supersedes an older completion with the same whole-second timestamp. Unusable trusted ordering evidence fails closed (#2360).

### Phase 3: External Review Threshold Check

> **Note on automation timing:** CI workflows may apply the `needs-external-review` label automatically when a PR is opened or updated, as an early advisory based on line count and protected paths. The label blocks merge via the label-gate until external review clears. When the label is present, the agent's responsibility after internal review passes is to proceed to [Phase 4](#phase-4-external-review)—which routes the PR to Phase 4a (automated via the Codex GitHub App) or Phase 4b (manual handoff) depending on `codex.enabled` and on whether 4a converges. The label itself does NOT imply immediate human mediation; Phase 4b only posts the handoff message when the fallback path is actually taken. On `synchronize`, the labelers compute an external-review fingerprint across every changed file once external review is required, including both the head-side and merge-base-side tree entries for those files. If a prior affirmative Codex verdict reviewed the same fingerprint, a pure base-only sync or update-branch merge does not re-add `needs-external-review` or request a redundant Codex pass; any real content or reviewed-diff change produces a different fingerprint and re-enters Phase 4 (#705).

8. After internal review passes, the agent evaluates whether the PR meets the external review threshold (see [Review Policy Configuration](#review-policy-configuration)).
9. If the threshold is **not** met: the PR clears by reviewer-identity approval plus the required gates—no Codex round is required. Only when `codex.request_by_default` is `true` (an explicit opt-in: the default when the key is absent is `false` since #2240, by owner decision on 2026-10-15; mergepath sets it to `false` explicitly since #2166) and `codex.enabled` is not `false` does the agent first request a Codex review by running `scripts/codex-review-request.sh <PR#>` (without `MERGEPATH_PHASE_4A_GATED`) so `@codex review` trigger is posted on this under-threshold PR—see [`codex.request_by_default`](#codexrequest_by_default--request-codex-on-every-pr-486). The agent **is** the caller; there is no separate workflow auto-caller. The request helper runs the [Review Feedback Accounting Gate](#review-feedback-accounting-gate-1000) before the trigger; exit `6` means earlier feedback is unaccounted and must be dispositioned before retrying. This trigger is **advisory and does not gate the merge**—the threshold (not `request_by_default`) governs the merge gate, so an exit `4` (timeout), `5` (`NO_TRIGGER_REQUESTED`), or `7` (`CAP_EXHAUSTED`) does not block. Exit `8` (`MOVING_HEAD`) posts no trigger; retry after its named prerequisite, or deliberately pass `--allow-moving-head` for the verified final tested head. Exit `7` stops further advisory requests; it does not waive feedback or conversation gates. If that advisory review returns findings, the agent adjudicates and records each disposition via `scripts/codex-record-feedback.sh` and resolves the corresponding threads, exactly as in Phase 4a step 13a-bis—Codex ends every inline finding with the same 👍/👎 solicitation whether the review is gating or advisory, so the recording step applies regardless. Only the findings *capture* is HEAD-pinned, not the recording: preserve the round's findings JSON—either `codex-review-request.sh`'s own stdout from this round, or a `codex-record-feedback.sh ... --scan` run before HEAD moves—then push the fix, and only afterward pass that captured JSON to `codex-record-feedback.sh --findings-json <FILE>` to record the verdicts. Recording works fine post-push because it posts a reaction against a fixed `comment_id`; it is only a fresh `--scan` run *after* HEAD has moved that would miss the round's findings. A classified top-level review-body finding uses the review-ack channel and safe write/readback rule above. The agent then runs the [Pre-Merge Review Conversation Gate](#pre-merge-review-conversation-gate) and merges the PR as `nathanjohnpayne` once that gate is clean. Done.
10. If the threshold **is** met, the agent proceeds to [Phase 4: External Review](#phase-4-external-review). Phase 4 itself routes the PR to Phase 4a (automated, via the Codex GitHub App) or Phase 4b (automated first via `scripts/phase-4b-review.sh`, manual handoff only on its fallback) based on `codex.enabled` in `.github/review-policy.yml` and on whether 4a's automated loop converges. The agent does NOT post a handoff message directly from this step—Phase 4b posts its own handoff message if and when the fallback path is taken.

### Phase 4: External Review

Phase 4 has two sub-phases that together cover the two ways external review can run:

- **Phase 4a—Automated external review** via the ChatGPT Codex Connector GitHub App. This is the default happy path. The authoring agent drives the review loop without human intervention until Codex signals clearance, then runs a merge-gate check and merges.
- **Phase 4b—External review fallback** via a different agent's CLI (e.g., Codex CLI as `nathanpayne-codex`, or Claude Code). This is the escape hatch when 4a **times out**, **spends its request ceiling** (exit `7`, `kind: "request-ceiling"`), or is **unavailable**—`codex.enabled: false` in `.github/review-policy.yml`, either Phase 4a helper script (`scripts/codex-review-request.sh` or `scripts/codex-review-check.sh`) missing from disk, or the ChatGPT Codex Connector GitHub App not review-ready on the repo. Where `phase_4b_automation.enabled: true`, it runs that CLI headlessly and posts the resulting review itself; the human-mediated handoff is what happens when the automated review declines. Disagreement and runaway do *not* come here—see below.

An agent proceeds to 4a first. If 4a **times out, spends its request ceiling, or is unavailable** (any condition in the bullet above), the agent falls back to 4b—running `scripts/phase-4b-review.sh` first and surfacing the handoff to the human per [Handoff Message Format](#handoff-message-format) only if that automated review declines. If 4a instead **escalates** (disagreement or runaway), the agent stops and hands the decision to the human per [Disagreements and Tiebreaking](#disagreements-and-tiebreaking); it does not fall back to 4b, because a second reviewer would settle a dispute the human is supposed to settle.

#### Phase 4a: Automated External Review (Codex GitHub App)

> **Applies only to repos with `codex.enabled: true` in `.github/review-policy.yml`.** The **ChatGPT Codex Connector GitHub App must also be review-ready on the repository**, meaning installed, with Code Review enabled at [chatgpt.com/codex/cloud/settings/code-review](https://chatgpt.com/codex/cloud/settings/code-review), AND with a Codex environment configured at [chatgpt.com/codex/cloud/settings/environments](https://chatgpt.com/codex/cloud/settings/environments). "Installed" alone is not sufficient—a PR in a repo where the App is present but the environment is not configured will receive a "create an environment for this repo" comment from `chatgpt-codex-connector[bot]` instead of a review (observed on PR #62 on 2026-04-14). The only verification available from an agent reviewer PAT is observational: check whether a recent PR in this repo received a Codex review from `chatgpt-codex-connector[bot]` (auto-posted or in response to an explicit `@codex review`—the auto-review is unreliable, so a triggered one counts); `gh api repos/{owner}/{repo}/installation` requires a GitHub App JWT and is NOT usable from normal tokens. If any of these conditions is not met, skip directly to Phase 4b.

11a. The authoring agent runs `MERGEPATH_PHASE_4A_GATED=true scripts/codex-review-request.sh <PR#>` to **explicitly trigger** a Codex review. The flag is recommended on every Phase 4 round: it tells the requester the PR independently qualifies for Phase 4a, with no further reads. Without it, when `codex.request_by_default` is false or unset (mergepath since #2166, every repo by default since #2240), the requester derives the gate from the PR itself (#2257): the `needs-external-review` label, lines changed against `external_review_threshold` (generated files excluded, as the labeler counts them), and changed files, rename sources included, against `external_review_paths` through the shared matcher. Any one of those requests the review, and so does an input the requester cannot read, with a warning naming it. Only a PR it reads as under the threshold is skipped with exit `5`, and that log names what it read and the flag. Request a review always, on every round including the first, and **once per batch, on a head that is final for the round (#2166)**: every known finding (Codex, CodeRabbit, internal review) addressed, local tests green, no further push planned. Requests went out three minutes after a push at p50, on heads the agent was still amending, so the next finding landed on a commit already replaced; with each round costing about fifty minutes (Codex answer, fix push, the lint run on the new head), the round count—not any single round—is what makes a large PR slow. The requester enforces two proxies immediately before a new trigger write and refuses with exit `8` (`MOVING_HEAD`, no write) when the head is younger than `codex.request_min_head_age_seconds` (default 300, measured from the push: the latest of the committer date, the last force-push and the latest `repo-lint` dispatch for the head on the PR branch) or CI has not picked it up: no run of the canonical `repo-lint` workflow exists for the head SHA, in any status. The signal keys on the workflow run, not a job's check-run, so job renames and sharding cannot break it and it holds from the moment GitHub dispatches the push; a repo with no `repo-lint` workflow is warned about and not refused on it, and `codex.request_requires_check` overrides it with an exact check-run name (`""` disables it); `--allow-moving-head` downgrades that to a warning for the agent that has verified the head by hand, and the CodeRabbit rate-limit failover and the CI automatic caller are exempt. The guard never runs on an acknowledgement retry, a dedup skip, or a head Codex already cleared, and each signal fails open on an unreadable input—it protects cycle time, not the merge. Do NOT rely on the Codex App's "Automatic reviews" (on-open / ready-for-review) setting to have reviewed the PR for you: it is best-effort and frequently does not fire (observed on #648—an opened Phase-4 PR drew zero Codex activity until an explicit `@codex review` was posted, after which Codex acked 👀 within seconds and reviewed normally). The script is idempotent: it dedups on an existing HEAD-anchored Codex signal, so calling it is safe even when Codex has already reviewed the current HEAD—it posts `@codex review` only when no current signal exists, then polls. In polling mode it also resumes instead of re-posting when the latest fresh author request is still unanswered and Codex's Review Summary reports a review of the current HEAD Running since that request (#1550). A trigger comment names no commit, so that provider evidence is what ties the pending request to this head; without it the helper posts a new request as before. The resumed wait ends at that request's own deadline, and a resumed request that expires unanswered is replaced by a new request rather than minting a timeout determination. A transient read failure during the wait (HTTP 5xx, 429, a rate-limited 403, or a network error) is retried a bounded number of times before the helper exits `3`.

> **The Codex review command trigger MUST be authored by `nathanjohnpayne`.** The Codex GitHub App only monitors trigger comments from the repo's author/human identity; a trigger posted by a reviewer/bot identity (`nathanpayne-claude`/`-codex`/`-cursor`) is silently ignored and the poll runs to timeout (observed empirically on #405: a reviewer-authored trigger drew no response in 600s, an author-authored one drew a review in ~20s). `codex-review-request.sh` posts the trigger through `gh-as-author.sh` for exactly this reason—do not bypass that wrapper with a reviewer-token write.

After posting a trigger, `codex-review-request.sh` waits a short, bounded window for Codex's documented 👀 acknowledgment on that exact trigger comment. In GitHub's REST reactions payload the content value is `eyes`. If the acknowledgment is absent, the helper re-posts the exact `@codex review` trigger through the same author wrapper up to `codex.max_ack_retries`, then continues the normal review wait. The acknowledgment is not clearance: only a Codex review on HEAD with no unaddressed required-tier findings (P0/P1 by default), or a HEAD-anchored affirmative verdict, can satisfy the Phase 4a signal.

A requester exit `8` (`MOVING_HEAD`) occurs before a trigger is posted. Wait for the named head-age or check prerequisite and rerun the Phase 4a request. Use `--allow-moving-head` only after verifying this is the final tested head for the round; it is an explicit caller override, not review or merge clearance.

12a. `codex-review-request.sh` polls the PR until a commit-anchored terminal response, account block or timeout below. PR-level reactions are observations only and never end that poll. A reaction-only clean pass therefore waits through the configured timeout (1800 seconds by default), then falls back to Phase 4b, adding that delay and the external CLI review cost:

> **Canonical completion check (#684/#1157).** Codex completion evidence is split across `pulls/{pr}/reviews` and `issues/{pr}/comments`, so a watcher that reads only one endpoint is incomplete. Use the shipped helpers, which read both and apply the exact anchoring and disposition rules enumerated below. A reviews-only watcher missed a legacy verdict on #567, an issue-comments-only watcher missed a findings review on #679, and a summary-blind diagnostic waited its entire budget after the clean swipewatch#105 pass in #1157.

- **Codex posts a review.** Always in `COMMENTED` state—the Codex GitHub App never uses `APPROVED` or `CHANGES_REQUESTED`. The structured `commit_id` anchors the review object to a head. Most findings appear as **inline comments on the diff** (`/pulls/{pr}/comments` endpoint), but Codex can also put an independent finding in the **top-level review body** (`/pulls/{pr}/reviews`) while the same review owns inline findings (#1000; observed on gaycruisebingo#778). Both shapes carry priority markers: `![P0 Badge]`, `![P1 Badge]`, `![P2 Badge]`, or `![P3 Badge]`. The review-body finding has no review thread and is dispositioned through the [Review Feedback Accounting Gate](#review-feedback-accounting-gate-1000)'s review-ack channel. A findings round still produces no companion issue-comment verdict, so the completion poll must read review objects as well as issue comments.
- **Codex reacts 👍 / `+1`** on the PR issue with no review body. This is an unanchored provider observation. It cannot prove which head was reviewed and never grants Mergepath clearance or suppresses a new review request (#1751).
- **Codex edits the persistent Review Summary issue comment (#1157).** The comment starts with `<!-- codex-pull-request-review-summary -->`; its Code Review row carries `Running` or `Completed`, an abbreviated commit, and the trigger. Match the bot author and require that commit to prefix HEAD. Use `updated_at`, not `created_at`, because the comment is created when the review starts and edited when its state changes. `Running` confirms only that work is in progress. `Completed` is accepted by `codex-review-check.sh --diagnostic-signal-only` as exact-head terminal evidence so propagation-wave ordering does not wait for a review object a findings-free pass never emits. The ordinary merge gate does not accept the summary alone: it still requires the review, legacy affirmative verdict, or Phase 4b substitute that carries a disposition.
- **Codex posts a summary issue comment**—"Codex Review: …" with a `Reviewed commit: <sha>` line—on the PR conversation (`issues/{pr}/comments`), NOT a review object. When that SHA is the full 40-hex current HEAD and there are no unaddressed required-tier (P0/P1 by default) inline findings on HEAD, the verdict is a clearance signal too. Check issue comments as well as review objects: Codex routes its verdict here, so a `pulls/{pr}/reviews`-only check can miss a completed re-review (#567). The automated merge gate `scripts/codex-review-check.sh` **honors** this HEAD-anchored issue-comment verdict for gate (b) branch 2 and gate (c) as of #600 (alongside review objects): a `chatgpt-codex-connector[bot]` comment matching Codex's stable affirmative phrasing (`Didn't find any major issues`) whose every `Reviewed commit: <sha>` anchor equals the full 40-hex current HEAD, with zero unaddressed required-tier findings on HEAD, is accepted as clearance. It **fails closed** on a stale-HEAD, findings-bearing, changes-requested, or unrecognized verdict—so an ambiguous comment never clears the gate. `codex-review-request.sh`'s automated poll recognizes the same HEAD-anchored issue-comment verdict as a terminal signal (#609): a verdict of either disposition ends the poll instead of running to `review_timeout_seconds`, and an affirmative verdict with zero unaddressed required-tier findings on HEAD clears it, via the same latest-signal-wins (review / verdict) decision the merge gate uses.
- **Account-/connection-level block (#722).** Codex answered the trigger with a plain comment reporting account-level quota exhaustion (`blocked_reason: "usage_limit"`—"You have reached your Codex usage limits for code reviews…") or that the App is not connected (`blocked_reason: "not_connected"`—"To use Codex here, connect your GitHub account…"). Such a comment carries no findings and no `Reviewed commit:` anchor, so it is not a review, verdict, or clearance signal—but it is terminal: re-polling or re-triggering cannot produce a review until a human acts (upgrade / add credits / connect the App). `codex-review-request.sh` detects the usage-limit state only when a non-verdict bot comment begins with the provider's documented account-quota response; incidental quota text in a task or review summary is non-terminal. The shared `scripts/lib/codex-failure-markers.sh` retains a separate broader pattern for the retrospective latency audit, which does not feed live terminal decisions. On a live block the requester **short-circuits the wait immediately** instead of running out `review_timeout_seconds`, and exits `4` (`FALLBACK_REQUIRED`) with the reason surfaced in the output JSON's `blocked_reason` field and in its log line. Route to Phase 4b as for a timeout, but name the real cause in the handoff (a human account action, not "wait longer") rather than reporting a generic latency timeout.
- **Timeout.** No commit-anchored review or verdict within `codex.review_timeout_seconds` (default: 1800s / 30 min, remeasured in #1550 from 243 triggers between 2026-09-14 and 2026-10-01: p50 370s, p95 982s, max 1723s; the earlier 840s retune is #623). Before exiting, the script re-reads the live head and paginated PR timeline, then writes an author-owned hidden terminal-determination comment that is versioned, pinned to the full head SHA, and bound to the confirmed `@codex review` trigger comment (#1085). That determination remains current only while its bound trigger is the latest exact author-owned request on the same head; a newer `@codex review` starts a new Phase 4a attempt and supersedes the older timeout. A write/readback failure, malformed trigger metadata, or head drift is an infrastructure error (exit `3`), not a timeout waiver. On a successful record the script exits with code `4` (`FALLBACK_REQUIRED`), `blocked_reason: null`, and a non-null `terminal_determination` object. Account/connection blocks do not write this marker: `codex-review-request.sh` still exits `4` with a non-null `blocked_reason`, while the later `codex-review-check.sh --diagnostic-signal-only` probe maps the same provider-authored evidence to its distinct exit-`2` Phase 4b waiver.

13a. If Codex posted inline findings, the agent dispositions each finding in a **`required`** tier by either:

     - **Fixing the code** and pushing a new commit to the same branch, or
     - **Replying on the finding thread** with a clear rebuttal explaining why the finding does not apply (for false positives or scope disagreements).

     Which tiers are `required` is governed by `feedback_policy` in `.github/review-policy.yml`—see [§ Feedback Disposition Policy](#feedback-disposition-policy). The **default**, and the behavior when the block is absent, is **P0/P1 required** (as above) and **P2/P3 discretionary**—addressed at the agent's judgment, so not every cosmetic or nit-level finding needs a fix or a rebuttal. A repo may mark additional tiers `required`, or set `mode: address-all` so that **every** finding must be fixed or rebutted before merge. The same tier policy applies to CodeRabbit findings (Phase 2.5), mapped onto the shared ladder.

13a-bis. **Record the feedback reaction (#487).** Every Codex finding ends with a solicitation: *"Useful? React with 👍 / 👎."* After adjudicating a finding, the agent answers that prompt with a **validated** reaction via `scripts/codex-record-feedback.sh <PR#> --findings-json <request-script-json> --verdict <comment_id>=<verdict>[:<reason>]`:

     - **Validated as real and actioned (fixed)** → react `+1` (👍).
     - **Determined to be a false positive / rebutted** → react `-1` (👎).

     "Validate" means more than a blanket 👍 — confirm the finding is legitimate before a 👍 (the referenced `path:line` exists on HEAD; the claim reproduces or a fix commit addresses it). A 👎 on a genuine false positive is itself a validated signal. The helper:

     - Only reacts to findings whose body contains the exact solicitation (it never reacts on bot comments that do not solicit feedback).
     - Posts the reaction through `scripts/gh-as-reviewer.sh` under the **reviewer identity** (e.g. `nathanpayne-claude`), not the author token—this is the first place Mergepath POSTs a reaction, and it is a reviewer-attributed write. It targets the reactions endpoint matching where the finding lives (`repos/{owner}/{repo}/pulls/comments/{id}/reactions` for an inline diff finding, `…/issues/comments/{id}/reactions` for a PR-level comment).
     - Is **idempotent**: if a reaction by the reviewer identity already exists on the comment, it leaves it (no double-react, no flip).
     - Is **HEAD-pinned**: `--scan` collects only the current HEAD's latest Codex review round (consistent with `codex-review-request.sh`'s findings scoping), so a finding a later commit already fixed is not 👎'd.
     - Writes a **durable per-finding verdict** (comment_id, priority, verdict, reaction, optional reason) to a JSONL ledger (`.mergepath/codex-feedback-ledger.jsonl` by default) so Codex review precision is trackable over time and can feed the daily rollup / `pr-audit`.

     This step closes the Codex loop in the other direction from the 👀 eyes-ack read (#419): companion to the request-by-default trigger (#486), Mergepath now both requests the review and records a validated grade on each finding.

14a. The agent increments its round counter and re-runs `MERGEPATH_PHASE_4A_GATED=true scripts/codex-review-request.sh <PR#>` to request a re-review of the new HEAD—after the batch rule of step 11a: one request per batch, once the head is final for the round, never per push. Immediately before the trigger, that helper runs the [Review Feedback Accounting Gate](#review-feedback-accounting-gate-1000); exit `6` means one or more earlier inline or top-level review-body findings still lack disposition evidence, no trigger was posted, and the agent must finish those dispositions before retrying.

> **Pushing a fix commit does NOT re-trigger a Codex review, and the on-open / ready-for-review auto-review is unreliable.** The only dependable trigger is an explicit Codex review command: the App's on-open / ready auto-review frequently does not fire (#648), and a plain push (`synchronize`) is not on its trigger list at all. Step 11a's / 14a's run of `codex-review-request.sh` is therefore mandatory on every round including the first, not a formality: skip it and the prior round's stale HEAD remains the last review Codex ever produced, the merge gate's HEAD-anchored verdict check (step 16a) never sees a current clearance, and the PR sits red on `Merge clearance gate` with no review in flight and nothing arriving to fix it (#631).

15a. The loop continues until one of the following terminates it:

     - **Clearance (happy path).** Codex posts a review with no unaddressed **`required`-tier** inline findings (P0/P1 by default; see [§ Feedback Disposition Policy](#feedback-disposition-policy)) on the current HEAD, OR posts a HEAD-anchored affirmative issue-comment verdict (`Didn't find any major issues` + a `Reviewed commit: <sha>` line whose SHA exactly equals the full 40-character HEAD SHA) with no unaddressed required-tier findings on HEAD (#600/#567). Proceed to step 16a. A verdict-only response is recognized by both the request poll (step 12a) and the merge-gate check (step 16a, `codex-review-check.sh` as of #600)—`codex-review-request.sh`'s poll terminates on it rather than reaching `review_timeout_seconds` (#609).
     - **Disagreement (escalate).** Codex re-flags the same finding after the agent posted a rebuttal. This is "repeat-after-rebuttal." See [Disagreements and Tiebreaking](#disagreements-and-tiebreaking).
     - **Runaway (escalate).** The review is not converging: the blocking-review budget is spent (the requester's exit `7`, `kind: "blocking-reviews"`), or, at a spent request ceiling, every request `codex.max_review_rounds` allowed drew a blocking review (the Phase 4b barrier's `runaway` stop, exit `8`). See [Disagreements and Tiebreaking](#disagreements-and-tiebreaking), signals 2 and 3.
     - **Timeout or account block (fall back).** `codex-review-request.sh` exits with code `4` (`FALLBACK_REQUIRED`) for the current round—either a genuine timeout (`blocked_reason: null`, with the durable exact-head `terminal_determination` recorded) or a detected account-/connection-level block (`blocked_reason: "usage_limit" | "not_connected"`, #722; short-circuited immediately rather than waited out). The agent falls back to Phase 4b either way. The automated Phase 4b Codex barrier consumes a valid timeout determination for that same live head and waives the missing Codex signal only while its bound trigger remains the latest exact author request; a head with no request/determination, a newer request, or only a stale determination remains `not-yet`. Malformed/unreadable evidence and head drift fail closed. There is no "second timeout" escalation—a single recorded timeout already authorizes the substitute path until another exact request supersedes it—but on a non-null `blocked_reason` the handoff should name the account action required, since re-triggering cannot help until a human resolves it.
     - **Blocking-review budget (escalate).** The requester exits `7` (`CAP_EXHAUSTED`) with `cap_exhausted.kind: "blocking-reviews"` when the PR already holds `codex.max_blocking_reviews` (default 10) solicited blocking Codex reviews (#1560 slice 3). Stop the request loop and take the human-tiebreaker route. See [Disagreements and Tiebreaking](#disagreements-and-tiebreaking), signal 3.
     - **Request ceiling (route through the Phase 4b barrier).** The requester exits `7` (`CAP_EXHAUSTED`) with `cap_exhausted.kind: "request-ceiling"` when no additional request is permitted. Stop the request loop, do not infer clearance, and run automated Phase 4b: its barrier dispatches the adapter only when no human stop holds, and otherwise exits `8` for the human tiebreaker (#1560 slice 3; see [Disagreements and Tiebreaking](#disagreements-and-tiebreaking), signal 4). The phase-neutral result reports counts and any provider-block diagnostic; the caller applies this policy. A final request already in flight may still be polled without another request or a new timeout determination.
     - **Feedback unaccounted (stop and disposition).** `codex-review-request.sh` exits with code `6` before posting a trigger. This is not a timeout or Phase 4b fallback: read the accounting JSON, complete every missing disposition, and rerun the same round.

16a. Before merging, the agent runs `scripts/codex-review-check.sh <PR#>` to verify the merge gate. All of the following must be true:

     - **Gate (a)**—every REQUIRED status check on the PR's base branch is green on the current head. "Required" is resolved by `scripts/lib/branch-requirements.sh` (#1064, subsuming #1063), which reads the two rule surfaces a plain write-scoped token can see—GraphQL `refUpdateRule.requiredStatusCheckContexts` for classic branch protection, and REST `rules/branches/{branch}` for rulesets—and returns their union. Both are read because GitHub enforces classic protection and every applicable ruleset simultaneously, and neither surface reports the other. Checks outside that list, including a consumer's `repo_lint_local.yml` annex, do not block gate (a) by name; the annex is enforced separately by workflow identity (#655).

       Gate (a) evaluates **per rule, not per name**. Each rule selects its own candidate runs—every run of the context for a rule that accepts any producer, that app's runs for a rule pinned to one—and is satisfied by the current run of each **surface** among them, so a superseded failure does not block a PR GitHub would merge. A required context is satisfiable from two surfaces, a check run and a legacy commit status, and GitHub evaluates each as its own row: when a head carries both under one name, both must be green. The current run is therefore chosen per surface, and either surface can block on its own. One context can carry several rules at once (pinned by a ruleset, required from any producer by classic protection), and they are judged independently. Do not reduce this to a single collapse during maintenance: keying on the name hides a second required app's failure, keying on the producing app makes every publisher of an any-producer context separately mandatory, and collapsing the two surfaces together lets whichever reported last speak for both—which is how a passing commit status masked a failing check run in [#1193](https://github.com/nathanjohnpayne/mergepath/issues/1193). A rule with no candidate run at all is unsatisfied and blocks, because GitHub holds the PR for an unreported required context. `Label Gate` is exempt from the verdict but not from that presence test—it fails by design during Phase 4a, which is what Phase 4a exists to clear.

       This deliberately does NOT read `branches/{branch}/protection/required_status_checks`. That endpoint needs `Administration:read`, and GitHub hides the resource rather than admitting a permission denial, so an unprivileged token receives **404, not 403**. Every path gate (a) runs on is unprivileged—agents invoke the script under a reviewer PAT, and `auto-clear-blocking-labels.yml` runs it with `secrets.REVIEWER_ASSIGNMENT_TOKEN` while (unlike `merge-clearance-gate.yml`) not skipping gate (a)—so that 404 was read as "no required checks are configured" and gate (a) passed without examining a single check run. Reviewer PATs are not being granted admin scope to fix this; the two surfaces above answer for the tokens the fleet already uses.

       The resolver is tri-state and the three states are kept distinct: `known` with a list (filter to it), `known` with an empty list (an approvals-only branch genuinely requires nothing, so no filter applies), and `unknown`. Conflating the last two is the defect [#1064](https://github.com/nathanjohnpayne/mergepath/issues/1064) closed.

       **`unknown` blocks gate (a) unconditionally, and not merely by scrutinising the rollup.** Failing closed per [#465](https://github.com/nathanjohnpayne/mergepath/issues/465)—requiring every non-skipped reported check to be green—is necessary but not sufficient, because the rollup can only show checks that *reported*: a required workflow that has not been scheduled has no rollup entry at all, so a rollup-only rule would clear exactly where the requirement list would have caught an absence. An unresolved list therefore contributes its own blocking entry, and gate (a) reports that it could not determine the requirements rather than reporting clean. It blocks via a reported entry rather than an infrastructure exit, so a single endpoint anomaly degrades one PR evaluation instead of taking the script down fleet-wide, and it resolves on its own when the surfaces answer again.

       **`known` requires BOTH surfaces to answer; any unreadable surface makes the union `unknown`.** The requirement is the union, so one surface answering `[]` establishes nothing about what the other would have said — acting on a half-read would reinstate the same fail-open one level up, clearing a red classic required check whenever the GraphQL read failed alongside an empty rulesets read. The resolver also reports `partial`, but that is a diagnostic only: it distinguishes a half-outage from a total one for an operator reading the log, and never licenses acting on the partial list. Each surface is retried once before being given up on, so a single transient blip does not put gate (a) on the fail-closed path.
     - **Gate (b)** — one of:
       - **Branch 1 (cross-agent):** a reviewer identity from `available_reviewers` has posted an `APPROVED` review (Phase 2 internal self-peer review by a DIFFERENT agent than the author)
       - **Branch 2 (same-agent fallback, #170):** when `codex.enabled: true`, the PR's `Authoring-Agent:` matches an entry in `available_reviewers` AND `chatgpt-codex-connector[bot]` has EITHER a `COMMENTED` review whose full `commit_id` equals the current head and whose body and own root bot findings contain no P0/P1 items, regardless of later replies or resolution, OR a HEAD-anchored affirmative issue-comment verdict (`Reviewed commit` equals the full 40-hex HEAD, so no time-window is needed; #600/#1752). This is the normal path for single-agent sessions where the no-self-approve rule prohibits the author's reviewer identity from approving—Codex's external review is the cross-agent signal that substitutes for an APPROVED state. PR-level thumbs-up reactions lack a reviewed commit and never substitute for approval or clearance (#1751). Gate (c) separately checks required findings and the latest anchored signal.
     - **Gate (c)**—when `codex.enabled: true`, Codex has signaled clearance on the current HEAD via one of the two anchored forms in step 12a (COMMENTED review with no unaddressed required-tier findings or a HEAD-anchored affirmative issue-comment verdict with no unaddressed required-tier findings; #600), OR Codex previously posted an affirmative issue-comment verdict for a commit with the same external-review fingerprint as the current head and the current head has no newer Codex signal of its own (#705), OR a Phase 4b substitute clearance has landed (an `APPROVED` review on the current HEAD from a non-author identity in `available_reviewers`). Any of the Codex forms is superseded while the configured author has a Codex request in or after its second that Codex has not answered, and a substitute is superseded by a request outside the request generation it recorded (#1598); see the auto-clear paragraph under [Phase 4b: Manual CLI Fallback (Human Handoff)](#phase-4b-manual-cli-fallback-human-handoff). The same-fingerprint carry-forward is limited to base-only/update-branch churn: once external review is required, the fingerprint hashes the tree object IDs for every changed file in both the head and that head's merge base against the PR base, so any changed reviewed content or changed reviewed diff invalidates the carry-forward and requires fresh clearance. **The fingerprint alone is sufficient, and this is deliberate (#763).** A match proves `entry(reviewed_commit, p) == entry(head, p)` for *every* path `p` the PR changes, so any additional "prove the delta since the reviewed commit is base-only" predicate restricted to those paths is vacuously true and can never fire; and a path *not* in the PR's changed set has, by definition of that set, identical content at the head and at the merge base, so it contributes nothing to the merged result and needs no review. Those two cases exhaust the paths. The only residual is *history*—whether every intermediate state was reviewed—which is not what this gate protects: it gates merged content, and a file added then removed mid-PR merges nothing. An implementation of the extra predicate was written and removed during #763: GitHub's compare endpoint uses three-dot (merge-base) semantics, so after a rebase `candidate...head` includes the PR's own already-reviewed files and the predicate refused precisely the base-only carry-forward this feature exists to serve. It could only ever produce false negatives. The Phase 4b substitute is the merge gate's understanding of Phase 4b clearance—without it, a PR that clears via Phase 4b would leave gate (c) failing forever and the auto-clear workflow would not remove `needs-external-review`. When `codex.enabled: false`, `scripts/codex-review-check.sh` ignores Codex bot reviews/reactions and gate (c) can clear only through the Phase 4b substitute path. Toggle via `codex.allow_phase_4b_substitute: true|false` in `.github/review-policy.yml` (default `true`; #218).

     **The merge gate must never require an `APPROVED` review state from `chatgpt-codex-connector[bot]` — the app does not emit that state.** This point is load-bearing; a merge gate that looks for Codex APPROVED will never be satisfied and the Phase 4a happy path will be unreachable.

     **No-self-approve rule + branch 2 interaction:** the rule "agents do not `--approve` a PR they authored under their own reviewer identity" applies to Phase 4 PRs (above `external_review_threshold` or matching `external_review_paths`)—that's the scope this section is in. For under-threshold PRs the reviewer identity is allowed and expected to `--approve`; see [No-self-approve scoping](#no-self-approve-scoping) above. Branch 2 is what makes the rule operational for the Phase 4 case—without it, same-agent PRs would deadlock on gate (b) with no escape short of human override. With branch 2, the agent posts a `--comment` review under its reviewer identity (per the rule), and the anchored Codex review or verdict carries the cross-check weight.

17a. On a passing merge gate, the agent runs `scripts/review-feedback-accounting.sh <PR#>` and then the [Pre-Merge Review Conversation Gate](#pre-merge-review-conversation-gate). If the accounting counts differ or any unresolved thread remains, stop before merge and disposition, address, or resolve it through the allowed path.

18a. After the merge gate and review-conversation gate are both clean, `nathanjohnpayne` merges the PR with `gh pr merge <n> --squash --delete-branch --match-head-commit <full-current-head-sha>`. Attempt that merge **immediately** once the last required check is green; never wait for a scheduled sweep or an edit-nudge (#2167). While the session is live, watch the required checks at a 60-second cadence (`gh pr checks <PR#> --repo <owner/repo> --required --watch --interval 60`, a read path; `lint` is normally the last context to land) and issue the author merge the moment the rollup is clean; `--match-head-commit <full-current-head-sha>` is what makes the immediate attempt safe against a head that moved while you watched. No workflow waits for `lint` on a runner: a `pull_request` lint run completing re-publishes the three script-backed required contexts through `required-check-publisher.yml`'s `repo-lint` parent, so the only latency left after `lint` is the agent's own. Never `--admin` unless the human explicitly authorizes a break-glass override in chat. `BREAK_GLASS_ADMIN` and `BREAK_GLASS_MERGE_STATE` do not release an outstanding non-author `CHANGES_REQUESTED`, including one on an older head or a summary-only review with no threads. The guard reads all review pages and retains each reviewer's latest opinion, ignoring `COMMENTED`, `PENDING` and `DISMISSED` records as replacing opinions. Release requires that reviewer to approve, dismissal of the blocking review itself, or a separate explicit owner tiebreak naming `BREAK_GLASS_REVIEW_DISAGREEMENT=<canonical-https-PR-URL>@<full-current-head-sha>`. This scoped variable releases only the disagreement gate and never `human-hold`. The local guard refuses deferred `--auto` or implicit native merge-queue merging, which would outlive its review snapshot; `--disable-auto` remains an attributed safety retraction and does not need a disagreement override. An immediate merge requires exactly one `--match-head-commit <full-current-head-sha>` on the merge command so GitHub rejects a head changed after the guard checked it. Nullable/deleted reviewer accounts and garbage-collected review commits are accepted: non-blocking reviews are ignored and an anonymous outstanding change request still needs dismissal or this scoped tiebreak. Review order follows the endpoint's chronological response order, not review IDs.

The non-Dependabot `auto-merge-on-approval` job name is retained for workflow and consumer compatibility, but candidate-controlled `pull_request` and `pull_request_review` jobs receive no queue credential and do not arm auto-merge, enqueue, or perform a merge. They use read-only `github.token` for readiness and fail closed when an arm exists. Trusted `pull_request_target`, `workflow_run`, scheduled continuation, and exact-runtime-guarded `repository_dispatch` jobs may use the three environment-only credentials only after binding `merge-queue-policy`; the observer and final auditor are the only #1058 author-token writers. Reviewer tokens such as `REVIEWER_ASSIGNMENT_TOKEN` must not be used for PR merges. The separately activated native merge-queue boundary described in [§ Native merge-queue boundary (#1058)](#native-merge-queue-boundary-1058) begins only with a human owner action and does not give readiness evaluation queue or merge authority.

Protective arm classification is not merge authorization. A candidate-controlled readiness job reads any non-Dependabot auto-merge request with read-only `github.token` and fails closed if one exists. A trusted environment-bound continuation may preserve an exact arm only when the three credentials are pairwise distinct and correctly scoped, both read tokens verify the governing author identity, and their separate complete live reads prove the exact PR/head has queue protection from the two active rulesets and pinned external required workflows. Every other armed result fails without mutation and requires explicit human/admin disposition, including a positively verified `disabled` rollout (`rc 4`), a future activation that forbids mutation across the boundary (`rc 5`), malformed rollout configuration (`rc 3`), missing helper or credential, stale trusted base, ineligible scope, blocker, topology ambiguity, or a simulated newer arm. Those codes are `merge-queue-arm-policy.sh`'s own: `inactive` is `rc 4` and `not_eligible` is `rc 5`—both positive verdicts that the arm sits outside the boundary—while `infra` is `rc 3`, which reaches no verdict at all and therefore establishes nothing about the arm. GitHub has no conditional disable or compare-and-swap primitive, so there is no non-Dependabot `--disable-auto` fallback. **How that refusal is reported is separate from what it permits (#1159).** An arm already standing when the protective pass opens is the steady state of every approved PR whose auto-merge is enabled, and the scheduled sweep re-enters it every five minutes, so `scripts/workflow/approval-merge-continuation.sh` reports *that* refusal as not-merge-ready (exit 4) rather than as an infrastructure error (exit 3): the sweep records the PR and continues instead of failing the periodic run for as long as the arm stands, which had made the sweep permanently red on any repo holding one such PR and buried the genuine infrastructure failures that reporting exists to surface. The permission is unchanged—nothing is retracted, merged, or cleared on either path, and the PR still awaits explicit human/admin disposition. Exit 4 requires **all three** of the following, and anything that establishes less is an infrastructure error: a **governing policy** that resolved and names an `author_identity`; a **verdict the boundary classifier actually reached** (`merge-queue-arm-policy.sh` exit 4 inactive or 5 not-eligible—never its exit 3 or 2, which are the classifier failing to reach one, and never an absent classifier, which reached nothing at all); and the **standing-arm shape** (armed before the pass opened, a bracketing readback that both succeeded and validated, an unchanged head/base/author tuple, and the *same request*—`enabledAt`, enabling actor and merge method, since disabling one arm and enabling another leaves that tuple identical while replacing the thing being judged). Everything else stays exit 3: an unresolvable governing policy, or one naming no author identity, which leaves the author binding the whole classification rests on unverified—the protective pass returns before the two guards that enforce this for the normal continuation, so it repeats them itself; an unbracketable readback, whose failure says nothing about the arm; an arm first observed *by* the readback, which appeared during the continuation and is a concurrency signal rather than a standing state; a moved tuple or a replaced request, where the arm being judged is not the arm that was classified; and every mid-run observation in the normal continuation—`policy-drift`, `pre-evaluation`, `final-snapshot-drift`, `post-independence`, and the exit cleanup. Each cause names itself in the diagnostic, so an operator reading exit 3 can tell them apart. Exit 4 is a **third** status with its own meaning, not a variant of failure, so every caller must read it as such: both label-clear paths in `auto-clear-blocking-labels.yml` keep `needs-external-review` in place on it—removing the last blocker while an arm stands is the hazard the retraction exists to prevent—while setting no infrastructure sentinel and emitting no per-PR failure diagnostic. An unarmed state continues. Dependabot retains its separately governed durable arm. The bounded path cannot create or refresh an arm, enqueue, dequeue, directly merge, or disable native auto-merge.

Readiness validation is event-driven rather than runner-polled. Three triggers re-evaluate it: the original `pull_request_review` + `approved` event; a `pull_request` `synchronize` / `reopened` event; and a blocking-label `unlabeled` settle event. Every path first proves a registered non-author latest-state `APPROVED` review, re-reads the shared blocking-label set, and probes current-head required-check readiness once. Candidate-controlled paths use only `github.token`; they never receive the queue credentials. CodeRabbit is not polled and is not an additional requirement after that approval; required-severity findings and unresolved conversations remain enforced by their dedicated required checks. If checks are pending, the job exits without holding a runner. Successful `repo-lint`, optional local-annex, and policy workflow completions re-enter the trusted default-branch, environment-bound continuation; the five-minute environment-bound sweep is the general backstop for consumer annexes whose custom display name cannot be enumerated by `workflow_run`. The continuation resolves the live PR by exact head, verifies the author and two read tokens, reruns `codex-review-check.sh`, requires feedback accounting and zero unresolved conversations, revalidates the full authorization tuple after approval independence, and runs the #1099 protective pass. An exact queue-proven arm covered by the complete live #1058 required-workflow topology survives successfully; every other armed result stops non-mutating for human/admin disposition, while an unarmed state continues. A classified native non-shared path reports stable readiness without invoking a merge mutation; a shared-author path stops after classification for the ordinary one-shot author workflow. A push with no existing approval does not become ready, and a withdrawn approval does not count. Both the approval job and continuation source helpers only from the trusted default branch. During the first atomic workflow-plus-helper rollout, the approval job uses an exact inline blocking-label fallback until the trusted default branch contains the helper; later runs source the shared helper.

#### Phase 4b: External Review Fallback

**Deterministic egregious-case escalation (#1757).** Model-authoritative Phase 4b remains the ordinary path, with the owner-accepted hostile-diff residual. After existing provider/feedback barriers permit continuation, the trusted orchestrator checks the complete immutable PR input on posting and retained-evidence paths for literal reviewer/verdict instructions and the authorization/review-policy/required-publisher/credential-handling path inventory, before dispatching the Phase 4b adapter. Earlier provider requests, stops and manual fallbacks remain possible; existing disagreement, runaway and human-stop signals retain their earlier barriers. A matched tripwire stops for human-mediated review with exit8, without Phase 4b adapter execution or approval publication. Pure previews retain their existing behavior. Report the fixed reason codes from `barrier.tripwire.tripwires` when escalating this stop. A clear result is not proof of resistance to hostile instructions. The exact finite alarms, conservative path inventory, residuals and tests are specified in [Deterministic Phase 4b escalation](https://github.com/nathanjohnpayne/mergepath/blob/main/specs/phase_4b_escalation.md).

Phase 4b is invoked when Phase 4a **times out** (single timeout, exit code `4` from `codex-review-request.sh`), **spends its request ceiling** (exit `7`, `kind: "request-ceiling"`), or is **unavailable**. Phase 4a is unavailable when any of the following holds: `codex.enabled: false` in `.github/review-policy.yml`, either Phase 4a helper script (`scripts/codex-review-request.sh` or `scripts/codex-review-check.sh`) missing from disk, or the ChatGPT Codex Connector GitHub App not review-ready on the repo (review-ready means installed, Code Review enabled, AND a Codex environment configured—see the Phase 4a note above). AGENTS.md and CLAUDE.md route on this same condition set. Phase 4b preserves the cross-agent review flow that existed before the Codex GitHub App integration and provides a human-mediated escape hatch. In this repo the automated path described at the end of this section is the prescribed first move—the numbered steps below are reached only when it declines.

**Phase 4a disagreement and runaway do NOT enter Phase 4b.** They stay in the human tiebreaking flow described in [Disagreements and Tiebreaking](#disagreements-and-tiebreaking): stop, post both positions, alert the human, wait for an explicit decision. Routing them here would hand a disputed review to a different reviewer and could obtain a substitute `APPROVED` without the human tiebreaker the disagreement procedure exists to require—the same failure the exhausted-rounds rule below rules out for Phase 4b's own review loop. A timeout is not a disagreement: nobody disagreed, the reviewer never answered, and there is no position to tiebreak.

11b. The authoring agent posts the handoff message (see [Handoff Message Format](#handoff-message-format)) as a PR comment and alerts the human.

12b. The human takes the handoff message to a different agent session (e.g., from Claude to Cursor, or to a Codex CLI session authenticated as `nathanpayne-codex`).

13b. The external agent's reviewer identity reviews the PR and posts review comments. Unlike the Codex GitHub App, CLI-driven reviews use the standard GitHub review states (`APPROVED`, `CHANGES_REQUESTED`, `COMMENTED`) as expected.

14b. The human relays the external reviewer's feedback back to the originating agent.

15b. The originating agent, as `nathanjohnpayne`, addresses the feedback and pushes fix commits to the same branch.

16b. The human shuttles updated code back to the external reviewer.

17b. Steps 13b–16b repeat until the external reviewer submits an `APPROVED` review.

18b. If the external reviewer flags **observations** or **risks** while approving, those are converted to GitHub Issues on the repo, assigned to `nathanjohnpayne` (see [Post-Merge Issue Creation](#post-merge-issue-creation)).

19b. `nathanjohnpayne` merges the PR with the head-pinned command and under the outstanding-reviewer-disagreement rule of step 17a. Done.

**Automated Phase 4b.** `scripts/phase-4b-review.sh` drives the cross-agent Phase 4b review by shelling out to a reviewer CLI (Codex or Claude) under the operator's **subscription plan** (never a pay-per-token API key), then posting the resulting `APPROVED` / `CHANGES_REQUESTED` verdict as a real GitHub review under the reviewer PAT via `scripts/gh-as-reviewer.sh`, pinned to the reviewed HEAD—the same Phase 4b substitute clearance gate (c) in step 16a already accepts, and the approving review branch protection asks for. It selects an external reviewer from `available_reviewers` whose agent differs from the authoring agent, and refuses to run rather than proceed when no eligible reviewer exists. This repo runs it **enabled** (`phase_4b_automation.enabled: true`, `mode: local`). **Invocation (enabled repos):** whenever a PR reaches Phase 4b, the authoring agent runs `scripts/phase-4b-review.sh <PR#> --repo <owner/repo>` itself instead of posting the manual handoff—executing the orchestrator, its adapters, and `scripts/gh-as-reviewer.sh` **from a trusted `main`-ref checkout, never from the PR-under-review's own checkout** (the PR is passed by number/head and its diff reviewed as data, so a PR that edits the phase-4b scripts, the adapters, or the review policy cannot shape its own verdict—mergepath#628). Exit `0` means an `APPROVED` review posted: verify the merge gate, then merge as `nathanjohnpayne`. Verify it with `scripts/codex-review-check.sh <PR#>` when that helper is on disk; when it is absent—a missing Phase 4a helper is itself one of the conditions that routes a PR here—evaluate the step 16a gate conditions by hand instead: `gh pr checks` reporting every required check green, gate (b), and gate (c) satisfied by this Phase 4b `APPROVED` pinned to the current HEAD from a non-author identity in `available_reviewers`. **The step 16a gate conditions are the authority; `codex-review-check.sh` is one way to evaluate them, not a precondition for merging.** The manual leg's own merge at step 19b never invokes the script either, so a missing convenience wrapper must not strand a PR that already carries a valid cross-agent approval. If the verdict carried discretionary findings and `phase_4b_automation.post_review_issues: true`, the orchestrator has already filed the [Post-Merge Issue Creation](#post-merge-issue-creation) issues under the author identity and linked them in the approval body—do not file them again. Exit `1` means a `CHANGES_REQUESTED` review posted—a completed round, not a failure: address the findings as `nathanjohnpayne`, push, and rerun the automation, up to `phase_4b_automation.max_review_rounds` (the orchestrator does one adapter pass per invocation, and the round ledger enforces the cap across invocations, mergepath#2663). Only the OTHER non-zero exits fall through to the manual handoff in steps 11b–19b above—a usage or infrastructure error, a fail-closed manual fallback (`fell_back_to_manual: true` with a `reason` in the JSON summary: non-conformant or unexpected adapter verdict, adapter error or timeout, no adapter for the selected reviewer, PR head drift between review and posting, failed post-review issue filing on an approved verdict, or the same-head unresolved-required-finding gate), or automation being off for the repo—as does the absence of `scripts/phase-4b-review.sh` from disk. Knobs live in the `phase_4b_automation` block of `.github/review-policy.yml`; full detail (child-env credential isolation, verdict schema, dry-run, accounting) lives in [`scripts/phase-4b/README.md`](scripts/phase-4b/README.md).

**Exhausted rounds are an escalation, not a fall-through.** When repeated `CHANGES_REQUESTED` rounds reach `phase_4b_automation.max_review_rounds`, stop. Do not re-run the automation, do not post the manual handoff, and do not merge. Escalate exactly as Phase 4a does for runaway and repeat-after-rebuttal: post a PR comment summarising both positions with links to each review round, alert the human, and wait. See [Disagreements and Tiebreaking](#disagreements-and-tiebreaking)—the human is the tiebreaker, and the resolutions available there (approve the existing state, give feedback directly in chat, or take the PR over manually) apply unchanged. The manual handoff is deliberately *not* the answer here: a cap reached through repeated substantive disagreement means the reviewer keeps finding problems, and shuttling the same disagreement to a second external reviewer restarts the argument rather than settling it. The manual leg exists for when the automated review could not run, not for when it ran and disagreed.

### Flow Diagram

```
  ┌─────────────────────────────────────────────────────────┐
  │  PHASE 1: AUTHOR                                        │
  │  Agent writes code as nathanjohnpayne → files PR        │
  └──────────────────────────┬──────────────────────────────┘
                             │
                             ▼
  ┌─────────────────────────────────────────────────────────┐
  │  PHASE 2: INTERNAL REVIEW                               │
  │  Agent switches to nathanpayne-{agent}                  │
  │  Reviews PR → posts comments                            │
  │  Agent switches to nathanjohnpayne → fixes              │
  │  ↻ Repeat until approved                                │
  └──────────────────────────┬──────────────────────────────┘
                             │
                             ▼
  ┌─────────────────────────────────────────────────────────┐
  │  PHASE 2.5: CODERABBIT REVIEW (if enabled)              │
  │  CodeRabbit auto-posts review on PR                     │
  │  Agent reads findings, addresses substantive issues     │
  │  Advisory only — does not block merge                   │
  └──────────────────────────┬──────────────────────────────┘
                             │
                             ▼
  ┌─────────────────────────────────────────────────────────┐
  │  PHASE 3: THRESHOLD CHECK                               │
  │  Lines changed ≥ threshold OR protected paths touched?  │
  │                                                         │
  │  NO ──→ nathanjohnpayne merges. Done.                   │
  │  YES ──→ Proceed to Phase 4                             │
  └──────────────────────────┬──────────────────────────────┘
                             │
                             ▼
  ┌─────────────────────────────────────────────────────────┐
  │  PHASE 4a: AUTOMATED EXTERNAL REVIEW                    │
  │  (Codex GitHub App, default when codex.enabled: true)   │
  │                                                         │
  │  4a UNAVAILABLE—codex.enabled: false, either helper   │
  │  script missing, or Codex App not review-ready:         │
  │    → skip 4a entirely; go straight to Phase 4b          │
  │                                                         │
  │  round ← 1                                              │
  │  Agent runs codex-review-request.sh                     │
  │    → Codex posts COMMENTED review OR 👍 reaction        │
  │                                                         │
  │  ┌─ no unaddressed P0/P1 findings → clearance           │
  │  ├─ P0/P1 findings → fix or reply; round += 1; repeat   │
  │  ├─ repeat-after-rebuttal → ESCALATE (tiebreaker)       │
  │  ├─ blocking budget spent → ESCALATE (tiebreaker)       │
  │  ├─ request ceiling spent → Phase 4b barrier            │
  │  └─ timeout (exit code 4) → FALL BACK to Phase 4b       │
  └──────────┬─────────────────┬────────────────┬───────────┘
             │                 │                │
             │ clearance       │ disagreement   │ timeout, spent
             │                 │ or runaway     │ ceiling, or 4a unavailable
             ▼                 │                ▼
  ┌──────────────────────────┐ │  ┌────────────────────────────┐
  │  MERGE GATE:             │ │  │  PHASE 4b: EXTERNAL REVIEW │
  │  codex-review-check.sh   │ │  │  (phase-4b-review.sh);     │
  │  (or the same conditions │ │  │                            │
  │   by hand when that      │ │  │  Entered on 4a timeout,    │
  │   helper is not on disk) │ │  │  spent ceiling or 4a       │
  │                          │ │  │  unavailable; never on     │
  │                          │ │  │  disagreement / runaway.   │
  │  • gh pr checks = green  │ │  │                            │
  │  • gate (b): cross-agent │ │  │  Automated Phase 4b: run   │
  │    APPROVED OR same-agent│ │  │  phase-4b-review.sh <PR#>  │
  │    + Codex thumbs-up     │ │  │  from a TRUSTED main-ref   │
  │  • gate (c): Codex clear │ │  │  checkout, never the PR's  │
  │    on HEAD via COMMENTED │ │  │  own checkout.             │
  │    no-P0/1 OR 👍 — OR a  │ │  │                            │
  │    Phase 4b APPROVED on  │ │  │  exit 0 → APPROVED posted  │
  │    HEAD from a non-author│ │  │    by a non-author agent   │
  │    reviewer              │ │  │    → merge gate → merge.   │
  │                          │ │  │  exit 1 → CHANGES_REQUESTED│
  │  (NEVER expects APPROVED │ │  │    → fix, push, re-run;    │
  │   state from Codex bot — │ │  │    cap reached → tiebreak. │
  │   the app does not emit  │ │  │  other nonzero → handoff.  │
  │   that state.)           │ │  │                            │
  └──────────┬───────────────┘ │  │  Manual handoff (only if   │
             │                 │  │  the above declines): post │
             ▼                 │  │  handoff, alert human, who │
  ┌──────────────────────────┐ │  │  takes it to a different   │
  │  nathanjohnpayne merges  │ │  │  agent CLI, relays feedback│
  │  (--squash). Done.       │ │  │  → APPROVED; issues filed. │
  └──────────────────────────┘ │  │  nathanjohnpayne merges.   │
                               │  └────────────────────────────┘
                               │
                               ▼
  ┌─────────────────────────────────────────────────────────┐
  │  HUMAN TIEBREAKER — STOP STATE                          │
  │                                                         │
  │  Reached by 4a repeat-after-rebuttal, a spent blocking  │
  │  budget (codex.max_blocking_reviews), a Phase 4b        │
  │  barrier human stop, and a spent Phase 4b round cap     │
  │  (phase_4b_automation.max_review_rounds).               │
  │                                                         │
  │  Post both positions on the PR → alert the human → WAIT.│
  │  NEVER falls back to Phase 4b. NEVER merges. NEVER hands│
  │  the dispute to another reviewer for a substitute       │
  │  APPROVED.                                              │
  └─────────────────────────────────────────────────────────┘
```

## Handoff Message Format

**Scope: this message belongs to Phase 4b's manual leg only.** It is posted once the automated Phase 4b review has declined—any non-zero exit from `scripts/phase-4b-review.sh` other than `1`, the script missing from disk, or `phase_4b_automation.enabled: false` for the repo. Crossing the Phase 3 threshold does not by itself call for this message: a threshold-triggered PR goes to [Phase 4a](#phase-4a-automated-external-review-codex-github-app) first, and on timeout or unavailability to [Phase 4b](#phase-4b-external-review-fallback), whose automated leg runs before any handoff. Phase 4a disagreement, Phase 4a runaway, and Phase 4b's own exhausted rounds never post it either—they stop for the human per [Disagreements and Tiebreaking](#disagreements-and-tiebreaking).

Once the manual leg is reached, the originating agent posts a PR comment and surfaces the following to the human:

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

2. **Runaway rounds.** A review keeps drawing blocking findings without converging. `codex.max_review_rounds` is the per-PR request ceiling (10 here, set by mergepath#2665), not this signal: the 11th request is refused, and a spent ceiling enters the Phase 4b barrier. The runaway meter is the blocking-review budget, `codex.max_blocking_reviews` (10 here): once that many solicited Codex responses are blocking, the requester refuses the next request and the review escalates to the human. At a spent ceiling, the Phase 4b barrier also stops for the human when every request the ceiling allowed drew a blocking review whose findings were not all fixed. A round whose blocking findings were all fixed is the review working, not a runaway. The canonical statement is [Mergepath REVIEW_POLICY.md § Disagreements and Tiebreaking](https://github.com/nathanjohnpayne/mergepath/blob/main/REVIEW_POLICY.md#disagreements-and-tiebreaking).

**Timeout is NOT a disagreement signal.** A Codex response timeout (`codex-review-request.sh` exit code `4` = `FALLBACK_REQUIRED`) routes the PR directly to Phase 4b per step 15a above. It is a fallback trigger, not a tiebreaker trigger. Phase 4b resolves it on its own—first via its automated review, then via the human-mediated handoff if that declines—so there is nothing for the disagreement detector to add on top.

**Phase 4b's two legs differ here.** Its manual leg—the traditional cross-agent CLI handoff, steps 11b–19b—uses the human's judgment directly: there is no automated detection loop to fire, so neither signal above applies to it. Its automated leg is bounded: the round ledger (mergepath#2663) counts completed `scripts/phase-4b-review.sh` rounds, and exhausting `phase_4b_automation.max_review_rounds` escalates to the human through the procedure below. It does not re-run the automation, does not fall through to the manual leg, and does not merge. See [Phase 4b](#phase-4b-external-review-fallback).

### Escalation procedure

When either of the two Phase 4a signals above fires—or when Phase 4b's automated review exhausts `phase_4b_automation.max_review_rounds`—the agent:

1. **Stops the automated loop immediately.** Does NOT push more commits, does NOT re-run the review (neither `@codex review` nor `scripts/phase-4b-review.sh`), does NOT run the merge gate, does NOT merge.
2. **Posts a comment on the PR** summarizing:
   - Which signal fired and what triggered it
   - Both positions (the agent's and the reviewer's) in plain language, with links to the specific review rounds and the rebuttal replies
   - The current round counter and a link to the terminating round's script output (`scripts/codex-review-request.sh` in Phase 4a, `scripts/phase-4b-review.sh` in automated Phase 4b)
3. **Alerts the human via chat** and waits for an explicit decision before taking any further action on the PR.

Note that timeout does NOT go through this escalation procedure. On a timeout (exit code `4` from `codex-review-request.sh`), the agent routes to [Phase 4b](#phase-4b-external-review-fallback) directly from step 15a—no in-place tiebreaker. Phase 4b starts at its automated leg; the handoff message per [Handoff Message Format](#handoff-message-format) is posted only if that leg declines.

The human resolves by one of:

- **Approving the existing state**—posting an `APPROVED` review as `nathanjohnpayne` or removing the `needs-external-review` label manually. This unblocks merge under the label-gate rules in [Review Policy Configuration](#review-policy-configuration). An outstanding non-author `CHANGES_REQUESTED` still blocks the merge (step 17a): the owner's own `APPROVED` does not release it. Release requires that reviewer to approve, dismissal of the blocking review, or an explicit owner tiebreak naming `BREAK_GLASS_REVIEW_DISAGREEMENT=<canonical-https-PR-URL>@<full-current-head-sha>`.
- **Requesting additional changes**—typing the feedback directly in chat. The agent addresses it as normal edits. No `@codex review` loop, no round counter.
- **Taking the PR over manually**—the human merges on behalf of the agent, or closes and reopens with a different approach, or promotes the escalation to Phase 4b manually.

The agent never resolves a fired escalation signal on its own.

## External-clearance enforcement in this repository

This repository enables `codex.external_review_gate.enabled` in `.github/review-policy.yml`. The required `Merge clearance gate` uses the trusted base policy to enforce the existing current-head external-clearance predicate for applicable threshold, protected-path, or explicitly labeled PRs, preserving verified-propagation exemptions. A missing or false switch skips this external-review arm; the separate Dependabot arm keeps its own setting. Keep the direct `codex.enabled` master switch before nested `enabled` fields so existing readers honor it; disabling Codex routes clearance through the permitted Phase 4b substitute rather than accepting a Codex bot signal.

```yaml
codex:
  enabled: true
  external_review_gate:
    enabled: true
```

This activation was the prerequisite for the [owner-approved approval-count alignment](https://github.com/nathanjohnpayne/mergepath/issues/1059#issuecomment-5658411944). That alignment has since landed: live protection read on 2026-09-29 shows `required_approving_review_count: 0`. A zero branch-protection approval count removes GitHub’s approval-object requirement; it does not bypass checker gate (b). That gate still requires a reviewer-identity `APPROVED` review unless the existing same-agent, current-head Codex fallback passes. Only that permitted fallback carries Phase 4 without an `APPROVED` review; Phase 4b still applies when required by fallback or complex-change policy, and all other gates remain. Administrator enforcement is a separate rollout; see the next section.

## Do the merge gates bind the merging identity?

**No.** `main` requires seven status checks (`CodeRabbit unresolved blocking findings`, `Codex P1 unresolved threads`, `Label Gate`, `Merge clearance gate`, `Self-Review Required`, `build-and-test`, `lint`) on an up-to-date branch, but `enforce_admins` is false, and the branch API reports the checks as `enforcement_level: non_admins`. `nathanjohnpayne` performs every merge and is a repository administrator, so for that account every required check is advisory: GitHub lets it merge with a required check red, pending, or never reported. The gates bind every other account. They bind the merging account only by convention. This reading was taken from live protection on 2026-09-29 (#1024).

`scripts/hooks/gh-pr-guard.sh` refuses `gh pr merge --admin` without `BREAK_GLASS_ADMIN=1`, and a merge against a `BLOCKED` merge state without `BREAK_GLASS_MERGE_STATE=1`. It is a Claude Code PreToolUse hook, so it governs merges issued through an agent session's Bash tool and nothing else: not the GitHub web UI, not a plain terminal, not any other client.

**Detection.** `.github/workflows/merge-bypass-audit.yml` runs on every push to `main`, plus a sweep every 30 minutes that re-audits every update of `main` in the last 180 minutes, including force pushes. The sweep reads the repository activity API, which records when a ref moved, not commit dates, which an old commit can carry. A push carrying `[skip ci]` never starts a push-triggered run, but it cannot suppress a schedule. The sweep is best-effort, because GitHub can delay or drop scheduled runs. The wide lookback rides out a few missed sweeps, and the weekly `pr-audit.yml` remains the backstop. For each pushed commit it rebuilds every required check's state at the moment of the merge, taking the latest run per triggering event among the suites GitHub's rollup counts for the PR, which is the rule that matches every merge whose gate outcome is known (see the recovery section below). The required set is the union of classic protection and any applicable ruleset. It also checks that the PR head contained the tip of `main` it merged onto, since protection requires an up-to-date branch. That freshness check runs only when the up-to-date requirement is known and the merge base is unambiguous. On a push it always is. A backfilled multi-commit PR landed as a single commit could be a squash or a rebase, so its base is unknown and the run reports freshness as not audited instead of guessing. When an audited check or the freshness test shows the merge would have been blocked for a non-administrator, it opens a `policy-violation` issue within minutes. A pushed commit that no merged pull request produced is reported as a direct push, and a push that is not a fast-forward is reported as a rewrite of `main`. The job also fails, so the commit on `main` shows a red X. A required context with no app pin can be satisfied by a commit status, and GitHub may judge statuses on the PR's test merge commit, which cannot be recovered after the merge. Such contexts are judged on the head commit only and marked that way. Every required check here is pinned to GitHub Actions today, and its `pull_request` check runs attach to the head. **What it does not audit:** review requirements. A merge that bypasses only an outstanding `CHANGES_REQUESTED` review (which blocks a non-administrator even with the approval count at zero), or a future approval-count or conversation-resolution requirement, produces no issue. As of 2026-09-29 the approval count is zero and conversation resolution is off. The weekly `pr-audit.yml` stays as the retrospective backstop. An issue from this workflow is not an accusation, because an authorized break-glass merge produces one too: record who authorized it in a comment and close it. To audit an earlier merge, dispatch the workflow with its PR number.

**Enforcement is separate and staged.** Turning on `enforce_admins` is an owner-authorized settings change, tracked fleet-wide in [mergepath#937](https://github.com/nathanjohnpayne/mergepath/issues/937) under ADR 0002, and it is not enabled here. It must not be enabled until every required check that can go stale has the in-place recovery below, because with administrators bound a check that cannot be turned green deadlocks the PR with no escape.

### Recovering from a stale required check

The merge gate does not simply read the rollup's list. Measured against merges with a known outcome (#1072), a required check's state comes from the **latest run per triggering event** among the suites the rollup counts:

- A newer run of the **same** event supersedes an older red one. #1078 merged `CLEAN` while its rollup still listed a red `Label Gate` from an older `pull_request` suite next to a green one from a newer `pull_request` suite.
- A run of a **different** event does not. #1071 stayed `BLOCKED` on a red `pull_request` gate despite green `pull_request_review` runs until the red run was rerun.
- Suites from events the rollup leaves out do not count at all. #1068 merged `CLEAN` with three red `pull_request_review_comment` suites on its head.

So a stale red run is retired by a rerun in place, by a newer run of the same event (for example a PR body edit, which fires `pull_request: edited`), or by a new head commit.

1. **Enumerate what the rollup counts**, not what the check-runs page shows. Query GraphQL `statusCheckRollup.contexts` on the PR's head commit, paginated, since a PR with many review events carries well over 100 contexts. Keep every node whose conclusion blocks a merge: `FAILURE`, `CANCELLED`, `TIMED_OUT`, `ACTION_REQUIRED` and `STARTUP_FAILURE`, not only `FAILURE`. Fetch `checkSuite.workflowRun { databaseId event }` as well, and drop any red node that a newer run of the same required check and the same event supersedes; the rest are what block. Take each remaining one's `checkSuite.workflowRun.databaseId`.
2. **Make the underlying condition true first.** Reply to and resolve the threads, remove the label through the sanctioned path, or fix the body. A rerun made before that fails again and adds nothing.
3. **Rerun each counted red run in place:** `gh run rerun --failed <run-id>` for a `FAILURE`. `--failed` reruns only failed jobs, so for the other blocking conclusions use a whole-run `gh run rerun <run-id>`. This works for every required gate that reads live state: `Codex P1 unresolved threads`, `Merge clearance gate`, `CodeRabbit unresolved blocking findings`, and `Label Gate`, which reads the PR's live labels since [mergepath#1339](https://github.com/nathanjohnpayne/mergepath/issues/1339) (in this repo since #1071). `build-and-test` and `lint` depend only on the head commit, so a rerun settles a flake.
4. **A gate that reads the frozen event payload cannot be retired by a rerun,** because GitHub replays the original payload. `Self-Review Required` is the remaining one: it validates `github.event.pull_request.body`. Fix and save the PR body instead. `pr-review-policy.yml` listens for `pull_request: edited`, so the edit produces a newer `pull_request` run that supersedes the stale red one under the rule above, and approvals are not dismissed. A new head commit also works, but it dismisses stale approvals (`dismiss_stale_reviews` is on) and restarts the review round, so keep it as the fallback. Before #1071, `Label Gate` was in this class too: #1067's third attempt ran 78 seconds after the label was removed and still failed on it.
5. **Break-glass stays human-only.** `BREAK_GLASS_MERGE_STATE=1` and `--admin` need the human's authorization in chat. A break-glass merge past a red, pending or missing required check, or onto a stale branch where freshness was audited, opens an issue through the detector above. One that bypasses only a review requirement does not.

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
  max_review_rounds: 10                       # request ceiling; the 11th request is refused and routes through the Phase 4b barrier
  max_blocking_reviews: 10                    # blocking-review budget; a request is refused once 10 solicited blocking reviews exist (mergepath#1560)
  review_timeout_seconds: 1800                # per-round poll timeout (measured response p95/max, mergepath#1550)
  require_ci_green: true                      # merge gate

# Automated Phase 4b (see Phase 4b above). Governs whether the authoring
# agent runs scripts/phase-4b-review.sh itself instead of posting the
# manual handoff. Ships DISABLED, and this example keeps that default:
# enabling it lets a headless reviewer CLI post real GitHub reviews under a
# reviewer PAT, so each repo opts in only after validating the adapters from
# its own enablement environment (see scripts/phase-4b/README.md, Enabling).
# THIS repo has opted in (enabled: true, mode: local)—read the repo's actual
# .github/review-policy.yml for its live values, not this example.
# Full knob reference: scripts/phase-4b/README.md.
phase_4b_automation:
  enabled: false                              # ships off; opt in per repo after validation
  mode: local                                 # 'local' shells out; 'manual' defers to the human
  max_review_rounds: 3                        # enforced per-PR cap (round ledger, mergepath#2663); a 4th completed round is refused
  fail_closed: true                           # ambiguous verdict never becomes APPROVED
  post_review_issues: true                    # file post-review issues on a findings-carrying APPROVED
```

> **Note on `enabled` flags (both `coderabbit` and `codex`).** These flags govern **agent behavior only**—whether the authoring agent waits for the corresponding review in its phase. They do NOT control whether the underlying GitHub App runs. Both apps run based on their own install state on GitHub, independent of what this YAML says. Setting `enabled: false` alone will cause the agent to skip the corresponding phase while the app continues to post reviews silently in the background. This may be desired as a "dark launch," but can confuse readers who expect the flag to mean "off." To fully disable an integration, uninstall the GitHub App AND set the flag to false.

### Threshold Evaluation

A PR requires external review if **either** condition is true:

1. Total non-generated lines changed (additions + deletions) ≥ `external_review_threshold`. Lockfiles (`*.lock`, `*lock.json`), minified files (`*.min.js`, `*.min.css`), and generated files (`*.generated.*`) are excluded from the count.
2. Any file in the PR diff matches a pattern in `external_review_paths`

The agent evaluates this after internal review passes, before merging. CI workflows may also evaluate and label earlier as an advisory (see Phase 3 note above). Independently of this threshold, when `codex.request_by_default: true` (an explicit opt-in; absent means `false` since #2240, and mergepath sets `false`, #2166) the agent posts `@codex review` on every PR—for an under-threshold PR it does so in [Phase 3 step 9](#phase-3-external-review-threshold-check) before merging, via `scripts/codex-review-request.sh`; see [`codex.request_by_default`](#codexrequest_by_default--request-codex-on-every-pr-486) above. The threshold still governs the **merge gate** (whether external clearance is *required* to merge): on an under-threshold PR the Codex trigger is **advisory** and never blocks the merge, while on an above-threshold PR the same trigger is the gating Phase 4a entry. `request_by_default` governs only whether the Codex trigger is *posted*, not whether clearance is required.

## Git Identity Switching

Agents must automate identity switching so that commits and PR activity are attributed to the correct GitHub account. The mechanism depends on the agent's environment, but the result must be:

- Commits during authoring use `nathanjohnpayne`'s name and email.
- Review comments and PR reviews are posted via `nathanpayne-{agent}`'s GitHub credentials.
- The switch is fully automated within the agent session—no human intervention required for internal review.

### Git commit identity (user.name / user.email)

Commit identity is **not** switched per session, and never per repository. Every agent commits as the human author identity, which lives in the machine's **global** git config (`~/.gitconfig`) next to `user.signingkey`—so `git commit` attributes and signs correctly in every repo and every worktree with no per-session step. Reviewer identities (`nathanpayne-{agent}`) never author commits; they exist for GitHub API activity only, and that attribution comes from the PAT wrappers described below, not from git config.

```bash
# Verify the identity a commit here would use, and where it comes from.
git config --show-origin --get user.name
git config --show-origin --get user.email
git config --show-origin --get user.signingkey
```

Provisioning the real human author identity belongs to verified machine setup, outside every managed checkout. This policy deliberately publishes no copy-pastable identity setter with placeholder values: if any verified value above is absent or wrong, stop and run the approved machine-setup flow, then repeat the read-only checks before committing.

**Never run a bare `git config user.name` / `git config user.email` inside a managed checkout.** Without `--global`, `git config` writes the *current repository's* `.git/config`, which every worktree of that repository shares. Such an override is invisible to `git config --global --get user.email`, outlives the session that made it, and silently reattributes—and, when `commit.gpgsign` is set alongside it, unsigns—every later commit from every worktree. That corruption reached `main` twice under an undeliverable `.example` fixture address before anyone noticed ([mergepath#777](https://github.com/nathanjohnpayne/mergepath/issues/777)), and an earlier revision of this very section, which instructed a bare repo-local `git config user.email`, is how it got there. `scripts/ci/check_git_identity_hygiene` now fails on both the leftover override and on the instruction shape that produces it.

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
GH_TOKEN="$OP_PREFLIGHT_AUTHOR_PAT" gh pr merge <PR#> --merge --match-head-commit <full-current-head-sha>

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

### `codex.request_by_default`—request Codex on every PR (#486)

`codex.request_by_default` (default `false` when the key is absent since #2240, by owner decision on 2026-10-15—it was `true` under #486; **mergepath sets it to `false`** explicitly since #2166) decouples `@codex review` trigger from the external-review threshold. It governs whether **the agent** posts `@codex review` on every PR: the agent is the caller that runs `scripts/codex-review-request.sh` from the workflow, and there is no separate workflow auto-caller that posts the trigger on its own.

- **`true`**—the agent runs `scripts/codex-review-request.sh` on **every** PR, independent of `external_review_threshold` / `external_review_paths`, so `@codex review` trigger is posted on under-threshold PRs too. For an under-threshold PR the agent posts it during [Phase 3 step 9](#phase-3-external-review-threshold-check) **before merging**, and the trigger is **advisory**—it does not gate the merge (the threshold governs the merge gate; see [Threshold Evaluation](#threshold-evaluation) below). For an above-threshold PR the same trigger is the Phase 4a entry that *does* gate the merge. This was the full-automation default ([#483](https://github.com/nathanjohnpayne/mergepath/issues/483)) until #2240; it is now an explicit opt-in, and a repo that sets it keeps it.
- **`false`** (and the key absent)—the pre-#486 behavior, mergepath's setting since #2166, and the default for every repo that does not set the key since #2240: the agent requests Codex only when the PR independently qualifies for Phase 4a (lines ≥ threshold **or** a protected-path match), i.e. only as the Phase 4a entry. Under-threshold PRs get no `@codex review` request and clear by reviewer-identity approval plus the required gates. The owner set this on 2026-10-13 after measuring that 88 of 223 under-300-line PRs (39%) drew a Codex round the under-threshold path never required; it narrows the owner rule of 2026-07-04 ("Codex must always be invoked") to Phase 4 PRs, on which Codex remains mandatory on every round.

The key is **orthogonal to `codex.enabled`**: it governs only *when* the trigger is posted, never *whether* Codex participates. When `codex.enabled: false`, Phase 4a is off and no trigger is posted regardless of `request_by_default`.

The key never weakens mandatory review. A PR at or over `external_review_threshold`, touching `external_review_paths`, or carrying `needs-external-review` is requested whatever the key says (the caller sets `MERGEPATH_PHASE_4A_GATED=true`, or, without the flag, the requester derives the gate from the PR, #2257), and the Phase 4b classifier triggers are unaffected. An unreadable policy fails toward requesting (#2240): a missing or unparseable policy file, a missing YAML parser (`yq`), a `codex:` block that is present but empty or null, a duplicated key or `codex:` block in any YAML style (block, flow or quoted, counted from the parser's own key list), or a value that is not a YAML boolean (a quoted `'false'` is a string) makes the requester post the trigger with a warning naming the cause (#2245). Only a well-formed `false`, or the key or the whole `codex:` key absent from a policy that parses, skips the request.

`scripts/codex-review-request.sh` parses both keys (`enabled` via the same `codex_field` helper as the rest of the `codex:` block; `request_by_default` through `yq`, with an explicit `has()` presence test, because yq's `//` operator reads an explicit `false` as missing) and applies them as a Phase 4a entry gate *before* any signal scan or trigger write. A caller that exports `MERGEPATH_PHASE_4A_GATED=true` marks the PR as gated: it is requested whatever `request_by_default` says, and neither the key nor the PR is read for the decision; the under-threshold Phase 3 step 9 call omits it. Without the flag, when the key resolves to false, the requester derives the gate from the PR itself (#2257): the `needs-external-review` label, lines changed against `external_review_threshold` and changed files against `external_review_paths`, with the threshold and paths read from the policy that governs the PR's base, and the PR's head, base, default branch and labels re-read before a skip. Every input is read with the labeler's own reader: the threshold from the raw top-level line's second token, and the paths through `scripts/workflow/parse_policy_list.sh`; no YAML parser is consulted, and a threshold the labeler would not read as written is unreadable. An input it cannot read, or a PR that changes during the reads, counts as gated, and only a PR read as not gated on every signal is skipped. When the gate decides to skip, the script emits JSON with `trigger_requested: false` and exits `5` (`NO_TRIGGER_REQUESTED`)—distinct from a timeout (`4`) or an API error (`3`).

