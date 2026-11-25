import { describe, expect, it } from 'vitest';
import {
  availableProducts,
  compareProducts,
  featuredProducts,
  listedProducts,
  productsInCategory,
  relatedProducts,
  isSortKey,
  sortByOrder,
  sortProducts,
  SORT_KEYS,
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

describe('sortProducts', () => {
  const day = (iso: string) => new Date(iso);
  const items = [
    product('a', ['art'], {
      name: 'A',
      order: 30,
      price: 50,
      popularity: 10,
      added: day('2026-10-01'),
    }),
    product('b', ['art'], {
      name: 'B',
      order: 10,
      price: 30,
      popularity: 90,
      added: day('2026-11-15'),
    }),
    product('c', ['art'], { name: 'C', order: 20, popularity: 90 }),
    product('d', ['art'], {
      name: 'D',
      order: 40,
      price: 30,
      popularity: 0,
      added: day('2026-11-15'),
    }),
  ];

  it('knows the sort keys', () => {
    expect(SORT_KEYS).toHaveLength(5);
    expect(isSortKey('popular')).toBe(true);
    expect(isSortKey('cheapest')).toBe(false);
    expect(isSortKey(undefined)).toBe(false);
  });

  it('recommended = order, then name', () => {
    expect(ids(sortProducts(items, 'recommended'))).toEqual(['b', 'c', 'a', 'd']);
  });

  it('price ascending, missing price last, ties by order', () => {
    expect(ids(sortProducts(items, 'price-asc'))).toEqual(['b', 'd', 'a', 'c']);
  });

  it('price descending, missing price last', () => {
    expect(ids(sortProducts(items, 'price-desc'))).toEqual(['a', 'b', 'd', 'c']);
  });

  it('popular: highest first, then order', () => {
    expect(ids(sortProducts(items, 'popular'))).toEqual(['b', 'c', 'a', 'd']);
  });

  it('newest: latest first, missing date last, ties by order', () => {
    expect(ids(sortProducts(items, 'newest'))).toEqual(['b', 'd', 'a', 'c']);
  });

  it('does not change the input', () => {
    const before = ids(items);
    sortProducts(items, 'price-desc');
    expect(ids(items)).toEqual(before);
  });
});

describe('compareProducts', () => {
  // The browser sorts with this comparator, so it must give the same order as sortProducts
  const rows = [
    { name: 'A', order: 30, price: 50, popularity: 10, added: Date.parse('2026-10-01') },
    { name: 'B', order: 10, price: 30, popularity: 90, added: Date.parse('2026-11-15') },
    { name: 'C', order: 20, popularity: 90 },
    { name: 'D', order: 40, price: 30, popularity: 0, added: Date.parse('2026-11-15') },
  ];
  const names = (key: (typeof SORT_KEYS)[number]) =>
    [...rows].sort(compareProducts(key)).map((row) => row.name);

  it('matches sortProducts for every key', () => {
    const items = rows.map((row) =>
      product(row.name, ['art'], {
        name: row.name,
        order: row.order,
        price: row.price,
        popularity: row.popularity,
        added: row.added === undefined ? undefined : new Date(row.added),
      }),
    );
    for (const key of SORT_KEYS) {
      expect(names(key)).toEqual(sortProducts(items, key).map((item) => item.id));
    }
  });

  it('breaks ties by order, then name', () => {
    expect(names('price-asc')).toEqual(['B', 'D', 'A', 'C']);
    const same = [
      { name: 'Z', order: 5 },
      { name: 'A', order: 5 },
    ];
    expect(same.sort(compareProducts('recommended')).map((row) => row.name)).toEqual(['A', 'Z']);
  });
});
