import { toHtml } from 'hast-util-to-html';
import rehypeMermaid from 'rehype-mermaid';
import {
  createMermaidFigure,
  mermaidOptions,
  rehypeMermaidSvg,
} from '../plugins/rehype-mermaid-accessibility.mjs';

const render = rehypeMermaid({ ...mermaidOptions, prefix: 'sidebar-mermaid' });
const finish = rehypeMermaidSvg();

/** Render all sidebar diagrams in one maintained rehype-mermaid pass. */
export async function renderSidebarMermaid(items, filePath = 'sidebar') {
  const diagrams = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.type === 'mermaid');
  if (diagrams.length === 0) return new Map();

  const tree = {
    type: 'root',
    children: diagrams.map(({ item, index }) => {
      const code = {
        type: 'element',
        tagName: 'code',
        properties: {
          className: ['language-mermaid'],
          dataMermaidTitle: item.title,
          dataMermaidDescription: item.description,
        },
        children: [{ type: 'text', value: item.content }],
      };
      return createMermaidFigure({
        sourceNode: {
          type: 'element',
          tagName: 'pre',
          properties: {
            dataMermaidTitle: item.title,
            dataMermaidDescription: item.description,
          },
          children: [code],
        },
        title: item.title,
        description: item.description,
        descriptionId: `sidebar-mermaid-description-${index + 1}`,
      });
    }),
  };

  await render(tree, { path: filePath });
  finish(tree);

  if (tree.children.length !== diagrams.length) {
    throw new Error(
      `Sidebar Mermaid rendering produced ${tree.children.length} nodes for ${diagrams.length} diagrams`,
    );
  }

  return new Map(tree.children.map((node, index) => [diagrams[index].index, toHtml(node)]));
}
