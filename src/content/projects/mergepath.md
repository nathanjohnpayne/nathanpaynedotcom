---
title: "Mergepath"
slug: "mergepath"
description: "A deterministic repository standard that keeps humans and AI coding agents aligned through canonical documentation, binding CI constraints, multi-identity code review, automated external review via the OpenAI Codex GitHub App, and one-command propagation across every downstream repo. The enforcement layer underneath every other project on this site."
seoDescription: "A repository standard for reliable AI-agent development: canonical docs, CI guardrails, multi-identity review, Codex review, and downstream propagation."
kicker: "AI × Infrastructure × Tooling"
order: 1
screenshotAspect: "wide"
screenshotSrc: "/images/projects/mergepath.png"
accent: "yellow"
liveUrl: "https://htmlpreview.github.io/?https://raw.githubusercontent.com/nathanjohnpayne/mergepath/main/mergepath/playground/index.html"
githubUrl: "https://github.com/nathanjohnpayne/mergepath"
tags: ["Infrastructure", "AI Tooling", "GitHub Actions", "Bash"]
status: "SHIPPED"
metadata:
  format: "Repository standard"
  focus: "Agent governance, code review, and CI enforcement"
stack: "Bash · GitHub Actions · 1Password · Claude Code · Codex · Cursor · CodeRabbit"
related:
  - label: "Blog: Agent Approval Workflow and the Genesis of Mergepath"
    href: "/blog/agent-approval-workflow-genesis-of-mergepath/"
  - label: "Blog: Six PRs, One Bug—What AI Agents Actually Get Wrong"
    href: "/blog/six-prs-one-bug-agent-failure-modes/"
  - label: "Blog: A Perfect Score on the Wrong Axis"
    href: "/blog/perfect-score-wrong-axis/"
---

## Overview

Mergepath (originally `ai_agent_repo_template`) is the repository standard I built after watching AI coding agents, like humans, quietly skip code review when nothing was there to stop them. It is the enforcement layer underneath every other project on this site—the reason the claim that a project was "built with AI agents from first commit to deploy" comes with a governance trail instead of just a vibe.

The operating premise is three clauses: written conventions are not enough, branch protection is mandatory, and review is performed by a different identity than the one that authored the change. The full origin story is in the companion blog post, [Agent Approval Workflow and the Genesis of Mergepath](/blog/agent-approval-workflow-genesis-of-mergepath/).

## What Mergepath enforces

Every repo on the standard carries the same canonical documentation—`AGENTS.md`, `CLAUDE.md`, `REVIEW_POLICY.md`, `rules/repo_rules.md`, `specs/`—that every agent is instructed to read before acting. Because instructions are exactly the thing agents skip, the documentation is backed by mechanism: no direct pushes to `main`, every human or agent change through a PR—Dependabot updates are the deliberate exception, approved and merged by their own workflow—and a `PreToolUse` hook (`scripts/hooks/gh-pr-guard.sh`) that blocks `gh pr create` when the required `Authoring-Agent` and `## Self-Review` fields are missing. Identity switches run through `gh-as-author.sh` / `gh-as-reviewer.sh` wrappers, and a CI check (`scripts/ci/check_no_bare_gh_writes`) fails closed on bypassing writes in the shell scripts it walks—it scans `scripts/` and skips CI checks, reporting surfaces and example code—so a PR does not land under the wrong account by accident. Not "never": `REVIEW_POLICY.md` itself records an August 2026 incident in which a repurposed 1Password item silently sent Codex's reviews out under the CI robot's byline. The wrappers narrow that failure to misconfiguration; they do not abolish it.

Review is multi-identity. Each agent authors as `nathanjohnpayne` and reviews under a separate machine user (`nathanpayne-claude`, `nathanpayne-codex`, `nathanpayne-cursor`), so no agent approves a PR under the account that authored it. Any PR of 300 lines or more, or touching protected paths, enters a two-phase external-review model. Phase 4a is automated through the ChatGPT Codex Connector GitHub App with structured request and check scripts (`scripts/codex-review-request.sh`, `scripts/codex-review-check.sh`). Phase 4b began as a manual CLI handoff and has run automated since early July 2026: `scripts/phase-4b-review.sh` selects an external reviewer whose agent differs from the author's, runs that reviewer's headless CLI over the diff, and posts the verdict under the reviewer identity, with the manual handoff kept as the last resort. A separate classifier, `scripts/phase-4b-classifier.sh`, reads a PR's changed files and body through five trigger detectors to decide whether Phase 4b should also fire proactively, on top of its fallback role. It is written and configured—`phase_4b_default: complex-changes` is set—but nothing in the repository executes it today: the references that remain are comments, the propagation manifest and a test. It is capability built and not wired up, which is worth saying plainly on a page about mechanism. A Codex P1 merge gate (`.github/workflows/codex-p1-gate.yml`) blocks merge while any unresolved Codex P1 finding is open, and CodeRabbit is wired in as an advisory second-opinion pass.

CI is where the standard has grown the most, so the count only means anything with a date on it: `scripts/ci/` held seven fail-closed checks when this page was first written in April 2026, twenty-seven by mid-May, and seventy-one at an August 2026 count—required files exist, tool folders carry no instructions, specs map to tests, generated output is untouched—seventy of them wired into `repo_lint.yml`, with a check (`check_ci_scripts_wired`) whose whole job is policing the gap between checks on disk and checks that run. The security baseline ships mostly as files: a `CODEOWNERS` file, a `SECURITY.md` policy, Dependabot version updates, all forty-three GitHub Actions pinned to commit SHAs, and least-privilege `permissions:` blocks on all nineteen workflows. Secret scanning with push protection is the one piece that cannot ship as a file—it is a repository setting—so the standard records it as a requirement rather than pretending to enforce it.

