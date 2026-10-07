# Blog index and homepage: approval document

Updated on 2026-10-07 after owner copy approval. Draft: `codex/blog-index-voice` in the attached `blog-index-voice` worktree. Baseline: `68827d183093fdc9500c0263b1078751067ae2fd`, the deployed Perfect Score merge. This is the owner-approved copy and supporting implementation prepared for the PR; it has not been merged or deployed.

The patch was rebased onto current main `c28f782e6ede4c93395d5d6f2fc70606c12ed7c5`; the additional main change is a separate Five Across audit record and does not alter these article or template sources.

## Approval scope

This document shows all ten final blog cards, both introductions, and every supporting file change. The owner approved the copy in the chat on 2026-10-07, including the 270-character Perfect Score deck and the 261-character Silence deck, and requested two final changes before the PR: trim Every Reviewer and rename the shared source folder to site-copy with collection siteCopy. Both are applied. These three cards differ from main; the other seven retain their approved descriptions. Approval authority remains the owner's messages in the chat.

## Introductions and social preview

**Blog introduction and social preview: 111 characters**

> I build products with AI coding agents. I write about what I asked for, what shipped, and what I had to change.

**Homepage Writing introduction: 57 characters**

> I write about the products I build with AI coding agents.

Both use “products.” The homepage is a deliberately shorter rendition, rather than a near-duplicate. The blog introduction fits the social card, so that card uses the same description with no separate OG version. The visible page, its metadata and CollectionPage structured data, and the social card all read that one field.

Before, the blog and social template each held:

> A product manager’s notes on shipping real systems with AI coding agents—the architecture decisions, the failure modes, and what actually works.

Before, the homepage Writing introduction was:

> Selected writing on shipping software with AI coding agents—scope, review, and the decisions that don’t show up in the diff.

## All ten blog cards

Order matches the current index. Counts measure Unicode characters in the parsed frontmatter description, including spaces and punctuation, without the YAML quotes. The requested review band is 242–275 characters. All ten cards are within it. Every Reviewer is now 273 characters after the owner-requested punctuation trim.

**1. [The Product Did Not Travel](../../src/content/blog/the-product-did-not-travel.md): 242 characters; unchanged from main**

> A bingo app built for a cruise ran a second event for a different host. By Saturday afternoon, nobody was marking squares. The host's account sent me back to the cruise data, where a dinner ritual had been hiding inside the engagement totals.

**2. [Silence Is Not an Approval](../../src/content/blog/silence-is-not-an-approval.md): 261 characters; revised in this follow-up**

> My review pipeline kept counting a reviewer that hadn't answered as one that had. Local fixes helped, but each path still decided what silence could prove. I set a rule for one kind of silence and accepted the extra waiting. The broader contract isn't finished.

**3. [Every Reviewer Was Right, and the Pull Request Was Still Wrong](../../src/content/blog/every-reviewer-was-right.md): 273 characters; revised in this follow-up**

> Two pull requests drew 72 Codex findings. I couldn't fault one; both closed unmerged. One grew from 35 lines to 2,136 for a requirement that later shipped in 377. I was asked five times how to proceed, never whether the machinery under review still belonged in the product.

**4. [1,513 Lines for One Dash: The Requirement Nobody Questioned](../../src/content/blog/autofix-was-the-whole-cost.md): 246 characters; unchanged from main**

> I wanted this site to follow one Chicago rule. An unrequested auto-fixer drew 42 of 57 review findings; cutting it ended the rewrite-safety churn. Without an adapter, the replacement linter would've skipped post metadata and still reported green.

**5. [A Perfect Score on the Wrong Axis: 116 Review Findings, Zero Rejected, One Escape](../../src/content/blog/perfect-score-wrong-axis.md): 270 characters; revised in this follow-up**

> An eleven-PR batch recorded 122 dispositions; no finding was rejected as factually wrong. A P1 shipped; its post-merge finding joined the tally. The rule it broke had been raised on a sibling PR twelve hours earlier, then fixed and validated there before this PR merged.

