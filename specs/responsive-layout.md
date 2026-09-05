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
11. The Selected Projects footer's content line is chosen at build time by `PROJECTS_RIBBON` in `src/lib/projects-ribbon.ts`, whose default is `'domains'`. Under `'domains'` the footer reads `DOMAINS · Consumer · Enterprise · Finance · Developer tooling`, built from `PROJECT_DOMAINS` with a non-breaking space inside each multi-word term, and the intro paragraph drops its opening sentence so the domains are named once rather than twice. Under `'stack'` the footer reads `STACK` and the intro keeps that sentence; the ladder in requirement 12 is filtered server-side to `tier <= STACK_CAP` (6), so every shipped item is a rung-6 item and the container queries never have a higher tier to re-show. The switch exists so the two lines can be compared on the live page; it is meant to be deleted along with the losing branch once that comparison is made. Measured: DOMAINS sets on one line at every viewport from 390px to 2560px and occupies at most 0.757 of the ribbon at desktop, against 0.935 for the capped stack and 0.986 for the ten-item line both replace. The width at which a line clears the exit link's column differs by mode and is not a breakpoint: the Mondrian square is sized from viewport height, so a short desktop window gives a narrow ribbon—1280×700 yields 427px and 1024×768 yields 484px—and the exit link takes ~136px of the row above. DOMAINS clears from 484px up (+23.3px at 1024×768) and not at 427px; the capped STACK clears only from 583px up. `tests/projects-ribbon.test.js` records both floors, and the viewports below each, so neither exemption widens unnoticed. See #984.
12. The Selected Projects `STACK` ribbon is a five-rung degradation ladder, not a fixed list. Every rung stays on one line by showing as many items as the ribbon's measured width holds. Because the Mondrian square is sized from viewport **height**, a fixed list cannot do this: the ribbon measures 583px at 1440×900 and 897px at 2560×1330, so a list picked for one is wrong for the other. The rungs, longest first, are:
    - **10**—TypeScript, React, Firebase, Cloudflare Workers, Playwright, GitHub Actions, Anthropic, OpenAI, Claude Code, Codex
    - **9**—drops Playwright
    - **8**—drops GitHub Actions
    - **7**—drops Cloudflare Workers
    - **6**—drops OpenAI
    The mechanism is container queries on `.stack-items` (`container-name: stack`), so the query reads the width the text actually gets rather than restating the square's geometry in a media query, and the ladder holds in the stacked layout too. Each item carries `data-stack-tier`, the shortest rung it survives to; the array in `src/pages/index.astro` is in render order, so every rung is a subsequence of the one above and nothing reorders as the line shortens. Thresholds are in `em` (42.6 / 54.9 / 64.7 / 72), and the container must be `.stack-items` rather than its `.stack-ribbon` wrapper for that to work: `em` in a container query resolves against the query container's own font-size, and only `.stack-items` carries the size the items are set in. That is what makes one set of thresholds correct under two typographies—the stacked layout re-sizes this line fluidly (0.68rem → 0.78rem) and retunes its letter-spacing, and an absolute threshold calibrated on the desktop values admits rung 9 at an iPad's 706px ribbon, where the larger stacked type needs 721px and wraps. Rung 6 is an editorial floor, not a fit guarantee: it needs ~37em and wraps below that (phones). See #930.
