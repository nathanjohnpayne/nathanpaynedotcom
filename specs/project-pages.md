---
spec_id: project-pages
title: Project Pages
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
screenshotSecondary:                # optional—a second capture shown beside the first
  src: "/images/projects/project-name-hero-b.png"
  alt: "What the second capture shows"
  width: 786                        # intrinsic pixels; required, prevents layout shift
  height: 1550
accent: "red"                      # = RAMP[order % 5]; order 5 → red. See Accent ramp
liveUrl: "https://example.com"     # optional—omit on pre-launch projects
githubUrl: "https://github.com/you/repo"
tags: ["Tag1", "Tag2", "Tag3"]
status: "SHIPPED"                  # one of: SHIPPED | EXPERIMENT | IN PROGRESS | PAUSED | ARCHIVED
metadata:
  format: "Product-type label (e.g., Financial operating system)"
  focus: "What it does in a few words"
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
| `kicker` | string | yes | Source for the metadata table's `Topics` column (e.g., "AI × Finance × Theater" → renders as `AI · Finance · Theater`). Field name kept for frontmatter back-compat |
| `order` | number | yes | Position on the `/projects/` index grid (lower = first). Governs `/projects/` **only**—the homepage Builds grid is hand-authored markup and ignores this field. See § Canonical project ordering |
| `screenshotAspect` | `"wide"` \| `"narrow"` | yes | Layout variant—see below |
| `screenshotSrc` | string | yes | Path to hero image in `public/` |
| `screenshotSecondary` | object | no | A companion capture rendered beside `screenshotSrc`—see § Paired screenshots. All four keys are required when the field is present: `src`, `alt`, `width`, `height` |
| `accent` | enum | yes | Semantic accent token for the project. One of `red`, `yellow`, `paper`, `blue`, `black`. Not a free choice—it must be `RAMP[order % 5]` per the Accent ramp below, enforced by `tests/project-pages.test.js`. CSS derives the actual palette values, text-safe color, page wash, and metadata gradient from this token |
| `liveUrl` | non-empty string | no | URL for "View Live Product" CTA. Omit on pre-launch projects (status `IN PROGRESS`)—the CTA, the index card "Live ↗" link, the homepage Builds "Live ↗" link, and the `SoftwareApplication` JSON-LD entity are all suppressed when this field is missing |
| `githubUrl` | string | yes | URL for "View on GitHub" CTA |
| `tags` | string[] | yes | Category/technology tags |
| `status` | enum | yes | Project lifecycle status. One of `SHIPPED`, `EXPERIMENT`, `IN PROGRESS`, `PAUSED`, `ARCHIVED`. Drives both the project-card kicker on `/projects/` and the Status column in the detail-page metadata table—single source of truth, single short-form vocabulary across both surfaces. See #274, #285 |
| `metadata.format` | string | yes | Metadata strip: product-type label (e.g., "Internal platform tool"). The tech stack lives in the separate `stack` field—this field is for product category |
| `metadata.focus` | string | yes | Metadata strip: focus area value |
| `stack` | string | no | Tech stack values separated by ` · ` (e.g., `"React · TypeScript · Vite · Firebase · Vitest"`). Rendered as a figcaption below the screenshot. Optional—projects without a stack field render without the caption |
| `related` | array | no | Related links with `label` and `href` |
| `muxPlaybackId` | non-empty string | no | Mux public Playback ID. When set, the hero renders a `<mux-background-video>` video and `screenshotSrc` is used as the JS-disabled fallback. Schema rejects blank / whitespace-only values so a stray empty string fails build-time rather than producing a broken URL. See "Adding a Mux video" below |
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

Bullet lists get square markers colored with `--accent`. Horizontal rules between sections are generated from the `## Heading` CSS—no manual `---` needed.


### Paired screenshots

A project whose product ships more than one front end can carry two captures instead of one. Adding `screenshotSecondary` puts a second image beside `screenshotSrc` and adds `project-screenshot--pair` to the figure:

- **Above `--bp-tablet` (768px)** the two sit side by side. Under `screenshotAspect: "narrow"` each is capped at 320px and the wrapper widens to hold both plus the gap; under `"wide"` they split the full content column.
- **Below 768px** they stack, and the stack caption narrows with them.

`alt` is required, not optional: the primary derives its alt text from the project title, and a second image has no such fallback. `width` and `height` are the asset's intrinsic pixels and are also required—the companion is lazy-loaded and stacks *below* the primary on phones, so without an aspect-ratio box it would occupy zero height until fetched and then push the caption and the article down by a full frame. Assets in `public/` bypass Astro's image pipeline, so nothing can infer them at build time.

