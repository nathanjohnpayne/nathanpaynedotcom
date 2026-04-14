---
spec_id: project-pages
title: Project Pages
tested: false
reason: "Smoke tests for project page routes and rendering are tracked in issue #156 and will ship in a follow-up PR."
---

# Project Pages

Specification for the content-collection-driven project detail pages.

---

## Authoring a New Project

To add a new project, create a Markdown file in `src/content/projects/`. The filename becomes the URL slug—`my-project.md` renders at `/projects/my-project/`. The page, index entry, and JSON-LD are all generated from this single file.

### Required files

1. **Markdown source**: `src/content/projects/<slug>.md`
2. **Hero image**: `public/images/projects/<slug>-hero.png` (or `.gif` for animated)

### Frontmatter template

```yaml
---
title: "Project Name"
slug: "project-name"
description: "One-sentence deck that appears below the title in the hero."
kicker: "AI × Domain × Category"
order: 5
screenshotAspect: "wide"
screenshotSrc: "/images/projects/project-name-hero.png"
accentColor: "#3366cc"
accentColorClass: "project-page--blue"
gradientFrom: "#dce3f0"
gradientTo: "#f5f0e4"
liveUrl: "https://example.com"
githubUrl: "https://github.com/you/repo"
tags: ["Tag1", "Tag2", "Tag3"]
metadata:
  domain: "Domain × Subdomain"
  format: "Product-type label (e.g., Financial operating system)"
  focus: "What it does in a few words"
  status: "Live product"
stack: "React · TypeScript · Vite · Firebase · Vitest"
related:
  - label: "Blog: Related Post Title"
    href: "/blog/related-post-slug/"
  - label: "Project: Related Project"
    href: "/projects/related-project-slug/"
draft: false
---
```

### Frontmatter field reference

| Field | Type | Required | Purpose |
|-------|------|----------|---------|
| `title` | string | yes | Page title, hero heading, JSON-LD name |
| `slug` | string | yes | URL path segment; must match filename |
| `description` | string | yes | Hero deck text, meta description, JSON-LD |
| `kicker` | string | yes | Tag line above title (e.g., "AI × Finance × Theater") |
| `order` | number | yes | Position on the `/projects/` index grid (lower = first) |
| `screenshotAspect` | `"wide"` \| `"narrow"` | yes | Layout variant — see below |
| `screenshotSrc` | string | yes | Path to hero image in `public/` |
| `accentColor` | string | yes | Hex color for accent bar, bullets, hover states |
| `accentColorClass` | string | yes | CSS class for per-project theming |
| `gradientFrom` | string | yes | Gradient start color (tinted toward accent) |
| `gradientTo` | string | yes | Gradient end color (use `"#f5f0e4"` to blend into card) |
| `liveUrl` | string | yes | URL for "View Live Product" CTA |
| `githubUrl` | string | yes | URL for "View on GitHub" CTA |
| `tags` | string[] | yes | Category/technology tags |
| `metadata.domain` | string | yes | Metadata strip: domain value |
| `metadata.format` | string | yes | Metadata strip: product-type label (e.g., "Internal platform tool"). The tech stack lives in the separate `stack` field — this field is for product category |
| `metadata.focus` | string | yes | Metadata strip: focus area value |
| `metadata.status` | string | yes | Metadata strip: project status |
| `stack` | string | no | Tech stack values separated by ` · ` (e.g., `"React · TypeScript · Vite · Firebase · Vitest"`). Rendered as a figcaption below the screenshot. Optional — projects without a stack field render without the caption |
| `related` | array | no | Related links with `label` and `href` |
| `draft` | boolean | no | `true` to exclude from builds (default: `false`) |

### Body content structure

The body uses standard Markdown. Section headings (`## Heading`) receive serif italic styling automatically. The expected sections are:

```markdown
## Overview

Opening paragraph about the project.

## What the product does

- First capability
- Second capability

## Why it matters

Why this project exists. Build notes fold in here naturally
rather than getting their own section.
```

