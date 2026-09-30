import { describe, expect, it } from 'vitest';
import { BLOG_CATEGORIES, compareBlogPosts, selectHomepageWriting } from '../src/lib/blog-order';

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

describe('homepage Writing selection', () => {
  const ranked = (id, homepageRank) => ({ id, data: { homepageRank } });

  it('keeps only ranked posts, in rank order', () => {
    const posts = [ranked('third', 3), ranked('unranked'), ranked('first', 1), ranked('second', 2)];

    expect(selectHomepageWriting(posts).map(({ id }) => id)).toEqual(['first', 'second', 'third']);
  });

  it('refuses two posts with the same rank', () => {
    expect(() => selectHomepageWriting([ranked('a', 2), ranked('b', 2)])).toThrow(
      /homepageRank 2 is used by both a and b/,
    );
  });
});
