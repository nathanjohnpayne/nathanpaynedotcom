import { visit } from 'unist-util-visit';

/**
 * Remark plugin that converts ```mermaid code fences into static HTML diagrams.
 *
 * Produces the same <div class="blog-diagram ..."> structure as the legacy
 * generate-blog.js renderer. Two layout patterns are supported:
 *
 * - Fanout: a root node with out-degree > 1, rendered as root -> branch -> row of children
 * - Chain: a linear sequence of nodes with arrows, optional loop-back arrow
 *
 * No client-side Mermaid JS is loaded; the output is pure HTML styled by global.css.
 */
export default function remarkMermaid() {
  return (tree) => {
    visit(tree, 'code', (node, index, parent) => {
      if (node.lang !== 'mermaid' || parent == null || index == null) {
        return;
      }

      const html = renderMermaidDiagram(node.value);

      parent.children[index] = {
        type: 'html',
        value: html,
      };
    });
  };
}

/**
 * Escape HTML special characters in text content.
 * Matches the legacy escapeHtml() from generate-blog.js.
 */
function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Parse a Mermaid graph definition and render it as static HTML.
 *
 * This is a direct port of renderMermaidDiagram() from scripts/generate-blog.js
 * (lines 254-333). It handles two layout patterns:
 *
 * 1. Fanout: when any node has out-degree > 1, that node becomes the root of a
 *    fanout layout with a branch line and a row of child nodes.
 *
 * 2. Chain: a linear sequence of nodes connected by arrows, with an optional
 *    loop-back indicator when the last node points back to the first.
 */
function renderMermaidDiagram(code) {
  const lines = code.split('\n').map((line) => line.trim()).filter(Boolean);
  const labels = new Map();
  const edges = [];

  for (const line of lines.slice(1)) {
    const nodeMatches = [...line.matchAll(/([A-Za-z0-9_]+)\["([^"]+)"\]/g)];
    for (const match of nodeMatches) {
      labels.set(match[1], match[2]);
    }

    const normalizedLine = line.replace(/\["[^"]+"\]/g, '');
    const nodeIds = [...normalizedLine.matchAll(/([A-Za-z0-9_]+)/g)].map((m) => m[1]);
    const arrows = [...normalizedLine.matchAll(/-->/g)];
    if (arrows.length > 0) {
      // Extract node IDs between --> separators to handle chains like A --> B --> C
      const parts = normalizedLine.split(/\s*-->\s*/).map((p) => p.trim()).filter(Boolean);
      for (let i = 0; i < parts.length - 1; i++) {
        const from = parts[i].match(/([A-Za-z0-9_]+)/)?.[1];
        const to = parts[i + 1].match(/([A-Za-z0-9_]+)/)?.[1];
        if (from && to) {
          edges.push([from, to]);
        }
      }
    }
  }

  const outDegree = new Map();
  const inDegree = new Map();
  const adjacency = new Map();

  for (const [from, to] of edges) {
    outDegree.set(from, (outDegree.get(from) || 0) + 1);
    inDegree.set(to, (inDegree.get(to) || 0) + 1);
    if (!adjacency.has(from)) {
      adjacency.set(from, []);
    }
    adjacency.get(from).push(to);
    if (!inDegree.has(from)) {
      inDegree.set(from, inDegree.get(from) || 0);
    }
    if (!outDegree.has(to)) {
      outDegree.set(to, outDegree.get(to) || 0);
    }
  }

  if (edges.length === 0 && labels.size === 0) {
    return '<div class="blog-diagram" aria-label="Diagram"></div>';
  }

  if (edges.length === 0 && labels.size > 0) {
    const nodes = [...labels.entries()].map(([id, label]) =>
      `<div class="blog-diagram-node">${escapeHtml(label)}</div>`
    ).join('');
    return `<div class="blog-diagram blog-diagram--chain" aria-label="Diagram">${nodes}</div>`;
  }

  const fanoutRoot = [...outDegree.entries()].find(([, count]) => count > 1);
  if (fanoutRoot) {
    const root = fanoutRoot[0];
    const children = edges.filter(([from]) => from === root).map(([, to]) => to);
    return `<div class="blog-diagram blog-diagram--fanout" aria-label="Diagram"><div class="blog-diagram-node">${escapeHtml(labels.get(root) || root)}</div><div class="blog-diagram-branch" aria-hidden="true"></div><div class="blog-diagram-fanout-row">${children.map((child) => `<div class="blog-diagram-node">${escapeHtml(labels.get(child) || child)}</div>`).join('')}</div></div>`;
  }

  const start = [...labels.keys()].find((id) => (inDegree.get(id) || 0) === 0) || edges[0][0];
  const sequence = [];
  const visited = new Set();
  let current = start;

  while (current && !visited.has(current)) {
    visited.add(current);
    sequence.push(current);
    const next = (adjacency.get(current) || []).find((candidate) => !visited.has(candidate));
    current = next || null;
  }

  const loopBack = edges.some(([from, to]) => from === sequence[sequence.length - 1] && to === sequence[0]);

  return `<div class="blog-diagram blog-diagram--chain" aria-label="Diagram">${sequence.map((node, nodeIndex) => {
    const nodeHtml = `<div class="blog-diagram-node">${escapeHtml(labels.get(node) || node)}</div>`;
    if (nodeIndex === sequence.length - 1) {
      return loopBack
        ? `${nodeHtml}<div class="blog-diagram-loop" aria-hidden="true">\u21ba</div>`
        : nodeHtml;
    }
    return `${nodeHtml}<div class="blog-diagram-arrow" aria-hidden="true">\u2193</div>`;
  }).join('')}</div>`;
}

export { renderMermaidDiagram as _renderMermaidDiagram };
