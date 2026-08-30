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

**M7—a reproduction command is run by strangers, so it must not write to a path it did not create.** Three separate P1 findings on PR #848 were all this one defect in the ledger's own commands, escalating each time a fix was too clever. The first ran an unconditional `rm -rf ~/GitHub/audit-probe-repo` to clean up after a bootstrap dry run, which would delete a reviewer's checkout of that name. The second replaced it with a guard that deleted the directory when it held nothing but `.bootstrap-*` files—which is exactly what an *interrupted* run leaves behind, so the guard destroyed the state it existed to protect. The third found that every extraction block wrote into a fixed `/tmp/mp` and then ran `git init` and a commit inside it, so a `/tmp/mp` belonging to another task would be extracted over and committed. `mkdir -p` does not establish that this run created the directory. **The rule: allocate with `mktemp -d` and carry the path in a variable; never delete anything the reader might own.** Every extraction block in this file now opens `MP="$(mktemp -d)"`, later blocks continue with `cd "$MP"`, and the one cleanup step prints its path and removes nothing. The general form is that a guard deciding *when* destruction is safe is a harder problem than not destroying anything, and the ledger has no reason to solve the harder one.

**M8—every reproduction block assumes a sibling clone, and says which one.** The blocks in this ledger open `cd ~/GitHub/<repo>` for four different repositories—`device-source-of-truth`, `friends-and-family-billing`, `mergepath` and `nathanpaynedotcom`—because most rows audit a repository *other* than the one the ledger lives in. Substitute your own checkout path; the `cd` names the target, and that is the load-bearing part. **Do not "fix" these to `git rev-parse --show-toplevel`.** That resolves to whatever checkout the reader is standing in, which for anyone reading this file is `nathanpaynedotcom`, so the command would silently search the wrong repository and return a clean no-match—the §A27 failure mode wearing different clothes. Suggested on `#873` and declined for that reason. Note also that `device-source-of-truth` and `friends-and-family-billing` are private (§A25), so re-running a §A block at all requires access, not just a path.

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

### Delta audit for #755—rows added 2026-08-29

Twenty-four rows (§A25–§A48) covering the claims the #755 restructure needs and §A1–§A24 do not reach: who the product actually models, the five ingestion paths and the one shape they share, the AI trust boundary tested as five separate claims, what freshness means and what acts on it, the evidence behind each candidate decision record, the outcome record, and the surviving frontmatter and cross-surface vocabulary. Everything in the product repository was read at **`c9f66f07a243491eef3295ac8ed32e4fe97610d5`** in `~/GitHub/device-source-of-truth` (short `c9f66f0`, 2026-08-28 12:50:41 −0700, subject "bulk sync to mergepath@3d96105", the routine propagation commit), which is that repository's `origin/main` at the time of this audit; the local checkout's `HEAD` was two commits *behind* it, so every command below reads the object database at the literal SHA rather than the working tree. The site repository was read at **`d3105842170cc22ad89abcb040861af625435936`**. **Every command in these rows carries one of those two literal SHAs rather than `origin/main` or `HEAD`**, per the #820 finding that a moving ref makes a row unreproducible. Four evidence sources sit outside that header and are labelled where they appear: **live GitHub API reads** (§A25), carrying an as-of UTC timestamp in the row; **two anonymous HTTP GETs**, one of the published `githubUrl` and one of the deployed product's root URL (§A25), which read public endpoints and no data; **the résumé vault** at `~/GitHub/docs/job-search/` (§A28, §A44), which is not a git-pinned surface in this audit; and **commits outside the pin's first-parent product history** cited by SHA in §A41, all of them ancestors of the pin.

Read §A25 and §A28 first. §A25 is the row that reshapes the restructure: the repository the page links as "View on GitHub" is **private**, so that CTA returns 404 for every reader, and the deployed product behind "View Live Product" serves a shell and then a domain-restricted login wall—both of the page's evidence CTAs are dead ends, and AC 8's confidentiality requirement turns out to rest on that privacy rather than on the scrub. §A28 is the one that needs a human: the page, the résumé and the repository's own README give a reader three different provenance stories for the same artifact, and one of them is contradicted by the record. Six rows **correct a claim a current surface states**: §A31 corrects the supporting sentence inside §A1 (the verdict stands, the sentence does not); §A40 corrects the page's `332`/`178` commit arithmetic; §A41 corrects the page's "plus one substantive change"; §A35 narrows the page's "mandatory cost disclosure"; §A42 corrects the page's `ADK` vocabulary against what the deployed demo renders; and §A28 corrects the résumé line mirrored on two surfaces. Seven rows **change what the page can claim** and should be read before any decision-record card is drafted: §A29 (the ticket's four personas are not modelled), §A30 (a shipped page states figures no data produced), §A33 and §A34 (what "actionable exception" concretely covers, and what is dead), §A36 (confidence gates one subsystem and decorates the other), §A45 (the validation boundary), and §A48 (the decision-record adjudication). §A27 is a method finding that invalidated two of this audit's own sweeps before it was caught, and it is written down so the next session does not repeat it. The remaining rows are new SUPPORTED material, most of which has never appeared on any surface.

### A25—the repository is private, and both page CTAs are dead ends for a reader

> ":11 githubUrl: \"https://github.com/nathanjohnpayne/device-source-of-truth\"" and ":10 liveUrl: \"https://device-source-of-truth.web.app\""

**WRONG as a reader-facing claim on `githubUrl`; SUPPORTED-but-misleading on `liveUrl`.** The evidence repository is **private**. As of **2026-08-29T19:44:23Z** the API returns `{"archived":false,"default_branch":"main","private":true,"visibility":"private"}`, and as of **2026-08-29T19:44:46Z** an anonymous GET of the published `githubUrl` returns **HTTP 404**, as does every deep link into it—`specs/DST-047-questionnaire-intake-ai-extraction.md` and `REVIEW_POLICY.md` both 404. The template renders "View on GitHub" as a primary CTA on a portfolio page whose audience is hiring managers; for every one of them it resolves to GitHub's 404 page.

```bash
eval "$(/opt/homebrew/bin/brew shellenv)" && \
  GH_TOKEN="$OP_PREFLIGHT_REVIEWER_PAT" gh api repos/nathanjohnpayne/device-source-of-truth \
  --jq '{visibility, private, archived}'
curl -s -o /dev/null -w '%{http_code}\n' https://github.com/nathanjohnpayne/device-source-of-truth
curl -s -o /dev/null -w '%{http_code}\n' https://device-source-of-truth.web.app
```

`liveUrl` returns **HTTP 200** and serves a 3,301-byte SPA shell whose `<meta name="description">` reads "Story Entertainment's system of record for partner device data—hardware specs, certifications, telemetry, and deployment intelligence." Past the shell the application is domain-restricted: `functions/src/middleware/auth.ts:23` sets `const ALLOWED_DOMAINS = ['@disney.com', '@disneystreaming.com', '@nathanpayne.com'];`, with a matching client-side guard in `src/hooks/useAuth.tsx`, and the comment at `:22` records why the third entry exists—"synthetic-data demo instance remains reachable now that the Disney tenure has ended." A reader can reach the login screen and no further.

Two consequences bind the restructure. **AC 9's screenshots stop being decoration and become the only evidence a reader can actually see**, because neither CTA lets them verify anything themselves. And **AC 8's confidentiality is currently held by the repository's privacy setting, not by the synthetic scrub**—see §A26. The page may say the deployed instance is a synthetic-data demo behind a restricted login; it may not present either CTA as something the reader can open, and it should not deep-link `specs/` paths that 404.

### A26—real partner identities survive in `specs/`, and the scrub never claimed to reach them

**SUPPORTED, and the boundary is exactly where the scrub commit says it is—not one line further.** `6e002a7` (2026-08-20, "feat(demo): replace real partner data with a synthetic dataset (#165)") enumerates its own scope in its body, and the scope is three things: the **deployed data** ("Wiped every Firestore collection (11,098 documents) and all 12 Storage objects, then seeded 1,150 synthetic documents"), the **shipped source** ("Real partner names removed from shipped code"—`functions/src/routes/partnerAliases.ts`, `functions/src/services/seedFieldOptions.ts`, `src/pages/TelemetryUploadPage.tsx`, `src/pages/PartnerDetailPage.tsx`), and `mappings/` (the real CSV exports and four real questionnaire workbooks, deleted). **`specs/` is not in that list, and the specs still name real partners.**

At the pin, `specs/DST-038-partner-key-registry.md:150-157` is a table mapping **seven named commercial operators** to their real partner-key inventories, and `DST-046` repeats the same set while `DST-047` names real device codenames and real uploaded questionnaire filenames. One live operator-named literal also survives in shipped code at `functions/src/services/questionnaireParser.ts:127`. **The operator names, partner keys, codenames and filenames are deliberately not reproduced in this ledger**, which lives in a public repository while their source repository is private (§A25); anyone with access can read them at the cited paths. Counting them needs no names: see the command below.

```bash
S=c9f66f07a243491eef3295ac8ed32e4fe97610d5; cd ~/GitHub/device-source-of-truth
git show --stat --format='%h %ad %s' --date=iso 6e002a7 | head -5
# Read the operator table directly rather than grepping for the names, so the
# pattern itself does not carry them. Needs repo access; §A25.
git show "${S}:specs/DST-038-partner-key-registry.md" | sed -n '150,157p'
git grep -nIiE 'disney|hulu|espn' "$S" -- README.md CONTRIBUTING.md docs specs
```

None of this is publicly exposed today, because of §A25. That is the whole of the protection, and it is one settings toggle deep. **The page may say the deployed instance runs entirely on synthetic data—§A17 established that and it holds. The page may not say the repository contains no real partner data, must not quote or paraphrase any spec content that names a partner, an operator, a device codename or a questionnaire filename, and must not add a deep link into `specs/`.** The synthetic replacements are safe to describe and to screenshot: `scripts/synthetic/dataset.mjs:32-46` defines fourteen invented operators (`Northwind Cable`, `Brightloom Telecom`, `Solstice Media Group`, `Quillon TVs` and so on), `:52-55` invented silicon vendors and OEMs, and `:54` the fictional group's own kit name.

### A27—method: `\b` in `git grep -E` is platform-dependent, and where it fails it fails silently

**A method finding, recorded because it invalidated two sweeps in this audit before it was caught.** On the machine this audit ran on—macOS, Apple Git 2.50.1—`git grep -nIiE '\bOperator\b'` against the pin returns **zero hits** for a token that demonstrably occurs; dropping the `\b` returns the files. (The real sweep used operator names, withheld here per §A26; what varies is the regex implementation, not the token.) `\b` is undefined in POSIX ERE, so an implementation is free to match nothing, and BSD's does; the command then exits non-zero exactly as a genuine no-match does, with no warning and no distinguishable signal.

**This is platform-dependent, and the first version of this row said otherwise.** It generalized one machine's behaviour into a property of `git grep -E`, which is the same over-wide-claim defect this audit exists to catch—caught by Codex on `#873`, reporting that the identical pattern on Linux with Git 2.43.0 returns four matches, glibc having long supported `\b` as a GNU extension. So a zero-hit result here is evidence of nothing until you know which regex implementation ran it. **Use `-w`, which is documented, portable, and needs no escape**; `-P` also works where Git was built with PCRE. Both were verified to return the same counts as the bare-token sweep on this machine.

```bash
S=c9f66f07a243491eef3295ac8ed32e4fe97610d5; cd ~/GitHub/device-source-of-truth
# Substitute any token you know occurs; the point is the matcher, not the word.
git grep -cIiE '\bTOKEN\b' "$S" -- specs   # BSD ERE: zero hits, exit 1. glibc: matches.
git grep -cIiwE 'TOKEN'    "$S" -- specs   # -w is portable, and is what a sweep should use
git grep -cIiE  'TOKEN'    "$S" -- specs   # unanchored, for comparison
```

The first confidentiality sweep in this audit used `\b(disney|hulu|espn)\b` and returned nothing, which read as a clean result and was very nearly written up as one. The correct reading was that the matcher was broken. This is §M2 ("count with the loosest correct matcher, then narrow") arriving through a different door: the matcher was not merely too narrow, it was inert. **Never use `\b` in a `git grep` pattern. Anchor with an explicit character class, use `-w`, or pipe through GNU `grep -P`, and always run a positive control against a token known to be present before trusting a zero-hit sweep.**

### A28—the page, the résumé and the repository give three different provenance stories

**SPLIT, and the reconciliation is a judgment about employment facts this audit cannot make. What it can establish is that the three surfaces disagree and that one of them is contradicted by the record.**

The **project page** frames DST as Disney work: `:65` "This is the partner-engineering work I spent a decade doing at Disney" and `:59` "Development ended with my Disney tenure." The **résumé**, verbatim-identical on both of its surfaces, frames it as something else: "A standalone web application for partner-device intelligence… **An independent build, distinct from the internal production system referenced in my Disney experience**" (`~/GitHub/docs/job-search/nathan-payne-resume.md:103` and `src/content/resume/projects/device-source-of-truth.md`, the two matching byte-for-byte). A third framing appears in one tailored variant: `~/GitHub/docs/job-search/nba/nathan-payne-resume-nba.md:65` calls it a "**personal reimplementation of the Disney partner-device data system**," which is neither of the other two.

The repository record contradicts the résumé's version directly. `README.md:3` opens "**Internal Disney Streaming platform** that consolidates NCP/ADK partner device data"; `CONTRIBUTING.md:5` reads "Device Source of Truth (DST) is an **internal Disney Streaming tool that manages real partner device data used across engineering teams**"; `docs/agents/repository-overview.md:4` repeats it; authentication was restricted to `@disney.com` and `@disneystreaming.com` until the 2026-08-20 scrub added a third domain; and the scrub commit's own body states that "The deployed instance held **real Disney partner device data**—partner records, device inventory, telemetry, and 12 uploaded partner questionnaires." An independent build distinct from the internal production system does not hold that system's real data behind that employer's SSO domain.

```bash
S=c9f66f07a243491eef3295ac8ed32e4fe97610d5; cd ~/GitHub/device-source-of-truth
git show "${S}:README.md" | sed -n '3p'
git show "${S}:CONTRIBUTING.md" | sed -n '5p'
git log -1 --format=%B 6e002a7 | sed -n '4,10p'
diff <(sed -n '103p' ~/GitHub/docs/job-search/nathan-payne-resume.md) \
     <(git show d3105842170cc22ad89abcb040861af625435936:src/content/resume/projects/device-source-of-truth.md | tail -1)
```

**This is the highest-stakes open question on the page and it needs the human, not a drafting agent.** Per §M4 the record shows text and timestamps, never intent, so this row does not guess why the résumé sentence was written—a deliberate confidentiality or IP hedge is an entirely plausible reason and would not make the sentence accurate. What the restructure cannot do is leave the two live: a reader arriving from the résumé is told DST is an independent build, and the page then tells them it is the decade of work at Disney. **Until that is settled, the page may not assert either provenance more strongly than it does today, and whichever wording is chosen must be applied to the page, `src/content/resume/projects/device-source-of-truth.md`, the canonical résumé, and the NBA variant in the same change.**

### A29—the four personas the ticket names are not modelled; the product has three roles

> Issue #755: "partner engineering, certification, support, and platform teams answer high-consequence questions"

**WRONG as a statement about the artifact; defensible only as a statement about the domain.** The product models **three permission roles and no teams**: `functions/src/types/index.ts:88` and `src/lib/types.ts:82` both declare `export type UserRole = 'viewer' | 'editor' | 'admin';`, and `functions/src/routes/users.ts:8` pins the same three as `VALID_ROLES`. There is no team, department, persona or function attribute anywhere on the user record, no per-persona view, and no per-persona permission. Users enter only by Google OAuth auto-provisioning at `role: 'viewer'` (`functions/src/middleware/auth.ts:72`), and `specs/DST-054-user-role-management.md` is explicit that the story "does **not** deliver user invitation, user deletion, or manual user creation."

The role split is real but lopsided. Of the fifty `requireRole(...)` call sites across the API, **forty are `requireRole('admin')` alone and ten are `requireRole('editor', 'admin')`**; `viewer` gates nothing, because read routes carry no role guard at all beyond authentication.

```bash
S=c9f66f07a243491eef3295ac8ed32e4fe97610d5; cd ~/GitHub/device-source-of-truth
git grep -hoIE "requireRole\('[a-z]+'(, '[a-z]+')?\)" "$S" -- functions/src | sort | uniq -c
git grep -nI "export type UserRole" "$S" -- functions/src src
```

The ten `editor`-reachable routes are exactly the intake and authoring surface: create/update a device (`devices.ts:236`, `:297`), create/update a partner (`partners.ts:127`, `:167`), write a device spec (`deviceSpecs.ts:76`), upload a questionnaire and trigger or retry its extraction (`questionnaireIntake.ts:174`, `:617`, `:693`), run a tier simulation (`tiers.ts:213`), and bulk-import specs (`upload.ts:369`). **Everything that commits imported data to the registry is `admin`-only**, which is the finding §A37 turns into a decision record.

The only persona vocabulary anywhere in the shipped product is two strings on one page: `src/pages/ReadinessPage.tsx:88` "Certification team onboarded and trained" and `:98` "Tier definitions reviewed and approved by P&D PM"—and see §A30 for what that page is. Defensible weaker form for AC 1 and AC 2: name the roles the product enforces (a viewer who can read everything, an editor who can author device and partner records directly as well as stage imports, an admin who alone commits an import or deletes anything) and describe partner engineering, certification, support and platform teams as the *audience the questions come from*, never as modelled personas with distinct views.

### A30—a shipped admin page states figures that no data produced

**SUPPORTED, and it is a trap for the drafting agent.** `src/pages/ReadinessPage.tsx` renders a five-item launch-readiness checklist in which three of the five items carry **hardcoded string literals presented as measured values**: `:79` `value: '1,247 devices imported'`, `:86` `value: 'Last upload: 2 warnings'`, `:101` `value: '84% coverage (target: 80%)'`. Their `status` fields are literals too (`'pass'`, `'warn'`, `'pass'`); nothing is computed, no API is called, and the only dynamic items are the two `manual: true` toggles, which persist to `localStorage` (`:30-40`).

The page ships and is routed: `src/App.tsx:83` lazy-loads it, `:228-229` mounts it at `admin/readiness` behind `<AdminRoute>`, and `src/components/layout/AppShell.tsx:149` puts it in the navigation.

```bash
S=c9f66f07a243491eef3295ac8ed32e4fe97610d5; cd ~/GitHub/device-source-of-truth
git grep -nI "1,247 devices imported\|84% coverage\|Last upload: 2 warnings" "$S" -- src
git show "${S}:src/App.tsx" | sed -n '226,231p'
```

**`1,247` and `84%` must not appear on the page, in a `constraints` chip, or in a screenshot caption.** They are UI copy in a mock, not measurements—and `1,247` is precisely the kind of figure a drafting agent reaches for when AC 6 asks for coverage. AC 9 asks for screenshots demonstrating enterprise UX quality; `/admin/readiness` is the one screen in the product that must **not** be screenshotted, because its figures would be read as outcome evidence and there is none (§A45).

### A31—correcting §A1's supporting sentence: the repository does state a device count

> §A1: "No artifact in the repo states a device count."

**WRONG**—that supporting sentence, not §A1's verdict. **§A1's verdict of UNPROVABLE on "hundreds of partner devices" stands, and this row does not disturb it—only the reasoning underneath it.** Re-derived from scratch at the pin, three artifacts state device counts. `src/pages/ReadinessPage.tsx:79` states `1,247 devices imported` (a hardcoded literal, per §A30). `specs/DST-044-amendment-version-registry.md:25` mentions four ADK labels "across 45 devices in the AllModels inventory," which §A1 itself cites two sentences after asserting no artifact states a count. `specs/DST-038-partner-key-registry.md:233` states that the partner-key source file "parses all 47 rows," a partner-key count rather than a device count but the same class of figure. And `scripts/synthetic/dataset.mjs` defines the deployed dataset's own scale, which §A1 correctly bounds at 26–78.

```bash
S=c9f66f07a243491eef3295ac8ed32e4fe97610d5; cd ~/GitHub/device-source-of-truth
git grep -nIE '[0-9,]+ (devices|rows|partners)' "$S" -- specs src/pages scripts/synthetic | head
```

The corrected supporting sentence: *no artifact states the size of Disney's production device estate, and the counts the repository does carry are a hardcoded UI literal, a spec's incidental observation about one version label, and the synthetic dataset's own scale—none of which bounds the real fleet.* The practical rule for the restructure is unchanged and now better grounded: **the page may name the source systems and the device categories; it may not name a magnitude, and it may not reach for `1,247`, `45` or `47` to supply one.**

### A32—five ingestion paths, and the one shape all of them share

**SUPPORTED, and this is the workflow map AC 2 asks for.** §A22 established four *sources*; the artifact has five *paths*, and the extra one matters because it is where the two Datadog-derived feeds diverge. Mounted at `functions/src/index.ts:63-80`: **AllModels device inventory** via `POST /api/upload/migration` (`upload.ts:56`); **Airtable intake requests** via `POST /api/intake/preview` then `POST /api/intake/import` (`intake.ts:110`, `:351`); **Datadog partner-key mappings** via the `partnerKeys.ts` import routes; **Datadog telemetry** via the `telemetry.ts` preview/commit pair; and **partner Excel questionnaires** via `POST /api/questionnaire-intake` (`questionnaireIntake.ts:174`).

The shape they share is the story. **Every one of them is a two-step preview-then-commit, and every commit step is `requireRole('admin')`.** `intake.ts:110` and `:351` are both admin-only; `upload.ts:56` is admin-only; the telemetry commit is admin-only; and the questionnaire path stages to `questionnaireStagedDevices`/`questionnaireStagedFields` and commits only through `POST /:id/approve` (`questionnaireIntake.ts:1197`, admin-only, §A37). Nothing in the product's *interface* writes an imported record to the registry without a human looking at a preview of it first—and the qualifier is load-bearing. **Four of the five commits are coupled to their preview by the client, not the server.** `POST /api/intake/import` (`intake.ts:351`) reads `const { rows, fileName } = req.body`—client-supplied rows, admin role checked, no stored preview consulted—so an admin calling it directly is never made to preview anything. Only the questionnaire path enforces the coupling server-side, staging to `questionnaireStagedDevices`/`questionnaireStagedFields` and refusing approval until they are reviewed (§A37), which is precisely why §A37 and not this row is the page's strongest fact. **The page may say the interface enforces preview-then-commit; it may not say the system makes a direct commit impossible.** Caught by Codex on `#873`.

```bash
S=c9f66f07a243491eef3295ac8ed32e4fe97610d5; cd ~/GitHub/device-source-of-truth
git grep -nI "app.use('/api" "$S" -- functions/src/index.ts
for r in upload intake telemetry partnerKeys questionnaireIntake; do
  echo "-- $r"; git show "${S}:functions/src/routes/${r}.ts" | grep -nE "^router\.(post|put|patch)"
done
```

That single sentence—*five feeds, one gate*—does more work than the source-system list does, and no surface currently says it.

### A33—"actionable exception" means exactly three alert types, of which two are generated and two are resolvable

**SUPPORTED, with the counts.** `functions/src/types/index.ts:92` and `src/lib/types.ts:86` both declare `export type AlertType = 'unregistered_device' | 'new_partner_key' | 'inactive_key';`. Two of the three are generated, both by the telemetry upload path and nothing else: `functions/src/routes/telemetry.ts:415` writes `type: 'new_partner_key'` and `:447` writes `type: 'unregistered_device'`. Two of the three carry an in-page resolution control: `src/pages/AlertsPage.tsx:667` renders the Register Device path for `unregistered_device` and `:678` the Create Key path for `new_partner_key`.

What makes them *actionable* rather than merely clickable is that resolving one closes it. Creating the partner key auto-dismisses every matching open alert server-side: `functions/src/routes/partnerKeys.ts:598-619` queries `.where('type', '==', 'new_partner_key')`, dismisses the matches, and logs `Auto-dismissed new_partner_key alerts` with the affected ids; `AlertsPage.tsx:93` and `:291` carry the comment "Backend auto-dismissed matching new_partner_key alerts; update local state."

```bash
S=c9f66f07a243491eef3295ac8ed32e4fe97610d5; cd ~/GitHub/device-source-of-truth
git grep -nI "type: 'new_partner_key'\|type: 'unregistered_device'\|type: 'inactive_key'" "$S" -- functions src scripts
git show "${S}:functions/src/routes/partnerKeys.ts" | sed -n '596,620p'
```

Concrete form the page can use: an exception is a telemetry row the registry cannot explain—a device id with no device record, or a partner key not in the registry—surfaced as a work item with the control that creates the missing record. **The automatic close is `new_partner_key` only**—`partnerKeys.ts:598-619` is the sole auto-dismiss path in the codebase; `devices.ts` never touches the `alerts` collection, so registering a device leaves its alert open for the manual dismiss route at `alerts.ts:68`. An earlier version of this sentence generalized the partner-key behaviour to both types and the page inherited it; caught by Codex on `#873`. **The page may not describe exceptions as spanning the whole import surface**: the questionnaire, Airtable and AllModels paths raise no alerts at all, they surface their exceptions inline in their own import previews (§A32, §A39).

### A34—`inactive_key` is a declared alert type that no audited code path creates

**SUPPORTED as a statement about the pinned tree.** `inactive_key` is the third member of the `AlertType` union, is labelled "Inactive Key" at `src/pages/AlertsPage.tsx:22`, is styled `'info'` at `:28`, is given an icon at `:34`, and is offered as a filter at `:52` (`const ALERT_TYPES: AlertType[] = ['unregistered_device', 'new_partner_key', 'inactive_key'];`). **No code path in the audited tree writes it.** The only two writers of the `alerts` collection are `telemetry.ts:413-415` and `:445-447`, and they write the other two types; the synthetic seeder writes three alert documents at `scripts/synthetic/seed.mjs:432`, `:454` and `:475`, and they are `unregistered_device`, `new_partner_key` and `unregistered_device`. It also has no resolution control—`AlertsPage.tsx` branches on the other two types only.

```bash
S=c9f66f07a243491eef3295ac8ed32e4fe97610d5; cd ~/GitHub/device-source-of-truth
git grep -nI "inactive_key" "$S" -- functions src scripts packages
git grep -nI "collection('alerts')" "$S" -- functions/src scripts
```

The honest count is therefore **two alert types in service, a third declared and written by nothing in the audited tree**. Not *never emitted*: this row searches `functions`, `src`, `scripts` and `packages` at one pin, which cannot speak to prior revisions or to alert documents any earlier build may have written. The stronger form stood in an earlier draft of this row and on the page, and Codex caught it on `#873`. Nobody asked for this row; it exists because "three alert types" is the number a drafting agent would take from the enum, and the number that would survive review is two.

### A35—cost disclosure shipped, is mandatory in the interface, and is not a server-side gate

> ":45 The pipeline that shipped runs AI-assisted extraction with mandatory cost disclosure"

**SPLIT: "shipped" and "mandatory" are SUPPORTED; read as an enforced control or as a computed estimate, the claim is WRONG on both counts.**

It shipped, against a spec header that denies it—`specs/DST-050-questionnaire-ai-cost-disclosure.md:3-4` still carries `tested: false` / `reason: "implementation pending"`, and this is a second clean instance of §M1 alongside §A18. The modal is placed at both DST-047 trigger points: `src/pages/QuestionnaireUploadPage.tsx:291` and `src/pages/QuestionnaireDetailPage.tsx:720`. It is mandatory in the sense the spec intended—`QuestionnaireUploadPage.tsx:294-296` sets `onClose={() => {}}` and `dismissable={false}` with a single footer action, `Got It — Continue Upload`, so there is no cancel and no opt-out. That is genuinely different from the DST-042 variant on the CSV paths (`IntakeImportPage.tsx:860`, `PartnerKeyRegistryPage.tsx:806`), which sits behind an opt-in checkbox defaulting to off (`IntakeImportPage.tsx:157` `useState(false)`).

Two narrowings the page must respect. **It discloses no estimate.** The body text is qualitative: extraction "uses the Anthropic API and will incur usage costs billed to your organization's API account. Costs scale with the number of devices in the file—most questionnaires are a few cents or less." Nothing counts tokens, computes a per-run figure, displays a running total or enforces a budget; `git grep -nIiE 'estimatedCost|costEstimate|costUsd|budget'` over `src functions packages` returns nothing. **And it is a client-side courtesy, not a gate.** Acknowledgement is recorded at `QuestionnaireUploadPage.tsx:137` as `sessionStorage.setItem('dst_questionnaire_ai_disclosed', 'true')`—browser session scope, never sent to the server—and the extraction routes (`questionnaireIntake.ts:174`, `:617`, `:693`) check role and nothing else. An API client calling `trigger-extraction` directly never encounters it.

```bash
S=c9f66f07a243491eef3295ac8ed32e4fe97610d5; cd ~/GitHub/device-source-of-truth
git show "${S}:src/pages/QuestionnaireUploadPage.tsx" | sed -n '136,140p;291,315p'
git grep -nIiE 'estimatedCost|costEstimate|costUsd|budget' "$S" -- src functions packages
```

Defensible form: *before the first extraction in a session the interface states that the run will bill the organization's Anthropic account and roughly what it costs, with no way to proceed without acknowledging it and no way to opt out—the disclosure is a design commitment enforced in the interface, not in the API.* That is a better sentence than the current one, and it is true.

### A36—confidence is computed in two subsystems with different semantics and different powers

**SPLIT, and conflating the two would be the single easiest error to make on this page.**

**In the questionnaire extraction pipeline, confidence gates nothing.** The model is asked for it—`functions/src/services/questionnaireExtractor.ts:313` instructs the response schema to carry "confidence: float 0.0-1.0" per question-answer pair—and it is stored verbatim on the staged field at `:712` as `aiConfidence: result.confidence`. Every consumer is presentational: `src/pages/QuestionnaireReviewPage.tsx:728` renders `<ConfidenceBadge value={f.aiConfidence} />`, `:1400-1402` colour-codes the row at `>= 0.85` and `< 0.75`, and `:1447` prints `confidence: {Math.round(field.aiConfidence * 100)}%`. `aiConfidence` appears nowhere in `functions/src` except that one write. It does not auto-approve a field, does not auto-reject one, and is not consulted by the sign-off guards in §A37.

**In the CSV import disambiguation pass, confidence does gate.** `functions/src/services/aiImportFramework.ts:25-26` sets `AUTO_RESOLVE_THRESHOLD = 0.90` and `VERIFY_THRESHOLD = 0.75`, mirrored in `aiDisambiguate.ts:25-26`; the prompt at `aiImportFramework.ts:308-310` instructs "0.90+ → auto-resolve", "0.75–0.89 → suggest but flag for human verification", "Below 0.75 → set needs_human = true and provide a clear question"; and `aiDisambiguate.ts:225-226` turns the number into a resolution source, `confidence >= AUTO_RESOLVE_THRESHOLD ? 'ai_auto' : 'ai_suggested'`. A row resolved `ai_auto` stops generating a clarification question. It does **not** skip the import preview—that path is still the two-step admin confirm of §A32—so what auto-resolve removes is the question, never the confirmation.

```bash
S=c9f66f07a243491eef3295ac8ed32e4fe97610d5; cd ~/GitHub/device-source-of-truth
git grep -nI 'aiConfidence' "$S" -- functions/src src packages
git show "${S}:functions/src/services/aiImportFramework.ts" | sed -n '25,26p;305,316p'
```

Note the two subsystems do not even share thresholds: the review UI's colour breaks are 0.85/0.75, the disambiguation gate's are 0.90/0.75. **The page may say the model reports its own confidence per extracted field and that the number is shown to the reviewer rather than trusted to decide; it may say that on the CSV paths a high-confidence normalization resolves without asking. It may not say confidence gates extraction, and it may not say human review is triggered by low confidence—review is unconditional.**

### A37—human sign-off is enforced server-side, by four named guards

**SUPPORTED, and this is the strongest single fact on the page.** `POST /api/questionnaire-intake/:id/approve` (`functions/src/routes/questionnaireIntake.ts:1197`) is `requireRole('admin')` and is the only path by which extracted questionnaire data reaches the device registry. Before it writes anything it refuses on four conditions, each with its own status code and message:

- `409` when any intake partner is still unreviewed—`` `${pendingPartners.length} intake partner(s) still pending review` `` (`:1218-1223`, multi-partner jobs).
- `422` `Partner must be assigned before approval` when a single-partner job has no resolved submitter (`:1226-1230`).
- `409` `All devices must be approved or rejected before sign-off` when any staged device is still `reviewStatus === 'pending'` (`:1234-1239`).
- `409` `` Device "…" has N unresolved conflicts `` when an approved device still has a staged field with `conflictStatus == 'conflicts_with_existing'` and `resolution == 'pending'` (`:1244-1258`).

```bash
S=c9f66f07a243491eef3295ac8ed32e4fe97610d5; cd ~/GitHub/device-source-of-truth
git show "${S}:functions/src/routes/questionnaireIntake.ts" | sed -n '1197,1260p'
git show "${S}:functions/src/routes/questionnaireIntake.ts" | grep -nE "^router\.(post|patch|put)"
```

The staging model backs it up: every mutation of staged data between extraction and sign-off is `requireRole('admin')` (`:862`, `:890`, `:925`, `:956`, `:985`, `:1106`), while triggering and retrying extraction is `requireRole('editor', 'admin')` (`:617`, `:693`). The role boundary and the workflow boundary are the same line. **"Extraction proposes; a human signs" is not a design intention on this page—it is four HTTP refusals, and the page can quote them.** `specs/DST-048-questionnaire-admin-review-sign-off.md:24` states the intent in the author's own words: "so that no questionnaire data enters the database without my explicit review."

### A38—freshness: what stale means, where it is computed, and that nothing acts on it

**SUPPORTED with four precisions §A18 does not reach.** *(1) What defines stale.* `src/lib/format.ts:40-49`: `no_data` when `lastTelemetryAt` is null or unparseable, `fresh` under 48 hours, `aging` under 7 days, `stale` beyond that. *(2) Not configurable.* Those two thresholds are literals inside the function (`:44-45`), it takes no threshold argument, and no settings surface, environment variable or Firestore document overrides them. The separate `ACTIVE_DEVICES_WINDOW_DAYS = 28` (`packages/contracts/src/index.ts:133`) is the telemetry *coverage* window the badge labels, not a staleness threshold—`FreshnessBadge.tsx:51` takes it as a prop default and it never reaches `getFreshnessState`. *(3) Computed, not stored.* The server stores one timestamp, `lastTelemetryAt`, written at `functions/src/routes/telemetry.ts:388`; the state is derived in the browser at render time from `Date.now()` (`format.ts:42`). No freshness state is persisted anywhere. *(4) Display-only.* `getFreshnessState` has no callers in `functions/src`; no alert type keys off it (§A33), no route filters on it, no export excludes stale rows, nothing emails anyone.

```bash
S=c9f66f07a243491eef3295ac8ed32e4fe97610d5; cd ~/GitHub/device-source-of-truth
git show "${S}:src/lib/format.ts" | sed -n '40,49p'
git grep -nI 'getFreshnessState' "$S" -- src functions
```

