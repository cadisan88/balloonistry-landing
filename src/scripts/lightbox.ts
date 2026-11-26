/**
 * The lightbox: one native <dialog> per page (src/components/Lightbox.astro).
 *
 * Openers are any element with `data-lightbox-group="<id>"`. Together they form a gallery,
 * ordered by `data-lightbox-index`. Each describes its item:
 * - an image: `data-full` (the large image URL) and `data-alt`
 * - a video: `data-video` (the file) and `data-poster` (optional), plus `data-alt`
 * Analytics attributes (`data-media-open` and friends) sit on the same element.
 *
 * The viewer is a row of slides: the current one is centred and the neighbours peek in at the
 * sides (clicking a peek goes to it). With two or more items the row wraps around. Each slide sits
 * at an offset from the current one (`--lb-pos`), and CSS slides it there over `--duration-slide`.
 * The dialog gives focus trapping and Esc. This script adds the arrows, keys, swipe, counter,
 * backdrop click, video pause, scroll lock and focus return.
 */

interface MediaItem {
  kind: 'image' | 'video';
  src: string;
  poster?: string;
  alt: string;
}

interface Slide {
  element: HTMLElement;
  item: MediaItem;
  /** The still picture: the photo, or the poster of a video. Made on first need. */
  still?: HTMLElement;
  /** Offset from the current slide the last time it was placed. */
  pos?: number;
}

const SWIPE_PX = 40;

function itemOf(element: HTMLElement): MediaItem | undefined {
  const { video, poster, full, alt = '' } = element.dataset;
  if (video) return { kind: 'video', src: video, ...(poster ? { poster } : {}), alt };
  if (full) return { kind: 'image', src: full, alt };
  return undefined;
}

/** The signed distance of `index` from `current` going round the loop. A tie goes to the right. */
export function slideOffset(index: number, current: number, count: number): number {
  const distance = (((index - current) % count) + count) % count;
  return distance > count / 2 ? distance - count : distance;
}

