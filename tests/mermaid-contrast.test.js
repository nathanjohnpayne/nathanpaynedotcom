import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { findFilesRecursively } from '../scripts/lib/blog-file-inventory.mjs';
import { renderSidebarMermaid } from '../src/lib/render-sidebar-mermaid.mjs';

const MINIMUM_CONTRAST = 4.5;
const builtBlogRoot = resolve('dist/blog');

describe('rendered Mermaid contrast', () => {
  it('keeps every explicitly styled rendered node at WCAG AA contrast', () => {
    const failures = [];
    let styledNodeCount = 0;

    expect(existsSync(builtBlogRoot), 'dist/blog must exist; run npm run build first').toBe(true);

    for (const pagePath of findFilesRecursively(builtBlogRoot, (path) =>
      path.endsWith('index.html'),
    )) {
      const document = new JSDOM(readFileSync(pagePath, 'utf8')).window.document;
      const result = renderedContrastFailures(document);
      styledNodeCount += result.styledNodeCount;
      failures.push(...result.failures.map((failure) => ({ pagePath, ...failure })));
    }

    expect(
      styledNodeCount,
      'the check must exercise explicitly styled Mermaid nodes',
    ).toBeGreaterThan(0);
    expect(failures).toEqual([]);
  });

  it('validates classDef and semicolon syntax from Mermaid rendered output', async () => {
    const rendered = await renderSidebarMermaid([
      {
        type: 'mermaid',
        title: 'Rendered contrast fixture',
        description: 'A uses a class while B uses an inline style.',
        content: [
          'graph TD; A[Class styled] --> B[Inline styled];',
          'classDef warning fill:#7bc67e,color:#fff;',
          'class A warning;',
          'style B fill:#993d3d,color:#fff;',
        ].join('\n'),
      },
    ]);
    const document = new JSDOM(rendered.get(0)).window.document;

    expect(renderedContrastFailures(document)).toEqual({
      styledNodeCount: 2,
      failures: [
        expect.objectContaining({
          fill: '#7bc67e',
          color: '#fff',
          ratio: expect.closeTo(2.05, 2),
        }),
      ],
    });
  });

  it('rejects explicit node styles missing either measurable fill or label color', async () => {
    const rendered = await renderSidebarMermaid([
      {
        type: 'mermaid',
        title: 'Incomplete contrast fixture',
        description: 'A lacks a label color while B lacks a fill color.',
        content: [
          'graph TD; A[Missing color] --> B[Missing fill];',
          'style A fill:#7bc67e;',
          'style B color:#fff;',
        ].join('\n'),
      },
    ]);
    const document = new JSDOM(rendered.get(0)).window.document;

    expect(renderedContrastFailures(document)).toEqual({
      styledNodeCount: 2,
      failures: [
        expect.objectContaining({ label: 'Missing color', fill: '#7bc67e', ratio: null }),
        expect.objectContaining({ label: 'Missing fill', color: '#fff', ratio: null }),
      ],
    });
  });

  it('measures the effective last rendered declaration for a repeated property', async () => {
    const rendered = await renderSidebarMermaid([
      {
        type: 'mermaid',
        title: 'Repeated style fixture',
        description: 'The final fill declaration has insufficient contrast.',
        content: [
          'graph TD; A[Repeated fill];',
          'style A fill:#993d3d,color:#fff,fill:#7bc67e;',
        ].join('\n'),
      },
    ]);
    const document = new JSDOM(rendered.get(0)).window.document;

    expect(renderedContrastFailures(document)).toEqual({
      styledNodeCount: 1,
      failures: [
        expect.objectContaining({
          label: 'Repeated fill',
          fill: '#7bc67e',
          color: '#fff',
          ratio: expect.closeTo(2.05, 2),
        }),
      ],
    });
  });

  it('rejects opacity that makes an otherwise high-contrast node transparent', async () => {
    const rendered = await renderSidebarMermaid([
      {
        type: 'mermaid',
        title: 'Transparent contrast fixture',
        description: 'The transparent black fill exposes the white page behind a white label.',
        content: [
          'graph TD; A[Transparent fill];',
          'style A fill:#000,color:#fff,fill-opacity:0;',
        ].join('\n'),
      },
    ]);
    const document = new JSDOM(rendered.get(0)).window.document;

    expect(renderedContrastFailures(document)).toEqual({
      styledNodeCount: 1,
      failures: [
        expect.objectContaining({
          label: 'Transparent fill',
          fill: '#000',
          color: '#fff',
          fillOpacity: '0',
          ratio: null,
        }),
      ],
    });
  });

  it('inspects class-styled treemap cells instead of assuming flowchart node markup', async () => {
    const rendered = await renderSidebarMermaid([
      {
        type: 'mermaid',
        title: 'Treemap contrast fixture',
        description: 'The treemap leaf uses a low-contrast class and a translucent fill.',
        content: [
          'treemap-beta',
          '"Root"',
          '  "Low contrast": 10:::warning',
          'classDef warning fill:#7bc67e,color:#fff,fill-opacity:0.5;',
        ].join('\n'),
      },
    ]);
    const document = new JSDOM(rendered.get(0)).window.document;

    expect(renderedContrastFailures(document)).toEqual({
      styledNodeCount: 1,
      failures: [
        expect.objectContaining({
          label: 'Low contrast',
          fill: '#7bc67e',
          color: '#fff',
          fillOpacity: '0.5',
          ratio: null,
        }),
      ],
    });
  });
});

