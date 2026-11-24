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
