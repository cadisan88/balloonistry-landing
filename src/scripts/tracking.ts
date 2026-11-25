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
  quoteSentFromDataset,
  type TrackedEvent,
} from '../lib/tracking';

const TRACKED = [
  '[data-product-card]',
  '[data-category-link]',
  '[data-channel]',
  '[data-quote-cta]',
  '[data-quote-add]',
  '[data-quote-open]',
  '[data-media-open]',
  '[data-quote-send]',
].join(', ');

/** Sends an event from lib/tracking.ts. Nothing happens for undefined. */
export function sendTracked(tracked: TrackedEvent | undefined): void {
  if (!tracked) return;
  // The union keeps each event paired with its own properties
  (track as (event: string, properties: object) => void)(tracked.event, tracked.properties);
}

export function initTracking(): void {
  const pageType = pageTypeOf(document.documentElement.dataset.pageType) ?? 'not_found';
  initAnalytics({ key: PUBLIC_POSTHOG_KEY, host: PUBLIC_POSTHOG_HOST, pageType });

  const productPage = document.querySelector<HTMLElement>('[data-product-page]');
  if (productPage) sendTracked(productViewFromDataset({ ...productPage.dataset }));

  // Capture phase, so the event is recorded even if another handler stops the click
  document.addEventListener(
    'click',
    (event) => {
      if (!(event.target instanceof Element)) return;
      const element = event.target.closest<HTMLElement>(TRACKED);
      if (!element) return;
      const data = { ...element.dataset };
      sendTracked(eventFromDataset(data));
      // A channel button in the quote drawer also sends quote_sent
      if ('quoteSend' in data) sendTracked(quoteSentFromDataset(data));
    },
    { capture: true },
  );
}
