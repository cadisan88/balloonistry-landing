import { track } from '../lib/analytics';
import { pageTypeOf } from '../lib/tracking';

/**
 * The floating "Order" button (mobile) opens the channel sheet, a modal <dialog>.
 * The dialog gives focus trapping and Esc to close. A click on the backdrop also closes it.
 * The button hides while any contact form is on screen.
 */

export function initChannelSheet(): void {
  const button = document.querySelector<HTMLButtonElement>('[data-floating-order]');
  const sheet = document.querySelector<HTMLDialogElement>('[data-channel-sheet]');
  if (!button || !sheet) return;

  button.addEventListener('click', () => {
    sheet.showModal();
    const pageType = pageTypeOf(document.documentElement.dataset.pageType);
    if (pageType) track('floating_order_opened', { page_type: pageType });
  });

  sheet.querySelector('[data-sheet-close]')?.addEventListener('click', () => sheet.close());

  // A click on the backdrop lands on the dialog element itself
  sheet.addEventListener('click', (event) => {
    if (event.target === sheet) sheet.close();
  });

  sheet.addEventListener('close', () => {
    // Return focus to the button, unless the sheet sent the visitor to a form
    if (document.activeElement === document.body) button.focus();
  });

  // Hide the button while a form is visible
  const forms = document.querySelectorAll<HTMLElement>('[data-contact-form]');
  if (forms.length === 0 || !('IntersectionObserver' in window)) return;
  const visible = new Set<Element>();
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) visible.add(entry.target);
      else visible.delete(entry.target);
    }
    button.classList.toggle('is-hidden', visible.size > 0);
  });
  forms.forEach((form) => observer.observe(form));
}
