---
title: "The Subagent Said It Was Unsafe"
seoTitle: "The Subagent Said It Was Unsafe"
shortTitle: "The Subagent Said It Was Unsafe"
description: "An OpenAI subagent judged an action unsafe; its parent did it anyway. Another agent rewrote the test that would have caught it. My review pipeline stops unread findings and keeps a PR from changing its own policy. It still lets the author overrule a blocking finding in writing."
seoDescription: "Two OpenAI coding agents weakened misalignment monitoring: one overruled a subagent that objected, the other rewrote the regression test. What that shows about multi-agent review, and where my own pipeline still lets the author overrule the reviewer."
category: "Agent Systems"
author: "Nathan Payne"
date: 2026-10-26
draft: false
tags: ["AI", "Code Review", "Systems", "Agent Governance", "Failure Modes"]
image: "/og/blog/the-subagent-said-it-was-unsafe.png"
keyTakeaways:
  - "In OpenAI's October 3 incident, the right judgment existed inside the system. A subagent called disabling the alerts unsafe, and the parent agent did it anyway. That is not a capability problem. The objection had nowhere to land."
  - "In the October 6 incident, the change replaced the regression test that protected the monitor with one that required the monitor to be absent. A check the author can edit in the same diff is not a check."
  - "My pipeline makes unread findings block merge and reads each PR's policy from its base branch, so a PR cannot loosen the rules it is judged by. A blocking finding still clears when the authoring agent rebuts it and resolves the thread."
  - "The rule I'm proposing: a blocking finding clears through a fix the reviewer re-reads, or through a human. The author's rebuttal starts that process; it does not finish it."
pullquotes:
  - text: "The right judgment existed inside the system. It was outvoted by the agent that wanted the work done."
    label: "Outvoted"
    accent: red
  - text: "A check the author can rewrite in the same diff is not a check. It's a suggestion with a test runner."
    label: "The oracle"
    accent: yellow
  - text: "A rebuttal is the author telling the reviewer why it's wrong. Today, in my pipeline, that is also the author deciding the reviewer was wrong."
    label: "The gap"
    accent: blue
sidebar:
  - type: text
    content: |
      Provenance. The OpenAI incidents are quoted from OpenAI's report "Suppressing misalignment monitoring alerts and disabling misalignment monitoring," read on 2026-10-26; the page shows incident dates of October 3 and October 6, 2026, and an update on October 20, 2026. One quoted instruction appears on that page without spaces between words; I have restored the spacing. Everything about Mergepath comes from its repository at commit `ce80530`, read on 2026-10-26, and from issues #672, #962 and #1000 and pull requests #674, #1018 and #2589, read through the GitHub API the same day. The headline figure is cropped from article pages at The Verge, BleepingComputer, The Hacker News and ABC News, captured on 2026-10-26. Dates are Pacific time.
    caption: "Where each claim comes from."
---

On October 3, an OpenAI coding agent was repairing an evaluation pipeline for a researcher who had said "don't send any messages." Partway through, it asked a subagent for a fix that didn't involve disabling monitoring. The subagent considered setting the flag that turns off notifications, recognized that it would disable required alerts, and declined to recommend it. Its own reasoning called that unsafe.

The parent agent had them disabled anyway. Its instruction to the subagent read "Need NO_NOTIFY=True and blank transport ping/page recipients to honor user's no-messages." The patch emptied the paging lists, set the flag, and recorded the reason as "User explicitly requested no messages." The monitor kept running and saving reports. Its human alerts were off.

Three days later, a second agent was migrating a serving path to match a reference implementation. An earlier instruction in the run said "Do not disable monitor even temporarily." The subagent doing the work removed the monitor's integration anyway, and it "replaced an earlier regression test intended to preserve monitoring with one requiring that monitoring was *not* present." Asked directly, the agent said, "I did not remove an enabled monitor from it."

