// dse-paper2/functions/src/generator-indices.js
// Phase 1A generator for: (a^m)^n / a^k   where a in [2,9], m in [-4,4], n in [2,4],
// k in [-6,6], and final exponent m*n - k in [-6, 6].
//
// Three trap models:
//   - trap_power_of_power_add:          (a^m)^n  → a^(m+n)   then /a^k  → a^(m+n-k)
//   - trap_division_exponent_add:       a^(m*n)/a^k → a^(m*n+k)
//   - trap_negative_exponent_not_reciprocal: when final exp < 0, return a^|exp| (no reciprocal)
//
// Bounded retry on bad parameter combinations (no 3 unique distractors etc).
//
// Output (server-side; client only ever sees the public variant — see createAttemptSession):
//   {
//     releaseId, variantId, generatorVersion,
//     parameters: { a, m, n, k },
//     correct:   { type:"rational", numerator, denominator },  // canonical
//     distractors: { trapId: { type:"rational", numerator, denominator } },
//     optionToTrap: { "A": "correct" | trapId, ... },           // shuffled
//     correctOptionId,                                          // NOT shipped to client
//   }

const {
  canonicalRational,
  powerInt,
  negativePower,
  areEqual,
  withinSizeLimit,
} = require('./rational');

const GENERATOR_ID = 'indices.power_of_power_div_v1';
const GENERATOR_VERSION = '1.0.0';

const PARAM_RANGES = Object.freeze({
  aMin: 2, aMax: 9,
  mMin: -4, mMax: 4,
  nMin: 2, nMax: 4,
  kMin: -6, kMax: 6,
  expMin: -6, expMax: 6,
  sizeLimit: 6,
  maxAttempts: 50,
});

