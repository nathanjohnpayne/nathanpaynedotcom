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
  - "Instruction files give an agent context, not compliance. Layered controls give compliance—but name where each one runs, because the combination raises the cost of the wrong action rather than making it impossible."
  - "Reviewing under a separate reviewer identity consistently beat same-conversation review across three agent platforms. That is repeated observation, not controlled measurement; the cost is one GitHub account per agent."
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
    title: "Five stages of agent review enforcement"
    description: "The enforcement path as of April 2026: instruction files, then server-side branch rules, separate-identity self-review, threshold-triggered external review, and automated Codex review."
    content: |
      graph TD
          A["Instruction files only<br/>(AGENTS.md, CLAUDE.md)"] --> B["GitHub branch rules<br/>(require PRs)"]
          B --> C["Self-review under<br/>separate identity"]
          C --> D["External review for<br/>complex changes (300+ lines)"]
          D --> E["Automated external<br/>review via Codex App"]
          style A fill:#e8b4b4,stroke:#993d3d,color:#333
          style B fill:#d4a84b,stroke:#a07830,color:#333
          style C fill:#d4a84b,stroke:#a07830,color:#333
          style D fill:#7bc67e,stroke:#4a8a4d,color:#333
          style E fill:#2c5f8a,stroke:#2c5f8a,color:#fff
    caption: "The five stages of agent review enforcement, as of April 2026"
---

The rule was written down in every file the agents read: never push directly to `main`; every change goes through a pull request. They had all read it. Any of them could quote it back to me. And then one of them would push straight to `main` anyway—usually on a change small enough not to feel like it counted, usually right after I had said "just fix this quickly." Every time it happened, I became the review process: reading diffs after the fact, relaying feedback between sessions, deciding by hand whether output I had not inspected could be trusted. The agents were producing more; my confidence in what they produced was not keeping up.

Two things were going on, and neither is really about AI. Review only happens when something forces a pause, and an agent left to itself never pauses—it goes from prompt to pushed commit with no point where anyone is expected to look. And a rule that exists only as a sentence in a document gets followed when following it is convenient. Human teams answered both problems long ago with tooling that refuses the wrong action instead of a handbook that describes it. That became the product hypothesis: agents need the same answer, for the same reason. Writing the rule more clearly does not work. Making the wrong action mechanically expensive, at a boundary you can name, does.

