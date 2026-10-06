# Facts ledger, 2026-10-06 correctness pass: `override`

Page source: `src/content/projects/override.mdx` (worktree HEAD `72d0949`, identical to `main`; page last changed `d217fd8`, 2026-09-11; the audited prose was written 2026-08-28 in `64f6a89`..`71c4f57`). Surface: `https://nathanpayne.com/projects/override/` (fetched 2026-10-06; its text matches the source on every sentence checked). Retrieval timestamp for every API figure: 2026-10-06. Prior ledger: `plans/759/project-pages-ledger.md` §F (F1–F43, pinned to `d652b86`, 2026-08-28).

Evidence checkout: `~/GitHub/overridebroadway` at `origin/main` = `d79d45c` (2026-10-05), 217 commits, 44 of them after the prior ledger's pin. Three of those matter to this page and are named below where they bite: `a8fc533` (#180, 2026-09-30, deal-room rules rewrite and published-field allowlist), `ed9e03f` (#181, 2026-09-30, app CI and new test files) and `227eedb` (#191, 2026-10-04, callable mutation backend, server-allocated share tokens). `src/lib/model/` is untouched by all 44. The hub is `~/GitHub/mergepath` at `57292ea`; Override has been a manifest consumer since `d57c940` (2026-05-04).

One read this session could not make: the production Firestore `dealRooms` collection. The prior ledger read it on 2026-08-28 through the deployer service account resolved from 1Password; that path needs a biometric prompt, and the on-disk gcloud ADC (`authorized_user`, quota project `gaycruisebingo`) returned no token. Rows R4 and the "producer note" clause of R33 are therefore "last reproduced 2026-08-28", not reproduced today.

## Summary

