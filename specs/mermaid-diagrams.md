# Mermaid Diagram Support

## Summary

Mermaid diagrams are rendered client-side by Mermaid.js loaded from CDN.
A remark plugin converts fenced code blocks with `lang: mermaid` into
`<pre class="mermaid">` elements with HTML-escaped content. The BlogPost
layout loads Mermaid.js which renders them as SVGs in the browser.

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
