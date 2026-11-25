/**
 * Content collections. See docs/CONTENT_MODEL.md.
 * The file name, without the extension, is the entry id and the URL slug.
 * A mistake in a content file (wrong category, missing photo, bad price) fails the build.
 */
import { existsSync } from 'node:fs';
import { defineCollection, reference } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { FAQ_GROUPS } from './lib/faq';

export const PRODUCT_TAGS = ['new', 'best-seller'] as const;

const CATEGORIES_DIR = './src/content/categories';

/**
 * A reference to a category file that must exist.
 * Astro only logs a warning for an unknown reference, so this check makes the build fail.
 */
const categoryReference = reference('categories').refine(
  (ref) => existsSync(`${CATEGORIES_DIR}/${typeof ref === 'string' ? ref : ref.id}.json`),
  { error: `Unknown category. Use the file name of a category in ${CATEGORIES_DIR}.` },
);

const categories = defineCollection({
  loader: glob({ pattern: '*.json', base: CATEGORIES_DIR }),
  schema: ({ image }) =>
    z.object({
      name: z.string().min(1).max(60),
      description: z.string().max(300).optional(),
      /** Tile photo. */
      image: image().optional(),
      order: z.number().int().default(100),
      /** false = hidden everywhere (seasonal). */
      visible: z.boolean().default(true),
    }),
});

const optionChoice = z.object({
  label: z.string().min(1).max(60),
  /** Added to the base price. */
  price: z.number().nonnegative().default(0),
});

const optionGroup = z.object({
  name: z.string().min(1).max(40),
  /** single = radio (first choice is the default), multiple = checkboxes. */
  type: z.enum(['single', 'multiple']),
  choices: z.array(optionChoice).min(1).max(12),
});

const products = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/products' }),
  schema: ({ image }) =>
    z.object({
      name: z.string().min(1).max(80),
      /** Shown as "From $X". Missing = "Request a quote". */
      price: z.number().positive().optional(),
      categories: z.array(categoryReference).min(1),
      tags: z.array(z.enum(PRODUCT_TAGS)).default([]),
      /** The first image is the main photo. */
      images: z.array(image()).min(1),
      /** Default: the product name. */
      imageAlt: z.string().max(150).optional(),
      /** Shown on the home page. */
      featured: z.boolean().default(false),
      /** false = hidden everywhere. */
      available: z.boolean().default(true),
      order: z.number().int().default(100),
      /** 0-100, higher = more popular. Used by "Most popular". */
      popularity: z.number().int().min(0).max(100).default(0),
      /** Date the product was added. Used by "Newest". Missing sorts last. */
      added: z.coerce.date().optional(),
      /** Bullet list in the Features section. */
      features: z.array(z.string().min(1)).default([]),
      /** Optional videos, files in public/media/products/. */
      videos: z
        .array(
          z.object({
            src: z.string().startsWith('/media/'),
            poster: image().optional(),
          }),
        )
        .default([]),
      /** Variations that change the price. */
      options: z.array(optionGroup).max(6).default([]),
    }),
});

const faq = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/faq' }),
  schema: z.object({
    question: z.string().min(1),
    group: z.enum(FAQ_GROUPS),
    order: z.number().int().default(100),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
  }),
});

const policies = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/policies' }),
  schema: z.object({
    title: z.string().min(1),
    updated: z.coerce.date(),
  }),
});

const testimonials = defineCollection({
  loader: file('./src/content/testimonials.json'),
  schema: ({ image }) =>
    z.object({
      /** Customer name. */
      name: z.string().min(1),
      city: z.string().min(1).optional(),
      /** The review text. */
      message: z.string().min(1),
      /** Photo, relative to this file, in src/assets/testimonials/. */
      image: image(),
      /** Shown first in the carousel. */
      featured: z.boolean().default(false),
    }),
});

/** Text shared by every product page. */
const productInfo = defineCollection({
  loader: file('./src/content/product-info.json'),
  schema: z.object({
    shipping: z.string().min(1),
    returns: z.string().min(1),
  }),
});

export const collections = {
  categories,
  products,
  faq,
  pages,
  policies,
  testimonials,
  productInfo,
};
