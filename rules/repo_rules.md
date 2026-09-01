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

These are pinned deliberately. Read this before bumping either one—including automated dependency PRs.

**The block below is the machine-readable source of truth, and it is enforced.** `tests/toolchain-pins.test.js` reads it, compares every entry against `package.json`, and re-derives the `typescript` ceiling from the peer ranges recorded in `package-lock.json`. The prose that follows explains and narrates these values; it does not define them, and the test does not parse it. Change a pin here and in `package.json` together, or the test fails closed.

<!-- toolchain-pins:begin — machine-readable; enforced by tests/toolchain-pins.test.js. Keep in sync with package.json. -->

```json
{
  "devDependencies": {
    "typescript": ">=6.0.3 <6.1.0",
    "astro": "7.2.9",
    "@astrojs/markdown-remark": "7.2.4",
    "@astrojs/mdx": "7.0.8"
  },
  "typescriptPeerCeilingSources": ["@astrojs/check", "typescript-eslint"],
  "markdownProcessorLockstep": ["astro", "@astrojs/markdown-remark", "@astrojs/mdx"]
}
```

<!-- toolchain-pins:end -->

The guard runs inside `npm test`, so it reports as `build-and-test`—one of the two checks in `.github/required-head-checks` that Dependabot auto-merge waits on before merging. That placement is the point rather than an implementation detail. A `scripts/ci/check_*` could not report there: `repo_lint.yml` is manifest-canonical in this repo, so a consumer-local check has to be wired in the never-propagated `.github/workflows/repo_lint_local.yml` annex, and the annex reports under its own name, `repo-lint-local`. That check run is deliberately outside the hard-required set, and neither `dependabot-auto-merge.yml` nor `scripts/required-head-checks.sh` references it. A guard living there would be invisible to the auto-merge path for grouped Dependabot PRs—the exact and only vector that has ever breached this section. See #825.

