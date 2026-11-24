// @ts-check
import { defineConfig, envField, fontProviders } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// Canonical host. The apex (balloonistry.ca) redirects to www.
const SITE_URL = 'https://www.balloonistry.ca';

export default defineConfig({
  site: SITE_URL,
  // Pages are prerendered by default. Only src/pages/api/contact.ts opts out.
  output: 'static',
  // The site has no sessions. This also stops the adapter from creating a KV namespace.
  session: false,
  // The content has no code blocks. Shiki would add inline styles that the CSP blocks.
  markdown: { syntaxHighlight: false },
  // Content Security Policy as a <meta> tag on every page, with hashes for Astro's own
  // scripts and styles. Not active in `astro dev`: test with `npm run preview`.
  // frame-ancestors cannot be set in a meta tag, so it is in public/_headers.
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data: blob: https://*.posthog.com",
        "font-src 'self'",
        // Turnstile and PostHog
        "connect-src 'self' https://challenges.cloudflare.com https://*.posthog.com",
        'frame-src https://challenges.cloudflare.com',
        "worker-src 'self' blob:",
        "base-uri 'self'",
        "form-action 'self'",
        "object-src 'none'",
      ],
      scriptDirective: {
        resources: ["'self'", 'https://challenges.cloudflare.com', 'https://*.posthog.com'],
      },
    },
  },
  adapter: cloudflare({
    // Transform images at build time (prerendered pages). No runtime image cost.
    imageService: 'compile',
  }),
  env: {
    schema: {
      // Public values, read at build time (.env locally, build variables in Workers Builds).
      // Server secrets are Worker secrets, read from `cloudflare:workers` (see wrangler.jsonc).
      PUBLIC_TURNSTILE_SITE_KEY: envField.string({
        context: 'client',
        access: 'public',
        optional: true,
      }),
      // Analytics is off when the key is missing (dev, previews, tests)
      PUBLIC_POSTHOG_KEY: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_POSTHOG_HOST: envField.string({
        context: 'client',
        access: 'public',
        default: 'https://us.i.posthog.com',
      }),
    },
  },
  fonts: [
    {
      name: 'Fraunces',
      cssVariable: '--font-fraunces',
      provider: fontProviders.fontsource(),
      weights: [600],
      styles: ['normal', 'italic'],
      subsets: ['latin'],
      fallbacks: ['Georgia', 'serif'],
    },
    {
      name: 'Nunito',
      cssVariable: '--font-nunito',
      provider: fontProviders.fontsource(),
      weights: [400, 700, 800],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['system-ui', 'sans-serif'],
    },
  ],
});
