import { describe, expect, it, vi } from 'vitest';
import { createAnalytics } from '../src/lib/analytics';
import {
  eventFromDataset,
  pageTypeOf,
  productViewFromDataset,
  quoteSentFromDataset,
  sortChangedEvent,
} from '../src/lib/tracking';

describe('createAnalytics', () => {
  it('does nothing without a key (the default)', () => {
    const analytics = createAnalytics();
    const capture = vi.fn();
    analytics.track('quote_cta_clicked', { location: 'home' });
    analytics.attach({ capture });
    expect(capture).not.toHaveBeenCalled();
  });

  it('queues events while PostHog loads, then sends them in order', () => {
    const analytics = createAnalytics();
    const capture = vi.fn();
    analytics.expect();
    analytics.track('quote_cta_clicked', { location: 'home' });
    analytics.track('form_started', { form_type: 'contact' });
    analytics.attach({ capture });
    expect(capture.mock.calls).toEqual([
      ['quote_cta_clicked', { location: 'home' }],
      ['form_started', { form_type: 'contact' }],
    ]);
  });

  it('sends right away once PostHog is ready, without undefined values', () => {
    const analytics = createAnalytics();
    const capture = vi.fn();
    analytics.expect();
    analytics.attach({ capture });
    analytics.track('order_channel_clicked', {
      channel: 'sms',
      location: 'footer',
      product: undefined,
    });
    expect(capture).toHaveBeenCalledWith('order_channel_clicked', {
      channel: 'sms',
      location: 'footer',
    });
  });

  it('drops the queue when PostHog cannot load', () => {
    const analytics = createAnalytics();
    const capture = vi.fn();
    analytics.expect();
    analytics.track('quote_cta_clicked', { location: 'home' });
    analytics.fail();
    analytics.track('quote_cta_clicked', { location: 'events' });
    analytics.attach({ capture });
    expect(capture).not.toHaveBeenCalled();
  });

  it('keeps at most 50 queued events', () => {
    const analytics = createAnalytics();
    const capture = vi.fn();
    analytics.expect();
    for (let i = 0; i < 60; i += 1) analytics.track('quote_cta_clicked', { location: `${i}` });
    analytics.attach({ capture });
    expect(capture).toHaveBeenCalledTimes(50);
  });
});

describe('eventFromDataset', () => {
  it('reads a product card click', () => {
    expect(
      eventFromDataset({ productCard: '', product: 'cloud-balloon', list: 'shop', position: '3' }),
    ).toEqual({
      event: 'product_card_clicked',
      properties: { product: 'cloud-balloon', list: 'shop', position: 3 },
    });
  });

  it('reads a category click', () => {
    expect(
      eventFromDataset({ categoryLink: '', category: 'structures', location: 'home' }),
    ).toEqual({
      event: 'category_clicked',
      properties: { category: 'structures', location: 'home' },
    });
  });

  it('reads a channel click, with and without a product', () => {
    expect(
      eventFromDataset({ channel: 'whatsapp', channelLocation: 'product_panel', product: 'x' }),
    ).toEqual({
      event: 'order_channel_clicked',
      properties: { channel: 'whatsapp', location: 'product_panel', product: 'x' },
    });
    expect(eventFromDataset({ channel: 'phone', channelLocation: 'footer' })).toEqual({
      event: 'order_channel_clicked',
      properties: { channel: 'phone', location: 'footer', product: undefined },
    });
  });

  it('reads a quote button click', () => {
    expect(eventFromDataset({ quoteCta: '', location: 'events' })).toEqual({
      event: 'quote_cta_clicked',
      properties: { location: 'events' },
    });
  });

  it('sends nothing for unknown values or plain links', () => {
    expect(eventFromDataset({ channel: 'fax', channelLocation: 'footer' })).toBeUndefined();
    expect(eventFromDataset({ channel: 'sms', channelLocation: 'moon' })).toBeUndefined();
    expect(
      eventFromDataset({ productCard: '', product: 'x', list: 'other', position: '1' }),
    ).toBeUndefined();
    expect(
      eventFromDataset({ categoryLink: '', category: 'x', location: 'footer' }),
    ).toBeUndefined();
    expect(eventFromDataset({})).toBeUndefined();
  });
});

