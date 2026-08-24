# Agent Operating Rules

### Key Design Decisions

#### Mondrian Grid
The `.mondrian` container is a 9-column × 9-row CSS Grid. Odd-numbered tracks are `var(--line)` (9px desktop / 6px stack-mode)—they render as the black dividing lines of the composition. Even-numbered tracks hold panels and decorative blocks.

When a panel is focused, JavaScript sets `data-focus="<panel-name>"` on the grid container. CSS defines a separate `grid-template-columns` + `grid-template-rows` for each `data-focus` value, and the transition (`--motion-plane: 460ms` with `--ease-standard`) animates between them—bumped from `280ms / --ease-sharp` in #313 / #314 so the row/column re-flow reads as a deliberate composition shift instead of a snap.

Animated `grid-template-rows` values use only explicit, interpolable lengths (`px`, `rem`, `fr`, `calc()` of those, `minmax()` of those). No `auto` tracks during animation—`auto` snaps when the spanning content's flow contribution changes, which produces visible 0-length frames on close. Each panel's natural content height is measured in JS at page load (after fonts settle) and on resize, then exposed as `--cell-h-{about,projects,community,connect}` on `.mondrian`. The focus-state CSS consumes those custom properties via `calc()`. See `measureContentHeights()` in `src/pages/index.astro` and the `--cell-h-*` consumers in `src/styles/global.css`.

For the multi-row spanning panels (about, projects, community), the helper line track and second content track that each panel spans collapse to `0` uniformly across every column when that panel is the focus. Decorative blocks in the absorbed tracks (`block--white-a` / `block--white-b` for about/projects; `block--gray-d` / `panel--blue` for community) resolve to 0px height. The boundary line below the spanning panel stays at `var(--line)` so a single normal-weight grid line remains between the spanning panel and the next visible row—no skinny-strip artifacts. See PR #315 for the consistency fix.

#### Project and Blog Index Grid

The `/projects/` and `/blog/` indexes share the `.blog-grid` composition and the position resolver in `src/lib/index-grid.ts`. Desktop geometry repeats every six rows using only the established 50% and 72% vertical axes exposed by `--col-post`, `--col-mid`, and `--col-post-wide`: `50/22/28 → 72/28 → 50/50 → 50/22/28 → 72/28 → 50/50`. The opening six accents are red + paper, blue, black, yellow + paper, light blue, and red. Accent placement is evaluated separately at cycle boundaries: later cycles keep the opening geometry but use yellow + paper so a closing red row is never followed immediately by another red row. Stack mode collapses every row to one column and hides the decorative accents. The blog's `Featured` label belongs to the opening row's trailing accent position rather than to any color class, so editorial state cannot change the shared palette placement. Blog cards and the homepage Writing list use the comparator in `src/lib/blog-order.ts`: featured first, category rank second, and newest first within a category. The homepage Latest Post callout, RSS, and in-post navigation remain chronological.

#### Panel Interaction Model
- **Desktop (hover + fine pointer):** Hover goes through an interaction state machine (`idle` → `opening` → `open` → `switching` → `closing`). `mouseenter` requests open via `requestPanel()`; while a morph is in progress, hover events are ignored. After `--motion-plane` settles, `document.elementFromPoint(lastMoveX, lastMoveY)` re-resolves the cursor's actual target. `mouseleave` checks `event.relatedTarget` first—if the cursor is moving directly to another panel, it triggers a switch instead of closing through `idle`. Otherwise a brief, cancellable close timer fires (`leaveDelay = 80ms`). See `src/pages/index.astro` for the full state machine and #314 for the choreography spec.
- **Geometry vs content reveal:** `data-focus` and `is-open` drive the grid morph and cream surface. A separate `is-content-visible` class (added late in the open sequence, removed early on close) drives the text fade via opacity/visibility/pointer-events—never `display: none/block`, so the fade actually transitions.
- **Keyboard:** `Enter`/`Space` opens; `Escape` closes. `focusin`/`focusout` manage state. Click/keyboard/focus paths bypass the state-machine guard so deliberate user intent always works, including mid-morph. They pass `replayHover = false` so the post-morph re-resolve doesn't switch away from a deliberately-opened panel.
- **Reduced motion:** `prefers-reduced-motion: reduce` zeros all CSS transition durations *and* short-circuits the JS state-machine timers (`readMsToken` returns `0` when the query matches), so reduced-motion users see state changes immediately rather than sitting through invisible delays.
- **Stack mode (≤ 1023px, below `--bp-stack`):** All interactions are disabled. Panels stack vertically with content always visible. The mobile-stack `panel-content` rules in `global.css` restore `opacity: 1; visibility: visible` so the readable stack always renders content (the desktop base rule keeps it hidden for the fade-in choreography). The `mobile()` media-query check gates every interaction handler.