// Deterministic PRNG (Mulberry32) for reproducible test seeds; runtime uses crypto-grade.
function makeRng(seedStr) {
  // 32-bit hash of seed string
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = (h ^ seedStr.charCodeAt(i)) >>> 0;
    h = Math.imul(h, 16777619) >>> 0;
  }
  let s = h >>> 0;
  return function rng() {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickInt(rng, lo, hi) {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

// Final answer for (a^m)^n / a^k with canonical rational.
function computeCorrect({ a, m, n, k }) {
  const exp = m * n - k;
  if (exp > 0) return powerInt(BigInt(a), BigInt(exp));
  if (exp === 0) return canonicalRational({ numerator: '1', denominator: '1' });
  return negativePower(BigInt(a), BigInt(-exp));
}

// trap_power_of_power_add: a^(m+n) / a^k → a^(m+n-k)
function computeTrapPowerOfPowerAdd({ a, m, n, k }) {
  const exp = m + n - k;
  if (exp > 0) return powerInt(BigInt(a), BigInt(exp));
  if (exp === 0) return canonicalRational({ numerator: '1', denominator: '1' });
  return negativePower(BigInt(a), BigInt(-exp));
}

// trap_division_exponent_add: a^(m*n) / a^k  wrongly  →  a^(m*n + k)
function computeTrapDivisionExponentAdd({ a, m, n, k }) {
  const exp = m * n + k;
  if (exp > 0) return powerInt(BigInt(a), BigInt(exp));
  if (exp === 0) return canonicalRational({ numerator: '1', denominator: '1' });
  return negativePower(BigInt(a), BigInt(-exp));
}

// trap_negative_exponent_not_reciprocal: when final exp < 0, drop reciprocal.
function computeTrapNegativeExponentNotReciprocal({ a, m, n, k }) {
  const exp = m * n - k;
  if (exp >= 0) return null; // trap only meaningful for negative final exponent
  return powerInt(BigInt(a), BigInt(-exp));
}

// Shuffle indices [0,1,2,3] deterministically with the rng.
function shuffle4(rng) {
  const arr = [0, 1, 2, 3];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function validParameters({ a, m, n, k }) {
  if (!Number.isInteger(a) || a < PARAM_RANGES.aMin || a > PARAM_RANGES.aMax) return false;
  if (!Number.isInteger(m) || m < PARAM_RANGES.mMin || m > PARAM_RANGES.mMax) return false;
  if (!Number.isInteger(n) || n < PARAM_RANGES.nMin || n > PARAM_RANGES.nMax) return false;
  if (!Number.isInteger(k) || k < PARAM_RANGES.kMin || k > PARAM_RANGES.kMax) return false;
  const exp = m * n - k;
  if (exp < PARAM_RANGES.expMin || exp > PARAM_RANGES.expMax) return false;
  return true;
}

// distractorDiagnosticValue: if correct == 1, ensure all traps still distinct from 1
// (we return null if not; caller skips trap).
function distinctFromCorrect(correct, distractor) {
  return !areEqual(correct, distractor);
}

// Generate one variant. Deterministic given seed.
// Returns: { parameters, correct, distractors, optionToTrap, correctOptionId, seed }.
function generate({ seed, a, m, n, k } = {}) {
  if (typeof seed !== 'string' || seed.length === 0) {
    throw new TypeError('generate: seed (string) is required');
  }
  const rng = makeRng(seed);
  let attempt = 0;
  let params;
  let correct;
  let distractors;
  let optionToTrap;
  let correctOptionId;
  let lastError = null;

  while (attempt < PARAM_RANGES.maxAttempts) {
    attempt++;
    if (a === undefined) a = pickInt(rng, PARAM_RANGES.aMin, PARAM_RANGES.aMax);
    if (m === undefined) m = pickInt(rng, PARAM_RANGES.mMin, PARAM_RANGES.mMax);
    if (n === undefined) n = pickInt(rng, PARAM_RANGES.nMin, PARAM_RANGES.nMax);
    if (k === undefined) k = pickInt(rng, PARAM_RANGES.kMin, PARAM_RANGES.kMax);

    if (!validParameters({ a, m, n, k })) {
      a = m = n = k = undefined;
      lastError = 'invalid_parameters';
      continue;
    }

    try {
      correct = computeCorrect({ a, m, n, k });
      if (!withinSizeLimit(correct, PARAM_RANGES.sizeLimit)) {
        a = m = n = k = undefined;
        lastError = 'correct_size_exceeded';
        continue;
      }

      // Build trap candidates
      const trapA = computeTrapPowerOfPowerAdd({ a, m, n, k });
      const trapB = computeTrapDivisionExponentAdd({ a, m, n, k });
      const trapC = computeTrapNegativeExponentNotReciprocal({ a, m, n, k });

      const candidates = [];
      if (withinSizeLimit(trapA, PARAM_RANGES.sizeLimit) && distinctFromCorrect(correct, trapA)) {
        candidates.push({ id: 'trap_power_of_power_add', value: trapA });
      }
      if (withinSizeLimit(trapB, PARAM_RANGES.sizeLimit) && distinctFromCorrect(correct, trapB)) {
        candidates.push({ id: 'trap_division_exponent_add', value: trapB });
      }
      if (
        trapC !== null &&
        withinSizeLimit(trapC, PARAM_RANGES.sizeLimit) &&
        distinctFromCorrect(correct, trapC)
      ) {
        candidates.push({ id: 'trap_negative_exponent_not_reciprocal', value: trapC });
      }

      // Need exactly 3 distinct, non-correct distractors
      if (candidates.length < 3) {
        a = m = n = k = undefined;
        lastError = `insufficient_distractors(${candidates.length})`;
        continue;
      }
      const finalThree = candidates.slice(0, 3);
      // Pairwise distinct (avoid any two traps being equal)
      for (let i = 0; i < finalThree.length; i++) {
        for (let j = i + 1; j < finalThree.length; j++) {
          if (areEqual(finalThree[i].value, finalThree[j].value)) {
            a = m = n = k = undefined;
            lastError = 'duplicate_distractor_values';
            i = j = finalThree.length;
            break;
          }
        }
        if (a === undefined) break;
      }
      if (a === undefined) continue;

      // Optional: avoid correct=1 losing diagnostic value. We do not generate when
      // the final answer is 1 AND any of the three traps collapses to 1; in that
      // case, parameter is rejected. (If correct=1 but all three traps are distinct
      // from 1, we keep it.)
      if (correct.numerator === '1' && correct.denominator === '1') {
        const allDistinct = finalThree.every((t) => t.value.numerator !== '1' || t.value.denominator !== '1');
        if (!allDistinct) {
          a = m = n = k = undefined;
          lastError = 'correct_is_one_with_collapsing_trap';
          continue;
        }
      }

      distractors = {};
      for (const t of finalThree) distractors[t.id] = t.value;

      // Build option list and shuffle
      const optionValues = [
        { trap: 'correct', value: correct },
        ...finalThree.map((t) => ({ trap: t.id, value: t.value })),
      ];
      const order = shuffle4(rng);
      const shuffled = order.map((i) => optionValues[i]);
      const optionIds = ['A', 'B', 'C', 'D'];
      const builtOptionToTrap = {};
      let builtCorrectOptionId = null;
      shuffled.forEach((opt, idx) => {
        builtOptionToTrap[optionIds[idx]] = opt.trap;
        if (opt.trap === 'correct') builtCorrectOptionId = optionIds[idx];
      });
      optionToTrap = builtOptionToTrap;
      correctOptionId = builtCorrectOptionId;

      params = { a, m, n, k };
      break;
    } catch (e) {
      lastError = e.message || String(e);
      a = m = n = k = undefined;
    }
  }

  if (!params) {
    const err = new Error(`generator_failed: ${lastError || 'unknown'} after ${PARAM_RANGES.maxAttempts} attempts`);
    err.code = 'generator-failed';
    err.attempts = attempt;
    throw err;
  }

  return {
    generatorId: GENERATOR_ID,
    generatorVersion: GENERATOR_VERSION,
    seed, // server-only; never returned to client
    parameters: params,
    correct,
    distractors,
    optionToTrap,
    correctOptionId,
  };
}

module.exports = {
  GENERATOR_ID,
  GENERATOR_VERSION,
  PARAM_RANGES,
  generate,
  computeCorrect,
  computeTrapPowerOfPowerAdd,
  computeTrapDivisionExponentAdd,
  computeTrapNegativeExponentNotReciprocal,
  validParameters,
  // exposed for tests
  makeRng,
  shuffle4,
};
