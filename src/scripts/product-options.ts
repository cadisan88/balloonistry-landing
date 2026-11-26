/**
 * The buy box of a product page (src/components/ProductBuy.astro):
 * - the live price follows the chosen options
 * - "Add to quote list" and "Ask on WhatsApp" always describe the current choice
 *
 * Adding to the list itself is src/scripts/quote.ts, which reads the `data-quote-add` attributes
 * this script keeps up to date before any click (the analytics read the same attributes).
 */
import { buildProductMessage, whatsappLink } from '../lib/channels';
import { formatPrice } from '../lib/price';
import { clampQty, type QuoteOption } from '../lib/quote';

function setup(root: HTMLElement): void {
  const priceText = root.querySelector<HTMLElement>('[data-buy-price]');
  const qtyInput = root.querySelector<HTMLInputElement>('[data-buy-qty]');
  const addButton = root.querySelector<HTMLElement>('[data-quote-add]');
  const ask = root.querySelector<HTMLAnchorElement>('[data-buy-ask]');
  const product = { id: root.dataset.productId ?? '', name: root.dataset.productName ?? '' };
  const copyLinks = document.querySelectorAll<HTMLElement>('[data-product-copy]');
  const basePrice = root.dataset.basePrice ? Number(root.dataset.basePrice) : undefined;
  const inputs = [...root.querySelectorAll<HTMLInputElement>('[data-option-input]')];

  const chosen = (): QuoteOption[] =>
    inputs
      .filter((input) => input.checked)
      .map((input) => ({
        group: input.dataset.group ?? '',
        choice: input.dataset.choice ?? '',
        price: Number(input.dataset.price ?? 0),
      }));

  const update = () => {
    const options = chosen();
    const qty = clampQty(Number(qtyInput?.value ?? 1));
    const unit =
      basePrice === undefined
        ? undefined
        : basePrice + options.reduce((sum, option) => sum + option.price, 0);

    if (priceText) priceText.textContent = formatPrice(unit);

    if (addButton) {
      addButton.dataset.qty = String(qty);
      addButton.dataset.options = String(options.length);
      addButton.dataset.quoteOptions = JSON.stringify(options);
      if (unit === undefined) delete addButton.dataset.unitPrice;
      else addButton.dataset.unitPrice = String(unit);
    }

    const message = buildProductMessage(product, options, qty);
    if (ask) ask.href = whatsappLink(message);
    // Every product page Instagram button copies the same message as "Ask on WhatsApp"
    for (const link of copyLinks) link.dataset.copyMessage = message;
  };

  for (const input of inputs) input.addEventListener('change', update);

  if (qtyInput) {
    qtyInput.addEventListener('input', update);
    // Leaving the field puts a valid number back in it
    qtyInput.addEventListener('change', () => {
      qtyInput.value = String(clampQty(Number(qtyInput.value)));
      update();
    });
    for (const button of root.querySelectorAll<HTMLButtonElement>('[data-buy-step]')) {
      button.addEventListener('click', () => {
        qtyInput.value = String(clampQty(Number(qtyInput.value) + Number(button.dataset.buyStep)));
        update();
      });
    }
  }

  update();
}

export function initProductOptions(): void {
  for (const root of document.querySelectorAll<HTMLElement>('[data-buy]')) setup(root);
}
