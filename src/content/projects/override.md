---
title: "Override"
slug: "override"
description: "A Broadway-focused financial operating system for structuring capitalization, modeling investor returns, and replacing spreadsheet workflows with live, shareable deals."
seoDescription: "A Broadway financial operating system for capitalization, investor returns, ownership, and live deal rooms without spreadsheet drift."
kicker: "AI × Finance × Theater"
order: 2
screenshotAspect: "wide"
screenshotSrc: "/images/projects/override-hero.png"
accent: "paper"
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

Override started as a `create-next-app` scaffold and grew from there in three phases. More than a hundred of its commits are product and platform work; the rest of the history is dependency bumps and template syncs.

The early commits were product work: production CRUD, dashboard view modes, the waterfall modeling engine, and the investor ledger. The domain model required getting comfortable with theatrical financing mechanics—recoup-first versus share-from-dollar-one structures, running royalty offsets, and GP fee calculations—and translating them into interfaces that a non-technical producer could use.

The middle phase was about operational trust. Financial software can't have credential leaks or deployment ambiguity, so the repo moved to a 1Password-first authentication model, with service account keys stored in vaults and a bootstrap script that restores local config from 1Password item IDs. Deploy auth was documented, rotated, and eventually shifted toward keyless Firebase deploys.

The final phase outlived the project. The review policy that now governs all my repos originated here: on March 17, 2026—a week before the Mergepath template repo existed—Override's [agent instructions](https://github.com/nathanjohnpayne/overridebroadway/blob/main/AGENTS.md) gained a written code review policy and the first CI enforcement of it, one workflow blocking any PR without a Self-Review section and auto-labeling PRs that need external review, and a second auditing merged PRs weekly for compliance. The same evening the external-review label became a merge gate, and by March 23 the instructions had been split into the `docs/agents/` layout the whole fleet now uses. Then the direction of travel reversed: [Mergepath](/projects/mergepath/) was built as the template repo the next day, and the machine user accounts, the cross-agent review pipeline, the `PreToolUse` hook, the escalation policy, and the two-strike rule all arrived in Override from there, synced in alongside four sibling repos. What stayed Override's own is the domain layer: [CodeRabbit review guidance](https://github.com/nathanjohnpayne/overridebroadway/blob/main/.coderabbit.yml) that directs the reviewer to verify arithmetic in the financial modeling engine and to treat deal-room components as surfaces displaying negotiated terms. The full story—how a review policy written for one financial tool became fleet infrastructure—is in [Agent Approval Workflow and the Genesis of Mergepath](/blog/agent-approval-workflow-genesis-of-mergepath/).

## Why it matters

Broadway is a relationship-driven business, but the operating layer is still full of brittle document workflows. A producer managing a $15M capitalization might have investor commitments in a spreadsheet, executed agreements in a Dropbox folder, and waterfall terms in a PDF that was last updated during the offering. Trust-sensitive financial work should stay legible, structured, and current after the production opens; Override is built for that.

Theatrical financing has its own vocabulary and its own math: recoupment triggers, operating reserve mechanics, overcall provisions, creative fee waterfalls. Industry professionals understand these concepts well, but the tooling around them has stayed general-purpose—spreadsheets, PDFs, email. The work was figuring out which abstractions make the math accessible without flattening the domain, and building interfaces that a general partner and a first-time angel investor can both use.

Override shipped. What it has not done yet is run a live deal: nothing in the record shows a real capitalization managed in it, an outside investor admitted through it, or a Deal Room link sent to an actual backer. The drifted cap table was the reason to build it; a real production is the test it has not yet had.
