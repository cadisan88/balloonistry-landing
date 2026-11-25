/**
 * "See more photos" for EventGallery: reveals the photos after the first few.
 * Focus moves to the first new photo, and the button becomes "Show fewer photos".
 */

export function initGalleryMore(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-gallery-toggle]').forEach((button) => {
    if (button.dataset.ready) return;
    const list = document.getElementById(button.getAttribute('aria-controls') ?? '');
    if (!list) return;
    button.dataset.ready = 'true';

    button.addEventListener('click', () => {
      const expanding = list.hasAttribute('data-collapsed');
      if (expanding) list.removeAttribute('data-collapsed');
      else list.setAttribute('data-collapsed', 'true');

      button.setAttribute('aria-expanded', String(expanding));
      button.textContent =
        (expanding ? button.dataset.lessLabel : button.dataset.moreLabel) ?? button.textContent;

      // Keyboard users land on the first new photo; collapsing leaves focus on the button
      if (expanding) list.querySelector<HTMLElement>('[data-gallery-first-extra]')?.focus();
    });
  });
}
