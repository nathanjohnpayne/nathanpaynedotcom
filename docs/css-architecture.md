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

### Accent is page-type agnostic

Every page that needs a color accent uses `data-accent` on `<body>`. The
`[data-accent]` rules in `global.css` set `--accent`, `--accent-contrast`,
`--accent-soft`, `--accent-text`, `--project-bg`, and the derived project
gradient colors. `.project-page` is a layout family, not a color switch.

Orthogonal to the accent is the palette *register*: `:root` carries the 1921
plane values (the interior default), and the homepage—which uses no
`data-accent`—opts into the high-chroma 1930 register via
`data-palette="1930"`, passed as the `dataPalette` BaseLayout prop
(`index.astro` only). `data-palette` selects what the plane tokens resolve
to; `data-accent` selects which token a page accents with.

Build-time OG cards follow the same per-page register boundary where the card
represents a page: `og-templates/home.astro` passes `palette="1930"` to
`OgCard.astro`, so `home.png` matches the homepage register. Other OG cards do
not pass a palette and stay on the 1921 `:root` default.

| Page | Accent source |
|---|---|
| Blog post | `dataAccent="red"` (`BlogPost.astro`) |
| Blog index | `dataAccent="blue"` (`blog/index.astro`) |
| Projects index | `dataAccent="yellow"` (`projects/index.astro`) |
| 404 | `dataAccent="red"` (`404.astro`) |
| Project detail | project frontmatter `accent`, passed through `ProjectLayout.astro` |
| Resume | `dataAccent="red"` (`resume.astro`) |

Project frontmatter carries only the semantic `accent` value. Raw palette hexes
and gradient fields are intentionally absent; palette values derive from CSS
tokens so the 1921/1930 register split can be controlled centrally.

## Target tokens

Introduced additively, with a backward-compatible bridge, before any markup
changes (#433).

| Token | Replaces | Notes |
|---|---|---|
| `--accent` | `--project-accent` | #433 bridges `--accent: var(--project-accent)`; the direction flips in #437 (see Shim strategy—never alias both directions at once) |
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
  the old `project-*` classes keep resolving (e.g. an old class aliased to the
  shared rule).
- **One accent source of truth per phase—never alias both directions at once.**
  If `--accent: var(--project-accent)` and `--project-accent: var(--accent)` are
  ever live simultaneously they form a CSS custom-property cycle: both tokens
  become invalid and accent colors drop. So #433 makes `--project-accent` the
  source (`--accent: var(--project-accent)`), and #437—when `data-accent` /
  `.theme--*` starts setting `--accent` directly—**replaces** that bridge with
  `--project-accent: var(--accent)` in the same PR (accent becomes the source,
  the legacy token derives). The two bridges never coexist.
- Migrate **one page type at a time**, asserting parity at each step.
- **No big-bang rename:** #438 renames behind the shims introduced in #436.
- Shims are removed only in **#439**, and only after a grep proves zero remaining
  usages plus a green `npm run test` + `npm run test:e2e`.

## Non-goals

- No visual redesign—structural refactor only; rendered output stays
  pixel-equivalent (modulo the #428 fixes).
- The homepage Mondrian grid interaction system is a separate subsystem and is
  out of scope.
