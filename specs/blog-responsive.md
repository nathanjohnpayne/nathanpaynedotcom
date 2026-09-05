---
spec_id: blog-responsive
title: Blog Responsive Layout
---

# Blog Responsive Layout

## Overview

Blog pages must be fully readable at all viewport widths from 320px to 1920px with no horizontal overflow.

## Layout Invariant

No rendered element's bounding rect may extend beyond `document.documentElement.clientWidth`. No horizontal scrollbar may appear at any viewport width in the range 320px–1920px.

Content held inside its own horizontal scroll container is the one exception, and it is an exception to the first sentence only, never to the second: a code block or a Mermaid figure may hold content wider than itself, but the overflow belongs to that container and never reaches the page. `tests/responsive/overflow.spec.ts` encodes this by skipping any element with a scrollable ancestor. Mermaid relies on it in the article column below the stacked breakpoint (#894), so a diagram's own rect can legitimately be several times its column's width there. The blog sidebar relied on it too until #986: that column is too narrow for a wide diagram to be readable scrolled, let alone scaled, so it holds no diagram wide enough to overflow and no sidebar figure scrolls at any width.

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
12. The takeaway list markers (`.blog-takeaways__list li::before`) carry `print-color-adjust: exact` in `@media print`, and the panel (`.blog-takeaways`) does not. The markers are CSS backgrounds, so Chrome's default "Background graphics: off" dropped all four from every printed copy while the text and indent survived (#953). The panel is left out deliberately, not by omission: `print-color-adjust` is inherited, so declaring it on the panel prints an identical page—measured at the same four squares, the same 506 differing pixels, the same coordinates—because the only background it would add is the panel's own `#fff`, which is the paper. **On paper the takeaways read as a panel by their border, not by their plane**: `border: 1pt solid #000` with a `3pt` left edge, and a border is not a background, so it prints under either setting (blanking it moves 12,068 px in the default render). The wider rule therefore buys no ink and costs scope—`exact` on a content block inherits to every future descendant, which is the "too wide" cost #950 had to rule out before unscoping the lifecycle rule. The property belongs to the square whose fill is a background and to nothing that contains it.
