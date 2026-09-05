/**
 * Number every article figure in one sequence, whatever kind of figure it is.
 *
 * Images and Mermaid diagrams are different visual primitives — one presents an
 * artifact, the other an explanatory model — and they are styled apart on
 * purpose. They are not different *document* primitives: both are substantive
 * visuals a reader refers to by number, so an article that numbers its
 * screenshots 1, 2, 3 while the diagram between them goes unnumbered is telling
 * the reader the diagram is furniture (#998).
 *
 * One pass over the finished tree rather than a counter inside each producer.
 * Two counters that happen to agree are not a shared sequence: the moment a
 * diagram lands between two images the two producers cannot see each other, and
 * `six-prs-one-bug-agent-failure-modes` is exactly that case — its first figure
 * in document order is a diagram, so every image number on the page depends on a
 * figure a per-type counter never sees. Reading document order off the tree is
 * the only version that cannot silently diverge.
 *
 * Runs last, after `rehypeFigureCaptions` has built the image figures and
 * `rehypeMermaidSvg` has finished the diagrams, so what it walks is the article
 * as it will ship.
 *
 * ## Why the blog sidebar is not in the sequence, and why that is free
 *
 * A blog `sidebar` Mermaid item is not an article figure. The sidebar is
 * `display: none` below 1024px, so numbering one would make an article's figure
 * sequence gain and lose an entry with viewport width, and two posts carry their
 * only diagram there.
 *
 * No exclusion rule is written here, because the sidebar never reaches this
 * plugin: those items are rendered by `src/lib/render-sidebar-mermaid.mjs` and
 * interpolated into the layout as HTML, so they are not in the Markdown tree at
 * all. The scoping is a property of the pipeline rather than a filter that could
 * be got wrong — but it is asserted in `tests/figure-numbering.test.js` rather
 * than trusted, because a future sidebar that rendered through Markdown would
 * change the answer silently.
 */

/** The one class both figure types label with, so the guard has one thing to look for. */
const LABEL_CLASS = 'figure-label';

const FIGURE_KINDS = [
  { className: 'blog-figure', label: labelImageFigure },
  { className: 'mermaid-figure', label: labelMermaidFigure },
];

export default function rehypeFigureNumbers() {
  return (tree) => {
    let figureNumber = 0;

    visitElements(tree, (node) => {
      if (node.tagName !== 'figure') return;

      const classes = classNames(node);
      const kind = FIGURE_KINDS.find((candidate) => classes.includes(candidate.className));
      if (!kind) return;
      // A figure that already carries a label is skipped rather than labelled
      // again, and it does not consume a number either — running twice must be
      // indistinguishable from running once, not merely non-doubling. Rehype
      // plugins run once per document, so this guards a registration mistake
      // rather than a normal path; the reason it is here is that the failure
      // would be a second `Figure N` prepended silently rather than a crash.
      // `rehypeMermaidFigures` carries the same kind of guard for the same
      // reason (#989).
      if (alreadyLabelled(node)) return;

      figureNumber += 1;
      kind.label(node, figureNumber);
    });
  };
}

/**
 * The image figure already has a `<figcaption>` holding its alt text, and its
 * rendered form is unchanged by this plugin: `<strong>Figure N:</strong> alt`,
 * exactly what `rehypeFigureCaptions` used to emit on its own. Only the source
 * of N moved.
 */
function labelImageFigure(node, figureNumber) {
  const caption = node.children.find(
    (child) => child.type === 'element' && child.tagName === 'figcaption',
  );
  if (!caption) return;

  caption.children = [
    strong(`Figure ${figureNumber}:`),
    { type: 'text', value: ' ' },
    ...caption.children,
  ];
}

/**
 * The diagram gets the same label in the same place, and nothing else of the
 * image figure — no frame, no ground, no border. Peers in the hierarchy,
 * distinct in presentation.
 *
 * The label goes inside the `<figcaption>` because an HTML `<figure>` may hold
 * only one, and a diagram that earns a number may carry no caption at all: the
 * number is structural metadata, the caption is editorial content, and #996
 * governs the second without touching the first. So the figcaption is created
 * here when the author wrote no caption, and prepended to when they did.
 */
function labelMermaidFigure(node, figureNumber) {
  const caption = node.children.find(
    (child) => child.type === 'element' && child.tagName === 'figcaption',
  );

  if (caption) {
    // A captioned diagram reads "Figure 2: <caption>", like an image.
    caption.children = [
      strong(`Figure ${figureNumber}:`),
      { type: 'text', value: ' ' },
      ...caption.children,
    ];
    return;
  }

  node.children.push({
    type: 'element',
    tagName: 'figcaption',
    properties: { className: ['mermaid-figure__figcaption'] },
    // No trailing colon: there is nothing after it to introduce.
    children: [strong(`Figure ${figureNumber}`)],
  });
}

/** Whether this figure has been through the numbering pass already. */
function alreadyLabelled(node) {
  let found = false;
  visitElements(node, (child) => {
    if (classNames(child).includes(LABEL_CLASS)) found = true;
  });
  return found;
}

function strong(value) {
  return {
    type: 'element',
    tagName: 'strong',
    properties: { className: [LABEL_CLASS] },
    children: [{ type: 'text', value }],
  };
}

function classNames(node) {
  const value = node.properties?.className;
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') return value.split(/\s+/);
  return [];
}

/** Depth-first in document order, which is the order figures are numbered in. */
function visitElements(node, visitor) {
  if (!Array.isArray(node.children)) return;

  for (const child of node.children) {
    if (child.type === 'element') visitor(child);
    visitElements(child, visitor);
  }
}
