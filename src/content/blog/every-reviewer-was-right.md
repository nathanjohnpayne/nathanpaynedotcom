---
title: "Every Reviewer Was Right, and the Pull Request Was Still Wrong"
seoTitle: "Every Reviewer Was Right"
shortTitle: "Every Reviewer Was Right"
description: "Two pull requests on the same automated review pipeline drew 72 Codex findings, none of them wrong, and both closed unmerged. One grew 61× from a 35-line first commit against an issue independently estimated small. The other opened at 275 lines for a bug whose issue already listed a one-word fix. Three healthy pull requests with as many review rounds showed what separated them: not volume, but whether anyone asked if the machinery containing the next finding belonged in the product at all. I was asked five times how to proceed. That question was never on the menu."
seoDescription: "72 correct review findings, two pull requests closed unmerged, and three healthy controls with as many rounds. Review volume was not the signal. Who owned the requirement was."
category: "Agent Systems"
author: "Nathan Payne"
date: 2026-09-06
tags: ["AI", "Product", "Decision Rights", "Code Review", "Systems"]
image: "/og/blog/every-reviewer-was-right.png"
keyTakeaways:
  - "A review loop hardens whatever it is shown, against the code in front of it and never against the issue behind it. Both failed pull requests were locally correct at every step, and the three healthy controls had just as many rounds. Round count and repeat findings did not separate them. Whether anyone deleted a mechanism did: every merged control removed one mid-review, after Codex rounds 7, 10 and 12. The two closed pull requests never did, or did it at the wrong layer."
  - "The failure was instrumentation at the decision boundary, not absence and not judgment. I was in the loop all day: five prompts answered, one more round requested by hand, a merge ordered. Every prompt quoted rounds and findings. None quoted a line count, none listed the guarantees the implementation had accumulated beyond the issue, and none offered removing the mechanism, returning to the original requirement, or recutting. Progress was reported in units of review consumption when the decision was about which guarantees to keep: 35 lines had become 2,136 for a requirement that later shipped in 377."
  - "A frozen contract is necessary and not sufficient. After the owner froze one pull request to five guarantees and the external reviewer approved, the next round found two real false-green defects inside the frozen contract. Freezing changed the basis for accepting two findings and rejecting one. It did not make review go quiet. Only removing the requirement did, and that requirement had been self-ratified in a code comment before any reviewer saw it."
  - "A product manager who cannot adjudicate a P1 about an ABA race can still own the decision that matters: does the mechanism containing this finding exist because the original issue requires it, and what does it cost if the residual is left unfixed? That needs the agent to carry named guarantees and their lineage, not a score. Turning that list into a number would repeat the last measurement error one layer up."
pullquotes:
  - text: "There is a real bug; should we fix it? That question is rigged. Of course I say yes. The question I needed was whether the machinery containing the bug still belonged in the product I had asked for."
    label: "The wrong question"
    accent: red
  - text: "Nineteen rounds and forty-six findings describe what the review consumed. Thirty-five lines becoming 2,136 for a requirement that shipped in 377 describes what needed a decision."
    label: "The wrong units"
    accent: yellow
  - text: "Trust reviewers to find defects. Do not ask them to decide which guarantees are worth defending. And do not ask a product manager to make that decision unless the system shows them a guarantee being added."
    label: "The division of labour"
    accent: blue
sidebar:
  - type: text
    content: |
      How things are counted. A review round is one review submission by the Codex GitHub App, read from the pull request's reviews endpoint. A finding is a top-level inline comment from Codex or CodeRabbit; replies are excluded so a finding counts once however long its thread ran. Growth is the additions in the pull request's diff at the moment it was opened, against the additions at close or merge, each measured the way GitHub reports a pull request's diff, against its merge base with main at that moment, so the two snapshots of one pull request do not share a base. The session's own prompts and replies counted one clean pass that Codex posted as a comment rather than a review, so the round counts quoted in the prompt figure run one higher than this rule gives; the round numbers in the text follow the rule.

      The finding classification is a single-rater hand pass over 195 findings on five pull requests, using the four dispositions the repository's own rule 2 names: a defect in the original ask, a defect in machinery that did not exist when the pull request opened and was added to satisfy an earlier finding, a stronger guarantee than the issue required, and documentation or manifest drift. Counts are good to about plus or minus two and are labelled as approximate where they appear.
    caption: "Counting rules for every figure in this post."
  - type: text
    content: |
      What was checked against what. Every pull request figure, timestamp, commit and quoted comment comes from the GitHub API, and the comment identifiers link to the source. The five prompts, my answers to them, the two lines I typed on August 27, and the messages I typed on September 6 come from the authoring session's own transcript, read directly rather than from a summary of it. An earlier summary of that transcript had claimed I typed nothing for twenty hours; the log says otherwise, and the text below follows the log. The fleet comparison covers every pull request in the repository with eight or more review rounds. Nothing here is quoted from a pull request body without saying so, because those were written by the agents that opened them, under my account.
    caption: "Provenance, so a reader can re-check it."
