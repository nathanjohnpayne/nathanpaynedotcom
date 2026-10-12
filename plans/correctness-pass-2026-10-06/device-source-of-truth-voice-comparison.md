# Device Source of Truth—voice approval packet

Draft date: 2026-10-12. Status: the owner approved a PR and merge once three small changes were applied. All three are applied below, along with the optional original aliases-cost sentence. Root readback is pending before opening the PR. Deployment is outside this approval.

Factual baseline: `467d26110ae1b3850f03b88296300b4f23262909`, current `origin/main` when this pass began. Source: `src/content/projects/device-source-of-truth.mdx`. Dated facts ledger: `plans/correctness-pass-2026-10-06/device-source-of-truth-ledger.md`. Worktree: `/Users/nathanpayne/.codex/worktrees/device-source-of-truth-voice/nathanpaynedotcom`, branch `codex/device-source-of-truth-voice`.

## Approval summary

The complete page is rewritten, including the hero, both project-card surfaces, search snippet, all four decision records, constraint glosses, body framing and closing lessons. It stays in first person and keeps the owner's judgment lines: “a cache with better branding,” “Extraction was allowed to be the labor and never the authority,” “A source of truth is not a database with all the data in it,” and “DST did not eliminate ambiguity. It gave ambiguity somewhere to live.” No new agent attribution is invented: the original identifies AI extraction but names no coding agent.

All five body sections, all four decision titles and lenses, four pending statuses, constraint values, component slices and placements, four screenshots including the hero, every caption, and the complete Mermaid block remain in place. Long body paragraphs are split into shorter paragraphs. No learning component is added; this page's learning copy remains its closing prose.

The authored reader copy is **2416 → 2134 words**, a **11.7% cut**. This reproducible count uses whitespace-separated words in the title, hero, kicker, status, format/focus/stack, live label, constraints, all decision fields, related labels, body headings/prose/captions and visible diagram node labels. It excludes generated component labels, MDX markup/imports, Mermaid source syntax/hidden accessibility metadata, URLs and the separate card/search renditions. The brevity checker's body-only result is recorded separately below.

The main factual qualification is explicit: shipped workflows and demo captures do not establish present operation behind the restricted login or team adoption. The supporting R11 summary and detailed row now say that in place. Three existing ledger precisions become explicit: confidence belongs to each extracted field, telemetry identifies partners by key, and only the partner-key CSV auto-creates an unmatched partner. These narrow the mechanism without changing a decision, count or status.

The canonical résumé's Device Source of Truth entry was reread for facts and matches the site's body verbatim. Its claims still hold: five consolidated feeds, AI-assisted questionnaire extraction, human authority over consequential commits, and a synthetic public fork with private production records/repository. Only the case-study hash and review date change. The résumé body/hash and private canonical file are untouched.

## Writing-style pass

The installed Write Like Me skill was used through its supplied-reference route. No private writing retrieval or cache was used. The owner-designated after passage in the batch brief is approved model prose supplied as a style reference, not a newly user-authored corpus. The complete source was then checked separately against the original and facts ledger for meaning, actor, causation, chronology and uncertainty.

## Metadata renditions

The hero continues to supply the social-card line through the existing fallback. Templates remain unchanged.

### Hero and social-card fallback

**Before (173 characters):** One system of record for partner-device hardware, DRM, codec support, and operational readiness—built inside Disney, forked and reseeded with invented data to show publicly.

**After (163 characters):** I built a device registry inside Disney to put hardware, DRM, codecs and readiness in one place. This demo is a fork of that system, reseeded with data I invented.

### Project index and homepage card

**Before (139 characters):** Five fragmented data feeds became one device registry, with AI drafting the heaviest intake and humans deciding what becomes authoritative.

**After (158 characters):** Five feeds, one registry. I let AI draft the heaviest intake, then kept every consequential commit with a human. The demo shows the workflow on invented data.

### Search snippet

**Before (175 characters):** An enterprise workflow case study: five ingestion feeds behind one admin-gated commit path, and AI extraction that proposes while a human signs—demonstrated on synthetic data.

**After (158 characters):** Five feeds into one device registry. I let AI extract the questionnaire, then required human sign-off. A fork of the Disney system runs here on invented data.

