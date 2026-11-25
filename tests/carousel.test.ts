import { describe, expect, it } from 'vitest';
import { wrapIndex } from '../src/lib/carousel';

describe('wrapIndex', () => {
  it('keeps an index that is in range', () => {
    expect(wrapIndex(0, 3)).toBe(0);
    expect(wrapIndex(2, 3)).toBe(2);
  });

  it('goes from the last slide to the first', () => {
    expect(wrapIndex(3, 3)).toBe(0);
    expect(wrapIndex(4, 3)).toBe(1);
  });

  it('goes back from the first slide to the last', () => {
    expect(wrapIndex(-1, 3)).toBe(2);
    expect(wrapIndex(-4, 3)).toBe(2);
  });

  it('is always 0 with a single slide', () => {
    expect(wrapIndex(1, 1)).toBe(0);
    expect(wrapIndex(-1, 1)).toBe(0);
  });

  it('does not break on an empty or invalid list', () => {
    expect(wrapIndex(2, 0)).toBe(0);
    expect(wrapIndex(1.5, 3)).toBe(0);
    expect(wrapIndex(Number.NaN, 3)).toBe(0);
  });
});
