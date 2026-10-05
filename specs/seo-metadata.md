---
spec_id: seo-metadata
title: SEO Metadata
---

# SEO Metadata

## Overview

Every built page ships comprehensive SEO metadata: Open Graph, Twitter Card, JSON-LD structured data, and a canonical URL. Beyond the presence of the tags, the referenced assets and URLs must actually resolve—a lesson from #163, where the tags were correct on paper and the plumbing behind them was not.

## Tag Requirements

1. Open Graph tags are present: `og:type`, `og:title`, `og:description`, `og:url`, `og:image`.
2. Twitter Card tags are present: `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`.
3. A canonical URL link element points to the built URL of the current page.
4. JSON-LD structured data contains a `@graph` array with WebSite, ProfilePage, and Person types on the homepage; BlogPosting on blog post pages; and ItemList nodes on collection pages. Collection ItemList entries keep article/page-specific properties on a typed entity under `ListItem.item`, not on the bare ListItem node.
5. The Person entity includes `name`, identity/location context, and `sameAs` properties. It must not claim a current `worksFor` value unless the site owner has explicitly chosen to publish one.
6. Search metadata can use SEO-only content fields (`seoTitle`, `seoDescription`) when visible page copy is intentionally longer than a search title or snippet should be.
7. Every page advertises `/rss.xml` with a `rel="alternate"` RSS link.

## Blog Title Hierarchy

