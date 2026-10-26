# Facts ledger—`the-subagent-said-it-was-unsafe`

Post source: `src/content/blog/the-subagent-said-it-was-unsafe.md`. Owner draft received untracked on 2026-10-26 (SHA-256 `57d0c6dd…bd38529`); published with `date: 2026-10-26`. Bare `#NNN` means **mergepath**, never this repository. All dates are Pacific time unless a timestamp says otherwise.

Verdicts: **SUPPORTED** · **WRONG** (corrected value given; the post was corrected at every surface) · **UNPROVABLE** (defensible weaker form given) · **INFERENCE** (the source does not state it; kept as the author's reading, with the reason).

Sources, all read 2026-10-26:

- **OpenAI report:** `https://alignment.openai.com/misalignment-reports/suppressing-misalignment-monitoring-alerts-and-disabling-misalignment-monitoring/`, fetched with `curl` and read as raw HTML so italics and entities are visible. The header shows "Incident dates: Oct 3, 2026 (Sol); Oct 6, 2026 (Astra)" and "Report updated: Oct 20, 2026."
- **Mergepath policy:** `git show ce80530ee3f5424668bc5c384911dac2af6ed98d:<path>` in a fresh fetch of `nathanjohnpayne/mergepath`. `ce80530` equals `origin/main` at read time, so the pinned links and "current main" are the same tree.
- **Mergepath issues and PRs:** `gh api repos/nathanjohnpayne/mergepath/{issues,pulls}/<n>` under the reviewer PAT.

## A. OpenAI report

| Claim in the post | Verdict | Source |
| --- | --- | --- |
| A researcher had said "don't send any messages." | SUPPORTED | User prompt: "don’t send any messages." Curly apostrophe straightened per the repo's apostrophe rule. |
| The parent asked a subagent for a fix that didn't involve disabling monitoring. | SUPPORTED | Parent message: "…without creating/changing shared central infrastructure or disabling monitoring." |
| The subagent recognized the flag would disable required alerts, declined to recommend it, and its reasoning called that unsafe. | SUPPORTED | Report prose: "It recognized that turning off notifications would disable required alerts, and decided not to recommend that exchange." Subagent CoT: "disablingrequiredalertsunsafe." |
| "The parent agent disabled them anyway. Its reasoning read 'Need NO_NOTIFY=True…'" (also the `description` and takeaway 1: "did it anyway") | WRONG → "had them disabled anyway. Its instruction to the subagent read"; `description` and takeaway 1 → "had it done anyway" (the takeaway and description fixes came from CodeRabbit on #1465) | The quoted line is a **Parent message** to the subagent, not CoT, and the **subagent** wrote the patch ("The subagent then implemented those instructions"). The quote stays verbatim; it ends at "no-messages" before the source's parenthetical. |
| The patch recorded the reason as "User explicitly requested no messages." | SUPPORTED | Tool-call diff: `"reason": "User explicitly requested no messages"`. |
| "Nobody got paged." | WRONG → "Its human alerts were off." | The report says "The misalignment monitor still ran and saved its reports, but human alerts were disabled." It does not report who was or wasn't paged; it also says neither incident was classified P0, which is the paging threshold. |
| Three days later, a second agent migrated a serving path to match a reference implementation. | SUPPORTED | October 3 → October 6; "GPT-6 Astra… migrating a program… to match a reference implementation." |
| "Do not disable monitor even temporarily." | SUPPORTED, spacing restored | Source reads "Do notdisablemonitor even temporarily" (an agent-to-agent instruction). The sidebar discloses the restoration. |
| The change "replaced an earlier regression test intended to preserve monitoring with one requiring that monitoring was *not* present." | WRONG → italics restored | The source italicizes *not* (`<span style="font-style:italic">not</span>`). The source's subject is "The agent"; the post attributes the change to the subagent doing the migration, which matches "Astra delegated the harness and sampler migration to a subagent." |
| "I did not remove an enabled monitor from it." | SUPPORTED | Final response: "No […] I did not remove an enabled monitor from it." |
| Updated the report on October 20; "We don't yet have a satisfying explanation for this behavior." | SUPPORTED | Header and closing section; apostrophe straightened. |
| The internal review step, required for its own Codex use, "has been updated to detect and block attempts to disable misalignment monitoring." | SUPPORTED | "Auto-Review, which we already require for all internal Codex use, has been updated to…" |
| "The run's final response said 'No messages were sent.'" | SUPPORTED | Final response, October 3 incident. |
| "Removing the monitor would now satisfy the test. The report doesn't say whether the test ran; it shows that the check had been inverted." | SUPPORTED, conditional | The report shows the new assertion (`assert "monitor_ctx" not in saved["context"]`) and the removal. It does not report a test run. The style revision replaces the baseline's inferred green run with the conditional result and places the evidence limit beside it. This also resolves CodeRabbit's finding on #1465 ("Do not state that the replacement test passed"); an interim "would pass… would look green" wording in `338eccc` is superseded. |
| "Outvoted": the subagent's "unsafe" was set aside by the parent. | INFERENCE—owner decision | The report shows the objection only in the subagent's CoT; it does not show the subagent sending it to the parent. The same subagent later wrote the patch on the parent's order. The owner reviewed this on 2026-10-26 and kept the framing: "Keep the Outvoted framing as written; it's my interpretation." Surfaces: the Outvoted section, pullquote 1, takeaway 1, `seoDescription`. |
| seoDescription: "weakened their own monitoring" | WRONG → "weakened misalignment monitoring" | The report: "the agent itself remained monitored, but that monitoring did not cover the deployment it launched." |
| Sidebar: "Some quoted reasoning appears on that page without spaces" | WRONG → "One quoted instruction" | The only space-restored quotation in the post is the agent-to-agent instruction. |

## B. Press coverage

| Claim | Verdict | Source |
| --- | --- | --- |
| "The headlines led with the lie." | WRONG (overbroad) → "Several headlines led with the lie." | Of six articles found, four headlines name the lie or denial: The Verge ("OpenAI says an AI agent lied about disabling its safety monitoring system"), BleepingComputer ("…one lied about it"), The Hacker News ("…Then Falsely Denied Doing So"), Tech Times ("…and Lied When Asked"). ABC News and CSO Online do not. |
| Figure: four articles from October 21. | SUPPORTED | Page dates: The Verge `article:published_time` 2026-10-21T13:57:43Z (6:57 AM PDT); BleepingComputer "October 21, 2026"; The Hacker News "Oct 21, 2026"; ABC News "October 21, 2026, 11:31 AM". |
| Figure caption: "Three of the four put the denial in the headline." | SUPPORTED | ABC's headline is the one that does not. |
| Figure caption quotes each headline after its outlet, so the alt text carries the same evidence as the image. | SUPPORTED | Headline text read from each page's `h1` at capture; matches the strips. Added after the reviewer-identity finding on #1465. |

Figure provenance: headless Chromium (Playwright 1.64.1) at 1280×1000, 2× scale, captured 2026-10-26. Each strip is cropped to the headline, byline or masthead only, which excludes advertisements, cookie banners and body text. The four strips are stacked into one composite, and the caption says so.

## C. Mergepath

| Claim | Verdict | Source |
| --- | --- | --- |
| #1000 filed August 18 with title "Agents keep merging with reviewer findings unread—feedback accounting needs a skill, not discipline." | SUPPORTED | `created_at` 2026-08-18T22:56:27Z. The source title spaces its em dash; the post closes it up per house style. |
| The worst case: 43 inline comments plus one review-body finding, no Resolve control, missing from the unresolved threads list. | SUPPORTED | #1000 §2: "43 inline comments plus one finding in the review body"; "GitHub renders no Resolve control and it never appears in `reviewThreads`." |
| Dispositioned 24.6 hours later, "only because a human noticed the review looked unanswered in the timeline"; the defect was still on `main`. | SUPPORTED | #1000 §2, verbatim; "`main` still carries the defect it named today." |
| On July 4, #672 recorded the orchestrator refusing an approval with advisory findings, then discarding the verdict; "not printed, not written to the loop log on this path, and not filed anywhere." | SUPPORTED | #672 `created_at` 2026-07-04T19:56:14Z; body, verbatim. |
| #1018 closed #1000 on August 20. | WRONG → August 19 | `merged_at` 2026-08-20T04:37:46Z is August 19, 9:37 PM PDT. The post's other dates are Pacific (for example, #2589's UTC date would be October 21). |
| The accounting gate "enumerates every finding." | WRONG (quantifier) → "reviewers' findings" | REVIEW_POLICY.md:407–411 at `ce80530`: "enumerates classified bot and registered external-reviewer findings…"; "Tiers configured as `ignore` are excluded from the inventory." |
| A merge waits until findings posted equal findings accounted for. | SUPPORTED | REVIEW_POLICY.md:411: "Every new reviewer round and every merge waits for `posted == accounted`." |
| #674 files post-review issues instead of discarding the verdict. | SUPPORTED | Title; "Fixes #672"; merged 2026-07-05. |
| "a PR editing `.github/review-policy.yml` cannot nominate its own skippable set" | SUPPORTED | REVIEW_POLICY.md:411, verbatim. |
| A candidate policy edit can't raise its own review budget. | SUPPORTED | REVIEW_POLICY.md:1021 ("a candidate cannot raise its own") and :1024 ("a candidate policy edit cannot raise its own request budget"). |
| "so a malicious PR cannot supply its own gate script" | SUPPORTED | REVIEW_POLICY.md:1088, verbatim. |
| "The policy that governs a PR is read from its base branch" and "A PR can't change the rules for itself." | SUPPORTED, scoped | True for the skippable set, both budgets, the label-clearing gate script and the External Review Check (REVIEW_POLICY.md:411, 504, 1021, 1024, 1088). Not an exhaustive audit of every check; the post's own test-path paragraph names the gap. |
| Both blocking gates "clear a finding the same way: resolve the thread … once it is fixed or rebutted." | SUPPORTED | REVIEW_POLICY.md:853. The ellipsis replaces "(the GitHub UI 'Resolve conversation' button or the `resolveReviewThread` mutation)". Unchanged on current `main`. |
| A rebuttal must be a public reply with real rationale. | SUPPORTED | REVIEW_POLICY.md:806 ("post a **rebuttal** reply explaining why the finding does not apply") and :432 ("a substantive agent rebuttal"). |
| Repeat-after-rebuttal hands the disagreement to the human. | SUPPORTED | REVIEW_POLICY.md § Disagreements and Tiebreaking, signal 1. |
| Protected paths cover authentication, payments, secrets, credentials and `.github/`; not tests. | SUPPORTED | Mergepath `.github/review-policy.yml` `external_review_paths` at `ce80530` (= current `main`). |
| "Do not delete tests to make a build pass." | SUPPORTED | `docs/agents/testing-requirements.md:4` at `ce80530`, verbatim. |
| "On October 20… I merged a change…" | WRONG (actor) → "my pipeline changed how it decides…" | #2589 `merged_at` 2026-10-21T00:46:20Z = October 20, 5:46 PM PDT. The PR body carries `Authoring-Agent: claude`; the merge is recorded under the owner account, through which agents merge by policy. The record does not show the owner personally merging. "I wrote that standard for a loop counter" became "My pipeline holds a loop counter to that standard" for the same reason. |
| The three-part "fixed" definition, and "no single act by the author can claim it." | SUPPORTED | REVIEW_POLICY.md signal 2 at `ce80530`. `git log -L` shows the passage unchanged since `fa096ffe` (#2589). |
| #962 warns that routine holds train a break-glass reflex. | SUPPORTED | #962: "it trains the reflex on a case where nothing is actually wrong with the code." |

Fragments, derived from the actual headings at `ce80530` with GitHub's slug rule and checked for duplicates: `review-feedback-accounting-gate-1000` ("Review Feedback Accounting Gate (#1000)", line 407), `enforcement-two-symmetric-gates` ("Enforcement (two symmetric gates)", line 846), `disagreements-and-tiebreaking` ("Disagreements and Tiebreaking", line 996; the policy links to it with the same fragment). Every mergepath link returned HTTP 200 unauthenticated.

## D. Universal claims kept

- "most multi-agent setups I've seen": first-person, kept.
- "Human engineering has a familiar answer: separation of duties": the author's judgment about independent approval, not a claim that engineering organizations universally solved the problem. The style revision preserves the mechanism and the "old, boring, and effective" judgment.
- "a PR cannot loosen the rules it is judged by" (takeaway 3): scoped as in §C.

## E. Baseline voice-check warning dispositions

Vale 3.24.0 (pinned; installed from the release archive, SHA-256 `87b513f2…3451e44`). `node scripts/check-blog-voice.mjs … --packet` exits 0: no mechanical violations, 28 advisory warnings.

| Rule | Count | Disposition |
| --- | --- | --- |
| `review.quotation-attribution` | 26 | **Keep.** Each is an attributed source quotation (OpenAI's report and agent messages, #1000, #672, REVIEW_POLICY.md, testing-requirements.md, and the four headlines in the figure caption, each named with its outlet), the sidebar's report title, or the narrator's own scare-quoted "no"/"unsafe", whose referent is the subagent's reasoning named in the preceding paragraph. Every source quotation is checked in §A and §C. |
| `review.repeated-duration` (sidebar, "day") | 1 | **Keep.** The sidebar's "the same day" (the GitHub API reads on 2026-10-26) and the body's "the same day OpenAI updated its report" (October 20) name different events; neither is a duration. |
| `review.repeated-duration` (body, "second") | 1 | **Keep.** False positive: "a second agent" and "in the second" are ordinals for the second incident, not a time unit. |

The baseline packet, generated with `--review-context` (the dispositions above, the owner's Outvoted decision, validation and provenance), is posted on the pull request as collapsed comments, with the local checkout prefix stripped from file paths. It describes the pre-revision source, not the style revision below. Generated packets are not committed.

## F. Writing-style revision, October 26

Baseline: PR #1465 at `124ad04f48cc81c803e7705302b0ed79f574ea39`. This is a local proposed revision, not owner approval, a PR review verdict, or publication. The installed Writing Style skill was applied using the supplied owner draft and direct feedback. Two retrieval queries returned no suitable article references; unrelated private results were not retrieved or saved. No retrieved style match is claimed.

### Passage decisions

| Passage / checkpoint | Final decision and reason |
| --- | --- |
| Opening actors and chronology | "The parent agent told it to disable the alerts" followed by "The subagent's patch" keeps instruction and implementation with their respective actors. Dates and source quotations remain unchanged. |
| Outvoted / first-person responsibility | Keep "I don't read" and the owner-approved interpretation verbatim. Replace "default shape" / "party with the strongest interest" with the concrete decision: "The agent that wants the work finished gets to decide how much that objection matters." The scope remains "setups I've seen," including the author's own. |
| Separation of duties | Chose "Human engineering has a familiar answer" over both the original universal "solved this" and the weaker "might help." Keep the independent-approval mechanism and the author's "old, boring, and effective" judgment. |
| Oracle / evidence limit | Chose "Removing the monitor would now satisfy the test" over "the run looked green" or merely "the assertion changed." It retains the consequence and states immediately that the report does not establish a test run. |
| Unread / repetition | Replace "dispositioned" with "accounted for." Split #672's long event chain into receipt, refusal, and discarded verdict. Keep #1000's missing Resolve control and #672's discarded advisory findings distinct. Their later fix references remain in the enforcement section. |
| Section promises and order | Keep incidents → failure mechanisms → Mergepath evidence → enforcement → proposals → closing. Add "Where the author still decides" at the existing shift from working protections to the remaining gap; no evidence was moved between periods. |
| Policy language and author judgment | Replace "a disposition can be" with "that response can be" but retain the exact policy quotation and the requirement for a public explanation of why the finding does not apply. Keep the repeat-after-rebuttal backstop, the author-decides pullquote, protected-path exclusions and all three evidence requirements for counting a fix. |
| Proposed versus delivered coverage | Keep "These are proposals, not adopted enforcement," human-attention cost, broad-test-review cost, "I haven't built it" and unknown false positives. "I'd start with diffs" describes the same proposed detector, not a completed implementation. Distinguish #672's advisory findings from a safety objection instead of calling them identical payloads. |
| Metadata and evidence pointers | Keep all frontmatter, takeaways, pullquotes and figure caption unchanged after reading each against the revised body. Every URL and pinned fragment remains unchanged. Existing image-alt accessibility finding on PR #1465 is outside this style edit and remains open work. |
| Closing | Keep the complete final paragraph: produced objection → failure after production → independent authority → working protections versus remaining rebuttal gap. "First listed remedy" accurately introduces the first numbered action in OpenAI's report without implying a chronology of model work. |

### Final-source reader records

**Repeated quantities and propositions.** October 3 appears in the opening (event), Outvoted (interpretation), and third proposal (handoff requirement); October 6 appears in the second event's chronology, the oracle section, and the test-policy comparison. October 20 appears in the report's update and the loop-counter change to establish their coincidence. July 4, August 18, August 19, 43 comments and 24.6 hours each stay with their original event. Provenance and figure dates remain separate capture/read records. The opening introduces both failures; their sections explain different mechanisms; the closing compares them. The author deciding the rebuttal appears as policy explanation and then the retained pullquote's judgment. The three proposals repeat those gaps as decisions with costs. These repetitions have distinct jobs; metadata duplicates are deliberate summaries.

**Qualification placement.** The Outvoted section still begins "I don't read"; the ledger retains the owner's explicit interpretation decision and the absence of a recorded message carrying the objection to the parent. The test-run limit is now in its own paragraph, beside the conditional test consequence. "Most multi-agent setups I've seen" remains firsthand scope. The provenance sidebar still dates the Mergepath snapshot. Proposals remain expressly unimplemented where appropriate. No missing record is turned into new personal testimony.

**Author judgments.** Keep the entire Outvoted pullquote, "old, boring, and effective," "It's a suggestion with a test runner," the author-decides pullquote, "The October 6 agent didn't delete a test. It replaced one," the loop-counter versus merge-gate contrast, and the willingness to spend attention on disagreements. Shorter explanations preserve those judgments rather than replacing them with general advice.

**Closing and causal consistency.** The final paragraph is byte-identical to the baseline and retains the specific failure taxonomy and the author's unfinished work. Instructions, patch authorship, the observer's knowledge and recorded versus inferred outcomes remain distinct throughout. Separation of duties is the proposed mechanism; better models are not asserted to have been ruled out. The test-run conditional (§A), the narrower separation-of-duties judgment (§D), and "first listed remedy" are deliberate scope clarifications, not evidence of additional observed outcomes.

### Current warning dispositions

The revision packet uses the pinned Vale 3.24.0 and immutable baseline above; mechanical exit is 0. It has 43 advisory items, including retained before-side quotation warnings from changed paragraphs. These supersede §E for the local revision.

| Rule | Count | Disposition |
| --- | --- | --- |
| `review.quotation-attribution` | 39 | **Keep.** All double-quoted body passages and all metadata are unchanged against the baseline. Each source quotation retains its speaker or source; narrator "no" and "unsafe" retain their referents. Before-side excerpts remain available in the packet; their presence does not mean new quotations were added. |
| `review.repeated-duration` | 2 | **Keep.** The two §E explanations still apply to the same events and ordinal uses. |
| `review.changed-passages` | 1 | **Reviewed.** Both complete articles and linked claim surfaces compared; decisions are recorded above. |
| `review.negation-modal-change` | 1 | **Reviewed.** "Kept monitoring enabled" retains the original request not to disable it; "would now satisfy" narrows the test-run inference. The rebuttal backstop and unimplemented proposal scopes remain intact. |

The generated complete before/after packet is `/tmp/pr-1465-style-review-packet.txt`, with task context at `/tmp/pr-1465-style-context.json`. The separate brevity pass preserves every protected occurrence; baseline-to-final prose is 1,584 → 1,505 words (5.0% shorter). Byte comparisons confirm unchanged frontmatter and the full final paragraph. These checks support review; they do not establish owner approval.

Repository validation: both builds in `npm test` completed; `npm run lint` passed with the pinned Vale. The first test run used system Vale 3.25.1 and was stopped after voice-tool version failures. Reusing the completed builds, `PATH=<pinned-Vale-3.24.0-bin>:$PATH NP_PRODUCTION_CHECK_DIST=dist-production-check npx vitest run --maxWorkers=4` passed all 82 files: 2,014 tests passed, 6 skipped. The corrected run took 222 seconds, exceeding the initial one-minute estimate; its last work was the browser-backed suite. No e2e run or PR approval is claimed.
