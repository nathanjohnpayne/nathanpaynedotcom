---
title: "A Perfect Score on the Wrong Axis: 116 Review Findings, Zero Rejected, One Escape"
seoTitle: "A Perfect Review Score, One Escaped Bug"
shortTitle: "Perfect Score, Wrong Axis"
description: "A ten-PR batch went through 41 automated review rounds and 116 severity-tagged findings—not one rejected as wrong. Ninety-four seconds after the last merge, a reviewer with no inherited brief found the defect the whole batch had missed. The record was perfect because it was measuring the wrong axis."
seoDescription: "An AI review batch accepted all 116 findings with zero rejections and still shipped a P1. Why verification inherits the framing of whoever briefed it."
author: "Nathan Payne"
date: 2026-07-30
tags: ["AI", "Engineering", "Systems", "Code Review", "Debugging"]
image: "/og/blog/perfect-score-wrong-axis.png"
pullquotes:
  - text: "A perfect disposition record measures precision on the questions asked. It says nothing about the questions that went unasked."
    label: "The reframe"
    accent: blue
  - text: "The verifiers were briefed from the authoring agent's finding list, using its taxonomy. Every round asked the same question."
    label: "The diagnosis"
    accent: red
  - text: "Same harness, opposite verdicts, and the only variable was where the test matrix came from."
    label: "The worked example"
    accent: yellow
sidebar:
  - type: mermaid
    content: |
      graph TD
          A["Authoring session"] --> B["Finding list<br/>(116 findings)"]
          B --> C["Verifiers briefed<br/>from the list"]
          C --> D["111 fixed, 9 deferred,<br/>0 rejected"]
          D --> E["Defect #809<br/>ships anyway"]
          S["External spec<br/>(CommonMark)"] --> F["Fresh pass, no<br/>inherited brief"]
          F --> G["#809 found in<br/>94 seconds"]
          style A fill:#e8b4b4,stroke:#993d3d,color:#333
          style B fill:#e8b4b4,stroke:#993d3d,color:#333
          style C fill:#e8b4b4,stroke:#993d3d,color:#333
          style D fill:#d4a84b,stroke:#a07830,color:#fff
          style E fill:#c75c5c,stroke:#993d3d,color:#fff
          style S fill:#b8ddb8,stroke:#4a8a4d,color:#333
          style F fill:#b8ddb8,stroke:#4a8a4d,color:#333
          style G fill:#7bc67e,stroke:#4a8a4d,color:#fff
    caption: "Two ways to derive a review: verifiers briefed from the session's own finding list converged on its assumptions; a fresh spec-shaped pass found the escape."
---