| # | Claim (verbatim, abbreviated) | Location | Verdict | Corrected value or weaker form | Source |
|---|---|---|---|---|---|
| R1 | "because this demonstration never recoups" | :109 alt text | WRONG | "because this demonstration does not recoup at its base-case assumptions"; the page's own :98 exhibit shows the Bull case recouping in week 20 | `override-scenarios.png`; `DealRoomView.tsx:490` feeds `baseOutput` to the split chart |
| R2 | "Eighty-six tests pass" | :115 | STALE | 109 pass in `npm test` today (7 files), plus a separate 60-test emulator-backed rules suite; changed 2026-09-30 (#180, #181) and 2026-10-04 (#191) | `npx vitest run` → `Tests 109 passed (109)`; `vitest.config.ts` excludes `tests/rules/**` |
| R3 | "Investor's seat / the only domain access"; "the side of the table that only ever sees the second view" | :23-24, :90 | UNPROVABLE | First-person; defensible as the author's own account | no repository artifact records the author's role |
| R4 | "1 deal room / in production, a demonstration"; "The only deal room in production is a demonstration built with sample figures" | :25-26, :129 | UNPROVABLE (today) | "As of 2026-08-28 the production database held exactly one deal room, a demonstration whose producer note calls every figure a placeholder"; not re-read today, and open #183 means that legacy room may now fail closed for non-owners until re-saved | prior ledger F39 (Firestore REST, 2026-08-28); `firestore.rules:86-95`; issue #183 (open) |
| R5 | "Override has never run a real deal: no real capitalization managed in it, no outside investor admitted, no deal-room link sent to a backer" | :129, :6 | UNPROVABLE | Keep the page's own scoping clause as the claim (see R41); the analytics event that could settle it was never queried and since #180 logs a production id rather than a token | `src/lib/analytics.ts`; #180 body |
| R6 | The first-person history: "I wanted to know how far I could get", "The first position I tracked arrived as three documents", "Three months later the cap table and the term sheet disagreed", "Products like Carta had shown me", "I named it after a line in the waterfall", decision contexts | :76, :78, :82, :86, :30, :38, :47 | UNPROVABLE | Defensible only in the first person, as written | `git grep -in 'carta\|angellist' origin/main -- src docs specs rules README.md AGENTS.md` → 0 |
| R7 | "The override, as I learned the word, is the producer's percentage taken off the top … immediately legible to any producer who has negotiated one" | :86 | UNPROVABLE | Industry usage is not checkable here; what is checkable is that the product ships the term as a GP economic applied before the waterfall | `WaterfallSection.tsx:478` "GP Flat Overrides (optional)"; `calculations.ts:223-229` |
| R8 | "Most of the code is agent-written" | :121 | UNPROVABLE | "The application arrived in a commit titled 'Updates via Claude Code'"; 80 of 217 commits carry a Claude co-author trailer | `git show -s --format=%s 478a7ed`; `git log --format=%b \| grep -c 'Co-Authored-By: Claude'` → 80 |
| R9 | `liveUrl: "https://overridebroadway.com"`; `status: "SHIPPED"` | :12, :15 | SUPPORTED | HTTP 200; live build id 1791133330557 = 2026-10-04T16:22:10Z, deployed after #191 merged | `curl -sI`; `curl /_build_id.txt` |
| R10 | `githubUrl: ".../nathanjohnpayne/overridebroadway"` (public) | :13 | SUPPORTED | visibility public, not archived, pushed 2026-10-05 | `gh api repos/nathanjohnpayne/overridebroadway` |
| R11 | `stack: "Next.js · TypeScript · Tailwind · Firebase · Recharts · Vitest"`; tags React, Firebase | :19, :14 | SUPPORTED | next ^16.3.8, typescript ~6.0.3, tailwindcss ^4, firebase ^12.19.0, recharts ^3.10.1, vitest ^5.0.3, react 19.3.0 | `package.json:22-61` |
| R12 | `format: "Financial operating system"` | :17 | SUPPORTED | The repo's own phrase is "financial operating platform" | `README.md:3` |
| R13 | `related`: three links | :62-68 | SUPPORTED | all three targets exist | `src/content/blog/agent-approval-workflow-genesis-of-mergepath.md`, `projects/mergepath.mdx`, `projects/friends-and-family-billing.mdx` |
| R14 | "share deal terms with investors through a read-only deal room" | :5 | SUPPORTED | | `firestore.rules:92-101` |
| R15 | "6 days / scaffold to the whole-app commit"; "the whole application arrived in a single commit six days after the scaffold" | :21-22, :121 | SUPPORTED | 5 d 20 h by clock, six calendar days; 91 files, +19,674/−837, 75 paths under `src/` | `bfdb5d6` 2026-02-18 14:09 −0800; `478a7ed` 2026-02-24 10:09 −0800 |
| R16 | "The agent brief and the application arrived in the same commit, with Broadway benchmarks and their industry sources encoded into the instructions from the first day" | :34 | SUPPORTED | | `478a7ed` created `CLAUDE.md`; `:575` sources, `:589` Hadestown check, `:655` 947-seat table |
| R17 | "The engine has not been revisited since the product window closed" | :33 | SUPPORTED | `src/lib/model/` has exactly one commit in its history | `git log origin/main -- src/lib/model` → `478a7ed` only |
| R18 | "the same engine computes the producer's view and the investor's"; alt "computed by the same engine the producer's own model runs" | :43, :94 | SUPPORTED | | `DealRoomView.tsx:29` and `ProductionHubClient.tsx:15` both import `runScenario`; `DealRoomView.tsx:490` reuses `WaterfallFlow` |
| R19 | "Override cannot represent a bespoke waterfall provision" | :42 | SUPPORTED | true by construction: the waterfall is a two-value union with no free-form field | `src/types/deal.ts:23` |
| R20 | "Bear, Base and Bull side by side, each with editable occupancy, ticket price and run length, re-running as you type, plus a sensitivity grid across occupancy and run length"; "an approximate IRR, breakeven occupancy, and a sensitivity grid that re-runs the model across a matrix of occupancy rates and run lengths" | :48, :92 | SUPPORTED | | `ProductionHubClient.tsx:1569,1577,1582`; `scenarios.ts:110-113,147-151`; `model.ts:50-51` |
| R21 | "The array is fixed at Bear, Base and Bull with no add and no remove" | :51 | SUPPORTED | | `ProductionHubClient.tsx:394`, `:614-615` (the only mutator) |
| R22 | "There is no billing, no team accounts, no lead pipeline, and the investor-facing surface deliberately has no accounts at all" | :57 | SUPPORTED | (the landing page copy advertises an "investor CRM" the product does not have; repo-internal, not the page's error) | `git grep -i 'stripe\|billing\|teamId' origin/main -- src` → 0; `page.tsx:48`; no auth import under `src/app/deal-room` |
| R23 | "the lead CRM and the signing workflow, are exactly the ones that stayed unbuilt" | :59 | SUPPORTED | both are on the PRD's "planned but not yet implemented" list (with three others) | `docs/projects/overridebroadway/prds/overridebroadway.md:478-483` |
| R24 | "eleven royalty participants" (twice) | :90, :92 | SUPPORTED | | `src/types/deal.ts:8-20` |
| R25 | "First-time users can walk it as a guided stepper; experienced ones get every section at once, which is the default" | :90 | SUPPORTED | | `DealBuilderNav.tsx:75`; `dealStore.ts:28` `guidedModeActive: false` |
| R26 | "the dashboard's primary control is a My Productions / My Investments toggle" | :90 | SUPPORTED | | `src/app/(app)/dashboard/page.tsx:139,145` |
| R27 | Deduction order: gross → CC fees + house → adjusted gross → royalties → weekly nut → GP fee → "What survives is operating profit, and only then does the waterfall run" | :92 | SUPPORTED | Caveat: the shipped UI labels the pre-GP-fee subtotal "Operating Profit", and the page's :94 alt text follows the UI; the prose follows the engine variable | `calculations.ts:182-234`; `WaterfallFlow.tsx:175-178` |
| R28 | "Two structures ship"; crossing-week split; share-from-dollar-one "alongside recoupment from the first performance" | :92 | SUPPORTED | | `deal.ts:23`; `calculations.ts:125-171` |
| R29 | Waterfall exhibit alt text (cascade as an investor sees it) | :94 | SUPPORTED | image: $911,400 → −$82,026 → $829,374 → −$151,242 → −$650,000 → $28,132 → −$5,563 → $22,569, at Base occupancy 75.0% | `public/images/projects/override-waterfall.png`; `DealRoomView.tsx:490` |
| R30 | "There is no account to create, no invitation to accept, and no portal to log into—the prospective investor opens a URL and reads the deal" | :96 | SUPPORTED | Still true of the route and the rules after #180/#191; legacy rooms written by the old client can fail closed (#183) | `firestore.rules:92-95`; `DealRoomClient.tsx:7,29`; `git grep useAuth origin/main -- src/app/deal-room` → 0 |
| R31 | "a snapshot taken at the moment it was shared, not a live feed" | :96 | SUPPORTED | | `firestore.ts:308-313` (`getDoc`); `DealRoomSetup.tsx:248,526` "Update Snapshot" |
| R32 | Scenarios exhibit alt: "Bear and Base never recoup … Bull recoups in week 20 and returns $3.4M" | :98 | SUPPORTED | image: Bull "Week 20", "$3,405,615" (0.68×, −42.0% IRR); snapshot dated 6/30/2026 | `public/images/projects/override-scenarios.png` |
| R33 | "the room's own producer note calls every number a placeholder" | :98 | SUPPORTED as of 2026-08-28 | see R4; the note was quoted verbatim from the live document on that date and not re-read today | prior ledger F39 |
| R34 | Profit-split alt: "forty-five cents to the limited partners, five to the GP, fifty to creatives", carve from the investor pool | :109 | SUPPORTED | | image 45.0/5.0/50.0; `calculations.ts:127-135`; defaults `deal.ts:114,120` |
| R35 | Hadestown calibration: "947 seats, 93% occupancy, a $155 average ticket, a $530K weekly nut, 14% royalties"; "six months after it was written"; "nothing in CI holding it in place"; "$1,046,283 weekly gross, 57.0% breakeven, recoupment in week 37" | :113 | SUPPORTED | re-executed today against `origin/main`: $1,046,283 / 57.0% / week 37 | `docs/agents/reference.md:120`; `478a7ed:CLAUDE.md:589` (2026-02-24); scratch run of the extracted engine |
| R36 | "only eight touch the engine and every one enters through the same file, so the weekly pipeline, the phase function and the ownership rollup have no direct test at all" | :115 | SUPPORTED | | `tests/deal-builder.test.tsx:190-297` (8 `it()`); `git grep 'lib/model' origin/main -- tests` → `scenarios` only; `deal-rooms.test.tsx` imports `runScenario` and calls it 0 times |
| R37 | "Two assertions check money against the inputs, both of them pool percentages; the ones that look like proof check the engine against its own output" | :115 | SUPPORTED | | `deal-builder.test.tsx:251,255` vs `:208`; guards `:216,:258,:267,:278` |
| R38 | Phase/toggle divergence: phase reads the split, distribution math reads the toggle, badge "Profit Sharing Active" while investors get nothing, deal room shows 50%, repo records it and says preserve | :117 | SUPPORTED | re-executed today: toggle off, split 0.5 → investors $0, creatives $16,556,572, badge "Post-Recoup · Profit Sharing Active"; open as #139 | `waterfallPhase.ts:94` (toggle refs `:7,:34,:73` are comments); `calculations.ts:232`; `DealRoomView.tsx:422-424`; `reference.md:142` |
| R39 | "five files with no React and no Firebase import"; "No lint rule, no import restriction, no CI check polices it; it holds because the rules files say so" | :119 | SUPPORTED | control: `react-hooks` is present in `eslint.config.js:8`; `no-restricted-imports` 0 files repo-wide; `lib/model` 0 in `.github`, `scripts`, eslint configs | `git ls-tree origin/main -- src/lib/model/`; `code-modification-rules.md:64` |
| R40 | "the repo's rules name the three engine files as its highest-risk zone, while the automated review gate watches auth and payments directories that do not exist" | :121 | SUPPORTED | precise form: first three of seven rows under "High-Risk Modification Zones"; the superlative is the page's; open as #141 | `rules/repo_rules.md:46-58`; `.github/review-policy.yml:26-31`; `git ls-tree -d origin/main -- src/auth src/payments` → empty |
| R41 | "nothing in the repository or its issue history that suggests otherwise"; "still untested on a real capitalization" | :129, :6 | SUPPORTED | 63 new items (#139–#201) swept, zero real-use hits; control `deal room` → 6 hits | `gh api graphql` issues+PRs ≥139, titles and bodies |

Verdict counts: WRONG 1, STALE 1, UNPROVABLE 6, SUPPORTED 33 (R33 is SUPPORTED on its stated date). 41 rows.

### Cross-page rows (the claim is on `mergepath.mdx:206`, about Override)

| # | Claim (verbatim) | Location | Verdict | Corrected value or weaker form | Source |
|---|---|---|---|---|---|
| X1 | "Override—whose engine was built a month before any of this existed" | `mergepath.mdx:206` | SUPPORTED | engine 2026-02-24, hub's first commit 2026-03-24: one calendar month | `478a7ed`; mergepath `b9734df` |
| X2 | "has run every change since on the fleet's review path" | `mergepath.mdx:206` | WRONG | 29 commits landed on `main` without a pull request since 2026-03-24, seven of them after Override joined the hub manifest (2026-08-21 ×5, 2026-08-27, 2026-08-28), none touching `src/`. Defensible: "has landed every product change since through the fleet's review path; the direct pushes that remain are documentation and template-sync commits, the last on 2026-08-28" | `git log --first-parent origin/main --since=2026-03-24`; `gh api repos/.../commits/{sha}/pulls` → `[]` for all seven (control `a8fc533` → #180) |

## Rows

### R1: "never recoups" is one quantifier too wide
> "The callout is the model declining to flatter the deal, because this demonstration never recoups." (line 109)

**WRONG.** The callout in `override-profit-split.png` reads "The show does not recoup within the estimated run—post-recoup profit distributions are $0," and it belongs to one modeled case: the deal room passes `baseOutput` to `WaterfallFlow` (`src/app/deal-room/DealRoomView.tsx:490`), and the waterfall exhibit on the same page is captioned "Occupancy 75.0%", which is the Base case (`scenarios.ts:149`). The page's own :98 exhibit, `override-scenarios.png`, shows the same demonstration's Bull case with "Recoup week: Week 20" and "$3,405,615" of investor distributions. So the demonstration does recoup under one of its three cases; what never recoups is its base case. Source: `public/images/projects/override-scenarios.png` (Bull card) -> `Week 20`; `DealRoomView.tsx:490` -> `<WaterfallFlow modelOutput={baseOutput} …>`. Corrected value: "because this demonstration does not recoup at its base-case assumptions."

### R2: eighty-six tests
> "Eighty-six tests pass, but only eight touch the engine" (line 115)

**STALE.** Eighty-six was exact at the prior pin (`d652b86`, F26). Today `npx vitest run` in the checkout at `origin/main` reports `Test Files 7 passed (7)` / `Tests 109 passed (109)`; the two new files are `tests/firestore-listeners.test.ts` and `tests/production-hub-load-error.test.ts`, and `tests/deal-rooms.test.tsx` grew from 26 to 34 cases. A second suite now exists and is not in that number: `tests/rules/{backend,firestore,storage}.rules.test.ts` carry 16, 36 and 8 cases by static count (60), run only through `npm run test:rules` against the Firebase emulators (`vitest.rules.config.ts`; `vitest.config.ts:9` excludes `tests/rules/**` from `npm test`). The change dates are 2026-09-30 (`a8fc533` #180 added the rules suite and snapshot-builder tests; `ed9e03f` #181 added app CI) and 2026-10-04 (`227eedb` #191 added `backend.rules.test.ts`). Source: `npx vitest run` (2026-10-06) -> `109 passed`; `git show origin/main:vitest.config.ts`. The sentence that follows it ("only eight touch the engine …") is still exact (R36), so the fix is the one number plus, if wanted, a clause for the emulator suite.

### R3: the investor's seat
> "Investor's seat / the only domain access" (lines 23-24); "I built this from the side of the table that only ever sees the second view" (line 90)

**UNPROVABLE.** This is the author's account of his own position. The repository records that the dashboard has an investments view and that productions were created in the author's account (issue #12 names five), but nothing in it records what access the author had to the industry. Defensible weaker form: as written, first person.

### R4: one deal room in production
> "1 deal room / in production, a demonstration" (lines 25-26); "The only deal room in production is a demonstration built with sample figures." (line 129)

**UNPROVABLE from this session's sources; SUPPORTED on 2026-08-28.** The only primary source is the production Firestore `dealRooms` collection. The prior ledger (F39) read it on 2026-08-28 through the repository's deployer service account and found exactly one document, `isActive: true`, `production.name` "The Show - Demo!", with a producer note calling every figure a fictional placeholder. That read requires a biometric 1Password resolution and was not repeated today; the on-disk gcloud ADC is an `authorized_user` credential against another project and returned no token. Two things have changed since that date and bear on the row. First, `a8fc533` (#180) rewrote the read rule: a non-owner `get` now also requires `publishable(resource.data)` (`firestore.rules:82-95`), and the rule's own comment says rooms "written before that was enforced fail closed for non-owners until re-saved"; issue #183, "One-time sanitize of legacy deal rooms after the #180 rules deploy", is open, and the demonstration room was created 2026-06-30 by the old client. Second, `227eedb` (#191) moved deal-room creation to a callable backend, so a count taken today could differ from one taken in August. Defensible weaker form: "As of 2026-08-28 the production database held exactly one deal room, a demonstration whose producer note calls every figure a placeholder." Source: `plans/759/project-pages-ledger.md` §F39; `git show origin/main:firestore.rules | sed -n '86,95p'`; `gh api repos/nathanjohnpayne/overridebroadway/issues/183 --jq .state` -> `open`.

### R5: "never run a real deal"
> "Override has never run a real deal: no real capitalization managed in it, no outside investor admitted, no deal-room link sent to a backer" (line 129); "still untested on a real capitalization" (line 6)

**UNPROVABLE as a universal; the record-scoped half is SUPPORTED (R41).** The sentence goes on to scope itself ("nothing in the repository or its issue history that suggests otherwise"), and that scoped claim holds. "Never" reaches beyond the record: a link opened by a backer would leave no repository trace. The one instrument that could answer it is Firebase Analytics, where `DealRoomClient.tsx` fires `deal_room_viewed` on every load; it has never been queried, and since #180 the event carries the production id rather than the token (#180 body: "deal_room_viewed logs the production id instead of the token"). Defensible weaker form: the sentence as written, with the scoping clause carrying the weight; do not drop the clause.

### R6: the first-person history
> "I wanted to know how far I could get building with an AI coding tool." (line 76); "The first position I tracked arrived as three documents … Three months later the cap table and the term sheet disagreed." (line 78); "Products like Carta had shown me what the alternative looks like" (line 82); "I named it after a line in the waterfall." (line 86); the decision `context` fields at lines 30, 38 and 47

**UNPROVABLE.** None of these is recorded anywhere outside the page. `git grep -in 'carta\|angellist\|angel list\|cap table software' origin/main -- src docs specs rules README.md AGENTS.md` returns nothing, and the PRD mirror now in the repository (`docs/projects/overridebroadway/prds/overridebroadway.md`, 2026-10-05) has no competitive or comparables section (the prior ledger searched the vault copy too, F41). What the record does establish is adjacent: the Hadestown benchmark and the source list were in the agent brief on day one (R16), and the author's own account created five named productions (issue #12). Defensible weaker form: first person, as written, and not restated as market positioning.

### R7: what "override" means
> "The override, as I learned the word, is the producer's percentage taken off the top—the share that comes out before investors see a distribution. Opaque outside the industry, immediately legible to any producer who has negotiated one." (line 86)

**UNPROVABLE on industry usage; the product's own usage is checkable and matches.** The repository uses the word in that sense in exactly four places, none of them an identifier: `src/types/deal.ts:60` (comment "GP flat overrides (optional, applied before waterfall)"), `src/lib/model/calculations.ts:221` (same comment), `src/types/model.ts:16` and the user-visible label at `src/app/(app)/productions/view/sections/WaterfallSection.tsx:478`, "GP Flat Overrides (optional)". The mechanism at `calculations.ts:223-229` deducts the flat GP payment from profit before `calculateWaterfallAllocation` runs, which is "off the top" in the literal ordering sense. Whether Broadway producers use the word this way is not checkable from this repository. Defensible weaker form: keep the first-person framing already present ("as I learned the word") and drop "immediately legible to any producer", or keep it as opinion.

### R8: "most of the code is agent-written"
> "Most of the code is agent-written, and the whole application arrived in a single commit six days after the scaffold." (line 121)

**UNPROVABLE as a proportion.** No artifact attributes lines to an author. The evidence that exists points the same way: the commit that carried the application is titled "Updates via Claude Code" (`git show -s --format=%s 478a7ed`), 80 of the 217 commits on `main` carry a `Co-Authored-By: Claude` trailer, and 34 subjects name Claude, Codex or an agent. Defensible weaker form: "the application arrived in a commit titled 'Updates via Claude Code'," which is what the record says. The second half of the sentence is R15.

### R9: the live URL and SHIPPED status
> `liveUrl: "https://overridebroadway.com"` (line 12); `status: "SHIPPED"` (line 15)

**SUPPORTED.** `curl -sI https://overridebroadway.com` -> `HTTP/2 200`, `last-modified: Sun, 04 Oct 2026 17:25:40 GMT`. `curl https://overridebroadway.com/_build_id.txt` -> `1791133330557`, which is 2026-10-04T16:22:10Z, one minute after `227eedb` (#191) merged at 16:21Z, so the live site runs the post-#191 code and the rules audited below are the deployed ones as far as the hosting build can show. One observation, not a page claim: `https://www.overridebroadway.com` returns a Cloudflare `530`; the page links the apex only.

### R10: the repository is public
> `githubUrl: "https://github.com/nathanjohnpayne/overridebroadway"` (line 13)

**SUPPORTED.** `gh api repos/nathanjohnpayne/overridebroadway --jq '{visibility,archived,default_branch,pushed_at}'` -> `public`, `false`, `main`, `2026-10-05T22:06:20Z`.

### R11: the stack line and tags
> `stack: "Next.js · TypeScript · Tailwind · Firebase · Recharts · Vitest"` (line 19); `tags: ["Finance", "Theater", "React", "Firebase"]` (line 14)

**SUPPORTED.** `git show origin/main:package.json` -> `"next": "^16.3.8"` (:24), `"typescript": "~6.0.3"` (:59), `"tailwindcss": "^4"` (:57), `"firebase": "^12.19.0"` (:22), `"recharts": "^3.10.1"` (:30), `"vitest": "^5.0.3"` (:61), `"react": "19.3.0"` (:27). Zod, which the prior ledger flagged (F36), is gone from the line. Since #191 "Firebase" also covers one callable Cloud Function (`firebase.json` `functions` key; `functions/src/service.cjs`), which the line does not need to say.

### R12: "Financial operating system"
> `format: "Financial operating system"` (line 17)

**SUPPORTED as a label.** `README.md:3`: "Override is the financial operating platform for Broadway producers"; the same phrase at `docs/agents/repository-overview.md:3` and in the PRD mirror. The repo's word is "platform"; the page's "system" is a paraphrase, not a quotation.

### R13: related links
> `related:` three entries (lines 62-68)

**SUPPORTED.** `src/content/blog/agent-approval-workflow-genesis-of-mergepath.md`, `src/content/projects/mergepath.mdx` and `src/content/projects/friends-and-family-billing.mdx` all exist in this checkout.

### R14: a read-only deal room
> "share deal terms with investors through a read-only deal room" (line 5)

**SUPPORTED.** `firestore.rules:101` `allow write: if false;` on `dealRooms/{token}` (since #191 only the backend writes); `:92-95` allow an unauthenticated `get` of an active, publishable room. Nothing an investor can do writes anything.

### R15: six days, one commit
> "6 days / scaffold to the whole-app commit" (lines 21-22); "the whole application arrived in a single commit six days after the scaffold" (line 121)

**SUPPORTED.** `bfdb5d6`, 2026-02-18 14:09:11 −0800, "Initial commit from Create Next App"; `478a7ed`, 2026-02-24 10:09:12 −0800, "Updates via Claude Code", 91 files changed, +19,674/−837, 75 paths under `src/` (`git show --stat=200 --format= 478a7ed | grep -c ' src/'`). The gap is 5 days 20 hours by the clock and six calendar days. Source: `git log --reverse --format='%H %ad %s' --date=iso origin/main | head -2`.

### R16: the brief and the app in one commit, sources on day one
> "The agent brief and the application arrived in the same commit, with Broadway benchmarks and their industry sources encoded into the instructions from the first day." (line 34)

**SUPPORTED.** `478a7ed` created `CLAUDE.md` alongside the application. `git show 478a7ed:CLAUDE.md | sed -n '575p'`: "These figures are derived from publicly reported Broadway financials (Hadestown, Come From Away, Dear Evan Hansen, Wicked, Hamilton) and industry standards (APC, Dramatists Guild, Loeb & Loeb)." Line 589 carries the Hadestown check ("~$1.05M/week ✓ (matches press reports)") and line 655 the 947-seat parameter table. "The first day" is the application's first day, 2026-02-24, not the scaffold's; the sentence reads that way.

### R17: the engine has not been revisited
> "The engine has not been revisited since the product window closed." (line 33)

**SUPPORTED, and stronger than stated.** `git log origin/main --format='%h %ad %s' --date=short -- src/lib/model` returns one commit, `478a7ed` 2026-02-24. The engine has never been touched after the commit that created it, through 216 later commits including the two security PRs that rewrote everything around it.

### R18: one engine, two views
> "the same engine computes the producer's view and the investor's" (line 43); "computed by the same engine the producer's own model runs" (line 94)

**SUPPORTED.** `src/app/deal-room/DealRoomView.tsx:29` `import { runScenario } from "@/lib/model/scenarios"`; `src/app/(app)/productions/view/ProductionHubClient.tsx:15` imports the same function; `DealRoomView.tsx:31` imports the producer view's `WaterfallFlow` component and renders it at `:490`. Since #180 the published snapshot carries the full model-parameter allowlist precisely so that the investor view can run the engine client-side (`src/lib/dealRoomSnapshot.ts`, header comment).

### R19: no bespoke provision
> "Override cannot represent a bespoke waterfall provision." (line 42)

**SUPPORTED by construction.** `src/types/deal.ts:23` `export type WaterfallType = "recoup_first" | "share_from_dollar_one";` and `DealInputs` (`:26-75`) carries no free-form term, clause or override slot; every field is a rate, amount, toggle or one of two enumerations.

### R20: three editable cases and the grid
> "Bear, Base and Bull side by side, each with editable occupancy, ticket price and run length, re-running as you type, plus a sensitivity grid across occupancy and run length" (line 48); "an approximate IRR, breakeven occupancy, and a sensitivity grid that re-runs the model across a matrix of occupancy rates and run lengths" (line 92)

**SUPPORTED.** `ProductionHubClient.tsx:1569` (occupancy), `:1577` (ATP), `:1582` (weeks) are `onChange` inputs feeding `updateScenario`, and the outputs are a `useMemo` over `runScenario` so they re-run on each change (F40 traced it; the component's scenario code is unchanged since). `scenarios.ts:110-113` `generateSensitivityGrid(deal, occupancyRates: number[], weekCounts: number[])`. `src/types/model.ts:50-51` `approximateIRR: number | null; weeklyBreakeven: number | null;`.

### R21: no fourth case
> "The array is fixed at Bear, Base and Bull with no add and no remove" (line 51)

**SUPPORTED.** `ProductionHubClient.tsx:394` `useState<Scenario[]>(DEFAULT_SCENARIOS)`; `:614-615` is the only mutator and maps in place (`prev.map((s, i) => i === index ? { ...s, [field]: value } : s)`); `:436` re-seeds the same three. No push, splice or filter on the array anywhere in `src/app` (`git grep -n 'setScenarios' origin/main -- src/app` -> those three lines).

### R22: no billing, no teams, no pipeline, no investor accounts
> "There is no billing, no team accounts, no lead pipeline, and the investor-facing surface deliberately has no accounts at all." (line 57)

**SUPPORTED.** `git grep -n -i 'stripe\|billing\|subscription plan\|teamId' origin/main -- src` returns nothing; `CRM` appears once in `src/`, at `src/app/page.tsx:48`, as marketing copy on the unauthenticated landing page ("financial modeling, investor CRM, and a private deal room"); no lead or pipeline entity exists under `src/types/`. The deal-room route has no auth import (`git grep -n 'useAuth\|AuthContext' origin/main -- src/app/deal-room` -> nothing) and the read rule has no `request.auth` term on the public path (`firestore.rules:92-94`). The landing copy advertising a CRM the product lacks is a repository-internal inconsistency, not the page's.

### R23: CRM and signing stayed unbuilt
> "the roadmap items that would matter to a business, the lead CRM and the signing workflow, are exactly the ones that stayed unbuilt" (line 59)

**SUPPORTED.** The PRD mirror materialised into the repo on 2026-10-05 (`d79d45c`, #199) lists at `docs/projects/overridebroadway/prds/overridebroadway.md:478-483`, under "Future Roadmap (Planned)", "planned but not yet implemented: Lead CRM … Signing workflow …", with investor reporting, payments and portfolio views beside them. `git grep -in 'docusign' origin/main -- src` -> nothing. "Exactly the ones" is loose, since three other items also stayed unbuilt, but the two named are on the list.

### R24: eleven royalty participants
> "eleven royalty participants" (lines 90 and 92)

**SUPPORTED.** `src/types/deal.ts:8-20` declares `Royalties` with exactly eleven fields: `author`, `music`, `lyricist`, `director`, `choreographer`, `setDesigner`, `costumeDesigner`, `lightingDesigner`, `soundDesigner`, `starParticipation`, `productionCompany`.

### R25: stepper or everything, and the default
> "First-time users can walk it as a guided stepper; experienced ones get every section at once, which is the default." (line 90)

**SUPPORTED.** `src/app/(app)/productions/view/DealBuilderNav.tsx:75` `if (guidedMode) {` branches between the stepper and the tab bar; `src/stores/dealStore.ts:28` `guidedModeActive: false` is the persisted default, so direct mode is what a new user sees.

### R26: the dashboard toggle
> "the dashboard's primary control is a My Productions / My Investments toggle" (line 90)

**SUPPORTED.** `src/app/(app)/dashboard/page.tsx:139` "My Productions", `:145` "My Investments", driving `dashView` (`:124`); `src/app/(app)/layout.tsx:34-36` links `?view=investments`. "Primary" is the page's characterisation of a control that is the dashboard's one view switch.

### R27: the order the money moves in
> "Gross box office less credit-card fees and the house's cut gives adjusted gross; eleven royalty participants take their share; then the weekly nut, then the general partner's fee. What survives is operating profit, and only then does the waterfall run." (line 92)

**SUPPORTED against the engine, with one terminology caveat the page should know about.** `src/lib/model/calculations.ts:182` gross; `:191` credit-card fees and house deduction yield `adjustedGross`; `:201` royalties; `:213` `netBoxOffice`; `:215` `profitBeforeFees = netBoxOffice - deal.weeklyNut`; `:218` `gpFee`; `:223-226` GP flat overrides; `:229` `operatingProfit = profitAfterGpFee - gpFlatPayment`; `:234` `calculateWaterfallAllocation(operatingProfit, …)`. That is the page's order, and the thing that enters the waterfall is the post-GP-fee figure the engine calls `operatingProfit`. The caveat: the shipped UI uses the same words for the pre-fee figure. `src/app/(app)/productions/view/WaterfallFlow.tsx:175-178` labels `preGpOperatingProfit` "Operating Profit" with the tooltip "Net box office minus the weekly nut. This is the profit available for GP fees and waterfall distributions," and the page's own :94 alt text follows the UI ("the weekly nut to operating profit, then the GP's management fee"). So within one page "operating profit" is post-fee in the prose and pre-fee in the exhibit caption. Both are faithful to their sources; a reader comparing them will see a contradiction. Suggested fix is editorial, not factual: say "what survives is distributable profit" in the prose, or "to the operating-profit line" in the alt text.

### R28: two structures, the crossing week, dollar one
> "Two structures ship. Under recoup-first … in the week the show crosses its capitalization the engine splits that week's profit at the crossing point … Under share-from-dollar-one, profit sharing runs alongside recoupment from the first performance." (line 92)

**SUPPORTED.** `deal.ts:23` two-value union. `calculations.ts:125-160` is the recoup-first branch, with the crossing week at `:148-160`: `toRecoup = remainingToRecoup; postRecoupProfit = operatingProfit - remainingToRecoup;` and the split applied only to `postRecoupProfit`. `:162-171` is share-from-dollar-one, commented "distributions flow simultaneously with recoupment", populating `toRecoupmentPool` and `investorDistribution` from the same pool every week from week 1. "From the first performance" is the engine's weekly granularity, previews included.

### R29: the waterfall exhibit
> "The weekly cascade as an investor sees it … gross box office down through credit-card fees and the house, royalties and the weekly nut to operating profit, then the GP's management fee, then what reaches investor recoupment." (line 94)

**SUPPORTED as a description of the image.** `public/images/projects/override-waterfall.png` shows "Weekly Revenue Flow … Showing Week 5 (open week) · Occupancy 75.0%": Gross Box Office $911,400; − CC Fees + House Deduction −$82,026; Adjusted Gross $829,374; − Royalties −$151,242; − Weekly Nut −$650,000; Operating Profit $28,132; − GP Management Fees −$5,563; → Investor Recoupment $22,569; "Waterfall type: Recoup-First". The arithmetic closes at every line. 75.0% is the Base case (`scenarios.ts:149`), which is what `DealRoomView.tsx:490` feeds to the component on the investor route. See R27 for the "operating profit" label.

### R30: no account, no invitation, no portal
> "The producer generates a link and sends it. There is no account to create, no invitation to accept, and no portal to log into—the prospective investor opens a URL and reads the deal." (line 96)

**SUPPORTED at `origin/main` and on the deployed build, with a caveat for legacy rooms.** The route is `src/app/deal-room/page.tsx`, outside the `(app)/` guard group; no file under `src/app/deal-room` imports auth; `DealRoomClient.tsx:7` documents the model ("no auth required—security rules allow a direct get when isActive = true"). The rule after #180 (`firestore.rules:92-95`) is `allow get: if resource == null || (resource.data.isActive == true && publishable(resource.data) && …) || isDealRoomOwner();`, with no `request.auth` term on the public arm. Since #191 the token is minted by the callable backend rather than the browser (`firestore.rules:100` "Only the backend allocates tokens"), which changes nothing the investor sees. The caveat is R4's: a room written by the pre-#180 client that carries document URLs with `showDocuments` off now fails the `publishable` check and reads as inactive (`DealRoomClient.tsx:29` maps `permission-denied` to the inactive state); #183 is open to sanitise such rooms. Whether the one demonstration room is in that state could not be read today.

### R31: a snapshot, not a feed
> "What they get is a snapshot taken at the moment it was shared, not a live feed of a model the producer is still editing." (line 96)

**SUPPORTED.** `src/lib/firestore.ts:308-313` `getDealRoom` is a one-shot `getDoc`, not an `onSnapshot`; the room document is a copy built by `src/lib/dealRoomSnapshot.ts` at share time; republishing is an explicit action, `DealRoomSetup.tsx:248` `handleRefreshSnapshot`, bound to the button labelled "Update Snapshot" at `:526`, with the producer told at `:657` "If you update your deal inputs, click Update Snapshot above". (The prior ledger's F38 finding that the investor is shown `createdAt` rather than `updatedAt` is now open as #140; the page does not claim otherwise.)

### R32: the scenarios exhibit
> "three cases side by side, each with its assumptions above its outcome. Bear and Base never recoup, so investor distributions are zero; Bull recoups in week 20 and returns $3.4M." (line 98)

**SUPPORTED as a description of the image.** `public/images/projects/override-scenarios.png`: Bear Case 60.0% occ · 20 weeks · $100 ATP, Recoup week "No Recoup", Total investor distributions $0; Base Case 75.0% · 36 weeks · $115, "No Recoup", $0; Bull Case 90.0% · 52 weeks · $135, "Week 20", $3,405,615, 0.68× multiple, ≈ −42.0% annualized IRR; header "Modeled against the snapshotted deal structure · 6/30/2026". The three assumption sets are `DEFAULT_SCENARIOS` (`scenarios.ts:147-151`). "Returns $3.4M" is the card's "Total investor distributions" figure.

### R33: the producer note
> "Demonstration figures—the room's own producer note calls every number a placeholder." (line 98)

**SUPPORTED as of 2026-08-28; not re-read today.** The prior ledger (F39) quoted the live document's `config.producerNote` verbatim on that date: "This is a demonstration deal room created with sample figures for illustration only. All numbers, investors, and documents shown here are fictional placeholders." The note is a field in the token-readable document and could have been edited since; see R4 for why it was not re-read. The claim is dated by the exhibit's own "6/30/2026" header.

### R34: forty-five, five, fifty
> "post-recoup profit split per hundred dollars, with the GP's carve coming out of the investor pool rather than the creative pool—forty-five cents to the limited partners, five to the GP, fifty to creatives." (line 109)

**SUPPORTED.** `public/images/projects/override-profit-split.png`: "Per $100 of post-recoup distributable profit" 45.0% LP Investors, 5.0% GP Carve, 50.0% Creatives, footer "Investor pool 50.0% total → LP 45.0% + GP carve 5.0% · Creatives 50.0%". The engine agrees: `calculations.ts:127-135` `investorPool = operatingProfit * postRecoupInvestorSplit; gpShare = investorPool * gpShareOfInvestorPool; investorDistribution: investorPool - gpShare, creativeDistribution: operatingProfit * creativeParticipantSplit` at the defaults `postRecoupInvestorSplit: 0.5` (`deal.ts:120`) and `gpShareOfInvestorPool: 0.1` (`:114`): 0.5 × 0.9 = 0.45, 0.5 × 0.1 = 0.05, 0.5 to creatives untouched. The sentence's last clause is R1.

### R35: the Hadestown calibration
> "The engine's documentation carries a check built from Hadestown's published economics—947 seats, 93% occupancy, a $155 average ticket, a $530K weekly nut, 14% royalties—together with what the model should return. I re-ran it against the shipped engine while writing this page, six months after it was written and with nothing in CI holding it in place. It reproduces exactly: $1,046,283 weekly gross, 57.0% breakeven, recoupment in week 37." (line 113)

**SUPPORTED, and re-executed today.** The parameters are `docs/agents/reference.md:120`: "947 seats, 93% occ, $155 ATP, 10% discount at $90, 2.5% CC, 6% house, 14% royalties, $25K running offset, $530K nut, 1.5% GP fee → $1.05M weekly gross ✓, 57% breakeven ✓, ~37 weeks to recoup ✓", with the $11.5M capitalization at `:108`. The check first appears in `478a7ed:CLAUDE.md:589` and `:655` on 2026-02-24; the page was written 2026-08-28 (`71c4f57`), six months and four days later. Extracting the five `src/lib/model/*.ts` files and the three `src/types/*.ts` files at `origin/main` into the scratchpad (one `enum` rewritten to a `const` object so Node's strip-only loader would run it; the repository was not modified), seeding `DEFAULT_DEAL_INPUTS` with those parameters and calling `runScenario` at 93% occupancy over 52 weeks gives, for the first non-preview week, `weeklyGross=1,046,283 breakeven=57.0% recoupWeek=37`. Nothing in CI holds it: `git grep -nE '947|530_?000|Hadestown|1046283' origin/main -- tests` returns only comment lines in `tests/test_coderabbit_severity_gate.sh` referring to an unrelated issue #947. The engine is the same bytes the page audited (R17).

### R36: eight tests, one entry point, three untested files
> "only eight touch the engine and every one enters through the same file, so the weekly pipeline, the phase function and the ownership rollup have no direct test at all" (line 115)

**SUPPORTED, on either reading of "the same file".** `tests/deal-builder.test.tsx:190` `describe("runScenario (financial model engine)")` holds exactly eight `it()` blocks (`:193`, `:203`, `:211`, `:226`, `:234`, `:263`, `:273`, `:284`). `git grep -n 'lib/model' origin/main -- tests` returns two lines, both importing from `@/lib/model/scenarios` (`deal-builder.test.tsx:188`, `deal-rooms.test.tsx:266`), and the second file never calls it (`grep -c 'runScenario(' tests/deal-rooms.test.tsx` -> 0). So every engine test is in one test file and enters through one engine file, `scenarios.ts`. No test imports `calculations.ts`, `waterfallPhase.ts` or `ownershipRollup.ts`; `git grep -n 'deriveWaterfallPhaseState\|waterfallPhase' origin/main -- tests` -> nothing. The 23 tests added since the prior pin (R2) are rules, listener and load-error tests and do not change this.

### R37: what the eight assert
> "Two assertions check money against the inputs, both of them pool percentages; the ones that look like proof check the engine against its own output." (line 115)

**SUPPORTED.** `tests/deal-builder.test.tsx` is unchanged since `29973a1` (2026-08-04), before the page was written. `:251` `expect(alice.poolPercent).toBeCloseTo(100_000 / deal.totalCapitalization, 6)` and `:255` its twin for Bob are the two input-derived money assertions, both `poolPercent`. `:208` `expect(output.totalGrossBoxOffice).toBeCloseTo(summedGross, 2)` compares the engine's total to a reduction over the engine's own weeks. Four assertions sit behind guards that make them vacuous when the guard is false: `:216` `if (output.recoupWeek !== null)`, `:258` `if (alice.totalReceived > 0)`, `:267` `if (output.weeklyBreakeven !== null)`, `:278` `if (output.approximateIRR !== null)`.

### R38: the phase badge and the toggle
> "A producer's screen shows which phase the waterfall is in … The phase function reads the deal's post-recoup investor split instead … The distribution math one file over still consults the toggle, so turn the toggle off without changing the split and the badge reads "Profit Sharing Active" while the engine pays investors nothing, and the deal room shows a prospective backer a 50% investor pool for that same deal. The repository records it as a known inconsistency and says to preserve the behavior." (line 117)

**SUPPORTED on every clause, re-executed today.** `src/lib/model/waterfallPhase.ts:94` reads `dealInputs.postRecoupInvestorSplit`; the three `hasProfitSharing` tokens in that file (`:7`, `:34`, `:73`) are all comments, so the function never reads the toggle. `src/lib/model/calculations.ts:232` `const effectiveInvestorSplit = (deal.hasProfitSharing ?? true) ? deal.postRecoupInvestorSplit : 0;`. `getPhaseLabel` (`waterfallPhase.ts:133`) returns "Post-Recoup · Profit Sharing Active". Running the extracted engine on `DEFAULT_DEAL_INPUTS` under the Bull case: with the toggle on, investors receive $7,450,457 post-recoup, the GP $827,829, creatives $8,278,286; with the toggle off and the split left at 0.5, investors receive $0, the GP $0, creatives $16,556,572, and the badge still reads "Post-Recoup · Profit Sharing Active". The deal room renders `DealTermCard label="Investor Pool (post-recoup)" value={formatPercent(dealInputs.postRecoupInvestorSplit)}` (`DealRoomView.tsx:421-425`), and `git grep -c 'hasProfitSharing' origin/main -- src/app/deal-room` returns nothing; the #180 allowlist (`dealRoomSnapshot.ts`) publishes both `hasProfitSharing` and `postRecoupInvestorSplit`, so the divergence reaches the investor route unchanged. `docs/agents/reference.md:142`: "**Known inconsistency:** … The phase badge can show 'Profit Sharing' while calculations give investors nothing if the toggle is off. Preserve this behavior." Tracked as issue #139 (open, created 2026-08-28). Nothing has moved since the page was written.

### R39: five pure files, held by convention
> "The financial engine is five files with no React and no Firebase import in any of them … No lint rule, no import restriction, no CI check polices it; it holds because the rules files say so and reviewers read them." (line 119)

**SUPPORTED.** `git ls-tree --name-only origin/main -- src/lib/model/` -> `calculations.ts`, `formatters.ts`, `ownershipRollup.ts`, `scenarios.ts`, `waterfallPhase.ts`. Their complete import set is `import type` from `@/types/*` plus `scenarios.ts` importing three functions from `./calculations`; `formatters.ts` imports nothing. No React, no `firebase`, no `next`. Enforcement: `git grep -l 'no-restricted-imports' origin/main` -> 0 files; `git grep -l 'lib/model' origin/main -- .github scripts eslint.config.js eslint.local.config.js` -> 0 files; control, `git grep -c 'react-hooks' origin/main -- eslint.config.js` -> 1, so the grep sees the lint config. #181 added an app CI job (lint and `npm test` in `repo_lint_local.yml`), which runs the suite in R36 and polices no boundary. The convention is written at `docs/agents/code-modification-rules.md:64` ("pure functions, no React, no side effects") and `rules/repo_rules.md:52-54`.

### R40: the risk table and the gate
> "the repo's rules name the three engine files as its highest-risk zone, while the automated review gate watches auth and payments directories that do not exist in this repository" (line 121)

**SUPPORTED, with one word of precision.** `rules/repo_rules.md:46` heads "High-Risk Modification Zones"; the table at `:50-58` has seven rows and the three engine files are rows one to three, followed by `firestore.rules`, `storage.rules`, `src/lib/firestore.ts` and `src/contexts/AuthContext.tsx`. The table states no ranking, so "highest-risk zone" is the page's superlative; "first among its high-risk modification zones" is the exact form. `.github/review-policy.yml:26-31` `external_review_paths:` lists `src/auth/**`, `src/payments/**`, `**/*secret*`, `**/*credential*` and (since the prior audit) `.github/**`; `git ls-tree -d --name-only origin/main -- src/auth src/payments` returns nothing, and `src/` holds `app`, `components`, `contexts`, `hooks`, `lib`, `stores`, `types`. None of the three engine files is in the list. Tracked as issue #141 (open, 2026-08-28).

### R41: nothing in the record suggests otherwise
> "nothing in the repository or its issue history that suggests otherwise" (line 129); "still untested on a real capitalization" (line 6)

**SUPPORTED, with a control.** The prior ledger swept all 138 items then existing (F31). Today `gh api graphql` fetched every issue and pull request numbered 139 to 201 (63 items: 22 issues total in the repo, 179 PRs) with titles and bodies, and a case-insensitive search for `real production`, `actual investor`, `live deal`, `first user`, `customer`, `signed up`, `waitlist`, `sent the link`, `share link`, `demoed`, `demo to` and `cap table` returned zero hits across all twelve. Control with the same matcher: `deal room` -> 6 hits (#139, #140, #180, #181, #182, #183), `investor` -> 12, `producer` -> 8, every one of them engineering prose about the rules rewrite, the snapshot allowlist or the audit findings. The 63 titles are dependency bumps, template syncs, review-tooling fixes, the two security PRs and their post-review issues; not one is a product feature or a user report. `git log origin/main -- src` shows the only product-code commits since the window closed are #122 (a lint rename), #180, #181 and #191 (security hardening).

### X1: "a month before any of this existed"
> "Override—whose engine was built a month before any of this existed" (`mergepath.mdx:206`)

**SUPPORTED.** The engine is `478a7ed`, 2026-02-24 10:09 −0800 (R15); the hub's initial commit is mergepath `b9734df`, 2026-03-24 12:08:47 −0700. One calendar month, 28 days. The phrase is on the Mergepath page, not this one; the task brief placed it here, so it is recorded here and cross-referenced for that page's auditor.

### X2: "has run every change since on the fleet's review path"
> "and Override—whose engine was built a month before any of this existed—has run every change since on the fleet's review path" (`mergepath.mdx:206`)

**WRONG, on either reading of "since".** `git log --first-parent origin/main --since=2026-03-24 --format='%h|%ad|%p|%s'` in the Override checkout, filtered to commits with one parent and no `(#N)` suffix, returns 29 of 181 first-parent commits that landed on `main` without a pull request: twenty-two between 2026-03-24 and 2026-04-10 while the policy was being set up (starting with `614a9da`, the commit that installed the review pipeline itself), and seven after Override was listed as a hub consumer on 2026-05-04 (mergepath `d57c940`): `ecc0722`, `7f6bde8`, `0bb829c`, `bfab98f`, `b94c2b6` on 2026-08-21, `d652b86` on 2026-08-27 and `99940ad` on 2026-08-28. `gh api repos/nathanjohnpayne/overridebroadway/commits/{sha}/pulls` returns `[]` for all seven; the control `a8fc533` returns #180. (A read-only check of the local checkout and the API only; nothing was fetched, pulled or modified.) If "since" means since the engine, add the 25 commits between 2026-02-24 and 2026-03-24, all direct. None of the 29 touches `src/`; they are identity docs, CI fixes and bulk template syncs. Defensible rewrite: "has landed every product change since through the fleet's review path; the direct pushes to its `main` since March are documentation and template-sync commits, the last on 2026-08-28." The fleet-wide "no protection on `main`" finding in mergepath's ADR 0002 (2026-07-28) is consistent with those August pushes having been possible.

## Prior-ledger reconciliation

Rows of §F re-derived here and unchanged: F1, F15 (R7), F16 (R22, R30), F19 (R28), F21 (R38), F23 (R31), F25 (R39), F26 (R35, R36, R37), F28 (R40), F29d (R15), F31 (R41), F32 (R25), F33 (R27), F40 (R21), F41 (R6), F42 (R16). F26's "86 tests" and F29e's "173 commits" were right on their date and are the two figures that have moved (R2; 217 commits today, which the page no longer states). F39's Firestore read could not be repeated (R4). F24's finding that document URLs reached the public document regardless of the toggle was fixed by #180 (`dealRoomSnapshot.ts` and `firestore.rules:63-72`); the page never made that claim. F22's "token is the whole credential" still holds and the token is now server-minted (#191).

## Method notes

The live page at `https://nathanpayne.com/projects/override/` was fetched and its text compared to the source on every quoted sentence; no divergence. Every engine figure in this ledger was executed against the files at `origin/main` rather than read off the prior ledger; the engine has one commit in its history, so the prior numbers were expected to hold and did. Running `npx vitest run` in the evidence checkout writes only to untracked cache; `git status --short` before and after shows the same single untracked `.mergepath/` directory. The zsh `$var:path` trap applies to every `git show "${ref}:path"` in this repo; brace it.

## Fixes applied

Applied 2026-10-06 to `src/content/projects/override.mdx` on `claude/correctness-pass-2026-10-06`, per `FIX-BRIEF.md`. No test pins this page's wording (`grep -rn 'Eighty-six\|never recoups\|operating profit\|agent-written\|only deal room' tests/` -> nothing), so no test assertion changed. `vale --minAlertLevel=error` reports nothing before or after. `scripts/verify-brevity.py` was not run: it is a before/after evidence diff for brevity-only passes, and these edits change a numeral on purpose.

- R1: ":109 alt 'because this demonstration never recoups.'" -> "'because this demonstration does not recoup at its base-case assumptions.'"
- R2: ":115 'Eighty-six tests pass, but only eight touch the engine … have no direct test at all.'" -> "'A hundred and nine tests pass as of 2026-10-06, up from eighty-six in August, but only eight touch the engine … have no direct test.'" (the drift clause is the R2 finding; "at all" cut to offset)
- R27 (terminology, coordinator-directed): ":92 'What survives is operating profit, and only then does the waterfall run.'" -> "'What survives is distributable profit, and only then does the waterfall run.'" ("distributable profit" is the engine's own comment at `calculations.ts:228` and the deal room's term at `DealRoomView.tsx:424`; the :94 alt text keeps "operating profit" because the UI labels the pre-fee subtotal that way)
- R4: ":26 label 'in production, a demonstration'" -> "'in production as of 2026-08-28, a demonstration'"; ":129 'The only deal room in production is a demonstration built with sample figures.'" -> "'As of 2026-08-28, the only deal room in production is a demonstration built with sample figures.'" (dated to the last primary read; a present-tense "the only" could not be re-verified today)
- R8: ":121 'Most of the code is agent-written, and the whole application arrived in a single commit six days after the scaffold.'" -> "'The whole application arrived in a single commit titled "Updates via Claude Code," six days after the scaffold.'" (the unsourced proportion replaced by the verified commit subject; the following sentence's "the kind an agent does not catch" still reads)
- Hedge cut, not a row: ":113 'what actually stands behind the arithmetic'" -> "'what stands behind the arithmetic'"
- R3: left as is; the author's own testimony ("I built this from the side of the table…"), which the brief says to leave.
- R5: left as is; the sentence already carries its own scoping clause ("nothing in the repository or its issue history that suggests otherwise"), which is the ledger's weaker form.
- R6: left as is; first-person history, labelled as such.
- R7: left as is; "as I learned the word" frames the paragraph as the author's own learning, and "immediately legible to any producer" is opinion-shaped rather than a figure.
- X2: left; it lives on `mergepath.mdx:206` and belongs to that page's auditor. X1 needs no change.
- R9–R41 (SUPPORTED): no change.

Net effect on length: +17 words by `wc -w` (2,717 to 2,734, frontmatter included), after cutting "actually" and "at all"; every added word is a date or a narrowing.
