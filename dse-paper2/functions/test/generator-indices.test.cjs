// dse-paper2/functions/test/generator-indices.test.cjs
// Unit + property tests for the Phase 1A generator.
// Pure node, no Firestore needed.

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  generate,
  computeCorrect,
  computeTrapPowerOfPowerAdd,
  computeTrapDivisionExponentAdd,
  computeTrapNegativeExponentNotReciprocal,
  validParameters,
  PARAM_RANGES,
  GENERATOR_ID,
  GENERATOR_VERSION,
  shuffle4,
  makeRng,
} = require('../src/generator-indices');
const {
  canonicalRational, areEqual, powerInt, negativePower, withinSizeLimit, displayRational,
} = require('../src/rational');

test('GENERATOR_ID and VERSION are stable', () => {
  assert.equal(GENERATOR_ID, 'indices.power_of_power_div_v1');
  assert.equal(GENERATOR_VERSION, '1.0.0');
});

test('validParameters: boundary checks', () => {
  // m*n - k must be in [-6, 6]
  assert.equal(validParameters({ a: 2, m: -4, n: 2, k: -6 }), true);  // exp = -8 - (-6) = -2 → ok
  assert.equal(validParameters({ a: 9, m: 4, n: 4, k: 6 }), false);  // exp = 16 - 6 = 10 → out
  assert.equal(validParameters({ a: 9, m: 1, n: 2, k: -4 }), true);   // exp = 2 - (-4) = 6 → ok (boundary)
  assert.equal(validParameters({ a: 9, m: -1, n: 2, k: 4 }), true);   // exp = -2 - 4 = -6 → ok (boundary)
  assert.equal(validParameters({ a: 1, m: 1, n: 2, k: 1 }), false);   // a=1 forbidden
  assert.equal(validParameters({ a: 10, m: 1, n: 2, k: 1 }), false); // a out of range
  assert.equal(validParameters({ a: 2, m: 1, n: 1, k: 1 }), false);  // n=1 out of range (n in [2,4])
  assert.equal(validParameters({ a: 2, m: 1, n: 5, k: 1 }), false);  // n=5 out of range
  assert.equal(validParameters({ a: 2, m: 1, n: 2, k: 7 }), false);  // k out of range
  assert.equal(validParameters({ a: 2, m: 1, n: 2, k: 1 }), true);   // exp = 1
});

test('computeCorrect: simple (a^m)^n / a^k = a^(m*n-k)', () => {
  // (2^3)^2 / 2^4 = 2^6 / 2^4 = 2^2 = 4
  assert.deepEqual(
    computeCorrect({ a: 2, m: 3, n: 2, k: 4 }),
    canonicalRational({ numerator: '4', denominator: '1' }),
  );
  // (3^2)^2 / 3^1 = 3^4/3 = 3^3 = 27
  assert.deepEqual(
    computeCorrect({ a: 3, m: 2, n: 2, k: 1 }),
    canonicalRational({ numerator: '27', denominator: '1' }),
  );
  // (2^-2)^3 / 2^0 = 2^-6 / 1 = 1/64
  assert.deepEqual(
    computeCorrect({ a: 2, m: -2, n: 3, k: 0 }),
    canonicalRational({ numerator: '1', denominator: '64' }),
  );
  // (2^3)^2 / 2^6 = 2^6/2^6 = 1
  assert.deepEqual(
    computeCorrect({ a: 2, m: 3, n: 2, k: 6 }),
    canonicalRational({ numerator: '1', denominator: '1' }),
  );
});

test('trap_power_of_power_add: (a^m)^n → a^(m+n)', () => {
  // (2^3)^2 / 2^4 → wrong: 2^(3+2) / 2^4 = 2^5/2^4 = 2^1 = 2
  assert.deepEqual(
    computeTrapPowerOfPowerAdd({ a: 2, m: 3, n: 2, k: 4 }),
    canonicalRational({ numerator: '2', denominator: '1' }),
  );
});

test('trap_division_exponent_add: m*n+k instead of m*n-k', () => {
  // (2^3)^2 / 2^4 → wrong: 2^6 * 2^4 = 2^10
  assert.deepEqual(
    computeTrapDivisionExponentAdd({ a: 2, m: 3, n: 2, k: 4 }),
    canonicalRational({ numerator: '1024', denominator: '1' }),
  );
});

test('trap_negative_exponent_not_reciprocal: drops reciprocal sign', () => {
  // (2^-2)^3 / 2^0 = 2^-6 → wrong: 2^6 (no reciprocal)
  assert.deepEqual(
    computeTrapNegativeExponentNotReciprocal({ a: 2, m: -2, n: 3, k: 0 }),
    canonicalRational({ numerator: '64', denominator: '1' }),
  );
});

test('trap_negative_exponent_not_reciprocal: returns null for non-negative exp', () => {
  assert.equal(
    computeTrapNegativeExponentNotReciprocal({ a: 2, m: 3, n: 2, k: 4 }),
    null,
  );
});