On July 30, 2026, at 03:59:00 UTC, [PR #797](https://github.com/nathanjohnpayne/mergepath/pull/797) merged into [mergepath](https://github.com/nathanjohnpayne/mergepath). It was the last of a nine-PR backlog batch that had been under continuous automated review for about twenty-four hours, and it went out clean: every required check green, every review finding dispositioned, the external reviewer's approval posted on the exact head.

At 04:00:34 UTC—ninety-four seconds later—a reviewer that had been rate-limited out of most of the batch finished a from-scratch pass on the merged PR and posted [one more finding](https://github.com/nathanjohnpayne/mergepath/pull/797#discussion_r3679855498). It opened: "Indented list/paragraph lines are blanked as code, and no test would catch it."

That finding became [issue #809](https://github.com/nathanjohnpayne/mergepath/issues/809), a post-merge hotfix, and the subject of this post. Because the interesting thing is not that a bug shipped. Bugs ship. The interesting thing is what the review record looked like at the moment it shipped: 116 severity-tagged findings raised across the batch, and not one of them rejected as incorrect. By the only metric the process records, the review was perfect. And the metric was measuring the wrong axis.

## The third beat of an arc

This blog has been circling this problem for a while, so let me place it.

In April I wrote [Six PRs, One Bug](/blog/six-prs-one-bug-agent-failure-modes/), about an agent that made competent local progress inside the wrong model for six consecutive PRs because nothing in its loop forced a repeated local failure to become a structural question. Two weeks later I wrote [Agent Approval Workflow](/blog/agent-approval-workflow-genesis-of-mergepath/), about the enforcement infrastructure I built in response: multi-identity review, external review thresholds, the Codex GitHub App loop, merge gates that agents cannot talk their way past. The premise of that second post was that agent reliability is an infrastructure problem, and the infrastructure worked.

This post is the third beat, and it is a reversal. The infrastructure ran at full power—more reviewers, more rounds, and more independent verification than any batch before it—and produced the best-looking review record this repo has ever generated. It still shipped the bug. The failure was not that the machinery was weak. The failure was that every layer of the machinery was answering the same question.

## What the batch was

The [backlog](https://github.com/nathanjohnpayne/mergepath/issues/774) itself was almost comically self-referential: seven issues, most of them defects in mergepath's own review and enforcement machinery. Branch protection had drifted until [the audit script exited 3 on all ten fleet repos](https://github.com/nathanjohnpayne/mergepath/issues/774)—three repos had no protection at all, which the issue summarized as "a good deal of the review machinery this repo has built is, on most of the fleet, decoration rather than enforcement." A test fixture had been [writing a fake git identity into the real repo's `.git/config`](https://github.com/nathanjohnpayne/mergepath/issues/777), silently misattributing and unsigning commits, two of which had already reached `main`. A [drift guard read a Bash array without stripping quotes](https://github.com/nathanjohnpayne/mergepath/issues/785), so quoted entries silently escaped it. The review machinery was reviewing repairs to the review machinery.

Nine PRs went up as one batch—[#789](https://github.com/nathanjohnpayne/mergepath/pull/789) through [#797](https://github.com/nathanjohnpayne/mergepath/pull/797), later joined by [#800](https://github.com/nathanjohnpayne/mergepath/pull/800)—authored by my Claude agent and pushed through every review lane the repo has: the Codex GitHub App auto-reviewing each new head, CodeRabbit as the advisory second opinion, the automated Phase 4b external reviewer posting merge-gating reviews under `nathanpayne-codex`, and, new for this batch, independent adversarial verifier agents re-running each PR's "is this test actually testing anything" experiment before approval.

## The scoreboard, re-derived

Here is where I have to be careful, because this batch taught me—twice, painfully—that agent-written summaries do not survive contact with the underlying record. So none of the following numbers come from a summary. I pulled the raw review objects from the GitHub API and counted.

Across the ten batch PRs and the hotfix, the record contains 268 inline review comments forming 134 top-level finding threads. Of those, 116 are severity-badged findings from the Codex App: 12 P1, 102 P2, 2 P3. The Codex App alone ran 41 review rounds against 48 trigger comments; the automated Phase 4b adapter ran 13 more loops on top. CodeRabbit added 18 actionable comments of its own where rate limits allowed.

The per-finding dispositions are recorded as machine-readable markers on each thread, so the outcome of every finding is countable rather than a vibe:

| Disposition | Count |
|---|---|
| Fixed (marker names the fix commit) | 111 |
| Deferred to a filed follow-up issue | 9 |
| Rebuttal recorded | 2 |
| No marker | 12 |

The two rebuttals are worth a sentence, because they are the entire "the reviewer was wrong" column and they are not even that: both are on [PR #796](https://github.com/nathanjohnpayne/mergepath/pull/796), both decline CodeRabbit suggestions against a generated mirror file whose provenance header says `do_not_edit: true`. Process objections, not factual ones. In the whole batch, no reviewer finding was rejected as incorrect. Not one. (The record is not spotless if you squint: four Codex findings landed on [PR #790](https://github.com/nathanjohnpayne/mergepath/pull/790) nine minutes after it merged and carry no disposition at all. Perfect records usually have a footnote like this.)

A skeptical reading of "every finding was accepted" is that the findings were soft and accepting them was cheap. The record says otherwise. The reviewers caught real, nasty things—including an entire genre of defect I have started thinking of as the impossible-world fixture.

## Six fixtures that modelled an impossible world

The strongest evidence that this batch's review was rigorous—genuinely rigorous, not checklist rigorous—is that it kept catching tests that passed by encoding a belief about the world instead of the world. Six times, a fixture or guard was found to be modelling a world that cannot exist:

**A `gh` stub that put error bodies on the wrong stream.** The test stub for a failed metadata read wrote the HTTP error body to stderr. Real `gh api --jq` writes the error body to stdout—verified live in [commit 53ae3c1](https://github.com/nathanjohnpayne/mergepath/pull/796/commits/53ae3c1ead45ceabced2d3a121df0e7e033835fd), which notes two pre-existing tests "were green against a failure mode gh does not produce." That one stream swap was hiding the failure path that later became [issue #799](https://github.com/nathanjohnpayne/mergepath/issues/799): fifteen call sites inferring failure from empty output, all of whose guards were dead.

**A consumer model that stripped too much.** The safety net simulating downstream consumer repos removed more hub paths than any real consumer lacks. As [PR #800](https://github.com/nathanjohnpayne/mergepath/pull/800) put it: "Stripping more than a real consumer lacks makes 'both-absent' skip branches fire in simulation that never fire in reality—so a wrong model produces a *passing* test, not a failing one."

**A guard that matched one line of a two-line sentence.** A count guard matched a single-line regex, but the comments it guarded are hard-wrapped near 72 columns. One of the two protected surfaces happened to fit its claim on one line and was guarded; the other wrapped mid-phrase and never was. [Commit 42771ef](https://github.com/nathanjohnpayne/mergepath/pull/797/commits/42771ef80f): "The guard was vacuous for one of the two surfaces it claimed to protect."

**Three bootstrap fixtures declaring an impossible manifest.** Three sibling fixtures declared a source tree with no hub-only doc entry—a shape a different CI check already makes impossible in any real mergepath. The fixtures were exercising a repo that cannot exist ([commit 5ac7b2f](https://github.com/nathanjohnpayne/mergepath/pull/797/commits/5ac7b2faa6)).

**A guard whose enrollment regex skipped its own target.** The residue guard derived each wrapper's hub-only dependencies with a literal-text regex over five file extensions. A wrapper depending on any other kind of hub-only input produced an empty set, hit `continue` with zero accounting, and was never enrolled—"its silence was indistinguishable from a genuinely portable check" ([commit e53cee9](https://github.com/nathanjohnpayne/mergepath/pull/800/commits/e53cee920c)).

**A scanner whose documentation exempted itself.** The identity-hygiene scanner's exemption matched its marker anywhere on a line. All three docs describing the check spell the marker out, so each doc exempted itself—"leaving the paragraphs whose job is to record the forbidden shape the only paragraphs never scanned" ([commit 6a2fbe5](https://github.com/nathanjohnpayne/mergepath/pull/795/commits/6a2fbe5ff3)).

Six defects of the same species: a test green against a world that cannot occur. All six were caught inside the batch, by the batch's own verification. Which makes the seventh one instructive.

## The seventh

[PR #797](https://github.com/nathanjohnpayne/mergepath/pull/797) added a new CI check: a canonical doc may not link to a hub-only doc by repo-relative path. To scan only rendered prose, it introduced a Markdown preprocessor, `mp_markdown_renderable_text`, that blanks code before scanning. The preprocessor treated every tab- or four-space-indented line as an indented code block.

CommonMark does not work that way. Indented code cannot interrupt an open paragraph or list item—a four-space-indented line inside a nested bullet is list content, not code. So a nested bullet indented four spaces—`- See [the audit](coderabbit-audit.md)`—was silently blanked before the scan ran, and the check went blind to exactly the links it existed to catch. Fail-open, with a test matrix that—in the words of the finding—"only exercises fenced and inline code, so nothing fails today."

PR #797 was not under-reviewed. It absorbed 27 severity-badged Codex findings across eight review rounds, two large CodeRabbit reviews before the rate limits hit, and six review events from the Phase 4b external reviewer, four of whose approvals were dismissed by subsequent pushes before the fifth stuck. Twenty commits. Every finding fixed. And then it merged, and ninety-four seconds later CodeRabbit—which had spent much of the batch rate-limited, and was therefore reviewing the merged diff cold, with no memory of the batch's eight rounds of conversation—read the preprocessor against CommonMark's actual rules and found the hole.

The human filed [#809](https://github.com/nathanjohnpayne/mergepath/issues/809) one minute later. [PR #810](https://github.com/nathanjohnpayne/mergepath/pull/810) fixed it with explicit CommonMark text-flow state tracking and merged at 04:28:05 UTC—twenty-eight minutes from finding to merged fix, with 93 regression cases behind it. (Severity taxonomy footnote, since I am being precise: CodeRabbit tagged the finding "Functional Correctness / Major"; the repo's own approval record for the fix calls it "the P1 from #797." Same defect, two vocabularies.)

## Why the tenth look missed what the first fresh look found

My diagnosis, written into [the batch retrospective](https://github.com/nathanjohnpayne/mergepath/issues/813#issuecomment-5133940688) the same day, is the spine of this post:

> same-session verification converged on the implementation's assumptions: the verifier agents were briefed from the authoring agent's finding list using its taxonomy, so they searched the space that session had already mapped. Every round asked the same question.

Look at the mechanics. The adversarial verifiers this batch added were real and they earned their keep—one of them returned a *blocking* verdict on [PR #791](https://github.com/nathanjohnpayne/mergepath/pull/791) and forced a fix before merge. But they were briefed by the authoring session, from its finding list, in its taxonomy. Their job was to check whether each claimed fix actually fixed the claimed defect, and whether each test actually failed when the fix was reverted. They did that job essentially perfectly: that is what 111-fixed-zero-rejected means.

What none of them could do, structurally, was ask a question nobody in the session had thought to ask. The session's model of `mp_markdown_renderable_text` was "indented lines are code." Every reviewer briefed inside that session inherited the model along with the brief. Verification validated the fixes against the finding list; nobody re-derived the finding list against the CommonMark spec. The ten-plus passes were deep, and they were all deep in the same hole.

The reviewer that found the escape had none of that context—not by design, but by accident of a rate limit. It read the merged code against the external specification and asked the one question the session never had: *does CommonMark actually let indented code interrupt a list item?*

Here is the reframe I keep coming back to. A perfect disposition record measures precision on the questions asked. It says nothing about the questions that went unasked. The batch's zero-rejections record looked like rigor, and it was—but it was rigor on one axis, recall on a question set that was fixed at briefing time and never expanded. The metric could not even represent the failure that mattered, so of course it did not move when the failure shipped.

## The worked example: where the matrix comes from

The same batch contains a controlled experiment on the fix, which is what makes this more than a moral.

[PR #796](https://github.com/nathanjohnpayne/mergepath/pull/796) includes a Bash reimplementation of the pattern matching GitHub uses for branch-protection refs, which GitHub documents as Ruby's `File.fnmatch` with `File::FNM_PATHNAME`. The authoring agent did the right thing by every standard I had before this batch: it wrote a differential test that extracts the matcher verbatim and runs every pattern/ref pair through real Ruby, asserting agreement. Its matrix had 168 author-written pairs. It passed.

The Phase 4b external reviewer, before approving, did not re-run that matrix. It extended it—adversarially, from the spec's behavior rather than from the author's cases. In [its own words](https://github.com/nathanjohnpayne/mergepath/pull/796#pullrequestreview-4814414033): "I found the trailing-slash fnmatch mismatch, added adversarial matrix coverage first (66 passed / 1 failed with 14 Ruby-vs-Bash mismatches), then applied the two empty-component preservation lines." The root cause was four lines from the bottom of the harness: `IFS='/' read -r -a` silently drops a *trailing* empty field, so `release/*/` collapsed into `release/*`—crediting matches Ruby denies. The [fix commit](https://github.com/nathanjohnpayne/mergepath/pull/796/commits/016336a360054a626e8ac8f6212b8ce4fa81917d) is two `case` statements re-appending the empty component, under a comment stating the rule. The matrix merged at 255 pairs, seventeen patterns by fifteen refs, bracket classes included.

Same harness. Same reference implementation. Same technique, executed competently both times. The author-derived matrix passed a broken matcher; the spec-derived expansion failed it within one round. The only variable was where the pairs came from—and the author's pairs came from the same place the author's implementation came from, so they shared its blind spots by construction. A trailing slash was not in the implementation's model of a ref, so it was not in the matrix either. That is the #809 failure in miniature, caught this time only because one reviewer derived its cases from the spec instead of the session.

And one more turn of the screw, because this batch does not let anyone off. The retrospective comment I quoted above—the one containing the diagnosis, written by the agent that drove the batch—cites this very example as "1041 pattern/ref pairs." I went looking for the 1041. It does not exist. The matrix was 168 pairs, then 224 at the moment the mismatch was found, then 255 at merge; the only "1041" anywhere in the PR's record is a line number in a `sed -n '1041,1560p'` command inside a handoff comment. The comment diagnosing that verification inherits unexamined assumptions itself carried an unverified number, and I only know because I re-derived it. I am leaving that in the post rather than quietly correcting it, because it is the phenomenon, demonstrated on the sentence describing the phenomenon.

## The rounds were not even about the code

There is a second, dumber sense in which the batch's review count measured the wrong thing, and it deserves a short section because it manufactured a large share of the volume.

Mergepath's branch protection sets `required_status_checks.strict: true`, so every merge forces every other open PR to update from `main`. The review workflow auto-triggers a fresh Codex review on every new head. And `gh pr update-branch` mints a new head even when it changes no file content. Chain those three together with a nine-PR train and, as [issue #798](https://github.com/nathanjohnpayne/mergepath/issues/798) puts it, "With N open PRs the train costs O(N²) review rounds in the worst case, none of which are responding to an actual code change." This was measured, not inferred: on [PR #794](https://github.com/nathanjohnpayne/mergepath/pull/794)—five files, four of them prose—the driving agent posted exactly one review trigger; the workflow posted the rest, including a round that landed 33 seconds after a content-free `update-branch` and produced a P1 and two P2s against code no human or agent had touched.

The cure already existed, unused: the merge gate had been computing a content fingerprint since [#705](https://github.com/nathanjohnpayne/mergepath/issues/705) precisely to carry a review verdict across a content-free rebase, and it was observed working on [#793](https://github.com/nathanjohnpayne/mergepath/pull/793) in this same batch. The trigger path just never consulted it. So when you read "41 review rounds" above, know that an unquantified but large fraction of them were the system reviewing its own head-churn. Findings-per-round did not decay across the batch—[#813](https://github.com/nathanjohnpayne/mergepath/issues/813) records #794 producing 5, then 2, then 1, then 4 findings across successive passes—which sounds like inexhaustible review depth until you notice that fixing generates new findable surface, and head-churn generates new rounds, and neither loop has a natural termination. Round count is not just the wrong unit for review quality. It is barely a measure of review at all.

## The correction, and its honest limits

The fix that generalizes is not "add more review." The batch had review to spare. The fix is to change where at least one reviewer's question set comes from: for any component with an external specification, derive the test matrix from the spec, not from the session's findings. The retrospective states it as a constraint: "at least one pass must derive its test matrix from the external specification rather than from prior findings." That constraint would have caught #809—`mp_markdown_renderable_text` is an implementation of CommonMark's block rules, and CommonMark's rules are written down and executable; the [#810 fix](https://github.com/nathanjohnpayne/mergepath/pull/810) is, in effect, the preprocessor finally being tested against them. It did catch the fnmatch bug, the one time a reviewer applied it. A pass cap, a round budget, or an approval count would have caught neither, because all of those were satisfied while the defect shipped.

I want to be honest about how partial this correction is. It works where a spec exists—CommonMark, `File::FNM_PATHNAME`, an RFC, a documented API. Much of mergepath is not that. It is policy prose interpreted by non-deterministic readers, and [#813](https://github.com/nathanjohnpayne/mergepath/issues/813), the epic now trying to bound this whole loop, names that as the deep problem rather than pretending to solve it: "Adding prose to clarify a prose rule does not converge, because each clarification is new surface to misread. This property is real and is bounded only by how much of the spec becomes executable. No item below eliminates it; the items shrink its domain. Any plan that claims to remove it is wrong." A blog post claiming otherwise would be wrong too. Spec-derived review shrinks the domain of the convergence failure; it does not and cannot eliminate it, because you cannot derive a matrix from a spec that only exists as prose in the heads of its readers.

There is one more datum from #813 that suggests independence is the scarce input, not effort: when the epic itself was reviewed, two production bots read its 91,000 characters and produced zero findings, while three independently-briefed adversarial reviewers produced 38 defects—six of them fatal—on the same text an hour earlier. The variable was not model quality or token budget. It was who wrote the brief.

Which leaves the question I do not have an answer to, and the reason #813 is an epic and not a patch. The repo is about to put a budget on review, because unbounded review demonstrably does not terminate on its own. But a budget needs a unit, and every unit on the table is a count—passes, rounds, findings, approvals—and this batch just demonstrated that a count optimizes toward spending every pass inside a single frame, which is exactly the failure mode made economical. Passes are not fungible; three passes from independent framings are worth more than ten from one. I know how to count passes. I do not yet know how to count frames.
