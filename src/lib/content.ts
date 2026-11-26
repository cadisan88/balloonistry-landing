/**
 * Loads the collections and applies the display rules from catalog.ts.
 * Pages use these helpers and never filter products or categories themselves.
 */
import type { ImageMetadata } from 'astro';
import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import * as catalog from './catalog';

export type Product = CollectionEntry<'products'>;
export type Category = CollectionEntry<'categories'>;

async function load() {
  const [products, categories] = await Promise.all([
    getCollection('products'),
    getCollection('categories'),
  ]);
  return { products, categories };
}

/** Visible categories, sorted. */
export async function getVisibleCategories(): Promise<Category[]> {
  return catalog.visibleCategories(await getCollection('categories'));
}

/** Every product that has a page (`available: true`). */
export async function getAvailableProducts(): Promise<Product[]> {
  return catalog.availableProducts(await getCollection('products'));
}

/** Products shown in lists and in the sitemap. */
export async function getListedProducts(): Promise<Product[]> {
  const { products, categories } = await load();
  return catalog.listedProducts(products, categories);
}

export async function getProductsInCategory(categoryId: string): Promise<Product[]> {
  const { products, categories } = await load();
  return catalog.productsInCategory(products, categories, categoryId);
}

export async function getFeaturedProducts(): Promise<Product[]> {
  const { products, categories } = await load();
  return catalog.featuredProducts(products, categories);
}

export async function getRelatedProducts(product: Product): Promise<Product[]> {
  const { products, categories } = await load();
  return catalog.relatedProducts(product, products, categories);
}

/** The product's visible categories, for the category links on the product page. */
export async function getCategoriesOf(product: Product): Promise<Category[]> {
  const categories = await getCollection('categories');
  const ids = catalog.visibleCategoryIdsOf(product, categories);
  return ids.flatMap((id) => categories.find((category) => category.id === id) ?? []);
}

/** Shipping and returns text shown on every product page. */
export async function getProductInfo(): Promise<{ shipping: string; returns: string }> {
  const entry = await getEntry('productInfo', 'default');
  return { shipping: entry?.data.shipping ?? '', returns: entry?.data.returns ?? '' };
}

/** One photo of the Events or Corporate gallery. */
export interface GalleryPhoto {
  image: ImageMetadata;
  /** Describes what the photo shows. */
  alt: string;
  /** Optional crop for the masonry gallery page: width divided by height. Default: the original. */
  ratio?: number;
}

/** Event decor photos, in the order of src/content/events-gallery.json. */
export async function getEventsGallery(): Promise<GalleryPhoto[]> {
  const entries = await getCollection('eventsGallery');
  return entries.map(({ data }) => data);
}

/** Corporate decor photos, in the order of src/content/corporate-gallery.json. */
export async function getCorporateGallery(): Promise<GalleryPhoto[]> {
  const entries = await getCollection('corporateGallery');
  return entries.map(({ data }) => data);
}
