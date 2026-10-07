---
title: "Silence Is Not an Approval"
seoTitle: "Silence Is Not an Approval"
shortTitle: "Silence Is Not an Approval"
description: "My review pipeline kept counting a reviewer that hadn't answered as one that had. Local fixes helped, but each path still decided what silence could prove. I had to decide the rule myself, including what progress should cost when the evidence was missing."
seoDescription: "An AI code review pipeline that read a reviewer's silence as approval, why case-by-case fixes did not retire the cause, and the product decision that set a rule for making progress when evidence is missing."
category: "Agent Systems"
homepageRank: 3
author: "Nathan Payne"
date: 2026-10-01
draft: false
tags: ["AI", "Code Review", "Systems", "Product", "Failure Modes"]
image: "/og/blog/silence-is-not-an-approval.png"
keyTakeaways:
  - "The dangerous failure in an automated review pipeline is not a wrong finding. It is a pipeline that cannot tell \"the review ran\" from \"the review found nothing.\" In #940, the guard correctly rejected `Review rate limited`. Polling still cleared on an old walkthrough whose timestamp the push had refreshed. The required gate wasn't bypassed; the commit lost a review and its Codex failover."
  - "The wave audit in #1186 had a word for no answer, but used a transient state for an over-budget diff. Each unaudited range fed the next one. Thirty-eight days passed between the last approval and the issue reporting the backlog."
  - "Blocking has a cost too. #962 describes a correct hold shown as a red failure that trains a break-glass reflex; making it `neutral` would release the merge. #1130 describes a spent token budget stopping every open PR."
  - "On September 24, I decided that a completion status alone couldn't clear a current CodeRabbit pause or rate-limit refusal. It can't substitute for a review with a body pinned to the current commit. #1323 shipped the rule on September 25; #878's broader contract remains open."
pullquotes:
  - text: "A reviewer that is wrong is a cost you can price. A reviewer that is absent and counted as present is a system that will eventually pass something nobody checked, and will report that as a clean record."
    label: "The asymmetry"
    accent: red
  - text: "The audit had a word for \"no answer,\" and it used it. The word was the wrong kind: transient, for a condition that could only get worse."
    label: "Compounding"
    accent: yellow
  - text: "The fixes improved safety. They did not retire the shared cause, because the cause was not in any one code path. It was an unanswered product question, and the answer was mine to give."
    label: "The owner"
    accent: blue
sidebar:
  - type: text
    content: |
      How things are counted. The appendix's merged population is the 90 distinct pull-request references parsed from commit subjects on `main` between 2026-08-23 and 2026-09-23 inclusive, validated against the pull-request number set so that issue references in commit subjects were not miscounted as pull requests. A rebase-merged pull request leaves no reference in its subject and would be missed entirely, so 90 is a floor. The count of twelve that name the failure mode is by title only, and titles undercount, so it is a floor too.

      Additions and deletions are each pull request's diff as GitHub reports it against its merge base. Review rounds are review submissions on the pull request that carry a body; body-less acknowledgments are not counted. The burst counts 21 commits on `main` between 2026-09-14T00:00:00Z and 2026-09-15T23:59:59Z; two of them are the same pull request, #1266, landing as a merge commit plus its branch commit, so the distinct-change count is 20. Issue age is the whole-day, date-to-date difference from the issue's creation date to 2026-09-23.
  - type: text
    content: |
      Provenance. Every pull request figure, issue timestamp, label and quoted sentence comes from the GitHub API. The evidence window was read on 2026-09-23 and re-checked on 2026-09-24. The #956 decision, #1323, and the current state of #878, #940, #962, #1130 and #1186 were read on 2026-09-30 and re-read on 2026-10-06. Quotations from issue and pull request bodies are verbatim, with em dash spacing normalized to house style. Most of those bodies were written by coding agents working under my account or a bot identity, so they are the pipeline's own record, not independent testimony. The #956 decision is quoted from a comment I posted.

      Issue timelines paginate at 30 events, so any list of referencing pull requests here is a floor. The open-issue count in the appendix is a title-only match and is likewise a floor. The 127-commit range and the 2.8-times overage are #1186's own measurements and were not independently re-derived.
---

In [the last post](/blog/every-reviewer-was-right/), every reviewer was right and the pull request was still wrong. This time a reviewer hadn't answered, and my pipeline counted that as a review.

[Mergepath](/blog/agent-approval-workflow-genesis-of-mergepath/) sets the rules my coding agents work under. It has canonical docs for agents to read before editing, fail-closed CI checks, a separate reviewer identity, a second agent with a merge veto on larger changes, and one-command propagation to downstream repositories. I built it so I could safely build other things with agents.

