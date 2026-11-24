/**
 * Loads the collections and applies the display rules from catalog.ts.
 * Pages use these helpers and never filter products or categories themselves.
 */
import { getCollection, type CollectionEntry } from 'astro:content';
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
