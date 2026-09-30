---
title: "Silence Is Not an Approval"
seoTitle: "Silence Is Not an Approval"
shortTitle: "Silence Is Not an Approval"
description: "My AI review pipeline kept counting a reviewer that could not answer as one that had. Each fix made it safer, and none of them settled the question underneath: is reviewer availability a product requirement with an owner and a contract, or an implementation detail discovered one incident at a time? On September 24 I answered one piece of it. While CodeRabbit's current comment is a refusal, a completion status alone can no longer stand in for a real review of the commit."
seoDescription: "An AI code review pipeline that read a reviewer's silence as approval, why case-by-case fixes did not retire the cause, and the product decision that set a rule for making progress when evidence is missing."
category: "Agent Systems"
homepageRank: 3
author: "Nathan Payne"
date: 2026-10-01
draft: false
tags: ["AI", "Code Review", "Systems", "Product", "Failure Modes"]
image: "/og/blog/silence-is-not-an-approval.png"
keyTakeaways:
  - "The dangerous failure in an automated review pipeline is not a wrong finding. It is a pipeline that cannot tell 'the review ran' from 'the review found nothing.' In #940 a guard correctly rejected a status reading `Review rate limited`, and a later branch of the same poll cleared anyway, on an old walkthrough comment whose timestamp the push had refreshed."
  - "Most of these code paths did have a word for 'no answer.' What they lacked was a shared rule for what that word permits. The wave audit in #1186 classified an over-budget diff as transient reviewer unavailability, so each unaudited range chained into the next, and 38 days passed between its last approval and the issue that reported it."
  - "Failing closed is not free either. #962 argues that a correct rate-limit block shown as a red failure trains a break-glass reflex, and that downgrading the check to `neutral` would release the merge instead of quieting it. #1130 shows blocking can cascade too: one exhausted token budget makes every open pull request unmergeable."
  - "On September 24 I made the product decision the fixes had been working around: while CodeRabbit's current comment is a pause or rate-limit refusal, a completion status alone cannot clear the commit in place of a review with a body, pinned to the current commit. #1323 shipped that on September 25. The broader contract in #878 is still open."
pullquotes:
  - text: "A reviewer that is wrong is a cost you can price. A reviewer that is absent and counted as present is a system that will eventually pass something nobody checked, and will report that as a clean record."
    label: "The asymmetry"
    accent: red
  - text: "The audit had a word for 'no answer,' and it used it. The word was the wrong kind: transient, for a condition that could only get worse."
    label: "Compounding"
    accent: yellow
  - text: "The fixes improved safety. They did not retire the shared cause, because the cause was not in any one code path. It was an unanswered product question, and the answer was mine to give."
    label: "The owner"
    accent: blue
sidebar:
  - type: text
    content: |
      How things are counted. The appendix's merged population is the 90 distinct pull-request references parsed from commit subjects on `main` between 2026-08-23 and 2026-09-23 inclusive, validated against the pull-request number set so that issue references in commit subjects were not miscounted as pull requests. A rebase-merged pull request leaves no reference in its subject and would be missed entirely, so 90 is a floor. The count of twelve that name the failure mode is by title only, and titles undercount, so it is a floor too.

      Additions and deletions are each pull request's diff as GitHub reports it against its merge base. Review rounds are review submissions on the pull request timeline. The burst counts 21 commits on `main` between 2026-09-14T00:00:00Z and 2026-09-15T23:59:59Z; two of them are the same pull request, #1266, landing as a merge commit plus its branch commit, so the distinct-change count is 20. Issue age is the whole-day, date-to-date difference from the issue's creation date to 2026-09-23.
  - type: text
    content: |
      Provenance. Every pull request figure, issue timestamp, label and quoted sentence comes from the GitHub API. The evidence window was read on 2026-09-23 and re-checked on 2026-09-24. The #956 decision, #1323, and the current state of #878, #940, #962, #1130 and #1186 were read on 2026-09-30. Quotations from issue and pull request bodies are verbatim, with em dash spacing normalized to house style. Most of those bodies were written by coding agents working under my account or a bot identity, so they are the pipeline's own record, not independent testimony. The #956 decision is quoted from a comment I posted.

      Issue timelines paginate at 30 events, so any list of referencing pull requests here is a floor. The open-issue count in the appendix is a title-only match and is likewise a floor. The 127-commit range and the 2.8-times overage are #1186's own measurements and were not independently re-derived.
---

