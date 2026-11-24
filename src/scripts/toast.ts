/** Short message at the bottom of the screen. The element lives in BaseLayout. */

const VISIBLE_MS = 4000;
let timer: number | undefined;

export function showToast(text: string): void {
  const toast = document.querySelector<HTMLElement>('[data-toast]');
  if (!toast) return;
  toast.textContent = text;
  toast.classList.add('is-visible');
  window.clearTimeout(timer);
  timer = window.setTimeout(() => toast.classList.remove('is-visible'), VISIBLE_MS);
}
