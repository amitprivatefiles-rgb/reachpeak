/**
 * errorClassifier.ts — Maps Meta error codes to actionable buckets.
 * Used by: whatsapp-webhook (status handler), worker (send failures),
 *          partner-send (pre-send validation).
 *
 * Each bucket implies a different merchant action:
 *   invalid_number     → remove from list
 *   not_on_whatsapp    → suppress after N bounces
 *   user_blocked       → contact blocked you
 *   no_service_window  → need a template, not freeform
 *   template_paused    → template quality issue
 *   template_rejected  → template was rejected
 *   rate_limited       → slow down, retry later
 *   quality_restricted → WABA quality issue, Meta throttling
 *   transient          → retry safe
 *   unknown            → investigate
 */

const ERROR_MAP: Record<string, string> = {
  // Not on WhatsApp / invalid number
  '131026': 'not_on_whatsapp',
  '131047': 'not_on_whatsapp',
  '131051': 'invalid_number',
  '131021': 'invalid_number',
  '100':    'invalid_number',

  // Rate limiting
  '130429': 'rate_limited',
  '131048': 'rate_limited',
  '131056': 'rate_limited',

  // Quality / account restricted
  '131057': 'quality_restricted',
  '131031': 'quality_restricted',
  '368':    'user_blocked',

  // Service window
  '470':    'no_service_window',
  '131027': 'no_service_window',

  // Worker-internal codes
  'STALE_CLAIM':    'transient',
  'NETWORK_ERROR':  'transient',
  'ACCOUNT_NOT_FOUND': 'transient',
  'MAX_RETRIES':    'transient',
};

/** Codes that should never be retried */
export const HARD_BOUNCE_BUCKETS = new Set([
  'invalid_number',
  'not_on_whatsapp',
  'user_blocked',
]);

/** Codes where the message will never succeed (don't retry) */
export const PERMANENT_FAILURE_BUCKETS = new Set([
  ...HARD_BOUNCE_BUCKETS,
  'template_paused',
  'template_rejected',
  'quality_restricted',
]);

export function classifyError(code: string | null | undefined): string {
  if (!code) return 'unknown';
  const c = String(code);
  if (ERROR_MAP[c]) return ERROR_MAP[c];
  if (c.startsWith('132')) return 'template_paused';
  return 'unknown';
}
