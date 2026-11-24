import { describe, expect, it } from 'vitest';
import {
  buildEmail,
  buildSubject,
  escapeHtml,
  formatEventDate,
  formatTorontoDateTime,
  stripLineBreaks,
} from '../../src/lib/contact/email';
import { NOW, contact } from './fixtures';

const options = { siteUrl: 'https://www.balloonistry.ca', sentAt: NOW };

describe('stripLineBreaks', () => {
  it('removes CR and LF so no header can be added', () => {
    expect(stripLineBreaks('Ana\r\nBcc: evil@example.com')).toBe('Ana Bcc: evil@example.com');
    expect(stripLineBreaks('a\nb\rc')).toBe('a b c');
  });
});

describe('escapeHtml', () => {
  it('escapes the HTML special characters', () => {
    expect(escapeHtml(`<script>alert("x") & 'y'</script>`)).toBe(
      '&lt;script&gt;alert(&quot;x&quot;) &amp; &#39;y&#39;&lt;/script&gt;',
    );
  });
});

describe('dates', () => {
  it('shows the send time in Kitchener time', () => {
    const text = formatTorontoDateTime(NOW);
    expect(text).toContain('November 17, 2026');
    expect(text).toMatch(/2:30/);
  });

  it('formats the event date without a time zone shift', () => {
    expect(formatEventDate('2026-12-12')).toBe('Saturday, December 12, 2026');
  });
});

describe('buildSubject', () => {
  it('names the product for an order', () => {
    expect(buildSubject(contact(), 'Hot Air Balloon')).toBe(
      '[Website] Order: Hot Air Balloon from Ana Lee',
    );
  });

  it('says "Order" when the product name is unknown', () => {
    expect(buildSubject(contact())).toBe('[Website] Order from Ana Lee');
  });

  it('says "Event quote" and "Question" for the other forms', () => {
    expect(buildSubject(contact({ type: 'event_quote' }))).toBe(
      '[Website] Event quote from Ana Lee',
    );
    expect(buildSubject(contact({ type: 'contact' }))).toBe('[Website] Question from Ana Lee');
  });

  it('cannot be split into two headers', () => {
    const subject = buildSubject(contact({ firstName: 'Ana\r\nBcc: x@example.com' }));
    expect(subject).not.toMatch(/[\r\n]/);
  });
});

describe('buildEmail', () => {
  const quote = contact({
    type: 'event_quote',
    product: undefined,
    eventDate: '2026-12-12',
    eventType: 'baby shower',
    venueCity: 'Waterloo',
    source: '/events/',
  });

  it('replies to the customer', () => {
    const email = buildEmail(contact(), options);
    expect(email.replyTo).toEqual({ name: 'Ana Lee', email: 'ana@example.com' });
  });

  it('lists every field, the product link and the page in the text', () => {
    const email = buildEmail(contact(), { ...options, productName: 'Hot Air Balloon' });
    expect(email.text).toContain('Name: Ana Lee');
    expect(email.text).toContain('Phone: 226-555-0123');
    expect(email.text).toContain('Email: ana@example.com');
    expect(email.text).toContain(
      'Product: Hot Air Balloon (https://www.balloonistry.ca/products/hot-air-balloon/)',
    );
    expect(email.text).toContain('Page: https://www.balloonistry.ca/products/hot-air-balloon/');
    expect(email.text).toContain('(Kitchener time)');
    expect(email.text).toContain('Pink and gold, please.');
  });

  it('adds the quote fields', () => {
    const email = buildEmail(quote, options);
    expect(email.text).toContain('Event date: Saturday, December 12, 2026');
    expect(email.text).toContain('Event type: Baby shower');
    expect(email.text).toContain('Venue city: Waterloo');
    expect(email.text).not.toContain('Product:');
  });

  it('escapes every user value in the HTML', () => {
    const email = buildEmail(
      contact({
        firstName: '<b>Ana</b>',
        message: '<img src=x onerror=alert(1)>',
        venueCity: '"><script>',
      }),
      options,
    );
    expect(email.html).not.toContain('<b>Ana</b>');
    expect(email.html).not.toContain('<img');
    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('links the phone and email in the HTML', () => {
    const email = buildEmail(contact(), options);
    expect(email.html).toContain('href="tel:2265550123"');
    expect(email.html).toContain('href="mailto:ana@example.com"');
  });
});
