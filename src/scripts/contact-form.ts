/**
 * Contact form behaviour (docs/SPEC.md section 8):
 * validation on blur and on submit, Turnstile, sending to /api/contact, success and error states.
 * The form never stores anything. Nothing here logs what people type.
 */
import {
  QUOTE_FIELDS,
  REQUIRED_FIELDS,
  todayInToronto,
  validateField,
  type FieldErrors,
  type FieldName,
  type FormType,
} from '../lib/contact/rules';
import { track } from '../lib/analytics';

const API_URL = '/api/contact';
const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const SENDING_LABEL = 'Sending...';
const WAIT_FOR_CHECK = 'Please wait a moment for the security check to finish, then send again.';

/* ---------- Turnstile (loaded once, only when a form comes near the screen) ---------- */

interface TurnstileApi {
  render(container: HTMLElement, options: Record<string, unknown>): string;
  getResponse(widgetId: string): string | undefined;
  reset(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let turnstileLoading: Promise<TurnstileApi> | undefined;

function loadTurnstile(): Promise<TurnstileApi> {
  turnstileLoading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = TURNSTILE_SRC;
    script.async = true;
    script.addEventListener('load', () =>
      window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile missing')),
    );
    script.addEventListener('error', () => reject(new Error('Turnstile failed to load')));
    document.head.appendChild(script);
  });
  return turnstileLoading;
}

/* ---------- One form ---------- */

class ContactFormController {
  private readonly form: HTMLFormElement;
  private readonly type: FormType;
  private readonly product: string | undefined;
  private readonly fields: FieldName[];
  private readonly submit: HTMLButtonElement;
  private readonly submitLabel: HTMLElement;
  private readonly status: HTMLElement;
  private readonly errorBox: HTMLElement;
  private readonly success: HTMLElement;
  private readonly turnstileBox: HTMLElement | null;
  private turnstile: TurnstileApi | undefined;
  private widgetId: string | undefined;
  private readonly startedAt = Date.now();
  /** Time of the first keystroke, for form_started and time_to_submit_s. */
  private firstInputAt: number | undefined;
  private sending = false;

  constructor(private readonly root: HTMLElement) {
    const form = root.querySelector<HTMLFormElement>('[data-form]');
    const submit = root.querySelector<HTMLButtonElement>('[data-submit]');
    const submitLabel = root.querySelector<HTMLElement>('[data-submit-label]');
    const status = root.querySelector<HTMLElement>('[data-form-status]');
    const errorBox = root.querySelector<HTMLElement>('[data-form-error]');
    const success = root.querySelector<HTMLElement>('[data-form-success]');
    if (!form || !submit || !submitLabel || !status || !errorBox || !success) {
      throw new Error('Contact form markup is incomplete');
    }
    this.form = form;
    this.submit = submit;
    this.submitLabel = submitLabel;
    this.status = status;
    this.errorBox = errorBox;
    this.success = success;
    this.turnstileBox = root.querySelector<HTMLElement>('[data-turnstile]');
    this.product = root.dataset.product || undefined;
    this.type = (root.dataset.formType as FormType | undefined) ?? 'contact';
    this.fields =
      this.type === 'event_quote' ? [...REQUIRED_FIELDS, ...QUOTE_FIELDS] : [...REQUIRED_FIELDS];
  }

  init(): void {
    // form_started: the first input in this form (the pre-filled message does not count)
    this.form.addEventListener('input', () => {
      if (this.firstInputAt !== undefined) return;
      this.firstInputAt = Date.now();
      track('form_started', { form_type: this.type, product: this.product });
    });

    this.form.addEventListener('submit', (event) => {
      event.preventDefault();
      void this.send();
    });

    // Validate a field when it loses focus, once it has a value or an error
    for (const name of this.fields) {
      const control = this.control(name);
      control?.addEventListener('blur', () => {
        if (control.value.trim() !== '' || control.getAttribute('aria-invalid') === 'true') {
          this.showFieldError(name, validateField(name, control.value));
        }
      });
      // Clear the error while the visitor fixes the field
      control?.addEventListener('input', () => {
        if (control.getAttribute('aria-invalid') !== 'true') return;
        if (!validateField(name, control.value)) this.showFieldError(name, null);
      });
    }

    // The date picker cannot go before today
    const date = this.form.querySelector<HTMLInputElement>('[data-min-today]');
    if (date) date.min = todayInToronto();

    this.watchForTurnstile();
  }

  private control(name: string): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null {
    const element = this.form.elements.namedItem(name);
    return element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLSelectElement
      ? element
      : null;
  }

  private value(name: string): string {
    return this.control(name)?.value.trim() ?? '';
  }

  /* ----- Turnstile ----- */

