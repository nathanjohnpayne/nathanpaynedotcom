import { join } from 'node:path';

import { blogSlugFromPath, findBlogMarkdownFiles } from './blog-file-inventory.mjs';
import { readSitemapFrontmatter } from './sitemap-frontmatter.mjs';

function toIsoDate(value) {
  if (!value) return undefined;
  if (!(value instanceof Date) && typeof value !== 'string' && typeof value !== 'number') {
    return undefined;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function buildBlogLastmodMap(
  blogDirectory = join(process.cwd(), 'src/content/blog'),
) {
  const lastmod = new Map();
  const blogDates = [];

  for (const filePath of findBlogMarkdownFiles(blogDirectory)) {
    const frontmatter = readSitemapFrontmatter(filePath);
    if (frontmatter.draft === true) continue;

    const isoDate = toIsoDate(frontmatter.date);
    if (!isoDate) continue;

    const slug = blogSlugFromPath(filePath, blogDirectory);
    lastmod.set(`/blog/${slug}/`, isoDate);
    blogDates.push(isoDate);
  }

  const latestBlogDate = blogDates.sort().at(-1);
  if (latestBlogDate) lastmod.set('/blog/', latestBlogDate);

  return lastmod;
}
