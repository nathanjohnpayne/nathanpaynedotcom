import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve } from 'path';

const css = readFileSync(resolve(__dirname, '../style.css'), 'utf-8');
const blogIndexHtml = readFileSync(resolve(__dirname, '../blog/index.html'), 'utf-8');

const blogRoot = resolve(__dirname, '../blog');
const blogPostPaths = readdirSync(blogRoot)
  .filter((name) => {
    const dir = resolve(blogRoot, name);
    return statSync(dir).isDirectory() && statSync(resolve(dir, 'index.html')).isFile();
  })
  .map((name) => ({ slug: name, html: readFileSync(resolve(blogRoot, name, 'index.html'), 'utf-8') }));

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
      expect(css).toMatch(/@media\s*\(\s*max-width:\s*480px\s*\)/);
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
  });

  describe('blog post image markup', () => {
    it('no blog post images have inline width attributes', () => {
      for (const post of blogPostPaths) {
        setupDOM(post.html);
        const images = document.querySelectorAll('.blog-figure img');
        for (const img of images) {
          expect(img.hasAttribute('width'), `${post.slug}: image has inline width`).toBe(false);
        }
      }
    });

    it('all blog post images are inside figure elements', () => {
      for (const post of blogPostPaths) {
        setupDOM(post.html);
        const allImages = document.querySelectorAll('main img');
        for (const img of allImages) {
          expect(img.closest('.blog-figure'), `${post.slug}: image not in .blog-figure`).not.toBeNull();
        }
      }
    });
  });
});
