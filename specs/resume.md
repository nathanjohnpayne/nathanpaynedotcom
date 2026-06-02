---
spec_id: resume
title: Resume Page
---

# Resume Page

Specification for the `/resume` route — Nathan Payne's resume rendered as
native content from this repo's content collections and small section
components, styled to match the editorial reading layout (blog/project
pages), not the homepage Mondrian grid. See issue #394.

The paired smoke test is `tests/resume.test.js`. This spec is the contract;
the test verifies the structural invariants below against the built
`dist/resume/index.html` and the emitted stylesheet.

---

## Data source — content collections

The page is driven entirely by collections defined inline in
`src/content.config.ts` using the `glob()` loader (the same Astro 6 API as
`blog`/`projects`/`bio`). A resume edit is therefore a one-file change. The
collections are:

| Collection | Dir | Shape | Notes |
|---|---|---|---|
| `myself` | `src/content/myself/` | single `.md` entry | Header fields + two-paragraph summary in the body. **No `phone`** — email-only. |
| `skills` | `src/content/skills/` | one `.yaml` per category | `{ label, priority, skills[] }`. Five categories. |
| `experience` | `src/content/experience/` | one `.md` per role | Six entries. Bullets / paragraph in the body. |
| `education` | `src/content/education/` | one `.md` | One entry (George Mason). |
| `certifications` | `src/content/certifications/` | one `.md` per cert | Three entries. |
| `resumeProjects` | `src/content/resume/projects/` | one `.md` per project | Five entries. **Distinct from `projects`** (reserved for `/projects`). |
| `awards` | `src/content/awards/` | one `.md`/`.yaml` per award | Wired up but **empty** for now. |

The `resumeProjects` collection must remain separate from the existing
`projects` collection; the two have different schemas and surfaces.

## Route & composition

- Mounted at `src/pages/resume.astro`; served at `/resume/`
  (`format: 'directory'`).
- A header renders the name (`<h1>`), title, and a contact line composed
  from the `myself` handles (full URLs built in the page).
- Sections compose in this order: **Summary, Core Skills, Experience,
  Education, Certifications, Selected Projects, Writing, Awards.**
  - `AwardsSection` renders **nothing** (no header) while the `awards`
    collection is empty.
  - There is **no References section.**
- Collection bodies (summary, experience, projects) render via `render()`
  from `astro:content`.
- **Writing** is a compact inline section (no collection) linking the blog
  and the two selected essays.

## Semantics & structure

- Single-column document — one `.resume-document` container; sections are
  linear (no Mondrian grid, no sidebar).
- Each section has a semantic `<h2>` title.
- Each Experience role, Education degree, and Project has a semantic `<h3>`.
- Experience entries with bullets render them as a `<ul>` of `<li>`.
- Title is `Nathan Payne | Resume`; the page has a resolvable `og:image`
  and a dedicated one-line meta/OG description.
- A `Person` + `ProfilePage` JSON-LD graph is emitted.

## Brand logos (Logo.dev)

- A single `CompanyLogo.astro` (vanilla Astro, no React) renders the logo
  for each **Experience role, the Education entry, and each Certification**
  (keyed off company / school / issuer). Projects and skills get no logo;
  there are no decorative section-title icons.
- Resolution: explicit `logo` override → Logo.dev `website` domain lookup
  (with a `name` lookup then styled initials as the inline `onerror`
  cascade) → if neither `logo` nor `website` is set, styled initials
  directly (no speculative name lookup).
- The Logo.dev publishable token comes from `PUBLIC_LOGODEV_KEY`
  (`import.meta.env`); if unset the component renders initials only. The
  token is never committed.
- Defunct brands with no live domain use a self-hosted Commons SVG via the
  `logo` override: Current TV → `/images/logos/current-tv.svg`, Turner →
  `/images/logos/turner.svg`.
- The logo is **decorative** (the company/school/issuer name is the
  semantic text); each `CompanyLogo` includes an initials fallback element.

## Styling

- Anchored to the project/blog reading surface: consumes the site tokens
  (`--ink`, `--cream`/`--surface`, `--paper`, `--rule`) and the Cormorant
  Garamond + Inter pairing — it does not redefine them or import new fonts.
- In-content links use the darker ochre treatment (not bright blue), with
  the `→` arrow convention on the project and writing links.
- Skills render as inline `·`-joined lists.
- Any transition uses the `--motion-*`/`--ease-*` tokens (no bare `ms`/`ease`).

## Print (two-page PDF, ATS-safe)

- US Letter, 0.5in margins; the 8.5in width constraint lives **inside
  `@media print` only**.
- Forces black-on-white regardless of screen colors.
- `page-break-inside: avoid` on each work entry, project, and certification.
- Brand logos are **hidden in print** (`@media print { .company-logo {
  display: none } }`); the company/school/issuer name remains as text.
- Descriptive-text external links get their URL appended for hard copy
  (`a[href^="http"]::after`); links whose visible text is already the URL
  suppress this.
- Targets exactly two pages.

## Content fidelity

The content is authored **verbatim** from the canonical resume — not
paraphrased. In particular:

- The A-CSM certification is attributed to **Scrum Alliance** (the
  credentialing body), not the training provider.
- The summary opens with the 20+-years platform framing and names Disney+,
  Hulu, and ESPN.
- Six experience entries span Disney NCP (2021–2026) back to CNN / Turner
  (2002–2012).

## Acceptance criteria

1. `/resume/` builds to `dist/resume/index.html` with no Zod schema errors.
2. The seven visible section `<h2>` titles render in order; no References;
   Awards is absent while empty.
3. Each Experience role / Education / Certification renders a `.company-logo`
   (logo or initials fallback).
4. Experience renders `<h3>` roles and `<ul>`/`<li>` bullets.
5. Certifications (3) and Projects (5) are present; A-CSM credits Scrum
   Alliance.
6. The emitted CSS hides `.company-logo` inside an `@media print` block.
7. The page exposes a resolvable `og:image` and a `Nathan Payne | Resume`
   title.
