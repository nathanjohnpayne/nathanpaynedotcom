import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, relative, resolve, sep } from 'node:path';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { findFilesRecursively } from '../scripts/lib/blog-file-inventory.mjs';
import rehypeFigureNumbers from '../src/plugins/rehype-figure-numbers.mjs';

const DIST = resolve('dist');
const FIGURE_ROOTS = [resolve('dist/blog'), resolve('dist/projects')];

/** Every built article page, blog and project alike. */
function builtArticlePaths() {
  return FIGURE_ROOTS.filter((root) => existsSync(root)).flatMap((root) =>
    findFilesRecursively(
      root,
      (filePath) => basename(filePath) === 'index.html' && dirname(filePath) !== root,
    ),
  );
}

function routeOf(pagePath) {
  return `/${relative(DIST, dirname(pagePath)).split(sep).join('/')}/`;
}

/**
 * The figures on a page, in document order, with the label each one carries.
 *
 * Order comes from `querySelectorAll`, which is document order by spec — the
 * same order the plugin walks. Reading it any other way (by class, by two
 * queries concatenated) would reintroduce the per-type grouping this change
 * exists to remove, and the test would then agree with a broken implementation.
 */
function figuresInOrder(document, scope = document) {
  return [...scope.querySelectorAll('figure.blog-figure, figure.mermaid-figure')].map((figure) => ({
    kind: figure.classList.contains('mermaid-figure') ? 'mermaid' : 'image',
    label: figure.querySelector('.figure-label')?.textContent?.trim() ?? '',
    caption: figure.querySelector('.mermaid-figure__caption')?.textContent?.trim() ?? '',
    inSidebar: Boolean(figure.closest('.blog-sidebar-item')),
  }));
}

const element = (tagName, className, children = []) => ({
  type: 'element',
  tagName,
  properties: className ? { className: [className] } : {},
  children,
});
const imageFigure = (alt) =>
  element('figure', 'blog-figure', [
    element('img', null),
    {
      type: 'element',
      tagName: 'figcaption',
      properties: {},
      children: [{ type: 'text', value: alt }],
    },
  ]);
const mermaidFigure = (caption) =>
  element('figure', 'mermaid-figure', [
    element('div', 'mermaid-figure__graphic'),
    ...(caption
      ? [
          element('figcaption', 'mermaid-figure__figcaption', [
            element('span', 'mermaid-figure__caption', [{ type: 'text', value: caption }]),
          ]),
        ]
      : []),
  ]);

function numbered(children) {
  const tree = { type: 'root', children };
  rehypeFigureNumbers()(tree);
  return tree;
}

/** `Figure N` labels in the order the tree holds them. */
function labelsOf(tree) {
  const found = [];
  const walk = (node) => {
    if (!Array.isArray(node.children)) return;
    for (const child of node.children) {
      if (
        child.type === 'element' &&
        (child.properties?.className ?? []).includes('figure-label')
      ) {
        found.push(child.children.map((c) => c.value).join(''));
      }
      walk(child);
    }
  };
  walk(tree);
  return found;
}

