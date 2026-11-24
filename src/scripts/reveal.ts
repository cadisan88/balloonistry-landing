/**
 * Scroll animations (docs/STYLE_GUIDE.md, "Motion").
 * Adds the `in-view` class once, when 15% of the element enters the viewport.
 * CSS does the rest: `.zoom-out` (image zoom-out) and `.reveal` (fade and move up).
 * With reduced motion or without IntersectionObserver, everything is visible right away.
 */

const SELECTOR = '.zoom-out, .reveal';

export function initReveal(): void {
  const elements = document.querySelectorAll<HTMLElement>(SELECTOR);
  if (elements.length === 0) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion || !('IntersectionObserver' in window)) {
    elements.forEach((element) => element.classList.add('in-view'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.15 },
  );

  elements.forEach((element) => observer.observe(element));
}
