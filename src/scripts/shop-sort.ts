/**
 * The Sort select on Shop and category pages. It reorders the server-rendered grid
 * in the browser, using the same comparator as the build (compareProducts in lib/catalog.ts).
 * The choice stays in the URL as ?sort=, and is applied when the page loads.
 */
import { compareProducts, isSortKey, type SortFields, type SortKey } from '../lib/catalog';
import { sortChangedEvent } from '../lib/tracking';
import { sendTracked } from './tracking';

function numberOrUndefined(value: string | undefined): number | undefined {
  if (value === undefined || value === '') return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function fieldsOf(item: HTMLElement): SortFields {
  const { name = '', order, price, popularity, added } = item.dataset;
  const time = added ? Date.parse(added) : Number.NaN;
  return {
    name,
    order: numberOrUndefined(order) ?? 100,
    price: numberOrUndefined(price),
    popularity: numberOrUndefined(popularity),
    added: Number.isNaN(time) ? undefined : time,
  };
}

export function initShopSort(): void {
  // (instanceof, not a generic: the Workers types clash with HTMLSelectElement.remove)
  const select = document.querySelector('[data-sort-select]');
  const grid = document.querySelector<HTMLElement>('[data-product-grid]');
  if (!(select instanceof HTMLSelectElement) || !grid) return;

  const apply = (key: SortKey) => {
    const compare = compareProducts(key);
    const items = [...grid.children].filter(
      (child): child is HTMLElement => child instanceof HTMLElement,
    );
    const sorted = items
      .map((item) => ({ item, fields: fieldsOf(item) }))
      .sort((a, b) => compare(a.fields, b.fields))
      .map((entry) => entry.item);
    grid.replaceChildren(...sorted);
    // The position in product_card_clicked follows what the visitor sees
    sorted.forEach((item, index) => {
      item.querySelector('[data-product-card]')?.setAttribute('data-position', String(index + 1));
    });
  };

  const setUrl = (key: SortKey) => {
    const url = new URL(window.location.href);
    if (key === 'recommended') url.searchParams.delete('sort');
    else url.searchParams.set('sort', key);
    window.history.replaceState(window.history.state, '', url);
  };

  // Apply ?sort= on load
  const fromUrl = new URL(window.location.href).searchParams.get('sort');
  if (isSortKey(fromUrl) && fromUrl !== 'recommended') {
    select.value = fromUrl;
    apply(fromUrl);
  }

  select.addEventListener('change', () => {
    if (!isSortKey(select.value)) return;
    apply(select.value);
    setUrl(select.value);
    sendTracked(sortChangedEvent(select.value, select.dataset.location));
  });

  // Back/forward cache: the select may keep its value while the grid was reset
  window.addEventListener('pageshow', (event) => {
    if (event.persisted && isSortKey(select.value)) apply(select.value);
  });
}
