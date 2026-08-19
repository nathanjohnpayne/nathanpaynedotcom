/**
 * Key takeaways (#621) and the end-of-post block (#622).
 *
 * Two contracts guarded here:
 *   1. Every non-draft post ships 2–4 `keyTakeaways`, rendered as a real
 *      heading + real list in the article column (not the sidebar), so a new
 *      post cannot ship without one.
 *   2. Every post ends on prev/next navigation computed from the collection
 *      in date order — omitting the missing side at the ends rather than
 *      wrapping — plus a single availability CTA with distinct PostHog events.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { resolve } from 'path';
import { writeSanitizedDOM } from './helpers/dom.js';

const configSource = readFileSync(resolve(__dirname, '../src/content.config.ts'), 'utf-8');

const contentDir = resolve(__dirname, '../src/content/blog');
const sourcePosts = readdirSync(contentDir)
  .filter((f) => f.endsWith('.md'))
  .map((f) => ({
    name: f,
    slug: f.replace(/\.md$/, ''),
    raw: readFileSync(resolve(contentDir, f), 'utf-8'),
  }));

/** Frontmatter block of a post, as raw text. */
function frontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  expect(match, 'post is missing a frontmatter block').not.toBeNull();
  return match[1];
}

/** Scalar frontmatter field (top-level, single line). */
function scalar(raw, key) {
  const match = frontmatter(raw).match(new RegExp(`^${key}:\\s*(.*)$`, 'm'));
  return match ? match[1].trim() : undefined;
}

/** Items of a top-level frontmatter list of quoted strings. */
function stringList(raw, key) {
  const lines = frontmatter(raw).split('\n');
  const start = lines.findIndex((line) => line.trim() === `${key}:`);
  if (start === -1) return null;
  const items = [];
  for (const line of lines.slice(start + 1)) {
    const item = line.match(/^ {2}-\s*"([\s\S]*)"\s*$/);
    if (item) {
      items.push(item[1]);
      continue;
    }
    if (/^\S/.test(line)) break; // next top-level key
  }
  return items;
}

const publishedPosts = sourcePosts.filter((p) => scalar(p.raw, 'draft') !== 'true');

const blogRoot = resolve(__dirname, '../dist/blog');
const builtPosts = readdirSync(blogRoot)
  .filter((name) => {
    const dir = resolve(blogRoot, name);
    return statSync(dir).isDirectory() && existsSync(resolve(dir, 'index.html'));
  })
  .map((name) => ({
    slug: name,
    html: readFileSync(resolve(blogRoot, name, 'index.html'), 'utf-8'),
  }));

const astroDir = resolve(__dirname, '../dist/_astro');
const cssFile = readdirSync(astroDir).find((f) => f.endsWith('.css'));
const css = readFileSync(resolve(astroDir, cssFile), 'utf-8');

function setupDOM(html) {
  // Scripts are removed on a detached document and the doctype preserved by
  // the shared helper — see tests/helpers/dom.js for why both matter.
  writeSanitizedDOM(html);
}

// Date order, newest first — the same ordering /blog/ and [slug].astro use.
const postsByDateDesc = publishedPosts
  .map((p) => ({ ...p, date: scalar(p.raw, 'date') }))
  .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

describe('Blog key takeaways (#621)', () => {
  it('the blog schema declares keyTakeaways as an optional string array defaulting to []', () => {
    expect(configSource).toContain('keyTakeaways: z.array(z.string()).optional().default([])');
  });

  it('every non-draft post ships 2–4 key takeaways', () => {
    expect(publishedPosts.length).toBeGreaterThan(0);
    for (const post of publishedPosts) {
      const takeaways = stringList(post.raw, 'keyTakeaways');
      expect(takeaways, `${post.name}: missing keyTakeaways`).not.toBeNull();
      expect(takeaways.length, `${post.name}: expected 2–4 takeaways`).toBeGreaterThanOrEqual(2);
      expect(takeaways.length, `${post.name}: expected 2–4 takeaways`).toBeLessThanOrEqual(4);
      for (const takeaway of takeaways) {
        expect(takeaway.trim().length, `${post.name}: empty takeaway`).toBeGreaterThan(0);
        // Portable claims, not section summaries (#621 notes/risks).
        expect(takeaway, `${post.name}: takeaway reads as a section summary`).not.toMatch(
          /^(in this post|this post|this article|we (will )?(discuss|cover)|i (discuss|cover|explain))/i,
        );
      }
    }
  });

  it('every built post renders the takeaways as a real heading and list in the article column', () => {
    for (const post of builtPosts) {
      setupDOM(post.html);
      const box = document.querySelector('.blog-content .blog-takeaways');
      expect(box, `${post.slug}: no key-takeaways box in the article column`).not.toBeNull();

      const heading = box.querySelector('h2');
      expect(heading?.textContent.trim()).toBe('Key takeaways');
      expect(box.getAttribute('aria-labelledby')).toBe(heading.getAttribute('id'));

      const items = box.querySelectorAll('ul > li');
      expect(items.length, `${post.slug}: expected 2–4 rendered takeaways`).toBeGreaterThanOrEqual(
        2,
      );
      expect(items.length).toBeLessThanOrEqual(4);

      // Article column, above the body — never the sidebar (#621 open decision).
      expect(document.querySelector('.blog-sidebar .blog-takeaways')).toBeNull();
      const content = document.querySelector('.blog-content');
      const prose = content.querySelector('.blog-prose');
      expect(
        box.compareDocumentPosition(prose) & Node.DOCUMENT_POSITION_FOLLOWING,
        `${post.slug}: takeaways must precede the prose`,
      ).toBeTruthy();
    }
  });

  it('exposes the takeaways as the BlogPosting abstract in JSON-LD', () => {
    for (const post of builtPosts) {
      setupDOM(post.html);
      const jsonLd = JSON.parse(
        document.querySelector('script[type="application/ld+json"]').textContent,
      );
      const article = jsonLd['@graph'].find((node) => node['@type'] === 'BlogPosting');
      expect(article.abstract, `${post.slug}: BlogPosting has no abstract`).toBeTruthy();
    }
  });
});

