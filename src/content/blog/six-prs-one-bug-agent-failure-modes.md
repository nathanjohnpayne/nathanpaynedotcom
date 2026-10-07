---
title: "Six PRs, One Bug: What AI Agents Actually Get Wrong"
seoTitle: "Six PRs, One Bug"
shortTitle: "Six PRs, One Bug"
description: "My billing app showed different formatting in the editor, preview, and sent email. After six PRs, I gave the next agent a brief that required an audit before more code. The fix brought Preview and the test email together, but didn't reach the recipient's invoice."
seoDescription: "The rule this billing parity bug violated sat in a design spec as prose, never as anything a review could check against."
category: "Agent Systems"
author: "Nathan Payne"
date: 2026-04-04
tags: ["AI", "Engineering", "Product", "Systems", "Debugging"]
image: "/og/blog/six-prs-one-bug-agent-failure-modes.png"
keyTakeaways:
  - "A billing app has to show you what it will send. The editor, preview, and email can look different, but they have to preserve the same meaning. Review needs a way to check that."
  - "The spec described the right output model from the start. It also required compatibility with a named function. The implementation satisfied that requirement through a bridge that lost formatting; reviewers couldn't open the private spec to check the larger intention."
  - "After two failed fixes, I now require an audit before more code. The brief for this fix named the previous attempts and banned the approaches they had already tried."
  - "When content changes format, review asks three questions: does it survive the round-trip, do all consumers produce equivalent output, and does the intermediate format need to exist?"
pullquotes:
  - text: "Every PR compiled, passed tests, and improved something locally."
    label: "What the PRs accomplished"
    accent: blue
  - text: "The last of the six closed thirty-six minutes before I filed the issue."
    label: "The chronology, corrected"
    accent: red
  - text: "The reviewer kept finding ways the bridge lost formatting. The fixes kept the bridge."
    label: "The review record"
    accent: blue
  - text: "By prompt 11, I was offering to throw the template away."
    label: "What I said to the agent"
    accent: red
---

