import { visit } from 'unist-util-visit';

/**
 * Remark plugin that converts documented ```mermaid code fences into an
 * accessible figure containing the <pre class="mermaid"> used for client-side
 * rendering by Mermaid.js.
 *
 * The mermaid code is passed through as-is — the Mermaid.js library handles
 * parsing, layout, and SVG rendering in the browser.
 */
export default function remarkMermaid() {
  return (tree) => {
    let diagramIndex = 0;

    visit(tree, 'code', (node, index, parent) => {
      if (node.lang !== 'mermaid' || parent == null || index == null) {
        return;
      }

      const { title, description } = parseMetadata(node.meta);
      diagramIndex += 1;
      const descriptionId = `mermaid-description-${diagramIndex}`;

      parent.children[index] = {
        type: 'html',
        value: `<figure class="mermaid-figure" role="img" aria-label="${escapeHtml(title)}" aria-describedby="${descriptionId}"><pre class="mermaid" aria-hidden="true">${escapeHtml(node.value)}</pre><span id="${descriptionId}" class="mermaid-figure__description" aria-hidden="true">${escapeHtml(description)}</span></figure>`,
      };
    });
  };
}

function parseMetadata(meta) {
  const requiredMessage = 'Mermaid code fences require title="..." description="..." metadata';
  const attributes = {};
  const source = meta ?? '';
  const pattern = /([A-Za-z][\w-]*)="([^"]*)"/g;
  let cursor = 0;
  let match;

  while ((match = pattern.exec(source)) !== null) {
    if (source.slice(cursor, match.index).trim() !== '') {
      throw new Error(requiredMessage);
    }

    const [, key, value] = match;
    if (key in attributes || !['title', 'description'].includes(key)) {
      throw new Error(requiredMessage);
    }
    attributes[key] = value.trim();
    cursor = pattern.lastIndex;
  }

  if (source.slice(cursor).trim() !== '' || !attributes.title || !attributes.description) {
    throw new Error(requiredMessage);
  }

  return attributes;
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
