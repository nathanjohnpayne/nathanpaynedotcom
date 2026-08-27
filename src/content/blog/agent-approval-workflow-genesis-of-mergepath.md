---
title: "Agent Approval Workflow and the Genesis of Mergepath"
seoTitle: "Agent Approval Workflow and Mergepath"
shortTitle: "Agent Approval Workflow"
description: "AI coding agents, like humans, will skip code review if you let them. Three weeks of watched failures turned a written rule into layered enforcement—branch rules, a local PR-creation hook, reviewer identities, automated Codex review—with every control named by where it runs and whom it binds."
seoDescription: "How AI coding agents skip review, and the layered enforcement behind Mergepath: branch rules, reviewer identities, and automated Codex review."
category: "Agent Systems"
author: "Nathan Payne"
date: 2026-04-16
tags: ["AI", "Engineering", "Product", "Systems", "Code Review"]
image: "/og/blog/agent-approval-workflow-genesis-of-mergepath.png"
keyTakeaways:
  - "Instruction files give an agent context, not compliance. Layered controls create enforceable checkpoints—but name where each one runs: no single layer binds every actor, and the combination raises the cost of the wrong action rather than making it impossible."
  - "Reviewing under a separate reviewer identity consistently beat same-conversation review across three agent platforms. Repeated observation, not controlled measurement; the cost is one GitHub account per agent."
  - "Propagating reviewed code to a new repository is implicitly a fresh-eyes review: code the template's own review had cleared gave up seventeen more bugs the first time Codex read it downstream."
  - "Agent reliability is an infrastructure problem, not a capability problem. The agent that shipped clean code was the same model as the one that tried to push straight to main."
pullquotes:
  - text: "Bots, just like humans, require code review. Without it, bugs crop up, features are missed, and the code shipped is of lower quality."
    label: "The discovery"
    accent: blue
  - text: "Like humans, they'd selectively remember the rules based on what was easiest, or what they could seemingly think they could get away with."
    label: "Why instruction files are not enough"
    accent: red
  - text: "Seventeen bugs in code the template's own review had already cleared. Fresh eyes found what familiarity missed."
    label: "What propagation taught me"
    accent: blue
  - text: "The difference between a well-intentioned agent and a reliable one is not a smarter model. It is enforcement infrastructure."
    label: "The systemic lesson"
    accent: red
sidebar:
  - type: mermaid
    title: "Seven stages in the agent review system"
    description: "The system's evolution as of April 2026: instruction files, a local guard and wrapper, server-side branch rules, separate-identity self-review, threshold-triggered external review, automated Codex review, and propagation."
    content: |
      graph TD
          A["Instruction files only<br/>(AGENTS.md, CLAUDE.md)"] --> B["Local guard and wrapper<br/>(require a self-review section)"]
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

The rule was in every file the agents read: never push directly to `main`; every change goes through a pull request. All of them could quote it back to me. And one of them would push straight to `main` anyway—usually on a change small enough not to feel like it counted, usually right after I said "just fix this quickly." Every time, I became the review process: reading diffs after the fact, relaying feedback between sessions, vetting uninspected output by hand. The agents produced more; my confidence did not keep up.

Two things were going on, neither really about AI. Review happens only when something forces a pause, and an agent left to itself never pauses—it goes from prompt to pushed commit with no point where anyone is expected to look. And a rule that exists only as a sentence gets followed when convenient. Human teams answered both long ago with tooling that refuses the wrong action instead of a handbook that describes it. That became the product hypothesis: agents need the same answer. Writing the rule more clearly does not work. Making the wrong action mechanically expensive, at a boundary you can name, does.

