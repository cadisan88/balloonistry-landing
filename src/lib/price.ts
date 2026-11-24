/**
 * Price display (docs/CONTENT_MODEL.md, "Display rules").
 * "From $75" in CAD, no decimals unless the price has cents.
 * A product without a price shows "Request a quote".
 */

export const NO_PRICE_LABEL = 'Request a quote';

export function formatPrice(price: number | undefined): string {
  if (price === undefined) return NO_PRICE_LABEL;
  const hasCents = !Number.isInteger(price);
  const amount = price.toLocaleString('en-CA', {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return `From $${amount}`;
}
