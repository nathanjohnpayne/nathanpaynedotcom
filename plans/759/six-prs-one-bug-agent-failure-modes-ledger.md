# Facts ledger—#744 `six-prs-one-bug-agent-failure-modes`

Post source: `src/content/blog/six-prs-one-bug-agent-failure-modes.md`. Evidence repo: `nathanjohnpayne/friends-and-family-billing` (FFB). Bare `#NNN` means **FFB** unless qualified. Shared cache: `plans/759/refs.json`.

Verdicts: **SUPPORTED** · **WRONG** (corrected value given) · **UNPROVABLE** (defensible weaker form given).

**Method notes carried from #740, #739 and #741.** An issue body is evidence of belief, not of what happened. A closure timestamp is not evidence of duration or success. When a review corrects a claim, grep **both** artifacts for every instance. And check a claim about a review against the review's actual body, not its existence.

---

## A. The chronology—the post inverts cause and effect

### A1—"On April 4, 2026, I opened issue #159… Over roughly twenty hours, one agent opened six PRs trying to resolve it"

> L53, L57

**WRONG, and the inversion is the most consequential error in the post.** Every one of the six PRs was opened **before** issue #159 existed.

| Opened (UTC) | Item | Kind | Closed / merged |
|---|---|---|---|
| 2026-04-03 19:51:18 | **#144** feat: TipTap WYSIWYG editor for InvoicingTab | pull | 2026-04-03 20:14:29 |
| 2026-04-03 21:18:38 | #145 [Post-Review] `20dcb32` pushed directly to main | issue | 2026-04-03 22:40:13 |
| 2026-04-03 22:35:34 | **#146** fix: balanced bold-token regex and round-trip safe serialization | pull | 2026-04-03 22:40:00 |
| 2026-04-03 23:07:10 | **#153** fix: resolve five InvoicingTab bugs (#148–#152) | pull | 2026-04-03 23:13:12 |
| 2026-04-04 04:56:13 | **#154** fix: prevent useEditor from recreating editor on every keystroke | pull | 2026-04-04 04:56:39 |
| 2026-04-04 05:01:41 | **#155** fix: convert bold, italic, and links in legacy templates | pull | 2026-04-04 05:37:15 |
| 2026-04-04 06:13:16 | **#158** fix: extract template-doc.js to fix loading slowdown | pull | 2026-04-04 16:16:41 |
| **2026-04-04 16:52:16** | **#159** Bug: Invoicing editor/preview/rendering are not visually consistent | **issue** | 2026-04-04 18:21:52 |
| 2026-04-04 17:41:42 | **#161** [codex] Fix invoice template rendering parity | pull | 2026-04-04 17:57:49 |

The last of the six, #158, **closed 36 minutes before #159 was filed**. Only #161 comes after the issue.

Corrected value, and it is a better story: the six PRs came first, each chasing a symptom without a stated invariant. Issue #159 is what happened *after* they failed—the moment the problem stopped being a series of tickets and got named as one. Then #161 fixed it. The post currently reads as though the issue kicked off the six attempts, which reverses the causal arrow and loses the actual product lesson: nobody had written down what "correct" meant until six PRs had already shipped against it.

The post's own date is right—#159 was filed on April 4—and "roughly twenty hours" is fair for the whole arc: first PR opened to last PR closed is **22 h 06 m** (`2026-04-03T19:51:18Z` → `2026-04-04T17:57:49Z`). It is just not twenty hours *after* the issue. Source: `refs.json` → the nine FFB entries, `.created_at` / `.closed_at` / `.merged_at`.

### A2—#144 as "a failed fix"

> "one agent opened six PRs trying to resolve it: #144, #146, #153…" (L57); "### PR #144: The migration preserved the old assumption"

