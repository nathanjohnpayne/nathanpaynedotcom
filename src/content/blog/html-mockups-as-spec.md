---
title: "The HTML Mock-up Is the Spec: How I Got Visual Work Out of Claude Code"
seoTitle: "The HTML Mock-up Is the Spec"
shortTitle: "Mock-up as Spec"
description: "Asking Claude for more Mondrian did not work. Neither did annotated screenshots or diagrams. What worked was a standalone HTML mock-up, handed back beside the live page with one instruction: make this look like that."
seoDescription: "How standalone HTML mockups turned vague visual direction into a concrete spec Claude Code could diff against and implement on the live site."
category: "Agent Systems"
homepageRank: 5
author: "Nathan Payne"
date: 2026-05-19
tags: ["AI", "Product", "Design", "Engineering", "Workflow"]
image: "/og/blog/html-mockups-as-spec.png"
keyTakeaways:
  - "Hand a coding agent an artifact in the same medium as its output. A standalone HTML mock-up is a file it can read and diff against; an annotated screenshot is a picture it has to interpret."
  - "A mock-up is a temporary decision aid, not a durable spec—it holds a design steady only while the file exists. Transcribe its key characteristics into the issue, because the issue is what survives."
  - "Matching the mock-up is design acceptance, not production acceptance. A page can match pixel for pixel and still fail contrast, responsive, real-content, or performance bars—and those bars decide what ships."
  - "Prototype outside the production build. Design and re-implementation are different jobs, and production constraints win over design intent when an agent must do both at once."
pullquotes:
  - text: "I had been telling Claude what I wanted. The mock-up told it what I wanted."
    label: "Why the pivot worked"
    accent: blue
  - text: "Pasting an annotated screenshot is asking the agent to do art criticism. Pasting an HTML file is asking it to do diffs."
    label: "The reframe"
    accent: red
  - text: "The mock-up is unconstrained by the existing chassis, which is exactly why it can show Claude what good looks like."
    label: "Why the prototype runs free"
    accent: yellow
  - text: "Most of the mock-ups are gone. The issues that transcribed them, and kept two, are the reason the design decisions are still auditable."
    label: "What survives"
    accent: blue
  - text: "Visual acceptance and production acceptance are different bars. The 3.1 MB hero image on this post is the gap between them, live."
    label: "Beyond resemblance"
    accent: red
---

I am not an engineer. I am a product manager, and for the first weeks of working on nathanpayne.com with Claude Code, design intent kept losing something on the way to the shipped page. I knew the look—the homepage is a Mondrian grid, and I wanted the rest of the site in that idiom—but I could not get "more Mondrian, less LinkedIn" to land as a CSS diff. The loss was not in what the agent could build. It was in the artifact carrying the intent.

What unstuck me was not a better prompt or a smarter model. It was a different artifact. I stopped describing the design and started prototyping it: ask Claude to build a standalone HTML mock-up, approve it, then hand the mock-up and the existing page back and say make this look like that. The rest of this post is why the obvious moves failed, how the pattern held across four surfaces in two codebases, and why the durable record turned out to be the issue thread, with the file it kept, not the mock-up on my disk.

