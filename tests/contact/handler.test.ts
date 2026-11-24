import { describe, expect, it, vi } from 'vitest';
import {
  MAX_BODY_BYTES,
  handleContact,
  parseOrigins,
  type ContactDeps,
  type OutgoingEmail,
} from '../../src/lib/contact/handler';
import { NOW, validBody } from './fixtures';

const ORIGIN = 'https://www.balloonistry.ca';
const SECRETS = ['turnstile-secret', 'telegram-token', 'chat-42'];
/** Values from validBody() that must never reach a log. */
const PERSONAL = ['Ana', 'Lee', '226-555-0123', 'ana@example.com', 'Hot Air Balloon.'];

interface Setup {
  turnstileSuccess?: boolean;
  sendFails?: boolean;
  telegram?: boolean;
  telegramFails?: boolean;
  turnstileSecret?: string;
}

function setup(options: Setup = {}) {
  const sent: OutgoingEmail[] = [];
  const logs: string[] = [];
  const fetchFn = vi.fn<typeof fetch>(async (input) => {
    const url = String(input);
    if (url.includes('turnstile')) {
      return Response.json({ success: options.turnstileSuccess ?? true });
    }
    if (url.includes('api.telegram.org')) {
      return new Response('{}', { status: options.telegramFails ? 500 : 200 });
    }
    throw new Error(`Unexpected fetch ${url}`);
  });
  const deps: ContactDeps = {
    config: {
      allowedOrigins: [ORIGIN],
      mailFrom: 'website@balloonistry.ca',
      mailTo: 'balloonistry@outlook.com',
      siteUrl: ORIGIN,
      turnstileSecret: 'turnstileSecret' in options ? options.turnstileSecret : SECRETS[0],
      telegramToken: options.telegram ? SECRETS[1] : undefined,
      telegramChatId: options.telegram ? SECRETS[2] : undefined,
    },
    sendEmail: async (email) => {
      if (options.sendFails) throw Object.assign(new Error('nope'), { code: 'E_RATE_LIMIT' });
      sent.push(email);
    },
    fetch: fetchFn,
    now: () => NOW,
    productName: async (slug) => (slug === 'hot-air-balloon' ? 'Hot Air Balloon' : undefined),
    log: (message) => logs.push(message),
  };
  return { deps, sent, logs, fetchFn };
}

function post(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(`${ORIGIN}/api/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: ORIGIN, ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

async function call(request: Request, deps: ContactDeps) {
  const response = await handleContact(request, deps);
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

describe('parseOrigins', () => {
  it('splits and cleans the list', () => {
    expect(parseOrigins(' https://a.ca/ , http://localhost:4321,,')).toEqual([
      'https://a.ca',
      'http://localhost:4321',
    ]);
    expect(parseOrigins(undefined)).toEqual([]);
  });
});

describe('handleContact: request checks', () => {
  it('answers 405 to other methods', async () => {
    const { deps } = setup();
    const response = await handleContact(new Request(`${ORIGIN}/api/contact`), deps);
    expect(response.status).toBe(405);
    expect(response.headers.get('Allow')).toBe('POST');
    expect(await response.json()).toEqual({ ok: false, error: 'bad_request' });
  });

  it('answers 403 to another origin, or none', async () => {
    const { deps, sent } = setup();
    expect((await call(post(validBody(), { Origin: 'https://evil.example' }), deps)).status).toBe(
      403,
    );
    const noOrigin = new Request(`${ORIGIN}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody()),
    });
    expect((await call(noOrigin, deps)).body).toEqual({ ok: false, error: 'bad_request' });
    expect(sent).toHaveLength(0);
  });

  it('answers 415 to a body that is not JSON', async () => {
    const { deps } = setup();
    expect((await call(post('a=b', { 'Content-Type': 'text/plain' }), deps)).status).toBe(415);
    expect((await call(post('{not json'), deps)).status).toBe(415);
  });

  it('answers 413 to a body over 10 KB', async () => {
    const { deps, sent } = setup();
    const big = validBody({ message: 'a'.repeat(MAX_BODY_BYTES) });
    expect((await call(post(big), deps)).status).toBe(413);
    expect(sent).toHaveLength(0);
  });
});

