# nathanpayne.com

Personal portfolio site for Nathan Payne — a static, single-page site built with vanilla HTML, CSS, and JavaScript. No frameworks, no build step, no dependencies.

**Live:** [nathanpayne.com](https://nathanpayne.com)

---

## Design

The layout is a **Mondrian-inspired grid** — four colored panels arranged in a geometric composition that animates when a panel receives focus.

| Cell | Color | Content |
|------|-------|---------|
| `panel--red` | Red `#c11d19` | About — bio and role at The Walt Disney Company |
| `panel--yellow` | Yellow `#d9b111` | Vibe Coding — side-project showcase |
| `panel--black` | Black `#090907` | Community — fundraising and organizing |
| `panel--blue` | Blue `#223f89` | Connect — social links (LinkedIn, Instagram, Threads, Bluesky, X) |

Narrative order: **Identity → Work → Community → Contact**

On desktop, hovering or focusing a panel triggers a CSS Grid transition that expands it and reveals its content. On mobile (≤ 920px), panels stack vertically with all content visible.

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--ink` | `#11100d` | Default text, grid background |
| `--paper` | `#dde1e5` | Decorative white blocks |
| `--red` | `#c84430` | Design token (about panel uses `#c11d19`) |
| `--yellow` | `#ddb84f` | Design token (yellow cell uses `#d9b111`) |
| `--blue` | `#23488d` | Design token (blue cell uses `#223f89`) |
| Open bg | `#e4ded0` | All panels when expanded |

### Typography

- **Headings / labels:** [Cormorant Garamond](https://fonts.google.com/specimen/Cormorant+Garamond) (serif, weights 400–700)
- **Body / UI:** [Inter](https://fonts.google.com/specimen/Inter) (sans-serif, weights 300–700)
- Sizes use `clamp()` for fluid responsive scaling — no fixed breakpoint font overrides.

---

## Project Structure

```
.
├── index.html                      # Single-page markup, SEO meta, OG tags
├── style.css                       # All styles — grid, panels, motion system, responsive, a11y
├── script.js                       # Panel interactions, keyboard nav, scroll guard, analytics
├── favicon.svg                     # SVG favicon (red with "NP")
├── og-image.png                    # Primary Open Graph image (2400×1260)
├── og/                             # Platform-specific OG images
│   ├── og_imessage_1200x1200.png
│   ├── og_linkedin_1200x627.png
│   └── og_slack_1280x640.png
├── firebase.json                   # Firebase Hosting config
├── .firebaserc                     # Firebase project alias
├── inspiration.jpg                 # Visual reference (not deployed)
├── AGENTS.md                       # AI agent instructions (platform-agnostic)
├── README.md                       # This file
└── .cursor/rules/                  # Cursor IDE conventions
    └── project-conventions.mdc
```

---

## How It Works

### Grid System (`style.css`)

The `.mondrian` container uses a **9-column × 9-row CSS Grid**. Odd-numbered tracks are `var(--line)` (9px desktop / 6px mobile) — they render as the black dividing lines of the Mondrian composition. Even-numbered tracks hold panels and decorative blocks.

When a panel is focused, JavaScript sets `data-focus="<panel-name>"` on the grid container. CSS defines a separate `grid-template-columns` + `grid-template-rows` for each `data-focus` value, and the grid transitions between them over 280ms with a sharp easing curve (`--ease-sharp`).

Panel grid placements:

| Cell | Column | Row | Content |
|------|--------|-----|---------|
| `panel--red` | 2 / 5 | 2 / 5 | About |
| `panel--yellow` | 6 / 9 | 2 | Vibe Coding |
| `panel--black` | 2 | 6 / 9 | Community |
| `panel--blue` | 6 / 9 | 8 | Connect |

### Interactions (`script.js`)

The script is a single IIFE with no external dependencies.

- **Desktop (hover + fine pointer):** `mouseenter` opens a panel; `mouseleave` schedules close after 120ms to prevent flicker when moving between panels.
- **Keyboard:** `Enter`/`Space` opens a panel; `Escape` closes it. `focusin`/`focusout` manage state so tabbing through links inside a panel keeps it open.
- **Click:** Opens a panel on click, but passes through if the click target is a link.
- **Mobile:** All interaction handlers exit early when `matchMedia('(max-width: 920px)')` matches. Panels are always expanded.
- **Scroll guard:** A debounced scroll listener (100ms) adds `.is-scrolling` to `<body>` during active scroll. CSS suspends hover transitions while this class is present, preventing scroll + hover easing conflicts.
- **Analytics:** First hover on each panel fires a one-time `section_view` event to Google Analytics via `gtag`.

### Motion System

All animation timing is governed by design tokens in `:root` — no hard-coded durations or easing functions.

| Tier | Token | Duration | Easing | Applies to |
|------|-------|----------|--------|------------|
| Metadata / dividers | `--motion-fast` | 130ms | `--ease-linear` | Labels, ribbons, meta text |
| Hover | `--motion-hover` | 170ms | `--ease-standard` | Social rows, icons, arrows, links |
| Panel morph | `--motion-plane` | 280ms | `--ease-sharp` | Mondrian grid transitions |
| Section load | `--motion-load` | 300ms | `--ease-standard` | Entrance animations |

Translation magnitude is capped at `--shift-small` (2px) for hovers and `--shift-medium` (3px) for emphasis. No scaling, rotation, or bounce.

### Responsive Behavior

At `max-width: 920px`:
- Grid collapses to single-column (`var(--line) 1fr var(--line)`)
- Decorative blocks are `display: none`
- Panel labels are hidden; all `.panel-content` is visible
- Grid transitions are disabled
- All panels display content directly — no hover interaction on mobile

### Accessibility

- Panels use `role="region"` with descriptive `aria-label`
- Decorative blocks are `aria-hidden="true"`
- `tabindex="0"` on panels for keyboard focus
- `:focus-visible` outlines on panels and links (not `:focus`)
- `prefers-reduced-motion: reduce` universally disables all transitions and animations
- Container queries on `.panel--red` adjust label sizing at small widths

---

## Development

No build tools are required. Edit the three source files directly and preview in a browser.

```bash
# Serve locally (any static server works)
npx serve .

# Or use Python
python3 -m http.server 8000
```

### Cache Busting

Static assets use query-string versioning (e.g., `style.css?v=20260228j`). Bump the version string — formatted as `YYYYMMDD` + a letter suffix — when deploying changes to CSS or JS. Update both the `<link>` and `<script>` tags in `index.html`.

OG images have their own version strings and are cached with immutable headers.

---

## Deployment

The site is hosted on [Firebase Hosting](https://firebase.google.com/docs/hosting). Firebase project ID: `nathanpaynedotcom`.

```bash
# Install deploy tooling (once)
npm install -g firebase-tools
# Install the 1Password desktop app and 1Password CLI (`op`)
# Install Google Cloud SDK if gcloud is not already available

# One-time per maintainer/project
op-firebase-setup nathanpaynedotcom

# Deploy
op-firebase-deploy
```

`op-firebase-deploy` reads `Private/Firebase Deploy - nathanpaynedotcom` first and falls back to `Private/GCP ADC`.

### Firebase Configuration

Defined in `firebase.json`:

| Setting | Value |
|---------|-------|
| Public directory | `.` (repo root) |
| SPA rewrite | All routes → `/index.html` |
| OG image cache | 1 year, immutable |
| JS/CSS cache | 1 hour |
| HTML cache | 1 hour |
| Security headers | `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection` |
| Ignored on deploy | `firebase.json`, dotfiles, `node_modules`, `*.sh`, `README.md` |

### Credential Hygiene

- This site does not need Firebase client config today, and the repo should not contain API keys, service-account JSON, or ADC credentials.
- Google Analytics measurement IDs are public identifiers; anything write-capable is not. If you add Firebase or third-party API keys later, keep them in ignored config or hosting settings, not in `index.html` or `script.js`.
- If the deploy credential stored in `Private/GCP ADC` is exposed, rerun `gcloud auth application-default login --project=nathanpaynedotcom`, overwrite the 1Password item, and revoke the old Google credential.
- For future APIs or services, commit only template files with `op://Private/<item>/<field>` references and resolve them into gitignored runtime files with `op inject`.

---

## SEO & Social

- **Open Graph + Twitter Card** meta tags in `<head>` with 2400×1260 image
- **Canonical URL:** `https://nathanpayne.com/`
- **Platform-specific OG images** in `/og/` for iMessage (1200×1200), LinkedIn (1200×627), and Slack (1280×640)
- **Google Analytics 4** via `gtag.js` (property `G-7C29SRBXB1`)

---

## AI Agent Docs

See [`AGENTS.md`](AGENTS.md) for detailed, platform-agnostic instructions for AI coding agents — including architecture decisions, coding conventions, content update patterns, and the complete design token reference.
