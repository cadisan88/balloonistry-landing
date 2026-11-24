/** /robots.txt, built at build time so the sitemap URL comes from site.ts. */
import type { APIRoute } from 'astro';
import { robotsTxt } from '../lib/seo';

export const prerender = true;

export const GET: APIRoute = () =>
  new Response(robotsTxt(), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
