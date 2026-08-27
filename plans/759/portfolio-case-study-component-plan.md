> [!IMPORTANT]
> **Input artifact, not instruction.** This is the original design proposal for the project-page case-study components, committed unchanged so the reasoning behind the runbook is inspectable. The authority is `plans/759/portfolio-narratives-runbook.md`, which **supersedes this document wherever the two conflict**, and which rejects several proposals below outright: the `CaseStudyEvidence` wrapper, the nested `caseStudy` object, and the `principles` and `evolution` schema fields. Read this for field semantics and for §9's design principles, which the runbook adopts in full. Do not implement from it directly.

# Portfolio case-study component plan

## Goal

Build a reusable structured system for project pages that makes senior-level product judgment easy to scan.

The immediate use case is #752, the Five Across flagship case study, but the architecture should support the broader portfolio work without forcing every project into the same narrative shape.

The system should have two layers:

1. A reusable `DecisionRecords` component for consequential product decisions.
2. A richer `CaseStudyEvidence` component for projects that need to show hypothesis, live evidence, learning, and adaptation.

Do not solve this by adding more prose sections to individual Markdown files.

---

## Why this should be structured

Project pages currently have no structured content machinery equivalent to the blog's `keyTakeaways`, `pullquotes`, and `sidebar` fields.

That means decision records added directly to project Markdown would become repeated heading-and-paragraph blocks:

```text
Decision
Alternative
Tradeoff
Outcome

Decision
Alternative
Tradeoff
Outcome
```

That is the highest-signal material on the page, but it would become one of the least scannable parts.

The target reader is a hiring manager or senior product leader evaluating senior IC product judgment. They should be able to answer these questions quickly:

- What did Nathan decide?
- What alternatives did he reject?
- Why?
- What happened after the decision?
- Did the evidence validate the decision?
- What changed once reality differed from the original hypothesis?

These should be first-class content objects, not buried inside prose.

---

# 1. Reusable `DecisionRecords` component

## Purpose

Create one portfolio-wide component for consequential decisions.

This is the reusable primitive that can support #752, #753, #754, #755, #758, and future project pages.

Each record should represent a real product choice, not simply describe a feature.

## Suggested schema

Add an optional project frontmatter field:

```yaml
decisions:
  - title: "Trust the group, not the server"
    context: "Eight days to launch for a private friend group."
    rejected: "Server-authoritative verification of every mark."
    rationale: "Cheating was not a meaningful threat, so server authority would have spent complexity against the wrong problem."
    evidence: "The honor model supported live play, while hearts and doubts themselves saw limited adoption."
    status: "mixed"
```

Suggested Zod shape:

```ts
decisions: z
  .array(
    z.object({
      title: z.string().trim().min(1),
      context: z.string().trim().min(1),
      rejected: z.string().trim().min(1),
      rationale: z.string().trim().min(1),
      evidence: z.string().trim().min(1),
      status: z.enum(['validated', 'mixed', 'revised', 'pending']),
    }),
  )
  .optional()
  .default([]),
```

## Fields

### `title`

The actual decision.

Good:

> Trust the group, not the server.

Bad:

> Authentication architecture.

The title should communicate judgment rather than topic.

### `context`

The constraint or product condition that forced the decision.

Examples:

- Eight days to launch.
- Satellite connectivity.
- Small private friend group.
- Fixed live-event date.
- Unknown usage pattern.
- Limited moderation risk.

### `rejected`

The credible alternative that was considered but not chosen.

This is important because a decision without an alternative is usually just implementation description.

### `rationale`

Why the chosen approach was better under the actual constraints.

This is the core product-judgment field.

### `evidence`

What happened after shipping.

Do not let this become another explanation of the decision.

It should contain observed evidence.

### `status`

Use:

```text
VALIDATED
MIXED
REVISED
PENDING
```

Do not imply that every decision was correct.

A portfolio that includes mixed or revised decisions is more credible than one where every choice retrospectively appears perfect.

---

# 2. `DecisionRecords` visual treatment

Do not render these as generic cards in a four-column grid.

Use a vertically stacked decision ledger.

Example:

```text
01 — TRUST MODEL                                  MIXED

Trust the group, not the server.

CONTEXT
Eight days to launch for a private friend group.

REJECTED
Server-authoritative verification of every mark.

WHY
Cheating was not a meaningful threat. Server authority would
have spent launch complexity against the wrong problem.

EVIDENCE
The honor model supported the event, but the social verification
mechanics themselves saw little adoption.
```

Desktop can use an internal grid for the supporting fields.

Mobile should stack naturally.

