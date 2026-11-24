/**
 * Inquiry builder: chips and a date that write a draft into the contact form's message box.
 * The builder is hidden without JavaScript, and the form works the same with or without it.
 * Once the visitor types in the message box themselves, the builder no longer replaces it.
 */
import { buildInquiryMessage } from '../lib/inquiry';
import { todayInToronto } from '../lib/contact/rules';

function initBuilder(root: HTMLElement): void {
  const target = document.getElementById(root.dataset.target ?? '');
  if (!(target instanceof HTMLTextAreaElement)) return;

  const status = root.querySelector<HTMLElement>('[data-inquiry-status]');
  const date = root.querySelector<HTMLInputElement>('[data-inquiry-date]');
  if (date) date.min = todayInToronto();

  let lastDraft = '';

  const update = (): void => {
    const occasion = root.querySelector<HTMLInputElement>('[data-inquiry-occasion]:checked');
    const items = [...root.querySelectorAll<HTMLInputElement>('[data-inquiry-item]:checked')];
    const draft = buildInquiryMessage({
      occasion: occasion?.value,
      items: items.map((item) => item.value),
      date: date?.value || undefined,
    });

    // Never replace text the visitor wrote
    const untouched = target.value === '' || target.value === lastDraft;
    if (!untouched) {
      if (status) status.textContent = 'You edited your message, so we left it as it is.';
      return;
    }
    target.value = draft;
    lastDraft = draft;
    if (status) status.textContent = draft ? 'Added to your message below.' : '';
  };

  root.addEventListener('change', update);
  root.hidden = false;
}

export function initInquiryBuilders(): void {
  document.querySelectorAll<HTMLElement>('[data-inquiry]').forEach(initBuilder);
}
