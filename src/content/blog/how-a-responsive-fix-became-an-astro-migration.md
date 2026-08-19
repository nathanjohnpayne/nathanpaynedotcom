---
title: "How Making a Page Responsive Led to a Full Astro Site Implementation"
seoTitle: "How Making a Page Responsive Led to Astro"
shortTitle: "Responsive Fix to Astro"
description: "A mobile responsive bug on a single blog post was the symptom of a hand-rolled chassis that could not scale. Why the right move was to migrate to a static site generator the same afternoon, and what an SSG actually buys you over hand-rolled HTML or a CMS."
seoDescription: "A mobile overflow bug exposed duplicated static HTML. Why this site moved to Astro, content collections, generated OG images, RSS, and sitemaps."
author: "Nathan Payne"
date: 2026-05-09
tags: ["Engineering", "Product", "Architecture", "Astro", "Web Performance"]
image: "/og/blog/how-a-responsive-fix-became-an-astro-migration.png"
keyTakeaways:
  - "A visible bug is sometimes a report on the architecture. Duplicated markup across hand-rolled pages surfaces first as one page's responsive defect, and the correct local patch is what makes the ceiling visible."
  - "The cheapest moment to make the structural call is before the next ten patches ship on top of the old chassis — not after the eleventh finally forces it."
  - "A static site generator buys a content schema, generated OG images, RSS, and sitemaps, and charges a dependency chain that breaks on its own schedule. It pays off only if you intend to keep an editorial cadence."
  - "Agents change the economics of architecture: when trying an approach costs an afternoon instead of a vacation week, the structurally right choice becomes the affordable one."
pullquotes:
  - text: "I had been hand-editing duplicated chrome on every page, and the responsive bug was just the first thing visible enough to admit it."
    label: "What the bug was hiding"
    accent: red
  - text: "A static site generator is a compromise between the two, and the compromise is the point."
    label: "Why an SSG"
    accent: blue
  - text: "PR #30 merged at 10:04am Pacific. PR #47 merged at 2:11pm Pacific. That timing was not an accident."
    label: "The same-day pivot"
    accent: yellow
  - text: "When the cost of 'let me just see if this works' falls by an order of magnitude, the architecture instinct stops being a luxury and starts being the obvious economic choice."
    label: "What changed the math"
    accent: blue
  - text: "PM instinct says 'ship the patch.' Architecture instinct says 'the patch is the symptom.'"
    label: "The PM lesson"
    accent: red
sidebar:
  - type: mermaid
    content: |
      graph TD
          A["Hand-rolled HTML<br/>4 pages, 1 stylesheet"] --> B["Issue #28<br/>Mobile overflow"]
          B --> C["PR #30 merged<br/>10:04am PT"]
          C --> D["PR #47 merged<br/>2:11pm PT"]
          D --> E["Phased ports<br/>(homepage, blog, projects)"]
          E --> F["Type-safe frontmatter,<br/>OG generation, RSS, sitemap"]
          style A fill:#e8b4b4,stroke:#993d3d,color:#333
          style B fill:#e8b4b4,stroke:#993d3d,color:#333
          style C fill:#d4a84b,stroke:#a07830,color:#fff
          style D fill:#d4a84b,stroke:#a07830,color:#fff
          style E fill:#4a90d9,stroke:#2c5f8a,color:#fff
          style F fill:#7bc67e,stroke:#4a8a4d,color:#fff
    caption: "Same-day pivot: a small responsive fix became the trigger for a full SSG migration"
---

The first version of nathanpayne.com was four `index.html` files, one global `style.css`, and four hand-maintained copies of the same page chrome. I built it the way a product manager builds things: copy an HTML file, paste it into a folder named for the new page, edit the parts that need to change, ship it. Every publish came with the same opening prayer—"please let nothing be stale across the four copies."

That worked for a homepage, an About page, and a couple of project case studies. It stopped working the first time I tried to ship a long-form blog post.

