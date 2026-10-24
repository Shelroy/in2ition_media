import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    seoTitle: z.string().optional(),  // browser tab / Google title if the H1 is too long (keep under ~60 characters)
    description: z.string(),          // shown in Google results, keep under ~155 characters
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string().default('Shelroy Thomas'),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false), // drafts show while previewing but are not published
    relatedWork: z.string().optional(), // case study id, e.g. singing-chef-adventures
    faq: z.array(z.object({ q: z.string(), a: z.string() })).optional(), // also written as an FAQ section in the post body
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
    relatedPost: z.string().optional(), // blog post id
  }),
});

const services = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/services' }),
  schema: z.object({
    title: z.string(),                 // H1
    seoTitle: z.string(),              // browser tab / Google title, keep under ~60 characters
    description: z.string(),           // keep under ~155 characters
    order: z.number(),
    serviceType: z.string(),           // used in Service structured data
    lede: z.string(),
    included: z.array(z.object({ title: z.string(), text: z.string() })),
    faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
    relatedWork: z.string().optional(), // case study id
    relatedPost: z.string().optional(), // blog post id
    draft: z.boolean().default(false),  // drafts show while previewing but are not published
  }),
});

export const collections = { blog, work, services };
