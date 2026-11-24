import { describe, expect, it } from 'vitest';
import { formatPrice } from '../src/lib/price';

describe('formatPrice', () => {
  it('shows a whole price without decimals', () => {
    expect(formatPrice(75)).toBe('From $75');
  });

  it('shows cents only when the price has cents', () => {
    expect(formatPrice(75.5)).toBe('From $75.50');
    expect(formatPrice(39.99)).toBe('From $39.99');
  });

  it('never shows ".00"', () => {
    expect(formatPrice(120.0)).toBe('From $120');
  });

  it('groups thousands', () => {
    expect(formatPrice(1250)).toBe('From $1,250');
  });

  it('shows "Request a quote" when there is no price', () => {
    expect(formatPrice(undefined)).toBe('Request a quote');
  });
});
