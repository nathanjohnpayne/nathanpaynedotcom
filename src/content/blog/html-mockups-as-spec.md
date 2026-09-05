---
title: "The HTML Mock-up Is the Spec: How I Got Visual Work Out of Claude Code"
seoTitle: "The HTML Mock-up Is the Spec"
shortTitle: "Mock-up as Spec"
description: "Pointing Claude at a page and asking for more Mondrian did not work. Neither did annotated screenshots or diagrams. What worked: have Claude build a standalone HTML mock-up first, then hand the mock-up and the live page back and say make this look like that."
seoDescription: "How standalone HTML mockups turned vague visual direction into a concrete spec Claude Code could diff against and implement on the live site."
category: "Agent Systems"
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
  - text: "The mock-ups are gone. The issues that transcribed them are the reason the design decisions are still auditable."
    label: "What survives"
    accent: blue
  - text: "Visual acceptance and production acceptance are different bars. The 3.1 MB hero image on this post is the gap between them, live."
    label: "Beyond resemblance"
    accent: red
---

I am not an engineer. I am a product manager, and for the first month of working on nathanpayne.com with Claude Code, design intent kept losing something on the way to the shipped page. I knew the look—the homepage is a Mondrian grid, and I wanted the rest of the site in that idiom—but I could not get "more Mondrian, less LinkedIn" to land as a CSS diff. The loss was not in what the agent could build. It was in the artifact carrying the intent.

What unstuck me was not a better prompt or a smarter model. It was a different artifact. I stopped describing the design and started prototyping it: ask Claude to build a standalone HTML mock-up, approve it, then hand the mock-up and the existing page back and say make this look like that. The rest of this post is why the obvious moves failed, how the pattern held across four surfaces in two codebases, and what I found when I went back to check the record—including that the mock-ups at the center of the story no longer exist.

