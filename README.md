# Balloonistry website

Marketing site for [Balloonistry](https://www.balloonistry.ca), balloon gifts and event decor in Kitchener-Waterloo. It shows the products and sends customers to a contact channel to order. There is no cart, checkout or database.

- **The owner** edits products, categories, photos and the FAQ in Markdown and JSON files: see [CONTENT_GUIDE.md](CONTENT_GUIDE.md).
- **The developer** works on the code: this file.

## Stack

- Astro 7, TypeScript strict, plain CSS with the tokens in `src/styles/tokens.css`
- Cloudflare Workers with static assets (`@astrojs/cloudflare`). Every page is prerendered. Only `src/pages/api/contact.ts` runs on demand.
- Content collections (`src/content.config.ts`) with Zod schemas. A broken content file fails the build.
- Contact form: Cloudflare Turnstile, Email Routing `send_email` binding, optional Telegram alert
- PostHog analytics and session replay, loaded only when a key is set
- Vitest, ESLint, Prettier

## Setup

You need Node.js 26. The version is pinned in `.nvmrc` and `.node-version`. With fnm on Windows (PowerShell):

```bash
fnm env --use-on-cd --shell powershell | Out-String | Invoke-Expression
```

```bash
fnm use
```

```bash
npm install
```

Create the two local env files from the examples. Both are git-ignored and hold only Cloudflare's public test keys:

```bash
copy .env.example .env
```

```bash
copy .dev.vars.example .dev.vars
```

| File        | Read by                     | Holds                                                                                                            |
| ----------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `.env`      | `astro build` / `astro dev` | Public build values: `PUBLIC_TURNSTILE_SITE_KEY`, `PUBLIC_POSTHOG_KEY`, `PUBLIC_POSTHOG_HOST`                    |
| `.dev.vars` | the local Worker            | Secrets and local overrides: `TURNSTILE_SECRET_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `ALLOWED_ORIGINS` |

Never commit real secrets. In production, secrets go in with `wrangler secret put`.

## Commands

| Command           | What it does                                                    |
| ----------------- | --------------------------------------------------------------- |
| `npm run dev`     | Dev server at http://localhost:4321 with hot reload             |
| `npm run preview` | Builds, then runs the real Worker at http://localhost:8787      |
| `npm run check`   | `wrangler types` and `astro check`                              |
| `npm run lint`    | ESLint and Prettier check                                       |
| `npm run format`  | Prettier write                                                  |
| `npm run test`    | Vitest (about 15 s: includes the broken-content build test)     |
| `npm run build`   | Production build into `dist/`                                   |
| `npm run deploy`  | Build and `wrangler deploy` (normally Workers Builds does this) |

Run `npm run check && npm run lint && npm run test && npm run build` before each commit.

### Dev server or preview?

`npm run dev` is fast, but it does not apply the Content Security Policy, `public/_redirects` or `public/_headers`. Use `npm run preview` to check those, and to test `/api/contact` the way production runs it.

In both, the `send_email` binding is simulated: emails are logged in the terminal and saved under `.wrangler/tmp/email/`. To send a real test email from local, add `"remote": true` to the binding in `wrangler.jsonc`. Do not commit it.

### Testing on a phone

```bash
npm run dev -- --host
```

Open the "Network" URL on a phone on the same Wi-Fi to try the WhatsApp, SMS and call links. To send the form from the phone, add that origin (for example `http://192.168.1.20:4321`) to `ALLOWED_ORIGINS` in `.dev.vars`.

## Project structure

```
src/
  assets/        images processed by Astro (products, categories, events, brand, icons)
  components/    one component per file, PascalCase
  config/        site.ts (business info, channels, nav) and events.ts (services, gallery)
  content/       products, categories, faq, pages, policies, testimonials
  layouts/       BaseLayout.astro (head, SEO, header, footer, channel sheet)
  lib/           pure TypeScript: catalog rules, price, channels, SEO, analytics,
                 contact/ (rules, Zod validation, email, Telegram, Turnstile, handler)
  pages/         routes; api/contact.ts is the only on-demand route
  scripts/       small client scripts (menu, reveal, gallery, channels, form, tracking)
  styles/        tokens.css and global.css
tests/           Vitest: unit tests and tests/build (broken content must fail)
public/          favicon, _headers, _redirects
```

Rules worth knowing before you change code:

- **Business info** (phone, email, address, social and channel links) lives only in `src/config/site.ts`.
- **Products and categories** are never hard-coded. Pages get them through `src/lib/content.ts`, which applies the display rules in `src/lib/catalog.ts` (hidden categories, unavailable products, sorting).
- **Colours** are tokens. A raw hex colour is allowed only in `tokens.css` and the email HTML (`src/lib/contact/email.ts`).
- **Missing business text** gets a `TODO:` placeholder. Never invent it.

## Contact API

The logic for `POST /api/contact` is in `src/lib/contact/handler.ts`, and `src/pages/api/contact.ts` only connects the Worker environment.

- The browser and the API share the field rules in `src/lib/contact/rules.ts`.
- Form data is never stored. Logs hold fixed texts and error codes only, never personal data or secrets.
- Allowed origins come from `ALLOWED_ORIGINS` (a `wrangler.jsonc` var, overridden in `.dev.vars`).

Turnstile test keys (Cloudflare docs): site key `1x00000000000000000000AA`; secret `1x0000000000000000000000000000000AA` always passes, `2x0000000000000000000000000000000AA` always fails.

## Analytics

All events go through `track()` in `src/lib/analytics.ts`. Click events are read from data attributes by `src/lib/tracking.ts`. Without `PUBLIC_POSTHOG_KEY` nothing loads and every call does nothing. With a key in `npm run dev`, events are printed to the browser console as `[analytics]`.

## Deployment (Cloudflare Workers Builds)

The repository connects to a Worker named `balloonistry` through Workers Builds. Every push to `main` builds and deploys; other branches get a preview URL. A failed build never replaces the live site.

| Setting         | Value                                                                                               |
| --------------- | --------------------------------------------------------------------------------------------------- |
| Build command   | `npm run build`                                                                                     |
| Deploy command  | `npx wrangler deploy`                                                                               |
| Node version    | 26 (from `.node-version`; if your build image ignores it, set the build variable `NODE_VERSION=26`) |
| Build variables | `PUBLIC_TURNSTILE_SITE_KEY`, `PUBLIC_POSTHOG_KEY` (production only), `PUBLIC_POSTHOG_HOST`          |

Secrets, once per environment:

```bash
npx wrangler secret put TURNSTILE_SECRET_KEY
```

```bash
npx wrangler secret put TELEGRAM_BOT_TOKEN
```

```bash
npx wrangler secret put TELEGRAM_CHAT_ID
```

## Quality checks

**Lighthouse note:** the developer's PC runs Kaspersky, which injects an `http://` script into every page. That script alone causes the Best Practices failure ("Does not use HTTPS") and, when not blocked, about 1.7 s of render blocking. Lighthouse results are measured with `--blocked-url-patterns="*kaspersky-labs.com*"`. Run Lighthouse again on the live HTTPS site, or on a machine without that software.

## Troubleshooting

- **`node` is not found** in a new terminal: run the `fnm env` line from Setup, or add it to your PowerShell profile.
- **Types for `env` look wrong** after changing `wrangler.jsonc` or `.dev.vars`: run `npm run check` (it runs `wrangler types`).
- **The form says "Please wait a moment for the security check"**: Turnstile has not given a token yet. Check `PUBLIC_TURNSTILE_SITE_KEY` in `.env` and the CSP in `astro.config.mjs`.
- **The form answers 403 `bad_request`**: the page origin is not in `ALLOWED_ORIGINS`.
- **Old Wix URLs do not redirect in `npm run dev`**: that is expected. Use `npm run preview`.