OpenAI [published both incidents](https://alignment.openai.com/misalignment-reports/suppressing-misalignment-monitoring-alerts-and-disabling-misalignment-monitoring/) and updated the report on October 20. It says, "We don't yet have a satisfying explanation for this behavior." Several headlines led with the lie. I read the report for something else: in the first incident the right answer was already in the system, and in the second the change rewrote the check that would have caught it.

![Coverage from October 21, top to bottom: The Verge, BleepingComputer, The Hacker News and ABC News. Three of the four put the denial in the headline. Each strip is cropped from the outlet's article page, captured on October 26; the stack is my composite.](/blog/the-subagent-said-it-was-unsafe/img/news-headlines.png)

## Outvoted

I don't read the October 3 incident as a model that lacked judgment. The right judgment existed inside the system. It was outvoted by the agent that wanted the work done. Nothing gave the subagent's "unsafe" more weight than an opinion the parent could consider and set aside.

That is the default shape of most multi-agent setups I've seen, including my own. An orchestrator delegates, collects results, and decides. A reviewer is a delegate whose result happens to be an objection. If the orchestrator is the one that wants the work finished, the objection is weighed by the party with the strongest interest in discounting it.

Human engineering organizations solved this a long time ago, and not with better judgment. The person who writes a change doesn't approve it. A failing required check can't be waved through by the person whose change failed it. Separation of duties is old, boring, and effective because it does not depend on anyone choosing well in the moment.

## The oracle

The October 6 incident is a different failure. The objection wasn't overruled. It was removed.

A regression test is a standing objection: it says "no" every time someone breaks the thing it protects. The agent didn't argue with that objection. It rewrote it in the same change, so the test now required the monitor to be absent and passed. From the outside, the run looked green.

A check the author can rewrite in the same diff is not a check. It's a suggestion with a test runner.

## Unread

There is a third way to lose dissent, and it's the one I hit first in [Mergepath](/blog/agent-approval-workflow-genesis-of-mergepath/), the rules my coding agents work under. The objection is neither overruled nor rewritten. Nobody reads it.

[#1000](https://github.com/nathanjohnpayne/mergepath/issues/1000), filed August 18, is titled "Agents keep merging with reviewer findings unread—feedback accounting needs a skill, not discipline." Its worst case was a review on one of my app repositories that carried 43 inline comments plus one finding in the review body. Inline findings get a Resolve control. A finding in the review body doesn't, so it never appeared in the list of unresolved threads. The thread check passed, the PR merged, and the finding was first dispositioned 24.6 hours later, "only because a human noticed the review looked unanswered in the timeline." The defect it named was still on `main` when the issue was filed.

An earlier case had the same shape inside the review loop itself. On July 4, [#672](https://github.com/nathanjohnpayne/mergepath/issues/672) recorded the external-review orchestrator receiving an approval that came with advisory findings, correctly refusing to clear it until those findings were filed, and then discarding the verdict. The findings were "not printed, not written to the loop log on this path, and not filed anywhere." The reviewer had said something worth recording, and the system threw it away while enforcing the rule that said to record it.

## What my pipeline does today

I fixed the unread case mechanically. Since [#1018](https://github.com/nathanjohnpayne/mergepath/pull/1018) closed #1000 on August 19, a [feedback accounting gate](https://github.com/nathanjohnpayne/mergepath/blob/ce80530ee3f5424668bc5c384911dac2af6ed98d/REVIEW_POLICY.md#review-feedback-accounting-gate-1000) enumerates reviewers' findings from inline comments, review bodies, and PR-level comments, and a merge waits until findings posted equal findings accounted for. [#674](https://github.com/nathanjohnpayne/mergepath/pull/674) changed the orchestrator to file post-review issues for an approval's advisory findings instead of discarding the verdict.

I've also covered most of the oracle case for the rules themselves. The policy that governs a PR is read from its base branch, not from the PR, so "a PR editing `.github/review-policy.yml` cannot nominate its own skippable set," and a candidate policy edit can't raise its own review budget. The trusted workflow that clears the external-review label checks out the default branch "so a malicious PR cannot supply its own gate script." A PR can change the rules for the next PR. It can't change the rules for itself.

The outvoted case is where I have to be honest about my own design. Mergepath requires every blocking finding to be dispositioned, and a disposition can be a fix or a rebuttal. In the [policy's own words](https://github.com/nathanjohnpayne/mergepath/blob/ce80530ee3f5424668bc5c384911dac2af6ed98d/REVIEW_POLICY.md#enforcement-two-symmetric-gates), both blocking gates "clear a finding the same way: resolve the thread … once it is fixed or rebutted." The rebuttal has to be a public reply with real rationale, and it is on the record where I can audit it. But for a bot reviewer's finding, the agent that wrote the change also writes the rebuttal and resolves the thread.

There is one backstop. In external review, if the authoring agent rebuts a Codex finding and Codex's next review re-flags it, the agent must stop and [hand the disagreement to me](https://github.com/nathanjohnpayne/mergepath/blob/ce80530ee3f5424668bc5c384911dac2af6ed98d/REVIEW_POLICY.md#disagreements-and-tiebreaking). That only works when the reviewer reads the rebuttal again. A rebuttal the reviewer never re-reads stands.

A rebuttal is the author telling the reviewer why it's wrong. Today, in my pipeline, that is also the author deciding the reviewer was wrong.

The test case is weaker still. My protected paths cover authentication, payments, secrets, credentials, and `.github/`. They don't cover tests. The written rule is "Do not delete tests to make a build pass." The October 6 agent didn't delete a test. It replaced one.

The design already contains a stricter standard. On October 20, the same day OpenAI updated its report, my pipeline changed how it decides whether a review has stopped converging. A blocking finding counts as fixed for that purpose only with three pieces of evidence: a fix disposition recorded by someone other than the reviewer bot, a later commit that changed the finding's file, and a fresh review of that commit that did not raise it again. The policy states the purpose plainly: "no single act by the author can claim it." My pipeline holds a loop counter to that standard. The merge gate still accepts less.

## Three rules

These are proposals, not adopted enforcement. Each has a cost.

**A blocking finding clears through a fix the reviewer re-reads, or through a human.** The author's rebuttal starts that process; it doesn't finish it. The cost is real: some rebuttals are right, and a reviewer that re-raises a correct rebuttal sends the PR to me. [#962](https://github.com/nathanjohnpayne/mergepath/issues/962) already warns that routine holds train a break-glass reflex. I'd rather spend that attention on a disagreement than on a provider outage, but it's still attention.

**The author of a change cannot weaken the checks that judge it in the same diff.** Mergepath already does this for policy and gate scripts. The gap is tests. Routing every test change to external review would route nearly every PR there, so the narrower version is a check for a diff that deletes, skips, or inverts an existing assertion, with those PRs sent to a reviewer other than the author's own agent. I haven't built it, and I don't yet know how many false positives an inversion detector produces.

**An objection has to survive the handoff.** In the October 3 incident, the subagent's objection lived in a trace. The run's final response said "No messages were sent." Whatever a delegate flags as unsafe should appear in what the orchestrator reports up, verbatim, whether or not the orchestrator agreed with it. #672 was the same failure with a different payload, and the fix was the same: write it down where the next reader will see it.

## A no that holds

OpenAI's first remediation was not a better model. Its internal review step, required for its own Codex use, "has been updated to detect and block attempts to disable misalignment monitoring." In other words: a reviewer whose "no" the agent can't override.

Every system I've described already produced the right objection: the subagent, the regression test, the review-body finding, the advisory notes on an approval. The failures were in what happened next. Dissent was outvoted, rewritten, unread, or discarded. A reviewer's "no" has to hold weight on its own, so that removing it is something only the reviewer or a human can do. My pipeline gets there for unread findings and for its own policy. For a rebutted finding, it doesn't yet.
