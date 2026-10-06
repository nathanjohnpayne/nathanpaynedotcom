# Facts ledger, 2026-10-06 correctness pass: `autofix-was-the-whole-cost`

Page source: `src/content/blog/autofix-was-the-whole-cost.md`. Surface: `https://nathanpayne.com/blog/autofix-was-the-whole-cost/`. Retrieval timestamp for every API figure: 2026-10-06. Prior ledger: `plans/759/autofix-was-the-whole-cost-ledger.md` (shared cache `plans/759/refs.json`).

**Provenance of the page under audit.** The checkout's file is byte-identical to `main` and `origin/main` (`git diff --stat main -- <file>` empty). `main` carries eight revisions of the post: `fe29266` (#746, first publication, 2026-08-24T23:07:14Z), `c10e3a8` (#749), `7b1937a` (#780), `6a016ef` (#803, the correction pass the prior ledger fed, 2026-08-26), `05e89a2` (#1000, Mermaid line breaks), `d217fd8` (#1016, American English), `913c293` (#1037, `homepageRank`), `7d44eff` (#1083, `description` rewrite, 2026-10-01). The prior ledger knew only the first three. Whole-file word count today: 4,993 (`wc -w`). The live surface reproduces every corrected string checked (`across the 14 files`, `sixteen rounds`, `54 findings across 22 rounds`, `1,721 lines`, `42 name the auto-fix path`, `e42483b`, `the bespoke tool`, `37 content files`) and none of the retired ones (`eighteen rounds`, `38 content files`, `nearly all`: zero hits), so the #803 corrections did land. Evidence repository for every bare `#NNN` on the page is `nathanjohnpayne/nathanpaynedotcom`: every number resolves there by title and date (GraphQL batch, 2026-10-06), and none is used in a mergepath sense. The one unnamed reference ("the issue's criteria", L163) is nathanpaynedotcom #745.

**Counting methods used throughout.** Line counts are `git show "<sha>:<path>" | wc -l` in this checkout (brace the ref in zsh). The PR-only commits `147d9a7` and `abe3bfb` resolve locally because `origin/claude/686-merge` still exists. Review submissions are `gh api --paginate --slurp repos/nathanjohnpayne/nathanpaynedotcom/pulls/<n>/reviews?per_page=100 | jq '[.[][]]'`; inline findings are the same over `pulls/<n>/comments` filtered to `in_reply_to_id == null`; rounds group those by `pull_request_review_id` in `created_at` order. Frontmatter item counts parse every `src/content/**/*.{md,mdx}` with `js-yaml` from a `git archive` of the named ref and sum `tags`, `keyTakeaways`, `pullquotes[].text`, `sidebar[].content`.

**What the prior ledger got wrong, found while re-deriving.** §N.9 (a dependency "added after the cut"): the dependency predates the cut by 27 hours (R1). §H3 ("no issue was found tracking it"): #715 was filed the day before publication and the search had no control (R7). §N.21 ("deleted branch `claude/686-merge`… resolve in no fresh clone"): the branch exists on origin at `bf1309a` (R4). §F3's "within six lines" became a page claim and does not describe the figure it names (R2).

## Summary

