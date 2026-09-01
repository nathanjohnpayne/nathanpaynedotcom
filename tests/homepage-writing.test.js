import { describe, it, expect, beforeEach } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { resolve, join } from 'path';
import { blogSlugFromPath, findBlogMarkdownFiles } from '../scripts/lib/blog-file-inventory.mjs';
import { parseFrontmatter } from '../scripts/lib/parse-frontmatter.mjs';
import { EXPECTED_BLOG_EDITORIAL_ORDER } from './helpers/blog-editorial-order.js';
import { writeSanitizedDOM } from './helpers/dom.js';

// Guards the homepage Writing block against the drift reported in #523. The
// block is generated from the blog collection — the editorially ordered posts,
// capped at WRITING_LIST_LIMIT (#619) — so:
//   1. it must NOT assert a hardcoded post count that can fall behind the blog
//      collection (the old copy said "Three pieces" while five were published);
//      the expected count is derived from the collection and the cap instead;
//   2. each generated link must resolve to a real built post, so a renamed or
//      unpublished post can't leave a dead homepage link.
// Reads the built dist/ HTML (`npm test` runs `astro build` first).

const DIST = resolve(__dirname, '../dist');
const CONTENT_DIR = resolve(__dirname, '../src/content/blog');

// The list is generated from the blog collection and capped, so the expected
// link count is derived here rather than written down — a literal would drift
// exactly the way the hand-typed <ul> did (#619).
const WRITING_LIST_LIMIT = 5;

const allPosts = findBlogMarkdownFiles(CONTENT_DIR).map((filePath) => ({
  slug: blogSlugFromPath(filePath, CONTENT_DIR),
  data: parseFrontmatter(readFileSync(filePath, 'utf-8')) ?? {},
}));

const publishedPosts = allPosts.filter((post) => post.data.draft !== 'true');

const editorialPosts = EXPECTED_BLOG_EDITORIAL_ORDER.map((slug) =>
  publishedPosts.find((post) => post.slug === slug),
);

/** Post links only — the trailing "View all writing" link is not a post. */
function postLinks() {
  return [...document.querySelectorAll('.writing-list a')].filter(
    (a) =>
      (a.getAttribute('href') || '').startsWith('/blog/') && a.getAttribute('href') !== '/blog/',
  );
}

function readDistHtml(relativePath) {
  return readFileSync(resolve(DIST, relativePath), 'utf-8');
}

function setupDOM(rawHtml) {
  // Scripts are removed on a detached document and the doctype preserved by
  // the shared helper — see tests/helpers/dom.js for why both matter.
  writeSanitizedDOM(rawHtml);
}