That is a real product position and a defensible one: the system tells you how old the answer is and then lets you decide, rather than hiding aged data or blocking on it. It is also exactly the *rejected alternative* a decision record needs, and the record should state the cost honestly—a badge nobody looks at changes nothing, and the product has no mechanism that makes anyone look.

### A39—the staleness rule that does bite is in the telemetry upload, not the badge

**SUPPORTED, and nobody asked for this row—it is the better half of the freshness story.** A second, unrelated staleness concept lives in the telemetry import and it *refuses writes*. During preview, a row whose `snapshotDate` predates the stored record's is marked `upsertStatus = 'stale'` and carries the warning "Existing record has a newer snapshot (…). Uploading this row would overwrite newer data with older data." (`functions/src/routes/telemetry.ts:130-135`). At commit, that row is **skipped unless the admin has explicitly overridden it by index**: `:322-331` counts it as no-change and `continue`s when `snapshotDate < existingData.snapshotDate && !staleOverrideSet.has(i + 1)`, and `:333-340` increments `staleOverwrittenCount` only when the override is present. The override arrives per row in the request body (`:217`, `:225`), and the counts are logged and returned (`:380`, `:482`).

```bash
S=c9f66f07a243491eef3295ac8ed32e4fe97610d5; cd ~/GitHub/device-source-of-truth
git show "${S}:functions/src/routes/telemetry.ts" | sed -n '126,140p;316,342p'
```

This is a genuinely live rejected alternative—last-write-wins is what almost every CSV importer does, and it is one line—declined in favour of refusing the write and making a human take responsibility per row. **Between §A38 and §A39 the honest freshness decision record is not "we added a badge"; it is that the product refuses to let an older snapshot silently overwrite a newer one, and separately refuses to hide age from the reader.** The first half enforces, the second half informs, and saying so is more interesting than either alone.

### A40—the page's commit arithmetic is stale at the pin

> ":61 Of the 332 commits on main as of late August 2026, the 178 after March 6 are dependency bumps, template synchronization, CI work, and small fixes"

**WRONG, and self-dating.** At the pin—which *is* late August 2026, 2026-08-28—the counts are **339** and **185**, not 332 and 178. §A6 computed 332 correctly at the earlier ref it read; the page then reprinted it under a date qualifier the pin falsifies, which is §M3 in its ordinary form.

```bash
S=c9f66f07a243491eef3295ac8ed32e4fe97610d5; cd ~/GitHub/device-source-of-truth
git rev-list --count "$S"                              # 339
git rev-list --count --since='2026-03-07' "$S"         # 185
```

Corrected value: **339 total, 185 after 2026-03-06, as of `c9f66f0` (2026-08-28)**. The figure moves every time Dependabot lands, so the defensible weaker form is the better choice for a page nobody will re-audit: state the shape without the raw count—the last product feature landed 2026-03-06, and everything since is dependency, template, CI and security work—or, if a number is wanted, pin it to an explicit date in the prose.

### A41—"plus one substantive change" undercounts the post-tenure tail by at least three

> ":61 …and small fixes—plus one substantive change: an August 20, 2026 commit replaced the real partner data with an invented dataset"

**WRONG. Re-derived from scratch at the pin rather than restated from §A16, whose enumeration was made at an earlier ref and predates two of these.** Twenty-four commits after 2026-03-06 touch `src`, `functions` or `packages`, and at least four are substantive product-code changes, three of them security work:

