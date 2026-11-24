/**
 * Turns the data attributes on links into analytics events.
 * Pure functions on a plain dataset object, so they are easy to test.
 * Unknown or missing values give no event: nothing unexpected is ever sent.
 */
import {
  CATEGORY_LOCATIONS,
  PAGE_TYPES,
  PRODUCT_LISTS,
  type AnalyticsEvent,
  type AnalyticsEvents,
  type PageType,
} from './analytics';
import { CHANNELS, type ChannelLocation } from './channels';

export type Dataset = Record<string, string | undefined>;

const CHANNEL_LOCATIONS: readonly ChannelLocation[] = [
  'product_panel',
  'channel_sheet',
  'contact_section',
  'footer',
  'events',
  'category_empty',
];

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
  const price = data.price ? Number(data.price) : undefined;
  return {
    event: 'product_viewed',
    properties: {
      product: data.product,
      price: price !== undefined && Number.isFinite(price) ? price : undefined,
      categories: (data.categories ?? '').split(',').filter(Boolean),
    },
  };
}

export function pageTypeOf(value: string | undefined): PageType | undefined {
  return oneOf(PAGE_TYPES, value);
}
