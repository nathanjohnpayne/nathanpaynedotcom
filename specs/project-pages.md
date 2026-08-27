---
spec_id: project-pages
title: Project Pages
---

# Project Pages

Specification for the content-collection-driven project detail pages.

---

## Authoring a New Project

To add a new project, create a Markdown file in `src/content/projects/`. The filename becomes the URL slug—`my-project.md` renders at `/projects/my-project/`. The page, index entry, and JSON-LD are all generated from this single file.

The collection accepts `.md` or `.mdx`. A page only needs `.mdx` if its body places `<DecisionLedger>`, `<ConstraintStrip>`, or `<LearningLedger>` (see § Decisions, constraints, and learnings)—MDX is the mechanism that lets those components render mid-body rather than only before or after the whole body. A plain `.md` project page is still entirely valid and remains the default; converting to `.mdx` is opt-in per page, not a migration every project has to make.

### Required files

1. **Markdown source**: `src/content/projects/<slug>.md` (or `<slug>.mdx`, if the body places a case-study component)
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
| `order` | non-negative integer | yes | Position on the `/projects/` index grid (lower = first). Governs `/projects/` **only**—the homepage Builds grid is hand-authored markup and ignores this field. See § Canonical project ordering |
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
| `decisions` | array | no | Case-study decision ledger entries, rendered mid-body by `<DecisionLedger>`. Each entry is `title`, `context`, `rejected`, `rationale`, `evidence`, `status`. Optional, defaults to `[]`. See § Decisions, constraints, and learnings for the field-level contract |
| `constraints` | array | no | Constraint chips rendered mid-body by `<ConstraintStrip>`. Each entry pairs a headline `value` with a one-line `label` gloss. Optional, defaults to `[]` |
| `learnings` | array | no | Learning ledger entries rendered mid-body by `<LearningLedger>`. Each entry is an `expected` / `observed` / `response` triple. Optional, defaults to `[]` |
| `draft` | boolean | no | `true` to exclude from builds (default: `false`) |

### Body content structure

The body uses standard Markdown, or MDX for a page whose body places a case-study component—see § Decisions, constraints, and learnings. Section headings (`## Heading`) receive serif italic styling automatically.

The expected structure for a project page is now the case-study shape: problem, then constraints, then decisions, then live evidence paired with learnings, then what it means. In practice that reads as prose on the problem, `<ConstraintStrip>`, prose on the decisions the project faced, `<DecisionLedger>`, prose on what actually happened once it shipped, `<LearningLedger>`, and closing prose on what the project demonstrates:

```mdx
---
# ...frontmatter, including decisions / constraints / learnings...
---

import ConstraintStrip from '../../components/projects/ConstraintStrip.astro';
import DecisionLedger from '../../components/projects/DecisionLedger.astro';
import LearningLedger from '../../components/projects/LearningLedger.astro';

## The problem

What was broken, missing, or worth building, and why it mattered.

<ConstraintStrip constraints={props.constraints} />

## The decisions

Prose framing the forks the project faced.

<DecisionLedger decisions={props.decisions} />

## What happened

Prose on live operation—platform behavior, the agent model, real limits.

<LearningLedger learnings={props.learnings} />

## What it means

What the project demonstrates, in a sentence or two.
```

**The imports are required, and only the ones the page actually places.** MDX does not put these components in scope on its own—the route supplies the *data* on `<Content />`, never the components—so a body that uses `<DecisionLedger>` without importing it fails the build on a missing reference.

