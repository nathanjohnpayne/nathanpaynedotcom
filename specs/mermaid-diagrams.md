# Mermaid Diagram Support

## Summary

Mermaid diagrams are rendered to inline SVG by `rehype-mermaid` during Astro's
Markdown build. Mermaid fences bypass Shiki so the maintained renderer receives
ordinary `language-mermaid` code nodes. A small adapter preserves the site's
accessible figure contract; it does not parse Mermaid syntax. Blog pages do not
load Mermaid or a diagram CDN at runtime. Each inline fence supplies a short
accessible title and a relational description in metadata.
Attribute pairs require whitespace separators; use `\"` for a literal quote
or `\\` for a literal backslash inside a value:

````markdown
```mermaid title="Short diagram title" description="Explain how the nodes relate and what the diagram demonstrates."
graph TD
  A --> B
```
````

Sidebar Mermaid items supply the same `title` and `description` fields in
frontmatter and use the same maintained renderer and configuration. The raw
Mermaid DSL is removed from shipped HTML; the figure exposes the title as its
accessible name and the description through `aria-describedby`, while the
generated SVG is hidden from assistive technology to avoid duplicate graphics
nodes. Diagrams therefore remain visible with JavaScript disabled, to crawlers,
and in print. A render error produces a clean fallback containing the title and
description rather than raw source, an exception, or a stack trace.

## Supported Content Boundary

Mermaid is intentionally supported only in blog posts under
`src/content/blog/**/*.md`, including their body fences and typed sidebar items.
Astro registers the metadata adapter globally, so it fails the build when a
Mermaid fence appears in another content collection or Markdown page. Supporting
another collection requires deliberately widening this boundary.

## Acceptance Criteria

1. Mermaid code fences and sidebar items in blog posts ship as inline SVG
   diagrams before any browser script runs.
2. Diagrams support full Mermaid syntax: `graph LR`, `graph TD`, `style`
   directives, dotted arrows (`-.->` with labels), `<br/>` in labels,
   subgraphs, and colored nodes.
3. Non-mermaid code blocks are not affected by the plugin.
4. HTML special characters in mermaid content are escaped.
5. Mermaid runs only through `rehype-mermaid` in local build-time Chromium.
   Generated pages and client JavaScript bundles contain no Mermaid runtime or
   `cdn.jsdelivr.net` dependency.
6. The Astro build completes successfully with the plugin registered.
7. Every diagram has a non-empty accessible name and a relational text
   description whose referenced element exists in the rendered page.
8. Mermaid fences without both `title` and `description` fail the build.
9. Static diagrams fit their figure at narrow and desktop widths and remain
   readable in print with JavaScript disabled.
10. Mermaid fences outside `src/content/blog/**/*.md` fail the build.
11. Rendering does not post-process or reserialize completed page HTML.
12. Explicit node fill and label colors are validated from rendered SVG at a
    WCAG contrast ratio of at least 4.5:1. Because validation happens after
    Mermaid renders, `style`, `classDef`, semicolons, quoted labels, and
    multiline labels require no site-owned grammar.
13. Invalid Mermaid renders an intentional accessible fallback with no raw DSL,
    exception, or stack trace.
14. A `<br/>` in a label renders exactly one line break, and every line of a
    label stays inside the node box Mermaid measured for it. Because Mermaid
    measures the label before the page is serialized, a rendered label must
    carry no void HTML element that an HTML parser can read back as a second
    break. That holds for any label structure Mermaid emits, not only for a
    break Mermaid wrapped in a paragraph.