- `91ca7f6` (2026-08-04, #154) "bound partner similarity input and replace the blanket 50mb body limit"—new `functions/src/middleware/bodyLimits.ts` (+194) plus a new `inputLimits` service and two test files, 12 files.
- `6e002a7` (2026-08-20, #165) the synthetic scrub—the one the page names.
- `bfaf374` (2026-08-26, #175) "scope CORS, rate-limit /api, pin workflow permissions"—`functions/src/middleware/rateLimit.ts` (+119), `functions/src/index.ts`, and `src/pages/QuestionnaireDetailPage.tsx` (+57), 11 files, +701/−15.
- `a655527` (2026-08-26, #177/#178, PR #182) "bound volumetric blast radius and close the pre-auth IP-gate gap"—`rateLimit.ts` (+253), `auth.ts`, `index.ts`, 7 files, +576/−27.

```bash
S=c9f66f07a243491eef3295ac8ed32e4fe97610d5; cd ~/GitHub/device-source-of-truth
git log --format='%h %ad %s' --date=short --since='2026-03-07' "$S" -- src functions packages
for c in 91ca7f6 6e002a7 bfaf374 a655527; do git show --stat --format='%h %ad %s' --date=short "$c" | head -14; done
```

Corrected value: **the post-feature tail is dependency bumps, template synchronization and CI work, plus the synthetic-data scrub and three rounds of security hardening**. This is worth getting right rather than trimming: it is the only evidence on the page that the archived system is still being maintained to a standard, and `bfaf374` also means the "no product code after March 6" framing needs the caveat that a UI file changed in August as part of that work.

### A42—the deployed demo says SEK where the page says ADK

**SUPPORTED, and it collides directly with AC 9.** The page uses "ADK" five times (`:27`, `:34`, `:53`, `:55`, `:57`) as the version vocabulary. The scrub renamed the user-facing term: `scripts/synthetic/dataset.mjs:54-58` explains that SEK ("Story Entertainment Kit") is the fictional group's integration kit and that "the `liveAdkVersion` schema field keeps its name… only the values users actually see change." The rendered labels follow—`src/pages/DashboardPage.tsx:268` "SEK Version Adoption", `src/pages/DeviceDetailPage.tsx:184` and `:460` "SEK Version", `src/components/shared/VersionInput.tsx:14` `label = 'Live SEK Version'` with placeholder `'e.g. SEK 3.1.1'`, `src/components/onboarding/WelcomeModal.tsx:16` "all NCP/SEK partner devices", and `src/lib/types.ts:188` `VersionPlatform = 'NCP' | 'SEK' | 'DEV' | 'UNKNOWN'`. Field *keys* stay `liveAdkVersion`/`adkVersion` for schema back-compat, so the mismatch is display-only—which is exactly the half a screenshot captures.

```bash
S=c9f66f07a243491eef3295ac8ed32e4fe97610d5; cd ~/GitHub/device-source-of-truth
git grep -nI 'SEK' "$S" -- src/pages src/components src/lib
git show "${S}:scripts/synthetic/dataset.mjs" | sed -n '52,62p'
```

**Every screenshot taken from the deployed instance will read "SEK Version" beside prose that says "ADK version."** The page must either caption the difference explicitly—which doubles as the AC 8 synthetic-data signal, since "SEK" and "Story Entertainment" are the tells that the data is invented—or avoid the version screens. It must not silently mix the two vocabularies.

### A43—frontmatter, field by field

**SUPPORTED throughout; three fields need a decision rather than a correction.** Audited against `specs/project-pages.md` § Frontmatter field reference at the site pin.

- `title`, `slug`, `githubUrl`, `screenshotAspect: "wide"`, `screenshotSrc`—valid. `slug` matches the filename; `public/images/projects/device-source-of-truth-hero.png` exists; `wide` is asserted for this slug by `tests/project-pages.test.js:717-731`.
- `order: 3` / `accent: "blue"`—**correct and coupled.** The ramp is `red → yellow → paper → blue → black`, `accent = RAMP[order % 5]`, so `RAMP[3] = blue`; the spec's own table at § Current project accents lists Device Source of Truth at order 3 as `blue`. A reorder recolours it, and the test suite fails on any mismatch.
- `status: "ARCHIVED"`—§A24, unchanged.
- `stack: "React · TypeScript · Vite · Tailwind · Zod · Firebase · Express · Vitest"`—**all eight verified at the pin**: React 19.2.8, TypeScript 5.9.3, Vite 8.2.2, Tailwind 4.3.1, Zod 4.3.6, Firebase 12.18.0, Vitest 4.1.11 (root `package.json`), Express 5.1.0 (`functions/package.json`).
- `liveUrl`—resolves, with the caveat in §A25.
- `description` and `kicker: "AI × Enterprise × Data"`—the description repeats the "across Disney+, Hulu, and ESPN" formulation carried by three other surfaces (§A44); AC 10 asks for it to be realigned, and §A28 governs how.
- `tags: ["Enterprise", "Data", "React", "Firebase"]`—no schema constraint; `React` and `Firebase` duplicate `stack`.
- `related`—both targets exist (`src/content/blog/six-prs-one-bug-agent-failure-modes.md`, `src/content/projects/swipe-watch.mdx`); see §A47 on the first.
- **Absent and required by the plan:** `decisions` and `constraints`. Both default to `[]`, and per § Placement the components render only from an `.mdx` body reading `props.X`. **The page is `.md` today; AC 5's decision records and the planned `<ConstraintStrip>` require converting it to `device-source-of-truth.mdx`.** That conversion is what #758 did for `friends-and-family-billing`, and the same three imports are needed.

```bash
P=d3105842170cc22ad89abcb040861af625435936
cd ~/GitHub/nathanpaynedotcom/.claude/worktrees/ffb-case-study-rewrite-fe37e5
git show "${P}:src/content/projects/device-source-of-truth.md" | sed -n '1,23p'  # .md, not .mdx: at this pin the page had not been converted yet
git ls-tree -r --name-only "$P" -- public/images/projects | grep device-source
```

### A44—cross-surface sweep: every surface carrying a claim this page makes

**Six surfaces carry DST claims, and four of them carry the same sentence.** Swept on what the claims *mean*, not on phrasing, per the #757 finding that a claim survives substring removal. **Scope note added after the fact:** this table inventories the surfaces the *page rewrite* had to keep in sync, and its three résumé rows are a sample rather than the full set—the provenance correction in §A50 ultimately reached seventeen résumé surfaces, thirteen of which are tailored variants this table never listed. Read §A50 for the résumé inventory; read this table for what a page edit must not desynchronize.

| Surface | What it asserts | Needs to change? |
|---|---|---|
| `src/content/projects/device-source-of-truth.mdx` | the page itself | yes—the restructure |
| `src/pages/index.astro:193` | "tracks partner-device hardware, DRM, codec support, and operational readiness across Disney+, Hulu, and ESPN" | yes if the deck changes—**and the string is pinned verbatim by `tests/project-pages.test.js:70`** |
| `src/pages/og-templates/projects/device-source-of-truth.astro` | `description` duplicating the page's `description` verbatim; `meta="Enterprise · Data · React · Firebase"` | yes if `description`, `kicker` or `tags` change |
| `src/content/resume/projects/device-source-of-truth.md` | "An independent build, distinct from the internal production system…" | **yes—§A28** |
| `~/GitHub/docs/job-search/nathan-payne-resume.md:103` | byte-identical to the mirror above | **yes—§A28, and the two must stay verbatim-identical** |
| `~/GitHub/docs/job-search/nba/…-nba.md:65` | "personal reimplementation of the Disney partner-device data system" | **yes—§A28, third framing** |

Three tests pin DST strings and will fail on an unsynchronized edit: `tests/project-pages.test.js:50`, `:60` and `:70` (slug list, card title/href, and the homepage description verbatim); `tests/resume.test.js:259` and `:268` (the résumé link href and its exact label, "Device Source of Truth – Partner Device Intelligence Platform", note the en dash); `tests/responsive/overflow.spec.ts:7` (the page is in the responsive sweep, so new wide content—tables, diagrams, code—must scroll inside its own container).

```bash
P=d3105842170cc22ad89abcb040861af625435936
cd ~/GitHub/nathanpaynedotcom/.claude/worktrees/ffb-case-study-rewrite-fe37e5
git grep -nIl 'device-source-of-truth\|Device Source of Truth' "$P" -- src tests
grep -rnIi 'device source of truth' ~/GitHub/docs/job-search/
```

The claim to sweep on is not the string "Disney+, Hulu, and ESPN"—it is *which streaming services these devices serve*, and it appears in the page `description`, the homepage card, the OG card and both résumé surfaces. No artifact in the evidence repository substantiates Hulu or ESPN; the repository's own vocabulary is "Disney Streaming NCP/ADK ecosystem" and one questionnaire field reads "RAM available to Disney+ app" (`mappings/adk_questionnaire_fields.md:47`). Treat the three-service enumeration as **UNPROVABLE** and, given §A25 and §A28, as the wrong thing to lead with in any case.

### A45—there is no outcome record, and the validation boundary

**UNPROVABLE, definitively, and the absence is itself the finding.** No artifact in the evidence repository records adoption, time saved, error reduction, coverage or throughput. There is no usage report, no retrospective, no launch note, no adoption metric, and no ticket describing a production question answered with the tool. The only figures that look like outcomes are the three hardcoded literals in `ReadinessPage.tsx` (§A30), and they measure nothing.

The sharper version of the absence: **the instrumentation to measure adoption shipped and the measurements did not.** `src/lib/analytics.ts` declares a forty-plus-member `AnalyticsEvent` union—`device_search`, `spec_form_save`, `questionnaire_upload`, `telemetry_upload`, `alert_dismiss`, `readiness_declare`, `onboarding_complete` and the rest—wired to Firebase Analytics through `src/lib/firebase.ts:31-38`. The events exist; nothing in the repository reports what they recorded, and the deployed instance has been synthetic since 2026-08-20, so anything they record now is demo traffic.

```bash
S=c9f66f07a243491eef3295ac8ed32e4fe97610d5; cd ~/GitHub/device-source-of-truth
git show "${S}:src/lib/analytics.ts" | sed -n '1,45p'
git grep -nIiE 'time saved|hours saved|adoption|users onboarded|went live' "$S" -- README.md DEPLOYMENT.md .ai_context.md docs specs plans bugs
```

**Validation-boundary sentence, for the page to use verbatim:**

> The workflows shipped and the deployed instance runs them end to end, but no artifact records a team adopting the tool or a production question answered with it. Development stopped on 6 March 2026, before any adoption period, and the usage events the application emits were never reported against—so the claim this page can stand behind is that the design decisions were made and built, not that they were validated in use.

Every decision record on this page therefore carries `status: pending`, with one exception, and the exception is not the one an earlier version of this row named. That version allowed `validated` where a record "can point to a change the *record itself* forced," and §A48 used it to license three. It does not survive the spec: a change the record forced is still implementation, and `validated` asks for what happened afterward. Withdrawn, along with §A48's three prescriptions.

**There is no exception. All five records are `pending`,** and the second attempt to carve one out failed for the same reason as the first. That attempt kept the cost-disclosure record at `mixed`, arguing that §A35's `sessionStorage` and API-bypass findings are a limitation the evidence *exposes* rather than evidence that is missing. The spec closes it: `DecisionLedger` labels the `evidence` field **Observed** for `validated`, `mixed` and `revised` alike, and `specs/project-pages.md` says in terms that calling a validation boundary "Observed" asserts an observation that by definition has not happened. Where the disclosure stops is a fact about the artifact, not an observation of the decision in use—nobody ever met that modal in the course of real work. Codex raised it twice, on `#873`; the first rebuttal was mine and it was wrong.

### A46—commit authorship is not evidence of agent share

**UNPROVABLE from the commit record, and the obvious metric points the wrong way.** Authorship across the pin's history: 274 commits by "Nathan Payne", 55 by `dependabot[bot]`, 5 by `nathanjohnpayne`, 4 by `nathanpayne-codex`, 1 by `nathanpayne-claude`. Read naively that says agents wrote five of 339 commits, which is false—the governing convention is that agents commit under the human author identity, so the byline is uninformative about who wrote the diff.

```bash
S=c9f66f07a243491eef3295ac8ed32e4fe97610d5; cd ~/GitHub/device-source-of-truth
git log --format='%an' "$S" | sort | uniq -c | sort -rn
git ls-tree -r --name-only "$S" -- .claude .codex .cursor docs/agents
```

What *is* in the record for AC 7 is the operating structure, not a share: sixteen agent-facing rule documents under `docs/agents/` plus per-agent configuration (`.claude/settings.json`, `.codex/hooks.json`, three `.cursor/rules/*.mdc`), the machine-user review pipeline that arrived by template propagation on 2026-03-24 (§A13), CodeRabbit carrying device-domain instructions (§A15), and the two-strike audit rule at `docs/agents/operating-rules.md:358`—re-verified at the pin, still absent from `REVIEW_POLICY.md`, so §A14's correction holds. **The page may describe how agent work was governed and reviewed; it may not quantify how much of the code agents wrote, and it must not cite commit authorship as evidence either way.**

### A47—the related blog post is topical, not evidential

> ":19-20 label: \"Blog: Six PRs, One Bug—What AI Agents Actually Get Wrong\""

**SUPPORTED as a related link; WRONG if the page presents it as documenting DST's own agent work.** The post is about Friends & Family Billing: its `description` reads "Editor, preview, and sent email disagreed in a **billing app**," and `friends-and-family-billing.mdx:94` builds two of its four decision records out of it. Four project pages list it (`device-source-of-truth.md:20`, `friends-and-family-billing.mdx:64`, `mergepath.mdx:82`, `swipe-watch.mdx:58`), so on this page it is the portfolio's general Agent Systems pointer rather than a DST claim—which is fine, and worth knowing before AC 10 prompts anyone to "align related links."

```bash
P=d3105842170cc22ad89abcb040861af625435936
cd ~/GitHub/nathanpaynedotcom/.claude/worktrees/ffb-case-study-rewrite-fe37e5
git grep -nI 'six-prs-one-bug' "$P" -- src/content/projects
git show "${P}:src/content/blog/six-prs-one-bug-agent-failure-modes.md" | sed -n '1,6p'
```

The two-strike rule the page cites at `:49` *is* DST-local (`docs/agents/operating-rules.md:358`), and it is also the rule the post's third key takeaway describes, so the thematic link is real. The page must not narrate the post's bug as a DST incident.

### A48—which decision records have real evidence, and which would be implementation description

**The adjudication AC 5 needs.** Measured against `specs/project-pages.md` § The bar for a decision at all—could a reasonable PM have chosen the rejected alternative without being wrong to?—and § `evidence` is required for every status.

**Status correction, applied in place—read this before the list.** The first version of this row prescribed `status: validated` for records 1, 2 and 4 on the reasoning that "the evidence is what the code refuses, not an outcome." **That reasoning is wrong against the spec and the prescriptions are withdrawn.** `specs/project-pages.md:186-197` defines `validated` as *observed evidence that materially supports the decision* and requires `evidence` to describe what happened afterward—never a restatement of what was built. Route guards, consumers and shipped chains are implementation, however strong; §A45 establishes that no artifact records any of these decisions being exercised by a team. Codex raised this as a P1 on `#873`, the page moved to four `pending` and one `mixed` in `f450353`, and this row kept telling the next author to write `validated`—which is how a corrected claim comes back. The four records below now read `pending`, and the reason each is worth keeping is the mechanism, not the outcome.

**The four that hold as decisions.** They clear the bar for *being decisions*—a live rejected alternative, a real cost—which is a separate question from whether their outcomes are evidenced. None of them are.

1. **Extraction proposes; a human signs.** Rejected alternative genuinely live: letting the confidence number decide, at the limit auto-commit above a threshold. **Write the parallel as automatic *normalization*, never automatic commit.** An earlier version of this row said the CSV paths auto-commit, citing §A36—which is the row that disproves it: `ai_auto` at 0.90 suppresses the clarification question and the row still goes through the two-step admin confirm of §A32, so what auto-resolve removes is the question, never the confirmation. The real and sufficient contrast is that the same author let confidence settle something unsupervised on one path and gave it no power at all on the heavier one. The page carried this error too, was corrected on `#873`, and this row is what would have re-seeded it. Evidence: the four server-side refusals in §A37, and the deliberate demotion of model confidence to a badge in §A36. `status: pending`—what the code refuses is strong evidence that the gate is real rather than advisory, but nobody ran a questionnaire through it, so it is evidence about the mechanism and not about the decision's outcome.
2. **An older snapshot does not silently win.** Rejected alternative: last-write-wins, the default of nearly every CSV importer. Evidence: §A39's preview warning, the per-row override set, and `staleOverwrittenCount` being counted and returned rather than hidden. `status: pending`—the counter exists and would record every stale overwrite, which is exactly why the absence matters: it was never read against a real bulk load. Cost, which the record must state: an import can no longer be a single unattended action.
3. **Freshness is shown, never enforced.** Rejected alternative: hide or block on aged data, which is what a system claiming to be a source of truth is usually built to do. Evidence per §A38: thresholds fixed at 48 hours and 7 days, computed in the browser, stored nowhere, consulted by nothing. `status: pending`—§A45's boundary is the evidence, and the honest cost is that a badge nobody is required to look at changes nothing.
4. **Aliases resolve; they do not merge.** Rejected alternative: deduplicate the partner records, which is the obvious fix for one operator appearing under several names. Evidence: §A20's contextual resolver and the resolution chain at `functions/src/services/partnerResolver.ts:113` (exact → alias → Jaro-Winkler ≥ 0.90), which keeps every raw name resolvable to a canonical partner without destroying either. `status: pending`—the chain shipped and is the sole path for partner data, but what resolution saved operationally was never measured. **Authoring warning: the worked example must come from the synthetic dataset, never from `specs/DST-046`—§A26.**

**A fifth, if five are wanted:** *cost is disclosed before it is incurred, and there is no opt-out*. The rejected alternative is DST-042's opt-in checkbox, which the same author shipped on the CSV paths and deliberately declined here; `specs/DST-050…:34-38` argues the reasoning out in writing, which is rare. `status: pending`—**not `mixed`**, which two drafts of this row prescribed. §A35's narrowing must still be carried (the control is in the interface, not the API, and the disclosure is qualitative), but that narrowing is a fact about what shipped, and `mixed` renders it under the label **Observed**. Nobody met the modal in real work, so there is nothing observed to report; see §A45.

**The candidates that do not clear the bar.**

- *Shared schema / `@dst/contracts`*—§A8 supports the facts, but no reasonable PM chooses "let client and server drift" once `f38569d` has happened. It is a correct engineering response to a bug, not a decision with a live alternative. It belongs in prose.
- *Actionable exceptions*—as built it is implementation description: two alert types with a modal each (§A33), and a third that does not exist (§A34). Promote it only if the record is written about *scope*—why only telemetry raises alerts while four other import paths surface exceptions inline—and that reasoning is nowhere in the repository, so it would be invented.
- *Dependency-aware intake (DST-049)*—the spec mislabels itself as DST-047 in its own H1 (§A12, re-verified at the pin), and no artifact records the alternative being weighed.
- *Queue/retry*—§A10 established that fire-and-forget was replaced by Cloud Tasks. That is a `revised` record on paper, but the revision is a correctness fix rather than a product decision, and the page already tells it well in prose.
- *Synthetic demo boundary*—genuinely consequential, and the reason it is not a decision record is that it is a **confidentiality requirement** (AC 8) that must be prominent in its own right. Demoting it into one card among five is the opposite of prominent. §A25, §A26 and §A42 supply what it needs to say.
### A49—the synthetic dataset's own headcount, and the ADK/SEK rename in the code's words

**SUPPORTED, added because the #755 draft asserted a number no §A row carried.** The draft wrote "fourteen fictional operators"; §A17 establishes the synthetic dataset without counting it, and §A26's **seven** is a count of the *real* operators surviving in `specs/`—a different set, and the one distinction this page cannot afford to blur in either direction. Verified rather than cut:

```bash
S=c9f66f07a243491eef3295ac8ed32e4fe97610d5; cd ~/GitHub/device-source-of-truth
git show "${S}:scripts/synthetic/dataset.mjs" | sed -n '32,47p'   # export const PARTNERS
```

`scripts/synthetic/dataset.mjs:32` exports `PARTNERS` with exactly **fourteen** entries: Northwind Cable, Brightloom Telecom, Solstice Media Group, Solstice Nordics, Harborlight Broadband, Kestrelnet TV, Calderwood Networks, Fernvale Fibre, Auroral Communications, Tidewater Digital, Glassford Media, Vantara Group, Quillon TVs, Meadowlark Telecom. These are safe to publish; they are the invented set. The same file exports four invented chipsets, five OEMs and four operating systems.

Two lines in it are worth quoting on the page rather than paraphrasing. `:4`—"Every name in this file is invented. There are no real partners, operators..."—is the dataset asserting its own synthetic status in the source, which is stronger than the page asserting it. And `:54` states the §A42 mechanism in the code's own words: "SEK ("Story Entertainment Kit") is the fictional streaming group's device integration kit. The `liveAdkVersion` schema field keeps its name, because it is a `@dst/contracts` field carried by every stored device; only the values users actually see change."

**That last line settles what §A42 left open.** The ADK→SEK difference is a *display-layer rename only*: the stored schema field is still `liveAdkVersion` in `@dst/contracts`, so the page's ADK vocabulary describes the data model correctly while every screenshot correctly shows SEK. The two are not in conflict, and the page should say which layer each word belongs to rather than choosing one.
### A50—the provenance, settled by the owner: a fork with the data replaced

**EXTERNALLY SOURCED (§M6), and it resolves §A28 rather than picking a side.** §A28 recorded three surfaces telling three stories and said the question needed the owner. He answered it in two passes on 2026-08-29, and the second is the precise one: **"I forked a Disney system and added synthetic data to it for a portfolio demo."**

That is neither of the framings §A28 was choosing between, and it explains the evidence §A28 found contradictory:

- The repository record reads as an internal Disney system (`README.md:3`, `CONTRIBUTING.md:5`, `@disney.com` SSO, the scrub commit's "real Disney partner device data") **because the fork inherited it.** Those files were not written to describe a portfolio artifact and were never rewritten to.
- Real partner identities survive in `specs/` (§A26) **for the same reason**: a fork carries the history it forked from, and the scrub `6e002a7` scoped itself to deployed data, shipped source and `mappings/`, which is exactly where a data-replacement pass would stop.
- The résumé's "an independent build, distinct from the internal production system" was the hedge §A28 suspected. It is now corrected to a fork framing across **all seventeen résumé surfaces**—the `src/content/resume/` mirror plus sixteen files in the docs vault, committed there as `43eb5f9`—so no surface retains the hedge. (This row first said three primary surfaces were fixed while ten tailored variants still carried the old wording, which was true for about an hour on 2026-08-29 and stale once the owner asked for the rest; Codex caught the residue on `#873`. Verified by sweep: zero files under `job-search/` match the old phrasing.)

**What the page may now say:** the system is his Disney partner-engineering work; the public artifact is a fork of it with the records replaced by invented data. **What it may not say:** that this is the production instance, or that it was rebuilt independently. The distinction is load-bearing for AC 8—a fork explains why the repository must stay private, which a from-scratch reimplementation would not.
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

**SPLIT: unifying Preview with the test email is SUPPORTED; "removed the bridge entirely" and unifying Preview with the recipient invoice are WRONG.**

The narrower unification is real. #161 introduces `renderInvoiceTemplate(ctx, shareUrl)`, whose docstring reads "Canonical HTML renderer for invoice templates. This is the single source of truth for the Invoicing preview and template email HTML"—now `src/lib/invoice.js:458`, with `buildInvoiceTemplateEmailPayload()` at `:470`. It removed the separate `renderPreviewHTML()` path and changed `processMailQueue` to prefer client-supplied canonical HTML over `simpleMarkdownToHtml(body)`. Only the test-send path supplies that HTML; §C40 establishes that the recipient invoice does not.

The bridge survives. `docToPlainTextWithTokens` is on `origin/main` today at **`src/lib/template-doc.js:94`**, re-exported at `src/lib/invoice.js:208`, and still called at `src/lib/invoice.js:487`, `src/app/views/Manage/InvoicingTab.jsx:73` and `:118`. `simpleMarkdownToHtml` also survives in `functions/index.js` as a fallback. No bridge file was deleted in #161 or since. Corrected value: "**bypassed** the bridge for the Preview and test-send path and unified those two surfaces onto a single renderer; the recipient invoice remained on the bridge."

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

The return type at `:17` is `{'outstanding'|'partial'|'settled'|'overpaid'|null}`, and the settlement board's sort order carries all four (`src/app/components/SettlementBoard.jsx:109`). Its filter chips expose only All, Outstanding, Partial and Settled (`:121-126`), so Overpaid is reachable only under All. A decoy exists and should not be mistaken for support: `bd50bad` (2026-04-05) is literally titled "three-state balance model," but its three states are owes-money (red) / settled-at-zero (grey "Paid") / credit-overpaid (green)—a colour convention across screens, not the `outstanding`/`partial`/`settled` triple. Corrected value: **four-state (outstanding, partial, settled, overpaid)**.

### C18—token-scoped share links

> ":36 Generates shareable summaries via token-scoped links—each link carries the recipient's name, bill breakdown, and payment methods, accessible without login."

**SUPPORTED at the product-behaviour level, all four elements.** The implementation generates per-recipient links, builds a member-scoped projection carrying the recipient's name, bill breakdown and enabled payment methods, and exposes the share route outside the login gate. The credential format, lookup derivation, storage identifiers and rule details are not repeated in the current ledger while the live product's data-layer authorization gap remains open; §C29 records why that is risk reduction rather than containment. The evidence was verified in the product repository and reported privately to its owner.

### C19—dispute management

> ":37 Supports dispute management with lifecycle-stage email notifications, evidence attachments, and resolution workflows with share-page integration."

**SUPPORTED, all four.** Lifecycle emails: `982d99f` (2026-04-02) "feat: add email notifications at each dispute lifecycle stage (#115)", implemented at `functions/index.js:690` and `:931`. Evidence attachments: `specs/dispute-resolution.md:30-40` (`uploadEvidence`/`removeEvidence`, PDF/PNG/JPEG, 10-item cap). Resolution states: `src/lib/constants.js:10-15` `DISPUTE_STATUS_LABELS` (`open`/`in_review`/`resolved`/`rejected`). Share-page integration: `src/app/views/ShareView.jsx` dispute submission, plus `d7d9c3b`.

### C20—invoice builder

> ":34 Builds annual invoices with member name tokens, customizable email templates, and a live preview that renders exactly what the recipient will see."

**SPLIT—the invoice builder, name tokens and live preview are SUPPORTED, but "renders exactly what the recipient will see" is WRONG at the pinned SHA.** `src/lib/invoice.js` supplies the builder and renderer; `src/lib/template-doc.js` supplies `%first_name%`/`%last_name%`/`%full_name%`; and `src/app/views/Manage/InvoicingTab.jsx:196-197` supplies the live preview. The canonical renderer produces that preview and the test-send body, while the settlement board's recipient invoice remains on the plain-text bridge described in §C40. Defensible weaker form: "a live preview rendered by the same canonical renderer used for the test email body; the recipient invoice remains on a separate path."

### C21—stack line

> ":17 stack: \"React · JavaScript · Vite · Firebase · Vitest · Playwright\""

**SUPPORTED, all six.** React 19.2.8, Vite 8.2.1, Firebase 12.17.1, Vitest 4.1.0, `@playwright/test` 1.62.1 with `playwright.config.js`. JavaScript rather than TypeScript is confirmed by absence: `find src tests functions scripts -name '*.ts' -o -name '*.tsx'` returns zero files, no `typescript` dependency, no `tsconfig.json`. Playwright is thin but genuinely wired: one spec (`tests/e2e/invoicing-editor.spec.js`), run in CI at `.github/workflows/test.yml:32`. Both the E2E infrastructure (#158) and its CI wiring (#160) came out of the template-editor arc, which is a nice detail the page does not use.

### C22—the migration's shape

> ":41 a full architecture migration from a vanilla JavaScript single-page app to a React, Vite, and Vitest stack on Firebase"

**SUPPORTED.** The first commit is a 1,592-line vanilla-JS app on Firebase (`32b9ab9`); the current tree is React 19 on Vite with Vitest. The word "full" is doing work that §C7 qualifies—the migration completed in June, not March.

### Delta audit for #758—rows added 2026-08-29

Twenty-eight rows (§C23–§C50) covering the claims the #758 restructure needs and §C1–§C22 do not reach: the end-to-end recipient journey, the token-scoped no-login boundary read past the mechanism, the real scope of the payment audit trail, the evidence behind each of the four planned decision records, the household-outcome record, and the surviving frontmatter. Everything in the product repository was read at **`d70aa8ac9fca414777985bb7dc74faa0462690e6`** in `~/GitHub/friends-and-family-billing` (short `d70aa8a`, 2026-08-28 12:51:26 −0700, subject "bulk sync to mergepath@3d96105", the routine propagation commit), which is that repository's `origin/main` at the time of this audit; the local checkout's `HEAD` was seven commits behind it, so every command below reads the object database at the literal SHA rather than the working tree. The site repository was read at **`582b91d4db70abff8287307d7e6502ae41d6a268`**. **Every command in these rows carries one of those two literal SHAs rather than `origin/main` or `HEAD`**, per the #820 finding that a moving ref makes a row unreproducible. Four evidence sources are outside that header and are labelled where they appear: **live GitHub API reads** (§C38 note, §C43, §C44, §C45, §C46), each carrying its own as-of UTC timestamp in the row; **the four published parity screenshots** in the site repository's `public/` tree, read as images (§C47, §C50); **the résumé vault** at `~/GitHub/docs/job-search/` (§C50), which is not a git-pinned surface in this audit; and **one HTTP GET of the live product's root URL** (§C49), which reads a public page and no data. Nothing here touched production Firestore.

Read §C40 first. It is the row that reshapes the restructure: the invoice email a household member actually receives is not produced by the canonical renderer, was never touched by the fix that the page and its companion blog present as the resolution, and still runs through `simpleMarkdownToHtml`—the function the arc exists to have displaced. §C41, §C43, §C46 and §C47 are its supporting rows, and §C50 carries it out to the blog post and the blog post's Mermaid diagram. Four rows **identified claims that a current surface stated at audit time**: §C38 found the bad supporting evidence inside §C17, now corrected inline; §C40 narrowed the page's "same canonical renderer" claim, now corrected in the MDX page and in §C11 and §C20; §C30 corrected the share dialog's own "No expiry" option; §C50 found the blog paragraph and diagram still tracked in #857. §C41 instead constrains a proposed decision-record title; it was never a current-page correction. Six rows **change what the page can claim** and should be read before any decision-record card is drafted: §C33 (the privacy tradeoff was never evaluated in writing), §C35 ("append-only" is enforced by nothing but the code), §C36 (the account alternative has no record at all), §C37 (the four-state decision happened in the React port, not in an ADR), §C46 (the brief's own definition of done was not met on two clauses), and §C48 (the validation boundary). The remaining rows are new SUPPORTED material the page can use, and most of it has never appeared on any surface.

### C23—what a share link actually delivers, end to end

> Issue #758 AC 2: "Show the end-to-end recipient journey."

**SUPPORTED at the recipient-journey level.** A recipient opens a no-login link, the application loads a member-scoped billing projection through either its cache or its server-side resolver, and the share page renders the result. A successful application load records best-effort access metadata; cases that require additional validation take the server path. **The credential format, lookup derivation, document key, storage identifiers and branch conditions are not repeated in the current ledger for the reason and history caveat given in §C29.**

The payload is built by `buildPublicShareData` (`src/lib/share.js:155-234`) and is scope-gated field by field. Always present: `memberName`, `memberId`, `billingYearId`, `year`, `scopes`, `ownerId` (`:187-194`). Under `summary:read`: the member's own bill list with per-bill `name`, `logo`, `website`, `monthlyAmount`, `billingFrequency`, `canonicalAmount`, `splitCount`, `monthlyShare`, `annualShare` (`:111-122`); the linked household members' equivalent summaries (`:198`); a `paymentSummary` of `combinedAnnualTotal`, `combinedMonthlyTotal`, `totalPaid`, `balanceRemaining` (`:199-204`); and, when non-zero, itemised `serviceCredits` (`:209-212`). Under `paymentMethods:read`: the enabled payment methods with QR-code blobs stripped to a `hasQrCode` flag (`:215-221`). Under `usageCharges:read`: the member's own deferred charges with a running total (`:223-225`). Under `payments:read`: a member-safe payment history of `id`, `date`, `amount`, `method`, with the free-text `note` deliberately excluded (`:229-231`, `:365-379`).

Seven scopes exist (`buildShareScopes`, `src/lib/share.js:23-29`): `summary:read`, `paymentMethods:read`, `usageCharges:read` and `payments:read` are unconditional; `disputes:create`, `disputes:read` and `refunds:read` are per-link flags. Four of the seven are always on, so the page should not describe scopes as a per-recipient privacy control—they are a feature switch for the two dispute permissions and the refund-confirmation flow.

### C24—the share page shows the derivation, not only the total

**SUPPORTED, and this is the strongest single fact available for the recipient-journey section.** Every bill on the share page renders its arithmetic inline. `formatSplitMath` (`src/app/views/ShareView.jsx:34-38`) produces, verbatim in its own docstring's example, `$300.00/mo ÷ 8 members = $37.50/mo · ×12 = $450.00/yr`; the settled-state card view renders the same figures through `BillMath` (`:111-122`) with the source figure and operators muted and the member's own shares emphasised. The docstring is explicit that nothing is recomputed—"Every figure is read straight from the canonical, annual-first fields the builder already wrote… so the line can never imply a monthly-first rounding the canonical path didn't take."

Where the household total is lower than the sum of the bills, the page reconciles the difference rather than leaving it unexplained: `buildServiceCreditsForShare` (`src/lib/share.js:256-288`) emits each active service credit as a `Service credit — {billName} ({reason})` line, and `specs/sharing.md:57` records an "Other adjustments" residual line for a carried opening balance or a floored-at-zero total. This shipped in `#358` (2026-06, closing `#351`/`#352`/`#353` from epic `#350`), whose own issue text names the motivation: "the bill split is never shown as arithmetic."

By contrast the **email** carries no derivation at all—only the greeting, the total, and the link (§C47's screenshots show both states). The derivation is the share page's job, which is a clean statement of what the link is *for*.

### C25—what a recipient can and cannot do

**SPLIT: four recipient actions are SUPPORTED; "a recipient can self-report or mark a payment" is WRONG—no such control exists.** The actions reachable without an account, all in `src/app/views/ShareView.jsx`: open a review request on a specific bill ("Question This Charge", `:1022-1107`, gated on `disputes:create`); approve or reject the coordinator's proposed resolution of a review request (`:965-979`, gated on `disputes:read`); confirm or deny receipt of a refund ("Confirm Receipt" / "I Have Not Received It", `:836-845`, gated on `refunds:read`); and request a replacement link when the current one is dead ("Request New Link", `:321-325`). Passive affordances: expand payment history (`:752-755`), view a payment-method QR code (`:673-679`), copy a handle or address (`:641`, `:647`, `:653`, `:661`), open an evidence attachment (`:1015-1017`).

There is no path by which a recipient records a payment. The share projection grants no payment-write capability, the recipient interface contains no such control, and the coordinator records every payment by hand. Data-layer details for the live unauthenticated surface are not repeated in the current tree under §C29. Defensible form for the page: the recipient can see, question and confirm; only the coordinator can post money.

### C26—the dispute path, and what happens next

**SUPPORTED at the product-behaviour level, with implementation detail omitted from the current tree.** The share-page form submits a scoped review request, rate-limits it, records a server-side audit entry, and emails the coordinator the member's message, any proposed correction, and a link to the review queue. The data layer does not fully enforce the same authorization boundary. Because that gap affects a live product and remains unresolved, the current tree does not repeat the exact write path, rule clauses, missing checks or source locations. §C29 records that earlier public commits remain retrievable and this prose edit is not containment.

The sharing spec's dispute-submission route has drifted from the tree and tests. Per §M1 the implementation wins. The current tree does not repeat the application path or credential transport under §C29; only the high-level behaviour above should be copied out.

### C27—the point where the product removes a human coordination step

**SPLIT—three removals are verifiable in code, one candidate is not, and the page must not claim the biggest one.**

Verifiable. **(1)** The recipient learns their own amount and its derivation without asking anyone: §C23 and §C24 together. **(2)** The coordinator learns that the link was opened through the application, without asking—**not that the recipient in particular looked**, since the recorded counter measures application visits rather than people. The Manage Links tab renders that metadata as a last-viewed date. **(3)** A dead link moves the replacement request into the product: an expired or revoked link renders a "Request New Link" button (`ShareView.jsx:321-325`) that POSTs to the `requestShareLink` Cloud Function, which emails the coordinator "{memberName} tried to access their {year} billing summary but the link has expired or been revoked" (`functions/index.js:554`) and rate-limits to one request per token per 24 hours. That loop—"my link is broken, text Nathan"—is replaced with an in-product request, but access is not self-restoring: the coordinator must still mint and deliver a new link.

Not verifiable, and the page must not assert it: **the product does not send anything on its own.** There is no scheduler—`git grep -n "onSchedule\|pubsub\|scheduler\|cron" d70aa8ac9fca414777985bb7dc74faa0462690e6 -- functions src` returns zero, and the seven exported Cloud Functions are `getEvidenceUrl`, `processMailQueue`, `requestShareLink`, `resolveShareToken`, `submitDispute`, `submitDisputeDecision`, `submitRefundConfirmation`. The coordinator still opens a dialog and presses Send, per member, once a year. What is removed is the *explaining* and the *checking*, not the *asking*. A useful framing the record does support: six of the seven Cloud Functions exist to serve someone who has no account.

### C28—share-link storage details are not repeated in the current tree

**WRONG if the page says only a one-way representation is stored.** The live product retains material that lets the coordinator recreate a link already sent, and a test enforces that behaviour. The exact material, storage layout, lookup derivation and implementation references are not repeated in the current ledger while the data-layer authorization gap in §C29 remains open. §C29 records the public-history limit of that choice. This affects how strongly the page can describe protection at rest, but the page does not need the underlying recipe.

### C29—what the read rule actually permits

**SPLIT: the application intends link possession to be the boundary, but the deployed data-layer rule does not fully enforce the application's expiry and revocation checks.**

> **Removed from the current tree, not from history.** This row originally quoted the rule, named the storage surface and described the bypass. Parent and earlier commits remain retrievable from this public repository, so ordinary line deletion does not contain that disclosure; this edit only stops the current page and ledger from repeating it. **The actual remediation belongs in the product repository and has been escalated to its owner.** Rewriting public Git history would be a separate destructive operation and was not undertaken here.

This audit established the mismatch by reading the pinned rule and application paths; it did not probe the deployed project. Current rendered surfaces may state the product judgment—a no-login possession boundary chosen for usability—and that its data-layer enforcement is incomplete. They should not reintroduce the credential derivation, lookup recipe, storage identifiers, bypass procedure or post-expiry retrieval behaviour. That publishing rule reduces rediscovery; it does not retroactively make the earlier commits private.

### C30—expiry is enforced in two places, neither of them the rules, and the dialog's "No expiry" option does not do what it says

**SPLIT: `computeExpiryDate` is enforced at read time, which is the answer to the brief's question; but the share dialog's "No expiry" option is WRONG—it produces a 365-day link.**

Enforced at read time, twice. `computeExpiryDate` (`src/lib/share.js:75-80`) only computes a `Date` at write time, but the value is checked on every resolution: client-side by `isShareTokenStale` (`src/lib/share.js:88-95`, called at `ShareView.jsx:196`) and server-side by the Cloud Function, which returns `403 "This link has expired."` (`functions/index.js:161-167`). So expiry is not a write-time decoration.

The defect. `ShareLinkDialog` initialises `expiryDays` to `0` and labels that option "No expiry" (`src/app/components/ShareLinkDialog.jsx:25`, `:147`). It then passes `expiryDays: expiryDays || undefined` (`:111`), so `0` becomes `undefined`, and `createAndPruneShareLink` resolves `undefined` to `DEFAULT_EXPIRY_DAYS = 365` (`src/lib/ShareLinkService.js:13`, `:54`). **Selecting "No expiry"—the default selection—mints a link that expires in one year.** A never-expiring link is unreachable through this dialog. The service's own tests cover the 365-day default and a custom 30-day value (`tests/react/lib/ShareLinkService.test.js:104-112`) and never exercise the dialog's coercion, so nothing catches it.

Corrected value for the page: every link the product mints expires, and the shortest honest statement is "links expire—one year by default, with 7/30/90-day options in the dialog." Do not write that expiry is optional.

### C31—revocation is real, reachable, and deletes the cached payload

**SUPPORTED on all three counts, and this is the strongest half of the security story.** Revocation is a first-class UI action: the share dialog's "Manage Links" tab lists every link for a member with a status of `active`, `expired` or `revoked`, and revocation removes the cached projection rather than merely changing a status flag.

Rotation is automatic as well as manual, **on the share-dialog path only**. Creation prunes older active links per member and year in the same atomic operation, so sending a member a new invoice quietly retires an older link after the configured cap.

Expiry has a known data-layer asymmetry that is part of the remediation in §C29. The current tree does not repeat the retrieval details for the same reason.

### C32—what a leaked link exposes

**SUPPORTED, and the blast radius is narrower than a reader would assume.** A leaked link exposes the intended member's household view—including linked members—and no other household's data: `buildPublicShareData` is scoped to a `memberId` plus that member's `linkedMembers` (`src/lib/share.js:156-171`). Other households' names, amounts and payments are absent from the document by construction. What it does expose, for that household: the member's and linked members' names and avatars, the bills they are on with each bill's full monthly amount and the number of people splitting it, their annual and monthly shares, the household's total paid and balance, itemised service credits with free-text reasons, deferred usage charges with descriptions, the household's payment history as date/method/amount, and the coordinator's enabled payment methods including handles, URLs, a payee name, a postal address and a phone number where configured (`ShareView.jsx:630-669`). The free-text payment `note` is deliberately excluded (`src/lib/share.js:348`), and QR-code image blobs are stripped to a `hasQrCode` flag and fetched separately (`:216-220`).

Transport and lookup details are not repeated in the current tree while §C29 remains open. One privacy fact can still be stated without restating that recipe: server-side resolutions record the visitor's IP address in the coordinator's audit log, so the unauthenticated visitor is not anonymous to the person who sent the link.

### C33—whether the usability/privacy tradeoff was ever evaluated

**UNPROVABLE, and the honest answer is that no such record exists.** Issue #758 AC 8 asks the page to explain "how usability/privacy tradeoffs were evaluated." The artifact establishes the *outcome* thoroughly and the *evaluation* nowhere.

What exists: a one-line README feature bullet describing no-login share links, a one-line security bullet characterising the storage mechanism, and `specs/sharing.md`, which is 74 lines of acceptance criteria describing what the mechanism does and contains no rationale, no alternative and no rejected option. The current ledger does not repeat the implementation wording from those bullets under §C29. Eight ADRs live in `docs/adr/`; not one of them concerns share access, authentication, or the no-login decision. The two share-link pull requests that might have carried a rationale—`#65` "Persist share link… set 1-year defaults" and `#181` "share link lifecycle"—are implementation write-ups; `#181`'s Self-Review §Security discusses rate limiting and input validation and never touches the account-versus-link question.

```bash
S=d70aa8ac9fca414777985bb7dc74faa0462690e6; cd ~/GitHub/friends-and-family-billing
git grep -niE "without (an )?account|no.login|no account|friction|privacy|tradeoff|trade-off" "$S" \
  -- specs docs README.md AGENTS.md rules .ai_context.md
```

Six hits, none of them an evaluation. Defensible weaker form for the page: state the tradeoff as the author's own product judgment and show the *mechanism* that implements it—expiry, revocation, pruning to five, scope gating, member-safe projections that strip notes and QR blobs, and application-side authorization and rate limiting. That is a real answer to "how was this taken seriously," and it does not require asserting a deliberation that left no trace. Do not write that the tradeoff "was evaluated."

### C34—the audit trail's actual scope

**SUPPORTED that it exists and is genuinely rich; the scope is narrower than the phrase suggests, and most of it is invisible in the product.** §C16 established the append-only payment trail is real. Its full vocabulary is **fourteen event types**, all written into a `billingEvents` array on the billing-year document: `BILL_CREATED`, `BILL_UPDATED`, `BILL_DELETED`, `MEMBER_ADDED_TO_BILL`, `MEMBER_REMOVED_FROM_BILL`, `PAYMENT_RECORDED`, `PAYMENT_REVERSED`, `PAYMENT_UPDATED`, `USAGE_CHARGE_RECORDED`, `SERVICE_CREDIT_RECORDED`, `CHARGES_BILLED`, `REFUND_ISSUED`, `YEAR_STATUS_CHANGED`, `YEAR_CARRIED_FORWARD`.

```bash
S=d70aa8ac9fca414777985bb7dc74faa0462690e6; cd ~/GitHub/friends-and-family-billing
git grep -hoE "eventType: '[A-Z_]+'|_emitEvent\(\s*'[A-Z_]+'" "$S" -- src/lib/BillingYearService.js \
  | grep -oE "[A-Z_]{5,}" | sort -u
```

Every event carries `id`, ISO `timestamp`, an `actor` of `{type: 'admin', userId}`, the typed payload, a `note` and `source: 'ui'` (`src/lib/BillingYearService.js:485-497`). `BILL_UPDATED` is field-level with before-and-after values, for `name`, `amount`, `billingFrequency` and `website` (`:711-725`); `PAYMENT_UPDATED` carries `previousMethod`/`newMethod` and `previousNote`/`newNote` (`:988-1015`).

What it does **not** cover: adding, editing or removing a household member (`addMember` `:506`, `updateMember` `:541`, `removeMember` `:607` emit nothing), any settings change including payment methods and the email template (`updateSettings` `:1350` emits nothing), share-link creation or revocation, and the dispute lifecycle.

What is **visible**: one dialog. `BillAuditHistoryDialog` (`src/app/components/BillAuditHistoryDialog.jsx`) is reachable from a per-bill "View History" action (`src/app/views/Manage/BillsTab.jsx:487-488`) and filters to `e.payload.billId === billId` (`:13-15`). Payment events carry no `billId`, so **`PAYMENT_RECORDED`, `PAYMENT_REVERSED` and `PAYMENT_UPDATED` are written and never rendered anywhere in the product**—`billingEvents` appears in exactly two components (`git grep -ln billingEvents "$S" -- src` → `BillAuditHistoryDialog.jsx`, `BillsTab.jsx`, plus the service and persistence layers). `BILLING_EVENT_LABELS` (`src/lib/formatting.js:20-30`) defines nine labels for fourteen types; the other five would render as raw enum names if they ever reached a surface. The payment-edit audit that #113 shipped is, today, a record for a future reader of the database rather than a feature.

### C35—"append-only" is enforced by the code and by nothing else

**SPLIT: "append-only" is SUPPORTED as a code discipline and WRONG as an enforced property—nothing outside `BillingYearService.js` upholds it—and there is a second, genuinely enforced log that no surface has ever mentioned.**

`billingEvents` lives inside `/users/{uid}/billingYears/{yearId}`, whose rule is `allow read, write: if request.auth != null && request.auth.uid == userId` (`firestore.rules:11`)—no field constraints. ADR 0008 makes the exposure explicit: that document "is persisted by a full-document `setDoc` *without* merge from an explicit field allowlist (`buildSavePayload`)" (`docs/adr/0008-react-is-sole-writer-allowlist.md:4-6`). Every save rewrites the entire array. Append-only holds because `_emitEvent` returns `[...(this._state.billingEvents || []), event]` (`src/lib/BillingYearService.js:495`) and every caller spreads the previous array—a convention, in one file, with no rule, no Cloud Function, and no CI check behind it.

The genuinely enforced log is a different one. `/users/{userId}/auditLog/{logId}` carries `allow read: if request.auth != null && request.auth.uid == userId;` and `allow write: if false;` (`firestore.rules:48-51`)—clients cannot write it at all. It is populated only by the Admin SDK, from `appendAuditLog` (`functions/index.js:43-52`), with six actions: `share_link_accessed`, `dispute_submitted`, `dispute_decision`, `evidence_accessed`, `refund_confirmation`, `read`. Each carries a server timestamp and, for the unauthenticated paths, the visitor's IP. Nothing in `src/` ever reads this collection, so it has no UI either.

Precise form for the page: two trails, with opposite properties. The one the product shows is append-only by convention and partly rendered; the one nobody can forge is server-written, rules-protected, and invisible outside the Firebase console. Both are true and the pair is more interesting than either.

### C36—decision record 1, a link instead of an account: no record of the alternative, and the cost, from the mechanism

**SPLIT: the decision is real and its cost is derivable; "the account-based alternative was considered" is UNPROVABLE.** §C33 establishes there is no written evaluation. There is also no written *alternative*: nothing in `specs/`, `docs/adr/`, `README.md` or the share-link PRs proposes accounts for recipients, and the product has carried the token model since the pre-React app (`share.html` and a token flow exist in the first React port's tree, and `ShareView.jsx:3` describes itself as a "Port of share.html inline JS (~700 lines)").

What the decision cost is legible from the mechanism, without inference:

- **The link is the credential.** Anyone holding the URL is the recipient (§C29). There is no second factor, and the coordinator cannot tell one reader from another—`accessCount` counts visits, not people.
- **Recovery is out-of-band.** A dead link cannot be re-issued to the recipient by the recipient; `requestShareLink` emails the coordinator and stops (`functions/index.js:500`, `:554`), and the recipient waits.
- **Nothing can be personalised or remembered.** The page has no per-viewer state; the collapsed payment history and the QR modal are component state, gone on reload.
- **The recipient cannot act on their own record.** No payment self-report (§C25), no correction, no preference. Every write they can make is a *request* the coordinator dispositions.
- **Every capability is a link property, not a person property.** Enabling review requests means minting a link with `disputes:create` (`ShareLinkDialog.jsx:104`); a recipient's older links keep whatever scopes they were minted with, which is why the code carries graceful-degradation paths for links minted before `payments:read` existed (`src/lib/share.js:12-16`).

Defensible framing: present the rejected alternative as "give each household member an account," mark it as the author's own framing rather than a documented deliberation, and let the five costs above carry the tradeoff. They are checkable.

### C37—decision record 2, why four states, and where that decision actually happened

**SUPPORTED with a dated origin, and `ADR-0005` is NOT the record—that is a decoy of the same family §C17 already flagged.**

`docs/adr/0005-symmetric-owed-adjustment-model.md` is about usage charges and service credits as signed owed-modifiers. It never enumerates balance states. It does supply the *reason* `overpaid` has to exist: "A Service Credit lowers owed and, when the member has already paid, produces an overpayment **Credit** that rides #314's refund/carry pipeline" (`:20-23`). The states themselves are recorded in the specs, not an ADR: `specs/ui-components.md:92` enumerates all five outcomes of `getPaymentStatus`, and `specs/settlement-board.md:27` gives the derivation that makes `overpaid` meaningful—status comes from Net Contribution, so "a household whose Net Contribution equals its owed reads 'Settled' even when gross paid exceeds owed (e.g. after a refund), while a household carrying an unresolved overpayment reads 'Overpaid'."

**Where the decision happened.** The legacy vanilla-JS app had exactly three states. `getPaymentStatusBadge` at `main.js:1788` in `c1e4eaf` (Phase 0, 2026-03-20) returns Outstanding, Settled or Partial and has no overpaid branch. The fourth state arrived the next day, in the React port that claims to be its port:

```bash
cd ~/GitHub/friends-and-family-billing
git show c1e4eaf:src/main.js | sed -n '1788,1793p'          # three states
git log -L 10,10:src/app/components/StatusBadge.jsx \
  --format='%h %ad %s' --date=short d70aa8ac9fca414777985bb7dc74faa0462690e6 | head -3
# 5bfd24e 2026-03-21 Phase 2a: Shared components and service CRUD mutations
```

So the page's long-standing "three-state" line was true of the app it described until 2026-03-21 and false afterwards—a better story than a miscount. **Why four**: because an overpayment is a position the coordinator has to discharge, and `ADR-0004` bans the third option. "We deliberately removed any 'waiver' / 'write-off' path where the administrator keeps the overpaid cash… A future reader will not find a 'forgive credit' action—its absence is intentional" (`docs/adr/0004-credits-flow-back-to-the-member.md:11-17`). `ADR-0001` supplies the grain: credit is the household's net position, not the member's, and its rejected option is stated outright—"**Per-member credit and refund**—rejected: inconsistent with the household-based gate, and implies multiple payouts where one happens."

**What the extra state cost**: `overpaid` is not self-clearing. It opens a disposition the coordinator must close by issuing a refund or carrying the credit forward, which is the entire machinery of `creditAdjustments[]`, `REFUND_ISSUED`, `RefundNoticeService`, the `refunds:read` scope, the `submitRefundConfirmation` Cloud Function, and ADRs 0001 through 0004 and 0006. One badge pulled a whole subsystem in behind it.

Drafting note: the strongest decision-record material in this repository is **`ADR-0004`**, not the state count. It has a live rejected alternative, a stated reason, and an observable consequence in the code.

### C38—§C17's filter-chip correction

**§C17's original three-state claim remains WRONG, while its corrected four-state value is SUPPORTED; its original filter-chip citation was also WRONG.** §C17 now records the corrected boundary: the sort order carries all four states; the filter chips do not. This row re-derives both from scratch.

`src/app/components/SettlementBoard.jsx:121-126`, verbatim:

```js
const filters = [
    { key: 'all', label: 'All' },
    { key: 'outstanding', label: 'Outstanding' },
    { key: 'partial', label: 'Partial' },
    { key: 'settled', label: 'Settled' }
];
```

Four chips, and **none of them is Overpaid**. The counts object two lines above omits it too—`const counts = { all: rows.length, outstanding: 0, partial: 0, settled: 0 };` (`:113`), and `:114` increments only keys that already exist, so an overpaid household is silently excluded from every chip count. Filtering is `rows.filter(r => r.status === filter)` (`:119`), so an overpaid household is reachable only under "All". The sort order at `:109` is the one place that knows about it, and it sorts overpaid last.

A fifth outcome is also live and was not in §C17: `getPaymentStatus` returns `null` when `total <= 0` (`src/app/components/StatusBadge.jsx:20`), and the board coerces that to `'settled'` (`SettlementBoard.jsx:99`, `getPaymentStatus(owed, netForStatus) || 'settled'`). A household assigned to no bill reads Settled. `specs/billing-calculations.md:43` records the same behaviour deliberately.

Corrected evidence sentence: **four named states in the model and the badge, four chips of which one is "All", and no way to filter for Overpaid.** If the page draws a decision card around the state model, this is the cost line—the fourth state was added to the model and never given a place in the board's own navigation.

### C39—the recipient sees two states, not four

**SUPPORTED, and it is the sharpest coordinator/recipient contrast in the product.** `StatusBadge` is never imported by `ShareView.jsx`. The share page derives its own state from the payment summary alone: `derivePaymentState` (`src/app/views/ShareView.jsx:48-54`) returns `isOwed` when `balanceRemaining > 0`, `isSettled` when nothing remains and something has been paid, and neither otherwise. Its docstring says so explicitly—"an overpaid/zero balance with payments still reads as settled." The lead callout renders exactly two panels, a green "You're all settled for {year}" and a red "{amount} due for {year}" (`:79-104`).

So the four-state model is a coordinator instrument. The recipient is shown a binary and a number. That is a defensible product statement and it is checkable in two files.

### C40—decision record 3: the invoice a household member receives does not use the canonical renderer

**WRONG at audit time and still wrong in the companion blog; corrected on the current project page.** At audit time the page and blog both implied that `renderInvoiceTemplate` governed the invoice email a household member receives. It governs the Invoicing tab's Preview and the "Send test email" button; it does not govern the recipient invoice, it never did, and PR #161 never touched that file. The current MDX page now states that boundary explicitly, while blog follow-up #857 remains open.

The Cloud Function chooses its renderer on one condition (`functions/index.js:1280-1282`):

```js
const htmlBody = wrapEmailHtml(typeof html === "string" && html.trim()
  ? html
  : simpleMarkdownToHtml(body));
```

So an email carries canonical HTML only if its producer supplied an `html` field. Exactly one producer in the entire application does:

```bash
S=d70aa8ac9fca414777985bb7dc74faa0462690e6; cd ~/GitHub/friends-and-family-billing
for f in src/app/components/DisputeDetailDialog.jsx src/app/components/EmailInvoiceDialog.jsx \
         src/app/views/Manage/InvoicingTab.jsx src/lib/RefundNoticeService.js; do
  echo "--- $f"; git show "${S}:$f" | grep -n -A 8 "queueEmail(" | grep -E "queueEmail\(|html:|body:"
done
```

`InvoicingTab.jsx:420-426`, the `[Test]` email, passes `html: payload.html`. `EmailInvoiceDialog.jsx:142`—the dialog behind the settlement board's per-member "Email Invoice" action, mounted at `src/app/views/Dashboard/DashboardView.jsx:296-311`—passes `{ to, subject, body: finalBody, uid }` and no `html`. `DisputeDetailDialog.jsx:160` and `:359` and `RefundNoticeService.js:117` likewise. The real invoice body is built by `buildInvoiceBody` (`src/lib/invoice.js:599`), which runs the template through `buildConfiguredInvoiceMessage` → `docToPlainTextWithTokens` (`:487`)—**the markdown bridge §C11 found surviving on main is not merely surviving, it is the only path the production invoice takes**—and the Cloud Function then renders that plain text with `simpleMarkdownToHtml`, the function the whole arc exists to have displaced.

PR #161 did not touch it. `git show --stat 1a87dfc` lists eight files: `docs/agents/operating-rules.md`, `functions/index.js`, `src/app/views/Manage/InvoicingTab.jsx`, `src/lib/invoice.js`, `src/lib/mail.js`, `tests/e2e/invoicing-editor.spec.js`, `tests/react/lib/invoice.test.js`, `tests/react/views/InvoicingTab.test.jsx`. `EmailInvoiceDialog.jsx` is absent, and its `queueEmail` call is byte-identical in shape before and after:

```bash
cd ~/GitHub/friends-and-family-billing
git show f98cb3a:src/app/components/EmailInvoiceDialog.jsx | grep -n 'queueEmail'   # pre-#161
git show 1a87dfc:src/app/components/EmailInvoiceDialog.jsx | grep -n 'queueEmail'   # post-#161
git show d70aa8ac9fca414777985bb7dc74faa0462690e6:src/app/components/EmailInvoiceDialog.jsx | grep -n 'queueEmail'
```

There is a second, sharper way to state it. Before #161 the test email and the invoice email rendered identically—`InvoicingTab` at `f98cb3a:419` sent `body: rawText` with no `html`, exactly like `EmailInvoiceDialog`. #161 gave the test email canonical HTML and left the invoice email where it was. **The fix closed the gap on the surface where the bug was observed and opened a new one between the test email and the real invoice.** That divergence has stood since 2026-04-04.

**Two earlier rows are corrected inline rather than left to contradict this evidence.** §C11 now narrows the unification to Preview and the test email and states that the recipient invoice remained on the bridge. §C20's headline now changes from SUPPORTED to SPLIT: the invoice builder and preview are supported, while the preview-to-recipient parity claim is wrong. Both rows now carry the invoice-email boundary before anything is copied out of them.

Corrected value now carried by the page: one canonical renderer produces the template body for the Invoicing tab's preview and for the test send; the invoice email itself still renders from the plain-text bridge. Do not write that the recipient's email comes from the same renderer as the preview. If the product wants the stronger claim, its repository has to earn it first.

### C41—the editor was never on the canonical path

**WRONG as a decision-record title. "One canonical renderer for editor, preview and email" describes the brief, not the shipment.** The editor is TipTap/ProseMirror rendering its own DOM: `InvoicingTab.jsx:319-348` mounts `<TemplateEditor content={bodyDoc}>` and the preview is a separate branch at `:359-366` that injects `previewBodyHTML`, built at `:196-197` from `buildInvoiceTemplateEmailPayload`. The two never share a render. They cannot: the editor shows unresolved token pills (`data-token-id="first_name"` and friends, asserted at `tests/e2e/invoicing-editor.spec.js:39-42`), and the renderer resolves those tokens against a member context.

The companion blog already states the narrow version correctly—"The editor still renders its own DOM directly from the document" (`six-prs-one-bug-agent-failure-modes.md:270`)—and the project page does not currently claim otherwise. The risk is entirely in the *new* decision-record card the outline proposes. Retitle it: **one canonical renderer for preview and test-email body**, with the editor named as a deliberate third surface whose job is authoring, not fidelity. Two surfaces, not three, and the invariant is semantic rather than visual—`#159`'s own wording, "Text that is not bold in the editor must not become bold in Preview or sent email."

### C42—the envelope claim on the page, verified, plus what the envelope also does

**SUPPORTED for the shared envelope, with different body inputs.** The page now reads: "Both sent messages share an envelope that restyles the body—one more reason the parity claim is about the markup, never the pixels." `wrapEmailHtml` (`functions/index.js:1100-1129`) is that envelope: a full `<!DOCTYPE html>` document, a purple-gradient header band containing "Friends &amp; Family Billing", a 600px white container, the body, and a footer reading "Sent via Friends &amp; Family Billing". The test email wraps canonical HTML; the recipient invoice wraps the separately rendered plain-text body described in §C40. Sharing the envelope does not imply sharing the body renderer. All three envelope elements are visible in the published screenshots (§C47).

The addition the page does not make: the envelope also carries a `<style>` block that **restyles the canonical body**—`.body p { margin: 0 0 1em 0; }`, `.body a { color: #6E78D6; text-decoration: underline; }`, `.body h2`, `.body ul`, `.body li`, `.body pre, .body code`. So even for the test-email body, preview and test email agree on the HTML and not on its presentation; the preview renders under the app's stylesheet and the email under the envelope's. That is a further reason to keep the parity claim semantic. Nothing tests `wrapEmailHtml`—`git grep -n 'wrapEmailHtml\|simpleMarkdownToHtml' d70aa8ac9fca414777985bb7dc74faa0462690e6 -- tests` returns zero.

### C43—regression proof: what exists, what it covers, and whether it gates merges

**SPLIT: two real regression tests exist and both run in a required check; neither covers what #159's definition of done asked for, and the Playwright spec covers something adjacent.**

The two tests. `tests/react/lib/invoice.test.js:828-837`, titled "uses the same canonical HTML for preview and sent email payloads", asserts `payload.html === renderInvoiceTemplate(ctx, shareUrl)`—true by construction at `src/lib/invoice.js:472`, which means it catches exactly one regression: someone re-pointing the payload builder at a different renderer, which is the #144-era failure. `tests/react/views/InvoicingTab.test.jsx:145-163`, "sends the same HTML shown in preview when sending a test email", is the stronger one: it renders the tab, switches to Preview, clicks Send test email, and asserts `queueEmail` was called with `html: previewBody.innerHTML`. That is a genuine DOM-to-payload equality check—**on the test-email path only** (§C40).

The Playwright spec is adjacent, not central. `tests/e2e/invoicing-editor.spec.js` has seven tests: token pills render, typing does not lose focus, bold applied via the toolbar appears in preview, pill styling, bold on existing text appears in preview, tab switching preserves content, and the dirty indicator. Two of them ("bold formatting applied via toolbar shows in preview", `:65-88`; "bold on existing text shows correctly in preview", `:99-116`) touch the editor→preview half of the invariant by asserting `<strong` appears in the preview HTML. **None compares preview HTML to email HTML, and none touches the sent email at all.** The spec's real value is that it exists: it arrived in #158 and its CI wiring in #160, both mid-arc.

Merge gating is real. `.github/workflows/test.yml` runs `npm test`, then installs Chromium and runs `npm run test:e2e` (`:28-32`) inside a single job whose id is `test`, and `test` is a required status check on `main`. As of **2026-08-29T03:02:28Z** the required contexts on the most recent merged PR (`#423`) are `test`, `lint`, `Self-Review Required`, `Label Gate`, `Merge clearance gate`, `CodeRabbit unresolved blocking findings` and `Codex P1 unresolved threads`:

```bash
date -u '+%Y-%m-%dT%H:%M:%SZ'
eval "$(/opt/homebrew/bin/brew shellenv)" && GH_TOKEN="$OP_PREFLIGHT_REVIEWER_PAT" gh api graphql -f query='
{ repository(owner:"nathanjohnpayne", name:"friends-and-family-billing") {
    pullRequest(number:423) { commits(last:1){ nodes { commit { statusCheckRollup { contexts(first:60) { nodes {
        ... on CheckRun { name isRequired(pullRequestNumber: 423) }
        ... on StatusContext { context isRequired(pullRequestNumber: 423) } } } } } } } } }' \
  --jq '[.data.repository.pullRequest.commits.nodes[0].commit.statusCheckRollup.contexts.nodes[]
         | select(.isRequired==true)] | map(.name // .context) | unique'
```

Note the `/branches/main/protection` endpoint returns 404 to the reviewer PAT (insufficient scope), while `/branches/main` reports `"protected": true`; the GraphQL `isRequired` query above is the reproducible route. Defensible statement for the page: yes, a parity regression test gates merges—and it guards the preview-to-test-email equality, not the preview-to-invoice equality.

### C44—agent rotation is visible in the record, and it is written into the brief

**SUPPORTED, three independent ways, which is unusual for a claim of this shape.** Every PR in the arc is git-authored by `nathanjohnpayne`, so the author field says nothing. The agent is in the `Authoring-Agent:` trailer that this repository's review policy requires in every PR body. As of **2026-08-29T03:07:02Z**:

```bash
date -u '+%Y-%m-%dT%H:%M:%SZ'
eval "$(/opt/homebrew/bin/brew shellenv)"
for n in 144 146 153 154 155 156 157 158 160 161; do echo -n "#$n: "
  GH_TOKEN="$OP_PREFLIGHT_REVIEWER_PAT" \
    gh api "repos/nathanjohnpayne/friends-and-family-billing/pulls/$n" --jq '.body // ""' \
    | grep -iE '^Authoring-Agent:'; done
```

`claude` on #144, #146, #153, #154, #155, #156, #157, #158 and #160; **`codex` on #161**. Two corroborating signals: #161 is the only branch in the set carrying an agent prefix, `codex/issue-159-rendering-pipeline`, and the only title carrying one, "[codex] Fix invoice template rendering parity".

The rotation is not merely observable after the fact—it is **stated in the brief**. Issue #159, filed 2026-04-04T16:52:16Z, thirty-six minutes after #158 merged at 16:16:41Z, opens its root-cause section with "Codex should verify these" (`#159` body, § Root-cause hypotheses). So the record shows a human writing a brief addressed to a different agent than the one that had failed three times. That is a designed rotation, not a sequence of events, and §M4 is satisfied because the evidence is a written instruction rather than an inferred intention.

### C45—the ban: what it says, and what enforces it

**SPLIT: the written non-goal is SUPPORTED and quotable verbatim; "anything enforces it" is WRONG—nothing does.** Issue #159, § Non-goals, in full:

> Do not "fix" this by merely making Preview look closer while leaving the actual sent HTML different. The final sent email is the source of truth and the editor/preview must match it.

That is the whole of it: two sentences, in one issue, addressed to one agent, on one task. There is no repo rule, no CI check, no lint, no test and no policy file that would stop the next agent from doing exactly what it forbids. `git grep -niE "preview|parity" d70aa8ac9fca414777985bb7dc74faa0462690e6 -- rules docs/agents AGENTS.md` finds nothing on the subject, and #161's only non-test change outside `src/` and `functions/` was three lines in `docs/agents/operating-rules.md`. The ban is a sentence in a brief, and its force came from being read by the agent it was written for.

There is a genuine irony the page may use if it wants one: the non-goal says the final sent email is the source of truth, and §C40 shows the fix landed on the preview and the test email while the final sent email was left alone.

### C46—the invariant, the definition of done, and the two clauses that were not met

**SPLIT.** Issue #159 states the invariant plainly under § What needs to be fixed: "There must be **one canonical rendering model** for invoice emails. The same template content should produce the same result in: Edit mode, Preview mode, Sent email HTML." Its § Definition of done has four clauses, and two of them were not met at merge and are still not met at the pinned SHA.

Met. "Preview matches the sent email"—for the test send (§C43). "The sent email matches the intended formatting shown in the April 2, 2026 at 5:05 PM screenshot"—the visual target, on the test-email path (§C47).

Not met. **"The editor accurately reflects final output."** The editor shows unresolved token pills and renders its own DOM (§C41); it cannot reflect final output and was never made to. **"Automated regression tests exist to prevent this drift from returning"**, expanded in the acceptance criteria to "Snapshot or HTML comparison tests… between: editor output, preview output, sent email HTML." The tests that landed compare preview output to the test-email payload and the payload builder to the renderer (§C43). No test compares editor output to anything, and no test touches the invoice email.

This does not weaken the operating-model story; it is the operating-model story. The reframed brief produced a fix that held on the surface it named, and the parts of the brief nobody turned into a check are the parts that did not hold. Which is precisely the thesis the companion blog already argues: an invariant that is prose is an invariant nobody reviews.

### C47—the "known-good" reference email was a test email the author sent to himself

**WRONG if any surface calls the screenshots the email a household member received. Both are `[Test]` messages addressed to the author.** The four parity screenshots are committed twice—`.github/screenshots/invoice-bug-0{1..4}-*.png` in the product repository, and `public/blog/six-prs-one-bug-agent-failure-modes/img/` in the site repository, where they are already published and served at `/blog/six-prs-one-bug-agent-failure-modes/img/`. Reading the two email images at site SHA `582b91d4db70abff8287307d7e6502ae41d6a268`:

- `invoice-bug-03-broken-sent-email.png`—header row shows a `[Test]` annual-summary subject addressed to the author at 9:31 AM; household and recipient names are withheld here.
- `invoice-bug-04-correct-sent-email.png`—header row shows a `[Test]` annual-summary subject addressed to the author on April 2, 2026 at 5:05 PM; the household member's name is withheld here.

Issue #159 captions the third "This is the email the system is presently sending" and the fourth "the known-good rendering… the visual target." The artifact is a self-addressed test send in both cases. This is not a contradiction of the issue—a test send did render through the same pipeline as the invoice at that date (§C40)—but it is a precise fact, it corroborates §C40 independently, and it means the page must not describe these images as what a family member received.

Both images also confirm §C42 visually: the purple gradient header, the white container, and the "Sent via Friends & Family Billing" footer are all present in the email and absent from the preview screenshot. And both confirm §C24 from the other direction: the email carries only a personalised greeting, a one-sentence total, and a named link—no per-bill arithmetic. The derivation is the share page's contribution.

### C48—household outcomes: what record exists, and the validation boundary

**UNPROVABLE as usage data; four repository artifacts touch real use and none of them is a count.** §C1 already ruled the household of eight autobiography. AC 7's other asks—cycles, invoices, self-service behaviour, reduced clarification, disputes—have no repository record either. Exhaustively, what exists:

1. **No seed, demo, or fixture dataset of household use.** Every `fixtures/` path in the tree belongs to the propagated CI harness (`scripts/ci/fixtures/**`, `tests/fixtures/phase_4b_verdicts.jsonl`); none is product data. There is no Firestore export in the repository.
2. **Analytics exist and instrument only authentication.** `src/lib/firebase.js:42-47` initialises Firebase Analytics behind an `isSupported()` guard, and `src/app/views/LoginView.jsx:60`, `:79`, `:115` log exactly three events—`login`, `sign_up`, and the Google-provider variant. Nothing logs a share-page view, an invoice send, or a dispute. The data, such as it is, lives in Google Analytics and not in the repository.
3. **The one real usage counter is in production and was not read.** The product stores per-link access metadata and server-side audit entries for some resolution paths (§C27, §C35). This audit did not touch production. If the author wants a defensible self-service number for the page, that is where it lives, and reading it would be a legitimate follow-up—the counter measures visits rather than people, and the server-side audit path does not observe every application load.
4. **One test fixture has production-derived provenance.** Because its exact content concerns a real person, this public ledger deliberately does not quote the strings, identify the household member, reproduce the amount or characterise the payment status. The fixture is not evidence of adoption or aggregate outcomes.

**Validation-boundary sentence, written for the page to use verbatim—CORRECTED 2026-08-29, see §C51.** The clause "One household has used this product" was wrong on both the count and the grouping, and because this sentence exists to be copied verbatim it reached the published page unaltered. Use this version and no earlier one: *The repository holds no usage record—no seed data, no exported dataset, and analytics that instrument sign-in and nothing else. One group of nine has used this product; the only numbers that could substantiate how much live in the running system's per-link view counters, not in the source. What the repository can show is the mechanism and the care taken with it, not adoption.*

### C49—the frontmatter that survives the restructure

**SUPPORTED, with two notes.** Field by field at site SHA `582b91d4db70abff8287307d7e6502ae41d6a268`:

- `description: "A cloud-synced billing tool that turns recurring shared costs into clear invoices, payment tracking, and shareable summaries."`—all four clauses hold. Cloud-synced: Firestore with a save queue (`src/lib/SaveQueue.js`). Invoices: `src/lib/invoice.js`. Payment tracking: the payments ledger plus the settlement board. Shareable summaries: §C23. **This exact sentence is duplicated verbatim in the OG template** (§C50).
- `kicker: "AI × Utility × Finance"`—a house convention, not a product claim: six of the seven project pages open with "AI ×" (`device-source-of-truth`, `friends-and-family-billing`, `matchline`, `mergepath`, `override`, `swipe-watch`; only `five-across` does not). There is no AI in the product—no model call anywhere in `src/` or `functions/`—so "AI" here refers to how it was built, consistent with its siblings. Leave it alone; do not turn it into a sentence.
- `metadata.format: "Household coordination tool"`—**SUPPORTED when written; SUPERSEDED 2026-08-29, see §C51.** It was supported against the framing that the users are one household, which §C51 refutes. The field now reads `Shared-cost coordination tool`; do not restore the old value from this row. `metadata.focus: "Shared subscriptions and recurring group expenses"`—narrow but true; the product also handles ad-hoc usage charges, service credits, refunds and year carry-forward (`ADR-0005`, `ADR-0004`, `ADR-0006`), none of which is a subscription. "Recurring shared costs and the adjustments around them" would be more accurate if the field is being touched anyway.
- `stack`—re-verified against §C21 at the new SHA; unchanged and still correct.
- `related`—both targets exist: `src/content/blog/six-prs-one-bug-agent-failure-modes.md` and `src/content/projects/override.mdx`. Override reciprocates at `override.mdx:66-67`. The body's third link, `/blog/agent-approval-workflow-genesis-of-mergepath/`, also resolves.
- `liveUrl`—reachable. `curl -sS -o /dev/null -w '%{http_code}' -L https://friends-and-family-billing.web.app` returned **200** with `<title>Friends & Family Billing</title>` at **2026-08-29T03:03Z**. The page behind it is the SPA's login gate; a reader clicking through sees a sign-in screen, which is worth knowing before the page invites them to.
- `status: "SHIPPED"`—SUPPORTED as "shipped and running". It should not be stretched into "actively developed": the most recent change to `src/` that is not a dependency bump or a template sync is `049f8ad`, 2026-07-06, PR #388 ("fix(charge-notice): hoist chargeNoticeId guard before share-link side effects"), and everything since is Dependabot and propagation. `git log d70aa8ac9fca414777985bb7dc74faa0462690e6 --format='%h %ad %s' --date=short -40 -- src | grep -viE 'deps|dependabot|sync to mergepath'`.

### C50—cross-surface sweep

**SPLIT: at audit time the parity claim was WRONG on six surfaces beyond this page, one of them a Mermaid diagram and its `description=` attribute; the description sentence is SUPPORTED but copied or closely varied across ten files beyond the page, including a test that pins the homepage variant.** The page and this ledger's §C11, §C20 and §C42 rows are now corrected; the companion blog and its ledger remain tracked in #857. Swept on meaning across the whole vocabulary, not on the phrasing, per the #757 finding.

**The parity claim (§C40, §C41).** Surfaces that assert or imply that the sent email is produced by the canonical renderer:

| Surface | Line | What it said at audit time | Disposition |
|---|---|---|---|
| `src/content/projects/friends-and-family-billing.mdx` | former :33 bullet 2 | "a live preview rendered by the same canonical renderer that builds the email's template body" | Corrected in #858 to Preview and test email |
| `src/content/projects/friends-and-family-billing.mdx` | former body ¶5 | "#161 … bypassed the bridge and unified Preview and email onto a single canonical renderer" | Corrected in #858 to Preview and test send, with the invoice path named separately |
| `src/content/blog/six-prs-one-bug-agent-failure-modes.md` | :256-266 | code block presenting the `html: payload.html` call as the winning change—it is `InvoicingTab`'s test-email call | Yes, or label it |
| `src/content/blog/six-prs-one-bug-agent-failure-modes.md` | :268 | "The Cloud Function now sends trusted app-generated HTML when provided" | Accurate as written—"when provided" is load-bearing and the post should keep it |
| `src/content/blog/six-prs-one-bug-agent-failure-modes.md` | :270 | "the **template body** in both the preview and the sent email is produced by `renderInvoiceTemplate`" | Yes—already narrowed once, still one step too wide |
| `src/content/blog/six-prs-one-bug-agent-failure-modes.md` | :272-288 | Mermaid `title=`, `description=`, and nodes `E["Email<br/>Body HTML"]` → `F["Sent Email<br/>(body + envelope)"]` | Yes—the `description=` attribute is the accessible text and asserts it too |
| `plans/759/six-prs-one-bug-agent-failure-modes-ledger.md` | :113, :304, :307 | the ledger's own rows, which narrowed the claim to the template body and stopped there | Add a pointer to §C40; do not silently restate |

Note the blog is already one narrowing deep on this claim—its §270 paragraph and its diagram were both rewritten to name the envelope. That is exactly the pattern the process doc calls "a correction is not done when the reported line is fixed": the narrowing was correct as far as it went and stopped one surface short of the invoice email.

**The description sentence (§C49).** "Cloud-synced… clear invoices, payment tracking, and shareable summaries" or a near-variant lives in ten files beyond the page:

- `src/pages/og-templates/projects/friends-and-family-billing.astro:8`—the project `description` **verbatim**. Changing the frontmatter without this leaves the social card asserting the old sentence.
- `src/pages/index.astro:209`—"Cloud-synced shared-bill coordination for families and friend groups—turns recurring costs into clear annual invoices, payment tracking, and shareable summaries."
- `tests/project-pages.test.js:73`—**hard-codes that homepage sentence verbatim** in `homepageProjectDescriptions`. The homepage card cannot change without this test changing.
- `src/content/resume/projects/friends-and-family-billing.md:8`—"Cloud-synced shared-bill tool for recurring group expenses, annual invoices, payment tracking, and shareable summaries. Source of the 'Six PRs, One Bug' AI-debugging case study."
- `~/GitHub/docs/job-search/nathan-payne-resume.md:121` and `~/GitHub/docs/job-search/nathan-payne-resume.html:854`—the canonical résumé and its HTML render, both carrying that sentence word for word. Per the two-surfaces-verbatim rule they must match the site mirror.
- Four tailored résumé variants carry the same entry: `apple/nathan-payne-resume-apple-v2.md`, `google/nathan-payne-resume-google.md`, `mux/nathan-payne-resume-mux.md`, `waymo/nathan-payne-resume-waymo.md` (`grep -rl "Shared-Bill Coordination" ~/GitHub/docs/`).

Two further site surfaces are structural rather than prose and constrain the restructure: `tests/resume.test.js:262-272` pins the résumé project ordering and the exact entry title "Friends & Family Billing – Shared-Bill Coordination"; `tests/responsive/overflow.spec.ts:8` and `tests/project-pages.test.js:53,63,722` pin the route and the nav label. None of those needs to change unless the title or ordering does.

**Artifacts for AC 9.** The four parity screenshots already exist in `public/blog/six-prs-one-bug-agent-failure-modes/img/` and are already published, so the page can reference them with no new asset work—but they show three surfaces *disagreeing* plus a target, not five surfaces agreeing, and two of them are `[Test]` emails (§C47). No settlement-board or share-page screenshot exists in this repository at all; the product repository holds nineteen images at `.github/screenshots/`, four of them the invoice-bug set already published here and fifteen others (`01-settled-pill.jpeg`, `02-payment-history.jpeg`, `03-share-links-new.jpeg`, `04-share-links-manage.jpeg`, `09-history-modal.jpg` and the rest) that would have to be copied across and checked for household data first. One caution before republishing anything from that set: the published email screenshots already expose the author's Venmo, Cash App and PayPal handles in the clear, and the Apple Cash and Zelle values are blurred rather than removed. The same handles and a phone number sit unredacted in a public test fixture at `tests/react/lib/invoice.test.js:802-806`—worth a separate issue in the product repository, and out of scope for this page.


### C51—the household framing was wrong in both halves, corrected by the author

> ":74 My husband and I split T-Mobile, Apple One, and 1Password across a household of eight people."

**WRONG on the count and on the grouping. §C1 called this UNPROVABLE from repository artifacts and told the page to treat it as autobiography; the author has now supplied the autobiography, and it refutes the sentence twice.**

The eight came from `README.md:269-273`, the worked example §C1 identified as illustrative documentation rather than a record of who uses the product. The real figure is **nine people**, and they are not one household. Supplied by the repository owner on 2026-08-29 and refined twice in the same exchange, which is why the count is exact rather than hedged: the author and his husband (one household, two people); his sister and her family (one household, three people); his parents, in a household separate from the sister's (one household, two people); and two friends, **each in a household of their own**. **Nine people in five households.** An intermediate draft of this row said "four or five" because the friends' arrangement had not yet been stated; it had to be asked rather than inferred, and the page carried "separate households" without a count until it was.

Two consequences beyond the opening sentence, both of which the page carried:

- The `constraints` chip read `1 household`, and the §C48 validation-boundary sentence read "One household has used this product." Both asserted the same wrong grouping in the same wrong words. Corrected to `9 people` and "One group of nine has used this product." **§C48's sentence was written to be quoted verbatim and was quoted verbatim, which is exactly how a defect in an evidence artifact reaches a published page unaltered.**
- `metadata.format` read `Household coordination tool`, which §C49 passed as SUPPORTED. It was supported against the old framing and is not against the corrected one; now `Shared-cost coordination tool`.

**The product's own vocabulary is untouched and should stay.** `buildPublicShareData`, the settlement board and the UI all model the billing group as a *household*, and the page keeps that word wherever it describes the product. What was wrong is the autobiographical claim that the nine people *are* one household, not the data model that calls a billing group one.

The correction also supplies something the page had been missing: **the product is called Friends & Family Billing because the group is family and friends across households.** The name encodes the fact the page got wrong, and the opening now says so.

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

For scale, at the page's first authoring (2026-04-16) the count was 7. Corrected value at the time of this audit: 71 fail-closed checks, 70 wired into `repo_lint.yml` across 85 invocations. Both instances must change together—see §H4. **SUPERSEDED 2026-08-28—see §E28: 72 on disk, 71 wired, 80 invocations, and the 85 was a counting defect** (the matcher counted comment lines as invocations). Do not copy 71/70/85 out of this row.

### E12—`op-preflight.sh`

> ":43 1Password-backed credential plumbing via `scripts/op-preflight.sh` that front-loads all biometric prompts so a session's author and reviewer PATs, GCP ADC, and SSH keys are cached once and reused."

**SUPPORTED.** The script exists, `scripts/ci/check_op_preflight_contract` guards its interface, and the `--mode all` / `--check` contract behaves as described. One caveat worth knowing but not worth page space: `--check` defaults to `--mode review`, so a `--check` without `--mode all` drops the deploy credentials—"cached once and reused" holds only within a mode.

### E13 and E14—the propagation manifest

> ":47 `scripts/sync-to-downstream.sh` reads a `.mergepath-sync.yml` manifest that declares which paths are *canonical* (mirrored byte-for-byte) and which are *kit* directories … along with which of the nine consumer repos opt in."

**SUPPORTED when written; every figure in this row is SUPERSEDED 2026-08-28—see §E31 (eight consumers) and §E33 (137 canonical, 5 kit, and a third `templated` type this row does not know about). Do not copy nine, 127 or seven out of this row.** As of the audit below, nine was exact. `.mergepath-sync.yml:122` `consumers:` lists precisely nine: `matchline`, `nathanpaynedotcom`, `overridebroadway`, `device-source-of-truth`, `friends-and-family-billing`, `device-platform-reporting`, `swipewatch`, `tadlockpsychiatry`, `gaycruisebingo`. Path types: **127** entries `type: canonical`, **7** `type: kit`.

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

**SUPPORTED when written; SUPERSEDED 2026-08-28—see §E31.** Nine consumers in `.mergepath-sync.yml` (§E13) plus the hub was ten, and all five named repos are on the list. **The fleet is now nine repositories: the hub plus eight consumers.** `device-platform-reporting` was archived on 2026-08-26 and dropped from the manifest by `be07b42` (#1116). Do not copy "ten" out of this row.

### Delta audit for #753—rows added 2026-08-28

Thirty-five rows (§E28–§E62) covering the claims #753 puts on the Mergepath page that §E1–§E27 do not reach: the counts re-derived at a fixed SHA with an as-of, the identity and actor model, the routing configuration as it stands today, the propagation regression tracked in `mergepath#1132`, exact-head clearance, the reply/resolve split in the feedback accounting gate, the bounds on adoption, the impact question #753 AC 6 asks, and the first pass this ledger has ever made over the 2,439-line PRD at `~/GitHub/docs/projects/mergepath/prds/mergepath.md`. Everything below was read at **`3d961050e203e8b7a55bb551e89aa4da834356f6`** in `~/GitHub/mergepath` (short `3d96105`, 2026-08-28 12:44:40 −0700, subject "fix(policy): make the Self-Review gate markdown-aware, nothing more (#1136)"), against `nathanpaynedotcom` at **`da6b69c285aa126e9ac3ff415ef88992b039a626`**. **Every command against those two trees is written against those literal SHAs rather than `origin/main`**, per the #820 finding that a moving ref makes a row unreproducible. Three other evidence sources appear below and are pinned or labelled separately, because this header does not cover them: the docs repository at `~/GitHub/docs` (§E53–§E56), the **eight consumer repositories, each at its own SHA recorded in §E58**, and **live GitHub API reads**, which are inherently unpinnable and therefore carry an explicit as-of timestamp in their own rows (§E29 at 2026-08-28T20:09:55Z, §E42, §E46 at 20:20Z). A row citing live API state is reproducible only in the sense that the query is stated; the value will move. the tree was materialised with `git archive 3d961050e203e8b7a55bb551e89aa4da834356f6 | tar -x -C <dir>` so the scripts could be *run* rather than read. Note the pinned SHA is itself the merge commit of `mergepath#1136`, which lands three hours before this audit; several rows below turn on that.

Six rows correct a number the page currently states—§E28, §E29, §E31, §E33, §E46 and §E48, with §E31 and §E46 both landing on the consumer count. Three—§E40, §E37 and §E52—change what the page can claim, and the first two are cases where a hypothesis handed to this audit as settled turned out to be false at this SHA. §E52 is the row to read first: the page's own second premise, that branch protection is mandatory, is contradicted by a measurement the repository took of itself.

### E28—the CI check counts, re-derived with an as-of

> ":40 seventy-one at an August 2026 count … seventy of them wired into `repo_lint.yml`"

**WRONG by one on both figures, and §E10's counting method was defective.** At the pinned SHA there are **72** `check_*` files in `scripts/ci/`, **71** distinct checks wired as real `run:` steps in `.github/workflows/repo_lint.yml`, and **80** invocation steps (seven checks run more than once with different arguments: `check_git_identity_hygiene` four times, and `check_coderabbit_wait`, `check_doc_ownership`, `check_merge_clearance_gate`, `check_no_token_in_output`, `check_phase_4b_accounting`, `check_phase_4b_automation` twice each). One file is unwired, `check_op_firebase_deploy_integration`, and it is unwired *by declaration* rather than by oversight—`repo_lint.yml:350` carries `# WIRED-EXEMPT: check_op_firebase_deploy_integration — opt-in`, a marker `scripts/ci/check_ci_scripts_wired:157-162` parses.

§E10's third figure, 85 invocations, came from `grep -cE 'run:\s*\./scripts/ci/check_'`, which also matches six comment lines that use `run: ./scripts/ci/check_X` as a *worked example* of the wiring rule (`repo_lint.yml:6`, `:19`, `:22`, `:28`, `:225`). The loose matcher returns 86 here; the disciplined one returns 80. Anchoring on `^[[:space:]]*run:` is the fix.

The best figure for the page is the one the repository computes about itself, because it cannot drift from the tree:

```bash
S=3d961050e203e8b7a55bb551e89aa4da834356f6
MP="$(mktemp -d)" && git -C ~/GitHub/mergepath archive "$S" | tar -x -C "$MP" && cd "$MP"
./scripts/ci/check_ci_scripts_wired
# check_ci_scripts_wired: PASS (72 check_* scripts, all wired or exempt)
```

Reproduce the three figures separately:

```bash
S=3d961050e203e8b7a55bb551e89aa4da834356f6; cd ~/GitHub/mergepath
git ls-tree -r --name-only "$S" scripts/ci/ | grep -c '/check_'                                   # 72
git show "${S}:.github/workflows/repo_lint.yml" \
  | grep -oE '^[[:space:]]*run:[[:space:]]*\./scripts/ci/check_[A-Za-z0-9_]+' \
  | grep -oE 'check_[A-Za-z0-9_]+' | sort -u | wc -l                                              # 71
git show "${S}:.github/workflows/repo_lint.yml" \
  | grep -cE '^[[:space:]]*run:[[:space:]]*\./scripts/ci/check_'                                   # 80
```

Corrected value, and it must carry the date: **"72 fail-closed checks as of 2026-08-28, 71 of them wired into `repo_lint.yml` across 80 invocations, and one exempted by name."** Per §H7 this decays; the form that ages is the one the page already uses—a dated series (7 in April 2026, 27 in mid-May, 72 on 2026-08-28) plus the self-checking gate, which is a shape rather than a number.

### E29—merged PRs on the hub

> ":62 The Mergepath repo itself has 447 merged PRs as of August 2026"

**WRONG, and decaying fast enough that only a floor is safe.** **470** merged as of **2026-08-28T20:09:55Z**; 484 PRs opened in total. §E22 recorded 447 and the #753 brief carried 469, so the figure moved twice inside the audit window.

```bash
date -u '+%Y-%m-%dT%H:%M:%SZ'
GH_TOKEN="$OP_PREFLIGHT_REVIEWER_PAT" gh api -X GET search/issues \
  -f q='repo:nathanjohnpayne/mergepath is:pr is:merged' --jq .total_count      # 470
```

Corrected value: **"more than 450 merged PRs on the hub (470 on 2026-08-28)."** A floor plus a parenthetical as-of survives the next month; a bare "470" does not, and a bare "447" is already false.

### E30—the fleet-wide throughput figure, and what it is not

**SUPPORTED as arithmetic, UNPROVABLE as an adoption claim.** Across the nine repositories on the standard, **2,260** PRs have merged as of **2026-08-28T20:18:00Z**: mergepath 470, fiveacross 457, nathanpaynedotcom 452, friends-and-family-billing 282, matchline 197, device-source-of-truth 138, overridebroadway 113, tadlockpsychiatry 84, swipewatch 67.

```bash
GH_TOKEN="$OP_PREFLIGHT_REVIEWER_PAT" gh api -X GET search/issues -f q='
  repo:nathanjohnpayne/mergepath repo:nathanjohnpayne/matchline
  repo:nathanjohnpayne/nathanpaynedotcom repo:nathanjohnpayne/overridebroadway
  repo:nathanjohnpayne/device-source-of-truth repo:nathanjohnpayne/friends-and-family-billing
  repo:nathanjohnpayne/swipewatch repo:nathanjohnpayne/tadlockpsychiatry
  repo:nathanjohnpayne/fiveacross is:pr is:merged' --jq .total_count           # 2260
```

**It is not an adoption figure and the page must not present it as one.** Adoption is eight consumers, all owned by one person (§E46). The 2,260 counts every PR each repo ever merged, including PRs that predate its adoption of the standard, Dependabot bumps, and propagation mirrors—so it is **lifetime merged-PR volume across the repositories that are in the fleet today**, and explicitly not a count of PRs the gates ever saw. The pre-adoption PRs cannot be gated throughput by definition, and this row previously said they were. Defensible form if the page wants it: "the fleet has merged over two thousand PRs (2,260 on 2026-08-28)," framed as volume, never as reach.

### E31—the consumer list is eight, not nine, and it shrank

> ":46 which of the nine consumer repos opt in"; ":68 The fleet stands at ten repositories—the hub plus nine consumers"; ":74 all nine consumers are my own repos"

**WRONG in three places on the page, and §E27 and §H9 are now stale.** `.mergepath-sync.yml` names **eight** consumers at the pinned SHA—`matchline` (:123), `nathanpaynedotcom` (:128), `overridebroadway` (:139), `device-source-of-truth` (:148), `friends-and-family-billing` (:153), `swipewatch` (:169), `tadlockpsychiatry` (:174), `fiveacross` (:184). The fleet is **nine repositories**: the hub plus eight.

`device-platform-reporting` was archived and made private on 2026-08-26 and dropped from every live propagation surface by `be07b42`, "chore(sync): drop device-platform-reporting as a consumer and sweep target (#1116)", merged 2026-08-27T05:22:18Z. `gh api repos/nathanjohnpayne/device-platform-reporting --jq '{archived,private}'` returns `{"archived":true,"private":true}`. #1116's own body states the reason plainly: an archived repo is read-only, and `scripts/sync-to-downstream.sh` does a `git push` followed by `gh pr create --repo <consumer>`, both of which GitHub rejects—so leaving it enrolled would have broken the next propagation wave outright. The PR body records the new population directly: "wave 4 is now `swipewatch` alone; the fan-out population is 8, not 9."

```bash
S=3d961050e203e8b7a55bb551e89aa4da834356f6
git -C ~/GitHub/mergepath show "${S}:.mergepath-sync.yml" \
  | awk '/^consumers:/{f=1;next} /^[a-z_]+:/{f=0} f&&/^  - name: /{print $3}'   # 8 names
```

Corrected value: **"eight consumer repos"** and **"nine repositories—the hub plus eight consumers."** This is the most interesting count on the page because it moved *down*, which is the honest shape of a fleet that retires repositories: the standard's reach is not monotonic, and a page that says "ten and growing" would be asserting a trend the record contradicts.

### E32—`gaycruisebingo` in the manifest

**The hypothesis is REFUTED; the manifest is current.** The consumer entry is `fiveacross` at `.mergepath-sync.yml:184-185` (`repo: nathanjohnpayne/fiveacross`), and the CJS/ESM templated lanes name `fiveacross` too (`:1784`, `:1799`). The three surviving `gaycruisebingo` tokens—`:27`, `:1965`, `:2003`—are all inside explanatory comments narrating past incidents (the #744 scrub, a byte-identical-copy note, a residual-drift note), which is exactly the register §BM1 says to leave alone. There is no finding here.

```bash
S=3d961050e203e8b7a55bb551e89aa4da834356f6
git -C ~/GitHub/mergepath show "${S}:.mergepath-sync.yml" | grep -n 'gaycruisebingo\|fiveacross'
```

### E33—the propagation path counts, and the type the page does not know about

> ":46 which paths are *canonical* (mirrored byte-for-byte—127 of them) and which are *kit* directories (seven …)"

**WRONG on both numbers, and the dichotomy is wrong as well: there is a third path type.** Parsing the `paths:` block structurally (lines 263–1815) yields **144** entries: **137 canonical**, **5 kit**, **2 templated**. §E13's "127 / 7" used a naive `grep -c`, which counts two comment lines apiece (`:23` narrates both type names, `:76` shows `#     type: kit` as a worked example); the honest kit figure was five then and is five now.

The five kit directories are `.github/ISSUE_TEMPLATE/` (:1592), `scripts/phase-4b/` (:1600), `scripts/ci/` (:1611), `scripts/gh-projects/` (:1723) and `scripts/workflow/` (:1733).

**`type: templated` is a distinct third mode and the page should carry it**, because it is the mechanism that makes verbatim mirroring safe. A templated path is rendered per consumer from that consumer's declared `facts:` rather than copied byte-for-byte: `examples/eslint.config.js` → `eslint.config.js` for the five ESM consumers (:1790-1799), and `examples/eslint.config.cjs.js` → `eslint.config.js` for the three CJS ones (:1804-1811). The manifest's own comment at `:26-32` states why the third mode has to exist: a verbatim mirror "would clobber a consumer's corrected copy on the next wave—the exact content the gaycruisebingo scrub had to remove (#744). If one of these ever genuinely must be shared, it MUST be `type: templated` … never verbatim," and `scripts/ci/check_sync_manifest` (check 8) fails a canonical or kit entry for any denylisted path.

```bash
S=3d961050e203e8b7a55bb551e89aa4da834356f6; cd ~/GitHub/mergepath
for t in canonical kit templated; do
  printf '%s ' "$t"; git show "${S}:.mergepath-sync.yml" | grep -cE "^    type: $t\$"
done                                                                            # 137 5 2
```

Corrected value: **"137 canonical paths mirrored byte-for-byte, five kit directories, and two templated paths rendered per consumer from its declared facts"**—as of 2026-08-28.

### E34—the GitHub identities, derived from the repository

**SUPPORTED, and it is five logins, not four.** #753 asks for this to come from the repo rather than from `~/GitHub/CLAUDE.md`, and `.github/review-policy.yml` states all of it:

| Role | Key | Login(s) | Line |
|---|---|---|---|
| Author | `author_identity` | `nathanjohnpayne` | :132 |
| Reviewer agents | `available_reviewers` | `nathanpayne-claude`, `nathanpayne-cursor`, `nathanpayne-codex` | :88-91 |
| Default external reviewer | `default_external_reviewer` | `nathanpayne-codex` | :125 |
| CI service account | `non_reviewer_identities` | `nathanpayne-robot` | :116-117 |

There is **no `available_authoring_agents:` key**, and this matters for anyone re-deriving the model: `scripts/lib/pr-body-contract.sh:17-19` says so outright—"There is no `available_authoring_agents:` key; the two lists are the same list, read through a prefix"—and `pr_body_available_authoring_agents()` at `:30-40` derives the allowed `Authoring-Agent:` slugs (`claude`, `cursor`, `codex`) by stripping `nathanpayne-` off each reviewer. The same file flags the coupling as "deliberate and load-bearing": a consumer whose reviewers do not carry that prefix derives an empty list.

Three third-party bot logins appear in the policy and are not identities the system owns: `coderabbitai[bot]` (:223), `chatgpt-codex-connector[bot]` (:396), `github-advanced-security[bot]` (:661).

```bash
S=3d961050e203e8b7a55bb551e89aa4da834356f6
git -C ~/GitHub/mergepath show "${S}:.github/review-policy.yml" \
  | grep -nE '^(author_identity|default_external_reviewer):|^  - nathanpayne-'
```

### E35—the actor model, and where the human tiebreaker is written down

**SUPPORTED, and the repository names every role #753 AC 2 asks for—the PRD is not needed for this.** Six roles, each with a primary source in the tree:

- **Operator / repo owner.** The human at the keyboard who owns every repository in the fleet; every consumer's `repo:` field is `nathanjohnpayne/…` (§E46).
- **Author identity.** `author_identity: nathanjohnpayne` (`.github/review-policy.yml:132`). `REVIEW_POLICY.md:56` states the rule: "The author identity (`nathanjohnpayne`) is always the one that merges to the target branch."
- **Authoring agent.** Declared per PR in the `Authoring-Agent:` field, validated against the prefix-derived allow-list (§E34). `AGENTS.md:70` "Author code as nathanjohnpayne. File a PR."
- **Reviewer agent.** One of `available_reviewers`, posting under its own login. `REVIEW_POLICY.md:55` "An agent **never** reviews its own code under the same identity that authored it"; `:57` "Reviewer identities only post review comments, request changes, and approve PRs. They do not merge."
- **CI service account.** `nathanpayne-robot`. `REVIEW_POLICY.md:52`: "It holds no reviewer standing and must never post a review … deliberately absent from `reviewer_pat_item_for()` in `scripts/op-preflight.sh` so `--agent robot` cannot resolve a reviewer PAT."
- **Human tiebreaker.** `AGENTS.md:98`, verbatim: "If the internal reviewer and external reviewer disagree on whether code is ready to merge, the human is the tiebreaker. Surface both positions clearly and wait." `REVIEW_POLICY.md:163` adds the review-independence corollary—"an unregistered human reviewer remains the documented tiebreaker"—and `REVIEW_POLICY.md:506` explains why the automated leg must not absorb this case: disagreement and runaway "are review-did-not-converge outcomes and take the human-tiebreaker route instead; routing them here would let the automated leg approve a review that never converged."

The escalation triggers are mechanical rather than discretionary, which is what makes the role real: `AGENTS.md:100` names **repeat-after-rebuttal** (Codex re-flags a finding after a rebuttal reply) and **runaway rounds** (the counter exceeds `codex.max_review_rounds`) as automatic escalations to the human.

### E36—as-of dates for §E26 and §E27

**Supplied, not re-derived.** Both figures need a date and both have one available.

**§E26's 134 review-finding threads: as of 2026-08-26.** The sibling blog states its own retrieval date at `src/content/blog/perfect-score-wrong-axis.md:92`: "Every count was retrieved on 2026-08-26 via `gh api --paginate` over three endpoints per PR: `pulls/<N>/comments`, `pulls/<N>/reviews`, `issues/<N>/comments`." The window the counts cover is closed and fixed—the eleven PRs are `#789`–`#797`, `#800` and `#810`—so the figure is stable in a way the counts in §E28–§E31 are not; it can only move if someone comments on a merged PR from July. One housekeeping note for whoever cites it: §E26 places the per-PR itemisation at `perfect-score-wrong-axis.md:98`, and at `da6b69c` it sits at **`:106`**; `:97` now holds the summary table's own 134 row. The blog was revised after §E26 was written and the line reference drifted with it.

**§E27's fleet size: as of 2026-08-28, and the number has changed—see §E31.** Ten was correct while `.mergepath-sync.yml` named nine consumers; it is nine repositories at the pinned SHA. Any fleet count on the page needs `.mergepath-sync.yml` and a date, because this one moved within two days of §E27 being written.

### E37—what `mergepath#1132` actually is

**SPLIT, and the pre-draft description on issue #753 is closer than the brief's.** The issue is titled "Self-Review Required is a line-based grep: a fenced heading passes it, and Authoring-Agent is unvalidated server-side," opened by `nathanjohnpayne` 2026-08-28T04:19:40Z, closed 2026-08-28T19:44:42Z. It carries two distinct claims and only one of them is a propagation regression.

**The pre-existing defect is not a regression at all, and is fleet-wide.** The required `Self-Review Required` check in `.github/workflows/pr-review-policy.yml` was a line-based `grep -qE '^## Self-Review'`, so a `## Self-Review` heading inside a fenced code block satisfied it, and `Authoring-Agent:` was never inspected server-side. The issue dates the grep to the initial commit: `git log -S"grep -qE '^## Self-Review'" -- .github/workflows/pr-review-policy.yml` returns `b9734df`, the 2026-03-24 seed. Because `pr-review-policy.yml` is a canonical path, every consumer had always carried the same weak gate.

**The genuine propagation regression is real, and it is precisely characterised.** `nathanjohnpayne/nathanpaynedotcom` had independently built a stronger local version of that job—`setup-node` plus `actions/checkout` plus a call to its own `scripts/validate-pr-body.sh`, running the markdown-aware parser. That repo is where `pr-body-contract.mjs` originated. `mergepath#1121` ported the *parser* upstream but never wired it into the *workflow*, and the `mergepath@e7d5c17` propagation wave of 2026-08-28 ~03:22Z then mirrored the hub's canonical **weaker** job over the consumer's stronger one. The consequence, from the issue body: `Build and Test` on that repo's `main` "was green at `44c0a590`, red at `5626892a` (the sync commit, 03:24:59Z) and red on every commit since," and the repo's `CLAUDE.md` guarantee that the required check "validates the live PR body on open and edit, regardless of how the PR was created" was, for those hours, false there.

**So the shape of the incident is: a verbatim canonical mirror overwrote a consumer's hardened workflow, and the consumer's own local test is what caught it.** `tests/pr-body-contract.test.js` is consumer-local and not synced; it failed on exactly the assertions covering `setup-node` and the validator call. The issue is explicit that this "was correctly reporting a real loss of enforcement, not drift."

**And the fix is the pinned SHA.** `mergepath#1136`, "fix(policy): make the Self-Review gate markdown-aware, nothing more," merged 2026-08-28T19:44:40Z with merge commit **`3d961050e203e8b7a55bb551e89aa4da834356f6`**—two seconds before the issue closed. It replaces the grep with `node scripts/lib/pr-body-contract.mjs --has-self-review`, checking the validator out from the **default branch** rather than the PR head so a PR cannot rewrite the gate that judges it (`.github/workflows/pr-review-policy.yml:18-29`). The title's "nothing more" is load-bearing: server-side `Authoring-Agent:` validation was deliberately *not* added and is tracked separately in #1137 (`:44-46`).

**A decision record can be built on this, and the sharpest reading is the one `REVIEW_POLICY.md:82` already states about a different incident: "a canonical fix is not shipped until it reaches the consumers."** Here the same asymmetry runs the other way—a canonical *file* reached the consumers and destroyed a local improvement. The page-relevant claim is not "propagation is dangerous" but the narrower, true one: verbatim mirroring makes a consumer's independent hardening invisible to the hub, and the only thing that caught it was a test the consumer kept outside the mirror.

```bash
GH_TOKEN="$OP_PREFLIGHT_REVIEWER_PAT" gh issue view 1132 --repo nathanjohnpayne/mergepath \
  --json title,state,createdAt,closedAt,body
GH_TOKEN="$OP_PREFLIGHT_REVIEWER_PAT" gh pr view 1136 --repo nathanjohnpayne/mergepath \
  --json mergedAt,mergeCommit,files --jq '{mergedAt,sha:.mergeCommit.oid,files:[.files[].path]}'
```

### E38—the two known-red items on `nathanpaynedotcom`'s `main`

**SPLIT, and half the brief's framing is WRONG.** Both were executed at `da6b69c` in this worktree.

**`tests/pr-body-contract.test.js` is down to one failing test, not two, and the repair already landed.** `aacf5a8`, "bulk sync to mergepath@3d96105," brought the #1136 fix into this repo, so the assertion on `actions/setup-node@` now passes. What still fails is a different test entirely—`uses the same parser in Phase 4b and enforces it on every PR event path` (`tests/pr-body-contract.test.js:140-146`), which asserts `phase4b` contains `pr_body_validate "$body" "$(p4b_config)"`. It does not: `scripts/phase-4b-review.sh:246` sources the contract library and `:291` calls only `pr_body_authoring_agent "$body"`. Two of that test's assertions are stale against the shipped design—the workflow now calls `scripts/lib/pr-body-contract.mjs` directly rather than `scripts/validate-pr-body.sh` (`:144`), which the fix's own comment at `pr-review-policy.yml:47-54` explains was deliberate, to avoid a bootstrap trap where a flag added in the same PR does not yet exist on the default branch. Run: `./node_modules/.bin/vitest run tests/pr-body-contract.test.js` → `1 failed | 10 passed (11)`.

**`npx astro check` genuinely reports 2 errors—but they are NOT from mergepath sync.** Both are `ts(2339) Property 'ownerSVGElement' does not exist on type 'SVGElement | HTMLElement'` at `tests/responsive/mermaid-accessibility.spec.ts:107` and `:109`. That path appears **nowhere** in `.mergepath-sync.yml`, and its entire history is consumer-local: `8de60c5` (2026-08-22, #663), `4a5e4a4` (2026-08-22, #673), `6ed9d1e` (2026-08-24, #729), `298db6d` (2026-08-25, #788), `71f150d` (2026-08-25, #793)—all `nathanpaynedotcom` issue numbers, all predating the 2026-08-28 sync. And the sync commit is small enough to check exhaustively: `git show --stat aacf5a8` touches exactly four files—`.github/workflows/pr-review-policy.yml`, `scripts/lib/pr-body-contract.sh`, `scripts/validate-pr-body.sh`, `tests/test_pr_body_contract_parity.sh`—none of them TypeScript, none of them config. Attributing these errors to propagation is wrong, and `mergepath#1132` never mentions `astro check` at all.

### E39—the routing configuration as it stands at the pinned SHA

**SUPPORTED, confirming §E5 and §E6 rather than re-deriving them.** `.github/review-policy.yml` is now **1,017 lines** (§E17 called it "900-plus"; still true, now understated).

- `external_review_threshold: 300` (`:18`), and the comparison is still `>=` at both enforcement points: `.github/workflows/agent-review.yml:580` `let needsExternal = totalChanges >= threshold || touchesProtected;` and `scripts/merge-clearance-gate.sh:1241` `if [ "$LINES_CHANGED" -ge "$THRESHOLD" ]`. §E5's correction to "300 lines or more" stands.
- `external_review_paths` (`:26-31`) are five globs: `src/auth/**`, `src/payments/**`, `**/*secret*`, `**/*credential*`, `.github/**`.
- `codex.enabled: true` (`:456`).
- `phase_4b_automation.enabled: true` (`:821`), `mode: local` (`:827`), `max_review_rounds: 2` (`:832`). §E6's correction stands unchanged.
- `phase_4b_default: complex-changes` (`:780`), which is what makes §E40 matter.

```bash
S=3d961050e203e8b7a55bb551e89aa4da834356f6
git -C ~/GitHub/mergepath show "${S}:.github/review-policy.yml" \
  | grep -nE '^external_review_threshold:|^phase_4b_default:|^  (enabled|mode|max_review_rounds):'
```

### E40—`phase-4b-classifier.sh` is executed today, and the page says it is not

> ":38 It is written and configured—`phase_4b_default: complex-changes` is set—but nothing in the repository executes it today: the references that remain are comments, the propagation manifest and a test."

**WRONG at the pinned SHA. This is the decaying negative claim, and it has decayed.** `scripts/coderabbit-should-invoke.sh:486` resolves `CLASSIFIER="$SCRIPT_DIR/phase-4b-classifier.sh"` and `:498-505` executes it—`CLS_OUT=$("$CLASSIFIER" "$PR_NUM" --detect-only --repo "$REPO")`—on the live CodeRabbit-invocation path. The wiring landed in `42195b6`, "feat(review-policy): gate Phase 2.5 on complexity, raise the Codex budget to 10 (#1084)," 2026-08-27 20:01:44 −0700, merged 2026-08-28T03:01:45Z: **fourteen hours before the pinned SHA, and after the sentence on the page was written.**

It is not a dormant path. `.github/review-policy.yml:218` sets `coderabbit.invoke: complex-changes`, and `AGENTS.md:74` binds every agent to it: "Phase 2.5 (CodeRabbit) runs only when `scripts/coderabbit-should-invoke.sh <PR#>` exits 0 (#1084). Run it rather than judging complexity yourself." So the classifier now adjudicates the CodeRabbit decision on **every** PR in the fleet.

Executed rather than read, per the §F21 standard. Running the decider against a real PR returns the classifier's own verdict as its reason:

```bash
S=3d961050e203e8b7a55bb551e89aa4da834356f6
MP="$(mktemp -d)" && git -C ~/GitHub/mergepath archive "$S" | tar -x -C "$MP" && cd "$MP"
GH_TOKEN="$OP_PREFLIGHT_REVIEWER_PAT" bash scripts/coderabbit-should-invoke.sh 1136 \
  --repo nathanjohnpayne/mergepath --json
# {"pr_number":1136,"decision":"invoke",
#  "reason":"classifier matched a Phase 4b trigger (complex change)",
#  "invoke_mode":"complex-changes","coderabbit_enabled":"true"}
```

And the classifier itself runs standalone against a constructed fixture, emitting the JSON recommendation its header advertises:

```bash
cd "$MP"   # $MP from the extraction block above
FX="$(mktemp -d)"
printf '{"body":"Authoring-Agent: claude\\n\\n## Self-Review\\n","files":[{"filename":"README.md","patch":"@@ -1 +1 @@\\n-a\\n+b"}]}' > "$FX/fx.json"
mkdir -p "$FX/pol/.github" && echo 'phase_4b_default: complex-changes' > "$FX/pol/.github/review-policy.yml"
MERGEPATH_REVIEW_POLICY_PATH="$FX/pol/.github/review-policy.yml" \
  bash scripts/phase-4b-classifier.sh 99999 --fixture "$FX/fx.json"
# {"match": false, "triggers": [], "recommendation": "fallback-only", … "files_inspected": 1}
```

Corrected value: **the classifier is on the live path.** Its Phase 4b proactive-trigger role is unchanged (§E7 stands), but a second consumer now reuses the same taxonomy to decide whether CodeRabbit runs at all—`coderabbit-should-invoke.sh:481-485` states the design reason: "Reusing that classifier rather than inventing a second notion of 'complex' is the point … a second threshold would drift from it." The "capability built and not wired up" sentence must be deleted, not softened.

### E41—CodeRabbit is now selective and Codex is universal, which inverts the page's framing

> ":38 CodeRabbit is wired in as an advisory second-opinion pass"

**SUPPORTED as written, but the mechanism changed under it and the page's emphasis is now backwards.** As of `#1084` the two external reviewers have swapped roles relative to how the page describes them.

- **CodeRabbit is gated.** `coderabbit.invoke: complex-changes` (`.github/review-policy.yml:218`) means it is invoked only when the classifier matches a trigger (§E40). §E8 already refuted "on every PR" on rate-limit and stacked-PR grounds; there is now a policy knob that declines to invoke it by design.
- **Codex is universal.** `codex.request_by_default: true` (`:479`), with the block's own comment at `:463-464`: "Request `@codex review` on EVERY PR, not only the ones that meet the external-review threshold or touch a protected path (#486)."
- **The Codex round budget went 2 → 10.** `codex.max_review_rounds: 10` (`:505`), and the comment at `:503-504` gives the rationale in the repo's own words: "Raised 2 -> 10 (#1084). Codex is now the primary reviewer on every PR." `REVIEW_POLICY.md:476` confirms the guard: "The round counter exceeds `codex.max_review_rounds` (10 since #1084). The 11th round trips this guard."

The decision procedure is deliberately a script rather than agent judgement, and `coderabbit-should-invoke.sh:27-29` says why: "'is this PR complex enough for CodeRabbit' must be reproducible across sessions and agents, and must be answerable the same way in CI as at the keyboard." Every ambiguous input—unreadable config, unknown mode, missing or failing classifier—resolves to *invoke* (`:41-45`), because "skipping wrongly silently drops a review round, while invoking wrongly costs time." That fail-open-toward-more-review posture is page-worthy on its own.

### E42—the August 2026 byline incident: the line moved, and the primary evidence is on this site's repo

> ":36 `REVIEW_POLICY.md` itself records an August 2026 incident in which a repurposed 1Password item silently sent Codex's reviews out under the CI robot's byline."

**SUPPORTED, with a corrected citation and a real date.** §E3 cited `REVIEW_POLICY.md:51`; at the pinned SHA the passage is at **`REVIEW_POLICY.md:82`**, inside a block quote under the PAT lookup table, opening: "**A 1Password item ID is not a stable identity.**"

The record, quoted: "On 2026-08-21 the item `o6ekjxjjl5gq6rmcneomrjahpu` was repurposed from Codex to the robot and Codex was recreated at `etak327mpz4drd4byxszfex4vm`; every row above still pointed at the old ID, so `--agent codex` silently resolved a **robot** token." The named root cause is worth the page's space: "the robot PAT was created that day by repurposing the existing Codex 1Password item rather than minting a fresh one, so the id every doc and lookup already named silently changed identity while nothing referencing it changed—mint a new item for a new identity, never repurpose one."

**And the incident is verifiable against GitHub, not only against the doc.** The passage names where the bad reviews landed—`nathanjohnpayne/nathanpaynedotcom#668`—and they are still there:

```bash
GH_TOKEN="$OP_PREFLIGHT_REVIEWER_PAT" gh api \
  repos/nathanjohnpayne/nathanpaynedotcom/pulls/668/reviews --paginate \
  --jq '[.[]|select(.user.login=="nathanpayne-robot")]
        | {count:length, first:.[0].submitted_at, last:.[-1].submitted_at}'
# {"count":3,"first":"2026-08-22T04:46:19Z","last":"2026-08-22T04:50:20Z"}
```

Three reviews by `nathanpayne-robot`, all now `DISMISSED`. Corrected value for the page: the date is **2026-08-21/22**—the item was repurposed on the 21st and the wrong-byline reviews posted at 04:46–04:50 UTC on the 22nd, which the doc dates as "roughly five and a half hours later."

**The causal chain is the propagation one, and it is the same lesson as §E37 from the other side.** `REVIEW_POLICY.md:82` again: "The correction landed here the same day, but `scripts/op-preflight.sh` is a canonical manifest path and no consumer had synced it when a Codex session resolved the robot token roughly five and a half hours later … **a canonical fix is not shipped until it reaches the consumers.**" The hub was already correct when the consumer failed. That sentence is the strongest single line the record offers about what a hub-and-spoke standard actually costs.

### E43—the mechanism the byline incident produced

**SUPPORTED, and it belongs on the page because it closes the loop §E42 opens.** The incident is not just a scar; it produced a gate. `.github/review-policy.yml:116-117` declares `non_reviewer_identities: [nathanpayne-robot]`, and `REVIEW_POLICY.md:44-50` (headed "Non-reviewer identities (#1080)") states the problem it solves: "Service accounts hold repo write access because CI needs it. GitHub counts an approval from **any** account with write access toward `required_approving_review_count`, and it offers nothing to tell a service account from a person—both are `type: \"User\"`. So an account that exists to run CI can satisfy branch protection, and no GitHub-side setting prevents it."

`scripts/merge-clearance-gate.sh` now "fails closed when any listed identity holds a latest-state `APPROVED` review **anywhere on the PR**." Three design notes in that passage are page-relevant: it is a deny-list rather than an allow-list because "an allow-list would have to answer 'is this login a human?' … and that question has no reliable answer from the API"; it is deliberately **not** HEAD-pinned (see §E44); and an absent key makes the check inert, so "a repo that has not adopted the key is unaffected rather than broken, and also unprotected." The last clause is the honest one—the protection is opt-in per repo.

Note for the page: the same PR family added `block-self-approval` to `.github/workflows/agent-review.yml:1030`, which `REVIEW_POLICY.md:163` says "always blocks an allow-listed agent reviewer whose native GitHub account also authored the PR." That is the enforcement §E4 found missing at the agent level; it now exists for Phase 4, which "requires exactly one well-formed `Authoring-Agent:` declaration that maps to an allow-listed reviewer other than the approver."

### E44—exact-head clearance, and the one place it is deliberately not applied

**SPLIT. HEAD-pinning is a first-class, named, enforced concept—but "reviews are pinned to an exact HEAD SHA" is not a universal, and the exception is deliberate.** #753 AC 4 asks the page to describe this.

The repository defines the term rather than merely practising it. `CONTEXT.md:89`: "**HEAD-pinned**: The property that a signal or gate counts only when bound to the exact current commit. The antonym failure is a stale clearance riding a new HEAD." And `CONTEXT.md:87` defines what it protects: "**Clearance**: The HEAD-pinned state in which the external reviewer has affirmatively accepted this exact commit; a content-changing push voids it … _Avoid_: treating a label, a stale approval, or reviewer silence as clearance—silence is never implicit approval."

Enforcement, with the mechanism in each case:

- `scripts/merge-clearance-gate.sh`—`CONTEXT.md:95` calls it "the HEAD-pinned canonical check that fails closed when clearance is not satisfied on the merge HEAD."
- `scripts/coderabbit-wait.sh`—a three-rung freshness test (`REVIEW_POLICY.md:275`) in which "an exact SHA match wins outright: a review whose commit is the current `HEAD_SHA` counts regardless of its timestamp," and a summary naming a different commit "is a verdict about that other commit and never clears this head, however recently CodeRabbit edited it."
- `codex-record-feedback.sh --scan`—`REVIEW_POLICY.md:296`: "collects only the current HEAD's CodeRabbit inline findings (bot-authored AND `commit_id`/`original_commit_id` == HEAD)."
- The propagation lane's `mergepath-propagation-lane verified-head=<sha>` marker, read by `lane_verified()` (`REVIEW_POLICY.md:411`), where "label events remain untrusted (not head-pinned proof)."
- Phase 4b posts its verdict pinned to the reviewed HEAD, and head drift is one of the fail-closed paths back to the manual handoff (`.github/review-policy.yml:806-809`).

**The exception, and it is reasoned.** `REVIEW_POLICY.md:46`: the non-reviewer-identity assertion (§E43) fires "**anywhere on the PR**—deliberately not just on the current HEAD," because "whether an approval from an earlier commit still counts toward branch protection is decided by `dismiss_stale_reviews`, which the gate cannot read; HEAD-pinning the check would let a non-reviewer approve and then push to slip past it."

Defensible form for the page: clearance is bound to the exact commit reviewed, and a content-changing push voids it—except where a wider scope is strictly safer, as with the CI-account deny-list. Do not write "every check is HEAD-pinned."

### E45—reply and resolve are two requirements with two different enforcers

> The page does not yet say this; #753 will want it.

**SUPPORTED, and proved by execution rather than by the docs.** The two are not the same requirement and are not enforced by the same thing.

**Reply is enforced by `scripts/review-feedback-accounting.sh` (897 lines), and thread resolution is explicitly *not* accepted as evidence.** `REVIEW_POLICY.md:340`, verbatim: "Thread resolution, merge-state fields, a helper's reported success count, and a zero exit from an unrelated command are not disposition evidence." The code matches the doc—the script never asks GitHub about resolution state at all:

```bash
cd "$MP"   # $MP from the extraction block above
grep -c 'isResolved\|reviewThreads' scripts/review-feedback-accounting.sh    # 0
grep -n 'in_reply_to_id' scripts/review-feedback-accounting.sh              # 362, 389, 390
```

What it does accept is narrow: `:389-390` requires `(.in_reply_to_id != null) and (.in_reply_to_id == $root)`—an actual reply whose `in_reply_to_id` names the finding root—and `REVIEW_POLICY.md:340` adds that "an ordinary reply's `created_at` must be strictly later than the finding's latest raise or edit because GitHub's one-second timestamp precision cannot order a same-second reply and edit."

**An unaccounted finding genuinely blocks the next review request, and the block is a hard exit.** `scripts/codex-review-request.sh:1093-1115` defines `run_feedback_accounting_gate()`, which runs the accounting script before the trigger is posted and, on exit 1, calls `die 6 "review feedback is unaccounted; disposition every finding before requesting another Codex review"`. Confirmed on the live path, read-only:

```bash
cd "$MP"   # $MP from the extraction block above
GH_TOKEN="$OP_PREFLIGHT_REVIEWER_PAT" bash scripts/review-feedback-accounting.sh \
  1136 nathanjohnpayne/mergepath
# {"status":"clear","repo":"nathanjohnpayne/mergepath","pr_number":1136,
#  "posted":0,"accounted":0,"missing_count":0,"findings":[],"missing":[]}
```

**Resolve is enforced somewhere else entirely—by GitHub, not by the repo.** `REVIEW_POLICY.md:303`: "CodeRabbit's advisory status does **not** override GitHub branch protection's `required_conversation_resolution` gate." So the page can say, accurately: a reviewer's finding needs a substantive reply on the thread *and* the thread resolved, and the two are checked by different systems—one a repository script that refuses to count resolution, one a platform setting that does not read replies. Neither substitutes for the other, which is exactly why both get missed.

### E46—there is no external adopter, and the bound is tight

> ":74 nobody outside this fleet runs the standard—all nine consumers are my own repos"

**SUPPORTED on the substance, WRONG on the count (eight—§E31), and the bound can be stated much more sharply than "nobody."** Every consumer's `repo:` field is `nathanjohnpayne/…`; the count of consumer repos under any other owner is zero:

```bash
S=3d961050e203e8b7a55bb551e89aa4da834356f6
git -C ~/GitHub/mergepath show "${S}:.mergepath-sync.yml" \
  | grep -E '^    repo: ' | grep -vc 'nathanjohnpayne/'                      # 0
```

The hub is public and marked a template. **That does not make the absence of uptake measurable, and the row originally overclaimed it**: GitHub's `forks_count` does not observe a **Use this template** instantiation or a plain `git clone`, so zero forks bounds one adoption path and is blind to the two most likely others. What *is* conclusive is the manifest—every consumer under any other owner is zero—and that is a statement about the fleet, not about the world. As of 2026-08-28T20:20Z: `is_template: true`, `visibility: public`, created 2026-03-24T19:08:51Z, **0 forks**, **4 stargazers**, 0 watchers.

```bash
GH_TOKEN="$OP_PREFLIGHT_REVIEWER_PAT" gh api repos/nathanjohnpayne/mergepath \
  --jq '{visibility,is_template,forks_count,stargazers_count,subscribers_count}'
```

Defensible form: all eight consumers are the author's own, and the repository has been public and forkable since March 2026 with zero forks—stated as the one adoption signal GitHub exposes, never as proof that nobody has taken the template.

### E47—`packaging/` is a name reservation, not distribution

**SUPPORTED, and the repo says so itself, so the page can be blunt.** `packaging/README.md:1-5`: "Placeholder package scaffolds reserving the `mergepath` name on public registries. See issues #92 (npm) and #93 (PyPI) for the squatting-prevention rationale. Both packages publish at version `0.0.0` and carry nothing but a README. They will be replaced with real artifacts when the project cuts a first release."

Both are genuinely published, and both are empty. `packaging/npm/package.json:2-3` and `packaging/pypi/pyproject.toml:6-7` both declare `mergepath` at `0.0.0`. `npm view mergepath version time.created` → `0.0.0`, `2026-05-02T03:50:17.452Z`. PyPI carries one release, `0.0.0`, uploaded `2026-05-02T03:56:18.888217Z`, whose own summary field reads "Name reservation for the Mergepath umbrella project. No runtime code."

So there is no distribution channel and the page must not imply one. It is also not evidence of adoption in either direction: the npm package recorded 9 downloads in the month to 2026-08-27, which for a README-only `0.0.0` package is registry noise, not users. The honest sentence is that the name is reserved on npm and PyPI against squatting, and nothing installable has ever been published.

### E48—the security-baseline counts

> ":40 all forty-three GitHub Actions pinned to commit SHAs, and least-privilege `permissions:` blocks on all nineteen workflows"

**SPLIT—nineteen is right, forty-three is now WRONG.** At the pinned SHA there are **46** `uses:` references pinned to 40-character SHAs and **zero** pinned to a floating `@vN` tag, across **19** workflow files, **19** of which carry a `permissions:` block. §E9's other findings stand: `.github/CODEOWNERS`, `SECURITY.md` and `.github/dependabot.yml` are all present, and secret scanning with push protection remains a repository setting recorded as a requirement rather than a shipped file.

```bash
S=3d961050e203e8b7a55bb551e89aa4da834356f6; cd ~/GitHub/mergepath
for f in $(git ls-tree -r --name-only "$S" .github/workflows/); do git show "${S}:$f"; done \
  | grep -coE 'uses: [^@]+@[a-f0-9]{40}'                                     # 46
for f in $(git ls-tree -r --name-only "$S" .github/workflows/); do git show "${S}:$f"; done \
  | grep -coE 'uses: [^@]+@v[0-9]+'                                          # 0
git ls-tree -r --name-only "$S" .github/workflows/ | wc -l                    # 19
```

Corrected value: **46 actions pinned to commit SHAs, none to a floating tag, and `permissions:` on all nineteen workflows**, as of 2026-08-28. Both the pin count and the workflow count decay; the shape that does not is "every action pinned to a SHA, every workflow carrying a `permissions:` block," which is what `check_*` gates actually enforce.

### E49—the portfolio slugs against the consumer list

**SUPPORTED, and the page's "underneath every other project on this site" is exactly true.** Seven project pages live in `src/content/projects/`; six map to consumers and the seventh is the hub.

| Portfolio slug | Consumer repo | Status |
|---|---|---|
| `device-source-of-truth` | `nathanjohnpayne/device-source-of-truth` | consumer |
| `five-across` | `nathanjohnpayne/fiveacross` | consumer (repo renamed 2026-08-27) |
| `friends-and-family-billing` | `nathanjohnpayne/friends-and-family-billing` | consumer |
| `matchline` | `nathanjohnpayne/matchline` | consumer |
| `override` | `nathanjohnpayne/overridebroadway` | consumer |
| `swipe-watch` | `nathanjohnpayne/swipewatch` | consumer |
| `mergepath` | `nathanjohnpayne/mergepath` | **the hub, not a consumer** |

Two consumers have no portfolio page: `nathanpaynedotcom` (this site) and `tadlockpsychiatry`. So the mapping is 6 of 7 slugs → consumers, plus 2 consumers outside the portfolio, plus the hub = the nine repositories of §E31.

One thing the current page gets wrong by omission: `:68` names Override, Device Source of Truth, Friends & Family Billing, Swipe Watch and this site, and leaves out **Matchline and Five Across**, both consumers and both portfolio projects. If the page is going to enumerate, it should enumerate all of them or say "including" and pick fewer.

### E50—the corrected sibling pages contradict nothing on this page

**SUPPORTED—checked and clean, recorded so it is not re-opened.** `device-source-of-truth.md:49` ("the machine-user review system arrived by template propagation on March 24, 2026, eighteen days after the last product feature") is consistent with §A13 and §F43. `friends-and-family-billing.md:49` describes the shared pipeline without attributing its origin. `matchline.md:19-20`, `override.mdx:64-65` and `five-across.mdx:101-102` carry `related:` links only. No sibling page asserts anything about Mergepath that `mergepath.md` contradicts, in either direction.

**One thing a sibling now carries that this page could use.** `friends-and-family-billing.md:49` records that "the no-direct-push rule landed on April 2; a commit went straight to `main` the next day, and issue #145 is the after-action record." That is a documented bypass of the standard's central rule, one day after it landed, already verified on a corrected page—material for §E51's "what they cost" column, and it is not currently on the Mergepath page.

### E51—the impact question, and whether the page's own disclaimer survives

> ":74 there is no measure of what they save, only of what they catch, what they miss, and what they cost."

**SUPPORTED. The boundary stands, and the search that tested it was not cheap.** #753 AC 6 asks for impact separated from adoption, "quantified only where the record supports it," and the record supports nothing on the savings side.

**PARTLY WRONG—see §E62.** This row's sweep missed `scripts/phase-4b/`, which computes a `human_minutes_saved_estimate`. The sweep as run: for "saved", "time saved", "faster than", "reduces … time", "manual steps" and "afternoon" across `docs/audits/`, `README.md`, `REVIEW_POLICY.md`, `AGENTS.md` and `scripts/bootstrap-new-repo.sh`, returning **zero hits**—but those five paths are not the repository, and the sweep's own narrowness is what produced the absolute. There is no recorded manual baseline anywhere—no before-time for a repo bootstrap, no coordination cost measured before the standard existed—so there is nothing to subtract from.

**The two measurement systems that do exist both measure cost.** `docs/audits/codex-latency-2026-07.md` is a real, reproducible study (`scripts/audit-codex-latency.sh`, n=100 for the headline pair) and its findings are about how long the gates take and how often they fail to respond: trigger→verdict p50 3m37s / p90 7m6s / p99 10m30s / max 13m50s; "~19% of all historical `@codex review` triggers drew a 'To use Codex here, create a Codex account…' not-connected marker instead of a review"; the `*/15` and `*/5` gate crons do not run at their configured cadence because "GitHub throttles scheduled events so hard that the median gap between consecutive scheduled runs is ~96–98 minutes for both workflows." `scripts/repo-lint-latency-report.sh` is the same posture applied to CI: it defines budgets (`P50_MAX=300`, `P95_MAX=480`, `DEEP_P95_MAX=720` seconds) that the lint suite must stay under. Both are "what they cost." Neither is "what they save."

**The one number that could look like a savings figure, executed rather than assumed.** The page says `--dry-run` "produces a complete do-it-yourself runbook with zero side effects," and that a bootstrap replaces "an afternoon of copy-paste-and-customize." Running it end to end at the pinned SHA produces a complete four-stage runbook and exits 0, with **50 wrapped side-effect steps**: template-mirror 16, github-infra 19, firebase-and-codereview 5, board-and-summary 10, plus a numbered manual follow-up list.

```bash
S=3d961050e203e8b7a55bb551e89aa4da834356f6
MP="$(mktemp -d)" && git -C ~/GitHub/mergepath archive "$S" | tar -x -C "$MP" && cd "$MP"
git init -q -b main . && git add -f README.md \
  && git -c user.email=a@b -c user.name=a -c commit.gpgsign=false commit -q -m pin
BOOTSTRAP_SKIP_TOOL_CHECK=1 BOOTSTRAP_SKIP_MERGEPATH_GUARD=1 BOOTSTRAP_AUTO_CONFIRM=1 \
  bash scripts/bootstrap-new-repo.sh audit-probe-repo --dry-run \
  --description x --visibility private --firebase none --codex-app n --project new \
  </dev/null | grep -c '^\[DRY-RUN\]'                                        # 50

# The dry run creates ~/GitHub/audit-probe-repo (see below). This block does
# NOT delete it: the path may hold a pre-existing checkout, or an earlier
# interrupted run's resumable .bootstrap-state. Inspect and remove by hand.
echo "dry run left a directory behind, remove it yourself once you have looked: ~/GitHub/audit-probe-repo"
```

**Fifty steps is a real, reproducible figure, and it is still not a savings measure.** It counts what the wizard automates, not what a human would otherwise have done—nobody ever timed the manual path, and "an afternoon" is an unmeasured author estimate. The page may say the wizard performs fifty wrapped operations across four stages, as of 2026-08-28; it may not convert that into time saved.

**And "zero side effects" is not literally true, which the same run demonstrates.** `--dry-run` creates the target directory and writes `.bootstrap-log` and `.bootstrap-state` into it. Every *wrapped* effect is suppressed—the `rsync`, the `git init`, the `git commit`, every `gh` call are all printed as `[DRY-RUN] …` and not executed—so the claim is true of the target repo's content and false of the target directory's existence. Defensible weaker form: "`--dry-run` performs none of the operations, printing each one instead"—which is both accurate and the thing the reader cares about.

**So the page's self-assessment holds and should be kept.** Correct the count in the same sentence (§E31: eight consumers, not nine) and leave the claim itself alone. It is the most defensible sentence on the page.

### E52—branch protection is not enforced on most of the fleet, and the page's own premise turns on it

> ":32 The operating premise is three clauses: written conventions are not enough, **branch protection is mandatory**, and review is performed by a different identity than the one that authored the change."

**SPLIT, and this is the most consequential row in this delta.** As a statement of what the standard *holds*, the clause is fine. As a description of what is *in force across the fleet*, the repository's own architecture decision record contradicts it, and it does so with a measurement.

`docs/architecture/0002-branch-protection-enforcement-posture.md:29`, verbatim: **"on 2026-07-28 the audit exited 3 on all ten repos in the fleet, eight enforced zero of the five, and three (`nathanpaynedotcom`, `overridebroadway`, `gaycruisebingo`) had no protection on `main` at all. mergepath itself enforced two of five."** The five are the canonical required checks encoded in `CANONICAL_REQUIRED_CHECKS` in `scripts/audit-branch-protection.sh`, and `:27` states the mechanism that makes the gap matter: "A GitHub Actions job only gates a merge when it is listed as a **required status check** in the repository's branch protection. Absent that listing the job still runs and still goes red—and the PR merges anyway."

**The gap is still open at the pinned SHA.** The ADR's own status line (`:5`) reads "Decision recommendation—recorded 2026-07-28 under #774, awaiting the repository owner's acceptance," and `:7` says the settings half "is an owner-authorised settings change on live repositories … and has deliberately not been done. Until it is, the audit will report drift every week, which is the intended behaviour: the gap is now visible instead of silent."

**And on the day of the pinned SHA the posture was made weaker on purpose, with reasoning the page should not flatten.** `:64` records that `enforce_admins` was **declined by the owner on 2026-08-28** and "disabled on `mergepath` `main` at 2026-08-28T02:49Z; the other eight repos already had it off, so the fleet is now uniform rather than hub-special." The stated reason is a trade between two real failures: keeping the admin escape costs you #427/#428—which the ADR calls two admin merges past a required check, though **§E61 shows both are issues describing an *auto-merge* escape and neither mentions `admin` at all**, so the cost is real and the named mechanism is not; removing it cost `mergepath#1121`, which on 2026-08-27 "sat `BLOCKED` with all 36 review threads resolved, feedback accounting clear, and a cross-agent `APPROVED` in place, because three `Codex P1 unresolved threads` check-runs had failed with `rc=2`—a config/usage error, not a gate verdict—after the GitHub App installation rate limit was exhausted repo-wide by 411 workflow runs in 16 minutes. The gate's own log read `Codex blocking-tier unresolved: 0`." The ADR is candid that `scripts/hooks/gh-pr-guard.sh`'s `BREAK_GLASS_MERGE_STATE=1` requirement "is a local control rather than a server-side one and does not constrain a web-UI merge; it is a speed bump and is described here as one, not as a replacement for `enforce_admins`."

**What the page may say.** That branch protection is the standard's second premise and that the fleet does not yet meet it—`.mergepath-sync.yml`'s repos were measured on 2026-07-28 with eight of ten enforcing none of the five canonical required checks, the hub enforcing two, and the remediation still an unaccepted recommendation. That every gate on this page runs and goes red regardless, and that on most consumers a red gate does not stop a merge. And that the admin bypass is retained fleet-wide by an explicit 2026-08-28 owner decision, because an outage-induced deadlock was judged the worse and more frequent failure. **What the page may not say** is that branch protection is in force, or imply that the CI described in §E28 blocks anything outside the hub. This belongs in "The price," and it is a sharper item than anything currently there.

```bash
S=3d961050e203e8b7a55bb551e89aa4da834356f6
git -C ~/GitHub/mergepath show \
  "${S}:docs/architecture/0002-branch-protection-enforcement-posture.md" \
  | sed -n '5,7p;27,29p;64p'
```

Two cautions for whoever writes this. The 2026-07-28 measurement is a **snapshot**, and it names ten repos and `gaycruisebingo`, both of which predate §E31 and the rename—cite it as a dated finding, never as current state. And the ADR is a *recommendation*, so "the standard requires all five everywhere" is itself not yet a settled decision; `:31` says so outright: "That constant has never been backed by an explicit decision … 'every repo should require all five' has been an implicit consequence of a list in a script rather than a position anyone took on the record."

### E53—the PRD, never before processed by this ledger: what it is and how stale

**EXTERNALLY SOURCED as a specification, and WRONG wherever it describes current behaviour.** `~/GitHub/docs/projects/mergepath/prds/mergepath.md` is 2,439 lines. Its header (`:11-13`) reads `**Status:** Approved — living document` / `**Last Updated:** 2026-07-01`, and its footer (`:2393-2395`) `**Document Version:** 1.5` / `**Reference implementation:** mergepath (current main)` / `**Last Reviewed:** 2026-07-01`.

**The gap is 204 commits.** `git -C ~/GitHub/mergepath rev-list --count 3d961050e203e8b7a55bb551e89aa4da834356f6 --since=2026-07-01` → **204**. The PRD's highest issue reference is #774; the tree at the pinned SHA references #1080, #1084, #1094, #1101, #1132, #1136 and #1137.

**The date in the header is wrong on the document's own terms.** `git -C ~/GitHub/docs log -3 --format='%h %ci %s' -- projects/mergepath/prds/mergepath.md` shows two content edits after v1.5 with no version bump and no date change: `a219367` 2026-07-28 and `5b5452f` 2026-08-21.

Defensible characterisation for anyone citing it: **the PRD is a faithful snapshot of the design as of 2026-07-01 whose architecture and vocabulary still hold, and effectively every load-bearing number, config value, enforcement claim and Phase 4 exit-code contract in it has since been superseded.** Per §M1 the tree wins, and §E54 enumerates where.

**What it is genuinely useful for.** The actor model—but §E35 derives the same model from the tree, which is both current and citable, so the page should use §E35. For the record, the PRD does name the escalation-of-last-resort role and calls it the **tiebreaker**: `:1387` "The human (`nathanjohnpayne`) can approve PRs because they are the tiebreaker and may need to self-approve in escalated scenarios," and `:1794-1800` "§ Disagreement and Tiebreaking … `nathanjohnpayne` (the human) is the tiebreaker and makes the final decision." The tree corroborates it at `AGENTS.md:98` and `REVIEW_POLICY.md:852`. The PRD does **not** model two roles the tree now enforces: the declared CI non-reviewer (§E43) and the repository owner as a distinct authority for settings and credential decisions (§E52).

### E54—the PRD's claims about current behaviour that the tree refutes

**WRONG, fifteen ways, and it is the §F7 pattern exactly: a spec section that says "enforced" where nothing enforces.** Enumerated so the page cannot pick one up by accident. Every left-hand cite is `prds/mergepath.md`; every right-hand cite is the tree at `3d96105`.

| # | PRD claim | Tree |
|---|---|---|
| 1 | `:1560-1569` publishes a copy-pastable `git config user.name` / `user.email` identity switcher with an `@…example` address | `REVIEW_POLICY.md:1060` "Commit identity is **not** switched per session, and never per repository"; `:1069` "This policy deliberately publishes no copy-pastable identity setter with placeholder values"; `scripts/ci/check_git_identity_hygiene` fails on the instruction shape (§E55) |
| 2 | `:195-197`, `:762` Phase 4b automation ships "disabled-by-default", `enabled: false` | `.github/review-policy.yml:821` `enabled: true` since 2026-07-02 (§E39) |
| 3 | `:245` "48 `scripts/ci/check_*` scripts as of v1.5 … plus two inline steps" | 72 on disk, 71 wired, 1 exempt (§E28) |
| 4 | `:256` `rules/repo_rules.md` "must be kept in lockstep with" `repo_lint.yml` | `rules/repo_rules.md:33-56` lists 24 of 72; nothing checks the inventory—`check_ci_scripts_wired` asserts script↔workflow wiring only |
| 5 | `:588`, `:1244` the gates are "enforced by branch protection" | §E52 |
| 6 | `:801` "The `Authoring-Agent:` line is **required**—CI checks for it" | `.github/workflows/pr-review-policy.yml:44-46` "**no claim is made about `Authoring-Agent:`**—widening this required check to the identity contract is a separate change, tracked in #1137" (§E37) |
| 7 | `:801` "The `## Self-Review` section must be filled in for the PR to merge" | `:62` checks only that a real heading exists; contents are never inspected |
| 8 | `:1185-1188`, `:252` `check_duplicate_docs` parses `AGENTS.md` and blocks | `scripts/ci/check_duplicate_docs:9-10` "Currently warning-only (does not block merge)"; always `exit 0`; never opens `AGENTS.md` |
| 9 | `:1164-1167` `check_dist_not_modified` "compares committed `dist/` files against the build output" | `:58` is `git diff … HEAD~1 HEAD -- "$dir/"`; no build is ever run, and only the most recent commit is inspected |
| 10 | `:1121-1122` tool-folder checks read config files and allow JSON settings | `scripts/ci/check_no_tool_folder_instructions:79` scans `*.md`, `*.txt`, `*.mdc` only—JSON is never opened, so the PRD's own "INVALID `.claude/config.json`" example at `:1021-1028` passes |
| 11 | `:708-769` the config exhibit's values | six are stale: `coderabbit.max_wait_seconds` 300→1245, `codex.max_review_rounds` 2→10, `codex.review_timeout_seconds` 600→840, `codex.ack_wait_seconds` 60→30, `phase_4b_automation.enabled` false→true, and GHAS is now a live `code_scanning:` block at `:714-719` |
| 12 | `:1733` `codex-review-request.sh` posts the trigger "or relies on the auto-review" | `AGENTS.md:78` "**Codex must be explicitly invoked** … Its on-open auto-review is best-effort and frequently does NOT fire … running `scripts/codex-review-request.sh` to post the trigger is **mandatory on EVERY round**—the first one included" |
| 13 | `:1740`, `:175-176` escalation routes to Phase 4b | `REVIEW_POLICY.md:422` "**Disagreement and runaway do NOT route here** … Dispatching the automated 4b leg for them is unsound: that leg can post an `APPROVED`" (§E35) |
| 14 | `:1381-1386`, `:1090` `block-self-approval` "prevents same agent from approving own code" | `scripts/self-approval-detector.cjs:146` returns `{action:'allow', reason:'under-threshold-agent-approval'}`—same-agent approval is permitted below threshold by design, which is the majority path and exactly what §E4 records |
| 15 | `:690-702`, `:2367-2381` thirteen workflows | nineteen (§E48); six are absent from both PRD tables |

Two more the page should not lean on either way: `:2292` calls signed commits "deferred", while `REVIEW_POLICY.md:117-131` ships an SSH signing-key inventory for all five identities with live GitHub key IDs; and `:2289` blames absent branch protection on "requires GitHub Pro (free plan)", which is a different account of §E52 than the ADR gives.

One caveat on the strongest of these. `scripts/self-approval-detector.cjs:18-20` adds a limit the PRD does not carry and the page should: "A syntactically valid declaration is evidence of the policy claim, **not proof of who authored the branch.** Create-time claim authentication remains #928." The `Authoring-Agent:` field is a declaration, not an attestation.

### E55—the byline incident's exact misconfiguration is still live inside the hub

**WRONG, and it is a working instance of the failure §E37 and §E42 both describe.** `docs/projects/mergepath/prds/mergepath.md` is a generated mirror of the docs-repo PRD, carried into the hub by a *second* sync engine (`.mergepath-project-docs.yml` + `scripts/project-doc-sync.sh`, distinct from `.mergepath-sync.yml` and running the other direction for specs). Its provenance header pins `source_ref: a219367`, a docs-repo commit of 2026-07-28.

The canonical moved on 2026-08-21—`5b5452f`, "fix(mergepath prd): correct the codex PAT item id and add the robot row"—which is the correction the byline incident forced. **The mirror never received it.** At the pinned SHA, `docs/projects/mergepath/prds/mergepath.md:1623` still reads:

```text
| Codex | `nathanpayne-codex` | `o6ekjxjjl5gq6rmcneomrjahpu` | ... | op://Private/o6ekjxjjl5gq6rmcneomrjahpu/token |
```

`o6ekjxjjl5gq6rmcneomrjahpu` is the **CI robot's** 1Password item; Codex is `etak327mpz4drd4byxszfex4vm`. That is the precise substitution that made `--agent codex` resolve a robot token and post three reviews under the CI byline on `nathanpaynedotcom#668` (§E42). The mirror also drops the `nathanpayne-robot` row the correction added, and the PRD's own text at `:336` asks for exactly the check that would have caught it: "Drift checks should report stale generated mirrors with the source path and source ref."

```bash
S=3d961050e203e8b7a55bb551e89aa4da834356f6
git -C ~/GitHub/mergepath show "${S}:docs/projects/mergepath/prds/mergepath.md" | sed -n '6p;1623p'
git -C ~/GitHub/docs log -1 --format='%h %ci %s' -- projects/mergepath/prds/mergepath.md
```

**This is the row that turns §E37 and §E42 from two anecdotes into a pattern, and the page should use it that way.** Three incidents, one shape: a fix lands at the canonical source and does not reach the copy that gets read. `REVIEW_POLICY.md:82` names it—"a canonical fix is not shipped until it reaches the consumers"—and here the unreached copy is inside the hub itself, three months later, still naming the wrong credential. Do **not** write that anyone was harmed by this instance; nothing in the record says the mirror was ever read. Write that the mechanism the standard exists to prevent is demonstrably still running, inside the repository that defines it.

### E56—the PRD's four problem statements

**Four, confirmed, and two of them are page-usable as written.** `## Problem Statement` at `prds/mergepath.md:51` carries exactly four `###` subsections.

1. **`:53` The Configuration Drift Problem.** `:62` "This fragmentation creates **configuration drift**: instructions diverge, behavioral rules conflict, and agents make decisions based on incomplete or contradictory information." **CORROBORATED, but the named mechanism is the wrong one.** The PRD blames per-tool config files (`:57-60`), and the file it names, `.cursor/rules.json`, does not exist in the tree. The tree's dated instances are all *canonical-doc* drift instead, and they are better: `scripts/ci/check_doc_ownership:17-18` records that "`docs/agents/operating-rules.md` sat in that gap for the whole life of the fleet and **drifted into nine mutually incompatible copies** before anyone had to name its class." Use the nine copies, not the tool folders.
2. **`:70` The Human-Agent Alignment Problem.** `:74-78`, on scattered instructions and unclear precedence. **PARTLY CORROBORATED, PARTLY SILENT.** The precedence answer is real and visible—`AGENTS.md:1-28` is an index, `CLAUDE.md` is three lines, `docs/agents/code-review-requirements.md` is a thin pointer. But the specific failure the PRD blames, a tool folder contradicting `AGENTS.md`, appears nowhere in the repository's incident record. Every dated drift incident is canonical-to-canonical or hub-to-consumer. Do not assert the tool-folder version.
3. **`:80` The Governance and Review Problem.** `:82` "GitHub's native model assumes human reviewers." **CORROBORATED and sharpened by the tree**—`REVIEW_POLICY.md:44`: "GitHub counts an approval from **any** account with write access toward `required_approving_review_count`, and it offers nothing to tell a service account from a person—both are `type: \"User\"`." That is the best one-sentence statement of the problem anywhere in either document, and it is in the tree rather than the PRD. Its fourth bullet, `:87` "Automated enforcement of review thresholds and protected paths," is the claim §E52 refutes.
4. **`:90` The Deploy and Runtime Secret Problem.** `:92-98`, on non-interactive Firebase/GCP deploys and runtime secrets. **CORROBORATED, and the least-drifted section of the PRD**: `scripts/firebase/op-firebase-deploy`, `scripts/gcloud/gcloud`, `docs/architecture/0001-onepassword-access-model.md`, and a live headless proof at `.github/workflows/onepassword-headless-proof.yml` all exist and do what `:1646-1648` describes. §E12 already covers `op-preflight.sh`; this is the framing around it.

### E58—the divergence registry is fleet-wide empty, and the one incident it exists to prevent happened on a path it covers

> The page does not yet say this; #753's propagation decision record will want it. Added by the coordinator during the #753 facts pass, 2026-08-28, after §E37 and §E33 made the question obvious.

**SUPPORTED, and it is the sharpest available cost for the propagation decision.** `.sync-overrides.yml` is the per-repo registry that keeps an intentional divergence alive through a propagation wave: a `skip_paths` entry names a manifest-declared path the canonical mirror must not overwrite, and `examples/.sync-overrides.yml:8-9` states the design intent—"Every entry needs a `reason` field for audit-trail. Drift without a documented reason is the failure mode this file exists to prevent."

**Across the eight consumers, the registry carries zero entries.** Seven of the eight have no `.sync-overrides.yml` at all at their current `origin/main`; the eighth, `fiveacross`, has the file and its entire non-comment content is `version: 1`. Read at each consumer's own `origin/main` after `git fetch`, 2026-08-28: `matchline` `5ac5c8f`, `nathanpaynedotcom` `da6b69c`, `overridebroadway` `99940ad`, `device-source-of-truth` `c9f66f0`, `friends-and-family-billing` `d70aa8ac`, `swipewatch` `f3377b7`, `tadlockpsychiatry` `a4d4986`, `fiveacross` `df6cd87`.

Pinned to the eight SHAs above, so the row stays reproducible after any consumer changes its override file. The `${sha}:path` form is braced deliberately—zsh reads a bare `"$sha:path"` as a history modifier and silently drops the path.

```bash
while read -r r sha; do
  git -C ~/GitHub/$r cat-file -e "${sha}:.sync-overrides.yml" 2>/dev/null \
    && echo "$r: $(git -C ~/GitHub/$r show "${sha}:.sync-overrides.yml" | grep -c 'reason:') reasons" \
    || echo "$r: absent"
done <<'PINS'
matchline 5ac5c8fcc
nathanpaynedotcom da6b69c28
overridebroadway 99940ad47
device-source-of-truth c9f66f07a
friends-and-family-billing d70aa8ac9
swipewatch f3377b792
tadlockpsychiatry a4d49863e
fiveacross df6cd87b5
PINS
```

**And the path #1132 destroyed is one the registry could have covered.** `.github/workflows/pr-review-policy.yml` is a manifest-declared canonical path (`.mergepath-sync.yml:1403-1405`, `type: canonical`, `consumers: all`), so it is exactly the kind of entry `skip_paths` accepts—the validator rejects a skip naming a path the manifest does not declare, and this one is declared. `nathanpaynedotcom`'s stronger local version of that job was an intentional divergence that was never written down as one, and the 2026-08-28 wave mirrored the hub's weaker job over it (§E37).

**State it as mechanism and absence, not as blame.** What is established is that the escape hatch exists, that it is declared on no consumer in the fleet, and that the divergence it would have protected was never registered. What is *not* established is that anyone should have foreseen the need, or that a skip entry was the right answer here rather than porting the improvement upstream—which is what `#1136` actually did. The honest page sentence is that a mechanism for declaring divergence exists and is unused, so in practice the fleet's consistency rests on nobody having diverged rather than on divergence being recorded.

**One consumer did use it, and it left the fleet.** `device-platform-reporting/.sync-overrides.yml` carries a single `skip_paths` entry for `eslint.config.js`, with a written reason naming the template gap it works around and the condition for removing it. That repo was archived on 2026-08-26 and dropped as a consumer (§E31), so the registry's only real-world use is no longer in the fleet. Worth knowing before anyone writes that the mechanism has never been used—it has, once.

### E57—material in the tree the ledger does not carry

**SUPPORTED, recorded because #753 will plausibly reach for some of it and none of it has a row.** All verified present at the pinned SHA.

- **`CONTEXT.md`**—a 301-line ubiquitous-language glossary at the repo root, absent from the PRD's own root-file table. `:3` "This file is the domain's ubiquitous language—what each term is, which competing names to avoid, and one entry per sense where a word is overloaded." Every entry carries an explicit `_Avoid_:` clause. It is where §E44's definitions of *clearance* and *HEAD-pinned* come from.
- **`docs/ontology/`**—the rule corpus formalized. `docs/ontology/README.md:3-7`: `rules.md` documents "every normative rule of Mergepath … with a stable ID (**R-1…R-203** for the review pipeline, **G-1…G-383** for structure, governance, the CodeRabbit configuration posture, and deployment)"; `mergepath-rules.ttl` is "an OWL ontology formalizing a core subset … as axioms whose violation a reasoner detects"; `fixtures/` holds "nineteen individuals each deliberately breaking one encoded rule." Gated by `.github/workflows/owl-rules-check.yml` + `scripts/owl-rules-check.py`, deliberately hub-local. `:9` keeps it honest: "All three are **derived models**: on any divergence, `REVIEW_POLICY.md`, `AGENTS.md`, `rules/repo_rules.md` … win."
- **`docs/agents/shared-operating-rules.md`**—the fleet-wide canonical core, and the answer to the nine-copies drift. `AGENTS.md:26`: "one canonical file mirrored to every repo, so a new fleet-wide rule lands by editing it at the canonical source, not by editing every repo's index again."
- **`scripts/ci/check_doc_ownership`**—a declared three-class taxonomy (`canonical` / `per-repo-owned` / `hub-only`) in `.mergepath-sync.yml`'s `doc_ownership:` block, with a deliberate omission worth quoting: "`bootstrap-seeded` is deliberately NOT a class: bootstrap describes initial delivery, not durable ownership."
- **`scripts/ci/check_git_identity_hygiene`**—the #777 gate. `rules/repo_rules.md:54` is the longest rule in the repo, and its last clause is the interesting one: "The static scan covers Markdown because **a documented snippet an agent executes is a writer like any other.**" That is a genuinely unusual threat model and it is why §E54 row 1 exists.
- **`.mergepath-project-docs.yml` + `scripts/project-doc-sync.sh`**—a second, asymmetric sync engine. PRDs flow docs-repo → owning repo; implementation specs flow owning repo → docs-repo. The page currently describes one propagation system; there are two, and the second is the one that drifted (§E55).
- **`repo_lint.yml` is no longer one unconditional suite.** Three jobs: `scope` (:64) classifies the changed-file set via `scripts/ci/repo-lint-scope.sh`, `lint_fast` (:113) runs sequentially, and `deep_safety` (:814) runs only `if: needs.scope.outputs.deep == 'true'`. `repo-lint-scope.sh:33-41` fails closed to full deep CI on an unavailable or invalid dependency graph. Anyone writing "every check runs on every commit" should not.
- **A merge gate with no §E row**—the CodeRabbit Severity Gate (`.github/workflows/coderabbit-severity-gate.yml`, required-check name "CodeRabbit unresolved blocking findings"), whose tier ladder is heuristic because `.github/review-policy.yml:378-380` notes "CodeRabbit has no numeric P-scale." Its sibling, the Review Feedback Accounting Gate, *is* covered—by §E45.
- **`specs/` is a live surface**, not a template pattern: ten real specs at the pinned SHA, including `review_feedback_accounting.md`, `repo_lint_execution.md` and `required_check_publisher.md`.
- **The measurement→retune loop**, which is the closest thing on record to the standard improving itself. `.github/review-policy.yml:230-237` raised the CodeRabbit wait 300s → 1245s on mined data: "p50 414s / p90 861s / p99 1136s / max 1219s (n=142)—committed extract `docs/audits/data/review-latency-2026-07/`. The prior 300s sat below even the p50, so on MORE THAN HALF of PRs the wait timed out before CodeRabbit reviewed." §E51 is the right home for the framing: this is still cost measurement, and it is the one place where measuring the cost demonstrably changed the system.

### E62—the repository does compute a savings figure, and §E51's sweep missed it

> §E51, as first written: "There is no savings language anywhere in the repository." The page built on it: "No savings claim exists anywhere in the repository."

**WRONG, found by Codex on review round 2 of PR #848, and it is the §E51 sweep's own scope that produced the error.** `scripts/phase-4b/accounting.sh` computes a savings estimate and emits it in its aggregate record:

```text
575            human_minutes_saved_estimate:
576              (if $approved == 0 then null
577               else [ $approved * $mlow, $approved * $mhigh ]
578               end)
```

The multipliers are hardcoded at `:97-98`—`P4B_ACCT_HUMAN_MINUTES_LOW=30` and `P4B_ACCT_HUMAN_MINUTES_HIGH=180`—and the figure is rendered for humans at `:1301` as "Human shuttle avoided | **~30 min – 3 h** (manual Phase 4b handoff, per REVIEW_POLICY.md § Phase 4b Triggers)."

```bash
S=3d961050e203e8b7a55bb551e89aa4da834356f6
git -C ~/GitHub/mergepath show "${S}:scripts/phase-4b/accounting.sh" \
  | grep -nE 'HUMAN_MINUTES|human_minutes_saved|Human shuttle avoided'
```

**What this does and does not overturn.** It overturns the absolute: a savings claim does exist, it is named, and it ships in a script rather than in prose—which is exactly why a sweep over docs and one bootstrap script could not see it. It does **not** overturn §E51's substance. The figure is an assumption multiplied by a count: the 30 and the 180 are constants nobody measured, `$approved` is the number of auto-approved pull requests, and the product is labelled `_estimate` in its own field name. There is still no recorded manual baseline anywhere, so the 30–180 minutes has nothing behind it but the range's author.

**Defensible form for the page, and it is sharper than the absolute it replaces:** the repository computes one savings figure, an estimated range of human minutes avoided derived by multiplying auto-approved pull requests by a hardcoded 30-to-180-minute constant. That is an assumption wearing arithmetic, not a measurement, and it is the whole of what the record offers on the savings side.

**Method note.** §E51 stated an absolute over a five-path sweep and the row said so plainly, which is what let a reviewer refute it in one command. An absolute is only as wide as its search; write the search into the row so the next reader can see where it stops.

### E59—the bolded-header refusal, and which component actually refused

> Decision record 1's evidence: "a pull request creation was refused because its body wrote the required header in bold."

**SUPPORTED, and the mechanism matters more than the anecdote.** The primary source is this site's own blog post, `src/content/blog/agent-approval-workflow-genesis-of-mergepath.md:92`, in a paragraph headed "Evidence after launch": "While this post was being fact-checked, a `gh pr create` was refused because its body wrote `**Authoring-Agent:**` in bold. The refusal did not come from the hook: its job was to route the write through the author wrapper, and having seen the wrapper it stepped aside. What rejected the body was the wrapper's own contract check, whose line-anchored match does not see a bolded header."

**Do not attribute the refusal to the hook.** The blog post corrects exactly that conflation, and the same distinction is live in the tree: `#1136`—the pinned SHA—replaced the server-side gate's line-based `grep` with a markdown-aware parser precisely because a line-anchored matcher gets headings wrong in both directions. A page sentence that says "the hook refused it" reproduces the error the source is warning about. Safe form: the layered contract refused a well-intentioned pull request over formatting, which is the cost of a mechanical gate stated in one incident.

### E60—"#1080 took four rounds", derived from the API rather than taken on report

> Decision record 4's evidence: one pull request took four rounds, and rounds two and three each found a defect the previous round's fix had introduced.

**SUPPORTED, and independently derived here rather than copied from the policy's own prose.** `REVIEW_POLICY.md:862` states it as the rationale for raising the budget: "#1080 took four rounds, and rounds 2 and 3 each found a genuine defect that the previous round's fix had introduced. Escalating at the 3rd round would have stopped that review while it was still finding P1s."

The round count checks out against GitHub, and the check is worth recording because the obvious query gives the wrong answer. Counting **review objects** from the Codex App returns **2**, not four—the App posts a review only when it has findings and signals a clean round with a 👍 reaction instead, so review objects undercount rounds by exactly the number of clean ones. Counting **triggers** returns four:

```bash
GH_TOKEN="$OP_PREFLIGHT_REVIEWER_PAT" gh api --paginate \
  repos/nathanjohnpayne/mergepath/issues/1080/comments \
  --jq '[.[]|select(.body|test("^@codex review"))]|length'          # 4
GH_TOKEN="$OP_PREFLIGHT_REVIEWER_PAT" gh api --paginate \
  repos/nathanjohnpayne/mergepath/pulls/1080/reviews \
  --jq '[.[]|select(.user.login=="chatgpt-codex-connector[bot]")]|length'   # 2
```

Two Codex reviews, at 06:46:50Z and 07:04:12Z on 2026-08-22, plus a `+1` reaction on the PR issue; `nathanpayne-claude` posted 18 reviews and CodeRabbit 7 across the same pull request. #1080 is "fix(merge-gate): reject approvals from declared non-reviewer identities," merged 2026-08-22T07:53:13Z—which is the same pull request that shipped the deny-list in §E43. A page using both facts should not imply they are two independent data points.

### E61—the ADR's own citation for the admin escape does not survive reading

> `docs/architecture/0002-branch-protection-enforcement-posture.md:64`: "the grounds that #427 and #428 were both admin merges past a required check."

**WRONG, and it is the §F7 pattern inside the very document §E52 relies on.** Neither artifact is a pull request and neither describes an administrator bypass. Both are **issues**, and both record an **auto-merge** escape:

- `mergepath#427`—"Merge-gate escape: Dependabot dev-deps PR auto-merged without reviewer-identity approval (matchline#245)"
- `mergepath#428`—"Merge-gate escape: external-review PR merged without CLI-identity APPROVED + Codex review on merge HEAD (nathanpaynedotcom#405)"

Neither body contains the string `admin`, `--admin` or `enforce_admins`; both instead point at `#359`, "Auto-merge can bypass explicit external-review handoff." The escapes are real and the ADR's *conclusion*—that an escape hatch has a demonstrated cost—stands on them. What does not stand is the specific mechanism the ADR names: these are automation merging without the required approval, not a human overriding a red required check.

```bash
for n in 427 428; do
  GH_TOKEN="$OP_PREFLIGHT_REVIEWER_PAT" gh api repos/nathanjohnpayne/mergepath/issues/$n \
    --jq '"\(.number) [\(if .pull_request then "PR" else "ISSUE" end)] \(.title)"'
done
```

**Consequence for the page: do not cite #427 and #428 as admin merges.** The learning record about `enforce_admins` holds without them—its observed and response halves are independently verified (`#1121` merged 2026-08-28T02:48:47Z, thirteen seconds before the `enforce_admins` disable the ADR timestamps at 02:49Z)—and citing two issues for a mechanism their own titles contradict would import this defect onto a public page. §E52 is otherwise unaffected: the 2026-07-28 measurement, the required-status-check mechanism and the recommendation status were each read directly and are correct.

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

**F12—"before being extracted into a template"** is the load-bearing error **for the six artifacts above**, and for those it reverses the direction of travel: the template repo's initial commit (2026-03-24 12:08:47) precedes every Override adoption in the tables above, so the machine users, the pipeline, the hook, the escalation rules, the two-strike rule and CodeRabbit were not extracted from Override. Corrected direction for those six: the template was built, and Override received the fan-out along with four siblings.

**This row previously read "nothing was extracted from Override into it." That was wrong—see §F43.** Mergepath's initial commit is a seed, and a substantial part of it is Override's work from the preceding week: `pr-review-policy.yml`, `pr-audit.yml` and the `docs/agents/` layout. Extraction ran *both* ways, a week apart, and this row recorded only one of them.

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

### Delta audit for #754—rows added 2026-08-28

Twenty-nine rows covering the claims #754 puts on the Override page that §F1–§F14 do not reach: the domain vocabulary, the two personas, the wedge and its unbuilt roadmap, the waterfall engine, the deal-room credential and snapshot model, the purity and test coverage of `src/lib/model/`, PRD §7's seven "enforced" invariants, the constraint strip, the validation boundary, and the configurable-versus-enforced split. Everything below was read at **`d652b8660b886603cb7b44bb5d4b6fd67e64beac`** in `~/GitHub/overridebroadway` (`git fetch origin main` 2026-08-28; short form `d652b86`, subject "bulk sync to mergepath@e7d5c17", 2026-08-27T20:13:32−0700). **Every command in these rows is written against that literal SHA rather than `origin/main`**, per the #820 finding that a moving ref makes a row unreproducible. The specification under audit is `~/GitHub/docs/projects/overridebroadway/prds/overridebroadway.md` (v1.0, 2026-03-31, 498 lines) plus `ARCHITECTURE.md` in the same directory; that directory's `specs/` is empty and the five real specs live in the product repo. Per §M1 the tree wins wherever the two disagree, and it disagrees in six places below. One caution for anyone re-running these: this repo's paths trip the zsh `$var:path` trap recorded in the machine notes—brace as `git show "${S}:path"` or the path is silently dropped and you get the whole commit.

### F15—the name

> "Override is a producer's term: the percentage a general partner takes off the top before investors are paid."

**SPLIT—the PRD says it, the codebase uses "override" as a GP economic in four places, and the industry-usage half is not falsifiable from this repository.** The PRD states it at §1.1: "The product's name refers to the producer's percentage taken off the top before investor distributions—an industry term that signals insider knowledge and producer-centric authority." The codebase does carry the term in the intended sense, but **not as an identifier, and the field name a reader would expect does not exist**: `git grep -n 'gpFlatOverride' d652b86 -- src` returns **zero**. The four real occurrences are `src/types/deal.ts:60` (`// GP flat overrides (optional, applied before waterfall)`, heading the `gpFlatWeekly` and `gpFlatProfitPercent` fields), `src/lib/model/calculations.ts:221` (the same comment over `gpFlatFixed`/`gpFlatProfit`/`gpFlatPayment`), `src/types/model.ts:16` (`gpFlatPayment: number; // GP flat override (weekly fixed + % of net profit, before waterfall split)`), and one user-visible label at `src/app/(app)/productions/view/sections/WaterfallSection.tsx:478`, "GP Flat Overrides (optional)", subtitled "Additional fixed compensation applied in sequence: fixed weekly → % of remaining profit → remainder enters waterfall." So the term is real in the product and it does mean a GP take applied ahead of the waterfall—the mechanism at `calculations.ts:223-229` deducts it from operating profit *before* `calculateWaterfallAllocation` is called, which is "off the top" in the literal ordering sense.

The remaining half is the claim that this is what the word means to Broadway producers generally. **Nothing in this repository can confirm or refute that**, and by §M6 that is not UNPROVABLE—it is a first-person domain claim with a known source (the author) that this audit did not go outside the repository to check. Publish it in the register §G17 uses for the Disney demo: a biographical/domain assertion, unfalsifiable here, contradicted by nothing, corroborated by nothing. What the page may state as checkable fact is narrower and still useful—the product ships the term as a GP economic, in its own UI, applied before the waterfall.

### F16—the two personas

> "The primary user is a producer or general partner. Prospective investors read a deal room with no account at all."

**SPLIT—the primary persona and the no-account investor surface are SUPPORTED; the "co-producers managing their own investor pools" secondary persona is WRONG, because the product has no second user.** PRD §1.4 names all three.

**The no-account surface exists and is verifiable three ways.** The route is five lines—`git show "d652b86:src/app/deal-room/page.tsx"` renders `DealRoomDynamicLoader` and nothing else—and it sits outside the `(app)/` group, so it never reaches the guard at `src/app/(app)/layout.tsx:47-51` (`if (!loading && !user) router.push("/login")`). `git grep -n 'useAuth\|AuthContext' d652b86 -- src/app/deal-room` returns **zero**: no file under that route imports auth at all. `firestore.rules:50` reads `allow read: if resource.data.isActive == true;`—no `request.auth` term on the read path. And the repo tests the property structurally at `tests/deal-rooms.test.tsx:469-481`, `describe("no auth required")`, which renders `DealRoomView` outside any `AuthProvider`.

**The co-producer persona is not implemented.** `src/types/production.ts:3-27` has a single `userId` and no collaborator, member, role, or invite field; `git grep -niE 'collaborat|sharedWith|teamId|invitedUsers|coProducer' d652b86 -- src/types src/lib/firestore.ts firestore.rules` returns zero. `ProducerPool` does carry `ownerUserId` (`src/types/capitalization.ts:13`, commented "UID of the producer managing this pool"), but `git grep -n 'ownerUserId' d652b86 -- firestore.rules` returns **zero**—the rule at `firestore.rules:39-43` gates `producerPools` on the parent production's `userId`, so the pool's own owner field is never consulted for access. A producer pool is a *label a single account applies to a group of investors*, not a workspace a second person can sign into. Corrected value for the page: two roles, not three—the producer, who is the only account, and the investor, who has no account. Do not say Override supports co-producers.

### F17—the wedge, and the five roadmap items

> "The modeling engine was the wedge. Capitalization management, investor CRM, document workflows and investor reporting were what it was meant to open onto."

**SPLIT—the wedge framing is SUPPORTED as a statement of intent from the PRD; the claim that none of PRD §8's five roadmap items is built is SUPPORTED against the tree.** PRD §1.5 states the wedge. PRD §8 lists five capabilities as "planned but not yet implemented": Lead CRM, signing workflow, investor reporting, payments and distributions, multi-production portfolio views. All five are absent from `src/`, verified individually:

- **Lead CRM**—`CRM` appears once in the whole of `src/`, at `src/app/page.tsx:48`, and it is marketing copy on the unauthenticated landing page: "A complete production workspace—financial modeling, investor CRM, and a private deal room for your backers." There is no lead, pipeline, or outreach entity anywhere in `src/types/`. **This is the one place where the page must be careful**: the shipped product advertises a capability its roadmap lists as unbuilt.
- **Signing workflow**—`git grep -in 'DocuSign' d652b86 -- src` returns zero. The `signing` token appears once, in the login page's "Signing in…" button state. What exists is *storage*: `InvestorStatus` (`src/types/capitalization.ts:1-6`) is a five-value string union `invited → docs_sent → signed → funded → admitted` that a human sets by hand, plus seven per-investor PDF upload slots (`:39-47`). Status is a label, not a workflow.
- **Investor reporting**—no reporting entity, no post-investment surface.
- **Payments and distributions**—`git grep -in 'Stripe' d652b86 -- src` returns zero. Every occurrence of "payment" in `src/` is `gpFlatPayment`, a modeled number.
- **Multi-production portfolio views**—the nearest thing is the dashboard's `?view=investments` toggle (`src/app/(app)/dashboard/page.tsx:73-79`), which filters the same production grid to those where an investor row carries `isPersonalInvestment`. It is a filter over one user's own productions, not cross-production analytics.

### F18—what the record does not reach at all

> Any page sentence placing Override on a path toward tax filings, fund accounting, or K-1s.

**SUPPORTED—the absence is total at the pinned SHA, which is precisely why the page must not write such a sentence.** `git grep -in 'K-1\|1099\|general ledger\|fund accounting\|tax filing' d652b86 -- src specs docs rules` returns **zero across all five terms**, and the PRD, ARCHITECTURE.md and the five specs are equally silent. The single `tax` hit in the entire product tree is a UI label at `src/app/(app)/productions/view/ProductionHubClient.tsx:858`, "Subscription Agreement & Tax Documents", which names a document-upload slot. This confirms the prior review's finding at the pinned SHA. The written record's own end state is PRD §8's five items and stops there; a page that projects further is inventing a roadmap the repository has never held.

### F19—two Broadway waterfalls, both implemented

> "The engine implements both dominant Broadway distribution shapes—recoup-first and share-from-dollar-one."

**SUPPORTED, in code, with the branch points nameable.** `src/types/deal.ts:23` declares `export type WaterfallType = "recoup_first" | "share_from_dollar_one";`. `src/lib/model/calculations.ts:100` takes it as a parameter of `calculateWaterfallAllocation` and branches at `:125`. Recoup-first has three arms: already recouped (`:126-135`), profit that does not clear the remaining balance (`:139-146`), and the mid-week crossing (`:148-160`), which splits the week's operating profit into the recoupment remainder and a post-recoup residue and runs the split only on the residue. Share-from-dollar-one is `:162-171` and does what its name says—`toRecoupmentPool` and `investorDistribution` are populated from the same investor pool every week, so distributions and recoupment tracking advance together. Both branches are exercised through `runScenario` by `tests/deal-builder.test.tsx`, though only via the default `recoup_first` deal (§F26).

### F20—"royalty categories match APC standard roles"

> PRD §6.1: "Royalty categories match APC (Approved Production Contract) standard roles."

**WRONG as a claim about the role set, and the code annotates only one of the eleven as APC.** `src/types/deal.ts:8-20` declares `Royalties` with exactly eleven fields: `author`, `music`, `lyricist`, `director`, `choreographer`, `setDesigner`, `costumeDesigner`, `lightingDesigner`, `soundDesigner`, `starParticipation`, `productionCompany`. `git grep -n 'APC\|Approved Production Contract' d652b86 -- src specs docs rules` returns exactly **two** hits in the whole repository: `src/types/deal.ts:96`, `author: 0.045, // Book writer: 4.5% of adjusted gross (APC standard)`, and `src/app/(app)/productions/view/sections/RoyaltiesSection.tsx:58`, a tooltip calling the pooled method an "APC royalty pool." Ten of the eleven roles carry no APC annotation; `starParticipation` defaults to `0` and is annotated "Star/name talent overage, deal-specific"; `productionCompany` is a producer entity rather than a creative role at all.

The repository *did* once state its sourcing, and it is broader than APC: `git show 478a7ed:CLAUDE.md | sed -n '575p'` reads that the figures "are derived from publicly reported Broadway financials (Hadestown, Come From Away, Dear Evan Hansen, Wicked, Hamilton) and industry standards (APC, Dramatists Guild, Loeb & Loeb)." **That sentence does not survive to the pinned SHA**—`git grep -n 'Dramatists\|Loeb & Loeb\|publicly reported' d652b86 -- docs AGENTS.md .ai_context.md CLAUDE.md README.md` returns zero; it was dropped when `88cc6fe` (2026-03-23) split `AGENTS.md` into `docs/agents/`, and what remains is the bare rate table at `docs/agents/reference.md:117`. Corrected value the page can stand behind: the eleven royalty participants and their default rates are calibrated to published Broadway deal structures, with the author's 4.5% annotated to the APC specifically. Do not say the categories *are* the APC's roles—the repository asserts that of one of them.

### F21—phase derived from economics, never the toggle

> "The waterfall phase is derived from the deal's economics, not from a UI toggle."

**SPLIT. The derivation claim is SUPPORTED exhaustively and the universal holds—`deriveWaterfallPhaseState` never reads `hasProfitSharing`. The *label* built on it is a genuine inconsistency, the "consistent under its own definition" defence rescues one case and is refuted by the other, the divergent configuration is reachable through the shipped UI in two clicks, and the divergence reaches the investor-facing Deal Room and not only the producer's badge. Nothing tests it; the repository has recorded it and elected to keep it.**

**The universal survives, which is worth saying because most do not.** `src/lib/model/waterfallPhase.ts:75-122` is a pure function of `(ModelOutput, DealInputs)`. Read whole rather than grepped, its complete read set is `dealInputs.totalCapitalization` (`:79`), `dealInputs.postRecoupInvestorSplit` (`:94`), `modelOutput.weeks[].investorDistribution` (`:82-85`), `modelOutput.weeks[].operatingProfit` (`:97`), `modelOutput.recoupWeek` (`:100`) and `modelOutput.weeks.length` (`:120`). `git grep -n 'hasProfitSharing' d652b86 -- src` returns nine hits and **the three inside `waterfallPhase.ts` are all comments** (`:7`, `:34`, `:73`); the file contains no executable reference to the toggle. The four phases are the declared ones (`:10-23`). Two narrowings. The PRD says derivation reads "config ratios," plural—it reads exactly one. And `gpShareOfInvestorPool` is never consulted, which is the hinge of the argument below.

**The engine holds two readings of the same economic question.** The toggle is honoured one file over, at `calculations.ts:232`: `const effectiveInvestorSplit = (deal.hasProfitSharing ?? true) ? deal.postRecoupInvestorSplit : 0;`. `src/types/deal.ts:67` states the precondition the phase function ignores—`postRecoupInvestorSplit` is annotated "(hasProfitSharing must be true)". Nothing reconciles the two.

**Executed, not reasoned about.** Extracting `calculations.ts`, `scenarios.ts` and `waterfallPhase.ts` at `d652b86` into a scratch directory and running `runScenario` on `DEFAULT_DEAL_INPUTS` under the Bull scenario, then summing post-recoupment weeks (the repo itself was not modified and nothing was committed):

| Configuration | Badge shown | Investors | GP | Creatives |
|---|---|---|---|---|
| A. `hasProfitSharing: true`, split 0.5 | "Post-Recoup · Profit Sharing Active" | $7,522,256 | $835,806 | $8,358,062 |
| **B. `hasProfitSharing: false`, split 0.5** | **"Post-Recoup · Profit Sharing Active"** | **$0** | **$0** | **$16,716,125** |
| **C. `hasProfitSharing: true`, split 1.0** | **"Post-Recoup · No Profit Sharing"** | **$15,044,512** | **$1,671,612** | **$0** |

Case B reproduces the coordinator's independent run (which used `recoup_first` at 95% occupancy, $160 ATP, 80 weeks and got `recoupWeek: 4`, `investorPostRecoup: 0`, `creativePostRecoup: 41,338,903` under the same "Profit Sharing Active" label). Two different parameter sets, same result: the finding is not an artifact of either run's inputs.

**Is it a defect, or is it consistent under the field's own definition? Argued both ways, and the defence fails.** The doc comment at `waterfallPhase.ts:32-36` defines the field as "True when `postRecoupInvestorSplit < 1.0`, meaning creative participants **and/or the GP** receive a share of post-recoup profit." **For case B the defence holds at the level of the boolean**: creatives take 100% of the post-recoup residue, so "creative participants receive a share" is literally true, and `profitSharingEnabled: true` is what the comment asks for. Profit *is* being shared—just not with the investors. **But case C refutes the defence on the comment's own terms.** At `postRecoupInvestorSplit: 1.0` with the default `gpShareOfInvestorPool: 0.1`, the GP receives $1,671,612 of post-recoup profit—and the function returns `profitSharingEnabled: false` and the badge reads "No Profit Sharing." The "and/or the GP" half of the definition is never implemented, because `gpShareOfInvestorPool` is not in the read set. So the field is not consistent with its own specification; it is consistent with a narrower rule the comment overstates.

**And the defence never applied to the label in the first place.** `getPhaseLabel` (`waterfallPhase.ts:126-137`) turns the boolean into the string "Post-Recoup · Profit Sharing Active," which is rendered beside investor economics at `LiveOutcomePanel.tsx:115`, `sections/WaterfallSection.tsx:64` and `WaterfallFlow.tsx:63`. Nothing on screen tells a reader that "profit sharing" here may mean *someone other than the investors is being paid*. The boolean answers "is the post-recoup residue split with anybody?"; the label is read as "do investors share in profits?" The two questions coincide only when the toggle is on and the GP carve is zero.

**The configuration is reachable, and it is reachable by leaving a default alone.** `WaterfallSection.tsx` mentions `hasProfitSharing` at exactly one line, `:245`, the `Controller` name for a `Switch` (`:248-251`)—there is **no `watch("hasProfitSharing")` in the file** (the seven `watch()` calls are at `:30-36` and none is the toggle), so nothing in that section reacts to the switch at all. The `postRecoupInvestorSplit` `PercentInput` at `:296-300` is rendered unconditionally and stays editable with the switch off. `git grep -n 'postRecoupInvestorSplit' d652b86 -- src` shows **no clamp anywhere**: nothing forces it to 1.0 when the toggle is off. So flipping the switch off and touching nothing else leaves the default 0.5 in place and lands directly in case B. `sectionCompletion.ts:67` then still reports the Waterfall section **complete**, because its predicate is `waterfallType !== undefined && (postRecoupInvestorSplit ?? 0) > 0`—the divergent state satisfies the completion check. The coordinator is right that `DEFAULT_DEAL_INPUTS` ships `hasProfitSharing: true` (`src/types/deal.ts:119`), so the out-of-the-box deal does not hit it; one switch does.

**The finding is larger than the badge: it reaches the investor.** `git grep -c 'hasProfitSharing' d652b86 -- src/app/deal-room` returns **zero**—no file on the public route reads the toggle. `DealRoomView.tsx:421-425` renders a `DealTermCard` labelled **"Investor Pool (post-recoup)"** whose value is `formatPercent(dealInputs.postRecoupInvestorSplit)`, subtitled "of distributable profit," among the eight headline deal terms. And `WaterfallFlow.tsx:89-92`—the same component the Deal Room reuses when `showWaterfall` is on—computes its per-dollar split chart from `postRecoupInvestorSplit` and `gpShareOfInvestorPool`, under the comment `// Post-recoup split percentages (from deal config — not from toggle)`. **So in case B a prospective backer is shown "50% of distributable profit" as a headline term of the deal, for a deal in which the engine computes their post-recoup share as zero.** That is not a cosmetic badge problem; it is the one number an investor would read first.

**Verdict, stated for the page.** The *phase derivation* is sound, deliberate and worth claiming: reading the economic condition instead of a UI flag is the right instinct, and the four-phase model is clean. The *label and the deal term built on that same ratio* are underdetermined, and in the one configuration a single switch produces they say the opposite of what the money does. The repository already knows: `docs/agents/reference.md:147`—"**Known inconsistency:** … The phase badge can show 'Profit Sharing' while calculations give investors nothing if the toggle is off. **Preserve this behavior.**"—and `ARCHITECTURE.md` §14 lists it first among "Current Risks / Mismatches." Defensible sentence: **"The phase is derived from the deal's economics rather than from the profit-sharing switch, which is the right call and is stated three times in the source. It also means the two can disagree: turn the switch off without changing the split and the engine pays investors nothing post-recoup while the badge—and the Deal Room's own 'Investor Pool' term—still read 50%. That is written down in the repo as a known inconsistency and deliberately kept."** That claims the decision, names the cost, and does not call it a bug the author failed to notice.

**Nothing tests it.** `git grep -n 'deriveWaterfallPhaseState\|waterfallPhase' d652b86 -- tests` returns zero—the function has no test of any kind, and neither does the divergence. The separation is held by three source comments, two documentation notes and review convention; there is no lint rule, no CI script and no type-level barrier (§F27).

### F22—the token is the credential

> "The Deal Room URL carries a token, and the token is the whole credential: no account, no login, no invitation."

**SPLIT—every mechanical part is SUPPORTED; the "UUID v4" the docs give for the token is WRONG.** The route, the missing guard, and the rules are covered in §F16. Deactivation does what the page will say it does: `deactivateDealRoom` (`src/lib/firestore.ts:371-373`) writes `isActive: false`, and because `firestore.rules:50` gates read on `resource.data.isActive == true`, the read fails at the database rather than in the client—`DealRoomClient.tsx:43` also branches on `!room.isActive`, but the rule is the enforcing layer and the client check is defence in depth. `firestore.rules:47` states the model in the file itself: "The share token IS the document ID. Knowing the token grants read access."

**The token is a Firestore auto-ID, not a UUID v4.** `createDealRoom` (`src/lib/firestore.ts:329-341`) calls `addDoc(collection(db, "dealRooms"), …)` and returns `ref.id`; `git grep -n 'uuid\|randomUUID' d652b86 -- src package.json` returns **zero**—no UUID library is installed and `crypto.randomUUID` is never called. Both `src/types/dealRoom.ts:27` ("share token (UUID v4)") and PRD §2.3 ("document ID = share token (UUID v4)") describe a generator the code does not use. The correction is cosmetic for security—a Firestore auto-ID is 20 characters over a 62-character alphabet, roughly 119 bits against a v4's 122—but the page should not repeat a generator name the tree contradicts. What is worth stating instead: the token is unguessable, unexpiring, and non-revocable except by flipping `isActive`; `expiresAt` exists on the type (`src/types/dealRoom.ts:69`) and is commented "if set, producer **should** deactivate after this date," which is a note to a human, not an enforced expiry.

### F23—snapshot, not live

> "A Deal Room is a snapshot. Edits after sharing do not reach the investor until the producer clicks Update Snapshot."

**SUPPORTED in code on both halves.** `src/types/dealRoom.ts:23-24` states it as a type-level contract: "Data is snapshotted at share time; edits to DealInputs after sharing do NOT automatically update the deal room." `DealRoomSetup.tsx:175-183` shows creation copying `dealInputs` and the production metadata into the new document; nothing subscribes the deal room to later writes—`getDealRoom` is a one-shot `getDoc` (`firestore.ts:348-354`), not an `onSnapshot`, so even a live re-read would return the stored copy. Propagation is an explicit user action: `handleRefreshSnapshot` at `DealRoomSetup.tsx:239-273` re-sends `dealInputs`, the production block and `config` through `updateDealRoom`, and it is bound to one button labelled "Update Snapshot" at `:505`, tooltipped at `:498` ("Re-snapshot your current deal structure. Investors will see the updated numbers."). The rationale is stated to the producer in the UI at `:633-637`, not only in the PRD. `DealRoomSetup.tsx:478-480` renders the snapshot date, so the staleness is visible rather than silent.

### F24—"aggregate capitalization only"

> "The Deal Room shows aggregate deal economics. No individual investor is ever in it."

**SPLIT. The no-individual-investor claim is SUPPORTED by construction and enforced by nothing; the PRD's stronger form—that document URLs are never exposed—is WRONG.**

**Seven places assert it and zero enforce it.** The assertions: `firestore.rules:48` (a comment), `src/types/dealRoom.ts:11` and `:21` (comments), `src/app/deal-room/DealRoomView.tsx:593` (a comment), `src/app/(app)/productions/view/DealRoomSetup.tsx:579` (producer-facing copy), `docs/agents/operating-rules.md:96`, and `specs/deal-rooms.md:51`, `:85-86` and `:105` (AC-8, an unchecked acceptance criterion). The PRD adds four more (§2.3, §3.8.2 twice, §5.4). **Not one of them is a mechanism.** `firestore.rules:51-54` validates only `ownedByUserId` on create—there is no schema constraint, no field allowlist, no rule that would reject a deal-room document containing a cap table.

**What actually makes it true is a single prop.** The invariant holds because `DealInputs.investors` is `[]` in Firestore (`rules/repo_rules.md:43`), and because `ProductionHubClient.tsx:1635` passes `dealInputs={dealInputs}`—the stored form value—to `DealRoomSetup`, rather than `liveDeal`, the bridged object built one hundred and fifty lines earlier at `:478` (`const liveDeal = { ...dealInputs, ...liveFormValues, investors: bridgedInvestors };`). Both objects are in scope in the same component. Passing the other one would put every investor's name and amount into a world-readable document, and nothing in the repository—no rule, no test, no CI check, no type—would stop it. That is the honest shape: a privacy property held by one argument at one call site, asserted eleven times and enforced zero.

**The document-URL claim is false.** PRD §5.4 (line 412) says "The cap table, investor identities, investment amounts, **and document URLs** are never exposed to the public deal room route." The create payload at `DealRoomSetup.tsx:185-192` copies four production document URLs (`investorInstructionLetterUrl`, `memberSignaturePageUrl`, `subscriptionAgreementUrl`, `operatingAgreementUrl`) into the deal-room document, and `handleRefreshSnapshot` copies them again at `:252-259`. `src/types/dealRoom.ts:44` annotates them "Firebase Storage signed URLs—publicly accessible," and that is accurate: `src/lib/storage.ts` obtains every URL via `getDownloadURL` (`:33`, `:65`, `:105`, `:149`), which returns a download-token URL that bypasses `storage.rules`—so the URLs work for an unauthenticated fetcher even though `storage.rules:7` restricts the bucket path to the owning UID. `DealRoomView.tsx:512` renders them only when `config.showDocuments` is true, **but the toggle gates display, not storage**: the URLs sit in the document, and `firestore.rules:50` makes the whole document readable to anyone holding the token. The PRD contradicts itself here—its own §3.8.2 lists "Documents (if enabled): Links to uploaded PDFs" as a deal-room section. Corrected value: **no individual investor data**, which is true; **not** "only aggregate deal economics," which understates what the document holds. Where the producer has uploaded production-level agreements, their URLs are in the token-readable document whether or not the documents section is switched on.

### F25—"pure TypeScript, zero React or Firebase," and the UI that never re-derives

> PRD §6.3: "The financial engine (`src/lib/model/`) is pure TypeScript with no React or Firebase dependencies… The UI layer is purely presentational—it reads from `ModelOutput` and never re-derives financial calculations. This separation is enforced by structural conventions."

**SPLIT—the purity universal is SUPPORTED exhaustively; "never re-derives" is WRONG; "enforced" is WRONG, it is convention.**

**Purity: verified over all five files, not sampled.** `src/lib/model/` contains exactly `calculations.ts` (320 lines), `formatters.ts` (32), `ownershipRollup.ts` (73), `scenarios.ts` (151) and `waterfallPhase.ts` (165). Their complete import set is six statements, and every one is either `import type` from `@/types/*` or the single value import `scenarios.ts:9-13` pulling three functions from `./calculations`. `formatters.ts` imports nothing. No React, no `firebase`, no `next`, no DOM. The universal holds, which the page may state as such.

**"Never re-derives" does not hold, and the counterexamples are in the file that consumes the engine hardest.** `WaterfallFlow.tsx` calls `deriveWaterfallPhaseState` at `:63`—and then at `:85-87` recomputes by hand the very reduction that function already performed: `const totalLpDist = modelOutput.weeks.reduce((s, w) => s + w.investorDistribution, 0);`, byte-for-byte the sum at `waterfallPhase.ts:82-85`, with `phaseState` sitting in scope. `:77` recomputes a recoupment percentage (`lastWeek.cumulativeProfit / dealInputs.totalCapitalization`) that `calculations.ts:245-248` already emits as `recoupPercent` on every week. `:80` derives a remaining balance. `WaterfallSection.tsx:533` reproduces the engine's carve arithmetic for display (`gpInvestorCarvePct = investorSplit × gpShare × 100`). And `units = round(cap / unitPrice)` is derived independently in two components, `ProductionHubClient.tsx:449` and `sections/CapitalizationSection.tsx:64`. Corrected value: the **weekly pipeline and the waterfall allocation** exist only in `src/lib/model/` and are never duplicated—that is the real and defensible claim. Run-totals, ratios and display percentages are re-derived in the UI in at least six places.

**Nothing enforces any of it.** The PRD says "structural conventions," which is candid; the page should not upgrade that word. `git grep -ln 'useForm\|stripUndefined\|use client' d652b86 -- scripts .github/workflows .claude` returns **zero files**. There is no ESLint boundary rule, no import-restriction config, no dependency-cruiser, no CI script that inspects `src/lib/model/`'s imports. The separation survives because it is written down in three places (`rules/repo_rules.md:52-54`, `docs/agents/code-modification-rules.md:17`, `:64`) and because reviewers read them.

### F26—how correctness is actually evaluated

> "The engine is the part that has to be right, so it is the part that is tested."

**WRONG, and the page must not write that sentence. The engine's test coverage is thin, three of its eight money tests can pass without asserting anything, and the one substantive correctness check in the record is not a test at all.**

**The counts, confirmed by execution.** Five product test files exist (`tests/{auth-flow,dashboard,deal-builder,deal-rooms,update-checker}.test.tsx`), carrying 19, 12, 18, 26 and 11 `it()` blocks—**86 in total**, one file per `status: active` spec, matched by name. `npx vitest run` in the checkout reports **`Test Files 5 passed (5)` / `Tests 86 passed (86)`** in 2.43s. The counts are exact and the suite is green. One caveat on the provenance of that run: the local checkout was at `b94c2b6`, and `git diff --stat b94c2b6 d652b86 -- src tests/*.test.tsx vitest.config.ts` shows **no change to any product source or product test file** between the two (the 69-file delta is `scripts/`, `.github/`, governance `tests/*.sh` and `package.json`), so the result carries to the pinned SHA.

**But the number is the wrong instrument.** `git grep -nE 'from "@/lib/model' d652b86 -- tests` returns exactly **two** lines, both importing `runScenario` (`deal-builder.test.tsx:188`, `deal-rooms.test.tsx:225`). **`calculations.ts`, `waterfallPhase.ts`, `ownershipRollup.ts` and `formatters.ts` have no direct test**—the 320-line weekly pipeline is exercised only transitively, and `deriveWaterfallPhaseState` (§F21) is not exercised at all. Of the 86, **eight** are engine tests; the other 78 are component-rendering, auth-mock and polling tests.

**What those eight assert, line by line, because "they assert arithmetic" needs splitting.** `deal-builder.test.tsx:190-297`, `describe("runScenario (financial model engine)")`. Taking the three lines a reader is most likely to cite as proof of arithmetic coverage:

- **`:208`**—`expect(output.totalGrossBoxOffice).toBeCloseTo(summedGross, 2)`, where `summedGross` is built at `:207` by reducing `output.weeks`. This is the **engine checked against itself**: both sides come from the same call. It catches an aggregation bug and cannot catch a wrong gross.
- **`:251`**—`expect(alice.poolPercent).toBeCloseTo(100_000 / deal.totalCapitalization, 6)`. This one **is** genuine independent arithmetic: the expectation is computed from the inputs, not from the output. `:255` is its twin for the second investor. These are the strongest assertions in the file.
- **`:259`**—`expect(bob.totalReceived / alice.totalReceived).toBeCloseTo(2.0, 1)` is real arithmetic but sits **inside `if (alice.totalReceived > 0)` at `:258`**, so it is skipped whenever distributions are zero.

So the fair characterisation is neither "only rendering" nor "asserts arithmetic": **two assertions check money against a figure derived from the inputs, and both are about pool percentages rather than about the pipeline.** Nothing in the file asserts an expected gross, royalty, weekly nut deduction, operating profit or distribution amount. And **three of the eight tests are guarded by an `if` and assert nothing when the guard is false**—`:216` (`if (output.recoupWeek !== null)`), `:267` (`if (output.weeklyBreakeven !== null)`), `:278` (`if (output.approximateIRR !== null)`), plus the nested guard at `:258`. A regression that made recoupment, breakeven or IRR return `null` would turn three tests green rather than red, and the suite would still report 86 passed.

**The real evaluation is a calibration written in prose, and it still holds.** `docs/agents/reference.md:125` records a "Hadestown validation (calibrated model)": 947 seats, 93% occupancy, $155 ATP, 10% discount at $90, 2.5% CC, 6% house, 14% royalties, $25K running offset, $530K nut, 1.5% GP fee, expected to produce ~$1.05M weekly gross, 57% breakeven and ~37 weeks to recoup, each ticked. It first appears in `478a7ed:CLAUDE.md:651` on **2026-02-24, the same commit that built the engine**, alongside benchmarks sourced to five real productions. **This audit re-ran it at `d652b86`**—extracting the three model files, seeding `DEFAULT_DEAL_INPUTS` with those parameters and calling `runScenario` at 93% occupancy—and it reproduces exactly: **weekly gross $1,046,283, breakeven 57.0%, recoup week 37**. That is a real, still-valid, externally-anchored correctness check on the financial engine, and it is the strongest thing the page can say about whether the math is right.

**It is also not a test.** `git grep -nE '947|530_?000|Hadestown' d652b86 -- tests` returns only issue numbers in a shell script. Nothing runs the calibration in CI; nothing would catch it drifting. The honest formulation for the page: the engine was calibrated once against published figures for a real show, the calibration reproduces today, and it lives in a documentation table rather than in the suite.

**One date worth carrying.** Tests arrived in `334d746`, 2026-04-02, **five weeks after the engine shipped**—the same after-the-fact ordering §G23 records for swipe-watch's specs, and the five specs themselves land later still (§F30c).

### F27—PRD §7's seven "structural invariants… enforced by CI scripts and repo rules"

> PRD §7 heading: "These constraints are enforced by CI scripts and repo rules."

**WRONG for six of seven, and the seventh is enforced against a different property than the one stated.** This is the most checkable sentence in the PRD and it does not survive contact with `scripts/ci/`. All seven appear as prose in `rules/repo_rules.md` (lines 41-44 and 29-36). The enforcement question is answered by `git grep -ln '<token>' d652b86 -- scripts .github/workflows .claude`, which returns **zero files** for `useForm`, `stripUndefined`, `use client` and `functions/`.

| # | Invariant | Prose | CI |
|---|---|---|---|
| 1 | One `useForm()` instance | `repo_rules.md:41` | **none** |
| 2 | `DealInputs.investors` always `[]` | `repo_rules.md:43` | **none** |
| 3 | `stripUndefined()` before every write | `repo_rules.md:44` | **none** |
| 4 | No `"use client"` on server wrappers | `repo_rules.md:42` | **none** |
| 5 | No Cloud Functions | `repo_rules.md:29` | **none—and the one check that could is configured against it** |
| 6 | Output to `out/`, never `dist/` | `repo_rules.md:30`, `:35` | **partial, and for a different property** |
| 7 | No committed secrets | `repo_rules.md:36` | **partial** |

**One line per invariant, derived independently here rather than taken on report.** (1) `useForm`—zero hits in `scripts/` and `.github/workflows/`; the only guard is prose plus the fact that `ProductionHubClient` currently holds the sole instance. (2) `DealInputs.investors`—zero hits; held by one argument at one call site, per §F24. (3) `stripUndefined`—zero hits in CI; it is called inside `src/lib/firestore.ts` by convention, and a new write path that omitted it would fail at runtime against Firestore rather than in CI. (4) `"use client"`—zero hits; nothing parses `page.tsx` for the directive. (5) no Cloud Functions—zero hits, and see below. (6) `out/`/`dist/`—one check, aimed elsewhere, see below. (7) no committed secrets—no content scanner in this repo, see below. **The characterisation of `scripts/ci/` as governance rather than domain enforcement is correct and checkable**: of the **72** `check_*` scripts in the tree, every one concerns review policy, propagation, identity, feedback accounting, workflow wiring or repo layout. `git ls-tree -r --name-only d652b86 -- scripts/ci` contains no script naming a product file, a product type, or a financial concept. The suite is Mergepath's, synced in (§F6–F12); nothing in it was written for Override's domain, which is exactly why PRD §7's sentence does not hold.

**Invariant 5 is worse than unenforced.** `scripts/ci/check_no_forbidden_top_level_dirs` hard-fails on exactly two directories, `vendor` and `node_modules/.cache/custom`; its `ALLOWED_DIRS` array explicitly lists **`functions`** and **`dist`**. Adding a `functions/` directory to this repo would pass the only check that inspects top-level layout. The invariant is true of the tree as it stands—there is no `functions/` entry in `git ls-tree --name-only d652b86`, and `firebase.json` carries `hosting`, `firestore` and `storage` keys and no `functions` key—but it is true by nobody having done it.

**Invariant 6 is enforced sideways.** `check_dist_not_modified` reads `generated_dirs` from `.repo-template.yml`, which is `generated_dirs: [out]`, and fails when files under `out/` were edited between commits. That enforces "never hand-edit the build output," which is `repo_rules.md:35`. It does nothing about `dist/`, which `ALLOWED_DIRS` permits.

**Invariant 7 is enforced by `.gitignore` plus one narrow gate.** `.gitignore` covers `.env*` and `*.key`. `git grep -lniE 'gitleaks|trufflehog|secret.?scan|detect-secrets' d652b86 -- .github scripts` returns zero, so there is no content scanner in this repo's CI. `scripts/ci/check_no_token_in_output` exists but its own header scopes it to shell source under `scripts/**` and `tests/**` that interpolates a credential *variable* into an output command—it is a token-leak gate for the review tooling, not a committed-secret gate for the product. (GitHub's own push protection may or may not be enabled on the repository; that is a platform setting outside the tree and was not checked here.)

**And `check_spec_test_alignment`, the check nearest to the product, is advisory by construction**: it prints `WARN:` lines at `:199`, `:216` and `:232` and terminates `exit 0` at `:243`. Corrected value for the page: the seven invariants are written down, and a reviewer or an agent enforces them by reading the rules file. Two of the seven have a CI script in the vicinity; neither checks the invariant as PRD §7 words it.

### F28—the external-review gate does not cover the financial engine

**NEW in this session, SUPPORTED, and it sharpens §F27 rather than repeating it.** `.github/review-policy.yml` sets `external_review_threshold: 300` and an `external_review_paths` list that forces external review regardless of diff size: `src/auth/**`, `src/payments/**`, `**/*secret*`, `**/*credential*`. **Neither `src/auth/` nor `src/payments/` exists in this repository**—`git ls-tree -r --name-only d652b86 -- src` shows auth living at `src/contexts/AuthContext.tsx` and `src/app/(auth)/`, and there is no payments code at all (§F17). The list is the template's generic default, never calibrated to this repo. Meanwhile `rules/repo_rules.md:50-58` names its own "High-Risk Modification Zones" and puts `src/lib/model/calculations.ts`, `scenarios.ts` and `waterfallPhase.ts` at the top—**and none of the three is in `external_review_paths`**. So a change to the financial engine under 300 lines takes the ordinary review path, while a change to a directory that does not exist would be escalated. This is the same shape as §F27: the repository's judgment about what is dangerous is recorded in prose, and the machine gate is pointed somewhere else.

### F29—the constraint strip

Five items, verified individually at `d652b86`.

**(a) Static export, no backend server, no Cloud Functions—SUPPORTED.** `next.config.ts:11` `output: "export"`, `:12` `trailingSlash: true`, `:14` `images.unoptimized`. `firebase.json` has `hosting` (serving `out/`), `firestore` and `storage`, and no `functions` key. No `functions/` directory in the tree. All business logic is client-side, which is why the engine can be pure (§F25) and why the access model has to live in `firestore.rules` (§F22).

**(b) Firebase Hosting at overridebroadway.com—SUPPORTED for the project, EXTERNALLY SOURCED for the domain.** `.firebaserc` pins `"default": "soyouthinkyouwant"`; `firebase.json` `"public": "out"` with an SPA rewrite and three cache-header rules. The custom domain is stated by PRD §2.1 and §9.1 and by `docs/agents/operating-rules.md:102` (the share-link format), and by the page's own `liveUrl`. **The DNS binding is a Firebase console setting and was not verified here**—per §M6 that is EXTERNALLY SOURCED, not UNPROVABLE.

**(c) Five specs, all `active`—SUPPORTED.** `git ls-tree -r --name-only d652b86 -- specs` returns `.gitkeep` plus five files. Front matter, read individually: `auth-flow` (Authentication Flow), `dashboard` (Dashboard), `deal-builder` (Deal Builder), `deal-rooms` (Deal Rooms), `update-checker` (Update Checker). **All five carry `status: active` and all five carry `last_updated: 2026-03-31`**—they were written in one sitting. §M1's warning does not bite here: no spec header claims a state the tree contradicts. What is worth noting instead is the ordering—`git log d652b86 --diff-filter=A --format='%h %ad %s' --date=short -- specs` gives `9f28a7e` 2026-03-12 (adding only `specs/.gitkeep`), then `2287231` and `5471cb7` on 2026-03-31 adding all five. **Five weeks after the product shipped.** These are documents of the build, not documents the build was made to, exactly as §G23 records for swipe-watch.

**(d) The build window—first commit 2026-02-18, product complete 2026-03-31.** `bfdb5d6`, 2026-02-18T14:09:11−0800, is the `create-next-app` scaffold (§F1). The product arrives six days later in a single commit: **`478a7ed`, 2026-02-24T10:09:12−0800, "Updates via Claude Code," 91 files changed, +19,674/−837**, of which 64 files are under `src/`. The last commits that change product behaviour are `fad58d5` and `fb68edd`, both 2026-03-31 (a Safari/Firestore-503 loading fix and its review follow-up). **Substantive was distinguished from mechanical by reading the diff, not by subject line**: the only later commit touching `src/` is `29973a1`, 2026-08-04, whose entire `src/` change is renaming an unused destructured binding `getValues` → `_getValues` in `DealBuilder.tsx` to satisfy lint during a dependency sweep. So the product window is **2026-02-18 to 2026-03-31, six weeks**, and everything after it is platform, process, dependency and template work.

**(e) 173 commits on main at the pinned SHA.** `git rev-list --count d652b86` → **173**.

### F30—the commit count, re-derived, and the shape it hides

> ":44 More than a hundred of its commits are product and platform work; the rest of the history is dependency bumps and template syncs."

**SUPPORTED as arithmetic and misleading as description. The corrected §F2 value still holds exactly; the sentence's problem is now the word "product."**

**Both figures re-derived at `d652b86`.** Total **173** (`git rev-list --count d652b86`). Dependency commits **51** (`git log d652b86 --format='%s' | grep -cEi '^(deps:|deps\(|chore\(deps|build\(deps|Bump )'`). Template propagation **21** (`| grep -cEi 'sync to mergepath|propagat|template sync|bulk sync|verbatim canonical'`; up from 19 at the §F2 audit). Remainder **101**, confirmed by the complement (`grep -vE` both patterns → 101). §F2's "over 170 commits" is now 173, and its "more than a hundred commits of product and platform work" is exactly right at 101.

**But only six of the 173 touch `src/`.** `git log d652b86 --format='%h %ad %s' --date=short -- src` returns the complete list: `bfdb5d6` (scaffold), `478a7ed` (the product), `cc144d7` 2026-02-27 (em-dash restyling of UI strings), `fad58d5` and `fb68edd` 2026-03-31 (the Safari fix), `29973a1` 2026-08-04 (the lint rename). `firestore.rules` was touched by **one** commit ever; `storage.rules` by one; `firebase.json` by one. By contrast `git log d652b86 --format='%h' -- scripts .github | wc -l` returns **66**, and `package.json` was touched by 45. **The 101 "product and platform" commits are platform almost to a commit.** The sentence is defensible on its own terms because it says "product *and* platform," but a reader hears the first noun. Recommended rewrite: name the shape rather than the total—the product was built in a handful of commits over six weeks, and the remaining five months of history is the review, deploy and dependency apparatus around it. That is a more interesting fact than any count, and it is the fact this repository actually contains.

**On the count itself, per §H7:** every commit number on a page is frozen at its writing date and 173 will be wrong within a month—the repo has taken roughly twenty commits a month since May, almost all Dependabot and template sync. If a number must appear, prefer a floor that ages in the right direction ("over a hundred and seventy") over a point estimate, and prefer dropping it entirely in favour of the six-versus-167 split, which does not go stale because `src/` has not been touched in five months.

### F31—the validation boundary

> ":58 nothing in the record shows a real capitalization managed in it, an outside investor admitted through it, or a Deal Room link sent to an actual backer."

**SUPPORTED at the pinned SHA, and the scope of "the record" needs stating on the page rather than in this ledger, because one instrument that could answer the question exists and was not read.**

**What was searched.** All **138** issues and pull requests in `nathanjohnpayne/overridebroadway` (`state=all`), with every body, every issue and PR-conversation comment (`/issues/comments`) and every inline review comment (`/pulls/comments`)—a 31,052-line corpus. Matches, case-insensitive: `real production` 0, `actual investor` 0, `live deal` 0, `first user` 0, `customer` 0, `signed up` 0, `waitlist` 0, `sent the link` 0, `share link` 0, `demoed` 0, `demo to` 0, `cap table` 0. `beta` (27) and `pilot` (23) are entirely Dependabot changelog text—"pilot" is the tail of "Copilot"—which is §G23's phantom-hit lesson recurring: a case-insensitive sweep over a corpus full of vendor release notes manufactures matches, and every hit has to be read. `investor` returns **1** and `deal room` returns **1**, both inside engineering prose about `useProducerPools` and test coverage. The item titles corroborate it: after #17 (2026-04), not one of the remaining 121 items is a product feature—they are dependency bumps, template syncs, weekly PR audits and review-tooling fixes.

**The one near-miss, and it belongs on the page.** Issue #12's body, reporting slow production loads, names the productions in the author's own account: "clicking on **Proof, The Producers, Spider-Man, Hamilton, or Beetlejuice**." So productions *were* created and navigated—five of them, named after real shows. That is the author exercising his own tool, not a capitalization managed for anyone. It does not contradict the sentence, but it is the closest thing the record holds and a reader who finds it should not feel the page hid it.

**Be precise about absent-from-the-record versus known-not-to-have-happened, because an instrument exists.** `src/lib/analytics.ts:70-71` defines `dealRoomViewed: (token) => trackEvent("deal_room_viewed", { token })`, and `DealRoomClient.tsx:50` fires it on **every** successful deal-room load, keyed by token. Alongside it sit `deal_room_created`, `deal_room_link_copied`, `deal_room_updated` and `deal_room_deactivated`. **If a Deal Room link were ever opened by anyone, Firebase Analytics would hold the event.** This audit did not query that property—per §M6 that is EXTERNALLY SOURCED, not UNPROVABLE, and it is exactly the §GM2 shape: the measurement exists, the read does not. The defensible sentence is the one the page already has, with its scope named: *the repository, its 138 issues and pull requests, and its commit history contain no evidence of external use; the analytics property that would settle it has never been queried.* Do not write "nobody ever used it."

### F32—guided mode and direct mode

> "First-time producers get a stepper; experienced ones get every section at once."

**SUPPORTED, both modes, in code.** `DealBuilder.tsx:6` documents the two-pane shape ("section navigation (guided stepper OR direct tab bar)"); `:83` holds the state (`const [guidedMode, setGuidedMode] = useState(initialGuidedMode)`), `:113` toggles it, `:170` passes it down. `DealBuilderNav.tsx:75` is the branch: `if (guidedMode)` renders the linear stepper, otherwise the tab bar. The choice persists across refreshes through Zustand—`src/stores/dealStore.ts:13` `guidedModeActive`, `:28` defaulting to `false`, `:33` the setter, `:42` the reset—and `dealStore.ts:5` scopes the store to "guided mode progress only," which is why deal data is never in it. Guided mode is gated by the same `isComplete()` functions that drive the status dots (`sections/sectionCompletion.ts`). **Note for the page's framing:** the default is *direct* (`:28` is `false`), so the guided path is opt-in—progressive disclosure here is an available mode, not the first-run experience.

### F33—configurable versus enforced

> "A producer can change the rates and the shape of the deal. What a producer cannot change is the order the money moves in."

**SUPPORTED, and enumerable on both sides.**

**Configurable—every one of these is a field on `DealInputs` (`src/types/deal.ts:26-75`) that the Deal Builder exposes.** Rates and amounts: total capitalization, units, unit price, weekly nut, capacity, performances, average and discounted ticket price, discount rate, credit-card fee rate, house percentage, optional house-profits threshold and split-above. Eleven royalty rates (`Royalties`, `:8-20`) plus the royalty base (`adjusted_gross` or `net`), the pool type (`fixed` or `pool`) and an optional pool percentage. GP economics: management fee rate, share of investor pool, optional flat weekly payment, optional flat profit percentage. Waterfall: type, the profit-sharing toggle, the post-recoup investor split, the running-royalty-offset toggle and its weekly amount. Run parameters: estimated weeks, preview weeks, opening week. Scenario parameters—occupancy, ATP, run length—are editable per scenario in the Scenarios tab. Deal-room section visibility is five booleans plus a note (`src/types/dealRoom.ts:8-15`), defaulting to financial model and waterfall on, capitalization, documents and weekly breakdown off (`:88-95`).

**Enforced—these are properties of `src/lib/model/`, not settings.**

- **The deduction ordering.** `calculations.ts:179-229` runs a fixed sequence: gross (`:182`) → credit-card fees and house (`:191`) → adjusted gross → royalties, with the running offset applied only while un-recouped (`:201-211`) → net box office (`:213`) → weekly nut (`:215`) → GP management fee on positive profit only (`:218`) → GP flat overrides, fixed then percentage, each capped at remaining profit (`:223-226`) → operating profit (`:229`), which is what enters the waterfall. No input reorders this. `weeklyOfficeCharge` is a field the producer can set that the pipeline **never reads**—`docs/agents/reference.md` records it as "kept for Firestore compat but not used in any calculation."
- **The GP carve comes out of the investor pool, not the creative pool.** `calculations.ts:127-135`: `const investorPool = operatingProfit * postRecoupInvestorSplit; const gpShare = investorPool * gpShareOfInvestorPool;` then `investorDistribution: investorPool - gpShare` while `creativeDistribution: operatingProfit * creativeParticipantSplit` is computed from the untouched complement. Confirmed numerically in the §F21 run: at defaults the GP takes $835,806, the LPs $7,522,256—summing to the $8,358,062 investor pool—while creatives receive $8,358,062 unreduced. Same structure in all three branches (`:127-135`, `:151-160`, `:162-171`).
- **Phase derivation**, per §F21—the producer sets the ratio; the phase is read off it and off the model output, and the toggle cannot move it.
- **The `DealInputs.investors` bridging invariant.** `rules/repo_rules.md:43` and `ProductionHubClient.tsx:478`: per-investor returns are always computed from the cap-table subcollection, never from the form array, which is why editing the deal form cannot change who is on the cap table.

The framing that survives audit: the domain vocabulary and every number in it are the producer's; the *sequence* and the *direction* of the money are the engine's, and there is no setting that moves them.

### F34—custom scenarios exist in the data layer and nowhere else

> PRD §3.5.6: "The Firestore layer includes `saveScenario()`, `getScenarios()`, and `deleteScenario()`, but custom scenario creation and management is not currently exposed in the UI."

**SUPPORTED, and the tree is stronger than the PRD.** All three functions exist—`src/lib/firestore.ts:121`, `:128`, `:145`—with a `scenarios/{scenarioId}` subcollection provisioned for them in the data model and a matching security rule at `firestore.rules:25-29`. `git grep -n 'saveScenario\|getScenarios\|deleteScenario' d652b86 -- src` returns **only those three definition lines and no call site anywhere in the application**. So it is not merely un-surfaced in the UI: nothing in the product calls them. This is the cleanest shipped-versus-not example in the repository—a persistence layer, a subcollection and a security rule built for a feature whose UI was never written—and it is a better illustration of the wedge's unfinished edge (§F17) than any of PRD §8's five items, because here the groundwork is visible in the tree rather than only in a roadmap list.

### F35—the 20–25% recoupment statistic

> "The Deal Room's own disclaimer tells a prospective investor that only 20–25% of Broadway musicals recoup."

**SPLIT—the disclaimer is SUPPORTED and quotable; the PRD's claim that the statistic calibrates the risk labels is WRONG.**

**It ships, and it is computed rather than written**, which is why a naive grep misses it: `git grep -nE '20.{0,3}25' d652b86 -- src` returns nothing. `src/app/deal-room/DealRoomView.tsx:538` reads `Only {formatPercent(0.20, 0)}–{formatPercent(0.25, 0)} of Broadway musicals fully recoup their capitalization.` The full paragraph continues "Past performance of other productions is not indicative of future results. Consult your financial and legal advisors before investing," and it sits under a heading "Important Disclosures" (`:530`) whose preceding paragraph disclaims an offer to sell and names "the possible loss of the entire investment." The same figure is recorded as a domain benchmark at `docs/agents/reference.md:123`, and traces to `478a7ed:CLAUDE.md` (2026-02-24) under "Recoupment Statistics."

**It does not drive the risk labels.** PRD §6.1 says "Risk labels reference industry benchmarks (the 20–25% recoupment rate for Broadway musicals)." The labels are at `src/app/(app)/productions/view/LiveOutcomePanel.tsx:105-112` and they are a three-way branch on **breakeven occupancy**: `null` → "No Breakeven", `> 0.9` → "High Risk", `> 0.7` → "Medium Risk", else "Low Risk". The literals `0.20` and `0.25` appear nowhere in that file, and outside `globals.css` they appear in exactly one place in `src/`—the disclaimer string above. The thresholds do have a documented industry basis, but a different one: `docs/agents/reference.md:115` gives "Typical breakeven range: 55–75% occupancy for a well-structured deal." Corrected value: the recoupment statistic is a disclosure shown to investors; the risk band is a function of modeled breakeven occupancy. Two separate benchmarks, and the PRD conflates them. (The external truth of 20–25% is being researched separately; nothing here bears on it.)

### F36—"Zod" in the stack line

> ":18 stack: \"Next.js · TypeScript · Tailwind · Zod · Firebase · Vitest\""

**WRONG. Zod is a declared dependency with zero imports in the product.** `git grep -c 'zod' d652b86 -- src` returns **nothing**—not one file under `src/` imports it. It is in `package.json:34` as `"zod": "^4.4.3"`, and `@hookform/resolvers` (`:17`), the package that would normally bridge Zod to `react-hook-form`, is likewise imported nowhere. The repository already knows: `ARCHITECTURE.md` §14 item 3 lists "**Unused dependencies**—`zod`, `date-fns`, `@hookform/resolvers`, and `next-themes` are installed but have no direct imports in application code." Verified individually at the pinned SHA: `zod` 0, `date-fns` 0, `@hookform/resolvers` 0, `next-themes` 1 (`src/components/ui/sonner.tsx:1`, a shadcn-generated component). Forms are validated by hand in the section components' `isComplete()` checks (`sections/sectionCompletion.ts`), not by a schema.

This is a different surface from §F3, which audited a prose sentence at `:44` that the page no longer carries; the front-matter `stack:` field was not covered by that row. Corrected value: drop Zod. What the product actually runs on and the page can list is Next.js 16, TypeScript, Tailwind v4, shadcn/Radix, Recharts, react-hook-form, Zustand, Sonner, Firebase and Vitest. One further staleness note for anyone quoting version numbers off the PRD: PRD §2.1 says "TypeScript 5 (strict mode)" and `package.json:56` reads `"typescript": "~7.0.2"`—§M1, the tree wins.

---

### F37—the external standing of the 20–25% recoupment figure

> Not a page claim. Recorded so a later session does not re-litigate whether the statistic §F35 quotes can be attributed.

**EXTERNALLY SOURCED, and the figure holds.** The 20–25% recoupment rate is industry folklore of no traceable origin, but an independent academic result now lands in the same range: Detsky, Gutekunst and Kopac, "Defying gravity or failing to launch?", *Significance* (Royal Statistical Society), vol. 22 no. 4, July 2025, published online 2025-05-27, <https://academic.oup.com/jrssig/article/22/4/6/8151666>. It analysed all 133 Broadway musicals opening 2008–2017 and found **21.1%–25.6% fully recouped**. Corroborated independently by working producer Ken Davenport, who computed 20.45% for musicals in his own trailing five-year window. The Broadway League publishes no official recoupment percentage.

**Three caveats that bound any use of it.** It is **musicals only**—both analyses exclude plays. **Recoupment is not profit**: the same study found only about 6% of musicals doubled investors' money, so a 20–25% figure is the chance of not losing money rather than the chance of doing well. And the sample **predates the post-2021 cost environment**; no comparable study covers 2021 onward.

**Per §M6 this licenses nothing to be rewritten on the page**, and the audit was not re-derived here. §F35 already establishes what the product does with the figure: it is a disclosure rendered at `DealRoomView.tsx:538`, not the input to the risk labels. The page should quote the shipped disclosure and attach no external figure to it—the product's claim is what is under audit, not Broadway's base rate.

### F38—the snapshot date the investor sees is the one that never moves

> "A Deal Room can go stale, and nothing on the investor's side says so."

**WRONG as written, and the corrected form is a sharper finding than the claim it replaces.** The investor is shown a date—twice. `src/app/deal-room/DealRoomView.tsx:346` renders `Shared {new Date(dealRoom.createdAt).toLocaleDateString(…)}` in the header, and `:453` renders "Modeled against the snapshotted deal structure · {new Date(dealRoom.createdAt).toLocaleDateString()}" above the financial model. So the page must not say the investor gets no freshness signal.

**But both read `createdAt`, and `createdAt` is the field a republish does not touch.** `updateDealRoom` (`src/lib/firestore.ts:363-366`) writes `updatedAt: serverTimestamp()` on every call, and "Update Snapshot" routes through it (§F23). `createdAt` is written once, at creation (`:337`). And `git grep -c 'updatedAt' d652b86 -- src/app/deal-room/` returns **zero**—no file on the investor route reads the field that moves. The consequence: after a producer republishes, the investor sees **the new numbers under the original share date**, beside a caption asserting those numbers are the snapshotted structure. The single on-screen freshness signal is the one guaranteed to be stale.

**Corroborated in production.** The one active deal room (§F39) carries `createdAt` 2026-06-30T16:22:36.980Z and `updatedAt` 2026-06-30T16:23:33.119Z—57 seconds apart, so it was in fact updated after creation—and the investor view renders the earlier of the two. Corrected value for the page: the investor is shown the date the room was first shared, and that date does not move when the producer republishes, so it cannot distinguish a fresh snapshot from an old one.

### F39—the aggregate-only invariant, checked against the production database

> "No individual investor data reaches the deal room."

**SUPPORTED, and this row records the one check §F24 could not make from the tree.** §F24 establishes that the property is asserted in eleven places, enforced by none, and held in practice by a single argument at a single call site. Whether it *holds in the live data* is a different question and is answerable.

Read at 2026-08-28 through the Firestore REST API under the repository's own `firebase-deployer` service account, resolved via `scripts/op-preflight.sh --mode deploy` (read-only; `GET /v1/projects/soyouthinkyouwant/databases/(default)/documents/dealRooms`): the `dealRooms` collection holds **exactly one document**, `isActive: true`, and its `dealInputs.investors` field is `{"arrayValue": {}}`—an empty array. So the "`DealInputs.investors` is always `[]` in Firestore" invariant (`rules/repo_rules.md:43`, PRD §3.5.3) holds in production and not only in the specification.

Two things the same read establishes for §F31 and for the constraint strip. The single deal room is a **demonstration**: its `production.name` is "The Show - Demo!" and its `config.producerNote` reads, verbatim, "This is a demonstration deal room created with sample figures for illustration only. All numbers, investors, and documents shown here are fictional placeholders." And it is the **only** one—there is no second, non-demonstration deal room anywhere in the collection. That is the strongest available form of the validation boundary: not merely that the repository records no external use, but that the production database contains exactly one deal room and its author labelled it fictional.

**No figure from that document may reach the page.** It is illustrative by its own note, but the page has no need of it and §F14's hypothetical is being cut rather than replaced.

### F40—three scenarios, editable, and you cannot add a fourth

> "Bear, Base and Bull are editable and re-run the model live—and three is all you get."

**SUPPORTED on both halves, and the second half is the load-bearing one.** `ProductionHubClient.tsx:387` initialises `const [scenarios, setScenarios] = useState<Scenario[]>(DEFAULT_SCENARIOS)`, and `:607-609` is the only mutator: `updateScenario(index, field, value)` maps over the existing array and replaces one field of one entry. There is **no add, no remove and no append anywhere in the component**—the array's length is fixed at whatever `DEFAULT_SCENARIOS` holds. Editing is live rather than on submit: `:487-490` recomputes `scenarioOutputs` in a `useMemo` over `scenarios.map(s => runScenario(dealInputs, s))`, and `:492-494` recomputes the sensitivity grid the same way, so a producer changing an occupancy rate sees the model re-run without an explicit action. `:429` re-seeds all three from the deal's own average ticket price when the deal inputs load.

**The ceiling is confirmed from the other direction by §F34.** `saveScenario()`, `getScenarios()` and `deleteScenario()` exist in `src/lib/firestore.ts` with a `scenarios/{scenarioId}` subcollection and a matching security rule at `firestore.rules:25-29`, and **zero call sites anywhere in the application**. So the persistence layer for custom scenarios is built and nothing reaches it: a producer can move Bear, Base and Bull, and cannot create a fourth case or keep one.

Defensible for the page, and it is a genuine product cost rather than an implementation note: the interface commits a producer to three named cases in a domain where a deal is often modelled across many more. The three-case frame is what makes the comparison legible; it is also the thing a producer with a dozen cases cannot express.


### F41—Carta as a reference point

> "Products like Carta showed me how software could make complicated ownership structures legible."

**UNPROVABLE from any written source, and the page must carry it in the first person.** `git grep -in 'carta|angellist|angel list|cap table software' d652b86 -- src docs specs rules README.md AGENTS.md` returns **zero**. So does a recursive case-insensitive search of `~/GitHub/docs/projects/overridebroadway/` for `carta`, `angellist` and `film finance`—the PRD and ARCHITECTURE.md are both silent. There is no competitive analysis, no comparables section and no positioning document anywhere in the record.

**Worth recording because a prior instruction asserted otherwise.** The #754 task brief stated that "the PRD already carries the competitive framing that matters (Carta, AngelList SPV, film finance ledger, as UX references)." It does not. A later session should not go looking for that section; it has been searched for.

Defensible form: the author's own account of what gave him a reference point, written as such. It is the §G17 register—biographical, unfalsifiable here, contradicted by nothing—and it must not be phrased as market positioning, which would be a claim about the product's category rather than about his reasoning.

### F42—the build was agent-directed from the first commit, and the domain was written down for the agent

> "Override was where I learned what AI coding tools could do against a real domain, and the way I learned the domain was by encoding it."

**SUPPORTED on the mechanism, first-person on the motivation, and the split matters.**

**What the record shows.** `git log d652b86 --diff-filter=A --format='%h %ad %s' --date=short -- CLAUDE.md AGENTS.md .claude` returns `478a7ed`, 2026-02-24, as the commit that **created `CLAUDE.md`**—the same commit that carried the entire application (§F30). The agent-instruction file and the product came into existence together; the instructions were not retrofitted onto a hand-built codebase. That commit's subject is "Updates via Claude Code." Across the whole history, `git log d652b86 --format='%s' | grep -ci 'claude\|codex\|agent'` returns **30** of 173.

**The domain was in the instruction file on day one.** `git show 478a7ed:CLAUDE.md` line 575 reads: "These figures are derived from publicly reported Broadway financials (Hadestown, Come From Away, Dear Evan Hansen, Wicked, Hamilton) and industry standards (APC, Dramatists Guild, Loeb & Loeb)." The same file carries the Hadestown calibration that still reproduces exactly against the shipped engine (§F26). So the artifact that directs the agent is also where the domain research was recorded, sourced to five named productions and three named industry authorities. That is the strongest evidence in the repository for domain acquisition as a deliberate method rather than a claim, and it is checkable.

**What is not in the record.** That *learning the tooling* was an original motivation, rather than a description arrived at afterward, is the author's own account. §M4 applies: the record shows behaviour and timestamps. The page may state the motivation in the first person and must not present it as something the repository establishes. What the repository does establish is the method and its shape.

**Do not upgrade this into a competence claim.** Runbook invariant 9 stands: the page may describe what was done and what it produced, and may not assert that the author is good at directing agents.


### F43—extraction ran both ways, and §F12 recorded only one

> §F12, as first written: "nothing was extracted from Override into it."

**WRONG, and the row that was wrong is one this audit relied on.** The claim was inferred from timestamps alone—mergepath's initial commit precedes every consumer adoption, therefore nothing flowed the other way—without opening the commit. Opening it refutes the inference.

**Mergepath's initial commit is a seed, not a from-scratch build.** `b9734df`, 2026-03-24 12:08:47, subject "Initial commit: AI agent repo template with machine user review system", carries `.github/workflows/pr-review-policy.yml`, `.github/workflows/pr-audit.yml` and a populated `docs/agents/` directory. Override had built all three in the preceding week:

| Artifact | Override | Mergepath seed | Relationship |
|---|---|---|---|
| `pr-review-policy.yml` | `a26d0b4`, **2026-03-17 21:50:59**, 124 lines | 128 lines | **75 identical unique lines, 34 differing.** Derived. |
| `pr-audit.yml` | `a26d0b4`, same commit, 97 lines | 186 lines | 14 identical unique lines. Expanded from it. |
| `docs/agents/` layout | `88cc6fe`, **2026-03-23 11:59:55** | 2026-03-24 12:08:47 | Override's, **one day earlier** |

Reproduce with `git -C ~/GitHub/overridebroadway show 88cc6fe:.github/workflows/pr-review-policy.yml` against `git -C ~/GitHub/mergepath show b9734df:.github/workflows/pr-review-policy.yml`, then `comm -12` the sorted unique lines.

**So both directions are real and they are a week apart.** Override wrote the review *policy* and its first CI enforcement 2026-03-17 to 03-23 (§F13 already records this) and mergepath was seeded from that on 03-24. The six artifacts in §F6–§F11 then fanned out from mergepath to five consumers at 12:28 the same day, and later ones followed—the hook 03-25, the escalation rules 04-04, CodeRabbit 04-07, the disagreement detector in May. §F6–§F11 are unaffected and remain correct.

**What hid it.** The seed commit's subject calls the repo an "AI agent repo template", which reads as a fresh start rather than a lift, so a timestamp comparison alone produces exactly the wrong inference. The repository was later renamed to mergepath, which further separates the artifact from its origin. A "first commit" is not evidence of first authorship—open it.

**Consequence for the pages, and it is the reverse of what this ledger implied.** `src/content/projects/mergepath.md:78` reads "Mergepath is that infrastructure, extracted from the projects that needed it first." **That sentence is accurate and needs no correction.** It was flagged as a defect during the #754 sweep on the strength of §F12; the flag is withdrawn. Do not "fix" it, and do not let a later pass narrow it into something the record does not support—the honest specific version is that the review policy and its first CI enforcement came out of Override, which is §F13, not that the machine users or the pipeline did.


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

**The ref is load-bearing and every command in this section carries it**—which was asserted before it was true. Four commands in §G1 and §G4 still read `origin/main` when this was written and have been repinned to `7909892` (Codex P2, PR #836). The hazard is live rather than theoretical: a fix to the card-synopsis defect in §G26 is in flight against that repository, so an unpinned re-run would now measure a different tree. §G1–§G18 were written against a bare `origin/main`, which is the defect §BM1 records: unpinned, those counts measure the repository's present rather than the thing the row was written to establish. Every one of them was re-run here pinned to **`7909892`** (`origin/main` at 2026-08-27T10:39:42−0700) and every count reproduces—106 titles and 106 ids inside the pool, 110 `id:` file-wide, and the growth ladder 45 → 57 → 68 → 80 → 107 → 106 across the twelve commits that touch `app.js`. Pin; do not repeat the unpinned form.

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
git show 7909892:app.js | awk 'NR>=4 && NR<=1151' | grep -cE '^[[:space:]]*title:'   # 106
git show 7909892:app.js | awk 'NR>=4 && NR<=1151' | grep -cE '^[[:space:]]*id:'      # 106
git show 7909892:app.js | awk 'NR>=4 && NR<=1151' | grep -cE '^    \{'                # 106
```

A whole-file `id:` count returns 110; the four extras are `DISCOVERY_MODES` entries at `:1171, 1177, 1183, 1189`, outside the pool—which is precisely the kind of loose match that has to be narrowed. There are **no duplicates** (`sort | uniq -d` on both keys returns empty) and the pool is **one flat list**, not grouped, so no title is counted twice. Modes are read-time filters over the same array (`app.js:1215-1218`), and a title can match more than one filter without being in the pool twice.

The pool has been 106 since **2026-04-10**, three days *before* the page's narrative was written. Corrected value: **106**. Note the repo's own docs carry the same stale figure and should be fixed alongside. Re-run pinned to `7909892` (§GM1), it survives at **eight** sites rather than the three this row first named: `POSTER_GUIDE.md:230` "The app currently contains 80 titles"; `README.md:17` "80 total titles: 45 Disney+ and 35 Hulu titles"—a split that no longer sums either—plus `:35`, `:90`, `:92`, and `:280` "### Current Content (80 titles)"; and `docs/agents/operating-rules.md:6` and `:26`.

### G4—the growth sequence

> ":43 Starting from an initial set, the pool grew through several commits—20 new tiles with poster-format upgrades, then 12 more, then 27—reaching 80 titles"

**WRONG twice over: the ordering is inverted and the first number is the commit's own error.** Only twelve commits ever touched `app.js`. Running the count at each:

```bash
for sha in $(git log 7909892 --reverse --format='%H' -- app.js); do
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

**SUPPORTED with a distinction worth keeping straight.** At the initial commit there is no `package.json` at all—12 files, zero tooling. Today `package.json` exists (added `7e456e3`, 2026-03-31, "Conform to ai_agent_repo_template"—template propagation, not app work) with `test: vitest run` and `lint: eslint .` and five dev-only dependencies. There is **no `build` script**, **no bundler config** (`git ls-tree -r --name-only 7909892 | grep -iE 'vite\.|webpack|rollup|esbuild|parcel|babel|tsconfig'` → empty) and **no runtime dependency**. The strongest proof is `firebase.json`, which serves `"public": "."`—the raw repo root, with no build output directory. The claim stands; only "no tooling at all" would overstate it.

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

**SUPPORTED, verified here because the draft asserted it and no §G row carried it.** The initial commit is `2ca43ff`, 2026-02-24T10:00:42−0800. **None of the first thirteen commits carries a `(#N)` marker**—`git log --reverse --format='%s' | head -13 | grep -c '(#[0-9]'` returns 0—so the entire core build was pushed straight to the default branch **with no pull-request review**. That is the supported claim and the limit of it (Codex P2, PR #836): pair review, an offline walkthrough or any review conducted outside GitHub would leave an identical commit history, so "unreviewed" overstates what the absence of markers can show. The repository's first pull request, `nathanjohnpayne/swipewatch#1` "Add code review policy and enforcement workflows," was created 2026-03-18T04:53:37Z and merged 2026-03-18T04:55:42Z: **21 days (21.5) after the initial commit**, and it is the review policy itself. The ordering is the finding—the prototype was built first and governed afterwards, and the first thing the process brought was the rule that the building had not followed. Note this is the same shape §F13 records for Override, one repo over and three weeks later, and the same shape §B-side note at `REVIEW_POLICY.md` calls "practice preceded written policy." Cite as `swipewatch#1` per §GM1, never bare.

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

**The same wrong number in a prose bullet and in the numbers list.** Both were correct on 2026-05-13 and both are now off by a factor of 2.7 (**72 on disk, 71 wired, 80 invocations as of 2026-08-28—§E28**, which supersedes the 71/70/85 §E10 recorded). A page that states a figure twice will drift twice; note for Phase 2 that the numbers list at `:63-70` and the feature bullets at `:36-43` overlap on this figure and on nothing else.

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

**Consistent when written; the membership figure is SUPERSEDED 2026-08-28—see §E31 (eight consumers, nine repositories).** All nine consumers then in `.mergepath-sync.yml` check out, all five named repos are among them, and every consumer page that claims the pipeline genuinely runs it. The only cross-page defect in this cluster is the *attribution* (§H1), not the membership.

### H10—every cross-link resolves

> The `related:` blocks and inline links across all seven pages

**SUPPORTED.** Three blog slugs cited (`six-prs-one-bug-agent-failure-modes`, `agent-approval-workflow-genesis-of-mergepath`, `perfect-score-wrong-axis`) and five project slugs cited (`swipe-watch`, `mergepath`, `override`, `friends-and-family-billing`, `device-source-of-truth`) all exist in `src/content/`. The only `#NNN` tokens anywhere in the seven pages are FFB **#144** and **#161**, both at `friends-and-family-billing.md:45`, both already in `refs.json`, and both re-read for what they did rather than that they exist (§C9, §C11).

---

## Summary

| Page | SUPPORTED | WRONG | UNPROVABLE | SPLIT | EXT. SOURCED | Rows |
|---|---|---|---|---|---|---|
| §A `device-source-of-truth` | 26 | 10 | 4 | 6 | 1 | 50 † |
| §B `five-across` | 17 | 4 | 0 | 12 | 3 | 36 |
| §C `friends-and-family-billing` | 20 | 12 | 3 | 16 | 0 | 51 |
| §D `matchline` | 7 | 0 | 3 | 2 | 0 | 12 |
| §E `mergepath` | 29 | 16 | 0 | 17 | 0 | 62 |
| §F `override` | 6 | 7 | 0 | 1 | 0 | 14 |
| §G `swipe-watch` | 10 | 6 | 1 | 1 | 0 | 18 |
| §H cross-page | 3 | 5 | 0 | 2 | 0 | 10 |
| **Total** | **118** | **60** | **11** | **57** | **4** | **253** † |

† **The `Rows` column counts rows; §A's verdict columns do not sum to it.** §A holds **50 rows of which 47 carry a verdict**: `A27` is a method finding (on this audit's machine, `git grep -E` silently ignored `\b`—a platform-dependent trap, see the row), `A44` is the cross-surface sweep, and `A48` is the decision-record adjudication AC 5 needs. None records a verdict, and forcing one on them would be worse than the gap. So §A reads 26+10+4+6+1 = **47 verdicts across 50 rows**, and the corpus is **250 verdicts across 253 rows**. Every other section sums exactly. An earlier revision of this footnote said 49 rows against 46 verdicts, which was true before `A49` and `A50` were added and stale the moment they were—caught independently by both reviewers on `#873`. A tally corrected in one place goes stale the next time the thing it counts changes; recount from the file.

A **SPLIT** row is counted once, in its own column, not split across the other three; the row text names which half carries which verdict. WRONG rows count each restated instance separately, because each is a separate edit: §E10 and §E11 are one number stated twice, §G1–G3 are one number stated three times, and §H1–H2 re-count the Override and two-strike defects at the cross-page level where the fix has to be coordinated across files. Deduplicated to distinct underlying facts, the WRONG count is 37; §C51's household-framing correction is the new fact added after the earlier count of 36.

**The §E row was miscounted too, in exactly the shape §B was, and it is corrected above.** It read 14/8/0/5 against a section whose twenty-seven original rows actually resolve **11 SUPPORTED, 7 WRONG, 0 UNPROVABLE, 9 SPLIT**—and, as with §B, the wrong distribution summed to the right row total, so arithmetic checking could never have caught it. §B and §E were both miscounted when first recounted; §C has since been fully recounted as well, and its inherited summary had omitted the delta-audit rows. The remaining five sections—§A, §D, §F, §G and §H—have still never been re-verified against their sections and should not be treated as audited. The §E row above is 11/7/0/9 for §E1–§E27 plus 18/9/0/8 for the #753 delta (§E28–§E62), counted by reading each row's verdict word rather than by adding to the previous figure. §E53 carries both EXTERNALLY SOURCED and WRONG and is filed as SPLIT under this table's own more-than-one-verdict rule.

**The §B row was itself miscounted before this pass, and the totals inherited it.** It read 13/5/0/6 against a section whose rows actually resolved 14 SUPPORTED, 4 WRONG, 1 UNPROVABLE, 5 SPLIT—one SUPPORTED filed as WRONG and §B15's UNPROVABLE filed as SPLIT, an error that preserved the row total of 24 and so survived arithmetic checking. It is corrected above alongside the twelve new rows; the pre-run totals should have read 79/42/8/22. The other section rows were **not** re-verified against their sections in this pass, and given that this one was wrong, they should not be treated as audited. (**Updated 2026-08-29:** §C and §E have since been recounted as well, so the sections never checked are the remaining five—§A, §D, §F, §G and §H.) At this stage dedup dropped from 37 to 36 because §B15 was among the WRONG instances counted and is now SUPPORTED; §C51 later added a new distinct fact, bringing the current deduplicated count back to 37.

Row-count reconciliation, since some headings cover more than one row: §E10/E11, §E13/E14 and §G1/G2/G3 each carry their IDs in one heading, and §F6–F12 carries seven under a single heading because the seven attributions share one paragraph and one correction.

### The eight rows that most need Phase 2

1. **§G1/G4**—80 is 106, and the growth sequence runs backwards. Three instances plus stale repo docs.
2. **§F6–F12**—six of seven primacy attributions on the Override page are inverted; §F13 supplies the true replacement fact.
3. ~~**§E10/E11**—27 CI checks is 71, stated twice.~~ **Closed.** The page carries the dated series and one instance only; the current figure is **72 on disk / 71 wired / 80 invocations as of 2026-08-28** (§E28), not 71/70/85.
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
