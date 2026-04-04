# Code Modification Rules

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
- Deploy auth is keyless and 1Password-backed: `op-firebase-deploy` creates short-lived impersonated credentials from `op://Private/c2v6emkwppjzjjaq2bdqk3wnlm/credential`, another explicit `GOOGLE_APPLICATION_CREDENTIALS` file, or CI-provided external-account credentials.
- The 1Password-first deploy-auth model is a deliberate repository invariant. Do not switch this repo back to ADC-first, routine browser-login, `firebase login`, or long-lived deploy-key auth without explicit human approval.
- Routine deploys and `gcloud` work should not require browser login once the shared 1Password source credential exists. If that credential itself needs rotation, refresh it once and update the 1Password item. If impersonation bindings drift, rerun `op-firebase-setup nathanpaynedotcom`.
- If you add Firebase or third-party API keys later, keep them in ignored config, not in `index.html` or `script.js`.

### Typography
- **Headings / labels:** Cormorant Garamond (serif), weights 400–700.
- **Body / UI:** Inter (sans-serif), weights 300–700.
- Loaded via Google Fonts with `preconnect`.
- Do not change typefaces or add new font loads without explicit discussion.

---

## Project Conventions

### Stack

Vanilla HTML, CSS, and JavaScript — no frameworks, no bundler, no runtime renderer.
Deployed to Firebase Hosting. Pre-generating blog HTML into checked-in static files is acceptable; do not add a bundler or framework unless explicitly asked.

### Files

All source lives at the repo root: `index.html`, `style.css`, `script.js`.
There is no `src/` directory.

### CSS

- Design tokens in `:root` — always use or extend them.
- **Motion system:** All durations use `--motion-fast` / `--motion-hover` / `--motion-plane` / `--motion-load`. All easing uses `--ease-standard` / `--ease-sharp` / `--ease-linear`. Translation magnitude uses `--shift-small` / `--shift-medium`. No hard-coded `ms` values or bare `ease` keywords.
- Panel classes are **color-based** (`panel--red`, `panel--yellow`, `panel--black`, `panel--blue`). They control grid position and color; content is assigned independently via `data-panel`.
- Fluid sizing via `clamp()`; no fixed-breakpoint font overrides.
- Single responsive breakpoint at `max-width: 920px`.
- Respect `prefers-reduced-motion: reduce` — universal `*` selector zeroes all transition/animation durations.
- Use `:focus-visible` (not `:focus`) for keyboard outlines.

### JavaScript

- IIFE-wrapped, strict mode, no globals.
- Vanilla DOM APIs only — no jQuery, no utility libraries.
- Capability detection via `matchMedia`, never user-agent strings.
- Guard analytics calls with `typeof gtag !== 'function'`.

### HTML

- Semantic elements (`<main>`, `<section>`, `<article>`).
- ARIA: `role="region"` + `aria-label` on panels; `aria-hidden="true"` on decorative blocks.
- External links: `target="_blank" rel="noopener"`.
- Inline SVG for icons — no icon fonts or sprite sheets.

### Deployment

- Bump the query-string version (`?v=YYYYMMDD<letter>`) on `style.css` and `script.js` references in `index.html` whenever those files change.
- Deploy with `op-firebase-deploy`. Never run `firebase deploy` directly.
