---
spec_id: blog-responsive
title: Blog Responsive Layout
---

# Blog Responsive Layout

## Overview

Blog pages must be fully readable at all viewport widths from 320px to 1920px with no horizontal overflow.

## Layout Invariant

No rendered element's bounding rect may extend beyond `document.documentElement.clientWidth`. No horizontal scrollbar may appear at any viewport width in the range 320px–1920px.

Content held inside its own horizontal scroll container is the one exception, and it is an exception to the first sentence only, never to the second: a code block or a Mermaid figure may hold content wider than itself, but the overflow belongs to that container and never reaches the page. `tests/responsive/overflow.spec.ts` encodes this by skipping any element with a scrollable ancestor. Mermaid relies on it in both directions—the article column below the stacked breakpoint (#894) and the blog sidebar at every width it is visible at (#897)—so a diagram's own rect can legitimately be several times its column's width.

## Requirements

1. The viewport meta tag `<meta name="viewport" content="width=device-width, initial-scale=1">` is present on all blog pages.
2. `.project-copy` uses `min-width: 0` to prevent the grid item from expanding beyond its grid track.
3. `.project-detail` uses `overflow-x: hidden` as a safety net against child overflow.
4. Blog prose paragraphs and list items use `overflow-wrap: break-word` to prevent long words or URLs from overflowing.
5. Blog code blocks (`.blog-code-block`) use `overflow-x: auto` to scroll horizontally within their container.
6. Blog figure images (`.blog-figure img`) use `width: 100%` and `height: auto` for fluid sizing.
7. A phone breakpoint at `max-width: 480px` adjusts typography, padding, and button layout for small screens.
8. No blog post `<img>` element uses an inline `width` attribute that could override CSS fluid sizing.
9. The key-takeaways box (`.blog-takeaways`, issue #621) renders inside the article column (`.blog-content`), never in the sidebar, and its list items use `overflow-wrap: break-word` so a long claim cannot overflow the column.
10. End-of-post prev/next navigation (`.blog-postnav`, issue #622) sizes its columns with `repeat(auto-fit, minmax(16rem, 1fr))`, so it collapses to a single column on narrow viewports without a breakpoint, and each card carries `min-width: 0` so a long post title cannot expand the grid track.
11. The end-of-post block (`.blog-postscript`) is hidden in `@media print`; the key-takeaways box prints instead, forced to black-on-white and kept whole with `break-inside: avoid`.
