# Repository Rules

## Structure Invariants

The following files must always exist at the repository root and must never be deleted or moved:

- `README.md`
- `AGENTS.md`
- `DEPLOYMENT.md`
- `CONTRIBUTING.md`
- `.ai_context.md`

The following directories must always exist:

- `src/`—Astro source (pages, layouts, components, content collections, plugins)
- `src/content/blog/`—Markdown blog post source files with frontmatter
- `public/`—static assets copied verbatim into dist/ at build time
- `rules/`—contains this file and other binding constraints
- `plans/`—execution and rollout plans
- `specs/`—feature specifications and acceptance criteria
- `scripts/ci/`—CI enforcement scripts
- `tests/`—Vitest smoke tests for static pages and route coverage
- `docs/`—extended documentation including agent process docs

The following tool config directories must contain only configuration—no instruction prose:

- `.claude/`—Claude Code permissions config only
- `.cursor/`—Cursor configuration and `.mdc` rule files only

**Intentionally absent directories (documented deviations from the standard):**

- `functions/`—No serverless functions. See `.ai_context.md`.
- `dist/`—Build output, gitignored. Not committed to repository.

## Forbidden Patterns

- **Never push directly to `main`.** All changes must go through a pull request—even single-line fixes, documentation updates, and deploy config changes. The only exception is if the human explicitly authorizes a direct push in chat as a break-glass override.
- **Astro is the framework.** The site uses Astro for static site generation. Do not introduce additional frameworks, client-side runtimes, or bundlers without explicit discussion and a `plans/` entry.
- **No hard-coded motion values.** All CSS durations and easing functions must use the motion token variables defined in `:root`. No bare `ms` values or bare `ease` keywords anywhere.
- **No instruction files in tool folders.** `.claude/` and `.cursor/` must not contain plain `.md` or `.txt` instruction files. Cursor `.mdc` rule files are permitted as valid Cursor configuration format.
- **No committed secrets.** API keys, service account JSON, ADC credentials, and tokens must never be committed. Public client identifiers (GA Measurement ID, Logo.dev publishable token, PostHog `phc_`) are public-by-design but still env-injected via `.env.tpl`/`op inject` and never hardcoded; anything that can read or manage data is a secret and likewise never committed.
- **No duplicate documentation.** If a concept is documented in `AGENTS.md` or a canonical root file, it must not be redefined in a conflicting location.
- **No new top-level directories** without explicit justification documented in `AGENTS.md` or a `plans/` entry.
- **Tests must not be deleted to force a build to pass.**
- **No `.npmrc` with `legacy-peer-deps=true`.** `npm ci` must succeed with no
  flags. Suppressing peer resolution hides real incompatibilities—see #631,
  where a `typescript` major that no installed `@astrojs/check` release peers on
  went unnoticed for two months.

## Toolchain Constraints

These are pinned deliberately. Read this before bumping either one—including
automated dependency PRs.

- **`typescript` must stay within the range `@astrojs/check` peers on.**
  `@astrojs/check@0.9.10` (the latest release) peers `typescript@^5.0.0 || ^6.0.0`,
  and `typescript-eslint@8.x` peers `typescript@>=4.8.4 <6.1.0`. TypeScript 7 breaks
  `npm ci` outright (#631). Do not raise `typescript` past `^6` until
  `@astrojs/check` ships a release whose peer range admits it; verify with
  `npm view @astrojs/check peerDependencies` rather than assuming.
- **`@astrojs/markdown-remark` is a required devDependency even though no source
  file imports it.** Astro 7 made Sätteri the default Markdown processor and
  stopped installing `@astrojs/markdown-remark` transitively, but
  `astro.config.mjs` still uses `markdown.remarkPlugins` / `markdown.rehypePlugins`
  for the three custom plugins in `src/plugins/`. Without the explicit dependency
  `astro build` fails in `coerceLegacyMarkdownPlugins` (#630). Astro declares it as
  an exact-version optional peer (`astro@7.2.2` → `@astrojs/markdown-remark@7.2.2`),
  so the two versions must be bumped together. Do not remove it as "unused."

## CI Enforcement

The following checks are implemented in `scripts/ci/` and must pass before any commit is merged:

1. `check_required_root_files`—Verifies README.md, AGENTS.md, DEPLOYMENT.md, CONTRIBUTING.md, and .ai_context.md all exist at repository root
2. `check_no_tool_folder_instructions`—Verifies .claude/ and .cursor/ contain no plain .md or .txt instruction files
3. `check_no_forbidden_top_level_dirs`—Verifies no forbidden top-level directories exist (e.g., tool-instructions/, ai-rules/, agent-config/)
4. `check_dist_not_modified`—Verifies dist/ files were not directly modified (exits cleanly if dist/ does not exist)
5. `check_spec_test_alignment`—Verifies every file in specs/ has a corresponding test file in tests/ (skips if specs/ is empty)
6. `check_duplicate_docs`—Verifies no documentation topic is duplicated between root files and tool folders
7. `check_review_policy_exists` (inline in repo_lint.yml)—Verifies .github/review-policy.yml and REVIEW_POLICY.md both exist
8. `check_codex_scripts`—Verifies `scripts/codex-review-request.sh` and `scripts/codex-review-check.sh` exist and are executable. Required for `CLAUDE.md` step 8 Phase 4a (automated external review via the OpenAI Codex GitHub App)—missing either script silently forces callers to Phase 4b fallback.
