/** Cloudflare Turnstile server check (siteverify). */

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export interface TurnstileCheck {
  secret: string;
  token: string;
  /** The visitor's IP, from the CF-Connecting-IP header. Optional. */
  ip?: string | null;
  fetchFn: typeof fetch;
}

/** true only when Cloudflare confirms the token. Any error counts as a failure. */
export async function verifyTurnstile({
  secret,
  token,
  ip,
  fetchFn,
}: TurnstileCheck): Promise<boolean> {
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set('remoteip', ip);
  try {
    const response = await fetchFn(SITEVERIFY_URL, {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return false;
    const result: unknown = await response.json();
    return (
      typeof result === 'object' &&
      result !== null &&
      'success' in result &&
      result.success === true
    );
  } catch {
    return false;
  }
}
