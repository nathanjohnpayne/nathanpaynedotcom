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

**Diagrams drifting from the prose they illustrate.** Twice a narrowed claim left the adjacent Mermaid diagram asserting the retracted version --- including in its `description=` attribute, which is the accessible text screen-reader users receive. When a claim changes, grep diagram titles, descriptions, captions, and node labels too.

**Semantically wrong citations.** A project page cited PR #178 for a fix delivered by #161. The number resolved, the repository was right, the link worked --- it was simply about something else. No link checker or reference cache catches this. Read the referenced PR and confirm it did the thing the sentence claims.

**A retraction's replacement can invert the claim.** The classes above catch a claim that is too wide, unsupported by the record, left standing in a sibling surface, or pointing at the wrong artifact --- all of them defects in the claim itself. This one catches a defect in the *correction*: a replacement that overshoots the sentence it replaces and lands wrong in the other direction. A page said a parity fix left its checked and unchecked surfaces in sync; the correction replaced that with the unchecked surface having "drifted the day the fix landed" --- on a page that elsewhere establishes the fix never touched that surface at all. The two surfaces did diverge, so a reader can rescue the sentence by hearing "drifted" as *became inconsistent*. But it attributes the change to the surface that did not move: the checked half was repointed at a new renderer and the unchecked half stayed byte-identical. The divergence is real and the actor is wrong. Overstatement and inversion are different errors, and the second is the harder one to catch, because the replacement now carries a caveat and reads as the careful version. Re-read a replacement against the evidence that forced the retraction, not against the sentence it replaces.

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

**A cleared gate can still show red.** After every finding is replied to and resolved, `Codex P1 unresolved threads` may keep failing because the rollup still counts a superseded run from before the dispositions landed. Run `scripts/codex-p1-gate.sh <PR> <owner/repo>` locally first: if it exits 0 on the same head the check ran against, the check is stale rather than wrong. Clearing it depends on which run published it, and `--failed` is not always right. An event-driven run whose own job failed takes `gh run rerun --failed <run-id>`. **The scheduled sweep needs the whole run** --- `gh run rerun <run-id>` with no flag --- because it publishes its verdict as a `check_run` on the PR head while its own Actions job continues and succeeds, so `--failed`, which reruns only failed jobs, finds nothing eligible and produces no replacement check. Either way, target the run that published the red check; re-running the newest run does nothing, because the newest run already passed.

**CodeRabbit invalidates your reply by acknowledging your fix.** It edits its own root comment to append "Addressed in commit `<sha>`" several minutes after you push. That edit pushes the accounting floor above your reply, so a disposition that was already posted reads as stale. Re-reply above the new floor, then resolve. Expect this on ordinary acknowledgement edits --- it is the acknowledgement itself that causes it.

**Not every edit invalidates the reply, and the exception is already handled.** When CodeRabbit appends its terminal `✅ Confirmed as addressed by @<agent>` suffix, `scripts/review-feedback-accounting.sh` detects it, resets the evidence floor back to the finding's `created_at`, and preserves the reply it confirms (`:413`, with four cases pinned in `tests/test_review_feedback_accounting.sh`). Re-replying there adds a duplicate for no gain.

**So do not time it --- ask.** Do not re-reply on a fixed poll count: on one thread the edit landed four seconds after a disposition and again three minutes after that, so any window short enough to be practical loses the race, and the ten-poll figure an earlier draft of this section recommended covers 150 seconds against a 180-second edit. Re-run `scripts/review-feedback-accounting.sh <PR> <owner/repo>` instead, and re-reply only while it still reports that finding as missing. The gate you are trying to satisfy is the only thing that knows whether you have satisfied it.

## Length

State compression targets against **connective prose**, or not as a percentage at all. Whole-file targets misfire because evidence structures are incompressible by construction: on one post roughly 22% of the file was frontmatter, tables, diagrams, and code the acceptance criteria explicitly required, so a 20--30% whole-file target demanded a 26--39% cut to prose alone. Where an audit's own criteria mandate new evidence, the post gets longer; record that plainly rather than reporting a favourable number.

