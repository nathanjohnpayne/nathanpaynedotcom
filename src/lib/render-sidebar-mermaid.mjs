import { toHtml } from 'hast-util-to-html';
import rehypeMermaid from 'rehype-mermaid';
import { VFile } from 'vfile';
import {
  createMermaidFigure,
  mermaidOptions,
  naturalWidth,
  rehypeMermaidSvg,
} from '../plugins/rehype-mermaid-accessibility.mjs';

const render = rehypeMermaid({ ...mermaidOptions, prefix: 'sidebar-mermaid' });
const finish = rehypeMermaidSvg();

/**
 * The sidebar figure's content width at the narrowest viewport it is visible at.
 *
 * Measured on the built site rather than derived from the grid: `.blog-sidebar`
 * is `minmax(10rem, 1.3fr)` inside a `.blog-canvas` whose other tracks are
 * `fr`-based and clamped, so the used width is not something the track list
 * states. It is 192px at a 1024px viewport — the width the three-column
 * composition takes over at, and so the narrowest the sidebar ever is — and
 * 238px at 2560px. Unlike the article column it barely grows, which is the
 * whole reason this ceiling exists.
 *
 * `tests/mermaid-legibility.test.js` measures the real figure at 1024px and
 * fails if it has fallen below this number, so a future change to the grid
 * cannot leave the constant quietly stale.
 */
export const SIDEBAR_COLUMN_PX = 192;

/**
 * The type size Mermaid measures every label at, pinned in the page by #753.
 * Read the pin, not this number, if the two ever disagree: this is the input to
 * a ceiling, and `svg.mermaid foreignObject p` in global.css is the authority.
 */
const SIDEBAR_LABEL_PX = 14;

/**
 * The site's smallest intentional type — the 0.56rem `.eyebrow`, taken as an
 * 8.9px floor. Below it a diagram label is smaller than anything a reader is
 * ever deliberately asked to read here. Same constant, same provenance, as
 * MIN_LEGIBLE_PX in tests/mermaid-legibility.test.js, and the duplication is
 * load-bearing rather than sloppy: that copy measures painted type on the built
 * page, so lowering this one to buy a wider ceiling ships a diagram the other
 * one then fails on. The two check each other.
 */
const MIN_LEGIBLE_PX = 8.9;

/**
 * The widest a diagram may be drawn and still belong in the sidebar (#986).
 *
 * `width: 100%` on an SVG carrying a viewBox scales the whole graphic, labels
 * included, so a diagram fitted to the sidebar paints its type at
 * `SIDEBAR_COLUMN_PX / naturalWidth` of 14px. Setting that at the floor gives
 * the widest diagram that survives the fit — about 302px.
 *
 * Written as the computation rather than as the number it evaluates to. Every
 * input is a measured or cited quantity, and a reader who disagrees with the
 * ceiling should be able to see which one they disagree with.
 */
export const SIDEBAR_MAX_NATURAL_WIDTH_PX = (SIDEBAR_COLUMN_PX * SIDEBAR_LABEL_PX) / MIN_LEGIBLE_PX;

/**
 * Render Mermaid items to static SVG figures, with no placement policy.
 *
 * The renderer without the sidebar's width ceiling. Split out from
 * `renderSidebarMermaid` in #986, when adding that ceiling turned this module's
 * one export into two jobs: turn typed items into accessible figures, and refuse
 * a figure the blog sidebar cannot show. Three test files were already borrowing
 * the first job to fixture the second's unrelated concerns — a treemap contrast
 * fixture renders wide because that is what a treemap does, and would have
 * failed a ceiling it has no relationship to. They get the renderer; the layout
 * gets the renderer plus the policy.
 */
export async function renderMermaidFigures(items, filePath = 'mermaid') {
  const { tree, diagrams } = await renderFigures(items, filePath);
  return figureHtml(tree, diagrams);
}

/**
 * Render blog-sidebar Mermaid to static SVG so readers need no Mermaid runtime,
 * refusing any diagram too wide to read in the sidebar.
 */
