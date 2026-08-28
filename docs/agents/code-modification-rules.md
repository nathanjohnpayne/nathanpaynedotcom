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

Every explicit Mermaid node fill and label color uses three- or six-digit hex colors whose WCAG contrast ratio is at least 4.5:1. Tests measure the rendered SVG rather than parsing Mermaid source syntax.

Mermaid is supported only in blog posts under `src/content/blog/**/*.md`. The globally registered metadata adapter rejects Mermaid fences in every other content collection and Markdown page.

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
- Project frontmatter includes optional `seoDescription`; use it when a project card/hero description is intentionally longer than a search snippet should be.
- Project frontmatter may carry an optional `screenshotSecondary: { src, alt, width, height }` to render a second capture beside `screenshotSrc`. All four keys are required when the field is present—`alt` because the companion has no title-derived fallback, `width`/`height` because it is lazy-loaded below the primary on phones and would otherwise shift the page in. See specs/project-pages.md § Paired screenshots.
- Project posts declare a semantic `accent` token (`red`, `yellow`, `paper`, `blue`, `black`), but do not choose it freely: the accent is `RAMP[order % 5]` along the fixed ramp red → yellow → paper → blue → black, enforced by `tests/project-pages.test.js`. See specs/project-pages.md § Accent ramp. Do not add raw project palette hex fields such as `accentColor`, `gradientFrom`, or `gradientTo`; CSS derives those colors from `data-accent`.
- Project frontmatter may carry three optional case-study arrays, each defaulting to `[]`: `decisions` (`title`, `context`, `rationale`, `evidence`, `status`, plus optional `lens`, `chosen`, `cost` and `rejected`), `constraints` (`value`, `label`), and `learnings` (`expected`, `observed`, `response`). `status` is one of `validated`, `mixed`, `revised`, `pending`, and those four are **peers**—`validated` must not be styled as success, nor the other three as errors. `evidence` is required for every status including `pending`, where it carries the validation boundary rather than an outcome, and it must never restate `rationale`. The semantic contract that keeps seven pages classifying the same situation the same way lives in specs/project-pages.md § Decisions, constraints, and learnings; read it before authoring a record. Authoring `chosen` switches the record to the assertion anatomy and obliges `cost`—`tests/content-schema.test.js` fails a record that declares one without the other, and a record on the original shape still owes `rejected`.
- **The `projects` collection is the only one whose glob accepts `.mdx`** (`**/*.{md,mdx}`). A project needs `.mdx` only when its body places `DecisionLedger`, `ConstraintStrip`, or `LearningLedger` between prose sections, which a single `<slot />` cannot do; plain `.md` remains the default and stays valid.
- **Inside an `.mdx` body, read these fields as `props.X`, never `frontmatter.X`.** `frontmatter` is the raw YAML that Zod has not validated, so `.optional().default([])` does not apply on that path and an absent key reads as `undefined`. `src/pages/projects/[slug].astro` forwards the validated values on `<Content />`; a bare identifier throws a `ReferenceError`. Evidence: plans/759/component-placement-decision.md.
- `rehype-mermaid` renders supported blog ` ```mermaid ` code blocks to static inline SVG during the Markdown build. A small adapter preserves required accessible metadata and rejects fences outside `src/content/blog/**/*.md`; it does not parse Mermaid grammar. Sidebar items use the same maintained renderer. No Mermaid runtime ships to visitors.
- Custom Rehype plugin wraps standalone images in `<figure>` with auto-numbered `<figcaption>`.

### Build & Dev

- **Dev server:** `npm run dev` (Astro dev server with HMR)
- **Build:** `npm run build` (outputs to `dist/`)
- **Tests:** `npm run test` (builds, then runs Vitest); `npm run test:e2e` (Playwright)
- **Deploy:** `op-firebase-deploy` (never `firebase deploy` directly)

---
