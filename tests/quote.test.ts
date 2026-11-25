import { describe, expect, it } from 'vitest';
import {
  addItem,
  buildQuoteMessage,
  estimatedTotal,
  itemKey,
  parseStoredDetails,
  parseStoredList,
  removeItem,
  setQty,
  unitPrice,
  type NewQuoteItem,
  type QuoteItem,
} from '../src/lib/quote';

const flowers = { group: 'Flowers', choice: 'Natural fresh flowers', price: 15 };
const chocolates = { group: 'Add-ons', choice: 'Chocolates', price: 10 };

const centerpiece = (extra: Partial<NewQuoteItem> = {}): NewQuoteItem => ({
  productId: 'balloon-centerpiece',
  name: 'Balloon Centerpiece',
  url: '/products/balloon-centerpiece/',
  basePrice: 50,
  options: [],
  ...extra,
});

describe('itemKey', () => {
  it('is the same for the same options in any order', () => {
    expect(itemKey('x', [flowers, chocolates])).toBe(itemKey('x', [chocolates, flowers]));
  });
  it('differs for other options or products', () => {
    expect(itemKey('x', [flowers])).not.toBe(itemKey('x', []));
    expect(itemKey('x', [])).not.toBe(itemKey('y', []));
  });
});

describe('addItem', () => {
  it('adds a new item with quantity 1 by default', () => {
    const list = addItem([], centerpiece());
    expect(list).toHaveLength(1);
    expect(list[0]?.qty).toBe(1);
    expect(list[0]?.key).toBe('balloon-centerpiece');
  });

  it('merges the same product and options by key', () => {
    let list = addItem([], centerpiece({ options: [flowers, chocolates], qty: 2 }));
    list = addItem(list, centerpiece({ options: [chocolates, flowers] }));
    expect(list).toHaveLength(1);
    expect(list[0]?.qty).toBe(3);
  });

  it('keeps different options as separate lines', () => {
    const list = addItem(addItem([], centerpiece()), centerpiece({ options: [flowers] }));
    expect(list).toHaveLength(2);
  });

  it('clamps the merged quantity to 20', () => {
    let list = addItem([], centerpiece({ qty: 15 }));
    list = addItem(list, centerpiece({ qty: 15 }));
    expect(list[0]?.qty).toBe(20);
  });

  it('does not change the input list', () => {
    const list = addItem([], centerpiece());
    addItem(list, centerpiece());
    expect(list[0]?.qty).toBe(1);
  });
});

describe('setQty and removeItem', () => {
  const list = addItem(addItem([], centerpiece()), centerpiece({ options: [flowers] }));
  const key = list[0]?.key ?? '';

  it('clamps the quantity to 1-20', () => {
    expect(setQty(list, key, 0)[0]?.qty).toBe(1);
    expect(setQty(list, key, -4)[0]?.qty).toBe(1);
    expect(setQty(list, key, 99)[0]?.qty).toBe(20);
    expect(setQty(list, key, 7)[0]?.qty).toBe(7);
    expect(setQty(list, key, Number.NaN)[0]?.qty).toBe(1);
  });

  it('leaves other lines alone', () => {
    expect(setQty(list, key, 5)[1]?.qty).toBe(1);
  });

  it('removes a line by key', () => {
    expect(removeItem(list, key)).toHaveLength(1);
    expect(removeItem(list, 'nope')).toHaveLength(2);
  });
});

describe('prices', () => {
  const withOptions = addItem(
    [],
    centerpiece({ options: [flowers, chocolates], qty: 2 }),
  )[0] as QuoteItem;

  it('unitPrice adds the options to the base price', () => {
    expect(unitPrice(withOptions)).toBe(75);
  });

  it('unitPrice is undefined without a base price', () => {
    const item = addItem([], centerpiece({ basePrice: undefined }))[0] as QuoteItem;
    expect(unitPrice(item)).toBeUndefined();
  });

  it('estimatedTotal multiplies by quantity', () => {
    expect(estimatedTotal([withOptions])).toBe(150);
  });

  it('estimatedTotal is undefined when any item has no price, or the list is empty', () => {
    const noPrice = addItem(
      [],
      centerpiece({ productId: 'q', basePrice: undefined }),
    )[0] as QuoteItem;
    expect(estimatedTotal([withOptions, noPrice])).toBeUndefined();
    expect(estimatedTotal([])).toBeUndefined();
  });
});

