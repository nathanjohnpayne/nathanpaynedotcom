---
title: "1,513 Lines for One Dash: The Requirement Nobody Questioned"
seoTitle: "1,513 Lines for One Dash"
shortTitle: "The Requirement Nobody Questioned"
description: "A one-sentence style rule grew to 1,721 lines of code and a 1,196-line test suite. Auto-fixing violations—never requested, never questioned—was 17% of the implementation and tests combined, and 42 of the 57 review findings named it. Cutting that capability ended the churn; a separate build-versus-buy decision then replaced the tool, with the migration proven rather than assumed."
seoDescription: "One style rule drew 57 review findings—42 naming the never-requested auto-fix. It was 17% of the implementation and tests. Cutting it ended the churn."
category: "Agent Systems"
author: "Nathan Payne"
date: 2026-08-24
tags: ["Product", "Engineering", "Scope", "Decision Making", "AI"]
image: "/og/blog/autofix-was-the-whole-cost.png"
keyTakeaways:
  - "The expensive part of a requirement is rarely the part it states. One sentence bundled three capabilities—detect the pattern, decide what counts as prose, rewrite the file—and the unrequested one was 17% of the implementation and tests but drew 42 of the 57 review findings by their own text. After the cut, not one further rewrite-safety finding was raised and the pull request merged within the hour—sixteen rounds after the series had already shown its shape."
  - "Automated review removes the friction that used to stop a loop. The arc logged 256 review submissions and 126 inline findings across seven pull requests, and none of that rework needed anyone's approval or appeared as a line item. When the next round is nearly free, the signal to stop has to come from the shape of the series."
  - "Buying instead of building relocates complexity rather than removing it. Moving to an off-the-shelf linter took the tool and its tests from 2,453 lines to 1,343—a 45% reduction, not a two-hundred-fold collapse: the rule did shrink to 7 lines, and a 509-line adapter absorbed the difference. Still the right trade, and the honest number is the one worth quoting."
  - "A migration that reports success is not the same as a migration that works. The replacement silently skips list items in a post's metadata block—127 prose-bearing items across 14 files, 57 of them reader-facing pull quotes and key takeaways like this one—while reporting green. Running both tools side by side caught it, and replaying all 174 retired test cases turned 18 lost checks into a recorded trade."
pullquotes:
  - text: "Auto-fix was 17% of the implementation and tests, and 42 of the 57 findings named it. The cost was never the line count. It was the trust burden."
    label: "The correction"
    accent: red
  - text: "Twenty-two rounds, fifty-four findings, and the last round before the cut still produced two. That is not a long tail approaching zero."
    label: "The signal"
    accent: yellow
  - text: "You do not escape the complexity by buying it. You relocate it, and the trade is worth making when what remains is boring."
    label: "The honest number"
    accent: blue
sidebar:
  - type: text
    content: |
      A note on counting tokens. The figures in this post come from three separate systems—a review ledger, Codex CLI session counters, and Claude Code session telemetry—and are not directly comparable. Cached input reads dominate raw totals: one session here processed 848 million tokens including cache reads, against 1.78 million of output. Cached reads are discounted at rates that vary by provider and plan, so a raw "tokens processed" total is a poor proxy for effort or spend. Output and fresh input track the real work more closely; those are the numbers quoted above.
    caption: "Why the headline figures are output and fresh input rather than totals."
  - type: text
    content: |
      What it would have cost, at API list rates published on August 24, 2026. None of this was billed—every session ran under a subscription—so this is a counterfactual, not an invoice. Two warnings travel with it: the Claude session also reviewed the Vale rollout, researched this post, and did unrelated work, so the figure over-attributes; and it is not a model-to-model comparison, because the sessions covered different work under different cache policies.

      Two Codex GPT-5.6 Sol sessions: $60.81 for the PR #686 hardening session and $59.95 for the Vale migration. Author-attested totals; the per-category token quantities were not retained, so a reader cannot re-derive them.

      The Claude Opus 5 session a reader can re-derive: at $5/M fresh input, $10/M cache writes on this session's one-hour cache TTL, $0.50/M cache reads and $25/M output—$0.02 fresh input, $130.61 cache writes, $416.86 cache reads, $44.41 output, totalling $591.90. Cache reads alone are 70% of it.

      Priceable total: about $712.66. The two remaining Codex sessions ran on gpt-5.3-codex-spark, which has no established public API equivalent, so they are unpriced.
    caption: "An API-equivalent counterfactual. Nothing here was invoiced."
