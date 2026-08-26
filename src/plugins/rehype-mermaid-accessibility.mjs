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
        // Delete all three attributes defensively: the cleanup is intentionally
        // idempotent because a fallback may already lack any one of them.
        delete child.properties?.role;
        delete child.properties?.ariaLabel;
        delete child.properties?.ariaDescribedBy;
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
      replaceLabelBreaks(rendered);
    });
  };
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
