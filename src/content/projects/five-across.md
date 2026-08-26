---
title: "Five Across"
slug: "five-across"
description: "A live multiplayer bingo platform that turns a group trip into a shared game—born on a nine-night Mediterranean cruise, generalizing into a multi-event platform."
seoDescription: "A live multiplayer bingo platform for group trips—daily themed cards, offline-first marking, live proofs, and a choreographed finale, built and run at sea."
kicker: "Consumer × Social × Live Ops"
order: 0
screenshotAspect: "narrow"
screenshotSrc: "/images/projects/five-across-hero.png"
screenshotSecondary:
  src: "/images/projects/five-across-gcb-hero.png"
  alt: "Gay Cruise Bingo warm-up card on the same Five Across platform, showing a Welcome Aboard bingo grid for a Trieste sailing"
  width: 786
  height: 1550
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

Five Across started as Gay Cruise Bingo, a phone-first multiplayer game built for a nine-night Mediterranean cruise from Trieste to Barcelona. Each player signs in and gets a frozen, randomized 5×5 card dealt from a shared prompt pool. Tap a square when the thing happens, and you see who else already got it. Big moments—first BINGO, blackout—broadcast to a live feed the whole group watches. A skeptic can demand proof; a photo satisfies it. A leaderboard keeps score for the whole sailing. The bet was that the card would stop being a novelty and become the running bit of the trip.

## What the product does

- Deals every player a frozen, randomized 5×5 card from a community-editable prompt pool, with a per-square tally showing who else got it—the social layer a printed card can't have.
- Unlocks a fresh themed card at 8:00 a.m. local time each morning after the first, matched to that day's port and party theme, with tutorial cards bookending the trip. No main-pool prompt repeats within a player's cruise; the easy half of each card is allowed to recur across days, because "get your favorite dessert" should be markable more than once.
- Runs a live feed of proofs, milestone moments, and doubts ("pics or it didn't happen"), with hearts as social recognition that never counts toward score—the only thing hearts ever produce is a Most-Loved Photo award at the standings freeze, an award and not a point.
- Ends with a choreographed two-beat finale: a last-call standings moment at 20:00 the night before disembarkation, then a freeze and podium when the farewell card unlocks the next morning—marks on the goodbye card are ceremonial and can't move the podium.
- Renders BINGO and leaderboard share cards on-device and hands them to the native share sheet, built for a group chat rather than a public crawler.
- Offers three claim modes as an event-level vibe knob—honor system (with a one-tap "Cross My Heart" pledge on the claim sheet), proof-to-mark, or admin-confirmed—because the group, not the server, is the real verification.

## How it was built

Phase 0 shipped in the eight days before embarkation, deliberately deployed without Cloud Functions: each player writes their own board and stats, and the leaderboard is a client-side sort—the honor model as architecture. No cheater is in the threat model of a friend-group game; the feed and the group are the verification, so server authority over marks would be complexity spent against a problem the product doesn't have.

The constraint that shaped everything else is ship wifi. The app is an installable PWA with an offline-first Firestore cache, so marks survive dead zones at sea and sync on reconnect; cold boot works without waiting on the network.

Operating it was the other half of the build. Eighty commits landed between embarkation and disembarkation, pushed to players through the auto-updating PWA while the game was being played. Two were feature drops shipped on the itinerary's one sea day: embark-pool squares blended into main-day cards, and a reshuffle for anyone dealt a hard card—three per cruise, pristine cards only. Most of the rest were firefighting, and the fires were auth and the PWA itself.

Fifteen themes for the cruise—thirteen party plus two tutorial, out of twenty-two now across the platform—all held to WCAG AA contrast by test suites that compute contrast from the CSS itself; Lucide icons for chrome and emoji for camp; a text-size control with an always-fits guard; a moderation stack (server-authoritative report auto-hide, an admin roster, flag-gated Cloud Vision) in place before the ship left port and sized to the actual risk of a private adult friend group rather than an imaginary public one.

One honest gap in the record: no artifact in the repo captures the final standings. The leaderboard lived in the production database and never came back as an export, so ten days of live play are documented in commits and specs, but the winner's line—how many bingos, how many squares—is not a number this page can cite.

## Why it matters

Delight is the product here. The mechanics that make it work—attributed tallies, public proofs, social doubts, a finale built around arrival—are consumer-experience decisions, shipped to real people and stress-tested by ten days of live play in a hostile operating environment: a metal ship at sea with satellite internet.

It's also becoming a platform. The engine is generalizing into Five Across, with Vacay Bingo as its travel edition and Gay Cruise Bingo preserved as the original: one codebase, tenant isolation gated before unrelated groups share a backend, and two pieces built and parked one human step short of cutover—a wildcard event router at the edge whose routes are written but not attached, and centralized authentication with a single-use handoff that is implemented but not yet reachable. Attaching the routes and provisioning the auth path is the cutover, and it's a decision, not a deploy. The first non-cruise event—a Sonoma Coast weekend in August 2026—has since run on that build, with unlock-copy fixes landing on its opening day.

The honest caveat: the audience is a friend group, not a consumer launch. The design carries that caveat all the way down—hearts never convert to score, marks on the farewell card can't move the podium, and verification belongs to the group rather than the server. Rules for a game that lives inside a friendship.
