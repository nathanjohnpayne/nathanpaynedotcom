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
  site-wide, with twenty custom conversion/engagement events instrumented
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
6. PostHog never initializes on a local host (`localhost`, `127.0.0.1`,
   `[::1]`, or any `*.localhost` name), so dev servers, `astro preview`, the
   Playwright suites, and build-time renders cannot record production events
   even when the build carried the token. `window.posthog` stays undefined
   there, which req. 4 already makes a silent no-op.
7. The build-time headless Chromium that renders the OG images and the résumé
   PDF (`src/integrations/og-images.mjs`, `resume-pdf.mjs`) aborts every request
   to an analytics host (the PostHog proxy, PostHog, Google Analytics, Google Tag
   Manager) before loading a page, so a build never counts as a visit.

### Events

| Event | Trigger | Properties |
|---|---|---|
| `homepage_panel_opened` | A Mondrian panel becomes focused (`data-focus` set) | `panel_name` |
| `homepage_layout_rendered` | Once per homepage load, after fonts settle (or after 3 s if `document.fonts.ready` has not resolved by then, #1065): which layout the reader actually got, classified from the grid's rendered geometry (`composition` when `.mondrian` height/width < 1.05, otherwise `stack`), not from the media query (#1045) | `layout`, `viewport_width`, `viewport_height` |
| `contact_email_clicked` | Click on the `#availability-mailto` "Get in touch" link | — |
| `booking_link_clicked` | Click on the `.availability-booking` Cal.com scheduling link | — |
| `resume_link_clicked` | Click on a résumé link in the Connect/About panels | — |
| `social_link_clicked` | Click on a `.social-row` link | `platform` |
| `donation_link_clicked` | Click on a Community-panel `.effort-link` | `organization` |
| `writing_link_clicked` | Click on a `.writing-list` link in the About panel—article links only | `href` |
| `index_link_clicked` | Click on a `.ribbon-exit` index link on the Projects, About, or Connect footer ribbon | `panel`, `href` |
| `project_page_viewed` | A project detail page loads | `project_slug`, `project_title`, `project_status` |
| `project_live_link_clicked` | Live-CTA button click—labelled "View Live Product" by default, or the project's own `liveLabel` (Device Source of Truth uses "View Demo"). The event and its properties do not vary with the label | `project_title`, `url` |
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
3. `resume_link_clicked` and `social_link_clicked` no longer overlap. Until
   #972 the Connect "Elsewhere" list carried a résumé row (`.social-row--resume`)
   that was both a résumé link and a `.social-row`, so a click on it
   deliberately recorded both events—the location-agnostic résumé aggregate and
   the social-stack breakdown, which answer different questions. #972 removed
   that row along with the Blog one, because "Elsewhere" is off-site and both
   were on this site. Every `.social-row` now points off `nathanpayne.com`, so
   no `social_link_clicked` carries an on-site `platform`, and the two résumé
   links that remain (Connect's action row and the About panel's NOW exit
   line) are not `.social-row`s. Comparing `resume_link_clicked` counts across
   that change means comparing a figure that had a third source before it.

4. `index_link_clicked` and `writing_link_clicked` are deliberately separate.
   Until #975 the About panel's "View all writing" link sat inside
   `.writing-list`, so it matched the `.writing-list a` selector and its
   clicks were recorded as article clicks—9 article clicks to 1 index click
   over 90 days, in one figure. The exit moved to the footer ribbon with the
   Projects and Connect exits, and wayfinding is now counted on its own,
   carrying which `panel` it left from. `writing_link_clicked` counts before
   and after that change are not comparable: the earlier figure includes
   index clicks.

### Layout alerting (#1045)

`homepage_layout_rendered` exists so that serving the wrong homepage layout pages someone instead of going unnoticed. #1042 served the phone stack to desktop windows for 18 days, and it was found by eye. The alert lives in PostHog project 469428, as a SQL insight checked daily:

```sql
SELECT count()
FROM events
WHERE event = 'homepage_layout_rendered'
  AND timestamp >= now() - INTERVAL 1 DAY
  AND properties.layout = 'stack'
  AND toFloat(properties.viewport_width) >= 1024
  AND toFloat(properties.viewport_height) >= 840  -- --bp-stack-height; keep in sync
  AND coalesce(properties.$virt_is_bot, false) = false
```

It alerts when the value is **greater than 0**. It fires on the first desktop-sized window that got the stack, so it does not depend on traffic volume. A companion alert counts `layout = 'composition'` below either floor, which catches the reverse bug.

**The height literal must move with the floor.** It restates `--bp-stack-height` (840 since #1044; 960 before it; 1024 during #1042). A floor change that does not update both alerts either pages falsely or goes blind in exactly the band the change moved.

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
5. Two issues are suppressed, both from the same emitter. The first is
   `SyntaxError: Unexpected token ?`, emitted by an automated scanner, not by
   the site. The evidence is recorded here so the finding is not re-derived
   from scratch a third time:
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
6. A second issue is suppressed on the same evidence: `SyntaxError: Unexpected
   token .`, six events over two sessions on 2026-08-28 and 2026-08-29 (#837).
   It is a distinct fingerprint, so it grouped separately and filed its own
   GitHub Issue exactly as requirement 3 says it should. What identifies the
   emitter is that the device fingerprint is not distinct at all:
   - The screen/viewport pair and the user-agent string are byte-identical to
     the signature above—a 1024×768 viewport on an 800×600 screen, under the
     same Edge 122 / Windows 10 UA—from two OVH hosting ranges that PostHog
     geolocates to different countries. Across 180 days these two issues are
     the only `$exception` events the project has recorded, and every event
     under both carries that one impossible fingerprint.
   - `stacktrace.type` is `resolved`, but the frame list is empty, so nothing
     resolves and no source can be attributed. This is recorded as observed
     rather than inherited: it differs from the `?` signature, whose synthetic
     frame at least reported a line and column to disprove.
   - Each session is one `$pageview`, then a burst of two to four identical
     `$exception` events inside half a second, then nothing. No interaction,
     always a `$direct` referrer.
   - The two pages hit, `/projects/five-across/` and `/projects/override/`,
     ship the same inline scripts as every other page, and no client outside
     this fingerprint has reported a parse error on any of them.
7. To undo either one, set the issue back to `active` in
   [error tracking](https://us.posthog.com/project/469428/error_tracking).
   Suppression is not retroactive and drops nothing already stored.

## Privacy Runtime

This section applies only when the #1079 flag is on (`privacyControlsEnabled()`, `src/lib/privacy-flag.ts`). With the flag off, nothing below exists and the site captures exactly what the sections above describe. The contract is `specs/analytics-privacy.md`; this section records what the runtime does with each vendor, verified against posthog-js 1.438.3 (the production version), mux-embed 5.18.1 with @mux/mux-background-video 0.2.3, and the vendor documentation cited in the code, and what it cannot recall.

### Gate

`src/lib/privacy/gate.js` is inlined by `src/components/privacy/PrivacyHead.astro` as one synchronous script in `<head>`, ahead of both analytics blocks. It reads the saved choice and Global Privacy Control, defines `window.npPrivacy`, and stamps `data-np-privacy` on `<html>`. The PostHog block (`src/components/posthog.astro`) and the GA4 block (`src/layouts/BaseLayout.astro`) run only when the gate exists and both its boot decision and the current state are `granted`. Otherwise neither creates a script element, defines a global, or sends anything. The GA4 loader, a static element with the flag off, is created by script with the flag on. The local-host skip is unchanged.

### Withdrawal

When the choice becomes `denied` in a page view (from the controls, from another tab through the `storage` event, or on a back/forward-cache restore), the gate stops every tool running on the page (PostHog, GA4, and, on a page with a Mux hero, Mux Data) before it announces the change:

1. **PostHog:** `opt_out_capturing()`, then `stopSessionRecording()`. The opt-out makes every later `capture()` return before it builds a payload, and the recorder's final buffer flush goes through `capture()`, so buffered replay is dropped rather than sent. `before_send` also returns null for every event from then on.
2. **GA4:** `window['ga-disable-<ID>'] = true`. Google documents setting it before any `gtag()` call. Set mid-page, it stops gtag.js accepting new events, but it does not stop a hit gtag.js accepted before it (#1286): gtag.js checks `ga-disable` when it accepts an event, not when it sends it, and does not send an accepted event at once. In local runs it held one for 5.0 seconds unless a later event released it sooner. With the transport guard's refusal of Google's hosts removed, in 40 mid-visit withdrawals on the test fixture, the enhanced-measurement `scroll` event, which fires at load there, went out 1.7 to 1.8 seconds after `set('denied')` in all 25 plain runs, and an event pushed just before the withdrawal went out 5.0 seconds after it in all 15 runs that pushed one. No event pushed after the withdrawal was sent, and no hit went out at pagehide. So `ga-disable` alone does not stop a page already sending; the transport guard (item 4) refuses the held hit, and the guard is what makes the withdrawal hold for GA4. `ga-disable` does not stop gtag.js's tag diagnostics either (#1278). On the page loads where gtag.js draws itself into them (a few percent of loads in local runs, and every load whose URL carries `gtm_latency=`), it sends `/td` pings to `www.googletagmanager.com` as images and, at pagehide, requests `gtag/js` again through a new script element whose query carries the measurement ID, the page's host and path, and how many requests the tag sent. The transport guard refuses both.
3. **Mux Data:** each active monitor is destroyed with `mux.destroyMonitor()`, and `globalThis.mux` reads as undefined from then on, so the hero never starts another. Destroying a monitor flushes mux-embed's queue; the transport guard refuses that flush.
4. **Transport guard:** posthog-js keeps a batch queue (flushed every 3 seconds by default) and a retry queue, sends both without rechecking consent, and has no public API to empty either; mux-embed batches every 10 seconds and flushes when a monitor is destroyed or the page unloads. The gate therefore wraps `fetch`, `sendBeacon`, and `XMLHttpRequest` before any SDK loads, and the `src` of script, img, and iframe elements, set by property or by `setAttribute`; after a withdrawal it refuses every request to an analytics host (`litix.io`, where Mux Data sends, is one), so queued events and replay snapshots are dropped, not flushed, and a refused `src` is never set. Those are the only ways gtag.js, posthog-js, and mux-embed start a request; a stylesheet, a link, a form, or a worker is not wrapped. Until a withdrawal it passes everything through.

**What cannot be recalled:** everything PostHog, GA4, and Mux Data received before the withdrawal stays with them under their own retention; nothing is deleted. A request already handed to the network at the instant of withdrawal may still complete. Each tool's identifiers stay in the browser's storage (PostHog's cookie and `localStorage` entry, GA4's `_ga` cookies); withdrawal stops their use, not their existence. Cloudflare Web Analytics and Network Error Logging are injected at Cloudflare's edge and are not controlled by the opt-out.

### Re-Enable

A grant after a withdrawal is saved but loads nothing in the same page view; collection resumes on the next page load. `opt_out_capturing()` stores PostHog's own opt-out flag (`__ph_opt_in_out_<token>` in `localStorage`), so on a granted load the PostHog block clears it with `clear_opt_in_out_capturing()` before any event. That also clears an opt-out set by hand in the browser console; on this site the controls are the opt-out.

### Capture Minimization

- **Replay masking:** all inputs masked, `[data-np-privacy="mask"]` text masked, every `<form>` and `[data-np-privacy="block"]` region blocked. Client masking options take precedence over the project's masking settings, which are unset.
- **Replay console, canvas, and network timing:** off, by explicit client options that win over the project's remote config, which turns all three on (#1261): `enable_recording_console_log: false`, `session_recording.captureCanvas: { recordCanvas: false }`, and `capture_performance: { network_timing: false, web_vitals: true }`. The recorder therefore runs neither the console nor the network plugin and records no canvas content, while the DOM recording itself is unchanged. `web_vitals: true` keeps `$web_vitals` on just as explicitly.
- **Replay exclusion:** `/privacy/` and everything under it. Replay is off before capture starts on such a page and is stopped before `pushState` or `replaceState` reaches one, and re-evaluated on `popstate`, `hashchange`, and back/forward-cache restores. URL triggers are not used.
- **URL scrubbing:** one allowlist, `ALLOWED_QUERY_PARAMS` in `gate.js` (the five UTM parameters; the Google click identifiers left it under decision 11, #1294); every URL keeps origin, path, and those parameters only, and never its fragment. `before_send` applies it to every URL-valued string in event properties, `$set`, and `$set_once` (`$current_url`, `$referrer`, the `$initial_*` and session-entry URLs, `$external_click_url`, custom `href` and `url` properties) and to URL-shaped keys (`$heatmap_data` is keyed by page URL). In replay, `session_recording.maskCapturedNetworkRequestFn` scrubs the page URL in replay metadata and every network-timing entry, and `maskAttributeFn` scrubs every URL in the recorded DOM on any element: `href`, `src`, `xlink:href`, `action`, `formaction`, `poster`, `data`, `cite`, `background`, `rr_src`, each `srcset` and `imagesrcset` candidate (descriptors kept), each `ping` URL, and any other attribute whose value is an absolute URL, such as `<meta content>`. An SVG `href="#id"` is an element reference and is kept; `data:` and `blob:` URLs are left alone. Playback refetches images, fonts, and stylesheets at their scrubbed URLs, so assets that need their query string (Logo.dev images on `/resume/`, Mux posters and streams) may not render in a recording. The self-hosted fonts carry no query string and play back unchanged. GA4 gets scrubbed `page_location` and `page_referrer`. The first URL and referrer PostHog keeps in its own cookie (`$initial_person_info`) are rewritten to the scrubbed form at load and after each capture.
- **Click identifiers (#1263, #1294, decision 11):** posthog-js copies every campaign parameter it knows out of the page URL into properties of its own, as values rather than URLs, so URL scrubbing never reached them: the bare name and `$session_entry_<name>` on every event in the session, and `$initial_<name>` and the bare name in the first event's `$set_once`. It also builds `$fbc` (`fb.1.<ms>.<fbclid>`) from `fbclid`, sends it in `$set`, and keeps it in the person properties every `/flags` request sends. `DROPPED_CLICK_IDS` in `gate.js` is the SDK's own `PERSONAL_DATA_CAMPAIGN_PARAMS` (v1.438.3), whole: Google's `gclid`, `gclsrc`, `dclid`, `gbraid`, and `wbraid` (#1294), then `fbclid`, `msclkid`, `twclid`, `li_fat_id`, `igshid`, `ttclid`, `rdt_cid`, `epik`, `qclid`, `sccid`, `oppref`, `irclid`, and `_kx` (#1263). `before_send` removes each of them under all three names, and `$fbc`, from properties, `$set`, and `$set_once`, at any depth and whatever the value. The `/flags` request does not pass through `before_send`, so at load and after every capture the PostHog block also removes them from the flag person properties the SDK stores (through its public `resetPersonPropertiesForFlags` and `setPersonPropertiesForFlags`) and unregisters the SDK's `$fbc` record, which would otherwise put `$fbc` back on every capture. `/flags` requests still name `$initial_<name>` for every campaign parameter, because the SDK derives those from the first URL it stores; that URL is scrubbed, so every one of them is `null`. This replaces the earlier behavior, in which all 25 campaign parameters were sent (docs/privacy/capture-2026-10-08.md), and `$fbc` too whenever the landing URL carried `fbclid`. GA4 gets none of them either: `gtag.js` could read them from the page's own location, but with the real tag a landing URL carrying all five Google ones sent none in any GA4 request (`page_location`, `page_referrer`, or any other parameter) and set no `_gcl_*` cookie or storage entry (`tests/privacy-runtime/runtime.pw.ts`, #1294).
- **Attributes:** autocapture element data keeps only `id`, `class`, `href`, `name`, `type`, `role`, and `aria-label`, plus PostHog's own position and text fields; no `data-*` value or inline `style` reaches an event. The values it keeps are scrubbed too: an `href` as a URL, and every other kept value (including `$elements_chain`'s `attr_id` and the `classes` list) for a URL that is the whole value or embedded in it; values with no URL are sent byte for byte. A class that is itself a scheme-relative URL is also cut from the chain's tag-and-class prefix, whose dots cannot be told from class separators. Replay keeps `data-*` values only for the five attributes the stylesheet selects on (`data-accent`, `data-focus`, `data-fonts-pending`, `data-palette`, `data-playback-state`) and empties the rest.
- **Masked text in events:** autocapture text drawn from a masked or blocked region is dropped from the event.

### Mux Data

On a page with a Mux hero (`/projects/swipe-watch/`), `src/components/ProjectMuxPlayer.astro` inlines `src/lib/privacy/mux-data.js` ahead of its bundled script (#1264). The bundled script is the same with the flag on or off: it imports `mux-embed` and assigns it to `globalThis.mux`, which `@mux/mux-background-video` reads to start monitoring and which playback does not need. The inline script turns that global into an accessor:

- **Granted** (the gate exists, and its boot decision and the current state are both `granted`): the component gets a wrapper whose `monitor()` adds three documented mux-embed options. `disableCookies: true` means no `muxData` cookie and no persistent viewer or session ID in the beacons. `respectDoNotTrack: true` means mux-embed sends nothing while the browser sends Do Not Track (`navigator.doNotTrack === '1'`); DNT is a separate signal from GPC and is honored even when analytics are granted. `data.page_url` is reduced by the gate's `scrubUrl`, the same allowlist as every other URL here; without it, mux-embed sends `window.location.href` whole.
- **Denied** (by choice or by GPC), or the gate missing: the assignment is discarded and the global reads as undefined, so no monitor starts, nothing is sent, and no cookie is set. The `mux-embed` chunk still downloads from this site, because the bundled loader is unchanged; loading it only registers a `pagehide` listener.
- **Withdrawn mid-visit:** see [Withdrawal](#withdrawal).

Video playback is the same in every case: the HLS stream from `stream.mux.com` and the poster from `image.mux.com` are playback, not Mux Data, and the opt-out does not cover them. When granted, Mux Data still sends player and playback data (for example player size and state, timings, connection type, and per-view and per-player random IDs), and each request reaches Mux with the visitor's IP address and user agent. No Mux account setting is changed.

### Not Changed, and Why

- **Remote-config capture settings:** the project still turns on replay console logs, canvas capture, and network timing; the runtime overrides them in the client (see Capture Minimization) and changes no vendor setting. Request and response bodies and headers are off in both client and project.
- **Campaign-level parameters:** `gad_source` (Google's) and `mc_cid` (Mailchimp's campaign ID) are campaign parameters, not click identifiers, so decision 11 leaves them as they were. They are not on the URL allowlist, so they leave every URL, but the SDK still sends them as properties under all three names; only their `$initial_` copies in `/flags` requests are `null`, because the stored first URL is scrubbed. The five UTM parameters are sent everywhere as before. `$fbp`, Meta's browser ID, is neither a click identifier nor a campaign parameter: the SDK sends it only from a `_fbp` cookie, which Meta's pixel sets and no page here loads.
- **URLs inside CSS in replay:** rrweb passes inline `style` attributes and inlined stylesheets (`_cssText`) to `maskAttributeFn` as whole CSS text; there is no URL-level hook for them, and scrubbing their `url(...)` values would need a CSS tokenizer in the gate. They pass through unchanged. Since #1250 the site self-hosts its fonts, so the visitor stylesheet is same-origin and the recorder inlines it by reading its `cssRules` (rrweb-snapshot `stringifyStylesheet`, v1.438.3). Its only `url(...)` values are the bundled font files (`/fonts/site/*.woff2`): fixed same-origin asset paths with no query string or visitor data, so recording them unscrubbed captures nothing beyond the site's own file names. The build-time OG template's font URLs are likewise the site's own files and appear on no visitor page. No cross-origin stylesheet is loaded any more (the Google Fonts `<link>` was removed).
- **PostHog's device-only session-entry copy:** the SDK also keeps the session's entry URL and referrer, unscrubbed, in its `localStorage` entry (`$client_session_props`). It stays in the visitor's browser and is never sent; the `$session_entry_*` event properties built from it are scrubbed. It is not rewritten, because doing so would depend on a second undocumented SDK key for no reduction in what is transmitted. The same holds for the campaign values the SDK registers for the session in `sessionStorage`, click identifiers included: they stay on the device, and `before_send` removes the dropped ones from every event built from them.
- **GA4 enhanced measurement** (`link_url`, `file_name`, `form_destination`, `search_term`, `video_url`) is configured in the GA4 property and generated inside gtag.js; no client option scrubs those parameters without turning the events off. On client-side navigations the block sets a scrubbed `page_location`; whether gtag's own history-change page views use it is not verified.
- **GA4 user-provided data collection** (automatic detection of email, phone, and address) is a property and Google tag setting. Google documents turning it off in either place, which disables the feature; no page-code option keeps the tag from sending detected data while the feature stays on. The flag-on block leaves it as configured.
- **`person_profiles: 'always'`** and the internal-traffic exclusions are unchanged. The "Internal / Test users" cohort matches person properties `$internal_or_test_user` and `email`, and the project's test-account filters match `$host`; scrubbing touches none of them.

### Verification

`tests/privacy-runtime.test.js` runs the gate's exact source, the Mux Data script, and the flag-on blocks in JSDOM. `tests/privacy-runtime/` drives the flag-on test build in Chromium with the real posthog-js 1.438.3 and gtag.js, and the bundled mux-embed and background-video component (`mux-data.pw.ts`), behind a local proxy that is the browser's only network path and refuses everything but the site under test; its config file says how to run it. Its click-identifier check reads the SDK's campaign-parameter lists out of the bundle itself, so `DROPPED_CLICK_IDS` cannot drift from the SDK unnoticed.