---

I am a product manager, not an engineer. When an automated reviewer tells me a change has a P1 correctness defect, I am usually not in a position to prove it wrong, and I do not try to. That is what the reviewers are for. So "there is a real bug; should we fix it?" is not much of a decision. Of course I say yes.

Over eleven days in late August and early September, two pull requests in [Mergepath](/blog/agent-approval-workflow-genesis-of-mergepath/), the review-policy repository that governs how my coding agents open, review and merge work, faced that question over and over. Between them they drew 72 findings from the Codex GitHub App across 31 review rounds. I have now read every one, and I cannot find a finding that was wrong. A correct finding is not a justified demand, though: whether a defect had to be fixed before merge was a product question, never the reviewers' to answer. Both pull requests closed without merging. One was replaced by a change to a single word.

The tempting article is that automated review caused scope creep. I started writing it, ran the same analysis on three pull requests that had just as many rounds and merged fine, and it fell over. This is the one that survived: the reviewers were doing their job the whole time, and nobody was doing the other job, which was mine. I was there all day, answering every prompt. A neutral menu still constrains decision rights when every option on it accepts the framing.

## Two Loops, Same Pipeline, Same Fortnight

The first pull request, [#1112](https://github.com/nathanjohnpayne/mergepath/pull/1112), was a provenance change. It implemented [#1056](https://github.com/nathanjohnpayne/mergepath/issues/1056): when Mergepath bootstraps a new consumer repository, record which revision of the template it was built from, so a later drift measurement has a baseline. The issue proposed the whole implementation in one line, the commit hash in the initial commit's subject and a trailer, and the first commit did that in 32 lines.

The second, [#1189](https://github.com/nathanjohnpayne/mergepath/pull/1189), was a diagnostic-clearing change. It implemented [#1188](https://github.com/nathanjohnpayne/mergepath/issues/1188): a diagnostic check-run that the merge workflow publishes on an infrastructure error could only be published as a failure. Nothing published a success for the same name, so one transient error left a pull request's head red permanently, and a local guard then demanded a break-glass merge for a pull request with every required check green.

| | [#1112](https://github.com/nathanjohnpayne/mergepath/pull/1112) | [#1189](https://github.com/nathanjohnpayne/mergepath/pull/1189) |
|---|---:|---:|
| First commit | +35 / −5 | +275 / −7 |
| At close | +2,136 / −17 | +1,179 / −19 |
| Commits | 39 | 21 |
| Codex review rounds | 19 | 12 |
| Codex findings, of which P1 | 46, 17 | 26, 3 |
| Active review time | 21 hours, then idle 9 days | 22 hours |
| Replacement | [#1197](https://github.com/nathanjohnpayne/mergepath/pull/1197), +377, merged in 68 minutes | [#1196](https://github.com/nathanjohnpayne/mergepath/pull/1196), +54, merged in 20 minutes |

## What Happened to the Provenance Change, [#1112](https://github.com/nathanjohnpayne/mergepath/pull/1112)

The pivot is round 4. The first three rounds found genuine defects in the original ask, a wrong or unresolvable hash in three different ways; all were fixed, and the recut kept two of the resulting checks. Round 4 raised something different: if the source checkout had uncommitted changes, the mirror would copy those bytes while recording the clean commit hash, so, the finding said, [require the source to be clean before accepting its hash](https://github.com/nathanjohnpayne/mergepath/pull/1112#discussion_r3868677507). That is the moment the implementation acquired a guarantee the issue had not asked for: "record which revision this was based on" became "prove the recorded hash characterizes the bytes that were mirrored."

The break is round 8, and the reviewer did not cause it. Codex found that the resume path, which reruns a partially completed bootstrap, could leave stale files in the target while still recording a clean source hash, and asked the author to [validate the resumed target before attributing it](https://github.com/nathanjohnpayne/mergepath/pull/1112#discussion_r3869470508). The contract-preserving fix was one line: do not attribute on resume. The authoring session instead [added `--delete` to the rsync invocation](https://github.com/nathanjohnpayne/mergepath/pull/1112#discussion_r3872275126) and built a residue-reconciliation engine around it. A provenance feature now deleted things.

Everything after that is the reviewers being right about the engine. In round 12, when the target directory happened to be named after an excluded path, [the engine deleted the entire target](https://github.com/nathanjohnpayne/mergepath/pull/1112#discussion_r3874150864), repository and operator work included. After a round-15 trailing-slash fix, CodeRabbit noticed that a target of `/` now normalized to an empty string, so rsync [ran with `--delete` against the filesystem root](https://github.com/nathanjohnpayne/mergepath/pull/1112#discussion_r3875527997). Ten data-loss findings, nine of them P1s, every one real, every one in code that did not exist when the pull request opened, and every one fixed with a regression test.

By the end, the bootstrap script had grown from 1,498 lines to 2,102 and its test file from 2,088 to 3,607; the diff was 61 times the size of the first commit. The recut, [#1197](https://github.com/nathanjohnpayne/mergepath/pull/1197), kept the hash, the trailer, the origin and reachability checks and a plain clean-tree gate, and dropped the proof, the configuration pinning and the engine.

## The Rigged Question

Here is what I saw of the provenance change as it happened, from the session's transcript, read directly.

After the task list at 01:36 UTC on August 27, rounds 1 through 10 ran with no input from me. From the afternoon on, the session asked me how to proceed five times, each time with three options; here are all five, with the option I chose first in each.

```mermaid title="Five prompts, one missing option" description="The five escalation prompts the authoring session put to me on August 27, in order, each with its three options and the counts of rounds and findings it quoted. In every prompt I chose the first option: fix the remaining findings and merge, or run one more review round. No prompt offered removing the mechanism, weakening the guarantee, returning to the original requirement, or closing and recutting."
graph TD
    P1["15:45 · 11 rounds<br/>✔ fix 3 findings, merge<br/>merge as-is, follow-up<br/>leave open, stop here"]
    P2["17:48 · 13 rounds, 15+<br/>✔ fix 2 P2s, merge<br/>(marked Recommended)<br/>stop, merge as-is<br/>leave open, I'll review"]
    P3["20:16 · 16 rounds, ~25<br/>✔ fix last P2, merge<br/>stop loop, merge as-is<br/>leave open, I'll review"]
    P4["21:10 · 17 rounds, ~28<br/>✔ one more Codex round<br/>stop, merge as-is<br/>leave open, I'll review"]
    P5["21:56 · 18 rounds, ~30<br/>✔ one more Codex round<br/>stop, merge as-is<br/>leave open, I'll review"]
    M["never on the menu<br/>remove the mechanism<br/>weaken the guarantee<br/>return to the original ask<br/>close and recut"]
    P1 --> P2 --> P3 --> P4 --> P5
    P5 -.-> M
    style P1 fill:#d4a84b,stroke:#a07830,color:#333
    style P2 fill:#d4a84b,stroke:#a07830,color:#333
    style P3 fill:#d4a84b,stroke:#a07830,color:#333
    style P4 fill:#d4a84b,stroke:#a07830,color:#333
    style P5 fill:#d4a84b,stroke:#a07830,color:#333
    style M fill:#993d3d,stroke:#7a3030,color:#fff
```

I clicked the first option all five times. Only the 17:48 prompt marked it Recommended, with the gloss "matches what you asked for last time"; at 20:16 the gloss was "same instruction as before." After the third click, at 20:23, I typed the only free-form instruction of the afternoon: "Then do one more @codex round." At 22:28 I pasted a link to one more finding, and a minute later I typed "fix that and admin merge." The merge never happened, and the pull request sat untouched for nine days.

The prompts were not hiding trouble. Every one said the loop was not converging; the 17:48 prompt said the pull request had already introduced two regressions of its own, and the 20:16 prompt called the next finding "the same class as several already-fixed spots." What none of them did was relate any of that to the issue. Not one quoted a line count; the size of the diff does not appear in the record until September 6, after I had read it myself. What no prompt listed was the guarantees the implementation had accumulated beyond the single one [#1056](https://github.com/nathanjohnpayne/mergepath/issues/1056) asked for. Not one said that the current P1 sat in an engine added in round 8 to satisfy a round-8 finding. And not one offered "remove the mechanism," "weaken the guarantee," "return to the original requirement," or "close and recut." Four of the five menus were neutral, and I clicked the same slot anyway. A neutral menu still constrains decision rights when every option on it accepts the framing.

The session's own review replies show where that framing came from: seventeen of them quote a round or finding count, and its three non-convergence deferrals, correct each time, called the findings "new, distinct, genuinely valid edge cases" without once saying that the class existed because of one decision made in round 8, which could be reversed.

For a product manager who trusts the reviewer and will not knowingly ship a P1, "fix it" against "ship with the defect" or "go read the code yourself" is not a real choice. "Remove the thing creating the P1" would have been, and I could have answered it in a sentence.

Everything else I typed to the session about [#1112](https://github.com/nathanjohnpayne/mergepath/pull/1112) came on September 6: an instruction to resolve merge conflicts, then, after I read the diff, the decision that closed it, the contract for the recut, and two notes on it. In the decision I wrote that an issue labelled small should not need changes capable of deleting repositories and operator work, and that once it did, preserving the branch because a lot of correctness work had gone into it was the wrong optimization.

The session closed [#1112](https://github.com/nathanjohnpayne/mergepath/pull/1112) and cut [#1197](https://github.com/nathanjohnpayne/mergepath/pull/1197) against a three-check contract I gave it. Under that contract the next round still drew three findings: two real violations of the stated clean-tree check, fixed, and one about an adversarial caller's environment, rebutted as outside the contract. That is what a frozen contract buys: not fewer findings, a basis for saying no to one.

## What Happened to the Diagnostic-Clearing Change, [#1189](https://github.com/nathanjohnpayne/mergepath/pull/1189)

[#1189](https://github.com/nathanjohnpayne/mergepath/pull/1189) is a different shape, and I got it wrong the first time I described it: it did not grow out of control, and its problem, a guarantee rather than a line count, was in the first commit.

[#1188](https://github.com/nathanjohnpayne/mergepath/issues/1188), the issue, was filed by an agent at 03:59 UTC on September 5 and listed three shapes for a fix. The third was to publish the diagnostic as `neutral` instead of `failure`, visible but non-blocking, which the issue called "the cheapest option and closest to what the record actually means." Sixty-four minutes later the pull request opened with option one, a clearing path that would publish a success to supersede the failure, and the first commit's header rejected the cheap option explicitly: "The failure conclusion stays `failure` rather than softening to `neutral`. 'We could not verify this is safe to merge' should block; the defect was the missing exit, not the severity."

Nobody was asked to agree with that sentence. It was a product decision, made in a code comment, and it was wrong, because the diagnostic is not a required status check on the hub or on any of the three consumer repositories checked. It blocked nothing except our own guard script. Twelve rounds of review then hardened the implementation of a requirement that did not need to exist.

And hardened it correctly. The first round found two real false greens: the clearing path created a competing success run instead of updating the failure, and a clear was not pinned to the head that produced the verdict. Then the ordering problems began. The authoring session deferred two of them to follow-up issues, with cost arguments. The external reviewer, a Codex pass under a separate identity that holds a merge veto in this repository, [overruled both](https://github.com/nathanjohnpayne/mergepath/pull/1189#pullrequestreview-5120227951): "Both affect the core merge-gating guarantee and should be resolved before merge." The session complied, and its [note on complying](https://github.com/nathanjohnpayne/mergepath/pull/1189#issuecomment-5553441393) is the most honest sentence in the record: "The review overruled my deferral and it was right to."

It was not: the diagnoses were right, and the demand was a product judgment. The watermark the review had demanded re-opened, in the opposite direction, the race over which conclusion buries which, and was split back out 95 minutes later. In all, five mechanisms were built to establish which of two workflow invocations happened first, over an API with no atomic primitive for it, and each closed one interleaving while opening another. Findings per round never reached zero and spiked to six in round 6, and roughly half the later ones were interactions between rules added the round before.

At 02:55 UTC on September 6, the pull request's contract was [frozen to five guarantees](https://github.com/nathanjohnpayne/mergepath/pull/1189#issuecomment-5556479015), with a false red left by concurrent invocations declared an accepted residual, and the external reviewer approved with zero findings. Then Codex reviewed against the frozen contract and found two more real P1s inside it: a runner whose clock ran slightly ahead of GitHub's could [classify an unobserved failure as older and clear it](https://github.com/nathanjohnpayne/mergepath/pull/1189#discussion_r3942818732), and a base branch that advanced under an unchanged head could [authorize a clear for a merge context that was never evaluated](https://github.com/nathanjohnpayne/mergepath/pull/1189#discussion_r3942818738). Both false greens. Both inside the five guarantees.

Seven minutes after that round, [#1196](https://github.com/nathanjohnpayne/mergepath/pull/1196) opened. One word: `failure` became `neutral`. With no red state to leave, nothing has to clear it, so there is no clearing path to get right. It merged in twenty minutes.

## Four Articles the Controls Killed

Two spectacular failures support almost any explanation, so I ran the same analysis on healthy pull requests. Of the 507 closed pull requests in the repository's history, 15 closed unmerged; of the 21 with eight or more Codex rounds, 19 merged, and only these two closed. Each of the following explanations survived every inspection of the two failures and failed against a control. That is a narrower result than it sounds: none separates the two closed pull requests from the merged ones, which undermines the simple diagnostic without naming the cause of either outcome.

**Too many review rounds cause divergence.** [#1084](https://github.com/nathanjohnpayne/mergepath/pull/1084) ran 19 rounds, drew 66 findings, and merged. [#925](https://github.com/nathanjohnpayne/mergepath/pull/925) ran 18 and merged at 3,369 lines. A long review that merged shows only that long reviews can merge, not that the loop was healthy or worth its cost.

**Findings in machinery added for earlier findings indicate divergence.** [#1139](https://github.com/nathanjohnpayne/mergepath/pull/1139) is an 85-line routing change whose author volunteered a bootstrap guard on top of it. Fifteen of its 21 findings were about the guard, seven of them successive holes in one flag extractor: "the fifth instance of one root cause," the author wrote, and then "the sixth way this extractor has validated a subset." It merged. Its share of such findings, a third, is higher than [#1189](https://github.com/nathanjohnpayne/mergepath/pull/1189)'s.

**Freeze the contract and review goes quiet.** Both frozen contracts drew further valid findings, the two P1s inside [#1189](https://github.com/nathanjohnpayne/mergepath/pull/1189)'s five guarantees and the two clean-tree violations inside [#1197](https://github.com/nathanjohnpayne/mergepath/pull/1197)'s three checks. Freezing did not quiet review; it changed the basis for accepting or rejecting a finding.

**Large implementation growth explains both failures.** [#1112](https://github.com/nathanjohnpayne/mergepath/pull/1112) grew 61× from open to close, and the largest growth on any of the 19 merged high-round pull requests is 11×. That number is real and isolates [#1112](https://github.com/nathanjohnpayne/mergepath/pull/1112) alone; [#1189](https://github.com/nathanjohnpayne/mergepath/pull/1189) grew 4.3×, which is unremarkable. Its problem was a guarantee accepted at open, 275 lines for an issue whose cheapest listed option was one word, and no open-to-close measure can see a gap between the issue and the opening commit.

## What Actually Separated Them

Two differences survive the comparison.

| PR | Codex Rounds | Findings, Both Reviewers | Stronger Guarantees Accepted into Scope | A Mechanism Deleted Mid-Review | Outcome |
|---|---:|---:|---|---|---|
| [#1176](https://github.com/nathanjohnpayne/mergepath/pull/1176) | 11 | 30 | 1 | yes, after round 7 | merged |
| [#1139](https://github.com/nathanjohnpayne/mergepath/pull/1139) | 11 | 21 | 1 | yes, after round 10 | merged at +85, from a peak of +286 |
| [#1084](https://github.com/nathanjohnpayne/mergepath/pull/1084) | 19 | 66 | 3, all input edge cases | partly, after round 12 | merged |
| [#1112](https://github.com/nathanjohnpayne/mergepath/pull/1112) | 19 | 51 | about 10 | never | closed |
| [#1189](https://github.com/nathanjohnpayne/mergepath/pull/1189) | 12 | 27 | 5, all ordering mechanisms, 3 later removed | twice, at the wrong layer | closed |

The middle column is approximate and single-rater; the pattern is not subtle. Every merged control accepted one to three stronger guarantees and fixed the rest as defects in a contract that was broad at open, and every one contains the same move, made by the authoring agent without a human asking: it deleted the thing the findings were about. [#1176](https://github.com/nathanjohnpayne/mergepath/pull/1176), answering round 7: "removing the thing that produced this finding rather than patching it a fourth time." [#1139](https://github.com/nathanjohnpayne/mergepath/pull/1139), answering round 10, in a reply that counted every reviewer's pass rather than Codex's alone: "I am splitting the guard out rather than taking a fourteenth round on it." [#1084](https://github.com/nathanjohnpayne/mergepath/pull/1084), answering round 12: "Both fixed, by deleting the mechanism that caused them," though its hand-rolled field reader stayed and drew findings until the merge, which is why its row says partly.

That move never happened on the provenance change. It happened twice on the diagnostic-clearing change and did not help, because the mechanisms being deleted sat on top of a clearing path that was itself the unnecessary requirement. The agent questioned its ordering tokens and never its clearing arm. An agent is least able to question the premise it opened with, and that is the one place in this record where the human was not optional.

The cleanest evidence is the natural experiment I did not design.

```mermaid title="Same issue, two contracts" description="#1112 and #1197 implement the same issue, #1056, from the same authoring system with the same reviewers, ten days apart. #1112 opened at 35 added lines, closed at 2,136 after 19 Codex rounds and 46 Codex findings, 51 counting CodeRabbit, and was closed unmerged. #1197 was 377 lines, drew 2 Codex findings and 1 CodeRabbit finding in 2 Codex rounds, and merged 68 minutes after opening."
graph TD
    S["same issue, #1056<br/>same authoring system<br/>same reviewers<br/>ten days apart"]
    S --> A1["#1112, August 27<br/>first commit +35"]
    A1 --> A2["19 Codex rounds<br/>46 Codex findings<br/>no mechanism removed"]
    A2 --> A3["closed unmerged<br/>at +2,136"]
    S --> B1["#1197, September 6<br/>owner-set contract<br/>opened at +377"]
    B1 --> B2["2 Codex rounds<br/>2 Codex findings, 1 CodeRabbit<br/>two fixed, one rebutted"]
    B2 --> B3["merged<br/>68 minutes after opening"]
    style S fill:#d4a84b,stroke:#a07830,color:#333
    style A1 fill:#e8b4b4,stroke:#993d3d,color:#333
    style A2 fill:#e8b4b4,stroke:#993d3d,color:#333
    style A3 fill:#993d3d,stroke:#7a3030,color:#fff
    style B1 fill:#b8ddb8,stroke:#4a8a4d,color:#333
    style B2 fill:#b8ddb8,stroke:#4a8a4d,color:#333
    style B3 fill:#7bc67e,stroke:#4a8a4d,color:#333
```

The reviewers did not change. The contract did, and someone was there to hold it. The recut also had ten days of hindsight, so the figure shows what a contract plus hindsight bought, not the contract alone. And here is where [#1112](https://github.com/nathanjohnpayne/mergepath/pull/1112)'s guarantees came from, by round.

```mermaid title="Lineage of the #1112 findings" description="The original issue asked to record a source revision. Round 4 turned that into proving the recorded revision characterizes the mirrored bytes, which required a clean-tree check. Round 8 asked the resume path to honour that proof, and the author's chosen mechanism was rsync with delete plus a residue-reconciliation engine. Rounds 11 through 17 then found ten data-loss defects in that engine: the target root deleted, symlink referents followed, the filesystem root, linked-worktree .git files and glob escapes. The recut kept the hash, the trailer, the origin check and a plain clean-tree gate, and dropped the proof and the engine."
graph TD
    A["#1056 asks:<br/>record the source revision"] --> B["Rounds 1 to 3:<br/>wrong or unresolvable hash<br/>defects in the ask, fixed and kept"]
    A --> C["Round 4:<br/>'require the source to be clean'<br/>the ask becomes a proof"]
    C --> D["Round 8:<br/>'validate the resumed target'"]
    D --> E["Author's mechanism:<br/>rsync --delete plus a<br/>residue-reconciliation engine"]
    E --> F["Rounds 11 to 17:<br/>ten data-loss findings in the engine<br/>target root, symlinks, filesystem root,<br/>.git files, glob escapes"]
    E --> G["#1197 recut:<br/>keep the hash, the trailer,<br/>origin and reachability,<br/>a plain clean-tree gate;<br/>drop the proof and the engine"]
    style A fill:#d4a84b,stroke:#a07830,color:#333
    style B fill:#b8ddb8,stroke:#4a8a4d,color:#333
    style C fill:#e8b4b4,stroke:#993d3d,color:#333
    style D fill:#e8b4b4,stroke:#993d3d,color:#333
    style E fill:#993d3d,stroke:#7a3030,color:#fff
    style F fill:#993d3d,stroke:#7a3030,color:#fff
    style G fill:#7bc67e,stroke:#4a8a4d,color:#333
```

## The Question I Can Actually Own

The controls show that long, repetitive, technically frustrating loops can be healthy. What the healthy ones had was somebody periodically asking whether the thing containing the error should exist.

That is a question I can own without reading the implementation. Grant the reviewer its premise: yes, that is a real bug. Then ask two things the reviewer is not answering:

Does the mechanism containing this finding exist because the original issue requires it?

And what happens if we leave the residual unfixed?

The second question gives a third answer beside fix and defer: accept it. [#1084](https://github.com/nathanjohnpayne/mergepath/pull/1084) merged while its hand-rolled parser was still drawing findings, because the pull request had bounded the cost of a wrong answer to a skipped review wait, not a skipped review. [#1196](https://github.com/nathanjohnpayne/mergepath/pull/1196) shipped on an assumption about how GitHub treats `neutral` that could not be verified in advance, with the failure mode stated as today's behaviour and the remedy as reverting one word. Neither decision needed a line of code read. Both needed the failure cost stated in product units.

So my decision rule is now simple, and deliberately not automatable. When a reviewer finds a real error, fix it, unless the fix is in machinery added beyond the original requirement. Then stop and reconsider the machinery before fixing the error. "Beyond" does not mean unmentioned: an issue rarely spells out every property its outcome needs, so the test is whether a guarantee is necessary to deliver what was asked for or is an additional commitment; not attributing on resume kept [#1056](https://github.com/nathanjohnpayne/mergepath/issues/1056)'s promise honest without a deletion engine. The reference is the issue's problem statement, not the pull request's chosen design, or [#1189](https://github.com/nathanjohnpayne/mergepath/pull/1189)'s clearing arm passes as original and the rule catches nothing.

For someone in my position to use that rule, the agent has to carry what it now throws away: what was originally asked; which guarantees the implementation now provides beyond that; which mechanism each guarantee required; which finding caused each mechanism; and whether the latest finding concerns required behaviour or added machinery. That lineage is what makes the decision possible without the decider reading the code. [#1112](https://github.com/nathanjohnpayne/mergepath/pull/1112)'s "new, distinct, genuinely valid" framing destroyed that information; the healthy controls reconstructed it in prose, by counting instances of one root cause.

And the guarantees have to be a named list, never a score. A number invites a threshold, and a threshold is satisfiable without anyone thinking; [#1112](https://github.com/nathanjohnpayne/mergepath/pull/1112) ran past a ten-round escalation policy that was in force throughout. The escalation I can imagine deciding from, filled in for [#1112](https://github.com/nathanjohnpayne/mergepath/pull/1112) at round 12, looks like this:

```mermaid title="The escalation a product manager can decide from" description="A six-step escalation record for #1112 at round 12: the issue asked to record the source revision at bootstrap; the implementation had added four guarantees, canonical origin, reachable HEAD, clean tree and configuration-independent cleanliness; the current finding sat in the residue-reconciliation engine; the engine was added in round 8 to satisfy a round-8 finding, and the diff had grown from 35 lines to 1,315; if the engine were removed, a resumed bootstrap may retain stale files, the fallback is to omit attribution on resume, the cost is provenance unavailable for that bootstrap, and the safety property is that no false hash is written; the decision offered is fix, reduce, remove, recut, or accept."
graph TD
    I["ISSUE ASKS<br/>record the source revision"] --> G["ADDED GUARANTEES<br/>canonical origin<br/>reachable HEAD<br/>clean tree<br/>config-independent<br/>cleanliness"]
    G --> F["CURRENT FINDING<br/>a P1 in the residue-<br/>reconciliation engine"]
    F --> L["LINEAGE<br/>engine added in round 8<br/>for a round-8 finding<br/>diff +1,315, opened at +35"]
    L --> R["IF ENGINE REMOVED<br/>resume may retain stale files<br/>fallback: omit attribution<br/>cost: provenance unavailable<br/>safety: no false hash written"]
    R --> D["DECISION<br/>Fix · Reduce · Remove<br/>Recut · Accept"]
    style I fill:#b8ddb8,stroke:#4a8a4d,color:#333
    style G fill:#d4a84b,stroke:#a07830,color:#333
    style F fill:#e8b4b4,stroke:#993d3d,color:#333
    style L fill:#e8b4b4,stroke:#993d3d,color:#333
    style R fill:#d4a84b,stroke:#a07830,color:#333
    style D fill:#7bc67e,stroke:#4a8a4d,color:#333
```

The facts in that figure are ones the session had and did not report; the removal cost is my reconstruction, the reasoning an escalation should carry. I do not need to understand `rsync --delete` to notice that something is off in it. And a system that marks "fix" as recommended because the finding is valid has answered the engineering question and skipped the product one.

## Where the Decision Rights Go

The operating rules that came out of this put the decision rights at the points they govern, not in a second rulebook beside the review policy: the owner ratifies the proposed contract against the issue when the pull request opens, with the named guarantees and the residual cost visible, which is where [#1189](https://github.com/nathanjohnpayne/mergepath/pull/1189) should have stopped; the agent reports lineage and every guarantee added since open at escalation, with a menu that includes reduce, remove, recut and accept; reviewers keep finding defects.

What matters more than the document's rules is that three claims caught in this work were mine, or repeated by me. The size-S label I had cited as the issue's original estimate was, the label history showed, applied by a backlog audit nine days after the pull request opened. The document's first draft said [#1189](https://github.com/nathanjohnpayne/mergepath/pull/1189) ran ten rounds and seventeen commits; the API says twelve and twenty-one, and Codex caught it in its first round. And the first published version of this post numbered the provenance change's later rounds the way the session's prompts counted them, one higher than the rule in the sidebar, until a reader's review caught it. Three unmeasured claims, in material whose entire thesis is to measure before accepting an obligation, each caught by the thing the material was about. That is the thesis demonstrated, not evidence against it: measurement owned the facts, and could not decide, on any of the three, whether the corrected fact justified another mechanism, a weaker guarantee, a follow-up, or abandoning the approach.

## What This Is Evidence For

[The last post](/blog/perfect-score-wrong-axis/) on this site about review measured closure when it cared about coverage; this one measured consumption when it cared about guarantees, the same instrumentation error one layer up.

When AI writes and AI reviews, keeping a human in the loop is not enough. The human was in this loop all day, answered every prompt, and ordered a merge. What the system did, five times, was ask for that authorization without supplying what a scope decision needs: the guarantees added, where each came from, what removing one would cost, and the option to remove it. The human needs decision rights at the points where a guarantee is added, and instrumentation that states exactly that, in product units. That is a testable claim: the instruments are being built now, and if they are present and the same pathology recurs, this post is wrong. I would rather have written something that can be wrong.

Trust reviewers to find defects. Do not ask them to decide which guarantees are worth defending. And do not ask a product manager to make that decision unless the system shows them that a guarantee is being added.
