import type { ContactRequest } from '../../src/lib/contact/validation';

export const TODAY = '2026-11-17';
/** 14:30 in Toronto on TODAY. */
export const NOW = new Date('2026-11-17T19:30:00Z');

/** A valid request body, as the browser sends it. */
export function validBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    type: 'order',
    firstName: 'Ana',
    lastName: 'Lee',
    phone: '226-555-0123',
    email: 'ana@example.com',
    message: "Hi Balloonistry! I'd like to order the Hot Air Balloon.",
    product: 'hot-air-balloon',
    source: '/products/hot-air-balloon/',
    company: '',
    startedAt: NOW.getTime() - 60_000,
    turnstileToken: 'token-123',
    ...overrides,
  };
}

/** A parsed request, as the email and Telegram builders receive it. */
export function contact(overrides: Partial<ContactRequest> = {}): ContactRequest {
  return {
    type: 'order',
    firstName: 'Ana',
    lastName: 'Lee',
    phone: '226-555-0123',
    email: 'ana@example.com',
    message: 'Pink and gold, please.',
    product: 'hot-air-balloon',
    source: '/products/hot-air-balloon/',
    company: '',
    startedAt: NOW.getTime() - 60_000,
    turnstileToken: 'token-123',
    eventDate: undefined,
    eventType: undefined,
    venueCity: undefined,
    ...overrides,
  };
}
