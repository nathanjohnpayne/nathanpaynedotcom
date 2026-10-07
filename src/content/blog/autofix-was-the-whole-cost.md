---
title: "1,513 Lines for One Dash: The Requirement Nobody Questioned"
seoTitle: "1,513 Lines for One Dash"
shortTitle: "The Requirement Nobody Questioned"
description: "I wanted this site to follow one Chicago rule. An unrequested auto-fixer drew 42 of 57 review findings; cutting it ended the rewrite-safety churn. Without an adapter, the replacement linter would've skipped post metadata and still reported green."
seoDescription: "One style rule drew 57 review findings—42 naming the never-requested auto-fix. It was 17% of the implementation and tests. Cutting it ended the rewrite-safety churn."
category: "Agent Systems"
homepageRank: 4
author: "Nathan Payne"
date: 2026-08-24
tags: ["Product", "Engineering", "Scope", "Decision Making", "AI"]
image: "/og/blog/autofix-was-the-whole-cost.png"
keyTakeaways:
  - "One style rule contained three jobs: find mistakes, find the prose, and rewrite files. Auto-fix was the optional one, 17% of the implementation and tests, but 42 of the 57 findings named it. Cutting it ended the rewrite-safety churn; the PR merged within the hour."
  - "The arc drew 256 review submissions and 126 inline findings across seven PRs. Another automated round didn't require a separate approval or produce a line item. When the next round is nearly free, the signal to stop has to come from the shape of the series."
  - "Moving to Vale cut the tool and tests from 2,453 lines to 1,343, a 45% reduction. The rule was 7 lines, but I still had a 509-line adapter to maintain. That was the right trade; the seven-line headline hid the work I kept."
  - "Vale alone skips post metadata and reports green: at publication, that metadata held 127 prose-bearing items across 14 files, including 57 pull quotes and takeaways. Running both tools exposed the gap. Replaying 174 retired cases let me record the 18 lost checks as a deliberate trade."
pullquotes:
  - text: "Auto-fix was 17% of the implementation and tests, and 42 of the 57 findings named it. The cost was never the line count. It was the trust burden."
    label: "The trust burden"
    accent: red
  - text: "The detection demo is a week. The permission to act is the product."
    label: "The permission to act"
    accent: yellow
  - text: "You do not escape complexity by buying instead of building. You relocate it."
    label: "What buying relocates"
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

