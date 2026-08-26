---
spec_id: analytics
title: Analytics
---

# Analytics

## Overview

The site runs two analytics systems in parallel during the PostHog transition:

- **Google Analytics 4 (gtag)**—fires a `section_view` event once per panel on
  first hover on hover-capable (fine-pointer) devices.
- **PostHog**—product analytics + autocapture + session replay, loaded
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
6. GA4 is loaded by `BaseLayout.astro` from the `PUBLIC_GA_MEASUREMENT_ID` env var (resolved from 1Password via `op inject`—the same pipeline as PostHog / Logo.dev), never hardcoded. If it is unset at build time, the GA tags are not rendered and `gtag` is undefined, so the `typeof gtag` guard (req. 4) keeps `section_view` from firing—graceful degradation.
7. When GA *is* loaded, the `gtag` stub is exposed on `window` (`window.gtag = gtag`). Because injecting the Measurement ID via `define:vars` makes Astro wrap the config script in an IIFE, the stub would otherwise be IIFE-local and the global `gtag` that the `section_view` path (req. 1, 4) calls would be undefined.

## PostHog

### Initialization

1. PostHog is initialized site-wide via the `src/components/posthog.astro`
   component included in `BaseLayout.astro`, so every page loads it.
2. The project API key is PostHog's **public** (write-only) `phc_` ingest key,
   injected at build from the `PUBLIC_POSTHOG_PROJECT_TOKEN` env var (resolved
   from 1Password via `op inject`—the same `.env.tpl`/`bootstrap.sh` pipeline
   as `PUBLIC_LOGODEV_KEY`), never committed to source. No personal API key
   (`phx_…`) is ever used or committed.
3. If `PUBLIC_POSTHOG_PROJECT_TOKEN` is unset at build time (e.g. CI, or a
   checkout that has not run `scripts/bootstrap.sh`), `posthog.astro` renders
   nothing and PostHog never initializes—no events, no errors—mirroring
   `CompanyLogo`'s graceful degradation.
4. Every custom event call is guarded with optional chaining
   (`window.posthog?.capture(...)`) so a blocked or not-yet-loaded PostHog
   never throws.
5. Ingest is routed through the first-party managed reverse proxy at
   `https://d.nathanpayne.com` (`api_host`), so `array.js` and all event /
   session-replay traffic load from our own subdomain rather than
   `us.i.posthog.com`—reducing loss to tracking blockers. `ui_host` is set to
   `https://us.posthog.com` (the real PostHog US app) so the toolbar and
   "open in PostHog" deep links continue to resolve. Both hosts are non-secret
   constants, not env-injected.

### Events

| Event | Trigger | Properties |
|---|---|---|
| `homepage_panel_opened` | A Mondrian panel becomes focused (`data-focus` set) | `panel_name` |
| `contact_email_clicked` | Click on the `#availability-mailto` "Get in touch" link | — |
| `booking_link_clicked` | Click on the `.availability-booking` Cal.com scheduling link | — |
| `resume_link_clicked` | Click on a résumé link in the Connect/About panels | — |
| `social_link_clicked` | Click on a `.social-row` link | `platform` |
| `donation_link_clicked` | Click on a Community-panel `.effort-link` | `organization` |
| `writing_link_clicked` | Click on a `.writing-list` link in the About panel | `href` |
| `project_page_viewed` | A project detail page loads | `project_slug`, `project_title`, `project_status` |
| `project_live_link_clicked` | "View Live Product" button click | `project_title`, `url` |
| `project_github_link_clicked` | "View on GitHub" button click | `project_title`, `url` |
| `blog_post_viewed` | A blog post page loads | `post_title`, `tags`, `reading_time` |
| `blog_cta_clicked` | Click on a `.blog-cta__link` in the end-of-post block | `cta`, `post_title` |
| `blog_post_nav_clicked` | Click on a `.blog-postnav__card` prev/next card | `direction`, `from_post_title`, `to_post_href` |
| `rss_subscribe_clicked` | Click on the blog index `.rss-link` | — |
| `resume_viewed` | The resume page loads | — |
| `resume_pdf_downloaded` | Click on the `/resume` header `.resume-download` button | — |
| `resume_action_clicked` | Click on the `/resume` header row's Get in touch or Book a time button | `action` |
| `resume_cta_clicked` | Click on a `.resume-cta__link` in the end-of-page availability block | `cta` |

### Behavior

1. `homepage_panel_opened` is deduped against the last captured panel. Because
   `measureContentHeights()` cycles `data-focus` across every panel on load and
   resize and then restores it, the observer must read the *current* focus and
   skip unchanged/cleared values—a measurement pass that restores the same
   focus (or clears it) records no event and emits no per-panel phantom opens.
2. Clearing `data-focus` (panel close) resets the dedupe latch so re-opening
   the same panel records a fresh `homepage_panel_opened`.
3. The Connect "Elsewhere" social-stack résumé row (`.social-row--resume`) is
   both a résumé link and a `.social-row`, so clicking it intentionally records
   **both** `resume_link_clicked` (the location-agnostic résumé aggregate) and
   `social_link_clicked` with `platform: "resume"` (the social-stack breakdown).

### Error Tracking

1. Exception autocapture is enabled server-side through PostHog's remote
   config, not in `posthog.astro`. The site ships no client-side `before_send`
   filter, so it discards nothing of its own: whenever PostHog initializes at
   all (Initialization req. 3), an unhandled exception the browser reports is
   eligible for ingestion.
2. Error-tracking alerts open GitHub Issues automatically. A signature proven to
   originate outside the site is therefore set to **suppressed**, never
   "resolved"—a resolved issue reopens on the next matching event and files a
   *second* GitHub Issue. That is exactly how #714, closed 2026-08-24, came back
   as #797 on 2026-08-26 for one unchanged signature.
3. Issue status is the right instrument here because it is scoped to the
   fingerprint group. A genuinely different exception gets its own fingerprint,
   so it forms its own issue and still alerts.
4. Ingestion-level **suppression rules are deliberately not used** for this.
   PostHog restricts those filters to the exception type and message, because a
   stack may still be minified client-side. The narrowest rule expressible would
   therefore drop every `SyntaxError` carrying the message below—including a
   real one, if the site ever shipped `?.` or `??` to a parser that could not
   read it. Issue status costs the ingestion of a handful of events and keeps
   the evidence queryable; a rule would silently discard both.
5. One issue is suppressed: `SyntaxError: Unexpected token ?`. It is emitted by
   an automated scanner, not by the site. The evidence is recorded here so the
   finding is not re-derived from scratch a third time:
   - The frame is `synthetic: true` with `resolve_failure: "This frame had no
     source url or chunk id"`—a bare `window.onerror` report carrying no
     filename.
   - Every event reports line 96, column 61, identically, across five pages
     whose HTML is entirely different. `/projects/` is 72 lines long, so it has
     no line 96 for that frame to refer to.
   - All events share one impossible device fingerprint: a 1024×768 viewport on
     an 800×600 screen—a viewport larger than the screen containing it—under a
     byte-identical Edge 122 / Windows 10 user agent, while the source IPs
     rotate across countries.
   - Every session is one `$pageview`, one `$exception` a second or two later,
     and nothing further. No interaction, always a `$direct` referrer.
   - Edge 122 supports both `?.` and `??`, so a genuine client on that version
     would not fail to parse the site's inline scripts.
6. To undo, set the issue back to `active` in
   [error tracking](https://us.posthog.com/project/469428/error_tracking).
   Suppression is not retroactive and drops nothing already stored.
