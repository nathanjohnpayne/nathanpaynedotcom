Prompt versioning convention + loader. Ships in Phase 1 week 1 (before any prompt lands) so every prompt under `functions/src/prompts/` is versioned from day 1 and the eval harness can pin versions per fixture.

**Why Phase 1, early.**

Prompts will iterate ~50 times across Phase 1 → Phase 3. Without a versioning convention from the start, either prompts get rewritten in place (losing the ability to compare v1 → v2 regressions) or v2 drops in without a clear rollback path. Versioning from the first prompt is free; adding it later is painful.

**Scope:**

1. **Directory convention.** `functions/src/prompts/<stage>/<name>.v<N>.md` + co-located `<name>.v<N>.schema.ts` (Zod). Example:
   ```
   functions/src/prompts/
   ├── extraction/
   │   ├── resume.v1.md
   │   ├── resume.v1.schema.ts
   │   └── index.ts            # loader
   ├── parsing/
   ├── matching/
   ├── generation/
   └── validation/
   ```
2. **Loader.** `functions/src/prompts/<stage>/index.ts` exports `loadPrompt("resume")` which reads the currently-active version from `modelConfig.ts` (`promptConfig.extraction.resume = "v1"`), loads the `.md` body and the co-located schema, and returns `{ template, schema, version, stage }`. Call sites never string-concat paths or hardcode versions.
3. **CI lint.** Add `scripts/ci/check_prompt_schema_pairs` that fails CI if any `*.v<N>.md` lacks a co-located `*.v<N>.schema.ts`, or vice versa. Keeps prompt and schema from drifting.
4. **Eval harness support.** The harness (see the Phase 0 bootstrap ticket and #25) accepts `--prompt-version <stage>=<version>` to pin a specific version per fixture run. Enables v2 dry-runs against the full corpus without flipping `modelConfig.ts`.
5. **Migrate PR #4 stubs.** Any prompt scaffolding currently sitting inline in `functions/src/llm/*` moves into this directory structure. If there is no prompt code yet (PR #4 is wrappers only), this scope is trivially satisfied and the convention simply applies to the first prompt ticket (#17).

**Non-goals:**

- A prompt DSL / template engine. Markdown with `{{placeholder}}` substitution is enough; keep it boring.
- Multi-language prompts.
- Runtime A/B of prompt versions (single-user V1; flip via config).

**Verification:**

- `scripts/ci/check_prompt_schema_pairs` passes on a clean tree and fails when a deliberately-orphaned schema is introduced.
- Loader unit test: given a tree with v1 + v2 of the same prompt and `modelConfig.extraction.resume = "v2"`, the loader returns the v2 body + v2 schema.
- All Phase 1 prompt tickets (#17, #19, #22, #23) are unblocked — first call to `loadPrompt(...)` compiles and runs.

Parent: #__PARENT_NUM__
Blocks: #17, #19, #22, #23 (every Phase 1 prompt ticket).
