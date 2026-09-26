# The Product Did Not Travel: revision ledger

Revision scope: September 26, 2026 editorial corrections to the article published in PR #1057. Retained measurements describe the September 24 snapshot; this revision does not claim a new Firestore audit. A fresh, bounded PostHog connectivity query is recorded below. The original audit's provenance is recorded in [PR #1057, Evidence](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/1057). Its primary sources were Firestore projects `gaycruisebingo` / event `med-2026` and `fiveacross` / event `bodega-bay-2026` (boards, players, proofs and Event `frozenAt`), PostHog project 503790 (crashes and two debriefs), the host's permissioned texts, and Five Across git history. The underlying private exports and texts are not committed here.

## Claim corrections

| Original claim, quoted verbatim | Verdict | Defensible replacement and evidence boundary |
| --- | --- | --- |
| “what made the cruise work was never in the code” | UNPROVABLE | Software, prompts, hosting and circumstance contributed to the observed experience. Previous-day marking, rankings and the feed are implemented features; the two events do not isolate causal contributions. Check Five Across PRs #383/#394 and the original cruise debrief's dinner and competition answers. |
| “It is not why the guests stopped” | UNPROVABLE | Last guest mark 09:57 precedes the recorded 14:38 crash by 4h41m. That establishes ordering, not the time of a decision to quit or whether host failure prevented a return. Original audit: Bodega board mark timestamps and PostHog exception timestamps. |
| “Nobody was using the email to find the cards, so nobody noticed it was broken” | UNPROVABLE | Kim reported announcing cards in person and satisfactory email timing. One host's answer cannot establish every guest's email use. Original audit: Kim debrief, new-card discovery and email questions. |
| “The people who played did every square the weekend allowed” / “That is why there were no bingos” | UNPROVABLE | 26 of 27 marks being possible at home supports a prompt mismatch; it does not prove exhaustive feasible marking or a blocked line on every actual board. The pictured card is explicitly dealt on demo data. |
| “it was mostly wrong” (offline rationale) / project page: “where coverage was not the constraint” | UNPROVABLE | Retrospective marking challenges the assumption of immediate capture. Timestamps, survey setting and an analytics gap do not measure connectivity at the time of marking. Narrow both article and project-page evidence. |
| “the work that would have moved the number” | UNPROVABLE | Describe a proposed manual experiment and contingent next decisions; no outcome has been measured. Keyword commit counts measure neither effort nor the counterfactual result. |
| “the group is still playing after the second day” as the general product test | UNPROVABLE | Replace with a proposed return opportunity agreed for the event's duration. Separate developer independence from participation and from host independence. This is a recommendation, not a finding. |
| “A second, different use does” make a one-off a product | UNPROVABLE | A second event can reveal dependencies; it cannot alone prove repeatability or select which dependency to develop. |

## Retained measurements and citations

SUPPORTED below means support recorded by the original September 24 audit, not freshly retrieved private records. Its limits stay in the published provenance sidebar. Public repository citations are checked separately in this revision. No new game outcome or survey response is introduced; newly queried connectivity diagnostics are documented separately below.

