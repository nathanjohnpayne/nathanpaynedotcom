---
title: "Agent Approval Workflow and the Genesis of Mergepath"
seoTitle: "Agent Approval Workflow and Mergepath"
shortTitle: "Agent Approval Workflow"
description: "The agents knew the review rule and still pushed straight to main. I added branch rules, reviewer identities, and automated outside review to make the process harder to skip. Three weeks of failures became the system behind Mergepath, with each control's limits spelled out."
seoDescription: "How AI coding agents skip review, and the layered enforcement behind Mergepath: branch rules, reviewer identities, and automated Codex review."
category: "Agent Systems"
author: "Nathan Payne"
date: 2026-04-16
tags: ["AI", "Engineering", "Product", "Systems", "Code Review"]
image: "/og/blog/agent-approval-workflow-genesis-of-mergepath.png"
keyTakeaways:
  - "An instruction file couldn't enforce the rule. I needed checks before a push, PR creation, or merge, and I needed to know whom each check could stop. Local hooks and GitHub rules have different limits."
  - "Switching to a reviewer identity consistently improved the reviews I saw across three agent platforms. I did not measure that in a controlled comparison. It costs one GitHub account per agent."
  - "The template's own reviews had cleared code that gave up seventeen bugs downstream. I treat propagation as another review, with fresh eyes and a fresh context."
  - "Changing the system was the part I could control. The agent that skipped review and the one that shipped clean code used the same tools; this record does not isolate capability from the review process."
pullquotes:
  - text: "Bots, just like humans, require code review. Without it, bugs crop up, features are missed, and the code shipped is of lower quality."
    label: "The discovery"
    accent: blue
  - text: "Like humans, they'd selectively remember the rules based on what was easiest, or what they thought they could get away with."
    label: "Why instruction files are not enough"
    accent: red
  - text: "The first two repositories took over five hours. I'd guessed 60 minutes for all six, and never wrote that down anywhere but here."
    label: "What propagation taught me"
    accent: blue
  - text: "Changing the system was the part I could control."
    label: "The systemic lesson"
    accent: red
sidebar:
  - type: mermaid
    title: "Seven stages in the agent review system"
    description: "Each stage answers the failure the one before it left open, as of April 2026: instruction files were ignored, so a local hook greps the command text for the required markers; the hook binds only the sessions that load it, so server-side branch rules follow; self-review under a separate identity runs out on complex changes, so a line-count threshold triggers external review, which Codex then automates; propagation to six repositories re-reviews everything from scratch."
    content: |
      graph TD
          A["Instruction files only<br/>(AGENTS.md, CLAUDE.md)"] --> B["Local hook greps the command<br/>text for the markers"]
          B --> C["GitHub branch rules<br/>(require PRs)"]
          C --> D["Self-review under<br/>separate identity"]
          D --> E["External review for<br/>complex changes (300+ lines)"]
          E --> F["Automated external<br/>review via Codex App"]
          F --> G["Propagation to<br/>downstream repositories"]
          style A fill:#e8b4b4,stroke:#993d3d,color:#333
          style B fill:#d4a84b,stroke:#a07830,color:#333
          style C fill:#d4a84b,stroke:#a07830,color:#333
          style D fill:#7bc67e,stroke:#4a8a4d,color:#333
          style E fill:#7bc67e,stroke:#4a8a4d,color:#333
          style F fill:#2c5f8a,stroke:#2c5f8a,color:#fff
          style G fill:#2c5f8a,stroke:#2c5f8a,color:#fff
    caption: "The seven-stage agent review system, as of April 2026"
---

I'd put the same rule in every instruction file: never push directly to `main`; every change goes through a pull request. All of them could quote it back. Then one would push straight to `main` anyway, usually on a small change, usually after I'd said "just fix this quickly."

I became the review process. I read diffs after the fact, carried feedback between sessions, and checked output that nobody else had inspected. The agents produced more; my confidence didn't keep up. A prompt could go straight to a pushed commit without a pause for review.

