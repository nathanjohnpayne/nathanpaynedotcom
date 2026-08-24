export const BLOG_CATEGORIES = ['Agent Systems', 'Building This Site'] as const;

export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

interface EditorialBlogPost {
  data: {
    category: BlogCategory;
    featured: boolean;
    date: Date;
  };
}

/**
 * Featured first, then the declared category sequence, then newest within
 * each category. BLOG_CATEGORIES is also the content-schema enum, so an
 * accepted category can never be missing from the editorial rank.
 */
export function compareBlogPosts(a: EditorialBlogPost, b: EditorialBlogPost): number {
  const featuredRank = Number(b.data.featured) - Number(a.data.featured);
  if (featuredRank !== 0) return featuredRank;

  const categoryRank =
    BLOG_CATEGORIES.indexOf(a.data.category) - BLOG_CATEGORIES.indexOf(b.data.category);
  if (categoryRank !== 0) return categoryRank;

  return b.data.date.getTime() - a.data.date.getTime();
}