Bullet lists get square markers colored with `--project-accent`. Horizontal rules between sections are generated from the `## Heading` CSS—no manual `---` needed.

---

## Layout Variants

Every project page uses the same `.metadata-surface` container, which wraps a 4-column horizontal metadata strip above a `<figure class="project-screenshot">` element that holds the image and (optionally) a `<figcaption class="project-stack">` caption below it. The `screenshotAspect` field controls only how the figure sizes its image — the metadata strip itself is always identical across projects.

### Wide (`screenshotAspect: "wide"`)

Used for desktop web app screenshots. The figure spans the full width of the gradient surface; the image is bordered and rounded, and the stack caption (if present) sits flush left directly below it at the same width.

**Projects using this**: Override, Device Source of Truth, Friends & Family Billing.

### Narrow (`screenshotAspect: "narrow"`)

Used for phone/mobile screenshots. The figure's inner wrapper (`.project-screenshot__inner`) is constrained to `max-width: 320px` (280px at the tablet breakpoint) and centered horizontally within the gradient surface. The stack caption inherits the same max-width constraint via the `.project-screenshot--narrow .project-stack` selector, so it aligns to the phone screenshot's left edge rather than the content container's. The phone image is rounded on all four corners and has sufficient bottom padding so the transition to the `Overview` heading below feels intentional.

**Projects using this**: Swipe Watch.

### Responsive behavior

| Breakpoint | Metadata strip | Wide screenshot | Narrow screenshot |
|------------|----------------|-----------------|-------------------|
| Desktop (>768px) | 4-column horizontal row | Full-width image with stack caption flush left below | Centered 320px phone image with stack caption aligned to the image's left edge |
| Tablet (≤768px) | Collapses to 2×2 grid | Full-width image (unchanged) | Inner wrapper and stack caption both narrow to 280px; alignment preserved |
| Phone (≤480px) | Collapses to single column | Full-width image (unchanged) | Inner wrapper and stack caption stay at the tablet 280px cap; natural wrapping |

The `.metadata-strip--grid-2x2` variant from the previous architecture has been removed — the metadata strip no longer varies by screenshot aspect. Wide and narrow differ only in how the figure sizes the image.

---

## Color System

Each project defines its own palette via frontmatter. The palette controls:

- **Accent bar**: Left border on the hero header
- **Gradient surface**: Background on the metadata + screenshot card
- **Bullet markers**: Square list markers in body content
- **Hover states**: CTA buttons and footer nav fill with accent on hover

### CSS custom properties

The layout sets three custom properties from frontmatter:

```css
--project-accent        /* accentColor — bar, bullets, hover fill */
--project-gradient-from /* gradientFrom — gradient start */
--project-gradient-to   /* gradientTo — gradient end */
```

### Choosing gradient colors

- `gradientFrom` should be a noticeably tinted version of the accent color. If it's too close to the card background (`#f5f0e4`), the gradient won't be visible.
- `gradientTo` should always be `"#f5f0e4"` to blend into the card surface.

### Current project palettes

| Project | Accent | Gradient from | Gradient to |
|---------|--------|--------------|-------------|
| Override | `#d9b111` (gold) | `#f0e8c4` | `#f5f0e4` |
| Device Source of Truth | `#c11d19` (red) | `#f5ddd4` | `#f5f0e4` |
| Swipe Watch | `#223f89` (blue) | `#dce3f0` | `#f5f0e4` |
| Friends & Family Billing | `#333333` (black) | `#dedad4` | `#f5f0e4` |

---

## Component Architecture

### Template chain

```
[slug].astro
  → ProjectLayout.astro
      → { HeroWide | HeroNarrow }
      → .metadata-surface
          → MetadataStrip
          → <figure class="project-screenshot">
              → .project-screenshot__inner → <img>
              → <figcaption class="project-stack"> (optional, from the `stack` field)
```

