export const BLOG_CATEGORIES = ['Agent Systems', 'Building This Site'] as const;

export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

/** The Mondrian About panel has room for this many Writing links. */
export const HOMEPAGE_WRITING_LIMIT = 5;

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

interface HomepageWritingPost {
  id?: string;
  slug?: string;
  data: {
    homepageRank?: number;
  };
}

/**
 * The homepage Writing list is hand-curated: a post opts in with a
 * `homepageRank` from 1 to HOMEPAGE_WRITING_LIMIT, and the list is the ranked
 * posts in rank order. The ranks live in each post's own frontmatter rather
 * than in an array of slugs, so renaming or unpublishing a post cannot leave a
 * dead homepage link, which is how the hand-typed list drifted (#523, #619).
 * Nothing is filled in automatically: a new post reaches the homepage through
 * the chronological Latest Post callout until someone ranks it.
 */
export function selectHomepageWriting<T extends HomepageWritingPost>(posts: readonly T[]): T[] {
  const ranked = posts
    .filter((post) => post.data.homepageRank !== undefined)
    .sort((a, b) => (a.data.homepageRank ?? 0) - (b.data.homepageRank ?? 0));

  for (let i = 1; i < ranked.length; i += 1) {
    if (ranked[i].data.homepageRank === ranked[i - 1].data.homepageRank) {
      const name = (post: T) => post.id ?? post.slug ?? '(unnamed post)';
      throw new Error(
        `homepageRank ${ranked[i].data.homepageRank} is used by both ` +
          `${name(ranked[i - 1])} and ${name(ranked[i])}; each rank must be unique.`,
      );
    }
  }

  return ranked;
}
