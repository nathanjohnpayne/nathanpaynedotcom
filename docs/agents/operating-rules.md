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
This is intentional. The site is a small set of static files. Do not introduce a bundler, framework, or package manager unless explicitly asked. There is no `package.json`.

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
