import { describe, expect, it } from 'vitest';
import { buildMessage, channelLinks, productUrl, smsLink, whatsappLink } from '../src/lib/channels';

const product = { id: 'hot-air-balloon', name: 'Hot Air Balloon' };

describe('productUrl', () => {
  it('builds the full URL of the product page', () => {
    expect(productUrl('hot-air-balloon')).toBe(
      'https://www.balloonistry.ca/products/hot-air-balloon/',
    );
  });
});

describe('buildMessage', () => {
  it('builds the product message from the spec', () => {
    expect(buildMessage(product)).toBe(
      "Hi Balloonistry! I'd like to order the Hot Air Balloon " +
        '(https://www.balloonistry.ca/products/hot-air-balloon/).\n' +
        'Date: \n' +
        'Colours / theme: \n' +
        'Pickup or delivery: ',
    );
  });

  it('starts a general message with a question', () => {
    expect(buildMessage()).toBe('Hi Balloonistry! I have a question:');
  });
});

describe('channel links', () => {
  const message = buildMessage(product);

  it('adds the encoded message to WhatsApp', () => {
    const link = whatsappLink(message);
    expect(link.startsWith('https://wa.me/12269786720?text=')).toBe(true);
    expect(decodeURIComponent(link.split('?text=')[1] ?? '')).toBe(message);
  });

  it('encodes new lines, spaces and the apostrophe safely', () => {
    const link = whatsappLink(message);
    expect(link).toContain('%0A');
    expect(link).not.toMatch(/[\s\n]/);
  });

  it('adds the encoded message to SMS with "?&body="', () => {
    const link = smsLink(message);
    expect(link.startsWith('sms:+12269786720?&body=')).toBe(true);
    expect(decodeURIComponent(link.split('?&body=')[1] ?? '')).toBe(message);
  });

  it('keeps phone and Instagram links without a message', () => {
    const links = channelLinks(message);
    expect(links.phone).toBe('tel:+12269786720');
    expect(links.instagram).toBe('https://ig.me/m/theballoonistry');
    expect(links).not.toHaveProperty('messenger');
  });
});
