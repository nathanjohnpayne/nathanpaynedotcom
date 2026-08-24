---
title: "1,513 Lines for One Dash: The Requirement Nobody Questioned"
seoTitle: "1,513 Lines for One Dash"
shortTitle: "The Requirement Nobody Questioned"
description: "A one-sentence style rule turned into 1,513 lines of code and 57 findings across 24 review rounds that dipped but never converged. Auto-fixing violations was 17% of the implementation and tests combined—and nearly all of the work that would not finish. Cutting one unexamined capability ended the loop."
seoDescription: "One style rule drew 57 findings across 24 non-converging review rounds. Auto-fix was 17% of the implementation and tests combined, and nearly all of the churn. Replacing the tool halved the code rather than eliminating it."
category: "Agent Systems"
author: "Nathan Payne"
date: 2026-08-24
tags: ["Product", "Engineering", "Scope", "Decision Making", "AI"]
image: "/og/blog/autofix-was-the-whole-cost.png"
keyTakeaways:
  - "The expensive part of a requirement is rarely the part stated in it, and it is not always the largest part. Auto-fixing violations was 17% of the implementation and tests combined, and nearly all of the work that would not converge—scope can be cheap to build and ruinously expensive to finish."
  - "Findings per review round is a burn-down chart for quality work. A series that dips and rebounds without reaching zero means the work is not converging, and more rounds without changing the approach were unlikely to change it. The external-review lane alone recorded 524,554 tokens across 17 loops that nobody approved as a line item."
  - "Buying instead of building relocates complexity rather than removing it. The honest number here was 2,453 lines becoming 1,224—a halving, not the two-hundred-fold collapse the headline version implies."
  - "A migration that reports success is not the same as a migration that works. Running the old and new tools side by side and comparing outputs caught a silent gap that would have dropped 50 reader-facing fields out of lint coverage."
pullquotes:
  - text: "Auto-fix was not most of the surviving code. It was most of the trust burden, and nearly all of the work that would not converge."
    label: "The correction"
    accent: red
  - text: "Twenty-four rounds, fifty-seven findings, and round twenty-four still producing two. That is not a long tail approaching zero."
    label: "The signal"
    accent: yellow
  - text: "You do not escape the complexity by buying it. You relocate it, and the trade is worth making when what remains is boring."
    label: "The honest number"
    accent: blue