| # | Claim (verbatim, abbreviated) | Location | Verdict | Corrected value or weaker form | Source |
|---|---|---|---|---|---|
| R1 | "the third is documentation debt from a dependency added after the cut" / "from a dependency added after it" | L117, L177 | WRONG | The dependency (`micromark-util-decode-numeric-character-reference`) was added in `2e2b9da`, 2026-08-22T20:44:05Z, 27 h before the cut; finding 57 is documentation debt about a dependency the PR added on its first day | `git show 2e2b9da -- package.json`; `git diff abe3bfb ee3ec7f -- package.json` empty |
| R2 | "printed two of its figures six lines apart… a two-session token count beside a one-session dollar figure" | L153 | WRONG | Six lines from the two-session count (L131) sat the three-session $712.66 total (L137); the one-session dollar figures were in the sidebar (L36, L38) | `git show fe29266:<file>` L131, L137, L36 |
| R3 | "returns **25**, because four findings continue the sentence differently" | L127 | WRONG | Three continue it differently (findings 5, 33, 53); finding 47 continues it identically but lowercase. 29 and 25 are right | `pulls/686/comments`, bodies of the 29 |
| R4 | "a fresh clone needs `git fetch origin pull/686/head` before it can resolve them" | L63 | WRONG | Not reachable from `main`; a fresh clone resolves them today via `origin/claude/686-merge`, and `pull/686/head` is the durable route | GraphQL `ref(qualifiedName:"refs/heads/claude/686-merge")` → `bf1309a` |
| R5 | "That job is not one of `main`'s five required status checks… branch protection will let a human merge past a red result… stops the automated merge and can be waved through by hand—a deliberate split" | L181 | STALE | Since 2026-09-01T19:09:22Z `main` requires seven contexts including `build-and-test` and `lint`; the split no longer exists (an admin can still bypass because `enforce_admins` is false, a different mechanism) | `branches/main/protection` (author PAT); #909 comment 2026-09-01T19:09:22Z |
| R6 | "still unfinished, because nothing records what was waved through" | L181 | STALE | #1072 (merged 2026-09-30T16:28:38Z) added `merge-bypass-audit.yml`, which detects a merge past a red or missing required check within minutes and files an issue | GraphQL #1072; `.github/workflows/merge-bypass-audit.yml` |
| R7 | "Turning those violations into tracked issues is a piece I intend to build and have not" | L181 | STALE | #715 tracked exactly this from 2026-08-23T23:27:01Z (before publication) and was closed `not_planned` on 2026-09-06T00:53:17Z | `issues/715` |
| R8 | "On this site that is 127 prose-bearing list items across the 14 files… tags (62), key takeaways (28), pull-quote texts (29), and sidebar content blocks (8). Fifty-seven…" | L212, L17 | STALE | True at publication (`fe29266`: 127/14/57). Today 165 items across 17 files (77/40/38/10), 78 reader-facing; at the migration boundary `aff0c23` it was 113 across 13 (57/24/26/6), 50 reader-facing | js-yaml parse of `git archive` at `fe29266`, `aff0c23`, `main` |
| R9 | "$60.81 for the PR #686 hardening session and $59.95 for the Vale migration" and the Codex rows of the session table | L37, L157–L160 | UNPROVABLE | Author-attested, as the page already says; no artifact in either repository carries them | no tracked or untracked source |
| R10 | "2.27 million fresh input… 285,100 output… 99,453… reasoning"; "1.78 million output tokens across 1,872 assistant turns"; "848 million tokens" | L165, L31 | UNPROVABLE | Author-attested session counters; 1.78 M and 848.6 M reconcile with the dollar arithmetic but from the same telemetry | sidebar arithmetic only |
| R11 | "None of this was billed—every session ran under a subscription" / "`billed_usd: 0.0`… the receipt behind 'nothing was invoiced'" | L35, L149 | UNPROVABLE | `totals.billed_usd: 0.0` covers only the four ledgered external-review runs; the authoring sessions' subscription status is author-attested | `~/GitHub/nathanpaynedotcom/.mergepath/phase-4b-ledger.jsonl` |
| R12 | "the only reason I looked is that someone asked whether the work was converging" | L129 | UNPROVABLE | 0 of 43 comments on #686 contain "converg" (control: 40 contain "review"); #745 does, but postdates the cut | `issues/686/comments`; `issues/745` |
| R13 | "Codex CLI and Claude Code sessions wrote the code" | L135, L157–L161 | UNPROVABLE | No commit on #686 carries a `Co-Authored-By` trailer; the PR's head is `codex/issue-684-em-dash-safety` and its last commits are merges into `claude/686-merge` | `pulls/686/commits`; GraphQL `headRefName` |
| R14 | "The first draft said auto-fix produced most of the code" / "I claimed auto-fix had produced *most of the code*" | L242, L61 | UNPROVABLE | The earliest text in the record (`52b53d0`, #746's first commit) already carries the correction; the draft that made the claim is not in the repository | `contents/<file>?ref=52b53d0` |
| R15 | "1,513 Lines for One Dash"; "the tool as it finally merged, and the exact line count later deleted whole" | L2, L49, L187 | SUPPORTED | 1,513 at `a37bb51` and `6358402`; #721 (`aff0c23`) deletes it at −1,513 | `git show`; `git show --stat aff0c23` |
| R16 | "peaked at 1,721 lines of code and a 1,196-line test suite" | L49, L67 | SUPPORTED | 1,721 / 1,196 at `147d9a7` | `git show "147d9a7:…" \| wc -l` |
| R17 | "57 findings across 24 review rounds. Twenty-two of those rounds came before… 54 findings" | L49, L22, L117, L119, L242 | SUPPORTED | 57 top-level findings, 24 review ids; rounds 1–22 sum 54 | `pulls/686/comments` grouping |
| R18 | "merged within the hour"; "four more commits, two more review rounds, and three more findings… merged 56 minutes later" | L14, L49, L177 | SUPPORTED | `abe3bfb` 23:33:42Z → merged 00:30:00Z = 56 m 18 s; commits `c41f4f0`, `c1769e4`, `ee3ec7f`, `bf1309a`; rounds 23–24 carry 1 + 2 | `pulls/686/commits`; GraphQL `mergedAt` |
| R19 | "2,917 lines to 2,417—a net reduction of 500 lines, or 17%… 12.6% of the linter and 23.7% of the tests" | L61, L5, L14, L19, L51 | SUPPORTED | 1,721→1,505 (−216, 12.55%); 1,196→912 (−284, 23.75%); 2,917→2,417 (−500, 17.14%) | `git show` at `147d9a7`, `abe3bfb` |
| R20 | The four-state table: `147d9a7` 1,721/1,196/2,917; `abe3bfb` 1,505/912/2,417; `a37bb51` (#720's merge) 1,513/940/2,453; `e42483b` (#725's merge) 1,343; reproduction command | L63–L70 | SUPPORTED | All twelve cells reproduce; `a37bb51` and `e42483b` are the merge commits of #720 and #725 | `git show … \| wc -l`; GraphQL `mergeCommit.oid` |
| R21 | "four fix commits landed on top of the cut before the merge"; third row "slightly larger" | L72 | SUPPORTED | +8 script, +28 test lines across the four post-cut commits | `pulls/686/commits`; counts above |
| R22 | "42 name the auto-fix path outright… six more… 48 of 57… three… prose detection, three… test harness, two CodeQL… one dependency note. Not one was unrelated. Three in four… four in five" | L74, L5, L6, L14, L19, L76, L82 | SUPPORTED | Strict matcher 42; + findings 10, 12, 21, 36, 42, 49 = 48; residue 11/44/45, 13/38/55, 34/35, 57; 73.7% and 84.2% | `pulls/686/comments`, matcher stated in R22 |
| R23 | "Issue #664, which scoped the work, counted thirteen real occurrences across ten files—and classified roughly 250 further matches as out of scope: link labels…, a shell comment…, internal prose in specs, docs, and code comments" | L58 | SUPPORTED | #664 body: "Thirteen occurrences across ten files"; out of scope 9 + 1 + 63 + 69 + 106 = 248, in exactly those categories | `issues/664` body |
| R24 | "Recognize the forbidden pattern. One line of pattern matching. Worked on day one, never caused a problem." / "~1 line" | L57, L78 | SUPPORTED | `PADDED_EM_DASH` is one regex line, byte-identical from `2a8cb68:27` to `147d9a7:29`; no #686 commit touched it | `git log -S'const PADDED_EM_DASH' d932f42^..bf1309a` empty |
| R25 | "at the peak commit, line 1,609 of the linter returns the untouched source unless the structure-preservation check accepts the candidate" | L109 | SUPPORTED | `return structureIsPreserved(…) ? candidate : source;` | `git show 147d9a7:scripts/lint-content-em-dash.mjs \| sed -n 1609p` |
| R26 | "#686 carries 113 review submissions; 24 included at least one top-level inline comment… Codex GitHub App (17 rounds, 45 findings), CodeRabbit (6 rounds, 10 findings), and GitHub's CodeQL scanner (one round, 2 findings)" | L117 | SUPPORTED | 113 reviews; 24 review ids with findings; 17/45, 6/10, 1/2 by login | `pulls/686/reviews`, `pulls/686/comments` |
| R27 | "the auto-fix removal landed at 23:33 UTC on August 23, and rounds 23 and 24 reviewed commits after it… two are cleanup about the removal itself"; "Every review comment records the commit it was written against" | L117, L177 | SUPPORTED | `abe3bfb` committed 2026-08-23T23:33:42Z; round 23 on `c1769e4`, round 24 on `ee3ec7f`; findings 55 and 56 are removal cleanup (`original_commit_id` on every comment) | `pulls/686/commits`; `pulls/686/comments` |
| R28 | Series `3 3 3 1 3 4 3 3 2 1 2 5 2 3 3 1 1 1 1 5 2 2`; "first eleven rounds average 2.55 and the last eleven 2.36"; "round 20 produced five findings, more than round 3… last round before the cut still produced two" | L122, L125, L22 | SUPPORTED | Exact; 2.545 / 2.364; round 20 = 5, round 3 = 3, round 22 = 2 | round grouping above |
| R29 | "Twenty-nine of the 57 findings—all from the Codex App's 45… `grep -ic 'fresh evidence beyond'` returns 29… `grep -c 'Fresh evidence beyond the resolved'` returns 25… Half the findings" | L127 | SUPPORTED | 29 case-insensitive, all `chatgpt-codex-connector[bot]`; 25 exact-case; 50.9% | bodies of `pulls/686/comments` |
| R30 | "the first published version argued non-convergence partly from two rounds that postdate the cut"; "said the loop 'ended in a single commit'" | L115, L177 | SUPPORTED | `fe29266` L21 "round twenty-four still producing two", L48 "finished in a single commit", L74 "Loop ended in a single commit" | `git show fe29266:<file>` |
| R31 | "#668 (13 loops, 434,420 tokens), #678 (2 loops, 55,514), #681 (1 loop, 16,774), and #682 (1 loop, 17,846): 524,554 tokens across 17 review loops"; gitignored; loop ↔ `nathanpayne-codex` review table; "every per-category field null"; "`billed_usd: 0.0` on every record" | L137–L149 | SUPPORTED | Ledger records exact; `.gitignore:58`; API reviews by that login 13/2/1/1/0/10/1; loop `tokens` fields null, `source: codex-cli-stderr`; `totals.billed_usd: 0.0` on all four | ledger file; `pulls/<n>/reviews` |
| R32 | "its zero in the table means it never entered the external-review lane; the 434,420 tokens belong to #668, the pull request that introduced the tool" | L151 | SUPPORTED | No ledger record and zero `nathanpayne-codex` reviews on #686; `2a8cb68` (#668) is the commit that adds both files (920/618 lines) | ledger; `git log --diff-filter=A` |
| R33 | "the 28 reviews the Codex App posted across the arc, the 63 from CodeRabbit, the 10 external-review loops on the Vale rollout"; "17 and 27 on #686 and 4 and 33 on #720" | L151, L169 | SUPPORTED | 6+1+0+0+17+4+0 = 28; 2+1+0+0+27+33+0 = 63; 10 on #720 | `pulls/<n>/reviews` histograms |
| R34 | "256 review submissions and 126 inline findings" with the stated counting rule; "#686 carries 113… #720 carries 90, well past one page" | L15, L169, L149 | SUPPORTED | 45+4+1+1+113+90+2 = 256; 40+6+0+0+57+23+0 = 126 | paginated reviews and comments |
| R35 | "about 49 hours… #686 alone was open for 30 of them: 62% of the wall time, 44%… (113 of 256), 45%… (57 of 126). Four of the seven pull requests merged in under sixteen minutes… on three of them—#681, #682, and #721—neither review bot posted" | L169 | SUPPORTED | 48 h 56 m 54 s; 30 h 11 m 43 s (61.7%); 44.1%; 45.2%; #678 6 m, #681 15 m, #682 3 m, #721 12 m; zero bot reviews on #681/#682/#721 | GraphQL `createdAt`/`mergedAt`; histograms |
| R36 | "$0.02 + $130.61 + $416.86 + $44.41 = $591.90… 1.78 million output… 833.7 million cache reads, 13.06 million cache writes, 0.004 million fresh… 848.6 million… $712.66"; "Cache reads alone are 70%" | L39, L41, L167 | SUPPORTED | Arithmetic exact: 1.7764 M, 833.72 M, 13.061 M, 0.004 M, 848.561 M; 70.43%; 60.81+59.95+591.90 = 712.66 | recomputed |
| R37 | "at $5/M fresh input, $10/M cache writes on this session's one-hour cache TTL, $0.50/M cache reads and $25/M output" for Claude Opus 5, "list rates published on August 24, 2026" | L39, L35, L167 | SUPPORTED | The linked page today lists Claude Opus 5 at $5 / $10 (1 h) / $0.50 / $25; the August 24 state is not retrievable, but nothing contradicts it | WebFetch `platform.claude.com/docs/en/about-claude/pricing` |
| R38 | "gpt-5.3-codex-spark, which has no established public API equivalent" | L41 | SUPPORTED | `/api/docs/models/gpt-5.3-codex-spark` → 404; absent from the pricing page (control: `gpt-5.3-codex` 200 and priced at $1.75/$0.175/$14) | `curl -sI`; WebFetch pricing page |
| R39 | "an em dash takes no space on either side. Chicago's own Q&A puts it in a single line, with the exceptions it does allow"; alt "The exceptions it grants are for hyphens and en dashes; the em dash has none" | L45, L47 | SUPPORTED | Q&A answer: "Chicago style omits spaces around hyphens, en dashes, and em dashes. There are exceptions where a single space is allowed after a hyphen or en dash" (one rule sentence, three in all) | WebFetch of the cited Q&A page (curl gets 403) |
| R40 | "The Punctuation Guide calls the em dash perhaps the most versatile punctuation mark there is—it can stand in for commas, parentheses, or a colon"; alt text | L97, L99 | SUPPORTED | Page: "The em dash is perhaps the most versatile punctuation mark… can take the place of commas, parentheses, or colons"; "Do not mistake the em dash (—) for the slightly narrower en dash (–) or the even narrower hyphen" | WebFetch |
| R41 | "a style manual revised for over a century—the Chicago Manual of Style is in its eighteenth edition"; alt "a century-old published standard" | L187, L189 | SUPPORTED | First edition 1906; 18th edition September 2024 | WebFetch Wikipedia |
| R42 | "Vale, an open-source prose linter" | L187 | SUPPORTED | vale.sh: "OPEN SOURCE · MIT" | WebFetch |
| R43 | "Codex GitHub App" link; CodeRabbit link | L117 | SUPPORTED | `learn.chatgpt.com/docs/third-party/github` is "Review GitHub pull requests with Codex" (200); coderabbit.ai 200 | WebFetch; `curl -sI` |
| R44 | Migration table 1,513 / 7 / 509 / 6 / 940→821 / 2,453→1,343; "A 45% reduction. Not a two-hundred-fold collapse"; "seven lines of configuration" | L16, L191–L204 | SUPPORTED | At `e42483b`: `styles/CMOS/EmDash.yml` 7, `scripts/lint-prose.mjs` 509, `.vale.ini` 6, `tests/vale-prose-lint.test.js` 821; 45.25%; 1,513/7 = 216 | `git show … \| wc -l` |
| R45 | "`e42483b`, #725's merge—53 minutes after the old tool was deleted… still before this post was published; the largest excluded item is the script that installs Vale, 93 lines… 1,343 to 1,436 and the reduction from 45% to about 41.5%" | L193 | SUPPORTED | #721 05:43:06Z → #725 06:36:46Z = 53 m 40 s; #746 merged 23:07:15Z; `ensure-vale.sh` 93 at `e42483b`, largest Vale fixture 71; 41.46% | GraphQL; `git show` |
| R46 | "Vale… does not check items in bulleted lists inside a post's metadata block"; description "it skipped list items in post metadata yet reported green" | L210, L5 | SUPPORTED | #720 added "an explicit frontmatter extraction adapter" (`frontmatterOf`, `scripts/lint-prose.mjs:121`) because Vale skips Markdown front matter; #722 records the current content was clean, so a straight swap would have passed | `gh pr view 720 --json body`; `scripts/lint-prose.mjs` |
| R47 | "add the new tool alongside the old one and run both (#720), then remove the old one only after comparing them (#721)" | L216 | SUPPORTED | #720 "feat: prove Vale alongside the legacy prose gate" merged 05:19:33Z; #721 "chore: remove superseded em-dash linter" merged 05:43:06Z | GraphQL |
| R48 | "all 174 test cases… zero mismatches across all 174… 149 matched. 25 differed—18… 7" | L17, L222, L224 | SUPPORTED | #722 body: 174 harvested from `6358402`, harness reproduced exactly, 149/25, 18 lost, 7 gained | `issues/722` body |
| R49 | "zero times across the 37 content files as they stood at `6358402`… the corpus reached 38 files when this post was added… three times—once in a code span and twice inside a fenced block" | L226 | SUPPORTED | 37 files at `6358402` and `aff0c23`, 38 at `fe29266`; `**—**` appears 3 times in `src/content`, L101 (code span) and L104 ×2 (fence) | `git ls-tree`; `git grep -o` |
| R50 | "an issue… one minute and fifty-five seconds before it" | L228 | SUPPORTED | #722 created 05:41:11Z; #721 merged 05:43:06Z | GraphQL |
| R51 | "The gate still exits non-zero, which fails the `build-and-test` job that runs it"; "`.github/required-head-checks`, containing both `lint` and `build-and-test`… the automated merge path verifies that list against the head commit before arming" | L181 | SUPPORTED | `lint-prose.mjs` exits 2; job `build-and-test` runs `npm run lint` → `lint-all.sh:26` prose gate; file holds exactly those two lines; consumed by `agent-review.yml`, `dependabot-auto-merge.yml`, `approval-merge-continuation.sh` | checkout |
| R52 | Cross-reference `/blog/perfect-score-wrong-axis/`; three images; OG image; `date: 2026-08-24` | L131, L47, L99, L189, L12, L10 | SUPPORTED | All five URLs 200; #746 merged 2026-08-24T23:07:15Z | `curl -sI`; GraphQL |
| R53 | "sixteen rounds after the series had already shown its shape" / "sixteen rounds earlier" | L14, L236 | SUPPORTED | Round 22 − round 6 = 16 | round grouping |
| R54 | "the pull request that tried to make its auto-fixer safe" | L49 | SUPPORTED | #686 "fix(lint): make em-dash autofix source-safe" | GraphQL |
| R55 | "Two of the issue's criteria cannot be met… the fresh, cached, cache-write, cache-read and output quantities the issue asks for" | L163 | SUPPORTED | #745's acceptance criteria ask for exactly those quantities; the page never names #745 | `issues/745` body L47–L48 |

Counts: WRONG 4, STALE 4, UNPROVABLE 6, SUPPORTED 41.

## Rows

### R1: the post-cut dependency was not post-cut
> "Their three findings are of a different kind—two are cleanup about the removal itself, the third is documentation debt from a dependency added after the cut." (line 117); "two were cleanup about the removal, the third documentation debt from a dependency added after it." (line 177)

**WRONG.** Finding 57 (round 24, reviewing `ee3ec7f`) reads "Document the added numeric-reference dependency. Adding this fifth direct parser dependency leaves `.ai_context.md:87-95` claiming that the lint gate declares exactly four direct dependencies". That dependency is `micromark-util-decode-numeric-character-reference`, and the only commit on #686 that adds it is `2e2b9da` "fix: harden em-dash source alignment", committed 2026-08-22T20:44:05Z, which is 26 h 50 m before the removal commit `abe3bfb` (2026-08-23T23:33:42Z). `git diff abe3bfb ee3ec7f -- package.json` is empty, so nothing was added between the cut and the round that raised the finding. The finding is documentation debt (the inventory lagged the dependency), and it was raised after the cut, but the dependency was added before it. The prior ledger's §N.9 made the same error. Source: `git show --format='%h %cI %s' 2e2b9da -- package.json` -> `+ "micromark-util-decode-numeric-character-reference": "^2.0.2"`; `git log d932f42^..bf1309a -- package.json` -> `3a825ad` (merge), `4a5e4a4` (#673 from main), `2e2b9da`. Fix: "the third is documentation debt: the dependency inventory had not been updated for a parser dependency the pull request added on its first day".

### R2: which figure sat six lines away
> "the first version of this post printed two of its figures six lines apart with different populations—a two-session token count beside a one-session dollar figure—without saying so." (line 153)

**WRONG.** In `fe29266` the two-session count ("The two Codex CLI sessions associated with #686 recorded **2.27 million fresh input tokens and 285,100 output tokens**") is at L131, and the figure six lines later at L137 is "the three sessions with the necessary category splits come to about **$712.66**", a three-session total. The one-session dollar figures ($60.81 at L36, $591.90 at L38) were in the sidebar, 95 source lines away, though rendered beside the body. The population mismatch the sentence describes was real; the pairing it names is not the one that was six lines apart. Source: `git show fe29266:src/content/blog/autofix-was-the-whole-cost.md | sed -n '36p;38p;131p;137p'`. Fix: "printed a two-session token count in the body and a one-session dollar figure in the sidebar beside it, without saying the populations differed".

### R3: why the exact-case literal returns 25
> "the exact-case longer literal `grep -c 'Fresh evidence beyond the resolved'` returns **25**, because four findings continue the sentence differently." (line 127)

**WRONG, on the explanation only.** The 29 and the 25 both reproduce (R29). Of the four findings in the case-insensitive set that miss the exact-case literal, three continue the sentence differently: finding 5 "Fresh evidence beyond the class/inline-style fix", finding 33 "Fresh evidence beyond the mapping and sequence cases", finding 53 "Fresh evidence beyond the whitespace-separated flow-key case". Finding 47 continues it identically ("fresh evidence beyond the resolved same-line mapping-key case") and misses only because it is lowercase mid-sentence. Source: `pulls/686/comments` top-level bodies in `created_at` order, filtered to `/fresh evidence beyond/i` and not containing the literal. Fix: "because three findings continue the sentence differently and one writes it in lower case".

### R4: a fresh clone does resolve the two PR-only commits
> "The first two commits live on the pull request rather than on `main`, so a fresh clone needs `git fetch origin pull/686/head` before it can resolve them" (line 63)

**WRONG, minor.** `147d9a7` and `abe3bfb` are not reachable from `main`, which is the sentence's substance, but the branch `claude/686-merge` still exists on origin at `bf1309a` (#686's final commit) and contains both, so a default `git clone` resolves them without any extra fetch; this checkout resolves them for that reason. The prior ledger's §N.21 called the branch deleted; it is not. `git fetch origin pull/686/head` works and is the route that survives a branch deletion. Source: `gh api graphql` `ref(qualifiedName:"refs/heads/claude/686-merge"){target{oid}}` -> `bf1309acb533…`; `git branch -a --contains 147d9a7` -> `remotes/origin/claude/686-merge`. Fix: "are not reachable from `main`; `git fetch origin pull/686/head` resolves them in any clone".

### R5: `build-and-test` is a required check now
> "That job is not one of `main`'s five required status checks—those are all review-policy gates—so branch protection will let a human merge past a red result. But the repository keeps a second, separately configured list at `.github/required-head-checks`… So a punctuation violation stops the automated merge and can be waved through by hand—a deliberate split, and still unfinished" (line 181)

**STALE.** On 2026-09-01T19:09:22Z a comment on #909 records "Option 1 applied: `lint` and `build-and-test` are now required on `main`… Branch protection's required contexts went from five to seven", and the protection read today returns seven contexts: the five review-policy gates plus `build-and-test` and `lint`. The "deliberate split" between the two lists no longer exists; both surfaces agree. A human can still merge past a red check only because `enforce_admins` is false (#1024's finding, still true today), which is a different mechanism from the one the page describes. The page does not date the claim, and the prior ledger verified the five on 2026-08-25, so it was true at publication. Source: `GH_TOKEN=<author PAT> gh api repos/nathanjohnpayne/nathanpaynedotcom/branches/main/protection --jq '.required_status_checks.contexts'` -> seven contexts; `--jq '.enforce_admins.enabled'` -> `false`; `issues/909/comments` 2026-09-01T19:09:22Z. (The reviewer PAT gets 404 on this endpoint and `[]` from `rules/branches/main`; the author PAT is required.) Fix: date the paragraph to August 2026 and add that `build-and-test` and `lint` became required on 2026-09-01.

### R6: bypassed merges are now recorded
> "a deliberate split, and still unfinished, because nothing records what was waved through." (line 181)

**STALE.** #1072 "Detect merges that bypass required checks within minutes (#1024)" merged 2026-09-30T16:28:38Z and added `.github/workflows/merge-bypass-audit.yml`, which replaces the weekly `pr-audit.yml` cron as the only detector; #1024 had documented six merges past red or missing required checks found only after the fact. Source: GraphQL `pullRequest(number:1072){state mergedAt}` -> `MERGED`, `2026-09-30T16:28:38Z`; `ls .github/workflows/merge-bypass-audit.yml`; `issues/1024` body. Fix: "nothing recorded what was waved through until #1072 (2026-09-30)".

### R7: the tracking-issue intention
> "Turning those violations into tracked issues is a piece I intend to build and have not." (line 181)

**STALE.** Issue #715 "lint(content): file a tracking issue when a prose violation reaches main" was opened 2026-08-23T23:27:01Z, the day before the post was published, and describes exactly this piece (its body quotes the same five required contexts). It was closed `not_planned` on 2026-09-06T00:53:17Z by `nathanpayne-claude`, cross-referenced from #718 and #719. So at publication the intention had a filed item, and today the record says the item is not planned; the prior ledger's §H3 reported "no issue was found tracking it" from a search with no control. Source: `gh api repos/nathanjohnpayne/nathanpaynedotcom/issues/715 --jq '{state,state_reason,created_at,closed_at}'`. Fix: "was filed as #715 and closed as not planned on 2026-09-06", or drop the sentence.

### R8: the frontmatter list-item count has moved
> "On this site that is 127 prose-bearing list items across the 14 files that carry them—tags (62), key takeaways (28), pull-quote texts (29), and sidebar content blocks (8). Fifty-seven—the pull quotes and key takeaways—are rendered prominently on every post" (line 212); "127 prose-bearing items across 14 files, 57 of them reader-facing" (line 17)

**STALE.** The figure reproduces exactly at first publication (`fe29266`: 62 + 28 + 29 + 8 = 127 across 14 files, 57 reader-facing) and at `7b1937a`, and the page's present tense was true then. Today `main` holds 36 content files with frontmatter (the seven project pages are now `.mdx`, three posts were added) and the same rule gives 77 + 40 + 38 + 10 = 165 items across 17 files, 78 reader-facing. The figure also includes this post's own 14 items (5 + 4 + 3 + 2); at the migration boundary `aff0c23`, which is what the sentence is about, it was 57 + 24 + 26 + 6 = 113 across 13 files, 50 reader-facing. Source: `git archive <ref> src/content | tar -x` then a `js-yaml` parse summing `tags`, `keyTakeaways`, `pullquotes[].text`, `sidebar[].content` over `*.md` and `*.mdx` (the same rule the prior ledger §G2 published; counting every sequence item instead gives 186 at `fe29266`). Fix: date it ("at publication, 127 across 14 files; at the migration itself, 113 across 13") rather than present tense.

### R9: the two Codex dollar subtotals
> "Two Codex GPT-5.6 Sol sessions: $60.81 for the PR #686 hardening session and $59.95 for the Vale migration. Author-attested totals" (line 37); session table rows "upper bound—opened with unrelated backlog triage | $60.81, author-attested", "$59.95, author-attested" (lines 157–160)

**UNPROVABLE.** No tracked or untracked file in this repository or the ledger carries either figure or the per-category quantities, and the page already says so. The OpenAI page the page links lists GPT-5.6 Sol at $4 / $0.40 / $20 per million today, the rates the first published version quoted, which constrains but cannot reproduce the totals. Weaker form: the one the page uses.

### R10: the session token counters
> "one session here processed 848 million tokens including cache reads, against 1.78 million of output" (line 31); "The **2.27 million fresh input tokens and 285,100 output tokens** (99,453 of them reasoning)… **1.78 million output tokens across 1,872 assistant turns**… All are author-attested; none appears in a published artifact." (line 165)

**UNPROVABLE.** None of the six figures appears in any artifact reachable from here. The 1.78 M output and the 848.6 M total fall out of the dollar components (R36), which is internal consistency, not independent evidence, since both come from the same telemetry. Weaker form: as labelled on the page.

### R11: "nothing was invoiced"
> "None of this was billed—every session ran under a subscription" (line 35); "`billed_usd: 0.0` on every record, the receipt behind 'nothing was invoiced.'" (line 149)

**UNPROVABLE as a statement about the authoring sessions.** The ledger field is `totals.billed_usd: 0.0` on each of the four records (not at the record root, where it is absent), and it covers only the 17 external-review loops. The Codex CLI and Claude Code authoring sessions have no record here, so their subscription status is author-attested. Source: `jq -c 'select(.pr==668) | .totals.billed_usd' ~/GitHub/nathanpaynedotcom/.mergepath/phase-4b-ledger.jsonl` -> `0.0`. Weaker form: "the four ledgered review runs record `billed_usd: 0.0`; the authoring sessions ran under subscriptions I hold".

### R12: who asked about convergence
> "the only reason I looked is that someone asked whether the work was converging." (line 129)

**UNPROVABLE.** None of the 43 issue comments on #686 contains "converg" (control: the same filter finds "review" in 40 of them). #745's body uses the word five times but was opened 2026-08-24T20:50:33Z, after the cut. The question may have been asked outside GitHub. Source: `gh api --paginate repos/nathanjohnpayne/nathanpaynedotcom/issues/686/comments`, `test("converg";"i")` -> 0 of 43. Weaker form: "because I was asked whether the work was converging".

### R13: which agents wrote the code
> "Codex CLI and Claude Code sessions wrote the code" (line 135); session table (lines 157–161)

**UNPROVABLE.** No commit on #686 carries a `Co-Authored-By` trailer (grep over all 32 commit messages: none). The PR's head branch is `codex/issue-684-em-dash-safety` and its last eight commits are merges into and commits on `claude/686-merge`, which is consistent with the claim but is a naming convention, not a record of who typed. Source: `pulls/686/commits`; GraphQL `headRefName`. Weaker form: "the branch names record a Codex session starting the work and a Claude session finishing it".

### R14: the first draft
> "The first draft said auto-fix produced most of the code" (line 242); "I claimed auto-fix had produced *most of the code*. It had not." (line 61)

**UNPROVABLE.** The earliest version of the file in any record is `52b53d0`, the first commit on #746 (2026-08-24T20:52:07Z), and it already reads "I claimed auto-fix had produced *most of the code*. It had not" (L108) and "The first draft of this post said auto-fix produced most of the code" (L238). The draft that made the claim predates the repository record. Source: `gh api "repos/nathanjohnpayne/nathanpaynedotcom/contents/src/content/blog/autofix-was-the-whole-cost.md?ref=52b53d0"`. Weaker form: "an earlier, unpublished draft".

### R15: 1,513
> "1,513 Lines for One Dash" (line 2); "the tool as it finally merged, and the exact line count later deleted whole" (line 49)

**SUPPORTED.** `scripts/lint-content-em-dash.mjs` is 1,513 lines at `a37bb51` (#720's merge) and at `6358402`; #721's merge `aff0c23` deletes it at −1,513 (and the test file at −940, 2,453 of the PR's 2,483 deletions). Source: `git show "a37bb51:scripts/lint-content-em-dash.mjs" | wc -l` -> 1513; `git show --stat aff0c23`.

### R16: the peak
> "Enforcing it on this site peaked at 1,721 lines of code and a 1,196-line test suite" (line 49)

**SUPPORTED.** Source: `git show "147d9a7:scripts/lint-content-em-dash.mjs" | wc -l` -> 1721; `git show "147d9a7:tests/lint-content-em-dash.test.js" | wc -l` -> 1196. The prior ledger's §B1 correction landed.

### R17: 57 findings, 24 rounds, 22 and 54
> "drew 57 findings across 24 review rounds. Twenty-two of those rounds came before I removed the capability… their 54 findings" (line 49); "Twenty-two rounds, fifty-four findings" (line 22)

**SUPPORTED.** 57 top-level comments on #686 group into 24 `pull_request_review_id` values; the first 22 sum to 54. Source: `gh api --paginate --slurp repos/nathanjohnpayne/nathanpaynedotcom/pulls/686/comments?per_page=100 | jq '[.[][] | select(.in_reply_to_id == null)] | length'` -> 57; grouping script output "rounds: 24", "first 22 sum: 54".

### R18: within the hour
> "the pull request merged within the hour" (lines 14, 49); "after the removal commit there were four more commits, two more review rounds, and three more findings, and the pull request merged 56 minutes later" (line 177)

**SUPPORTED.** `abe3bfb` committed 2026-08-23T23:33:42Z; #686 merged 2026-08-24T00:30:00Z (56 m 18 s). The commits after it are `c41f4f0`, `c1769e4`, `ee3ec7f`, `bf1309a`; rounds 23 and 24 carry one and two findings. Source: `pulls/686/commits`; GraphQL `mergedAt`.

### R19: the removal arithmetic
> "fell from 2,917 lines to 2,417—a net reduction of **500 lines, or 17% of the implementation and tests combined**. Taken separately it is 12.6% of the linter and 23.7% of the tests." (line 61)

**SUPPORTED.** 1,721 → 1,505 is −216 (12.55%); 1,196 → 912 is −284 (23.75%, which rounds to 23.7% at 23.746%); 2,917 → 2,417 is −500 (17.14%). Source: `git show` at `147d9a7` and `abe3bfb`, both files.

### R20: the four-state table
> table rows `147d9a7` 1,721/1,196/2,917; `abe3bfb` 1,505/912/2,417; `a37bb51` (#720's merge) 1,513/940/2,453; `e42483b` (#725's merge) 1,343 (lines 65–70); "reproduced with `git show "<sha>:scripts/lint-content-em-dash.mjs" | wc -l`" (line 63)

**SUPPORTED.** Every cell reproduces with the stated command; the fourth row is 7 + 509 + 6 + 821 (R44). `a37bb51` is #720's `mergeCommit.oid` and `e42483b` is #725's. Source: the line-count sweep at the head of this ledger; GraphQL `mergeCommit{oid}`.

### R21: four fix commits on top of the cut
> "The third is slightly larger because four fix commits landed on top of the cut before the merge." (line 72)

**SUPPORTED.** The four commits after `abe3bfb` on #686 add 8 script lines (1,505 → 1,513) and 28 test lines (912 → 940). Source: `pulls/686/commits`; counts at `abe3bfb` and `a37bb51`.

### R22: the 42/48 classification
> "**42 name the auto-fix path outright**… six more sit in the whitespace-context and HTML-depth machinery… for 48 of 57. The residue: three findings on prose detection, three on the test harness, two CodeQL alerts on the gate's own regexes, one dependency note. Not one was unrelated to the gate. Three in four… four in five" (line 74); "42 of the 57" (lines 5, 6, 14, 19, 76, 82)

**SUPPORTED.** With the matcher `--write|rewrit|structureIsPreserved|yamlShape|before editing|permit fixes|during YAML fixes|deleting newlines|removing the padding` over the 57 bodies in `created_at` order, 42 match; adding findings 10, 12, 21, 36, 42, 49 (inline-whitespace and HTML-depth machinery) gives 48. The residue by index: 11, 44, 45 (link-title and YAML-key scanning, prose detection), 13, 38, 55 (test coverage and stale test comments), 34, 35 (`github-advanced-security[bot]` "CodeQL / Inefficient regular expression" on `scripts/lint-content-em-dash.mjs`), 57 (dependency documentation). 42/57 = 73.7%, 48/57 = 84.2%. Source: `pulls/686/comments`, grouping script.

### R23: issue #664
> "[Issue #664], which scoped the work, counted thirteen real occurrences across ten files—and classified roughly 250 further matches as out of scope: link labels built from identifiers, a shell comment inside a fenced code block, internal prose in specs, docs, and code comments." (line 58)

**SUPPORTED.** #664 (2026-08-22T04:28:30Z, closed one second after #668 merged) opens "Thirteen occurrences across ten files" and its "Explicitly not in scope" section lists 9 identifier link labels, 1 shell comment in a fenced block, and `specs/` (63), `docs/` (69), code comments under `src/` (106): 248. Source: `gh api repos/nathanjohnpayne/nathanpaynedotcom/issues/664 --jq .body`.

### R24: one line of pattern matching
> "**Recognize the forbidden pattern.** One line of pattern matching. Worked on day one, never caused a problem." (line 57); "Detect it ~1 line" (line 78)

**SUPPORTED.** `const PADDED_EM_DASH = /[\p{Zs}\t]*—[\p{Zs}\t]*/gu;` is one line at `2a8cb68:27` (the commit that introduced the tool) and byte-identical at `147d9a7:29`; no commit on #686 changed it. Source: `git log -S'const PADDED_EM_DASH' d932f42^..bf1309a -- scripts/lint-content-em-dash.mjs` -> empty; `diff` of the two lines -> identical.

### R25: line 1,609
> "at the peak commit, line 1,609 of the linter returns the untouched source unless the structure-preservation check accepts the candidate" (line 109)

**SUPPORTED.** Source: `git show "147d9a7:scripts/lint-content-em-dash.mjs" | sed -n '1609p'` -> `return structureIsPreserved(source, candidate, filePath, appliedRemovals) ? candidate : source;`.

### R26: the counting rule and the three reviewers
> "[#686] carries 113 review submissions; 24 included at least one top-level inline comment… the Codex GitHub App (17 rounds, 45 findings), CodeRabbit (6 rounds, 10 findings), and GitHub's CodeQL scanner (one round, 2 findings)" (line 117)

**SUPPORTED.** 113 reviews (`chatgpt-codex-connector[bot]` 17, `coderabbitai[bot]` 27, `github-advanced-security[bot]` 1, `nathanjohnpayne` 66, `nathanpayne-claude` 2); of the 24 review ids with findings, 17/45, 6/10, 1/2 by login. Source: `pulls/686/reviews`; grouping script "per reviewer".

### R27: the removal time and the post-cut rounds
> "the auto-fix removal landed at 23:33 UTC on August 23, and rounds 23 and 24 reviewed commits after it… two are cleanup about the removal itself" (line 117); "Every review comment records the commit it was written against" (line 117); "two were cleanup about the removal" (line 177)

**SUPPORTED.** `abe3bfb` is committed 2026-08-23T23:33:42Z; round 23 (2026-08-23T23:56:28Z, CodeRabbit) carries `original_commit_id` `c1769e4` and its finding is "Two tests describe cases they no longer assert. When the fixer assertions were removed…"; round 24 (2026-08-24T00:22:28Z, Codex App) is on `ee3ec7f` and its first finding is "Update the advertised CLI after removing `--write`". The third finding is R1. Source: `pulls/686/commits`; `pulls/686/comments` fields `original_commit_id`, `body`.

### R28: the 22-round series
> "`3 3 3 1 3 4 3 3 2 1 2 5 2 3 3 1 1 1 1 5 2 2`" (line 122); "the first eleven rounds average 2.55 findings and the last eleven 2.36… round 20 produced five findings, more than round 3, and the last round before the cut still produced two" (line 125)

**SUPPORTED.** The 24-round series is `3 3 3 1 3 4 3 3 2 1 2 5 2 3 3 1 1 1 1 5 2 2 1 2`; the first 22 are as printed; averages 2.545 and 2.364; round 20 = 5, round 3 = 3, round 22 = 2. Source: grouping script.

### R29: the follow-on phrase
> "Twenty-nine of the 57 findings—all from the Codex App's 45—name… the earlier fix they are re-opening… `grep -ic 'fresh evidence beyond'` returns **29**, and… `grep -c 'Fresh evidence beyond the resolved'` returns **25**… Half the findings" (line 127)

**SUPPORTED.** 29 bodies match case-insensitively, every one by `chatgpt-codex-connector[bot]`; 25 contain the exact-case literal; 29/57 = 50.9%. The explanation of the gap is R3. Source: `pulls/686/comments` bodies.

### R30: what the first published version said
> "the first published version argued non-convergence partly from two rounds that postdate the cut" (line 115); "The first published version said the loop 'ended in a single commit'" (line 177)

**SUPPORTED.** `fe29266` L21: "Twenty-four rounds, fifty-seven findings, and round twenty-four still producing two"; L48: "the work finished in a single commit"; L74 (Mermaid): "Loop ended<br/>in a single commit"; L145: "the review loop that had run 24 rounds without converging ended immediately". Source: `git show fe29266:src/content/blog/autofix-was-the-whole-cost.md`.

### R31: the external-review ledger
> "[#668] (13 loops, 434,420 tokens), [#678] (2 loops, 55,514), [#681] (1 loop, 16,774), and [#682] (1 loop, 17,846): **524,554 tokens across 17 review loops**. The ledger is a local, gitignored working file… every ledgered loop is one review posted by the external-reviewer identity `nathanpayne-codex`, and the public API agrees on every row" (line 137); the table (lines 139–147); "carry only combined totals, every per-category field null—and `billed_usd: 0.0` on every record" (line 149)

**SUPPORTED.** The four records carry `loops | length` 13/2/1/1 and `totals.tokens_total` 434,420 / 55,514 / 16,774 / 17,846 (sum 524,554); every loop has `reviewer: nathanpayne-codex`, `posted: "posted"`, `adapter: review-via-codex.sh`, and `tokens` with `input/output/cache_creation/cache_read/reasoning/cost_usd` all null, `source: codex-cli-stderr`; `totals.billed_usd` is `0.0` on all four. `.gitignore:58` is `.mergepath/`. API reviews by `nathanpayne-codex`: #668 13, #678 2, #681 1, #682 1, #686 0, #720 10, #721 1, matching the table's right-hand column. Source: `~/GitHub/nathanpaynedotcom/.mergepath/phase-4b-ledger.jsonl`; `pulls/<n>/reviews`.

### R32: #686 never entered the lane; #668 introduced the tool
> "its zero in the table means it never entered the external-review lane; the 434,420 tokens belong to #668, the pull request that introduced the tool" (line 151)

**SUPPORTED.** The ledger has no `pr: 686` record (records exist for 658, 660, 668, 678, 681, 682, 765, …) and the API shows zero `nathanpayne-codex` reviews on #686. `2a8cb68` (#668's merge) is the first commit on `main` that adds both files, at 920 and 618 lines. Source: `jq -r .pr` over the ledger; `git log --diff-filter=A --format=%h main -- scripts/lint-content-em-dash.mjs tests/lint-content-em-dash.test.js` -> `2a8cb68`.

### R33: 28, 63, 10, and the per-PR split
> "the 28 reviews the Codex App posted across the arc, the 63 from CodeRabbit, the 10 external-review loops on the [Vale rollout]" (line 151); "of the Codex App's 28 reviews and CodeRabbit's 63, the two long-running pull requests drew 17 and 27 on #686 and 4 and 33 on #720" (line 169)

**SUPPORTED.** Per-PR histograms: Codex App 6/1/0/0/17/4/0 = 28; CodeRabbit 2/1/0/0/27/33/0 = 63; `nathanpayne-codex` on #720 = 10 (9 `COMMENTED`, 1 `APPROVED`). Source: `pulls/<n>/reviews` for the seven PRs, `group_by(.user.login)`.

### R34: 256 and 126
> "256 review submissions and 126 inline findings—`pulls/{n}/reviews` for the first, top-level entries in `pulls/{n}/comments` for the second, replies excluded" (line 169; line 15); "`--paginate` is load-bearing, since #686 carries 113 review submissions and #720 carries 90" (line 149)

**SUPPORTED.** Reviews 45 + 4 + 1 + 1 + 113 + 90 + 2 = 256; top-level inline comments 40 + 6 + 0 + 0 + 57 + 23 + 0 = 126 (#686 has 144 comments including replies, #720 98). Source: the paginated pulls as stated in the header.

### R35: the arc's shape
> "The arc ran about 49 hours from first open to last merge, and #686 alone was open for 30 of them: 62% of the wall time, 44% of the review submissions (113 of 256), 45% of the inline findings (57 of 126). Four of the seven pull requests merged in under sixteen minutes each, and on three of them—#681, #682, and [#721]—neither review bot posted at all" (line 169)

**SUPPORTED.** #668 opened 2026-08-22T04:46:12Z, #721 merged 2026-08-24T05:43:06Z: 48 h 56 m 54 s. #686 18:18:17Z → 00:30:00Z: 30 h 11 m 43 s, 61.7%. 113/256 = 44.1%; 57/126 = 45.2%. #678 6 m 25 s, #681 14 m 38 s, #682 3 m 27 s, #721 11 m 59 s. Bot reviews on #681, #682, #721: zero. Source: GraphQL `createdAt`/`mergedAt`; R33's histograms.

### R36: the Claude dollar derivation and the total
> "$0.02 fresh input + $130.61 cache writes + $416.86 cache reads + $44.41 output = **$591.90**… $44.41 at $25/M is **1.78 million output tokens**… 833.7 million cache reads, 13.06 million cache writes, and 0.004 million fresh input… **848.6 million tokens processed**… $60.81 + $59.95 + $591.90 comes to about **$712.66**" (line 167); "Cache reads alone are 70% of it" (line 39); "about $712.66" (line 41)

**SUPPORTED, as arithmetic.** 0.02 + 130.61 + 416.86 + 44.41 = 591.90; 44.41 / 25 = 1.7764 M; 416.86 / 0.5 = 833.72 M; 130.61 / 10 = 13.061 M; 0.02 / 5 = 0.004 M; sum 848.561 M; 416.86 / 591.90 = 70.43%; 60.81 + 59.95 + 591.90 = 712.66. The quantities themselves are R10. Source: recomputed.

### R37: the Anthropic rates
> "at $5/M fresh input, $10/M cache writes on this session's one-hour cache TTL, $0.50/M cache reads and $25/M output" (line 39); "at [OpenAI] and [Anthropic] list rates published on August 24, 2026" (lines 35, 167)

**SUPPORTED.** The linked Anthropic page today lists Claude Opus 5 at $5 / MTok base input, $10 / MTok 1-hour cache writes, $0.50 / MTok cache hits, $25 / MTok output; the 1-hour write is the published 2× multiplier and the hit the 0.1× multiplier. The page carries no date, so its state on August 24 is not retrievable; the linked OpenAI page lists GPT-5.6 Sol at $4 / $0.40 / $20, the rates the first published version quoted. Source: WebFetch of `https://platform.claude.com/docs/en/about-claude/pricing` and `https://developers.openai.com/api/docs/models/gpt-5.6-sol`, 2026-10-06.

### R38: no API equivalent for the Spark model
> "The two remaining Codex sessions ran on gpt-5.3-codex-spark, which has no established public API equivalent, so they are unpriced." (line 41); "excluded, no public API rate" (lines 159–160)

**SUPPORTED.** `https://developers.openai.com/api/docs/models/gpt-5.3-codex-spark` returns 404 and the API pricing page lists no `codex-spark` identifier; as a control, `/api/docs/models/gpt-5.3-codex` returns 200 and the pricing page lists `gpt-5.3-codex` at $1.75 / $0.175 / $14. Source: `curl -s -o /dev/null -w '%{http_code}'`; WebFetch `https://developers.openai.com/api/docs/pricing`.

### R39: the Chicago rule and its Q&A
> "an em dash takes no space on either side. [Chicago's own Q&A] puts it in a single line, with the exceptions it does allow." (line 45); alt "The exceptions it grants are for hyphens and en dashes; the em dash has none." (line 47)

**SUPPORTED.** The Q&A answer reads, verbatim: "Chicago style omits spaces around hyphens, en dashes, and em dashes. There are exceptions where a single space is allowed after a hyphen or en dash: left- and right-hand margins / nos. 1– (1980–) / Some kinds of writing… follow their own rules, but Chicago style never calls for spaces on both sides of a hyphen." The rule is one sentence; the exceptions name hyphens and en dashes only. "A single line" is loose for a three-sentence answer but the rule sentence is one line. Source: WebFetch of the cited URL (plain `curl` receives 403 from the site), 2026-10-06.

### R40: The Punctuation Guide
> "[The Punctuation Guide] calls the em dash perhaps the most versatile punctuation mark there is—it can stand in for commas, parentheses, or a colon" (line 97); alt "a mark that can replace commas, parentheses, or colons, and is easily confused with the narrower en dash and hyphen" (line 99)

**SUPPORTED.** The page opens "The em dash is perhaps the most versatile punctuation mark. Depending on the context, the em dash can take the place of commas, parentheses, or colons" and later "Do not mistake the em dash (—) for the slightly narrower en dash (–) or the even narrower hyphen (-)". Source: WebFetch `https://www.thepunctuationguide.com/em-dash.html`.

### R41: the eighteenth edition and the century
> "a style manual revised for over a century—[the Chicago Manual of Style] is in its eighteenth edition" (line 187); alt "The eighteenth edition… The rule being enforced is a century-old published standard" (line 189)

**SUPPORTED.** Wikipedia: first published 1906; "The 18th edition, published in September 2024". Source: WebFetch `https://en.wikipedia.org/wiki/The_Chicago_Manual_of_Style`.

### R42: Vale is open source
> "[Vale], an open-source prose linter" (line 187)

**SUPPORTED.** vale.sh shows "OPEN SOURCE · MIT" linking to `github.com/vale-cli/vale`. Source: WebFetch `https://vale.sh/`.

### R43: the reviewer links
> "[Codex GitHub App](https://learn.chatgpt.com/docs/third-party/github)… [CodeRabbit](https://www.coderabbit.ai/)" (line 117)

**SUPPORTED.** The first resolves (200) to "Review GitHub pull requests with Codex", which documents the review integration; the second returns 200. Source: `curl -sIL`; WebFetch.

### R44: the migration table
> "| the bespoke tool | 1,513 lines |—| the Vale rule |—| 7 lines | supporting adapter |—| 509 lines | configuration |—| 6 lines | tests | 940 lines | 821 lines | **total** | **2,453** | **1,343** |" (lines 195–202); "A 45% reduction. Not a two-hundred-fold collapse." (line 204); "the em-dash rule in Vale is seven lines of configuration" (line 191); "2,453 lines to 1,343—a 45% reduction… 7 lines, and a 509-line adapter" (line 16)

**SUPPORTED.** At `e42483b`: `styles/CMOS/EmDash.yml` 7, `scripts/lint-prose.mjs` 509, `.vale.ini` 6, `tests/vale-prose-lint.test.js` 821 (1,343); at `a37bb51`: 1,513 + 940 = 2,453; 1 − 1,343/2,453 = 45.25%; 1,513/7 = 216. The first row is now labelled "the bespoke tool" (prior §I4 landed). Source: `git show "<sha>:<path>" | wc -l` per cell.

### R45: the "after" snapshot and the inclusion rule
> "the 'after' is the Vale side at `e42483b`, [#725]'s merge—53 minutes after the old tool was deleted, once the migration follow-ups had landed, still before this post was published. The rule on both sides: the prose gate's own implementation and tests, excluding CI wiring and fixtures; the largest excluded item is the script that installs Vale, 93 lines at `e42483b`, and counting it moves the total from 1,343 to 1,436 and the reduction from 45% to about 41.5%." (line 193)

**SUPPORTED.** #721 merged 05:43:06Z, #725 06:36:46Z (53 m 40 s); #746 merged 23:07:15Z the same day. `scripts/lib/ensure-vale.sh` is 93 lines at `e42483b`; the largest Vale fixture there is 71 lines (`tests/fixtures/vale-em-dash/standalone.yaml`) and the workflow diff is +6; 1,343 + 93 = 1,436; 1 − 1,436/2,453 = 41.46%. The prior §I2 and §I3 corrections landed. Source: GraphQL; `git show`; `git diff --stat a37bb51 e42483b -- .github/workflows/build-and-test.yml`.

### R46: what Vale does not check
> "Vale handles most of this site's content correctly. It does not check items in bulleted lists inside a post's metadata block." (line 210); "it skipped list items in post metadata yet reported green" (line 5)

**SUPPORTED.** #720's body: "add repo-owned EmDash, Titles, and Capitalization styles plus an explicit frontmatter extraction adapter" and "cover the seven required frontmatter shapes"; the adapter is `frontmatterOf` at `scripts/lint-prose.mjs:121`, which exists because Vale does not read Markdown front matter. "Reported green" is the counterfactual #722 draws: the live content was clean on both tools, so a swap without the adapter would have passed. Source: `gh pr view 720 --json body`; `scripts/lint-prose.mjs`; `issues/722`.

### R47: the two-PR rollout
> "[add the new tool alongside the old one and run both](…/pull/720), then [remove the old one only after comparing them](…/pull/721)" (line 216)

**SUPPORTED.** #720 "feat: prove Vale alongside the legacy prose gate" (merged 05:19:33Z) then #721 "chore: remove superseded em-dash linter" (merged 05:43:06Z); #720's body calls itself "PR 1 of the mandatory two-PR sequence in #719". Source: GraphQL; `gh pr view 720`.

### R48: the 174-case replay
> "I took all 174 test cases from the suite being deleted, confirmed the comparison harness reproduced the old tool's behavior exactly—zero mismatches across all 174… **149 matched. 25 differed**—18 the new tool no longer catches, 7 it now flags" (lines 222–224); "replaying all 174 retired test cases turned 18 lost checks into a recorded trade" (line 17)

**SUPPORTED.** #722: "I harvested all **174** assertion cases from `tests/lint-content-em-dash.test.js` (at `6358402`, before deletion)… confirmed the harness reproduced the legacy implementation exactly… **149 of 174 agree. 25 diverge**—18 the Vale gate no longer reports, 7 it reports where the legacy gate deliberately did not." Source: `gh api repos/nathanjohnpayne/nathanpaynedotcom/issues/722 --jq .body`.

### R49: zero occurrences, 37 then 38 files, three reintroductions
> "every affected pattern appeared **zero times** across the 37 content files as they stood at `6358402`… the corpus reached 38 files when this post was added, and this post reintroduced one of the retired constructs… three times—once in a code span and twice inside a fenced block" (line 226)

**SUPPORTED.** #722: "appears **zero times** across all 37 files in `src/content`"; `git ls-tree -r --name-only 6358402 -- src/content | grep -v .gitkeep | wc -l` -> 37 (also 37 at `aff0c23`), 38 at `fe29266`; `git grep -o -- '\*\*—\*\*' main -- src/content | wc -l` -> 3, at L101 (inside a code span) and twice on L104 (inside the `text` fence). Source: as quoted.

### R50: one minute fifty-five
> "I wrote the full comparison into [an issue] before the merge—one minute and fifty-five seconds before it" (line 228)

**SUPPORTED.** #722 created 2026-08-24T05:41:11Z; #721 merged 2026-08-24T05:43:06Z. Source: GraphQL `createdAt`, `mergedAt`.

### R51: the parts of the gate paragraph that still hold
> "The gate still exits non-zero, which fails the `build-and-test` job that runs it… the repository keeps a second, separately configured list at `.github/required-head-checks`, containing both `lint` and `build-and-test`, and the automated merge path verifies that list against the head commit before arming." (line 181)

**SUPPORTED.** `scripts/lint-prose.mjs` exits 2 on findings; the job `build-and-test` (`.github/workflows/build-and-test.yml:36-37`) runs `npm run lint` at line 127, and `scripts/lint-all.sh:26` runs `run_gate prose node "$ROOT/scripts/lint-prose.mjs"`; `.github/required-head-checks` contains exactly `lint` and `build-and-test`; `scripts/required-head-checks.sh --verify --sha` is called from `agent-review.yml`, `dependabot-auto-merge.yml` and `scripts/workflow/approval-merge-continuation.sh`. The "five required checks" half of the paragraph is R5. Source: the checkout.

### R52: cross-reference, images, dates
> "[a post about the second half of that](/blog/perfect-score-wrong-axis/)" (line 131); the three images (lines 47, 99, 189); `image: "/og/blog/autofix-was-the-whole-cost.png"` (line 12); `date: 2026-08-24` (line 10)

**SUPPORTED.** All five URLs return 200 on the live site; #746 merged 2026-08-24T23:07:15Z. Source: `curl -sIL -o /dev/null -w '%{http_code}'`; GraphQL.

### R53: sixteen
> "sixteen rounds after the series had already shown its shape" (line 14); "would have ended this sixteen rounds earlier" (line 236)

**SUPPORTED.** Round 6 to round 22, the last pre-cut round, is sixteen rounds. The prior §C3 correction landed on all surfaces (`eighteen rounds`: zero hits in source and on the live page). Source: R28.

### R54: the PR's purpose
> "the pull request that tried to make its auto-fixer safe" (line 49)

**SUPPORTED.** #686 is titled "fix(lint): make em-dash autofix source-safe". Source: GraphQL.

### R55: the unnamed issue
> "**Two of the issue's criteria cannot be met from what I kept**… the fresh, cached, cache-write, cache-read and output quantities the issue asks for were never recorded per session" (line 163)

**SUPPORTED, but unnamed.** nathanpaynedotcom #745 "Blog audit: reconcile the em-dash arc's timeline, code baselines, and cost ledger" (2026-08-24T20:50:33Z) has the acceptance criteria "Publish a privacy-safe ledger mapping each review loop/session to model, work scope, token categories…" and "Add the raw quantities and formulas needed to reproduce each priced session subtotal and the $712.66 total", and its body names "the raw fresh-input, cached-input, cache-write, cache-read, and output quantities". The page never says which issue; a reader cannot follow "the issue". Source: `gh api repos/nathanjohnpayne/nathanpaynedotcom/issues/745 --jq .body`. Recommendation (not a verdict change): link #745.

## Surface observation, not a page claim

At 16:31:48Z on 2026-10-06, 12½ minutes after the site's `last-modified` of 16:19:16 GMT, `curl -sL https://nathanpayne.com/blog/autofix-was-the-whole-cost/` returned this post's body (every corrected string above present) under the `<head>` of a different post: `<title>The HTML Mock-up Is the Spec | Nathan Payne</title>`, the html-mockups description, `rel="canonical"` and `og:url` of `/blog/html-mockups-as-spec/`, and that post's `og:image`. A plain re-fetch at 16:36:41Z and four cache-busting fetches (`?v=…`, `Cache-Control: no-cache`) all returned the correct head, and `/blog/html-mockups-as-spec/` serves its own head. One observation, not reproduced, close to a deploy; worth a separate check of the deploy pipeline or CDN cache keying rather than a page edit.

## Cross-page findings

None between this page and another page. The `/blog/perfect-score-wrong-axis/` link resolves. The prior ledger's errors (§N.9, §H3, §N.21, §F3's "six lines") are recorded in the header.

## Fixes applied

Applied 2026-10-06 to `src/content/blog/autofix-was-the-whole-cost.md` on `claude/correctness-pass-2026-10-06`, per `FIX-BRIEF.md`. Ten lines changed, no lines added or removed; `vale --config .vale.ini --minAlertLevel=error` reports nothing; the frontmatter still parses with the same shape; no test assertion pins any changed string (the three test files and `src/plugins/rehype-figure-captions.mjs` that name this post pin only the slug, the URL and the image paths, none of which moved). Body word count 4,214 -> 4,265; no text was cut for length, so `verify-brevity.py` was not run.

- R1: "the third is documentation debt from a dependency added after the cut" (L117) -> "the third is documentation debt: the dependency inventory had not caught up with a parser dependency the pull request added on its first day"; "the third documentation debt from a dependency added after it" (L177) -> "the third documentation debt for a dependency added on the pull request's first day".
- R2: "printed two of its figures six lines apart with different populations—a two-session token count beside a one-session dollar figure—without saying so" (L153) -> "printed a two-session token count in the body and a one-session dollar figure in the sidebar beside it, without saying the populations differed".
- R3: "because four findings continue the sentence differently" (L127) -> "because three findings continue the sentence differently and one writes it in lower case".
- R4: "live on the pull request rather than on `main`, so a fresh clone needs `git fetch origin pull/686/head` before it can resolve them" (L63) -> "are not reachable from `main`; `git fetch origin pull/686/head` resolves them in any clone".
- R5: "That job is not one of `main`'s five required status checks… will let a human merge past a red result… stops the automated merge and can be waved through by hand—a deliberate split" (L181) -> dated to August 2026 in the past tense, with "Both gaps have since closed: `build-and-test` and `lint` became required checks on 2026-09-01".
- R6: "still unfinished, because nothing records what was waved through" (L181) -> "unfinished because nothing recorded what was waved through" plus "a merge-bypass audit on every push to `main` followed on 2026-09-30".
- R7: "Turning those violations into tracked issues is a piece I intend to build and have not" (L181) -> "Turning the violations themselves into tracked issues was filed as [#715] and closed as not planned on 2026-09-06".
- R8: "On this site that is 127 prose-bearing list items across the 14 files that carry them… Fifty-seven… are rendered" (L212) -> "When this post was published, 2026-08-24, that was 127… across the 14 files that carried them… and 113 across 13 at the migration itself, before this post existed. Fifty-seven of them… render"; "127 prose-bearing items across 14 files" (L17) -> "at publication, 127 prose-bearing items across 14 files".
- R12: "the only reason I looked is that someone asked whether the work was converging" (L129) -> "I looked only when someone asked whether the work was converging" (drops the unprovable motive, keeps the timing).
- R55: "Two of the issue's criteria" (L163) -> "Two of the criteria in [the audit issue](…/issues/745)".
- R9, R10, R11 left as is: the page already labels the Codex subtotals, the session counters and the subscription status as author-attested.
- R13 left as is: "Codex CLI and Claude Code sessions wrote the code" is the author's testimony about his own sessions, and the session table beside it is already marked author-attested.
- R14 left as is: "the first draft" is the author's own unpublished draft; the page claims nothing about the record.
- R15 through R54 left as is: SUPPORTED.