The visual hierarchy should make these two things readable during a very fast skim:

1. The decision.
2. Whether subsequent evidence validated it.

Everything else is secondary.

---

# 3. Distinct `CaseStudyEvidence` component

## Purpose

`DecisionRecords` is not enough for Five Across.

#752 requires the reader to understand the full product loop:

```text
Hypothesis
→ constraint
→ decision
→ live behavior
→ evidence
→ response
```

Build a second structured component for projects with enough evidence to support a true case study.

This component can be optional and should not appear on every project page.

Five Across should be the first implementation.

---

# 4. Suggested `CaseStudyEvidence` structure

The component should support four distinct content types.

## A. Product principles

Surface the rules that governed later decisions.

For Five Across:

```text
CONNECTION > COMPETITION

THE GROUP IS THE AUTHORITY

DEAD WI-FI CANNOT BREAK THE GAME

THE ENDING IS PART OF THE PRODUCT
```

These are different from decision records.

A principle explains how choices were evaluated.

A decision explains what was actually chosen.

Suggested schema:

```yaml
principles:
  - title: "Connection over competition"
    description: "Recognition and shared memories matter more than optimizing score."
```

---

## B. Constraints

Expose the conditions under which the product was built.

For Five Across:

```text
8 DAYS TO LAUNCH
9 NIGHTS LIVE
SATELLITE INTERNET
16 PLAYERS
```

These should function as context, not vanity metrics.

A decision like offline-first persistence is much more meaningful when the reader understands that the product was being operated from a ship with unreliable connectivity.

Suggested schema:

```yaml
constraints:
  - value: "8 days"
    label: "to launch"

  - value: "9 nights"
    label: "live operation"

  - value: "Satellite"
    label: "primary connectivity"

  - value: "16"
    label: "players"
```

---

## C. Expected → observed → changed

This should be one of the most important pieces of the Five Across page.

It directly demonstrates product learning.

Example:

| We expected | We observed | We changed |
|---|---|---|
| Cards would become the recurring habit | 77% of sessions contained no mark | Recognized standings and feed as the emergent engagement surface |
| Social reactions would matter | Hearts and doubts concentrated around one player | Treat them as unvalidated rather than core mechanics |
| Some players would receive frustrating cards | Reshuffles were actually used | Added a tightly constrained reshuffle mechanic |
| The finale would create urgency | 36% of cruise marks occurred on the final day | Preserve the standings freeze and choreographed ending |

Suggested schema:

```yaml
learnings:
  - expected: "The cards would become the recurring habit."
    observed: "77% of sessions contained no mark."
    response: "The standings and feed emerged as the stronger engagement surface."

  - expected: "Some players would receive frustrating cards."
    observed: "Players used the reshuffle option during live play."
    response: "Added a constrained reshuffle mechanic during the sailing."
```

The important thing is that the third field should not always be:

> We were right.

It should communicate what changed.

---

## D. Platform evolution

Five Across has another strategic story that deserves structure:

```text
Gay Cruise Bingo
Original live event

        ↓

Vacay Bingo
Travel edition

        ↓

Five Across
Reusable event platform
```

This should explain what proved reusable and what required generalization.

It should culminate in the platform-cutover decision rather than becoming an architecture inventory.

Suggested schema:

```yaml
evolution:
  - name: "Gay Cruise Bingo"
    role: "Original event"
    description: "The first live product test."

  - name: "Vacay Bingo"
    role: "Travel edition"
    description: "Separated trip-specific branding from the underlying game."

  - name: "Five Across"
    role: "Platform"
    description: "Generalized the event engine for unrelated groups."
```

---

# 5. Five Across page structure

Rework #752 around the following information architecture.

Do not preserve the existing four-section template merely for consistency.

#752 explicitly calls for the page to move away from:

```text
Overview
What it does
How it was built
Why it matters
```

Use:

## Hero

Explain what Five Across is immediately.

Include the strongest product imagery and live-product CTA.

---

## The problem

Keep this short.

Explain why a printed group-trip bingo card loses momentum:

- no shared state
- no recognition
- no proof
- no persistent memory
- no live social layer

End with the product hypothesis.

---

## The product principles

Render through the structured case-study component.

Example:

```text
Connection > competition
The group is the authority
Dead Wi-Fi cannot break the game
The ending is part of the product
```

---

## The constraint

Use the structured constraint strip.

```text
8 DAYS TO LAUNCH
9 NIGHTS LIVE
SATELLITE INTERNET
16 PLAYERS
```

Include an artifact such as a launch checklist or event timeline if available.

---

