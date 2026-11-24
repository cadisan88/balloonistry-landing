/**
 * Typed analytics wrapper (docs/ANALYTICS.md). Every event goes through `track()`.
 *
 * - PostHog loads only when PUBLIC_POSTHOG_KEY is set. Without it every call does nothing.
 * - Events sent before PostHog has loaded wait in a short queue.
 * - Never put personal data in properties: no names, emails, phones or message text.
 */
import type { Channel, ChannelLocation } from './channels';
import type { FormType } from './contact/rules';

export const PAGE_TYPES = [
  'home',
  'shop',
  'category',
  'product',
  'events',
  'contact',
  'faq',
  'about',
  'policy',
  'not_found',
] as const;
export type PageType = (typeof PAGE_TYPES)[number];

export const PRODUCT_LISTS = ['home_featured', 'shop', 'category', 'related'] as const;
export type ProductList = (typeof PRODUCT_LISTS)[number];

export const CATEGORY_LOCATIONS = ['home', 'shop', 'category'] as const;
export type CategoryLocation = (typeof CATEGORY_LOCATIONS)[number];

/** Every event and its properties. Nothing else can be sent. */
export interface AnalyticsEvents {
  product_viewed: { product: string; price?: number; categories: string[] };
  product_card_clicked: { product: string; list: ProductList; position: number };
  category_clicked: { category: string; location: CategoryLocation };
  order_channel_clicked: { channel: Channel; location: ChannelLocation; product?: string };
  message_copied: { channel: 'instagram' | 'messenger'; product?: string };
  form_started: { form_type: FormType; product?: string };
  form_validation_error: { form_type: FormType; fields: string[] };
  form_submitted: { form_type: FormType; product?: string; time_to_submit_s: number };
  form_failed: { form_type: FormType; status: number | 'network' };
  quote_cta_clicked: { location: string };
  floating_order_opened: { page_type: PageType };
}
export type AnalyticsEvent = keyof AnalyticsEvents;

/** The part of the PostHog client this wrapper uses. */
export interface AnalyticsClient {
  capture(event: string, properties?: Record<string, unknown>): unknown;
}

const MAX_QUEUE = 50;

/** Removes undefined values, so events stay small and clean. */
function clean(properties: object): Record<string, unknown> {
  return Object.fromEntries(Object.entries(properties).filter(([, value]) => value !== undefined));
}

/**
 * The wrapper state. `createAnalytics()` exists so tests get a fresh one.
 * States: disabled (no key, the default) → waiting (key, loading) → ready.
 */
export function createAnalytics() {
  let client: AnalyticsClient | undefined;
  let waiting = false;
  const queue: [string, Record<string, unknown>][] = [];

  return {
    track<E extends AnalyticsEvent>(event: E, properties: AnalyticsEvents[E]): void {
      const data = clean(properties);
      if (client) {
        client.capture(event, data);
      } else if (waiting && queue.length < MAX_QUEUE) {
        queue.push([event, data]);
      }
    },
    /** Call when PostHog is about to load: events start to queue. */
    expect(): void {
      waiting = true;
    },
    /** Call when PostHog is ready: the queue is sent. */
    attach(next: AnalyticsClient): void {
      client = next;
      waiting = false;
      for (const [event, data] of queue.splice(0)) next.capture(event, data);
    },
    /** Call when PostHog could not load: the queue is dropped and tracking stays off. */
    fail(): void {
      waiting = false;
      queue.length = 0;
    },
  };
}

const analytics = createAnalytics();

export const track = analytics.track;

export interface AnalyticsOptions {
  key: string | undefined;
  host: string;
  pageType: PageType;
}

/**
 * Loads PostHog when the browser is idle, only if there is a key.
 * The library is a separate chunk, so pages without a key never download it.
 */
export function initAnalytics({ key, host, pageType }: AnalyticsOptions): void {
  if (!key) return;
  analytics.expect();

  const load = async () => {
    try {
      const { default: posthog } = await import('posthog-js');
      posthog.init(key, {
        api_host: host,
        // Clean, named events only (docs/ANALYTICS.md)
        autocapture: false,
        // The pageview is sent in `loaded` below, before any queued event,
        // so funnels always see $pageview first. Page leave stays automatic.
        capture_pageview: false,
        capture_pageleave: true,
        capture_heatmaps: false,
        capture_dead_clicks: false,
        capture_exceptions: false,
        rageclick: false,
        // Visitors are never identified, so every event stays anonymous
        person_profiles: 'identified_only',
        // Features this site does not use
        disable_surveys: true,
        disable_product_tours: true,
        disable_conversations: true,
        disable_web_experiments: true,
        session_recording: {
          // Nothing typed in a form is ever recorded
          maskAllInputs: true,
          // Never record request or response bodies: they hold the contact form data
          recordBody: false,
          recordHeaders: false,
          maskCapturedNetworkRequestFn: (request) => ({
            ...request,
            requestBody: undefined,
            responseBody: undefined,
          }),
        },
        // page_type on every event, including $pageview
        before_send: (event) => {
          if (!event) return event;
          event.properties = { ...event.properties, page_type: pageType };
          if (import.meta.env.DEV) {
            // Only our own properties, not PostHog's $ properties
            const own = Object.entries(event.properties).filter(([name]) => !name.startsWith('$'));
            console.debug('[analytics]', event.event, JSON.stringify(Object.fromEntries(own)));
          }
          return event;
        },
        loaded: (instance) => {
          instance.capture('$pageview');
          analytics.attach(instance);
        },
      });
    } catch {
      analytics.fail();
    }
  };

  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(() => void load(), { timeout: 3000 });
  } else {
    setTimeout(() => void load(), 1);
  }
}
