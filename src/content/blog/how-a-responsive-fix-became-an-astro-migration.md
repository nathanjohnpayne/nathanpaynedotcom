---
title: "How Making a Page Responsive Led to a Full Astro Site Implementation"
seoTitle: "How Making a Page Responsive Led to Astro"
shortTitle: "Responsive Fix to Astro"
description: "A mobile overflow bug on one blog post was the symptom of a hand-rolled chassis—seven duplicated HTML pages—whose publishing workflow could not support a real cadence. Why the fix led to an Astro scaffold four hours later, a full migration deployed the same day, and a dependency bill accepted knowingly."
seoDescription: "A mobile overflow bug exposed duplicated static HTML. Why this site scaffolded Astro the same afternoon, shipped the full phased migration the same day, and what content collections, generated OG images, RSS, and sitemaps cost in maintenance."
category: "Building This Site"
author: "Nathan Payne"
date: 2026-05-09
tags: ["Engineering", "Product", "Architecture", "Astro", "Web Performance"]
image: "/og/blog/how-a-responsive-fix-became-an-astro-migration.png"
keyTakeaways:
  - "A visible bug can be a report on the architecture: one page's mobile overflow was the first symptom of page chrome duplicated across seven hand-maintained HTML files."
  - "The cheapest moment for a structural decision is while the diagnosis is still loaded, and agents are what make that moment affordable: the Astro scaffold merged four hours after the responsive fix, and that stamped interval is what let the structural option compete with the quick patch."
  - "A static site generator buys a build-enforced content schema, generated OG images, RSS, and a sitemap, and charges a dependency chain that breaks on its own schedule; the trade only makes sense with an editorial cadence to serve."
  - "Phasing a migration into small, individually reviewable PRs is what makes a one-day rewrite safe: eleven tracked phases shipped as eight PRs, and reviewers blocked three of them before approving."
pullquotes:
  - text: "I had been hand-editing duplicated chrome on every page, and the responsive bug was just the first thing visible enough to admit it."
    label: "What the bug was hiding"
    accent: red
  - text: "The axis that matters is not CMS versus static. It is when the templating runs and who owns the schema."
    label: "Why an SSG"
    accent: blue
  - text: "PR #30 merged at 10:04am Pacific. PR #47 merged at 2:11pm Pacific. That timing was not an accident."
    label: "The same-day pivot"
    accent: yellow
  - text: "My honest guess for doing this by hand was somewhere between a long weekend and a vacation week. I do not have those weeks."
    label: "The counterfactual, labeled"
    accent: blue
  - text: "Shipping only the patch would have been correct triage. The patch is also what made the ceiling impossible to unsee."
    label: "The PM lesson"
    accent: red
sidebar:
  - type: mermaid
    title: "From mobile overflow fix to Astro migration"
    description: "A mobile-overflow issue leads through a responsive fix, a same-afternoon Astro scaffold, and eleven phased ports to a same-day production deploy with type-safe frontmatter, generated Open Graph images, RSS, and a sitemap."
    content: |
      graph TD
          A["Hand-rolled HTML<br/>7 pages, 1 stylesheet"] --> B["Issue #28<br/>Mobile overflow"]
          B --> C["PR #30 merged<br/>10:04am PT"]
          C --> D["PR #47 scaffold<br/>2:11pm PT"]
          D --> E["Phased ports<br/>11 phases, 8 PRs"]
          E --> F["Phase 10 deploy<br/>verified 6:39pm PT"]
          F --> G["Type-safe frontmatter,<br/>OG images, RSS, sitemap"]
          style A fill:#e8b4b4,stroke:#993d3d,color:#333
          style B fill:#e8b4b4,stroke:#993d3d,color:#333
          style C fill:#d4a84b,stroke:#a07830,color:#333
          style D fill:#d4a84b,stroke:#a07830,color:#333
          style E fill:#2c5f8a,stroke:#2c5f8a,color:#fff
          style F fill:#7bc67e,stroke:#4a8a4d,color:#333
          style G fill:#7bc67e,stroke:#4a8a4d,color:#333
    caption: "The scaffold merged four hours after the responsive fix; the full phased migration was verified in production the same Wednesday."
---

