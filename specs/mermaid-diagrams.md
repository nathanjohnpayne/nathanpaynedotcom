# Mermaid Diagram Support

## Summary

Mermaid diagrams are rendered to inline SVG by `rehype-mermaid` during Astro's
Markdown build. Mermaid fences bypass Shiki so the maintained renderer receives
ordinary `language-mermaid` code nodes. A small adapter preserves the site's
accessible figure contract; it does not parse Mermaid syntax. Blog pages do not
load Mermaid or a diagram CDN at runtime. Each inline fence supplies a short
accessible title and a relational description in metadata, and may supply a
visible `caption`. Attributes require whitespace separators; use `\"` for a
literal quote or `\\` for a literal backslash inside a value:

````markdown
```mermaid title="Short diagram title" description="Explain how the nodes relate and what the diagram demonstrates." caption="Optional visible line under the diagram."
graph TD
  A --> B
```
````

`title` and `description` are accessibility metadata and reach no sighted
reader: the first is the graphic's accessible name, the second its
`aria-describedby` target, rendered into a visually hidden span. `caption` is
the third attribute and the only visible one—a real `<figcaption>` under the
diagram, carrying context the diagram itself does not (#989). It is optional;
`title` and `description` are not, and an authored `caption=""` fails the build
rather than rendering as an omission. Nothing folds the caption into the
accessible name or description: an author who wants it there repeats it in
`title=` or `description=`.

Sidebar Mermaid items supply the same `title`, `description` and `caption`
fields in frontmatter and use the same maintained renderer and configuration,
and are subject to a width ceiling the body is not: the sidebar column is too
narrow to show a wide diagram whole or legibly, so one drawn wider than it can
hold fails the build and is authored into the post body instead. The raw
Mermaid DSL is removed from shipped HTML.

A diagram is two elements, and which one carries what is the accessibility
contract rather than a markup preference:

```html
<figure class="mermaid-figure">
  <div class="mermaid-figure__graphic" role="img" aria-label="…" aria-describedby="…" tabindex="0">
    <svg aria-hidden="true">…</svg>
    <span id="…" class="mermaid-figure__description" aria-hidden="true">…</span>
  </div>
  <figcaption class="mermaid-figure__figcaption">
    <strong class="figure-label">Figure N:</strong>
    <span class="mermaid-figure__caption">Visible contextual caption</span>
  </figcaption>
</figure>
```

The `Figure N` label is structural metadata added by `rehype-figure-numbers.mjs`,
not part of this contract; an article diagram carries one whether or not it has a
caption, and a blog sidebar diagram carries none. See `specs/figure-numbering.md`.
An uncaptioned article diagram's figcaption holds the label alone.

The inner element is the diagram: it exposes the title as its accessible name
and the description through `aria-describedby`, holds the tab stop, and is the
horizontal scroll container in a column too narrow to paint the diagram whole.
The generated SVG inside it is hidden from assistive technology to avoid
duplicate graphics nodes. `role="img"` makes that element's descendants
presentational, which is right for a graphic and its hidden description and
wrong for anything a sighted reader reads, so the visible caption is the
`<figure>`'s child, not the graphic's, and assistive technology reaches it once,
as document text. The sidebar and the body emit the same two elements. Before
that (#989) a sidebar caption was a sibling `<p>` outside the figure, and a body
fence had no caption at all.

Diagrams therefore remain visible with JavaScript disabled, to crawlers, and in
print. A render error produces a clean fallback containing the title and
description rather than raw source, an exception, or a stack trace.

## Supported Content Boundary

Mermaid is supported in blog posts under `src/content/blog/**/*.md`, including
their body fences and typed sidebar items, and in project pages under
`src/content/projects/**/*.{md,mdx}` (#753). Astro registers the metadata
adapter globally, so it fails the build when a Mermaid fence appears in any
other content collection or Markdown page.

Widening this boundary again means moving three things together, not one: the
adapter's allow-list in `src/plugins/remark-mermaid.mjs`, the rendered-contrast
sweep in `tests/mermaid-contrast.test.js`, and the route list in
`tests/responsive/mermaid-accessibility.spec.ts`. A collection the adapter
accepts but those two do not scan ships diagrams nothing checks.

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
8. Mermaid fences without both `title` and `description` fail the build, as
   does one carrying an empty `caption=""` or any attribute outside those three.
9. Static diagrams stay legible in every column they render in, at narrow and
   desktop widths alike, and no diagram label paints below the site's smallest
   intentional type—the 0.56rem `.eyebrow`, taken as an 8.9px floor. A diagram
   may scroll, scale, be re-authored narrower, or render in a wider column to
   meet that floor; which of the four applies is a property of the column.

   The article column, 528–636px at desktop and 262px on a phone, contains a
   wide diagram: below the stacked breakpoint it holds it at the width Mermaid
   drew it and scrolls inside the figure rather than scaling the labels down
   with the graphic (#894). Containment, not fit, is what has to hold there—the
   overflow belongs to the graphic and never to the page, the figure never
   outgrows the column it is placed in, and a graphic that scrolls is reachable
   by keyboard.

   Both halves of that are asserted, because the page is not the only thing that
   can absorb the excess: a project page's `.project-detail` sets
   `overflow-x: hidden`, so a figure wider than its column clips there instead
   of scrolling the page—the diagram unreachable, the column's own prose pushed
   off-viewport, and no page overflow to measure. The figure carries
   `min-width: 0` for the same reason, since `.project-copy` is a grid and a
   grid item's automatic minimum size is otherwise the diagram's natural width.

   The blog sidebar does not contain a wide diagram, it excludes one (#986).
   The column is 192px at the narrowest viewport the sidebar is visible at and
   238px at the widest, so a diagram drawn wider than about 302px paints below
   the floor scaled and shows a fraction of itself scrolled. There is no width
   at which it can be read there, so no sidebar figure scrolls horizontally at
   any viewport, and a diagram over the ceiling fails the build with the
   measured width and the article-column alternative. #897 held such a diagram
   at natural width and scrolled it; that is the behaviour this replaces.

   Print is the exception to the article column's scrolling and keeps fitting to
   the column, because paper cannot scroll; that scroll rule is `@media screen`
   for that reason. Diagrams remain readable in print with JavaScript disabled.
10. Mermaid fences outside `src/content/blog/**/*.md` and
    `src/content/projects/**/*.{md,mdx}` fail the build.
11. Rendering does not post-process or reserialize completed page HTML.
12. Explicit node fill and label colors are validated from rendered SVG at a
    WCAG contrast ratio of at least 4.5:1. Because validation happens after
    Mermaid renders, `style`, `classDef`, semicolons, quoted labels, and
    multiline labels require no site-owned grammar.
13. Invalid Mermaid renders an intentional accessible fallback with no raw DSL,
    exception, or stack trace.
14. A caption authored on either surface renders as a `<figcaption>` inside the
    `<figure>` and outside the `role="img"` element, under the diagram, styled
    the same in both columns. A diagram without one renders as it did before
    #989. The caption is available to assistive technology exactly once and
    independently of the diagram's accessible name and description, and print
    keeps it with its figure—`.mermaid-figure` sets `break-inside: avoid`.
15. A `<br/>` in a label renders exactly one line break, and every line of a
    label stays inside the node box Mermaid measured for it. Because Mermaid
    measures the label before the page is serialized, a rendered label must
    carry no void HTML element that an HTML parser can read back as a second
    break. That holds for any label structure Mermaid emits, not only for a
    break Mermaid wrapped in a paragraph.
