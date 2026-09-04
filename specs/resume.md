---
spec_id: resume
title: Resume Page
---

# Resume Page

Specification for the `/resume` route—Nathan Payne's resume rendered as
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

## Data source—content collections

The page is driven entirely by collections defined inline in
`src/content.config.ts` using the `glob()` loader (the same Astro 6 API as
`blog`/`projects`/`bio`). A resume edit is therefore a one-file change. The
collections are:

| Collection | Dir | Shape | Notes |
|---|---|---|---|
| `myself` | `src/content/myself/` | single `.md` entry | Header fields + the summary in the body (a single ~55–75-word paragraph, #617). **No `phone`**—email-only. |
| `skills` | `src/content/skills/` | one `.yaml` per category | `{ label, priority, skills[] }`. Five categories. |
| `experience` | `src/content/experience/` | one `.md` per role | Six entries. Bullets / paragraph in the body. Optional `compact: true`—see *Experience density* below. |
| `education` | `src/content/education/` | one `.md` | One entry (George Mason). |
| `certifications` | `src/content/certifications/` | one `.md` per cert | Three entries. |
| `resumeProjects` | `src/content/resume/projects/` | one `.md` per project | Seven entries. **Distinct from `projects`** (reserved for `/projects`). |
| `awards` (future) | `src/content/awards/` | one `.md`/`.yaml` per award | Dormant scaffold; deliberately not registered until the first entry exists, so an empty loader cannot pollute build logs (#654). |

The `resumeProjects` collection must remain separate from the existing
`projects` collection; the two have different schemas and surfaces.

## Route & composition

- Mounted at `src/pages/resume.astro`; served at `/resume/`
  (`format: 'directory'`).
- The page is a `.resume-canvas` Mondrian grid with these cells:
  - **Left accent margin** (`.resume-canvas-margin--header|body|footer`,
    `aria-hidden`)—the red / yellow→ink→paper→blue Mondrian stripe.
  - **Header** (`.resume-canvas-header`)—breadcrumbs (`Nathan Payne /
    Resume`), the name (`<h1>`), the title, and the **contact line**
    (location · email · website · LinkedIn · GitHub, composed from the
    `myself` handles, each prefixed by a small decorative icon—`ContactIcon.astro`, brand glyphs + Lucide mail/globe/map-pin/download/
    calendar). **No Bluesky** on the resume (it remains on the homepage). The
    contact stays in the header so it prints. Below the contact block sits the
    **action row** (`.resume-actions`, screen-only—hidden in `@media print`,
    which is also what the PDF is rendered from, so none of it reaches the
    file). Three `.resume-action` affordances, in order: **Download PDF**
    (`.resume-download`, the build-generated PDF—see *Downloadable PDF*
    below), **Get in touch** (`mailto:`), and **Book a time**
    (`https://cal.com/nathanpayne`, `target="_blank" rel="noopener"`)—#703.
    Both new links are plain hrefs in the static HTML, deliberately unlike the
    base64-assembled mailto on the homepage and in blog posts: the contact
    line above already ships the address as visible text (a CV contact block
    has to print), so obfuscating a button on the same page would buy nothing
    and would cost the JS-disabled case. Booking carries no address to harvest
    and is spam-hardened on the Cal.com side (#620).
  - The header `title` is a **single role title**—"Senior Platform Product
    Manager"—matching the `jobTitle` in the page's `Person` JSON-LD. The
    domain facets it used to carry (partner ecosystems, streaming
    infrastructure, AI-augmented development) live in **Skills**, which
    already names all three. See #617.
  - **Metadata panel** (`.resume-canvas-meta`, top-right, screen-only)—a
    `<dl>`: Location, Availability, Focus, and a few Topic pills.
  - **Content column** (`.resume-canvas-content`)—the section components,
    closed by the **availability CTA** (`.resume-cta`, screen-only) described
    below.
  - **Sidebar** (`.resume-canvas-sidebar`, sticky, screen-only)—an
    "In this resume" in-page ToC (`.resume-canvas-toc-list`) + several
    (≈5) `.resume-highlight` metric cards, accents cycling red/yellow/blue.
  - **Footer** (`.resume-canvas-footer`)—attribution + nav.
- Sections compose in this order: **Summary, Skills, Experience,
  Education, Certifications, Projects, Writing.**
  - `AwardsSection` is a dormant future scaffold. When the first award entry lands, restore its collection schema and add Awards after Writing; until then no empty collection is registered (#654).
  - There is **no References section.**
- Collection bodies (summary, experience, projects) render via `render()`
  from `astro:content`.
- **Writing** is a compact inline section (no collection) linking the blog
  and a few selected essays.
- The content column closes with the **availability CTA** (`.resume-cta`,
  #702): a lede ("Open to senior product/platform roles.") followed by two
  `·`-separated arrow links—**Get in touch** and **Book a time**. A
  `::before` hairline rules it off from the Writing section above on the same
  rhythm as a `.resume-section` divider (2.1rem above the rule, 1.6rem below),
  flush with those dividers at both ends, so the card reads as closing the
  page rather than hanging off the essay list. It must be a pseudo-element:
  the card's own `border` draws its box, so a `border-top` would thicken that
  edge instead of ruling off the space above it. It mirrors
  the end-of-post block in `src/layouts/BlogPost.astro` (`.blog-cta`, #622)
  **minus that block's Résumé link**, since the reader is already on the
  résumé. It is a sibling of the sections, not a section: no `id`, no ToC
  entry, and it is screen-only. The parallel `.resume-cta` namespace is
  deliberate—see *Styling* below; the resume must not move when the blog
  layout does.
- **Projects and Writing share one section grammar** (#947), and it is the reason both open the way they do:

  > section heading → proposition + canonical URL → description → selected-items label → the items

  Projects: the `/projects/` headline, `nathanpayne.com/projects →`, the domains-and-method intro, **Selected projects:**, the entries. Writing: **The AI-Augmented PM**, `nathanpayne.com/blog →`, the blurb, **Selected essays:**, the essay list. Classes are paired per part (`.resume-projects__lead` / `.resume-writing__lead`, and likewise `__desc` and `__label`), following how the two sections were already styled rather than introducing a shared name. `tests/resume.test.js` asserts the grammar structurally on both sections—same parts, same order—separately from either section's copy.

  **The separator between proposition and URL is the one part they deliberately do not share.** Writing's proposition is a plain noun phrase, so a closed em dash makes the URL an interruptive continuation of it: **The AI-Augmented PM—**nathanpayne.com/blog →. The Projects proposition already contains an em dash, and a second one in the same line stops marking a break and starts reading as a typo, so it takes the site's own `·` separator instead: **Products—and the decisions behind them** · nathanpayne.com/projects →. CMOS consistency is using a mark for its function, not forcing one mark into two structurally different sentences—and the test asserts each form on its own section rather than a single shared rule.

  **The proposition slot holds the claim, not the label.** Projects previously put **Selected Projects** there, which is why it had no label row and said nothing about itself. The proposition is now the `/projects/` page's own `<h1>`, imported from `src/lib/section-propositions.ts` and used by both surfaces, so the résumé says about that page exactly what the page says about itself and a copy edit to one cannot silently leave the other behind. Writing keeps its proposition authored in the component: `/blog/` is a destination rather than an index with a headline to quote, and "The AI-Augmented PM" is the publication's name.

  The Projects tag read **Built with Agents** until the portfolio work subordinated the implementation method to the product across `/projects/` and the homepage; the retired framing, and the retired "systems design exercise—from first commit to deploy" intro, are both pinned as negative assertions in `tests/resume.test.js` so they cannot return. That intro was also specifically wrong for a project that never launched.

  **In print both sections shed their link-driven parts.** Writing collapses to its lead line entirely—blurb, label, and essay list—because the links are dead on paper. Projects keeps its entries and drops the blurb, the label, and **the per-entry destination row**: `Live ↗ · GitHub ↗` says nothing without its URLs, and printing all fourteen cost about ten lines and a fourth page. Paper keeps five routes regardless—nathanpayne.com, `/projects`, `/blog`, the GitHub profile and the LinkedIn handle, all in the contact line and the section leads—so every project stays two addresses away rather than one, and the file stays three pages at 54/46/38 lines. `tests/resume.test.js` asserts the row is hidden AND that those routes survive, so the rule cannot degrade into a silent deletion of every path to the work.
- **Each Projects entry opens with its lifecycle status** as a kicker (`.resume-entry__status`) above the `<h3>`—uppercase `SHIPPED`, `ARCHIVED`, `PAUSED`, `EXPERIMENT`, or `IN PROGRESS`, carrying the `.state-marker` geometry the homepage, `/projects/`, and the detail page's STATUS cell use (#944). **Five states, four marks:** `PAUSED` and `IN PROGRESS` deliberately share the bare outline, because neither is running yet and the distinction between them is not one a mark should carry—see `src/lib/lifecycle-marker.ts`, which keeps both as named hooks so the emitted class still says which state produced the outline. Nothing on this page is `IN PROGRESS` today; the résumé renders whatever the collection holds and does not narrow the enum. Every entry carries one, including the four that say `SHIPPED`: consistent entry anatomy beats avoiding apparent redundancy, which is the call #285 already made for the index cards.

  The word must stay real text. The mark is a `::before` box and contributes no characters, so `SHIPPED` and `ARCHIVED` survive copy/paste, screen readers, PDF text extraction, and ATS parsing exactly as they did before the mark existed. **This is the whole of the constraint, and an earlier revision of this spec mistook it for a wider one:** it forbade the geometry outright, on the grounds that a PDF-bound, ATS-parsed section should not extend the visual language. Portability was never at odds with the mark, only with replacing the word by one—and #925 had since turned on `printBackground: true`, so CSS-painted marks reach the generated file at all.

  **Above the name, not after it, and the reason is measurement rather than taste.** "Device Source of Truth—Partner Device Intelligence Platform" fills 549 of the content column's 632px unaided, so a trailing status wraps to a line of its own at every viewport width—a stray `ARCHIVED` hanging under a heading. A kicker cannot be pushed onto a second line, and it returns the full measure to the project name. It also matches the `/projects/` card, where `.project-status` already sits over `.post-title`.

  **Subordinate by type, not by color.** 0.62rem Inter (7.5pt in print) against the heading's Cormorant clamp; no status-specific hue, no pill, no border, not interactive—the site's three-grammar rule holds, so glyph plus uppercase text is state and nothing here reads as a control. The mark is `em`-sized by `.state-marker`, so it tracks that type without a per-surface override.

  **Print needs one extra declaration, and it is not this page's.** Three of the four marks *are* backgrounds—filled for `SHIPPED`, cored for `ARCHIVED`, half-filled for `EXPERIMENT`—and Chrome's print dialog leaves "Background graphics" off by default, which would collapse all four to the bare outline `PAUSED` uses. `@media print` therefore sets `print-color-adjust: exact` on `.state-marker::before`. Verified against a control: with the property reverted to `economy`, the same page renders every mark as an identical empty square.

  That rule was scoped to `.resume-canvas .state-marker::before` when #944 introduced it, on the reasoning that the other three surfaces had never needed the concession and a site-wide `exact` would opt every tinted plane into printing. #950 unscoped it: `print-color-adjust` applies to the element it is set on, and that element is the 0.72em mark—so the narrow selector was buying nothing and costing the homepage, `/projects/`, and the detail page their vocabulary on paper. The rule itself moved to `tests/lifecycle-marker.test.js` § print fidelity, alongside the vocabulary it belongs to.

  The résumé's own print cascade may declare `print-color-adjust` for exactly one thing, and it is not the mark: the bullet marker (see *`printBackground: true` in the generator* below). `tests/resume.test.js` asserts that set by enumeration rather than by absence—every print block, every selector in a comma-joined list, exactly one match and it is `.resume-prose ul li::before`. **Absence was the earlier form of that assertion and it could not survive this page needing the property for something else** (#953): "declares none" reads as a policy when what it guards is a residue copy of the lifecycle rule drifting back onto one surface, and the moment a second, legitimate `exact` rule exists the two claims stop being the same sentence. Reading the first block that mentions `resume-canvas` was the other half of the same weakness—a later résumé-specific block sits behind that lookup and is never reached (#956).

  The generator's own `printBackground: true` also paints them into the downloadable file, so the two mechanisms are redundant *there* and neither is provable from it—which is why the stylesheet rule is asserted directly, and `tests/resume.test.js` separately asserts that the marks reach the PDF inked. **That last assertion reads each mark's signature rather than counting one variant, and that is what keeps it free of the content (#957).** It briefly was content-dependent: the oracle counted marks running solid edge to edge, which only `SHIPPED` does, so on a page with no `SHIPPED` entry it counted nothing and compared nothing (#948). The oracle now classifies every mark it finds—solid, cored, half, hollow—and the test compares that sequence against the variants the page declares, in order. Whatever mix of states the résumé holds, each mark owes its own appearance. A renderer that drops the backgrounds turns every filled variant hollow and fails; on a page whose marks are already all hollow it changes nothing about the file, so passing is correct rather than vacuous. Verified with no `SHIPPED` project on the page at all: reverting the `ARCHIVED` fill still fails.

  The value is **looked up from the `projects` collection by slug**, not authored in `src/content/resume/projects/`—a résumé entry's id is its project slug. A project's status therefore has exactly one source, and the résumé cannot drift from the project page. The status → modifier mapping is likewise imported from `src/lib/lifecycle-marker.ts`, and `tests/lifecycle-marker.test.js` fails the build if any surface declares a second one. `tests/resume.test.js` asserts every entry carries a status, that each matches the value its own project page renders, that the set is mixed, that the kicker precedes its heading, and that no lifecycle mark appears anywhere else on the page. It deliberately does not pin *which* states appear: flipping a project's lifecycle is a legitimate content edit, and a hand-maintained list of today's mix would be the one restated figure in a check built to restate nothing.

- **Each entry's destination row comes from the canonical project, in both directions (#947).** `url` and `repo` in `src/content/resume/projects/` mirror the `liveUrl` and `githubUrl` the project of the same slug declares, and the row renders live-first. `tests/resume.test.js` derives the expectation from the canonical project rather than from the résumé entry, so a destination the project declares and the résumé omits fails—the direction that used to pass silently, and how Mergepath's `liveUrl` never reached the résumé. A project declaring neither renders no row. Both fields are `z.string().trim()` on **both** collections (#948): the résumé collection alone left surrounding whitespace in the rendered `href`, and Unicode whitespace such as NBSP is not stripped by URL parsing, so a padded address resolved as a relative path on this site instead of opening the product. The rendered `href` is compared exactly against the trimmed frontmatter, which is what keeps that trim load-bearing rather than assumed.

- **Lifecycle marks are confined to the Projects section.** Not experience entries, not the Disney bullets, not Skills, Writing, Education, Certifications, or the availability CTA. The vocabulary means one thing—product/project lifecycle state—and it keeps that precision only by not spreading to metadata that is not lifecycle.

## Semantics & structure

- One `.resume-canvas` container. On desktop it is a 3-column Mondrian grid;
  it collapses to a single column at ≤ 1023px (`--bp-stack`)—margin and
  sidebar hidden; the header (breadcrumbs + name) stays the top tile with the
  metadata panel stacked beneath it—and prints single-column.
- Each visible `<section>` carries a stable `id` (`summary`, `skills`,
  `experience`, `education`, `certifications`, `projects`, `writing`) so the
  sidebar ToC anchors resolve; `scroll-margin-top` offsets the anchor.
- Exactly one `<h1>` (the name); each section has a semantic `<h2>` title;
  each Experience role, Education degree, and Project has a semantic `<h3>`.
- Experience entries with bullets render them as a `<ul>` of `<li>`.
- The sidebar ToC links to every visible section id.
- Title is `Nathan Payne | Résumé`; the page has a resolvable `og:image`
  and a dedicated one-line meta/OG description.
- A `Person` + `ProfilePage` JSON-LD graph is emitted.

## Experience density

Vertical space tracks relevance. Two separate mechanisms produce it, and
conflating them is the mistake this section used to invite:

1. **The `compact` flag, which is layout only** (#618). An experience entry may
   set `compact: true` in frontmatter; the `ExperienceSection` then renders it
   with the `resume-entry--compact` modifier (tighter gaps, a stepped-down
   title, a 52px rather than 72px logo tile). It touches no copy, and flipping
   it back restores full weight without editing a word.
2. **A one-time prose compression of the three pre-2016 bodies**, applied by
   hand in #617/#618. This is an edit to the content files, not a rendering
   mode, and it is **not** what the flag reverses.

The three pre-2016 roles—AJ+ (2013–2016), Current TV (2012–2013), and CNN
(2002–2012)—are compact, and their bodies are one to two lines each: company,
role, years, and the most transferable accomplishment. The two Disney entries
(7 and 4 bullets) and BAMTech keep full weight.

**What the compression guarantees, and what it does not.** Three things are
guaranteed, and all three are checkable in `tests/resume.test.js`:

1. Every role keeps its **full date range**.
2. The **CNN Magic Wall** stays on the page—it is the most memorable line on
   the résumé.
3. Every compact entry still carries **its** accomplishment, not a dated
   one-liner. The test pins the whole distinguishing phrase for each—`$335K in
   annual vendor savings`, `launching three nightly shows within 30 days`,
   `Conceptualized and led the CNN Magic Wall`—plus a minimum body length so an
   entry cannot be reduced to the phrase alone. The phrase and not the striking
   token in it: pinning `$335K` by itself passes a body saying AJ+ merely
   *managed* a $335K budget, which keeps the number and drops the fact. "A real accomplishment" is not something a
   test can recognise; the specific fact each role retains is, which is why the
   guarantee is written as three named facts rather than a quality bar.

Past those three, the compressed bodies drop specific facts and not merely
words. That is the intended trade, not a defect:

- `ajplus.md` no longer names the Adobe CQ CMS publishing pipeline or its
  syndication to YouTube and Comcast Xfinity.
- `cnn.md` keeps the $2M project capital budgets and drops the $60M operating
  budget they were managed against.
- `current-tv.md` says "three nightly shows" in place of *Joy Behar: Say
  Anything*, *The Gavin Newsom Show*, and *The War Room with Jennifer
  Granholm*.

Every one of those facts is still in the canonical resume—
`job-search/nathan-payne-resume.md` in the private `nathanjohnpayne/docs`
repository, checked out locally at `~/GitHub/docs/`—verified against that file
rather than assumed; see
*Content fidelity* below for which document is the source. The page is a
three-page document and the pre-2016 roles are the ones whose detail earns the
least of that space.

An earlier revision of this section read "compression is emphasis, never
erasure." It over-claimed (#735): the sentence promises something about every
fact, while what this section guarantees—and what the tests check—is the three
items above. The scoped statement is the honest one, and it is the one a reader
can check.

The flag is reversible in the sense given above: unset `compact: true` and the
entry renders at full weight. That restores the *layout*, not the prose. The
dropped facts are an editorial decision recorded here. Undoing one means
copying it back from the canonical resume, which still holds every omitted
fact—the canonical is the source and needs no edit.

## Downloadable PDF

`/resume/` ships a real, letter-size PDF at **`/Nathan-Payne-Resume.pdf`**—a
recruiter-legible filename, for "attach your resume" forms and ATS pipelines
(#616).

- It is generated **at build time** from the already-built `/resume/` route,
  by `src/integrations/resume-pdf.mjs`, under `page.emulateMedia({ media:
  'print' })`—so the file is exactly the `@media print` cascade below and
  cannot drift from the page. (A committed static PDF is the drift bug class
  of #163 / #164.)
- The generator is invoked from `og-images.mjs`'s `astro:build:done` hook
  rather than registered as its own integration: it needs the same headless
  Chromium and static dist/ server that hook already stands up, and
  `astro.config.mjs` is on the Do Not Touch list (`.ai_context.md`).
- `RESUME_PDF_MARGIN` in the generator restates the `@page { margin }` value
  (0.6in, the #420 Safari floor) because Chromium takes print margins from the
  printToPDF parameters, not from CSS. The paired test asserts the two agree.
- **Links are absolutized before the file is written (#683).** The render
  happens over a localhost static server, and Chromium resolves the PDF's link
  annotations against that base—so every root-relative `href` shipped as
  `http://127.0.0.1:<ephemeral port>/...`, dead on any reader's machine and
  varying per build. `absolutizeLinks` in the generator rewrites same-origin
  hrefs to the `site` origin from `astro.config.mjs` (passed in from
  `og-images.mjs`, which captures it at `astro:config:done` because
  `astro:build:done` is not given the resolved config). External URLs and
  `mailto:` already carry an origin and are untouched; in-page `#` anchors are
  skipped so they stay intra-document jumps. `siteUrl` is required—the
  generator throws rather than silently falling back to localhost links.
- Absolutizing interacts with the print sheet's `a[href^='http']::after` URL
  suffix: project **titles** matched that selector for the first time once
  their hrefs became absolute, printing a redundant `/projects/<slug>/` after
  every name, so `.resume-entry__title` joined the suppression list. **Both
  halves of that are now gone (#947), and neither by way of the suffix.** The
  title is no longer a link at all. The destination row is not suppressed but
  hidden outright—`display: none` in the same `@media print` block—so neither
  its links nor any generated suffix reaches paper, and **per-project addresses
  are deliberately omitted from the printed résumé**: the projects-index route
  in the section lead is what survives. See § Projects for that trade and its
  measurement. What the suppression list still holds is the contact line and
  the two section leads—links whose visible text already is their URL, which is
  the rule the list encodes.
- **Nothing in the printed content may be positioned (#923).** Chromium writes
  each printed page's text into the PDF content stream in *paint* order, and a
  `position: relative`/`absolute` element paints in step 8 of the painting
  algorithm (CSS 2.1 Appendix E)—after every non-positioned block and inline
  in the same stacking context. So a positioned element that prints is written
  after all of its page's other text, and the file's reading order stops
  matching the résumé's while every pixel stays identical. That is what an ATS
  parser, assistive tech, `pdftotext -raw`, and copy-paste get.

  The bullet marker is the rule this cost. `.resume-prose ul li::before` was an
  absolutely-positioned square, which forced `position: relative` onto every
  `.resume-prose li`; the four Disney Streaming 2018–2021 bullets were
  therefore written six sections late, after Five Across, and read as
  belonging to Projects. The marker is now a **float** pulled back into the
  gutter by a negative left margin, so the list item stays unpositioned. A
  float was chosen over an inline-block because an inline-block's own advance
  width has to be cancelled by a compensating margin and the two round to
  layout units independently, shifting every bullet's text by a subpixel; a
  float sits outside the line box and moves nothing. Its geometry comes from
  `--bullet-size` / `--bullet-gutter` / `--bullet-offset` on `.resume-prose`,
  which is also where print re-tunes the gutter and the drop.

  `--bullet-offset` must stay smaller than the first line box: `li` is not a
  block formatting context, so a taller float would escape the item and
  shorten the next bullet's lines.

  `.resume-cta`, `.resume-canvas-sidebar-inner`, and
  `.resume-writing__essays li` are also positioned, and are all hidden in
  print—so they are outside this rule, and un-hiding any of them in print
  means giving it the same treatment first.
- **`printBackground: true` in the generator, and it is load-bearing (#925).**
  Chromium's default—and this generator's setting until #925—is Chrome's
  "Background graphics" unchecked, which does not omit a background but paints
  it **white**. The bullet markers are CSS backgrounds on `.resume-prose ul
  li::before`, so every printed bullet carried its indent and an invisible
  square, and the print sheet's `background: #000 !important` for them had
  never once had an effect. The pre-fix file contains all eleven `6 6 re f`
  operators at the same coordinates as the fixed one, each preceded by
  `1 1 1 rg`—which is why a test that merely counts the rectangles passes on
  it, and why `tests/resume.test.js` renders the pages with MuPDF and looks for
  ink in the marker column instead of reading the file's operators.

  The marker stays a background rather than becoming a border: border widths
  floor to whole device pixels while box dimensions round, so a border-drawn
  square comes out 4×4 (four sides at `calc(size / 2)`) or 5×6 (one full-width
  `border-left`) where the background paints 6×6.

  Enabling the flag is contained rather than merely convenient, and that was
  measured, not argued: with it on, the rendered PDF pages differ from the
  previous file **only** in the 9px marker column (pages 1 and 2; page 3 has no
  bullets and is pixel-identical). The print cascade leaves nothing else for it
  to paint—`html`, `body.resume-page`, `.resume-canvas`, the header and the
  content column are forced to `#fff !important`, and every tinted surface is
  hidden outright.

  **The flag fixes the file and only the file, so the print sheet also sets
  `print-color-adjust: exact` on the marker (#953).** `printBackground` is a
  parameter of *this generator*; the other printed output is a reader pressing
  Cmd-P on `/resume/`, where Chrome leaves "Background graphics" off and no
  build artifact exists to notice. Between #925 and #953 the downloadable PDF
  carried all eleven markers and the printed page carried none—text and indent
  intact, the list no longer reading as a list. That is the same sentence #944
  wrote about the lifecycle marks one rule over, and the reason
  `tests/resume.test.js` asserts the *stylesheet* here: the generated file
  cannot distinguish a marker that prints because the CSS asks for it from one
  that prints because `printBackground` painted it anyway.

  The rule is narrow for the same reason #950's is: `print-color-adjust`
  applies to the element it is set on, and that element is the 6px square. The
  rest of this cascade already forces white paper and black text, so `exact`
  there paints bullets and nothing else. Measured the same way #950 was—each
  route rendered to PDF with `printBackground: false`, with and without the
  rule, rasterised at 150dpi and diffed pixel by pixel: the two rasters differ
  in exactly 11 solid squares in the bullet gutter, 7 on page 1 and 4 on page
  2, and are pixel-identical on page 3 and everywhere else. Eleven is the whole
  population—the page has exactly eleven `.resume-prose ul li`, the same count
  as the `6 6 re f` operators above.
- The PDF is an asset, not a route—`@astrojs/sitemap` does not list it.
- The on-page affordance is `.resume-download` inside `.resume-actions`, placed
  after the header contact block and hidden in `@media print`. Clicking it
  fires a `resume_pdf_downloaded` PostHog capture alongside the existing
  `resume_viewed`; the two sibling actions fire `resume_action_clicked` with an
  `action` of `email` or `schedule`, and the end-of-page CTA fires
  `resume_cta_clicked` with a `cta` of `email` or `schedule`.

The Lucide glyphs in `ContactIcon.astro` are transcribed verbatim from the
upstream source (`lucide-icons/lucide@main/icons/<name>.svg`, ISC) so a drift
check is a byte comparison rather than a geometry argument (#704). There is no
icon-library dependency.

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
  (`website: turner.com`)—no override.
- The logo is **decorative** (the company/school/issuer name is the
  semantic text); each `CompanyLogo` includes an initials fallback element.
- Displayed as square "Logo.dev-style" cards: a thin `--rule` border, rounded
  corners, and a light (`--paper`) background. Sized per section—Experience
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
  Garamond + Inter pairing—it does not redefine them or import new fonts.
- The content-column section styling stays under the existing `.resume-*`
  classes (sections, entries, skills, certs, writing, `CompanyLogo`).
- In-content links and the header contact links use the site's `--blue`
  accent (via `--resume-link`), with the `→` arrow convention on the project
  and writing links.
- **Each project entry has a fixed anatomy** (#947), top to bottom: lifecycle kicker, name, tech list, destinations, description.

  The **name is not a link.** It is the entry's identity and is set as typography; every destination lives in the row beneath it, so a single line answers "where can I go from here" rather than that answer being split between a heading that happens to be clickable and a row that is. The case studies are reached through `.resume-projects__lead`, which routes to the `/projects/` index. `tests/resume.test.js` pins the absence, with a control proving the section contains links at all.

  The **destinations row** shows every URL the entry declares—`Live` for `url`, `GitHub` for `repo`, live product first, `·`-separated, each with the `↗` external-link arrow (the site's existing convention for leaving the site, distinct from the `→` used by the internal `/projects/` lead). Labels rather than URLs, so seven rows stay one line each. The rendered set is asserted against the collection's own frontmatter rather than a list in the test, and since the visible label names no address, each link carries an `aria-label` naming its project—seven rows otherwise all read "Live · GitHub".
- Skills render as inline `·`-joined lists.
- Any transition uses the `--motion-*`/`--ease-*` tokens (no bare `ms`/`ease`).

## Print (three-page PDF, ATS-safe)

- US Letter, 0.6in margins; the 8.5in width constraint lives **inside
  `@media print` only**.
- The canvas collapses to a single content block in print: the accent
  margin, the metadata panel, the sidebar (ToC + highlights), the
  breadcrumbs, the header action row (`.resume-actions`), the closing
  availability CTA (`.resume-cta`), and the footer are **hidden**; the header
  (with the contact line) and the content column print. Because
  `src/integrations/resume-pdf.mjs` renders under `emulateMedia({ media:
  'print' })`, every one of those hides applies to the downloadable PDF too—an action button is meaningless on paper, and the printed contact line
  already carries the address.
- The **Writing** section collapses to just its lead line in print (the blog
  CTA linking nathanpayne.com/blog); the blurb, the "Selected essays" label,
  and the essay list are hidden, since their links can't be followed on
  paper. The on-screen Writing section is unchanged.
- The **Projects** intro collapses the same way: the Built with Agents lead
  (nathanpayne.com/projects) prints; the one-line blurb is hidden.
- Section divider rules (the `border-top` between sections) are dropped in
  print and the reserved padding reclaimed; the bold section titles carry the
  separation. This buys vertical space toward the three-page fit.
- Forces black-on-white regardless of screen colors (text, bullet `::before`
  squares, and link underlines/borders all forced to `#000`). The bullet-square
  half of that only began to have an effect in #925, when the generator started
  passing `printBackground: true`—see *Downloadable PDF* above. Resume links
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
  target, lays out ~11% less content per page than Chromium**—at 10pt/0.7in
  the Writing tail spilled onto a 4th page (and, when saved as 3, was silently
  dropped) in Safari. Safari is the calibration renderer; the Tier-2 print gaps
  and the body size/leading are the fine-tune dials—nudge tighter if the tail
  spills, looser if page 3 lands thin. See issue #420.
- The #617 / #618 trims took the print content from ~2.65 to ~2.56 US-Letter
  pages (measured in Chromium print emulation at 7.3in × 9.8in), so the
  document still lands on three pages, with page 3 a little lighter. The
  three-page target itself is unchanged: #420 established that forcing two
  pages over-compresses this much content.

## Content fidelity

The content is authored **verbatim** from the canonical resume—
`job-search/nathan-payne-resume.md` in the private `nathanjohnpayne/docs`
repository, which is the single source document, not a directory of
variants—not paraphrased. The contract binds the **collection-backed bodies**—the `myself`, `experience`,
`education`, `certifications`, and `resumeProjects` entries—and it is about
*fidelity*, not *completeness*: a sentence in those bodies appears as the
canonical writes it, and they may carry less than the canonical does, but never
something it does not say and never a rewording of what it does.

**The sidebar highlight cards are deliberately outside it.** They are marquee
metrics composed in `src/pages/resume.astro`, condensed to fit a card: the NCP
card reads "Conceived and secured an $18.1M investment in NCPv3" where the
canonical reads "Conceived and secured **approval for** an $18.1M investment in
NCPv3." That is a paraphrase by design, and scoping the contract this way is
what keeps it from classifying the shipped implementation as drift.

The three compact pre-2016 bodies are where that distinction is load-bearing:
they omit facts the canonical retains (see *Experience density* above, which
names them). Those omissions are accepted, not drift. Drift would be a
*divergent* sentence—the failure mode #850 recorded, where the canonical said
one thing and the mirror said another—and nothing in this repository compares
the two surfaces automatically, so it is worth knowing which failure you are
looking at.

In particular:

- The CSP-PO certification is attributed to **Scrum Alliance** (the
  credentialing body), not the training provider.
- The summary opens with the 20+-years platform framing and names Disney+,
  Hulu, and ESPN. Since #617 it is one paragraph of ~55–75 words with the
  AI-augmented development focus in the same opening lines as the Disney
  scale; the detail it shed is recoverable elsewhere on the page (Skills,
  the Disney NCP bullets, the Projects section) rather than deleted.
- Six experience entries span Disney NCP (2021–2026) back to CNN
  (2002–2012).

## Acceptance criteria

1. `/resume/` builds to `dist/resume/index.html` with no Zod schema errors.
2. The seven visible section `<h2>` titles render in order; no References;
   Awards is absent while its empty scaffold is dormant.
3. Each Experience role / Education / Certification renders a `.company-logo`
   (logo or initials fallback).
4. Experience renders `<h3>` roles and `<ul>`/`<li>` bullets.
5. Certifications (3) and Projects (6) are present; CSP-PO credits Scrum
   Alliance.
6. The emitted CSS hides `.company-logo` inside an `@media print` block.
7. The page exposes a resolvable `og:image` and a `Nathan Payne | Résumé`
   title.
8. The header renders a screen-only `.resume-download` link to
   `/Nathan-Payne-Resume.pdf`, that path resolves to a real letter-size PDF in
   `dist/`, and the file is absent from the sitemap.
8b. `.resume-actions` holds exactly three `.resume-action` affordances—Download PDF, Get in touch (`mailto:`), Book a time (`cal.com/nathanpayne`,
    `target="_blank" rel="noopener"`)—each carrying a Lucide glyph, and the
    `download` glyph matches upstream Lucide path data byte for byte.
8c. `.resume-cta` closes the content column with exactly two links (Get in
    touch, Book a time) and **no** self-link back to `/resume/`.
8d. The emitted CSS hides both `.resume-actions` and `.resume-cta` inside
    `@media print`, and neither "Book a time" nor "Get in touch" appears in the
    text of the generated `Nathan-Payne-Resume.pdf`.
8a. No link annotation in the generated PDF points at `127.0.0.1` or
    `localhost`, and every one carries an `http(s):` or `mailto:` scheme.
8f. Every bullet on the page renders a **visible** marker in the PDF. Counting
    rectangles is not this criterion: `printBackground: false` emitted every
    one of them in white (#925), so the check renders the page with MuPDF and
    looks for ink.
8e. The PDF's **content stream**—not its rendered pages—carries the résumé in
    the page's own order: every Experience role is followed by its own summary
    and bullets before the next role begins, every printed block follows
    `/resume/`, each bullet appears exactly once, and the document is three
    pages. Read with `pdftotext -raw`, because ordinary extraction and page
    images both reconstruct order from coordinates and so pass on a file whose
    reading order is wrong. Every one of these assertions also runs against
    `tests/fixtures/known-bad-resume-pre-923.pdf` and is required to FAIL on
    it.
9. The visible header title is a single role title equal to the JSON-LD
   `jobTitle`; the summary is 55–75 words naming Disney+/Hulu/ESPN and the
   AI-augmented focus up front.
10. AJ+, Current TV, and CNN render with `resume-entry--compact`, keep their
    full date ranges, and the CNN Magic Wall is still present.
