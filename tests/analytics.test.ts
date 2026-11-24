import { describe, expect, it, vi } from 'vitest';
import { createAnalytics } from '../src/lib/analytics';
import { eventFromDataset, pageTypeOf, productViewFromDataset } from '../src/lib/tracking';

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
