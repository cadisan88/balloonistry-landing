/**
 * The only on-demand route. All logic lives in src/lib/contact/handler.ts.
 * Bindings, vars and secrets come from the Worker environment (wrangler.jsonc, .dev.vars).
 */
import type { APIRoute } from 'astro';
import { getEntry } from 'astro:content';
import { env } from 'cloudflare:workers';
import { site } from '../../config/site';
import { handleContact, parseOrigins } from '../../lib/contact/handler';

export const prerender = false;

/** Secrets are optional at type level: they are not in wrangler.jsonc. */
function secret(name: string): string | undefined {
  const value: unknown = Reflect.get(env, name);
  return typeof value === 'string' && value !== '' ? value : undefined;
}

async function productName(slug: string): Promise<string | undefined> {
  const product = await getEntry('products', slug);
  return product?.data.available ? product.data.name : undefined;
}

export const ALL: APIRoute = ({ request }) =>
  handleContact(request, {
    config: {
      allowedOrigins: parseOrigins(env.ALLOWED_ORIGINS),
      mailFrom: env.MAIL_FROM,
      mailTo: site.email,
      siteUrl: site.url,
      turnstileSecret: secret('TURNSTILE_SECRET_KEY'),
      telegramToken: secret('TELEGRAM_BOT_TOKEN'),
      telegramChatId: secret('TELEGRAM_CHAT_ID'),
    },
    sendEmail: (email) => env.CONTACT_EMAIL.send(email),
    fetch: (input, init) => fetch(input, init),
    now: () => new Date(),
    productName,
    log: (message) => console.error(message),
  });
