/**
 * Optional Telegram alert (docs/ARCHITECTURE.md section 5, "Telegram").
 * Plain text only: no parse mode, so nothing needs escaping.
 */
import { EVENT_TYPE_LABELS, type EventType, type FormType } from './rules';
import { fullName } from './email';
import type { ContactRequest } from './validation';

export const TELEGRAM_MESSAGE_PREVIEW = 200;

const TYPE_LABELS: Record<FormType, string> = {
  order: 'Order',
  contact: 'Question',
  event_quote: 'Event quote',
};

export function buildTelegramText(request: ContactRequest, productName?: string): string {
  const lines = [
    `New ${TYPE_LABELS[request.type]} from the website`,
    fullName(request),
    request.phone,
  ];
  if (request.product) lines.push(`Product: ${productName ?? request.product}`);
  if (request.eventType) {
    lines.push(`Event type: ${EVENT_TYPE_LABELS[request.eventType as EventType]}`);
  }
  const message =
    request.message.length > TELEGRAM_MESSAGE_PREVIEW
      ? `${request.message.slice(0, TELEGRAM_MESSAGE_PREVIEW)}…`
      : request.message;
  lines.push('', message);
  return lines.join('\n');
}

/** Sends the alert. Throws on any failure; the caller only logs it. */
export async function sendTelegram(
  token: string,
  chatId: string,
  text: string,
  fetchFn: typeof fetch,
): Promise<void> {
  const response = await fetchFn(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`Telegram answered ${response.status}`);
}