![Piet Mondrian's grid composition with my homepage section labels dropped on top—Nathan Payne in red, Connect in yellow, Vibe Coding (now Builds) in black, Community in blue. This was the original reference; every page on the site is downstream of it.](/blog/html-mockups-as-spec/img/mondrian-inspiration.jpg)

## What I tried first

The first move: point Claude at the existing page and describe the change in prose. "Make the blog index more Mondrian. Red, blue, yellow, black. Asymmetric grid. Featured post gets the largest cell." The grid came back closer to a Bootstrap card list with a red border than to a De Stijl composition, and saying "more Mondrian" louder did not help. Pointing at the homepage—already a Mondrian grid—mostly got me a copy of the homepage.

The second move: diagrams. Sketch the grid in a notebook, photograph it, paste it into the chat. Claude described the diagram back accurately, down to which cell spanned two columns, then produced code that did not match its own description. I cannot say why; observably, the picture-to-code handoff lost information that the file-to-code handoff, later, did not.

The third move: annotated screenshots—arrows, red boxes, notes giving a width and a color. The agent treated the annotations as a punch list rather than a target state. I got the red box where the arrow pointed, and a layout otherwise untouched.

A caveat: these attempts were sequential, not controlled. Prompts, context, my idea of the target, and iteration counts all changed between rounds; the medium was never the only variable. This is a case series—four surfaces where switching the artifact coincided with the work landing—not a measured property of coding agents.

The pattern: prose, diagrams, and screenshots asked the agent to interpret a description and write code to match. An HTML file asked it to read a file and produce one that resembled it. The second framing worked.

```mermaid title="Prose iteration loop versus mockup-first path" description="Describing a design in prose cycles through tweaks and mismatch; building and approving a standalone mockup creates a direct specification that the live page can match. The two were tried in sequence rather than compared under control, so this is a case series and not a measured result." caption="Not a controlled comparison: the two paths were tried in sequence, and prompts, context and target all moved between rounds."
graph TD
    A["Describe the design<br/>in prose"] --> B["Claude tweaks the<br/>existing page"]
    B --> C["Result does not match<br/>what's in my head"]
    C --> A
    D["Ask Claude to build a<br/>standalone HTML mock-up"] --> E["Approve, refine,<br/>iterate the mock-up"]
    E --> F["Hand mock-up + live page<br/>to Claude: 'match this'"]
    F --> G["Live page now matches<br/>the mock-up"]
    style A fill:#e8b4b4,stroke:#993d3d,color:#333
    style B fill:#e8b4b4,stroke:#993d3d,color:#333
    style C fill:#993d3d,stroke:#993d3d,color:#fff
    style D fill:#b8ddb8,stroke:#4a8a4d,color:#333
    style E fill:#b8ddb8,stroke:#4a8a4d,color:#333
    style F fill:#b8ddb8,stroke:#4a8a4d,color:#333
    style G fill:#7bc67e,stroke:#4a8a4d,color:#333
```

## The pivot: build the mock-up first

The unlock came with [issue #75](https://github.com/nathanjohnpayne/nathanpaynedotcom/issues/75), which asked for a Mondrian grid layout for the blog index. Instead of describing the design, I asked Claude to build candidate HTML mock-ups, each in its own file—no Astro, no Content Collections, no build pipeline, one inline style block plus a Google Fonts link, openable in a browser at desktop and mobile widths. The criteria, as best I can reconstruct them: something the agent could read rather than interpret, cheap enough that several divergent candidates were worth asking for, and concrete enough that "does the page match" became a checkable question instead of a feeling.

Claude produced four files—`A-cards-grid.html`, `B-de-stijl-index.html`, `C-composition-margins.html`, `D-minimal.html`—and I picked Mockup B: featured-post cell in the top left, a red accent block top middle, a blue block with a vertical "LATEST" label on the right, yellow and a neutral RSS block farther down, collapsing to a single column on mobile. Each was deliberately small—one representative example of each kind of content, the site's fonts and color tokens, the first real post as sample content—so four candidates cost less than one production page.

Those files were never committed—this repository's history contains no `mockups/` directory and no commit adding any of the four—and they lived on my disk only while the decision was open. One survives anyway, because the issue kept it: Mockup C is [attached to issue #74](https://github.com/nathanjohnpayne/nathanpaynedotcom/issues/74#issuecomment-4216265971), with a screenshot, and opens today. B is corroborated by name only, in issue #75. `A-cards-grid.html` and `D-minimal.html` appear in no surviving record: you have my memory that they existed, and nothing else.

What survives is the move that mattered more than I understood at the time. I opened issue #75 and wrote the chosen mock-up's key characteristics into its design section. The issue formats them as bullets; condensed to prose:

> Mockup B from `mockups/B-de-stijl-index.html`. Key characteristics: featured post in the largest cell (top-left), spanning multiple rows—echoes the red panel on the homepage. Accent blocks: red (top-mid), blue with vertical "Latest" label (top-right, spanning rows), yellow (bottom-right). Older posts fill progressively smaller cells. RSS CTA: neutral block with subscribe link. 9px black grid lines between all cells.

That transcription is why the design decision is still auditable. The mock-up was the working spec; the issue is the durable record of what it specified, down to 9px grid lines a reader can still check against the live page.

Then I asked Claude to read the mock-up alongside `src/pages/blog/index.astro` and make the live page render like it. The result was [PR #77](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/77): the card-list blog index replaced with a Mondrian-style row grid. The PR's title—which became the squash-commit subject—says it plainly: "Blog index: De Stijl Mondrian row grid from mockup."

There is a turn in that chain, and the issue thread records it. Issue #75 names the chosen artifact `mockups/B-de-stijl-index.html`. PR #77's own body never mentions that file; the only mock-up it names is `blog-landing 2.html`, a different design, not the same file under two names. Partway through the day I had posted a screenshot of a row-based mock-up as "the source of truth", worked through two rounds of fixes against it, the second from a twenty-item comparison, and then written "Still not right. Let's try another approach. Build exactly like this HTML mockup."—[attaching `blog-landing 2.html`](https://github.com/nathanjohnpayne/nathanpaynedotcom/issues/75#issuecomment-4217399086): one post per row, one real post, two placeholders. The fresh plan an hour later names that file as its source of truth, and PR #77 opened thirteen minutes after the plan. So the shipped grid matches `blog-landing 2.html`, which also survives as an attachment, and it never matched Mockup B's spanning featured cell.

The same pattern gave the post template [PR #76](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/76), driven by [issue #74](https://github.com/nathanjohnpayne/nathanpaynedotcom/issues/74) and Mockup C, the one candidate whose file survives. The issue's parallel line reads: "Mockup C from `mockups/C-composition-margins.html`. Key characteristics:". The layout rendering the post you are reading—three-column canvas, accent margin on the left, a sidebar on the right that scrolls with the page, metadata that collapses into a horizontal accent bar on narrow screens—came out of that issue.

Pace is harder to show than it felt. Issues #74 and #75 each opened and closed inside a single day, and PRs #76 and #77 were open for between fifteen minutes and half an hour before merging—administrative intervals that measure no design effort, since neither the mock-up round trips nor the prose attempts before them left a timed trace. The defensible claim is qualitative: once there was a file to implement against, the implementation landed essentially at once; while there wasn't, it kept not landing.

## The 404 page: a public prototype and a private shortcut

The 404 page took the same shape with two differences.

The first difference: the prototype was not something Claude built. It was [Jen Simmons' Mondrian Art in CSS Grid series](https://labs.jensimmons.com/2017/01-011.html)—public, self-contained examples of exactly the asymmetric composition I wanted, still open in her layout lab. The CSS comment in `src/styles/global.css` credits it as a CodePen; that pen has since been deleted, the lab pages have not:

```css
/* ── 404 Page: Mondrian Grid ────
   Asymmetric grid inspired by Jen Simmons' Mondrian CSS Grid CodePen.
   Content cell spans multiple tracks; decorative blocks fill remaining cells.
   Collapses to single column on mobile with blocks hidden. ── */
```

The second difference is less flattering: no pull request shipped this page. [Issue #90](https://github.com/nathanjohnpayne/nathanpaynedotcom/issues/90) is an SEO best-practices task, and the page landed in commit [`4076bf6`](https://github.com/nathanjohnpayne/nathanpaynedotcom/commit/4076bf6), a single-parent commit pushed directly to `main`, closing #90. In a post about a disciplined design-to-implementation workflow, with a companion piece on making direct pushes to `main` mechanically impossible, that stays in: the FFB example below turns on exactly this failure being caught in another repository, and here is an instance in my own. Two genuine pull requests then refined the page—[PR #91](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/91) removed the Firebase rewrite that had been sending every 404 to the SPA shell, which is why the site had no real 404 page until then, and [PR #92](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/92) aligned the colors with the homepage palette.

What the 404 case adds: the reference does not have to be something Claude produced, only something Claude can read—and a public one can outlive its first home, as this one outlived its CodePen.

## The same trick in an app: the FFB template editor

[Friends & Family Billing](/projects/friends-and-family-billing/) (FFB) is the app I built to handle utility splits in my household. Its invoicing tab—where a user authors the email template that goes out with each invoice—needed a full visual overhaul. Prose got me the same wrong-tweaks result the blog index had, so I asked Claude for a self-contained HTML mock-up of the target editor: a single card holding the subject row, a unified token chip bar, the formatting toolbar, the body editor, and a sticky save footer, with pill-shaped Edit/Preview tabs above. Static HTML and CSS—no TipTap, no React, no token logic.

![The shipped FFB invoice-template editor, not the mock-up, captured after the Save template button had moved up beside the pill-shaped Edit/Preview tabs: below them, a single card holding the subject row, the formatting toolbar, a unified token chip bar (First Name, Last Name, Household Total, and the rest), and the body editor with inline tokens and a Payment Methods block.](/blog/html-mockups-as-spec/img/ffb-editor-mockup.png)

That screenshot is the result, not the artifact: the mock-up put the save control in a sticky footer, and the fix for [FFB issue #176](https://github.com/nathanjohnpayne/friends-and-family-billing/issues/176) moved it into the header three days later; the mock-up itself did not survive.

I handed Claude the mock-up and the live `InvoicingTab.jsx` with its stylesheets and asked for a match. The work landed as commit [`20dcb32`](https://github.com/nathanjohnpayne/friends-and-family-billing/commit/20dcb32), titled, literally, "fix: redesign editor layout to match mockup and fix editability."

The follow-up record is the most useful part. The agent pushed that commit directly to `main` without a PR—the same failure mode as the 404 commit above, caught this time by that repository's post-merge review policy, which logged it as a policy violation in [issue #145](https://github.com/nathanjohnpayne/friends-and-family-billing/issues/145). The handoff summary the authoring agent wrote for the external reviewer opens: "Restructures the InvoicingTab editor to match the target mockup," and runs through the design items—the single-card layout, the unified chip bar, the sticky save footer with its "Last saved" timestamp, the redesigned Preview tab with a footer-positioned send button—each a decision made in the mock-up rather than a sentence in a prompt. The external reviewer, who had never seen my prompts, reported two bugs in the token-migration path and said nothing about the layout. A cold reader naming the target would be a fair test of a well-specified design; this record does not supply one.

What FFB adds is surrounding complexity. The blog index and 404 page are static layouts; this editor is a TipTap-backed rich-text surface with token nodes and migration logic—room for an agent to get lost. The mock-up kept the layout decision orthogonal to all of it: the layout work stayed clean while a genuinely architectural problem lived in the same file, the markdown bridge that took a session of six pull requests and a reframed brief to remove, written up in [Six PRs, One Bug](/blog/six-prs-one-bug-agent-failure-modes/). A mock-up answers what the page should look like; an invariant answers what the system should do.

## Four surfaces, one table

| Surface | Input artifact | Selection and acceptance | Record | Quality bar | Outcome | What a reader can inspect |
|---|---|---|---|---|---|---|
| Blog index | `blog-landing 2.html`—the row-grid mock-up that replaced Mockup B mid-issue; never committed, attached to issue #75 | I picked B of four candidates, replaced it with the row grid when B's rounds failed, and accepted the PR | [Issue #75](https://github.com/nathanjohnpayne/nathanpaynedotcom/issues/75) → [PR #77](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/77), whose body names `blog-landing 2.html` | Match `blog-landing 2.html`; a passing build and manual visual checks (no CI test gate existed until 2026-08-19) | Shipped and still matching that file: one post per row, the 9px rules, row two's post column 72% wide against row one's 50% on the live [/blog/](/blog/). It never matched Mockup B's spanning featured cell | Issue #75's transcription and thread, with the attached file; PR #77's body; the live [blog index](/blog/) |
| Post template | Mockup C—agent-generated local HTML, never committed, attached to issue #74 with a screenshot | I picked C and accepted the PR | [Issue #74](https://github.com/nathanjohnpayne/nathanpaynedotcom/issues/74) → [PR #76](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/76) | Match Mockup C; the same build-and-eyeball bar | Shipped; it renders the page you are reading, minus the sticky sidebar [PR #82](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/82) removed the same day | Issue #74's transcription, file and screenshot; the layout of this page |
| 404 page | [Jen Simmons' Mondrian grid demos](https://labs.jensimmons.com/2017/01-011.html)—public, still live in her layout lab; the CodePen is gone | I chose the reference | [Issue #90](https://github.com/nathanjohnpayne/nathanpaynedotcom/issues/90) → commit [`4076bf6`](https://github.com/nathanjohnpayne/nathanpaynedotcom/commit/4076bf6), direct to `main`, no PR; refined in [PR #91](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/91) and [PR #92](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/92) | Visual target first; refinements followed | Shipped, but not reachable until #91 removed the Firebase rewrite, and the palette took one further PR, #92 | The lab demos; the CSS comment; both refinement PRs |
| FFB editor | Agent-built HTML mock-up, not preserved; the screenshot above is the shipped page | I accepted the mock-up as the target | Commit [`20dcb32`](https://github.com/nathanjohnpayne/friends-and-family-billing/commit/20dcb32); policy review in FFB [issue #145](https://github.com/nathanjohnpayne/friends-and-family-billing/issues/145) | Match the mock-up and fix editability | Shipped and matched, per the authoring agent's handoff; the external reviewer found two migration bugs and no layout issues—and the commit bypassed review to get there | The shipped page; #145's handoff summary and external review |

Two things to read out of the table. The division of labor: Claude generated the candidates and the implementations; selecting the artifact, transcribing it into the issue, and accepting the result were my calls. And the failure rate: two of the four rows record a direct push to `main`. The workflow disciplined the design; it did not, by itself, discipline the process. That class of gap is what [Mergepath](/projects/mergepath/) exists to close; branch protection now requires a pull request from every identity short of the repository administrator—an exemption the record shows still in use.

## Why the swap worked

Three things changed at once when the input became an HTML file, and I cannot separate their contributions. The medium matched the output. Pasting an annotated screenshot is asking the agent to do art criticism. Pasting an HTML file is asking it to do diffs.

The prototype ran outside the production build. A mock-up has no schema to satisfy, no test suite to pass, no routing to respect, so the agent could iterate on it purely as a visual artifact; production constraints became a re-implementation problem afterward rather than a design problem during. Pointed at the live page directly, the agent did both jobs at once, and the constraints it could verify kept winning over the design intent it could not.

And the mock-up forced me to commit. Once I had opened a file in a browser and said yes to it, the question shifted from "what do I want this to look like" to "why doesn't this match"—and the second is answerable with a diff.

The first version of this post claimed a fourth thing, and I retract it: that the mock-up was a spec that does not drift, because the agent re-reads the file instead of remembering the conversation—"Specs that live in prose drift with every prompt. Specs that live in HTML do not." True exactly as long as the file exists and stays the target—and mine did neither. A deleted file cannot be re-read on a later prompt, cannot serve as a regression oracle, and cannot be diffed against the page a year on; a replaced one specifies a page that was never built. The blog index is the replaced case: its grid has not drifted off Mockup B, because it was never built to Mockup B, and it still matches the file I swapped in. The mock-up is a temporary decision aid—excellent at holding a design steady across the days a decision is open, gone the day after it is deleted or superseded. The durable artifact in this workflow is the issue, with whatever it transcribes and whatever it keeps; that issue #75 kept both the transcription of B and the file that replaced it is the only reason half of this post can cite evidence at all.

## "Do they match" is not the whole bar

At the time I treated one check as the whole acceptance test: open the mock-up and the production page side by side, and "that is the only acceptance criterion that matters: do they match." This repository disagrees. The required workflow runs `npm test`, `npm run lint` and, since 2026-09-12, the browser-driven Playwright responsive suite, and a page that matched its mock-up pixel for pixel would still be stopped by checks that know nothing about design intent: a test that renders the site's Mermaid diagrams and fails the build on WCAG AA contrast violations, CSS assertions pinning the responsive invariants, SEO plumbing validated at build time. Even the responsive suite is a recent gate: `npm run test:e2e` was deliberately manual and absent from CI, so a responsive regression could pass every blocking gate, until [#1022](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/1022) made it a required step. Matching the mock-up is design acceptance. Production acceptance additionally covers responsive behavior, accessibility, real-content stress—the mock-ups carried one featured post and a couple of placeholders, not a real archive—interaction correctness, and performance.

And since performance is on that list: the hero image at the top of this post is a 3.1 MB JPEG. It matched the visual intent, and nothing in "do they match" would ever flag it. It stays as the cheapest demonstration of the argument—the post that says visual acceptance and production acceptance are different bars is itself sitting on the wrong side of one.

## The operating model, revised

The workflow has four steps. Ask for divergent candidates: two or three self-contained HTML mock-ups, inline styles, no build dependencies, openable by double-click. Converge: open them at desktop and mobile widths and pick one, or ask for variants on the closest. Transcribe and attach: write the winner's key characteristics into the issue and attach the file, because the mock-up will not outlive the decision on its own and the issue is the record that will. Implement and verify: hand the agent the mock-up, the issue, and the live page; review the result against the mock-up for design, and against the production gates the mock-up knows nothing about for everything else.

The generalization is not "write HTML first." It is: when the target is an outcome the agent will express as code, hand it a small, self-contained artifact in the same medium as the output—and keep a durable transcription of what that artifact decided, somewhere its deletion cannot reach. For a CLI's behavior, a transcript of the exact interaction rather than a description of it. For an API's response shape, a JSON example rather than a field list. For a tone of voice, a paragraph of approved text rather than a list of adjectives. The disposable artifact does the specifying; the durable record does the remembering. This post is the case study for needing both: the two blog layouts this site still runs were specified by Mockup C and the row grid that replaced Mockup B—files I deleted, and issues #74 and #75 kept.
