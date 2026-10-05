<!--
generated_by: scripts/project-doc-sync.sh
do_not_edit: true
source_repo: nathanjohnpayne/docs
source_path: projects/nathanpaynedotcom/prds/nathanpaynedotcom.md
source_ref: 38b09e7
project: nathanpaynedotcom
document_class: prd
document_slug: nathanpaynedotcom
sync_direction: central-to-repo
-->

---
tags:
  - nathanpaynedotcom
  - prd
  - portfolio
  - astro
  - static-site
---
# Product Requirements Document: nathanpayne.com

**Author:** Nathan Payne
**Status:** Approved - living document
**Last Updated:** 2026-06-17

---

## Executive Summary

**nathanpayne.com** is Nathan Payne's public portfolio, project case-study, resume,
and editorial site. It is built as a static Astro site and deployed to Firebase
Hosting, with Cloudflare in front. The product goal is to make Nathan's work,
writing, and operating style legible to human readers while keeping the site
easy for agents to maintain without drifting across copy, metadata, analytics,
and generated assets.

The site combines:

1. A Mondrian-inspired homepage interaction model
2. Structured Astro content collections for blog posts, projects, resume data,
   and supporting content
3. Build-time Open Graph image generation and sitemap/robots validation
4. SEO, RSS, JSON-LD, GA4, and PostHog instrumentation
5. A multi-identity AI agent review workflow inherited from Mergepath
6. A strict source-of-truth split: repository code/specs live in
   `nathanpaynedotcom`; product PRDs and long-lived planning live in this docs
   vault

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Solution Overview](#solution-overview)
3. [Repository Map](#repository-map)
4. [Product Surfaces](#product-surfaces)
5. [Content and Metadata Architecture](#content-and-metadata-architecture)
6. [Design System](#design-system)
7. [Governance and Drift Prevention](#governance-and-drift-prevention)
8. [Active Product Work](#active-product-work)
9. [Key Design Decisions](#key-design-decisions)

---

## Problem Statement

### The Public Portfolio Problem

The site has to serve several audiences at once: hiring managers, collaborators,
technical peers, and people arriving from a single blog post or project link.
Those visitors need enough context to understand the work without forcing every
page to behave like a marketing landing page.

The core tension is that the site is both a product surface and a living archive.
It needs to stay polished and current, but it also changes often: blog posts,
project pages, resume content, analytics, metadata, screenshots, and deploy
plumbing all move at different cadences.

### The Cross-Surface Consistency Problem

Small edits frequently affect more than the visible page:

- Page titles, SEO titles, Open Graph copy, RSS output, sitemap entries, and
  JSON-LD may all need to move together.
- Project copy appears on homepage, project index, project detail, resume, and
  related-link surfaces.
- Resume changes can affect both screen rendering and print/PDF output.
- Analytics events must stay stable enough to compare behavior over time.

The product needs a maintenance model that catches those secondary surfaces
instead of relying on an agent to remember them.

### The Documentation Drift Problem

The repo used to carry root-level `bugs/` notes for active audits. That made the
application repo a mixed codebase/planning vault and duplicated the role of this
central docs project area. Active narrative findings should live here. Raw
screenshot evidence can remain in the app repo under `.github/screenshots/` when
it is needed for PRs, issues, and generated audits.

---

## Solution Overview

### Static Astro Site

Astro renders the site to static HTML, CSS, and JavaScript. There is no server
runtime. Firebase Hosting serves `dist/`, and the deploy flow is 1Password-backed
through the repo's Mergepath-derived deployment process.

### Structured Content Collections

Markdown and YAML content collections are the main authoring model:

- Blog posts live in `src/content/blog/`.
- Project case studies live in `src/content/projects/`.
- Resume data lives in focused collections under `src/content/`.
- Content schemas in `src/content.config.ts` validate frontmatter at build time.

### Mondrian Product Identity

The homepage is a geometric Mondrian-inspired composition with four panels:
Identity, Work, Community, and Contact. Desktop users get a measured grid-morph
interaction. Tablet and mobile users get a readable stacked layout with content
always visible.

### Build-Time Verification

The repo treats generated surfaces as product contracts:

- Open Graph images are generated during build and checked by tests.
- `robots.txt` is rewritten to point at the actual generated sitemap.
- SEO metadata, canonical URLs, JSON-LD, RSS links, and sitemap behavior are
  tested.
- Header typography can be audited with `scripts/audit/header-audit.mjs`, which
  writes evidence under `.github/screenshots/header-audit/`.

### Agent Governance

The repo inherits the Mergepath multi-identity review model. Agents author as
`nathanjohnpayne`, review under their own reviewer identities, and route PRs
through the repository review policy before merge.

---

## Repository Map

```text
README.md
AGENTS.md
REVIEW_POLICY.md
DEPLOYMENT.md
.ai_context.md
rules/repo_rules.md
docs/agents/
specs/
plans/
scripts/
src/
  pages/
  layouts/
  components/
  content/
  integrations/
  plugins/
  styles/
public/
tests/
.github/screenshots/
screenshots/og/
```

The application repo should not grow ad hoc planning folders. Long-lived product
strategy and audit narratives belong in this docs vault under
`projects/nathanpaynedotcom/`.

---

## Product Surfaces

### Homepage

The homepage is the primary identity surface. It presents four panels in
narrative order:

1. Identity
2. Work
3. Community
4. Contact

The interaction model must remain readable first. Motion supports the identity;
it is not the product.

### Blog

The blog hosts long-form essays and technical notes. Blog posts need strong
metadata, RSS inclusion, stable canonical URLs, and readable layouts across
desktop, tablet, mobile, and print-adjacent capture contexts.

### Projects

Project pages are case studies generated from content collections. The project
index, homepage links, detail pages, metadata strips, related links, and JSON-LD
must stay in sync from one source file per project.

### Resume

The resume is a native web page built from content collections and section
components. It must work as a screen experience and remain print/PDF-sensitive.

### 404, RSS, SEO, and Social Metadata

Secondary surfaces are part of the product contract. They should be audited when
copy, route, title, metadata, or image-generation behavior changes.

---

## Content and Metadata Architecture

Content changes should prefer structured sources over repeated markup. A page
copy change is incomplete if downstream metadata still advertises the previous
name, title, description, or canonical path.

Primary contracts:

- `src/content.config.ts` defines collection schemas.
- `src/layouts/BaseLayout.astro` owns page metadata and shared analytics wiring.
- `src/integrations/og-images.mjs` owns generated Open Graph image output.
- `src/integrations/robots-sitemap.mjs` owns the generated sitemap declaration.
- Tests under `tests/` enforce metadata, route, analytics, and generated-asset
  invariants.

---

## Design System

The visual system is restrained and type-led:

- Cormorant Garamond for headings and editorial display type
- Inter for body and interface text
- A 1921 default color register, with the homepage opting into a higher-chroma
  1930 register
- CSS custom properties for color, motion, breakpoints, and spacing primitives
- Fluid typography with `clamp()` rather than fixed breakpoint overrides
- Motion tokens for all transition timing and easing

Design changes should preserve the distinction between product identity and
layout utility: the homepage can be expressive, while blog, project, and resume
surfaces should remain quiet, readable, and durable.

---

## Governance and Drift Prevention

### Source of Truth

The repository is the source of truth for implementation, local specs, tests,
agent instructions, and deploy procedure. This docs vault is the source of truth
for product PRDs, longer design rationale, and active audit narratives.

If a mismatch appears between this PRD and the repository, resolve it in the
same change that surfaces the mismatch. Neither document silently overrides the
other.

### Folder Policy

The old root-level `bugs/` folder is retired. Use:

- `.github/screenshots/bugs/` for raw historical issue evidence
- `.github/screenshots/header-audit/` for generated header-audit output
- `projects/nathanpaynedotcom/prds/` in this docs vault for active product
  findings and decision records
- `specs/` in the application repo for implementation contracts tied to tests

---

## Active Product Work

### Header Typography and Rhythm Audit

This section preserves the active findings migrated from the retired June 2026
header-audit note and follow-up note. Generated evidence now lives in the
application repo at `.github/screenshots/header-audit/`.

#### 1. Italic headings need real italic faces

The base layout loaded only upright Cormorant Garamond cuts while several
heading rules used `font-style: italic`. Browsers synthesized a slanted upright
instead of rendering true italics.

Recommended fix: add the italic axis to the font loading strategy, or remove
italic heading treatments deliberately.

#### 2. Eyebrow headings need an accessibility floor

Small uppercase eyebrow headings rendered around 9.3-10.9px with low-contrast
ink. That is below a practical reading floor and can fail WCAG AA at normal text
sizes.

Recommended fix: raise the size floor to at least `0.7rem` and darken the text
to a contrast-safe token.

#### 3. Heading scale should be tokenized

Homepage, listing, project, blog, resume, and 404 headings each carried local
font-size, weight, line-height, and tracking choices. The result was a family of
almost-matching treatments with no shared scale.

Recommended fix: define display/page/article heading tokens in `:root` and
migrate one page family per PR, matching the existing motion-token discipline.

#### 4. Wrapped headings need safer line heights

Sub-1.0 line heights on headings are safe only while copy stays single-line.
Project and listing headings can wrap, making Cormorant ascenders and descenders
visually collide.

Recommended fix: reserve sub-1.0 line-height only for enforced single-line
display text, and use safer heading tokens where wrapping is possible.

#### 5. Body-section h2 treatments should converge

Project copy, blog prose, resume sections, and homepage sections all represent
similar structural roles but render with different sizes, italics, weights, and
divider rules.

Recommended fix: treat this as part of the heading tokenization pass rather than
patching each selector independently.

#### 6. Dead and orphaned heading hooks should be removed or wired

The old audit identified dead/orphaned hooks, including an unused
`.blog-prose-title` rule and project title classes whose styling came only from
descendant selectors.

Recommended fix: remove dead selectors or make classes carry the style contract
directly when the relevant file is next touched.

#### 7. Fixed mobile font overrides violate the repo convention

The repo convention says typography should use fluid sizing and avoid fixed
breakpoint font overrides. At the time of the audit, a project hero mobile rule
used a fixed `1.75rem` size.

Recommended fix: replace fixed mobile overrides with bounded `clamp()` values.

#### 8. Blog post header alignment had one real bug

`BlogPost.astro` reused project-hero inset variants for breadcrumbs and deck
copy, but not for the h1 and without the project-page accent bar. The result was
an internally misaligned blog post header.

Recommended fix: remove the `--inset` variants from the blog post header or add
a local blog-header rule that aligns the entire stack intentionally.

#### 9. Vertical rhythm should follow the same token discipline

The audit found many sub-rem raw margin values bypassing the `--su` spacing
primitive. That is the same class of drift as the heading scale.

Recommended fix: fold vertical rhythm into the heading/token pass instead of
turning it into a separate scattershot cleanup.

#### 10. Font loading can be simplified

Inter 300 appeared to be unused in site CSS, while equivalent self-hosted font
assets already existed for OG rendering. Visitors still paid the Google Fonts
chain.

Recommended fix: consider self-hosting visitor-facing web fonts and only loading
the weights/styles the site actually uses.

---

## Key Design Decisions

### Keep the Site Static

The site should remain static unless a future requirement truly needs runtime
server behavior. Static output keeps the deployment simple, cacheable, and easy
for agents to verify locally.

### Prefer Structured Content

Project, blog, resume, SEO, and generated metadata should flow from structured
sources rather than repeated page-local strings.

### Treat Secondary Surfaces as Product

RSS, sitemap, Open Graph, JSON-LD, analytics, and print output are not afterthoughts.
They are product surfaces and should be verified whenever the corresponding
source changes.

### Keep Planning Out of the App Repo

Root-level scratch folders in the application repo invite drift. Active product
planning belongs in this central docs project area. App-repo docs should be
implementation contracts, agent instructions, deploy docs, and test-backed specs.
