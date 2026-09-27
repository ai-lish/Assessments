// dse-paper2/functions/test/submit-helpers.test.cjs
// Unit tests for submit-attempt validation helpers (no Firestore needed).

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validateIdempotencyKey,
  validateSubmittedAtClient,
  pickTrapForSelected,
  isOptionId,
} = require('../src/submit-attempt');

test('isOptionId: only A/B/C/D', () => {
  assert.equal(isOptionId('A'), true);
  assert.equal(isOptionId('B'), true);
  assert.equal(isOptionId('C'), true);
  assert.equal(isOptionId('D'), true);
  assert.equal(isOptionId('E'), false);
  assert.equal(isOptionId('a'), false);
  assert.equal(isOptionId(1), false);
  assert.equal(isOptionId(null), false);
});

test('validateIdempotencyKey: format and length', () => {
  assert.equal(validateIdempotencyKey('abcdefg1'), true);
  assert.equal(validateIdempotencyKey('abcd-_.b:c'), true);
  assert.equal(validateIdempotencyKey('a b'), false);              // forbidden char
  assert.equal(validateIdempotencyKey('id/with/slash'), false);    // forbidden char
  assert.equal(validateIdempotencyKey('short'), false);            // length < 8
  assert.equal(validateIdempotencyKey(123), false);                // not string
  assert.equal(validateIdempotencyKey('x'.repeat(200)), false);    // too long
  // (no duplicate block)
});

test('validateSubmittedAtClient: ISO-8601 in window', () => {
  assert.deepEqual(
    validateSubmittedAtClient('2026-06-24T10:00:00Z'),
    { ok: true, value: '2026-06-24T10:00:00Z' },
  );
  assert.equal(validateSubmittedAtClient('2010-01-01T00:00:00Z').ok, false);
  assert.equal(validateSubmittedAtClient('not-a-date').ok, false);
  assert.equal(validateSubmittedAtClient(123).ok, false);
});

test('validateSubmittedAtClient: null/undefined is allowed (no client clock)', () => {
  assert.deepEqual(validateSubmittedAtClient(undefined), { ok: true, value: null });
  assert.deepEqual(validateSubmittedAtClient(null), { ok: true, value: null });
});

test('pickTrapForSelected: returns null for correct', () => {
  const r = pickTrapForSelected({ selectedOptionId: 'B', optionToTrap: { A: 'trap_x', B: 'correct', C: 'trap_y', D: 'trap_z' }, correctOptionId: 'B' });
  assert.equal(r, null);
});

test('pickTrapForSelected: returns trapId for incorrect', () => {
  const r = pickTrapForSelected({ selectedOptionId: 'A', optionToTrap: { A: 'trap_x', B: 'correct', C: 'trap_y', D: 'trap_z' }, correctOptionId: 'B' });
  assert.equal(r, 'trap_x');
});

test('pickTrapForSelected: unknown selection → null', () => {
  const r = pickTrapForSelected({ selectedOptionId: 'Z', optionToTrap: { A: 'trap_x', B: 'correct', C: 'trap_y', D: 'trap_z' }, correctOptionId: 'B' });
  assert.equal(r, null);
});
