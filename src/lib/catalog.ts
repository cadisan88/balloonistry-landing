/**
 * Display rules for products and categories (docs/CONTENT_MODEL.md, "Display rules").
 * Pure functions with no Astro imports, so they are easy to test.
 */

export interface CategoryLike {
  id: string;
  data: { name: string; order: number; visible: boolean };
}

export interface ProductLike {
  id: string;
  data: {
    name: string;
    order: number;
    available: boolean;
    featured: boolean;
    categories: { id: string }[];
    price?: number | undefined;
    popularity?: number | undefined;
    added?: Date | undefined;
  };
}

export const SORT_KEYS = ['recommended', 'price-asc', 'price-desc', 'popular', 'newest'] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export function isSortKey(value: unknown): value is SortKey {
  return typeof value === 'string' && (SORT_KEYS as readonly string[]).includes(value);
}

export const MAX_FEATURED = 8;
export const MAX_RELATED = 4;

/** Sort by `order` ascending, then by name. */
export function sortByOrder<T extends { data: { name: string; order: number } }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => a.data.order - b.data.order || a.data.name.localeCompare(b.data.name, 'en-CA'),
  );
}

/** The fields a sort looks at. `added` is a time in milliseconds. */
export interface SortFields {
  name: string;
  order: number;
  price?: number | undefined;
  popularity?: number | undefined;
  added?: number | undefined;
}

type Sortable = {
  data: {
    name: string;
    order: number;
    price?: number | undefined;
    popularity?: number | undefined;
    added?: Date | undefined;
  };
};

function missingLast(a: number | undefined, b: number | undefined, dir: 1 | -1): number {
  if (a === undefined && b === undefined) return 0;
  if (a === undefined) return 1;
  if (b === undefined) return -1;
  return (a - b) * dir;
}

/**
 * The comparator behind every sort of the shop toolbar. It also runs in the browser
 * (src/scripts/shop-sort.ts), so the page and the build always agree.
 * Ties and missing values fall back to `order`, then name. A missing price or date sorts last.
 */
export function compareProducts(key: SortKey): (a: SortFields, b: SortFields) => number {
  const byKey = (a: SortFields, b: SortFields): number => {
    switch (key) {
      case 'price-asc':
        return missingLast(a.price, b.price, 1);
      case 'price-desc':
        return missingLast(a.price, b.price, -1);
      case 'popular':
        return (b.popularity ?? 0) - (a.popularity ?? 0);
      case 'newest':
        return missingLast(a.added, b.added, -1);
      default:
        return 0;
    }
  };
  return (a, b) => byKey(a, b) || a.order - b.order || a.name.localeCompare(b.name, 'en-CA');
}

/** Sorts for the shop toolbar. Does not change the input. */
export function sortProducts<T extends Sortable>(products: T[], key: SortKey): T[] {
  const compare = compareProducts(key);
  const fields = (product: T): SortFields => ({
    name: product.data.name,
    order: product.data.order,
    price: product.data.price,
    popularity: product.data.popularity,
    added: product.data.added?.getTime(),
  });
  return [...products].sort((a, b) => compare(fields(a), fields(b)));
}

/** Categories with `visible: true`, sorted. Hidden categories never appear anywhere. */
export function visibleCategories<C extends CategoryLike>(categories: C[]): C[] {
  return sortByOrder(categories.filter((category) => category.data.visible));
}

/** Products with `available: true`, sorted. Each of these has a product page. */
export function availableProducts<P extends ProductLike>(products: P[]): P[] {
  return sortByOrder(products.filter((product) => product.data.available));
}

/** The ids of the product's categories that are visible, in the product's own order. */
export function visibleCategoryIdsOf(product: ProductLike, categories: CategoryLike[]): string[] {
  const visible = new Set(visibleCategories(categories).map((category) => category.id));
  return product.data.categories.map((ref) => ref.id).filter((id) => visible.has(id));
}

/**
 * Products that appear in lists (shop, home, related) and in the sitemap:
 * available, and in at least one visible category.
 * A product in only hidden categories keeps its page but is not listed.
 */
export function listedProducts<P extends ProductLike>(
  products: P[],
  categories: CategoryLike[],
): P[] {
  return availableProducts(products).filter(
    (product) => visibleCategoryIdsOf(product, categories).length > 0,
  );
}

/** Listed products of one category. Empty when the category is hidden. */
export function productsInCategory<P extends ProductLike>(
  products: P[],
  categories: CategoryLike[],
  categoryId: string,
): P[] {
  return listedProducts(products, categories).filter((product) =>
    visibleCategoryIdsOf(product, categories).includes(categoryId),
  );
}

/** Home page: listed products with `featured: true`, at most 8. */
export function featuredProducts<P extends ProductLike>(
  products: P[],
  categories: CategoryLike[],
): P[] {
  return listedProducts(products, categories)
    .filter((product) => product.data.featured)
    .slice(0, MAX_FEATURED);
}

/** "You may also like": up to 4 other products from the product's first visible category. */
export function relatedProducts<P extends ProductLike>(
  product: P,
  products: P[],
  categories: CategoryLike[],
): P[] {
  const [firstCategory] = visibleCategoryIdsOf(product, categories);
  if (!firstCategory) return [];
  return productsInCategory(products, categories, firstCategory)
    .filter((other) => other.id !== product.id)
    .slice(0, MAX_RELATED);
}
