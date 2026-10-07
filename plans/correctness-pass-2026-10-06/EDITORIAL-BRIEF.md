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

Use Codex's **Write Like Me** workflow for composition and editorial review. Use sufficient owner-supplied references directly; retrieve relevant writing through the capability when needed and available. If unavailable, state that supplied references and direct feedback are the fallback. Do not claim the feature was used in that case. Distinguish user-authored reference writing from the October batch's owner-approved model revisions. Do not save retrieved private writing, a personal profile or a retrieval cache in this repository.

Codex applies the writing style; the checker reports mechanical rules; the owner judges voice and meaning. Use natural contractions, ordinary verbs, concrete examples and direct product judgment, with varied sentence length. Preserve authentic jokes and first-person lines. Warnings about stock phrasing, repetition, abstract narration, hedging or contrasts are prompts for judgment, not quotas; the approved trust-burden contrast is allowed.

```bash
node scripts/check-blog-voice.mjs src/content/blog/nested/post.md --before /tmp/original.md --packet
node scripts/check-blog-voice.mjs src/content/blog/post.md --base COMMIT --review-context /tmp/review-context.json --json
```

The full command/exit contract and rule exceptions are in [Blog revision process](../../docs/agents/blog-revision-process.md#voice-check-and-complete-meaning-review). Only mechanical violations fail (exit 1); invalid inputs exit 2, execution failures exit 3, and editorial warnings remain advisory on exit 0. Rollout is manual, with no mandatory CI gate, compression target, voice score or automatic rewriting.

Read the **complete before and after articles**, not only their diffs or openings. Check visible metadata together with changed passages, code, tables, diagrams and captions. Record structural choices, qualifications, validation, reference provenance and intentional brevity-checker occurrence exceptions in `--review-context`; disposition every warning with keep/fix and a reason. Preserve attributed source quotations and prompts; uncertain attribution is a review item. Narrator we/us/our, straight source apostrophes, American-English spelling, sentence-case body headings (including untouched ones), consistent heading/quotation treatment and exact pullquotes follow the settled process rules. Proper nouns, acronyms, code and existing fragment anchors remain intact; pinned titles and SEO fields are not recased.

The manual pass checks thesis and title payoff; accountability and division of labor; negative conditions; proposed versus completed work; actors, chronology and causation; uncertainty, validation and authentic author lines; and linked ledger/cross-post consistency. Compare every changed claim at every site, including metadata and diagram descriptions. A passing brevity checker preserves selected occurrences, and a passing voice checker reports mechanical rules. Neither proves meaning or voice. This packet supports the agent's Write Like Me pass and the owner's direct approval; it does not replace either.

Invocation belongs to the composing/reviewing agent: read the installed skill, use sufficient supplied references directly, or search/retrieve additional references through the Write Like Me app when available. Record the actual route in the packet's `writingStylePass` field; the CLI neither invokes those tools nor verifies the claim. Other agents can use this brief, the approved public posts and the independent checker with supplied references, while authenticated retrieval requires their own tool access.

The complete human/agent-independent procedure, required inputs, reference routes, commands, review context and reusable agent instruction are in [Blog drafting and voice review](../../docs/blog-writing-workflow.md). Codex is not required for the supplied-reference route or the local checker; identical generated prose is not guaranteed.
