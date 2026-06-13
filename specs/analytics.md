---
spec_id: analytics
title: Analytics
---

# Analytics

## Overview

Google Analytics (gtag) fires a `section_view` event once per panel on first hover on hover-capable (fine-pointer) devices, guarded by a `typeof gtag` check.

## Requirements

1. The `gtag` function is called with `'event', 'section_view'` when a panel is first hovered on a hover-capable device.
2. Each panel only fires the analytics event once (tracked via a `tracked` boolean closure).
3. The event includes `section_name` matching the panel's `data-panel` attribute.
4. The analytics call is guarded with `typeof gtag !== 'function'` to avoid errors when gtag is absent.
5. The event only fires on hover-capable devices, gated by `canHover()` (`(hover: hover) and (pointer: fine)`). Touch/coarse-pointer devices that synthesize `mouseenter` must not record `section_view`.
