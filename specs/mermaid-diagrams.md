# Mermaid Diagram Support

## Summary

A remark plugin converts fenced code blocks with `lang: mermaid` into static HTML
diagrams during Markdown processing. No client-side Mermaid JS is loaded.

## Acceptance Criteria

1. Code blocks with language `mermaid` are replaced with `<div class="blog-diagram">` HTML.
2. Fanout layout: a root node with out-degree > 1 renders as root node, branch line,
   and a row of child nodes. Container has class `blog-diagram--fanout`.
3. Chain layout: a linear sequence of nodes renders vertically with arrow separators.
   Container has class `blog-diagram--chain`.
4. Chain layout with loop-back: when the last node has an edge back to the first node,
   a loop indicator is appended instead of a trailing arrow.
5. All diagram containers have `aria-label="Diagram"`.
6. Decorative arrows and branch elements have `aria-hidden="true"`.
7. Node labels containing HTML special characters are escaped.
8. Non-mermaid code blocks are not affected by the plugin.
9. The Astro build completes successfully with the plugin registered.
