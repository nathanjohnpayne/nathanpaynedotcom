import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { getSiteCopy } from '../lib/site-copy';

export async function GET(context: APIContext) {
  const posts = (await getCollection('blog', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime(),
  );

  // The channel is the publication /blog/ indexes: its name and the feed's
  // own description come from src/content/site-copy/blog.md (#1166).
  const publication = await getSiteCopy('blog');

  return rss({
    title: publication.title,
    description: publication.feedDescription,
    site: context.site!.toString(),
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.description,
      link: `/blog/${post.id}/`,
    })),
  });
}
