---
spec_id: blog-responsive
title: Blog Responsive Layout
---

# Blog Responsive Layout

## Overview

Blog pages must be fully readable at all viewport widths from 320px to 1920px with no horizontal overflow.

## Layout Invariant

No rendered element's bounding rect may extend beyond `document.documentElement.clientWidth`. No horizontal scrollbar may appear at any viewport width in the range 320px–1920px.

## Requirements

1. The viewport meta tag `<meta name="viewport" content="width=device-width, initial-scale=1">` is present on all blog pages.
2. `.project-copy` uses `min-width: 0` to prevent the grid item from expanding beyond its grid track.
3. `.project-detail` uses `overflow-x: hidden` as a safety net against child overflow.
4. Blog prose paragraphs and list items use `overflow-wrap: break-word` to prevent long words or URLs from overflowing.
5. Blog code blocks (`.blog-code-block`) use `overflow-x: auto` to scroll horizontally within their container.
6. Blog figure images (`.blog-figure img`) use `width: 100%` and `height: auto` for fluid sizing.
7. A phone breakpoint at `max-width: 480px` adjusts typography, padding, and button layout for small screens.
8. No blog post `<img>` element uses an inline `width` attribute that could override CSS fluid sizing.
