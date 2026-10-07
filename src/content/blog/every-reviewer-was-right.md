---
title: "Every Reviewer Was Right, and the Pull Request Was Still Wrong"
seoTitle: "Every Reviewer Was Right"
shortTitle: "Every Reviewer Was Right"
description: "Two pull requests drew 72 Codex findings. I couldn't fault one, and both closed unmerged. One grew from 35 lines to 2,136 for a requirement that later shipped in 377. I was asked five times how to proceed, never whether the machinery under review still belonged in the product."
seoDescription: "72 Codex findings I could not fault, two pull requests closed unmerged, and three healthy controls with as many rounds. Review volume was not the signal. Who owned the requirement was."
category: "Agent Systems"
homepageRank: 2
author: "Nathan Payne"
date: 2026-09-06
tags: ["AI", "Product", "Decision Rights", "Code Review", "Systems"]
image: "/og/blog/every-reviewer-was-right.png"
keyTakeaways:
  - "Round count and repeated findings didn't separate the closed pull requests from the merged controls. Each merged control removed machinery during review, after Codex rounds 7, 10 and 13. The two closed pull requests kept it, or removed it at the wrong layer."
  - "I answered five prompts, asked for another round, and ordered a merge. The prompts reported rounds and findings. None showed the added guarantees, the diff's size, or an option to remove machinery. I had authorization to give and too little information to decide the scope."
  - "Freezing a contract gives the agent a basis for accepting or rejecting a finding. It doesn't stop reviewers finding defects. After external approval, Codex still found two real false greens inside the five guarantees."
  - "I don't need to adjudicate a P1 about an ABA race to decide whether the mechanism containing it belongs in the product. I need named guarantees, where each came from, and the cost of leaving the defect unfixed. Turning that history into a score would repeat the measurement error."
pullquotes:
  - text: "That question is rigged. Of course I say yes. The question I needed was whether the machinery containing the bug still belonged in the product I had asked for."
    label: "The wrong question"
    accent: red
  - text: "Nineteen rounds and forty-six findings describe what the review consumed. Thirty-five lines becoming 2,136 for a requirement that shipped in 377 describes what needed a decision."
    label: "The wrong units"
    accent: yellow
  - text: "Trust reviewers to find defects. Do not ask them to decide which guarantees are worth defending. And do not ask a product manager to make that decision unless the system shows them that a guarantee is being added."
    label: "The division of labor"
    accent: blue
sidebar:
  - type: text
    content: |
      How things are counted. A review round is one review submission by the Codex GitHub App, read from the pull request's reviews endpoint. A finding is a top-level inline comment from Codex or CodeRabbit; replies are excluded so a finding counts once however long its thread ran. Growth is the additions in the pull request's diff at the moment it was opened, against the additions at close or merge, each measured the way GitHub reports a pull request's diff, against its merge base with main at that moment, so the two snapshots of one pull request do not share a base. The session's own prompts and replies counted one clean pass that Codex posted as a comment rather than a review, so the round counts quoted in the prompt figure run one higher than this rule gives; the round numbers in the text follow the rule.

      The finding classification is a single-rater hand pass over 195 findings on five pull requests, using four categories of my own, built on the three dispositions the repository's rule 2 names (required, valid but adjacent, rebutted): a defect in the original ask, a defect in machinery that did not exist when the pull request opened and was added to satisfy an earlier finding, a stronger guarantee than the issue required, and documentation or manifest drift. Counts are good to about plus or minus two and are labeled as approximate where they appear.
    caption: "Counting rules for every figure in this post."
  - type: text
    content: |
      What was checked against what. Every pull request figure, timestamp, commit and quoted comment comes from the GitHub API, and the comment identifiers link to the source. The five prompts, my answers to them, the two lines I typed on August 27, and the messages I typed on September 6 come from the authoring session's own transcript, read directly rather than from a summary of it. An earlier summary of that transcript had claimed I typed nothing for twenty hours; the log says otherwise, and the text below follows the log. The fleet comparison covers every pull request with eight or more Codex review rounds opened between July 4 and September 6. Across the repository's full history at publication there were 26, and the two closed pull requests here are still the only ones that did not merge. Nothing here is quoted from a pull request body without saying so, because those were written by the agents that opened them, under my account.
    caption: "Provenance, so a reader can re-check it."
---

