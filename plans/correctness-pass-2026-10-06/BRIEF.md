# Correctness pass, 2026-10-06: brief for every page auditor

One auditor per page. The page is the thing under audit; it is never its own source. Produce a facts ledger for your page at `plans/correctness-pass-2026-10-06/<slug>-ledger.md` in this checkout, in the format below, and report the ledger's summary table back verbatim when you finish.

## What counts as a claim

Every number, date, duration, count, percentage, ordinal ("the first", "the only"), named pull request or issue, version, URL, quotation attributed to a person or a tool, statement of current state ("is public", "is still open", "runs on", "the demo at", "as of <date>"), causal ordering ("after", "because", "which led to"), and any cross-reference to another page on this site. Frontmatter counts too: `description`, `cardDescription`, `constraints`, `decisions`, `learnings`, `related` links, `liveUrl`, `githubUrl`, `status`, dates. Mermaid diagram `title`, `description`, `caption` and node text count. Image alt text counts.

Skip: CSS hex colours, design-token names, and anything the page explicitly labels as hypothetical.

## Verdicts

- **SUPPORTED**: a primary source reproduces the claim. Quote the source value and the exact command or path.
- **WRONG**: a primary source contradicts it. Give the corrected value and the source.
- **STALE**: it was true at the time the page was written (or at its stated as-of date) and is no longer true, and the page does not date it. Give today's value and the date of the change if you can find it. A claim the page dates with "as of <date>" that was true on that date is SUPPORTED, not STALE, unless the page implies it still holds.
- **UNPROVABLE**: no primary source can confirm or deny it. Give the defensible weaker form.

## Sources, in order of preference

1. Local git checkouts under `/Users/nathanpayne/GitHub/`: `mergepath` (the hub; bare `#NNN` in agent-operations posts usually means mergepath, never assume), `nathanpaynedotcom` (this site, on `main`), and whichever project repositories exist there (list the directory first). Use `git log`, `git show`, `git log -S`, `git blame`. Never check out, pull, stash, or modify any checkout.
2. GitHub API through `gh api` (reads only; prefix every invocation with `eval "$(/opt/homebrew/bin/brew shellenv)" &&`). Prefer `gh api graphql` for counts (`totalCount`), `gh pr view --json` / `gh issue view --json` for dates and states. Pull `mergedAt`, `closedAt`, `createdAt`, `state`, `author.login`, review states, comment timestamps, not the prose's memory of them. Be economical: paginate only when you need the whole set, and never loop over hundreds of items when a GraphQL `totalCount` answers the question.
3. The live site, `https://nathanpayne.com/...`, for cross-page claims, and the live URLs a page names (`curl -sI`).
4. The existing ledgers from the #759 audit in `plans/759/` (and `plans/silence-is-not-an-approval-ledger.md`). They are evidence of what was verified on their retrieval date and of which corrections were then applied. They are themselves under audit: their headline verdicts were wrong more than once. Use them to find the rows worth re-checking first, then re-derive anything that could have drifted.

Do not use the page, its OG description, the résumé, or another page on this site as the source for a claim. Another page can only establish a cross-page inconsistency, which is its own finding.

## Method notes that cost the most to learn

- An issue body is evidence of what someone believed at the time, not of what happened. A closure timestamp is not evidence of duration or success.
- A figure quoted "as of <date>" must exclude later observations. Reproduce it at that date before calling it wrong.
- Count with the loosest correct matcher first, then narrow. Say which matcher you used.
- Watch quantifier scope: "every", "none", "the only", "all eight" are the rows most often stated one quantifier too wide.
- An absence claim ("nobody", "no PR", "never") needs a control: show a search that finds a known positive with the same matcher before trusting a zero-hit search.
- Grep for the claim, not for the phrasing you remember; a renamed thing splits its history (a renamed post, a renamed repo such as `gaycruisebingo` to `fiveacross`).
- Private repositories may be unreadable from here. Say "unreadable" and stop; do not collapse unreadable into absent.
- Keep API calls modest. Prefer local git over the API where the checkout exists.

## Ledger format

```markdown
# Facts ledger, 2026-10-06 correctness pass: `<slug>`

Page source: `<path>`. Surface: `https://nathanpayne.com/<route>/`. Retrieval timestamp for every API figure: 2026-10-06. Prior ledger: `<path or "none">`.

## Summary

| # | Claim (verbatim, abbreviated) | Location | Verdict | Corrected value or weaker form | Source |
|---|---|---|---|---|---|

## Rows

### R1: <short title>
> "<verbatim quotation>" (line N)

**<VERDICT>.** <reasoning, two to five sentences>. Source: `<command or path>` -> `<value>`.
```

Every row in the summary table must have a matching section. Order the table WRONG first, then STALE, then UNPROVABLE, then SUPPORTED. Write prose soft-wrapped, one physical line per paragraph. Quote the page verbatim except that spaced em dashes close up.

## Report back

Reply with: the count of rows per verdict, the full summary table (WRONG, STALE and UNPROVABLE rows at minimum; SUPPORTED rows may be summarised as a count if there are more than twenty), and any cross-page inconsistency you found. Recommend a fix for each WRONG and STALE row in one sentence, but do not edit the page: the fixes land in one pull request after every ledger is in.
