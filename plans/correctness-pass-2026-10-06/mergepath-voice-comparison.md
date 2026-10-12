# Mergepath voice rewrite: approval packet

Prepared 2026-10-12 against origin/main `467d26110ae1b3850f03b88296300b4f23262909`. Proposed source: `src/content/projects/mergepath.mdx`. Factual authority: that complete source and `mergepath-ledger.md`; its record ends 2026-10-06. The owner's designated style example guides voice; it is owner-selected model prose, not a newly retrieved user-authored corpus. No private writing was retrieved or cached.

## Approval summary

I made the narrator the person running the agents and paying for the decisions. Long institutional paragraphs now describe the concrete problem, what I chose, its cost, and what happened. The five decision records, four constraints, one learning, seven body headings, diagrams, figures, links, status values, and component placements remain. All decision titles and body headings keep their anchors.

The card still claimed agents could recite the rule even though the existing ledger marked the recitation unprovable. I corrected that last surface and repaired R16 in the ledger summary and detailed row. The full dated finding about eight of ten repositories enforcing zero of five checks stays in the body. I explicitly date the page's snapshot and distinguish the Pacific/UTC dates in the admin-enforcement learning.

The canonical résumé's Mergepath claim still holds and the site entry matches it verbatim. Only its case-study hash and review date change.

## Metadata proposed for approval

| Surface | Characters | Proposed copy |
|---|---:|---|
| description | 192 | Claude Code, Codex, and Cursor could produce changes faster than I could responsibly review them. I built Mergepath to put review identities, merge gates, and shared rules in the repositories. |
| cardDescription | 155 | Written rules didn't stop agents pushing to main. I moved review into gates that could refuse, then found most repositories weren't requiring their checks. |
| seoDescription | 160 | I built Mergepath to govern AI coding agents across repositories, with separate review accounts, merge gates, shared rules, and the failures kept on the record. |
| ogDescription | 154 | I built Mergepath because agents produced changes faster than I could review them. Separate review accounts, merge gates, and shared rules carry the work. |

The card appears on both the homepage and project index. The hero supplies the visible detail-page deck. The search snippet supplies the HTML meta description and JSON-LD; its existing exact expected-string assertion changes with the proposed wording, without changing the assertion. The new explicit OG description prevents the longer hero from exceeding the social-card cap. Title and slug remain Mergepath / mergepath.

## Complete proposed page

# Mergepath

Claude Code, Codex, and Cursor could produce changes faster than I could responsibly review them. I built Mergepath to put review identities, merge gates, and shared rules in the repositories.

**Status:** SHIPPED

**Format:** Repository standard

**Focus:** Agent governance, code review, and CI enforcement

**Stack:** Bash · Python · GitHub Actions · 1Password · Claude Code · Codex · Cursor · CodeRabbit

**Kicker:** AI × Infrastructure × Tooling

**Tags:** Infrastructure · AI Tooling · GitHub Actions · Bash