I am not an engineer. I am a product manager, and that shows up in the site's first chassis twice: I shipped something real without waiting to learn a framework first, and I did not notice for months that the thing I had shipped could not grow. What made me notice was a bug that looked like it had nothing to do with any of it.

## The bug that was not the bug

On April 8, 2026, I [filed an issue](https://github.com/nathanjohnpayne/nathanpaynedotcom/issues/28): the new blog post had horizontal scroll on mobile. A long URL was causing the layout to extend beyond the viewport. Code blocks weren't constrained. The text didn't break onto new lines. On a phone, the whole page wandered offscreen.

[PR #30](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/30) fixed it. The diff was small: `min-width: 0` on the grid item, `overflow-wrap: break-word` on prose, `overflow-x: auto` on code blocks, and a 480px breakpoint for typography and padding. Twenty-five lines of CSS, a [spec file](https://github.com/nathanjohnpayne/nathanpaynedotcom/blob/main/specs/blog-responsive.md) documenting the invariant, a Vitest smoke test so the regression couldn't quietly come back, and the bug was gone.

The patch worked. It also did not satisfy me, and I want to be specific about why.

The blog post lived in a hand-edited HTML file. The chrome at the top—the navigation, the meta tags, the OG card, the analytics snippet—was a literal copy-paste of the chrome from every other page in the repo. To add a single new post, I had to:

1. Duplicate an entire HTML file.
2. Hand-write the frontmatter values (title, description, OG image path) into `<meta>` tags.
3. Re-paste the head and footer chrome.
4. Remember to add the post to the blog index page, also by hand.
5. Hope I had not introduced drift between the four near-identical headers.

Every one of those steps is a place for a typo. And that was the second-order problem hiding behind the responsive bug. The visible symptom was "this page overflows on mobile." The architectural reality was that I had been hand-editing duplicate chrome on every page, and the responsive bug was just the first thing visible enough to notice.

## CMS, static HTML, and the case for the middle path

There are two well-trodden ways to build a site like this.

The first is hand-rolled static HTML—what I had. Every page is a real file you can read top to bottom. The hosting story is trivial; you upload files to a CDN, and you are done. Performance is excellent because the file the browser receives is the file you wrote. The cost is duplication: any change to the chrome affects N files, and N grows every time you publish.

The second is a content management system. A CMS hides the duplication by templating it. You define a layout once, you author posts in a database or a Markdown editor, and the CMS renders the page when a request comes in. The cost is that you now have a runtime. The page renders on demand, so performance depends on the caching strategy and the origin's uptime. You also inherit the CMS's data model—if the field you need is not a field the CMS provides, you are out of luck, or you are writing plugins.

A static site generator is a compromise between the two, and the compromise is the point. Like a CMS, an SSG lets developers use templates and authors write content separately from layout. Unlike a CMS, the SSG runs the templating step in advance, at build time, and the output is the same flat HTML you would have written by hand. That improves [website performance](https://www.cloudflare.com/learning/performance/why-site-speed-matters/) because the page is already cached on the CDN before the user requests it. And it offers more customization than a CMS does, because the developer is not limited to the database fields the CMS chose to expose. You define the schema. You decide what the frontmatter contains. The SSG enforces it at build time.

For my use case—a static-first portfolio I wanted to keep authoring in Markdown without giving up Mermaid diagrams, custom OG image generation, or strict frontmatter validation—an SSG was obviously the right tool. The question was not "should I use one?" The question was, "Am I willing to spend an afternoon migrating today, or do I keep patching the hand-rolled site and do this in three months when it hurts more?"

## The same-day pivot

[PR #30](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/30) merged at 10:04am Pacific. Four hours later, [PR #47](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/47)—"Scaffold Astro project (Phase 0 of migration)"—merged at 2:11pm Pacific.

That timing was not an accident. The responsive fix was the moment I had to read every line of the existing code to figure out where the overflow was coming from, and reading every line is the moment you can no longer pretend the duplication is fine. I had the architecture in front of me, with all its sins, and the cost of starting the migration was at its lowest at that moment. If I closed the laptop and came back tomorrow, the cost would be higher because I would have reloaded the rest of my life into context. So I scaffolded Astro the same afternoon.

Astro was a deliberate pick over the alternatives. Eleventy is excellent and would have worked. Hugo is fast, but its templating language is a steeper learning curve than I wanted to pay for a personal site. Next.js or Gatsby would have been overpowered—I did not need a React runtime on a site whose homepage is a static CSS Grid composition. Astro's selling point for me was the [Content Collections API](https://docs.astro.build/en/guides/content-collections/), which lets you define a [Zod](https://zod.dev/) schema for your frontmatter and have Astro fail the build if a post is missing a required field or has the wrong shape. That is exactly the discipline a hand-rolled site cannot enforce.

Phase 0 was the scaffold: install Astro, configure `firebase.json` to deploy from `dist/` rather than the repo root, move static assets into `public/`, and update the documentation. Subsequent PRs ported the homepage, the blog, and the project pages one surface at a time ([PR #56](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/56) was the project-pages port). Each phase was a single PR—reviewable, revertable, shippable on its own—and the migration was done over a couple of weekends, not a sprint.

## What the SSG actually bought me

The migration paid for itself across four mechanics that the hand-rolled site could not have done without enormous effort.

**Type-safe frontmatter.** The blog [content config](https://github.com/nathanjohnpayne/nathanpaynedotcom/blob/main/src/content.config.ts) defines a Zod schema with required fields (`title`, `description`, `date`, `tags`, `image`), optional fields (`shortTitle`, `pullquotes`, `sidebar`), and constrained enums (pullquote `accent` is `red | yellow | blue`; nothing else). If I write a post and forget the OG image, `astro build` fails with a line number and a field name. That is one fewer category of bug I have to remember to check.

**Custom Remark and Rehype plugins.** Mermaid diagrams and auto-numbered figure captions are both implemented as [build-time Markdown processors](https://github.com/nathanjohnpayne/nathanpaynedotcom/tree/main/src/plugins). Mermaid graphs in the blog body are detected at parse time and rendered through the standard Mermaid CDN at view time; figure captions are auto-numbered by walking the AST. Neither of these would have been impossible in hand-rolled HTML, but both would have been the kind of thing I would put off forever rather than write.

**Build-time OG image generation.** Every post has a 1200×630 social card. I render those by [shipping a Playwright integration](https://github.com/nathanjohnpayne/nathanpaynedotcom/blob/main/src/integrations/og-images.mjs) that screenshots an Astro template at build time and removes the templates from the final output. The integration was finicky to get right—`fileURLToPath` versus `dir.pathname` cost me [PR #171](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/171) and [PR #173](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/173) to nail down—but once it worked, every new post inherits a consistent OG card without me touching Figma.

**Sitemap, robots.txt, and RSS for free.** The `@astrojs/sitemap` integration generates the sitemap from the routes Astro already knows about. A custom integration syncs the `Sitemap:` line in `robots.txt` so the filename never drifts from what got shipped. RSS is a small endpoint file under `src/pages/rss.xml.ts`. None of those existed on the hand-rolled site.

## What it cost

I want to be honest about the bill.

A hand-rolled static site has roughly zero moving parts. An Astro site has Astro itself, its integrations, the Markdown processor, the Remark and Rehype plugin chain, the build-time OG renderer, the sitemap integration, the Firebase deploy step, and a CI pipeline that runs the Playwright responsive test suite added in [PR #70](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/70) on every PR. Every one of those can break.

The OG image bug is the canonical example. The integration uses `fileURLToPath(dir)` to compute the dist directory in the `astro:build:done` hook. An earlier version used `dir.pathname`, which works on macOS and silently mishandles paths on Linux CI. I caught it during a deploy that produced empty OG images. The hand-rolled site had no equivalent class of bug because it had no equivalent integration.

The Astro v5 to v6.1 upgrade in [PR #73](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/73) is another. Major-version upgrades on a hand-rolled HTML site do not exist; major-version upgrades on Astro happen on Astro's schedule, and you have to make time for them whether or not you wanted to.

These costs are not high in absolute terms—the migration was net positive within a couple of weeks of routine use—but they are real, and they accumulate. A small site with a flat template and one post a year would not be worth migrating. A site I want to keep editorial cadence on, with strict frontmatter, OG cards, RSS, sitemap, and a homepage that does anything more interesting than a list of links, was.

## What made the math work

I want to be direct about a counterfactual that runs underneath this whole story: I would not have done this migration without agentic coding tools.

A four-hour pivot from "fix the responsive bug" to "scaffold Astro and ship Phase 0" is only economical if the marginal cost of writing the code is close to zero. The hand-rolled site had been working well enough. The honest cost on a manual migration—learning Astro deeply enough to ship cleanly, porting the homepage and the blog and the project pages, debugging the OG integration, writing the Playwright responsive test suite, configuring Firebase to deploy from `dist/` instead of the repo root, and propagating the documentation through every agent instruction file—was somewhere between a long weekend and a vacation week of focused engineering time. I do not have those weeks. The site would have stayed static on the original chassis, with maybe two blog posts in it before I lost interest in adding more.

What changed the math was that I could ask a coding agent—Claude Code, primarily, with Cursor and Codex on review duty—to do the typing while I made the architectural decisions. The agent does not need to be smarter than me about Astro to be useful; it needs to be fast enough that the cost of trying an approach drops from a weekend to an afternoon. When the cost of "let me just see if this works" drops by an order of magnitude, the architecture instinct stops being a luxury and becomes the obvious economic choice. I picked the migration phasing. I picked Astro over Eleventy and Hugo. I called the OG generation strategy and the responsive test approach. The agent wrote the code, ran the tests, opened the PRs, reviewed itself, and let me sleep. The whole site, including the multi-identity review enforcement that ships every change, runs end-to-end on a Firebase project I pay for personally—because the work that used to require either a team or a focused vacation week now requires neither.

This is, to my eye, the real product story of agentic coding for non-engineers. It is not "AI replaces engineers." It is "AI lowers the marginal cost of the right architectural choice enough that the architecture instinct can win on a Wednesday afternoon, on someone's personal site, on their personal Firebase bill." The right call on April 8 was always the migration. The reason the right call became the executed call is that the agent made it inexpensive.

## The PM lesson

The instinct that makes me a useful PM is the same one that almost made me ship the wrong fix. When a user reports a visible bug, you fix it. You do not stop to rebuild the chassis underneath because the user reported the bug and has not asked for a chassis. The user has asked for the bug to be gone.

That instinct is correct ninety percent of the time. The other ten percent is when the visible bug is a symptom of a structural ceiling, and the patch you are about to ship is going to ship along with the next ten patches, and the eleventh patch is the one where you finally admit the ceiling is the actual problem.

The responsive bug was a ten-percent case. The patch was correct in isolation. Shipping only the patch would have been correct as triage. But the patch made the architectural problem sufficiently visible that not migrating would have been a deliberate choice, not a default, and the right deliberate choice was to migrate the same afternoon, when costs were lowest.

The hard part is not noticing the ceiling. The hard part is being willing, as the person who has to actually do the work, to admit that the smaller, faster, cheaper-looking option is the wrong one. PM instinct says "ship the patch." Architecture instinct says, "the patch is the symptom." On April 8, 2026, the architecture instinct was right, and [PR #30](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/30) and [PR #47](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/47) are stamped four hours apart in the git log because of it.
