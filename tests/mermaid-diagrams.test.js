import { describe, it, expect } from 'vitest';

describe('remark-mermaid plugin', () => {
  it('converts mermaid code fences to pre.mermaid elements', async () => {
    const { default: remarkMermaid } = await import('../src/plugins/remark-mermaid.mjs');

    const tree = {
      type: 'root',
      children: [{ type: 'code', lang: 'mermaid', value: 'graph TD\nA --> B' }],
    };

    remarkMermaid()(tree);

    expect(tree.children[0].type).toBe('html');
    expect(tree.children[0].value).toContain('class="mermaid"');
    expect(tree.children[0].value).toContain('graph TD');
    expect(tree.children[0].value).toContain('A --&gt; B');
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
        { type: 'code', lang: 'mermaid', value: 'graph TD\nA["<script>alert(1)</script>"]' },
      ],
    };

    remarkMermaid()(tree);

    expect(tree.children[0].value).not.toContain('<script>');
    expect(tree.children[0].value).toContain('&lt;script&gt;');
  });
});