test('generate: deterministic given seed', () => {
  const a = generate({ seed: 'fixed-seed-1' });
  const b = generate({ seed: 'fixed-seed-1' });
  assert.deepEqual(a.parameters, b.parameters);
  assert.deepEqual(a.correct, b.correct);
  assert.deepEqual(a.distractors, b.distractors);
  assert.deepEqual(a.optionToTrap, b.optionToTrap);
  assert.equal(a.correctOptionId, b.correctOptionId);
});

test('generate: different seeds → likely different parameters', () => {
  const a = generate({ seed: 'seed-A' });
  const b = generate({ seed: 'seed-B' });
  // Not strictly required to differ, but over many trials they do. We just
  // assert both are valid.
  assert.ok(a.parameters.a >= PARAM_RANGES.aMin && a.parameters.a <= PARAM_RANGES.aMax);
  assert.ok(b.parameters.a >= PARAM_RANGES.aMin && b.parameters.a <= PARAM_RANGES.aMax);
});

test('generate: enforces parameter ranges', () => {
  for (let i = 0; i < 50; i++) {
    const v = generate({ seed: `range-${i}` });
    const p = v.parameters;
    assert.ok(p.a >= PARAM_RANGES.aMin && p.a <= PARAM_RANGES.aMax, `a out of range: ${p.a}`);
    assert.ok(p.m >= PARAM_RANGES.mMin && p.m <= PARAM_RANGES.mMax, `m out of range: ${p.m}`);
    assert.ok(p.n >= PARAM_RANGES.nMin && p.n <= PARAM_RANGES.nMax, `n out of range: ${p.n}`);
    assert.ok(p.k >= PARAM_RANGES.kMin && p.k <= PARAM_RANGES.kMax, `k out of range: ${p.k}`);
    const exp = p.m * p.n - p.k;
    assert.ok(exp >= PARAM_RANGES.expMin && exp <= PARAM_RANGES.expMax, `exp out of range: ${exp}`);
  }
});

test('generate: correct value is within size limit', () => {
  for (let i = 0; i < 50; i++) {
    const v = generate({ seed: `size-${i}` });
    assert.ok(withinSizeLimit(v.correct, PARAM_RANGES.sizeLimit), `correct too big: ${displayRational(v.correct)}`);
    for (const [tid, tval] of Object.entries(v.distractors)) {
      assert.ok(withinSizeLimit(tval, PARAM_RANGES.sizeLimit), `${tid} too big: ${displayRational(tval)}`);
    }
  }
});

test('generate: 3 distinct distractors, all distinct from correct', () => {
  for (let i = 0; i < 50; i++) {
    const v = generate({ seed: `distinct-${i}` });
    const traps = Object.values(v.distractors);
    assert.equal(traps.length, 3);
    for (const t of traps) {
      assert.equal(areEqual(v.correct, t), false, `distractor equals correct: ${displayRational(t)}`);
    }
    // pairwise distinct
    for (let a = 0; a < traps.length; a++) {
      for (let b = a + 1; b < traps.length; b++) {
        assert.equal(areEqual(traps[a], traps[b]), false, `distractor ${a} == ${b}: ${displayRational(traps[a])}`);
      }
    }
  }
});

test('generate: exactly 4 option slots, A/B/C/D, correctOptionId is one of them', () => {
  for (let i = 0; i < 20; i++) {
    const v = generate({ seed: `opt-${i}` });
    const ids = Object.keys(v.optionToTrap);
    assert.equal(ids.length, 4);
    assert.deepEqual(ids.sort(), ['A', 'B', 'C', 'D']);
    assert.ok(['A', 'B', 'C', 'D'].includes(v.correctOptionId));
    assert.equal(v.optionToTrap[v.correctOptionId], 'correct');
  }
});

test('generate: traps are bound to the three specified models only', () => {
  const allowed = new Set([
    'trap_power_of_power_add',
    'trap_division_exponent_add',
    'trap_negative_exponent_not_reciprocal',
  ]);
  for (let i = 0; i < 50; i++) {
    const v = generate({ seed: `trap-${i}` });
    const traps = Object.keys(v.distractors);
    assert.equal(traps.length, 3);
    for (const t of traps) assert.ok(allowed.has(t), `unexpected trap: ${t}`);
  }
});

test('generate: includes seed + correctOptionId (server-only fields)', () => {
  const v = generate({ seed: 'audit-1' });
  assert.equal(v.seed, 'audit-1');
  assert.ok(typeof v.correctOptionId === 'string');
});

test('generate: rejects missing seed', () => {
  assert.throws(() => generate({}), /seed/);
});

test('shuffle4: produces a permutation', () => {
  const rng = makeRng('shuf');
  const arr = shuffle4(rng);
  assert.equal(arr.length, 4);
  assert.deepEqual([...arr].sort(), [0, 1, 2, 3]);
});

test('makeRng: deterministic', () => {
  const a = makeRng('seed-x');
  const b = makeRng('seed-x');
  for (let i = 0; i < 10; i++) {
    assert.equal(a(), b());
  }
});
