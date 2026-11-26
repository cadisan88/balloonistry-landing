import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { z } from 'astro/zod';
import { GALLERY_PREVIEW_COUNT } from '../src/config/events';
import { site } from '../src/config/site';

const CONTENT_DIR = resolve(__dirname, '../src/content');

/** Same shape as the gallery collections in src/content.config.ts, with the image as a path. */
const galleryFile = z.array(
  z.object({
    id: z.string().min(1),
    alt: z.string().min(1),
    image: z.string().min(1),
    ratio: z.number().positive().optional(),
  }),
);

const galleries = ['events-gallery.json', 'corporate-gallery.json'];

describe.each(galleries)('%s', (name) => {
  const parsed = galleryFile.safeParse(
    JSON.parse(readFileSync(resolve(CONTENT_DIR, name), 'utf8')),
  );

  it('matches the gallery schema', () => {
    expect(parsed.success, parsed.success ? '' : parsed.error.message).toBe(true);
  });

  const photos = parsed.success ? parsed.data : [];

  it('has unique ids', () => {
    expect(new Set(photos.map((photo) => photo.id)).size).toBe(photos.length);
  });

  it('has at least as many photos as the page preview', () => {
    expect(photos.length).toBeGreaterThanOrEqual(GALLERY_PREVIEW_COUNT);
  });

  it('has a non-empty alt text and a positive ratio on every photo', () => {
    for (const photo of photos) {
      expect(photo.alt.trim().length).toBeGreaterThan(0);
      if (photo.ratio !== undefined) expect(photo.ratio).toBeGreaterThan(0);
    }
  });

  it('points every photo to a file that exists', () => {
    for (const photo of photos) {
      expect(existsSync(resolve(CONTENT_DIR, photo.image)), photo.image).toBe(true);
    }
  });
});

describe('main navigation', () => {
  it('starts with Home, then Shop', () => {
    expect(site.nav[0]).toEqual({ label: 'Home', href: '/' });
    expect(site.nav[1]).toMatchObject({ label: 'Shop', href: '/shop/' });
  });
});
