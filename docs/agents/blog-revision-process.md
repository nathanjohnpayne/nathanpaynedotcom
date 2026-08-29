# Blog Revision Process

How to revise a published blog post when its facts are under audit. Derived from epic #759, which audited all seven long-form posts; the worked examples are the facts ledgers in `plans/759/`.

Applies to substantive revisions of any post in the blog collection, which `src/content.config.ts` loads with `pattern: '**/*.md'`—so `src/content/blog/**/*.md`, nested paths included, not only direct children. A typo fix does not need any of this.

## Two passes, in this order

**Pass 1 --- prose and facts.** One pass for prose quality, style, and factual accuracy, worked against a facts ledger.

**Pass 2 --- brevity.** A separate pass that only tightens: redundancy, filler, hedging, anything that does not earn its place. No factual work happens here.

**Then** the normal PR process in `docs/agents/code-review-requirements.md`.

### Why they are separate

Run together, accuracy wins every time and the post grows. Measured across seven review rounds on one post: -3.8%, -2.1%, -1.2%, -0.8%, then **+2.2%**. The cause is structural, not carelessness --- every corrected claim is a narrower claim, and narrowing costs words. "Nobody had a definition of correctness" is six words; the true version needs a sentence separating a definition that existed from one attached to the work.

Run separately, a brevity pass took 6.1% off that same post with **zero** factual change.

## The facts ledger

Pass 1 works against a ledger, not against memory. For every number, date, duration, count, causal ordering, and citation in the post: the claim quoted verbatim, a verdict of **SUPPORTED** / **WRONG** / **UNPROVABLE**, the corrected value or a defensible weaker form, and a source precise enough for someone else to re-check --- a command, a file path, an API field, a commit SHA.

Three rules that cost the most to learn:

**Prefer a timestamp you can pull over one quoted in the prose.** The prose is the thing under audit; it is never its own source.

**The ledger is itself under audit.** Adversarial verification found 21 defects in one ledger, 13 in another, 12 in a third --- several inside *corrected values*, and twice the ledger's own headline verdict was wrong. Checking the article against the ledger is not sufficient.

**Corrections go inline, at every site.** An appendix announcing that it supersedes contradictory text does not correct the file: a drafting pass reads the earlier row, not the appendix. This defect was documented in one ledger and then recurred in that same file.

## Verifying a brevity pass

Run `scripts/verify-brevity.py BEFORE AFTER`. It fails on any change to URLs, `#NNN` references, timestamps, numerals or code spans (compared by occurrence count, not distinct value), to code, Mermaid or table blocks, or to the frontmatter fields tests pin as exact strings.

**It does not catch swapped values.** The comparisons are global multisets, so an edit that exchanges two protected values between claims passes with every count unchanged: a date moved from one PR to another, two figures traded between rows. Catching that needs token-to-claim association, which this tool deliberately does not attempt. Read swaps yourself when a passage pairs values with subjects.

It also reports numbers written as words as an **advisory note**. That cannot gate --- no regex separates "six PRs" from "one of the reasons" --- but it is what makes a dropped count visible at all. One pass silently dropped "across three platforms" and "the seventeen" inside phrases it cut. A numeral written as a word is invisible to a prose-focused edit and is still evidence.

## Defect classes worth grepping for

**A claim that survives removal has an upstream source.** One retracted claim survived seven separate removals across six review rounds, each time in vocabulary sharing almost no substring with the last, because the ledger's own prose still asserted it. Substring search cannot find these. Enumerate over the claim's whole vocabulary, across the post *and* the ledger *and* the plan file.

**Quantifier scope creep.** A true claim stated one quantifier too wide --- *every* prompt, *every* piece of HTML, *every* time. Three of five findings in one round were exactly this. Flag any universal that cannot be verified exhaustively.

**Mental states asserted where only behaviour is recorded.** "Nobody saw the invariant" claims something about two reviewers' minds; the record shows two approvals and no inline comments. State what the record shows.

**Diagrams drifting from the prose they illustrate.** Twice a narrowed claim left the adjacent Mermaid diagram asserting the retracted version --- including in its `description=` attribute, which is the accessible text screen-reader users receive. When a claim changes, grep diagram titles, descriptions, and node labels too.

**Semantically wrong citations.** A project page cited PR #178 for a fix delivered by #161. The number resolved, the repository was right, the link worked --- it was simply about something else. No link checker or reference cache catches this. Read the referenced PR and confirm it did the thing the sentence claims.

