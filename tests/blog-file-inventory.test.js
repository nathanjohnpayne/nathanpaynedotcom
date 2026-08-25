import { existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

import { blogSlugFromPath, findBlogMarkdownFiles } from '../scripts/lib/blog-file-inventory.mjs';
import { buildBlogLastmodMap } from '../scripts/lib/sitemap-lastmod.mjs';

describe('blog file inventory', () => {
  it('discovers nested Markdown and derives route-preserving slugs', () => {
    const directory = mkdtempSync(join(tmpdir(), 'blog-inventory-'));
    const nestedDirectory = join(directory, 'series', 'part-one');

    try {
      mkdirSync(nestedDirectory, { recursive: true });
      const rootPost = join(directory, 'root.md');
      const nestedPost = join(nestedDirectory, 'entry.md');
      writeFileSync(rootPost, 'root');
      writeFileSync(nestedPost, 'nested');
      writeFileSync(join(nestedDirectory, 'ignored.mdx'), 'ignored');

      expect(findBlogMarkdownFiles(directory)).toEqual([rootPost, nestedPost]);
      expect(blogSlugFromPath(rootPost, directory)).toBe('root');
      expect(blogSlugFromPath(nestedPost, directory)).toBe('series/part-one/entry');
      expect(blogSlugFromPath(join(directory, 'Series Name', 'index.md'), directory)).toBe(
        'series-name',
      );
      expect(blogSlugFromPath(join(directory, 'Series Name', 'Hello.World.md'), directory)).toBe(
        'series-name/helloworld',
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('routes slash-separated blog slugs through an Astro rest parameter', () => {
    expect(existsSync(resolve('src/pages/blog/[...slug].astro'))).toBe(true);
    expect(existsSync(resolve('src/pages/blog/[slug].astro'))).toBe(false);
    expect(existsSync(resolve('src/pages/og-templates/blog/[...slug].astro'))).toBe(true);
    expect(existsSync(resolve('src/pages/og-templates/blog/[slug].astro'))).toBe(false);
  });

  it('matches Astro slug generation for edge-case and collision-like filenames', async () => {
    const astroEntry = import.meta.resolve('astro');
    const astroUtils = await import(new URL('./content/utils.js', astroEntry));
    const directory = mkdtempSync(join(tmpdir(), 'blog-slug-parity-'));
    const filenames = [
      'Unicode/Café Déjà Vu.md',
      'Punctuation/Hello.World + Notes!.md',
      'Casing/MiXeD-Case.md',
      'Collisions/Hello World.md',
      'Collisions/hello-world.md',
      'Nested Index/INDEX.md',
      'Nested Index/index.md',
    ];

    try {
      for (const filename of filenames) {
        const filePath = join(directory, filename);
        mkdirSync(join(filePath, '..'), { recursive: true });
        writeFileSync(filePath, 'fixture');

        const astroSlug = astroUtils.getContentEntryIdAndSlug({
          entry: pathToFileURL(filePath),
          contentDir: pathToFileURL(`${directory}/`),
          collection: '',
        }).slug;

        expect(blogSlugFromPath(filePath, directory), filename).toBe(astroSlug);
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('includes nested published posts in sitemap lastmod values', () => {
    const directory = mkdtempSync(join(tmpdir(), 'blog-lastmod-'));
    const nestedDirectory = join(directory, 'series');

    try {
      mkdirSync(nestedDirectory, { recursive: true });
      writeFileSync(join(directory, 'root.md'), '---\ntitle: Root\ndate: 2026-01-02\n---\nRoot\n');
      writeFileSync(
        join(nestedDirectory, 'nested.md'),
        '---\ntitle: Nested\ndate: 2026-02-03\n---\nNested\n',
      );
      writeFileSync(
        join(nestedDirectory, 'index.md'),
        '---\ntitle: Series\ndate: 2026-03-04\n---\nSeries\n',
      );

      const lastmod = buildBlogLastmodMap(directory);

      expect(lastmod.get('/blog/root/')).toBe('2026-01-02T00:00:00.000Z');
      expect(lastmod.get('/blog/series/nested/')).toBe('2026-02-03T00:00:00.000Z');
      expect(lastmod.get('/blog/series/')).toBe('2026-03-04T00:00:00.000Z');
      expect(lastmod.get('/blog/')).toBe('2026-03-04T00:00:00.000Z');
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('follows linked files and directories without recursing through symlink cycles', () => {
    const directory = mkdtempSync(join(tmpdir(), 'blog-symlinks-'));
    const linkedDirectory = mkdtempSync(join(tmpdir(), 'blog-linked-content-'));

    try {
      const linkedPost = join(linkedDirectory, 'linked.md');
      writeFileSync(linkedPost, 'linked');
      symlinkSync(linkedDirectory, join(directory, 'linked-series'));
      symlinkSync(linkedPost, join(directory, 'linked-file.md'));
      symlinkSync(directory, join(linkedDirectory, 'cycle'));

      expect(findBlogMarkdownFiles(directory)).toEqual([
        join(directory, 'linked-file.md'),
        join(directory, 'linked-series', 'linked.md'),
      ]);
    } finally {
      rmSync(directory, { recursive: true, force: true });
      rmSync(linkedDirectory, { recursive: true, force: true });
    }
  });
});
