# Analytics Data-Collection Inventory

This is the site-specific inventory for #1227, part of #1079. It records what `nathanpayne.com` collects today, before any #1079 change ships, so the notice, the `/privacy/` page, and the counsel memo can rest on it. It is governed by [`specs/analytics-privacy.md`](../../specs/analytics-privacy.md). It is not a fleet audit, and it makes no claim about legal compliance.

Every claim cites a file and line at commit `5d688d69`, the sanitized capture in [`capture-2026-10-08.md`](capture-2026-10-08.md) ("capture"), a read-only vendor-settings read on 2026-10-08 ("settings read"), or a vendor document listed under [Sources](#sources). Anything that could not be verified that way is on the [Nathan to Verify](#nathan-to-verify) list. Inventory taken 2026-10-08.

## Summary

- **These services receive requests when a visitor loads a page** (capture, "Requests Observed"; [Hosting and CDN](#hosting-and-cdn); [Other Third Parties](#other-third-parties)): the hosting path, Cloudflare's CDN and Firebase Hosting, which receives every request; PostHog (product analytics, heatmaps, web vitals, error tracking, and session replay, through the first-party proxy `d.nathanpayne.com`), Google Analytics 4, Cloudflare Web Analytics (injected at Cloudflare's edge, not in the repository), Google Fonts, and, on specific pages, Logo.dev (`/resume/`) and Mux (`/projects/swipe-watch/`).
- **PostHog records every session in full** (settings read; capture, "PostHog Remote Config"). Remote config sets no sample rate, no minimum duration, no URL or event triggers, and no URL blocklist. Replay records page text unmasked and masks inputs. **Console-log capture, canvas capture, and network-timing capture are all on** in the project's settings ([Capture Conflicts](#capture-conflicts) C1–C3). Request and response bodies and headers are off.
- **Full URLs, including query strings and fragments, reach both tools** (capture, "PostHog Payload Shapes" and "GA4 Payload Shapes"). PostHog's `$current_url` and heatmap keys, GA4's `dl` (`page_location`), and the URLs in PostHog's replay network records all carried the probe query and `#fragment` unchanged. Cloudflare's beacon sent the path only.
- **Identifiers and storage** ([Identifiers and Storage](#identifiers-and-storage); capture; Google cookie-usage docs): PostHog sets a 365-day first-party cookie and a `localStorage` entry holding a random `distinct_id`, device ID, and session ID, and creates a person profile for every visitor (`person_profiles: 'always'`). GA4 sets `_ga` and `_ga_<ID>` (Google documents two years; Chrome caps them at 400 days). Mux Data sets a 365-day `muxData` cookie on the Swipe Watch page.
- **IP addresses and location** (settings read; SQL presence counts; [Demographics](#demographics)): PostHog stores the client IP on events (the project's "Discard client IP data" toggle is off) and enriches events with GeoIP location: in the sampled week every `$pageview` carried country, latitude and longitude, and time zone, while city, subdivision, and postal code were present only when GeoIP resolved them (252, 237, and 236 of 283). Whether GA4 reports age, gender, or interests today is unverified: Google signals appears off in the served tag, but user-provided data collection, which is on, also supports demographic and interest reporting per Google ([Demographics](#demographics)).
- **Replay retention is already 30 days**, the approved maximum (settings read).
- **Cloudflare Web Analytics cannot be controlled by an in-page opt-out** in its current, edge-injected form ([Cloudflare](#cloudflare)).
- **Production SDKs:** posthog-js **1.438.3** (byte-identical to the npm release), and a `gtag.js` that is not byte-stable between loads ([Production SDK Versions](#production-sdk-versions)).

## PostHog

### Initialization

- PostHog loads on every page through `BaseLayout.astro` (`src/layouts/BaseLayout.astro:156-157`), only when `PUBLIC_POSTHOG_PROJECT_TOKEN` is set at build (`src/components/posthog.astro:25-28`), and never on a local host (`src/components/posthog.astro:29-32`). The build-time headless browser aborts analytics hosts (`src/integrations/resume-pdf.mjs:52-73`).
- The snippet injects `<api_host>/static/array.js` (`src/components/posthog.astro:34`) and calls `posthog.init` with `api_host: 'https://d.nathanpayne.com'`, `ui_host: 'https://us.posthog.com'`, `defaults: '2026-01-30'`, and `person_profiles: 'always'` (`src/components/posthog.astro:36-51`). No other option is set in code.
- `defaults: '2026-01-30'` turns on `capture_pageview: 'history_change'`, `session_recording.strictMinimumDuration`, `rageclick.content_ignorelist`, and `external_scripts_inject_target: 'head'` (PostHog JavaScript configuration docs, `defaults` section). All four were observed in the effective config (capture, "PostHog Effective Client Configuration"). It does not set any capture, masking, or privacy option beyond those.
- Effective defaults that matter for privacy, all observed: autocapture on; pageleave on (`if_capture_pageview`); `persistence: 'localStorage+cookie'`, cookie 365 days, cross-subdomain, `Secure`; `mask_all_text: false`; `mask_all_element_attributes: false`; `mask_personal_data_properties: false`; no `property_denylist`, `sanitize_properties`, or `before_send`; `save_referrer` and `save_campaign_params` on; `disable_capture_url_hashes: false`; `respect_dnt: false`; 30-minute session idle timeout (capture). The documented defaults for these options agree (PostHog JavaScript configuration docs).
- Most product features are switched on by **remote config**, not by the client: exception autocapture, web vitals, heatmaps (`captureMode: "all"`), replay with console and canvas capture, and network timing. Dead-click capture is off, and surveys are off (capture, "PostHog Remote Config"; settings read). The SDK still downloads the surveys and dead-clicks bundles on every page (capture, "Requests Observed").
- No `/flags` request is made, because the project has no feature flags (`hasFeatureFlags: false`).

### Events and Properties

Custom events, verified against every call site (all `window.posthog?.capture(...)`):

| Event | Call Site | Properties Sent | Observed |
|---|---|---|---|
| `homepage_panel_opened` | `src/pages/index.astro:1407` | `panel_name` | yes |
| `homepage_layout_rendered` | `src/pages/index.astro:1432` | `layout`, `viewport_width`, `viewport_height` | yes |
| `contact_email_clicked` | `src/pages/index.astro:1451` | none | no (not clicked) |
| `booking_link_clicked` | `src/pages/index.astro:1458` | none | no |
| `resume_link_clicked` | `src/pages/index.astro:1471` | none | no |
| `social_link_clicked` | `src/pages/index.astro:1479` | `platform` | no |
| `donation_link_clicked` | `src/pages/index.astro:1488` | `organization` | no |
| `index_link_clicked` | `src/pages/index.astro:1509` | `panel`, `href` | no |
| `writing_link_clicked` | `src/pages/index.astro:1520` | `href` | no |
| `project_page_viewed` | `src/layouts/ProjectLayout.astro:196` | `project_slug`, `project_title`, `project_status` | yes |
| `project_live_link_clicked` | `src/components/ProjectHero.astro:84` | `project_title`, `url` | no |
| `project_github_link_clicked` | `src/components/ProjectHero.astro:95` | `project_title`, `url` | no |
| `blog_post_viewed` | `src/layouts/BlogPost.astro:439` | `post_title`, `tags`, `reading_time` | yes |
| `blog_cta_clicked` | `src/layouts/BlogPost.astro:464` | `cta`, `post_title` | no |
| `blog_post_nav_clicked` | `src/layouts/BlogPost.astro:473` | `direction`, `from_post_title`, `to_post_href` | no |
| `rss_subscribe_clicked` | `src/pages/blog/index.astro:157` | none | no |
| `resume_viewed` | `src/pages/resume.astro:324` | none | yes |
| `resume_pdf_downloaded` | `src/pages/resume.astro:333` | none | no |
| `resume_action_clicked` | `src/pages/resume.astro:336` | `action` | no |
| `resume_cta_clicked` | `src/pages/resume.astro:344` | `cta` | no |

These are the twenty events `specs/analytics.md` lists, with matching properties. None carries visitor-entered data; `href` and `url` values are the site's own link targets.

SDK events observed: `$pageview`, `$autocapture` (clicks), `$$heatmap` (mouse movement and clicks, keyed by full URL), `$web_vitals` (FCP and LCP observed), and `$snapshot` (replay). `$exception` is on by remote config but was not triggered. `$pageleave` is enabled and present in the project's production data for the preceding 24 hours (SQL read), but in the capture it would have been sent at page exit, which the harness refused (capture, "Escape Incident").

Every PostHog event also carries the SDK's standard properties: random `distinct_id`, `$device_id`, `$session_id`, `$window_id`, and `$pageview_id`; `$current_url`, `$host`, `$pathname`, `$referrer`, and session-entry URL and referrer; the raw user agent, browser, OS, device type, language, time zone, and screen and viewport size; and 25 campaign and click-identifier properties (UTM, `gclid`, `gbraid`, `wbraid`, `dclid`, `fbclid`, `msclkid`, and others), copied once to the person as `$initial_*` (capture, "PostHog Payload Shapes"). PostHog adds the client IP and GeoIP properties at ingestion ([Demographics](#demographics)).

`$autocapture` sends the clicked element's ancestry with tag names, classes, and attribute values, including `data-*` attributes (`data-label`, `data-panel`, `data-focus`, `data-palette`), `aria-label`, `id`, `role`, and inline `style` (capture).

### Session Replay

- **On for every session.** `session_recording_opt_in: true`, sample rate unset (100%), minimum duration unset, no linked flag, no URL or event triggers, and an empty URL blocklist (settings read; capture, "PostHog Remote Config").
- **Masking:** project masking config is unset (`masking: null`). The recorder runs with `maskAllInputs: true` (password inputs explicitly) and no text masking, so page text is recorded; elements with `ph-no-capture` are blocked and elements with `ph-mask` are masked (capture, "PostHog Effective Client Configuration"). PostHog documents inputs as masked by default and text as unmasked by default (PostHog replay privacy controls).
- **Console logs: on.** Project `capture_console_log_opt_in: true`; remote `consoleLogRecordingEnabled: true`; the `rrweb/console@1` plugin is active. PostHog documents console capture as off unless enabled (PostHog console log recording docs). See C1.
- **Canvas: on.** Project `session_replay_config.record_canvas: true`; remote `recordCanvas: true` at 3 fps and quality 0.4, encoded as WebP. See C2.
- **Network: timing on, payloads off.** Project `capture_performance_opt_in: true` and remote `capturePerformance.network_timing: true` activate `rrweb/network@1`, which records each request's full URL and timing. `session_recording_network_payload_capture_config` is unset, and no headers or bodies appeared in the replay (settings read; capture). PostHog documents that network recording always captures the request URL and performance information, with headers and bodies opt-in (PostHog network recording docs). See C3.
- **Retention:** `session_recording_retention_period: "30d"` (settings read). PostHog documents up to 30 days on the free plan and longer on paid plans (PostHog replay data retention docs).

### Project Settings Read

From `project-get` on project `<project ID>` (read-only):

- `anonymize_ips: false` ("Discard client IP data" off), `cookieless_server_hash_mode: 0`.
- `autocapture_opt_out: null` (autocapture on), `autocapture_exceptions_opt_in: true`, `autocapture_web_vitals_opt_in: true`, `heatmaps_opt_in: true`, `capture_dead_clicks: false`, `surveys_opt_in: null`.
- Replay settings as above; `recording_domains: null`.
- `test_account_filters`, applied by default: exclude `$host` containing `localhost` or `web.app`, exclude cohort `<internal cohort ID>`, and require `$virt_is_bot` false. That cohort, "Internal / Test users," matches person property `$internal_or_test_user = true` or person `email` containing `@nathanpayne.com` (four persons when read). These exclusions depend on person profiles, which is why `person_profiles: 'always'` is set (`src/components/posthog.astro:40-50`).
- `data_attributes: ["data-attr"]` (the toolbar's selector attribute; this site uses none).

Destinations and pipelines (read-only): the default **GeoIP transformation is enabled**. Four internal destinations file GitHub issues through integration `<GitHub integration ID>` (GitHub, `nathanjohnpayne`): two error-tracking alerts (`$error_tracking_issue_created`, `$error_tracking_issue_reopened`) and two layout alerts (#1045). No batch exports. The only integration is GitHub. No event data is exported to a third party beyond those issue bodies, which carry the error's name, description, and `distinct_id` (`docs/error-tracking.md:39-50`, `:58`).

## Google Analytics 4

- Loaded on every page from `PUBLIC_GA_MEASUREMENT_ID` (`src/layouts/BaseLayout.astro:73`, `159-181`): a static `<script async src="https://www.googletagmanager.com/gtag/js?id=…">` (`:162`), then `gtag('js', …)` and `gtag('config', <ID>, { page_title: document.title, page_location: window.location.href })` (`:174-178`). `page_location` is therefore the full URL, including query string and fragment, and the capture confirmed `dl` carried both.
- No consent mode is configured in code. Hits carried `gcd=13l3l3l3l1l1`, `npa=0`, and `dma=0` (capture).
- **Homepage hover path:** on hover-capable, fine-pointer devices (`canHover`, `src/pages/index.astro:577`), the first `mouseenter` on each panel sends `gtag('event', 'section_view', { section_name, event_category: 'engagement' })` behind a `typeof gtag` guard (`src/pages/index.astro:1262-1272`). Observed three times. `specs/analytics.md:23-27` lists `section_name` only; the code also sends `event_category`.
- **Configured in the property, observed in the served tag:** enhanced measurement for page views (including history changes), scrolls (`scroll` observed), outbound clicks, site search (`q`, `s`, `search`, `query`, `keyword`), video engagement, file downloads, and form interactions. Google documents that these events carry `page_location`, `page_referrer`, `link_url`, `link_text`, `link_domain`, `file_name`, `search_term`, `form_destination`, and `video_url` (Google enhanced measurement docs). The tag also enables **user-provided data collection with automatic detection** of email, phone, and address, enables **email redaction** with no query-parameter redaction, and contains no Google Ads destination (capture, "GA4 Payload Shapes"). No user-data parameter appeared in any hit.
- **Unload-time hit:** Google documents that GA4 sends `user_engagement` when a visitor navigates away from or closes the page (Google user-engagement docs). The capture's proxy refused a `www.google-analytics.com` connection on every page exit, which is probably that hit; because the request was refused before it could be inspected, the event name and every field of its payload are **not verified**, and none is assumed here.
- Each hit carries the client ID (`cid`), session ID and count, User-Agent Client Hints (architecture, platform and version, model, full browser version list), screen resolution, language, page title, and page URL (capture).
- **Recipients:** `www.google-analytics.com` only. No DoubleClick, Google Ads, or `google.com/ads` request was made (capture).
- **IP:** Google states that GA4 does not log or store IP addresses for EU, Swiss, and UK users and uses the IP only to derive location (Google IP-address docs). For other visitors, Google states that GA4 collects IP addresses for basic services such as spam detection and coarse location, never associates raw IPs with user identifiers, and discards them after use, and that when a Google Ads account is linked, encrypted IP data may flow to it (Google non-European IP docs). No GA4 setting for this exists to read; whether an Ads link exists is Nathan to Verify item 5.

## Cloudflare

### Web Analytics (RUM)

- **Present on production.** Every page fetched directly ends with an edge-injected `<script type="module" src="https://static.cloudflareinsights.com/beacon.min.js/…" data-cf-beacon='{…"token":"<site token>"…}'>` (capture, "Cloudflare Web Analytics Payload Shape"). The repository has no reference to it (searched `src/`, `public/`, `scripts/`, `astro.config.mjs`, and `firebase.json`).
- **How it is injected:** the zone's `rum` setting is `on` and the Web Analytics site for the zone has `auto_install: true`, with an enabled ruleset containing no rules (Cloudflare API read). Cloudflare documents that automatic setup injects the snippet on all pages under the zone and reports to the site's own `/cdn-cgi/rum` (Cloudflare Web Analytics FAQ).
- **IP and referrer:** Cloudflare documents that the RUM service receives the client IP as part of handling the beacon request and discards it at the nearest data center, and that the beacon reports a referrer taken from `document.referrer` (Cloudflare RUM beacon docs). Cloudflare does not document whether a referrer's query string is removed, and the capture did not test a query-bearing page as the next page's referrer, so same-origin referrer handling is **not verified** (Nathan to Verify item 13).
- **What it sends:** a `POST /cdn-cgi/rum` after the page loads and another when the visitor leaves it (Cloudflare Web Analytics FAQ). The capture inspected the load-time request; the exit beacon was refused at the proxy on every page exit, so its payload is **not verified**. The load-time request carries page-load timings, paint metrics, a page-load ID, the site token, and `location` as origin and path only, with no query string or fragment (capture). Cloudflare states that Web Analytics uses no cookies or `localStorage` and does not fingerprint visitors by IP address or user agent (Cloudflare Core Web Vitals docs), and that it does not track individual end users across sites (Cloudflare data origin and collection docs). No storage was set by the beacon in the capture.
- **Can a client-side gate control it? No, not as deployed.** The element is static HTML that Cloudflare inserts at the end of `<body>` after the origin responds, so a script in `<head>` runs before the element exists and cannot stop its fetch. Cloudflare's controls are zone and dashboard settings: the enablement mode (including an option that drops EU visitors' data, per the Cloudflare changelog, 2025-02-25) and RUM rules by host and path. A manual install of the snippet, behind the site's gate, would put it under the opt-out, but that is a configuration change for Nathan (coordinate with #1080). The CSP report-only header does not list `static.cloudflareinsights.com` (`firebase.json:91-92`), and the browser reported the violation (capture).

### Network Error Logging and Email Obfuscation

- Responses carry a Cloudflare `NEL` and `Report-To` header with `success_fraction: 0.0`, pointing at `a.nel.cloudflare.com`; the zone's `nel` setting is enabled (Cloudflare API read). Under the W3C NEL specification, a browser that supports NEL sends reports only for failed requests at that rate, including the URL without its fragment (and, for DNS and connection failures, without path or query), the referrer, method, server IP, protocol, status code, and elapsed time (W3C Network Error Logging). The browser sends these itself; page code cannot gate them.
- The zone's Email Address Obfuscation setting is `on` (Cloudflare API read), which inserts `/cdn-cgi/scripts/…/email-decode.min.js` on pages with an email address (capture). It is a same-origin script with no collection request observed.

## Hosting and CDN

Every request for a page or asset reaches Cloudflare, which proxies the zone; requests Cloudflare does not answer from its cache continue to Firebase Hosting, the origin (`.ai_context.md`, External Dependencies; `firebase.json`; long-lived cache headers in `firebase.json` and `scripts/cf-cache-purge.sh` show cache hits are a real path). Neither is analytics and neither is under the site's opt-out, but each receives, for the requests that reach it, what any web server receives: the client IP, the request URL including its query string (the fragment never leaves the browser), the user agent, and the referrer. Cloudflare documents an HTTP request dataset with those fields for its logs (Cloudflare HTTP requests dataset). Firebase Hosting keeps request logs only when Cloud Logging export is linked, and then deletes them after 30 days by default; the logs include the full request URL, IP, referrer, user agent, and IP-derived city and country (Firebase request-log docs). Which of these logs are enabled, and their retention, was not read (Nathan to Verify item 19). The notice should name both as hosting providers and must not imply that query scrubbing or the opt-out reaches them.

## Other Third Parties

| Recipient | Where | Request | What It Receives | Source |
|---|---|---|---|---|
| Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`) | every page | stylesheet and font files | an ordinary HTTP request: IP, user agent, and a `Referer` limited to the origin by `Referrer-Policy: strict-origin-when-cross-origin` | `src/layouts/BaseLayout.astro:183-189`; `firebase.json:83-84`; capture |
| Logo.dev (`img.logo.dev`) | `/resume/` | up to two image requests per logo (domain lookup, then name lookup on miss), carrying the publishable token | IP, user agent, origin-only `Referer`, and the employer or school being looked up | `src/components/resume/CompanyLogo.astro:59-63`, `:85-105`; capture (16 requests) |
| Mux Video (`stream.mux.com`, `image.mux.com`) | `/projects/swipe-watch/` | HLS stream and poster | IP, user agent, origin-only `Referer` | `src/components/ProjectMuxPlayer.astro:42`, `:48`; `src/content/projects/swipe-watch.mdx:10`; capture |
| Mux Data (`*.litix.io`; `inferred.litix.io` observed) | `/projects/swipe-watch/` | playback beacons from `mux-embed`, bundled same-origin and loaded only on Mux pages | viewer and playback data; sets the first-party `muxData` cookie (365 days) | `src/components/ProjectMuxPlayer.astro:313-348`; `.ai_context.md:105`; capture; Mux privacy docs |
| GitHub (public issues in this repository) | PostHog destinations, not the browser | issue creation when an error-tracking alert fires | the exception's name and description and the visitor's `distinct_id`, copied into a public GitHub issue body | `docs/error-tracking.md:39-58`; settings read (destinations) |
| Cal.com | links only (`src/pages/index.astro:442`, `src/pages/resume.astro:67`, `src/pages/projects/index.astro:145`) | none until a visitor clicks | nothing on page load | source |

Mux documents that its cookie holds a random viewer ID, a sampling value, and session ID, start, and expiry; that it truncates IPv4 addresses to /24 after deriving country- and state-level location; and that it keeps pseudonymized view data up to 100 days (Mux privacy docs). The site only loads `mux-embed` (5.18.1) and hands it to `@mux/mux-background-video` (`src/components/ProjectMuxPlayer.astro:320-329`); that package (0.2.3, per `package-lock.json`) calls `mux.monitor` with only `debug` and player metadata, so neither `disableCookies` nor `respectDoNotTrack` is set, and Mux documents both as off by default (Mux HTML5 monitoring docs). In the capture the Mux Data beacon was attempted only at page exit, because the stream itself was blocked.

## Identifiers and Storage

| Name | Type, Scope | Set By | Lifetime | Holds | Source |
|---|---|---|---|---|---|
| `ph_<token>_posthog` | cookie, `.nathanpayne.com`, `Secure`, `SameSite=Lax` | PostHog | 365 days | random `distinct_id` and device ID, session ID and timestamps, first URL and referrer, user state | capture; PostHog persistence docs |
| `ph_<token>_posthog` | `localStorage` | PostHog | until cleared | the cookie's keys plus cached remote-config flags | capture |
| `ph_<token>_posthog`, `…_window_id`, `…_primary_window_exists`, `…_session_registered_properties` | `sessionStorage` | PostHog | tab session | referrer, campaign and click-identifier parameters, window ID, replay diagnostics | capture |
| `_ga` | cookie, `.nathanpayne.com`, `SameSite=Lax` | GA4 | rolling: 2 years per Google, refreshed on each page load (`cookie_update` defaults to true, Google tag cookie docs), so a returning visitor keeps it indefinitely; Chrome caps each write at 400 days (observed) | client ID | capture; Google cookie-usage docs |
| `_ga_<measurement ID suffix>` | cookie, `.nathanpayne.com`, `SameSite=Lax` | GA4 | rolling, as `_ga`; 400 days per write observed | session state | capture; Google cookie-usage docs |
| `muxData` | cookie, `nathanpayne.com`, `SameSite=Lax` | Mux Data | 365 days observed | viewer ID, sampling, session | capture; Mux privacy docs |
| PostHog person profile | server-side | PostHog | see [Retention](#retention) | one per visitor (`person_profiles: 'always'`), with `$initial_*` properties | `src/components/posthog.astro:50`; capture (`$set_once`) |

The site's own scripts read and write no cookie or Web Storage key (searched `src/` for `localStorage`, `sessionStorage`, and `document.cookie`). Cloudflare Web Analytics sets nothing (capture; Cloudflare Core Web Vitals docs).

## Demographics

| Tool | What It Reports Today | Source of Each Field | Status |
|---|---|---|---|
| PostHog | country, subdivision, city, postal code, latitude and longitude, time zone, continent | GeoIP transformation (enabled) on the client IP at ingestion; the raw IP is also stored (`anonymize_ips: false`). Of 283 `$pageview` events in the seven days to 2026-10-08, all 283 carried `$ip`, country, latitude, and time zone; 252 carried city, 237 subdivision, 236 postal code (presence counts only, no values read) | verified (settings read, SQL) |
| PostHog | browser, OS, device type, language, time zone, screen and viewport size | the visitor's browser (user agent and JavaScript APIs) | verified (capture) |
| GA4 | city, region, country, continent | IP address, per Google | vendor doc; reports not read |
| GA4 | device, browser, OS, language, screen resolution | User-Agent Client Hints, `ul`, `sr` | verified (capture) |
| GA4 | age, gender, interests | Google signals (the served tag disallows it in all regions), or user-provided data collection, which Google says provides demographic and interest reporting from first-party and consented signed-in Google data and which is on with automatic detection (Google user-provided data docs) | **Nathan to verify**: unverified until items 1, 3, and 5 are checked |
| Cloudflare Web Analytics | browser, OS, device type, path | beacon request; available as dimensions in the zone's RUM dataset | verified (API read) |
| Mux Data | country and state | IP address, per Mux | vendor doc |

No new demographic, identity, or enrichment feature was enabled and none was disabled by this inventory.

## Retention

| Data | Retention | Status |
|---|---|---|
| PostHog session recordings | 30 days | verified: project setting `session_recording_retention_period: "30d"`, read 2026-10-08. Applies to new recordings only (PostHog replay data retention docs) |
| PostHog events and person profiles | unknown | **Nathan to verify** (plan-dependent; billing scope not readable) |
| GA4 event data and user data | unknown | **Nathan to verify** |
| Cloudflare Web Analytics | raw beacon data 7 days, then reduced to about 10% for long-term storage; dashboard shows the last six months, per Cloudflare | vendor statement (Cloudflare Web Analytics FAQ); how long the long-term aggregate is kept, and any account-specific setting, **Nathan to verify** |
| Cloudflare NEL reports | unknown; Cloudflare documents no retention period for NEL data | **Nathan to verify** (item 14) |
| Cloudflare CDN request logs | depends on the zone's logging and Logpush settings | **Nathan to verify** (item 19) |
| Firebase Hosting request logs | not collected unless Cloud Logging export is enabled; then 30 days by default | vendor statement (Firebase request-log docs); whether export is on, **Nathan to verify** (item 19) |
| Mux Data view data | up to 100 days, per Mux | vendor statement, account not read |
| GitHub issues filed by error-tracking alerts | until the issue is deleted; closing does not remove it, and PostHog retention or deletion does not reach it | verified (destination config; `docs/error-tracking.md:39-58`) |
| `ph_<token>_posthog` cookie | 365 days | verified (capture) |
| `_ga`, `_ga_<ID>` cookies | rolling: 2 years per Google from the last refresh, capped at 400 days per write in Chrome; renewed on each visit that allows GA4 | verified (capture; Google cookie-usage docs) |
| `muxData` cookie | 365 days | verified (capture) |

## Production SDK Versions

| Asset | Exact Request | Version | SHA-256 (Decoded Body) |
|---|---|---|---|
| PostHog `array.js` | `https://d.nathanpayne.com/static/array.js` | posthog-js **1.438.3** | `fcf54cb4b984f1e81dc69c741b94009e8d3c1d9d3ad2fe57893f7c3c1369d3df` |
| PostHog replay recorder | `https://d.nathanpayne.com/static/1.438.3/posthog-recorder.js` | 1.438.3 | `7bda870178d2d711b2e2879fca552eded3d1b8cdad4ce5e760a221f2851cfb8a` |
| `gtag.js` | `https://www.googletagmanager.com/gtag/js?id=<measurement ID>` | not versioned; three variants in eight loads | `f34220e1a7dc7cfae8332511695a7b8859ef39ecf837443d059b48c893bd3ab3` (5 loads), `1ee851e4853a414f6f17e6b1020939ca5c0d6a0d54df1d200f8cae6c23054274` (1), `45f1503d2a63c528ef137d553b1c6bf96b8bf893cd184a240f12afbaa13c5639` (2) |
| Cloudflare beacon | `https://static.cloudflareinsights.com/beacon.min.js/v4bc70e2c01a94c73b74392e4234840661791215815920` | beacon `2026.10.0` | `3e5bc7ca508f5d5aa7255341243840c8d2b70c8aea323800b51610df3f5a8a2c` |

All six PostHog bundles the SDK loaded are byte-identical to `dist/` in the npm package `posthog-js@1.438.3`, and both `array.js` and the recorder embed `LIB_VERSION="1.438.3"`. The SDK requests extensions from the versioned path `/static/1.438.3/…` first. `array.js` is cached for four hours at an unversioned path, so production can move to a newer release without a site change. The other bundle hashes are in the capture.

## Nathan to Verify

Each item needs a dashboard read or a decision this track could not make. Paths are as Google, PostHog, and Cloudflare document them.

1. **Google signals.** GA4 Admin → Data collection and modification → Data collection → Google signals data collection, including its region settings. The served tag disallows it in all regions; confirm, because age, gender, and interests depend on it. Do not turn it on without a separate decision (owner decision item 4).
2. **Granular location and device data collection.** Same page. The served tag does not disallow it in any region.
3. **User-provided data collection.** GA4 Admin → Data collection and modification → Data collection → User-provided data collection. The served tag has automatic detection of email, phone, and address on. Google documents that user-provided data is SHA-256 hashed, either by the site before sending or by the feature itself, without saying where automatic detection hashes (Google user-provided data docs); if it hashes in the browser, a payload search for a literal value would not find it. It is an existing identity feature, so it stays on unless you decide otherwise, but it is now a **#1233 release blocker**: before the flag goes on, either the acceptance suite shows no hashed fixture value is sent, or you change the setting (contract, Capture Minimization item 3, GA4 user-provided data). The notice must disclose it if it stays.
4. **GA4 data retention.** GA4 Admin → Data collection and modification → Data retention (event data and user data).
5. **Google Ads and other product links.** GA4 Admin → Product links → Google Ads links (and the other product links listed there). The served tag carries no Ads destination and no Ads request was made, but a GA4–Ads link is server-side and invisible to the client. If no Ads link depends on them, `gclid`, `gbraid`, `wbraid`, and `dclid` can leave the scrubbing allowlist (contract, Capture Minimization item 3).
6. **GA4 data sharing settings.** GA4 Admin → Account settings → Account details → Data sharing settings.
7. **GA4 ads personalization.** GA4 Admin → Data collection and modification → Data collection → Advanced settings to allow for ads personalization. Hits carry `npa=0`.
8. **GA4 enhanced measurement and redaction.** GA4 Admin → Data collection and modification → Data streams → the web stream → Enhanced measurement (all seven observed on) and Redact data (email observed on, no query parameters). These events send full link, download, and form URLs and site-search terms outside `page_location` (see C4).
9. **PostHog plan and event retention.** PostHog → Organization → Billing. The MCP key lacks `billing:read`.
10. **PostHog replay retention.** Already 30 days. Confirm that this is the chosen setting the notice should state (PRIV-8).
11. **PostHog IP capture.** PostHog → Settings → Project → IP data capture configuration → Discard client IP data (off). Not a safeguard conflict; the notice must reflect it either way. PostHog documents that GeoIP enrichment still works when the toggle is on.
12. **How `$internal_or_test_user` gets set.** The internal-traffic cohort depends on it or on a person `email`; this site never calls `identify()`. Not determined here.
13. **Cloudflare Web Analytics.** Cloudflare dashboard → Web Analytics → nathanpayne.com → Manage site: enablement mode (all visitors or excluding EU), rules, and retention. Decide whether to keep automatic injection (disclosed, not controlled by the opt-out), switch to a gated manual install, or turn it off (coordinate with #1080's CSP allowlist).
14. **Cloudflare NEL and Email Obfuscation.** Cloudflare dashboard → nathanpayne.com: Network → Network Error Logging (on); Scrape Shield → Email Address Obfuscation (on). Disclosure decisions. Also confirm how long NEL report data is kept, since no retention is documented.
15. **Google Fonts and Logo.dev request logging.** Neither vendor's current page yielded a statement on what they log from end-user font or image requests; Logo.dev's privacy policy describes API request logs (IP, queried domain, timestamps) without addressing its image CDN.
16. **Mux Data options.** Whether to keep Mux Data cookies and to pass `disableCookies` or `respectDoNotTrack`, and whether Mux Data should follow the site's opt-out (it is outside the contract's two tools).
17. **Error-alert issue copies.** Error-tracking alerts copy the visitor's `distinct_id` and the exception text into public GitHub issues in this repository, a separate copy outside PostHog's retention. Decide whether the destination template should keep `distinct_id`, and whether the notice discloses GitHub as a recipient.
18. **One stray replay record.** The inventory's second browser run leaked one replay event from its test session into PostHog at 19:13:59 UTC on 2026-10-08 (capture, "Escape Incident"). The session ID is in the #1227 report, not in the repository. Deleting it is a vendor write.
19. **Hosting and CDN request logs.** Cloudflare dashboard → nathanpayne.com → Analytics & Logs (Logpush jobs and log retention), and, in the Firebase console, whether Hosting is linked to Cloud Logging (the web request log export) and the retention of that log bucket. Both see full request URLs and IPs regardless of the opt-out.

## Capture Conflicts

These are existing settings that conflict with the approved safeguards. None was changed. Each needs Nathan's decision; the contract says the implementation reports remote-config conflicts and does not override them (Capture Minimization item 1, PRIV-13).

- **C1. Replay console-log capture is on.** Project `capture_console_log_opt_in: true`; remote `consoleLogRecordingEnabled: true`; recorder plugin `rrweb/console@1` active. Setting: PostHog → Settings → Project → Replay → Capture console logs.
- **C2. Replay canvas capture is on.** Project `session_replay_config.record_canvas: true`; remote `recordCanvas: true` (3 fps, quality 0.4). Setting: PostHog → Settings → Project → Replay → Canvas capture.
- **C3. Replay network timing records full URLs.** Project `capture_performance_opt_in: true`; remote `capturePerformance.network_timing: true`; plugin `rrweb/network@1`. Headers and bodies are off, so this is not body capture, but every recorded request URL is unscrubbed: the page's own URL with its query string and fragment, every GA4 `collect` URL (carrying the GA client ID and the full page URL), and Logo.dev URLs. That conflicts with scrubbing "replay metadata" (contract, Capture Minimization item 3). Setting: PostHog → Settings → Project → Replay → Capture network performance; the client can also filter entries, which is #1228's call.
- **C4. GA4 enhanced measurement sends URLs and terms outside `page_location`.** Outbound clicks (`link_url`, `link_domain`), file downloads (`link_url`, `file_name`), form interactions (`form_destination`), site search (`search_term`), and video (`video_url`) are configured in the property, not in code. The contract's scrubbing rule applies to these parameters too (Capture Minimization item 3, GA4 enhanced measurement), but gtag offers no supported client-side hook to rewrite them, so the conflict stays open until Nathan chooses property settings (query-parameter redaction, or which events stay on); until then PRIV-2 is not verified for these payloads and blocks #1233. Setting: item 8 above.
- **C5. Cloudflare Web Analytics is outside the opt-out.** It is injected at the edge and keeps reporting for visitors who opt out or send GPC. Copy must not say the opt-out covers it unless item 13 changes that.

Existing client-side capture that the flag-on runtime (#1228) is contracted to change, listed so its tests have a baseline: PostHog `$current_url`, `$heatmap_data` keys, `$session_entry_url`, `$initial_current_url`, and the cookie's first-URL field carry query strings and fragments; GA4 `page_location` carries both; autocapture sends `data-*` attribute values and inline `style`; replay records page text unmasked.

## Consequences of Opt-Out and GPC

Today the production site has no opt-out and does not read GPC: PostHog and GA4 load for every visitor, and the privacy controls exist only behind the build-time flag, which is off (contract, Feature Flag). This section describes what changes once the flag-on runtime ships, no earlier than 2026-10-16 (owner decision item 6). From then, a visitor who opts out or sends GPC stops new PostHog and GA4 collection: no new events, replay, exceptions, or person profile. For an opt-out made mid-visit, the exact residual is whatever the runtime documents and its tests verify (contract, Withdrawal item 1; #1228's `specs/analytics.md` § Privacy Runtime); for example, a request already on the network at that instant may complete. Copy must state that residual rather than promise zero transmission. Opting out does not delete anything already sent: earlier events, recordings, and an existing person profile stay under each tool's retention (contract, Withdrawal item 3; [Retention](#retention)).

- **Layout alerts (#1045, #1065).** Two daily SQL alerts in PostHog page on any `homepage_layout_rendered` event with the wrong layout for the viewport (`specs/analytics.md:122-139`), and both file GitHub issues through PostHog destinations (settings read). Because they fire on a count above zero, opt-outs cause no false alerts, but a wrong layout served only to opted-out or GPC visitors never pages. #1065 made the event fire even when fonts hang (`src/pages/index.astro:1411-1425`); that keeps loads in the denominator, but only for visitors who allow analytics.
- **Error-tracking alerts.** Exceptions reach PostHog only through exception autocapture (`specs/analytics.md:141-147`), so an error seen only by opted-out visitors files no GitHub issue (`docs/error-tracking.md:39-50`).
- **Product metrics.** Pageviews, custom events, funnels, heatmaps, web vitals, and replay coverage in PostHog, and all GA4 reports, undercount by the opted-out and GPC share. That share is unknown today, because GPC is not recorded. #1059's measurement window (2026-10-01 to 2026-10-14) ends before the earliest flag-on date (2026-10-16, owner decision item 6).
- **Internal-traffic exclusions** keep working for visitors who allow analytics. Opted-out internal visitors send nothing, so nothing needs excluding.
- **Mux Data** is outside the opt-out too: on `/projects/swipe-watch/`, an opted-out or GPC visitor still loads `mux-embed`, which sends Mux Data playback beacons and can set the 365-day `muxData` cookie (`src/components/ProjectMuxPlayer.astro:313-348`), unless Nathan item 16 changes that wiring.
- **Cloudflare Web Analytics and NEL** are outside the opt-out, so they continue for opted-out and GPC visitors. Whether Web Analytics covers every visitor depends on its enablement mode, which may exclude EU visitors and is unverified (item 13); Cloudflare's counts will differ from PostHog's and GA4's by the opted-out share and by whatever that mode excludes.

## Contract Acceptance Criteria

Status of the criteria this inventory can speak to:

- **PRIV-1:** inventory side done (observed requests and settings agree with this document); the notice and `/privacy/` are #1229's.
- **PRIV-8:** replay retention verified at 30 days; notice wording pending (#1229).
- **PRIV-13:** remote-config conflicts reported (C1–C3); needs Nathan.
- **PRIV-15:** this change is documentation only; the flag-off check is part of `npm test`.
- **PRIV-16:** nothing enabled or disabled; the existing demographic, identity, and advertising features are listed above.
- **PRIV-17:** Cloudflare Web Analytics inventoried; the opt-out does not control it (C5); disclosure is #1229's.
- **PRIV-18:** no raw capture, HAR, identifier, or token is committed; tokens appear only as placeholders.

## Sources

Repository files are cited inline at commit `5d688d69`.

Captures and reads (2026-10-08):

- [`capture-2026-10-08.md`](capture-2026-10-08.md): the production capture under default-deny egress, with method, payload shapes, storage, hashes, and the escape incident.
- PostHog project `<project ID>`, read through the PostHog MCP server: `project-get`, `cohorts-retrieve` (`<internal cohort ID>`), `cdp-functions-list`, `batch-exports-list`, `integrations-list`, and `execute-sql` presence counts on `events` and `raw_session_replay_events`. No write was made.
- Cloudflare zone `nathanpayne.com`, read through the Cloudflare API: `GET /zones/{zone}/settings/rum`, `…/settings/nel`, `…/settings/email_obfuscation`, `GET /accounts/{account}/rum/site_info/list`, and a GraphQL `rumPageloadEventsAdaptiveGroups` query. No write was made.
- Served HTML of `/`, `/blog/`, `/projects/`, and `/resume/`, fetched directly with `curl`.

Vendor documentation (read 2026-10-08):

- PostHog JavaScript configuration, including `defaults`: <https://posthog.com/docs/libraries/js/config>
- PostHog persistence and cookies: <https://posthog.com/docs/libraries/js/persistence>
- PostHog replay privacy controls: <https://posthog.com/docs/session-replay/privacy>
- PostHog console log recording: <https://posthog.com/docs/session-replay/console-log-recording>
- PostHog network recording: <https://posthog.com/docs/session-replay/network-recording>
- PostHog replay data retention: <https://posthog.com/docs/session-replay/data-retention>
- PostHog data storage and IP discarding: <https://posthog.com/docs/privacy/data-storage>
- Google Analytics cookie usage: <https://support.google.com/analytics/answer/11397207>
- Google tag cookie customization (`cookie_update`): <https://developers.google.com/tag-platform/security/guides/customize-cookies>
- GA4 enhanced measurement: <https://support.google.com/analytics/answer/9216061>
- GA4 user-provided data collection: <https://support.google.com/analytics/answer/14077171>
- GA4 Google signals: <https://support.google.com/analytics/answer/9445345>
- GA4 data retention: <https://support.google.com/analytics/answer/7667196>
- GA4 data redaction: <https://support.google.com/analytics/answer/13544947>
- GA4 IP addresses: <https://support.google.com/analytics/answer/12017362>
- GA4 IP addresses outside the EU, Switzerland, and UK: <https://support.google.com/analytics/answer/16871531>
- Cloudflare Web Analytics FAQ: <https://developers.cloudflare.com/web-analytics/faq/>
- Cloudflare HTTP requests dataset: <https://developers.cloudflare.com/logs/logpush/logpush-job/datasets/zone/http_requests/>
- Firebase Hosting web request logs: <https://firebase.google.com/docs/hosting/web-request-logs-and-metrics>
- GA4 user engagement: <https://support.google.com/analytics/answer/11109416>
- Cloudflare RUM beacon data collection: <https://developers.cloudflare.com/speed/observatory/rum-beacon/>
- Cloudflare Core Web Vitals (data collected): <https://developers.cloudflare.com/web-analytics/data-metrics/core-web-vitals/>
- Cloudflare data origin and collection: <https://developers.cloudflare.com/web-analytics/data-metrics/data-origin-and-collection/>
- Cloudflare changelog, excluding EU visitors from RUM: <https://developers.cloudflare.com/changelog/post/2025-02-25-rum-exclude-eu/>
- Cloudflare Email Address Obfuscation: <https://developers.cloudflare.com/waf/tools/scrape-shield/email-address-obfuscation/>
- W3C Network Error Logging: <https://www.w3.org/TR/network-error-logging/>
- Mux data privacy: <https://www.mux.com/docs/guides/ensure-data-privacy-compliance>
- Mux HTML5 video monitoring: <https://www.mux.com/docs/guides/data/monitor-html5-video-element>
- Logo.dev privacy policy: <https://www.logo.dev/legal/privacy>
