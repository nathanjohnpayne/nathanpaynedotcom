import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, relative, resolve, sep } from 'node:path';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { findFilesRecursively } from '../scripts/lib/blog-file-inventory.mjs';
import { renderSidebarMermaid } from '../src/lib/render-sidebar-mermaid.mjs';

const builtRoot = resolve('dist');
const builtBlogRoot = resolve('dist/blog');
const blogFixturePath = resolve('src/content/blog/mermaid-fixture.md');

function builtBlogPagePaths() {
  return findFilesRecursively(
    builtBlogRoot,
    (filePath) => basename(filePath) === 'index.html' && dirname(filePath) !== builtBlogRoot,
  );
}

function builtBlogSlug(pagePath) {
  return relative(builtBlogRoot, dirname(pagePath)).split(sep).join('/');
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

  it('accepts nested blog content but rejects unsupported collections', async () => {
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
    await expect(
      validateMermaidMetadata(
        { type: 'root', children: [{ ...code }] },
        resolve('src/content/projects/example.md'),
      ),
    ).rejects.toThrow(/only supported in src\/content\/blog/i);
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
    const labelLines = [...document.querySelectorAll('svg.mermaid .nodeLabel')].map((label) =>
      [...label.querySelectorAll('p')].map((line) => line.textContent),
    );

    expect(labelLines).toEqual([
      ['First line', 'second line'],
      ['Third line', 'fourth line'],
    ]);
    expect(document.querySelector('svg.mermaid foreignObject br')).toBeNull();
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
      multilineLabelCount += document.querySelectorAll('svg.mermaid .nodeLabel p + p').length;
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
      failureModesDocument.querySelector('svg.mermaid foreignObject .nodeLabel p + p'),
    ).not.toBeNull();
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