**WRONG by classification.** #144 is *"feat: TipTap WYSIWYG editor for InvoicingTab"*—the originating implementation that introduced the architecture under discussion, opened a full 21 hours before the issue. It is the change that created the bridge, not an attempt to remove it. Counting it as one of six failed fixes for a bug it predates and caused is a category error. Corrected value: #144 is the originating implementation; the fix attempts are #146, #153, #158, with #154 and #155 orthogonal (§A3). Source: `refs.json` → `#144.title`, `.created_at`.

### A3—#154 and #155 counted as attempts

> "### PR #154 and PR #155 fixed real bugs, just not this one" (L243)

**Internally inconsistent.** The post says in its own heading that these two did not address this bug, then counts them among the six attempts on it. The inclusion rule is never stated. Defensible form: name the set precisely—"six pull requests in one session on this surface"—and label each by role: one originating implementation (#144), three attempts at the parity bug (#146, #153, #158), two orthogonal fixes (#154, #155). #744's acceptance criteria ask for exactly this inclusion rule. Source: the post's own §"PR #154 and PR #155 fixed real bugs, just not this one"; `refs.json` titles.

---

## B. The review record

### B1—"nathanpayne-codex flagged exactly this problem in its review of PR #146"

> L217

**WRONG.** `nathanpayne-codex` **approved** #146 and reported the opposite. Its full review body:

> "External re-review: APPROVED. I re-reviewed the `invoice.js` fix for the two issue #145 findings. The balanced regex now leaves one-sided `**` as literal text, and `docToPlainTextWithTokens()` preserves bold-marked tokens as `**%token%**`, so the legacy plaintext fallback round-trips correctly. Verification in a clean worktree: exact round-trip repro cases, `npm ci`, `npm --prefix functions ci`, `npm test`, and `npm run build`."

#146 carries **zero** `CHANGES_REQUESTED` reviews and **zero** inline comments, from either reviewer. `nathanpayne-claude` also approved. Nobody flagged the invariant on #146; the reviewers verified the round-trip and signed it off.

The claim appears to belong to **#155**, which does carry three `CHANGES_REQUESTED` reviews from `nathanpayne-codex`—and the post separately describes exactly that, two sections later (§B2). The "reviewers saw it and it still shipped" beat is real; it is just attached to the wrong PR. Corrected value: on #146 both reviewers approved and reported the round-trip working. The reviewer pushback lands on #155. Source: `gh api repos/nathanjohnpayne/friends-and-family-billing/pulls/146/reviews` and `/comments`.

### B2—"The review feedback on PR #155… flagged three separate round-trip safety issues"

> L249

**SUPPORTED, and precisely.** #155 carries exactly **three** `CHANGES_REQUESTED` reviews from `nathanpayne-codex` before its approval. Source: `gh api repos/.../pulls/155/reviews`, filtered on state.

### B3—"nine review rounds"

**WRONG on the most natural reading.** Counting blocking rounds across the six PRs gives **seven**, not nine:

| PR | `CHANGES_REQUESTED` |
|---|---:|
| #144 | 2 |
| #146 | 0 |
| #153 | 0 |
| #154 | 0 |
| #155 | 3 |
| #158 | 2 |
| **Total** | **7** |

Counting *all* review submissions instead gives 19. Neither is nine. If the figure comes from the unpublished session log (§C1) it needs the same treatment as the rest of that ledger. Corrected value: seven blocking review rounds across the six PRs, or state the counting rule and the source. Source: `gh api repos/.../pulls/{144,146,153,154,155,158}/reviews`.

### B4—Codex authored the fix

> "#161 [codex] Fix invoice template rendering parity"

**SUPPORTED.** #161's title carries the `[codex]` prefix, and it is the only PR opened after #159. The agent rotation the post describes is real and visible in the record. Source: `refs.json` → `#161.title`, `.created_at`.

---

## C. The session-log figures

### C1—"Eighteen prompts, nine review rounds, three hook interventions, and twenty hours"

**UNPROVABLE except where it overlaps the public record.** Prompt count and hook interventions exist only in an unpublished session log; a reader cannot check either. "Nine review rounds" is checkable and does not match (§B3). "Twenty hours" is checkable and approximately right for the whole arc (§A1, 22 h 06 m). Defensible form: publish an inspectable, privacy-safe ledger, or label the unverifiable figures explicitly as author-counted records and use the public timestamps for everything the repository can carry. #744's acceptance criteria offer both routes.

---

## D. The invariant and the rendering path

### D1—"Editor = Preview = Sent email"

**UNPROVABLE as stated, because it reads as byte or visual equality.** The final architecture still renders the editor DOM separately and shares a renderer only between preview and sent-email HTML; the payload additionally has separate HTML and text builders. Defensible form: state it as semantic/content parity—the same document model produces all three, and text that is not bold in the editor is not bold anywhere downstream—and name which outputs legitimately differ. Issue #159's own "Expected behavior" section is written this way and is the better source: "Text that is not bold in the editor must not become bold in Preview or sent email." Source: `gh api repos/.../issues/159` → `.body`, § Expected behavior.

### D2—"One semantic rendering path"

**UNPROVABLE without a stated boundary.** The preview code retains a fallback (`previewEmailPayload.html || renderInvoiceTemplate(...)`), which is a second path by construction. Defensible form: define the boundary—which surfaces share the canonical renderer and where the fallback legitimately remains—and verify it against the merged code rather than the diagram.

---

## E. Causal and universal claims

### E1—"the difference was not the model"

**UNPROVABLE.** Claude authored the failed sequence and Codex authored the fix; model, tool, prompt framing, accumulated context, and visibility of the prior six PRs all changed at once. There is no arm in which prompt framing was the only variable. Defensible form: prompt framing is a plausibly important variable, and the reframed brief is the thing Nathan controlled and changed. That is the product lesson and it survives without the causal claim.

### E2—"Those three questions would have caught this bug at PR #144" / "any agent will behave differently"

**UNPROVABLE—counterfactual and universal respectively.** Defensible form: state what the questions are designed to surface and that they are now standing practice; drop the claim about what would have happened and the claim about all agents.

---

## F. Claims that stand as written

| Claim | Source |
|---|---|
| Issue #159 reports editor, preview and sent email disagreeing, with bold and spacing as the two named regressions | `#159.body` § Summary |
| #144 introduced the TipTap editor | `#144.title` |
| #146 fixed bold-token round-tripping via a balanced regex and serializer change | `#146.title`; codex review body (§B1) |
| #154 fixed `useEditor` recreating the editor on every keystroke | `#154.title` |
| #155 converted bold, italic and links in legacy templates | `#155.title` |
| #158 extracted `template-doc.js` | `#158.title` |
| #161 was authored under the Codex identity and fixed rendering parity | `#161.title` |
| The whole arc spans roughly twenty hours | 22 h 06 m, §A1 |

---

## G. Instructions to the drafting pass

1. Every number, date and causal claim must trace to a **SUPPORTED** row.
2. **§A1 is the rewrite.** The six PRs precede the issue. Restructure the opening so the arc runs: an implementation ships (#144) → symptoms get chased across five more PRs → the failures force the problem to be named (#159) → a reframed brief to a different agent fixes it (#161). The post's own thesis is stronger this way: the missing artifact was a written invariant, and its absence is why six PRs could each be locally reasonable.
3. **§A2 and §A3 need the inclusion rule stated.** One originating implementation, three attempts, two orthogonal fixes—not "six failed attempts."
4. **§B1 must be corrected, not dropped.** The "reviewers saw it and it shipped anyway" beat is real; it belongs to #155, where three blocking rounds are on the record. On #146 both reviewers approved and verified the round-trip.
5. Where a row says **UNPROVABLE** (§C1, §D1, §D2, §E1, §E2), use its defensible form.
6. Compression: the epic asks 20–30% from 4,463, "with chronology retained where it is evidence"—and after §A1 the chronology *is* the evidence, so retain it. Per the operator's guidance in `plans/759/RUN.md` the reduction is a guideline, not a gate.

---

## H. Compression accounting

Counts are **words**, via `wc -w` over the whole file, the same method as the epic's baseline.

| Measure (words) | Baseline | Revised | Change |
| --- | ---: | ---: | ---: |
| Whole file (the epic's 4,463 baseline) | 4,463 | 4,227 | **−5.3%** |

**Short of the 20–30% guidance, and deliberately so.** #744's own compression clause is the only one in the epic that carries a carve-out—"with chronology retained where it is evidence"—and after §A1 the chronology *is* the evidence. The corrected arc only works if the reader can see that all six PRs precede the issue, which needs the timestamped table, and that each PR was locally reasonable, which needs the per-PR sections.

What was cut: the duplicated inline copy of the sidebar Mermaid diagram; the "closed feedback loop" diagram, whose premise depended on the wrong §B1 claim and which stopped matching the record once #146 was corrected to an approval; four screenshot subsections collapsed into one run; and the over-explanation in the #144, prompts and brief sections.

What was added, and is not removable: the chronology table (§A1), the inclusion rule (§A3), the blocking-round table (§B3), the semantic-parity definition (§D1), the rendering-path boundary (§D2), and the confounder list (§E1). Every one is a named acceptance criterion.

Per the operator's guidance recorded in `plans/759/RUN.md`, the reduction is a guideline rather than a gate. Closing the remaining gap would mean deleting the chronology the issue explicitly says to keep.

---

## I. The title: considered, and kept

The drafting pass proposed retitling the post from **"Six PRs, One Bug: What AI Agents Actually Get Wrong"** to "The Invariant Nobody Wrote Down", on the grounds that #744's positioning section rules out treating the PRs as "a spectacle of agent incompetence". I endorsed it, implemented it across eight files, and then reverted it. Recording why, because the reasoning is the useful part.

**The retitle over-read the constraint.** "Not a spectacle of agent incompetence" governs the *treatment*, not the headline, and the revised body already satisfies it: every per-PR section argues the agent behaved reasonably given a symptom-shaped input, and the closing paragraph puts the process failure on the operator.

**The original title survives the correction intact.** Its load-bearing word is "actually"—it claims the common assumption about *how* agents fail is wrong and the real thing is subtler, which is the same move the post makes. The failure mode it names is real and unaffected by the chronology fix: across the three parity attempts the agent patched the nearest plausible code path and never promoted a repeated local failure into a structural question. Correcting *why* that happened does not stop it being a thing agents get wrong.

**The blast radius was the deciding factor.** The title turned out to be referenced in seven **files** outside the post, carrying nine references in total since `mergepath.md` and `blog-pages.test.js` each hold two, and a first grep found only four of those files:

| File | Reference |
|---|---|
| `src/content/projects/swipe-watch.md` | `related` link label |
| `src/content/projects/override.md` | `related` link label |
| `src/content/projects/device-source-of-truth.md` | `related` link label |
| `src/content/projects/friends-and-family-billing.md` | `related` link label |
| `src/content/projects/mergepath.md` | `related` label **and** an in-body prose link |
| `src/components/resume/WritingSection.astro` | the `/resume` writing list |
| `tests/blog-pages.test.js` | asserts the exact `headline` **and** the exact `seoDescription` |

Spending that much churn, including a test assertion, on a framing judgement defensible either way was the wrong trade. **The rule: a correction the evidence forces is worth any blast radius; a taste change is worth roughly none.**

Two findings from the exercise are worth keeping even though the change was reverted.

**`tests/blog-pages.test.js` pins this post's `headline` and `seoDescription` as exact strings**, in two assertions each—a tighter contract than the other six posts carry. The `seoDescription` *is* revised here (the original described a chronology now known to be inverted), so that assertion is updated and the `headline` one is not. **The remaining three audits should check for a pinned assertion before editing frontmatter.**

**Grep twice, on a distinctive fragment.** The first sweep matched only the em-dash form used in `related` labels and missed the colon form in the title, the resume component and the test. Search for the distinctive substring—"What AI Agents Actually Get Wrong"—not the whole formatted title.

---

## J. Codex round-1 addendum (PR #798)

Three findings. The first one is the sharpest of this audit and it invalidated the revision's own thesis.

### J1—The invariant *was* written down, in the spec, before any of this

The revision made "nobody wrote down what correct meant" the central conclusion—in the `description`, the `seoDescription`, a `keyTakeaway`, the chronology table, and the closing paragraph. The same revision then quotes the pre-#144 design spec and calls its rendering requirement "essentially the invariant":

> HTML is generated from JSON for Preview rendering. Email-safe HTML is generated from JSON for final outbound email rendering.

That sentence predates #144 and describes exactly the output model the bug violated. So the article's own evidence contradicts its own thesis, in the same file.

**The corrected lesson is better than the one it replaces.** The invariant existed as prose in a design document and still lost, because the competing requirement—backward compatibility with legacy plain-text templates—arrived with a named function and checkable behavior while the architectural intent arrived as a sentence. It never became a requirement attached to any piece of work anyone reviewed: not an acceptance criterion, not a PR checklist item, not a test. Issue #159's contribution was not writing it down; it was making it **checkable**.

That is also what §B1 already implies and what the post's own #144 section already argues—"an agent optimizes for the constraint it can verify"—so the thesis was contradicting two of its own sections, not one.

Reconciled across all seven surfaces. "Write it down" is the easy lesson; "prose in a design document loses to a named function with checkable behavior" is the true one.

### J2—§I reinstated the classification §§A2–A3 correct

The title rationale said the agent "patched the nearest plausible code path **six times**", which is the "six failed attempts" framing this ledger spends two sections dismantling. Scoped to the three parity attempts.

### J3—The revised word count was off by one

4,163, not 4,162. Corrected, and superseded again by the J1 rewrite: the file now stands at 4,227, −5.3%.

**Pattern note, fourth audit running.** Every round on this PR and the last two has produced at least one finding where an artifact contradicts itself or its sibling. The reconciliation step—grep every claim across post and ledger before pushing—is the single highest-yield check in this workflow and I have now failed to run it thoroughly on four consecutive PRs.

---

## K. CodeRabbit addendum (PR #798)

Four findings. Two fixed, two rebutted.

### K1—`RUN.md`'s #744 row was missing its PR *(rebutted, already fixed)*

The row carried `#798` before this review posted; the finding is pinned to an earlier commit. No change.

### K2—§I mixed files and references *(fixed)*

The prose said "seven places" while the table listed seven **files** carrying nine references, two of them doubled. Restated in files, with the reference count alongside, and the "first grep found only four" line scoped to files as well.

### K3—Missing OG image at `public/og/blog/…` *(rebutted)*

OG images are build artifacts. `public/og/blog/` does not exist and never has; `src/integrations/og-images.mjs` screenshots an Astro template at build time and writes into `dist/og/`, and the file is present there after a build. Nothing is missing. This is a recurring false positive from this reviewer on this repository.

### K4—The FFB project page contradicted the corrected classification *(fixed, and it was worse than reported)*

`src/content/projects/friends-and-family-billing.md` said "Six PRs across twenty hours failed to fix the parity bug", which is the "six failed attempts" framing §§A2–A3 dismantle. Corrected to name the roles.

The finding also surfaced an error it did not report. The same sentence credited the fix to "[the seventh PR](…/pull/178)". **PR #178 is not the fix.** It is "Fix: Unify invoicing Edit/Preview layout (#176)", opened `2026-04-06T19:44:46Z`—two days later, and about visual layout parity between Edit and Preview modes, not the rendering-path bug. The fix is **#161**, opened `2026-04-04T17:41:42Z`. Corrected.

**This is the audit reaching outside its own post.** The project page is nominally #751–758 scope, but a wrong PR citation about the very arc this post documents is a correction the evidence forces, and §I's rule applies: a correction the evidence forces is worth any blast radius. Worth flagging that the surrounding project pages have never been audited and may carry more of these.

