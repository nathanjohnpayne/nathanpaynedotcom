import { visit } from 'unist-util-visit';

/**
 * Remark plugin that converts documented ```mermaid code fences into an
 * accessible figure containing the intermediate <pre class="mermaid"> consumed
 * by the build-time Mermaid pass in src/integrations/og-images.mjs.
 *
 * The Mermaid source is passed through as-is. A build hook renders it with the
 * pinned local Mermaid dependency and replaces the pre with inline SVG before
 * anything is deployed.
 */
export default function remarkMermaid() {
  return (tree, file) => {
    let diagramIndex = 0;

    visit(tree, 'code', (node, index, parent) => {
      if (node.lang !== 'mermaid' || parent == null || index == null) {
        return;
      }

      assertSupportedContentFile(file);
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

function assertSupportedContentFile(file) {
  const filePath = String(file?.path ?? file?.history?.at(-1) ?? '').replaceAll('\\', '/');
  if (!/(^|\/)src\/content\/blog\/[^/]+\.md$/.test(filePath)) {
    throw new Error(
      `Mermaid code fences are only supported in src/content/blog Markdown files (received ${filePath || 'an unknown source'})`,
    );
  }
}

function parseMetadata(meta) {
  const requiredMessage = 'Mermaid code fences require title="..." description="..." metadata';
  const attributes = {};
  const source = (meta ?? '').trim();
  const pattern = /(?:^|\s+)([A-Za-z][\w-]*)="((?:\\["\\]|[^"\\])*)"/gy;
  let cursor = 0;
  let match;

  while (cursor < source.length) {
    pattern.lastIndex = cursor;
    match = pattern.exec(source);
    if (match == null || match.index !== cursor) throw new Error(requiredMessage);
    const [, key, value] = match;
    if (key in attributes || !['title', 'description'].includes(key)) {
      throw new Error(requiredMessage);
    }
    attributes[key] = value.replace(/\\(["\\])/g, '$1').trim();
    cursor = pattern.lastIndex;
  }

  if (!attributes.title || !attributes.description) {
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
