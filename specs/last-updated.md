---
spec_id: last-updated
title: Last-Updated Dates
---

# Last-Updated Dates

## Summary

Blog posts (#1168) and project pages (#1169) tell readers and search engines when they last changed, and nobody records that by hand. The date comes from git history at build time. Readers see the month; search surfaces get the exact time.

`scripts/lib/last-updated.mjs` is the only implementation. Every page, Open Graph tag and sitemap entry that carries the date reads the same map, so they cannot disagree.

## What counts as an update

A page's **last-updated time** is the committer timestamp of the newest commit on the built ref that meets all three conditions:

1. **It changed what the page's collection counts.**
   - **Blog posts (`src/content/blog/**/*.md`): the Markdown body**, the text after the frontmatter block. Frontmatter-only edits (`homepageRank`, `tags`, `image`, a `description` reworded for the index) do not count, because nothing in the article changed for a reader.
   - **Project pages (`src/content/projects/**/*.{md,mdx}`): any change to the file.** Much of a project page's reader-visible content lives in frontmatter (`description`, `status`, `metadata`, `constraints`, `decisions`, `learnings`), so a body-only rule would miss real updates. Screenshot and GIF refreshes under `public/` and shared-component changes are not the file and do not count: they change how a page looks, not what it claims.
2. **It is not the commit that added the file.** Renames are followed with git's rename detection over the whole repository, so a page keeps its history when it moves within its directory or into it from elsewhere. A pure rename changes nothing and never counts.
3. **It is not listed in `.freshness-ignore-revs`.**

A page with no qualifying commit has no last-updated time and is treated as unchanged. Uncommitted edits in a working tree are not dated; the time comes from committed history only.

### Merge commits

`main` is squash-only, so this matters only for history from before that rule and for merge commits on a branch. A merge counts when the merged content differs, under the collection's rule, from **every** parent's: that is a conflict resolution, and it is a real edit. A merge that takes one side unchanged, such as syncing `main` into a branch, is not an update; the commits it brings in are dated on their own. A file that first appears in a merge was added there.

## `.freshness-ignore-revs`

The escape hatch for mechanical sweeps, modelled on `.git-blame-ignore-revs`. One full 40-character SHA per line, `#` comments allowed. Every qualifying change counts unless it is listed here, so a sweep PR (an em dash pass, a spelling sweep) adds its squash-merge SHA in a follow-up PR once it has merged.

The build fails on a line that is not a full SHA, on a SHA the repository does not contain, and on a SHA that names something other than a commit, such as an annotated tag. Each of these would otherwise leave the sweep counting as an update with no error. The tag error names the commit to list instead.

## Missing history fails the build

The time is read from the full history. The build fails, naming the fix, when the checkout is shallow (`git rev-parse --is-shallow-repository`) or git cannot read the repository. It never falls back to the build time, the HEAD commit, or a frontmatter date: each of those produces a plausible date that is wrong.

`build-and-test.yml` checks out with `fetch-depth: 0` for this reason. Production deploys build from the local main checkout, which has full history.

## Blog surfaces

| Surface | Value | When |
|---|---|---|
| Sidebar metadata panel | An `Updated` row below `Published`, showing month and year (`October 2026`) inside `<time datetime="<full ISO timestamp>">` | Only when the last-updated time falls in a later calendar month than `date` |
| JSON-LD `BlogPosting.dateModified` | The last-updated time | When it is later than `date`; otherwise `datePublished` |
| `article:modified_time` | The last-updated time | Only when it is later than `date` |
| Sitemap `<lastmod>` for the post | The last-updated time | When it is later than `date`; otherwise `date` |
| Sitemap `<lastmod>` for `/blog/` | The newest post value | Always |

The `/blog/` index cards, the homepage Writing list, RSS and post ordering keep using `date`.

**Same-month updates are hidden on the post page.** A post published on 1 October and revised on 6 October would otherwise show `Published October 1, 2026` above `Updated October 2026`, and the second row adds nothing. Search surfaces still carry the exact revision time.

## Project surfaces

A project page has no publication date, so there is nothing to compare against and no same-month rule: a project with a last-updated time always shows it.

| Surface | Value | When |
|---|---|---|
| STATUS cell of the metadata strip | A second line under the lifecycle status, `Updated October 2026` inside `<time datetime="<full ISO timestamp>">`, in the strip's `dt` voice | When the project has a last-updated time |
| JSON-LD `WebPage.dateModified` | The last-updated time | Same |
| Sitemap `<lastmod>` for `/projects/<slug>/` | The last-updated time | Same; otherwise omitted, per specs/seo-metadata.md § Sitemap rule 6 |
| Sitemap `<lastmod>` for `/projects/` | The newest project value | When any project has one |

The date belongs in the STATUS cell because the status is the page's main claim about the present, and the date is its "as of". It is a second `<dd>` under the cell's `<dt>`, so the strip keeps four labels and one lifecycle mark (specs/project-pages.md § Lifecycle marker). `dateModified` goes on the `WebPage` node only: on the `SoftwareApplication` node it would claim the app itself changed when the case study did. The sitemap route comes from frontmatter `slug`, which is what `src/pages/projects/[slug].astro` routes on. The `/projects/` cards and the homepage Builds row are unchanged.

## Month and time zone

The reader-visible month and the same-month comparison use **America/Los_Angeles**. A commit at 20:58 Pacific on 6 October is 03:58 UTC on 7 October; it reads as October either way, but on the last evening of a month the Pacific reading is the one shown.

A blog post's `date` is a calendar date, stored as midnight UTC and rendered in UTC as `Published`. Its month is read in UTC so it is never shifted to the previous day.

## Tests

`tests/last-updated.test.js` builds throwaway git repositories, with fixed commit dates and no user git config, and covers: a body change counts for a post and a frontmatter-only change does not; a frontmatter-only change **does** count for a project; the adding commit does not count; a rename keeps history, including a move in from outside the content directory; a merge counts only when it differs from every parent, and a sync merge does not; an ignored SHA is skipped; a malformed, unknown or annotated-tag ignore entry fails; a shallow clone fails; the same-month rule; and the Pacific month boundary. It then checks every built post's sidebar row, JSON-LD, `article:modified_time` and sitemap entry, and every built project's STATUS line, JSON-LD and sitemap entry, against the helper's own answer for the live history, so the rendered surfaces cannot drift from the rule. `tests/sitemap.test.js` and `tests/blog-pages.test.js` derive their expected dates the same way rather than pinning dates that change whenever a page is edited.
