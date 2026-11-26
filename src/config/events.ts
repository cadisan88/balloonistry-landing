/**
 * Event decor: services and event types (docs/SPEC.md section 6).
 * Used on the home page and on the Events page.
 * Gallery photos are not here. To change them, edit src/content/events-gallery.json and
 * src/content/corporate-gallery.json (put new files in src/assets/events/).
 */

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

/** How many photos the Events and Corporate pages show before "See more photos". */
export const GALLERY_PREVIEW_COUNT = 6;
