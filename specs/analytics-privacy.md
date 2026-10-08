---
spec_id: analytics-privacy
title: Analytics Privacy Controls
---

# Analytics Privacy Controls

This is the contract for #1079: a default-on privacy notice, persistent opt-out controls, Global Privacy Control (GPC) support, and capture minimization for PostHog (including session replay) and GA4. Every #1079 sub-issue (#1226–#1233) builds and reports against it. The spec is the [owner decision of 2026-10-08](https://github.com/nathanjohnpayne/nathanpaynedotcom/issues/1079#issuecomment-6064837256) and the [proposed scope](https://github.com/nathanjohnpayne/nathanpaynedotcom/issues/1079#issuecomment-6064174748); the decision wins where they differ, and this file wins over any track's own reading of either.

`specs/analytics.md` remains the spec for what the site captures. This file governs whether it captures, and what is stripped first.

## Feature Flag

Everything this contract adds ships behind one build-time flag, defined in `src/lib/privacy-flag.ts`.

1. `PRIVACY_CONTROLS_COMMITTED` is the committed value. It is `false` until #1233, which is the only change allowed to set it to `true`.
2. **Test-only override.** A build run in the Astro mode `privacy-test` (`astro build --mode privacy-test`) enables the flag regardless of the committed value. `npm run build:privacy-test` produces that build in `dist-privacy-test/` with fixed fake tokens. The override reads nothing but the Astro mode: no environment variable, file, or query string can enable it. A production build runs in mode `production`, so it ignores the override by construction, and `npm run deploy` always runs a production build.
3. `privacyControlsEnabled()` is the only switch any component may consult. `isPrivacyTestBuild()` additionally gates the test fixture page, which must never be built in mode `production`, even after #1233. Both take no arguments and read the actual Astro mode; the mode-taking `flagStateForMode()` exists for unit tests, and no file under `src/` other than the flag module may call it.
4. **Flag off means no change.** With the flag off, a production build differs from `main` at this contract's base commit in none of these ways:
   - no gate script, notice, controls, footer link, or `/privacy/` route
   - no scrubbing, masking, or replay-exclusion change
   - the analytics region of every page's `<head>`—from `<!-- PostHog -->` up to `<!-- Google Fonts -->`—is byte-identical to the base commit's, with the same tokens
5. `tests/analytics-privacy.test.js` enforces item 4 inside the required `build-and-test` job. `npm test` first runs `scripts/build-flag-off.mjs`, which builds the site into `dist-flag-off/` in mode `production` with fixed fake tokens, before the main build, so no build runs while other suites read `.astro/`. The test compares each page's analytics region with `tests/fixtures/privacy/flag-off-analytics-region.json`, which was captured from the base commit. It also fails if any built file contains a runtime marker (see [Runtime API](#runtime-api)) or if `privacy/` or `test-fixtures/` exist in the output. Every PR for #1227–#1230 must pass it. #1233 replaces it with the flag-on invariants when it flips the flag; until then, nobody regenerates the fixture.

Base commit: `347401c6` (`main` when this contract was written).

## Choice Model

1. **Saved choice:** `unset` (no choice made), `granted`, or `denied`.
2. **Effective state** is `granted` or `denied`, with a reason:
   - If `navigator.globalPrivacyControl === true`, the effective state is `denied` with reason `gpc`, regardless of anything saved.
   - Otherwise a saved `denied` gives `denied` (reason `choice`), a saved `granted` gives `granted` (reason `choice`), and `unset` gives `granted` (reason `default`). Default-on is the owner's decision.
3. **GPC precedence.** A saved in-site choice never overrides an active GPC signal. While GPC is active, `set('granted')` is rejected and changes nothing; `set('denied')` is accepted and saved, so the opt-out survives GPC being turned off later. If GPC is turned off after an opt-out, the saved `denied` keeps analytics off.
4. Both tools follow the same effective state. There is no per-tool choice.

## Storage

