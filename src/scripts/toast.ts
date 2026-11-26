/**
 * Short message at the bottom of the screen. The element lives in BaseLayout.
 * It is a manual popover, so it sits in the top layer above an open dialog
 * (the quote drawer, the channel sheet). Without popover support it still shows, below dialogs.
 * It can carry one button, for example "View list".
 */

const VISIBLE_MS = 4000;
const VISIBLE_WITH_ACTION_MS = 7000;
const FADE_MS = 300;

export interface ToastAction {
  label: string;
  /** Attributes for the button, for example data attributes that analytics reads. */
  attributes?: Record<string, string>;
}

let timer: number | undefined;
let hideTimer: number | undefined;

function popoverOpen(toast: HTMLElement): boolean {
  return typeof toast.showPopover === 'function' && toast.matches(':popover-open');
}

function hide(toast: HTMLElement): void {
  window.clearTimeout(timer);
  toast.classList.remove('is-visible');
  hideTimer = window.setTimeout(() => {
    if (popoverOpen(toast)) toast.hidePopover();
  }, FADE_MS);
}

export function showToast(text: string, action?: ToastAction): void {
  const toast = document.querySelector<HTMLElement>('[data-toast]');
  if (!toast) return;
  window.clearTimeout(timer);
  window.clearTimeout(hideTimer);

  // Hide and show again: the toast goes to the front of the top layer, above any open dialog
  toast.classList.remove('is-visible');
  if (typeof toast.showPopover === 'function') {
    if (popoverOpen(toast)) toast.hidePopover();
    toast.showPopover();
  }

  const message = document.createElement('span');
  message.textContent = text;
  toast.replaceChildren(message);
  toast.classList.toggle('has-action', Boolean(action));
  if (action) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'toast__action';
    button.textContent = action.label;
    for (const [name, value] of Object.entries(action.attributes ?? {})) {
      button.setAttribute(name, value);
    }
    // The click is handled by whatever the attributes point to. The toast just gets out of the way.
    button.addEventListener('click', () => hide(toast));
    toast.appendChild(button);
  }

  window.requestAnimationFrame(() => toast.classList.add('is-visible'));
  timer = window.setTimeout(() => hide(toast), action ? VISIBLE_WITH_ACTION_MS : VISIBLE_MS);
}
