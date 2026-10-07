---
title: "A Perfect Score on the Wrong Axis: 116 Review Findings, Zero Rejected, One Escape"
seoTitle: "A Perfect Score on the Wrong Axis"
shortTitle: "Perfect Score, Wrong Axis"
description: "An eleven-PR review batch recorded 122 dispositions and zero findings rejected as factually wrong. The finding for the P1 that shipped was deferred to follow-up 75 seconds after it was posted. The rule the defect turned on had been raised on a sibling PR twelve hours earlier; the implementation was then fixed and validated."
seoDescription: "An AI review batch recorded 122 finding dispositions with zero findings rejected as factually wrong and still shipped a P1. The reviews were scoped to one diff. The second implementation still broke a rule already corrected on its sibling."
category: "Agent Systems"
author: "Nathan Payne"
date: 2026-07-30
tags: ["AI", "Engineering", "Systems", "Code Review", "Debugging"]
image: "/og/blog/perfect-score-wrong-axis.png"
keyTakeaways:
  - "A perfect disposition record measures closure: how completely findings were closed. It doesn't measure coverage: the defects nobody raised."
  - "This batch recorded 122 dispositions and zero findings rejected as factually wrong. The finding for the escaped P1 received a deferred disposition 75 seconds after it was posted. The rule it broke had been derived from the spec and named in a blocking external review on a sibling PR twelve hours earlier. The implementation was then fixed and validated."
  - "Where a component implements an external specification, derive at least one review pass from the spec. When two implementations use the same external spec, I need the spec-derived review questions applied to both. A review scoped to one diff doesn't require it to carry what its sibling learned."
  - "Per-PR counts of passes, rounds and approvals miss evidence held on another PR. Eighteen passes preceded this escape while the relevant rule sat next door, already stated, fixed and validated."
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
---

Resolving every finding doesn't mean I've found every bug. This batch made the difference harder to ignore: the rule the escaped defect broke had already been raised, fixed and validated on a sibling PR. The knowledge was there. The second implementation still broke the rule.