The 163-character hero is below the social line's 180-character cap; the rendered card fit passes in the build. The 158-character card is within the 120–200 guide. The search snippet is 158 characters. The rendered reference is `screenshots/og/projects-device-source-of-truth.png`.

## Complete proposed reader page

The view below expands every component record at its source position. Image paths and caption copy match the MDX source; the diagram remains complete source because its labels and topology must remain reviewable.

# Device Source of Truth

I built a device registry inside Disney to put hardware, DRM, codecs and readiness in one place. This demo is a fork of that system, reseeded with data I invented.

AI × Enterprise × Data

**Status:** ARCHIVED

**Format:** Internal platform tool

**Focus:** Partner platforms and device support

![Device Source of Truth](/images/projects/device-source-of-truth-hero.png)

React · TypeScript · Vite · Tailwind · Zod · Firebase · Express · Vitest

[View Demo](https://device-source-of-truth.web.app)

## The answer depended on who you asked

Can this device support Dolby Vision? Which partners still run an ADK build that just went end-of-life? When a partner replaces its OS stack—Amazon moving Fire TV to Vega OS—which devices are affected, and what is their certification status?

At Disney, I kept hearing these questions from partner engineering, certification, support and platform teams. The answers existed. Finding them was the problem.

They were in Airtable, Datadog, partner-submitted Excel questionnaires, and spreadsheets that different teams updated on different schedules.

I saw support tickets that should have been lookups, launch timelines slip while teams reconciled records, and partner conversations without a shared set of facts. That is my account of the cost. The repository does not document those outcomes.

I built Device Source of Truth inside Disney to import those sources into one shared schema: a record I could query and audit. It came from the partner-engineering work I spent a decade doing there. It was the tool I'd wished existed before I sat down to build it.

**What is on this page is a fork of that system, running on data I invented for it.** It is the same codebase with the real records replaced, rather than a reimplementation from memory or the production instance.

## Five feeds, one gate

The registry takes five feeds: an AllModels device-inventory CSV, Airtable intake requests, partner-key mappings and telemetry snapshots exported from Datadog, and a partner's Excel questionnaire.

The questionnaire commonly has 100–150 answered questions across sixteen sections. AI reads it in 30-pair batches and maps it onto a 260-field device model. Extraction first shipped fire-and-forget, then was rebuilt as an idempotent per-device task queue with retry and stale-job recovery.

I kept the same rule across the feeds: preview before committing, and require an admin for every commit.

I did not model those four teams as personas. I used three roles: a viewer reads the registry, an editor authors records and stages the questionnaire import, and an admin alone commits or deletes. Fifty of the API's sixty role guards are admin-only. That is where I put the risk boundary.

There is a limit to that rule. On four feeds, the interface requires the preview, but an admin can call the commit route directly without seeing it. On questionnaire intake, the server refuses to commit until every staged record has been reviewed.

```mermaid title="Five feeds, one gate" description="Every ingestion path stages what it imports into a preview before anything is written—the questionnaire feed passing through AI extraction first—and the only route from any preview into the device registry is a commit that requires the admin role. In the interface no imported record becomes authoritative without a human having reviewed it, and on the questionnaire feed the server enforces that."
flowchart TD
    Q["Excel questionnaire"]
    X["AI extraction"]
    AM["AllModels CSV"]
    AT["Airtable intake"]
    PK["Partner keys"]
    TM["Telemetry"]
    PV["Preview, per feed"]
    AD["Admin commit"]
    REG["Device registry"]

    Q --> X
    X --> PV
    AM --> PV
    AT --> PV
    PK --> PV
    TM --> PV
    PV --> AD
    AD --> REG

    style Q fill:#fffdf8,stroke:#11100d,stroke-width:1.5px,color:#11100d
    style AM fill:#fffdf8,stroke:#11100d,stroke-width:1.5px,color:#11100d
    style AT fill:#fffdf8,stroke:#11100d,stroke-width:1.5px,color:#11100d
    style PK fill:#fffdf8,stroke:#11100d,stroke-width:1.5px,color:#11100d
    style TM fill:#fffdf8,stroke:#11100d,stroke-width:1.5px,color:#11100d
    style X fill:#dde1e5,stroke:#11100d,stroke-width:1.5px,color:#11100d
    style PV fill:#e3d477,stroke:#11100d,stroke-width:1.5px,color:#11100d
    style AD fill:#e8784a,stroke:#11100d,stroke-width:1.5px,color:#11100d
    style REG fill:#11100d,stroke:#11100d,stroke-width:1.5px,color:#fffdf8
```

**Exceptions are work, not errors.** I made telemetry rows for an unknown device or partner key raise an alert with Register Device or Create Key attached. The work item carries its remedy.

Creating a key auto-dismisses every matching alert server-side. Registering a device closes its alert from the client, through the ordinary dismiss route. The other four feeds raise no alerts; they show exceptions inline in their previews.

![The exception queue on the deployed demo: fifteen alerts, every one of the two types the system actually emits—Unregistered Device and New Partner Key, both raised by telemetry uploads. Each alert carries its own remedy—Register Device, Create Key, or Dismiss—and a dismissed row keeps its reason and the actor who dismissed it, so a closed exception still explains itself.](/images/projects/device-source-of-truth-alerts.png)

- **260 fields:** the device model I map a partner's questionnaire onto, from 100–150 answered questions
- **5 feeds:** each feed previews before committing; all five commits require an admin
- **3 roles:** viewer, editor, admin—fifty of the API's sixty role guards are admin-only
- **Private repo:** the demo stops at a restricted login; the screenshots show what I can make public

## The decisions

I let the same codebase treat AI confidence differently in two places. On CSV disambiguation, a name resolved at 0.90 stops asking its clarification question, though the import still needs preview and commit. On questionnaire intake, confidence colors the review screen and decides nothing. Every questionnaire still needs review.

Extraction was allowed to be the labor and never the authority. The first decision below explains why. The others cover older snapshots, stale answers and partner names that refuse to stay tidy.

All four decisions are pending. The workflows shipped, and the captures show them in the deployed demo. The restricted login prevents a public check of their current operation, and no artifact records a team adopting the tool. I can show the implementation. I cannot claim a usage outcome.

### Extraction proposes; a human signs

Trust · pending

**What I encountered**

The heaviest intake is a partner's Excel questionnaire: commonly 100–150 answered questions across sixteen sections, mapped onto a 260-field device model. AI reads it in 30-pair batches and proposes values, with a self-reported confidence for each extracted field. I could have let a high enough number commit the record.

**Over**

Auto-commit above a confidence threshold. I already let confidence settle name matches on the CSV path: at 0.90 it auto-resolves without asking a clarification question. I set that threshold. The CSV still needs an admin-confirmed preview, so the difference is what the number can decide before sign-off. On questionnaire intake, it decides nothing.

**What I decided**

I gave confidence no authority. The number is stored once and shown as a review badge. Every questionnaire needs review, and its only commit route requires an admin. The server refuses until every intake partner is reviewed, a partner is assigned, every device is approved or rejected, and every conflict with the existing registry is resolved.

**Why**

A wrong CSV match mislabels one row, with an import preview still ahead of it. A wrong questionnaire field becomes the registry's answer about DRM or codec support. I wanted to trust that answer. The spec states the boundary: no questionnaire data enters the database without my explicit review.

**Cost**

Intake cannot run unattended. Every questionnaire waits for an admin to walk a four-step wizard and review every device. AI saves drafting work; throughput still depends on one reviewer's attention.

**Validation boundary**

The approve route refuses server-side while anything is unreviewed. The model's confidence has exactly one consumer: the review screen. I still need a live intake queue to tell me whether mandatory review catches extraction errors or only adds friction.

![**Extraction proposes; a human signs**, on the deployed demo. A four-step wizard—Assign Partner, Review Devices, Resolve Conflicts, Sign Off—holds three intake partners at pending review. Each extracted device carries its own Approve and Reject, a 44-fields-extracted count, and the registry's verdict on whether it matches an existing record. The server enforces what the wizard shows: the approve route refuses while any of it is unresolved.](/images/projects/device-source-of-truth-signoff.png)

### An older snapshot does not silently win

Integrity · pending

**What I encountered**

Telemetry arrives as CSV snapshots, sometimes out of order. Re-upload last month's export and it can overwrite this month's record. Last-write-wins is the easy default: the most recent upload wins, even when its data is older.

**Over**

Last-write-wins. It usually gives the right answer, which makes the old-export mistake easy to miss. The corruption appears only when someone re-uploads an older file.

**What I decided**

I made the preview flag rows older than the stored snapshot and warn before they overwrite newer data. The commit skips them unless the admin overrides each row by index. The result returns a count of stale rows overwritten.

**Why**

A registry that a well-formed file can silently regress is not a source of truth; it is a cache with better branding. I wanted a person to say so, row by row, before older data replaced newer data, and a record of what they overwrote.

**Cost**

Backfilling history now takes one override per stale row, by index. Skipped rows do not enter a queue: the commit counts them as no-change and moves on. An unattended import still finishes, minus those rows, and its response cannot distinguish them from rows that already matched. The preview is the only warning, before commit.

### Freshness is shown, never enforced

Freshness · pending

**What I encountered**

The answers get older between partner uploads. I could have hidden stale devices, blocked a query, or required a fresh import before the registry answered.

**Over**

Enforce freshness: exclude stale records from queries and exports, alert on age, or require a re-import before answering.

**What I decided**

I chose a badge: fresh under 48 hours, aging under seven days, stale beyond. One client function hardcodes both thresholds and calculates age from the stored telemetry timestamp when the browser renders. The result is not persisted, and nothing else consults it.

**Why**

I wanted the reader to see how old the data was and decide whether that mattered. Nine-day-old telemetry can be disqualifying during an incident and fine for a planning meeting. The system knows the age; only the reader knows the stakes.

**Cost**

Nobody has to look at the badge. Staleness triggers no alert, removes nothing from an export, and blocks no workflow. I built no mechanism that makes anyone act on age.

![**Freshness is shown, never enforced**, on the deployed demo. This device wears its own doubts: the badge reads "Updated 9 days ago" against a 28-day telemetry window—past the seven-day threshold, so the record presents as stale rather than being hidden or blocked. Nothing downstream acts on that badge. The record stays usable and its uncertainty stays visible, which is the whole of the decision. The reader decides whether nine days is fine for planning or unacceptable mid-incident.](/images/projects/device-source-of-truth-freshness.png)

### Aliases resolve; they do not merge

Identity · pending

**What I encountered**

The same operator arrives under different identifiers: a key in telemetry, a friendly name in the key mapping, a name in the questionnaire header. I could have picked a canonical name, merged the records, and deleted the variants.

**What I decided**

I put an alias registry in front of the partner records. Names resolve by exact match, then registered alias, then fuzzy similarity at 0.90. Alias hits are tagged direct or contextual: some names need the feed's context to resolve correctly. On the partner-key CSV import, an unmatched name creates a partner instead of failing the file.

**Why**

The next export will send the variant names again. Merging the records would only let the next import recreate the duplicate. I kept the raw names resolvable to a canonical partner so the mess stayed at ingestion.

**Cost**

The ambiguity is managed forever instead of eliminated once. Every feed carrying a partner name uses the resolver; an admin maintains the alias rules by hand. Telemetry resolves by partner key. A flat partner list still needs that machinery in front of it. I do not yet know whether the alias registry absorbs real upstream drift or becomes permanent admin toil.

## Nothing real is on display

I invented all the data in those screenshots. Forking the working system was the cheap half. Making it safe to show took the rest.

A scrub replaced the deployed records in August 2026. The instance has used synthetic seed data since: invented operators under an invented streaming group, a synthetic marker on every seeded document, and a dataset header that opens "Every name in this file is invented."

Where production said ADK, the demo says SEK, an invented kit name. That rename happens in the display layer; the schema keeps its field names. SEK in a screenshot tells you the data is fake.

I kept the repository private. Scrubbing deployed data did not remove the real partner identities from specs and history. A public repository link would return a 404 to everyone else, so this page has none. The demo button stops at a domain-restricted login.

The screenshots are what I can make inspectable: real workflows, invented data.

## What I learned

A source of truth is not a database with all the data in it. It's a system that decides three things and says them out loud: what can become authoritative, what requires a human, and what happens when two sources disagree.

DST did not eliminate ambiguity. It gave ambiguity somewhere to live. Stale records keep their age visible. Aliases stay at ingestion because the next export will send those names again. Unknown devices become work items with a remedy attached. AI extraction stays a proposal until someone signs it.

I could have treated normalization as tidying up. Instead, I took on a badge nobody must read, an alias registry to maintain by hand, a queue that only closes when a person works it, and an intake pipeline that cannot run unattended.

What those choices buy is a registry that never asserts more than it can defend. For a system whose entire job is being believed, that is the trade I wanted to make.

## Related

- [Blog: Six PRs, One Bug: What AI Agents Actually Get Wrong](/blog/six-prs-one-bug-agent-failure-modes/)
- [Project: Mergepath](/projects/mergepath/)
- [Project: Swipe Watch](/projects/swipe-watch/)

## Most-changed passages

### Opening and personal stakes

**Before**

Can this device support Dolby Vision? Which partners are still running an ADK build that just went end-of-life? When a partner replaces its whole OS stack—Amazon moving Fire TV to Vega OS—which devices are affected, and what is their certification status? Inside Disney those questions arrive constantly, from partner engineering, certification, support, and platform teams, and every one of them is answerable. The trouble was where the answers lived.

They lived in Airtable, in Datadog, in partner-submitted Excel questionnaires, and in spreadsheets maintained by different teams on different cadences. What the fragmentation cost is my testimony rather than the repository's: support tickets that should have been lookups, launch timelines that slipped during reconciliation, and partner conversations held without a shared factual foundation.

Device Source of Truth is the internal Disney answer: one system that imports from every source, normalizes against a shared schema, and turns loose operational memory into a queryable, auditable record. This is the partner-engineering work I spent a decade doing at Disney, and DST is the tool I wanted to exist before I sat down to build it. **What is on this page is a fork of that system, running on data I invented for it.** Not a reimplementation written from memory, and not the production instance either: the same codebase, with the real records replaced.

**After**

Can this device support Dolby Vision? Which partners still run an ADK build that just went end-of-life? When a partner replaces its OS stack—Amazon moving Fire TV to Vega OS—which devices are affected, and what is their certification status?

At Disney, I kept hearing these questions from partner engineering, certification, support and platform teams. The answers existed. Finding them was the problem.

They were in Airtable, Datadog, partner-submitted Excel questionnaires, and spreadsheets that different teams updated on different schedules.

I saw support tickets that should have been lookups, launch timelines slip while teams reconciled records, and partner conversations without a shared set of facts. That is my account of the cost. The repository does not document those outcomes.

I built Device Source of Truth inside Disney to import those sources into one shared schema: a record I could query and audit. It came from the partner-engineering work I spent a decade doing there. It was the tool I'd wished existed before I sat down to build it.

**What is on this page is a fork of that system, running on data I invented for it.** It is the same codebase with the real records replaced, rather than a reimplementation from memory or the production instance.

### The AI threshold has different authority on the two feeds

**Before**

Auto-commit above a threshold. Not a straw man, and the parallel is worth stating precisely: on the CSV path the same codebase does let confidence decide, auto-resolving a name match at 0.90 without asking anyone—I set that threshold, then gave the number no power at all here. That path still lands in an admin-confirmed preview, so what I declined on the heavier feed was letting confidence settle anything, rather than merely declining to skip a gate.

**After**

Auto-commit above a confidence threshold. I already let confidence settle name matches on the CSV path: at 0.90 it auto-resolves without asking a clarification question. I set that threshold. The CSV still needs an admin-confirmed preview, so the difference is what the number can decide before sign-off. On questionnaire intake, it decides nothing.

### The skipped-row cost

**Before**

Backfilling history stopped being a single action. A stale row is not queued for anyone—the commit folds it into the no-change count and moves on—so an unattended import still finishes, quietly minus the rows it declined, and the response cannot tell those from rows that simply matched. Loading older snapshots on purpose means overriding them one at a time, by row index, and the only warning comes from the preview, before commit.

**After**

Backfilling history now takes one override per stale row, by index. Skipped rows do not enter a queue: the commit counts them as no-change and moves on. An unattended import still finishes, minus those rows, and its response cannot distinguish them from rows that already matched. The preview is the only warning, before commit.

### Workflow evidence and its boundary

**Before**

One boundary applies to all four and is not repeated inside them: the workflows shipped and the deployed instance runs them end to end, but no artifact records a team adopting the tool. Each record is therefore evaluated against what the product demonstrably does, not against a usage outcome—which are different questions, and only the second one is missing.

**After**

All four decisions are pending. The workflows shipped, and the captures show them in the deployed demo. The restricted login prevents a public check of their current operation, and no artifact records a team adopting the tool. I can show the implementation. I cannot claim a usage outcome.


## Complete substantive-point and qualification mapping

Every ledger row and each uncatalogued thesis/cost is accounted for. “Retained” means the same claim, actor, numeric association and qualification survive; it does not turn a historical audit into current production verification.

| Source points | Where they live in the draft | Disposition and qualification |
|---|---|---|
| R1, R22: three roles; fifty of sixty guards admin-only | Constraint strip; five-feeds prose | Retained. Viewer reads registry; editor stages only questionnaire; admin alone commits/deletes. |
| R2, R3: only alias hits direct/contextual; feeds carrying names use resolver | Alias decision chosen/cost | Retained; telemetry-by-key exception now explicit. No assertion that read routes use it. |
| R4, R5: reader and editor boundaries | Five-feeds prose | Retained without “everything” or “all imports.” |
| R6, R29, R30: snapshot age, indexed override, overwrite tally, skipped rows folded into no-change | Older-snapshot decision | Every mechanism retained. Backfill costs one override per stale row; unattended import finishes; preview is the only warning; response cannot distinguish skipped from truly unchanged. |
| R7, R41: telemetry-only alerts, attached remedies, key closes server-side, device closes from client | Exceptions prose; alerts caption | Retained. Ordinary dismiss route clarified. Other four feeds still raise no alerts and show exceptions inline. |
| R8: a decade of partner engineering at Disney | Opening | Retained as the owner's biographical testimony. Dated ledger marks it unprovable from product artifacts; no stronger verification claim is added. |
| R9, R35, R36: four-team audience; Dolby Vision, EOL ADK, Amazon Fire TV/Vega, certification | Opening; role prose | Retained as the author's account and illustrative questions. EOL is asker's knowledge, not a claimed registry flag. The 2026-10-06 external-source finding is retained rather than re-presented as a new live fact audit. |
| R10, R37: fragmented source locations; tickets/lookups, reconciliation/slipped launches, shared factual basis | Opening | All three operational costs retained and explicitly labeled the author's account; repository does not document outcomes. |
| R11, R47: shipped workflows/demo; no artifact of adoption | Global decision boundary | Narrowed from present end-to-end operation to shipped workflows shown in captures. Restricted login prevents public current-operation check; no usage, time-savings, reviewer-effectiveness or adoption outcome claimed. All four remain pending. |
| R12: built inside Disney, fork of same system, replaced records; not memory rewrite/production | Hero; opening; synthetic section | Retained across renditions. No private repository is linked. |
| R13: metadata five feeds, AI drafting, human sign-off, synthetic demo | Hero/card/search | Same facts in three revised renditions; no field serves as a new unsupported outcome. |
| R14–R19: ordering, accent, screenshots, View Demo, archive state, format/focus/stack | Frontmatter; reader page header | Semantic values unchanged. ARCHIVED remains project lifecycle, not a claim about GitHub's archive setting. |
| R20, R38: five named feeds; 100–150 Q/A; sixteen sections; 260 fields; 30-pair batches | Five-feeds prose; first decision; constraints; diagram | Retained with the same numbers and subjects. Partner keys/telemetry are both Datadog exports. |
| R21, R25, R40: previews/admin commits; UI vs server enforcement; every intake partner reviewed, partner assigned, devices approved/rejected, conflicts resolved | Five-feeds prose; first chosen; diagram; sign-off caption | Retained in full. Four feeds can be committed directly by admin; questionnaire server refuses unresolved staged work. |
| R24: confidence stored once, review badge, single presentational consumer | First context/chosen/evidence; decision introduction | Retained; “each extracted field” replaces overbroad “every field.” No auto-commit or per-field guard is invented. |
| R26: CSV AI auto-resolves at 0.90; owner set threshold; admin preview remains | First rejected; decision introduction | Retained. Clarification is skipped at threshold; human commit gate is not skipped. This threshold is distinct from alias fuzzy similarity's 0.90. |
| R27: explicit-review spec boundary; wrong DRM/codec field matters more than one mislabeled CSV row | First rationale | Exact spec excerpt preserved and attributed to the spec; it is not used as its own evidence for server enforcement. |
| R28, R43: four-step wizard; every device review; three pending partners; 44 fields; match verdict | First cost; unchanged sign-off caption | Retained; wizard labels/capture values unchanged. AI saves drafting; one reviewer's attention still limits intake. |
| R31, R44: 48-hour/seven-day display thresholds; browser computation, no persistence/consumer; nine-day badge and 28-day window | Freshness decision; unchanged freshness caption | Retained; 28-day coverage is separate from age thresholds. No alert, export filter or workflow block added. Capture-time age is not a claim about today's badge. Incident vs planning judgment remains with reader. |
| R32, R33: different upstream identifiers; exact→alias→fuzzy at 0.90; context matters; unmatched CSV creates partner | Alias context/chosen/cost | Precision repairs: telemetry key, name-based resolver on other feeds, auto-create only on partner-key CSV. Raw names recur; merging would recreate duplicates; the restored sentence explicitly says ambiguity is managed forever instead of eliminated once. Human alias maintenance and the unresolved admin-toil question remain. |
| R34: blog, Mergepath, Swipe Watch links | Related links | Destinations and labels unchanged. No live governance or current-consumer relationship added. |
| R39: fire-and-forget replaced by idempotent per-device retry queue/stale-job recovery | Five-feeds prose | Chronology and mechanism retained; no date or latency invented. |
| R42: fifteen telemetry alerts, two emitted types, controls, closed reason and actor | Unchanged alerts caption | Retained verbatim with asset and placement. |
| R45, R46: August 2026 scrub; synthetic operators/group/doc marker/header quote; ADK→SEK display; specs/history retain identities | Synthetic section | Retained; schema field names staying fixed makes display-only rename concrete. Exact dataset quotation preserved. Restricted demo and private repo explained separately. |
| Older-snapshot judgment: good file can silently regress; cache with better branding; recorded intentional override | Older-snapshot rationale/rejected | Owner's judgment and the danger of plausible defaults retained. Unsupported generalization about “nearly every importer” is replaced with the concrete last-write-wins default. |
| Freshness judgment: reader alone knows stakes; unread badge changes nothing | Freshness rationale/cost | Retained without claiming enforcement success. “Can be” makes the incident/planning example a decision context rather than a universal mandate. |
| Closing thesis: source of truth answers authority/human/conflict; ambiguity has a home | Closing lessons | The negative definition is followed by the restored positive thesis: the system decides three things and states them. All three authority/human/conflict questions and all four illustrations are retained. |
| Closing costs: optional badge, maintained aliases, worked queue, attended intake | Closing lessons | All four costs retained; “registry that never asserts more than it can defend” remains the owner's design judgment, not a measured correctness guarantee. |

## Supporting changes and structural choices

- Ledger R11 summary, detailed row and applied-fixes note now distinguish old present-tense claim from the weaker current form. The three precision repairs R24/R32/R33 are recorded in the applied-fixes note. A dated re-review explains the historical quotations' role and the limits of this review. No old conclusion is left asserting public present-operation proof.
- Résumé stamp updates only `caseStudy` SHA-256 and date after manual comparison to the private canonical entry. Its `resume` hash stays unchanged.
- Only the assigned generated social reference is refreshed from this build. No shared CSS, component, checker, other article or private canonical source is changed.
- Section and decision titles remain unchanged after a cross-page/ledger search. The only exact matches were on this page, its captions and its ledger. That avoids changing working headings or referenced titles.
- Body paragraphs are shorter; component positions and records retain their established anatomy. The owner's requested complete-record and qualification-preservation workflow controls these records rather than applying an arbitrary paragraph-length cap to technical fields.

## Validation and limits

The draft was rebased onto `ff2daa3e1f4b370a673d0f8ac75b757bdb171f72`, the verified main merge of Five Across #1299. The original factual baseline and source hash above remain the before-copy authority; this newer base supplies the shared evidence-paragraph style only. No authored Device copy changed during integration.

- Uncredentialed final Astro build passes: 43 pages and 21 generated social cards, including this page's 163-character line and rendered fit.
- Eight focused existing suites pass, 273/273: project pages, content schema, résumé claims review/body, Mermaid contrast, OG fit/crop/targets. These ran before the dependency refresh and before the final owner-requested wording changes; the focused rerun below covers the updated source and stamp.
- Full responsive suite passed before the dependency refresh and final owner-requested wording changes: 369 passed and 51 expected responsive-condition skips with two workers. Its all-file setup proved every file served from this checkout's dist was byte-identical.
- Final all-file served-byte verification and Mermaid accessibility checks pass after the dependency refresh. Desktop 1440×900 and phone 375×667 renders show all four complete decision records, no page errors and no horizontal overflow. Evidence text now computes to `white-space: pre-line` on both.
- Lint passes, including the complete packet; typecheck reports zero errors/warnings. Sentence-case headings intentionally retain the prose linter's nonblocking CMOS title-case suggestions.
- All fields in each of the four decisions were compared against decoded source on both viewports. Manual visual inspection covered the social card, desktop first decision and phone second/third/fourth decisions; the full-page and individual captures are available under `/tmp/project-voice-batch-2026-10-12/device-source-of-truth/`.
- Final owner-condition readback: the uncredentialed rebuild passes 43 pages/21 OG cards; the focused project/schema/résumé-claims suite rerun passes 159/159 in three files. The built search meta is the exact 158-character source value. All three required phrases, the optional restored aliases sentence and the softer ending are present in the served reader copy. Markdown's existing apostrophe typography is normalized only for the readback comparison; authored source stays straight.
- The final source page's served SHA-256 equals its built file: `92753d91a6566636aae9e595373539b061c246c87bea8a33152d1032e81d766c`. Desktop and phone renders show all fields in the four decision records without page errors/overflow; the positive thesis and phone aliases cost were visually inspected. No broad suite was repeated for these scoped wording changes.
- `git diff --check` passes. Only the five assigned source/support/reference/packet files differ from the refreshed main. No PR, push, merge or deployment occurred in this draft worktree.

The source SHA-256 is `5df48dc4c241c30d7fd5d541813bd61946597a9e832a938b92544ad2dce317d0`; the captured baseline source SHA-256 is `9cab56fba530c995ac427d96b18ef5984d3a0c6aec7ee68fe7f55d599fcabf63`. The baseline is available losslessly with `git show 467d26110ae1b3850f03b88296300b4f23262909:src/content/projects/device-source-of-truth.mdx`; the draft is the complete source file alongside this packet.

The protected-field checker preserves all 55 numeral occurrences, the date, link destinations, code span, complete Mermaid block and every other protected class. It reports one deliberate failure: `seoDescription` changed as required for this full voice rewrite. Title, slug and other pinned fields are unchanged; project tests derive this project's snippet rather than pin it verbatim. Description-change and spelled-out-number advisories are reviewed: the removed “one,” “second” and “twice” occurrences were rhetorical/repeated phrasing, while the four decisions, three roles, two freshness thresholds, five feeds, sixteen sections, four-step wizard and capture quantities still have their original subjects. Added “first” and “five” clarify order/count already established. No checker is weakened. Its body-only prose count is 1,080 → 949 words (-12.1%), separate from the complete reader count above.

The blog voice CLI does not support project MDX. It is not reported as passing here. Mechanical checks do not prove attribution, meaning, voice, adoption or current deployed behavior. The manual original-to-draft and ledger comparison above supplies the reviewable evidence.

## Owner approval conditions

The owner approved a PR and merge once these three changes were in. All three now appear in the complete reader draft and metadata above:

1. The search rendition explicitly says a fork of the Disney system runs here on invented data. It is 158 characters.
2. The negative definition of a source of truth is followed by: “It's a system that decides three things and says them out loud: what can become authoritative, what requires a human, and what happens when two sources disagree.”
3. The personal-stakes sentence is: “It was the tool I'd wished existed before I sat down to build it.”

The optional original aliases cost is also restored: “The ambiguity is managed forever instead of eliminated once.” The closing phrase remains “the trade I wanted to make,” as requested for now. These changes restore emphasis and clarify demo identity without adding outcomes or widening a factual claim. Root will verify the applied conditions before the PR workflow begins; repository checks and exact-head review gates remain part of the authorized merge workflow.
