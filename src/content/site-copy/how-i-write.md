---
description: "AI agents draft my posts and case studies and check claims against available evidence. I direct the arguments, select the evidence and visuals, and approve every published piece."
ogDescription: "How AI agents write my posts and case studies—and how I shape the arguments, choose the visuals, and decide what gets published."
---

AI agents write most of the posts and case studies on this site. I choose the stories, shape the arguments, and decide which evidence matters. Claude usually writes the first draft from my direction, my account of what happened, and the underlying record—commits, pull requests, issues, and session transcripts. Claude and Codex revise from there, with AI reviewers flagging problems for them to address. Occasionally, I write the first draft myself.

My role isn't limited to approving the result. I send drafts back when an argument overreaches, the wording changes my meaning, or the framing misses what matters. I also choose every image, screenshot, and figure in a post or case study and decide where it appears, what appears in it, and how it supports the argument. Agents may generate graphics or assemble comparisons, but the visual choices are mine. My taste and editorial judgment shape the work throughout, not just at the end.

One revision pass focuses on voice. It draws on my notes and passages I've selected as examples of how I want the writing to sound. There's an important distinction: so far, those examples are agent-written revisions I've approved, not prose I've written independently. The voice pass reflects what I've approved, which isn't necessarily the same as how I'd write independently.

Another pass checks the facts. Every post and case study has a facts ledger in the site's repository. An agent records claims from the piece, checks them against the available evidence, and marks them as supported, wrong, stale, or unprovable. That isn't a blanket guarantee of accuracy or an assurance that every claim in the current version has been checked. A ledger covers the text as it stood when it was checked, and some claims depend on my firsthand account, which no repository can independently verify.

I have the final say on what gets published. The workflow explicitly prohibits agents from fabricating my involvement, motives, or opinions. I read every piece in full and approve it before publication, including the argument, prose, and visuals. That review doesn't stop with the first version. I also review subsequent changes—including key takeaways, card summaries, captions, and other public-facing copy—before they go live.

GitHub records many of my editorial decisions, though not every review leaves a separate approval record. The repository documents the process, but it isn't a complete account of my involvement.

The distinction matters: agents produce much of the prose, but the editorial choices and responsibility are mine. I won't claim to have written sentences I didn't write, but I won't disown an argument because an agent typed it, either. That includes the decisions that turn out to be wrong.

Every post and case study ends with a **"How this was written"** statement documenting what the agents and I did for that piece. This page outlines the general practice; each statement provides the specific account. The full process is public: <a href="https://github.com/nathanjohnpayne/nathanpaynedotcom/blob/ec27898f319cedad309652498db50b1722215aac/docs/blog-writing-workflow.md" target="_blank" rel="noopener">Blog drafting and voice review</a>.

## When the text changes

Each post and case study has a fingerprint of its text and its "How this was written" statement. When either changes, the site's tests flag the change for review.

I confirm the statement still describes how the piece was made, revising it if needed, before the fingerprint is updated. The check catches changes that need another look; it doesn't prove that I reviewed the piece or that the statement and article are accurate.

## What this page covers

This disclosure covers posts and case studies, not every word on the site. Agents also write and edit the homepage, résumé, and other site copy, which don't carry individual disclosures. I also direct and review that material before publication. This page doesn't cover writing I publish elsewhere or how the software itself was built. Each case study addresses the development of its own project.
