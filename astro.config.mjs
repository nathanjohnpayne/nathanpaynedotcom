// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import remarkMermaid from './src/plugins/remark-mermaid.mjs';
import rehypeFigureCaptions from './src/plugins/rehype-figure-captions.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://nathanpayne.com',
  integrations: [sitemap()],
  output: 'static',
  build: {
    format: 'directory',
  },
  markdown: {
    remarkPlugins: [remarkMermaid],
    rehypePlugins: [rehypeFigureCaptions],
    shikiConfig: {
      theme: 'vitesse-dark',
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
            if (node.properties?.style) {
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
