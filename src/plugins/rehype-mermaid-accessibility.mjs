const TITLE_PROPERTY = 'dataMermaidTitle';
const DESCRIPTION_PROPERTY = 'dataMermaidDescription';

export const mermaidOptions = {
  strategy: 'inline-svg',
  mermaidConfig: {
    securityLevel: 'strict',
    theme: 'base',
    fontFamily: 'Inter, sans-serif',
    themeVariables: {
      fontFamily: 'Inter, sans-serif',
      fontSize: '14px',
      // An edge label sits on top of the connector it annotates and needs an
      // opaque ground, or the line runs through the text. Mermaid's default is
      // a pale lilac that reads as a highlighter stripe on this site's paper.
      // It has to be set here rather than in global.css: Mermaid injects an
      // id-scoped stylesheet whose specificity beats any selector we can write.
      // Matches --surface, the plane every diagram is rendered against.
      edgeLabelBackground: '#f4efe5',
    },
  },
  errorFallback(element) {
    const title = metadataValue(element, TITLE_PROPERTY) || 'Diagram';
    const description = metadataValue(element, DESCRIPTION_PROPERTY) || '';

    return {
      type: 'element',
      tagName: 'div',
      properties: { className: ['mermaid-fallback'] },
      children: [
        paragraph('Diagram unavailable', ['mermaid-fallback__heading']),
        paragraph(title, ['mermaid-fallback__title']),
        ...(description ? [paragraph(description, ['mermaid-fallback__description'])] : []),
      ],
    };
  },
};

/** Wrap Mermaid code blocks with the site's accessible figure contract. */
export function rehypeMermaidFigures(options = {}) {
  const descriptionPrefix = options.descriptionPrefix ?? 'mermaid-description';

  return (tree) => {
    let diagramIndex = 0;
    walkChildren(tree, (child, index, parent) => {
      if (
        parent.type === 'element' &&
        parent.tagName === 'figure' &&
        classNames(parent).includes('mermaid-figure')
      ) {
        return;
      }
      if (!isMermaidPre(child)) return;

      const code = child.children.find((candidate) => candidate.type === 'element');
      const title = metadataValue(child, TITLE_PROPERTY) || metadataValue(code, TITLE_PROPERTY);
      const description =
        metadataValue(child, DESCRIPTION_PROPERTY) || metadataValue(code, DESCRIPTION_PROPERTY);
      if (!title || !description) {
        throw new Error('Mermaid code blocks require accessible title and description metadata');
      }

      child.properties ??= {};
      child.properties[TITLE_PROPERTY] = title;
      child.properties[DESCRIPTION_PROPERTY] = description;
      diagramIndex += 1;
      parent.children[index] = createMermaidFigure({
        sourceNode: child,
        title,
        description,
        descriptionId: `${descriptionPrefix}-${diagramIndex}`,
      });
    });
  };
}

/** Add the stable class and duplicate-announcement guards to rendered SVGs. */
export function rehypeMermaidSvg() {
  return (tree) => {
    walkChildren(tree, (child) => {
      if (child.type !== 'element' || child.tagName !== 'figure') return;
      if (!classNames(child).includes('mermaid-figure')) return;

      const fallback = child.children.find(
        (candidate) =>
          candidate.type === 'element' && classNames(candidate).includes('mermaid-fallback'),
      );
      if (fallback) {
        // A role="img" makes the figure's descendants presentational, which
        // would hide the visible failure message from assistive technology.
        // Restore normal document semantics when Mermaid could not render.
        // Delete all four attributes defensively: the cleanup is intentionally
        // idempotent because a fallback may already lack any one of them. The
        // tab stop goes with them — a fallback is a paragraph of text that
        // never scrolls, so there is nothing there for a keyboard to reach.
        delete child.properties?.role;
        delete child.properties?.ariaLabel;
        delete child.properties?.ariaDescribedBy;
        delete child.properties?.tabIndex;
        return;
      }

      const rendered = child.children.find(
        (candidate) => candidate.type === 'element' && candidate.tagName === 'svg',
      );
      if (!rendered) return;

      rendered.properties ??= {};
      rendered.properties.className = [...new Set([...classNames(rendered), 'mermaid'])];
      rendered.properties.ariaHidden = 'true';
      rendered.properties.focusable = 'false';
      publishNaturalWidth(rendered);
      replaceLabelBreaks(rendered);
    });
  };
}

