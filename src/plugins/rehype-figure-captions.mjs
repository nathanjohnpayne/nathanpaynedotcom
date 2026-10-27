import { visit } from 'unist-util-visit';

/**
 * Rehype plugin that wraps standalone images in <figure> elements with a
 * caption derived from alt text.
 *
 * Transforms:
 *   <p><img src="..." alt="Alt text" /></p>
 * Into:
 *   <figure class="blog-figure">
 *     <img src="..." alt="Alt text" loading="lazy" />
 *     <figcaption>Alt text</figcaption>
 *   </figure>
 *
 * Alt text is plain text by the time it reaches rehype: Markdown flattens the
 * image description and drops any link URLs inside it. A caption that has to
 * link its sources therefore carries them in the image title, the one string
 * Markdown passes through verbatim:
 *
 *   ![Alt text](/img.png "Articles: [Outlet](https://example.com/story).")
 *
 * The title's `[label](https://…)` spans become links appended to the caption,
 * and the title attribute is dropped so the raw syntax never shows as a
 * tooltip. Only https URLs become links; anything else stays literal text.
 *
 * The `Figure N:` label is NOT applied here (#998). It is applied by
 * `rehype-figure-numbers.mjs`, which runs after this plugin and numbers images
 * and Mermaid diagrams in one document-order sequence. A counter local to this
 * plugin could only ever number the figures this plugin makes, which is the
 * defect #998 describes: an article whose screenshots are numbered around an
 * unnumbered diagram.
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
  // Google News result cards, captured in the browser at 3.08x and stitched
  // from two exactly abutting halves, timestamps cropped. A re-capture takes a
  // new filename for the same caching reason as the Five Across images below.
  '/blog/the-subagent-said-it-was-unsafe/img/news-headlines-google.png': {
    width: 1480,
    height: 1378,
  },
  '/images/projects/five-across-final-standings.png': {
    width: 1800,
    height: 2250,
  },
  // Matchline: re-created in the app's test build (emulators, 1440px-wide
  // viewport, 2x DPR) because the deployed build sits behind the owner's
  // sign-in. Units from the published résumé;
  // companies, roles, people and tasks invented.
  '/images/projects/matchline-pipeline.png': { width: 2880, height: 1280 },
  '/images/projects/matchline-unit-review.png': { width: 2144, height: 790 },
  '/images/projects/matchline-matches.png': { width: 2880, height: 1980 },
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
  // the live product and cropped to the message body (the 2026-10-06
  // correctness pass found the E2E fixture could not have produced the
  // member counts they show). Kept as two stacked figures rather than one
  // side-by-side composite: composed, the pair was 2000px wide and rendered
  // 233px at a 375px viewport, giving each pane ~117px and its UI text about
  // 1.5 CSS pixels (#858 Codex round 6).
  '/images/projects/friends-and-family-billing-edit.png': {
    width: 894,
    height: 428,
  },
  '/images/projects/friends-and-family-billing-preview.png': {
    width: 926,
    height: 490,
  },
  // The coordinator's per-bill derivation in the current design, cropped to the
  // author's OWN share and captured at 3x, so it stays sharp on a 2x screen at
  // the figure's ~1025 px maximum width. Since the October 2026 redesign this
  // and the hero are re-creations from the product's E2E build, seeded with the
  // live bills and member counts (the live product needs the owner's sign-in);
  // every member but the owner and John Payne has an invented name. The crop
  // still stops at `Total (Nathan Payne)`, as the live capture had to (#882).
  // A re-capture takes a new filename: /images/** is cached for four hours, so
  // reusing a path serves the old pixels at the new dimensions.
  '/images/projects/friends-and-family-billing-household-v2.png': {
    width: 2772,
    height: 432,
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
  // Mergepath: the Cockpit's local session at a 1400px viewport, 1x DPR,
  // top-cropped to the header, the road ahead, the repository chips and the
  // first open-PR row. Live data: every repository on it is public, so the
  // PR titles and account names it shows are already on GitHub.
  '/images/projects/mergepath-cockpit.png': {
    width: 1400,
    height: 1367,
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
  // Five Across: the app repository's marketing harness (scripts/marketing-shots.sh),
  // the real app over a seeded emulator Event at 393x775, 2x DPR. Invented
  // names, general-audience pools only, no photo proofs. The Bodega second-day
  // card and zero-bingo leaderboard are the same harness moved to the main Day,
  // marking only squares that players at the real event marked.
  '/blog/the-product-did-not-travel/img/gcb-card.png': { width: 786, height: 1550 },
  '/blog/the-product-did-not-travel/img/vacay-card.png': { width: 786, height: 1550 },
  '/blog/the-product-did-not-travel/img/gcb-ranks.png': { width: 786, height: 1550 },
  '/blog/the-product-did-not-travel/img/gcb-feed.png': { width: 786, height: 1550 },
  '/blog/the-product-did-not-travel/img/vacay-saturday-card.png': { width: 786, height: 1550 },
  '/blog/the-product-did-not-travel/img/vacay-bodega-ranks.png': { width: 786, height: 1550 },
};

const TITLE_LINK_START = /\[([^\]]+)\]\((?=https:\/\/)/g;

/**
 * End of a link destination that starts at `from`: the index of the `)` that
 * closes it, or -1. Balanced parentheses stay in the URL, as CommonMark allows
 * (`https://example.com/Foo_(bar)`); whitespace ends the attempt.
 */
function destinationEnd(title, from) {
  let depth = 0;
  for (let i = from; i < title.length; i += 1) {
    const char = title[i];
    if (/\s/.test(char)) return -1;
    if (char === '(') depth += 1;
    if (char === ')') {
      if (depth === 0) return i;
      depth -= 1;
    }
  }
  return -1;
}

/** Split an image title into text and link nodes for the caption. */
export function captionLinkNodes(title) {
  const nodes = [];
  let last = 0;
  TITLE_LINK_START.lastIndex = 0;
  for (let match = TITLE_LINK_START.exec(title); match; match = TITLE_LINK_START.exec(title)) {
    const urlStart = match.index + match[0].length;
    const end = destinationEnd(title, urlStart);
    if (end === -1) continue;
    if (match.index > last) nodes.push({ type: 'text', value: title.slice(last, match.index) });
    nodes.push({
      type: 'element',
      tagName: 'a',
      properties: { href: title.slice(urlStart, end) },
      children: [{ type: 'text', value: match[1] }],
    });
    last = end + 1;
    TITLE_LINK_START.lastIndex = last;
  }
  if (last < title.length) nodes.push({ type: 'text', value: title.slice(last) });
  return nodes;
}

export default function rehypeFigureCaptions() {
  return (tree) => {
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
      const title = img.properties?.title || '';

      // Add loading="lazy" and dimensions to the image
      img.properties = img.properties || {};
      img.properties.loading = 'lazy';
      delete img.properties.title;

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
            children: title
              ? [{ type: 'text', value: `${alt} ` }, ...captionLinkNodes(title)]
              : [{ type: 'text', value: alt }],
          },
        ],
      };

      // Replace the <p> with the <figure> in the parent's children
      parent.children[index] = figure;
    });
  };
}
