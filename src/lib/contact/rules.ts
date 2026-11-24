/**
 * Contact form rules (docs/SPEC.md section 8).
 * Plain functions with no dependencies, so the browser and the API use the same rules.
 * The API also validates with Zod (Phase 6), built from these constants.
 */

export const FORM_TYPES = ['order', 'contact', 'event_quote'] as const;
export type FormType = (typeof FORM_TYPES)[number];

export const EVENT_TYPES = [
  'birthday',
  'baby shower',
  'wedding',
  'graduation',
  'gender reveal',
  'corporate',
  'other',
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  birthday: 'Birthday',
  'baby shower': 'Baby shower',
  wedding: 'Wedding',
  graduation: 'Graduation',
  'gender reveal': 'Gender reveal',
  corporate: 'Corporate',
  other: 'Other',
};

export const LIMITS = {
  nameMax: 60,
  phoneDigitsMin: 10,
  phoneDigitsMax: 15,
  emailMax: 120,
  messageMin: 5,
  messageMax: 3000,
  venueCityMax: 80,
} as const;

export const REQUIRED_FIELDS = ['firstName', 'lastName', 'phone', 'email', 'message'] as const;
export const QUOTE_FIELDS = ['eventDate', 'eventType', 'venueCity'] as const;
export type FieldName = (typeof REQUIRED_FIELDS)[number] | (typeof QUOTE_FIELDS)[number];

export type FormValues = Record<FieldName, string>;
export type FieldErrors = Partial<Record<FieldName, string>>;

export const ERROR_MESSAGES: Record<FieldName, string> = {
  firstName: `Please enter your first name (up to ${LIMITS.nameMax} characters).`,
  lastName: `Please enter your last name (up to ${LIMITS.nameMax} characters).`,
  phone: `Please enter a phone number with ${LIMITS.phoneDigitsMin} to ${LIMITS.phoneDigitsMax} digits.`,
  email: 'Please enter a valid email address.',
  message: `Please write a message (${LIMITS.messageMin} to ${LIMITS.messageMax.toLocaleString('en-CA')} characters).`,
  eventDate: 'Please choose a date that is not in the past.',
  eventType: 'Please choose an event type from the list.',
  venueCity: `Please use ${LIMITS.venueCityMax} characters or less.`,
};

/** Simple and permissive on purpose: one @, no spaces, a dot in the domain. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Keeps the digits only: "(226) 978-6720" becomes "2269786720". */
export function phoneDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/** Today's date in Kitchener (America/Toronto), as YYYY-MM-DD. */
export function todayInToronto(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** true for a real calendar date in YYYY-MM-DD form. */
export function isValidDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function lengthBetween(value: string, min: number, max: number): boolean {
  return value.length >= min && value.length <= max;
}

/**
 * Checks one field. Returns the error message, or null when the value is fine.
 * Values are trimmed first. Quote fields are optional: an empty value is fine.
 */
export function validateField(
  name: FieldName,
  rawValue: string,
  today: string = todayInToronto(),
): string | null {
  const value = rawValue.trim();
  const ok = (() => {
    switch (name) {
      case 'firstName':
      case 'lastName':
        return lengthBetween(value, 1, LIMITS.nameMax);
      case 'phone':
        return lengthBetween(phoneDigits(value), LIMITS.phoneDigitsMin, LIMITS.phoneDigitsMax);
      case 'email':
        return value.length <= LIMITS.emailMax && EMAIL_PATTERN.test(value);
      case 'message':
        return lengthBetween(value, LIMITS.messageMin, LIMITS.messageMax);
      case 'eventDate':
        return value === '' || (isValidDate(value) && value >= today);
      case 'eventType':
        return value === '' || (EVENT_TYPES as readonly string[]).includes(value);
      case 'venueCity':
        return value.length <= LIMITS.venueCityMax;
    }
  })();
  return ok ? null : ERROR_MESSAGES[name];
}

/** Checks every field of a form type. Returns only the fields with an error. */
export function validateForm(
  values: Partial<FormValues>,
  type: FormType,
  today: string = todayInToronto(),
): FieldErrors {
  const fields: FieldName[] =
    type === 'event_quote' ? [...REQUIRED_FIELDS, ...QUOTE_FIELDS] : [...REQUIRED_FIELDS];
  const errors: FieldErrors = {};
  for (const field of fields) {
    const error = validateField(field, values[field] ?? '', today);
    if (error) errors[field] = error;
  }
  return errors;
}
