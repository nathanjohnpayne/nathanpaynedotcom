# nathanpayne.com

Personal portfolio site for Nathan Payne — a static, single-page site built with vanilla HTML, CSS, and JavaScript. No frameworks, no build step, no dependencies.

**Live:** [nathanpayne.com](https://nathanpayne.com)

---

## Design

The layout is a **Mondrian-inspired grid** — four colored panels arranged in a geometric composition that animates when a panel receives focus.

| Panel | Color | Content |
|-------|-------|---------|
| About | Red `#c11d19` | Bio and role at The Walt Disney Company |
| Connect | Yellow `#d9b111` | Social links (LinkedIn, Instagram, Threads, Bluesky, X) |
| Vibe Coding | Black `#090907` | Side-project showcase |
| Community | Blue `#223f89` | Fundraising and community organizing |

On desktop, hovering or focusing a panel triggers a CSS Grid transition that expands it and reveals its content. On mobile (≤ 920px), panels stack vertically with all content visible.

### Typography

- **Headings:** [Cormorant Garamond](https://fonts.google.com/specimen/Cormorant+Garamond) (serif)
- **Body:** [Inter](https://fonts.google.com/specimen/Inter) (sans-serif)
- Sizes use `clamp()` for fluid responsive scaling.

---

## Project Structure

```
.
├── index.html          # Single-page markup, SEO meta, OG tags
├── style.css           # All styles — grid layout, panels, responsive, a11y
├── script.js           # Panel interactions, keyboard nav, analytics events
├── og-image.png        # Primary Open Graph image (2400×1260)
├── og/                 # Platform-specific OG images
│   ├── og_imessage_1200x1200.png
│   ├── og_linkedin_1200x627.png
│   └── og_slack_1280x640.png
├── firebase.json       # Firebase Hosting config (headers, rewrites, caching)
├── .firebaserc         # Firebase project alias
└── inspiration.jpg     # Visual reference (not deployed)
```

---

## How It Works

### Grid System (`style.css`)

The `.mondrian` container uses a 9-column × 9-row CSS Grid where alternating tracks are `var(--line)` (9px on desktop, 6px on mobile) to simulate Mondrian-style black dividing lines. When a panel opens, the grid's `grid-template-columns` and `grid-template-rows` transition to new proportions using a `data-focus` attribute on the grid container — giving the active panel more space.

Each panel state (`data-focus="about"`, `"connect"`, `"projects"`, `"community"`) has its own grid template defined in CSS.

### Interactions (`script.js`)

- **Desktop:** `mouseenter` opens a panel; `mouseleave` schedules a close after 120ms (to avoid flicker when moving between panels).
- **Keyboard:** `Enter`/`Space` opens; `Escape` closes. Focus management preserves tab order.
- **Mobile:** Interactions are disabled — all panels are expanded by default in the stacked layout.
- **Analytics:** First hover on each panel fires a `section_view` event to Google Analytics (`gtag`).

### Responsive Behavior

At `max-width: 920px`, the grid collapses to a single-column stack:
- Decorative blocks are hidden
- Panel labels are hidden
- All panel content is visible (no open/close interaction)
- Grid transitions are disabled

### Accessibility

- Panels use `role="region"` with `aria-label`
- Decorative blocks are `aria-hidden="true"`
- `tabindex="0"` on panels for keyboard focus
- `:focus-visible` outlines on panels and links
- `prefers-reduced-motion: reduce` disables grid transitions

---

## Development

No build tools are required. Edit the files directly and preview in a browser.

```bash
# Serve locally (any static server works)
npx serve .

# Or use Python
python3 -m http.server 8000
```

### Cache Busting

Static assets use query-string versioning (e.g., `style.css?v=20260223a`). Bump the version string when deploying changes to CSS or JS.

---

## Deployment

The site is hosted on [Firebase Hosting](https://firebase.google.com/docs/hosting).

```bash
# Install Firebase CLI (once)
npm install -g firebase-tools

# Authenticate (once)
firebase login

# Deploy
firebase deploy
```

### Firebase Configuration

Defined in `firebase.json`:

- **Public directory:** `.` (root — no build output folder)
- **SPA rewrite:** All routes rewrite to `/index.html`
- **Caching:**
  - OG images: 1 year, immutable
  - JS/CSS: 1 hour
  - HTML: 1 hour
- **Security headers:** `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`
- **Ignored on deploy:** `firebase.json`, dotfiles, `node_modules`, `*.sh`, `README.md`

---

## SEO & Social

- Open Graph and Twitter Card meta tags in `<head>`
- Canonical URL set to `https://nathanpayne.com/`
- Platform-specific OG images in `/og/` for optimal rendering on iMessage, LinkedIn, and Slack
- Google Analytics 4 via `gtag.js` (property `G-7C29SRBXB1`)
