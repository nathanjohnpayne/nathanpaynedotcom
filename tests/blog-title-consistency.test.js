import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { blogSlugFromPath, findBlogMarkdownFiles } from '../scripts/lib/blog-file-inventory.mjs';
import { parseFrontmatter } from '../scripts/lib/parse-frontmatter.mjs';

/**
 * One canonical headline per post (#623).
 *
 * A post carries up to three title strings. Before this test they were free to
 * drift into three different headlines, so a link shared on LinkedIn unfurled
 * with "A Perfect Review Score, One Escaped Bug" and landed the reader on a
 * page headed "A Perfect Score on the Wrong Axis: 116 Review Findings, Zero
 * Rejected, One Escape". The contract, per specs/seo-metadata.md § Blog Title
 * Hierarchy, is that the three fields are a length ladder over ONE headline:
 *
 *   title      — the headline of record (h1, /blog card, homepage, RSS, JSON-LD)
 *   seoTitle   — the same headline at SERP length (<title>, og:title, OG card)
 *   shortTitle — a breadcrumb-width abbreviation (breadcrumb only)
 *
 * Part 1 checks the frontmatter contract from source. Part 2 checks the built
 * HTML actually renders the canonical headline on every reader-facing surface
 * (`npm test` runs `astro build` first).
 */

const CONTENT_DIR = resolve(__dirname, '../src/content/blog');
const DIST = resolve(__dirname, '../dist');

// Function words carry no identity, so they are excluded from the overlap
// measure — otherwise "A ... on the ..." would score as agreement.
const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'be',
  'but',
  'by',
  'for',
  'from',
  'how',
  'i',
  'in',
  'is',
  'it',
  'of',
  'on',
  'or',
  'out',
  'the',
  'to',
  'what',
  'when',
  'why',
  'with',
]);

/**
 * Lower-cased significant words. Splits on every non-alphanumeric run, so
 * punctuation ("Bug:", "Blues,") and hyphen compounds ("Mock-up" → mock, up)
 * are compared by their parts rather than as opaque strings.
 */
function significantWords(value) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word && !STOP_WORDS.has(word));
}

/** Share of `variant`'s significant words that also appear in `canonical`. */
function overlapRatio(variant, canonical) {
  const canonicalWords = new Set(significantWords(canonical));
  const variantWords = significantWords(variant);
  if (variantWords.length === 0) return 0;
  const shared = variantWords.filter((word) => canonicalWords.has(word));
  return shared.length / variantWords.length;
}

const posts = findBlogMarkdownFiles(CONTENT_DIR).map((filePath) => {
  const slug = blogSlugFromPath(filePath, CONTENT_DIR);
  const raw = readFileSync(filePath, 'utf-8');
  const data = parseFrontmatter(raw) ?? {};
  return { name: `${slug}.md`, slug, data };
});

const publishedPosts = posts.filter((post) => post.data.draft !== true);

describe('blog title consistency (#623)', () => {
  it('finds blog posts to audit', () => {
    expect(posts.length).toBeGreaterThan(0);
  });

  describe.each(posts)('$name', ({ data }) => {
    it('has a canonical title', () => {
      expect(typeof data.title).toBe('string');
      expect(data.title.trim().length).toBeGreaterThan(0);
    });

    it('keeps seoTitle recognisably the same headline as title', () => {
      if (!data.seoTitle) return;
      // A trim, not a rewrite: at least half of the SEO title's significant
      // words must be words the canonical headline actually uses.
      expect(
        overlapRatio(data.seoTitle, data.title),
        `seoTitle "${data.seoTitle}" reads as a different headline from "${data.title}"`,
      ).toBeGreaterThanOrEqual(0.5);
    });

    it('keeps seoTitle no longer than the canonical title', () => {
      if (!data.seoTitle) return;
      // seoTitle exists to fit the SERP budget. One longer than `title` is
      // not serving that purpose and is almost certainly a rename.
      expect(data.seoTitle.length).toBeLessThanOrEqual(data.title.length);
    });

    it('keeps shortTitle an abbreviation of title, not a rename', () => {
      if (!data.shortTitle) return;
      expect(
        overlapRatio(data.shortTitle, data.title),
        `shortTitle "${data.shortTitle}" reads as a different headline from "${data.title}"`,
      ).toBeGreaterThanOrEqual(0.5);
      expect(data.shortTitle.length).toBeLessThanOrEqual(data.title.length);
    });
  });
});

describe('canonical headline reaches every reader-facing surface (#623)', () => {
  const rss = existsSync(resolve(DIST, 'rss.xml'))
    ? readFileSync(resolve(DIST, 'rss.xml'), 'utf-8')
    : null;
  const blogIndex = existsSync(resolve(DIST, 'blog/index.html'))
    ? readFileSync(resolve(DIST, 'blog/index.html'), 'utf-8')
    : null;

  it('built output is present', () => {
    expect(rss, 'dist/rss.xml missing — run `npm test` (astro build first)').not.toBeNull();
    expect(blogIndex, 'dist/blog/index.html missing').not.toBeNull();
  });

  describe.each(publishedPosts)('$slug', ({ slug, data }) => {
    const postHtmlPath = resolve(DIST, 'blog', slug, 'index.html');

    it('renders the canonical title as the post h1', () => {
      const html = readFileSync(postHtmlPath, 'utf-8');
      const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
      expect(h1, `${slug}: no <h1> in built post`).not.toBeNull();
      expect(decode(h1[1])).toBe(data.title);
    });

    it('uses the canonical title on the /blog/ card and in RSS', () => {
      expect(decode(blogIndex)).toContain(data.title);
      expect(decode(rss)).toContain(data.title);
    });

    it('does not use shortTitle as the page title or og:title', () => {
      if (!data.shortTitle || data.shortTitle === data.seoTitle) return;
      const html = readFileSync(postHtmlPath, 'utf-8');
      const expected = `${data.seoTitle || data.title} | Nathan Payne`;
      const pageTitle = decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1] ?? '');
      const ogTitle = decode(
        html.match(/<meta\s+property="og:title"\s+content="([^"]*)"/)?.[1] ?? '',
      );
      expect(pageTitle).toBe(expected);
      expect(ogTitle).toBe(expected);
    });
  });
});

/** Minimal entity decode — titles use quotes, ampersands and em dashes. */
function decode(value) {
  return value
    .replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();
}
