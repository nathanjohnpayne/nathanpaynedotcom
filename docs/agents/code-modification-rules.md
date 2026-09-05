# Code Modification Rules

### Design Tokens

#### Color

Plane colors are split into two *registers* (#499/#500). `:root` carries the
1921 register—the interior default for every page:

```
--ink:        #11100d        (near-black text)
--paper:      #ffffff        (white background)
--red:        #e8784a        (red plane, 1921 register)
--yellow:     #e3d477        (yellow plane, 1921 register)
--blue:       #2080ca        (blue plane, 1921 register)
--gray-plane: #dde1e5        (gray plane)
--rule:       var(--ink-18)  (divider/border—18% ink via the --ink-NN ramp, #466/#503)
--cream:      #f5f0e4        (light background)
--surface:    rgba(244, 239, 229, 0.96) (semi-transparent)
--grid-border: #1a1814       (separator color)
```

A `[data-palette="1930"]` block overrides the three primary planes with the
high-chroma 1930 register:

```
--red:       #da2418
--yellow:    #f0c800
--blue:      #0a5c9e
```

The opt-in is per page: `BaseLayout` accepts a `dataPalette?: '1930'` prop
and stamps `data-palette` on `<html>` and `<body>`. Only the homepage
(`src/pages/index.astro`) passes `dataPalette="1930"`; its build-time OG
card (`og-templates/home.astro`) passes the matching `palette="1930"` prop
to `OgCard.astro` so `home.png` renders in the same register (#504). All
other pages and OG cards stay on the 1921 `:root` default. Never hard-code
register hexes in page styles—reference the tokens so `data-palette`
controls what the plane tokens resolve to.

All cells transition to a warm parchment tone when opened.

#### Layout
```
--line:      9px        (grid line width, 6px on mobile)
--su:        0.42rem    (spacing unit)
```

#### Motion—Durations
```
--motion-fast:           130ms  (metadata, dividers)
--motion-hover:          170ms  (hover states)
--motion-plane:          460ms  (panel expand / grid morph; bumped from 280ms in #313 for a smoother row/column re-flow that reduces hover wobble at row-line boundaries)
--motion-load:           300ms  (section entrance)
--pulse-initial-delay:   300ms  (delay before on-load pulse sequence fires; removed --motion-pulse in #306)
--pulse-interval:        370ms  (time between successive panel pulse starts)
--pulse-duration:        250ms  (per-panel brightness/saturation breath)
```

#### Motion—Easing
```
--ease-standard: cubic-bezier(0.4, 0.0, 0.2, 1)   (hovers, general interaction)
--ease-sharp:    cubic-bezier(0.2, 0.8, 0.2, 1)    (reserved; not used by panel/grid morph after #313 / #314)
--ease-linear:   linear                              (metadata, dividers)
```

#### Motion—Magnitude
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
| Panel morph | `--motion-plane` (460ms) | `--ease-standard` | Mondrian grid transitions (bumped from 280ms / `--ease-sharp` in #313) |
| Settle on load | (superseded by panel-pulse, #305) |—| Was `--motion-plane` + `--ease-standard`; replaced by the on-load pulse below |
| Section load | `--motion-load` (300ms) | `--ease-standard` | Entrance animations |
| On-load pulse (delay) | `--pulse-initial-delay` (300ms) | n/a | Pause after label fade-in before sequence fires (#306) |
| On-load pulse (interval) | `--pulse-interval` (370ms) | n/a | Time between successive panel pulse starts |
| On-load pulse (per-panel) | `--pulse-duration` (250ms) | `--ease-out` | Per-panel brightness/saturation breath |

#### Scroll Guard
JavaScript adds `.is-scrolling` to `<body>` during active scroll (debounced at 100ms). CSS suspends hover transitions on interactive elements while this class is present, preventing scroll + hover easing conflicts.

#### Reduced Motion
`@media (prefers-reduced-motion: reduce)` sets `transition-duration: 0ms` and `animation-duration: 0ms` on all elements (`*`, `*::before`, `*::after`) universally.

### Framework Rules
**Astro is the framework.** Do not introduce additional frameworks, client-side runtimes, or bundlers without explicit discussion and a `plans/` entry. New npm dependencies require explicit discussion.

### Mermaid Accessibility

Every Mermaid diagram is authored with a short accessible title and a relational description. Inline fences use whitespace-separated `title="..." description="..."` metadata; sidebar Mermaid items use required `title` and `description` frontmatter fields. Describe the relationships or conclusion conveyed by the diagram, not merely its list of nodes. Missing metadata or adjacent attributes without a separator are build errors.

Both surfaces also take an **optional `caption`**, and it is a different kind of thing from the other two: `title` and `description` are hidden accessibility metadata, and the caption is visible text rendered as a `<figcaption>` under the diagram (#989). An empty `caption=""` is a build error. It is never folded into the accessible name or description; repeat it in `title=` or `description=` if a screen reader should hear it there too.

**Write a caption only when it adds information the diagram's title and the surrounding prose do not carry, or when the diagram's visual form would otherwise imply a materially different claim from the one the surrounding prose makes.** The second clause is narrow on purpose (#996): it licenses a *correction to a misreading the figure itself generates*, never a summary and never context that merely happens to be useful. "Someone might skim this" is not a reason: a figure is always read out of the flow, so that argument would admit every redundant caption and bar nothing.

| Case | Caption |
|---|---|
| Restates the title, the description, or an adjacent paragraph | No |
| Useful context that already sits immediately above or below the figure | No |
| "A reader might meet the figure out of the flow" | No |
| The diagram's shape asserts something materially stronger or other than the prose claims | **Yes** |
| A qualification that governs how to read *this figure* specifically | **Yes** |

The two cases that produced this rule diverge under it, which is how you can tell it is doing work. `html-mockups-as-spec` draws two loops side by side (the visual grammar of a controlled comparison) while the post says the attempts were sequential and establish no measured property; that caption is a correction to an inference the figure creates, and it stays. `six-prs-one-bug-agent-failure-modes` had a caption that, once a causal error in it was fixed, said exactly what the paragraph above it said, and the diagram made no contradictory claim of its own; that one was cut and stays cut.

This is a judgement, not a check. Nothing in CI can ask whether a diagram's shape overstates its prose, so the rule lives here and is applied in review, which is where both of its founding cases were in fact caught.

Every explicit Mermaid node fill and label color uses three- or six-digit hex colors whose WCAG contrast ratio is at least 4.5:1. Tests measure the rendered SVG rather than parsing Mermaid source syntax.

Mermaid is supported in blog posts under `src/content/blog/**/*.md` and in project pages under `src/content/projects/**/*.{md,mdx}` (#753). The globally registered metadata adapter rejects Mermaid fences in every other content collection and Markdown page. Adding a third collection means extending three things together, not one: the adapter's allow-list, the rendered-contrast sweep in `tests/mermaid-contrast.test.js`, and the route list in `tests/responsive/mermaid-accessibility.spec.ts`. A collection allowed in the adapter but absent from the other two ships diagrams nothing checks.

### Credential Hygiene
- This repo should not contain API keys, service-account JSON, or ADC credentials. Public client identifiers (GA Measurement ID, Logo.dev publishable token, PostHog `phc_`) are public-by-design but still env-injected via `.env.tpl`/`op inject` and never hardcoded; anything that can read or manage data is a secret and likewise never committed.
- Deploy auth is keyless and 1Password-backed: `op-firebase-deploy` creates short-lived impersonated credentials from `op://Private/c2v6emkwppjzjjaq2bdqk3wnlm/credential`, another explicit `GOOGLE_APPLICATION_CREDENTIALS` file, or CI-provided external-account credentials.
- The 1Password-first deploy-auth model is a deliberate repository invariant. Do not switch this repo back to ADC-first, routine browser-login, `firebase login`, or long-lived deploy-key auth without explicit human approval.
- Routine deploys and `gcloud` work should not require browser login once the shared 1Password source credential exists. If that credential itself needs rotation, refresh it once and update the 1Password item. If impersonation bindings drift, rerun `op-firebase-setup nathanpaynedotcom`.
- If you add Firebase or third-party API keys later, keep them in ignored config files, not in source.

### Typography
- **Headings / labels:** Cormorant Garamond (serif), weights 400–700.
- **Body / UI:** Inter (sans-serif), weights 300–700.
- Loaded via Google Fonts with `preconnect`.
- Do not change typefaces or add new font loads without explicit discussion.

---

## Project Conventions

### Stack

Astro (static site generator) with vanilla CSS and minimal client-side JavaScript. Build outputs to `dist/`, deployed to Firebase Hosting.

### Files

All source lives in `src/`:
- **Pages:** `src/pages/` (Astro routing—each `.astro` file becomes a route)
- **Layouts:** `src/layouts/` (BaseLayout, BlogPost, ProjectLayout, OgCard)
- **Content:** `src/content/blog/**/*.md` (Markdown blog posts with Zod-validated frontmatter)
- **Styles:** `src/styles/global.css` (single global stylesheet)
- **Plugins:** `src/plugins/` (Remark and Rehype processors for markdown)
- **Integrations:** `src/integrations/` (build-time OG image generation)

Static assets (favicons, robots.txt, OG fonts) live in `public/` and are copied verbatim to `dist/`.

### CSS

- Design tokens in `:root`—always use or extend them.
- **Selector naming:** loose BEM (block / `__element` / `--modifier`) with `.is-*` state classes; the canonical convention block, including the `p-`/`s-`/`e-`/`og-` prefix glossary, lives at the top of `src/styles/global.css` (#473).
- **Motion system:** All durations use `--motion-fast` / `--motion-hover` / `--motion-plane` / `--motion-load`. All easing uses `--ease-standard` / `--ease-sharp` / `--ease-linear`. Translation magnitude uses `--shift-small` / `--shift-medium`. No hard-coded `ms` values or bare `ease` keywords.
- Homepage panel states are driven by `data-focus` attribute on the grid container. CSS defines `grid-template-columns` + `grid-template-rows` for each `data-focus` value.
- Fluid sizing via `clamp()`; no fixed-breakpoint font overrides.
- Homepage stack breakpoint at `@media (max-width: 1023px)` (token: `--bp-stack: 1024px`); see #313 / #314 for the move from the prior 920px and the wide-viewport `--mondrian-max-width: 1280px` cap.
- Respect `prefers-reduced-motion: reduce`—universal `*` selector zeroes all transition/animation durations.
- Use `:focus-visible` (not `:focus`) for keyboard outlines.

### Astro Pages

- Semantic elements (`<main>`, `<section>`, `<article>`).
- ARIA: `role="region"` + `aria-label` on panels; `aria-hidden="true"` on decorative blocks.
- External links: `target="_blank" rel="noopener"`.
- Inline SVG for icons—no icon fonts or sprite sheets.

### Markdown / Content Collections

- Blog posts use Astro Content Collections with a Zod schema defined in `src/content.config.ts`.
- Blog frontmatter includes: `title`, `seoTitle` (optional), `shortTitle` (optional), `description`, `seoDescription` (optional), `category` (required enum), `featured` (defaults to `false`), `author`, `date`, `tags`, `image`, `draft`, `pullquotes`, `sidebar`.
- Project frontmatter carries three description fields and they are not interchangeable. `description` is the detail-page hero deck and the meta description. `cardDescription` (optional) is the `/projects/` index card line, and falls back to `description` when absent—it exists because one field cannot serve both a hero paragraph and a card in a seven-up grid, and sharing it made every hero edit a card edit (#751). `seoDescription` (optional) is the search snippet, for when the hero deck is longer than a snippet should be. A card line should give one reason to open the page—a decision, a constraint, an outcome—not a feature list or a stack summary; `stack` already carries the technology roster.
- `githubUrl` and `liveUrl` are both **optional**, and omitting one suppresses its CTA rather than rendering a link that fails. Omit `liveUrl` on a project with nothing deployed; omit `githubUrl` when the repository is **private**, where a published link returns GitHub's 404 to every reader but the owner. A project that sets `heroRefresh: 'github-social'` must still supply `githubUrl` — the schema rejects that pairing, because the refresh reads that URL and would otherwise leave the hero silently stale (#874).
- The live CTA's label is `liveLabel`, optional, defaulting to "View Live Product". Override it only when the link does not open the product—Device Source of Truth is `ARCHIVED` and its live link reaches a synthetic-data demo, so it says "View Demo" and the two states stop looking contradictory. The schema rejects `liveLabel` without `liveUrl`.
- **Lifecycle state renders as a mark plus the word, and the mapping lives in one module.** `src/lib/lifecycle-marker.ts` maps the `status` enum to a `.state-marker--*` modifier; the homepage Builds row, the `/projects/` card kicker, the detail page's STATUS cell, and the résumé's Projects kicker (`src/components/resume/ProjectsSection.astro`, #944) all import `stateMarkerClass()` from it. That list is pinned in `tests/lifecycle-marker.test.js`, which fails if a named surface stops importing the module — so adding a fifth surface means adding it there too, and this sentence cannot quietly go stale the way it did when the résumé became the fourth. Do not re-declare the mapping in a page—`tests/lifecycle-marker.test.js` fails a second copy under `src/`. On a detail page the mark belongs to the STATUS cell and nowhere else: not beside the `h1`, not in the breadcrumb, not on the CTA. On the résumé it belongs to the Projects section and nowhere else — not to employment history, skills, education, certifications, or writing; the vocabulary means product/project lifecycle state and keeps that precision only by not spreading (specs/resume.md § Projects). `.state-marker` is `em`-sized so it tracks its label; do not give a surface its own size override, and do not give one its own print override either — the `print-color-adjust: exact` that keeps the four marks distinguishable on paper belongs to `.state-marker::before` unqualified, because three of the four marks are backgrounds and Chrome prints with "Background graphics" off by default. It was scoped to `.resume-canvas` from #944 until #950, which is exactly how the other three surfaces came to print one shape for four states. See specs/project-pages.md § Lifecycle marker.
- Project frontmatter may carry an optional `screenshotSecondary: { src, alt, width, height }` to render a second capture beside `screenshotSrc`. All four keys are required when the field is present—`alt` because the companion has no title-derived fallback, `width`/`height` because it is lazy-loaded below the primary on phones and would otherwise shift the page in. See specs/project-pages.md § Paired screenshots.
- Project posts declare a semantic `accent` token (`red`, `yellow`, `paper`, `blue`, `black`), but do not choose it freely: the accent is `RAMP[order % 5]` along the fixed ramp red → yellow → paper → blue → black, enforced by `tests/project-pages.test.js`. See specs/project-pages.md § Accent ramp. Do not add raw project palette hex fields such as `accentColor`, `gradientFrom`, or `gradientTo`; CSS derives those colors from `data-accent`.
- Project frontmatter may carry an optional `screenshotDarkSurface: boolean` when the hero art itself (not the project's accent) needs a dark figure surface to be legible—Matchline's white-fill wordmark SVG is the only current case. This is an artwork property, not an accent property: `accent` is derived from `order` and can move on a reorder, so the dark treatment must not be re-coupled to it (#784). See specs/project-pages.md § Dark screenshot surface.
- Project frontmatter may carry three optional case-study arrays, each defaulting to `[]`: `decisions` (`title`, `context`, `rationale`, `evidence`, `status`, plus optional `lens`, `chosen`, `cost` and `rejected`), `constraints` (`value`, `label`), and `learnings` (`expected`, `observed`, `response`). `status` is one of `validated`, `mixed`, `revised`, `pending`, and those four are **peers**—`validated` must not be styled as success, nor the other three as errors. `evidence` is required for every status including `pending`, where it carries the validation boundary rather than an outcome, and it must never restate `rationale`. The semantic contract that keeps seven pages classifying the same situation the same way lives in specs/project-pages.md § Decisions, constraints, and learnings; read it before authoring a record. Authoring `chosen` switches the record to the assertion anatomy and obliges `cost`—`tests/content-schema.test.js` fails a record that declares one without the other, and a record on the original shape still owes `rejected`.
- **The `projects` collection is the only one whose glob accepts `.mdx`** (`**/*.{md,mdx}`). A project needs `.mdx` only when its body places `DecisionLedger`, `ConstraintStrip`, or `LearningLedger` between prose sections, which a single `<slot />` cannot do; plain `.md` remains the default and stays valid.
- **Inside an `.mdx` body, read these fields as `props.X`, never `frontmatter.X`.** `frontmatter` is the raw YAML that Zod has not validated, so `.optional().default([])` does not apply on that path and an absent key reads as `undefined`. `src/pages/projects/[slug].astro` forwards the validated values on `<Content />`; a bare identifier throws a `ReferenceError`. Evidence: plans/759/component-placement-decision.md.
- `rehype-mermaid` renders supported ` ```mermaid ` code blocks to static inline SVG during the Markdown build. A small adapter preserves required accessible metadata and rejects fences outside `src/content/blog/**/*.md` and `src/content/projects/**/*.{md,mdx}`; it does not parse Mermaid grammar. Sidebar items use the same maintained renderer. No Mermaid runtime ships to visitors.
- Custom Rehype plugin wraps standalone images in `<figure>` with auto-numbered `<figcaption>`.

### Build & Dev

- **Dev server:** `npm run dev` (Astro dev server with HMR)
- **Build:** `npm run build` (outputs to `dist/`)
- **Tests:** `npm run test` (builds, then runs Vitest); `npm run test:e2e` (Playwright)
- **Deploy:** `op-firebase-deploy` (never `firebase deploy` directly)

---
