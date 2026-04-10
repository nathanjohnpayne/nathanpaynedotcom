import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    shortTitle: z.string().optional(),
    description: z.string(),
    author: z.string().default('Nathan Payne'),
    date: z.coerce.date(),
    tags: z.array(z.string()),
    image: z.string(),
    draft: z.boolean().default(false),

    // Sidebar content — optional, defaults to empty arrays.
    // Posts without these fields render the standard layout.
    pullquotes: z.array(z.object({
      text: z.string(),
      label: z.string().optional(),
      accent: z.enum(['red', 'yellow', 'blue']),
    })).optional().default([]),
    sidebar: z.array(z.object({
      type: z.enum(['mermaid', 'image', 'text']),
      content: z.string(),
      caption: z.string().optional(),
    })).optional().default([]),
  }),
});

export const collections = { blog };