## Word counts

Recount immediately before merge. Review rounds add words about as often as they remove them, and the figure went stale three times on one PR before ending with the wrong sign.

## Voice check and complete meaning review

For a human or agent-independent walkthrough, use [Blog drafting and voice review](../blog-writing-workflow.md). Codex is not required for the checker or supplied-reference route.

For future drafting and editorial review, use Codex's **Write Like Me** workflow. Use sufficient supplied references directly; retrieve relevant writing through that capability when needed and available. If the feature is unavailable, explicitly use the supplied references and direct feedback as the fallback, and do not claim the feature was used. Label **user-authored references** separately from **owner-approved model revisions**. The final October 6 batch is the latter, refined through direct owner feedback; it is not a corpus of newly user-authored writing. Do not commit retrieved private writing, a personal style profile or a retrieval cache.

Codex applies the writing style. The local checker reports the rules it can check. The owner judges voice and meaning. The checker has no model/connector calls, feature-access requirement, voice score, compression target or automatic rewriting. Its output is a manual review aid, not approval or semantic proof. Rollout is manual/advisory; do not add this command as a mandatory CI gate.

### Commands and exit contract

Install the existing Node dependencies with `npm ci` and use the repository-pinned local Vale (`.vale-version`). The checker never installs tools itself. Run from any directory using an absolute script/input path if needed; nested blog paths work.

```bash
# New post; readable findings. A full meaning review remains required even on exit 0.
node scripts/check-blog-voice.mjs src/content/blog/nested/new-post.md

# Explicit before-file; complete before/after articles, metadata and changed passages.
node scripts/check-blog-voice.mjs src/content/blog/post.md --before /tmp/post-before.md --packet

# Local Git baseline: resolve a ref once and record the immutable commit and source hash.
node scripts/check-blog-voice.mjs src/content/blog/post.md --base HEAD --json

# A draft outside the checkout, compared with a nested repository source path.
node scripts/check-blog-voice.mjs /tmp/draft.md --base COMMIT --base-path src/content/blog/nested/post.md --packet

# Declare an unfamiliar proper name; supply the approval summary without inferring a profile.
node scripts/check-blog-voice.mjs /tmp/draft.md --proper-noun 'Ada Lovelace' --review-context /tmp/review-context.json --json
```

`--json` always includes the complete packet. `--packet` prints it as readable text. Without either, readable findings still state the manual-review requirement. `--before` and `--base` are mutually exclusive. An explicit file baseline has a SHA-256 and `commit: null`: no Git provenance is claimed for an arbitrary file. A Git baseline records the requested ref, resolved SHA, repository path and source hash. The command only reads local Git; it never fetches or updates it. Run `--help` for the stable argument list.

| Exit | Meaning |
| --- | --- |
| 0 | Mechanical rules passed; warnings remain advisory; complete manual meaning review still required |
| 1 | Explicit mechanical violations |
| 2 | Missing/invalid input, YAML, argument, context JSON or local baseline |
| 3 | Execution/dependency failure, including missing or unpinned Vale; no partial-success claim |

Findings have a stable `rule`, `severity`, `file`, `location`, `excerpt`, `reason` and `surface`. Locations are one-based lines and UTF-16 columns, with zero-based offsets and an exclusive end. They identify the **complete original source range** (paragraph, heading, table cell, image or YAML scalar), not a fabricated exact character in a decoded YAML escape or Markdown entity. For multiline metadata the entire scalar is retained, including its header and escapes.

### Settled mechanical rules

