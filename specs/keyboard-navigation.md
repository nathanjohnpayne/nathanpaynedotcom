---
spec_id: keyboard-navigation
title: Keyboard Navigation
---

# Keyboard Navigation

## Overview

Panels are focusable via `tabindex="0"` and respond to keyboard events for accessibility.

## Requirements

1. Each panel has `tabindex="0"`, making it reachable via Tab.
2. Pressing Enter on a focused panel opens it (adds `is-open`, sets `data-focus`).
3. Pressing Space on a focused panel opens it and prevents default scroll.
4. Pressing Escape on a focused panel collapses the active panel.
5. Pressing Escape anywhere in the document collapses the active panel.
6. Focus moving into a panel via `focusin` opens it.
7. Focus leaving a panel (to a non-child element) schedules close.
