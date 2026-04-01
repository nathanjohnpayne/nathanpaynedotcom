---
spec_id: analytics
title: Analytics
---

# Analytics

## Overview

Google Analytics (gtag) fires a `section_view` event once per panel on first hover, guarded by a `typeof gtag` check.

## Requirements

1. The `gtag` function is called with `'event', 'section_view'` when a panel is first hovered.
2. Each panel only fires the analytics event once (tracked via a `tracked` boolean closure).
3. The event includes `section_name` matching the panel's `data-panel` attribute.
4. The analytics call is guarded with `typeof gtag !== 'function'` to avoid errors when gtag is absent.
