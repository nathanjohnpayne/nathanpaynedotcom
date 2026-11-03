---
title: "My AI Disclosure Fails the Build"
seoTitle: "My AI Disclosure Fails the Build"
shortTitle: "My AI Disclosure Fails the Build"
description: "A disclosure that is true when published goes false when the text changes afterward, so every post and case study here carries its own statement of what agents did and what I did, and the site's tests fail when either changes without a re-stamp."
seoDescription: "Every post and case study here states what AI agents did and what I did. A SHA-256 stamp fails CI when text or statement changes unstamped."
category: "Agent Systems"
author: "Nathan Payne"
date: 2026-11-03
draft: false
tags: ["AI", "Disclosure", "Agent Governance", "Writing", "Building This Site"]
image: "/og/blog/my-ai-disclosure-fails-the-build.png"
keyTakeaways:
  - "A disclosure is a claim about one version of the text. After an agent revises the piece, the statement at the bottom can be wrong without anyone lying."
  - "A SHA-256 stamp binds each piece's reader-facing text to its AI-use statement. Change either one, and the test fails until I confirm the statement and re-stamp. The statement is hashed too, so a reworded disclosure can't slip past."
  - "The stamp shows that the covered text and the statement match the recorded fingerprint. It doesn't show the statement is accurate or that I confirmed it; my confirmation is a workflow rule the hash can't prove. That judgment stays mine; the check only makes it hard to skip."
  - "Specific statements give readers, including the ones evaluating me for jobs, a fair reason to discount the prose as evidence that I can write. I'd rather pay that than have the public record establish the gap first."
pullquotes:
  - text: "Nobody lied. The text moved and the disclosure didn't."
    label: "Stale"
    accent: red
  - text: "The hash isn't the approval. It's the tripwire."
    label: "The gate"
    accent: yellow
  - text: "The hash doesn't make that description honest. I still have to."
    label: "What it can't prove"
    accent: blue
sidebar:
  - type: text
    content: |
      Provenance. The Dartmouth findings are quoted from the advisory committee's report to the president (dated October 27, 2026), the president's "An Update on the Provost Review" (October 28), and The New York Times' report of October 28, all read on 2026-11-03; the provost's own description of his AI use is quoted from the Times. The headline figure shows Google News results for the articles from The New York Times, Valley News, Inside Higher Ed and The Washington Post, captured on 2026-11-03. Everything about this site comes from its public repository at commit `4d196f66`, issue #1490 and its sub-issues, and the pull requests that closed them, read on 2026-11-03. Dates are Pacific time.
    caption: "Where each claim comes from."
aiUse:
  statement: "I wrote the paragraphs this post is built from, chose the argument, and set its structure. At my direction, Claude built the facts ledger from the repository, the #1490 record, and the news coverage I supplied, then rewrote my paragraphs against that ledger, correcting five of my claims and cutting the text by a fifth. I directed the headline figure and chose its style; Claude selected the four articles, assembled the composite, and added it. I reviewed the draft, had Claude make four corrections to the Dartmouth framing and the technical claims, and approved the result."
  reviewed:
    content: "fedbbf3598a698785cf7dcc1f396734ea4d0f60b548eb1ec028b61b0638e4557"
    date: "2026-11-03"
---

