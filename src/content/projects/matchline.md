---
title: "Matchline"
slug: "matchline"
description: "A career CRM for one person running a serious job search. Turns work history into structured, reusable evidence, maps that evidence against specific job requirements, and generates applications grounded in demonstrated work. Not a resume builder—a discipline."
seoDescription: "A career CRM that maps work history to job requirements and generates applications grounded in verified evidence, not fabricated resume claims."
kicker: "AI × Product × Career Tools"
order: 4
status: "PAUSED"
screenshotAspect: "wide"
screenshotSrc: "/images/projects/matchline-wordmark.svg"
accent: "black"
githubUrl: "https://github.com/nathanjohnpayne/matchline"
tags: ["AI", "Product", "Career Tools", "React", "Firebase"]
metadata:
  format: "Single-user web app"
  focus: "Evidence-based application generation, capability mapping, pipeline management"
stack: "React · TypeScript · Vite · Tailwind · Firebase · Anthropic · OpenAI · Vitest"
related:
  - label: "Project: Mergepath"
    href: "/projects/mergepath/"
---

## Overview

Two things changed in the 2026 job market that weren't true three years ago. Anyone can generate a tailored résumé and cover letter in seconds with ChatGPT, so the floor of "looks reasonable" has collapsed—every application is polished, and polish is no longer a signal. At the same time, recruiters and hiring managers are drowning in AI-generated applications that are technically on-target but substantively empty. Credibility and specificity are the new signal.

Most "AI for job search" tools are generative writers: take a job description, take a résumé, produce a new document. The output reads well and means almost nothing—because the model doesn't know which projects mattered, which numbers are honest, which claims the user can defend in an interview. The artifact is glossy; the foundation is a guess.

Matchline inverts the order. It treats the user's work history as a structured graph of capabilities, outcomes, and evidence—built up once, refined over time—and uses AI only to assemble that evidence against a specific opportunity. The model never invents; it selects, sequences, and frames what the user has already documented. The result is application material the user can stand behind in an interview, because every claim traces back to a captured event in their own history.

## The core loop

Four steps. Each one has a clear input, output, and quality bar. If any step breaks, the product doesn't work; if all four work, Matchline is useful even before any of the V2 layers ship on top.

1. **Career → Experience Units.** Pasted résumé, LinkedIn HTML, long-form prose, or uploaded artifacts (PRDs, decks, retros) feed an extraction pipeline that produces atomic, verifiable claims. Each Unit carries skills, tools, domains, metrics, and a confidence score, and is owned by the user rather than scraped from a résumé. The user reviews and approves before anything enters the graph.
2. **Job → Requirement Units.** A pasted JD parses into structured requirements with priority, must-have flags, and signals (seniority, scope, domain). Mostly deterministic parsing plus light LLM classification—cheaper than extraction, but the matches downstream are only as right as the requirements upstream.
3. **Match Units to Requirements.** The matching engine scores each Experience Unit against each Requirement using semantic similarity, skill/tool/domain overlap, seniority and scope alignment, and recency. Output is a side-by-side view with explainable scores and rationales. Gaps are surfaced honestly, not hidden. The user approves or rejects each match.
4. **Generate.** Using only matches the user has approved, the engine produces a tailored résumé and optional cover letter. Every claim traces back to an approved Unit.

## Zero fabrication

The hard constraint that makes the rest of the product trustworthy: no generated output contains a claim that isn't grounded in approved evidence. A validation layer sits between generation and the user—every claim is parsed, traced back to its Experience Unit, flagged inline if the trace breaks, and held off the editor until the user resolves it (by editing, removing, or supplying a supporting Unit). The model can never quietly invent; if it tries, validation catches it before the user does.

This is a hard constraint, not a target. The full-flow latency budget is under twenty seconds at p95 and the per-application cost budget is under one dollar—both designed so the constraint stays cheap enough to enforce on every generation.

## Status

Paused, deliberately. V1 was in active build with a July 2026 target when Five Across took the summer—a live game with a hard sailing date beat a tool with a soft one. Matchline remains a single-user system with the author's own job search as V1's only customer, and public release decisions still come after V1 has earned its keep on real outcomes.

No live URL until V1 ships. The repository is public; the running product is not.
