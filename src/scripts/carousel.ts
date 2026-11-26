/**
 * Carousel behaviour (Client love).
 * Auto-advance every `data-autoplay-ms`, prev/next, dots and a Pause/Play icon button.
 * Autoplay stops while the mouse is over it, while focus is inside it, while the tab is hidden
 * and always under prefers-reduced-motion (the buttons still work).
 */
import { wrapIndex } from '../lib/carousel';

const REDUCED = '(prefers-reduced-motion: reduce)';

function setup(root: HTMLElement): () => void {
  const slides = [...root.querySelectorAll<HTMLElement>('[data-carousel-slide]')];
  const dots = [...root.querySelectorAll<HTMLElement>('[data-carousel-dot]')];
  const prev = root.querySelector<HTMLButtonElement>('[data-carousel-prev]');
  const next = root.querySelector<HTMLButtonElement>('[data-carousel-next]');
  const toggle = root.querySelector<HTMLButtonElement>('[data-carousel-toggle]');
  const live = root.querySelector<HTMLElement>('[data-carousel-slides]');
  const delay = Number(root.dataset.autoplayMs);
  if (slides.length < 2 || !prev || !next || !toggle || !live) return () => {};

  const motion = window.matchMedia(REDUCED);
  let index = 0;
  let timer: number | undefined;
  let userPaused = false;
  let hovered = false;
  let focused = false;

  const autoplayAllowed = () => Number.isFinite(delay) && delay > 0 && !motion.matches;
  const playing = () =>
    autoplayAllowed() && !userPaused && !hovered && !focused && !document.hidden;

  const stop = () => {
    window.clearTimeout(timer);
    timer = undefined;
  };

  const schedule = () => {
    stop();
    if (playing()) timer = window.setTimeout(() => show(index + 1), delay);
  };

  const render = () => {
    slides.forEach((slide, i) => slide.classList.toggle('is-active', i === index));
    dots.forEach((dot, i) => {
      if (i === index) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
  };

  // Screen readers hear a slide change only when the person is driving, never during autoplay
  const syncState = () => {
    live.setAttribute('aria-live', playing() ? 'off' : 'polite');
    toggle.hidden = !autoplayAllowed();
    // The icon follows data-state (CSS); the accessible name says what a press will do
    toggle.dataset.state = userPaused ? 'paused' : 'playing';
    toggle.setAttribute(
      'aria-label',
      userPaused ? 'Play automatic reviews' : 'Pause automatic reviews',
    );
    schedule();
  };

  function show(target: number) {
    index = wrapIndex(target, slides.length);
    render();
    schedule();
  }

  const onPrev = () => show(index - 1);
  const onNext = () => show(index + 1);
  const onToggle = () => {
    userPaused = !userPaused;
    // Choosing Play means play: focus resting on the button must not hold it back
    if (!userPaused) focused = false;
    syncState();
  };
  const dotHandlers = dots.map((_, i) => () => show(i));
  const onPointerEnter = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    hovered = true;
    syncState();
  };
  const onPointerLeave = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    hovered = false;
    syncState();
  };
  const onFocusIn = () => {
    focused = true;
    syncState();
  };
  const onFocusOut = (event: FocusEvent) => {
    if (event.relatedTarget instanceof Node && root.contains(event.relatedTarget)) return;
    focused = false;
    syncState();
  };
  const onVisibility = () => syncState();

  prev.addEventListener('click', onPrev);
  next.addEventListener('click', onNext);
  toggle.addEventListener('click', onToggle);
  dots.forEach((dot, i) => {
    const handler = dotHandlers[i];
    if (handler) dot.addEventListener('click', handler);
  });
  root.addEventListener('pointerenter', onPointerEnter);
  root.addEventListener('pointerleave', onPointerLeave);
  root.addEventListener('focusin', onFocusIn);
  root.addEventListener('focusout', onFocusOut);
  document.addEventListener('visibilitychange', onVisibility);
  motion.addEventListener('change', syncState);

  render();
  syncState();

  return () => {
    stop();
    document.removeEventListener('visibilitychange', onVisibility);
    motion.removeEventListener('change', syncState);
  };
}

export function initCarousels(): void {
  const cleanups: (() => void)[] = [];
  document.querySelectorAll<HTMLElement>('[data-carousel]').forEach((root) => {
    if (root.dataset.ready) return;
    root.dataset.ready = 'true';
    cleanups.push(setup(root));
  });
  if (cleanups.length === 0) return;

  // Clear the timers when the page goes away (view transition swap, or leaving the page)
  const destroy = () => {
    cleanups.splice(0).forEach((cleanup) => cleanup());
  };
  document.addEventListener('astro:before-swap', destroy, { once: true });
  window.addEventListener('pagehide', destroy, { once: true });
  // Back/forward cache: the page returns alive, so start again
  window.addEventListener(
    'pageshow',
    (event) => {
      if (!event.persisted) return;
      document.querySelectorAll<HTMLElement>('[data-carousel]').forEach((root) => {
        delete root.dataset.ready;
      });
      initCarousels();
    },
    { once: true },
  );
}
