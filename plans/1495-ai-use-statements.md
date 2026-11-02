# AI-use statements for the blog collection (#1495)

The `aiUse` statements for the 11 posts in `src/content/blog/`, drafts included, with the record each was drafted from. Part of epic #1490. **Status: approved.** The owner revised the drafts and approved the final wording of every statement verbatim on PR #1508 ([approval comment](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/1508#issuecomment-6566767100), posted 2026-11-02T01:17:02Z, which is 2026-11-01 in Pacific time). That comment is the source of truth for the wording. Each post carries its statement in `aiUse.statement`, stamped with `aiUse.reviewed` dated 2026-11-01. The agent drafts proposed in this record are superseded; they remain in commit `53c7ee6f`.

Each draft followed the rules in #1495: two or three first-person sentences in the owner's voice, describing the text as it stands now; "edited" or "wrote" only where the record shows the owner's own wording; "approved" only where the record shows an approval; and a plain admission wherever the record is thin. Statements are written per post. Where two posts share a fact (most of them went through the same October passes), each says it in its own terms.

## How the record was read

For each post: its facts ledgers (`plans/759/`, `plans/correctness-pass-2026-10-06/`, and the top-level `plans/*-ledger.md`), the October voice comparison in `plans/correctness-pass-2026-10-06/*-voice-comparison.md` (which records the owner's feedback and approval for the Codex rewrite), `git log --follow` on the post file with every commit body and trailer, and the bodies of the pull requests that touched it, read through the reviewer token on 2026-11-01. No review packet is committed for any post; the `writingStylePass` material survives only as the voice comparisons above and, for the newest post, the ledger's § F.

Limits that apply to every post:

- **Agents author as the owner's account.** Commits, pull requests and comments under `nathanjohnpayne` are usually agent-written (the `Authoring-Agent:` trailer and `Co-Authored-By` lines say which agent). An owner decision counts here only where an agent recorded it as the owner's (for example "at the owner's request", "the owner approved"), or where the owner's own words are quoted. Those records are agent-written; none of the source records the statements were drafted from is a comment the owner typed on GitHub. The owner's approval comment on PR #1508 is the one record the owner posted.
- **No drafting prompts are linked.** No commit that creates a post carries a `Claude-Session` trailer; the only such trailers in these files' histories are on cross-cutting commits (#636, #637). So the record rarely shows who chose a topic or what brief an agent drafted from, and no draft claimed the owner chose the topic. The approved statements say each first draft was written at the owner's direction; that rests on the approval comment.
- **The owner's own editing pass did not ship.** On 2026-09-11 the owner made 213 paragraph-level rewrites across the eight long-form posts then published (`f9f06560`, "Authored by Nathan Payne"). Review found 37 defects in it, and PR #1016 dropped every rewrite, keeping only spelling, dash and one arithmetic fix. None of that pass is in the current text, so no statement relies on it.
- **Later agent changes without a recorded owner review.** After the owner approved each October voice rewrite, Claude's cross-agent review applied further fixes (inside the rewrite PRs and in #1148 and #1153; each comparison doc's "Cross-agent review corrections" section lists them, with the owner's in-review decisions where there were any). On 2026-10-13, PR #1357 (Claude) rewrote one to four key takeaways on each of the ten posts that existed then; its body records no owner review, and its only approval is the `nathanpayne-claude` reviewer identity. The drafts said so per post; the approved statements say the owner reviewed those changes, on the authority of the approval comment.

## Cross-cutting passes

These touched most posts. Each per-post entry below says which applied.

| Pass | What changed | Agent | Owner's role in the record |
| --- | --- | --- | --- |
| Epic #759 blog audits, August 2026 (issues #739 to #745) | A facts ledger per post in `plans/759/`, corrections, and a separate brevity pass | Claude (Opus 5 and Fable, per `plans/759/RUN.md` and trailers) | Not recorded per post |
| #1083, 2026-10-01 (`7d44effd`) | Rewrote nine `description` decks to one length band | Claude | None recorded |
| #1124, 2026-10-06 (`ef03fa7b`) | Correctness pass: a new ledger per page, with fixes for its WRONG and STALE rows | Claude | Owner reviewed and kept it (`EDITORIAL-BRIEF.md`) |
| #1129, 2026-10-06 (`1d1d39dd`) | Editorial pass on the three posts that grew most, and three overclaims | Claude | Driven by the owner's editorial review; the owner named the three overclaims and the repetition examples (`EDITORIAL-BRIEF.md`) |
| Voice rewrites, 2026-10-06 and 07 (#1131, #1132, #1134, #1136, #1138, #1140, #1141, #1142, #1143, #1156) | Full rewrite of each post for voice | Codex (`Authoring-Agent: codex`) | Owner feedback rounds and approval of each draft, recorded in the comparison docs |
| #1148 (`f93dfc91`), #1153 (`b497bc38`) | Cross-agent review fixes after the owner-approved drafts | Claude | Some in-review owner decisions recorded |
| #1160, 2026-10-07 (`5e99cca9`) | Applied the owner's approved deck copy (Perfect Score, Silence) and a requested punctuation trim (Every Reviewer) | Codex | Owner-approved copy |
| #1357, 2026-10-13 (`48d0d7d4`) | Rewrote key takeaways on ten posts | Claude | None recorded |

## Statements

Each entry gives the approved statement, then the records its draft was built from. Where the owner's approval states a contribution the record below doesn't show (for example, choosing the figures, or reviewing the later corrections and takeaways), the approval comment is the record of it.

### `agent-approval-workflow-genesis-of-mergepath`

> At my direction, Claude wrote the first draft and later fact-checked it, while I decided which conclusions the evidence could support. I challenged its claim about agent reliability as an overstatement and confirmed from memory that the agents had quoted the no-direct-push rule back to me. When Codex rewrote the piece in my voice, I requested further changes before approving it, and I reviewed Claude's later corrections and its revised key takeaway.

Drafted from:

- First draft: PR #181 (`60028772`, 2026-04-15), `Authoring-Agent: claude`, `Co-authored-by: Claude Opus 4.6 (1M context)`.
- Claude revisions: #338 (`96685283`), #362 (`2ba44eb1`), #364 (`780893dd`), #371 (`4dcb2610`), #739 (`bef2a561`), #802 (`c6ac2109`), #832 (`e403e3e5`), #917 (`2269b6d0`), #1124, #1129, #1153, #1357 (takeaway 1). Ledgers: `plans/759/agent-approval-workflow-genesis-of-mergepath-ledger.md`, `plans/correctness-pass-2026-10-06/agent-approval-workflow-genesis-of-mergepath-ledger.md`.
- Owner: named the reliability overclaim (`plans/correctness-pass-2026-10-06/EDITORIAL-BRIEF.md`); confirmed the rule-recitation recollection on 2026-10-12 (October ledger, U6).
- Codex voice rewrite: PR #1138 (`a03e1782`); `plans/correctness-pass-2026-10-06/genesis-voice-comparison.md` records the owner's approval, the boundary table kept "at the owner's request", and the `set +e` wording removed "at the owner's request".

Record notes: the October ledger's S33 calls the two pullquotes "the author's own April wording", but they come from the April first version, which a Claude session committed; the record doesn't show the owner wrote them, so the statement doesn't claim it.

### `autofix-was-the-whole-cost`

> At my direction, Claude wrote the first draft from the commit history, the review records, and the Codex session costs I supplied. I decided how to frame the cost argument, chose the supporting figures, decided where each would appear, and determined what each would communicate. When Codex rewrote the piece in my voice, I had it restore argument lines it had cut, and I approved the result and reviewed Claude's later corrections and key takeaway before they went live.

Drafted from:

- First draft: PR #746 (`fe292664`, 2026-08-24), `Authoring-Agent: claude`; the body's figure-source table and the sidebar's "Claude Opus 5 session".
- Claude revisions: #749 (`c10e3a8b`), #780 (`7b1937ae`), #803 (`6a016ef4`, issue #745), #1124, #1148, #1153, #1357 (takeaway 4). Ledgers: `plans/759/autofix-was-the-whole-cost-ledger.md`, `plans/correctness-pass-2026-10-06/autofix-was-the-whole-cost-ledger.md` (R9 to R11, R13: the Codex session totals and subscription status are author-attested).
- Codex voice rewrite: PR #1141 (`424a4e79`); `autofix-voice-comparison.md` § "Repairs after owner review" and § "Validation and owner judgment" (owner-requested argument lines restored; the owner suggested "ended"; the owner approved the revised draft).

Record notes: "the Codex session costs I supplied" rests on the post's own "author-attested" label; no artifact carries the figures. The post's sidebar says the Claude session "researched this post", which understates it: the record shows a Claude session also wrote the first draft. That sidebar is reader-facing content outside this issue's scope; flagged here only.

### `every-reviewer-was-right`

> The decisions this post examines are mine; at my direction, Claude wrote and revised the draft from the pull requests and the session transcript recording my answers. When Codex rewrote it in my voice, I caught two passages where it changed my meaning and had them corrected. I chose the four figures, decided where each would appear, and determined what each would communicate, and I approved the published piece and later updates.

Drafted from:

- First draft: PR #1005 (`f715b81b`, 2026-09-06), `Authoring-Agent: claude`, `Co-Authored-By: Claude Fable 5.1`; the body says the five prompts, the owner's answers and the owner's typed messages were read from the authoring session's raw transcript.
- Claude revisions: #1006 (`679f406c`) and #1007 (`fba75a07`), each "from a reader's review"; #1048 (`32be9d4f`), from "an editorial read-through"; #1124; #1148; #1153; #1357 (takeaways 1 and 3). Ledger: `plans/correctness-pass-2026-10-06/every-reviewer-was-right-ledger.md`.
- Codex voice rewrite: PR #1134 (`ef776be1`); `every-reviewer-voice-comparison.md` (two changed meanings "caught by the owner" and repaired; "That question is rigged" restored per the owner's review; the owner approved the shorter takeaways and conditionally approved the draft). Deck punctuation trim at the owner's request: #1160.

Record notes: the two reader reviews behind #1006 and #1007 are not attributed to anyone.

### `how-a-responsive-fix-became-an-astro-migration`

> At my direction, Claude wrote the first draft, and its later fact-checks corrected several claims about the original problem and the framework comparison. When Codex rewrote the piece in my voice, I sent it back with notes, kept the deck's account of what I'd actually observed, and made the final calls on framing and emphasis. I approved the result and reviewed Claude's later sentence corrections and revised first key takeaway.

Drafted from:

- First draft: PR #317 (`740693b6`, 2026-05-09), `Authoring-Agent: claude`, `Co-authored-by: Claude Opus 4.7 (1M context)`.
- Claude revisions: #338, #740 (`28e81a79`), #800 (`0ef7938d`), #1124 (R1, R2, R5: the bake-off claim, the opening symptom and the Gatsby comparison), #1153, #1357 (takeaway 1). Ledgers: `plans/759/how-a-responsive-fix-became-an-astro-migration-ledger.md`, `plans/correctness-pass-2026-10-06/how-a-responsive-fix-became-an-astro-migration-ledger.md`.
- Codex voice rewrite: PR #1142 (`ebd176bf`); `responsive-voice-comparison.md` § "Owner review applied" and § "Cross-agent review corrections" (the owner's decision to keep the deck's "put me face to face with a blog generator", which rests on the owner's account, and the "touching all of it" pullquote; the "chassis" closing is an editorial change after the owner-approved ending).

Record notes: none beyond the shared limits.

### `html-mockups-as-spec`

> At my direction, Claude wrote the first draft and later corrected its account of the design history. I chose the Mondrian reference, the process diagram, and the shipped editor screenshot, decided where each would appear, and determined what each would communicate about how the design process led to the finished product. I took Codex's voice rewrite through three rounds of feedback, chose the wording of later corrections, and approved the published version and later changes.

Drafted from:

- First draft: PR #380 (`3cc6967d`, 2026-05-20), `Authoring-Agent: claude`, `Co-authored-by: Claude Opus 4.7 (1M context)`.
- Claude revisions: #741 (`89e82c1d`), #801 (`c176326f`), #997, #999, #1124, #1129 (the owner's example: the post explained the design replacement four times), #1148, #1357 (takeaway 1). Ledgers: `plans/759/html-mockups-as-spec-ledger.md`, `plans/correctness-pass-2026-10-06/html-mockups-as-spec-ledger.md` (R23: who built the mock-ups rests on the owner's recollection).
- Codex voice rewrite: PR #1131 (`86b5af34`): "The owner reviewed the complete draft through three follow-ups and authorized shipping"; the duplicate caption removed "at the owner's request". Later corrections in PR #1138: the one-word "expensive" change the owner requested and the FFB attribution the owner chose (`genesis-voice-comparison.md` § Cross-post correction; #1148: "the owner's final FFB wording").

Record notes: no voice-comparison doc exists for this post; the owner's review is recorded only in the #1131 body.

### `perfect-score-wrong-axis`

> At my direction, Claude wrote the first draft from review records the agents had collected, and Codex later restructured and rewrote it in my voice. I approved the new structure and suggested the sentences about review capacity. I chose all five figures, decided where each would appear and what each would communicate, and approved the published piece, including Claude's later fixes and three revised key takeaways.

Drafted from:

- First draft: PR #599 (`4c405b81`, 2026-07-30), `Authoring-Agent: claude`, `Co-Authored-By: Claude Fable 5` ("three parallel read-only agents pulled the mergepath primary sources").
- Revisions: #601 to #606 (Claude: same-day links, a figure and quote capitalization) and `af8bdfa3` (figures), #805 (`957b9777`, issue #743), #823 (`5d0261f7`), #1124, #1357 (takeaways 2 to 4). Ledgers: `plans/759/perfect-score-wrong-axis-ledger.md`, `plans/correctness-pass-2026-10-06/perfect-score-wrong-axis-ledger.md`.
- Codex voice rewrite: PR #1156 (`68827d18`); `perfect-score-voice-comparison.md` (the owner approved the "Since the batch" structure; "the owner-suggested sentences preserve the original capacity coupling"; the owner approved the complete draft). Deck: #1160, "the owner's approved copy".

Record notes: the comparison records five meaning or provenance errors caught during PR review, after the owner approved the draft; those repairs are among the "later fixes". `af8bdfa3` (three figures) carries no agent trailer.

### `silence-is-not-an-approval`

> At my direction, Claude wrote the first draft from the issue and pull request records, and I requested the Codex editorial review that led to its restructuring. I corrected several sentences myself and approved the original publication. When Codex later rewrote it in my voice, my feedback determined the framing, wording, and final deck, and I approved that version and reviewed Claude's later revisions to all four key takeaways.

Drafted from:

- First draft and publication: PR #1037 (`913c2933`, drafted 2026-09-23, published 2026-10-01), `Authoring-Agent: claude`, `Co-Authored-By: Claude Opus 5.5`. The body: items 1 to 7, including the restructure that "applies a Codex editorial review", were "requested and approved by the owner on 2026-09-30"; "the owner reviewed and approved the post on 2026-09-30".
- Owner's sentences: `plans/silence-is-not-an-approval-ledger.md` § D7 and § I5 ("Corrected 2026-09-30 (author review)") and § I8 ("the owner's three correction sentences", plus the two revisions the owner made to the brevity pass). The § I8 merge-gate sentence survives verbatim in the current text.
- Claude audit: #1130 (`6cd7f6fa`); `plans/correctness-pass-2026-10-06/silence-is-not-an-approval-ledger.md`.
- Codex voice rewrite: PR #1140 (`3facf9f5`); `silence-voice-comparison.md` ("The owner conditionally approved the listed repairs"; an owner copyedit). Deck: #1160. Takeaways: #1357 (all four).

Record notes: "corrected several sentences myself" rests on § I8's description of the sentences as the owner's; the record doesn't show whether the owner typed them or dictated them in a session.

### `six-prs-one-bug-agent-failure-modes`

> At my direction, Claude wrote the first draft and later corrected its chronology and factual claims. I chose the comparison screenshots and the rendering-path diagrams, decided where each would appear, and determined what each would communicate. When Codex rewrote the piece in my voice, I sent it back with changes to the ending and deck, then approved it and reviewed Claude's later corrections and its revised first key takeaway before they went live.

Drafted from:

- First version: `402e4961` (2026-04-04), committed directly to `main` with no pull request and no agent trailer, under the test-fixture identity `nathanjohnpayne <nathan@nathanjohnpayne.example>`, alongside a 682-line blog generator and agent-doc edits.
- Claude revisions: #338, #798 (`29d864ed`, issue #744), #799 (`06f3b96e`), #918 (`cdffd310`), #1023 (`29fe3d24`), #1124, #1129 (the owner's example: the post repeatedly reconstructed which invoice path the fix reached), #1148, #1357 (takeaway 1). Ledgers: `plans/759/six-prs-one-bug-agent-failure-modes-ledger.md`, `plans/correctness-pass-2026-10-06/six-prs-one-bug-agent-failure-modes-ledger.md`.
- Codex voice rewrite: PR #1132 (`36dc9fdd`): "Nathan reviewed the prose, R44 evidence, ledger totals, and all three committed files and approved filing this PR"; `six-prs-voice-comparison.md` § "Owner feedback applied" (ending, thesis restorations, three-sentence deck).

Record notes: the first-draft author is the thinnest record in the collection. That identity is a test fixture's leaking into the checkout's git config (the mergepath#777 leak PR #599 describes), so it doesn't identify a person or an agent. The post says its quoted prompts and its "Codex Task" document are the owner's; the ledgers rate those UNPROVABLE (unpublished session log), so the draft didn't rely on them. The approved statement credits Claude with the first draft, at the owner's direction.

### `the-product-did-not-travel`

> At my direction, Claude wrote the first draft from the event data and my account of both events, and Codex later rewrote it in my voice. I chose the six game screenshots, decided where each would appear, and determined what each would communicate about the cruise and Bodega Bay. I supplied the exact wording of the Sunday passage, had cut thesis lines restored, and removed four words, and I approved the rewrite and reviewed Claude's later fixes and two revised key takeaways.

Drafted from:

- First draft: PR #1057 (`0039ef12`, 2026-09-24), `Authoring-Agent: claude`, `Co-Authored-By: Claude Opus 5.5` (figures from production Firestore, PostHog and git history; "Final editorial pass by Fable"; an interim title "per Nathan").
- Owner's account: `plans/correctness-pass-2026-10-06/the-product-did-not-travel-ledger.md` R4, R5, R8 (the host's prompt rewrites, the printed guides and the owner's absence rest on the owner's account).
- Revisions: #1067 (`a6c5e081`, Codex: retitle and tighten), #1068 (`53a9611e`, Claude: thesis restored as marked inference), #1130 (Claude audit), #1357 (takeaways 1 and 4). Ledger: `plans/the-product-did-not-travel-ledger.md`.
- Codex voice rewrite: PR #1143 (`c1d186ab`): "Applied the owner's exact Sunday sentence in body and pullquote"; `product-travel-voice-comparison.md` § "Final owner review applied" (thesis judgments restored; the owner's four-word cut, "There was no prize") and § "Cross-agent review corrections" (the owner kept the "Kim rewrote 65" sentence).

Record notes: none beyond the shared limits.

### `the-subagent-said-it-was-unsafe`

> I wrote the first draft and directed every revision, including the argument, evidence, and visuals. Claude checked my account against the OpenAI report and the Mergepath records, corrected ten claims, and applied an editorial pass Codex proposed. I kept my interpretation of the subagent's objection, chose the figure, decided where it would appear, and determined which headlines belonged in it, and I reviewed and approved the complete piece, including the tracking-issue links Claude later added at my request.

Drafted from:

- Owner draft: `plans/the-subagent-said-it-was-unsafe-ledger.md` header ("Owner draft received untracked on 2026-10-26 (SHA-256 `57d0c6dd…bd38529`)"); PR #1465 body ("the owner's draft, verified and corrected for accuracy").
- Accuracy pass and editorial pass: PR #1465 (`29bb4f0d`; commits `508ee9e4`, `338eccc4`, `38c5212f`), `Co-Authored-By: Claude Opus 5.5`; the ten-row correction table; the `nathanpayne-codex` editorial review 5660512452 applied in `38c5212f` with one narrowing; ledger § F.
- Owner decisions: "Keep the Outvoted framing as written; it's my interpretation" (ledger § A, "Outvoted" row, 2026-10-26); the headline selection rule (PR #1466, `e4113051`); the October 28 update "at the owner's request" with "starting" chosen over "building" in owner review (PR #1470, `581af594`; ledger § G).

Record notes: the draft raised two questions for the owner, and the approved statement answers both in his words. First, the repository calls the draft "the owner's draft" but doesn't show how it was produced; the owner states he wrote it. Second, neither the #1465 body nor its conversation records the owner approving the full final text, which the `/how-i-write/` copy says happens for every piece; the owner states he reviewed and approved the complete piece, and the approval comment is the record of that.

### `two-blues-one-composition`

> The design decisions in this post are mine, and at my direction Claude wrote the first draft from the palette tickets and its own color sampling. I chose the painting reproductions and color-comparison figures, decided where each would appear, determined what each would communicate, flagged an overclaim about the source images, and chose a pullquote. Claude and Codex corrected the remaining claims, Codex rewrote the piece in my voice, and I approved that version and reviewed Claude's later corrections and its revised key takeaway.

Drafted from:

- First draft: PR #505 (`d5d39bf6`, 2026-06-12), `Authoring-Agent: claude`, `Co-Authored-By: Claude Fable 5`; Claude's editorial pass #507 (`e949693a`) and figures #508 and #509 (`Co-Authored-By: Claude Fable 5`).
- Corrections: #806 (`44a78273`, Claude, issue #742), #1010 (`43ba91bc`, Codex: unsupported aging attribution removed), #1025 (`c65b616c`, Claude), #1124 (Claude: R1 to R3, the Commons reproduction and the "two museum digitizations" tally), #1129 (the owner named "Two Blues on reproductions as evidence" as an overclaim), #1153, #1357 (takeaway 3). Ledgers: `plans/759/two-blues-one-composition-ledger.md`, `plans/correctness-pass-2026-10-06/two-blues-one-composition-ledger.md` (R5, R7, R8, R12 rest on the owner's testimony; R36 and #498's decisions D1 to D4).
- Codex voice rewrite: PR #1136 (`962d5ca0`): "The owner reviewed the draft and approved the final wording and pullquotes"; `two-blues-voice-comparison.md` (the owner chose the room line as a pullquote and approved the plumbing replacement).

Record notes: "The design decisions this post describes are mine" rests on the post's own division of labor ("Claude wrote the tickets. Codex implemented them. I made the design calls.") and the decision checkboxes in #498; the record doesn't show who ticked the boxes.

## Record gaps

These describe the repository record the drafts were built from. The owner's approval comment speaks to several of them in his own words: it states that he directed each first draft, chose the figures, and reviewed the later corrections and takeaways, and that he wrote the first draft of *The Subagent Said It Was Unsafe* and approved the complete piece.

- **First-draft briefs.** No post links the session or prompt it was drafted from, so topic choice and briefing are unrecorded for all eleven.
- **Six PRs, One Bug.** The April first draft's author is unrecorded.
- **The Subagent Said It Was Unsafe.** How the owner's draft was produced, and whether the owner approved the full #1465 text, were unrecorded in the repository; the approval comment now states both.
- **Post-approval agent changes.** Claude's cross-agent review fixes after each October approval, and the #1357 takeaway rewrites on 2026-10-13, have no recorded owner review. The approved statements say the owner reviewed them; the approval comment is the record of that review.
- **Owner approvals are agent-recorded.** Every approval cited in the draft sources is an agent's record of the owner's decision. The exception is the approval comment on #1508, which the owner posted.
- **Author-attested figures.** Autofix's Codex session costs, and several post claims the ledgers rate UNPROVABLE (Genesis U6; Six PRs' prompts; Two Blues R5, R12), rest on the owner's account; the drafts cited only those an owner action could stand on.
- **Autofix sidebar.** It says the Claude session "researched this post"; the record shows the session also wrote the first draft. Changing the sidebar is outside #1495's "no other content changes" rule.
