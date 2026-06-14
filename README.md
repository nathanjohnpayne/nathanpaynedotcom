# nathanpayne.com

Personal portfolio, project, and blog site for Nathan Payne—a static site built with [Astro](https://astro.build). Deployed to Firebase Hosting.

**Live:** [nathanpayne.com](https://nathanpayne.com)

---

## Design

The layout is a **Mondrian-inspired grid**—four colored panels arranged in a geometric composition that animates when a panel receives focus.

| Cell | Color | Content |
|------|-------|---------|
| Red | `#c11d19` | About—bio and role at The Walt Disney Company |
| Yellow | `#d9b111` | Builds—side-project showcase |
| Black | `#090907` | Community—fundraising and organizing |
| Blue | `#223f89` | Connect—social links (LinkedIn, Instagram, Threads, Bluesky, X) |

Narrative order: **Identity → Work → Community → Contact**

On desktop, hovering or focusing a panel triggers a CSS Grid transition that expands it and reveals its content. On mobile (≤ 920px), panels stack vertically with all content visible.

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--ink` | `#11100d` | Default text, grid background |
| `--paper` | `#ffffff` | White background |
| `--red` | `#c11d19` | Red cell background |
| `--yellow` | `#d9b111` | Yellow cell background |
| `--blue` | `#223f89` | Blue cell background |
| `--cream` | `#f5f0e4` | Light background |

### Typography

- **Headings / labels:** [Cormorant Garamond](https://fonts.google.com/specimen/Cormorant+Garamond) (serif, weights 400–700)
- **Body / UI:** [Inter](https://fonts.google.com/specimen/Inter) (sans-serif, weights 300–700)
- Sizes use `clamp()` for fluid responsive scaling—no fixed breakpoint font overrides.

---

## Project Structure

```
.
├── astro.config.mjs                # Astro configuration (site, integrations, markdown)
├── tsconfig.json                   # TypeScript config (extends astro/tsconfigs/strict)
├── package.json                    # Dependencies and scripts
├── firebase.json                   # Firebase Hosting config (cache, security headers)
├── src/
│   ├── pages/
│   │   ├── index.astro             # Homepage (Mondrian grid)
│   │   ├── 404.astro               # Error page
│   │   ├── rss.xml.ts              # RSS feed endpoint
│   │   ├── blog/
│   │   │   ├── index.astro         # Blog listing
│   │   │   └── [slug].astro        # Dynamic blog post pages
│   │   ├── projects/               # Project detail pages
│   │   └── og-templates/           # OG image templates (build-time only)
│   ├── layouts/
│   │   ├── BaseLayout.astro        # Base wrapper (meta, SEO, structure)
│   │   ├── BlogPost.astro          # Blog post layout
│   │   ├── ProjectLayout.astro     # Project page layout
│   │   └── OgCard.astro            # OG image card template
│   ├── content/
│   │   └── blog/*.md               # Markdown blog posts with frontmatter
│   ├── content.config.ts           # Content Collections schema (Zod)
│   ├── styles/
│   │   └── global.css              # Global styles (tokens, grid, motion, responsive)
│   ├── plugins/
│   │   ├── remark-mermaid.mjs      # Mermaid diagram support
│   │   └── rehype-figure-captions.mjs  # Auto-numbered figure captions
│   └── integrations/
│       ├── og-images.mjs           # Build-time OG image generation (Playwright)
│       └── robots-sitemap.mjs      # Auto-sync robots.txt Sitemap: URL with dist/ output
├── public/
│   ├── favicon.svg                 # SVG favicon (red with "NP")
│   ├── robots.txt                  # Crawl directives
│   └── fonts/og/                   # Self-hosted fonts for OG rendering
├── dist/                           # Build output (gitignored)
├── tests/                          # Vitest + Playwright tests
├── specs/                          # Feature specifications
├── AGENTS.md                       # AI agent instructions
├── REVIEW_POLICY.md                # Multi-identity review workflow
└── DEPLOYMENT.md                   # Deploy instructions
```

---

## How It Works

### Grid System

The homepage uses a **9-column × 9-row CSS Grid** (defined in `src/styles/global.css`). Odd-numbered tracks are `var(--line)` (9px desktop / 6px mobile)—they render as the black dividing lines of the Mondrian composition. Even-numbered tracks hold panels and decorative blocks.

When a panel is focused, JavaScript sets `data-focus="<panel-name>"` on the grid container. CSS defines a separate `grid-template-columns` + `grid-template-rows` for each `data-focus` value, and the grid transitions between them over 280ms with a sharp easing curve (`--ease-sharp`).

### Homepage Interactions

- **Desktop (hover + fine pointer):** `mouseenter` opens a panel; `mouseleave` schedules close after 120ms to prevent flicker when moving between panels.
- **Keyboard:** `Enter`/`Space` opens a panel; `Escape` closes it. `focusin`/`focusout` manage state so tabbing through links inside a panel keeps it open.
- **Mobile (≤ 920px):** All interaction handlers exit early. Panels are always expanded.
- **Scroll guard:** A debounced scroll listener adds `.is-scrolling` to `<body>` during active scroll. CSS suspends hover transitions while this class is present.
- **Analytics:** First hover on each panel fires a one-time `section_view` event to Google Analytics via `gtag`.

### Blog

Blog posts are authored as Markdown files in `src/content/blog/` with Zod-validated frontmatter (defined in `src/content.config.ts`). Astro's Content Collections API provides type-safe access to the content. Posts support:

- **Pullquotes**—accent-colored sidebar cards
- **Sidebar content**—Mermaid diagrams, images, and text blocks
- **Code syntax highlighting**—via Shiki with CSS variable theming
- **Figure captions**—auto-numbered via custom Rehype plugin
- **Mermaid diagrams**—rendered client-side via CDN

### OG Images

OG images are generated at build time by a custom Astro integration (`src/integrations/og-images.mjs`). It uses Playwright to screenshot HTML templates at 1200×630 with 2× device scale factor. Templates live in `src/pages/og-templates/` and are removed from the final build output.

Every built page's `og:image` / `twitter:image` / `og:image:secure_url` URL is cross-checked against the real files in `dist/og/` by `tests/og-image-targets.test.js` at `npm test` time. If a page references an image that doesn't exist in the build output, the test fails with the offending page path, tag, and expected file location—the exact class of bug investigated in #163.

### robots.txt and Sitemap

The `Sitemap:` line in `dist/robots.txt` is rewritten at build time by `src/integrations/robots-sitemap.mjs` to match the real filename `@astrojs/sitemap` produces (`sitemap-index.xml` by default). The hand-authored line in `public/robots.txt` is a template; the integration scans `dist/` for the actual sitemap, strips any existing `Sitemap:` directives, and appends a fresh one. If no sitemap exists in `dist/`, the build fails loudly rather than silently shipping a broken `robots.txt`.

`tests/robots-sitemap.test.js` runs after `astro build` as a post-build assertion suite and verifies that the declared sitemap URL resolves to a real file in `dist/`. `tests/robots-sitemap-integration.test.js` unit-tests the integration against a fake `dist/` directory. Between them, any future drift between the declared `Sitemap:` URL and the real build output is caught at `npm test` time instead of in production.

This pipeline was built in response to #163, where a hand-authored `Sitemap: https://nathanpayne.com/sitemap.xml` declaration pointed at a URL that returned 404 because `@astrojs/sitemap` generated `sitemap-index.xml` instead. Google Search Console read the broken declaration, couldn't fetch the sitemap, and left the site unindexed.

### Project Pages

Each project has a dedicated detail page under `src/pages/projects/` with project-specific meta, canonicals, Open Graph tags, and JSON-LD.

### Motion System

All animation timing is governed by design tokens in `:root`—no hard-coded durations or easing functions.

| Tier | Token | Duration | Easing | Applies to |
|------|-------|----------|--------|------------|
| Metadata / dividers | `--motion-fast` | 130ms | `--ease-linear` | Labels, ribbons, meta text |
| Hover | `--motion-hover` | 170ms | `--ease-standard` | Social rows, icons, arrows, links |
| Panel morph | `--motion-plane` | 280ms | `--ease-sharp` | Mondrian grid transitions |
| Section load | `--motion-load` | 300ms | `--ease-standard` | Entrance animations |

Translation magnitude is capped at `--shift-small` (2px) for hovers and `--shift-medium` (3px) for emphasis. No scaling, rotation, or bounce.

### Responsive Behavior

At `max-width: 920px`:
- Grid collapses to single-column
- Decorative blocks are hidden
- Panel content is always visible—no hover interaction on mobile
- Grid transitions are disabled

### Accessibility

- Panels use `role="region"` with descriptive `aria-label`
- Decorative blocks are `aria-hidden="true"`
- `tabindex="0"` on `.panel-label` controls for keyboard focus
- `:focus-visible` outlines on panels and links (not `:focus`)
- `prefers-reduced-motion: reduce` universally disables all transitions and animations

---

## Development

```bash
# Install dependencies
npm install

# Start Astro dev server (with HMR)
npm run dev

# Build for production
npm run build

# Preview the production build locally
npm run preview

# Run tests
npm run test          # astro build && vitest run
npm run test:e2e      # playwright test
```

---

## Deployment

The site is hosted on [Firebase Hosting](https://firebase.google.com/docs/hosting). Firebase project ID: `nathanpaynedotcom`.

```bash
# Build first
npm run build

# Deploy (uses 1Password-backed credentials)
op-firebase-deploy
```

`op-firebase-deploy` creates a short-lived impersonated credential for `firebase-deployer@nathanpaynedotcom.iam.gserviceaccount.com` from a 1Password-backed GCP ADC source credential. No routine browser login is needed. See [`DEPLOYMENT.md`](DEPLOYMENT.md) for full setup, credential bootstrap, and rollback procedures.

### Firebase Configuration

Defined in `firebase.json`:

| Setting | Value |
|---------|-------|
| Public directory | `dist` (Astro build output) |
| OG image cache | 24 hours |
| JS/CSS cache | 1 hour |
| HTML cache | 1 hour |
| Security headers | `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection` |

---

## SEO & Social

- **Open Graph + Twitter Card** meta tags with build-time generated OG images per page. Every built page's `og:image` / `twitter:image` URL is verified to resolve to a real file in `dist/` at `npm test` time by `tests/og-image-targets.test.js`.
- **Canonical URLs** on all pages
- **JSON-LD** structured data (homepage profile, project pages)
- **Sitemap** auto-generated by `@astrojs/sitemap` at `/sitemap-index.xml`
- **`robots.txt`** source in `public/`; the `Sitemap:` line is rewritten at build time by `src/integrations/robots-sitemap.mjs` to match the real sitemap filename. Covered by `tests/robots-sitemap.test.js` and `tests/robots-sitemap-integration.test.js`. See the [robots.txt and Sitemap](#robotstxt-and-sitemap) section for full context.
- **RSS feed** at `/rss.xml` (via `@astrojs/rss`)
- **Google Analytics 4** via `gtag.js` (property env-injected via `PUBLIC_GA_MEASUREMENT_ID`, never hardcoded)

---

## AI Agent Docs

See [`AGENTS.md`](AGENTS.md) for detailed, platform-agnostic instructions for AI coding agents—including architecture decisions, coding conventions, content update patterns, and the complete design token reference.