| Retained claim, quoted from this revision | Verdict | Source and scope |
| --- | --- | --- |
| “At 12:57 on Saturday, August 8” / “three hours earlier” / “09:46 and 09:57” / “12:56 and 12:57” | SUPPORTED (recorded audit) | `fiveacross`, `events/bodega-bay-2026` board mark timestamps in Pacific event time, read September 24; last guest mark 09:57, host 12:57. Three hours is exact. |
| “845 marks and 61 bingos inside the standings window” / “eight days” / “nine-night cruise with sixteen friends” | SUPPORTED (recorded audit) | `gaycruisebingo`, `events/med-2026`: non-free board cells inside `frozenAt`, player standings totals; original build/event chronology and roster. Totals are not normalized across events. |
| “Seven accounts joined” / “Four ever marked anything” / “15 of the 27 marks” / “the other twelve” / “Nobody got a bingo” | SUPPORTED (recorded audit) | Bodega player and board records; seven includes the author's non-marking observer account, six are host and guests, four marked. 15 + 12 = 27. |
| “thirteen marks between 18:03 and 20:13” / “two more” / “eight marks” / “four more squares” / “Three people opened Sunday's cards” | SUPPORTED (recorded audit) | Bodega board mark chronology and Sunday card records. 13 + 2 + 8 + 4 = 27; no marks after Saturday 12:57. Opening does not prove motivation. |
| “Three days later” / “August 11” / “three out of five” / quoted Kim answers | SUPPORTED (recorded audit) | Kim's August 11 debrief and permissioned contemporaneous texts. August 11 is three days after Saturday August 8. Existing quotations retained or excerpted without invented wording; other answers explicitly paraphrased. |
| “fourteen client errors at 14:38” / “three crash screens” / “one device” / “four hours and forty-one minutes” | SUPPORTED (recorded audit) | PostHog 503790, Bodega Saturday exception cluster; 14:38 minus 09:57 = 4h41m. Recorded crash timing is not a direct measure of abandonment. |
| “120 prompts” / “rewrote 65” / “three new day themes” / “about a third” / “27 marks recorded, 26” / “marked once” | SUPPORTED (recorded audit) | Bodega prompt pool and host preparation record; outdoor classification is the author's rough count, not a controlled result. Public pool/schedule reference: Five Across `plans/bodega-prompt-pools.md`; snapshots/boards are the production source. |
| “Of 703 main-day marks ... 288, or 41%” / “294 of all 921 marks, 32% ... 19:00 and 20:59” | SUPPORTED (recorded audit) | Cruise board timestamps. Backfill denominator: main days one through eight before freeze; all-marks denominator includes ceremonial and later marks. 288/703 rounds to 41%; 294/921 rounds to 32%. Dinner setting comes from debriefs, not clock time alone. |
| “four of six respondents” / “Three of those six” / “Three of five” / “Four of five” / “Only one” | SUPPORTED (recorded audit) | Cruise debrief: return motivations, group-chat influence, memorable prompts, easier cards, reshuffle use. Seven submissions, five complete; item denominators retained separately. These are respondents, not all sixteen players. |
| “first two main cards each produced one bingo” / “eight bingos and nearly twice day two's marks” | SUPPORTED (recorded audit) | Cruise card and mark records; claims could occur days after a card's date. Easy mix and reshuffle: Five Across PRs #394/#383. Itinerary change remains an explicit confound. |
| “6 against Firestore's 27” / “61 ... not ... 64 ... three on the ceremonial card” | SUPPORTED (recorded audit) | Original cross-system count and standings-versus-day-tally definitions; preserve the counting sidebar verbatim. No traffic measurement for this website is inferred from game analytics. |
| “July 24” / “August 7” / “thirteen days between, 76 pull requests” / “268 commits” / “59 ... 58 ... 11 ... 14” | SUPPORTED (recorded audit) | Original Five Across history audit. Pull requests concern the interval between trips; six-week counts concern post-debrief history through the September 24 snapshot. Topic figures are approximate keyword matches, not exhaustive categories, time or effort. |
| “design-only spec” / schema rename / “occasion matrix” / “Community prompts” / platform prerequisites | SUPPORTED (public source) | Five Across PRs #109, #648, #811, #845 and issues #785/#786; exact destinations remain in the article. #648 explicitly preserves legacy pool literals while adding neutral read vocabulary. |
| “an organizer can launch and run an event without developer intervention” | SUPPORTED (recorded audit) | Five Across self-service requirements, cited through #785/#786. Retained as a setup criterion; the proposed participation test is separately identified as future work. |

## Claim surfaces and shared links

Revised title, description, SEO description, all four takeaways, all three pull quotes, body, figure captions, and the linked project's offline evidence sentence. Preserve the original counting/provenance source dates; they are not refreshed by this editorial pass. The original article remains at `/blog/the-product-did-not-travel/`, including its images and canonical URL. Both `/blog/the-code-wasnt-the-product/` and `/blog/the-code-was-not-the-product/` redirect there. Existing section fragments remain available, including anchors for the renamed debrief subsection and removed closing summary.

Pass 2 is a separate brevity pass. Verify it with `scripts/verify-brevity.py` against the saved Pass 1 copy; this tool is not applicable to Pass 1's deliberate factual and structural changes.

