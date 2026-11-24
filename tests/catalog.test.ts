import { describe, expect, it } from 'vitest';
import {
  availableProducts,
  featuredProducts,
  listedProducts,
  productsInCategory,
  relatedProducts,
  sortByOrder,
  visibleCategories,
  visibleCategoryIdsOf,
  type CategoryLike,
  type ProductLike,
} from '../src/lib/catalog';

const category = (id: string, order = 100, visible = true): CategoryLike => ({
  id,
  data: { name: id, order, visible },
});

const product = (
  id: string,
  categories: string[],
  extra: Partial<ProductLike['data']> = {},
): ProductLike => ({
  id,
  data: {
    name: id,
    order: 100,
    available: true,
    featured: false,
    categories: categories.map((categoryId) => ({ id: categoryId })),
    ...extra,
  },
});

const ids = (items: { id: string }[]) => items.map((item) => item.id);

const categories = [category('gifts', 20), category('art', 10), category('seasonal', 30, false)];

describe('sortByOrder', () => {
  it('sorts by order, then by name', () => {
    const items = [
      product('zebra', ['gifts'], { order: 10 }),
      product('banana', ['gifts'], { order: 20 }),
      product('apple', ['gifts'], { order: 20 }),
    ];
    expect(ids(sortByOrder(items))).toEqual(['zebra', 'apple', 'banana']);
  });

  it('does not change the input array', () => {
    const items = [product('b', ['gifts'], { order: 2 }), product('a', ['gifts'], { order: 1 })];
    sortByOrder(items);
    expect(ids(items)).toEqual(['b', 'a']);
  });
});

describe('visibleCategories', () => {
  it('drops hidden categories and sorts the rest', () => {
    expect(ids(visibleCategories(categories))).toEqual(['art', 'gifts']);
  });
});

describe('availableProducts', () => {
  it('drops products with available: false', () => {
    const products = [product('on', ['gifts']), product('off', ['gifts'], { available: false })];
    expect(ids(availableProducts(products))).toEqual(['on']);
  });
});

describe('visibleCategoryIdsOf', () => {
  it('keeps only visible categories, in the order of the product', () => {
    const item = product('p', ['seasonal', 'gifts', 'art']);
    expect(visibleCategoryIdsOf(item, categories)).toEqual(['gifts', 'art']);
  });
});

describe('listedProducts', () => {
  const products = [
    product('visible', ['gifts']),
    product('mixed', ['seasonal', 'art']),
    product('hidden-only', ['seasonal']),
    product('unavailable', ['gifts'], { available: false }),
  ];

  it('lists a product that has at least one visible category', () => {
    expect(ids(listedProducts(products, categories))).toEqual(['mixed', 'visible']);
  });

  it('keeps a product in only hidden categories available, but not listed', () => {
    expect(ids(availableProducts(products))).toContain('hidden-only');
    expect(ids(listedProducts(products, categories))).not.toContain('hidden-only');
  });
});

describe('productsInCategory', () => {
  const products = [
    product('a', ['gifts']),
    product('b', ['art', 'gifts']),
    product('c', ['art']),
    product('d', ['seasonal', 'gifts']),
  ];

  it('returns the listed products of the category', () => {
    expect(ids(productsInCategory(products, categories, 'gifts'))).toEqual(['a', 'b', 'd']);
  });

  it('returns nothing for a hidden category', () => {
    expect(productsInCategory(products, categories, 'seasonal')).toEqual([]);
  });
});

describe('featuredProducts', () => {
  it('returns at most 8 featured products, sorted', () => {
    const products = Array.from({ length: 10 }, (_, i) =>
      product(`p${i}`, ['gifts'], { featured: true, order: 100 - i }),
    );
    const result = featuredProducts(products, categories);
    expect(result).toHaveLength(8);
    expect(result[0]?.id).toBe('p9');
  });

  it('skips products that are not featured or not listed', () => {
    const products = [
      product('plain', ['gifts']),
      product('star', ['gifts'], { featured: true }),
      product('hidden-star', ['seasonal'], { featured: true }),
    ];
    expect(ids(featuredProducts(products, categories))).toEqual(['star']);
  });
});

describe('relatedProducts', () => {
  const products = [
    product('main', ['seasonal', 'gifts', 'art']),
    ...Array.from({ length: 6 }, (_, i) => product(`gift${i}`, ['gifts'])),
    product('art-only', ['art']),
  ];

  it('returns up to 4 other products from the first visible category', () => {
    const main = products[0] as ProductLike;
    const result = ids(relatedProducts(main, products, categories));
    expect(result).toEqual(['gift0', 'gift1', 'gift2', 'gift3']);
  });

  it('returns nothing when the product has no visible category', () => {
    const lonely = product('lonely', ['seasonal']);
    expect(relatedProducts(lonely, [...products, lonely], categories)).toEqual([]);
  });
});
