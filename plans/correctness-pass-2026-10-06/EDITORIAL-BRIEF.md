# Editorial pass after the correctness pass: brief

The owner reviewed #1124 and kept it: "It makes the site substantially more credible and often strengthens your product story." The remaining problem is emphasis. In the owner's words, too much space goes to explaining how earlier accounts were corrected rather than to the decisions made, and the pages should read like a portfolio of product judgment, not an audit trail. The three overclaims the owner named (the Genesis reliability conclusion, Two Blues on reproductions as evidence, Matchline's summary versus its export stub) are already fixed on this branch; do not revisit them.

## What to do, in this order

1. **One boundary between then and now.** Each historical post keeps its original story in one piece and takes its later updates in one clearly marked place (a short dated paragraph, or an existing "since then" section), rather than interleaving corrections and later implementation detail through the narrative. Where the post currently says "the first version of this post said X; the record shows Y" more than once, keep one such acknowledgement, in the place where it does the most work, and let the rest simply state the corrected fact.
2. **Cut repeated explanations.** The owner's examples: the HTML mock-ups post explains the design replacement four times; Six PRs repeatedly reconstructs which invoice path the fix reached; Genesis mixes its original story with several later implementation updates. Say each thing once, where it matters, and cross-reference by a phrase rather than restating.
3. **Audience.** Commands, review states, dependency lists and CI inventories are support, not the accomplishment. Keep the ones that carry a decision or a consequence; move or cut the ones that only prove diligence. The reader is evaluating product judgment.
4. **Opening and ending.** Make them about the problem, the decision, and what changed. The ending should not be a list of what the record cannot prove.

## What not to do

- Do not change any fact, number, date, URL, `#NNN` reference, quotation, code block, Mermaid block or table cell. If a correction from the pass has to move, move it intact.
- Do not remove trade-offs, limitations or evidence. "Being credible doesn't require being relentlessly negative about your own work," but it does require keeping the limits that are true.
- Do not touch frontmatter except `keyTakeaways` and `pullquotes` when a body sentence they quote has changed; keep every other field byte-identical.
- Keep the voice. "Don't be overly pedantic; a little puffery is fine." Keep the flourishes and first-person asides that carry the author's judgment.
- Use sentence case for every body heading, including untouched ones; preserve existing fragment anchors.
- Em dashes closed up; prose soft-wrapped, one physical line per paragraph.

## Verification

- `python3 scripts/verify-brevity.py BEFORE AFTER` with BEFORE taken from `origin/main` must PASS on the protected classes (URLs, references, timestamps, numerals, code spans, code/Mermaid/table blocks, pinned fields); read its advisory list of dropped number-words and confirm each drop was a deliberate cut of a repeated sentence, not a lost fact.
- Vale at error level clean.
- Report: body word count before and after, the one place the then/now boundary now sits, the repeated explanations removed (section and count), and anything you moved rather than cut.

## Future drafting and voice review

Future drafting and editorial review of these posts follow the [Voice check and complete meaning review](../../docs/agents/blog-revision-process.md#voice-check-and-complete-meaning-review) section of the blog revision process, which holds the Write Like Me routing, the checker commands and exit contract, the mechanical rules and the manual meaning-review checklist. The human/agent-independent procedure, required inputs, reference routes and reusable agent instruction are in [Blog drafting and voice review](../../docs/blog-writing-workflow.md). Neither the checker nor a passing brevity run replaces the complete manual pass or the owner's direct approval.
