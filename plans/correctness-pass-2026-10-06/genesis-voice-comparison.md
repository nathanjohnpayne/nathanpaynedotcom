# Genesis of Mergepath: voice revision review

Baseline: main at `86b5af34ee008aa796987a3487d3e58a5339dd2a` when the rewrite began, including PR #1129 corrections. Complete draft: `src/content/blog/agent-approval-workflow-genesis-of-mergepath.md`. The owner approved the draft and requested the cross-post correction below.

## Before and after

### Opening

**Before**

> The rule was in every file the agents read: never push directly to `main`; every change goes through a pull request. All of them could quote it back to me. And one of them would push straight to `main` anyway—usually on a change small enough not to feel like it counted, usually right after I said "just fix this quickly." Every time, I became the review process: reading diffs after the fact, relaying feedback between sessions, vetting uninspected output by hand. The agents produced more; my confidence did not keep up.

> Two things were going on, neither really about AI. Review happens only when something forces a pause, and an agent left to itself never pauses—it goes from prompt to pushed commit with no point where anyone is expected to look. And a rule that exists only as a sentence gets followed when convenient. Human teams answered both long ago with tooling that refuses the wrong action instead of a handbook that describes it. That became the product hypothesis: agents need the same answer. Writing the rule more clearly does not work. Making the wrong action mechanically expensive, at a boundary you can name, does.

**After**

> I'd put the same rule in every instruction file: never push directly to `main`; every change goes through a pull request. All of them could quote it back. Then one would push straight to `main` anyway, usually on a small change, usually after I'd said "just fix this quickly."

> I became the review process. I read diffs after the fact, carried feedback between sessions, and checked output that nobody else had inspected. The agents produced more; my confidence didn't keep up. A prompt could go straight to a pushed commit without a pause for review.

> None of this was really about AI. Human teams stopped relying on handbooks for this long ago and use tooling that refuses the wrong action. Writing the rule more clearly hadn't worked. Making the wrong action mechanically expensive, at a boundary I could name, might.

### The April wording

**Before**

> Early full-time use of Claude Code and Cursor made one thing clear: agents produce substantially better output when made to review their own work before shipping. Even the crude version—"now review what you just wrote," in the same chat—found real bugs: missing error handling, unquoted shell variables, race conditions.

> Agents, like humans, would rather skip the PR entirely. I tried instruction files first—`CLAUDE.md` for Claude Code, `.cursor/rules/*.mdc` for Cursor, `AGENTS.md` for Codex—each carrying the rule. Like humans, they would selectively remember the rules based on what was easiest, or what they could seemingly think they could get away with. Not every time. But often enough that the instruction file alone could not be trusted, and often enough is all it takes when every lapse lands on the human.

**After**

> Bots, just like humans, require code review. Without it, bugs crop up, features are missed, and the code shipped is of lower quality. Early full-time use of Claude Code and Cursor showed me how much better the output got when I made an agent review its work before shipping. Even "now review what you just wrote," in the same chat, found missing error handling, unquoted shell variables, and race conditions.

> Agents, like humans, would rather skip the PR entirely. I tried `CLAUDE.md` for Claude Code, `.cursor/rules/*.mdc` for Cursor, and `AGENTS.md` for Codex. All carried the rule. Like humans, they'd selectively remember the rules based on what was easiest, or what they thought they could get away with. They didn't skip it every time. They skipped it often enough that I had to check.

### The enforcement decision

**Before**

> **The failure:** direct pushes to `main` despite the written rule. **The options:** write the rule more forcefully, enforce at the GitHub server, or enforce inside the agent's own session. **The decision:** enforce at both boundaries, because they fail differently. Branch protection—a server-side rule that binds everyone, me included, short of an administrator override—ended direct pushes outright. It also produced the next failure: agents opened PRs with no description and no self-review, then merged them on their own approval. A [PreToolUse hook](https://github.com/nathanjohnpayne/mergepath/blob/main/scripts/hooks/gh-pr-guard.sh) answers that by intercepting every `gh pr create` in the local session. In April it did one thing: searched the command text for `Authoring-Agent:` and `## Self-Review`, and refused the create when either was absent.

