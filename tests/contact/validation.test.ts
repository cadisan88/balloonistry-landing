import { describe, expect, it } from 'vitest';
import { ERROR_MESSAGES } from '../../src/lib/contact/rules';
import { parseContact } from '../../src/lib/contact/validation';
import { TODAY, validBody } from './fixtures';

describe('parseContact', () => {
  it('accepts a valid request and trims the text', () => {
    const result = parseContact(validBody({ firstName: '  Ana  ' }), TODAY);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.firstName).toBe('Ana');
  });

  it('drops fields that are not in the contract', () => {
    const result = parseContact(validBody({ admin: true }), TODAY);
    expect(result.ok && 'admin' in result.data).toBe(false);
  });

  it('turns empty optional fields into undefined', () => {
    const result = parseContact(
      validBody({ type: 'event_quote', eventDate: '', eventType: '', venueCity: '' }),
      TODAY,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.eventDate).toBeUndefined();
      expect(result.data.eventType).toBeUndefined();
      expect(result.data.venueCity).toBeUndefined();
    }
  });

  it('uses the same messages as the browser', () => {
    const result = parseContact(validBody({ phone: '123', email: 'nope' }), TODAY);
    expect(result).toEqual({
      ok: false,
      errors: { phone: ERROR_MESSAGES.phone, email: ERROR_MESSAGES.email },
    });
  });

  it('reports missing required fields', () => {
    const result = parseContact({ type: 'contact', startedAt: 1, turnstileToken: 'x' }, TODAY);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual(
        ['email', 'firstName', 'lastName', 'message', 'phone'].sort(),
      );
    }
  });

  it('rejects an unknown form type, product slug, event type and page', () => {
    const result = parseContact(
      validBody({
        type: 'spam',
        product: '../etc/passwd',
        eventType: 'party',
        source: 'https://evil.example/',
      }),
      TODAY,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual(
        ['eventType', 'product', 'source', 'type'].sort(),
      );
    }
  });

  it('rejects a past event date', () => {
    const result = parseContact(validBody({ eventDate: '2026-11-16' }), TODAY);
    expect(result).toEqual({ ok: false, errors: { eventDate: ERROR_MESSAGES.eventDate } });
  });

  it('needs a Turnstile token', () => {
    const result = parseContact(validBody({ turnstileToken: '' }), TODAY);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.errors)).toEqual(['turnstileToken']);
  });

  it('rejects a body that is not an object', () => {
    expect(parseContact('hello', TODAY).ok).toBe(false);
    expect(parseContact(null, TODAY).ok).toBe(false);
  });
});
