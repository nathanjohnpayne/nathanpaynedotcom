# Facts ledger, 2026-10-06 correctness pass: `every-reviewer-was-right`

Page source: `src/content/blog/every-reviewer-was-right.md`. Surface: `https://nathanpayne.com/blog/every-reviewer-was-right/`. Retrieval timestamp for every API figure: 2026-10-06. Prior ledger: none (no file under `plans/` names this post).

Repository resolution: every `#NNN` on the page is an explicit `github.com/nathanjohnpayne/mergepath` link, so all pull requests and issues below are `nathanjohnpayne/mergepath` unless written otherwise. The nathanpaynedotcom pull requests `#1005`, `#1006`, `#1007` are named in full where they appear. The authoring transcript the sidebar cites was located on disk at `~/.claude/projects/-Users-nathanpayne-GitHub-mergepath--claude-worktrees-mergepath-canary-propagation-662b9f/545f0caf-0a3f-4565-8451-20b979e2e45b.jsonl` (first entry `2026-08-27T01:36:06Z`, 17 MB) and read directly; every transcript figure below cites it as "transcript". Intermediate API pulls are in this session's scratchpad (`prs.json`, `reviews-NNNN.json`, `rc-NNNN.json`, `ic-NNNN.json`, `commits-NNNN.json`, `sweep-fixed.jsonl`, `growth.json`).

Counting rules applied, matching the page's sidebar: a Codex round is one review submission by `chatgpt-codex-connector[bot]` on `pulls/N/reviews`; a finding is a top-level inline comment (`in_reply_to_id` null) on `pulls/N/comments` by `chatgpt-codex-connector[bot]` or `coderabbitai[bot]`; a P-tier is the `P1 Badge`/`P2 Badge` image in the finding body; a finding's round is the Codex review its `pull_request_review_id` belongs to, numbered by `submitted_at`.

## Summary

