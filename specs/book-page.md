---
spec_id: book-page
title: Book Page
---

# Book Page

## Overview

`/book/` is the site's own version of the Cal.com profile page at `https://cal.com/nathanpayne`. Cal.com's page lists every public event type and books it; `/book/` says the same things in the site's composition (the hero and the Mondrian card grid the `/projects/` and `/blog/` indexes use) and hands off to Cal.com for the booking itself. It is where every "Book time" link on the site lands: the homepage Connect panel, the résumé action row and closing CTA, the projects index footer and the blog post CTA all link to `BOOK_PAGE_PATH` (`/book/`, in `src/lib/booking.ts`) in the same tab, and none of them links to Cal.com directly. It also serves a link shared directly.

## Requirements

### Data

1. The cards come from the `booking` content collection (`src/content/booking/*.md`), one entry per public Cal.com event type. Cal.com is the source of truth; each entry mirrors the event type's title, slug, description and offered durations by hand, plus a `where` line (the meeting formats or the city) and an `order`. The schema in `src/content.config.ts` is strict: an unknown key, an empty string, a slug that is not a Cal.com path segment, or an empty `durations` list fails the build.
2. Cards render in `order`. The kicker reads `<durations> · <where>`, with the durations formatted by `formatDurations` in `src/lib/booking.ts` (`15 min`, `60 or 90 min`, `60, 90, or 120 min`), the title and the description verbatim from the entry.
3. A hidden Cal.com event type is never entered in the collection, so it cannot appear on the page, in its JSON-LD, or in the built HTML. `tests/book.test.js` pins the public slugs the page may carry and fails on any other `cal.com/nathanpayne/<slug>` reference.
4. Every URL derives from `src/lib/booking.ts`: `CAL_PROFILE_URL` (`https://cal.com/nathanpayne`) for the profile link, and `bookingUrl(slug)` for a card. No template retypes a Cal.com URL.

### Links only

5. Nothing from Cal.com loads on the page: no embed script, no iframe, no prefetch or preconnect. The only `cal.com` references in the built page are plain `href` attributes on anchors and the same URLs in the JSON-LD. `docs/privacy/inventory.md` records Cal.com as a link-only recipient that receives nothing until a visitor clicks, and this page keeps that true. An inline booking widget would make Cal.com a page-load recipient and would need the inventory, the notice and `/privacy/` updated first (specs/analytics-privacy.md PRIV-1).
6. Each card carries two links to its booking page, the title and a "Pick a time ↗" tag, and the closing band links the Cal.com profile. All open in a new tab with `rel="noopener"`, as every off-site link does. They are plain `href`s in the static HTML, so they work without JavaScript, as the homepage booking link does (#620).

### Metadata and copy owners

7. Descriptive copy is owned by `src/content/site-copy/book.md` (specs/seo-metadata.md § Descriptive Copy Owners): `description` is the meta description and the `CollectionPage` JSON-LD description; `ogDescription` is the og and twitter description, the hero deck, and the share card's line. The headline is `BOOK_TITLE` in `src/lib/booking.ts`, read by the `<h1>`, the breadcrumb, the `ItemList` name and the share card.
8. JSON-LD carries a `CollectionPage` whose `mainEntity` is an `ItemList` of the cards in order, each `ListItem.item` a `WebPage` with the booking URL, title and description, and a `BreadcrumbList` (Nathan Payne → Book time).
9. The share card is `src/pages/og-templates/book.astro`, rendered to `og/book.png` by the build with its own alt text (specs/seo-metadata.md § OG image targets).
10. The route has no reliable content date, so the sitemap entry carries no `lastmod` (specs/seo-metadata.md § Sitemap).

### Analytics

11. A click on either link of a card captures `booking_event_type_clicked` with the event type's slug as `event_type` (specs/analytics.md § Events), through the same optional `window.posthog` contract as every other page event, so the links work with analytics off or absent.

## Keeping it current

The page cannot read Cal.com at build time (no credential ships with the build, and `scripts/build-production-check.mjs` keeps the build credential-free), so a change on Cal.com reaches the page only by editing the collection. When an event type is added, renamed, re-described, hidden, or offered at different lengths, update its entry, or remove it, and the tests take the page from there.
