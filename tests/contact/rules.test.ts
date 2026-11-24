import { describe, expect, it } from 'vitest';
import {
  ERROR_MESSAGES,
  isValidDate,
  phoneDigits,
  todayInToronto,
  validateField,
  validateForm,
  type FormValues,
} from '../../src/lib/contact/rules';

const TODAY = '2026-11-17';

const valid: FormValues = {
  firstName: 'Ana',
  lastName: 'Lee',
  phone: '226-555-0123',
  email: 'ana@example.com',
  message: 'Hello there',
  eventDate: '',
  eventType: '',
  venueCity: '',
};

describe('phoneDigits', () => {
  it('keeps only the digits', () => {
    expect(phoneDigits('+1 (226) 555-0123')).toBe('12265550123');
  });
});

describe('todayInToronto', () => {
  it('uses the Toronto date, not UTC', () => {
    // 03:00 UTC on Nov 18 is still Nov 17 in Toronto
    expect(todayInToronto(new Date('2026-11-18T03:00:00Z'))).toBe('2026-11-17');
  });
});

describe('isValidDate', () => {
  it('accepts a real date', () => {
    expect(isValidDate('2026-02-28')).toBe(true);
  });

  it('rejects impossible dates and other formats', () => {
    expect(isValidDate('2026-02-30')).toBe(false);
    expect(isValidDate('17/11/2026')).toBe(false);
    expect(isValidDate('')).toBe(false);
  });
});

describe('validateField', () => {
  it('requires the names and trims them', () => {
    expect(validateField('firstName', '   ', TODAY)).toBe(ERROR_MESSAGES.firstName);
    expect(validateField('lastName', ' Lee ', TODAY)).toBeNull();
  });

  it('limits names to 60 characters', () => {
    expect(validateField('firstName', 'a'.repeat(60), TODAY)).toBeNull();
    expect(validateField('firstName', 'a'.repeat(61), TODAY)).toBe(ERROR_MESSAGES.firstName);
  });

  it('needs 10 to 15 digits in the phone number', () => {
    expect(validateField('phone', '226-555-012', TODAY)).toBe(ERROR_MESSAGES.phone);
    expect(validateField('phone', '(226) 555-0123', TODAY)).toBeNull();
    expect(validateField('phone', '+44 20 7946 0958 12', TODAY)).toBeNull();
    expect(validateField('phone', '1234567890123456', TODAY)).toBe(ERROR_MESSAGES.phone);
  });

  it('checks the email format and length', () => {
    expect(validateField('email', 'ana@example.com', TODAY)).toBeNull();
    expect(validateField('email', 'ana@example', TODAY)).toBe(ERROR_MESSAGES.email);
    expect(validateField('email', 'ana @example.com', TODAY)).toBe(ERROR_MESSAGES.email);
    expect(validateField('email', `${'a'.repeat(110)}@example.com`, TODAY)).toBe(
      ERROR_MESSAGES.email,
    );
  });

  it('needs a message of 5 to 3000 characters', () => {
    expect(validateField('message', 'Hi', TODAY)).toBe(ERROR_MESSAGES.message);
    expect(validateField('message', 'Hello', TODAY)).toBeNull();
    expect(validateField('message', 'a'.repeat(3001), TODAY)).toBe(ERROR_MESSAGES.message);
  });

  it('accepts an empty or future event date, and today', () => {
    expect(validateField('eventDate', '', TODAY)).toBeNull();
    expect(validateField('eventDate', TODAY, TODAY)).toBeNull();
    expect(validateField('eventDate', '2026-12-12', TODAY)).toBeNull();
  });

  it('rejects a past or invalid event date', () => {
    expect(validateField('eventDate', '2026-11-16', TODAY)).toBe(ERROR_MESSAGES.eventDate);
    expect(validateField('eventDate', 'tomorrow', TODAY)).toBe(ERROR_MESSAGES.eventDate);
  });

  it('accepts only the listed event types', () => {
    expect(validateField('eventType', '', TODAY)).toBeNull();
    expect(validateField('eventType', 'baby shower', TODAY)).toBeNull();
    expect(validateField('eventType', 'party', TODAY)).toBe(ERROR_MESSAGES.eventType);
  });

  it('limits the venue city to 80 characters', () => {
    expect(validateField('venueCity', 'Waterloo', TODAY)).toBeNull();
    expect(validateField('venueCity', 'a'.repeat(81), TODAY)).toBe(ERROR_MESSAGES.venueCity);
  });
});

describe('validateForm', () => {
  it('returns no errors for a valid form', () => {
    expect(validateForm(valid, 'contact', TODAY)).toEqual({});
  });

  it('returns every invalid field', () => {
    const errors = validateForm({ ...valid, firstName: '', email: 'x' }, 'order', TODAY);
    expect(Object.keys(errors)).toEqual(['firstName', 'email']);
  });

  it('treats missing values as empty', () => {
    expect(Object.keys(validateForm({}, 'contact', TODAY))).toEqual([
      'firstName',
      'lastName',
      'phone',
      'email',
      'message',
    ]);
  });

  it('checks the quote fields only on the quote form', () => {
    const values = { ...valid, eventDate: '2020-01-01', eventType: 'party' };
    expect(validateForm(values, 'order', TODAY)).toEqual({});
    expect(Object.keys(validateForm(values, 'event_quote', TODAY))).toEqual([
      'eventDate',
      'eventType',
    ]);
  });
});