[Mergepath](https://github.com/nathanjohnpayne/mergepath) (originally `ai_agent_repo_template`) is what that hypothesis turned into: a set of files you drop into a repository that route any AI agent working in it—and the human running it—down the same path. Canonical documentation, so each rule has exactly one home. Fail-closed CI checks. Multi-identity code review, where the GitHub account that writes a change is never the account that approves it. And, for changes big enough to need an outside opinion, automated external review through the OpenAI Codex GitHub App.

The mergepath repository was created on March 24, 2026, and this post describes it as of April 16, 2026—three weeks of daily use, by which point the template had been propagated to six production repositories. Several figures below have moved a long way since; a closing section says how. None of it was designed top-down. I am a product manager, not an engineer; the system grew bottom-up, and every major control was born from a specific failure I watched happen in real time.

## The discovery: bots need code review

Within a week of using Claude Code and Cursor full-time, one thing was clear: agents produce substantially better output when made to review their own work before shipping it. Even the crude version—"now review what you just wrote," in the same chat—found real bugs: missing error handling, unquoted shell variables, race conditions.

The more surprising observation: asking the agent to post its review under a different GitHub identity—to literally switch from `nathanjohnpayne`, the author, to `nathanpayne-claude`, the reviewer, and submit a formal PR review—improved the reviews further. Same model, same context window, same code; the reviewer persona caught things the author persona missed.

I want to be precise about the strength of that claim, because the first version of this post oversold it. This is a repeated observation across Claude Code, Cursor, and Codex, not a measurement: I ran no controlled comparison against same-conversation review, kept no defect ledger, and have no mechanistic explanation. The pattern held often enough, across three platforms, that I built the account structure around it. Every agent gets an author identity (`nathanjohnpayne`, shared by all of them) and its own reviewer identity (`nathanpayne-claude`, `nathanpayne-cursor`, `nathanpayne-codex`). Every PR is authored under one and reviewed under another.

## Why instruction files are not enough

Agents, like humans, would rather skip the PR entirely. I tried instruction files first—`CLAUDE.md` for Claude Code, `.cursorrules` for Cursor, `AGENTS.md` for Codex—each carrying the explicit rule. Like humans, they would selectively remember the rules based on what was easiest, or what they could seemingly think they could get away with. Not every time. But often enough that the instruction file alone could not be trusted, and often enough is all it takes when every lapse lands on the human.

## Adding teeth, and naming each boundary

**The failure:** direct pushes to `main` despite the written rule. **The options:** write the rule more forcefully, enforce at the GitHub server, or enforce inside the agent's own session. **The decision:** enforce at both boundaries, because they fail differently. Branch protection—a server-side rule that binds everyone, me included, short of an explicit administrator override—ended direct pushes outright. It also produced the next failure immediately: agents opened PRs with no description and no self-review, then merged them on their own approval. Two pieces answer that, and they are worth separating because I conflated them myself until a reviewer caught it. A [PreToolUse hook](https://github.com/nathanjohnpayne/mergepath/blob/main/scripts/hooks/gh-pr-guard.sh) intercepts every `gh pr create` in the local session and insists it go through the author wrapper. The wrapper's [body contract](https://github.com/nathanjohnpayne/mergepath/blob/main/scripts/lib/pr-body-contract.mjs) is what reads the PR body and refuses it unless there is an `Authoring-Agent:` header and a `## Self-Review` section. Neither is a parser—the contract is a line-anchored regex, the hook's own fallback a substring match—but both run before the API call, so a non-conforming PR is never created.

**The tradeoff:** the hook is client-side. It binds only agents in a session that loads it; a different tool, a raw API call, or the GitHub web UI walks straight past it. The server rules are the backstop, and even they carry a designed hole: merging with `--admin` requires `BREAK_GLASS_ADMIN=1`, set explicitly by the human in chat. The wrong action is not impossible. It is expensive, and it leaves a record.

That distinction—where a control runs, and whom it binds—matters more than any single control:

| Control | Where it runs | Whom it binds |
|---|---|---|
| PR-creation and merge guard (`gh-pr-guard.sh`) | Local: a Claude Code PreToolUse hook | Only agents in a session that loads it; other tools and the web UI bypass it |
| Branch protection | GitHub server | Everyone, including the human—but an account with admin rights can still merge past it with `--admin`, which is the bypass the last row governs |
| Required status checks and the Label Gate | GitHub server | Everyone, subject to admin override |
| `scripts/ci/` checks | CI | The merge, not the push |
| Author/reviewer identity split | Convention, backed by a `block-self-approval` CI job | The job blocks self-approval; the split itself is convention |
| `BREAK_GLASS_ADMIN` / `BREAK_GLASS_MERGE_STATE` | Local hook, then server | Deliberately bypassable—by the human, on the record |

No layer makes the wrong action impossible; the break-glass path exists precisely so that it is not. The combination raises its cost until the right action is cheaper.

**Evidence after launch:** four months on, the layering still bites, and it bit in a way that shows why the layers are separate. While this post was being fact-checked, a `gh pr create` was refused because its body wrote `**Authoring-Agent:**` in bold. The refusal did not come from the hook: the hook's job there was to insist the write go through the author wrapper at all, and having seen the wrapper it stepped aside. What rejected the body was the wrapper's own contract check, whose match is line-anchored and so does not see a bolded header. Two components, two jobs, one of which is easy to mistake for the other. The authorized break-glass merge that same session needed both variables in the table's last row.

## The threshold: when self-review is not enough

**The failure:** separate-identity self-review hits diminishing returns on complex changes. The agent's blind spots are correlated with its authoring decisions; it will not question architectural assumptions that felt correct when it made them. **The options:** external review on every PR (unaffordable in relay time), none at all (the failure above), or a line-count threshold with a sensitive-path override. **The decision:** changes under 300 diff lines that avoid sensitive paths get self-review only. Three hundred lines or more, or any change touching `.github/**`, auth, payments, or paths matching `**/*secret*` or `**/*credential*`, requires review by a different agent. The comparison is inclusive at the boundary—the policy defines the self-review lane as strictly *under* the threshold, so a PR of exactly 300 lines needs the outside opinion. A [CI workflow](https://github.com/nathanjohnpayne/mergepath/blob/main/.github/workflows/pr-review-policy.yml) applies a `needs-external-review` label when a PR crosses the line, and a Label Gate check blocks the merge until the review process clears it—server-enforced, not honor-system. One propagation bug later landed in exactly this config block: downstream repos had added `functions/**` to their protected paths, and wholesale-copying the template silently dropped it. More on that below.

**The tradeoff:** at first, "external review" meant me—carrying each PR's context to a second agent session, relaying findings back, looping until it approved. It worked, and it made me the coordination layer for every round of every complex PR: the position this project exists to eliminate.

## The automation: Codex-in-GitHub

In April 2026, OpenAI enabled the [Codex GitHub App](https://chatgpt.com/codex/cloud/settings/code-review) for automated code review: trigger it with `@codex review` and it posts a standard GitHub review with inline findings tagged P0 through P3. The manual relay was the observed failure; the options were to keep paying it, to loosen the requirement, or to automate the reviewer. Reviewing through the API made the third real—request, address, iterate, no human in the loop. Building it took [Project #2](https://github.com/users/nathanjohnpayne/projects/2): 46 tracked items across 5 phases—37 issues and 9 pull requests—against a repository that held 32 PRs in total at the snapshot.

Two scripts drive the loop. [`codex-review-request.sh`](https://github.com/nathanjohnpayne/mergepath/blob/main/scripts/codex-review-request.sh) posts the trigger, polls for a response, and emits machine-parseable JSON. It encodes a quirk that took live observation to discover: Codex never posts an `APPROVED` review—no findings means a 👍 reaction on the PR, findings mean a `COMMENTED` review with inline priority badges. [`codex-review-check.sh`](https://github.com/nathanjohnpayne/mergepath/blob/main/scripts/codex-review-check.sh) is the read-only merge gate: required CI green, a reviewer identity's latest-state `APPROVED`, and Codex cleared on the current HEAD.

That last gate was the hardest, and the difficulty was the platform's. Across three review submissions on [PR #65](https://github.com/nathanjohnpayne/mergepath/pull/65)—two blocking, each answered by a fix commit—`nathanpayne-codex` kept finding edge cases in the anchor deciding when a commit became the current HEAD, which is the gate's basis for discarding stale clearances. GitHub exposes no per-PR push timestamp for ordinary pushes: the timeline's `committed` events carry a null `created_at`, and only force-pushes are stamped. So the design is two-layer—force-push events where they exist, and a freshness window (`reaction_freshness_window_seconds`, default 1800) for everything else, so a 👍 older than 30 minutes never clears a merge whatever committer date the HEAD carries. The residual hole is documented in the code rather than papered over.

## The hook: seven rounds, six fixes, one retracted approval

The most instructive artifact is [PR #66](https://github.com/nathanjohnpayne/mergepath/pull/66), which extended the guard hook to block `gh pr merge` on labeled PRs until the merge gate cleared. Parsing `gh pr merge` sounds trivial and is not: the selector can be a number, a URL, or a branch name; `--repo` has a `-R` short form; global flags can precede the subcommand; and the documented merge format carries an inline environment prefix.

`nathanpayne-codex` posted seven blocking reviews on that PR, and the seven rounds produced six distinct parser fixes:

| Fix | Parser gap it closed |
|---|---|
| 1 | Selector handling: URLs and branch names, not just PR numbers |
| 2 | Bash word splitting ignored shell quotes, and `-R` was missed as `--repo`'s short form |
| 3 | A global `-R`/`--repo` placed before the subcommand bypassed the label lookup |
| 4 | Inline env prefixes (`CODEX_CLEARED=1 gh pr merge`) exited before any guard ran |
| 5 | Command-position detection treated `echo gh pr merge` as a real merge |
| 6 | `--admin` matched by substring grep falsely blocked `--subject "--admin follow-up"` |

The record also holds a moment the first version of this post left out. Partway through, the reviewer posted an `APPROVED`—and retracted it 81 seconds later with a fresh `CHANGES_REQUESTED`, then kept finding bugs for four more rounds before the final approval. An approval is a claim about the code, and this reviewer treated its own claim as revisable, not as a finish line.

Every relaxation of the bash matcher that admitted a new legitimate form opened a new false-positive or false-negative path. Bash string parsing is the wrong tool for shell command grammar. The hook eventually moved to Python's `shlex`—a migration [issue #67](https://github.com/nathanjohnpayne/mergepath/issues/67) was supposed to investigate at leisure, and propagation-time findings forced instead.

## Five dry runs, scoped to five runs

Before propagating anything, I ran five controlled scenarios—one per path through the review flow—on April 15, 2026, all within an eighteen-minute window. What each showed, scoped to that run:

**A—happy path ([PR #71](https://github.com/nathanjohnpayne/mergepath/pull/71)).** I never got to post the trigger. Codex auto-reviewed on open and its 👍 landed 132 seconds after creation—the automation ahead of its own operator, and first evidence of auto-review-on-open.

**B—fix and re-pass ([PR #72](https://github.com/nathanjohnpayne/mergepath/pull/72)).** A deliberately planted unquoted shell variable. Flagged, fixed, cleared, merged.

**C—disagreement ([PR #73](https://github.com/nathanjohnpayne/mergepath/pull/73)).** A `set +e` pattern I had a defensible rebuttal for. Codex flagged it; I posted the rebuttal; Codex re-flagged the same issue with a stronger argument—its second finding said "for a valid class of inputs," squarely countering my "bounded input space" claim. That is the repeat-after-rebuttal signal: the loop stops, an escalation comment records both positions, and the human tiebreaks. Closed without merging.

**D—multiple findings ([PR #74](https://github.com/nathanjohnpayne/mergepath/pull/74)).** Two deliberate P1s. In this run, Codex returned both in a single review. The first version of this post generalized that into "the runaway scenario does not naturally occur." One run cannot carry that claim, and later evidence dismantled it—see the closing section.

**E—CI red ([PR #70](https://github.com/nathanjohnpayne/mergepath/pull/70)).** A deliberate CI failure: a forbidden top-level `vendor/` directory. Codex did not wait for the run. Its P1 named the workflow, the script, and the line range—`check_no_forbidden_top_level_dirs`, invoked from `repo_lint.yml`, hard-failing on `vendor`—and concluded the commit "cannot pass required CI in any environment." A static prediction read out of the repository's own enforcement code.

## The auto-merge race

One shipped bug earns its own record. [PR #60](https://github.com/nathanjohnpayne/mergepath/pull/60), a docs-only change, touched `.github/**` and therefore required external review—and merged without one. The auto-merge job read the PR's labels from the workflow event payload, a snapshot taken at dispatch; the blocking label had landed just before the approval and was absent from it, so the job saw an approved, unlabeled PR and merged. A textbook [TOCTOU](https://en.wikipedia.org/wiki/Time-of-check_to_time-of-use) race. [PR #63](https://github.com/nathanjohnpayne/mergepath/pull/63) shipped the durable fix (+53/−0, one file): re-read labels from the live API immediately before merging. Applying the label before any review posts is the cheap insurance in front of it.

## What propagation taught me

Propagating the template to six downstream repositories was the most humbling part of the project. My estimate—a guess, recorded nowhere but here—was 60 minutes for all six. The first two PRs, [swipewatch](https://github.com/nathanjohnpayne/swipewatch/pull/33) and [nathanpaynedotcom](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/180), ran concurrently and took over five hours. The reason: Codex, reading freshly copied files in repositories where it had no history, surfaced [seventeen distinct template bugs](https://github.com/nathanjohnpayne/mergepath/issues/75) in code the template's own review had already cleared.

The full taxonomy, reconciled against the issue that catalogued it: three privilege-escalation vectors, where a crafted command could spoof `CODEX_CLEARED=1` or `BREAK_GLASS_ADMIN=1`; four findings-semantics bugs, where the wrong review round's comments counted toward merge clearance; five tokenizer bugs from the xargs-to-shlex migration; one hook command-grammar bug; two wholesale-copy regressions, where per-repo customizations—`functions/**` in protected paths, `coderabbit.enabled: true`—were silently overwritten by template defaults; and two timing and clock bugs. That is seventeen, all back-ported in one consolidated PR ([#76](https://github.com/nathanjohnpayne/mergepath/pull/76), +450/−102 across three files).

The catalog actually ran to eighteen. The eighteenth—gate (a) treating non-required CI checks as blocking, a P1—is marked "NOT YET FIXED" in the issue itself and was knowingly carried forward. The system that caught seventeen shipped with a documented open one, and I would rather the record say so than imply a clean sweep. After the back-port the remaining four repositories propagated cleanly, their tracking issues closing within an eighteen-second window.

The reading I take from the seventeen—a reading of the record, not a measurement—is that propagation is implicitly a fresh-eyes code review. The reviewer that spent seven rounds on the hook in the template repo found new classes of bug the first time it met that code somewhere unfamiliar.

## What a consumer repo got, on April 16

Not a framework—a set of files, each with one job. `REVIEW_POLICY.md` holds the policy, `CLAUDE.md` the checklist, `.github/review-policy.yml` the machine-readable config; seven fail-closed CI checks enforce the structure; the author/reviewer split is backed by a `block-self-approval` job and a weekly retroactive audit; external review runs Phase 4a through the Codex App with a manual CLI fallback; CodeRabbit advises without gating; a sync manifest with a per-repo override registry keeps intentional divergences alive through propagation; and a security baseline ships on by default rather than per-repo opt-in.

## The numbers, as of April 16, 2026

Three weeks from the repository's creation:

- **32 PRs opened, 30 merged** on the template repo
- **46 project items** across 5 phases in [Project #2](https://github.com/users/nathanjohnpayne/projects/2)
- **7 fail-closed CI checks** in `scripts/ci/`
- **5 dry-run scenarios** validated on live infrastructure
- **17 template bugs** found during propagation, plus 1 known P1 carried forward
- **Median 156 seconds** Codex response time per triggered review round—range 7 to 703 seconds across all 18 triggered rounds on mergepath PRs #55 through #79

Every figure above was recomputed for this revision, from the GitHub API and from the repository's own git history—the check-script count, for instance, comes from `git ls-tree` against the April snapshot rather than from any API; the queries, populations, timestamps, and exclusions live in the published [audit ledger](https://github.com/nathanjohnpayne/nathanpaynedotcom/blob/main/plans/759/agent-approval-workflow-genesis-of-mergepath-ledger.md). The first version of this post said "100+ PRs" over "six weeks" (elsewhere, seven). The repository says 32 over three. A post about enforcing review discipline shipped unreviewed numbers; the correction belongs in the record as much as the bugs do.

## Since the snapshot

The April architecture is not today's. The template repo now stands at 459 PRs; the seven check scripts in `scripts/ci/` have become 66; the consumer set grew from six repositories to nine. Phase 4b is no longer a manual fallback: `phase_4b_automation` now ships `enabled: true, mode: local`, running an external reviewer CLI headlessly and posting the verdict under the reviewer identity; the manual handoff is now the fallback. And dry-run D's comforting generalization is dead: multi-round reviews that surface new findings each round happen routinely—[PR #66](https://github.com/nathanjohnpayne/mergepath/pull/66) was already a counterexample, and a later PR in this site's own repository ([#787](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/787)) took five Codex rounds returning 0, 4, 5, 1, and 7 Codex findings—round three drawing a further two from CodeRabbit. To be exact about which limit that tested: #787 stopped at five because the operator set a five-round budget, not because the configured `max_review_rounds` guard escalated. The guard was never the thing under strain—the assumption that reviews converge in one round was.

## Four rules

**1. Enforce, don't instruct—and name the boundary.** Instruction files are necessary for context and insufficient for compliance. If agents must open PRs, block direct pushes at the server. If PRs must carry self-reviews, refuse their creation locally. If complex changes need external review, block the merge with a server-visible label gate. Then be honest about each layer's reach: a local hook binds only sessions that load it, a server rule binds everyone short of an administrator override, and a break-glass variable is a documented human exit.

**2. Identity-switch for reviews.** Review under a separate reviewer identity consistently beat same-conversation review across three agent platforms. That is repeated observation, not a controlled measurement, and I cannot explain the mechanism. The cost is one GitHub account per agent, and I have kept paying it.

**3. Fresh eyes find what familiarity misses.** Code that had survived seven review rounds in the template repo gave up seventeen new bugs when Codex met it fresh downstream. Rotate reviewers, or deploy code where it gets read from scratch.

**4. Reliability is an infrastructure problem, not a capability problem.** The agent that shipped clean code was the same model as the one that pushed straight to main. What changed was the system around it.

The template is [open source](https://github.com/nathanjohnpayne/mergepath). The enforcement is mechanical, and its boundaries are named. The lessons cost me three weeks. Maybe they save you some of that.
