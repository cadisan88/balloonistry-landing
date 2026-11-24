/**
 * Header behaviour: solid background after 20px of scroll, the mobile menu,
 * and the "More" submenu (click, hover on desktop, Esc to close).
 */

const SCROLL_THRESHOLD = 20;
const DESKTOP_HOVER = '(min-width: 860px) and (hover: hover)';

export function initMenu(): void {
  const header = document.querySelector<HTMLElement>('[data-site-header]');
  if (!header) return;

  const toggle = header.querySelector<HTMLButtonElement>('[data-nav-toggle]');
  const groups = [...header.querySelectorAll<HTMLElement>('[data-nav-group]')];
  const groupButton = (group: HTMLElement) =>
    group.querySelector<HTMLButtonElement>('[data-nav-group-button]');

  const setExpanded = (button: HTMLButtonElement | null, open: boolean) => {
    button?.setAttribute('aria-expanded', String(open));
  };
  const isExpanded = (button: HTMLButtonElement | null) =>
    button?.getAttribute('aria-expanded') === 'true';

  const closeGroups = () => groups.forEach((group) => setExpanded(groupButton(group), false));

  const setMenuOpen = (open: boolean) => {
    setExpanded(toggle, open);
    header.classList.toggle('is-open', open);
    if (!open) closeGroups();
  };

  // Solid header after a little scroll
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > SCROLL_THRESHOLD);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Mobile menu
  toggle?.addEventListener('click', () => setMenuOpen(!isExpanded(toggle)));

  // "More" submenu
  const hover = window.matchMedia(DESKTOP_HOVER);
  for (const group of groups) {
    const button = groupButton(group);
    button?.addEventListener('click', (event) => {
      // With a mouse on desktop, hover has already opened the menu: a click keeps it open.
      // Keyboard "clicks" (detail 0) and touch always toggle.
      const mouseOnDesktop = hover.matches && event.detail > 0;
      setExpanded(button, mouseOnDesktop ? true : !isExpanded(button));
    });
    group.addEventListener('mouseenter', () => {
      if (hover.matches) setExpanded(button, true);
    });
    group.addEventListener('mouseleave', () => {
      if (hover.matches) setExpanded(button, false);
    });
    // Close when keyboard focus leaves the group
    group.addEventListener('focusout', (event) => {
      const next = event.relatedTarget;
      if (next instanceof Node && group.contains(next)) return;
      if (hover.matches || next instanceof Node) setExpanded(button, false);
    });
  }

  // Esc closes any open menu and returns focus to its button
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const openGroup = groups.find((group) => isExpanded(groupButton(group)));
    if (openGroup) {
      const button = groupButton(openGroup);
      setExpanded(button, false);
      button?.focus();
      return;
    }
    if (isExpanded(toggle)) {
      setMenuOpen(false);
      toggle?.focus();
    }
  });

  // A click outside the header closes everything
  document.addEventListener('click', (event) => {
    if (event.target instanceof Node && header.contains(event.target)) return;
    closeGroups();
    if (isExpanded(toggle)) setMenuOpen(false);
  });

  // Leaving the mobile layout resets the menu
  window.matchMedia('(min-width: 860px)').addEventListener('change', () => setMenuOpen(false));
}
