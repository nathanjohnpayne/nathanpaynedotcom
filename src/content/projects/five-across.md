---
title: "Five Across"
slug: "five-across"
description: "A live multiplayer bingo platform that turns a group trip into a shared game—born on a nine-night Mediterranean cruise, generalizing into a multi-event platform."
seoDescription: "A live multiplayer bingo platform for group trips—daily themed cards, offline-first marking, live proofs, and a choreographed finale, built and run at sea."
kicker: "Consumer × Social × Live Ops"
order: 0
screenshotAspect: "narrow"
screenshotSrc: "/images/projects/five-across-hero.png"
accent: "red"
liveUrl: "https://fiveacross.app"
githubUrl: "https://github.com/nathanjohnpayne/gaycruisebingo"
tags: ["Consumer", "Social", "PWA", "Live Ops"]
status: "SHIPPED"
metadata:
  format: "Production PWA—live multiplayer game"
  focus: "Consumer experience, social mechanics, and live operations"
stack: "React · TypeScript · Vite · Firebase · Cloud Functions · Cloudflare Workers · PostHog"
related:
  - label: "Project: Swipe Watch"
    href: "/projects/swipe-watch/"
  - label: "Project: Mergepath"
    href: "/projects/mergepath/"
---

## Overview

Every group trip has a printed bingo card somewhere—a sheet of inside jokes and dares that's funny for a day and then forgotten. The problem is that the card is static: no shared state, no way to see who else got a square, no bragging rights, no record of who won. The game wants to be live.

Five Across started as Gay Cruise Bingo, a phone-first multiplayer game built for a nine-night Mediterranean cruise from Trieste to Barcelona. Each player signs in and gets a frozen, randomized 5×5 card dealt from a shared prompt pool. Tap a square when the thing happens, and you see who else already got it. Big moments—first BINGO, blackout—broadcast to a live feed the whole group watches. A skeptic can demand proof; a photo satisfies it. A leaderboard keeps score for the whole sailing. The card stopped being a novelty and became the running bit of the trip.

## What the product does

- Deals every player a frozen, randomized 5×5 card from a community-editable prompt pool, with a per-square tally showing who else got it—the social layer a printed card can't have.
- Unlocks a fresh themed card at 8:00 a.m. ship time each day, matched to that day's port and party theme, with tutorial cards bookending the trip and no prompt repeating across a player's cruise.
- Runs a live feed of proofs, milestone moments, and doubts ("pics or it didn't happen"), with hearts as social recognition that deliberately never counts toward score.
- Ends with a choreographed two-beat finale: a last-call standings moment on the final sea day, then a freeze and podium when the farewell card unlocks—marks on the goodbye card are ceremonial by design.
- Renders BINGO and leaderboard share cards on-device and hands them to the native share sheet, built for a group chat rather than a public crawler.
- Offers three claim modes as an event-level vibe knob—honor system (with a one-tap "Cross My Heart" pledge), proof-to-mark, or admin-confirmed—because the group, not the server, is the real verification.

## How it was built

Phase 0 shipped in the eight days before embarkation, deliberately Cloud Functions-free: each player writes their own board and stats, and the leaderboard is a client-side sort. That's not a shortcut—it's the honor model as architecture. No cheater is in the threat model of a friend-group game; the feed and the group are the verification, so server authority over marks would be complexity spent against a problem the product doesn't have.

The constraint that shaped everything else is ship wifi. The app is an installable PWA with an offline-first Firestore cache, so marks survive dead zones at sea and sync on reconnect; cold boot works without waiting on the network. Live operations continued through the sailing itself—moderation hardening, feature drops, and fixes shipped mid-cruise through the auto-updating PWA while the game was being played.

The details got the attention the big pieces usually steal: eight party themes plus two tutorial themes, all held to WCAG AA contrast by computed-from-CSS test suites; Lucide icons for chrome and emoji for camp; a text-size control with an always-fits guard; a moderation stack (server-authoritative report auto-hide, an admin roster for round-the-clock coverage, flag-gated Cloud Vision) sized to the actual risk of a private adult friend group rather than an imaginary public one. The cruise champion finished with 16 bingos across 124 squares.

## Why it matters

This is the one project on this site where delight is the product. The mechanics that make it work—attributed tallies, public proofs, social doubts, a finale built around arrival—are consumer-experience decisions, made one at a time, shipped to real people, and stress-tested by ten days of live play in a genuinely hostile operating environment: a metal ship at sea with satellite internet.

It's also becoming a platform. The engine is generalizing into Five Across, with Vacay Bingo as its travel edition and Gay Cruise Bingo preserved as the original—one codebase, wildcard event routing at the edge, centralized authentication with a single-use handoff, and tenant isolation gated before unrelated groups share a backend. The first non-cruise event—a Sonoma Coast weekend in August 2026—has since run on that build. The arc is the same one I've followed my whole career: ship the specific delightful thing, then turn it into the platform that can ship many of them.

The honest caveat: the audience is a friend group, not a consumer launch. What the project demonstrates isn't scale—it's judgment. Every screen is a decision about how new technology becomes familiar, how competition stays friendly, and how software earns a place inside a shared experience instead of replacing it.
