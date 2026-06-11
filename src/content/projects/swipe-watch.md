---
title: "Swipe Watch"
slug: "swipe-watch"
description: "A swipe-based discovery experiment for Disney+ and Hulu that turns taste signals into a faster, more active recommendation loop."
kicker: "AI × Consumer × Streaming"
order: 5
screenshotAspect: "narrow"
screenshotSrc: "/images/projects/swipe-watch-hero.gif"
muxPlaybackId: "wNCRY97981o2uDAJrJ3ExPeK379yldRRFJgUIgSYz00k"
accentColor: "#c11d19"
accent: "red"
gradientFrom: "#f5ddd4"
gradientTo: "#f5f0e4"
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

I work on the platforms that run Disney+ and Hulu. One thing that's always struck me is how passive the discovery experience is—you scroll, you browse, you maybe click into something, and the system tries to learn from what you watched. But watching a show is a 30-minute commitment. Swiping past a card takes a second. The signal density is completely different.

Swipe Watch explores that gap. Instead of inferring taste from what people finish watching, it asks users to react to content cards in real time—swipe left, swipe right, or save for later. Each swipe is a fast, low-stakes preference signal that a recommendation system could use to learn what someone likes before they've committed to watching anything.

## What the product does

- Presents content cards from an 80-title pool spanning Disney+ and Hulu—series, films, and specials—organized by a content taxonomy that maps to the apps' discovery modes.
- Captures swipe-left (dismiss), swipe-right (interested), and save-for-later signals as lightweight preference data, each taking under a second.
- Uses a coin mechanic to gate access to curated discovery batches—spend coins earned from swiping to unlock new content modes, creating a feedback loop that rewards engagement.
- Tracks session state and swipe history so the system knows what a user has already seen and can avoid repeat presentations.

## How it was built

Swipe Watch was built in a weekend in vanilla JavaScript—no framework, no build step, no bundler. That constraint was deliberate. The point was to test whether the swipe interaction felt right before investing in a stack. The initial commit landed with a working swipe UI, a content pool, session management, and analytics tracking.

The content catalog is hand-curated. Starting from an initial set, the pool grew through several commits—20 new tiles with poster-format upgrades, then 12 more, then 27—reaching 80 titles with a documented poster guide that specifies image handling, content types, and format standards. Each batch aligned with a content taxonomy that maps to the discovery modes in the app (genres, moods, trending). Duplicate detection was manual; one commit removes a duplicate "America's National Parks (Classic)" tile that slipped through.

The coin and unlock system came after the core swiping worked. The initial build proved the interaction model, but sessions felt finite—you'd swipe through the deck and stop. The coin mechanic (earn coins by swiping, spend them to unlock curated discovery batches) was added to create a reason to come back. The end screen was redesigned to show a persistent coin bank with a spend mechanic rather than a dead-end "you're done" state.

The onboarding UX and interaction affordances were polished in a dedicated pass—making sure the swipe gesture was discoverable, the card animations felt responsive, and the first session didn't require explanation. A later commit fixed mobile card image scaling and badge clipping, which only surfaced on smaller viewports where the poster art cropped differently than expected.

## Why it matters

Recommendation systems are usually evaluated on model quality—precision, recall, serendipity. But the interface that gathers preference signals is upstream of the model and determines the quality of data it has to work with. A system that only learns from viewing history has to wait for a user to commit 30 minutes before it gets a signal. A system that learns from swipes gets a signal every second.

Swipe Watch focuses on that front-end layer: the mechanics of how people tell a product what they want to watch next. It's a prototype, not a production recommendation engine—there's no ML backend, no collaborative filtering, no real personalization yet. The question it was built to answer is narrower: does the swipe interaction feel natural enough for content discovery that people would actually use it? The 80-title pool and the coin mechanic are enough to test that question. What comes after—connecting the swipe data to an actual recommendation model—is a different project.

I demoed Swipe Watch to Disney's EVP of Product. The reaction confirmed the hypothesis: the interaction model is compelling, and the signal-density argument resonates with people who think about recommendation systems professionally. Whether it ever ships as a feature inside Disney+ is a separate question, but as a prototype for testing an interaction hypothesis, it did its job.