- **`typescript` must stay below `6.1.0`, and both the pin block and `package.json` must say so.** The manifest declares `>=6.0.3 <6.1.0` rather than a caret range, so no *resolution* can cross it, and `tests/toolchain-pins.test.js` now covers the edit that used to cross it freely (see the breach note below). Two peers constrain the ceiling and the binding one is the tighter of the two: `@astrojs/check@0.9.10` (the latest release) peers `typescript@^5.0.0 || ^6.0.0`, but `typescript-eslint@8.x` peers `typescript@>=4.8.4 <6.1.0`. A caret range would have admitted `6.1.x`, which satisfies `@astrojs/check` and still fails `npm ci` on `typescript-eslint`—the same ERESOLVE class as #631, which TypeScript 7 caused outright. Do not widen the range until *both* peers admit the wider version. The test derives that ceiling from the peer ranges in `package-lock.json` rather than from this sentence, so a widening fails even when the pin block is edited to match.

  **This guard has been breached twice, and that is the reason to read this bullet before approving a dependency PR.** [#738](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/738), titled "bump the dev-dependencies group with 5 updates," widened the ceiling to `<7.1.0`—past a full major, and past the `typescript-eslint` peer that makes the ceiling binding. It merged because grouped Dependabot PRs auto-merge on approval here, and a range change inside a five-package group diff is not where a reviewer looks. Nothing broke at the time: the lockfile still resolved `6.0.3`, which satisfies both ranges, so every gate stayed green while the guard itself was gone. It was restored in #824, after an audit compared this rule against the manifest it claims to describe.

  Then it happened again, the same way. [#886](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/886), carrying that same generated title, re-widened the ceiling to `<7.1.0` on 2026-08-31—under five days after #824 restored it—and again every gate stayed green on a lockfile still resolving `6.0.3`. A rule restored by hand survives exactly until the next grouped dependency PR. The lesson is not "watch Dependabot"—it is that **a ceiling stated in prose and a ceiling declared in a manifest can diverge silently, and only a check that reads both will notice.** #825 filed that check after the first breach; the second breach is what it now prevents.

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
  an **exact-version optional peer**, so `@astrojs/markdown-remark` must equal
  whatever version that peer names—and because a caret range on either side
  cannot express that, **both are pinned exact in `package.json`**. A floating
  `astro` range breaks `npm ci` on its own; verified against the registry rather
  than assumed:

  ```text
  $ # observed 2026-08 at package.json: astro ^7.2.2, @astrojs/markdown-remark 7.2.2
  $ npm install --package-lock-only
  npm error Conflicting peer dependency: @astrojs/markdown-remark@7.2.4
  npm error   peerOptional @astrojs/markdown-remark@"7.2.4" from astro@7.2.4
  ```

  That transcript is a record of the break, not a description of the tree today. It is kept because it shows the failure mode a caret on `astro` produces the moment the registry publishes a patch—the floating side pulls a newer `astro` whose exact optional peer no longer matches the pinned `@astrojs/markdown-remark`.

  **The two pins are not required to carry the same number, and today they do not.** `astro@7.2.9` names `@astrojs/markdown-remark@7.2.4` as its exact optional peer, so the pinned pair `astro 7.2.9` / `@astrojs/markdown-remark 7.2.4` is correct and resolves cleanly. The invariant is *match the peer astro declares*, which an earlier revision of this bullet compressed into "same version" while the two happened to agree. `tests/toolchain-pins.test.js` reads the peer out of `package-lock.json` and asserts the pinned version equals it, so the pair is checked against the registry's own coupling rather than against a number written here. Bump both in the same change or neither, and do not remove `@astrojs/markdown-remark` as "unused."
- **`@astrojs/mdx` is the third member of that lockstep set, and its failure mode is silent.** Added in the epic #759 portfolio workstream so a project page can place a frontmatter-driven component mid-body; the evidence is in `plans/759/component-placement-decision.md`. It declares **no peer** on `@astrojs/markdown-remark`—instead it carries an **exact regular dependency** on it, and the exact version differs per mdx release (`7.0.7`/`7.0.8` → `7.2.4`). Today that matches the repo's pin, so npm dedupes to one hoisted copy. Bump `astro` and `@astrojs/markdown-remark` to `7.2.5` **without** a matching `@astrojs/mdx` release and npm will nest a second `@astrojs/markdown-remark` under `node_modules/@astrojs/mdx/`—two Markdown processors in one tree, **no ERESOLVE, no error, every gate still green.** That is the opposite of #630 and #631, which announced themselves. Move all three together, to the release triple that agrees. `tests/toolchain-pins.test.js` asserts mdx's exact dependency on `@astrojs/markdown-remark` equals the pinned version and that the lockfile has no `node_modules/@astrojs/mdx/node_modules/@astrojs/markdown-remark` entry, which is the one failure in this section that would otherwise produce no error at all. It matches that exact path, not the directory: mdx nesting some unrelated transitive dependency is ordinary npm behaviour and says nothing about the Markdown processor.

  A second, louder coupling also exists: `astro@7.2.9` depends on `@astrojs/markdown-satteri@0.3.8` exactly, while `@astrojs/mdx@7.0.8` peers `^0.3.1`. The first `astro` release that moves that dependency to `0.4.x` breaks `npm ci` on mdx's peer—a clean ERESOLVE of the #631 class. Read those three figures from `package-lock.json`, not from this sentence: they were `7.2.4` / `0.3.7` when written, and nothing updated them when `astro` moved.
- **The current lockfile's missing `libc` metadata is accepted as bounded install waste, not a runtime-correctness risk (#644).** npm/cli [#8514](https://github.com/npm/cli/issues/8514) confirmed that old lockfiles without `libc` cause Linux installs to unpack both glibc and musl optional packages. npm fixed lockfile serialization in [#9025](https://github.com/npm/cli/pull/9025), released in npm 11.11.0; npm 12.0.2 writes the fields in a clean lockfile, but an in-place `npm install --package-lock-only` does not backfill missing package metadata.

  We measured the committed lockfile with npm 12.0.2 on glibc Ubuntu 24.04 x64. `npm ci` installed both sides of six native-package pairs, leaving 59,644 KiB (about 58.2 MiB) of unused musl packages. Sharp, Lightning CSS, Rolldown, the complete 35-page Astro build, and all 17 OG-image renders used working glibc binaries; the test suite also passed. The effect is therefore extra download and disk use, not the wrong binary being loaded in this repository's Linux build path.

  Do not hand-add `libc` fields or pin npm to paper over this: hand edits are removed by ordinary lockfile operations, and a pin cannot repair metadata already absent from the lock. A clean npm 12.0.2 regeneration restores 38 `libc` fields but currently changes roughly 240 transitive package entries, so that unrelated dependency churn belongs in a deliberate lockfile-refresh PR. When that refresh happens, use npm 11.11.0 or newer, verify that the regenerated lockfile contains `libc` fields, add the durable npm-floor and CI enforcement tracked in #692, and let Linux CI prove the resulting tree. Enforcing field presence before that refresh would reject the intentionally accepted current lockfile, so the guard and the regenerated metadata must land together. Until then, do not re-file the missing fields as an npm 12 regression unless new evidence shows an incompatible binary is selected.

## Content Invariants

- **Mermaid labels must meet WCAG AA contrast.** Every explicitly styled Mermaid node, in any collection that supports Mermaid, must use measurable three- or six-digit hex fill and label colors with a contrast ratio of at least 4.5:1. Tests enforce this from rendered SVG, so Mermaid owns the grammar for `style`, `classDef`, semicolons, quoted labels, and multiline labels.

## Shared Single Sources

- **A `src/lib/` module documented as a shared single source must be the only place `src/` declares its vocabulary. That rule is carried by review, not by CI, and the distinction is deliberate.** The `.ai_context.md` Key Entry Points table is where the claim is made: a `src/lib/` row whose purpose begins **Shared** carries it. Three modules do today—`blog-order.ts`, `index-grid.ts`, and `lifecycle-marker.ts`.

  `tests/shared-single-sources.test.js` enforces the part that is a closed question: the documented set and the registry in `tests/helpers/single-source-guard.js` name the same modules, each module exists, and every surface the registry names actually imports it. Adding a row without a registry entry fails, and so does the reverse—a rule nobody can find from the docs is its own kind of drift.

  **It does not check that no other file re-declares the vocabulary, and should not be extended to.** #910 tried, across five review rounds, and the attempt is worth recording because the failure was structural rather than a matter of effort. "No equivalent declaration exists elsewhere" is a semantic negative, and deciding it over source text needs a parser: each fix surfaced the next thing raw text cannot see—template literals, tuples, renamed keys, CRLF, path separators, prose comments, block comments, commented-out imports, executable MDX. Thirteen findings across five rounds, every one legitimate. The guard reached 313 lines over 91 lines of guarded module before it was cut back.

  The error was generalizing #825. That guard works because both sides are **closed data**—a version range in two files, settled by string equality—and the lesson does not carry to an open-ended search of a source tree. When deciding whether an invariant can be enforced, ask first whether both sides are enumerable. If they are not, state the rule and say it is unenforced. A scan that claims universal duplicate detection while missing a copy written as a tuple is worse than a documented rule, because it converts "someone has to look" into "CI has this covered."

  Two consequences follow. `tests/lifecycle-marker.test.js` keeps its own residue scan, which predates #910 and is scoped to one vocabulary it understands—it is not a general contract and does not claim to be. And the sweep, where one exists, covers `src/` and not `tests/`: a test that restates a vocabulary is how a source change gets detected, and it only works by staying independent (#737/#912).

## CI Enforcement

The structural checks live in `scripts/ci/` and are wired into `.github/workflows/repo_lint.yml`, which reports as the required `lint` check. **That workflow is the list; this file does not restate it.**

An earlier revision of this section enumerated eight checks as though they were the complete set. They were, once. By the time #849 measured it there were 72 scripts on disk, and the discrepancy was invisible to a numeric grep, because the count was never written as a numeral—it was implied by a Markdown list running `1.` to `8.` A list of that size, kept by hand, in a file whose whole purpose is to be trusted by agents that read it before acting, will go stale again the same way.

Two checks are meant to keep the workflow and the directory in agreement in both directions: `check_ci_scripts_wired` fails when a `scripts/ci/check_*` exists with no `run:` step, and the inline `check_ci_kit_integrity` step fails when a wired step names a script that is not on disk.

**Only the first direction is enforced here.** `check_ci_kit_integrity` early-exits with `SKIP (consumer checkout)` when `scripts/sync-to-downstream.sh` is absent, and it is absent in this repository—that script lives in the mergepath hub. Each wired step also soft-passes when its backing script is missing, by design, to survive kit skew during a sync wave. So deleting a wired `check_*` from `scripts/ci/` here leaves a stale `run:` entry in the workflow and the required `lint` check green. Script-to-wire is enforced; wire-to-script is not, on this side.

Enumerate the current set rather than reading a count out of this file. Anchor the pattern to a real `run:` line—the workflow header documents the wiring convention with a literal `run: ./scripts/ci/check_X` example, and an unanchored grep counts that placeholder as a wired check:

```bash
ls scripts/ci | grep '^check_'                                      # scripts on disk
grep -oE '^[[:space:]]*run: \./scripts/ci/check_[A-Za-z0-9_]+' \
  .github/workflows/repo_lint.yml | sed 's|.*/||' | sort -u         # wired steps
grep -n 'WIRED-EXEMPT' .github/workflows/repo_lint.yml              # deliberate exemptions
```

As of 2026-09-01 that is **72 scripts on disk, 71 wired, and one deliberate exemption**: `check_op_firebase_deploy_integration`, marked `WIRED-EXEMPT` at `repo_lint.yml:350` as opt-in. Three further checks are implemented inline in the workflow with no script of their own: `check_review_policy_exists`, `check_governance_files`, and `check_ci_kit_integrity`. Treat those figures as a reading taken on a date, not as a rule—the commands are the answer.

An earlier revision of this section reported "72 wired" from an unanchored grep. It was wrong twice in opposite directions—counting the `check_X` placeholder and missing the exempt script—and the two errors cancelled to a number that matched the disk count exactly, which is what made it look verified.

`scripts/ci/README.md` annotates a subset of the checks with what each one covers and why it exists. It is a guide to the interesting ones, not an inventory either; its own closing line still points back here for "the full list," which is the circular reference #849 surfaced.

### Which checks enforce the rules above

This is a **curated inventory of the checks closest to this file's own invariants**, not a complete rule-to-enforcer mapping. Some rows—spec/test alignment, the review-policy file pair, the Phase 4a helper scripts—describe checks whose underlying rule is not stated in the sections above; they are kept because an agent reading this file is the one most likely to trip them. Those rows track their checks rather than this file's rules, so they can go stale when a check changes.

**Read the strength column before trusting a row.** A check that runs is not the same as a rule that is enforced, and five of these nine are weaker than their names suggest—which is the single most useful thing this section can tell an agent:

| Rule in this file | Check | Strength |
|---|---|---|
| Structure invariants—the five required root files | `check_required_root_files` | **Blocks** |
| No instruction files in `.claude/` or `.cursor/` | `check_no_tool_folder_instructions` | **Partial.** Blocks a plain `.md`/`.txt` anywhere else in those folders, but skips `.claude/worktrees/**` (worktree checkouts, which are whole repositories) and `.cursor/plans/*.md`. A file placed in either passes |
| Every file in `specs/` has a corresponding test | `check_spec_test_alignment` | **Partial.** Blocks for non-exempt Markdown specs. It walks `*.md` only, skips `example_spec.md` unconditionally, and honours a `tested: false` frontmatter exemption when a `reason:` accompanies it—so "every file" is wider than what is enforced |
| `.github/review-policy.yml` and `REVIEW_POLICY.md` both exist | `check_review_policy_exists` (inline) | **Blocks** |
| Phase 4a helper scripts present and executable | `check_codex_scripts` | **Blocks** |
| Toolchain pins match `package.json` and the lockfile's peer ranges | `tests/toolchain-pins.test.js` | **Blocks**, and reports as `build-and-test` rather than `lint` deliberately—see the Toolchain Constraints note above and #825 |
| No new top-level directories | `check_no_forbidden_top_level_dirs` | **Partial.** Hard-fails on exactly two names, `vendor` and `node_modules/.cache/custom`. Any other undeclared top-level directory emits `WARN` and exits 0, so the general rule above is convention, not a gate |
| `dist/` is build output, never edited in place | `check_dist_not_modified` | **Not enforced in practice.** It compares `HEAD~1..HEAD`, and the `lint_fast` job that runs it checks out at `actions/checkout`'s default depth of 1, so `HEAD~1` does not resolve and the check reports `SKIP (not enough commits to compare)`. Even with history it would read the last commit, not the PR diff |
| No duplicate documentation across canonical docs | `check_duplicate_docs` | **Advisory.** It scans tool-folder files against a fixed topic list, prints `WARN` for each hit, and exits 0 unconditionally. It cannot see conflicting duplication between canonical documents, which is what the rule above is actually about |

Rules with no row at all are held by convention and review, which is weaker still. "Never push directly to `main`" is carried by **branch protection alone** on the push itself: `gh-pr-guard.sh` gates selected `gh pr` and `gh issue` writes and exits early on a command with no `gh` token, so a plain `git push origin main` never reaches it. The server rejects the update; nothing local does. The motion-token rule has no repo-wide scan, and Mermaid contrast is covered by the Vitest suite for the surfaces it renders. Absence from this table is not evidence a rule is unenforced elsewhere, but it is evidence that nothing here enforces it.
