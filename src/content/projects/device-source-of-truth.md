---
title: "Device Source of Truth"
slug: "device-source-of-truth"
description: "A single web application for understanding partner-device hardware, DRM, codec support, and operational readiness across Disney+, Hulu, and ESPN."
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
  format: "Internal platform tool"
  focus: "Partner platforms and device support"
  status: "Live product"
stack: "React · TypeScript · Vite · Firebase · Vitest"
related:
  - label: "Blog: Six PRs, One Bug—What AI Agents Actually Get Wrong"
    href: "/blog/six-prs-one-bug-agent-failure-modes/"
  - label: "Project: Swipe Watch"
    href: "/projects/swipe-watch/"
---

## Overview

Disney supports streaming on hundreds of partner devices—PlayStation, Xbox, Amazon Vega OS, smart TVs, set-top boxes—each with its own hardware specs, DRM requirements, codec support, and ADK version. The information that describes those devices lives across Airtable, Datadog, partner-submitted questionnaires, and spreadsheets maintained by different teams. When a platform question comes up—can this device support Dolby Vision? Is that partner on a current ADK?—the answer often depends on who you ask and which spreadsheet they last updated.

Device Source of Truth consolidates all of it into one system. The product imports device data from multiple sources, normalizes it against a shared schema, and makes it queryable and auditable. Instead of treating device knowledge as loose operational memory, it turns it into a structured record that can be reviewed, updated, and shared with confidence.

## What the product does

- Imports device data from partner-submitted questionnaires, CSV exports (AllModels, partner key mappings, telemetry), and manual entry—with AI-assisted extraction of structured specs from 350-question Excel questionnaires, including batching, rate-limit handling, and per-device retry.
- Normalizes ADK version strings and validates live versions against a version mapping registry, flagging devices running outdated or unrecognized builds.
- Tracks telemetry freshness with a dashboard badge showing the actual import time range, so teams can see how current the data is at a glance.
- Manages partner relationships through an alias registry with contextual resolution, automatic partner creation from CSV imports, and a partner key registry with import history.
- Surfaces actionable alerts—pagination-aware, dismissible, with resolution paths that link directly to device registration or partner key creation.

## How it was built

Device Source of Truth started from a "Starting Over" commit after an initial scaffold was scrapped, and grew to 210 commits across a purpose-built data platform on React, TypeScript, Vite, and Firebase.

The first serious engineering arc was contract alignment. An early commit fixed client/server misalignments across 14 integration points, followed by a contract-hardening effort (DST-TDI-001) that introduced shared Zod schemas and typed DTOs in a `@dst/contracts` monorepo package. The result is that every device import, mutation, and API response now validates against a single source of truth—the kind of invariant that matters most when an AI agent is writing both sides of the wire.

The most complex feature arc was the questionnaire intake pipeline. Disney's partner device certification uses an Excel-based technical questionnaire with 350+ questions across 15 sections, and DST needed to ingest these, extract structured specs from free-text answers, and map them to the normalized device model. The pipeline that emerged (DST-047 through DST-055) runs AI-assisted extraction with mandatory cost disclosure, 30-pair batch chunking for rate-limit safety, real-time per-device status with retry, and a multi-step admin review workflow. The extraction was originally fire-and-forget; a later commit replaced it with a Cloud Tasks queue for retry safety and stale-clock recovery.

Like the rest of the portfolio, DST uses the multi-agent code review pipeline first developed for [Override](/projects/override/)—machine user reviewers, CodeRabbit with domain-specific guidance, and the two-strike rule on bug fixes.

## Why it matters

When Amazon launches Vega OS and replaces the Android-based Fire TV stack, the first question is which devices are affected and what their certification status is. When a partner submits a new questionnaire, someone has to extract the specs, map them to known devices, and flag anything that doesn't match. When an ADK version goes end-of-life, someone has to know which partners are still running it.

Those are all answerable questions—but before DST, answering them meant cross-referencing three or four data sources maintained by different people on different cadences. The cost of uncertainty isn't abstract: support tickets increase, launch timelines slip, and partner conversations happen without a shared factual foundation.

Device Source of Truth treats that ambiguity as a product problem. The questionnaire pipeline automates the most labor-intensive part of the certification workflow. The version registry flags stale ADK builds. The telemetry freshness badge tells you whether you're looking at data from last week or last quarter. This is the partner-engineering work I spend my days on at Disney, and DST is the tool I wanted to exist before I sat down to build it.
