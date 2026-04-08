# Repository Rules

## Structure Invariants

The following files must always exist at the repository root and must never be deleted or moved:

- `README.md`
- `AGENTS.md`
- `DEPLOYMENT.md`
- `CONTRIBUTING.md`
- `.ai_context.md`

The following directories must always exist:

- `blog/` — generated static blog routes
- `content/` — Markdown source content for generated blog pages
- `projects/` — dedicated static project detail pages and search landing pages
- `rules/` — contains this file and other binding constraints
- `plans/` — execution and rollout plans
- `specs/` — feature specifications and acceptance criteria
- `scripts/ci/` — CI enforcement scripts
- `tests/` — Vitest smoke tests for static pages and route coverage
- `docs/` — extended documentation including agent process docs
- `src/` — Astro source (pages, layouts, components)
- `public/` — static assets copied verbatim into dist/ at build time

The following tool config directories must contain only configuration — no instruction prose:

- `.claude/` — Claude Code permissions config only
- `.cursor/` — Cursor configuration and `.mdc` rule files only

**Intentionally absent directories (documented deviations from the standard):**

- `functions/` — No serverless functions. See `.ai_context.md`.
- `dist/` — Build output, gitignored. Not committed to repository.

## Forbidden Patterns

- **Never push directly to `main`.** All changes must go through a pull request—even single-line fixes, documentation updates, and deploy config changes. The only exception is if the human explicitly authorizes a direct push in chat as a break-glass override.
- **No frameworks or bundlers.** This site is intentionally lightweight. Do not introduce a framework, bundler, or new runtime dependency stack without explicit discussion and a `plans/` entry.
- **No hard-coded motion values.** All CSS durations and easing functions must use the motion token variables defined in `:root`. No bare `ms` values or bare `ease` keywords anywhere.
- **No instruction files in tool folders.** `.claude/` and `.cursor/` must not contain plain `.md` or `.txt` instruction files. Cursor `.mdc` rule files are permitted as valid Cursor configuration format.
- **No committed secrets.** API keys, service account JSON, ADC credentials, and tokens must never be committed. GA Measurement IDs are public identifiers; anything write-capable is not.
- **No duplicate documentation.** If a concept is documented in `AGENTS.md` or a canonical root file, it must not be redefined in a conflicting location.
- **No new top-level directories** without explicit justification documented in `AGENTS.md` or a `plans/` entry.
- **Tests must not be deleted to force a build to pass.**

## CI Enforcement

The following checks are implemented in `scripts/ci/` and must pass before any commit is merged:

1. `check_required_root_files` — Verifies README.md, AGENTS.md, DEPLOYMENT.md, CONTRIBUTING.md, and .ai_context.md all exist at repository root
2. `check_no_tool_folder_instructions` — Verifies .claude/ and .cursor/ contain no plain .md or .txt instruction files
3. `check_no_forbidden_top_level_dirs` — Verifies no forbidden top-level directories exist (e.g., tool-instructions/, ai-rules/, agent-config/)
4. `check_dist_not_modified` — Verifies dist/ files were not directly modified (exits cleanly if dist/ does not exist)
5. `check_spec_test_alignment` — Verifies every file in specs/ has a corresponding test file in tests/ (skips if specs/ is empty)
6. `check_duplicate_docs` — Verifies no documentation topic is duplicated between root files and tool folders
7. `check_review_policy_exists` (inline in repo_lint.yml) — Verifies .github/review-policy.yml and REVIEW_POLICY.md both exist
