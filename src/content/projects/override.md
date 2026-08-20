---
title: "Override"
slug: "override"
description: "A Broadway-focused financial operating system for structuring capitalization, modeling investor returns, and replacing spreadsheet workflows with live, shareable deals."
seoDescription: "A Broadway financial operating system for capitalization, investor returns, ownership, and live deal rooms without spreadsheet drift."
kicker: "AI × Finance × Theater"
order: 3
screenshotAspect: "wide"
screenshotSrc: "/images/projects/override-hero.png"
accent: "yellow"
liveUrl: "https://overridebroadway.com"
githubUrl: "https://github.com/nathanjohnpayne/overridebroadway"
tags: ["Finance", "Theater", "React", "Firebase"]
status: "SHIPPED"
metadata:
  format: "Financial operating system"
  focus: "Capitalization, ownership, and investor workflows"
stack: "Next.js · TypeScript · Tailwind · Zod · Firebase · Vitest"
related:
  - label: "Blog: Agent Approval Workflow and the Genesis of Mergepath"
    href: "/blog/agent-approval-workflow-genesis-of-mergepath/"
  - label: "Blog: Six PRs, One Bug—What AI Agents Actually Get Wrong"
    href: "/blog/six-prs-one-bug-agent-failure-modes/"
  - label: "Project: Friends & Family Billing"
    href: "/projects/friends-and-family-billing/"
---

## Overview

I invest in Broadway productions. The first time I wired money for a show, I received a PDF term sheet, an Excel cap table, and a subscription agreement by email. Three months later, the cap table had drifted from the term sheet. Nobody was wrong—the spreadsheet just wasn't a system. It was a snapshot that stopped being maintained the moment the production went live.

Override exists because I wanted the financial layer of a Broadway production to work like a product: structured, auditable, and shareable without requiring someone to rebuild a spreadsheet every time an investor asks a question.

## What the product does

- Structures a production's capitalization—weekly nut, royalties, house fees, GP structures, and waterfall rules—in a guided web workflow with industry-standard defaults.
- Models investor returns with per-investor ROI, cash-on-cash multiples, IRR, and recoupment forecasts, driven automatically from the cap table.
- Runs Bear, Base, and Bull scenarios side by side, with sensitivity grids across occupancy rates and run lengths showing the full investor outcome surface.
- Tracks every investor's commitment, funded amount, ownership percentage, and subscription status from invited through fully admitted.
- Generates a private Deal Room link so backers can see deal structure and scenarios without creating an account.

## How it was built

Override started as a `create-next-app` scaffold and grew into a production financial platform in about 75 commits. The stack is Next.js 16, TypeScript, and Firebase, with Sonner for notifications and Vitest for testing.

The early commits were product work: production CRUD, dashboard view modes, the waterfall modeling engine, and the investor ledger. The domain model required getting comfortable with theatrical financing mechanics—recoup-first versus share-from-dollar-one structures, running royalty offsets, and GP fee calculations—and translating them into interfaces that a non-technical producer could use.

The middle phase was about operational trust. Financial software can't have credential leaks or deployment ambiguity, so the repo moved to a 1Password-first authentication model, with service account keys stored in vaults and a bootstrap script that restores local config from 1Password item IDs. Deploy auth was documented, rotated, and eventually shifted toward keyless Firebase deploys.

The final phase was the one I learned the most from: building the [multi-agent code review system](https://github.com/nathanjohnpayne/overridebroadway/blob/main/REVIEW_POLICY.md) that now runs across all my repos. Override was where I first set up machine user accounts ([nathanpayne-claude](https://github.com/nathanpayne-claude), [nathanpayne-codex](https://github.com/nathanpayne-codex), [nathanpayne-cursor](https://github.com/nathanpayne-cursor)), wrote the cross-agent review pipeline, added CodeRabbit with custom financial modeling review guidance, and introduced the disagreement detection workflow that flags when reviewers diverge. The [PreToolUse hook](https://github.com/nathanjohnpayne/overridebroadway/blob/main/AGENTS.md), the bug fix escalation policy, and the two-strike rule all originated here—before being extracted into a template that I applied to every other project. The full origin story, including why this system matters for trust-sensitive work like financial modeling, is in [Agent Approval Workflow and the Genesis of Mergepath](/blog/agent-approval-workflow-genesis-of-mergepath/).

## Why it matters

Broadway is a relationship-driven business, but the operating layer is still full of brittle document workflows. A producer managing a $15M capitalization might have investor commitments in a spreadsheet, executed agreements in a Dropbox folder, and waterfall terms in a PDF that was last updated during the offering. Override is built around the idea that trust-sensitive financial work should still feel legible, structured, and up to date—even after the production opens.

The interesting part of this project is the translation exercise. Theatrical financing has its own vocabulary and its own math: recoupment triggers, operating reserve mechanics, overcall provisions, creative fee waterfalls. These concepts are well understood by industry professionals, but they've never had dedicated software. The work was figuring out which abstractions make the math accessible without flattening the domain—and building interfaces that a general partner and a first-time angel investor can both use.