[Mergepath](https://github.com/nathanjohnpayne/mergepath) (originally `ai_agent_repo_template`) is that hypothesis built: files dropped into a repository to layer a shared review path across AI agents and humans. Local controls bind the sessions that load them; GitHub controls bind repository actions, subject to an administrator override. Canonical documentation gives each rule exactly one home. Fail-closed CI checks block the merge. Multi-identity code review keeps the GitHub account that writes a change from approving it. And for changes big enough to need an outside opinion, automated external review runs through the OpenAI Codex GitHub App.

The mergepath repository was created on March 24, 2026, and this post describes it as of April 16, 2026—three weeks of daily use, by which point the template had propagated to six production repositories. Several figures have moved a long way since; a closing section says how. None of it was designed top-down. I am a product manager, not an engineer; each control was born from a failure I watched happen.

## The discovery: bots need code review

A week of full-time Claude Code and Cursor made one thing clear: agents produce substantially better output when made to review their own work before shipping. Even the crude version—"now review what you just wrote," in the same chat—found real bugs: missing error handling, unquoted shell variables, race conditions.

More surprising: posting the review under a different GitHub identity—switching from `nathanjohnpayne`, the author, to `nathanpayne-claude`, the reviewer, and submitting a PR review—improved the reviews further. Same model, same context window, same code; the reviewer persona caught what the author persona missed.

The first version of this post oversold that claim. It is a repeated observation across Claude Code, Cursor, and Codex, not a measurement: no controlled comparison against same-conversation review, no defect ledger, no mechanistic explanation. The pattern held across three platforms often enough that I built the account structure around it. Every agent gets a shared author identity (`nathanjohnpayne`) and its own reviewer identity (`nathanpayne-claude`, `nathanpayne-cursor`, `nathanpayne-codex`). Every PR is authored under one and reviewed under another.

## Why instruction files are not enough

Agents, like humans, would rather skip the PR entirely. I tried instruction files first—`CLAUDE.md` for Claude Code, `.cursorrules` for Cursor, `AGENTS.md` for Codex—each carrying the rule. Like humans, they would selectively remember the rules based on what was easiest, or what they could seemingly think they could get away with. Not every time. But often enough that the instruction file alone could not be trusted, and often enough is all it takes when every lapse lands on the human.

## Adding teeth, and naming each boundary

**The failure:** direct pushes to `main` despite the written rule. **The options:** write the rule more forcefully, enforce at the GitHub server, or enforce inside the agent's own session. **The decision:** enforce at both boundaries, because they fail differently. Branch protection—a server-side rule that binds everyone, me included, short of an administrator override—ended direct pushes outright. It also produced the next failure: agents opened PRs with no description and no self-review, then merged them on their own approval. Two pieces answer that—I conflated them until a reviewer caught it. A [PreToolUse hook](https://github.com/nathanjohnpayne/mergepath/blob/main/scripts/hooks/gh-pr-guard.sh) intercepts every `gh pr create` in the local session and insists it go through the author wrapper. The wrapper's [body contract](https://github.com/nathanjohnpayne/mergepath/blob/787883024456260426b869a772059c52b754aeed/scripts/hooks/gh-pr-guard.sh#L3080-L3096) refuses any PR body lacking an `Authoring-Agent:` header and a `## Self-Review` section. Neither is a parser—the contract is a line-anchored regex, the hook's fallback a substring match—but on the guarded wrapper path both run before the API call and refuse a non-conforming PR.

**The tradeoff:** the hook is client-side. It binds only agents in a session that loads it; a different tool, a raw API call, or the GitHub web UI walks past it. The server rules are the backstop, and even they carry a designed hole: the local hook allows an administrator merge only when the human explicitly sets `BREAK_GLASS_ADMIN=1` and, for a blocked merge state, `BREAK_GLASS_MERGE_STATE=1`; the resulting `--admin` flag invokes the server-side bypass. The wrong action is not impossible. It is expensive, and it leaves a record.

That distinction—where a control runs, and whom it binds—matters more than any single control:

| Control | Where it runs | Whom it binds |
|---|---|---|
| PR-creation and merge guard (`gh-pr-guard.sh`) | Local: a Claude Code PreToolUse hook | Only agents in a session that loads it; other tools and the web UI bypass it |
| Branch protection | GitHub server | Everyone, including the human—but an account with admin rights can still merge past it with `--admin`, which is the bypass the last row governs |
| Required status checks and the Label Gate | GitHub server | Everyone, subject to admin override |
| `scripts/ci/` checks | CI | The merge, not the push |
| Author/reviewer identity split | Convention, backed by a `block-self-approval` CI job | The job blocks self-approval; the split itself is convention |
| `BREAK_GLASS_ADMIN` / `BREAK_GLASS_MERGE_STATE` | Local: read by the hook, never sent anywhere | Nothing on GitHub's side. They only unlock the hook's own refusal |
| `--admin` on the merge | GitHub server | The server-side administrator bypass itself—the flag the variables above let you pass |

No layer makes the wrong action impossible; the break-glass path exists precisely so that it is not. The combination raises its cost until the right action is cheaper.

**Evidence after launch:** four months on, the layering still bites. While this post was being fact-checked, a `gh pr create` was refused because its body wrote `**Authoring-Agent:**` in bold. The refusal did not come from the hook: its job was to route the write through the author wrapper, and having seen the wrapper it stepped aside. What rejected the body was the wrapper's own contract check, whose line-anchored match does not see a bolded header. Two components, two jobs, one easy to mistake for the other. The authorized break-glass merge that same session needed both local variables from the table above.

## The threshold: when self-review is not enough

**The failure:** separate-identity self-review hits diminishing returns on complex changes. The agent's blind spots are correlated with its authoring decisions; it will not question architectural assumptions that felt correct when it made them. **The options:** external review on every PR (unaffordable in relay time), none at all (the failure above), or a line-count threshold with a sensitive-path override. **The decision:** changes under 300 diff lines that avoid sensitive paths get self-review only. Three hundred lines or more, or any change touching `.github/**`, auth, payments, or paths matching `**/*secret*` or `**/*credential*`, requires review by a different agent. The policy defines the self-review lane as strictly *under* the threshold, so a PR of exactly 300 lines needs the outside opinion. A [CI workflow](https://github.com/nathanjohnpayne/mergepath/blob/main/.github/workflows/pr-review-policy.yml) applies a `needs-external-review` label when a PR crosses the line, and a Label Gate check blocks the merge until the review process clears it—server-enforced, not honor-system. One propagation bug later landed in this config block: downstream repos had added `functions/**` to their protected paths, and wholesale-copying the template silently dropped it.

**The tradeoff:** at first, "external review" meant me—carrying each PR's context to a second agent session, relaying findings back, looping until it approved. It worked, and it made me the coordination layer for every round of every complex PR: the position this project exists to eliminate.

## The automation: Codex-in-GitHub

In April 2026, OpenAI enabled the [Codex GitHub App](https://chatgpt.com/codex/cloud/settings/code-review) for automated code review: trigger it with `@codex review` and it posts a standard GitHub review with inline findings tagged P0 through P3. The manual relay was the observed failure; the options were to keep paying it, loosen the requirement, or automate the reviewer. Reviewing through the API made the third real—request, address, iterate, no human in the loop. Building it took [Project #2](https://github.com/users/nathanjohnpayne/projects/2): 46 tracked items across 5 phases—37 issues and 9 pull requests—against a repository holding 32 PRs total at the snapshot.

Two scripts drive the loop. [`codex-review-request.sh`](https://github.com/nathanjohnpayne/mergepath/blob/main/scripts/codex-review-request.sh) posts the trigger, polls for a response, and emits machine-parseable JSON. It encodes a quirk only live observation revealed: the Codex **GitHub App** never posts an `APPROVED` review—no findings means a 👍 reaction on the PR, findings mean a `COMMENTED` review with inline priority badges. That is a property of the bot, not of Codex generally; the `nathanpayne-codex` CLI reviewer identity posts ordinary `APPROVED` reviews, twice on PR #66 alone. Conflate the two and a merge gate waits for a state that never arrives. [`codex-review-check.sh`](https://github.com/nathanjohnpayne/mergepath/blob/main/scripts/codex-review-check.sh) is the read-only merge gate: required CI green, a reviewer identity's latest-state `APPROVED`, and Codex cleared on the current HEAD.

That last gate was the hardest, and the difficulty was the platform's. Across three review submissions on [PR #65](https://github.com/nathanjohnpayne/mergepath/pull/65)—two blocking, each answered by a fix commit—`nathanpayne-codex` kept finding edge cases in the anchor deciding when a commit became the current HEAD, the gate's basis for discarding stale clearances. GitHub exposes no per-PR push timestamp for ordinary pushes: the timeline's `committed` events carry a null `created_at`; only force-pushes are stamped. So the design is two-layer—force-push events where they exist, and a freshness window (`reaction_freshness_window_seconds`, default 1800) for everything else, so a 👍 older than 30 minutes never clears a merge whatever committer date the HEAD carries. The residual hole is documented in the code rather than papered over.

## The hook: seven rounds, six fixes, one retracted approval

The most instructive artifact is [PR #66](https://github.com/nathanjohnpayne/mergepath/pull/66), which extended the guard hook to block `gh pr merge` on labeled PRs until the merge gate cleared. Parsing `gh pr merge` sounds trivial and is not: the selector can be a number, a URL, or a branch name; `--repo` has a `-R` short form; global flags can precede the subcommand; and the documented merge format carries an inline environment prefix.

`nathanpayne-codex` posted seven blocking reviews; the seven rounds produced six distinct parser fixes:

| Fix | Parser gap it closed |
|---|---|
| 1 | Selector handling: URLs and branch names, not just PR numbers |
| 2 | Bash word splitting ignored shell quotes, and `-R` was missed as `--repo`'s short form |
| 3 | A global `-R`/`--repo` placed before the subcommand bypassed the label lookup |
| 4 | Inline env prefixes (`CODEX_CLEARED=1 gh pr merge`) exited before any guard ran |
| 5 | Command-position detection treated `echo gh pr merge` as a real merge |
| 6 | `--admin` matched by substring grep falsely blocked `--subject "--admin follow-up"` |

Partway through, the reviewer posted an `APPROVED`—and retracted it 81 seconds later with a fresh `CHANGES_REQUESTED`, then kept finding bugs for four more rounds before the final approval. An approval is a claim about the code; this reviewer treated its own as revisable, not a finish line.

Every relaxation of the bash matcher that admitted a new legitimate form opened a new false-positive or false-negative path. Bash string parsing is the wrong tool for shell command grammar. The hook eventually moved to Python's `shlex`—a migration [issue #67](https://github.com/nathanjohnpayne/mergepath/issues/67) was supposed to investigate at leisure, and propagation-time findings forced instead.

## Five dry runs, scoped to five runs

Before propagating anything, I ran five controlled scenarios—one per path through the review flow—on April 15, 2026, all within an eighteen-minute window. What each showed, scoped to that run:

**A—happy path ([PR #71](https://github.com/nathanjohnpayne/mergepath/pull/71)).** I never got to post the trigger. Codex auto-reviewed on open and its 👍 landed 132 seconds after creation—the automation ahead of its operator, and first evidence of auto-review-on-open.

**B—fix and re-pass ([PR #72](https://github.com/nathanjohnpayne/mergepath/pull/72)).** A deliberately planted unquoted shell variable. Flagged, fixed, cleared, merged.

**C—disagreement ([PR #73](https://github.com/nathanjohnpayne/mergepath/pull/73)).** A `set +e` pattern I had a defensible rebuttal for. Codex flagged it; I posted the rebuttal; Codex re-flagged it with a stronger argument—its second finding said "for a valid class of inputs," countering my "bounded input space" claim. That is the repeat-after-rebuttal signal: the loop stops, an escalation comment records both positions, and the human tiebreaks. Closed without merging.

**D—multiple findings ([PR #74](https://github.com/nathanjohnpayne/mergepath/pull/74)).** Two deliberate P1s; Codex returned both in a single review. The first version of this post generalized that into "the runaway scenario does not naturally occur." One run cannot carry that claim; later evidence dismantled it—see the closing section.

**E—CI red ([PR #70](https://github.com/nathanjohnpayne/mergepath/pull/70)).** A deliberate CI failure: a forbidden top-level `vendor/` directory. Codex did not wait for the run. Its P1 named the workflow, the script, and the line range—`check_no_forbidden_top_level_dirs`, invoked from `repo_lint.yml`, hard-failing on `vendor`—and concluded the commit "cannot pass required CI in any environment." A static prediction read out of the repository's own enforcement code.

## The auto-merge race

One shipped bug earns its own record. [PR #60](https://github.com/nathanjohnpayne/mergepath/pull/60), a docs-only change, touched `.github/**` and therefore required external review—and merged without one. The auto-merge job read the PR's labels from the workflow event payload, a snapshot taken at dispatch; the blocking label had landed just before the approval and was absent from it, so the job saw an approved, unlabeled PR and merged. A textbook [TOCTOU](https://en.wikipedia.org/wiki/Time-of-check_to_time-of-use) race. [PR #63](https://github.com/nathanjohnpayne/mergepath/pull/63) shipped the durable fix (+53/−0, one file): re-read labels from the live API immediately before merging. Applying the label before any review posts is the cheap insurance in front of it.

## What propagation taught me

Propagating the template to six downstream repositories was the humbling part. My estimate—a guess, recorded nowhere but here—was 60 minutes for all six. The first two PRs, [swipewatch](https://github.com/nathanjohnpayne/swipewatch/pull/33) and [nathanpaynedotcom](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/180), ran concurrently and took over five hours. The reason: Codex, reading freshly copied files in repositories where it had no history, surfaced [seventeen distinct template bugs](https://github.com/nathanjohnpayne/mergepath/issues/75) in code the template's own review had already cleared.

The taxonomy, reconciled against the issue that catalogued it: three privilege-escalation vectors, where a crafted command could spoof `CODEX_CLEARED=1` or `BREAK_GLASS_ADMIN=1`; four findings-semantics bugs, where the wrong review round's comments counted toward merge clearance; five tokenizer bugs from the xargs-to-shlex migration; one hook command-grammar bug; two wholesale-copy regressions, where per-repo customizations—`functions/**` in protected paths, `coderabbit.enabled: true`—were silently overwritten by template defaults; and two timing and clock bugs. Seventeen in all, back-ported in one consolidated PR ([#76](https://github.com/nathanjohnpayne/mergepath/pull/76), +450/−102 across three files).

The catalog ran to eighteen. The eighteenth—gate (a) treating non-required CI checks as blocking, a P1—is marked "NOT YET FIXED" in the issue and was knowingly carried forward. The system that caught seventeen shipped with a documented open one; better the record say so than imply a clean sweep. After the back-port the remaining four repositories propagated without the same drama. Their tracking issues were closed within an eighteen-second window—proof they were closed together, not of how long the work took; where the propagation PRs are identifiable they landed three days later and ran about eleven minutes each. A cluster of closure timestamps is a filing artifact, not a duration.

The reading from the seventeen—of the record, not a measurement—is that propagation is implicitly a fresh-eyes code review. The reviewer that spent seven rounds on the hook in the template repo found new classes of bug the first time it met that code somewhere unfamiliar.

## What a consumer repo got, on April 16

Not a framework—a set of files, each with one job. `REVIEW_POLICY.md` holds the policy, `CLAUDE.md` the checklist, `.github/review-policy.yml` the machine-readable config; seven fail-closed CI checks enforce the structure; the author/reviewer split is backed by a `block-self-approval` job and a weekly retroactive audit; external review runs Phase 4a through the Codex App with a manual CLI fallback; CodeRabbit advises without gating; a sync manifest with a per-repo override registry keeps intentional divergences alive through propagation; and a security baseline ships on by default rather than per-repo opt-in.

## The numbers, as of April 16, 2026

Three weeks from the repository's creation:

- **32 PRs opened, 30 merged** on the template repo
- **46 project items** across 5 phases in [Project #2](https://github.com/users/nathanjohnpayne/projects/2)
- **7 fail-closed CI checks** in `scripts/ci/`
- **5 dry-run scenarios** validated on live infrastructure
- **17 template bugs** found during propagation, plus 1 known P1 carried forward

One more figure does not share their boundary, so it sits outside the list: **median 156 seconds** from a Codex trigger to the next bot signal, range 7 to 703 across 18 trigger-to-signal observations on mergepath PRs #55 through #79. Four of those observations come from PR #78, which opened on April 17—a figure for the Phase 4a era rather than the April 16 snapshot, recomputed on August 26, 2026.

Every figure above was recomputed for this revision, from the GitHub API and the repository's git history—the check-script count comes from `git ls-tree` against the April snapshot, not any API; the queries, populations, timestamps, and exclusions live in the published [audit ledger](https://github.com/nathanjohnpayne/nathanpaynedotcom/blob/main/plans/759/agent-approval-workflow-genesis-of-mergepath-ledger.md). The first version of this post said "100+ PRs" over "six weeks" (elsewhere, seven). The repository says 32 over three. A post about enforcing review discipline shipped unreviewed numbers; the correction belongs in the record as much as the bugs do.

## Since the snapshot

The April architecture is not today's. The figures in this section were measured on August 26, 2026, and will drift the moment another PR lands. The template repo now stands at 459 PRs; the seven check scripts in `scripts/ci/` have become 71; the consumer set grew from six repositories to nine. Phase 4b is no longer a manual fallback: `phase_4b_automation` now ships `enabled: true, mode: local`, running an external reviewer CLI headlessly and posting the verdict under the reviewer identity; the manual handoff is now the fallback. And dry-run D's generalization has not held: successive rounds have surfaced new findings in more than one observed run. [PR #66](https://github.com/nathanjohnpayne/mergepath/pull/66) was already a counterexample, and a later PR in this site's own repository ([#787](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/787)) took five Codex rounds returning 0, 4, 5, 1, and 7 findings—round three drawing a further two from CodeRabbit. Not every round found something new—which is the point: one-round convergence is not guaranteed, and two runs cannot say how often it fails. To be exact: #787 stopped at five because the operator set a five-round budget, not because the configured `max_review_rounds` guard escalated. The guard was never under strain—the assumption that reviews converge in one round was.

## Four rules

**1. Enforce, don't instruct—and name the boundary.** Instruction files are necessary for context and insufficient for compliance. If agents must open PRs, block direct pushes at the server. If PRs must carry self-reviews, refuse their creation locally. If complex changes need external review, block the merge with a server-visible label gate. Then be honest about each layer's reach: a local hook binds only sessions that load it, a server rule binds everyone short of an administrator override, and a break-glass variable is a documented human exit.

**2. Identity-switch for reviews.** Review under a separate reviewer identity consistently beat same-conversation review across three agent platforms. Repeated observation, not controlled measurement, and I cannot explain the mechanism. The cost is one GitHub account per agent, and I have kept paying it.

**3. Fresh eyes find what familiarity misses.** Code that had survived seven review rounds in the template repo gave up seventeen new bugs when Codex met it fresh downstream. Rotate reviewers, or deploy code where it gets read from scratch.

**4. Reliability is an infrastructure problem, not a capability problem.** The agent that shipped clean code was the same model as the one that pushed straight to main. What changed was the system around it.

The template is [open source](https://github.com/nathanjohnpayne/mergepath). The enforcement is mechanical, and its boundaries are named. The lessons cost me three weeks. Maybe they save you some of that.