| # | Claim (verbatim, abbreviated) | Location | Verdict | Corrected value or weaker form | Source |
|---|---|---|---|---|---|
| R1 | "applied by a backlog audit nine days after the pull request opened" | line 231 | WRONG | Eight days: 7 d 22 h 29 m (PR opened 2026-08-27T02:13:30Z; `size:S` labeled 2026-09-04T00:42:46Z by nathanpayne-claude) | `gh api repos/nathanjohnpayne/mergepath/issues/1056/timeline`; `pulls/1112` createdAt |
| R2 | "#1084, answering round 12: 'Both fixed, by deleting the mechanism…'"; "partly, after round 12"; "after Codex rounds 7, 10 and 12" | lines 149, 145, 14 | WRONG | Round 13. The reply (comment 3837388851, 2026-08-23T00:50:58Z) answers a finding in review 5001372008, the 13th Codex submission (00:44:54Z); the 12th was at 00:17:04Z | `pulls/1084/comments` joined to `pulls/1084/reviews` |
| R3 | "#1197, September 6 / owner-set contract / opened at +377" | line 161 (figure node) | WRONG | Opened at +255/−7 (single commit c8d1ecbe, 03:56:12Z; PR created 04:00:01Z); +377/−7 is the size at merge after three more fix commits | `pulls/1197/commits`; `commits/c8d1ecbe` stats; transcript 04:00:30Z "it's small—255 lines" |
| R4 | "the four dispositions the repository's own rule 2 names: a defect in the original ask, … machinery … added to satisfy an earlier finding, a stronger guarantee…, and documentation or manifest drift" | line 33 (sidebar) | WRONG | Rule 2 of `docs/agents/high-priority-scope-discipline.md` names three dispositions in every one of its 22 revisions: A Required, B Valid but adjacent, C Rebutted. The four categories are the post's own classification | `git show f7308ccb:docs/agents/high-priority-scope-discipline.md`; all 22 commits of mergepath#1200 via `contents?ref=` |
| R5 | "Under that contract the next round still drew three findings" | line 107 | WRONG | The three findings came from Codex round 1 (04:04Z, one P2), Codex round 2 (04:30Z, one P2) and one CodeRabbit finding (04:48Z), not one round | `pulls/1197/reviews`, `pulls/1197/comments` |
| R6 | "the size of the diff does not appear in the record until September 6" | line 99 | WRONG | True of the five prompts, the session's replies and the transcript's own text; false of the PR record, where the labeler bot posted "344 lines changed >= threshold 300" at 2026-08-27T04:00:58Z (comment 5434200410) | `issues/1112/comments`; transcript assistant text Aug 27 (zero line-count matches) |
| R7 | "Of the 507 closed pull requests in the repository's history, 15 closed unmerged. Twenty-six had eight or more Codex rounds… the 21 of those opened between July 4 and September 6, of which 19 merged" | line 127 | STALE | All five reproduce at a closedAt ≤ 2026-09-06 cutoff (507 / 15 / 26 / 21 / 19). Today: 631 closed, 22 unmerged, 40 with ≥8 Codex rounds (still only #1112 and #1189 unmerged), 23 in the window of which 21 merged (#1124 merged Sep 11, #1200 Sep 7). The sidebar dates the 26; line 127 dates nothing | GraphQL sweep of all MERGED+CLOSED PRs (13 pages) with REST recounts for nine PRs over 100 reviews |
| R8 | "Stronger Guarantees Accepted into Scope: 1 / 1 / 3, all input edge cases / about 10 / 5, all ordering mechanisms, 3 later removed" | lines 143–147 | UNPROVABLE | Single-rater hand classification; the page labels it approximate. No API field reproduces it | page's own sidebar, line 33 |
| R9 | "An earlier summary of that transcript had claimed I typed nothing for twenty hours" | line 37 | UNPROVABLE | No artifact of the earlier summary was located; the transcript shows a sibling session requesting the raw log on Sep 6 05:19–05:25Z, consistent with but not proof of the claim | transcript, cross-session messages 2026-09-06T05:19:09Z, 05:25:07Z |
| R10 | "seventeen of them quote a round or finding count" | line 101 | UNPROVABLE | About seventeen: a loose matcher (`round N`, `N rounds`, `N findings`, ordinal + round) hits 18 of the 120 inline replies the session posted on Aug 27 | `pulls/1112/comments`, author nathanpayne-claude, created 2026-08-27 |
| R11 | "five mechanisms were built to establish which of two workflow invocations happened first" | line 119 | UNPROVABLE | Single-rater; the owner's own freeze comment names eight ("head pinning, stage tracking, PATCH-by-id, preserved history, evaluation ordering, watermarks, reconciliation, and per-stage timing") | `issues/comments/5556479015` |
| R12 | "roughly half the later ones were interactions between rules added the round before" | line 119 | UNPROVABLE | Single-rater; the same sentence appears in mergepath#1200's first draft (commit 2e480aac) | `commits/2e480aac` patch line 30 |
| R13 | "Fifteen of its 21 findings were about the guard, seven of them successive holes in one flag extractor"; "Its share of such findings, a third, is higher than #1189's" | line 131 | UNPROVABLE | By title, roughly 15 of the 21 findings concern the bootstrap guard or its probe; the author's own replies enumerate six extractor holes ("fifth instance", then "sixth way"); the seventh and the comparison with #1189 are not reproducible | `pulls/1139/comments` titles; replies 3887888119, 3887928977 |
| R14 | "the instruments are being built now" | line 237 | UNPROVABLE | Weaker form: tracked as open issues. mergepath#1199, #1201 and #1202 are all open on 2026-10-06 and the doc they belong to says "None of those exists yet" | `issues/1199`, `/1201`, `/1202`; `docs/agents/high-priority-scope-discipline.md` line 7 |
| R15 | "Two pull requests drew 72 Codex findings"; "72 findings from the Codex GitHub App across 31 review rounds" | lines 5, 6, 43 | SUPPORTED | 46 + 26 top-level Codex inline comments; 19 + 12 Codex review submissions | `pulls/1112,1189/comments`, `/reviews` |
| R16 | "both closed unmerged"; "One was replaced by a change to a single word" | lines 5, 43 | SUPPORTED | #1112 and #1189 state CLOSED, mergedAt null; #1196 body: "One word: `conclusion='failure'` → `conclusion='neutral'`" | GraphQL `pullRequest` state; `pulls/1196` body |
| R17 | "35 lines to 2,136 for a requirement that later shipped in 377" | lines 5, 15, 22 | SUPPORTED | #1112 first commit +35, PR additions 2,136; #1197 additions 377 | `commits/b0b26c3e` stats; GraphQL additions |
| R18 | "I was asked five times how to proceed"; five prompts "each time with three options" with the quoted times and counts | lines 5, 77, 81–85 | SUPPORTED | AskUserQuestion calls about #1112 at 15:45:10Z ("11-round"), 17:48:25Z ("13 Codex rounds with 15+ findings"), 20:16:23Z ("16 Codex rounds / ~25 findings"), 21:10:28Z ("17 rounds / ~28 findings"), 21:56:22Z ("18 rounds / ~30 findings"), three options each, labels as the figure gives them | transcript |
| R19 | "I clicked the first option all five times"; only 17:48 "Recommended" with gloss "matches what you asked for last time"; 20:16 gloss "same instruction as before" | line 97 | SUPPORTED | Answers recorded at 16:06, 17:50, 20:23, 21:22, 22:20Z are each the first option; "(Recommended)" appears only on the 17:48 prompt; both glosses verbatim | transcript tool_result entries for the five tool_use ids |
| R20 | "at 20:23, I typed … 'Then do one more @codex round.' At 22:28 I pasted a link… a minute later I typed 'fix that and admin merge.'" | line 97 | SUPPORTED | Queued lines at 20:23:53Z and 22:29:38Z verbatim; link to `#pullrequestreview-5046209006` typed at 22:28:49Z | transcript `queued_command` attachments and user entry |
| R21 | "The merge never happened, and the pull request sat untouched for nine days" | line 97 | SUPPORTED | Never merged; no timeline events between 2026-08-28 and 2026-09-05; last Aug 27 activity 22:46:07Z (Codex round 19), next 2026-09-06T03:29:24Z (merge of main): 9 d 4 h 43 m | `issues/1112/timeline`; `pulls/1112/commits` |
| R22 | 17:48 prompt "had already introduced two regressions of its own"; 20:16 prompt "the same class as several already-fixed spots"; "Not one quoted a line count"; "Four of the five menus were neutral" | line 99 | SUPPORTED | 17:48 prompt: "including two regressions this PR itself introduced"; 20:16 prompt: "same class as several already-fixed spots"; no prompt mentions lines; only one prompt carries a recommendation | transcript |
| R23 | "Every one said the loop was not converging" | line 99 | SUPPORTED | 15:45 "non-convergence pattern", 20:16 "still not converging", 21:10 and 21:56 "still finding new issues"; the 17:48 prompt states it only as counts ("13 Codex rounds with 15+ findings") | transcript |
| R24 | "counted one clean pass that Codex posted as a comment rather than a review, so the round counts quoted in the prompt figure run one higher" | line 31 | SUPPORTED | Issue comment 5434900998 by chatgpt-codex-connector[bot] at 2026-08-27T05:45:14Z: "Didn't find any major issues… Reviewed commit `8da36cf294`"; prompt counts exceed submission counts by exactly one at every prompt | `issues/1112/comments`; `pulls/1112/reviews` |
| R25 | `date: 2026-09-06` | line 10 | SUPPORTED | First publish commit f715b81 2026-09-06 01:10 PDT (nathanpaynedotcom#1005) | `git log -- src/content/blog/every-reviewer-was-right.md` on nathanpaynedotcom main |
| R26 | "Over eleven days in late August and early September" | line 43 | SUPPORTED | #1112 opened 2026-08-27, closed 2026-09-06: eleven calendar days inclusive, ten elapsed | GraphQL createdAt/closedAt |
| R27 | #1112 implements #1056; "The issue proposed … the commit hash in the initial commit's subject and a trailer, and the first commit did that in 32 lines" | line 49 | SUPPORTED | Issue body options (1) subject and (2) `Source:` trailer, "(1) and (2) together are probably right"; first commit touched `template-mirror.sh` +29/−3 = 32 changed lines (the table's +35/−5 adds the test file) | `issues/1056`; `commits/b0b26c3e` files |
| R28 | #1189 implements #1188: failure-only diagnostic, head "red permanently", guard "demanded a break-glass merge" | line 51 | SUPPORTED | Issue body states all three; `gh-pr-guard.sh` at the Sep 5 ref blocks UNSTABLE without `BREAK_GLASS_MERGE_STATE=1` | `issues/1188`; `git show 5aea5db8:scripts/hooks/gh-pr-guard.sh` |
| R29 | "First commit +35 / −5" and "+275 / −7" | line 55 | SUPPORTED | b0b26c3e +35/−5 (2 files); af513e96 +275/−7 (3 files); each PR opened with that single commit | `commits/{sha}` stats; `pulls/N/commits` |
| R30 | "At close +2,136 / −17" and "+1,179 / −19" | line 56 | SUPPORTED | GraphQL additions/deletions 2136/17 and 1179/19 | GraphQL `pullRequest` |
| R31 | "Commits 39 / 21" | line 57 | SUPPORTED | commits.totalCount 39 and 21 | GraphQL; `pulls/N/commits` lengths |
| R32 | "Codex review rounds 19 / 12"; "Nineteen rounds" | lines 58, 22 | SUPPORTED | 19 and 12 COMMENTED reviews by chatgpt-codex-connector[bot] | `pulls/N/reviews` |
| R33 | "Codex findings, of which P1: 46, 17 / 26, 3"; "forty-six findings" | lines 59, 22 | SUPPORTED | 46 top-level (P1=17, P2=29); 26 top-level (P1=3, P2=23) | `pulls/N/comments` with badge match |
| R34 | "Active review time 21 hours, then idle 9 days / 22 hours" | line 60 | SUPPORTED | 01:36Z task list to round 19 at 22:46Z = 21 h 10 m (PR open to round 19 = 20 h 33 m); idle 9 d 4 h 43 m; #1189 opened 05:03:31Z, closed 2026-09-06T03:30:39Z = 22 h 27 m | transcript; `pulls/N/reviews`; GraphQL |
| R35 | "#1197, +377, merged in 68 minutes / #1196, +54, merged in 20 minutes" | line 61 | SUPPORTED | #1197 created 04:00:01Z, merged 05:08:14Z (68 m 13 s), +377; #1196 created 03:29:45Z, merged 03:49:53Z (20 m 8 s), +54 | GraphQL |
| R36 | "The pivot is round 4 … [require the source to be clean before accepting its hash]" | line 65 | SUPPORTED | discussion_r3868677507 is in review 5037189983, the 4th Codex submission (04:17:48Z), P2: "require the selected `source_root` to be clean before accepting its SHA" | `pulls/comments/3868677507` |
| R37 | "The first three rounds found … a wrong or unresolvable hash in three different ways … the recut kept two of the resulting checks" | line 65 | SUPPORTED | Rounds 1–3 titles: enclosing repository, fork commits, HEAD not in canonical remote history (plus docs/test items); #1197 keeps canonical origin and upstream reachability (commit 46380923; CodeRabbit reply names "canonical origin, clean status, upstream-reachable HEAD") | `pulls/1112/comments`; `pulls/1197/commits` |
| R38 | "The break is round 8 … [validate the resumed target…] … [added `--delete` to the rsync invocation]" | line 67 | SUPPORTED | r3869470508 in review 5038097708 (8th, 07:05:32Z), P1 "Validate the resumed target before attributing its source SHA"; reply r3872275126 (13:43:15Z): "Added `--delete` to the rsync invocation" | `pulls/comments/{id}` |
| R39 | "In round 12 … [the engine deleted the entire target]"; "After a round-15 trailing-slash fix, CodeRabbit noticed that a target of `/` now normalized to an empty string, so rsync [ran with `--delete` against the filesystem root]" | line 69 | SUPPORTED | r3874150864 in the 12th review (17:27:55Z), P1 "Keep reconciliation below the target root"; commit 7dba950e (20:14:15Z) answered round-15 P1 "Strip every trailing separator"; CodeRabbit r3875527997 at 20:18:31Z: "`rsync -a --delete … "/"` runs against the filesystem root" | `pulls/comments/{id}`; `pulls/1112/commits` |
| R40 | "Ten data-loss findings, nine of them P1s, every one real, every one in code that did not exist when the pull request opened, and every one fixed with a regression test"; "Rounds 11 through 17 then found ten data-loss defects" | lines 69, 175 | SUPPORTED | Nine Codex P1s in rounds 11–17 (R11×2, R12, R13, R14, R15, R16×2, R17) plus CodeRabbit's root finding = 10; the engine entered at commit 1b321fee (13:42Z); each of the ten fix replies cites a regression test | `pulls/1112/comments` by round; replies to the ten ids |
| R41 | "bootstrap script had grown from 1,498 lines to 2,102 and its test file from 2,088 to 3,607; the diff was 61 times the size of the first commit" | line 71 | SUPPORTED | `wc -l` of both files at 95f7944c (parent of first commit) and 40faf27e (head at close): 1498→2102, 2088→3607; 2136/35 = 61.0 | `contents/<path>?ref=<sha>` raw |
| R42 | "After the task list at 01:36 UTC on August 27, rounds 1 through 10 ran with no input from me" | line 77 | SUPPORTED | Task message at 01:36:07Z; no human text about #1112 before the 15:45 prompt. One answer about PR #1110 (break-glass) was given at 13:29Z between rounds 8 and 9 | transcript |
| R43 | "its three non-convergence deferrals … called the findings 'new, distinct, genuinely valid edge cases'" | line 101 | SUPPORTED | Six inline replies containing that phrase in three batches: 15:42Z (×3), 17:46Z (×2), 20:14Z (×1) | `pulls/1112/comments` |
| R44 | "Everything else I typed … came on September 6: an instruction to resolve merge conflicts, then … the decision that closed it, the contract for the recut, and two notes on it"; decision content | line 105 | SUPPORTED | 03:16:50Z "Resolve your merge conflicts…"; 03:34:48Z decision ("an issue labeled `size:S` resulted in a PR where review is finding credible ways to delete Git repositories and operator work… preserving the branch because a lot of correctness work has gone into it is the wrong optimization"); 03:38:29Z contract; 04:08:35Z and 04:21:24Z notes | transcript |
| R45 | #1197's three findings: "two real violations of the stated clean-tree check, fixed, and one about an adversarial caller's environment, rebutted" | line 107 | SUPPORTED | Codex R1 "Force untracked files into the source cleanliness check" and R2 "Force dirty submodules…", fixed in 41017ca0 and d796943f; CodeRabbit 3942971244 rebutted 04:54:28Z as "a theoretical adversarial-CALLER-environment concern" | `pulls/1197/comments`, `/commits` |
| R46 | #1188 "filed by an agent at 03:59 UTC on September 5 and listed three shapes… the third… `neutral`… 'the cheapest option and closest to what the record actually means.' Sixty-four minutes later the pull request opened with option one" | line 113 | SUPPORTED | Author nathanpayne-claude, 03:59:55Z; three numbered shapes, third "emit `neutral`", quote verbatim; #1189 created 05:03:31Z (63 m 36 s) implementing shape 1 | `issues/1188`; GraphQL createdAt |
| R47 | First commit header quote: "The failure conclusion stays `failure` rather than softening to `neutral`. 'We could not verify this is safe to merge' should block; the defect was the missing exit, not the severity." | lines 113, 16 | SUPPORTED | Verbatim in af513e96's patch to `scripts/workflow/report-approval-continuation-failures.sh` (lines 26–28); committed 05:03:13Z, before CodeRabbit (05:07:31Z) and Codex round 1 (05:13:10Z) | `commits/af513e9678` |
| R48 | "the diagnostic is not a required status check on the hub or on any of the three consumer repositories checked. It blocked nothing except our own guard script" | line 115 | SUPPORTED | Required contexts today on mergepath, fiveacross, nathanpaynedotcom, matchline exclude `approval-merge-continuation`; #1196 body records the same four-repo check; the guard blocks UNSTABLE | `branches/main` protection on four repos; `pulls/1196` body; `gh-pr-guard.sh` |
| R49 | "The first round found two real false greens: the clearing path created a competing success run instead of updating the failure, and a clear was not pinned to the head" | line 117 | SUPPORTED | Codex R1 P1 "Pin clears to the head that produced the verdict"; CodeRabbit (05:07:31Z) "Update the selected failing check run instead of creating a new one". One of the two is CodeRabbit's | `pulls/1189/comments` |
| R50 | "deferred two of them to follow-up issues"; external reviewer "[overruled both]: 'Both affect the core merge-gating guarantee and should be resolved before merge.'"; "[note on complying]… 'The review overruled my deferral and it was right to.'" | line 117 | SUPPORTED | Issues #1190 (06:13Z) and #1191 (06:37Z) by nathanpayne-claude; review 5120227951 by nathanpayne-codex (06:54:35Z) quote verbatim; comment 5553441393 (17:12:41Z) quote verbatim and "I had filed these as #1190 and #1191 and argued cost-versus-likelihood" | `pulls/1189/reviews/5120227951`; `issues/comments/5553441393` |
| R51 | "The watermark … was split back out 95 minutes later"; "Findings per round never reached zero and spiked to six in round 6" | line 119 | SUPPORTED | 8f109ddc (17:07:39Z) to aae979e8 "split the clean-verdict watermark out" (18:42:28Z) = 94 m 49 s; per-round counts 4,1,3,1,1,6,1,2,1,2,1,3 | `pulls/1189/commits`, `/comments` |
| R52 | "At 02:55 UTC on September 6, the pull request's contract was [frozen to five guarantees], with a false red … declared an accepted residual, and the external reviewer approved with zero findings. Then Codex … found two more real P1s" | lines 121, 16 | SUPPORTED | Comment 5556479015 at 02:55:17Z lists five numbered guarantees, item 5 the accepted residual; nathanpayne-codex review 5123903482 at 03:07:19Z "Findings: none" on head a028f976; Codex round 12 (03:22:34Z) r3942818732 and r3942818738, both P1. Round 11 (03:08:11Z, one P2, requested 03:01:53Z) sat between | `issues/comments/5556479015`; `pulls/1189/reviews`; `pulls/comments/{id}` |
| R53 | "Seven minutes after that round, #1196 opened. One word: `failure` became `neutral`… It merged in twenty minutes" | line 123 | SUPPORTED | Round 12 03:22:34Z → #1196 created 03:29:45Z (7 m 11 s); body "One word"; merged 03:49:53Z | GraphQL; `pulls/1196` |
| R54 | "#1084 ran 19 rounds, drew 66 findings, and merged. #925 ran 18 and merged at 3,369 lines" | line 129 | SUPPORTED | #1084: 19 Codex reviews, 62 Codex + 4 CodeRabbit top-level; #925: 18 Codex reviews, additions 3369 | `pulls/N/reviews`, `/comments`; GraphQL |
| R55 | "#1139 is an 85-line routing change whose author volunteered a bootstrap guard"; quotes "the fifth instance of one root cause" and "the sixth way this extractor has validated a subset" | line 131 | SUPPORTED | Additions 85; PR body "Behavioural bootstrap guard added"; replies 3887888119 (22:52:04Z) and 3887928977 (23:15:19Z) verbatim | GraphQL; `pulls/1139`; `pulls/1139/comments` |
| R56 | "Both frozen contracts drew further valid findings, the two P1s inside #1189's five guarantees and the two clean-tree violations inside #1197's three checks" | line 133 | SUPPORTED | See R52 and R45 | as cited |
| R57 | "#1112 grew 61× … the largest growth on any of the 19 merged high-round pull requests is 11× … #1189 grew 4.3×… 275 lines" | line 135 | SUPPORTED | 2136/35 = 61.0; 1179/275 = 4.29; largest among the 19 is #687 at 11.0× (322→3,535), using first-commit additions as the open size (exact for the 17 PRs opened on one commit) | GraphQL `commits(first:6)` per PR |
| R58 | Table rounds and findings columns: 11/30, 11/21, 19/66, 19/51, 12/27 | lines 143–147 | SUPPORTED | Codex reviews 11, 11, 19, 19, 12; Codex+CodeRabbit top-level 26+4, 19+2, 62+4, 46+5, 26+1 | `pulls/N/reviews`, `/comments` |
| R59 | "#1176 … yes, after round 7"; "#1139 … yes, after round 10 … merged at +85, from a peak of +286"; "#1112 … never"; "#1189 … twice" | lines 143–147, 149, 151 | SUPPORTED | 1176 reply 3908785467 (21:57:00Z) answers a round-7 finding (R7 21:48:02Z, R8 22:04:46Z); 1139 reply 3887965208 (23:34:35Z) answers round 10 (23:31:08Z); `compare/main...84d4fefa` = +286 before the split commit 0df6c7f6; no removal commit on #1112; #1189 commits aae979e8 and 74acba06 | `pulls/N/comments` joined to reviews; compare API; commit subjects |
| R60 | Quotes: "removing the thing that produced this finding rather than patching it a fourth time"; "I am splitting the guard out rather than taking a fourteenth round on it"; "Both fixed, by deleting the mechanism that caused them"; "hand-rolled field reader stayed and drew findings until the merge" | line 149 | SUPPORTED | Verbatim in 3908785467, 3887965208 ("previous twelve rounds"/"round 13" when the Codex count was 10, so it counts every reviewer), 3837388851; #1084 round 19 finding "Reject YAML merge keys before honoring never" | `pulls/N/comments` |
| R61 | Figure: "ten days apart"; "#1197 … 2 Codex rounds / 2 Codex findings, 1 CodeRabbit / two fixed, one rebutted / merged 68 minutes after opening" | lines 155–163 | SUPPORTED | Aug 27 vs Sep 6; 2 Codex reviews, 2 Codex + 1 CodeRabbit top-level; see R45, R35 | as cited |
| R62 | "#1084 merged while its hand-rolled parser was still drawing findings, because the pull request had bounded the cost of a wrong answer to a skipped review wait, not a skipped review"; "#1196 shipped on an assumption about how GitHub treats `neutral` … failure mode stated as today's behavior and the remedy as reverting one word" | line 202 | SUPPORTED | 1084 reply 3836857385: "the knob gates Phase 2.5—the agent's wait and disposition—and nothing more"; #1196 body: "If the assumption is wrong, the head stays `UNSTABLE`—exactly today's behaviour… the remedy is reverting one word" | `pulls/1084/comments`; `pulls/1196` |
| R63 | "#1112 ran past a ten-round escalation policy that was in force throughout" | line 208 | SUPPORTED | The transcript quotes an owner directive of 2026-08-19: "From now on, use @codex for 10 rounds, and then use the automated 4b if you don't get approval by then" (read at 14:11Z; the 15:45 prompt says "past the 10-round budget"). Note: `.github/review-policy.yml` itself said `codex.max_review_rounds: 2` all of Aug 27; mergepath#1084 raised it to 10 at 2026-08-28T03:01Z, after round 19 | transcript; `git log -G'max_review_rounds:' -- .github/review-policy.yml` |
| R64 | Figure: "the implementation had added four guarantees… the diff had grown from 35 lines to 1,315" | lines 210, 214 | SUPPORTED | `compare/main...2885f0df` (round-12 head) additions 1315; commit bab042ad "update the canonical-source spec to four checks" (05:08Z) | compare API; `pulls/1112/commits` |
| R65 | "The operating rules that came out of this" | line 229 | SUPPORTED | mergepath#1200 "operating rules for priority:high work, derived from the #1189 failure", created 2026-09-06T05:11Z, merged 2026-09-07T16:49Z | `pulls/1200` |
| R66 | "The first draft of those rules said #1189 ran ten rounds and seventeen commits; the API says twelve and twenty-one, and Codex caught it in its first round" | line 231 | SUPPORTED | Commit 2e480aac: "ten review rounds, seventeen commits"; Codex round 1 (05:17:46Z) P2 "Correct the review-round evidence"; round 2 notes the doc "now reports twenty-one commits and twelve Codex rounds" | `commits/2e480aac`; `pulls/1200/comments` |
| R67 | "the first published version of this post numbered the … later rounds … one higher…, until a reader's review caught it" | line 231 | SUPPORTED | nathanpaynedotcom#1007 (merged 2026-09-07T02:23Z, commit fba75a0): "round numbers after 05:45 UTC were one too high… Renumbered throughout", arising "from a second reader's review of the published post, plus two factual corrections that checking that review against the GitHub API surfaced" | `gh api repos/nathanjohnpayne/nathanpaynedotcom/pulls/1007`; `git log` |
| R68 | "[The last post](/blog/perfect-score-wrong-axis/) … measured closure when it cared about coverage" | line 235 | SUPPORTED | 200; that page's abstract: "A perfect disposition record measures closure… It says nothing about coverage" | `curl -sI`; page text |
| R69 | Links `/blog/agent-approval-workflow-genesis-of-mergepath/`, `/og/blog/every-reviewer-was-right.png` | lines 43, 12 | SUPPORTED | Both 200 (text/html; image/png) | `curl -sI` |
| R70 | "The fleet comparison covers every pull request with eight or more Codex review rounds opened between July 4 and September 6. Across the repository's full history at publication there were 26, and the two closed pull requests here are still the only ones that did not merge" | line 37 | SUPPORTED | 26 at a 2026-09-06 cutoff; 40 today, unmerged set still exactly {1112, 1189} | GraphQL sweep |
| R71 | "a single-rater hand pass over 195 findings on five pull requests" | line 33 | SUPPORTED | 51 + 27 + 66 + 30 + 21 = 195 top-level findings from both bots | `pulls/N/comments` |
| R72 | "self-ratified in a code comment before any reviewer saw it" | line 16 | SUPPORTED | See R47: commit 05:03:13Z precedes CodeRabbit 05:07:31Z and Codex 05:13:10Z | as cited |

## Rows

### R1: Nine days after the pull request opened
> "The size-S label I had cited as the issue's original estimate was, the label history showed, applied by a backlog audit nine days after the pull request opened." (line 231)

**WRONG.** The `size:S` label on issue #1056 was applied at `2026-09-04T00:42:46Z` by `nathanpayne-claude` (alongside `type:feature`, `priority:normal`, `area:propagation` in the same second, consistent with an audit pass). PR #1112 was created at `2026-08-27T02:13:30Z`. The interval is 7 days 22 hours 29 minutes, which is eight days elapsed and eight calendar days (Aug 27 to Sep 4); it reaches nine only if both endpoint days are counted, and the page's own "idle 9 days" and "sat untouched for nine days" use elapsed time. The rest of the sentence holds: the label post-dates the PR by over a week, and the Sep 6 decision message does say "The issue itself labels this `size:S`". Source: `gh api repos/nathanjohnpayne/mergepath/issues/1056/timeline` -> `labeled size:S 2026-09-04T00:42:46Z`; `pulls/1112` -> `created_at 2026-08-27T02:13:30Z`. Fix: "eight days after the pull request opened".

### R2: #1084's deletion came after round 13, not 12
> "[#1084], answering round 12: 'Both fixed, by deleting the mechanism that caused them,'" (line 149); "partly, after round 12" (line 145); "every merged control removed one mid-review, after Codex rounds 7, 10 and 12" (line 14)

**WRONG.** The quoted reply is inline comment 3837388851 (and its twin 3837389786), posted `2026-08-23T00:50:58Z` by nathanpayne-claude. Its parent, 3837379921, belongs to review 5001372008, which is the 13th Codex submission on #1084 (`submitted_at 2026-08-23T00:44:54Z`); the 12th was at `00:17:04Z`. Every one of the first thirteen Codex reviews on #1084 carries at least one finding, so no clean-pass ambiguity moves the numbering. The reply's own text fits round 13: "These two are mine, introduced one round ago, and the second one is the more serious finding on this PR", and round 13 is the round with a P1 (round 12 had two P2s). The #1176 (round 7) and #1139 (round 10) attributions in the same sentence are correct. Source: `gh api repos/nathanjohnpayne/mergepath/pulls/1084/comments` joined to `pulls/1084/reviews` sorted by `submitted_at` -> round 13. Fix: "round 13" in all three places ("rounds 7, 10 and 13").

### R3: #1197 opened at +255, not +377
> "#1197, September 6<br/>owner-set contract<br/>opened at +377" (line 161, figure node B1)

**WRONG.** #1197 was created at `2026-09-06T04:00:01Z` with exactly one commit on the branch, c8d1ecbe (`03:56:12Z`), whose stats are +255/−7 across seven files. Three fix commits followed at 04:20, 04:23 and 04:35Z and a merge of main at 04:44Z, bringing the PR to +377/−7 at merge. The sidebar defines growth as "the additions in the pull request's diff at the moment it was opened, against the additions at close or merge", so by the page's own rule the open figure is 255 and 377 is the merge figure; the description's "shipped in 377" and the table's "+377, merged in 68 minutes" are correct. The authoring session said the same at 04:00:30Z: "it's small—255 lines". Source: `gh api repos/nathanjohnpayne/mergepath/pulls/1197/commits`; `commits/c8d1ecbe82` -> `additions 255, deletions 7`. Fix: "opened at +255, merged at +377" (the figure description's "#1197 was 377 lines" can stand).

### R4: Rule 2 names three dispositions, not these four
> "using the four dispositions the repository's own rule 2 names: a defect in the original ask, a defect in machinery that did not exist when the pull request opened and was added to satisfy an earlier finding, a stronger guarantee than the issue required, and documentation or manifest drift." (line 33)

**WRONG.** Rule 2 of `docs/agents/high-priority-scope-discipline.md` ("Classify every review finding before changing code") names three dispositions under subheads A, B and C: Required, Valid but adjacent, and Rebutted. That is true of the file at merge (f7308ccb, 2026-09-07), of every one of the 22 commits on mergepath#1200 including the version live when the post was published (a3dcd119, 07:02Z Sep 6), and of `main` today. "A stronger guarantee than the issue requires" is one bullet under disposition B; "documentation or manifest drift" and "machinery added to satisfy an earlier finding" do not appear in rule 2 at all (the latter is rule 5's subject), and the doc's checkpoint lists a different four, "contract defect / regression / adjacent / rebutted". The four categories are the post's own classification scheme. Source: `git show f7308ccb:docs/agents/high-priority-scope-discipline.md | awk '/^## 2\./,/^## 3\./'`; `gh api contents/docs/agents/high-priority-scope-discipline.md?ref=<sha>` for all 22 commits -> three `### [A-C].` subheads each, zero hits for "drift" or "original ask" in rule 2. Fix: "using four categories of my own, built on the three dispositions the repository's rule 2 names (required, valid but adjacent, rebutted): …".

### R5: The three findings on #1197 came across two rounds and a CodeRabbit pass
> "Under that contract the next round still drew three findings: two real violations of the stated clean-tree check, fixed, and one about an adversarial caller's environment, rebutted as outside the contract." (line 107)

**WRONG.** On the page's counting rule the three findings are one per pass: Codex round 1 (`04:04:35Z`, P2 "Force untracked files into the source cleanliness check"), Codex round 2 (`04:30:44Z`, P2 "Force dirty submodules into the source cleanliness check"), and CodeRabbit's single top-level finding (`04:48:02Z`). The page's own figure (line 162) counts it correctly as "2 Codex rounds / 2 Codex findings, 1 CodeRabbit". The dispositions are right (see R45). Source: `gh api repos/nathanjohnpayne/mergepath/pulls/1197/comments` joined to `pulls/1197/reviews`. Fix: "Under that contract the review still drew three findings across two Codex rounds and a CodeRabbit pass".

### R6: A line count does appear in the PR record on August 27
> "Not one quoted a line count; the size of the diff does not appear in the record until September 6, after I had read it myself." (line 99)

**WRONG** as a statement about the pull request record, which the sidebar names as a source. The `github-actions[bot]` labeler posted issue comment 5434200410 at `2026-08-27T04:00:58Z`: "This PR has been labeled `needs-external-review` based on .github/review-policy.yml: - 344 lines changed >= threshold 300". The narrower claims hold: none of the five prompts mentions lines, none of the session's 120 Aug 27 inline replies matches a line-count pattern, no assistant text in the transcript on Aug 27 matches one, and the first line count the session utters is at `2026-09-06T03:37:46Z` ("The very first commit on this branch was 32 lines"). Source: `gh api repos/nathanjohnpayne/mergepath/issues/1112/comments` -> comment 5434200410; transcript assistant entries dated 2026-08-27 grepped for `[0-9][0-9,]*[ -]line|diff (is|was|size|grew)` -> zero. Fix: "the size of the diff does not appear in the session's prompts or replies until September 6" (or note that only the labeler bot ever stated one).

### R7: The repository-wide counts are stated without a date
> "Of the 507 closed pull requests in the repository's history, 15 closed unmerged. Twenty-six had eight or more Codex rounds, and only these two did not merge. The comparisons below use the 21 of those opened between July 4 and September 6, of which 19 merged." (line 127)

**STALE.** All five figures reproduce exactly at any cutoff from the first publish commit (2026-09-06T08:10Z) through the Sep 7 correction: 507 closed, 15 unmerged, 26 with eight or more Codex rounds (unmerged set {1112, 1189}), 21 opened Jul 4 to Sep 6 of which 19 merged. On 2026-10-06 the same queries give 631 closed, 22 unmerged, 40 with eight or more rounds (unmerged set still exactly {1112, 1189}), and 23 in the window of which 21 merged (#1124, merged Sep 11, and #1200, merged Sep 7, were open at publication). The sidebar dates the 26 ("at publication"), but line 127 presents "in the repository's history" in the present tense with no date, so a reader re-deriving it today gets different numbers; the thesis-bearing sub-claim ("only these two did not merge") still holds. Method: GraphQL `pullRequests(states:[MERGED, CLOSED])` paged 50 at a time with `reviews(first:100){nodes{author{login}}}`, Codex rounds counted as reviews whose author login is `chatgpt-codex-connector` (GraphQL drops the `[bot]` suffix), then REST `pulls/N/reviews` recounts for the nine PRs with more than 100 reviews (687, 886, 925, 1018, 1032, 1084, 1112, 1250, 1541). Source: scratchpad `sweep-fixed.jsonl`, filtered on `closedAt <= 2026-09-06T23:59:59Z`. Fix: date the sentence, e.g. "Of the 507 pull requests closed by September 6, …".

### R8: The stronger-guarantees column
> "Stronger Guarantees Accepted into Scope: 1 / 1 / 3, all input edge cases / about 10 / 5, all ordering mechanisms, 3 later removed" (lines 143–147); "The middle column is approximate and single-rater" (line 149)

**UNPROVABLE.** This is a hand classification of 195 findings into four categories; no API field or commit property reproduces "accepted a stronger guarantee". The page says so itself and labels the column approximate. The row-level inputs it rests on (rounds, finding counts, which mechanisms were removed) are verified elsewhere in this ledger. Weaker form: as written, with the existing "approximate and single-rater" caveat. Source: page sidebar line 33.

### R9: The earlier summary that claimed twenty hours of silence
> "An earlier summary of that transcript had claimed I typed nothing for twenty hours; the log says otherwise, and the text below follows the log." (line 37)

**UNPROVABLE.** No copy of the earlier summary was found on disk. The transcript does show, on Sep 6 at 05:19:09Z and 05:25:07Z, a sibling session (nathanpaynedotcom worktree `home-panel-contrast-arrows-7834ce`) asking the authoring session for "the raw ex[tract]" because "that is exactly the layer the API cannot show, and it changes the assessment", which is consistent with a summary having been corrected against the log, but does not establish what the summary said. The second half of the sentence is verified: the log records human input at 13:29, 16:06, 17:50, 20:23, 21:22, 22:20, 22:28 and 22:29Z on Aug 27. Weaker form: "an earlier draft summarised the transcript as containing no input from me for most of the day; the log says otherwise". Source: transcript cross-session messages at those timestamps.

### R10: Seventeen replies quoting a count
> "The session's own review replies show where that framing came from: seventeen of them quote a round or finding count" (line 101)

**UNPROVABLE** at the stated precision. The session posted 120 inline replies on #1112 on Aug 27 (author `nathanpayne-claude`). A loose matcher (`round N`, `N rounds`, `N findings`, `finding N`, ordinal + round/finding, case-insensitive) hits 18 of them; a stricter reading that excludes replies merely citing an earlier round by number ("same pattern as round 8's …") would drop below 17. Which matcher the page used is not recorded. Weaker form: "about seventeen of them" or "one in seven". Source: `gh api repos/nathanjohnpayne/mergepath/pulls/1112/comments`, author `nathanpayne-claude`, `created_at` 2026-08-27, regex above -> 18.

### R11: Five ordering mechanisms
> "In all, five mechanisms were built to establish which of two workflow invocations happened first, over an API with no atomic primitive for it, and each closed one interleaving while opening another." (line 119); "5, all ordering mechanisms, 3 later removed" (line 147)

**UNPROVABLE.** What counts as one mechanism is a judgment. The owner's freeze comment of 02:55Z names eight: "head pinning, stage tracking, PATCH-by-id, preserved history, evaluation ordering, watermarks, reconciliation, and per-stage timing each closed one interleaving while opening another", and the 21 commit subjects could be grouped as five, six or eight. The "each closed one interleaving while opening another" clause is the owner's contemporaneous assessment, quoted nearly verbatim. Weaker form: "a succession of ordering mechanisms (the freeze comment names eight)". Source: `gh api repos/nathanjohnpayne/mergepath/issues/comments/5556479015`.

### R12: Roughly half the later findings were interactions
> "Findings per round never reached zero and spiked to six in round 6, and roughly half the later ones were interactions between rules added the round before." (line 119)

**UNPROVABLE** for the second clause. The first clause is verified (R51). The "roughly half" is a hand classification; the identical sentence appears in the first draft of mergepath#1200 ("roughly half of the later findings were interactions with rules added in the round before"), written by the same agent the day the PR closed, so it is a repeated belief rather than an independent measurement. Weaker form: "many of the later ones were interactions…". Source: `gh api repos/nathanjohnpayne/mergepath/commits/2e480aac` patch line 30.

### R13: #1139's guard share and the seven extractor holes
> "Fifteen of its 21 findings were about the guard, seven of them successive holes in one flag extractor" (line 131); "Its share of such findings, a third, is higher than [#1189]'s." (line 131)

**UNPROVABLE.** Reading the 21 finding titles, roughly fifteen concern the bootstrap guard or its probe (validate gate flags, fetch base ref, probe the tip, follow continued flags, probe quoted flags, reject empty arguments, probe every invocation, keep the probe active, and so on) and the rest concern manifest declarations and test hygiene, so fifteen is plausible but depends on where "about the guard" is drawn. The author's own replies enumerate the extractor holes as five ("The five findings on this extractor: round 5, 9, 10, 11, 12") and then "the **sixth** way this extractor has validated a subset"; a seventh is not named in the record. "A third" (7/21) and the comparison with #1189's share rest on the R8 classification. Weaker form: "most of its 21 findings were about the guard, six or seven of them successive holes in one flag extractor". Source: `gh api repos/nathanjohnpayne/mergepath/pulls/1139/comments` titles; replies 3887888119, 3887928977.

### R14: The instruments are being built now
> "That is a testable claim: the instruments are being built now, and if they are present and the same pathology recurs, this post is wrong." (line 237)

**UNPROVABLE.** The three control points the operating rules assign the work to are mergepath#1202 (contract ratification at open), #1201 (lineage and escalation menu) and #1199 (reviewer-facing obligations). All three were open on 2026-10-06 with no linked merged PR, and the doc that names them says "None of those exists yet; until one does, these rules bind nothing on their own." Whether anyone is actively building them is not visible from here. Weaker form: "the instruments are tracked as open issues". Source: `gh api repos/nathanjohnpayne/mergepath/issues/1199`, `/1201`, `/1202` -> `state open`; `docs/agents/high-priority-scope-discipline.md` line 7.

### R15: 72 findings across 31 rounds
> "Between them they drew 72 findings from the Codex GitHub App across 31 review rounds." (line 43); "Two pull requests drew 72 Codex findings" (lines 5, 6)

**SUPPORTED.** #1112 has 46 top-level inline comments by `chatgpt-codex-connector[bot]` and 19 review submissions; #1189 has 26 and 12. Source: `gh api --paginate repos/nathanjohnpayne/mergepath/pulls/{1112,1189}/comments` filtered `in_reply_to_id == null` -> 46, 26; `/reviews` -> 19, 12.

### R16: Both closed unmerged, one replaced by a single word
> "Both pull requests closed without merging. One was replaced by a change to a single word." (line 43)

**SUPPORTED.** #1112 and #1189 are `CLOSED` with `mergedAt: null` (closed 2026-09-06T03:40:36Z and 03:30:39Z). #1196's body opens "One word: `conclusion='failure'` → `conclusion='neutral'`" and `Supersedes #1189`. Source: GraphQL `pullRequest(number:…)` state; `gh api repos/nathanjohnpayne/mergepath/pulls/1196 --jq .body`.

### R17: 35 to 2,136, shipped in 377
> "One grew from 35 lines to 2,136 for a requirement that later shipped in 377." (line 5; also lines 15, 22)

**SUPPORTED.** First commit b0b26c3e: +35/−5; #1112 additions at close 2,136; #1197 additions at merge 377. Source: `gh api repos/nathanjohnpayne/mergepath/commits/b0b26c3ed0 --jq .stats`; GraphQL `additions` for 1112 and 1197.

### R18: The five prompts
> "I was asked five times how to proceed" (line 5); "the session asked me how to proceed five times, each time with three options" (line 77); figure nodes "15:45 · 11 rounds", "17:48 · 13 rounds, 15+", "20:16 · 16 rounds, ~25", "21:10 · 17 rounds, ~28", "21:56 · 18 rounds, ~30" with their option labels (lines 81–85)

**SUPPORTED.** The transcript holds six `AskUserQuestion` calls on Aug 27; one at 07:05Z concerns PR #1110 and the five about #1112 are at 15:45:10Z ("hit an 11-round non-convergence pattern"), 17:48:25Z ("13 Codex rounds with 15+ findings"), 20:16:23Z ("16 Codex rounds / ~25 findings"), 21:10:28Z ("17 rounds / ~28 findings"), 21:56:22Z ("18 rounds / ~30 findings total"), each with exactly three options whose labels match the figure's abbreviations (e.g. "Fix the 3 deferred findings, then merge / Merge as-is, file a follow-up issue / Leave PR #1112 open, stop here"). The prompt counts run one above the submission count at each time (10, 12, 15, 16, 17), as the sidebar says. Source: transcript, `assistant` entries with `tool_use.name == "AskUserQuestion"`.

### R19: First option every time, one Recommended
> "I clicked the first option all five times. Only the 17:48 prompt marked it Recommended, with the gloss 'matches what you asked for last time'; at 20:16 the gloss was 'same instruction as before.'" (line 97)

**SUPPORTED.** The recorded answers are "Fix the 3 deferred findings, then merge" (16:06:06Z), "Fix the 2 remaining P2s, then merge (Recommended)" (17:50:57Z), "Fix the last P2, then merge" (20:23:05Z), "Trigger one more Codex round" (21:22:30Z) and "Trigger one more Codex round" (22:20:59Z), each the first listed option. Only the 17:48 prompt's first option carries "(Recommended)", with description ending "matches what you asked for last time"; the 20:16 first option's description ends "same instruction as before". Source: transcript `tool_result` entries matched to the five tool_use ids.

### R20: The free-form lines
> "After the third click, at 20:23, I typed the only free-form instruction of the afternoon: 'Then do one more @codex round.' At 22:28 I pasted a link to one more finding, and a minute later I typed 'fix that and admin merge.'" (line 97); "the two lines I typed on August 27" (line 37)

**SUPPORTED.** Queued-command attachments at `2026-08-27T20:23:53Z` ("Then do one more @codex round") and `22:29:38Z` ("fix that and admin merge"), verbatim; a user entry at `22:28:49Z` reads "One more unresolved issue: https://github.com/nathanjohnpayne/mergepath/pull/1112#pullrequestreview-5046209006" (Codex round 18's review id). The 22:29 line is 49 seconds after the paste. Source: transcript `attachment.type == "queued_command"` entries.

### R21: Never merged, untouched nine days
> "The merge never happened, and the pull request sat untouched for nine days." (line 97); "then idle 9 days" (line 60)

**SUPPORTED.** `mergedAt` null. The issue timeline for #1112 has no event between 2026-08-28 and 2026-09-05 inclusive; the last Aug 27 activity is Codex round 19 at 22:46:07Z (last commit 22:34:59Z) and the next is the merge of main at 2026-09-06T03:29:24Z, 9 days 4 hours 43 minutes later. Source: `gh api --paginate repos/nathanjohnpayne/mergepath/issues/1112/timeline` filtered on the window -> empty; `pulls/1112/commits`.

### R22: What the prompts said and did not say
> "the 17:48 prompt said the pull request had already introduced two regressions of its own, and the 20:16 prompt called the next finding 'the same class as several already-fixed spots.' … Not one quoted a line count … Four of the five menus were neutral" (line 99)

**SUPPORTED.** 17:48 prompt: "three of them P1 (including two regressions this PR itself introduced)"; 20:16 prompt: "a nested-path gap in _remove_orphans, same class as several already-fixed spots"; no prompt text or option mentions a line count; only the 17:48 prompt marks an option Recommended; no option in any prompt offers removal, weakening, returning to the issue, or recutting. Source: transcript.

### R23: Every prompt said the loop was not converging
> "Every one said the loop was not converging" (line 99)

**SUPPORTED.** 15:45: "an 11-round non-convergence pattern"; 20:16: "still not converging"; 21:10: "still finding new issues each time"; 21:56: "still finding new issues". The 17:48 prompt expresses it only through counts ("13 Codex rounds with 15+ findings, three of them P1") without the word, which is a fair paraphrase. Source: transcript.

### R24: The clean pass posted as a comment
> "The session's own prompts and replies counted one clean pass that Codex posted as a comment rather than a review, so the round counts quoted in the prompt figure run one higher than this rule gives" (line 31)

**SUPPORTED.** Issue comment 5434900998 by `chatgpt-codex-connector[bot]` at `2026-08-27T05:45:14Z`: "Codex Review: Didn't find any major issues. Delightful! Reviewed commit: `8da36cf294`". It is not on the reviews endpoint. Every prompt's quoted round count is exactly the submission count plus one (R18). Source: `gh api repos/nathanjohnpayne/mergepath/issues/1112/comments`.

### R25: Publication date
> `date: 2026-09-06` (line 10)

**SUPPORTED.** The post first landed on nathanpaynedotcom `main` in commit f715b81 "feat(blog): Every Reviewer Was Right, and the Pull Request Was Still Wrong (#1005)" dated 2026-09-06 01:10:13 −0700. Source: `git -C ~/GitHub/nathanpaynedotcom log --format='%h %ad %s' -- src/content/blog/every-reviewer-was-right.md`.

### R26: Eleven days
> "Over eleven days in late August and early September" (line 43)

**SUPPORTED.** #1112 was created 2026-08-27 and closed 2026-09-06; #1189 was created 2026-09-05 and closed 2026-09-06. August 27 through September 6 is eleven calendar days inclusive (ten elapsed). Source: GraphQL `createdAt`/`closedAt`.

### R27: What #1056 proposed and the 32-line first commit
> "It implemented [#1056]… The issue proposed the whole implementation in one line, the commit hash in the initial commit's subject and a trailer, and the first commit did that in 32 lines." (line 49)

**SUPPORTED.** The issue body's proposal lists "(1) Put it in the commit message: `Initial commit (bootstrapped from mergepath@<sha>)`" and "(2) Add a `Source:` … trailer" and concludes "(1) and (2) together are probably right". The first commit changed `scripts/bootstrap/template-mirror.sh` by +29/−3, i.e. 32 changed lines in the script; the test file added +6/−2, which is why the table reports +35/−5 for the whole commit. The closing comment on Sep 6 uses the same "32 lines". Source: `gh api repos/nathanjohnpayne/mergepath/issues/1056 --jq .body`; `commits/b0b26c3ed0 --jq '.files[]'`.

### R28: What #1188 described
> "a diagnostic check-run that the merge workflow publishes on an infrastructure error could only be published as a failure. Nothing published a success for the same name, so one transient error left a pull request's head red permanently, and a local guard then demanded a break-glass merge for a pull request with every required check green." (line 51)

**SUPPORTED** as a description of the issue, which is the page's framing. #1188's body: "POSTs a head-pinned `approval-merge-continuation` check-run with `conclusion: failure`, and nothing anywhere posts a success for that name … stuck at `mergeStateStatus: UNSTABLE` … with every required context green … `scripts/hooks/gh-pr-guard.sh` demands a break-glass merge for an `UNSTABLE` PR". The guard script at the Sep 5 ref documents exactly that (`mergeStateStatus` UNSTABLE blocks unless `BREAK_GLASS_MERGE_STATE=1`). Source: `gh api repos/nathanjohnpayne/mergepath/issues/1188 --jq .body`; `git -C ~/GitHub/mergepath show 5aea5db8:scripts/hooks/gh-pr-guard.sh | grep -n UNSTABLE`.

### R29: First-commit sizes
> "First commit | +35 / −5 | +275 / −7" (line 55)

**SUPPORTED.** b0b26c3e: additions 35, deletions 5, two files; af513e96: additions 275, deletions 7, three files. Each PR was created with only that commit on the branch (#1112 created 02:13:30Z, second commit 02:57:51Z; #1189 created 05:03:31Z, second commit 05:18:57Z), so the open-time diff equals the first commit. Source: `gh api repos/nathanjohnpayne/mergepath/commits/{b0b26c3ed0,af513e9678} --jq .stats`; `pulls/N/commits`.

### R30: Sizes at close
> "At close | +2,136 / −17 | +1,179 / −19" (line 56)

**SUPPORTED.** GraphQL `additions`/`deletions`: 2136/17 and 1179/19, which GitHub computes against the merge base at the time of reading, as the sidebar describes. Source: `gh api graphql` `pullRequest(number:1112){additions deletions}` and 1189.

### R31: Commit counts
> "Commits | 39 | 21" (line 57)

**SUPPORTED.** `commits.totalCount` 39 and 21; the REST commit lists have the same lengths (including merge commits). Source: GraphQL; `gh api --paginate repos/nathanjohnpayne/mergepath/pulls/{1112,1189}/commits | jq length`.

### R32: Codex rounds
> "Codex review rounds | 19 | 12" (line 58); "Nineteen rounds" (line 22)

**SUPPORTED.** Reviews by `chatgpt-codex-connector[bot]`: 19 on #1112 (02:20:33Z to 22:46:07Z, all COMMENTED) and 12 on #1189 (2026-09-05T05:13:10Z to 2026-09-06T03:22:34Z). Source: `gh api --paginate repos/nathanjohnpayne/mergepath/pulls/N/reviews`.

### R33: Findings and P1 counts
> "Codex findings, of which P1 | 46, 17 | 26, 3" (line 59); "forty-six findings" (line 22)

**SUPPORTED.** Top-level Codex inline comments: #1112 46 (P1 badge on 17, P2 on 29); #1189 26 (P1 on 3, P2 on 23). Source: `pulls/N/comments`, `in_reply_to_id == null`, body matched on `P[0-9] Badge`.

### R34: Active review time
> "Active review time | 21 hours, then idle 9 days | 22 hours" (line 60)

**SUPPORTED.** #1112: from the 01:36:07Z task message to Codex round 19 at 22:46:07Z is 21 h 10 m (from PR creation it is 20 h 33 m; either rounds to 21); idle interval per R21. #1189: created 2026-09-05T05:03:31Z, closed 2026-09-06T03:30:39Z, 22 h 27 m. Source: transcript; `pulls/1112/reviews`; GraphQL `createdAt`/`closedAt`.

### R35: The replacements
> "Replacement | [#1197], +377, merged in 68 minutes | [#1196], +54, merged in 20 minutes" (line 61)

**SUPPORTED.** #1197: created 2026-09-06T04:00:01Z, merged 05:08:14Z (68 m 13 s), additions 377. #1196: created 03:29:45Z, merged 03:49:53Z (20 m 8 s), additions 54. Source: GraphQL.

### R36: Round 4
> "The pivot is round 4 … [require the source to be clean before accepting its hash]" (line 65); figure "Round 4: 'require the source to be clean'" (line 178)

**SUPPORTED.** discussion_r3868677507 was created 2026-08-27T04:17:48Z inside review 5037189983, the fourth Codex submission; it is a P2 titled "Validate cleanliness of the selected source root" and ends "require the selected `source_root` to be clean before accepting its SHA, or make preflight validate th[e same root]". The link text paraphrases rather than quotes, which is fine. Source: `gh api repos/nathanjohnpayne/mergepath/pulls/comments/3868677507`.

### R37: Rounds 1 to 3 and the two kept checks
> "The first three rounds found genuine defects in the original ask, a wrong or unresolvable hash in three different ways; all were fixed, and the recut kept two of the resulting checks." (line 65)

**SUPPORTED.** Rounds 1–3 findings include "Reject SHA discovery from an enclosing repository" (R1 P1), "Avoid attributing fork commits to canonical mergepath" (R2 P1) and "Confirm HEAD is in the canonical remote history" (R3 P1), three distinct ways the recorded hash could be wrong or not resolvable, alongside docs, spec and test-identity items. #1197's first commit requires a canonical origin, and commit 46380923 "make upstream reachability part of attribution eligibility" restores the reachability check; the CodeRabbit rebuttal on #1197 names the kept conditions as "canonical origin, clean status, upstream-reachable HEAD". Source: `pulls/1112/comments` rounds 1–3 titles; `pulls/1197/commits`; reply 2026-09-06T04:54:28Z on comment 3942971244.

### R38: Round 8 and `--delete`
> "The break is round 8 … [validate the resumed target before attributing it] … The authoring session instead [added `--delete` to the rsync invocation] and built a residue-reconciliation engine around it." (line 67)

**SUPPORTED.** discussion_r3869470508 (07:05:32Z) is in review 5038097708, the eighth submission, a P1 titled "Validate the resumed target before attributing its source SHA". The reply discussion_r3872275126 (13:43:15Z, nathanpayne-claude) begins "Fixed in 1b321fe. Added `--delete` to the rsync invocation"; commit 1b321fee "reconcile resumed targets and widen the cleanliness exclude set" and e0262bee "reconcile excluded residue on resume" follow. Source: `pulls/comments/{3869470508,3872275126}`; `pulls/1112/commits`.

### R39: Round 12, the round-15 fix, and the filesystem root
> "In round 12, when the target directory happened to be named after an excluded path, [the engine deleted the entire target]… After a round-15 trailing-slash fix, CodeRabbit noticed that a target of `/` now normalized to an empty string, so rsync [ran with `--delete` against the filesystem root]." (line 69)

**SUPPORTED.** discussion_r3874150864 (17:27:55Z) is in the twelfth review, P1 "Keep reconciliation below the target root": "this command recursively deletes the entire target—including resume state, an initialized `.git`, or operator work". Round 15 (19:37:40Z) raised P1 "Strip every trailing separator before deletion"; commit 7dba950e "strip ALL trailing separators, not just one" landed 20:14:15Z; CodeRabbit's discussion_r3875527997 at 20:18:31Z: "If a caller passes `/` or `//` as the target, `target` becomes the empty string … the final `rsync -a --delete "$source_root/" "/"` runs against the filesystem root." Source: `pulls/comments/{3874150864,3875527997}`; `pulls/1112/commits`.

### R40: Ten data-loss findings, nine P1s
> "Ten data-loss findings, nine of them P1s, every one real, every one in code that did not exist when the pull request opened, and every one fixed with a regression test." (line 69); "Rounds 11 through 17 then found ten data-loss defects in that engine" (line 175)

**SUPPORTED** with the matcher stated. Codex P1 findings in rounds 11–17 number nine: R11 "Preserve every bootstrap resume sidecar", R11 "Prune protected worktree roots during reconciliation", R12 "Keep reconciliation below the target root", R13 "Reject symlinked target roots before enabling deletion", R14 "Normalize the target before protecting root paths", R15 "Strip every trailing separator before deletion", R16 "Normalize the target in orphan reconciliation", R16 "Preserve gitfiles when deleting resumed-target residue", R17 "Escape target paths before using find patterns"; CodeRabbit's filesystem-root finding (between rounds 15 and 16) makes ten. All sit in the reconciliation/deletion code introduced from commit 1b321fee (13:42Z) onward, after the PR opened. The first author reply under each of the ten mentions a test or regression ("Added a regression…", "mutation-tested…"). "Data-loss" is the page's label; the P1 count and location are reproducible. Source: `pulls/1112/comments` joined to reviews; replies with `in_reply_to_id` in the ten ids.

### R41: File growth and 61×
> "By the end, the bootstrap script had grown from 1,498 lines to 2,102 and its test file from 2,088 to 3,607; the diff was 61 times the size of the first commit." (line 71)

**SUPPORTED.** `scripts/bootstrap/template-mirror.sh`: 1498 lines at 95f7944c (parent of the first commit), 2102 at 40faf27e (head at close); `tests/test_bootstrap_template_mirror.sh`: 2088 and 3607. 2136 / 35 = 61.03. Source: `gh api -H 'Accept: application/vnd.github.raw' repos/nathanjohnpayne/mergepath/contents/<path>?ref=<sha> | wc -l`.

### R42: Rounds 1 through 10 with no input
> "After the task list at 01:36 UTC on August 27, rounds 1 through 10 ran with no input from me." (line 77)

**SUPPORTED** for #1112. The human's task message is at 01:36:07Z; Codex round 10 was submitted at 15:27:18Z and the first #1112 prompt at 15:45:10Z; no human text or answer concerning #1112 appears in between. For completeness, the human did answer one prompt at 13:29:29Z, about PR #1110's break-glass merge, which is input to the session but not about the provenance change. Source: transcript user, attachment and tool_result entries dated 2026-08-27 before 15:45Z.

### R43: Three deferrals, one phrase
> "its three non-convergence deferrals, correct each time, called the findings 'new, distinct, genuinely valid edge cases'" (line 101); "[#1112]'s 'new, distinct, genuinely valid' framing" (line 206)

**SUPPORTED.** Six inline replies by nathanpayne-claude contain "new, distinct, genuinely valid", posted in three batches: 15:42:55–58Z (three replies), 17:46:36–37Z (two), 20:14:46Z (one), each batch a deferral of the round's remaining findings. Source: `gh api repos/nathanjohnpayne/mergepath/pulls/1112/comments` body match.

### R44: The September 6 messages
> "Everything else I typed to the session about [#1112] came on September 6: an instruction to resolve merge conflicts, then, after I read the diff, the decision that closed it, the contract for the recut, and two notes on it. In the decision I wrote that an issue labeled small should not need changes capable of deleting repositories and operator work, and that once it did, preserving the branch because a lot of correctness work had gone into it was the wrong optimization." (line 105)

**SUPPORTED.** Human entries on Sep 6: 03:16:50Z "Resolve your merge conflicts, check back in to see whether your work has been eclipsed, then proceed."; 03:34:48Z (queued) "I would not merge #1112 in its current form…", ending "The strongest warning sign is that an issue labeled `size:S` resulted in a PR where review is finding credible ways to delete Git repositories and operator work. At that point, preserving the branch because a lot of correctness work has gone into it is the wrong optimization."; 03:38:29Z "Yes. I agree with the clean-tree check, with one important framing…" (the contract); 04:08:35Z "I looked through #1197 first…" and 04:21:24Z "Once the consumer-safety suite passes…" (the two notes). Source: transcript.

### R45: #1197's findings and dispositions
> "two real violations of the stated clean-tree check, fixed, and one about an adversarial caller's environment, rebutted as outside the contract" (line 107); figure "two fixed, one rebutted" (line 162)

**SUPPORTED.** Codex round 1 P2 "Force untracked files into the source cleanliness check" fixed by 41017ca0 "pin --untracked-files=all on the source cleanliness check"; round 2 P2 "Force dirty submodules into the source cleanliness check" fixed by d796943f "pin --ignore-submodules=none"; CodeRabbit 3942971244 (exported `GIT_DIR` redirecting `git -C`) answered 04:54:28Z "Rebutting, not fixing… a theoretical adversarial-CALLER-environment concern, not a violation of any of the three eligibility conditions", and CodeRabbit agreed. Source: `pulls/1197/comments`, `/commits`.

### R46: #1188's filing and the 64 minutes
> "[#1188], the issue, was filed by an agent at 03:59 UTC on September 5 and listed three shapes for a fix. The third was to publish the diagnostic as `neutral` instead of `failure`, visible but non-blocking, which the issue called 'the cheapest option and closest to what the record actually means.' Sixty-four minutes later the pull request opened with option one" (line 113)

**SUPPORTED.** Issue #1188: author `nathanpayne-claude`, created 2026-09-05T03:59:55Z; "Shape of a fix" lists 1 (publish success from the same producer), 2 (self-superseding), 3 ("emit `neutral` rather than `failure`… This is the cheapest option and closest to what the record actually means"). #1189 created 05:03:31Z, 63 m 36 s later, implementing a clearing path (shape 1). Source: `gh api repos/nathanjohnpayne/mergepath/issues/1188`; GraphQL `createdAt` for 1189.

### R47: The first commit's header
> "the first commit's header rejected the cheap option explicitly: 'The failure conclusion stays `failure` rather than softening to `neutral`. "We could not verify this is safe to merge" should block; the defect was the missing exit, not the severity.'" (line 113); "self-ratified in a code comment before any reviewer saw it" (line 16)

**SUPPORTED.** The patch to `scripts/workflow/report-approval-continuation-failures.sh` in af513e96 adds lines 26–28 with exactly that text. Commit time 05:03:13Z precedes CodeRabbit's first finding (05:07:31Z) and Codex round 1 (05:13:10Z). Source: `gh api repos/nathanjohnpayne/mergepath/commits/af513e9678 --jq '.files[].patch' | grep -n softening`.

### R48: Not a required check anywhere checked
> "the diagnostic is not a required status check on the hub or on any of the three consumer repositories checked. It blocked nothing except our own guard script." (line 115)

**SUPPORTED.** Required contexts on `main` today: mergepath (CodeRabbit unresolved blocking findings, Codex P1 unresolved threads, Label Gate, Merge clearance gate, Self-Review Required, lint), fiveacross (the first five), nathanpaynedotcom (those plus build-and-test, lint), matchline (those plus four node/emulator jobs and lint); none includes `approval-merge-continuation`. #1196's body records the same check on Sep 6: "required context? mergepath: 0 fiveacross: 0 nathanpaynedotcom: 0 matchline: 0". The guard script fails closed on UNSTABLE (R28). Source: `gh api repos/nathanjohnpayne/<repo>/branches/main --jq .protection.required_status_checks.contexts`; `pulls/1196` body.

### R49: Round one's two false greens
> "The first round found two real false greens: the clearing path created a competing success run instead of updating the failure, and a clear was not pinned to the head that produced the verdict." (line 117)

**SUPPORTED.** Codex round 1 (05:13:10Z) P1 "Pin clears to the head that produced the verdict"; CodeRabbit's top-level finding at 05:07:31Z, "Update the selected failing check run instead of creating a new one". The second is CodeRabbit's rather than Codex's, consistent with the sidebar's both-reviewer finding definition; commit 9b1b7e4e "update the selected diagnostic instead of racing it" (05:38Z) answers it. Source: `pulls/1189/comments`.

### R50: Deferrals, the overrule, and the concession
> "The authoring session deferred two of them to follow-up issues, with cost arguments. The external reviewer … [overruled both]: 'Both affect the core merge-gating guarantee and should be resolved before merge.' The session complied, and its [note on complying] conceded the point: 'The review overruled my deferral and it was right to.'" (line 117)

**SUPPORTED.** Issues #1190 (06:13:32Z) and #1191 (06:37:19Z), both by nathanpayne-claude. Review 5120227951 by `nathanpayne-codex`, 06:54:35Z, "Automated Phase 4b review": "The clearing mechanism still has two concurrency holes… Both affect the core merge-gating guarantee and should be resolved before merge." (state now DISMISSED, as happens when a later review supersedes it). Issue comment 5553441393 (17:12:41Z): "**Both P1s implemented. The review overruled my deferral and it was right to.** I had filed these as #1190 and #1191 and argued cost-versus-likelihood." Source: `gh api repos/nathanjohnpayne/mergepath/pulls/1189/reviews/5120227951`; `issues/comments/5553441393`; `issues/{1190,1191}`.

### R51: 95 minutes, and six in round 6
> "The watermark the review had demanded re-opened, in the opposite direction, the race over which conclusion buries which, and was split back out 95 minutes later… Findings per round never reached zero and spiked to six in round 6" (line 119)

**SUPPORTED.** Commit 8f109ddc "record clean verdicts so a late stale failure cannot outlive them" at 17:07:39Z; commit aae979e8 "split the clean-verdict watermark out to #1191" at 18:42:28Z; 94 m 49 s. Codex findings per round on #1189: 4, 1, 3, 1, 1, 6, 1, 2, 1, 2, 1, 3. The same comment 5553441393 says "creating that watermark re-opened the burial race in the opposite direction". Source: `pulls/1189/commits`; `pulls/1189/comments` grouped by review.

### R52: The freeze, the approval, and the two P1s
> "At 02:55 UTC on September 6, the pull request's contract was [frozen to five guarantees], with a false red left by concurrent invocations declared an accepted residual, and the external reviewer approved with zero findings. Then Codex reviewed against the frozen contract and found two more real P1s inside it" (line 121); "the next round found two real false-green defects inside the frozen contract" (line 16)

**SUPPORTED.** Issue comment 5556479015 by nathanjohnpayne at 02:55:17Z enumerates five guarantees, the fifth being "Arbitrary concurrent invocation/publication order may still leave a false red. That is an accepted residual owned by #1191"; commit a028f976 "state the contract as five guarantees" at 02:55:56Z. Review 5123903482 by `nathanpayne-codex` at 03:07:19Z on head a028f976: "Findings: none". Codex round 12 at 03:22:34Z posted r3942818732 (P1, runner clock ahead of GitHub's clears an unobserved failure) and r3942818738 (P1, base advanced under an unchanged head authorizes an unevaluated clear). One nuance for the key takeaway's "the next round": Codex round 11 (03:08:11Z, one P2 "Withhold the head on pre-gate policy drift"), requested at 03:01:53Z before the approval posted, sits between the approval and round 12. Source: `issues/comments/5556479015`; `pulls/1189/reviews`; `pulls/comments/{3942818732,3942818738}`.

### R53: Seven minutes, one word, twenty minutes
> "Seven minutes after that round, [#1196] opened. One word: `failure` became `neutral`… It merged in twenty minutes." (line 123)

**SUPPORTED.** Round 12 at 03:22:34Z; #1196 created 03:29:45Z (7 m 11 s); its single commit 3e4dbc5a "publish the continuation diagnostic as neutral, not failure"; merged 03:49:53Z (20 m 8 s). Source: GraphQL; `pulls/1196/commits`.

### R54: The two round-count controls
> "[#1084] ran 19 rounds, drew 66 findings, and merged. [#925] ran 18 and merged at 3,369 lines." (line 129)

**SUPPORTED.** #1084: 19 Codex reviews; 62 Codex + 4 CodeRabbit top-level findings = 66; MERGED 2026-08-28T03:01:45Z. #925: 18 Codex reviews; additions 3369; MERGED 2026-08-12. Source: `pulls/{1084,925}/reviews`, `/comments`; GraphQL.

### R55: #1139's shape and the two quotes
> "[#1139] is an 85-line routing change whose author volunteered a bootstrap guard on top of it… 'the fifth instance of one root cause,' the author wrote, and then 'the sixth way this extractor has validated a subset.'" (line 131)

**SUPPORTED.** Additions 85; PR body: "Behavioural bootstrap guard added so the trap that bit twice cannot recur". Reply 3887888119 (22:52:04Z): "this is the fifth instance of one root cause, which is worth naming rather than patching again"; reply 3887928977 (23:15:19Z, to a CodeRabbit finding): "This is the **sixth** way this extractor has validated a subset". Source: GraphQL; `gh api repos/nathanjohnpayne/mergepath/pulls/1139 --jq .body`; `pulls/1139/comments`.

### R56: Both frozen contracts drew findings
> "Both frozen contracts drew further valid findings, the two P1s inside [#1189]'s five guarantees and the two clean-tree violations inside [#1197]'s three checks." (line 133)

**SUPPORTED.** See R52 for #1189 and R45 for #1197. Source: as cited there.

### R57: Growth ratios
> "[#1112] grew 61× from open to close, and the largest growth on any of the 19 merged high-round pull requests is 11×… [#1189] grew 4.3×… 275 lines for an issue whose cheapest listed option was one word" (line 135)

**SUPPORTED.** 2136/35 = 61.0; 1179/275 = 4.29. For the 19 merged PRs in the window (687, 795, 797, 849, 852, 867, 886, 892, 925, 1018, 1032, 1054, 1074, 1084, 1105, 1121, 1139, 1176, 1179), using the additions of the commits present at creation as the open size, the largest ratio is #687 at 11.0× (322 to 3,535); next is #925 at 9.2×. Seventeen of the nineteen opened on exactly one commit, so the approximation is exact for them; #1018 and #1179 have no commit dated before `createdAt` (rebased history) and use the first listed commit. Source: `gh api graphql` with `commits(first:6){nodes{commit{committedDate additions}}}` per PR, scratchpad `growth.json`.

### R58: The rounds and findings columns
> "| [#1176] | 11 | 30 |… | [#1139] | 11 | 21 |… | [#1084] | 19 | 66 |… | [#1112] | 19 | 51 |… | [#1189] | 12 | 27 |" (lines 143–147)

**SUPPORTED.** Codex reviews 11, 11, 19, 19, 12. Top-level findings, both bots: 26+4, 19+2, 62+4, 46+5, 26+1. Source: `pulls/N/reviews`, `pulls/N/comments`.

### R59: The mechanism-deleted column and #1139's peak
> "[#1176] | … | yes, after round 7 | merged"; "[#1139] | … | yes, after round 10 | merged at +85, from a peak of +286"; "[#1112] | … | never | closed"; "[#1189] | … | twice, at the wrong layer | closed" (lines 143–147); "That move never happened on the provenance change. It happened twice on the diagnostic-clearing change" (line 151)

**SUPPORTED.** #1176: reply 3908785467 (21:57:00Z) answers comment 3908728530 in review 5083418984, the seventh Codex submission (21:48:02Z; round 8 at 22:04:46Z). #1139: reply 3887965208 (23:34:35Z) answers a finding in review 5059450488, the tenth (23:31:08Z); `compare/main...84d4fefa` (the head before the split) is +286/−42 and the split commit 0df6c7f6 "split the bootstrap guard out; keep the gate change" drops it to +74, finishing at +85. #1112's 39 commit subjects contain no removal or split. #1189: aae979e8 "split the clean-verdict watermark out to #1191" and 74acba06 "reduce to the narrow sequential guarantee" are two removals, both of ordering machinery beneath the clearing arm. Source: `pulls/N/comments` joined to reviews; `gh api repos/nathanjohnpayne/mergepath/compare/main...84d4fefa`; commit subjects.

### R60: The three author quotes
> "[#1176], answering round 7: 'removing the thing that produced this finding rather than patching it a fourth time.' [#1139], answering round 10, in a reply that counted every reviewer's pass rather than Codex's alone: 'I am splitting the guard out rather than taking a fourteenth round on it.' [#1084]…: 'Both fixed, by deleting the mechanism that caused them,' though its hand-rolled field reader stayed and drew findings until the merge" (line 149)

**SUPPORTED** for the quotations and the reader (the "round 12" attribution is R2). Reply 3908785467: "Fixed in 08bea90—by removing the thing that produced this finding rather than patching it a fourth time." Reply 3887965208: "**Valid, and I am splitting the guard out rather than taking a fourteenth round on it.**", which also says "the previous twelve rounds" and "round 13" at a moment when Codex had submitted ten, so it counts CodeRabbit's passes too. Reply 3837388851: "**Both fixed, by deleting the mechanism that caused them.**" #1084's round 19 (03:10:48Z, 2026-08-28) finding is "Reject YAML merge keys before honoring never", about the policy-file reader, nine minutes before merge. Source: `pulls/{1176,1139,1084}/comments`; `pulls/1084/reviews`.

### R61: The natural-experiment figure
> "ten days apart. #1112 opened at 35 added lines, closed at 2,136 after 19 Codex rounds and 46 Codex findings, 51 counting CodeRabbit… #1197 was 377 lines, drew 2 Codex findings and 1 CodeRabbit finding in 2 Codex rounds, and merged 68 minutes after opening." (line 155; nodes lines 157–163)

**SUPPORTED** except node B1's "opened at +377" (R3). #1112 Aug 27, #1197 Sep 6; 2 Codex reviews on #1197 with one P2 each; 1 CodeRabbit top-level; 68 m 13 s. Source: as in R15, R30, R35, R45.

### R62: The two accepted residuals
> "[#1084] merged while its hand-rolled parser was still drawing findings, because the pull request had bounded the cost of a wrong answer to a skipped review wait, not a skipped review. [#1196] shipped on an assumption about how GitHub treats `neutral` that could not be verified in advance, with the failure mode stated as today's behavior and the remedy as reverting one word." (line 202)

**SUPPORTED.** #1084 reply 3836857385 (2026-08-22T19:42:22Z): "the shipped `.coderabbit.yml` sets `auto_review.enabled: true`, so the App starts on PR open, before this decision runs. So the knob gates **Phase 2.5**—the agent's wait and disposition—and nothing more." #1196 body: "I could not verify `neutral` directly… **If the assumption is wrong**, the head stays `UNSTABLE`—exactly today's behaviour, no worse—and the remedy is reverting one word." Source: `pulls/1084/comments`; `pulls/1196` body.

### R63: The ten-round escalation policy
> "[#1112] ran past a ten-round escalation policy that was in force throughout." (line 208)

**SUPPORTED**, with a provenance note. The transcript records the session reading, at 14:11:33Z on Aug 27, a memory file containing "Owner directive, 2026-08-19: **'From now on, use @codex for 10 rounds, and then use the automated 4b if you don't get approval by then.'**", and the session's own text at 13:44Z says "this is the last round before the owner's 10-round budget requires falling back to Phase 4b"; the 15:45 prompt's first option reads "Continue the loop past the 10-round budget for this PR specifically". So a ten-round owner policy was in force and was run past. The repository's configuration file is a different story: `.github/review-policy.yml` carried `codex.max_review_rounds: 2` throughout Aug 27 and mergepath#1084 raised it to 10 at 2026-08-28T03:01Z, after #1112's nineteenth round. The page's wording ("escalation policy") does not claim the file, so no change is required; "owner-set ten-round budget" would be the precise form. Source: transcript; `git -C ~/GitHub/mergepath log --format='%h %ad %s' --date=iso -G'max_review_rounds:' -- .github/review-policy.yml` -> 42195b69 2026-08-27 20:01:44 −0700 (#1084).

### R64: The escalation figure's numbers
> "the implementation had added four guarantees, canonical origin, reachable HEAD, clean tree and configuration-independent cleanliness… the diff had grown from 35 lines to 1,315" (line 210); "diff +1,315, opened at +35" (line 214)

**SUPPORTED.** `compare/main...2885f0df` (the head Codex round 12 reviewed) has merge base 78788302 and sums to +1315/−17 over seven files. Commit bab042ad "docs(bootstrap): update the canonical-source spec to four checks" (05:08:46Z) and the later check names (canonical origin, remote-history containment, clean tree, config pins) support "four guarantees". Source: `gh api repos/nathanjohnpayne/mergepath/compare/main...2885f0df`; `pulls/1112/commits`.

### R65: The operating rules
> "The operating rules that came out of this put the decision rights at the points they govern" (line 229)

**SUPPORTED.** mergepath#1200 "docs: operating rules for priority:high work, derived from the #1189 failure", created 2026-09-06T05:11:48Z, merged 2026-09-07T16:49:06Z, adds `docs/agents/high-priority-scope-discipline.md`, whose control-point table assigns ratification, lineage and reviewer obligations to #1202, #1201 and #1199. Source: `gh api repos/nathanjohnpayne/mergepath/pulls/1200`; `docs/agents/high-priority-scope-discipline.md` lines 7, 22–26.

### R66: The first draft's ten rounds and seventeen commits
> "The first draft of those rules said [#1189] ran ten rounds and seventeen commits; the API says twelve and twenty-one, and Codex caught it in its first round." (line 231)

**SUPPORTED.** The first commit on #1200 (2e480aac) says "#1189 failure (ten review rounds, seventeen commits, closed" and "#1189 spent seventeen commits and ten review rounds". Codex round 1 on #1200 (05:17:46Z) posted P2 "Correct the review-round evidence: The motivating evidence is internally inconsistent: it claims ten review rounds but supplies only nine per-round counts"; round 2 (05:29:53Z) notes "The corrected discipline document now reports twenty-one commits and twelve Codex rounds". The API gives 12 and 21 (R31, R32). Source: `gh api repos/nathanjohnpayne/mergepath/commits/2e480aac --jq '.files[].patch'`; `pulls/1200/comments`.

### R67: The one-higher numbering and the reader
> "the first published version of this post numbered the provenance change's later rounds the way the session's prompts counted them, one higher than the rule in the sidebar, until a reader's review caught it" (line 231)

**SUPPORTED.** nathanpaynedotcom#1007 (merged 2026-09-07T02:23:28Z, commit fba75a0 "correct round numbering and figure diff size"): "The #1112 narrative's round numbers after 05:45 UTC were one too high: Codex posted one clean pass that morning as an issue comment, not a review submission… Renumbered throughout". The PR body attributes the pass to "a second reader's review of the published post, plus two factual corrections that checking that review against the GitHub API surfaced", so the reader's review prompted the check rather than naming the off-by-one itself; "caught it" is a fair compression. Source: `gh api repos/nathanjohnpayne/nathanpaynedotcom/pulls/1007 --jq .body`; `git log` on the post file.

### R68: The cross-reference to the earlier review post
> "[The last post](/blog/perfect-score-wrong-axis/) on this site about review measured closure when it cared about coverage" (line 235)

**SUPPORTED.** `https://nathanpayne.com/blog/perfect-score-wrong-axis/` returns 200; its abstract reads "A perfect disposition record measures closure—how completely you resolved the findings raised. It says nothing about coverage". Source: `curl -sI`; page text grep for closure/coverage.

### R69: Other links
> "[Mergepath](/blog/agent-approval-workflow-genesis-of-mergepath/)" (line 43); `image: "/og/blog/every-reviewer-was-right.png"` (line 12)

**SUPPORTED.** Both return 200 (`text/html`; `image/png`). Source: `curl -sI -o /dev/null -w '%{http_code} %{content_type}'`.

### R70: The fleet comparison's scope and the 26
> "The fleet comparison covers every pull request with eight or more Codex review rounds opened between July 4 and September 6. Across the repository's full history at publication there were 26, and the two closed pull requests here are still the only ones that did not merge." (line 37)

**SUPPORTED.** At a 2026-09-06 cutoff, 26 closed PRs have eight or more Codex review submissions, of which 24 merged and {1112, 1189} closed unmerged. On 2026-10-06 the count is 40 and the unmerged subset is still exactly {1112, 1189}, so "still" holds. Method and sources as in R7.

### R71: 195 findings
> "a single-rater hand pass over 195 findings on five pull requests" (line 33)

**SUPPORTED.** Top-level findings from both bots: #1112 51, #1189 27, #1084 66, #1176 30, #1139 21; sum 195, matching the table's "Findings, Both Reviewers" column. Source: `pulls/N/comments`.

### R72: Self-ratified before any reviewer saw it
> "that requirement had been self-ratified in a code comment before any reviewer saw it" (line 16)

**SUPPORTED.** See R47: the header comment is in the first commit at 05:03:13Z; the earliest reviewer activity is CodeRabbit at 05:07:31Z and Codex at 05:13:10Z. Source: `commits/af513e9678`; `pulls/1189/comments`, `/reviews`.

## Fixes applied

Applied on 2026-10-06 to `src/content/blog/every-reviewer-was-right.md` on `claude/correctness-pass-2026-10-06`, per `FIX-BRIEF.md`. No test assertion pins this page's wording, figures or reading time (`tests/blog-chronology.test.js` and `tests/helpers/blog-editorial-order.js` reference only the slug for ordering), so no test was changed. Vale at error level: clean before and after. No text was cut for length, so `scripts/verify-brevity.py` was not run.

- R1: "applied by a backlog audit nine days after the pull request opened" -> "eight days after the pull request opened" (line 231).
- R2: "after Codex rounds 7, 10 and 12" -> "7, 10 and 13" (keyTakeaways, line 14); "partly, after round 12" -> "partly, after round 13" (table, line 145); "#1084, answering round 12:" -> "answering round 13:" (line 149).
- R3: figure node B1 "opened at +377" -> "opened at +255, merged at +377" (line 161); the same figure's description "#1197 was 377 lines" -> "#1197 opened at 255 lines and merged at 377" (line 155), so the attribute and the node agree.
- R4: sidebar "using the four dispositions the repository's own rule 2 names:" -> "using four categories of my own, built on the three dispositions the repository's rule 2 names (required, valid but adjacent, rebutted):" (line 33).
- R5: "Under that contract the next round still drew three findings:" -> "Under that contract, two Codex rounds and a CodeRabbit pass still drew three findings:" (line 107).
- R6: "the size of the diff does not appear in the record until September 6, after I had read it myself" -> "the session's own text first states the size of the diff on September 6, after I had read it myself" (line 99); scoped to the transcript, which is what the record supports.
- R7: "Of the 507 closed pull requests in the repository's history, 15 closed unmerged." -> "Of the 507 pull requests closed by 2026-09-06, 15 closed unmerged." (line 127); dated to when it was true, keeping the argument intact. The 26 / 21 / 19 in the following sentences inherit the date.
- R14: "the instruments are being built now, and if they are present and the same pathology recurs" -> "the instruments are tracked as open issues, and if they are built and the same pathology recurs" (line 237).
- R63 (SUPPORTED, precision note from the audit): "ran past a ten-round escalation policy that was in force throughout" -> "ran past an owner-set ten-round budget that was in force throughout" (line 208), naming the source of the ten as the owner directive rather than the repository's policy file.
- R8: left as is; the table caption already says "approximate and single-rater".
- R9: left as is; the sentence presents the author's own correction of an earlier draft, which is testimony the page already labels as such.
- R10: left as is; "seventeen" is within one of a loose-matcher count of 18, and the sentence does not rest on the exact figure.
- R11: left as is; "five mechanisms" is the author's grouping and the page frames the paragraph as its own analysis; the owner's eight-item list is a different granularity, not a contradiction.
- R12: left as is; "roughly" already marks it as approximate.
- R13: left as is; the counts are explicitly approximate under the sidebar's plus-or-minus-two rule, and the two quotations are verbatim.
