/**
 * The quote list drawer (src/components/QuoteDrawer.astro): a native modal <dialog>.
 * It shows the list from src/scripts/quote.ts, the optional details, the message preview
 * and the channel buttons. The dialog gives focus trapping and Esc.
 *
 * The details (date, pickup or delivery, city, notes) stay in this browser, in memory and in
 * sessionStorage. They go into the message the visitor sends, and nowhere else: never to analytics.
 *
 * Opened by any `[data-quote-open]`. The channel buttons carry `data-quote-send`, `data-items` and
 * `data-estimated-total`, which this script keeps up to date (see src/lib/tracking.ts).
 */
import { channelLinks } from '../lib/channels';
import { formatAmount, NO_PRICE_LABEL } from '../lib/price';
import {
  buildQuoteMessage,
  estimatedTotal,
  optionLines,
  parseStoredDetails,
  unitPrice,
  type QuoteDetails,
  type QuoteItem,
} from '../lib/quote';
import { changeQty, getItems, QUOTE_CHANGE_EVENT, removeFromQuote } from './quote';
import { showToast } from './toast';

const DETAILS_KEY = 'balloonistry.quote.details.v1';

function loadDetails(): QuoteDetails {
  try {
    return parseStoredDetails(window.sessionStorage.getItem(DETAILS_KEY));
  } catch {
    return {};
  }
}

function saveDetails(details: QuoteDetails): void {
  try {
    window.sessionStorage.setItem(DETAILS_KEY, JSON.stringify(details));
  } catch {
    // No storage: the details stay in memory
  }
}

/** Finds an element the markup must have. Throws a clear error if it is missing. */
function need<T extends HTMLElement>(parent: HTMLElement | DocumentFragment, selector: string): T {
  const element = parent.querySelector<T>(selector);
  if (!element) throw new Error(`Quote drawer: missing ${selector}`);
  return element;
}

