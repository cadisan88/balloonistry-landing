/**
 * Builds the email to the owner (docs/ARCHITECTURE.md section 5, "Email").
 * Every user value is escaped in the HTML, and line breaks are removed from header values.
 */
import { productUrl } from '../channels';
import { EVENT_TYPE_LABELS, type EventType, type FormType } from './rules';
import type { ContactRequest } from './validation';

const TIME_ZONE = 'America/Toronto';

export interface EmailAddressLike {
  name: string;
  email: string;
}

export interface EmailContent {
  subject: string;
  replyTo: EmailAddressLike;
  text: string;
  html: string;
}

export interface EmailOptions {
  /** The product name, when the request is about a product that exists. */
  productName?: string;
  /** Base URL of the site, for the page link. */
  siteUrl: string;
  sentAt: Date;
}

const TYPE_TITLES: Record<FormType, string> = {
  order: 'New order request',
  contact: 'New question',
  event_quote: 'New event quote request',
};

/** Removes CR and LF so a value cannot add a header line. */
export function stripLineBreaks(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** "Tuesday, November 17, 2026 at 12:30 p.m." in Kitchener time. */
export function formatTorontoDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(date);
}

/** "2026-12-12" becomes "Saturday, December 12, 2026". */
export function formatEventDate(value: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC', dateStyle: 'full' }).format(
    new Date(`${value}T12:00:00Z`),
  );
}

export function fullName(request: Pick<ContactRequest, 'firstName' | 'lastName'>): string {
  return stripLineBreaks(`${request.firstName} ${request.lastName}`);
}

export function buildSubject(request: ContactRequest, productName?: string): string {
  const label =
    request.type === 'order'
      ? productName
        ? `Order: ${productName}`
        : 'Order'
      : request.type === 'event_quote'
        ? 'Event quote'
        : 'Question';
  return stripLineBreaks(`[Website] ${label} from ${fullName(request)}`);
}

interface Row {
  label: string;
  value: string;
  href?: string;
}

function rows(request: ContactRequest, options: EmailOptions): Row[] {
  const list: Row[] = [
    { label: 'Name', value: fullName(request) },
    { label: 'Phone', value: request.phone, href: `tel:${request.phone.replace(/[^\d+]/g, '')}` },
    { label: 'Email', value: request.email, href: `mailto:${request.email}` },
  ];
  if (request.product) {
    const url = productUrl(request.product);
    list.push({ label: 'Product', value: options.productName ?? request.product, href: url });
  }
  if (request.eventDate)
    list.push({ label: 'Event date', value: formatEventDate(request.eventDate) });
  if (request.eventType) {
    list.push({ label: 'Event type', value: EVENT_TYPE_LABELS[request.eventType as EventType] });
  }
  if (request.venueCity) list.push({ label: 'Venue city', value: request.venueCity });
  if (request.source) {
    const page = new URL(request.source, options.siteUrl).href;
    list.push({ label: 'Page', value: page, href: page });
  }
  list.push({ label: 'Sent', value: `${formatTorontoDateTime(options.sentAt)} (Kitchener time)` });
  return list;
}

export function buildEmail(request: ContactRequest, options: EmailOptions): EmailContent {
  const title = TYPE_TITLES[request.type];
  const list = rows(request, options);

  const text = [
    `${title} from the website.`,
    '',
    ...list.map((row) =>
      row.href && row.label === 'Product'
        ? `${row.label}: ${row.value} (${row.href})`
        : `${row.label}: ${row.value}`,
    ),
    '',
    'Message:',
    request.message,
    '',
    'Reply to this email to answer the customer.',
  ].join('\n');

  const cell = 'padding:6px 12px 6px 0;vertical-align:top;';
  const htmlRows = list
    .map((row) => {
      const value = escapeHtml(row.value);
      const content = row.href ? `<a href="${escapeHtml(row.href)}">${value}</a>` : value;
      return `<tr><th align="left" style="${cell}">${escapeHtml(row.label)}</th><td style="${cell}">${content}</td></tr>`;
    })
    .join('');

  const html = `<!doctype html>
<html lang="en">
<body style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#2b2540;">
<h1 style="font-size:20px;">${escapeHtml(title)}</h1>
<table role="presentation" style="border-collapse:collapse;">${htmlRows}</table>
<h2 style="font-size:16px;margin-top:24px;">Message</h2>
<p style="white-space:pre-wrap;">${escapeHtml(request.message)}</p>
<p style="color:#9b4269;">Reply to this email to answer the customer.</p>
</body>
</html>`;

  return {
    subject: buildSubject(request, options.productName),
    replyTo: { name: fullName(request), email: stripLineBreaks(request.email) },
    text,
    html,
  };
}
