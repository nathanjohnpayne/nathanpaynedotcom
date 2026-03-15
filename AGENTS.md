# AGENTS.md — nathanpayne.com

Platform-agnostic instructions for AI coding agents working in this repository.

## 1. Repository Overview

### Project Summary
Static personal portfolio and project site for [nathanpayne.com](https://nathanpayne.com). Vanilla HTML + CSS + JavaScript — no frameworks, no build step, no package manager. Deployed to Firebase Hosting.

### Architecture
Homepage plus dedicated static project pages:

| File | Role |
|------|------|
| `index.html` | Homepage markup. Contains homepage SEO meta, Open Graph tags, homepage JSON-LD, inline GA4 snippet, and font preconnects. |
| `projects/<slug>/index.html` | Dedicated project detail pages with project-specific meta, canonicals, and JSON-LD. |
| `style.css` | Shared styles for the Mondrian homepage and the project detail pages. |
| `script.js` | Homepage panel open/close logic, keyboard navigation, hover intent, scroll guard, analytics event tracking. Wrapped in an IIFE. |
| `robots.txt` | Crawl directives for search engines. |
| `sitemap.xml` | Canonical URL inventory for search engines. |

There is no `src/` directory, no transpilation, and no bundler. Files are served as-is by Firebase Hosting.

### File Inventory
```
index.html              Markup + meta
style.css               Styles (homepage, project pages, motion system, responsive, a11y)
script.js               Homepage interactions (panels, keyboard, scroll guard, analytics)
robots.txt              Crawl directives
sitemap.xml             Search-engine URL inventory
projects/               Dedicated static project detail pages
favicon.svg             SVG favicon (red with "NP")
favicon-32x32.png       Rasterized favicon (32px)
apple-touch-icon.png    Apple touch icon (180px)
og-image.png            Primary OG image (2400×1260)
og/                     Platform-specific OG images
firebase.json           Hosting config
.firebaserc             Firebase project alias
inspiration.jpg         Design reference (not deployed)
AGENTS.md               This file
README.md               Human-facing project documentation
DEPLOYMENT.md           Deploy instructions
CONTRIBUTING.md         Contribution guidelines
.ai_context.md          Supplemental AI agent context
rules/                  Repository-level binding constraints
plans/                  Feature rollout and migration plans
specs/                  Feature specifications and acceptance criteria
scripts/ci/             CI enforcement scripts
```

---

## 2. Agent Operating Rules

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
- Design tokens live in `:root` — color (`--ink`, `--paper`, `--red`, `--yellow`, `--blue`, `--black`), layout (`--line`, `--su`, `--rule`), and the full motion system (see Section 3).
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

## 3. Code Modification Rules

### Design Tokens

#### Color
```
--ink:       #11100d    (near-black text)
--paper:     #dde1e5    (light gray blocks)
--red:       #c84430    (token) / #c11d19 (red cell bg)
--yellow:    #ddb84f    (token) / #d9b111 (yellow cell bg)
--blue:      #23488d    (token) / #223f89 (blue cell bg)
--black:     #11100d    (grid bg, black cell)
```

All cells transition to `#e4ded0` (warm parchment) when opened.

#### Layout
```
--line:      9px        (grid line width, 6px on mobile)
--su:        0.42rem    (spacing unit)
--rule:      rgba(17, 16, 13, 0.18)  (divider/border color)
```

#### Motion — Durations
```
--motion-fast:   130ms  (metadata, dividers)
--motion-hover:  170ms  (hover states)
--motion-plane:  280ms  (panel expand / grid morph)
--motion-load:   300ms  (section entrance)
```

#### Motion — Easing
```
--ease-standard: cubic-bezier(0.4, 0.0, 0.2, 1)   (hovers, general interaction)
--ease-sharp:    cubic-bezier(0.2, 0.8, 0.2, 1)    (panel/grid morph)
--ease-linear:   linear                              (metadata, dividers)
```

#### Motion — Magnitude
```
--shift-small:   2px    (hover translation cap)
--shift-medium:  3px    (emphasis translation cap)
```

No scaling, rotation, or bounce is used anywhere in the system.

### Motion System Rules
All animation timing is governed by the motion tokens above. No hard-coded durations or easing functions are permitted.

| Tier | Duration | Easing | Applies to |
|------|----------|--------|------------|
| Metadata / dividers | `--motion-fast` (130ms) | `--ease-linear` | Labels, ribbons, meta text |
| Hover | `--motion-hover` (170ms) | `--ease-standard` | Social rows, icons, arrows, project links |
| Panel morph | `--motion-plane` (280ms) | `--ease-sharp` | Mondrian grid transitions |
| Section load | `--motion-load` (300ms) | `--ease-standard` | Entrance animations |

#### Scroll Guard
JavaScript adds `.is-scrolling` to `<body>` during active scroll (debounced at 100ms). CSS suspends hover transitions on interactive elements while this class is present, preventing scroll + hover easing conflicts.

#### Reduced Motion
`@media (prefers-reduced-motion: reduce)` sets `transition-duration: 0ms` and `animation-duration: 0ms` on all elements (`*`, `*::before`, `*::after`) universally.

### No New Dependencies
Do not introduce npm, bundlers, frameworks, or external libraries. This is intentionally a small, dependency-free static site. Any change requiring new dependencies requires explicit discussion and a `plans/` entry.

### Credential Hygiene
- This repo should not contain API keys, service-account JSON, or ADC credentials. GA Measurement IDs are public identifiers; anything write-capable is not.
- Deploy auth is keyless and 1Password-backed: `op-firebase-deploy` creates short-lived impersonated credentials from `op://Private/GCP ADC/credential`, another explicit `GOOGLE_APPLICATION_CREDENTIALS` file, or CI-provided external-account credentials.
- The 1Password-first deploy-auth model is a deliberate repository invariant. Do not switch this repo back to ADC-first, routine browser-login, `firebase login`, or long-lived deploy-key auth without explicit human approval.
- Routine deploys and `gcloud` work should not require browser login once the shared 1Password source credential exists. If that credential itself needs rotation, refresh it once and update the 1Password item. If impersonation bindings drift, rerun `op-firebase-setup nathanpaynedotcom`.
- If you add Firebase or third-party API keys later, keep them in ignored config, not in `index.html` or `script.js`.

### Typography
- **Headings / labels:** Cormorant Garamond (serif), weights 400–700.
- **Body / UI:** Inter (sans-serif), weights 300–700.
- Loaded via Google Fonts with `preconnect`.
- Do not change typefaces or add new font loads without explicit discussion.

---

## 4. Documentation Rules

- **`AGENTS.md`:** Update when adding new panels, changing the grid system, adding new interaction patterns, or modifying the motion system.
- **`DEPLOYMENT.md`:** Update when the deploy process changes — new commands, credential rotation, new caching rules, or security header changes.
- **`README.md`:** Update when the project description, live URL, or key features change.
- **`rules/repo_rules.md`:** Update when the directory structure changes or new invariants are needed.
- **`.ai_context.md`:** Update when directories are added/removed or external dependencies change.

When asset versions (`?v=`) are bumped, no documentation update is needed — that is a routine deploy step.

---

## 5. Testing Requirements

No automated test framework is in use. This is a static site with no application logic requiring unit tests.

**Manual testing checklist (run before any PR):**

1. All four panels open/close correctly on desktop (hover)
2. Keyboard navigation works: Tab to focus, Enter/Space to open, Escape to close
3. Mobile view (375px): panels stack vertically, content always visible, no interaction handlers fire
4. `prefers-reduced-motion` respected: test in macOS Accessibility settings or Chrome DevTools emulation
5. No console errors in Chrome and Safari
6. OG metadata renders correctly (use a social card preview tool if OG image changed)
7. Cache-bust query strings updated in `index.html` if `style.css` or `script.js` changed
8. Security headers present (check in DevTools → Network → Response Headers)

**When to add automated tests:** If any JavaScript logic is extracted into importable modules, add unit tests for panel state management, hover intent logic, and analytics guards.

---

## 6. Deployment Process

All deploys use `op-firebase-deploy` for non-interactive service account impersonation. Never run `firebase deploy` directly.

```bash
op-firebase-deploy                  # full deploy
op-firebase-deploy --only hosting   # hosting only
```

See `DEPLOYMENT.md` for the 1Password-backed GCP ADC bootstrap, `gcloud` wrapper install, first-time impersonation setup, cache-bust steps, caching rules, security headers, rollback procedure, and secrets management.
