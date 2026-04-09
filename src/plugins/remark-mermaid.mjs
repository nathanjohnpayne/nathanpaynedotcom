import { visit } from 'unist-util-visit';

/**
 * Remark plugin that converts ```mermaid code fences into <pre class="mermaid">
 * elements for client-side rendering by Mermaid.js.
 *
 * The mermaid code is passed through as-is — the Mermaid.js library handles
 * parsing, layout, and SVG rendering in the browser.
 */
export default function remarkMermaid() {
  return (tree) => {
    visit(tree, 'code', (node, index, parent) => {
      if (node.lang !== 'mermaid' || parent == null || index == null) {
        return;
      }

      parent.children[index] = {
        type: 'html',
        value: `<pre class="mermaid">${escapeHtml(node.value)}</pre>`,
      };
    });
  };
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
