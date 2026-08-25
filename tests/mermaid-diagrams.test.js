import {
  existsSync,
  readFileSync,
  readdirSync,
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
} from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { describe, it, expect } from 'vitest';
import { findFilesRecursively } from '../scripts/lib/blog-file-inventory.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const builtRoot = resolve(__dirname, '../dist');
const builtBlogRoot = resolve(__dirname, '../dist/blog');
const blogFixturePath = resolve(__dirname, '../src/content/blog/mermaid-fixture.md');

function builtBlogPagePaths() {
  return findFilesRecursively(
    builtBlogRoot,
    (filePath) => basename(filePath) === 'index.html' && dirname(filePath) !== builtBlogRoot,
  );
}

function builtBlogSlug(pagePath) {
  return relative(builtBlogRoot, dirname(pagePath)).split(sep).join('/');
}

function transformMermaid(tree, filePath = blogFixturePath) {
  return import('../src/plugins/remark-mermaid.mjs').then(({ default: remarkMermaid }) => {
    remarkMermaid()(tree, { path: filePath });
  });
}

describe('remark-mermaid plugin', () => {
  it('converts mermaid code fences to pre.mermaid elements', async () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'code',
          lang: 'mermaid',
          meta: 'title="Example flow" description="A leads directly to B."',
          value: 'graph TD\nA --> B',
        },
      ],
    };

    await transformMermaid(tree);

    expect(tree.children[0].type).toBe('html');
    expect(tree.children[0].value).toContain('class="mermaid"');
    expect(tree.children[0].value).toContain('graph TD');
    expect(tree.children[0].value).toContain('A --&gt; B');
    expect(tree.children[0].value).toContain('role="img"');
    expect(tree.children[0].value).toContain('aria-label="Example flow"');
    expect(tree.children[0].value).toContain('aria-describedby="mermaid-description-1"');
    expect(tree.children[0].value).toContain('A leads directly to B.');
    expect(tree.children[0].value).toContain('aria-hidden="true"');
    expect(tree.children[0].value).toContain(
      'class="mermaid-figure__description" aria-hidden="true"',
    );
  });

  it('does not process non-mermaid code blocks', async () => {
    const tree = {
      type: 'root',
      children: [{ type: 'code', lang: 'javascript', value: 'const x = 1;' }],
    };

    await transformMermaid(tree, resolve(__dirname, '../src/content/projects/example.md'));

    expect(tree.children[0].type).toBe('code');
    expect(tree.children[0].lang).toBe('javascript');
  });

  it('accepts Mermaid fences in nested blog content', async () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'code',
          lang: 'mermaid',
          meta: 'title="Nested flow" description="A nested article connects A to B."',
          value: 'graph TD\nA --> B',
        },
      ],
    };

    await transformMermaid(
      tree,
      resolve(__dirname, '../src/content/blog/nested/deeper/example.md'),
    );

    expect(tree.children[0].type).toBe('html');
    expect(tree.children[0].value).toContain('aria-label="Nested flow"');
  });

  it('escapes HTML in mermaid content', async () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'code',
          lang: 'mermaid',
          meta: 'title="Unsafe <flow>" description="A <script> node leads nowhere."',
          value: 'graph TD\nA["<script>alert(1)</script>"]',
        },
      ],
    };

    await transformMermaid(tree);

    expect(tree.children[0].value).not.toContain('<script>');
    expect(tree.children[0].value).toContain('&lt;script&gt;');
    expect(tree.children[0].value).toContain('aria-label="Unsafe &lt;flow&gt;"');
  });

  it('rejects mermaid fences without a short title and relational description', async () => {
    const tree = {
      type: 'root',
      children: [{ type: 'code', lang: 'mermaid', value: 'graph TD\nA --> B' }],
    };

    await expect(transformMermaid(tree)).rejects.toThrow(/title=.*description=/i);
  });

  it('accepts whitespace-separated metadata and preserves escaped quotes', async () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'code',
          lang: 'mermaid',
          meta: String.raw`title="A \"quoted\" flow" 	 description="A leads to \"B\"."`,
          value: 'graph TD\nA --> B',
        },
      ],
    };

    await transformMermaid(tree);

    expect(tree.children[0].value).toContain('aria-label="A &quot;quoted&quot; flow"');
    expect(tree.children[0].value).toContain('A leads to &quot;B&quot;.');
  });

  it('rejects adjacent metadata attributes without a whitespace separator', async () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'code',
          lang: 'mermaid',
          meta: 'title="Example flow"description="A leads directly to B."',
          value: 'graph TD\nA --> B',
        },
      ],
    };

    await expect(transformMermaid(tree)).rejects.toThrow(/title=.*description=/i);
  });

  it('rejects Mermaid fences outside the blog content collection', async () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'code',
          lang: 'mermaid',
          meta: 'title="Example flow" description="A leads directly to B."',
          value: 'graph TD\nA --> B',
        },
      ],
    };

    await expect(
      transformMermaid(tree, resolve(__dirname, '../src/content/projects/example.md')),
    ).rejects.toThrow(/only supported in src\/content\/blog/i);
  });

  it('gives every built diagram an accessible name and description', () => {
    expect(existsSync(builtBlogRoot), 'dist/blog must exist; run npm run build first').toBe(true);

    let diagramCount = 0;

    for (const pagePath of builtBlogPagePaths()) {
      const slug = builtBlogSlug(pagePath);
      const document = new JSDOM(readFileSync(pagePath, 'utf8')).window.document;
      const diagrams = document.querySelectorAll('.mermaid');
      diagramCount += diagrams.length;

      for (const diagram of diagrams) {
        const figure = diagram.closest('[role="img"]');
        expect(figure, `${slug}: diagram must be wrapped by role=img`).not.toBeNull();
        expect(
          figure?.getAttribute('aria-label')?.trim(),
          `${slug}: missing diagram title`,
        ).toBeTruthy();

        const descriptionId = figure?.getAttribute('aria-describedby');
        expect(descriptionId, `${slug}: missing aria-describedby`).toBeTruthy();
        expect(
          descriptionId ? document.getElementById(descriptionId)?.textContent.trim() : '',
          `${slug}: missing relational description`,
        ).toBeTruthy();
        expect(
          descriptionId
            ? document.getElementById(descriptionId)?.getAttribute('aria-hidden')
            : null,
          `${slug}: description is separately exposed to assistive technology`,
        ).toBe('true');
        expect(diagram.getAttribute('aria-hidden'), `${slug}: raw Mermaid DSL is exposed`).toBe(
          'true',
        );
      }
    }

    expect(diagramCount, 'the assertion must exercise at least one built diagram').toBeGreaterThan(
      0,
    );
  });

  it('ships every diagram as static inline SVG with no Mermaid CDN runtime', () => {
    expect(existsSync(builtBlogRoot), 'dist/blog must exist; run npm run build first').toBe(true);

    let diagramCount = 0;

    for (const pagePath of builtBlogPagePaths()) {
      const slug = builtBlogSlug(pagePath);
      const html = readFileSync(pagePath, 'utf8');
      const document = new JSDOM(html).window.document;
      const diagrams = document.querySelectorAll('svg.mermaid');
      diagramCount += diagrams.length;

      expect(html, `${slug}: Mermaid still loads from the network`).not.toMatch(
        /cdn\.jsdelivr\.net\/npm\/mermaid/i,
      );
      expect(
        document.querySelectorAll('pre.mermaid'),
        `${slug}: raw Mermaid source shipped instead of SVG`,
      ).toHaveLength(0);

      for (const diagram of diagrams) {
        expect(diagram.getAttribute('aria-hidden'), `${slug}: SVG duplicates AX output`).toBe(
          'true',
        );
        expect(
          diagram.innerHTML.trim().length,
          `${slug}: Mermaid emitted an empty SVG`,
        ).toBeGreaterThan(0);
        expect(diagram.hasAttribute('viewBox'), `${slug}: SVG has no rendered viewport`).toBe(
          true,
        );
      }
    }

    expect(diagramCount, 'the assertion must exercise at least one built diagram').toBeGreaterThan(
      0,
    );
  });

  it('uses the pinned local Mermaid runtime only in development mode', () => {
    const layout = readFileSync(resolve(__dirname, '../src/layouts/BlogPost.astro'), 'utf8');

    expect(layout).toContain('if (import.meta.env.DEV)');
    expect(layout).toContain("await import('mermaid')");
    expect(layout).not.toMatch(/cdn\.jsdelivr\.net\/npm\/mermaid/i);
  });

  it('excludes the Mermaid runtime and production import from emitted client JavaScript', () => {
    const clientJavaScript = readdirSync(builtRoot, { recursive: true })
      .filter((entry) => typeof entry === 'string' && entry.endsWith('.js'))
      .sort();

    expect(clientJavaScript, 'the production build must emit client JavaScript').not.toHaveLength(
      0,
    );

    for (const relativePath of clientJavaScript) {
      const source = readFileSync(resolve(builtRoot, relativePath), 'utf8');
      expect(source, `${relativePath}: Mermaid leaked into the production bundle`).not.toMatch(
        /mermaid/i,
      );
    }
  });

  it('preserves representative Mermaid syntax in the static SVG output', () => {
    const paletteHtml = readFileSync(
      resolve(builtBlogRoot, 'two-blues-one-composition', 'index.html'),
      'utf8',
    );
    const failureModesHtml = readFileSync(
      resolve(builtBlogRoot, 'six-prs-one-bug-agent-failure-modes', 'index.html'),
      'utf8',
    );
    const paletteDocument = new JSDOM(paletteHtml).window.document;
    const failureModesDocument = new JSDOM(failureModesHtml).window.document;

    expect(paletteDocument.querySelector('svg.mermaid')).not.toBeNull();
    expect(paletteDocument.body.textContent).toContain('museum scan');
    expect(paletteDocument.querySelector('[style*="fill:#DA2418" i]')).not.toBeNull();
    expect(paletteDocument.querySelector('.edge-pattern-dotted')).not.toBeNull();

    expect(failureModesDocument.querySelector('svg.mermaid foreignObject br')).not.toBeNull();
    expect(failureModesDocument.querySelector('svg.mermaid')?.textContent).toContain(
      'TipTap / ProseMirror',
    );
    expect(failureModesDocument.querySelector('svg.mermaid')?.textContent).toContain(
      'Sent Email HTML',
    );
  });

  it('renders the complete documented syntax surface through the build pass', async () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), 'mermaid-static-build-'));
    const fixturePage = resolve(fixtureRoot, 'blog', 'syntax-coverage');
    const unchangedPage = resolve(fixtureRoot, 'blog', 'without-diagrams');
    const prefix = `<!doctype html>\n<html data-preserve="yes"><head><script type="application/ld+json">{"name":"A & B < C","markup":"<pre class='mermaid'>literal JSON-LD example</pre>"}</script><script>const example = '<pre class="mermaid">literal script example</pre>';</script></head><body>\n<!-- <pre class="mermaid">literal comment example</pre> -->\n<template><pre class="mermaid">literal template example</pre></template>\n<p title="A &amp; B">A&nbsp;&amp; B</p>\n<figure class="mermaid-figure">`;
    const suffix = `</figure>\n<!-- preserve this whitespace -->\n</body></html>\n`;
    const source = `${prefix}<pre class="mermaid" aria-hidden="true">graph TD
subgraph GROUP["Grouped nodes"]
  A["Alpha&lt;br/&gt;line"] -.-&gt;|"dotted label"| B["Beta"]
end
style A fill:#ff0000,stroke:#000000,color:#ffffff</pre>${suffix}`;
    const unchangedSource = `<!doctype html>\n<html><head><script type="application/ld+json">{"text":"<pre class='mermaid'>literal example</pre>"}</script></head><body>\n<p>A&nbsp;&amp; B</p>\n</body></html>\n`;
    let browser;

    try {
      mkdirSync(fixturePage, { recursive: true });
      mkdirSync(unchangedPage, { recursive: true });
      writeFileSync(resolve(fixturePage, 'index.html'), source);
      writeFileSync(resolve(unchangedPage, 'index.html'), unchangedSource);

      const { chromium } = await import('playwright');
      const { renderMermaidDiagrams } = await import('../src/integrations/og-images.mjs');
      browser = await chromium.launch();
      await renderMermaidDiagrams({
        browser,
        distDir: fixtureRoot,
        logger: { info() {}, warn() {} },
      });

      const renderedHtml = readFileSync(resolve(fixturePage, 'index.html'), 'utf8');
      const svgStart = renderedHtml.indexOf('<svg');
      const svgEnd = renderedHtml.lastIndexOf('</svg>') + '</svg>'.length;
      expect(renderedHtml.slice(0, svgStart)).toBe(prefix);
      expect(renderedHtml.slice(svgEnd)).toBe(suffix);
      expect(readFileSync(resolve(unchangedPage, 'index.html'), 'utf8')).toBe(unchangedSource);

      const result = new JSDOM(renderedHtml).window.document;
      expect(result.querySelector('pre.mermaid')).toBeNull();
      expect(result.querySelector('svg.mermaid')).not.toBeNull();
      expect(result.querySelector('.cluster')).not.toBeNull();
      expect(result.querySelector('.edge-pattern-dotted')).not.toBeNull();
      expect(result.querySelector('foreignObject br')).not.toBeNull();
      expect(result.querySelector('[style*="fill:#ff0000" i]')).not.toBeNull();
      expect(result.body.textContent).toContain('dotted label');
    } finally {
      await browser?.close();
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  it('does not initialize a DOM or browser renderer when blog pages contain no diagrams', async () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), 'mermaid-static-empty-'));
    const fixturePage = resolve(fixtureRoot, 'blog', 'without-diagrams');
    const source = '<!doctype html><html><body><p>No diagrams here.</p></body></html>\n';

    try {
      mkdirSync(fixturePage, { recursive: true });
      writeFileSync(resolve(fixturePage, 'index.html'), source);

      const { renderMermaidDiagrams } = await import('../src/integrations/og-images.mjs');
      await renderMermaidDiagrams({
        browser: {
          newContext() {
            throw new Error('renderer setup must be skipped');
          },
        },
        distDir: fixtureRoot,
        logger: { info() {}, warn() {} },
      });

      expect(readFileSync(resolve(fixturePage, 'index.html'), 'utf8')).toBe(source);
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });
});
