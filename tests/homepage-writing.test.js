import { describe, it, expect, beforeEach } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { parseFrontmatter } from '../scripts/lib/parse-frontmatter.mjs';
import { writeSanitizedDOM } from './helpers/dom.js';

// Guards the homepage Writing block against the drift reported in #523. The
// block is generated from the blog collection — the newest published posts,
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

const publishedPosts = readdirSync(CONTENT_DIR)
  .filter((name) => name.endsWith('.md'))
  .map((name) => ({
    slug: name.replace(/\.md$/, ''),
    data: parseFrontmatter(readFileSync(resolve(CONTENT_DIR, name), 'utf-8')) ?? {},
  }))
  .filter((post) => post.data.draft !== true)
  .sort((a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime());

/** Post links only — the trailing "View all writing" link is not a post. */
function postLinks() {
  return [...document.querySelectorAll('.writing-list a')].filter(
    (a) =>
      (a.getAttribute('href') || '').startsWith('/blog/') && a.getAttribute('href') !== '/blog/',
  );
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

  it('lists the published posts up to the cap, newest first', () => {
    const expected = publishedPosts.slice(0, WRITING_LIST_LIMIT);
    const hrefs = postLinks().map((a) => a.getAttribute('href'));

    expect(hrefs).toHaveLength(Math.min(publishedPosts.length, WRITING_LIST_LIMIT));
    expect(hrefs).toEqual(expected.map((post) => `/blog/${post.slug}/`));
  });

  it('never renders a draft post', () => {
    const draftSlugs = readdirSync(CONTENT_DIR)
      .filter((name) => name.endsWith('.md'))
      .map((name) => ({
        slug: name.replace(/\.md$/, ''),
        data: parseFrontmatter(readFileSync(resolve(CONTENT_DIR, name), 'utf-8')) ?? {},
      }))
      .filter((post) => post.data.draft === true)
      .map((post) => `/blog/${post.slug}/`);

    const hrefs = postLinks().map((a) => a.getAttribute('href'));
    for (const draft of draftSlugs) {
      expect(hrefs, `draft ${draft} must not appear on the homepage`).not.toContain(draft);
    }
  });

  it('uses the canonical post title as the link text', () => {
    const expected = publishedPosts.slice(0, WRITING_LIST_LIMIT);
    const texts = postLinks().map((a) =>
      a.textContent.replace(/→/g, '').replace(/\s+/g, ' ').trim(),
    );

    expect(texts).toEqual(expected.map((post) => post.data.title));
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
