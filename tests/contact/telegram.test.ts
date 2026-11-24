import { describe, expect, it, vi } from 'vitest';
import { buildTelegramText, sendTelegram } from '../../src/lib/contact/telegram';
import { contact } from './fixtures';

describe('buildTelegramText', () => {
  it('has the type, name, phone, product and message', () => {
    expect(buildTelegramText(contact(), 'Hot Air Balloon')).toBe(
      [
        'New Order from the website',
        'Ana Lee',
        '226-555-0123',
        'Product: Hot Air Balloon',
        '',
        'Pink and gold, please.',
      ].join('\n'),
    );
  });

  it('shows the event type for a quote', () => {
    const text = buildTelegramText(
      contact({ type: 'event_quote', product: undefined, eventType: 'wedding' }),
    );
    expect(text).toContain('New Event quote from the website');
    expect(text).toContain('Event type: Wedding');
    expect(text).not.toContain('Product:');
  });

  it('keeps only the first 200 characters of the message', () => {
    const text = buildTelegramText(contact({ message: 'a'.repeat(500) }));
    expect(text.endsWith(`${'a'.repeat(200)}…`)).toBe(true);
  });
});

describe('sendTelegram', () => {
  it('posts plain text, with no parse mode', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => new Response('{"ok":true}'));
    await sendTelegram('TOKEN', '42', 'Hello', fetchFn);
    const [url, init] = fetchFn.mock.calls[0] ?? [];
    expect(url).toBe('https://api.telegram.org/botTOKEN/sendMessage');
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    expect(body).toEqual({ chat_id: '42', text: 'Hello', disable_web_page_preview: true });
    expect(body).not.toHaveProperty('parse_mode');
  });

  it('throws when Telegram answers with an error', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => new Response('no', { status: 401 }));
    await expect(sendTelegram('TOKEN', '42', 'Hello', fetchFn)).rejects.toThrow('401');
  });
});