On July 30, 2026, at 03:59:00 UTC, [PR #797](https://github.com/nathanjohnpayne/mergepath/pull/797) merged into [mergepath](https://github.com/nathanjohnpayne/mergepath). It was the last backlog PR to merge after about twenty-four hours of continuous automated review. Every required check was green, all but one finding had a recorded disposition, and the external reviewer had approved the exact head.

At 04:00:34 UTC—ninety-four seconds later—CodeRabbit posted [one more finding](https://github.com/nathanjohnpayne/mergepath/pull/797#discussion_r3679855498): "Indented list/paragraph lines are blanked as code, and no test would catch it."

The finding became [issue #809](https://github.com/nathanjohnpayne/mergepath/issues/809), a post-merge hotfix. Bugs ship; what interested me was the review record. Across the batch and its hotfix, 134 top-level finding threads had been raised, 116 severity-badged. Of the 122 with a recorded disposition—addressed, deferred or rebutted—not one was rejected as factually wrong. That looked like a perfect review record. It measured closure, while I needed to know about coverage. The metric measured the wrong axis. Twelve hours earlier, a blocking finding on a sibling PR had named the exact CommonMark rule this defect broke. The rule was fixed and validated there. This one shipped with the same defect.

This is the third post in a four-month arc, and a reversal. In [Six PRs, One Bug](/blog/six-prs-one-bug-agent-failure-modes/) (April), an agent made competent local changes across six pull requests—three aimed at the same bug—while the correctness standard stayed in a design spec nobody had attached to the work under review. In [Agent Approval Workflow](/blog/agent-approval-workflow-genesis-of-mergepath/) two weeks later, I built multi-identity review, external-review thresholds and merge gates agents couldn't talk their way past. Here that infrastructure ran at full power and produced the cleanest disposition record of any batch I've measured. The bug still shipped. The same problem had moved up a level: the review process missed a requirement already established inside the system.

## The defect that got out

[PR #797](https://github.com/nathanjohnpayne/mergepath/pull/797) added a CI check to stop canonical docs linking to hub-only docs through repo-relative paths. Its Markdown preprocessor, `mp_markdown_renderable_text`, blanked code so the scanner would see only rendered prose. It treated every tab- or four-space-indented line as a code block.

CommonMark doesn't allow indented code to interrupt an open paragraph or list item. A four-space-indented line in a nested bullet is list content. A bullet like `- See [the audit](coderabbit-audit.md)`, linking to the real hub-only [`docs/agents/coderabbit-audit.md`](https://github.com/nathanjohnpayne/mergepath/blob/main/docs/agents/coderabbit-audit.md), was blanked before the scan ran. The check missed exactly the links it was meant to catch. Its tests, in the finding's words, "only exercises fenced and inline code, so nothing fails today."

[PR #797](https://github.com/nathanjohnpayne/mergepath/pull/797) had plenty of review: 27 severity-badged findings across eight rounds from the Codex GitHub App, OpenAI's reviewer that tags findings P0 through P3; five submissions from CodeRabbit, the advisory reviewer, three before merge and two of those substantial; and five substantive Phase 4b reviews. Phase 4b is this repo's merge-gating review by an agent other than the authoring agent. Four approvals were dismissed by later pushes before the fifth held. Twenty commits. All findings had dispositions except one CodeRabbit thread without a marker. Eighteen passes preceded the escape: sixteen review objects and two CodeRabbit invocations that finished before merge without findings, counted as clean verdicts under the rule below.

Between 03:52:56 and 03:53:18 UTC, six minutes before merge, five bare triggers appeared: `@coderabbitai, try again.` They posted as my agent's reviewer identity, `nathanpayne-claude`, which `coderabbit-wait.sh` also uses for automated retries. The record doesn't separate the session's requests from the script's. CodeRabbit replied that it was re-running "with focus on correctness, security, regressions, and credential exposure." That was the service's language; nobody had supplied a focus list. It also said it "does not re-review already reviewed commits." Two invocations finished with no findings. Three acknowledged the request without visible review content. A pre-merge start for the pass that found the defect is plausible: an earlier review trailed its acknowledgment by almost nine minutes. It isn't proven. The finding did post 94 seconds after merge, on the tree that merged. Its context from the three earlier CodeRabbit reviews is unknown. The request gave it no brief at all, including no session finding list.

![The escape, posted at 04:00:34 UTC—94 seconds after PR #797 merged. Eighteen review passes preceded it on this PR. This one read the preprocessor against CommonMark's block rules.](/blog/perfect-score-wrong-axis/img/coderabbit-escape-finding-797.png)

I filed [#809](https://github.com/nathanjohnpayne/mergepath/issues/809) one minute later. [PR #810](https://github.com/nathanjohnpayne/mergepath/pull/810) added explicit CommonMark text-flow state tracking and merged at 04:28:05 UTC, twenty-eight minutes after the finding. It added eight regression assertions: three rendered-prose forms and five code-boundary controls. The ownership suite passed at 93/93. CodeRabbit called the defect "Functional Correctness / Major"; the fix's approval called it "the P1 from [#797](https://github.com/nathanjohnpayne/mergepath/pull/797)." Same defect, two vocabularies.

## The rule was already in the batch

[PR #791](https://github.com/nathanjohnpayne/mergepath/pull/791) merged three hours and seventeen minutes before #797, in the same batch. Its title was "fix(781): marker-bounded help extraction and CommonMark-correct fence and indent parsing." Five Codex findings came from CommonMark's block rules. A Phase 4b `CHANGES_REQUESTED` included this P1: "`para` is set for every emitted nonblank line, but CommonMark's 'indented code cannot interrupt' rule only applies to paragraphs." That landed twelve hours and thirteen minutes before #797 merged. The approval then recorded "direct markdown-it-py 4.2.0 agreement on 18 adversarial fixtures": the session had checked the fix against a CommonMark reference implementation before #797 merged. Both PRs changed `tests/test_check_sync_manifest.sh`, the file named in the P1.

The rule the escape turned on had been stated verbatim in a blocking review twelve hours earlier—on a sibling PR that touched a file this one also touched. The session had derived the rules, been blocked on them, fixed them and validated the fix for one Markdown preprocessor. It shipped a second preprocessor with the same defect. Each review lane was scoped to one PR's diff. None was responsible for carrying what #791 had established into #797. This was a transfer failure.

<span id="the-scoreboard-re-derived"></span>

## What the batch recorded

The backlog was comically self-referential. Its nine issues—`761`, `774`, `777`, `780`, `781`, `782`, `785`, `786`, `788` in mergepath—mostly concerned mergepath's own review machinery. Branch protection had [drifted to decoration on most of the fleet](https://github.com/nathanjohnpayne/mergepath/issues/774). A fixture [wrote a fake git identity into the real repo's `.git/config`](https://github.com/nathanjohnpayne/mergepath/issues/777). A [drift guard skipped quoted entries](https://github.com/nathanjohnpayne/mergepath/issues/785). Three of the nine were post-review observations from the previous day's PRs; one concerned the backlog from the previous backlog batch.

Nine PRs, [#789](https://github.com/nathanjohnpayne/mergepath/pull/789) through [#797](https://github.com/nathanjohnpayne/mergepath/pull/797), opened within thirty-six seconds. [#800](https://github.com/nathanjohnpayne/mergepath/pull/800) followed. They were authored in a Claude session and pushed under my author identity, so the API lists me as author of all eleven. The review lanes were meant to ask different questions. Codex gets the diff; CodeRabbit reads the same diff as a second opinion; automated Phase 4b runs an external merge-gating review under a different agent identity. New for this batch, the session also ran adversarial verifier agents to repeat each PR's "is this test actually testing anything" experiment before approval. That last part is an author record inside the session, with no GitHub trace. All lanes shared one limit: a single PR's diff.

Twice, the batch's agent-written summaries failed to hold up against the record. I counted the raw GitHub API objects for the figures below, keeping each denominator explicit.

The population is eleven PRs: `#789`–`#797`, `#800`, and the hotfix `#810`. I retrieved every count on 2026-08-26 with `gh api --paginate` over `pulls/<N>/comments`, `pulls/<N>/reviews`, and `issues/<N>/comments`. A top-level thread has no `in_reply_to_id`. A severity badge matches `\bP([0-3])\b` in the body; reading the first 400 characters or the full body gives the same split. A disposition is a `[mergepath-resolve: <class>]` reply marker attributed to its thread root. The bots are `chatgpt-codex-connector[bot]` and `coderabbitai[bot]`. Rounds exclude empty-bodied wrappers and include comment-only clean verdicts, using the same rule for all three providers.

| Unit | Rule | Count |
|---|---|---|
| Inline review comments | all pages, all eleven PRs | 268 |
| Top-level finding threads | no `in_reply_to_id` | 134 |
| Severity-badged findings | Codex App threads with a P badge | 116 (12 P1, 102 P2, 2 P3) |
| Actionable CodeRabbit threads | reconciles with its own "Actionable comments posted" headers | 18 |
| `@codex review` triggers | body is exactly that string | 48 |
| Codex rounds | 38 review objects + 3 comment-only clean verdicts | 41 |
| CodeRabbit review objects | 10 are empty wrappers | 26 (16 substantive) |
| CodeRabbit rounds | 16 substantive objects + 4 comment-only clean verdicts | 20 |
| Phase 4b merge-gating reviews | non-empty reviews citing Phase 4b | 26 (16 by the automated adapter) |
| Recorded dispositions | `[mergepath-resolve:]` markers | 122 |

The 134 threads break down by PR as follows: `#789` 5, `#790` 13, `#791` 8, `#792` 0, `#793` 0, `#794` 12, `#795` 38, `#796` 22, `#797` 29, `#800` 5, `#810` 2.

![The counting pass behind this section. The population, endpoints, and extraction rules are published as text above, so every count is reproducible without the screenshot.](/blog/perfect-score-wrong-axis/img/raw-count-query.png)

These are the dispositions across all 134 threads. I've labeled `addressed-elsewhere` as "addressed" because all 111 replies name a fix commit.

| Disposition | Threads |
|---|---|
| Addressed (marker names the fix commit) | 111 |
| Deferred (5 to a filed follow-up issue, 4 logged with none filed) | 9 |
| Rebuttal recorded | 2 |
| No marker | 12 |

The four deferrals without an issue were all on [PR #795](https://github.com/nathanjohnpayne/mergepath/pull/795). Each said "no issue is opened because the task explicitly forbids issue creation." Both rebuttals were on [PR #796](https://github.com/nathanjohnpayne/mergepath/pull/796), declining CodeRabbit suggestions concerning a generated mirror whose header says `do_not_edit: true`. Those were process objections, not disputes over facts. None of the 122 recorded dispositions rejected a finding as incorrect. The 12 unmarked threads qualify that record: 8 CodeRabbit threads without markers, and 4 Codex findings posted on [PR #790](https://github.com/nathanjohnpayne/mergepath/pull/790) nine minutes after merge.

The escaped defect is in that scoreboard. Thread `3679855498` is one of the 134 threads, one of the 18 from CodeRabbit, and one of the 122 with a recorded disposition. It was marked `deferred-to-followup`, naming [#809](https://github.com/nathanjohnpayne/mergepath/issues/809), seventy-five seconds after posting. The metric absorbed the bug that beat it by recording what happened to the finding.

Zero rejections could mean the findings were soft and cheap to accept. These weren't. Several caught tests that modeled what I've come to call an impossible world.

## Fixtures that modeled an impossible world

Six appear in the commits or PR bodies that fixed them. That's an author's list, not a census. Three are worth spelling out:

**A `gh` stub put error bodies on the wrong stream.** A failed metadata-read stub wrote the HTTP error body to stderr. Real `gh api --jq` writes it to stdout, verified live in [commit 53ae3c1](https://github.com/nathanjohnpayne/mergepath/pull/796/commits/53ae3c1ead45ceabced2d3a121df0e7e033835fd). Two pre-existing tests "were green against a failure mode gh does not produce." The swap hid [issue #799](https://github.com/nathanjohnpayne/mergepath/issues/799): fifteen call sites inferred failure from empty output, leaving every guard dead.

**The consumer model removed too much.** The simulation stripped more hub paths than a real consumer lacks. [PR #800](https://github.com/nathanjohnpayne/mergepath/pull/800) explained the cost: "Stripping more than a real consumer lacks makes 'both-absent' skip branches fire in simulation that never fire in reality—so a wrong model produces a *passing* test, not a failing one."

**The scanner's documentation exempted itself.** The identity-hygiene scanner matched an exemption marker anywhere on a line. All three docs describing it spelled out the marker and exempted themselves, "leaving the paragraphs whose job is to record the forbidden shape the only paragraphs never scanned" ([commit 6a2fbe5](https://github.com/nathanjohnpayne/mergepath/pull/795/commits/6a2fbe5ff3)).

The other three had the same problem:

| The encoded belief | The reality | Where it was caught |
|---|---|---|
| A count guard's claim fits on one line | The guarded comments hard-wrap at ~72 columns; one of two surfaces wrapped mid-phrase and was never checked | [#797, commit 42771ef](https://github.com/nathanjohnpayne/mergepath/pull/797/commits/42771ef80f) |
| A source tree can have no hub-only doc entry | A sibling CI check already makes that shape impossible; three fixtures modeled it anyway | [#797, commit 5ac7b2f](https://github.com/nathanjohnpayne/mergepath/pull/797/commits/5ac7b2faa6) |
| A literal-text regex enrolls every wrapper in the residue guard | A wrapper with any other dependency shape produced an empty set and silently skipped enrollment | [#800, commit e53cee9](https://github.com/nathanjohnpayne/mergepath/pull/800/commits/e53cee920c) |

The batch's own verification caught all six. Review caught another on [PR #791](https://github.com/nathanjohnpayne/mergepath/pull/791): "This assertion can never fail." A `$( ... )` capture stripped the trailing newlines the assertion was meant to check. Nobody recorded a disposition for it; it remains among the twelve unmarked threads in a batch that dispositioned 122 of 134. The CommonMark defect that shipped was the same kind of mistake: a scanner encoded the wrong model of an external system. This time, the correct model was already recorded on a sibling PR.

## Why eighteen passes missed what the nineteenth posted

My first diagnosis went into [the batch retrospective](https://github.com/nathanjohnpayne/mergepath/issues/813#issuecomment-5133940688) that day. My agent posted it under its reviewer identity and attributed the analysis to me:

> Same-session verification converged on the implementation's assumptions: the verifier agents were briefed from the authoring agent's finding list using its taxonomy, so they searched the space that session had already mapped. Every round asked the same question.

That explains the in-session verifier lane. My first draft used it to explain the whole batch. But the session had asked the right question on [#791](https://github.com/nathanjohnpayne/mergepath/pull/791). Convergence on the author's assumptions doesn't explain why another implementation touching the same file broke a rule already named in an external reviewer's blocking P1. The eighteen passes before #797's escape went deep into that PR's diff. The in-session verifiers were briefed from its finding list—an author record with no GitHub trace. The nineteenth checked the preprocessor against CommonMark: *does CommonMark let indented code interrupt a list item?* #791's record had already answered.

```mermaid title="Closure inside the session, and the rule missed next door" description="The authoring session dispositions the threads raised before the merge, leaving a handful unmarked, and PR 797 merges clean; the escaped defect is posted afterward and itself dispositioned, and only then does the record close at 134 threads and 122 dispositions, the escape among them; a spec-derived pass on sibling PR 791 had named the same CommonMark rule twelve hours earlier, but the second implementation still broke it; an unbriefed CodeRabbit re-run posts the escape 94 seconds after the merge."
graph TD
    A["Authoring session"] --> B["Findings raised on the batch<br/>as each PR is reviewed"]
    B --> C["Fix verification briefed<br/>from the finding list<br/>(author record)"]
    C --> D["Threads dispositioned as raised;<br/>none rejected"]
    D --> E["#797 merges clean;<br/>the defect ships"]
    S["CommonMark spec"] --> F["Spec-derived pass on #791:<br/>P1 names the same rule,<br/>12 hours earlier"]
    F -->|"brief scoped to one diff"| X["#797 still breaks<br/>the same rule"]
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
```

A perfect disposition record measures how completely you closed the findings raised. It says nothing about the defects nobody raised. The batch had rigor in closing findings, against questions scoped to one PR. Its metric couldn't represent a rule missed between PRs, so it stayed perfect when the bug shipped. Closure and coverage are different axes.

## The natural experiment: where the matrix comes from

The batch also contained a smaller example of where the review questions came from. It's a natural experiment, not a controlled one.

[PR #796](https://github.com/nathanjohnpayne/mergepath/pull/796) reimplemented GitHub's branch-protection ref matching in Bash. GitHub documents it as Ruby's `File.fnmatch` with `File::FNM_PATHNAME`. The author wrote a differential test: extract the matcher verbatim, run each pattern/ref pair through real Ruby, and assert agreement. All 168 author-written pairs passed.

The Phase 4b reviewer extended the matrix from the spec's behavior. [Its review](https://github.com/nathanjohnpayne/mergepath/pull/796#pullrequestreview-4814414033) says: "I found the trailing-slash fnmatch mismatch, added adversarial matrix coverage first (66 passed / 1 failed with 14 Ruby-vs-Bash mismatches), then applied the two empty-component preservation lines." Four lines were responsible: `IFS='/' read -r -a` drops a trailing empty field, collapsing `release/*/` into `release/*` and accepting matches Ruby denies. The [fix](https://github.com/nathanjohnpayne/mergepath/pull/796/commits/016336a360054a626e8ac8f6212b8ce4fa81917d) was two `case` statements to append the empty component, with a comment naming the rule. The merged matrix had 255 pairs, seventeen patterns by fifteen refs, including a POSIX character class absent from the author's cases.

The author-derived matrix passed a broken matcher; the spec-derived expansion failed it within one round. Both used the same harness, reference implementation and technique competently. The agents, prompts and context differed, and nothing was randomized, so matrix provenance wasn't isolated as the only variable. It did expose the same problem as [#809](https://github.com/nathanjohnpayne/mergepath/issues/809): cases derived alongside the implementation shared its assumptions. The implementation didn't model a trailing slash in a ref. Neither did the matrix.

The retrospective had credited this work with "1041 pattern/ref pairs." I went looking for the 1041. It doesn't exist. There were 168 pairs initially, 224 when the mismatch was found, and 255 at merge. The only "1041" in the PR record is a line number in CodeRabbit's `sed -n '1041,1560p'` command, inside one of its analysis comments. The retrospective comment diagnosing unexamined assumptions carried an unverified number. I'm leaving that mistake visible: the sentence describing the problem had done the same thing.

![The diagnosis and the unverified number, two paragraphs apart in the same retrospective comment: the passage block-quoted earlier in this post, and a credit of 1041 pattern/ref pairs to the fnmatch work—a number that appears nowhere in the record.](/blog/perfect-score-wrong-axis/img/retrospective-1041-claim.png)

<span id="a-footnote-on-volume"></span>

## Why the batch generated so much review

At the time, branch protection set `required_status_checks.strict: true`. Every merge forced the other open PRs to update from `main`, and `gh pr update-branch` minted a new head even with no file changes. I originally wrote that the workflow automatically requested a review on each new head. The record corrected that fifty minutes after the retrospective: no workflow invokes the review-request script. Only CodeRabbit's rate-limit failover automatically posts `@codex review`.

The concurrent batch throttled CodeRabbit: seven of eleven PRs got a `rate limited by coderabbit.ai` notice, six within twenty-two seconds of opening. Throttling triggered the failover. The batch created its own review volume. What linked the PRs was review capacity, not merge order. CodeRabbit still posted 26 review objects across eight of the eleven PRs and all 18 actionable CodeRabbit threads in the scoreboard.

![A Fair Usage notice from an agent-driven repo. The batch's notices state a wait, not an allowance: "Next review available in: 59 minutes" on one PR, 25 minutes on another—and, just after the batch, a note that this repo's review activity is in the 95th percentile or higher among CodeRabbit users, so adaptive limits apply.](/blog/perfect-score-wrong-axis/img/coderabbit-review-limit-reached.png)

[PR #794](https://github.com/nathanjohnpayne/mergepath/pull/794) had four `@codex review` triggers under the author identity. The API doesn't distinguish the agent from failover requests through the same wrapper. One round found a P1 and two P2s on a head created thirty-three seconds earlier by a content-free branch update. [Issue #798](https://github.com/nathanjohnpayne/mergepath/issues/798) described it: "With N open PRs the train costs O(N²) review rounds in the worst case, none of which are responding to an actual code change." The merge gate already computed a content fingerprint, since [#705](https://github.com/nathanjohnpayne/mergepath/issues/705); the retrospective recorded it working on `#793` in this batch. It reuses an approval across equivalent heads. The trigger path doesn't consult it before requesting another review. Some real but unquantified fraction of the "41 review rounds" therefore reviewed head changes with no content change.

<span id="the-correction-and-its-honest-limits"></span>

## What I'd change

More passes hadn't made findings taper off. Of the 38 Codex reviews with findings, in time order, the first nineteen averaged 2.53 and the last nineteen 3.58. Three clean rounds are excluded here, so this trend uses review objects, not the 41-round denominator. Fixes created more code to find defects in. Adding passes kept buying review within the same scope.

I need at least one reviewer's questions to come from outside the implementation. The retrospective proposed "at least one pass must derive its test matrix from the external specification rather than from prior findings." That doesn't prove a particular spec-derived reviewer would have selected the case behind [#809](https://github.com/nathanjohnpayne/mergepath/issues/809). But two spec-derived passes in this batch caught what the author's cases missed: the fnmatch expansion and [#791](https://github.com/nathanjohnpayne/mergepath/pull/791)'s blocking CommonMark finding, twelve hours before the defect escaped on #797. The markdown-it-py differential came afterward to validate the fix. It corroborated the catch; it didn't make it. The batch had already derived questions from the spec. The missing step was applying them to both implementations. Those questions exist before either diff, so they can cross a boundary the other review lanes stopped at. The [#810 fix](https://github.com/nathanjohnpayne/mergepath/pull/810) finally gave `mp_markdown_renderable_text` the test its sibling had received. Pass caps, round budgets and approval counts were all satisfied when the defect shipped.

That helps where an external spec exists: CommonMark, `File::FNM_PATHNAME`, an RFC or a documented API. Much of mergepath is prose policy interpreted by non-deterministic readers. [#813](https://github.com/nathanjohnpayne/mergepath/issues/813), the epic trying to bound this loop, states the limit: "Adding prose to clarify a prose rule does not converge, because each clarification is new surface to misread. This property is real and is bounded only by how much of the spec becomes executable. No item below eliminates it; the items shrink its domain. Any plan that claims to remove it is wrong." A post claiming otherwise would be wrong too. Spec-derived review narrows the problem. Choosing which prose is worth making executable is still a human decision.

[#813](https://github.com/nathanjohnpayne/mergepath/issues/813) records another example in its body and triage comment, in my words written that day. Two production bots read the epic's "91k characters," as recorded then, and returned zero findings. Three independent adversarial reviewers had reportedly found 38 defects, six fatal, on the same text roughly an hour before the issue existed. The zero is checkable: after a rate-limit notice, CodeRabbit acknowledged scope, and Codex returned an implementation summary. Neither raised a defect. The adversarial review happened off GitHub; its counts, briefs and identities aren't recoverable. The denominator isn't either. By 2026-08-26, the issue body was 28,636 characters and its long detail comments were supersession stubs. The nearest reproducible proxy, the epic and six child issues, was 100,934 characters that date. Different tools, tasks and briefs make this a data point, not a comparison. It points in the same direction: the output gap tracked the brief, not the horsepower.

## Since the batch

On 2026-10-01, the repo put a budget on review. It chose a per-PR unit. On 2026-10-05, it turned off strict branch protection, removing the update requirement described above.

I still don't know the right unit for a review budget. That is why [#813](https://github.com/nathanjohnpayne/mergepath/issues/813) is an epic, not a patch. Unbounded review doesn't terminate on its own, but passes, rounds, findings and approvals are all counted per PR. The evidence for the escaped defect sat on a neighboring PR. Eighteen passes went deep into one diff while the sentence naming its broken rule sat next door, already fixed and validated. I know how to count passes. I do not yet know how to count what a pass should have carried in with it.