None of this was really about AI. Human teams stopped relying on handbooks for this long ago and use tooling that refuses the wrong action. Writing the rule more clearly hadn't worked. Making the wrong action mechanically expensive, at a boundary I could name, might.

That became [Mergepath](https://github.com/nathanjohnpayne/mergepath), originally `ai_agent_repo_template`: a set of files installed in a repository to give agents and humans a shared review path. Each rule has one home in the documentation. Local hooks, GitHub branch rules, fail-closed CI checks, reviewer identities, and automated outside review enforce different parts of it. Each has a limit, including the administrator override on GitHub.

The repository was created on March 24, 2026. This is its story as of April 16, 2026: three weeks of daily use, by which point the template had reached six production repositories. I work in product management, not engineering. I didn't design the whole system up front. Each control came from a failure I watched happen.

<span id="the-discovery-bots-need-code-review"></span>

## I started with review

Bots, just like humans, require code review. Without it, bugs crop up, features are missed, and the code shipped is of lower quality. Early full-time use of Claude Code and Cursor showed me how much better the output got when I made an agent review its work before shipping. Even "now review what you just wrote," in the same chat, found missing error handling, unquoted shell variables, and race conditions.

Switching GitHub identities improved the reviews further. I went from `nathanjohnpayne`, the author, to `nathanpayne-claude`, the reviewer, and submitted a PR review. Same model, same context window, same code. The reviewer persona caught things the author persona had missed.

I saw that consistently across Claude Code, Cursor, and Codex. I didn't run a controlled comparison with same-conversation review, keep a defect ledger, or establish why it worked. It was a repeated observation across three platforms, and it held often enough that I built the accounts around it. Every agent authors as `nathanjohnpayne` and reviews under its own identity: `nathanpayne-claude`, `nathanpayne-cursor`, or `nathanpayne-codex`. Every PR is authored under one account and reviewed under another.

## Why instruction files are not enough

Agents, like humans, would rather skip the PR entirely. I tried `CLAUDE.md` for Claude Code, `.cursor/rules/*.mdc` for Cursor, and `AGENTS.md` for Codex. All carried the rule. Like humans, they'd selectively remember the rules based on what was easiest, or what they thought they could get away with. They didn't skip it every time. They skipped it often enough that I had to check.

An agent could quote the rule back to me and still skip review. An instruction file couldn't enforce the rule.

<span id="adding-teeth-and-naming-each-boundary"></span>

## I put checks where the writes happened

I could keep strengthening the instructions, enforce review on GitHub, or enforce it inside the agent's session. I chose both enforcement points because they fail differently. Branch protection required PRs at the server and stopped the direct pushes I was seeing. It bound me too, with an administrator override. Then agents started opening PRs with no description or self-review and merging them on their own approval.

A [PreToolUse hook](https://github.com/nathanjohnpayne/mergepath/blob/2429e6bf8714e5998e9fa21485a5bbd057010e9e/scripts/hooks/gh-pr-guard.sh) intercepted `gh pr create` in the local session. In April, it searched the command text for `Authoring-Agent:` and `## Self-Review` and refused creation if either was absent.

That was a cheap check against the failure in front of me. It never read the PR body. It searched the whole shell command for two case-insensitive substrings. A command could put the markers in another argument and send a nonconforming body. A valid `--body-file` create could be refused because the file's contents weren't in the command. The check helped, but it wasn't a body contract. The division of labor changed later.

The hook only bound sessions that loaded it. Another tool, a raw API call, or the GitHub web UI could bypass it. Server rules provided the backstop, subject to an administrator override. I had to name those boundaries before I could say what the controls enforced.

| Control | Where it runs | Whom it binds |
|---|---|---|
| PR-creation and merge guard (`gh-pr-guard.sh`) | Local: a Claude Code PreToolUse hook | Only agents in a session that loads it; other tools and the web UI bypass it |
| Branch protection | GitHub server | Everyone, including the human—but an account with admin rights can still merge past it with `--admin`, which is the bypass the last row governs |
| Required status checks and the Label Gate | GitHub server | Everyone, subject to admin override |
| `scripts/ci/` checks | CI | The merge, not the push |
| Author/reviewer identity split | Convention, backed by a `block-self-approval` CI job | The job blocks self-approval; the split itself is convention |
| `BREAK_GLASS_ADMIN` / `BREAK_GLASS_MERGE_STATE` (the second added 2026-05-14) | Local: read by the hook, never sent anywhere | Nothing on GitHub's side. They only unlock the hook's own refusal |
| `--admin` on the merge | GitHub server | The server-side administrator bypass itself—the flag the variables above let you pass |

<span id="the-threshold-when-self-review-is-not-enough"></span>

## When I needed a different agent

On complex changes, separate-identity self-review hit diminishing returns. The reviewer still shared the authoring agent's blind spots and architectural assumptions. Outside review on every PR would consume too much of my relay time. Skipping it left those blind spots in place. I chose a line-count threshold with overrides for sensitive paths.

Changes under 300 diff lines that avoided sensitive paths got self-review only. Three hundred lines or more, or a change touching `.github/**`, auth, payments, `**/*secret*`, or `**/*credential*`, required a different agent. Exactly 300 lines belonged in the outside-review lane. A [CI workflow](https://github.com/nathanjohnpayne/mergepath/blob/main/.github/workflows/pr-review-policy.yml) applied `needs-external-review`, and the server-side Label Gate blocked merge until the review process cleared it.

At first, outside review meant me. I carried each PR's context to a second agent session, relayed the findings back, and repeated that until it approved. It worked. It also made me the coordination layer for every round of every complex PR, which was the job I wanted the system to take over.

<span id="the-automation-codex-in-github"></span>

## Automating the outside review

In April 2026, I turned on OpenAI's [Codex GitHub App](https://chatgpt.com/codex/cloud/settings/code-review) for the template repository. `@codex review` triggered a standard GitHub review with inline findings tagged P0 through P3. I could keep relaying reviews myself, loosen the requirement, or automate the reviewer. The API made automation possible: request a review, address it, and iterate without me carrying the messages.

[`codex-review-request.sh`](https://github.com/nathanjohnpayne/mergepath/blob/main/scripts/codex-review-request.sh) posts the trigger, polls for a response, and returns machine-parseable JSON. Live use showed why its response handling mattered. The Codex **GitHub App** never posts an `APPROVED` review. No findings means a 👍 reaction; findings mean a `COMMENTED` review with priority badges. The `nathanpayne-codex` CLI identity does post ordinary `APPROVED` reviews, twice on PR #66 alone. Treating those as the same kind of reviewer would leave a merge gate waiting for a state the App doesn't emit.

[`codex-review-check.sh`](https://github.com/nathanjohnpayne/mergepath/blob/main/scripts/codex-review-check.sh) is read-only. It checks that required CI is green, a reviewer identity's current verdict is `APPROVED`, and Codex has cleared the current HEAD.

Knowing which HEAD a clearance belonged to was the hard part. [PR #65](https://github.com/nathanjohnpayne/mergepath/pull/65) had three review submissions, two blocking, each followed by a fix commit. `nathanpayne-codex` kept finding edge cases in the timestamp used to discard stale clearances. GitHub exposes no per-PR push timestamp for ordinary pushes: timeline `committed` events have a null `created_at`, and only force-pushes are stamped. The gate uses force-push events where it can and a freshness window elsewhere. `reaction_freshness_window_seconds` defaults to 1800: a 👍 older than 30 minutes won't clear a merge, whatever committer date HEAD carries. The residual hole is documented in the code.

<span id="the-hook-seven-rounds-six-fixes-one-retracted-approval"></span>

## Seven rounds on the merge hook

[PR #66](https://github.com/nathanjohnpayne/mergepath/pull/66) extended the hook to block `gh pr merge` on labeled PRs until the gate cleared. The command had more forms than the parser handled. A selector could be a number, URL, or branch name. `--repo` had the short form `-R`. Global flags could come before the subcommand, and the documented merge command could start with an inline environment prefix.

`nathanpayne-codex` posted seven blocking reviews. Those rounds produced six distinct parser fixes:

| Fix | Parser gap it closed |
|---|---|
| 1 | Selector handling: URLs and branch names, not just PR numbers |
| 2 | Bash word splitting ignored shell quotes, and `-R` was missed as `--repo`'s short form |
| 3 | A global `-R`/`--repo` placed before the subcommand bypassed the label lookup |
| 4 | Inline env prefixes (`CODEX_CLEARED=1 gh pr merge`) exited before any guard ran |
| 5 | Command-position detection treated `echo gh pr merge` as a real merge |
| 6 | `--admin` matched by substring grep falsely blocked `--subject "--admin follow-up"` |

Partway through, it posted an `APPROVED` review and retracted it 81 seconds later with `CHANGES_REQUESTED`. Four more blocking rounds followed before the final approval. The reviewer treated its own approval as a claim it could revise.

Each change to admit a legitimate command form opened another false-positive or false-negative path. Bash string parsing was the wrong tool for shell command grammar.

<span id="five-dry-runs-scoped-to-five-runs"></span>

## Five dry runs

Before propagation, I ran five controlled scenarios, one per path through the review flow. All ran on April 15, 2026, within an eighteen-minute window. Each result belongs to that run.

**A—happy path ([PR #71](https://github.com/nathanjohnpayne/mergepath/pull/71)).** I never got to post the trigger. Codex reviewed on open, and its 👍 arrived 132 seconds after creation. It had already been reviewing on open since PR #53 that morning.

**B—fix and re-pass ([PR #72](https://github.com/nathanjohnpayne/mergepath/pull/72)).** The PR carried a deliberately planted unquoted shell variable. Codex flagged it; it was fixed, cleared, and merged.

**C—disagreement ([PR #73](https://github.com/nathanjohnpayne/mergepath/pull/73)).** Codex flagged the probe's `ls "$path"` check for accepting option-like arguments. I posted a defensible rebuttal. Codex re-flagged it with a stronger argument: "for a valid class of inputs," answering my "bounded input space" claim. That fired the repeat-after-rebuttal signal. The loop stopped, an escalation comment recorded both positions, and the decision went to the human. The PR closed without merging.

**D—multiple findings ([PR #74](https://github.com/nathanjohnpayne/mergepath/pull/74)).** The PR contained two deliberate P1s. Codex returned both in one review. My later generalization from that run didn't hold, as described in "Since the snapshot."

**E—CI red ([PR #70](https://github.com/nathanjohnpayne/mergepath/pull/70)).** The PR deliberately failed CI by adding a forbidden top-level `vendor/` directory. Codex didn't wait for CI. Its P1 named the workflow, script, and line range: `check_no_forbidden_top_level_dirs`, called from `repo_lint.yml`, fails on `vendor`. It concluded that the commit "cannot pass required CI in any environment." It read the prediction out of the repository's enforcement code.

## The auto-merge race

[PR #60](https://github.com/nathanjohnpayne/mergepath/pull/60) was a docs-only change to `CLAUDE.md` and `AGENTS.md`, sent to outside review by hand. It merged without that review. The auto-merge job read labels from the event payload, frozen at dispatch. Approval came three seconds before the blocking label. The job saw an approved, unlabeled PR and merged twelve seconds after the label landed, without reading it again.

That was a [TOCTOU](https://en.wikipedia.org/wiki/Time-of-check_to_time-of-use) race. [PR #63](https://github.com/nathanjohnpayne/mergepath/pull/63) fixed it by reading live labels immediately before merge (+53/−0, one file). Applying the blocking label before any review posts is the cheap insurance in front of that check.

## What propagation taught me

I started with [swipewatch](https://github.com/nathanjohnpayne/swipewatch/pull/33) and [nathanpaynedotcom](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/180), running their PRs concurrently. The first two repositories took over five hours. I'd guessed 60 minutes for all six, and never wrote that down anywhere but here. Codex's GitHub App, reading newly copied files without history in those repositories, found [seventeen distinct template bugs](https://github.com/nathanjohnpayne/mergepath/issues/75) in code the template's own reviews had cleared.

The findings forced the hook onto Python's `shlex`. [Issue #67](https://github.com/nathanjohnpayne/mergepath/issues/67) had been meant to investigate that migration at leisure.

The seventeen broke down into three privilege-escalation vectors, including commands that could spoof `CODEX_CLEARED=1` or `BREAK_GLASS_ADMIN=1`; four findings-semantics bugs that counted comments from the wrong review round; five tokenizer bugs from the xargs-to-shlex migration; one hook command-grammar bug; two wholesale-copy regressions; and two timing and clock bugs. The copying regressions erased downstream customizations: `functions/**` in protected paths and `coderabbit.enabled: true`. One consolidated back-port ([#76](https://github.com/nathanjohnpayne/mergepath/pull/76), +450/−102 across three files) carried the fixes.

The catalog reached eighteen. The eighteenth was a P1: gate (a) treated non-required CI checks as blocking. It was marked "NOT YET FIXED" and knowingly carried forward. Fixing seventeen didn't make the sweep clean.

The remaining four propagation PRs opened an hour after the back-port merged, still on April 15, and each merged in about five and a half minutes. On three of the four, Codex's two findings per repository arrived after merge. Their tracking issues closed a day later within an eighteen-second window. Those closures don't measure how long the work took.

My read, not a measurement: propagation works as a fresh-eyes review. The `nathanpayne-codex` CLI identity had spent seven rounds on the hook in the template. The GitHub App found new classes of bug downstream. Those are different reviewers and different contexts.

<span id="what-a-consumer-repo-got-on-april-16"></span>
<span id="the-numbers-as-of-april-16-2026"></span>

## The April 16, 2026 snapshot

A consumer repo got a set of files with distinct jobs. `REVIEW_POLICY.md` held the policy, `CLAUDE.md` the checklist, and `.github/review-policy.yml` the machine-readable config. Seven fail-closed CI checks enforced the structure. A `block-self-approval` job and a weekly retroactive audit backed the author/reviewer split. Phase 4a ran through the Codex App, with a manual CLI fallback. CodeRabbit advised without gating. `SECURITY.md`, `CODEOWNERS`, and Dependabot were in the tree.

Three weeks after the repository's creation:

- **32 PRs opened, 30 merged** on the template repo
- **46 project items** across 5 phases in [Project #2](https://github.com/users/nathanjohnpayne/projects/2)
- **7 fail-closed CI checks** in `scripts/ci/`
- **5 dry-run scenarios** validated on live infrastructure
- **17 template bugs** found during propagation, plus 1 known P1 carried forward

The 46 items were 37 issues and 9 pull requests.

## Since the snapshot

On August 26, 2026, the template repository stood at 459 PRs. The seven check scripts in `scripts/ci/` had become 71, and the consumer set had grown from six repositories to nine. A sync manifest (2026-05-04) and its per-repo override registry (2026-05-12) kept intentional differences through propagation. Phase 4b had become a headless external reviewer CLI: `phase_4b_automation` shipped `enabled: true, mode: local` and posted the verdict under the reviewer identity. The manual handoff became the fallback.

An author wrapper arrived on 2026-05-13. It verified the author token before a write and read the created PR's author afterward to check that it had used the intended account. On 2026-05-14, the second break-glass variable added an explicit exit for a blocked merge state.

The two repositories also developed different copies of the hook. Mergepath at `7878830` (2026-08-27), the linked commit, insisted that PR creation use the wrapper and still [checked the command text](https://github.com/nathanjohnpayne/mergepath/blob/787883024456260426b869a772059c52b754aeed/scripts/hooks/gh-pr-guard.sh#L3080-L3096) on that path as well as the direct path. This site's copy recognized the wrapper and stepped aside without reading the command. The wrapper here had gained its own line-anchored body contract.

Four months on, while this post was being fact-checked, a `gh pr create` was refused here because the body wrote `**Authoring-Agent:**` in bold. `^ {0,3}Authoring-Agent:` doesn't match a line starting with `**`. The wrapper's later body contract caught it. That input distinguishes a line-anchored check from a substring search. The two files had the same name and job, but behaved differently. I had to check the repository and commit before I could say what "the hook" did.

The local hook allows an administrator merge only when the human explicitly sets `BREAK_GLASS_ADMIN=1` and, for a blocked merge state, `BREAK_GLASS_MERGE_STATE=1`. Those variables unlock the hook. The `--admin` flag invokes GitHub's bypass. The authorized break-glass merge in that fact-checking session needed both variables. The layers raise the cost of bypassing review until following the process is cheaper. They don't make bypassing it impossible, and the bypass leaves a record.

The later reviews also changed what I could claim about dry-run D. I'd turned its one review returning both planted P1s into "the runaway scenario does not naturally occur." [PR #66](https://github.com/nathanjohnpayne/mergepath/pull/66) was already a counterexample. A later PR here ([#787](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/787)) took five Codex rounds, returning 0, 4, 5, 1, and 7 findings. Round three drew another two from CodeRabbit. Some rounds found new problems; not every round did. Those two runs show that one-round convergence isn't guaranteed, without establishing how often it fails. The operator's five-round budget stopped #787. The configured `max_review_rounds` guard didn't escalate. The guard wasn't what failed. My assumption that reviews converge in one round was.

The timing figures have a different boundary from the April 16 inventory. Recomputed on 2026-10-06, the median from an operator's Codex trigger to the next bot signal was 156 seconds, with a range of 7 to 703 across 16 observations on mergepath PRs #55 through #79. That includes the App's not-connected error replies. Counting only reviews and 👍 reactions gives 13 observations, median 179, range 113 to 703. Four observations came from PR #78, which opened on April 17. This measures the Phase 4a era, not just the April 16 snapshot.

The April figures and review timings were recomputed for this revision from GitHub's API and git history; the April check-script count came from `git ls-tree`. The queries, populations, timestamps, and exclusions are in the published [audit ledger](https://github.com/nathanjohnpayne/nathanpaynedotcom/blob/main/plans/759/agent-approval-workflow-genesis-of-mergepath-ledger.md) and its [2026-10-06 recount](https://github.com/nathanjohnpayne/nathanpaynedotcom/blob/main/plans/correctness-pass-2026-10-06/agent-approval-workflow-genesis-of-mergepath-ledger.md).

The first version said "30+ PRs" over "six weeks." A 2026-05-15 refresh changed that to "100+ PRs" over "seven weeks" (elsewhere, six). The April repository had 32 over three. A post about enforcing review discipline had shipped unreviewed numbers.

## Four rules

**1. Enforce the rule and name the boundary.** Instruction files supply context. To require PRs, block direct pushes at the server. To require self-reviews, refuse PR creation locally. To require outside review on complex changes, use a server-visible label gate. Name the limits too: a local hook binds only the sessions that load it, server rules permit an administrator override, and break-glass variables provide a documented human exit.

**2. Switch identities for review.** Use a distinct GitHub identity when reviewing. It costs one GitHub account per agent, and I've kept paying it.

**3. Give the code fresh eyes.** Code that passed the template's reviews still had bugs for downstream reviewers to find. Rotate reviewers, or put code where it'll be read from scratch.

**4. Change the system before blaming the agent.** The agent that shipped clean code used the same tools as the one that pushed straight to main. Changing the system was the part I could control. This record doesn't isolate capability from mechanism; it shows that changing the mechanism was enough in this case.

The template is [public](https://github.com/nathanjohnpayne/mergepath). The enforcement is mechanical, and I can name each control's limits. I wanted review to happen before code reached `main`, without me becoming the relay for every round. These lessons cost me three weeks. Maybe they save you some of that.
