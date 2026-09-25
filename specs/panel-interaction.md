---
spec_id: panel-interaction
title: Panel Interaction
---

# Panel Interaction

## Overview

The Mondrian grid contains four expandable panels (about, projects, community, connect). Panels expand on hover, focus, and click, and collapse when focus leaves.

## Requirements

1. Clicking a panel adds the `is-open` class and sets `data-focus` on the grid.
2. Only one panel may be expanded at a time; opening a new panel closes the previous.
3. Clicking outside all panels collapses the active panel.
4. Hovering a panel opens it (when `(hover: hover)` media matches).
5. Mouse-leaving a panel schedules a delayed close (120 ms).
6. On stack viewports—`max-width: 1023px` (below `--bp-stack`) or `max-height: 959px` (below `--bp-stack-height`)—panels do not open on click or hover. Height too because the Mondrian square is sized from the smaller axis, so a very short window (1280×700) shrinks it as a narrow one does; the `mobile()` guard in `src/pages/index.astro` queries both, `tests/responsive-layout.test.js` asserts a wide-but-short viewport opens nothing, and `tests/desktop-composition.test.js` asserts in a browser that ordinary desktop windows (1885×987, 1920×970, 1728×1005) DO open panels, with every open panel's text inside the grid. See #992 and `specs/responsive-layout.md` requirement 12.
7. Clicking a link inside a panel does not trigger panel open logic.

## Related specs

- [mondrian-rebalance-animation.md](mondrian-rebalance-animation.md)—the choreography spec for how the grid morphs, when content fades in/out, and how the interaction state machine prevents oscillation at row-line boundaries.
