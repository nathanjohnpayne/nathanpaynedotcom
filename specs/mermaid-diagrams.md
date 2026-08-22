# Mermaid Diagram Support

## Summary

Mermaid diagrams are rendered to inline SVG during the Astro build. A remark
plugin converts fenced code blocks with `lang: mermaid` into accessible
figures containing intermediate `<pre class="mermaid">` elements with
HTML-escaped content. The existing build-time Playwright integration loads the
pinned local Mermaid dependency, renders every intermediate block, and writes
the resulting SVG back into each generated blog page before deployment. Blog
pages do not load Mermaid or a diagram CDN at runtime. Each inline fence
supplies a short accessible title and a relational description in metadata:

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

## Acceptance Criteria

1. Mermaid code fences and sidebar items in blog posts ship as inline SVG
   diagrams before any browser script runs.
2. Diagrams support full Mermaid syntax: `graph LR`, `graph TD`, `style`
   directives, dotted arrows (`-.->` with labels), `<br/>` in labels,
   subgraphs, and colored nodes.
3. Non-mermaid code blocks are not affected by the plugin.
4. HTML special characters in mermaid content are escaped.
5. Mermaid.js runs only in the local build-time Chromium pass. Generated pages
   contain no Mermaid runtime or `cdn.jsdelivr.net` dependency.
6. The Astro build completes successfully with the plugin registered.
7. Every diagram has a non-empty accessible name and a relational text
   description whose referenced element exists in the rendered page.
8. Mermaid fences without both `title` and `description` fail the build.
9. Static diagrams fit their figure at narrow and desktop widths and remain
   readable in print with JavaScript disabled.
