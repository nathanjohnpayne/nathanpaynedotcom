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

Disney supports streaming on hundreds of partner devices—PlayStation, Xbox, Amazon Vega OS, smart TVs, set-top boxes—each with its own hardware specs, DRM requirements, codec support, and ADK version. The information that describes those devices lives across Airtable, Datadog, partner-submitted questionnaires, and spreadsheets maintained by different teams. When a platform question comes up—can this device support Dolby Vision? Is that partner on a current ADK?—the answer often depends on who you ask and which spreadsheet they last updated.

Device Source of Truth consolidates all of it into one system. The product imports device data from multiple sources, normalizes it against a shared schema, and makes it queryable and auditable. Instead of treating device knowledge as loose operational memory, it turns it into a structured record that can be reviewed, updated, and shared with confidence.

## What the product does

- Imports device data from partner-submitted questionnaires, CSV exports (AllModels, partner key mappings, telemetry), and manual entry—with AI-assisted extraction of structured specs from 350-question Excel questionnaires, including batching, rate-limit handling, and per-device retry.
- Normalizes ADK version strings and validates live versions against a version mapping registry, flagging devices running outdated or unrecognized builds.
- Tracks telemetry freshness with a dashboard badge showing the actual import time range, so teams can see how current the data is at a glance.
- Manages partner relationships through an alias registry with contextual resolution, automatic partner creation from CSV imports, and a partner key registry with import history.
- Surfaces actionable alerts—pagination-aware, dismissible, with resolution paths that link directly to device registration or partner key creation.

## How it was built

Device Source of Truth started from a "Starting Over" commit after an initial scaffold was scrapped, and grew—well past two hundred commits—into a purpose-built data platform on React, TypeScript, Vite, and Firebase.

The first serious engineering arc was contract alignment. An early commit fixed client/server misalignments across 14 integration points, followed by a contract-hardening effort ([DST-TDI-001](https://github.com/nathanjohnpayne/device-source-of-truth/blob/main/specs/DST-TDI-001-Contract-Hardening-Plan.md)) that introduced shared Zod schemas and typed DTOs in a [`@dst/contracts`](https://github.com/nathanjohnpayne/device-source-of-truth/tree/main/packages/contracts) monorepo package. The result is that every device import, mutation, and API response now validates against a single source of truth—the kind of invariant that matters most when an AI agent is writing both sides of the wire.

The most complex feature arc was the questionnaire intake pipeline. Disney's partner device certification uses an Excel-based technical questionnaire with 350+ questions across 15 sections, and DST needed to ingest these, extract structured specs from free-text answers, and map them to the normalized device model. The pipeline that emerged runs AI-assisted extraction with mandatory cost disclosure, 30-pair batch chunking for rate-limit safety, real-time per-device status with retry, and a multi-step admin review workflow. The extraction was originally fire-and-forget; a later commit replaced it with a Cloud Tasks queue for retry safety and stale-clock recovery. The full arc lives across nine specs:

- [DST-047 — Questionnaire Intake & AI Extraction Pipeline](https://github.com/nathanjohnpayne/device-source-of-truth/blob/main/specs/DST-047-questionnaire-intake-ai-extraction.md)
- [DST-048 — Questionnaire Admin Review, Conflict Resolution & Import Sign-Off](https://github.com/nathanjohnpayne/device-source-of-truth/blob/main/specs/DST-048-questionnaire-admin-review-sign-off.md)
- [DST-049 — Import Section: Dependency-Aware Navigation & Setup Guardrails](https://github.com/nathanjohnpayne/device-source-of-truth/blob/main/specs/DST-049-import-navigation-guardrails.md)
- [DST-050 — Questionnaire AI Extraction: Cost Disclosure](https://github.com/nathanjohnpayne/device-source-of-truth/blob/main/specs/DST-050-questionnaire-ai-cost-disclosure.md)
- [DST-051 — AI Process Real-Time Status & Recovery](https://github.com/nathanjohnpayne/device-source-of-truth/blob/main/specs/DST-051-ai-process-status.md)
- [DST-052 — Questionnaire AI Extraction: Real-Time Status & Recovery](https://github.com/nathanjohnpayne/device-source-of-truth/blob/main/specs/DST-052-questionnaire-ai-extraction-status.md)
- [DST-053 — Active Devices Freshness Badge](https://github.com/nathanjohnpayne/device-source-of-truth/blob/main/specs/DST-053-active-devices-freshness-badge.md)
- [DST-054 — In-App User Role Management](https://github.com/nathanjohnpayne/device-source-of-truth/blob/main/specs/DST-054-user-role-management.md)
- [DST-055 — Multi-Partner Questionnaire Support](https://github.com/nathanjohnpayne/device-source-of-truth/blob/main/specs/DST-055-multi-partner-questionnaire-support.md)

Like the rest of the portfolio, DST uses the [multi-agent code review pipeline](https://github.com/nathanjohnpayne/device-source-of-truth/blob/main/REVIEW_POLICY.md) first developed for [Override](/projects/override/)—machine user reviewers, CodeRabbit with domain-specific guidance, and the two-strike rule on bug fixes. That pipeline is documented end-to-end in [Agent Approval Workflow and the Genesis of Mergepath](/blog/agent-approval-workflow-genesis-of-mergepath/).

## Why it matters

When Amazon launches Vega OS and replaces the Android-based Fire TV stack, the first question is which devices are affected and what their certification status is. When a partner submits a new questionnaire, someone has to extract the specs, map them to known devices, and flag anything that doesn't match. When an ADK version goes end-of-life, someone has to know which partners are still running it.

Those are all answerable questions—but before DST, answering them meant cross-referencing three or four data sources maintained by different people on different cadences. The cost of uncertainty isn't abstract: support tickets increase, launch timelines slip, and partner conversations happen without a shared factual foundation.

Device Source of Truth treats that ambiguity as a product problem. The questionnaire pipeline automates the most labor-intensive part of the certification workflow. The version registry flags stale ADK builds. The telemetry freshness badge tells you whether you're looking at data from last week or last quarter. This is the partner-engineering work I spent a decade doing at Disney, and DST is the tool I wanted to exist before I sat down to build it.

Development ended with my Disney tenure, and the deployed instance now runs entirely on synthetic seed data: the schema, import pipelines, and review workflows are real; every device, partner, and questionnaire record is invented for demonstration, presented under a fictional streaming group (Story Entertainment) rather than Disney's brands.
