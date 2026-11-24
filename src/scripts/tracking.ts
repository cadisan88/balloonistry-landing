/**
 * Starts analytics on every page and sends the click events read from data attributes.
 * See src/lib/tracking.ts for the rules and docs/ANALYTICS.md for the plan.
 */
import { PUBLIC_POSTHOG_HOST, PUBLIC_POSTHOG_KEY } from 'astro:env/client';
import { initAnalytics, track } from '../lib/analytics';
import {
  eventFromDataset,
  pageTypeOf,
  productViewFromDataset,
  type TrackedEvent,
} from '../lib/tracking';

const TRACKED = '[data-product-card], [data-category-link], [data-channel], [data-quote-cta]';

function send(tracked: TrackedEvent | undefined): void {
  if (!tracked) return;
  // The union keeps each event paired with its own properties
  (track as (event: string, properties: object) => void)(tracked.event, tracked.properties);
}

export function initTracking(): void {
  const pageType = pageTypeOf(document.documentElement.dataset.pageType) ?? 'not_found';
  initAnalytics({ key: PUBLIC_POSTHOG_KEY, host: PUBLIC_POSTHOG_HOST, pageType });

  const productPage = document.querySelector<HTMLElement>('[data-product-page]');
  if (productPage) send(productViewFromDataset({ ...productPage.dataset }));

  // Capture phase, so the event is recorded even if another handler stops the click
  document.addEventListener(
    'click',
    (event) => {
      if (!(event.target instanceof Element)) return;
      const element = event.target.closest<HTMLElement>(TRACKED);
      if (element) send(eventFromDataset({ ...element.dataset }));
    },
    { capture: true },
  );
}