/**
 * Publish the width Mermaid drew the diagram at as a custom property.
 *
 * `width: 100%` on an SVG carrying a `viewBox` scales the whole graphic rather
 * than reflowing it, so a 937px diagram in a 262px column paints its pinned
 * 14px labels at 3.9px (#894). The fix is to stop scaling a diagram past the
 * point where its labels stay legible, which needs the diagram's own natural
 * width — and CSS cannot read a `viewBox`. The build can, so it writes the
 * number out as `--mermaid-natural-width` and the stylesheet consumes it.
 *
 * The `viewBox` is the authority: it is the coordinate space every label was
 * measured in, and `rehypeMermaidSvg`'s own accessibility assertions already
 * require it. Mermaid also writes the same number as an inline `max-width`, so
 * that is read as a fallback for an SVG that somehow arrives without a viewBox.
 * When neither is readable nothing is written, and the diagram keeps exactly
 * the behavior it has today — the stylesheet's `var()` fallback covers it.
 */
function publishNaturalWidth(node) {
  const width = naturalWidth(node);
  if (!width) return;

  node.properties.style = appendDeclaration(
    node.properties.style,
    `--mermaid-natural-width: ${width}px`,
  );
}

/**
 * The width Mermaid drew `node` at, or 0 when the SVG carries no readable one.
 *
 * Exported because the sidebar needs the same number for a different question.
 * `publishNaturalWidth` writes it out for the stylesheet to scale against;
 * `renderSidebarMermaid` reads it to decide whether a diagram belongs in the
 * sidebar at all (#986). Both are asking what Mermaid measured, so both read it
 * from the same place rather than re-deriving it from the emitted style string.
 */
export function naturalWidth(node) {
  // `viewBox="min-x min-y width height"`, comma or whitespace separated.
  const viewBox = node.properties?.viewBox;
  if (typeof viewBox === 'string') {
    const parts = viewBox.trim().split(/[\s,]+/);
    const width = Number(parts[2]);
    if (parts.length === 4 && Number.isFinite(width) && width > 0) return width;
  }

  const style = node.properties?.style;
  if (typeof style === 'string') {
    const match = style
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .match(/(?:^|;)\s*max-width\s*:\s*([\d.]+)px/i);
    const width = match ? Number(match[1]) : Number.NaN;
    if (Number.isFinite(width) && width > 0) return width;
  }

  return 0;
}

/**
 * Turn every `br` in a rendered label into a newline no serializer can double.
 *
 * Mermaid measures a `<br/>` label as two lines and sizes the node box to
 * match, but `hast-util-to-html` enters the SVG schema at `<svg>` and never
 * leaves it for `foreignObject`. `br` is void in HTML and not in SVG, so it
 * serializes as `<br></br>`, and an HTML parser reads that closing tag as a
 * second `<br>`. Every authored break then rendered as two, pushing the second
 * line onto a third line that overflowed the bottom of the node box (#788).
 *
 * A text node cannot be doubled by any serializer, and a newline is the same
 * forced break `br` was once the element holding it honors newlines. Rewriting
 * the break rather than the structure around it keeps this independent of what
 * Mermaid wrapped the label in: it holds for a break inside a paragraph, inside
 * `<strong>` in a Markdown-string label, or inside no wrapper at all (#789), and
 * it reproduces `br` geometry exactly — including the blank line that
 * consecutive, leading, and trailing breaks are measured for, which
 * restructuring the label into siblings loses.
 *
 * Which value honors newlines depends on the container, and Mermaid uses two.
 * A label it decided must not wrap gets `white-space: nowrap`, where `pre` is
 * the same rule plus newlines. A label it decided may wrap gets `break-spaces`,
 * which already honors newlines — forcing `pre` there would take the wrapping
 * away and lay the label out both shorter and wider than the box Mermaid
 * measured for it. So the inherited value decides, and often decides to do
 * nothing at all.
 *
 * Two details of the declaration itself are load-bearing, both measured:
 * `white-space-collapse: preserve-breaks` keeps `nowrap`'s space collapsing,
 * which plain `pre` would undo — `A["A  B<br/>C"]` paints 3.9px wider than
 * Mermaid measured without it. And it is written `!important` so it still wins
 * on a label that declares its own `white-space: … !important`, which otherwise
 * beats an appended declaration on the same element and collapses the newline
 * back to a space. The shorthand is emitted alongside the longhand so a browser
 * too old for `white-space-collapse` still breaks the line.
 */
