/**
 * POST /api/contact (docs/ARCHITECTURE.md section 5).
 * Steps, in the order of the contract:
 * method and JSON, size, honeypot and fill time, Zod, Turnstile, email, Telegram.
 *
 * Privacy: form data is never stored, and logs never contain personal data or secrets.
 * Logs only use the fixed texts below and error codes.
 */
import { buildEmail, type EmailAddressLike } from './email';
import { todayInToronto } from './rules';
import { buildTelegramText, sendTelegram } from './telegram';
import { verifyTurnstile } from './turnstile';
import { parseContact } from './validation';

export const MAX_BODY_BYTES = 10 * 1024;
export const MIN_FILL_MS = 3000;

export interface OutgoingEmail {
  from: string;
  to: string;
  replyTo: EmailAddressLike;
  subject: string;
  text: string;
  html: string;
}

export interface ContactConfig {
  /** Origins allowed to post, for example "https://www.balloonistry.ca". */
  allowedOrigins: string[];
  mailFrom: string;
  /** The verified destination. The send_email binding only allows this address. */
  mailTo: string;
  siteUrl: string;
  turnstileSecret?: string;
  telegramToken?: string;
  telegramChatId?: string;
}

export interface ContactDeps {
  config: ContactConfig;
  sendEmail: (email: OutgoingEmail) => Promise<unknown>;
  fetch: typeof fetch;
  now: () => Date;
  /** The name of an available product, or undefined. */
  productName: (slug: string) => Promise<string | undefined>;
  /** Receives fixed texts and error codes only. */
  log: (message: string) => void;
}

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
  });
}

const badRequest = (status: number, headers?: Record<string, string>) =>
  json(status, { ok: false, error: 'bad_request' }, headers);

/** Splits "a, b" into ["a", "b"]. */
export function parseOrigins(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

/** Reads the body, but stops as soon as it is larger than the limit. */
async function readBody(request: Request, limit: number): Promise<string | null> {
  const declared = Number(request.headers.get('Content-Length') ?? '0');
  if (declared > limit) return null;
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

/** Bots fill the hidden field, or send the form faster than a person can. */
function looksLikeBot(data: unknown, now: number): boolean {
  if (typeof data !== 'object' || data === null) return false;
  const company = 'company' in data ? data.company : undefined;
  if (typeof company === 'string' && company.trim() !== '') return true;
  const startedAt = 'startedAt' in data ? data.startedAt : undefined;
  return typeof startedAt !== 'number' || now - startedAt < MIN_FILL_MS;
}

function errorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) return String(error.code);
  return error instanceof Error ? error.name : 'unknown';
}

export async function handleContact(request: Request, deps: ContactDeps): Promise<Response> {
  const { config } = deps;

  // 1. Method, origin and content type
  if (request.method !== 'POST') return badRequest(405, { Allow: 'POST' });

  const origin = request.headers.get('Origin');
  if (!origin || !config.allowedOrigins.includes(origin)) return badRequest(403);

  const contentType = request.headers.get('Content-Type') ?? '';
  if (!contentType.toLowerCase().startsWith('application/json')) return badRequest(415);

  // 2. Size
  const raw = await readBody(request, MAX_BODY_BYTES);
  if (raw === null) return badRequest(413);

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return badRequest(415);
  }

  // 3. Honeypot and minimum fill time: answer "ok" and send nothing
  const now = deps.now();
  if (looksLikeBot(data, now.getTime())) return json(200, { ok: true });

  // 4. Validation
  const parsed = parseContact(data, todayInToronto(now));
  if (!parsed.ok) return json(422, { ok: false, errors: parsed.errors });
  const contact = parsed.data;

  // 5. Turnstile
  if (!config.turnstileSecret) {
    deps.log('contact: TURNSTILE_SECRET_KEY is not set');
    return json(403, { ok: false, error: 'verification_failed' });
  }
  const verified = await verifyTurnstile({
    secret: config.turnstileSecret,
    token: contact.turnstileToken,
    ip: request.headers.get('CF-Connecting-IP'),
    fetchFn: deps.fetch,
  });
  if (!verified) return json(403, { ok: false, error: 'verification_failed' });

  // 6. Email
  const productName = contact.product ? await deps.productName(contact.product) : undefined;
  const email = buildEmail(contact, { productName, siteUrl: config.siteUrl, sentAt: now });
  try {
    await deps.sendEmail({ from: config.mailFrom, to: config.mailTo, ...email });
  } catch (error) {
    deps.log(`contact: email send failed (${errorCode(error)})`);
    return json(500, { ok: false, error: 'send_failed' });
  }

  // 7. Telegram, only when configured. A failure is only logged.
  if (config.telegramToken && config.telegramChatId) {
    try {
      await sendTelegram(
        config.telegramToken,
        config.telegramChatId,
        buildTelegramText(contact, productName),
        deps.fetch,
      );
    } catch (error) {
      deps.log(`contact: telegram failed (${errorCode(error)})`);
    }
  }

  return json(200, { ok: true });
}