> It is not a body contract, though. The hook never sees a body; it sees the shell command, and searches the whole string for two case-insensitive substrings. Two consequences follow directly, and neither is hypothetical: a conforming-looking command can carry the markers in some other argument while sending a nonconforming body, and a perfectly valid `--body-file` create is refused because the file's contents are not in the command string at all. It is a command-text check standing in for a body check—cheap, effective against the failure it was built for, and precise about nothing. That detail matters later, when the division of labor moves.

**After**

> I could keep strengthening the instructions, enforce review on GitHub, or enforce it inside the agent's session. I chose both enforcement points because they fail differently. Branch protection required PRs at the server and stopped the direct pushes I was seeing. It bound me too, with an administrator override. Then agents started opening PRs with no description or self-review and merging them on their own approval.

> A [PreToolUse hook](https://github.com/nathanjohnpayne/mergepath/blob/2429e6bf8714e5998e9fa21485a5bbd057010e9e/scripts/hooks/gh-pr-guard.sh) intercepted `gh pr create` in the local session. In April, it searched the command text for `Authoring-Agent:` and `## Self-Review` and refused creation if either was absent.

> That was a cheap check against the failure in front of me. It never read the PR body. It searched the whole shell command for two case-insensitive substrings. A command could put the markers in another argument and send a nonconforming body. A valid `--body-file` create could be refused because the file's contents weren't in the command. The check helped, but it wasn't a body contract. The division of labor changed later.

### App and CLI review

**Before**

> Two scripts drive the loop. [`codex-review-request.sh`](https://github.com/nathanjohnpayne/mergepath/blob/main/scripts/codex-review-request.sh) posts the trigger, polls for a response, and emits machine-parseable JSON. It encodes a quirk only live observation revealed: the Codex **GitHub App** never posts an `APPROVED` review—no findings means a 👍 reaction on the PR, findings mean a `COMMENTED` review with inline priority badges. That is a property of the bot, not of Codex generally; the `nathanpayne-codex` CLI reviewer identity posts ordinary `APPROVED` reviews, twice on PR #66 alone. Conflate the two and a merge gate waits for a state that never arrives. [`codex-review-check.sh`](https://github.com/nathanjohnpayne/mergepath/blob/main/scripts/codex-review-check.sh) is the read-only merge gate: required CI green, a reviewer identity's latest-state `APPROVED`, and Codex cleared on the current HEAD.

**After**

> [`codex-review-request.sh`](https://github.com/nathanjohnpayne/mergepath/blob/main/scripts/codex-review-request.sh) posts the trigger, polls for a response, and returns machine-parseable JSON. Live use showed why its response handling mattered. The Codex **GitHub App** never posts an `APPROVED` review. No findings means a 👍 reaction; findings mean a `COMMENTED` review with priority badges. The `nathanpayne-codex` CLI identity does post ordinary `APPROVED` reviews, twice on PR #66 alone. Treating those as the same kind of reviewer would leave a merge gate waiting for a state the App doesn't emit.

> [`codex-review-check.sh`](https://github.com/nathanjohnpayne/mergepath/blob/main/scripts/codex-review-check.sh) is read-only. It checks that required CI is green, a reviewer identity's current verdict is `APPROVED`, and Codex has cleared the current HEAD.

### Propagation

**Before**

> Propagating the template to six downstream repositories was the humbling part. My estimate—a guess, recorded nowhere but here—was 60 minutes for all six. The first two PRs, [swipewatch](https://github.com/nathanjohnpayne/swipewatch/pull/33) and [nathanpaynedotcom](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/180), ran concurrently and took over five hours. The reason: Codex, reading freshly copied files in repositories where it had no history, surfaced [seventeen distinct template bugs](https://github.com/nathanjohnpayne/mergepath/issues/75) in code the template's own review had already cleared.

**After**

> I started with [swipewatch](https://github.com/nathanjohnpayne/swipewatch/pull/33) and [nathanpaynedotcom](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/180), running their PRs concurrently. The first two repositories took over five hours. I'd guessed 60 minutes for all six, and never wrote that down anywhere but here. Codex's GitHub App, reading newly copied files without history in those repositories, found [seventeen distinct template bugs](https://github.com/nathanjohnpayne/mergepath/issues/75) in code the template's own reviews had cleared.

### The later hook copies

**Before**

> The guard grew a layer. An author wrapper (2026-05-13) took over identity: it verifies an author token before the write, and re-reads the created PR's author afterward to prove the write landed under the account it meant to use. The second break-glass variable, the one for a blocked merge state, arrived the next day (2026-05-14). **Two repositories now carry differently-evolved copies of the hook.** In mergepath at `7878830` (2026-08-27), the commit this post links, the hook insists the create go through the wrapper and still [checks the command text](https://github.com/nathanjohnpayne/mergepath/blob/787883024456260426b869a772059c52b754aeed/scripts/hooks/gh-pr-guard.sh#L3080-L3096) on the wrapper path, not only when the wrapper is skipped. This repository's copy had stopped: it recognized the wrapper and stepped aside without reading the command at all, while the wrapper had gained a line-anchored body contract of its own. Four months on, while this post was being fact-checked, a `gh pr create` was refused because its body wrote `**Authoring-Agent:**` in bold—`^ {0,3}Authoring-Agent:` does not match a line starting with `**`—so the layer added later was the layer that caught it, and a bolded header is precisely the input that tells a line-anchored match from a substring one. Same file name, same function, opposite behavior, and every attempt to settle which copy did what by reading "the hook" was reading whichever copy came to hand. The authorized break-glass merge that same session needed both local variables from the table.

**After**

> An author wrapper arrived on 2026-05-13. It verified the author token before a write and read the created PR's author afterward to check that it had used the intended account. On 2026-05-14, the second break-glass variable added an explicit exit for a blocked merge state.

> The two repositories also developed different copies of the hook. Mergepath at `7878830` (2026-08-27), the linked commit, insisted that PR creation use the wrapper and still [checked the command text](https://github.com/nathanjohnpayne/mergepath/blob/787883024456260426b869a772059c52b754aeed/scripts/hooks/gh-pr-guard.sh#L3080-L3096) on that path as well as the direct path. This site's copy recognized the wrapper and stepped aside without reading the command. The wrapper here had gained its own line-anchored body contract.

> Four months on, while this post was being fact-checked, a `gh pr create` was refused here because the body wrote `**Authoring-Agent:**` in bold. `^ {0,3}Authoring-Agent:` doesn't match a line starting with `**`. The wrapper's later body contract caught it. That input distinguishes a line-anchored check from a substring search. The two files had the same name and job, but behaved differently. I had to check the repository and commit before I could say what "the hook" did.

### Ending

**Before**

> **4. Change the system before you blame the agent.** The agent that shipped clean code ran on the same tools as the one that pushed straight to main, and what changed in between was the system around it. This record cannot isolate capability from mechanism; it shows that mechanism was the variable I could change, and that changing it was enough.

> The template is [public](https://github.com/nathanjohnpayne/mergepath). The enforcement is mechanical, and its boundaries are named. The lessons cost me three weeks. Maybe they save you some of that.

**After**

> **4. Change the system before blaming the agent.** The agent that shipped clean code used the same tools as the one that pushed straight to main. Changing the system was the part I could control. This record doesn't isolate capability from mechanism; it shows that changing the mechanism was enough in this case.

> The template is [public](https://github.com/nathanjohnpayne/mergepath). The enforcement is mechanical, and I can name each control's limits. I wanted review to happen before code reached `main`, without me becoming the relay for every round. These lessons cost me three weeks. Maybe they save you some of that.

## Structural changes

- The April story now runs through instruction files, local/server checks, the outside-review threshold, automation, the merge-hook reviews, dry runs, the auto-merge race, propagation, and the April inventory. The opening and ending retain the thesis about making review harder to skip at named boundaries.
- “Since the snapshot” holds the later May/August changes, the two hook implementations, the operator-limited five-round run, and the October 6 recount. The April statistics and the Phase 4a timing population are explicitly separate.
- Kept the control table beside the boundary argument in the April section, at the owner's request. Its only changed cell dates BREAK_GLASS_MERGE_STATE as added 2026-05-14. The fact-checking-session account of using both variables with --admin remains in the later section.
- Moved the shlex migration to propagation, where the findings forced it, and combined the April consumer-file inventory with the dated numbers. The project-item breakdown stays attached to its project and snapshot.
- Removed the repeated functions/** copying example from the threshold explanation; its role in the propagation bugs remains. Removed the repeated gh pr merge code span and the repeated three-platform/seven-round/seventeen-bug explanations in the closing rules. Dry-run C now states the actual ls finding directly, dropping the incidental set +e syntax at the owner's request. The repeated project breakdown is now just 37 issues and 9 pull requests; the project link and phase count remain in the snapshot bullet.
- Renamed eight headings and retained their original anchors. No title, SEO field, date, image path, tag, category, sidebar diagram, or caption changed. The parser-fix table and five snapshot bullets are byte-for-byte unchanged. The control table keeps its original order and content except for the explicit May 14 date.

## Cross-post correction

The owner requested one word in the already-merged mock-up post: "making direct pushes to main mechanically impossible" becomes "making direct pushes to main mechanically expensive". During cross-agent review the owner also chose to stop crediting FFB's post-merge policy with catching the direct push, so the mock-up post carries two more repairs: the 404 bridge ("The FFB example below records the same failure. FFB issue #145 documents the after-the-fact review.") and the FFB account ("Issue #145 logged it as a policy violation and requested external review."), with ledger R19 updated to match. Its URL and all other content are unchanged. R8 and R50 now support the shared cost claim and administrator limit at their summary rows, detailed entries and cross-page note. The optional filler sentence "The later changes have their own dates" is removed from Genesis; the section starts with its dated August 26 account.

## Visible metadata changes for owner review

The deck and takeaways are rewritten with the body. The first two pullquotes restore the author's own April wording from 6002877 (ledger S33), and both appear in the body. The first is verbatim. The second fixes only the stumble to "or what they thought they could get away with." The remaining two pullquotes also appear verbatim in the body: the missed estimate includes the restored admission that it was never written down elsewhere, and the final quote states the narrower judgment about the variable the author controlled. These are intentional frontmatter edits; all other fields remain unchanged. External findings and historical quotations in the body retain their wording.

## Meaning review against the corrections

- W1: Four later propagation PRs still opened an hour after the back-port, on April 15, and merged in about five and a half minutes each. Three merged before two App findings per repo arrived; issue closures the next day within eighteen seconds remain a separate measure.
- W2: Happy-path A keeps 132 seconds and the earlier auto-review-on-open history from #53. It does not become the first observed automatic review.
- W3–W4: #60 remains a docs-only CLAUDE.md/AGENTS.md change routed to outside review by hand. Approval preceded the label by three seconds; merge followed the label by twelve seconds, using frozen labels. #63 remains +53/−0 in one file with a final live-label read.
- W5–W6: C’s finding is about ls accepting option-like arguments, not set +e. April is when the owner enabled the App on this repository, not the App’s launch date.
- W7: The original 30+ PRs/six weeks, May 15’s 100+ PRs/seven weeks (elsewhere six), and the corrected April 32/three weeks remain separate. The dry admission about publishing unreviewed numbers remains.
- W8–W9: The CLI identity’s seven hook rounds and the App’s downstream findings are distinct. No claim says all seventeen bugs were in code reviewed seven times. The six parser fixes, 81-second retraction, and four later blocking rounds remain.
- W10–W13: The April inventory remains files/checks/identities/manual fallback/advisory CodeRabbit. The May 4 sync manifest, May 12 override registry, May 13 author wrapper and May 14 break-glass variable retain their later dates. The control table explicitly dates the later variable even though the table sits with the April boundary argument. No June security-baseline claim was added. The April diagram remains unchanged.
- W14–W15: Cursor’s rules remain .cursor/rules/*.mdc. The template is public, without a new claim that it is licensed open source.
- W16: Sixteen operator-trigger observations retain median 156 and range 7–703, including error replies. The review/👍-only population stays thirteen, median 179, range 113–703. Four #78 observations extend the population to April 17. The recount is still dated 2026-10-06.
- U1–U3: Early full-time use has no invented duration. Identity-switching remains a repeated observation across three platforms, without a controlled comparison, defect ledger, or mechanistic explanation. The shipping comparison says the same tools were used, without claiming the same model or isolating capability from mechanism.
- U4–U5: The sixty-minute estimate remains a guess recorded only here. The bold-header refusal remains the author’s historical account; the contract behavior is reproducible, while the episode is not independently documented. No new claim of a historical test transcript or personal manual insertion of the planted bugs was added.
- S26–S32: The six-category 3+4+5+1+2+2 taxonomy remains seventeen. The eighteenth P1 is still NOT YET FIXED and knowingly carried. The April counts (32/30, 46 items, 37 issues/9 PRs, five phases, seven checks, five scenarios) and August counts (459 PRs, 71 checks, nine consumers) retain their dates and scopes. #787’s 0/4/5/1/7 findings and two CodeRabbit findings in round three remain, with the operator budget distinguished from max_review_rounds escalation. The restored ending to that paragraph distinguishes a failed convergence assumption from a guard failure.
- S33 and mock-up R50: The Genesis ledger now records the restored self-quotations and the one copyedit in its summary row and detailed entry. The mock-up ledger's R50 row and detailed entry now quote the restored thesis as a hypothesis ("might"), the observed direct-push outcome, and the administrator limit. The mock-up article now says "mechanically expensive" instead of "mechanically impossible". R8 and R50 both retain the administrator limit, and the cross-page note no longer says the corrected mock-up post omits it. R8 also distinguishes the recorded pushes before and after the old claim rather than calling all of them later.

## Occurrence checker

`scripts/verify-brevity.py` reports eight failing classes for this revision. Severities, code blocks, the diagram block, and pinned frontmatter pass unchanged. Every distinct URL and PR reference remains; occurrence counts change where the owner requested duplicate removal. The checker is unchanged. This is not presented as a strict brevity-only pass.

| Token class | Removed occurrences | Added occurrences | Reason |
|---|---|---|---|
| URLs | https://github.com/users/nathanjohnpayne/projects/2 × 1 | None | Removed the repeated Project #2 link from the prose beneath the snapshot bullets; it remains in the project-item bullet. |
| URLs (review fix) | https://github.com/nathanjohnpayne/mergepath/blob/main/scripts/hooks/gh-pr-guard.sh × 1 | https://github.com/nathanjohnpayne/mergepath/blob/2429e6bf8714e5998e9fa21485a5bbd057010e9e/scripts/hooks/gh-pr-guard.sh × 1 | Intentional exception added in cross-agent review: the link sits in front of "In April, it searched the command text", so it now pins the April hook (ledger's April tree) instead of the later `main` hook. The Before excerpt keeps the original URL. |
| link destinations | https://github.com/users/nathanjohnpayne/projects/2 × 1 | None | The same duplicate Project #2 destination was removed, as requested. |
| issue/PR refs | #2 × 1 | None | The removed #2 is that duplicate project reference, not a distinct PR. |
| standalone months | None | April × 1 | Clarifies that the recomputed figures are the April figures and review timings, rather than the older dated August fleet counts. |
| timestamps | None | 2026-05-14 × 1 | Dates BREAK_GLASS_MERGE_STATE in the control table as added 2026-05-14; its chronology is unchanged. |
| numerals | 2 × 2; 5 × 1; 32 × 1 | 2026 × 2; 16 × 2; 60 minutes × 1; 05 × 1; 14 × 1 | Removed repeated project/phase/repository figures from the snapshot explanation. Preserved legacy anchors add date numerals; the table date and estimate pullquote repeat existing dated facts and the sixty-minute guess. |
| code spans | `functions/**` × 1; `gh pr merge` × 1; `set +e` × 1 | `nathanpayne-codex` × 1 | Two redundant spans were removed; the CLI identity is named explicitly. The owner requested removing incidental set +e wording so dry-run C names the actual ls finding directly. |
| tables | No row or original cell text removed | (the second added 2026-05-14) in one cell | The control table returns to its original place; only the later variable’s introduction date is added. The parser-fix table is unchanged. |


The spelled-out-number advisory was reviewed against its claim: all case counts, review counts, durations, scope boundaries, and the one known open P1 remain. Removed occurrences repeat facts or use number words as ordinary prose; the estimate pullquote duplicates an existing five-hour result rather than adding a measurement.

Connective prose: 3,387 → 2,890 (-14.7%). Whole file: 4,260 → 3,738 (final merged text, after the review fixes below).

## Validation

Astro build and all 58 relevant tests passed. Full pre-PR validation also passed: lint, typechecking, 1,212 tests in 66 files (6 existing skips), and 369 browser tests (51 existing skips). The browser suite used this worktree's verified preview and compared every served file with dist before running. The typecheck/build cache collision and the desktop preview's early-exit behavior were resolved through sequential checks and the documented owned-preview path, without changing tests or gates. Scoped prose lint has no errors; advisory title-capitalization warnings remain. Diff checks pass. All 13 original heading anchors resolve in the built page, and all four pullquotes appear verbatim in the body. The sidebar diagram and caption, parser-fix table, and five snapshot bullets are byte-identical. The control table keeps its original order and differs only by the explicit May 14 date in one cell. No collective pronouns or curly apostrophes appear in the article. Manual meaning review is separate from these mechanical checks.

The generated social-card reference is refreshed only for this post: its automatic reading-time line changes from 17 to 15 minutes after the rewrite. The title, date, palette and layout stay the same; embedded article images and the OG path are unchanged. The editorial brief now carries the owner's batch rule: sentence case for every body heading, including untouched ones, with existing fragment anchors preserved.

## Owner judgment

The two structural/voice decisions have been revised as requested: the original April self-quotations are restored, and the control table stays beside the boundary argument with the later variable dated. The requested thesis, human/agent parallel, convergence admission, and sentence-level fixes are applied. No factual question is pending; the historical qualifications described above remain in place.

## Cross-agent review corrections

Applied after the owner-approved draft, in Claude's cross-agent review (#1138). Counts and excerpts above describe the draft unless they say otherwise; these changes take precedence over them.

- The PreToolUse hook link before "In April, it searched the command text" pins mergepath `2429e6bf` (the April tree) instead of `main` (`83f4dfd`).
- The control-table cell dates only the second break-glass variable: "(the second added 2026-05-14)"; `BREAK_GLASS_ADMIN` was in the April hook (ledger W13) (`6051a1b`).
- The mock-up post's FFB attribution was narrowed by owner decision (see Cross-post correction) (`77ffa93`).
- The "selectively remember" self-quotation (S33) was kept after review.
