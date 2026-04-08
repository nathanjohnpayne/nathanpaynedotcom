import { describe, it, expect } from 'vitest';
import { _renderMermaidDiagram as renderMermaidDiagram } from '../src/plugins/remark-mermaid.mjs';

describe('remark-mermaid: renderMermaidDiagram', () => {
  describe('fanout layout', () => {
    it('renders a root node with multiple children as fanout', () => {
      const code = [
        'graph TD',
        'A["Root"] --> B["Child 1"]',
        'A --> C["Child 2"]',
        'A --> D["Child 3"]',
      ].join('\n');

      const html = renderMermaidDiagram(code);

      expect(html).toContain('blog-diagram--fanout');
      expect(html).toContain('aria-label="Diagram"');
      expect(html).toContain('>Root</div>');
      expect(html).toContain('blog-diagram-branch');
      expect(html).toContain('blog-diagram-fanout-row');
      expect(html).toContain('>Child 1</div>');
      expect(html).toContain('>Child 2</div>');
      expect(html).toContain('>Child 3</div>');
    });

    it('adds aria-hidden to branch element', () => {
      const code = [
        'graph TD',
        'A["Root"] --> B["Left"]',
        'A --> C["Right"]',
      ].join('\n');

      const html = renderMermaidDiagram(code);
      expect(html).toContain('blog-diagram-branch" aria-hidden="true"');
    });

    it('uses node ID as fallback when no label is defined', () => {
      const code = [
        'graph TD',
        'A --> B',
        'A --> C',
      ].join('\n');

      const html = renderMermaidDiagram(code);
      expect(html).toContain('>A</div>');
      expect(html).toContain('>B</div>');
      expect(html).toContain('>C</div>');
    });
  });

  describe('chain layout', () => {
    it('renders a linear sequence with arrows', () => {
      const code = [
        'graph TD',
        'A["Step 1"] --> B["Step 2"]',
        'B --> C["Step 3"]',
      ].join('\n');

      const html = renderMermaidDiagram(code);

      expect(html).toContain('blog-diagram--chain');
      expect(html).toContain('aria-label="Diagram"');
      expect(html).toContain('>Step 1</div>');
      expect(html).toContain('blog-diagram-arrow');
      expect(html).toContain('>Step 2</div>');
      expect(html).toContain('>Step 3</div>');
    });

    it('adds aria-hidden to arrow elements', () => {
      const code = [
        'graph TD',
        'A["First"] --> B["Second"]',
      ].join('\n');

      const html = renderMermaidDiagram(code);
      expect(html).toContain('blog-diagram-arrow" aria-hidden="true"');
    });

    it('does not include a loop indicator when there is no loop-back', () => {
      const code = [
        'graph TD',
        'A["Start"] --> B["End"]',
      ].join('\n');

      const html = renderMermaidDiagram(code);
      expect(html).not.toContain('blog-diagram-loop');
    });
  });

  describe('chain layout with loop-back', () => {
    it('renders a loop indicator when last node points to first', () => {
      const code = [
        'graph TD',
        'A["Plan"] --> B["Build"]',
        'B --> C["Review"]',
        'C --> A',
      ].join('\n');

      const html = renderMermaidDiagram(code);

      expect(html).toContain('blog-diagram--chain');
      expect(html).toContain('blog-diagram-loop');
      expect(html).toContain('\u21ba');
    });

    it('adds aria-hidden to loop indicator', () => {
      const code = [
        'graph TD',
        'A["Plan"] --> B["Build"]',
        'B --> A',
      ].join('\n');

      const html = renderMermaidDiagram(code);
      expect(html).toContain('blog-diagram-loop" aria-hidden="true"');
    });
  });

  describe('HTML escaping', () => {
    it('escapes HTML special characters in labels', () => {
      const code = [
        'graph TD',
        'A["<script>alert(1)</script>"] --> B["Tom & Jerry"]',
      ].join('\n');

      const html = renderMermaidDiagram(code);
      expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
      expect(html).toContain('Tom &amp; Jerry');
      expect(html).not.toContain('<script>');
    });

    it('escapes quotes in labels', () => {
      const code = [
        'graph TD',
        'A["She said \'hello\'"] --> B["End"]',
      ].join('\n');

      const html = renderMermaidDiagram(code);
      expect(html).toContain('She said &#39;hello&#39;');
    });
  });

  describe('non-mermaid code blocks', () => {
    it('does not process non-mermaid code (plugin function identity)', async () => {
      // The remark plugin only visits code nodes with lang=mermaid.
      // This is tested at the AST level by importing the plugin function itself.
      const { default: remarkMermaid } = await import('../src/plugins/remark-mermaid.mjs');

      const jsCodeNode = { type: 'code', lang: 'javascript', value: 'const x = 1;' };
      const tree = { type: 'root', children: [jsCodeNode] };

      remarkMermaid()(tree);

      // The node should remain unchanged (still type: 'code', not 'html')
      expect(tree.children[0].type).toBe('code');
      expect(tree.children[0].lang).toBe('javascript');
    });
  });
});
