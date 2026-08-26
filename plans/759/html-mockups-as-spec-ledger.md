# Facts ledger—#741 `html-mockups-as-spec`

Post source: `src/content/blog/html-mockups-as-spec.md`. Published `2026-05-19`. **Pre-revision baselines: 3,602 body words, 4,131 whole-file** (the epic's figure, which counts frontmatter). Evidence repos: this repository for the blog index, post layout and 404 mock-ups; `nathanjohnpayne/friends-and-family-billing` for the editor example. Bare `#NNN` means **this repository** unless qualified. Shared cache: `plans/759/refs.json`.

Verdicts: **SUPPORTED** · **WRONG** (corrected value given) · **UNPROVABLE** (defensible weaker form given).

**Method notes carried from #740 and #739.** An issue body is evidence of what someone believed, not of what happened; check mechanically checkable claims against the mechanism (#740 §J3, §M1). A closure timestamp is not evidence of duration or success (#740 §K1, #739 §F2). And when a review corrects a claim, grep **both** artifacts for every instance before considering it fixed (#739 §N, §O).

---

## A. The central evidence does not exist

### A1—`mockups/` and its four files

> "Claude produced four files—`A-cards-grid.html`, `B-de-stijl-index.html`, `C-composition-margins.html`, `D-minimal.html`—and I picked Mockup B." (L94); referenced as a live path nine more times.

**WRONG as a repository claim; the directory has never existed here.** Both searches come back empty:

```
git log --all --diff-filter=A -- 'mockups/*'   ->  (no commits)
git rev-list --all -- 'mockups/**'             ->  (no commits)
```

There is a `mockups/` directory in **mergepath**, added by its PR #78 and later renamed to `mergepath/`, but that is the review-policy playground and has nothing to do with these designs.

So the files were local scratch, never committed, and a reader cannot open any of them. The post nonetheless writes about them in the present tense—"a typical one in `mockups/B-de-stijl-index.html` is somewhere around two hundred to four hundred lines"—which reads as an invitation to go and look.

Corrected value: the mock-ups were local working files that were never committed to this repository and no longer exist. Only **B** and **C** are corroborated at all, by name, in the issues that consumed them (§A3). `A-cards-grid.html` and `D-minimal.html` appear in no surviving record of any kind. Source: the two `git` queries above, run against the full history of this repository; `git -C ~/GitHub/mergepath log --all --diff-filter=A -- 'mockups/*'` → `cb3541d feat(mockups): ship Mergepath review-policy playground (#78)`.

### A2—"Some of mine got committed; most got deleted as part of the implementation PR"

> L~169

**WRONG.** None got committed. §A1's history search finds no `mockups/` file ever added, in any branch, at any point. "Most got deleted" cannot be true of files that were never tracked. Corrected value: none of them were committed; they existed only on disk during the design decision. Source: as A1.

### A3—What evidence does survive

**SUPPORTED, and it is the answer to the acceptance criterion asking what still exists.** The mock-ups are gone, but the two issues that consumed them transcribe their key characteristics, which is why the design decisions remain auditable:

- **Issue #75** (blog index) contains, verbatim: "Mockup B from `mockups/B-de-stijl-index.html`. Key characteristics:" followed by featured post in the largest cell top-left spanning multiple rows; accent blocks red top-mid, blue with a vertical "Latest" label top-right spanning rows, yellow bottom-right; older posts in progressively smaller cells; an RSS CTA neutral block; **9px black grid lines** between all cells; and a page header retaining breadcrumb, kicker, h1 and description.
- **Issue #74** (post template) contains the parallel line: "Mockup C from `mockups/C-composition-margins.html`. Key characteristics:".

The post's blockquote of issue #75 is accurate, including the 9px detail, though it flattens the issue's bullets into prose.

This is the honest shape of the story: the mock-up was the working spec, and the issue is the durable record of what it specified. Worth saying outright rather than implying the file is still there. Source: `gh api repos/nathanjohnpayne/nathanpaynedotcom/issues/{74,75}` → `.body`, § Design.

---

## B. The mock-up that actually drove PR #77

### B1—`B-de-stijl-index.html` versus `blog-landing 2.html`

> "Then I asked Claude to read both `mockups/B-de-stijl-index.html` and `src/pages/blog/index.astro`… That kicked off [PR #77]." (L98)

**WRONG, or at least contradicted by the PR itself.** PR #77's own body names a different artifact:

> "Replace card-list blog index with Mondrian-style row grid matching the `blog-landing 2.html` mockup exactly"

Its acceptance criteria repeat "matching mockup proportions", and its self-review says "Generated HTML matches the mockup structure element-for-element"—but the only filename the PR ever names is `blog-landing 2.html`, which is not in the four-file list, not in `mockups/`, and not in issue #75.

Two readings are available and the record does not settle between them: either the same file was referred to by two names, or the mock-up that issue #75 specified is not the one PR #77 implemented against. Either way the post's clean chain—Mockup B → issue #75 → PR #77—has a documented seam in it. Defensible form: state that issue #75 specified Mockup B and PR #77 records implementing against a file it calls `blog-landing 2.html`, and do not assert they are the same artifact without evidence. Source: `gh api repos/nathanjohnpayne/nathanpaynedotcom/pulls/77` → `.body`, lines 4, 13, 25.

### B2—"The commit message says it plainly: 'De Stijl Mondrian row grid from mockup.'"

**SUPPORTED.** That is PR #77's title: "Blog index: De Stijl Mondrian row grid from mockup". Calling it the commit message is loose—it is the PR title, which becomes the squash subject—but the words are exact. Source: `refs.json` → `nathanjohnpayne/nathanpaynedotcom#77.title`.

---

## C. The 404 page's provenance

### C1—"shipped in [PR #90]"

> L~117, linked as `/pull/90`

**WRONG twice over.**

1. **#90 is an issue, not a pull request**: "Update site to follow Google Search SEO best practices", opened `2026-04-11T17:14:56Z`, closed `17:34:04Z`. The post links `/pull/90`; GitHub silently redirects that to `/issues/90`, which is why the bad citation looks live. This is the same defect class as #740 §E1.
2. **No pull request shipped it.** The 404 page arrives in commit **`4076bf6`**, "SEO improvements: 404 page, meta tags, canonical fix, internal linking (#90)", `2026-04-11T10:33:51-07:00`. That commit has a **single parent** and `gh api repos/.../commits/4076bf6/pulls` returns **nothing**—there is no associated PR.

So the 404 page, in a post about a disciplined design-to-implementation workflow, landed as a direct commit on `main` closing issue #90.

Corrected value: the 404 page shipped in commit `4076bf6`, which closed issue #90 and was not opened as a pull request.

**This is worth keeping rather than smoothing.** The post's companion piece on Mergepath is about making exactly this impossible, and the FFB example three sections later turns on a direct-to-`main` push being caught (§D3). A third instance in the author's own repository, in the same post, is evidence rather than embarrassment. Source: `gh api repos/nathanjohnpayne/nathanpaynedotcom/issues/90`; `git log -1 --format='%h parents=%p' 4076bf6`; `gh api repos/nathanjohnpayne/nathanpaynedotcom/commits/4076bf6/pulls` → empty.

### C2—PRs #91 and #92 refined the 404 page

**SUPPORTED.** #91 "Remove SPA rewrite so custom 404 page works" (merged `2026-04-11T18:41:12Z`) and #92 "Update 404 page colors to match homepage palette" (merged `18:47:48Z`) are both genuine pull requests and both are about the 404 page. #91 also corroborates the post's aside that Firebase had been rewriting all 404s to the SPA shell. Source: `refs.json` → `#91`, `#92`.

### C3—The Jen Simmons CodePen and the CSS comment

> The post quotes a four-line comment from `src/styles/global.css`.

**SUPPORTED, verbatim.** `src/styles/global.css:2687-2689` reads exactly: "Asymmetric grid inspired by Jen Simmons' Mondrian CSS Grid CodePen. / Content cell spans multiple tracks; decorative blocks fill remaining cells. / Collapses to single column on mobile with blocks hidden." Source: `grep -n -A3 'Jen Simmons' src/styles/global.css`.

---

## D. The FFB example

### D1—Commit `20dcb32`

> "titled, literally, 'fix: redesign editor layout to match mockup and fix editability.'"

**SUPPORTED, verbatim.** `20dcb32`, `2026-04-03T14:16:38-07:00`, subject exactly as quoted. Source: `git -C ~/GitHub/friends-and-family-billing log -1 --format='%s' 20dcb32`.

### D2—The external review summary quote

> "The external review summary opens with this line: 'Restructures the InvoicingTab editor to match the target mockup.'"

**SUPPORTED, verbatim**, and the sentence continues in the source with the eight design items the post paraphrases: "single card layout with subject row, unified chip bar, toolbar with background/separators, sticky save footer with 'Last saved' timestamp, redesigned Preview tab with footer-positioned 'Send test email' button." Source: `gh api repos/nathanjohnpayne/friends-and-family-billing/issues/145` → `.body`.

### D3—Issue #145 and the direct push

> "The agent had pushed it directly to `main` without a PR, which triggered a policy violation review in issue #145."

**SUPPORTED.** friends-and-family-billing#145 is an issue titled "[Post-Review] Post-merge review: 20dcb32 pushed directly to main". Source: same.

### D4—"the markdown bridge… eventually took six PRs to undo"

**SUPPORTED**, and cross-checked against the #744 evidence cluster: friends-and-family-billing PRs #144, #146, #153, #154, #155, #158 are the six, with #161 the reframed removal. Source: `refs.json` → the friends-and-family-billing entries.

---

## E. Timing and effort claims

### E1—"failing in prose for weeks" / "shipped in an afternoon"

> L98

**UNPROVABLE as a comparison, and the two intervals that do exist measure something else.**

| Interval | Value |
|---|---|
| Issue #75 open → closed | **9 h 27 m** (`2026-04-09T13:02:17Z` → `22:29:26Z`, i.e. 06:02 → 15:29 Pacific) |
| PR #77 open → merged | **15 m 20 s** |
| Issue #74 open → closed | 8 h 30 m |
| PR #76 open → merged | 28 m 37 s |

An issue's open interval is not design effort and a PR's open interval is not implementation effort; neither counts the mock-up round trips, which left no record at all. And "weeks of failing in prose" has no start point anywhere in the repository—the site's first commit is `2026-02-22` and the blog-layout work is April, so the interval is bounded above by about seven weeks and is otherwise unmeasured.

Defensible form: the two issues opened and closed inside a single day each, and the pull requests were open for minutes; the preceding prose attempts are not measured anywhere. Keep the qualitative contrast and drop the implied stopwatch, which #741's acceptance criteria explicitly permit. Source: `refs.json` → `#74`, `#75`, `#76`, `#77` timestamps.

### E2—"you can spin three or four design candidates in an afternoon"

**UNPROVABLE.** No record of mock-up generation time exists, because the mock-ups themselves were never committed (§A1). Defensible form: present as the author's practice, not a measured rate.

---

## F. Claims about mechanism and method

### F1—"The vision model and the code model were not the same model in any practical sense"

**UNPROVABLE, and mechanistic.** Nothing in the record establishes anything about model architecture. The observable is that in these attempts, the picture-to-code handoff lost information the file-to-code handoff did not. Defensible form: describe the workflow result. #741's acceptance criteria require exactly this substitution.

### F2—"HTML beats screenshots and prose"

**UNPROVABLE as a controlled result.** The attempts were sequential and uncontrolled: prompts, context, tool access, iteration counts and the maturity of the target design all changed between them. There is no arm in which the medium was the only variable. Defensible form: a case series with the confounders named, not a demonstrated property of coding agents.

### F3—"That is the only acceptance criterion that matters: do they match"

> Postscript, step four

**WRONG on its own terms, and contradicted by this repository's own gates.** Visual match is not the acceptance bar here: the repo enforces WCAG AA contrast on styled Mermaid nodes from rendered output (`rules/repo_rules.md` § Content Invariants, `tests/mermaid-contrast.test.js`), runs a Playwright responsive suite, and validates SEO plumbing at test time. A page that matched its mock-up pixel for pixel and failed keyboard navigation, contrast, or the responsive breakpoints would not ship. Corrected value: visual fidelity to the mock-up is the design acceptance criterion; production acceptance additionally covers responsive behaviour, accessibility, real-content stress, interaction correctness and performance.

### F4—"Specs that live in prose drift with every prompt. Specs that live in HTML do not."

**Internally contradictory with §A2.** A file that is deleted after implementation cannot be re-read on a later prompt, cannot serve as a regression oracle, and cannot be diffed against the page a year later. The non-drift property holds only while the file exists. Defensible form: the mock-up is a durable spec **for the duration of the decision**, and a temporary decision aid afterwards. The durable artifact is the issue that transcribes it (§A3).

---

## G. A production observation the post should probably own

### G1—The hero image is 3.1 MB

`public/blog/html-mockups-as-spec/img/mondrian-inspiration.jpg` is **3,215,910 bytes**. It is the first image on a post whose closing argument is about production quality, and #741's acceptance criteria name performance as part of the bar that "do they match" omits.

Not a factual error in the prose, so not a WRONG row—but it is a live example of the gap between visual acceptance and production acceptance, sitting inside the post that argues the gap matters. Either fix it or let it make the point. Source: `ls -l public/blog/html-mockups-as-spec/img/mondrian-inspiration.jpg`.

---

## H. Claims that stand as written

| Claim | Source |
|---|---|
| Issue #75 asked for a De Stijl Mondrian grid for the blog index | `#75.title`, `.body` § Summary |
| The post's blockquote of issue #75's design section | verbatim against `.body`, 9px grid lines included |
| PR #76 came from issue #74 and produced the post template | `refs.json` → `#74`, `#76` |
| Both post images exist and are served | `public/blog/html-mockups-as-spec/img/{mondrian-inspiration.jpg,ffb-editor-mockup.png}` |
| Firebase had been rewriting 404s to the SPA shell | `#91.title` |
| The FFB editor is TipTap-backed with token nodes and migration logic | #744's evidence cluster; `refs.json` |

---

## I. Instructions to the drafting pass

1. Every number, date and causal claim must trace to a **SUPPORTED** row. Do not introduce a figure this ledger does not carry.
2. **§A is the spine of this revision.** The post's central artifact is not inspectable and never was in this repository. Say so plainly, and pivot the evidence onto what does survive: the issues that transcribe the mock-ups' key characteristics, quoted at length. That satisfies the "preserve or publish the selected artifacts, or add evidence sufficient to compare" criterion honestly.
3. **§B1 must not be smoothed.** The clean chain has a documented seam; present both names and do not assert they are the same file.
4. **§C1 is uncomfortable and should stay.** A direct-to-`main` commit shipping the 404 page, in a post whose sibling piece is about making that impossible, is evidence. The FFB example already turns on the same thing.
5. Where a row says **UNPROVABLE** (§E1, §E2, §F1, §F2), use its defensible form. §F1 in particular: replace the model-architecture explanation with the observable workflow result.
6. **§F3 and §F4 are the two argument-level corrections** the acceptance criteria demand: separate design acceptance from production acceptance, and stop claiming a deleted file cannot drift.
7. The artifact table the criteria ask for—blog index, post layout, 404, FFB editor, each with input artifact, decision owner, issue/PR, quality bar, outcome and surviving evidence—should be built from §A3, §B1, §C1, §C2 and §D.
8. Compression: the epic asks 20–30% from 4,131. Per the operator's guidance recorded in `plans/759/RUN.md`, that is a **guideline, not a gate**: compress the repeated example mechanics (the four "things going on at once", the postscript's four steps, the FFB narration), and do not cut evidence or the corrections above to hit a number.

