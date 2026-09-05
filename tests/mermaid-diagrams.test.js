import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, relative, resolve, sep } from 'node:path';
import { toHtml } from 'hast-util-to-html';
import { JSDOM } from 'jsdom';
import { VFile } from 'vfile';
import { describe, expect, it } from 'vitest';
import { findFilesRecursively } from '../scripts/lib/blog-file-inventory.mjs';
import {
  renderMermaidFigures,
  renderSidebarMermaid,
  SIDEBAR_MAX_NATURAL_WIDTH_PX,
} from '../src/lib/render-sidebar-mermaid.mjs';
import { rehypeMermaidSvg } from '../src/plugins/rehype-mermaid-accessibility.mjs';

const builtRoot = resolve('dist');
const builtBlogRoot = resolve('dist/blog');
// Mermaid is supported in two collections (#753), so the built-output
// assertions below scan both. Scanning only dist/blog would leave every
// project-page diagram uncovered by the label-break, accessibility and
// client-JS checks the moment one is authored.
const builtDiagramRoots = [builtBlogRoot, resolve('dist/projects')];
const blogFixturePath = resolve('src/content/blog/mermaid-fixture.md');

// Named for what they walk, not for the collection they started in. Both scan
// `builtDiagramRoots` — blog AND projects — and were called `builtBlog…` from
// before #753 widened them. A Phase 4b reviewer read the old name as the
// behaviour and filed a P1 saying the body-caption guard below could never see
// the project page carrying the only body-fence caption, which is the misreading
// the name invites (#995). The claim was false and the name was not.
function builtDiagramPagePaths() {
  return builtDiagramRoots
    .filter((root) => existsSync(root))
    .flatMap((root) =>
      findFilesRecursively(
        root,
        (filePath) => basename(filePath) === 'index.html' && dirname(filePath) !== root,
      ),
    );
}

function builtDiagramSlug(pagePath) {
  const root = builtDiagramRoots.find((candidate) => pagePath.startsWith(candidate + sep));
  const base = root ?? builtBlogRoot;
  return `${basename(base)}/${relative(base, dirname(pagePath)).split(sep).join('/')}`;
}

async function validateMermaidMetadata(tree, filePath = blogFixturePath) {
  const { default: remarkMermaid } = await import('../src/plugins/remark-mermaid.mjs');
  remarkMermaid()(tree, { path: filePath });
}

/**
 * A body fence rendered the way the site renders one, end to end.
 *
 * `renderMermaidFigures` is the sidebar's entry point and builds the figure
 * from a typed item; a body fence instead travels remark → `rehypeMermaidFigures`
 * → `rehype-mermaid` → `rehypeMermaidSvg`, and the caption has to survive every
 * hop of that path (#989). Exercising the real chain is the only way to catch a
 * property the remark plugin writes and the rehype plugin never reads.
 */
async function renderBodyFence(meta) {
  const [{ default: remarkMermaid }, { rehypeMermaidFigures, mermaidOptions }, rehypeMermaid] =
    await Promise.all([
      import('../src/plugins/remark-mermaid.mjs'),
      import('../src/plugins/rehype-mermaid-accessibility.mjs'),
      import('rehype-mermaid').then((module) => module.default),
    ]);

  const code = { type: 'code', lang: 'mermaid', meta, value: 'graph TD\nA --> B' };
  remarkMermaid()({ type: 'root', children: [code] }, { path: blogFixturePath });

  // The hProperties remark writes are what Astro's mdast-to-hast step copies
  // onto the emitted `<pre>`; this is that step, kept to the two nodes the
  // rehype plugin actually reads.
  const tree = {
    type: 'root',
    children: [
      {
        type: 'element',
        tagName: 'pre',
        properties: { ...code.data.hProperties },
        children: [
          {
            type: 'element',
            tagName: 'code',
            properties: { className: ['language-mermaid'], ...code.data.hProperties },
            children: [{ type: 'text', value: code.value }],
          },
        ],
      },
    ],
  };

  rehypeMermaidFigures()(tree);
  await rehypeMermaid(mermaidOptions)(tree, new VFile({ path: blogFixturePath }));
  rehypeMermaidSvg()(tree);
  return toHtml(tree);
}

