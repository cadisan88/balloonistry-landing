import { describe, expect, it } from 'vitest';
import { buildInquiryMessage, formatInquiryDate } from '../src/lib/inquiry';

describe('buildInquiryMessage', () => {
  it('is empty when nothing is picked', () => {
    expect(buildInquiryMessage({ items: [] })).toBe('');
  });

  it('lists the occasion, the items and the date', () => {
    expect(
      buildInquiryMessage({
        occasion: 'Birthday',
        items: ['Gift Balloons', 'Event decor'],
        date: '2026-12-12',
      }),
    ).toBe(
      'Hi! Here is what I have in mind.\n' +
        'Occasion: Birthday\n' +
        "I'm interested in: Gift Balloons, Event decor\n" +
        'Date: Saturday, December 12, 2026\n\n',
    );
  });

  it('leaves out what is not picked', () => {
    expect(buildInquiryMessage({ items: ['Encapsulated'] })).toBe(
      "Hi! Here is what I have in mind.\nI'm interested in: Encapsulated\n\n",
    );
  });
});

describe('formatInquiryDate', () => {
  it('keeps an invalid date as it is', () => {
    expect(formatInquiryDate('2026-02-30')).toBe('2026-02-30');
    expect(formatInquiryDate('soon')).toBe('soon');
  });
});
