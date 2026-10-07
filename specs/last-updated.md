---
spec_id: last-updated
title: Blog Last-Updated Dates
---

# Blog Last-Updated Dates

## Summary

A revised blog post tells readers and search engines when it last changed, and nobody records that by hand (#1168). The date comes from git history at build time. Readers see the month; search surfaces get the exact time.

`scripts/lib/blog-last-updated.mjs` is the only implementation. The post page, the Open Graph meta and the sitemap all read the same map, so they cannot disagree.

## What counts as an update

A post's **last-updated time** is the committer timestamp of the newest commit on the built ref that meets all three conditions:

1. **It changed the Markdown body**, the text after the frontmatter block. Frontmatter-only edits (`homepageRank`, `tags`, `image`, a `description` reworded for the index) do not count, because nothing in the article changed for a reader.
2. **It is not the commit that added the file.** Renames are followed with git's rename detection, so a moved post keeps its history; a pure rename changes no body and never counts.
3. **It is not listed in `.freshness-ignore-revs`.**

A post with no qualifying commit has no last-updated time and is treated as unchanged. Uncommitted edits in a working tree are not dated; the time comes from committed history only.

## `.freshness-ignore-revs`

The escape hatch for mechanical sweeps, modelled on `.git-blame-ignore-revs`. One full 40-character SHA per line, `#` comments allowed. Every body change counts unless it is listed here, so a sweep PR (an em dash pass, a spelling sweep) adds its squash-merge SHA in a follow-up PR once it has merged.

The build fails on a line that is not a full SHA, and on a SHA the repository does not contain. A typo would otherwise leave the sweep counting as an update with no error.

## Missing history fails the build

The time is read from the full history. The build fails, naming the fix, when the checkout is shallow (`git rev-parse --is-shallow-repository`) or git cannot read the repository. It never falls back to the build time, the HEAD commit, or the frontmatter `date`: each of those produces a plausible date that is wrong.

`build-and-test.yml` checks out with `fetch-depth: 0` for this reason. Production deploys build from the local main checkout, which has full history.

## Surfaces

| Surface | Value | When |
|---|---|---|
| Sidebar metadata panel | An `Updated` row below `Published`, showing month and year (`October 2026`) inside `<time datetime="<full ISO timestamp>">` | Only when the last-updated time falls in a later calendar month than `date` |
| JSON-LD `BlogPosting.dateModified` | The last-updated time | When it is later than `date`; otherwise `datePublished` |
| `article:modified_time` | The last-updated time | Only when it is later than `date` |
| Sitemap `<lastmod>` for the post | The last-updated time | When it is later than `date`; otherwise `date` |
| Sitemap `<lastmod>` for `/blog/` | The newest post value | Always |

The `/blog/` index cards, the homepage Writing list, RSS and post ordering keep using `date`.

## Month and time zone

The reader-visible month and the same-month comparison use **America/Los_Angeles**. A commit at 20:58 Pacific on 6 October is 03:58 UTC on 7 October; it reads as October either way, but on the last evening of a month the Pacific reading is the one shown.

`date` is a calendar date, stored as midnight UTC and rendered in UTC as `Published`. Its month is read in UTC so it is never shifted to the previous day.

**Same-month updates are hidden on the page.** A post published on 1 October and revised on 6 October would otherwise show `Published October 1, 2026` above `Updated October 2026`, and the second row adds nothing. Search surfaces still carry the exact revision time.

## Tests

`tests/last-updated.test.js` builds throwaway git repositories, with fixed commit dates and no user git config, and covers: a body change counts; a frontmatter-only change does not; the adding commit does not; a rename keeps history; an ignored SHA is skipped; a malformed or unknown ignore entry fails; a shallow clone fails; the same-month rule; and the Pacific month boundary. It then checks every built post's sidebar row, JSON-LD, `article:modified_time` and sitemap entry against the helper's own answer for the live history, so the rendered surfaces cannot drift from the rule. `tests/sitemap.test.js` and `tests/blog-pages.test.js` derive their expected dates the same way rather than pinning dates that change whenever a post is edited.