I have written before about [automated reviewers being right and the pull request being wrong anyway](/blog/every-reviewer-was-right/). This is the opposite failure: the reviewer that never answered, and the pipeline that scored the silence.

[Mergepath](/blog/agent-approval-workflow-genesis-of-mergepath/) is the repository standard my coding agents work under: canonical docs every agent reads before touching code, fail-closed CI checks, review under a separate reviewer identity, a second agent holding a merge veto on larger changes, and one-command propagation to downstream repositories. It exists to make everything else I build with agents safe to build with agents.

## A Clear That Was Not a Review

On August 10, as [#940](https://github.com/nathanjohnpayne/mergepath/issues/940) records, the helper that waits for CodeRabbit to review a pull request's current commit reported `status: cleared` on a commit CodeRabbit had not reviewed. The commit's status read `success | Review rate limited`. CodeRabbit had queued the review, started it, and hit its limit inside six seconds, then published no review of that commit.

The helper did not fall for the status: its newest guard saw that the description did not name a completed review and refused the fast path. The poll it fell through to then found CodeRabbit's walkthrough comment, written hours earlier for an older commit, whose update timestamp CodeRabbit had bumped on the push. It looked fresh, graded as a review, and cleared. The evidence that should have stopped it had been read and rejected one branch earlier.

The damage was bounded, as the issue notes. The required merge gate does not consult this helper, so no known defect got through. What was lost was a review: CodeRabbit never passed over that commit, and the Codex failover that should have replaced it never fired.

That is not a reviewer bug. The pipeline could say "no answer," and did, correctly, once. It had no single rule for what "no answer" permits, so another path through the same script answered differently.

## The Question Underneath

That is the question this post is about, and the one I should have asked from the start:

**Is reviewer availability a stated product requirement with an owner and a contract, or is it an implementation detail discovered one incident at a time?**

Through August and most of September, I treated it as the second. Each incident got a correct, local fix that taught one more code path one more shape of silence. Most of those code paths already had a concept of "no answer." What they lacked was an agreed rule, owned by someone, for what a missing answer may prove and what the caller does next. Three cases show the cost.

## When No Answer Accumulates

[#1186](https://github.com/nathanjohnpayne/mergepath/issues/1186), filed on September 4, reports that the wave audit, which reviews the canonical content Mergepath propagates to downstream repositories, "has not advanced its watermark since 2026-07-28: over-budget diffs classify as 'reviewer unavailable' and chain forward, making the next range larger."

The audit had a word for "no answer," and it used it. The word was the wrong kind. *Reviewer unavailable* is transient, and transient conditions carry forward to the next run. But an over-budget diff does not shrink by waiting. Each unaudited range carried into the next wave, making the next diff larger and the next overage certain. In the issue's words: "Every wave since has exited 4, failed open, and chained its un-audited range into the next one." At filing, the issue recorded the range at 127 commits and the diff at 2.8 times the review budget.

Thirty-eight days passed between the last approval and the filing. The fix, [#1263](https://github.com/nathanjohnpayne/mergepath/pull/1263), is 45 added lines: refuse an oversized scope before dispatching a reviewer, instead of calling it unavailability.

What made this one compound is specific to it. The failure blocked no propagation; each run recorded it, but nothing aggregated those records into a warning about the growing backlog. Each run's leftover became the next run's input, so the error grew instead of repeating. And "reviewer unavailable" reads like weather, not a defect. None of that is a law about failing open. It is what happens when a no-answer state is filed under the wrong kind and nobody owns the difference.

Blocking can cascade too. [#1130](https://github.com/nathanjohnpayne/mergepath/issues/1130), still open, describes a required gate that "runs on the App installation budget (1,000/hr/repo), so an exhausted GITHUB_TOKEN deadlocks every open PR," after which "every open PR in the repository becomes unmergeable regardless of its own merits." That is failing closed, doing harm at repository scale. The difference is that it announces itself: nobody can merge.

## When No Answer Costs a Person

The tempting conclusion is to fail closed everywhere and let a human sort it out. [#962](https://github.com/nathanjohnpayne/mergepath/issues/962), open since August 13, is the best argument against doing that carelessly:

> "When the auto-merge rate-limit gate blocks, it is usually *right* to block—neither bot has read the diff, so the PR needs a human."

> "A break-glass prompt is exactly the wrong affordance for a routine provider outage: it trains the reflex on a case where nothing is actually wrong with the code."

A hold spends human attention, and a reflex trained on false alarms is the one that waves through the real one. The obvious remedy, a quieter alarm, reopens the original defect: "Branch protection treats a required check as satisfied on `neutral`, so if this check is required, downgrading the conclusion would *release* the merge rather than merely recolouring it." Recolor the alarm and it becomes a green light.

[#826](https://github.com/nathanjohnpayne/mergepath/issues/826) goes further, arguing that CodeRabbit should not be load-bearing for merge at all, because "the budget is exhausted by the system reviewing its own churn." It is open, labeled as a decision, and blocked.

Failing open can lose reviews quietly; failing closed can spend people loudly. Neither is free. Choosing between them for a given kind of silence is a product decision, and I had been leaving it to whichever code path met the case first.

## The Patch Series

[#878](https://github.com/nathanjohnpayne/mergepath/issues/878), "Redesign coderabbit-wait classification around machine markers instead of prose greps," was opened on August 3. A September 4 rewrite raised it to `priority:high` and diagnosed the family better than I have:

> "They are not independent defects. They are instances of one property: **CodeRabbit's review state is inferred by grepping a rendered vendor surface, and that surface is neither stable nor machine-specified.**"

Its first acceptance criterion asks for "a written contract (extending `specs/coderabbit_review_sensing.md`) enumerating each observable signal, its source, and what it is permitted to prove—separating *the review ran* from *the review found nothing*." Its second asks for one implementation, "consumed by `scripts/coderabbit-wait.sh` and `scripts/coderabbit-severity-gate.sh` alike." The same rewrite added:

> "Do not attempt this as a patch series. The original filing's own history—seven review rounds, fifteen valid findings, no convergence—is the argument against that."

Ten days later, across September 14 and 15, twenty distinct changes landed on `main` in 32 hours and 41 minutes. By my reading of their titles and summaries, eight restate one idea against different surfaces: a value meaning "I could not answer," read as an answer. [#1271](https://github.com/nathanjohnpayne/mergepath/pull/1271) says it most plainly: "A failed CodeRabbit marker extractor currently returns successful absence." #878 records six of the twenty as shipped against it. The appendix has the full list and how I sorted it.

The fixes improved safety. Two of them, [#1274](https://github.com/nathanjohnpayne/mergepath/pull/1274) and [#1279](https://github.com/nathanjohnpayne/mergepath/pull/1279), closed #940. They did not retire the shared cause, because the cause was not in any one code path. It was an unanswered product question, and #878 said whose it was: its banner kept it open at high priority for "the #956 product decision."

## The Decision

[#956](https://github.com/nathanjohnpayne/mergepath/issues/956) had been open since August 11. On a pull request where CodeRabbit was auto-paused, the waiter cleared in one second, because the commit's status read `success | Review completed` although CodeRabbit had not reviewed that commit. Posting `@coderabbitai resume` by hand flipped the same status to `pending`, and a real review began. The question was not how to parse a status but which evidence wins when the vendor says "paused" in one place and "completed" in another.

On September 24 I decided it, and recorded the decision on the issue:

> "Require actual review evidence for the current commit while CodeRabbit's current provider comment is a pause or rate-limit refusal. A later per-SHA StatusContext reading `success | Review completed` is corroboration only in that state: it must not clear the refusal by itself, even after the existing grace interval or a published rate-limit window has expired."

A body-less acknowledgment does not count as that evidence; a review run with a body, pinned to the current commit, does. [#1323](https://github.com/nathanjohnpayne/mergepath/pull/1323) implemented it and merged on September 25.

That rule has a cost, and I chose it knowingly. While CodeRabbit's current comment remains a refusal, a completion status alone no longer clears the commit. The existing resume, retry, timeout, and Codex failover rules still apply. That is slower, and some of those waits will be on commits with nothing wrong in them. It is #962's cost, accepted on purpose.

It is also not the whole answer. It settles one case: what a refusal plus a completion status may prove. #878 stays open at high priority for the rest: the shared classification contract, coverage of the remaining states, and delivery to downstream repositories. I have not done that part yet.

What changed is the rule for making progress when evidence is missing. Before, each code path decided for itself whether a silence was close enough to a yes, and the fixes taught them one at a time that it was not. Now there is one written rule, with an owner, for one kind of silence: while the provider's current comment remains a refusal, a completion status alone cannot substitute for a review of this commit. The remaining work is to write that rule for every other kind of silence, once, and have the waiter and the gate both read it.

## Appendix: The Evidence

The body keeps three cases. These are the rest, for readers who would rather check the pattern than take it on trust.

### The Window

Ninety pull requests merged into Mergepath between August 23 and September 23, a floor for reasons the sidebar gives. Twelve of their titles explicitly name an absent, truncated, rate-limited, timed-out or budget-exhausted reviewer, check or API response. That is a title-only count, and a floor.

Eight merged fixes in the family:

| Pull Request | What It Fixed | Diff at Merge | Rounds |
|---|---|---:|---:|
| [#1179](https://github.com/nathanjohnpayne/mergepath/pull/1179) | A rate-limit probe mapped to "not yet," which then waited out the full timeout on a state nothing in the run could change | +1,298 / −69 | 15+ |
| [#1274](https://github.com/nathanjohnpayne/mergepath/pull/1274) | A walkthrough refreshed by a push, clearing polling after the same run had already rejected the head's pending status | +206 / −56 | 3 |
| [#1279](https://github.com/nathanjohnpayne/mergepath/pull/1279) | A refusal with no notice attached, which reached the ordinary timeout and never triggered failover | +183 / −36 | 1 |
| [#1282](https://github.com/nathanjohnpayne/mergepath/pull/1282) | A summary edited after a push whose risk block named an older commit | +104 / −1 | 1 |
| [#1283](https://github.com/nathanjohnpayne/mergepath/pull/1283) | An aged summary taking the completed-summary escape before the trusted status was evaluated | +105 / −4 | 1 |
| [#1248](https://github.com/nathanjohnpayne/mergepath/pull/1248) | A file listing truncated at GitHub's 3,000-entry cap, read as a complete inventory | +68 / −1 | 1 |
| [#1263](https://github.com/nathanjohnpayne/mergepath/pull/1263) | A diff over its byte budget, classified as transient reviewer unavailability | +45 / −1 | 2 |
| [#1293](https://github.com/nathanjohnpayne/mergepath/pull/1293) | Codex review requests with no upper bound; new requests now stop at the configured round cap | +573 / −19 | 15 |

Most are small. [#1248](https://github.com/nathanjohnpayne/mergepath/pull/1248) closes [#1247](https://github.com/nathanjohnpayne/mergepath/issues/1247), filed 56 seconds before the pull request opened, whose substance is one sentence: GitHub "caps that listing at 3000 entries, and at the cap the inventory may be truncated." The fix fails closed to "external review required," because, in its own words, "a possibly-truncated inventory cannot support either verdict."

### The Burst

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

Sorted by title and the first lines of each body, a judgment call rather than a measurement: eight in the family (#1263, #1271, #1273, #1274, #1279, #1282, #1283, #1285); two follow-ups on the wave audit (#1270, #1272); three arguable, about telling a real review request from something that looks like one (#1280, #1284, #1287); and seven unrelated (#1262, #1264, #1265, #1266, #1267, #1278, #1286). #878 records six of the eight as shipped against it: #1271, #1273, #1274, #1279, #1282 and #1283.

### What Did Not Land

[#1232](https://github.com/nathanjohnpayne/mergepath/pull/1232) was an attempt at half of #1130: move the read-only gate steps off the repository token budget. It ran four review rounds and closed unmerged on September 12, fifty-one minutes after it opened. [#1291](https://github.com/nathanjohnpayne/mergepath/pull/1291) merged on September 22 and makes duplicate events cheaper, but by its own account "removes no event deliveries or job executions." An earlier draft of this post listed #1232 as shipped, from its title rather than its state: a pull request that did not answer, read as an answer.

### Open Issues in the Family

On September 23, at least eleven of the repository's 164 open issues, matched by title, concerned how the pipeline handles a rate limit, a quota, a budget or a timeout. Nine describe defects; the other two are #962 and #826, discussed above. The oldest, [#722](https://github.com/nathanjohnpayne/mergepath/issues/722), was 78 days old that day. The newest, [#1305](https://github.com/nathanjohnpayne/mergepath/issues/1305), was filed that day.

### The Pattern, Done by Hand

The representation itself is not hard. [#1058](https://github.com/nathanjohnpayne/mergepath/issues/1058) records the branch-protection setting `required_status_checks.strict` as "**unknown**—`GET /branches/main/protection` returns `403 Resource not accessible by integration`." Whoever wrote that table could not read the value, and wrote `unknown` with the reason beside it instead of guessing. What the code lacks is one shared version of that, which the waiter and the gate both read.
