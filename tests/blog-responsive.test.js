import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const css = readFileSync(resolve(__dirname, '../style.css'), 'utf-8');
const blogPostHtml = readFileSync(resolve(__dirname, '../blog/six-prs-one-bug-agent-failure-modes/index.html'), 'utf-8');
const blogIndexHtml = readFileSync(resolve(__dirname, '../blog/index.html'), 'utf-8');

function setupDOM(html) {
  document.documentElement.innerHTML = '';
  document.write(html);
  document.close();
}

describe('Blog Responsive Layout', () => {
  describe('viewport meta tag', () => {
    it('blog post page has viewport meta tag with width=device-width', () => {
      setupDOM(blogPostHtml);
      const viewport = document.querySelector('meta[name="viewport"]');
      expect(viewport).not.toBeNull();
      expect(viewport.getAttribute('content')).toContain('width=device-width');
    });

    it('blog index page has viewport meta tag with width=device-width', () => {
      setupDOM(blogIndexHtml);
      const viewport = document.querySelector('meta[name="viewport"]');
      expect(viewport).not.toBeNull();
      expect(viewport.getAttribute('content')).toContain('width=device-width');
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

    it('blog figure images have width: 100% and height: auto', () => {
      expect(css).toMatch(/\.blog-figure\s+img\s*\{[^}]*width:\s*100%/);
      expect(css).toMatch(/\.blog-figure\s+img\s*\{[^}]*height:\s*auto/);
    });
  });

  describe('blog post image markup', () => {
    it('no blog post images have inline width attributes', () => {
      setupDOM(blogPostHtml);
      const images = document.querySelectorAll('.blog-figure img');
      for (const img of images) {
        expect(img.hasAttribute('width')).toBe(false);
      }
    });

    it('all blog post images are inside figure elements', () => {
      setupDOM(blogPostHtml);
      const figures = document.querySelectorAll('.blog-figure');
      const figureImages = document.querySelectorAll('.blog-figure img');
      expect(figureImages.length).toBe(figures.length);
    });
  });
});
