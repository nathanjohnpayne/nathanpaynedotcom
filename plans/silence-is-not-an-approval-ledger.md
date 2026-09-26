# Facts ledger—`silence-is-not-an-approval`

Post source: `src/content/blog/silence-is-not-an-approval.md`. Drafted `2026-09-23`, unpublished. Evidence repo: `nathanjohnpayne/mergepath`. Bare `#NNN` means **mergepath**, never this repository. Every reference below is written repo-qualified where ambiguity is possible.

Verdicts: **SUPPORTED** · **WRONG** (corrected value given) · **UNPROVABLE** (defensible weaker form given).

**Retrieval: the original snapshot was read 2026-09-23. Rows marked "re-read 2026-09-24" (or citing a 2026-09-24 call) were checked or corrected in the second pass on 2026-09-24, some through `gh api` REST and GraphQL rather than the tools named here.** Figures were pulled through the GitHub read tools, not a local checkout: `github_get_pull_request` (metadata, timeline), `github_get_pull_request_diff` (`total_additions`, `total_deletions`, `total_files`), `github_get_issue` (metadata, timeline), `github_list_commits` (`[].date`, `[].message`), `github_list_issues`, `github_list_pull_requests`.

**Three tool limits that shape every row below, stated once.**

1. `github_get_pull_request` exposes `.metadata.merged` as a boolean but **carries no `merged_at` field**. Every merge timestamp in this ledger is either the timeline's `merged` event `created_at` or, where no such event exists, the `date` of the squash or merge commit on `main` bearing the pull request's number. Those are different fields with different meanings and the row says which one it used.
2. Issue and pull request **timelines paginate at 30 events**. Every "referencing PRs" list below is page 1 only and is therefore a **floor, not a complete set**. Do not write "only" or "every" in front of one of these lists.
3. There is **no issue full-text search** in this tool set. Issue population figures are title-only matches and are floors.

---

## A. THE CENTRAL CLAIM, AND THE ONE THING THE POST MUST NOT OVERSTATE

### A1—"a reviewer that could not answer produced a value, and the caller had no way to represent 'no answer,' so it used the value"

**SUPPORTED as a characterization of the cited instances. UNPROVABLE as a claim about the codebase as a whole.**

The post states this as the shape of a defect family and then cites eight instances. That is defensible. What the draft must not do is assert that no representation of "no answer" exists anywhere in the codebase. The evidence for the stronger reading is `nathanjohnpayne/mergepath#878`, which says the classification rests on grepping a rendered vendor surface (§C1), and that is an argument about *how* the state is derived rather than proof that no type for it exists anywhere. Defensible weaker form, and the one the post uses: **there is no single shared representation consumed by both the waiter and the gate**, which is #878's own acceptance criterion 2, quoted verbatim in §C1.

### A2—the post's most important self-criticism is verifiable, and it is the reason to publish

`nathanjohnpayne/mergepath#878` body: *"Do not attempt this as a patch series. The original filing's own history—seven review rounds, fifteen valid findings, no convergence—is the argument against that."*

Source: `github_get_issue(repo="nathanjohnpayne/mergepath", issue_number=878)` → `.metadata.body`.

**SUPPORTED.** #878 was created `2026-08-03T19:40:44Z` (`.metadata.created_at`), is `open` (`.metadata.state`), and carries labels `size:L`, `type:debt`, `priority:high`, `area:review-sensing` (`.metadata.labels[].name`). Its own pinned decision banner names `#1271`, `#1273`, `#1274/#1279`, `#1282` and `#1283` as shipped against it and says it "stays open/high for the #956 product decision and the remaining shared classification contract."

So the instruction not to do this as a patch series predates the patch series by **ten days**, and the patch series is six of the pull requests this post is about.

**WRONG in the first draft: "six weeks" and "written on August 3."** The labels and every quoted passage date from a **2026-09-04 rewrite**, not from creation. Source: GraphQL `repository.issue(number:878).userContentEdits`, 10 edits, read 2026-09-24. The creation revision (`editedAt 2026-08-03T19:40:44Z`, 3,743 chars) contains none of "patch series", "not independent defects", "written contract", "One implementation", or the #945 "previous round" sentence. The `2026-09-04T00:46:04Z` revision contains all of them. `issues/878/events` shows `priority:high`, `type:debt`, `size:L`, and `area:review-sensing` all `labeled` at `2026-09-04T00:35:45Z`–`00:35:46Z`. The August 3 body does make the argument in substance, verbatim: "case-by-case hardening of prose classification walks an unbounded surface." Corrected at every surface: description, takeaway 4, pull quote 3 (which also claimed the issue "opens with" the instruction; it sits in a closing notes list), the #878 section, the #945 sentence ("I read that in August" removed), the "since August 3" line (now "in one form or another"), and the closing list ("first instruction", "at high priority for fifty-one days").

