import { describe, expect, it } from 'vitest';
import { BLOG_CATEGORIES, compareBlogPosts } from '../src/lib/blog-order';

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
});