describe('quote and media events', () => {
  it('reads quote_item_added', () => {
    expect(
      eventFromDataset({
        quoteAdd: '',
        product: 'balloon-centerpiece',
        qty: '2',
        options: '2',
        unitPrice: '75',
        quoteLocation: 'product_page',
      }),
    ).toEqual({
      event: 'quote_item_added',
      properties: {
        product: 'balloon-centerpiece',
        qty: 2,
        options: 2,
        unit_price: 75,
        location: 'product_page',
      },
    });
    expect(
      eventFromDataset({ quoteAdd: '', product: 'x', qty: '0', quoteLocation: 'product_card' }),
    ).toBeUndefined();
    expect(
      eventFromDataset({ quoteAdd: '', product: 'x', qty: '1', quoteLocation: 'moon' }),
    ).toBeUndefined();
  });

  it('reads quote_list_opened and media_opened', () => {
    expect(eventFromDataset({ quoteOpen: '', items: '3' })).toEqual({
      event: 'quote_list_opened',
      properties: { items: 3 },
    });
    expect(
      eventFromDataset({ mediaOpen: '', product: 'x', mediaKind: 'video', mediaLocation: 'home' }),
    ).toEqual({
      event: 'media_opened',
      properties: { product: 'x', kind: 'video', location: 'home' },
    });
    expect(
      eventFromDataset({ mediaOpen: '', product: 'x', mediaKind: 'gif', mediaLocation: 'home' }),
    ).toBeUndefined();
  });

  it('reads quote_sent from a drawer channel button', () => {
    expect(
      quoteSentFromDataset({ quoteSend: '', channel: 'sms', items: '2', estimatedTotal: '150' }),
    ).toEqual({
      event: 'quote_sent',
      properties: { channel: 'sms', items: 2, estimated_total: 150 },
    });
    expect(quoteSentFromDataset({ quoteSend: '', channel: 'form', items: '2' })).toBeUndefined();
    expect(quoteSentFromDataset({ channel: 'sms', items: '2' })).toBeUndefined();
  });

  it('reads sort_changed', () => {
    expect(sortChangedEvent('price-asc', 'shop')).toEqual({
      event: 'sort_changed',
      properties: { sort: 'price-asc', location: 'shop' },
    });
    expect(sortChangedEvent('cheapest', 'shop')).toBeUndefined();
    expect(sortChangedEvent('newest', 'home')).toBeUndefined();
  });

  it('accepts the new channel locations and the corporate page type', () => {
    expect(
      eventFromDataset({ channel: 'whatsapp', channelLocation: 'quote_drawer' }),
    ).toBeDefined();
    expect(eventFromDataset({ channel: 'instagram', channelLocation: 'corporate' })).toBeDefined();
    expect(eventFromDataset({ channel: 'messenger', channelLocation: 'footer' })).toBeUndefined();
    expect(pageTypeOf('corporate')).toBe('corporate');
  });
});

describe('productViewFromDataset', () => {
  it('reads the product, price and categories', () => {
    expect(
      productViewFromDataset({ product: 'hot-air-balloon', price: '75', categories: 'a,b' }),
    ).toEqual({
      event: 'product_viewed',
      properties: { product: 'hot-air-balloon', price: 75, categories: ['a', 'b'] },
    });
  });

  it('leaves the price out for "Request a quote" products', () => {
    expect(productViewFromDataset({ product: 'x', categories: '' })).toEqual({
      event: 'product_viewed',
      properties: { product: 'x', price: undefined, categories: [] },
    });
  });
});

describe('pageTypeOf', () => {
  it('accepts only the known page types', () => {
    expect(pageTypeOf('product')).toBe('product');
    expect(pageTypeOf('admin')).toBeUndefined();
  });
});
