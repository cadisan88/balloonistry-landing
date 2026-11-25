/**
 * Ordering channels (docs/SPEC.md section 7): pre-filled messages and channel links.
 * The base links come from src/config/site.ts.
 */
import { site } from '../config/site';

export const CHANNELS = ['whatsapp', 'instagram', 'sms', 'phone', 'form'] as const;
export type Channel = (typeof CHANNELS)[number];

/** Where a channel button is shown. Sent with the `order_channel_clicked` event. */
export type ChannelLocation =
  | 'product_panel'
  | 'channel_sheet'
  | 'contact_section'
  | 'footer'
  | 'events'
  | 'category_empty'
  | 'quote_drawer'
  | 'corporate';

export interface ProductRef {
  id: string;
  name: string;
}

/** Full URL of a product page, for the message. */
export function productUrl(productId: string): string {
  return new URL(`/products/${productId}/`, site.url).href;
}

/** The pre-filled message: about a product, or a general question. */
export function buildMessage(product?: ProductRef): string {
  if (!product) return `Hi ${site.name}! I have a question:`;
  return [
    `Hi ${site.name}! I'd like to order the ${product.name} (${productUrl(product.id)}).`,
    'Date: ',
    'Colours / theme: ',
    'Pickup or delivery: ',
  ].join('\n');
}

export function whatsappLink(message: string): string {
  return `${site.channels.whatsapp}?text=${encodeURIComponent(message)}`;
}

/** "?&body=" works on both iPhone and Android. */
export function smsLink(message: string): string {
  return `${site.channels.sms}?&body=${encodeURIComponent(message)}`;
}

export interface ChannelLinks {
  whatsapp: string;
  sms: string;
  phone: string;
  instagram: string;
}

/** WhatsApp and SMS carry the message. Phone and Instagram cannot. */
export function channelLinks(message: string): ChannelLinks {
  return {
    whatsapp: whatsappLink(message),
    sms: smsLink(message),
    phone: site.channels.phone,
    instagram: site.channels.instagram,
  };
}
