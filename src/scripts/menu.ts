/**
 * Header behaviour: shadow after 20px of scroll, and the full-screen menu
 * (focus trap, Esc, scroll lock, focus return, aria-expanded).
 */

const SCROLL_THRESHOLD = 20;
const DESKTOP = '(min-width: 1180px)';
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function initMenu(): void {
  const header = document.querySelector<HTMLElement>('[data-site-header]');
  const menu = document.querySelector<HTMLElement>('[data-menu]');
  const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  if (!header) return;

  // Header shadow after a little scroll
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > SCROLL_THRESHOLD);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  if (!menu || !toggle) return;
  const root = document.documentElement;

  const isOpen = () => menu.classList.contains('is-open');
  const focusables = () =>
    [...menu.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (element) => element.offsetParent !== null || element === document.activeElement,
    );

  const setOpen = (open: boolean, returnFocus = true) => {
    if (open === isOpen()) return;
    menu.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    root.classList.toggle('is-scroll-locked', open);
    if (open) {
      menu.removeAttribute('inert');
      focusables()[0]?.focus();
    } else {
      menu.setAttribute('inert', '');
      if (returnFocus) toggle.focus();
    }
  };

  toggle.addEventListener('click', () => setOpen(!isOpen()));

  menu.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    // The close button, or choosing a link, closes the menu (the link keeps its default action)
    if (event.target.closest('[data-menu-close]')) setOpen(false);
    else if (event.target.closest('[data-menu-close-on-click]')) setOpen(false, false);
  });

  document.addEventListener('keydown', (event) => {
    if (!isOpen()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (event.key !== 'Tab') return;

    // Focus trap: Tab and Shift+Tab cycle inside the menu
    const items = focusables();
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !menu.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !menu.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  });

  // The desktop layout has no menu button: leaving the small layout closes the menu
  window.matchMedia(DESKTOP).addEventListener('change', (event) => {
    if (event.matches) setOpen(false, false);
  });

  // Back/forward cache: never come back to a page with the menu locked open
  window.addEventListener('pageshow', () => setOpen(false, false));
}
