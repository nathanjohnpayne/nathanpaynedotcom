import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    description: z.string(),
    kicker: z.string(),
    order: z.number(),
    screenshotAspect: z.enum(['wide', 'narrow']),
    screenshotSrc: z.string(),
    accentColor: z.string(),
    accentColorClass: z.string(),
    gradientFrom: z.string(),
    gradientTo: z.string(),
    liveUrl: z.string(),
    githubUrl: z.string(),
    tags: z.array(z.string()),
    metadata: z.object({
      domain: z.string(),
      format: z.string(),
      focus: z.string(),
      status: z.string(),
    }),
    stack: z.string().optional(),
    related: z.array(z.object({
      label: z.string(),
      href: z.string(),
    })).optional().default([]),
    draft: z.boolean().default(false),

    // Opt-in: refresh `screenshotSrc` on each build from the GitHub
    // social preview of `githubUrl`. See scripts/refresh-hero-images.mjs.
    heroRefresh: z.enum(['github-social']).optional(),

    // Mux Playback ID. When set, the project page renders a MUX video
    // in the hero slot; `screenshotSrc` still serves as the JS-disabled
    // fallback and as the OG image source.
    muxPlaybackId: z.string().optional(),
  }),
});

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

export const collections = { blog, projects };