![Piet Mondrian's grid composition with my homepage section labels dropped on top—Nathan Payne in red, Connect in yellow, Vibe Coding (now Builds) in black, Community in blue. This was the original reference; every page on the site is downstream of it.](/blog/html-mockups-as-spec/img/mondrian-inspiration.jpg)

## What I tried first

The first move: point Claude at the existing page and describe the change in prose. "Make the blog index more Mondrian. Red, blue, yellow, black. Asymmetric grid. Featured post gets the largest cell." The grid came back closer to a Bootstrap card list with a red border than to a De Stijl composition, and saying "more Mondrian" louder did not help. Pointing at the homepage—already a Mondrian grid—mostly got me a copy of the homepage.

The second move: diagrams. Sketch the grid in a notebook, photograph it, paste it into the chat. Claude described the diagram back accurately—"a 3×3 grid where the top-left cell spans two columns"—then produced code that did not match its own description. Nothing in the record establishes why. Observably, the picture-to-code handoff lost information that the file-to-code handoff, later, did not.

The third move: annotated screenshots—arrows, red boxes, notes like "this column should be 22% wide and red." The agent treated the annotations as a punch list rather than a target state. I got the red box where the arrow pointed, and a layout otherwise untouched.

A caveat the first version of this post skipped: these attempts were sequential, not controlled. Prompts, context, my idea of the target, and iteration counts all changed between rounds; the medium was never the only variable. This is a case series—four surfaces where switching the artifact coincided with the work landing—not a measured property of coding agents.

The pattern: prose, diagrams, and screenshots asked the agent to interpret a description and write code to match. An HTML file asked it to read a file and produce one that resembled it. The second framing worked.

```mermaid title="Prose iteration loop versus mockup-first loop" description="Describing a design in prose cycles through tweaks and mismatch; building and approving a standalone mockup creates a direct specification that the live page can match."
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

The unlock came with [issue #75](https://github.com/nathanjohnpayne/nathanpaynedotcom/issues/75), which asked for a Mondrian grid layout for the blog index. Instead of describing the design, I asked Claude to build candidate HTML mock-ups, each in its own self-contained file—no Astro, no Content Collections, no build pipeline, just inline CSS, openable in a browser at desktop and mobile widths. The criteria, as best I can reconstruct them: something the agent could read rather than interpret, cheap enough that several divergent candidates were worth asking for, and concrete enough that "does the page match" became a checkable question instead of a feeling.

Claude produced four files—`A-cards-grid.html`, `B-de-stijl-index.html`, `C-composition-margins.html`, `D-minimal.html`—and I picked Mockup B: featured-post cell in the top left, a red accent block top middle, a blue block with a vertical "LATEST" label on the right, yellow and cream farther down, collapsing to a single column on mobile. The agent generated the alternatives; choosing among them was mine. Each mock-up was deliberately small—full HTML, an inline style block, one representative example of each kind of content, the site's fonts and color tokens, no real data—so four candidates cost less than one production page.

Said plainly, because the first version of this post got it wrong in a way that matters: those files do not exist. They were never committed—this repository's history contains no `mockups/` directory and no commit adding any of the four. They lived on my disk while the decision was open, and they are gone. The earlier version described them in the present tense, as if a reader could open them; a reader cannot. Only B and C are corroborated anywhere—by name, in the issues that consumed them. `A-cards-grid.html` and `D-minimal.html` appear in no surviving record: you have my memory that they existed, and nothing else.

What survives is the move that mattered more than I understood at the time. I opened issue #75 and wrote the chosen mock-up's key characteristics into its design section. The issue formats them as bullets; condensed to prose:

> Mockup B from `mockups/B-de-stijl-index.html`. Key characteristics: featured post in the largest cell (top-left), spanning multiple rows—echoes the red panel on the homepage. Accent blocks: red (top-mid), blue with vertical "Latest" label (top-right, spanning rows), yellow (bottom-right). Older posts fill progressively smaller cells. RSS CTA: neutral block with subscribe link. 9px black grid lines between all cells.

That transcription is why the design decision is still auditable. The mock-up was the working spec; the issue is the durable record of what it specified, down to 9px grid lines a reader can still check against the live page.

Then I asked Claude to read the mock-up alongside `src/pages/blog/index.astro` and make the live page render like it. The result was [PR #77](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/77): the card-list blog index replaced with a Mondrian-style row grid. The PR's title—which became the squash-commit subject—says it plainly: "Blog index: De Stijl Mondrian row grid from mockup."

There is a seam in that chain, and I am leaving it visible. Issue #75 names the chosen artifact `mockups/B-de-stijl-index.html`. PR #77's own body never mentions that file. The only mock-up it names—in its summary, its acceptance criteria, and a self-review asserting element-for-element structural match—is `blog-landing 2.html`, a filename that appears nowhere in the four-candidate list and nowhere in issue #75. Perhaps the same file went by two names on my disk; perhaps the implementation tracked a different iteration than the one the issue specified. The record does not settle it, and since neither file survives, nothing can. That is the cost of running a spec out of uncommitted scratch files: I believe the shipped grid matches Mockup B, and the issue's transcription is consistent with the page, but the PR's own paper trail points at an artifact I cannot produce.

The same pattern gave the post template [PR #76](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/76), driven by [issue #74](https://github.com/nathanjohnpayne/nathanpaynedotcom/issues/74) and Mockup C—the second of the two mock-ups whose name survives, in the issue's parallel line: "Mockup C from `mockups/C-composition-margins.html`. Key characteristics:". The layout rendering the post you are reading—three-column canvas, accent margin on the left, sticky sidebar on the right, metadata in a horizontal accent bar—came out of that issue.

On pace, the record holds only administrative intervals: issues #74 and #75 each opened and closed inside a single day, and PRs #76 and #77 were open for between fifteen minutes and half an hour before merging. None of that measures design effort—the mock-up round trips left no trace, and the prose attempts that preceded them are not timed anywhere. The defensible speed claim is qualitative: once there was a file to implement against, the implementation landed essentially at once; while there wasn't, it kept not landing.

## The 404 page: a public prototype and a private shortcut

The 404 page took the same shape with two differences; the first version of this post misstated the second.

The first difference: the prototype was not something Claude built. It was [Jen Simmons' Mondrian CSS Grid CodePen](https://codepen.io/jensimmons/pen/JJpGgw)—a public, self-contained, viewable example of exactly the asymmetric composition I wanted, and, unlike my mock-ups, an artifact a reader can still open. The CSS comment in `src/styles/global.css` credits it by name:

```css
/* ── 404 Page: Mondrian Grid ────
   Asymmetric grid inspired by Jen Simmons' Mondrian CSS Grid CodePen.
   Content cell spans multiple tracks; decorative blocks fill remaining cells.
   Collapses to single column on mobile with blocks hidden. ── */
```

The second difference is less flattering. The earlier version said the page shipped in "PR #90." [#90](https://github.com/nathanjohnpayne/nathanpaynedotcom/issues/90) is an issue—an SEO best-practices task—and no pull request shipped this page. It landed in commit [`4076bf6`](https://github.com/nathanjohnpayne/nathanpaynedotcom/commit/4076bf6), a single-parent commit pushed directly to `main`, closing that issue; GitHub's API associates no PR with it. In a post about a disciplined design-to-implementation workflow, whose companion piece is about making direct pushes to `main` mechanically impossible, that line stays in: the FFB example below turns on exactly this failure being caught in another repository, and here is an instance in my own. Two genuine pull requests then refined the page—[PR #91](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/91) removed the Firebase rewrite that had been sending every 404 to the SPA shell, which is why the site had no real 404 page until then, and [PR #92](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/92) aligned the colors with the homepage palette.

What the 404 case adds: the reference does not have to be something Claude produced, only something Claude can read—and the public one has the extra virtue of still existing.

## The same trick in an app: the FFB template editor

[Friends & Family Billing](/projects/friends-and-family-billing/) (FFB) is the app I built to handle utility splits in my household. Its invoicing tab—where a user authors the email template that goes out with each invoice—needed a full visual overhaul. Prose got me the same wrong-tweaks result the blog index had, so I asked Claude for a self-contained HTML mock-up of the target editor: a single card holding the subject row, a unified token chip bar, the formatting toolbar, the body editor, and a sticky save footer, with pill-shaped Edit/Preview tabs above. Static HTML and CSS—no TipTap, no React, no token logic.

![The HTML mock-up of the FFB invoice-template editor: pill-shaped Edit/Preview tabs and a Save template button above a single card holding the subject row, a unified token chip bar (First Name, Last Name, Household Total, and the rest), the formatting toolbar, and the body editor with inline tokens and a Payment Methods block.](/blog/html-mockups-as-spec/img/ffb-editor-mockup.png)

That screenshot is the only surviving image of any mock-up in this story—the one place a reader can inspect a chosen artifact rather than a transcription of one.

I handed Claude the mock-up and the live `InvoicingTab.jsx` with its stylesheets and asked for a match. The work landed as commit [`20dcb32`](https://github.com/nathanjohnpayne/friends-and-family-billing/commit/20dcb32), titled, literally, "fix: redesign editor layout to match mockup and fix editability."

The follow-up record is the most useful part. The agent pushed that commit directly to `main` without a PR—the same failure mode as the 404 commit above, caught this time because that repository had review machinery watching—which triggered a policy-violation review in [issue #145](https://github.com/nathanjohnpayne/friends-and-family-billing/issues/145). (That class of gap is what [Mergepath](/projects/mergepath/) exists to close; branch protection now rejects a direct push to `main` server-side.) The external review summary opens: "Restructures the InvoicingTab editor to match the target mockup," and runs through the design items—the single-card layout, the unified chip bar, the sticky save footer with its "Last saved" timestamp, the redesigned Preview tab with a footer-positioned send button—each a decision made in the mock-up rather than a sentence in a prompt. A reviewer that had never seen my prompts read the diff cold and described the work by reference to the mock-up. That is a fair test of a well-specified design: if a cold reader of the code can name the target it was built against, the target did its job.

What FFB adds is surrounding complexity. The blog index and 404 page are static layouts; this editor is a TipTap-backed rich-text surface with token nodes and migration logic—room for an agent to get lost. The mock-up kept the layout decision orthogonal to all of it: the layout work stayed clean while a genuinely architectural problem lived in the same file, the markdown bridge that took a session of six pull requests and a reframed brief to remove, written up in [Six PRs, One Bug](/blog/six-prs-one-bug-agent-failure-modes/). A mock-up answers what the page should look like; an invariant answers what the system should do.

## Four surfaces, one table

| Surface | Input artifact | Selection and acceptance | Record | Quality bar | Outcome | What a reader can inspect |
|---|---|---|---|---|---|---|
| Blog index | Mockup B—agent-generated local HTML, never committed | I picked B of four candidates and accepted the PR | [Issue #75](https://github.com/nathanjohnpayne/nathanpaynedotcom/issues/75) → [PR #77](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/77), whose body names `blog-landing 2.html` | Match the transcribed grid, then the blocking test suite | Shipped—and since drifted. The 9px rules survive, but the live [/blog/](/blog/) is now one post per row, so the featured post neither spans multiple rows nor is the largest cell: row two's post column is 72% wide against row one's 50% | Issue #75's transcription; PR #77's body; the live [blog index](/blog/) |
| Post template | Mockup C—agent-generated local HTML, never committed | I picked C and accepted the PR | [Issue #74](https://github.com/nathanjohnpayne/nathanpaynedotcom/issues/74) → [PR #76](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/76) | Same | Shipped; it renders the page you are reading | Issue #74's transcription; the layout of this page |
| 404 page | [Jen Simmons' CodePen](https://codepen.io/jensimmons/pen/JJpGgw)—public, still live | I chose the reference | [Issue #90](https://github.com/nathanjohnpayne/nathanpaynedotcom/issues/90) → commit [`4076bf6`](https://github.com/nathanjohnpayne/nathanpaynedotcom/commit/4076bf6), direct to `main`, no PR; refined in [PR #91](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/91) and [PR #92](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/92) | Visual target first; refinements followed | Shipped, but not reachable until #91 removed the Firebase rewrite, and the palette took one further PR, #92 | The CodePen; the CSS comment; both refinement PRs |
| FFB editor | Agent-built HTML mock-up; screenshot above | I accepted the mock-up as the target | Commit [`20dcb32`](https://github.com/nathanjohnpayne/friends-and-family-billing/commit/20dcb32); policy review in FFB [issue #145](https://github.com/nathanjohnpayne/friends-and-family-billing/issues/145) | Match the mock-up and fix editability | Shipped and matched, per a reviewer who had not seen the prompts—but bypassed review to get there | The screenshot; #145's external review summary |

Two things to read out of the table. The division of labor: Claude generated the candidates and the implementations; selecting the artifact, transcribing it into the issue, and accepting the result were my calls, and they sit in the issues rather than in this paragraph. And the failure rate: two of the four rows record a direct push to `main`. The workflow disciplined the design; it did not, by itself, discipline the process.

## Why the swap worked

Three things changed at once when the input became an HTML file, and I cannot separate their contributions. The medium matched the output. A screenshot is a picture the agent has to interpret; an HTML file is a file it can open, read, and compare. Pasting an annotated screenshot is asking the agent to do art criticism. Pasting an HTML file is asking it to do diffs.

The prototype ran outside the production build. A mock-up has no schema to satisfy, no test suite to pass, no routing to respect, so the agent could iterate on it purely as a visual artifact; production constraints became a re-implementation problem afterward rather than a design problem during. Pointed at the live page directly, the agent did both jobs at once, and the constraints it could verify kept winning over the design intent it could not.

And the mock-up forced me to commit. Once I had opened a file in a browser and said yes to it, the question shifted from "what do I want this to look like" to "why doesn't this match"—and the second is answerable with a diff.

The first version of this post claimed a fourth thing, and I retract it: that the mock-up was a durable spec that "does not drift between prompts" because the agent re-reads the file instead of remembering the conversation. True exactly as long as the file exists—and mine stopped existing. A deleted file cannot be re-read on a later prompt, cannot serve as a regression oracle, and cannot be diffed against the page a year on. The mock-up is a temporary decision aid—excellent at holding a design steady across the days a decision is open, gone the day after it is deleted. The durable artifact in this workflow is the issue that transcribes it. Checking the blog index for this revision made the point sharper than I wanted: the live grid has since drifted off Mockup B. The 9px rules are still there, but the page is now one post per row, so the featured post no longer spans multiple rows and is no longer the largest cell. Nothing caught that drift, because the artifact it would have been checked against stopped existing—and the transcription in issue #75, the only surviving record of the original decision, is exactly how I know the page moved. That transcription step, done almost as an afterthought, is the only reason half of this post can cite evidence at all.

## "Do they match" is not the whole bar

The first version of this post ended with a single acceptance test: open the mock-up and the production page side by side, and "that is the only acceptance criterion that matters: do they match." This repository disagrees—and it is worth being exact about which gates block. The required workflow runs `npm test` and `npm run lint`, and inside those a page that matched its mock-up pixel for pixel would still be stopped by checks that know nothing about design intent: a test that renders the site's Mermaid diagrams and fails the build on WCAG AA contrast violations, CSS assertions pinning the responsive invariants, SEO plumbing validated at build time. The browser-driven Playwright responsive suite is *not* among them—`npm run test:e2e` is deliberately manual and absent from CI, which the workflow says in as many words. So a responsive regression can pass every blocking gate—a boundary worth knowing, not a hole to hide. Matching the mock-up is design acceptance. Production acceptance additionally covers responsive behavior, accessibility, real-content stress—the mock-ups carried one featured post and a couple of placeholders, not a real archive—interaction correctness, and performance.

And since performance is on that list: the hero image at the top of this post is a 3.1 MB JPEG. It matched the visual intent, and nothing in "do they match" would ever flag it. It stays in this revision as the cheapest demonstration of the argument—the post that says visual acceptance and production acceptance are different bars is itself sitting on the wrong side of one.

## The operating model, revised

The workflow now has four steps, and checking this post's record changed the third. Ask for divergent candidates: two or three self-contained HTML mock-ups, inline styles, no build dependencies, openable by double-click. Converge: open them at desktop and mobile widths and pick one, or ask for variants on the closest. Transcribe: write the winner's key characteristics into the issue, because the mock-up will not outlive the decision and the issue is the record that will. Implement and verify: hand the agent the mock-up, the issue, and the live page; review the result against the mock-up for design, and against the production gates the mock-up knows nothing about for everything else.

The generalization is not "write HTML first." It is: when the target is an outcome the agent will express as code, hand it a small, self-contained artifact in the same medium as the output—and keep a durable transcription of what that artifact decided, somewhere its deletion cannot reach. For a CLI's behavior, a transcript of the exact interaction rather than a description of it. For an API's response shape, a JSON example rather than a field list. For a tone of voice, a paragraph of approved text rather than a list of adjectives. The disposable artifact does the specifying; the durable record does the remembering. This post is the case study for needing both: the mock-ups specified the two blog layouts this site still runs, and every claim about them I can still prove comes from the issues.
