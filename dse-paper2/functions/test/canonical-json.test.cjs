// dse-paper2/functions/test/canonical-json.test.cjs
// Unit tests for canonical JSON serialization (requestHash input).

const test = require('node:test');
const assert = require('node:assert/strict');
const { canonicalRequestJson, REQUEST_FIELDS } = require('../src/canonical-json');

test('canonicalRequestJson: emits fixed key order', () => {
  const req = { uid: 'u1', sessionId: 's1', releaseId: 'r1', selectedOptionId: 'A' };
  assert.equal(
    canonicalRequestJson(req),
    '{"uid":"u1","sessionId":"s1","releaseId":"r1","selectedOptionId":"A"}',
  );
});

test('canonicalRequestJson: works regardless of input order', () => {
  const a = canonicalRequestJson({ uid: 'u1', sessionId: 's1', releaseId: 'r1', selectedOptionId: 'B' });
  const b = canonicalRequestJson({ selectedOptionId: 'B', releaseId: 'r1', sessionId: 's1', uid: 'u1' });
  assert.equal(a, b);
});

test('canonicalRequestJson: forbidden key is rejected', () => {
  assert.throws(
    () => canonicalRequestJson({ uid: 'u', sessionId: 's', releaseId: 'r', selectedOptionId: 'A', extra: 1 }),
    /forbidden field "extra"/,
  );
});

test('canonicalRequestJson: missing key is rejected', () => {
  assert.throws(
    () => canonicalRequestJson({ uid: 'u', sessionId: 's', releaseId: 'r' }),
    /missing field "selectedOptionId"/,
  );
});

test('canonicalRequestJson: non-string field is rejected', () => {
  assert.throws(
    () => canonicalRequestJson({ uid: 'u', sessionId: 's', releaseId: 'r', selectedOptionId: 1 }),
    /must be a string/,
  );
});

test('REQUEST_FIELDS is the exact 4-field contract', () => {
  assert.deepEqual([...REQUEST_FIELDS], ['uid', 'sessionId', 'releaseId', 'selectedOptionId']);
});
