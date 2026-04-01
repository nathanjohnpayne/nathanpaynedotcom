---
spec_id: responsive-layout
title: Responsive Layout
---

# Responsive Layout

## Overview

The site uses a CSS grid layout with a 920px breakpoint and fluid typography via `clamp()`.

## Requirements

1. The `.mondrian` grid uses `display: grid` with explicit column and row templates.
2. On viewports above 920px, the grid layout is active with `aspect-ratio: 1 / 1`.
3. Below 920px, the mobile media query prevents panel interactions (JS guards).
4. Typography uses `clamp()` for fluid scaling (e.g., `clamp(0.8rem, 1.1vw, 1.08rem)`).
5. The stage centers content with `display: grid; place-items: center`.
