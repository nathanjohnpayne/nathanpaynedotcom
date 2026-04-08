import { visit } from 'unist-util-visit';

/**
 * Rehype plugin that wraps standalone images in <figure> elements
 * with auto-numbered captions derived from alt text.
 *
 * Transforms:
 *   <p><img src="..." alt="Alt text" /></p>
 * Into:
 *   <figure class="blog-figure">
 *     <img src="..." alt="Alt text" loading="lazy" />
 *     <figcaption><strong>Figure N:</strong> Alt text</figcaption>
 *   </figure>
 */
export default function rehypeFigureCaptions() {
  return (tree) => {
    let figureCount = 0;

    visit(tree, 'element', (node, index, parent) => {
      if (!parent || index === undefined) return;

      // Match <p> elements that contain exactly one child: an <img>
      if (node.tagName !== 'p') return;

      const children = node.children.filter(
        (child) => !(child.type === 'text' && child.value.trim() === ''),
      );

      if (children.length !== 1) return;
      if (children[0].type !== 'element' || children[0].tagName !== 'img') return;

      const img = children[0];
      const alt = img.properties?.alt || '';

      figureCount++;

      // Add loading="lazy" to the image
      img.properties = img.properties || {};
      img.properties.loading = 'lazy';

      // Build the <figure> element that replaces the <p>
      const figure = {
        type: 'element',
        tagName: 'figure',
        properties: { className: ['blog-figure'] },
        children: [
          img,
          {
            type: 'element',
            tagName: 'figcaption',
            properties: {},
            children: [
              {
                type: 'element',
                tagName: 'strong',
                properties: {},
                children: [{ type: 'text', value: `Figure ${figureCount}:` }],
              },
              { type: 'text', value: ` ${alt}` },
            ],
          },
        ],
      };

      // Replace the <p> with the <figure> in the parent's children
      parent.children[index] = figure;
    });
  };
}