---

## J. Compression accounting

Measured with `wc -w`, the same method as the epic's baseline.

| Measure | Baseline | Revised | Change |
| --- | ---: | ---: | ---: |
| Whole file (the epic's 4,131 baseline) | 4,131 | 3,797 | **−8.1%** |
| Body prose, frontmatter excluded | 3,602 | 3,273 | **−9.1%** |

**Well short of the 20–30% guidance, and the raw figure understates the cutting that happened.** The revision carries roughly 900 words the original did not: the four-surface artifact table, the §A non-existence correction, the §B1 seam, the §C1 direct-commit correction, the case-series caveat, and the design-versus-production acceptance section. Every one of those is a named acceptance criterion for #741. Net of them, the surviving original prose is down by roughly a third.

What was actually cut: the inline duplicate of the sidebar Mermaid diagram; the "few things going on at once" enumeration, from four items to three plus a retraction; the four-step postscript, from four numbered paragraphs to one; the FFB narration and the 404 closer, both of which restated the thesis a third and fourth time; and the "what an HTML mock-up actually contains" section, folded into a single clause at the pivot.

Per the operator's guidance recorded in `plans/759/RUN.md`, the reduction is a **guideline rather than a gate**. Hitting 20% from here would mean deleting the artifact table or one of the three corrections, which is the trade #741 exists to prevent: this is the post whose central artifact turned out not to exist, and the fix for that is more evidence, not less.

