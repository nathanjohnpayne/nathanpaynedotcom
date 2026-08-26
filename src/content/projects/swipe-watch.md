---
title: "Swipe Watch"
slug: "swipe-watch"
description: "A swipe-based discovery experiment for Disney+ and Hulu that turns taste signals into a faster, more active recommendation loop."
kicker: "AI × Consumer × Streaming"
order: 5
screenshotAspect: "narrow"
screenshotSrc: "/images/projects/swipe-watch-hero.gif"
muxPlaybackId: "wNCRY97981o2uDAJrJ3ExPeK379yldRRFJgUIgSYz00k"
accent: "red"
liveUrl: "https://swipewatch.web.app"
githubUrl: "https://github.com/nathanjohnpayne/swipewatch"
tags: ["Consumer", "Streaming", "Vanilla JS"]
status: "EXPERIMENT"
metadata:
  format: "Interaction prototype"
  focus: "Discovery, recommendations, and interaction design"
stack: "Vanilla JavaScript · Firebase Hosting"
related:
  - label: "Blog: Six PRs, One Bug—What AI Agents Actually Get Wrong"
    href: "/blog/six-prs-one-bug-agent-failure-modes/"
  - label: "Project: Device Source of Truth"
    href: "/projects/device-source-of-truth/"
---

## Overview

I work on the platforms that run Disney+ and Hulu. The discovery experience is passive—you scroll, you browse, you maybe click into something, and the system tries to learn from what you watched. But watching a show is a 30-minute commitment, and a swipe is a gesture. The signal density is different.

Swipe Watch explores that gap. Instead of inferring taste from what people finish watching, it asks users to react to content cards in real time—swipe left, swipe right, or save to a watchlist. Each swipe is a fast, low-stakes preference signal—taste data before any viewing commitment.

## What the product does

- Presents content cards from a pool of 106 titles as of April 2026, spanning Disney+ and Hulu—series, films, and specials.
- Captures swipe-left (dismiss), swipe-right (interested), and save-to-watchlist signals as lightweight preference data.
- Filters the pool through four discovery modes—Disney Vault, Streaming Originals, Nature & Discovery, and New & Trending. The modes aren't separate lists; they're read-time filters over the one flat pool, and the last is just a year predicate.
- Deals sessions ten cards at a time and tracks swipe history so the system knows what a user has already seen and can avoid repeat presentations. Everything is device-local; there is no server.

## How it was built

The core build is thirteen commits in vanilla JavaScript across three days—a Tuesday and the following Friday and Saturday in late February 2026. No framework, no build step, no bundler: Firebase Hosting serves the repo root as-is, because there is no build output to serve. That constraint was deliberate—the point was to test whether the swipe interaction felt right before investing in a stack. The initial commit, 12 files and 2,875 lines, landed with a working swipe UI, a 45-title content pool, session management, and analytics tracking.

The content catalog is hand-curated, and the repo's own record of its growth needs a correction, because one commit subject is wrong: the commit titled "Add 20 new content tiles" adds eleven—twelve of the names in its body were poster-format upgrades to tiles already in the pool, mis-listed as new. The corrected sequence runs 45 titles in the initial commit, +12 that Friday, then +11 and +12 that Saturday to reach 80 on February 28. The pool sat there for six weeks until PR #20 added 27 more on April 10, and PR #21 removed a duplicate "America's National Parks (Classic)" tile the same day—flagged by CodeRabbit in review, since nothing in the data enforces uniqueness—leaving the pool at 106, where it stands. Each batch followed a documented poster guide that specifies image handling, content types, and format standards, the same taxonomy the four discovery modes filter against.

The coin and unlock system came after the core swiping worked—two commits on the Friday evening, nineteen minutes apart. The initial build proved the interaction, but sessions felt finite: you'd swipe through the deck and stop. Earning coins by swiping and spending them to unlock curated discovery batches gave the deck a bottom worth reaching, and the end screen became a persistent coin bank with a spend mechanic instead of a dead-end "you're done" state.

A dedicated pass the same evening made the swipe gesture discoverable, the card animations responsive, and the first session self-explanatory. A 21-line fix in April handled mobile card image scaling and badge clipping, which only surfaced on smaller viewports where the poster art cropped differently than expected.

## Why it matters

Recommendation systems are usually evaluated on model quality—precision, recall, serendipity. But the interface that gathers preference signals is upstream of the model and determines the quality of data it has to work with. A system that only learns from viewing history has to wait for a user to commit 30 minutes before it gets a signal. A system that learns from swipes gets one per gesture.

Swipe Watch focuses on that front-end layer: the mechanics of how people tell a product what they want to watch next. It's a prototype, not a production recommendation engine—there's no ML backend, no collaborative filtering, no real personalization yet. The signals themselves are write-only: swipes fire to analytics, and nothing in the app ever reads them back, so personalization is impossible with the current data model. That is the honest scope. The question it was built to answer is narrower: does the swipe interaction feel natural enough for content discovery that people would actually use it?

That question doesn't have a measured answer. I demoed Swipe Watch to Disney's EVP of Product, and a demo is what the record contains—no user sessions, no swipe data read back, no before-and-after on whether the coin mechanic changed how long people stayed. One reaction in one room is a conversation, not a test of an interaction hypothesis. Whether the swipe model would survive contact with real users, and whether anything like it ever ships inside Disney+, are open questions—the prototype exists so they can be asked concretely instead of in the abstract.
