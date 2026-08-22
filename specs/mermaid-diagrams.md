# Mermaid Diagram Support

## Summary

Mermaid diagrams are rendered client-side by Mermaid.js loaded from CDN.
A remark plugin converts fenced code blocks with `lang: mermaid` into
accessible figures containing `<pre class="mermaid">` elements with
HTML-escaped content. The BlogPost layout loads Mermaid.js which renders
the pre elements as SVGs in the browser. Each inline fence supplies a short
accessible title and a relational description in metadata:

````markdown
```mermaid title="Short diagram title" description="Explain how the nodes relate and what the diagram demonstrates."
graph TD
  A --> B
```
````

Sidebar Mermaid items supply the same `title` and `description` fields in
frontmatter. The raw Mermaid DSL is hidden from assistive technology; the
figure exposes the title as its accessible name and the description through
`aria-describedby`. Descriptions remain in the document after Mermaid
replaces the source pre with an SVG.

## Acceptance Criteria

1. Mermaid code fences in blog posts render as SVG diagrams.
2. Diagrams support full Mermaid syntax: `graph LR`, `graph TD`, `style`
   directives, dotted arrows (`-.->` with labels), `<br/>` in labels,
   subgraphs, and colored nodes.
3. Non-mermaid code blocks are not affected by the plugin.
4. HTML special characters in mermaid content are escaped.
5. Mermaid.js only loads on blog post pages (not homepage, project pages,
   or blog index).
6. The Astro build completes successfully with the plugin registered.
7. Every diagram has a non-empty accessible name and a relational text
   description whose referenced element exists in the rendered page.
8. Mermaid fences without both `title` and `description` fail the build.
