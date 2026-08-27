---
title: "A Perfect Score on the Wrong Axis: 116 Review Findings, Zero Rejected, One Escape"
seoTitle: "A Perfect Score on the Wrong Axis"
shortTitle: "Perfect Score, Wrong Axis"
description: "An eleven-PR review record held 134 finding threads and 122 recorded dispositions with zero rejections—and still shipped a P1, posted by CodeRabbit 94 seconds after the batch's last backlog merge. The rule the defect turned on had been raised in a blocking review on a sibling PR twelve hours earlier, then fixed and reference-validated there. The record measured closure, not coverage, and nothing carried knowledge across a PR boundary."
seoDescription: "An AI review batch recorded 122 finding dispositions with zero rejections and still shipped a P1. Every brief was scoped to one diff, so nothing carried the rule across a PR boundary."
category: "Agent Systems"
author: "Nathan Payne"
date: 2026-07-30
tags: ["AI", "Engineering", "Systems", "Code Review", "Debugging"]
image: "/og/blog/perfect-score-wrong-axis.png"
keyTakeaways:
  - "A perfect disposition record measures closure—how completely you resolved the findings raised. It says nothing about coverage: the defects nobody raised."
  - "This batch recorded 122 dispositions with zero rejections and still shipped a P1, posted by an unbriefed review 94 seconds after the batch's last backlog merge. The knowledge to catch it existed inside the batch, spec-derived and externally corrected, on a sibling PR—and no review lane carried it across."
  - "Where a component implements an external specification—CommonMark, fnmatch, an RFC—derive at least one review pass from the spec. And when one batch contains two implementations of the same spec, apply that pass to both: a brief scoped to one diff cannot transfer what a sibling PR already learned."
  - "Budgeting review by per-PR counts—passes, rounds, approvals—cannot represent the defect whose evidence sits on a neighboring PR. Every count in this batch was satisfied while sixteen passes ran deep inside one diff and the rule that mattered sat on a sibling PR, already stated, already fixed, already validated."
pullquotes:
  - text: "A perfect disposition record measures how completely you closed the findings raised. It says nothing about the defects nobody raised."
    label: "The reframe"
    accent: blue
  - text: "The rule the escape turned on had been stated verbatim in a blocking review twelve hours earlier—on a sibling PR that touched a file this one also touched."
    label: "The transfer failure"
    accent: red
  - text: "The author-derived matrix passed a broken matcher; the spec-derived expansion failed it within one round."
    label: "The natural experiment"
    accent: yellow
sidebar:
  - type: mermaid
    title: "Closure inside the session, and the knowledge that never crossed"
    description: "The authoring session dispositions the threads raised before the merge and PR 797 merges clean; the escaped defect is posted afterwards and itself dispositioned, and only then does the record close at 134 threads and 122 dispositions, the escape among them; a spec-derived pass on sibling PR 791 had named the same CommonMark rule twelve hours earlier, but every review was scoped to one diff, and an unbriefed CodeRabbit re-run posts the escape 94 seconds after the merge."
    content: |
      graph TD
          A["Authoring session"] --> B["134 finding threads<br/>(116 severity-badged)"]
          B --> C["Fix verification briefed<br/>from the finding list<br/>(author record)"]
          C --> D["Every pre-merge thread<br/>dispositioned; none rejected"]
          D --> E["#797 merges clean;<br/>the defect ships"]
          S["CommonMark spec"] --> F["Spec-derived pass on #791:<br/>P1 names the same rule,<br/>12 hours earlier"]
          F -->|"brief scoped to one diff"| X["Never applied to #797"]
          E --> G["Unbriefed re-run posts the<br/>escape 94 s after merge"]
          G --> H["Escape dispositioned in 75 s;<br/>record closes at 134 threads,<br/>122 dispositions, zero rejected"]
          style A fill:#e8b4b4,stroke:#993d3d,color:#333
          style B fill:#e8b4b4,stroke:#993d3d,color:#333
          style C fill:#e8b4b4,stroke:#993d3d,color:#333
          style D fill:#d4a84b,stroke:#a07830,color:#333
          style E fill:#993d3d,stroke:#993d3d,color:#fff
          style S fill:#b8ddb8,stroke:#4a8a4d,color:#333
          style F fill:#b8ddb8,stroke:#4a8a4d,color:#333
          style X fill:#d4a84b,stroke:#a07830,color:#333
          style G fill:#7bc67e,stroke:#4a8a4d,color:#333
          style H fill:#7bc67e,stroke:#4a8a4d,color:#333
    caption: "Two sources of review questions: briefs drawn from the session's own findings—an author record, not visible on GitHub—closed what they were asked about; the spec-derived pass that named the escape's rule ran on the sibling PR and never reached this one."