One canonical headline per post. The three frontmatter title fields are a length ladder over that single headline, never three different headlines (#623).

| Field | Role | Surfaces |
|---|---|---|
| `title` | The headline of record. Always full length. | post `<h1>`, `/blog/` card `<h2>`, homepage Writing list, RSS `<title>`, JSON-LD `headline` |
| `seoTitle` | The same headline trimmed to fit the ~60-character SERP budget once `" \| Nathan Payne"` is appended. Optional; omit when `title` already fits. | `<title>`, `og:title`, `twitter:title`, the generated OG card image |
| `shortTitle` | A breadcrumb-width abbreviation. Optional. | breadcrumb trail only |

1. `seoTitle` must remain recognisably the same headline as `title`—a trim, not a rewrite. `shortTitle` must be an abbreviation of `title`, not a rename.
2. `shortTitle` must never stand in for the page title, `og:title`, or the OG card heading. A reader who follows a shared link has to land on the headline the unfurl showed them; substituting the abbreviation is what produced the mismatch in #623.
3. Both constraints are enforced at `npm test` time by `tests/blog-title-consistency.test.js`, which requires meaningful significant-word overlap with `title` and asserts the canonical headline reaches the `<h1>`, the `/blog/` card, the homepage link, and RSS.

## Plumbing Requirements (post-build invariants)

These are the invariants that distinguish "SEO tags exist" from "SEO actually works." All are enforced at `npm test` time by tests that run after `astro build`.

### Sitemap

1. `dist/robots.txt` contains exactly one `Sitemap:` directive.
2. That `Sitemap:` URL is an absolute `https://nathanpayne.com/...` URL.
3. The file the URL points at actually exists in `dist/` at the final served path. Enforced by `tests/robots-sitemap.test.js`.
4. The `Sitemap:` line is not hand-maintained—it is rewritten at build time by `src/integrations/robots-sitemap.mjs`, which scans `dist/` for the real sitemap filename (`sitemap-index.xml` → `sitemap.xml` → sorted `sitemap*.xml` fallback) and appends a fresh directive. Any existing `Sitemap:` lines in `dist/robots.txt` are stripped first. If no sitemap file exists in `dist/`, the build fails rather than shipping a broken `robots.txt`.
5. The `User-agent:` / `Allow:` rules hand-authored in `public/robots.txt` survive the integration's rewrite intact. Enforced by `tests/robots-sitemap.test.js`.
6. Sitemap `<lastmod>` values must be content-derived. Blog post routes use the post frontmatter `date`; the blog index uses the newest published post date. Pages without a reliable content date omit `<lastmod>` rather than using build time. Enforced by `tests/sitemap.test.js`.

### OG image targets

1. Every built HTML page has an `og:image` meta tag. Enforced by `tests/og-image-targets.test.js`.
2. Every `og:image`, `og:image:secure_url`, and `twitter:image` URL is absolute under `https://nathanpayne.com/`.
3. Every such URL resolves to a regular file (not a directory) in `dist/`. Path resolution uses WHATWG URL parsing with a `path.relative` containment check against the dist root, so path-traversal URLs (`../etc/passwd`) cannot escape. `?v=<hash>` cache-bust query strings are stripped before file resolution.
4. Within a page, `og:image` and `twitter:image` point at the same URL.
5. Within a page, `og:image:secure_url` matches `og:image` when both are present.
6. Per-item OG cards are generated from content frontmatter, never hand-typed: blog cards by `src/pages/og-templates/blog/[...slug].astro`, project cards by `src/pages/og-templates/projects/[slug].astro` (#1088). A hand-written per-project template is what let two project cards drift from the pages they describe. The build records each card's rendered label, heading, description and tag line in `.astro/og-cards.json` at the checkout root (gitignored and per-checkout, so it never deploys and worktrees cannot overwrite each other's record), and `tests/project-pages.test.js` asserts every project card against its frontmatter.
7. Every OG card fits its frame as rendered. After `document.fonts.ready`, `src/integrations/og-images.mjs` measures each card and fails the build when a block sits closer than 24px to the clipping edge of `.og-content` or the tag line wraps. `.og-content` is `overflow: hidden`, so without this an overlong card is cut off silently. Enforced at build time; the judgment is unit-tested in `tests/og-fit.test.js`.

### Site icons

1. `BaseLayout` links `/favicon.ico`, `/favicon-32x32.png`, `/apple-touch-icon.png`, and `/site.webmanifest`, and each resolves to a file in `dist/`. It does not link `/favicon.svg`.
2. Those root files keep their paths and are byte-for-byte copies of the logo system in `public/images/brand/` (`np-favicon.ico`, `np-mark.svg`, `np-mark-32.png`, `np-mark-180.png`). `favicon.svg` is served for direct fetches only. The `.ico`'s 16px entry is the monogram-free tile, and that is what enforces the rule that the monogram never ships at 16px; linking the SVG would let browsers that take SVG favicons bypass it.
3. The manifest links its 192 and 512 icons in place under `/images/brand/` rather than copying them.
4. Every OG card carries the NP mark, inlined from `np-mark.svg`, in a grid cell outside `.og-content`, so it never collides with the heading or enters the fit check.
5. The inlined mark's fills are palette tokens, never literal hexes (`src/lib/og-mark.ts`), so it follows the card's register: 1930 on the homepage card, 1921 elsewhere. Each token resolves to the exported hex in the 1930 register, and a fill with no token fails the build.

All five are enforced by `tests/site-icons.test.js` (#1110).

## Integration Requirements (Astro build hooks)

1. Custom Astro integrations that consume the `dir` parameter from `astro:build:done` MUST convert it via `fileURLToPath(dir)` (from `node:url`)—never via `dir.pathname`. Using `dir.pathname` produces malformed paths on Windows (`/C:/path/...` → `C:\C:\path\...` when passed to `path.join`). See #171 and #173.
2. Integrations that depend on files generated by earlier integrations (e.g. `robots-sitemap` depends on `@astrojs/sitemap`'s output) MUST be registered after those earlier integrations in `astro.config.mjs`. Astro's `astro:build:done` hooks fire in registration order.

## Regression Context

Issue #163 surfaced this spec's entire "plumbing requirements" section. At the time, the SEO tags were present and well-formed, `@astrojs/sitemap` was producing a valid `sitemap-index.xml`, and every OG image was being screenshotted into `dist/og/`. But `public/robots.txt` declared `Sitemap: https://nathanpayne.com/sitemap.xml`—a URL that returned 404 because the real file was `sitemap-index.xml`. Google Search Console fetched the broken URL, failed, and had no canonical URL list to crawl against. The site went unindexed for months with no failing tests.

PRs #170 (hotfix), #171 (structural prevention), #172 (OG image smoke checks), and #173 (Windows portability fix) collectively close that gap. This spec is the documentation for the post-fix invariants.
