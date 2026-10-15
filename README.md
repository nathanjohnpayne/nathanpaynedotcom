# nathanpayne.com

Personal portfolio, project, and blog site for Nathan Payne—a static site built with [Astro](https://astro.build). Deployed to Firebase Hosting.

**Live:** [nathanpayne.com](https://nathanpayne.com)

**Owner's manual:** step-by-step guides for editing posts, projects, the homepage, and the résumé, plus previewing, publishing, deploying, and reading analytics, live in the private docs vault: [nathanpaynedotcom owner's manual](https://github.com/nathanjohnpayne/docs/blob/9284108e3f8275c3d79e54e302199f207f1c5d41/projects/nathanpaynedotcom/owners-manual/README.md). This README stays the technical overview.

---

## Design

The layout is a **Mondrian-inspired grid**—four colored panels arranged in a geometric composition that animates when a panel receives focus.

| Cell | Token / Homepage Value | Content |
|------|------------------------|---------|
| Red | `var(--red)` / `#da2418` | About—bio, current context, writing, and resume link |
| Yellow | `var(--yellow)` / `#f0c800` | Projects—side-project showcase |
| Black | `var(--black)` / `#11100d` | Community—fundraising and organizing |
| Blue | `var(--blue)` / `#0a5c9e` | Connect—social links (LinkedIn, GitHub, Bluesky, Instagram, Threads, X) |

Narrative order: **Identity → Work → Community → Contact**

On desktop, hovering or focusing a panel triggers a CSS Grid transition that expands it and reveals its content. In stack mode—any viewport under 1024px wide or under 840px tall, so phones, tablets, and short desktop windows—panels stack vertically with all content visible.

### Color Palette

The default 1921 register lives in `:root`; the homepage opts into a higher-chroma 1930 register with `dataPalette="1930"`.

| Token | 1921 Default | Homepage 1930 Override | Usage |
|-------|--------------|------------------------|-------|
| `--ink` | `#11100d` | same | Default text, grid background |
| `--paper` | `#ffffff` | same | White background |
| `--red` | `#e8784a` | `#da2418` | Red plane |
| `--yellow` | `#e3d477` | `#f0c800` | Yellow plane |
| `--blue` | `#2080ca` | `#0a5c9e` | Blue plane |
| `--cream` | `#f5f0e4` | same | Light background |

### Typography

- **Headings / labels:** Cormorant Garamond (serif), static weights 400, 500, 600, and 700 plus italic 400 and 600
- **Body / UI:** Inter (sans-serif), static weights 400, 500, 600, and 700
- Both families are self-hosted as woff2 in `public/fonts/site/` (SIL OFL; the license texts are `public/fonts/OFL-*.txt`), built from pinned upstream sources by `scripts/fonts/build-site-fonts.py`. Pages never contact Google Fonts. The [Cormorant Garamond](https://fonts.google.com/specimen/Cormorant+Garamond) and [Inter](https://fonts.google.com/specimen/Inter) specimen pages are a visual reference only, not the source of the served files.
- Sizes use `clamp()` for fluid responsive scaling—no fixed breakpoint font overrides.

---

## Project Structure

```
.
├── astro.config.mjs                # Astro configuration (site, integrations, markdown)
├── tsconfig.json                   # TypeScript config (extends astro/tsconfigs/strict)
├── package.json                    # Dependencies and scripts
├── .env.example                    # Public client env variable template
├── firebase.json                   # Firebase Hosting config (cache, security headers)
├── src/
│   ├── pages/
│   │   ├── index.astro             # Homepage (Mondrian grid)
│   │   ├── 404.astro               # Error page
│   │   ├── resume.astro            # Resume page
│   │   ├── rss.xml.ts              # RSS feed endpoint
│   │   ├── blog/
│   │   │   ├── index.astro         # Blog listing
│   │   │   └── [...slug].astro     # Dynamic blog post pages, including nested paths
│   │   ├── projects/               # Project index + dynamic project detail pages
│   │   └── og-templates/           # OG image templates (build-time only)
│   ├── components/
│   │   └── resume/                 # Resume section components and logo helper
│   ├── layouts/
│   │   ├── BaseLayout.astro        # Base wrapper (meta, SEO, structure)
│   │   ├── BlogPost.astro          # Blog post layout
│   │   ├── ProjectLayout.astro     # Project page layout
│   │   └── OgCard.astro            # OG image card template
│   ├── content/
│   │   ├── blog/**/*.md            # Markdown blog posts with frontmatter (nested folders become URL segments)
│   │   ├── projects/**/*.{md,mdx}  # Project content collection
│   │   ├── {bio,myself,experience,education,skills,certifications,resume}/
│   │   │                           # Active resume and homepage content collections
│   │   ├── site-copy/*.md          # Shared page/publication descriptions (home, blog, projects, resume, privacy, book, brand)
│   │   ├── booking/*.md            # Public Cal.com event types the /book/ page lists
│   │   └── awards/                 # Dormant scaffold; restore collection wiring with first entry
│   ├── content.config.ts           # Content Collections schema (Zod)
│   ├── styles/
│   │   └── global.css              # Global styles (tokens, grid, motion, responsive)
│   ├── plugins/
│   │   ├── remark-mermaid.mjs      # Mermaid metadata contract
│   │   ├── rehype-mermaid-accessibility.mjs # Accessible rendering adapter
│   │   ├── rehype-figure-captions.mjs  # Wraps standalone images in <figure> with a caption from alt text
│   │   └── rehype-figure-numbers.mjs   # Numbers images and Mermaid diagrams in one sequence
│   └── integrations/
│       ├── og-images.mjs           # Build-time OG image generation (Playwright); also prints the résumé PDF
│       ├── resume-pdf.mjs          # Résumé PDF generator, called from og-images.mjs
│       └── robots-sitemap.mjs      # Auto-sync robots.txt Sitemap: URL with dist/ output
├── public/
│   ├── favicon.svg                 # The NP mark (copy of images/brand/np-mark.svg); served, not linked
│   ├── favicon.ico                 # 16 (tile), 32, 48 favicon (copy of images/brand/np-favicon.ico)
│   ├── site.webmanifest            # Minimal manifest; icons point at images/brand/
│   ├── robots.txt                  # Crawl directives
│   └── fonts/                      # Self-hosted fonts: og/ for OG rendering, site/ for the pages (OFL texts alongside)
├── dist/                           # Build output (gitignored)
├── tests/                          # Vitest + Playwright tests
├── specs/                          # Feature specifications
├── screenshots/og/                  # Human-reference copies of the OG cards (npm run og:refresh); not a build input or test fixture
├── .github/screenshots/             # PR, issue, and generated audit evidence
├── AGENTS.md                       # AI agent instructions
├── REVIEW_POLICY.md                # Multi-identity review workflow
└── DEPLOYMENT.md                   # Deploy instructions
```

---

## How It Works

### Grid System

The homepage uses a **9-column × 9-row CSS Grid** (defined in `src/styles/global.css`). Odd-numbered tracks are `var(--line)` (9px desktop / 6px mobile)—they render as the black dividing lines of the Mondrian composition. Even-numbered tracks hold panels and decorative blocks.

When a panel is focused, JavaScript sets `data-focus="<panel-name>"` on the grid container. CSS defines a separate `grid-template-columns` + `grid-template-rows` for each `data-focus` value, and the grid transitions between them over `--motion-plane` (460ms) with `--ease-standard`. Because the focus templates mix `fr` and fixed tracks, which do not interpolate, `morphTracks()` resolves each change to pixel track lists and animates between those, then hands the tracks back to the stylesheet (see `docs/agents/operating-rules.md`).

### Homepage Interactions

- **Desktop (hover + fine pointer):** `mouseenter` opens a panel through the interaction state machine; `mouseleave` either switches directly to the related panel or schedules a short cancellable close.
- **Keyboard and click:** `Enter`/`Space` opens a panel; `Escape` closes it. Focus and click paths bypass hover guards so explicit user intent works even mid-transition.
- **Stack mode (≤ 1023px wide or ≤ 839px tall):** All interaction handlers exit early. Panels are always expanded.
- **Scroll guard:** A debounced scroll listener adds `.is-scrolling` to `<body>` during active scroll. CSS suspends hover transitions while this class is present.
- **Analytics:** When the visitor's privacy choice allows analytics, the first hover on each panel fires a one-time `section_view` event to Google Analytics via `gtag` on hover-capable pointers, and opening a panel fires PostHog's `homepage_panel_opened`.

### Blog

Blog posts are recursively discovered as Markdown files in `src/content/blog/` with Zod-validated frontmatter (defined in `src/content.config.ts`). Astro's Content Collections API provides type-safe access to the content. Posts support:

- **Pullquotes**—accent-colored sidebar cards
- **Sidebar content**—Mermaid diagrams, images, and text blocks
- **Code syntax highlighting**—via Shiki with CSS variable theming
- **Figure captions**—auto-numbered via custom Rehype plugin
- **Mermaid diagrams**—rendered to accessible inline SVG at build time by `rehype-mermaid`, so readers do not need Mermaid-capable browsers

### OG Images

OG images are generated at build time by a custom Astro integration (`src/integrations/og-images.mjs`). It uses Playwright to screenshot HTML templates at 1200×630 with 2× device scale factor. Templates live in `src/pages/og-templates/` and are removed from the final build output.

Every built page's `og:image` / `twitter:image` / `og:image:secure_url` URL is cross-checked against the real files in `dist/og/` by `tests/og-image-targets.test.js` at `npm test` time. If a page references an image that doesn't exist in the build output, the test fails with the offending page path, tag, and expected file location—the exact class of bug investigated in #163.

### robots.txt and Sitemap

The `Sitemap:` line in `dist/robots.txt` is rewritten at build time by `src/integrations/robots-sitemap.mjs` to match the real filename `@astrojs/sitemap` produces (`sitemap-index.xml` by default). The hand-authored line in `public/robots.txt` is a template; the integration scans `dist/` for the actual sitemap, strips any existing `Sitemap:` directives, and appends a fresh one. If no sitemap exists in `dist/`, the build fails loudly rather than silently shipping a broken `robots.txt`.

`tests/robots-sitemap.test.js` runs after `astro build` as a post-build assertion suite and verifies that the declared sitemap URL resolves to a real file in `dist/`. `tests/robots-sitemap-integration.test.js` unit-tests the integration against a fake `dist/` directory. Between them, any future drift between the declared `Sitemap:` URL and the real build output is caught at `npm test` time instead of in production.

This pipeline was built in response to #163, where a hand-authored `Sitemap: https://nathanpayne.com/sitemap.xml` declaration pointed at a URL that returned 404 because `@astrojs/sitemap` generated `sitemap-index.xml` instead. Google Search Console read the broken declaration, couldn't fetch the sitemap, and left the site unindexed.

### Project Pages

One dynamic route, `src/pages/projects/[slug].astro`, renders every non-draft entry in `src/content/projects/` as its own page with project-specific meta, canonicals, Open Graph tags, and JSON-LD. The URL comes from the frontmatter `slug`. The homepage Projects rows and the résumé's project entries are maintained separately; see `docs/agents/operating-rules.md` § Adding a Project.

### Motion System

All animation timing is governed by design tokens in `:root`—no hard-coded durations or easing functions.

| Tier | Token | Duration | Easing | Applies to |
|------|-------|----------|--------|------------|
| Metadata / dividers | `--motion-fast` | 130ms | `--ease-linear` | Labels, ribbons, meta text |
| Hover | `--motion-hover` | 170ms | `--ease-standard` | Social rows, icons, arrows, links |
| Panel morph | `--motion-plane` | 460ms | `--ease-standard` | Mondrian grid transitions |
| Section load | `--motion-load` | 300ms | `--ease-standard` | Entrance animations |

Translation magnitude is capped at `--shift-small` (2px) for hovers and `--shift-medium` (3px) for emphasis. No scaling, rotation, or bounce.

### Responsive Behavior

At `max-width: 1023px` or `max-height: 839px` (the composition's width and height floors, #992, #1042, #1044):
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
# Install dependencies (lockfile-exact; use npm install only when changing dependencies)
npm ci

# Install the build-time Chromium used to render static Mermaid SVGs, OG images, and the résumé PDF
npx playwright install chromium

# Optional: real public-client env vars (Logo.dev logos on /resume/) come from 1Password via
# scripts/bootstrap.sh. Leave .env.local absent for a clean degraded preview; .env.example
# holds placeholder strings, not blanks, so copying it switches components onto fake values.

# Start Astro dev server (with HMR)
npm run dev

# Build for production
npm run build

# Preview the production build locally
npm run preview

# Run lint, typecheck, format, and tests
npm run lint
npm run typecheck     # astro check
npm run format        # prettier --write (CSS/JS/TS); format:check to verify only
npm run test          # production-check build, astro build, vitest run (~5 min, 2026-10-12)
npm run test:e2e      # playwright test                      (~49s)
npm run test:all      # both, in order
```

`npm run test:all` is the one to run before pushing. The browser suite stays out of `npm test` on purpose, so it rides once per push instead. `npm test` itself now runs two builds and the full Vitest suite, so expect minutes, not seconds. A `pre-push` hook is available and opt-in:

```bash
git config core.hooksPath .githooks   # once per clone
SKIP_E2E=1 git push                   # bypass for a single push
```

Both suites also run in CI on every pull request and every push to `main` (`.github/workflows/build-and-test.yml`, a required check).

`package-lock.json` is committed; use `npm ci` for clean, reproducible installs (CI and fresh clones) and `npm install` when adding or updating dependencies. A `typecheck` script (`astro check`) and a `format` script (`prettier --write`, with `format:check` to verify) are available.

---

## Deployment

The site is hosted on [Firebase Hosting](https://firebase.google.com/docs/hosting). Firebase project ID: `nathanpaynedotcom`.

Deploy only when the owner has approved a production deploy.

```bash
# Deploy the attested CI build of the approved commit; dry-run it first with the same --sha
git pull --ff-only                     # refresh origin/main first; a stale checkout pins a stale SHA
SHA="$(git rev-parse origin/main)"     # confirm it is the full SHA the owner approved
scripts/deploy-artifact.sh --sha "$SHA" --dry-run
scripts/deploy-artifact.sh --sha "$SHA"
```

There is no `npm run deploy`: npm runs its configured `script-shell` before any script body, and a repository `.npmrc` can set it, so the script is run directly. See [`DEPLOYMENT.md`](DEPLOYMENT.md) § Deployment Steps.

`op-firebase-deploy` creates a short-lived impersonated credential for `firebase-deployer@nathanpaynedotcom.iam.gserviceaccount.com` from a 1Password-backed GCP ADC source credential. No routine browser login is needed. See [`DEPLOYMENT.md`](DEPLOYMENT.md) for full setup, credential bootstrap, and rollback procedures.

### Firebase Configuration

Defined in `firebase.json`:

| Setting | Value |
|---------|-------|
| Public directory | `dist` (Astro build output) |
| OG image cache | 24 hours |
| JS/CSS cache | 1 hour; content-hashed `/_astro/**` assets 1 year, `immutable` |
| HTML cache | 1 hour |
| Security headers | `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection: 0`, `Referrer-Policy`, `Permissions-Policy`, `Content-Security-Policy-Report-Only` |

---

## SEO & Social

- **Open Graph + Twitter Card** meta tags with build-time generated OG images per page. Every built page's `og:image` / `twitter:image` URL is verified to resolve to a real file in `dist/` at `npm test` time by `tests/og-image-targets.test.js`.
- **Canonical URLs** on all pages
- **JSON-LD** structured data (homepage and résumé Person/ProfilePage, project pages, blog posts and `/blog/`, `/projects/`, `/book/`, `/brand/`)
- **Sitemap** auto-generated by `@astrojs/sitemap` at `/sitemap-index.xml`
- **`robots.txt`** source in `public/`; the `Sitemap:` line is rewritten at build time by `src/integrations/robots-sitemap.mjs` to match the real sitemap filename. Covered by `tests/robots-sitemap.test.js` and `tests/robots-sitemap-integration.test.js`. See the [robots.txt and Sitemap](#robotstxt-and-sitemap) section for full context.
- **RSS feed** at `/rss.xml` (via `@astrojs/rss`)
- **Google Analytics 4** via `gtag.js` (property env-injected via `PUBLIC_GA_MEASUREMENT_ID`, never hardcoded), loaded only when the visitor's privacy choice allows analytics (see `/privacy/` and `specs/analytics-privacy.md`)
- **PostHog** via `src/components/posthog.astro` (public ingest token env-injected via `PUBLIC_POSTHOG_PROJECT_TOKEN`, never hardcoded), behind the same privacy gate; events are listed in `specs/analytics.md`

---

## AI Agent Docs

See [`AGENTS.md`](AGENTS.md) for detailed, platform-agnostic instructions for AI coding agents—including architecture decisions, coding conventions, content update patterns, and the complete design token reference.
