# AGENTS.md

Platform-agnostic instructions for AI coding agents working in this repository.

## Project Summary

Static personal portfolio for [nathanpayne.com](https://nathanpayne.com). Vanilla HTML + CSS + JavaScript — no frameworks, no build step, no package manager. Deployed to Firebase Hosting.

## Architecture

Three source files, all at the repo root:

| File | Role |
|------|------|
| `index.html` | Single-page markup. Contains all SEO meta, Open Graph tags, inline GA4 snippet, and font preconnects. |
| `style.css` | All styles. The Mondrian grid, panel states, typography, responsive breakpoint, accessibility. |
| `script.js` | Panel open/close logic, keyboard navigation, hover intent, scroll guard, analytics event tracking. Wrapped in an IIFE. |

There is no `src/` directory, no transpilation, and no bundler. Files are served as-is by Firebase Hosting.

## Key Design Decisions

### Mondrian Grid

The `.mondrian` container is a 9-column × 9-row CSS Grid. Odd-numbered tracks are `var(--line)` (9px desktop / 6px mobile) — they render as the black dividing lines of the composition. Even-numbered tracks hold panels and decorative blocks.

When a panel is focused, JavaScript sets `data-focus="<panel-name>"` on the grid container. CSS defines a separate `grid-template-columns` + `grid-template-rows` for each `data-focus` value, and the transition (`--motion-plane: 280ms` with `--ease-sharp`) animates between them.

### Panel Interaction Model

- **Desktop (hover + fine pointer):** `mouseenter` opens immediately; `mouseleave` schedules close after 120ms to prevent flicker.
- **Keyboard:** `Enter`/`Space` opens; `Escape` closes. `focusin`/`focusout` manage state.
- **Mobile (≤ 920px):** All interactions are disabled. Panels stack vertically with content always visible. The `mobile()` media-query check gates every interaction handler.

### No Build Step

This is intentional. The site is three files. Do not introduce a bundler, framework, or package manager unless explicitly asked. There is no `package.json`.

## Coding Conventions

### HTML

- Semantic elements: `<main>`, `<section>`, `<article>`.
- Every panel uses `role="region"` with a descriptive `aria-label`.
- Decorative blocks use `aria-hidden="true"`.
- External links always get `target="_blank" rel="noopener"`.
- Inline SVG for social icons (no icon library).

### CSS

- Design tokens live in `:root` — color (`--ink`, `--paper`, `--red`, `--yellow`, `--blue`, `--black`), layout (`--line`, `--su`, `--rule`), and the full motion system (see Motion System section below).
- All durations and easing functions must use motion tokens — no hard-coded `ms` values or bare `ease` keywords.
- Use `clamp()` for fluid sizing; avoid fixed breakpoint font overrides.
- Panel classes are **color-based** (`panel--red`, `panel--yellow`, `panel--black`, `panel--blue`), not content-based. They control grid position and color; content is assigned independently via `data-panel`.
- Container queries are used on `.panel--red` for label sizing at small widths.
- Respect `prefers-reduced-motion: reduce` — universally disables all transitions and animations.
- `:focus-visible` for keyboard focus outlines (not `:focus`).

### JavaScript

- Strict mode, IIFE-wrapped, no globals.
- No external dependencies — vanilla DOM APIs only.
- Use `matchMedia` for capability detection (`canHover()`, `mobile()`), not user-agent sniffing.
- Analytics calls guard on `typeof gtag !== 'function'`.
- Each panel tracks its first `section_view` event once per page load.

## Content-to-Cell Mapping

Panel CSS classes are color-based (controlling grid position and color). Content is assigned to cells independently:

| Cell Class | Color | Position | Content |
|------------|-------|----------|---------|
| `panel--red` | `#c11d19` | top-left (col 2-5, row 2-5) | About / Identity |
| `panel--yellow` | `#d9b111` | top-right (col 6-9, row 2) | Vibe Coding (Projects) |
| `panel--black` | `#090907` | bottom-left (col 2, row 6-9) | Community |
| `panel--blue` | `#223f89` | bottom-right (col 6-9, row 8) | Connect |

Narrative order: **Identity → Work → Community → Contact**

## Design Tokens

### Color

```
--ink:       #11100d    (near-black text)
--paper:     #dde1e5    (light gray blocks)
--red:       #c84430    (token) / #c11d19 (red cell bg)
--yellow:    #ddb84f    (token) / #d9b111 (yellow cell bg)
--blue:      #23488d    (token) / #223f89 (blue cell bg)
--black:     #11100d    (grid bg, black cell)
```

All cells transition to `#e4ded0` (warm parchment) when opened.

### Layout

```
--line:      9px        (grid line width, 6px on mobile)
--su:        0.42rem    (spacing unit)
--rule:      rgba(17, 16, 13, 0.18)  (divider/border color)
```

### Motion — Durations

```
--motion-fast:   130ms  (metadata, dividers)
--motion-hover:  170ms  (hover states)
--motion-plane:  280ms  (panel expand / grid morph)
--motion-load:   300ms  (section entrance)
```

### Motion — Easing

```
--ease-standard: cubic-bezier(0.4, 0.0, 0.2, 1)   (hovers, general interaction)
--ease-sharp:    cubic-bezier(0.2, 0.8, 0.2, 1)    (panel/grid morph)
--ease-linear:   linear                              (metadata, dividers)
```

### Motion — Magnitude

```
--shift-small:   2px    (hover translation cap)
--shift-medium:  3px    (emphasis translation cap)
```

No scaling, rotation, or bounce is used anywhere in the system.

## Motion System

All animation timing is governed by the motion tokens above. No hard-coded durations or easing functions are permitted.

### Motion Hierarchy

| Tier | Duration | Easing | Applies to |
|------|----------|--------|------------|
| Metadata / dividers | `--motion-fast` (130ms) | `--ease-linear` | Labels, ribbons, meta text |
| Hover | `--motion-hover` (170ms) | `--ease-standard` | Social rows, icons, arrows, project links |
| Panel morph | `--motion-plane` (280ms) | `--ease-sharp` | Mondrian grid transitions |
| Section load | `--motion-load` (300ms) | `--ease-standard` | Entrance animations |

### Scroll Guard

JavaScript adds `.is-scrolling` to `<body>` during active scroll (debounced at 100ms). CSS suspends hover transitions on interactive elements while this class is present, preventing scroll + hover easing conflicts.

### Reduced Motion

`@media (prefers-reduced-motion: reduce)` sets `transition-duration: 0ms` and `animation-duration: 0ms` on all elements (`*`, `*::before`, `*::after`) universally.

## Typography

- **Headings / labels:** Cormorant Garamond (serif), weights 400–700.
- **Body / UI:** Inter (sans-serif), weights 300–700.
- Loaded via Google Fonts with `preconnect`.

## Deployment

All deploys use `op-firebase-deploy` (global script on PATH) for non-interactive 1Password auth. No `firebase login` or browser prompts needed.

```bash
op-firebase-deploy                  # full deploy
op-firebase-deploy --only hosting   # hosting only
```

The script reads ADC credentials from 1Password (`Private/GCP ADC`), auto-detects the project from `.firebaserc`, and cleans up credentials on exit.

`op-firebase-deploy` checks `Private/Firebase Deploy - nathanpaynedotcom` first, then falls back to `Private/GCP ADC`.

**First-time setup:** `op-firebase-setup nathanpaynedotcom` creates `firebase-deployer@nathanpaynedotcom.iam.gserviceaccount.com`, grants deploy roles, and stores the key in 1Password.

**Token renewal:** The ADC refresh token has no fixed expiry but is revoked on Google password change, explicit revocation, or 6 months of inactivity. If deploys fail with `invalid_grant`, renew:

```bash
gcloud auth application-default login --project=nathanpaynedotcom
op item edit "GCP ADC" --vault Private \
  "credential=$(cat ~/.config/gcloud/application_default_credentials.json)"
```

- Firebase project ID: `nathanpaynedotcom` (defined in `.firebaserc`).
- Public directory is `.` (repo root).
- `README.md`, dotfiles, `*.sh`, and `node_modules` are excluded from deploy via `firebase.json` ignore rules.

### Credential Hygiene And Rotation

- This repo should not contain API keys, service-account JSON, or ADC credentials. Google Analytics measurement IDs are public identifiers; anything write-capable is not.
- If the `Private/GCP ADC` credential is exposed, rerun `gcloud auth application-default login --project=nathanpaynedotcom`, update the 1Password item, then revoke the old Google credential.
- If you add Firebase or third-party API keys later, keep them in ignored config or the hosting platform, not in `index.html` or `script.js`. Publicly committed keys still create abuse and alerting risk even when they are browser-scoped.
- If a future API or service needs secrets, commit only template files with `op://Private/<item>/<field>` references and resolve them with `op inject` into a gitignored runtime file during deploy.

### Cache Busting

Assets are versioned via query strings: `style.css?v=20260228j`, `script.js?v=20260228j`. Bump the version string (date + letter suffix) on every deploy that changes CSS or JS.

OG images use a separate version string and are cached immutably for 1 year.

### Caching Rules

| Pattern | TTL |
|---------|-----|
| `og-image.png`, `/og/**` | 1 year (immutable) |
| `**/*.js`, `**/*.css` | 1 hour |
| `**/*.html` | 1 hour |

### Security Headers

Applied globally: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-XSS-Protection: 1; mode=block`.

## Content Updates

### Adding a Project

1. Add a new `.project-item` div inside `.project-list` in the **yellow cell** (`panel--yellow`) in `index.html`, following the existing pattern (`.p-head` with `.p-name` + `.p-tag`, then a `<p>` with description and optional `.p-link`).
2. No CSS changes needed — the project list is a flex column.

### Adding a Social Link

1. Add a new `.social-row` anchor inside `.social-stack` in the **blue cell** (`panel--blue`) in `index.html`.
2. Include an inline SVG icon inside `.s-icon`, a `.s-label` span, and `.s-arrow` span.

### Updating Bio / Community Content

Edit the relevant `.content-inner` block in `index.html`. About content is in `panel--red`, Community content is in `panel--black`. No other files need changing for text-only updates.

## Analytics

Google Analytics 4 via `gtag.js`, property `G-7C29SRBXB1`. Events:

| Event | Trigger | Parameters |
|-------|---------|------------|
| `section_view` | First hover on a panel | `section_name`, `event_category: "engagement"` |

## File Inventory

```
index.html              Markup + meta
style.css               Styles (grid, panels, motion system, responsive, a11y)
script.js               Interactions (panels, keyboard, scroll guard, analytics)
favicon.svg             SVG favicon (red with "NP")
og-image.png            Primary OG image (2400×1260)
og/                     Platform-specific OG images
firebase.json           Hosting config
.firebaserc             Firebase project alias
inspiration.jpg         Design reference (not deployed)
AGENTS.md               This file
README.md               Human-facing project documentation
```
