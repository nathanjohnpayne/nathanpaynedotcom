Per-call LLM cost tracking. A Phase 0 deliverable so cost is measurable from Phase 1 day 1, not retrofitted in Phase 3.

**Why Phase 0.**

The spec makes cost a first-class invariant: per-application LLM spend ≤ $1 at p95, target $0.75 ([`specs/matchline.md § Execution targets`](https://github.com/nathanjohnpayne/matchline/blob/main/specs/matchline.md)). That bar is unenforceable without runtime accounting. Stand it up before any prompt ships, so every Phase 1 test run (and the Phase 1 eval harness) reports a real cost number.

**Scope:**

1. **Cost module.** `functions/src/llm/cost.ts` exposes a small helper:
   - `recordUsage({ stage, model, inputTokens, outputTokens, latencyMs, correlation })` — computes `$` per call from a per-model rate table, writes a `LlmCall` record to Firestore (`llm_calls/{uuid}`) with `{ stage, model, input_tokens, output_tokens, cost_usd, latency_ms, created_at, owner_uid, application_id, fixture_id }`, and returns the computed cost. `correlation` is a required exact discriminated union: `{ kind: 'application', applicationId: string, fixtureId?: never } | { kind: 'fixture', fixtureId: string, applicationId?: never } | { kind: 'ad-hoc', applicationId?: never, fixtureId?: never }`. The production and eval variants therefore cannot compile without the ID their rollups require or with a foreign ID; tooling that intentionally has no correlation must choose `ad-hoc` explicitly rather than getting there by omission.
   - `priceFor(model, { inputTokens, outputTokens })` — pure function, no I/O, trivially testable.
2. **Wire into every LLM call site.** `functions/src/llm/anthropic.ts`, `functions/src/llm/openai.ts`, and `functions/src/llm/embeddings.ts` call `recordUsage()` after every completion/embedding response. Their production entry points require an application correlation; their eval entry points require a fixture correlation. Any new call site added later that does not record usage should be caught by a CI lint that greps for `anthropic.messages.create|openai.chat.completions.create|openai.embeddings.create` without a neighboring `recordUsage(`. Type checking catches a recorded production/eval call that omits its correlation ID.
3. **Rate table.** `functions/src/llm/rates.ts` — one object per model ID (pulled from env via `modelConfig.ts`), with `input_usd_per_1k` and `output_usd_per_1k`. Update via PR when Anthropic/OpenAI pricing changes. Fixture test asserts all models referenced in `modelConfig.ts` have a rate entry.
4. **Per-application rollup view.** Add a `costUsd` getter on the `Application` service that sums `llm_calls` filtered by `application_id`. Not a UI surface yet (that's the Phase 3 dashboard #41) — but the service-level API exists now so Phase 1 eval harness + Application Editor can surface it.
5. **CI budget alarm.** In the eval harness (see Phase 0 eval-harness bootstrap ticket and #25), fail CI if p95 cost across the fixture corpus exceeds $1.00 per full flow. Warn at $0.75.

**Non-goals:**

- A dashboard UI (that's #41, Phase 3).
- Historical backfill. V1 is single-user; first call is the first data point.
- Alerting into Slack / email. Print to stdout + CI check is enough for V1.

**Verification:**

- Fixture test: mock an Anthropic response with known token counts → `recordUsage` writes a Firestore doc with the expected `cost_usd`.
- Type-level tests: application and fixture correlations require their IDs, reject the other ID, and permit an uncorrelated call only through the explicit `ad-hoc` variant. Cover both fresh object literals and preassigned variables so structural typing cannot admit foreign IDs. Separately assert each production wrapper accepts only an application correlation and each eval wrapper accepts only a fixture correlation; both wrapper families reject `ad-hoc` and the opposite correlation kind at compile time.
- Fixture test: every model identifier in `modelConfig.ts` has a rate-table entry.
- Integration smoke: one real call to each of Anthropic + OpenAI + embeddings logs a non-zero `cost_usd`.
- CI lint: grep check for bare LLM calls without adjacent `recordUsage` fails cleanly.

Parent: #__PARENT_NUM__
