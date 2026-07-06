// Non-retryable WhatsApp error codes — do not requeue these.
// Used by: campaign-action edge function, FailedRetry.tsx, auto-retry pg_cron.

/** Error codes that should never be retried (the same payload will fail again). */
export const NON_RETRYABLE_CODES = new Set([
  '131026', // Recipient not a WhatsApp user / can't receive
  '131051', // Unsupported message type
  '100',    // Invalid parameter (payload error)
  '368',    // Account temporarily locked
  '131031', // Account restricted
]);

/**
 * Returns true if a failed message with this error code can be retried.
 * - 132xxx codes (template/param errors) are non-retryable — payload is wrong.
 * - Codes in NON_RETRYABLE_CODES are non-retryable.
 * - null/unknown error codes are retryable (transient/unknown failure).
 * - Everything else (billing, rate limits, timeouts) is retryable.
 */
export function isRetryable(errorCode: string | null | undefined): boolean {
  if (!errorCode) return true; // Unknown error → assume retryable
  if (NON_RETRYABLE_CODES.has(errorCode)) return false;
  if (errorCode.startsWith('132')) return false; // Template/param errors
  return true;
}

/** Maximum number of retry attempts per message. */
export const MAX_RETRY_COUNT = 2;
