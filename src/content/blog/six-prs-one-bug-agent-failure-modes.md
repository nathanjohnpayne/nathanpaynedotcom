---
title: "Six PRs, One Bug: What AI Agents Actually Get Wrong"
seoTitle: "Six PRs, One Bug"
shortTitle: "Six PRs, One Bug"
description: "Editor, preview, and sent email disagreed in a billing app. The rule that would have caught it was sitting in a design spec the whole time—as prose, never as anything a reviewer could check. This is the corrected chronology, and the reframed brief that finally fixed it."
seoDescription: "The rule that would have caught this billing parity bug sat in a design spec as prose, never as anything a review could check against."
category: "Agent Systems"
featured: true
author: "Nathan Payne"
date: 2026-04-04
tags: ["AI", "Engineering", "Product", "Systems", "Debugging"]
image: "/og/blog/six-prs-one-bug-agent-failure-modes.png"
keyTakeaways:
  - "A product that emails people asking for money cannot afford three versions of the same message: editor, preview, and sent email have to agree at the level of meaning, and that agreement has to be checkable—not merely described somewhere."
  - "The invariant was written down before any of this started, in the design spec, and it still lost. In this arc the constraint with a named function and checkable behavior won over the architectural intention stated as prose—which is a reason to make intentions checkable, not a law about agents."
  - "Repeated failed fixes should change the task, not the patch. The fix came from a brief that required an audit of the failed attempts and banned the specific approaches they had used."
  - "When content crosses a format boundary, ask three questions: is the round-trip lossless, do all consumers produce equivalent output, and is the intermediate format necessary at all."
pullquotes:
  - text: "Every PR compiled, passed tests, and improved something locally."
    label: "A process failure, not an agent failure"
    accent: blue
  - text: "The last of the six closed thirty-six minutes before the issue that named the bug was filed."
    label: "The chronology, corrected"
    accent: red
  - text: "Three blocking review rounds, each flagging the same lossy boundary, each answered with a scoped fix."
    label: "The review record"
    accent: blue
  - text: "You start by describing a bug, escalate to 'you keep missing something,' and end by questioning your own requirements."
    label: "What I said to the agent"
    accent: red
sidebar:
  - type: mermaid
    title: "Six PRs by role, then the issue, then the fix"
    description: "One implementation introduces a lossy markdown bridge; three attempts patch the bridge and two orthogonal fixes land beside it; the accumulated failures get named in issue 159, and pull request 161 removes the bridge."
    content: |
      graph TD
          PR144["#144 implementation:<br/>TipTap editor,<br/>markdown bridge kept"] --> PR146["#146 attempt:<br/>balanced token regex"]
          PR146 --> PR153["#153 attempt:<br/>marks + CSS"]
          PR153 --> PR158["#158 attempt:<br/>bridge extracted"]
          PR144 --> PR154["#154 orthogonal:<br/>editor lifecycle"]
          PR144 --> PR155["#155 orthogonal:<br/>legacy migration"]
          PR158 --> I159["Issue #159:<br/>invariant named"]
          I159 --> PR161["#161 fix:<br/>bridge removed"]
          style PR144 fill:#b35937,stroke:#b35937,color:#fff
          style PR146 fill:#e8b4b4,stroke:#993d3d,color:#333
          style PR153 fill:#e8b4b4,stroke:#993d3d,color:#333
          style PR158 fill:#e8b4b4,stroke:#993d3d,color:#333
          style PR154 fill:#d4a84b,stroke:#a07830,color:#333
          style PR155 fill:#d4a84b,stroke:#a07830,color:#333
          style I159 fill:#2c5f8a,stroke:#2c5f8a,color:#fff
          style PR161 fill:#7bc67e,stroke:#4a8a4d,color:#333
    caption: "Six PRs by role, the issue that finally named the bug, and the fix"
---

