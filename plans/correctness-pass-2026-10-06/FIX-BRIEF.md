# Correctness pass, 2026-10-06: fix brief for every page auditor

You audited one page and wrote its ledger. Now apply the corrections to that page, in this checkout, on the branch already checked out (`claude/correctness-pass-2026-10-06`). Edit only your page's source file, plus any test assertion that pins your page's exact wording and would otherwise fail. Touch nothing else: no other page, no shared component, no plugin, no commit, no build (the coordinator builds once at the end).

## What to change

- Every **WRONG** row: correct it to the value the ledger established, at every surface the ledger lists (frontmatter, prose, diagram text, captions, table cells).
- Every **STALE** row: either date the claim to when it was true or update it to today's value with its own as-of date. Prefer the form that keeps the page's argument intact; when the drift is itself interesting, say what changed and when, in one clause.
- **UNPROVABLE** rows: apply the ledger's weaker form only where the current wording asserts more than the record supports (an unsourced number, "every", "never", "the only", a motive or a quotation nobody can produce). Leave rows the page already labels as the author's own testimony or hypothesis.
- Cross-page rows that live on another page: leave them; another auditor owns that page.

## How to change it

- Keep the page's voice and length discipline. A corrected claim is a narrower claim; narrowing costs words, so cut a hedge or a repetition nearby rather than letting the page grow. Do not add new claims you did not verify in your audit.
- Em dashes are closed up, no spaces. Headings stay sentence case. Prose is soft-wrapped, one physical line per paragraph. Numbers that change at every site must change at every site, including `description`, `cardDescription`, `keyTakeaways`, diagram `description` attributes and figure alt text.
- Mermaid blocks keep their metadata contract: `title` and `description` required, `caption` optional, the description stating the relationship or conclusion rather than listing nodes.
- Frontmatter must keep the schema shape (`decisions`, `learnings`, `constraints`, `related` fields unchanged in structure).
- Quotations stay verbatim to their source; if you shorten one, mark the cut with an ellipsis.
- When you date a figure, write the date as `YYYY-MM-DD`.

## After editing

1. Run `eval "$(/opt/homebrew/bin/brew shellenv)" && vale --config .vale.ini --minAlertLevel=error --output=line <your file>` from the checkout root and fix any error-level finding (warnings do not gate).
2. Run `node scripts/verify-brevity.py` only if you cut text for length; otherwise skip it.
3. Append a section `## Fixes applied` to your ledger: one line per row changed, `R<n>: <before, abbreviated> -> <after, abbreviated>`, and one line per row deliberately left as is, with the reason.
4. Report back: the rows changed, the rows left, any test assertion you updated, and anything you could not fix without touching another file (name the file and the change so the coordinator can make it).
