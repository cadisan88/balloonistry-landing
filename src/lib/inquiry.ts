/**
 * Inquiry builder (home page): turns the visitor's picks into the text of the contact message.
 * Nothing is sent from here. The text goes into the form's message box, where it can be edited.
 */

export interface InquiryPicks {
  occasion?: string;
  items: string[];
  /** ISO date (YYYY-MM-DD) from a date input. */
  date?: string;
}

/** "2026-12-12" -> "Saturday, December 12, 2026". Returns the input if it is not a valid date. */
export function formatInquiryDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (Number.isNaN(date.getTime()) || date.getUTCDate() !== Number(day)) return iso;
  return date.toLocaleDateString('en-CA', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** The message text for the picks, or an empty string when nothing is picked. */
export function buildInquiryMessage(picks: InquiryPicks): string {
  const lines: string[] = [];
  if (picks.occasion) lines.push(`Occasion: ${picks.occasion}`);
  if (picks.items.length > 0) lines.push(`I'm interested in: ${picks.items.join(', ')}`);
  if (picks.date) lines.push(`Date: ${formatInquiryDate(picks.date)}`);
  if (lines.length === 0) return '';
  return `Hi! Here is what I have in mind.\n${lines.join('\n')}\n\n`;
}
