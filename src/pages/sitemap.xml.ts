/**
 * /sitemap.xml, built at build time.
 * Lists only what visitors can browse: hidden categories and unavailable products never appear,
 * and neither do products that are only in hidden categories.
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { getListedProducts, getVisibleCategories } from '../lib/content';
import { sitemapXml } from '../lib/seo';

export const prerender = true;

export const GET: APIRoute = async () => {
  const [categories, products, policies] = await Promise.all([
    getVisibleCategories(),
    getListedProducts(),
    getCollection('policies'),
  ]);

  const paths = [
    '/',
    '/shop/',
    ...categories.map((category) => `/shop/${category.id}/`),
    ...products.map((product) => `/products/${product.id}/`),
    '/events/',
    '/corporate/',
    '/contact/',
    '/faq/',
    '/about/',
    ...policies.map((policy) => `/policies/${policy.id}/`),
  ];

  return new Response(sitemapXml(paths.map((path) => ({ path }))), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
