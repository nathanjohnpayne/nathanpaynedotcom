import { readFileSync } from 'node:fs';
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
});

function renderedContrastFailures(document) {
  const failures = [];
  let styledNodeCount = 0;

  for (const node of document.querySelectorAll('svg.mermaid g.node')) {
    const shape = node.querySelector('rect, polygon, path, circle, ellipse');
    const label = node.querySelector('.nodeLabel');
    const fill = styleProperty(shape?.getAttribute('style'), 'fill');
    const color = styleProperty(label?.getAttribute('style'), 'color');
    if (!fill || !color) continue;

    styledNodeCount += 1;
    const ratio = contrastRatio(color, fill);
    if (ratio == null || ratio < MINIMUM_CONTRAST) {
      failures.push({ label: label?.textContent.trim(), fill, color, ratio });
    }
  }

  return { styledNodeCount, failures };
}

function styleProperty(style, property) {
  const match = style?.match(new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;!\\s]+)`, 'i'));
  return match?.[1];
}

function contrastRatio(first, second) {
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
