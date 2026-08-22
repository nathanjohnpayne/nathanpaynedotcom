---
title: "Agent Approval Workflow and the Genesis of Mergepath"
seoTitle: "Agent Approval Workflow and Mergepath"
shortTitle: "Agent Approval Workflow"
description: "AI coding agents, like humans, will skip code review if you let them. Building the enforcement infrastructure that makes multi-agent development actually work—from instruction files to GitHub rules to automated cross-agent review."
seoDescription: "How AI coding agents skip review, and the enforcement system behind Mergepath: instruction files, branch rules, reviewer identities, and Codex review."
author: "Nathan Payne"
date: 2026-04-16
tags: ["AI", "Engineering", "Product", "Systems", "Code Review"]
image: "/og/blog/agent-approval-workflow-genesis-of-mergepath.png"
keyTakeaways:
  - "Instruction files give an agent context, not compliance. If a behavior matters, make its absence mechanically impossible — branch protection, a PR-creation hook, a merge gate."
  - "Having an agent review its own code under a separate reviewer identity produces measurably better reviews than asking for a review in the same conversation. The cost is one extra account."
  - "Fresh eyes beat familiarity: template code reviewed seven times by the same reviewer gave up seventeen more bugs the first time a different agent read it in a new repository."
  - "Agent reliability is an infrastructure problem, not a capability problem. The agent that shipped clean code was the same model as the one that tried to push straight to main."
pullquotes:
  - text: "Bots, just like humans, require code review. Without it, bugs crop up, features are missed, and the code shipped is of lower quality."
    label: "The discovery"
    accent: blue
  - text: "Like humans, they'd selectively remember the rules based on what was easiest, or what they could seemingly think they could get away with."
    label: "Why instruction files are not enough"
    accent: red
  - text: "Seventeen bugs in code that had already been reviewed seven times on the template repo. Fresh eyes found what familiarity missed."
    label: "What propagation taught me"
    accent: blue
  - text: "The difference between a well-intentioned agent and a reliable one is not a smarter model. It is enforcement infrastructure."
    label: "The systemic lesson"
    accent: red
sidebar:
  - type: mermaid
    title: "Five stages of agent review enforcement"
    description: "The enforcement path progresses from instruction files to branch rules, separate-identity self-review, external review for complex changes, and finally automated Codex review."
    content: |
      graph TD
          A["Instruction files only<br/>(AGENTS.md, CLAUDE.md)"] --> B["GitHub branch rules<br/>(require PRs)"]
          B --> C["Self-review under<br/>separate identity"]
          C --> D["External review for<br/>complex changes (>300 lines)"]
          D --> E["Automated external<br/>review via Codex App"]
          style A fill:#e8b4b4,stroke:#993d3d,color:#333
          style B fill:#d4a84b,stroke:#a07830,color:#fff
          style C fill:#d4a84b,stroke:#a07830,color:#fff
          style D fill:#7bc67e,stroke:#4a8a4d,color:#fff
          style E fill:#4a90d9,stroke:#2c5f8a,color:#fff
    caption: "The five stages of agent review enforcement"
---

The rule was written down in every file the agents read: never push directly to `main`, every change goes through a pull request. They had all read it. Any of them could quote it back to me. And then one of them would push straight to `main` anyway—usually on a change small enough not to feel like it counted, usually right after I had said "just fix this quickly."

Two things were going on, and neither of them is really about AI. The first is that review only happens when something forces a pause, and an agent left to itself never pauses—it goes from prompt to pushed commit with no point where anyone is expected to look. The second is that a rule that exists only as a sentence in a document gets followed when following it is convenient. Human teams answered that one a long time ago with tooling that refuses the wrong action instead of a handbook that describes it. Agents need the same answer, for the same reason. Writing the rule more clearly does not work. Making the wrong action impossible does.

