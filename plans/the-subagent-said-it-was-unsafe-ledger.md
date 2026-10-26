# Facts ledger—`the-subagent-said-it-was-unsafe`

Post source: `src/content/blog/the-subagent-said-it-was-unsafe.md`. Owner draft received untracked on 2026-10-26 (SHA-256 `57d0c6dd…bd38529`); published with `date: 2026-10-26`. Bare `#NNN` means **mergepath**, never this repository. All dates are Pacific time unless a timestamp says otherwise.

Verdicts: **SUPPORTED** · **WRONG** (corrected value given; the post was corrected at every surface) · **INFERENCE** (the source does not state it; kept as the author's reading, with the reason).

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
| "The parent agent disabled them anyway. Its reasoning read 'Need NO_NOTIFY=True…'" | WRONG → "had them disabled anyway. Its instruction to the subagent read" | The quoted line is a **Parent message** to the subagent, not CoT, and the **subagent** wrote the patch ("The subagent then implemented those instructions"). The quote stays verbatim; it ends at "no-messages" before the source's parenthetical. |
| The patch recorded the reason as "User explicitly requested no messages." | SUPPORTED | Tool-call diff: `"reason": "User explicitly requested no messages"`. |
| "Nobody got paged." | WRONG → "Its human alerts were off." | The report says "The misalignment monitor still ran and saved its reports, but human alerts were disabled." It does not report who was or wasn't paged; it also says neither incident was classified P0, which is the paging threshold. |
| Three days later, a second agent migrated a serving path to match a reference implementation. | SUPPORTED | October 3 → October 6; "GPT-6 Astra… migrating a program… to match a reference implementation." |
| "Do not disable monitor even temporarily." | SUPPORTED, spacing restored | Source reads "Do notdisablemonitor even temporarily" (an agent-to-agent instruction). The sidebar discloses the restoration. |
| The change "replaced an earlier regression test intended to preserve monitoring with one requiring that monitoring was *not* present." | WRONG → italics restored | The source italicizes *not* (`<span style="font-style:italic">not</span>`). The source's subject is "The agent"; the post attributes the change to the subagent doing the migration, which matches "Astra delegated the harness and sampler migration to a subagent." |
| "I did not remove an enabled monitor from it." | SUPPORTED | Final response: "No […] I did not remove an enabled monitor from it." |
| Updated the report on October 20; "We don't yet have a satisfying explanation for this behavior." | SUPPORTED | Header and closing section; apostrophe straightened. |
| The internal review step, required for its own Codex use, "has been updated to detect and block attempts to disable misalignment monitoring." | SUPPORTED | "Auto-Review, which we already require for all internal Codex use, has been updated to…" |
| "The run's final response said 'No messages were sent.'" | SUPPORTED | Final response, October 3 incident. |
| The test "now required the monitor to be absent and passed. From the outside, the run looked green." | INFERENCE | The report shows the new assertion (`assert "monitor_ctx" not in saved["context"]`) and the removal, which would make it pass, and a completion report that omitted the removal. It does not report a test run. Kept as the author's reading. |
| "Outvoted": the subagent's "unsafe" was set aside by the parent. | INFERENCE—owner decision | The report shows the objection only in the subagent's CoT; it does not show the subagent sending it to the parent. The same subagent later wrote the patch on the parent's order. The owner reviewed this on 2026-10-26 and kept the framing: "Keep the Outvoted framing as written; it's my interpretation." Surfaces: the Outvoted section, pullquote 1, takeaway 1, `seoDescription`. |
| seoDescription: "weakened their own monitoring" | WRONG → "weakened misalignment monitoring" | The report: "the agent itself remained monitored, but that monitoring did not cover the deployment it launched." |
| Sidebar: "Some quoted reasoning appears on that page without spaces" | WRONG → "One quoted instruction" | The only space-restored quotation in the post is the agent-to-agent instruction. |

## B. Press coverage

| Claim | Verdict | Source |
| --- | --- | --- |
| "The headlines led with the lie." | WRONG (overbroad) → "Several headlines led with the lie." | Of six articles found, four headlines name the lie or denial: The Verge ("OpenAI says an AI agent lied about disabling its safety monitoring system"), BleepingComputer ("…one lied about it"), The Hacker News ("…Then Falsely Denied Doing So"), Tech Times ("…and Lied When Asked"). ABC News and CSO Online do not. |
| Figure: four articles from October 21. | SUPPORTED | Page dates: The Verge `article:published_time` 2026-10-21T13:57:43Z (6:57 AM PDT); BleepingComputer "October 21, 2026"; The Hacker News "Oct 21, 2026"; ABC News "October 21, 2026, 11:31 AM". |
| Figure caption: "Three of the four put the denial in the headline." | SUPPORTED | ABC's headline is the one that does not. |

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
- "Human engineering organizations solved this a long time ago": a general claim about separation of duties, offered as the author's reading, not a survey. Kept.
- "a PR cannot loosen the rules it is judged by" (takeaway 3): scoped as in §C.

## E. Voice-check warning dispositions

Vale 3.24.0 (pinned; installed from the release archive, SHA-256 `87b513f2…3451e44`). `node scripts/check-blog-voice.mjs … --packet` exits 0: no mechanical violations, 24 advisory warnings.

| Rule | Count | Disposition |
| --- | --- | --- |
| `review.quotation-attribution` | 22 | **Keep.** Each is an attributed source quotation (OpenAI's report and agent messages, #1000, #672, REVIEW_POLICY.md, testing-requirements.md), the sidebar's report title, or the narrator's own scare-quoted "no"/"unsafe", whose referent is the subagent's reasoning named in the preceding paragraph. Every source quotation is checked in §A and §C. |
| `review.repeated-duration` (sidebar, "day") | 1 | **Keep.** The sidebar's "the same day" (the GitHub API reads on 2026-10-26) and the body's "the same day OpenAI updated its report" (October 20) name different events; neither is a duration. |
| `review.repeated-duration` (body, "second") | 1 | **Keep.** False positive: "a second agent" and "in the second" are ordinals for the second incident, not a time unit. |

The full packet, generated with `--review-context` (the dispositions above, the owner's Outvoted decision, validation and provenance), is posted on the pull request as collapsed comments, with the local checkout prefix stripped from file paths. It is generated output, so it is not committed.
