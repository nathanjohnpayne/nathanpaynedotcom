# Figure Numbering

## Summary

Every substantive visual in an article carries a `Figure N` label, and images and Mermaid diagrams share one sequence in document order (#998). A screenshot and a diagram are different visual primitives: one presents an artifact, the other an explanatory model, and they stay visually distinct. They are not different *document* primitives: both are things a reader refers to by number, so numbering the screenshots around an unnumbered diagram tells the reader the diagram is furniture.

**Shared hierarchy; differentiated presentation.**

## Where the number comes from

`src/plugins/rehype-figure-numbers.mjs` runs last among the figure plugins, after `rehypeFigureCaptions` has built the image figures and `rehypeMermaidSvg` has finished the diagrams, and walks the finished tree once. Numbers are generated from document order and never authored in Markdown.

One pass rather than a counter per producer. Two counters that happen to agree are not a shared sequence: the moment a diagram lands between two images neither producer can see the other, and `six-prs-one-bug-agent-failure-modes` is that case: its first figure in document order is a diagram, so every image number on the page depends on a figure a per-type counter never sees.

## Where the label goes

An image figure is unchanged: `<figcaption><strong class="figure-label">Figure N:</strong> alt text</figcaption>`.

A diagram gets the same label in the same place and nothing else of the image figure. No frame, no ground, no border:

```html
<figure class="mermaid-figure">
  <div class="mermaid-figure__graphic" role="img" …>…</div>
  <figcaption class="mermaid-figure__figcaption">
    <strong class="figure-label">Figure N:</strong>
    <span class="mermaid-figure__caption">Optional caption</span>
  </figcaption>
</figure>
```

The label lives inside the `<figcaption>` because a `<figure>` may hold only one, and a diagram that earns a number may carry no caption at all. Uncaptioned, the figcaption holds the label alone and drops the colon, because nothing follows it.

**The number and the caption are different things.** The number is structural metadata every article figure gets; the caption is editorial content governed solely by `docs/agents/code-modification-rules.md` § Mermaid Accessibility (#996). Numbering a diagram never obliges a caption, and never adds or removes one.

## The blog sidebar is not in the sequence

A blog `sidebar` Mermaid item is not an article figure. The sidebar is `display: none` below 1024px, so numbering one would make an article's figure sequence gain and lose an entry with viewport width, and two posts carry their only diagram there.

No exclusion rule is written for this. Sidebar items render through `src/lib/render-sidebar-mermaid.mjs` and are interpolated into the layout as HTML, so they never enter the Markdown tree the numbering plugin walks, so the scoping is a property of the pipeline rather than a filter that could be got wrong. It is asserted anyway, because a future sidebar rendered through Markdown would change the answer with nothing else to notice.

## Acceptance Criteria

1. Every image figure and every article Mermaid diagram carries a `Figure N` label, in one sequence per page, following rendered document order.
2. Interleaved image → diagram → image renders as Figure 1 → Figure 2 → Figure 3.
3. Numbers are generated at build time. No figure number is authored in Markdown.
4. The image figure's rendered form is unchanged: frame, ground, border, and `Figure N: alt` caption.
5. A diagram takes the label and the figcaption typography, and none of the image figure's container treatment.
6. A diagram with no caption gets a figcaption holding only its label. No caption is invented to carry a number.
7. Caption presence remains governed by the #996 editorial rule alone.
8. Blog sidebar diagrams carry no figure number, and keep any caption they authored.
9. The diagram's accessible name and description are unchanged by numbering, and the label is announced once, as document text.
10. The audit covers every built article page in `dist/blog` and `dist/projects`, and is non-vacuous: it fails unless some page actually places an image and a diagram adjacently.
