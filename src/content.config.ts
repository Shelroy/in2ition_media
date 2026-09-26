import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),          // shown in Google results, keep under ~155 characters
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string().default('Shelroy Thomas'),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false), // drafts show while previewing but are not published
  }),
});

const work = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/work' }),
  schema: z.object({
    title: z.string(),
    seoTitle: z.string(),
    description: z.string(),
    order: z.number(),
    client: z.string(),
    industry: z.string(),
    location: z.string(),
    summary: z.string(),
    services: z.array(z.string()),
    liveUrl: z.string().url().optional(),
    status: z.string().optional(),
    images: z.object({ desktop: z.string(), full: z.string(), mobile: z.string() }),
    highlights: z.array(z.object({ title: z.string(), text: z.string() })),
    review: z.object({ quote: z.string(), author: z.string(), role: z.string() }).optional(),
  }),
});

export const collections = { blog, work };