Do not add per-image captions. Each capture is expected to carry its own identifying chrome; labelling them repeats what the images already say.

---

## Canonical project ordering

The portfolio is ordered for **narrative impact**, not alphabetically, not by
status, and not by recency. Owner-confirmed 2026-08-20:

| # | Project | Why it sits here |
|---|---------|------------------|
| 0 | Five Across | Shipped, live, consumer—the strongest story, so it leads |
| 1 | Mergepath | The AI-governance signature; underpins every other project |
| 2 | Override | Production platform with real external users |
| 3 | Device Source of Truth | Archived but demoable; the platform/device domain proof |
| 4 | Matchline | Paused; the concept carries it mid-list |
| 5 | Swipe Watch | Experiment |
| 6 | Friends & Family Billing | Case-study source; anchors the list |

`/resume` mirrors the same sequence, at its own 1-based numbering
(`src/content/resume/projects/*.md`, orders 1–7).

**This ordering is a deliberate editorial decision and must not be "corrected."**
An agent tidying the collection will find it looks unsorted by every mechanical
rule, because it is: `ARCHIVED` outranks `PAUSED` here, and the newest project
leads while an older shipped one anchors. Change it only on an explicit
instruction from the owner.

### It lives in two places, and only one of them is enforced

`order` drives `/projects/`—`src/pages/projects/index.astro` sorts the
collection by it. The **homepage Builds grid does not read the collection at
all**: `src/pages/index.astro` calls `getCollection` only for `blog`, and the
project list is hand-authored anchors. Editing `order` alone changes `/projects/`
and silently leaves the homepage on its old sequence.

Nothing in the build catches that divergence, and it had already happened once
before this was written. When you reorder, change both, and update the
order-sensitive fixtures in `tests/project-pages.test.js`
(`canonicalProjectCards`, `homepageProjectDescriptions`) and
`tests/resume.test.js`, which assert the rendered sequence on all three surfaces.

---

## Layout Variants

Every project page uses the same `.metadata-surface` container, which wraps a 4-column horizontal metadata strip above a `<figure class="project-screenshot">` element that holds the image and (optionally) a `<figcaption class="project-stack">` caption below it. The `screenshotAspect` field controls only how the figure sizes its image—the metadata strip itself is always identical across projects.

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

The `.metadata-strip--grid-2x2` variant from the previous architecture has been removed—the metadata strip no longer varies by screenshot aspect. Wide and narrow differ only in how the figure sizes the image.

---

## Adding a Mux video

Any project can render a vertical Mux video in the hero instead of a static screenshot. The existing `screenshotSrc` stays in the frontmatter—it's still used as the player's poster frame and as the no-JS fallback.

### Steps

