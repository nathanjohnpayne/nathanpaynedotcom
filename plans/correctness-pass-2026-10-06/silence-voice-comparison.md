# Silence Is Not an Approval: Voice Comparison

Draft for individual owner approval. Baseline: `origin/main` at `6cd7f6fa02aaf030264e744ec5447fc408527f5d`, including PR #1129 (`1d1d39d`) and the newer PR #1130 corrections. The entire original article was read before editing. The original draft was read against the September ledger. While the voice work was underway, PR #1130 added `plans/correctness-pass-2026-10-06/silence-is-not-an-approval-ledger.md` and corrected the article and prior ledger. The complete updated article, new ledger and actual diff were read before reconciling this draft. Both ledgers are used; the new October 6 findings take precedence. PR #1129 does not directly edit this post or its ledger.

Complete draft: `src/content/blog/silence-is-not-an-approval.md`.

## Structure and Editorial Choices

The established structure stays: the false clearance, owner question, compounding audit, cost of blocking, patch series and September decision, followed by the full evidence appendix. Four headings become plainer, with their old anchors preserved. Every heading uses sentence case, including the appendix. The historical evidence window and September 24 decision/September 25 implementation remain distinct; nothing is presented as newly measured in October. No table, code block, external quotation or sidebar moves. The table's corrected exact 15 rounds and the updated sidebar counting/re-read rules are carried unchanged from current main.

The deck and takeaways now use direct verbs and name the decision and cost. All three author pullquotes are retained; the second uses double quotes around "no answer," per the owner's copyedit. All three appear verbatim in the body. Titles, SEO fields, date, tags, ranking, image, draft state and both sidebar entries are unchanged. No narrator "we/us/our" or curly source apostrophes were added. The "weather" line and the author's mistaken shipped-PR claim remain. The asymmetry pullquote is framed as the author's concern about counting evidence, not as a claim that #940 bypassed the required gate.

## Before and After

### Opening

Before:

I have written before about [automated reviewers being right and the pull request being wrong anyway](/blog/every-reviewer-was-right/). This is the opposite failure: the reviewer that never answered, and the pipeline that scored the silence.

After:

In [the last post](/blog/every-reviewer-was-right/), every reviewer was right and the pull request was still wrong. This time a reviewer hadn't answered, and my pipeline counted that as a review.

### The False Clearance

Before:

The helper did not fall for the status: its newest guard saw that the description did not name a completed review and refused the fast path. The poll it fell through to then found CodeRabbit's walkthrough comment, written hours earlier for an older commit, whose update timestamp CodeRabbit had bumped on the push. It looked fresh, graded as a review, and cleared. The evidence that should have stopped it had been read and rejected one branch earlier.

After:

The newest guard got that status right. The description didn't name a completed review, so it refused the fast path. Polling then found a walkthrough comment from hours earlier, written for an older commit. CodeRabbit had updated its timestamp on the push. The poll treated it as a fresh review and cleared. One branch had rejected the missing evidence; a later branch accepted something else as a substitute.

### What Compounded

Before:

What made this one compound is specific to it. The failure blocked no propagation; each run recorded it, but nothing aggregated those records into a warning about the growing backlog. Each run's leftover became the next run's input, so the error grew instead of repeating. And "reviewer unavailable" reads like weather, not a defect. None of that is a law about failing open. It is what happens when a no-answer state is filed under the wrong kind and nobody owns the difference.

After:

This case compounded because it blocked no propagation. Each run recorded the failure, but nothing aggregated those records into a warning about the backlog. Each leftover range became the next run's input. And "reviewer unavailable" reads like weather. That explains this case; it isn't a general law about failing open. It is what happens when a no-answer state is filed under the wrong kind and nobody owns the difference.

### The Cost of Blocking

Before:

Failing open can lose reviews quietly; failing closed can spend people loudly. Choosing between them for a given kind of silence is a product decision, and I had been leaving it to whichever code path met the case first.

After:

I had to choose a response for each kind of silence. Letting work continue could lose reviews quietly. Blocking could spend someone's time or stop the whole repository. I had left that choice to whichever code path hit the case first.

