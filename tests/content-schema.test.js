import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';

const configSource = readFileSync(resolve(__dirname, '../src/content.config.ts'), 'utf-8');

const contentDir = resolve(__dirname, '../src/content/blog');
const markdownFiles = readdirSync(contentDir)
  .filter((f) => f.endsWith('.md'))
  .map((f) => ({
    name: f,
    content: readFileSync(resolve(contentDir, f), 'utf-8'),
  }));

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const raw = match[1];
  const fields = {};
  for (const line of raw.split('\n')) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    fields[key] = value;
  }
  return fields;
}

describe('Content Schema', () => {
  it('content.config.ts exists and defines a blog collection', () => {
    expect(configSource).toContain('defineCollection');
    expect(configSource).toContain("type: 'content'");
    expect(configSource).toMatch(/const\s+blog\s*=/);
    expect(configSource).toContain('collections');
  });

  it('blog schema requires title, description, date, tags, and image', () => {
    expect(configSource).toContain('title: z.string()');
    expect(configSource).toContain('description: z.string()');
    expect(configSource).toContain('date: z.coerce.date()');
    expect(configSource).toContain('tags: z.array(z.string())');
    expect(configSource).toContain('image: z.string()');
  });

  it('all blog markdown files have required frontmatter fields', () => {
    expect(markdownFiles.length).toBeGreaterThan(0);
    for (const file of markdownFiles) {
      const fm = parseFrontmatter(file.content);
      expect(fm, `${file.name}: missing frontmatter`).not.toBeNull();
      expect(fm.title, `${file.name}: missing title`).toBeTruthy();
      expect(fm.description, `${file.name}: missing description`).toBeTruthy();
      expect(fm.date, `${file.name}: missing date`).toBeTruthy();
      expect(fm.tags, `${file.name}: missing tags`).toBeTruthy();
      expect(fm.image, `${file.name}: missing image`).toBeTruthy();
    }
  });
});
