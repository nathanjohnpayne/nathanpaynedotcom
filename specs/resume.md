---
spec_id: resume
title: Resume Page
---

# Resume Page

Specification for the `/resume` route — Nathan Payne's resume rendered as
native content from this repo's content collections and small section
components, laid out in the **blog post reading format**: the Mondrian
"composition with margins" canvas from `src/layouts/BlogPost.astro` (accent
margin ▏ content column ▏ sticky sidebar with a metadata panel + in-page
ToC), implemented via parallel `.resume-canvas-*` classes. Not the homepage
interactive grid. See issues #394 (initial build) and #402 (blog-layout
restyle).

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
| `resumeProjects` | `src/content/resume/projects/` | one `.md` per project | Six entries. **Distinct from `projects`** (reserved for `/projects`). |
| `awards` | `src/content/awards/` | one `.md`/`.yaml` per award | Wired up but **empty** for now. |

The `resumeProjects` collection must remain separate from the existing
`projects` collection; the two have different schemas and surfaces.

## Route & composition

- Mounted at `src/pages/resume.astro`; served at `/resume/`
  (`format: 'directory'`).
- The page is a `.resume-canvas` Mondrian grid with these cells:
  - **Left accent margin** (`.resume-canvas-margin--header|body|footer`,
    `aria-hidden`) — the red / yellow→ink→paper→blue Mondrian stripe.
  - **Header** (`.resume-canvas-header`) — breadcrumbs (`Nathan Payne /
    Resume`), the name (`<h1>`), the title, and the **contact line**
    (location · email · website · LinkedIn · GitHub, composed from the
    `myself` handles, each prefixed by a small decorative icon —
    `ContactIcon.astro`, brand glyphs + Lucide mail/globe/map-pin). **No
    Bluesky** on the resume (it remains on the homepage). The contact stays in
    the header so it prints.
  - **Metadata panel** (`.resume-canvas-meta`, top-right, screen-only) — a
    `<dl>`: Location, Availability, Focus, and a few Topic pills.
  - **Content column** (`.resume-canvas-content`) — the section components.
  - **Sidebar** (`.resume-canvas-sidebar`, sticky, screen-only) — an
    "In this resume" in-page ToC (`.resume-canvas-toc-list`) + several
    (≈5) `.resume-highlight` metric cards, accents cycling red/yellow/blue.
  - **Footer** (`.resume-canvas-footer`) — attribution + nav.
- Sections compose in this order: **Summary, Skills, Experience,
  Education, Certifications, Projects, Writing, Awards.**
  - `AwardsSection` renders **nothing** (no header) while the `awards`
    collection is empty.
  - There is **no References section.**
- Collection bodies (summary, experience, projects) render via `render()`
  from `astro:content`.
- **Writing** is a compact inline section (no collection) linking the blog
  and a few selected essays.

## Semantics & structure

- One `.resume-canvas` container. On desktop it is a 3-column Mondrian grid;
  it collapses to a single column at ≤ 1023px (`--bp-stack`) — margin and
  sidebar hidden; the header (breadcrumbs + name) stays the top tile with the
  metadata panel stacked beneath it — and prints single-column.
- Each `<section>` carries a stable `id` (`summary`, `skills`, `experience`,
  `education`, `certifications`, `projects`, `writing`, `awards`) so the
  sidebar ToC anchors resolve; `scroll-margin-top` offsets the anchor.
- Exactly one `<h1>` (the name); each section has a semantic `<h2>` title;
  each Experience role, Education degree, and Project has a semantic `<h3>`.
- Experience entries with bullets render them as a `<ul>` of `<li>`.
- The sidebar ToC links to every visible section id.
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
- Self-hosted asset overrides (via `logo`) are used only where Logo.dev is
  wrong or absent: Current TV (defunct, no live domain) →
  `/images/logos/current-tv.png`, and the CSP-PO cert →
  `/images/logos/csp-po.png` (the official Scrum Alliance certification badge,
  chosen deliberately over the corporate mark Logo.dev would return for
  scrumalliance.org). The Turner Leadership cert resolves via Logo.dev
  (`website: turner.com`) — no override.
- The logo is **decorative** (the company/school/issuer name is the
  semantic text); each `CompanyLogo` includes an initials fallback element.
- Displayed as square "Logo.dev-style" cards: a thin `--rule` border, rounded
  corners, and a light (`--paper`) background. Sized per section — Experience
  company logos ~72px, Education/Certification logos ~56px.
  Square brand marks fill the tile edge-to-edge (corners clipped); a wide
  wordmark (Current TV) is contained and centered with the card showing
  above/below. In each entry the card sits in a head row, vertically centered
  beside the heading + meta line; the Experience description then wraps at full
  width *below* that head row (not indented beside the card). The initials
  fallback reuses the same card.

## Styling