- Body headings use sentence case, including untouched headings. The first word of a colon-delimited subtitle may begin with a capital, as in the approved `Appendix: The evidence`. Proper names in `styles/Voice/SentenceCase.yml`, acronyms, `I`, months, weekdays, code spans and explicit fragment anchors are preserved. Use repeatable `--proper-noun NAME` declarations for other proper names. This is a capitalization exception, not a learned personal style profile. Pinned article titles and SEO fields are not recased.
- Use straight source apostrophes and the established American-English spellings in the conservative `styles/Voice/AmericanEnglish.yml` substitution list. It is not a general dictionary or a complete grammar check.
- Narrator `we/us/our/ours` is a mechanical violation. `US` as an acronym is preserved. Attributed quotations, prompts and code keep their source language. Straight and curly single/double quotations may contain soft line breaks and internal apostrophes. Attribution cues may precede the quote or directly follow it; HTML citations also apply to nested quotations. These remain heuristics. Unclear inline quotations and blockquotes generate `review.quotation-attribution` when relevant; the editor must decide whether the voice is attributed, hypothetical or the narrator. The checker cannot infer authorship from quotation marks alone.
- Pullquotes must occur verbatim in one body passage after YAML decoding and Markdown formatting/whitespace equivalence. Emphasis, entities, links and code typography may be equivalent; case, punctuation and wording must match. A string present only in code, a diagram or an image caption does not satisfy the check. The intentional body/pullquote duplicate is excluded from padding warnings.
- Use consistent ATX/setext/HTML heading conventions and consistent authored double-quotation treatment across body and metadata. Source quotations retain their treatment. The ordinary prose linter suppresses only `CMOS.Titles` advice for `src/content/blog/**/*.md` body headings; unrelated CMOS rules, table-header capitalization and heading advice on other paths remain.

The CLI captures source structure with Astro's existing Markdown processor and parsed YAML nodes. It uses Vale's rule engine on an authored-prose projection, and never writes its normalized text back to the article. Tables are preserved for fidelity review while authored cells are still checked. Mermaid content, code, source quotations and fragment markup remain available in the complete packet. Raw HTML in blocks, inline surfaces and metadata gets a review prompt: the maintained HTML parser reads prose, but custom hiding, component semantics and broken markup require rendered verification. Surfaces whose AST contains no HTML bypass DOM construction. YAML aliases need manual definition/use review.

### Advisory warnings and the packet

`review.*` warnings surface repeated stock openings, exact repeated explanations, repeated durations, vague signposts, abstract narration, hedging and formulaic contrasts. These are judgment prompts, not quotas. Preserve necessary qualifications, intentional repetition, jokes and direct product judgments. The approved “The cost was never the line count. It was the trust burden” may trigger a contrast warning and still passes. A phrase match is not a finding that a line is bad.

For revisions, the packet includes complete lossless before/after sources, their hashes, a local diff, parsed metadata side by side, protected source material and an explicit meaning checklist. The metadata inventory includes all frontmatter scalars and aliases, including publication dates, configuration values and diagram content; only the authored-prose subset receives mechanical prose checks. Inline HTML quotations retain their complete element ranges and decoded Markdown text. Potential negation/modal changes count quotation prose while excluding code, including code nested in blockquotes. No changed passage or metadata delta replaces reading both complete articles. These token warnings cannot establish meaning; identical counts can conceal changed actors, negation scope or swapped causal claims. A changed passage is always a review item even when mechanics pass.

Check the thesis and title payoff; accountability and human/agent division of labor; negations and decision rights; planned versus completed work; actors, chronology and causal strength; uncertainty and validation boundaries; authentic author lines; and linked ledgers, diagrams, captions, comparisons and cross-post consistency. The October batch's accountability shift, second-rulebook inversion, nonexistent-post implication, drift-causing deck and dropped thesis are fixtures that require this review, not cases of semantic correctness established by tests.

Supply `--review-context` with a JSON object containing `writingStylePass`, `structuralChoices`, `qualifications`, `validation`, `occurrenceExceptions`, `referenceProvenance` and `linkedRecords`. Each field is printed unchanged; omitted fields remain explicitly “Not supplied.” For example:

```json
{
  "writingStylePass": {"workflow": "Write Like Me skill", "route": "supplied references", "retrievalUsed": false},
  "structuralChoices": ["Moved later updates to one dated section."],
  "qualifications": ["Two events do not isolate causation."],
  "validation": ["Read complete sources and the ledger; mechanics are not semantic proof."],
  "occurrenceExceptions": [{"class": "numerals", "reason": "Removed a duplicate mention; the original count remains with its subject."}],
  "referenceProvenance": [{"kind": "owner-approved-model-revision", "commit": "immutable-source-sha", "path": "src/content/blog/post.md"}],
  "linkedRecords": ["plans/path/to/ledger.md"]
}
```

