// dse-paper2/functions/src/errors.js
// Stable, machine-readable error codes.
// Frontend maps codes to 繁中 messages; never parses free-form text.

const ERROR_CODES = Object.freeze({
  UNAUTHENTICATED: 'unauthenticated',
  EMAIL_NOT_VERIFIED: 'email-not-verified',
  DOMAIN_NOT_ALLOWED: 'domain-not-allowed',
  MEMBERSHIP_INACTIVE: 'membership-inactive',
  ENTITLEMENT_EXPIRED: 'entitlement-expired',
  RELEASE_NOT_ACTIVE: 'release-not-active',
  RELEASE_REVOKED: 'release-revoked',
  SESSION_EXPIRED: 'session-expired',
  SESSION_ALREADY_SUBMITTED: 'session-already-submitted',
  SESSION_CONFLICT: 'session-conflict',
  IDEMPOTENCY_CONFLICT: 'idempotency-conflict',
  CLIENT_VERSION_UNSUPPORTED: 'client-version-unsupported',
  INVALID_OPTION: 'invalid-option',
  GENERATOR_FAILED: 'generator-failed',
});

class AppError extends Error {
  constructor(code, message, httpStatus = 400) {
    super(message || code);
    this.name = 'AppError';
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

function toHttpsError(err) {
  if (err instanceof AppError) {
    const e = new Error(err.message);
    e.code = err.code;
    e.httpStatus = err.httpStatus;
    return e;
  }
  return err;
}

module.exports = { ERROR_CODES, AppError, toHttpsError };