Credential plumbing is 1Password-backed: `scripts/op-preflight.sh` front-loads all biometric prompts so a session's author and reviewer PATs, GCP ADC, and SSH keys are cached once and reused.

## Cross-repo propagation

Mergepath is the canonical source, and a propagation tool keeps every downstream repo current instead of letting them drift. `scripts/sync-to-downstream.sh` reads a `.mergepath-sync.yml` manifest that declares which paths are *canonical* (mirrored byte-for-byte—127 of them) and which are *kit* directories (seven: every template file required, repo-specific additions allowed), along with which of the nine consumer repos opt in.

`--audit` reports per-repo drift with zero side effects; `--sync-all` reconciles a consumer's full state; passing a commit-ish propagates only what changed at that commit. Every run opens one PR per consumer through the same review flow as any other change. Where a consumer needs to diverge on purpose, a per-repo `.sync-overrides.yml` registry records the exception—with a documented reason—so propagation never clobbers it. The model inverts the old default of "let docs drift, catch it in a weekly audit" into canonical-first, drift-as-exception.

## New-repo bootstrap wizard

`scripts/bootstrap-new-repo.sh` stands up a brand-new repo from the template end to end. It is a four-stage wizard—template mirror, GitHub infrastructure, Firebase/CodeRabbit/Codex posture, and Project board—fed by a separate scaffold script, with a `.bootstrap-state` file so a failed run resumes where it left off. Every side effect runs through a wrapper, so `--dry-run` produces a complete do-it-yourself runbook with zero side effects. What used to be an afternoon of copy-paste-and-customize is one command.

## The policy playground

The screenshot above is the **Mergepath Playground**, a single-file HTML prototype that lives at [`mergepath/playground/index.html`](https://github.com/nathanjohnpayne/mergepath/blob/main/mergepath/playground/index.html) in the repo. It exposes the knobs in `.github/review-policy.yml` that decide routing—external review threshold, protected paths, CodeRabbit toggle, Codex GitHub App toggle and max rounds, eligible internal reviewers—and replays PRs against the draft policy so you can feel the shape of the change before committing the YAML.

The page opens on a synthetic set of eight sample PRs, so it demos with zero setup. Real data arrives two ways: `scripts/policy-sim.sh` pulls your own repo's merged PRs with `gh pr list` and injects them into a temporary copy of the page, and since late July 2026 an in-page loader replays any public repo's PRs by fetching them from the GitHub REST API in the browser. There is no backend and no build system, and no network calls until you ask it to pull a public repo—the page's own Content-Security-Policy pins `connect-src` to `api.github.com` and nowhere else.

## What the record shows

The Mergepath repo itself has 447 merged PRs as of August 2026, and a dedicated test suite covers the PR guard and the review-policy parser. The sharpest number in the record, though, cuts against the template rather than for it.

In April 2026, [`mergepath#64`](https://github.com/nathanjohnpayne/mergepath/pull/64) added 775 lines of new review tooling and went from open to merged in twenty-three minutes, collecting five reviews from four reviewers on the way: `nathanpayne-claude` (approved), CodeRabbit, the Codex App, and `nathanpayne-codex` (changes requested, then approved). Those files carried template bugs that review round did not catch. Five of the seventeen the catalogue eventually held came later still, from the `xargs`-to-`shlex` migration propagation forced, so the round let through the defects present in it rather than all seventeen. Propagation then dropped the same files into Swipe Watch and this site's repo, where Codex spent seven review rounds on each downstream PR surfacing them; issue [mergepath#75](https://github.com/nathanjohnpayne/mergepath/issues/75) named the seventeen and the back-port merged the same day. The lesson I took from the asymmetry: review found the least where the files were the most familiar, and fresh codebases did the work the template's own gate had not.

The July 2026 stress test is the other half of the record: 134 review-finding threads across a 24-hour, ten-PR batch and its hotfix—and the defect that record still let through is examined in [A Perfect Score on the Wrong Axis](/blog/perfect-score-wrong-axis/).

The fleet stands at ten repositories—the hub plus nine consumers, including Override, Device Source of Truth, Friends & Family Billing, Swipe Watch, and this site.

## The price

None of this is free, and the page would be dishonest to present it as pure upside. Every change in the fleet, however small, pays the same choreography: a PR, a self-review section, an identity switch, review, and CI that fails closed on formality as readily as on substance. The gates themselves misfire on the record: CodeRabbit rate-limits under load (seven of the eleven PRs in the July batch drew a "rate limited" notice) and skips stacked PRs while still reporting a green check, the identity plumbing produced the August byline incident above, and 134 threads of automated review still passed the defect the Perfect Score post dissects.

And there is an outcome this page cannot report, so I will say it plainly: nobody outside this fleet runs the standard—all nine consumers are my own repos—and no repo in the fleet runs without the gates, so there is no measure of what they save, only of what they catch, what they miss, and what they cost.

## Why it matters

The gap between "an AI agent wrote this code" and "an AI agent wrote this code and I trust it" is not a smarter model. It is enforcement infrastructure that makes bypassing review expensive enough that agents, like well-intentioned humans, just don't. Mergepath is that infrastructure, extracted from the projects that needed it first and hardened against the failure modes documented in [Six PRs, One Bug—What AI Agents Actually Get Wrong](/blog/six-prs-one-bug-agent-failure-modes/).