1. One first-party `localStorage` key, `np-privacy`, holding JSON: `{"v":1,"choice":"granted"|"denied"|"unset","noticeDismissed":true|false}`. No cookie is added, and nothing is sent to a server.
2. A missing key, unparseable JSON, an unknown `v`, or an unknown `choice` reads as `{"choice":"unset","noticeDismissed":false}`. The gate never rewrites a value it could not parse until the visitor makes a choice or dismisses the notice.
3. **When storage throws** (blocked site data, some private modes):
   - A failed read is treated as `unset`, so the effective state falls back to the GPC rule and then to default-on.
   - A failed write still applies the new choice to the current page view in memory. `get().persisted` is `false`, and the controls tell the visitor plainly that the choice could not be saved and will apply only to this page.
4. Changes made in another tab arrive through the `storage` event and are applied as if made locally: a change to `denied` withdraws in every open tab.

## Gate

1. `src/components/privacy/PrivacyHead.astro` renders, when the flag is on, one synchronous `is:inline` script placed in `<head>` before `<!-- PostHog -->`. It has no imports and no network access. Before any analytics code runs, it reads storage and GPC, defines `window.npPrivacy`, and stamps `data-np-privacy="granted"|"denied"` and `data-np-privacy-reason` on `<html>`.
2. With the flag on, the PostHog and GA4 blocks run only when `window.npPrivacy` exists and its boot decision is `granted`. If the gate is missing or threw, analytics fail closed and do not load.
3. When the boot decision is `denied`, no PostHog or GA4 script element is created (including the `gtag/js` loader, which today is a static element and must become a conditionally created one), no SDK global is defined beyond what the page's own optional-chained calls tolerate, and no request is sent to PostHog or GA4. The gate cannot reach Cloudflare Web Analytics, which Cloudflare injects at the edge and which keeps reporting for denied visitors (inventory, Capture Conflicts C5); copy must say so rather than imply the opt-out covers it.
4. The localhost skip in `posthog.astro` stays. Nothing that forces initialization on a local host may ship.

## Runtime API

```ts
window.npPrivacy = {
  version: 1,
  get(): {
    saved: 'unset' | 'granted' | 'denied',
    effective: 'granted' | 'denied',
    reason: 'default' | 'choice' | 'gpc',
    persisted: boolean,          // false if the last write failed
    loadedThisPage: boolean,     // analytics were initialized in this page view
  },
  set(choice: 'granted' | 'denied'): boolean,   // false when rejected (GPC)
  gpc(): boolean,
  onChange(fn: (state) => void): () => void,    // returns an unsubscribe
  notice: { shouldShow(): boolean, dismiss(): void },
};
```

- After every applied change, the runtime dispatches `np:privacy-change` on `window` with the `get()` snapshot as `detail`, then calls `onChange` listeners.
- `notice.shouldShow()` is true while the saved choice is `unset`, the notice has not been dismissed, and GPC is not active. Dismissing the notice is not a choice: it sets `noticeDismissed` and leaves the choice `unset`.
- **Runtime markers.** The strings `npPrivacy`, `np:privacy-change`, `data-np-privacy`, and the storage key `np-privacy` appear in every gate, runtime, and UI implementation, and nowhere in a flag-off build. The flag-off check fails on any of them.

## Withdrawal

When `set('denied')` runs mid-visit:

1. PostHog stops immediately: no further event, batch, or replay-snapshot request leaves the page, and any active recording stops. Events or snapshots still queued in the SDK are dropped rather than flushed wherever the vendor's documented API allows; where it does not, the implementation documents exactly what may still be sent and the inventory and `/privacy/` say so.
2. GA4 stops sending hits for the rest of the page view (Google's documented `ga-disable-<MEASUREMENT_ID>` property or an equivalent verified mechanism). Hits already sent cannot be recalled.
3. Nothing already transmitted is recalled or deleted. Copy never implies otherwise.
4. `get().effective` becomes `denied`, and the change event fires after both tools have stopped.

## Re-Enable

1. `set('granted')` after `denied` saves the choice but never loads or resumes analytics in the current page view. Collection resumes on the next page load, and the controls say so.
2. On that next load, both tools initialize and capture normally. Any opt-out state the vendor SDK persisted on its own during withdrawal must not block it.
3. `unset` → `granted` changes nothing observable except the saved value.

## Capture Minimization

These apply whenever analytics load with the flag on.

1. **Replay masking.** All inputs are masked. Text inside `[data-np-privacy="mask"]` is masked. Every `<form>` and every `[data-np-privacy="block"]` region is blocked (not recorded). Client config never turns on network request or response bodies, console-log capture, or canvas capture. Where PostHog's remote config already turns one of them on (the inventory found console logs, canvas, and network timing on as of 2026-10-08), the implementation leaves that setting alone and the conflict goes to Nathan's checklist; overriding it client-side would be resolving the conflict. URL scrubbing (item 3) still applies to any URL those features record.
2. **Replay exclusions.** Replay never records on an excluded path. The excluded set is `/privacy/` and everything under it, held in one constant. Exclusion is enforced before capture starts on load and re-evaluated on every client-side navigation the browser can perform: `pushState`, `replaceState`, `popstate`, `hashchange`, and back/forward-cache restores (`pageshow` with `persisted`). PostHog URL triggers are not an exclusion mechanism, because recording can continue after a visitor leaves a matching page.
3. **URL scrubbing.** Every URL that reaches PostHog (current URL, pathname-bearing properties, referrers, session-entry and initial URL properties, person-level URL properties, `$heatmap_data` keys, and replay metadata, including the request URLs replay network timing records) or GA4 (`page_location`, `page_referrer`) is reduced to origin and path, plus only allowlisted query parameters. The fragment is always dropped. The allowlist is `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, and `utm_content`, plus the Google click identifiers `gclid`, `gbraid`, `wbraid`, and `dclid`, which stay until the inventory shows whether an advertising link depends on them and Nathan decides (decision item 4 forbids disabling an existing advertising feature without approval). The allowlist is one constant. A blocklist is not acceptable.
   - **GA4 enhanced measurement.** The GA4 property's enhanced measurement sends further URL-bearing and visitor-derived parameters outside `page_location` and `page_referrer`: `link_url` and `link_domain` (outbound clicks, downloads), `file_name`, `form_destination`, `video_url`, and `search_term` (inventory, Capture Conflicts C4). The same rule applies to them: no sensitive query value, fragment, or visitor-entered term reaches GA4. gtag offers no supported client-side hook to rewrite those parameters, so the runtime scrubs them only where a verified mechanism exists and otherwise reports them; the residual is resolved by Nathan's property settings (data redaction of query parameters, or which enhanced-measurement events stay on), not by the runtime disabling them. Until Nathan resolves it, PRIV-2 is **not verified** for GA4 enhanced-measurement payloads, and that blocks #1233.
   - **GA4 user-provided data.** The property has user-provided data collection with automatic detection of email, phone, and address on (inventory, Nathan to Verify item 3). Google documents SHA-256 hashing of user-provided data without saying whether automatic detection hashes in the browser, so the acceptance suite also searches every GA4 payload for the SHA-256 of the normalized fixture canaries (for example the lowercased `NP-CANARY-ATTR@example.test`), not only the literal strings. Until that test passes or Nathan changes the setting, it blocks #1233.
4. **Attributes.** Element attributes other than structural ones needed for autocapture selectors are not sent; in particular no `data-*` attribute value reaches an event payload.
5. **Unchanged.** `person_profiles: 'always'` and the internal/test-traffic exclusions keep working exactly as before. No new identity, advertising, or enrichment feature is enabled, and no existing demographic, identity, or advertising feature is disabled.

## UI Hooks

| Surface | Element and Hooks | Owner |
|---|---|---|
| Notice | `<aside id="np-privacy-notice" data-np-privacy-ui="notice">`, labelled; buttons `[data-np-privacy-action="deny"]` and `[data-np-privacy-action="dismiss"]`; a link to `/privacy/` | #1229 |
| Footer link | `<a href="/privacy/" data-np-privacy-ui="footer-link">` on every page (shared `Footer.astro`, plus the homepage and 404, which don't use it) | #1229 |
| Controls | `<section id="np-privacy-controls" data-np-privacy-ui="controls">` on `/privacy/`; live status `[data-np-privacy-ui="status"]` (`aria-live="polite"`); buttons `[data-np-privacy-action="deny"]` and `[data-np-privacy-action="grant"]` | #1229 |
| GPC state | `data-np-privacy-gpc` on the controls while GPC is active; the grant button is disabled with a plain explanation in `[data-np-privacy-ui="gpc-explanation"]` that analytics are off because the browser sends GPC | #1229 |
| Page | `/privacy/`, from `src/pages/privacy/[...index].astro` with `export const prerender = true` and a `getStaticPaths` that returns the route only when `privacyControlsEnabled()`. Its description and share-card copy come from a `privacy` entry in `src/content/site-copy/` through `getSiteCopy()`, like every other public page | #1229 |

The notice is non-modal, never covers content or blocks interaction, and appears only while `notice.shouldShow()` is true. Opting out takes no more steps than re-enabling. The UI calls only `window.npPrivacy`; it never touches analytics scripts.

## Test Fixture

`/test-fixtures/privacy/` (`src/pages/test-fixtures/privacy/[...index].astro`) is built only when `isPrivacyTestBuild()`. It uses `BaseLayout`, is `noindex`, and holds canary strings that must never appear in any transmitted payload:

| Canary | Where |
|---|---|
| `NP-CANARY-INPUT` | typed by tests into the text input, email input, and textarea |
| `NP-CANARY-FORM` | a hidden input inside the `<form>` |
| `NP-CANARY-MASKED-TEXT` | text inside `[data-np-privacy="mask"]` |
| `NP-CANARY-BLOCKED-TEXT` | text inside `[data-np-privacy="block"]` |
| `NP-CANARY-ATTR` | the value of `data-fixture-pii` (a fake email) on a clickable element |
| `NP-CANARY-QUERY` | the `email` query parameter of the fixture's sensitive link |
| `NP-CANARY-FRAGMENT` | the fragment of that link |

The sensitive link also carries `utm_source=fixture`, which must survive scrubbing (a positive control). The page links to `/privacy/` for the allowed-to-excluded navigation test.

Browser runs against `dist-privacy-test/` serve it on a non-local hostname (for example Chromium `--host-resolver-rules` mapping `nathanpayne.test` to the local server), because PostHog skips local hosts.

**Egress.** A Playwright route alone is not a sufficient egress boundary: requests sent while a page unloads (`navigator.sendBeacon`, `fetch` with `keepalive`) bypass it, and one such request reached production PostHog during the #1227 inventory. Every browser run therefore launches Chromium with two independent controls: a local proxy as its only network path (`--proxy-server` to a local proxy that serves only the local test server and SDK fixtures, with loopback not bypassed), and resolver rules that make every other hostname unresolvable (`--host-resolver-rules` mapping `*` to `~NOTFOUND` except the test hostname), so a request that somehow bypassed the proxy also fails to resolve. Because WebRTC can send UDP outside both of those, the browser also launches with `--force-webrtc-ip-handling-policy=disable_non_proxied_udp`, and a test creates an `RTCPeerConnection` with a public STUN server and asserts it gathers no server-reflexive or relay candidate. An OS-level firewall on the runner is not required; these three browser-level controls plus the refusal tests below are the boundary. The run also installs a default-deny route and blocks service workers before the first navigation. Collection endpoints go to a local sink and are never forwarded. Tests must show that an unload-time beacon to an unlisted host is refused and that WebRTC gathers no non-local candidate.

## File Ownership

No two parallel tracks edit the same file.

| Sub-Issue | Owns |
|---|---|
| #1226 contract | this file, `src/lib/privacy-flag.ts`, the mount points in `BaseLayout.astro`, the empty `PrivacyHead.astro` and `PrivacyBody.astro`, the test fixture page, the test fixture and flag rows in `docs/agents/repository-overview.md`, `tests/analytics-privacy.test.js`, `scripts/lib/analytics-region.mjs`, `scripts/build-flag-off.mjs`, `tests/fixtures/privacy/`, the `test` script, `.gitignore`, the `build:privacy-test` script |
| #1227 inventory | `docs/privacy/` |
| #1228 runtime | `src/components/posthog.astro`, `src/layouts/BaseLayout.astro` (head analytics blocks), `src/components/privacy/PrivacyHead.astro`, `src/lib/privacy/`, `specs/analytics.md`, `tests/privacy-runtime*` |
| #1229 notice and page | `src/components/privacy/PrivacyBody.astro`, `src/components/privacy/ui/`, `src/pages/privacy/`, `src/content/site-copy/privacy.md` and its schema entry, the `/privacy/` row in `docs/agents/repository-overview.md`, the footer link in `Footer.astro`, `src/pages/index.astro`, and `src/pages/404.astro`, `screenshots/privacy/`, `tests/privacy-ui*` |
| #1230 acceptance suite | `tests/privacy/`, its Playwright config, its fixtures manifest, and its CI wiring |
| #1233 enable | `PRIVACY_CONTROLS_COMMITTED`, and the flag-off test's replacement |

`PrivacyHead` and the analytics blocks are `is:inline` scripts that can't import modules, so #1228 owns the gate end to end. Anything outside this table needs the orchestrator's assignment first.

## Acceptance Criteria

Every track reports against these IDs as pass, fail, not verified, or needs Nathan, with evidence.

| ID | Criterion | Source |
|---|---|---|
| PRIV-1 | The inventory and the notice and `/privacy/` agree with observed requests and verified vendor settings | proposal AC 1 |
| PRIV-2 | Masked fixture content, sensitive URL values, and excluded fields are absent from transmitted event and decompressed replay payloads | proposal AC 2 |
| PRIV-3 | Tests cover a fresh visit, opt-out before initialization, withdrawal while recording, return visits, and deliberate re-enabling | proposal AC 3 |
| PRIV-4 | A saved opt-out prevents both tools from initializing on later visits: no SDK script elements and zero analytics requests | proposal AC 4 |
| PRIV-5 | Withdrawal stops recording and collection and handles pending events as documented | proposal AC 4 |
| PRIV-6 | The notice and controls work with keyboard and assistive technology: visible focus, correct roles and names, announced state, reduced motion, 320 px, axe clean | proposal AC 5 |
| PRIV-7 | Internal/test-traffic exclusions still work, and `person_profiles: 'always'` is unchanged | proposal AC 5 |
| PRIV-8 | Replay retention is verified against the chosen setting, and the notice wording matches it | proposal AC 6 |
| PRIV-9 | The default-on legal question is documented in the counsel memo, and any required change returns to Nathan before implementation proceeds on that basis | proposal AC 7 |
| PRIV-10 | An active GPC signal turns both tools off regardless of a saved choice; turning GPC off after an opt-out keeps them off; the controls show the GPC state and make re-enabling unavailable | decision 2 |
| PRIV-11 | Public copy makes no claim of anonymity, compliance, or "not sold" without a verified, cited source, and no placeholder or unverified factual claim ships | decision 3 |
| PRIV-12 | Replay never records an excluded page, including after navigating to it from an allowed page | proposal 3 |
| PRIV-13 | Client config never turns on network body, console, or canvas capture, and every remote-config conflict is reported to Nathan rather than overridden | proposal 3 |
| PRIV-14 | The notice is non-modal and dismissible, dismissing is not a choice, and opting out takes no more steps than re-enabling | proposal 2, 4 |
| PRIV-15 | With the flag off, the build is unchanged per [Feature flag](#feature-flag) item 4 | decision 6 |
| PRIV-16 | No new identity, advertising, or enrichment feature is enabled, and no existing demographic, identity, or advertising feature is disabled | decision 4 |
| PRIV-17 | Cloudflare Web Analytics, if present, is inventoried and disclosed, with whether the site's opt-out controls it | decision 5 |
| PRIV-18 | No raw request capture, HAR file, real identifier, token, or counsel material is committed | Part C hard constraints |