function replaceLabelBreaks(node, inheritedWhiteSpace = '') {
  if (!Array.isArray(node.children)) return;

  const whiteSpace = declaredWhiteSpace(node) || inheritedWhiteSpace;

  if (node.children.some(isLineBreak)) {
    node.children = node.children.map((child) =>
      isLineBreak(child) ? { type: 'text', value: '\n' } : child,
    );
    const preserving = newlinePreservingValue(whiteSpace);
    if (preserving) {
      // Declared on the element that holds the newline rather than on the
      // container, so only text that replaced a break becomes whitespace
      // sensitive, and appended so it wins over what Mermaid already set.
      node.properties = {
        ...node.properties,
        style: appendDeclaration(
          node.properties?.style,
          `white-space: ${preserving} !important`,
          'white-space-collapse: preserve-breaks !important',
        ),
      };
    }
  }

  for (const child of node.children) replaceLabelBreaks(child, whiteSpace);
}

function isLineBreak(node) {
  return node.type === 'element' && node.tagName === 'br';
}

function declaredWhiteSpace(node) {
  const style = node.properties?.style;
  if (typeof style !== 'string') return '';

  // A raw `style` attribute in a Markdown-string label survives Mermaid's
  // sanitizer, so this reads author-written CSS, not just Mermaid's own. Strip
  // comments and allow whitespace around the colon rather than pinning one
  // spelling: `white-space : nowrap` and `white-space /* x */: nowrap` are both
  // valid, and missing either would inherit the wrong value from the container.
  const declarations = [
    ...style
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .matchAll(/(?:^|;)\s*white-space\s*:\s*([a-z-]+)\s*(!\s*important)?/gi),
  ].map((match) => ({ value: match[1].toLowerCase(), important: Boolean(match[2]) }));

  // Read the declaration that actually wins: `!important` outranks source
  // order, so taking the last one unconditionally would misread
  // `white-space: nowrap !important; white-space: break-spaces` as wrapping and
  // leave the newline to collapse under the nowrap that really applies.
  const winner =
    declarations.findLast((declaration) => declaration.important) ?? declarations.at(-1);
  return winner?.value ?? '';
}

/** The value that adds newline handling to `whiteSpace`, or '' when it has it. */
function newlinePreservingValue(whiteSpace) {
  if (['pre', 'pre-wrap', 'pre-line', 'break-spaces'].includes(whiteSpace)) return '';
  return whiteSpace === 'nowrap' ? 'pre' : 'pre-wrap';
}

function appendDeclaration(style, ...declarations) {
  const existing = typeof style === 'string' ? style.trim().replace(/;$/, '') : '';
  return [existing, ...declarations].filter(Boolean).join('; ');
}

export function createMermaidFigure({ sourceNode, title, description, descriptionId }) {
  return {
    type: 'element',
    tagName: 'figure',
    properties: {
      className: ['mermaid-figure'],
      role: 'img',
      ariaLabel: title,
      ariaDescribedBy: [descriptionId],
      // The figure is a horizontal scroll container in the article column below
      // the stacked breakpoint (#894), and a scroll container a keyboard cannot
      // reach is content a keyboard user cannot read. The tab stop is
      // unconditional for the same reason Astro's code blocks ship one
      // unconditionally: no stylesheet can tell the build which diagrams will
      // overflow which column. The figure already carries its own accessible
      // name, so the region announces as the diagram it scrolls rather than as
      // bare scrollable furniture.
      //
      // It was also a scroll container in the blog sidebar until #986, which is
      // why the reasoning above once named two columns. It now names one, and
      // the attribute stays unconditional anyway — a sidebar figure never
      // scrolls, so its tab stop is a stop on a diagram that fits, which costs a
      // keyboard user one keypress and costs a misjudged width nothing.
      tabIndex: 0,
    },
    children: [
      sourceNode,
      {
        type: 'element',
        tagName: 'span',
        properties: {
          id: descriptionId,
          className: ['mermaid-figure__description'],
          ariaHidden: 'true',
        },
        children: [{ type: 'text', value: description }],
      },
    ],
  };
}

function paragraph(value, className) {
  return {
    type: 'element',
    tagName: 'p',
    properties: { className },
    children: [{ type: 'text', value }],
  };
}

function isMermaidPre(node) {
  if (node.type !== 'element' || node.tagName !== 'pre') return false;
  if (classNames(node).includes('mermaid')) return true;
  return node.children.some(
    (child) =>
      child.type === 'element' &&
      child.tagName === 'code' &&
      classNames(child).includes('language-mermaid'),
  );
}

function metadataValue(node, property) {
  const value = node?.properties?.[property];
  return typeof value === 'string' ? value.trim() : '';
}

function classNames(node) {
  const value = node.properties?.className;
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') return value.split(/\s+/);
  return [];
}

function walkChildren(node, visitor) {
  if (!Array.isArray(node.children)) return;

  for (let index = 0; index < node.children.length; index += 1) {
    const child = node.children[index];
    visitor(child, index, node);
    walkChildren(node.children[index], visitor);
  }
}