- **`src/pages/projects/[slug].astro`**: Dynamic route. Calls `getStaticPaths()` from the projects collection, generates JSON-LD, passes all frontmatter to `ProjectLayout`. Forwards the optional `stack` field through `stack={data.stack}`.
- **`src/layouts/ProjectLayout.astro`**: Sets CSS custom properties on the shell. Conditionally renders `HeroWide` or `HeroNarrow` based on `screenshotAspect`. Owns the `.metadata-surface` container that wraps `MetadataStrip` and the `<figure class="project-screenshot">`. The figure is rendered here (not in `MetadataStrip`) and contains the `<img>` plus a conditional `<figcaption class="project-stack">` when `stack` is present. The figcaption is a direct child of `<figure>` per HTML5 semantic rules.
- **`src/components/HeroWide.astro`**: Hero header for wide-layout projects. No screenshot — the screenshot is rendered by `ProjectLayout` below the hero.
- **`src/components/HeroNarrow.astro`**: Hero header for narrow-layout projects. No screenshot — same as `HeroWide`, the screenshot is rendered by `ProjectLayout` below the hero.
- **`src/components/MetadataStrip.astro`**: Strip-only — four `<dt>`/`<dd>` pairs for domain, format, focus, and status. Does not own the screenshot; does not accept `screenshotSrc`/`screenshotAlt`/`screenshotAspect` props. The strip is always rendered as a single 4-column horizontal row on desktop and collapses responsively (2-column at ≤768px, 1-column at ≤480px) via `.metadata-strip--grid-4` media queries.

### Content collection schema

Defined in `src/content.config.ts`. Uses Astro's glob loader and Zod validation. The `render()` function is imported from `astro:content` (not called on the entry):

```ts
import { render } from 'astro:content';
const { Content } = await render(project);
```

### Index page

`src/pages/projects/index.astro` queries the collection with `getCollection('projects')`, sorts by `data.order`, and renders a Mondrian-style grid. Adding a new `.md` file with valid frontmatter automatically adds it to the index.

---

## Typography Hierarchy

| Element | Size | Style | Color |
|---------|------|-------|-------|
| Breadcrumb | 12–13px | Uppercase, tracked | Tertiary (0.38 opacity) |
| Kicker (AI × Domain) | 12–13px | Uppercase, tracked | Tertiary (0.38 opacity) |
| Project title | Large serif (clamp 2.4–5.1rem) | Roman | Primary |
| Description | 16–17px serif | Roman | Primary |
| CTA buttons | ~14px | Uppercase, 0.14em tracking | Primary, accent fill on hover |
| Metadata labels | 10–11px | Uppercase, 0.16em tracking | Tertiary (0.62 opacity) — also used for `.project-stack__label` |
| Metadata values | 14–15px | Roman | Primary — also used for `.project-stack__value` |
| Section headings | 22–23px | Serif italic | Primary |
| "Related" heading | 16–18px | Serif italic | Secondary (0.72 opacity) |
| Body text | 16px | Roman | Primary, line-height 1.65 |

---

## Footer

The project footer matches the blog footer pattern:

- Left: `NATHAN PAYNE · SAN FRANCISCO` in uppercase tracked tertiary text
- Right: Two bordered CTA buttons—`← BACK TO PROJECTS` and `BACK TO HOMEPAGE →`
- Separated from content by a 1px solid rule (ink color)
- Button hover fills with `--project-accent`

---

## File Locations

```
src/content/projects/*.md          Project source files (frontmatter + body)
src/content.config.ts              Collection schema (Zod)
src/pages/projects/[slug].astro    Dynamic route + JSON-LD
src/pages/projects/index.astro     Project index grid
src/layouts/ProjectLayout.astro    Layout wrapper (CSS props, hero, metadata, footer)
src/components/HeroWide.astro      Wide hero header (no screenshot)
src/components/HeroNarrow.astro    Narrow hero header (no screenshot)
src/components/MetadataStrip.astro 4-column metadata strip (domain/format/focus/status)
src/styles/global.css              All project page styles (.metadata-strip, .project-screenshot, .project-stack)
public/images/projects/            Hero screenshots
```
