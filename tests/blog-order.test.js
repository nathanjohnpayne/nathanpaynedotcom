import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { relative, resolve } from 'path';
import { findFilesRecursively } from '../scripts/lib/blog-file-inventory.mjs';
import { BLOG_CATEGORIES, compareBlogPosts } from '../src/lib/blog-order';

// `.ai_context.md` calls this module the shared category vocabulary for the
// editorial surfaces. Until #910 the suite covered the comparator's behaviour
// but not that claim: a second literal list could appear in a page and nothing
// would notice until two surfaces ranked the same posts differently.

const SRC = resolve(__dirname, '../src');

function post(slug, category, date, featured = false) {
  return { slug, data: { category, date: new Date(date), featured } };
}

describe('blog editorial ordering', () => {
  it('uses one ranked category vocabulary', () => {
    expect(BLOG_CATEGORIES).toEqual(['Agent Systems', 'Building This Site']);
  });

  it('keeps the featured post first and adds new posts newest-first within their category', () => {
    const posts = [
      post('old-site', 'Building This Site', '2026-01-01'),
      post('new-agent', 'Agent Systems', '2026-09-01'),
      post('featured', 'Agent Systems', '2026-01-01', true),
      post('new-site', 'Building This Site', '2026-10-01'),
      post('old-agent', 'Agent Systems', '2026-02-01'),
    ];

    expect(posts.sort(compareBlogPosts).map(({ slug }) => slug)).toEqual([
      'featured',
      'new-agent',
      'old-agent',
      'new-site',
      'old-site',
    ]);
  });

  it('is the only place src/ declares the category vocabulary', () => {
    // The residue guard, modelled on tests/lifecycle-marker.test.js. Every code
    // surface imports BLOG_CATEGORIES — including src/content.config.ts, which
    // feeds it straight to z.enum — so a bare category literal in a walked file
    // is a second copy. Blog posts carry the strings in frontmatter, but the
    // walk is restricted to code extensions, so content does not reach here.
    const offenders = findFilesRecursively(SRC, (f) => /\.(astro|ts|js|mjs)$/.test(f))
      .filter((f) => relative(SRC, f) !== 'lib/blog-order.ts')
      .filter((f) => {
        const source = readFileSync(f, 'utf-8');
        return /['"](?:Agent Systems|Building This Site)['"]/.test(source) ||
          /BLOG_CATEGORIES\s*=/.test(source);
      })
      .map((f) => relative(SRC, f));
    expect(offenders, 'blog category vocabulary duplicated outside blog-order.ts').toEqual([]);
  });

  it('every editorial surface imports the shared vocabulary', () => {
    // The control: prove the walk reaches the files that would carry a copy.
    const surfaces = ['content.config.ts', 'pages/index.astro', 'pages/blog/index.astro'];
    const walked = findFilesRecursively(SRC, (f) => /\.(astro|ts|js|mjs)$/.test(f)).map((f) =>
      relative(SRC, f),
    );
    for (const surface of surfaces) {
      expect(walked, `the residue walk never reached ${surface}`).toContain(surface);
      expect(
        readFileSync(resolve(SRC, surface), 'utf-8'),
        `${surface} does not import the shared blog order vocabulary`,
      ).toMatch(/from '[./]*lib\/blog-order'/);
    }
  });
});
