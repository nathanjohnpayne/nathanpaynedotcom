// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import rehypeMermaid from 'rehype-mermaid';
import { buildBlogLastmodMap } from './scripts/lib/sitemap-lastmod.mjs';
import ogImages from './src/integrations/og-images.mjs';
import robotsSitemap from './src/integrations/robots-sitemap.mjs';
import remarkMermaid from './src/plugins/remark-mermaid.mjs';
import {
  mermaidOptions,
  rehypeMermaidFigures,
  rehypeMermaidSvg,
} from './src/plugins/rehype-mermaid-accessibility.mjs';
import rehypeFigureCaptions from './src/plugins/rehype-figure-captions.mjs';
import rehypeColorChips from './src/plugins/rehype-color-chips.mjs';

const SITE = 'https://nathanpayne.com';

const sitemapLastmod = buildBlogLastmodMap();

// https://astro.build/config
export default defineConfig({
  site: SITE,
  integrations: [
    // MDX lets a project page place a frontmatter-driven component at an
    // arbitrary point inside its body, which a single `<slot />` cannot do.
    // It inherits `markdown` below via extendMarkdownConfig (the default),
    // so the three plugins in src/plugins/ and the Shiki transformer run
    // over .mdx as well as .md — verified byte-for-byte against a build
    // without it. See plans/759/component-placement-decision.md.
    mdx(),
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
    syntaxHighlight: { type: 'shiki', excludeLangs: ['mermaid'] },
    rehypePlugins: [
      rehypeMermaidFigures,
      [rehypeMermaid, mermaidOptions],
      rehypeMermaidSvg,
      rehypeFigureCaptions,
      rehypeColorChips,
    ],
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
