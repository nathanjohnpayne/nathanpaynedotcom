Tracks **Phase 1** of Matchline V1 (Project #6).

**Goal:** the four-step core loop works end-to-end for resumes — Career → Experience Units → Matching → Application. A user can paste a resume and a JD and export a validated, exportable resume where every claim traces back to an approved Experience Unit.

This phase is the product. Everything else in the plan makes the core loop better; the core loop has to exist first.

**Hard constraints** (from [`specs/matchline.md`](https://github.com/nathanjohnpayne/matchline/blob/main/specs/matchline.md)):
- **Zero fabrication.** Every claim in every generated output traces to an approved Experience Unit. Validation runs before output is shown.
- **User-approved, not AI-approved.** Experience Units and UnitMatches enter the generation pipeline only after explicit user approval.
- **Explainable by default.** Every score, match, and generated claim surfaces its reasoning.

**Exit criteria:**
- Milestone QA (last sub-issue in this tree) passes on at least three distinct real-world JDs.
- Full-flow p95 under 20s; per-application LLM cost under $1.
- Zero fabrication: QA cannot produce a generated output with an un-sourced claim.

Plan: [`plans/matchline-implementation-plan.md`](https://github.com/nathanjohnpayne/matchline/blob/main/plans/matchline-implementation-plan.md) § Phase 1.
PRD: § Core loop, § Matching engine, § AI pipeline, § Validation layer.

Sub-issues below.