describe('one figure sequence across images and diagrams (#998)', () => {
  it('numbers interleaved images and diagrams in document order', () => {
    // The case a per-type counter cannot produce. Two counters running side by
    // side would number the images 1, 2, 3 and the diagrams 1, 2 — matching
    // output only while the two types never interleave, which is the state this
    // fixture is built to break.
    const tree = numbered([
      imageFigure('first image'),
      element('p', null, [{ type: 'text', value: 'prose' }]),
      mermaidFigure('a captioned diagram'),
      imageFigure('second image'),
      mermaidFigure(''),
      imageFigure('third image'),
    ]);

    expect(labelsOf(tree)).toEqual([
      'Figure 1:',
      'Figure 2:',
      'Figure 3:',
      'Figure 4',
      'Figure 5:',
    ]);
  });

  it('labels an uncaptioned diagram without inventing a caption', () => {
    // The distinction #998 is explicit about: the number is structural
    // metadata, the caption is editorial content, and #996 governs the second
    // without touching the first. A diagram with no caption gets a figcaption
    // holding only its label — and no colon, because nothing follows it.
    const tree = numbered([mermaidFigure('')]);
    const figure = tree.children[0];
    const figcaption = figure.children.find((child) => child.tagName === 'figcaption');

    expect(labelsOf(tree)).toEqual(['Figure 1']);
    expect(figcaption).toBeDefined();
    expect(figcaption.children).toHaveLength(1);
    expect(
      JSON.stringify(figcaption).includes('mermaid-figure__caption'),
      'a label-only figcaption must not fabricate a caption span',
    ).toBe(false);
  });

  it('keeps a diagram caption beside its label rather than replacing it', () => {
    const tree = numbered([mermaidFigure('the caption')]);
    const figcaption = tree.children[0].children.find((child) => child.tagName === 'figcaption');

    expect(labelsOf(tree)).toEqual(['Figure 1:']);
    expect(
      figcaption.children.some((child) =>
        (child.properties?.className ?? []).includes('mermaid-figure__caption'),
      ),
      'the caption span was dropped when the label was added',
    ).toBe(true);
  });

  it('is idempotent about figures it has already numbered', () => {
    // Run twice, because once proves nothing about idempotency (Codex P2). A
    // figure that gained a second label would be a silent doubling rather than
    // a crash, which is the whole reason the guard exists — so the test has to
    // reach the second pass to mean anything.
    const tree = { type: 'root', children: [imageFigure('one'), mermaidFigure('')] };
    rehypeFigureNumbers()(tree);
    const afterFirst = labelsOf(tree);
    const afterFirstShape = JSON.stringify(tree);

    rehypeFigureNumbers()(tree);

    expect(afterFirst).toEqual(['Figure 1:', 'Figure 2']);
    expect(labelsOf(tree), 'a second pass added labels').toEqual(afterFirst);
    // Whole-tree comparison rather than a label count: a second pass that
    // renumbered in place, or appended an empty figcaption, would leave the
    // count untouched.
    expect(JSON.stringify(tree), 'a second pass changed the tree').toBe(afterFirstShape);
  });
});

describe('built pages carry one sequential figure run', () => {
  it('numbers every article figure 1..N in document order', () => {
    expect(existsSync(DIST), 'dist must exist; run npm run build first').toBe(true);
    const pages = builtArticlePaths();
    expect(pages.length, 'the audit must find built article pages').toBeGreaterThan(0);

    let interleavedPages = 0;
    let numberedFigures = 0;

    for (const pagePath of pages) {
      const route = routeOf(pagePath);
      const document = new JSDOM(readFileSync(pagePath, 'utf8')).window.document;
      const article = document.querySelector('.blog-prose, .project-copy') ?? document;
      const figures = figuresInOrder(document, article);
      if (figures.length === 0) continue;

      const labels = figures.map((figure) => figure.label.replace(/:$/, ''));
      const expected = figures.map((_, index) => `Figure ${index + 1}`);

      expect(labels, `${route}: figure labels are not 1..N in document order`).toEqual(expected);
      numberedFigures += figures.length;

      const kinds = figures.map((figure) => figure.kind).join(',');
      if (kinds.includes('image,mermaid') || kinds.includes('mermaid,image')) interleavedPages += 1;
    }

    expect(numberedFigures, 'the audit must exercise built figures').toBeGreaterThan(0);
    // The audit is only a check while some page actually mixes the two types.
    // A site whose images and diagrams never met would satisfy the assertion
    // above with two independent per-type sequences, which is the state #998
    // describes.
    expect(
      interleavedPages,
      'the audit must exercise a page where an image and a diagram are adjacent',
    ).toBeGreaterThan(0);
  });

  it('leaves blog sidebar diagrams out of the article sequence', () => {
    // Not an article figure: the sidebar is display:none below 1024px, so a
    // numbered sidebar diagram would make the sequence gain and lose an entry
    // with viewport width. The exclusion is structural rather than a filter —
    // sidebar items render through src/lib/render-sidebar-mermaid.mjs and never
    // enter the Markdown tree the numbering plugin walks — and that is exactly
    // why it is asserted here: a future sidebar rendered through Markdown would
    // change the answer with nothing else to notice.
    const sidebarFigures = builtArticlePaths().flatMap((pagePath) => {
      const document = new JSDOM(readFileSync(pagePath, 'utf8')).window.document;
      return figuresInOrder(document)
        .filter((figure) => figure.inSidebar)
        .map((figure) => ({ route: routeOf(pagePath), ...figure }));
    });

    expect(
      sidebarFigures.length,
      'the assertion must exercise a built sidebar diagram',
    ).toBeGreaterThan(0);
    expect(
      sidebarFigures.filter((figure) => figure.label !== ''),
      'a sidebar diagram was given an article figure number',
    ).toEqual([]);
    // And the caption a sidebar item authored still renders, so excluding it
    // from the sequence did not cost it its editorial content.
    expect(
      sidebarFigures.filter((figure) => figure.caption !== '').length,
      'the assertion must exercise a captioned sidebar diagram',
    ).toBeGreaterThan(0);
  });
});
