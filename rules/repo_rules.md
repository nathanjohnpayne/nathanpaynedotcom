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

- **`typescript` must stay below `6.1.0`. `package.json` holds the ceiling; nothing guards the ceiling itself.** The manifest declares `>=6.0.3 <6.1.0` rather than a caret range, so no *resolution* can cross it — but an edit to the range crosses it freely, and that is exactly what happened (see the breach note below). Read the declared range as a value under review, not as an enforcement mechanism. Two peers constrain it and the binding one is the tighter of the two: `@astrojs/check@0.9.10` (the latest release) peers `typescript@^5.0.0 || ^6.0.0`, but `typescript-eslint@8.x` peers `typescript@>=4.8.4 <6.1.0`. A caret range would have admitted `6.1.x`, which satisfies `@astrojs/check` and still fails `npm ci` on `typescript-eslint`—the same ERESOLVE class as #631, which TypeScript 7 caused outright. Do not widen the range until *both* peers admit the wider version.

  **This guard has been breached once, and the breach is the reason to read this bullet before approving a dependency PR.** [#738](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/738), titled "bump the dev-dependencies group with 5 updates," widened the ceiling to `<7.1.0`—past a full major, and past the `typescript-eslint` peer that makes the ceiling binding. It merged because grouped Dependabot PRs auto-merge on approval here, and a range change inside a five-package group diff is not where a reviewer looks. Nothing broke at the time: the lockfile still resolved `6.0.3`, which satisfies both ranges, so every gate stayed green while the guard itself was gone. It was restored in #824, after an audit compared this rule against the manifest it claims to describe. The lesson is not "watch Dependabot"—it is that **a ceiling stated in prose and a ceiling declared in a manifest can diverge silently, and only a check that reads both will notice.** No such check exists yet; #825 tracks it, and until it lands this bullet is enforced by nothing but the next person to read it.

  Verify against the versions this repo actually installs, not the registry's `latest`—a versionless `npm view` reports the peer range of a release that may not be in the lockfile:

  ```bash
  node -e 'const l=require("./package-lock.json").packages;
    for (const n of ["@astrojs/check","typescript-eslint"])
      console.log(n, l["node_modules/"+n].version)'
  npm view "@astrojs/check@<resolved>" peerDependencies
  npm view "typescript-eslint@<resolved>" peerDependencies
  ```

  Checking only `@astrojs/check` is what makes a `6.1` bump look safe when it is
  not.
- **`@astrojs/markdown-remark` is a required devDependency even though no source
  file imports it.** Astro 7 made Sätteri the default Markdown processor and
  stopped installing `@astrojs/markdown-remark` transitively, but
  `astro.config.mjs` still uses `markdown.remarkPlugins` / `markdown.rehypePlugins`
  for the three custom plugins in `src/plugins/`. Without the explicit dependency
  `astro build` fails in `coerceLegacyMarkdownPlugins` (#630). Astro declares it as
  an exact-version optional peer (`astro@7.2.2` → `@astrojs/markdown-remark@7.2.2`),
  so the two versions must move together—and because a caret range on one side
  cannot express that, **both are pinned exact in `package.json`**. A floating
  `astro` range breaks `npm ci` on its own; verified against the registry rather
  than assumed:

  ```text
  $ # observed 2026-08 at package.json: astro ^7.2.2, @astrojs/markdown-remark 7.2.2
  $ npm install --package-lock-only
  npm error Conflicting peer dependency: @astrojs/markdown-remark@7.2.4
  npm error   peerOptional @astrojs/markdown-remark@"7.2.4" from astro@7.2.4
  ```

  That transcript is a record of the break, not a description of the tree today: both entries are now pinned exact at `7.2.4` and resolve cleanly. It is kept because it shows the failure mode a caret on `astro` produces the moment the registry publishes a patch—the floating side pulls a newer `astro` whose exact optional peer no longer matches the pinned `@astrojs/markdown-remark`. Bump both entries in the same change, to the same version, or not at all. Do not remove `@astrojs/markdown-remark` as "unused."
- **`@astrojs/mdx` is the third member of that lockstep set, and its failure mode is silent.** Added in the epic #759 portfolio workstream so a project page can place a frontmatter-driven component mid-body; the evidence is in `plans/759/component-placement-decision.md`. It declares **no peer** on `@astrojs/markdown-remark`—instead it carries an **exact regular dependency** on it, and the exact version differs per mdx release (`7.0.7`/`7.0.8` → `7.2.4`). Today that matches the repo's pin, so npm dedupes to one hoisted copy. Bump `astro` and `@astrojs/markdown-remark` to `7.2.5` **without** a matching `@astrojs/mdx` release and npm will nest a second `@astrojs/markdown-remark` under `node_modules/@astrojs/mdx/`—two Markdown processors in one tree, **no ERESOLVE, no error, every gate still green.** That is the opposite of #630 and #631, which announced themselves. Move all three together, to the release triple that agrees, and verify afterwards that `node_modules/@astrojs/mdx/node_modules` does not exist.

  A second, louder coupling also exists: `astro@7.2.4` depends on `@astrojs/markdown-satteri@0.3.7` exactly, while `@astrojs/mdx` peers `^0.3.1`. The first `astro` release that moves that dependency to `0.4.x` breaks `npm ci` on mdx's peer—a clean ERESOLVE of the #631 class.
- **The current lockfile's missing `libc` metadata is accepted as bounded install waste, not a runtime-correctness risk (#644).** npm/cli [#8514](https://github.com/npm/cli/issues/8514) confirmed that old lockfiles without `libc` cause Linux installs to unpack both glibc and musl optional packages. npm fixed lockfile serialization in [#9025](https://github.com/npm/cli/pull/9025), released in npm 11.11.0; npm 12.0.2 writes the fields in a clean lockfile, but an in-place `npm install --package-lock-only` does not backfill missing package metadata.

  We measured the committed lockfile with npm 12.0.2 on glibc Ubuntu 24.04 x64. `npm ci` installed both sides of six native-package pairs, leaving 59,644 KiB (about 58.2 MiB) of unused musl packages. Sharp, Lightning CSS, Rolldown, the complete 35-page Astro build, and all 17 OG-image renders used working glibc binaries; the test suite also passed. The effect is therefore extra download and disk use, not the wrong binary being loaded in this repository's Linux build path.

  Do not hand-add `libc` fields or pin npm to paper over this: hand edits are removed by ordinary lockfile operations, and a pin cannot repair metadata already absent from the lock. A clean npm 12.0.2 regeneration restores 38 `libc` fields but currently changes roughly 240 transitive package entries, so that unrelated dependency churn belongs in a deliberate lockfile-refresh PR. When that refresh happens, use npm 11.11.0 or newer, verify that the regenerated lockfile contains `libc` fields, add the durable npm-floor and CI enforcement tracked in #692, and let Linux CI prove the resulting tree. Enforcing field presence before that refresh would reject the intentionally accepted current lockfile, so the guard and the regenerated metadata must land together. Until then, do not re-file the missing fields as an npm 12 regression unless new evidence shows an incompatible binary is selected.

## Content Invariants

- **Mermaid labels must meet WCAG AA contrast.** Every explicitly styled Mermaid node, in any collection that supports Mermaid, must use measurable three- or six-digit hex fill and label colors with a contrast ratio of at least 4.5:1. Tests enforce this from rendered SVG, so Mermaid owns the grammar for `style`, `classDef`, semicolons, quoted labels, and multiline labels.

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
