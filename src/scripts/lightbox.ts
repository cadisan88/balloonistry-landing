/**
 * The lightbox: one native <dialog> per page (src/components/Lightbox.astro).
 *
 * Openers are any element with `data-lightbox-group="<id>"`. Together they form a gallery,
 * ordered by `data-lightbox-index`. Each describes its item:
 * - an image: `data-full` (the large image URL) and `data-alt`
 * - a video: `data-video` (the file) and `data-poster` (optional), plus `data-alt`
 * Analytics attributes (`data-media-open` and friends) sit on the same element.
 *
 * The dialog gives focus trapping and Esc. This script adds the arrows, the counter,
 * the backdrop click, video pause, scroll lock and focus return.
 */

interface MediaItem {
  kind: 'image' | 'video';
  src: string;
  poster?: string;
  alt: string;
}

function itemOf(element: HTMLElement): MediaItem | undefined {
  const { video, poster, full, alt = '' } = element.dataset;
  if (video) return { kind: 'video', src: video, ...(poster ? { poster } : {}), alt };
  if (full) return { kind: 'image', src: full, alt };
  return undefined;
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
  let items: MediaItem[] = [];
  let index = 0;
  let opener: HTMLElement | undefined;

  /** Stops a playing video and frees it. */
  const clearStage = () => {
    const video = stage.querySelector('video');
    if (video) {
      video.pause();
      video.removeAttribute('src');
      video.load();
    }
    stage.replaceChildren();
  };

  const show = (target: number) => {
    const count = items.length;
    index = (target + count) % count;
    const item = items[index];
    if (!item) return;
    clearStage();

    if (item.kind === 'video') {
      const video = document.createElement('video');
      video.controls = true;
      video.playsInline = true;
      video.preload = 'metadata';
      if (item.poster) video.poster = item.poster;
      video.setAttribute('aria-label', item.alt);
      video.src = item.src;
      stage.appendChild(video);
      // A click opened this, so playing with sound is expected. If the browser refuses, controls stay.
      void video.play().catch(() => undefined);
    } else {
      const image = document.createElement('img');
      image.alt = item.alt;
      image.decoding = 'async';
      image.src = item.src;
      stage.appendChild(image);
    }

    counter.textContent = `${index + 1} / ${count}`;
    // Warm the cache for the neighbours, so the arrows feel instant
    for (const offset of [-1, 1]) {
      const neighbour = items[(index + offset + count) % count];
      if (neighbour?.kind === 'image') new Image().src = neighbour.src;
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

    items = entries.map((entry) => entry.item);
    opener = from;
    const single = items.length < 2;
    prev.hidden = single;
    next.hidden = single;
    counter.hidden = single;

    root.classList.add('is-scroll-locked');
    dialog.showModal();
    show(start);
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

  // The backdrop and the empty space around the media land on the dialog or the stage itself
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog || event.target === stage) dialog.close();
  });

  dialog.addEventListener('keydown', (event) => {
    if (items.length < 2 || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
    // The arrow keys belong to the video controls (seeking) while they have focus
    if (event.target instanceof HTMLVideoElement) return;
    event.preventDefault();
    show(index + (event.key === 'ArrowRight' ? 1 : -1));
  });

  // Esc, the close button and the backdrop all end here
  dialog.addEventListener('close', () => {
    clearStage();
    items = [];
    root.classList.remove('is-scroll-locked');
    opener?.focus();
    opener = undefined;
  });

  // Back/forward cache: never come back to a locked page
  window.addEventListener('pageshow', () => {
    if (!dialog.open) root.classList.remove('is-scroll-locked');
  });
}
