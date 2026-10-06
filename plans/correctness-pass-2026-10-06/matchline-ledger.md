# Facts ledger, 2026-10-06 correctness pass: `matchline`

Page source: `src/content/projects/matchline.mdx`. Surface: `https://nathanpayne.com/projects/matchline/`. Retrieval timestamp for every API figure: 2026-10-06. Prior ledger: `plans/759/project-pages-ledger.md` § D (`§D1`–`§D30`, pinned at matchline `06ba5fc`, 2026-08-31).

Evidence pin for the product repository: `~/GitHub/matchline` at `origin/main` = `HEAD` = `f27ceefb566698f5878758352c37c38945c9579c` (2026-10-05 15:01 PDT, "docs(prd): refresh the matchline PRD mirror from the docs vault (#533)"), last fetched 2026-10-05 15:03 PDT. Every `git` command below reads `origin/main` from the object database; the working tree was not touched. GitHub reads went through `gh api graphql` (issues #177, #422, #426, #430, #439; PRs #133, #262, #390, #423, #427, #435, #500, #501, #505, #506 in `nathanjohnpayne/matchline`; PRs #905 and #1041 in `nathanjohnpayne/nathanpaynedotcom`). The live product was read anonymously (`curl -sI`, `curl -s` of the SPA shell, `/version.json`, and one JS bundle); no data was read. The docs vault `~/GitHub/docs` was read for commit counts only; no artifact contents are quoted.

Commit classification used throughout: a commit is a **product commit** when it touches `src/`, `functions/`, `tests/`, `specs/`, `firestore.rules` or `firebase.json`; a **dependency bump** when its author is `dependabot[bot]` or it touches only lockfiles and `package.json`; a **template sync** when its subject begins `bulk sync to mergepath@`; everything else (`scripts/`, `.github/`, `docs/`, `REVIEW_POLICY.md`, `DEPLOYMENT.md`, `tests/test_*.sh` shell tests of repo tooling) is **repo tooling**. Classified by changed paths (`git show --stat --format= <sha>`), not by subject line. Since `e20c077` (2026-07-31 21:25 PDT) there are 82 commits on `origin/main` (`git rev-list --count e20c077..origin/main`), classified by a script over `git show --name-only`: 37 dependency bumps, 12 template syncs, 12 repo-tooling commits, 3 PRD-mirror docs commits (2026-10-05), and **18 product commits** on five days: 2026-08-31 (#423, #427), 2026-09-01 (#390, #435, #438, #445, #446, #450, #449, #451), 2026-09-03 (#436, #434, #460, #461), 2026-09-30 (#500, #501), 2026-10-01 (#505, #506). The last product commit is `e95a4ee`, 2026-10-01 23:21 PDT, "fix(validation): make the export gate's pass a server-owned attestation (#502) (#506)". Fifteen of the eighteen landed after the page's pull request #905 merged (2026-09-01 08:56 PDT), and four (#500, #501, #505, #506) after the last page edit that touched the Matchline facts (`f9cac17`, 2026-09-24).

## Summary

| # | Claim (verbatim, abbreviated) | Location | Verdict | Corrected value or weaker form | Source |
|---|---|---|---|---|---|
| R1 | "the thirteen phrases the validator refuses to let through" | line 79 | WRONG | twelve phrases | `functions/src/validation/specificity.denyList.ts` (12 entries; one commit in its history) |
| R2 | "Run the next day across all four labeled pairs, three samples each" | line 203 | WRONG | run later the same day, 2026-04-27 Pacific | matchline#177 body; `e2ef272`, `5b095d8` |
| R3 | "Both repairs landed and neither was measured… nobody ran the repaired metric in any of it" | line 54 | WRONG | the mapping repair was measured in its own PR (nathan×google, 3 samples: mean 19.4%, range 16.7–20.8%, extraction 48.0%); no run after the cache | PR #262 body and approval |
| R4 | "its last recorded accuracy unchanged—nothing measured it after the repair" | line 53 | WRONG | last recorded single-fixture match is 19.4% (#262, 2026-06-03), not 18.1%; the four-cell 48.4/19.1 baseline is unchanged | PR #262 body |
| R5 | "the run that would have shown whether the repair worked was never made" | line 62 | WRONG | that run was made for the mapping repair (#262); what was never made is a four-cell run under the repaired mapping, or any run after the cache | PR #262 body |
| R6 | "the last two working weeks fixed the ruler, not the product" / "The last two working weeks produced no user-visible change" / "the last working sessions went into the instrument" | lines 6, 53, 207 | WRONG | one final session (2026-07-31) fixed the ruler; the other ruler fix was 2026-06-03; the preceding session (2026-07-06) shipped twelve product fixes, three of them UI | `git log origin/main -- src functions tests specs` June–July |
| R7 | "The fixture carries the four fields the scorer compares" | line 137 | WRONG | the scorer compares two of them (summary at 0.6, skills at 0.4); tools and domains are carried but unscored | `tests/eval/scoring.ts:34-37, 89-134`, `runForFixture.ts:574-582` |
| R8 | "Latency and cost targets \| Designed only" | line 95 | WRONG | measured once, 2026-04-27 (#177): cost p95 $0.86 met the <$1 target; latency p95 236 s against <20 s, 11.8× over | matchline#177 body |
| R9 | "blocks the export when a generated claim fails to trace back to it" (and four restatements) | lines 4, 33, 94, 213, 252 | WRONG | the gate disables the Export control; export itself is a Phase 2 stub whose handler only logs | `src/routes/ApplicationEditor/index.tsx:792-798`; PR #506 rollout note |
| R10 | "surfaced as gaps in the same list as the matches rather than hidden behind a tab" | line 171 | WRONG | a separate Gaps panel rendered above the match list, inside the Matches tab | `src/routes/RoleDetail/MatchesTab.tsx:202-224`, `GapsView.tsx:1-10` |
| R11 | "Signing in with a new account gets an empty instance" | line 221 | STALE | since #500 (merged 2026-09-30) a non-allowlisted account is refused (`permission-denied`) by every callable and every Firestore read; the live client build is post-#500 | `firestore.rules:42-71`, `ownerGate.ts`; live bundle |
| R12 | "It was redeployed on the evening of 2026-08-31 and now carries the June and July work" | line 221 | STALE | redeployed again 2026-10-02 05:33 PDT; the live build now carries the September–October work too | `/version.json` buildId `2026-10-02T12:33:04.301Z`; PR #905 |
| R13 | "the matching ontology fails on out-of-domain requirements, so `jaccard()` zeros 45% of the score" | line 242 | STALE | fixed 2026-09-01 by #435 (directional empty-set rule); the ontology under-coverage remains open | `score.ts:165-200`; PR #435 |
| R14 | "10 × 11 \| the whole evaluation corpus: résumés by job descriptions" | lines 27–28 | STALE | 10 × 12 since 2026-09-01 (#435 added a twelfth JD) | `git ls-tree origin/main tests/fixtures/jds/` |
| R15 | "the filter that enforces it runs server-side at all three places evidence is consumed" | line 139 | STALE | four places since 2026-09-01 (#446 added evidence derivation) | `git grep user_approved origin/main -- functions/src` |
| R16 | "two premises about the 2026 job market… anyone can generate a tailored résumé and cover letter in seconds" | line 77 | UNPROVABLE | keep as the product's stated premise, not fact | no artifact in scope |
| R17 | "I did no external user research and no market validation" | line 83 | UNPROVABLE | the repository holds no discovery evidence (control-verified) | `git grep` with control |
| R18 | "no use of a generated output by a user is recorded anywhere" | line 37 | UNPROVABLE | the repository records none | `git grep` with control |
| R19 | "the condition the second build phase set for itself and never met" | line 231 | UNPROVABLE | the condition is real; no record of it being met | `plans/matchline-implementation-plan.md:165-167` |
| R20 | "Writing this page also exposed three stacked production failures" | line 242 | UNPROVABLE | the failures were filed the day the page was rebuilt (#422, 2026-08-31 16:48 PDT); the causal link is the author's | matchline#422 `createdAt` |
| R21 | "A date someone else set is not negotiable and a date I set is" (the Five Across causal claim) | line 61 | UNPROVABLE | the page already says the record corroborates shape, not cause | self-labelled |
| R22 | `status: "PAUSED"` / "The project remains paused." | lines 10, 246 | SUPPORTED | declared status; note eighteen product commits since 2026-08-31, last 2026-10-01 | PRD mirror `docs/projects/matchline/prds/matchline.md:24` (2026-10-05) |
| R23 | "The job search it was built for has resumed" | line 240 | SUPPORTED | 88 commits touching `job-search/` in the docs vault since 2026-08-01 | `git -C ~/GitHub/docs log` |
| R24 | `liveUrl`, `githubUrl`, "behind a sign-in wall", "View Live Product" | lines 15–16, 221 | SUPPORTED | | `curl -sI`, `gh api repos/…`, live bundle |
| R25 | stack line and "Single-user web app" | lines 19, 21 | SUPPORTED | | `package.json`, `functions/package.json`, `specs/matchline.md:12` |
| R26 | "1 user" / "$25/mo… about twelve tuning runs" | lines 23–26 | SUPPORTED | | `tests/eval/README.md:24-25` |
| R27 | "pinned by a fixture whose only job is to break it… the language-model checks underneath are mocked" | line 37 | SUPPORTED | | `tests/validation-fabrication.integration.test.ts:1-26` |
| R28 | single-user scope "explicitly out of scope in the spec"; V2 layers; "drawn from his own prospect list" | lines 41–45, 83 | SUPPORTED | | `specs/matchline.md:23-28, 520-531`; `tests/fixtures/jds/README.md:13` |
| R29 | "18.1%… 12.5% to 25.0%… three samples"; "0.30… 0.10 sanity floor"; stage cache; "$2.06 against a $25 monthly cap" | lines 49–52 | SUPPORTED | | `edc5328`, `552e421`, `e20c077`, `tests/eval/README.md` |
| R30 | "the mapping fix in early June, the cache in the final session at the end of July"; "Eight weeks" | line 54 | SUPPORTED | | `552e421` 2026-06-03; `e20c077` 2026-07-31 |
| R31 | "In early July"; "stopped the day before the Five Across repository was created, apart from one final session"; "the next product commit lands a month later" | lines 58, 63 | SUPPORTED | | `gh api repos/nathanjohnpayne/fiveacross`; `git log` July–August |
| R32 | "a live multiplayer bingo game for a nine-night cruise" | line 58 | SUPPORTED | consistent with the Five Across page | fiveacross PRD `:26`; live `/projects/five-across/` |
| R33 | `related` links; `screenshotSrc` | lines 12, 65–69 | SUPPORTED | | `curl -sI` → 200 |
| R34 | the `ExtractedUnitV1Schema` code block | lines 103–126 | SUPPORTED | two comment lines elided silently | `resume.v1.schema.ts:94-117` |
| R35 | the Threadline Unit exhibit, "hand-labeled… synthetic candidate… quoted as the fixture stores it" | lines 128–135 | SUPPORTED | | `expected-units/sofia-fullstack-founder-2026.json:5, 32-42` |
| R36 | production Units carry metrics, signals, evidence type, confidence; "Approval is not in that list"; "the server stamps every extracted Unit unapproved" | lines 137, 139 | SUPPORTED | | schema `.strict()`; `extraction/resume.ts:335` |
| R37 | hand-typed Units "arrive pre-approved and marked `user_confirmed`" | line 139 | SUPPORTED | | `src/services/experienceUnits-state.ts:320-322` |
| R38 | diagram description; "the audit calls it a read gate and not a write gate" | lines 141–171 | SUPPORTED | still a read gate at `f27ceef` | `firestore.rules:220-233`; prior ledger §D13 |
| R39 | "The quality bar was 80% extraction accuracy and 80% match accuracy. Neither was reached" | line 179 | SUPPORTED | | PRD mirror `:119-120`; #177 |
| R40 | "3.3%… 34%… 50.3%… roughly 220 entries to 415… 51.3%"; "a single résumé-and-job pair"; diagram | lines 181–203 | SUPPORTED | | `scoring.ts:11-23`; `e2ef272`; `5b095d8` |
| R41 | "48.4% extraction and 19.1% match. That aggregate is still the baseline of record" | line 203 | SUPPORTED | | #177; `sweep.ts:486, 586`; PRD mirror `:24` |
| R42 | "4.2% to 16.7%"; "18.1%… 12.5% to 25.0%—eight to thirteen points of noise"; "$2.06… $25… twelve runs" | line 205 | SUPPORTED | | `e2ef272`, `edc5328`, `552e421`, README |
| R43 | the adversarial fixture's four claims, "attached to a real résumé", "expected validation status as failed" | line 211 | SUPPORTED | | `expected-asset-traces/adversarial-fabrication.json` |
| R44 | "runs in continuous integration against the Firestore emulator… the model checks are mocked" | line 213 | SUPPORTED | | `package.json:13`; `.github/workflows/test.yml:104` |
| R45 | "Agents authored… independent agent identities reviewed"; the three caught defects; "the reviewer pushed back a second time" | line 217 | SUPPORTED | | `score.ts:525`; `zodToolSchema.ts:13`; `06ba5fc:pipeline.ts:395-402`; PR #133 reviews |
| R46 | "the evening of 2026-07-31, Pacific, when the eval stage cache landed" | line 219 | SUPPORTED | | `e20c077` `%aI` |
| R47 | "For the month after that only maintenance moved—dependency bumps and repository-template syncs, none of it touching the product" | line 219 | SUPPORTED | five identity/CI tooling commits on 2026-08-21 are neither kind named; none touch product paths | path classification |
| R48 | "Product commits resumed on 2026-08-31 and, as of 2026-09-01, are still landing" | line 219 | SUPPORTED | dated; fifteen more product commits followed the page's merge, through 2026-10-01 | `6392ad7`; `git log` |
| R49 | "the 2026-05-02 build it served until then" | line 221 | SUPPORTED | not reproducible today; rests on the 2026-08-31 observation | prior ledger §D19; PR #905 |
| R50 | "every document is scoped to its `owner_uid`" | line 221 | SUPPORTED | | `firestore.rules:3-4, 23-40` |
| R51 | "the repository had exit criteria for finishing V1, but none for deciding whether to continue" | line 225 | SUPPORTED | | prior ledger §D21; `plans/matchline-implementation-plan.md` |
| R52 | "becoming my primary tool rather than another system abandoned for a spreadsheet" | line 236 | SUPPORTED | | `plans/matchline-implementation-plan.md:194-195` |
| R53 | "missing Cloud Run invoker bindings blocked CORS preflights, trailing newlines in both provider secrets… a sixty-second timeout against three long model calls" | line 242 | SUPPORTED | | #422, #423, #426, #427 |
| R54 | "With those fixed, résumé extraction and JD parsing run end to end" | line 242 | SUPPORTED | | #430 body |
| R55 | "route tuning runs through a subscription CLI instead of the metered Anthropic cap" | line 244 | SUPPORTED | | `db5dfe3` (#390); `tests/eval/README.md:80-93` |
| R56 | "LinkedIn and long-form ingestion were deferred. Uploaded PRDs, decks and retrospectives never existed—an earlier version of this page listed them" | line 97 | SUPPORTED | artifact upload is specified in the PRD, never built | `Onboarding.tsx:16`; `6910bcc`, `d191ebd`; PRD mirror `:24, 88` |
| R57 | the capability table's three "Built" rows and "Built, never user-validated" | lines 91–94 | SUPPORTED | | `extractFromResume.ts`; `.where("user_approved")`; `computeGaps.ts` |
| R58 | frontmatter `description`, `seoDescription`, `cardDescription` ("48% extraction and 19% match"; "before running it against the product again") | lines 4–7 | SUPPORTED | holds only for runs after 2026-07-31; see R3 | #177; `sweep.ts` |
| R59 | "The model's job is selection, sequencing, and framing" | line 81 | SUPPORTED | design statement matching the spec's non-goal | `specs/matchline.md:26` |

Counts: WRONG 10, STALE 5, UNPROVABLE 6, SUPPORTED 38.

## Rows

### R1: thirteen phrases
> "It is the thirteen phrases the validator refuses to let through—*collaborated cross-functionally*, *drove results*, *moved the needle*." (line 79)

**WRONG.** The deny list has twelve entries. Loosest matcher first: `git show origin/main:functions/src/validation/specificity.denyList.ts | grep -c 'pattern:'` → 13, but that count includes the `readonly pattern: string;` field declaration on the `DenyListEntry` interface; narrowing to entries, `grep -c '^    pattern:'` → **12**, cross-checked by `grep -c '^    reason:'` → 12. The file has exactly one commit in its history (`018cb5b`, 2026-04-25, "Validation pipeline—specificity check (#108) (#113)"), so the count has never been thirteen. The three phrases the page names are all present (entries 1, 3 and 7). The prior ledger's §D20 also says "thirteen banned phrases", and the page's sentence was written in `d191ebd` (2026-08-31, #885) from that row; the error is inherited from the ledger, which used the loose matcher. Source: `git show origin/main:functions/src/validation/specificity.denyList.ts` → 12 `pattern:` entries at four-space indent.

### R2: the four-pair run was the same day, not the next
> "All four of those measurements came from a single résumé-and-job pair. Run the next day across all four labeled pairs, three samples each, the system scored 48.4% extraction and 19.1% match." (line 203)

**WRONG.** The fourth single-pair measurement (50.3% → 51.3%) is in `e2ef272`, authored 2026-04-27T10:21:07-07:00. The three other labeled cells landed in `5b095d8` at 2026-04-27T15:58:21-07:00, and issue #177's body states "Live multi-sample full eval (`npm run eval -- --full --samples 3`) on the 4-cell labeled corpus, run 2026-04-27 after #137 sub-issue 3 landed"; the issue was filed 2026-04-28T01:57:42Z, which is 2026-04-27 18:57 Pacific. So the four-pair run happened later the same Pacific day as the 51.3% commit, between 15:58 and 18:57. The only sense in which it is "the next day" is the UTC date of the issue's filing, and the page uses Pacific everywhere else ("the evening of 2026-07-31, Pacific"). The third comment on #177 (2026-04-28T21:50:52Z) restates the identical per-cell table "on main as of `7e91527`" (2026-04-28 14:05 PDT), but every cell's latency and cost match the body's table to the second and the cent, which is a restatement of the 04-27 run, not a second run; the two experiments that comment reports (threshold 0.20, prompt v2) were separate runs with different figures. Corrected value: "Run later the same day". Source: `gh api graphql` issue #177 `body`, `createdAt`; `git log -1 --format=%aI e2ef272 5b095d8 7e91527`.

### R3: the mapping repair was measured
> "Both repairs landed and neither was measured. Eight weeks of product work separate them—the mapping fix in early June, the cache in the final session at the end of July—and nobody ran the repaired metric in any of it." (line 54)

**WRONG, one quantifier too wide.** PR #262 (merged 2026-06-04T00:54:56Z), which shipped the mapping fix `552e421`, carries an eval table in its body under the heading "Eval result—the win is variance, not the mean": `npm run eval -- --samples 3` on nathan×google under the 0.10 floor gave match accuracy mean **19.4%**, range **16.7–20.8%**, extraction **48.0%**, against the 0.30-floor runs of 25.0% (#254) and 18.1% with range 12.5–25.0% (#258); "The per-sample range collapsed from a 12.5pp span (#258) to 4.1pp". The `nathanpayne-claude` approval on the same PR (2026-06-04T00:53:19Z) repeats the figures: "per-sample match range collapsed 12.5pp→4.1pp (#258 vs this PR)… with the mean honestly settling at ~19%". So the repaired metric was run, once, on one fixture, three samples, in the PR that landed the repair. The commit message's "Eval validation to follow in the PR" was honoured in the PR body, which the squash commit does not carry, and which neither the prior ledger (§D24: "no eval run confirming it is recorded anywhere afterwards") nor the page read. What the record does support: no four-cell run under the repaired mapping is recorded, and nothing at all was run after the cache (`e20c077`, 2026-07-31); `git log origin/main --since=2026-06-04 -i --grep=accuracy` returns zero commits (control: the same search bounded to 2026-04-27 returns `3f0d9af` and `e2ef272`). Corrected value: "The mapping fix was measured in its own PR, on one fixture: the three-sample range fell from 12.5 points to 4.1 and the mean settled at 19.4%. Nothing was run against the four-cell corpus under the repaired mapping, and nothing was run after the cache." Source: `gh api graphql` PR #262 `body` and `reviews`.

### R4: last recorded accuracy
> "The product is paused with better instruments and its last recorded accuracy unchanged—nothing measured it after the repair—and the work that would have shown up in a demo is exactly the work that did not get done." (line 53)

**WRONG on both clauses, for the reason in R3.** "Nothing measured it after the repair" is contradicted by the PR #262 run. "Its last recorded accuracy unchanged" is true of the four-cell baseline (48.4% / 19.1%, still cited by `tests/eval/sweep.ts:486` and the PRD mirror) and false of the single-fixture series the page's measurement section narrates: the last recorded nathan×google match figure is 19.4% (#262, 2026-06-03), not the 18.1% the section ends on, and the page's own "Fix the ruler" rationale ("the prior 25% was a low-variance fluke") is the finding of that run. Corrected value: "its four-cell baseline unchanged; the one run after the mapping repair confirmed the noise fell and the mean sat near 19%". Source: PR #262 body; `git show origin/main:tests/eval/sweep.ts | sed -n '486p;586p'`.

### R5: the run that was never made
> "The instruments were finally cheap, the accuracy was not yet there, and the run that would have shown whether the repair worked was never made." (line 62)

**WRONG as stated.** The run that showed whether the mapping repair worked was made and recorded in PR #262 (R3). The sentence survives only if "the repair" means the cache (`e20c077`), which no accuracy run followed, but the cache is a cost instrument, not a measurement repair, and the page's own next sentence ("Knowing whether matching works needs more than that one run") shows it means an accuracy run. Corrected value: "the four-cell run under the repaired mapping, which the cache was built to make cheap, was never made". Source: PR #262 body; `git log origin/main --since=2026-06-04 -i --grep=accuracy` → 0.

### R6: the last two working weeks
> "the last two working weeks fixed the ruler, not the product" (line 6); "The last two working weeks produced no user-visible change." (line 53); "So the last working sessions went into the instrument rather than the product." (line 207)

**WRONG under either reading of "working weeks".** Product-path commits from June to the pause, excluding bots and syncs (`git log origin/main --since=2026-06-01 --until=2026-08-01 --format='%h %ad %s' --date=short -- src functions tests specs firestore.rules`): `edc5328` and `552e421` on 2026-06-03 (JD-side vocabulary bridges in `functions/src/matching`; the eval mapping floor), `9131e6f` 2026-06-16 (TipTap rich editor for résumé paste, a UI change), `f75aa2a` 2026-06-30 (RoleDetail subscriptions), twelve review-fix PRs #350–#361 on 2026-07-06 including `cef8da3` "fix(unit-review): guard NaN confidence render", `cf720e5` "fix(signin): trim email before Firebase calls, disable mode toggle while busy" and `2f0588c` "fix(role-detail): reset state on no-roleId" (all three user-visible), then nothing until `e20c077` on 2026-07-31 (eight files, all under `tests/eval/`). If "the last two working weeks" means the final two calendar weeks before the pause (07-18 to 07-31), only one session happened and it fixed one ruler, the cache; the other ruler fix was 2026-06-03, eight weeks earlier, so "two weeks fixed the ruler" misdates it. If it means the last two weeks in which work happened (the weeks of 07-06 and 07-27), the first of them shipped user-visible fixes, so "no user-visible change" is contradicted. The plural "last working sessions" (line 207) has the same problem: the penultimate session (07-06) was product work. Corrected value: "the final session fixed the ruler, not the product" and "the final session (2026-07-31) produced no user-visible change". Source: the `git log` above; `git show --stat --format= e20c077`.

### R7: the four fields the scorer compares
> "The fixture carries the four fields the scorer compares; a Unit the extractor returns in production also carries metrics, seniority and scope signals, an evidence type and a confidence score" (line 137)

**WRONG.** The fixture Unit carries `id`, `normalized_summary`, `skills`, `tools` and `domains`. The scorer compares two of those: `tests/eval/scoring.ts:34-37` declares an `ExpectedUnit` interface of exactly `normalizedSummary` and `skills`, and `unitSetAccuracy` (`:89`) scores `summaryMatch * 0.6 + skillsMatch * 0.4` (`:134`); `tests/eval/runForFixture.ts:574-582` converts fixture Units to that shape with the comment "`normalizedSummary` + `skills`; convert our shapes". `tests/eval/loadFixtures.ts:34-35` declares `tools` and `domains` optional and loads them, but no scoring function reads them (`git grep -n 'tools\|domains' origin/main -- tests/eval/scoring.ts` → only the docstring's "skill / tool / domain overlap" remark about matching time). Corrected value: "The fixture carries four fields; the scorer compares two of them, the summary and the skills, weighted 0.6 and 0.4." Source: `git show origin/main:tests/eval/scoring.ts | sed -n '34,37p;89,134p'`; `git show origin/main:tests/eval/runForFixture.ts | sed -n '574,582p'`.

### R8: latency and cost were measured
> "| Latency and cost targets | Designed only |" (line 95)

**WRONG.** Both targets were measured on 2026-04-27 in the same four-cell run that produced the baseline the page headlines. Issue #177's table reads "Latency p95 | 236s | <20s | 11.8× over" and "Cost p95 | $0.86 | <$1 | ✅", with the sentence "Cost holds. Everything else is materially off-target." The PRD mirror in the repository (`docs/projects/matchline/prds/matchline.md:24`, 2026-10-05) carries the same "p95 latency 236 s (matchline#177)". Instrumentation for both exists in product code (`llm_calls` telemetry, `fix(llm-cost)` #360; the eval report's latency and cost columns), so "designed only" is wrong about the instruments too. Corrected value: "Measured once (2026-04-27): cost p95 $0.86 met the under-$1 target; latency p95 236 s against a 20 s target. Nothing since has worked the latency gap." Source: `gh api graphql` issue #177 `body`; `git show origin/main:docs/projects/matchline/prds/matchline.md | sed -n '24p'`.

### R9: the export behind the gate is a stub
> "then blocks the export when a generated claim fails to trace back to it" (line 4); "disable export while any claim fails to trace" (line 33); "| Fabrication gate blocking export | Built, never user-validated |" (line 94); "a passing run means the export was blocked" (line 213); "refuse an untraceable export" (line 252)

**WRONG by a material omission: there is no export to block.** `src/routes/ApplicationEditor/index.tsx:792-798` defines the Export control's handler as `console.info("Export not yet implemented (Phase 2)", { applicationId, assetId })` and nothing else; PR #506's rollout note (merged 2026-10-02T06:21:03Z) states "Export itself is still the Phase 2 stub (`onExport` only logs), so nothing user-facing regresses." The gate is real: `src/routes/ApplicationEditor/exportGate.ts` disables the control unless a server-owned attestation covers the asset's current content, and `tests/validation-fabrication.integration.test.ts` pins `validation_status: "failed"` on the adversarial fixture with the docstring "Export blocked." What the gate blocks is a button whose action does not export. Every sentence above implies a working export behind the gate, and the capability table lists the gate as Built without a row saying export is not. Corrected value: "disables the Export control while any claim fails to trace; export itself is a Phase 2 stub that only logs". Source: `git show origin/main:src/routes/ApplicationEditor/index.tsx | sed -n '792,798p'`; PR #506 body.

### R10: gaps are a panel in the Matches tab, not entries in the match list
> "Requirements with no qualifying evidence are surfaced as gaps in the same list as the matches rather than hidden behind a tab—the gaps are the point, not an embarrassment to bury." (line 171)

**WRONG on "the same list"; the substance holds.** `src/routes/RoleDetail/RoleDetailView.tsx:13` declares three tabs, Requirements, Matches and Applications. `MatchesTab.tsx` renders, inside the tab's `<div data-testid="matches-tab">` (line 202), `<GapsView gaps={gaps} …/>` (line 213) as its own panel and then the match cards in a separate `<ul className="space-y-4">` (line 224); `GapsView.tsx:1-10` describes itself as a "Gaps view" that "the Matches tab renders… alongside the Requirements grid". So gaps sit in the same tab panel as the matches, above the list, as a distinct block with its own empty state, not as entries in the match list. Corrected value: "surfaced as a gaps panel in the same tab as the matches, above the list, rather than on a separate screen". Source: `git show origin/main:src/routes/RoleDetail/MatchesTab.tsx | sed -n '195,245p'`; `git show origin/main:src/routes/RoleDetail/GapsView.tsx | sed -n '1,12p'`.

### R11: a new account no longer gets an empty instance
> "Signing in with a new account gets an empty instance—every document is scoped to its `owner_uid`—so the link shows the shell, not the corpus." (line 221)

**STALE.** True when written (PR #905, 2026-09-01: "Firestore rules scope every document to `owner_uid`, so there is no data exposure"), and the exposure it left open became matchline#439 the same day. #500 (`734faec`, merged 2026-09-30T17:28:01Z) replaced the catch-all rule with an owner allowlist: `firestore.rules:67-71` admits a client read or write only when `request.auth.uid` is in `config/access.owner_uids`, and `functions/src/callables/ownerGate.ts` has every callable return `permission-denied` to any uid not in the `MATCHLINE_OWNER_UIDS` param, before argument parsing; `SignIn.tsx:14-15` dropped the create-account mode ("there is no create-account mode"). The live client is the post-#500 build: the bundle served on 2026-10-06 (`/assets/index-hDBsWN_w.js`, `last-modified: Fri, 02 Oct 2026 12:33:17 GMT`) contains "Continue with Google" and "Sign in" but no "Create account" or "Sign up" string, and maps `permission-denied` to "You don't have access to that." The rules deployment itself cannot be verified anonymously. Today's value: a signed-in stranger is refused on every read and every callable; the `owner_uid` scoping still exists but is no longer what keeps the corpus private. Change date: 2026-09-30 (merge), live by 2026-10-02 (build). Source: `git show origin/main:firestore.rules | sed -n '42,71p'`; `curl -s https://matchline-dev.web.app/assets/index-hDBsWN_w.js | grep -o 'Create account\|Sign up\|Continue with Google'`.

### R12: the deployment has moved again
> "It was redeployed on the evening of 2026-08-31 and now carries the June and July work this page rests on, rather than the 2026-05-02 build it served until then." (line 221)

**STALE.** The 2026-08-31 redeploy is supported by the observation PR #905 recorded at the time ("redeployed 2026-08-31 19:02 Pacific (`last-modified: Tue, 01 Sep 2026 02:02:18 GMT`)") and cannot be reproduced now. The deployment has been replaced since: `https://matchline-dev.web.app/version.json` returns `{"buildId": "2026-10-02T12:33:04.301Z"}` (the stamp `vite.config.ts:24-50` emits at build time), and the shell and bundle both carry `last-modified: Fri, 02 Oct 2026 12:33:17 GMT`, i.e. 2026-10-02 05:33 PDT, after #506 merged at 2026-10-02T06:21:03Z. Deploys are manual (`DEPLOYMENT.md:445`, `scripts/deploy.sh`; no deploy workflow under `.github/workflows/`), so the record of deploys is the hosting headers. "Now carries the June and July work" remains true as a subset; what the sentence omits is that the live build now also carries the September and October work (streaming progress and the update prompt from #436/#434, the owner allowlist from #500, rerun sizing and the server-owned export attestation from #501/#506). Today's value: last redeployed 2026-10-02, 05:33 Pacific. Source: `curl -s https://matchline-dev.web.app/version.json`; `curl -sI https://matchline-dev.web.app/`; PR #905 body.

### R13: the 45% zeroing was fixed the same day
> "the matching ontology fails on out-of-domain requirements, so `jaccard()` zeros 45% of the score before fit is considered." (line 242)

**STALE.** The 45% is right: `functions/src/matching/score.ts:172-176` records that `skill_overlap + domain_overlap + tool_overlap` (0.20 + 0.15 + 0.10) "hard-zeroed for EVERY pair" on an out-of-domain JD, reproduced on the `coursera-staff-pm-2026` fixture, and #430 states the same. But the page's present tense describes a defect that #435 (`51c72a6`, merged 2026-09-01T16:16:46Z, twenty minutes after the page's PR #905 merged at 15:56:55Z) fixed with a directional empty-set rule: an empty requirement side now scores the 0.5 neutral, so an unrecognised requirement no longer zeros the three axes. The under-coverage behind it is still open (`score.ts:193-195` "The ontology under-coverage that triggers case 1 is still worth closing on its own (#38, #159 slices)"), and #435 raised JD-side recognition to 78% of keywords and 91% of domains on that fixture. Today's value: "the matching ontology under-recognises out-of-domain requirements; until 2026-09-01 an unrecognised requirement zeroed 45% of the score". Source: `git show origin/main:functions/src/matching/score.ts | sed -n '165,200p'`; PR #435 body.

### R14: the corpus is 10 × 12
> "10 × 11 | the whole evaluation corpus: résumés by job descriptions" (lines 27–28)

**STALE.** `git ls-tree --name-only origin/main tests/fixtures/jds/ | grep -c '\.txt$'` → **12**; at the prior ledger's pin `06ba5fc` the same count is 11, and `git ls-tree --name-only origin/main tests/fixtures/resumes/ | grep -c '\.txt$'` → 10. The twelfth JD, `coursera-staff-pm-2026.txt`, was added by `51c72a6` (#435) on 2026-09-01T09:16:45-07:00, the same day the page went live, as the reproduction fixture for #430. `tests/eval/run.ts:412` enumerates the fixture directory with `readdirSync`, so a `--full` run is now the 10 × 12 cross product. The labeled subset is unchanged at four pairs. Today's value: 10 × 12. Source: the `git ls-tree` commands above; `git log --diff-filter=A --format='%h %aI' -- tests/fixtures/jds/coursera-staff-pm-2026.txt`.

### R15: four places, not three
> "the filter that enforces it runs server-side at all three places evidence is consumed" (line 139)

**STALE.** At the prior pin the three consumers were matching, generation and validation, each with `.where("user_approved", "==", true)`; those three remain at `functions/src/matching/pipeline.ts:344`, `functions/src/generation/pipeline.ts:722` and `functions/src/validation/validate.ts:447`. #446 (`5c958aa`, 2026-09-01 15:30 PDT) added a fourth server-side consumer, `deriveMatchEvidence`, which reads Units to derive evidence for legacy matches and refuses an unapproved one in code rather than in the query: `functions/src/matching/evidence.ts:193` `if (!unit.user_approved) { return { verdict: "unverifiable", reason: "unit_unapproved" … } }`. The invariant the sentence asserts still holds at every consumer; the count does not. Today's value: "at every server-side place evidence is consumed, four as of 2026-09-01". Source: `git grep -n 'user_approved' origin/main -- functions/src | grep -v '\.test\.'`.

### R16: the market premises
> "Matchline is built on two premises about the 2026 job market. First, anyone can generate a tailored résumé and cover letter in seconds, so every application is polished and polish is no longer a signal." (line 77)

**UNPROVABLE.** Market claims with no artifact in scope; the prior ledger's §D1 reached the same verdict and §D20 confirmed the thesis is not written down in the product repository. The page already frames them as premises, which is the defensible form. Source: none applicable.

### R17: no external research
> "Matchline began as a single-user hypothesis, based on my own job search. I did no external user research and no market validation" (line 83)

**UNPROVABLE as autobiography; the repository agrees.** Control: `git grep -ci 'zero fabrication' origin/main -- specs docs README.md BRAND.md` finds 5 files, so the documentation surface is reachable; then `git grep -ci 'user interview' …` and `'market validation' …` over the same paths plus `plans` return 0 files each. That establishes no discovery evidence in the repository, not that none was done. Weaker form: "the repository holds no user research or market validation". Source: the `git grep` commands above.

### R18: no recorded use of a generated output
> "no use of a generated output by a user is recorded anywhere" (line 37)

**UNPROVABLE as a universal; the repository records none.** The product writes `llm_calls` telemetry (`firestore.rules` names the collection as server-only) and `applications` with generated assets, and the eval harness records runs, but nothing records whether a user sent a generated output anywhere, and #506's rollout note confirms export "only logs" (R9). "Anywhere" reaches outside the repository, where this audit cannot look. Weaker form: "the product records no use of a generated output, and export is not implemented". Source: `git grep -n 'llm_calls' origin/main -- firestore.rules`; PR #506 body.

### R19: the Phase 2 condition
> "One real application has gone through the product end to end—the condition the second build phase set for itself and never met." (line 231)

**UNPROVABLE on "never met"; the condition is SUPPORTED.** `plans/matchline-implementation-plan.md:165-167` (Phase 2 exit criteria): "Nathan uses the product for one real application without editing any fabricated claims out". Nothing in the repository or the PRD mirror records the condition as met, the PRD mirror's status line (2026-10-05) says "Paused pre-launch", and export is a stub, so an application could not have left the product; but a negative about the author's use cannot be closed from here. Weaker form: "no record that it was met". Source: `git show origin/main:plans/matchline-implementation-plan.md | sed -n '165,170p'`.

### R20: what exposed the failures
> "Writing this page also exposed three stacked production failures" (line 242)

**UNPROVABLE as cause; the sequence is SUPPORTED.** The page rebuild merged in `d191ebd` on 2026-08-31 (#885); matchline#422 was filed at 2026-08-31T23:48:16Z (16:48 PDT) by the author after pasting a résumé into `matchline-dev.web.app/onboarding`, and #426 followed at 2026-09-01T01:37:32Z. The timestamps put the live test on the day the page was rebuilt; what prompted the test is the author's own account. Weaker form: "A live test of the dev instance on the day this page was rebuilt exposed three stacked production failures". Source: `gh api graphql` issues #422, #426 `createdAt`; `git log main --format='%h %ad' --date=short -- src/content/projects/matchline.mdx`.

### R21: the deadline rationale
> "A date someone else set is not negotiable and a date I set is. The reasoning here is mine and the record can only corroborate its shape, not its cause" (line 61)

**UNPROVABLE, and the page says so.** The sentence labels itself. The shape it claims is checked in R31. No correction proposed. Source: none applicable.

### R22: paused
> `status: "PAUSED"` (line 10); "**The project remains paused.** But the infrastructure now works, the cost of experimentation is low, and the job search provides the test it was built for." (line 246)

**SUPPORTED as a declared status, with the record attached.** The author's PRD, mirrored into the repository on 2026-10-05 (`docs/projects/matchline/prds/matchline.md:24`), states "**Status (2026-10-05):** Paused pre-launch since 2026-07-31… revisiting is under consideration". That is the most recent primary statement of status and it postdates every product commit. The caveat a reader needs: "paused" here means no launch and no restart decision, not no commits. Eighteen product commits have landed since 2026-08-31 (classification in the preamble), the last on 2026-10-01 (`e95a4ee`, #506), and the page's "The pause has a date the commits set" sentence (line 219) dates the pause by commits. No verdict change; the fix pull request may want to say which sense of "paused" the page means. Source: `git show origin/main:docs/projects/matchline/prds/matchline.md | sed -n '24p'`; the commit classification in the preamble.

### R23: the job search resumed
> "As of September 2026, the conditions for revisiting the project are becoming real rather than hypothetical. The job search it was built for has resumed" (line 240)

**SUPPORTED.** `git -C ~/GitHub/docs log --since=2026-08-01 --format=%h -- job-search | wc -l` → **88** commits touching `job-search/` since 2026-08-01, on sixteen distinct days from 2026-08-20 to 2026-10-05, across eight company folders (`anthropic`, `apple`, `coursera`, `google`, `mux`, `nba`, `openai`, `palantir`). matchline#430 (2026-09-01) independently records a live application being worked through the product with a fit brief and a role-tailored résumé. Contents of the vault are deliberately not quoted (private repository; see `CLAUDE.md` § Career Artifacts). Source: the `git log` above, counts only.

### R24: the live URL, the repository, the sign-in wall
> `liveUrl: "https://matchline-dev.web.app/"` (line 15); `githubUrl: "https://github.com/nathanjohnpayne/matchline"` (line 16); "A development build is deployed behind a sign-in wall, and the "View Live Product" button above goes to it." (line 221)

**SUPPORTED.** `curl -sI https://matchline-dev.web.app/` → `HTTP/2 200`, `<title>Matchline</title>`, a 555-byte Vite SPA shell; `https://matchline-dev.firebaseapp.com/` returns the same. The bundle it loads contains "Continue with Google", "Sign in" (×2) and the tagline "From what you’ve done to what’s next.", and `SignIn.tsx:1-22` is the only unauthenticated route. `gh api repos/nathanjohnpayne/matchline --jq '{private,archived}'` → `{"private": false, "archived": false}`. The live page renders "View Live Product" twice (`curl -s https://nathanpayne.com/projects/matchline/ | grep -o 'View Live Product'`). Source: the commands above.

### R25: stack and format
> `stack: "React · TypeScript · Vite · Tailwind · Firebase · Anthropic · OpenAI · Vitest"` (line 21); `format: "Single-user web app"` (line 19)

**SUPPORTED.** `package.json` at `origin/main`: `react ^19.3.0`, `typescript ~6.0.3`, `vite ^8.3.2`, `tailwindcss ^4.0.0`, `firebase ^12.19.0`, `vitest ^5.0.3`; `functions/package.json:17,20`: `@anthropic-ai/sdk ^0.40.0`, `openai ^6.34.0`. `specs/matchline.md:12` "A single-user career operating system". Source: `git show origin/main:package.json`; `git show origin/main:functions/package.json`.

### R26: the constraint strip
> "1 user | the entire V1 user base, by design"; "$25/mo | the Anthropic cap—about twelve tuning runs" (lines 23–26)

**SUPPORTED.** `specs/matchline.md:478` "One user at a time. No sharing, collaboration, or team features." and `:530` "Multi-user, sharing, or team features" under out of scope. `tests/eval/README.md:24-25`: "One 4-cell × 3-sample run costs **$2.06** against a $25/mo Anthropic cap (#177)—about 12 tuning runs a month." The third constraint is R14. Source: the paths above.

### R27: the fixture that breaks the gate, and the mocked checks
> "The gate is real in code and pinned by a fixture whose only job is to break it. What that proves is that the orchestration blocks fabrication; the language-model checks underneath are mocked in that test, so the detector's own reliability is unmeasured" (line 37)

**SUPPORTED.** `tests/validation-fabrication.integration.test.ts:1-26` pins "Adversarial fixture (zero-fab pin): an asset whose bullet asserts content not present in any source Unit produces an `untraceable` flag and `validation_status: "failed"`. Export blocked." and states "The traceability + specificity + claim-extraction LLM calls are mocked via deps (the integration boundary is Firestore, not the LLM API)." The fixture's `notes` field says "This is the test that proves the validator catches what it claims to." See R9 for what "export" means. Source: `git show origin/main:tests/validation-fabrication.integration.test.ts | sed -n '1,26p'`.

### R28: the single-user decision
> "put multi-user, sharing, teams, job-board integrations, and every learning layer explicitly out of scope in the spec rather than in a backlog" (line 42); "Every V2 layer worth wanting—outcome-driven tuning, a referral graph, a should-I-apply score" (line 41); "the evaluation corpus is drawn from his own prospect list" (line 45); "V1 was deliberately scoped to proving whether the workflow worked for me" (line 83)

**SUPPORTED.** `specs/matchline.md:520-531` ("Out of scope for V1 … Deferred to V2+ (do not scaffold or build)") lists "Decision Engine (should-I-apply scoring)", "Learning Layer (outcome-driven tuning)", "Network Layer (relationship graph, referral suggestions)", "Any generalization beyond the single V1 user", "Multi-user, sharing, or team features" and "Integrations with job boards or ATS systems"; `:23-28` § Non-goals adds "Not a job board, mass-apply tool, coaching product, or team product." `tests/fixtures/jds/README.md:13` "Prefer JDs from Nathan's actual prospect list". `README.md:10-11` "V1 has exactly one user and one goal" (per prior ledger §D20, re-read at this pin). Source: `git show origin/main:specs/matchline.md | sed -n '23,28p;520,531p'`.

### R29: the measurement decision's figures
> "One run reported 18.1%, across a spread of 12.5% to 25.0% over three samples of a single fixture." (line 49); "replace the absolute 0.30 similarity threshold with relative best-match mapping and a 0.10 sanity floor, then build a content-addressed stage cache so a tuning run replays unchanged stages for free" (line 50); "one run at three samples was $2.06 against a $25 monthly cap, so the budget bought about twelve tuning runs a month" (line 52)

**SUPPORTED.** `edc5328` (2026-06-03): "this run 18.1%, range 12.5-25.0%, vs #254's stable 25.0%" at `--samples 3` on one fixture; `552e421` (2026-06-03): "Drop DEFAULT_MAPPING_THRESHOLD 0.30 -> 0.10… relative best-match… 0.10 is now a sanity floor"; `e20c077` (2026-07-31): "content-addressed stage cache… Keyed on sha256(stage, provider, model, prompt version, input text…)". Cost figures as in R26. Source: `git log -1 --format=%b edc5328 552e421 e20c077`.

### R30: the chronology of the two repairs
> "Eight weeks of product work separate them—the mapping fix in early June, the cache in the final session at the end of July" (line 54)

**SUPPORTED as chronology (the "neither was measured" clause of the same sentence is R3).** `552e421` is 2026-06-03T17:54:55-07:00; `e20c077` is 2026-07-31T21:25:03-07:00: eight weeks and two days, with product commits on 06-16, 06-30 and 07-06 between them (R6). Source: `git log -1 --format=%aI 552e421 e20c077`.

### R31: the Five Across handover
> "In early July two projects wanted the same summer." (line 58); "Product work stopped the day before the Five Across repository was created, apart from one final session spent on the evaluation cache. That cache closed the phase; the next product commit lands a month later." (line 63)

**SUPPORTED.** `gh api repos/nathanjohnpayne/fiveacross --jq .created_at` → `2026-07-07T17:10:14Z` (10:10 PDT). The last product burst before it is the twelve PRs #350–#361 on 2026-07-06, 14:06 to 15:07 PDT. `git log origin/main --since=2026-07-07 --until=2026-08-01 -- src functions tests specs firestore.rules firebase.json`, excluding bots and syncs, returns exactly one commit, `e20c077` (2026-07-31). The next product commit is `6392ad7`, 2026-08-31 18:17 PDT (#423), one calendar month later. Source: the commands above.

### R32: the nine-night cruise
> "Five Across, a live multiplayer bingo game for a nine-night cruise, with a sailing date that could not move" (line 58)

**SUPPORTED, and consistent across pages.** Primary source: the Five Across repository's PRD, `docs/projects/gaycruisebingo/prds/gaycruisebingo.md:26` at `origin/main` of `~/GitHub/fiveacross`, "On a nine-night cruise with a big friend group, the game wants to be social and live—phone-first". The live `/projects/five-across/` page says "a phone-first multiplayer game built for a nine-night Mediterranean cruise" (two "nine-night" hits, eleven "multiplayer"), so no cross-page inconsistency. "A sailing date that could not move" is the author's framing of a fixed itinerary and is not separately checked. Source: `git -C ~/GitHub/fiveacross grep -n -i 'nine-night' origin/main -- docs`; `curl -s https://nathanpayne.com/projects/five-across/`.

### R33: related links and the wordmark
> `href: "/projects/mergepath/"`, `href: "/projects/five-across/"` (lines 67, 69); `screenshotSrc: "/images/projects/matchline-wordmark.svg"` (line 12)

**SUPPORTED.** `curl -sI` on `https://nathanpayne.com/projects/mergepath/`, `/projects/five-across/` and `/images/projects/matchline-wordmark.svg` → `HTTP/2 200` each. Source: the commands above.

### R34: the schema code block
> the `ExtractedUnitV1Schema` block (lines 103–126)

**SUPPORTED, with one silent elision.** The block matches `functions/src/prompts/extraction/resume.v1.schema.ts:94-117` at `origin/main` token for token, including the `.strict()` and the `min(0.5).max(1)` bound and its comment, except that the page omits the two-line comment at the top of the object ("`.trim()` before `.min(1)`: see MetricSchema.claim above—a bare `.min(1)` lets whitespace-only strings through. See #335."). Not a correctness defect; noted so a future diff is not mistaken for drift. Source: `git show origin/main:functions/src/prompts/extraction/resume.v1.schema.ts | sed -n '94,117p'`.

### R35: the Threadline Unit
> the exhibit (lines 130–135); "a hand-labeled Unit for a synthetic candidate, quoted as the fixture stores it" (line 128)

**SUPPORTED verbatim.** `tests/fixtures/expected-units/sofia-fullstack-founder-2026.json:32-42`: `normalized_summary` "Led Threadline B2B pivot from D2C-brand-as-customer to factory-as-customer, ran 38 customer development calls in six weeks; ARR per logo doubled, monthly churn dropped from 4.1% to 1.8%"; `skills` of four entries in the page's order; `tools: []` (the page's "—"); `domains: ["b2b saas", "founder operations"]`. The file's `notes` (`:5`) read "Hand-curated synthetic fixture for the full-stack engineer + bootstrapped founder archetype", and the résumé text labels its employers fictional (`resumes/sofia-fullstack-founder-2026.txt:33, 44`). Source: `git show origin/main:tests/fixtures/expected-units/sofia-fullstack-founder-2026.json | sed -n '30,44p'`.

### R36: what a production Unit carries, and who may set approval
> "a Unit the extractor returns in production also carries metrics, seniority and scope signals, an evidence type and a confidence score, all produced by the model and validated server-side against the contract above" (line 137); "Approval is not in that list, deliberately: the extractor is barred from returning it, and the server stamps every extracted Unit unapproved." (line 139)

**SUPPORTED.** The schema (R34) requires `metrics`, `seniority_signals`, `scope_signals`, `evidence_type` and `confidence_score`, and `.strict()` rejects any key not listed, so a response carrying `user_approved` fails validation. `functions/src/extraction/resume.ts:283` "Every Unit lands with `user_approved: false` so the Unit Review…" and `:335` `user_approved: false,`. Source: `git grep -n 'user_approved: false' origin/main -- functions/src/extraction/resume.ts`.

### R37: hand-typed Units
> "A user can also type a Unit by hand, and those arrive pre-approved and marked `user_confirmed`" (line 139)

**SUPPORTED.** `src/services/experienceUnits-state.ts:320-322`: `evidence_type: "user_confirmed"`, `user_approved: input.user_approved ?? true`, with the interface comment "Defaults to true—manual entries are pre-approved" (prior ledger §D13, re-read at this pin). Source: `git show origin/main:src/services/experienceUnits-state.ts | sed -n '318,323p'`.

### R38: the read gate and the first diagram
> the diagram `description` (line 141) and "unapproved Units are written to the graph immediately, and the gate is a read filter on the way out rather than a lock on the way in—which is why the audit calls it a read gate and not a write gate" (line 171)

**SUPPORTED, and still true after #500.** The description's claims map to code: Units written unapproved (R36), review flips the flag client-side via `setApproval()`, the approved-only read filter at the consumers (R15), gaps surfaced (R10, R57), generation reading only approved matches (`generation/pipeline.ts:710-722` "`approved_unit_ids` AND `user_approved == true`"), the traceability check before export (R9). The prior ledger's §D13 is the audit the page cites: "And the gate is a read gate, not a write gate." That remains so at `f27ceef`: `firestore.rules:224-232` lets the owner update `user_approved`, `rejected` and `flagged` on their own Unit, so nothing at the rules layer stops a client approving its own Unit; the gate is the read filter. Source: `git show origin/main:firestore.rules | sed -n '220,233p'`; `plans/759/project-pages-ledger.md` § D13.

### R39: the 80/80 bar
> "The quality bar was 80% extraction accuracy and 80% match accuracy. Neither was reached" (line 179)

**SUPPORTED.** Issue #177's target table: "Extraction accuracy (mean) | 48.4% | ≥80%", "Match accuracy (mean) | 19.1% | ≥80%". The PRD mirror now in the repository (`docs/projects/matchline/prds/matchline.md:119-120`) carries both 80% criteria, which closes the prior ledger's §D25 finding that the bar was cited to a spec section that did not exist; `tests/eval/run.ts:58` still calls it the "80/80 PRD bar". Source: `gh api graphql` issue #177; `git show origin/main:docs/projects/matchline/prds/matchline.md | sed -n '119,120p'`.

### R40: the single-pair chain
> "the metric collapsed to 3.3%. Token overlap lifted it to 34%. A coefficient… lifted it to 50.3%. Only then did a real system change—expanding the matching vocabulary from roughly 220 entries to 415—move it, by a single point, to 51.3%." (line 181); the second diagram (lines 183–201); "All four of those measurements came from a single résumé-and-job pair." (line 203)

**SUPPORTED.** `tests/eval/scoring.ts:11-23`: "#146 reported 3.3%… PR #147 switched to `tokenJaccard`, which lifted extraction to 34%… PR #158… `tokenOverlapCoefficient`… Live extraction lifted to 50.3%". `e2ef272` (#168, 2026-04-27): seeds 105→215, 87→138, 30→62, i.e. 222→415 entries, "Extraction accuracy | 50.3% | 51.3% | +1pp", headed "Live verification on Nathan × Google". The single pair holds because the only labeled cell before `5b095d8` (2026-04-27 15:58 PDT, "add per-pair labels for 3 strong-archetype-fit cells") was nathan×google, and #147 (`8cea2f6`, 04-26) and #158 (`44b98bf`, 04-26) predate it. Source: `git show origin/main:tests/eval/scoring.ts | sed -n '11,23p'`; `git log -1 --format='%aI%n%b' e2ef272`.

### R41: the baseline of record
> "the system scored 48.4% extraction and 19.1% match. That aggregate is still the baseline of record." (line 203); "The matching layer stayed well below its quality bar" (line 252)

**SUPPORTED (the "next day" clause of the same sentence is R2).** #177 body: "**Aggregate:** extraction 48.4% / match 19.1% / latency p50 102s, p95 236s / cost p50 $0.41, p95 $0.86. Total run cost: $2.06 across 12 paid flows", four cells, three samples each. `tests/eval/sweep.ts:486` and `:586` (added 2026-09-01) cite "#177's baseline is extraction 48.4% / match 19.1%", and the PRD mirror (2026-10-05) calls it "the result of record". The two tuning experiments recorded on #177 (threshold 0.20: +0.3pp; prompt v2: −4.9pp) were reverted or not shipped, so nothing displaced it. Source: `gh api graphql` issue #177; `git grep -n '48.4' origin/main -- tests/eval`.

### R42: the match-accuracy figures
> "Match accuracy went from 4.2% to 16.7% on that same vocabulary work… One run reported 18.1%, and three samples of that one fixture spread from 12.5% to 25.0%—eight to thirteen points of noise… a single run cost $2.06 against a $25 monthly cap, about twelve runs a month." (line 205)

**SUPPORTED.** `e2ef272`: "Match accuracy | 4.2% | 16.7% | ~4x". `edc5328`: "too noisy at --samples 3 (~8-13pp variance; this run 18.1%, range 12.5-25.0%…)"; `552e421`: "~8-13pp of pure noise into match accuracy (PR #258 swung 12.5-25.0% across 3 samples of one fixture)". The prior ledger's caution stands: 18.1% is the run mean and 12.5–25.0% the sample range, not three sample values. Cost as in R26. Source: `git log -1 --format=%b e2ef272 edc5328 552e421`.

### R43: the adversarial fixture
> "a fabricated paragraph attached to a real résumé, claiming a multi-year x86 and Arm CPU roadmap, a hundred-million-VM fleet, a 40% throughput gain on SAP HANA, and $400M in contracts displacing a competitor. None of it traces to any Experience Unit. The fixture enumerates all four untraceable claims with the reason each fails, and records the expected validation status as failed." (line 211)

**SUPPORTED.** `tests/fixtures/expected-asset-traces/adversarial-fabrication.json`: `resume_fixture_id: "nathan-2026"` (the author's own résumé, `labeled_by: nathanjohnpayne`, `labeled_at: 2026-04-26`); `adversarial_fabricated_claim` names "x86/Arm hybrid CPU architectures", "a 100-million-VM fleet", "40% on SAP HANA workloads" and "$400M in three-year cloud-migration contracts… displacing AWS"; `untraceable_claims` has four entries each with a parenthetical reason; `expected_validation_status: "failed"`; `expected_traces: []`. Source: `git show origin/main:tests/fixtures/expected-asset-traces/adversarial-fabrication.json`.

### R44: the CI run
> "It runs in continuous integration against the Firestore emulator, and a passing run means the export was blocked. That proves the orchestration refuses a known untraceable claim. It does not prove the model reliably detects a novel one, because the model checks are mocked in that test" (line 213)

**SUPPORTED (see R9 on what "export" is).** `package.json:13` `test:rules` runs `firebase emulators:exec --only firestore 'vitest run … tests/validation-fabrication.integration.test.ts …'`; `.github/workflows/test.yml:104` `run: npm run test:rules`. The mocked boundary is the test's own docstring (R27). Source: `git show origin/main:package.json | sed -n '13p'`; `git grep -n 'test:rules' origin/main -- .github/workflows`.

### R45: authored by agents, reviewed by other identities
> "Agents authored the implementation and independent agent identities reviewed it… they caught a seniority scorer that was zeroing every Experience Unit because extraction emits verbs where the ladder matched nouns, a schema converter silently returning an empty object that had disabled model-input validation across four subsystems at once, and a matching rerun that discarded the user's rejections. On that last one my own first reply to the reviewer was wrong, cited a test that did not cover the case, and the reviewer pushed back a second time before it was fixed." (line 217)

**SUPPORTED.** Reviewer identities, by GraphQL `search(type:ISSUE)` `issueCount`: of 258 merged PRs, 217 reviewed by `nathanpayne-claude`, 45 by `nathanpayne-codex`, 27 by `nathanpayne-cursor`; every PR body read for this ledger carries `Authoring-Agent: claude`. The three defects: `functions/src/matching/score.ts:525-537` ("Codex P1 review on PR #103 caught… PM/IC ownership verbs; a Unit that 'led' or 'owned'… leadership verbs"); `functions/src/llm/zodToolSchema.ts:8-14` ("passing a v4 schema collapses the output to `{}`. That silently removes upstream schema enforcement on every tool call (extraction / parsing / generation / validation), which Codex P1 caught on the first round of #165"); and the carry-forward bug, whose record is the comment at the prior pin, `06ba5fc:functions/src/matching/pipeline.ts:395-402` ("a real bug cursor CHANGES_REQUESTED round 2 on PR #133 caught after my round-1 reply incorrectly cited the rejected-Unit exclusion test (#82) as covering rejected Matches (it doesn't)"). That comment was cut when #501 rewrote the file on 2026-09-30 (only "cursor #133 r2" survives at `pipeline.ts:107`), so the current tree no longer carries the page's evidence; PR #133's review record does: `nathanpayne-cursor` posted `CHANGES_REQUESTED` four times (2026-04-26 06:33, 06:42, 07:19, 07:24 UTC) before `APPROVED` at 07:39. "A second time" is exact for the round that caught it and understates the total. Source: `gh api graphql` search counts; `git show 06ba5fc:functions/src/matching/pipeline.ts | sed -n '393,403p'`; PR #133 `reviews`.

### R46: the pause date
> "The pause has a date the commits set: the evening of 2026-07-31, Pacific, when the eval stage cache landed." (line 219)

**SUPPORTED.** `git log -1 --format=%aI e20c077` → `2026-07-31T21:25:03-07:00`; its eight files are all under `tests/eval/`. Source: `git show --stat --format=%aI e20c077`.

### R47: the month of maintenance
> "For the month after that only maintenance moved—dependency bumps and repository-template syncs, none of it touching the product." (line 219)

**SUPPORTED on the clause that matters; the list is incomplete.** Between `e20c077` and `6392ad7` (2026-08-31 18:17 PDT) there are 28 commits (`git rev-list --count e20c077..6392ad7^`): 13 Dependabot bumps, one human lockfile-only commit (`f18d62b`, "clear… security alerts"), 9 template syncs, and five commits on 2026-08-21 (`88cdbe1`…`0cf546f`) touching `REVIEW_POLICY.md`, `scripts/op-preflight.sh`, `DEPLOYMENT.md` and `tests/test_op_preflight_check.sh`, which are identity and CI tooling, neither a dependency bump nor a template sync. None of the 28 touches `src/`, `functions/`, `specs/`, `firestore.rules` or any `tests/*.ts`, so "none of it touching the product" holds. Source: `git log origin/main --since='2026-07-31T21:30:00-07:00' --until='2026-08-31T18:00:00-07:00' --format='%h %an %s'` with `git show --stat --format=` on each non-bot, non-sync commit.

### R48: commits resumed
> "Product commits resumed on 2026-08-31 and, as of 2026-09-01, are still landing; what they fixed is the subject of the next section." (line 219)

**SUPPORTED, dated.** `6392ad7` (#423) at 2026-08-31 18:17 PDT and `19c46d3` (#427) at 18:59 PDT are the first product commits after the pause; eight more landed on 2026-09-01. For the fix pull request's information: fifteen further product commits followed the page's merge at 08:56 PDT on 2026-09-01 (seven later that day, four on 09-03, two on 09-30, two on 10-01; preamble), and the "next section" describes only the 08-31 and early-09-01 fixes. Source: the commit classification in the preamble.

### R49: the 2026-05-02 build
> "rather than the 2026-05-02 build it served until then" (line 221)

**SUPPORTED on the strength of a dated observation; not reproducible today.** The prior ledger's §D19 (2026-08-31 16:53 UTC) recorded the then-served bundle `/assets/index-I4dldhGu.js` with `last-modified: Sat, 02 May 2026 03:48:27 GMT`, and PR #905 (2026-09-01) recorded the 19:02 PDT redeploy that replaced it the same day. Requesting that bundle path today returns the SPA shell (the hosting rewrite), so the old asset is gone. Source: `plans/759/project-pages-ledger.md` § D19; PR #905 body; `curl -sI https://matchline-dev.web.app/assets/index-I4dldhGu.js`.

### R50: owner scoping
> "every document is scoped to its `owner_uid`" (line 221)

**SUPPORTED.** `firestore.rules:3-4` "Every document must carry `owner_uid` matching the authenticated user, AND that user must be on the owner allowlist"; `isOwner()` at `:23-36` compares `resource.data.owner_uid == request.auth.uid`. The sentence this clause sits in is R11. Source: `git show origin/main:firestore.rules | sed -n '1,40p'`.

### R51: criteria for building, not for deciding
> "the repository had exit criteria for finishing V1, but none for deciding whether to continue" (line 225)

**SUPPORTED as history.** Prior ledger §D21, control-verified at `06ba5fc`: four sets of phase-exit criteria in `plans/matchline-sprint-0.md` and `plans/matchline-implementation-plan.md` (`:78-84`, `:131-136`, `:165-170`, `:192-197`), and nothing stating the project is paused or what would restart it. At `f27ceef` the plan's lines are unchanged (`:165-167`, `:192-197` re-read); the PRD mirror added on 2026-10-05 carries a status line and no resume or kill criteria (`grep -n -i 'kill\|restart\|exit criteria'` → only the status line's "revisiting is under consideration"). The page's criteria are, as the prior ledger required, presented as written now. Source: `git show origin/main:plans/matchline-implementation-plan.md | grep -n -i 'exit criteria'`; `git show origin/main:docs/projects/matchline/prds/matchline.md | grep -n -i 'kill\|restart'`.

### R52: the spreadsheet metric
> "The product's success metric was becoming my primary tool rather than another system abandoned for a spreadsheet." (line 236)

**SUPPORTED.** `plans/matchline-implementation-plan.md:194-195`: "PRD's V1 primary metric met: Matchline is Nathan's primary tool for the search, not abandoned for a spreadsheet." Source: `git show origin/main:plans/matchline-implementation-plan.md | sed -n '192,197p'`.

### R53: the three failures
> "missing Cloud Run invoker bindings blocked CORS preflights, trailing newlines in both provider secrets broke authentication, and extraction held a sixty-second timeout against three long model calls" (line 242)

**SUPPORTED.** #422's title: "Cloud Run rejects every function at the edge (403, missing allUsers invoker)", and PR #423's correction note: "Cloud Run rejects every function's CORS preflight with a 403 in under 0.2s". PR #427: "Both provider secrets in `matchline-dev` were stored with a trailing newline—109 raw bytes against 108 stripped… a malformed HTTP header, rejected in under a second". #422 and #423: "Firebase Functions v2's **default 60-second timeout**", with `MAX_ATTEMPTS` (3) Anthropic calls at `MAX_OUTPUT_TOKENS` 16,384; #423 notes the timeout was latent and "would not have fixed the reported failure", which is consistent with the page's "stacked". Source: `gh api graphql` issue #422, PRs #423 and #427.

### R54: extraction and parsing run end to end
> "With those fixed, résumé extraction and JD parsing run end to end—and expose a worse problem" (line 242)

**SUPPORTED.** matchline#430 (filed 2026-09-01T02:13:54Z, after #423 and #427 merged): "A new Role… and its JD were added to Matchline, and the app reported no usable match—every must-have Requirement rendered as an unmet gap", which presupposes both pipelines completed. The "worse problem" clause is R13. Source: `gh api graphql` issue #430.

### R55: the subscription CLI
> "The eval harness can now route tuning runs through a subscription CLI instead of the metered Anthropic cap that had limited testing to roughly twelve runs a month." (line 244)

**SUPPORTED.** `db5dfe3` (#390, 2026-09-01 07:43 PDT) added `tests/eval/tokenSource.ts` and `sweep.ts`; `tests/eval/README.md:80-93`: "`--token-source` routes the LLM calls through a subscription CLI instead, so tuning iterations do not draw on the $25/mo Anthropic cap", with `claude-cli` "verified end-to-end on `nathan-2026`". The README's own fidelity caveat ("the CLI path ranks, it does not replicate") is not on the page and need not be. Source: `git show origin/main:tests/eval/README.md | sed -n '80,111p'`.

### R56: the ingestion correction
> "LinkedIn and long-form ingestion were deferred. Uploaded PRDs, decks and retrospectives never existed—an earlier version of this page listed them as inputs, incorrectly, and the correction is recorded here rather than made silently." (line 97)

**SUPPORTED.** `src/routes/Onboarding.tsx:16` "LinkedIn HTML / long-form context paste flows are deferred". The earlier page version is `6910bcc` (2026-04-25, #290, "rebuild detail body from the PRD"), which introduced "decks, retros"; `d191ebd` (2026-08-31, #885) retracted it. One nuance for completeness: artifact upload was specified in the PRD (`docs/projects/matchline/prds/matchline.md:88, 172`) and the PRD's status line lists "artifact upload" among things "Not yet built", so "never existed" is right about the product and the earlier page's error was promoting a PRD input to a built one. Source: `git log main -S'decks, retros' --format='%h %ad %s' --date=short -- src/content/projects/matchline.md src/content/projects/matchline.mdx` in this repository; `git show origin/main:src/routes/Onboarding.tsx | sed -n '16p'`.

### R57: the capability table's Built rows
> "| Résumé into Experience Units | Built |", "| Approved evidence only, into matching | Built |", "| Job description into requirements, with gaps surfaced | Built |", "| Fabrication gate blocking export | Built, never user-validated |" (lines 91–94)

**SUPPORTED, with R9 governing the fourth row.** Pasted résumé → `functions/src/callables/extractFromResume.ts` → `extraction/resume.ts`; the approved-only filter at `matching/pipeline.ts:344`; `callables/parseJobRequirements.ts` and `src/routes/RoleDetail/computeGaps.ts` with `GapsView.tsx`. "Never user-validated" is consistent with R18 and R19. The gate row needs the stub noted beside it. Source: the paths named; R9.

### R58: the frontmatter descriptions
> "Paused before launch, after rebuilding the measurement system but before running it against the product again." (line 4); "Paused pre-launch at 48% extraction and 19% match against an 80% bar." (line 5); "the same 48% extraction and 19% match against an 80% bar" (line 6)

**SUPPORTED, narrowly.** 48%/19% rounds the #177 aggregate (R41). "Before running it against the product again" holds for the period after the rebuild finished on 2026-07-31: no eval run of any kind is recorded after the cache. It does not hold for the rebuild's first half, which was run in PR #262 (R3); the body's "neither was measured" is where that error lives, and the description reads correctly once the body is fixed. The `cardDescription`'s "last two working weeks" clause is R6. Source: R3, R41.

### R59: selection, sequencing, framing
> "The model's job is selection, sequencing, and framing. A claim that doesn't trace to something the user has documented and approved is treated as a defect" (line 81)

**SUPPORTED as a design statement.** `specs/matchline.md:26` "Not a generative writer—no claim ships that the user hasn't confirmed", and the core loop's four steps (`:30-37`) put the model at extraction, parsing and matching with generation drawing only on approved matches (R38). The exact words "selection, sequencing, and framing" are the page's, not the spec's. Source: `git show origin/main:specs/matchline.md | sed -n '23,37p'`.

## Cross-page and prior-ledger findings

- No cross-page inconsistency found. The Five Across page agrees on "nine-night" and "multiplayer" (R32); the Mergepath link resolves (R33).
- Two prior-ledger rows that the page inherited are themselves wrong and should be corrected in `plans/759/project-pages-ledger.md` when it is next touched: §D20's "thirteen banned phrases" (twelve; R1) and §D24's "no eval run confirming it is recorded anywhere afterwards" (PR #262's body and approval record one; R3). §D24's prohibition on stating that noise fell threefold stands as a rule about the page, but its premise, that no measurement exists, does not: #262 measured 12.5pp → 4.1pp on one fixture, three samples, which is a 3× collapse of the range on that fixture and nothing more.
- Issue #177's body was edited on 2026-10-03 (`userContentEdits`) to add "Status (2026-10-03): done… it collapsed per-sample match variance about 3× and put the stable nathan × google baseline at about 19%", which restates the #262 result; it is a belief statement dated five weeks after the page and is not used as a source above.

## Fixes applied

Applied 2026-10-06 to `src/content/projects/matchline.mdx` on `claude/correctness-pass-2026-10-06`, per `FIX-BRIEF.md`. Vale at error level: clean. `scripts/verify-brevity.py` not run: no text was cut for length (decision 3's evidence grew by two lines to carry the #262 figures; one clause in it was tightened to offset).

- R1: "the thirteen phrases the validator refuses to let through" -> "the twelve phrases".
- R2: "Run the next day across all four labeled pairs" -> "Run later the same day across all four labeled pairs".
- R3: decision 3 evidence, "Both repairs landed and neither was measured… nobody ran the repaired metric in any of it… rather than with evidence that the instrument was better" -> "Both repairs landed; only the first was measured. The mapping fix was run once, in its own pull request, on one fixture at three samples: the range fell from 12.5 points to 4.1 and the mean settled at 19.4%… no run under the repaired mapping ever touched the four-pair corpus, and none followed the cache… and one fixture's worth of evidence that it was better" (one rewrite covering R3, R4 and R5).
- R4: decision 3 cost, "its last recorded accuracy unchanged—nothing measured it after the repair—" -> "its four-pair baseline unchanged—the one run after the mapping repair confirmed the noise fell and the mean sat near 19%—".
- R5: decision 4 cost, "the run that would have shown whether the repair worked was never made" -> "the four-pair run under the repaired mapping, the run the cache was built to make cheap, was never made".
- R6: `cardDescription` "the last two working weeks fixed the ruler" -> "the final session fixed the ruler"; decision 3 cost "The last two working weeks produced no user-visible change" -> "The final session produced no user-visible change"; body "So the last working sessions went into the instrument" -> "So the last working session went into the instrument".
- R7: "The fixture carries the four fields the scorer compares" -> "The fixture carries four fields, of which the scorer compares two, the summary and the skills".
- R8: table "Latency and cost targets | Designed only" -> "Measured once (2026-04-27): cost met, latency 11.8× over".
- R9: `description`, `seoDescription`, `ogDescription` "blocks the export" -> "disables export"; table "Fabrication gate blocking export | Built, never user-validated" -> "Built, never user-validated; the export it gates is a Phase 2 stub" (the caveat appears once, there). Left as is: decision 1 `chosen` ("disable export while any claim fails to trace", already the gate's verb), the diagram description ("blocks the export until the user resolves it", describing the gate), "a passing run means the export was blocked" (the test's own docstring language) and "refuse an untraceable export" (the gate's behaviour), all of which describe the control rather than assert a working export.
- R10: "surfaced as gaps in the same list as the matches rather than hidden behind a tab" -> "surfaced as a gaps panel in the same tab as the matches, above the list, rather than on a separate screen".
- R11: "Signing in with a new account gets an empty instance—every document is scoped to its `owner_uid`—so the link shows the shell, not the corpus." -> "Signing in with another account gets nothing: since 2026-09-30 an owner allowlist refuses every read and call from any uid but mine, so the link shows the shell, not the corpus."
- R12: "It was redeployed on the evening of 2026-08-31 and now carries the June and July work this page rests on, rather than the 2026-05-02 build it served until then." -> "It was redeployed on the evening of 2026-08-31, replacing the 2026-05-02 build it had served until then, and again on 2026-10-02, so the live build carries the June and July work this page rests on and the fixes that followed."
- R13: "résumé extraction and JD parsing run end to end—and expose a worse problem: the matching ontology fails on out-of-domain requirements, so `jaccard()` zeros 45% of the score before fit is considered" -> "ran end to end—and exposed a worse problem: the matching ontology under-recognizes out-of-domain requirements, and until a fix on 2026-09-01 `jaccard()` zeroed 45% of the score before fit was considered".
- R14: constraint "10 × 11 | the whole evaluation corpus: résumés by job descriptions" -> "10 × 12 | the evaluation corpus on 2026-10-06: résumés by job descriptions".
- R15: "at all three places evidence is consumed" -> "at every place evidence is consumed, four as of 2026-10-06".
- R18 (UNPROVABLE, weaker form applied): "no use of a generated output by a user is recorded anywhere" -> "the product records no use of a generated output by a user".
- R16 left as is: already framed as the product's premises.
- R17 left as is: the author's own testimony about research he did not do; the repository agrees.
- R19 left as is: the author is the product's only user and the authority on whether he ran a real application through it; the record does not contradict him.
- R20 left as is: the author's own account of what prompted the live test; the sequence supports it.
- R21 left as is: the page labels the causal claim as its own reasoning.
- R22 and R48 (SUPPORTED) left as is: `status: "PAUSED"`, "The project remains paused" and the dated "as of 2026-09-01" sentence stand; the later product commits are recorded in this ledger, not on the page.

Test assertion updated: `tests/project-pages.test.js`, in `does not claim no deployment exists`, one added expectation after the existing `/redeployed on the evening of 2026-08-31/` pin: `expect(source(), 'the later redeploy must be dated too').toMatch(/and again on 2026-10-02/)`, with a two-line comment citing the `version.json` buildId. The existing pins on "redeployed on the evening of 2026-08-31", "as of 2026-09-01", the absent "It dates from 2026-05-02…" claim, the card's "48% extraction and 19% match against an 80% bar" and "Paused" all still match the new wording (checked by grep against the source; the dist-backed assertions need the coordinator's build).

Other surfaces: none need a change. The résumé mirror (`src/content/resume/projects/matchline.md`), the OG template (generated from frontmatter since #1089) and the index card (reads `cardDescription`) carry none of the corrected strings, confirmed by `grep -rn` over `src/` and `tests/` for each changed phrase.
