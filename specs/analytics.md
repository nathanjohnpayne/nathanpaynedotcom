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
6. GA4 is loaded by `BaseLayout.astro` from the `PUBLIC_GA_MEASUREMENT_ID` env var (resolved from 1Password via `op inject` — the same pipeline as PostHog / Logo.dev), never hardcoded. If it is unset at build time, the GA tags are not rendered and `gtag` is undefined, so the `typeof gtag` guard (req. 4) keeps `section_view` from firing — graceful degradation.
7. When GA *is* loaded, the `gtag` stub is exposed on `window` (`window.gtag = gtag`). Because injecting the Measurement ID via `define:vars` makes Astro wrap the config script in an IIFE, the stub would otherwise be IIFE-local and the global `gtag` that the `section_view` path (req. 1, 4) calls would be undefined.

## PostHog

### Initialization

1. PostHog is initialized site-wide via the `src/components/posthog.astro`
   component included in `BaseLayout.astro`, so every page loads it.
2. The project API key is PostHog's **public** (write-only) `phc_` ingest key,
   injected at build from the `PUBLIC_POSTHOG_PROJECT_TOKEN` env var (resolved
   from 1Password via `op inject` — the same `.env.tpl`/`bootstrap.sh` pipeline
   as `PUBLIC_LOGODEV_KEY`), never committed to source. No personal API key
   (`phx_…`) is ever used or committed.
3. If `PUBLIC_POSTHOG_PROJECT_TOKEN` is unset at build time (e.g. CI, or a
   checkout that has not run `scripts/bootstrap.sh`), `posthog.astro` renders
   nothing and PostHog never initializes — no events, no errors — mirroring
   `CompanyLogo`'s graceful degradation.
4. Every custom event call is guarded with optional chaining
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

1. `homepage_panel_opened` is deduped against the last captured panel. Because
   `measureContentHeights()` cycles `data-focus` across every panel on load and
   resize and then restores it, the observer must read the *current* focus and
   skip unchanged/cleared values — a measurement pass that restores the same
   focus (or clears it) records no event and emits no per-panel phantom opens.
2. Clearing `data-focus` (panel close) resets the dedupe latch so re-opening
   the same panel records a fresh `homepage_panel_opened`.
3. The Connect "Elsewhere" social-stack résumé row (`.social-row--resume`) is
   both a résumé link and a `.social-row`, so clicking it intentionally records
   **both** `resume_link_clicked` (the location-agnostic résumé aggregate) and
   `social_link_clicked` with `platform: "resume"` (the social-stack breakdown).