On April 8, 2026, the newest post on this site was broken for anyone reading it on a phone. A long URL pushed the layout wider than the viewport, code blocks refused to stay in their box, text would not break onto new lines, and the whole page wandered offscreen behind a horizontal scrollbar. I [filed an issue](https://github.com/nathanjohnpayne/nathanpaynedotcom/issues/28) that morning: make the blog post pages responsive.

The bug mattered beyond the one page. The site exists to be read—it is a portfolio with a blog I intended to publish on regularly—and phones are where the reading happens. But the sharper problem sat behind the bug: the publishing system underneath that page could not support the cadence I intended, and fixing the bug is what forced me to see it.

## The chassis the bug lived in

The site at that moment was seven hand-maintained `index.html` files and one global `style.css`—a homepage, a blog index, four project case studies, and the blog post in question, each carrying its own pasted copy of the page chrome. I built it the way a product manager builds things: copy an HTML file into a folder named for the new page, edit the parts that change, ship it. I am not an engineer, and the chassis shows both halves of that: I shipped something real without stopping to learn a framework first, and I did not notice for weeks that what I had shipped could not grow. It took a bug to make me read every line of it.

[PR #30](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/30) fixed the overflow: a 152-line diff across three files—the CSS, a spec, and a test. The CSS itself was modest: `min-width: 0` on the grid children, `overflow-wrap: break-word` on prose, an `overflow-x: hidden` guard on the page container, and a new 480px breakpoint—plus a [spec file](https://github.com/nathanjohnpayne/nathanpaynedotcom/blob/main/specs/blog-responsive.md) and a Vitest test that pinned the `overflow-x: auto` rule already protecting code blocks, so the invariant could not quietly regress.

The patch worked. It also did not satisfy me, and I want to be specific about why. To add a single new post to this site, I had to:

1. Duplicate an entire HTML file.
2. Hand-write the metadata (title, description, OG image path) into `<meta>` tags.
3. Re-paste the head and footer chrome.
4. Add the post to the blog index page, also by hand.
5. Hope I had not introduced drift across seven near-identical headers.

Every one of those steps is a place for a typo, and the tax is charged again on every post, forever. The visible symptom was "this page overflows on mobile." The structural reality was that I had been hand-editing duplicated chrome on every page, and the responsive bug was just the first thing visible enough to admit it.

## The decision, on the record

Four options were on the table that afternoon.

| Option | Publishing a post | Chrome duplication | Content schema | New moving parts |
|---|---|---|---|---|
| Ship the patch, change nothing | Five hand steps across seven files | Grows with every page | Conventions in my head | None |
| Keep hand-authoring, add discipline | Same steps, plus a checklist | Still one copy per page | Still informal | None |
| CMS | Author in the CMS | Templated away | Depends on the CMS | A content service—and, for request-time CMSs, a runtime in the hot path |
| Static site generator | Write Markdown, commit | Templated away | Mine, enforced at build time | A build chain and a dependency tree |

The CMS row is really two options, and the line is worth drawing accurately. A traditional CMS renders pages at request time against its own data model: performance rides on the caching strategy and the origin's uptime, and the schema is the vendor's. But a headless CMS feeding a static build sits in the same square as an SSG—build-time rendering, custom content models, cached delivery. The axis that matters is not "CMS versus static." It is when the templating runs and who owns the schema. I wanted build time and mine, and for a one-person Markdown site an SSG gets both without standing up a separate content service.

The performance claim deserves the same precision. This site is fast because of its deployment, not its category: Astro emits flat HTML into `dist/`, and Firebase Hosting serves it from its CDN under the `Cache-Control` headers set in `firebase.json`—an hour on pages and assets, a day on OG images. An SSG with no cache configuration inherits none of that.

Two more criteria closed the decision. Cadence: only the bottom two rows remove the per-post tax, and I intended to keep publishing. Reversibility: an SSG's output is the same flat HTML I had been writing by hand, so the deployable artifact stays portable and the old chassis stays one revert away—if the migration soured mid-flight, it could be backed out without taking the site down. The patch-only option was the most reversible and decided nothing; the SSG removed the tax while keeping the exit cheap. So the open question was never "should I use one?" It was whether to start that afternoon or keep patching the hand-rolled site and do this in three months when it hurt more.

## The same-day pivot

[PR #30](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/30) merged at 10:04am Pacific. Four hours later, [PR #47](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/47)—"Phase 0: Scaffold Astro project"—merged at 2:11pm Pacific.

That timing was not an accident. Diagnosing the overflow meant reading every line of the existing code to find where it came from, and reading every line is the moment you can no longer pretend the duplication is fine. The whole architecture was loaded in my head, sins included, and the cost of starting the migration would never be lower. Close the laptop, and tomorrow that context is gone.

Nothing in the repository records a framework bake-off—the first phase issue opens with Astro already chosen—so this is the reasoning as I remember running it, not a decision log. Eleventy would have worked. Hugo is fast, but its templating language was a steeper curve than I wanted to pay for a personal site. Next.js and Gatsby were overpowered: no React runtime needed on a site whose homepage is a static CSS Grid composition. What tipped it to Astro was the [Content Collections API](https://docs.astro.build/en/guides/content-collections/), which lets you define a [Zod](https://zod.dev/) schema for your frontmatter and have the build fail if a post is missing a required field or has the wrong shape. That is exactly the discipline a hand-rolled site cannot enforce.

## Eleven phases, eight pull requests

Before the scaffold even merged, the whole sequence was scoped: eleven phase issues, [#35](https://github.com/nathanjohnpayne/nathanpaynedotcom/issues/35) through [#45](https://github.com/nathanjohnpayne/nathanpaynedotcom/issues/45), opened as a batch in a five-minute window just before 2pm. Phase 0 installed Astro, pointed `firebase.json` at `dist/` instead of the repo root, moved static assets into `public/`, and updated the documentation. Later phases ported one surface at a time—base layout, homepage, project pages ([PR #56](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/56)), blog layouts—each sized so it could be reviewed whole, deployed on its own, and reverted without touching its neighbors. The eleven phases shipped as eight PRs; two adjacent pairs (Mermaid support with figure captions, tests with cleanup) merged combined where splitting them bought no review value.

The reviews were not ceremony. Codex blocked three of the eight—#54, #62, and #63—with change requests before approving, taking three rounds on #63, and CodeRabbit commented on three. Phase 10, "Deploy and verify production," closed at 6:39pm Pacific—the same Wednesday the bug was filed.

| April 2026, Pacific time | Milestone |
|---|---|
| Apr 8, 7:54am | [Issue #28](https://github.com/nathanjohnpayne/nathanpaynedotcom/issues/28) filed: blog post overflows on mobile |
| Apr 8, 10:04am | [PR #30](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/30) merges the responsive fix |
| Apr 8, 1:50–1:55pm | Phase issues #35–#45 opened as a batch |
| Apr 8, 2:11pm | [PR #47](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/47) merges the Phase 0 Astro scaffold |
| Apr 8, 6:39pm | Phase 10 closes: production deploy verified |
| Apr 8, evening | Playwright responsive suite ([PR #70](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/70)); Astro v5 to v6.1 ([PR #73](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/73)) |
| Apr 9 | Blog template ([PR #76](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/76)) and index ([PR #77](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/77)) polish |
| Apr 14 | SEO and OG plumbing chain (#163–#175) |

So the same-day claim has edges worth stating exactly: the scaffold landed the same afternoon as the fix; the full tracked migration, through verified production deploy, landed the same day; the polish and the SEO plumbing ran over the following week.

## What the SSG bought

**Type-safe frontmatter.** The blog [content config](https://github.com/nathanjohnpayne/nathanpaynedotcom/blob/main/src/content.config.ts) defines a Zod schema with required fields (`title`, `description`, `date`, `tags`, `image`), optional fields (`shortTitle`, `pullquotes`, `sidebar`), and constrained enums (pullquote `accent` is `red | yellow | blue`; nothing else). If I write a post and forget the OG image, `astro build` fails with a line number and a field name. That is one fewer category of bug I have to remember to check.

**Custom Remark and Rehype plugins.** Mermaid diagrams and auto-numbered figure captions are both implemented as [build-time Markdown processors](https://github.com/nathanjohnpayne/nathanpaynedotcom/tree/main/src/plugins). Mermaid graphs in the blog body are rendered to accessible inline SVG by `rehype-mermaid`; figure captions are auto-numbered by walking the AST. Neither would have been impossible in hand-rolled HTML, but both would have been the kind of thing I put off forever rather than write.

**Build-time OG image generation.** Every post gets a 1200×630 social card, rendered by [a Playwright integration](https://github.com/nathanjohnpayne/nathanpaynedotcom/blob/main/src/integrations/og-images.mjs) that screenshots an Astro template at build time and strips the templates from the final output. It took real debugging to stabilize—that story is below—but every new post now inherits a consistent card without me touching Figma.

**Sitemap, robots.txt, and RSS.** The `@astrojs/sitemap` integration generates the sitemap from the routes Astro already knows about. A custom integration syncs the `Sitemap:` line in `robots.txt` so the filename never drifts from what got shipped. RSS is a small endpoint file under `src/pages/rss.xml.ts`. None of those existed on the hand-rolled site.

The outcome I actually care about is editorial, not technical. The post that started all this reads cleanly on a phone, and stays that way under a spec and two layers of tests rather than my memory. Publishing went from five hand steps across seven files to one Markdown file and a build that rejects malformed frontmatter. And the metadata surfaces—OG cards, RSS, sitemap, robots.txt—behave consistently because they are generated, not maintained.

## What it cost

I want to be honest about the bill.

A hand-rolled static site has roughly zero moving parts. This site now has Astro itself, its integrations, the Markdown processor, the Remark and Rehype plugin chain, the build-time OG renderer, the sitemap integration, the Firebase deploy step, and the Playwright responsive suite added in [PR #70](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/70). Every one of those can break on its own schedule.

The OG integration bug is the canonical example, and the accurate telling is more instructive than a dramatic one. An early version computed the output directory with `dir.pathname` instead of `fileURLToPath(dir)`. On macOS and Linux the two produce identical results; on Windows, `dir.pathname` yields `/C:/path/to/dist`, which `path.join` mangles into `C:\C:\path\to\dist`. Production impact: zero—CI and my workstation are both in the safe set, and no deploy ever surfaced it. What surfaced it was the review system: the `nathanpayne-codex` reviewer flagged it as a non-blocking observation during the external review of [PR #171](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/171)—the sibling robots.txt fix where the `fileURLToPath` pattern first landed—and it became [issue #173](https://github.com/nathanjohnpayne/nathanpaynedotcom/issues/173), fixed in [PR #174](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/174), then pinned in [PR #175](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/175) with a contract test so no future integration reintroduces it. The hand-rolled site could not have had this bug, because it had no integrations. It also had no second reviewer catching a portability defect before any user saw it.

The same week did bring a genuine production incident, and it was a different bug: LinkedIn's crawler was getting an empty page and stale OG images ([issue #163](https://github.com/nathanjohnpayne/nathanpaynedotcom/issues/163)). The fix chain—[PR #170](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/170) through [PR #172](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/172)—closed a robots.txt sitemap 404 and added OG-target smoke checks. Two failures, two detection paths: one caught in review before it could matter, one caught in production because no check yet existed. Both belong on the bill.

The Astro v5 to v6.1 upgrade in [PR #73](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/73) is the quieter line item. Major-version upgrades do not exist on a hand-rolled HTML site; on Astro they happen on Astro's schedule, and you make time whether or not you wanted to.

Whether this ledger nets out positive is a judgement, not a measurement—I have no cost baseline from April to compute a break-even against, and I will not pretend to one. The trade itself is clear: publishing friction went down, and a dependency chain that breaks on its own schedule came aboard. A site with a flat template and one post a year should refuse that trade. A site meant to carry an editorial cadence—strict frontmatter, OG cards, RSS, a homepage that does more than list links—should take it.

## What the agents changed

A counterfactual runs underneath this whole story, and it deserves to be stated with the facts separated from the estimates.

The facts: the tracked migration—scaffold through verified production deploy—ran inside one working day, across eight reviewed PRs. Claude Code did the authoring; every commit from that day carries its co-author trailer. Review came from three identities: `nathanpayne-claude`, `nathanpayne-codex`, and CodeRabbit. Cursor, a registered reviewer identity in this repo's policy, reviewed none of it.

The estimate: had I done this by hand—learned Astro well enough to ship cleanly, ported the homepage, blog, and project pages, debugged the OG integration, written the Playwright suite, rewired the Firebase deploy, and propagated the documentation—my honest guess is somewhere between a long weekend and a vacation week of focused engineering time. That is an estimate of a migration that never ran, not a measurement; no manual baseline exists to compare against. But the decision was made against that estimate, and I do not have those weeks. Without agents, the likeliest world is the old chassis limping along with maybe two more posts in it before I stopped adding them.

What the agents changed, concretely, is the price of finding out. Trying the structural option cost the four stamped hours between PR #30 and PR #47—that is what "let me just see if this works" cost here—and a price that low is what let the migration compete with the patch on the same afternoon instead of being deferred to a hypothetical free week. The division of labor sits in the artifacts rather than in this paragraph: the scoping is in issues #35–#45, the acceptance bar is in the specs and the two test suites, and the quality gate is in the review threads where three of the eight PRs were blocked until they changed. The agent wrote the code, ran the tests, and opened the PRs. The whole thing deploys to a Firebase project I pay for personally.

## The PM lesson

When a user reports a visible bug, the default is to fix the bug the user reported. The user asked for the overflow to be gone, not for a new chassis, and most of the time shipping the patch and moving on is the whole job.

The exception is when the visible bug is a symptom of a structural ceiling—when the patch about to ship will be followed by more patches onto the same chassis, until some later one forces the admission that the ceiling was the problem all along. The responsive bug was that case. The patch was correct in isolation; shipping only the patch would have been correct triage. But diagnosing it meant reading every line of the old chassis, and after that, staying put would have been a deliberate choice rather than a default.

The hard part is not noticing the ceiling. It is that the smaller, faster, cheaper-looking option is already merged by mid-morning, and the structural option asks you to keep going anyway. The record shows the choice that got made: [PR #30](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/30) and [PR #47](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/47) sit four hours apart in the git log, with the phase issues for everything in between opened before the scaffold had even merged.