## Fresh PostHog connectivity evidence (September 26)

Project: [FiveAcross.app, 503790](https://us.posthog.com/project/503790). Window: July 15–24 inclusive in ship time (`Europe/Rome`), expressed as UTC bounds below. Every host in this window was a deployed Gay Cruise Bingo hostname. Query results are event records, not deduplicated root failures or confirmed physical devices.

- **SUPPORTED:** “fifteen exception events contained `auth/network-request-failed`, across five recorded sessions for one recorded user.” The matching exceptions fall on July 18–19 ship time, across two SDK device IDs. All five sessions have zero recorded `mark_square` events. Repeated exceptions can describe the same underlying failure; do not call them fifteen separate outages.
- **SUPPORTED:** “Thirteen marking events ... carried a nonempty analytics retry queue.” Query the captured `$sdk_debug_retry_queue_size`; those thirteen `mark_square` records range from July 17 through July 22, with queue values 1–51. The field is an SDK diagnostic, not a Firestore write result or a browser-offline measurement.
- **SUPPORTED:** Neither matching exception timestamps nor those thirteen mark timestamps falls in 19:00–20:59 ship time. No event property key matching `offline|online|network|connect|retry` exists in the window except `$sdk_debug_retry_queue_size`; this does not establish that all possible connectivity evidence was captured.
- **UNPROVABLE:** the request failures were caused specifically by loss of ship internet, that dinner marking was offline, or that offline support caused retention. Keep those separate from observed request errors.
- **SUPPORTED:** Bodega's August 8 14:38 cluster contains fourteen exceptions on `bodega-bay.vacaybingo.com`, all in one recorded session. Its messages are a JavaScript TypeError and Firestore internal assertions wrapping that TypeError, without the cruise's explicit network-error code. This cluster alone does not prove a Bodega connectivity failure.

Reproduction (read-only HogQL; the PostHog project's default display timezone is Pacific, so convert explicitly):

```sql
SELECT count() AS exception_events,
       count(DISTINCT person_id) AS recorded_users,
       count(DISTINCT properties.$session_id) AS recorded_sessions
FROM events
WHERE event = '$exception'
  AND timestamp >= toDateTime('2026-07-14 22:00:00', 'UTC')
  AND timestamp < toDateTime('2026-07-24 22:00:00', 'UTC')
  AND toString(properties.$exception_values) LIKE '%auth/network-request-failed%';
-- 15 | 1 | 5

SELECT toString(toTimeZone(timestamp, 'Europe/Rome')) AS ship_time,
       properties.$sdk_debug_retry_queue_size AS queue_size
FROM events
WHERE event = 'mark_square'
  AND timestamp >= toDateTime('2026-07-14 22:00:00', 'UTC')
  AND timestamp < toDateTime('2026-07-24 22:00:00', 'UTC')
  AND toInt(properties.$sdk_debug_retry_queue_size) > 0
ORDER BY timestamp;
-- 13 rows; none between 19:00 and 20:59 ship time.
```

Public source check also confirms that PR #394's “Day 4” is the third **main** day, after embarkation; article wording explicitly uses main day three. #811 supplies a spec/model rather than a completed wizard UI; #845 adds the community-prompt entry point and states. #786 quotes the self-service exit criterion verbatim.

## Article traffic before the revision

Read on September 26 at approximately 16:10 UTC in [NathanPayne.com, project 469428](https://us.posthog.com/project/469428). Since September 24, `blog_post_viewed` on `/blog/the-product-did-not-travel/` recorded **14 views from 12 unique recorded visitors**, applying the project's configured test-account and bot exclusions. Referring-domain view totals: direct/unknown 7, LinkedIn 5, `t.co` 1, Facebook 1. Missing referrers do not establish how a visitor found the article. These are captured analytics, not a census of readers.

An additional unfiltered path check of `$pageview` and `blog_post_viewed` found ten of each on September 25 and four of each on September 26, all at the existing canonical path. Neither old-title alias had a recorded matching event in that interval. Preserve the shared canonical path despite changing the visible title; add permanent redirects for both old-title spellings and retain query strings.
