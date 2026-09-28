// dse-paper2/functions/test/domain-allowlist.test.cjs
// Unit tests for exact domain allowlist.

const test = require('node:test');
const assert = require('node:assert/strict');
const { isAllowedDomain, assertAllowedDomain } = require('../src/domain-allowlist');

test('isAllowedDomain: case-insensitive', () => {
  const allowed = ['school.example.com'];
  assert.equal(isAllowedDomain('student@SCHOOL.EXAMPLE.COM', allowed), true);
  assert.equal(isAllowedDomain('student@School.Example.Com', allowed), true);
});

test('isAllowedDomain: trims + filters empty', () => {
  process.env.ALLOWED_SCHOOL_DOMAINS = ' , school.example.com , ,';
  const { getAllowedDomains } = require('../src/domain-allowlist');
  const list = getAllowedDomains();
  assert.deepEqual(list, ['school.example.com']);
  delete process.env.ALLOWED_SCHOOL_DOMAINS;
});

test('isAllowedDomain: rejects non-string', () => {
  assert.equal(isAllowedDomain(123, ['x']), false);
  assert.equal(isAllowedDomain(null, ['x']), false);
});

test('isAllowedDomain: rejects email without @', () => {
  assert.equal(isAllowedDomain('not-an-email', ['x']), false);
});

test('isAllowedDomain: subdomain does not match', () => {
  // "Exact" means no subdomain matching. student@dept.school.example.com is not in [school.example.com]
  assert.equal(isAllowedDomain('student@dept.school.example.com', ['school.example.com']), false);
});

test('isAllowedDomain: example.com is not in a school-only allowlist', () => {
  assert.equal(isAllowedDomain('student@example.com', ['school.example.com']), false);
});

test('assertAllowedDomain: throws with code', () => {
  try {
    assertAllowedDomain('student@example.com');
    assert.fail('should have thrown');
  } catch (e) {
    assert.equal(e.code, 'domain-not-allowed');
  }
});
