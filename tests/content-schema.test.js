import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { parseFrontmatter } from '../scripts/lib/parse-frontmatter.mjs';

const configSource = readFileSync(resolve(__dirname, '../src/content.config.ts'), 'utf-8');

const contentDir = resolve(__dirname, '../src/content/blog');
const markdownFiles = readdirSync(contentDir)
  .filter((f) => f.endsWith('.md'))
  .map((f) => ({
    name: f,
    content: readFileSync(resolve(contentDir, f), 'utf-8'),
  }));

function collectionSource(collectionName) {
  const startMatch = configSource.match(
    new RegExp(`const\\s+${collectionName}\\s*=\\s*defineCollection\\(\\{`),
  );
  expect(startMatch, `missing ${collectionName} collection`).not.toBeNull();

  const startIndex = startMatch.index;
  const endIndex = configSource.indexOf('\n});', startIndex);
  expect(endIndex, `missing ${collectionName} collection terminator`).not.toBe(-1);

  return configSource.slice(startIndex, endIndex + '\n});'.length);
}

describe('Content Schema', () => {
  it('content.config.ts exists and defines a blog collection', () => {
    expect(configSource).toContain('defineCollection');
    expect(configSource).toContain('glob(');
    expect(configSource).toMatch(/const\s+blog\s*=/);
    expect(configSource).toContain('collections');
  });

  it('blog schema requires title, description, category, date, tags, and image', () => {
    expect(configSource).toContain('title: z.string()');
    expect(configSource).toContain('seoTitle: z.string().optional()');
    expect(configSource).toContain('description: z.string()');
    expect(configSource).toContain('seoDescription: z.string().optional()');
    expect(configSource).toContain("import { BLOG_CATEGORIES } from './lib/blog-order'");
    expect(configSource).toContain('category: z.enum(BLOG_CATEGORIES)');
    expect(configSource).toContain('featured: z.boolean().default(false)');
    expect(configSource).toContain('date: z.coerce.date()');
    expect(configSource).toContain('tags: z.array(z.string())');
    expect(configSource).toContain('image: z.string()');
  });

  it('projects schema supports optional seoDescription', () => {
    const projectsSource = collectionSource('projects');

    expect(projectsSource).not.toContain('const blog');
    expect(projectsSource).toContain('seoDescription: z.string().optional()');
  });

  it('all blog markdown files have required frontmatter fields', () => {
    expect(markdownFiles.length).toBeGreaterThan(0);
    for (const file of markdownFiles) {
      const fm = parseFrontmatter(file.content);
      expect(fm, `${file.name}: missing frontmatter`).not.toBeNull();
      expect(fm.title, `${file.name}: missing title`).toBeTruthy();
      expect(fm.description, `${file.name}: missing description`).toBeTruthy();
      expect(fm.category, `${file.name}: missing category`).toBeTruthy();
      expect(fm.date, `${file.name}: missing date`).toBeTruthy();
      expect(fm.tags, `${file.name}: missing tags`).toBeTruthy();
      expect(fm.image, `${file.name}: missing image`).toBeTruthy();
    }
  });

  it('publishes exactly one featured post across the collection', () => {
    const featured = markdownFiles.filter((file) => {
      const fm = parseFrontmatter(file.content);
      return fm?.featured === 'true' && fm?.draft !== 'true';
    });

    expect(featured.map((file) => file.name)).toEqual(['six-prs-one-bug-agent-failure-modes.md']);
  });

  it('assigns every published post to one of the two editorial categories', () => {
    const allowedCategories = ['Agent Systems', 'Building This Site'];

    for (const file of markdownFiles) {
      const fm = parseFrontmatter(file.content);
      if (fm?.draft === 'true') continue;
      expect(allowedCategories, `${file.name}: invalid category`).toContain(fm?.category);
    }
  });
});