describe('parseStoredList', () => {
  it('reads a valid list', () => {
    const list = addItem([], centerpiece({ options: [flowers] }));
    expect(parseStoredList(JSON.stringify(list))).toEqual(list);
  });

  it('gives an empty list for bad input', () => {
    expect(parseStoredList(null)).toEqual([]);
    expect(parseStoredList('')).toEqual([]);
    expect(parseStoredList('{not json')).toEqual([]);
    expect(parseStoredList('{"a":1}')).toEqual([]);
    expect(parseStoredList('[{"key":"x"}]')).toEqual([]);
    const tooMany = [{ ...addItem([], centerpiece())[0], qty: 99 }];
    expect(parseStoredList(JSON.stringify(tooMany))).toEqual([]);
  });
});

describe('buildQuoteMessage', () => {
  const list = addItem([], centerpiece({ options: [flowers, chocolates], qty: 2 }));
  const siteUrl = 'https://www.balloonistry.ca';
  const itemLines = [
    'Hi Balloonistry! I would like a quote for:',
    '',
    '1. Balloon Centerpiece x2',
    '   Flowers: Natural fresh flowers',
    '   Add-ons: Chocolates',
    '   Estimated from $75 each',
    '   https://www.balloonistry.ca/products/balloon-centerpiece/',
    '',
    'Estimated total: from $150',
  ];

  it('builds the spec example', () => {
    const message = buildQuoteMessage(
      list,
      { date: '2026-12-12', delivery: 'delivery', city: 'Waterloo', notes: 'Gold and white' },
      siteUrl,
    );
    expect(message).toBe(
      [
        ...itemLines,
        'Date: Saturday, December 12, 2026',
        'Pickup or delivery: Delivery to Waterloo',
        'Notes: Gold and white',
      ].join('\n'),
    );
  });

  it('leaves out empty detail lines', () => {
    expect(buildQuoteMessage(list, {}, siteUrl)).toBe(itemLines.join('\n'));
  });

  it('leaves out price lines when an item has no price, and handles pickup', () => {
    const noPrice = addItem([], centerpiece({ basePrice: undefined }));
    const message = buildQuoteMessage(noPrice, { delivery: 'pickup', city: '  ' }, siteUrl);
    expect(message).not.toContain('Estimated');
    expect(message).toContain('1. Balloon Centerpiece\n');
    expect(message.endsWith('Pickup or delivery: Pickup')).toBe(true);
  });

  it('is empty for an empty list', () => {
    expect(buildQuoteMessage([], {}, siteUrl)).toBe('');
  });
});

describe('item image', () => {
  it('is kept when the list is stored and read back', () => {
    const list = addItem([], centerpiece({ image: '/_astro/centerpiece.abc123.webp' }));
    expect(parseStoredList(JSON.stringify(list))).toEqual(list);
  });

  it('must be a path on this site', () => {
    const list = [{ ...addItem([], centerpiece())[0], image: 'https://example.com/a.webp' }];
    expect(parseStoredList(JSON.stringify(list))).toEqual([]);
  });

  it('is optional', () => {
    expect(addItem([], centerpiece())[0]?.image).toBeUndefined();
  });
});

describe('parseStoredDetails', () => {
  it('reads valid details', () => {
    const details = { date: '2026-12-12', delivery: 'delivery', city: 'Waterloo', notes: 'Hi' };
    expect(parseStoredDetails(JSON.stringify(details))).toEqual(details);
  });

  it('gives empty details for bad input', () => {
    expect(parseStoredDetails(null)).toEqual({});
    expect(parseStoredDetails('{not json')).toEqual({});
    expect(parseStoredDetails('{"delivery":"drone"}')).toEqual({});
    expect(parseStoredDetails('{"date":"tomorrow"}')).toEqual({});
  });
});
