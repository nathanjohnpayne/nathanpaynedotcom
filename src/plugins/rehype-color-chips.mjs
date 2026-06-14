import { visit } from 'unist-util-visit';

/**
 * Rehype plugin that turns hex-color inline code into color chips.
 *
 * Transforms:
 *   <code>#C01D18</code>
 * Into:
 *   <code class="color-chip">
 *     <span class="color-chip__swatch" style="background-color: #C01D18" aria-hidden="true"></span>
 *     #C01D18
 *   </code>
 *
 * Only fires on inline code whose entire content is a single hex color
 * (3, 4, 6, or 8 digits). Code blocks (<pre><code>) and mixed spans like
 * `--blue: #223f89` are left untouched, so token definitions and CSS
 * snippets keep their plain rendering.
 */
const HEX_COLOR = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export default function rehypeColorChips() {
  return (tree) => {
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'code') return;
      if (parent?.type === 'element' && parent.tagName === 'pre') return;
      if (!node.children || node.children.length !== 1) return;

      const child = node.children[0];
      if (child.type !== 'text') return;

      const value = child.value.trim();
      if (!HEX_COLOR.test(value)) return;

      node.properties = node.properties || {};
      const existing = Array.isArray(node.properties.className) ? node.properties.className : [];
      node.properties.className = [...existing, 'color-chip'];

      node.children.unshift({
        type: 'element',
        tagName: 'span',
        properties: {
          className: ['color-chip__swatch'],
          style: `background-color: ${value}`,
          'aria-hidden': 'true',
        },
        children: [],
      });
    });
  };
}
