/**
 * Channel button behaviour shared by every page:
 * - Instagram and Messenger: copy the message, show a toast, then open the chat.
 * - "Order with the form" with an on-page anchor: scroll to the form and focus the first field.
 */
import { track } from '../lib/analytics';
import { showToast } from './toast';

const COPIED_TEXT = 'Message copied. Paste it in the chat.';

/** Scrolls to a form section and puts the cursor in its first empty field. */
export function goToForm(target: HTMLElement): void {
  const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
  const fields = [
    ...target.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
      'input:not([type="hidden"]):not([tabindex="-1"]), textarea',
    ),
  ];
  const field = fields.find((input) => input.value.trim() === '') ?? fields[0];
  field?.focus({ preventScroll: true });
}

export function initChannels(): void {
  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const link = event.target.closest<HTMLAnchorElement>('a[data-channel]');
    if (!link) return;

    // Copy the message for chats that cannot be pre-filled. The link still opens as usual.
    const message = link.dataset.copyMessage;
    if (message && navigator.clipboard) {
      navigator.clipboard.writeText(message).then(
        () => {
          showToast(COPIED_TEXT);
          const channel = link.dataset.channel;
          if (channel === 'instagram' || channel === 'messenger') {
            track('message_copied', { channel, product: link.dataset.product || undefined });
          }
        },
        () => undefined, // If the copy fails, the link just opens.
      );
    }

    // Form link to an anchor on this page
    if (link.hasAttribute('data-form-link')) {
      const hash = link.getAttribute('href') ?? '';
      if (!hash.startsWith('#')) return;
      const target = document.getElementById(hash.slice(1));
      if (!target) return;
      event.preventDefault();
      link.closest('dialog')?.close();
      goToForm(target);
    }
  });
}
