---
title: "Device Source of Truth"
slug: "device-source-of-truth"
description: "A single web application for understanding partner-device hardware, DRM, codec support, and operational readiness across Disney+, Hulu, and ESPN."
kicker: "AI × Enterprise × Data"
order: 3
screenshotAspect: "wide"
screenshotSrc: "/images/projects/device-source-of-truth-hero.png"
accent: "blue"
liveUrl: "https://device-source-of-truth.web.app"
githubUrl: "https://github.com/nathanjohnpayne/device-source-of-truth"
tags: ["Enterprise", "Data", "React", "Firebase"]
status: "ARCHIVED"
metadata:
  format: "Internal platform tool"
  focus: "Partner platforms and device support"
stack: "React · TypeScript · Vite · Tailwind · Zod · Firebase · Express · Vitest"
related:
  - label: "Blog: Six PRs, One Bug—What AI Agents Actually Get Wrong"
    href: "/blog/six-prs-one-bug-agent-failure-modes/"
  - label: "Project: Swipe Watch"
    href: "/projects/swipe-watch/"
---

## Overview

Disney streams on partner devices across PlayStation, Xbox, Amazon Vega OS, smart TVs, and set-top boxes—each with its own hardware specs, DRM requirements, codec support, and ADK version. The information that describes those devices lives across Airtable, Datadog, partner-submitted questionnaires, and spreadsheets maintained by different teams. When a platform question comes up—can this device support Dolby Vision? Is that partner on a current ADK?—the answer often depends on who you ask and which spreadsheet they last updated.

Device Source of Truth consolidates all of it into one system: it imports device data from each source, normalizes it against a shared schema, and turns what was loose operational memory into a queryable, auditable record.

## What the product does

- Imports device data from partner-submitted questionnaires, CSV exports (AllModels, partner key mappings, telemetry), and manual entry—with AI-assisted extraction of structured specs from Excel questionnaires that commonly carry 100–150 answered Q/A pairs, including batching, rate-limit handling, and per-device retry.
- Normalizes ADK version strings and validates live versions against a version mapping registry, flagging devices running outdated or unrecognized builds.
- Tracks telemetry freshness with a dashboard badge showing the actual import time range, so teams can see how current the data is at a glance.
- Manages partner relationships through an alias registry with contextual resolution, automatic partner creation from CSV imports, and a partner key registry with import history.
- Surfaces actionable alerts—pagination-aware, dismissible, with resolution paths that link directly to device registration or partner key creation.

## How it was built

Device Source of Truth started over almost immediately. The first scaffold was one day old when a commit titled "Starting Over" (February 25, 2026) deleted it: 59 files, 7,097 lines removed, including the import scripts, nine pages, and roughly thirty real partner questionnaires. Every product feature was built between that reset and March 6, 2026, when the last one landed—a purpose-built data platform on React, TypeScript, Vite, and Firebase.

The first engineering arc was contract alignment, and it began as a bill coming due: five and a half hours after "Starting Over," a commit titled "Fix client/server contract misalignments across 14 integration points" recorded how far the two sides of the wire had already drifted. The durable fix was [DST-TDI-001](https://github.com/nathanjohnpayne/device-source-of-truth/blob/main/specs/DST-TDI-001-Contract-Hardening-Plan.md), a contract-hardening effort that introduced shared Zod schemas and typed DTOs in a [`@dst/contracts`](https://github.com/nathanjohnpayne/device-source-of-truth/tree/main/packages/contracts) monorepo package. Every device import, mutation, and API response now validates against a single source of truth—an invariant that matters when an AI agent is writing both sides of the wire.

The largest feature arc was questionnaire intake. Partner device certification runs on an Excel technical questionnaire—DST's field model defines 260 fields across sixteen sections, and a real questionnaire commonly carries 100–150 answered Q/A pairs—and DST had to ingest the workbooks, extract structured specs from free-text answers, and map them onto the normalized device model. The pipeline that shipped runs AI-assisted extraction with mandatory cost disclosure, 30-pair batch chunking for rate-limit safety, real-time per-device status with retry, and a multi-step admin review workflow. It also shipped wrong once: extraction was originally fire-and-forget, and a March 4 commit—"replace fire-and-forget extraction with Cloud Tasks queue"—rebuilt it as idempotent per-device tasks with stale-job recovery. The arc is documented across six specs, opening with [DST-047—Questionnaire Intake & AI Extraction Pipeline](https://github.com/nathanjohnpayne/device-source-of-truth/blob/main/specs/DST-047-questionnaire-intake-ai-extraction.md) and closing with [DST-055—Multi-Partner Questionnaire Support](https://github.com/nathanjohnpayne/device-source-of-truth/blob/main/specs/DST-055-multi-partner-questionnaire-support.md); the full set is in the repo's [`specs/` directory](https://github.com/nathanjohnpayne/device-source-of-truth/tree/main/specs).

The adjectives in the feature list above are priced the same way: "pagination-aware" traces to a March 6 commit titled "Fix three AlertsPage bugs: pagination cap, stale alert dismiss, partner dependency."

DST runs the shared [Mergepath](/projects/mergepath/) review pipeline—machine-user reviewers, CodeRabbit carrying device-domain review guidance, and a [two-strike rule](https://github.com/nathanjohnpayne/device-source-of-truth/blob/main/docs/agents/operating-rules.md) on repeated failed bug fixes. Unlike the repos where that pipeline was worked out, DST received it finished: the machine-user review system arrived by template propagation on March 24, 2026, eighteen days after the last product feature, so here it governs the maintenance tail rather than the build. The pipeline's own story is told in [Agent Approval Workflow and the Genesis of Mergepath](/blog/agent-approval-workflow-genesis-of-mergepath/).

## Why it matters

When Amazon launches Vega OS and replaces the Android-based Fire TV stack, the first question is which devices are affected and what their certification status is. When a partner submits a new questionnaire, someone has to extract the specs, map them to known devices, and flag anything that doesn't match. When an ADK version goes end-of-life, someone has to know which partners are still running it.

Those are all answerable questions—but before DST, answering them meant cross-referencing three or four data sources maintained by different people on different cadences. The cost: support tickets increase, launch timelines slip, and partner conversations happen without a shared factual foundation.

Device Source of Truth treats that ambiguity as a product problem. The questionnaire pipeline automates the most labor-intensive part of the certification workflow. The version registry flags stale ADK builds. The freshness badge tells you whether you're looking at data from last week or last quarter.

What the record does not contain is an outcome. Development ended with my Disney tenure—the last product feature landed March 6, 2026—and no artifact in the repository records a team adopting the tool or a production question answered with it. The honest claim is narrower: the workflows shipped, they run, and the deployed instance demonstrates them end to end.

That instance now runs entirely on synthetic seed data. Of the 332 commits on main as of late August 2026, the 178 after March 6 are dependency bumps, template synchronization, CI work, and small fixes—plus one substantive change: an August 20, 2026 commit replaced the real partner data with an invented dataset, presented under a fictional streaming group (Story Entertainment) rather than Disney's brands. The schema, import pipelines, and review workflows are real; every device, partner, and questionnaire record is synthetic. This is the partner-engineering work I spent a decade doing at Disney, and DST is the tool I wanted to exist before I sat down to build it.
