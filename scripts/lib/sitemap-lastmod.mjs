import { join } from 'node:path';

import { blogSlugFromPath, findBlogMarkdownFiles } from './blog-file-inventory.mjs';
import { effectiveModified, getBlogLastUpdated, lastUpdatedFor } from './blog-last-updated.mjs';
import { readSitemapFrontmatter } from './sitemap-frontmatter.mjs';

function toDate(value) {
  if (!value) return undefined;
  if (!(value instanceof Date) && typeof value !== 'string' && typeof value !== 'number') {
    return undefined;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/**
 * Content-derived `<lastmod>` values for the blog (specs/seo-metadata.md
 * § Sitemap rule 6). A post's value is its last body change from git history
 * when that is later than its frontmatter `date`, otherwise the `date`; the
 * index takes the newest post value. Never the build time.
 *
 * @param {string} [blogDirectory]
 * @param {Map<string, Date>} [lastUpdated] absolute path → last body change;
 *   defaults to this repository's history (scripts/lib/blog-last-updated.mjs)
 */
export function buildBlogLastmodMap(
  blogDirectory = join(process.cwd(), 'src/content/blog'),
  lastUpdated = getBlogLastUpdated(),
) {
  const lastmod = new Map();
  const blogDates = [];

  for (const filePath of findBlogMarkdownFiles(blogDirectory)) {
    const frontmatter = readSitemapFrontmatter(filePath);
    if (frontmatter.draft === true) continue;

    const published = toDate(frontmatter.date);
    if (!published) continue;

    const isoDate = effectiveModified(published, lastUpdatedFor(lastUpdated, filePath)).toISOString();
    const slug = blogSlugFromPath(filePath, blogDirectory);
    lastmod.set(`/blog/${slug}/`, isoDate);
    blogDates.push(isoDate);
  }

  const latestBlogDate = blogDates.sort().at(-1);
  if (latestBlogDate) lastmod.set('/blog/', latestBlogDate);

  return lastmod;
}
