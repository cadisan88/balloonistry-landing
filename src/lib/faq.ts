/** FAQ groups, in the order the FAQ page shows them. Used by the schema and the page. */
export const FAQ_GROUPS = ['ordering', 'delivery-pickup', 'products', 'events', 'payment'] as const;
export type FaqGroup = (typeof FAQ_GROUPS)[number];

export const FAQ_GROUP_TITLES: Record<FaqGroup, string> = {
  ordering: 'Ordering',
  'delivery-pickup': 'Delivery & pickup',
  products: 'Products',
  events: 'Events',
  payment: 'Payment',
};

/** Lower case, no accents, single spaces: "  Café  Ordering " becomes "cafe ordering". */
export function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Does a FAQ match what the person typed? Every word of the query must appear in the question
 * or in the answer, in any order. Case and accents do not matter. An empty query matches all.
 */
export function faqMatches(query: string, question: string, answer: string): boolean {
  const words = normalizeText(query).split(' ').filter(Boolean);
  if (words.length === 0) return true;
  const haystack = normalizeText(`${question} ${answer}`);
  return words.every((word) => haystack.includes(word));
}

/** Text for the live region after a search. */
export function faqResultsMessage(count: number): string {
  return `${count} ${count === 1 ? 'question' : 'questions'} found`;
}
