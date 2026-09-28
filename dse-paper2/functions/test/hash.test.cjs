// dse-paper2/functions/test/hash.test.cjs
// Unit tests for SHA-256 hashing of requestHash.

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { sha256Utf8, requestHash } = require('../src/hash');

test('sha256Utf8: matches node crypto reference', () => {
  const input = 'hello world';
  const expected = crypto.createHash('sha256').update(input, 'utf8').digest('hex');
  assert.equal(sha256Utf8(input), expected);
});

test('sha256Utf8: rejects non-string', () => {
  assert.throws(() => sha256Utf8(123), /must be a string/);
  assert.throws(() => sha256Utf8(null), /must be a string/);
});

test('sha256Utf8: utf-8 multi-byte safe', () => {
  const s = '中文αβγ';
  const expected = crypto.createHash('sha256').update(s, 'utf8').digest('hex');
  assert.equal(sha256Utf8(s), expected);
});

test('requestHash: deterministic for same payload regardless of key order', () => {
  const a = requestHash({ uid: 'u', sessionId: 's', releaseId: 'r', selectedOptionId: 'A' });
  const b = requestHash({ selectedOptionId: 'A', releaseId: 'r', sessionId: 's', uid: 'u' });
  assert.equal(a, b);
});

test('requestHash: different selectedOptionId changes hash', () => {
  const a = requestHash({ uid: 'u', sessionId: 's', releaseId: 'r', selectedOptionId: 'A' });
  const b = requestHash({ uid: 'u', sessionId: 's', releaseId: 'r', selectedOptionId: 'B' });
  assert.notEqual(a, b);
});