When an automated reviewer flags a P1 correctness defect, I usually don't have the engineering knowledge to prove it wrong. I trust the reviewer to find bugs. So "there is a real bug; should we fix it?" isn't much of a decision. That question is rigged. Of course I say yes. The question I needed was whether the machinery containing the bug still belonged in the product I had asked for.

Over eleven days in late August and early September, two pull requests in [Mergepath](/blog/agent-approval-workflow-genesis-of-mergepath/), the repository that sets the review policy for my coding agents, kept asking that question. Between them they drew 72 findings from the Codex GitHub App across 31 review rounds. I've read every one. I couldn't fault a single finding. Whether each defect needed fixing before merge was a separate product decision, and it was mine to make. Both pull requests closed without merging. One was replaced by a change to a single word.

I started writing a post about automated review causing scope creep. Then I checked three pull requests that had just as many rounds and merged fine, and that explanation fell over. The reviewers were doing their job the whole time, and nobody was doing the other job, which was mine. I was there all day, answering every prompt.

<span id="two-loops-same-pipeline-same-fortnight"></span>

## Two pull requests

The first, [#1112](https://github.com/nathanjohnpayne/mergepath/pull/1112), implemented [#1056](https://github.com/nathanjohnpayne/mergepath/issues/1056). When Mergepath bootstraps a consumer repository, it should record the template revision it used, so a later drift measurement has a baseline. The issue proposed the implementation in one line: put the commit hash in the initial commit's subject and a trailer. The first commit did that in 32 lines.

The second, [#1189](https://github.com/nathanjohnpayne/mergepath/pull/1189), implemented [#1188](https://github.com/nathanjohnpayne/mergepath/issues/1188). The merge workflow published a diagnostic check-run when it hit an infrastructure error, but only as a failure. Nothing published a success under the same name. One transient error could leave the pull request's head red permanently, and the local guard would then demand a break-glass merge even with every required check green.

| | [#1112](https://github.com/nathanjohnpayne/mergepath/pull/1112) | [#1189](https://github.com/nathanjohnpayne/mergepath/pull/1189) |
|---|---:|---:|
| First commit | +35 / −5 | +275 / −7 |
| At close | +2,136 / −17 | +1,179 / −19 |
| Commits | 39 | 21 |
| Codex review rounds | 19 | 12 |
| Codex findings, of which P1 | 46, 17 | 26, 3 |
| Active review time | 21 hours, then idle 9 days | 22 hours |
| Replacement | [#1197](https://github.com/nathanjohnpayne/mergepath/pull/1197), +377, merged in 68 minutes | [#1196](https://github.com/nathanjohnpayne/mergepath/pull/1196), +54, merged in 20 minutes |

## What happened to the provenance change, [#1112](https://github.com/nathanjohnpayne/mergepath/pull/1112)

Round 4 changed the ask. The first three rounds found genuine defects: the hash could be wrong or unresolvable in three different ways. All were fixed, and the recut kept two of those checks. Then Codex pointed out that a dirty source checkout could supply changed bytes while the mirror recorded its clean commit hash. It asked the author to [require the source to be clean before accepting its hash](https://github.com/nathanjohnpayne/mergepath/pull/1112#discussion_r3868677507). "record which revision this was based on" had become "prove the recorded hash characterizes the bytes that were mirrored."

Round 8 was where it broke, through a choice the authoring agent made. The resume path reruns a partially completed bootstrap. Codex found that it could leave stale files in the target while still recording a clean source hash, and asked the author to [validate the resumed target before attributing it](https://github.com/nathanjohnpayne/mergepath/pull/1112#discussion_r3869470508). One line would have kept the promise honest: don't attribute on resume. Instead, the session [added `--delete` to the rsync invocation](https://github.com/nathanjohnpayne/mergepath/pull/1112#discussion_r3872275126) and built a residue-reconciliation engine around it. A provenance feature now deleted things.

The reviewers kept finding real defects in that engine. In round 12, a target directory named after an excluded path caused [the engine to delete the entire target](https://github.com/nathanjohnpayne/mergepath/pull/1112#discussion_r3874150864), repository and operator work included. After a round-15 trailing-slash fix, CodeRabbit noticed that `/` now normalized to an empty string, so rsync [ran with `--delete` against the filesystem root](https://github.com/nathanjohnpayne/mergepath/pull/1112#discussion_r3875527997). Ten data-loss findings, nine of them P1s. Every one was real, every one concerned code added after the pull request opened, and every one was fixed with a regression test.

By the end, the bootstrap script had grown from 1,498 lines to 2,102 and its test file from 2,088 to 3,607. The diff was 61 times the size of the first commit. The recut, [#1197](https://github.com/nathanjohnpayne/mergepath/pull/1197), kept the hash, trailer, origin and reachability checks, and a plain clean-tree gate. It dropped the proof, configuration pinning and engine.

## The rigged question

The session's transcript shows what I was asked to decide.

After the task list at 01:36 UTC on August 27, rounds 1 through 10 ran without input from me. From the afternoon on, the session asked how to proceed five times. Each prompt had three options. These are all five, with my choice listed first.

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

I clicked the first option all five times. Only the 17:48 prompt marked it Recommended, with the gloss "matches what you asked for last time"; at 20:16 the gloss was "same instruction as before." After the third click, at 20:23, I typed my only free-form instruction of the afternoon: "Then do one more @codex round." At 22:28 I pasted a link to another finding. A minute later I typed "fix that and admin merge." The merge never happened. The pull request sat untouched for nine days.

Every prompt told me the loop wasn't converging. The 17:48 prompt said the pull request had introduced two regressions of its own, and the 20:16 prompt called the next finding "the same class as several already-fixed spots." But none connected the trouble to the issue. None quoted a line count; the session's own text first gave the diff's size on September 6, after I'd read it myself. None listed the guarantees added beyond the single one [#1056](https://github.com/nathanjohnpayne/mergepath/issues/1056) asked for, or explained that the current P1 was in an engine added in round 8 to answer a round-8 finding. None offered "remove the mechanism," "weaken the guarantee," "return to the original requirement," or "close and recut." Four of the five menus were neutral. I still clicked the same slot, because every option accepted the same design.

Seventeen of the session's review replies quoted a round or finding count. Its three deferrals for non-convergence correctly described the findings as "new, distinct, genuinely valid edge cases." They never said that one decision in round 8 had created the whole class, or that the decision could be reversed.

I trust the reviewer, and I won't knowingly ship a P1. Given "fix it," "ship with the defect," or "go read the code yourself," I'm going to pick "fix it." "Remove the thing creating the P1" would have been a decision I could answer in a sentence. Nineteen rounds and forty-six findings describe what the review consumed. Thirty-five lines becoming 2,136 for a requirement that shipped in 377 describes what needed a decision.

Everything else I typed about [#1112](https://github.com/nathanjohnpayne/mergepath/pull/1112) came on September 6. First I asked the session to resolve merge conflicts. Then I read the diff, decided to close it, gave the contract for the recut, and added two notes. My decision was that an issue labeled small shouldn't need changes capable of deleting repositories and operator work. Once it did, the correctness work already invested in the branch wasn't a reason to keep it.

The session closed [#1112](https://github.com/nathanjohnpayne/mergepath/pull/1112) and opened [#1197](https://github.com/nathanjohnpayne/mergepath/pull/1197) against my three-check contract. Two Codex rounds and a CodeRabbit pass still drew three findings. Two were real violations of the clean-tree check and were fixed. One concerned an adversarial caller's environment and was rebutted as outside the contract. Freezing the contract gave the agent a reason to say no to that finding. It didn't stop reviewers finding bugs.

## What happened to the diagnostic-clearing change, [#1189](https://github.com/nathanjohnpayne/mergepath/pull/1189)

[#1189](https://github.com/nathanjohnpayne/mergepath/pull/1189) had a different problem. I described it as uncontrolled growth at first. The unnecessary guarantee was already in its opening commit.

An agent filed [#1188](https://github.com/nathanjohnpayne/mergepath/issues/1188) at 03:59 UTC on September 5, listing three possible fixes. The third was to publish the diagnostic as `neutral` instead of `failure`: visible, but non-blocking. The issue called it "the cheapest option and closest to what the record actually means." Sixty-four minutes later, the pull request opened with option one: publish a success to clear the failure. The first commit's header explicitly rejected the cheaper fix: "The failure conclusion stays `failure` rather than softening to `neutral`. 'We could not verify this is safe to merge' should block; the defect was the missing exit, not the severity."

Nobody was asked to approve that sentence. The agent had made a product decision in a code comment, before any reviewer saw it. The diagnostic wasn't a required status check on the hub or any of the three consumer repositories checked. It blocked only the guard script. Twelve rounds then hardened a requirement that didn't need to exist.

The first round found two real false greens: the clearing path created a competing success run instead of updating the failure, and a clear wasn't pinned to the head that produced the verdict. Ordering defects followed. The session deferred two to follow-up issues, explaining the cost. The external reviewer, a Codex pass under a separate identity with a merge veto, [overruled both](https://github.com/nathanjohnpayne/mergepath/pull/1189#pullrequestreview-5120227951): "Both affect the core merge-gating guarantee and should be resolved before merge." The session complied. Its [note on complying](https://github.com/nathanjohnpayne/mergepath/pull/1189#issuecomment-5553441393) said: "The review overruled my deferral and it was right to."

Half right. The defects were real. Requiring their fixes before merge was a product judgment. The demanded watermark reopened the race over which conclusion buried which, in the opposite direction, and was split back out 95 minutes later. In all, five mechanisms tried to establish which of two workflow invocations happened first, over an API with no atomic operation for it. Each closed one interleaving and opened another. Findings never reached zero and spiked to six in round 6. Roughly half the later findings came from interactions between rules added the round before.

At 02:55 UTC on September 6, the contract was [frozen to five guarantees](https://github.com/nathanjohnpayne/mergepath/pull/1189#issuecomment-5556479015). A false red left by concurrent invocations was an accepted residual. The external reviewer approved with zero findings. Codex then found two more real P1s inside the frozen contract: a runner clock slightly ahead of GitHub's could [classify an unobserved failure as older and clear it](https://github.com/nathanjohnpayne/mergepath/pull/1189#discussion_r3942818732), and a base branch advancing under an unchanged head could [authorize a clear for a merge context that was never evaluated](https://github.com/nathanjohnpayne/mergepath/pull/1189#discussion_r3942818738). Both false greens, both within the five guarantees.

Seven minutes after that round, [#1196](https://github.com/nathanjohnpayne/mergepath/pull/1196) opened. One word: `failure` became `neutral`. With no red state to leave behind, there was nothing to clear. It merged in twenty minutes.

<span id="four-articles-the-controls-killed"></span>

## Explanations that didn't hold up

Two failures could support almost any explanation, so I checked the merged pull requests too. Of the 507 pull requests closed by 2026-09-06, 15 closed unmerged. Twenty-six had eight or more Codex rounds; only these two didn't merge. The comparison uses the 21 opened between July 4 and September 6, of which 19 merged. Four explanations looked convincing against the failures and fell apart against a control. That rules out each as a simple diagnostic. It doesn't establish what caused either outcome.

**Too many rounds.** [#1084](https://github.com/nathanjohnpayne/mergepath/pull/1084) ran 19 rounds, drew 66 findings, and merged. [#925](https://github.com/nathanjohnpayne/mergepath/pull/925) ran 18 and merged at 3,369 lines. Long reviews can merge. That alone doesn't make them healthy or worth the cost.

**Findings in code added to satisfy earlier findings.** [#1139](https://github.com/nathanjohnpayne/mergepath/pull/1139) was an 85-line routing change with a bootstrap guard the author volunteered on top. Fifteen of its 21 findings concerned the guard. Seven were successive holes in one flag extractor: "the fifth instance of one root cause," the author wrote, then "the sixth way this extractor has validated a subset." It merged. Its share of such findings, a third, was higher than [#1189](https://github.com/nathanjohnpayne/mergepath/pull/1189)'s.

**A frozen contract quiets review.** Both frozen contracts drew valid findings: the two P1s inside [#1189](https://github.com/nathanjohnpayne/mergepath/pull/1189)'s five guarantees and the two clean-tree violations inside [#1197](https://github.com/nathanjohnpayne/mergepath/pull/1197)'s three checks. The contract gave the agent a basis for accepting or rejecting a finding. It didn't make review go quiet.

**Implementation growth.** [#1112](https://github.com/nathanjohnpayne/mergepath/pull/1112) grew 61× from open to close. The largest growth among the 19 merged pull requests with many review rounds was 11×. That separates [#1112](https://github.com/nathanjohnpayne/mergepath/pull/1112) alone. [#1189](https://github.com/nathanjohnpayne/mergepath/pull/1189) grew an unremarkable 4.3×. Its opening 275 lines already implemented a guarantee whose cheapest listed alternative was one word. Measuring growth from open couldn't see the gap between the issue and that first commit.

## What actually separated them

The comparison left two differences: which stronger guarantees entered scope, and whether the author removed the machinery causing the findings.

| PR | Codex Rounds | Findings, Both Reviewers | Stronger Guarantees Accepted into Scope | A Mechanism Deleted Mid-Review | Outcome |
|---|---:|---:|---|---|---|
| [#1176](https://github.com/nathanjohnpayne/mergepath/pull/1176) | 11 | 30 | 1 | yes, after round 7 | merged |
| [#1139](https://github.com/nathanjohnpayne/mergepath/pull/1139) | 11 | 21 | 1 | yes, after round 10 | merged at +85, from a peak of +286 |
| [#1084](https://github.com/nathanjohnpayne/mergepath/pull/1084) | 19 | 66 | 3, all input edge cases | partly, after round 13 | merged |
| [#1112](https://github.com/nathanjohnpayne/mergepath/pull/1112) | 19 | 51 | about 10 | never | closed |
| [#1189](https://github.com/nathanjohnpayne/mergepath/pull/1189) | 12 | 27 | 5, all ordering mechanisms, 3 later removed | twice, at the wrong layer | closed |

I classified the stronger guarantees by hand; that column is approximate and single-rater. Each merged control accepted one to three stronger guarantees and treated the rest as defects within a contract already broad at open. Each also removed machinery during review, without a human asking. [#1176](https://github.com/nathanjohnpayne/mergepath/pull/1176), after round 7: "removing the thing that produced this finding rather than patching it a fourth time." [#1139](https://github.com/nathanjohnpayne/mergepath/pull/1139), after round 10: "I am splitting the guard out rather than taking a fourteenth round on it." That reply counted every reviewer's pass, not just Codex's. [#1084](https://github.com/nathanjohnpayne/mergepath/pull/1084), after round 13: "Both fixed, by deleting the mechanism that caused them." Its hand-rolled field reader stayed and drew findings until merge, which is why the table says partly.

The provenance change never made that move. The diagnostic-clearing change made it twice, but removed machinery above the clearing path while keeping the path itself. The agent questioned its ordering tokens and kept the unnecessary requirement it had started with. My read is that an agent has the hardest time questioning the premise it opened with. That's the one place in this story where I wasn't optional.

The same issue was implemented twice, ten days apart.

```mermaid title="Same issue, two contracts" description="#1112 and #1197 implement the same issue, #1056, from the same authoring system with the same reviewers, ten days apart. #1112 opened at 35 added lines, closed at 2,136 after 19 Codex rounds and 46 Codex findings, 51 counting CodeRabbit, and was closed unmerged. #1197 opened at 255 lines and merged at 377, drew 2 Codex findings and 1 CodeRabbit finding in 2 Codex rounds, and merged 68 minutes after opening."
graph TD
    S["same issue, #1056<br/>same authoring system<br/>same reviewers<br/>ten days apart"]
    S --> A1["#1112, August 27<br/>first commit +35"]
    A1 --> A2["19 Codex rounds<br/>46 Codex findings<br/>no mechanism removed"]
    A2 --> A3["closed unmerged<br/>at +2,136"]
    S --> B1["#1197, September 6<br/>owner-set contract<br/>opened at +255, merged at +377"]
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

The reviewers stayed the same. I changed the contract and held the agent to it. The recut also benefited from ten days of hindsight, so the comparison shows what the two bought together, not the contract alone. This is how [#1112](https://github.com/nathanjohnpayne/mergepath/pull/1112)'s guarantees accumulated:

```mermaid title="Lineage of the #1112 findings" description="The original issue asked to record a source revision. Round 4 turned that into proving the recorded revision characterizes the mirrored bytes, which required a clean-tree check. Round 8 asked the resume path to honor that proof, and the author's chosen mechanism was rsync with delete plus a residue-reconciliation engine. Rounds 11 through 17 then found ten data-loss defects in that engine: the target root deleted, symlink referents followed, the filesystem root, linked-worktree .git files and glob escapes. The recut kept the hash, the trailer, the origin check and a plain clean-tree gate, and dropped the proof and the engine."
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

## The question I can actually own

The merged controls showed that long, repetitive reviews can work when somebody asks whether the thing containing the error should still exist.

I can answer that without reading the implementation. Start by accepting the reviewer's diagnosis: yes, that's a real bug. Then ask:

Does the mechanism containing this finding exist because the original issue requires it?

What happens if I leave the residual unfixed?

That second question leaves room to accept the residual, as well as fix or defer it. [#1084](https://github.com/nathanjohnpayne/mergepath/pull/1084) merged while its hand-rolled parser still drew findings because a wrong answer could skip a review wait, not the review itself. [#1196](https://github.com/nathanjohnpayne/mergepath/pull/1196) shipped on an assumption about GitHub's handling of `neutral` that couldn't be verified in advance. If it was wrong, the failure would be today's behavior; the remedy was reverting one word. Neither decision required reading code. Both needed the cost of being wrong stated in terms of the product.

My rule now is to fix a real error unless it concerns machinery added beyond the original requirement. Then stop and reconsider that machinery first. This isn't a rule I can automate. An issue rarely names every property its outcome needs; "beyond" means an additional commitment, not merely something the issue didn't mention. Omitting attribution on resume kept [#1056](https://github.com/nathanjohnpayne/mergepath/issues/1056)'s promise honest without a deletion engine. I have to compare the guarantee with the issue's problem, not the pull request's design. Otherwise [#1189](https://github.com/nathanjohnpayne/mergepath/pull/1189)'s clearing path counts as original and the rule catches nothing.

To use that rule, I need the agent to keep track of the original ask, the guarantees added beyond it, the mechanism each guarantee required, the finding that prompted it, and whether the latest finding concerns required behavior or added machinery. That's enough history to decide without reading the code. [#1112](https://github.com/nathanjohnpayne/mergepath/pull/1112)'s "new, distinct, genuinely valid" replies lost it. The merged controls recovered it by naming repeated instances of one root cause.

Those guarantees need names, not a score. A number invites a threshold that can be met without anyone thinking. [#1112](https://github.com/nathanjohnpayne/mergepath/pull/1112) ran past an owner-set ten-round budget that applied throughout. At round 12, this is the information I could have used:

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

The session had the facts in that figure and didn't report them. The cost of removing the engine is my reconstruction of what an escalation should explain. I don't need to understand `rsync --delete` to notice something is off. A system that recommends "fix" because the finding is valid has answered the engineering question and skipped the product one.

<span id="where-the-decision-rights-go"></span>

## Since the review

The operating rules that followed put decision rights at the points they govern, not in a second rulebook beside the review policy. The owner ratifies the contract against the issue when a pull request opens, with named guarantees and the cost of residual defects visible. That's where [#1189](https://github.com/nathanjohnpayne/mergepath/pull/1189) should have stopped. At escalation, the agent should report where each guarantee came from and what's been added since open, and offer reduce, remove, recut and accept. Reviewers should keep finding defects.

Three claims corrected in this work were mine, or repeated by me. The size-S label I'd treated as the original estimate was added by a backlog audit eight days after the pull request opened. The first draft of the rules said [#1189](https://github.com/nathanjohnpayne/mergepath/pull/1189) ran ten rounds and seventeen commits; the API says twelve and twenty-one, and Codex caught the error in its first round. The first published version of this post counted the provenance change's later rounds as the session prompts did, one higher than the sidebar's rule, until a reader's review prompted the correction. All three were unmeasured claims in material arguing for measurement before accepting an obligation. Each was caught by checking. Correcting a count still didn't decide whether to add machinery, weaken a guarantee, defer a finding, or abandon the approach.

<span id="what-this-is-evidence-for"></span>

## What I need from the loop

When AI writes and AI reviews, keeping a human in the loop is not enough. [The last post](/blog/perfect-score-wrong-axis/) measured closure when it cared about coverage. Here I was shown review consumption when I needed to decide which guarantees to keep.

I was in the loop all day. I answered every prompt and ordered a merge. Five times, the system asked for authorization without telling me which guarantees had been added, where they came from, or what removing one would cost. It didn't offer removal at all. I need that information when a guarantee enters scope, with the cost stated in product terms. The instruments are tracked as open issues. If they're built and the same problem recurs, this post is wrong. I would rather have written something that can be wrong.

Trust reviewers to find defects. Do not ask them to decide which guarantees are worth defending. And do not ask a product manager to make that decision unless the system shows them that a guarantee is being added.