[Friends & Family Billing](/projects/friends-and-family-billing/) sends invoices to my friends and family. In early April 2026, the template editor, Preview, and the email that arrived showed three versions of the same message. Text turned bold that nobody had bolded. The spacing changed between surfaces. [Issue #159](https://github.com/nathanjohnpayne/friends-and-family-billing/issues/159) records both regressions. If I'm asking someone for money, I need to know what the email will say.

The first version of this post had the order wrong. I remembered filing the issue, then watching one agent spend roughly twenty hours on six PRs that didn't resolve it. All six had actually opened before the issue existed. The last of the six closed thirty-six minutes before I filed the issue. Only the fix came after.

<span id="the-chronology-corrected"></span>

## Before I filed the issue

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

The first PR opened twenty-two hours and six minutes before the fix merged. "Roughly twenty hours" was a fair round number; I'd remembered the sequence backward. By the time I filed [issue #159](https://github.com/nathanjohnpayne/friends-and-family-billing/issues/159), I needed to treat the symptoms as one problem and give the next attempt a requirement I could check. That requirement had been in the design spec for about a day. It hadn't been attached to the work under review.

The six PRs are the set named in the root-cause comment on [issue #159](https://github.com/nathanjohnpayne/friends-and-family-billing/issues/159). [PR #144](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/144) introduced the editor and the architecture where the bug lived. [PR #146](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/146), [PR #153](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/153), and [PR #158](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/158) tried to fix the formatting differences. [PR #154](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/154) and [PR #155](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/155) fixed other bugs. Calling them "six failed attempts" would miscount the work: the first created the feature, and two weren't trying to fix parity. The same session also merged [#156](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/156), a one-character loading-text fix, and [#157](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/157), a migration-version re-derivation. Neither is in the six.

## What parity has to mean

`Editor = Preview = Sent email` sounds like the requirement, but it suggests pixel equality. The editor renders its own DOM. Email needs HTML that mail clients can handle, plus a plain-text part from a separate builder. Those versions can differ in appearance and encoding while preserving the same meaning. [Issue #159](https://github.com/nathanjohnpayne/friends-and-family-billing/issues/159) gives a concrete test: "Text that is not bold in the editor must not become bold in Preview or sent email."

After [PR #144](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/144), three rendering paths stood in the way:

```mermaid title="Three rendering paths from one document" description="The ProseMirror document renders directly to the editor DOM but passes through a plain-text token bridge before splitting into separate CommonMark and regex renderers, producing preview and sent-email HTML that can diverge."
graph TD
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

The editor rendered the structured document directly. Preview and send used `docToPlainTextWithTokens()` to flatten it into markdown-like text, then reparsed it through different HTML pipelines: CommonMark for Preview, regex for email. Formatting could change at either step. I couldn't rely on "WYSIWYG" when the preview and the inbox interpreted the same document differently.

## What the screenshots show

[Issue #159](https://github.com/nathanjohnpayne/friends-and-family-billing/issues/159) included all three versions and a known-good email.

![Editor Screenshot](/blog/six-prs-one-bug-agent-failure-modes/img/invoice-bug-01-editor-view.png)

In Edit mode, the content was still structured TipTap JSON. The body text, billing link, payment block, divider, and signature were in order; nothing had been lost yet.

![Preview Screenshot](/blog/six-prs-one-bug-agent-failure-modes/img/invoice-bug-02-preview-view.png)

Preview flattened the document and reparsed it with CommonMark. Separator lines and list content picked up different interpretations and default margins. The same content looked heavier and more spread out.

![Sent Email Screenshot](/blog/six-prs-one-bug-agent-failure-modes/img/invoice-bug-03-broken-sent-email.png)

The sent email ran the flattened text through the Cloud Function's regex renderer. It was a third interpretation of the document, and the one that landed in an inbox.

![Correct Intended Email Screenshot](/blog/six-prs-one-bug-agent-failure-modes/img/invoice-bug-04-correct-sent-email.png)

The known-good sent email gave me a target that had already existed. Making Preview look nicer wouldn't have been enough. I wanted the app to preserve the message through to the email.

## What I said to the agent

These prompts come from my unpublished session log. Unlike the timestamps and review counts, you'll have to take my word for these. For most of those twenty-two hours, they were the only description of the problem attached to the work.

**Prompt 6** (first report, two screenshots):

> The text shows bold in preview (image1), but not in the editor (image2).

**Prompt 7** (second report, two screenshots):

> The bold issue is still there. It does not get fixed by bolding and unbolding, it doesn't work at all. To add insult to injury, the app is now loading slowly or failing to reload, even after restarting the browser. Look hard this time, you keep missing something.

**Prompt 9** repeated prompt 7 verbatim. I'd run out of new ways to describe the problem. This time I attached five screenshots instead of two, showing a full reload cycle so the agent could see the bug survived a hard refresh. The code had changed between prompts. The output hadn't.

**Prompt 11**:

> Given this is a simply single email template, maybe it is okay to sacrifice to get it right?

By prompt 11, I was offering to throw the template away. I'd described the bug, gotten more insistent, repeated myself, and started questioning my own requirements. None of those prompts asked the agent to audit its previous fixes, use the same rendering path for Preview and email, or reconsider the markdown bridge. I kept reporting symptoms and expecting a structural diagnosis.

<span id="six-pull-requests-each-locally-reasonable"></span>

## What the six PRs changed

Claude Code authored all six. The fix came later under the Codex identity, visible in [PR #161](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/161)'s title prefix. Every PR compiled, passed tests, and improved something locally. None of this was incompetence. Each PR was competent inside the frame it was given. That frame kept the architecture that allowed the formatting to change.

```mermaid title="Six PRs by role, then the issue, then the fix" description="One implementation introduces a lossy markdown bridge; three attempts patch the bridge and two orthogonal fixes land beside it; the accumulated failures get named in issue 159, and pull request 161 takes the HTML body of the preview and the test email off the bridge. The plain-text part and the invoice a recipient receives stay on it, and on 2026-09-30 pull request 459 moves the test email back onto it, rendered server-side."
graph TD
    PR144["#144 implementation:<br/>TipTap editor,<br/>markdown bridge kept"] --> PR146["#146 attempt:<br/>balanced token regex"]
    PR146 --> PR153["#153 attempt:<br/>marks + CSS"]
    PR153 --> PR158["#158 attempt:<br/>bridge extracted"]
    PR144 --> PR154["#154 orthogonal:<br/>editor lifecycle"]
    PR144 --> PR155["#155 orthogonal:<br/>legacy migration"]
    PR158 --> I159["Issue #159:<br/>invariant attached<br/>to the work"]
    I159 --> PR161["#161 fix:<br/>bridge removed from the<br/>preview + test email HTML"]
    PR161 --> PR459["#459 (2026-09-30):<br/>test email back on the<br/>bridge, rendered server-side"]
    style PR144 fill:#b35937,stroke:#b35937,color:#fff
    style PR146 fill:#e8b4b4,stroke:#993d3d,color:#333
    style PR153 fill:#e8b4b4,stroke:#993d3d,color:#333
    style PR158 fill:#e8b4b4,stroke:#993d3d,color:#333
    style PR154 fill:#d4a84b,stroke:#a07830,color:#333
    style PR155 fill:#d4a84b,stroke:#a07830,color:#333
    style I159 fill:#2c5f8a,stroke:#2c5f8a,color:#fff
    style PR161 fill:#7bc67e,stroke:#4a8a4d,color:#333
    style PR459 fill:#e8b4b4,stroke:#993d3d,color:#333
```

### PR #144: the implementation that created the bridge

[PR #144](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/144) introduced the TipTap WYSIWYG editor twenty-one hours before the issue existed. My kickoff prompt was one line: "Read …/invoicing-tab-redesign.md and implement the plan."

The [design spec](https://github.com/nathanjohnpayne/friends-and-family-billing/blob/main/docs/invoicing-tab-redesign.md) was good. It chose TipTap JSON as canonical storage and described the output model plainly: "HTML is generated from JSON for Preview rendering. Email-safe HTML is generated from JSON for final outbound email rendering." That was essentially the invariant. The spec lived in my private notes vault throughout this work. It wasn't committed to the FFB repository until 2026-04-05, after the fix.

The spec also required `buildInvoiceBody` to handle both legacy plain-text templates and the new TipTap JSON. Claude flattened the new document into the old format through `docToPlainTextWithTokens()` and reused the existing pipeline. That met the compatibility requirement while losing the output model I'd asked for. In this implementation, the requirement with a named function and checkable behavior won over the architectural intention in prose. The structured document became a temporary stop on the way back to plaintext. That was the bug, a day before I filed the issue.

### PR #146: reviewed, approved, and aimed at the wrong layer

[PR #146](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/146) fixed bold-token round-tripping. The serializer started emitting bold-marked tokens as `**%token%**`, and the token regex learned to match both forms. That was a reasonable fix within the existing pipeline.

The `nathanpayne-codex` review, in full:

> External re-review: APPROVED. I re-reviewed the `invoice.js` fix for the two issue #145 findings. The balanced regex now leaves one-sided `**` as literal text, and `docToPlainTextWithTokens()` preserves bold-marked tokens as `**%token%**`, so the legacy plaintext fallback round-trips correctly. Verification in a clean worktree: exact round-trip repro cases, `npm ci`, `npm --prefix functions ci`, `npm test`, and `npm run build`.

There were zero blocking reviews and zero inline comments from either reviewer identity. `nathanpayne-claude` approved too. Neither review mentioned the invariant. The spec was still in my notes vault; it entered the repository twelve hours after the fix merged. This PR didn't reference it, and reviewers in clean worktrees couldn't have opened it anyway. Review confirms a diff against whatever standard the PR puts in front of it. This PR didn't put the rendering requirement there.

### PR #153: one part semantic patch, one part visual patch

[PR #153](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/153) bundled fixes for five tracked InvoicingTab bugs. Two show how the work stayed inside the existing pipeline. The serializer wrapped inline marks back into markdown:

```js
if (marks.some(m => m.type === 'bold')) result = '**' + result + '**';
if (marks.some(m => m.type === 'italic')) result = '*' + result + '*';
```

The preview got a CSS change to collapse spacing:

```css
.invoice-preview-message li p { margin-bottom: 0; }
.invoice-preview-message li p + p { margin-top: 2px; }
```

One patch improved markdown fidelity; the other changed Preview's styling. Both were locally valid and probably helped. They left the separate rendering paths in place.

### PR #154 and PR #155: real fixes, orthogonal to the bug

[PR #154](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/154) fixed `useEditor` recreating the editor on every keystroke. [PR #155](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/155) converted bold, italic, and links in legacy templates so they stopped appearing literally in the editor. Those were real bugs, and fixing them could make the session feel productive while the formatting differences remained.

[PR #155](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/155) also drew the pushback that [PR #146](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/146) hadn't: `nathanpayne-codex` submitted three `CHANGES_REQUESTED` reviews before approving it. Each flagged a round-trip safety failure, and each got a scoped fix. The reviewer kept finding ways the bridge lost formatting. The fixes kept the bridge. The spec had described the intended output model ten hours earlier, in a private document this PR didn't cite.

### PR #158: the bridge got cleaner

[PR #158](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/158) moved the serializer into `template-doc.js`. It had better boundaries and better round-tripping, and went through two more blocking review rounds. By then there was more competent work invested in the bridge, and more to reconsider if I removed it. The PR closed at 16:16 UTC. Thirty-six minutes later, I filed the issue.

## The review record

The six PRs had **seven** blocking review rounds:

| PR | `CHANGES_REQUESTED` rounds |
|---|---:|
| [#144](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/144) | 2 |
| [#146](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/146) | 0 |
| [#153](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/153) | 0 |
| [#154](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/154) | 0 |
| [#155](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/155) | 3 |
| [#158](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/158) | 2 |
| **Total** | **7** |

My session export reported nine `nathanpayne-codex` feedback items. It counted findings across a wider stretch of work: the two post-merge findings behind [issue #145](https://github.com/nathanjohnpayne/friends-and-family-billing/issues/145), a review on [#157](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/157), and a post-merge comment on #158 were included. Counting every review submission on the six gives nineteen; counting their blocking rounds gives seven. Those are different units and scopes.

The unpublished session log also records eighteen user prompts and three automated stop-hook interventions between them. One hook flagged that the plaintext fallback came from `editor.getText()` instead of the renderer. Even a machine had pointed at the divergent paths, and the work kept going.

<span id="the-moment-the-problem-got-a-name"></span>
<span id="the-brief-i-gave-the-second-agent"></span>

## The issue and the new brief

I filed [issue #159](https://github.com/nathanjohnpayne/friends-and-family-billing/issues/159) after [PR #158](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/158) closed. For the first time, the work treated editor, preview, and sent email as one problem. The issue attached the known-good email and made the invariant a requirement later work could be checked against. It stayed open under ninety minutes. The fix merged about sixty-five minutes after I filed it.

For the next attempt, I wrote a task document titled "Codex Task—Investigate Failed Fixes (Issue #159)." Like the session prompts, it's an unpublished author record, with no public link. It opened:

> Multiple fixes have already been attempted by Claude Code and **did not resolve the issue**. You MUST treat this as a **failed-fix investigation**, not a greenfield implementation.

The brief listed the prior PRs and required an audit before any new code. Of its eight steps, the first three were reading: understand the issue, audit the failed fixes, and identify the root cause. It stated the rendering requirement:

> There must be **one canonical rendering pipeline**. At minimum, **Preview and Sent Email must be generated from the exact same rendering path**.

Then it banned the approaches already tried:

> - Do NOT add another layer of transformation
> - Do NOT "fix" by overriding CSS only
> - Do NOT leave multiple rendering paths in place
> - Do NOT rely on regex to fix formatting
> - …
> - Do NOT optimize for minimal diff over correctness

The list came from the actual failures: CSS in [#153](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/153), regex in [#146](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/146) and [#155](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/155), another transformation layer in [#158](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/158), and the preference for a small patch throughout. It also specified six deliverables in all, including an audit of the wrong assumptions and regression tests proving Preview and email outputs structurally equivalent.

<span id="what-the-fix-changed"></span>

## What the April fix changed

The previous attempts all kept the markdown bridge. [PR #161](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/161) removed it from the **HTML body** of Preview and the **test email**. Its new payload builder returned canonical HTML and a separately built plain-text part:

```js
export function buildInvoiceTemplateEmailPayload(ctx, shareUrl) {
    return {
        html: renderInvoiceTemplate(ctx, shareUrl),
        text: buildInvoiceBody(ctx, 'text-only', shareUrl, 'email'),
    };
}
```

Preview consumed that HTML:

```js
const previewEmailPayload = buildInvoiceTemplateEmailPayload(ctx, previewShareUrl);
const previewBodyHTML =
    previewEmailPayload.html || renderInvoiceTemplate(ctx, previewShareUrl);
```

The test-email button beside Preview built a payload from the same function. Its handler prefixed the subject with `[Test]`:

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

At the time, the Cloud Function sent trusted app-generated HTML when a caller provided it. Preview and the test email now got their template body from `renderInvoiceTemplate`, which removed their separate interpretations of the same document.

Only one producer in the app supplied `html`: that `[Test]` send. The settlement board's per-member "Email Invoice" action sent `{ to, subject, body, uid }` with no `html`. The invoice a household member received still went through `docToPlainTextWithTokens` and `simpleMarkdownToHtml`. PR #161 changed eight files; `git show --stat` doesn't include `EmailInvoiceDialog.jsx` among them.

Before #161, test and invoice emails both sent `body` without `html` and rendered identically. The fix moved the test email onto canonical HTML and left the invoice on the bridge. That closed the gap where I'd reported the bug and opened a gap between the test email and the real invoice. It lasted from 2026-04-04 to 2026-09-30. A later evidence audit found it; the fix and my account at the time didn't.

The editor still rendered its own DOM, and the email's plain-text part still had a separate builder. The Playwright specs checked that bold applied in the editor reached Preview. None compared Preview HTML with email HTML or inspected the sent message, so the record doesn't establish whether the shared renderer preserved the editor's formatting. The recipient invoice also added envelope HTML outside the renderer: a branded header, a container, and a "Sent via Friends & Family Billing" footer. Those differences, visible in the screenshots, were deliberate.

The merged code therefore supported a narrower result than the issue requested: a shared renderer for the template body in Preview and the test email. The editor and recipient invoice stayed outside it. Evidence and commands are in [the facts ledger's §C40](https://github.com/nathanjohnpayne/nathanpaynedotcom/blob/86b5af34ee008aa796987a3487d3e58a5339dd2a/plans/759/project-pages-ledger.md#c40decision-record-3-the-invoice-a-household-member-receives-does-not-use-the-canonical-renderer).

## What changed on September 30

On 2026-09-30, [friends-and-family-billing#459](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/459) changed the mail queue for security reasons. Clients could no longer supply HTML. `queueEmail` wrote only a plain-text body, and the Cloud Function always rendered it with `simpleMarkdownToHtml`. The `[Test]` send began queueing the template's markdown serialization instead of `payload.html`.

Since that change, `renderInvoiceTemplate` feeds Preview only. Test and invoice emails both render server-side, from plain-text bodies their two call sites still build separately. Their gap closed by moving the test email back onto the bridge. Preview and the sent emails now use different renderers again; a semantic parity test guards their agreement. The brief's regression tests protected the shared path from April only while it lasted.

```mermaid title="Two renderers since 2026-09-30: the canonical one feeds the preview, the bridge carries both emails" description="Counting outbound email bodies only, as of 2026-09-30: the ProseMirror document renders the editor DOM directly—a third render, not an email path—and feeds one canonical template renderer, which now produces only the Invoicing tab preview. The test email, which used that renderer from 2026-04-04 until pull request 459, and the recipient invoice both go through a plain-text bridge that the Cloud Function converts with simpleMarkdownToHtml, so the two sent messages share an envelope and a renderer while the preview is the surface that differs."
graph TD
    A["TipTap /<br/>ProseMirror<br/>Document"] --> B["Editor DOM"]
    A --> C["Canonical<br/>Template<br/>Renderer"]
    A --> H["Plain-text bridge, then<br/>simpleMarkdown<br/>ToHtml (server)"]
    C --> D["Preview"]
    H --> E["Test Email<br/>(body +<br/>envelope)"]
    H --> J["Invoice Email<br/>(body +<br/>envelope)"]
    G["Envelope<br/>HTML"] --> E
    G --> J

    style A fill:#2c5f8a,stroke:#2c5f8a,color:#fff
    style B fill:#7bc67e,stroke:#4a8a4d,color:#333
    style C fill:#7bc67e,stroke:#4a8a4d,color:#333
    style D fill:#7bc67e,stroke:#4a8a4d,color:#333
    style E fill:#e8b4b4,stroke:#993d3d,color:#333
    style G fill:#e8e8e8,stroke:#999,color:#333
    style H fill:#e8b4b4,stroke:#993d3d,color:#333
    style J fill:#e8b4b4,stroke:#993d3d,color:#333
```

<span id="what-actually-varied"></span>

## What I can take from one run

"Codex is better than Claude Code at architecture" would be a convenient conclusion. So would "the difference was in the prompt structure, not the model." This run can't establish either. The model, tooling, accumulated session context, visibility of the six PRs, and task framing all changed together.

The framing was the part I controlled. After the kickoff, my prompts reported symptoms with increasing urgency, and the agent patched the code nearest each symptom. The new brief, given to Codex, asked for an explanation of the pattern of failures before any code, stated the invariant, and banned the approaches already tried. Forty-nine minutes after I filed the issue, the fix PR was open. Sixteen minutes later, it merged. I didn't rerun the work with the same agent or another one to isolate what helped. I shipped the fix.

## The rules I kept, and what they cost

After the merge, I kept four rules. Two are repository policies that bind every agent working here; two are personal practices I haven't made policy. Having a rule in a policy file gives review something to check, which the private design spec hadn't.

**Two failed fixes change the task.** The repository's [Two-strike audit rule](https://github.com/nathanjohnpayne/nathanpaynedotcom/blob/main/docs/agents/operating-rules.md#two-strike-audit-rule) requires the third attempt to start with an audit of the prior PRs: what each assumed and why it failed, before more code. On a shallow bug, that can be pure overhead. The rule can't tell me in advance which kind of bug I have.

**Review the format boundary.** The [Serialization layer review requirement](https://github.com/nathanjohnpayne/nathanpaynedotcom/blob/main/docs/agents/operating-rules.md#serialization-layer-review-requirement) asks three questions: is the round-trip lossless, do all consumers produce equivalent output, and is the intermediate format necessary? These questions target what went unchecked here. I don't know whether they'd have changed [PR #144](https://github.com/nathanjohnpayne/friends-and-family-billing/pull/144). They cost attention beyond the diff: reviewers have to apply them to the architecture, even when every patch is doing what it claims.

**Put the previous failures in the prompt.** This is personal practice. For a bug that crosses layers, I include banned approaches drawn from failures in that codebase. Making this list took reading six PRs. It takes operator work, and an overbroad ban can rule out a valid fix.

**Say which requirement wins.** This is also personal practice. When I ask for a new architecture and backward compatibility, I now state that the new path is canonical and list every surface it has to cover. Legacy support needs an explicit migration plan. That costs more work up front. The April fix shows why naming the surfaces matters: it never reached the recipient invoice, and the September change left only Preview on the canonical renderer.

The fix reached Preview and the test email, with the limits described above. The expensive part came before I filed the issue: six PRs of locally useful, reviewed work, and the formatting bug I kept reporting survived all of them.

I'd written the intended output model into the spec from the start. Writing it down wasn't enough. The spec lost to a function with a name and a test, and reporting the symptoms louder didn't change that. The requirement had to be attached to the work a reviewer could see.
