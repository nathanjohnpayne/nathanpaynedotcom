import { visit } from 'unist-util-visit';

/**
 * Preserve the site's authoring contract without interpreting Mermaid itself.
 * Rendering and Mermaid syntax validation belong to rehype-mermaid.
 */
export default function remarkMermaidMetadata() {
  return (tree, file) => {
    visit(tree, 'code', (node) => {
      if (node.lang !== 'mermaid') return;

      assertSupportedContentFile(file);
      const { title, description } = parseMermaidMetadata(node.meta);
      node.data ??= {};
      node.data.hProperties = {
        ...node.data.hProperties,
        dataMermaidTitle: title,
        dataMermaidDescription: description,
      };
    });
  };
}

function assertSupportedContentFile(file) {
  const filePath = String(file?.path ?? file?.history?.at(-1) ?? '').replaceAll('\\', '/');
  if (!/(^|\/)src\/content\/blog\/(?:[^/]+\/)*[^/]+\.md$/.test(filePath)) {
    throw new Error(
      `Mermaid code fences are only supported in src/content/blog Markdown files (received ${filePath || 'an unknown source'})`,
    );
  }
}

export function parseMermaidMetadata(meta) {
  const requiredMessage = 'Mermaid code fences require title="..." description="..." metadata';
  const attributes = {};
  const source = (meta ?? '').trim();
  const pattern = /(?:^|\s+)([A-Za-z][\w-]*)="((?:\\["\\]|[^"\\])*)"/gy;
  let cursor = 0;

  while (cursor < source.length) {
    pattern.lastIndex = cursor;
    const match = pattern.exec(source);
    if (match == null || match.index !== cursor) throw new Error(requiredMessage);
    const [, key, value] = match;
    if (key in attributes || !['title', 'description'].includes(key)) {
      throw new Error(requiredMessage);
    }
    attributes[key] = value.replace(/\\(["\\])/g, '$1').trim();
    cursor = pattern.lastIndex;
  }

  if (!attributes.title || !attributes.description) throw new Error(requiredMessage);
  return attributes;
}
