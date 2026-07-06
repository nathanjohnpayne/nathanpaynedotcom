Bootstrap the evaluation harness in Phase 0 — empty fixtures, runnable from day 1 of Phase 1. The 80/80 quality gates live in #25 (Phase 1, populated corpus); this ticket is just the scaffolding.

**Why Phase 0.**

Measurable quality from the first prompt that ships. See the comment on #25 for the full rationale.

**Scope:**

1. **Harness skeleton.** `tests/eval/` directory with:
   - `run.ts` — entry point. Walks `tests/fixtures/resumes/*.txt`, calls extraction, diffs against `tests/fixtures/expected-units/*.json`, prints per-fixture and aggregate scores. Green on empty fixture set.
   - `scoring.ts` — pure functions (normalized-Unit edit distance, top-K match overlap). Unit-tested in isolation.
   - `report.ts` — stdout formatter: per-fixture row + aggregate summary (accuracy %, p50/p95 latency, p50/p95 cost per eval run).
2. **Fixture directories.** Create `tests/fixtures/resumes/`, `tests/fixtures/jds/`, `tests/fixtures/expected-units/`, `tests/fixtures/expected-matches/`, `tests/fixtures/expected-asset-traces/` with `.gitkeep` files and a short `README.md` explaining the expected format.
3. **NPM script.** `npm run eval` runs the harness. Exit 0 on empty fixture set; exit 1 once #25 populates fixtures and accuracy drops below 80%.
4. **CI wiring (non-blocking).** Add an `eval` job to `repo_lint.yml` that runs `npm run eval` and prints the report. Non-blocking in Phase 0 (no fixtures exist); flip to blocking at the 80/80 gate in #25.
5. **Cost/latency reporting.** The harness imports `functions/src/llm/cost.ts` (see cost-tracker ticket) and prints p50/p95 cost + latency aggregates from the `llm_calls` collection scoped to the run's fixture IDs.

**Non-goals:**

- Populating fixtures (that's #25).
- Flipping the CI gate to blocking (that's #25).
- Outcome tracking / learning loop (V2).

**Verification:**

- `npm run eval` exits 0 with an empty fixture set, printing a "no fixtures" report.
- Unit tests on `scoring.ts` pure functions green.
- `repo_lint.yml` eval job runs on every PR and prints the report (non-blocking).
- Dropping one fake fixture in (e.g. single resume + expected-units JSON) produces a per-fixture accuracy row in the report.

Parent: #__PARENT_NUM__
Related: #25 (Phase 1 — populates this harness and flips the 80/80 gate blocking).