describe('handleContact: bots', () => {
  it('answers ok but sends nothing when the honeypot is filled', async () => {
    const { deps, sent, fetchFn } = setup();
    const result = await call(post(validBody({ company: 'Acme' })), deps);
    expect(result).toEqual({ status: 200, body: { ok: true } });
    expect(sent).toHaveLength(0);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('answers ok but sends nothing when the form was sent in under 3 seconds', async () => {
    const { deps, sent } = setup();
    const result = await call(post(validBody({ startedAt: NOW.getTime() - 1000 })), deps);
    expect(result).toEqual({ status: 200, body: { ok: true } });
    expect(sent).toHaveLength(0);
  });

  it('treats a missing start time as a bot', async () => {
    const { deps, sent } = setup();
    expect((await call(post(validBody({ startedAt: undefined })), deps)).status).toBe(200);
    expect(sent).toHaveLength(0);
  });
});

describe('handleContact: validation and Turnstile', () => {
  it('answers 422 with field errors', async () => {
    const { deps, fetchFn } = setup();
    const result = await call(post(validBody({ email: 'nope', firstName: '' })), deps);
    expect(result.status).toBe(422);
    expect(Object.keys(result.body.errors as object).sort()).toEqual(['email', 'firstName']);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('answers 403 when Turnstile fails', async () => {
    const { deps, sent } = setup({ turnstileSuccess: false });
    const result = await call(post(validBody()), deps);
    expect(result).toEqual({ status: 403, body: { ok: false, error: 'verification_failed' } });
    expect(sent).toHaveLength(0);
  });

  it('answers 403 and logs when the Turnstile secret is missing', async () => {
    const { deps, logs } = setup({ turnstileSecret: undefined });
    expect((await call(post(validBody()), deps)).status).toBe(403);
    expect(logs).toEqual(['contact: TURNSTILE_SECRET_KEY is not set']);
  });

  it('sends the token, the secret and the visitor IP to siteverify', async () => {
    const { deps, fetchFn } = setup();
    await call(post(validBody(), { 'CF-Connecting-IP': '203.0.113.7' }), deps);
    const [url, init] = fetchFn.mock.calls[0] ?? [];
    expect(String(url)).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    const body = init?.body as URLSearchParams;
    expect(body.get('response')).toBe('token-123');
    expect(body.get('secret')).toBe('turnstile-secret');
    expect(body.get('remoteip')).toBe('203.0.113.7');
  });
});

describe('handleContact: sending', () => {
  it('sends the email and answers ok', async () => {
    const { deps, sent } = setup();
    const result = await call(post(validBody()), deps);
    expect(result).toEqual({ status: 200, body: { ok: true } });
    expect(sent).toHaveLength(1);
    const email = sent[0] as OutgoingEmail;
    expect(email.from).toBe('website@balloonistry.ca');
    expect(email.to).toBe('balloonistry@outlook.com');
    expect(email.replyTo).toEqual({ name: 'Ana Lee', email: 'ana@example.com' });
    expect(email.subject).toBe('[Website] Order: Hot Air Balloon from Ana Lee');
  });

  it('answers 500 when the email cannot be sent, and logs only the error code', async () => {
    const { deps, logs } = setup({ sendFails: true });
    const result = await call(post(validBody()), deps);
    expect(result).toEqual({ status: 500, body: { ok: false, error: 'send_failed' } });
    expect(logs).toEqual(['contact: email send failed (E_RATE_LIMIT)']);
  });

  it('sends the Telegram alert when it is configured', async () => {
    const { deps, fetchFn } = setup({ telegram: true });
    expect((await call(post(validBody()), deps)).status).toBe(200);
    const urls = fetchFn.mock.calls.map(([url]) => String(url));
    expect(urls.some((url) => url.startsWith('https://api.telegram.org/'))).toBe(true);
  });

  it('does not call Telegram when it is not configured', async () => {
    const { deps, fetchFn } = setup();
    await call(post(validBody()), deps);
    expect(fetchFn.mock.calls.map(([url]) => String(url))).toEqual([
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    ]);
  });

  it('still answers ok when Telegram fails, and only logs it', async () => {
    const { deps, logs, sent } = setup({ telegram: true, telegramFails: true });
    expect((await call(post(validBody()), deps)).status).toBe(200);
    expect(sent).toHaveLength(1);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatch(/^contact: telegram failed/);
  });

  it('never logs personal data or secrets', async () => {
    const runs = [
      setup({ sendFails: true }),
      setup({ telegram: true, telegramFails: true }),
      setup({ turnstileSecret: undefined }),
    ];
    const logs: string[] = [];
    for (const run of runs) {
      await call(post(validBody()), run.deps);
      logs.push(...run.logs);
    }
    expect(logs.length).toBeGreaterThan(0);
    for (const line of logs) {
      for (const value of [...PERSONAL, ...SECRETS]) expect(line).not.toContain(value);
    }
  });
});
