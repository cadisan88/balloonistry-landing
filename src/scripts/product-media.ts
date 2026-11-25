/**
 * The product media carousel (src/components/ProductMedia.astro).
 * The stage scrolls with native scroll-snap (swipe on touch). This script adds the arrows,
 * the thumbnails, the arrow keys and the desktop hover magnifier.
 * Opening the lightbox is src/scripts/lightbox.ts, through `data-lightbox-group` on each item.
 */

const ORIGIN_PROPERTY = 'transform-origin';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// The magnifier is for a mouse. Touch screens swipe, and reduced motion gets no zoom.
const canMagnify = () =>
  window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reducedMotion();

function setup(root: HTMLElement): void {
  const stage = root.querySelector<HTMLElement>('[data-media-stage]');
  const track = stage?.querySelector<HTMLElement>('.media__track');
  if (!stage || !track) return;
  const slides = [...root.querySelectorAll<HTMLElement>('[data-media-slide]')];
  const thumbs = [...root.querySelectorAll<HTMLButtonElement>('[data-media-thumb]')];
  const prev = root.querySelector<HTMLButtonElement>('[data-media-prev]');
  const next = root.querySelector<HTMLButtonElement>('[data-media-next]');
  const last = slides.length - 1;

  const current = (): number =>
    Math.min(last, Math.max(0, Math.round(track.scrollLeft / Math.max(1, track.clientWidth))));

  const goTo = (index: number) => {
    const target = Math.min(last, Math.max(0, index));
    track.scrollTo({
      left: target * track.clientWidth,
      behavior: reducedMotion() ? 'auto' : 'smooth',
    });
  };

  const update = () => {
    const index = current();
    thumbs.forEach((thumb, position) => {
      if (position === index) thumb.setAttribute('aria-current', 'true');
      else thumb.removeAttribute('aria-current');
    });
    if (prev) prev.disabled = index === 0;
    if (next) next.disabled = index === last;
    // A video that is swiped away stops playing
    slides.forEach((slide, position) => {
      if (position !== index) slide.querySelector('video')?.pause();
    });
  };

  let frame = 0;
  track.addEventListener(
    'scroll',
    () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(update);
    },
    { passive: true },
  );
  window.addEventListener('resize', () => {
    // Keep the same slide in view when the width changes
    track.scrollTo({ left: current() * track.clientWidth, behavior: 'auto' });
    update();
  });

  prev?.addEventListener('click', () => goTo(current() - 1));
  next?.addEventListener('click', () => goTo(current() + 1));
  thumbs.forEach((thumb, index) => thumb.addEventListener('click', () => goTo(index)));

  // Arrow keys move the stage when the stage itself has focus (not a button or a video inside)
  stage.addEventListener('keydown', (event) => {
    if (event.target !== stage) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goTo(current() - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      goTo(current() + 1);
    }
  });

  // Hover magnifier: scale 2, following the pointer through transform-origin
  for (const slide of slides) {
    const image = slide.querySelector<HTMLImageElement>('[data-media-zoom] img');
    if (!image) continue;
    slide.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'mouse' && canMagnify()) slide.classList.add('is-magnified');
    });
    slide.addEventListener('pointermove', (event) => {
      if (!slide.classList.contains('is-magnified')) return;
      const box = slide.getBoundingClientRect();
      const x = ((event.clientX - box.left) / box.width) * 100;
      const y = ((event.clientY - box.top) / box.height) * 100;
      image.style.setProperty(ORIGIN_PROPERTY, `${x.toFixed(1)}% ${y.toFixed(1)}%`);
    });
    slide.addEventListener('pointerleave', () => {
      slide.classList.remove('is-magnified');
      image.style.removeProperty(ORIGIN_PROPERTY);
    });
  }

  update();
}

export function initProductMedia(): void {
  for (const root of document.querySelectorAll<HTMLElement>('[data-media]')) setup(root);
}
