---
title: "AI Agent Repository Template"
slug: "ai-agent-repo-template"
description: "A deterministic repository standard that keeps humans and AI coding agents aligned through canonical documentation, binding CI constraints, multi-identity code review, and automated external review via the OpenAI Codex GitHub App. The enforcement layer underneath every other project on this site."
kicker: "AI × Infrastructure × Tooling"
order: 0
screenshotAspect: "wide"
screenshotSrc: "/images/projects/ai-agent-repo-template-hero.png"
accentColor: "#223f89"
accentColorClass: "project-page--blue"
gradientFrom: "#dce3f0"
gradientTo: "#f5f0e4"
liveUrl: "https://github.com/nathanjohnpayne/ai_agent_repo_template"
githubUrl: "https://github.com/nathanjohnpayne/ai_agent_repo_template"
tags: ["Infrastructure", "AI Tooling", "GitHub Actions", "Bash/Python"]
heroRefresh: "github-social"
metadata:
  domain: "Infrastructure × AI Tooling"
  format: "Repository standard"
  focus: "Agent governance, code review, and CI enforcement"
  status: "Live template"
stack: "Bash · Python · GitHub Actions · 1Password · Claude Code · Codex · Cursor"
related:
  - label: "Blog: Agent Approval Workflow and the Genesis of ai-agent-repo-template"
    href: "/blog/agent-approval-workflow-genesis-of-ai-agent-repo-template/"
  - label: "Blog: Six PRs, One Bug—What AI Agents Actually Get Wrong"
    href: "/blog/six-prs-one-bug-agent-failure-modes/"
---

## Overview

`ai-agent-repo-template` is the repository standard I built after watching AI coding agents, like humans, quietly skip code review when nothing was there to stop them. It is the enforcement layer underneath every other project on this site—the reason the claim that a project was "built with AI agents from first commit to deploy" comes with a governance trail instead of just a vibe.

The template treats agent output the way regulated engineering organizations treat human output: written conventions are not enough, branch protection is mandatory, and review is performed by a different identity than the one that authored the change. The full origin story is in the companion blog post, [Agent Approval Workflow and the Genesis of ai-agent-repo-template](/blog/agent-approval-workflow-genesis-of-ai-agent-repo-template/).

## What the template provides

- Canonical documentation files (`AGENTS.md`, `CLAUDE.md`, `REVIEW_POLICY.md`, `rules/repo_rules.md`, `specs/`) that every agent reads before acting.
- Binding branch protection: no direct pushes to `main`, all changes go through a PR, and a `PreToolUse` hook (`scripts/hooks/gh-pr-guard.sh`) blocks `gh pr create` if the required `Authoring-Agent` and `## Self-Review` fields are missing.
- Multi-identity review: each agent authors as `nathanjohnpayne` and reviews under a separate machine user (`nathanpayne-claude`, `nathanpayne-codex`, `nathanpayne-cursor`) so an agent never approves its own code.
- Automated external review for any PR over 300 lines or touching protected paths, routed through the ChatGPT Codex Connector GitHub App with structured request/check scripts (`scripts/codex-review-request.sh`, `scripts/codex-review-check.sh`).
- 1Password-backed credential plumbing via `scripts/op-preflight.sh` that front-loads all biometric prompts so a session's author and reviewer PATs, GCP ADC, and SSH keys are cached once and reused.

## The numbers

- **30+ PRs** on the template repo itself, each one exercising the governance loop end-to-end.
- **167 hook test cases** covering the PR guard, review policy parser, and credential preflight script.
- **17 template bugs** surfaced during propagation across downstream projects—bugs that had survived seven rounds of review on the template before fresh eyes in a new codebase found them.
- **7 repositories** currently using the template, including Override, Device Source of Truth, Friends & Family Billing, and this site.

## Why it matters

The gap between "an AI agent wrote this code" and "an AI agent wrote this code and I trust it" is not a smarter model. It is enforcement infrastructure that makes bypassing review expensive enough that agents, like well-intentioned humans, just don't. `ai-agent-repo-template` is that infrastructure, extracted from the projects that needed it first and hardened against the failure modes documented in [Six PRs, One Bug—What AI Agents Actually Get Wrong](/blog/six-prs-one-bug-agent-failure-modes/).
