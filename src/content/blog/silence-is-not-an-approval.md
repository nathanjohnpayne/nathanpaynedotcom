---
title: "Silence Is Not an Approval: 90+ Merged Pull Requests, 11+ Open Issues, One Missing Type"
seoTitle: "Silence Is Not an Approval"
shortTitle: "Silence Is Not an Approval"
description: "Ninety pull requests merged into Mergepath in a month, and the ones worth writing about all fix the same defect in a different costume: a reviewer that could not answer produced a value the pipeline scored as an answer. A rate limit read as cleared. A listing truncated at 3,000 entries read as complete. An over-budget diff read as reviewer unavailable, which made the next diff bigger and stalled an audit for 38 days. At least eleven open issues still name instances, the oldest 78 days old. The issue that proposes the general fix has been open since August 3, and since September 4 it has said not to attempt this as a patch series. Ten days later, I attempted it as a patch series."
seoDescription: "A rate limit read as cleared, a truncated listing read as complete, a budget overage that compounds. Why fail-open defects in an AI review pipeline resist case-by-case fixes, and what the counter-case costs."
category: "Agent Systems"
author: "Nathan Payne"
date: 2026-09-23
draft: true
tags: ["AI", "Code Review", "Systems", "Product", "Failure Modes"]
image: "/og/blog/silence-is-not-an-approval.png"
keyTakeaways:
  - "The dangerous failure in an automated review pipeline is not a wrong finding. It is a reviewer that could not answer and a caller with no way to represent that, so it takes the nearest available value. Issue #940 records polling returning `status: cleared` against a head whose only status read `success | Review rate limited`, with no review object attached at all."
  - "Fail-open defects compound where fail-closed defects merely block. Issue #1186 records a wave audit that had not approved anything since 2026-07-28: every wave since had exited 4, failed open, and chained its unaudited range into the next, making the next range larger. It was filed 38 days later. A blocked merge gets noticed because somebody cannot merge; nothing about this one stopped anyone."
  - "The counter-case is real and the obvious remedy reopens the original defect. Issue #962 argues that a correct rate-limit block presented as a red failure check trains a break-glass reflex on a case where nothing is wrong with the code. It also notes that branch protection treats a required check as satisfied on `neutral`, so downgrading the conclusion would release the merge rather than merely recolor it."
  - "Issue #878 already specifies the general fix, one classification contract consumed by both the waiter and the gate, and has been open since 2026-08-03. A rewrite on 2026-09-04 raised it to priority:high and added this guidance: do not attempt this as a patch series. Between September 14 and 15 I merged twenty distinct changes in 32 hours, six of them against #878. The enumeration is the tell, and I am the one enumerating."
pullquotes:
  - text: "A reviewer that is wrong is a cost you can price. A reviewer that is absent and counted as present is a system that will eventually pass something nobody checked, and will report that as a clean record."
    label: "The asymmetry"
    accent: red
  - text: "The audit had not advanced its watermark since July 28. Nothing it did stopped anyone, so nothing announced it. Every wave failed open into the next, and the reason it was failing got structurally worse each time."
    label: "Compounding"
    accent: yellow
  - text: "The issue that describes the general fix carries an instruction not to fix it in pieces. The instruction had been there for ten days when I shipped six pieces in thirty-two hours."
    label: "The enumeration is the tell"
    accent: blue