/** The caption's element, class and placement — not its id or its graphic. */
function captionShape(html) {
  const figure = new JSDOM(html).window.document.querySelector('.mermaid-figure');
  const caption = figure?.querySelector('figcaption');

  return {
    tagName: caption?.tagName ?? null,
    className: caption?.getAttribute('class') ?? null,
    text: caption?.textContent ?? null,
    insideGraphic: Boolean(caption?.closest('.mermaid-figure__graphic')),
    parentIsFigure: caption?.parentElement === figure,
    // The sibling it must not be confused with: the hidden description stays
    // inside the graphic on both surfaces.
    descriptionInsideGraphic: Boolean(
      figure?.querySelector('.mermaid-figure__description')?.closest('.mermaid-figure__graphic'),
    ),
  };
}

describe('rehype-mermaid integration', () => {
  it('preserves title and description metadata for the rehype adapter', async () => {
    const code = {
      type: 'code',
      lang: 'mermaid',
      meta: 'title="Example flow" description="A leads directly to B."',
      value: 'graph TD\nA --> B',
    };
    const tree = { type: 'root', children: [code] };

    await validateMermaidMetadata(tree);

    expect(code.data.hProperties).toEqual({
      dataMermaidTitle: 'Example flow',
      dataMermaidDescription: 'A leads directly to B.',
    });
  });

  it('leaves non-Mermaid code blocks unchanged', async () => {
    const code = { type: 'code', lang: 'javascript', value: 'const x = 1;' };
    const tree = { type: 'root', children: [code] };

    await validateMermaidMetadata(tree, resolve('src/content/projects/example.md'));

    expect(code).toEqual({ type: 'code', lang: 'javascript', value: 'const x = 1;' });
  });

  it('accepts nested blog content and project pages but rejects unsupported collections', async () => {
    const code = {
      type: 'code',
      lang: 'mermaid',
      meta: 'title="Nested flow" description="A nested article connects A to B."',
      value: 'graph TD\nA --> B',
    };

    await expect(
      validateMermaidMetadata(
        { type: 'root', children: [{ ...code }] },
        resolve('src/content/blog/nested/deeper/example.md'),
      ),
    ).resolves.toBeUndefined();
    // Project pages carry the case-study diagrams (#753). Both extensions are
    // accepted because that collection loads `**/*.{md,mdx}` and the converted
    // pages are `.mdx`.
    await expect(
      validateMermaidMetadata(
        { type: 'root', children: [{ ...code }] },
        resolve('src/content/projects/example.mdx'),
      ),
    ).resolves.toBeUndefined();
    await expect(
      validateMermaidMetadata(
        { type: 'root', children: [{ ...code }] },
        resolve('src/content/projects/nested/example.md'),
      ),
    ).resolves.toBeUndefined();
    // Every other collection still rejects — the diagram CSS, the contrast
    // test and the accessibility spec are wired for blog and projects only.
    await expect(
      validateMermaidMetadata(
        { type: 'root', children: [{ ...code }] },
        resolve('src/content/resume/projects/example.md'),
      ),
    ).rejects.toThrow(/only supported in src\/content\/blog and src\/content\/projects/i);
    await expect(
      validateMermaidMetadata(
        { type: 'root', children: [{ ...code }] },
        resolve('src/pages/about.md'),
      ),
    ).rejects.toThrow(/only supported in src\/content\/blog and src\/content\/projects/i);
    // An unsupported collection must not smuggle a supported one inside itself.
    // Matching `src/content/…` anywhere in the path let this through.
    await expect(
      validateMermaidMetadata(
        { type: 'root', children: [{ ...code }] },
        resolve('src/content/resume/src/content/projects/unchecked.md'),
      ),
    ).rejects.toThrow(/only supported in src\/content\/blog and src\/content\/projects/i);
  });

  it('requires separated title and description attributes', async () => {
    for (const meta of [
      undefined,
      'title="Only a title"',
      'title="Example"description="Missing separator"',
    ]) {
      await expect(
        validateMermaidMetadata({
          type: 'root',
          children: [{ type: 'code', lang: 'mermaid', meta, value: 'graph TD\nA --> B' }],
        }),
      ).rejects.toThrow(/title=.*description=/i);
    }
  });

  /**
   * The visible caption, and the line between it and the two hidden fields.
   *
   * `title` and `description` are accessibility metadata — the diagram's
   * accessible name and its `aria-describedby` target — and neither reaches a
   * sighted reader. `caption` is the third attribute and the only visible one
   * (#989). A sidebar item has taken one since the field existed; a body fence
   * could not, which made the wider column the one that could not carry a
   * caption. The assertions below hold the grammar, the DOM contract, and the
   * fact that the two surfaces now emit the same element.
   */
  describe('the visible caption', () => {
    const fence = (meta) => ({
      type: 'root',
      children: [{ type: 'code', lang: 'mermaid', meta, value: 'graph TD\nA --> B' }],
    });

    it('parses an optional caption alongside the required metadata', async () => {
      const tree = fence(
        'title="Example flow" description="A leads directly to B." caption="B follows A, once."',
      );

      await validateMermaidMetadata(tree);

      expect(tree.children[0].data.hProperties).toEqual({
        dataMermaidTitle: 'Example flow',
        dataMermaidDescription: 'A leads directly to B.',
        dataMermaidCaption: 'B follows A, once.',
      });
    });

    it('writes no caption property when the fence carries none', async () => {
      const tree = fence('title="Example flow" description="A leads directly to B."');

      await validateMermaidMetadata(tree);

      // Absent rather than empty: an empty string would reach the figure
      // builder indistinguishable from an authored caption.
      expect(tree.children[0].data.hProperties).not.toHaveProperty('dataMermaidCaption');
    });

    it('rejects an empty caption and any attribute outside the three', async () => {
      await expect(
        validateMermaidMetadata(fence('title="T" description="D." caption=""')),
      ).rejects.toThrow(/caption=.*must not be empty/i);
      // The grammar widened by exactly one name. A typo still fails rather than
      // being carried through to the figure as an unknown property.
      await expect(
        validateMermaidMetadata(fence('title="T" description="D." captions="Two of them"')),
      ).rejects.toThrow(/title=.*description=/i);
      await expect(
        validateMermaidMetadata(fence('title="T" description="D." caption="A" caption="B"')),
      ).rejects.toThrow(/title=.*description=/i);
    });

    it('renders a body fence caption as a figcaption outside the image', async () => {
      const html = await renderBodyFence(
        'title="Captioned flow" description="A leads directly to B." ' +
          'caption="Drawn before the bridge was removed."',
      );
      const document = new JSDOM(html).window.document;
      const figure = document.querySelector('.mermaid-figure');
      const graphic = figure?.querySelector('.mermaid-figure__graphic');
      const caption = figure?.querySelector('figcaption');

      expect(graphic?.getAttribute('role')).toBe('img');
      expect(graphic?.getAttribute('aria-label')).toBe('Captioned flow');
      expect(graphic?.getAttribute('tabindex')).toBe('0');
      expect(figure?.hasAttribute('role')).toBe(false);
      expect(caption?.textContent).toBe('Drawn before the bridge was removed.');
      // The one placement that matters: inside the role="img" element the
      // caption would be presentational, and the whole point is that it is not.
      expect(caption?.closest('.mermaid-figure__graphic')).toBeNull();
      expect(caption?.parentElement).toBe(figure);
      // And it is not folded into the accessible name or the description.
      expect(graphic?.getAttribute('aria-label')).not.toContain('Drawn before');
      expect(document.querySelector('.mermaid-figure__description')?.textContent).not.toContain(
        'Drawn before',
      );
    });

    it('renders a body fence without a caption exactly as it does today', async () => {
      const html = await renderBodyFence('title="Plain flow" description="A leads directly to B."');
      const document = new JSDOM(html).window.document;

      expect(document.querySelector('figcaption')).toBeNull();
      expect(document.querySelector('.mermaid-figure__graphic')?.getAttribute('role')).toBe('img');
      expect(document.querySelector('svg.mermaid')).not.toBeNull();
    });

    it('gives the sidebar and the body the same caption element', async () => {
      const sidebar = await renderMermaidFigures([
        {
          type: 'mermaid',
          title: 'Captioned flow',
          description: 'A leads directly to B.',
          content: 'graph TD\nA --> B',
          caption: 'Drawn before the bridge was removed.',
        },
      ]);
      const body = await renderBodyFence(
        'title="Captioned flow" description="A leads directly to B." ' +
          'caption="Drawn before the bridge was removed."',
      );

      // Unifying the two surfaces is the point of the change: a `caption`
      // frontmatter field and a `caption=` fence attribute are one thing.
      // Compared as a shape rather than as bytes — the ids and the rendered
      // SVG differ between the two renderers, and neither is the contract.
      expect(captionShape(sidebar.get(0))).toEqual(captionShape(body));
    });

    it('emits no figcaption for a caption that is only whitespace', async () => {
      // Neither authoring surface can produce this — the fence grammar rejects
      // an empty `caption=` and the sidebar schema rejects a blank one — so this
      // holds `createMermaidFigure`'s own contract rather than an authored case.
      // An empty `<figcaption>` is a landing place with nothing to read in it.
      const rendered = await renderMermaidFigures([
        {
          type: 'mermaid',
          title: 'Blank caption',
          description: 'A leads directly to B.',
          content: 'graph TD\nA --> B',
          caption: '   \n  ',
        },
      ]);

      expect(new JSDOM(rendered.get(0)).window.document.querySelector('figcaption')).toBeNull();
    });
  });

  it('renders malformed Mermaid as a clean, accessible fallback', async () => {
    const rendered = await renderMermaidFigures([
      {
        type: 'mermaid',
        title: 'Broken flow',
        description: 'A was intended to lead to B.',
        content: 'graph TD\nA -- ???',
      },
    ]);
    const document = new JSDOM(rendered.get(0)).window.document;
    const figure = document.querySelector('.mermaid-figure');
    const graphic = document.querySelector('.mermaid-figure__graphic');

    expect(graphic?.getAttribute('role')).toBeNull();
    expect(graphic?.getAttribute('aria-label')).toBeNull();
    expect(graphic?.getAttribute('aria-describedby')).toBeNull();
    expect(graphic?.getAttribute('tabindex')).toBeNull();
    expect(figure?.textContent).toContain('Diagram unavailable');
    expect(figure?.textContent).toContain('Broken flow');
    expect(figure?.textContent).toContain('A was intended to lead to B.');
    expect(figure?.textContent).not.toMatch(/error|stack|at file:/i);
    const fallback = document.querySelector('.mermaid-fallback');
    expect(fallback?.hasAttribute('aria-hidden')).toBe(false);
    expect(fallback?.closest('[aria-hidden="true"]')).toBeNull();
    expect(document.querySelector('pre, code, svg')).toBeNull();
  });

  it('lets Mermaid handle semicolons, quotes, multiline labels, styles, and classDef', async () => {
    const rendered = await renderMermaidFigures([
      {
        type: 'mermaid',
        title: 'Syntax surface',
        description: 'Several Mermaid grammar features render together.',
        content: [
          'graph TD; A["Quoted; label"] --> B["`First line',
          'second line`"];',
          'classDef good fill:#993d3d,color:#fff;',
          'class A good;',
          'style B fill:#2080CA,color:#000;',
        ].join('\n'),
      },
    ]);
    const document = new JSDOM(rendered.get(0)).window.document;

    expect(document.querySelector('svg.mermaid')).not.toBeNull();
    expect(document.querySelector('.mermaid-fallback')).toBeNull();
    expect(document.body.textContent).toContain('Quoted; label');
    expect(document.body.textContent).toContain('First line');
    expect(document.body.textContent).toContain('second line');
  });

  it('renders each authored label break as exactly one line', async () => {
    const rendered = await renderMermaidFigures([
      {
        type: 'mermaid',
        title: 'Two-line labels',
        description: 'A two-line label leads to another two-line label.',
        content: 'graph TD\nA["First line<br/>second line"] --> B["Third line<br/>fourth line"]',
      },
    ]);
    const html = rendered.get(0);

    // `br` is void in HTML but not in SVG, so a serializer that never leaves
    // the SVG schema inside foreignObject writes `<br></br>`—and every HTML
    // parser reads that closing tag as a second break (#788).
    expect(html, 'a doubled line break survived serialization').not.toContain('</br>');

    const document = new JSDOM(html).window.document;
    const labels = [...document.querySelectorAll('svg.mermaid .nodeLabel p')];

    expect(labels.map((label) => label.textContent)).toEqual([
      'First line\nsecond line',
      'Third line\nfourth line',
    ]);
    // A newline only breaks the line when the element holding it says so.
    for (const label of labels) {
      expect(label.getAttribute('style'), label.textContent).toMatch(
        /white-space:\s*pre\s*!\s*important/,
      );
    }
    expect(document.querySelector('svg.mermaid foreignObject br')).toBeNull();
  });

  it('breaks a Markdown-string label that formats across the break', async () => {
    // Mermaid renders a Markdown-string label as `<p><strong>first<br>second
    // </strong></p>`, so the break sits inside the formatting rather than
    // beside it. Rewriting the break itself reaches it; restructuring the
    // paragraph around it does not (#789).
    const rendered = await renderMermaidFigures([
      {
        type: 'mermaid',
        title: 'Formatted two-line label',
        description: 'A bold two-line label leads to a plain one.',
        content: 'graph TD\nA["`**First line<br/>second line**`"] --> B["Plain"]',
      },
    ]);
    const html = rendered.get(0);

    expect(html, 'a doubled line break survived serialization').not.toContain('</br>');
    expect(html, 'a void break element survived').not.toContain('<br');

    const document = new JSDOM(html).window.document;
    const formatted = document.querySelector('svg.mermaid .nodeLabel strong');

    expect(formatted?.textContent).toBe('First line\nsecond line');
    expect(formatted?.getAttribute('style')).toMatch(/white-space:\s*pre\s*!\s*important/);
  });

  it('rewrites a label break wherever Mermaid puts it', () => {
    // Some shapes here are synthetic: they stand in for label structures a
    // future Mermaid release could emit but this one does not (#789). The
    // invariant is that no `br` reaches the serializer and that whatever holds
    // the resulting newline honors it, without taking away wrapping the
    // container was measured with.
    const NOWRAP = 'display: table-cell; white-space: nowrap; line-height: 1.5;';
    const WRAPPING = 'display: table; white-space: break-spaces; line-height: 1.5; width: 200px;';

    const element = (tagName, children, properties = {}) => ({
      type: 'element',
      tagName,
      properties,
      children,
    });
    const text = (value) => ({ type: 'text', value });
    const labelFigure = (inner, containerStyle) =>
      element(
        'figure',
        [
          // The SVG hangs off the graphic wrapper, which is where
          // `rehypeMermaidSvg` looks for it (#989).
          element(
            'div',
            [
              element('svg', [
                element('foreignObject', [element('div', [inner], { style: containerStyle })]),
              ]),
            ],
            { className: ['mermaid-figure__graphic'] },
          ),
        ],
        { className: ['mermaid-figure'] },
      );

    const broken = (tagName, properties = {}) =>
      element(tagName, [text('A'), element('br', []), text('B')], properties);

    const shapes = {
      paragraph: [element('span', [broken('p')]), NOWRAP],
      noParagraph: [broken('span'), NOWRAP],
      nestedInline: [
        element('span', [element('p', [text('A'), broken('em', { style: 'color:#333' })])]),
        NOWRAP,
      ],
      consecutive: [
        element('span', [
          element('p', [text('a'), element('br', []), element('br', []), text('b')]),
        ]),
        NOWRAP,
      ],
      wrappingContainer: [element('span', [broken('p')]), WRAPPING],
      undeclaredContainer: [element('span', [broken('p')]), undefined],
      importantOwnDeclaration: [
        broken('span', { style: 'white-space: nowrap !important' }),
        NOWRAP,
      ],
      // `!important` outranks source order, so the effective value here is
      // `nowrap` even though `break-spaces` is declared later.
      importantOutranksOrder: [
        element('span', [broken('p')]),
        'white-space: nowrap !important; white-space: break-spaces; line-height: 1.5;',
      ],
      // A raw label can declare `nowrap` inside a wrapping container, spelled
      // with whitespace or a comment before the colon. Missing either spelling
      // reads the container's `break-spaces`, adds nothing, and lets the
      // browser collapse the newline under the `nowrap` that really applies.
      spacedDeclaration: [
        element('span', [broken('p', { style: 'white-space : nowrap' })]),
        WRAPPING,
      ],
      commentedDeclaration: [
        element('span', [broken('p', { style: 'white-space /* c */ : nowrap' })]),
        WRAPPING,
      ],
    };

    const rendered = Object.fromEntries(
      Object.entries(shapes).map(([name, [inner, containerStyle]]) => {
        const tree = { type: 'root', children: [labelFigure(inner, containerStyle)] };
        rehypeMermaidSvg()(tree);
        return [name, toHtml(tree)];
      }),
    );

    for (const [name, html] of Object.entries(rendered)) {
      expect(html, `${name}: a doubled line break survived serialization`).not.toContain('</br>');
      expect(html, `${name}: a void break element survived`).not.toContain('<br');
    }

    // A non-wrapping container needs `pre`, which is its own rule plus
    // newlines, and `preserve-breaks` to keep its space collapsing. Both are
    // `!important` so a label declaring its own `white-space` cannot win.
    const PRE = 'white-space: pre !important; white-space-collapse: preserve-breaks !important';
    expect(rendered.paragraph).toContain(`<p style="${PRE}">A\nB</p>`);
    expect(rendered.noParagraph).toContain(`<span style="${PRE}">A\nB</span>`);
    // An existing declaration is kept, and the new one is appended so it wins.
    expect(rendered.nestedInline).toContain(`<em style="color:#333; ${PRE}">A\nB</em>`);
    // Consecutive breaks keep the blank line Mermaid measured the box for.
    expect(rendered.consecutive).toContain(`<p style="${PRE}">a\n\nb</p>`);
    // `break-spaces` already honors newlines. Forcing a value would drop the
    // wrapping Mermaid measured this label with, so nothing is added.
    expect(rendered.wrappingContainer).toContain('<p>A\nB</p>');
    // With nothing declared, wrapping is the default and must be preserved.
    expect(rendered.undeclaredContainer).toContain(
      '<p style="white-space: pre-wrap !important; white-space-collapse: preserve-breaks !important">A\nB</p>',
    );
    // A label declaring its own important white-space is still overridden.
    expect(rendered.importantOwnDeclaration).toContain(
      `<span style="white-space: nowrap !important; ${PRE}">A\nB</span>`,
    );
    // Reading the last declaration instead of the winning one would misread
    // this container as wrapping and leave the newline to collapse.
    expect(rendered.importantOutranksOrder).toContain(`<p style="${PRE}">A\nB</p>`);
    expect(rendered.spacedDeclaration).toContain(
      `<p style="white-space : nowrap; ${PRE}">A\nB</p>`,
    );
    expect(rendered.commentedDeclaration).toContain(
      `<p style="white-space /* c */ : nowrap; ${PRE}">A\nB</p>`,
    );
  });

  it('ships every built label break as a single line break', () => {
    expect(existsSync(builtBlogRoot), 'dist/blog must exist; run npm run build first').toBe(true);
    let multilineLabelCount = 0;

    for (const pagePath of builtDiagramPagePaths()) {
      const slug = builtDiagramSlug(pagePath);
      const html = readFileSync(pagePath, 'utf8');
      const document = new JSDOM(html).window.document;

      expect(html, `${slug}: a doubled Mermaid line break shipped`).not.toContain('</br>');
      expect(
        document.querySelectorAll('svg.mermaid foreignObject br'),
        `${slug}: a label break can still be doubled by an HTML parser`,
      ).toHaveLength(0);
      multilineLabelCount += [...document.querySelectorAll('svg.mermaid .nodeLabel')].filter(
        (label) => label.textContent.includes('\n'),
      ).length;
    }

    expect(
      multilineLabelCount,
      'the assertion must exercise multiline built labels',
    ).toBeGreaterThan(0);
  });

  it('ships built diagrams as accessible static SVG', () => {
    expect(existsSync(builtBlogRoot), 'dist/blog must exist; run npm run build first').toBe(true);
    let diagramCount = 0;
    // Counted per surface, not in bulk (#994). Both were once satisfiable by the
    // sidebar alone: the body could not carry a caption until #989, and no body
    // fence carried one until #994, so a guard that only asked "did any caption
    // ship" would have gone on passing with the body surface uncovered.
    let sidebarCaptions = 0;
    let bodyCaptions = 0;

    for (const pagePath of builtDiagramPagePaths()) {
      const slug = builtDiagramSlug(pagePath);
      const html = readFileSync(pagePath, 'utf8');
      const document = new JSDOM(html).window.document;
      const figures = document.querySelectorAll('.mermaid-figure');
      diagramCount += figures.length;

      expect(html, `${slug}: Mermaid still loads from the network`).not.toMatch(
        /cdn\.jsdelivr\.net\/npm\/mermaid/i,
      );
      expect(
        document.querySelectorAll('pre.mermaid, code.language-mermaid'),
        `${slug}: raw Mermaid source shipped`,
      ).toHaveLength(0);

      for (const figure of figures) {
        const graphic = figure.querySelector('.mermaid-figure__graphic');
        const descriptionId = graphic?.getAttribute('aria-describedby');
        const svg = figure.querySelector('svg.mermaid');
        // The caption is the span, not the figcaption (#998). Since every
        // article diagram now carries a figcaption for its `Figure N` label,
        // reading the figcaption here would count a label-only figure as
        // captioned and turn the per-surface guards below into a count of
        // diagrams — passing on a site where no diagram had a caption at all.
        const caption = figure.querySelector('.mermaid-figure__caption');
        expect(graphic, `${slug}: missing graphic element`).not.toBeNull();
        expect(graphic?.getAttribute('role'), `${slug}: missing image role`).toBe('img');
        expect(graphic?.getAttribute('aria-label')?.trim(), `${slug}: missing title`).toBeTruthy();
        expect(graphic?.getAttribute('tabindex'), `${slug}: unreachable scroll region`).toBe('0');
        expect(figure.getAttribute('role'), `${slug}: the figure must not be the image`).toBeNull();
        expect(
          descriptionId ? document.getElementById(descriptionId)?.textContent.trim() : '',
          `${slug}: missing description`,
        ).toBeTruthy();
        expect(svg, `${slug}: missing static SVG`).not.toBeNull();
        expect(svg?.getAttribute('aria-hidden'), `${slug}: duplicate SVG semantics`).toBe('true');
        expect(svg?.getAttribute('focusable')).toBe('false');
        expect(svg?.hasAttribute('viewBox'), `${slug}: missing responsive viewport`).toBe(true);
        // A visible caption inside the role="img" element would be
        // presentational — announced as part of the diagram's name at best,
        // and not at all at worst (#989).
        if (caption) {
          if (figure.closest('.blog-sidebar-item')) sidebarCaptions += 1;
          else bodyCaptions += 1;
          expect(caption.textContent?.trim(), `${slug}: empty caption`).toBeTruthy();
          expect(
            caption.closest('.mermaid-figure__graphic'),
            `${slug}: caption is inside the graphic`,
          ).toBeNull();
          expect(
            graphic?.getAttribute('aria-label'),
            `${slug}: caption absorbed into the accessible name`,
          ).not.toBe(caption.textContent?.trim());
        }
      }
    }

    expect(diagramCount, 'the assertion must exercise built diagrams').toBeGreaterThan(0);
    // The caption arm is only a check while some built page actually carries
    // one, and it has to be checked on both surfaces: the point of #989 was that
    // they emit the same element, and a count that lumped them together could
    // not tell one of them going dark from the other carrying both.
    expect(sidebarCaptions, 'the assertion must exercise a sidebar caption').toBeGreaterThan(0);
    expect(bodyCaptions, 'the assertion must exercise a body-fence caption').toBeGreaterThan(0);
  });

  it('preserves the representative production syntax surface', () => {
    const paletteDocument = new JSDOM(
      readFileSync(resolve(builtBlogRoot, 'two-blues-one-composition/index.html'), 'utf8'),
    ).window.document;
    const failureModesDocument = new JSDOM(
      readFileSync(
        resolve(builtBlogRoot, 'six-prs-one-bug-agent-failure-modes/index.html'),
        'utf8',
      ),
    ).window.document;

    expect(paletteDocument.querySelector('[style*="fill:#DA2418" i]')).not.toBeNull();
    expect(paletteDocument.querySelector('.edge-pattern-dotted')).not.toBeNull();
    expect(
      [...failureModesDocument.querySelectorAll('svg.mermaid foreignObject .nodeLabel')].some(
        (label) => label.textContent.includes('\n'),
      ),
    ).toBe(true);
    expect(failureModesDocument.body.textContent).toContain('TipTap / ProseMirror');
    expect(failureModesDocument.body.textContent).toContain('Sent Email HTML');
  });

  it('does not emit Mermaid into production client JavaScript', () => {
    const clientJavaScript = readdirSync(builtRoot, { recursive: true })
      .filter((entry) => typeof entry === 'string' && entry.endsWith('.js'))
      .sort();
    expect(clientJavaScript).not.toHaveLength(0);

    for (const relativePath of clientJavaScript) {
      expect(readFileSync(resolve(builtRoot, relativePath), 'utf8')).not.toMatch(/mermaid/i);
    }
  });

  /**
   * The sidebar's width ceiling, exercised from both sides (#986).
   *
   * Both fixtures are the same graph with a different node count, so the only
   * thing that varies between the two cases is the width Mermaid draws — not the
   * shape, the labels, or the styling. One row of small nodes is the cheapest
   * way to buy width in Mermaid, which makes the pair a dial rather than two
   * unrelated diagrams.
   *
   * The narrow case is the control and is not optional. A test that only proved
   * the throw would pass just as well if `assertFitsSidebar` rejected every
   * diagram it was handed, which is the one failure that would empty the sidebar
   * without anyone noticing — the built-page suite treats an empty sidebar as
   * vacuous rather than as a pass, but this is where it would start.
   */
  describe('the blog sidebar width ceiling', () => {
    const row = (count) =>
      [
        'graph LR',
        ...Array.from({ length: count }, (_, index) => `    N${index} --> N${index + 1}`),
      ].join('\n');

    const sidebarItem = (content) => [
      {
        type: 'mermaid',
        title: 'Ceiling fixture',
        description: 'A chain of nodes, drawn wide enough or narrow enough to test the ceiling.',
        content,
      },
    ];

    it('renders a diagram narrow enough for the sidebar', async () => {
      const rendered = await renderSidebarMermaid(sidebarItem(row(1)));
      const svg = new JSDOM(rendered.get(0)).window.document.querySelector('svg.mermaid');
      const width = Number(svg?.getAttribute('viewBox')?.split(/[\s,]+/)[2]);

      // Asserted, not assumed: a fixture that had drifted over the ceiling would
      // otherwise turn this control into a second copy of the case below.
      expect(width).toBeLessThanOrEqual(SIDEBAR_MAX_NATURAL_WIDTH_PX);
      expect(rendered.get(0)).toContain('<svg');
    });

    it('refuses a diagram too wide to read in the sidebar', async () => {
      // Names the width, the ceiling, and where the diagram should go instead —
      // the message is the whole remedy an author gets, so it is part of the
      // contract rather than incidental text.
      await expect(renderSidebarMermaid(sidebarItem(row(12)), 'post.md')).rejects.toThrow(
        /post\.md.*Ceiling fixture.*\d+px.*ceiling.*body.*mermaid fence/s,
      );
    });

    it('renders a too-wide diagram through the policy-free renderer', async () => {
      // The split #986 made: the ceiling belongs to the sidebar surface, not to
      // the renderer. Three suites fixture wide diagrams for reasons that have
      // nothing to do with placement — a treemap draws wide because that is what
      // a treemap does — and this is what keeps the ceiling from reaching them.
      const rendered = await renderMermaidFigures(sidebarItem(row(12)));

      expect(rendered.get(0)).toContain('<svg');
    });
  });

  it('keeps custom Mermaid grammar and the old post-build renderer deleted', () => {
    const contrastTest = readFileSync(resolve('tests/mermaid-contrast.test.js'), 'utf8');
    const ogIntegration = readFileSync(resolve('src/integrations/og-images.mjs'), 'utf8');
    const layout = readFileSync(resolve('src/layouts/BlogPost.astro'), 'utf8');

    expect(existsSync(resolve('scripts/check-mermaid-contrast.mjs'))).toBe(false);
    expect(contrastTest).not.toMatch(/mermaidStatements|parseStyleProperties/);
    expect(ogIntegration).not.toMatch(/renderMermaidDiagrams|MERMAID_BUNDLE_PATH/);
    expect(layout).not.toMatch(/import\(['"]mermaid['"]\)|mermaid\.run/);
  });
});