**The paths are relative to the file, so they depend on where the file sits.** `../../` is right for `src/content/projects/<slug>.mdx`, the flat layout every project uses today. The collection glob is `**/*.{md,mdx}` and does accept a nested project, and `src/content/projects/<group>/<slug>.mdx` would need `../../../`. No path alias is configured in this repo; adding one is a repo-wide config change that would need its own discussion under [Framework Rules](../docs/agents/code-modification-rules.md#framework-rules). Getting the depth wrong fails the build on an unresolved module, so it costs one build cycle—unlike the frontmatter traps above, which are silent.

The headings shown are illustrative, not prescribed text—say what the section needs to say.

This shape supersedes the older Overview / What the product does / Why it matters structure below: issue #752 removes the older shape from Five Across, and most other project pages are expected to follow. The older shape is still valid for a page that has not been reworked into a case study—nothing forces a page to convert, and a page that never places a case-study component has no reason to:

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

Neither shape is mandatory furniture. Both are conventions this site's project pages tend to follow, not headings enforced by the layout or the schema—a page can deviate from both where the material calls for it.

Bullet lists get square markers colored with `--accent`. Horizontal rules between sections are generated from the `## Heading` CSS—no manual `---` needed.


### Paired screenshots

A project whose product ships more than one front end can carry two captures instead of one. Adding `screenshotSecondary` puts a second image beside `screenshotSrc` and adds `project-screenshot--pair` to the figure:

- **Above `--bp-tablet` (768px)** the two sit side by side. Under `screenshotAspect: "narrow"` each is capped at 320px and the wrapper widens to hold both plus the gap; under `"wide"` they split the full content column.
- **Below 768px** they stack, and the stack caption narrows with them.

`alt` is required, not optional: the primary derives its alt text from the project title, and a second image has no such fallback. `width` and `height` are the asset's intrinsic pixels and are also required—the companion is lazy-loaded and stacks *below* the primary on phones, so without an aspect-ratio box it would occupy zero height until fetched and then push the caption and the article down by a full frame. Assets in `public/` bypass Astro's image pipeline, so nothing can infer them at build time.

Do not add per-image captions. Each capture is expected to carry its own identifying chrome; labelling them repeats what the images already say.

---

## Decisions, constraints, and learnings

Three flat top-level frontmatter fields, added in epic #759: `decisions`, `constraints`, `learnings`. Each is optional and defaults to `[]`, and each renders through its own component—`DecisionLedger.astro`, `ConstraintStrip.astro`, `LearningLedger.astro`—placed inside the Markdown body of a project page that has converted to `.mdx`. See § Body content structure above for where they sit in the narrative, and § Component Architecture below for where they sit in the render chain.

This section exists because seven project pages, authored by seven different agents, need to classify the same kind of situation the same way. A shared, precise vocabulary is what makes that possible.

### The bar for a decision at all

Not every implementation choice belongs in the ledger. The test: could a reasonable PM have chosen the rejected alternative, under the same constraints, without being wrong to? If no, what's on the page is implementation description, not a decision—cut it and find a real one. A decision worth recording is one where the rejected path was genuinely live, not a straw man invented to make the chosen path look inevitable.

### Status: four peers, not a success and three failures

| `status` | means |
|---|---|
| `validated` | Observed evidence materially supports the decision. |
| `mixed` | Evidence supports part of it and exposes a real limitation—weak adoption, a contradictory signal, a benefit that arrived for a different reason than predicted. |
| `revised` | Observed evidence caused the decision or its implementation to change. The change is the outcome. |
| `pending` | The decision is real and consequential, but adequate outcome evidence does not yet exist. |

The four statuses render as **peers**. `validated` must not read as success and the other three must not read as error states: a `revised` decision is not a failed one—the revision is the point of recording it—and a `pending` decision is not an unfinished one, it is a decision honestly marked as still awaiting its evidence.

### `evidence` is required for every status, `pending` included

`evidence` is not optional furniture that only `validated` rows carry. For a `pending` decision it carries the validation boundary: why the evidence is not in yet, and what would resolve it.

It must never restate `rationale`. `rationale` is why the choice was made; `evidence` is what happened afterward. If the two read alike, the row has no evidence—go find what actually happened, or mark the row `pending` and say what's missing.

`DecisionLedger` labels the field accordingly: **Observed** for `validated`, `mixed` and `revised`, and **Validation boundary** for `pending`. The treatment is identical either way—same exhibit plane, same accent label—because the four statuses stay peers and demoting `pending` to a lesser surface would make it read as an apology. Only the word changes, because calling a validation boundary "Observed" asserts an observation that by definition has not happened.

### `constraints` are context, not vanity metrics

Each `constraints` entry pairs a headline `value` with a one-line `label`. They exist to ground the decisions that follow in the real limits the project operated under—budget, headcount, a platform ceiling, a deadline—not to showcase a number that flatters the project. A constraint that reads as a brag rather than a boundary belongs in the prose, not this field.

### `learnings`'s third field says what changed

A `learnings` entry is an `expected` / `observed` / `response` triple. `response` must say what changed—an approach abandoned, a metric now tracked, a process added—never "we were right." An entry whose response is "nothing, we kept going" did not produce a learning and does not belong in the ledger.

### Placement: `props.X`, not `frontmatter.X`

These components render inside the body of an `.mdx` project page, authored as:

```mdx
import ConstraintStrip from '../../components/projects/ConstraintStrip.astro';
import DecisionLedger from '../../components/projects/DecisionLedger.astro';
import LearningLedger from '../../components/projects/LearningLedger.astro';

<DecisionLedger decisions={props.decisions} />
<ConstraintStrip constraints={props.constraints} />
<LearningLedger learnings={props.learnings} />
```

Two halves, and they arrive by different routes. The **components** come from the page's own `import` statements—MDX does not put them in scope and the route does not supply them, so omitting an import fails the build on a missing reference. The **data** comes from the route, on `props`. The `../../` depth shown is correct for a flat `src/content/projects/<slug>.mdx`; see § Body content structure for what a nested project would need.

Reach the field through `props.X`, never `frontmatter.X`. In MDX, `frontmatter` is the page's raw, unvalidated YAML—Zod has not run against it—so a field declared `.optional().default([])` in `src/content.config.ts` still reads as `undefined` on the `frontmatter` path when the key is absent from the file. `src/pages/projects/[slug].astro` forwards the Zod-validated values explicitly on `<Content decisions={data.decisions} constraints={data.constraints} learnings={data.learnings} />`; a body that instead reads a bare `decisions` throws a `ReferenceError`. See [plans/759/component-placement-decision.md](../plans/759/component-placement-decision.md) for the full evidence behind this.

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
      → .project-copy → <slot /> → rendered body (<Content />)
          → DecisionLedger / ConstraintStrip / LearningLedger
            (optional, .mdx only, placed mid-body wherever the page author puts them)
```

- **`src/pages/projects/[slug].astro`**: Dynamic route. Calls `getStaticPaths()` from the projects collection, generates JSON-LD, passes all frontmatter to `ProjectLayout`. Forwards the optional `stack` field through `stack={data.stack}`. Also forwards the Zod-validated `decisions`, `constraints`, and `learnings` on `<Content decisions={data.decisions} constraints={data.constraints} learnings={data.learnings} />`—see § Decisions, constraints, and learnings for why the body must read these as `props.X` rather than `frontmatter.X`.
- **`src/layouts/ProjectLayout.astro`**: Passes the semantic `accent` to `BaseLayout`, which emits `data-accent`. CSS derives `--accent`, text-safe accent color, page wash, and metadata gradient from that attribute. Renders `ProjectHero` with `variant={screenshotAspect}` (#470). Owns the `.metadata-surface` container that wraps `MetadataStrip` and the `<figure class="project-screenshot">`. The figure is rendered here (not in `MetadataStrip`) and contains the `<img>` plus a conditional `<figcaption class="project-stack">` when `stack` is present. The figcaption is a direct child of `<figure>` per HTML5 semantic rules. The rendered body sits in `.project-copy` via `<slot />`—for an `.mdx` page, that body can include `DecisionLedger`, `ConstraintStrip`, and `LearningLedger` mid-prose.
- **`src/components/ProjectHero.astro`**: Hero header for project pages; the `variant: "wide" | "narrow"` prop sets the `.project-hero--{variant}` wrapper class (#470 merged the former HeroWide/HeroNarrow twins—their markup was identical). No screenshot—the screenshot is rendered by `ProjectLayout` below the hero. The hero does not render the `kicker` tag row; that content lives in the `Topics` column of the metadata strip below.
- **`src/components/MetadataStrip.astro`**: Strip-only—four `<dt>`/`<dd>` pairs for topics, format, focus, and status (in that visual order). Does not own the screenshot; does not accept `screenshotSrc`/`screenshotAlt`/`screenshotAspect` props. The `topics` value is derived in `ProjectLayout` from the project's `kicker` frontmatter (split on `×` and re-joined with ` · ` to match the metadata table's separator convention). The `status` value is the project's top-level `status` enum, rendered identically on the index card kicker and in the metadata strip—single short-form vocabulary across both surfaces. The strip is always rendered as a single 4-column horizontal row on desktop and collapses responsively (2×2 at ≤768px, 1-column at ≤480px) via `.metadata-strip--grid-4` media queries.
- **`src/components/projects/DecisionLedger.astro`**, **`ConstraintStrip.astro`**, **`LearningLedger.astro`**: Case-study components authored into the Markdown body of an `.mdx` project page, each reading its field off `props` (`decisions`, `constraints`, `learnings`). Normalize internally (`decisions ?? []`) and render nothing when their array is empty, so the empty-state check lives in one place rather than at every call site. See § Decisions, constraints, and learnings for the field contract.

### Content collection schema

Defined in `src/content.config.ts`. Uses Astro's glob loader and Zod validation, with the loader pattern `**/*.{md,mdx}`—the `projects` collection is the only one that accepts `.mdx`, because it is the only one whose pages need to place a component mid-body. The `render()` function is imported from `astro:content` (not called on the entry):

```ts
import { render } from 'astro:content';
const { Content } = await render(project);
```

### Index page

`src/pages/projects/index.astro` queries the collection with `getCollection('projects')`, sorts by `data.order`, and renders a Mondrian-style grid. Adding a new `.md` or `.mdx` file with valid frontmatter automatically adds it to the index.

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
src/content/projects/*.{md,mdx}           Project source files (frontmatter + body; .mdx only if the body places a case-study component)
src/content.config.ts                     Collection schema (Zod)
src/pages/projects/[slug].astro           Dynamic route + JSON-LD; forwards decisions/constraints/learnings as props
src/pages/projects/index.astro            Project index grid
src/layouts/ProjectLayout.astro           Layout wrapper (CSS props, hero, metadata, footer)
src/components/ProjectHero.astro          Hero header, wide|narrow variant (no screenshot)
src/components/MetadataStrip.astro        4-column metadata strip (topics/format/focus/status)
src/components/projects/DecisionLedger.astro   Case-study decision ledger, reads props.decisions
src/components/projects/ConstraintStrip.astro  Constraint chips, reads props.constraints
src/components/projects/LearningLedger.astro   Learning ledger, reads props.learnings
src/styles/global.css                     All project page styles (.metadata-strip, .project-screenshot, .project-stack)
public/images/projects/                   Hero screenshots
```