  private watchForTurnstile(): void {
    const box = this.turnstileBox;
    if (!box?.dataset.sitekey) return;
    const start = () => {
      observer?.disconnect();
      this.root.removeEventListener('focusin', start);
      void this.renderTurnstile(box);
    };
    const observer =
      'IntersectionObserver' in window
        ? new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && start(), {
            rootMargin: '400px',
          })
        : undefined;
    if (observer) observer.observe(this.root);
    else start();
    this.root.addEventListener('focusin', start);
  }

  private async renderTurnstile(box: HTMLElement): Promise<void> {
    if (this.widgetId !== undefined) return;
    try {
      this.turnstile = await loadTurnstile();
      this.widgetId = this.turnstile.render(box, {
        sitekey: box.dataset.sitekey,
        action: this.type,
        theme: 'light',
      });
    } catch {
      // The submit shows a message if there is no token. The phone channels still work.
    }
  }

  private turnstileToken(): string {
    if (!this.turnstile || this.widgetId === undefined) return '';
    return this.turnstile.getResponse(this.widgetId) ?? '';
  }

  private resetTurnstile(): void {
    if (this.turnstile && this.widgetId !== undefined) this.turnstile.reset(this.widgetId);
  }

  /* ----- Errors ----- */

  private showFieldError(name: FieldName, message: string | null): void {
    const control = this.control(name);
    if (!control) return;
    const error = this.form.querySelector<HTMLElement>(`#${CSS.escape(control.id)}-error`);
    if (message) control.setAttribute('aria-invalid', 'true');
    else control.removeAttribute('aria-invalid');
    if (error) error.textContent = message ?? '';
  }

  /** Shows every error and moves focus to the first invalid field. */
  private showErrors(errors: FieldErrors): void {
    for (const name of this.fields) this.showFieldError(name, errors[name] ?? null);
    const first = this.fields.find((name) => errors[name]);
    if (first) this.control(first)?.focus();
  }

  private setStatus(text: string): void {
    this.status.textContent = text;
  }

  /* ----- Sending ----- */

  private setSending(sending: boolean): void {
    this.sending = sending;
    this.submit.disabled = sending;
    this.submitLabel.dataset.label ??= this.submitLabel.textContent ?? '';
    this.submitLabel.textContent = sending ? SENDING_LABEL : this.submitLabel.dataset.label;
  }

  private payload(token: string): Record<string, string | number> {
    const body: Record<string, string | number> = {
      type: this.type,
      firstName: this.value('firstName'),
      lastName: this.value('lastName'),
      phone: this.value('phone'),
      email: this.value('email'),
      message: this.value('message'),
      source: this.value('source'),
      company: this.control('company')?.value ?? '',
      startedAt: this.startedAt,
      turnstileToken: token,
    };
    // Optional fields are sent only when they have a value
    for (const name of ['product', ...QUOTE_FIELDS]) {
      const value = this.value(name);
      if (value) body[name] = value;
    }
    return body;
  }

  private async send(): Promise<void> {
    if (this.sending) return;
    this.setStatus('');
    this.errorBox.hidden = true;

    const values = Object.fromEntries(this.fields.map((name) => [name, this.value(name)]));
    const errors: FieldErrors = {};
    for (const name of this.fields) {
      const error = validateField(name, values[name] ?? '');
      if (error) errors[name] = error;
    }
    this.showErrors(errors);
    if (Object.keys(errors).length > 0) {
      track('form_validation_error', { form_type: this.type, fields: Object.keys(errors) });
      return;
    }

    const token = this.turnstileToken();
    if (!token) {
      this.setStatus(WAIT_FOR_CHECK);
      if (this.turnstileBox) void this.renderTurnstile(this.turnstileBox);
      return;
    }

    this.setSending(true);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.payload(token)),
      });
      if (response.ok) {
        track('form_submitted', {
          form_type: this.type,
          product: this.product,
          time_to_submit_s: Math.round((Date.now() - (this.firstInputAt ?? this.startedAt)) / 1000),
        });
        this.showSuccess();
        return;
      }
      if (response.status === 422) {
        const data: unknown = await response.json().catch(() => null);
        const serverErrors =
          data && typeof data === 'object' && 'errors' in data ? (data.errors as FieldErrors) : {};
        this.showErrors(serverErrors);
        // Field names only, never the values
        track('form_validation_error', { form_type: this.type, fields: Object.keys(serverErrors) });
        this.resetTurnstile();
        return;
      }
      this.showFailure(response.status);
    } catch {
      this.showFailure('network');
    } finally {
      this.setSending(false);
    }
  }

  private showSuccess(): void {
    this.form.hidden = true;
    this.success.hidden = false;
    this.success.focus();
  }

  private showFailure(status: number | 'network'): void {
    track('form_failed', { form_type: this.type, status });
    this.resetTurnstile();
    this.errorBox.hidden = false;
    this.errorBox.querySelector<HTMLElement>('a')?.focus();
  }
}

export function initContactForms(): void {
  for (const root of document.querySelectorAll<HTMLElement>('[data-contact-form]')) {
    if (root.dataset.ready) continue;
    root.dataset.ready = 'true';
    new ContactFormController(root).init();
  }
}
