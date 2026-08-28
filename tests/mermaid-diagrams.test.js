import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, relative, resolve, sep } from 'node:path';
import { toHtml } from 'hast-util-to-html';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { findFilesRecursively } from '../scripts/lib/blog-file-inventory.mjs';
import { renderSidebarMermaid } from '../src/lib/render-sidebar-mermaid.mjs';
import { rehypeMermaidSvg } from '../src/plugins/rehype-mermaid-accessibility.mjs';

const builtRoot = resolve('dist');
const builtBlogRoot = resolve('dist/blog');
// Mermaid is supported in two collections (#753), so the built-output
// assertions below scan both. Scanning only dist/blog would leave every
// project-page diagram uncovered by the label-break, accessibility and
// client-JS checks the moment one is authored.
const builtDiagramRoots = [builtBlogRoot, resolve('dist/projects')];
const blogFixturePath = resolve('src/content/blog/mermaid-fixture.md');

function builtBlogPagePaths() {
  return builtDiagramRoots
    .filter((root) => existsSync(root))
    .flatMap((root) =>
      findFilesRecursively(
        root,
        (filePath) => basename(filePath) === 'index.html' && dirname(filePath) !== root,
      ),
    );
}

function builtBlogSlug(pagePath) {
  const root = builtDiagramRoots.find((candidate) => pagePath.startsWith(candidate + sep));
  const base = root ?? builtBlogRoot;
  return `${basename(base)}/${relative(base, dirname(pagePath)).split(sep).join('/')}`;
}

async function validateMermaidMetadata(tree, filePath = blogFixturePath) {
  const { default: remarkMermaid } = await import('../src/plugins/remark-mermaid.mjs');
  remarkMermaid()(tree, { path: filePath });
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
      validateMermaidMetadata({ type: 'root', children: [{ ...code }] }, resolve('src/pages/about.md')),
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

  it('renders malformed Mermaid as a clean, accessible fallback', async () => {
    const rendered = await renderSidebarMermaid([
      {
        type: 'mermaid',
        title: 'Broken flow',
        description: 'A was intended to lead to B.',
        content: 'graph TD\nA -- ???',
      },
    ]);
    const document = new JSDOM(rendered.get(0)).window.document;
    const figure = document.querySelector('.mermaid-figure');

    expect(figure?.getAttribute('role')).toBeNull();
    expect(figure?.getAttribute('aria-label')).toBeNull();
    expect(figure?.getAttribute('aria-describedby')).toBeNull();
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
    const rendered = await renderSidebarMermaid([
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
    const rendered = await renderSidebarMermaid([
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
    const rendered = await renderSidebarMermaid([
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
          element('svg', [
            element('foreignObject', [element('div', [inner], { style: containerStyle })]),
          ]),
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

    for (const pagePath of builtBlogPagePaths()) {
      const slug = builtBlogSlug(pagePath);
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

    for (const pagePath of builtBlogPagePaths()) {
      const slug = builtBlogSlug(pagePath);
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
        const descriptionId = figure.getAttribute('aria-describedby');
        const svg = figure.querySelector('svg.mermaid');
        expect(figure.getAttribute('role'), `${slug}: missing image role`).toBe('img');
        expect(figure.getAttribute('aria-label')?.trim(), `${slug}: missing title`).toBeTruthy();
        expect(
          descriptionId ? document.getElementById(descriptionId)?.textContent.trim() : '',
          `${slug}: missing description`,
        ).toBeTruthy();
        expect(svg, `${slug}: missing static SVG`).not.toBeNull();
        expect(svg?.getAttribute('aria-hidden'), `${slug}: duplicate SVG semantics`).toBe('true');
        expect(svg?.getAttribute('focusable')).toBe('false');
        expect(svg?.hasAttribute('viewBox'), `${slug}: missing responsive viewport`).toBe(true);
      }
    }

    expect(diagramCount, 'the assertion must exercise built diagrams').toBeGreaterThan(0);
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
