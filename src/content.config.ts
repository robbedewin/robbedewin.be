import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    description: z.string(),
    tags: z.array(z.string()).default([]),
    order: z.number(),
    featured: z.boolean().default(false),
    period: z.string().optional(),
    repo: z.string().url().optional(),
    repoLabel: z.string().optional(),
    lang: z.enum(['en', 'nl']).default('en'),
  }),
});

export const collections = { projects };
