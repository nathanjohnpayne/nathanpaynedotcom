# Facts ledger, 2026-10-06 correctness pass: `five-across`

Page source: `src/content/projects/five-across.mdx` (identical on `main` at `72d0949` and in this worktree; the live surface carries every distinctive string of this revision, checked by `curl https://nathanpayne.com/projects/five-across/`). Surface: `https://nathanpayne.com/projects/five-across/`. Retrieval timestamp for every API figure: 2026-10-06. Prior ledger: `plans/759/project-pages-ledger.md` §B (rows B1–B36, BM1–BM2), which audited the pre-#834 version of this page; the rows it corrected (B4, B6, B13) are already fixed on the current page and are not re-opened here.

Evidence sources used: the `fiveacross` checkout at `/Users/nathanpayne/GitHub/fiveacross` (`main` = `origin/main` = `31992892`, 2026-10-05); `gh api` on `nathanjohnpayne/fiveacross` and `nathanjohnpayne/nathanpaynedotcom`; PostHog project 503790 (`FiveAcross.app`) through the PostHog MCP, every figure re-run on the Event's own ten days in `Europe/Rome`, which is UTC `2026-07-14 22:00` to `2026-07-24 22:00`, with `2026-07-23 21:00 UTC` as the freeze instant (the one PR #820 recorded; R13 shows the live `frozenAt` is `2026-07-24 06:00 UTC`, so the 772/41 split below is a cut at 21:00 UTC, and the same query cut at the live instant gives 783/30, R33); Firestore for the `fiveacross` project (`events/bodega-bay-2026`), read with the machine's stored `firebase-deployer@fiveacross` credential; the live site and the live `fiveacross.app` client bundle. The production `gaycruisebingo` Firestore (`events/med-2026`) returned `PERMISSION_DENIED` on the first read, made with that `fiveacross` credential; it was re-read the same day with its own deployer account (access correction below), and every figure that rests on it is re-derived in place rather than attributed to the reads PR #820 (2026-08-26) and the #1057 audit (2026-09-24) recorded.

> **Access correction, 2026-10-06.** The `gaycruisebingo` project is readable from this machine: `gcloud auth list` holds `firebase-deployer@gaycruisebingo.iam.gserviceaccount.com`, and `gcloud auth print-access-token --account=<that account>` yields a token the Firestore REST API accepts for `events/med-2026`, its `players` subcollection, the board documents and the `days/{n}/meta/{n}` documents (the `days/{n}` parents are phantom: a listing shows them as missing and a direct read 404s, but their subcollections read by path). The audit's first read used the `fiveacross` deployer against this project and returned `PERMISSION_DENIED`; the rows that read left UNPROVABLE (R9 to R16) were re-read the same day and carry their re-derived verdicts in place below. The failed first attempt is recorded once, in the Method notes.

## Summary

