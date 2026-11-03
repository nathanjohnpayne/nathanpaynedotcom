---
spec_id: how-i-write
title: How I Write Page
---

# How I Write Page

## Overview

`/how-i-write/` is the site-level policy page on how the posts and case studies are written (#1494, part of #1490). It states the general practice, names what AI agents do and what the owner does, links the public drafting workflow pinned to a commit, says that each piece's own "How this was written" statement is the specific account, explains in a short section how the AI-use disclosures are flagged for review when the text changes (#1537), and scopes itself to this site's posts and case studies in a closing section. The path and title were decided in #1491. Every page links to it, beside the Privacy link.

## Requirements

### Copy

1. The page's copy is the Markdown body of `src/content/site-copy/how-i-write.md`, rendered by `src/pages/how-i-write.astro`. Keeping it in Markdown puts it under the prose linter (`npm run lint:prose`), and the owner's verbatim approval covers one file.
2. The owner approves the copy verbatim in the pull request that adds or changes it, and that pull request maps each sentence to the passage of `docs/blog-writing-workflow.md`, `docs/agents/blog-revision-process.md` or the per-piece records in `plans/` that supports it. A sentence must not claim more owner authorship, or less agent involvement, than those records show.
3. The opening names the AI role plainly (#1491): agents write the posts and case studies.
4. The copy links the public workflow, `docs/blog-writing-workflow.md`, on GitHub at a full 40-character commit SHA. The link opens in a new tab with `rel="noopener"`, as every off-site link does. The pinned commit must contain the file; `tests/how-i-write.test.js` checks both with local Git.
5. The copy says every post and case study has a facts ledger in the repository. `tests/how-i-write.test.js` keeps that true: every entry in `src/content/blog/` and `src/content/projects/`, drafts included, must have a ledger named `<slug>-ledger.md` under `plans/`, `plans/759/` or `plans/correctness-pass-2026-10-06/`. A new entry without one fails the test until its ledger lands or the sentence changes.
6. The body is eight paragraphs, then two level-two sections, in this order (#1537):
   - The eight paragraphs run from the opening through the one that introduces each piece's "How this was written" statement and links the public workflow.
   - "When the text changes" says that each post and case study has a fingerprint of its text and its statement, and that when either changes the site's tests flag the change for review. It says the owner confirms the statement still describes how the piece was made, revising it if needed, before the fingerprint is updated, and that the check catches changes that need another look without proving the owner reviewed the piece or that the statement and article are accurate. It describes the mechanism in `src/lib/ai-use-stamp.mjs` and `docs/agents/blog-revision-process.md` § The `aiUse` statement and changes neither.
   - "What this page covers" holds the scoping paragraph: posts and case studies, not every word on the site, and not writing published elsewhere or how the software was built.

   The headings use the existing `.project-copy h2` treatment (ruled, italic); the page adds no styles for them. `tests/how-i-write.test.js` checks the rendered blocks against the source in order and the heading structure: one `<h1>`, and the two sections as `<h2>` directly inside `.policy-copy`.

### Page

7. The page follows the `/privacy/` composition: a framed canvas, a header with the accent rail, the breadcrumb (Nathan Payne → How I write), the `<h1>` and the deck, then the reading column, then the shared footer (`detail` variant) with "Back to Homepage". The headline is `HOW_I_WRITE_TITLE` and the path `HOW_I_WRITE_PATH`, both in `src/lib/how-i-write.ts`.
8. The page carries no inline script and no analytics of its own beyond what every page carries.

### Metadata and copy owners

9. Descriptive copy is owned by the frontmatter of `src/content/site-copy/how-i-write.md` (specs/seo-metadata.md § Descriptive Copy Owners): `description` is the meta description and the `WebPage` JSON-LD description; `ogDescription` is the og and twitter description, the deck, and the share card's line.
10. JSON-LD carries a `WebPage` (author: the site's Person) and a `BreadcrumbList` (Nathan Payne → How I write).
11. The share card is `src/pages/og-templates/how-i-write.astro`, rendered to `og/how-i-write.png` by the build (specs/seo-metadata.md § OG image targets).
12. The route is in the sitemap and has no reliable content date, so its entry carries no `lastmod` (specs/seo-metadata.md § Sitemap).

### Links

13. Every page links to `/how-i-write/` immediately before its Privacy link, through `src/components/HowIWriteLink.astro`, in that surface's own vocabulary, as `PrivacyLink.astro` does (specs/analytics-privacy.md § UI Hooks). The link is not behind the privacy flag. Its accessible name is "How I write" everywhere.
   - The shared footer (`Footer.astro`, every variant) shows Lucide's `pencil-sparkles` as an icon-only square button (`.nav-button--icon`) with `aria-label` and `title` "How I write", the same size as the Privacy icon. At ≤480px, where footer text buttons take full rows, the last text button's basis leaves room for both icons, so they share its row and cause no horizontal overflow.
   - The homepage, which has no footer, carries the worded link with the trailing arrow in the Connect panel's contact line, between Résumé and Privacy (`.availability-how-i-write`, on the accent-arrow list in `global.css`).
   - The 404, which has no footer, leads the words with the icon in its destination buttons, between Brand and Privacy. Its eight buttons run in that order (owner decision, #1494): Homepage, Résumé, Projects, Blog, Book, Brand, How I write, Privacy, in equal columns. From 900px they form two rows of four; from 481px to 899px, four rows of two; at ≤480px they stack full width. Four columns start at 900px because a column must hold the widest button's content (padding, icon and an unbreakable label, about 153px): measured on the built page it first does at 830px and has 14px to spare at 900px. `tests/responsive/not-found-phone.spec.ts` checks the column count and that every label fits at widths from 481px to 1440px, including 899px and 900px.
14. The icon lives in `src/components/NavIcon.astro` as `pencil-sparkles`, transcribed verbatim from Lucide (ISC), so the per-piece "AI use" link (#1493) reuses the same glyph.

## Keeping it current

When the drafting workflow changes in a way the page describes, update the copy, repin the workflow link to a commit that has the change, and get the owner's verbatim approval again. A pinned link to an older commit is not wrong by itself: it shows the workflow as of that commit.
