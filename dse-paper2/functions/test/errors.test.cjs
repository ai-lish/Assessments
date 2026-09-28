// dse-paper2/functions/test/errors.test.cjs
// Unit tests for error code constants and AppError class.

const test = require('node:test');
const assert = require('node:assert/strict');
const { ERROR_CODES, AppError, toHttpsError } = require('../src/errors');

test('ERROR_CODES includes all required codes', () => {
  const required = [
    'unauthenticated', 'email-not-verified', 'domain-not-allowed',
    'membership-inactive', 'entitlement-expired', 'release-not-active',
    'release-revoked', 'session-expired', 'session-already-submitted',
    'session-conflict', 'idempotency-conflict', 'client-version-unsupported',
    'invalid-option', 'generator-failed',
  ];
  for (const code of required) {
    assert.equal(typeof ERROR_CODES[code.toUpperCase().replace(/-/g, '_')], 'string');
    assert.equal(ERROR_CODES[code.toUpperCase().replace(/-/g, '_')], code);
  }
});

test('AppError carries code, message, and httpStatus', () => {
  const e = new AppError('invalid-option', 'bad option', 400);
  assert.equal(e.code, 'invalid-option');
  assert.equal(e.message, 'bad option');
  assert.equal(e.httpStatus, 400);
  assert.equal(e.name, 'AppError');
});

test('toHttpsError returns AppError-equivalent shape', () => {
  const e = new AppError('session-expired', 'gone', 410);
  const wrapped = toHttpsError(e);
  assert.equal(wrapped.code, 'session-expired');
  assert.equal(wrapped.httpStatus, 410);
  assert.equal(wrapped.message, 'gone');
});

test('toHttpsError passes through unknown errors untouched', () => {
  const orig = new Error('boom');
  assert.strictEqual(toHttpsError(orig), orig);
});