- Laid out in the blog-post Mondrian "composition with margins" format via
  **parallel `.resume-canvas-*` classes** (mirroring `.blog-*`, kept separate
  so the resume isn't coupled to blog-layout changes). The accent margin
  reuses the full red/yellow/blue Mondrian stripe.
- Consumes the site tokens (`--ink`, `--cream`/`--surface`, `--paper`,
  `--rule`, `--accent-gray`, `--red`/`--yellow`/`--blue`) and the Cormorant
  Garamond + Inter pairing — it does not redefine them or import new fonts.
- The content-column section styling stays under the existing `.resume-*`
  classes (sections, entries, skills, certs, writing, `CompanyLogo`).
- In-content links and the header contact links use the site's `--blue`
  accent (via `--resume-link`), with the `→` arrow convention on the project
  and writing links.
- Each project title links to its matching `/projects/<slug>/` detail page
  while preserving the existing live/repo link.
- Skills render as inline `·`-joined lists.
- Any transition uses the `--motion-*`/`--ease-*` tokens (no bare `ms`/`ease`).

## Print (three-page PDF, ATS-safe)

- US Letter, 0.6in margins; the 8.5in width constraint lives **inside
  `@media print` only**.
- The canvas collapses to a single content block in print: the accent
  margin, the metadata panel, the sidebar (ToC + highlights), the
  breadcrumbs, and the footer are **hidden**; the header (with the contact
  line) and the content column print.
- The **Writing** section collapses to just its lead line in print (the blog
  CTA linking nathanpayne.com/blog); the blurb, the "Selected essays" label,
  and the essay list are hidden, since their links can't be followed on
  paper. The on-screen Writing section is unchanged.
- Section divider rules (the `border-top` between sections) are dropped in
  print and the reserved padding reclaimed; the bold section titles carry the
  separation. This buys vertical space toward the three-page fit.
- Forces black-on-white regardless of screen colors (text, bullet `::before`
  squares, and link underlines/borders all forced to `#000`). Resume links
  print with a real underline (`text-decoration` + `text-underline-offset`)
  rather than a `border-bottom`, so the rule clears descenders.
- `page-break-inside: avoid` on each work entry, project, certification, and
  prose list item (so a bullet is never sliced mid-line); `break-after: avoid`
  on section titles; `orphans`/`widows` on prose and bullets. The two tall Experience
  entries (Disney NCP, CNN) get `break-inside: auto` so they fill page
  tails instead of bumping wholly and stranding space. (In print the bullet
  list and the certifications list render as block flow, not the screen's CSS
  grid: grid containers don't fragment reliably across pages and Safari slices
  grid items at the page edge. Block flow lets `break-inside: avoid` +
  `orphans`/`widows` keep each bullet and certification whole.)
- Brand logos are **hidden in print** (`@media print { .company-logo {
  display: none } }`); the company/school/issuer name remains as text.
- Descriptive-text external links get their URL appended for hard copy
  (`a[href^="http"]::after`); links whose visible text is already the URL
  suppress this.
- Targets **three balanced pages** at a readable body size (9.5pt body,
  1.35 leading, 0.6in margins). The earlier two-page target over-compressed
  ~3 pages of content into ~2.2 and stranded the remainder on a near-empty
  page 3; decompressing to readable type fills three pages with the same
  content. The body landed at 9.5pt/0.6in rather than the first-pass 10pt/0.7in
  (issue #420 Contingency B) because **Safari, exporting via a physical-printer
  target, lays out ~11% less content per page than Chromium** — at 10pt/0.7in
  the Writing tail spilled onto a 4th page (and, when saved as 3, was silently
  dropped) in Safari. Safari is the calibration renderer; the Tier-2 print gaps
  and the body size/leading are the fine-tune dials — nudge tighter if the tail
  spills, looser if page 3 lands thin. See issue #420.

## Content fidelity

The content is authored **verbatim** from the canonical resume — not
paraphrased. In particular:

- The CSP-PO certification is attributed to **Scrum Alliance** (the
  credentialing body), not the training provider.
- The summary opens with the 20+-years platform framing and names Disney+,
  Hulu, and ESPN.
- Six experience entries span Disney NCP (2021–2026) back to CNN
  (2002–2012).

## Acceptance criteria

1. `/resume/` builds to `dist/resume/index.html` with no Zod schema errors.
2. The seven visible section `<h2>` titles render in order; no References;
   Awards is absent while empty.
3. Each Experience role / Education / Certification renders a `.company-logo`
   (logo or initials fallback).
4. Experience renders `<h3>` roles and `<ul>`/`<li>` bullets.
5. Certifications (3) and Projects (6) are present; CSP-PO credits Scrum
   Alliance.
6. The emitted CSS hides `.company-logo` inside an `@media print` block.
7. The page exposes a resolvable `og:image` and a `Nathan Payne | Resume`
   title.