describe('Blog end-of-post block (#622)', () => {
  it('renders prev/next in date order with no wrap at the ends', () => {
    for (const [index, post] of postsByDateDesc.entries()) {
      const built = builtPosts.find((b) => b.slug === post.slug);
      expect(built, `${post.slug}: no built page`).toBeDefined();
      setupDOM(built.html);

      const prev = document.querySelector('.blog-postnav__card--prev');
      const next = document.querySelector('.blog-postnav__card--next');

      const older = postsByDateDesc[index + 1];
      const newer = postsByDateDesc[index - 1];

      if (older) {
        expect(prev, `${post.slug}: expected a previous card`).not.toBeNull();
        expect(prev.getAttribute('href')).toBe(`/blog/${older.slug}/`);
      } else {
        expect(prev, `${post.slug}: oldest post must not wrap`).toBeNull();
      }

      if (newer) {
        expect(next, `${post.slug}: expected a next card`).not.toBeNull();
        expect(next.getAttribute('href')).toBe(`/blog/${newer.slug}/`);
      } else {
        expect(next, `${post.slug}: newest post must not wrap`).toBeNull();
      }
    }
  });

  it('prev/next cards carry the post title and a reading time in the /blog/ index format', () => {
    for (const post of builtPosts) {
      setupDOM(post.html);
      const cards = document.querySelectorAll('.blog-postnav__card');
      expect(cards.length, `${post.slug}: expected at least one neighbour card`).toBeGreaterThan(0);
      for (const card of cards) {
        expect(
          card.querySelector('.blog-postnav__title')?.textContent.trim().length,
        ).toBeGreaterThan(0);
        expect(card.querySelector('.blog-postnav__meta')?.textContent.trim()).toMatch(/^\d+ min$/);
      }
    }
  });

  it('renders one availability CTA per post with resume, email, and scheduling affordances', () => {
    for (const post of builtPosts) {
      setupDOM(post.html);
      const ctas = document.querySelectorAll('.blog-cta');
      expect(ctas.length, `${post.slug}: expected exactly one CTA`).toBe(1);

      const cta = ctas[0];
      expect(cta.textContent).toContain('Open to senior product/platform roles');
      expect(cta.querySelector('a[href="/resume/"][data-cta="resume"]')).not.toBeNull();
      expect(
        cta.querySelector('a[href="https://cal.com/nathanpayne"][data-cta="schedule"]'),
      ).not.toBeNull();
      expect(cta.querySelector('#blog-cta-mailto[data-cta="email"]')).not.toBeNull();

      // The address is assembled client-side; it must not ship in the HTML.
      expect(post.html).not.toContain('hire@nathanpayne.com');
    }
  });

  it('captures distinct PostHog events for the CTA, prev/next, and the post view', () => {
    for (const post of builtPosts) {
      expect(post.html).toContain("capture('blog_post_viewed'");
      expect(post.html).toContain("capture('blog_cta_clicked'");
      expect(post.html).toContain("capture('blog_post_nav_clicked'");
    }
  });

  it('hides the end-of-post block in print while keeping the takeaways', () => {
    const printBlock = css.match(
      /@media print\{[\s\S]*?\.blog-postscript\{display:none!important\}/,
    );
    expect(printBlock, 'no @media print rule hiding .blog-postscript').not.toBeNull();
    expect(css).toMatch(/\.blog-takeaways\{[^}]*background:#fff!important/);
  });
});
