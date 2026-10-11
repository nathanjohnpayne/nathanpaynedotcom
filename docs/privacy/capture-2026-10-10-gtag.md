# GA4 Tag Capture, 2026-10-10

This is the provenance record for the `gtag.js` the acceptance suite tests (#1262, part of #1079). It follows Nathan's GA4 property changes of 2026-10-10 and supersedes the three `gtag.js` hashes in [`capture-2026-10-08.md`](capture-2026-10-08.md), which describe the tag as it was before those changes. Nothing else in the 2026-10-08 capture is affected.

It holds hashes, sizes, counts, and the names of configuration entries. It holds no measurement ID, no token, and no copy of the file. The ID is read from the production page at run time, and the bytes are fetched into a gitignored cache.

## What Was Captured

The tag production loads for the site's measurement ID, `GET https://www.googletagmanager.com/gtag/js?id=<measurement ID>`, read from Node with no browser and no cookies. The ID came from the production home page's script tag, the same read the suite's setup performs. The property itself was not opened or changed; GA4 stayed read-only.

Forty-eight loads were taken on 2026-10-10 in two runs (8, then 40). All returned `200` and a script of 481,564 to 489,487 bytes.

| Variant | Loads | Bytes | SHA-256 of the Response Body |
|---|---|---|---|
| A, **recorded and tested** | 41 | 488,213 | `4671d2908da552f77529ff573d6cfa4047a3d49250e5d7b85e226ca28318684d` |
| B | 5 | 488,213 | `f08d4d029d79fa5d39fa17e72c9fa166689e184c1e2ab5c1bd01959c1d57956f` |
| C | 1 | 481,564 | `c9910bdae3cd420953a9a2fadb5d0108b7b94f11ef33aee05b2098ccd8b3b0b9` |
| D | 1 | 489,487 | `ed9624a461a72dd28ad68e4d5595cd44efd22cf3750ba8e724743d69be2b625e` |

B differs from A in exactly one byte, a server-side flag in the tag's `blob` object (`"15":"0"` becomes `"15":"1"`). C and D are other builds of the runtime and its experiment list. Google serves the tag with `private, max-age=900`, so which variant a visitor gets is not under the site's control, and the suite asks until it is served variant A (`fetchAttempts` in `tests/privacy/manifest.json`).

## What the Served Configuration Says

The container's `resource.tags` list is the property's configuration for the stream. It was identical in all four variants (same entries, same settings, byte for byte). Against Nathan's changes of 2026-10-10:

| Property Setting | Served Tag | Reflects the Change |
|---|---|---|
| Enhanced measurement, page views, with history events | `__ccd_em_page_view`, `historyEvents: true` | on, as intended |
| Enhanced measurement, scrolls | `__ccd_em_scroll` | on, as intended |
| Enhanced measurement, outbound clicks, site search, form interactions, video engagement, file downloads | no `__ccd_em_*` entry for any of them | **off** |
| Allow user-provided data capabilities | `__ogt_1p_data_v2` with `isEnabled: false` | **off** |
| Redact data | `__ccd_auto_redact`, `redactEmail: true`, no query-parameter list | unchanged |
| Google signals | `__ccd_ga_regscope`, `GOOGLE_SIGNALS` disallowed in all regions | unchanged |

The 2026-10-08 tag had an entry for each of the seven enhanced-measurement events and `__ogt_1p_data_v2` enabled with automatic detection. No propagation delay applied: the first read after Nathan's re-verification already showed the new configuration, so no retry was needed.

Two flags in the served tag still read as on, and neither is a finding. `__ogt_auto_events` keeps `enableOutboundClick`, `enableDownload`, `enableForm`, and `enableVideo` set to `true`, and `__ogt_1p_data_v2` keeps `isAutoCollectPiiEnabledFlag: true`. They read as container-wide listener switches that do nothing without a per-event `__ccd_em_*` entry or an enabled user-data entry, but that is an inference from the file, not a documented guarantee. The behavior is what the suite asserts from sent hits: the disabled events and their parameters never reach the sink, and no contact value, hashed or literal, and no user-data parameter does either.

## How the Suite Uses It

- `tests/privacy/manifest.json` records variant A's SHA-256, its size, and the capture date. The inventory's `gtag.js` row records the same hash first, and the suite fails if the two disagree.
- At run time the suite fetches the current tag from Node, retries until the bytes hash to the recorded SHA-256, substitutes the fake test ID, and serves that copy. The substitution is the only edit. The browser never reaches Google.
- The GA4 provenance test passes when the raw bytes equal the recorded hash. Any other bytes skip it with a `re-record` reason, never a pass, and every other GA4 test then carries a `ga4-not-verified` annotation.
- Separate tests read the embedded configuration from the served copy and fail if an enhanced-measurement event other than page views and scrolls, or user-provided data, is enabled in it.

To record a new capture when Google changes the tag, follow [Testing Requirements](../agents/testing-requirements.md#ga4-tag-refresh).

## Not Verified

- The GA4 property was not read by this track. Nathan's settings are known from his re-verification in #1232 and from the served tag; this note does not add a second source for the property pages.
- Variants B, C, and D were checked for identical configuration but are not tested. The suite serves variant A.
- Which variant the live site serves to a given visitor at a given time is not controllable and not recorded beyond the counts above.

## Re-Record, 2026-10-11

The day after the capture above, the suite's provenance test read `re-record`: Google no longer served variant A (`4671d2908da552f77529ff573d6cfa4047a3d49250e5d7b85e226ca28318684d`) in any of the loads, which is the refresh path working as designed. Forty loads on 2026-10-11 gave three variants, all `200`.

| Variant | Loads | Bytes | SHA-256 of the Response Body |
|---|---|---|---|
| A2, **recorded and tested** | 33 | 488,213 | `c292b477d7e4e0609be9bd3d6833840f44bf2d5c426d2b508b1699beb3a48283` |
| B2 | 3 | 488,213 | `fd30f41f4b1dbf1c8962a1db244490dbfaffb14d41f3ceed16f8cca570938f2b` |
| C2 | 4 | 481,564 | `285a7a86adf9fd797317c49a7b65ce41985e8726e105e37c6540911e590ad2cf` |

The embedded configuration was byte-identical across all three and equal to the 2026-10-10 configuration in the table above: page views with history events and scrolls on, the five other enhanced-measurement events absent, `__ogt_1p_data_v2` disabled. B2 differs from A2 in one flag byte, as B did from A. C2 is the other runtime build (481,564 bytes) seen on 2026-10-10 as variant C. The manifest now records A2 with capture date 2026-10-11; the 2026-10-10 hashes above are history.

The served bytes changed within about a day while the property configuration did not, so expect the recorded hash to need re-recording again. Each time, confirm the configuration first (see [Testing Requirements](../agents/testing-requirements.md#ga4-tag-refresh)).
