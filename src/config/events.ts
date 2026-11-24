/**
 * Event decor: services, event types and gallery photos (docs/SPEC.md section 6).
 * Used on the home page and on the Events page.
 * To change a gallery photo: put the file in src/assets/events/ and change the import below.
 */
import type { ImageMetadata } from 'astro';
import arch from '../assets/events/placeholder-arch.jpg';
import columns from '../assets/events/placeholder-columns.jpg';
import garland from '../assets/events/placeholder-garland.jpg';

export interface GalleryPhoto {
  image: ImageMetadata;
  /** Describes what the photo shows. */
  alt: string;
}

export const eventServices: string[] = [
  'Arches and semi arches',
  'Organic garlands',
  'Columns and freestanding displays',
  'Outdoor decor',
];

export const eventTypes: string[] = [
  'Birthdays',
  'Baby showers',
  'Weddings',
  'Graduations',
  'Corporate',
];

/** TODO: replace the placeholders with real event photos (see docs/TODO.md). */
export const eventGallery: GalleryPhoto[] = [
  { image: arch, alt: 'Placeholder drawing of a balloon arch' },
  { image: garland, alt: 'Placeholder drawing of an organic balloon garland' },
  { image: columns, alt: 'Placeholder drawing of two balloon columns' },
];