**6. [The HTML Mock-up Is the Spec: How I Got Visual Work Out of Claude Code](../../src/content/blog/html-mockups-as-spec.md): 250 characters; unchanged from main**

> Claude kept giving me layouts that didn't match what I had in mind. I asked it for standalone HTML mock-ups, picked a target, then handed it back beside the live page: make this look like that. I still had to keep the decision and check what shipped.

**7. [Agent Approval Workflow and the Genesis of Mergepath](../../src/content/blog/agent-approval-workflow-genesis-of-mergepath.md): 274 characters; unchanged from main**

> The agents knew the review rule and still pushed straight to main. I added branch rules, reviewer identities, and automated outside review to make the process harder to skip. Three weeks of failures became the system behind Mergepath, with each control's limits spelled out.

**8. [Six PRs, One Bug: What AI Agents Actually Get Wrong](../../src/content/blog/six-prs-one-bug-agent-failure-modes.md): 263 characters; unchanged from main**

> My billing app showed different formatting in the editor, preview, and sent email. After six PRs, I gave the next agent a brief that required an audit before more code. The fix brought Preview and the test email together, but didn't reach the recipient's invoice.

**9. [Two Blues, One Composition: How a Design Critique Became a Forensics Exercise](../../src/content/blog/two-blues-one-composition.md): 243 characters; unchanged from main**

> Claude found two blues in my Mondrian-inspired projects page. I could defend both sources; the page still looked wrong. Sampling two painting reproductions helped me choose a palette rule, and showed which of the model's numbers had no source.

**10. [How Making a Page Responsive Led to a Full Astro Site Implementation](../../src/content/blog/how-a-responsive-fix-became-an-astro-migration.md): 249 characters; unchanged from main**

> Fixing a mobile bug put me face to face with a blog generator that couldn't reproduce its own output. Four hours later, an Astro scaffold merged. I chose a build chain to make publishing practical, knowing it would bring maintenance work of its own.

## Changed decks: before and after

**Perfect Score**

Before on main: 325 characters:

> An eleven-PR review batch recorded 122 dispositions and zero findings rejected as factually wrong. The finding for the P1 that shipped was deferred to follow-up 75 seconds after it was posted. The rule the defect turned on had been raised on a sibling PR twelve hours earlier; the implementation was then fixed and validated.

After: 270 characters:

> An eleven-PR batch recorded 122 dispositions; no finding was rejected as factually wrong. A P1 shipped; its post-merge finding joined the tally. The rule it broke had been raised on a sibling PR twelve hours earlier, then fixed and validated there before this PR merged.

The new deck explicitly places the finding after merge. “There before this PR merged” identifies the sibling as the location of the earlier fix and validation. Twelve hours still modifies when the rule was raised, rather than the fix or validation. “No finding was rejected as factually wrong” preserves the distinction from the two recorded process rebuttals. The finding joins the disposition tally, paying off the metric argument. The 75-second deferral interval is intentionally omitted from this shorter deck; it remains in takeaway 2, the body and the diagram.

**Silence**

Before on main: 255 characters:

> My review pipeline kept counting a reviewer that hadn't answered as one that had. Local fixes helped, but each path still decided what silence could prove. I had to decide the rule myself, including what progress should cost when the evidence was missing.

After: 261 characters:

> My review pipeline kept counting a reviewer that hadn't answered as one that had. Local fixes helped, but each path still decided what silence could prove. I set a rule for one kind of silence and accepted the extra waiting. The broader contract isn't finished.

The ending states the owner's decision and accepted cost. “One kind” preserves the partial scope. “Isn't finished” applies the owner's optional voice nit and leaves the wider contract incomplete from the article's dated vantage.

**Every Reviewer**

Before on main: 277 characters:

