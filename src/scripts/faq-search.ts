/**
 * FAQ search: filters the questions as the person types (debounced).
 * Matching is in src/lib/faq.ts. Answers are matched on their rendered text.
 */
import { faqEmptyMessage, faqMatches, faqResultsMessage } from '../lib/faq';

const DEBOUNCE_MS = 150;

export function initFaqSearch(): void {
  const input = document.querySelector<HTMLInputElement>('[data-faq-input]');
  const status = document.querySelector<HTMLElement>('[data-faq-status]');
  const empty = document.querySelector<HTMLElement>('[data-faq-empty]');
  const emptyMessage = document.querySelector<HTMLElement>('[data-faq-empty-message]');
  const clear = document.querySelector<HTMLButtonElement>('[data-faq-clear]');
  if (!input || !status || !empty || !emptyMessage || !clear) return;

  const groups = [...document.querySelectorAll<HTMLElement>('[data-faq-group]')].map((group) => ({
    group,
    items: [...group.querySelectorAll<HTMLElement>('[data-faq-item]')].map((item) => ({
      item,
      question: item.querySelector('summary')?.textContent ?? '',
      answer: item.querySelector('.faq__answer')?.textContent ?? '',
    })),
  }));

  const apply = () => {
    const query = input.value;
    const searching = query.trim() !== '';
    let found = 0;

    for (const { group, items } of groups) {
      let visible = 0;
      for (const { item, question, answer } of items) {
        const match = faqMatches(query, question, answer);
        item.hidden = !match;
        if (match) visible += 1;
      }
      group.hidden = visible === 0;
      found += visible;
    }

    empty.hidden = !searching || found > 0;
    emptyMessage.textContent = faqEmptyMessage(query);
    status.textContent = searching ? faqResultsMessage(found) : '';
  };

  let timer: number | undefined;
  input.addEventListener('input', () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(apply, DEBOUNCE_MS);
  });

  clear.addEventListener('click', () => {
    window.clearTimeout(timer);
    input.value = '';
    apply();
    input.focus();
  });

  // The browser may restore the text after a reload or going back
  if (input.value !== '') apply();
}
