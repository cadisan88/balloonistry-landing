/** Wraps an index into 0..count-1: next after the last slide is the first, and back. */
export function wrapIndex(index: number, count: number): number {
  if (!Number.isInteger(index) || !Number.isInteger(count) || count < 1) return 0;
  return ((index % count) + count) % count;
}