1. Upload the video to the [Mux dashboard](https://dashboard.mux.com/).
2. Copy the **public Playback ID** (not the Asset ID—they look similar but the Asset ID is a different namespace).
3. Add one line to the project's frontmatter:

   ```yaml
   muxPlaybackId: "abc123defGHI456..."
   ```

4. Build and deploy. That's it—the `<ProjectMuxPlayer>` component handles rendering, theming, analytics, and fallback.

### What happens automatically

- **Autoplay + loop**: `<mux-background-video>` creates a muted, looped, plays-inline video to match the feel of the animated GIFs that the static hero slot previously used.
- **Analytics**: pages with a Mux hero load `mux-embed` before registering `<mux-background-video>`. Mux Data monitoring is automatic for the background video and infers the env key from the `stream.mux.com` URL; no `PUBLIC_MUX_ENV_KEY` is read by this site.
- **Fallback**: the existing `screenshotSrc` image renders in `<noscript>` and is also the autoplay-failure fallback. On JavaScript-enabled pages, the Mux thumbnail renders inside `<mux-background-video>` as the pre-upgrade poster; if the custom element fails to register, the media errors, or the shadow `<video>` does not make real playback progress within the autoplay window, the component lazy-loads the `screenshotSrc` GIF, fades the stalled video out, and reveals a compact manual play button.
- **Bundle cost**: the Mux custom element is registered only when a page contains a `<mux-background-video>` element. Projects without `muxPlaybackId` do not load `mux-embed` or the background-video package at runtime.
- **Reduced motion (#468)**: when `prefers-reduced-motion: reduce` matches, the hero never autoplays—the video holds on its poster frame with the manual play button visible, and the animated-GIF fallback is suppressed the same way (a looping GIF is the same continuous motion). Both motion paths re-enable only after the user explicitly presses play.

### Aspect ratio

The player auto-sizes from the asset's video metadata. There is **no per-project frontmatter override**—record or export the source video at the final aspect you want and it renders at that shape. Earlier revisions hardcoded `9/16` in CSS and produced letterbox bars on the Swipe Watch asset, which is captured at a modern phone ratio (~9:19.5) rather than true 9:16. If a future project needs a different aspect treatment (e.g. a `cover`-style crop, or a container-driven ratio override), add a prop to [ProjectMuxPlayer.astro](../src/components/ProjectMuxPlayer.astro) at that point.

### Component source

[src/components/ProjectMuxPlayer.astro](../src/components/ProjectMuxPlayer.astro). Add new props to that component when a per-project override is needed (custom alt text, different fallback, etc.).

### Fallback GIF regeneration

`screenshotSrc` is the JS-disabled fallback and the OG image source. For projects with `muxPlaybackId`, the GIF at that path is **regenerated from Mux on every build** by [scripts/refresh-mux-gifs.mjs](../scripts/refresh-mux-gifs.mjs), which runs as part of `prebuild`. The script fetches `https://image.mux.com/{playbackId}/animated.gif?width=320&fps=15&end=8` and writes the response directly to `public/<screenshotSrc>`.

Key behaviors:

- **Strict failure on network errors.** Any non-200 response or network timeout exits non-zero and halts the build. The design note in the script header explains why: Mux is the only source for a project's fallback frame once `muxPlaybackId` is set, so a silent miss would serve stale content indefinitely.
- **Per-project config errors warn, don't halt.** A malformed frontmatter (e.g. relative `screenshotSrc`) logs a warning and skips that project—the build still completes.
- **Co-exists with the GitHub-social refresher.** [scripts/refresh-hero-images.mjs](../scripts/refresh-hero-images.mjs) (which refreshes `heroRefresh: github-social` projects) skips any project with `muxPlaybackId` so the two refreshers can never race for the same output path.

To regenerate a Mux GIF manually without a full build:

```bash
node scripts/refresh-mux-gifs.mjs
```

Rendering knobs (width, fps, duration) live at the top of the script. If a future project needs different framing, either pass URL params from within the script or split to per-project config—don't hardcode a second call site.

---

## Color System

Each project declares a semantic accent in frontmatter, but does not choose it freely: the accent follows a fixed ramp indexed by `order` (see Accent ramp below). The palette values themselves live in `src/styles/global.css`:

- **Accent bar**: Left border on the hero header
- **Gradient surface**: Background on the metadata + screenshot card, derived from the accent
- **Bullet markers**: Square list markers in body content
- **Hover states**: CTA buttons and footer nav fill with accent on hover
- **Text accents**: Links use the contrast-safe `--accent-text` derivation, not the raw plane color

### CSS custom properties

`BaseLayout` places `data-accent="<accent>"` on `<body>`. The global `[data-accent]` rules set or derive:

```css
--accent                /* plane/accent color */
--accent-contrast       /* text on accent fills */
--accent-soft           /* translucent accent surface */
--accent-text           /* AA-safe text color derived from accent + ink */
--project-bg            /* page wash derived from accent + cream */
--project-gradient-from /* metadata/screenshot gradient start, derived */
--project-gradient-to   /* metadata/screenshot gradient end */
```

Do not add raw hex palette values to project frontmatter. The accent set is closed at five, and an individual project does not get to introduce a sixth: the accent is derived from the ramp, so adding a color is a change to the ramp itself rather than a per-project decision. Making that change means moving four contracts together—a new `[data-accent]` scope in `global.css`, the `accent` enum in `src/content.config.ts`, the prop union in `ProjectLayout.astro`, and `projectAccentRamp` in `tests/project-pages.test.js`—and accepting that a six-token ramp re-colors every project whose `order` is at or past the insertion point.

### Accent ramp

The five interior-register planes run in one fixed sequence, and a project's position in the [canonical ordering](#canonical-project-ordering) picks its accent out of that sequence:

```
red → yellow → paper → blue → black   (repeating)
accent = RAMP[order % 5]
```

The sequence is a single-direction walk—warm, bright, neutral, cool, dark—so the portfolio reads as a progression rather than a rotation, and adding a project extends the walk instead of requiring a fresh judgment call about which color is still free. The ramp keys off `order`, not file position or publication date, so a reorder re-colors the affected projects rather than silently breaking the sequence. `tests/project-pages.test.js` asserts every project's `accent` matches `RAMP[order % 5]`, so a new project that picks its own color fails the suite.

There is no `lightblue`. It existed as a second blue while the site ran two palette registers in one composition; PR #500 made 1921 the `:root` default and left `--lightblue: var(--blue)` behind as an alias that resolved identically in both registers. The alias and its `data-accent` scope were removed once the duplication was confirmed—the two blues the site still runs are the 1921 and 1930 registers, one per room, not two tokens inside one register. See [Two Blues, One Composition](/blog/two-blues-one-composition/).

### Current project accents

| `order` | Project | Accent |
|---------|---------|--------|
| 0 | Five Across | `red` |
| 1 | Mergepath | `yellow` |
| 2 | Override | `paper` |
| 3 | Device Source of Truth | `blue` |
| 4 | Matchline | `black` |
| 5 | Swipe Watch | `red` |
| 6 | Friends & Family Billing | `yellow` |

---

## Component Architecture

### Template chain

```
[slug].astro
  → ProjectLayout.astro
      → ProjectHero (variant from screenshotAspect)
      → .metadata-surface
          → MetadataStrip
          → <figure class="project-screenshot">
              → .project-screenshot__inner → <img>
              → <figcaption class="project-stack"> (optional, from the `stack` field)
```

- **`src/pages/projects/[slug].astro`**: Dynamic route. Calls `getStaticPaths()` from the projects collection, generates JSON-LD, passes all frontmatter to `ProjectLayout`. Forwards the optional `stack` field through `stack={data.stack}`.
- **`src/layouts/ProjectLayout.astro`**: Passes the semantic `accent` to `BaseLayout`, which emits `data-accent`. CSS derives `--accent`, text-safe accent color, page wash, and metadata gradient from that attribute. Renders `ProjectHero` with `variant={screenshotAspect}` (#470). Owns the `.metadata-surface` container that wraps `MetadataStrip` and the `<figure class="project-screenshot">`. The figure is rendered here (not in `MetadataStrip`) and contains the `<img>` plus a conditional `<figcaption class="project-stack">` when `stack` is present. The figcaption is a direct child of `<figure>` per HTML5 semantic rules.
- **`src/components/ProjectHero.astro`**: Hero header for project pages; the `variant: "wide" | "narrow"` prop sets the `.project-hero--{variant}` wrapper class (#470 merged the former HeroWide/HeroNarrow twins—their markup was identical). No screenshot—the screenshot is rendered by `ProjectLayout` below the hero. The hero does not render the `kicker` tag row; that content lives in the `Topics` column of the metadata strip below.
- **`src/components/MetadataStrip.astro`**: Strip-only—four `<dt>`/`<dd>` pairs for topics, format, focus, and status (in that visual order). Does not own the screenshot; does not accept `screenshotSrc`/`screenshotAlt`/`screenshotAspect` props. The `topics` value is derived in `ProjectLayout` from the project's `kicker` frontmatter (split on `×` and re-joined with ` · ` to match the metadata table's separator convention). The `status` value is the project's top-level `status` enum, rendered identically on the index card kicker and in the metadata strip—single short-form vocabulary across both surfaces. The strip is always rendered as a single 4-column horizontal row on desktop and collapses responsively (2×2 at ≤768px, 1-column at ≤480px) via `.metadata-strip--grid-4` media queries.

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
| Project title | Large serif (clamp 2.4–5.1rem) | Roman | Primary |
| Description | 16–17px serif | Roman | Primary |
| CTA buttons | ~14px | Uppercase, 0.14em tracking | Primary, accent fill on hover |
| Metadata labels | 10–11px | Uppercase, 0.16em tracking | Tertiary (0.62 opacity)—also used for `.project-stack__label` |
| Metadata values | 14–15px | Roman | Primary—also used for `.project-stack__value` |
| Section headings | 22–23px | Serif italic | Primary |
| "Related" heading | 16–18px | Serif italic | Secondary (0.72 opacity) |
| Body text | 16px | Roman | Primary, line-height 1.65 |

---

## Footer

The project footer matches the blog footer pattern:

- Left: `NATHAN PAYNE · SAN FRANCISCO` in uppercase tracked tertiary text
- Right: Two bordered CTA buttons—`← BACK TO PROJECTS` and `BACK TO HOMEPAGE →`
- Separated from content by a 1px solid rule (ink color)
- Button hover fills with `--accent`

---

## File Locations

```
src/content/projects/*.md          Project source files (frontmatter + body)
src/content.config.ts              Collection schema (Zod)
src/pages/projects/[slug].astro    Dynamic route + JSON-LD
src/pages/projects/index.astro     Project index grid
src/layouts/ProjectLayout.astro    Layout wrapper (CSS props, hero, metadata, footer)
src/components/ProjectHero.astro   Hero header, wide|narrow variant (no screenshot)
src/components/MetadataStrip.astro 4-column metadata strip (topics/format/focus/status)
src/styles/global.css              All project page styles (.metadata-strip, .project-screenshot, .project-stack)
public/images/projects/            Hero screenshots
```