> Two pull requests drew 72 Codex findings. I couldn't fault one, and both closed unmerged. One grew from 35 lines to 2,136 for a requirement that later shipped in 377. I was asked five times how to proceed, never whether the machinery under review still belonged in the product.

After: 273 characters:

> Two pull requests drew 72 Codex findings. I couldn't fault one; both closed unmerged. One grew from 35 lines to 2,136 for a requirement that later shipped in 377. I was asked five times how to proceed, never whether the machinery under review still belonged in the product.

The owner's exact punctuation edit removes four characters without changing either claim or their relationship.

## Shared frontmatter

The new [site-copy entry](../../src/content/site-copy/blog.md) contains:

```yaml
---
title: "The AI-Augmented PM"
description: "I build products with AI coding agents. I write about what I asked for, what shipped, and what I had to change."
homepageWritingDescription: "I write about the products I build with AI coding agents."
---
```

It is loaded through Astro's new `siteCopy` collection, outside the blog-post collection. The owner-requested `site-copy` name distinguishes this content directory from Astro's `src/pages/` route directory. It does not create an eleventh post, change RSS ordering or alter the selected Writing links. The blog page and blog OG template read `title` and `description`; the homepage reads `homepageWritingDescription`. Every copy field has a consumer. There is no hardcoded fallback to the old introduction. The schema rejects blank fields, and the templates stop the build when their required entry or field is missing.

## Every supporting change

| File | Change |
|---|---|
| [src/content/site-copy/blog.md](../../src/content/site-copy/blog.md) | New shared frontmatter entry for the blog title/introduction/social copy and shorter homepage Writing introduction. |
| [src/content.config.ts](../../src/content.config.ts) | Registers the siteCopy collection with non-empty title/description and an optional, non-empty homepage Writing field. |
| [src/pages/blog/index.astro](../../src/pages/blog/index.astro) | Reads the shared page entry for the visible title, introduction, metadata and structured description; rejects a missing entry. |
| [src/pages/og-templates/blog.astro](../../src/pages/og-templates/blog.astro) | Reads the same title and description; removes the copied literals and rejects a missing entry. |
| [src/pages/index.astro](../../src/pages/index.astro) | Reads the homepage Writing rendition from the shared entry; rejects missing copy. Post title selection is unchanged. |
| [src/content/blog/perfect-score-wrong-axis.md](../../src/content/blog/perfect-score-wrong-axis.md) | Changes only description to the 270-character deck shown above. |
| [src/content/blog/silence-is-not-an-approval.md](../../src/content/blog/silence-is-not-an-approval.md) | Changes only description to the 261-character deck shown above. |
| [src/content/blog/every-reviewer-was-right.md](../../src/content/blog/every-reviewer-was-right.md) | Changes only description: the approved “, and both closed unmerged” becomes “; both closed unmerged,” bringing the card from 277 to 273 characters. |
| [plans/correctness-pass-2026-10-06/perfect-score-wrong-axis-ledger.md](../../plans/correctness-pass-2026-10-06/perfect-score-wrong-axis-ledger.md) | Updates existing R14/R21 descriptions and deck quotations in place; retains their evidence, verdicts and timings. |
| [tests/blog-pages.test.js](../../tests/blog-pages.test.js) | Checks rendered blog title/introduction/metadata, homepage Writing copy and actual OG-card text against the frontmatter source. Existing title assertions now use that source. |
| [screenshots/og/blog.png](../../screenshots/og/blog.png) | Refreshes only the blog-index social-card reference for the new introduction; generated output still comes from the build. |
| [docs/agents/code-modification-rules.md](../../docs/agents/code-modification-rules.md) | Documents where page copy lives, its consumers and missing-copy behavior. |
| [docs/agents/repository-overview.md](../../docs/agents/repository-overview.md) | Adds the shared page-copy source to the file inventory. |
| [.ai_context.md](../../.ai_context.md) | Adds the same source to the entry-point map. |
| [plans/correctness-pass-2026-10-06/blog-index-voice-comparison.md](../../plans/correctness-pass-2026-10-06/blog-index-voice-comparison.md) | This complete approval packet: all ten cards, introductions, file inventory, meaning review and validation. |

