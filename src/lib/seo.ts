/**
 * Meta descriptions and JSON-LD structured data.
 * Plain functions with no Astro imports, so they are easy to test.
 */
import { site } from '../config/site';

/** true for owner text that is still a placeholder. */
export function isPlaceholder(text: string | undefined): boolean {
  return !text || text.trim().startsWith('TODO:');
}

/** The owner's text, or the fallback while the owner's text is still a placeholder. */
export function describe(text: string | undefined, fallback: string): string {
  return isPlaceholder(text) ? fallback : (text ?? '').trim();
}

export function absoluteUrl(path: string): string {
  return new URL(path, site.url).href;
}

type JsonLd = Record<string, unknown>;

/** The business, for the home and contact pages. */
export function localBusinessJsonLd(imageUrl: string): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${site.url}/#business`,
    name: site.name,
    slogan: site.tagline,
    url: `${site.url}/`,
    image: imageUrl,
    telephone: site.phone.e164,
    email: site.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: site.address.street,
      addressLocality: site.address.city,
      addressRegion: site.address.regionCode,
      addressCountry: site.address.country,
    },
    sameAs: [site.social.instagram, site.social.facebook],
  };
}

export interface ProductLd {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  price?: number;
}

/** A product. "From $X" becomes an AggregateOffer with only the low price. */
export function productJsonLd(product: ProductLd): JsonLd {
  const data: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.imageUrl,
    url: absoluteUrl(`/products/${product.id}/`),
    brand: { '@type': 'Brand', name: site.name },
  };
  if (product.price !== undefined) {
    data.offers = {
      '@type': 'AggregateOffer',
      lowPrice: product.price,
      priceCurrency: 'CAD',
      url: absoluteUrl(`/products/${product.id}/`),
    };
  }
  return data;
}

export interface Crumb {
  name: string;
  path: string;
}

export function breadcrumbJsonLd(crumbs: Crumb[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

export interface FaqItem {
  question: string;
  answer: string;
}

/**
 * Only questions with a real answer. Returns undefined when there is none yet,
 * so the FAQ page sends no structured data with placeholder answers.
 */
export function faqJsonLd(items: FaqItem[]): JsonLd | undefined {
  const answered = items.filter((item) => !isPlaceholder(item.answer));
  if (answered.length === 0) return undefined;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: answered.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer.trim() },
    })),
  };
}

/** JSON for a <script type="application/ld+json">, safe inside HTML. */
export function serializeJsonLd(data: JsonLd): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

/** The fixed pages of the site, for the sitemap (products, categories and policies come from content). */
export const STATIC_PAGE_PATHS = [
  '/',
  '/shop/',
  '/events/',
  '/events/gallery/',
  '/corporate/',
  '/corporate/gallery/',
  '/contact/',
  '/faq/',
  '/about/',
];

export interface SitemapEntry {
  path: string;
}

export function sitemapXml(entries: SitemapEntry[]): string {
  const urls = entries
    .map((entry) => `  <url><loc>${absoluteUrl(entry.path)}</loc></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

export function robotsTxt(): string {
  return `User-agent: *
Disallow: /api/

Sitemap: ${absoluteUrl('/sitemap.xml')}
`;
}
