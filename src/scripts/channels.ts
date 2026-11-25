/**
 * Channel button behaviour shared by every page:
 * - Instagram: copy the message, show a toast, then open the chat.
 * - "Order with the form" with an on-page anchor: scroll to the form and focus the first field.
 */
import { track } from '../lib/analytics';
import { copyText } from './clipboard';
import { showToast } from './toast';

const COPIED_TEXT = 'Message copied. Paste it in Instagram.';

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
    // The copy starts here, inside the click, so the link below still opens as a user gesture.
    if (link.dataset.copyMessage !== undefined) {
      // The quote drawer: the preview is the message that is sent, so copy exactly that
      const preview = link
        .closest('dialog')
        ?.querySelector<HTMLTextAreaElement>('[data-drawer-message]');
      const message = preview ? preview.value : link.dataset.copyMessage;
      if (message) {
        void copyText(message).then((copied) => {
          if (copied) {
            showToast(COPIED_TEXT);
            if (link.dataset.channel === 'instagram') {
              track('message_copied', {
                channel: 'instagram',
                product: link.dataset.product || undefined,
              });
            }
          } else if (preview) {
            preview.focus();
            preview.select();
            showToast('Could not copy. Copy the message shown in the preview, then paste it.');
          } else {
            showToast('Could not copy the message. Please type your request in Instagram.');
          }
        });
      }
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
