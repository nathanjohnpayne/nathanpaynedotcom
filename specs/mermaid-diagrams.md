# Mermaid Diagram Support

## Summary

Mermaid diagrams are rendered to inline SVG during the Astro build. A remark
plugin converts fenced code blocks with `lang: mermaid` into accessible
figures containing intermediate `<pre class="mermaid">` elements with
HTML-escaped content. The existing build-time Playwright integration loads the
pinned local Mermaid dependency, renders every intermediate block, and writes
the resulting SVG back into each generated blog page before deployment. Blog
pages do not load Mermaid or a diagram CDN at runtime. Each inline fence
supplies a short accessible title and a relational description in metadata.
Attribute pairs require whitespace separators; use `\"` for a literal quote
or `\\` for a literal backslash inside a value:

````markdown
```mermaid title="Short diagram title" description="Explain how the nodes relate and what the diagram demonstrates."
graph TD
  A --> B
```
````

Sidebar Mermaid items supply the same `title` and `description` fields in
frontmatter and feed the same build pass. The raw Mermaid DSL is removed from
the shipped HTML; the figure exposes the title as its accessible name and the
description through `aria-describedby`, while the generated SVG is hidden
from assistive technology to avoid duplicate graphics nodes. Diagrams
therefore remain visible with JavaScript disabled, to crawlers, and in print.

## Supported Content Boundary

Mermaid is intentionally supported only in blog posts under
`src/content/blog/**/*.md`, including their body fences and typed sidebar items.
Astro registers the Remark plugin globally, so the plugin fails the build when
a Mermaid fence appears in another content collection or Markdown page rather
than allowing raw diagram source to reach an unsupported development or
production rendering path. Supporting another collection requires adding both
its development renderer and its generated output directory to the static
build pass before widening this boundary.

## Acceptance Criteria

1. Mermaid code fences and sidebar items in blog posts ship as inline SVG
   diagrams before any browser script runs.
2. Diagrams support full Mermaid syntax: `graph LR`, `graph TD`, `style`
   directives, dotted arrows (`-.->` with labels), `<br/>` in labels,
   subgraphs, and colored nodes.
3. Non-mermaid code blocks are not affected by the plugin.
4. HTML special characters in mermaid content are escaped.
5. Mermaid.js runs only in the local build-time Chromium pass. Generated pages
   and client JavaScript bundles contain no Mermaid runtime or
   `cdn.jsdelivr.net` dependency.
6. The Astro build completes successfully with the plugin registered.
7. Every diagram has a non-empty accessible name and a relational text
   description whose referenced element exists in the rendered page.
8. Mermaid fences without both `title` and `description` fail the build.
9. Static diagrams fit their figure at narrow and desktop widths and remain
   readable in print with JavaScript disabled.
10. Mermaid fences outside `src/content/blog/*.md` fail the build.
11. Static replacement preserves every byte outside the targeted
    `<pre class="mermaid">` ranges, and pages without those ranges bypass DOM
    and browser renderer setup.
12. Every `style` directive that supplies both `fill:` and label `color:` uses
    measurable three- or six-digit hex colors with a WCAG contrast ratio of at
    least 4.5:1, enforced across body fences and sidebar Mermaid items by
    `npm run lint`.
13. The contrast gate recognizes newline- and semicolon-delimited `style`
    directives. Mermaid `classDef` declarations are outside the supported
    accessibility contract and fail with guidance to use explicit `style`
    directives, whose concrete fill and label color the gate can measure.
14. Contrast discovery follows Astro's blog boundary recursively and accepts
    UTF-8 BOM-prefixed frontmatter plus root- or item-level YAML merge keys.
