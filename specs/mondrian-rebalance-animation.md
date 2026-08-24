---
spec_id: mondrian-rebalance-animation
title: Mondrian Rebalance Animation
---

# Mondrian Rebalance Animation

## Overview

The homepage panel-open / panel-close interaction reorganizes the Mondrian composition around the focused tile in one rectilinear movement. At rest, the page is a finished composition: colored rectangles, black grid lines, labels placed with restraint. When a user intentionally enters a tile, the grid lines glide to a new arrangement, the selected tile becomes a parchment reading surface, content fades in only after the plane settles, and closing reverses the sequence so the page returns to a complete static composition.

The interaction should feel like a curator sliding panels in a gallery wall, not like a web accordion.

## Curatorial framing

- Crisp orthogonal movement only—no scaling, bouncing, rotation, shadows, or springiness.
- Fixed black line weight; grid lines remain visually authoritative.
- Cream / parchment as the reading surface—never blank for long.
- Labels yield gracefully to content; text is delayed until the geometry is stable.
- One active subject at a time; the animation never chases the cursor.

## Sequences

### Open (idle → open)

```text
hover intent
  → lock hover state changes
  → grid morphs (--motion-plane), cream cell expands, label fades out
  → after morph, fade content in (--motion-fast)
  → unlock; re-resolve hover target via document.elementFromPoint
```

### Close (open → idle)

```text
fade content out (--motion-fast)
  → grid morphs back (--motion-plane), cream returns to base, label fades in
  → unlock; re-resolve hover target
```

### Switch (open A → open B)

```text
fade A content out (--motion-fast)
  → swap is-open / data-focus to B; grid morphs A→B (--motion-plane)
  → fade B content in (--motion-fast)
  → unlock; re-resolve hover target
```

## Requirements

1. **Geometry and content reveal are separate concerns.** `data-focus` only moves the grid lines; content reveal is gated by an independent class (`.is-content-visible`), added late in the open sequence and removed early on close.
2. **Content reveal must transition, not snap.** `display: none / block` cannot be transitioned, so content visibility is governed by `opacity`, `visibility`, and `pointer-events` instead.
3. **An interaction state machine governs hover.** The states are `idle`, `opening`, `open`, `switching`, `closing`. While the state is `opening` / `switching` / `closing`, hover intent is queued, not applied. After `--motion-plane` settles, the JS re-resolves the cursor's actual target via `document.elementFromPoint(lastX, lastY)` and only then promotes a queued hover.
4. **Click, keyboard, and focus bypass the hover-state guard.** They are deliberate user intent and must always work, including mid-morph.
5. **Each transition phase is invalidatable.** A new transition starting mid-flight (user opens A, then immediately opens B) must not allow stale callbacks to complete on top of the new state.
6. **No `auto` tracks during animation.** Every track size in `grid-template-rows` and `grid-template-columns` for animated rules must be an explicit, interpolable length (`var(--line)`, `minmax(...)`, or a `var(--cell-h-*)` custom property). `auto` tracks change type at animation start and produce visible 0-length frames.
7. **Content-driven cell sizes are measured in JS.** The focused panel's content height is measured once after `document.fonts.ready` and on every resize; the value is exposed as `--cell-h-{about,projects,community,connect}` on `.mondrian` for the focus-state CSS to consume in `calc()`-free expressions. See [responsive-layout.md](responsive-layout.md) §8–§10 for which focus states consume which variables and the deliberate community-focus exception.
8. **Hover at a row-line boundary does not oscillate.** The combination of (a) hover-lock during morph and (b) `elementFromPoint` re-resolution after morph is what makes this hold. Either alone is insufficient.
9. **Animation duration matches the curatorial intent.** `--motion-plane` is 460ms paired with `--ease-standard` (gentle in/out). The previous 280ms / `--ease-sharp` combination read as a card expanding rather than a composition shifting.
10. **The user must never see a long-lived blank cream tile.** Cream is the reading surface; it must either contain content or be in a very short transition toward containing content.

## Implementation references

- Interaction state machine: [src/pages/index.astro](../src/pages/index.astro)—search for `state =` and `requestPanel`.
- Content reveal class management: same file—search for `is-content-visible`.
- Content height measurement: same file—`measureContentHeights()`.
- Focus-state grid templates: [src/styles/global.css](../src/styles/global.css)—`.mondrian[data-focus="..."]` rules and the comment block introducing them.
- Panel pulse on load: same file—`@keyframes panel-pulse{,-neutral,-blue}` plus the `.panel--pulsing` selector.

## Related specs

- [responsive-layout.md](responsive-layout.md)—grid template structure, breakpoint scale, and focus-state cell-sizing rules.
- [panel-interaction.md](panel-interaction.md)—higher-level interaction model (click / hover / focus, mobile guard, link-inside-panel).
- [keyboard-navigation.md](keyboard-navigation.md)—keyboard-driven open/close paths that bypass the hover guard.

## Out of scope

- Accordion-style or card-style expansion patterns (explicitly rejected).
- Any motion that scales, rotates, or distorts the grid lines.
- Cross-page or full-page transitions; this spec is scoped to the homepage Mondrian only.
- Breakpoint or width-cap behavior (settled in [responsive-layout.md](responsive-layout.md)).