#### Build Step
The site uses Astro to generate static HTML into `dist/`. Run `npm run build` before deploying. The dev server (`npm run dev`) provides HMR for local development. Do not introduce additional frameworks or client-side runtimes without explicit discussion.

### Content-to-Cell Mapping
Panel CSS classes are color-based (controlling grid position and color). Content is assigned to cells independently:

| Cell Class | Token / Homepage Value | Position | Content |
|------------|------------------------|----------|---------|
| `panel--red` | `var(--red)` / `#da2418` | top-left (col 2–5, row 2–5) | About / Identity |
| `panel--yellow` | `var(--yellow)` / `#f0c800` | top-right (col 6–9, row 2) | Builds (Projects) |
| `panel--black` | `var(--black)` / `#11100d` | bottom-left (col 2, row 6–9) | Community |
| `panel--blue` | `var(--blue)` / `#0a5c9e` | bottom-right (col 6–9, row 8) | Connect |

The homepage opts into the 1930 palette via `dataPalette="1930"`; interior pages use the 1921 `:root` register documented in [Code Modification Rules](code-modification-rules.md).

Narrative order: **Identity → Work → Community → Contact**

### Coding Conventions

#### Astro Pages & Layouts
- Semantic elements: `<main>`, `<section>`, `<article>`.
- Every panel uses `role="region"` with a descriptive `aria-label`.
- Decorative blocks use `aria-hidden="true"`.
- External links always get `target="_blank" rel="noopener"`.
- Inline SVG for social icons (no icon library).

#### CSS
- Design tokens live in `:root` inside `src/styles/global.css`—color (`--ink`, `--paper`, `--red`, `--yellow`, `--blue`), layout (`--line`, `--su`), and the full motion system (see [Code Modification Rules](code-modification-rules.md)).
- All durations and easing functions must use motion tokens—no hard-coded `ms` values or bare `ease` keywords.
- Use `clamp()` for fluid sizing; avoid fixed breakpoint font overrides.
- Homepage panel states are driven by `data-focus` attribute on the grid container.
- Respect `prefers-reduced-motion: reduce`—universally disables all transitions and animations.
- `:focus-visible` for keyboard focus outlines (not `:focus`).

#### Client-Side JavaScript
- Minimal—Astro pages are static. Client-side JS should be limited to interactive behaviors (panel open/close, keyboard nav, analytics).
- Vanilla DOM APIs only—no jQuery or utility libraries.
- Use `matchMedia` for capability detection, not user-agent sniffing.
- Analytics calls guard on `typeof gtag !== 'function'`.

### Content Updates

#### Adding a Project
1. Add the project to the homepage in `src/pages/index.astro` (yellow panel section).
2. Create a dedicated project page at `src/pages/projects/<slug>/index.astro` using `ProjectLayout`.
3. Create an OG template at `src/pages/og-templates/projects/<slug>.astro` for build-time OG image generation.
4. The sitemap is auto-generated by `@astrojs/sitemap`—no manual update needed.

#### Adding a Blog Post
1. Create the Markdown source file in `src/content/blog/<slug>.md` with frontmatter matching the Zod schema in `src/content.config.ts`. `category` is required and must use a value from `BLOG_CATEGORIES`; `featured` defaults to `false`.
2. If the new post becomes featured, set the previous featured post to `false` in the same change. The collection-wide test requires exactly one published featured post.
3. Run `npm run build` to generate the static pages (or use `npm run dev` to preview).
4. The blog listing, homepage Writing list, RSS feed, and sitemap update automatically. Editorial surfaces use featured/category/date order; RSS, Latest Post, and prev/next use date order.

#### Adding a Social Link
1. Edit the blue panel section in `src/pages/index.astro`.
2. Follow the existing pattern for social row markup (inline SVG icon, label, arrow).

#### Updating Bio / Community Content
Edit the relevant panel section in `src/pages/index.astro`. About content is in the red panel, Community content is in the black panel.

### Analytics
Google Analytics 4 via `gtag.js` (property env-injected via `PUBLIC_GA_MEASUREMENT_ID`, not hardcoded). Events:

| Event | Trigger | Parameters |
|-------|---------|------------|
| `section_view` | First hover on a panel | `section_name`, `event_category: "engagement"` |

---

## 1Password CLI authentication failures

If any `op` command (`op read`, `op inject`, `op run`, `op document get`,
or any script that wraps them) fails with a sign-in or authentication
error—including but not limited to:

- `[ERROR] ... not currently signed in`
- `session expired`
- `biometric unlock ... timed out`
- `authorization prompt dismissed`
- `error initializing client: authorization`

Then follow this procedure:

1. **Stop immediately.** Do not retry the command, do not attempt
   workarounds (manual token entry, environment variable overrides,
   fallback credential paths, or skipping the credential step).
2. **Check if preflight was run.** If `OP_PREFLIGHT_DONE` is not set,
   suggest running the preflight script:
   > "1Password auth failed. Would you like to run credential preflight
   > to cache all credentials at once?
   > `eval \"$(scripts/op-preflight.sh --agent claude --mode all)\"`"
3. **If preflight was already run** but credentials expired (rare—only after 1Password locks or the 12-hour hard limit), prompt the human and suggest re-running preflight:
   > "Preflight credentials appear to have expired. Could you re-run
   > preflight when you're back? I need to resume the review."
4. **Wait for the human to confirm** they are present and ready before
   re-running preflight (not individual `op read` commands).
5. After confirmation, re-run preflight. If it fails again, report the
   full error output and wait—do not loop.

This rule applies only to 1Password CLI sign-in and authentication
errors. Other `op` failures (wrong item ID, missing field, network
errors, vault permission errors) should be diagnosed and resolved
normally.

## Bug fix escalation policy

These rules prevent agents from repeatedly patching symptoms of a
structural defect. They are derived from a real failure where one agent
made six unsuccessful fix attempts on the same issue because every
attempt preserved the same broken architectural assumption.

### Two-strike audit rule

If an agent has made **two or more failed fix attempts** on the same
issue (i.e., two merged PRs that were each intended to resolve the issue
but did not), the next attempt **must** begin with a written audit of
all prior attempts before any code changes. The audit must:

1. List every prior PR that targeted this issue.
2. For each, state what it changed and why it was insufficient.
3. Identify the **shared assumption** across all prior attempts.
4. Propose a fix that addresses that assumption directly, not another
   symptom within it.

The audit should appear in the PR description under a section titled
"Audit Of Prior Failed Fixes."

If the agent cannot identify a shared assumption, it must flag the issue
to the human rather than filing another incremental fix.

### Agent rotation for retries

When an agent's fixes are not resolving an issue after two attempts,
**hand the problem to a different agent**. A fresh agent without the
prior context is less likely to inherit implicit assumptions about the
system's architecture. The new agent should be given:

- The issue description
- Links to all prior fix PRs
- No additional narrative framing (let it form its own model)

This is a recommendation, not a hard rule. The human decides when to
rotate.

### Serialization layer review requirement

When reviewing a PR that introduces or modifies a **serialization or
deserialization layer**---any code that converts structured data to a flat
format (strings, JSON, markdown, plain text) and back---the reviewer must
verify:

1. **Losslessness:** Does the round-trip preserve all semantically
   meaningful information? If not, what is discarded?
2. **Consumer parity:** Do all consumers of the serialized format
   produce identical output from identical input? If there are multiple
   parsers/renderers, are they tested for equivalence?
3. **Necessity:** Is the intermediate format required, or can consumers
   read the structured format directly?

If the round-trip is lossy, the reviewer must flag the information loss
as a design risk and require either:
- An explicit justification for why the loss is acceptable, or
- A plan to eliminate the intermediate format

## Worktree lifecycle

Worktrees created for a task must be removed immediately after the corresponding
branch is merged or deleted from the remote. Never leave a worktree checked out
for a branch that is `[gone]` on the remote.

**After merging a PR whose branch had a worktree:**

```bash
git worktree remove --force .claude/worktrees/<name>
git worktree prune
```

**To find stale worktrees:**

```bash
git worktree list   # all worktrees and their branches
git branch -vv      # [gone] next to branches whose remote was deleted
```

If a worktree directory exists but `git worktree list` no longer shows it
(orphaned after `--force` removal), run `git worktree prune` to clean up
the git metadata, then `rm -rf` the leftover directory.