[Mergepath](https://github.com/nathanjohnpayne/mergepath) (originally `ai_agent_repo_template`) is what that answer turned into: a set of files you drop into a repository that force any AI agent working in it—and the human running it—down the same path. Canonical documentation, so each rule has exactly one home. Binding CI constraints, which fail the build rather than warn. Multi-identity code review—the GitHub account that writes a change is never the account that approves it. And, for the changes big enough to need an outside opinion, automated external review through the OpenAI Codex GitHub App, a bot that posts a code review on a pull request when you ask it to. It took roughly six weeks of daily use across six production repositories to arrive at the current architecture, and it now runs across nine.

None of this was designed top-down from an engineering principles textbook. I am a product manager, not an engineer; I picked up AI coding agents because I wanted to build things faster, and the system grew bottom-up, from watching them misbehave. Every major feature was born from a specific failure I watched happen in real time.

This post is about those failures and the enforcement infrastructure they produced.

## The discovery: bots need code review

The first thing I noticed, within a week of using Claude Code and Cursor full-time, is that AI coding agents produce substantially better output when asked to review their own work before shipping it.

This sounds obvious. It is obvious. Every developer knows that self-review catches mistakes. But the practical implication for agent-driven development is not obvious at all: **the default agent workflow—prompt, generate code, commit, push—skips review entirely.** The agent treats code generation as a single atomic act. There is no natural pause between "I wrote the code" and "I shipped the code" unless you build one.

I started by asking agents to review their own code in the same chat session. Even that crude approach—"now review what you just wrote"—found real bugs. Missing error handling, unquoted shell variables, and race conditions in concurrent workflows. The agent would confidently generate code, then catch its own mistakes when asked to look again with a reviewer's eye.

More surprisingly, if I asked the agent to post its review under a *different GitHub identity*—to literally switch from `nathanjohnpayne` (the author) to `nathanpayne-claude` (the reviewer) and submit it as a formal GitHub PR review—the quality of the self-review improved noticeably. The act of assuming a different identity made the agent take the review more seriously. It would catch things in the reviewer persona that it missed in the author persona, even though it was the same model with the same context window and looked at the same code.

I do not have a mechanistic explanation for why identity-switching improves review quality. I have empirical evidence that it does so consistently across Claude Code, Cursor, and Codex. The practical consequence is that every agent in my system now has two GitHub identities: an author identity (`nathanjohnpayne`, shared across all agents) and a reviewer identity (`nathanpayne-claude`, `nathanpayne-cursor`, `nathanpayne-codex`). Every PR is authored under one and reviewed under the other.

## Why instruction files are not enough

The second thing I noticed is that agents, like humans, would prefer to commit changes without doing a PR at all.

I first tried to solve this with instruction files. Claude Code reads `CLAUDE.md`. Cursor reads `.cursorrules` and `.mdc` files. Codex reads `AGENTS.md`. I added explicit rules to all of them: "Never push directly to main. All changes must go through a pull request."

Like humans, they would selectively remember the rules based on what was easiest, or what they could seemingly think they could get away with.

The agent would read `CLAUDE.md`, see the rule about PRs, and then—when the change was small, or when it was in a hurry to show results, or when I said "just fix this quickly"—push directly to main anyway. Not every time. Not even most of the time. But often enough that I could not trust the instruction file alone.

This is the same dynamic that makes honor-system processes fail in human teams. If the only enforcement mechanism is "we all agreed to follow the rules," someone will eventually skip the rules when the rules feel inconvenient. The solution for human teams is tooling: branch protection, required reviews, CI gates. The solution for agent teams is the same tooling, applied with the same rigor.

## Adding teeth: GitHub rules and CI enforcement

I started with GitHub branch protection rules: require a pull request before merging to main. This immediately broke the agent's ability to push directly, which is what I wanted. But it also created a new problem: the agent would open a PR with no self-review section and no description of what changed, and merge it immediately with their own approval.

So I added a [PreToolUse hook](https://github.com/nathanjohnpayne/mergepath/blob/main/scripts/hooks/gh-pr-guard.sh) that intercepts every `gh pr create` call and blocks it unless the PR body contains both an `Authoring-Agent:` header and a `## Self-Review` section. The hook runs locally in the agent's Claude Code session, before the GitHub API call is made. If the agent tries to create a PR without the required sections, the hook returns exit code 2 and the PR is never created.

```bash
# From scripts/hooks/gh-pr-guard.sh — the create guard
if ! echo "$COMMAND" | grep -qi 'Authoring-Agent:'; then
  MISSING="${MISSING}  - Missing 'Authoring-Agent:' in PR body\n"
fi
if ! echo "$COMMAND" | grep -qi '## Self-Review'; then
  MISSING="${MISSING}  - Missing '## Self-Review' section\n"
fi
```

This is not a sophisticated check. It is a substring match. But it works because the agent now has a concrete, enforceable contract: every PR must identify who wrote it and contain a structured self-review. The agent cannot skip this because the hook runs before the API call, not after.

The same hook also blocks `gh pr merge --admin` unless `BREAK_GLASS_ADMIN=1` is explicitly set by the human in chat. This prevents agents from bypassing branch protection rules, which they will attempt when stuck in a merge-conflict loop or when a CI check is failing and they want to "just ship it."

## The threshold: when self-review is not enough

Self-review under a separate identity catches a lot. But for complex changes—PRs spanning hundreds of lines across multiple files—a single agent reviewing their own work hits diminishing returns. The agent's blind spots are correlated with its authoring decisions. It will not question its own architectural assumptions because those assumptions felt correct when it made them.

I adopted a threshold: changes under 300 lines of diff, or changes that do not touch security-sensitive paths, get self-review only. Changes above 300 lines, or changes touching `.github/**`, `src/auth/**`, `src/payments/**`, or files matching `**/*secret*` / `**/*credential*`, require external review by a *different* agent.

```yaml
# From .github/review-policy.yml
external_review_threshold: 300

external_review_paths:
  - "src/auth/**"
  - "src/payments/**"
  - "**/*secret*"
  - "**/*credential*"
  - ".github/**"
```

The external review threshold is enforced by a [CI workflow](https://github.com/nathanjohnpayne/mergepath/blob/main/.github/workflows/pr-review-policy.yml) that runs on every PR. When a PR crosses the threshold, the workflow applies the `needs-external-review` label. That label blocks merge via a separate Label Gate check. The PR cannot be merged until the label is removed by the review process.

For months, external review meant a manual handoff. I would take the PR's handoff message to a different agent CLI session—typically Cursor or Codex—relay the context, wait for the review, relay the feedback back to the original agent, and iterate until the external reviewer approves. This worked but did not scale. Each handoff took 5–10 minutes of my time, and complex PRs could go through three or four rounds.

## The automation: Codex-in-GitHub

In April 2026, OpenAI enabled the [Codex GitHub App](https://chatgpt.com/codex/cloud/settings/code-review) for automated code review. When installed on a repository and triggered with `@codex review`, the app posts a standard GitHub code review with inline findings tagged by priority (P0–P3).

I saw the opportunity immediately: if Codex can review PRs via the GitHub API, the entire external-review handoff can be automated. The agent posts `@codex review`, waits for the response, addresses findings, and iterates—all without me in the loop.

Building this took [Project #2](https://github.com/users/nathanjohnpayne/projects/2): 46 tracked items across 5 phases, roughly 30 PRs, and more edge cases than I expected.

**The Phase 4a automated review flow:**

```mermaid title="Automated external review decision flow" description="A threshold-triggered pull request enters Codex review; clean clearance reaches the merge gate, findings loop back through fixes or rebuttals, timeouts fall back to Phase 4b, and gate failures are diagnosed before retry."
graph TD
    A["PR crosses threshold<br/>or touches protected path"] --> B["needs-external-review<br/>label applied by CI"]
    B --> C["Agent runs<br/>codex-review-request.sh"]
    C --> D{"Codex responds?"}
    D -->|"👍 reaction<br/>(no findings)"| E["codex-review-check.sh<br/>verifies merge gate"]
    D -->|"Review with<br/>P0/P1 findings"| F["Agent fixes or<br/>posts rebuttal"]
    D -->|"Timeout<br/>(10 min)"| G["Fall back to<br/>Phase 4b manual"]
    F --> C
    E -->|"All gates pass"| H["Merge"]
    E -->|"Gate fails"| I["Agent diagnoses<br/>and retries"]

    style A fill:#4a90d9,stroke:#2c5f8a,color:#fff
    style B fill:#d4a84b,stroke:#a07830,color:#fff
    style C fill:#4a90d9,stroke:#2c5f8a,color:#fff
    style D fill:#e07c5a,stroke:#b35937,color:#fff
    style E fill:#7bc67e,stroke:#4a8a4d,color:#fff
    style F fill:#e8b4b4,stroke:#993d3d,color:#333
    style G fill:#e8b4b4,stroke:#993d3d,color:#333
    style H fill:#7bc67e,stroke:#4a8a4d,color:#fff
    style I fill:#d4a84b,stroke:#a07830,color:#fff
```

Two helper scripts do the heavy lifting:

[`codex-review-request.sh`](https://github.com/nathanjohnpayne/mergepath/blob/main/scripts/codex-review-request.sh) posts the `@codex review` trigger comment, polls for a response from `chatgpt-codex-connector[bot]` every 15 seconds for up to 10 minutes, and emits a machine-parseable JSON summary of what Codex produced. The script handles a behavioral quirk of the Codex GitHub App that took live observation to discover: Codex never posts `APPROVED` reviews. When it has no findings, it posts a 👍 reaction on the PR issue instead. When it has findings, it posts a `COMMENTED` review with inline comments tagged `![P0 Badge]` through `![P3 Badge]`.

[`codex-review-check.sh`](https://github.com/nathanjohnpayne/mergepath/blob/main/scripts/codex-review-check.sh) is a read-only merge gate that verifies three conditions before allowing the agent to merge:

1. **Gate (a):** Required CI checks are green
2. **Gate (b):** At least one reviewer identity (`nathanpayne-claude`, `nathanpayne-codex`, etc.) has posted a latest-state `APPROVED` review
3. **Gate (c):** Codex has cleared on the current HEAD—either a `COMMENTED` review with no unaddressed P0/P1 findings, or a 👍 reaction within the freshness window

Gate (c) was the hardest to get right. Over three rounds of review on [PR #65](https://github.com/nathanjohnpayne/mergepath/pull/65), `nathanpayne-codex` kept finding edge cases in the "when did this commit become the current HEAD" anchor that the gate uses to filter stale reactions. The fundamental problem: GitHub's REST and GraphQL APIs do not expose a per-PR push timestamp for ordinary fast-forward pushes. The timeline endpoint has a `committed` event for each commit, but its `created_at` field is `null`. Force-push events have timestamps; regular pushes do not.

The solution was a two-layer defense: use `head_ref_force_pushed` events from the PR-scoped timeline for force-push cases, and bound the residual exposure of ordinary-push-with-old-committer-date cases with a configurable freshness window (`reaction_freshness_window_seconds`, default 1800). A 👍 reaction older than 30 minutes is filtered out regardless of what committer date the new HEAD carries. It is not a complete fix—the hole is documented in the code—but it is the best available given the API's constraints.

## The hook: seven rounds of parser bugs

The most instructive artifact of the entire project is [PR #66](https://github.com/nathanjohnpayne/mergepath/pull/66), which extended `gh-pr-guard.sh` to block `gh pr merge` on labeled PRs unless `CODEX_CLEARED=1` is set.

The hook needs to parse `gh pr merge` commands to extract the PR selector (which can be a number, a URL, or a branch name), detect `--admin` flags, and check whether the target PR carries `needs-external-review`. It also needs to handle inline environment prefixes, such as `CODEX_CLEARED=1 gh pr merge 65`, because that is the documented merge format.

[PR #66](https://github.com/nathanjohnpayne/mergepath/pull/66) went through **seven rounds** of `nathanpayne-codex` review. Each round caught a new parser bug:

| Round | Bug | Bypass mechanism |
|---|---|---|
| 2 | Bash word splitting ignored shell quotes | `--body "hello world"` split into two tokens |
| 3 | `--repo` extraction missed `-R` short form | `-R foo/bar` not forwarded to label lookup |
| 4 | Top-level matcher missed global flags | `gh -R foo/bar pr merge` bypassed all guards |
| 5 | Inline env vars not captured from prefix | `CODEX_CLEARED=1 gh pr merge` exited 0 before any guard ran |
| 6 | Walk treated `echo gh pr merge` as a real merge | Command-position detection was too loose |
| 7 | `--admin` detected via substring grep | `--subject "--admin follow-up"` falsely blocked |

After round 7, I pushed to have the review ship. But the underlying pattern was clear: every fix that relaxed the matcher to handle a new form also opened a new false-positive or false-negative path. Bash string parsing is the wrong tool for parsing shell command grammar. The hook eventually switched to Python `shlex.split` with a hand-rolled wrapper for unquoted-newline normalization and NUL-delimited bash handoff—a decision that was supposed to be investigated via [issue #67](https://github.com/nathanjohnpayne/mergepath/issues/67) but ended up being forced by propagation-time Codex findings.

## What propagation taught me

The most humbling part of the project was Phase 4: propagating the template to six downstream repositories.

I estimated 60 minutes for all six. It took over three hours for the first two—[swipewatch](https://github.com/nathanjohnpayne/swipewatch/pull/33) and [nathanpaynedotcom](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/180)—because Codex's review of the freshly-propagated files surfaced **seventeen distinct template bugs** that had not been caught during the template's own development.

These were not trivial findings. Three were privilege-escalation vectors where a crafted command could spoof `CODEX_CLEARED=1` or `BREAK_GLASS_ADMIN=1`. Four were findings-semantics bugs where the wrong review round's comments were being considered for merge-gate clearance. Five were tokenizer bugs that evolved through the xargs → shlex migration. Two were wholesale-copy regressions where per-repo config customizations (`functions/**` in protected paths, `coderabbit.enabled: true`) were silently overwritten by template defaults.

Seventeen bugs in code that had already been reviewed seven times on the template repo. Fresh eyes found what familiarity missed.

The lesson: **propagation is implicitly a fresh-eyes code review.** When you take code that was developed and reviewed in one context and deploy it to a different repo where Codex has never seen it before, the review quality resets to first principles. Codex on the template repo had gotten familiar with the code over many rounds; Codex on swipewatch was seeing it for the first time and was not tired of looking at the same functions.

After fixing all seventeen bugs via a consolidated [back-port PR](https://github.com/nathanjohnpayne/mergepath/pull/76), the remaining four repos propagated cleanly in under ten minutes.

## The five dry-run scenarios

Before propagation, I ran five controlled scenarios against the template's own infrastructure to validate each path through the Phase 4a flow:

**Dry-run A (happy path, [PR #71](https://github.com/nathanjohnpayne/mergepath/pull/71)):** Clean PR, Codex 👍 in 147 seconds, merge gate green, merged. Single round.

**Dry-run B (fix-and-repass, [PR #72](https://github.com/nathanjohnpayne/mergepath/pull/72)):** PR with a deliberate unquoted shell variable. Codex flagged it as P2. Fixed, re-requested, and Codex cleared. Two rounds. Merged.

**Dry-run C (disagreement, [PR #73](https://github.com/nathanjohnpayne/mergepath/pull/73)):** PR with a `set +e` pattern I had a defensible rebuttal for. Codex flagged it. I posted the rebuttal. Codex re-flagged the same issue with a *stronger* argument that directly addressed my rebuttal. That is the repeat-after-rebuttal signal—the agent stops the loop, posts an escalation comment with both positions, and alerts the human as a tiebreaker. **Closed without merging.**

The dry-run C result was the most informative: Codex does not blindly re-run reviews. It reads the conversation and pushes back contextually. Round 2's finding explicitly said "for a valid class of inputs"—a phrase that directly countered my "bounded input space" rebuttal. That level of contextual awareness changes the cost-benefit calculation for automated review significantly.

**Dry-run D (multi-finding, [PR #74](https://github.com/nathanjohnpayne/mergepath/pull/74)):** PR with multiple deliberate issues. Codex found both P1s in the *same* review. This means the "runaway" scenario from the issue (three rounds of new issues each round) does not naturally occur—Codex's review pattern is "find everything at once," not "one finding per round." The `max_review_rounds: 2` runaway guard is a safety belt that may rarely fire in practice.

**Dry-run E (CI red, [PR #70](https://github.com/nathanjohnpayne/mergepath/pull/70)):** PR with a deliberate CI failure (forbidden `vendor/` directory). Codex actually caught the CI failure itself—it read the repo's CI scripts and predicted the failure before the merge gate ran. The merge gate then confirmed: `FAIL: CI not green: 2 non-passing check(s): repo-lint/lint=FAILURE`.

## The auto-merge race: a real-time TOCTOU bug

One finding during the project deserves its own mention because it illustrates how subtle multi-agent workflow bugs can be.

[PR #60](https://github.com/nathanjohnpayne/mergepath/pull/60) was a documentation-only change that routed `CLAUDE.md` step 8 to the new Phase 4a/4b flow. It was small enough that external review was required (it touched `.github/**`), but the `needs-external-review` label and the reviewer's `APPROVED` review landed within two seconds of each other.

The `auto-merge-on-approval` job in the Agent Review Pipeline evaluated `github.event.pull_request.labels` from the event payload—a snapshot taken at dispatch time. The label had been applied 2 seconds before the approval, but the event snapshot did not include it. The job's `if:` check passed, auto-merge fired, and the PR merged 12 seconds later without any external review.

This is a textbook [TOCTOU](https://en.wikipedia.org/wiki/Time-of-check_to_time-of-use) race. The check (does the PR have a blocking label?) and the use (enable auto-merge) operate on different snapshots of the label state. The fix in [PR #63](https://github.com/nathanjohnpayne/mergepath/pull/63) added a runtime re-verify step that calls `gh pr view --json labels` immediately before the merge step, ensuring the label check uses the authoritative current state rather than the stale event payload.

The process-level fix was even simpler: apply the label *before* posting any review, so the label is in the event snapshot by the time the approval triggers the pipeline. Defense in depth: the runtime re-verify is the durable fix, the label ordering is the cheap insurance.

## What the template actually is

[Mergepath](https://github.com/nathanjohnpayne/mergepath) is the infrastructure that makes all of the above work consistently across nine repositories. It is not a framework or a library. It is a set of files that, when present in a repository, enforce a deterministic review workflow for any AI coding agent.

**Canonical documentation as a single source of truth.** `REVIEW_POLICY.md` is the policy document. `CLAUDE.md` is the agent's operational checklist. `AGENTS.md` is the behavioral index. `.github/review-policy.yml` is the machine-readable config. Each file has exactly one job, and they cross-reference each other rather than duplicating content.

**Binding structural constraints enforced via CI.** Roughly two dozen fail-closed CI checks in `scripts/ci/` verify that required files exist, instruction files are not duplicated in tool folders, forbidden directories are absent, specs map to tests, and the review-policy infrastructure is in place. These run on every push and every PR. Agents cannot merge past a failing check.

**Multi-identity code review.** Every agent has an author identity and a reviewer identity. The `gh-pr-guard.sh` hook enforces that PRs contain `Authoring-Agent:` and `## Self-Review`. The `pr-audit.yml` weekly audit retroactively checks that every merged PR had the required review structure. The `block-self-approval` job in the Agent Review Pipeline prevents a reviewer from approving their own PR.

**Automated external review.** External review splits into two phases: Phase 4a is automated through the Codex GitHub App—`codex-review-request.sh` and `codex-review-check.sh` drive the request/clear loop—and Phase 4b is a manual CLI fallback for when the App is unavailable, with `phase-4b-classifier.sh` deciding which path a PR takes. A Codex P1 merge gate blocks merge while any unresolved P1 finding is open, and the `gh-pr-guard.sh` hook enforces that `CODEX_CLEARED=1` is set before merging a labeled PR. On the happy path the entire flow from "PR crosses threshold" to "merge" runs without human intervention.

**A second automated opinion.** CodeRabbit reviews every PR as an advisory pass. It does not gate merge, but agents must read and address its findings before moving on—a third pair of eyes on top of internal self-review and Codex.

**Drift prevention.** Mergepath is the canonical source, and `sync-to-downstream.sh` keeps the downstream repos current instead of relying on memory. A `.mergepath-sync.yml` manifest declares which paths are mirrored byte-for-byte and which are kit directories; a per-repo `.sync-overrides.yml` registry records intentional divergences so they survive propagation. `--audit` reports drift with zero side effects, `--sync-all` reconciles a repo's full state, and every run opens one PR per consumer through the normal review flow.

**New repos in one command.** `bootstrap-new-repo.sh` stands up a fresh repo from the template end to end—template mirror, GitHub infrastructure, Firebase/CodeRabbit/Codex posture, Project board—as a resumable staged wizard whose `--dry-run` emits a complete runbook with zero side effects.

**A security baseline that ships with the template.** Secret scanning with push protection, Dependabot alerts and version updates, `CODEOWNERS`, `SECURITY.md`, GitHub Actions pinned to commit SHAs, and least-privilege `permissions:` blocks on every workflow—on by default, not opt-in per repo.

## The numbers

Over seven weeks of daily use across nine repositories:

- **100+ PRs** opened, reviewed, and merged on the template repo alone
- **A dedicated hook test suite** covering the `gh-pr-guard.sh` parser, built up across 7 rounds of review
- **17 template bugs** discovered during propagation to downstream repos
- **5 dry-run scenarios** validated on live infrastructure
- **142–342 seconds** average Codex response time per review round
- **46 project items** tracked across 5 phases in [Project #2](https://github.com/users/nathanjohnpayne/projects/2)

## Four rules

Everything I learned during this project reduces to four rules:

**1. Enforce, don't instruct.** Instruction files (`CLAUDE.md`, `AGENTS.md`) are necessary for context but insufficient for compliance. If you want agents to always do PRs, block direct pushes via branch protection. If you want agents to always include self-reviews, block PR creation without them. If you want agents to get an external review on complex changes, block merge via a label gate. The enforcement must be mechanical, not behavioral.

**2. Identity-switch for reviews.** Having the agent review its own code under a different GitHub identity produces measurably better reviews than asking for a review in the same conversation. I cannot explain why, but I have observed it consistently across three different agent platforms. The cost is one additional GitHub account per agent. The benefit is real.

**3. Fresh eyes find what familiarity misses.** The strongest single signal from this project is that Codex found seventeen bugs in template code that had been reviewed seven times by the same reviewer (`nathanpayne-codex` via the CLI). When the same code was propagated to a different repo, and Codex saw it fresh, it caught privilege escalation vectors, findings-filter scoping bugs, and tokenizer edge cases that the familiar reviewer had stopped seeing. Schedule periodic fresh-eyes reviews, either by rotating reviewers or by deploying code to new contexts where it gets reviewed from scratch.

**4. The difference between a well-intentioned agent and a reliable one is not a smarter model. It is an enforcement infrastructure.** Better models will come. Better prompts will be written. But the project's structural insight is that agent reliability is an infrastructure problem, not a capability problem. The agent that shipped clean code was not a different model from the one that tried to push directly to main. It was the same model, operating inside a system that made the right behavior the only available behavior.

The template is [open source](https://github.com/nathanjohnpayne/mergepath). The enforcement is mechanical. The lessons cost me six weeks. Maybe they save you some of that.