export function initLightbox(): void {
  const dialog = document.querySelector<HTMLDialogElement>('[data-lightbox]');
  const stage = dialog?.querySelector<HTMLElement>('[data-lightbox-stage]');
  const counter = dialog?.querySelector<HTMLElement>('[data-lightbox-counter]');
  const prev = dialog?.querySelector<HTMLButtonElement>('[data-lightbox-prev]');
  const next = dialog?.querySelector<HTMLButtonElement>('[data-lightbox-next]');
  const close = dialog?.querySelector<HTMLButtonElement>('[data-lightbox-close]');
  if (!dialog || !stage || !counter || !prev || !next || !close) return;

  const root = document.documentElement;
  let slides: Slide[] = [];
  let index = 0;
  let opener: HTMLElement | undefined;

  const stillOf = (slide: Slide): HTMLElement => {
    if (slide.still) return slide.still;
    const { item } = slide;
    const source = item.kind === 'video' ? item.poster : item.src;
    let still: HTMLElement;
    if (source) {
      const image = document.createElement('img');
      image.alt = item.alt;
      image.decoding = 'async';
      image.draggable = false;
      image.src = source;
      still = image;
    } else {
      // A video without a poster: a plain tile until it is the current one
      still = document.createElement('div');
    }
    still.classList.add('lightbox__media');
    slide.still = still;
    return still;
  };

  /** Stops a video and frees it. */
  const release = (video: HTMLVideoElement) => {
    video.pause();
    video.removeAttribute('src');
    video.load();
  };

  /** Puts the right content in a slide: a playing video for the current one, a still otherwise. */
  const fill = (slide: Slide, active: boolean) => {
    const video = slide.element.querySelector('video');
    if (slide.item.kind === 'video' && active) {
      if (video) return;
      const player = document.createElement('video');
      player.className = 'lightbox__media';
      player.controls = true;
      player.playsInline = true;
      player.preload = 'metadata';
      if (slide.item.poster) player.poster = slide.item.poster;
      player.setAttribute('aria-label', slide.item.alt);
      player.src = slide.item.src;
      slide.element.replaceChildren(player);
      // A click opened this, so playing with sound is expected. If the browser refuses, controls stay.
      void player.play().catch(() => undefined);
      return;
    }
    if (video) release(video);
    const still = stillOf(slide);
    if (slide.element.firstChild !== still) slide.element.replaceChildren(still);
  };

  const clearStage = () => {
    for (const video of stage.querySelectorAll('video')) release(video);
    stage.replaceChildren();
    slides = [];
  };

  /** Places every slide relative to the current one. `instant` skips the slide animation. */
  const place = (instant: boolean) => {
    const count = slides.length;
    slides.forEach((slide, position) => {
      const offset = slideOffset(position, index, count);
      const near = Math.abs(offset) <= 1;
      const shown = offset === 0 || (count > 1 && near);
      // A slide that wraps round to the far side must not sweep across the screen
      const jumped = slide.pos !== undefined && Math.abs(offset - slide.pos) > 1;
      slide.element.classList.toggle('is-jump', instant || jumped);
      slide.element.style.setProperty('--lb-pos', String(offset));
      slide.element.classList.toggle('is-current', offset === 0);
      slide.element.classList.toggle('is-peek', shown && offset !== 0);
      slide.element.classList.toggle('is-far', !shown);
      slide.element.setAttribute('aria-hidden', offset === 0 ? 'false' : 'true');
      slide.pos = offset;
      if (near) fill(slide, offset === 0);
      else if (slide.item.kind === 'video') fill(slide, false);
    });
    // Read a layout value so jumps apply at once, then let the slide animation back in
    void stage.offsetWidth;
    for (const slide of slides) slide.element.classList.remove('is-jump');
  };

  const show = (target: number, instant = false) => {
    const count = slides.length;
    if (count === 0) return;
    index = (target + count) % count;
    place(instant);
    counter.textContent = `${index + 1} / ${count}`;
    // Warm the cache for the next arrow presses
    for (const offset of [-2, 2]) {
      const far = slides[(index + offset + count) % count];
      if (far?.item.kind === 'image') new Image().src = far.item.src;
    }
  };

  const open = (from: HTMLElement) => {
    const group = from.dataset.lightboxGroup;
    if (!group) return;
    const openers = [...document.querySelectorAll<HTMLElement>('[data-lightbox-group]')].filter(
      (element) => element.dataset.lightboxGroup === group,
    );
    openers.sort(
      (a, b) => Number(a.dataset.lightboxIndex ?? 0) - Number(b.dataset.lightboxIndex ?? 0),
    );
    const entries = openers.flatMap((element) => {
      const item = itemOf(element);
      return item ? [{ element, item }] : [];
    });
    const start = entries.findIndex((entry) => entry.element === from);
    if (start < 0) return;

    clearStage();
    slides = entries.map((entry, position) => {
      const element = document.createElement('div');
      element.className = 'lightbox__slide';
      element.dataset.lightboxSlide = String(position);
      return { element, item: entry.item };
    });
    for (const slide of slides) stage.appendChild(slide.element);

    opener = from;
    const single = slides.length < 2;
    prev.hidden = single;
    next.hidden = single;
    counter.hidden = single;

    root.classList.add('is-scroll-locked');
    dialog.showModal();
    show(start, true);
  };

  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element) || dialog.open) return;
    const from = event.target.closest<HTMLElement>('[data-lightbox-group]');
    if (!from) return;
    event.preventDefault();
    open(from);
  });

  prev.addEventListener('click', () => show(index - 1));
  next.addEventListener('click', () => show(index + 1));
  close.addEventListener('click', () => dialog.close());

  // ----- Swipe (touch, pen and mouse drag) -----

  let startX: number | undefined;
  let startY = 0;
  let swiped = false;

  stage.addEventListener('pointerdown', (event) => {
    // Video controls use drags for the seek bar and the volume
    if (event.target instanceof HTMLVideoElement || slides.length < 2) return;
    startX = event.clientX;
    startY = event.clientY;
    swiped = false;
  });

  stage.addEventListener('pointerup', (event) => {
    if (startX === undefined) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    startX = undefined;
    if (Math.abs(dx) >= SWIPE_PX && Math.abs(dx) > Math.abs(dy)) {
      swiped = true;
      show(index + (dx < 0 ? 1 : -1));
    }
  });

  stage.addEventListener('pointercancel', () => {
    startX = undefined;
  });

  // A click on a peek goes to it. The empty space and the backdrop close the viewer.
  dialog.addEventListener('click', (event) => {
    if (swiped) {
      // The click that ends a swipe is not a tap
      swiped = false;
      return;
    }
    if (!(event.target instanceof Element)) return;
    const slide = event.target.closest<HTMLElement>('[data-lightbox-slide]');
    if (slide) {
      const position = Number(slide.dataset.lightboxSlide);
      if (position !== index && slide.classList.contains('is-peek')) show(position);
      return;
    }
    if (event.target === dialog || event.target === stage) dialog.close();
  });

  dialog.addEventListener('keydown', (event) => {
    if (slides.length < 2 || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
    // The arrow keys belong to the video controls (seeking) while they have focus
    if (event.target instanceof HTMLVideoElement) return;
    event.preventDefault();
    show(index + (event.key === 'ArrowRight' ? 1 : -1));
  });

  // Esc, the close button and the backdrop all end here
  dialog.addEventListener('close', () => {
    // The close event comes a moment after the dialog closes. If the viewer was opened again
    // in between, this event is stale: the new slides, scroll lock and opener must stay.
    if (dialog.open) return;
    clearStage();
    root.classList.remove('is-scroll-locked');
    opener?.focus();
    opener = undefined;
  });

  // Back/forward cache: never come back to a locked page
  window.addEventListener('pageshow', () => {
    if (!dialog.open) root.classList.remove('is-scroll-locked');
  });
}