sidebar:
  - type: text
    content: |
      How things are counted. The merged population is the 90 distinct pull-request references parsed from commit subjects on `main` between 2026-08-23 and 2026-09-23 inclusive, read from the repository's commit list and validated against the pull-request number set so that issue references in commit subjects were not miscounted as pull requests. Five commits carry `(#1130)` in their subject and reference an open issue, not a pull request; they are excluded on that basis. A rebase-merged pull request leaves no reference in its subject and would be missed entirely, so 90 is a floor.

      Additions, deletions and file counts are each pull request's diff as GitHub reports it against its merge base. Review rounds are review submissions on the pull request timeline. Merge timestamps are the timeline's merge event where one exists. #1169 has none, so its timestamp is the date of the squash commit bearing its number, a different field. #1263 has a merge event, but its timestamp to the second is taken from its squash commit.

      The burst figure counts 21 commits on `main` between 2026-09-14T00:00:00Z and 2026-09-15T23:59:59Z. Two of those are the same pull request, #1266, landing as a merge commit plus its branch commit, so the distinct-change count is 20. Issue age is the whole-day, date-to-date difference from the issue's creation date to 2026-09-23.
  - type: text
    content: |
      Provenance, and what is not established. Every pull request figure, issue timestamp, label and quoted sentence comes from the GitHub API, read on 2026-09-23 and re-checked on 2026-09-24. Quotations from issue and pull request bodies are verbatim, with em dash spacing normalized to house style. Most of those bodies were written by coding agents working under my account or a bot identity, so they are the pipeline's own record, not independent testimony.

      The split between defensive hardening and new capability across all 90 is classified by title only, because 90 bodies were not read. Twelve titles explicitly name an absent, truncated, rate-limited, timed-out or budget-exhausted reviewer, check or API response. Thirty-four are fail-closed in shape. This post does not claim a number between them.

      Issue and pull request timelines paginate at 30 events, so every list of referencing pull requests here is a floor. There is no issue full-text search available, so the count of 11 open issues in this family is a title-only match and is likewise a floor. Three figures quoted from inside issue bodies, CodeRabbit's hourly allowance, the observed Fair Usage windows, and the 17-of-400 marker rate, are recorded as what those issues claim and were not independently re-derived.
---

I have written before about [automated reviewers being right and the pull request being wrong anyway](/blog/every-reviewer-was-right/). This is the opposite failure, and it is the one I had not been looking at: the reviewer that never answered, and the pipeline that scored the silence.

Ninety pull requests merged into [Mergepath](/blog/agent-approval-workflow-genesis-of-mergepath/) between August 23 and September 23. Mergepath is the repository standard my coding agents work under: canonical docs every agent reads before touching code, fail-closed CI checks, review under a separate reviewer identity, a second agent holding a merge veto on larger changes, and one-command propagation to downstream repositories. It is the thing that is supposed to make everything else I build with agents safe to build with agents.

Ninety is a floor, not a count, for a reason the sidebar explains. It is also not a coherent month. Most of those pull requests are ordinary. But the ones I keep returning to are the same defect wearing different clothes, and the defect is this: **a reviewer that could not answer produced a value, and the caller had no way to represent "no answer," so it used the value.**

## The Shape of It

