/** Product photo gallery: a thumbnail button shows its photo on the stage. */

export function initGalleries(): void {
  for (const gallery of document.querySelectorAll<HTMLElement>('[data-gallery]')) {
    const slides = [...gallery.querySelectorAll<HTMLElement>('[data-gallery-slide]')];
    const thumbs = [...gallery.querySelectorAll<HTMLButtonElement>('[data-gallery-thumb]')];

    for (const thumb of thumbs) {
      thumb.addEventListener('click', () => {
        const active = Number(thumb.dataset.galleryThumb);
        slides.forEach((slide, index) => slide.classList.toggle('is-active', index === active));
        thumbs.forEach((other) => {
          if (other === thumb) other.setAttribute('aria-current', 'true');
          else other.removeAttribute('aria-current');
        });
      });
    }
  }
}
