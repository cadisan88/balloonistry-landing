/**
 * Business info, channel links and navigation.
 * This is the only place for phone numbers, addresses and channel URLs.
 * Everything else imports from here.
 */

export interface NavLink {
  label: string;
  href: string;
}

export interface NavGroup {
  label: string;
  /** Used for the id of the submenu element. */
  id: string;
  children: NavLink[];
}

export type NavItem = NavLink | NavGroup;

export function isNavGroup(item: NavItem): item is NavGroup {
  return 'children' in item;
}

const phoneE164 = '+12269786720';
/** wa.me wants the number without the plus sign. */
const phoneDigits = phoneE164.replace(/\D/g, '');
const instagramUser = 'theballoonistry';
/** The Facebook page has no username yet. When it gets one, put it here. */
const facebookPageId = '61583352010917';

export const site = {
  name: 'Balloonistry',
  tagline: 'Your story, inside every bubble.',
  url: 'https://www.balloonistry.ca',
  locale: 'en-CA',

  phone: {
    display: '226-978-6720',
    e164: phoneE164,
  },
  email: 'balloonistry@outlook.com',
  address: {
    street: '233 Red Clover Court',
    city: 'Kitchener',
    region: 'Ontario',
    regionCode: 'ON',
    country: 'CA',
  },
  /** A plain Google Maps link (no embedded map). */
  mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    '233 Red Clover Court, Kitchener, Ontario',
  )}`,
  /** TODO: business hours are not known yet. See docs/TODO.md. */
  hours: null as string | null,

  social: {
    instagram: `https://www.instagram.com/${instagramUser}/`,
    facebook: `https://www.facebook.com/profile.php?id=${facebookPageId}`,
  },

  /**
   * Base links for each ordering channel, in display order (the form comes after these).
   * src/lib/channels.ts adds the pre-filled message to WhatsApp and SMS.
   */
  channels: {
    whatsapp: `https://wa.me/${phoneDigits}`,
    sms: `sms:${phoneE164}`,
    phone: `tel:${phoneE164}`,
    instagram: `https://ig.me/m/${instagramUser}`,
  },

  nav: [
    { label: 'Shop', href: '/shop/' },
    { label: 'Events', href: '/events/' },
    { label: 'Corporate', href: '/corporate/' },
    { label: 'FAQ', href: '/faq/' },
    { label: 'About', href: '/about/' },
    { label: 'Contact', href: '/contact/' },
  ] satisfies NavItem[] as NavItem[],

  footer: {
    explore: [
      { label: 'Event decor', href: '/events/' },
      { label: 'Corporate events', href: '/corporate/' },
    ] satisfies NavLink[] as NavLink[],
    policies: [
      { label: 'Shipping & Pickup Policy', href: '/policies/shipping-pickup/' },
      { label: 'Refund & Cancellation Policy', href: '/policies/refund-cancellation/' },
      { label: 'Terms & Conditions', href: '/policies/terms/' },
      { label: 'Privacy Policy', href: '/policies/privacy/' },
      { label: 'Accessibility Statement', href: '/policies/accessibility/' },
    ] satisfies NavLink[] as NavLink[],
  },
};

export type Site = typeof site;
