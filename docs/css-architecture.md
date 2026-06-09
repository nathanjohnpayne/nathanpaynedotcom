# CSS Architecture: shared primitives vs. page-specific styling

> Status: migration note for the #429 refactor. Discovery/spec only—no behavior
> change is introduced by the PR that adds this file. Each migration step below
> is its own PR (see **Migration order**).

## Guiding principle

A change to a genuinely shared element should apply **everywhere it is used,
with zero per-page overrides**. A footer tweak should land identically on blog,
resume, projects, and 404; a change to one blog post's chrome should apply to
all blog posts. Today the same visual element is implemented several times, so a
single conceptual change costs many edits (the motivation in #428).

This note maps what is shared vs. page-specific, names the target primitives and
tokens, and fixes the migration order so each step is independently reviewable
and pixel-equivalent.

## Reference pages and breakpoints

Every migration PR asserts visual parity across these pages at these widths.

| Page type | Route / file |
|---|---|
| Blog index | `src/pages/blog/index.astro` |
| Projects index | `src/pages/projects/index.astro` |
| Blog post | `src/layouts/BlogPost.astro` |
| Project detail | `src/layouts/ProjectLayout.astro` |
| Resume | `src/pages/resume.astro` |
| 404 | `src/pages/404.astro` |

Breakpoints: **320 / 375 / 800 / 1440px**. Target: pixel-equivalent rendering,
modulo the intentional consistency fixes already shipped in #428.

## Current inventory (baseline, `src/`)

### Footers—four implementations, three hover colors

| Implementation | Used by |
|---|---|
| `.grid-footer` + `.footer-action` | blog index, projects index |
| `.blog-footer` + `.project-action` | blog post |
| `.project-detail-footer` + `.project-action` | project detail |
| `.resume-canvas-footer` + `.project-action` | resume |

→ **Target:** one `Footer.astro` + one footer class set + one hover rule. The
per-project accent is a token, not a separate implementation.

### Canvas / "black box"—five independent declarations

| Class | Rendered by |
|---|---|
| `.error-mondrian` | `src/pages/404.astro` |
| `.frame` | blog index (`blog/index.astro:57`), projects index (`projects/index.astro:40`) |
| `.blog-canvas` | blog post |
| `.project-detail` | project detail |
| `.resume-canvas` | resume |

Each redeclares width, `margin: 0 auto`, the `var(--line)` frame, and the same
`14px 14px 0 rgba(17,16,13,0.12)` drop shadow (7 occurrences in `global.css`:
`1278, 1928, 2288, 2356, 2399, 2495, 3646`).

→ **Target:** one `PageCanvas.astro` primitive driving width, centering, frame,
shadow, and gutter from tokens.

### Shared chrome misleadingly prefixed `project-*`

| Class | Count | Call sites |
|---|---|---|
| `.project-shell` | 3 | `global.css`, `ProjectLayout`, `BlogPost` |
| `.project-action` | 25 | `HeroWide`, `HeroNarrow`, `ProjectLayout`, `BlogPost`, `resume`, `404` |
| `.project-breadcrumbs` | 14 | `global.css`, `HeroNarrow`, `HeroWide`, `BlogPost`, `resume` |
| `.project-deck` | 6 | `HeroNarrow`, `HeroWide`, `BlogPost` |

These are site-wide primitives; the `project-` prefix obscures that.

→ **Target (semantic names):** `project-shell → page-shell`,
`project-action → nav-button` / `action-button`,
`project-breadcrumbs → breadcrumbs`, `project-deck → deck`. `project-*` is
reserved for genuinely project-only styling.

### Accent conflated with page type

`.project-page--{color}` is borrowed purely as an accent switch—it sets
`--project-accent` / `--project-accent-foreground` / `--project-accent-soft`
(`global.css:1224-1262`). Consumers that are not project pages opt in only for
the color:

| Page | `bodyClass` |
|---|---|
| Blog post | `project-page project-page--red blog-page` (`BlogPost.astro:142`) |
| Blog index | `project-page project-page--blue blog-page` (`blog/index.astro:53`) |
| Projects index | `project-page project-page--yellow blog-page` (`projects/index.astro:36`) |
| 404 | `project-page project-page--red` (`404.astro:8`) |
| Project detail | `project-page ${accentColorClass}` (`ProjectLayout.astro:88`) |
| Resume | `resume-page`, with `--project-accent: var(--red)` hard-set (`global.css:3614`) |

Project detail's per-project color comes from frontmatter:
`accentColorClass` (`src/content.config.ts:15`), set in the 6
`src/content/projects/*.md` files (e.g. `accentColorClass: "project-page--red"`).

→ **Target:** a page-type-agnostic accent API (`data-accent="red|…"` or
`.theme--{color}`) that sets `--accent`. `.project-page` no longer doubles as
the accent switch; project detail maps `accentColorClass` → the same API.

## Target tokens

Introduced additively, with a backward-compatible bridge, before any markup
changes (#433).

| Token | Replaces | Notes |
|---|---|---|
| `--accent` | `--project-accent` | bridged: `--accent: var(--project-accent)` until consumers migrate (#437) |
| `--canvas-shadow` | `14px 14px 0 rgba(17,16,13,0.12)` (×7) | the shared drop shadow |
| `--page-gutter` | the repeated `2rem` shell gutters (from #428) | |
| `--line` | *(already exists, `global.css:24`)* | the `9px` frame width—reuse, do not redefine |

Motion stays on the existing `--motion-*` / `--ease-*` tokens; no bare `ms`/easing
values are introduced (per `rules/repo_rules.md`).

## Migration order

Dependency-ordered; each is its own PR and preserves parity.

1. **#432** this note (docs only)
2. **#440** visual-regression baseline (locks the pre-refactor reference early)
3. **#433** tokenize (`--accent`, `--canvas-shadow`, `--page-gutter`; bridge `--project-accent`)
4. **#434** extract `Footer.astro`
5. **#435** extract `PageCanvas.astro`
6. **#436** extract `Breadcrumbs.astro` + shared nav/action button
7. **#437** decouple accent from page type
8. **#438** semantic rename of shared `project-*` chrome (highest risk)
9. **#439** delete redundant per-page CSS + remove shims

## Shim strategy

- **Shims first, removal last.** New primitives and names are introduced while
  the old `project-*` classes and `--project-accent` keep resolving (e.g. old
  class aliased to the shared rule; `--project-accent: var(--accent)`).
- Migrate **one page type at a time**, asserting parity at each step.
- **No big-bang rename:** #438 renames behind the shims introduced in #436.
- Shims are removed only in **#439**, and only after a grep proves zero remaining
  usages plus a green `npm run test` + `npm run test:e2e`.

## Non-goals

- No visual redesign—structural refactor only; rendered output stays
  pixel-equivalent (modulo the #428 fixes).
- The homepage Mondrian grid interaction system is a separate subsystem and is
  out of scope.
