import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    author: z.string().default('Nathan Payne'),
    date: z.coerce.date(),
    tags: z.array(z.string()),
    image: z.string(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