All three changed article bodies are byte-identical to main. Every other post frontmatter field, including SEO descriptions, titles, dates, ranks, takeaways and pullquotes, is unchanged. No article heading, anchor, table, diagram, code, link or image moves or changes. There are no layout, route or ordering changes, new dependencies, checker changes, or edits to the earlier batch's disputed comparison counts.

## Manual meaning review

| Claim | Evidence and qualification |
|---|---|
| Perfect Score: 122 dispositions and no factual rejection | Existing ledger R13 and the article's disposition table. Two rebuttals are process objections; the new deck does not call them factual rejections. |
| Perfect Score: finding after merge, then part of the tally | R14 records merge at 03:59:00Z, finding at 04:00:34Z and deferral at 04:01:49Z. The deck states the ordering; the body retains the 94- and 75-second intervals. |
| Perfect Score: sibling finding, fix and validation | R21 records the July 29 15:45:37Z blocking finding, July 30 00:34:51Z validation and 03:59:00Z merge. The twelve-hour label belongs only to the finding, and the earlier fix was on the sibling. |
| Silence: one rule and extra waiting | Its existing Decision section and ledger R29–R30 record the September 24 owner decision, September 25 implementation and accepted waits. Resume, retry, timeout and Codex failover remain. |
| Silence: wider contract incomplete | Existing ledger R31 and the body leave #878 open for the shared contract, remaining states and downstream delivery, as of the dated article snapshot. This is not a fresh issue-state audit. |
| Other seven cards | Their descriptions match the baseline exactly. The full index is shown here so these existing choices remain visible during approval. |

## Validation and checker exception

The final siteCopy rename and Every Reviewer trim build successfully across 43 pages. Lint passes; Vale retains advisory heading/table capitalization warnings under the sentence-case convention. Typecheck passes with zero errors and zero warnings. The complete unit suite passes 1,215 assertions with 6 skips, including the actual rendered OG-card/frontmatter regression. Source/rendered checks confirm all ten index cards, article decks and RSS descriptions match frontmatter, all ten article bodies match main byte for byte, every other post frontmatter field is unchanged, and every card is within 242–275 characters. The final browser suite passes 369 assertions with 51 skips against this exact build through the documented external-server fallback with file-by-file verification and the normal /404-to-/404.html mapping.

A controlled frontmatter mutation changed the blog page/metadata, homepage and generated OG image. The image changed by 147,585 pixels above the comparison threshold. Blank title, description or homepage text failed validation; a missing homepage field or whole entry stopped the build. The draft source was restored after each probe. The blog image's existing fit check passed and its new text was visually inspected.

For the current article sources, `verify-brevity.py` reports exactly one protected-token failure on Perfect Score: `75 seconds` occurs once less because it was deliberately removed from the deck. Its zero-to-no wording is advisory and preserves the rejection qualification. Every other protected token and every code/diagram/table block matches. Silence passes, with advisory notes for its description edit and the added word “one.” The checker is unchanged. This exception is supported by manual meaning review, not treated as proof of fidelity by the checker.

Connective prose remains unchanged for all three edited articles: 3,132 words for Perfect Score and 1,738 for Silence; Every Reviewer's edit is punctuation and one conjunction in frontmatter only. Whole-file counts change from 4,276 to 4,267 and from 3,073 to 3,075 respectively. These are metadata edits, not another body compression pass.

Chromium desktop hover/keyboard, mobile layout and reduced-motion probes passed. A WebKit probe initially timed out; a fresh-load check against both the deployed baseline build and this revised draft revealed the desktop content successfully. Both engines loaded the homepage, index and changed posts at 375px without overflow or uncaught script errors. This is Chromium/WebKit evidence; the native Safari app was not separately tested. Initial probe failures and the preview-runner fallback are preserved in the validation logs.
