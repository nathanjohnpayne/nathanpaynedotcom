---
spec_id: responsive-layout
title: Responsive Layout
---

# Responsive Layout

## Overview

The site uses a CSS grid layout with a 1024px breakpoint (`--bp-stack`) and fluid typography via `clamp()`. Above the breakpoint the homepage renders the Mondrian composition, capped at `--mondrian-max-width` (1280px) so very wide viewports center the composition with symmetric gutters. Below the breakpoint, the page swaps to a vertical stack that fills the viewport edge-to-edge.

## Requirements

1. The `.mondrian` grid uses `display: grid` with explicit column and row templates.
2. On viewports at or above 1024px, the grid layout is active with `aspect-ratio: 1 / 1`.
3. The Mondrian composition's width is capped at `--mondrian-max-width` (1280px); above the cap it centers with symmetric left/right gutters.
4. Below 1024px (`@media (max-width: 1023px)`), the mobile media query prevents panel interactions (JS guards) and the layout becomes a vertical stack with no max-width / no horizontal gutters.
5. Typography uses `clamp()` for fluid scaling (e.g., `clamp(0.8rem, 1.1vw, 1.08rem)`).
6. The stage centers content with `display: grid; place-items: center`.
7. The breakpoint scale is documented as CSS custom properties on `:root`: `--bp-stack` (1024px) for the homepage Mondrian-to-stack swap and `--mondrian-max-width` (1280px) for the wide-viewport composition cap. See #313.
