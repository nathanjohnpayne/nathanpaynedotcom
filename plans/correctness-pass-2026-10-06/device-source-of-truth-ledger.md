# Facts ledger, 2026-10-06 correctness pass: `device-source-of-truth`

Page source: `src/content/projects/device-source-of-truth.mdx`. Surface: `https://nathanpayne.com/projects/device-source-of-truth/`. Retrieval timestamp for every API figure: 2026-10-06. Prior ledger: `plans/759/project-pages-ledger.md` §A (A1–A50, read at product pin `c9f66f0`).

Pins. The product repository `nathanjohnpayne/device-source-of-truth` (private) was read from the local checkout `~/GitHub/device-source-of-truth` at **`cc376a818b74ec60933242abb171b3a575269558`** (short `cc376a8`, 2026-10-05 14:55:15 −0700, "docs(prd): materialize the device-source-of-truth PRD mirror from the docs vault (#210)"), which is both `HEAD` and `origin/main` there (fetched 2026-10-05 15:03) and matches the API's `pushed_at: 2026-10-05T22:48:20Z`. Every `git show`/`git grep` below names that SHA; `S` in a command means it. Five commits separate it from the prior ledger's pin, and the only ones that touch product code are `9420f88` (#198, 2026-09-30, auth hardening, which shifted line numbers in `questionnaireIntake.ts` by +15) and `6bbb2fc` (#211, 2026-10-05, Firestore rules); the `specs/` tree is byte-identical to the prior pin (`git diff --stat c9f66f0..S -- specs` is empty). The page in this worktree is identical to `main` (`git diff --stat main -- src/content/projects/device-source-of-truth.mdx` empty; last change `6ef9910`, 2026-09-03), and the live surface carries the same strings (fetched 2026-10-06, 59,389 bytes). Line numbers below are the page's physical lines. The hub context the brief supplied is confirmed and dated: mergepath `098ca79f` (#1194, 2026-09-05) dropped this repository as a consumer because it "went dormant"; the API reports Actions `enabled: false` as of 2026-10-06T16:32:30Z and the last workflow run at 2026-09-05T15:38:42Z. The page says nothing that depends on that relationship (R34).

## Summary

| # | Claim (verbatim, abbreviated) | Location | Verdict | Corrected value or weaker form | Source |
|---|---|---|---|---|---|
| R1 | "forty of the API's fifty role guards are admin-only" | L29, L91 | WRONG | fifty of the API's sixty role guards are admin-only (ten are editor-or-admin); same count at the prior pin, so the prior ledger's 40/50 was a miscount | `git grep -hoIE "requireRole\('[a-z]+'(, '[a-z]+')?\)" S -- functions/src \| sort \| uniq -c` |
| R2 | "with each hit tagged direct or contextual" | L61 | WRONG | with alias hits tagged direct or contextual; exact and fuzzy hits carry their own tags | `functions/src/types/index.ts:98`; `partnerAliasResolver.ts:8,65`; `partnerResolver.ts:145,174` |
| R3 | "Every consumer of partner data goes through the resolver" | L63 | WRONG | every feed that arrives carrying a partner name goes through the resolver (four of five); telemetry resolves by partner key through the key registry; read routes never call it | `git grep -lI "partnerResolver\|resolvePartner" S -- functions/src`; `telemetry.ts:62,84` |
| R4 | "a viewer reads everything" | L91 | WRONG | a viewer reads the registry; four admin-only GET routes (user list, import-batch and migration history, field-option usage) | `users.ts:10`, `partnerKeys.ts:412`, `upload.ts:267`, `fieldOptions.ts:273` |
| R5 | "an editor authors records and stages imports" | L91 | WRONG | an editor authors records and stages the questionnaire import; the other four feeds' previews are admin-only | `intake.ts:110`, `telemetry.ts:168`, `partnerKeys.ts:707`, `upload.ts:56,369` |
| R6 | "the only sign anything was skipped is a count in the response" | L48 | WRONG | the only sign is the preview's stale warning; at commit a skipped row is folded into the no-change count and nothing in the response distinguishes it | `telemetry.ts:322-331,478-510`; `grep -c skipped` = 0 |
| R7 | "a registered device has its alert dismissed by hand" | L127 | WRONG | registering a device closes its alert from the client through the ordinary dismiss route (reason "Device Registered"); only the server-side auto-close is partner-key-only | `src/pages/AlertsPage.tsx:305-318`; `alerts.ts:41`; `devices.ts` 0 hits on `alerts` |
| R8 | "the partner-engineering work I spent a decade doing at Disney" | L83 | UNPROVABLE | "my partner-engineering work at Disney" | no artifact attests tenure length |
| R9 | questions "arrive constantly, from partner engineering, certification, support, and platform teams" | L79 | UNPROVABLE | audience claim as written; the PRD mirror names TPM, P&D PM, Certification Specialist and TAM as intended users | `docs/projects/device-source-of-truth/prds/device-source-of-truth.md:109,535,702,827` |
| R10 | "What the fragmentation cost is my testimony rather than the repository's" | L81 | UNPROVABLE | already labelled testimony; no change | n/a |
| R11 | "the deployed instance runs them end to end" | L137 | UNPROVABLE | "the workflows shipped and the demo deploys the same build" (login-walled; hosting last-modified 2026-08-21T02:46:46Z, 12 min after the scrub commit) | `curl -sI https://device-source-of-truth.web.app`; `auth.ts:23` |
| R12 | "built inside Disney, forked and reseeded with invented data"; "a fork of that system … the same codebase, with the real records replaced" | L4, L83 | SUPPORTED | | `README.md:3,5`; `6e002a7`; owner statement 2026-08-29 (§A50) |
| R13 | `seoDescription`, `cardDescription` | L5, L6 | SUPPORTED | | R21, R25; `tests/project-pages.test.js:66-74` |
| R14 | `order: 3` / `accent: "blue"` | L8, L11 | SUPPORTED | | `specs/project-pages.md:447`; orders 0–6 unique |
| R15 | `screenshotSrc` hero | L10 | SUPPORTED | | file present; site `3b40551` 2026-08-20 |
| R16 | `liveUrl`, `liveLabel: "View Demo"`, frontmatter comment | L12–L16 | SUPPORTED | | `curl` 200; `tests/project-pages.test.js:139`; `specs/project-pages.md:74` |
| R17 | `status: "ARCHIVED"` | L18 | SUPPORTED | | last feature `0821e80` 2026-03-06; `da3d682` "repo is dormant"; Actions disabled |
| R18 | `metadata` format/focus | L20–L21 | SUPPORTED | | `README.md:3` |
| R19 | `stack` eight entries | L22 | SUPPORTED | | `package.json`; `functions/package.json` |
| R20 | "260 fields", "100–150", "sixteen sections", "30-pair batches" | L24–L25, L35, L87 | SUPPORTED | | `questionnaireFields.ts` (260 fields, 16 sections); `DST-047:290`; `questionnaireExtractor.ts:29` |
| R21 | "5 feeds", "every ingestion path previews before it commits, and every one of those commits is admin-only", mermaid | L26–L27, L89, L95–L114 | SUPPORTED | | `index.ts:64-81`; commit routes `upload.ts:56`, `intake.ts:351`, `partnerKeys.ts:925`, `telemetry.ts:214`, `questionnaireIntake.ts:1212`; `MigrationPage.tsx:125,225` |
| R22 | "3 roles", "viewer, editor, admin" | L28–L29, L91 | SUPPORTED | | `functions/src/types/index.ts:88`; `src/lib/types.ts:82`; `users.ts:8` |
| R23 | "Private repo", "stays private", "stops at a restricted login", "no repository link" | L30–L31, L153 | SUPPORTED | | API `private: true` 2026-10-06T16:30:07Z; anon GET 404; `auth.ts:23`; `tests/project-pages.test.js:122` |
| R24 | "a proposed value and a self-reported confidence for every field"; "stored once"; "exactly one consumer—the review screen" | L35, L36, L40, L135 | SUPPORTED | precision: every extracted field; unextracted fields hold `null` | `questionnaireExtractor.ts:313,712`; `questionnaireIntake.ts:282`; `QuestionnaireReviewPage.tsx:728,1400-1402,1447` |
| R25 | approve route "refuses to commit until every intake partner is reviewed, a partner is assigned, every device is approved or rejected, and every conflict … is resolved" | L36, L40, L93, L141 | SUPPORTED | | `questionnaireIntake.ts:1212,1233,1241,1252,1269` |
| R26 | "auto-resolving a name match at 0.90 without asking anyone—I set that threshold"; "still lands in an admin-confirmed preview" | L37, L135 | SUPPORTED | byline caveat (§A46) on "I set" | `aiDisambiguate.ts:25,226`; `aiImportFramework.ts:25,455`; `a0891c1` 2026-03-03 |
| R27 | spec quote "no questionnaire data enters the database without my explicit review" | L38 | SUPPORTED | | `specs/DST-048-questionnaire-admin-review-sign-off.md:22` |
| R28 | "four-step wizard—Assign Partner, Review Devices, Resolve Conflicts, Sign Off" | L39, L141 | SUPPORTED | | `QuestionnaireReviewPage.tsx:2081-2084` |
| R29 | "Telemetry arrives as CSV snapshots"; preview marks stale rows; skipped unless overridden per row by index; overwritten count returned | L44, L45 | SUPPORTED | | `telemetry.ts:134-135,178,217,225,322-338,482` |
| R30 | "the commit counts it as no-change and moves on—so an unattended import still finishes" | L48 | SUPPORTED | | `telemetry.ts:326-331` |
| R31 | "fresh under 48 hours, aging under seven days, stale beyond … one client function … persisted nowhere, consulted by nothing else"; "No alert fires … no export excludes it, no workflow blocks on it" | L53, L56 | SUPPORTED | | `src/lib/format.ts:40-49`; `getFreshnessState` callers all in `src/`; `contracts:133` |
| R32 | "the telemetry export, the key mapping, and the questionnaire header each have their own idea of what a partner is called" | L60 | SUPPORTED | precision: telemetry's is a partner key | `telemetry.ts:62`; `partnerKeys.ts:976`; `questionnaireIntake.ts:1269` |
| R33 | "exact match, then registered alias, then fuzzy similarity at 0.90"; "an unmatched name on CSV import creates a partner" | L61 | SUPPORTED | precision: auto-create is the partner-key CSV import | `partnerResolver.ts:113,163,170`; `partnerKeys.ts:976,1018,1023` |
| R34 | `related`: blog, Mergepath, Swipe Watch; no Mergepath-governance claim on the page | L65–L71 | SUPPORTED | relationship the link implies ended 2026-09-05; the Mergepath page says so itself | live 200 ×3; mergepath `098ca79f`; `mergepath.mdx:206` |
| R35 | Dolby Vision, "an ADK build that just went end-of-life", OS-stack change and certification status, "every one of them is answerable" | L79 | SUPPORTED | precision: the registry has no end-of-life flag; it answers which devices run which version | `questionnaireFields.ts:152-153,238`; `DashboardPage.tsx:268`; `contracts:388-390` |
| R36 | "Amazon moving Fire TV to Vega OS" | L79 | SUPPORTED | public record, outside the audit's listed sources; no repository artifact names Vega | web search 2026-10-06 (links in row) |
| R37 | "They lived in Airtable, in Datadog, in partner-submitted Excel questionnaires, and in spreadsheets" | L81 | SUPPORTED | | `README.md:3` (near-verbatim) |
| R38 | feed names and origins: AllModels CSV, Airtable, partner keys from Datadog, telemetry from Datadog, Excel questionnaire | L87, L97–L102 | SUPPORTED | | `upload.ts:219`; `specs/DST-037`; `specs/DST-038:5`; `FreshnessBadge.tsx:80` |
| R39 | "shipped fire-and-forget once and was rebuilt as an idempotent per-device task queue with retry and stale-job recovery" | L87 | SUPPORTED | | `7f61480` 2026-03-04; `index.ts:123-126`; `questionnaireIntake.ts:483-501,697` |
| R40 | "on four feeds … an admin calling the commit route directly is not made to look at anything first. On questionnaire intake the server itself refuses" | L93, L95 | SUPPORTED | | `intake.ts:354`; `telemetry.ts:217`; `upload.ts:59`; `partnerKeys.ts:928`; R25 |
| R41 | telemetry-only alerts with Register Device / Create Key; "Creating the key auto-dismisses every matching alert server-side"; "The other four feeds raise no alerts" | L127 | SUPPORTED | (the "by hand" half is R7) | `telemetry.ts:415,447`; `partnerKeys.ts:598-619`; `collection('alerts')` writers |
| R42 | alt: "fifteen alerts", two types, remedies, dismissed rows keep reason and actor | L129 | SUPPORTED | | `seed.mjs` 10+3+2; capture; `alerts.ts:68-71` |
| R43 | alt: four steps, "three intake partners at pending review", "44-fields-extracted", registry verdict, server enforces | L141 | SUPPORTED | | capture; `seed.mjs:600-601`; `QuestionnaireReviewPage.tsx:837` |
| R44 | alt: "Updated 9 days ago" against a 28-day window, past the seven-day threshold, stale, nothing acts | L145 | SUPPORTED | capture-time value; note the missing full stop in "decision The reader" | capture; `format.ts:67`; `FreshnessBadge.tsx:96`; `contracts:133` |
| R45 | synthetic since "a scrub … in August 2026"; invented operators and group; `_synthetic` marker; header "Every name in this file is invented."; ADK→SEK display-only | L151 | SUPPORTED | | `6e002a7` 2026-08-20; `dataset.mjs:4,32,54-57`; `seed.mjs:1000`; `DashboardPage.tsx:268` |
| R46 | "a scrub of deployed data does not reach specs and history, and those still carry real partner identities"; "its one live button" | L153 | SUPPORTED | | `6e002a7` body; `specs/` identical to prior pin (§A26 holds) |
| R47 | "no artifact records a team adopting the tool" | L137 | SUPPORTED | absence verified with a control | `git grep -nIiE 'time saved\|hours saved\|adoption\|users onboarded\|went live' S -- README.md DEPLOYMENT.md .ai_context.md docs specs plans bugs` |

Counts: WRONG 7, STALE 0, UNPROVABLE 4, SUPPORTED 36.

## Rows

### R1: forty of fifty role guards
> "viewer, editor, admin—forty of the API's fifty role guards are admin-only" (line 29); "forty of the API's fifty role guards are admin-only, which is the codebase's clearest statement about where it thinks the risk lives" (line 91)

**WRONG.** The loosest correct matcher, `git grep -hoIE "requireRole\('[a-z]+'(, '[a-z]+')?\)" S -- functions/src | sort | uniq -c`, returns `50 requireRole('admin')` and `10 requireRole('editor', 'admin')`: sixty guards, fifty admin-only. The unfiltered listing (`git grep -nIE "requireRole\('" S -- functions/src`) shows every one of the sixty is a `router.<verb>(...)` guard across fifteen route files, none in a comment, a definition or a test, so there is nothing to narrow. The identical matcher at the prior ledger's pin `c9f66f0` returns the identical 50/10, and the per-file counts are the same at both pins, so the figure was wrong on the day the sentence entered the page (`99ab5fd`, 2026-08-30, #873) and the prior ledger's §A29 ("Of the fifty `requireRole(...)` call sites across the API, forty are `requireRole('admin')` alone") was a miscount at its own pin, not drift since. Corrected value: **fifty of the API's sixty role guards are admin-only**. The argument the number carries survives the correction; 50/60 is a larger admin share than 40/50. Source: the two commands above -> `50 / 10` at both `cc376a8` and `c9f66f0`.

### R2: each hit tagged direct or contextual
> "Resolution runs a chain—exact match, then registered alias, then fuzzy similarity at 0.90—with each hit tagged direct or contextual" (line 61)

**WRONG.** `resolutionType: 'direct' | 'contextual'` is a property of an alias rule (`functions/src/services/partnerAliasResolver.ts:21`, read from Firestore at `:38`), and only an alias hit carries it into a result, as `matchConfidence: 'alias_direct'` (`:78`) or `'alias_contextual'` (`:91`). The chain's other hits are tagged differently: an exact match returns `matchConfidence: 'exact'` (`functions/src/services/partnerResolver.ts:145`) and a Jaro-Winkler hit returns `'fuzzy'` (`:174`). The full union is `'exact' | 'alias_direct' | 'alias_contextual' | 'fuzzy' | 'new_partner' | 'unmatched'` (`functions/src/types/index.ts:98`). Corrected value: **"with alias hits tagged direct or contextual"**, the one place the distinction exists. Source: `git show S:functions/src/types/index.ts | sed -n '98p'`; `git show S:functions/src/services/partnerResolver.ts | sed -n '113,185p'`.

### R3: every consumer of partner data goes through the resolver
> "Every consumer of partner data goes through the resolver, the alias rules are one more registry an admin maintains by hand, and the product can never show a naive flat partner list with nothing standing in front of it." (line 63)

**WRONG, one quantifier too wide.** `git grep -lI "partnerResolver\|resolvePartner" S -- functions/src` lists the routes `intake.ts`, `partnerKeys.ts`, `upload.ts` and the services `intakeParser.ts`, `questionnaireParser.ts`, `inputLimits.ts` besides the two resolver files; the questionnaire feed reaches it through `questionnaireParser.ts`. `telemetry.ts` never calls it: a telemetry row carries a partner *key* (`:62 const partnerKey = stripEmoji((row.partner ?? '').trim())`), which the preview looks up in the `partnerKeys` collection (`:84 .where('partnerKey', '==', pk)`), and the device, partner, report and search routes read partners by id. So four of the five feeds go through the name resolver, the fifth goes through the key registry, and nothing on the read side consults either. Corrected value: **"every feed that arrives carrying a partner name goes through the resolver"**; telemetry resolves by key. Source: the `git grep -l` above; `git show S:functions/src/routes/telemetry.ts | sed -n '59,90p'`.

### R4: a viewer reads everything
> "a viewer reads everything, an editor authors records and stages imports, an admin alone commits or deletes" (line 91)

**WRONG, quantifier.** Four GET routes are `requireRole('admin')`: `functions/src/routes/users.ts:10` (`GET /api/users`), `partnerKeys.ts:412` (`GET /api/partner-keys/import-batches`), `upload.ts:267` (`GET /api/upload/migration/history`) and `fieldOptions.ts:273` (`GET /api/field-options/:id/usage`). Every other read route carries no role guard beyond `authenticate` (`functions/src/index.ts:58`), which is what the sentence means and is true of the registry itself. Corrected value: **"a viewer reads the registry"** (the user list, import and migration history, and field-option usage are admin reads). "An admin alone commits or deletes" holds: all nine `router.delete` handlers are `requireRole('admin')`, and every import commit is too (R21). Source: `git grep -nIE "requireRole\('" S -- functions/src | grep "router.get"` -> the four routes above.

### R5: an editor stages imports
> "an editor authors records and stages imports" (line 91)

**WRONG, quantifier.** The ten editor-reachable guards are `devices.ts:236/:297`, `partners.ts:141/:181`, `deviceSpecs.ts:76`, `questionnaireIntake.ts:174/:620/:697` (upload a questionnaire, trigger extraction, retry a device), `tiers.ts:213` (simulate) and `upload.ts:369` (`/bulk-specs`, which returns `501 "Bulk spec import is temporarily disabled"` and writes nothing). Staging on the other four feeds is admin-only: `intake.ts:110 /preview`, `telemetry.ts:168 /preview` and `partnerKeys.ts:707 /import/preview` are all `requireRole('admin')`, and the AllModels path has no server preview at all (its only write, `upload.ts:56 /migration`, is admin). An editor therefore stages exactly one import. Corrected value: **"an editor authors records and stages the questionnaire import"**. Source: `git grep -nIE "requireRole\('editor'" S -- functions/src`; `git show S:functions/src/routes/upload.ts | sed -n '369,374p'`.

### R6: the only sign anything was skipped is a count
> "Loading older snapshots on purpose means overriding them one at a time, by row index, and the only sign anything was skipped is a count in the response nobody is required to read." (line 48)

**WRONG.** A stale row without an override runs `noChangeCount++; successCount++; continue;` (`functions/src/routes/telemetry.ts:322-331`), so it is folded into the no-change tally alongside rows whose values genuinely matched. The response carries `newCount, updatedCount, noChangeCount, staleOverwrittenCount, errorCount` (`:478-510`); `staleOverwrittenCount` counts rows the admin *did* override, and no field counts the ones declined: `git show S:functions/src/routes/telemetry.ts | grep -c skipped` returns 0. A skipped stale row is therefore indistinguishable in the result from an unchanged one, which is a sharper cost than the page states. Corrected value: **"the only sign is the preview's stale warning before commit; at commit a skipped row is folded into the no-change count, and nothing in the response distinguishes it."** Source: `git show S:functions/src/routes/telemetry.ts | sed -n '318,350p;474,510p'`.

### R7: a registered device has its alert dismissed by hand
> "Creating the key auto-dismisses every matching alert server-side; a registered device has its alert dismissed by hand." (line 127)

**WRONG on the mechanism, right on the server.** The Register Device modal's `handleSubmit` (`src/pages/AlertsPage.tsx:305-318`) calls `api.devices.create({...})` and then, in the same click and without asking, `api.alerts.dismiss(alert.id, 'Device Registered')`, which hits the ordinary `PUT /api/alerts/:id/dismiss` route (`functions/src/routes/alerts.ts:41`, admin) and stamps `dismissedBy`, `dismissReason`, `dismissedAt` (`:68-71`). Nobody dismisses it by hand; the client does it for them. What the sentence gets right is the half that matters: the server does not close it (`devices.ts` has 0 hits on `collection('alerts')`), whereas `partnerKeys.ts:598-619` closes every open `new_partner_key` alert for a created key server-side. Corrected value: **"registering a device closes its alert from the client, through the ordinary dismiss route with the reason 'Device Registered'; the server itself closes only partner-key alerts."** Source: `git show S:src/pages/AlertsPage.tsx | sed -n '305,318p'`; `git grep -cI "collection('alerts')" S -- functions/src/routes/devices.ts`.

### R8: a decade at Disney
> "This is the partner-engineering work I spent a decade doing at Disney" (line 83)

**UNPROVABLE.** No artifact in the product repository or on the site attests tenure length; `README.md:3` and `CONTRIBUTING.md:5` describe an internal Disney Streaming tool and say nothing about its author's years. The prior ledger (§A23) reached the same verdict, and nothing since has added evidence. Defensible weaker form: "my partner-engineering work at Disney". Source: `git grep -nIiE 'decade|ten years|10 years' S -- README.md CONTRIBUTING.md docs specs` -> no hits (control: `git grep -cIiw 'questionnaire' S -- specs` finds the token across the spec tree).

### R9: questions from four teams
> "Inside Disney those questions arrive constantly, from partner engineering, certification, support, and platform teams, and every one of them is answerable." (line 79)

**UNPROVABLE as testimony.** The nearest artifact is new since the prior pin: the PRD mirror materialised on 2026-10-05 (`docs/projects/device-source-of-truth/prds/device-source-of-truth.md`, #210), whose user stories name a Partnerships Program TPM (`:109`), a P&D PM and a Certification Specialist (`:535`), a TAM (`:702`) and "a new user from the TAM, Certification, or PM team" (`:827`) as the intended users. That corroborates the audience in outline and records nobody asking anything. The page already holds the claim at audience level (line 91, "The product does not model those four teams as personas"), which is the defensible form; no change needed. Source: `git show S:docs/projects/device-source-of-truth/prds/device-source-of-truth.md | sed -n '109p;535p;702p;827p'`.

### R10: the fragmentation cost is testimony
> "What the fragmentation cost is my testimony rather than the repository's: support tickets that should have been lookups, launch timelines that slipped during reconciliation, and partner conversations held without a shared factual foundation." (line 81)

**UNPROVABLE, and the page labels it so.** No artifact records a ticket, a slipped timeline or a conversation; the sentence says exactly that before making the claim. No change. Source: R47's absence sweep covers the same paths and finds no outcome record.

### R11: the deployed instance runs them end to end
> "the workflows shipped and the deployed instance runs them end to end, but no artifact records a team adopting the tool" (line 137)

**UNPROVABLE from outside.** The demo serves its shell to anyone (`curl -sI https://device-source-of-truth.web.app` -> HTTP 200, 3,301 bytes, `<meta name="description">` naming Story Entertainment) and then stops at the domain allow-list (`functions/src/middleware/auth.ts:23 const ALLOWED_DOMAINS = ['@disney.com', '@disneystreaming.com', '@nathanpayne.com']`, and since #198 also a verified Google-provider token), so no workflow can be exercised from here. Circumstantial support, not proof: hosting reports `last-modified: Fri, 21 Aug 2026 02:46:46 GMT`, twelve minutes after the scrub commit `6e002a7` (2026-08-20 19:34:43 −0700), so the deployed bundle is the synthetic-data build, and the three captures on the page were committed on 2026-08-30 (site `99ab5fd`). Neither shows the workflows running today, and #198 and #211 (2026-09-30, 2026-10-05) may or may not have been deployed to the functions and rules behind that unchanged bundle. Defensible weaker form: "the workflows shipped and the demo deploys the same build". Source: `curl -sI https://device-source-of-truth.web.app`; `git log -1 --format='%h %ad' --date=iso 6e002a7`.

### R12: provenance, fork and reseed
> "built inside Disney, forked and reseeded with invented data to show publicly" (line 4); "What is on this page is a fork of that system, running on data I invented for it. Not a reimplementation written from memory, and not the production instance either: the same codebase, with the real records replaced." (line 83)

**SUPPORTED.** `README.md:3` opens "Internal Disney Streaming platform that consolidates NCP/ADK partner device data—hardware specifications, partner relationships, deployment counts, ADK versions, telemetry analytics, and DRM compliance—into a single, authoritative system of record", and `:5` states "**The deployed instance runs on synthetic data.**" The scrub commit `6e002a7` (2026-08-20, #165) replaced the deployed records in the same codebase, and the owner's statement of 2026-08-29, recorded at §A50, settled the fork framing ("I forked a Disney system and added synthetic data to it for a portfolio demo"). The page's "Disney" rather than the README's "Disney Streaming" is the deliberate choice of #941/#943 (site `07bbced`, `6ef9910`, 2026-09-03). The description's "hardware, DRM, codec support, and operational readiness" maps onto README:3 and the `mediaCodec` and `contentProtection` sections of `src/lib/questionnaireFields.ts` (17 DRM/codec field lines). Source: `git show S:README.md | sed -n '3p;5p'`; `git log -1 --format=%B 6e002a7`.

### R13: seoDescription and cardDescription
> "five ingestion feeds behind one admin-gated commit path, and AI extraction that proposes while a human signs—demonstrated on synthetic data" (line 5); "Five fragmented data feeds became one device registry, with AI drafting the heaviest intake and humans deciding what becomes authoritative" (line 6)

**SUPPORTED.** Both restate R21 (five feeds, admin-only commits), R25 (human sign-off enforced server-side) and R45 (synthetic data). The homepage card renders `cardDescription` from this frontmatter rather than a pinned copy (`tests/project-pages.test.js:66-74`, #1085), so the two surfaces cannot drift. Source: `sed -n '66,74p' tests/project-pages.test.js`.

### R14: order and accent
> "order: 3" (line 8); "accent: \"blue\"" (line 11)

**SUPPORTED.** `specs/project-pages.md:447` lists `| 3 | Device Source of Truth | blue |`, and `grep -n "^order:" src/content/projects/*.mdx` gives the seven pages orders 0, 1, 2, 3, 4, 5, 6 with no duplicate. Source: those two commands.

### R15: hero screenshot
> "screenshotSrc: \"/images/projects/device-source-of-truth-hero.png\"" (line 10)

**SUPPORTED.** `public/images/projects/device-source-of-truth-hero.png` is present (398,012 bytes) and was committed on 2026-08-20 (site `3b40551`); the three body captures were committed 2026-08-30 (`99ab5fd`). Source: `git log -1 --format='%h %ad' --date=short -- public/images/projects/device-source-of-truth-hero.png`.

### R16: liveUrl and View Demo
> "liveUrl: \"https://device-source-of-truth.web.app\"" (line 12); "The internal product is archived; what this link opens is the synthetic-data demonstration described below." (lines 13–15); "liveLabel: \"View Demo\"" (line 16)

**SUPPORTED.** The URL returns HTTP 200 and the SPA shell described in R11; the label is pinned by `tests/project-pages.test.js:139` (`'device-source-of-truth': 'View Demo'`) and prescribed by `specs/project-pages.md:74`, which states the rationale the frontmatter comment repeats. Source: `curl -sI -o /dev/null -w '%{http_code}' https://device-source-of-truth.web.app` -> `200`.

### R17: ARCHIVED
> "status: \"ARCHIVED\"" (line 18)

**SUPPORTED, more firmly than at the prior pin.** The last product feature remains `0821e80` (2026-03-06, §A16). The five commits since the prior pin are two dependency advisories (#199, #200), one auth and rules hardening pass (#198), one rules fix (#211) and one documentation mirror (#210); on 2026-09-05 the repository's own `da3d682` reads "chore: remove dependabot config—repo is dormant". GitHub Actions is disabled (`gh api repos/nathanjohnpayne/device-source-of-truth/actions/permissions` -> `{"enabled":false}` as of 2026-10-06T16:32:30Z, author token; the reviewer token gets 404 on that endpoint), and the last of 26,273 workflow runs is dated 2026-09-05T15:38:42Z. The hub dropped it as a consumer the same day (mergepath `098ca79f`, #1194). The API still reports `archived: false`, which is the GitHub setting; the page's `ARCHIVED` is the site's lifecycle label and the spec (`specs/project-pages.md:268`) assigns it to this page. Source: `git log --format='%h %ad %s' --date=short c9f66f0..S`; the API calls above.

### R18: metadata
> "format: \"Internal platform tool\"" (line 20); "focus: \"Partner platforms and device support\"" (line 21)

**SUPPORTED.** `README.md:3` ("Internal Disney Streaming platform … partner device data") and `CONTRIBUTING.md:5` ("internal Disney Streaming tool that manages real partner device data used across engineering teams"). Source: `git show S:CONTRIBUTING.md | sed -n '5p'`.

### R19: stack
> "stack: \"React · TypeScript · Vite · Tailwind · Zod · Firebase · Express · Vitest\"" (line 22)

**SUPPORTED, all eight at the pin.** Root `package.json`: `react ^19.2.8`, `typescript ~5.9.3`, `vite ^8.2.2`, `tailwindcss ^4.3.1`, `zod ^4.3.6`, `firebase ^12.18.0`, `vitest ^4.1.11`; `functions/package.json`: `express ^5.1.0`. Unchanged from the prior pin. Source: `git show S:package.json | grep -E '"(react|typescript|vite|tailwindcss|zod|firebase|vitest)"'`; `git show S:functions/package.json | grep express`.

### R20: 260 fields, 100–150 questions, sixteen sections, 30-pair batches
> "260 fields" / "from 100–150 answered questions" (lines 24–25); "commonly 100–150 answered questions across sixteen sections, mapped onto a 260-field device model. AI extraction reads the workbook in 30-pair batches" (line 35; repeated line 87)

**SUPPORTED.** `git show S:src/lib/questionnaireFields.ts | grep -cE "^      \{ key: '"` -> **260**; the `QUESTIONNAIRE_SECTIONS` array (`:29`) has **16** entries (`general hardware firmwareUpdates mediaCodec frameRates contentProtection native videoPlayback uhdHdr audioVideoOutput other appRuntime audioCapabilities accessibility platformIntegration performanceBenchmarks`, counted with `grep -cE "^    key: '"`); `specs/DST-047-questionnaire-intake-ai-extraction.md:290` reads "A real-world questionnaire commonly has 100–150 Q/A pairs"; `functions/src/services/questionnaireExtractor.ts:29 const CHUNK_SIZE = 30;`, applied at `:322-323`. Source: the commands above.

### R21: five feeds, one gate
> "5 feeds" / "every ingestion path previews before it commits, and every one of those commits is admin-only" (lines 26–27); "every path previews before it commits, and every commit requires the admin role" (line 89); mermaid title, description and nodes (lines 95–114)

**SUPPORTED.** The five routers are mounted at `functions/src/index.ts:64-81`, and each feed's commit is `requireRole('admin')`: AllModels `upload.ts:56 POST /migration`; Airtable `intake.ts:351 POST /import`; partner keys `partnerKeys.ts:925 POST /import/confirm`; telemetry `telemetry.ts:214 POST /upload`; questionnaire `questionnaireIntake.ts:1212 POST /:id/approve`. Three feeds preview server-side (`intake.ts:110`, `partnerKeys.ts:707`, `telemetry.ts:168`, all admin), the questionnaire stages into the review wizard (R28), and the AllModels path previews in the browser: `src/pages/MigrationPage.tsx:125 type Step = 'upload' | 'preview' | 'result'`, parsing at `:181` and `setStep('preview')` at `:225` before any call to `/upload/migration`. The one editor-reachable upload route, `upload.ts:369 POST /bulk-specs`, returns 501 and writes nothing, so no non-admin commit path exists. The mermaid caption's qualifier ("In the interface … and on the questionnaire feed the server enforces that") is exactly R40. Source: `git grep -nIE "^router\.(post|put)" S -- functions/src/routes/{upload,intake,partnerKeys,telemetry,questionnaireIntake}.ts`; `git grep -nE "preview" S -- src/pages/MigrationPage.tsx`.

### R22: three roles
> "3 roles" / "viewer, editor, admin" (lines 28–29); "It enforces three roles" (line 91)

**SUPPORTED.** `functions/src/types/index.ts:88` and `src/lib/types.ts:82` both declare `export type UserRole = 'viewer' | 'editor' | 'admin';`, and `functions/src/routes/users.ts:8` pins `VALID_ROLES` to the same three. Source: `git grep -nI "export type UserRole" S -- functions/src src`.

### R23: private repository, restricted login, no repository link
> "the repository stays private and the demo stops at a restricted login—screenshots carry the evidence" (line 31); "The repository is private and stays private … So the page offers no repository link rather than a 404 only its owner can pass, and its one live button stops at a domain-restricted login." (line 153)

**SUPPORTED.** `gh api repos/nathanjohnpayne/device-source-of-truth --jq '{visibility, private, archived}'` -> `{"archived":false,"private":true,"visibility":"private"}` at 2026-10-06T16:30:07Z; an anonymous `curl` of the repository URL returns 404. The login wall is `functions/src/middleware/auth.ts:23` with the matching client guard at `src/hooks/useAuth.tsx:35`, tightened by #198 to require `email_verified` and a Google-provider token. The frontmatter carries no `githubUrl`, and `tests/project-pages.test.js:122` (`noGithubUrlSlugs = ['device-source-of-truth']`) asserts it. Source: the API call and `curl -s -o /dev/null -w '%{http_code}' https://github.com/nathanjohnpayne/device-source-of-truth` -> `404`.

### R24: confidence per field, stored once, one consumer
> "returns a proposed value and a self-reported confidence for every field" (line 35); "The number is stored once and rendered as a badge for the reviewer; review is unconditional" (line 36); "the model's confidence has exactly one consumer—the review screen" (line 40); "the model reports a confidence per extracted field and the number decides nothing: it colors the review screen, and review is unconditional" (line 135)

**SUPPORTED, with one precision.** The extractor's response schema asks for "confidence: float 0.0-1.0" per pair (`functions/src/services/questionnaireExtractor.ts:313`) and the single write is `aiConfidence: result.confidence` (`:712`). Every other occurrence of `aiConfidence` is presentational: `src/pages/QuestionnaireReviewPage.tsx:728` (`<ConfidenceBadge>`), `:1400-1402` (colour breaks at 0.85 and 0.75) and `:1447` (percentage); the contracts type at `packages/contracts/src/index.ts:244`; and the initial staging at `functions/src/routes/questionnaireIntake.ts:282`, which seeds every field with `aiConfidence: null` before extraction fills the ones it finds. That last line is the precision: the confidence is per *extracted* field, and unextracted fields hold `null`, which the approve guards never read. Source: `git grep -nI 'aiConfidence' S -- functions/src src packages`.

### R25: the four approve-route refusals
> "an admin-only approve route that refuses to commit until every intake partner is reviewed, a partner is assigned, every device is approved or rejected, and every conflict with existing registry data is resolved" (line 36); "the approve route refuses server-side while anything is unreviewed" (line 40); "the server itself refuses, holding the commit until every staged record has been reviewed" (line 93); "the approve route refuses while any of it is unresolved" (line 141)

**SUPPORTED.** `POST /:id/approve` is `requireRole('admin')` (`functions/src/routes/questionnaireIntake.ts:1212`) and refuses, in order, with `${pendingPartners.length} intake partner(s) still pending review` (`:1233`, 409), `Partner must be assigned before approval` (`:1241`, 422), `All devices must be approved or rejected before sign-off` (`:1252`, 409) and `Device "…" has N unresolved conflicts` (`:1269`, 409). Line numbers are fifteen higher than at the prior pin because of #198; the text is unchanged. Every mutation of staged data between extraction and sign-off is also admin (`:871`, `:900`, `:936`, `:968`, `:998`, `:1120`). Source: `git show S:functions/src/routes/questionnaireIntake.ts | grep -nE "router.post\('/:id/approve'|still pending review|Partner must be assigned|All devices must be approved|unresolved conflict"`.

### R26: the 0.90 auto-resolve on the CSV paths
> "on the CSV path the same codebase does let confidence decide, auto-resolving a name match at 0.90 without asking anyone—I set that threshold, then gave the number no power at all here. That path still lands in an admin-confirmed preview" (line 37); "a name the model resolves at 0.90 confidence stops asking its clarification question—though it still rides the preview-then-commit rail" (line 135)

**SUPPORTED.** `functions/src/services/aiDisambiguate.ts:25 const AUTO_RESOLVE_THRESHOLD = 0.90;` and `:226 return confidence >= AUTO_RESOLVE_THRESHOLD ? 'ai_auto' : 'ai_suggested';`, mirrored in `aiImportFramework.ts:25` and `:455`; the disambiguation routes are admin (`disambiguate.ts:26`, `:135`) and the import commits they feed remain the admin routes of R21. The threshold entered with `a0891c1` (2026-03-03, "Add AI-assisted import disambiguation (DST-039, pre-production)") and `4e3627c` (same day, DST-042), both under the owner's identity; "I set that threshold" is supported to the extent a commit byline supports it, with §A46's caveat that bylines do not attribute diffs. Source: `git grep -nI 'AUTO_RESOLVE_THRESHOLD' S -- functions/src`; `git log --format='%h %ad %an | %s' --date=short -S'AUTO_RESOLVE_THRESHOLD = 0.90' S -- functions/src`.

### R27: the spec quotation
> "The spec says it without hedging: no questionnaire data enters the database without my explicit review." (line 38)

**SUPPORTED, verbatim.** `specs/DST-048-questionnaire-admin-review-sign-off.md:22` ends "—so that no questionnaire data enters the database without my explicit review and no device is imported without being matched to the correct partner record." (The prior ledger cited `:24`; at this pin the sentence is on line 22 of an unchanged file, a counting difference, not a content one.) Source: `git show S:specs/DST-048-questionnaire-admin-review-sign-off.md | grep -n "explicit review"`.

### R28: the four-step wizard
> "Every questionnaire waits on an admin walking a four-step wizard" (line 39); "A four-step wizard—Assign Partner, Review Devices, Resolve Conflicts, Sign Off" (line 141)

**SUPPORTED.** `src/pages/QuestionnaireReviewPage.tsx:2081-2084` declares the four steps with labels `'Assign Partner'`, `'Review Devices'`, `'Resolve Conflicts'`, `'Sign Off'`, with the section markers at `:72`, `:1017`, `:1288`, `:1499`. Source: `git grep -nI "Assign Partner\|Review Devices\|Resolve Conflicts\|Sign Off" S -- src/pages/QuestionnaireReviewPage.tsx`.

### R29: telemetry snapshots, stale rows, per-row override, returned tally
> "Telemetry arrives as CSV snapshots" (line 44); "The preview marks any row whose snapshot date predates the stored record and warns that committing it would overwrite newer data with older. At commit those rows are skipped unless the admin overrides them—per row, by index—and the count of stale rows overwritten is tallied and returned in the result rather than buried." (line 45)

**SUPPORTED.** The upload body is `csvData` with a `snapshotDate` (`functions/src/routes/telemetry.ts:171`, `:217`), parsed by `Papa.parse` (`:178`). The preview sets `upsertStatus = 'stale'` and pushes "Existing record has a newer snapshot (…). Uploading this row would overwrite newer data with older data." (`:134-135`). The commit reads `staleOverrides` from the body into a `Set<number>` of row indexes (`:225`), skips a stale row unless `staleOverrideSet.has(i + 1)` (`:322-331`), increments `staleOverwrittenCount` when the override is present (`:336-338`), logs it (`:380`) and returns it (`:482`, `:492`, `:507`). Source: `git show S:functions/src/routes/telemetry.ts | grep -nE "upsertStatus = 'stale'|overwrite newer data|staleOverride|staleOverwrittenCount"`.

### R30: counted as no-change and moves on
> "A stale row is not queued for anyone—the commit counts it as no-change and moves on—so an unattended import still finishes, quietly minus the rows it declined." (line 48)

**SUPPORTED.** `telemetry.ts:322-331`: `noChangeCount++; successCount++; continue;` for a stale row without an override, and the loop proceeds to the next row. The sentence that follows it on the page is R6. Source: `git show S:functions/src/routes/telemetry.ts | sed -n '318,332p'`.

### R31: freshness thresholds, display-only
> "fresh under 48 hours, aging under seven days, stale beyond. Two thresholds hardcoded in one client function, computed in the browser at render time from the stored telemetry timestamp, persisted nowhere, consulted by nothing else." (line 53); "No alert fires on staleness, no export excludes it, no workflow blocks on it" (line 56)

**SUPPORTED.** `src/lib/format.ts:40-49`: `getFreshnessState` takes `lastTelemetryAt`, computes `Date.now() - new Date(lastTelemetryAt).getTime()`, and returns `fresh` under `48 * 60 * 60 * 1000`, `aging` under `7 * 24 * 60 * 60 * 1000`, `stale` otherwise; the two literals are inside the function and it takes no threshold argument. Its only callers are `FreshnessBadge.tsx:54`, `FreshnessMicroPanel.tsx:48` and an `aria-label` in `PartnerDetailPage.tsx:44`; `git grep -nI 'getFreshnessState' S -- functions` returns nothing, and no alert type keys off age (R41). The 28-day coverage window the badge labels is `ACTIVE_DEVICES_WINDOW_DAYS = 28` (`packages/contracts/src/index.ts:133`), a different number that never reaches the state function. Source: `git show S:src/lib/format.ts | sed -n '38,50p'`; `git grep -nI 'getFreshnessState' S -- src functions`.

### R32: each feed's own idea of a partner
> "the telemetry export, the key mapping, and the questionnaire header each have their own idea of what a partner is called" (line 60)

**SUPPORTED, with a precision.** A telemetry row names its partner by key (`telemetry.ts:62`, the `partner` column, e.g. `northwind_ca` in the synthetic data), the key-mapping import carries Datadog "friendly names" (`partnerKeys.ts:976`), and the questionnaire carries a `rawHeaderLabel` (`questionnaireIntake.ts:1269`). Three identifiers, three feeds. The precision is that the telemetry one is a key, not a name, which is why it bypasses the alias chain (R3). Source: the three line citations.

### R33: the resolution chain and auto-creation
> "Resolution runs a chain—exact match, then registered alias, then fuzzy similarity at 0.90" (line 61); "an unmatched name on CSV import creates a partner rather than failing the file" (line 61)

**SUPPORTED, with a precision on which import.** `functions/src/services/partnerResolver.ts:113` documents "DST-046 resolution chain: exact match → alias lookup → fuzzy match (Jaro-Winkler ≥ 0.90)" and implements it (`:140` exact, `:149` alias, `:163`/`:170` the 0.90 bound). Auto-creation lives in the partner-key import alone: `partnerKeys.ts:976 // Auto-create partners for unmatched friendly names.`, audited at `:1018` ("Auto-created from partner key import") and logged at `:1023`; `git grep -nIiE "auto-?creat" S -- functions/src/routes` finds no other route. The AllModels CSV goes through the same resolver (`upload.ts:93` loads the context, `:145` calls `resolvePartnerName`) but does not create partners, so "CSV import" should be read as the partner-key mapping CSV, which is the feed the paragraph is about. Source: the greps above.

### R34: related links, and the Mergepath question
> "Blog: Six PRs, One Bug—What AI Agents Actually Get Wrong" (lines 66–67); "Project: Mergepath" (lines 68–69); "Project: Swipe Watch" (lines 70–71)

**SUPPORTED.** All three targets exist in the collection and return HTTP 200 live (`/blog/six-prs-one-bug-agent-failure-modes/`, `/projects/mergepath/`, `/projects/swipe-watch/`). On the brief's specific question: the page makes **no** claim that this repository runs the fleet's review path, is governed by Mergepath, or is a live consumer. `grep -niE "mergepath|fleet|coderabbit|codex|review path|consumer|governed"` on the page matches only the link label and two unrelated uses of "consumer" (R3, R24). The relationship the link alludes to ended on 2026-09-05: mergepath `098ca79f` (#1194) removed the repository from `.mergepath-sync.yml`, the sweep roster and the propagation order because "device-source-of-truth went dormant on 2026-09-05: GitHub Actions was disabled on the repo and its dependabot config removed", and the repository's last hub sync is `1f2bfaf` (2026-09-04). The Mergepath page records the same fact (`src/content/projects/mergepath.mdx:206`, "the seventh left the fleet in September 2026 when its repository went dormant"), so there is no cross-page inconsistency; whether a related link to Mergepath still earns its place on a page about a former consumer is an editorial call, not a correctness one. Source: `git log -1 --format=%B 098ca79f` in `~/GitHub/mergepath`; `curl -s -o /dev/null -w '%{http_code}'` on the three routes.

### R35: the three example questions
> "Can this device support Dolby Vision? Which partners are still running an ADK build that just went end-of-life? When a partner replaces its whole OS stack—Amazon moving Fire TV to Vega OS—which devices are affected, and what is their certification status? … every one of them is answerable." (line 79)

**SUPPORTED, with a precision on the second.** Dolby Vision is three questionnaire fields (`src/lib/questionnaireFields.ts:152-153` `dolbyVisionSupported`/`dolbyVisionVersion`, `:238` `dolbyVisionProfiles`). Which partners run which build is the version registry plus telemetry's `coreVersion`, surfaced as "SEK Version Adoption" (`src/pages/DashboardPage.tsx:268`) and the unmapped-versions panel (`versionMappings.ts:192`, §A19). OS and certification are device fields (`packages/contracts/src/index.ts:388-390` `operatingSystem`, `operatingSystemOther`, `osVersion`; `certificationStatus`). The precision: nothing in the registry models end-of-life, `git grep -nIiE "end.of.life|\bEOL\b|sunset|unsupported|outdated" S -- specs/DST-044-version-mapping-registry.md specs/DST-044-amendment-version-registry.md specs/DST-045-live-adk-version-validation.md functions/src/routes/versionMappings.ts` returns nothing, and the only status vocabulary is `'Active' | 'Deprecated'` (`contracts:711`). The system answers "who runs version X"; that X went end-of-life is the asker's knowledge, which is how the sentence reads. Source: the greps above.

### R36: Amazon moving Fire TV to Vega OS
> "Amazon moving Fire TV to Vega OS" (line 79)

**SUPPORTED by public record, outside the audit's listed sources.** No repository artifact names Vega (`git grep -nIiE "vega" S -- src functions specs docs README.md scripts` -> no hits; the PRD mirror names Fire TV only as a Phase 2 platform at `:76`, `:93`, `:160`). A web search on 2026-10-06 confirms the public fact: Amazon's Linux-based Vega OS ships on the Fire TV Stick 4K Select and Fire TV Stick HD, and Amazon has said it will not launch new Fire TV Stick models on the Android-based Fire OS; Vega apps are React Native rather than Android, so streaming services must ship new apps for it. Sources: [Tom's Guide](https://tomsguide.com/tech/amazons-reportedly-ditching-android-os-on-its-fire-tvs-later-this-year), [StreamTV Insider](https://www.streamtvinsider.com/technology/amazon-quietly-introduces-new-fire-os-platform-vega), [Lowpass](https://lowpass.beehiiv.com/p/amazon-vega-os-fire-tv-android). The page's example is therefore a real transition, and the question it poses ("which devices are affected") is the OS-field lookup of R35.

### R37: where the answers lived
> "They lived in Airtable, in Datadog, in partner-submitted Excel questionnaires, and in spreadsheets maintained by different teams on different cadences." (line 81)

**SUPPORTED, near-verbatim.** `README.md:3` closes "Replaces data previously scattered across Datadog dashboards, Airtable bases, Google Drive questionnaires, and spreadsheets." Source: `git show S:README.md | sed -n '3p'`.

### R38: the five feeds named
> "Five feeds land in the registry: an AllModels CSV of the device inventory, Airtable intake requests, partner-key mappings exported from Datadog, telemetry snapshots from Datadog, and the partner's Excel questionnaire" (line 87); mermaid nodes "Excel questionnaire", "AllModels CSV", "Airtable intake", "Partner keys", "Telemetry" (lines 97–102)

**SUPPORTED.** AllModels: `upload.ts:219 fileName: req.body.fileName ?? 'AllModels.csv'` and `docs/ARCHITECTURE.md:352` "Admin uploads AllModels CSV". Airtable: `specs/DST-037-airtable-intake-import.md` and `intake.ts`. Partner keys from Datadog: `specs/DST-038-partner-key-registry.md:5` is titled "Partner Key Registry: Datadog Manifest Key Mapping". Telemetry from Datadog: `FreshnessBadge.tsx:80` labels it "Source: Datadog telemetry". Questionnaire: the DST-047 arc and `questionnaireIntake.ts`. Source: the citations.

### R39: fire-and-forget to task queue
> "Extraction shipped fire-and-forget once and was rebuilt as an idempotent per-device task queue with retry and stale-job recovery." (line 87)

**SUPPORTED, and the page's wording now matches the mechanism.** `7f61480` (2026-03-04) is titled "replace fire-and-forget extraction with Cloud Tasks queue"; the dispatcher's `retryConfig` is `maxAttempts: 3, minBackoffSeconds: 60, maxBackoffSeconds: 300` (`functions/src/index.ts:123-126`); a device can be retried individually (`questionnaireIntake.ts:697`); and stale-job recovery is `staleThresholdMs = 15 * 60 * 1000` (`:483`) logged as `extraction.stale_recovery` (`:501`). The prior ledger's §A10 correction (stale-job, not stale-clock) is applied on the page. Source: `git log --format='%h %ad %s' --date=short --grep='fire-and-forget' S`; `git grep -nI "stale_recovery\|staleThresholdMs" S -- functions/src`.

### R40: the direct-commit exception
> "on four feeds the preview is a workflow the interface imposes, and an admin calling the commit route directly is not made to look at anything first. On questionnaire intake the server itself refuses, holding the commit until every staged record has been reviewed." (line 93); mermaid description "In the interface no imported record becomes authoritative without a human having reviewed it, and on the questionnaire feed the server enforces that." (line 95)

**SUPPORTED.** The four commits read their rows from the request body and consult no stored preview: `intake.ts:354 const { rows, fileName } = req.body`, `telemetry.ts:217 const { csvData, snapshotDate, fileName, staleOverrides, importTimeRange } = req.body`, `upload.ts:59 const { csvData } = req.body`, `partnerKeys.ts:928 const { rows, fileName } = req.body`. The questionnaire approve route reads `questionnaireStagedDevices`/`questionnaireStagedFields` and refuses on the four conditions of R25. Source: `git show S:functions/src/routes/<file> | grep -n "req.body"` for each of the four.

### R41: exceptions as work items
> "A telemetry row naming a device the registry does not hold, or a partner key it does not know, raises an alert with Register Device or Create Key attached. Creating the key auto-dismisses every matching alert server-side … The other four feeds raise no alerts—they surface exceptions inline, in their own previews." (line 127)

**SUPPORTED, except the half that is R7.** The only writers of alert documents in `functions/src` are `telemetry.ts:415` (`type: 'new_partner_key'`) and `:447` (`type: 'unregistered_device'`); the `AlertType` union also declares `inactive_key` (`functions/src/types/index.ts:92`), which nothing writes, and the page's "the two types the system actually emits" (line 129) is the right count. `src/pages/AlertsPage.tsx` renders the Create Key modal (`:56`) and the Register Device modal (`:206`). `partnerKeys.ts:598-619` dismisses every `open` `new_partner_key` alert with the created key, stamping `dismissReason: 'Key Created'`. No other route writes to `collection('alerts')` except the dismiss route itself, so the AllModels, Airtable, partner-key and questionnaire feeds raise none; their previews carry the exceptions (R29, R25). Source: `git grep -nI "type: 'new_partner_key'\|type: 'unregistered_device'\|type: 'inactive_key'" S -- functions src scripts`; `git grep -nI "collection('alerts')" S -- functions/src`.

### R42: the alerts caption
> "The exception queue on the deployed demo: fifteen alerts, every one of the two types the system actually emits—Unregistered Device and New Partner Key, both raised by telemetry uploads. Each alert carries its own remedy—Register Device, Create Key, or Dismiss—and a dismissed row keeps its reason and the actor who dismissed it, so a closed exception still explains itself." (line 129)

**SUPPORTED.** `scripts/synthetic/seed.mjs` writes ten `unregistered_device` alerts (`UNREGISTERED`, 10 entries), three `new_partner_key` alerts and two dismissed `unregistered_device` alerts: fifteen. The capture (`public/images/projects/device-source-of-truth-alerts.png`) shows "Alerts · 15 alerts", "Open 13", fifteen rows of exactly those two types, row controls reading Register / Create Key / Dismiss, and two dismissed rows carrying "Test Device" and "Internal / Deprecated" with "by avery.shaw@example-demo.test", which is the synthetic demo user. The server stamps `dismissedBy`, `dismissReason`, `dismissedAt` (`alerts.ts:68-71`). The row control is labelled "Register" and the modal "Register Device"; the caption uses the modal's name, which is fine. Source: `git show S:scripts/synthetic/seed.mjs | sed -n '405,480p'`; the image.

### R43: the sign-off caption
> "A four-step wizard—Assign Partner, Review Devices, Resolve Conflicts, Sign Off—holds three intake partners at pending review. Each extracted device carries its own Approve and Reject, a 44-fields-extracted count, and the registry's verdict on whether it matches an existing record. The server enforces what the wizard shows: the approve route refuses while any of it is unresolved." (line 141)

**SUPPORTED.** The capture shows the four-step header with step 2 active, the banner "3 intake partners pending review (0 confirmed · 0 rejected · 3 pending)" naming Brightloom Telecom, Fernvale Fibre and Calderwood Networks (the seeder's multi-partner job, `seed.mjs:600-601 isMultiPartner: true, intakePartners: ['brightloom-telecom', 'fernvale-fibre', 'calderwood-networks']`), a device row with Reject and Approve buttons, "44 fields extracted" (`QuestionnaireReviewPage.tsx:837 {fieldCount} fields extracted`) and "No match—New device". The server half is R25. Source: the image; `git show S:scripts/synthetic/seed.mjs | sed -n '594,616p'`.

### R44: the freshness caption
> "the badge reads \"Updated 9 days ago\" against a 28-day telemetry window—past the seven-day threshold, so the record presents as stale rather than being hidden or blocked. Nothing downstream acts on that badge." (line 145)

**SUPPORTED.** The capture shows "Updated 9 days ago · 28-day window" beside the active-device count, exactly the `Updated ${relativeTime} · ${windowLabel}` template (`FreshnessBadge.tsx:96`, with `format.ts:67` rendering `${days} days ago` and the window from `ACTIVE_DEVICES_WINDOW_DAYS = 28`); nine days exceeds the seven-day bound in `format.ts:47`, so the state is `stale`, and R31 establishes that nothing consumes it. Two notes. The value is capture-time: the seeder stamps fixed timestamps, so the live badge reads older every day, which does not affect a caption describing a capture. And the caption's last sentence is missing a full stop: "which is the whole of the decision The reader decides" (line 145, also live), a copy defect rather than a claim. Source: the image; `git show S:src/components/shared/FreshnessBadge.tsx | sed -n '96p'`.

### R45: nothing real is on display
> "The deployed instance has run entirely on synthetic seed data since a scrub replaced the real records in August 2026—invented operators under an invented streaming group, every seeded document carrying a synthetic marker, and a dataset header that opens \"Every name in this file is invented.\" Where production said ADK, the demo says SEK, an invented kit name: a display-layer rename, not a data change." (line 151)

**SUPPORTED.** The scrub is `6e002a7` (2026-08-20 19:34:43 −0700, "feat(demo): replace real partner data with a synthetic dataset (#165)"), and hosting's `last-modified` of 2026-08-21T02:46:46Z sits twelve minutes after it. `scripts/synthetic/dataset.mjs:4` opens "Every name in this file is invented. There are no real partners, operators, OEMs, chipsets, or device models here"; `:32` exports fourteen `PARTNERS` (Northwind Cable, Brightloom Telecom, … Meadowlark Telecom), and the group is Story Entertainment (`src/components/layout/AppShell.tsx:226`; `index.html:8`). `seed.mjs:1000` writes every document as `{ ...data, _synthetic: true, _seededAt: SEEDED_AT }`, which `DEPLOYMENT.md:780` records. `dataset.mjs:54-57` states the rename in the code's own words ("SEK ("Story Entertainment Kit") is the fictional streaming group's device integration kit. The `liveAdkVersion` schema field keeps its name … only the values users actually see change"), and the labels follow (`DashboardPage.tsx:268` "SEK Version Adoption", `VersionInput.tsx:14`, `WelcomeModal.tsx:16`, `src/lib/types.ts:188`). Source: `git show S:scripts/synthetic/dataset.mjs | sed -n '1,8p;52,60p'`; `awk` count of `slug:` under `PARTNERS` -> 14.

### R46: the scrub's boundary
> "a scrub of deployed data does not reach specs and history, and those still carry real partner identities" (line 153)

**SUPPORTED.** The scrub commit's body scopes itself to the deployed data (11,098 documents and 12 Storage objects wiped), the shipped source and `mappings/`; `specs/` is not in that list. The spec tree at this pin is byte-identical to the prior ledger's pin (`git diff --stat c9f66f0..S -- specs` is empty, and `git log c9f66f0..S -- specs` is empty), so §A26's finding, a seven-row operator table at `specs/DST-038-partner-key-registry.md:150-157` and real codenames and filenames in DST-046/047, holds by identity of the objects; the names are not reproduced here because this ledger lives in a public repository. Source: `git log -1 --format=%B 6e002a7 | sed -n '4,10p'`; the two diff commands.

### R47: no artifact records adoption
> "no artifact records a team adopting the tool" (line 137); "Each record is therefore evaluated against what the product demonstrably does, not against a usage outcome" (line 137)

**SUPPORTED, as an absence with a control.** `git grep -nIiE 'time saved|hours saved|adoption|users onboarded|went live' S -- README.md DEPLOYMENT.md .ai_context.md docs specs plans bugs` hits only `docs/agents/decision-records.md:145-152` (a Mergepath mirror about decision records, unrelated) and the PRD mirror's "version adoption" charts (`:541`, `:727`, a feature, not an outcome). The PRD mirror is new since the prior pin and is a plan, not a usage record. Control: `git grep -cIiw 'synthetic' S -- README.md DEPLOYMENT.md` -> `3` and `10`, so the matcher reads those paths. Every decision record on the page carries `status: "pending"` (lines 41, 49, 57, 64), which is what this row requires. Source: the two commands.

## Observations outside the claim inventory

- Line 145 is missing a full stop between "decision" and "The reader", on the page and live. Not a claim; worth fixing in the same pull request.
- The prior ledger's §A29 and §A32 state the role-guard tally as fifty total, forty admin. The same matcher at the same pin returns sixty total, fifty admin (R1). Any surface that copied the 40/50 figure from §A29 should be swept; on this site, only this page carries it.
- The DSoT checkout still mirrors the hub's kit (`REVIEW_POLICY.md`, `AGENTS.md`, `.github/workflows/`, last synced `1f2bfaf` 2026-09-04) and holds an untracked `.mergepath/` directory dated 2026-10-05, but with Actions disabled none of it runs. The page asserts nothing about it, so nothing here is STALE; R34 records the dates in case a future edit adds a governance sentence.

## Fixes applied

Applied 2026-10-06 on `claude/correctness-pass-2026-10-06`, to the page source only. No test assertion pinned any changed phrase: a sweep of `src tests specs docs scripts` for the nine phrases returned nothing, with the control `View Demo` found in `tests/live-link-label.test.js`, so no test changed. `vale --config .vale.ini --minAlertLevel=error` on the page: clean. Two phrases were trimmed to offset the narrowing ("naive", line 63; ", which is" to a colon, line 91); the net change is seven lines, +7/−7.

- R1: "forty of the API's fifty role guards are admin-only" (constraint label, line 29; prose, line 91) -> "fifty of the API's sixty role guards are admin-only" at both.
- R2: "with each hit tagged direct or contextual" (line 61) -> "with alias hits tagged direct or contextual".
- R3: "Every consumer of partner data goes through the resolver" (line 63) -> "Every feed that arrives carrying a partner name goes through the resolver"; "a naive flat partner list" -> "a flat partner list" in the same sentence, for length.
- R4: "a viewer reads everything" (line 91) -> "a viewer reads the registry".
- R5: "an editor authors records and stages imports" (line 91) -> "an editor authors records and stages the questionnaire import"; "admin-only, which is the codebase's clearest statement" -> "admin-only: the codebase's clearest statement", for length.
- R6: "the commit counts it as no-change and moves on … the only sign anything was skipped is a count in the response nobody is required to read" (line 48) -> "the commit folds it into the no-change count and moves on … and the response cannot tell those from rows that simply matched … and the only warning comes from the preview, before commit".
- R7: "a registered device has its alert dismissed by hand" (line 127) -> "registering a device closes its alert from the client, not the server".
- R44 copy defect: "the whole of the decision The reader decides" (line 145) -> "the whole of the decision. The reader decides".
- R8 ("a decade doing at Disney", line 83): left as is. The coordinator scoped this page's fixes to R1–R7 and the full stop; it is a first-person biographical figure, and §A28/§A50 require any provenance or tenure wording to move on the page, the résumé mirror, the canonical résumé and its variants in one change, which a single-page fix cannot do.
- R9 (questions from four teams, line 79): left as is. Already an audience claim; line 91 states the teams are not modelled as personas.
- R10 (fragmentation cost, line 81): left as is. The page labels it the author's testimony.
- R11 ("the deployed instance runs them end to end", line 137): left as is. UNPROVABLE only because the demo is login-walled; it asserts no number or quantifier, the deployed bundle is the synthetic build, and the coordinator's scope excludes it.
- R34 (`related` labels, lines 65–71): left as is. The coordinator is changing the Six PRs label on all four project pages at once.
- R24, R32, R33, R35 precisions: left as is. SUPPORTED rows; the precisions are ledger notes, not page defects.
