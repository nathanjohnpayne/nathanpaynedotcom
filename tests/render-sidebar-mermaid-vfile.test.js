import { VFile } from 'vfile';
import { describe, expect, it, vi } from 'vitest';

const renderFiles = vi.hoisted(() => []);

vi.mock('rehype-mermaid', () => ({
  default: () => async (tree, file) => {
    renderFiles.push(file);
    for (const figure of tree.children) {
      figure.children[0] = {
        type: 'element',
        tagName: 'svg',
        properties: { viewBox: '0 0 1 1' },
        children: [],
      };
    }
  },
}));

import { renderMermaidFigures } from '../src/lib/render-sidebar-mermaid.mjs';

describe('static Mermaid figure rendering', () => {
  it('passes a real VFile to the build-time transformer and returns SVG', async () => {
    const output = await renderMermaidFigures(
      [
        {
          type: 'mermaid',
          title: 'VFile flow',
          description: 'A connects to B.',
          content: 'graph TD\nA --> B',
        },
      ],
      '/tmp/sidebar-fixture.md',
    );

    expect(renderFiles).toHaveLength(1);
    expect(renderFiles[0]).toBeInstanceOf(VFile);
    expect(renderFiles[0].path).toBe('/tmp/sidebar-fixture.md');
    expect(output.get(0)).toContain('<svg');
  });
});