export async function renderSidebarMermaid(items, filePath = 'sidebar') {
  const { tree, diagrams } = await renderFigures(items, filePath);
  assertFitsSidebar(tree.children, diagrams, filePath);
  return figureHtml(tree, diagrams);
}

async function renderFigures(items, filePath) {
  const diagrams = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.type === 'mermaid');
  if (diagrams.length === 0) return { tree: { type: 'root', children: [] }, diagrams };

  const tree = {
    type: 'root',
    children: diagrams.map(({ item, index }) => {
      const code = {
        type: 'element',
        tagName: 'code',
        properties: {
          className: ['language-mermaid'],
          dataMermaidTitle: item.title,
          dataMermaidDescription: item.description,
        },
        children: [{ type: 'text', value: item.content }],
      };
      return createMermaidFigure({
        sourceNode: {
          type: 'element',
          tagName: 'pre',
          properties: {
            dataMermaidTitle: item.title,
            dataMermaidDescription: item.description,
          },
          children: [code],
        },
        title: item.title,
        description: item.description,
        descriptionId: `sidebar-mermaid-description-${index + 1}`,
      });
    }),
  };

  await render(tree, new VFile({ path: filePath }));
  finish(tree);

  if (tree.children.length !== diagrams.length) {
    throw new Error(
      `Sidebar Mermaid rendering produced ${tree.children.length} nodes for ${diagrams.length} diagrams`,
    );
  }

  return { tree, diagrams };
}

/** Serialized figures, keyed by the item's position in the authored array. */
function figureHtml(tree, diagrams) {
  return new Map(tree.children.map((node, index) => [diagrams[index].index, toHtml(node)]));
}

/**
 * Fail the build on a sidebar diagram that could only ever be read by scrolling.
 *
 * The sidebar column does not grow with the viewport, so a diagram drawn wider
 * than `SIDEBAR_MAX_NATURAL_WIDTH_PX` has no width at which it is both whole and
 * legible there — scaled to fit it drops under the floor, and held at natural
 * width it needs a horizontal scrollbar to read a fifth of at a time. That was
 * the shipped behavior until #986, and it is the state this refuses.
 *
 * A build failure rather than an automatic move into the article column. These
 * are argument diagrams, and an automatic rule has nowhere to put one except the
 * end of the post, which is the one placement the author would not have chosen.
 * So the build says which diagram, how wide, and by how much, and the author
 * puts it where it belongs — as an ordinary body fence, which has the whole
 * 528–636px article column to render into.
 *
 * The width comes from the rendered SVG, not from the authored DSL: how wide a
 * graph draws is a question only Mermaid's own measurement can answer. A diagram
 * that failed to render has no SVG and is skipped — `errorFallback` has already
 * replaced it with a visible failure message, which is a paragraph of text that
 * fits any column.
 */
function assertFitsSidebar(figures, diagrams, filePath) {
  const tooWide = figures.flatMap((figure, position) => {
    const svg = figure.children?.find(
      (candidate) => candidate.type === 'element' && candidate.tagName === 'svg',
    );
    const width = svg ? naturalWidth(svg) : 0;
    if (width <= SIDEBAR_MAX_NATURAL_WIDTH_PX) return [];

    return [`"${diagrams[position].item.title}" is ${width.toFixed(0)}px`];
  });
  if (tooWide.length === 0) return;

  throw new Error(
    `${filePath}: sidebar diagram too wide to read in the sidebar — ${tooWide.join('; ')}, ` +
      `over the ${SIDEBAR_MAX_NATURAL_WIDTH_PX.toFixed(0)}px ceiling ` +
      `(a ${SIDEBAR_COLUMN_PX}px column scales a ${SIDEBAR_LABEL_PX}px label below the ` +
      `${MIN_LEGIBLE_PX}px legibility floor past that width). Move it into the post body as a ` +
      '```mermaid fence, where the article column can render it whole, or redraw it narrower. ' +
      'See #986.',
  );
}