[View Demo](https://htmlpreview.github.io/?https://raw.githubusercontent.com/nathanjohnpayne/mergepath/main/mergepath/playground/index.html) · [GitHub](https://github.com/nathanjohnpayne/mergepath)

**Hero image:** ![Mergepath policy playground](/images/projects/mergepath.png)

## The operator was the review process

I was running Claude Code, Codex, and Cursor across a growing fleet of repositories. I had one rule I needed them to follow: every change goes through a pull request. I put it in the instruction files they read. An agent would still push straight to `main`, usually for a change small enough not to feel like it counted.

Then I became the review process. I read diffs after the fact, relayed feedback between sessions, and vetted output nobody had inspected. The agents produced more; my confidence did not keep up. That gap is the product problem.

I told the origin story in [Agent Approval Workflow and the Genesis of Mergepath](/blog/agent-approval-workflow-genesis-of-mergepath/). This page covers the decisions I made after the problem had a name, and what each has cost. The record here runs through 2026-10-06; the dated outcomes below belong to that snapshot.

## The authorities are deliberately separate

I split the work into six roles. As the **operator**, I own every repository, handle the settings automation cannot reach, and receive escalations. An **authoring agent** writes a change and opens its pull request under one shared **author identity**. What lands carries that name rather than the agent's.

Two gates stand between the pull request and its merge. The **reviewer agent** behind the second gate has its own account, so approving and authoring cannot be the same hand. The **CI service account** runs checks and may never hold an approval. GitHub counts an approval from any account with write access; it cannot tell a robot from a person.

I also serve as the **human tiebreaker**. That is a narrower job than operating the fleet. A finding re-flagged after a rebuttal, or a round budget spent on findings that keep blocking, escalates automatically. Nobody has to decide whether the disagreement is worth raising. The diagram preserves the roles as they stood on its caption date; the later round-budget changes are in the decision below.

```mermaid title="Who may author, approve, merge and escalate" description="An authoring agent opens a pull request under one shared human identity, so what lands carries a single name. Two machine gates stand between that pull request and the merge: branch rules with CI, which fail closed only where a repository actually lists them as required, and a reviewer agent on its own account that can approve but never merge. The CI service account runs those checks and may never hold an approval at all. A finding re-flagged after a rebuttal, or a round counter past its budget, routes to the human tiebreaker rather than back into the automation. Only the author identity merges." caption="Roles as of 2026-08-28, the date the check inventory below is counted at."
flowchart TD
    AG["Authoring agent"]
    PR["Pull request<br/>one shared identity"]
    BOT["CI service account<br/>never approves"]
    GATE["Branch rules + CI<br/>fails closed where required"]
    RV["Reviewer agent<br/>own account<br/>never merges"]
    HT["Human tiebreaker"]
    MERGE["Merge<br/>author identity"]

    AG --> PR
    PR --> GATE
    BOT -.->|runs| GATE
    GATE --> RV
    RV -->|clears| MERGE
    RV -->|no convergence| HT
    HT -->|adjudicates| MERGE

    style AG fill:#fffdf8,stroke:#11100d,stroke-width:1.5px,color:#11100d
    style PR fill:#fffdf8,stroke:#11100d,stroke-width:1.5px,color:#11100d
    style BOT fill:#dde1e5,stroke:#11100d,stroke-width:1.5px,color:#11100d
    style GATE fill:#e3d477,stroke:#11100d,stroke-width:1.5px,color:#11100d
    style RV fill:#e3d477,stroke:#11100d,stroke-width:1.5px,color:#11100d
    style HT fill:#e8784a,stroke:#11100d,stroke-width:1.5px,color:#11100d
    style MERGE fill:#11100d,stroke:#11100d,stroke-width:1.5px,color:#fffdf8
```

## The decisions

I could describe Mergepath by counting checks: seven fail-closed CI checks in April 2026, twenty-seven by mid-May, seventy-two as of 2026-08-28, with seventy-one wired into the lint workflow across eighty invocations. That inventory says little about judgment. Most of those mechanisms exist because something failed while the fleet was live.

One principle runs through most of them: clearance belongs to the exact commit reviewed. A push that changes the content voids it. These are five decisions I could reasonably have made differently.

### Enforce at boundaries that can refuse

Enforcement · mixed

**What I encountered**

I put the no-direct-push rule in the instruction files the agents read. They followed it when it was convenient and skipped it when it wasn't. Every lapse landed on me.

**Over**

I could have written the rule more forcefully, in more files, more often. That was free and an obvious first move. I had already given it every chance to work.

**What I decided**

I moved enforcement into places that could refuse: a server-side branch rule that stops a push, a local hook that refuses a malformed pull request before the API call, and CI that fails closed. I documented what each layer binds, including where it offers no coverage.

**Why**

A written rule has to be remembered when following it is least convenient. A refusal does not. I found agents, like people, more reliable when a mechanism enforced the rule.

**Cost**

A one-line fix still needs a pull request, self-review, an identity switch, review, and gates. I pay the same overhead for it as for a rewrite. A gate can refuse a formality as readily as a real defect.

**What it changed**

Four months later, a pull request was refused because its body put the required header in bold. The local and CI layers held. The fleet's own audit found the larger hole: most consumers weren't requiring the checks that ran on them. The server layer, which could bind everyone, was largely unconfigured.

### Make independence an account, not a prompt

Independence · mixed

**What I encountered**

Asking an agent to review its own work in the same conversation kept running into the same blind spots. An assumption that had felt right while writing the code still felt right while reviewing it.

**Over**

I could have kept a review checklist in the same session. That would have saved three GitHub accounts and their credential plumbing. Even crude same-chat review finds real bugs.

**What I decided**

I gave every agent one shared human author identity and its own machine reviewer account. No pull request can be approved by the account that authored it, and every review has a byline I can audit.

**Why**

Across three agent platforms, I kept seeing the separate reviewer identity find things the authoring session had missed. Separate accounts made the identity rule mechanical. It no longer depended on an agent remembering to switch roles.

**Cost**

I now had one GitHub account per agent, each with a token, signing key, and credential plumbing. The plumbing broke. In August 2026, a 1Password item repurposed from one identity to another silently sent three agent reviews out under the CI robot's byline on this site's repository, `nathanpaynedotcom#668`.

**What it changed**

That is repeated observation across three platforms. I have no comparison arm or defect ledger, and I cannot explain the mechanism. The byline failure did lead to a concrete change: a per-repo deny-list of accounts that may never hold an approval.

### Mirror byte-for-byte, and declare every divergence

Propagation · mixed

**What I encountered**

I had one standard and seven consumer repositories. Each repo's copy could drift until a weekly audit caught it. One operating-rules file had already become nine mutually incompatible copies across the fleet.

**Over**

I could have maintained each copy by hand, or shipped a shared dependency for consumers to install. A package would version cleanly. It would also let a consumer pin an old version and quietly stop receiving the standard.

**What I decided**

I gave propagation three declared modes: canonical paths mirrored byte-for-byte (137 as of 2026-08-28), kit directories that require the template files but allow local additions (five), and templated paths rendered from each consumer's declared facts (two). Any intentional divergence belongs in that repo's registry, with a written reason.

**Why**

A standard that seven repositories apply differently is seven standards. One canonical copy made drift a diff I could review. A registry gave intentional divergence a name and a reason.

**Cost**

The mechanism I built to stop drift caused it. On 2026-08-28, a propagation wave copied the hub's weaker pull-request gate over the stronger one this site's repository had built. Only a consumer test kept outside the mirror caught the loss. The hub could not see the consumer's own hardening.

**What it changed**

`mergepath#1132` was opened and fixed the same UTC day. Getting consistent copies was easier than making room for intentional differences. As of 2026-10-06, all seven consumer registries are empty: six have no override file, and the seventh declares only a schema version. Consistency still rests on nobody having diverged, rather than on a record of the differences.

### Route non-convergence to a person, not to more automation

Convergence · revised

**What I encountered**

I had set the external-review budget at two rounds, assuming a review would converge in a round or so. The automated external leg could post an approval on its own.

**Over**

I could have kept the budget at two, or given a runaway review to the automated external reviewer for a fresh verdict. Changing reviewers was a defensible response to a stuck loop.

**What I decided**

I raised the budget to ten and made Codex the primary reviewer on every pull request. CodeRabbit would review changes the classifier marked complex, plus anything it could not read. Reviews that did not converge would come to me as the human tiebreaker, rather than go to the automated leg.

**Why**

The automated leg can approve. Sending a disagreement there could let a change merge without anyone settling it. Settling that disagreement was my job as the human tiebreaker.

**Cost**

A review could then run to ten rounds before I saw it. The budget rose to twenty on 2026-09-28. Since 2026-10-01, spending it alone no longer summons a person; continuing disagreement does. My read is that a review still running at round ten is evidence that the pull request was too broad. The budget does not say that.

**What it changed**

One pull request drew four review rounds. Rounds two and three each found a real defect introduced by the previous round's fix. Escalating at round three would have stopped a review that was still finding problems. That was why I moved the budget from two to ten.

### Replay the policy before you trust it

Evaluation · pending

**What I encountered**

A review threshold or protected path changes how pull requests are routed. Editing the configuration meant learning its effects one pull request at a time, after the policy was already live.

**Over**

I could have edited the YAML and waited for the next pull request. That works, but I would learn each mistake in production.

**What I decided**

I built a single-file page, shown in the screenshot above, that replays real pull requests against a draft policy. I can see what a threshold or path pattern would route before committing the YAML.

**Why**

A policy file is a product decision wearing configuration syntax. I wanted to see what a rule did to real traffic before shipping it. That instinct came straight from product work.

**Cost**

The page can tell me which pull requests would escalate under a draft policy. It cannot tell me whether the resulting review is any good. It simulates the routing, not the reviewers.

**Validation boundary**

As of 2026-10-06, no shipped policy change traces to a playground run. The documented retunes came from measured review latency and review-round experience. I would need one configuration change made because a replay showed the old routing was wrong before I could claim the playground had changed a decision.

`mergepath#1080` was the pull request that led me to raise the round budget. Four rounds were requested between 06:15 and 07:12, and it merged at 07:53. The diagram shows only the two rounds that returned findings. Each found at least one defect in code the previous round's fix had just introduced.

```mermaid title="The two review rounds that returned findings" description="A change pushed at 06:12 on 2026-08-22 drew four requested review rounds before it merged an hour and a half later. This shows the two that returned findings; the other two returned none on the record and are omitted. The review at 06:46 carried two blocking findings, one of them on the 06:32 fix; the one at 07:04 carried one blocking finding on the original change and a lesser one on the 06:53 fix—so each round found a defect the previous fix had introduced, and a fix followed each before the pull request merged at 07:53."
flowchart TD
    S["change pushed<br/>06:12"]
    R2["review 06:46<br/>3 findings, 2 blocking"]
    R3["review 07:04<br/>3 findings, 1 blocking"]
    M["merged<br/>07:53"]

    S -->|fix 06:32| R2
    R2 -->|fix 06:53| R3
    R3 -->|fix 07:11| M

    style S fill:#fffdf8,stroke:#11100d,stroke-width:1.5px,color:#11100d
    style R2 fill:#e8784a,stroke:#11100d,stroke-width:1.5px,color:#11100d
    style R3 fill:#e8784a,stroke:#11100d,stroke-width:1.5px,color:#11100d
    style M fill:#11100d,stroke:#11100d,stroke-width:1.5px,color:#fffdf8
```

## What the record shows, and what it does not

I can measure adoption. I cannot measure impact. Keeping those separate limits what I can honestly claim.

- **8 repos:** the hub plus seven consumers, as of 2026-10-06
- **609 PRs:** merged on the hub by 2026-10-06, not proof each ran the loop
- **0 forks:** public and forkable since at least 2026-04-16
- **No baseline:** I never timed the manual path, so I cannot claim time saved

The fleet reached eight repositories by shrinking. One consumer was archived and retired from the manifest in August 2026; another went dormant and was dropped in September. In July 2026, it had produced 134 review-finding threads across a 24-hour, eleven-PR record, which I examined in [A Perfect Score on the Wrong Axis](/blog/perfect-score-wrong-axis/).

The sharpest result cut against the hub. Propagation sent files the template's own review had already cleared into two unfamiliar codebases. Seven external-review rounds per pull request kept finding bugs in them. Review found the least where the files were most familiar.

The propagation audit also reports its own state. On 2026-08-28, a read-only run reported the same eighteen manifest paths adrift on all eight consumers then enrolled. That identical set was the clue: every consumer had been synced to the hub's `main` that afternoon. The eighteen paths were the previous evening's merges that my local hub checkout had not pulled. A directory entry such as `scripts/ci/` counts as one path, however many files inside it moved:

```text
$ scripts/sync-to-downstream.sh --audit
nathanpaynedotcom (nathanjohnpayne/nathanpaynedotcom)
  baseline: main@eafa46b
  ✗ .github/workflows/agent-review.yml         drift: 1751 diff line(s)
  ✗ tests/test_approval_merge_continuation.sh  drift: 996 diff line(s)
  ✗ scripts/merge-clearance-gate.sh            drift: 78 diff line(s)
  ✗ scripts/ci/                                drift: 3 file(s) drifted
  … 14 more paths, and the same eighteen on all seven other consumers
```

The audit still gave me a diff I could review, whichever side of the comparison had moved. A bulk sync can close a gap, and several in this repository's history have. This particular snapshot caught my stale checkout.

I have no manual baseline for what the gates save. I never timed the work before adding them, so there is nothing to subtract from. The repository's one savings figure multiplies auto-approved pull requests by a hardcoded thirty-to-180-minute constant nobody measured. The two real measurement systems both measure cost: external-review latency and the latency budget the CI suite has to stay inside.

## The operator gets a console

Until October 2026, I assembled the fleet's picture by hand. I used `gh pr checks` for merge gates, `gh run view` for failing steps, the Phase 4b ledgers for review-agent spend, and the sync audit above for drift. One command at a time, per repository.

Mergepath Cockpit puts that picture on one live page. It is a local server written with the Python standard library and no third-party packages. It shells out to the hub's installed `yq`, `jq`, `gh` and `git`, binds to the loopback address, polls GitHub every fifteen seconds to two minutes, and pushes changes to the page over server-sent events.

The resident server holds only the cached reviewer token; the author token is stripped from its environment. It can watch the fleet and cannot merge into it. Its one write is a fleet sync, which starts as a preview I read and then confirm.

![Mergepath Cockpit on 2026-10-06, captured from the operator's local session during a refinement pass, on live data. The header meters the active reviewer account's remaining API allowance and reports the author account's as unknown rather than guessing; the road ahead places one boulder at now, a Five Across pull request that conflicts with its base branch; and the open-pull-request table reads each row's merge state, required checks, gate labels, remaining review budgets and CodeRabbit status, writing unknown or not observed wherever it has no evidence.](/images/projects/mergepath-cockpit.png)

I held the dashboard to the same discipline as the gates. Every panel starts unavailable. A failed read keeps the last good observation and shows its age. Partial coverage cannot be reported as a clear fleet.

One gap remains in this record. The account billing endpoint returned 404 to the reviewer credential, so Actions spend reads unavailable. I do not know whether the token or the endpoint caused it. The epic opened on 2026-10-02 and closed on 2026-10-04. By this page's snapshot, nobody had run the fleet through the console long enough to say what it changed.

## The premise the fleet did not meet

This is the finding I would want a reader to see. A GitHub job can gate a merge only when branch protection lists it as a required check. Otherwise it can run, go red, and watch the pull request merge anyway.

On 2026-07-28, the fleet's own audit found eight of the ten repositories then enrolled enforcing zero of five canonical checks. Three had no protection on `main` at all. The hub itself enforced two.

The gap subsequently closed. The five checks have been required on every repository the weekly audit could read since at least 2026-08-19. As of this page's snapshot, its one remaining finding was a single consumer's admin bypass under the 2026-09-06 staged decision.

Until that audit, red CI could look like enforcement while acting as advice. I had built a standard around enforcement at boundaries that could refuse, and most of the fleet wasn't requiring its checks.

### Learning 1

**Expected**

I expected closing the administrator escape hatch to harden the fleet. A gate I can walk around as an administrator is a speed bump. The hub's enforcement record already showed merges reaching `main` without the approval the policy required.

**Observed**

With that escape closed on the hub, `mergepath#1121` sat blocked on 2026-08-27 Pacific time. All thirty-six review threads were resolved, feedback accounting was clear, and a cross-agent approval was in place. A rate limit made a gate exit with a usage error instead of a verdict. Its own log read `unresolved: 0`. Nobody had the authority to act on what it said.

**Response**

On 2026-08-28 UTC, I declined that hardening and disabled admin enforcement on the hub. That made the fleet uniform at the time. I judged a deadlock with no recourse worse than an auditable bypass, and the audit stopped reporting the bypass as drift that day. On 2026-09-06, I reversed the consumer half of that decision: admin enforcement became the target for every consumer, earned per repository by a passing canary. As of 2026-10-06, one consumer was staged and had not yet flipped. The hub kept its escape.

## What it bought the other projects

Five of the seven projects on this site are consumers of the standard. A sixth is Mergepath itself. The seventh left the fleet in September 2026 when its repository went dormant.

The standard lets those pages stay mostly about their products. Features shipped mid-sailing on Five Across landed as reviewed pull requests. Override's engine was built a month before the standard existed, and every subsequent change to its product code has run through the fleet's review path. Thirty governance, docs, and sync commits went straight to its `main`, the last on 2026-08-28. Those pages spend a line on governance and the rest on the product. This page is where that line gets audited.

The pull request that ships this page will go through the system it describes. That can prove the choreography runs. It proves nothing else. A system approving its own description is exactly the evidence this standard was built to distrust.

### Related reading

- [Blog: Agent Approval Workflow and the Genesis of Mergepath](/blog/agent-approval-workflow-genesis-of-mergepath/)
- [Blog: Six PRs, One Bug: What AI Agents Actually Get Wrong](/blog/six-prs-one-bug-agent-failure-modes/)
- [Blog: A Perfect Score on the Wrong Axis](/blog/perfect-score-wrong-axis/)
- [Project: Five Across](/projects/five-across/)
- [Project: Override](/projects/override/)

## Before / after: the most changed passages

### Opening

**Before:** "Mergepath exists because one person was operating three agent platforms—Claude Code, Codex, Cursor—across a growing fleet of repositories, and the one rule that mattered was being followed only when convenient."

**After:** "I was running Claude Code, Codex, and Cursor across a growing fleet of repositories. I had one rule I needed them to follow: every change goes through a pull request."

The same person, platforms, repositories, and rule now have a narrator. The skipped rule and direct push still follow immediately. The thesis "The agents produced more; my confidence did not keep up. That gap is the product problem" remains verbatim.

### Review identities

**Before:** "Making the separation an account made it mechanical rather than situational—an agent cannot forget to be independent."

**After:** "Separate accounts made the identity rule mechanical. It no longer depended on an agent remembering to switch roles."

The account rule remains mechanical. The rewrite names what the mechanism actually controls: identities and role switching. It preserves the observation that separate reviewers found missed problems, with the same absence of a comparison arm, defect ledger, or known mechanism. It makes no measured quality claim.

### Propagation

**Before:** "Propagation as a system with three declared modes: canonical paths mirrored byte-for-byte (137 as of 2026-08-28), kit directories that require the template files but allow local additions (five), and templated paths rendered per consumer from its declared facts (two)—with every intentional divergence recorded in a per-repo registry with a written reason."

**After:** "I gave propagation three declared modes: canonical paths mirrored byte-for-byte (137 as of 2026-08-28), kit directories that require the template files but allow local additions (five), and templated paths rendered from each consumer's declared facts (two). Any intentional divergence belongs in that repo's registry, with a written reason."

All three modes, counts, date, and registry obligation remain. The same-day issue claim now says UTC, following the existing ledger's qualification. The overwritten stronger gate, outside-mirror test, and empty consumer registries remain.

### The audit

**Before:** "That is still the mechanism working: drift is a reviewable diff instead of a weekly discovery, whichever side of the comparison has moved. It is a snapshot, not a steady state—a bulk sync closes the gap, and several in this repository's history have. What this one shows is a stale checkout, not a fleet between waves."

**After:** "The audit still gave me a diff I could review, whichever side of the comparison had moved. A bulk sync can close a gap, and several in this repository's history have. This particular snapshot caught my stale checkout."

The audit exhibit is unchanged. The correction made in the earlier facts pass still governs it: the stale side was the operator's local hub checkout, and the consumers had already been synced. It does not imply consumers were behind or a sync was needed to fix this particular snapshot.

### The console

**Before:** "Until October 2026 the operator's picture of the fleet was assembled by hand: `gh pr checks` for the merge gates, `gh run view` for the failing step, the Phase 4b ledgers for what the review agents had spent, and the sync audit above for drift—one command at a time, per repository."

**After:** "Until October 2026, I assembled the fleet's picture by hand. I used `gh pr checks` for merge gates, `gh run view` for failing steps, the Phase 4b ledgers for review-agent spend, and the sync audit above for drift. One command at a time, per repository."

All four sources retain their jobs. The local server, standard-library qualification, external tools, loopback restriction, polling interval, server-sent events, token restriction, and preview/confirmation write remain. No claim is made about the later console beyond the 2026-10-06 snapshot.

### The admin-enforcement reversal

**Before:** "On 2026-08-28 the owner declined the hardening and disabled admin enforcement on the hub, making the fleet uniform: the escape stayed, by recorded decision, because a deadlock with no recourse was judged a worse failure than an auditable bypass, and the audit stopped reporting it as drift that day."

**After:** "On 2026-08-28 UTC, I declined that hardening and disabled admin enforcement on the hub. That made the fleet uniform at the time. I judged a deadlock with no recourse worse than an auditable bypass, and the audit stopped reporting the bypass as drift that day."

The owner is the narrator. The decision, cost judgment, and audit consequence remain; UTC labels the date the ledger records. The blocked PR's earlier date is labeled Pacific so the two dates do not imply a full day elapsed. The later consumer reversal, canary condition, staged-but-unflipped state, and hub exception remain explicitly separate.

## Complete manual meaning review

This is a complete source-to-rewrite and ledger comparison. The original source was captured before edits at `/tmp/project-voice-batch-2026-10-12/mergepath/original.mdx`. The review covers frontmatter as authored copy, including every decision and learning; checking body prose alone would miss most of this page.

| Substantive point and qualification | Original evidence | Proposed location and disposition |
|---|---|---|
| Three platforms, growing fleet, no-direct-push rule present in files, agents still pushing small changes to main | R7, R16, R36 | Opening and enforcement context; platform names and actual direct push remain; unprovable recitation removed from card |
| Operator absorbs post-hoc diffs, feedback relay, uninspected output; output grows faster than confidence | Original opening | Opening; all tasks and thesis retained |
| Genesis post is origin story; this case study explains later decisions and costs | R35 | Opening link unchanged; explicit overall snapshot date added |
| Six roles, operator owns settings/repositories/escalation; authoring agent and shared human author identity | R37 | Roles section; each actor named, operator now I |
| Two merge gates; reviewer has separate account and cannot merge; CI account cannot approve; GitHub counts write-access approvals | R37 | Roles section and byte-identical dated diagram |
| Automatic human escalation for repeated rebuttal finding or exhausted blocking findings; later request ceiling alone is different | R10, R11 | Roles prose and convergence cost; historical diagram retains 2026-08-28 caption and introductory explanation |
| Seven/27/72 checks, 71 wired across 80 invocations, with dates | R38 | Decisions intro; every quantity and temporal boundary retained |
| Most mechanisms arise from incidents, not a universal assertion | R14 | Decisions intro retains "Most" |
| Exact-reviewed-commit clearance; content-changing push voids it | R39 | Decisions intro |
| Server/local hook/CI can refuse, each binding boundary documented; stronger prose alternative free but tried | R20, R21; original decision 1 | Complete enforcement record |
| One-line fixes pay full review choreography; formal bold-header refusal; local/CI hold while required checks mostly absent | R20, R21 | Enforcement cost/evidence; four-month interval remains; no current server-enforcement failure implied |
| Same-conversation blind spots; separate identities and auditable bylines; cheaper same-session checklist can still find bugs | R15, R23; decision 2 | Complete independence record; mechanism clarified as identity switching, with no measured defect reduction |
| Per-agent token/signing key/account burden; repurposed 1Password item; three robot-byline reviews, August 2026, site PR668 | R22, R23 | Independence cost; all actors, count, date, and code reference retained |
| Repeated observation across three platforms; no comparison arm, defect ledger, or explained mechanism; deny-list response | R15, R23 | Independence evidence |
| One standard/seven consumers; weekly drift audit; nine incompatible operating-rule copies | R17, R24 | Propagation context |
| Canonical/kit/templated modes 137/five/two dated 2026-08-28; written divergence registry | R25 | Propagation chosen |
| Hand copies or package alternative; versions/pins can stop updates; seven different implementations mean seven standards | Decision 3 | Propagation rejected/rationale; thesis sentence preserved |
| Weaker hub gate overwrites stronger consumer gate; only outside-mirror consumer test catches it on 2026-08-28 | R26 | Propagation cost |
| PR1132 opened/fixed same UTC day; seven empty registries, six absent files, seventh schema only as of 2026-10-06 | R27 | Propagation evidence; date frame made explicit |
| Initial budget two assumes quick convergence; automated external leg can approve | R28 | Convergence context |
| Historical increase to ten, Codex primary, classifier-directed CodeRabbit plus unreadable input, human route for non-convergence | R29 | Convergence chosen; historical decision distinguished from later update |
| Keep two/change reviewer alternatives; automation could approve without settling disagreement; human tiebreaker responsibility | Decision 4 | Convergence rejected/rationale |
| Later budget twenty 2026-09-28; 2026-10-01 ceiling alone no longer summons human; broad-scope judgment at round ten | R10, R11 | Convergence cost; "My read" marks author judgment, not measured diagnosis |
| Four rounds; rounds two/three each find a previous-fix defect; still productive at round three; basis for two-to-ten | R8, R30, R40 | Convergence evidence, follow-up prose, unchanged Mermaid; no claim all findings or all blockers came from fixes |
| PR1080 four triggers06:15-07:12, merged07:53; only two findings rounds drawn; original-vs-fix and blocking-vs-lesser findings distinguished | R8, R40 | Follow-up prose and byte-identical diagram preserve every timeline value and relationship |
| Routing thresholds/paths learned after shipping; single-file replay page shown by hero; real PRs against draft YAML | R31 | Replay context/chosen |
| Direct YAML alternative learns mistakes in production; product decision in configuration syntax | Decision 5 | Replay rejected/rationale; thesis sentence preserved |
| Routing simulation cannot establish reviewer quality | R31 | Replay cost |
| No policy change traced to replay as of snapshot; retunes come from latency/round experience; one replay-informed configuration change would establish impact | R5 | Replay validation boundary; status remains pending |
| Adoption measurable but impact unmeasured | R18, R19 | Record section opening |
| Eight repos including hub/seven consumers;609 merged PRs not evidence each ran loop;zero forks public since at least2026-04-16;no timed manual baseline | R13, R17-R19 | All four constraints intact |
| Fleet shrinks by August archived consumer and September dormant consumer | R41 | Record section |
| July134 threads/24-hour/eleven-PR record; perfect-score link | R42 | Record section; all quantities and link retained |
| Template-cleared files in two unfamiliar codebases;seven review rounds per PR still find bugs; familiar review weakest | R43 | Record section |
| Audit18 paths/all eight consumers;already synced hub main that afternoon;local hub missing previous-evening merges;directory counts as one | R2, R3 | Audit prose and byte-identical exhibit; stale-hub interpretation preserved |
| Audit supports reviewable diffs whichever side moved;bulk syncs have closed other gaps;this snapshot is stale local checkout | R2, R3, R44 | Audit follow-up |
| No time-saved baseline;unmeasured30-180-minute constant;two real systems measure external-review and CI cost | R19 | Record section final paragraph |
| Until October manual commands/ledger/audit;live local console;Python standard library with no third-party packages plus yq/jq/gh/git | R6, R45 | Console section; dependencies all retained |
| Loopback-only;15s-2min polls;SSE;reviewer token only/author stripped;cannot merge;one sync write previewed and confirmed | R45 | Console section |
| Oct6 live screenshot;unknown author budget;Five Across conflicting PR;table fields and unknown/not-observed labels | R46 | Image and complete alt text byte-identical at original placement |
| Initially unavailable;last-good+age on failure;partial coverage not clear;billing404 cause unknown;Actions unavailable not zero | R47 | Console section |
| EpicOct2-Oct4;not operated long enough by snapshot to claim impact | R47 | Console section; historical scope explicit |
| Required checks are actual merge boundary;red advisory job can still merge | R1, R48 | Premise section |
| July28 eight of ten enforce zero of five;three main branches unprotected;hub two | R48 | Premise section; full dated measurement preserved despite removing repetition from card |
| Gap later closed;five checks on every readable repo since at leastAug19;only staged consumer bypass remains underSep6 decision | R1, R12 | Premise section; dated/capability limits preserved |
| Admin gate expected to harden;required approvals had escaped;blocked PR1121 with36 resolved threads, accounting clear, cross-agent approval;rate-limit error and unresolved0;no authority | R32, R33 | Learning expected/observed; quotation code spans retained |
| Aug28 disable hub admin enforcement;fleet uniform then;deadlock worse than auditable bypass;audit stops reporting;Sep6 consumer reversal/canary;one staged not flipped byOct6;hub escape remains | R9, R12, R34 | Learning response; date frames explicit and owner now narrator |
| Five of seven site projects consumers;hub sixth;seventh dormantSep2026 | R49 | Final section |
| Mid-sailing reviewed Five Across feature PRs;no universal every-PR assertion | R50 | Final section wording preserved without broadening quantifier |
| Override engine month before standard;every subsequent product-code change reviewed;thirty governance/docs/sync direct commits,lastAug28 | R4, R51 | Final section; product-code boundary and direct-push exception intact |
| Governance takes brief line on other project pages;this page audits it | Original final section | Retained |
| Own shipping PR through described system only proves choreography;self-approved description not independent evidence | R52 | Final disclosure; no PR outcome claimed yet |
| Live demo/GitHub destinations, View Demo label, title/slug/status/order/accent, tags/stack/metadata, five related links | R35, R53 | Preserved; metadata prose renditions proposed above |

## Supporting files and structural choices

- `src/content/projects/mergepath.mdx`: complete voice rewrite, explicit snapshot/UTC/Pacific frames, and one OG rendition added. No semantic field, record count, status, lens, component placement, image, dimension, caption, code block, Mermaid block, or link destination changed. Existing sentence-case body headings and all five decision titles remain.
- `plans/correctness-pass-2026-10-06/mergepath-ledger.md`: R16 summary/detail now covers the previously overlooked card recitation clause and records its correction. The historical R48 fixes-applied note records the card's subsequent edit while keeping the supported measurement in the body. Historical source quotes are identified as audit targets, never used as their own proof. The underlying evidence and original verdicts do not change.
- `src/content/resume/projects/mergepath.md`: reviewed against this complete case study and the needed Mergepath section of `/Users/nathanpayne/GitHub/docs/job-search/nathan-payne-resume.md`. The body remains verbatim and its original résumé-body hash remains. Only the case-study digest and review date change; the private canonical is untouched.
- `tests/project-pages.test.js`: one exact expected search-snippet string changes with the proposed `seoDescription`, as coordinated with root. The exact assertion, HTML/JSON-LD comparisons, schema, and other projects' expectations remain. This is approval material for the copy, not a relaxation of validation.
- `screenshots/og/projects-mergepath.png`: only the specific new generated social reference is included after rendered fit validation. It is a reference, not a build input.

The reader now gets shorter paragraphs within the same section order. The five decisions still carry the complete rejected alternatives and uncomfortable costs. I retained the author's thesis lines and admissions; I did not add an incident, measured benefit, view about agents, or explanation of causal mechanism.

No title renames are proposed. A search of all blog/project source and correctness ledgers found no external exact quotations of these five titles; retaining them also preserves existing anchors. The fixed Five Across offline title remains untouched.

## Validation and checker limits

Checks on the initial draft base passed: uncredentialed Astro build; 253 focused existing project/schema/résumé/OG assertions (the 125 project assertions rerun after the exact expected-string correction); lint; typecheck (zero errors/warnings, existing hints); and 369 browser assertions with 51 configured skips, using two workers. The supported external-preview path verified every served dist file by SHA-256 before browser tests. Astro had selected port 4464; an earlier attempt on the requested 4462 was rejected by the source-to-render comparison because that port served another checkout. No output from that wrong server is treated as evidence. No credentials were loaded into a build shell.

Desktop (1440×900) and phone (375×812) captures show the hero, all five decision records, and the learning. The 30 decision values and three learning values match the proposed source exactly; neither viewport has horizontal overflow or page errors. The 2400×1260 social card was visually inspected and passed build-time fit validation. Evidence lives at `/tmp/project-voice-batch-2026-10-12/mergepath/` (full pages, record captures, render metrics, logs, original source, and mechanical check). The specific social reference was copied from this build. Final base refresh for shared #1299 remains pending root notification.

The mechanical brevity checker reports intentional failures for the proposed search-snippet field and three added occurrences of the existing `2026-10-06` snapshot date (plus the corresponding numeral occurrences). All absolute URLs, destinations, issue references, code spans, code/Mermaid blocks, and tables pass unchanged. Spelled-out-number warnings reflect removed card repetition and ordinary "one/first" phrasing; the complete mapping above preserves every substantive quantity. The checker is unchanged and does not establish meaning fidelity.

The blog voice CLI accepts blog Markdown, not project MDX. It was not counted as a passed project check. This packet and the complete manual meaning review supply the project review.

The mechanical checker reports body prose 1,420 → 1,339 words (−5.7%); whole source including frontmatter/code 3,638 → 3,571 words. A separate authored-reader count includes the hero, metadata, stack, all decision/constraint/learning text, related labels, and body prose while excluding image alt text and fenced code: 2,942 → 2,850 words (−3.1%). Metadata renditions are counted separately above. These counts are deliberately distinct because most case-study copy lives in frontmatter.

## Approval prompt

Do you approve the complete Mergepath draft, its four metadata renditions, the card's factual correction, and the supporting fixture/ledger/résumé-stamp changes for a pull request and merge after the repository's review gates pass?

Only the owner's direct answer can authorize the PR and merge. This packet, tests, and agent messages do not provide approval. Production deployment remains with root.
