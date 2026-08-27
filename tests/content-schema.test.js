import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { relative, resolve } from 'path';
import { findBlogMarkdownFiles, findFilesRecursively } from '../scripts/lib/blog-file-inventory.mjs';
import { parseFrontmatter } from '../scripts/lib/parse-frontmatter.mjs';

const configSource = readFileSync(resolve(__dirname, '../src/content.config.ts'), 'utf-8');

const contentDir = resolve(__dirname, '../src/content/blog');
const markdownFiles = findBlogMarkdownFiles(contentDir).map((filePath) => ({
  name: relative(contentDir, filePath),
  content: readFileSync(filePath, 'utf-8'),
}));

// `projects` accepts .md AND .mdx (see src/content.config.ts's glob pattern
// comment, epic #759) — glob both here rather than reusing
// findBlogMarkdownFiles, which is hardcoded to `.md` only.
const projectsDir = resolve(__dirname, '../src/content/projects');
const projectFiles = findFilesRecursively(projectsDir, (filePath) =>
  /\.mdx?$/.test(filePath),
).map((filePath) => ({
  name: relative(projectsDir, filePath),
  content: readFileSync(filePath, 'utf-8'),
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

  it('projects schema declares decisions, constraints, and learnings as flat, optional, defaulted arrays', () => {
    const projectsSource = collectionSource('projects');
    const blogSource = collectionSource('blog');

    // Flat top-level fields on `projects` only — never on `blog`.
    for (const field of ['decisions', 'constraints', 'learnings']) {
      expect(projectsSource).toContain(`${field}: z`);
      expect(blogSource).not.toContain(`${field}: z`);
    }

    // Each field is an array that is optional with a [] default — the shape
    // that makes an un-authored case study a no-op rather than a schema
    // failure. Asserted per field rather than by counting occurrences of the
    // `.optional().default([])` pattern: `related` already matches it, so a
    // count would stay satisfied while one of the three lost its default.
    for (const field of ['decisions', 'constraints', 'learnings']) {
      expect(
        projectsSource,
        `${field} must be z.array(...).optional().default([])`,
      ).toMatch(
        new RegExp(
          `${field}:\\s*z\\s*\\n\\s*\\.array\\([\\s\\S]*?\\)\\s*\\n\\s*\\.optional\\(\\)\\s*\\n\\s*\\.default\\(\\[\\]\\)`,
        ),
      );
    }

    // decisions: all five string sub-fields, plus the exact four-value
    // status enum (all six required, `evidence` and `status` included).
    for (const subfield of ['title', 'context', 'rejected', 'rationale', 'evidence']) {
      expect(projectsSource).toContain(`${subfield}: z.string().trim().min(1)`);
    }
    expect(projectsSource).toContain(
      "status: z.enum(['validated', 'mixed', 'revised', 'pending'])",
    );

    // constraints: value + label.
    expect(projectsSource).toContain('value: z.string().trim().min(1)');
    expect(projectsSource).toContain('label: z.string().trim().min(1)');

    // learnings: expected + observed + response.
    expect(projectsSource).toContain('expected: z.string().trim().min(1)');
    expect(projectsSource).toContain('observed: z.string().trim().min(1)');
    expect(projectsSource).toContain('response: z.string().trim().min(1)');
  });

  it('every project file that declares decisions has well-formed decision records', () => {
    expect(projectFiles.length).toBeGreaterThan(0);

    const validStatuses = ['validated', 'mixed', 'revised', 'pending'];
    const requiredKeys = ['title', 'context', 'rejected', 'rationale', 'evidence', 'status'];

    for (const file of projectFiles) {
      const fm = parseFrontmatter(file.content);
      const decisions = fm?.decisions;
      // No project has adopted decisions yet (epic #759 lands the field
      // ahead of any page authoring it) — zero records is not a failure,
      // only a malformed record among files that DO declare it is.
      if (!decisions) continue;

      expect(Array.isArray(decisions), `${file.name}: decisions must be an array`).toBe(true);
      decisions.forEach((decision, index) => {
        for (const key of requiredKeys) {
          expect(decision?.[key], `${file.name}: decisions[${index}].${key} missing`).toBeTruthy();
        }
        expect(validStatuses, `${file.name}: decisions[${index}].status invalid`).toContain(
          decision.status,
        );
      });
    }
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
