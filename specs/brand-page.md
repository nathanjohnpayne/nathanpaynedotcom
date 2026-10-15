---
spec_id: brand-page
title: Brand Page
---

# Brand Page

## Overview

`/brand/` is the public page for the NathanPayne.com logo system. It lists every file in `public/images/brand/` for download, grouped into families (the mark and its variants, the lockups, the wordmark, the social images, the Google files and the browser icons), with a preview of each family and a line on when to use it. It closes with the palette, the typefaces and the usage rules. It is a page over the files, not a new home for them: the files stay at `/images/brand/<file>`, where the web manifest and the root favicon copies expect them (specs/seo-metadata.md § Site icons). `docs/brand-logo-usage.md` remains the full usage guide, and the page condenses it.

## Requirements

### Data

1. The families come from `BRAND_FAMILIES` in `src/lib/brand-assets.ts`, in array order. Each family has an `id`, a `title`, a `description` (when to use it), a `preview` (one of its own files, with its intrinsic width and height, and alt text) and its `files`, each a file name and a link label.
2. The list is complete and exact. Every file in `public/images/brand/` appears in exactly one family, and every file a family lists exists on disk. `tests/brand.test.js` reads the directory, so a regenerated asset that is added, renamed or dropped fails until the list is updated.
3. Every asset URL derives from `brandAssetUrl(file)` (`/images/brand/<file>`). No template retypes the directory.
4. The palette in the closing band is `BRAND_COLORS`, the 1930-register colors the exported files are drawn in. Each hex is a fill in `np-mark.svg` and a key of `MARK_FILL_TOKENS` in `src/lib/og-mark.ts`, so the page cannot list a color the mark does not use.

### Page

5. One card per family, in the hero and Mondrian card grid composition the `/projects/`, `/blog/` and `/book/` indexes use (`src/lib/index-grid.ts`). Each card carries the family's preview, set straight on the card with no backdrop so a transparent file shows as transparent, a kicker from `formatFamilyKicker` (formats in first-seen order and the file count, such as `SVG · PNG · 11 files`), the title, the description, and one download link per file. The card's `id` is the family `id`, so a family can be linked directly.
6. Download links are plain same-origin `href`s with a `download` attribute and no `target`, so they work without JavaScript. Each link's accessible name is the family title followed by its visible label, so a screen reader can tell one card's "SVG" from another's.
7. Preview images carry `width`, `height` and `alt`, and load lazily after the first card.
8. A closing band lists the palette as swatches with their hex values, names the typefaces (Cormorant Garamond 600 for the name, Inter 500 small capitals for the domain), and states the usage rules: clear space of one quarter of the mark's height, and no recoloring, gradients, shadows, rotation or substitute typeface.

### Metadata and copy owners

9. Descriptive copy is owned by `src/content/site-copy/brand.md` (specs/seo-metadata.md § Descriptive Copy Owners): `description` is the meta description and the `CollectionPage` JSON-LD description; `ogDescription` is the og and twitter description, the hero deck, and the share card's line. The headline is `BRAND_TITLE` in `src/lib/brand-assets.ts`, read by the `<h1>`, the breadcrumb, the `ItemList` name and the share card.
10. JSON-LD carries a `CollectionPage` whose `mainEntity` is an `ItemList` of the families in order, each `ListItem.item` an `ImageObject` with the absolute URL of the family's preview file as `contentUrl`, the family title and description, and a `BreadcrumbList` (Nathan Payne → Brand assets).
11. The share card is `src/pages/og-templates/brand.astro`, rendered to `og/brand.png` by the build (specs/seo-metadata.md § OG image targets). Like every card but the homepage's, it does not carry the mark (§ Site icons, requirement 4).
12. The route has no reliable content date, so the sitemap entry carries no `lastmod` (specs/seo-metadata.md § Sitemap).

## Keeping it current

When `scripts/brand/build-logo-assets.mjs` adds, renames or drops a file, update `BRAND_FAMILIES` in the same change; the test fails until the list and the directory agree. When a usage rule changes, update `docs/brand-logo-usage.md` and the family's description together.
