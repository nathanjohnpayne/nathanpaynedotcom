/**
 * The AI-use disclosure, rendered (#1493, epic #1490).
 *
 * Every non-draft blog post and case study shows a short "AI use" link near its
 * top, and ends with a "How this was written" block holding its own statement
 * and a link to /how-i-write/. The layouts render both unconditionally and
 * `aiUse` is required (#1498), so no entry can omit or move them. This suite
 * reads the built site, so it describes what a reader gets, and it checks every
 * entry: a layout that drops the block or the link fails once per entry of that
 * kind, which is why there is no separate layout-source check.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { splitEntry } from '../src/lib/ai-use-stamp.mjs';
import { blogSlugFromPath, findBlogMarkdownFiles } from '../scripts/lib/blog-file-inventory.mjs';
import { HOW_I_WRITE_PATH } from '../src/lib/how-i-write.ts';
import { AI_USE_ID, AI_USE_HEADING, AI_USE_LINK_LABEL } from '../src/lib/ai-use.ts';
import { readBuiltPage, readBuiltStylesheet, writeSanitizedDOM } from './helpers/dom.js';

const root = resolve(__dirname, '..');
const blogDir = resolve(root, 'src/content/blog');
const projectsDir = resolve(root, 'src/content/projects');

function entries(kind) {
  const files =
    kind === 'blog'
      ? findBlogMarkdownFiles(blogDir).map((file) => ({
          file,
          slug: blogSlugFromPath(file, blogDir),
        }))
      : readdirSync(projectsDir)
          .filter((name) => /\.mdx?$/.test(name))
          .map((name) => ({ file: resolve(projectsDir, name), slug: null }));
  return files
    .map(({ file, slug }) => {
      const { frontmatter } = splitEntry(readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
      return {
        kind,
        slug: slug ?? frontmatter.slug,
        draft: frontmatter.draft === 'true',
        statement: frontmatter.aiUse?.statement,
      };
    })
    .filter((entry) => !entry.draft)
    .map((entry) => ({
      ...entry,
      path:
        entry.kind === 'blog'
          ? `blog/${entry.slug}/index.html`
          : `projects/${entry.slug}/index.html`,
    }));
}

const published = [...entries('blog'), ...entries('projects')];

const squash = (text) => text.replace(/\s+/g, ' ').trim();
const follows = (a, b) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

describe('Every non-draft entry renders the link and the end block (#1493, #1498)', () => {
  // Positive control: without it a misdirected walk leaves the loop below
  // empty and the suite passes having checked nothing.
  it('reads the posts and case studies it will check', () => {
    expect(published.filter((e) => e.kind === 'blog').length).toBeGreaterThan(0);
    expect(published.filter((e) => e.kind === 'projects').length).toBeGreaterThan(0);
    for (const entry of published) {
      expect(entry.statement, `${entry.kind}/${entry.slug}: aiUse.statement`).toBeTruthy();
    }
  });

  for (const entry of published) {
    it(`${entry.kind}/${entry.slug}: the "AI use" link, on every surface`, () => {
      writeSanitizedDOM(readBuiltPage(entry.path));
      const surfaces =
        entry.kind === 'blog'
          ? ['.blog-sidebar-meta', '.blog-header-kicker']
          : ['.project-actions'];
      for (const surface of surfaces) {
        const links = document.querySelectorAll(`${surface} a.ai-use-link[href="#${AI_USE_ID}"]`);
        expect(links.length, `${entry.slug}: no AI-use link in ${surface}`).toBe(1);
        expect(squash(links[0].textContent), `${entry.slug}: link name`).toBe(AI_USE_LINK_LABEL);
        const icon = links[0].querySelector('svg');
        expect(icon?.getAttribute('aria-hidden'), `${entry.slug}: icon must be decorative`).toBe(
          'true',
        );
      }
      expect(document.querySelectorAll('a.ai-use-link').length).toBe(surfaces.length);
    });

    it(`${entry.kind}/${entry.slug}: section#ai-use holds the statement, before the closing blocks`, () => {
      writeSanitizedDOM(readBuiltPage(entry.path));
      const blocks = document.querySelectorAll(`section#${AI_USE_ID}`);
      expect(blocks.length, `${entry.slug}: expected one section#${AI_USE_ID}`).toBe(1);
      const block = blocks[0];
      expect(document.querySelectorAll(`#${AI_USE_ID}`).length, 'the id must be unique').toBe(1);

      const heading = block.querySelector('h2');
      expect(squash(heading.textContent)).toBe(AI_USE_HEADING);
      expect(block.getAttribute('aria-labelledby')).toBe(heading.id);
      expect(heading.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');

      const statement = block.querySelector('.ai-use__statement');
      expect(squash(statement.textContent).startsWith(squash(entry.statement))).toBe(true);
      const more = statement.querySelector('a.ai-use__more');
      expect(more?.getAttribute('href')).toBe(HOW_I_WRITE_PATH);
      expect(squash(more.textContent)).toBe('More about how I write');

      // The heading is layout chrome, so it never enters the table of contents.
      expect(document.querySelector('.blog-sidebar')?.textContent ?? '').not.toContain(
        AI_USE_HEADING,
      );

      if (entry.kind === 'blog') {
        expect(block.closest('.blog-content'), 'inside the article column').not.toBeNull();
        expect(block.closest('.blog-postscript'), 'outside .blog-postscript').toBeNull();
        expect(follows(document.querySelector('.blog-prose'), block), 'after the prose').toBe(true);
        const postscript = document.querySelector('.blog-postscript');
        expect(postscript, 'blog-postscript exists').not.toBeNull();
        expect(follows(block, postscript), 'before .blog-postscript').toBe(true);
      } else {
        expect(follows(document.querySelector('.project-copy'), block), 'after the prose').toBe(
          true,
        );
        const related = document.querySelector('.project-related');
        if (related) expect(follows(block, related), 'before .project-related').toBe(true);
        expect(follows(block, document.querySelector('.site-footer')), 'before the footer').toBe(
          true,
        );
      }
    });
  }
});

describe('Print stylesheet', () => {
  it('the shipped stylesheet prints the block and drops the link', () => {
    const css = readBuiltStylesheet();
    const printBlocks = [...css.matchAll(/@media print\{([\s\S]*?\})\}/g)]
      .map((m) => m[1])
      .join('\n');
    expect(printBlocks).toMatch(/\.ai-use-link\{display:none!important\}/);
    expect(printBlocks).toMatch(/\.ai-use\{[^}]*break-inside:avoid/);
    expect(css).not.toMatch(/\.ai-use-link[^{]*\{[^}]*#[0-9a-f]{3,6}/i);
  });
});
