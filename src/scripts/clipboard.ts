/**
 * Copy text to the clipboard. Call it straight from a click handler: the copy starts
 * synchronously, so the click still counts as a user gesture for what comes next.
 */

/** Old way: select the text in a hidden textarea and run the copy command. */
function copyWithSelection(text: string): boolean {
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.setAttribute('aria-hidden', 'true');
  area.className = 'clipboard-fallback';
  // Off screen, but real: hidden elements cannot be selected
  area.style.setProperty('position', 'fixed');
  area.style.setProperty('top', '0');
  area.style.setProperty('left', '-9999px');
  const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  // Inside a modal dialog the textarea must be a child of the dialog, or it cannot be selected
  const host = document.querySelector('dialog[open]') ?? document.body;
  host.appendChild(area);
  try {
    area.focus({ preventScroll: true });
    area.select();
    area.setSelectionRange(0, text.length);
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    area.remove();
    previous?.focus({ preventScroll: true });
  }
}

/** Resolves true when the text was copied, false when every way failed. Never rejects. */
export function copyText(text: string): Promise<boolean> {
  if (typeof navigator.clipboard?.writeText === 'function') {
    return navigator.clipboard.writeText(text).then(
      () => true,
      () => copyWithSelection(text),
    );
  }
  return Promise.resolve(copyWithSelection(text));
}