On October 28, 2026, Dartmouth's provost [resigned](https://www.nytimes.com/2026/10/28/us/dartmouth-santiago-schnell-ai.html) after a [faculty-led review](https://president.dartmouth.edu/news/2026/10/update-provost-review) found that he had used AI to "meaningfully alter his writing" and had "failed to disclose his use of AI," in violation of at least one publication's requirement. One of the pieces was a Washington Post commentary about the use of AI to cheat in school, and the Post's policy bars submissions "created or manipulated with artificial intelligence," so disclosure alone would not have settled that one. Before the review concluded, he had said his AI use was limited to "language refinement, copy editing, improving clarity and organization and making writing processes more efficient." The [committee's report](https://president.dartmouth.edu/sites/president/files/2026-10/Advisory%20Committee%20Report%20to%20President%202026-10-27.pdf) found that his use "went beyond his other public descriptions" of it.

The headlines split between the undisclosed use and the use itself. The findings cover both, and what runs through them is the distance between his account and the record. That is not a disclosure that went stale; nothing in the report says his description was true when he gave it. But the same gap can open here without anyone intending it. Agents write and revise most of what I publish, and a disclosure that describes their work accurately on Monday can be wrong by Friday, after another round of revisions. So I made the disclosures something the site's tests check.

![Google News results for four October 28 stories, top to bottom. The New York Times: "A Top Dartmouth Leader Steps Down Over Undisclosed A.I. Use in Writings." Valley News: "Dartmouth provost resigns after review finds undisclosed AI use." Inside Higher Ed: "Dartmouth Provost Resigns Over AI Use." The Washington Post: "Senior official at Dartmouth College resigns over AI use." Two headlines name the disclosure; two name the use. Captured from Google News on November 3; the stack is my composite.](/blog/my-ai-disclosure-fails-the-build/img/news-headlines-google.png "Articles: [The New York Times](https://www.nytimes.com/2026/10/28/us/dartmouth-santiago-schnell-ai.html), [Valley News](https://vnews.com/2026/10/28/dartmouth-provost-resigns-ai-misconduct/), [Inside Higher Ed](https://www.insidehighered.com/news/governance/executive-leadership/2026/10/28/dartmouth-provost-resigns-over-ai-use) and [The Washington Post](https://www.washingtonpost.com/education/2026/10/28/senior-official-dartmouth-college-resigns-over-ai-use/).")

## Why a disclosure goes stale

A disclosure isn't a fact about a URL. It's a claim about one version of the text.

An agent revises a paragraph, tightens an argument, or rewrites a section. The statement at the bottom still describes the version I approved last week. Nobody lied. The text moved and the disclosure didn't.

This site's own record makes the problem concrete. Until November 1, the only authorship signal on a post was "Author: Nathan Payne." Behind that line: Claude wrote the first draft of all but one of the eighteen posts and case studies. In October, a correctness pass replaced post text with model revisions, and Codex rewrote ten of the eleven posts and all seven case studies in my voice. On October 13, Claude rewrote key takeaways on ten posts in a single pull request. I directed that work and approved the results. But directing and approving prose is not writing it, and the distinction belongs in the disclosure.

A statement that was accurate in August would have been wrong by November, three times over. And this repository is public. A disclosure that fell behind the revisions wouldn't just be incomplete; the commit history would contradict it.

## What the check covers

Every post and case study now carries a required `aiUse` field. It has two parts: a `statement`, a short first-person account of what agents did and what I did to produce the text as it stands, and a `reviewed` block holding a SHA-256 hash and the date I last confirmed the statement. An entry without the field fails the build, drafts included.

The design decision was what to hash.

Hashing only the Markdown body would have been easy, and it would have missed much of the prose. Case studies keep their decision records, constraints, and lessons in frontmatter. A rewritten decision could change the story without touching the body. So the hash covers the body and every frontmatter field except `aiUse` and eleven fields that hold ordering, publication state, presentation, or media paths: `homepageRank`, `draft`, `order`, `image`, and the like. That is an exclusion list, not an inclusion list. A new prose field is covered the day it's added, whether or not anyone remembers the stamp.

The statement is hashed too. Rewording the disclosure without changing the article invalidates the fingerprint, the same as rewriting the article. Only the `reviewed` block is left out, so the stamp doesn't try to hash itself. The payload is canonical JSON with sorted keys, so reordering frontmatter changes nothing.

A test recomputes the hash for every entry on every run, and CI runs that test before anything merges. When one doesn't match, the failure names the entry, prints the recorded and current hashes, and gives the remedy in order: confirm that the statement still describes the text, revise it if not, then run

```bash
npm run --silent ai-use:hash -- <path>
```

and paste the result. The same suite pins the edge cases. Change a key takeaway, and the stamp fails. Change `homepageRank`, and it doesn't. Reorder the keys, and nothing moves. Change only the statement, and it fails.

## Who gets to re-stamp

The hash isn't the approval. It's the tripwire.

An agent may draft or update a statement. It may not refresh the `reviewed` stamp until I've confirmed the statement in the pull request. The hash command's own documentation says it plainly: printing a hash is not a review.

Two more rules shape what a statement can say. An agent never edits a statement to describe less agent involvement than the record shows; where the record is thin, the statement says so. And the verbs are specific. "Edited" is reserved for text the record shows I changed. Where I read an agent's revision and accepted it, the statement says I reviewed and approved it. Vague labels are banned, because a label that covers everything from a comma to the whole article tells a reader nothing. "Claude wrote the first draft" and "Codex rewrote the piece in my voice" tell a reader something.

I also rejected shared templates. The plan as filed on November 1 called for a custom statement per piece. A revision that morning proposed two or three shared statements, with a custom one only where a piece's record differed. I reversed it four minutes later. A template is true only if every sentence in it is true of every piece that uses it, and the records differ exactly where a reader would care. One post I drafted myself. Another started with Claude, changed after reader feedback, was rewritten by Codex, and then needed two passages corrected because the rewrite had changed my meaning. A shared sentence would have hidden that.

Each statement sits where a reader will find it. An "AI use" link at the top of every post and case study jumps to a "How this was written" block at the end, above the author line, with a link to the general policy at [/how-i-write/](/how-i-write/). The layouts render both, so no entry can omit them; a route test checks every published piece; and the block prints. An agent drafted the eighteen statements from each piece's own record. I revised them and approved every one verbatim before merge. The system went live on November 1. The first re-stamp came the next day, when three sentences in two case studies were clarified and both statements had to be confirmed again.

## What it can't prove

A hash shows that the content matches the version it was computed from. It shows nothing about whether the statement is true.

An agent can compute a hash as easily as I can. If I approve a statement that understates what an agent did, the tests pass. If I say "confirmed" without rereading the piece, the tests pass. The fingerprint doesn't prove I reviewed the text, read the disclosure, or exercised any judgment at all, and presenting it as evidence of those things would be its own kind of understatement.

What it guarantees is narrower. A change to covered content can't merge without a visible change to `aiUse` in the same diff. The question of whether the statement still describes the text I'm about to publish lands in front of a reviewer every time the text moves. The check can't answer it. It makes it harder to skip.

That's the difference between this and a policy page. Most AI-use policies describe what someone should do. This one is enforced at the point in the workflow where the decision has to happen. The judgment is still mine.

The scope is narrow too. Statements cover posts and case studies. The homepage, résumé, and other site copy fall under the general policy. Writing I publish elsewhere inherits none of this; each venue has its own rules, and following them is my job, not the site's. And the repository isn't a complete record of my involvement. I don't leave a comment every time I read a paragraph. A missing review record doesn't show I skipped the review, and a current hash doesn't show I did it.

## What it costs

The first cost is friction. Every edit to covered text, a one-character typo fix included, needs a new stamp and a reread of the statement. I had already accepted that trade for the résumé, where each project entry carries a hash of the case study it summarizes and the rule is that nobody refreshes the stamp without the reread it records. Agents can find the changed files and compute the hashes. Reading the statement and deciding whether it's still true is the part I don't delegate.

The larger cost is what the statements tell a reader about my writing. A statement that says Claude wrote the first draft and Codex rewrote it in my voice is a fair reason to discount the prose as evidence that I can write. Some of the people reading are evaluating me for jobs. That reading is legitimate. The disclosure exists so they can make it.

There's a sharper version of the same point inside the voice pass. Codex works from passages I've chosen as examples of how I want the writing to sound. So far, those examples are agent-written revisions I approved, not prose I wrote on my own. The system is learning what I accept, which isn't the same as learning how I write.

What the posts do show is my choice of subject, the argument, the evidence I decided was sufficient, the figures I selected and placed, and the sentences I accepted, rejected, or sent back. They don't show that I could have produced the prose unaided. Those are different claims. I'll defend the first without pretending it establishes the second.

That's why the cost is worth paying. The Dartmouth review turned on a description of AI involvement that was narrower than the record. My record is public. If I claimed less than it shows, someone else could establish the difference. I'd rather describe the work accurately, including the parts that make me look less impressive.

The hash doesn't make that description honest. I still have to. What the check does is refuse to let an old description quietly survive a new version of the text. It puts the decision back in front of me, with a visible record that the text changed. That's a smaller guarantee than proving authorship. It's one I can actually enforce.
