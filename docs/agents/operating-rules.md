# Agent Operating Rules

### Key Design Decisions

#### Mondrian Grid
The `.mondrian` container is a 9-column × 9-row CSS Grid. Odd-numbered tracks are `var(--line)` (9px desktop / 6px mobile) — they render as the black dividing lines of the composition. Even-numbered tracks hold panels and decorative blocks.

When a panel is focused, JavaScript sets `data-focus="<panel-name>"` on the grid container. CSS defines a separate `grid-template-columns` + `grid-template-rows` for each `data-focus` value, and the transition (`--motion-plane: 280ms` with `--ease-sharp`) animates between them.

#### Panel Interaction Model
- **Desktop (hover + fine pointer):** `mouseenter` opens immediately; `mouseleave` schedules close after 120ms to prevent flicker.
- **Keyboard:** `Enter`/`Space` opens; `Escape` closes. `focusin`/`focusout` manage state.
- **Mobile (≤ 920px):** All interactions are disabled. Panels stack vertically with content always visible. The `mobile()` media-query check gates every interaction handler.

#### No Build Step
This is intentional. The site is a small set of static files. Do not introduce a bundler, framework, or runtime renderer unless explicitly asked. Pre-generating blog HTML from `content/blog/*.md` is acceptable because the generated pages are checked into `blog/` and served directly.

### Content-to-Cell Mapping
Panel CSS classes are color-based (controlling grid position and color). Content is assigned to cells independently:

| Cell Class | Color | Position | Content |
|------------|-------|----------|---------|
| `panel--red` | `#c11d19` | top-left (col 2–5, row 2–5) | About / Identity |
| `panel--yellow` | `#d9b111` | top-right (col 6–9, row 2) | Vibe Coding (Projects) |
| `panel--black` | `#090907` | bottom-left (col 2, row 6–9) | Community |
| `panel--blue` | `#223f89` | bottom-right (col 6–9, row 8) | Connect |

Narrative order: **Identity → Work → Community → Contact**

### Coding Conventions

#### HTML
- Semantic elements: `<main>`, `<section>`, `<article>`.
- Every panel uses `role="region"` with a descriptive `aria-label`.
- Decorative blocks use `aria-hidden="true"`.
- External links always get `target="_blank" rel="noopener"`.
- Inline SVG for social icons (no icon library).

#### CSS
- Design tokens live in `:root` — color (`--ink`, `--paper`, `--red`, `--yellow`, `--blue`, `--black`), layout (`--line`, `--su`, `--rule`), and the full motion system (see [Code Modification Rules](code-modification-rules.md)).
- All durations and easing functions must use motion tokens — no hard-coded `ms` values or bare `ease` keywords.
- Use `clamp()` for fluid sizing; avoid fixed breakpoint font overrides.
- Panel classes are **color-based** (`panel--red`, `panel--yellow`, `panel--black`, `panel--blue`), not content-based. They control grid position and color; content is assigned independently via `data-panel`.
- Container queries are used on `.panel--red` for label sizing at small widths.
- Respect `prefers-reduced-motion: reduce` — universally disables all transitions and animations.
- `:focus-visible` for keyboard focus outlines (not `:focus`).

#### JavaScript
- Strict mode, IIFE-wrapped, no globals.
- No external dependencies — vanilla DOM APIs only.
- Use `matchMedia` for capability detection (`canHover()`, `mobile()`), not user-agent sniffing.
- Analytics calls guard on `typeof gtag !== 'function'`.
- Each panel tracks its first `section_view` event once per page load.

### Content Updates

#### Adding a Project
1. Add a new `.project-item` div inside `.project-list` in the **yellow cell** (`panel--yellow`) in `index.html`, following the existing pattern (`.p-head` with `.p-name` + `.p-tag`, then a `<p>` with description and optional `.p-link`).
2. Link the project name to a dedicated detail page at `projects/<slug>/index.html`.
3. Add the project URL to `sitemap.xml`.
4. Reuse the shared `style.css` detail-page patterns unless the user explicitly asks for a new visual system.

#### Adding a Blog Post
1. Create the Markdown source file in `content/blog/<slug>.md` with frontmatter.
2. Run `node scripts/generate-blog.js` to emit `blog/index.html` and `blog/<slug>/index.html`.
3. Add the blog URLs to `sitemap.xml`.
4. If `style.css` changes, bump the shared stylesheet query string anywhere it is referenced.

#### Adding a Social Link
1. Add a new `.social-row` anchor inside `.social-stack` in the **blue cell** (`panel--blue`) in `index.html`.
2. Include an inline SVG icon inside `.s-icon`, a `.s-label` span, and `.s-arrow` span.

#### Updating Bio / Community Content
Edit the relevant `.content-inner` block in `index.html`. About content is in `panel--red`, Community content is in `panel--black`. No other files need changing for text-only updates.

### Analytics
Google Analytics 4 via `gtag.js`, property `G-7C29SRBXB1`. Events:

| Event | Trigger | Parameters |
|-------|---------|------------|
| `section_view` | First hover on a panel | `section_name`, `event_category: "engagement"` |

---

## 1Password CLI authentication failures

If any `op` command (`op read`, `op inject`, `op run`, `op document get`,
or any script that wraps them) fails with a sign-in or authentication
error — including but not limited to:

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
3. **If preflight was already run** but credentials expired (rare —
   only after 1Password locks or the 12-hour hard limit), prompt
   the human and suggest re-running preflight:
   > "Preflight credentials appear to have expired. Could you re-run
   > preflight when you're back? I need to resume the review."
4. **Wait for the human to confirm** they are present and ready before
   re-running preflight (not individual `op read` commands).
5. After confirmation, re-run preflight. If it fails again, report the
   full error output and wait — do not loop.

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
