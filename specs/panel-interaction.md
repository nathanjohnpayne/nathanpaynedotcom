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
6. On stack viewports—below `--bp-stack` on EITHER axis, i.e. `max-width: 1023px` or `max-height: 1023px`—panels do not open on click or hover. Both axes because the Mondrian square is sized from the smaller of them, so a short desktop window (1440×900) renders the stack exactly as a narrow one does; the `mobile()` guard in `src/pages/index.astro` queries both, and `tests/responsive-layout.test.js` asserts a wide-but-short viewport opens nothing. See #992 and `specs/responsive-layout.md` requirement 12.
7. Clicking a link inside a panel does not trigger panel open logic.

## Related specs

- [mondrian-rebalance-animation.md](mondrian-rebalance-animation.md)—the choreography spec for how the grid morphs, when content fades in/out, and how the interaction state machine prevents oscillation at row-line boundaries.
