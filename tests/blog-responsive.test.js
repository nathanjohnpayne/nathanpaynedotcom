import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { resolve } from 'path';

// Astro hashes CSS into dist/_astro/*.css
const astroDir = resolve(__dirname, '../dist/_astro');
const cssFile = readdirSync(astroDir).find((f) => f.endsWith('.css'));
const css = readFileSync(resolve(astroDir, cssFile), 'utf-8');

// Authored stylesheet. Vite 8's minifier rewrites some declarations into
// equivalent shorter serializations (e.g. `@media (max-width: 480px)` →
// `@media (width<=480px)`), so assertions whose intent is "the author wrote
// this rule" read the source and are paired with a normalized dist check that
// proves the rule survived the build. See #640.
const sourceCss = readFileSync(resolve(__dirname, '../src/styles/global.css'), 'utf-8');

// Media Queries Level 4 range syntax back to the Level 3 form the source uses.
// A pure re-serialization: it does not widen what the matcher accepts.
function normalizeMediaRanges(cssText) {
  return cssText
    .replace(/\(\s*width\s*<=\s*([\d.]+px)\s*\)/g, '(max-width: $1)')
    .replace(/\(\s*width\s*>=\s*([\d.]+px)\s*\)/g, '(min-width: $1)');
}

const blogIndexHtml = readFileSync(resolve(__dirname, '../dist/blog/index.html'), 'utf-8');

const blogRoot = resolve(__dirname, '../dist/blog');
const blogPostPaths = readdirSync(blogRoot)
  .filter((name) => {
    const dir = resolve(blogRoot, name);
    return statSync(dir).isDirectory() && existsSync(resolve(dir, 'index.html'));
  })
  .map((name) => ({
    slug: name,
    html: readFileSync(resolve(blogRoot, name, 'index.html'), 'utf-8'),
  }));

function setupDOM(html) {
  document.documentElement.innerHTML = '';
  document.write(html);
  document.close();
}

describe('Blog Responsive Layout', () => {
  describe('viewport meta tag', () => {
    it('blog post pages have viewport meta tag with width=device-width and initial-scale=1', () => {
      for (const post of blogPostPaths) {
        setupDOM(post.html);
        const viewport = document.querySelector('meta[name="viewport"]');
        expect(viewport, `${post.slug}: missing viewport meta`).not.toBeNull();
        expect(viewport.getAttribute('content')).toContain('width=device-width');
        expect(viewport.getAttribute('content')).toMatch(/initial-scale\s*=\s*1(\.0)?/);
      }
    });

    it('blog index page has viewport meta tag with width=device-width and initial-scale=1', () => {
      setupDOM(blogIndexHtml);
      const viewport = document.querySelector('meta[name="viewport"]');
      expect(viewport).not.toBeNull();
      expect(viewport.getAttribute('content')).toContain('width=device-width');
      expect(viewport.getAttribute('content')).toMatch(/initial-scale\s*=\s*1(\.0)?/);
    });
  });

  describe('CSS responsive rules', () => {
    it('contains the 480px phone breakpoint', () => {
      // Authored form (#332: 480px matches the --bp-narrow token).
      expect(sourceCss).toMatch(/@media\s*\(\s*max-width:\s*480px\s*\)/);
      // …and it reached the bundle, whichever serialization the minifier chose.
      expect(normalizeMediaRanges(css)).toMatch(/@media\s*\(\s*max-width:\s*480px\s*\)/);
    });

    it('project-copy has min-width: 0 to prevent grid overflow', () => {
      expect(css).toMatch(/\.project-copy\s*\{[^}]*min-width:\s*0/);
    });

    it('blog prose uses overflow-wrap: break-word', () => {
      expect(css).toMatch(/\.blog-prose\s*>\s*p[\s\S]*?overflow-wrap:\s*break-word/);
    });

    it('project-detail has overflow-x: hidden as safety net', () => {
      expect(css).toMatch(/\.project-detail\s*\{[^}]*overflow-x:\s*hidden/);
    });

    it('blog code blocks have overflow-x: auto', () => {
      expect(css).toMatch(/\.blog-code-block\s*\{[^}]*overflow-x:\s*auto/);
    });

    it('blog code blocks have -webkit-overflow-scrolling: touch', () => {
      expect(css).toMatch(/\.blog-code-block\s*\{[^}]*-webkit-overflow-scrolling:\s*touch/);
    });

    it('blog figure images have width: 100% and height: auto', () => {
      expect(css).toMatch(/\.blog-figure\s+img\s*\{[^}]*width:\s*100%/);
      expect(css).toMatch(/\.blog-figure\s+img\s*\{[^}]*height:\s*auto/);
    });

    it('blog section headings carry a bottom margin', () => {
      // Paragraph spacing comes from `.blog-prose > p + p`, which does not fire
      // on the first paragraph after a heading. Without an explicit
      // margin-bottom on the heading itself, every section opener renders
      // flush against its h2.
      for (const tag of ['h2', 'h3']) {
        const block = css.match(new RegExp(`\\.blog-prose\\s*>\\s*${tag}\\s*\\{([^}]*)\\}`));
        expect(block, `.blog-prose > ${tag} rule missing`).not.toBeNull();
        // No trailing `;` on the last declaration of a minified block.
        const declared = block[1].match(/margin-bottom:\s*([^;}]+)/);
        expect(declared, `.blog-prose > ${tag} has no margin-bottom`).not.toBeNull();
        expect(
          parseFloat(declared[1]),
          `.blog-prose > ${tag} margin-bottom is zero`,
        ).toBeGreaterThan(0);
      }
    });
  });

  describe('blog post image markup', () => {
    it('blog post images have intrinsic width and height attributes for CLS prevention', () => {
      // Inline width/height reserve space for the image during layout, which
      // prevents Cumulative Layout Shift as images load. They do NOT conflict
      // with responsive sizing — the `.blog-figure img { width: 100%; height:
      // auto }` rule (asserted above) overrides the inline values for display
      // while preserving the intrinsic aspect ratio. See the static dimension
      // map in src/plugins/rehype-figure-captions.mjs.
      for (const post of blogPostPaths) {
        setupDOM(post.html);
        const images = document.querySelectorAll('.blog-figure img');
        for (const img of images) {
          expect(
            img.hasAttribute('width'),
            `${post.slug}: image missing intrinsic width attribute`,
          ).toBe(true);
          expect(
            img.hasAttribute('height'),
            `${post.slug}: image missing intrinsic height attribute`,
          ).toBe(true);
        }
      }
    });

    it('all blog post images are inside figure elements', () => {
      for (const post of blogPostPaths) {
        setupDOM(post.html);
        const allImages = document.querySelectorAll('main img');
        for (const img of allImages) {
          expect(
            img.closest('.blog-figure'),
            `${post.slug}: image not in .blog-figure`,
          ).not.toBeNull();
        }
      }
    });
  });
});
