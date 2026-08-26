# Facts ledger—#739 `agent-approval-workflow-genesis-of-mergepath`

Post source: `src/content/blog/agent-approval-workflow-genesis-of-mergepath.md`. Published `2026-04-16`. **Pre-revision baselines: 3,993 body words, 4,418 whole-file** (the epic's figure, which counts frontmatter). Both are baselines, not current counts; §J carries the revised measurements. Evidence repo: `nathanjohnpayne/mergepath`. Bare `#NNN` in this ledger means **mergepath** unless qualified. Cross-repo items are written in full. Shared cache: `plans/759/refs.json`.

Verdicts: **SUPPORTED** · **WRONG** (corrected value given) · **UNPROVABLE** (defensible weaker form given).

**Method note carried from #740.** An issue body is evidence of what someone believed at the time, not of what happened. Where a claim is mechanically checkable, it was checked against the mechanism. Three claims in the #740 audit failed that test; the ones that fail it here are §B1 (a PR count taken from memory rather than the API), §B4 (a check count), §B6 (a taxonomy that did not sum), and §E1 and §E4 (two timing figures).

---

## A. The clock—the largest error cluster in this post

### A1—"roughly six weeks of daily use across six production repositories to arrive at the current architecture"

> L52

**WRONG.** The mergepath repository was **created `2026-03-24T19:08:51Z`**, and its first pull request opened `2026-03-25T20:39:34Z`. The post is dated `2026-04-16`. That is **22 days from repo creation, 21 from the first PR—about three weeks, not six.** Corrected value: roughly three weeks of daily use. If the intended clock is agent-assisted development generally rather than mergepath specifically, that clock starts at the nathanpaynedotcom repo's first commit, `2026-02-22`, and gives 7.6 weeks—but then it is not "to arrive at the current architecture" of a repo that did not exist for the first four of them. Pick one clock and name it. Source: `gh api repos/nathanjohnpayne/mergepath` → `.created_at`; `gh api 'repos/nathanjohnpayne/mergepath/pulls?state=all&sort=created&direction=asc'` → first element `.created_at`.

### A2—"Over seven weeks of daily use across nine repositories"

> "The numbers" section

**WRONG, and internally inconsistent with A1.** The same post says six weeks in the lede and seven in the numbers. Neither matches the repo: three weeks. "Nine repositories" is also a **今日** figure, not an April one—see §C3. Corrected value: state one interval, tied to a named start event, and scope the repo count to the date. Source: as A1.

### A3—"The lessons cost me six weeks."

> Closing line

**WRONG.** Same clock error as A1, in the post's final sentence. Source: as A1.

### A4—Post date and the architecture snapshot

> `date: 2026-04-16`

**SUPPORTED as a date**, and it is the boundary the whole post needs. Every count below is an April-16 figure; several have moved a long way since. The post never states its own snapshot date in the body, which is what #739's acceptance criteria ask for.

---

## B. The headline counts

### B1—"100+ PRs opened, reviewed, and merged on the template repo alone"

> "The numbers" section

**WRONG, and by a wide margin.** At the post's date the mergepath repository had **32 pull requests in total**, of which **30 were merged**. The repo did not pass 100 PRs until well after publication; it stands at 459 today. Corrected value: **32 pull requests opened and 30 merged** on the template repo as of 2026-04-16. Source: `gh api --paginate 'repos/nathanjohnpayne/mergepath/pulls?state=all&per_page=100&sort=created&direction=asc'`, filtered `created_at < "2026-04-17"` → 32 rows, 30 with a non-null `merged_at`. Total-ever count from the `Link: rel="last"` header at `per_page=1` → 459.

### B2—"46 project items tracked across 5 phases in Project #2"

**SUPPORTED.** Project #2 is titled "External Review (Phase 4 Review)—Codex-in-GitHub external review automation" and holds exactly **46** items. Source: `gh api graphql` → `user(login:"nathanjohnpayne"){projectV2(number:2){items{totalCount}}}` → 46.

### B3—"roughly 30 PRs" for the Codex project

> L~128

**WRONG.** Neither §B1 nor §B2 supports it: B1 counts the whole repository's PRs, and B2 counts project items without separating types. Queried directly, Project #2's 46 items break down as **37 issues and 9 pull requests**, all 9 created before the snapshot. The project tracked nine PRs, not thirty. The earlier gloss in this row—that the project "*was* substantially the whole repo's activity"—was the same unsupported inference dressed up as a stronger claim, and is withdrawn: nine of the repository's 32 PRs is a third, not substantially all. Corrected value: 46 tracked items across 5 phases, being 37 issues and 9 pull requests. Source: `gh api graphql` → `user(login:"nathanjohnpayne"){projectV2(number:2){items(first:100){nodes{type ...}}}}`, grouped by `.type` → `{ISSUE: 37, PULL_REQUEST: 9}`; all 9 PR items have `createdAt < 2026-04-17`.

### B4—"Roughly two dozen fail-closed CI checks in `scripts/ci/`"

> "What the template actually is"

**WRONG.** At the April-16 tree, `scripts/ci/` contained **seven** check scripts (`check_codex_scripts`, `check_dist_not_modified`, `check_duplicate_docs`, `check_no_forbidden_top_level_dirs`, `check_no_tool_folder_instructions`, `check_required_root_files`, `check_spec_test_alignment`) plus a `README.md`. "Roughly two dozen" matches nothing at either date: counted the same way, the directory holds **66** check scripts today, out of 122 files in total, most of which are not checks. See §K2, where the same units error had survived into the revision. Corrected value: seven fail-closed CI checks as of the post's date. Source: `git -C ~/GitHub/mergepath ls-tree -r --name-only 2429e6bf -- scripts/ci` (the last commit before 2026-04-17).

### B5—"seventeen distinct template bugs"

**SUPPORTED.** Issue #75's headline says "**17 distinct template bugs**" surfaced by Codex on the two propagation PRs. Source: `gh api repos/nathanjohnpayne/mergepath/issues/75` → `.body`, § Background.

### B6—The 17-bug taxonomy totals 14

> "Three were privilege-escalation vectors… Four were findings-semantics bugs… Five were tokenizer bugs… Two were wholesale-copy regressions."

**WRONG—3 + 4 + 5 + 2 = 14, and two categories are missing.** Issue #75's catalog has six categories covering the 17 back-ported bugs:

| Category | Count | Bugs |
|---|---:|---|
| Privilege escalation | 3 | 1–3 |
| Findings semantics | 4 | 4–7 |
| Tokenizer / hook parser | 5 | 8–12 |
| **Hook command grammar** | **1** | 13 |
| Config wholesale-copy regressions | 2 | 14–15 |
| **Timing / clock** | **2** | 16–17 |
| **Total back-ported** | **17** | |

The post omits the hook-command-grammar bug and the two timing/clock bugs. Corrected value: add "one hook command-grammar bug" and "two timing and clock bugs" to reach 17. Source: `gh api repos/nathanjohnpayne/mergepath/issues/75` → `.body`, § Bug catalog.

### B7—"After fixing all seventeen bugs via a consolidated back-port PR"

> L~200

**WRONG in a way worth keeping.** Issue #75's catalog runs to **eighteen** numbered items. The eighteenth—"Gate (a) blocks on non-required checks", a **P1**—is marked in the issue itself as "**NOT YET FIXED on either PR**", with a round-8 follow-up noting the fallback behaviour is also wrong. So seventeen were back-ported and one known P1 was knowingly carried forward. Corrected value: seventeen were fixed; an eighteenth, a P1 about gate (a) treating non-required checks as blocking, was catalogued and deliberately left open. That is a better ending for the section than a clean sweep—it is the same "where the system still leaked" the issue asks for. Source: same, § "Gate (a) over-strict (1 bug—P1)".

---

## C. Enforcement-boundary claims

### C1—"force any AI agent working in it—and the human running it—down the same path" / "Making the wrong action impossible does."

> L50, L52

**UNPROVABLE as stated; the controls have different and weaker boundaries.** They are not one mechanism and they do not all bind the same actors:

| Control | Where it runs | What it actually binds |
|---|---|---|
| `gh-pr-guard.sh` PR-creation guard | **Client-side**, a Claude Code PreToolUse hook | Only agents running in a session that loads this hook. A different tool, a raw `curl` to the API, or the GitHub web UI bypasses it entirely. |
| Branch protection | **GitHub server** | Everyone, including the human—the strongest boundary here. |
| Required status checks / Label Gate | **GitHub server** | Everyone, subject to admin override. |
| `scripts/ci/` checks | **CI** | Blocks the merge button, not the push. |
| Reviewer identities | **Convention plus `block-self-approval`** | The job blocks self-approval; the author/reviewer split itself is convention. |
| `BREAK_GLASS_ADMIN` / `--admin` | **Client-side hook, then server** | Explicitly designed to be bypassable by the human. |

Defensible form: name the boundary per control, as #739's acceptance criteria require, and say that the *combination* raises the cost of the wrong action rather than making it impossible. The break-glass path exists precisely so it is not impossible. Source: `scripts/hooks/gh-pr-guard.sh` (a PreToolUse hook, matched against the command string); `.github/review-policy.yml`; `.github/workflows/pr-review-policy.yml`.

**Live corroboration from this very run.** Both boundaries behaved exactly as the table says while auditing #740: the client-side hook blocked a `gh pr create` whose body had `**Authoring-Agent:** claude` in bold (its check is `^Authoring-Agent:`, a line-anchored match), and the merge required **two** separate break-glass variables—`BREAK_GLASS_ADMIN=1` *and* `BREAK_GLASS_MERGE_STATE=1`—which the post does not mention. The post names only the first.

### C2—The `external_review_threshold: 300` block and its paths

> L108–118

**SUPPORTED as quoted**, and the omission is meaningful: the quoted `external_review_paths` list has no `functions/**`, which is exactly bug 14 in issue #75—downstream repos relied on it and wholesale-copying the template silently dropped it. Source: quoted config matches; issue #75 bug 14.

### C3—"it now runs across nine" / "nine repositories"

> L52, "The numbers"

**SUPPORTED today, WRONG for the post's date.** `.mergepath-sync.yml` lists nine consumers today: matchline, nathanpaynedotcom, tadlockpsychiatry, device-source-of-truth, gaycruisebingo, friends-and-family-billing, device-platform-reporting, overridebroadway, swipewatch. In April 2026 the propagation set was **six** (sub-issues #45–#50), and three of today's nine—matchline, tadlockpsychiatry, gaycruisebingo—did not exist in that set. Corrected value: six downstream repositories as of April 2026; nine today. The post needs the date boundary #739 asks for. Source: `~/GitHub/mergepath/.mergepath-sync.yml`; `gh api repos/nathanjohnpayne/mergepath/issues/{45..50}` → titles.

### C4—Phase 4b described as "a manual CLI fallback"

> "What the template actually is"

**WRONG as a present-tense claim; correct as of April 2026.** `phase_4b_automation` now ships `enabled: true, mode: local`, and `scripts/phase-4b-review.sh` runs a reviewer CLI headlessly and posts the verdict under the reviewer identity. The manual handoff is now the fallback *from* the automated leg, not the leg itself. Defensible form: keep the April description and add the dated boundary plus a short current-state postscript. This is the single clearest case in the post for the "as of April 16, 2026" framing #739 requires. Source: `.github/review-policy.yml` → `phase_4b_automation`; `scripts/phase-4b-review.sh`.

---

## D. The review-round artifacts

### D1—PR #66: "seven rounds… Each round caught a new parser bug"

> "The hook: seven rounds of parser bugs"

**SUPPORTED on the count, WRONG on "each round".** `nathanpayne-codex` posted exactly **seven `CHANGES_REQUESTED` reviews** on #66. But the PR carries **six** `fix(hook)` commits, and the post's own table itemizes six bugs under round numbers 2–7. Seven blocking rounds produced six distinct parser fixes.

There is also an event the post omits and should not: **`nathanpayne-codex` posted an `APPROVED` at `15:24:20Z` and then a `CHANGES_REQUESTED` at `15:25:41Z`—81 seconds later.** The reviewer approved, then immediately un-approved and kept going for four more rounds.

Full sequence, interleaved:

| Time (UTC) | Event |
|---|---|
| 12:40:58 / 12:41:14 | initial commits `3016e89`, `b7e4bf7` |
| 12:44:40 | `nathanpayne-claude` APPROVED |
| 12:46:14 | Codex GitHub App COMMENTED |
| 14:07:28 | codex CR 1 |
| 14:12:31 | fix 1 `3afbc35` (URL and branch selectors) |
| 14:18:18 | codex CR 2 |
| 14:42:38 | fix 2 `c6d9119` (xargs tokenization, `-R` short form) |
| **15:24:20** | **codex APPROVED** |
| **15:25:41** | **codex CR 3—approval retracted after 81s** |
| 15:34:36 | fix 3 `d07f0bf` (global `-R`/`--repo` before subcommand) |
| 15:41:58 | codex CR 4 |
| 15:43:33 | codex CR 5 |
| 15:51:20 | fix 4 `ef93d42` (leading prefix material, inline env) |
| 15:55:32 | codex CR 6 |
| 16:04:56 | fix 5 `c0bff5d` (command-position state machine) |
| 16:10:18 | codex CR 7 |
| 16:23:23 | fix 6 `f6a5df0` (token-based `--admin`) |
| 16:50:51 | codex APPROVED (final) |

Corrected value: seven blocking review rounds producing six distinct parser fixes, with one approval retracted 81 seconds after it was posted. Keep the table; renumber it against the seven rounds or relabel the column "fix". Source: `gh api repos/nathanjohnpayne/mergepath/pulls/66/reviews` and `/commits`.

### D2—PR #65: "Over three rounds of review… `nathanpayne-codex` kept finding edge cases"

**SUPPORTED, narrowly.** `nathanpayne-codex` posted three reviews on #65—two `CHANGES_REQUESTED` (`04:13:25Z`, `04:22:41Z`) and one `APPROVED` (`12:30:45Z`). Three submissions, two of them blocking, and two corresponding fix commits (`ac93f07`, `b8f36ee`). "Three rounds" holds if a round is a review submission; say which. Source: `gh api repos/nathanjohnpayne/mergepath/pulls/65/reviews` and `/commits`.

### D3—Gate (c)'s API limitation and the freshness window

> "the timeline endpoint has a `committed` event… its `created_at` field is `null`"; `reaction_freshness_window_seconds`, default 1800

**SUPPORTED.** The nathanpaynedotcom copy of `.github/review-policy.yml` documents the same finding at length, including the null-`created_at` observation verified against PR #63 and the default of 1800 seconds. Source: `.github/review-policy.yml` → `codex.reaction_freshness_window_seconds` and its comment block.

---

## E. The dry runs

All five ran on `2026-04-15` between 18:01 and 18:19 UTC. PR mapping is **SUPPORTED** and exact—each PR title names its scenario and sub-issue: #71 "dry-run A #40", #72 "dry-run B #41", #73 "dry-run C #42", #74 "dry-run D #43", #70 "dry-run E #44".

### E1—Dry-run A: "Codex 👍 in 147 seconds"

**WRONG, and the mechanism is misdescribed.** PR #71 has **no `@codex review` trigger comment at all**—Codex auto-reviewed on open. The 👍 reaction landed `18:04:23Z` against a PR created `18:02:11Z`: **132 seconds**, not 147, and measured from PR creation rather than from a trigger. Corrected value: Codex reacted 👍 132 seconds after the PR opened, with no trigger posted—which is a *better* illustration of the automation than the trigger-and-wait story, and is also evidence for the auto-review-on-open behaviour the post never mentions. Source: `gh api repos/nathanjohnpayne/mergepath/issues/71/{comments,reactions}` → zero `@codex review` comments; `+1` reaction at `2026-04-15T18:04:23Z`; PR `created_at 18:02:11Z`.

### E2—Dry-run C: the disagreement path

> "Codex re-flagged the same issue with a *stronger* argument… Closed without merging."

**SUPPORTED.** PR #73 carries two `@codex review` triggers (`18:07:42Z`, `18:13:04Z`), two Codex reviews, a rebuttal comment at `18:11:11Z`, a "⚠️ Disagreement escalation per REVIEW_POLICY.md" comment at `18:16:16Z`, and a closing comment at `18:18:13Z`; `merged_at` is null. Source: `gh api repos/nathanjohnpayne/mergepath/issues/73/comments`; `refs.json` → `#73.merged` false.

### E3—Dry-run D: "the runaway scenario… does not naturally occur"

> "This means the 'runaway' scenario… does not naturally occur—Codex's review pattern is 'find everything at once,' not 'one finding per round.'"

**UNPROVABLE from one run, and the repository has since falsified it.** #739's own issue flags the generalisation. The counter-evidence is now abundant and includes this epic: on nathanpaynedotcom PR #787, Codex returned **0, then 4, then 5, then 1, then 7 findings across five rounds on five successive heads**—the definition of one-or-more findings per round rather than everything at once. PR #66 above is a second counterexample: seven blocking rounds, six distinct new bugs. Defensible form: scope it to dry-run D—"in this run Codex returned both P1s in a single review"—and drop the model-wide claim. The `max_review_rounds` guard is not a rarely-fired safety belt; it fires. Source: dry-run D observation stands; counterexamples from `pulls/66/reviews` and nathanpaynedotcom PR #787's five Codex rounds.

### E4—"142–342 seconds average Codex response time per review round"

> "The numbers"

**WRONG as stated, and ambiguous in form—an average is one number, not a range.** Measured across every `@codex review` trigger in the Phase 4a era (mergepath PRs #55–#79), pairing each trigger with the next Codex signal of any kind (comment, review, or reaction):

| Statistic | Value |
|---|---:|
| Observations | 18 |
| Minimum | 7 s |
| Median | 156 s |
| Mean | 189 s |
| Maximum | 703 s |

Full set: 7, 13, 98, 113, 127, 131, 141, 149, 155, 156, 179, 180, 198, 210, 231, 301, 316, 703.

Neither 142 nor 342 is a boundary of this population, and the true spread is far wider in both directions. Corrected value: "median 156 seconds across 18 triggered rounds, range 7–703 seconds", with the population named as #739's acceptance criteria require. Source: reproducible script over `issues/{n}/comments`, `pulls/{n}/reviews`, `issues/{n}/reactions` for n in 55..79, pairing each `@codex review` comment with the earliest subsequent Codex signal; zero-second self-matches excluded.

---

### E5—Dry-run E: "Codex actually caught the CI failure itself—it read the repo's CI scripts and predicted the failure"

**SUPPORTED, and more specifically than the post claims.** Codex's inline P1 on PR #70 names the script, the workflow, and the line range: "the repo-lint workflow runs `./scripts/ci/check_no_forbidden_top_level_dirs` (`.github/workflows/repo_lint.yml`), which hard-fails when `vendor` exists (`FORBIDDEN_DIRS` in `scripts/ci/check_no_forbidden_top_level_dirs`, checked at lines 59–63). This means the commit cannot pass required CI in any environment and will block merge."

It is a static prediction from reading the repository's own enforcement code, not an observation of a failed run—which is the more interesting version of the claim. Source: `gh api repos/nathanjohnpayne/mergepath/pulls/70/comments` → the `chatgpt-codex-connector[bot]` P1 on `vendor/PLACEHOLDER.md:1`.

---

## F. Propagation

### F1—"I estimated 60 minutes for all six. It took over three hours for the first two"

**Estimate UNPROVABLE; the elapsed time is WRONG and understates it.** The two propagation PRs ran concurrently: swipewatch#33 `created 2026-04-15T18:30:51Z → merged 23:49:26Z` (5 h 18 m), nathanpaynedotcom#180 `created 18:33:24Z → merged 23:49:31Z` (5 h 16 m). Wall clock across both: **5 h 19 m**. Corrected value: over five hours, not three. The 60-minute estimate is the author's own and needs no source, but should be labelled an estimate. Source: `gh api repos/nathanjohnpayne/swipewatch/pulls/33`, `repos/nathanjohnpayne/nathanpaynedotcom/pulls/180` → `.created_at`, `.merged_at`.

### F2—"the remaining four repos propagated cleanly in under ten minutes"

**SUPPORTED, and comfortably.** Sub-issues #47 friends-and-family-billing, #49 device-platform-reporting, #50 overridebroadway and #48 device-source-of-truth closed at `23:33:17Z`, `23:33:22Z`, `23:33:29Z`, `23:33:35Z`—an **18-second** spread. Source: `gh api repos/nathanjohnpayne/mergepath/issues/{47,48,49,50}` → `.closed_at`.

### F3—"propagation is implicitly a fresh-eyes code review"

**SUPPORTED as an interpretation of B5.** Issue #75 records that the 17 bugs surfaced "across 7+ review rounds per PR" on the two propagation PRs, in code the template repo had already reviewed. The claim is a reading of that record rather than a measurement, and reads honestly as such. Source: issue #75 § Background.

---

## G. The identity claim

### G1—"identity-switching… produces measurably better reviews"

> L14 keyTakeaway, L66–68, Rule 2

**UNPROVABLE.** There is no comparison population, no outcome measure, and no ledger. Nothing in the repository records a same-conversation-review arm to compare against, and no defect-detection rate is computed either way. The post itself concedes "I do not have a mechanistic explanation"—the missing thing is not the mechanism, it is the measurement. Defensible form: a repeated observation across Claude Code, Cursor, and Codex, stated as such. Drop "measurably", which promises a denominator the post does not have. #739's acceptance criteria allow exactly this recasting. Source: absence. No A/B record, no review-quality ledger for April 2026 in `mergepath`.

---

## H. Claims that stand as written

| Claim | Source |
|---|---|
| The PR-creation guard requires `Authoring-Agent:` and `## Self-Review` | `scripts/hooks/gh-pr-guard.sh`; independently re-confirmed when it blocked a bolded `**Authoring-Agent:**` line during the #740 audit |
| PR #60 was a docs-only change touching `.github/**`, merged 2026-04-15 | `refs.json` → `#60`, +60/−10 over 2 files |
| PR #63 added a runtime label re-verify, +53/−0 in one file | `refs.json` → `#63` |
| PR #76 was the consolidated back-port, +450/−102 over 3 files | `refs.json` → `#76` |
| Codex posts no `APPROVED` review; it uses 👍 or a `COMMENTED` review | `.github/review-policy.yml` § codex; observed on every dry run |
| Six downstream repos in the April propagation set | issues #45–#50 |
| Project #2 holds 46 items | §B2 |

---

## I. Instructions to the drafting pass

1. Every number, date, and causal claim must trace to a **SUPPORTED** row. Do not introduce a figure this ledger does not carry.
2. **§A is the priority.** Three separate statements of the project's duration disagree with each other and with the repo. Pick one clock, name its start event, and use it everywhere.
3. **§B1 is the most quotable wrong number in the post.** "100+ PRs" is 32.
4. Where a row says **UNPROVABLE**, use its defensible form. §G1 in particular: "measurably" must go, and the acceptance criteria explicitly permit recasting it as repeated observation.
5. **Add the snapshot boundary.** §A4, §C3, §C4. A reader must be able to tell April-2026 behaviour from current behaviour.
6. **§C1's table is the deliverable** for the "every enforcement claim names its boundary" criterion. The live corroboration in that row—two break-glass variables, and a line-anchored hook match—is fresh evidence from this epic's own run.
7. **§B7 and §E3 are the "preserve the uncomfortable evidence" material** the issue asks for. A known P1 carried forward, and a model-behaviour generalisation the repo has since falsified, are stronger endings than a clean sweep.
8. Compression target: 20–30% from 4,418. §B4, §D1's table, and the propagation chronology are the densest candidates; keep the decision evolution and the failures.

---

## J. Compression accounting

Measured at the revised head with `wc -w`, the same method as the epic's baseline.

| Measure | Baseline | Revised | Change |
| --- | ---: | ---: | ---: |
| Whole file (the epic's 4,418 baseline) | 4,418 | 3,724 | **−15.7%** |
| Body prose, frontmatter excluded | 3,993 | 3,279 | **−17.9%** |

**Neither figure reaches the 20–30% band, and after the review rounds the body no longer does either.** Two things grew there, both required by the acceptance criteria. The `keyTakeaways` had to carry calibrated language the originals did not—"repeated observation, not controlled measurement" is longer than "measurably better", and that is the point of the change. The `description` and the diagram's `description` both gained the April-2026 snapshot boundary.

The body also absorbed three sections the acceptance criteria require and the original did not have: the enforcement-boundary table ("every enforcement claim names its boundary"), the corrected-numbers section with its pointer to this ledger ("a linked or embedded counting note"), and "Since the snapshot" ("a reader can tell historical behavior from current Mergepath behavior"). Net of those additions the surviving original prose is down considerably more than 20.8%.

Per the epic's compression clause—"meet the 20–30% guidance, **or document why retained chronology or evidence earns the additional length**"—this row is that documentation, and the operator has since confirmed in chat that the reduction is a guideline rather than a gate: if cutting would damage the post, do not cut.

The gap widened rather than closed as review proceeded, and that is the substantive point. Every round added words for the same reason: a claim that had been short and wrong became longer and right. Naming which of two round limits was actually tested on PR #787 cost 40 words. Attributing a rejection to the wrapper's body contract rather than to the hook cost 60, and replaced a wrong one-clause aside with the clearest illustration of layered boundaries in the post. Distinguishing Codex findings from CodeRabbit's in one sequence cost 9. None of that is padding, and none of it can come out without putting an error back.

What was actually removed, in rough order of size: the inline `mermaid` Phase 4a flow diagram from the body (the sidebar diagram plus the two-script prose carries it); the quoted `gh-pr-guard.sh` bash snippet and the `review-policy.yml` block (described in prose instead, with the `functions/**` omission retained because it is evidence); the component inventory in "What a consumer repo got", cut roughly in half; and the restatement of the lede's "no natural pause" argument at the top of the discovery section.

---

## K. Reviewer-pass addendum (PR #791)

Two findings from the `nathanpayne-claude` reviewer pass, both in the **"Since the snapshot"** section—the one part of a post about numerical precision whose figures had not been put in this ledger. Both are mine rather than the drafting pass's, which is the lesson: the current-state numbers need ledger rows exactly as much as the historical ones do.

### K1—"has since passed 459 PRs"

**WRONG.** 459 is the current total, not a threshold crossed. `repos/nathanjohnpayne/mergepath/pulls?state=all` paginates to exactly `page=459; rel="last"` at `per_page=1`. Corrected to "now stands at 459". Source: `gh api 'repos/nathanjohnpayne/mergepath/pulls?state=all&per_page=1' -i` → `Link` header.

### K2—"`scripts/ci/` has grown from 7 scripts to 122 files"

**WRONG—the two figures are not comparable, and crossing them inflates the growth.**

| Measure | April 2026 | Today |
|---|---:|---:|
| Files in `scripts/ci/` | 8 | 122 |
| Files matching `check_*` | 7 | 66 |

The post's "7" was the check-script count and its "122" the total file count, reading as a 17× increase where the like-for-like figure is about 9×. Corrected to "the seven check scripts in `scripts/ci/` have become 66". §B4's "seven fail-closed CI checks" for April is unaffected—it counts checks, and it is right. Source: `git -C ~/GitHub/mergepath ls-tree -r --name-only {main,2429e6bf} -- scripts/ci`, total and `check_*`-matching counts.

**Rule for the remaining five audits.** Any "as of today" or "since then" figure a revision *introduces* needs a ledger row before it ships. The historical claims get audited because the issue lists them; the new current-state claims have no such prompt, and this pass is where they get caught.

---

## L. Codex round-1 addendum (PR #791)

Six findings, all correct, all fixed. **Four landed on this ledger rather than the post**, repeating the pattern round 5 of #787 showed: the evidence artifact drifts out of step with its own corrections, and it is the artifact that later audits read.

### L1—The header presented a baseline as a current count

"3,993 body words" described the *pre-revision* post while the header identified the current source. Both baselines are now labelled as such, pointing at §J for the revised figures.

### L2—`max_review_rounds` did not fire on PR #787

The sharpest finding of the round. The revision cited #787's 0/4/5/1/7 sequence as evidence that "the `max_review_rounds` guard is not a rarely-fired safety belt. It fires." It did not fire. #787 stopped at five rounds because **the operator set a five-round budget**, and `plans/759/RUN.md` records the opposite judgement about the configured guard: round 3 was explicitly reasoned about and found *not* to be the runaway case. Citing an operator cap as evidence that a configured guard fires conflates two different limits, in a post whose whole subject is naming which mechanism does what.

The post now states which limit was tested and which was not. The surviving claim is the one the evidence carries: that reviews converging in a single round is the assumption dry-run D got wrong.

### L3—The method note pointed at a SUPPORTED row

It cited §D2 as a claim that failed the mechanical check; §D2 is classified SUPPORTED. Repointed at the rows that actually failed: §B1, §B4, §B6, §E1, §E4.

### L4—§B3's "roughly 30 PRs" was unsupported

Rewritten above. Project #2 holds **9** pull requests, not ~30, and this row's own gloss inflated the claim further before anyone ran the query.

### L5—§B4 repeated the units error it was correcting

The row corrected "two dozen" to seven for April, then compared it to "122 files today"—checks against files, the same mismatch §K2 caught in the post. Both now use the check-script definition: 7 then, 66 now.

### L6—`RUN.md` pointed at a helper that is not in the repository

The runbook told the remaining audits to use `scratchpad/reflow.py`, which exists only in this session's scratchpad and would be invisible to a resumed agent. Corrected to name the canonical implementation and to state the transform rule inline, so the instruction survives without either.

**Rule for the remaining five audits.** Four of six findings this round were in the ledger, not the prose. Audit the artifact as well as the post before pushing: the ledger is the input to every later audit, so an error there propagates further than one in the article.

---

## M. Codex round-2 addendum (PR #791)

Four findings, all correct, all fixed. One of them is a rule I had written down after #787 and then failed to follow in the very next PR.

### M1—The rejection came from the wrapper's contract, not from the hook

The revision's "evidence after launch" said the *hook* refused a bolded `**Authoring-Agent:**` because "the check is line-anchored". Checked against the code: for a PR created through the required `scripts/gh-as-author.sh` path, `gh-pr-guard.sh` recognises the wrapper and steps aside (`_WRAPPER_CMDS` at line 1043, matched at 1219). The line-anchored match that actually rejected the body lives in the wrapper's contract—`scripts/lib/pr-body-contract.mjs:83`, `/^ {0,3}Authoring-Agent:\s*(.*?)\s*$/i`, with the error text emitted from `scripts/lib/pr-body-contract.sh:60`. The hook's own direct-invocation fallback does still use a substring `grep`, so attributing line-anchoring to "the hook" is wrong twice over.

Corrected, and the correction improves the passage: the hook's job was to insist the write go through the wrapper at all, and the wrapper's job was to validate the body. Two components, two boundaries, one easily mistaken for the other—which is the section's entire thesis. Source: `scripts/hooks/gh-pr-guard.sh` lines 1043, 1219, 1375–1376; `scripts/lib/pr-body-contract.mjs:83`; `scripts/lib/pr-body-contract.sh:60`.

### M2—The compression totals were stale

§J's table was measured before the last prose edit and under-reported by 27 body words. Recomputed at this head and the discussion rewritten—see §J, which now also records that the gap *widened* through review, and why that is the correct outcome rather than a failure.

### M3—The #787 round sequence was ambiguous across artifacts

The post gave "0, 4, 5, 1, and 7 findings" while `plans/759/RUN.md` and the #740 ledger's §L both describe round three as "seven". Both are right about different populations: round three drew **5 Codex findings plus 2 from CodeRabbit**. The post now says "Codex findings" and names CodeRabbit's two, so the sequences reconcile instead of contradicting each other.

### M4—`RUN.md` left the #791 PR cell empty

The same defect Codex caught on #787 as §L4, where the fix was written into this file as a carry-forward rule—"fill the PR cell at the moment the PR is created, not in the log entry afterwards"—and then not followed in the next PR. The rule was right; following it needs to happen at PR-creation time, not at review time. Filled.

**Note to self for the remaining five audits.** A rule recorded in `RUN.md` is not a rule followed. §L4 was written down, agreed with, and broken within one PR. The mechanical fix is to fill the table cell in the same command that creates the PR.