Start with [#940](https://github.com/nathanjohnpayne/mergepath/issues/940), because it is the cleanest statement of the problem in the repository. Polling returned `status: cleared` on a head whose status context read `success | Review rate limited`, with no review object attached at all. CodeRabbit had not reviewed anything. It had said, in the only vocabulary GitHub's status API gave it, that it was not going to. The word `success` was in the payload, and the payload was read as success.

That is not a bug in a reviewer. It is a bug in the protocol between the reviewer and everything downstream of it, and it turns out to have instances.

| Pull request | What it stopped being read as an answer | Diff at merge | Rounds |
|---|---|---:|---:|
| [#1179](https://github.com/nathanjohnpayne/mergepath/pull/1179) | A rate-limit probe mapped to "not yet," which then waited out the full timeout on a state nothing in the run could change | +1,298 / −69 | 15+ |
| [#1274](https://github.com/nathanjohnpayne/mergepath/pull/1274) | A walkthrough refreshed by a push, clearing polling after the same run had already rejected the head's pending status | +206 / −56 | 3 |
| [#1279](https://github.com/nathanjohnpayne/mergepath/pull/1279) | A refusal with no notice attached, which reached the ordinary timeout and never triggered failover | +183 / −36 | 1 |
| [#1282](https://github.com/nathanjohnpayne/mergepath/pull/1282) | A summary edited after a push whose risk block named an older commit | +104 / −1 | 1 |
| [#1283](https://github.com/nathanjohnpayne/mergepath/pull/1283) | An aged summary taking the completed-summary escape before the trusted status was evaluated | +105 / −4 | 1 |
| [#1248](https://github.com/nathanjohnpayne/mergepath/pull/1248) | A file listing truncated at GitHub's 3,000-entry cap, read as a complete inventory | +68 / −1 | 1 |
| [#1263](https://github.com/nathanjohnpayne/mergepath/pull/1263) | A diff over its byte budget, classified as transient reviewer unavailability | +45 / −1 | 2 |
| [#1293](https://github.com/nathanjohnpayne/mergepath/pull/1293) | Unbounded review requests, where exhausted quota is indistinguishable from a reviewer with nothing to say | +573 / −19 | 15 |

Note the sizes. [#1248](https://github.com/nathanjohnpayne/mergepath/pull/1248) is 68 added lines across two files. It closes [#1247](https://github.com/nathanjohnpayne/mergepath/issues/1247), an issue filed **56 seconds** before the pull request opened, whose substance is one sentence: GitHub "caps that listing at 3000 entries, and at the cap the inventory may be truncated." The fix states the consequence plainly: both derivation paths "fail closed to 'external review required', because a possibly-truncated inventory cannot support either verdict." [#1263](https://github.com/nathanjohnpayne/mergepath/pull/1263) is 45 lines.

These are not hard changes. They are changes nobody had a reason to make, because the code consuming those values was written by someone, human or agent, who assumed a value would mean what it says.

## The One That Compounded

[#1263](https://github.com/nathanjohnpayne/mergepath/pull/1263) is the smallest pull request in the set and the one that changed how I think about the class.

It implements [#1186](https://github.com/nathanjohnpayne/mergepath/issues/1186), which reports that the wave audit "has not advanced its watermark since 2026-07-28: over-budget diffs classify as 'reviewer unavailable' and chain forward, making the next range larger." Read the mechanism slowly. A diff larger than the audit's byte budget is classified as reviewer unavailability, which is a transient condition. Transient conditions chain forward. The unaudited range carries into the next run, which makes the next range larger, which makes the next overage certain.

Note what the audit got right and what it got wrong. It had a word for "no answer," and it used it. The word was the wrong kind: *transient*, for a condition that could only get worse. The issue's own summary: "Every wave since has exited 4, failed open, and chained its un-audited range into the next one." By the time anyone measured it, the unaudited range was 127 commits and the diff was 2.8 times the review budget.

The issue was filed on September 4. The watermark had last moved on July 28. **Thirty-eight days**, during which every wave failed open and the reason nothing was being audited got structurally worse on every pass.

A fail-closed defect blocks, and a block gets noticed because somebody cannot merge. Nothing about this one stopped anyone. **Fail-open defects compound. Fail-closed defects merely block.** Blocking is expensive, visible, and gets fixed on Tuesday. The other kind gets fixed when someone happens to read a watermark.

## The Burst

Here is the part I did not notice while it was happening.

Between `2026-09-14T03:20:29Z` and `2026-09-15T12:01:26Z`, **32 hours and 41 minutes**, twenty distinct changes landed on `main` across 21 commits. Here are all 21 subject lines, in committer-date order:

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

Eight of the twenty are the same idea restated against a different surface: a value that meant "I could not answer" being read as an answer. [#1271](https://github.com/nathanjohnpayne/mergepath/pull/1271) states it most plainly: "A failed CodeRabbit marker extractor currently returns successful absence." Two more, #1270 and #1272, are follow-ups on the wave-audit defect. Three, #1280, #1284 and #1287, are about telling a real review request apart from something that looks like one, which is arguably the same idea again. The other seven are unrelated. Two of the eight, #1271 and #1283, carry `878` in their branch names.

At the time this felt like a productive day and a half. Looking at the list as a list, it is not productivity. It is enumeration.

## The Issue That Told Me Not to Do This

[#878](https://github.com/nathanjohnpayne/mergepath/issues/878) is titled "Redesign coderabbit-wait classification around machine markers instead of prose greps." It was opened on **2026-08-03** and is still open. On **2026-09-04**, the day after an audit of the repository's issue backlog, it was rewritten and labeled `size:L`, `type:debt`, `priority:high`, `area:review-sensing`. Everything I quote from it below dates from that rewrite. The August filing made the same argument more briefly: case-by-case hardening of prose classification "walks an unbounded surface."

It diagnoses the family better than I have:

> "They are not independent defects. They are instances of one property: **CodeRabbit's review state is inferred by grepping a rendered vendor surface, and that surface is neither stable nor machine-specified.**"

It specifies the fix in four acceptance criteria. The first asks for "a written contract (extending `specs/coderabbit_review_sensing.md`) enumerating each observable signal, its source, and what it is permitted to prove—separating *the review ran* from *the review found nothing*." That distinction is the entire post. The second asks for "one implementation of that contract, consumed by `scripts/coderabbit-wait.sh` and `scripts/coderabbit-severity-gate.sh` alike. No predicate exists in two copies."

And then it says this:

> "Do not attempt this as a patch series. The original filing's own history—seven review rounds, fifteen valid findings, no convergence—is the argument against that."

That sentence was added on September 4. On September 14 and 15, ten days later, I merged a patch series. Six of its members are recorded on #878's own decision banner as shipped against it, and #878 remains open at `priority:high` for "the remaining shared classification contract."

It also describes a component called out in its own cluster, a parser that "produced a defect in every review round since it was introduced, each one created by the previous round's fix." That was on the issue ten days before the burst. Then I spent a day and a half fixing the family one surface at a time, which is the pattern that sentence describes, and experienced it as momentum.

## What Did Not Land

The honest version of this has to include the one that failed.

[#1130](https://github.com/nathanjohnpayne/mergepath/issues/1130) is the largest instance of the family: the P1 gate "runs on the App installation budget (1,000/hr/repo), so an exhausted GITHUB_TOKEN deadlocks every open PR," and "every open PR in the repository becomes unmergeable regardless of its own merits." That is quota exhaustion presenting as a verdict, at repository scale, and it is the median-aged issue in this set at 26 days.

I took two runs at it. [#1291](https://github.com/nathanjohnpayne/mergepath/pull/1291) merged on September 22 and makes the event side cheaper: it reuses proven pending checks on duplicate publisher events, +308 lines over six review rounds. By its own account it "removes no event deliveries or job executions"; it cuts what each duplicate costs. It spawned three new open issues, [#1301](https://github.com/nathanjohnpayne/mergepath/issues/1301), [#1302](https://github.com/nathanjohnpayne/mergepath/issues/1302) and [#1303](https://github.com/nathanjohnpayne/mergepath/issues/1303), on its way in.

The other half, [#1232](https://github.com/nathanjohnpayne/mergepath/pull/1232), moved the read-only gate steps off the repository token budget. It ran four review rounds, drew two findings, and **closed unmerged** on September 12, fifty-one minutes after it opened. Its own body had scoped it honestly: "Partial: this is the token half, measured and bounded. The event amplification is deliberately not in scope." So the token half never landed, the event half is cheaper but not removed, and #1130 is still open.

I mention the unmerged one because an earlier draft of this post listed it as shipped work, having read its title and not its state. That is the same error the post is about, at one level up: a pull request that did not answer, read as an answer.

## The Controls

Two spectacular failure classes support almost any argument, so here is what tests this one.

**The counter-case is real.** [#962](https://github.com/nathanjohnpayne/mergepath/issues/962) has been open since August 13, and it argues the opposite of everything above:

> "When the auto-merge rate-limit gate blocks, it is usually *right* to block—neither bot has read the diff, so the PR needs a human."

> "A break-glass prompt is exactly the wrong affordance for a routine provider outage: it trains the reflex on a case where nothing is actually wrong with the code."

Fail-closed is not free. It spends human attention on cases where the code is fine, and a reflex trained on false alarms is a reflex that will wave through a real one. Its own summary line is precise about the distinction: "a **correct block** presented too alarmingly. The gate means what it says; only the alarm level is wrong."

And the obvious remedy reopens the original defect. From the same issue: "Branch protection treats a required check as satisfied on `neutral`, so if this check is required, downgrading the conclusion would *release* the merge rather than merely recolouring it." Recoloring the alarm makes it a green light. That is not a reason to leave the alarm loud. It is the reason there is no cheap version of this.

[#826](https://github.com/nathanjohnpayne/mergepath/issues/826), open since July 30 and labeled `status:blocked`, goes further and says the topology itself is wrong: CodeRabbit's allowance "is structurally too small for this fleet, and the review machinery currently spends it on the least valuable heads while making it load-bearing for merge." Its sharpest line is that "the budget is exhausted by the system reviewing its own churn." If that is right, several of my thirty-two hours were spent hardening the interpretation of a signal that should not be load-bearing at all.

**The contrast set is thinner than I wanted.** I pulled substantial merged work from the same window that is not about reviewer absence. [#1250](https://github.com/nathanjohnpayne/mergepath/pull/1250) is +1,432 lines to let an operator force a policy workflow to re-evaluate one open pull request "so that its two required contexts report on the current head." [#1264](https://github.com/nathanjohnpayne/mergepath/pull/1264) is +344 lines because "an automated Phase 4b approval can immediately create an unaccounted review-body finding." [#1106](https://github.com/nathanjohnpayne/mergepath/pull/1106) is +640 lines because "a CodeQL finding could ride through repeated 'fully accounted' review rounds unread."

Read those last two again. A finding riding through unread is the same shape as a reviewer that never spoke. My contrast set is partly contaminated by the thing it was supposed to contrast with, and the honest reading of the window is not "defensive work versus capability work." It is that correctness repair on review-sensing and merge-gating logic runs through the whole window, and the boundary between the buckets is not clean enough to put a number on.

**The capability counterpoint shows the fix, done by hand.** [#1169](https://github.com/nathanjohnpayne/mergepath/pull/1169) is the biggest thing merged all month, +15,436 / −706 across 50 files, adding "the fail-closed authorization boundary for a singleton native GitHub merge queue." Real capability, not defense. Its issue [#1058](https://github.com/nathanjohnpayne/mergepath/issues/1058) is still open and `status:blocked`, because "this repo's merge safety is **head-SHA-pinned by construction**, and a merge queue evaluates required checks on a different SHA."

Buried in that issue is a field I cannot stop looking at. It records `required_status_checks.strict` as "**unknown**—`GET /branches/main/protection` returns `403 Resource not accessible by integration`." Whoever wrote that table could not read the gate's configuration, and did not guess. They wrote `unknown`, with the reason next to it. That is the representation the rest of this post says is missing, and here it is, written by hand in a Markdown table. The pattern is not hard. It is just not in the code.

## Why It Does Not Converge

Twelve of the ninety merged pull requests name this failure mode explicitly in their titles. Thirty-four are fail-closed in shape. I did not read ninety bodies, so I will not give you a number between those, and the more useful figure is on the other side of the ledger anyway.

**At least eleven of the 164 open issues in the repository, matching on titles alone, are about a rate limit, a quota, or a timeout being mistaken for a verdict.** The oldest is [#722](https://github.com/nathanjohnpayne/mergepath/issues/722), at 78 days, whose body describes a poll that "keeps waiting for the full `review_timeout_seconds` window (840s default) and then exits `4` (FALLBACK_REQUIRED)—indistinguishable from a genuinely slow/no-op review," and notes that the detection that would fix it "lives **only** in the retrospective audit script, never in the live gate/trigger path." The median is 26 days. The newest, [#1305](https://github.com/nathanjohnpayne/mergepath/issues/1305), was filed on September 23, carried no labels that day, and is titled "Phase 4b barrier treats a cap-exhausted Codex arm as a self-clearing wait."

Truncation is the exception that proves the shape. No open issue title mentions truncation. The one instance I know of, #1247, got a 68-line pull request 56 seconds after it was filed and was closed 21 minutes after it was filed. One known instance, one small fix, done.

The rate-limit family has at least eleven open instances because a rate limit arrives in many grammars: a status string, a comment, a missing comment, an expired notice, an aged summary, a prose paragraph the vendor writes differently this month, a silently empty array. Two of the eleven, #961 and #962, were filed **six seconds apart**, both split out of one earlier issue. That is not two discoveries. That is one problem being decomposed into tickets, which is what enumeration looks like from the inside.

And that is the finding. **A defect you can only address by listing its instances is a missing abstraction.** #878 says so in plainer language than I have managed, and has said so, in one form or another, since August 3.

## What This Is Actually About

I cannot adjudicate an ABA race between two workflow invocations. I have said before that this is fine, that it is what the reviewers are for. It is still fine.

But there is a decision underneath all of this that is unambiguously mine, and I have been making it by default:

**Is reviewer availability a stated product requirement with an owner and a contract, or is it an implementation detail discovered one incident at a time?**

I have been treating it as the second, and I can show you the cost. A month in which somewhere between 12 and 34 of 90 merged pull requests, by title alone, were retrofitted skepticism about values the system already trusted. A thirty-two-hour stretch that felt like progress and was a list. A design document specifying the general fix, open for fifty-one days, with an instruction not to do it in pieces that I did not follow. An audit that failed open on every wave for thirty-eight days behind a transient-sounding classification. One attempt at half of the largest instance, closed unmerged after fifty-one minutes, with the instance itself still open. At least eleven more waiting, some of them small pull requests nobody has had a reason to write yet, and two of them, #826 and #1130, not small at all.

The general version costs a design pass and a hard conversation about what a signal is permitted to prove: one representation of "no answer," one rule for what callers may do with it, one implementation consumed by both the advisory path and the required gate. It is `size:L` and it is not fun.

The other version costs 45 lines at a time, forever, and each installment feels like a good day. You find out which one you picked five weeks later, when somebody reads a watermark.
