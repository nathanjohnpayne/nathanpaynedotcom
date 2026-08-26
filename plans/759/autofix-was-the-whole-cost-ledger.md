# Facts ledger—#745 `autofix-was-the-whole-cost`

Post source: `src/content/blog/autofix-was-the-whole-cost.md`, published `2026-08-24` (frontmatter `date`), added to `main` in `fe29266` (PR #746, `2026-08-24T23:07:14Z`) and revised twice since—`c10e3a8` (#749, images and Mermaid) and `7b1937a` (#780, key takeaways). Pre-revision baselines by `wc -w`: **4,133 words whole-file**, **3,294 words body-only** (everything after the closing frontmatter `---`), 839 words of frontmatter. #745 quotes a 4,014-word baseline; that figure predates #780 and is 119 words stale. Evidence repo: **this repository**, `nathanjohnpayne/nathanpaynedotcom`. Bare `#NNN` means **nathanpaynedotcom** throughout—every number the post cites resolves here. Shared cache: `plans/759/refs.json`.

Verdicts: **SUPPORTED** · **WRONG** (corrected value given) · **UNPROVABLE** (defensible weaker form given).

**Method notes carried from #740, #739, #741 and #744.** An issue body is evidence of what someone believed at the time, not of what happened—check mechanically checkable claims against the mechanism. A closure timestamp is not evidence of duration or success. Check chronology, do not assume it: pull `created_at` / `closed_at` / `merged_at` and sort. Check what a review actually said, not that it exists. Count with the loosest correct matcher, then narrow. A figure quoted "as of `<date>`" must exclude observations after that date. Distinguish disprovable from unprovable. And beware sibling-artifact contradiction: grep for the **claim**, not for the phrasing you remember writing.

**Headline for this audit.** This is the best-evidenced post in the epic. The arithmetic is internally consistent to the cent, the line-count snapshots reproduce exactly against named commits, and the review counts reproduce exactly against the GitHub API. Three things are wrong, and one of them is load-bearing: **the last two of the twenty-four review rounds happened after the auto-fix removal, so the post uses post-removal bookkeeping findings as evidence that the pre-removal loop was not converging** (§C2), the lede reports the post-removal line counts as if they were the pre-removal ones (§B1), and the migration table's "after" column comes from a fourth snapshot in a pull request outside the seven the post names (§I2).

---

## A. Chronology and the shape of the arc

### A1—"The seven-PR arc… about 49 hours" and "#686 itself was open about 30 hours"

> #745's "Evidence to reconcile", not the post. The post itself states no arc duration.

**SUPPORTED, and the post should use it.** Sorted, with every timestamp pulled rather than quoted:

| Opened (UTC) | Item | Merged (UTC) | Elapsed |
|---|---|---|---|
| 2026-08-22 04:46:12 | **#668** Content: close up spaced em dashes in published prose (CMOS) and gate it in lint | 2026-08-22 16:19:21 | 11 h 33 m |
| 2026-08-22 16:30:57 | **#678** lint(content): scan definition titles and fold multiline quoted YAML scalars | 2026-08-22 16:37:22 | 6 m |
| 2026-08-22 17:00:26 | **#681** lint(content): scan only the definition a reference resolves to | 2026-08-22 17:15:04 | 15 m |
| 2026-08-22 17:51:28 | **#682** lint: run every gate instead of short-circuiting on the first failure | 2026-08-22 17:54:55 | 3 m |
| 2026-08-22 18:18:17 | **#686** fix(lint): make em-dash autofix source-safe | 2026-08-24 00:30:00 | **30 h 12 m** |
| 2026-08-24 02:41:30 | **#720** feat: prove Vale alongside the legacy prose gate | 2026-08-24 05:19:33 | 2 h 38 m |
| 2026-08-24 05:31:07 | **#721** chore: remove superseded em-dash linter | 2026-08-24 05:43:06 | 12 m |

First open to last merge: `2026-08-22T04:46:12Z` → `2026-08-24T05:43:06Z` = **48 h 56 m 54 s**. "About 49 hours" is exact. #686's 30 h 12 m is exact. Source: `refs.json` → the seven nathanpaynedotcom entries, `.created_at` / `.merged_at`.

The shape worth keeping: **#686 alone accounts for 62% of the arc's wall time, 44% of its review submissions (113/256) and 45% of its inline findings (57/126).** Four of the seven PRs merged in under sixteen minutes each.

### A2—"saved three weeks"

> #745 asks to "remove or substantiate 'saved three weeks'".

**ALREADY REMOVED—do not re-raise.** The string does not appear in the live post. L223 reads "The metric that would have ended this eighteen rounds earlier cost one query", which is a round count, not a duration. This acceptance criterion is met, except that "eighteen rounds" is itself wrong (§C3). Source: `grep -n "three weeks" src/content/blog/autofix-was-the-whole-cost.md` returns nothing.

### A3—"I wrote the full comparison into an issue before the merge"

> L215

**SUPPORTED, and tighter than the prose suggests.** Issue #722 was created `2026-08-24T05:41:11Z`; #721 merged `2026-08-24T05:43:06Z`. The gap is **1 minute 55 seconds**. The claim is true and the sequencing point survives, but "before the merge" is doing a lot of work for under two minutes. Source: `refs.json` → `#722.created_at`, `#721.merged_at`.

---

## B. The four line-count states

All four states now have commits. Counts are `wc -l` over `scripts/lint-content-em-dash.mjs` + `tests/lint-content-em-dash.test.js`, the only two files either figure ever covered.

| State | Commit | Script | Tests | Total |
|---|---|---:|---:|---:|
| Pre-auto-fix removal (peak) | `147d9a7f10c0` (= `abe3bfb62ea7^`) | 1,721 | 1,196 | **2,917** |
| Post-auto-fix removal | `abe3bfb62ea7` "refactor(lint): report spaced em dashes instead of rewriting them" | 1,505 | 912 | **2,417** |
| Final legacy tool | `a37bb51654f8` (#720 merge, = `aff0c23dc85b^`) | 1,513 | 940 | **2,453** |
| Final Vale replacement | `e42483b` (#725 merge, `2026-08-24T06:36:45Z`) | see §I2 | | **1,343** |

Reproduce any row with `git show "<sha>:scripts/lint-content-em-dash.mjs" | wc -l`. **Brace the ref**—`git show "$sha:path"` in zsh silently applies the `:s` history modifier and returns garbage.

### B1—"Enforcing it on this site produced 1,513 lines of code, a 940-line test suite… Then I removed the capability responsible for the churn"

> L50; and the title, "1,513 Lines for One Dash"

**WRONG on the natural reading—the two figures are the post-removal state, presented in the sentence before the removal.** At its peak the tool was **1,721 lines with a 1,196-line test suite (2,917 total)**. 1,513/940 is what was left *after* auto-fix came out and the subsequent fixes landed. The lede therefore understates the thing it is about to describe cutting, by 208 script lines and 256 test lines.

Corrected value, and it is a better lede: enforcing one sentence of style guidance peaked at **1,721 lines of code and a 1,196-line test suite**; removing the capability nobody asked for took it to 1,505/912 in a single commit; it merged at 1,513/940. Source: `git show "147d9a7f10c0:scripts/lint-content-em-dash.mjs" | wc -l` → 1721; same for the test file → 1196.

The title survives either way—1,513 is a real, citable state (the tool as merged, and the exact line count #721 deleted). It is low blast radius if the drafting pass wants to change it: **no test pins this post's `title`, `seoTitle` or `seoDescription`** (the blog schema in `src/content.config.ts` has no `headline` field), unlike the #744 post. `tests/helpers/blog-editorial-order.js:5`, `tests/blog-chronology.test.js:29` and `tests/homepage-writing.test.js:119` pin the **slug**, so the slug must not change. `src/plugins/rehype-figure-captions.mjs:43-48` pins the three image paths and their dimensions.

### B2—"the linter and its test suite fell from 2,917 lines to 2,417—a net reduction of 500 lines, or 17% of the implementation and tests combined. Taken separately it is 12.6% of the linter and 23.7% of the tests"

> L62

**SUPPORTED, exactly, to every decimal.** Across `abe3bfb62ea7`: script 1,721 → 1,505 (−216, **12.551%**, rounds to 12.6%); tests 1,196 → 912 (−284, **23.746%**, rounds to 23.7%); combined 2,917 → 2,417 (−500, **17.14%**). 216 + 284 = 500. Source: `git show "abe3bfb62ea7^:…"` and `git show "abe3bfb62ea7:…"`.

### B3—"Two snapshots appear in this post and they are deliberately different commits… The 2,453-line figure further down is the tool as finally merged, slightly larger because later fixes landed on top of the cut"

> L64

**SUPPORTED for the two snapshots it names, but the post has four states and names two.** 2,417 → 2,453 is +8 script lines and +28 test lines across `c41f4f0af909`, `c1769e4f35f8`, `ee3ec7fda5cb` and `bf1309acb533`, all inside #686 after the removal commit—so "later fixes landed on top of the cut" is literally right. The two unnamed states are the 2,917 peak (§B1) and the Vale-side snapshot (§I2). #745 asks for all four; §B's table supplies them.

### B4—"a tool that edits your files has to prove, after every single edit, that it changed only what it meant to change… reject the whole batch if anything moved. It was also all-or-nothing—one unfixable dash in a configuration key meant every other fix in that file was abandoned too"

> L105

**SUPPORTED, and citable to a single line.** `147d9a7f10c0:scripts/lint-content-em-dash.mjs:1609`:

```js
return structureIsPreserved(source, candidate, filePath, appliedRemovals) ? candidate : source;
```

If the post-fix structure comparison fails, the entire candidate is discarded and the untouched `source` is returned—all-or-nothing per file, exactly as described. The proof machinery is `structureIsPreserved` (line 1562) and `yamlShape` (line 1507). Source: `git show "147d9a7f10c0:scripts/lint-content-em-dash.mjs" | sed -n '1500,1615p'`.

---

## C. The findings series on #686—where the post reads its own chart wrong

### C1—"57 findings across 24 review rounds" and the series `3 3 3 1 3 4 3 3 2 1 2 5 2 3 3 1 1 1 1 5 2 2 1 2`

> L50, L113, L116

**SUPPORTED, and it reproduces exactly.** Counting rule: top-level entries in `pulls/686/comments` (`in_reply_to_id == null`), grouped by `pull_request_review_id`, ordered by `created_at`. That yields **24 groups summing to 57**, in precisely the order printed. Source: `gh api --paginate repos/nathanjohnpayne/nathanpaynedotcom/pulls/686/comments`, fields `in_reply_to_id`, `pull_request_review_id`, `created_at`.

The rule is worth publishing because "round" is not otherwise defined: #686 carries **113** review submissions in total, of which 24 carried at least one inline finding.

**One reviewer the post never names.** The 24 rounds come from three reviewers, not two: `chatgpt-codex-connector[bot]` (17 rounds, 45 findings), `coderabbitai[bot]` (6 rounds, 10 findings), and `github-advanced-security[bot]` (1 round, 2 findings—CodeQL regex-backtracking alerts on `2026-08-22T23:59:18Z`). L111 says the work went through "the Codex GitHub App and CodeRabbit". A third automated reviewer contributed round 13.

### C2—"round twenty-four still producing two" / "the review loop that had run 24 rounds without converging ended immediately" / "Deleting it ended the loop in a single commit"

> L119, L151, L13

**WRONG, and this is the most consequential error in the post: rounds 23 and 24 happened *after* the auto-fix removal.** Every review comment carries `original_commit_id`, the commit it was actually written against:

| Round | Time (UTC) | n | Reviewed commit | Relative to removal |
|---:|---|---:|---|---|
| 22 | 2026-08-23 18:48:23 | 2 | `147d9a7f10c0` | last **pre**-removal round |
| — | 2026-08-23 23:33:42 | — | **`abe3bfb62ea7`** | **auto-fix removed** |
| 23 | 2026-08-23 23:56:28 | 1 | `c1769e4f35f8` | post-removal |
| 24 | 2026-08-24 00:22:28 | 2 | `ee3ec7fda5cb` | post-removal |

So the post cites round 24's two findings as proof that the loop was not converging—and those two findings are **"Update the advertised CLI after removing `--write`"** and **"Document the added numeric-reference dependency"**. They are bookkeeping *about the removal*. Round 23's single finding is "Two tests describe cases they no longer assert", also removal cleanup. Using them as evidence of non-convergence inverts the post's own argument.

**Corrected values, and each is a stronger claim than the one it replaces:**

- The non-converging series is **54 findings across 22 rounds**: `3 3 3 1 3 4 3 3 2 1 2 5 2 3 3 1 1 1 1 5 2 2`. First eleven rounds average **2.545**, last eleven average **2.364**—a *shallower* decline than the 2.75→2.0 the post reports, so the "does not converge" reading gets stronger, not weaker.
- "Deleting it ended the loop in a single commit" is false as written and true in substance. After `abe3bfb62ea7` there were four more commits, two more review rounds and three more findings, and the PR merged **56 minutes later** (`2026-08-24T00:30:00Z`). The defensible—and better—form: *after the cut, not one further rewrite-safety finding was raised; two of the three remaining findings were cleanup about the removal, the third was documentation debt from a dependency added after it, and the PR merged within the hour.*

Source: `gh api --paginate repos/nathanjohnpayne/nathanpaynedotcom/pulls/686/comments --jq '.[]|{created_at,original_commit_id,pull_request_review_id}'`; `gh api repos/…/pulls/686/commits`; `refs.json` → `#686.merged_at`.

### C3—"eighteen rounds after the series had already shown the same shape" / "reading it from round six instead of round twenty-four" / "would have ended this eighteen rounds earlier"

> L13, L125, L223

**WRONG once §C2 lands—the arithmetic was built on round 24.** The last round that could have told anyone anything about convergence is round **22**. Round 6 → round 22 is **sixteen** rounds, not eighteen. Corrected value: sixteen. Source: derived from §C2's table.

### C4—"round 20 produced five findings, more than round 3, and round 24 was still producing two"

> L119

**Half SUPPORTED, half superseded.** Round 20 = 5 and round 3 = 3, both correct and both pre-removal. The round-24 clause fails under §C2. Replacement with the same rhetorical force, entirely pre-removal: **round 20 produced five findings, more than round 3 did, and the last round before the cut still produced two.** Source: §C1's series.

### C5—"by my own count during the work, roughly half the later fixes were repairing the previous fix rather than closing new ground"

> L119

**UNPROVABLE as an author's count, but there is a mechanically checkable proxy that lands on the same number, and the post should use it instead.** **29 of the 57 findings (51%)—and 29 of Codex's 45 (64%)—contain the phrase "fresh evidence beyond…" somewhere in the body** (case-insensitive; the wording varies, and it sits mid-body in 23 of the 29), which is the reviewer explicitly stating that the finding is a follow-on against ground a previous fix had already been applied to. Findings 4, 5, 7, 14–21, 23, 24, 26–33, 40, 41, 46–50 and 53 in `created_at` order.

Defensible form: *the reviewer's own language marks it—half the findings on this pull request (29 of 57) name, in their own text, the earlier fix they are re-opening.* That converts "by my own count" into a one-line reproducible query, which is exactly what #745 asks for. Source: `gh api --paginate repos/…/pulls/686/comments`, grep bodies case-insensitively for `fresh evidence beyond` (case-sensitive returns 28, dropping finding 47).

---

## D. Classifying the 57 findings—#745's central open criterion

### D1—"nearly all of the work that would not converge"

> L13, L18, L52, L66, L143 (five surfaces), and `description` / `seoDescription`

**SUPPORTED at roughly three-quarters, not "nearly all"—and now quantified.** Two rules, both executable against the comment bodies:

**Strict rule—the finding's own body names the fixer.** Match `--write`, `rewrit`, `structureIsPreserved`, `yamlShape`, "before editing", "permit fixes", "during YAML fixes", "deleting newlines", "removing the padding". **42 of 57 (73.7%).**

**Subsystem rule—strict, plus findings in the whitespace-context/HTML-depth machinery that exists only so the fixer knows what it may touch** (findings 10, 12, 21, 36, 42, 49). **48 of 57 (84.2%).**

The residue, all 57 accounted for:

| Category | n | Which |
|---|---:|---|
| Auto-fix / rewrite-safety, named in the body | 42 | strict rule above |
| Same rewrite-safety subsystem, marker not in body | 6 | 10, 12, 21, 36, 42, 49 |
| Prose detection / classification | 3 | 11 (link-title scanning), 44, 45 (YAML mapping-key scanning) |
| Test harness | 3 | 13, 38 (missing branch coverage), 55 (stale test comments) |
| Security scanner (CodeQL regex backtracking) | 2 | 34, 35 |
| Dependency documentation | 1 | 57 |
| Unrelated to this feature | **0** | — |

**Corrected value: 42 of 57 findings name the auto-fix path outright; 48 of 57 sit in the machinery that existed only to serve it. Three concern prose detection, three the test harness, two are CodeQL alerts, one is a dependency note. Nothing on the pull request was unrelated.** "Nearly all" overstates 74%; "three in four, and four in five counting the machinery that served it" is both accurate and more persuasive because it is countable.

Source: `gh api --paginate repos/nathanjohnpayne/nathanpaynedotcom/pulls/686/comments`, filter `in_reply_to_id == null`, sort by `created_at`, apply the regex above to `.body`. The 42/57 split is stable under the exact matcher printed here; the union of the strict matcher with a looser one (`fix` or `preserv`) reaches 54/57; `round-trip` matches nothing on the pull request. The strict form is the one to publish.

### D2—"a capability can be a modest share of a codebase and still be the reason the project cannot finish"

> L66

**SUPPORTED and now doubly evidenced.** 17% of the lines (§B2) against 74% of the findings (§D1). That contrast is the post's thesis and it is the single most defensible number pair in the article. It deserves to be stated as a ratio rather than left implicit.

---

## E. The external-review ledger

### E1—"#668 (13 loops, 434,420 tokens), #678 (2 loops, 55,514), #681 (1 loop, 16,774), and #682 (1 loop, 17,846). 524,554 tokens across 17 review loops"

> L133

**SUPPORTED, every figure exact.** Source: `.mergepath/phase-4b-ledger.jsonl`, one record per PR, `.loops | length` and `.totals.tokens_total`. 434,420 + 55,514 + 16,774 + 17,846 = 524,554; 13 + 2 + 1 + 1 = 17.

**The provability caveat the post must carry: `.mergepath/` is gitignored** (`.gitignore:58`). The ledger is a local working artifact, not a published one—a reader cannot open it. **The loop counts, however, are independently reproducible from the public API**, because each ledgered loop is one review posted by the external-reviewer identity:

| PR | ledger loops | `nathanpayne-codex` reviews |
|---|---:|---:|
| #668 | 13 | 13 |
| #678 | 2 | 2 |
| #681 | 1 | 1 |
| #682 | 1 | 1 |
| #686 | none recorded | **0** |
| #720 | none recorded | 10 |
| #721 | none recorded | 1 |

Publishing that mapping turns "trust my ledger" into `gh api repos/…/pulls/{n}/reviews --jq '[.[]|select(.user.login=="nathanpayne-codex")]|length'`. The token totals stay author-attested.

### E2—"It never completed a ledgered external-review run, so none of its cost appears in that figure"

> L135, of #686

**SUPPORTED, and stronger than stated.** #686 has no ledger record *and* zero reviews from `nathanpayne-codex`—it never entered the external-review lane at all, rather than entering it and failing to finish. Source: `.mergepath/phase-4b-ledger.jsonl` (no `pr: 686` record); `pulls/686/reviews` reviewer histogram.

### E3—"The 434,420 tokens belong to #668, the pull request that introduced the tool in the first place"

> L135

**SUPPORTED.** #668 is titled "Content: close up spaced em dashes in published prose (CMOS) and gate it in lint" and its merge commit `2a8cb68496b903565f0297a929b5c5458667e393` is the first commit at which either file exists: 920 script lines + 618 test lines. Source: `git show "2a8cb68496b9:scripts/lint-content-em-dash.mjs" | wc -l`.

### E4—"it excludes the 28 reviews from the Codex GitHub App, the 63 from CodeRabbit, the 10 external-review loops on the Vale rollout (#720)"

> L139

**SUPPORTED, all three exact.** Across the seven PRs: `chatgpt-codex-connector[bot]` = 6 + 1 + 0 + 0 + 17 + 4 + 0 = **28**. `coderabbitai[bot]` = 2 + 1 + 0 + 0 + 27 + 33 + 0 = **63**. `nathanpayne-codex` on #720 = **10** (9 `COMMENTED`, 1 `APPROVED`). Source: `gh api --paginate repos/…/pulls/{n}/reviews`, histogram on `.user.login`.

### E5—"256 review submissions and 126 inline findings… counted from the GitHub API's `pulls/{n}/reviews` for the first and top-level entries in `pulls/{n}/comments` for the second"

> L139

**SUPPORTED, exact, and the post already publishes the counting rule—the best-sourced sentence in the article.**

| PR | reviews | top-level inline comments |
|---|---:|---:|
| #668 | 45 | 40 |
| #678 | 4 | 6 |
| #681 | 1 | 0 |
| #682 | 1 | 0 |
| #686 | 113 | 57 |
| #720 | 90 | 23 |
| #721 | 2 | 0 |
| **Total** | **256** | **126** |

Source: `gh api --paginate repos/nathanjohnpayne/nathanpaynedotcom/pulls/{668,678,681,682,686,720,721}/reviews | length` and `…/comments`, filtered `in_reply_to_id == null`.

### E6—"the Codex GitHub App and CodeRabbit, both reviewing every revision"

> L111

**WRONG as a statement about the arc.** On **#681, #682 and #721 neither bot posted a single review**, and on #678 each posted one. Both reviewed heavily only on #686 (17 and 27) and #720 (4 and 33). **Corrected per §N.8: neither bot reviewed *every push* on either PR**—#686 carries 32 commits against 17 Codex-App and 27 CodeRabbit reviews, #720 carries 28 against 4 and 33. The stacked-base explanation below is also withdrawn; all seven PRs have `base: main`, so the known CodeRabbit skip does not apply. Publish the histogram instead. ~~This matches the known behaviour that CodeRabbit skips stacked pull requests on a non-default base. Defensible form: *on the two long-running pull requests both bots reviewed every push; on the three short ones neither ran, and on #678 each posted exactly one.* Source: §E4's histogram.

---

## F. The token and dollar counterfactual

### F1—Internal arithmetic of the $712.66

> Sidebar L36-L40; body L143

**SUPPORTED, internally consistent to the cent, and it reconciles with two figures elsewhere in the post that were derived independently.**

- $60.81 + $59.95 + $591.90 = **$712.66**.
- $0.02 + $130.61 + $416.86 + $44.41 = **$591.90**.
- $416.86 / $591.90 = **70.4%**—"Cache reads alone are 70% of it".
- Inverting the Claude rates: $44.41 ÷ $25/M = **1.7764 M output tokens**, which is the body's "1.78 million output tokens" (L137). $416.86 ÷ $0.50/M = 833.7 M cache reads; $130.61 ÷ $10/M = 13.06 M cache writes; $0.02 ÷ $5/M = 0.004 M fresh input. Sum = **848.6 M**, which is the sidebar's "848 million tokens including cache reads" (L30).

Two figures the post presents as coming from different systems therefore fall out of each other exactly. That is strong evidence the arithmetic is real, and it is worth showing—it is most of what #745's "raw quantities and formulas" criterion asks for on the Claude session.

The Anthropic rate shape is also internally coherent: $5/M input with $10/M one-hour cache writes (2×) and $0.50/M cache reads (0.1×) is the published multiplier structure, so the rates are at least self-consistent. **Both rate sets are external claims and must be re-checked against the linked pages at drafting time**; neither is verifiable from this repository.

### F2—The two Codex subtotals are not reproducible

> Sidebar L36

**UNPROVABLE, and #745 is right that it matters.** $60.81 and $59.95 are given as totals under three rates with no quantities, so no reader can reconstruct them. One constraint is derivable and worth stating: if the $60.81 session is one of the two associated with #686, its fresh input and output cannot exceed the body's 2.27 M and 285,100, which at $4/M and $20/M is $9.08 + $5.70 = **$14.78**. The remaining **$46.03 must be cached input—about 115 million cached tokens.** Defensible form: publish fresh-input / cached-input / output for each priced session, or state the subtotals as author-attested and drop the rate table, which currently implies a reproducibility the post does not provide.

### F3—The five-session population does not close *(verdict downgraded to UNPROVABLE—see §N.11)*

> Sidebar L36-L40 against body L137

**UNPROVABLE, not WRONG—downgraded per §N.11.** The sidebar's one-session price and the body's two-session count can both hold if one of the two #686 sessions is in the unpriced `gpt-5.3-codex-spark` pair, a reading the post neither states nor excludes. The provable defect is the narrower one in the next paragraph. Original wording, superseded: ~~the two mappings contradict each other.~~ The sidebar prices "two Codex GPT-5.6 Sol sessions": one for "the PR #686 hardening work" and one for "the Vale migration". The body says "the **two** Codex CLI sessions associated with #686". Both cannot be true unless one of the two #686 sessions is one of the unpriced `gpt-5.3-codex-spark` pair—which the post never says, and which then leaves the second spark session unassigned.

Worse for the reader: the body's "2.27 million fresh input tokens and 285,100 output tokens" is a **two-session** figure, while the $60.81 beside it is a **one-session** figure. They have different populations and the post presents them within six lines of each other as if they described the same work.

Defensible form—and this is exactly the privacy-safe ledger #745's acceptance criteria ask for: a five-row table of session → model → work scope → token categories → floor-or-upper-bound → priced/unpriced, with the #686 pair identified by model. Without it, neither number can be checked and the two contradict.

### F4—"2.27 million fresh input tokens and 285,100 output tokens, of which 99,453 were reasoning tokens"; "1.78 million output tokens across 1,872 assistant turns"

> L137

**UNPROVABLE from the evidence repo.** None of these five figures appears in any tracked or untracked file in the repository; they come from provider session counters that are not published. The 1.78 M reconciles with the dollar arithmetic (§F1), which is corroboration but not independent evidence—both come from the same telemetry. Defensible form: label them as author-attested session counters and state which counter each came from, as §F3's table would.

### F5—"the review ledger records only combined totals rather than the category splits pricing needs"

> Sidebar L40

**SUPPORTED, exactly.** Every loop in `.mergepath/phase-4b-ledger.jsonl` carries `tokens: {total: <n>, input: null, output: null, cache_creation: null, cache_read: null, reasoning: null, cost_usd: null, source: "codex-cli-stderr"}`. The nulls are the claim. Every record also carries `"billed_usd": 0.0`, which independently supports "nothing was invoiced". Source: `.mergepath/phase-4b-ledger.jsonl`, any `.loops[].tokens` object.

### F6—"Nobody approves 'spend 500,000 tokens re-reviewing an auto-fixer'"

> L145

**Loose but defensible.** The 524,554-token ledger figure covers #668/#678/#681/#682 and explicitly **excludes** #686, the auto-fixer PR (§E2). So the round number is attached to the wrong work. Corrected form: use it as the shape of the number rather than a citation—"nobody approves half a million tokens of re-review"—or attach it to the pull requests it actually measures.

---

## G. Content and comparison counts

### G1—"A naive search across the site returns about 250 matches; thirteen are real"

> L59

**Half SUPPORTED, half UNPROVABLE for want of a stated glob.** "Thirteen are real" is exact: issue #664 (`2026-08-22T04:28:30Z`), the issue #668 implemented, opens "Thirteen occurrences across ten files" and enumerates all thirteen by file.

"About 250" depends entirely on the search path, which the post does not give. **Per §N.15, the 260 offered further down is #664's hand classification, not the output of any grep**—no search can restrict itself to code comments, so it must be attributed rather than presented as a measurement. Measured at `2a8cb68496b9^` (immediately before the fix landed), `git grep -I -o ' — '` returns **24** in `src/content`, **63** in `specs/`, **69** in `docs/`, **292** in `src/`, and **3,761** repository-wide. #664's own out-of-scope accounting is 9 (device-source-of-truth link labels) + 1 (a shell comment in a fenced block) + 63 (`specs/`) + 69 (`docs/`) + 106 (code comments under `src/`) = 248, which with the 13 real gives **261**. Defensible form: "a naive grep over `src/content`, `specs/`, `docs/` and the code comments under `src/` returned about 260 matches; thirteen were real"—and cite #664, which does the classification.

The illustrative list on the same line—"code samples, configuration keys, link addresses, table borders, a password-manager entry whose name contains a dash and must never be edited"—is **UNPROVABLE against this repository.** #664's actual out-of-scope breakdown is identifier-to-title link labels, one shell comment, and internal `specs/`/`docs/`/code-comment prose. No password-manager entry and no table border appears in it, and grepping `src/`, `specs/` and `docs/` for a password-manager item name finds nothing matching. Defensible form: use #664's own categories, which are more specific and are on the record.

### G2—"127 such items across 38 files, this post included. Fifty-seven of them are the pull quotes and key takeaways"

> L195

**57 SUPPORTED exactly. 127 SUPPORTED under a stated rule. "38 files" WRONG—the items live in 14 files.**

- **57**: `pullquotes` = 29 and `keyTakeaways` = 28 across `src/content/**/*.md`. 29 + 28 = 57. Exact.
- **127**: reproduced exactly by the rule *prose-bearing frontmatter sequence items* = `tags` (62) + `keyTakeaways` (28) + `pullquotes[].text` (29) + `sidebar[].content` (8) = **127**. Excluded as non-prose or structural: `tech[]` (44), `related[].label`/`[].href` (15 each), `pullquotes[].label`/`[].accent`, `sidebar[].type`/`[].title`/`[].description`/`[].caption`. Counting *all* frontmatter sequence items instead gives 186, so the rule is load-bearing and must be published.
- **14 files**, not 38. Those 127 items live in the fourteen markdown files that carry any of those four keys. **38 is the size of the whole content corpus** (33 `.md` + 5 `.yaml` under `src/content`, excluding `.gitkeep`), not the number of files holding metadata list items. The post conflates the two populations.

Corrected value: **127 prose-bearing metadata list items across 14 files, of which 57—the pull quotes and key takeaways—are reader-facing.** Source: parse frontmatter of every `src/content/**/*.md` with `js-yaml`, sum `tags`, `keyTakeaways`, `pullquotes[].text`, `sidebar[].content`.

### G3—"all 174 test cases… 149 matched. 25 differed—18 the new tool no longer catches, 7 it now flags where the old one stayed quiet"

> L209, L211

**SUPPORTED, every number, against a dated artifact with the source ref named.** Issue #722 (`2026-08-24T05:41:11Z`) records 174 assertion cases harvested from `6358402:tests/lint-content-em-dash.test.js`, a **0/174** harness-fidelity check against the legacy implementation, then 149 agreeing and 25 diverging—18 lost, 7 gained—and tabulates all 25 individually. `6358402` resolves to "docs(lint): explain the em-dash gate by what it reports, not a removed fixer (#717)", `2026-08-24T00:43:05Z`, at which the test file is 940 lines. Source: `gh api repos/nathanjohnpayne/nathanpaynedotcom/issues/722 --jq .body`.

The post's "confirmed my harness reproduced the old tool's behaviour exactly" maps to #722's explicit **0/174 mismatches**, which is worth quoting because it is the step that makes the rest of the comparison mean anything.

### G4—"every affected pattern appears zero times across all 38 content files"

> L213

**WRONG on two counts, one trivial and one worth enjoying.**

First, the population: #722 measured **37 files in `src/content`**, and at `aff0c23dc85b` (#721's merge) `src/content` held 32 `.md` + 5 `.yaml` = 37. The corpus reached 38 only when this post itself was added, eighteen hours later. A figure quoted from a dated measurement must use that measurement's population.

Second, and the reason it matters: **this post reintroduced one of the seven constructs.** The emphasis-wrapped em dash `**—**`—#722's most reader-visible loss, and the one the legacy gate reported and Vale does not—now appears **three times** in `src/content`, in this very file's worked example. **Corrected per Codex round 1:** one occurrence sits in a code span and two in a fenced block, not two occurrences in code spans as first recorded here. None renders as emphasis, so nothing is broken; but "appears zero times across all 38 content files" is false the moment the 38th file is this one.

Corrected value: **zero occurrences across the 37 content files as measured at `6358402`, before this post existed.** Source: `gh api repos/…/issues/722 --jq .body` (§"Not a regression today"); `git grep -n -- '\*\*—\*\*' -- src/content`; `git ls-tree -r --name-only aff0c23dc85b -- src/content`.

---

## H. The merge-gate claims

### H1—"The gate still exits non-zero on a violation, which fails the `build-and-test` job that runs it. That job is not one of `main`'s five required status checks—those are all review-policy gates"

> L157

**SUPPORTED, exactly and on both halves.** `main`'s branch protection lists exactly five contexts, all review-policy gates and none of them `build-and-test`:

`CodeRabbit unresolved blocking findings` · `Codex P1 unresolved threads` · `Label Gate` · `Merge clearance gate` · `Self-Review Required`

And the gate does run in that job: `.github/workflows/build-and-test.yml:115` runs `npm run lint`, and `scripts/lint-all.sh:25` runs `run_gate prose node "$ROOT/scripts/lint-prose.mjs"`. Source: `gh api repos/nathanjohnpayne/nathanpaynedotcom/branches/main/protection --jq .required_status_checks.contexts`.

### H2—"this repository keeps a second, separately configured list at `.github/required-head-checks`, and it contains both `lint` and `build-and-test`"

> L157

**SUPPORTED.** The file's entire contents are the two lines `lint` and `build-and-test`. It is consumed by `scripts/required-head-checks.sh` (`CONFIG_PATH` at line 23, `--verify --sha` mode), which is invoked from `.github/workflows/agent-review.yml`, `.github/workflows/dependabot-auto-merge.yml` and `scripts/workflow/approval-merge-continuation.sh`—so "the automated merge path verifies that list against the head commit before arming" is accurate. Source: `cat .github/required-head-checks`; `grep -rn required-head-checks scripts/ .github/`.

### H3—"Turning those violations into tracked issues is the open follow-up"

> L159

**UNPROVABLE—no issue was found tracking it.** Not disprovable either: a stated intention is not a repository fact. Defensible form: state it as an intention rather than an "open follow-up", which implies a filed item, or file one and cite it.

---

## I. The Vale migration comparison

### I1—The table's arithmetic

> L179-L187

**SUPPORTED.** 7 + 509 + 6 + 821 = **1,343**. 1,513 + 940 = **2,453**. 2,453 − 1,343 = 1,110; 1,110 / 2,453 = **45.25%**. "A 45% reduction. Not a two-hundred-fold collapse" is right, and 1,513 / 7 = 216, so "two-hundred-fold" is the fair characterisation of the tempting summary.

### I2—"with the 'before' column being the tool as merged rather than the pre-removal snapshot above"

> L177

**The "before" is named and correct. The "after" is a fourth, unnamed snapshot from a pull request outside the seven the post lists.** At `aff0c23dc85b` (#721's merge, the actual migration boundary) the Vale side was:

| Row | at #721 merge | at `e42483b` (#725) | post's figure |
|---|---:|---:|---:|
| `styles/CMOS/EmDash.yml` | 7 | 7 | 7 |
| `scripts/lint-prose.mjs` | 494 | 509 | 509 |
| `.vale.ini` | 8 | 6 | 6 |
| `tests/vale-prose-lint.test.js` | 702 | 821 | 821 |
| **total** | **1,211** | **1,343** | **~1,343** |

The post's "after" column is the state at **`e42483b`, "fix(lint): close Vale migration follow-ups (#725)", `2026-08-24T06:36:45Z`**—53 minutes after #721 merged, and still before publication, so it is a legitimate snapshot. But #725 is not one of the seven pull requests the post names, and the pairing is never disclosed. Measured at the migration boundary itself the reduction is 2,453 → 1,211, **50.6%**.

Corrected value: name the snapshot. Either "2,453 at `aff0c23^` → 1,343 at `e42483b`, a 45% reduction once the migration follow-ups landed", or the boundary-to-boundary 50.6%. The 45% figure is the more conservative and the one already published; it just needs its commit. Source: `git show "<sha>:<path>" | wc -l` for each cell; `git log --follow -- scripts/lint-prose.mjs`.

### I3—The table's inclusion rule

> L179-L185

**UNPROVABLE without a stated boundary, and the boundary is doing real work.** The "before" column counts two files; the "after" column counts four. Excluded from the "after" side but introduced by the migration—**figures corrected per §N.16: 22 Vale fixtures not 21, `scripts/lint-all.sh` at -3 not -4, and `package-lock.json -5` omitted from the original enumeration; with the real numbers the residue closes at 30 exactly**: `scripts/lib/ensure-vale.sh` (81 lines at #720, 93 today), the six added lines in `.github/workflows/build-and-test.yml`, and 21 Vale fixture files under `tests/fixtures/`. Including `ensure-vale.sh` alone moves the total to 1,424 and the reduction to 42%. Excluded from the "before" side but deleted by #721: 16 lines of `.ai_context.md`, 6 of `package.json`, and 4 of `scripts/lint-all.sh` (#721 deleted 2,483 lines across 6 files in total, of which 2,453 are the two counted files).

Defensible form: state the rule—"implementation and tests for the prose gate itself, excluding CI wiring and fixtures, on both sides"—and note that `ensure-vale.sh` is the largest excluded item. The post already models this honesty for the 509-line adapter; the same move applies one level out.

### I4—"the rule itself | 1,513 lines | 7 lines"

> L181

**Mislabelled, in exactly the way the post spends the surrounding paragraphs warning against.** The 1,513-line file is not "the rule"—one line of it is the pattern match (the post says so at L58), and the rest is the prose-classification engine whose job Vale and the 509-line adapter now share. Labelling the whole legacy script "the rule itself" against a 7-line Vale rule builds the 216-fold comparison the next sentence disowns. Defensible form: relabel the row "the bespoke tool" (1,513 → 7 + 509), which is what the total already computes.

### I5—"the Chicago Manual of Style is in its eighteenth edition"

> L171

**SUPPORTED**, and the post already links the Wikipedia article that carries it. External claim; re-check the link at drafting time.

---

## J. Where #745's own framing is contradicted

**#745 was written from the same unverified text this audit is checking, and three of its statements do not survive contact with the evidence.**

### J1—**RETRACTED.** #745 is right about ledger coverage; the fuller statement is the post's own

> #745, "Evidence still to reconcile", bullet 3

The ledger holds records for exactly four of the seven pull requests—#668, #678, #681, #682—and **none** for #686, #720 or #721. The issue frames #686 as the notable omission; two thirds of the arc's later work is missing as well, including the entire Vale migration. The post's own L133 gets this right ("It covers four of the pull requests in this arc"); the issue narrows it wrongly. Anything the drafting pass writes about ledger coverage should follow the post here, not the issue.

### J2—**REFRAMED.** #745 asks for classification buckets; it does not claim unrelated findings exist

> #745, "Evidence still to reconcile", bullet 2

§D1 classifies all 57. The residual bucket the issue anticipates—"unrelated findings"—is **empty**. Every finding on #686 concerns the em-dash gate: 42 name the fixer, 5 more sit in its whitespace machinery, 3 are prose detection, 3 are test harness, 2 are CodeQL alerts on the gate's own regex, 1 is a dependency note about the gate's parser. The honest correction runs the other way from the one the issue expects: the problem is not that unrelated work is inflating the 57, it is that "nearly all" overstates a real 74%.

### J3—#745's "Already fixed—do not redo" list asserts a 4,014-word baseline and a "2,453 → 1,343" migration snapshot as verified. Both need footnotes.

> #745, "Already fixed", and the compression clause

The word count is 4,133, not 4,014—#780 landed after the issue was written. And the 2,453 → 1,343 pair, listed as verified on 2026-08-24, silently pairs a `#721^` "before" with a `#725` "after" (§I2). The issue's checkbox "The body explicitly explains that the 2,917/2,417 and 2,453/1,343 comparisons come from different snapshots" is true—but the post explains two of the four snapshots, and the two it leaves unexplained are the peak (§B1) and the Vale side (§I2).

**Method note this audit adds to the four carried above: when a post's own text is more careful than the issue written about it, follow the post.** #745 is wrong about ledger coverage (§J1) and wrong about the finding residue (§J2) in ways the live post is not.

---

## K. Claims that stand as written

Do not re-audit these.

| Claim | Verified value | Source |
|---|---|---|
| ~~#686 findings-per-round series, as printed~~ | **MOVED OUT—§C2 rejects the 24-round population. Publish the 22-round series.** | §C2 |
| ~~First twelve rounds average 2.75, last twelve 2.0~~ | **MOVED OUT—§C2 replaces this with 2.545/2.364 over 22 rounds.** | §C2 |
| Round 20 produced five findings, more than round 3 | 5 vs 3 | §C1 |
| 2,917 → 2,417, net 500 lines, 17% | exact | `abe3bfb62ea7` |
| 12.6% of the linter, 23.7% of the tests | 12.551%, 23.746% | `abe3bfb62ea7`, both files |
| 524,554 tokens across 17 review loops on four PRs | exact | `.mergepath/phase-4b-ledger.jsonl` |
| #686 never completed a ledgered external-review run | no record; zero `nathanpayne-codex` reviews | ledger; `pulls/686/reviews` |
| 434,420 tokens belong to #668, which introduced the tool | exact; `2a8cb68496b9` is the first commit with either file | ledger; `git show "2a8cb68496b9:scripts/lint-content-em-dash.mjs"` |
| 28 Codex-App reviews, 63 CodeRabbit reviews, 10 loops on #720 | 28 / 63 / 10 | `pulls/{n}/reviews` histograms |
| 256 review submissions, 126 inline findings, with the counting rule as published | exact | §E5 table |
| $60.81 + $59.95 + $591.90 = $712.66 | exact | sidebar arithmetic |
| $0.02 + $130.61 + $416.86 + $44.41 = $591.90; cache reads 70% | exact (70.43%) | sidebar arithmetic |
| 848 M processed vs 1.78 M output reconciles with the Claude subtotals | 848.6 M / 1.7764 M | §F1 |
| Nothing was invoiced; every session ran under a subscription | `billed_usd: 0.0` on every ledger record | `.mergepath/phase-4b-ledger.jsonl` |
| 57 reader-facing pull quotes and key takeaways | 29 + 28 | frontmatter parse of `src/content/**/*.md` |
| 174 cases, 149 matched, 25 differed, 18 lost, 7 gained | exact, all tabulated | issue #722 body |
| Harness reproduced the legacy tool exactly | 0/174 mismatches | issue #722 body |
| Comparison written into an issue before the merge | #722 created 1 m 55 s before #721 merged | `refs.json` |
| #720 added Vale alongside the old gate; #721 removed the old one after comparing | titles and merge order | `refs.json` |
| `build-and-test` is not one of `main`'s five required checks, which are all review-policy gates | five contexts, listed | `branches/main/protection` |
| `.github/required-head-checks` contains `lint` and `build-and-test`, and the automated merge path verifies it | file contents; `scripts/required-head-checks.sh` | repo |
| All-or-nothing rewrite: one failed structure check discards the whole file's fixes | `147d9a7f10c0:scripts/lint-content-em-dash.mjs:1609` | repo |
| 7 + 509 + 6 + 821 = 1,343; 1,513 + 940 = 2,453; 45% reduction | exact | `git show` per cell |
| Chicago Manual is in its eighteenth edition | external, linked in-post | Wikipedia link at L171 |

---

## L. Instructions to the drafting pass

1. Every number, date and causal claim must trace to a **SUPPORTED** row or to a corrected value in §§A-I. Where a row says **UNPROVABLE**, use its defensible form.

2. **§C2 is the rewrite.** Rounds 23 and 24 are post-removal, so the post currently argues non-convergence from two housekeeping findings about the removal itself. Restate the series as **54 findings across 22 rounds**, keep the printed series truncated to 22, and replace the round-24 clause per §C4. Then use the corrected ending, which is stronger: after the cut, no further rewrite-safety finding was raised, two of the three remaining findings were cleanup about the removal and the third was documentation debt from a dependency added after it, and the PR merged 56 minutes later. Fix "eighteen rounds" to **sixteen** in all three places (§C3): the `keyTakeaways` entry at L13, L125, and L223.

3. **§B1 is the second rewrite.** The lede and the mermaid diagram present 1,513/940 as the pre-removal state. The peak was **1,721 lines and a 1,196-line test suite**. Publish §B's four-state table—it closes #745's LOC-provenance criterion in one artifact—and keep the title.

4. **§D1 closes #745's biggest open criterion.** Replace "nearly all of the work that would not converge" with the counted form on all five surfaces plus `description` and `seoDescription`: **42 of 57 findings name the auto-fix path; 48 of 57 sit in the machinery that served it; three concern prose detection, three the test harness, two are CodeQL alerts, one a dependency note; none was unrelated.** Grep for the **claim**, not the phrasing—"nearly all of the work that would not converge", "nearly all of the churn", "most of the trust burden, and nearly all", and the mermaid node text are the same assertion in four wordings that share almost no substring. §J2 records that the issue's expected residue is empty; say so.

5. **§F3 is the honest-accounting fix.** The sidebar's session map and the body's "two Codex CLI sessions associated with #686" contradict each other. Publish the five-row session ledger #745 asks for—session, model, work scope, token categories, floor or upper bound, priced or not—and identify which of the two #686 sessions ran on `gpt-5.3-codex-spark`. Add the raw quantities per §F2, or label the Codex subtotals author-attested and drop the rate table for them. The Claude subtotal is already reproducible (§F1) and the derivation should be shown, because it is the post's strongest evidentiary moment.

6. **Fix the three population errors.** "127 items across 38 files" → **127 across 14 files**, with the counting rule (§G2). "zero times across all 38 content files" → **zero across the 37 files measured at `6358402`** (§G4), and note that the emphasis-wrapped construct now appears twice in this post as a code example. "About 250 matches" → name the glob, or use #664's classification (§G1).

7. **§I2 and §I4.** Name the "after" snapshot as `e42483b` (#725) and state the inclusion rule per §I3. Relabel the table's first row "the bespoke tool" rather than "the rule itself".

8. **§E6.** "Both reviewing every revision" is false for four of the seven PRs. Narrow it to #686 and #720, and add `github-advanced-security[bot]` as the third reviewer that contributed round 13 (§C1), or drop the enumeration of reviewers.

9. **§E1's publishability.** `.mergepath/` is gitignored, so no reader can open the ledger. Publish the loop-count-to-API mapping in §E1's table; it makes 17 of the 18 numbers in that paragraph checkable from a public endpoint.

10. **Align `seoDescription` with "17% of the implementation and tests".** L6 still reads "17% of the code", which #745 lists as an open acceptance criterion and which the body corrects twice. The mermaid node at L74 ("17% of the lines") has the same problem; the diagram's own `description` attribute already says it correctly.

11. **Blast radius is low and the slug is not.** No test pins this post's `title`, `seoTitle` or `seoDescription`—there is no `headline` field in the blog schema. Three files pin the **slug** (`tests/helpers/blog-editorial-order.js:5`, `tests/blog-chronology.test.js:29`, `tests/homepage-writing.test.js:119`) and `src/plugins/rehype-figure-captions.mjs:43-48` pins the three image paths with dimensions. Change neither.

12. **Compression.** The baseline is **4,133 words**, not the 4,014 #745 quotes. Per the operator's guidance in `plans/759/RUN.md` the 20-30% reduction is a guideline, not a gate. The cuts that pay: the cost-and-capability explanation is given three times (L52, L66, L143) and the two-warnings paragraph is paraphrased across the sidebar and L143 rather than duplicated verbatim, so it needs merging rather than deleting. The additions §§B-D require—the four-state table, the finding classification, the session ledger—are named acceptance criteria and are not removable. Recompute the word count as the **last** step before pushing; it moved on every round of the last three audits.

13. Before pushing, grep this post and this ledger for each corrected claim and confirm they agree. Four consecutive audits in this epic have produced at least one finding where an artifact contradicted itself or its sibling.

---

## N. Adversarial verification pass—21 defects, corrected

An independent verifier re-derived every figure in this ledger against the same sources. **This section supersedes anything above that contradicts it.** The lesson from #744 applies with force: a ledger row can be right about its headline and wrong in the sentence a drafting pass actually lifts, so the ledger's own prose is evidence under audit.

**N.1—§D1's classification accounted for 56 of 57.** Finding 36 (CodeRabbit, HTML implicit-`<p>`-close depth tracking) sat in no bucket. It belongs to the whitespace/HTML-depth machinery, so the subsystem figure is **48 of 57 (84.2%)**, not 47/57. Applied inline to §D1's rule, its residue table and its corrected value.

**N.2—the "looser matcher inflates it to 53/57" sentence never reproduced.** `fix|preserv|round-trip` alone returns 39, *below* the strict 42; `round-trip` matches nothing on the PR. The union of strict and loose is 54/57.

**N.3—§B1's understatement gap was doubled.** Peak 1,721 minus merged 1,513 is **208** script lines, not 404. The 256 test-line figure was right. This sat inside the corrected value of the ledger's second-most load-bearing row.

**N.4—§B3's script delta was 8, not 5.** The ledger's own totals require it: 2,417 + 36 = 2,453, and 5 + 28 = 33.

**N.5—§A1 swapped two populations.** 113/256 review submissions is **44%**; 45% is the inline-findings share, 57/126.

**N.6—§C5's stated reproduction did not produce its stated set.** Case-sensitive `Fresh evidence beyond` returns 28, dropping finding 47. The "literal phrase" claim matches only 25. And the findings do not *open with* it: every comment opens with a P-badge title, and the phrase sits mid-body in 23 of the 29.

**N.7—§F5's nulls claim was too broad.** PR #765's loop carries real values (`source: "claude-json-envelope"`, `output: 12559`, `cost_usd: 0.5516`). The nulls hold for the `codex-cli-stderr` loops—all of #668/#678/#681/#682—so the argument survives, but the rule must be scoped to that adapter. §E1, §E2 and §F5 must also give the absolute path `~/GitHub/nathanpaynedotcom/.mergepath/phase-4b-ledger.jsonl`.

**N.8—§E6's proposed replacement was itself false.** #686 carries 32 commits against 17 Codex-App and 27 CodeRabbit reviews; #720 carries 28 commits against 4 Codex-App reviews. Neither bot reviewed every push on either PR. The stacked-base explanation is also wrong: all seven PRs have `base: main`.

**N.9—§C2 and §D1 disagreed about the post-cut findings.** Finding 57 concerns a dependency *added* after the cut. Corrected inline in both places to two cleanup findings plus one documentation-debt finding.

**N.10—§K listed two rows that §C2 rejects, under a "do not re-audit" heading.** Both struck and redirected to §C2.

**N.11—§F3 claimed WRONG where the record is underdetermined.** The sidebar's one-session price and the body's two-session count can both hold if one of the two #686 sessions is in the unpriced `gpt-5.3-codex-spark` pair. Verdict is **UNPROVABLE**; the provable defect is narrower—a two-session token figure printed six lines from a one-session dollar figure.

**N.12—§J1 asserted a contradiction that does not exist.** #745 says the ledger "excludes the 24-round PR #686," which is exactly right. Retracted.

**N.13—§J2 refuted a claim #745 never made.** The issue requests classification buckets and does not assert the residual is populated.

**N.14—§D1's line citations were wrong and undercounted.** `grep -n "nearly all"` returns **L5, L6, L13, L18, L52, L66, L68, L229**—eight surfaces. L68 is the Mermaid `description=` attribute.

**N.15—§G1 substituted a figure no grep produces.** 260 is #664's hand classification, not a search result.

**N.16—§I3's exclusion figures.** Vale fixtures are **22**, not 21; `pulls/721/files` shows `scripts/lint-all.sh` at **-3**, and the enumeration omits `package-lock.json -5`.

**N.17—the header's word split was off by two.** 4,133 − 3,294 = **839** frontmatter words.

**N.18—§J missed the largest #745 error.** Its "Already fixed—do not redo" block asserts "127 items across 38 content files"; §G2 proves 14. An error inside a do-not-redo block actively prevents the fix.

**N.19—§L12's deduplication instruction pointed at a duplicate that is not there.** The two-warnings paragraph is paraphrased, not repeated verbatim.

**N.20—§E6's coverage summary contradicted itself.** It established that neither bot reviewed #681, #682 or #721—**three** PRs—then recommended saying "the four short ones." Corrected to three, with #678 described separately as drawing one review from each bot.

**N.21—the four-state LOC table's provenance is not reader-reproducible.** `147d9a7f10c0` and `abe3bfb62ea7` are reachable only from the deleted branch `claude/686-merge` and resolve in no fresh clone. Any published `git show "<sha>:…"` command must be accompanied by a `git fetch origin pull/686/head` step, or the snapshots must be re-anchored to commits reachable from `main`.

**Rows the verifier independently confirmed—do not re-audit:** §A1's timestamps and 48h56m54s; §A3's 1m55s; §B's 2,917/2,417/2,453 table and §B2's percentages; §B4's line numbers; §C1's series and the three-reviewer split; §C2's core chronology; §C3's sixteen; §D2; §E1's ledger figures; §E3; §E4's 28/63/10; §E5's 256/126; §F1 and §F2 arithmetic; §G2's 127 across 14 files; §G3 and §G4; §H1 and §H2; §I1; §I2's 1,211 vs 1,343.
