import { join } from 'node:path';

import { blogSlugFromPath, findBlogMarkdownFiles, findFilesRecursively } from './blog-file-inventory.mjs';
import { effectiveModified, getLastUpdated, lastUpdatedFor } from './last-updated.mjs';
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
 *   defaults to this repository's history (scripts/lib/last-updated.mjs)
 */
export function buildBlogLastmodMap(
  blogDirectory = join(process.cwd(), 'src/content/blog'),
  lastUpdated = getLastUpdated(),
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

/**
 * Content-derived `<lastmod>` values for project pages (#1169). A project
 * page has no publication date, so its value is its last change from git
 * history and nothing else; a project with no change since the commit that
 * added it gets no `<lastmod>`, as rule 6 requires of a page without a
 * reliable content date. The route comes from frontmatter `slug`, which is
 * what src/pages/projects/[slug].astro routes on, not from the filename.
 * `/projects/` takes the newest project value.
 *
 * @param {string} [projectDirectory]
 * @param {Map<string, Date>} [lastUpdated]
 */
export function buildProjectLastmodMap(
  projectDirectory = join(process.cwd(), 'src/content/projects'),
  lastUpdated = getLastUpdated(),
) {
  const lastmod = new Map();
  const files = findFilesRecursively(projectDirectory, (filePath) => /\.mdx?$/.test(filePath));
  for (const filePath of files) {
    const frontmatter = readSitemapFrontmatter(filePath);
    if (frontmatter.draft === true || typeof frontmatter.slug !== 'string') continue;
    const updated = lastUpdatedFor(lastUpdated, filePath);
    if (updated) lastmod.set(`/projects/${frontmatter.slug}/`, updated.toISOString());
  }
  const newest = [...lastmod.values()].sort().at(-1);
  if (newest) lastmod.set('/projects/', newest);
  return lastmod;
}

/** Every content-derived `<lastmod>`, keyed by route pathname. */
export function buildSitemapLastmodMap() {
  return new Map([...buildBlogLastmodMap(), ...buildProjectLastmodMap()]);
}
