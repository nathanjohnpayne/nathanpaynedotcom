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

Matchline is built on two premises about the 2026 job market. First, anyone can generate a tailored résumé and cover letter in seconds, so every application is polished and polish is no longer a signal. Second, what remains as signal is specificity a candidate can defend—and a generative writer can't supply it, because the model doesn't know which projects mattered, which numbers are honest, or which claims survive an interview.

So Matchline inverts the usual order. Instead of generating a document from a résumé and a job description, it treats work history as a structured graph of capabilities, outcomes, and evidence—built once, refined over time—and uses AI to assemble that evidence against a specific opportunity. The model's job is selection, sequencing, and framing. A claim that doesn't trace to something the user has documented and approved is treated as a defect, and the product's central mechanism exists to catch it.

One thing to know before the rest of the page: Matchline is paused and has never shipped to a user. The sections below separate what the [spec](https://github.com/nathanjohnpayne/matchline/blob/main/specs/matchline.md) designs, what the code does, and what never got the chance to happen.

## The core loop

Four steps, each with an input, an output, and a quality bar. The spec's step headings and this list match one for one.

1. **Career → Experience Units.** A pasted résumé, LinkedIn HTML, long-form prose, or uploaded artifacts (PRDs, decks, retros) feed an extraction pipeline that produces atomic, verifiable claims. Each Unit carries skills, tools, domains, metrics, and a confidence score, and the user reviews and approves before anything enters the graph.
2. **Job → Requirement Units.** A pasted JD parses into structured requirements with priority, must-have flags, and signals like seniority, scope, and domain. Mostly deterministic parsing plus light LLM classification—cheaper than extraction, but the matches downstream are only as right as the requirements upstream.
3. **Match Units to Requirements.** The matching engine scores each Experience Unit against each Requirement on semantic similarity, skill/tool/domain overlap, seniority and scope alignment, and recency, and outputs a side-by-side view with explainable scores. Gaps are surfaced, not hidden. The user approves or rejects each match.
4. **Generate.** From approved matches only, the engine produces a tailored résumé and optional cover letter, with every claim tracing back to an approved Unit.

The design defers everything else behind this loop: if all four steps work, Matchline is useful before any V2 layer ships on top.

The spec budgets the full flow—paste a JD, get a validated, exportable résumé—at under 20 seconds at p95, with Experience Unit extraction alone budgeted at 8 seconds p50 and 20 at p95. Per-application LLM spend is budgeted at under $1 at p95, with a $0.75 target and an expected range of $0.50–$1.00. Both budgets exist for one reason: validation only works as a hard constraint if it is cheap enough to run on every generation. Nothing has run in production, so these remain budgets, not measurements.

## Zero fabrication

The constraint the whole design hangs on: no generated output contains a claim that isn't grounded in approved evidence. The spec is precise about what kind of thing this is—"an invariant, not a metric."

The enforcement mechanism sits between generation and the user. Every claim in a draft is parsed and traced back to its Experience Unit; a claim whose trace breaks is flagged inline, and the draft is held off the editor until the user resolves it—by editing the claim, removing it, or supplying a supporting Unit.

An earlier version of this page said the model "can never quietly invent." That is a universal about LLM behavior, and nothing in the record verifies a universal: the validation layer has no adversarial evaluation in the repo, and no output has ever shipped to a user. What the record supports is narrower and checkable: the validation layer is designed so that an ungrounded claim is held off the editor until the user resolves it. Whether that design holds under pressure is exactly what a V1 with real usage would have tested, and hasn't yet.

## How it was built, and where it stopped

Non-mechanical commits by month in 2026: 78 in April, 13 in May, 9 in June, 18 in July, 5 in August. April was the build. May and June ran at a maintenance pace. July reads like a taper until you look at the individual days.

The largest single day of product work in the repo's history is 2026-07-06: seventeen substantive commits landing parsing, matching, validation, and LLM-cost fixes—among them a guard for NaN confidence scores in the unit-review UI (#358), which is worth noticing because a rendering bug in the approval gate means the approval gate exists and runs. The Five Across repo opens the next day, 2026-07-07. A live game with a hard sailing date beat a tool with a soft one.

The handover was not clean, and the record is better for it. On 2026-07-31, twenty-four days into the Five Across summer, [`e20c077`](https://github.com/nathanjohnpayne/matchline/commit/e20c077) landed a content-addressed stage cache for the eval pipeline so matching-layer tuning runs free (#391)—an investment in cheap iteration, made three and a half weeks after the product was nominally set aside. After that commit, only identity and CI plumbing has landed: five commits, all on 2026-08-21.

So the pause has a date the commits set, not one an announcement set: active development ran until 2026-07-31. An earlier version of this page put the handover at the start of July, which the largest-burst date makes tempting and the July 31 commit makes wrong.

## Status

Paused before launch, and never shipped to users. Matchline remains a single-user system with the author's own job search as V1's only customer, and public release decisions come after V1 has earned its keep on real outcomes—which it has not yet had the chance to do.

There is no usage outcome to report, and that absence is the outcome so far: no live URL, no users beyond the author, no shipped outputs. What exists is code across parsing, matching, and validation that was still being fixed and tuned into late July 2026, a validation design that has never been adversarially tested, and an eval pipeline built to make the next round of tuning cheap. The repository is public; the running product is not.