describe('homepage Writing block (#523)', () => {
  beforeEach(() => {
    setupDOM(readFileSync(resolve(DIST, 'index.html'), 'utf-8'));
  });

  it('does not hardcode a post count that can drift from the blog collection', () => {
    const list = document.querySelector('.writing-list');
    expect(list, '.writing-list missing').not.toBeNull();
    const prose = list.previousElementSibling?.textContent ?? '';
    // A literal "<N> pieces/posts" claim (e.g. the old "Three pieces") goes
    // stale as posts are published; the block is framed as a curated selection.
    expect(prose).not.toMatch(
      /\b(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+(pieces|posts|essays|articles|stories)\b/i,
    );
  });

  it('links only to posts that exist in the built blog output', () => {
    const hrefs = postLinks().map((a) => a.getAttribute('href'));
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      const slug = href.replace(/^\/blog\//, '').replace(/\/$/, '');
      expect(
        existsSync(resolve(DIST, 'blog', slug, 'index.html')),
        `homepage Writing link ${href} should resolve to a built post`,
      ).toBe(true);
    }
  });

  // ── #619 ────────────────────────────────────────────────────────────────
  // The block used to be a hand-typed <ul> that fell two posts behind the
  // collection. These assert it is generated from the collection instead.

  it('lists the published posts up to the cap in editorial order', () => {
    const expected = editorialPosts.slice(0, WRITING_LIST_LIMIT);
    const hrefs = postLinks().map((a) => a.getAttribute('href'));

    expect(hrefs).toHaveLength(Math.min(publishedPosts.length, WRITING_LIST_LIMIT));
    expect(hrefs).toEqual(expected.map((post) => `/blog/${post.slug}/`));
  });

  it('never renders a draft post', () => {
    const draftSlugs = allPosts
      .filter((post) => post.data.draft === true)
      .map((post) => `/blog/${post.slug}/`);

    const hrefs = postLinks().map((a) => a.getAttribute('href'));
    for (const draft of draftSlugs) {
      expect(hrefs, `draft ${draft} must not appear on the homepage`).not.toContain(draft);
    }
  });

  it('uses the canonical post title as the link text', () => {
    const expected = editorialPosts.slice(0, WRITING_LIST_LIMIT);
    const texts = postLinks().map((a) =>
      a.textContent.replace(/→/g, '').replace(/\s+/g, ' ').trim(),
    );

    expect(texts).toEqual(expected.map((post) => post.data.title));
  });

  it('keeps Latest Post chronological rather than featured', () => {
    const latest = [...publishedPosts].sort(
      (a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime(),
    )[0];
    const link = document.querySelector('.blog-callout-link');

    expect(link?.getAttribute('href')).toBe(`/blog/${latest.slug}/`);
    expect(link?.getAttribute('href')).toBe('/blog/autofix-was-the-whole-cost/');
  });

  it('closes the list with a "View all writing" link to /blog/', () => {
    const all = [...document.querySelectorAll('.writing-list a')];
    const last = all[all.length - 1];
    expect(last?.getAttribute('href')).toBe('/blog/');
    expect(last?.textContent.replace(/→/g, '').replace(/\s+/g, ' ').trim()).toBe(
      'View all writing',
    );
  });
});

// #892 — the homepage Builds grid is hand-authored markup that mirrors the
// projects collection. These guard the two things that can silently drift.
//
// Deliberately NOT pinned: which projects appear. The section is headed
// "Selected Projects" precisely so a project can be left out here while still
// appearing on /projects/, so a test demanding all seven would fight the
// surface's own intent. What is pinned is that whatever subset is shown keeps
// the canonical relative order, and that each row's status matches the
// frontmatter it mirrors.
describe('Homepage Builds grid mirrors the projects collection (#892)', () => {
  const CONTENT = resolve(__dirname, '../src/content/projects');

  function projectFrontmatter() {
    return readdirSync(CONTENT)
      .filter((file) => /\.mdx?$/.test(file))
      .map((file) => parseFrontmatter(readFileSync(join(CONTENT, file), 'utf-8')))
      .filter((data) => data.draft !== true)
      .sort((a, b) => a.order - b.order);
  }

  function homepageRows() {
    setupDOM(readDistHtml('index.html'));
    const panel = document.querySelector('[data-panel="projects"]');
    return [...panel.querySelectorAll('.project-item')].map((item) => ({
      href: item.querySelector('.p-name-link')?.getAttribute('href'),
      title: item.querySelector('.p-name-link')?.textContent?.replace('→', '').trim(),
      status: item.querySelector('.p-status')?.textContent?.trim(),
    }));
  }

  it('lists a subset of the canonical order, in canonical order', () => {
    const canonical = projectFrontmatter().map((data) => `/projects/${data.slug}/`);
    const shown = homepageRows().map((row) => row.href);

    expect(shown.length, 'the grid should list at least one project').toBeGreaterThan(0);
    for (const href of shown) {
      expect(canonical, `${href} is not a published project`).toContain(href);
    }
    // Subsequence check: omission is allowed, reordering is not.
    const positions = shown.map((href) => canonical.indexOf(href));
    const ascending = [...positions].sort((a, b) => a - b);
    expect(positions, 'homepage rows are out of canonical order').toEqual(ascending);
    expect(new Set(shown).size, 'a project is listed twice').toBe(shown.length);
  });

  it('labels every row with the status from that project’s frontmatter', () => {
    const statusBySlug = Object.fromEntries(
      projectFrontmatter().map((data) => [`/projects/${data.slug}/`, data.status]),
    );
    const rows = homepageRows();
    for (const row of rows) {
      expect(row.status, `${row.href} has no status label`).toBeTruthy();
      expect(row.status, `${row.href} status disagrees with its frontmatter`).toBe(
        statusBySlug[row.href],
      );
    }
    // The whole point of the labels: the grid must not read as uniformly shipped.
    expect(new Set(rows.map((r) => r.status)).size, 'expected mixed lifecycle states').toBeGreaterThan(1);
  });

  it('offers a route into the projects index', () => {
    setupDOM(readDistHtml('index.html'));
    const panel = document.querySelector('[data-panel="projects"]');
    const cta = panel.querySelector('.projects-index-cta');
    expect(cta, 'no CTA into /projects/').not.toBeNull();
    expect(cta?.getAttribute('href')).toBe('/projects/');
    expect(cta?.textContent).toContain('View all projects and case studies');
  });
});
