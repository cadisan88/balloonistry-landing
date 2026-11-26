/**
 * Turns the data attributes on links into analytics events.
 *
 * Data attributes (dataset name in brackets):
 * - data-product-card [productCard] + data-product, data-list, data-position -> product_card_clicked
 * - data-category-link [categoryLink] + data-category, data-location -> category_clicked
 * - data-channel + data-channel-location (+ data-product) -> order_channel_clicked
 * - data-quote-cta [quoteCta] + data-location -> quote_cta_clicked
 * - data-quote-add [quoteAdd] + data-product, data-qty, data-options (number of chosen options),
 *   data-unit-price (optional), data-quote-location (product_page | product_card) -> quote_item_added
 * - data-quote-open [quoteOpen] + data-items (item count) -> quote_list_opened
 * - data-media-open [mediaOpen] + data-product, data-media-kind (image | video),
 *   data-media-location (home | product_page) -> media_opened
 * - data-quote-send [quoteSend] + data-channel (whatsapp | instagram | sms | phone), data-items,
 *   data-estimated-total (optional). Read with quoteSentFromDataset(); the same click also sends
 *   order_channel_clicked through data-channel + data-channel-location="quote_drawer".
 * Sorting is a change event, not a click: use sortChangedEvent().
 * Pure functions on a plain dataset object, so they are easy to test.
 * Unknown or missing values give no event: nothing unexpected is ever sent.
 */
import {
  CATEGORY_LOCATIONS,
  MEDIA_KINDS,
  MEDIA_LOCATIONS,
  PAGE_TYPES,
  PRODUCT_LISTS,
  QUOTE_ADD_LOCATIONS,
  QUOTE_CHANNELS,
  SORT_LOCATIONS,
  type AnalyticsEvent,
  type AnalyticsEvents,
  type PageType,
} from './analytics';
import { isSortKey } from './catalog';
import { CHANNELS, type ChannelLocation } from './channels';

export type Dataset = Record<string, string | undefined>;

const CHANNEL_LOCATIONS: readonly ChannelLocation[] = [
  'product_panel',
  'channel_sheet',
  'contact_section',
  'footer',
  'events',
  'category_empty',
  'quote_drawer',
  'corporate',
];

function numberOrUndefined(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function oneOf<T extends string>(list: readonly T[], value: string | undefined): T | undefined {
  return (list as readonly string[]).includes(value ?? '') ? (value as T) : undefined;
}

export type TrackedEvent = {
  [E in AnalyticsEvent]: { event: E; properties: AnalyticsEvents[E] };
}[AnalyticsEvent];

/** The event for a click on an element with these data attributes, if any. */
export function eventFromDataset(data: Dataset): TrackedEvent | undefined {
  if ('productCard' in data && data.product) {
    const list = oneOf(PRODUCT_LISTS, data.list);
    const position = Number(data.position);
    if (!list || !Number.isInteger(position)) return undefined;
    return { event: 'product_card_clicked', properties: { product: data.product, list, position } };
  }

  if ('categoryLink' in data && data.category) {
    const location = oneOf(CATEGORY_LOCATIONS, data.location);
    if (!location) return undefined;
    return { event: 'category_clicked', properties: { category: data.category, location } };
  }

  if ('quoteAdd' in data && data.product) {
    const location = oneOf(QUOTE_ADD_LOCATIONS, data.quoteLocation);
    const qty = Number(data.qty);
    const options = Number(data.options ?? 0);
    if (!location || !Number.isInteger(qty) || qty < 1 || !Number.isInteger(options)) {
      return undefined;
    }
    return {
      event: 'quote_item_added',
      properties: {
        product: data.product,
        qty,
        options,
        unit_price: numberOrUndefined(data.unitPrice),
        location,
      },
    };
  }

  if ('quoteOpen' in data) {
    const items = Number(data.items ?? 0);
    if (!Number.isInteger(items) || items < 0) return undefined;
    return { event: 'quote_list_opened', properties: { items } };
  }

  if ('mediaOpen' in data && data.product) {
    const kind = oneOf(MEDIA_KINDS, data.mediaKind);
    const location = oneOf(MEDIA_LOCATIONS, data.mediaLocation);
    if (!kind || !location) return undefined;
    return { event: 'media_opened', properties: { product: data.product, kind, location } };
  }

  if (data.channel) {
    const channel = oneOf(CHANNELS, data.channel);
    const location = oneOf(CHANNEL_LOCATIONS, data.channelLocation);
    if (!channel || !location) return undefined;
    return {
      event: 'order_channel_clicked',
      properties: { channel, location, product: data.product || undefined },
    };
  }

  if ('quoteCta' in data && data.location) {
    return { event: 'quote_cta_clicked', properties: { location: data.location } };
  }

  return undefined;
}

/** The product_viewed event from the product page element. */
export function productViewFromDataset(data: Dataset): TrackedEvent | undefined {
  if (!data.product) return undefined;
  return {
    event: 'product_viewed',
    properties: {
      product: data.product,
      price: numberOrUndefined(data.price),
      categories: (data.categories ?? '').split(',').filter(Boolean),
    },
  };
}

export function pageTypeOf(value: string | undefined): PageType | undefined {
  return oneOf(PAGE_TYPES, value);
}

/** The quote_sent event for a click on a channel button of the quote drawer. */
export function quoteSentFromDataset(data: Dataset): TrackedEvent | undefined {
  if (!('quoteSend' in data)) return undefined;
  const channel = oneOf(QUOTE_CHANNELS, data.channel);
  const items = Number(data.items);
  if (!channel || !Number.isInteger(items) || items < 1) return undefined;
  return {
    event: 'quote_sent',
    properties: { channel, items, estimated_total: numberOrUndefined(data.estimatedTotal) },
  };
}

/** The sort_changed event for the value of the Sort select. */
export function sortChangedEvent(
  value: string | undefined,
  location: string | undefined,
): TrackedEvent | undefined {
  const where = oneOf(SORT_LOCATIONS, location);
  if (!isSortKey(value) || !where) return undefined;
  return { event: 'sort_changed', properties: { sort: value, location: where } };
}
