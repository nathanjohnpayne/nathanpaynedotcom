# AI-use statements for the case studies (#1496)

The `aiUse.statement` text for every entry in `src/content/projects/`, with the records each one was drafted from. Part of epic #1490. Drafted 2026-11-01 against `origin/main` at `b388d7ca76acbf35ac8fab3ea3b7c87889a5dcbd`; approved and stamped the same day.

**Status: approved and stamped.** An agent drafted a statement for each entry from the records below (#1509, `56dbf3ba`). The owner revised them and approved the final text verbatim in [the approval comment on #1509](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/1509#issuecomment-6566766077) (posted as nathanjohnpayne, 2026-11-02T01:16:57Z, which is 2026-11-01 Pacific). That comment is the source of truth for the wording: each entry's `aiUse.statement` matches it byte for byte, and its `aiUse.reviewed` stamp was computed with `npm run --silent ai-use:hash -- <path>` after the statement was in place, dated 2026-11-01.

Each entry below gives the approved statement, the agent's superseded draft, the records the draft was built from and notes on that record. The approved statements say more about the owner's part than the draft did: that the owner directed the drafts, decided the framing and the visuals, and reviewed Claude's later edits before they went live. Those are the owner's own account, given in the approval; the repository record at drafting did not show them (see Record gaps).

## Scope and method

Each statement describes the prose of its case study as it stands at the baseline above: the MDX body and every reader-facing frontmatter field (`description`, `cardDescription`, `seoDescription`, `ogDescription`, `decisions`, `constraints`, `learnings` and the rest). It does not describe the software, which the case studies already say was built with agents (#1490, Out of scope).

For each entry I read its complete Git history (`git log --follow -- <file>`), every pull request body behind those commits, the commit trailers (`Co-Authored-By`, `Authoring-Agent`, `Claude-Session`), the portfolio workstream record (`plans/759/RUN.md`, `plans/759/portfolio-narratives-runbook.md`, issues #751 to #759), the 2026-10-06 correctness pass (`plans/correctness-pass-2026-10-06/SUMMARY.md` and the entry's ledger), and the entry's voice approval packet in the same directory, which carries the writing-style route and the owner's approval conditions. Pull request reviews and comments on the post-rewrite edits were checked for any owner approval.

Rules applied (from #1496 and the latest decision on #1490): two or three first-person sentences; the current text, including later model revisions; "approved" only where the record shows an approval, and "wrote" only where the record shows owner-supplied words; a thin record is said in the statement. Every statement was checked with the repository's Vale configuration.

### The record common to all seven

Recorded once here so each entry below lists only what is its own.

- **Earlier versions.** Each page existed as a `.md` file from April 2026 on, written and revised by agents (Claude Opus 4.6 and 4.7 trailers from 7c1102f1 onward; Codex in #495). The current `.mdx` text descends from the August 2026 rebuild, not from those versions.
- **August 2026 rebuild.** Epic #759, Workstream 2, run by Claude (`Authoring-Agent: claude`, `Co-Authored-By: Claude Opus 5`) from `plans/759/portfolio-narratives-runbook.md` against the facts ledger `plans/759/project-pages-ledger.md`. The owner set the run's merge authority in chat on 2026-08-27 (runbook §C) and directed individual passes, recorded per entry below.
- **October 2026 correctness pass.** Claude audited every page on 2026-10-06 (#1124, `ef03fa7b`), with follow-ups in #1129 (`1d1d39dd`, `Claude Fable 5.1`), #1130 (`6cd7f6fa`) and #1153 (`b497bc38`). Ledgers: `plans/correctness-pass-2026-10-06/<entry>-ledger.md`.
- **October 12 voice rewrite.** Codex (`Authoring-Agent: codex`) rewrote each complete page, including all frontmatter prose, through the installed writing-style skill's supplied-reference route: owner-designated model prose as the style reference, no private-writing retrieval. Each packet records the owner's direct approval, with conditions, in parent chat `01a1135d-d82d-7790-9c5e-8c5198d03dd0` or the session that ran the rewrite.
- **October 15 card lines.** #1400 (`9f4cef3c`, `Authoring-Agent: claude`, issue #1399): "an editorial pass by Fable rewrote all seven" `cardDescription` lines. The pull request records a Claude facts check and a `nathanpayne-claude` approval. It records no owner review or approval of the new lines.

## Five Across

`src/content/projects/five-across.mdx`

**Approved statement** ([approval comment](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/1509#issuecomment-6566766077)):

> At my direction, Claude wrote the first draft from the game's code, analytics, and event records, while I determined the story, its framing, and the visual evidence. I confirmed that the finale's freeze hadn't moved during the cruise, which let Claude correct its timing, and when Codex rewrote the piece in my voice, I requested three precision fixes and had two earlier lines restored because they made the point better. I approved the result and reviewed Claude's later card-summary revision before it went live.

**Agent draft, superseded:**

> Claude wrote this case study in August 2026 from the game's code, analytics and event data, then corrected the finale's timing in its October fact-check after I confirmed the freeze hadn't moved during the cruise. Codex then rewrote the page in my voice, and I approved it after asking for three precision fixes and two of the earlier lines back. Claude later rewrote the card summary, which the record doesn't show me reviewing.

**Drafted from:**

- First draft: #834 (`44c0a590`, `Claude Opus 5`, issue #752), ledger `plans/759/project-pages-ledger.md` §B; #846 (`09630215`) migrated it to the decision anatomy.
- Fact-check: `plans/correctness-pass-2026-10-06/five-across-ledger.md`; #1124, #1130, #1153. The owner's freeze testimony is issue #1133 and `SUMMARY.md` § Resolved by the owner (2026-10-06).
- Voice rewrite: #1299 (`ff2daa3e`, `Authoring-Agent: codex`); packet `plans/correctness-pass-2026-10-06/five-across-voice-comparison.md` § Owner precision review (three fixes, two restored lines: "The rule, not volume, crowned the champion" and "What it could test, it tested harshly").
- Later: #1400 (`9f4cef3c`) card line only.

**Record notes:** The two restored lines first entered in Claude's drafts (#820 `0ab30811` and #834), not in owner-written text. The #1400 card says "ran ten days at sea," wording the owner's 2026-10-11 precision review asked Codex to remove from the metadata (packet § Owner precision review). See Record gaps.

## Mergepath

`src/content/projects/mergepath.mdx`

**Approved statement** ([approval comment](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/1509#issuecomment-6566766077)):

> At my direction, Claude wrote the first draft from the Mergepath repositories, while I decided which parts of the work mattered and how to present them. After reading the live page, I sent it back to be shorter and sharper, and when Codex later rewrote it in first person, I requested two final wording changes. I approved that version and reviewed Claude's later card-summary revision.

**Agent draft, superseded:**

> Claude wrote this case study in August 2026 from Mergepath's repositories, then made it shorter and sharper after I read the live page and sent it back. After Claude's October fact-check, Codex rewrote the page in first person, and I approved it with two wording changes. Claude has since rewritten the card summary; nothing in the record shows me reviewing that line.

**Drafted from:**

- First draft: #848 (`c1cd1576`, `Claude Opus 5`, issue #753), ledger `plans/759/project-pages-ledger.md` §E. The owner's read: #852 (`64345755`, "Follows the operator's end-to-end read of the live page") and #853 (`2cecb0bc`, "the two remaining exhibits from the operator's review of the live page").
- Claude added the Cockpit section on 2026-10-06: #1121 (`72d09494`).
- Fact-check: `plans/correctness-pass-2026-10-06/mergepath-ledger.md`; #1124, #1129.
- Voice rewrite: #1303 (`da3a84d2`, `Authoring-Agent: codex`); packet `mergepath-voice-comparison.md` § Owner approval conditions ("I'd approve Mergepath" with two wording requests).
- Later: #1400 card line only.

**Record notes:** The packet also records the owner confirming a Genesis-post recollection; the Mergepath page does not carry that recitation, so the statement leaves it out. Whether the #852 diagnosis quoted in that pull request is the owner's words or the agent's summary is not recorded.

## Override

`src/content/projects/override.mdx`

**Approved statement** ([approval comment](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/1509#issuecomment-6566766077)):

> At my direction, Claude wrote the first draft from Override's product specification and my investment documents. My feedback drove four more rounds of revision to the origin story, framing, and exhibits, and I decided which evidence and visuals belonged in the piece. Codex later rewrote it in first person and corrected the profit-split figure's units, and I approved that version and reviewed Claude's later additions about my Broadway investment and the card summary.

**Agent draft, superseded:**

> Claude wrote this case study in August 2026 from Override's product spec and my investment documents, then revised it four more times on my notes, reframing the origin story and replacing the exhibits. After Claude's October fact-check, Codex rewrote the page in first person, and I approved it along with its fix to the profit-split figure's units. Claude has since added the sentence about my Broadway investment and rewritten the card summary; the record doesn't show me reviewing either edit.

**Drafted from:**

- First draft: #840 (`64f6a895`, `Authoring-Agent: claude`, issue #754 and its outline comments, which name the PRD and the investment folder as sources); ledger `plans/759/project-pages-ledger.md` §F. #840 also records an owner note after reading the draft ("it was accurate and it was dry").
- The four owner-directed passes: #841 (`e88d4da4`, "on operator direction across two review rounds"), #842 (`bce88585`, "the brevity/evidence pass the operator asked for"), #843 (`c455f5a0`, "Seven surgical edits on operator direction"), #844 (`71c4f578`, "Operator direction after reviewing the full Deal Room"). `plans/759/RUN.md` calls them "five operator-directed passes," counting #845, which changed only the ledger.
- Fact-check: `plans/correctness-pass-2026-10-06/override-ledger.md`; #1124; R34 dollars correction "approved by the owner" (`SUMMARY.md`).
- Voice rewrite: #1305 (`6a616373`, `Authoring-Agent: codex`); packet `override-voice-comparison.md` § Owner approval and quotation condition ("I'd approve Override, including the dollars correction").
- Later: #1398 (`aeaf1a9f`, `Authoring-Agent: claude`), which added "I invested in the Broadway revival of Proof" after "an editorial pass by Fable" flagged the résumé claim; #1400 card line.

**Record notes:** The issue comment calls the PRD "Nathan's own authored artifacts"; that is an agent's description, so the statement says "product spec" without claiming who wrote it. The statement says "replacing the exhibits" for #844, which swapped the deal-terms exhibit for scenarios and added the post-recoup split.

## Device Source of Truth

`src/content/projects/device-source-of-truth.mdx`

**Approved statement** ([approval comment](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/1509#issuecomment-6566766077)):

> At my direction, Claude wrote the first draft from the demo's repository and my account of its origins: I had forked a Disney system and replaced its data with invented records. I decided how to frame that history and what the visuals should demonstrate, and when Codex rewrote the piece in my voice, I requested three specific sentences. I approved that version and reviewed Claude's later card-summary revision before publication.

**Agent draft, superseded:**

> Claude wrote this case study in August 2026 from the demo's repository and my account of where it came from: I forked a Disney system and reseeded it with invented data. After Claude's October fact-check, Codex rewrote it in my voice, and I approved that version once three sentences I asked for were in. Claude has since rewritten the card summary, an edit the record doesn't show me reviewing.

**Drafted from:**

- First draft: #873 (`99ab5fd5`, `Claude Opus 5`, issue #755), ledger `plans/759/project-pages-ledger.md` §A. The owner's account is quoted there: "I forked a Disney system and added synthetic data to it for a portfolio demo." Revised in #883 (`9b16fdd9`) on "editorial feedback"; #941 and #943 named Disney rather than Disney Streaming.
- Fact-check: `plans/correctness-pass-2026-10-06/device-source-of-truth-ledger.md`; #1124.
- Voice rewrite: #1302 (`1cbe9dae`, `Authoring-Agent: codex`); packet `device-source-of-truth-voice-comparison.md` § Owner approval conditions (the fork wording in the search snippet, the source-of-truth definition sentence, the personal-stakes sentence).
- Later: #1400 card line only.

**Record notes:** The page presents the cost of fragmented records and "a decade" at Disney as the owner's own account; the record doesn't show the owner supplying that wording. The record does not say who gave the #883 "editorial feedback." Whether the owner wrote or chose the three condition sentences is not recorded, so the statement says "asked for."

## Matchline

`src/content/projects/matchline.mdx`

**Approved statement** ([approval comment](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/1509#issuecomment-6566766077)):

> At my direction, Claude wrote the first draft from the Matchline repository, and Codex later rewrote it in my voice. I supplied my real résumé example, wrote the three sentences weighing its two claims, and decided how the evidence and visuals should support that assessment. I approved that version and reviewed Claude's later additions—the bar-before-the-ruler lesson, the restart section, and the corrected latency figures—before they went live.

**Agent draft, superseded:**

> Claude wrote this case study in August 2026 from the Matchline repository, and Codex rewrote it in my voice in October. I asked for my real résumé example, wrote the three sentences that weigh its two claims, and approved that version. Since then Claude has added the bar-before-the-ruler lesson, the restart section and the corrected latency figures; the record shows I had the latency update merged and deployed, but not that I reviewed the other additions.

**Drafted from:**

- First draft: #885 (`d191ebd0`, `Claude Opus 5`, issue #756), ledger `plans/759/project-pages-ledger.md` §D; revised in #887, #902, #905, #922 (`Claude-Session: session_01BBfFT95GicWkg7ykrd6Hs1`) and #1041.
- Fact-check: `plans/correctness-pass-2026-10-06/matchline-ledger.md`; #1124, #1129.
- Voice rewrite: #1319 (`a61a853e`, `Authoring-Agent: codex`); packet `matchline-voice-comparison.md` § Approval summary (the owner requested the real `nathan-2026` Unit) and § Approval record ("the owner approved the revised draft and supplied this final connecting paragraph"). The three supplied sentences open the paragraph that begins "Both claims carry a number" and are unchanged in the baseline.
- Later Claude edits: #1392 (`3a5f03cc`, `Claude-Session: session_0111XPejniqDkEWNSYVgUb1t`, "The bar before the ruler"); #1396 (`8c49cfc7`) and #1400 card lines; #1455 (`8e7765b4`, status, summary fields, "What got built" rows, "The restart"); #1468 (`3615f6f6`, latency correction and the first live validation run; "went ahead on the owner's instruction to merge and deploy this PR").

**Record notes:** This is the only entry where the record shows the owner's own words in the text. It is also the entry with the most agent-written text since the owner's last recorded approval: four Claude pull requests, none with an owner review. #1468's paid-run sentence restates an owner approval recorded on matchline#495.

## Swipe Watch

`src/content/projects/swipe-watch.mdx`

**Approved statement** ([approval comment](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/1509#issuecomment-6566766077)):

> At my direction, Claude wrote the first draft from the prototype's repository, and I had it cut to a shorter read because the original was more than the story needed. When Codex rewrote it in first person, I requested a specific sentence about cost and changes to the card wording, and I decided what the visuals should emphasize. I approved the result and reviewed Claude's later revision to the card's opening sentence before publication.

**Agent draft, superseded:**

> Claude wrote this case study in August 2026 from the prototype's repository, then cut it to a short read in a second pass. After Claude's October fact-check, Codex rewrote it in first person, and I approved that version once it carried the cost sentence and card wording I asked for. Claude later rewrote the card's first sentence, an edit the record doesn't show me reviewing.

**Drafted from:**

- First draft: #836 (`512b4af3`, `Authoring-Agent: claude`, issue #757), ledger `plans/759/project-pages-ledger.md` §G; the cut to a "90-second" read: #839 (`6011e2ca`, issue #838); #846 (`09630215`).
- Fact-check: `plans/correctness-pass-2026-10-06/swipe-watch-ledger.md`; #1124; #1129 removed the "accidental" framing on the evidence of the decision record and commit history (#1128).
- Voice rewrite: #1310 (`2c7edf09`, `Authoring-Agent: codex`); packet `swipe-watch-voice-comparison.md` § Owner approval conditions (the cost sentence, the requested 185-character card wording, one consolidated demo account).
- Later: #1400 rewrote the card's first sentence; its second sentence is the owner-requested wording, unchanged.

**Record notes:** Issue #838 and its screenshot addendum were posted under the author account, which agents also use, so the record does not show who asked for the 90-second cut. The packet says "requested wording" for the card, not that the owner wrote it, so the statement says "asked for."

## Friends & Family Billing

`src/content/projects/friends-and-family-billing.mdx`

**Approved statement** ([approval comment](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/1509#issuecomment-6566766077)):

> At my direction, Claude wrote the first draft from the product's repository; when the opening got the households wrong, I corrected the account, supplied the actual count, and had Claude rewrite it. Codex later rewrote the piece in my voice, and I requested two wording fixes before approving it. When the app was redesigned, I selected and directed the visual presentation, gave feedback on the new screenshots, and reviewed Claude's updated lessons, captions, and card summary before they went live.

**Agent draft, superseded:**

> Claude wrote this case study in August 2026 from the product's repository and rewrote its opening after I pointed out that it had the households wrong and gave the real count. After Claude's October fact-check, Codex rewrote it in my voice, and I approved that version with two wording fixes. Claude has since revised the lessons and captions for the redesigned app and rewritten the card summary; the record shows my notes on the new screenshots, but not on that text.

**Drafted from:**

- First draft: #858 (`4f4d4a10`, `Claude Opus 5`, issue #758), ledger `plans/759/project-pages-ledger.md` §C; Codex follow-up #866 (`21f35ebc`, docs only); opening corrected in #868 (`97c635af`, "Reported by the repository owner after #858 merged"; nine people and five households are "the owner's own account," ledger §C51); rebalanced in #882 (`ddb9bb95`).
- Fact-check: `plans/correctness-pass-2026-10-06/friends-and-family-billing-ledger.md`; #1124.
- Voice rewrite: #1304 (`c6c0272a`, `Authoring-Agent: codex`); packet `friends-and-family-billing-voice-comparison.md` § Approval record (two wording fixes, "I got the model right" and "the two the tests covered," plus a live-rules check).
- Later: #1400 card line; #1453 (`ecfc7bbf`, `Claude-Session: session_01Xpyi6H3Ph618irvFp3VMUe`) revised two learning records ("months before," "in June," "for seven months") and the hero caption; #1454 (`2caa3fc4`, "from the owner's review of the live page": sharper captures and a renamed invented member); #1473 (`f3dd5469`) re-captured the images, leaving the caption text unchanged.

**Record notes:** #1454 shows the owner looked at the live page after #1453, but the notes it records are about the images, so the statement doesn't claim a review of the revised learning records.

## Record gaps

These describe the repository record when the drafts were written. The owner's approval answers the first, third, fourth and fifth on the owner's own account: the approved statements say the owner reviewed each of those later Claude edits. No repository artifact records those reviews, so the stamp rests on the owner's attestation, which is the point of the approval. The Five Across card regression stays out of scope for #1496.

- **No owner review of the October 15 card lines.** #1400 rewrote all seven `cardDescription` fields with no recorded owner review. Each statement says so. If the owner did review them, the clause can come out of every statement.
- **Five Across card regression.** The #1400 card ("ran ten days at sea") reintroduces wording the owner's 2026-10-11 precision review removed from the metadata. Out of scope here, since #1496 changes no content, but worth an owner decision before the stamp freezes it.
- **Matchline after #1319.** Four Claude pull requests (#1392, #1396, #1455, #1468) added sections and figures with no recorded owner review of the prose; only #1468 records an owner instruction to merge and deploy.
- **Friends & Family Billing after #1304.** #1453's learning-record edits carry no recorded owner review.
- **Override after #1305.** #1398's "Proof" sentence carries no recorded owner review.
- **Who wrote the condition wording.** The Device Source of Truth, Swipe Watch and Mergepath packets record owner-requested sentences without saying whether the owner wrote or chose them. The statements say "asked for." Only Matchline's packet says the owner supplied words.
- **Session transcripts.** The parent chat `01a1135d-d82d-7790-9c5e-8c5198d03dd0` and the `Claude-Session` links are not readable from this repository; the approvals above rest on the packets and pull request bodies that quote them.
- **Conflict with the draft policy page.** The unapproved `/how-i-write/` copy on #1505 says "I read every piece in full and approve it before it's published." The record supports that for each page's October 12 version, not for the later Claude edits listed above.
