# Facts ledger—the seven project pages

Sources under audit: `src/content/projects/{device-source-of-truth,five-across,friends-and-family-billing,matchline,mergepath,override,swipe-watch}.md` (~6,200 words). Evidence repos: `~/GitHub/{device-source-of-truth,fiveacross,friends-and-family-billing,matchline,mergepath,overridebroadway,swipewatch}`, each read at `origin/main`. The Five Across evidence checkout was `~/GitHub/gaycruisebingo` when the §B rows below were first written; the **repository** was renamed on 2026-08-27 and that path no longer exists. The rename covers the repository and nothing else—see §BM1 before swapping any other occurrence of that token. Shared reference cache: `plans/759/refs.json` (70 resolved references at the time of this audit—67 cached in Phase 0 plus #501, #502 and #503 added during the #742 audit; nothing added here).

Verdicts: **SUPPORTED** · **WRONG** (corrected value given) · **UNPROVABLE** (defensible weaker form given) · **EXTERNALLY SOURCED** (provenance recorded, not re-derived here—see §M6). A row marked **SPLIT** carries more than one verdict because the sentence makes more than one claim.

Line references are `slug:NN` against the file as it stands on `content/744-six-prs-audit`. Commands assume `cd` into the named repo.

---

## Method notes carried into this run

**M1—the commit record beats a spec's own status header.** Seven DST specs carry front matter reading `tested: false` / `reason: "implementation pending"`, and `specs/DST-053-active-devices-freshness-badge.md:11` additionally reads `**Status:** Proposed`. Eight of them describe features that demonstrably shipped: DST-053's freshness badge is live in `src/components/shared/FreshnessBadge.tsx` and wired into `DashboardPage.tsx`, `DeviceDetailPage.tsx` and `PartnerDetailPage.tsx`. Enumerate with `git grep -nE 'reason: "implementation pending"|^\*\*Status:' origin/main -- specs`. When a spec header and the tree disagree, the tree wins.

**M2—count with the loosest correct matcher, then narrow.** Two claims in this run flipped under narrowing. `git log -S"disagreement"` puts Override twelve days ahead of every other repo (`9f28a7e`, 2026-03-12); reading the diff shows the hit is the sentence "Code vs. docs **disagreement**: Trust the implementation first," which has nothing to do with reviewer-disagreement detection. Likewise `git log -S"strike"` in FFB returns a TipTap commit, because TipTap ships `strikethrough`. Both would have produced a wrong finding if the matcher had been trusted without reading the hit.

**M3—"the page was right when it was written" is a distinct verdict from "the page is right."** Every "How it was built" narrative on the four original pages was written in a single commit, `300a433` (2026-04-13, PR #159, "feat(projects): expand narratives, rebuild metadata strip, add stack line"). Four numeric claims are frozen at that date. Three of them were accurate then. See §H7.

**M4—a mental state is never in the record.** Two rows below (§G17, §F12) rest on inferred intent or an inferred reaction. The record shows behaviour and timestamps only.

**M5—date the line, never the file.** Any row arguing from "first appearance" must use `git log -L <line>,<line>:<file>`. `git log --diff-filter=A -- <file>` dates a **file** and says nothing whatever about when a line inside it was written. §B15 made exactly that substitution and the two dates differed by thirteen days: `plans/daily-cards-wireframes.html` was added 2026-07-11, four days before embarkation, but the line the row was reasoning about was added 2026-07-24, disembarkation morning. The wrong command produced the wrong verdict on the page's single most quotable number, and the corrected row is now SUPPORTED. This file has been swept for the same defect: §B15 is the only row that used `--diff-filter=A` to date a line. §C8's `cc05efb` first-appearance claim is a content-modification commit rather than a file addition and does not share the defect. Do not redo that sweep.

**M5.1—and the ledger already carried its own disproof.** §B23, two rows below §B15, cites `292f5f0`, 2026-07-24, for the final-standings share card—the same commit, the same card, the correct date—while §B15 was calling that card's own numbers pre-sailing fixture data for an invented player. The contradiction sat inside one section of one file and nobody read across it. This is the failure `plans/759/RUN.md` records from #798, *audit the ledger's own prose against the ledger's own evidence*, recurring in a worse form: there the stale claim hid in a summary paragraph, here it was two numbered rows apart from the evidence that refuted it. The practical rule: before a row's verdict is final, grep this file for the SHAs, dates and artifacts the row names, and read what the other hits say.

**M6—EXTERNALLY SOURCED is not UNPROVABLE.** UNPROVABLE in this ledger means *the repository does not substantiate this*, and it licenses a rewrite: the row hands Phase 2 a defensible weaker form because the claim as written cannot be stood behind. EXTERNALLY SOURCED means something narrower and much less damning—the figure has a named source, that source is a production system rather than one of the seven evidence repositories, and **this audit did not re-derive it**. It licenses nothing to be rewritten. A row so marked is a pointer to where the number lives and a statement of what was and was not checked here, so that a later session can promote it to SUPPORTED by re-deriving it rather than re-litigating it. The §B25–§B36 cluster uses both verdicts side by side and the split is exactly the tooling boundary: its PostHog figures were re-run in this session and are SUPPORTED, its Firestore figures could not be reached and are EXTERNALLY SOURCED. Never use UNPROVABLE for a figure whose source is known and simply out of reach—that is the word that gets a true sentence deleted.

---

## §A `device-source-of-truth`

### A1—"hundreds of partner devices"

> ":27 Disney supports streaming on hundreds of partner devices—PlayStation, Xbox, Amazon Vega OS, smart TVs, set-top boxes"

**UNPROVABLE.** No artifact in the repo states a device count. The only countable dataset is the deployed synthetic one: `scripts/synthetic/dataset.mjs:32` defines 14 partners, `:63` defines 26 partner keys, and `:105` `buildDevices()` allocates `intBetween(1, 3)` devices per key—so 26 to 78 devices, never "hundreds." The nearest real-world figure anywhere is `specs/DST-044-amendment-version-registry.md:25`, which mentions four ADK labels appearing "across 45 devices in the AllModels inventory." The claim is about Disney's production estate, which this repo never enumerated and which the synthetic scrub deleted. Defensible weaker form: name the sources rather than a magnitude—"partner devices across PlayStation, Xbox, Amazon Vega OS, smart TVs and set-top boxes." Source: `git show origin/main:scripts/synthetic/dataset.mjs | sed -n '/buildDevices/,/^}/p'`; `git grep -nE '[0-9]+ (devices|partners)' origin/main -- README.md DEPLOYMENT.md .ai_context.md docs`.

### A2—"350-question Excel questionnaires"

> ":33 with AI-assisted extraction of structured specs from 350-question Excel questionnaires"

**WRONG.** `350` appears in no product, spec, doc, or test artifact. `git grep -n '350' origin/main -- specs docs src functions` returns nothing at all. Repo-wide the token only appears as Codex finding IDs in GitHub review tooling and one `PR=350` fixture. The repo's own number is in `specs/DST-047-questionnaire-intake-ai-extraction.md:290`: "A real-world questionnaire commonly has 100–150 Q/A pairs." The worked example at `:292` uses 143 pairs, and `specs/DST-052-questionnaire-ai-extraction-status.md:23` shows a `"0 / 143 fields extracted"` counter. The corrected value is **100–150 Q/A pairs**.

### A3—"350+ questions across 15 sections"

> ":45 Disney's partner device certification uses an Excel-based technical questionnaire with 350+ questions across 15 sections"

**WRONG on both numbers.** The question count is the A2 error restated. The section count is 16, not 15, and the repo is unambiguous: `src/lib/questionnaireFields.ts:29` declares `QUESTIONNAIRE_SECTIONS` with exactly sixteen keys (`general`, `hardware`, `firmwareUpdates`, `mediaCodec`, `frameRates`, `contentProtection`, `native`, `videoPlayback`, `uhdHdr`, `audioVideoOutput`, `other`, `appRuntime`, `audioCapabilities`, `accessibility`, `platformIntegration`, `performanceBenchmarks`), at lines 31, 49, 125, 141, 157, 172, 210, 224, 255, 283, 298, 317, 337, 356, 369, 387. Total defined fields across all sections: **260**, not 350—`git show origin/main:src/lib/questionnaireFields.ts | grep -cE "^      \{ key: '"`. Corrected value: "100–150 questions across 16 sections," or, holding to what a reader can check, "a multi-hundred-field Excel questionnaire spanning sixteen sections."

Note against the prior run's framing: the sixteen keys at `specs/DST-TDI-001-Contract-Hardening-Plan.md:64` ("`PUT /api/device-specs/:deviceId` will accept only the 16 known section keys") and the sixteen at `questionnaireFields.ts:29` are the **same sixteen**. The questionnaire section model *is* the normalized device-spec section model. The prior run's distinction between them does not hold; the number is 16 either way.

### A4—extraction pipeline mechanics

> ":33 including batching, rate-limit handling, and per-device retry"

**SUPPORTED.** Batching: `functions/src/services/questionnaireExtractor.ts:29` `const CHUNK_SIZE = 30;`, applied at `:322-323`. Per-device retry: `specs/DST-052-questionnaire-ai-extraction-status.md:111`, shipped as `src/components/shared/ExtractionStatusPanel.tsx`. Rate-limit handling: `docs/agents/operating-rules.md:215` records "retry on rate limits/timeouts (3 attempts, 60–300s backoff, 300s function timeout, 1800s dispatch deadline)."

### A5—the "Starting Over" commit

> ":41 Device Source of Truth started from a \"Starting Over\" commit after an initial scaffold was scrapped"

**SUPPORTED.** `6b200f8`, 2026-02-25 15:20:20 −0800, subject exactly `Starting Over`, stat `59 files changed, 36 insertions(+), 7097 deletions(-)`. It is the third commit on the branch and it does delete a working scaffold: `scripts/import/` (8 files), nine pages under `src/pages/` including `PartnersPage.tsx` (−662) and `ConflictResolutionPage.tsx` (−512), `src/lib/{hooks,scoring,types}.ts`, and roughly thirty real partner `.xlsx` questionnaires. Worth noting for the prose: the scrapped scaffold was one day old (`45964ca` 2026-02-24 → `6b200f8` 2026-02-25), not a long sunk effort. Source: `git show --stat 6b200f8`.

### A6—"well past two hundred commits"

> ":41 and grew—well past two hundred commits—into a purpose-built data platform"

**SUPPORTED, and accurate when written.** `git rev-list --count origin/main` returns **332** today; at the writing date it was **228** (`git rev-list --count "$(git rev-list -1 --before=2026-04-14 origin/main)"`). Both clear "well past two hundred." For a sharper number: 45 commits are Dependabot (`^(deps:|deps\(|chore\(deps)`) and 20 are template propagation, leaving **267** substantive. 203 of the 332 (61%) landed in February and March 2026.

### A7—"14 integration points"

> ":43 An early commit fixed client/server misalignments across 14 integration points"

**SUPPORTED as a citation of the commit; the number itself is the author's own count.** `f38569d`, 2026-02-25 20:51:06 −0800, subject verbatim: `Fix client/server contract misalignments across 14 integration points`. It is the only commit in the history matching `misalign` or `integration point`. The diff is 16 files, +306/−138, and enumerates ten P0 and five P1 items in the body without labelling fourteen discrete points, so "14" cannot be recomputed from the diff. Defensible as written because the page is reporting what the commit says. Source: `git log origin/main --grep='misalign' -i --format='%H %ad %s'`.

### A8—DST-TDI-001 and `@dst/contracts`

> ":43 a contract-hardening effort ([DST-TDI-001](…/specs/DST-TDI-001-Contract-Hardening-Plan.md)) that introduced shared Zod schemas and typed DTOs in a [`@dst/contracts`](…/packages/contracts) monorepo package"

**SUPPORTED.** Both paths resolve on `origin/main`. `packages/contracts/package.json:2` reads `"name": "@dst/contracts",`. The spec's public-contract list at `:61-69` covers exactly the typed-DTO and validation surface described.

### A9—"30-pair batch chunking"

> ":45 30-pair batch chunking for rate-limit safety"

**SUPPORTED, exactly 30.** `functions/src/services/questionnaireExtractor.ts:29` `const CHUNK_SIZE = 30;`, spec at `specs/DST-047-questionnaire-intake-ai-extraction.md:290` and `:345`. Do not confuse with `functions/src/routes/questionnaireIntake.ts:24` `const BATCH_CHUNK_SIZE = 450;`, which is a Firestore write-batch size, not AI batching.

### A10—fire-and-forget to Cloud Tasks

> ":45 The extraction was originally fire-and-forget; a later commit replaced it with a Cloud Tasks queue for retry safety and stale-clock recovery."

**SPLIT.** The first two thirds are **SUPPORTED** and the commit even uses the page's own phrase: `7f61480`, 2026-03-04 22:17:00 −0800, subject `replace fire-and-forget extraction with Cloud Tasks queue`, body "idempotent per-device Cloud Tasks with CAS locking, transaction-safe job finalization, safe fan-out with partial enqueue handling, and self-healing stale recovery." Implementation at `functions/src/index.ts:82` (`onTaskDispatched`) and `questionnaireExtractor.ts:517` (`enqueueExtractionTasks`).

"Stale-clock recovery" is **WRONG**—the phrase is the page's own coinage and misnames the mechanism. `git grep -ni 'stale.clock\|staleClock' origin/main` returns nothing. What exists is a wall-clock staleness threshold on a stuck job: `functions/src/routes/questionnaireIntake.ts:481` `const staleThresholdMs = 15 * 60 * 1000;`, logged at `:499` as `extraction.stale_recovery`. Nothing recovers from clock skew. Corrected value: **"stale-job recovery"** or the commit's own "self-healing stale recovery."

### A11—"The full arc lives across nine specs"

> ":45 The full arc lives across nine specs:"

**WRONG.** Nine files are listed and all nine exist, but **three** fall outside the questionnaire arc. `specs/DST-053-active-devices-freshness-badge.md:10` states `**Affects:** Dashboard, Partner detail, Device detail, Region Breakdown, device tables`—a data-recency badge with no questionnaire involvement, and the very feature the page separately describes at `:35` as a telemetry item. `DST-054 — In-App User Role Management` is auth/RBAC. The genuinely questionnaire-scoped set is **six**: DST-047, 048, 050, 052, 055 (all titled "Questionnaire…") plus DST-051 (AI process status). DST-049 is import-section navigation—adjacent, and counted outside the arc here, which is what makes the tally nine minus six equals three. Corrected value: "six specs," or a weaker form that does not assert topicality—"the arc runs from DST-047 through DST-055."

### A12—the nine cited spec titles

> ":47-55 the nine bulleted links"

**SPLIT.** Eight of nine titles match the file's own H1 verbatim. **DST-049 does not**: the file `specs/DST-049-import-navigation-guardrails.md` opens `# DST-047 — Import Section: Dependency-Aware Navigation & Setup Guardrails`—the spec mislabels itself as DST-047. The page's link text (`DST-049 — Import Section: …`) is what the file *should* say, so the page is more correct than its source. Flag it as an upstream defect rather than a page defect. Source: `for n in 047 048 049 050 051 052 053 054 055; do f=$(git ls-tree -r --name-only origin/main | grep "^specs/DST-$n-"); git show "origin/main:$f" | grep -nE '^# '; done`.

### A13—"first developed for Override"

> ":57 DST uses the [multi-agent code review pipeline](…) first developed for [Override](/projects/override/)"

**WRONG.** See §F6–§F12 for the full timestamp analysis. In this repo specifically, the pipeline arrived by fan-out from the template, not from Override: `6b08827`, 2026-03-24 12:22:56 −0700, "Add machine user review system and cross-agent review pipeline"—seven seconds *before* Override's identical commit (`614a9da`, 12:23:03) and fourteen minutes *after* mergepath's initial commit (`b9734df`, 12:08:47). Corrected value: the pipeline was developed in the template repo and propagated; Override's genuine primacy is the March 17 review policy (§F13).

### A14—the two-strike rule cited to `REVIEW_POLICY.md`

> ":57 the [multi-agent code review pipeline](https://github.com/nathanjohnpayne/device-source-of-truth/blob/main/REVIEW_POLICY.md) … and the two-strike rule on bug fixes"

**WRONG citation.** The linked document does not contain the rule. `git show origin/main:REVIEW_POLICY.md | grep -ni strike` returns nothing. The rule lives at `docs/agents/operating-rules.md:352`, headed `### Two-strike audit rule`: "If an agent has made **two or more failed fix attempts** on the same issue … the next attempt **must** begin with a written audit of all prior attempts." Mirrored at `docs/agents/shared-operating-rules.md:93`. Corrected value: cite `docs/agents/operating-rules.md`, or drop the two-strike item from a sentence anchored on `REVIEW_POLICY.md`. This is the same defect on `friends-and-family-billing.md:47` (§H2).

### A15—"CodeRabbit with domain-specific guidance"

> ":57 machine user reviewers, CodeRabbit with domain-specific guidance"

**SUPPORTED.** `.coderabbit.yml` in this repo carries device-domain instructions—`:51` "Device specification components are data-dense. Verify that…". Added `746ae7e`, 2026-04-07 14:35:24 −0700.

### A16—"Development ended with my Disney tenure"

> ":67 Development ended with my Disney tenure, and the deployed instance now runs entirely on synthetic seed data"

**SPLIT—the development timeline is SUPPORTED, the tenure coincidence is UNPROVABLE.** The commit record establishes when product work stopped and says nothing about when the author's Disney tenure ended or whether the two coincided; this ledger treats comparable first-person tenure claims as UNPROVABLE elsewhere. The last genuine product feature is `0821e80`, **2026-03-06** 14:27:26 −0800, "feat: add actionable resolution to alerts (Register Device / Create Key)" (+588 lines in `AlertsPage.tsx`); the last product-code commit of any kind is `e4c0098`, same day. 178 commits land after that date, but per `git log origin/main --since='2026-03-07' -- src functions packages` the only app-code changes among them are one demo scrub (2026-08-20), one security bound (#154), one Recharts build fix (#120), and lockfile bumps. The prior run cited this row as WRONG; on the evidence it is **SUPPORTED**—the six-month tail is Dependabot, template sync, CI and the synthetic scrub, none of which is development of the product. The one caveat worth a clause: the synthetic-data scrub itself (`6e002a7`, 2026-08-20, "feat(demo): replace real partner data with a synthetic dataset (#165)") postdates the tenure and is the reason the sentence's second half is true.

### A17—synthetic seed data and Story Entertainment

> ":67 the deployed instance now runs entirely on synthetic seed data … presented under a fictional streaming group (Story Entertainment)"

**SUPPORTED, and quotable near-verbatim.** `.ai_context.md:41`: "`scripts/synthetic/` | … **The deployed instance runs entirely on this.**" `README.md:5`: "**The deployed instance runs on synthetic data.**" `scripts/synthetic/dataset.mjs:54` names it: `// SEK ("Story Entertainment Kit") is the fictional streaming group's device`. Seed machinery is `scripts/synthetic/{dataset,seed,reset}.mjs`; `DEPLOYMENT.md:778` records that every seeded document carries `_synthetic: true`.

### A18—the telemetry freshness badge

> ":35 Tracks telemetry freshness with a dashboard badge showing the actual import time range"

**SUPPORTED, against a spec header that says otherwise.** `src/components/shared/FreshnessBadge.tsx` and `FreshnessMicroPanel.tsx` ship and are wired into `DashboardPage.tsx`, `DeviceDetailPage.tsx` and `PartnerDetailPage.tsx`, while `specs/DST-053-active-devices-freshness-badge.md:11` still reads `**Status:** Proposed`. This is the canonical instance of §M1.

### A19—ADK normalization and the version mapping registry

> ":34 Normalizes ADK version strings and validates live versions against a version mapping registry, flagging devices running outdated or unrecognized builds"

**SUPPORTED.** Normalization at `functions/src/routes/versionMappings.ts:18-19` (`raw.replace(/\+plugin-[\d.]+$/, '')`), unmapped-version surfacing at `:192` (`router.get('/unmapped', …)`), specs `DST-044-version-mapping-registry.md` and `DST-045-live-adk-version-validation.md:93-94` (unrecognized `liveAdkVersion` draws the amber badge and lands in the Unmapped Versions panel).

### A20—partner alias registry, auto-creation, import history

> ":36 Manages partner relationships through an alias registry with contextual resolution, automatic partner creation from CSV imports, and a partner key registry with import history"

**SUPPORTED, all three.** Contextual resolution: `functions/src/services/partnerAliasResolver.ts:21` `resolutionType: 'direct' | 'contextual';`, rules evaluated at `:44`; spec `DST-046-partner-alias-registry.md:106` documents the `Titan - Novatek` → `Philips TVs` case. Auto-creation: `functions/src/routes/partnerKeys.ts:973` `// Auto-create partners for unmatched friendly names.`, shipped `50647fd` (2026-03-04). Import history: `src/pages/PartnerKeyRegistryPage.tsx:851` `function PKImportHistory({`, backed by `intakeImportHistory` (`functions/src/routes/intake.ts:470`).

### A21—the alerts claim

> ":37 Surfaces actionable alerts—pagination-aware, dismissible, with resolution paths that link directly to device registration or partner key creation"

**SUPPORTED, and "pagination-aware" is earned rather than decorative.** Pagination: `functions/src/routes/alerts.ts:14`, `:25`, `:33`. Dismissal: `:41` `router.put('/:id/dismiss', …)` writing `status: 'dismissed'` at `:68-71`. Resolution paths: `src/pages/AlertsPage.tsx:56` (Create Key modal) and `:206` (Register Device modal), introduced by `0821e80`. The adjective traces to a real bug: `e8a226e` (2026-03-06) "Fix three AlertsPage bugs: pagination cap, stale alert dismiss, partner dependency."

### A22—the four data sources

> ":27 lives across Airtable, Datadog, partner-submitted questionnaires, and spreadsheets maintained by different teams"

**SUPPORTED.** Airtable: `specs/DST-037-airtable-intake-import.md`, `functions/src/routes/intake.ts`. Datadog: `specs/DST-038-partner-key-registry.md:5` (`Datadog Manifest Key Mapping`). Questionnaires: the DST-047 arc. Spreadsheets: `docs/ARCHITECTURE.md:344` "Admin uploads AllModels CSV", `functions/src/routes/upload.ts:219`.

### A23—"the partner-engineering work I spent a decade doing at Disney"

> ":65 This is the partner-engineering work I spent a decade doing at Disney"

**UNPROVABLE from any artifact in scope.** Nothing in the repository or on the site attests to tenure length. It is a first-person biographical claim, appropriate as such; flagged only so the ledger is complete on numerics. No correction proposed.

### A24—status `ARCHIVED`

> ":13 status: \"ARCHIVED\""

**SUPPORTED,** and consistent with A16: no product development since 2026-03-06, deployed instance on synthetic data.

---

## §B `five-across`

### BM1—the repository was renamed; the product was not

The GitHub repository `nathanjohnpayne/gaycruisebingo` was renamed `nathanjohnpayne/fiveacross` on 2026-08-27. **The rename covers the repository and nothing else,** and the arithmetic makes the point better than the assertion: the token `gaycruisebingo` occurs **958** times in that tree across 186 files (`git grep -io gaycruisebingo 0395fd5 | wc -l`), and only **166** of those are the repository slug (`git grep -io nathanjohnpayne/gaycruisebingo 0395fd5 | wc -l`). **The ref is load-bearing and the commands are pinned to it.** `0395fd5` is the last commit before the rename propagated; at `origin/main` today the same commands return 795 and 14, because the rename rewrote the slug references it was supposed to. Unpinned, this row measures how far the rename has travelled rather than the thing it was written to establish (Phase 4b P3 on #834). The other 792 name things the rename did not touch.

Three of them are live, and each is a different kind of thing:

- **The Firebase/GCP project.** `.firebaserc` still reads `"projects": { "default": "gaycruisebingo" }`—the deployed project, coexisting with a separate `fiveacross` project as the deliberate data-plane boundary described in `docs/adr/0008-five-across-second-firebase-project.md`, which §B18 already cites as the interim tenant boundary. `specs/w1-event-seed.md:8` pins both by name: the seeder resolves `gaycruisebingo` → `med-2026` and `fiveacross` → `bodega-bay-2026`.
- **The domain and its hosts.** 204 hits on `gaycruisebingo.com`, plus 68 on the `gaycruisebingo.firebaseapp.com` / `gaycruisebingo.web.app` origins—one of which serves the shipped Open Graph image at `src/editions.ts:91`.
- **The Gay Cruise Bingo Edition,** a live product surface rather than a historical label. `src/editions.ts:31` makes `gcb` the `DEFAULT_EDITION`; `:35` gives its wordmark `'GAY CRUISE BINGO'`; `:81-82` its `documentTitle` and `appName`.

The repository states the distinction itself, in a comment on that Edition's brand record, and it is quotable. `src/editions.ts:37-43`: "The platform endorsement line, carried here since #688. It is an **ENDORSEMENT, not a rename**: the wordmark, the cruise vocabulary, the adult posture, gaycruisebingo.com and the legacy Firebase project are all unchanged—GCB is simply one Edition of Five Across now, on the same engine as Vacay." The `wordmarkByline` it introduces is `'BY FIVE ACROSS'`. A page describing the relationship can quote that line rather than paraphrase it.

The tree says so in its own words, at `src/editions.ts:37-43`: "It is an ENDORSEMENT, not a rename: the wordmark, the cruise vocabulary, the adult posture, gaycruisebingo.com and the legacy Firebase project are all unchanged—GCB is simply one Edition of Five Across now, on the same engine as Vacay."

**Why this is a rewrite criterion and not trivia.** Issue #752 requires the page to keep Gay Cruise Bingo, Vacay Bingo and Five Across unambiguous as original event, travel edition and universal platform—the distinction §B20 already checks against the Edition registry. A rewrite that reads an August *repository* rename as a *product* rename fails that criterion outright, and it would do so while sounding well-informed. Prose in this ledger has been updated where it means the repository (the evidence-repo path in the header) and deliberately left alone where it does not: §B9's `docs/projects/gaycruisebingo/prds/gaycruisebingo.md` is an in-tree path the rename did not touch and that still resolves, and §E13's quotation of `.mergepath-sync.yml:195-196` (`name: gaycruisebingo`, `repo: nathanjohnpayne/gaycruisebingo`) is still literally what that file says. That manifest entry is now a stale pointer surviving on GitHub's redirect—a mergepath follow-up, not a defect in the quotation.

### BM2—the #820 engagement cluster: one provenance chain for §B25–§B36

Every figure in §B25–§B36 except the like-for-like pair in §B27.1, and the corrected §B15, entered `five-across.md` through PR **#820**, The 772 and 73 in §B27.1 were derived by this audit and first published by #834, not by #820, "content(five-across): replace the standings gap with the standings," merged 2026-08-27. That PR replaced a paragraph admitting the standings were unrecoverable, and it documents per-claim provenance in two tables. Neither source is a repository:

- **Firestore**—the frozen production event `events/med-2026`, `frozenAt` 2026-07-23 23:00 Europe/Rome. Player-row root aggregates, `dayStats` per-card buckets, and `days/{n}/meta` first-bingo pins.
- **PostHog**—project **503790** (`FiveAcross.app`). #820 queried 2026-07-14 → 2026-07-24, **eleven** calendar days.

**The declared window for this cluster is the Event's own ten days, 2026-07-15 → 2026-07-24 in `Europe/Rome`**, and every figure below is stated over it unless a row says otherwise. Three scopes were in play and the page mixed them (Phase 4b P2 on #834). The differences are small and real, so the window has to be declared rather than inferred:

| Figure | 11-day (#820) | 10-day, project `America/Los_Angeles` | **10-day, Event `Europe/Rome`** |
|---|---:|---:|---:|
| Sessions | 517 | 494 | **499** |
| Markless sessions | 398 | 379 | **384** |
| `mark_square` | 820 | 813 | **813** |
| Distinct markers | 13 | 12 | **12** |
| `demand_proof` | 8 | 7 | **7** |
| `heart_post` | 19 | 19 | **19** |
| `reshuffle_card` | 7 | 7 | **7** |
| Markers at 5+ mark-days | 9 of 13 | — | **9 of 12** |

All three round the markless share to **77%**. The Rome window is chosen because the page describes the Event, and the Event keeps Rome time; the project's own timezone is an artifact of how PostHog was configured, not of the thing being measured. Rome bounds in UTC are `2026-07-14 22:00` to `2026-07-24 22:00`.

**What this audit re-derived, and what it did not.** The PostHog half was re-run in this session through the PostHog MCP against project 503790, and every figure reproduced; those rows are **SUPPORTED**, with the query stated in the row so the next reader can repeat it rather than trust it. The Firestore half could not be reached—this session has no read path to the production project—so those rows are **EXTERNALLY SOURCED** per §M6: provenance named, not re-derived. No row below asserts a figure on the strength of #820's prose alone without saying that is what it is doing.

**#820's own exclusions, recorded because they are load-bearing and because they check out.** The `bingo` event count is excluded and does double-count: PostHog carries **126** against Firestore's authoritative **61**, and this audit reproduced the 126. `login_failed` is excluded as evidence auth was healthy: it reads **1**, and the SDK is gated on auth resolution, so it under-captures precisely the failures it would need to capture—an absence that is an instrumentation artifact, not a finding, and §B12's "the fires were auth" is the corroborating record. PostHog person counts are excluded from the roster, and are unreliable in *both* directions: `$pageview` in the window carries **144** distinct persons against a sixteen-player roster, inflated by pre-identify anonymous persons, while `login` carries 14 and `$identify` 15, under it. Firestore owns the roster for that reason.

**The cross-check holds, but only once the windows are made to match.** PostHog records **820** `mark_square` events over the eleven-day query window against Firestore's **845** squares—820 reproduced here—but those totals are not comparable: the 820 carries a pre-embarkation day (§B27) and 41 post-freeze ceremonial marks (§B34) that the standings exclude by design, so the apparent 25-mark gap is an artifact. Restricted to the scoring window the like-for-like figure is **772**, and the real gap is **73** (§B27.1). That is what offline queueing explains, and §B11's `persistentLocalCache` is the mechanism for. The two systems also agree independently on **10** players with a bingo (§B31).

**One caveat runs through the whole cluster: the two systems keep different clocks.** The PostHog project's timezone is `America/Los_Angeles`; the Event's is `Europe/Rome` (`specs/d15-tutorial-seed.md:27`). Window totals are unaffected by this. Per-day figures are not—see §B34, where the headline number is stable but the count behind it moves by eleven marks depending on which day boundary is meant.

### B1—the cruise

> ":35 a phone-first multiplayer game built for a nine-night Mediterranean cruise from Trieste to Barcelona"

**SUPPORTED.** `src/data/seed.ts:176-301` defines ten days: Day 1 Trieste 2026-07-15 (embark) through Day 10 Barcelona 2026-07-24 (disembark). July 15 to July 24 is nine nights. Tabulated independently at `specs/schedule-correction.md:19-30`.

### B2—the card

> ":39 Deals every player a frozen, randomized 5×5 card from a community-editable prompt pool, with a per-square tally showing who else got it"

**SUPPORTED, all three parts.** Frozen 5×5: `src/game/logic.ts:263` `/** Deal a frozen 5x5 board: 24 sampled prompts + free center (index 12). */`, seeded RNG at `:269`; dealing draws only from the day's frozen snapshot (`specs/d15-dealing.md:8`). Community-editable: `addItem` at `src/data/api.ts:2669`, player submissions landing `status: 'pending'` (`specs/d15-approvals.md:33`). Attributed tally: `specs/w2-tally.md:6` "Every Mark … self-publishes an ATTRIBUTED entry to that Prompt's Tally, and the Square gains a count plus a tap-to-see-who list."

### B3—"at 8:00 a.m. ship time each day"

> ":40 Unlocks a fresh themed card at 8:00 a.m. ship time each day"

**SPLIT.** 8:00 a.m. is **SUPPORTED**; "ship time" and "each day" are both loose. `src/data/seed.ts:150-168` implements `unlockAt0800Rome(date)` as `Date.parse(\`${date}T08:00:00+02:00\`)`—a hardcoded CEST offset baked to a millisecond epoch at seed time, with the comment "no ship-clock drift handling needed." `EventDoc.timezone === 'Europe/Rome'` (`specs/d15-tutorial-seed.md:27`). It is *effectively* ship time for this sailing because every port was CEST, but nothing tracks a ship's clock. And Day 1 is exempt: `src/data/seed.ts:194-199` sets `unlockAt: 0`, the "live from event open" sentinel. Defensible weaker form: "at 8:00 a.m. local time each morning after the first."

### B4—"on the final sea day"

> ":42 Ends with a choreographed two-beat finale: a last-call standings moment on the final sea day"

**WRONG, and the itinerary has no plural of "sea day" to be final among.** `specs/d15-finale.md:8`: "In the STANDARD shape those instants are **20:00 on Day 9** and 08:00 on Day 10." Day 9 is `2026-07-23`, **Marseille**—a port day (`src/data/seed.ts`, day index 8). Corroborated at `specs/d15-scheduler-unlock.md:17`: "the scheduler posts exactly one `last_call` Moment at 20:00 on Day 9." The itinerary contains **exactly one** sea day, Day 3 / 2026-07-17, six days earlier: `grep -n "Sea Day" src/data/seed.ts` returns a single hit, line 213. Corrected value: "on the last night at sea," or literally "at 20:00 the night before disembarkation." Beware the decoy at `src/data/schedule-correction.test.ts:90`, which shows `index: 8, place: 'Sea Day'`—that is `oldLiveDays()`, the pre-correction seed the 2026-07-17 fix superseded (`specs/schedule-correction.md:11`).

### B5—tutorial cards bookending

> ":40 with tutorial cards bookending the trip"

**SUPPORTED.** Day 1 `pool: 'easy'`, `tutorial: true` (`src/data/seed.ts:177-201`); Day 10 `pool: 'closing'`, `tutorial: true` (`:289-301`). `specs/d15-tutorial-banners.md:15` confirms an opening and a closing banner.

### B6—"no prompt repeating across a player's cruise"

> ":40 and no prompt repeating across a player's cruise"

**WRONG—the guarantee is scoped, and it is the universal that fails.** `specs/easy-mix.md:17`: "**Easy items may repeat across days**—per-day tallies make re-marking 'Get your favorite dessert' on Day 4 legitimate—so the Event-wide no-repeat exclusion applies to the **main half only**." Implementation agrees: `src/game/logic.ts:293-295` "easy (embark) repeats across days are intentional … so embark items are never excluded." Two further limits: the exclusion **resets on pool exhaustion**, roughly every 3⅓ days (`src/game/logic.ts:222-225`: "if honoring it would drop the usable pool below `MIN_POOL`, the pool is exhausted (~80 main items ÷ 24/day ≈ 3⅓ Days) and the exclusion RESETS"), and reshuffled prompts return to the eligible pool (`specs/reshuffle.md:24`). From Day 4 onward, at the default `easyMixRatio` of 0.5, half of every card carries no repeat guarantee at all. Corrected value: "no *main-pool* prompt repeating until the pool is exhausted and the exclusion resets—roughly every 3⅓ days—with the easy half deliberately allowed to recur." Scoping matters: an unqualified cruise-wide guarantee is false for the main half too, because both the exhaustion reset and a reshuffle return main-pool prompts to the eligible set.

### B7—hearts never count toward score

> ":41 with hearts as social recognition that deliberately never counts toward score"

**SUPPORTED, and near-verbatim in the spec.** `specs/feed-hearts.md:12`: "A reaction, **never evidence and never score: hearts touch no stats, no leaderboard, no win logic**." One deliberate exception exists and does not undercut the claim: at the Standings Freeze the scheduler computes a Most-Loved Photo *award* from the hearts collection (`specs/feed-hearts.md:48`, `specs/most-loved-photo.md`). An award is not score, and standings are unaffected.

### B8—three claim modes

> ":44 Offers three claim modes as an event-level vibe knob—honor system (with a one-tap \"Cross My Heart\" pledge), proof-to-mark, or admin-confirmed"

**SUPPORTED.** Three modes and the pledge string are **SUPPORTED**: `src/domainTypes.d.ts:12` `export type ClaimMode = 'honor' | 'proof_required' | 'admin_confirmed';`, exactly three, default `honor` (`src/data/occasions.ts:64`). "Cross My Heart" ships literally at `src/components/ProofSheet.tsx:464` (`🎖️ Cross My Heart`), specced in `specs/w4-honor-pledge.md`.

"One-tap" is **SUPPORTED as written**, and an earlier revision of this row was wrong to split it. The page modifies *the pledge*—"a one-tap 'Cross My Heart' pledge"—not the claim flow, and the pledge is one tap. The spec's "Total claim cost is two taps" counts the square tap plus the pledge tap, which does not contradict a one-tap pledge. No rewrite required; a downgrade here would have sent Phase 2 to rewrite an accurate sentence.

### B9—"the eight days before embarkation"

> ":48 Phase 0 shipped in the eight days before embarkation"

**SUPPORTED, exactly eight.** Repo opens `a2965a9` 2026-07-07; the Phase 0 scaffold is `568b910` the same day. Embarkation is 2026-07-15 (`src/data/seed.ts:180`, pinned by `src/test/x-launch-checklist.test.ts:15`). 2026-07-15 minus 2026-07-07 is eight days. Independently corroborated by the PRD risk table, `docs/projects/gaycruisebingo/prds/gaycruisebingo.md:71`: "Sailing is ~8 days out (embark July 15) | High | Ship a ruthless Phase 0 by embarkation."

### B10—"deliberately Cloud Functions-free"

> ":48 Phase 0 shipped … deliberately Cloud Functions-free: each player writes their own board and stats, and the leaderboard is a client-side sort."

**SPLIT.** True of the deployment, not of the tree. The intent is documented word for word at `docs/architecture/0002-application-architecture.md:21`: "Phase 0 (the MVP shipped before the Event opened) is Cloud Functions-free … It deploys as static hosting plus Firestore/Storage rules, and runs on the Spark plan." But `functions/src/index.ts` shipped in the Phase 0 scaffold commit itself (`568b910`, 2026-07-07), 125 lines exporting `moderateProof`, `recomputeStats` and `share`—the commit message calls them "wired but gated." First functions actually built for deploy: `78f3a38`, `68c6751`, `7ffc561`, all 2026-07-09. Defensible weaker form: "deliberately deployed without Cloud Functions," which is what the architecture doc claims and what the Spark plan enforces.

### B11—offline-first PWA

> ":50 The app is an installable PWA with an offline-first Firestore cache, so marks survive dead zones at sea and sync on reconnect"

**SUPPORTED.** Installable: `vite.config.ts:3` `import { VitePWA } from 'vite-plugin-pwa'`, manifest at `:140`, icons in `public/`. Service worker: `src/sw.ts`, with Workbox deps. Offline cache: `src/firebase.ts:36-38` `initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) })`, guarded by `src/firebase.test.ts:48` and specced in `specs/w0-offline-persistence.md` under ADR 0006.

### B12—live operations mid-cruise

> ":50 Live operations continued through the sailing itself—moderation hardening, feature drops, and fixes shipped mid-cruise through the auto-updating PWA while the game was being played."

**SPLIT, and the count was wrong on every rule.** "Feature drops and fixes" **landed** during the sailing, which is SUPPORTED and then some. The **80** this row published is not reproducible, including by its own stated command, which returns **88** today; `--since`/`--until` without offsets resolve against the runner's local timezone, so the figure moved with the machine (Phase 4b P2 on #834).

**Pinned rule, and the numbers it gives.** Bounds are the Event's own ten days in Rome, `--since='2026-07-15T00:00:00+02:00' --until='2026-07-25T00:00:00+02:00'` on `origin/main`:

| Counting rule | Commits |
|---|---:|
| Reachable (`git log`) | **98** |
| First-parent (`git log --first-parent`) | **96** |

**Use 96 and say the rule.** This repository lands work through squashed pull requests, so first-parent is the count of changes that landed; the reachable figure double-counts the commits inside merges. A page saying a bare number without the rule is unreproducible whichever number it picks.

**There is no classification supporting "most were firefighting."** Nothing in this ledger or the repository partitions those 96 into fix and feature, and the qualifier should not be restated as if there were. What the record does carry is the weaker, checkable claim already in this row: mid-cruise commits **skew** to auth and PWA work. Among them, `bd77418` "feat(easy-mix): blend embark-pool squares into main-day cards (#394)" and `833d57e` "feat(dealing): reshuffle a hard Day Card (3 per cruise, pristine cards only) (#383)", both on 2026-07-17. One limit on the word *shipped*: the log proves commits landed on `main`, not that they were deployed, reached the auto-updating PWA, or arrived while anyone was playing. No deployment record was found for that window. "Development continued through the sailing" is what the evidence carries; "shipped mid-cruise" needs a deploy log or an established automatic main-to-production path.

"Moderation hardening" is **weak in that window**: the moderation stack (server-authoritative auto-hide, Vision gate) all landed 2026-07-09, six days *before* embarkation. Mid-cruise commits skew to auth and PWA firefighting. Defensible weaker form: drop "moderation hardening" from the mid-cruise list, or move it to the pre-embarkation sentence where it belongs.

### B13—"eight party themes plus two tutorial themes"

> ":52 eight party themes plus two tutorial themes, all held to WCAG AA contrast by computed-from-CSS test suites"

**WRONG as a present-tense claim about the cruise.** Loosest matcher first: `grep -c "^\[data-theme=" src/theme/themes.css` returns **22**, and the registry at `src/theme/themes.ts:48-227` agrees at 22. Narrowing to Gay Cruise Bingo's own set gives **13 party plus 2 tutorial = 15**, because the schedule correction added five more party themes (`themes.ts:129,136,143,150,156`). The spec is explicit: `specs/w1-themes.md:19` "the **fifteen** Gay Cruise Bingo Themes are `gcb`", and `:5` narrates the growth from eight. The remaining seven are Vacay (3), Five Across (3) and one platform chrome theme. Corrected value: "fifteen themes for the cruise—thirteen party plus two tutorial—out of twenty-two across the platform." The page's "eight plus two" describes the pre-launch state only; `themes.ts:105-107` preserves that history in a comment ("Appended after the eight party themes so no existing THEMES index shifts"), which is likely where the number was read from.

### B14—WCAG AA by computed-from-CSS suites

> ":52 all held to WCAG AA contrast by computed-from-CSS test suites"

**SUPPORTED, and the coverage is total by construction.** `src/theme/w1-themes.test.tsx:70-87` parses `themes.css` at test time, sets `const TEXT_MIN = 4.5; // WCAG 1.4.3 Contrast (Minimum), normal text`, and iterates the full `THEMES` registry × 8 token pairs. A second suite, `src/theme/theme-on-color-contrast.test.tsx:23-24`, adds `UI_MIN = 3.0` for WCAG 1.4.11 on composited surfaces; a third covers badges. The suite also asserts a `[data-theme]` block exists for every `ThemeId` (`:73-78`), so a new theme cannot escape it. Note this row survives B13: the suites cover all 22 themes, which is *more* than the page claims.

### B15—"16 bingos across 124 squares"

> ":52 The cruise champion finished with 16 bingos across 124 squares."

**SUPPORTED.** ~~**UNPROVABLE**—the numbers trace to wireframe fixture data for a fictional player, and they predate the sailing.~~ *(Superseded 2026-08-27. The struck verdict and the reasoning that produced it are kept below rather than deleted, because a struck row is a record and not a task.)*

The figures are the real result, written into the wireframe *after* the cruise ended. `plans/daily-cards-wireframes.html:3735` reads `<div class="hstat">16 bingos · 124 squares</div>` and `:3734` above it `<div class="hname">Zacaria Arab</div>`. **Both lines were added 2026-07-24 10:47:50 +0200 by `292f5f0`, "feat(share-cards): final-standings card from the farewell podium; BINGO card polish (#449) (#450)"**—disembarkation morning, on an itinerary running 2026-07-15 to 2026-07-24 (`src/data/seed.ts:180`, `:299`). Verify with `git log -L 3735,3735:plans/daily-cards-wireframes.html` and `git log -L 3734,3734:plans/daily-cards-wireframes.html` in `~/GitHub/fiveacross`; each returns exactly one commit and it is `292f5f0`. "Zacaria Arab" is not an invented name either: it is the champion, and the same name the page now prints. The underlying aggregate is Firestore's (§BM2) and is **EXTERNALLY SOURCED**; what this row establishes from the repository is the thing the superseded verdict got backwards—that these numbers are a post-cruise record, not a pre-cruise fixture. The surviving artifact is the app's own rendered final-standings card, now published at `public/images/projects/five-across-final-standings.png`.

**The superseded verdict, and the method error inside it.** The original row read: "UNPROVABLE—the numbers trace to wireframe fixture data for a fictional player, and they predate the sailing… First appearance: `plans/daily-cards-wireframes.html:3735`… That file was added by `6d128b2`, **2026-07-11**—four days before embarkation," sourced to `git log --diff-filter=A -- plans/daily-cards-wireframes.html`. The file date is correct and `6d128b2` did add the file on 2026-07-11. The inference is not: that command dates a **file** and says nothing about a **line**, and here the two differ by thirteen days. Everything the row then built on the file date collapses once the line is dated—the "fictional player," and the reading of the later occurrences as copies of invented data. Those occurrences (`src/components/w2-share-cards.test.tsx:729,829,2374,2500`; `tests/e2e/emoji-raster.spec.ts:57`; `src/format.test.ts:148`) are still copies. They are copies of a real standings card. See §M5, which generalises the rule, and §M5.1, which records that §B23 of this same file had the correct date for the same commit two rows below while §B15 was asserting the opposite.

**What survives from the original row.** One sentence of it does, and it is the sentence that should have been the whole verdict: *no artifact in the repository records the final standings as data.* That was true then and is true now—the search across `specs/`, `docs/`, `docs/audits/`, `plans/`, `artifacts/`, `scripts/`, every commit message and every data export still returns nothing. The error was concluding from that absence that the figures were invented, when the repository in fact contained a rendered card carrying them, committed on the day the standings froze.

### B16—"wildcard event routing at the edge"

> ":58 one codebase, wildcard event routing at the edge, centralized authentication with a single-use handoff, and tenant isolation gated before unrelated groups share a backend"

**WRONG for the routing clause—the code is real, deployable and tested, and it routes nothing.** `worker/wrangler.toml:1-7`, verbatim: "Deliberately deployable but NOT routed. `routes` is commented out below, so `wrangler deploy` uploads a new version and changes nothing about what the public sees. Attaching the routes IS the cutover, it is a human step gated on the DNS work in #539." The block itself is entirely commented:

```toml
# routes = [
#   { pattern = "*.fiveacross.app/*", zone_name = "fiveacross.app" },
#   { pattern = "*.vacaybingo.com/*", zone_name = "vacaybingo.com" },
# ]
```

`worker/README.md:48` restates it: "The deliverable of #545 ends at 'deployable, tested, documented'. Attaching the routes is the cutover, and the cutover is a human step." Three blockers remain open (#546, #852, #888). Only `workers_dev = true` is live, and `worker/README.md:68` notes it can prove only the refusal path. Live hostnames are served directly by Firebase Hosting. Corrected value: "a wildcard event router built for the edge and held one human step short of cutover." Worker shipped `940256f`, 2026-08-18.

### B17—centralized auth with a single-use handoff

> ":58 centralized authentication with a single-use handoff"

**SPLIT—mechanism SUPPORTED, reachability WRONG.** The single-use machinery is real: `functions/src/authHandoff.ts:2` "minting a single-use code and exchanging it for" a custom token, keyed by SHA-256 at `authHandoffs/{codeHash}`, consumed transactionally at `:407`/`:583-591`. But `docs/adr/0010-centralised-auth-origin-with-handoff.md:2` carries front matter reading **`implemented: false`**, and the body says so plainly: "Decision accepted; the code is implemented, but the flow is not yet reachable … human provisioning and IAM work still prevent players from signing in through this path today." `specs/auth-handoff.md:189` names the blocker: without `run.services.update` on the deploy service account, "sign-in through the handoff is unavailable on every Event origin no matter what the client does." Defensible weaker form: pair it with the routing clause—both are built and both await the same human cutover.

### B18—tenant isolation "gated"

> ":58 and tenant isolation gated before unrelated groups share a backend"

**SUPPORTED, and unusually well-sourced.** `specs/x-multi-event-schema.md:35`: "what the rules provide is PATH-SCOPING plus per-Event ADMIN scoping, **NOT tenant isolation** … A multi-Event deployment with DISTINCT cohorts … is a REQUIRED rules workstream before that shape ships." `specs/path-addressing-and-root.md:57`: "the tenant-isolation workstream that would change this **has not landed** … must not be claimed before it ships." The page obeys that instruction exactly. The interim boundary is a second Firebase project (ADR 0008).

### B19—the Sonoma weekend

> ":58 The first non-cruise event—a Sonoma Coast weekend in August 2026—has since run on that build."

**SUPPORTED, and it genuinely ran rather than merely being configured.** Event config: `scripts/seed-data/bodega-bay-2026.mjs:189` `name: 'Bodega Bay'`, `:196-197` `startsOn: '2026-08-07'`, `endsOn: '2026-08-09'`. Evidence of live play, not just setup: `specs/w1-event-seed.md:14` records that an August 5 text correction had to be an in-place data edit because "**live documents** retain their original content-hash IDs because Day 0's frozen snapshot and **already-dealt cards** refer to those IDs"; `specs/d15-schema-contract.md:8` refers to "the **live Bodega wrap-up's** operator-corrected 👋"; four specs use the phrase "both live Events"; and three commits land on the event date itself (`4147326`, `e01a100`, `300cdb0`, all 2026-08-07) fixing unlock copy in flight. On "Sonoma Coast": the repo names the event Bodega Bay throughout; the only literal hit is a CSS comment, `src/theme/themes.css:287` "adventurous Sonoma Coast." Bodega Bay is on the Sonoma Coast, so the phrasing is fair description rather than a repo string.

### B20—Vacay Bingo as the travel edition

> ":58 with Vacay Bingo as its travel edition and Gay Cruise Bingo preserved as the original"

**SUPPORTED.** `src/editions.ts:121` `wordmark: 'VACAY BINGO'`, `:128` `wordmarkByline: 'BY FIVE ACROSS'`; edition id `vacay`, default theme `the-birds` (`specs/w1-themes.md:22`). Three editions exist in the registry: `gcb`, `vacay`, `fiveacross`.

### B21—the moderation stack

> ":52 a moderation stack (server-authoritative report auto-hide, an admin roster for round-the-clock coverage, flag-gated Cloud Vision)"

**SPLIT.** Auto-hide **SUPPORTED**: `functions/src/autohide.ts:1-9` "a Cloud Function (admin SDK, which BYPASSES security rules) flips its `status` to `'hidden'`", specced at `specs/w4-server-authoritative-hide.md:7`, shipped `7ffc561` (2026-07-09). Flag-gated Vision **SUPPORTED and off by default**: `functions/src/visionGate.ts:49-50` reads `ENABLE_VISION_MODERATION`; commit `68c6751` says "**off-by-default**". The roster exists (`EventDoc.admins: string[]`, `src/domainTypes.d.ts:305`, sole privilege authority per `:1285`), but "**round-the-clock coverage**" is **UNPROVABLE**—it is a staffing claim with no code correlate. Defensible weaker form: drop the coverage qualifier—"an admin roster." Any roster-sizing or time-zone wording is the same unverified staffing claim in new words; an `admins` array establishes who holds privilege, never how the holders were scheduled.

### B22—"ten days of live play" against "nine-night"

> ":56 stress-tested by ten days of live play"; ":35 a nine-night Mediterranean cruise"

**SUPPORTED—both are correct and they reconcile.** Ten calendar days (Day 1 2026-07-15 through Day 10 2026-07-24) span nine nights aboard. Pinned in code at `specs/d15-tutorial-seed.md:27` (`days.length === 10`) and `src/data/d15-tutorial-seed.test.ts:74` (`describe('DAYS — the ten-Day itinerary mapping')`). Both tutorial days carry playable cards, so all ten days are live. Recorded here because it reads like a contradiction and is not; do not "fix" it.

### B23—share cards

> ":43 Renders BINGO and leaderboard share cards on-device and hands them to the native share sheet"

**SUPPORTED.** `src/components/ShareCard.tsx:1` `import { toBlob } from 'html-to-image';`, rasterized at `:127`, handed off at `:1188` `await navigator.share({ files: [file], title, text });`. ADR 0005 states the principle. Both card types confirmed (`specs/w2-share-cards.md`; the final-standings card added by `292f5f0`, 2026-07-24). Minor imprecision if the prose ever says "canvas": the shipping path is html-to-image's SVG `<foreignObject>` pass, not `OffscreenCanvas`.

### B24—the stack line

> ":23 stack: \"React · TypeScript · Vite · Firebase · Cloud Functions · Cloudflare Workers · PostHog\""

**SUPPORTED with one asterisk.** React 19, TypeScript (four tsconfigs), Vite, Firebase (two projects), Cloud Functions (25 modules in `functions/src/`) and PostHog (`posthog-js`, `specs/posthog-analytics.md`, three-tier ingest failover in `cd99fb8`) are all genuinely in use. **Cloudflare Workers** is real, deployed and tested code that fronts no production traffic—see B16. Nothing in the line is fabricated.

### B25—the standings survived, and the card with them

> ":56 The standings survived—frozen in the production Firestore, with the app's own final share card intact—so the bet can be scored."

**SPLIT—the frozen event is EXTERNALLY SOURCED; the surviving card is SUPPORTED.** The freeze is `events/med-2026`, `frozenAt` 2026-07-23 23:00 Europe/Rome, from #820's Firestore table (§BM2); this session has no read path to that project. The card is checkable and checks out: the rendered artifact is published in this repository at `public/images/projects/five-across-final-standings.png`, and its wireframe original is `plans/daily-cards-wireframes.html:3728-3740` in the Five Across tree, committed `292f5f0` on disembarkation morning (§B15). Worth naming for the rewrite: this sentence exists to retract an earlier paragraph on the same page which asserted the opposite—that the leaderboard "never came back as an export." §B15's superseded verdict was this ledger's version of the same mistake, reached by a different route, and the two were corrected independently a day apart.

### B26—the embark card's 27 bingos from eleven players

> ":56 the embark tutorial drew 27 bingos from eleven players, and the next two cards managed one apiece all cruise"

**EXTERNALLY SOURCED, and carrying an internal tension the rewrite must settle before restating it.** The source is Firestore's `dayStats` per-card buckets (§BM2), not re-derivable here. Two things this audit can say. First, PostHog offers no cross-check by construction: the `bingo` event carries no custom properties in project 503790's taxonomy, so there is no per-card or per-day attribution in that system at all, and the per-card split is Firestore-only.

Second, the tension. **Eleven players bingoing on the embark card cannot be reconciled with ten players holding a bingo event-wide** (§B31), and both figures are #820's own—one from `dayStats` buckets, one from player-row root aggregates. PostHog independently agrees with the ten: exactly **10 distinct persons** fired a `bingo` event across the whole window. The most plausible innocent explanation is **eliminated**: a tutorial-day exclusion applied to the root aggregate but not the bucket would resolve it, and the repository says the opposite. `src/game/d15-scoring-aggregates.test.ts:71-78` asserts `sumDayStats` "counts the embark (tutorial) card toward the summed totals", commented "Squares/bingos from the embark card DO count—it is easy but real play." The tutorial exclusion is narrower than that: `eventFirstBingoAt` ignores a tutorial Day's `firstBingoAt` so an embark bingo never takes the Event-wide First to BINGO honour (`specs/d15-finale.md:16`, and the two tests below it), and the ceremonial exclusion applies to Day 9, not Day 0. So an embark-card bingo does raise a player's event-wide `bingoCount`, and eleven players bingoing there should put at least eleven players above zero. Remaining candidates all require the production data to settle—a departed player whose bucket outlived their row, or a misread of one of the two tables—so a reader can subtract, and the two figures must not sit in one paragraph unreconciled.

**Disposition, owner-chosen 2026-08-27: keep both and name the tension.** The page states the eleven on the embark card and the ten holding an event-wide bingo, and says plainly that its two records disagree and that the disagreement is unresolved. This is the option that spends a few words on bookkeeping, and it is the right one for a page whose subject is what the evidence does and does not support: the alternative—printing the figure that happens not to collide with anything—is how a portfolio quietly launders a contradiction. Do not present a reconciliation that has not been found. An earlier revision of the page printed the eleven and not the ten, which hid the arithmetic rather than fixing it; the page now prints both and names the disagreement as unresolved, per the owner disposition below. One detail does corroborate the sentence's *shape*: PostHog records **zero** `bingo` events on embark day itself (2026-07-15, Europe/Rome), so the embark card's bingos accrued days later—which is precisely the "cards stay markable" point the same paragraph makes.

### B27—"517 sessions over ten days"

> ":56 of 517 sessions over ten days, 77% contained no mark at all"

**SPLIT—the count is SUPPORTED and exact for the window queried; "over ten days" is WRONG.** PostHog project 503790, window 2026-07-14 → 2026-07-24: `SELECT count(DISTINCT $session_id) FROM events WHERE timestamp >= toDateTime('2026-07-14 00:00:00') AND timestamp < toDateTime('2026-07-25 00:00:00') AND $session_id IS NOT NULL AND $session_id != ''` returns **517** on the nose. "Ten days" does NOT reconcile with §B22's ten-day itinerary, and an earlier version of this row waved that away. The query window is **eleven** calendar days: it opens 2026-07-14, the day before embarkation. Calling the result a ten-day statistic was wrong (Codex P2 on #834).

**Re-derived on the declared window (§BM2), the Event's ten days in `Europe/Rome`: `499` sessions and `813` `mark_square` events.** The same ten days bucketed in the project's own `America/Los_Angeles` give `494`; the eleven-day query gives `517`. **A page saying "ten days" must use 499, and must use the same window for every other PostHog figure it prints**—mixing a ten-day session count with eleven-day demand and marker counts is exactly the defect Phase 4b found on #834.

### B27.1—the like-for-like mark comparison

Derived by this audit rather than inherited from #820, and **now published**: #834 states the 845-against-772 comparison and the 73-mark gap in three places. Recorded here because the raw comparison it replaces was wrong.

`820` PostHog marks and `845` Firestore standings squares are **not comparable**, because they cover different windows in two directions at once: the 820 includes the pre-embarkation day (§B27) and the post-freeze ceremonial marks the standings exclude by design (§B34, §B36), while the 845 includes neither. The raw 25-mark difference is therefore an artifact, and cannot corroborate anything.

Re-derived, restricted to the scoring window—embarkation to the 23:00 freeze instant, which is `2026-07-23 21:00 UTC`:

| Window | `mark_square` |
|---|---:|
| Ten days, 2026-07-15 → 2026-07-24 | **813** |
| Of which **before** the freeze instant | **772** |
| Of which **after**, on the ceremonial card | **41** |

The 41 reproduces §B34's figure exactly, from an independent query, which is a useful check on both.

**Like-for-like: 845 Firestore standings squares against 772 PostHog marks in the same window—a gap of 73.** The direction is unchanged and the magnitude is nearly three times the artifact it replaces, so the offline-queueing reading is *better* supported by the corrected comparison than by the raw one. Still corroboration rather than proof: nothing here demonstrates those 73 were queued offline, only that Firestore holds marks PostHog never logged.

### B28—"77% contained no mark at all"

> ":56 77% contained no mark at all, people opening the app just to read the feed and check the standings"

**SPLIT—the arithmetic is SUPPORTED and re-derived here; the motive clause is UNPROVABLE and is the page's own inference.** Sessions with no `mark_square` event: on the declared Rome ten-day window, **384 of 499**, which is 77.0%. The same ten days in the project timezone give 379 of 494 (76.7%); the eleven-day query gives 398 of 517 (76.98%). All three round to 77%, so the headline survives every scope and the counts beneath it do not—**a page saying ten days must use 384 of 499.** What the number cannot carry is *why*—"opening the app just to read the feed and check the standings" is a reading of an absence, and the absence is equally consistent with a cold boot, a push notification, or a failed sign-in (§BM2 on `login_failed` under-capturing exactly that). The page states it as observation. Defensible weaker form: mark it as the inference it is, or support it with the feed and leaderboard `$pageview` paths within those 398 sessions, which is a query nobody has run.

### B29—hearts and doubts each traced to one player

> ":56 the social mechanics built for exactly that audience collapsed: hearts and doubts each traced to a single player"

**SUPPORTED, re-derived here, and the record is starker than the page states.** On the declared Rome ten-day window, `heart_post` fires **19** times from **1** distinct person and `demand_proof` **7** times from **1**. The eleven-day query returns 8 demands; the eighth fell on 2026-07-14, before embarkation, on either clock. Not "roughly one user"—one, in both cases, across ten days and sixteen players. This is the one row in the cluster where a stronger sentence is available than the one on the page: two mechanics with a full ten-day exposure and a single participant each. §B7 (hearts never count toward score) and §B8 (three claim modes) are the design rows this outcome bears on—the doubt mechanic is the honor system's escape hatch, and it was pulled once by one person.

### B30—"7 of 48 reshuffles were spent"

> ":56 and 7 of 48 reshuffles were spent"

**SPLIT—the 7 is SUPPORTED and re-derived; the 48 is a derived ceiling, half in-repo and half EXTERNALLY SOURCED.** `reshuffle_card` fires **7** times over the window, from **3** distinct persons. The 48 is not a recorded figure anywhere: it is the roster times the per-player cap. The cap is in the repository and is exactly three—`specs/reshuffle.md:6`, "Reshuffle a hard Day Card: pristine-only, 3 per Event, rules-bound counter," restated at `:12` and enforced monotonically per `:50`. **The `pristine-only` half is the load-bearing constraint and the rewrite should not drop it:** `:14` defines Pristine as "a Day Card with zero PLAYER-marked Squares," so a card can only be traded before it has been played, never after. The spec's own vocabulary note at `:12` draws the line explicitly—"*Avoid:* re-deal (that's pool recovery), **mulligan**"—which is the repository distinguishing this feature from the thing it would have been without that constraint—and the reshuffle itself shipped mid-cruise (`833d57e`, 2026-07-17, §B12). The roster of 16 is Firestore's (§B31). So 48 is sound arithmetic over one verified factor and one external one, and should be presented as a ceiling rather than as a count of anything observed. The sharper unreported figure: only **three of sixteen players** ever used a reshuffle at all.

### B31—"fourteen of sixteen players marked," and ten with a bingo

> ":56 The core loop stayed broad—fourteen of sixteen players marked"

**SPLIT—the roster and marker counts are EXTERNALLY SOURCED; "ten with a bingo" is SUPPORTED by independent corroboration; and the sentence splices two systems' denominators.** Sixteen players and fourteen markers are Firestore root aggregates (§BM2), unreachable here, and PostHog cannot substitute: its identified-person counts run *under* the roster (14 on `login`, 15 on `$identify`) while its total person count runs wildly over it (144 on `$pageview`), which is why #820 excluded them. Ten players with a bingo is the one figure in this row that two systems agree on: PostHog records exactly **10 distinct persons** firing `bingo` across the window.

The splice is the finding. PostHog counts **12** markers on the declared window, not fourteen (13 over the eleven-day query)—an under-capture consistent with the like-for-like 772-against-845 mark gap (§B27.1), not the raw 820-against-845 comparison, which §B27.1 shows is an artifact of mismatched windows—and the "nine on five or more days" in the very next clause is PostHog's, measured against those twelve (§B32). *Nine of fourteen* and *nine of twelve* are different claims, and the sentence as written takes its denominator from Firestore and its numerator from PostHog without saying so. Defensible form: keep each system's figures in its own clause, or state the nine against thirteen and name the source. This is the same class of defect as §C10—reproducing a rule's output without stating the rule—one layer down.

### B32—"nine on five or more days"

> ":56 nine on five or more days"

**SUPPORTED, re-derived here, and robust to the clock question.** Grouping `mark_square` by person and counting distinct mark-days returns **9 of 12** markers at five or more days on the declared Rome ten-day window. The numerator is stable across every scope tested—nine under Rome and LA bucketing, on the ten-day and eleven-day windows alike—while the denominator moves with the window (12 on ten days, 13 on eleven). The distribution behind it: 10, 9, 7, 7, 7, 7, 6, 5 and 5 days for the nine; 3, 1, 1 and 1 for the other four. See §B31 on the denominator the page pairs this with.

### B33—"845 squares and 61 bingos, zero blackouts"

> ":56 845 squares and 61 bingos, zero blackouts"

**EXTERNALLY SOURCED, with one of the three cross-checked and one unfalsifiable.** All three are Firestore root aggregates (§BM2). The squares figure has a partial check, and the comparison has to be windowed before it means anything. PostHog records **820** `mark_square` events over the eleven-day query window, reproduced here, but that total includes a pre-embarkation day and 41 post-freeze ceremonial marks the standings exclude, so 820-against-845 is not a like-for-like comparison and its 25-event difference is an artifact (§B27.1). Restricted to the scoring window PostHog records **772**, against Firestore's 845—a **73**-mark gap, which is what offline queueing through `persistentLocalCache` (§B11) predicts. The two disagree in the direction the architecture implies, which is corroboration of a kind, not verification. The 61 bingos have an *anti*-check: PostHog's `bingo` count is **126**, reproduced here, and #820 excludes it as double-counting against Firestore's authority. Do not let 126 into the page; it is not a second opinion, it is a known-bad instrument. "Zero blackouts" is an absence with no event to count—the taxonomy carries no blackout event at all—so PostHog can neither confirm nor contradict it, and it rests entirely on Firestore.

### B34—"the 23:00 freeze pulled 36% of the cruise's marks into the final day"

> ":56 the endgame's deliberate scarcity earned its keep: the 23:00 freeze pulled 36% of the cruise's marks into the final day, the biggest of the trip"

**SPLIT—the 36% is SUPPORTED and survives the clock question; the "23:00 freeze" is real but is NOT the designed instant, and the page currently presents it as one.**

**Resolved by the owner, 2026-08-27: the freeze was moved forward deliberately during the sailing.** That settles the discrepancy below and changes what the sentence is about. The scheduled freeze derives to 08:00 Rome on Day 10; the operator brought it to 23:00 on Day 9, nine hours early, while the Event was live. So 23:00 is an operating decision, not a deadline the design specified, and #752 asks precisely for what live feedback changed during the sailing. Written as a decision record it has a real rejected alternative—let the schedule run to the closing morning—and observed evidence in the 36%. Written as "the 23:00 freeze" with no more said, it asserts a designed mechanism the repository contradicts.

The percentage, re-derived here. The exact count depends on which boundary "the final day" means, and every reading but the strictest rounds to 36%:

| Reading of "the final day" | Marks | Share of 820 |
|---|---|---|
| PostHog project day (`America/Los_Angeles`), 2026-07-23 | **299** | 36.5% |
| Event day (`Europe/Rome`), 2026-07-23 | 293 | 35.7% |
| Rome 2026-07-23 bounded at the 23:00 freeze | 288 | 35.1% |

PR `#820`'s 299 is the project-timezone reading; the Event's own clock gives 293. Both round to 36%. The freeze-bounded window—which is what the sentence literally asserts, since it names the freeze as the thing doing the pulling—gives 288 and rounds to **35%**. The claim is safe as written because "the final day" reads naturally as a calendar day; it would not survive a reader who took the freeze as defining the window. For completeness, **41** marks land after the 23:00 instant, on the ceremonial closing Day whose marks the standings exclude by design.

The freeze instant is the weaker half. `frozenAt` 2026-07-23 23:00 Europe/Rome is Firestore's and unreachable here, and it is nine hours away from what the repository derives for this Event. `standingsFreezeAtFor` (`src/game/logic.ts:865-885`) resolves the Standings Freeze to a configured `EventDoc.standingsFreezeAt` when the document carries one, else to the first ceremonial Day's own `unlockAt`. The med-2026 seed configures no `standingsFreezeAt`, and its closing Day unlocks at `unlockAt0800Rome('2026-07-24')` (`src/data/seed.ts:299`)—**08:00 Rome on Day 10**, which `specs/d15-finale.md:8` names as the STANDARD shape: "those instants are **20:00 on Day 9** and **08:00 on Day 10**." The gap is not by itself an error—`frozenAt` is the stamp that a freeze happened and `standingsFreezeAt` the schedule, a distinction `src/domainTypes.d.ts:322-327` spells out at length, and the production document is not the seed—but nothing in the repository accounts for it. An earlier revision of the page presented 23:00 as a designed deadline; since the owner disposition below it carries the hour as an operating decision instead, with the derived 08:00 as its rejected alternative. Before the rewrite restates the hour, establish whether the production Event carried a configured freeze, was frozen through an admin path, or had its closing Day edited in flight; §B19 records that in-flight data edits to a live Event are established practice here. Defensible weaker form if that cannot be settled: "the freeze on the last night," which the mark distribution supports on every reading above.

### B35—"three cards claiming their first bingo hours before the deadline"

> ":56 three cards claiming their first bingo hours before the deadline, days after their ports"

**EXTERNALLY SOURCED, corroborated in shape but not in value.** The source is `days/{1,2,7}/meta` first-bingo pins at 11:04, 12:55 and 03:26 against the 23:00 freeze, from #820's Firestore table. Not re-derivable here: PostHog's `bingo` event carries no day or card attribution (§B26). What PostHog does corroborate is the mechanism the clause turns on—that a card outlives its port. `bingo` events cluster hard on the final day, **75 of 126 from 8 distinct persons on 2026-07-23** (Europe/Rome), against none at all on embark day and single digits on most others. The design fact behind it is in the repository: `src/data/finale.ts`'s `buildPodium` is computed "AS OF `freezeAt`" precisely because a Day keeps recording marks after its own morning, and `specs/d15-finale.md` makes the cutoff load-bearing rather than cosmetic. Note the dependency for the rewrite: this clause and §B34's percentage both rest on the 23:00 instant, so whatever settles that settles both.

### B36—"129 squares to 124," and why the runner-up finished second

> ":56 Zacaria Arab took the title on 16 bingos; Logan Murdock out-marked him, 129 squares to 124, and finished second because the board sorts bingos first—the rule, not volume, crowned the champion."

**SPLIT—the pair of square counts is EXTERNALLY SOURCED; the ordering rule is SUPPORTED and exact.** The two counts are Firestore root aggregates ordered by `comparePlayers`, per #820, and PostHog is no substitute for them: its top five per-person mark totals are 134, 116, 112, 108 and 106, which neither match nor should, since they under-capture marks the database holds (§BM2, and §B27.1 on why that gap is directional corroboration rather than a demonstrated cause) and include post-freeze ceremonial marks the standings exclude (§B34). The rule the sentence turns on is in the code and says what the page says. `src/game/logic.ts:692-694`, verbatim:

```ts
export function comparePlayers(a: Rankable, b: Rankable): number {
  if (b.bingoCount !== a.bingoCount) return b.bingoCount - a.bingoCount;
  if (b.squaresMarked !== a.squaresMarked) return b.squaresMarked - a.squaresMarked;
```

Bingos descending, squares only as the tie-break, then earliest `firstBingoAt`—pinned by `src/game/w2-leaderboard.test.ts:18`, whose describe block is literally `comparePlayers — bingos desc, then squares desc, then earliest firstBingoAt`. So "the rule, not volume, crowned the champion" is SUPPORTED as a claim about the system whatever the two figures turn out to be, which is the durable half of the sentence and the half to keep if the numbers ever have to come out. The champion's own 16/124 is §B15.

---

## §C `friends-and-family-billing`

### C1—"a household of eight people"

> ":27 My husband and I split T-Mobile, Apple One, and 1Password across a household of eight people."

**SPLIT—but nothing here is SUPPORTED *about the author's household*.** The README's worked example is illustrative documentation, not a record of who lives with the author. Eight members and two of the three services appear in it: `README.md:269-273` `**T-Mobile Bill ($300/month):** … Select all 8 family members — Each person pays $37.50/month`; `:275-279` covers Apple One at $37.95/month across four members. **1Password is UNSUPPORTED as a household bill**—every hit in the repo is developer tooling (deploy credentials, PAT storage: `README.md:130,309-310`, `REVIEW_POLICY.md:37,43,63,467`). There is no seed or demo dataset; the eight is an illustrative README figure, not data. Under M4's principle—the repository records artifacts, not the author's life—the household size and all three service names are **UNPROVABLE from repository artifacts**, not merely 1Password. An illustrative calculation that happens to use eight members does not establish a real household of eight. Defensible weaker form: treat the whole sentence as autobiography, which needs no repo evidence and should not be presented as repo-corroborated.

### C2—"the oldest and most developed project in the portfolio"

> ":41 Friends & Family Billing is the oldest and most developed project in the portfolio"

**SPLIT: "oldest" is UNPROVABLE; "most developed" is SUPPORTED.**

Oldest. Override's repository is six days older—`bfdb5d6`, 2026-02-18 14:09:11 −0800—against FFB's `32b9ab9`, 2026-02-24 09:59:19 −0800. But Override's first commit is `Initial commit from Create Next App`: 17 files, 6,886 insertions of which **6,587 are `package-lock.json`**, leaving 299 lines of generator boilerplate and no product. FFB's first commit is 15 files, **3,867 insertions, zero lock file**, headed by `script.js` at **1,592 lines of application logic**, plus working Firebase auth (`auth.js`, `login.html`, `firebase-config.js`, `firestore.rules`) and 1,197 lines of documentation. Git says Override; the artifact says FFB shipped a working product first. The question is not decidable without picking a definition, so the honest verdict is UNPROVABLE. Defensible weaker form: "the project with the longest continuous development history," which is defensible on any measure. Source: `git show --stat bfdb5d6`; `git show --stat 32b9ab9`.

Most developed. SUPPORTED on every metric tried: 581 commits (495 excluding Dependabot and template sync) against 332 for the next-largest product repo; 19,214 lines of application source (`src/**` plus `functions/*.js`); 14,658 lines of test code across 48 test files, a 0.76:1 test-to-source ratio; 10 specs and eight ADRs. Avoid a naive whole-repo `wc -l`—it returns 153,892, inflated by template-propagated CI harnesses that are not FFB code.

### C3—"well over four hundred commits"

> ":41 well over four hundred commits across a full architecture migration"

**SUPPORTED, and accurate when written.** 581 today; 432 on 2026-04-13 when the sentence was authored. The strictest defensible count—excluding both Dependabot (66) and template sync (20)—is **495**, still well over four hundred. It is now an understatement by roughly a third; "close to six hundred" would be current. Source: `git log origin/main --format='%s' | grep -viE '^(deps:|deps\(|chore\(deps)' | grep -viE 'sync to mergepath|propagat' | wc -l`.

### C4—"six numbered phases"

> ":43 The migration happened in six numbered phases rather than a single rewrite."

**WRONG under every counting rule, and six only arises by dropping a phase.** The full set of migration phase commits (`git log origin/main --format='%h %ad %s' --date=short | grep -iE 'phase'`, then narrowed to the React migration):

| SHA | Date | Subject |
|---|---|---|
| `c1e4eaf` | 2026-03-20 | Phase 0: Scaffold Vite + React + Vitest alongside legacy build (#11) |
| `47d0c1f` | 2026-03-20 | Phase 0.3–0.5: Firebase SDK, auth context, data layer (#12) |
| `dd99104` | 2026-03-21 | Phase 1: App shell, navigation, and connected views (#16) |
| `5bfd24e` | 2026-03-21 | Phase 2a: Shared components and service CRUD mutations |
| `1b3bead` | 2026-03-21 | Phase 2b: Core views—Members, Bills, and Settlement Board |
| `267d3b2` | 2026-03-21 | Phase 2c: Invoicing Tab, Review Requests Tab, and dispute KPI |
| **`49a0789`** | **2026-03-21** | **Phase 3: Dialogs polish—audit history, native dialog removal, test coverage** |
| `df9ef7d` | 2026-03-21 | Phase 4: Full React cutover—delete vanilla JS, port share page, code-split |

Distinct phase **numbers** (0, 1, 2, 3, 4): **5**. Distinct **labels** counting 2a/2b/2c separately: **7** (8 if `0.3–0.5` counts). Phase **commits**: **8**. Phase **PRs** (#11, #12, #16, #19, #20, #21, #22, #23): **8**. None is six. The plan document is decisive: `git show df9ef7d:specs/ffb-react-migration.md` lines 392–403 tabulate exactly **five** numbered phases (0 Scaffold, 1 Shell & Nav, 2 Core Components, 3 Dialogs, 4 Cleanup), with no 2a/2b/2c—those labels exist only in the shipped commits. Corrected value: **five numbered phases, shipped as eight PRs**.

### C5—the phase narrative omits Phase 3

> ":43 Phase 0 scaffolded … Phases 1 through 2c ported … Phase 4 cut over fully"

**WRONG by omission, and this is the source of the "six."** Counting only the labels the sentence names—0, 1, 2a, 2b, 2c, 4—gives exactly six, because Phase 3 is the one phase the paragraph never mentions. Phase 3 is real: `49a0789`, 2026-03-21, PR #22, branch `phase-3-dialogs-polish`, "Dialogs polish—audit history, native dialog removal, test coverage." Corrected value: name it, or stop counting.

### C6—Phase 0 scaffolded alongside the legacy build

> ":43 Phase 0 scaffolded Vite, React, and Vitest alongside the legacy build."

**SUPPORTED, all four elements.** `c1e4eaf`, 2026-03-20 19:17:35 −0700, PR #11. Adds `vite.config.js`, `src/app/App.jsx`, `src/app/main.jsx`, `tests/react/**`. Coexistence is explicit in the message: "Split package.json scripts: build → build:legacy + build:react … Add firebase.json /app/** rewrite before catch-all for coexistence … Legacy 287 tests unaffected."

### C7—"Phase 4 cut over fully, deleted the vanilla JS"

> ":43 Phase 4 cut over fully, deleted the vanilla JS, ported the share page, and added code splitting. The legacy app wasn't thrown away in one commit; it was extracted, wrapped, and replaced view by view."

**WRONG as a description of what happened, though every clause is true of the commit in isolation.** `df9ef7d` (2026-03-21, PR #23, 20 files, +897/−10,344) does delete `src/main.js` (−5,700), `src/index.js`, and the legacy test files; does add `src/app/views/ShareView.jsx` (+463); and does add code splitting (`lazy`/`Suspense` with seven `lazy(() => import(...))` calls in `App.jsx`).

It was reverted four days later. `913b0cf`, 2026-03-25 21:19:28 −0700, PR #37, "Restore legacy app coexistence and fix React dialog visibility," whose own message reads: "Phase 4 (PR #23) deleted the legacy vanilla JS app, but the React migration was never visually reviewed—users visiting the root URL saw the unchanged legacy shell and assumed each phase was correct." It restores `src/main.js`, `src/index.js`, `firebase-config.js`, the legacy tests, esbuild and the dual build pipeline. `share.html`, `login.html` and `auth.js` were never deleted in Phase 4 at all (`git ls-tree df9ef7d --name-only`). The real full cutover is **`6ff2c5b`, 2026-06-21, PR #339**, "feat: remove the legacy vanilla-JS app served at `/site/`"—three months later, with an interim step at `df1199a` (2026-04-05, #167) promoting React to root and moving legacy to `/site/`.

Corrected value: Phase 4 attempted the cutover, was rolled back within four days for lack of visual review, and the vanilla JS finally went in June. Ironically the page's own next sentence—"The legacy app wasn't thrown away in one commit"—is the accurate one; it is the sentence before it that overstates.

### C8—three divergent rendering paths

> ":45 The original plaintext editor with `%token%` markers worked until it didn't—Preview showed one thing, the sent email showed another, and the editor showed a third."

**SUPPORTED, and there are precisely three.** At `b2886ad` (the state immediately before the fix): editor render is TipTap (`src/app/components/TemplateEditor.jsx:141`, `:203`); preview render is `renderPreviewHTML(text)` at `src/lib/invoice.js:363` (unified + remark-parse + remark-rehype + rehype-sanitize, CommonMark); email render is `simpleMarkdownToHtml()` at `functions/index.js:781`, applied in `processMailQueue` against the `rawText` the client sent. Issue #159 enumerates the same three under "Root-cause hypotheses." The `%token%` editor predates the migration by five and a half weeks—first appearance `cc05efb`, 2026-02-24, and `f9ca647` (2026-04-02) is literally titled "fix: show raw `%token%` text in email editor."

### C9—#144 preserved the markdown bridge

> ":45 The TipTap WYSIWYG migration ([PR #144](…)) was supposed to fix this, but it preserved the old markdown bridge, creating three divergent rendering paths."

**SUPPORTED, and the bridge function documents itself.** #144 (`refs.json` → merged `2026-04-03T20:14:29Z`, +2687/−330, 18 files) adds `docToPlainTextWithTokens(doc)` to `src/lib/invoice.js`, whose docstring reads: "Convert a ProseMirror JSON document to plain text with `%token%` markers. Walks the node tree produced by TipTap and emits the same token-bearing string that the legacy template pipeline expects." Its reverse, `plainTextToDoc(text)`, handles legacy `%member_first%`/`%annual_total%` aliases. Source: `git show c88e48d -- src/lib/invoice.js`.

### C10—"Six PRs shipped across roughly twenty hours"

> ":45 Six PRs shipped across roughly twenty hours without closing it—three attempts at the parity bug itself, plus two orthogonal fixes alongside the migration that caused it."

**SPLIT: the decomposition is SUPPORTED, the inclusion rule is unstated, and the duration depends on which span you mean.**

The decomposition matches the corrected blog exactly—one originating implementation (#144), three parity attempts (#146, #153, #158), two orthogonal fixes (#154, #155)—which is the inclusion rule `six-prs-one-bug-agent-failure-modes.md:75` states outright: "Six pull requests in one session on this surface." The page reproduces the rule's *output* without stating the rule, which is the specific defect #744 corrected in the blog.

The window is not empty of other PRs. Ten PRs merged between #144 and #161 inclusive: **#144, #146, #153, #154, #155, #156, #157, #158, #160, #161**, plus one substantive change pushed **directly to main with no PR** (`20dcb32`, 2026-04-03 14:16:38 −0700, 8 files, +472/−319, sole parent `602bce8`). #156 is a one-line ellipsis fix, #157 persists `_templateDocVersion`, #160 gates E2E behind `VITE_E2E_MODE`. A reader counting merges will get ten, not six.

Durations, all computable from `refs.json`:

| Span | Value |
|---|---|
| #144 merged → #158 merged (the six, merge to merge) | **20 h 02 m** |
| #144 opened → #158 merged (the six, open to merge) | 20 h 25 m |
| #144 merged → #161 merged | 21 h 43 m |
| #144 opened → #161 merged (the blog's span) | **22 h 06 m** |

"Roughly twenty hours" is exactly right for the six PRs on their own and wrong for the arc that includes the fix. Since this sentence is scoped to the six, the number is defensible; §C15 is where it is not.

### C11—"#161 removed the bridge entirely"

> ":45 [PR #161](…)—prompted as a failed-fix investigation rather than another incremental patch—removed the bridge entirely and unified Preview and email onto a single canonical renderer."

**SPLIT: the unification is SUPPORTED, "removed the bridge entirely" is WRONG.**

Unification is real. #161 introduces `renderInvoiceTemplate(ctx, shareUrl)`, whose docstring reads "Canonical HTML renderer for invoice templates. This is the single source of truth for the Invoicing preview and template email HTML"—now `src/lib/invoice.js:458`, with `buildInvoiceTemplateEmailPayload()` at `:470`. It removed the separate `renderPreviewHTML()` path and changed `processMailQueue` to prefer the client-supplied canonical HTML over `simpleMarkdownToHtml(body)`.

The bridge survives. `docToPlainTextWithTokens` is on `origin/main` today at **`src/lib/template-doc.js:94`**, re-exported at `src/lib/invoice.js:208`, and still called at `src/lib/invoice.js:487`, `src/app/views/Manage/InvoicingTab.jsx:73` and `:118`. `simpleMarkdownToHtml` also survives in `functions/index.js` as a fallback. No bridge file was deleted in #161 or since. Corrected value: "**bypassed** the bridge for the canonical path and unified Preview and email onto a single renderer."

### C12—"prompted as a failed-fix investigation"

> ":45 prompted as a failed-fix investigation rather than another incremental patch"

**UNPROVABLE as a quotation; SUPPORTED as a characterisation.** The literal phrase appears nowhere—not in the branch name (`codex/issue-159-rendering-pipeline`), not in the one-line merge body, not in issue #159. But #159's framing is unambiguously root-cause rather than incremental: "the likely issue is that the app currently has **multiple inconsistent rendering pipelines**"; "**Non-goals:** Do not 'fix' this by merely making Preview look closer while leaving the actual sent HTML different"; "likely to keep reoccurring unless rendering is consolidated." Defensible weaker form: "framed as a root-cause investigation—its issue explicitly ruled out making Preview merely look closer." The prompt itself is an author record, and the sibling blog flags exactly that class of source at `six-prs-one-bug-agent-failure-modes.md:125`.

### C13—"first developed for Override"

> ":47 FFB runs on the [multi-agent code review pipeline](…/REVIEW_POLICY.md) first developed for [Override](/projects/override/)"

**WRONG.** Same defect as §A13 and §F6. In this repo the pipeline arrived at `2ff6557`, 2026-03-24 **12:22:55** −0700—**the earliest of the five consumer repos**, eight seconds ahead of Override's `614a9da` at 12:23:03, and fourteen minutes after mergepath's initial commit. If anything, FFB has a marginally better primacy claim than Override on this artifact, and neither has one against the template.

### C14—"it pressure-tested that system before I had it fully nailed down"

> ":47 and in many ways it pressure-tested that system before I had it fully nailed down"

**SUPPORTED, with a specific incident behind it.** The no-direct-push rule landed `f59a8bc`, 2026-04-02 15:47:18, "docs: add no-direct-push-to-main rule to repo_rules and CLAUDE.md (#123)." It was broken the next day by `20dcb32` (2026-04-03 14:16:38), a substantive 8-file change with a single non-merge parent and no `(#N)` marker. Issue #145 is the after-action record, verbatim: "Commit `20dcb32` was pushed directly to `main` without a pull request, violating the repo rule … The agent treated iterative design feedback as a quick-fix scenario and pushed directly instead of branching." Filed roughly seven hours later, closed 2026-04-03T22:40:13Z. Also note the ordering at `REVIEW_POLICY.md`: the machine-user identities landed 2026-03-24, one day *before* the policy document that governs them (`8b14a02`, 2026-03-25 13:44:05)—practice preceded written policy, which is the claim in miniature.

### C15—"a twenty-hour debugging arc"

> ":55 a twenty-hour debugging arc on the invoice template parity bug"

**WRONG against the corrected sibling post.** This sentence scopes the arc to the whole debugging effort, which ends with the fix. `six-prs-one-bug-agent-failure-modes.md:73`, as corrected by PR #744, states: "First PR to merged fix is **twenty-two hours and six minutes**—'roughly twenty hours' was a fair round number and exactly wrong about the order." Recomputed independently from `refs.json`: #144 created `2026-04-03T19:51:18Z` → #161 merged `2026-04-04T17:57:49Z` = **22 h 06 m 31 s**. Corrected value: **twenty-two hours**. See §H6—the page carries a figure its own linked blog has already superseded.

### C16—"a money integrity layer that flags calculation drift"

> ":33 derived amount previews, and a money integrity layer that flags calculation drift"

**WRONG—no such module exists.** `grep -rniE 'integrity' src tests specs docs` returns exactly two hits, both about *append-only* integrity of the payment ledger (`src/lib/BillingYearService.js:970`, `docs/adr/0005-symmetric-owed-adjustment-model.md:43`). Every `drift` hit is an inline comment about rounding or timezone handling (`src/lib/share.js:279`, `src/lib/BillingYearService.js:864`, `src/app/views/ShareView.jsx:859`). Nothing detects or flags drift at runtime. The rest of the bullet is fine: per-bill frequency toggling at `src/app/views/Manage/BillsTab.jsx:202-213`, derived previews via `getBillAnnualAmount()`/`getBillMonthlyAmount()` in `src/lib/calculations.js`. Corrected value: delete the clause, or replace it with the append-only payment audit trail, which is real (`BillingYearService.js:970-971`, "a `PAYMENT_UPDATED` audit event records the before/after values," shipped in #113).

### C17—"a three-state balance model (outstanding, partial, settled)"

> ":35 a three-state balance model (outstanding, partial, settled)"

**WRONG—it is four-state.** `src/app/components/StatusBadge.jsx:6-11`, verbatim:

```js
const STATUS_CONFIG = {
    outstanding: { label: 'Outstanding', className: 'status-badge--outstanding' },
    partial:     { label: 'Partial',     className: 'status-badge--partial' },
    settled:     { label: 'Settled',     className: 'status-badge--settled' },
    overpaid:    { label: 'Overpaid',    className: 'status-badge--overpaid' }
};
```

The return type at `:17` is `{'outstanding'|'partial'|'settled'|'overpaid'|null}`, and the settlement board's sort order and filter chips carry all four (`src/app/components/SettlementBoard.jsx:109`). A decoy exists and should not be mistaken for support: `bd50bad` (2026-04-05) is literally titled "three-state balance model," but its three states are owes-money (red) / settled-at-zero (grey "Paid") / credit-overpaid (green)—a colour convention across screens, not the `outstanding`/`partial`/`settled` triple. Corrected value: **four-state (outstanding, partial, settled, overpaid)**.

### C18—token-scoped share links

> ":36 Generates shareable summaries via token-scoped links—each link carries the recipient's name, bill breakdown, and payment methods, accessible without login."

**SUPPORTED, all four elements.** `src/lib/share.js` implements `generateRawToken()`, SHA-256 `hashToken()`, `buildShareTokenDoc()` at `:44`, `buildShareUrl()` at `:66`, `computeExpiryDate()` at `:75`. Payload at `:155` `buildPublicShareData(...)` carries `memberName` (`:188`), the payment summary (`:199`) and `enabledMethods` (`:185`). The `/share` route sits outside `ProtectedRoute`; `README.md:292` records public read on `publicShares` secured by token hashes.

### C19—dispute management

> ":37 Supports dispute management with lifecycle-stage email notifications, evidence attachments, and resolution workflows with share-page integration."

**SUPPORTED, all four.** Lifecycle emails: `982d99f` (2026-04-02) "feat: add email notifications at each dispute lifecycle stage (#115)", implemented at `functions/index.js:690` and `:931`. Evidence attachments: `specs/dispute-resolution.md:30-40` (`uploadEvidence`/`removeEvidence`, PDF/PNG/JPEG, 10-item cap). Resolution states: `src/lib/constants.js:10-15` `DISPUTE_STATUS_LABELS` (`open`/`in_review`/`resolved`/`rejected`). Share-page integration: `src/app/views/ShareView.jsx` dispute submission, plus `d7d9c3b`.

### C20—invoice builder

> ":34 Builds annual invoices with member name tokens, customizable email templates, and a live preview that renders exactly what the recipient will see."

**SUPPORTED, with a caveat the page itself resolves two paragraphs later.** `src/lib/invoice.js` (`buildInvoiceSubject`, `buildInvoiceBody`, `renderInvoiceTemplate`); name tokens `%first_name%`/`%last_name%`/`%full_name%` in `src/lib/template-doc.js`; live preview at `src/app/views/Manage/InvoicingTab.jsx:196-197`. "Renders exactly what the recipient will see" is true only after #161; the linked blog post is about the year the sentence was false. Defensible weaker form: "a live preview rendered by the same canonical renderer that builds the email."

### C21—stack line

> ":17 stack: \"React · JavaScript · Vite · Firebase · Vitest · Playwright\""

**SUPPORTED, all six.** React 19.2.8, Vite 8.2.1, Firebase 12.17.1, Vitest 4.1.0, `@playwright/test` 1.62.1 with `playwright.config.js`. JavaScript rather than TypeScript is confirmed by absence: `find src tests functions scripts -name '*.ts' -o -name '*.tsx'` returns zero files, no `typescript` dependency, no `tsconfig.json`. Playwright is thin but genuinely wired: one spec (`tests/e2e/invoicing-editor.spec.js`), run in CI at `.github/workflows/test.yml:32`. Both the E2E infrastructure (#158) and its CI wiring (#160) came out of the template-editor arc, which is a nice detail the page does not use.

### C22—the migration's shape

> ":41 a full architecture migration from a vanilla JavaScript single-page app to a React, Vite, and Vitest stack on Firebase"

**SUPPORTED.** The first commit is a 1,592-line vanilla-JS app on Firebase (`32b9ab9`); the current tree is React 19 on Vite with Vitest. The word "full" is doing work that §C7 qualifies—the migration completed in June, not March.

---

## §D `matchline`

### D1—"Two things changed in the 2026 job market that weren't true three years ago"

> ":25 Two things changed in the 2026 job market that weren't true three years ago."

**UNPROVABLE.** A market claim with no artifact in scope; no repo, PR or spec bears on it. Defensible weaker form: attribute it as the product's premise rather than as fact—"Matchline is built on two premises about the 2026 market." No correction proposed beyond framing.

### D2—"Four steps"

> ":33 Four steps. Each one has a clear input, output, and quality bar."

**SUPPORTED, and the spec's headings match the page's four one for one.** `specs/matchline.md:38` `### Step 1 — Career into Experience Units`, `:58` `### Step 2 — Job into Requirement Units`, `:71` `### Step 3 — Match Units to Requirements`, `:88` `### Step 4 — Generate an application`, under `:29` `## Core loop`.

### D3—"under twenty seconds at p95"

> ":44 The full-flow latency budget is under twenty seconds at p95"

**SUPPORTED verbatim.** `specs/matchline.md:104-106`: "**Full flow.** From a populated Capability Graph, a user can paste a JD and produce a validated, exportable resume **in under 20 seconds at p95**." The per-step table at `:221-223` gives Experience Unit extraction as 8 s p50 / 20 s p95.

### D4—"under one dollar"

> ":44 and the per-application cost budget is under one dollar"

**SUPPORTED.** `specs/matchline.md:107-108`: "**Cost.** Per-application LLM spend (parse + match + generate + validate) is **under $1 at p95; target $0.75**." One nuance the page drops: the cost table at `:236` gives the range as `$0.50–$1.00`, so the budget is a ceiling met at its top end, not a typical figure. Both the p95 qualifier and the $0.75 target are available and would make the sentence stronger.

### D5—"a July 2026 target"

> ":48 V1 was in active build with a July 2026 target when Five Across took the summer"

**UNPROVABLE.** No artifact states a V1 target date. Searched `specs/`, `docs/`, `README.md` and every commit message for `july`, `2026-07`, `Q3`, "target date" and "ship date"; the only July hits are unrelated (a discarded predicate on 2026-07-27, a Phase 4b enablement note). Defensible weaker form: "V1 was in active build through early July," which the commit record does support—see D6.

### D6—"when Five Across took the summer"

> ":48 Paused, deliberately. V1 was in active build … when Five Across took the summer—a live game with a hard sailing date beat a tool with a soft one."

**SPLIT—the chronology is SUPPORTED, the causal claim is UNPROVABLE, the clean break is WRONG.** July 6 followed by July 7 establishes proximity, not that Five Across caused the pause or that a sailing date "beat" a soft target; Matchline's product work continuing to July 31 weakens the causal reading further.** The Five Across repo opens 2026-07-07. Matchline's largest single burst of product work is **2026-07-06**, the day before: seventeen substantive commits (#350–#361, plus #354–#360) landing parsing, matching, validation and LLM-cost fixes. That is a strikingly clean handover and supports the sentence's shape.

But work did not stop. **`e20c077`, 2026-07-31 21:25:03 −0700, "eval: content-addressed stage cache so matching-layer tuning runs free (#391)"** is genuine matching-layer work landing twenty-four days into the Five Across summer. After that, only identity and CI plumbing (five commits on 2026-08-21). Corrected value: active development ends **2026-07-31**, not at the start of July. Defensible weaker form: "V1 was in active build until the end of July." Stated without a cause—the timestamps establish sequence only, and this row has just downgraded the causal reading, so the replacement must not smuggle it back in. Source: `git log origin/main --format='%h|%ad|%s' --date=iso --since=2026-07-01 | grep -viE '\|(deps|ci: bump|bump )' | grep -viE 'sync to mergepath|bulk sync'`.

### D7—monthly cadence behind "paused"

> ":8 status: \"PAUSED\""; ":48 Paused, deliberately."

**SUPPORTED.** Non-mechanical commits by month: April 78, May 13, June 9, July 18, August 5. The August five are all identity/CI plumbing. The status label is accurate; D6 is only about which month the pause begins.

### D8—"The repository is public; the running product is not."

> ":50 No live URL until V1 ships. The repository is public; the running product is not."

**SPLIT—"the repository is public" is SUPPORTED; "the running product is not" is UNPROVABLE.** `gh api repos/nathanjohnpayne/matchline --jq '{private,homepage}'` returns `{"private": false, "homepage": null}`, and the page's front matter carries `githubUrl` and no `liveUrl`. But a null `homepage` and a missing `liveUrl` establish only that no deployment is *advertised* through those two fields. The sentence makes a claim about the running product, which neither field can settle; proving it needs the hosting state, not the metadata.

### D9—zero fabrication

> ":42 The hard constraint that makes the rest of the product trustworthy: no generated output contains a claim that isn't grounded in approved evidence. … The model can never quietly invent; if it tries, validation catches it before the user does."

**SPLIT—SUPPORTED as a stated invariant, UNPROVABLE as a property of a running system, and "can never" is a universal nothing verifies.** The spec is explicit that it is an invariant rather than a measurement: `specs/matchline.md:109-110` "**Zero fabrication.** Every claim in every shipped output traces to an approved Experience Unit. **This is an invariant, not a metric.**" The page's own next sentence honours this ("This is a hard constraint, not a target"). But the product is PAUSED with no live URL and no shipped outputs, so "catches it before the user does" describes designed behaviour, not observed behaviour. The universal "can never" is the specific overreach: no adversarial evaluation of the validation layer exists in the repo. Defensible weaker form: "the validation layer is designed so that an ungrounded claim is held off the editor until the user resolves it"—which is exactly what the preceding sentence already says, and is checkable.

### D10—the extraction pipeline

> ":35 Each Unit carries skills, tools, domains, metrics, and a confidence score, and is owned by the user rather than scraped from a résumé. The user reviews and approves before anything enters the graph."

**SUPPORTED.** Confidence scoring is live enough to have been bug-fixed: `cef8da3` (2026-07-06) "fix(unit-review): guard NaN confidence render and validate unit_type (#358)"—a NaN guard implies a rendered confidence value in a review UI, which is the approval gate the sentence describes.

### D11—stack line

> ":17 stack: \"React · TypeScript · Vite · Tailwind · Firebase · Anthropic · OpenAI · Vitest\""

**SUPPORTED on the two that could be doubted.** `functions/package.json:17` `"@anthropic-ai/sdk": "^0.40.0"` and `:20` `"openai": "^6.34.0"`—both providers are genuinely wired, which matters because a page can easily list a model vendor it only intends to use.

### D12—"the author's own job search as V1's only customer"

> ":48 Matchline remains a single-user system with the author's own job search as V1's only customer"

**UNPROVABLE from the repo, and consistent with everything else in it.** No user records exist to count. The claim is autobiographical; the corroborating facts—single-user architecture, no live URL, private product—are all SUPPORTED elsewhere. No correction proposed.

---

## §E `mergepath`

### E1—"originally `ai_agent_repo_template`"

> ":30 Mergepath (originally `ai_agent_repo_template`) is the repository standard I built"

**SUPPORTED, with the underscore spelling attested in a primary source.** Initial commit `b9734df`, 2026-03-24 12:08:47 −0700, "Initial commit: AI agent repo template with machine user review system." Issue #75's body refers to "this template repo (`ai_agent_repo_template`)" in exactly that form. The first "Mergepath" commit is `cb3541d`, 2026-04-17, "feat(mockups): ship Mergepath review-policy playground (#78)"; the site content followed at `f5a9de2`, 2026-04-17, "refactor: rename portfolio content from ai-agent-repo-template to mergepath (#206)."

### E2—canonical documentation files

> ":36 Canonical documentation files (`AGENTS.md`, `CLAUDE.md`, `REVIEW_POLICY.md`, `rules/repo_rules.md`, `specs/`) that every agent reads before acting."

**SPLIT—existence is SUPPORTED, the reading universal is UNPROVABLE.** The files exist; that agents read them before acting is instructed and unmeasured, so the claim cannot be verified either way.** All five paths are present on `origin/main`. The "reads before acting" is what `CLAUDE.md` instructs, and compliance is not measured. Defensible weaker form: "that every agent is instructed to read before acting."

### E3—branch protection and the identity wrappers

> ":37 a `PreToolUse` hook (`scripts/hooks/gh-pr-guard.sh`) blocks `gh pr create` when the required `Authoring-Agent` and `## Self-Review` fields are missing. Identity switches run through atomic `gh-as-author.sh` / `gh-as-reviewer.sh` wrappers, so a PR can never land under the wrong account."

**SPLIT.** All three scripts exist and do what is described; `scripts/ci/check_no_bare_gh_writes` enforces the wrapper path, and the hook fails closed on bare and inline-token forms. The universal **"can never land under the wrong account" is overstated**, and this repo's own record contradicts it: `REVIEW_POLICY.md:51` documents an August 2026 failure in which a repurposed 1Password item silently made `--agent codex` post reviews under the CI robot's byline. Defensible weaker form: "so a PR does not land under the wrong account by accident."

### E4—multi-identity review

> ":38 each agent authors as `nathanjohnpayne` and reviews under a separate machine user (`nathanpayne-claude`, `nathanpayne-codex`, `nathanpayne-cursor`) so an agent never approves its own code."

**SPLIT—the identities are SUPPORTED, the never-approves claim is WRONG as written.** The three identities are real and in use across the fleet. "Never approves its own code" holds at the *account* level, which is the level GitHub enforces, and fails at the *agent* level the sentence actually claims: the authoring agent's own reviewer identity approves under-threshold PRs by design. Reinterpreting "agent" as "account" rescues the mechanism, not the wording, and the policy is candid about this—an authoring agent's own reviewer identity may approve under-threshold PRs, and only above-threshold work requires a cross-agent reviewer. Defensible weaker form: "so no agent approves a PR under the account that authored it."

### E5—"any PR over 300 lines"

> ":39 A two-phase external-review model for any PR over 300 lines or touching protected paths."

**WRONG by one line.** `.github/review-policy.yml:18` sets `external_review_threshold: 300`, and both enforcement points compare with `>=`. `.github/workflows/agent-review.yml:312`, with its own comment on the line above:

```js
// Use >= to match REVIEW_POLICY.md definition
let needsExternal = totalChanges >= threshold || touchesProtected;
```

The second point is `scripts/merge-clearance-gate.sh:1207`, whose message string reads `"$LINES_CHANGED lines changed >= threshold $THRESHOLD"`. A PR of exactly 300 lines enters external review. Corrected value: **"300 lines or more."**

### E6—"Phase 4b is a manual CLI fallback"

> ":39 Phase 4b is a manual CLI fallback"

**WRONG, and stale by roughly two months at the time of this audit.** `.github/review-policy.yml:716` `enabled: true` and `:722` `mode: local` under `phase_4b_automation`. Automation landed `18a2e75`, 2026-06-30, "Automate Phase 4b review handoff (Claude ⇄ Codex via CLI) (#580)", and was switched on `937ac08`, 2026-07-02, "feat(policy): enable Phase 4b automation at xhigh reviewer effort (#628)". `scripts/phase-4b-review.sh` is 61 KB on disk and selects an external reviewer whose agent differs from the author, runs that reviewer's headless CLI over the diff, and posts `APPROVED` or `CHANGES_REQUESTED` under the reviewer identity. Corrected value: "Phase 4b runs the same handoff locally through `scripts/phase-4b-review.sh`, with a manual CLI handoff as the last resort."

### E7—"`scripts/phase-4b-classifier.sh` decides which one runs"

> ":39 and `scripts/phase-4b-classifier.sh` decides which one runs."

**WRONG—it decides something else entirely.** The script's own header, `scripts/phase-4b-classifier.sh:2-7`: "classify a PR against the Phase 4b proactive-trigger taxonomy from REVIEW_POLICY.md § Phase 4b Triggers (#158). Reads the PR's changed-files list + body, runs five trigger detectors, emits a JSON recommendation. **Consumed by CLAUDE.md step 8.5 (#187) to decide whether to invoke Phase 4b proactively in addition to its fallback role.**" Its exit codes are `0` (no 4b needed) and `1` (4b recommended)—there is no branch that selects 4a. It runs alongside, not before, the 4a/4b routing. Corrected value: "and `scripts/phase-4b-classifier.sh` decides whether Phase 4b should also fire proactively, on top of its fallback role."

### E8—the Codex P1 gate and CodeRabbit

> ":40 A Codex P1 merge gate (`.github/workflows/codex-p1-gate.yml`) that blocks merge while any unresolved Codex P1 finding is open, with CodeRabbit wired in as an advisory second-opinion pass on every PR."

**SPLIT.** The gate file exists and does what is described. **"on every PR" is a universal the record contradicts**: `.coderabbit.yml` skips PRs whose base is not the default branch (stacked PRs draw a "review skipped" that still reports green), and the sibling blog documents rate-limiting in volume—`perfect-score-wrong-axis.md:169` records that "seven of the eleven PRs drew a `rate limited by coderabbit.ai` notice, six of them within twenty-two seconds of the batch opening." Defensible weaker form: "wired in as an advisory second-opinion pass," dropping the universal.

### E9—the security baseline

> ":41 A GitHub security baseline that ships with the template: secret scanning with push protection, Dependabot alerts and version updates, a `CODEOWNERS` file, a `SECURITY.md` policy, GitHub Actions pinned to commit SHAs, and least-privilege `permissions:` blocks on every workflow."

**SPLIT—five of six ship as files; one is a documented setting.** Verifiable in the tree: `.github/CODEOWNERS`, `SECURITY.md`, `.github/dependabot.yml`; **43 actions pinned to 40-character SHAs and zero pinned to a floating tag** (`grep -rhoE 'uses: [^@]+@[a-f0-9]{40}' .github/workflows/*.yml | wc -l` → 43; the `@vN` form → 0); and `permissions:` on **19 of 19** workflows, so "every workflow" is literally true here.

**Secret scanning with push protection does not ship as a file—and neither do Dependabot *alerts*.** `.github/dependabot.yml` configures version updates; alerts are a separate repository setting, so this row carries at least two settings that a file cannot evidence.** It is a GitHub repository setting, recorded as a *requirement*: `docs/ontology/rules.md:448` `**R-197.** Public repos enable secret scanning and push protection. ● — REVIEW_POLICY.md § Template Usage`, and the PRD at `docs/projects/mergepath/prds/mergepath.md:2290-2291`. No script in `scripts/bootstrap-new-repo.sh` turns it on. Defensible weaker form: "…a documented secret-scanning, push-protection and Dependabot-alert posture…"—the "documented" qualifier covering all three settings, separating them from the files. Alerts are a repository setting like the other two; leaving them outside the qualifier reasserts the unverified claim.

### E10 and E11—"27 fail-closed CI checks", stated twice

> ":42 Roughly 27 fail-closed CI checks in `scripts/ci/`"; ":66 **~27 fail-closed CI checks** enforced on every push and PR."

**WRONG, and wrong in two places.** Current count: **71** `check_*` files in `scripts/ci/` (`ls ~/GitHub/mergepath/scripts/ci | grep -c '^check_'`). In the workflow: **85** `run:` lines invoking one (`grep -cE 'run:\s*\./scripts/ci/check_' .github/workflows/repo_lint.yml`), across **70 distinct** checks—some run more than once with different arguments. Exactly one check on disk is unwired, `scripts/ci/check_op_firebase_deploy_integration`, which is why 71 files map to 70 wired names; `check_ci_scripts_wired` exists specifically to police that gap.

**27 was exactly right when written.** The claim dates to `2ba44eb`, 2026-05-13, "docs(mergepath): refresh showcase content for new template features (#362)"; the count on that date was **27** on the nose:

```bash
sha=$(git rev-list -1 --before=2026-05-14 origin/main)
git ls-tree -r --name-only $sha scripts/ci/ | grep -c '/check_'   # → 27
```

For scale, at the page's first authoring (2026-04-16) the count was 7. Corrected value: **71 fail-closed checks, 70 of them wired into `repo_lint.yml` across 85 invocations**. Both instances must change together—see §H4.

### E12—`op-preflight.sh`

> ":43 1Password-backed credential plumbing via `scripts/op-preflight.sh` that front-loads all biometric prompts so a session's author and reviewer PATs, GCP ADC, and SSH keys are cached once and reused."

**SUPPORTED.** The script exists, `scripts/ci/check_op_preflight_contract` guards its interface, and the `--mode all` / `--check` contract behaves as described. One caveat worth knowing but not worth page space: `--check` defaults to `--mode review`, so a `--check` without `--mode all` drops the deploy credentials—"cached once and reused" holds only within a mode.

### E13 and E14—the propagation manifest

> ":47 `scripts/sync-to-downstream.sh` reads a `.mergepath-sync.yml` manifest that declares which paths are *canonical* (mirrored byte-for-byte) and which are *kit* directories … along with which of the nine consumer repos opt in."

**SUPPORTED, and nine is exact.** `.mergepath-sync.yml:122` `consumers:` lists precisely nine: `matchline`, `nathanpaynedotcom`, `overridebroadway`, `device-source-of-truth`, `friends-and-family-billing`, `device-platform-reporting`, `swipewatch`, `tadlockpsychiatry`, `gaycruisebingo`. Path types: **127** entries `type: canonical`, **7** `type: kit`.

### E15—the propagation flags

> ":49 `--audit` reports per-repo drift with zero side effects; `--sync-all` reconciles a consumer's full state; passing a commit-ish propagates only what changed at that commit. … a per-repo `.sync-overrides.yml` registry records the exception—with a documented reason—so propagation never clobbers it."

**SUPPORTED.** `scripts/sync-to-downstream.sh:8` "`--audit` Read-only drift detector across all consumers"; `:16` "`--sync-all` Propagate the CURRENT HEAD state of EVERY"; `:22` "Honors `.sync-overrides.yml` per-consumer"; `:51` documents `--audit` exit codes 0 (clean) / 1 (drift). "Never clobbers it" is a universal, but here it is a code path rather than a hope, so it stands.

### E16—the bootstrap wizard's stages

> ":53 It is a staged wizard—scaffold, template mirror, GitHub infrastructure, Firebase/CodeRabbit/Codex posture, and Project board—with a `.bootstrap-state` file so a failed run resumes where it left off."

**SPLIT—four of the five named stages are the wizard's; "scaffold" is a different script.** `scripts/bootstrap-new-repo.sh:648`:

```bash
STAGES=(
  template-mirror
  github-infra
  firebase-and-codereview
  board-and-summary
)
```

Scaffolding lives in the separate `scripts/bootstrap.sh` (guarded by `scripts/ci/check_bootstrap_sh`). The state file and `--dry-run` are both real (16 and 17 references respectively in the wizard). Defensible weaker form: "a four-stage wizard—template mirror, GitHub infrastructure, Firebase/CodeRabbit/Codex posture, and Project board—fed by a separate scaffold step."

### E17—the playground and its knobs

> ":57 It lets you tune every knob in `.github/review-policy.yml`—external review threshold, protected paths, CodeRabbit toggle, Codex GitHub App toggle and max rounds, eligible internal reviewers"

**SPLIT—the five named knobs are SUPPORTED, "every knob" is WRONG.** The ledger's own evidence falsifies it: the policy runs past 900 lines and the playground exposes a handful.** `external_review_threshold:18`, `external_review_paths:26`, `coderabbit:189`, `codex:426` and `max_review_rounds:466` all exist in the policy file. "Every knob" is a universal that fails on a technicality—the file is 900-plus lines with many more keys than the playground exposes—but the enumerated five are the ones the sentence commits to. Defensible weaker form: "tune the knobs that decide routing."

### E18—the live-data path

> ":59 To replay your real PRs, `scripts/policy-sim.sh` runs `gh pr list --state merged`, shapes the JSON into the `window.__PRS` format the page expects, injects it into a temporary copy of the HTML at the `<!-- MERGEPATH_INJECT -->` marker, and opens that copy in a new tab. The header badge flips from **synthetic · 8** to **live · N**"

**SUPPORTED in every particular.** `scripts/policy-sim.sh:67-68` runs `gh pr list --state merged`; the `--jq` filter at `:70-80` produces exactly `{id, title, author, lines, paths}`; `:105` targets `"<!-- MERGEPATH_INJECT -->"`; the marker is at `mergepath/playground/index.html:13`. The badge strings are at `:1502` (`'live · ' + n`) and `:1507` (`'synthetic · ' + n`), and **the synthetic set really is 8**: `SYNTHETIC_PRS` at `:1169` holds eight objects, `#135` through `#142`.

### E19—policy-sim as the only live path

> ":59 To replay your real PRs, `scripts/policy-sim.sh` runs `gh pr list --state merged` …"

**The page is SUPPORTED; this row's own premise was WRONG.** The source sentence describes a valid way to replay PRs and never claims `policy-sim.sh` is the *only* live-data path—that word was this ledger's, not the page's, so the in-page loader falsifies nothing the page said. What follows is context, not a defect.** `ce604d8`, 2026-07-28, "feat(732): playground in-page live-data loader for public repos (#760)" added a repo loader that fetches straight from the GitHub REST API in the browser: `loadPublicRepo(slug, limit)` at `mergepath/playground/index.html:1558`, calling `/repos/{owner}/{repo}/pulls?state=closed` and then `/pulls/{n}/files`. The precedence chain is documented in the file at `:1199-1201`: "an in-page load (`livePRs`) beats the policy-sim.sh injected global (`window.__PRS`), which beats the synthetic sample." Corrected value: name both—`policy-sim.sh` for your own repo, and the in-page loader for any public one. This is the same commit that makes §E20 wrong.

### E20—"no backend, no build system, and no network calls"

> ":61 There is no backend, no build system, and no network calls."

**WRONG on the third clause.** The page makes a network call to `https://api.github.com` and the file's own CSP exists to permit it. `mergepath/playground/index.html:9`:

```html
<meta http-equiv="Content-Security-Policy" content="connect-src 'self' https://api.github.com" />
```

with the comment above it at `:6-8`: "Defense-in-depth (#732): pin fetch/XHR to the GitHub REST API only." The call sites are `:1548` (`return await fetch(url, Object.assign({}, opts, { signal: controller.signal }));`, inside `fetchWithTimeout`) and `:1571` (`const base = 'https://api.github.com';`), with a rate-limit handler at `:1534-1538` that surfaces "GitHub rate limit hit (60/hr unauthenticated)."

Corrected value, and the CSP comment supplies the wording: "no backend and no build system, and no network calls until you ask it to pull a public repo's PRs—those go straight to the GitHub REST API and nowhere else." "No backend" and "no build system" both stand.

### E21—the spec wins

> ":61 The canonical spec is `specs/mergepath_playground.md`; if the spec and the page disagree, the spec wins."

**SUPPORTED.** The file exists. Note against §M1: this is a precedence rule for a prototype, not a general one—where a spec's *status header* disagrees with the tree, the tree wins.

### E22—"100+ PRs merged"

> ":65 **100+ PRs** merged on the Mergepath repo itself, each one exercising the governance loop end-to-end."

**SPLIT—the count is SUPPORTED, "each one exercising the governance loop" is UNPROVABLE.** No query verifies that universal, and CI enforcing some gates is not evidence that every merged PR ran the whole loop.** Today: **447** merged (`gh api -X GET search/issues -f q='repo:nathanjohnpayne/mergepath is:pr is:merged' --jq .total_count`). On 2026-05-13, when the sentence was authored, merged PRs stood at **94**; total PRs *opened* stood at 102, which is probably the number that was read. Corrected value: **"400+ PRs merged,"** which is both current and a far better figure than the one the page settles for. The "each one exercising the governance loop" clause is a universal that no query verifies, though the loop is CI-enforced.

### E23—the hook test suite

> ":67 **A dedicated hook test suite** covering the PR guard and the review-policy parser."

**SUPPORTED, and deliberately unquantified.** `tests/test_gh_pr_guard.sh` is 1,329 lines with 224 case/assertion constructs; the policy-parser side is `tests/test_resolve_base_policy.sh` and `tests/test_feedback_policy_helpers.sh`. The vagueness is intentional: `780893d`, 2026-05-14, "docs(mergepath): soften unverifiable '167 hook test cases' claim (#364)" replaced a precise number with this phrasing. Leave it alone.

### E24—"17 template bugs surfaced during propagation"

> ":68 **17 template bugs** surfaced during propagation across downstream projects"

**SPLIT—that the back-port happened is SUPPORTED; the exact count of 17 is UNPROVABLE.** The two artifacts do not corroborate each other independently: #76 back-ports what #75 asserted, so both carry the same headline from the same origin, and the only itemisation available contradicts it. Issue #75 is titled "Back-port 17 Phase 4a bugs found by Codex during propagation #45/#46" and its body reads "Codex's review of the freshly-propagated files surfaced **17 distinct template bugs**." PR #76 merged the back-port on 2026-04-15T22:49:53Z. One wrinkle worth knowing before anyone re-derives the number: #76's own per-file tally reads 10 + 3 + 9 = **22**, and its Self-Review mentions a "Bug 18." The headline 17 is what both artifacts assert; the arithmetic inside one of them does not reproduce it, and a reference to "Bug 18" sits above a headline of 17. Until the per-file entries are reconciled and deduplicated, the exact number is not established—only that a substantial back-port of template bugs occurred.

### E25—"bugs that had survived seven rounds of review on the template"

> ":68 bugs that had survived seven rounds of review on the template before fresh eyes in a new codebase found them"

**WRONG—the seven rounds are inverted.** They are the rounds in which the bugs were *found*, downstream, not rounds they *survived*, upstream. Issue #75, verbatim: "Codex's review of the freshly-propagated files surfaced 17 distinct template bugs **across 7+ review rounds per PR**"—those PRs being swipewatch #33 and nathanpaynedotcom #180. Counted directly, each drew exactly seven Codex rounds:

```bash
gh api repos/nathanjohnpayne/swipewatch/pulls/33/reviews \
  --jq '[.[]|.user.login]|group_by(.)|map({(.[0]):length})|add'
# {"chatgpt-codex-connector[bot]":7,"coderabbitai[bot]":7,"nathanpayne-claude":16}
# nathanpaynedotcom #180 → {"chatgpt-codex-connector[bot]":7,...}
```

What the bugs actually survived on the template was **one PR with five review objects over twenty-three minutes**: `mergepath#64`, "feat(scripts): add codex-review-request.sh and codex-review-check.sh (#34, #35)", created 2026-04-15T03:20:54Z, merged 03:43:19Z, +775/−0, reviewed by `nathanpayne-claude` (APPROVED), CodeRabbit, the Codex App, and `nathanpayne-codex` (CHANGES_REQUESTED then APPROVED). Corrected value, and it is the sharper story: "seventeen bugs that a single twenty-three-minute review round let through on the template, and that took seven Codex rounds apiece to surface once the same files landed in two unfamiliar codebases."

### E26—"134 review-finding threads"

> ":69 **134 review-finding threads** across a 24-hour, ten-PR batch and its hotfix in July 2026"

**SUPPORTED on all three numbers, and consistent with the sibling post.** The count is itemised per PR at `perfect-score-wrong-axis.md:98`: `#789` 5, `#790` 13, `#791` 8, `#792` 0, `#793` 0, `#794` 12, `#795` 38, `#796` 22, `#797` 29, `#800` 5, `#810` 2—which sums to 134. The composition matches: ten backlog PRs (#789–#797 plus #800) and one hotfix (#810), eleven in total, which is what the blog calls "an eleven-PR review record." The window: #789 opened `2026-07-29T04:12:07Z`, #797 merged `2026-07-30T03:59:00Z` = **23 h 46 m 53 s**; including the hotfix's merge at `04:28:05Z`, 24 h 15 m 58 s. "24-hour" is right either way, and the blog says the same at `:54` ("about twenty-four hours of continuous automated review"). One nuance if precision matters: the blog calls the initial batch **nine** PRs "opened within thirty-six seconds of each other, later joined by #800," so "ten-PR batch" folds a later joiner into the batch. Defensible either way.

### E27—"10 repositories in the Mergepath fleet"

> ":70 **10 repositories** in the Mergepath fleet—the hub plus nine consumers, including Override, Device Source of Truth, Friends & Family Billing, Swipe Watch, and this site."

**SUPPORTED.** Nine consumers in `.mergepath-sync.yml` (§E13) plus the hub is ten, and all five named repos are on the list.

---

## §F `override`

### F1—"started as a `create-next-app` scaffold"

> ":44 Override started as a `create-next-app` scaffold"

**SUPPORTED, literally.** `bfdb5d6`, 2026-02-18 14:09:11 −0800, subject `Initial commit from Create Next App`, 17 files, 6,886 insertions of which 6,587 are `package-lock.json`. See §C2 for why this matters to a different page's claim.

### F2—"about 75 commits"

> ":44 and grew into a production financial platform in about 75 commits"

**WRONG now, and it was right on the day it was written.** `git rev-list --count origin/main` returns **171**. Commit 75 is `731e7c4`, **2026-04-12**, "chore: wait for CodeRabbit before auto-merging (#24)"; the page was authored on 2026-04-13, when the count stood at **76**. The gap is not all noise: excluding Dependabot (51) and template propagation (19) leaves **101** substantive commits. Corrected value: "**over 170 commits**," or "**more than a hundred commits of product and platform work**" if the mechanical tail should be excluded. Source: `git log origin/main --reverse --format='%h %ad %s' --date=short | sed -n '75p'`; `git rev-list --count "$(git rev-list -1 --before=2026-04-14 origin/main)"`.

### F3—the stack

> ":44 The stack is Next.js 16, TypeScript, and Firebase, with Sonner for notifications and Vitest for testing."

**SUPPORTED, all five.** `package.json:23` `"next": "^16.3.1"`, `:56` `"typescript": "~7.0.2"`, `:21` `"firebase": "^12.17.1"`, `:30` `"sonner": "^2.0.8"`, `:58` `"vitest": "^4.1.10"`.

### F4—the product feature list

> ":36-40 weekly nut, royalties, house fees, GP structures, and waterfall rules … per-investor ROI, cash-on-cash multiples, IRR, and recoupment forecasts … Bear, Base, and Bull scenarios … sensitivity grids across occupancy rates and run lengths … a private Deal Room link"

**SUPPORTED.** Every domain term resolves to source: weekly nut, royalties, house fees, cash-on-cash and sensitivity in `src/app/page.tsx`; waterfall and the Bear/Bull scenario types in `src/types/dealRoom.ts`; IRR and occupancy in `src/types/model.ts`; recoupment in `src/types/deal.ts`; Deal Room in `src/types/production.ts`; subscription status in `src/types/capitalization.ts`.

### F5—the middle phase

> ":48 the repo moved to a 1Password-first authentication model, with service account keys stored in vaults and a bootstrap script that restores local config from 1Password item IDs. Deploy auth was documented, rotated, and eventually shifted toward keyless Firebase deploys."

**SUPPORTED, and the commit sequence tells the story in order.** `99881a7` 2026-03-05 "1Password Deploy"; `6c22903` 2026-03-12 "Document credential hygiene and key rotation"; `92e8676` 2026-03-12 "Document 1Password deploy flow"; `9ea95c3` 2026-03-14 "Document keyless Firebase deploy auth"; `d847787` 2026-03-14 "Restore 1Password-first deploy auth docs"; `48bd1e5` 2026-03-14 "Record 1Password auth as explicit invariant." The "eventually shifted toward" hedge is well chosen—`d847787` restores the 1Password-first docs hours after the keyless ones land.

### F6 to F12—the primacy paragraph

> ":50 Override was where I first set up machine user accounts (…), wrote the cross-agent review pipeline, added CodeRabbit with custom financial modeling review guidance, and introduced the disagreement detection workflow that flags when reviewers diverge. The [PreToolUse hook](…), the bug fix escalation policy, and the two-strike rule all originated here—before being extracted into a template that I applied to every other project."

**WRONG on six of seven attributions.** Every one of these artifacts appears in the template repo first and reaches Override by fan-out, usually within seconds. Timestamps below are commit dates in `-0700`, from `git log -S"<term>" --format='%H|%ad|%s' --date=iso --reverse origin/main | head -1` run in each repo.

**Machine users and the cross-agent pipeline** (`nathanpayne-claude`)—Override is **fourth of six**:

| Repo | Commit | Timestamp |
|---|---|---|
| **mergepath** | `b9734df` initial commit | **2026-03-24 12:08:47** |
| friends-and-family-billing | `2ff6557` | 12:22:55 |
| device-source-of-truth | `6b08827` | 12:22:56 |
| **overridebroadway** | `614a9da` | **12:23:03** |
| nathanpaynedotcom | `e9c87b3` | 12:23:03 |
| swipewatch | `3fadd90` | 12:23:12 |

All five consumers receive the identical commit subject, "Add machine user review system and cross-agent review pipeline," fourteen minutes after mergepath's initial commit created it.

**The `PreToolUse` hook**—Override is **fourth of six**: mergepath `61165ab` **2026-03-25 16:31:20**; nathanpaynedotcom 16:33:11; DST 16:33:28; **Override `1fd1204` 16:33:35**; FFB 16:33:44; swipewatch 16:34:19. Same subject everywhere: "Add review guardrails: PreToolUse hook, CLAUDE.md checklist, break-glass."

**The escalation policy and the two-strike rule**—Override is **third of five**: mergepath `9436901` **2026-04-04 11:49:50**, "Add bug fix escalation policy to agent operating rules"; DST `cbd7070` 11:49:54; **Override `36dbedb` 11:49:55**; swipewatch `5311af8` 11:49:57; FFB `5a0f2d4` 11:49:59. Note that neither Override nor DST nor FFB nor swipewatch carries "two-strike" in `REVIEW_POLICY.md` at all—it lives in `docs/agents/operating-rules.md:352` (§A14, §H2).

**The disagreement detector**—Override is **second of six, tied last**: mergepath `f756289` 2026-05-13 20:54:32, "fix(ci): scope detect-disagreement to current HEAD + latest-per-reviewer (closes #259) (#260)"; every consumer, Override included, receives it in the same bulk sync on 2026-05-15 at 10:02:28–10:02:54. A loose `-S"disagreement"` matcher appears to put Override twelve days ahead (`9f28a7e`, 2026-03-12); reading the diff shows the hit is "Code vs. docs disagreement: Trust the implementation first," a documentation-precedence rule with no reviewer semantics. See §M2.

**CodeRabbit**—Override is **last, by three days**. mergepath `692b4e8` 2026-04-07 14:35:16, "Add CodeRabbit as automated second reviewer (Phase 2.5)"; DST, FFB, swipewatch and nathanpaynedotcom all receive it within eleven seconds (14:35:24–27). Override's 2026-04-07 commit is `c01e5b7`, "Add CodeRabbit Phase 2.5 documentation (**disabled for private repo**)"—documentation only. Its actual config arrives at `3df0be5`, **2026-04-10 16:21:38**, "Add CodeRabbit config with financial modeling review guidance."

**F8 is the one partial exception**, and the page should keep it. "Custom financial modeling review guidance" is genuinely Override's own: `.coderabbit.yml:35` "Financial modeling engine. Verify arithmetic correctness in", `:52` "Deal-room components display financial terms and negotiation". Every consumer got a domain-specific config, but this one is Override's domain and Override's file. The claim to drop is that Override *added CodeRabbit*; the claim to keep is that Override wrote the financial review guidance.

**F12—"before being extracted into a template"** is the load-bearing error, and it reverses the direction of travel. The template repo's initial commit (2026-03-24 12:08:47) *precedes* every Override adoption above, so nothing was extracted from Override into it. Corrected direction: the template was built, and Override received the fan-out along with four siblings.

### F13—what Override genuinely originated

Recorded here as the replacement fact, because the paragraph should not simply lose its point. **Override does hold real primacy for the review policy itself**, a week before the template repo existed:

- `a26d0b4`, **2026-03-17 21:50:59 −0700**, "Add code review policy and enforcement workflows"—adds Section 7 to `AGENTS.md` plus two GitHub Actions workflows: `pr-review-policy.yml` (a CI gate requiring a Self-Review section, auto-labelling PRs that need external review) and `pr-audit.yml` (a weekly audit of merged PRs for policy compliance). 3 files, +229.
- `a40cc29`, 2026-03-17 22:00:15, "Add external review gate to block merge when label present."
- `97f408d`, 2026-03-19, "Fix PR review policy workflow: multiline output, labels, Dependabot."
- `462b9f6`, 2026-03-19, "Add code review requirements to all agent instruction files."
- `88cc6fe`, 2026-03-23, "Split AGENTS.md into focused sub-files under `docs/agents/`"—the `docs/agents/` layout the whole fleet now uses.

mergepath's initial commit is `b9734df`, 2026-03-24 12:08:47. Override's review policy, its Self-Review CI gate, its external-review label gate and its `docs/agents/` split all predate it. Defensible rewrite: Override is where the review *policy* and its first CI enforcement were written, in the week before the template repo existed; the machine users, the hook, the escalation rules and CodeRabbit all came the other way, out of the template that policy motivated.

### F14—"a $15M capitalization"

> ":54 A producer managing a $15M capitalization might have investor commitments in a spreadsheet"

**SUPPORTED as constructed.** The sentence is explicitly hypothetical ("might have"), not a claim about a real production or about anything in the repo. No correction needed; recorded so the ledger is complete on numerics.

---

## §G `swipe-watch`

### GM1—the evidence repository is `swipewatch`, and issue #757 says otherwise

Issue #757's "Source and evidence" block reads, verbatim: "Evidence repo: this repository. The `#NNN` numbers cited below are this repository's." **Both sentences are wrong, and the second is the one instruction in that issue a rewrite must not follow.** Swipe Watch's evidence is `nathanjohnpayne/swipewatch`, checked out at `~/GitHub/swipewatch`; this repository holds the page, not the prototype, and the page itself says so at `:12` (`githubUrl: "https://github.com/nathanjohnpayne/swipewatch"`). Every `#NNN` cited in §G belongs to the swipewatch repo, and every one of them collides with a real, unrelated item carrying the same number here:

| Cited as | In `swipewatch` | Same number in `nathanpaynedotcom` |
|---|---|---|
| `#1` (§G4, first PR merge) | PR "Add code review policy and enforcement workflows" | PR "Add GitHub to Connect section and reorder social links" |
| `#20` (§G4, +27 tiles) | PR "Add 27 new content tiles to recommendation catalog" | PR "Add missing blog post sections and fourth figure" |
| `#21` (§G4, §G5, the duplicate) | PR "Remove duplicate National Parks tile (CodeRabbit finding)" | PR "Replace remote email screenshots with local images" |
| `#29` (§G10, the bug) | issue "Mobile card images: streaming badge clipped and poster scaling issues" | issue "Add Playwright responsive test suite and CI workflow" |
| `#30` (§G10, the fix) | PR "fix: mobile card image scaling and badge clipping" | PR "Fix blog post responsive layout for mobile viewports" |

Read the issue's way, all five resolve—silently, to the wrong artifact. Any `#NNN` that reaches the page must be qualified `swipewatch#NN`, the way `mergepath.md:64` qualifies `mergepath#75`. `plans/759/refs.json` does not cover them: it holds exactly one swipewatch entry, `nathanjohnpayne/swipewatch#33`, cited by a blog post and by no row in §G.

**The ref is load-bearing and every command in this section carries it.** §G1–§G18 were written against a bare `origin/main`, which is the defect §BM1 records: unpinned, those counts measure the repository's present rather than the thing the row was written to establish. Every one of them was re-run here pinned to **`7909892`** (`origin/main` at 2026-08-27T10:39:42−0700) and every count reproduces—106 titles and 106 ids inside the pool, 110 `id:` file-wide, and the growth ladder 45 → 57 → 68 → 80 → 107 → 106 across the twelve commits that touch `app.js`. Pin; do not repeat the unpinned form.

Two corrections to §G1 while it is open. The stale "80 titles" survives at **eight** sites in the swipewatch tree, not the three that row names: `POSTER_GUIDE.md:230`, `README.md:17`, `:35`, `:90`, `:92`, `:280`, and `docs/agents/operating-rules.md:6`, `:26`. `README.md:17` additionally carries a stale split, "45 Disney+ and 35 Hulu titles," which no longer sums to the pool either.

### GM2—what was instrumented, what this audit could read, and the one window §G states PostHog figures over

**The audited ref is the shipped artifact, which is what makes the rest of this row a claim about production rather than about a checkout.** Fetched 2026-08-27: `https://swipewatch.web.app/` and `https://swipewatch.web.app/app.js?v=1.7` are byte-identical to `7909892:index.html` (8,116 bytes) and `7909892:app.js` (92,948 bytes)—`diff` clean on both. **Scope, per Codex P2 on PR #836: those two files were compared and nothing else.** `styles.css`, the poster art and the rest of the hosted tree were not fetched, so "the live site is byte-identical" is not what this supports; "the deployed document and script are byte-identical" is. The page states it that way. A second boundary belongs here for the same reason: this audit has **no read path to the GA4 property**, so it can establish that no figure was ever published in any artifact it searched, and cannot establish that nobody ever opened the dashboard. "Never been read" overstates it; "never published, and unreadable from here" is the supported form.

**Five of the six actions are day-one; the sixth is not (Codex P2, PR #836).** `git show 2ca43ff:app.js` carries `like`, `dislike`, `super_like`, `onboarding` and `restart`; `unlock_mode` appears only at `7909892` and could not have predated the economy it reports on (§G8). Any page sentence of the form "six actions wired in the first commit" is therefore false, and four such sentences shipped before this was caught.

**The six custom actions are not the whole of what GA4 holds (Codex P2, PR #836).** A gtag property records `session_start` and `first_visit` on its own, with no custom wiring, so **return behaviour is derivable from an export even though nothing here was built to ask for it**. Any claim that the instrument "never captured return visits" is therefore false; the supported form is that no *custom* action tracked returns. This narrows what §G21 and the page can say is unmeasurable: time on a card and kept-versus-flagged are genuinely outside the instrument, return behaviour is inside it and simply unqueried.

**The prototype has exactly one instrument.** GA4 measurement ID `G-0SFL3RGC0H`, loaded at `index.html:13-18` and fired through `trackEvent(action, label, value)` at `app.js:1497-1514`. Six actions exist and no others; `specs/analytics.md` enumerates the same six:

| Action | Fires at | `event_label` | `value` | Hypothesis it bears on |
|---|---|---|---|---|
| `dislike` | `app.js:1529` | card title | `currentIndex` | swipe |
| `like` | `:1534` | card title | `currentIndex` | swipe |
| `super_like` | `:1539` | card title | `currentIndex` | swipe |
| `onboarding` | `:1826` | "User completed onboarding" | `0` | first run |
| `restart` | `:1756` | "User restarted the app" | swipes this session | session length |
| `unlock_mode` | `:1797` | mode name | coin bank after the spend | coin/unlock |

Never captured, anywhere: elapsed time on a card (§G14), which titles a person kept (§G19), a return visit as such, or any variant, flag or cohort (§G21).

**There is no PostHog, and the check is stronger than an absence in one tree.** `git grep -i posthog 7909892` returns nothing and `git log --all -S"posthog"` returns no commit, so PostHog was never in this repository. The organization holds exactly two projects—**503790** `FiveAcross.app` and **469428** `NathanPayne.com`—and neither carries a swipewatch event. 469428's taxonomy has no `like`, `dislike`, `super_like`, `unlock_mode` or `onboarding`; a distinct-`$host` sweep over its entire history returns `nathanpayne.com` (3,527 events), `localhost:4321` (29), `nathanpaynedotcom.web.app` (13), `www.nathanpayne.com` (1) and two null, and `swipewatch.web.app` has never sent it anything. That project's first ingested event is 2026-06-14T01:43:13.986Z, fifteen weeks after the prototype was built.

**So #757's "add behavioral evidence, or explicitly state what was not instrumented" has a third answer, and it is the true one.** The prototype **was** instrumented, into GA4, and is still firing in production; **this audit has no read path to that property**; and nothing in the repository, its eight narrative documents, its issues and pull requests, or their comments ever quotes a figure from it (90 items when this row was written; **97 as of 2026-08-27**—see §G23, where the re-run at the current count is recorded). Per §M6 the correct posture is EXTERNALLY SOURCED for anything a later session pulls out of GA4, and silence until then. The two things the page must not say are "it was not instrumented," which is false, and a number, which nobody here has seen.

**The one PostHog window for this section**—used by §G25 and by nothing else, since no other row has a PostHog figure. Project **469428**, project timezone **UTC**, `timestamp >= toDateTime('2026-06-14 00:00:00') AND timestamp < toDateTime('2026-08-27 00:00:00')`: 74 days, opening at the project's first ingested event and closing at the last midnight before this audit so that no partial read-day moves a count. Two scope caveats, both load-bearing. `execute-sql` does **not** apply the project's default internal/test-user filter, so these counts include the owner's own visits. And `$virt_is_bot` is not in this project's taxonomy, so bot traffic cannot be excluded—a zero in that column means "unavailable," not "none."

### G1, G2, G3—"80-title pool", stated three times

> ":34 Presents content cards from an 80-title pool spanning Disney+ and Hulu"; ":43 reaching 80 titles with a documented poster guide"; ":53 The 80-title pool and the coin mechanic are enough to test that question."

**WRONG, and wrong in three places. The pool is 106.** Two independent matchers over the `contentData` array (`app.js:4` through `:1151`) agree exactly:

```bash
git show origin/main:app.js | awk 'NR>=4 && NR<=1151' | grep -cE '^[[:space:]]*title:'   # 106
git show origin/main:app.js | awk 'NR>=4 && NR<=1151' | grep -cE '^[[:space:]]*id:'      # 106
git show origin/main:app.js | awk 'NR>=4 && NR<=1151' | grep -cE '^    \{'                # 106
```

A whole-file `id:` count returns 110; the four extras are `DISCOVERY_MODES` entries at `:1171, 1177, 1183, 1189`, outside the pool—which is precisely the kind of loose match that has to be narrowed. There are **no duplicates** (`sort | uniq -d` on both keys returns empty) and the pool is **one flat list**, not grouped, so no title is counted twice. Modes are read-time filters over the same array (`app.js:1215-1218`), and a title can match more than one filter without being in the pool twice.

The pool has been 106 since **2026-04-10**, three days *before* the page's narrative was written. Corrected value: **106**. Note the repo's own docs carry the same stale figure and should be fixed alongside. Re-run pinned to `7909892` (§GM1), it survives at **eight** sites rather than the three this row first named: `POSTER_GUIDE.md:230` "The app currently contains 80 titles"; `README.md:17` "80 total titles: 45 Disney+ and 35 Hulu titles"—a split that no longer sums either—plus `:35`, `:90`, `:92`, and `:280` "### Current Content (80 titles)"; and `docs/agents/operating-rules.md:6` and `:26`.

### G4—the growth sequence

> ":43 Starting from an initial set, the pool grew through several commits—20 new tiles with poster-format upgrades, then 12 more, then 27—reaching 80 titles"

**WRONG twice over: the ordering is inverted and the first number is the commit's own error.** Only twelve commits ever touched `app.js`. Running the count at each:

```bash
for sha in $(git log origin/main --reverse --format='%H' -- app.js); do
  n=$(git show "$sha":app.js | grep -cE '^[[:space:]]*title:')
  printf "%3s  %s\n" "$n" "$(git log -1 --format='%h %ad %s' --date=format:'%Y-%m-%d %a' $sha)"
done
```

| Pool after | SHA | Date | Net Δ | Subject |
|---|---|---|---|---|
| 45 | `2ca43ff` | 2026-02-24 Tue | +45 | Initial commit |
| 57 | `84bd26f` | 2026-02-27 Fri | +12 | Apply Chicago style closed-up em dashes and add new content |
| 68 | `cd7b7c3` | 2026-02-28 Sat | **+11** | Add **20** new content tiles and upgrade 6 duplicates to poster format |
| **80** | `b57d5a8` | 2026-02-28 Sat | +12 | Add **12** new content tiles and update docs for 80-title pool |
| 107 | `38caa74` | **2026-04-10 Fri** | **+27** | Add **27** new content tiles to recommendation catalog (**#20**) |
| **106** | `83f15fe` | 2026-04-10 Fri | −1 | Remove duplicate America's National Parks (Classic) tile (**#21**) |

The pool first reached 80 at `b57d5a8`, 2026-02-28T18:52:39−0800. The "+27" is `38caa74`, 2026-04-10T12:18:48−0700—**41 days later**, and it is what took the pool *past* 80, to 107. The page places it on the way to 80.

The "20" is also wrong, and the page inherited the error from the commit subject: `cd7b7c3` says twenty but the diff adds **eleven** (`git show cd7b7c3 -- app.js | grep -cE '^\+[[:space:]]*title:'` → 11). Its body lists 23 names, twelve of which were already in the file—those twelve were the *poster-format upgrades*, mis-listed as new. The very next commit, `6e5546f`, "Update all documentation for **68**-title content pool," corroborates 68 rather than 77.

Corrected sequence: **45 at the initial commit, then +12, +11 and +12 to reach 80 on 2026-02-28; then +27 on 2026-04-10 to 107, less one duplicate, for a standing 106.** The three early growth commits carry no PR number—they were direct pushes; the repo's first PR merge is `c66a884` (#1) on 2026-03-17.

### G5—the duplicate

> ":43 Duplicate detection was manual; one commit removes a duplicate \"America's National Parks (Classic)\" tile that slipped through."

**SPLIT—the removal is SUPPORTED, "detection was manual" is WRONG.** CodeRabbit, an automated reviewer, flagged the duplicate on PR #20. `83f15fe`, 2026-04-10T12:23:59−0700, "Remove duplicate America's National Parks (Classic) tile (#21)." One title removed (`app.js | 11 -----------`), string verbatim as quoted. The body records that ID 155 shared background and titleImage URLs with existing ID 10 and that it was "Flagged by CodeRabbit on PR #20"—so "detection was manual" is the one soft spot: it was caught by an automated reviewer on the PR that introduced it. Defensible weaker form: "there was no dedup check in the data; the one duplicate that slipped through was caught in review and removed."

### G6—"built in a weekend"

> ":41 Swipe Watch was built in a weekend in vanilla JavaScript—no framework, no build step, no bundler."

**WRONG—the build opens on a Tuesday, and the Tuesday is detached from the rest.** The initial commit `2ca43ff` is **Tuesday, 2026-02-24**, 10:00:42 −0800 (`git log -1 --format='%ad' --date='format:%Y-%m-%d %A' 2ca43ff`). The thirteen commits that constitute the core build fall on three calendar days—a detached first day, then a contiguous pair—inside a window of 104 h 52 min that is five calendar days wide on the author's clock and six in UTC:

| Date (author-local, −0800) | Day | Commits |
|---|---|---|
| 2026-02-24 | **Tuesday** | 4 |
| 2026-02-27 | **Friday** | 5 |
| 2026-02-28 | **Saturday** | 4 |

**Those weekday names hold only on the author's clock, and an earlier revision of this row argued from the wrong half of that.** It read "there is no Sunday in the record," and then "Zero commits land on any Sunday in the first two weeks; the repo's first Sunday commit is six weeks later, 2026-04-05." In UTC the last four of the thirteen fall on **Sunday, 2026-03-01**, and the repository's first Sunday commit is `cd7b7c3`, inside the core build itself—§G22 carries both scopes side by side and the commands that produce them. The verdict is unaffected, because what refutes "a weekend" is the Tuesday and the five-day span, neither of which moves with the timezone. Corrected value: "built across a Tuesday and the following Friday and Saturday" *on the author's clock*, or the clock-independent and equally good "built in a few sittings over five days." The content pool then kept growing until 2026-04-10 (§G4), so "built in a weekend" understates the calendar in both directions.

### G7—the initial commit's contents

> ":41 The initial commit landed with a working swipe UI, a content pool, session management, and analytics tracking."

**SUPPORTED, all four.** `git show --stat 2ca43ff` → 12 files, 2,875 insertions (`app.js` 890, `styles.css` 960, `index.html` 150, plus docs). Swipe UI: `2ca43ff:app.js:747` `card.addEventListener('mousedown', handleStart)`, `:752-753` touch handlers, `:769` `function swipeCard(card, direction)`. Content pool: `contentData` at `:4`, **45 titles**. Session management: `:501` `const SESSION_SIZE = 10`, `:508`/`:516` `localStorage 'swipewatch_shown_content'`, `:524` `getSessionContent()`. Analytics: `:758` `function trackEvent(action, label, value)` → `gtag('event', …)`, with GA4 tag `G-0SFL3RGC0H` in `index.html`. The coin mechanic was *not* in it, which the page correctly implies rather than claims—though `disney-coin.png` and `disney-dollar.jpg` were committed on day one, unused.

### G8—the coin and unlock system

> ":45 The coin and unlock system came after the core swiping worked. … The end screen was redesigned to show a persistent coin bank with a spend mechanic rather than a dead-end \"you're done\" state."

**SUPPORTED, and the ordering is right.** `4cb6671`, 2026-02-27T19:59:18−0800, "Redesign end screen with persistent coin bank and spend mechanic"; `4453e74`, 19 minutes later at 20:18:38, "Add coin spend unlock modes with curated discovery batches." Both land three days and ten hours after the initial commit, and after the swipe UI was already working. Live coin increment is now at `app.js:1545-1548`. Minor precision note: the page describes these as two things in two sentences, and `4cb6671` alone carries both the coin bank and the spend mechanic.

### G9—the onboarding pass

> ":47 The onboarding UX and interaction affordances were polished in a dedicated pass"

**SUPPORTED, and it really is one commit.** `deb97a1`, 2026-02-27T19:46:20−0800, "Polish onboarding UX and interaction affordances," whose body enumerates the pass: gesture demo animation, idle card pulse, continuous swipe overlay feedback, progress bar synced with card exit, dynamic drag shadow, post-swipe reinforcement toast, de-emphasised Swipe Up. `git log -i --grep='onboard'` returns no other onboarding-UX commit.

### G10—the mobile fix

> ":47 A later commit fixed mobile card image scaling and badge clipping, which only surfaced on smaller viewports"

**SUPPORTED, both symptoms.** `fbc065e`, 2026-04-13T12:58:24−0700, "fix: mobile card image scaling and badge clipping (#29) (#30)", closing issue #29. Image scaling: "Shift poster/info ratio from 70/30 to 75/25 on mobile (≤480px) to reduce aggressive cropping"; "Set `min-height: 60%` on letterbox images." Badge clipping: "Bump `card-mode-badge` inset from 10px to 14px to clear border-radius clip zone." 2 files, 21 lines.

### G11—the poster guide

> ":43 with a documented poster guide that specifies image handling, content types, and format standards"

**SUPPORTED on all three.** `POSTER_GUIDE.md`, added in the initial commit and expanded the same day, now 238 lines. Image handling: Options 1–4 plus "How the Fallback System Works." Content types: `:7` "The app supports three image formats depending on content type," with per-type sections for Disney+, Hulu standard art and Hulu poster-vertical. Format standards: "How Card Format Is Determined" (`:162-170`) and `:203` "**Format**: WebP preferred for all new content; JPEG acceptable for classic posters." Its `:230` carries the stale "80 titles" (§G1).

### G12—"no framework, no build step, no bundler"

> ":41 in vanilla JavaScript—no framework, no build step, no bundler"

**SUPPORTED with a distinction worth keeping straight.** At the initial commit there is no `package.json` at all—12 files, zero tooling. Today `package.json` exists (added `7e456e3`, 2026-03-31, "Conform to ai_agent_repo_template"—template propagation, not app work) with `test: vitest run` and `lint: eslint .` and five dev-only dependencies. There is **no `build` script**, **no bundler config** (`git ls-tree -r --name-only origin/main | grep -iE 'vite\.|webpack|rollup|esbuild|parcel|babel|tsconfig'` → empty) and **no runtime dependency**. The strongest proof is `firebase.json`, which serves `"public": "."`—the raw repo root, with no build output directory. The claim stands; only "no tooling at all" would overstate it.

### G13—"(genres, moods, trending)"

> ":43 Each batch aligned with a content taxonomy that maps to the discovery modes in the app (genres, moods, trending)."

**WRONG—none of the three parenthetical names is a mode.** `DISCOVERY_MODES` at `app.js:1169` holds exactly four:

| id | name | line | predicate |
|---|---|---|---|
| `disney-vault` | Disney Vault | `:1171-1172` | id 16–30, or `/Disney\+ Original/i` on `type` |
| `streaming-originals` | Streaming Originals | `:1177-1178` | `/Hulu Original/i` on `type`, or `/FX/i` on `genres` |
| `nature-discovery` | Nature & Discovery | `:1183-1184` | `/Docuseries\|Documentaries\|Animals & Nature\|History\|Lifestyle/i` on `genres` |
| `new-trending` | New & Trending | `:1189-1190` | `parseInt(item.year) >= 2025` |

There is no "moods" mode and no "genres" mode—`genres` is a per-item free-text string (`"Animation, Comedy"`), an input to two of the filters rather than a mode. Corrected value: **(Disney Vault, Streaming Originals, Nature & Discovery, New & Trending)**. The surrounding claim is fine: the alignment to the poster-guide taxonomy is real, per `app.js:1168` ("categories aligned with poster guide label taxonomy") and commit `504062d`, 2026-02-28, "Align discovery modes with poster guide content taxonomy."

### G14—"each taking under a second"

> ":35 Captures swipe-left (dismiss), swipe-right (interested), and save-for-later signals as lightweight preference data, each taking under a second."

**SPLIT: three signals SUPPORTED, "under a second" UNPROVABLE.** The three exist at `app.js:1526-1530` (`stats.disliked++`, `trackEvent('dislike', …)`), `:1531-1535` (`like`) and `:1536-1540` (`super_like`), with the save-for-later framing confirmed by the UI: `index.html:52` `<div class="swipe-indicator super">Watchlist</div>`, `:93` "Add to your watchlist." Read this with §G19: the *signal* is real (an event fires and reaches GA4) and the *watchlist* is not (nothing is persisted). "Captures a save-for-later signal" is defensible; "builds a watchlist" is not.

No timing instrumentation exists anywhere. `grep -nE 'Date\.now|performance\.now|elapsed|duration'` over `app.js` returns four hits, all hard-coded animation durations (`:1657` toast 1500/400 ms, `:1724-1729` coin count 500 ms, `:1802-1807` scroll 400 ms). `trackEvent` transmits `action`, `event_label` and `value`—and `value` is `currentIndex`, a card index, not a time (`app.js:1497-1509`). No duration is ever captured, sent or stored. Defensible weaker form: drop the measurement and keep the argument the page makes better elsewhere—"a swipe is a gesture, not a viewing commitment."

### G15—session state and repeat avoidance

> ":37 Tracks session state and swipe history so the system knows what a user has already seen and can avoid repeat presentations."

**SUPPORTED.** `app.js:1164` `const SESSION_SIZE = 10;`, `:1165-1166` the history and session arrays, `:1199-1201`/`:1207-1209` localStorage round-trip, `:1221` `const unshownContent = pool.filter(item => !shownContent.includes(item.id));`, `:1557-1558` recording after each swipe, `:1223-1224` reshuffling the full pool on exhaustion. Persistence is device-local; there is no server.

### G16—"no ML backend, no collaborative filtering, no real personalization yet"

> ":53 It's a prototype, not a production recommendation engine—there's no ML backend, no collaborative filtering, no real personalization yet."

**SUPPORTED, and it is the most rigorously accurate technical sentence on the page.** There are no network calls of any kind from `app.js`—no `fetch`, no `XMLHttpRequest`, no HTTP client; the only outbound traffic is `<img>` loads from the Disney RipCut CDN and the GA4 beacon. `functions/` contains only `.gitkeep`; `firebase.json` has no functions or Firestore block. The recommendation logic is `app.js:1212-1232`: filter by an optional mode predicate, drop seen IDs, Fisher-Yates shuffle (`:1153-1160`), slice ten. Preference signals are **write-only**—`trackEvent` fires to GA4 and nothing in the app ever reads them back; localStorage holds only seen IDs and the coin bank, never the like/dislike verdicts. Personalisation is impossible with the current data model, which is exactly what the page says.

### G17—the Disney demo

> ":55 I demoed Swipe Watch to Disney's EVP of Product. The reaction confirmed the hypothesis: the interaction model is compelling, and the signal-density argument resonates with people who think about recommendation systems professionally."

**UNPROVABLE, and the second sentence additionally asserts other people's mental states.** No artifact in the repository references a demo, an executive, or any stakeholder. Searched: every commit subject and body on every ref (`git log --all -i --grep='EVP' --grep='demoed' --grep='executive' --grep='pitch'`), every tracked file (`git grep -rniE "EVP|demoed|demo to|executive|stakeholder|leadership|VP of"`), and all eight narrative documents (`README.md`, `CLAUDE.md`, `AGENTS.md`, `.ai_context.md`, `DEPLOYMENT.md`, `CONTRIBUTING.md`, `POSTER_GUIDE.md`, `RIPCUT_GUIDE.md`) plus `docs/`, `specs/`, `plans/`, `bugs/`, `.github/`. The single `demo` hit is "gesture demo animation" in an onboarding commit body. GitHub issue and PR comment bodies beyond what merge commits carry were not searched **at the time this row was written**; they have since been swept in full and return nothing, which closes the search at every layer—see §G20.

The demo itself is a first-person biographical claim and may well be true; it simply leaves no trace here. **"The reaction confirmed the hypothesis"** is the part to change regardless: it reports what other people found compelling and what resonated with them, which is a mental state no record contains (§M4). Defensible weaker form: "I demoed Swipe Watch to Disney's EVP of Product," full stop, or state what was said if a note exists outside the repo.

### G18—stack line

> ":18 stack: \"Vanilla JavaScript · Firebase Hosting\""

**SUPPORTED, and precisely scoped.** `firebase.json` contains only a `hosting` block—`"public": "."`, an ignore list, no-cache headers on `**/*.@(js|css)` and `index.html`, and an SPA rewrite. No `firestore`, `database`, `storage`, `functions` or `emulators` key; `functions/` holds only `.gitkeep`; no Firebase SDK is loaded in `index.html`. Hosting only, exactly as claimed. Analytics is GA4 via `gtag`, a separate Google product, which the stack line correctly does not claim as Firebase.

### G19—"building a watchlist"

> ":4 description: \"…makes expressing taste and building a watchlist a game.\""; ":30 swipe left, swipe right, or save to a watchlist"; ":35 save-to-watchlist signals as lightweight preference data"; `src/pages/index.astro:205` "turns expressing taste and building a watchlist into a game"

**WRONG on all four surfaces. There is no watchlist, and the audit-driven correction pass is what introduced the claim.** Swipe-up sets `stats.superLiked++` (`app.js:1538`), an in-memory session counter the end screen prints as a bare number (`:1686`, rendered at `index.html:146`) and that `restartApp` zeroes for the next session (`:1309`). The app writes exactly three localStorage keys and not one of them holds a title: `swipewatch_shown_content` (seen IDs, `:1200`/`:1208`), `swipewatch_coin_bank` (`:1247`/`:1251`) and `swipewatch_onboarding_completed` (`:1825`/`:1832`). Nothing in `index.html` renders a list of saved titles. The word appears four times and all four are control labels—the swipe-up indicator (`:52`, the only capitalised instance), the onboarding line "Add to your watchlist" (`:93`), and the two button tooltips "Add to main watchlist" (`:108`) and "Add to training watchlist" (`:113`). Two separate gestures carry a watchlist label—swipe-up (`:108`, "main watchlist") and swipe-right (`:113`, "training watchlist")—and neither persists a title. A watchlist is named, never built. **The telemetry is the other half of that boundary and cuts the other way (Codex P2, PR #836):** `trackEvent('super_like', contentTitle, currentIndex)` at `app.js:1539` sends the card's *title* as `event_label`, so GA4 holds the identity of every flagged title even though the device holds none. The device forgets what was saved; the instrument does not. Conflating the two understates what an export would contain, and it changes what a persisted watchlist would buy—the measurement already exists, the product follow-through does not. §G16 already establishes the general form of this—the verdicts are write-only—and the watchlist is the specific case a reader will most naturally assume is the exception, because a "save" gesture that saves nothing is not what the word means.

**The provenance is the half to front-load, and it is line-dated rather than file-dated (§M5).** `git log -L 4,4:src/content/projects/swipe-watch.md 44c0a59` returns `194c7df`—**pin the query to `44c0a59` or any earlier commit**, because PR #836 renames that path to `.mdx` and the command exits 128 against any later ref (Codex P2, PR #836), 2026-08-26T17:24:02−0700, PR **#814** in this repository—the commit that applied §G1–§G17 to the page. Before it, `:4` read "turns taste signals into a faster, more active recommendation loop," which claimed nothing about a watchlist at all. `git log -L 205,205:src/pages/index.astro` returns the same commit for the homepage card, which moved from "recommendation training and watchlist building" to "expressing taste and building a watchlist." So the correction pass replaced a vague claim with a false one, on two surfaces, in a single commit, while this ledger was open on the same file. That is §M5.1 recurring in its live form: the row that would have caught it did not exist, and nothing checked the new sentence against the tree before it shipped. Corrected value: the third gesture files a title under a "Watchlist" label and the app forgets it when the session ends—a sharper statement of the write-only scope the page already argues for, not a weaker one.

### G20—the Disney demo, and the last place corroboration could have lived

> ":55 I demoed Swipe Watch to Disney's EVP of Product, and a demo is what the record contains—no user sessions, no swipe data read back, no before-and-after on whether the coin mechanic changed how long people stayed."

**UNPROVABLE, unchanged in verdict, and now exhaustively so—§G17's one remaining search has been run and it returns nothing.** §G17 named the gap in the wording it originally carried: "GitHub issue and PR comment bodies beyond what merge commits carry were not searched and are the one remaining place corroboration could live." They have now been searched, and that row has been updated to point here rather than left standing as an open lead. All 90 issue and pull-request numbers in `nathanjohnpayne/swipewatch` were fetched with their bodies and every comment (`gh api repos/nathanjohnpayne/swipewatch/issues/{N}` and `/comments`, N = 1…90), 13,777 lines in total, and `EVP`, `demoed`, `demo to`, `executive`, `stakeholder`, `leadership` and `VP of` return **zero** hits across all of it; `gh search issues` for the same terms returns empty. Combined with §G17's tree, log and narrative-document sweeps, the search is now complete for this repository at every layer.

**The sweep has since been extended to the two review surfaces it omitted (Codex P2, PR #836).** The `/issues/{N}/comments` endpoint returns issue comments and PR *conversation* comments, but not pull-request review bodies or inline review comments, which live under `/pulls/{N}/reviews` and `/pulls/{N}/comments`—so "every comment" overstated what had been read. Both endpoints were then queried for all **84 pull requests** in `nathanjohnpayne/swipewatch` (`state=all`), matching `EVP|demoed|demo to|executive|stakeholder` case-insensitively: **zero matches**. The no-artifact claim now holds at the review layer too, and it holds by execution rather than by narrowing.

**What the record supports, stated exactly.** That a demo happened is a first-person biographical claim: unfalsifiable here, contradicted by nothing, corroborated by nothing. What #757 forbids—"do not say it 'confirmed the hypothesis' unless user evidence supports that conclusion"—has already been removed: `:55` now reads "a demo is what the record contains," which is the defensible form §G17 asked for and is correct as it stands. The rewrite's job on this sentence is to not undo it. **The one thing to carry forward is that the demo cannot be promoted by aggregation**—it is one reaction, in one room, from one person, and it appears on two live surfaces from that single source. `src/content/resume/projects/swipe-watch.md:8` ends "Demoed to Disney's EVP of Product"; `git log -L 8,8` on that file dates the current line to the same `194c7df`, 2026-08-26, where the sentence in front of it was rewritten and this clause carried through untouched. That clause is already in the defensible form and needs no correction. It is recorded here so a later reader does not mistake its survival on a second surface for independent corroboration, and so a rewrite does not leave the page and the résumé characterising the same event differently.

### G21—swipe evidence against coin/unlock evidence

> ":45 Earning coins by swiping and spending them to unlock curated discovery batches was meant to give the deck a bottom worth reaching … Whether it did is not something the record shows."; ":53 does the swipe interaction feel natural enough for content discovery that people would actually use it?"

**Both UNPROVABLE, and they fail for different reasons—which is the distinction #757 is asking for, and which the asymmetry in their instrumentation will otherwise be mistaken for.** Three of the six GA4 actions serve the swipe hypothesis and one serves the coin mechanic (§GM2). That gap is a property of the taxonomy, not a finding: coin *earning* is not instrumented at all because it is one-to-one with a swipe (`app.js:1546`, inside the same handler as the three swipe events), so a coin event would be a duplicate of an event already firing. Denser instrumentation on the swipe side is not evidence that the swipe side was studied harder.

Neither question could be answered even with the GA4 data in hand, and the two reasons are worth keeping apart:

- **The swipe hypothesis is comparative**—that a swipe is a denser preference signal than completed viewing history. This prototype observes no viewing history of any kind, so the comparator does not exist inside the system. GA4 could at most report how many swipes happened; it could never report that they beat the alternative, because the alternative is not in the instrument.
- **The coin hypothesis is a before-and-after**—that coins and unlocks lengthened sessions or brought people back. There is no before. The mechanic landed in `4cb6671` (2026-02-27T19:59:18−0800) and `4453e74` (2026-02-27T20:18:38−0800), 3 days 9 hours 59 minutes after the initial commit, and no flag, variant, cohort or A/B exists anywhere in the tree at `7909892`, so no controlled cohort was ever set up. **Two successive corrections were needed here (Codex P2, PR #836).** The row first said every session GA4 has ever recorded is a session with coins in it, which §G28 retires. The replacement then said nothing in the data separates a coin session from a pre-coin one, which is also wrong: event timestamps and a known deployment boundary would separate the two periods in any export, with or without a flag. The supported statement is narrower than either—**a pre-coin window exists in wall-clock terms, its contents are unknown because nobody has queried it, and no cohort was set up to make the comparison clean** (Codex P2, PR #836): the app was live and instrumented for the 3 d 10 h before the mechanic landed, so any traffic in that window produced coin-free sessions. The before-period is unexamined rather than absent, and the comparison was available for three days and was never set up to be run.

**What the record does settle is the mechanic's design, and it is checkable.** Spending is gated at 25 coins (`app.js:1772`, `if (coinBankTotal < 25) return;`) and deducted at `:1792`; one coin per swipe makes an unlock cost exactly 25 swipes. What 25 swipes buys is one of the four read-time filters §G13 enumerates, over the same flat pool—an unlock adds no title the pool did not already hold. That is the honest shape: a paywall priced in swipes, in front of a filter. The page's ":45 Whether it did is not something the record shows" is already the right form and should survive the rewrite verbatim.

### G22—"across three days," and which clock says so

> ":41 The core build is thirteen commits in vanilla JavaScript across three days—a Tuesday and the following Friday and Saturday in late February 2026."; `src/pages/index.astro:205` "built in vanilla JS across three days"

**SPLIT—"thirteen commits" and "three days" are SUPPORTED on either clock; the named weekdays hold only in the author's local offset, and §G6's reasoning beneath them is WRONG in UTC.** The thirteen run `2ca43ff` through `b57d5a8` inclusive (`git log 7909892 --reverse --format='%h %ad %s' --date=format:'%Y-%m-%dT%H:%M:%S%z %a'`). Three distinct calendar days either way. Which three is a scope question, and the scopes have to be declared rather than inferred:

| | Author-local (`−0800`) | UTC |
|---|---|---|
| Day 1 | Tue 2026-02-24, 4 commits | Tue 2026-02-24, 4 commits |
| Day 2 | Fri 2026-02-27, 5 commits | Sat 2026-02-28, 5 commits |
| Day 3 | Sat 2026-02-28, 4 commits | **Sun 2026-03-01, 4 commits** |

So §G6's "there is no Sunday in the record"—and its "Zero commits land on any Sunday in the first two weeks; the repo's first Sunday commit is six weeks later, 2026-04-05"—are artifacts of the reader's timezone, which is exactly the failure a bare date invites. `TZ=UTC git log 7909892 --reverse --format='%h %ad %s' --date=format-local:'%Y-%m-%d %a'` puts the repository's first Sunday commit at `cd7b7c3`, **2026-03-01**, inside the core build, with three more the same day. **The WRONG verdict on "built in a weekend" does not change, but the reason it holds is the Tuesday, not the Sunday**: `2ca43ff` is a Tuesday on every clock, four of the thirteen commits sit on it, and the build spans **104 h 52 min** of wall clock (2026-02-24T18:00:42Z → 2026-03-01T02:52:39Z). §G6's prose has been corrected below to argue from the Tuesday and the span; a WRONG verdict resting on reasoning that does not survive a timezone change is the defect the next drafting pass copies forward.

**And the weekend reading is stronger than either surface admits.** Of the thirteen commits, only nine touch `app.js`, `index.html` or `styles.css`. One of those nine is the initial commit; the other eight fall inside a single contiguous **26 h 26 min** stretch, `84bd26f` (2026-02-28T00:26:25Z) to `b57d5a8` (2026-03-01T02:52:39Z)—Saturday into Sunday in UTC, Friday evening into Saturday evening locally. #757's "one weekend" framing is therefore right about everything after day one and wrong about day one, which is a more useful thing to say than either "a weekend" or "three days." The page's `:41` is accurate as written on the author's clock. The homepage card is the weaker surface: "built in vanilla JS across three days" reads as three *consecutive* days, the one shape the record excludes—though it is already an improvement on the predecessor `194c7df` replaced, "built in vanilla JS over a weekend."

**One limit on any duration claim, from the artifact rather than the log.** The initial commit already ships `<script src="app.js?v=1.3">` (`2ca43ff:index.html`), and the cache-buster then walks to 1.4, 1.5 and 1.6 across that Friday evening and to 1.7 in April. Whatever versions 1.0 through 1.2 were, the repository cannot date them: its record begins at 2026-02-24T18:00:42Z and knows nothing before it. "Three days" is a count of the commit record, not a measurement of effort, and the page should not let it be read as the latter.

### G23—the specs describe the build; they did not precede it

**Load-bearing because #757 asks for a hypothesis, success criteria and rejected alternatives, and the repository records none of the three.** Six product specs exist—`specs/analytics.md`, `coin-system.md`, `discovery-modes.md`, `onboarding.md`, `session-tracking.md`, `swipe-mechanics.md`—and one commit adds all six: `7e456e3`, 2026-03-31T17:30:25−0700, "Conform to ai_agent_repo_template with relaxed PRD rules" (`git log 7909892 --diff-filter=A --format='%h %ad %s' -- specs/`; the only other commit that adds anything under `specs/` is `d5ce831`, 2026-03-12, which adds `specs/.gitkeep`). That is **31 days after the core build finished**, and it is template conformance rather than design work: every one of the six documents behaviour that had already shipped. `specs/coin-system.md` reads "Users earn 1 coin per swipe … can be spent to unlock discovery modes (25 coins each)"—the code as built, restated in the imperative. Only `specs/analytics.md` was ever revised afterwards, twice, and both revisions concern the `gtag` callable guard (`28b3ebd`, 2026-06-18, swipewatch#71; `baee3c1`, 2026-06-30, swipewatch#77), never what to measure.

Nothing else fills the gap. `docs/agents/decision-records.md` is a mergepath file propagated verbatim into this repo and carries no swipewatch decision of any kind. Across all issues and pull requests—90 when this row was written, **97 now**—there is not one `## Path taken` section, and `hypothesis`, `success criteria` and `rejected alternative` return zero hits in the same 13,777-line dump §G20 used. **The absence claim was re-run against wording rather than keywords (Codex P2, PR #836).** The original sweep matched three literal terms, which only proves no *explicitly labelled* record exists; a decision can read "we chose X over Y" and match nothing. Re-run across **all 97** issue and pull-request items and their comments (15,195 lines). Two corrections fell out of doing this properly. **The denominator moved: this repository now holds 97 items numbered to #98, not the 90 §G20 recorded**, because eight more landed after that audit (seven mergepath sync PRs and one policy adoption, #91–#98); a first attempt here bounded the loop at 1…95 and silently missed three. And **the demo sweep produces a phantom hit at this scale**: case-insensitive `EVP` returns 1, which is a substring inside a base64 payload in an HTML comment (`FHrpduevp0vJ50A`, `+QSG2xeVPg6MpOB`), one of ten such CodeRabbit diagram blobs in the corpus. Case-sensitive `EVP` returns **0**, and `demoed`, `demo to`, `executive` and `stakeholder` return 0 each. The no-artifact result holds; the lesson is that a case-insensitive sweep over a corpus containing encoded payloads manufactures matches, and the hit must be read before it is counted against eleven decision-shaped phrasings—`instead of`, `we chose`, `chose to`, `trade-off`, `tradeoff`, `considered`, `alternative`, `decided to`, `the goal is`, `rather than`, `opted`—it returns **58 hits, and none of them is about the product**: filtering those 58 for `swipe|coin|unlock|catalog|discovery|watchlist|onboard|gesture|deck` returns **zero**. Every hit concerns repository tooling inherited from the template (css-tree parsing, `actions/github-script`, session-file permissions, action pinning, glob depth). The corrected form is therefore stronger than a hedge and narrower than the original universal: the repository records tooling decisions and no product decisions.

So a page written to #757's acceptance criteria must present its hypothesis, its success criteria and its rejected alternatives as **stated now, in retrospect, by the author**. They are a defensible reconstruction; they are not a pre-registration; and the difference matters on this page for the same reason the demo does—a criterion reconstructed after the fact, which the evidence happens to meet, is not a criterion the experiment was run against. §M1's rule points the other way here and is worth saying out loud: a spec written a month after the code is the tree describing itself, not a spec the tree was built to.

### G24—the prototype's own copy claims the personalization the page correctly denies

**Recorded as a cross-artifact contradiction rather than a page error, and it is quotable.** §G16 is right that the app has no personalization and right that `:53` says so. The *app* tells its user the opposite, in four places. `showEndScreen` picks a heading at random from `['Session Complete', 'Recommendations Refined', 'Your Taste Profile Updated']` (`app.js:1680`) and sets the subheading unconditionally to "Based on your swipes, we've refined your recommendations." (`:1682`); the onboarding subtitle promises "Swipe a few titles to personalize your recommendations" (`index.html:62`); and the post-swipe toast reads "Learning your taste…" (`index.html:55`, default at `app.js:1655`). Nothing is refined, updated, personalized or learned. The only thing a swipe changes is that the title's ID enters `swipewatch_shown_content` and stops being dealt (§G15, §G16).

Worth a row for two reasons. It is checkable and quotable, so a rewrite that wants to show the distance between a prototype's surface and its mechanism has the material sitting in the repository rather than having to assert it. And it is the trap this page sits one click away from: `:53`'s "no real personalization yet" is a claim about the code, and a reader who follows `liveUrl` to `https://swipewatch.web.app`—byte-identical to `7909892` when fetched 2026-08-27 (§GM2)—is told by the product itself that their taste profile was updated. Naming that gap is a stronger move than leaving a reader to find it.

### G25—the portfolio page's own audience, and the instrument that cannot attribute it

**SUPPORTED and re-derived here, with the standing caution that this is evidence about the page, not about the prototype.** On the window declared in §GM2—project 469428, UTC, 2026-06-14 → 2026-08-27, 74 days—`/projects/swipe-watch/` carries **18 `$pageview` events across 14 sessions from 13 distinct persons**, **17 `project_page_viewed`** (14 sessions, 12 persons), **2 `project_live_link_clicked`** and **1 `project_github_link_clicked`**. Those are **click events, not distinct persons**: no per-person count was run for the outbound clicks, and one person clicking twice produces the same two rows, so the most this supports is *two clicks* through to the running prototype. The published page states it as clicks for this reason (Codex P2, PR #836).

**The near-miss is the finding, and it is §BM2's `login_failed` lesson in a new place.** Grouping the outbound-click events by their own `project_slug` property does not return two for swipe-watch—it returns **zero**, because `project_slug` is null on every one of them. `project_live_link_clicked` has fired 13 times and `project_github_link_clicked` 9, and the property is null on all 22; only `$pathname` recovers the attribution. A rewrite that reached for the obvious property would have published "nobody has ever clicked through to it," which is false, and the instrument cannot distinguish that from the truth on its own. The same shape as the `bingo` double-count and the `login_failed` under-capture: an instrument that answers confidently in the wrong units.

What this cannot be used for: it is portfolio traffic, it begins fifteen weeks after the prototype shipped, and per §GM2 it is unfiltered, so the owner's own visits are inside these counts. It bounds the audience the page has reached. It says nothing whatever about how anyone used the app.

### G26—the card synopsis clamp and the flex sizing disagree, and on some cards text is silently lost

**NEW in this session, SUPPORTED, and measured against the live site rather than the checkout.** `styles.css` `.card-description` declares the intended behaviour—`display: -webkit-box`, `-webkit-line-clamp: 2`, `-webkit-box-orient: vertical`, `overflow: hidden`—and then adds `flex: 1`. The two do not agree. Measured on `https://swipewatch.web.app/` at 390×844 (Playwright/Chromium, `isMobile`): computed `-webkit-line-clamp` is `2`, computed `flex` is `1 1 0%`, and computed `display` is **`flow-root`**, not `-webkit-box`. The clamp still paints its ellipsis after the second line, but the box is no longer two lines tall—`flex: 1` sizes it against the rest of the card, so its height varies from **33px to 56px** across cards at a 16.64px line-height, i.e. **2.0 to 3.37 lines**.

**Two visible failures follow, and they point opposite ways.** Where the flex box is taller than the clamp, a third line renders *below* the ellipsis, so the ellipsis asserts a truncation that did not happen—captured in `public/images/projects/swipe-watch-card.png`, where "Shifting Gears" reads "…move into his… garage-turned-home." Where the flex box is shorter than the content, the synopsis is cut with no ellipsis and no affordance at all: sampling **40 cards** across four sessions at 390px, **3 had `scrollHeight > clientHeight`** and lost text outright (JFK Jr./Carolyn Bessette at 33px<50px, the true-crime title at 56px<67px, the Bertie Gregory title at 33px<50px). **0 of the 40 descriptions contain an ellipsis in the source data** (`app.js`)—and, extended after Codex objected to generalising from the sample (P2, PR #836), **0 of all 106 descriptions do either**, so the explanation is exhaustive rather than inferred, so every ellipsis on screen is the clamp's, never the catalog's—`app.js:288` reads "…move into his garage-turned-home." with no ellipsis.

What this licenses and what it does not: it supports a page claim that mobile card rendering carries a live, reproducible, measurable defect, and it is the one piece of *interaction-quality* evidence in §G that was actually measured rather than asserted. It says nothing about whether any user noticed, was confused, or abandoned a session—there is no user data (§GM2). **Staleness warning.** This defect was confirmed live in production on 2026-08-27 (`styles.css` served from `swipewatch.web.app` still carries `-webkit-line-clamp: 2` and `flex: 1` on `.card-description`), and a fix has since been queued against the swipewatch repository. The page's wording is dated to the observation for that reason. **If the fix ships, the page paragraph and the three screenshots describe a state that no longer exists**—re-read this row and re-capture before touching either. Method note: this row exists only because #757's screenshot criterion was executed rather than waived. Capturing the prototype at a realistic mobile size surfaced a defect that reading the stylesheet alone did not, because the bug is in the *interaction* of two rules that each look correct.

### G27—the build predates the process, and the first pull request is the review policy

**SUPPORTED, verified here because the draft asserted it and no §G row carried it.** The initial commit is `2ca43ff`, 2026-02-24T10:00:42−0800. **None of the first thirteen commits carries a `(#N)` marker**—`git log --reverse --format='%s' | head -13 | grep -c '(#[0-9]'` returns 0—so the entire core build was pushed straight to the default branch with no pull request and no review. The repository's first pull request, `nathanjohnpayne/swipewatch#1` "Add code review policy and enforcement workflows," was created 2026-03-18T04:53:37Z and merged 2026-03-18T04:55:42Z: **21 days (21.5) after the initial commit**, and it is the review policy itself. The ordering is the finding—the prototype was built first and governed afterwards, and the first thing the process brought was the rule that the building had not followed. Note this is the same shape §F13 records for Override, one repo over and three weeks later, and the same shape §B-side note at `REVIEW_POLICY.md` calls "practice preceded written policy." Cite as `swipewatch#1` per §GM1, never bare.

### G28—a pre-coin production window existed, and it was live, instrumented, and never read

**NEW in this session, SUPPORTED, and it retires a categorical claim the draft had made.** The draft page said "every session ever recorded has coins in it." That does not follow, and the tree shows it is probably false. The initial commit `2ca43ff` (2026-02-24T10:00:42−0800) carries `firebase.json` **and `.firebase/hosting..cache`**, a file the Firebase CLI writes only when a hosting deploy has actually run—so the app was deployed at or before the initial commit. The same commit's `index.html` already carries the GA4 snippet (`git show 2ca43ff:index.html | grep -c G-0SFL3RGC0H` returns 2). The coin system lands three days and ten hours later (`4cb6671` 2026-02-27T19:59, `4453e74` 20:18, §G8), and the deploy cache's own next modification is `4453e74` itself, then `ce68d16` on 03-03, then `fbc50d4` on 03-11 "Ignore Firebase deploy cache."

**So the before-period is not absent; it is unexamined.** For roughly 3 days 10 hours the prototype was live in production with analytics running and no coin economy—which is precisely the baseline a retention claim needs. What is missing is not the window but the read: the GA4 property has never been queried (§GM2), so whether anyone used the app during it is unknown. The distinction matters and the page now makes it: "the comparison was never available to be run" is wrong, and "the one window that could have grounded it was live, instrumented, and never looked at" is right. Found via Codex P2 on PR #836, which challenged the categorical wording; the deploy-cache evidence is this session's, and it turns a hedge into a finding. What this does **not** license: any statement about traffic, sessions, or usage in that window—only that the window existed.

---

## §H Cross-page inconsistencies

### H1—the Override primacy claim, and the two pages that echo it

> `override.md:50`; `device-source-of-truth.md:57`; `friends-and-family-billing.md:47`

**WRONG in three places, and fixing one without the others leaves the site self-contradicting.** §F6–§F12 disproves the origin claim on the Override page. Both consumer pages then repeat it as a subordinate clause—"first developed for [Override]"—which is where a reader who never opens the Override page will still meet it. The correction has to land on all three, and the replacement fact (§F13, Override's March 17 review policy) belongs only on the Override page; the two consumer pages should simply say the pipeline is the shared Mergepath one. Sharpest version of the defect: on `friends-and-family-billing.md:47` the sentence credits Override for something FFB received **eight seconds earlier** than Override did.

### H2—the two-strike rule cited to a file that does not contain it

> `device-source-of-truth.md:57` links `…/device-source-of-truth/blob/main/REVIEW_POLICY.md` and attributes "the two-strike rule on bug fixes" to it

**WRONG citation, and the same file is linked from two other pages for adjacent claims.** `git show origin/main:REVIEW_POLICY.md | grep -ni strike` returns nothing in DST or FFB; the rule is in `docs/agents/operating-rules.md:352` in both, and in mergepath's `REVIEW_POLICY.md` it appears once. So the citation is correct for exactly one repo and wrong for the two pages that use it. Corrected value: link `docs/agents/operating-rules.md`, or scope the sentence to what `REVIEW_POLICY.md` does contain.

### H3—CodeRabbit's arrival, described three ways

> `override.md:50` "added CodeRabbit with custom financial modeling review guidance"; `device-source-of-truth.md:57` "CodeRabbit with domain-specific guidance"; `mergepath.md:40` "with CodeRabbit wired in as an advisory second-opinion pass on every PR"

**Internally inconsistent on who adopted it first, and one universal fails.** The DST and mergepath framings are compatible with the record; the Override framing implies adoption Override was in fact **last** to complete, by three days (§F6–F12). Separately, mergepath's "on every PR" is contradicted by the stacked-PR skip and by the rate-limiting the sibling blog documents (§E8). The three sentences should agree that CodeRabbit is a fleet-wide advisory pass, that its per-repo guidance is domain-specific, and that Override's contribution is the financial guidance rather than the adoption.

### H4—"~27 fail-closed CI checks", stated twice on one page

> `mergepath.md:42` "Roughly 27 fail-closed CI checks in `scripts/ci/`"; `mergepath.md:66` "**~27 fail-closed CI checks** enforced on every push and PR"

**The same wrong number in a prose bullet and in the numbers list.** Both were correct on 2026-05-13 and both are now off by a factor of 2.6 (71 on disk, 70 wired, 85 invocations—§E10). A page that states a figure twice will drift twice; note for Phase 2 that the numbers list at `:63-70` and the feature bullets at `:36-43` overlap on this figure and on nothing else.

### H5—"80-title pool", stated three times on one page

> `swipe-watch.md:34`, `:43`, `:53`

**The same wrong number in the feature list, the build narrative, and the closing argument (§G1).** The `:43` instance is the load-bearing one because it also carries the inverted growth sequence (§G4); `:34` and `:53` are bare restatements. The repo's own `POSTER_GUIDE.md:230`, `README.md:280` and `docs/agents/operating-rules.md:6` carry the identical stale figure, so the page is faithfully reproducing a source that is itself out of date—worth a separate upstream fix.

### H6—twenty hours, on the page and in the blog it links

> `friends-and-family-billing.md:45` "Six PRs shipped across roughly twenty hours"; `:55` "a twenty-hour debugging arc"; `six-prs-one-bug-agent-failure-modes.md:73` "twenty-two hours and six minutes—'roughly twenty hours' was a fair round number and exactly wrong about the order"

**The project page carries a figure its own linked blog post has already corrected.** The two are not equally wrong. `:45` is scoped to the six PRs and 20 h 02 m is exactly right for that span (§C10). `:55` is scoped to the whole arc, which ends with the fix at 22 h 06 m, and is the one that contradicts the blog. Both the page and the blog are linked from each other, so a reader moving between them meets two numbers for what reads like one quantity. Corrected value: leave `:45` alone or make its scope explicit; change `:55` to twenty-two hours.

### H7—the commit-count claims are all frozen at one date

> `override.md:44` "about 75 commits"; `device-source-of-truth.md:41` "well past two hundred commits"; `friends-and-family-billing.md:41` "well over four hundred commits"; `swipe-watch.md:34` "80-title pool"

**A systemic staleness pattern, not four independent errors.** All four were authored in a single commit—`300a433`, 2026-04-13, "feat(projects): expand narratives, rebuild metadata strip, add stack line (#159)"—and all four are counts of a number that has kept moving since. Measured on that date and today:

| Page | Claim | On 2026-04-13 | Today | Verdict |
|---|---|---|---|---|
| override | about 75 commits | **76** | 171 | WRONG now, right then |
| device-source-of-truth | well past two hundred | **228** | 332 | SUPPORTED, now understated |
| friends-and-family-billing | well over four hundred | **432** | 581 | SUPPORTED, now understated |
| swipe-watch | 80-title pool | **106** | 106 | **WRONG then and now** |

Reproduce with `git rev-list --count "$(git rev-list -1 --before=2026-04-14 origin/main)"` in each repo. The Swipe Watch row is the outlier and the most damaging: the pool passed 80 on 2026-04-10, three days before the sentence was written, so unlike the other three it was never accurate. The other three are the same defect at different stages of decay, and the fix is the same for all four—either restate them with a date, or phrase them so they age (an order of magnitude, or a floor the number will not fall below).

### H8—"nine-night" against "ten days of live play"

> `five-across.md:35` "a nine-night Mediterranean cruise"; `:56` "stress-tested by ten days of live play"

**SUPPORTED—not a defect, recorded so it is not "corrected" into one.** Ten calendar days span nine nights; both numbers come from the same ten-entry `DAYS` array (§B22), and both tutorial days carry live cards. Leave both as written.

### H9—the fleet described from two sides

> `mergepath.md:70` "**10 repositories** in the Mergepath fleet—the hub plus nine consumers, including Override, Device Source of Truth, Friends & Family Billing, Swipe Watch, and this site"; the four consumer pages each describe the pipeline as theirs

**Consistent, and worth stating as verified.** All nine consumers in `.mergepath-sync.yml` check out, all five named repos are among them, and every consumer page that claims the pipeline genuinely runs it. The only cross-page defect in this cluster is the *attribution* (§H1), not the membership.

### H10—every cross-link resolves

> The `related:` blocks and inline links across all seven pages

**SUPPORTED.** Three blog slugs cited (`six-prs-one-bug-agent-failure-modes`, `agent-approval-workflow-genesis-of-mergepath`, `perfect-score-wrong-axis`) and five project slugs cited (`swipe-watch`, `mergepath`, `override`, `friends-and-family-billing`, `device-source-of-truth`) all exist in `src/content/`. The only `#NNN` tokens anywhere in the seven pages are FFB **#144** and **#161**, both at `friends-and-family-billing.md:45`, both already in `refs.json`, and both re-read for what they did rather than that they exist (§C9, §C11).

---

## Summary

| Page | SUPPORTED | WRONG | UNPROVABLE | SPLIT | EXT. SOURCED | Rows |
|---|---|---|---|---|---|---|
| §A `device-source-of-truth` | 15 | 5 | 2 | 2 | 0 | 24 |
| §B `five-across` | 17 | 4 | 0 | 12 | 3 | 36 |
| §C `friends-and-family-billing` | 10 | 7 | 1 | 4 | 0 | 22 |
| §D `matchline` | 7 | 0 | 3 | 2 | 0 | 12 |
| §E `mergepath` | 14 | 8 | 0 | 5 | 0 | 27 |
| §F `override` | 6 | 7 | 0 | 1 | 0 | 14 |
| §G `swipe-watch` | 10 | 6 | 1 | 1 | 0 | 18 |
| §H cross-page | 3 | 5 | 0 | 2 | 0 | 10 |
| **Total** | **82** | **42** | **7** | **29** | **3** | **163** |

A **SPLIT** row is counted once, in its own column, not split across the other three; the row text names which half carries which verdict. WRONG rows count each restated instance separately, because each is a separate edit: §E10 and §E11 are one number stated twice, §G1–G3 are one number stated three times, and §H1–H2 re-count the Override and two-strike defects at the cross-page level where the fix has to be coordinated across files. Deduplicated to distinct underlying facts, the WRONG count is 36.

**The §B row was itself miscounted before this pass, and the totals inherited it.** It read 13/5/0/6 against a section whose rows actually resolved 14 SUPPORTED, 4 WRONG, 1 UNPROVABLE, 5 SPLIT—one SUPPORTED filed as WRONG and §B15's UNPROVABLE filed as SPLIT, an error that preserved the row total of 24 and so survived arithmetic checking. It is corrected above alongside the twelve new rows; the pre-run totals should have read 79/42/8/22. The other seven section rows were **not** re-verified against their sections in this pass, and given that this one was wrong, they should not be treated as audited. Dedup drops from 37 to 36 because §B15 was among the WRONG instances counted and is now SUPPORTED.

Row-count reconciliation, since some headings cover more than one row: §E10/E11, §E13/E14 and §G1/G2/G3 each carry their IDs in one heading, and §F6–F12 carries seven under a single heading because the seven attributions share one paragraph and one correction.

### The eight rows that most need Phase 2

1. **§G1/G4**—80 is 106, and the growth sequence runs backwards. Three instances plus stale repo docs.
2. **§F6–F12**—six of seven primacy attributions on the Override page are inverted; §F13 supplies the true replacement fact.
3. **§E10/E11**—27 CI checks is 71, stated twice.
4. ~~**§B15**—"16 bingos across 124 squares" is wireframe fixture data for an invented player, committed four days before the cruise sailed.~~ **Superseded 2026-08-27.** §B15 is SUPPORTED, the line was committed on disembarkation morning, and the page keeps the figures. Its replacement on this list was **§B34 with §B26**, and **both are now settled** (2026-08-27, owner decisions recorded in their rows). §B34: the freeze was moved forward during the sailing, so 23:00 is an operating decision rather than the designed instant, and the page carries it as a decision record with the derived 08:00 as its rejected alternative. §B26: the eleven-versus-ten contradiction is unresolved and stays unresolved, printed on the page as a disagreement between two records rather than reconciled. **Neither is a blocker; do not send a later pass back through them.**
5. **§C4/C5/C7**—six phases is five, the list omits Phase 3, and Phase 4's cutover was reverted within four days.
6. **§B4**—the last-call beat fires on a port day in Marseille; the itinerary has one sea day and it is six days earlier.
7. **§A2/A3**—350 questions across 15 sections is 100–150 across 16.
8. **§E25**—the seven review rounds are the rounds that *found* the seventeen bugs, downstream, not rounds they survived on the template.

---

## Verdict corrections from the review of this ledger

Codex reviewed this file and found **twelve** defects. They share one shape, and it is the shape this ledger exists to catch: **a SUPPORTED verdict on a claim the evidence only partly carries.** The auditor committed the overclaim it was auditing for.

Seven verdicts are downgraded above, each at its own row rather than only here:

| § | was | now | because |
|---|---|---|---|
| A16 tenure | SUPPORTED | SPLIT / UNPROVABLE | the commit record dates the work, not the tenure |
| D8 pause | SPLIT | SPLIT + UNPROVABLE cause | July 6 before July 7 is proximity, not causation |
| E-identities | SUPPORTED | SPLIT | "no agent approves its own code" fails at the agent level it claims |
| E-docs | SUPPORTED | SPLIT | files existing does not establish that agents read them |
| E-playground | SUPPORTED | SPLIT | "every knob" is falsified by this row's own evidence |
| E-PR count | SUPPORTED | SPLIT | 447 merged does not prove each ran the governance loop |
| G-duplicate | SUPPORTED | SPLIT | CodeRabbit caught it, so detection was not manual |

**One row was wrong in the ledger's favour and is retracted.** The `policy-sim.sh` row marked the page WRONG for omitting a second live-data path. The page never claimed `policy-sim.sh` was the *only* such path—that word was this ledger's. The page was right and the row was not.

**One figure was wrong in a summary table while the reconstruction beneath it was correct.** §G4 derives the Swipe Watch pool as 80, then +27 to 107, less one duplicate the same day, for a standing **106**. The summary table carried 107 for 2026-04-13, three days after the removal. The substantive finding survives untouched: 80 was never accurate at authoring time, unlike the other three counts, which were each correct the day they were written.

**Three internal pointers had drifted.** The frozen-count analysis is §H7 and was cited as §H10; the two-strike defect is §H2 and was cited as §H7 twice. A reader following them landed on the wrong analysis.

**And the header undercounted its own cache**: `refs.json` holds 70 entries, not 67—the three added during the #742 audit.


### Second review round

A second Codex pass over the corrected file found **twelve** more defects. Five were introduced by the first round of corrections, and they share a shape worth naming, because it is subtler than the one above: **the corrected value inherited the defect from the claim it was correcting.** A verdict would downgrade a claim correctly, and then the "defensible weaker form" beneath it would restate the downgraded claim in gentler words—a causal attribution the row had just called unprovable, a qualifier applied to two settings out of three, a coverage adjective swapped for a roster-sizing one. Fixing the verdict and leaving the replacement unfixed is not a fix; the replacement is the part Phase 2 actually copies.

| § | defect in the correction | now |
|---|---|---|
| B-easy-mix | corrected value kept a cruise-wide no-repeat guarantee the same paragraph disproves | scoped to before the exhaustion reset |
| D8 pause | "when Five Across took the rest of the summer" restated the causal claim the row downgraded | stated as sequence only |
| E-security | "documented" qualified two settings; Dependabot alerts kept the bare assertion | qualifier covers all three |
| B8 one-tap | downgraded to SPLIT against a page that only ever called *the pledge* one tap | restored to SUPPORTED |
| B-roster | "sized for coverage across time zones" substituted one staffing claim for another | coverage qualifier dropped |

B8 is the instructive one. The page says "a one-tap 'Cross My Heart' pledge"; the spec's "two taps" counts the square plus the pledge. Both are true, and the row manufactured a conflict by reading "one-tap" as modifying the claim flow. Had it stood, Phase 2 would have been sent to rewrite an accurate sentence—an auditor's false positive costs a correct line, which is the same damage as a missed error pointed the other way.

Six further rows were downgraded for overclaiming, each at its own row: the nine-spec count now agrees with its own inventory (three outside the arc, not two); ~~the champion's 16/124 is UNPROVABLE rather than WRONG, since fixture provenance shows the repo does not substantiate the figures but does not contradict them~~ *(superseded—see the third pass below; the "fixture provenance" was a misdated line and §B15 is now SUPPORTED)*; matchline's "the running product is not [running]" is UNPROVABLE, since a null `homepage` proves only that nothing is advertised; the 17 template bugs are UNPROVABLE as an exact count, since the two cited artifacts carry one headline from one origin and the only itemisation totals 22; "shipped mid-cruise" is narrowed to development continuing, since a commit landing on `main` is not a deploy; and the household of eight is autobiography, not a fact the README's illustrative arithmetic establishes.

**One finding is recorded and not actioned.** §E-extraction is marked SUPPORTED on the strength of a NaN guard in a unit-review UI, which establishes only that a confidence value renders—not that every Unit carries skills, tools, domains and metrics, that Units are user-owned rather than résumé-derived, or that approval precedes graph insertion. Settling it means tracing the Unit schema and the graph-write path in the matchline repo. Treat that row as unverified until someone does.

**On the state of this file.** Two review rounds found twelve defects each, and the second round's were partly created by the first. That is the honest character of the document: a working audit record whose verdicts carry real evidence but varying confidence, not a reference to cite without checking the row's own sources. The seven page revisions it informed were each verified separately against the repos at the time they were made.

### Third pass—2026-08-27, the #820 delta audit

A third pass, run for PR 2 of epic #759, did two things and found a third.

**It corrected §B15 from UNPROVABLE to SUPPORTED,** on a method error rather than new evidence. The row dated a *file* to argue about a *line*, and the two were thirteen days apart—the file added four days before embarkation, the line added on disembarkation morning. §M5 is now the standing rule. §M5.1 records the part that matters more: **§B23 of this same section already cited the correct commit and the correct date for the same share card, two rows below the row asserting the opposite.** The file contained its own disproof and three passes read past it. That is #798's *audit the ledger's own prose against the ledger's own evidence* recurring in a sharper form, since the contradicting evidence here was not in a summary but in a numbered row of the same section.

**It added §B25–§B36 and the §BM1/§BM2 method notes,** covering the engagement paragraph PR #820 introduced. Epic invariant 3 forbids the page stating a number this ledger does not carry, and none of those fourteen figures had a row. The PostHog half was re-derived in this session against project 503790 and is SUPPORTED with the queries stated; the Firestore half is unreachable from this tooling and is **EXTERNALLY SOURCED** under the new §M6 verdict, which exists precisely so that "I could not reach the source" stops being written down as "the claim does not hold."

**And it found two figures that need settling before the rewrite reuses them.** §B26: eleven players bingoing on the embark card cannot be squared with ten players holding a bingo event-wide, and both are #820's own Firestore figures. §B34: the "23:00 freeze" is nine hours from the Standings Freeze this repository derives for `med-2026`. Neither is a refutation—both sources are production state this session cannot read—but both are arithmetic a reader can do, and the page currently prints one side of each.