export function initQuoteDrawer(): void {
  const dialog = document.querySelector<HTMLDialogElement>('[data-drawer]');
  if (!dialog) return;

  const title = need<HTMLElement>(dialog, '[data-drawer-title]');
  const empty = need<HTMLElement>(dialog, '[data-drawer-empty]');
  const filled = need<HTMLElement>(dialog, '[data-drawer-filled]');
  const list = need<HTMLElement>(dialog, '[data-drawer-items]');
  const template = need<HTMLTemplateElement>(dialog, '[data-drawer-item-template]');
  const totalLine = need<HTMLElement>(dialog, '[data-drawer-total-line]');
  const totalValue = need<HTMLElement>(dialog, '[data-drawer-total]');
  const message = need<HTMLTextAreaElement>(dialog, '[data-drawer-message]');
  const cityField = need<HTMLElement>(dialog, '[data-detail-city-field]');
  const dateInput = need<HTMLInputElement>(dialog, '[data-detail="date"]');
  const cityInput = need<HTMLInputElement>(dialog, '[data-detail="city"]');
  const notesInput = need<HTMLTextAreaElement>(dialog, '[data-detail="notes"]');
  const deliveryInputs = [...dialog.querySelectorAll<HTMLInputElement>('[data-detail="delivery"]')];
  const sendLinks = [...dialog.querySelectorAll<HTMLAnchorElement>('a[data-quote-send]')];
  const copyButton = need<HTMLButtonElement>(dialog, '[data-drawer-copy]');

  const root = document.documentElement;
  let details = loadDetails();
  let opener: HTMLElement | undefined;
  /** The control that had focus before a change re-built the list. */
  let pendingFocus: { key: string; action: string } | undefined;

  // ----- Details fields -----

  // Nobody plans an event in the past
  dateInput.min = new Date().toLocaleDateString('en-CA');

  const showDetails = () => {
    dateInput.value = details.date ?? '';
    cityInput.value = details.city ?? '';
    notesInput.value = details.notes ?? '';
    for (const input of deliveryInputs) input.checked = input.value === details.delivery;
    cityField.hidden = details.delivery !== 'delivery';
  };

  const readDetails = (): QuoteDetails => {
    const delivery = deliveryInputs.find((input) => input.checked)?.value;
    return {
      date: dateInput.value || undefined,
      delivery: delivery === 'pickup' || delivery === 'delivery' ? delivery : undefined,
      city: cityInput.value || undefined,
      notes: notesInput.value || undefined,
    };
  };

  // ----- Message and channel links -----

  const updateMessage = () => {
    const items = getItems();
    const text = buildQuoteMessage(items, details);
    message.value = text;
    const links = channelLinks(text);
    const total = estimatedTotal(items);
    for (const link of sendLinks) {
      const channel = link.dataset.link;
      if (channel === 'whatsapp') link.href = links.whatsapp;
      if (channel === 'sms') link.href = links.sms;
      if (channel === 'instagram') link.dataset.copyMessage = text;
      link.dataset.items = String(items.length);
      if (total === undefined) delete link.dataset.estimatedTotal;
      else link.dataset.estimatedTotal = String(total);
    }
  };

  // ----- The list -----

  const optionsOf = (item: QuoteItem) => optionLines(item.options);

  const priceText = (item: QuoteItem): string => {
    const unit = unitPrice(item);
    if (unit === undefined) return NO_PRICE_LABEL;
    return `From ${formatAmount(unit)}${item.qty > 1 ? ' each' : ''}`;
  };

  const buildItem = (item: QuoteItem): HTMLElement => {
    const fragment = template.content.cloneNode(true) as DocumentFragment;
    const row = need<HTMLElement>(fragment, '[data-item]');
    row.dataset.key = item.key;

    const image = need<HTMLImageElement>(row, '[data-item-image]');
    if (item.image) image.src = item.image;
    else image.hidden = true;

    const name = need<HTMLAnchorElement>(row, '[data-item-name]');
    name.textContent = item.name;
    name.href = item.url;

    const options = need<HTMLElement>(row, '[data-item-options]');
    options.replaceChildren(
      ...optionsOf(item).map((line) => {
        const li = document.createElement('li');
        li.textContent = line;
        return li;
      }),
    );

    need<HTMLElement>(row, '[data-item-price]').textContent = priceText(item);

    need<HTMLElement>(row, '[data-item-stepper]').setAttribute(
      'aria-label',
      `Quantity of ${item.name}`,
    );
    const input = need<HTMLInputElement>(row, '[data-action="qty"]');
    input.value = String(item.qty);
    input.setAttribute('aria-label', 'Quantity');
    const dec = need<HTMLButtonElement>(row, '[data-action="dec"]');
    dec.setAttribute('aria-label', 'Decrease quantity');
    dec.disabled = item.qty <= 1;
    const inc = need<HTMLButtonElement>(row, '[data-action="inc"]');
    inc.setAttribute('aria-label', 'Increase quantity');
    inc.disabled = item.qty >= 20;
    need<HTMLButtonElement>(row, '[data-action="remove"]').setAttribute(
      'aria-label',
      `Remove ${item.name} from the list`,
    );
    return row;
  };

  const render = () => {
    const items = getItems();
    const hasItems = items.length > 0;
    empty.hidden = hasItems;
    filled.hidden = !hasItems;

    list.replaceChildren(...items.map(buildItem));

    const total = estimatedTotal(items);
    totalLine.hidden = total === undefined;
    totalValue.textContent = total === undefined ? '' : formatAmount(total);

    updateMessage();
    restoreFocus();
  };

  /** Puts focus back after the list was rebuilt, so a keyboard user keeps their place. */
  const restoreFocus = () => {
    const wanted = pendingFocus;
    pendingFocus = undefined;
    if (!wanted || !dialog.open) return;
    const row = [...list.children].find(
      (child): child is HTMLElement =>
        child instanceof HTMLElement && child.dataset.key === wanted.key,
    );
    const target =
      row?.querySelector<HTMLElement>(`[data-action="${wanted.action}"]:not(:disabled)`) ??
      row?.querySelector<HTMLElement>('[data-action="qty"]') ??
      // The line is gone: go to the next remove button, or to the title
      list.querySelector<HTMLElement>('[data-action="remove"]') ??
      title;
    target.focus();
  };

  const rememberFocus = (row: HTMLElement, action: string) => {
    if (row.dataset.key) pendingFocus = { key: row.dataset.key, action };
  };

  const quantityOf = (row: HTMLElement): number =>
    getItems().find((item) => item.key === row.dataset.key)?.qty ?? 1;

  list.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>('button[data-action]');
    const row = button?.closest<HTMLElement>('[data-item]');
    const key = row?.dataset.key;
    if (!button || !row || !key) return;
    const action = button.dataset.action ?? '';
    rememberFocus(row, action);
    if (action === 'inc') changeQty(key, quantityOf(row) + 1);
    else if (action === 'dec') changeQty(key, quantityOf(row) - 1);
    else if (action === 'remove') removeFromQuote(key);
  });

  list.addEventListener('change', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.dataset.action !== 'qty') return;
    const row = input.closest<HTMLElement>('[data-item]');
    const key = row?.dataset.key;
    if (!row || !key) return;
    rememberFocus(row, 'qty');
    changeQty(key, Number(input.value));
  });

  document.addEventListener(QUOTE_CHANGE_EVENT, () => {
    if (dialog.open) render();
  });

  // ----- Details events -----

  dialog.addEventListener('input', (event) => {
    if (!(event.target instanceof HTMLElement) || !('detail' in event.target.dataset)) return;
    details = readDetails();
    cityField.hidden = details.delivery !== 'delivery';
    saveDetails(details);
    updateMessage();
  });

  // ----- Copy list -----

  copyButton.addEventListener('click', () => {
    const text = message.value;
    const select = () => {
      message.focus();
      message.select();
      showToast('Message selected. Copy it from the preview.');
    };
    if (!navigator.clipboard) {
      select();
      return;
    }
    navigator.clipboard.writeText(text).then(() => showToast('Quote list copied.'), select);
  });

  // ----- Open and close -----

  const open = (from: HTMLElement | undefined) => {
    if (dialog.open) return;
    opener = from;
    showDetails();
    render();
    root.classList.add('is-scroll-locked');
    dialog.showModal();
    // Start at the top of the panel, whatever it showed last time
    dialog.querySelector('.drawer__panel')?.scrollTo({ top: 0 });
  };

  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const from = event.target.closest<HTMLElement>('[data-quote-open]');
    if (from) open(from);
  });

  dialog.querySelector('[data-drawer-close]')?.addEventListener('click', () => dialog.close());

  // The backdrop is the dialog element itself (the panel covers the rest)
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  dialog.addEventListener('close', () => {
    root.classList.remove('is-scroll-locked');
    // Back to the button that opened it. If that was the toast, which is gone, use the header button.
    const target =
      opener?.isConnected && opener.checkVisibility({ visibilityProperty: true })
        ? opener
        : document.querySelector<HTMLElement>('.site-header [data-quote-open]');
    target?.focus();
    opener = undefined;
  });

  // Back/forward cache: never come back to a locked page
  window.addEventListener('pageshow', () => {
    if (!dialog.open) root.classList.remove('is-scroll-locked');
  });
}