| # | Claim (verbatim, abbreviated) | Location | Verdict | Corrected value or weaker form | Source |
|---|---|---|---|---|---|
| R1 | alt: "showing a Welcome Aboard bingo grid for a Trieste sailing" | line 13 | WRONG | The pictured card is a Day 1 warm-up in the Neon Playground theme, rendered by the marketing harness over a demo event; "Welcome Aboard" is the seed's theme id for embark day, not what the image shows | image inspection; nathanpaynedotcom PR #785 body; `src/data/seed.ts:181`; `src/theme/themes.ts:55,114` |
| R2 | "Every new event needs its own Firebase project, provisioned by hand" | line 86 | WRONG | Every event for an unrelated group needs its own project; events within one community can share one (the multi-event schema is per-project) | `docs/adr/0008-five-across-second-firebase-project.md:12`; `specs/x-multi-event-schema.md`; `specs/w1-event-seed.md:8` |
| R3 | "no deploy record survives for that window" | line 144 | WRONG | No deploy log is in the repository; its own incident note records one mid-sailing rules deploy and its two-day stale-shell fallout (#387); and Firebase Hosting's release history, read 2026-10-06 with the project's deployer account, lists 41 releases between the Rome midnights that bound the sailing | `specs/w1-board-mark-win.md:37`; `specs/w2-ga4-events.md:19`; `gh issue view 387` (opened 2026-07-17T04:47Z); Hosting releases API |
| R4 | quotation ending "on the same engine as Vacay." | line 150 | WRONG | The source sentence continues: "as Vacay, and under the Phase 7 native plan the store binary a GCB player installs is literally named Five Across." End the quote with an ellipsis or carry it to the sentence's end | `src/edition-brands.ts:37-43`; clause present since `aab8ce9f` 2026-08-10, before the page quoted it |
| R5 | "What resolves it: … the IAM provisioning the handoff needs" | line 87 | STALE | Provisioning completed 2026-09-10 (#547); what remained after that was the first named Five Across deploy shipping the handoff-mode client | `docs/adr/0010-centralised-auth-origin-with-handoff.md:14`; `specs/auth-handoff.md:202` |
| R6 | "a centralized auth origin with a single-use handoff, implemented and gated on provisioning" | line 98 | STALE | Implemented, provisioned 2026-09-10, and shipped in the live client; the gate is no longer provisioning | as R5, plus R7 |
| R7 | "the auth handoff is implemented but not yet reachable" / "implemented but not yet reachable" | lines 87, 152 | STALE | The handoff-mode client is live: the `fiveacross` build target forces `VITE_AUTH_MODE=handoff`, and the live `fiveacross.app` bundle is built from a tree at or after 2026-10-05 and carries `auth.fiveacross.app` and `mintAuthHandoff`. Weaker form: "implemented and shipped; on registered hosts sign-in still resolves direct, so no sign-in has been demonstrated through the handoff" | `scripts/build-target.mjs:49-50`; live `/assets/main-o2ThNBCZ.js`; `src/auth/authMode.ts:35,151-156`; ADR 0010:8,14 (last edited 2026-09-09, now lagging) |
| R8 | "cutover would be one uncommented block" | line 84 | STALE | Since 2026-09-07 (#1120) the config carries two commented `[[routes]]` blocks, one per zone, and a test asserts both stay commented | `worker/wrangler.toml:110-118`; `worker/src/routerBinding.test.ts:263-268` |
| R9 | "845 squares", "61 bingos, with zero blackouts" | lines 41, 42, 51, 95, 134, 156 | SUPPORTED | Re-derived 2026-10-06 from the production record: the sixteen player rows under `events/med-2026/players` sum to `squaresMarked` 845 and `bingoCount` 61, and every row carries `blackout: false`; agrees with PR #820's provenance table. PostHog corroborates direction only: its 772 marks before the 21:00 UTC cutoff of R33 (783 before the live freeze) sit under 845 | Firestore REST read with the `gaycruisebingo` deployer token; PR #820 body; PostHog `mark_square` (R33) |
| R10 | "16 players", "sixteen players", "fourteen of sixteen players marked", "sixteen friends" | lines 32-33, 60, 69, 134, 156 | SUPPORTED | Re-derived 2026-10-06: sixteen player documents, fourteen with `squaresMarked` above zero. PostHog cannot substitute and was not needed to (12 distinct markers; `join_event` 11, `$identify` 28 events) | Firestore REST read (R9); PostHog taxonomy in window |
| R11 | "27 bingos from eleven players", "player rows show ten", "the next two cards … one bingo apiece, both claimed on the final day" | lines 68-69, 91, 94, 132 | WRONG for "eleven players", corrected to seven; SUPPORTED for the totals and the final-day clause | Re-derived 2026-10-06: `players.dayStats` credits the embark Day with 27 bingos on seven player rows, and seven of the twelve embark boards hold a completed line; ten rows carry a `bingoCount` above zero; the Split and Sea Day cards carry one bingo each, and `days/1/meta/1` and `days/2/meta/2` pin those first bingos at 2026-07-23 20:04 and 21:55 Europe/Rome, the last full day. The eleven came from PR #820 and no readable surface reproduces it; seven on one card inside ten event-wide is no disagreement, so the "argues with itself" passage went with it | Firestore REST read (R9, `days/0/boards`, `days/{n}/meta/{n}`); PR #820; PostHog per-day `bingo` |
| R12 | "Zacaria Arab took the title on 16 bingos across 124 squares. Logan Murdock … 129 squares to 124" | lines 136, 138 | SUPPORTED | Re-derived 2026-10-06: the player rows read `bingoCount` 16 / `squaresMarked` 124 for the champion and 10 / 129 for the runner-up, the highest `squaresMarked` in the event; the rendered share card committed 2026-07-24 10:47:50 CEST shows the same 16/124 | Firestore REST read (R9); `public/images/projects/five-across-final-standings.png`; fiveacross `292f5f0` |
| R13 | "Bring the freeze forward to 23:00 that night, nine hours early", "frozen … at 23:00 on the last night", "a finale rescheduled while it ran" | lines 74, 77, 130, 138, 156 | WRONG; corrected 2026-10-06 after the owner confirmed the freeze was not moved (issue #1133) | The live `events/med-2026.frozenAt` is `1784872800000`, 2026-07-24T06:00Z: 08:00 Europe/Rome on disembarkation morning, the instant the code derives (R43), and 23:00 on 07-23 in Pacific time. Every instant PR #820 reported is the Pacific rendering of a contemporaneous write (its 11:04, 12:55 and 03:26 first-bingo pins are the `days/{1,2,7}/meta` documents at 20:04, 21:55 and 12:26 Rome), so #820 read a Pacific clock as ship time. The 845 total reproduces only against 06:00Z (835 against 21:00Z). nathanpaynedotcom#820 itself, written 2026-08-27 and never edited, is the pre-archive record: its pins are Pacific renderings, so its "23:00" is the live value. The scheduler stamps `frozenAt` once, with the farewell Day's `unlockAt`; the configured override did not exist until 08-04; the farewell card's first mark is 09:06 Rome on 07-24. The 2026-09-10 `updateTime` postdates #820, so it cannot be the source of the live value | Firestore REST read of `events/med-2026`, `days/{n}/meta/{n}` and `days/9/boards`; nathanpaynedotcom#820 body and edit history; fiveacross `functions/src/unlockDay.ts` (`freezeStandings`), `6a04443e`; `specs/d15-finale.md:8`; the sibling ledger's cross-page note 2 |
| R14 | "three cards claimed their first bingo hours before the freeze, days after their ports" | line 78 | SUPPORTED | Re-derived 2026-10-06: `days/1/meta/1`, `days/2/meta/2` and `days/7/meta/7` pin first bingos at 2026-07-23 20:04, 21:55 and 12:26 Europe/Rome, twelve, ten and nineteen hours before the 08:00 freeze, on the Split (07-16), Sea Day (07-17) and Villefranche (07-22) cards. PR #820's 11:04, 12:55 and 03:26 are the same instants in Pacific time. PostHog's 75 of 126 `bingo` events on 07-23 corroborate the shape | Firestore REST read (`days/{n}/meta/{n}`); the Event document's `days[n].unlockAt`; PR #820; PostHog per-day `bingo` |
| R15 | "two days into main-pool play, no main card had produced a bingo" | lines 68, 69 | SUPPORTED | Re-derived 2026-10-06: the first main card to pay out was the Valletta card (index 3) at 2026-07-18 22:05 Europe/Rome per `days/3/meta/3`; the Split and Sea Day cards before it did not pay out until 07-23. On the sea day, 07-17, when the reshuffle shipped (R41), no main card had a bingo on the record | Firestore REST read (`days/{n}/meta/{n}`); R41; `plans/daily-cards-spec.md:371` |
| R16 | "288 of 703 main-day marks, 41%", "32% of all marks landed between 19:00 and 20:59 ship time" | line 51 | SUPPORTED | Re-derived 2026-10-06 from the production boards: 288 of 703 main-Day marks (Days 1–8, pre-freeze, tutorial Days excluded) came after the next Day unlocked, and 294 of 921 marks (31.9%) fell in hours 19 and 20 Rome. PostHog cross-check: 250 of 813 (31%), consistent | Firestore board timestamps (`the-product-did-not-travel-ledger.md`, cross-page note 3 and R61); PostHog hour-of-day |
| R17 | "The worker is deployed and tested" | line 84 | UNPROVABLE | Cloudflare state is unreadable here and the `workers.dev` host named in the tests does not resolve. Weaker form: "deployable and tested" | `worker/wrangler.toml:1-7`; `worker/src/host.test.ts:110`; `curl` DNS failure |
| R18 | "Satellite" / "connectivity"; "satellite internet, dead zones at sea, a metal hull" | lines 28-29, 46 | UNPROVABLE | The repository says "flaky, expensive ship wifi"; satellite, dead zones and the hull are not in any record. Weaker form: "ship Wi-Fi" | `docs/adr/0006-offline-resilience.md:7`; `git grep -i satellite` (no hits outside the site) |
| R19 | "on a schedule players had already been given", "lost it without notice" | line 77 at audit; removed | UNPROVABLE at audit; the sentence no longer exists on the page | No record shows the freeze schedule was communicated to players or that no notice was sent; admin Notices shipped 07-23 00:28 Rome and sent notices were not read. The first pass kept the weaker form "on the schedule the app's own design derived"; the whole passage then came out on 2026-10-06 with the finale decision row, once the owner settled R13 (the freeze was never moved, so no play disappeared and no square was lost; issue #1133) | `functions/src/finaleContent.ts` (no freeze-time copy); fiveacross `c1f939d0` (#440) |
| R20 | "nine-night Mediterranean cruise from Trieste to Barcelona" | lines 4, 6, 114 | SUPPORTED | Day 1 Trieste 2026-07-15 to Day 10 Barcelona 2026-07-24 | `src/data/seed.ts:178-179, 291-292` |
| R21 | "built in eight days", "8 days to launch", "Eight days to launch" | lines 6, 26-27, 37, 122 | SUPPORTED | Repository created 2026-07-07T17:10:14Z; embarkation 2026-07-15 | `gh api repos/nathanjohnpayne/fiveacross`; `src/test/x-launch-checklist.test.ts:15-17` |
| R22 | "10 days live operation", "ten days of live play", "across the ten days" | lines 30-31, 130, 134 | SUPPORTED | Ten seeded Days, 07-15 through 07-24 | `src/data/seed.ts`; `specs/d15-tutorial-seed.md:27` |
| R23 | `liveUrl`, `githubUrl`, `status: SHIPPED`, related links, "on its own domain" | lines 17, 18, 20, 100-103, 150 | SUPPORTED | All four URLs and gaycruisebingo.com return HTTP 200; repository public | `curl -sIL`; `gh api … --jq .private` = false |
| R24 | `width: 786`, `height: 1550` | lines 14-15 | SUPPORTED | 786×1550 | `sips -g pixelWidth -g pixelHeight` |
| R25 | "frozen, randomized 5×5 card dealt from a community-editable prompt pool … see who else already has it" | line 114 | SUPPORTED | Frozen 5×5 deal, `addItem`, attributed tally | `src/game/logic.ts:550`; `src/data/api.ts:3437`; `specs/w2-tally.md:6` |
| R26 | "unlocks at 8:00 a.m. local time each morning after the first" | line 114 | SUPPORTED | `unlockAt0800Rome`; Day 1 `unlockAt: 0` | `src/data/seed.ts:165-167, 196` |
| R27 | "tutorial cards bookending the trip" | line 114 | SUPPORTED | Day 1 `easy`/`tutorial`, Day 10 `closing`/`tutorial` | `src/data/seed.ts:187-188, 297-298` |
| R28 | "doubts (\"pics or it didn't happen\"), and hearts" | line 114 | SUPPORTED | Verbatim in the doubts spec | `specs/w2-doubts.md:8,57` |
| R29 | "pledge, proof-to-mark, or admin-confirmed—defaulting to a one-tap Cross My Heart" | line 38 | SUPPORTED | Three `ClaimMode` values, default `honor`, pledge string shipped | `src/domainTypes.d.ts:12`; `src/data/occasions.ts:64`; `src/components/ProofSheet.tsx:471` |
| R30 | "let Phase 0 deploy without Cloud Functions at all" | line 40 | SUPPORTED | Phase 0 "deploys as static hosting plus Firestore/Storage rules, and runs on the Spark plan" | `docs/architecture/0002-application-architecture.md:21` |
| R31 | escape hatch "pulled seven times in ten days, all by one player"; "seven demand events rather than seven distinct challenged squares" | lines 41, 42, 134, 156 | SUPPORTED | `demand_proof` 7 events, 1 person, 07-18 01:25 to 07-21 22:49 Rome; the event carries no properties | PostHog 503790 |
| R32 | "installable PWA over an offline-first Firestore cache … cold boot works without waiting on the network" | line 47 | SUPPORTED | `persistentLocalCache`; cold-boot fix shipped 2026-07-09 | `src/firebase.ts` (per §B11); fiveacross `7f4d065a` (#117) |
| R33 | "772 the analytics logged", "41 marks made after the freeze", "73 marks" | lines 51, 95, 156 | WRONG as freeze-relative figures (R13 settled 2026-10-06); the page now carries 783 / 30 / 62. The 772 / 41 split holds only as a cut at 2026-07-23 21:00 UTC | 813 marks on the ten Rome days: 772 before 21:00 UTC on 07-23, 11 between then and the live `frozenAt` (06:00 UTC on 07-24), 30 at or after it. Cut at the live instant the figures are 783 before the freeze, 30 after, and a 62-mark gap to 845 (re-cut 2026-10-06) | PostHog 503790 |
| R34 | "A September 26 PostHog query found fifteen cruise-era exception events … five recorded sessions for one recorded user on July 18–19. Those sessions contained no recorded marks." | lines 51, 156 | SUPPORTED | 15 events, 1 person, 5 sessions, 2 device ids, 2026-07-18 01:24 to 07-19 15:34 Rome; 0 `mark_square` in those sessions | PostHog 503790 |
| R35 | "Players' debrief accounts describe recalling previous days together at dinner" | line 51 | SUPPORTED | Three of seven submissions to the anonymous cruise debrief describe group meals recalling the previous day; a fourth describes a group setting prompting it (not quoted; anonymous by request) | PostHog survey `019ff326-…` responses |
| R36 | "the sailing's commits skew to authentication and the PWA update path", "the update mechanism … caught fire", "The fires were authentication and the PWA update path" | lines 50, 97, 144 | SUPPORTED | Of 96 first-parent subjects, 8 are `(auth)` fixes (six on 07-15/16) and about a dozen concern the PWA shell, cache, reload and update path; the repository's own incident note records a two-day stale-shell mark-rejection failure from 2026-07-17 | `git log --first-parent`; `specs/w1-board-mark-win.md:37`; issue #387 |
| R37 | "Hearts touch no stats, no leaderboard and no win logic … a Most-Loved Photo award at the freeze" | line 56 | SUPPORTED | Verbatim in the hearts spec; award computed at the freeze | `specs/feed-hearts.md:12,48` |
| R38 | "every heart came from one person—nineteen of them" | lines 60, 134 | SUPPORTED | `heart_post` 19 events, 1 person | PostHog 503790 |
| R39 | "Cards dealt frozen from a seeded shuffle, with no rerolls" | line 65 | SUPPORTED | Seeded frozen deal at launch; the reshuffle only arrived 2026-07-17 | `src/game/logic.ts:550`; fiveacross `833d57e1` |
| R40 | "a card with zero marks can be traded for a fresh one, three times per player … a reshuffle and explicitly not a mulligan" | line 69 | SUPPORTED | "pristine-only, 3 per Event"; "*Avoid:* … mulligan" | `specs/reshuffle.md:6,12,14` |
| R41 | "It shipped on the sole sea day of the itinerary, alongside easy embark-pool squares blended into main cards" | line 69 | SUPPORTED | Exactly one `Sea Day` (07-17); #383 merged 2026-07-17 10:59 CEST, #394 at 19:53 CEST | `src/data/seed.ts:213`; `git log --first-parent` |
| R42 | "Seven reshuffles were spent, by three of sixteen players, all inside the sailing"; "seven uses against a ceiling of 48"; "all seven uses sit inside the sailing" | lines 69, 134, 144 | SUPPORTED | `reshuffle_card` 7 events, 3 persons, 07-18 18:31 to 07-23 12:33 Rome; cap is 3 per Event; 48 = 3×16 with 16 from R10 | PostHog 503790; `specs/reshuffle.md:6` |
| R43 | "last call at 20:00 on the final night and derived the standings freeze to 08:00 the next morning"; "three hours after last call"; "nine hours early" | lines 73-76 | SUPPORTED | Standard shape 20:00 Day 9, 08:00 Day 10; closing Day unlocks `unlockAt0800Rome('2026-07-24')`; arithmetic holds | `specs/d15-finale.md:8,37,39`; `src/data/seed.ts:291-299` |
| R44 | "36% of the cruise's marks landed on the final day, the biggest of the trip" | line 78 | SUPPORTED | 293 of 813 (36.0%) on 2026-07-23 Rome; next largest day 111. Note 07-23 is Day 9, the last full day; 07-24 carried 36 | PostHog 503790 |
| R45 | "marks did keep arriving after the freeze—onto a ceremonial card" | lines 77, 78 | WRONG as a freeze-relative figure (R13 settled 2026-10-06); the page now carries 30, and the sentence went with the removed finale decision. The 41 holds only as a cut at 21:00 UTC | 41 marks after 21:00 UTC on 07-23; 30 after the live `frozenAt` (R33). Card attribution rests on design: the farewell card's `unlockAt` is the same instant as the live `frozenAt`, and `mark_square` carries no day property | PostHog 503790; `specs/d15-finale.md:8`; the Event document's `days[9].unlockAt` |
| R46 | "a wildcard event router built for the edge"; "routes are written but not attached"; "The router fronts no production traffic"; "attaching the routes stays a deliberate human step" | lines 82-87, 152 | SUPPORTED | Routes commented out by design; test pins it | `worker/wrangler.toml:3-7,110-118`; `worker/src/routerBinding.test.ts:263-268` |
| R47 | "centralized authentication with a single-use handoff" (mechanism) | lines 82, 98, 152 | SUPPORTED | Single-use code minted and exchanged transactionally | `functions/src/authHandoff.ts:2,684` |
| R48 | "tenant isolation … has not shipped"; "Path-scoped security rules are not tenant isolation, and the repository's own specs say so"; "Separate events run on separate Firebase projects" | lines 82-85, 152 | SUPPORTED | "path scoping, not tenant isolation"; two projects | ADR 0008:12,14; `specs/path-addressing-and-root.md:313`; `.firebaserc` |
| R49 | "384 of 499 sessions—77%" | lines 91, 134 | SUPPORTED | 499 sessions, 384 without a mark (76.95%) | PostHog 503790 |
| R50 | "On the morning the ship docked … a final-standings share card, committed at 10:47 … three more landed by evening" | line 92 | SUPPORTED | `292f5f0` 2026-07-24 10:47:50 CEST (Day 10, Barcelona); `feat` commits followed at 12:54, 15:05 and 16:54 CEST | `git log --first-parent` 07-24 Rome |
| R51 | "PostHog independently counts ten" | lines 94, 132 | SUPPORTED | 10 distinct persons fired `bingo` | PostHog 503790 |
| R52 | "embark bingos do count toward event totals"; "the scoring tests assert it explicitly" | lines 94, 132 | SUPPORTED | "counts the embark (tutorial) card toward the summed totals" | `src/game/d15-scoring-aggregates.test.ts:77-82` |
| R53 | moderation stack "finished six days before embarkation"; "a Cloud Vision gate shipped deliberately off by default" | lines 96, 124 | SUPPORTED | Auto-hide `7ffc5618` and off-by-default Vision gate `68c67513` both 2026-07-09; one runtime fix to the gate's settings path followed 07-13 (#284) | `git log --first-parent` |
| R54 | "No record the repository keeps shows any of it being exercised during the sailing"; "stayed quiet in every record the repository keeps" | lines 97, 124 | SUPPORTED | Literally true, and uninformative: the repository keeps no live-ops record of the sailing at all (the freeze move is absent too), and the PostHog taxonomy carries no report or hide event in the window | `git grep`; PostHog event list in window |
| R55 | "none of them landing on embark day itself" | line 132 | SUPPORTED | 0 `bingo` events on 2026-07-15 Rome | PostHog 503790 |
| R56 | "PostHog … sees twelve markers, has nine of those twelve marking on five or more days" | line 134 | SUPPORTED | 12 markers; distinct mark-days [1, 1, 3, 5, 5, 6, 7, 7, 7, 7, 8, 10] | PostHog 503790 |
| R57 | "the board sorts bingos first … The rule, not volume, crowned the champion" | line 136 | SUPPORTED | `comparePlayers`: bingos desc, then squares | `src/game/logic.ts:1106-1108` |
| R58 | alt: champion 16/124, "Turntilla's cruise-wide First to BINGO", "ten daily honors spread from Trieste to Barcelona" | line 138 | SUPPORTED | The PNG shows exactly these; the "23:00" gloss is R13 | image inspection |
| R59 | "Ninety-six changes landed on main … first-parent commits between the Rome midnights" | lines 144, 156 | SUPPORTED | 96 first-parent (98 reachable) | `git log --first-parent main --since='2026-07-15T00:00:00+02:00' --until='2026-07-25T00:00:00+02:00'` |
| R60 | "two of the calls below were made at sea while the event was live" | line 122 | WRONG (after R13); corrected 2026-10-06 to one call | The reshuffle shipped on the sea day (07-17), but the freeze was never moved (R13, settled by the owner), so only one call was revised at sea | R41; R13 |
| R61 | "The build ran on agents"; "The mid-cruise drops landed as reviewed pull requests"; "Agents expanded build, test, and review capacity" | line 146 | SUPPORTED | 79 of 85 PRs merged in the window carry `Authoring-Agent:`; #383, #394 and #450 each carry bot reviews and a `nathanpayne-codex` APPROVED; the eleven PR-less direct commits are plans, wireframes and a review-policy toggle | `gh pr list --search merged:…`; `gh pr view` |
| R62 | "Specs pin … the finale's exact instants; ADRs record … on-device share rendering, offline persistence, a second Firebase project as the interim tenant boundary; … contrast computed out of the shipped CSS … a launch-checklist test that pins embarkation day" | line 146 | SUPPORTED | ADR 0005, 0006, 0008; test parses `themes.css`; checklist pins 2026-07-15 | `docs/adr/`; `src/theme/w1-themes.test.tsx:2,27`; `src/test/x-launch-checklist.test.ts:15-17` |
| R63 | "Gay Cruise Bingo … still runs as a live edition, the default one, on its own domain against its own Firebase project; Vacay Bingo is the travel edition" | line 150 | SUPPORTED | `DEFAULT_EDITION = GAY_CRUISE_BINGO`; gaycruisebingo.com 200; `.firebaserc` default `gaycruisebingo`; `VACAY BINGO` wordmark | `src/edition-brands.ts:31,35,126`; `curl` |
| R64 | "The first non-cruise event, a Sonoma Coast weekend in August 2026 run by a different host … unlock-copy fixes landed on its opening day" | line 150 | SUPPORTED | Bodega Bay 2026-08-07..09, `America/Los_Angeles`; two admins, the owner's account with 0 squares and a second admin with 15; host-debrief survey; #669, #673, #675 merged 2026-08-07 | `scripts/seed-data/bodega-bay-2026.mjs:195-213`; Firestore `fiveacross`; PostHog survey `019ff312-…` |
| R65 | "four people marked 27 squares, nobody got a bingo, and the guests' last marks came on Saturday morning" | line 150 | SUPPORTED | Player rows 6+4+2+15 = 27, `bingoCount` 0 on all seven; board cells: guests' last marks Sat 2026-08-08 09:46, 09:55, 09:57 PDT, host 12:57 | Firestore `fiveacross/events/bodega-bay-2026` players and boards |
| R66 | "fifteen themes shipped for the cruise—thirteen party plus two tutorial—out of twenty-two now across the platform, every one held to WCAG AA contrast by test suites that compute contrast from the CSS itself" | line 150 | SUPPORTED | 13 GCB party + 2 tutorial = 15; Vacay 3, Five Across 3 + chrome 1 = 22; 22 `[data-theme=` blocks; `TEXT_MIN = 4.5` | `src/theme/themes.ts:272-298`; `grep -c "^\[data-theme=" src/theme/themes.css`; `w1-themes.test.tsx` |
| R67 | "Five Across began as Gay Cruise Bingo"; "generalizing into a multi-event platform" | lines 4, 114 | SUPPORTED | First commits 2026-07-07 name `gaycruisebingo`; three editions, two events | `git log --reverse`; PRD `gaycruisebingo.md:21` |
| R68 | stack: "React · TypeScript · Vite · Firebase · Cloud Functions · Cloudflare Workers · PostHog" | line 24 | SUPPORTED | Unchanged since §B24; Cloudflare Workers is code that fronts no traffic (R46) | §B24; `worker/` |
| R69 | "a feature drop that reached phones mid-sailing" | line 156 | SUPPORTED | Reshuffle uses recorded from 07-18 18:31 Rome, the day after it shipped | PostHog `reshuffle_card` |

Counts: WRONG 9, STALE 4, UNPROVABLE 3, SUPPORTED 53. (R60 moved from SUPPORTED to WRONG on 2026-10-06 when the owner settled R13.) (The first read, before the same-day `gaycruisebingo` re-derivation, had R9 to R16 UNPROVABLE and R33 and R45 SUPPORTED: 4, 4, 11, 50. The re-derivation moved R9, R10, R12, R14, R15 and R16 to SUPPORTED, R11 to WRONG for one clause, and R13, R33 and R45 to WRONG as the record stands.)

## Rows

### R1: the secondary screenshot's alt text
> "Gay Cruise Bingo warm-up card on the same Five Across platform, showing a Welcome Aboard bingo grid for a Trieste sailing" (line 13)

**WRONG.** The image shows a card headed "Day 1 · Neon Playground WARM-UP" at Trieste, with a free square reading "You made it aboard"; the words "Welcome Aboard" appear nowhere on it. The seed gives embark day the theme id `welcome-aboard` (`src/data/seed.ts:181`), but the capture was not taken from that seed: PR #785, which added the image, says it came from the marketing harness with `HERO_EDITION=gcb`, "dealing the `embark` tutorial pool over the `neon-playground` Theme" over an emulator-seeded demo Event, "Not a production screenshot." Both `welcome-aboard` and `neon-playground` are registered GCB themes (`src/theme/themes.ts:114`, `:55`). Corrected alt: "Gay Cruise Bingo warm-up card on the same Five Across platform, a Day 1 card in the Neon Playground theme for a Trieste sailing, rendered by the marketing harness." Source: image inspection of `public/images/projects/five-across-gcb-hero.png`; `gh pr view 785 --repo nathanjohnpayne/nathanpaynedotcom --json body`.

### R2: every new event needs its own Firebase project
> "Every new event needs its own Firebase project, provisioned by hand." (line 86)

**WRONG, one quantifier too wide.** The project boundary exists for unrelated cohorts, not for every event: ADR 0008 says the path-scoped rules mean "Sequential Events within one community could accept that; an adults-only cohort and an unrelated general-audience group cannot," and the whole of `specs/x-multi-event-schema.md` describes several Events inside one project, with `scripts/seed.mjs` resolving its target from `VITE_EVENT_ID` or the project's default (`specs/w1-event-seed.md:8`). The page's own D6 `chosen` and the body at line 152 state the narrower rule correctly ("unrelated groups do not share a backend"). Corrected value: "Every event for an unrelated group needs its own Firebase project, provisioned by hand." Source: `docs/adr/0008-five-across-second-firebase-project.md:12` -> "Sequential Events within one community could accept that".

### R3: no deploy record survives
> "The log proves they landed, not that each one reached a phone mid-ocean—no deploy record survives for that window" (line 144)

**WRONG as stated.** The repository does keep a record of a mid-sailing deploy, in narrative form: `specs/w1-board-mark-win.md:37` describes "the 2026-07-17 mark-revert incident (#387)" in which "a rules-deploy/stale-bundle skew rejected every mark batch from sticky PWA shells for two days," restated at `specs/w2-ga4-events.md:19`; issue #387 was opened 2026-07-17T04:47:45Z and closed by PR #470 at 2026-07-24T22:37:07Z. The authoritative record also survives, outside the repository: Firebase Hosting's release history for the `gaycruisebingo` site, read on 2026-10-06 with the project's deployer account, lists 41 releases between the Rome midnights that bound the sailing (2026-07-14 22:00 UTC to 2026-07-24 22:00 UTC), every one a `DEPLOY` by `firebase-deployer@gaycruisebingo`, five of them on the incident day (07-17 at 09:15, 11:44, 17:20, 19:25 and 20:05 UTC). What is true is narrower: there is no deploy log in the repository (no deploy workflow exists in `.github/workflows/`, and none of the 2,500 Actions runs created 2026-07-15..24 is a deploy). Corrected value, in two steps: the first pass wrote "no deploy log survives in the repository, only an incident note recording one mid-sailing rules deploy and its two days of stale-shell fallout"; the second (nathanpaynedotcom#1130) made it "no deploy log survives in the repository, though Firebase Hosting's release history records 41 deploys between those same midnights, and an incident note records one mid-sailing rules deploy and its two days of stale-shell fallout." The first pass had written that Hosting could not be read because no `gaycruisebingo` credential was stored; that was the wrong-project mistake recorded in the Method notes. Source: `gh issue view 387 --repo nathanjohnpayne/fiveacross --json createdAt,closedAt` -> `2026-07-17T04:47:45Z`, `2026-07-24T22:37:08Z`; `gh api "repos/nathanjohnpayne/fiveacross/actions/runs?created=2026-07-15..2026-07-24" --jq .total_count` -> 2500, no deploy workflow among them; `curl -H "Authorization: Bearer $TOK" "https://firebasehosting.googleapis.com/v1beta1/projects/gaycruisebingo/sites/gaycruisebingo/releases?pageSize=100"` -> 87 releases, 41 with `releaseTime` inside the window.

### R4: the endorsement quotation closes a sentence the source does not close
> "It is an ENDORSEMENT, not a rename: the wordmark, the cruise vocabulary, the adult posture, gaycruisebingo.com and the legacy Firebase project are all unchanged—GCB is simply one Edition of Five Across now, on the same engine as Vacay." (line 150)

**WRONG on quotation fidelity, minor.** The words match the comment through "as Vacay", but the source continues in the same sentence: "on the same engine as Vacay, and under the Phase 7 native plan the store binary a GCB player installs is literally named Five Across." That clause has been in the comment since `aab8ce9f` (2026-08-10), seventeen days before the page quoted it, so the quotation was truncated at writing rather than overtaken; the comment has since moved from `src/editions.ts` to `src/edition-brands.ts` without changing. The page's "a comment on that edition's brand record" still describes it accurately. Corrected value: end the quotation "as Vacay…" or carry it through "named Five Across." Source: `sed -n '37,43p' src/edition-brands.ts`; `git log -S"Phase 7 native plan" -- src/edition-brands.ts src/editions.ts` -> `aab8ce9f 2026-08-10`.

### R5: the IAM provisioning as an unresolved item
> "What resolves it: the tenant-isolation rules workstream, the IAM provisioning the handoff needs, and the deliberate act of attaching the routes." (line 87)

**STALE.** The provisioning the page names as pending completed on 2026-09-10. ADR 0010's header now reads "**Provisioned (#547, completed 2026-09-10).** `auth.fiveacross.app` is a Firebase Auth authorized domain … the Five Across deploy service account holds `roles/run.admin`, both callables exist on `fiveacross` … and invoker reconciliation is enabled for the deploy target," and `specs/auth-handoff.md:202` says the same ("Reconciliation is live on Five Across (#547, completed 2026-09-10)"). The page was written 2026-08-27 (#834) and last touched 2026-09-26 (#1067) without updating this clause. Corrected value: drop the IAM item, or replace it with whatever the owner now regards as the remaining human step (see R7). Source: `docs/adr/0010-centralised-auth-origin-with-handoff.md:14`; `specs/auth-handoff.md:202`.

### R6: implemented and gated on provisioning
> "After the cruise, authentication is where the platform work went: a centralized auth origin with a single-use handoff, implemented and gated on provisioning." (line 98)

**STALE.** Same change as R5: provisioning finished 2026-09-10, so the gate the sentence names no longer exists; the subsequent gate, the first named deploy shipping the handoff-mode client, has also passed (R7). Corrected value: "implemented, provisioned, and shipped in the live client." Source: as R5 and R7.

### R7: implemented but not yet reachable
> "The router fronts no production traffic and the auth handoff is implemented but not yet reachable" (line 87); "centralized authentication with a single-use handoff, implemented but not yet reachable" (line 152)

**STALE.** The page took "not yet reachable" from ADR 0010, whose header (last edited 2026-09-09 by #1169) says the flow "becomes reachable with the first named Five Across deploy after #1169," and "**Still pending:** the first named `npm run deploy:fiveacross` after that flip, which ships the handoff-mode client." That deploy has happened: the registered `fiveacross` build target hard-codes `VITE_AUTH_MODE: 'handoff'` and `VITE_AUTH_HANDOFF_ORIGIN: 'https://auth.fiveacross.app'` (`scripts/build-target.mjs:49-50`, enforced per `docs/app/deploy-targets.md:46`), and the live `https://fiveacross.app` client is built from a tree at or after 2026-10-05: its loader `/assets/index-zeibW-vR.js` imports `privateCacheRecoveryPage` and `privateCacheRecoveryNavigation`, modules added 2026-10-04 by #1654, and its main chunk contains strings introduced 2026-10-05 ("Private Auth copy timed out.", #1758) alongside `auth.fiveacross.app` (4 occurrences) and `mintAuthHandoff`; `https://auth.fiveacross.app/` answers 200. Two caveats keep this a weaker claim rather than a proof of use: `resolveSignInStrategy` returns `direct` when the host is the configured auth domain (`src/auth/authMode.ts:151-156`), so on `fiveacross.app` itself sign-in never traverses the handoff, and no sign-in through it has been demonstrated; and ADR 0010's own header still says pending, so the repository's documentation lags its deploy. Corrected value: "the auth handoff is implemented, provisioned, and shipped in the live client; on registered hosts sign-in still resolves direct, so no sign-in has been demonstrated through it." Source: `curl -s https://fiveacross.app/assets/main-o2ThNBCZ.js | grep -c 'Private Auth copy timed out.'` -> 1; `git log --diff-filter=A -- 'src/**/privateCacheRecovery*'` -> `46859f02 2026-10-04`.

### R8: one uncommented block
> "The worker is deployed and tested, the route config is written, and cutover would be one uncommented block." (line 84)

**STALE.** When #834 wrote the page the config held a single commented `routes = [ … ]` array with two patterns, which §B16 quoted. PR #1120 (2026-09-07, `56bc11d1`) rewrote it as two commented `[[routes]]` array-of-tables blocks, one for `*.fiveacross.app/*` and one for `*.vacaybingo.com/*`, with a comment explaining why the array form would silently attach nothing, and `worker/src/routerBinding.test.ts:263` asserts it "keeps BOTH wildcard route blocks commented out." Corrected value: "cutover would be two uncommented blocks, one per zone." Source: `sed -n '110,118p' worker/wrangler.toml`; `git log -2 -- worker/wrangler.toml` -> `56bc11d1 2026-09-07`.

### R9: 845 squares, 61 bingos, zero blackouts
> "The frozen production Firestore holds 845 squares." (line 42); "The frozen event totals 845 squares and 61 bingos, with zero blackouts." (line 134)

**SUPPORTED, re-derived from the production record on 2026-10-06.** The sixteen player documents under `events/med-2026/players` on the `gaycruisebingo` project sum to `squaresMarked` 845 and `bingoCount` 61, and every one carries `blackout: false`. That agrees with PR #820's provenance table (a 2026-08-26 production read) and with the 2026-09-24 audit behind #1057 ("16 joined, 14 marked, 845 marks at/before freeze"). PostHog corroborates only the direction: its `mark_square` count under 845 (772 before the 21:00 UTC cutoff PR #820 recorded, 783 before the live freeze; R33) is the shape offline queueing and analytics loss both produce, and its 126 `bingo` events are a known double-count against 61. The audit's first read of this document used the `fiveacross` deployer credential and returned `PERMISSION_DENIED`; the row was UNPROVABLE until the same-day re-read with the project's own deployer account (Method notes). Source: `TOK=$(gcloud auth print-access-token --account=firebase-deployer@gaycruisebingo.iam.gserviceaccount.com); curl -H "Authorization: Bearer $TOK" "https://firestore.googleapis.com/v1/projects/gaycruisebingo/databases/(default)/documents/events/med-2026/players?pageSize=100"` -> 16 documents, sums 845 / 61, `blackout` false on all; `gh pr view 820 --json body`.

### R10: the roster of sixteen
> "16 players" (line 32); "across ten days and sixteen players" (line 60); "fourteen of sixteen players marked at least one square" (line 134); "The audience was sixteen friends" (line 156)

**SUPPORTED, re-derived from the production record on 2026-10-06.** Sixteen player documents, fourteen with `squaresMarked` above zero, the same "16 joined, 14 marked" the 2026-09-24 audit recorded. PostHog cannot stand in for the roster and did not need to: it sees 12 distinct markers on the Event window, 11 `join_event` events and 28 `$identify` events, and §BM2 already established that its person counts run both under and over the roster. Source: the R9 read; PostHog `SELECT event, count() … GROUP BY event` in the window.

### R11: the embark card's eleven, the player rows' ten, and the two one-bingo cards
> "Firestore's day buckets credit the embark tutorial with 27 bingos from eleven players, none of them landing on embark day itself" (line 132); "its player rows show ten with a bingo event-wide" (line 94); "the two cards after the embark tutorial would finish the cruise with one apiece, both claimed on the final day" (lines 69, 91, 132)

**WRONG for "eleven players", corrected to seven on the page; SUPPORTED for the totals and the final-day clause.** Re-derived on 2026-10-06 from the player documents and the `days/{n}/meta/{n}` documents (the `days/{n}` parents are phantom, but their `meta` subcollection reads by path). `players.dayStats` credits the embark Day (index 0) with 27 bingos; ten of the sixteen rows carry a `bingoCount` above zero; the Split and Sea Day cards (indices 1 and 2) carry one bingo each; and `days/1/meta/1` and `days/2/meta/2` pin those first bingos at 2026-07-23 20:04 and 21:55 Europe/Rome, the last full day of the sailing, each written at the instant it records (`createTime` matches `firstBingo.at`). The embark card's first bingo is pinned at 2026-07-16 00:27 Rome, so none landed on embark day itself. The one clause the record contradicts is "eleven players": the embark bucket's 27 bingos sit on seven player rows, seven of the twelve boards under `days/0/boards` hold a completed line (29 lines counted from the cells, against `dayStats`' 27, so the app's bingo count is not a plain line count, but the player set is the same seven), and no readable surface yields eleven; PR #820 is its only source. The page's "eleven" is corrected to seven (line 132) in nathanpaynedotcom#1130, and because seven on one card inside ten event-wide is no disagreement, the "record argues with itself" passage and the decisions-table rows that named the eleven-versus-ten tension (lines 94–95) now describe the one disagreement that remains, 845 squares against 772 analytics marks. Two cautions for later passes: `players.dayStats[n].firstBingoAt` is not a per-card first-bingo field (one instant repeats across several Days for a player, and for the Split card it reads 07-20 17:56 against the `meta` pin's 07-23 20:04), so the `meta` documents are the record for first bingos; and PR #820 printed its pins in Pacific time (its 11:04 and 12:55 are 20:04 and 21:55 Rome). PostHog's shape still fits: zero `bingo` events on 2026-07-15 Rome (R55), then 3 on 07-16 and 5 on 07-17, and exactly 10 distinct persons fired `bingo` over the window (R51). Source: the R9 read (`dayStats` per player); `curl … /events/med-2026/days/1/meta` and `/days/2/meta` -> `firstBingo.at` 1784829869915 and 1784836529739; PostHog `SELECT toDate(toTimeZone(timestamp,'Europe/Rome')) AS d, countIf(event='bingo') … GROUP BY d` -> `07-15: 0, 07-16: 3, 07-17: 5, …, 07-23: 75`.

### R12: 16 bingos across 124 squares; 129 squares
> "Zacaria Arab took the title on 16 bingos across 124 squares. Logan Murdock out-marked him, 129 squares to 124, and finished second" (line 136); alt "champion Zacaria Arab at 16 bingos and 124 squares" (line 138)

**SUPPORTED, re-derived from the production record on 2026-10-06.** The champion's player document reads `bingoCount` 16 and `squaresMarked` 124; the runner-up's reads 10 and 129, the highest `squaresMarked` in the event. The rendered final-standings card at `public/images/projects/five-across-final-standings.png` (1800×2250), committed to the app repository by `292f5f0` at 2026-07-24 10:47:50 CEST (§B15), shows the same 16/124, so the figure is also a contemporaneous record. The ordering rule is SUPPORTED separately (R57). Source: the R9 read; `git show -s --format='%h %ad' --date=iso-strict 292f5f0` -> `2026-07-24T10:47:50+02:00`; image inspection.

### R13: the 23:00 freeze and the nine hours
> "Bring the freeze forward to 23:00 that night, nine hours early, while the event was live." (line 74); "frozen in the production Firestore at 23:00 on the last night" (line 130); "a finale rescheduled while it ran" (line 156)

**WRONG; corrected on the page 2026-10-06 after the owner confirmed the freeze was not moved during the sailing (issue #1133).** The live `events/med-2026.frozenAt` is `1784872800000`, which is 2026-07-24T06:00:00Z: 08:00 Europe/Rome on disembarkation morning, the instant the code derives (R43) and the minute the farewell card (index 9) unlocks, and 23:00 on 07-23 in Pacific time. PR #820 reported that instant as "`frozenAt` 2026-07-23 23:00 Europe/Rome", and the three first-bingo pins it quotes (11:04, 12:55 and 03:26 on 07-23) are the Pacific renderings of `days/1/meta/1`, `days/2/meta/2` and `days/7/meta/7`, which read 20:04, 21:55 and 12:26 Rome and were each written at the instant they record. So #820 read a Pacific clock as ship time throughout, and the page's 23:00 is that misread rather than a rescheduled finale. The totals agree: 845 reproduces only against 06:00Z (ten marks sit between 21:00Z and 06:00Z, so a 23:00 Rome freeze would leave 835), and the player rows' stored `squaresMarked` sum to the same 845. The pre-archive record says the same. nathanpaynedotcom#820, the page's source PR, was written on 2026-08-27 and never edited (GitHub records no body edits), two weeks before the Event document's 2026-09-10 `updateTime`; it reports "`frozenAt` 2026-07-23 23:00 Europe/Rome" beside "`days/{1,2,7}/meta` pins at 11:04, 12:55, 03:26". Those three pins are the `meta` documents' 20:04, 21:55 and 12:26 Rome rendered in Pacific time, so #820 rendered every instant in Pacific, and its "23:00" is 1784872800000, the value the document holds today. The scheduler could not have produced any other value: `functions/src/unlockDay.ts` stamps `frozenAt` exactly once, with the farewell Day's `unlockAt` rather than the run clock, and `standingsFreezeAt`, the configured override, did not exist until 2026-08-04 (fiveacross `6a04443e`), so the only in-sailing way to freeze at 23:00 was to move the farewell Day's `unlockAt` itself, which would have opened the farewell card at 23:00; that card's first mark is 09:06 Rome the next morning, while ten marks landed on other cards in the hours between. The share card prints no freeze time at all (the page's alt text said it did; corrected in #1130). The owner confirmed on 2026-10-06 (issue #1133) that the freeze was not moved during the sailing, which supersedes the earlier §B34 disposition recording a deliberate move; the record and the owner agree that the freeze held at the derived 08:00. The one escape is the Event document's `updateTime` of 2026-09-10T16:30:02Z, and no script in the repository writes `frozenAt` outside the hostname-lifecycle archive path (sibling ledger, cross-page note 2). The "nine hours early" arithmetic is sound over the two SUPPORTED instants (R43) but its operand is wrong, and "a finale rescheduled while it ran" (line 156) carries the same claim; the share-card alt text (line 138) said the card showed the standings "as frozen at 23:00", which the card does not show, and is corrected in #1130. PostHog is consistent either way: 41 marks after 21:00Z on 07-23 and 9 `bingo` events from 3 persons on 07-24 Rome fit a ceremonial card open from 08:00. Source: `curl … /events/med-2026` -> `frozenAt` 1784872800000, `updateTime` 2026-09-10T16:30:02Z; `curl … /days/{1,2,7}/meta`; `gh pr view 820 --json body`; `specs/d15-finale.md:8`.

### R14: three cards' first bingos hours before the freeze
> "three cards claimed their first bingo hours before the freeze, days after their ports" (line 78)

**SUPPORTED, re-derived from the production record on 2026-10-06.** `days/1/meta/1`, `days/2/meta/2` and `days/7/meta/7` pin first bingos at 2026-07-23 20:04, 21:55 and 12:26 Europe/Rome: twelve, ten and nineteen hours before the 08:00 freeze on 07-24, on the Split card (unlocked 07-16), the Sea Day card (07-17) and the Villefranche card (07-22), so a week, six days and a day after their ports. PR #820's 11:04, 12:55 and 03:26 are the same instants in Pacific time (R13). PostHog corroborates the shape: 75 of the window's 126 `bingo` events, from 8 distinct persons, landed on 2026-07-23 Rome, against single digits on most other days. Source: `curl … /events/med-2026/days/{1,2,7}/meta` -> `firstBingo.at` 1784829869915, 1784836529739, 1784802386515; the Event document's `days[n].unlockAt`; PostHog per-day `bingo` (R11).

### R15: two days in, no main card had produced a bingo
> "That cost arrived on schedule—two days into main-pool play, no main card had produced a bingo" (line 68); "Two days into main-pool play, no main card had produced a bingo" (line 69)

**SUPPORTED, re-derived from the production record on 2026-10-06.** The first main card to pay out was the Valletta card (index 3, unlocked 07-18 08:00), whose `days/3/meta/3` pins its first bingo at 2026-07-18 22:05 Europe/Rome; the Split and Sea Day cards before it did not pay out until 07-23 (R11). Main-pool play opened with the Split card (index 1) on 07-16, so on the sea day, 07-17, when the reshuffle shipped at 10:59 CEST (R41), no main card had produced a bingo, and none would until the next evening. PostHog's 8 `bingo` events across 07-16 and 07-17 are therefore all embark-card bingos, which its property-less `bingo` event could not show on its own. The timing is consistent with `plans/daily-cards-spec.md:371`, which records the easy mix of 2026-07-17 under "cards were too hard." Source: `curl … /events/med-2026/days/3/meta` -> `firstBingo.at` 1784405107761; the Event document's `days[1..3].unlockAt`; `plans/daily-cards-spec.md:371`.

### R16: 288 of 703, and 32% between 19:00 and 20:59
> "288 of 703 main-day marks, 41%, came after the next day's card unlocked, and 32% of all marks landed between 19:00 and 20:59 ship time." (line 51)

**SUPPORTED, re-derived from the production boards on 2026-10-06.** Applying the page's own rule to the board documents under the Event (main Days 1–8, marks before the freeze, tutorial Days excluded) gives 288 of 703 marks made after the next Day's card unlocked, and 294 of the 921 marks in all (31.9%) fell in hours 19 and 20 Europe/Rome; the 2026-09-24 audit behind #1057 recorded the same two cuts. PostHog reproduces the evening shape on its own record: 250 of 813 marks between 19:00 and 20:59 Rome, 30.7%, with 19:00 the heaviest hour of the cruise at 142. Source: `the-product-did-not-travel-ledger.md`, cross-page note 3 and R61; PostHog `SELECT toHour(toTimeZone(timestamp,'Europe/Rome')) AS h, count() … GROUP BY h` -> `19: 142, 20: 108` of 813.

### R17: the worker is deployed
> "The worker is deployed and tested, the route config is written" (line 84)

**UNPROVABLE here for "deployed"; "tested" is SUPPORTED.** Cloudflare's account state cannot be read from this session, and the one hostname the repository names for the Worker's `*.workers.dev` liveness address, `five-across-event-router.nathanpayne.workers.dev` in `worker/src/host.test.ts:110`, does not resolve in DNS, which may mean a different account subdomain rather than no deployment. The repository documents the deploy path (`worker/README.md:126`) and `wrangler.toml` keeps `workers_dev = true` "as a deployment/liveness check," but nothing readable here shows a deployment occurred. The test suite under `worker/src/` is real. Defensible weaker form: "The worker is deployable and tested." Source: `curl -sv https://five-across-event-router.nathanpayne.workers.dev/` -> "Could not resolve host".

### R18: satellite internet, dead zones, a metal hull
> `value: "Satellite"`, `label: "connectivity"` (lines 28-29); "The venue was a ship: satellite internet, dead zones at sea, a metal hull." (line 46)

**UNPROVABLE.** No record in the repository mentions satellite, dead zones or the hull; the environmental premise is stated once, in ADR 0006: "Flaky, expensive ship wifi is the product's **#1 environmental risk**." The page's details are general knowledge about cruise connectivity rather than anything observed or recorded, and the PostHog connectivity evidence (R34) establishes request failures, not their cause. Defensible weaker form: "ship Wi-Fi" for the constraint value, and "The venue was a ship, and ship Wi-Fi is flaky" for the context sentence. Source: `docs/adr/0006-offline-resilience.md:7`; `git grep -n -i satellite -- docs specs plans` -> no hits.

### R19: a schedule already given, and no notice
> "Nine hours of play disappeared from a live event, on a schedule players had already been given. Anyone holding a square for disembarkation morning lost it without notice" (line 77)

**UNPROVABLE.** Nothing readable shows players were told the standings would freeze at 08:00: the finale content functions carry no freeze-time copy, and the locked-day caption that derives an unlock hour from `unlockAt` was added 2026-08-07 (#669), after the cruise. Whether a notice went out is equally unreadable: admin Notices shipped at 00:28 Rome on 07-23 (`c1f939d0`, #440), hours before the freeze, and `plans/admin-messages-ticket.md:35` drafts a last-days message, but sent notices were not read. The sentence rested on R13: the live record holds the freeze at the derived 08:00 on disembarkation morning, so on the record the nine hours never disappeared and no square was lost. The first pass kept the weaker form "on the schedule the app's own design derived" and dropped "without notice"; on 2026-10-06 the owner confirmed the freeze was never moved (issue #1133) and the whole passage came out with the finale decision row, so no page text carries this claim now. The row stays UNPROVABLE as the audit verdict; nothing remains to correct. Source: `grep -n -i "08:00\|freeze" functions/src/finaleContent.ts` -> no player-facing freeze time; `git log --first-parent` 07-23 Rome -> `c1f939d0 00:28`.

### R20: nine nights, Trieste to Barcelona
> "a nine-night Mediterranean cruise from Trieste to Barcelona" (line 114; also lines 4, 6)

**SUPPORTED.** The seed's ten Days run from Trieste on 2026-07-15 to Barcelona on 2026-07-24, nine nights aboard. Source: `src/data/seed.ts:178-179` -> `date: '2026-07-15', place: 'Trieste'`; `:291-292` -> `date: '2026-07-24', place: 'Barcelona'`.

### R21: eight days
> "built in eight days" (line 6); `value: "8 days"`, `label: "to launch"` (lines 26-27); "Eight days to launch a multiplayer game" (line 37); "Eight days is not enough time" (line 122)

**SUPPORTED.** The repository was created 2026-07-07T17:10:14Z and its first commit is the same day; embarkation is pinned to 2026-07-15 by the launch-checklist test. Source: `gh api repos/nathanjohnpayne/fiveacross --jq .created_at` -> `2026-07-07T17:10:14Z`; `src/test/x-launch-checklist.test.ts:15-17`.

### R22: ten days
> `value: "10 days"`, `label: "live operation"` (lines 30-31); "ten days of live play" (line 130); "across the ten days" (line 134)

**SUPPORTED.** Ten seeded Days, all playable, 2026-07-15 through 2026-07-24; §B22 records why this reconciles with "nine-night." Source: `src/data/seed.ts` (indices 0–9); `specs/d15-tutorial-seed.md:27`.

### R23: the URLs, the status, and the related links
> `liveUrl: "https://fiveacross.app"` (line 17); `githubUrl: "https://github.com/nathanjohnpayne/fiveacross"` (line 18); `status: "SHIPPED"` (line 20); `related` to `/projects/swipe-watch/` and `/projects/mergepath/` (lines 100-103); "on its own domain" (line 150)

**SUPPORTED.** `fiveacross.app`, the GitHub repository, both related pages and `gaycruisebingo.com` all answer HTTP 200; the repository is public and not archived; the old name `nathanjohnpayne/gaycruisebingo` redirects to it. Source: `curl -sIL` on each URL -> `HTTP/2 200`; `gh api repos/nathanjohnpayne/fiveacross --jq '{private,archived}'` -> `false, false`.

### R24: the secondary image's dimensions
> `width: 786`, `height: 1550` (lines 14-15)

**SUPPORTED.** Source: `sips -g pixelWidth -g pixelHeight public/images/projects/five-across-gcb-hero.png` -> `786`, `1550`.

### R25: the card and the pool
> "Every player gets a frozen, randomized 5×5 card dealt from a community-editable prompt pool; tap a square when the thing happens and see who else already has it." (line 114)

**SUPPORTED.** The dealer's doc comment reads "Deal a frozen 5x5 board: 24 sampled prompts + free center (index 12)"; `addItem` is the player-submission path; the attributed tally is specified at `specs/w2-tally.md:6`. Source: `src/game/logic.ts:550`; `src/data/api.ts:3437`.

### R26: 8:00 a.m. each morning after the first
> "A fresh themed card unlocks at 8:00 a.m. local time each morning after the first" (line 114)

**SUPPORTED.** `unlockAt0800Rome(date)` bakes `T08:00:00+02:00` for Days 2–10 and Day 1 carries the `unlockAt: 0` "live from event open" sentinel; this is the wording §B3 recommended. Source: `src/data/seed.ts:165-167, 196`.

### R27: tutorial cards bookending
> "with tutorial cards bookending the trip" (line 114)

**SUPPORTED.** Source: `src/data/seed.ts:187-188` -> `pool: 'easy', tutorial: true`; `:297-298` -> `pool: 'closing', tutorial: true`.

### R28: pics or it didn't happen
> "doubts (\"pics or it didn't happen\"), and hearts" (line 114)

**SUPPORTED.** The doubts spec defines a Doubt as "one Player publicly asking another to back up a specific marked Prompt—'pics or it didn't happen'" and pins the UI copy to that phrase. Source: `specs/w2-doubts.md:8,57`.

### R29: the three claim modes and the pledge
> "verification stays an event-level knob—pledge, proof-to-mark, or admin-confirmed—defaulting to a one-tap Cross My Heart" (line 38)

**SUPPORTED.** Source: `src/domainTypes.d.ts:12` -> `'honor' | 'proof_required' | 'admin_confirmed'`; `src/data/occasions.ts:64` -> `DEFAULT_CLAIM_MODE: ClaimMode = 'honor'`; `src/components/ProofSheet.tsx:471` -> `🎖️ Cross My Heart`.

### R30: Phase 0 without Cloud Functions
> "Dropping enforcement also let Phase 0 deploy without Cloud Functions at all." (line 40)

**SUPPORTED.** The architecture note says Phase 0 "is Cloud Functions-free … It deploys as static hosting plus Firestore/Storage rules, and runs on the Spark plan." §B10's caveat that function source existed in the tree does not touch "deploy." Source: `docs/architecture/0002-application-architecture.md:21`.

### R31: seven demands, one player, no square attribution
> "pulled seven times in ten days, all by one player" (line 41); "the analytics record seven demand events rather than seven distinct challenged squares, so the two figures do not subtract" (line 42); "every proof demand to one player, seven times, across ten days" (line 134); "pulled seven times by one player" (line 156)

**SUPPORTED.** On the Event's ten Rome days `demand_proof` fires 7 times from 1 distinct person, between 2026-07-18 01:25 and 07-21 22:49 Rome, and the event carries no properties in the taxonomy, so a demand cannot be mapped to a square. Source: PostHog `SELECT event, count(), uniq(person_id) … WHERE event IN ('demand_proof', …)` -> `7, 1`; `read-data-schema {"kind":"event_properties","event_name":"demand_proof"}` -> none.

### R32: offline-first and cold boot
> "An installable PWA over an offline-first Firestore cache. Marks queue locally through dead zones and sync on reconnect, and cold boot works without waiting on the network." (line 47)

**SUPPORTED.** The PWA and `persistentLocalCache` wiring are as §B11 recorded; the cold-boot half shipped as `7f4d065a` "fix(auth): cold-boot the app offline without awaiting network-bound bootstrap (#115)" on 2026-07-09. Source: `git log --first-parent --format='%h %ad %s' --until=2026-07-15` -> `7f4d065a 2026-07-09T02:55:54-07:00`.

### R33: 772, 41 and 73
> "the two records disagree by 73 marks: 845 squares in the frozen Firestore against 772 the analytics logged … 41 marks made after the freeze on the ceremonial card" (line 51; also lines 95, 156)

**WRONG as freeze-relative figures; corrected 2026-10-06 (R13 settled, issue #1133).** The 772 / 41 split is right only as a cut at 21:00 UTC. `mark_square` on the ten Rome days totals 813: 772 before `2026-07-23 21:00 UTC` and 41 at or after it, from 12 distinct persons either way, and 845 − 772 = 73. Those are the instants PR #820 recorded. The live `frozenAt` is `2026-07-24 06:00 UTC` (R13), and the same query cut there, on 2026-10-06, gives 783 before the freeze (11 marks fall between the two instants) and 30 at or after it, from 12 and 5 persons; against that instant the page's three figures become 783, 30 and 62. Both sets were recorded so the page could be corrected in one move; they were left unchanged in nathanpaynedotcom#1130 pending R13, and after the owner settled R13 on 2026-10-06 (issue #1133) the page now carries 783, 30 and 62. Source: PostHog `SELECT count(), countIf(timestamp < toDateTime('2026-07-23 21:00:00','UTC')), countIf(timestamp >= toDateTime('2026-07-23 21:00:00','UTC') AND timestamp < toDateTime('2026-07-24 06:00:00','UTC')), countIf(timestamp >= toDateTime('2026-07-24 06:00:00','UTC'))` on the window -> `813, 772, 11, 30`.

### R34: the September 26 query
> "A September 26 PostHog query found fifteen cruise-era exception events containing auth/network-request-failed, across five recorded sessions for one recorded user on July 18–19. Those sessions contained no recorded marks." (line 51; also line 156)

**SUPPORTED, reproduced.** The query recorded in `plans/the-product-did-not-travel-ledger.md:60-69` returns 15 `$exception` events, 1 person, 5 sessions, across 2 `$device_id` values, between 2026-07-18 01:24 and 07-19 15:34 Rome; a subquery over those five sessions finds 0 `mark_square` events. Source: PostHog `… WHERE event = '$exception' AND toString(properties.$exception_values) LIKE '%auth/network-request-failed%'` -> `15 | 1 | 5 | 2`; `… WHERE event='mark_square' AND properties.$session_id IN (…)` -> `0`.

### R35: the debrief's dinner recall
> "Players' debrief accounts describe recalling previous days together at dinner." (line 51)

**SUPPORTED.** The anonymous cruise debrief (`019ff326-6905-0000-49bb-3f2217fd8677`, "Gay Cruise Bingo—Trieste to Barcelona debrief", 7 submissions) asks for one specific moment the respondent marked a square; three of the seven answers describe a group meal, dinner or lunch, at which the previous day was recalled and marked, and a fourth describes being reminded in a group setting. The respondents are anonymous by request and the survey's own description says so, so this row paraphrases and does not quote. Source: PostHog `SELECT … argMax(toString(properties['$survey_response_514ca7f9-8505-410e-a26b-41ed282c754a']), timestamp) … WHERE event = 'survey sent' … GROUP BY properties.$survey_submission_id` -> 7 rows.

### R36: the skew toward auth and the update path
> "the sailing's commits skew to authentication and the PWA update path, so the update mechanism was one of the two things that actually caught fire while people were playing" (line 50); "The fires were authentication and the PWA update path—the sailing's commits skew to exactly that" (line 97); "what the log does show is a skew toward auth and the PWA update path" (line 144)

**SUPPORTED.** Reading the 96 first-parent subjects, 8 are `fix(auth)`/`chore(auth)` commits and six of those land on 07-15 and 07-16 (first-party mobile sign-in, the web.app handoff, the canonical-origin probe and fallback handler); about a dozen more concern the PWA shell, service-worker cache, cached-card rendering, pull-to-refresh and the remote force-reload floor. By prefix, 37 subjects start `fix` and 25 `feat`, which the page correctly declines to call a classification. The "caught fire" half has a primary record: `specs/w1-board-mark-win.md:37` describes "the 2026-07-17 mark-revert incident (#387)" in which "a rules-deploy/stale-bundle skew rejected every mark batch from sticky PWA shells for two days." Source: `git log --first-parent main --since='2026-07-15T00:00:00+02:00' --until='2026-07-25T00:00:00+02:00' --format='%s' | grep -ciE 'auth|sign-?in'` -> 8; `gh issue view 387` -> opened 2026-07-17T04:47:45Z.

### R37: hearts never touch the score
> "Hearts touch no stats, no leaderboard and no win logic. The only thing they ever produce is a Most-Loved Photo award at the freeze—an award, not a point." (line 56)

**SUPPORTED, near-verbatim.** Source: `specs/feed-hearts.md:12` -> "hearts touch no stats, no leaderboard, no win logic"; `:48` -> "at the Standings Freeze the scheduler computes the **Most-Loved Photo** award".

### R38: nineteen hearts from one person
> "every heart came from one person—nineteen of them" (line 60); "every heart traced to one player, nineteen of them" (line 134)

**SUPPORTED.** `heart_post` fires 19 times from 1 distinct person on the Event window, 2026-07-19 18:51 to 07-24 23:13 Rome. Source: PostHog event rollup (R31 query) -> `heart_post | 19 | 1`.

### R39: frozen seeded deal, no rerolls
> "Cards dealt frozen from a seeded shuffle, with no rerolls." (line 65)

**SUPPORTED as the launch design.** The dealer samples from a seeded RNG into a frozen board; the only later relaxation is the reshuffle, which did not exist until `833d57e1` on 2026-07-17, and which the same row goes on to describe. Source: `src/game/logic.ts:550`; `git log --first-parent --grep='#383'` -> `833d57e1 2026-07-17T10:59:29+02:00`.

### R40: the reshuffle's rules and its name
> "a card with zero marks can be traded for a fresh one, three times per player, and a card you have started cannot … naming the feature a reshuffle and explicitly not a mulligan" (line 69)

**SUPPORTED.** Source: `specs/reshuffle.md:6` -> "pristine-only, 3 per Event"; `:12` -> "*Avoid:* re-deal (that's pool recovery), mulligan"; `:14` -> "a Day Card with zero PLAYER-marked Squares".

### R41: shipped on the sole sea day, with the easy mix
> "It shipped on the sole sea day of the itinerary, alongside easy embark-pool squares blended into main cards." (line 69)

**SUPPORTED.** The seed contains exactly one `Sea Day`, index 2, 2026-07-17; the reshuffle PR #383 merged at 10:59:29 CEST and the easy-mix PR #394 at 19:53:14 CEST that day. Source: `grep -c "Sea Day" src/data/seed.ts` -> 1; `gh pr view 383 --json mergedAt` -> `2026-07-17T08:59:29Z`; `gh pr view 394 --json mergedAt` -> `2026-07-17T17:53:15Z`.

### R42: seven reshuffles by three players, inside the sailing, against a ceiling of 48
> "Seven reshuffles were spent, by three of sixteen players, all inside the sailing." (line 69); "seven uses against a ceiling of 48, which is the roster times the per-player cap of three" (line 134); "the feature did not exist until the sea day, and all seven uses sit inside the sailing" (line 144)

**SUPPORTED for everything PostHog and the spec can carry; the 16 is R10.** `reshuffle_card` fires 7 times from 3 distinct persons, first at 2026-07-18 18:31 Rome, the day after the feature shipped, last at 07-23 12:33, both inside the sailing; the cap is three per Event. Source: PostHog event rollup -> `reshuffle_card | 7 | 3 | 2026-07-18 18:31:05 | 2026-07-23 12:33:50`; `specs/reshuffle.md:6`.

### R43: the designed instants
> "The designed finale ran a last call at 20:00 on the final night and derived the standings freeze to 08:00 the next morning—disembarkation day." (line 73); "it is what the code derives for this event" (line 75); "Freezing three hours after last call" (line 76)

**SUPPORTED.** The finale spec names the standard shape as "20:00 on Day 9 and 08:00 on Day 10," the freeze resolving to the configured `standingsFreezeAt` else "the first ceremonial Day's own `unlockAt`," and the seed's closing Day unlocks at `unlockAt0800Rome('2026-07-24')`. 23:00 − 20:00 = 3 h; 08:00 next day − 23:00 = 9 h. Source: `specs/d15-finale.md:8,31,37,39`; `src/game/logic.ts:1284-1288`; `src/data/seed.ts:291-299`.

### R44: 36% on the final day
> "36% of the cruise's marks landed on the final day, the biggest of the trip" (line 78)

**SUPPORTED.** On the ten Rome days 2026-07-23 carries 293 of 813 `mark_square` events, 36.0%; the next largest day is 07-22 at 111. One precision for the rewrite's judgment: 07-23 is Day 9 (Marseille), the last full day and the night the freeze fell; Day 10, 07-24, carried 36 marks. Source: PostHog per-day rollup -> `2026-07-23 | 293`.

### R45: marks kept arriving on the ceremonial card
> "marks did keep arriving after the freeze—onto a ceremonial card where, by design, they moved nothing" (line 77); "Marks kept arriving afterward on the ceremonial farewell card" (line 78)

**WRONG as a freeze-relative figure; corrected 2026-10-06 (R13 settled, issue #1133).** The 41 is right only as a cut at 21:00 UTC. 41 `mark_square` events fall at or after `2026-07-23 21:00 UTC`, the instant PR #820 recorded; 30 fall at or after the live `frozenAt`, `2026-07-24 06:00 UTC`, from 5 persons (R33). `mark_square` carries no day property, so PostHog cannot say which card received them; the attribution rests on the finale design, under which the closing Day unlocks at the freeze and its marks are excluded from standings, and the live Event document bears that out directly: `days[9].unlockAt` is 08:00 Europe/Rome on 07-24, the same instant as `frozenAt`. The sentence inherited R13 and was removed on 2026-10-06 with the finale decision (issue #1133); the page's remaining post-freeze figure is 30. Source: R33; `specs/d15-finale.md:8`; `curl … /events/med-2026` -> `days[9].unlockAt`.

### R46: the router, written and not attached
> "a wildcard event router built for the edge" (line 82); "attaching the routes stays a deliberate human step" (line 83); "the route config is written" (line 84); "The router fronts no production traffic" (line 87); "a wildcard event router whose routes are written but not attached" (line 152)

**SUPPORTED.** `worker/wrangler.toml:3-7`: "Deliberately deployable but NOT routed. `routes` is commented out below … Attaching the routes IS the cutover, it is a human step." The two wildcard patterns sit at `:110-118` as commented `[[routes]]` blocks and `worker/src/routerBinding.test.ts:263` asserts they stay that way. Source: `grep -n "routes" worker/wrangler.toml`.

### R47: the single-use handoff mechanism
> "centralized authentication with a single-use handoff" (lines 82, 98, 152)

**SUPPORTED as a description of the code.** Source: `functions/src/authHandoff.ts:2` -> "minting a single-use code and exchanging it for"; `:684` -> "The read above and this write are the single-use enforcement."

### R48: tenant isolation and separate projects
> "tenant isolation for that shape has not shipped" (line 82); "Separate events run on separate Firebase projects until the isolation workstream lands" (line 83); "Path-scoped security rules are not tenant isolation, and the repository's own specs say so" (line 85); "Until tenant isolation ships, unrelated groups do not share a backend" (line 152)

**SUPPORTED.** ADR 0008: "The existing Firestore and Storage rules give **path scoping, not tenant isolation**"; `specs/path-addressing-and-root.md:313`: "today's rules are path-scoped, not membership-scoped." The GCB event lives on `gaycruisebingo` (`.firebaserc`) and Bodega Bay on `fiveacross` (`specs/w1-event-seed.md:8`). Source: `docs/adr/0008-five-across-second-firebase-project.md:12,14`.

### R49: 384 of 499
> "384 of 499 sessions—77%—contained no mark at all" (line 91); "Of 499 sessions across the ten days, 384—77%—contained no mark at all" (line 134)

**SUPPORTED.** Source: PostHog `SELECT count(), countIf(marks = 0) FROM (SELECT properties.$session_id, countIf(event='mark_square') AS marks … GROUP BY …)` -> `499 | 384`; 384 ÷ 499 = 76.95%.

### R50: the card at 10:47 and three more features by evening
> "On the morning the ship docked, the work went to the standings rather than the cards: a final-standings share card, committed at 10:47. It was not the last feature of the day—three more landed by evening" (line 92)

**SUPPORTED.** `292f5f0` "feat(share-cards): final-standings card from the farewell podium" is committed 2026-07-24 10:47:50 CEST, Day 10 at Barcelona; three further `feat` commits followed the same day at 12:54 (#456), 15:05 (#447) and 16:54 (#458) CEST, with only `perf`, `chore` and `deps` commits after that. Source: `git log --first-parent main --since='2026-07-24T00:00:00+02:00' --until='2026-07-25T00:00:00+02:00' --format='%h %ad %s' --date=iso-strict`.

### R51: PostHog counts ten
> "PostHog independently counts ten" (lines 94, 132)

**SUPPORTED.** Source: PostHog event rollup -> `bingo | 126 | 10` distinct persons.

### R52: the scoring tests assert embark bingos count
> "The scoring code eliminates the obvious reconciliation—embark bingos do count toward event totals." (line 94); "the scoring tests assert it explicitly" (line 132)

**SUPPORTED.** Source: `src/game/d15-scoring-aggregates.test.ts:77` -> `it('counts the embark (tutorial) card toward the summed totals'`; `:82` -> "Squares/bingos from the embark card DO count".

### R53: the moderation stack, six days out, Vision off by default
> "a moderation stack—server-side auto-hide, an admin roster, a flag-gated Vision check—was finished six days before embarkation" (line 96); "server-authoritative report auto-hide, an admin roster, and a Cloud Vision gate shipped deliberately off by default" (line 124)

**SUPPORTED, with one note.** Auto-hide `7ffc5618` and the "off-by-default `ENABLE_VISION_MODERATION` flag" `68c67513` both landed 2026-07-09, six days before 07-15, and `EventDoc.admins` is the roster. A runtime fix to the Vision gate's settings path (`758ed3a5`, #284) followed on 07-13, so "finished" is true of the components and slightly generous about their polish. Source: `git log --first-parent --format='%h %ad %s' --until='2026-07-15T00:00:00+02:00' -i --grep='auto-?hide\|vision'`.

### R54: the repository's silence on moderation
> "No record the repository keeps shows any of it being exercised during the sailing." (line 124); "the moderation stack stayed quiet in every record the repository keeps" (line 97)

**SUPPORTED, and the control shows the silence is uninformative.** Greps across `docs/`, `plans/` and `specs/` find no narrative of a report, a hide or a ban during the sailing. The control fails in the page's favour: the repository also keeps no record of the one live-ops act everyone agrees happened, the freeze move (`git grep -i "23:00"` returns only CI noise), so absence of a moderation record is what this tree would show whether or not moderation was exercised. PostHog's window taxonomy carries no report or hide event either, because none is instrumented; `attach_proof` (87) is the nearest neighbour. The page's own framing, "its record is silence," is the right one. Source: `git grep -n -i -E "auto-?hid(den|e)|was reported" -- docs plans` (spec and wireframe hits only); PostHog event list in window.

### R55: no bingos on embark day
> "none of them landing on embark day itself" (line 132)

**SUPPORTED.** Source: PostHog per-day rollup -> `2026-07-15 | bingos 0`.

### R56: twelve markers, nine on five or more days
> "PostHog, which logs fewer marks than the database holds and sees twelve markers, has nine of those twelve marking on five or more days" (line 134)

**SUPPORTED.** Source: PostHog `SELECT count(), countIf(days >= 5), arraySort(groupArray(days)) FROM (SELECT person_id, uniq(toDate(toTimeZone(timestamp,'Europe/Rome'))) AS days …)` -> `12 | 9 | [1, 1, 3, 5, 5, 6, 7, 7, 7, 7, 8, 10]`.

### R57: the board sorts bingos first
> "finished second, because the board sorts bingos first. The rule, not volume, crowned the champion." (line 136)

**SUPPORTED.** Source: `src/game/logic.ts:1106-1108` -> `if (b.bingoCount !== a.bingoCount) return b.bingoCount - a.bingoCount; if (b.squaresMarked !== a.squaresMarked) …`.

### R58: the final-standings image alt
> "The app's own final-standings share card, showing the standings as frozen at 23:00 on the last night, with champion Zacaria Arab at 16 bingos and 124 squares, Turntilla's cruise-wide First to BINGO, and the ten daily honors spread from Trieste to Barcelona." (line 138)

**SUPPORTED for what the image shows.** The card reads "FINAL STANDINGS", "CRUISE CHAMPION ZACARIA ARAB 16 bingos · 124 squares", "FIRST TO BINGO TURNTILLA", and ten "DAILY HONORS" rows from Day 1 Trieste to Day 10 Barcelona. The card does not display a freeze time; "as frozen at 23:00" is R13. Source: image inspection of `public/images/projects/five-across-final-standings.png`.

### R59: ninety-six first-parent commits
> "Ninety-six changes landed on main between embarkation and disembarkation, counting first-parent commits between the Rome midnights that bound the sailing." (line 144; "ninety-six changes landed" line 156)

**SUPPORTED, and the stated rule reproduces it.** Source: `git log --first-parent main --since='2026-07-15T00:00:00+02:00' --until='2026-07-25T00:00:00+02:00' --oneline | wc -l` -> 96 (reachable: 98).

### R60: two calls made at sea
> "two of the calls below were made at sea while the event was live" (line 122)

**WRONG after R13; corrected 2026-10-06.** The reshuffle (D4) shipped on the sailing's sea day, 2026-07-17 (R41). The first read counted the freeze (D5) as a second at-sea call, moved on 2026-07-23; R13 shows, and the owner confirmed, that the freeze was never moved, so only one call was revised at sea. The page now reads "one of the calls below was revised at sea while the event was live", and the "the freeze" entry in the later list of product calls is removed.

### R61: agents, and reviewed pull requests
> "The build ran on agents against a fixed date" (line 146); "The mid-cruise drops landed as reviewed pull requests." (line 146); "Agents expanded build, test, and review capacity under the eight-day fuse and then at sea" (line 146)

**SUPPORTED.** Of the 85 pull requests merged between the Rome midnights, 79 carry an `Authoring-Agent:` field; the three named drops each carry CodeRabbit and Codex review comments and a `nathanpayne-codex` APPROVED (#383: 20 reviews; #394: 13; #450: 8). Eleven first-parent commits in the window have no PR reference, and all are plans, wireframes or spec documents plus one review-policy toggle (`23fd0c56`); the twelfth is an unsquashed merge of PR #328. Source: `gh pr list --repo nathanjohnpayne/fiveacross --state merged --search "merged:2026-07-14T22:00:00Z..2026-07-24T22:00:00Z" --json body` -> `total=85 with_agent=79`; `git show --stat` on each PR-less commit.

### R62: specs, ADRs and executable acceptance criteria
> "Specs pin behavior down to the finale's exact instants; ADRs record the calls that were hard to reverse—on-device share rendering, offline persistence, a second Firebase project as the interim tenant boundary; the test suites are acceptance criteria that execute, from contrast computed out of the shipped CSS across every theme to a launch-checklist test that pins embarkation day." (line 146)

**SUPPORTED.** `specs/d15-finale.md:8` names 20:00 Day 9 and 08:00 Day 10; ADR 0005 (client-side share images), 0006 (offline resilience) and 0008 (second Firebase project) exist; `src/theme/w1-themes.test.tsx` reads `themes.css` with `readFileSync` "so this test can never drift from the CSS it polices"; `src/test/x-launch-checklist.test.ts:15` is titled "seeded sail window (embarkation 2026-07-15)". Source: `ls docs/adr/`; `grep -n "readFileSync\|themes.css" src/theme/w1-themes.test.tsx`.

### R63: Gay Cruise Bingo as the default live edition, Vacay as the travel edition
> "Gay Cruise Bingo is preserved as the original and still runs as a live edition, the default one, on its own domain against its own Firebase project; Vacay Bingo is the travel edition; Five Across is the platform under both." (line 150)

**SUPPORTED.** Source: `src/edition-brands.ts:31` -> `DEFAULT_EDITION = EDITION_IDS.GAY_CRUISE_BINGO`; `:35` -> `wordmark: 'GAY CRUISE BINGO'`; `:126` -> `wordmark: 'VACAY BINGO'`; `.firebaserc` -> `"default": "gaycruisebingo"`; `curl -sI https://gaycruisebingo.com` -> 200.

### R64: the Sonoma Coast weekend, a different host, opening-day fixes
> "The first non-cruise event, a Sonoma Coast weekend in August 2026 run by a different host, has since run on that build, live enough that unlock-copy fixes landed on its opening day." (line 150)

**SUPPORTED.** The seed names `Bodega Bay`, `startsOn: '2026-08-07'`, `endsOn: '2026-08-09'`, `timezone: 'America/Los_Angeles'`, and the PRD calls it "this Sonoma Coast weekend." The event document on the `fiveacross` project lists two admins: the site owner's account, whose player row holds 0 squares, and a second account whose row holds 15, and PostHog carries a "Bodega Bay host debrief" survey with one submission addressed to that host. Three unlock-copy fixes merged on 2026-08-07: #669 (locked-day caption hour), #673 (warm-up line unlock day and hour) and #675 (spell the meridiem). Source: `scripts/seed-data/bodega-bay-2026.mjs:195-213`; `docs/projects/gaycruisebingo/prds/fiveacrossbingo.md:95`; Firestore `events/bodega-bay-2026` `admins` (2) and `players`; `git log --first-parent --since='2026-08-07T00:00:00-07:00' --until='2026-08-08T00:00:00-07:00'`.

### R65: four people, 27 squares, no bingo, last marks Saturday morning
> "four people marked 27 squares, nobody got a bingo, and the guests' last marks came on Saturday morning" (line 150)

**SUPPORTED, re-derived from the second event's production Firestore.** `events/bodega-bay-2026/players` holds seven rows with `squaresMarked` 6, 0, 4, 2, 15, 0, 0 and `bingoCount` 0 on every row: four markers, 27 squares. The board documents' marked cells agree for the event window and date them: the three guest markers' last marks fell on Saturday 2026-08-08 at 09:46:54, 09:55:21 and 09:57:40 PDT, the host's at 12:57:11 PDT, and the event froze Sunday 11:00 PDT. Six further marked cells belong to the owner's account and are stamped 2026-09-25, outside the event. Source: `curl … /documents/events/bodega-bay-2026/players` and `…:runQuery` over `boards` with `allDescendants`, `markedAt` converted with `TZ=America/Los_Angeles date -r`.

### R66: fifteen of twenty-two themes, all contrast-tested
> "fifteen themes shipped for the cruise—thirteen party plus two tutorial—out of twenty-two now across the platform, every one held to WCAG AA contrast by test suites that compute contrast from the CSS itself" (line 150)

**SUPPORTED.** `THEME_EDITIONS` binds thirteen party themes and the `welcome-aboard` and `so-long-farewell` tutorial themes to GCB, three to Vacay, three plus one chrome theme to Five Across: 15 + 3 + 4 = 22, matching the 22 `[data-theme=` blocks in `themes.css`; the spec says "the fifteen Gay Cruise Bingo Themes are `gcb`" and that the set "started as the eight Atlantis party Themes" before growing. `w1-themes.test.tsx` parses that CSS against `TEXT_MIN = 4.5`. Source: `sed -n '272,298p' src/theme/themes.ts`; `grep -c "^\[data-theme=" src/theme/themes.css` -> 22; `specs/w1-themes.md:5,19`.

### R67: began as Gay Cruise Bingo; a multi-event platform
> "Five Across began as Gay Cruise Bingo" (line 114); "generalizing into a multi-event platform" (line 4)

**SUPPORTED.** The repository's second commit is "chore: add .firebaserc for the gaycruisebingo Firebase project" and its Phase 0 scaffold is "Gay Cruise Bingo Phase 0 app scaffold (#1)"; the founding PRD now reads "This is the founding PRD for the Gay Cruise Bingo Edition; the platform is now Five Across." Three editions and two run events exist. Source: `git log --reverse --format='%h %ad %s'` first five; `docs/projects/gaycruisebingo/prds/gaycruisebingo.md:21`.

### R68: the stack line
> `stack: "React · TypeScript · Vite · Firebase · Cloud Functions · Cloudflare Workers · PostHog"` (line 24)

**SUPPORTED, as §B24 found and nothing has changed.** Cloudflare Workers remains deployable code that fronts no production traffic (R46, R17). Source: §B24; `worker/wrangler.toml:3`.

### R69: a feature drop that reached phones mid-sailing
> "a feature drop that reached phones mid-sailing" (line 156)

**SUPPORTED.** The reshuffle shipped 2026-07-17 10:59 CEST and `reshuffle_card` events begin 2026-07-18 18:31 Rome, so that build demonstrably reached players during the sailing. Source: R41; R42.

## Cross-page notes

No cross-page inconsistency was found: the page's only cross-references are the two `related` links, and the sibling blog post's ledger (`plans/the-product-did-not-travel-ledger.md`) carries the same 288/703, 32%, fifteen-exception and 09:57 figures this ledger reproduces or attributes. One upstream lag worth a follow-up in the app repository rather than on this site: ADR 0010's header (edited 2026-09-09) still says the handoff-mode deploy is pending, while the live `fiveacross.app` bundle is built from a tree at or after 2026-10-05 under a target that forces handoff mode (R7).

## Method notes

- PostHog figures were re-run on the Event's own ten days in `Europe/Rome` (UTC `2026-07-14 22:00` to `2026-07-24 22:00`), the window §BM2 declared, and every figure the page prints from PostHog reproduced exactly: 499/384, 813/772/41, 12 markers, 9 at five-plus days, 7/1 demands, 19/1 hearts, 7/3 reshuffles, 10 bingo persons, 293 on 07-23, 15/1/5 exceptions with 0 marks in those sessions.
- The `gaycruisebingo` Firestore returned `PERMISSION_DENIED` on the audit's first read because the stored `firebase-deployer@fiveacross` credential was used against the wrong project; the same day's re-read with `firebase-deployer@gaycruisebingo` (also in `gcloud auth list`) succeeded, and R9 to R16 carry the re-derived verdicts in place. The `fiveacross` Firestore was readable at the first attempt, so the Bodega Bay figures were re-derived from the start.
- The debrief survey responses were read to verify R35 and are paraphrased with counts only; the survey is anonymous by request.

## Fixes applied

Applied 2026-10-06 to `src/content/projects/five-across.mdx` on `claude/correctness-pass-2026-10-06`, per `FIX-BRIEF.md` and the coordinator's instructions (R1–R8 as recommended; R17, R18, R19 to the weaker forms; R9–R16 left attributed). `vale --minAlertLevel=error` exits 0. No test assertion pins the alt text, the constraint values or any changed phrase (`grep -rn` over `tests/` for "Welcome Aboard", "Satellite", "uncommented block", "not yet reachable", "deploy record" finds nothing), so no test was changed. No text was cut for length, so `verify-brevity` was skipped.

- R1: alt "showing a Welcome Aboard bingo grid for a Trieste sailing" -> "a Day 1 card in the Neon Playground theme for a Trieste sailing, rendered by the marketing harness" (line 13).
- R2: "Every new event needs its own Firebase project" -> "Every new event for an unrelated group needs its own Firebase project" (line 86).
- R3: "no deploy record survives for that window" -> "no deploy log survives in the repository, only an incident note recording one mid-sailing rules deploy and its two days of stale-shell fallout" (line 144).
- R4: quotation ending "on the same engine as Vacay." -> "on the same engine as Vacay…" (line 150), marking the cut.
- R5: "What resolves it: the tenant-isolation rules workstream, the IAM provisioning the handoff needs, and the deliberate act of attaching the routes" -> "What resolves it: the tenant-isolation rules workstream and the deliberate act of attaching the routes", with the handoff dated "provisioned by 2026-09-10 and live in the client as of 2026-10-06" (line 87).
- R6: "implemented and gated on provisioning" -> "implemented, provisioned by 2026-09-10, and live in the client as of 2026-10-06" (line 98).
- R7: "the auth handoff is implemented but not yet reachable, so there is no behavioral evidence either way" -> "the auth handoff, provisioned by 2026-09-10 and live in the client as of 2026-10-06, has carried no demonstrated sign-in, because registered hosts still sign in direct; there is no behavioral evidence either way" (line 87); "Two pieces sit built and parked one human step short: … implemented but not yet reachable" -> "Two pieces sit short of use: … one human step short, and centralized authentication with a single-use handoff, live in the client as of 2026-10-06 but untraversed, because registered hosts still sign in direct" (line 152).
- R8: "The worker is deployed and tested, the route config is written, and cutover would be one uncommented block" -> "The worker is deployable and tested, the route config is written, and as of 2026-10-06 cutover would be two uncommented blocks, one per zone" (line 84; this also applies R17's weaker form); rationale "One uncommented block is exactly the kind of change" -> "Uncommenting a route block is exactly the kind of change" (line 85) so the two fields agree.
- R17: "deployed and tested" -> "deployable and tested" (line 84, folded into R8's edit).
- R18: constraint value "Satellite" -> "Ship Wi-Fi" (line 28); "The venue was a ship: satellite internet, dead zones at sea, a metal hull." -> "The venue was a ship: flaky, expensive Wi-Fi and dead zones at sea." (line 46; "dead zones" kept because ADR 0006 uses the term).
- R19: "on a schedule players had already been given. Anyone holding a square for disembarkation morning lost it without notice" -> "on the schedule the app's own design derived. Anyone holding a square for disembarkation morning lost it" (line 77).
- R9–R16 (the `gaycruisebingo` Firestore figures): left as they are, per instruction, since each is attributed to Firestore, "the frozen event" or "the marking data" except the champion and per-card lines; the single attribution "as recorded in the sailing's own data read" was added once, to the section opener at line 130, which covers the 23:00 freeze (R13) and every figure in "What happened" (R9, R10, R11, R12). The per-card pins inside the D4 and D5 evidence fields (R11, R14, R15) and the 288/703 and 32% figures (R16) remain attributed only by their surrounding wording; a second insertion was not made, per "once".
- R20–R69 (SUPPORTED): no change.

Applied 2026-10-06 in nathanpaynedotcom#1130, after the same-day re-derivation from the `gaycruisebingo` Firestore (access correction above):

- R11: "27 bingos from eleven players" -> "27 bingos from seven players" (line 132); the "record argues with itself" passage dropped and the decisions-table "They disagree" observed/response rows (lines 94–95) rewritten around the one disagreement that remains, 845 squares against 772 analytics marks, since seven on the embark card inside ten event-wide is no disagreement.
- R3: the clause gains "though Firebase Hosting's release history records 41 deploys between those same midnights" (line 144), from the Hosting releases API read with the project's deployer account.
- R13 alt text: "showing the standings as frozen at 23:00 on the last night" dropped from the share-card alt (line 138); the card prints no freeze time.
- R13, R19, R33, R45: owner decision 2026-10-06 (issue #1133): the freeze was not moved during the sailing, so the page adopts the record's 08:00 Europe/Rome instant. 772 / 41 / 73 -> 783 / 30 / 62 (the analytics comparison, the volume learning and the offline paragraph), which also makes the "same window" comparison #1133 flagged true; the "End the race on the last night" decision (its "23:00 … nine hours early" choice, the "nine hours of play disappeared" cost and its evidence) is removed; "frozen … at 23:00 on the last night" -> "at 08:00 on disembarkation morning"; the "overridden while the event ran" sentence and "a finale rescheduled while it ran" are removed.
- R60: "two of the calls below were made at sea" -> "one of the calls below was revised at sea" (only the reshuffle; the freeze was never moved), and "the freeze" dropped from the later list of product calls.
