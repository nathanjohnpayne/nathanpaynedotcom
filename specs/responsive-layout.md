---
spec_id: responsive-layout
title: Responsive Layout
---

# Responsive Layout

## Overview

The site uses a CSS grid layout with a three-tier breakpoint scale and fluid typography via `clamp()`. Above the homepage breakpoint the Mondrian composition renders, capped at `--mondrian-max-width` (1280px) so very wide viewports center the composition with symmetric gutters. Below the breakpoint, the page swaps to a vertical stack that fills the viewport edge-to-edge. Three of the four focus states (about, projects, connect) size their focused panel to its measured content via JS-measured `--cell-h-{about,projects,connect}` CSS custom properties; community-focus uses minmax-only sizing because Connect lives on a track community would absorb. See #330.

## Requirements

1. The `.mondrian` grid uses `display: grid` with explicit column and row templates.
2. On viewports at or above 1024px, the grid layout is active with `aspect-ratio: 1 / 1`.
3. The Mondrian composition's width is capped at `--mondrian-max-width` (1280px); above the cap it centers with symmetric left/right gutters.
4. Below 1024px (`@media (max-width: 1023px)`), the mobile media query prevents panel interactions (JS guards) and the layout becomes a vertical stack with no max-width / no horizontal gutters.
5. Typography uses `clamp()` for fluid scaling (e.g., `clamp(0.8rem, 1.1vw, 1.08rem)`).
6. The stage centers content with `display: grid; place-items: center`.
7. The breakpoint scale is documented as CSS custom properties on `:root`:
   - `--bp-narrow` (480px)—phone-portrait threshold (project pages, metadata strips, 404 page).
   - `--bp-tablet` (768px)—phone-landscape / tablet-portrait threshold.
   - `--bp-stack` (1024px)—homepage Mondrian-to-stack swap.
   - `--mondrian-max-width` (1280px)—wide-viewport composition cap.
   See #313 (initial scale) and #330 (formalisation + bio-block content-sizing).
8. In about-focus and projects-focus, the spanning panel's first content track equals the JS-measured content height (`--cell-h-about`, `--cell-h-projects`), and the helper line + second content track collapse to 0. The right column's row tracks below retain their proportional sizes—the columns no longer share heights.
9. In connect-focus, track 8 equals the JS-measured Connect content height (`--cell-h-connect`); other tracks remain at their proportional minmax sizes. Connect's panel cell is therefore exactly content-sized—no cream void below the link list and "FROM THE BLOG" footer.
10. Community-focus does NOT apply the absorbed-helper pattern: Connect's `grid-row: 8` lives on a track that Community would absorb, and prior attempts to keep both content-sized (#325–#327) failed to converge. Community-focus uses minmax-only proportional sizing across all tracks; Connect renders as a tall narrow tile on the right. See #329 / #330.
11. The Selected Projects footer's content line reads `DOMAINS · Consumer · Enterprise · Finance · Developer tooling`, built from the `PROJECT_DOMAINS` array in `src/pages/index.astro` with a non-breaking space inside each multi-word term so a term never splits across the ribbon's two possible lines. The intro paragraph does not name the domains—the footer does—so they are said once rather than twice. The ` · ` separators are literal text rather than generated content, which is what lets a `Range` measure the line as a reader sees it. Measured: the line sets on one line at every viewport from 390px to 2560px and occupies at most 0.757 of the ribbon at desktop, against 0.986 for the ten-item stack line it replaced. The width at which it clears the exit link's column is not a breakpoint: the Mondrian square is sized from viewport height, so a short desktop window gives a narrow ribbon—1280×700 yields 427px and 1024×768 yields 484px—and the exit link takes ~136px of the row above. It clears from 484px up (+23.3px at 1024×768) and not at 427px; `tests/projects-ribbon.test.js` records that floor and the viewports below it, so the exemption cannot widen unnoticed. #984 shipped this behind a build-time switch against a `STACK` alternative so the two could be compared live; #991 settled it on DOMAINS and deleted the switch, the losing branch, and the #930 degradation ladder that only `STACK` used. The stack itself is not lost—it is on every project page and on the résumé. See #984, #991.