sidebar:
  - type: mermaid
    title: "Where the cost actually sat"
    description: "Recognizing the forbidden pattern was trivial. Deciding what counts as prose was legitimately hard. Automatically fixing violations required proving each edit was safe—17% of the implementation and tests combined, and nearly all of the work that would not converge."
    content: |
      graph TD
          A["Requirement:<br/>no space beside an em dash"] --> B["Detect it<br/>~1 line"]
          A --> C["Know what counts as prose<br/>legitimately hard"]
          A --> D["Fix it automatically<br/>never requested, never questioned"]
          D --> E["Prove every edit is safe"]
          E --> F["17% of the lines<br/>57 findings across 24 rounds"]
          D --> G["Cut this one capability"]
          G --> H["Loop ended<br/>in a single commit"]
          style A fill:#d4a84b,stroke:#a07830,color:#fff
          style B fill:#b8ddb8,stroke:#4a8a4d,color:#333
          style C fill:#d4a84b,stroke:#a07830,color:#fff
          style D fill:#e8b4b4,stroke:#993d3d,color:#333
          style E fill:#c75c5c,stroke:#993d3d,color:#fff
          style F fill:#c75c5c,stroke:#993d3d,color:#fff
          style G fill:#b8ddb8,stroke:#4a8a4d,color:#333
          style H fill:#7bc67e,stroke:#4a8a4d,color:#fff
    caption: "Three capabilities arrived as one requirement. Only the third was optional, and it was the one the project could not finish."
  - type: text
    content: |
      **A note on counting tokens.** The figures in this post come from three
      separate systems—a review ledger, Codex CLI session counters, and Claude
      Code session telemetry—and they are not directly comparable. Cached input
      reads dominate raw totals: one session here processed 848 million tokens
      including cache reads, against 1.78 million of output. Cached reads are
      discounted, but the discount varies by provider and plan, so a raw
      "tokens processed" total is a poor proxy for either effort or spend.
      Output and fresh input track the real work more closely, which is why
      those are the numbers quoted above.
    caption: "Why the headline figures are output and fresh input rather than totals."
  - type: text
    content: |
      **What it would have cost at API list rates published on August 24, 2026.**
      None of this was billed—every session ran under a subscription—so the
      following is a counterfactual, not an invoice. Both providers can change
      these rates, and OpenAI currently describes the
      [GPT-5.6 Sol](https://developers.openai.com/api/docs/models/gpt-5.6-sol)
      prices as promotional.

      Two Codex [GPT-5.6 Sol](https://developers.openai.com/api/docs/models/gpt-5.6-sol)
      sessions, at $4/M fresh input, $0.40/M cached and
      $20/M output: **$60.81** for the [PR #686](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/686) hardening work and **$59.95** for
      the Vale migration.

      The [Claude Opus 5](https://platform.claude.com/docs/en/about-claude/pricing)
      session, at $5/M input, $10/M cache writes on this
      session's one-hour cache TTL, $0.50/M cache reads and $25/M output:
      **$591.90**—$0.02 fresh input, $130.61 cache writes, $416.86 cache reads,
      $44.41 output. Cache reads alone are 70% of it.

      Priceable total: **about $712.66.** The two remaining Codex sessions ran on
      `gpt-5.3-codex-spark`, which has no established public API equivalent, and
      the review ledger records only combined totals rather than the category
      splits pricing needs.

      Two warnings. This is not the arc's cost: the Claude session also reviewed
      the Vale rollout, researched this post, and did unrelated work, so it
      over-attributes. And it is not a model-to-model comparison—the sessions
      covered different amounts of work under different cache policies, so the
      gap between them says nothing useful about relative cost per unit of work.
    caption: "An API-equivalent counterfactual. Nothing here was invoiced."
---

The requirement was one sentence, from the Chicago Manual of Style: an em dash takes no space on either side.

Enforcing it on this site produced 1,513 lines of code, a 940-line test suite, and 57 findings across 24 review rounds that dipped but never converged. Then I removed the capability responsible for the churn, and the work finished in a single commit.

The interesting part is not that I overbuilt something. It is *which* part was expensive, and in what currency. The requirement contained three capabilities bundled together, nobody had ever separated them, and one of them—the one nobody asked for—turned out to be a small fraction of the code and nearly all of the work that would not finish.

## Three Capabilities Wearing One Requirement

Written out, "enforce this style rule" meant:

1. **Recognize the forbidden pattern.** One line of pattern matching. Worked on day one, never caused a problem.
2. **Know what counts as prose.** Legitimately hard, and unavoidable. A naive search across the site returns about 250 matches; thirteen are real. The rest are structure—code samples, configuration keys, link addresses, table borders, a password-manager entry whose name contains a dash and must never be edited. Getting this wrong means the tool cries wolf and people stop running it.
3. **Fix violations automatically.** Never requested. Never defended. It arrived attached to the requirement the way features often do, and nobody ever asked whether it was worth having.

Here is the part I got wrong when I first wrote this up, and it is worth correcting in public because the wrong version is the more flattering story. I claimed auto-fix had produced *most of the code*. It had not. Measured against the commit that removed it, the linter and its test suite fell from 2,917 lines to 2,417—a net reduction of **500 lines, or 17% of the implementation and tests combined**. Taken separately it is 12.6% of the linter and 23.7% of the tests.

What it produced instead was most of the *trust burden*, and nearly all of the work that would not converge. Those are different claims, and the second is both true and more interesting: a capability can be a modest share of a codebase and still be the reason the project cannot finish.

## Why "Just Fix It Automatically" Was the Expensive Part

This is worth making concrete, because "automatically fix formatting" sounds like the *easy* half to anyone who has not built one.

Take the text `word **—** next`. In Markdown, `**` makes text bold, so this is a bolded dash with spaces around it. It has the violation, so the tool should flag it. Now let the tool fix it by closing up the spaces:

```
word **—** next     →     word**—**next
```

The dash is fixed. The bold is gone. With no spaces around them, those asterisks stop meaning "bold" and become literal asterisk characters on the page. The tool set out to correct punctuation and silently corrupted the formatting instead.

So a tool that edits your files has to prove, after every single edit, that it changed only what it meant to change. That proof was the real product: re-parse the document after each fix, compare the before and after structures, and reject the whole batch if anything moved. It was also all-or-nothing—one unfixable dash in a configuration key meant every other fix in that file was abandoned too.

**Detecting a problem is cheap. Being trusted to change someone's work is expensive.** That gap is where the budget went, and it is a gap that shows up well outside linting: recommending an action versus taking it, flagging a charge versus reversing it, drafting a reply versus sending it. The detection demo is a week. The permission to act is the product.

## The Signal I Had and Did Not Read

The work went through automated code review—the [Codex GitHub App](https://learn.chatgpt.com/docs/third-party/github) and [CodeRabbit](https://www.coderabbit.ai/), both reviewing every revision. I pulled the record from the API rather than trusting my own notes, which turned out to matter: a note I wrote mid-project had the round count wrong, and I only caught it re-deriving the numbers for this post.

Across [the PR that tried to make the auto-fixer safe](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/686): 57 findings across 24 review rounds. Findings per round, in order:

```
3 3 3 1 3 4 3 3 2 1 2 5 2 3 3 1 1 1 1 5 2 2 1 2
```

That series does not converge. It is not literally flat—the first twelve rounds average 2.75 findings and the last twelve average 2.0, a shallow decline. But it dips and rebounds rather than approaching zero: round 20 produced five findings, more than round 3, and round 24 was still producing two. And by my own count during the work, roughly half the later fixes were repairing the previous fix rather than closing new ground.

A gentle drift that never lands is not a long tail. Extrapolate 2.0 findings a round and the work simply does not finish.

This is a burn-down chart that is not burning down fast enough to land, and it is the same shape as a sprint where every story closes and the backlog never quite shrinks. The team is busy, the tickets close, the metric that would tell you it is not working is one nobody is plotting.

It costs one query. I should have been reading it from round six instead of round twenty-four, and the only reason I looked at all is that someone asked me directly whether the work was converging. The honest answer was no, and the evidence had been sitting in the record the whole time.

**Effort is not progress, and "we closed everything raised" is not the same as "we are getting closer to done."** I have written [a whole post about the second half of that](/blog/perfect-score-wrong-axis/), and I still walked into the first half.

## The Measurable Floor

Because this work ran through automated reviewers, the cost is unusually measurable. Most rework is invisible—hours absorbed into a sprint, never itemised. Here there are receipts, from two different systems.

The external-review lane keeps a ledger with per-run token counts. It covers four of the pull requests in this arc—[#668](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/668) (13 loops, 434,420 tokens), [#678](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/678) (2 loops, 55,514), [#681](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/681) (1 loop, 16,774), and [#682](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/682) (1 loop, 17,846). **524,554 tokens across 17 review loops.**

Note which pull request that is *not*. The 24-round story above is [#686](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/686), the attempt to make auto-fix safe. It never completed a ledgered external-review run, so none of its cost appears in that figure. The 434,420 tokens belong to [#668](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/668), the pull request that introduced the tool in the first place.

The authoring side is larger and comes from separate telemetry per provider. The two Codex CLI sessions associated with [#686](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/686) recorded **2.27 million fresh input tokens and 285,100 output tokens**, of which 99,453 were reasoning tokens. The Claude Code session that finished the work and carried out the migration logged **1.78 million output tokens across 1,872 assistant turns**.

Every one of those is a floor or an upper bound rather than a clean attribution, and the direction differs by figure. The ledger is a floor: it excludes the 28 reviews from the Codex GitHub App, the 63 from CodeRabbit, the 10 external-review loops on the [Vale rollout](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/720), and the sessions that wrote the original tool. The session counters are upper bounds: the #686 hardening session opened with unrelated backlog triage, so not all of it belongs to this feature. Across all seven pull requests the arc drew **256 review submissions and 126 inline findings**—counted from the GitHub API's `pulls/{n}/reviews` for the first and top-level entries in `pulls/{n}/comments` for the second, summed over pull requests [#668](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/668), [#678](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/678), [#681](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/681), [#682](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/682), [#686](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/686), [#720](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/720), and [#721](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/721). Reply comments on an existing thread are excluded, so a finding is counted once no matter how long the discussion under it ran.

I am deliberately not extrapolating a grand total. I could multiply the uninstrumented reviews by the measured average and produce a confident-looking number, and it would be invention.

Dollars are a similar problem, but a tractable one if the labelling is honest. Priced at [OpenAI](https://developers.openai.com/api/docs/models/gpt-5.6-sol) and [Anthropic](https://platform.claude.com/docs/en/about-claude/pricing) list rates published on August 24, 2026, the three sessions with the necessary category splits come to about **$712.66**. Nothing was invoiced; every session ran under a subscription. That figure over-attributes, because the Claude session covered the Vale rollout and the research for this post as well, and it omits two sessions on a model with no public API equivalent. The sidebar carries the breakdown and the caveats. The estimate is worth having because it translates otherwise abstract token volume into familiar units—without pretending it was the feature's bill.

The point survives the imprecision: **a requirement nobody questioned consumed a large amount of compute, and none of it was visible as a line item.** Nobody approves "spend 500,000 tokens re-reviewing an auto-fixer." It accrues one reasonable-looking round at a time, which is exactly why the shape of the series matters more than any individual round did.

## Cutting the Capability Nobody Asked For

The decision was to make the tool report-only. It names each violation and exits. It does not touch your files.

That cut reduced the two files by a net 500 lines—the proof, and the tests that exercised it—and the review loop that had run 24 rounds without converging ended immediately. The size of the reduction was never the point. The point was that it removed the capability creating the proof obligation behind the findings.

The reasoning was not really technical. A punctuation nit should not block shipping, and what I actually wanted was a list to clean up later—not a tool with permission to rewrite my published writing. Once "rewrite" was off the table, the expensive proof had nothing left to protect.

The generalisable version: **when a project will not converge, check whether it is defending a capability nobody has justified.** Cost tends to concentrate in the parts of scope that were never argued for, precisely because nothing was ever argued about them.

## The Second Decision, Which Was a Different Question

Cutting auto-fix ended the churn. It did not address why I was maintaining a prose linter at all, and that is a separate decision with a separate justification—worth keeping distinct, because conflating them makes "we replaced it with an off-the-shelf tool" sound like the fix for a convergence problem it had nothing to do with.

The first decision stopped the bleeding. The second reduced what I owned.

With auto-fixing gone, what remained was still 1,513 lines of custom code doing something a mature off-the-shelf tool already does: [Vale](https://vale.sh/), an open-source prose linter. I moved to it.

The tempting summary is *1,513 lines became 7*—the em-dash rule in Vale is seven lines of configuration. That summary is false, and the false version is why most build-versus-buy posts are useless.

The honest accounting:

| | Before | After |
|---|---|---|
| the rule itself | 1,513 lines | 7 lines |
| supporting adapter | — | 509 lines |
| configuration | — | 6 lines |
| tests | 940 lines | 702 lines |
| **total** | **~2,453** | **~1,224** |

A halving. Not a two-hundred-fold collapse.

**You do not escape complexity by buying instead of building. You relocate it.** The trade was still clearly right—what remains is boring, well-tested glue against one specific gap, rather than a bespoke engine with a rewrite-safety proof bolted to it. But anyone who promises the headline number is selling something, and the 509-line adapter is the part of this story worth understanding.

## Why the Adapter Exists, and Why It Nearly Did Not

Vale handles most of this site's content correctly. It does not check items in bulleted lists inside a post's metadata block.

On this site that is 117 such items across 37 files. Fifty of them are the pull quotes and key takeaways rendered prominently on every post—including the ones at the top of this one. Not internal metadata. Published, reader-facing writing.

The custom tool checked those. A straight swap would have dropped them out of coverage **and reported success**, because a tool that declines to look is indistinguishable from a clean result. The writing would still have been published; nothing would have been checking it.

That is the migration risk worth naming, because it is not specific to linting. Replacing a system with a better one routinely means quietly losing an edge case the old one handled, and the failure is silent by construction: the new system does not know what it is not doing, so it reports green.

It was caught because the rollout was deliberately split in two—[add the new tool alongside the old one and run both](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/720), then [remove the old one only after comparing them](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/721). Not because anyone was clever. Because the sequencing made the gap visible instead of leaving it to be noticed later, by a reader.

## "Proven Equivalent" Was Not Proven

The removal was described as landing after equivalence had been demonstrated. It had not been, quite—and this is the kind of claim worth checking rather than accepting, whether it comes from a vendor, a team, or your own earlier self.

Both tools had been compared on the current content, which was already clean. Zero findings versus zero findings proves nothing.

So before approving the deletion I took all 174 test cases from the suite being deleted, confirmed my harness reproduced the old tool's behaviour exactly, and ran every case through the new one.

**149 matched. 25 differed**—18 the new tool no longer catches, 7 it now flags where the old one stayed quiet.

Then the number that decides what any of that is worth: every affected pattern appears **zero times** across all 37 content files. So this was 18 capabilities retired, not 18 defects shipped. Retiring them was a good trade—those were exactly the cases that could not converge.

But it should be a *recorded* trade. I wrote the full comparison into [an issue](https://github.com/nathanjohnpayne/nathanpaynedotcom/issues/722) before the merge, because the deletion destroyed the only artifact that encoded the difference. Afterwards, recovering it would have gone from cheap to expensive. That is a five-minute habit that turns "we think this was fine" into something a future decision can actually stand on.

## What Transfers

Little of this is about linting.

**Unbundle the requirement before estimating it.** One sentence contained three capabilities with wildly different cost profiles. The one that could not converge was also the optional one, and nobody knew either fact—because nobody had listed them separately. Size and difficulty are not the same axis.

**Plot the thing that would tell you it is not working.** Findings per round, escaped defects per release, reopen rate. A shallow decline that never reaches zero is the dangerous shape, because it still reads as progress on any single round. Change the shape of the work rather than pushing harder. The metric that would have saved three weeks here cost one query.

**Ask what a capability is protecting.** The proof obligation that generated the findings existed solely to serve a feature nobody had defended. Requirements that were never argued for are where cost quietly concentrates, precisely because nothing was ever argued about them.

**Make migrations comparable, not just complete.** Run both, diff the outputs, record what you are giving up. A silent gap in a replacement system is the default outcome, not the unlucky one.

**And correct your own numbers in public.** The first draft of this post said auto-fix produced most of the code. It produced 17% of the implementation and tests combined, and nearly all of the work that would not finish. The second claim is the one worth carrying, and I only have it because someone checked the first against the commit history.
