import { describe, expect, it } from 'vitest';
import { slideOffset } from '../src/scripts/lightbox';

describe('slideOffset', () => {
  it('is 0 for the current slide and +-1 for its neighbours', () => {
    expect(slideOffset(2, 2, 5)).toBe(0);
    expect(slideOffset(3, 2, 5)).toBe(1);
    expect(slideOffset(1, 2, 5)).toBe(-1);
  });

  it('wraps: the last item is before the first, and the first is after the last', () => {
    expect(slideOffset(4, 0, 5)).toBe(-1);
    expect(slideOffset(0, 4, 5)).toBe(1);
  });

  it('puts the other item of a pair on the right', () => {
    expect(slideOffset(1, 0, 2)).toBe(1);
    expect(slideOffset(0, 1, 2)).toBe(1);
  });

  it('has no neighbours in a single item loop', () => {
    expect(slideOffset(0, 0, 1)).toBe(0);
  });
});