**WRONG in the first draft**, which said "five" at three surfaces (takeaway 4, pull quote 3, body). The banner names six distinct pull requests: #1271, #1273, #1274, #1279, #1282, #1283; "#1274/#1279" is two. All six merged inside the §F1 burst window (`merged_at` 2026-09-14T07:10:33Z through 2026-09-15T05:51:20Z, `pulls/{n}`, re-read 2026-09-24). Corrected to "six" at all three. The post states this. It is the strongest claim in the piece and it is against the author.

---

## B. THE POPULATION FIGURES

### B1—"Ninety pull requests merged into Mergepath between August 23 and September 23"

**SUPPORTED as a floor. WRONG if written as an exact count.**

Method: `github_list_commits(repo="nathanjohnpayne/mergepath", branch="main", page_size=100)` page 1 spans `2026-09-22T19:01:31Z` back to `2026-08-22T22:17:51Z`, so the whole window sits in one page and no pagination was required. 99 commits fall inside `2026-08-23` through `2026-09-23` inclusive. Pull request references were parsed from commit subjects (`Merge pull request #N`, or a trailing `(#N)`) and then validated against the authoritative pull request number set from `github_list_pull_requests(state="all", sort="created", direction="desc", page_size=100)` pages 1–2, covering #767–#1293.

That validation is load-bearing. 91 distinct `(#N)` references appear in subjects, but **five of them reference issue #1130, not a pull request**—`test(ci): exercise tied publisher timestamps (#1130)` and four siblings. #1130 is an open issue and is absent from the pull request set. Dropping it gives 90.

