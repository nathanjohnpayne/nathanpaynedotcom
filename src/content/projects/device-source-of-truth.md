---
title: "Device Source of Truth"
slug: "device-source-of-truth"
description: "A single web application—designed and shipped with AI agents—for understanding partner-device hardware, DRM, codec support, and operational readiness across Disney+, Hulu, and ESPN."
kicker: "AI × Enterprise × Data"
order: 2
screenshotAspect: "wide"
screenshotSrc: "/images/projects/device-source-of-truth-hero.png"
accentColor: "#c11d19"
accentColorClass: "project-page--red"
gradientFrom: "#f5ddd4"
gradientTo: "#f5f0e4"
liveUrl: "https://device-source-of-truth.web.app"
githubUrl: "https://github.com/nathanjohnpayne/device-source-of-truth"
tags: ["Enterprise", "Data", "React", "Firebase"]
metadata:
  domain: "Enterprise × Data"
  format: "React + Firebase web app"
  focus: "Partner platforms and device support"
  status: "Live product"
related:
  - label: "Blog: Six PRs, One Bug—What AI Agents Actually Get Wrong"
    href: "/blog/six-prs-one-bug-agent-failure-modes/"
  - label: "Project: Swipe Watch"
    href: "/projects/swipe-watch/"
---

## Overview

Device Source of Truth brings together the partner-device information that usually ends up scattered across Airtable, Datadog, and spreadsheets. The goal is simple: give teams one place to understand the hardware, DRM, and codec realities behind Disney+, Hulu, and ESPN device support.

Instead of treating device knowledge as loose operational memory, the product turns it into a structured system that can be reviewed, updated, and shared with confidence.

## What the product does

- Consolidates fragmented partner-device records into one inventory.
- Tracks hardware specifications, DRM requirements, and codec support in a single model.
- Applies rules-based device scoring to make prioritization and compatibility easier to reason about.
- Creates a shared reference point for partner-platform conversations that would otherwise depend on scattered spreadsheets.

## Why it matters

This project was built for the partner-engineering world I work in. When a platform question comes up, the cost of uncertainty is immediate: support burden grows, launch conversations slow down, and decision quality drops. Device Source of Truth treats that ambiguity as a product problem instead of an inevitable operational tax.

Built with React and Firebase, the emphasis is not just on storing data but on turning device knowledge into something navigable and durable enough to support real product and platform decisions.