**A retraction's replacement can invert the claim.** Every class above is about *scope* --- a claim stated too wide, or corrected in one place and left standing in another. This one is about *direction*. A page said a parity fix left its checked and unchecked surfaces in sync; the correction replaced that with the unchecked surface having "drifted the day the fix landed" --- on a page that elsewhere establishes the fix never touched that surface at all. Nothing drifted. The checked half moved to the new renderer and the unchecked half stayed exactly where it was. Overstatement and inversion are different errors, and the second is the harder one to catch, because the replacement now carries a caveat and reads as the careful version. Re-read a replacement against the evidence that forced the retraction, not against the sentence it replaces.

## A correction is not done when the reported line is fixed

This is the dominant defect in audited revisions. Across three pull requests and eleven review rounds it accounted for more findings than every other cause combined, and the reviewers were mostly finding the residue of earlier fixes rather than defects in the original work.

A claim lives in more places than the one a reviewer cites. Observed instances, all real:

- A duration corrected in the body while the frontmatter `description` kept the old one.
- A verdict downgraded from WRONG to UNPROVABLE in the heading while its closing sentence still asserted the contradiction.
- A count corrected in one section while a summary bucket elsewhere kept the old figure, so the buckets totalled 56 of 57.
- A claim retracted in an appendix while the drafting instruction that a later pass actually acts on kept telling the author to write it.
- `--paginate` added to a reported command while the identical defect sat in the command on the next line.
- A diagram node label left asserting a claim the prose beside it had just narrowed.

**The rule.** When a claim changes, enumerate every surface that carries it before moving on: body prose, all frontmatter fields, `keyTakeaways`, pull quotes, sidebar content, diagram titles, diagram `description=` attributes, diagram node labels, summary tables, worked arithmetic, and any instruction addressed to a future pass. Grep for the *claim* in any wording, not the sentence you edited.

**Check the fix itself.** Two defects in this series were introduced *by* corrections: an unclosed `~~` that rendered known-false text as ordinary prose directly beneath its own retraction, and a pagination fix that left brace expansion in place so the command still could not run. After editing, re-run whatever the edit touched: the linter, the command, the delimiter balance across the file.

## Dispositioning review feedback

Fixing a finding is not dispositioning it. Both reviewers require a substantive reply on the thread **and** the thread resolved --- `scripts/review-feedback-accounting.sh` treats those as separate requirements, and an unaccounted finding blocks the next Codex review request entirely.

Two asymmetries to know:

**Codex threads do not resolve themselves.** Reply, then run `scripts/resolve-pr-threads.sh <PR> --repo <owner/repo> --resolve-actioned`.

**A cleared gate can still show red.** After every finding is replied to and resolved, `Codex P1 unresolved threads` may keep failing because the rollup still counts a superseded run from before the dispositions landed. Run `scripts/codex-p1-gate.sh <PR> <owner/repo>` locally first: if it exits 0 on the same head the check ran against, the check is stale rather than wrong, and `gh run rerun --failed` against that specific run id clears it. Re-running the newest run does not, because the newest run already passed.

**CodeRabbit invalidates your reply by acknowledging your fix.** It edits its own root comment to append "Addressed in commit `<sha>`" several minutes after you push. That edit pushes the accounting floor above your reply, so a disposition that was already posted reads as stale. Re-reply above the new floor, then resolve. Expect this on every CodeRabbit finding you actually fixed --- it is the acknowledgement itself that causes it.

Poll the comment's `updated_at` until it holds still before re-replying, and give it a wide window: on one thread the edit landed four seconds after a disposition, and again three minutes after that, so six stable polls at fifteen seconds was not enough and ten was. Replying into a moving floor just adds a second stale reply.

## Length

State compression targets against **connective prose**, or not as a percentage at all. Whole-file targets misfire because evidence structures are incompressible by construction: on one post roughly 22% of the file was frontmatter, tables, diagrams, and code the acceptance criteria explicitly required, so a 20--30% whole-file target demanded a 26--39% cut to prose alone. Where an audit's own criteria mandate new evidence, the post gets longer; record that plainly rather than reporting a favourable number.

## Word counts

Recount immediately before merge. Review rounds add words about as often as they remove them, and the figure went stale three times on one PR before ending with the wrong sign.