## Decisions under constraint

Render the reusable `DecisionRecords` component.

Five Across should have at least four substantial decisions.

Recommended candidates:

1. Honor model instead of server authority.
2. Offline-first state instead of network-dependent interaction.
3. Hearts as recognition but never score.
4. Frozen randomized cards instead of dynamically changing boards.
5. Time-based card releases.
6. Right-sized moderation.
7. Choreographed standings freeze and farewell card.
8. Delay platform cutover until tenant/auth boundaries were ready.

Choose the strongest 4–6 rather than rendering every architectural choice.

---

## Then people actually played it

Use the `expected → observed → changed` structure.

This should be one of the most visually prominent sections on the page.

It is likely the strongest senior-product signal in the project.

Show actual evidence including:

- 517 sessions
- 77% of sessions with no mark
- 14 of 16 players marking
- 9 players active on five or more days
- 845 squares
- 61 bingos
- zero blackouts
- weak hearts/doubts adoption
- reshuffle usage
- final-day behavior

Do not treat every number as a success metric.

Some of the strongest evidence is evidence that the original hypothesis was incomplete.

---

## Live operations

Show what changed during the sailing.

Prefer a timeline or structured incident log over prose chronology.

Example:

```text
BEFORE EMBARKATION
Ship MVP with offline-first state and event controls.

MID-CRUISE
Blend embarkation prompts into later cards.

SEA DAY
Add constrained reshuffle for hard cards.

LIVE INCIDENTS
Fix auth and PWA reliability issues while players remain active.

FINAL DAY
Freeze standings and transition into ceremonial farewell card.
```

Separate:

```text
Changed during event
```

from:

```text
Deliberately deferred
```

This demonstrates prioritization under pressure.

---

## What survived the test

Summarize which product bets were:

```text
VALIDATED
MIXED
REVISED
UNPROVEN
```

This is better than a conventional generic "Results" section.

Example:

```text
VALIDATED
Offline-first operation
Persistent standings
Finale scarcity

MIXED
Card-driven daily engagement
Reshuffle demand

UNPROVEN
Hearts
Doubts
Public-scale moderation
```

---

## From event to platform

Show:

```text
Gay Cruise Bingo
→ Vacay Bingo
→ Five Across
```

Explain what became reusable.

Then surface the strategic decision:

The wildcard event router and centralized authentication were built but deliberately left one human decision short of cutover.

Treat that as a product/platform decision, not a deployment detail.

Mention the Sonoma follow-on as the first evidence that the generalized system could support another event.

---

## Agent operating model

Keep this compact.

Do not provide a model/tool/commit inventory.

Show the operating model:

```text
Nathan
- product principles
- event rules
- acceptance criteria
- live feedback
- prioritization
- go/no-go decisions

Agents
- implementation decomposition
- parallel build capacity
- automated testing
- review
- targeted iteration
```

The key point is how the work was controlled under a fixed deadline.

---

## Limits of the evidence

Preserve the caveat.

This was a friend-group launch, not a consumer-scale market test.

Explicitly distinguish what the event proved from what it did not prove.

For example:

```text
What it demonstrated
- live multi-day usage
- behavioral response to game mechanics
- operation under poor connectivity
- ability to change the product while live
- reuse across a second event

What it did not demonstrate
- public-market demand
- consumer acquisition
- large-scale moderation
- adversarial behavior
- retention beyond an event context
```

This increases credibility rather than weakening the case study.

---

# 6. Component architecture

Suggested implementation:

```text
src/components/projects/
  DecisionRecords.astro
  CaseStudyEvidence.astro
  CaseStudyPrinciples.astro
  CaseStudyConstraints.astro
  CaseStudyLearnings.astro
  CaseStudyEvolution.astro
```

Do not create every file if the subcomponents remain trivial.

A reasonable first implementation could be:

```text
DecisionRecords.astro
CaseStudyEvidence.astro
```

with the latter internally rendering principles, constraints, learnings, and evolution.

Split further only if the component becomes difficult to maintain.

---

# 7. Project schema

Conceptually:

```ts
const projects = defineCollection({
  schema: z.object({
    // existing fields...

    decisions: z
      .array(
        z.object({
          title: z.string().trim().min(1),
          context: z.string().trim().min(1),
          rejected: z.string().trim().min(1),
          rationale: z.string().trim().min(1),
          evidence: z.string().trim().min(1),
          status: z.enum(['validated', 'mixed', 'revised', 'pending']),
        }),
      )
      .optional()
      .default([]),

    caseStudy: z
      .object({
        principles: z
          .array(
            z.object({
              title: z.string().trim().min(1),
              description: z.string().trim().min(1),
            }),
          )
          .optional()
          .default([]),

        constraints: z
          .array(
            z.object({
              value: z.string().trim().min(1),
              label: z.string().trim().min(1),
            }),
          )
          .optional()
          .default([]),

        learnings: z
          .array(
            z.object({
              expected: z.string().trim().min(1),
              observed: z.string().trim().min(1),
              response: z.string().trim().min(1),
            }),
          )
          .optional()
          .default([]),

        evolution: z
          .array(
            z.object({
              name: z.string().trim().min(1),
              role: z.string().trim().min(1),
              description: z.string().trim().min(1),
            }),
          )
          .optional()
          .default([]),
      })
      .optional(),
  }),
});
```

Keep the entire case-study object optional so normal project pages retain the default layout.

---

# 8. Rendering behavior

Project pages should remain opt-in.

Conceptually:

```astro
{project.data.caseStudy && (
  <CaseStudyEvidence data={project.data.caseStudy} />
)}

{project.data.decisions.length > 0 && (
  <DecisionRecords decisions={project.data.decisions} />
)}
```

Do not require all projects to supply case-study data.

`DecisionRecords` should be broadly reusable.

`CaseStudyEvidence` should be reserved for projects where enough actual evidence exists to justify the treatment.

---

# 9. Design principles

The components should follow these rules.

### Optimize for skim first

A hiring manager should be able to scan only:

- section headings
- decision titles
- rejected alternatives
- status labels
- metrics
- expected / observed / changed statements

and still reconstruct the product story.

### Evidence should look different from explanation

Observed evidence should have a distinct visual treatment.

Do not make rationale and evidence visually interchangeable.

### Avoid dashboard cosplay

Do not turn every metric into an oversized KPI tile.

Use large numbers only when they establish context or materially support a product conclusion.

### Avoid generic card grids

The goal is a decision record, not a SaaS settings page.

Prefer ledger, timeline, matrix, and evidence-table patterns.

### Mobile is first-class

The content must remain understandable at phone width.

Do not depend on multi-column relationships that collapse ambiguously when stacked.

### Failures are first-class evidence

The component must visually support:

```text
MIXED
REVISED
UNPROVEN
```

as comfortably as:

```text
VALIDATED
```

---

# 10. Reuse across the portfolio

After Five Across proves the implementation, reuse `DecisionRecords` anywhere an issue asks for:

- decisions
- tradeoffs
- scope choices
- rejected alternatives
- hypotheses
- platform choices
- prioritization choices

Do not create project-specific variants such as:

```text
OverrideDecisions
SwipeWatchTradeoffs
MergepathChoices
```

Normalize these into the common decision schema wherever the underlying information is structurally the same.

Use `CaseStudyEvidence` only where there is enough behavioral or operational evidence to support the stronger narrative.

---

# Acceptance criteria

- [ ] Add an optional reusable `decisions` schema field to project content.
- [ ] Build a `DecisionRecords` component.
- [ ] Each decision supports decision, context, rejected alternative, rationale, evidence, and status.
- [ ] Support `validated`, `mixed`, `revised`, and `pending` states.
- [ ] Add an optional structured case-study schema for principles, constraints, learnings, and platform evolution.
- [ ] Build a `CaseStudyEvidence` treatment for Five Across.
- [ ] Rework Five Across away from the existing Overview / What it does / How it was built / Why it matters structure.
- [ ] Surface at least four consequential Five Across decisions.
- [ ] Include an expected → observed → changed treatment using actual production evidence.
- [ ] Distinguish successful, mixed, revised, and unproven product bets.
- [ ] Show live-operation changes separately from deliberately deferred work.
- [ ] Show Gay Cruise Bingo → Vacay Bingo → Five Across as product evolution rather than naming trivia.
- [ ] Include the agent operating model without turning it into a tool or commit inventory.
- [ ] Preserve the friend-group-launch limitation explicitly.
- [ ] Components work at phone widths without relying on desktop-only column relationships.
- [ ] Projects without these fields continue rendering normally.
- [ ] Reuse the decision component in subsequent portfolio tickets rather than recreating the structure in prose.
- [ ] Production build and relevant tests pass.

## Core principle

**`DecisionRecords` is portfolio infrastructure. `CaseStudyEvidence` is case-study storytelling infrastructure.**

Build both.

The first prevents the same decision structure from being rewritten inconsistently across the portfolio.

The second gives Five Across enough structure to show the most important senior-product signal on the page:

**what we believed → what actually happened → what changed because of it.**