### The Rule and Its Limits

Before:

What changed is the rule for making progress when evidence is missing. Before, each code path decided for itself whether a silence was close enough to a yes, and the fixes taught them one at a time that it was not. Now there is one written rule, with an owner, for one kind of silence: while the provider's current comment remains a refusal, a completion status alone cannot substitute for a review of this commit. The remaining work is to write that kind of rule for every other kind of silence, once, and have the waiter and the gate both read it.

After:

I now have one written rule, with an owner, for one kind of silence. A completion status can't stand in for a review of the current commit while the provider's current comment remains a refusal. The rest of the work is to write that kind of rule for each other missing-answer state, once, and have both the waiter and the gate use it. The response may differ by state. It shouldn't differ by which script happened to see it.

### The Author's Mistake

Before:

[#1232](https://github.com/nathanjohnpayne/mergepath/pull/1232) was an attempt at half of #1130: move the read-only gate steps off the repository token budget. It ran four review rounds and closed unmerged on September 12, fifty-one minutes after it opened. [#1291](https://github.com/nathanjohnpayne/mergepath/pull/1291) merged on September 22 and makes duplicate events cheaper, but by its own account "removes no event deliveries or job executions." An earlier draft of this post listed #1232 as shipped, from its title rather than its state: a pull request that did not answer, read as an answer.

After:

[#1232](https://github.com/nathanjohnpayne/mergepath/pull/1232) tried to move the read-only gate steps off the repository token budget, one half of #1130. After four rounds, it closed unmerged on September 12, fifty-one minutes after opening. [#1291](https://github.com/nathanjohnpayne/mergepath/pull/1291) merged on September 22. It makes duplicate events cheaper but "removes no event deliveries or job executions." My earlier draft listed #1232 as shipped, from its title rather than its state. A PR that hadn't delivered had become evidence of work done.

## Complete Meaning Review

The full draft was compared against the complete current-main article and both ledgers, including every PR #1130 correction. That review repaired two first-pass changes before delivery: "before it propagates" incorrectly changed the timing of the wave audit and was removed; "I read its title" invented a personal act where the source said an earlier draft used the title, so the final passage names the draft instead. The ledger's opening "unpublished" label is corrected in place to the already-published baseline; The old ledger’s lower §C3 paragraph is also corrected in place to label the superseded helper diagnosis as a historical draft interpretation. No claim verdict, numerical evidence or source record changes.

| Claim Group | Meaning Retained |
|---|---|
| Thesis and authority (§A1, §H, §I1) | Most paths already represented no answer; the missing part was a shared rule and owner, not the absence of a type across the codebase. Separate identity remains distinct from a different agent; a second-agent veto applies to larger changes. Canonical docs, CI and propagation remain. |
| #940 (§C3) | The guard correctly rejected the incomplete status; refreshed old walkthrough polling cleared later. This lost a CodeRabbit review and its expected failover without bypassing the required gate. The six-second review attempt, older comment and push-updated timestamp remain. |
| Wave audit (§D7, §E1a) | September 4 filing, quoted July 28 watermark, transient classification, range growth, recorded per-run failure without aggregated warning, 127 commits/2.8-times figures attributed to the issue, 38-day approval-to-filing gap and 45-line pre-dispatch size refusal remain. #1263 is explicitly the first partial fix; #1186 remains open for the backlog the fix does not split. No universal claim that fail-open always compounds or that the runs recorded nothing. |
| Blocking costs (§D5, §E1–E2) | Repository-wide token exhaustion, exact 1,000/hr/repo source quotation, correct hold versus alarming presentation, break-glass risk and neutral releasing a required check remain. The topology decision stays open and blocked. The sidebar carries current main's October 6 re-read after the September 30 evidence read. |
| Patch chronology (§A2, §C1, §F1–F2) | August 3 creation is separate from September 4 high-priority rewrite and its instruction not to patch the family. Full contract and shared-consumer quotations remain, including the specs parenthesis. Twenty distinct changes across the 21-commit burst, 32h41m, eight author-classified instances and six #878-linked shipped PRs remain distinct. Both occurrences of the banner are dated to September 15, as the October audit corrected. The fixes improved safety, and #1274/#1279 closed #940 without closing the broader redesign. |
| September decision (§I2–I6) | August 11 issue, one-second false clear, auto-pause, completed status versus resume/pending, author-owned September 24 comment, body-bearing current-commit review evidence and September 25 implementation remain. The rule is conditional on the current provider comment remaining a pause or rate-limit refusal. |
| Refusal exits and cost (§I5) | A completion status alone cannot replace review evidence in that refusal state. The rewrite does not claim a review is the only way out or that every timeout invokes failover. Existing resume/retry/timeout/failover and bounded outcomes remain, including ordinary supersession by a later provider comment. Waiting on some healthy commits is the author's accepted cost, not a measured count. |
| Remaining work (§I6) | One case is settled; shared classification, remaining states and downstream delivery stay open. Different missing-answer states may require different dispositions. The ending preserves "that kind of rule," without applying the refusal response to all silence. |
| Appendix population (§B1–B4, §B6) | Ninety merged PRs and twelve title matches remain floors, with rebase and title limits in the sidebar. September 23's eleven-of-164 issue floor, nine defects/two controls, 78-day oldest and same-day newest remain date-bound. No removed 12–34 range or claimed share of all monthly work returns. |
| Appendix fixes (§D1–D9) | All eight table rows and their diff/round counts stay byte-identical to corrected current main, including exactly 15 for #1179. The sidebar counts only review submissions with a body, excluding body-less acknowledgment objects. The truncation example retains 56 seconds to opening, not closure, 3000 cap, fail-closed required external review and the exact corrected quotation: "cannot support either the threshold test or the protected-path match." |
| Burst (§F1–F2) | All 21 commit subjects, committer-order label and exact bounds remain. The duplicate #1266 accounts for twenty distinct changes; eight/two/three/seven buckets remain judgment from titles and summaries, not a census of causes. |
| Work that did not land (§D3, §D8, §H) | #1232 is closed unmerged after four rounds and 51 minutes; #1291 merged September 22 and reduces cost without removing event deliveries/jobs. The author's earlier draft error remains visible. No fix is dismissed as unproductive or claimed cheaper than a redesign. |
| Manual unknown (§E5) | #1058's unreadable protection value is recorded as unknown with its reason. It is an example of the desired representation, not another instance of the defective guessing. |

## Occurrence-Check Exception

The checker is unchanged. Its only failed class is numerals: the takeaway's repeated `38 days` is written as "Thirty-eight days." The value, interval and association with the last approval and filing are retained in the takeaway and body. Every distinct protected value remains.

All 27 URLs, 29 link destinations, 103 PR references, 31 timestamps and 24 inline code spans pass. The appendix table, all 21 fenced commit subjects, both sidebar scalars and pinned fields are unchanged. The number-word advisory was reviewed: enumeration language is shortened while every substantive count remains, including six seconds, one-second clearance, three body cases, twenty changes, all bucket counts and all open-population floors. Source quotations remain verbatim apart from ordinary sentence punctuation already allowed by the sidebar's house-style convention.

Fresh connective-prose count: **1,905 → 1,738 words, −8.8%**. Whole file: 3,293 → 3,073 words. The article was already shorter and better structured than the other drafts, so this pass keeps its evidence appendix and concentrates on narration and repeated explanations.

## Validation

The initial draft passed build and 58 scoped tests. The approved repairs and current-main reconciliation are awaiting fresh full lint/typecheck/unit/browser checks and rendered readback. A malformed YAML quote in the first application of the owner's double-quote request was caught by prose lint and corrected before any build or PR. No new tests were added.

## Owner Judgment

The revised deck and takeaways are visible editorial choices. All original pullquotes remain. The owner conditionally approved the listed repairs. They are applied, and the newly merged factual corrections are preserved in all article surfaces. No cross-post edit is introduced. The title classification and burst buckets remain single-rater judgments under the new ledger, with floors and attribution intact.
