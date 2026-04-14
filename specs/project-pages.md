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
  format: "What it's built with"
  focus: "What it does in a few words"
  status: "Live product"
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
| `metadata.format` | string | yes | Metadata strip: format/tech value |
| `metadata.focus` | string | yes | Metadata strip: focus area value |
| `metadata.status` | string | yes | Metadata strip: project status |
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

The `screenshotAspect` field controls which layout renders.

### Wide (`screenshotAspect: "wide"`)

Used for desktop web app screenshots. The metadata strip (4-column, single row) sits above a full-width screenshot, both wrapped in a single gradient surface with dotted internal dividers.

**Projects using this**: Override, Device Source of Truth, Friends & Family Billing.

### Narrow (`screenshotAspect: "narrow"`)

Used for phone/mobile screenshots. The metadata strip (2×2 grid) sits above a centered phone image, both in a single gradient surface. The phone image sits flush against the bottom of the card.

**Projects using this**: Swipe Watch.

### Responsive behavior

| Breakpoint | Wide layout | Narrow layout |
|------------|------------|---------------|
| Desktop (>768px) | 4-column metadata strip above full-width screenshot | 2×2 metadata grid above centered phone |
| Tablet (≤768px) | Metadata collapses to 2×2 grid | Same as desktop (already stacked) |
| Phone (≤480px) | Metadata collapses to single column | Metadata collapses to single column |

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
[slug].astro → ProjectLayout.astro → { HeroWide | HeroNarrow } + MetadataStrip
```

- **`src/pages/projects/[slug].astro`**: Dynamic route. Calls `getStaticPaths()` from the projects collection, generates JSON-LD, passes all frontmatter to `ProjectLayout`.
- **`src/layouts/ProjectLayout.astro`**: Sets CSS custom properties on the shell. Conditionally renders `HeroWide` or `HeroNarrow` based on `screenshotAspect`. Always renders `MetadataStrip` with the screenshot.
- **`src/components/HeroWide.astro`**: Hero header for wide-layout projects (no screenshot—screenshot is in MetadataStrip).
- **`src/components/HeroNarrow.astro`**: Hero header for narrow-layout projects (no screenshot—screenshot is in MetadataStrip).
- **`src/components/MetadataStrip.astro`**: Unified metadata + screenshot surface. Renders metadata grid (4-col or 2×2) on top, screenshot below, all in one gradient card with dotted internal dividers.

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
| Metadata labels | 10–11px | Uppercase, 0.16em tracking | Tertiary (0.4 opacity) |
| Metadata values | 14–15px | Roman | Primary |
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
src/components/HeroWide.astro      Wide hero header
src/components/HeroNarrow.astro    Narrow hero header
src/components/MetadataStrip.astro Metadata + screenshot surface
src/styles/global.css              All project page styles
public/images/projects/            Hero screenshots
```
