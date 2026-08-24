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
