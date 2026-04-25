---
title: "Matchline"
slug: "matchline"
description: "From what you've done to what's next."
kicker: "AI × Product × Career Tools"
order: 1
status: "IN PROGRESS"
screenshotAspect: "wide"
screenshotSrc: "/images/projects/matchline-wordmark.svg"
accentColor: "#11100d"
accentColorClass: "project-page--black"
gradientFrom: "#dde1e5"
gradientTo: "#f5f0e4"
githubUrl: "https://github.com/nathanjohnpayne/matchline"
tags: ["AI", "Product", "Career Tools"]
metadata:
  format: "Single-user web app"
  focus: "Evidence-based application generation, capability mapping, pipeline management"
stack: "TypeScript · Next.js · Vitest"
related:
  - label: "Project: Mergepath"
    href: "/projects/mergepath/"
---

## Overview

Matchline is a career operating system built for one person at a time, running a serious job search. It turns work history into structured, reusable evidence, maps that evidence against specific job requirements, and generates tailored applications grounded in what the user has actually done—not in what an AI can plausibly invent.

This is not a resume builder. It's a discipline.

## Why this exists

Most "AI for job search" tools are generative writers: they take a job description, take a résumé, and produce a new document. The output reads well and means almost nothing—because the model doesn't know which projects mattered, which numbers are honest, which claims the user can defend in an interview. The artifact is glossy; the foundation is a guess.

Matchline inverts the order. It treats the user's work history as a structured graph of capabilities, outcomes, and evidence—built up once, refined over time—and uses AI only to assemble that evidence against a specific opportunity. The model never invents; it selects, sequences, and frames what the user has already documented.

The result is application material that the user can stand behind in an interview, because every claim traces back to a captured event in their own history.

## What V1 does

- **Captures work history as evidence.** Projects, roles, outcomes, decisions, scope changes—entered once, structured for reuse, owned by the user rather than scraped from a résumé.
- **Maps capabilities against opportunities.** A target job description is decomposed into requirements; the user's evidence graph is searched for the strongest matches; gaps are surfaced explicitly.
- **Generates application material grounded in evidence.** Cover letters, narrative bullets, and interview prep notes assembled from the evidence graph, with citations back to the source events.
- **Tracks the pipeline.** Where each application is in the funnel, what was sent, what was said in the interview, what to follow up on—replacing the spreadsheet that every job seeker eventually builds.

## Status

In active build, V1 targeted for July 2026. Currently a single-user system—the author's own active job search is V1's only customer. Public release decisions come after V1 has earned its keep on real outcomes.

No live URL until V1 ships. The repository is public; the running product is not.