<span id="a-clear-that-was-not-a-review"></span>

## What the clearance meant

On August 10, [#940](https://github.com/nathanjohnpayne/mergepath/issues/940) recorded the CodeRabbit waiting helper returning `status: cleared` for a commit CodeRabbit hadn't reviewed. The commit's status was `success | Review rate limited`. CodeRabbit had queued the review, started it, and hit its limit within six seconds. It published no review of that commit.

The newest guard got that status right. The description didn't name a completed review, so it refused the fast path. Polling then found a walkthrough comment from hours earlier, written for an older commit. CodeRabbit had updated its timestamp on the push. The poll treated it as a fresh review and cleared. One branch had rejected the missing evidence; a later branch accepted something else as a substitute.

The damage was bounded. This false clearance did not bypass the required merge gate, which does not consult the helper. CodeRabbit did not review that commit, and the Codex failover that should have replaced it never fired. I lost a review.

That is not a reviewer bug. The helper had correctly recognized "no answer." Different paths in the same script disagreed about what that permitted.

A reviewer that is wrong is a cost you can price. A reviewer that is absent and counted as present is a system that will eventually pass something nobody checked, and will report that as a clean record.

<span id="the-question-underneath"></span>

## The question I had left open

I should have asked this at the start:

**Is reviewer availability a stated product requirement with an owner and a contract, or is it an implementation detail discovered one incident at a time?**

Through August and most of September, I treated it as an implementation detail. Each incident got a correct local fix that taught another code path another form of silence. Most paths already had a word for "no answer." I hadn't set a shared rule for what a missing answer could prove or what the caller should do next.

<span id="when-no-answer-accumulates"></span>

## An audit that kept falling behind

[#1186](https://github.com/nathanjohnpayne/mergepath/issues/1186), filed on September 4, describes the wave audit that reviews canonical content propagated to consumers: it "has not advanced its watermark since 2026-07-28: over-budget diffs classify as 'reviewer unavailable' and chain forward, making the next range larger."

The audit had a word for "no answer," and it used it. The word was the wrong kind: transient, for a condition that could only get worse. Waiting doesn't shrink an over-budget diff. The issue said: "Every wave since has exited 4, failed open, and chained its un-audited range into the next one." At filing, it recorded 127 commits at 2.8 times the review budget.

Thirty-eight days passed between the last approval and the filing. The first fix, [#1263](https://github.com/nathanjohnpayne/mergepath/pull/1263), added 45 lines to reject an oversized scope before dispatching a reviewer, rather than calling the result unavailability. #1186 stays open for the backlog itself, which that fix does not split.

This case compounded because it blocked no propagation. Each run recorded the failure, but nothing aggregated those records into a warning about the backlog. Each leftover range became the next run's input. And "reviewer unavailable" reads like weather. That explains this case; it isn't a general law about failing open. It is what happens when a no-answer state is filed under the wrong kind and nobody owns the difference.

Blocking can cascade too. [#1130](https://github.com/nathanjohnpayne/mergepath/issues/1130), still open, describes a required gate that "runs on the App installation budget (1,000/hr/repo), so an exhausted GITHUB_TOKEN deadlocks every open PR." Then "every open PR in the repository becomes unmergeable regardless of its own merits." Failing closed did harm across the repository. It was visible, though: nobody could merge.

<span id="when-no-answer-costs-a-person"></span>

## The cost of blocking

I could fail closed everywhere and make a human sort it out. [#962](https://github.com/nathanjohnpayne/mergepath/issues/962), open since August 13, explains why that needs care:

> "When the auto-merge rate-limit gate blocks, it is usually *right* to block—neither bot has read the diff, so the PR needs a human."

> "A break-glass prompt is exactly the wrong affordance for a routine provider outage: it trains the reflex on a case where nothing is actually wrong with the code."

A hold spends human attention, and a reflex trained on false alarms is the one that waves through the real one. A quieter alarm has its own trap: "Branch protection treats a required check as satisfied on `neutral`, so if this check is required, downgrading the conclusion would *release* the merge rather than merely recolouring it." Recolor the alarm and it becomes a green light.

[#826](https://github.com/nathanjohnpayne/mergepath/issues/826) proposes taking CodeRabbit out of the required merge path altogether: "the budget is exhausted by the system reviewing its own churn." It's open, labeled as a decision, and blocked.

I had to choose a response for each kind of silence. Letting work continue could lose reviews quietly. Blocking could spend someone's time or stop the whole repository. I had left that choice to whichever code path hit the case first.

## The patch series

[#878](https://github.com/nathanjohnpayne/mergepath/issues/878), "Redesign coderabbit-wait classification around machine markers instead of prose greps," opened on August 3. Its September 4 rewrite raised it to `priority:high` and diagnosed the family better than I have:

> "They are not independent defects. They are instances of one property: **CodeRabbit's review state is inferred by grepping a rendered vendor surface, and that surface is neither stable nor machine-specified.**"

The first acceptance criterion asks for "a written contract (extending `specs/coderabbit_review_sensing.md`) enumerating each observable signal, its source, and what it is permitted to prove—separating *the review ran* from *the review found nothing*." The second asks for one implementation, "consumed by `scripts/coderabbit-wait.sh` and `scripts/coderabbit-severity-gate.sh` alike." The rewrite also said:

> "Do not attempt this as a patch series. The original filing's own history—seven review rounds, fifteen valid findings, no convergence—is the argument against that."

Ten days later, on September 14 and 15, twenty distinct changes landed on `main` in 32 hours and 41 minutes. By my reading of their titles and summaries, eight restate the same problem on different surfaces: a value meaning "I could not answer" gets read as an answer. [#1271](https://github.com/nathanjohnpayne/mergepath/pull/1271) says it plainly: "A failed CodeRabbit marker extractor currently returns successful absence." #878's September 15 banner recorded six of the twenty as shipped against it. The full list and my classification are in the appendix.

The fixes improved safety. They did not retire the shared cause, because the cause was not in any one code path. It was an unanswered product question, and the answer was mine to give. Two fixes, [#1274](https://github.com/nathanjohnpayne/mergepath/pull/1274) and [#1279](https://github.com/nathanjohnpayne/mergepath/pull/1279), closed #940. #878 remained open at high priority for "the #956 product decision."

## The decision

[#956](https://github.com/nathanjohnpayne/mergepath/issues/956) had been open since August 11. On an auto-paused PR, the waiter cleared in one second because the commit's status read `success | Review completed`. CodeRabbit hadn't reviewed that commit. Posting `@coderabbitai resume` by hand changed the same status to `pending`, and a review began. I needed to decide which evidence won when the provider said "paused" in one place and "completed" in another.

On September 24, I recorded my decision on the issue:

> "Require actual review evidence for the current commit while CodeRabbit's current provider comment is a pause or rate-limit refusal. A later per-SHA StatusContext reading `success | Review completed` is corroboration only in that state: it must not clear the refusal by itself, even after the existing grace interval or a published rate-limit window has expired."

A body-less acknowledgment isn't that evidence. A review with a body, pinned to the current commit, is. [#1323](https://github.com/nathanjohnpayne/mergepath/pull/1323) implemented the rule and merged on September 25.

I accepted the cost: while CodeRabbit's current comment remains a refusal, a completion status alone no longer clears the commit. The existing resume, retry, timeout, and Codex failover rules still apply. That is slower, and some of those waits will be on commits with nothing wrong in them. It is #962's cost.

This settles one case, a refusal paired with a completion status. #878 stays open at high priority for the shared classification contract, the remaining states, and downstream delivery. I haven't done that part yet.

I now have one written rule, with an owner, for one kind of silence. A completion status can't stand in for a review of the current commit while the provider's current comment remains a refusal. The rest of the work is to write that kind of rule for each other missing-answer state, once, and have both the waiter and the gate use it. The response may differ by state. It shouldn't differ by which script happened to see it.

## Appendix: The evidence

The body follows three cases. This is the rest of the evidence.

### The window

Ninety PRs merged into Mergepath between August 23 and September 23. That's a floor, for the reasons in the sidebar. Twelve titles explicitly name an absent, truncated, rate-limited, timed-out or budget-exhausted reviewer, check or API response. That title-only count is also a floor.

Eight merged fixes in the family:

| Pull Request | What It Fixed | Diff at Merge | Rounds |
|---|---|---:|---:|
| [#1179](https://github.com/nathanjohnpayne/mergepath/pull/1179) | A rate-limit probe mapped to "not yet," which then waited out the full timeout on a state nothing in the run could change | +1,298 / −69 | 15 |
| [#1274](https://github.com/nathanjohnpayne/mergepath/pull/1274) | A walkthrough refreshed by a push, clearing polling after the same run had already rejected the head's pending status | +206 / −56 | 3 |
| [#1279](https://github.com/nathanjohnpayne/mergepath/pull/1279) | A refusal with no notice attached, which reached the ordinary timeout and never triggered failover | +183 / −36 | 1 |
| [#1282](https://github.com/nathanjohnpayne/mergepath/pull/1282) | A summary edited after a push whose risk block named an older commit | +104 / −1 | 1 |
| [#1283](https://github.com/nathanjohnpayne/mergepath/pull/1283) | An aged summary taking the completed-summary escape before the trusted status was evaluated | +105 / −4 | 1 |
| [#1248](https://github.com/nathanjohnpayne/mergepath/pull/1248) | A file listing truncated at GitHub's 3,000-entry cap, read as a complete inventory | +68 / −1 | 1 |
| [#1263](https://github.com/nathanjohnpayne/mergepath/pull/1263) | A diff over its byte budget, classified as transient reviewer unavailability | +45 / −1 | 2 |
| [#1293](https://github.com/nathanjohnpayne/mergepath/pull/1293) | Codex review requests with no upper bound; new requests now stop at the configured round cap | +573 / −19 | 15 |

Most are small. [#1248](https://github.com/nathanjohnpayne/mergepath/pull/1248) closes [#1247](https://github.com/nathanjohnpayne/mergepath/issues/1247), filed 56 seconds before the PR opened. Its point is one sentence: GitHub "caps that listing at 3000 entries, and at the cap the inventory may be truncated." The fix fails closed to "external review required" because "a possibly-truncated inventory cannot support either the threshold test or the protected-path match."

### The burst

All 21 commits on `main` from `2026-09-14T03:20:29Z` to `2026-09-15T12:01:26Z`, in committer-date order:

```
fix(wave-audit): refuse oversized scopes before reviewer dispatch (#1263)
docs: record staged consumer admin-enforcement decision (#1265)
fix(1149): close agent-review concurrency expression (#1262)
fix: acknowledge accounted Phase 4b approval bodies (#1264)
fix(937): stage Five Across admin-enforcement audit
Merge pull request #1266 from nathanjohnpayne/codex/issue-937-five-admin-audit
fix: preserve Unicode list identity boundaries (#1267)
fix: propagate CodeRabbit tier extraction errors (#1271)
fix(1186): retain validated dry-run verdict (#1270)
fix: expose selected wave watermark annotation age (#1272)
fix(1037): bind finding counts to CodeRabbit review runs (#1273)
fix(coderabbit): veto fallback clearance on unfinished status (#1274)
fix: enforce human-controlled holds before clearance exemptions (#1278)
fix(coderabbit): fail over notice-less refusals at timeout (#1279)
fix(coderabbit): refuse stale risk-marker fallback clearance (#1034) (#1282)
fix: explain review requests when external clearance is blocked (#1280)
fix(coderabbit): retain pending veto for aged marker summaries (#1283)
fix: bind diagnostic evidence to review commands (#1284)
fix: distinguish live Codex quota responses (#722) (#1285)
test: transport Codex marker fixture paths safely (#1286)
fix: require exact Codex request evidence (#1287)
```

I sorted these by title and the first lines of each body. This is judgment, not measurement: eight in the family (#1263, #1271, #1273, #1274, #1279, #1282, #1283, #1285); two wave-audit follow-ups (#1270, #1272); three arguable cases about distinguishing a real review request from something that looks like one (#1280, #1284, #1287); seven unrelated (#1262, #1264, #1265, #1266, #1267, #1278, #1286). #878's September 15 banner recorded six of the eight as shipped against it: #1271, #1273, #1274, #1279, #1282 and #1283.

### What did not land

[#1232](https://github.com/nathanjohnpayne/mergepath/pull/1232) tried to move the read-only gate steps off the repository token budget, one half of #1130. After four rounds, it closed unmerged on September 12, fifty-one minutes after opening. [#1291](https://github.com/nathanjohnpayne/mergepath/pull/1291) merged on September 22. It makes duplicate events cheaper but "removes no event deliveries or job executions." My earlier draft listed #1232 as shipped, from its title rather than its state. A PR that hadn't delivered had become evidence of work done.

### Open issues in the family

On September 23, at least eleven of 164 open issues concerned the pipeline's handling of rate limits, quotas, budgets or timeouts, matched by title. Nine describe defects. The other two are #962 and #826 above. The oldest, [#722](https://github.com/nathanjohnpayne/mergepath/issues/722), was 78 days old; the newest, [#1305](https://github.com/nathanjohnpayne/mergepath/issues/1305), was filed that day.

### The pattern, done by hand

The representation itself isn't hard. [#1058](https://github.com/nathanjohnpayne/mergepath/issues/1058) shows the useful response done by hand. Its table records `required_status_checks.strict` as "**unknown**—`GET /branches/main/protection` returns `403 Resource not accessible by integration`." The writer couldn't read the value, so recorded `unknown` and the reason. I need the code's equivalent of that table: one shared account of the evidence that both the waiter and the gate read.
