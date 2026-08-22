import {
  existsSync,
  readFileSync,
  readdirSync,
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const builtBlogRoot = resolve(__dirname, '../dist/blog');

describe('remark-mermaid plugin', () => {
  it('converts mermaid code fences to pre.mermaid elements', async () => {
    const { default: remarkMermaid } = await import('../src/plugins/remark-mermaid.mjs');

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

    remarkMermaid()(tree);

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
    const { default: remarkMermaid } = await import('../src/plugins/remark-mermaid.mjs');

    const tree = {
      type: 'root',
      children: [{ type: 'code', lang: 'javascript', value: 'const x = 1;' }],
    };

    remarkMermaid()(tree);

    expect(tree.children[0].type).toBe('code');
    expect(tree.children[0].lang).toBe('javascript');
  });

  it('escapes HTML in mermaid content', async () => {
    const { default: remarkMermaid } = await import('../src/plugins/remark-mermaid.mjs');

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

    remarkMermaid()(tree);

    expect(tree.children[0].value).not.toContain('<script>');
    expect(tree.children[0].value).toContain('&lt;script&gt;');
    expect(tree.children[0].value).toContain('aria-label="Unsafe &lt;flow&gt;"');
  });

  it('rejects mermaid fences without a short title and relational description', async () => {
    const { default: remarkMermaid } = await import('../src/plugins/remark-mermaid.mjs');

    const tree = {
      type: 'root',
      children: [{ type: 'code', lang: 'mermaid', value: 'graph TD\nA --> B' }],
    };

    expect(() => remarkMermaid()(tree)).toThrow(/title=.*description=/i);
  });

  it('gives every built diagram an accessible name and description', () => {
    expect(existsSync(builtBlogRoot), 'dist/blog must exist; run npm run build first').toBe(true);

    let diagramCount = 0;

    for (const entry of readdirSync(builtBlogRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;

      const pagePath = resolve(builtBlogRoot, entry.name, 'index.html');
      if (!existsSync(pagePath)) continue;

      const document = new JSDOM(readFileSync(pagePath, 'utf8')).window.document;
      const diagrams = document.querySelectorAll('.mermaid');
      diagramCount += diagrams.length;

      for (const diagram of diagrams) {
        const figure = diagram.closest('[role="img"]');
        expect(figure, `${entry.name}: diagram must be wrapped by role=img`).not.toBeNull();
        expect(
          figure?.getAttribute('aria-label')?.trim(),
          `${entry.name}: missing diagram title`,
        ).toBeTruthy();

        const descriptionId = figure?.getAttribute('aria-describedby');
        expect(descriptionId, `${entry.name}: missing aria-describedby`).toBeTruthy();
        expect(
          descriptionId ? document.getElementById(descriptionId)?.textContent.trim() : '',
          `${entry.name}: missing relational description`,
        ).toBeTruthy();
        expect(
          descriptionId
            ? document.getElementById(descriptionId)?.getAttribute('aria-hidden')
            : null,
          `${entry.name}: description is separately exposed to assistive technology`,
        ).toBe('true');
        expect(
          diagram.getAttribute('aria-hidden'),
          `${entry.name}: raw Mermaid DSL is exposed`,
        ).toBe('true');
      }
    }

    expect(diagramCount, 'the assertion must exercise at least one built diagram').toBeGreaterThan(
      0,
    );
  });

  it('ships every diagram as static inline SVG with no Mermaid CDN runtime', () => {
    expect(existsSync(builtBlogRoot), 'dist/blog must exist; run npm run build first').toBe(true);

    let diagramCount = 0;

    for (const entry of readdirSync(builtBlogRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;

      const pagePath = resolve(builtBlogRoot, entry.name, 'index.html');
      if (!existsSync(pagePath)) continue;

      const html = readFileSync(pagePath, 'utf8');
      const document = new JSDOM(html).window.document;
      const diagrams = document.querySelectorAll('svg.mermaid');
      diagramCount += diagrams.length;

      expect(html, `${entry.name}: Mermaid still loads from the network`).not.toMatch(
        /cdn\.jsdelivr\.net\/npm\/mermaid/i,
      );
      expect(
        document.querySelectorAll('pre.mermaid'),
        `${entry.name}: raw Mermaid source shipped instead of SVG`,
      ).toHaveLength(0);

      for (const diagram of diagrams) {
        expect(diagram.getAttribute('aria-hidden'), `${entry.name}: SVG duplicates AX output`).toBe(
          'true',
        );
        expect(
          diagram.querySelectorAll('.node').length,
          `${entry.name}: SVG has no rendered nodes`,
        ).toBeGreaterThan(0);
        expect(
          diagram.querySelectorAll('.edgePaths .flowchart-link').length,
          `${entry.name}: SVG has no rendered edges`,
        ).toBeGreaterThan(0);
      }
    }

    expect(diagramCount, 'all 10 inline and 6 sidebar diagrams must be rendered').toBe(16);
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
    const source = `<!DOCTYPE html><html><body><figure class="mermaid-figure"><pre class="mermaid">graph TD
subgraph GROUP["Grouped nodes"]
  A["Alpha&lt;br/&gt;line"] -.-&gt;|"dotted label"| B["Beta"]
end
style A fill:#ff0000,stroke:#000000,color:#ffffff</pre></figure></body></html>`;
    let browser;

    try {
      mkdirSync(fixturePage, { recursive: true });
      writeFileSync(resolve(fixturePage, 'index.html'), source);

      const { chromium } = await import('playwright');
      const { renderMermaidDiagrams } = await import('../src/integrations/og-images.mjs');
      browser = await chromium.launch();
      await renderMermaidDiagrams({
        browser,
        distDir: fixtureRoot,
        logger: { info() {}, warn() {} },
      });

      const result = new JSDOM(readFileSync(resolve(fixturePage, 'index.html'), 'utf8')).window
        .document;
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
});