Record keep/fix plus a reason for every warning in the approval summary; optional `warningDispositions` context entries are printed unchanged and never suppress findings or attest approval. The packet keeps those questions open; it cannot attest that the reviewer read it or that the owner approved it. It supports the composing/reviewing agent's Write Like Me pass by keeping references, complete sources and qualifications together; direct owner approval remains separate.

### Limits and validation

Unknown proper names can produce capitalization false positives: declare them explicitly and review the declaration. Acronyms can conceal all-capitals titles. Only listed spelling variants and lexical warning patterns are covered. Paraphrased repetition, swapped actors, equal negation/modal token counts, chronology and implied causation can pass. Quotation attribution is heuristic, and apparently explicit attribution can still be wrong. Check those manually, including HTML and aliases, rather than treating absence of warnings as evidence of voice fidelity.

`tests/blog-voice.test.js` tests parser boundaries, positions, packet completeness, failures and false positives, and offline execution with only Vale/read-only Git and temporary projections. Public source-pinned excerpts in `tests/fixtures/blog-voice/batch-excerpts.json` distinguish approved revisions from compact historical failure mutations. The fixtures test reviewability, not semantic proof. Keep `scripts/verify-brevity.py` and its existing protected-token contract intact; intentional structural/occurrence exceptions belong in the packet with reasons, not in weakened checkers.

### How the agent invokes writing-style support

This is an **agent workflow instruction**, not a call made by the CLI. When the installed Write Like Me skill is available, the composing/reviewing agent reads it and follows its workflow. Sufficient supplied examples can be used directly. If more writing evidence is needed and the app tools are available, the agent uses `write_like_me.search`, then `write_like_me.retrieve` with the returned retrieval IDs, and reads the references before composing. Tool names may have runtime prefixes. The retrieval tools require the host's authorized connector access; the skill text alone does not confer it.

Record the actual route in `writingStylePass`: installed skill with supplied references, skill with retrieved references, or unavailable-feature supplied-reference fallback. Include source provenance and whether retrieval was used; do not claim a retrieved style match from titles or links alone. The packet preserves that declaration but cannot verify it. The locally inspectable package supplies instructions and tool contracts, not the retrieval backend implementation or an exportable trained voice model. Another agent can follow this repository's editorial workflow and approved public examples, and use the same independent CLI; equivalent private retrieval still requires its own authorized tools. No private writing or inferred profile is exported by this task.

### Demonstrated behavior on the approved batch

The initial manual demonstration uses immutable final batch source `68827d183093fdc9500c0263b1078751067ae2fd`; it performs no drafting or retrieval. Re-run these commands against that source to reproduce the same rule findings (absolute file paths in output depend on the checkout):

```bash
# Synthetic new-post input: mechanical pass, no warnings.
node scripts/check-blog-voice.mjs tests/fixtures/blog-voice/new-post.md --json

# Actual existing-post revision: mechanical pass, with nine advisory review items.
node scripts/check-blog-voice.mjs src/content/blog/autofix-was-the-whole-cost.md --base 1d1d39ddb43c837341ecc1862d7d2818eb08ea4c --json

# Owner-approved final sample: mechanical pass, five advisory review items.
node scripts/check-blog-voice.mjs src/content/blog/autofix-was-the-whole-cost.md --packet
```

The Autofix sample's five warnings are the authentic trust-burden contrast, a quoted qualification using “perhaps,” and three ambiguous/hypothetical narrator quotations. The revision adds changed-passages, metadata-change, negation/modal-change and protected-material-change prompts. These demonstrate why warnings are advisory: approved lines can match stock-pattern rules. They do not certify meaning or owner approval. All ten final merged posts passed mechanical checks in the initial corpus sweep; future changes must be checked anew.
