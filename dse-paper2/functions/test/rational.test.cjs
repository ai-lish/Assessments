// dse-paper2/functions/test/rational.test.cjs
// Unit tests for Rational canonical form. Pure node, no Firebase.

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  canonicalRational,
  areEqual,
  add,
  powerInt,
  negativePower,
  displayRational,
  withinSizeLimit,
  isIntString,
} = require('../src/rational');

test('isIntString: valid forms', () => {
  assert.equal(isIntString('0'), true);
  assert.equal(isIntString('1'), true);
  assert.equal(isIntString('-1'), true);
  assert.equal(isIntString('123456'), true);
  assert.equal(isIntString('0001'), false); // leading zeros forbidden
  assert.equal(isIntString('1.5'), false);
  assert.equal(isIntString(''), false);
  assert.equal(isIntString('abc'), false);
  assert.equal(isIntString(' 1'), false);
  assert.equal(isIntString(1), false);
});

test('canonicalRational: 0 must be 0/1', () => {
  const r = canonicalRational({ numerator: '0', denominator: '5' });
  assert.equal(r.numerator, '0');
  assert.equal(r.denominator, '1');
});

test('canonicalRational: GCD reduction', () => {
  const r = canonicalRational({ numerator: '27', denominator: '9' });
  assert.equal(r.numerator, '3');
  assert.equal(r.denominator, '1');
});

test('canonicalRational: negative denominator must be normalized', () => {
  const r = canonicalRational({ numerator: '3', denominator: '-4' });
  assert.equal(r.numerator, '-3');
  assert.equal(r.denominator, '4');
  const r2 = canonicalRational({ numerator: '-3', denominator: '-4' });
  assert.equal(r2.numerator, '3');
  assert.equal(r2.denominator, '4');
});

test('canonicalRational: rejects zero denominator', () => {
  assert.throws(
    () => canonicalRational({ numerator: '1', denominator: '0' }),
    /denominator must not be zero/,
  );
});

test('canonicalRational: rejects non-integer-string', () => {
  assert.throws(() => canonicalRational({ numerator: '1.5', denominator: '2' }), /integer strings/);
  assert.throws(() => canonicalRational({ numerator: '01', denominator: '2' }), /integer strings/);
  assert.throws(() => canonicalRational({}), /integer strings/);
});

test('areEqual: cross-multiplication equality (defensive)', () => {
  assert.equal(
    areEqual({ numerator: '2', denominator: '4' }, { numerator: '3', denominator: '6' }),
    true,
  );
  assert.equal(
    areEqual({ numerator: '1', denominator: '2' }, { numerator: '1', denominator: '3' }),
    false,
  );
});

test('add: simple fractions', () => {
  assert.deepEqual(add({ numerator: '1', denominator: '2' }, { numerator: '1', denominator: '2' }), {
    type: 'rational', numerator: '1', denominator: '1',
  });
  assert.deepEqual(add({ numerator: '1', denominator: '4' }, { numerator: '1', denominator: '4' }), {
    type: 'rational', numerator: '1', denominator: '2',
  });
});

test('add: handles negative denominators via canonicalization', () => {
  assert.deepEqual(add({ numerator: '1', denominator: '2' }, { numerator: '1', denominator: '-3' }), {
    type: 'rational', numerator: '1', denominator: '6',
  });
});

test('powerInt: 2^10', () => {
  assert.deepEqual(powerInt(2n, 10n), {
    type: 'rational', numerator: '1024', denominator: '1',
  });
});

test('powerInt: 0^0 → 1', () => {
  assert.deepEqual(powerInt(0n, 0n), {
    type: 'rational', numerator: '1', denominator: '1',
  });
});

test('powerInt: 0^positive → 0', () => {
  assert.deepEqual(powerInt(0n, 5n), {
    type: 'rational', numerator: '0', denominator: '1',
  });
});

test('powerInt: rejects negative exponent', () => {
  assert.throws(() => powerInt(2n, -1n), /negative exponent not allowed/);
});

test('negativePower: 1/2^3', () => {
  assert.deepEqual(negativePower(2n, 3n), {
    type: 'rational', numerator: '1', denominator: '8',
  });
});

test('negativePower: rejects 0 base', () => {
  assert.throws(() => negativePower(0n, 1n), /a=0 is undefined/);
});

test('displayRational: integer form omits /1', () => {
  assert.equal(displayRational({ numerator: '7', denominator: '1' }), '7');
  assert.equal(displayRational({ numerator: '3', denominator: '4' }), '3/4');
  assert.equal(displayRational({ numerator: '-1', denominator: '2' }), '-1/2');
});

test('withinSizeLimit: enforces 6-digit limit', () => {
  assert.equal(withinSizeLimit({ numerator: '999999', denominator: '999999' }, 6), true);
  assert.equal(withinSizeLimit({ numerator: '1000000', denominator: '1' }, 6), false);
  assert.equal(withinSizeLimit({ numerator: '1', denominator: '1000000' }, 6), false);
});

test('canonicalRational: round-trip preserves form for canonical inputs', () => {
  const r = canonicalRational({ numerator: '5', denominator: '7' });
  const r2 = canonicalRational(r);
  assert.deepEqual(r, r2);
});
