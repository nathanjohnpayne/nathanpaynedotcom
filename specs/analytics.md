---
spec_id: analytics
title: Analytics
---

# Analytics

## Overview

The site runs two analytics systems in parallel during the PostHog transition:

- **Google Analytics 4 (gtag)** — fires a `section_view` event once per panel on
  first hover on hover-capable (fine-pointer) devices.
- **PostHog** — product analytics + autocapture + session replay, loaded
  site-wide, with twelve custom conversion/engagement events instrumented
  across the homepage, project pages, blog, and resume.

GA4 is retained for continuity; PostHog is the forward-looking system. Either
may be removed later without affecting the other.

## Google Analytics 4 (gtag)

1. The `gtag` function is called with `'event', 'section_view'` when a panel is first hovered on a hover-capable device.
2. Each panel only fires the analytics event once (tracked via a `tracked` boolean closure).
3. The event includes `section_name` matching the panel's `data-panel` attribute.
4. The analytics call is guarded with `typeof gtag !== 'function'` to avoid errors when gtag is absent.
5. The event only fires on hover-capable devices, gated by `canHover()` (`(hover: hover) and (pointer: fine)`). Touch/coarse-pointer devices that synthesize `mouseenter` must not record `section_view`.

## PostHog

### Initialization

6. PostHog is initialized site-wide via the `src/components/posthog.astro`
   component included in `BaseLayout.astro`, so every page loads it.
7. The project API key is PostHog's **public** (write-only) `phc_` ingest key,
   hardcoded in the component — the same class of public identifier as the GA
   Measurement ID. No personal API key (`phx_…`) is ever used or committed.
8. Every custom event call is guarded with optional chaining
   (`window.posthog?.capture(...)`) so a blocked or not-yet-loaded PostHog
   never throws.

### Events

| Event | Trigger | Properties |
|---|---|---|
| `homepage_panel_opened` | A Mondrian panel becomes focused (`data-focus` set) | `panel_name` |
| `contact_email_clicked` | Click on the `#availability-mailto` "Get in touch" link | — |
| `resume_link_clicked` | Click on a résumé link in the Connect/About panels | — |
| `social_link_clicked` | Click on a `.social-row` link | `platform` |
| `donation_link_clicked` | Click on a Community-panel `.effort-link` | `organization` |
| `writing_link_clicked` | Click on a `.writing-list` link in the About panel | `href` |
| `project_page_viewed` | A project detail page loads | `project_slug`, `project_title`, `project_status` |
| `project_live_link_clicked` | "View Live Product" button click | `project_title`, `url` |
| `project_github_link_clicked` | "View on GitHub" button click | `project_title`, `url` |
| `blog_post_viewed` | A blog post page loads | `post_title`, `tags`, `reading_time` |
| `rss_subscribe_clicked` | Click on the blog index `.rss-link` | — |
| `resume_viewed` | The resume page loads | — |

### Behavior

9. `homepage_panel_opened` is deduped against the last captured panel. Because
   `measureContentHeights()` cycles `data-focus` across every panel on load and
   resize and then restores it, the observer must read the *current* focus and
   skip unchanged/cleared values — a measurement pass that restores the same
   focus (or clears it) records no event and emits no per-panel phantom opens.
10. Clearing `data-focus` (panel close) resets the dedupe latch so re-opening
    the same panel records a fresh `homepage_panel_opened`.
