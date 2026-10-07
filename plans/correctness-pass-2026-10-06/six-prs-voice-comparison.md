# Six PRs, One Bug: voice revision review

Baseline: main at `86b5af34ee008aa796987a3487d3e58a5339dd2a`. This article's bytes are unchanged from PR #1129 (`1d1d39ddb43c837341ecc1862d7d2818eb08ea4c`). Complete source: `src/content/blog/six-prs-one-bug-agent-failure-modes.md`. The draft is for owner review; it has not been published.

## Before and after

### Opening

**Before**

> [Friends & Family Billing](/projects/friends-and-family-billing/) exists to send one kind of email: an invoice asking my friends and family for money. In early April 2026 it could not be trusted to send it. The template editor showed one version of the message, Preview a second, and the email that arrived a third—text turning bold that nobody had bolded, spacing no two surfaces agreed on. [Issue #159](https://github.com/nathanjohnpayne/friends-and-family-billing/issues/159) names bold and spacing as the two regressions, and the product consequence outranks both: a billing tool that cannot show you what it is about to send is untrustworthy at exactly the moment it asks someone to pay.

**After**

> [Friends & Family Billing](/projects/friends-and-family-billing/) sends invoices to my friends and family. In early April 2026, the template editor, Preview, and the email that arrived showed three versions of the same message. Text turned bold that nobody had bolded. The spacing changed between surfaces. [Issue #159](https://github.com/nathanjohnpayne/friends-and-family-billing/issues/159) records both regressions. If I'm asking someone for money, I need to know what the email will say.

### The spec and compatibility requirement

**Before**

> The agent satisfied both the simplest way available: flatten the new format into the old one via `docToPlainTextWithTokens()` and reuse the existing pipeline. That honors the spec's letter and defeats its intent. The compatibility constraint had a named function and checkable behavior; the architectural intent was a sentence. When a spec carries both, the constraint that can be verified wins. The structured document became a temporary format on its way back to plaintext: the bug, one day early.

**After**

> The spec also required `buildInvoiceBody` to handle both legacy plain-text templates and the new TipTap JSON. Claude flattened the new document into the old format through `docToPlainTextWithTokens()` and reused the existing pipeline. That met the compatibility requirement while losing the output model I'd asked for. In this implementation, the requirement with a named function and checkable behavior won over the architectural intention in prose. The structured document became a temporary stop on the way back to plaintext. That was the bug, a day before I filed the issue.

### What reviewers could check

**Before**

> Zero blocking reviews, zero inline comments, from either reviewer identity; `nathanpayne-claude` approved as well. Neither review mentions the invariant, which lived in my notes vault, outside the repository, until twelve hours after the fix merged; nothing in this PR referenced it, and no reviewer in a clean worktree could have opened it. Review confirms a diff against whatever standard the PR puts in front of it; when no standard is attached, it confirms the diff against itself.

**After**

> There were zero blocking reviews and zero inline comments from either reviewer identity. `nathanpayne-claude` approved too. Neither review mentioned the invariant. The spec was still in my notes vault; it entered the repository twelve hours after the fix merged. This PR didn't reference it, and reviewers in clean worktrees couldn't have opened it anyway. Review confirms a diff against whatever standard the PR puts in front of it. This PR didn't put the rendering requirement there.

### What the fix reached

**Before**

> "When provided" is the whole hinge. An email carries canonical HTML only if its producer supplies an `html` field, and in the entire application exactly one producer did: the `[Test]` send above. The settlement board's per-member "Email Invoice" action passes `{ to, subject, body, uid }` and no `html`, so **the invoice a household member actually receives still renders through the markdown bridge**—`docToPlainTextWithTokens` into `simpleMarkdownToHtml`, the function this whole arc exists to have displaced. PR #161 never touched that file; `git show --stat` lists eight, and `EmailInvoiceDialog.jsx` is not among them. Before #161 the two emails rendered identically, both sending `body` with no `html`; #161 gave the test email canonical HTML and left the invoice where it was, closing the gap on the surface where the bug was observed and opening a new one between the test email and the real invoice. That divergence stood from 2026-04-04 until 2026-09-30, and a later evidence audit, not the fix or anything I wrote at the time, found it.

**After**

> Only one producer in the app supplied `html`: that `[Test]` send. The settlement board's per-member "Email Invoice" action sent `{ to, subject, body, uid }` with no `html`. The invoice a household member received still went through `docToPlainTextWithTokens` and `simpleMarkdownToHtml`. PR #161 changed eight files; `git show --stat` doesn't include `EmailInvoiceDialog.jsx` among them.

> Before #161, test and invoice emails both sent `body` without `html` and rendered identically. The fix moved the test email onto canonical HTML and left the invoice on the bridge. That closed the gap where I'd reported the bug and opened a gap between the test email and the real invoice. It lasted from 2026-04-04 to 2026-09-30. A later evidence audit found it; the fix and my account at the time didn't.

### Conclusion

**Before**

> The bug was fixed about sixty-five minutes after it was named—on the surface where it was reported, and on the test email beside it until 2026-09-30, when [friends-and-family-billing#459](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/459) moved that email back onto the server-side markdown path. The brief's regression tests, aimed at keeping the whole class of defect closed rather than patching one instance, protected that shared path only while it lasted; what a recipient sees never shared it. The expensive part was the twenty-one hours before the name existed, in which six pull requests of locally reasonable, individually reviewed work shipped against a correctness standard nobody was checking. And the standard was not missing. It was in the design spec from the start, one sentence describing exactly the output model the bug violated. What it never was, until [issue #159](https://github.com/nathanjohnpayne/friends-and-family-billing/issues/159), was a requirement attached to any piece of work anyone reviewed. That is the process failure, and it is harder than "write it down": prose in a design document loses to a named function with checkable behavior, and no amount of louder symptom reporting closes the gap.

**After**

> The fix reached Preview and the test email, with the limits described above. The expensive part came before I filed the issue: six PRs of locally useful, reviewed work, while I kept asking for the same formatting bug to go away.

> I'd written the intended output model into the spec from the start. Writing it down wasn't enough. The spec lost to a function with a name and a test, and reporting the symptoms louder didn't change that. The requirement had to be attached to the work a reviewer could see.

### Rule 4

**Before**

> **Invariants outrank backward compatibility.** *(Personal practice, not adopted policy.)* When a spec carries both a new architecture and a compatibility requirement, it now states which wins: the new rendering path is canonical on the surfaces it actually reached, and legacy format support is a migration concern, not an architectural peer. The recipient invoice was never one of those surfaces, and since 2026-09-30 the test email is not either: the rule exists because that gap survived a spec that asked for parity. The cost: the compatibility work gets more expensive and more explicit up front—which is the point, because implicit is how the bridge got built.

**After**

> **Say which requirement wins.** This is also personal practice. When I ask for a new architecture and backward compatibility, I now state that the new path is canonical and list every surface it has to cover. Legacy support needs an explicit migration plan. That costs more work up front. The April fix shows why naming the surfaces matters: it never reached the recipient invoice, and the September change left only Preview on the canonical renderer.

## Structural changes

- Combined the issue-filing section and the second-agent brief. The issue supplies the requirement the brief then uses; their old anchors remain.
- Put the April fix and the September 30 mail-queue change in separate sections. The conclusion and personal-rule section no longer repeat the full later-state explanation. The dated timeline diagram remains unchanged.
- Replaced abstract narration with the specific behavior in these PRs. Restored the argument that the PRs were competent within their frames, the statement about what review checks, and the closing thesis about a prose requirement losing to a named, tested function. Kept the uncertainty about what caused convergence and what the April tests actually established.
- Updated the visible description, takeaways, and pullquotes with the body. All four pullquotes appear verbatim. Titles, SEO fields, date, and all other frontmatter fields are unchanged.
- Kept every distinct link destination and PR reference, all eight fenced blocks (including three diagrams), both tables, all four images, and all seven block quotations. These protected blocks are byte-for-byte unchanged. Old heading anchors are retained.

## Meaning review against the corrections

- R1: Six is the RCA-selected set, not all PRs in the session. #156 and #157 remain named and linked; #154 and #155 remain real fixes outside the parity attempts.
- R2: Nine feedback items, nineteen review submissions, and seven blocking rounds remain separate counts with their original scopes. Eighteen prompts and three stop hooks remain attributed to the non-public session log.
- R3–R4: The spec predated #155 by ten hours, stayed in the private vault during the arc, and entered the repository twelve hours after #161 merged, on April 5. Reviewers could not open it in their clean worktrees.
- R5: The second brief still has eight steps, its first three are reading, and it specifies six deliverables in total. The audit and regression tests are examples among those deliverables.
- R6–R14: #161 is historical. Preview and test-email HTML shared a renderer; the editor DOM, separate plain-text builder, and recipient invoice did not. The later audit discovered the April-to-September test/invoice gap. #459 closed it by returning the test email to server-rendered markdown. Preview is still separate, guarded by a semantic parity test.
- R15: The body makes no isolated causal claim about the brief or the model. Framing is the variable the author controlled, while tooling, model, context, and prior-PR visibility changed too.
- R28 and R38: The article retains both Prompt 6 parentheticals and marks the omitted fifth brief constraint with `…`. The brief opening matches the original 2026-04-04T17:19:09.029Z local record (JSONL line 6, `payload.content[0].text`) in wording and punctuation, joining its two paragraphs; the comma after "failed-fix investigation" is original. The ledger's rows, detailed entries, and quotation-fidelity summary now record that corrected state. R42: The two hypothetical model/prompt conclusions retain their corrected wording.
- R44: The closing phrase "a function with a name and a test" is supported by pre-existing `buildInvoiceBody` coverage in FFB `8ca2f86:tests/react/lib/invoice.test.js` and `8ca2f86:tests/billing.test.js`. Both files also contain it at `cabcefe`. The #144 merge parentage identifies `8ca2f86` as the prior `main` commit and `cabcefe` as the PR head; coverage existence does not prove the parity invariant was tested.
- All chronology-table times and durations remain attached to their original events. Semantic parity remains distinct from pixel equality. The adopted policies and personal practices retain their costs and enforcement status.

## Owner feedback applied

Restored the ending's thesis and its payoff to prompts 7 and 9, the distinction between competent PRs and the wrong frame, the review-standard sentence, and the dry line about when the bug existed. Rule 4 now requires naming every surface the canonical path must cover. The deck has three sentences; the opening owns the request for money; the historical renderer sentence names Preview and the test email; and the C40 pointer is a checked GitHub permalink.

Two suggested restorations are deliberately precise: “a day before I filed the issue” preserves the earlier symptom reports, and “This PR didn't put the rendering requirement there” preserves the scoped checks its reviewers did perform. The pre-merge `main` source (`8ca2f86:tests/react/lib/invoice.test.js` and `8ca2f86:tests/billing.test.js`) already includes tests of `buildInvoiceBody`; the same coverage is present at PR head `cabcefe`. Ledger row R44 records the source and distinguishes those commits.

Removed repeated durations from the issue introduction and closing. The body still gives the thirty-six-minute interval twice, once in the opening and once when #158 closes; the pullquote repeats the opening verbatim. Sixty-five minutes and twenty-one hours each appear once in the body. The source tables retain all exact times, and the nine/seven/nineteen review counts and other measured quantities are unchanged.

## Occurrence checker

`scripts/verify-brevity.py` reports seven failing token classes for the complete rewrite. This is an intentional reorganization, not a claim that a strict occurrence-preserving brevity pass succeeded. The checker is unchanged. Its code, Mermaid, table, and pinned-frontmatter checks pass.

| Token class | Removed occurrences | Added occurrences | Reason |
|---|---|---|---|
| URLs | https://github.com/nathanjohnpayne/friends-and-family-billing/issues/159 × 2; https://github.com/nathanjohnpayne/friends-and-family-billing/pull/459 × 1 | https://github.com/nathanjohnpayne/nathanpaynedotcom/blob/86b5af34ee008aa796987a3487d3e58a5339dd2a/plans/759/project-pages-ledger.md#c40decision-record-3-the-invoice-a-household-member-receives-does-not-use-the-canonical-renderer × 1 | Two repeated issue #159 links and the closing #459 link were removed. Added the C40 evidence permalink. Every original distinct destination remains. |
| link destinations | https://github.com/nathanjohnpayne/friends-and-family-billing/issues/159 × 2; https://github.com/nathanjohnpayne/friends-and-family-billing/pull/459 × 1 | https://github.com/nathanjohnpayne/nathanpaynedotcom/blob/86b5af34ee008aa796987a3487d3e58a5339dd2a/plans/759/project-pages-ledger.md#c40decision-record-3-the-invoice-a-household-member-receives-does-not-use-the-canonical-renderer × 1 | Same repeated links and added permalink as the URL check. |
| issue/PR refs | #159 × 4; #144 × 1; #154 × 1; #155 × 2; #161 × 2; #459 × 1 | None | Repeated summaries were tightened; the chronology, roles, review counts, and fix boundary still name each relevant item. |
| standalone months | None | April × 3; September × 1 | April/September section labels and references make the then/now boundary explicit. |
| timestamps | 2026-09-30 × 2 | September 30 × 1 | Removed two repeated ISO dates from the personal-rule section and conclusion; added September 30 in a heading. The exact 2026-09-30 date remains in the dated section and diagrams. |
| numerals | 2026 × 2; 159 × 6; 144 × 1; 154 × 1; 155 × 2; 161 × 2; 09 × 2; 30 × 1; 459 × 2 | 11 × 1; 3 × 1; 86 × 1 | Fewer repeated PR/date tokens; prompt 11 is also in its synchronized pullquote. The evidence URL adds numeral tokens from its commit SHA and heading. No numeric value or event association changed. |
| code spans | `plans/759/project-pages-ledger.md` × 1 | `renderInvoiceTemplate` × 1 | The bare ledger path became a linked citation; an additional span names the historical shared renderer. |

The spelled-out-number advisory was reviewed manually: the six PR roles, three parity attempts, two other fixes, seven blocking rounds, nine feedback items, nineteen review submissions, eighteen prompts, three stop hooks, eight task steps, six deliverables, and all durations remain. Removed occurrences repeat those facts or use number words as ordinary prose. The generic claim about anyone using an agent for “more than ten minutes” was removed; it was a rhetorical generalization, not a measured interval in this case.

Prose word count: 3,358 → 2,645 (-21.2%). Whole file: 4,744 → 4,003.

## PR contents

Include this comparison document with the article and the R44 facts-ledger addition in the same PR. It records the before/after passages, the meaning review, and why the unchanged occurrence checker flags intentional structural edits. Keeping it in Git makes that review evidence available to reviewers and future revisions.

## Owner judgment

No factual question is pending. The April/September split remains, and the ending now states the thesis explicitly. The SEO description remains pinned and unchanged; the visible deck now describes the specific sequence and the partial fix.

## Validation

Astro build passed. After the owner feedback, all 58 tests in five existing suites passed: blog pages, takeaways, content schema, figure numbering, and Mermaid diagrams. Scoped Vale lint reports no errors. All 16 original heading anchors are present in the built page, and its four screenshot embeds remain. A separate block comparison confirms that all eight fences, both tables, four image lines, and seven block quotations are unchanged. All four pullquotes appear verbatim in the body; source apostrophes are straight, and the narration contains no collective pronouns. The meaning review above is separate from these mechanical checks.