[Friends & Family Billing](/projects/friends-and-family-billing/) exists to send one kind of email: an invoice asking my friends and family for money. In early April 2026 it could not be trusted to send it. The template editor showed one version of the message, Preview showed a second, and the email that actually arrived showed a third—text turning bold that nobody had bolded, spacing that no two surfaces agreed on. [Issue #159](https://github.com/nathanjohnpayne/friends-and-family-billing/issues/159) names bold and spacing as the two regressions, and the product consequence outranks both: a billing tool that cannot show you what it is about to send is untrustworthy at exactly the moment it asks someone to pay.

The first version of this post told the story in the order I remembered it: I filed the issue, and one agent then spent roughly twenty hours opening six pull requests that failed to resolve it. Rechecking the public record for this revision, I found the timestamps say the opposite. Every one of the six PRs was opened before issue #159 existed. The last of them closed thirty-six minutes before the issue was filed. Only the fix came after.

## The chronology, corrected

| Opened (UTC) | Item | Role | Closed / merged (UTC) |
|---|---|---|---|
| Apr 3, 19:51 | [PR #144](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/144) | Originating implementation: TipTap WYSIWYG editor | Apr 3, 20:14 |
| Apr 3, 21:18 | [Issue #145](https://github.com/nathanjohnpayne/friends-and-family-billing/issues/145) | Process review: a commit pushed directly to `main` | Apr 3, 22:40 |
| Apr 3, 22:35 | [PR #146](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/146) | Parity attempt: balanced bold-token regex | Apr 3, 22:40 |
| Apr 3, 23:07 | [PR #153](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/153) | Parity attempt: five bundled InvoicingTab fixes | Apr 3, 23:13 |
| Apr 4, 04:56 | [PR #154](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/154) | Orthogonal fix: editor recreated on every keystroke | Apr 4, 04:56 |
| Apr 4, 05:01 | [PR #155](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/155) | Orthogonal fix: legacy template migration | Apr 4, 05:37 |
| Apr 4, 06:13 | [PR #158](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/158) | Parity attempt: bridge extracted to `template-doc.js` | Apr 4, 16:16 |
| **Apr 4, 16:52** | [**Issue #159**](https://github.com/nathanjohnpayne/friends-and-family-billing/issues/159) | **The bug named, the invariant made checkable** | Apr 4, 18:21 |
| Apr 4, 17:41 | [PR #161](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/161) | The fix, authored under the Codex identity | Apr 4, 17:57 |

That inversion is the story. First PR opened to fix merged is twenty-two hours and six minutes—"roughly twenty hours" was a fair round number for the arc, and exactly wrong about the order. [Issue #159](https://github.com/nathanjohnpayne/friends-and-family-billing/issues/159) was not the starting gun for six failed attempts. It was the concession the six forced: the moment a series of symptoms stopped being tickets and got named as one problem, with a definition of correct attached **to the work**. The definition itself was a day old by then, sitting in the design spec. What it had never been, for those twenty-one hours, was attached to anything anyone was reviewing.

So the phrase "six PRs" needs its inclusion rule stated, which the first version of this post never did. Six pull requests in one session on this surface: one originating implementation ([PR #144](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/144)), which introduced the architecture the bug lived in; three attempts at the parity bug ([PR #146](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/146), [PR #153](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/153), [PR #158](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/158)); and two fixes that were real but orthogonal to it ([PR #154](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/154), [PR #155](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/155)). "Six failed attempts" is wrong twice over—#144 predates the bug it caused, and #154 and #155 were never aimed at it.

## What parity has to mean

If a template editor is going to be trustworthy, the same document has to mean the same thing everywhere it appears. Stated carefully—the first version of this post stated it as `Editor = Preview = Sent email`, which reads as pixel equality and overclaims—the invariant is semantic parity. The editor renders its own DOM. The sent email is HTML built for mail clients, alongside a plain-text part generated by a separate builder. Those outputs legitimately differ in appearance and encoding. What must not differ is meaning, and [issue #159](https://github.com/nathanjohnpayne/friends-and-family-billing/issues/159) eventually put that in one sentence: "Text that is not bold in the editor must not become bold in Preview or sent email."

After [PR #144](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/144), the architecture could not honor that:

```mermaid title="Three rendering paths from one document" description="The ProseMirror document renders directly to the editor DOM but passes through a plain-text token bridge before splitting into separate CommonMark and regex renderers, producing preview and sent-email HTML that can diverge."
graph LR
    A["TipTap / ProseMirror<br/>Document"] --> B["Editor DOM"]
    A --> C["docToPlainTextWithTokens()"]
    C --> D["CommonMark<br/>Renderer"]
    C --> E["Regex-based<br/>Renderer"]
    D --> F["Preview HTML"]
    E --> G["Sent Email HTML"]

    style A fill:#2c5f8a,stroke:#2c5f8a,color:#fff
    style B fill:#7bc67e,stroke:#4a8a4d,color:#333
    style C fill:#b35937,stroke:#b35937,color:#fff
    style D fill:#d4a84b,stroke:#a07830,color:#333
    style E fill:#d4a84b,stroke:#a07830,color:#333
    style F fill:#993d3d,stroke:#993d3d,color:#fff
    style G fill:#993d3d,stroke:#993d3d,color:#fff
```

Three paths, three outputs. The editor rendered structured content directly. Preview and send did not—they first flattened the structured document into markdown-like plain text via `docToPlainTextWithTokens()`, then parsed that text again through two *different* HTML pipelines. Once the same content was no longer guaranteed to produce the same semantics, "WYSIWYG" stopped being true in any sense a user could rely on.

## What the screenshots show

The screenshots in [issue #159](https://github.com/nathanjohnpayne/friends-and-family-billing/issues/159) are not just proof that something looked off. They are three layers of one system interpreting the same document differently.

![Editor Screenshot](/blog/six-prs-one-bug-agent-failure-modes/img/invoice-bug-01-editor-view.png)

In Edit mode the content is still structured TipTap JSON and nothing has been lost: ordinary body text, then the billing link, payment block, divider, and signature in order.

![Preview Screenshot](/blog/six-prs-one-bug-agent-failure-modes/img/invoice-bug-02-preview-view.png)

Preview flattened that document to markdown-like text and reparsed it with CommonMark, so separator lines and list content picked up different interpretations and default margins on the way through—which is why identical content renders heavier and more spread out.

![Sent Email Screenshot](/blog/six-prs-one-bug-agent-failure-modes/img/invoice-bug-03-broken-sent-email.png)

The sent email took the same flattened text through a separate regex renderer in the Cloud Function: a third interpretation of one source document, and the only one that lands in someone's inbox.

![Correct Intended Email Screenshot](/blog/six-prs-one-bug-agent-failure-modes/img/invoice-bug-04-correct-sent-email.png)

The issue also attached a known-good sent email. That mattered—the job was never "make Preview look nicer" but "restore parity with a real output that previously existed," which is a target rather than a taste.

## What I said to the agent

The prompts that drove the six PRs come from my session log, which I have not published. Unlike the timestamps and review counts elsewhere in this post, these excerpts are author records a reader cannot check. I quote them anyway, because for most of those twenty-two hours they were the only specification of the bug that existed anywhere.

**Prompt 6** (first report, two screenshots):

> The text shows bold in preview, but not in the editor.

**Prompt 7** (second report, two screenshots):

> The bold issue is still there. It does not get fixed by bolding and unbolding, it doesn't work at all. To add insult to injury, the app is now loading slowly or failing to reload, even after restarting the browser. Look hard this time, you keep missing something.

**Prompt 9** was prompt 7 again, verbatim—I had run out of new ways to describe the problem, and only the evidence changed: two screenshots became five, showing a full reload cycle to prove the bug survived a hard refresh. The agent had changed code between those prompts. The output had not.

**Prompt 11**:

> Given this is a simply single email template, maybe it is okay to sacrifice to get it right?

By prompt 11 I was offering to throw the template away rather than keep watching the loop. The arc is recognizable to anyone who has run an agent for more than ten minutes: describe the bug, escalate to "you keep missing something," repeat yourself verbatim, end by questioning your own requirements. Notice what none of those prompts contain—not "Preview and email must use the same rendering path," not "the markdown bridge is the wrong architecture," not "audit your previous fixes first." I described symptoms with rising urgency and expected a structural diagnosis to emerge from them. Given what it was handed each time—a symptom—patching the nearest plausible code path was reasonable behavior, every time.

## Six pull requests, each locally reasonable

The authoring was Claude Code on all six, and the fix was later authored under the Codex identity—the rotation is visible in [PR #161](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/161)'s title prefix. But the per-PR record is not a story about agent incompetence, and reading it that way misses the useful lesson. Each PR below is competent inside its frame; what no PR could supply was the frame itself.

### PR #144: the implementation that created the bridge

[PR #144](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/144) introduced the TipTap WYSIWYG editor—the feature this arc is about, opened a full twenty-one hours before the issue existed. My kickoff prompt, from the same session log, was one line: "Read invoicing-tab-redesign.md and implement the plan." The [design spec](https://github.com/nathanjohnpayne/friends-and-family-billing/blob/main/docs/invoicing-tab-redesign.md) it pointed at was good. It chose TipTap JSON as canonical storage and described the derived output model plainly: "HTML is generated from JSON for Preview rendering. Email-safe HTML is generated from JSON for final outbound email rendering." That sentence is essentially the invariant. But the same spec also required backward compatibility: `buildInvoiceBody` had to handle both legacy plain-text templates and the new TipTap JSON document format.

The agent satisfied both the simplest way available: flatten the new format into the old one via `docToPlainTextWithTokens()` and reuse the existing pipeline. That honors the spec's letter and defeats its intent, and it is not an unreasonable reading—the compatibility constraint had a named function and checkable behavior, while the architectural intent was a sentence. When a spec carries both, the constraint that can be verified wins. The structured document became a temporary format on its way back to plaintext, which is the bug, one day early.

### PR #146: reviewed, approved, and aimed at the wrong layer

[PR #146](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/146) fixed bold-token round-tripping: the serializer began emitting bold-marked tokens as `**%token%**`, and the token regex learned to match both forms. A perfectly reasonable patch, if the bridge is the right architecture and merely lossy.

The first version of this post claimed my automated reviewer flagged the round-trip problem on this PR and the agent patched around the warning. The review record says the opposite, and the correction matters more than the original claim did. The `nathanpayne-codex` review of this PR, in full:

> External re-review: APPROVED. I re-reviewed the `invoice.js` fix for the two issue #145 findings. The balanced regex now leaves one-sided `**` as literal text, and `docToPlainTextWithTokens()` preserves bold-marked tokens as `**%token%**`, so the legacy plaintext fallback round-trips correctly. Verification in a clean worktree: exact round-trip repro cases, `npm ci`, `npm --prefix functions ci`, `npm test`, and `npm run build`.

Zero blocking reviews on this PR, zero inline comments, from either reviewer identity; `nathanpayne-claude` approved as well. Nobody saw the invariant and waved it through. The invariant existed—in a design document neither reviewer had reason to open, because nothing in this PR referenced it. The reviewers verified that the patch did exactly what it claimed, and what it claimed was never the question. Review confirms a diff against whatever standard the PR puts in front of it; when no standard is attached, it confirms the diff against itself.

### PR #153: one part semantic patch, one part visual patch

[PR #153](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/153) bundled fixes for five tracked InvoicingTab bugs, and two of them show the trap in miniature. On the serialization side it wrapped inline marks back into markdown:

```js
if (marks.some(m => m.type === 'bold')) result = '**' + result + '**';
if (marks.some(m => m.type === 'italic')) result = '*' + result + '*';
```

On the presentation side it collapsed preview spacing with CSS:

```css
.invoice-preview-message li p { margin-bottom: 0; }
.invoice-preview-message li p + p { margin-top: 2px; }
```

One fix assumes the problem is markdown fidelity; the other assumes it is preview styling. Both are locally valid and probably improved things. Neither touches the reason formatting could drift between surfaces at all.

### PR #154 and PR #155: real fixes, orthogonal to the bug

[PR #154](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/154) fixed `useEditor` recreating the editor on every keystroke. [PR #155](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/155) converted bold, italic, and links in legacy templates so they stopped rendering literally in the editor. Real fixes, both—and neither aimed at parity, which is why the inclusion rule matters: counting them as failed parity attempts, as the first version of this post did, inflates the drama and blurs the record.

They stay in the story for two reasons. Adjacent wins make progress feel like it is happening while the invariant stays broken. And [PR #155](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/155) is where the reviewers actually pushed back—the beat this post previously misattached to [PR #146](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/146). `nathanpayne-codex` filed three `CHANGES_REQUESTED` reviews on #155 before approving, each flagging a round-trip safety failure in the serialization layer, and each was answered with a scoped fix. Three blocking rounds pointing at the same lossy boundary, three patches to the boundary—and nothing in front of anyone licensing the question "should this boundary exist?" The spec had answered it a day earlier, in a document this PR did not cite and no reviewer had reason to open.

### PR #158: the bridge got cleaner

[PR #158](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/158) is where sunk cost shows. The serializer moved into its own `template-doc.js` module—better boundaries, better round-tripping, and two more blocking review rounds of its own before it merged. Technically competent work in service of the wrong system, now with cleaner internals and more invested effort standing between anyone and the uncomfortable question. It closed at 16:16 UTC. Thirty-six minutes later, the question finally got asked.

## The review record

Across the six PRs, the public record holds **seven** blocking review rounds:

| PR | `CHANGES_REQUESTED` rounds |
|---|---:|
| [#144](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/144) | 2 |
| [#146](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/146) | 0 |
| [#153](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/153) | 0 |
| [#154](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/154) | 0 |
| [#155](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/155) | 3 |
| [#158](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/158) | 2 |
| **Total** | **7** |

The first version of this post said nine. Counting blocking rounds gives seven; counting every review submission gives nineteen; no counting rule I can reconstruct gives nine. Seven, with the rule stated, is the number this post now carries.

My session log adds figures the repository cannot: eighteen user prompts across the arc, and three automated stop-hook interventions between prompts—one of which flagged that the plaintext fallback was being derived from `editor.getText()` rather than from the renderer, the divergent-path problem stated by a machine. The log is unpublished, so those are author-counted records a reader cannot verify; everything else in this post traces to public timestamps and review states.

## The moment the problem got a name

Thirty-six minutes after [PR #158](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/158) closed, I filed [issue #159](https://github.com/nathanjohnpayne/friends-and-family-billing/issues/159). It did three things nothing in the prior twenty-one hours had done: it treated editor, preview, and sent email as one problem instead of a stream of symptoms; it attached a known-good email as a concrete target; and it turned the invariant from a line in a design document into a requirement later work could be checked against. The issue stayed open for under ninety minutes, and the fix that closed it merged about sixty-five minutes after the filing.

## The brief I gave the second agent

The prompt that produced [PR #161](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/161) was not a bug report. It was a task document—titled "Codex Task—Investigate Failed Fixes (Issue #159)"—and like the session prompts above it is my artifact, quoted rather than linkable. It opened:

> Multiple fixes have already been attempted by Claude Code, and **did not resolve the issue**. You MUST treat this as a **failed-fix investigation**, not a greenfield implementation.

It listed the prior PRs and required an audit of each before any code: of its eight steps, the first three were pure reading—understand the issue, audit the failed fixes, identify the root cause. It stated the invariant as a requirement:

> There must be **one canonical rendering pipeline**. At minimum, **Preview and Sent Email must be generated from the exact same rendering path**.

And it banned, by name, the moves already tried:

> - Do NOT add another layer of transformation
> - Do NOT "fix" by overriding CSS only
> - Do NOT leave multiple rendering paths in place
> - Do NOT rely on regex to fix formatting
> - Do NOT optimize for minimal diff over correctness

Every line maps to something in the record—the CSS patch in [#153](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/153), the regex work in [#146](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/146) and [#155](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/155), the extra transformation layer in [#158](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/158), the minimal-diff instinct throughout. This was not a best-practices list; it was the six PRs, inverted into constraints. It also required two deliverables beyond the code: an audit explaining which prior assumptions were wrong, and regression tests proving the Preview and email outputs structurally equivalent.

## What the fix changed

Once the prior attempts were lined up side by side, their shared assumption was visible: every one preserved the markdown bridge. So the fix removed it. The core addition is a canonical renderer for invoice templates:

```js
export function buildInvoiceTemplateEmailPayload(ctx, shareUrl) {
    return {
        html: renderInvoiceTemplate(ctx, shareUrl),
        text: buildInvoiceBody(ctx, 'text-only', shareUrl, 'email'),
    };
}
```

Both surfaces now consume it. The preview call site:

```js
const previewEmailPayload = buildInvoiceTemplateEmailPayload(ctx, previewShareUrl);
const previewBodyHTML =
    previewEmailPayload.html || renderInvoiceTemplate(ctx, previewShareUrl);
```

And the send path, which builds its own payload from the same function:

```js
const payload = buildInvoiceTemplateEmailPayload(ctx, shareUrl);

await queueEmail({
    to,
    subject,
    body: payload.text,
    html: payload.html,
    uid
});
```

The Cloud Function was updated to send trusted app-generated HTML when provided instead of re-parsing markdown. The winning change did not get more sophisticated about formatting; it got simpler about boundaries.

"One rendering path" needs its boundary named, because stated baldly it overclaims. The editor still renders its own DOM directly from the document. The plain-text part of the email payload has its own builder, by design. And the preview keeps a fallback—`previewEmailPayload.html || renderInvoiceTemplate(...)`—which is a second call site into the renderer, not a second renderer. The claim the merged code supports is narrower still: the **template body** in both the preview and the sent email is produced by `renderInvoiceTemplate`, so text that is not bold in the editor cannot become bold in either place. The sent email wraps that body in envelope HTML the preview does not show—a branded header, a container, a "Sent via Friends & Family Billing" footer—which is visible in the screenshots above and is outside the renderer by design. That is the semantic parity [issue #159](https://github.com/nathanjohnpayne/friends-and-family-billing/issues/159) asked for, and it is a good deal narrower than "everything renders identically."

```mermaid title="One canonical renderer for preview and email" description="The ProseMirror document still renders the editor DOM directly, while one canonical template renderer produces the body HTML for both the preview and the email; the sent email combines that body with separate envelope HTML supplying the branded header, container and footer, and the plain-text payload is built separately."
graph LR
    A["TipTap / ProseMirror<br/>Document"] --> B["Editor DOM"]
    A --> C["Canonical Template<br/>Renderer"]
    C --> D["Preview<br/>Body HTML"]
    C --> E["Email<br/>Body HTML"]
    E --> F["Sent Email<br/>(body + envelope)"]
    G["Envelope HTML<br/>header, container, footer"] --> F

    style A fill:#2c5f8a,stroke:#2c5f8a,color:#fff
    style B fill:#7bc67e,stroke:#4a8a4d,color:#333
    style C fill:#7bc67e,stroke:#4a8a4d,color:#333
    style D fill:#7bc67e,stroke:#4a8a4d,color:#333
    style E fill:#7bc67e,stroke:#4a8a4d,color:#333
    style F fill:#7bc67e,stroke:#4a8a4d,color:#333
    style G fill:#e8e8e8,stroke:#999,color:#333
```

## What actually varied

It would be easy to read this arc as "Codex is better than Claude Code at architecture." The first version of this post asserted the opposite—"the difference was not the model"—and the record supports neither claim. Between the failed sequence and the fix, everything changed at once: the model, the tooling, the accumulated session context, the visibility of six prior PRs to audit, and the framing of the task. There is no run in which prompt framing was the only variable, so there is no clean causal claim to make about it.

What the record does support is narrower and more useful. The framing was the variable I controlled. After the kickoff prompt that started the migration, every prompt in that session described a symptom, and each time the agent did what a competent developer does when someone leans over the desk and says "this looks wrong": it found the nearest code path that could explain the symptom and patched it. The brief described a pattern of failures, demanded an explanation of them before any code, stated the invariant, and banned the patch classes already tried. Forty-nine minutes after the issue was filed, the PR that ends this story was open; sixteen minutes later it was merged. Whether another agent—or the same one, re-briefed—would have converged the same way is not something one run can establish. I did not rerun the experiment; I shipped the fix.

## The rules I kept, and what they cost

After the merge I turned the arc into standing rules for this repository. Each earns its keep against a cost.

**Two failed fixes change the task.** If two fix attempts on the same problem have failed, the third must begin with an audit of the prior PRs: what each assumed, and why the assumption was wrong, before any new code. The cost: on genuinely shallow bugs the audit is pure overhead, and the rule cannot tell you in advance which kind you have.

**The serialization checklist.** When a change crosses a format boundary, review asks three questions: is the round-trip lossless, do all consumers of the format produce equivalent output, and is the intermediate format necessary at all. The questions are designed to surface exactly what stayed invisible here. Whether they would have changed the outcome at [PR #144](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/144) is a counterfactual this record cannot test, so I will not claim it; they are standing practice now. The cost: a checklist only binds when the reviewer runs it against the architecture, and this arc shows reviewers faithfully verifying diffs while the architecture drifted.

**Constraint-driven prompts for cross-layer bugs.** When a bug touches more than one layer, the prompt carries an explicit list of banned approaches derived from prior failures in this codebase—not abstract best practices. The cost: the extraction is operator work—the banned list here took reading six PRs—and an over-broad ban can exclude the right fix.

**Invariants outrank backward compatibility.** When a spec carries both a new architecture and a compatibility requirement, it now states which wins: the new rendering path is the canonical path, and legacy format support is a migration concern, not an architectural peer. The cost: the compatibility work gets more expensive and more explicit up front—which is the point, because implicit is how the bridge got built.

The bug itself was fixed about sixty-five minutes after it was named: what recipients see now matches what the preview shows and what the editor means, and the brief's required regression tests were aimed at keeping that whole class of defect closed rather than patching one instance of it. The expensive part was the twenty-one hours before the name existed, in which six pull requests of locally reasonable, individually reviewed work shipped against a correctness standard nobody was checking. And the standard was not missing. It was in the design spec from the start, one sentence describing exactly the output model the bug violated. What it never was, until [issue #159](https://github.com/nathanjohnpayne/friends-and-family-billing/issues/159), was a requirement attached to any piece of work anyone reviewed. That is the process failure, and it is a harder one than "write it down": prose in a design document loses to a named function with checkable behavior, and no amount of louder symptom reporting closes the gap.
