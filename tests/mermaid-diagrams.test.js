import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
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
});
