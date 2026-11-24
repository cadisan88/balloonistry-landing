/**
 * Server validation of the contact request with Zod (docs/ARCHITECTURE.md section 5).
 * The field rules come from rules.ts, so the browser and the API always agree.
 */
import { z } from 'astro/zod';
import { ERROR_MESSAGES, FORM_TYPES, validateField, type FieldName } from './rules';

/** Slug of a product file, for example "hot-air-balloon". */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** A path on this site, for example "/products/hot-air-balloon/". */
const PATH_PATTERN = /^\/[^\s]*$/;

export function contactSchema(today: string) {
  const required = (name: FieldName) =>
    z
      .string({ error: ERROR_MESSAGES[name] })
      .trim()
      .refine((value) => validateField(name, value, today) === null, {
        error: ERROR_MESSAGES[name],
      });

  // Empty optional fields become undefined
  const optional = (name: FieldName) =>
    required(name)
      .optional()
      .transform((value) => (value === '' ? undefined : value));

  return z.object({
    type: z.enum(FORM_TYPES, { error: 'Unknown form type.' }),
    firstName: required('firstName'),
    lastName: required('lastName'),
    phone: required('phone'),
    email: required('email'),
    message: required('message'),
    product: z.string().max(100).regex(SLUG_PATTERN, { error: 'Unknown product.' }).optional(),
    eventDate: optional('eventDate'),
    eventType: optional('eventType'),
    venueCity: optional('venueCity'),
    source: z.string().max(300).regex(PATH_PATTERN, { error: 'Unknown page.' }).optional(),
    company: z.string().max(500).optional(),
    startedAt: z.number(),
    turnstileToken: z
      .string({ error: 'Please complete the security check.' })
      .min(1, { error: 'Please complete the security check.' })
      .max(4096),
  });
}

export type ContactRequest = z.infer<ReturnType<typeof contactSchema>>;

export type ParseResult =
  { ok: true; data: ContactRequest } | { ok: false; errors: Record<string, string> };

/** Validates the parsed JSON body. Errors have one message per field. */
export function parseContact(data: unknown, today: string): ParseResult {
  const result = contactSchema(today).safeParse(data);
  if (result.success) return { ok: true, data: result.data };

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = typeof issue.path[0] === 'string' ? issue.path[0] : 'form';
    errors[field] ??= issue.message;
  }
  return { ok: false, errors };
}
