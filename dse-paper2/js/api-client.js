// dse-paper2/js/api-client.js
// Thin wrapper around the two HTTPS-callable functions: createAttemptSession
// and submitAttempt. Maps the HttpsError.code to our machine-readable codes.

import { httpsCallable } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-functions.js';
import { getFunctionsInstance } from './firebase-init.js';
import { isKnownCode } from './errors.js';

function toAppError(e) {
  if (!e) return { code: 'network-error', message: 'Unknown error' };
  if (e.code && isKnownCode(e.code)) {
    return { code: e.code, message: e.message || e.code };
  }
  // HttpsError codes are strings like "functions/...". Strip prefix.
  const raw = String(e.code || '').replace(/^functions\//, '');
  if (isKnownCode(raw)) return { code: raw, message: e.message || raw };
  return { code: 'network-error', message: e.message || 'network-error' };
}

export async function createAttemptSession({ releaseId }) {
  const fn = httpsCallable(getFunctionsInstance(), 'createAttemptSession');
  try {
    const r = await fn({ releaseId });
    return r.data;
  } catch (e) {
    throw toAppError(e);
  }
}

export async function submitAttempt({ sessionId, releaseId, selectedOptionId, idempotencyKey, submittedAtClient, diagnosticDurationMs }) {
  const fn = httpsCallable(getFunctionsInstance(), 'submitAttempt');
  try {
    const r = await fn({ sessionId, releaseId, selectedOptionId, idempotencyKey, submittedAtClient, diagnosticDurationMs });
    return r.data;
  } catch (e) {
    throw toAppError(e);
  }
}

// Generate a client-side idempotency key: 16 hex chars.
export function makeIdempotencyKey() {
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
}