function renderedContrastFailures(document) {
  const failures = [];
  const styledNodes = findExplicitlyStyledNodes(document);

  for (const { node, shape, label } of styledNodes) {
    const fill = renderedProperty(shape, 'fill');
    const color = renderedProperty(label, 'color') ?? renderedProperty(label, 'fill');
    const fillOpacity = renderedProperty(shape, 'fill-opacity');
    const opacity = renderedProperty(shape, 'opacity') ?? renderedProperty(node, 'opacity');
    const ratio =
      isFullyOpaque(fillOpacity) && isFullyOpaque(opacity) ? contrastRatio(color, fill) : null;
    if (ratio == null || ratio < MINIMUM_CONTRAST) {
      failures.push({ label: label?.textContent.trim(), fill, color, fillOpacity, opacity, ratio });
    }
  }

  return { styledNodeCount: styledNodes.length, failures };
}

function findExplicitlyStyledNodes(document) {
  const nodes = new Map();
  const relevantProperties = ['fill', 'color', 'fill-opacity', 'opacity'];

  for (const styledElement of document.querySelectorAll('svg.mermaid [style]')) {
    if (!relevantProperties.some((property) => hasImportantStyle(styledElement, property))) continue;

    const node = nearestShapeAndLabelGroup(styledElement);
    if (node) nodes.set(node, node);
  }

  return [...nodes.values()].map((node) => {
    const shapes = nodeShapes(node);
    const labels = nodeLabels(node);
    const shape =
      shapes.find((candidate) =>
        ['fill', 'fill-opacity', 'opacity'].some((property) =>
          hasImportantStyle(candidate, property),
        ),
      ) ?? shapes[0];
    const label =
      labels.find((candidate) =>
        ['color', 'fill', 'opacity'].some((property) => hasImportantStyle(candidate, property)),
      ) ?? labels[0];

    return { node, shape, label };
  });
}

function nearestShapeAndLabelGroup(element) {
  let group = element.closest('g');
  while (group) {
    const shape = nodeShapes(group)[0];
    const label = nodeLabels(group)[0];
    if (shape && label) return group;
    group = group.parentElement?.closest('g');
  }
  return null;
}

function nodeShapes(node) {
  return [...node.querySelectorAll('rect, polygon, path, circle, ellipse')].filter(
    (shape) => !shape.closest('defs, clipPath, mask, g.label'),
  );
}

function nodeLabels(node) {
  return [
    node.querySelector('.nodeLabel'),
    node.querySelector('.treemapLabel'),
    node.querySelector('text'),
    node.querySelector('foreignObject'),
  ].filter(Boolean);
}

function renderedProperty(element, property) {
  return styleProperty(element?.getAttribute('style'), property) ?? element?.getAttribute(property);
}

function hasImportantStyle(element, property) {
  return new RegExp(`(?:^|;)\\s*${property}\\s*:[^;]*!important\\s*(?:;|$)`, 'i').test(
    element.getAttribute('style') ?? '',
  );
}

function isFullyOpaque(value) {
  return value == null || /^1(?:\.0+)?$/.test(value) || /^100(?:\.0+)?%$/.test(value);
}

function styleProperty(style, property) {
  let selected;
  for (const declaration of style?.split(';') ?? []) {
    const match = declaration.match(
      new RegExp(`^\\s*${property}\\s*:\\s*([^!\\s]+)\\s*(!important)?\\s*$`, 'i'),
    );
    if (!match) continue;

    const candidate = { value: match[1], important: Boolean(match[2]) };
    if (!selected || candidate.important || !selected.important) selected = candidate;
  }
  return selected?.value;
}

function contrastRatio(first, second) {
  if (!first || !second) return null;
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  if (firstLuminance == null || secondLuminance == null) return null;
  return (
    (Math.max(firstLuminance, secondLuminance) + 0.05) /
    (Math.min(firstLuminance, secondLuminance) + 0.05)
  );
}

function relativeLuminance(value) {
  const match = value.match(/^#([\da-f]{3}|[\da-f]{6})$/i);
  if (!match) return null;
  const digits =
    match[1].length === 3 ? [...match[1]].map((digit) => `${digit}${digit}`).join('') : match[1];
  const channels = [0, 2, 4].map((offset) => {
    const normalized = Number.parseInt(digits.slice(offset, offset + 2), 16) / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}
