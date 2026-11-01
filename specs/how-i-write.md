---
spec_id: how-i-write
title: How I Write Page
---

# How I Write Page

## Overview

`/how-i-write/` is the site-level policy page on how the posts and case studies are written (#1494, part of #1490). It states the general practice, names what AI agents do and what the owner does, links the public drafting workflow pinned to a commit, says that each piece's own "How this was written" statement is the specific account, and scopes itself to this site's posts and case studies. The path and title were decided in #1491. Every page links to it, beside the Privacy link.

## Requirements

### Copy

1. The page's copy is the Markdown body of `src/content/site-copy/how-i-write.md`, rendered by `src/pages/how-i-write.astro`. Keeping it in Markdown puts it under the prose linter (`npm run lint:prose`), and the owner's verbatim approval covers one file.
2. The owner approves the copy verbatim in the pull request that adds or changes it, and that pull request maps each sentence to the passage of `docs/blog-writing-workflow.md`, `docs/agents/blog-revision-process.md` or the per-piece records in `plans/` that supports it. A sentence must not claim more owner authorship, or less agent involvement, than those records show.
3. The opening names the AI role plainly (#1491): agents write the posts and case studies.
4. The copy links the public workflow, `docs/blog-writing-workflow.md`, on GitHub at a full 40-character commit SHA. The link opens in a new tab with `rel="noopener"`, as every off-site link does. The pinned commit must contain the file; `tests/how-i-write.test.js` checks both with local Git.
5. The copy says every post and case study has a facts ledger in the repository. `tests/how-i-write.test.js` keeps that true: every entry in `src/content/blog/` and `src/content/projects/`, drafts included, must have a ledger named `<slug>-ledger.md` under `plans/`, `plans/759/` or `plans/correctness-pass-2026-10-06/`. A new entry without one fails the test until its ledger lands or the sentence changes.

### Page

6. The page follows the `/privacy/` composition: a framed canvas, a header with the accent rail, the breadcrumb (Nathan Payne → How I write), the `<h1>` and the deck, then the reading column, then the shared footer (`detail` variant) with "Back to Homepage". The headline is `HOW_I_WRITE_TITLE` and the path `HOW_I_WRITE_PATH`, both in `src/lib/how-i-write.ts`.
7. The page carries no inline script and no analytics of its own beyond what every page carries.

### Metadata and copy owners

8. Descriptive copy is owned by the frontmatter of `src/content/site-copy/how-i-write.md` (specs/seo-metadata.md § Descriptive Copy Owners): `description` is the meta description and the `WebPage` JSON-LD description; `ogDescription` is the og and twitter description, the deck, and the share card's line.
9. JSON-LD carries a `WebPage` (author: the site's Person) and a `BreadcrumbList` (Nathan Payne → How I write).
10. The share card is `src/pages/og-templates/how-i-write.astro`, rendered to `og/how-i-write.png` by the build (specs/seo-metadata.md § OG image targets).
11. The route is in the sitemap and has no reliable content date, so its entry carries no `lastmod` (specs/seo-metadata.md § Sitemap).

### Links

12. Every page links to `/how-i-write/` immediately before its Privacy link, through `src/components/HowIWriteLink.astro`, in that surface's own vocabulary, as `PrivacyLink.astro` does (specs/analytics-privacy.md § UI Hooks). The link is not behind the privacy flag. Its accessible name is "How I write" everywhere.
    - The shared footer (`Footer.astro`, every variant) shows Lucide's `pencil-sparkles` as an icon-only square button (`.nav-button--icon`) with `aria-label` and `title` "How I write", the same size as the Privacy icon. At ≤480px, where footer text buttons take full rows, the last text button's basis leaves room for both icons, so they share its row and cause no horizontal overflow.
    - The homepage, which has no footer, carries the worded link with the trailing arrow in the Connect panel's contact line, between Résumé and Privacy (`.availability-how-i-write`, on the accent-arrow list in `global.css`).
    - The 404, which has no footer, leads the words with the icon in its destination buttons, between Blog and Privacy.
13. The icon lives in `src/components/NavIcon.astro` as `pencil-sparkles`, transcribed verbatim from Lucide (ISC), so the per-piece "AI use" link (#1493) reuses the same glyph.

## Keeping it current

When the drafting workflow changes in a way the page describes, update the copy, repin the workflow link to a commit that has the change, and get the owner's verbatim approval again. A pinned link to an older commit is not wrong by itself: it shows the workflow as of that commit.
