import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  contrastRatio,
  findBlogMarkdownFiles,
  findMermaidContrastFailures,
} from '../scripts/check-mermaid-contrast.mjs';

describe('Mermaid contrast checker', () => {
  it('computes WCAG relative-luminance contrast ratios', () => {
    expect(contrastRatio('#fff', '#7bc67e')).toBeCloseTo(2.05, 2);
    expect(contrastRatio('#333', '#7bc67e')).toBeCloseTo(6.15, 2);
    expect(contrastRatio('#fff', '#993d3d')).toBeCloseTo(6.8, 2);
  });

  it('reports failing style declarations inside Mermaid fences', () => {
    const markdown = [
      '```mermaid title="Example" description="Example relationship."',
      'graph TD',
      '  A --> B',
      '  style A fill:#7bc67e,stroke:#4a8a4d,color:#fff',
      '  style B color:#FFFFFF,stroke:#993d3d,fill:#993D3D',
      '```',
    ].join('\n');

    expect(findMermaidContrastFailures(markdown, 'example.md')).toEqual([
      expect.objectContaining({
        filePath: 'example.md',
        line: 4,
        fill: '#7bc67e',
        color: '#fff',
        ratio: expect.closeTo(2.05, 2),
      }),
    ]);
  });

  it('checks semicolon-delimited style directives without splitting quoted labels', () => {
    const markdown = [
      '```mermaid title="Example" description="Example relationship."',
      'graph TD; A["A; label"] --> B; style A fill:#7bc67e,color:#fff;',
      '```',
    ].join('\n');

    expect(findMermaidContrastFailures(markdown, 'example.md')).toEqual([
      expect.objectContaining({
        filePath: 'example.md',
        line: 2,
        fill: '#7bc67e',
        color: '#fff',
      }),
    ]);
  });

  it('does not treat an apostrophe in an unquoted label as a string delimiter', () => {
    const markdown = [
      '```mermaid title="Example" description="Example relationship."',
      "graph TD; A[It's ready] --> B; style A fill:#7bc67e,color:#fff;",
      '```',
    ].join('\n');

    expect(findMermaidContrastFailures(markdown, 'example.md')).toEqual([
      expect.objectContaining({
        filePath: 'example.md',
        line: 2,
        fill: '#7bc67e',
        color: '#fff',
      }),
    ]);
  });

  it('preserves quote and bracket state across multiline Markdown-string labels', () => {
    const markdown = [
      '```mermaid title="Example" description="Example relationship."',
      'graph TD; A["`First line',
      'second line`"]; style A fill:#7bc67e,color:#fff;',
      '```',
    ].join('\n');

    expect(findMermaidContrastFailures(markdown, 'example.md')).toEqual([
      expect.objectContaining({
        filePath: 'example.md',
        line: 3,
        fill: '#7bc67e',
        color: '#fff',
      }),
    ]);
  });

  it('removes a terminal semicolon from line-leading style values', () => {
    const markdown = [
      '```mermaid title="Example" description="Example relationship."',
      'style A fill:#d4a84b,color:#fff;',
      '```',
    ].join('\n');

    expect(findMermaidContrastFailures(markdown, 'example.md')).toEqual([
      expect.objectContaining({
        line: 2,
        fill: '#d4a84b',
        color: '#fff',
        ratio: expect.closeTo(2.21, 2),
      }),
    ]);
  });

  it('refuses classDef declarations with an actionable failure', () => {
    const markdown = [
      '```mermaid title="Example" description="Example relationship."',
      'graph TD; classDef warning fill:#7bc67e,color:#fff;',
      '```',
    ].join('\n');

    expect(findMermaidContrastFailures(markdown, 'example.md')).toEqual([
      {
        filePath: 'example.md',
        line: 2,
        kind: 'unsupported-class-def',
      },
    ]);
  });

  it('ignores style-like prose and non-Mermaid fences', () => {
    const markdown = [
      'style A fill:#7bc67e,color:#fff',
      '```text',
      'style B fill:#7bc67e,color:#fff',
      '```',
      '~~~mermaid title="Passing" description="A passing example."',
      'style C fill:#7bc67e,color:#333',
      '~~~',
    ].join('\n');

    expect(findMermaidContrastFailures(markdown, 'example.md')).toEqual([]);
  });

  it('checks Mermaid content in frontmatter sidebars without scanning text sidebars', () => {
    const markdown = [
      '---',
      'sidebar:',
      '  - type: mermaid',
      '    title: Example',
      '    content: |',
      '      graph TD',
      '      style A fill:#d4a84b,stroke:#a07830,color:#fff',
      '  - type: text',
      '    content: |',
      '      style B fill:#7bc67e,color:#fff',
      '---',
      '',
      'Article body.',
    ].join('\n');

    expect(findMermaidContrastFailures(markdown, 'example.md')).toEqual([
      expect.objectContaining({
        filePath: 'example.md',
        line: 7,
        fill: '#d4a84b',
        color: '#fff',
      }),
    ]);
  });

  it('checks quoted Mermaid sidebar types', () => {
    const markdown = [
      '---',
      'sidebar:',
      '  - type: "mermaid"',
      '    content: |',
      '      style A fill:#7bc67e,color:#fff',
      "  - type: 'mermaid'",
      '    content: |',
      '      style B fill:#d4a84b,color:#fff',
      '---',
    ].join('\n');

    expect(findMermaidContrastFailures(markdown, 'example.md')).toEqual([
      expect.objectContaining({ line: 5, fill: '#7bc67e', color: '#fff' }),
      expect.objectContaining({ line: 8, fill: '#d4a84b', color: '#fff' }),
    ]);
  });

  it('checks an aliased Mermaid sidebar sequence', () => {
    const markdown = [
      '---',
      'sharedSidebar: &shared',
      '  - type: mermaid',
      '    content: |',
      '      style A fill:#7bc67e,color:#fff',
      'sidebar: *shared',
      '---',
    ].join('\n');

    expect(findMermaidContrastFailures(markdown, 'example.md')).toEqual([
      expect.objectContaining({ line: 5, fill: '#7bc67e', color: '#fff' }),
    ]);
  });

  it('checks aliased Mermaid sidebar items', () => {
    const markdown = [
      '---',
      'sharedItem: &item',
      '  type: mermaid',
      '  content: |',
      '    style A fill:#d4a84b,color:#fff',
      'sidebar:',
      '  - *item',
      '---',
    ].join('\n');

    expect(findMermaidContrastFailures(markdown, 'example.md')).toEqual([
      expect.objectContaining({ line: 5, fill: '#d4a84b', color: '#fff' }),
    ]);
  });

  it('checks Mermaid sidebar items assembled with YAML merge keys', () => {
    const markdown = [
      '---',
      'sharedItem: &item',
      '  type: mermaid',
      '  content: |',
      '    style A fill:#7bc67e,color:#fff',
      'sidebar:',
      '  - <<: *item',
      '---',
    ].join('\n');

    expect(findMermaidContrastFailures(markdown, 'example.md')).toEqual([
      expect.objectContaining({ line: 5, fill: '#7bc67e', color: '#fff' }),
    ]);
  });

  it('checks a sidebar supplied by a root YAML merge key', () => {
    const markdown = [
      '---',
      'shared: &page',
      '  sidebar:',
      '    - type: mermaid',
      '      content: |',
      '        style A fill:#7bc67e,color:#fff',
      '<<: *page',
      '---',
    ].join('\n');

    expect(findMermaidContrastFailures(markdown, 'example.md')).toEqual([
      expect.objectContaining({ line: 6, fill: '#7bc67e', color: '#fff' }),
    ]);
  });

  it('checks frontmatter after a UTF-8 byte-order mark', () => {
    const markdown = [
      '\uFEFF---',
      'sidebar:',
      '  - type: mermaid',
      '    content: |',
      '      style A fill:#d4a84b,color:#fff',
      '---',
    ].join('\n');

    expect(findMermaidContrastFailures(markdown, 'example.md')).toEqual([
      expect.objectContaining({ line: 5, fill: '#d4a84b', color: '#fff' }),
    ]);
  });

  it('checks Mermaid fences nested in blockquotes', () => {
    const markdown = [
      '> ```mermaid title="Example" description="Example relationship."',
      '> graph TD',
      '> style A fill:#7bc67e,color:#fff',
      '> ```',
    ].join('\n');

    expect(findMermaidContrastFailures(markdown, 'example.md')).toEqual([
      expect.objectContaining({ line: 3, fill: '#7bc67e', color: '#fff' }),
    ]);
  });

  it('checks Mermaid fences that are list-item content', () => {
    const markdown = [
      '- ```mermaid title="Example" description="Example relationship."',
      '  graph TD',
      '  style A fill:#7bc67e,color:#fff',
      '  ```',
    ].join('\n');

    expect(findMermaidContrastFailures(markdown, 'example.md')).toEqual([
      expect.objectContaining({ line: 3, fill: '#7bc67e', color: '#fff' }),
    ]);
  });

  it('does not treat Mermaid-looking text inside another fence as a diagram', () => {
    const markdown = [
      '````text',
      '```mermaid',
      'style A fill:#7bc67e,color:#fff',
      '```',
      '````',
    ].join('\n');

    expect(findMermaidContrastFailures(markdown, 'example.md')).toEqual([]);
  });

  it('fails closed when a style pair cannot be measured as hex colors', () => {
    const markdown = [
      '```mermaid title="Example" description="Example relationship."',
      'style A fill:red,color:white',
      '```',
    ].join('\n');

    expect(findMermaidContrastFailures(markdown, 'example.md')).toEqual([
      expect.objectContaining({
        line: 2,
        fill: 'red',
        color: 'white',
        ratio: null,
      }),
    ]);
  });

  it('fails the command with actionable file, line, colors, and ratio output', () => {
    const directory = mkdtempSync(join(tmpdir(), 'mermaid-contrast-'));
    const fixture = join(directory, 'fixture.md');

    try {
      writeFileSync(
        fixture,
        '```mermaid title="Example" description="Example relationship."\n' +
          'style A fill:#d4a84b,stroke:#a07830,color:#fff\n' +
          '```\n',
      );

      const result = spawnSync(process.execPath, ['scripts/check-mermaid-contrast.mjs', fixture], {
        encoding: 'utf8',
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain(`${fixture}:2`);
      expect(result.stderr).toContain('#fff on #d4a84b');
      expect(result.stderr).toContain('2.21:1');
      expect(result.stderr).toContain('minimum 4.50:1');
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
  });

  it('fails the command with actionable classDef guidance', () => {
    const directory = mkdtempSync(join(tmpdir(), 'mermaid-contrast-'));
    const fixture = join(directory, 'fixture.md');

    try {
      writeFileSync(
        fixture,
        '```mermaid title="Example" description="Example relationship."\n' +
          'classDef warning fill:#7bc67e,color:#fff\n' +
          '```\n',
      );

      const result = spawnSync(process.execPath, ['scripts/check-mermaid-contrast.mjs', fixture], {
        encoding: 'utf8',
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain(`${fixture}:2`);
      expect(result.stderr).toContain('classDef is unsupported');
      expect(result.stderr).toContain('use explicit style directives');
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
  });

  it('discovers Markdown files recursively under the blog directory', () => {
    const directory = mkdtempSync(join(tmpdir(), 'mermaid-discovery-'));
    const nestedDirectory = join(directory, 'nested', 'deeper');

    try {
      mkdirSync(nestedDirectory, { recursive: true });
      writeFileSync(join(directory, 'root.md'), 'root');
      writeFileSync(join(nestedDirectory, 'nested.md'), 'nested');
      writeFileSync(join(nestedDirectory, 'ignored.mdx'), 'ignored');

      expect(findBlogMarkdownFiles(directory)).toEqual([
        join(nestedDirectory, 'nested.md'),
        join(directory, 'root.md'),
      ]);
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
  });

  it('preserves the labeled 1921 palette swatches with accessible black labels', () => {
    const article = readFileSync('src/content/blog/two-blues-one-composition.md', 'utf8');

    expect(article.match(/style I1 fill:#E8784A,stroke:#9c4f2f,color:#000/g)).toHaveLength(2);
    expect(article.match(/style I3 fill:#2080CA,stroke:#14527f,color:#000/g)).toHaveLength(2);
    expect(contrastRatio('#000', '#E8784A')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#000', '#2080CA')).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps every repository blog Mermaid style pair at WCAG AA contrast', () => {
    const result = spawnSync(process.execPath, ['scripts/check-mermaid-contrast.mjs'], {
      encoding: 'utf8',
    });

    expect(result.status, result.stderr).toBe(0);
    expect(result.stderr).toBe('');
  });
});
