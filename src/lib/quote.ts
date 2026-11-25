/**
 * Quote list logic (docs/REDESIGN.md section 5). Pure functions, no DOM, no storage.
 * The browser glue in src/scripts/quote.ts keeps the list in localStorage.
 * Every function returns a new list and never changes its input.
 */
import { z } from 'astro/zod';
import { site } from '../config/site';
import { formatInquiryDate } from './inquiry';
import { formatAmount } from './price';

export const MIN_QTY = 1;
export const MAX_QTY = 20;
export const MAX_ITEMS = 50;

export interface QuoteOption {
  group: string;
  choice: string;
  price: number;
}

export interface QuoteItem {
  /** Same product + same options = same key. */
  key: string;
  productId: string;
  name: string;
  /** Path of the product page, for example `/products/hot-air-balloon/`. */
  url: string;
  basePrice?: number | undefined;
  /** Thumbnail path for the quote list, for example `/_astro/hot-air.abc123.webp`. */
  image?: string | undefined;
  options: QuoteOption[];
  qty: number;
}

/** What the page passes to `addItem`: a QuoteItem without a key. `qty` defaults to 1. */
export type NewQuoteItem = Omit<QuoteItem, 'key' | 'qty'> & { qty?: number };

const optionSchema = z.object({
  group: z.string().min(1).max(40),
  choice: z.string().min(1).max(60),
  price: z.number().nonnegative(),
});

/** The chosen options of one item, for example read from a data attribute. */
export const quoteOptionsSchema = z.array(optionSchema).max(40);

const itemSchema = z.object({
  key: z.string().min(1).max(1000),
  productId: z.string().min(1).max(100),
  name: z.string().min(1).max(80),
  url: z.string().startsWith('/').max(300),
  basePrice: z.number().positive().optional(),
  image: z.string().startsWith('/').max(500).optional(),
  options: quoteOptionsSchema,
  qty: z.number().int().min(MIN_QTY).max(MAX_QTY),
});

/** The shape of the list in localStorage. */
export const storedListSchema = z.array(itemSchema).max(MAX_ITEMS);

export function clampQty(qty: number): number {
  if (!Number.isFinite(qty)) return MIN_QTY;
  return Math.min(MAX_QTY, Math.max(MIN_QTY, Math.round(qty)));
}

function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

/** A stable key: the product and its chosen options, in any order. */
export function itemKey(productId: string, options: QuoteOption[]): string {
  const parts = options.map((option) => `${option.group}=${option.choice}`).sort();
  return [productId, ...parts].join('|');
}

/** Adds an item. The same product with the same options is merged: the quantities add up. */
export function addItem(items: QuoteItem[], input: NewQuoteItem): QuoteItem[] {
  const key = itemKey(input.productId, input.options);
  const qty = clampQty(input.qty ?? 1);
  if (items.some((item) => item.key === key)) {
    return items.map((item) =>
      item.key === key ? { ...item, qty: clampQty(item.qty + qty) } : item,
    );
  }
  if (items.length >= MAX_ITEMS) return items;
  return [...items, { ...input, key, qty }];
}

export function removeItem(items: QuoteItem[], key: string): QuoteItem[] {
  return items.filter((item) => item.key !== key);
}

/** Sets the quantity, clamped to 1-20. */
export function setQty(items: QuoteItem[], key: string, qty: number): QuoteItem[] {
  return items.map((item) => (item.key === key ? { ...item, qty: clampQty(qty) } : item));
}

/** Price of one unit: base price plus the chosen options. Undefined without a base price. */
export function unitPrice(item: QuoteItem): number | undefined {
  if (item.basePrice === undefined) return undefined;
  const extras = item.options.reduce((sum, option) => sum + option.price, 0);
  return roundCents(item.basePrice + extras);
}

/** Sum of every item. Undefined when any item has no base price (or the list is empty). */
export function estimatedTotal(items: QuoteItem[]): number | undefined {
  if (items.length === 0) return undefined;
  let total = 0;
  for (const item of items) {
    const unit = unitPrice(item);
    if (unit === undefined) return undefined;
    total += unit * item.qty;
  }
  return roundCents(total);
}

/** Reads the stored text. Bad JSON or a list that does not match the schema gives an empty list. */
export function parseStoredList(raw: string | null): QuoteItem[] {
  if (!raw) return [];
  try {
    const result = storedListSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}

export interface QuoteDetails {
  /** ISO date (YYYY-MM-DD) from a date input. */
  date?: string | undefined;
  delivery?: 'pickup' | 'delivery' | undefined;
  city?: string | undefined;
  notes?: string | undefined;
}

/** The optional fields of the quote drawer. They stay in the browser and are never sent anywhere. */
export const quoteDetailsSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  delivery: z.enum(['pickup', 'delivery']).optional(),
  city: z.string().max(80).optional(),
  notes: z.string().max(1000).optional(),
});

/** Reads the stored details. Bad JSON or a wrong shape gives empty details. */
export function parseStoredDetails(raw: string | null): QuoteDetails {
  if (!raw) return {};
  try {
    const result = quoteDetailsSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : {};
  } catch {
    return {};
  }
}

/** "Flowers: Natural fresh flowers" lines, one per group, in the order the groups first appear. */
export function optionLines(options: QuoteOption[]): string[] {
  const groups = new Map<string, string[]>();
  for (const option of options) {
    groups.set(option.group, [...(groups.get(option.group) ?? []), option.choice]);
  }
  return [...groups].map(([group, choices]) => `${group}: ${choices.join(', ')}`);
}

/**
 * The plain-text quote request. Lines with nothing filled are left out.
 * An empty list gives an empty string.
 */
export function buildQuoteMessage(
  items: QuoteItem[],
  details: QuoteDetails,
  siteUrl: string = site.url,
): string {
  if (items.length === 0) return '';
  const lines: string[] = [`Hi ${site.name}! I would like a quote for:`, ''];

  items.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.name}${item.qty > 1 ? ` x${item.qty}` : ''}`);
    for (const line of optionLines(item.options)) lines.push(`   ${line}`);
    const unit = unitPrice(item);
    if (unit !== undefined) {
      lines.push(`   Estimated from ${formatAmount(unit)}${item.qty > 1 ? ' each' : ''}`);
    }
    lines.push(`   ${new URL(item.url, siteUrl).href}`, '');
  });

  const total = estimatedTotal(items);
  if (total !== undefined) lines.push(`Estimated total: from ${formatAmount(total)}`);

  const date = details.date?.trim();
  if (date) lines.push(`Date: ${formatInquiryDate(date)}`);

  const city = details.city?.trim();
  if (details.delivery === 'pickup') {
    lines.push('Pickup or delivery: Pickup');
  } else if (details.delivery === 'delivery') {
    lines.push(`Pickup or delivery: ${city ? `Delivery to ${city}` : 'Delivery'}`);
  }

  const notes = details.notes?.trim();
  if (notes) lines.push(`Notes: ${notes}`);

  return lines.join('\n').trimEnd();
}
