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

- Organizes monthly and annual shared costs with per-bill frequency toggling and derived amount previews.
- Builds annual invoices with member name tokens, customizable email templates, and a live preview rendered by the same canonical renderer that builds the email.
- Tracks payments with a settlement board showing per-member status, a four-state balance model (outstanding, partial, settled, overpaid), and a payment edit flow whose edits land in an append-only audit trail.
- Generates shareable summaries via token-scoped links—each link carries the recipient's name, bill breakdown, and payment methods, accessible without login.
- Supports dispute management with lifecycle-stage email notifications, evidence attachments, and resolution workflows with share-page integration.

## How it was built

Friends & Family Billing has the longest continuous development history of anything in the portfolio. It started in February 2026 as a vanilla JavaScript single-page app—a 1,592-line `script.js` with working Firebase auth in the very first commit—and the current tree is React, Vite, and Vitest on Firebase, 581 commits later as of August 2026.

The migration ran as five numbered phases shipped across eight PRs, not a single rewrite—by March the original script had grown into a 5,700-line `main.js`, and the plan was to replace it view by view while it kept running. Phase 0 scaffolded Vite, React, and Vitest alongside the legacy build. Phases 1 and 2 (shipped as 2a, 2b, and 2c) ported the shell, navigation, and core views—members, bills, settlement board, invoicing, review requests—with the two apps coexisting throughout. Phase 3 polished the dialogs: audit history, native dialog removal, test coverage. Phase 4 cut over—deleted the vanilla JS, ported the share page, and added code splitting.

The cutover didn't hold. Four days later, [PR #37](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/37) put the legacy app back: the React migration had never been visually reviewed, and users visiting the root URL had been seeing the unchanged legacy shell the whole time—which made every phase look correct without anyone actually looking. React reached the root URL that April, and the vanilla JS finally left the tree in June ([PR #339](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/339)), three months after Phase 4 first deleted it. The legacy app wasn't thrown away in one commit; it was thrown away twice, and only the second time held.

The most expensive feature was the invoice template editor. The original plaintext editor with `%token%` markers worked until it didn't—Preview showed one thing, the sent email showed another, and the editor showed a third. The TipTap WYSIWYG migration ([PR #144](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/144)) was supposed to fix this, but it preserved the old markdown bridge—its own docstring says it "emits the same token-bearing string that the legacy template pipeline expects"—creating three divergent rendering paths. Six PRs shipped across roughly twenty hours without closing it: the originating migration, three attempts at the parity bug itself, and two orthogonal fixes alongside it. The PR that ended it ([PR #161](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/161))—framed as a root-cause investigation rather than another incremental patch, against an [issue](https://github.com/nathanjohnpayne/friends-and-family-billing/issues/159) that explicitly ruled out making Preview merely look closer—bypassed the bridge and unified Preview and email onto a single canonical renderer. The arc also left the repo its end-to-end suite: Playwright arrived in [PR #158](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/158) and its CI wiring in [PR #160](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/160), both mid-debugging.

FFB runs the [multi-agent code review pipeline](https://github.com/nathanjohnpayne/friends-and-family-billing/blob/main/REVIEW_POLICY.md) shared across the whole Mergepath fleet—and it pressure-tested that system before the rules were settled. The no-direct-push rule landed on April 2; a commit went straight to `main` the next day, and [issue #145](https://github.com/nathanjohnpayne/friends-and-family-billing/issues/145) is the after-action record. The full architecture is written up in [Agent Approval Workflow and the Genesis of Mergepath](/blog/agent-approval-workflow-genesis-of-mergepath/).

## Why it matters

The product is less about accounting complexity and more about social clarity. Shared money creates friction even when the amounts are small—not because the math is hard, but because asking someone to pay feels awkward, and checking whether someone has paid feels intrusive. Friends & Family Billing reframes that dynamic as a coordination workflow where the system does the asking and the tracking, so the person who set it up isn't the enforcer.

Cloud sync is central to the idea. The share page means a household member can check their own balance, see exactly how it was calculated, and find the payment methods—without texting me. That self-service loop is the real product. The invoicing, settlement tracking, and dispute management are all in service of the same goal: removing me from the middle of a recurring conversation that doesn't need a human intermediary.

The outcome is exactly as small as the problem. One household uses it—the eight people in the first paragraph—and nobody else ever has. There is no adoption number to report, and the product doesn't need one: it was built to end one recurring conversation, not to scale past it.

It's also the project that produced the ["Six PRs, One Bug"](/blog/six-prs-one-bug-agent-failure-modes/) blog post—a twenty-two-hour debugging arc on the invoice template parity bug, from the PR that introduced the bug to the one that fixed it. The household coordination tool is what the build produced. The case study is what the debugging produced.
