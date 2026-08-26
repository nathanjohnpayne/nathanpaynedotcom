---
title: "Friends & Family Billing"
slug: "friends-and-family-billing"
description: "A cloud-synced billing tool that turns recurring shared costs into clear invoices, payment tracking, and shareable summaries."
kicker: "AI × Utility × Finance"
order: 6
screenshotAspect: "wide"
screenshotSrc: "/images/projects/friends-and-family-billing-hero-v2.png"
accent: "yellow"
liveUrl: "https://friends-and-family-billing.web.app"
githubUrl: "https://github.com/nathanjohnpayne/friends-and-family-billing"
tags: ["Utility", "Finance", "React", "Firebase"]
status: "SHIPPED"
metadata:
  format: "Household coordination tool"
  focus: "Shared subscriptions and recurring group expenses"
stack: "React · JavaScript · Vite · Firebase · Vitest · Playwright"
related:
  - label: "Blog: Six PRs, One Bug—What AI Agents Actually Get Wrong"
    href: "/blog/six-prs-one-bug-agent-failure-modes/"
  - label: "Project: Override"
    href: "/projects/override/"
---

## Overview

My husband and I split T-Mobile, Apple One, and 1Password across a household of eight people. Every year, the same thing happened: someone would ask how much they owed, and I'd open a spreadsheet, re-derive the math from three different billing cadences, and text them a number. Then someone else would ask, and I'd do it again.

Friends & Family Billing exists because that coordination problem—simple math made annoying by repetition, shared responsibility, and the social awkwardness of asking for money—is a product problem, not a spreadsheet problem. The tool turns recurring shared costs into a system that computes what everyone owes, tracks who has paid, and generates a shareable summary that anyone in the household can check without asking me.

## What the product does

- Organizes monthly and annual shared costs with per-bill frequency toggling, derived amount previews, and a money integrity layer that flags calculation drift.
- Builds annual invoices with member name tokens, customizable email templates, and a live preview that renders exactly what the recipient will see.
- Tracks payments with a settlement board showing per-member status, a three-state balance model (outstanding, partial, settled), and a payment edit flow with audit trail.
- Generates shareable summaries via token-scoped links—each link carries the recipient's name, bill breakdown, and payment methods, accessible without login.
- Supports dispute management with lifecycle-stage email notifications, evidence attachments, and resolution workflows with share-page integration.

## How it was built

Friends & Family Billing is the oldest and most developed project in the portfolio—well over four hundred commits across a full architecture migration from a vanilla JavaScript single-page app to a React, Vite, and Vitest stack on Firebase.

The migration happened in six numbered phases rather than a single rewrite. Phase 0 scaffolded Vite, React, and Vitest alongside the legacy build. Phases 1 through 2c ported the shell, navigation, and core views—members, bills, settlement board, invoicing, review requests—with the two apps coexisting during the transition. Phase 4 cut over fully, deleted the vanilla JS, ported the share page, and added code splitting. The legacy app wasn't thrown away in one commit; it was extracted, wrapped, and replaced view by view.

The most expensive feature was the invoice template editor. The original plaintext editor with `%token%` markers worked until it didn't—Preview showed one thing, the sent email showed another, and the editor showed a third. The TipTap WYSIWYG migration ([PR #144](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/144)) was supposed to fix this, but it preserved the old markdown bridge, creating three divergent rendering paths. Six PRs shipped across roughly twenty hours without closing it—three attempts at the parity bug itself, plus two orthogonal fixes alongside the migration that caused it. The PR that ended it ([PR #161](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/161))—prompted as a failed-fix investigation rather than another incremental patch—removed the bridge entirely and unified Preview and email onto a single canonical renderer.

Like the rest of the portfolio, FFB runs on the [multi-agent code review pipeline](https://github.com/nathanjohnpayne/friends-and-family-billing/blob/main/REVIEW_POLICY.md) first developed for [Override](/projects/override/)—and in many ways it pressure-tested that system before I had it fully nailed down. The full architecture is written up in [Agent Approval Workflow and the Genesis of Mergepath](/blog/agent-approval-workflow-genesis-of-mergepath/).

## Why it matters

The product is less about accounting complexity and more about social clarity. Shared money creates friction even when the amounts are small—not because the math is hard, but because asking someone to pay feels awkward, and checking whether someone has paid feels intrusive. Friends & Family Billing reframes that dynamic as a coordination workflow where the system does the asking and the tracking, and the person who set it up doesn't have to be the enforcer.

Cloud sync is central to the idea. The share page means a household member can check their own balance, see exactly how it was calculated, and find the payment methods—without texting me. That self-service loop is the real product. The invoicing, settlement tracking, and dispute management are all in service of the same goal: removing me from the middle of a recurring conversation that doesn't need a human intermediary.

It's also the project that produced the ["Six PRs, One Bug"](/blog/six-prs-one-bug-agent-failure-modes/) blog post—a twenty-hour debugging arc on the invoice template parity bug that taught me more about AI agent failure modes than any other piece of work in the portfolio. The household coordination tool is what the build produced. The case study is what the debugging produced.
