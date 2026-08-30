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
  '/blog/autofix-was-the-whole-cost/img/cmos-qanda-dashes.png': { width: 1244, height: 954 },
  '/blog/autofix-was-the-whole-cost/img/punctuation-guide-em-dash.png': {
    width: 1600,
    height: 1053,
  },
  '/blog/autofix-was-the-whole-cost/img/cmos-18th-edition-cover.jpg': { width: 463, height: 700 },
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
  '/images/projects/five-across-final-standings.png': {
    width: 1800,
    height: 2250,
  },
  // Override: live deal-room captures at a 1280x1000 viewport, 2x DPR. The
  // room is the public no-auth investor route, and the one in production is a
  // demonstration whose own producer note labels every figure a placeholder.
  '/images/projects/override-scenarios.png': {
    width: 2016,
    height: 808,
  },
  '/images/projects/override-profit-split.png': {
    width: 1984,
    height: 770,
  },
  '/images/projects/override-waterfall.png': {
    width: 1984,
    height: 1488,
  },
  // Friends & Family Billing: the Invoicing tab's two surfaces, captured from
  // the repository's own E2E harness (VITE_E2E_MODE with the `seedPage`
  // fixture), so the data is the fixture's invented household and the payment
  // handle is a placeholder. Cropped to the message body and kept as two
  // stacked figures rather than one side-by-side composite: composed, the pair
  // was 2000px wide and rendered 233px at a 375px viewport, giving each pane
  // ~117px and its UI text about 1.5 CSS pixels (#858 Codex round 6).
  '/images/projects/friends-and-family-billing-edit.png': {
    width: 894,
    height: 428,
  },
  '/images/projects/friends-and-family-billing-preview.png': {
    width: 926,
    height: 490,
  },
  // The coordinator's expanded household row on the live product, cropped to a
  // single household — the page's own and its one linked member — so the board's
  // other members are not published alongside what each of them owes. Captured
  // at a 1316px viewport and cropped to the derivation block.
  '/images/projects/friends-and-family-billing-household.png': {
    width: 707,
    height: 335,
  },
  // Device Source of Truth: live captures of the deployed demo instance at a
  // 1316x913 viewport, top-cropped to the region each caption argues about.
  // The instance runs entirely on the synthetic Story Entertainment dataset
  // (ledger §A17) — every partner, device and submitter shown is invented, and
  // the repository itself is private (§A25), which is why these screenshots
  // carry the page's evidentiary weight: a reader can reach neither the source
  // nor the running app.
  '/images/projects/device-source-of-truth-signoff.png': {
    width: 1316,
    height: 660,
  },
  '/images/projects/device-source-of-truth-alerts.png': {
    width: 1316,
    height: 800,
  },
  '/images/projects/device-source-of-truth-freshness.png': {
    width: 1316,
    height: 470,
  },
  // Swipe Watch: live-prototype captures at a 390x844 viewport, 2x DPR.
  '/images/projects/swipe-watch-card.png': {
    width: 780,
    height: 1688,
  },
  '/images/projects/swipe-watch-end-screen.png': {
    width: 780,
    height: 1010,
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

      // Taller-than-wide figures are capped narrower by `.blog-figure-portrait`
      // in global.css. At full column width a portrait image runs longer than
      // the viewport and swamps the prose around it, so the class exists to
      // hold it to a readable size. Only measurable images qualify: without a
      // dimension-map entry there is nothing to test the orientation against.
      const isPortrait = dims ? dims.height > dims.width : false;

      // Build the <figure> element that replaces the <p>
      const figure = {
        type: 'element',
        tagName: 'figure',
        properties: {
          className: isPortrait ? ['blog-figure', 'blog-figure-portrait'] : ['blog-figure'],
        },
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
