// dse-paper2/functions/src/rational.js
// Exact math Rational — BigInt-based, canonical, display-separated.
// Phase 1A scope: rational only. No surd, pi, CAS, decimal approximation.
//
// Canonical storage (Firestore / JSON):
//   { type: "rational", numerator: "<int-string>", denominator: "<int-string>" }
//   - numerator/denominator are decimal integer strings.
//   - Format: ^-?(0|[1-9][0-9]*)$
//   - denominator > 0; 0 represented as "0"/"1".
//   - GCD-reduced before write.
//   - Display formatting is a separate function (rational-display.js on client,
//     displayRational() below for backend use in canonical + display separation).

const INT_STRING_RE = /^-?(0|[1-9][0-9]*)$/;

function isIntString(s) {
  return typeof s === 'string' && INT_STRING_RE.test(s);
}

// GCD via Euclidean algorithm on absolute values.
function gcdBigInt(a, b) {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b !== 0n) {
    [a, b] = [b, a % b];
  }
  return a;
}

// canonicalRational({ numerator, denominator }) -> { type, numerator, denominator } as STRINGS.
// Throws on invalid input. Enforces:
//   - positive denominator (sign carried by numerator)
//   - GCD reduction
//   - 0 represented as 0/1
function canonicalRational(input) {
  if (!input || typeof input !== 'object') {
    throw new TypeError('rational: input must be an object');
  }
  const { numerator: nRaw, denominator: dRaw } = input;
  if (!isIntString(nRaw) || !isIntString(dRaw)) {
    throw new TypeError('rational: numerator/denominator must be integer strings');
  }
  let n = BigInt(nRaw);
  let d = BigInt(dRaw);
  if (d === 0n) {
    throw new RangeError('rational: denominator must not be zero');
  }
  if (d < 0n) {
    d = -d;
    n = -n;
  }
  if (n === 0n) {
    return { type: 'rational', numerator: '0', denominator: '1' };
  }
  const g = gcdBigInt(n, d);
  n = n / g;
  d = d / g;
  return { type: 'rational', numerator: n.toString(), denominator: d.toString() };
}

// areEqual(r1, r2) — defensive cross-multiplication check.
function areEqual(a, b) {
  const ca = canonicalRational(a);
  const cb = canonicalRational(b);
  return ca.numerator === cb.numerator && ca.denominator === cb.denominator;
}

// BigInt addition (a/b + c/d) = (ad + bc) / bd, then canonicalize.
function add(a, b) {
  const an = BigInt(canonicalRational(a).numerator);
  const ad = BigInt(canonicalRational(a).denominator);
  const bn = BigInt(canonicalRational(b).numerator);
  const bd = BigInt(canonicalRational(b).denominator);
  return canonicalRational({
    numerator: (an * bd + bn * ad).toString(),
    denominator: (ad * bd).toString(),
  });
}

// BigInt power: a^e where e is a non-negative BigInt. Returns canonical rational.
function powerInt(a, e) {
  if (typeof a === 'string') a = BigInt(a);
  if (typeof e === 'string') e = BigInt(e);
  if (a === 0n) {
    if (e === 0n) return canonicalRational({ numerator: '1', denominator: '1' });
    return canonicalRational({ numerator: '0', denominator: '1' });
  }
  if (e < 0n) throw new RangeError('powerInt: negative exponent not allowed; use reciprocal for negative');
  return canonicalRational({
    numerator: (a ** e).toString(),
    denominator: '1',
  });
}

// Negative-exponent helper: 1 / a^|e|.
function negativePower(a, eAbs) {
  if (typeof a === 'string') a = BigInt(a);
  if (typeof eAbs === 'string') eAbs = BigInt(eAbs);
  if (a === 0n) throw new RangeError('negativePower: a=0 is undefined');
  if (eAbs <= 0n) throw new RangeError('negativePower: eAbs must be positive');
  return canonicalRational({
    numerator: '1',
    denominator: (a ** eAbs).toString(),
  });
}

// Display formatter: 3/4 → "3/4", 1 → "1", -1/2 → "-1/2".
// Backend-only helper; client has its own formatter to keep concerns separate.
function displayRational(r) {
  const c = canonicalRational(r);
  if (c.denominator === '1') return c.numerator;
  return `${c.numerator}/${c.denominator}`;
}

// Size guard: numerator/denominator string length <= maxDigits.
function withinSizeLimit(r, maxDigits = 6) {
  const c = canonicalRational(r);
  return (
    c.numerator.length <= maxDigits &&
    c.denominator.length <= maxDigits &&
    Math.abs(Number(c.numerator)) < 10 ** maxDigits &&
    Math.abs(Number(c.denominator)) < 10 ** maxDigits
  );
}

module.exports = {
  isIntString,
  canonicalRational,
  areEqual,
  add,
  powerInt,
  negativePower,
  displayRational,
  withinSizeLimit,
};