---

A team can resolve every issue anyone raises and still ship the bug. Closing everything you found and finding everything that is there are different achievements, and only the first leaves a record. There is a harder version of the miss than not knowing: having already derived the rule the bug breaks, been blocked on it, fixed it, and validated the fix—and shipping the bug anyway, because the knowing happened on one work item and the bug on its neighbor, and nothing moved knowledge between the two.

On July 30, 2026, at 03:59:00 UTC, [PR #797](https://github.com/nathanjohnpayne/mergepath/pull/797) merged into [mergepath](https://github.com/nathanjohnpayne/mergepath)—the last of a backlog batch to merge after about twenty-four hours of continuous automated review. It went out clean: every required check green, all but one review finding dispositioned, the external reviewer's approval posted on the exact head.

At 04:00:34 UTC—ninety-four seconds after the merge—CodeRabbit posted [one more finding](https://github.com/nathanjohnpayne/mergepath/pull/797#discussion_r3679855498) on it. It opened: "Indented list/paragraph lines are blanked as code, and no test would catch it."

That finding became [issue #809](https://github.com/nathanjohnpayne/mergepath/issues/809), a post-merge hotfix, and the subject of this post. The interesting thing is not that a bug shipped—bugs ship. It is the review record: 134 top-level finding threads across the batch and its hotfix, 116 severity-badged, and of the 122 threads with a recorded disposition—addressed, deferred, or rebutted—not one rejected as factually wrong. By the only metric the process records, the review was perfect. The metric measured the wrong axis. And the sharper fact: the exact CommonMark rule the defect turned on had been raised as a blocking finding on a sibling PR in the same batch twelve hours earlier—then fixed and validated there. The system did not lack the knowledge. It lacked any way to move it.

This is the third beat of a year-long arc, and a reversal. In [Six PRs, One Bug](/blog/six-prs-one-bug-agent-failure-modes/) (April), an agent made competent local progress inside the wrong model across six pull requests—three aimed at the same bug—while the correctness standard sat in a design spec, attached to nothing anyone reviewed. In [Agent Approval Workflow](/blog/agent-approval-workflow-genesis-of-mergepath/) (two weeks later), I built the enforcement infrastructure: multi-identity review, external-review thresholds, merge gates agents cannot talk their way past. This time the infrastructure ran at full power, produced the best-looking review record the repo has ever generated, and the bug shipped anyway. April's failure, one level up: knowledge that existed inside the system, never attached to the artifact under review.

## The defect that got out

[PR #797](https://github.com/nathanjohnpayne/mergepath/pull/797) added a new CI check: a canonical doc may not link to a hub-only doc by repo-relative path. To scan only rendered prose, it introduced a Markdown preprocessor, `mp_markdown_renderable_text`, that blanks code before scanning. The preprocessor treated every tab- or four-space-indented line as an indented code block.

CommonMark does not work that way. Indented code cannot interrupt an open paragraph or list item—a four-space-indented line inside a nested bullet is list content, not code. So a nested bullet like `- See [the audit](coderabbit-audit.md)`, whose target is the real hub-only [`docs/agents/coderabbit-audit.md`](https://github.com/nathanjohnpayne/mergepath/blob/main/docs/agents/coderabbit-audit.md), was silently blanked before the scan ran, and the check went blind to exactly the links it existed to catch. Fail-open, with a test matrix that—in the finding's words—"only exercises fenced and inline code, so nothing fails today."

[PR #797](https://github.com/nathanjohnpayne/mergepath/pull/797) was not under-reviewed. It absorbed 27 severity-badged findings across eight review rounds from the Codex GitHub App, OpenAI's automated reviewer, which tags inline findings P0 through P3; five review submissions from CodeRabbit, a second automated review service—three before the merge, two of those substantial; and five substantive reviews from the Phase 4b external reviewer—this repo's name for a merge-gating pass run by an agent other than the authoring agent—four approvals dismissed by subsequent pushes before the fifth stuck. Twenty commits. Every finding dispositioned but one—a CodeRabbit thread that never got a marker. Sixteen review passes preceded the escape on this one PR.

Between 03:52:56 and 03:53:18 UTC—six minutes before the merge—the session invoked the bot five times, each comment reading, in full, `@coderabbitai, try again.` No focus list, no findings: a bare re-run request. (CodeRabbit's acknowledgements paraphrase this back as re-running "with focus on correctness, security, regressions, and credential exposure"—language the service generated, not language anyone wrote—and describe the service as incremental: it "does not re-review already reviewed commits.") Two invocations finished before the merge and reported nothing; three acknowledged and posted no visible result. Whether the pass that produced the finding was already running at the merge, the record cannot show—an earlier review on this PR trailed its acknowledgement by almost nine minutes, so a pre-merge start is plausible and unproven. What it does show: the finding posted 94 seconds after the merge, on exactly the tree that merged. What context the service carried from its three earlier reviews of this PR, two of them substantial, I cannot know; what I can prove is that it was never briefed from the session's finding list, because it was never briefed on anything at all.

![The escape, posted at 04:00:34 UTC—94 seconds after PR #797 merged. Sixteen review passes preceded it on this PR. This one read the preprocessor against CommonMark's block rules.](/blog/perfect-score-wrong-axis/img/coderabbit-escape-finding-797.png)

I filed [#809](https://github.com/nathanjohnpayne/mergepath/issues/809) one minute later. [PR #810](https://github.com/nathanjohnpayne/mergepath/pull/810) fixed it with explicit CommonMark text-flow state tracking and merged at 04:28:05 UTC—twenty-eight minutes from finding to merged fix, adding eight regression assertions (three rendered-prose forms, five code-boundary controls) with the ownership suite green at 93/93. (Taxonomy footnote: CodeRabbit tagged the finding "Functional Correctness / Major"; the repo's own approval record for the fix calls it "the P1 from [#797](https://github.com/nathanjohnpayne/mergepath/pull/797)." Same defect, two vocabularies.)

## The rule was already in the batch

[PR #791](https://github.com/nathanjohnpayne/mergepath/pull/791)—same batch, merged three hours and seventeen minutes before #797—is titled "fix(781): marker-bounded help extraction and CommonMark-correct fence and indent parsing." Its record contains five Codex findings derived from CommonMark's block rules; a Phase 4b `CHANGES_REQUESTED` whose P1 states, verbatim, the exact rule the escape later turned on: "`para` is set for every emitted nonblank line, but CommonMark's 'indented code cannot interrupt' rule only applies to paragraphs"; and a Phase 4b approval recording "direct markdown-it-py 4.2.0 agreement on 18 adversarial fixtures"—a differential against a CommonMark reference implementation, run inside the session before #797 merged. That blocking P1 landed twelve hours and thirteen minutes before #797 merged. The two PRs are not merely siblings: both changed `tests/test_check_sync_manifest.sh`, the file the P1 was raised against.

So the session was not blind to CommonMark. It had derived the block rules, been blocked on them by the external reviewer, fixed them, and validated the fix against a reference implementation—for one Markdown preprocessor. Then it shipped a second Markdown preprocessor, on a parallel PR in the same batch, with the same defect. That is a transfer failure, not a coverage failure. The knowledge existed inside the batch—spec-derived, externally corrected, reference-validated—and no review lane carried it across a PR boundary, because every lane's brief was scoped to a single PR's diff. Twelve hours separated the sentence that named the rule from the merge that shipped its violation. Nothing in the design made any pass on #797 responsible for knowing what #791's reviewers had already established, so no pass did.

## The scoreboard, re-derived

The backlog behind the batch was comically self-referential: nine issues—`761`, `774`, `777`, `780`, `781`, `782`, `785`, `786`, `788` in mergepath—most of them defects in mergepath's own review and enforcement machinery: branch protection that had [drifted to decoration on most of the fleet](https://github.com/nathanjohnpayne/mergepath/issues/774), a test fixture [writing a fake git identity into the real repo's `.git/config`](https://github.com/nathanjohnpayne/mergepath/issues/777), a [drift guard that silently skipped quoted entries](https://github.com/nathanjohnpayne/mergepath/issues/785). Three of the nine were post-review observations filed off the previous batch; one was a backlog item about the backlog of the previous backlog batch.

Nine PRs went up as one batch—[#789](https://github.com/nathanjohnpayne/mergepath/pull/789) through [#797](https://github.com/nathanjohnpayne/mergepath/pull/797), opened within thirty-six seconds of each other, later joined by [#800](https://github.com/nathanjohnpayne/mergepath/pull/800)—authored in a Claude agent session and pushed under my author identity, so the API shows me as author of all eleven. Each review lane gets its questions from a different place—the design's premise: the Codex App's brief is the diff itself; CodeRabbit reads the same diffs as the advisory second opinion; the automated Phase 4b external reviewer posts merge-gating reviews under an agent identity different from the authoring agent's; and, new for this batch, the authoring session ran adversarial verifier agents re-running each PR's "is this test actually testing anything" experiment before approval—an author record: it runs inside the session and leaves no GitHub trace. What every lane shares: each one's scope is a single PR's diff.

This batch taught me—twice—that agent-written summaries do not survive contact with the underlying record. None of the numbers below come from a summary: I pulled the raw review objects from the GitHub API and counted, keeping every denominator explicit.

One population, defined once. The eleven PRs are `#789`–`#797`, `#800`, and `#810`, the hotfix. Every count was retrieved on 2026-08-26 via `gh api --paginate` over three endpoints per PR: `pulls/<N>/comments`, `pulls/<N>/reviews`, `issues/<N>/comments`. A top-level finding thread is a review comment with no `in_reply_to_id`. A severity badge is a `\bP([0-3])\b` match in a thread body—the split is identical whether the matcher reads the first 400 characters or the full body. A disposition is a `[mergepath-resolve: <class>]` marker in a reply, attributed to its thread root. Bot identities: `chatgpt-codex-connector[bot]`, `coderabbitai[bot]`. Round counts exclude empty-bodied wrapper objects and include comment-only clean verdicts—one rule for all three providers.

| Unit | Rule | Count |
|---|---|---|
| Inline review comments | all pages, all eleven PRs | 268 |
| Top-level finding threads | no `in_reply_to_id` | 134 |
| Severity-badged findings | Codex App threads with a P badge | 116 (12 P1, 102 P2, 2 P3) |
| Actionable CodeRabbit threads | reconciles with its own "Actionable comments posted" headers | 18 |
| `@codex review` triggers | body is exactly that string | 48 |
| Codex rounds | 38 review objects + 3 comment-only clean verdicts | 41 |
| CodeRabbit review objects | 10 are empty wrappers | 26 (16 substantive) |
| Phase 4b merge-gating reviews | non-empty reviews citing Phase 4b | 26 (16 by the automated adapter) |
| Recorded dispositions | `[mergepath-resolve:]` markers | 122 |

Per-PR thread counts, so the 134 is checkable: `#789` 5, `#790` 13, `#791` 8, `#792` 0, `#793` 0, `#794` 12, `#795` 38, `#796` 22, `#797` 29, `#800` 5, `#810` 2.

![The counting pass behind this section. The population, endpoints, and extraction rules are published as text above, so every count is reproducible without the screenshot.](/blog/perfect-score-wrong-axis/img/raw-count-query.png)

Over all 134 threads, the dispositions—with one relabelling declared: the marker class behind the first row is `addressed-elsewhere`, rendered here as "addressed" because all 111 replies name a fix commit:

| Disposition | Threads |
|---|---|
| Addressed (marker names the fix commit) | 111 |
| Deferred (5 to a filed follow-up issue, 4 logged with none filed) | 9 |
| Rebuttal recorded | 2 |
| No marker | 12 |

The four deferrals with no issue, all on [PR #795](https://github.com/nathanjohnpayne/mergepath/pull/795), each say why: "no issue is opened because the task explicitly forbids issue creation." The two rebuttals are the entire "the reviewer was wrong" column, and they are not even that: both are on [PR #796](https://github.com/nathanjohnpayne/mergepath/pull/796), both declining CodeRabbit suggestions against a generated mirror file whose provenance header says `do_not_edit: true`. Process objections, not factual ones. Among the 122 recorded dispositions, no finding was rejected as incorrect. Not one. The 12 unmarked threads are the asterisk—8 CodeRabbit threads that never got markers, and 4 Codex findings that landed on [PR #790](https://github.com/nathanjohnpayne/mergepath/pull/790) nine minutes after it merged.

The sharpest fact in the table: the escape is in it. Thread `3679855498` is one of the 134, one of the 18 CodeRabbit threads, and one of the 122 dispositions—marked `deferred-to-followup`, naming [#809](https://github.com/nathanjohnpayne/mergepath/issues/809), seventy-five seconds after it was posted. The perfect closure record absorbed the defect that beat it, in real time, by classifying it. That is the thesis, demonstrated on the scoreboard itself.

A skeptical reading of "nothing was rejected" is that the findings were soft and accepting them was cheap. The record says otherwise: the reviewers caught real, nasty things, including a genre of defect I now think of as the impossible-world fixture.

## Fixtures that modelled an impossible world

Six turned up in this batch, each written into the commit or PR body that fixed it—an author's list, not a census. Three deserve detail:

**A `gh` stub that put error bodies on the wrong stream.** The stub for a failed metadata read wrote the HTTP error body to stderr. Real `gh api --jq` writes it to stdout—verified live in [commit 53ae3c1](https://github.com/nathanjohnpayne/mergepath/pull/796/commits/53ae3c1ead45ceabced2d3a121df0e7e033835fd), which notes two pre-existing tests "were green against a failure mode gh does not produce." That stream swap hid the failure path that became [issue #799](https://github.com/nathanjohnpayne/mergepath/issues/799): fifteen call sites inferring failure from empty output, every guard dead.

**A consumer model that stripped too much.** The safety net simulating downstream consumer repos removed more hub paths than any real consumer lacks. As [PR #800](https://github.com/nathanjohnpayne/mergepath/pull/800) put it: "Stripping more than a real consumer lacks makes 'both-absent' skip branches fire in simulation that never fire in reality—so a wrong model produces a *passing* test, not a failing one."

**A scanner whose documentation exempted itself.** The identity-hygiene scanner's exemption matched its marker anywhere on a line. All three docs describing the check spell the marker out, so each doc exempted itself—"leaving the paragraphs whose job is to record the forbidden shape the only paragraphs never scanned" ([commit 6a2fbe5](https://github.com/nathanjohnpayne/mergepath/pull/795/commits/6a2fbe5ff3)).

The other three are the same species in miniature:

| The encoded belief | The reality | Where it was caught |
|---|---|---|
| A count guard's claim fits on one line | The guarded comments hard-wrap at ~72 columns; one of two surfaces wrapped mid-phrase and was never checked | [#797, commit 42771ef](https://github.com/nathanjohnpayne/mergepath/pull/797/commits/42771ef80f) |
| A source tree can have no hub-only doc entry | A sibling CI check already makes that shape impossible; three fixtures modelled it anyway | [#797, commit 5ac7b2f](https://github.com/nathanjohnpayne/mergepath/pull/797/commits/5ac7b2faa6) |
| A literal-text regex enrolls every wrapper in the residue guard | A wrapper with any other dependency shape produced an empty set and silently skipped enrollment | [#800, commit e53cee9](https://github.com/nathanjohnpayne/mergepath/pull/800/commits/e53cee920c) |

All six were caught inside the batch, by its own verification. Another was caught by review and closed by nobody: a CodeRabbit thread on [PR #791](https://github.com/nathanjohnpayne/mergepath/pull/791) headlined "This assertion can never fail."—a `$( ... )` capture strips the trailing newlines the assertion exists to pin—and it sits among the twelve unmarked threads. A vacuous-guard finding left undispositioned, in the batch that dispositioned 122 of its 134 threads. Then there is the one that shipped: the CommonMark preprocessor above—the same species, a wrong model of an external reality encoded into a scanner, and the one case where the correct model was already on the record, a sibling PR away.

## Why sixteen passes missed what the seventeenth posted

My first diagnosis went into [the batch retrospective](https://github.com/nathanjohnpayne/mergepath/issues/813#issuecomment-5133940688) the same day—posted under my agent's reviewer identity, attributing the analysis to me, so the linked comment is the agent's:

> Same-session verification converged on the implementation's assumptions: the verifier agents were briefed from the authoring agent's finding list using its taxonomy, so they searched the space that session had already mapped. Every round asked the same question.

That diagnosis is right about the lane it describes, and the first version of this post adopted it as the whole story. The batch's own record is sharper, and it cuts the other way. The session *had* asked the right question—on [#791](https://github.com/nathanjohnpayne/mergepath/pull/791). Convergence explains why the in-session lane produced nothing new; it does not explain why a rule an external reviewer had already stated as a blocking P1, on a PR that shared a file with this one, never arrived. The sixteen passes that preceded the escape on #797 were deep—deep inside that one diff, which is all any of their briefs contained. The seventeenth posted exactly the finding a spec-first reading produces: it checked the preprocessor against CommonMark's block rules and asked the question no pass on *this PR* had asked—*does CommonMark let indented code interrupt a list item?*—the question #791's record had already answered.

A perfect disposition record measures how completely you closed the findings raised. It says nothing about the defects nobody raised. Closure and coverage are different axes. The batch's zero-rejections record looked like rigor, and it was—but rigor on the closure axis, over a question set fixed per-PR at briefing time and never expanded. The metric could not even represent the failure that mattered, so it did not move when the failure shipped.

## The natural experiment: where the matrix comes from

The same batch contains the same event in miniature, with enough structure to expose the mechanism—a natural experiment, not a controlled one.

[PR #796](https://github.com/nathanjohnpayne/mergepath/pull/796) includes a Bash reimplementation of the pattern matching GitHub uses for branch-protection refs, documented as Ruby's `File.fnmatch` with `File::FNM_PATHNAME`. The authoring agent did what the repo's standards ask: a differential test that extracts the matcher verbatim and runs every pattern/ref pair through real Ruby, asserting agreement. Its matrix had 168 author-written pairs. It passed.

The Phase 4b external reviewer did not re-run that matrix. It extended it—adversarially, from the spec's behavior rather than the author's cases. In [its own words](https://github.com/nathanjohnpayne/mergepath/pull/796#pullrequestreview-4814414033): "I found the trailing-slash fnmatch mismatch, added adversarial matrix coverage first (66 passed / 1 failed with 14 Ruby-vs-Bash mismatches), then applied the two empty-component preservation lines." The root cause was four lines: `IFS='/' read -r -a` silently drops a *trailing* empty field, so `release/*/` collapsed into `release/*`—crediting matches Ruby denies. The [fix commit](https://github.com/nathanjohnpayne/mergepath/pull/796/commits/016336a360054a626e8ac8f6212b8ce4fa81917d) is two `case` statements re-appending the empty component, under a comment stating the rule. The matrix merged at 255 pairs, seventeen patterns by fifteen refs, the expansion adding among other things a POSIX character class the author's pairs had not covered.

Same harness, same reference implementation, same technique, executed competently both times. The author-derived matrix passed a broken matcher; the spec-derived expansion failed it within one round. I will not claim matrix provenance was the *only* variable—author and reviewer were different agents with different prompts and context, and nothing was randomized. But the direction matches [#809](https://github.com/nathanjohnpayne/mergepath/issues/809)'s: the author's pairs came from the same place the implementation came from, so they shared its blind spots by construction. A trailing slash was not in the implementation's model of a ref, so it was not in the matrix either.

One more turn of the screw. The retrospective comment quoted above cites this example as "1041 pattern/ref pairs." I went looking for the 1041. It does not exist. The matrix was 168 pairs, 224 when the mismatch was found, 255 at merge; the only "1041" anywhere in the PR's record is a line number in a `sed -n '1041,1560p'` command CodeRabbit ran to read the second half of the audit script, inside one of its own analysis comments. The comment diagnosing that verification inherits unexamined assumptions itself carried an unverified number, and I only know because I re-derived it. I am leaving it in rather than quietly correcting it: it is the phenomenon, demonstrated on the sentence describing the phenomenon.

![The diagnosis and the unverified number, two paragraphs apart in the same retrospective comment: the passage block-quoted earlier in this post, and a credit of 1041 pattern/ref pairs to the fnmatch work—a number that appears nowhere in the record.](/blog/perfect-score-wrong-axis/img/retrospective-1041-claim.png)

## A footnote on volume

One more distortion inflates every count above—and the first version of this post got its mechanism wrong. Mergepath's branch protection sets `required_status_checks.strict: true`, so every merge forces every other open PR to update from `main`, and `gh pr update-branch` mints a new head even when it changes no file content. I originally wrote that the review workflow then auto-triggers a fresh review on every new head. It does not—mergepath's own record corrected this fifty minutes after the retrospective quoted above: no workflow invokes the review-request script; the only automated path that posts `@codex review` is the CodeRabbit rate-limit failover, which fires when CodeRabbit is throttled.

That makes the distortion worse, not better. A large concurrent batch is what throttles CodeRabbit—seven of the eleven PRs drew a `rate limited by coderabbit.ai` notice, six of them within twenty-two seconds of the batch opening—and the throttling fires the failover. The batch manufactured its own review volume: the coupling is capacity, not ordering. (The throttling did not silence CodeRabbit—it still posted 26 review objects across eight of the eleven PRs, including every one of the scoreboard's 18 actionable CodeRabbit threads.)

![A Fair Usage notice from an agent-driven repo. The batch's notices state a wait, not an allowance: "Next review available in: 59 minutes" on one PR, 25 minutes on another—and, just after the batch, a note that this repo's review activity is in the 95th percentile or higher among CodeRabbit users, so adaptive limits apply.](/blog/perfect-score-wrong-axis/img/coderabbit-review-limit-reached.png)

[PR #794](https://github.com/nathanjohnpayne/mergepath/pull/794) shows the shape: four `@codex review` triggers, all under the author identity—the API cannot separate the agent's triggers from the failover's, because both post through the same wrapper—and one resulting round produced a P1 and two P2s against a head minted thirty-three seconds earlier by a content-free update-branch. As [issue #798](https://github.com/nathanjohnpayne/mergepath/issues/798) puts it: "With N open PRs the train costs O(N²) review rounds in the worst case, none of which are responding to an actual code change." A partial cure exists, and it treats the wrong half of the problem: the merge gate has computed a content fingerprint for exactly this case since [#705](https://github.com/nathanjohnpayne/mergepath/issues/705), and the retrospective records it working on `#793` in this same batch. What it carries across a content-equivalent head is an existing *approval*. Nothing in the trigger path consults it before requesting another *review*, so the head-churn still buys rounds even where the verdict is reused. So some real but unquantified fraction of the "41 review rounds" were the system reviewing its own head-churn.

## The correction, and its honest limits

The obvious response to an escape is more review. The batch itself argues against it: it had review to spare, and more passes were not converging—across the 38 Codex reviews that returned findings, in chronological order, the first nineteen averaged 2.53 findings and the last nineteen 3.58. (Three further rounds came back clean and are excluded, so this is a review-object trend rather than the 41-round denominator used elsewhere.) Findings per pass never decayed, because fixing generates new findable surface. Adding passes buys more of the axis already covered.

The fix that generalizes is to change where at least one reviewer's question set comes from. The retrospective proposes it as a constraint: "at least one pass must derive its test matrix from the external specification rather than from prior findings." I will not claim that constraint would have caught [#809](https://github.com/nathanjohnpayne/mergepath/issues/809)—the record cannot prove which cases any given spec-derived reviewer would have selected. What the record shows is stronger than a counterfactual: spec-derived passes ran twice in this batch, and both times they caught what author-derived questions had missed—the fnmatch expansion, and on [#791](https://github.com/nathanjohnpayne/mergepath/pull/791) a blocking review that named the CommonMark rule outright, twelve hours before the same class of defect escaped on #797. The markdown-it-py differential on that PR came afterwards and validated the fix; it is corroboration, not the catch. So the missing rule is not "derive from the spec"; the batch did that. It is narrower: when a batch contains two implementations of the same external spec, the spec-derived matrix has to be applied to both. A spec-derived brief is the one brief in the system not scoped to anybody's diff—its questions exist before the code does and apply to every implementation of the spec—which is exactly what lets it cross the boundary every other lane stopped at. The [#810 fix](https://github.com/nathanjohnpayne/mergepath/pull/810) is, in effect, `mp_markdown_renderable_text` finally getting the test its sibling had already received. A pass cap, a round budget, or an approval count would have caught nothing here, because all of those were satisfied while the defect shipped.

This correction is partial. It works where a spec exists—CommonMark, `File::FNM_PATHNAME`, an RFC, a documented API. Much of mergepath is not that: policy prose interpreted by non-deterministic readers. [#813](https://github.com/nathanjohnpayne/mergepath/issues/813), the epic now trying to bound this loop, names that as the deep problem rather than pretending to solve it: "Adding prose to clarify a prose rule does not converge, because each clarification is new surface to misread. This property is real and is bounded only by how much of the spec becomes executable. No item below eliminates it; the items shrink its domain. Any plan that claims to remove it is wrong." A blog post claiming otherwise would be wrong too. Spec-derived review shrinks the failure's domain; it cannot eliminate it, and deciding which prose is worth making executable stays a human call the record cannot make for you.

One more datum points the same way, and its provenance needs stating plainly, because the review it describes left no GitHub artifact. [#813](https://github.com/nathanjohnpayne/mergepath/issues/813)'s body and its triage comment both record, in my words written the same day, that two production bots read the epic's text—"91k characters," as recorded at the time—and produced zero findings, while three independent adversarial reviewers had produced 38 defects, six fatal, on the same text roughly an hour before the issue existed. The zero is verifiable: CodeRabbit's response is a scope acknowledgement (its first response was a rate-limit notice), Codex's an implementation summary; neither raises a defect. The 38 is not: that review happened off GitHub, and its counts, briefs, and reviewer identities are not recoverable. Neither is the denominator—the issue body has since been restructured to 28,636 characters and its long detail comments replaced by supersession stubs; the closest reproducible proxy is the epic plus its six child issues, 100,934 characters as of 2026-08-26. Different tools, different tasks, different briefs: a data point, not a comparison. But the direction rhymes with everything else here—the output gap tracked the brief, not the horsepower.

Which leaves the question I cannot answer, and the reason [#813](https://github.com/nathanjohnpayne/mergepath/issues/813) is an epic and not a patch. The repo is about to put a budget on review, because unbounded review does not terminate on its own. But a budget needs a unit, and every unit on the table—passes, rounds, findings, approvals—is counted per PR, and this batch just showed that the defect that ships can be the one whose evidence sits on the neighboring PR, where no per-PR count can see it. Passes are not fungible: sixteen of them ran deep inside one diff while the sentence naming the rule they all missed sat in a sibling PR's review record, already acted on. I know how to count passes. I do not yet know how to count what a pass should have carried in with it.
