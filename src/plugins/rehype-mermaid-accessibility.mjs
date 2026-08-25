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
      properties: { className: ['mermaid-fallback'], ariaHidden: 'true' },
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

      const rendered = child.children.find(
        (candidate) => candidate.type === 'element' && candidate.tagName === 'svg',
      );
      if (!rendered) return;

      rendered.properties ??= {};
      rendered.properties.className = [...new Set([...classNames(rendered), 'mermaid'])];
      rendered.properties.ariaHidden = 'true';
      rendered.properties.focusable = 'false';
    });
  };
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