I wanted this site to follow one Chicago rule: an em dash takes no space on either side. [Chicago's own Q&A](https://www.chicagomanualofstyle.org/qanda/data/faq/topics/HyphensEnDashesEmDashes/faq0108.html) states it in one line, then gives the exceptions it allows.

![Chicago's published answer on dash spacing—the whole specification this project set out to enforce. The exceptions it grants are for hyphens and en dashes; the em dash has none.](/blog/autofix-was-the-whole-cost/img/cmos-qanda-dashes.png)

The tool peaked at 1,721 lines of code and a 1,196-line test suite. The PR that tried to make its auto-fixer safe drew 57 findings across 24 review rounds. Twenty-two rounds and 54 findings came before I removed auto-fix. After the cut, there were no further rewrite-safety findings, and the PR merged within the hour. The 1,513 in the title is the tool as it finally merged, and the exact line count later deleted whole.

I hadn't asked for a tool that rewrote files. That capability arrived with the style check, and I kept trying to make it safe. It was 17% of the implementation and tests, but three in four findings named it. The expensive part of the requirement was also the optional part.

<span id="three-capabilities-wearing-one-requirement"></span>

## What the requirement included

The phrase "enforce this style rule" contained three jobs:

1. **Find the forbidden pattern.** One line of pattern matching. It worked on day one and never caused a problem.
2. **Find the prose.** This was hard, and the tool needed it. [Issue #664](https://github.com/nathanjohnpayne/nathanpaynedotcom/issues/664) counted thirteen real occurrences across ten files and put roughly 250 other matches out of scope: identifier-based link labels, a shell comment in a fenced code block, and internal prose in specs, docs, and code comments. False positives would make people stop running the check.
3. **Fix the mistakes automatically.** I hadn't requested this. Nobody had defended it or asked whether it was worth having.

An earlier draft blamed auto-fix for *most of the code*. I was wrong, and the wrong version was more flattering. Across the removal commit, the tool and its tests fell from 2,917 lines to 2,417: **500 lines, or 17% of the implementation and tests combined**. Separately, the cut was 12.6% of the linter and 23.7% of the tests.

The four states below use named commits so the counts can be reproduced. **The first three rows count the legacy toolchain's two files.** Run `git show "<sha>:scripts/lint-content-em-dash.mjs" | wc -l` and the same command for the test file. **The fourth row counts four files in a different toolchain**, listed in the migration table below. The first two commits aren't reachable from `main`; `git fetch origin pull/686/head` resolves them in any clone.

| State | Commit | Script | Tests | Total |
|---|---|---:|---:|---:|
| Peak, immediately before the auto-fix removal | `147d9a7` | 1,721 | 1,196 | **2,917** |
| After the removal commit | `abe3bfb` | 1,505 | 912 | **2,417** |
| Legacy tool as finally merged | `a37bb51` (#720's merge) | 1,513 | 940 | **2,453** |
| Vale replacement | `e42483b` (#725's merge) | — | — | **1,343** |

The first two rows bracket the removal. Four more fix commits landed before the merge, which is why the third row is slightly larger. The migration table accounts for the fourth.

The larger cost was proving the fixer could be trusted. Of all 57 findings on [PR #686](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/686), **42 name the auto-fix path outright**: `--write`, rewriting, or the structure-preservation proof. Six more concern whitespace context and HTML depth, machinery that existed only so the fixer knew what it could touch. That makes 48 of 57.

The remaining findings were three on prose detection, three on the test harness, two CodeQL alerts on the gate's regexes, and one dependency note. None was unrelated to the gate. Three in four named auto-fix directly; four in five did when I included the machinery serving it.

Auto-fix was 17% of the implementation and tests, and 42 of the 57 findings named it. The cost was never the line count. It was the trust burden. A small capability can keep the whole project from finishing.

```mermaid title="Where the cost actually sat" description="Detecting the style violation was trivial. Deciding what counts as prose was legitimately hard. Automatically fixing violations required proving the combined edit was safe, once per file—17% of the implementation and tests combined, and 42 of the 57 review findings named it. Cutting the capability ended the rewrite-safety findings and the pull request merged within the hour."
graph TD
    A["Requirement: no space<br/>beside an em dash"] --> B["Detect it<br/>~1 line"]
    A --> C["Know what counts<br/>as prose<br/>legitimately hard"]
    A --> D["Fix it automatically<br/>never requested,<br/>never questioned"]
    D --> E["Prove the combined edit is safe"]
    E --> F["17% of implementation<br/>and tests<br/>42 of 57 review findings"]
    D --> G["Cut this one capability"]
    G --> H["No further<br/>rewrite-safety findings<br/>merged within the hour"]
    style A fill:#d4a84b,stroke:#a07830,color:#333
    style B fill:#b8ddb8,stroke:#4a8a4d,color:#333
    style C fill:#d4a84b,stroke:#a07830,color:#333
    style D fill:#e8b4b4,stroke:#993d3d,color:#333
    style E fill:#993d3d,stroke:#7a3030,color:#fff
    style F fill:#993d3d,stroke:#7a3030,color:#fff
    style G fill:#b8ddb8,stroke:#4a8a4d,color:#333
    style H fill:#7bc67e,stroke:#4a8a4d,color:#333
```

<span id="why-just-fix-it-automatically-was-the-expensive-part"></span>

## What made editing expensive

Em-dash spacing looked like an easy thing to fix. [The Punctuation Guide](https://www.thepunctuationguide.com/em-dash.html) calls the em dash perhaps the most versatile punctuation mark: it can replace commas, parentheses, or a colon. That flexibility makes a consistent spacing rule useful.

![The Punctuation Guide on the em dash: a mark that can replace commas, parentheses, or colons, and is easily confused with the narrower en dash and hyphen.](/blog/autofix-was-the-whole-cost/img/punctuation-guide-em-dash.png)

Take `word **—** next`. Markdown uses `**` for bold, so this is a bold dash with spaces around it. The tool should flag it. Closing up the spaces produces this:

```text
word **—** next     →     word**—**next
```

The spacing is fixed, but the bold is gone. Those asterisks now render literally. An automatic punctuation edit has changed the formatting.

The tool needed to prove that each edit changed only what it was meant to change. It applied every candidate fix in a file, reparsed the result once, compared the structures, and rejected the whole batch if anything moved. At the peak commit, line 1,609 returns the untouched source unless that structure-preservation check accepts the candidate. One unfixable dash in a configuration key could abandon every other fix in the file.

Detecting a problem is cheap. Being trusted to change someone's work is expensive. I see the same gap between recommending an action and taking it, flagging a charge and reversing it, or drafting a reply and sending it. The detection demo is a week. The permission to act is the product.

<span id="the-signal-i-had-and-did-not-read"></span>

## The signal I missed

I could reconstruct the review series from the API. That mattered because the first published version used two rounds after the cut as evidence that auto-fix wasn't converging. It also said the loop "ended in a single commit." Both descriptions missed the boundary between the rewrite-safety work and the cleanup that followed.

[#686](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/686) had 113 review submissions. I count a round when a submission included at least one top-level inline comment; 24 did. The [Codex GitHub App](https://learn.chatgpt.com/docs/third-party/github) produced 17 rounds and 45 findings, [CodeRabbit](https://www.coderabbit.ai/) produced 6 rounds and 10 findings, and GitHub's CodeQL scanner produced one round and 2 findings.

Every comment records the commit it reviewed. The removal landed at 23:33 UTC on August 23. Rounds 23 and 24 reviewed later commits, and their three findings had a different job: two were cleanup after the removal; the third was documentation debt because the dependency inventory hadn't caught up with a parser dependency added on the PR's first day.

The non-convergence evidence is the 22 rounds before the cut. Here are their findings, in order:

```text
3 3 3 1 3 4 3 3 2 1 2 5 2 3 3 1 1 1 1 5 2 2
```

Twenty-two rounds produced fifty-four findings. The last round before the cut still produced two. The series wasn't literally flat: the first eleven rounds averaged 2.55 findings and the last eleven 2.36. But it kept dipping and rebounding. Round 20 produced five findings, more than round 3. Removing the two post-cut rounds leaves a shallower decline than the padded 24-round series, so the correction strengthens the case.

The findings also described how the churn happened. Twenty-nine of the 57, all from the Codex App's 45, named an earlier fix they were reopening. Over those 57 top-level finding bodies, `grep -ic 'fresh evidence beyond'` returns **29**. The longer, exact-case `grep -c 'Fresh evidence beyond the resolved'` returns **25**: three findings continue the sentence differently, and one writes it in lower case. Half the findings revisited ground a previous fix had covered.

A gentle drift that never lands is not a long tail. At two findings a round, the work wouldn't finish. The query cost almost nothing. I should've read the series from round six; I waited until round twenty-two, when someone asked whether the work was converging. The answer was no.

Closing findings can consume plenty of effort without making progress. "We closed everything raised" also isn't "we're getting closer to done." I'd already written [a post about that second point](/blog/perfect-score-wrong-axis/), and I still walked into the first.

<span id="the-measurable-floor"></span>

## What I could measure

Codex CLI and Claude Code sessions wrote the code; the Codex App, CodeRabbit, and CodeQL reviewed it. I had records from three systems. They measured different work, so each needs its own boundary.

The external-review lane's local token ledger covered four of the seven PRs: [#668](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/668) had 13 loops and 434,420 tokens; [#678](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/678) had 2 loops and 55,514; [#681](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/681) had 1 loop and 16,774; [#682](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/682) had 1 loop and 17,846. The total was **524,554 tokens across 17 review loops**.

The ledger is a local, gitignored working file, so a reader can't open it. Its loop counts can be checked independently: every recorded loop posted one review as `nathanpayne-codex`, and the public API matches every row.

| PR | Ledgered loops | Reviews by `nathanpayne-codex`, per the API |
|---|---:|---:|
| #668 | 13 | 13 |
| #678 | 2 | 2 |
| #681 | 1 | 1 |
| #682 | 1 | 1 |
| #686 | no record | 0 |
| #720 | no record | 10 |
| #721 | no record | 1 |

`gh api --paginate repos/nathanjohnpayne/nathanpaynedotcom/pulls/<n>/reviews`, filtered to that login, reproduces the right-hand column. `--paginate` matters: #686 has 113 review submissions and #720 has 90. The ledger retains only combined token totals, with every per-category field null. Those totals remain author-attested. Every record has `billed_usd: 0.0`, which records no charge for the ledgered review loops.

The table's zero for #686 matters. The 22-round hardening story never entered this external-review lane. The 434,420 tokens belong to #668, which introduced the tool. The ledger's total is a floor: it excludes the Codex App's 28 reviews across the arc, CodeRabbit's 63, the 10 external-review loops on [the Vale rollout](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/720), and every authoring session.

### The authoring sessions

My provider telemetry covered a different population. The first published version put a two-session token count in the body beside a one-session dollar figure in the sidebar, without explaining that they covered different sessions.

| Session | Model | Work scope | Telemetry retained | Direction | In the dollar estimate |
|---|---|---|---|---|---|
| Codex CLI | GPT-5.6 Sol | #686 hardening | combined #686 figures, below | upper bound—opened with unrelated backlog triage | $60.81, author-attested |
| Codex CLI | GPT-5.6 Sol | Vale migration | total only | upper bound | $59.95, author-attested |
| Codex CLI, session A | gpt-5.3-codex-spark | not separately recorded | totals only | — | excluded, no public API rate |
| Codex CLI, session B | gpt-5.3-codex-spark | not separately recorded | totals only | — | excluded, no public API rate |
| Claude Code | Claude Opus 5 | finishing #686, the migration, reviewing the Vale rollout, researching this post, unrelated work | full category splits | upper bound for this feature | $591.90, re-derivable |

I didn't keep enough to meet two of the criteria in [the audit issue](https://github.com/nathanjohnpayne/nathanpaynedotcom/issues/745). The two Spark sessions don't have the per-session telemetry needed to recover their work scope or token splits. They stay as separate rows with those cells empty. The Codex dollar subtotals are **author-attested, not reproducible**: I didn't retain the fresh, cached, cache-write, cache-read, and output quantities per session, so no formula can reconstruct them. The Claude subtotal can be rebuilt from the components in the sidebar.

The **2.27 million fresh input tokens and 285,100 output tokens**, including 99,453 reasoning tokens, are combined counters for two sessions associated with #686. One was the GPT-5.6 Sol hardening session priced at $60.81. The other was one of the two `gpt-5.3-codex-spark` sessions. My records don't say which one or what it cost. The two-session count and the one-session $60.81 therefore can't be checked against each other.

The Claude session recorded **1.78 million output tokens across 1,872 assistant turns**. You'll have to take my word for both sets of counters; none is in a published artifact.

### The API-cost estimate

The Claude arithmetic can be checked: $0.02 fresh input + $130.61 cache writes + $416.86 cache reads + $44.41 output = **$591.90**. At $25/M, the output component gives **1.78 million output tokens**, rounded as the session counter was. The other components give 833.7 million cache reads, 13.06 million cache writes, and 0.004 million fresh input. Together they give **848.6 million tokens processed**, the sidebar's rounded 848 million. The figures reconcile at that precision; they're different views of the same telemetry, not independent evidence for it.

Adding the two author-attested Codex estimates gives $60.81 + $59.95 + $591.90, or about **$712.66**, at [OpenAI](https://developers.openai.com/api/docs/models/gpt-5.6-sol) and [Anthropic](https://platform.claude.com/docs/en/about-claude/pricing) list rates published on August 24, 2026. Nothing was billed at those rates: the sessions ran under subscriptions, as I report in the sidebar. The Claude session also covered other work, so the estimate over-attributes cost to this feature. The sessions covered different work under different cache policies, so this isn't a model-to-model comparison.

### The whole arc

Across all seven PRs there were **256 review submissions and 126 inline findings**. The first count comes from `pulls/{n}/reviews`; the second from top-level `pulls/{n}/comments`, excluding replies so each finding counts once.

The arc took about 49 hours from first open to last merge. #686 took 30 of those hours: 62% of the wall time, 44% of the submissions (113 of 256), and 45% of the findings (57 of 126). Four PRs merged in under sixteen minutes each. On #681, #682, and [#721](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/721), neither review bot posted. Of the Codex App's 28 reviews and CodeRabbit's 63, the two long PRs drew 17 and 27 on #686, and 4 and 33 on #720.

I haven't estimated a grand total. Multiplying uninstrumented reviews by the measured average would invent a number. The recorded floor is enough to show that a requirement nobody questioned consumed a lot of compute. Nobody had to approve half a million tokens of re-review as one purchase. The ledger's 524,554 accumulated one reasonable-looking loop at a time, without a line item that made me stop.

<span id="cutting-the-capability-nobody-asked-for"></span>

## The cut

I made the tool report-only. It named the violations and exited. It didn't touch the files.

The cut removed a net 500 lines: the safety proof and the tests exercising it. Four more commits, two review rounds, and three findings followed. The PR merged 56 minutes after the removal commit. Two findings were removal cleanup; the third was documentation debt for a dependency added on the PR's first day. None concerned rewrite safety. That class of finding stopped at the commit that removed auto-fix.

A punctuation nit shouldn't block shipping. I wanted a list to clean up later, rather than a tool with permission to rewrite my published writing. Once I removed rewriting, there was nothing left for the expensive proof to protect.

Report-only still had consequences. I got this wrong twice before a reviewer pinned it down: detection exited non-zero and failed the `build-and-test` job. In August 2026, that job wasn't among `main`'s five required status checks, which were all review-policy gates. Branch protection allowed a human to merge past the red result.

The automated merge path checked a separate list, `.github/required-head-checks`, containing `lint` and `build-and-test`, against the head commit before arming. A punctuation violation stopped automated merging but could be waved through by hand. That was deliberate. The unfinished part was that nothing recorded what had been waved through.

<span id="the-second-decision-which-was-a-different-question"></span>

## Moving the remaining linter to Vale

Cutting auto-fix ended the rewrite-safety churn. It left me maintaining a 1,513-line prose linter. Replacing that was a second decision. Saying "we replaced it with an off-the-shelf tool" doesn't explain how the convergence problem ended; that had already happened. The first decision stopped the bleeding. The second reduced what I owned.

I moved to [Vale](https://vale.sh/), an open-source prose linter. The rule came from [the Chicago Manual of Style](https://en.wikipedia.org/wiki/The_Chicago_Manual_of_Style), revised for over a century and now in its eighteenth edition. Nobody writes their own style manual. It took me 1,513 lines to apply that instinct to the tool.

![The eighteenth edition of the Chicago Manual of Style. The rule being enforced is a century-old published standard; the tool enforcing it was written from scratch.](/blog/autofix-was-the-whole-cost/img/cmos-18th-edition-cover.jpg)

The tempting summary is *1,513 lines became 7*. That summary is false. It's why most build-versus-buy posts are useless. The Vale rule was seven lines of configuration, but that wasn't all the code I still owned.

The comparison below uses the legacy tool at `a37bb51` and the Vale replacement at `e42483b`, [#725](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/725)'s merge. The latter came 53 minutes after the old tool was deleted, after migration follow-ups and before this post was published.

Both columns count the gate's implementation and tests, excluding CI wiring and fixtures. The largest excluded item was the Vale installer: 93 lines at `e42483b`. Including it raises the replacement from 1,343 to 1,436 lines and changes the reduction from 45% to about 41.5%.

| | Before | After |
|---|---|---|
| the bespoke tool | 1,513 lines | — |
| the Vale rule | — | 7 lines |
| supporting adapter | — | 509 lines |
| configuration | — | 6 lines |
| tests | 940 lines | 821 lines |
| **total** | **2,453** | **1,343** |

A 45% reduction. Not a two-hundred-fold collapse.

You do not escape complexity by buying instead of building. You relocate it. The trade was still right: I was maintaining boring, well-tested glue instead of the bespoke engine. The 509-line adapter is what the seven-line headline leaves out.

<span id="why-the-adapter-exists-and-why-it-nearly-did-not"></span>

## What the adapter had to keep checking

Vale handled most of the site's content. It didn't check bulleted list items inside a post's metadata block.

At publication on 2026-08-24, those lists contained 127 prose-bearing items across 14 files: tags (62), key takeaways (28), pull-quote texts (29), and sidebar content blocks (8). At the migration, before this post existed, there were 113 across 13 files. Fifty-seven items at publication were pull quotes and takeaways, prominent reader-facing writing like the ones at the top of this post.

The custom tool checked those items. Without the adapter, a straight swap would have lost that coverage and reported success. A tool that doesn't look at a field gives the same clean result as one that checked it and found no mistakes. Replacing a system can quietly lose an edge case the old one handled.

The rollout made this gap visible. [#720 added Vale alongside the old tool and ran both](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/720); [#721 removed the old one after the comparison](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/721). The sequence caught the difference before a reader had to.

<span id="proven-equivalent-was-not-proven"></span>

## Testing the claimed equivalence

The removal was described as following a demonstration of equivalence. Both tools had been run against the current content, which was already clean. Zero findings from each didn't prove they checked the same things. I needed to check that claim even though it came from my own work.

Before approving deletion, I replayed all 174 cases from the retired test suite. First I confirmed that the comparison harness reproduced the old tool exactly: zero mismatches across all 174. Then I ran the cases through Vale.

**149 matched. 25 differed**: 18 cases the new tool no longer caught, and 7 it flagged where the old one stayed quiet.

Every affected pattern occurred **zero times** across the 37 content files at `6358402`, the commit used for the comparison. I was retiring 18 capabilities, not shipping 18 defects. Those were exactly the cases that hadn't converged.

Adding this post took the corpus to 38 files and reintroduced one retired construct three times: the emphasis-wrapped dash in the worked example, once in a code span and twice in the fenced block. All render literally. The example isn't broken, but the zero-occurrence measurement belongs to its dated snapshot.

I recorded the full comparison in [#722](https://github.com/nathanjohnpayne/nathanpaynedotcom/issues/722) before merging: one minute and fifty-five seconds before it, which is as close as "before" gets. Deleting the suite removed the only artifact encoding those differences. A five-minute habit turns "we think this was fine" into something a future decision can stand on.

## What changed after August

`build-and-test` and `lint` became required checks on 2026-09-01. A merge-bypass audit on every push to `main` followed on 2026-09-30. Both gaps have since closed. [#715](https://github.com/nathanjohnpayne/nathanpaynedotcom/issues/715) was the proposal to turn punctuation violations into tracked issues. It closed as not planned on 2026-09-06.

<span id="what-transfers"></span>

## What I would carry into the next project

I'd separate the capabilities before estimating the requirement. This one sentence contained three jobs with different costs. The optional one was the one that wouldn't converge, and I hadn't listed them separately. Size and difficulty aren't the same thing.

I'd also plot the number that would tell me the work wasn't progressing: findings per round, escaped defects per release, or reopen rate. A shallow decline can look encouraging one round at a time. Reading this series could have brought the decision sixteen rounds earlier.

For an expensive capability, I'd ask what it was protecting. The proof here existed to serve a feature nobody had defended. That was where the cost collected.

During a migration, I'd run both versions, compare their output, and record the capabilities I'm giving up. A finished migration can still leave a silent coverage gap.

I also need to correct my own numbers. Auto-fix was 17% of the implementation and tests, not most of the code. The honest pre-cut series was 54 findings across 22 rounds. The commit history and API record made both corrections possible, and both made the product judgment clearer: I'd spent most of the review effort on a capability I hadn't asked for. Removing it stopped the rewrite-safety churn. Buying a linter addressed the separate question of what I should still maintain.
