/**
 * The quote list in the browser (docs/REDESIGN.md section 5). The pure logic is in src/lib/quote.ts.
 *
 * - The list lives in localStorage under `balloonistry.quote.v1`. Every access is in try/catch.
 *   When storage is missing or blocked, the list lives in memory for this page view.
 * - What is read from storage is checked with Zod (parseStoredList). Bad data gives an empty list.
 * - Every `[data-quote-count]` shows the number of lines, and the header button label follows.
 * - A change sends the `quote:change` event on `document`. Other tabs are kept in sync.
 * - A click on `[data-quote-add]` adds the product. The attributes it reads are listed in
 *   src/lib/tracking.ts and in readAddButton() below.
 */
import {
  addItem,
  clampQty,
  parseStoredList,
  quoteOptionsSchema,
  removeItem,
  setQty,
  type NewQuoteItem,
  type QuoteItem,
} from '../lib/quote';
import { showToast } from './toast';

export const QUOTE_STORAGE_KEY = 'balloonistry.quote.v1';
export const QUOTE_CHANGE_EVENT = 'quote:change';

export interface QuoteChangeDetail {
  items: QuoteItem[];
}

let items: QuoteItem[] = [];

/** The list from storage. Undefined when storage cannot be read. */
function readStorage(): QuoteItem[] | undefined {
  try {
    return parseStoredList(window.localStorage.getItem(QUOTE_STORAGE_KEY));
  } catch {
    return undefined;
  }
}

function writeStorage(list: QuoteItem[]): void {
  try {
    window.localStorage.setItem(QUOTE_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // No storage: the list stays in memory
  }
}

export function getItems(): QuoteItem[] {
  return items;
}

function renderCount(): void {
  const count = items.length;
  const label = `Quote list, ${count} ${count === 1 ? 'item' : 'items'}`;
  for (const element of document.querySelectorAll<HTMLElement>('[data-quote-count]')) {
    element.textContent = String(count);
    element.setAttribute('data-quote-count', String(count));
    element.closest('[data-quote-open]')?.setAttribute('aria-label', label);
  }
  // The quote_list_opened event reads the number of lines from the button
  for (const button of document.querySelectorAll<HTMLElement>('[data-quote-open]')) {
    button.setAttribute('data-items', String(count));
  }
}

function publish(): void {
  renderCount();
  document.dispatchEvent(
    new CustomEvent<QuoteChangeDetail>(QUOTE_CHANGE_EVENT, { detail: { items } }),
  );
}

/** Applies a change to the newest list (another tab may have changed it) and saves it. */
function update(change: (list: QuoteItem[]) => QuoteItem[]): boolean {
  const current = readStorage() ?? items;
  const next = change(current);
  // The pure functions return the same list when nothing changed (for example a full list)
  if (next === current) return false;
  items = next;
  writeStorage(items);
  publish();
  return true;
}

/** false when the list is full and the item could not be added. */
export function addToQuote(input: NewQuoteItem): boolean {
  return update((list) => addItem(list, input));
}

export function removeFromQuote(key: string): void {
  update((list) => removeItem(list, key));
}

export function changeQty(key: string, qty: number): void {
  update((list) => setQty(list, key, qty));
}

function numberOrUndefined(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

/**
 * The item described by a `[data-quote-add]` button:
 * data-product (id), data-product-name, data-product-url, data-product-image (optional),
 * data-base-price (optional), data-qty, data-quote-options (JSON list of group, choice, price).
 */
function readAddButton(button: HTMLElement): NewQuoteItem | undefined {
  const { product, productName, productUrl, productImage, basePrice, qty, quoteOptions } =
    button.dataset;
  if (!product || !productName || !productUrl?.startsWith('/')) return undefined;

  let options: NewQuoteItem['options'] = [];
  try {
    const parsed = quoteOptionsSchema.safeParse(JSON.parse(quoteOptions ?? '[]'));
    if (parsed.success) options = parsed.data;
  } catch {
    // Bad attribute: add the product without options
  }

  return {
    productId: product,
    name: productName,
    url: productUrl,
    basePrice: numberOrUndefined(basePrice),
    image: productImage?.startsWith('/') ? productImage : undefined,
    options,
    qty: clampQty(Number(qty ?? 1)),
  };
}

export function initQuote(): void {
  items = readStorage() ?? [];
  renderCount();

  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLElement>('[data-quote-add]');
    if (!button) return;
    const item = readAddButton(button);
    if (!item) return;
    if (addToQuote(item)) {
      showToast('Added to your quote list', {
        label: 'View list',
        // The same attributes as the header button: analytics and the drawer both read them
        attributes: { 'data-quote-open': '', 'data-items': String(items.length) },
      });
    } else {
      showToast('Your quote list is full. Send it first, or remove an item.');
    }
  });

  // Another tab changed the list
  window.addEventListener('storage', (event) => {
    if (event.key !== null && event.key !== QUOTE_STORAGE_KEY) return;
    items = parseStoredList(event.key === null ? null : event.newValue);
    publish();
  });

  // Back/forward cache: the list may have changed on another page
  window.addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    items = readStorage() ?? items;
    publish();
  });
}
