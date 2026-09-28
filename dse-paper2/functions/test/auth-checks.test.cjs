// dse-paper2/functions/test/auth-checks.test.cjs
// Unit tests for auth-checks helpers.

const test = require('node:test');
const assert = require('node:assert/strict');
const { requireAuth, requireEmailVerified } = require('../src/auth-checks');

test('requireAuth: missing context throws unauthenticated', () => {
  try {
    requireAuth(undefined);
    assert.fail('expected throw');
  } catch (e) {
    assert.equal(e.code, 'unauthenticated');
  }
});

test('requireAuth: missing uid throws unauthenticated', () => {
  try {
    requireAuth({ auth: null });
    assert.fail('expected throw');
  } catch (e) {
    assert.equal(e.code, 'unauthenticated');
  }
});

test('requireAuth: returns auth on success', () => {
  const a = { uid: 'u1' };
  const out = requireAuth({ auth: a });
  assert.equal(out, a);
});

test('requireEmailVerified: requires auth first', () => {
  try {
    requireEmailVerified(undefined);
    assert.fail('expected throw');
  } catch (e) {
    assert.equal(e.code, 'unauthenticated');
  }
});

test('requireEmailVerified: requires email_verified=true', () => {
  try {
    requireEmailVerified({ auth: { uid: 'u', token: { email_verified: false } } });
    assert.fail('expected throw');
  } catch (e) {
    assert.equal(e.code, 'email-not-verified');
  }
});

test('requireEmailVerified: accepts verified', () => {
  const a = { uid: 'u', token: { email_verified: true, email: 's@example.com' } };
  const out = requireEmailVerified({ auth: a });
  assert.equal(out, a);
});
