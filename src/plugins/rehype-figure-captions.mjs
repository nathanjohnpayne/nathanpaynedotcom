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
// Static dimension map for CLS prevention (measured via sips)
const imageDimensions = {
  '/blog/six-prs-one-bug-agent-failure-modes/img/invoice-bug-01-editor-view.png': {
    width: 1915,
    height: 1716,
  },
  '/blog/six-prs-one-bug-agent-failure-modes/img/invoice-bug-02-preview-view.png': {
    width: 1937,
    height: 2071,
  },
  '/blog/six-prs-one-bug-agent-failure-modes/img/invoice-bug-03-broken-sent-email.png': {
    width: 1250,
    height: 1181,
  },
  '/blog/six-prs-one-bug-agent-failure-modes/img/invoice-bug-04-correct-sent-email.png': {
    width: 1250,
    height: 1222,
  },
  '/blog/html-mockups-as-spec/img/mondrian-inspiration.jpg': { width: 3543, height: 3532 },
  '/blog/html-mockups-as-spec/img/ffb-editor-mockup.png': { width: 1942, height: 1412 },
  '/blog/two-blues-one-composition/img/composition-large-blue-plane-1921.jpg': {
    width: 996,
    height: 1200,
  },
  '/blog/two-blues-one-composition/img/composition-ii-red-blue-yellow-1930.jpg': {
    width: 1183,
    height: 1200,
  },
  '/blog/perfect-score-wrong-axis/img/coderabbit-review-limit-reached.png': {
    width: 1980,
    height: 1460,
  },
  '/blog/perfect-score-wrong-axis/img/coderabbit-escape-finding-797.png': {
    width: 1596,
    height: 434,
  },
  '/blog/perfect-score-wrong-axis/img/retrospective-1041-claim.png': {
    width: 1836,
    height: 724,
  },
  '/blog/perfect-score-wrong-axis/img/raw-count-query.png': {
    width: 2000,
    height: 1558,
  },
};

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

      // Add loading="lazy" and dimensions to the image
      img.properties = img.properties || {};
      img.properties.loading = 'lazy';

      const src = img.properties.src || '';
      const dims = imageDimensions[src];
      if (dims) {
        img.properties.width = dims.width;
        img.properties.height = dims.height;
      }

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