**Counting rule the post must state:** a rebase-merged pull request leaves no reference in its commit subject and would be missed entirely. **90 is a floor.** Two merge styles appear: 88 squash commits and two true merge commits (#1266, #1291).

### B2—"Twelve of the ninety name this failure mode explicitly in their titles. Thirty-four are fail-closed in shape."

**SUPPORTED, with the classification method stated. The post must not give a number between them.**

Strict bucket, titles explicitly naming an absent, truncated, rate-limited, timed-out or quota/budget-exhausted reviewer, check or API response—**12 of 90**: #1084, #1105, #1121, #1170, #1179, #1248, #1263, #1274, #1279, #1285, #1291, #1293.

Loose bucket, also counting fail-closed-shaped titles about stale, unreadable, silent, no-op, veto, refusal or hold behavior—**34 of 90**.

**Bodies were not read for all 90.** Classification is title-only. The true figure is somewhere in 12–34 and the draft explicitly declines to pick one. By conventional-commit prefix the window is overwhelmingly `fix(...)`, with a handful of `feat` (#1084, #1106, #1111, #1119, #1124, #1138, #1169).

### B3—"eleven of the 164 open issues in the repository are about a rate limit, a quota, or a timeout being mistaken for a verdict"

**SUPPORTED as a floor.**

Open issue total **164**: `github_list_issues(state="open", page_size=100)`, page 1 returns 100 with `has_more: true`, page 2 returns 64 with `has_more: false`.

The eleven, by title match: #1305, #1245, #1223, #1186, #1185, #1130, #962, #961, #907, #826, #722. Two more are arguable on a looser reading of budget-as-quota (#816, #813), giving 11 strict and 13 loose.

**WRONG in the first draft as a characterization of all eleven** ("being mistaken for a verdict"). Titles re-read 2026-09-24: #962 is "A correct rate-limit block should not surface as a red failure check", which is the post's own counter-case (§E1), and #826 is a topology proposal (§E2). Neither is a misreading. The post now says the eleven are "about how the pipeline handles a rate limit, a quota, a budget, or a timeout. Nine are defects. The other two, #962 and #826, are the controls above." The downstream surfaces ("eleven open instances", the closing "eleven more waiting", the description's "eleven open issues still name instances") now say nine defects. The age statistics (oldest #722, median #1130) are computed over all eleven title matches and are stated that way. Both controls sit mid-table, so dropping them would not change the oldest; the median over the nine is 19 days (#1186 and #1185 tie), which the post does not cite.

Matching is **title-only**; there is no issue full-text search in this tool set. An issue whose body discusses a rate limit under a title that does not is uncounted. **11 is a floor.**

### B4—ages of the eleven

**SUPPORTED.** Source: `github_list_issues(state="open", sort="created", direction="asc", page_size=100)` pages 1–2 → `issues[].created_at`, cross-checked for #962, #826, #722 against their individual `github_get_issue` calls, which return identical values.

| Issue | created_at (UTC) | Age at 2026-09-23 |
|---|---|---:|
| 1305 | 2026-09-23T15:37:29Z | 0 |
| 1245 | 2026-09-13T02:00:28Z | 10 |
| 1223 | 2026-09-11T13:17:36Z | 12 |
| 1186 | 2026-09-04T16:31:49Z | 19 |
| 1185 | 2026-09-04T16:21:43Z | 19 |
| 1130 | 2026-08-28T03:03:22Z | 26 |
| 962 | 2026-08-13T01:52:07Z | 41 |
| 961 | 2026-08-13T01:52:01Z | 41 |
| 907 | 2026-08-05T00:46:39Z | 49 |
| 826 | 2026-07-30T21:19:29Z | 55 |
| 722 | 2026-07-07T01:24:08Z | 78 |

Counting rule: age is the whole-day, date-to-date difference from the `created_at` date to 2026-09-23. **Oldest #722 at 78 days. Median, the sixth of eleven sorted, is #1130 at 26 days.** All eleven are `open`; there are no exceptions to check.

**WRONG in an earlier draft:** the sentence "Some of them are a year old." No issue in the set exceeds 78 days. Corrected to "the oldest is 78 days old," which is what the table supports.

### B5—"#961 and #962 were filed six seconds apart"

**SUPPORTED.** `2026-08-13T01:52:01Z` and `2026-08-13T01:52:07Z` respectively (`issues[].created_at`). Both are splits from #825, which #962's title states in full: "(split from #825 option 4)". The post uses this as mechanical evidence that the enumeration is a decomposition of one filing rather than two independent discoveries. That reading is supported by the titles themselves and needs no inference.

### B6—"#1305 was filed today"

**SUPPORTED as of 2026-09-23; corrected 2026-09-24.** Created `2026-09-23T15:37:29Z`, title "Phase 4b barrier treats a cap-exhausted Codex arm as a self-clearing wait," and `issues[].labels` was **empty** on 2026-09-23. "Today" was replaced with "on September 23" and "carries no labels yet" with "carried no labels that day," so neither depends on the publish date.

---

## C. THE MISSING-ABSTRACTION ARGUMENT

### C1—#878 already proposes the general fix

**SUPPORTED.** Verbatim from `.metadata.body`:

> "They are not independent defects. They are instances of one property: **CodeRabbit's review state is inferred by grepping a rendered vendor surface, and that surface is neither stable nor machine-specified.**"

> "A classification that rests on **machine-specified signals**—the per-SHA StatusContext including its `description`, review-object identity and timestamps, and the vendor's own machine tags—with rendered prose used only where no machine signal exists, and with every rung of the ladder implemented once and consumed by both the advisory waiter and the required gate."

Acceptance criterion 1: "A written contract (extending `specs/coderabbit_review_sensing.md`) enumerating each observable signal, its source, and what it is permitted to prove—separating *the review ran* from *the review found nothing*."

Acceptance criterion 2: "One implementation of that contract, consumed by `scripts/coderabbit-wait.sh` and `scripts/coderabbit-severity-gate.sh` alike. No predicate exists in two copies (closes the class behind #895 and #938)."

The issue also states: "The 2026-09-03 audit found **39 of 138 retained issues** in `area:review-sensing`." That figure is **the issue's own claim**, quoted here as what the issue says. It was not independently re-derived from the API in this pass and the post must attribute it that way or not use it.

### C2—#878's enumeration of the false-clearance cluster

**SUPPORTED as quotation.** #878 names #940 (cleared on a head whose StatusContext read `success | Review rate limited`, "with no review object at all"), #956 ("cleared in one second while CodeRabbit was auto-paused"), #1034, #1037 ("a confident zero on a head carrying live blocking findings"), #955, and describes #945 as a parser that "produced a defect in every review round since it was introduced, each one created by the previous round's fix."

That last clause is the strongest single sentence available for the post's convergence argument and should be quoted rather than paraphrased.

### C3—#940, the opening example

**SUPPORTED.** #940 is `closed`. The behavior: polling returned `status: cleared` on a head whose StatusContext read `success | Review rate limited` with no review object attached. The post's rendering of this—"the word `success` was in the payload, so the payload was read as success"—is an interpretation of the mechanism, not a quotation, and the draft does not present it as one.

---

## D. PER-PULL-REQUEST ROWS

All diff figures: `github_get_pull_request_diff(pull_number=N, max_patch_length=0, page_size=100)` → `total_additions` / `total_deletions` / `total_files`. All round counts: `github_get_pull_request(pull_number=N)` → count of `timeline[]` entries with `event_type=="reviewed"`, all pages read unless the row says otherwise.

| PR | Additions/deletions | Files | Rounds | Merge timestamp | Source of timestamp |
|---|---:|---:|---:|---|---|
| #1179 | +1,298 / −69 | 18 | **≥15** | 2026-09-04T14:42:28Z | timeline `merged` event |
| #1274 | +206 / −56 | 6 | 3 | 2026-09-14T09:22:48Z | timeline `merged` event |
| #1279 | +183 / −36 | 5 | 1 | 2026-09-15T03:17:43Z | timeline `merged` event |
| #1282 | +104 / −1 | 5 | 1 | 2026-09-15T04:54:18Z | timeline `merged` event |
| #1283 | +105 / −4 | 3 | 1 | 2026-09-15T05:51:20Z | timeline `merged` event |
| #1248 | +68 / −1 | 2 | 1 | 2026-09-13T05:15:22Z | timeline `merged` event |
| #1263 | +45 / −1 | 3 | 2 | 2026-09-14T03:20:29Z | **merge commit `date`** |
| #1293 | +573 / −19 | 7 | 15 | 2026-09-22T18:06:20Z | timeline `merged` event |
| #1291 | +308 / −9 | 9 | 6 | 2026-09-22T19:01:32Z | timeline `merged` event |
| #1278 | +89 / −2 | 5 | 1 | 2026-09-15T02:52:18Z | timeline `merged` event |
| #1169 | +15,436 / −706 | 50 | 4 | 2026-09-11T03:45:16Z | **merge commit `date`** |
| #1232 | +163 / −4 | 6 | 4 | **never merged** | see §D3 |

### D1—#1179's round and finding counts

**UNPROVABLE as exact figures.** `timeline_has_more` is still `true` at `timeline_page=4`, 120 events read, so pagination was not exhausted. Reviewed events observed: **≥15**. `Actionable comments posted:` values parsed from timeline bodies: `[1,1,2,1]`, so findings **≥5**.

Defensible weaker form, and the one the post uses: **"15 or more rounds."** Do not write "15 rounds" flat.

### D2—#1263 and #1169 merge timestamps

**UNPROVABLE from the timeline; SUPPORTED from the commit.** #1169's timeline carries **no `merged` event** even with pagination exhausted (page 2, `timeline_has_more` false, 48 events); it has only a `closed` event at `2026-09-11T03:45:16Z`. The squash commit `feat(merge): authorize exact-head native queue integration (#1169)` is dated the same instant, so the merge landed then. #1263's `merged` event is present but its exact second is taken from the merge commit `date` `2026-09-14T03:20:29Z`, against `.metadata.updated_at` of `2026-09-14T03:20:31Z`.

Either row is citable as a merge date. Neither should be cited as a timeline merge event.

### D3—#1232 closed unmerged

**SUPPORTED, and this row corrects an earlier draft.**

`.metadata.state` is `closed` and `.metadata.merged` is **`false`**. Created `2026-09-12T00:59:33Z`, closed `2026-09-12T01:51:04Z`, 51 minutes 31 seconds later. No `merged` event on the timeline. Independently corroborated by the absence of any `(#1232)` commit on `main` in `github_list_commits`. It ran 4 review rounds and drew 2 findings (`Actionable comments posted:` values `[1,1]`; timeline complete at 38 events).

**WRONG in the first draft of this post**, which listed #1232 alongside #1234 as shipped work under the heading "split the token budget." It did not ship. The corrected claim appears **only in the body** ("What Did Not Land" and the closing list). The `keyTakeaways` and `description` do not mention #1232 at all; they were checked, and carry no shipped-work claim to correct. The closing list originally said "The largest instance closed unmerged," which transferred #1232's outcome to #1130, an issue that is still open; corrected to "One attempt at half of the largest instance, closed unmerged … with the instance itself still open."

Its own body scoped it honestly: "Refs #1130. Partial: this is the token half, measured and bounded. The event amplification is deliberately not in scope."

### D4—#1291 spawned three open issues

**SUPPORTED.** #1301, #1302 and #1303 are recorded as post-review issues arising from #1291. Note that this is a **floor** per the timeline pagination limit in the header, and the post does not write "three and only three."

### D5—#1130, the largest instance

**SUPPORTED.** `open`, `priority:high`, created `2026-08-28T03:03:22Z`. Body: "codex-p1-gate runs on the App installation budget (1,000/hr/repo), so an exhausted GITHUB_TOKEN deadlocks every open PR" and "every open PR in the repository becomes unmergeable regardless of its own merits."

### D6—#1248 and its issue

**SUPPORTED.** #1247 created `2026-09-13T04:54:39Z`; #1248 created `2026-09-13T04:55:35Z`. The gap is **56 seconds**, not the twenty-one minutes an earlier draft asserted.

**WRONG in the first draft**, which said the issue was "filed twenty-one minutes before the pull request opened." Corrected value: **56 seconds**. The twenty-one minutes is real but belongs to a different interval: #1248 merged `2026-09-13T05:15:22Z` (`pulls/1248 .merged_at`) and #1247 closed `2026-09-13T05:15:23Z` (`issues/1247 .closed_at`), 20 min 44 s after the issue was filed.

**WRONG in the second draft**, a residue of the first correction: "a 68-line pull request closed it the same minute it was filed." The PR *opened* within the minute; it *closed* the issue 21 minutes later. Corrected to "got a 68-line pull request 56 seconds after it was filed and was closed 21 minutes after it was filed." ("After that" read as measured from the PR opening, which is 19 min 48 s.)

**"Zero open truncation issues" / "exactly one" narrowed.** Discovery is title-only (header, limit 3). Open issue titles re-read 2026-09-24 (`issues?state=open`, all pages) match `truncat|3000|3,000|paginat` zero times; the one `cap` hit is #1305, which is quota, not truncation. Post now says "No open issue title mentions truncation" and "the one instance I know of." The corrected figure is materially better for the post's argument, which is that these are small known fixes nobody had a reason to write, so the temptation to keep the rounder wrong number should be noted and resisted.

Issue body, verbatim: "GitHub caps that listing at 3000 entries, and at the cap the inventory may be truncated." Pull request body, verbatim: "both fail closed to \"external review required\", because a possibly-truncated inventory cannot support either verdict."

### D7—#1186 and the watermark

**SUPPORTED.** #1186 is `open`, labels `risk` and `priority:high`. Body: "Wave audit has not advanced its watermark since 2026-07-28: over-budget diffs classify as 'reviewer unavailable' and chain forward, making the next range larger."

Elapsed from `2026-07-28` to #1186's filing on `2026-09-04` is **38 days**. The post says "six weeks," which is 42 days and is **WRONG** as stated. Corrected: **38 days**, or the weaker "five weeks." The draft uses the exact figure.

Further body text, verbatim except for em dash spacing, re-read 2026-09-24: "Every wave since has exited 4, failed open, and chained its un-audited range into the next one—which makes the next range larger and more certain to fail the same way." Measured block in the same body: "un-audited range : 127 commits", "curated diff : 109 files, 2,242,097 bytes", "review budget : 800,000 bytes -> 2.8x over". These are the issue's own measurements, attributed as such in the post.

**UNPROVABLE and removed:** "a blocked pipeline announces itself within the hour" (no evidence for any latency) and "succeeded every time / every run" (the issue says every wave *exited 4 and failed open*, which is not success). Replaced at takeaway 2, pull quote 2 and the body with the issue's own "failed open" and "a block gets noticed because somebody cannot merge; nothing about this one stopped anyone." The closing list's "reported reviewer unavailability for thirty-eight days while auditing nothing" became "failed open on every wave for thirty-eight days behind a transient-sounding classification."

### D8—#1293 and #813

**SUPPORTED.** #1293 body: "Stop additional Codex review requests after the PR consumes `codex.max_review_rounds` (default 10). Count distinct exact commands from the configured author across paginated issue-comment history before every new write, including acknowledgement retries." It implements #813, an **open** epic at `priority:high`: "Create a bounded review lane: order providers, count cycles, and stop discretionary churn."

### D9—the behavior column of the opening table

**SUPPORTED, from each pull request's own body** (`pulls/{n}.body`, first summary lines, re-read 2026-09-24). Each table cell paraphrases the sentence quoted here:

- **#1179**: "`p4b_barrier_class_coderabbit` mapped every `--probe` rc 7 that was not head-pinned-and-corroborated to `not-yet`, and `probe.observed: \"rate_limit\"` was one of them. The barrier then returned `pending` and waited out `coderabbit.max_wait_seconds` on a state nothing in the run could change."
- **#1274**: "A walkthrough refreshed by a push could clear CodeRabbit polling even after the same run rejected the head's pending or 'Review rate limited' status."
- **#1279**: "When CodeRabbit reports `success / Review rate limited` without a rate-limit comment, the waiter reaches its ordinary timeout and never invokes the existing Codex fallback."
- **#1282**: "A CodeRabbit summary edited after a push can still clear the new head when its complete `final_review_risk` block names an older commit."
- **#1283**: "An aged CodeRabbit summary containing a blocking finding can bypass the existing pending-status refusal … The marker-selected summary takes the completed-summary escape before the trusted status is evaluated."
- **#1248, #1263, #1293**: sourced in §D6, §D7 (via #1186), and §D8 respectively.

These are the authors' descriptions of the defect each PR fixes. Most were written by coding agents (see the post's provenance sidebar), so they record what the pipeline's own authors said, not independently reproduced behavior.

---

## E. THE CONTROLS

The post's thesis is that fail-open defaults are the dangerous class. A post that only stacks up fail-open defects has not tested that. These three rows are the controls.

### E1—#962, the counter-case: fail-closed has its own cost

**SUPPORTED, and this is the strongest control available.**

Title: "A correct rate-limit block should not surface as a red failure check (split from #825 option 4)". `open`, created `2026-08-13T01:52:07Z`, labels `post-review`, `observation`, `size:M`, `type:hardening`, `priority:normal`, `area:review-sensing`, `area:merge-gating`.

Verbatim from `.metadata.body`:

> "When the auto-merge rate-limit gate blocks, it is usually *right* to block—neither bot has read the diff, so the PR needs a human."

> "A break-glass prompt is exactly the wrong affordance for a routine provider outage: it trains the reflex on a case where nothing is actually wrong with the code."

> "Branch protection treats a required check as satisfied on `neutral`, so if this check is required, downgrading the conclusion would *release* the merge rather than merely recolouring it."

That third sentence is the one the post must carry, because it shows the obvious remedy for the counter-case reopening the original defect. The issue's own summary row states the distinction outright: "**#962** (this issue) | auto-merge rate-limit gate | A **correct block** presented too alarmingly. The gate means what it says; only the alarm level is wrong."

Referencing pull requests observed on timeline page 1: #960, #1084, #1189, #1196. **Floor, not a complete set.**

### E2—#826, the proposal that says the topology is wrong

**SUPPORTED.** Title: "Proposal: rebalance the review topology—Codex primary, CodeRabbit deliberate, rate limits never blocking". `open`, created `2026-07-30T21:19:29Z`, labels include `type:decision` and `status:blocked`.

Verbatim: "CodeRabbit's Fair Usage allowance is structurally too small for this fleet, and the review machinery currently spends it on the least valuable heads while making it load-bearing for merge." And: "The budget is exhausted by the system reviewing its own churn."

**UNPROVABLE, quoted as the issue's own claim only:** the allowance of 5 pull request reviews per hour, 9 consumers sharing it, the `coderabbit.max_wait_seconds` ceiling of 1245s, and observed Fair Usage windows of 2109s and 2398s. These are attributed inside the issue body to `docs/agents/coderabbit-audit.md` and two captured runs. They were **not** independently re-derived here. If the post uses any of them it must write "the issue records" and not assert them directly. The current draft uses only "the budget is exhausted by the system reviewing its own churn," as a quotation.

### E3—#722, the oldest instance

**SUPPORTED.** `open`, created `2026-07-07T01:24:08Z`, labels `bug`, `automation`, `priority:high`. Verbatim: "The poll just keeps waiting for the full `review_timeout_seconds` window (840s default) and then exits `4` (FALLBACK_REQUIRED)—indistinguishable from a genuinely slow/no-op review." And: "…but that detection lives **only** in the retrospective audit script, never in the live gate/trigger path."

**UNPROVABLE, the issue's own claim:** "17/400 historical triggers drew a rate-limit marker and 75/400 drew a not-connected marker." Self-cited to `docs/audits/codex-latency-2026-07.md`, not re-derived. Attribute or omit.

### E4—the contrast set: substantial merged work in the window that is not this defect

**SUPPORTED.** Three merged pull requests over 100 added lines that are not about reviewer absence, quota, timeout or truncation:

- **#1250**, "fix(931): recover the policy gates by nudging their canonical producer," +1,432 / −10 across 8 files, merge commit on `main` `2026-09-13T20:24:45Z` (sha `a0c427a4`). Body: "An operator can cause `.github/workflows/pr-review-policy.yml` to re-evaluate one open PR, so that its two required contexts report on the current head."
- **#1264**, "fix: acknowledge accounted Phase 4b approval bodies," +344 / −15 across 11 files, merge commit `2026-09-14T05:20:57Z` (sha `c38161d0`). Body: "An automated Phase 4b approval can immediately create an unaccounted review-body finding even after its optional findings have been filed."
- **#1106**, "feat(accounting): track github-advanced-security code-scanning findings," +640 / −21 across 20 files, `.metadata.merged` true. Body: "a CodeQL finding could ride through repeated \"fully accounted\" review rounds unread." Merged `2026-08-27T04:14:59Z` (`pulls/1106 .merged_at`; squash commit `215176a0`, subject "feat(accounting): track github-advanced-security code-scanning findings (#1101) (#1106)", re-read 2026-09-24), inside the window. **WRONG in the first draft of this ledger**, which called the timestamp UNPROVABLE because the squash commit "falls outside the read page." That contradicted §B1, whose single page covers the whole window, and §B2, which lists #1106 among the window's `feat` commits.

Rejected candidates, recorded so a later pass does not re-check them: **#1119** is 29 added lines and fails the size bar. **#1228** has `.metadata.merged` false and is closed unmerged—**do not cite it as shipped work.** #1124 and #1182 are merged but their merge dates were not established.

**Note what the contrast set actually shows, because it cuts against a lazier version of the post:** #1264 and #1106 are themselves about a finding riding through unread. The contrast set is thinner than the thesis wants. The honest reading, which the draft carries, is that correctness repair on review-sensing and merge-gating logic runs through the whole window, and that the 90 cannot be split cleanly into new capability and quota defense. No share is claimed (§B2 supports only the 12–34 title range).

### E5—#1169, the capability counterpoint

**SUPPORTED, against all 90.** +15,436 / −706 across 50 files. `pulls/{n}` `.additions` was read for every PR number parsed from the window's commit subjects on 2026-09-24 (91 numbers: #1130 is an issue, and the other 90 all have `.merged` true). To recheck, re-run the §B1 subject parse and read `pulls/{n}.additions` for each. The next largest are #1099 at +5,868, #1176 at +1,678, and #1121 at +1,657, so "the biggest thing merged all month" holds by additions. It merged at `2026-09-11T03:45:16Z` per its squash commit. Body: "Add the fail-closed authorization boundary for a singleton native GitHub merge queue, using exact-SHA required workflows from an organization-owned public policy source."

Its issue #1058 is **still open**, labels `bug`, `enhancement`, `automation`, `size:L`, `type:feature`, `priority:normal`, `area:merge-gating`, `status:blocked`. Body: "Nothing keeps an open PR in sync with `main`." And: "This repo's merge safety is **head-SHA-pinned by construction**, and a merge queue evaluates required checks on a different SHA."

The detail worth the post's space: #1058 records `required_status_checks.strict` as "**unknown**—`GET /branches/main/protection` returns `403 Resource not accessible by integration`." A gate whose own configuration could not be read.

**WRONG in the first draft, as an inference.** The draft called this "the same defect class as the post's thesis, appearing inside the one pull request offered as the counterexample." It is the opposite: an unreadable value recorded as `unknown`, with its reason, is exactly the explicit "no answer" representation the post argues is missing. It is also in issue #1058's body, not in pull request #1169. Corrected: the post now presents it as the pattern done by hand in a Markdown table, and the subhead changed from "has the defect inside it" to "shows the fix, done by hand."

---

## F. THE BURST

### F1—"21 commits in 32 hours and 41 minutes"

**SUPPORTED with a counting rule the post must state.**

Source: `github_list_commits(branch="main", page_size=100)` → `[].date`, `[].message`. Commits on `main` between `2026-09-14T00:00:00Z` and `2026-09-15T23:59:59Z`: **21**. Earliest `2026-09-14T03:20:29Z` (#1263), latest `2026-09-15T12:01:26Z` (#1287). Elapsed **32 h 40 m 57 s**.

**Counting rule.** Two of the 21 rows are the same pull request: #1266 landed as a merge commit (`2026-09-14T05:47:03Z`) plus its branch commit (committer date `2026-09-14T05:22:40Z`; author date `04:57:43Z`). On a strict distinct-changes count the window holds **20**, not 21. The post uses "twenty distinct changes across 21 commits" and states the rule in the sidebar.

Coverage is complete: the next-older commit on the same page is `2026-09-13T20:24:45Z`, so nothing in the window fell past a page boundary.

**WRONG in the first draft of this ledger: the list is monotonic by committer date.** The earlier note said row 18 at `04:57:43Z` appeared after row 17 at `05:20:57Z`; `04:57:43Z` is the #1266 branch commit's **author** date (`.commit.author.date`), while every other row, and `github_list_commits` ordering, uses the committer date. By `.commit.committer.date` (`05:22:40Z`) the list is in order. Re-read 2026-09-24 via `repos/.../commits?sha=main&since=2026-09-14T04:00:00Z&until=2026-09-14T06:00:00Z`. The post's block says "committer-date order." Cite timestamps by named field.

### F2—what the burst contains

**WRONG in the first draft**, which claimed "sixteen of the twenty" from a list that included #1264 (which §E4 and the post use as a *contrast* case, so it cannot also be in-family) and #1286 (a test-fixture quoting fix). The first draft's code block also showed only 17 of the 21 subject lines, omitting #1265, both #1266 commits and #1286 (the off-theme ones) while introducing the block as "the subject lines, in order." The block now shows all 21, re-read 2026-09-24 via `repos/.../commits?since=2026-09-14T00:00:00Z&until=2026-09-15T23:59:59Z`.

Reclassified by title **and** the first lines of each pull request body (`pulls/{n}.body`, read 2026-09-24):

- **In family, 8:** #1263, #1271 ("A failed CodeRabbit marker extractor currently returns successful absence"), #1273 (acknowledgement replies producing `cleared` with live findings), #1274, #1279, #1282, #1283, #1285.
- **Wave-audit follow-ups, 2:** #1270 (retain the validated dry-run verdict, #1186), #1272 (show watermark annotation age, #1186 acceptance criterion 4).
- **Arguable, 3:** #1280 (distinguish no request from an awaited one), #1284 and #1287 (a quoted or prose `@codex review` mistaken for the real request).
- **Unrelated, 7:** #1262 (concurrency expression), #1264 (contrast), #1265 (ADR docs), #1266 (Five Across admin audit), #1267 (Unicode list parsing), #1278 (human-hold labels), #1286 (test fixture paths).

8 + 2 + 3 + 7 = 20. This is a judgment classification from summaries, not full bodies, and the post states the buckets rather than one number.

**Branch names, SUPPORTED.** "#1271 and #1283 carry `878` in their branch names": `GET /repos/nathanjohnpayne/mergepath/pulls/1271` → `.head.ref` is `codex/issue-878-tier-read-errors`; `pulls/1283` → `codex/878-aged-summary-status-veto` (read 2026-09-24). The other four #878-banner PRs carry their own issue numbers instead: #1273 `codex/1037-count-review-runs`, #1274 `codex/940-veto-fallback-status`, #1279 `codex/issue-940-timeout-failover`, #1282 `codex/1034-risk-marker-refusal`.

---

## G. PRE-PUBLISH CHECKLIST

Per `docs/agents/blog-revision-process.md`, these must be re-checked before this post ships, and each has a specific known failure mode:

1. **"Today" in §B6.** Done 2026-09-24; re-grep for any new relative date before publishing.
2. **Every corrected figure at every surface.** Recheck every row marked **WRONG** or **UNPROVABLE** in §A–§F (grep this file for both words), plus every entry in §H. Do not work from a summary list: an earlier version of this item named three corrections while the ledger held more than ten. Grep the body, `description`, `seoDescription`, all four `keyTakeaways`, all three `pullquotes`, and both `sidebar` entries for each claim **in any wording**, not for the sentence that was edited.
3. **Quantifier scope.** The draft contains universals about "every call site" and "no representation." §A1 is the defensible weaker form. Re-read both against it.
4. **Attribution of issue-internal numbers.** §E2 and §E3 carry figures that are the issues' own claims. Any use must say so.
5. **Floors stated as floors.** 90 merged pull requests, 11 open issues, and every referencing-PR list are floors per the header's three tool limits. The word "only" must not appear in front of any of them.
6. **Brevity pass runs separately and after this.** Do not combine it with a factual pass. `scripts/verify-brevity.py BEFORE AFTER` does not catch swapped values, so read any passage that pairs a number with a pull request by hand.

---

## H. SECOND-PASS CORRECTIONS WITH NO EARLIER ROW (2026-09-24)

These claims had no row above. Each is recorded here with its source, not as a superseding appendix: none of them contradicts an earlier row.

- **Mergepath's review guarantees, scoped.** The first draft said review ran "under a separate identity so no agent approves the pull request it wrote, an external reviewer holding a merge veto." Under `REVIEW_POLICY.md`, an under-threshold PR can be approved by the authoring agent's own reviewer identity, and the external-review veto applies only to Phase 4 PRs. Now reads "review under a separate reviewer identity, a second agent holding a merge veto on larger changes."
- **#878 acceptance criterion 1, quoted in full.** The first draft dropped the parenthetical "(extending `specs/coderabbit_review_sensing.md`)" from inside a quotation, while the sidebar promises verbatim quotes. Restored. The first draft also called the distinction "the entire post in eleven words"; "separating *the review ran* from *the review found nothing*" is nine words. The word count was removed.
- **"Eleven grammars."** The post listed seven forms under "eleven grammars," implying a one-to-one mapping to the eleven issues that was never established. Now reads "many grammars."
- **"The largest category of a month's merged work."** Not supported by title-only classification (§B2 gives a range of 12–34, with no counts for competing categories). Now reads "somewhere between 12 and 34 of 90 merged pull requests, by title alone."
- **"Eleven of the 164 open issues."** Now "At least eleven … matching on titles alone," per §B3.
- **Headline counts.** The title is reused on the index card, RSS, and share cards without the sidebar's counting rules, so the floors are marked there too: "90+ Merged Pull Requests, 11+ Open Issues." This reverses an earlier decision to leave the title unqualified.
- **"Eleven more waiting, each one a small pull request."** A universal over a title-only population that includes #826 (a blocked topology decision) and #1130 (repository-scale). Now "at least eleven … some of them small …, and two of them, #826 and #1130, not small at all."
- **"Producing defects in review rounds, each one created by the previous round's fix."** This transferred #945's causal history (§C2) to the whole burst, which §F establishes only as subjects and buckets. Now "fixing the family one surface at a time, which is the pattern that sentence describes."
- **#1291 "handles one half."** `pulls/1291.body`, re-read 2026-09-24: "This reduces API demand without changing credentials, completion evaluation or the event subscription … It removes no event deliveries or job executions." So it mitigates the event side but does not remove it, and the post's "The event amplification is still not in scope" contradicted its own description. Now: "the token half never landed, the event half is cheaper but not removed, and #1130 is still open."
- **"The bulk of ninety merged pull requests."** Same defect as "largest category," surviving in the contrast-set paragraph. Now reads "correctness repair on review-sensing and merge-gating logic runs through the whole window," with no share claimed.
- **Sidebar, merge-timestamp provenance.** The sidebar said #1263 had no timeline merge event, contradicting §D2. Now separates #1169 (no event) from #1263 (event present; seconds taken from the commit).
- **Sidebar, agent authorship.** The sidebar promised the text would say "where it matters" which quoted bodies were written by agents, and no passage did. Replaced with a blanket statement: most bodies were written by coding agents under the author's account or a bot identity, so they are the pipeline's own record, not independent testimony. Em dash spacing inside quotes is normalized to house style, and the sidebar now says so.
