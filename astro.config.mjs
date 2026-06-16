// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { readSitemapFrontmatter } from './scripts/lib/sitemap-frontmatter.mjs';
import ogImages from './src/integrations/og-images.mjs';
import robotsSitemap from './src/integrations/robots-sitemap.mjs';
import remarkMermaid from './src/plugins/remark-mermaid.mjs';
import rehypeFigureCaptions from './src/plugins/rehype-figure-captions.mjs';
import rehypeColorChips from './src/plugins/rehype-color-chips.mjs';

const SITE = 'https://nathanpayne.com';

/**
 * @param {unknown} value
 * @returns {string | undefined}
 */
function toIsoDate(value) {
  if (!value) return undefined;
  if (!(value instanceof Date) && typeof value !== 'string' && typeof value !== 'number') {
    return undefined;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function buildLastmodMap() {
  const lastmod = new Map();
  const blogDir = join(process.cwd(), 'src/content/blog');
  const blogDates = [];

  for (const entry of readdirSync(blogDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;

    const frontmatter = readSitemapFrontmatter(join(blogDir, entry.name));
    if (frontmatter.draft === true) continue;

    const isoDate = toIsoDate(frontmatter.date);
    if (!isoDate) continue;

    const slug = basename(entry.name, '.md');
    lastmod.set(`/blog/${slug}/`, isoDate);
    blogDates.push(isoDate);
  }

  const latestBlogDate = blogDates.sort().at(-1);
  if (latestBlogDate) {
    lastmod.set('/blog/', latestBlogDate);
  }

  return lastmod;
}

const sitemapLastmod = buildLastmodMap();

// https://astro.build/config
export default defineConfig({
  site: SITE,
  integrations: [
    sitemap({
      serialize(item) {
        const pathname = new URL(item.url).pathname;
        const contentLastmod = sitemapLastmod.get(pathname);
        if (contentLastmod) {
          item.lastmod = contentLastmod;
        } else {
          delete item.lastmod;
        }
        return item;
      },
      filter: (page) => !page.includes('/og-templates/'),
    }),
    ogImages(),
    // Must run after @astrojs/sitemap so the sitemap file exists in dist/
    // when we rewrite robots.txt. Integrations run in array order during
    // astro:build:done.
    robotsSitemap(),
  ],
  output: 'static',
  build: {
    format: 'directory',
  },
  markdown: {
    remarkPlugins: [remarkMermaid],
    rehypePlugins: [rehypeFigureCaptions, rehypeColorChips],
    shikiConfig: {
      theme: 'css-variables',
      transformers: [
        {
          pre(node) {
            // Add blog-code-block class to all pre elements
            const lang = this.options?.lang || '';
            const classes = ['blog-code-block'];
            if (!lang || lang === 'text' || lang === 'plaintext') {
              classes.push('blog-code-block--light');
            }
            this.addClassToHast(node, classes);
            // Remove Shiki's inline background-color and color
            if (typeof node.properties?.style === 'string') {
              node.properties.style = node.properties.style
                .replace(/background-color:\s*[^;]+;?/g, '')
                .replace(/color:\s*[^;]+;?/g, '')
                .replace(/overflow-x:\s*[^;]+;?/g, '')
                .trim() || undefined;
            }
          },
        },
      ],
    },
  },
});