---

The requirement was one sentence, from the Chicago Manual of Style: an em dash takes no space on either side. [Chicago's own Q&A](https://www.chicagomanualofstyle.org/qanda/data/faq/topics/HyphensEnDashesEmDashes/faq0108.html) puts it in a single line, with the exceptions it does allow.

![Chicago's published answer on dash spacing—the whole specification this project set out to enforce. The exceptions it grants are for hyphens and en dashes; the em dash has none.](/blog/autofix-was-the-whole-cost/img/cmos-qanda-dashes.png)

Enforcing it on this site peaked at 1,721 lines of code and a 1,196-line test suite, and the pull request that tried to make its auto-fixer safe drew 57 findings across 24 review rounds. Twenty-two of those rounds came before I removed the capability causing the churn, and their 54 findings dipped and rebounded without converging. After the removal, not one further rewrite-safety finding was raised, and the pull request merged within the hour. The 1,513 in the title is a third number—the tool as it finally merged, and the exact line count later deleted whole.

The interesting part is not that I overbuilt something. It is *which* part was expensive, and in what currency: the requirement bundled three capabilities nobody had ever separated, and the one nobody asked for was 17% of the implementation and tests—and, by the findings' own text, three in four of the review burden.

## Three Capabilities Wearing One Requirement

Written out, "enforce this style rule" meant:

1. **Recognize the forbidden pattern.** One line of pattern matching. Worked on day one, never caused a problem.
2. **Know what counts as prose.** Legitimately hard, and unavoidable. [Issue #664](https://github.com/nathanjohnpayne/nathanpaynedotcom/issues/664), which scoped the work, counted thirteen real occurrences across ten files—and classified roughly 250 further matches as out of scope: link labels built from identifiers, a shell comment inside a fenced code block, internal prose in specs, docs, and code comments. Get this wrong and the tool cries wolf until people stop running it.
3. **Fix violations automatically.** Never requested. Never defended. It arrived attached to the requirement, and nobody asked whether it was worth having.

Here is what I got wrong the first time—and the wrong version is the more flattering story. I claimed auto-fix had produced *most of the code*. It had not. Across the commit that removed it, the linter and its test suite fell from 2,917 lines to 2,417—a net reduction of **500 lines, or 17% of the implementation and tests combined**. Taken separately it is 12.6% of the linter and 23.7% of the tests.

All four states this story visits, each pinned to the commit that reproduces it via `git show "<sha>:scripts/lint-content-em-dash.mjs" | wc -l`, and the same for the test file:

| State | Commit | Script | Tests | Total |
|---|---|---:|---:|---:|
| Peak, immediately before the auto-fix removal | `147d9a7` | 1,721 | 1,196 | **2,917** |
| After the removal commit | `abe3bfb` | 1,505 | 912 | **2,417** |
| Legacy tool as finally merged | `a37bb51` (#720's merge) | 1,513 | 940 | **2,453** |
| Vale replacement | `e42483b` (#725's merge) | — | — | **1,343** |

The first two rows bracket the removal. The third is slightly larger because four fix commits landed on top of the cut before the merge. The fourth is itemised in the migration table further down.

What auto-fix produced instead of line count was most of the *trust burden*—and that claim is now counted rather than felt. Sort all 57 findings on [the hardening PR](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/686) by what their own text says: **42 name the auto-fix path outright**—the `--write` flag, the rewrite, the structure-preservation proof—and six more sit in the whitespace-context and HTML-depth machinery that existed only so the fixer knew what it was allowed to touch, for 48 of 57. The residue: three findings on prose detection, three on the test harness, two CodeQL alerts on the gate's own regexes, one dependency note. Not one was unrelated to the gate. Three in four findings named a capability that was 17% of the implementation and tests, four in five counting the machinery that served it. A capability can be a modest share of a codebase and still be the reason the project cannot finish.

```mermaid title="Where the cost actually sat" description="Detecting the style violation was trivial. Deciding what counts as prose was legitimately hard. Automatically fixing violations required proving each edit was safe—17% of the implementation and tests combined, and 42 of the 57 review findings named it. Cutting the capability ended the rewrite-safety findings and the pull request merged within the hour."
graph TD
    A["Requirement:<br/>no space beside an em dash"] --> B["Detect it<br/>~1 line"]
    A --> C["Know what counts as prose<br/>legitimately hard"]
    A --> D["Fix it automatically<br/>never requested, never questioned"]
    D --> E["Prove every edit is safe"]
    E --> F["17% of implementation and tests<br/>42 of 57 review findings"]
    D --> G["Cut this one capability"]
    G --> H["No further rewrite-safety findings<br/>merged within the hour"]
    style A fill:#d4a84b,stroke:#a07830,color:#333
    style B fill:#b8ddb8,stroke:#4a8a4d,color:#333
    style C fill:#d4a84b,stroke:#a07830,color:#333
    style D fill:#e8b4b4,stroke:#993d3d,color:#333
    style E fill:#993d3d,stroke:#7a3030,color:#fff
    style F fill:#993d3d,stroke:#7a3030,color:#fff
    style G fill:#b8ddb8,stroke:#4a8a4d,color:#333
    style H fill:#7bc67e,stroke:#4a8a4d,color:#333
```

## Why "Just Fix It Automatically" Was the Expensive Part

"Automatically fix formatting" sounds like the easy half to anyone who has not built one. [The Punctuation Guide](https://www.thepunctuationguide.com/em-dash.html) calls the em dash perhaps the most versatile punctuation mark there is—it can stand in for commas, parentheses, or a colon—which is why a rule about its spacing is worth a gate at all.

![The Punctuation Guide on the em dash: a mark that can replace commas, parentheses, or colons, and is easily confused with the narrower en dash and hyphen.](/blog/autofix-was-the-whole-cost/img/punctuation-guide-em-dash.png)

Take the text `word **—** next`. In Markdown, `**` makes text bold, so this is a bolded dash with spaces around it—a violation the tool should flag. Now let the tool fix it by closing up the spaces:

```text
word **—** next     →     word**—**next
```

The dash is fixed. The bold is gone. With no spaces around them, those asterisks become literal characters on the page. The tool set out to correct punctuation and silently corrupted the formatting instead.

So a tool that edits your files has to prove, after every edit, that it changed only what it meant to change. That proof was the real product: re-parse the document after each fix, compare the before and after structures, and reject the whole batch if anything moved. It was all-or-nothing by construction, and the construction is one line—at the peak commit, line 1,609 of the linter returns the untouched source unless the structure-preservation check accepts the candidate, so one unfixable dash in a configuration key abandoned every other fix in that file.

**Detecting a problem is cheap. Being trusted to change someone's work is expensive.** The gap shows up outside linting: recommending an action versus taking it, flagging a charge versus reversing it, drafting a reply versus sending it. The detection demo is a week. The permission to act is the product.

## The Signal I Had and Did Not Read

The reviewers left a record I could pull from the API instead of trusting my own notes—which mattered: the first published version argued non-convergence partly from two rounds that postdate the cut.

The counting rule first, because "round" is not otherwise defined. [#686](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/686) carries 113 review submissions; 24 included at least one top-level inline comment, and those are the rounds. Three reviewers produced them: the [Codex GitHub App](https://learn.chatgpt.com/docs/third-party/github) (17 rounds, 45 findings), [CodeRabbit](https://www.coderabbit.ai/) (6 rounds, 10 findings), and GitHub's CodeQL scanner (one round, 2 findings). Every review comment records the commit it was written against, and that field corrects the story: the auto-fix removal landed at 23:33 UTC on August 23, and rounds 23 and 24 reviewed commits after it. Their three findings are of a different kind—two are cleanup about the removal itself, the third is documentation debt from a dependency added after the cut.

So the non-convergence evidence is the 22 rounds before the cut. Findings per round, in order:

```text
3 3 3 1 3 4 3 3 2 1 2 5 2 3 3 1 1 1 1 5 2 2
```

Fifty-four findings. The series is not literally flat—the first eleven rounds average 2.55 findings and the last eleven 2.36—but that decline is even shallower than the padded 24-round series showed, so removing the two post-removal rounds makes the argument stronger, not weaker. The series dips and rebounds rather than approaching zero: round 20 produced five findings, more than round 3, and the last round before the cut still produced two.

The reviewers' own language marks the churn. Twenty-nine of the 57 findings—all from the Codex App's 45—contain the phrase "fresh evidence beyond," the reviewer naming, in the finding's own body, the earlier fix it is re-opening. Half the findings on the pull request are follow-ons against ground a previous fix had already covered.

A gentle drift that never lands is not a long tail. Extrapolate two findings a round and the work does not finish—a burn-down chart that is not burning down. It costs one query. I should have been reading it from round six rather than round twenty-two, and the only reason I looked is that someone asked whether the work was converging. The honest answer was no, and the evidence had been in the record the whole time.

**Effort is not progress, and "we closed everything raised" is not the same as "we are getting closer to done."** I have written [a post about the second half of that](/blog/perfect-score-wrong-axis/), and I still walked into the first half.

## The Measurable Floor

Because agents did both jobs here—Codex CLI and Claude Code sessions wrote the code; the Codex App, CodeRabbit, and CodeQL reviewed it—the cost is unusually measurable. Here there are receipts, from three systems, each labelled as the floor or upper bound it is.

The external-review lane keeps a per-run token ledger covering four of the seven pull requests in this arc—[#668](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/668) (13 loops, 434,420 tokens), [#678](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/678) (2 loops, 55,514), [#681](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/681) (1 loop, 16,774), and [#682](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/682) (1 loop, 17,846): **524,554 tokens across 17 review loops**. The ledger is a local, gitignored working file a reader cannot open—but its loop counts are independently checkable, because every ledgered loop is one review posted by the external-reviewer identity `nathanpayne-codex`, and the public API agrees on every row:

| PR | Ledgered loops | Reviews by `nathanpayne-codex`, per the API |
|---|---:|---:|
| #668 | 13 | 13 |
| #678 | 2 | 2 |
| #681 | 1 | 1 |
| #682 | 1 | 1 |
| #686 | no record | 0 |
| #720 | no record | 10 |
| #721 | no record | 1 |

`gh api repos/nathanjohnpayne/nathanpaynedotcom/pulls/<n>/reviews`, filtered to that login, reproduces the right-hand column. The token totals stay author-attested: the ledger's records for these four pull requests carry only combined totals, every per-category field null—and `billed_usd: 0.0` on every record, the receipt behind "nothing was invoiced."

Note which pull request the ledger does not cover. The 22-round story above is #686, and its zero in the table means it never entered the external-review lane; the 434,420 tokens belong to #668, the pull request that introduced the tool. The ledger is therefore a floor: it excludes the 28 reviews the Codex App posted across the arc, the 63 from CodeRabbit, the 10 external-review loops on the [Vale rollout](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/720), and every authoring session.

The authoring side comes from per-provider session telemetry, and the first version of this post printed two of its figures six lines apart with different populations—a two-session token count beside a one-session dollar figure—without saying so. The session accounting in full:

| Session | Model | Work scope | Telemetry retained | Direction | In the dollar estimate |
|---|---|---|---|---|---|
| Codex CLI | GPT-5.6 Sol | #686 hardening | combined #686 figures, below | upper bound—opened with unrelated backlog triage | $60.81, author-attested |
| Codex CLI | GPT-5.6 Sol | Vale migration | total only | upper bound | $59.95, author-attested |
| Codex CLI, two sessions | gpt-5.3-codex-spark | not separately recorded | totals only | — | excluded, no public API rate |
| Claude Code | Claude Opus 5 | finishing #686, the migration, reviewing the Vale rollout, researching this post, unrelated work | full category splits | upper bound for this feature | $591.90, re-derivable |

Two figures attach to those rows with care. The **2.27 million fresh input tokens and 285,100 output tokens** (99,453 of them reasoning) recorded for #686 are a *combined* figure across the two sessions associated with that pull request—the Sol hardening session and one other, and the telemetry I kept does not record which of the remaining sessions the other was. So the two-session token figure and the one-session $60.81 have different populations and cannot be checked against each other. The Claude session's **1.78 million output tokens across 1,872 assistant turns** are that provider's own counters. All are author-attested; none appears in a published artifact.

The Claude dollar figure is the one a reader can rebuild. At the sidebar's rates, $0.02 fresh input + $130.61 cache writes + $416.86 cache reads + $44.41 output = **$591.90**. Invert the components and the quantities fall out: $44.41 at $25/M is **1.78 million output tokens**—the same figure the session counter reports; the other three invert to 833.7 million cache reads, 13.06 million cache writes, and 0.004 million fresh input, summing to **848.6 million tokens processed**, the sidebar's 848 million. Two figures quoted from different surfaces of the same telemetry fall out of each other exactly. With the two author-attested Codex subtotals, $60.81 + $59.95 + $591.90 comes to about **$712.66**, at [OpenAI](https://developers.openai.com/api/docs/models/gpt-5.6-sol) and [Anthropic](https://platform.claude.com/docs/en/about-claude/pricing) list rates published on August 24, 2026—priced, never billed, and over-attributed, per the sidebar's warnings.

Across all seven pull requests the arc drew **256 review submissions and 126 inline findings**—`pulls/{n}/reviews` for the first, top-level entries in `pulls/{n}/comments` for the second, replies excluded so a finding counts once however long its thread ran. The arc ran about 49 hours from first open to last merge, and #686 alone was open for 30 of them: 62% of the wall time, 44% of the review submissions (113 of 256), 45% of the inline findings (57 of 126). Four of the seven pull requests merged in under sixteen minutes each, and on three of them—#681, #682, and [#721](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/721)—neither review bot posted at all; of the Codex App's 28 reviews and CodeRabbit's 63, the two long-running pull requests drew 17 and 27 on #686 and 4 and 33 on #720.

I am not extrapolating a grand total—multiplying the uninstrumented reviews by the measured average would produce a confident-looking invention. The point survives the imprecision: **a requirement nobody questioned consumed a large amount of compute, and none of it was visible as a line item.** Nobody signs off on half a million tokens of re-review; the ledger's 524,554 accrued one reasonable-looking loop at a time, which is why the shape of the series matters more than any individual round.

## Cutting the Capability Nobody Asked For

The decision was to make the tool report-only. It names each violation and exits. It does not touch your files.

The cut removed a net 500 lines—the proof, and the tests that exercised it. The first published version said the loop "ended in a single commit," and the record is messier and better: after the removal commit there were four more commits, two more review rounds, and three more findings, and the pull request merged 56 minutes later. But not one of those findings was about rewrite safety—two were cleanup about the removal, the third documentation debt from a dependency added after it. The class of finding that had driven 22 rounds stopped at the commit that removed the capability generating it.

The reasoning was not technical. A punctuation nit should not block shipping, and what I wanted was a list to clean up later—not a tool with permission to rewrite my published writing. Once "rewrite" was off the table, the expensive proof had nothing left to protect.

Report-only did not make detection consequence-free, though, and I got this wrong twice before a reviewer pinned it down. The gate still exits non-zero, which fails the `build-and-test` job that runs it. That job is not one of `main`'s five required status checks—those are all review-policy gates—so branch protection will let a human merge past a red result. But the repository keeps a second, separately configured list at `.github/required-head-checks`, containing both `lint` and `build-and-test`, and the automated merge path verifies that list against the head commit before arming. So a punctuation violation stops the automated merge and can be waved through by hand—a deliberate split, and still unfinished, because nothing records what was waved through. Turning those violations into tracked issues is a piece I intend to build and have not.

## The Second Decision, Which Was a Different Question

Cutting auto-fix ended the churn. It did not address why I was maintaining a prose linter at all—a separate decision with a separate justification; conflating them makes "we replaced it with an off-the-shelf tool" sound like the fix for a convergence problem it had nothing to do with. The first decision stopped the bleeding. The second reduced what I owned.

With auto-fixing gone, what remained was still 1,513 lines of custom code doing something a mature off-the-shelf tool already does: [Vale](https://vale.sh/), an open-source prose linter. I moved to it. The rule itself came from a style manual revised for over a century—[the Chicago Manual of Style](https://en.wikipedia.org/wiki/The_Chicago_Manual_of_Style) is in its eighteenth edition, and nobody writes their own. The tooling deserves the same instinct, and it took me 1,513 lines to apply it.

![The eighteenth edition of the Chicago Manual of Style. The rule being enforced is a century-old published standard; the tool enforcing it was written from scratch.](/blog/autofix-was-the-whole-cost/img/cmos-18th-edition-cover.jpg)

The tempting summary is *1,513 lines became 7*—the em-dash rule in Vale is seven lines of configuration. That summary is false, and the false version is why most build-versus-buy posts are useless.

The honest accounting, with both snapshots named. The "before" column is the legacy tool as merged, at `a37bb51`; the "after" is the Vale side at `e42483b`, [#725](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/725)'s merge—53 minutes after the old tool was deleted, once the migration follow-ups had landed, still before this post was published. The rule on both sides: the prose gate's own implementation and tests, excluding CI wiring and fixtures; the largest excluded item is the 81-line script that installs Vale, and counting it moves the reduction from 45% to 42%.

| | Before | After |
|---|---|---|
| the bespoke tool | 1,513 lines | — |
| the Vale rule | — | 7 lines |
| supporting adapter | — | 509 lines |
| configuration | — | 6 lines |
| tests | 940 lines | 821 lines |
| **total** | **2,453** | **1,343** |

A 45% reduction. Not a two-hundred-fold collapse.

**You do not escape complexity by buying instead of building. You relocate it.** The trade was still right—what remains is boring, well-tested glue rather than a bespoke engine with a rewrite-safety proof bolted to it. But anyone promising the headline number is selling something, and the 509-line adapter is the part worth understanding.

## Why the Adapter Exists, and Why It Nearly Did Not

Vale handles most of this site's content correctly. It does not check items in bulleted lists inside a post's metadata block.

On this site that is 127 prose-bearing list items across the 14 files that carry them—tags (62), key takeaways (28), pull-quote texts (29), and sidebar content blocks (8). Fifty-seven—the pull quotes and key takeaways—are rendered prominently on every post, including the ones at the top of this one. Not internal metadata. Published, reader-facing writing.

The custom tool checked those. A straight swap would have dropped them out of coverage **and reported success**, because a tool that declines to look is indistinguishable from a clean result. The risk is not specific to linting: replacing a system routinely means quietly losing an edge case the old one handled, and the failure is silent by construction.

It was caught because the rollout was split in two—[add the new tool alongside the old one and run both](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/720), then [remove the old one only after comparing them](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/721). Not because anyone was clever; because the sequencing made the gap visible instead of leaving it to be noticed later, by a reader.

## "Proven Equivalent" Was Not Proven

The removal was described as landing after equivalence had been demonstrated. It had not been, quite—the kind of claim worth checking whether it comes from a vendor, a team, or your own earlier self. Both tools had been compared on the current content, which was already clean. Zero findings versus zero findings proves nothing.

So before approving the deletion I took all 174 test cases from the suite being deleted, confirmed the comparison harness reproduced the old tool's behaviour exactly—zero mismatches across all 174—and ran every case through the new one.

**149 matched. 25 differed**—18 the new tool no longer catches, 7 it now flags where the old one stayed quiet.

Then the number that decides what any of that is worth: every affected pattern appeared **zero times** across the 37 content files as they stood at `6358402`, the commit the comparison ran against. So this was 18 capabilities retired, not 18 defects shipped—those were exactly the cases that could not converge. One footnote keeps the claim honest: the corpus reached 38 files when this post was added, and this post reintroduced one of the retired constructs—the emphasis-wrapped dash in the worked example above, twice, both inside code spans that render literally. Nothing is broken, but "zero occurrences" is a dated measurement, not a standing guarantee.

And it is recorded. I wrote the full comparison into [an issue](https://github.com/nathanjohnpayne/nathanpaynedotcom/issues/722) before the merge—one minute and fifty-five seconds before it, which is as close as "before" gets—because the deletion destroyed the only artifact encoding the difference. A five-minute habit that turns "we think this was fine" into something a future decision can stand on.

## What Transfers

Little of this is about linting.

**Unbundle the requirement before estimating it.** One sentence contained three capabilities with different cost profiles. The one that could not converge was also the optional one, and nobody knew either fact—because nobody had listed them separately. Size and difficulty are not the same axis.

**Plot the thing that would tell you it is not working.** Findings per round, escaped defects per release, reopen rate. A shallow decline that never reaches zero is the dangerous shape, because it still reads as progress on any single round. The metric that would have ended this sixteen rounds earlier cost one query.

**Ask what a capability is protecting.** The proof obligation that generated the findings existed solely to serve a feature nobody had defended. Cost concentrates in the parts of scope that were never argued for, precisely because nothing was ever argued about them.

**Make migrations comparable, not just complete.** Run both, diff the outputs, record what you are giving up. A silent gap in a replacement system is the default outcome, not the unlucky one.

**And correct your own numbers in public.** The first draft said auto-fix produced most of the code; it produced 17% of the implementation and tests. The first published version argued non-convergence partly from two review rounds that postdate the removal; the honest series—54 findings across 22 rounds—makes the case better, not worse. Both corrections came from checking against the commit history and the API record, and both times the checked version was stronger.
