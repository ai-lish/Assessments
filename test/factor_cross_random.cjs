#!/usr/bin/env node
'use strict';

const bank = require('../question-bank.json');
const generators = require('../tool/generators.js');
const validators = require('../tool/validators.js');

const A_VALUES = [1, 2, 3];
const C_VALUES = [1, 2, 3];
const BD_VALUES = [-6, -5, -4, -3, -2, 2, 3, 4, 5, 6];

let passed = 0;
const failures = [];

function check(label, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

function gcd(x, y) {
  x = Math.abs(x);
  y = Math.abs(y);
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 0;
}

function isLegal(a, b, c, d) {
  return !(a === c && b === d)
    && !(gcd(a, b) > 1 && gcd(c, d) > 1)
    && (a * d + b * c) !== 0
    && b !== 0
    && d !== 0;
}

function legalCombos() {
  const combos = [];
  for (const a of A_VALUES) {
    for (const c of C_VALUES) {
      for (const b of BD_VALUES) {
        for (const d of BD_VALUES) {
          if (isLegal(a, b, c, d)) combos.push({ a, b, c, d });
        }
      }
    }
  }
  return combos;
}

function typeDef() {
  const def = bank.data.find((item) => item.key === 'factor_cross');
  if (!def) throw new Error('missing typeDef factor_cross');
  return def;
}

function assemble(def, result) {
  return {
    typeKey: def.key,
    type: def.type,
    checkType: def.checkType,
    validator: def.validator || def.checkType,
    correctAnswer: result.correctAnswer,
    answers: result.answers,
    answerSpec: result.answerSpec || def.answerSpec,
  };
}

function makeSeededRandom(seed) {
  let s = seed | 0;
  return function random() {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    return ((s >>> 0) / 0x100000000);
  };
}

function withSeed(seed, fn) {
  const original = Math.random;
  Math.random = makeSeededRandom(seed);
  try {
    return fn();
  } finally {
    Math.random = original;
  }
}

function lin(a, b) {
  return `${a === 1 ? 'x' : `${a}x`}${b >= 0 ? '+' : ''}${b}`;
}

function expectedSpec(a, b, c, d) {
  const g1 = gcd(a, b);
  const g2 = gcd(c, d);
  return { coefficient: g1 * g2, factors: [[a / g1, b / g1], [c / g2, d / g2]] };
}

function answerFromSpec(spec) {
  const prefix = spec.coefficient === 1 ? '' : String(spec.coefficient);
  return `${prefix}(${lin(spec.factors[0][0], spec.factors[0][1])})(${lin(spec.factors[1][0], spec.factors[1][1])})`;
}

console.log('=== factor_cross random parameter contract ===');

const def = typeDef();
check('factor_cross uses factorPair validator', (def.validator || def.checkType) === 'factorPair', def.validator || def.checkType);
check('factor_cross keeps NA-19 family code', String(def.code || '').endsWith('-NA-19'), def.code || '');
check('factor_cross has no defaultParams lock', def.defaultParams === undefined, JSON.stringify(def.defaultParams));

const combos = legalCombos();
check('factor_cross legal combo count = 748', combos.length === 748, String(combos.length));
check('exclude rule 1: no perfect square combos remain',
  combos.every(({ a, b, c, d }) => !(a === c && b === d)));
check('exclude rule 2: no both-factors-common-factor combos remain',
  combos.every(({ a, b, c, d }) => !(gcd(a, b) > 1 && gcd(c, d) > 1)));
check('exclude rule 3: no zero-middle-term combos remain',
  combos.every(({ a, b, c, d }) => (a * d + b * c) !== 0));
check('exclude rule 4: no zero constant factor terms remain',
  combos.every(({ b, d }) => b !== 0 && d !== 0));

const explicit = generators.generateQuestion(def, { a: 1, b: 2, c: 1, d: 3 });
const expectedExplicit = {
  questionHTML: '6. 因式分解 \\( x^2+5x+6 \\)。',
  correctAnswer: '(x+2)(x+3)',
  paramsUsed: { a: 1, b: 2, c: 1, d: 3, x2: 1, x1: 5, constTerm: 6, commonFactor: 1 },
  solutionHTML: '<div>用十字相乘法：</div><div>尋找兩個一次因式，使乘開後中間項為 \\(5x\\)。</div><div>完全因式分解：\\( x^2+5x+6 = (x+2)(x+3) \\)</div>',
  pdfText: '6. 因式分解 \\( x^2+5x+6 \\)。',
  answers: ['(x+2)(x+3)'],
  displayAnswer: '(x+2)(x+3)',
  steps: '<div>用十字相乘法：</div><div>尋找兩個一次因式，使乘開後中間項為 \\(5x\\)。</div><div>完全因式分解：\\( x^2+5x+6 = (x+2)(x+3) \\)</div>',
  checkType: 'factorPair',
  answerSpec: { factors: [[1, 2], [1, 3]] },
};
for (const field of ['questionHTML', 'correctAnswer', 'paramsUsed', 'solutionHTML', 'pdfText', 'answers', 'displayAnswer', 'steps', 'checkType', 'answerSpec']) {
  check(`explicit {a:1,b:2,c:1,d:3} ${field} matches pre-fix output`,
    JSON.stringify(explicit[field]) === JSON.stringify(expectedExplicit[field]),
    JSON.stringify(explicit[field]));
}

const comboFailures = [];
for (const combo of combos) {
  const { a, b, c, d } = combo;
  const result = generators.generateQuestion(def, combo);
  const q = assemble(def, result);
  const spec = expectedSpec(a, b, c, d);
  const canonical = answerFromSpec(spec);
  const swapped = `${spec.coefficient === 1 ? '' : String(spec.coefficient)}(${lin(spec.factors[1][0], spec.factors[1][1])})(${lin(spec.factors[0][0], spec.factors[0][1])})`;
  const incomplete = `(${lin(a, b)})(${lin(c, d)})`;
  const signError = `${spec.coefficient === 1 ? '' : String(spec.coefficient)}(${lin(spec.factors[0][0], -spec.factors[0][1])})(${lin(spec.factors[1][0], -spec.factors[1][1])})`;
  const wrongPair = '(x+99)(x+99)';
  const paramsOk = result.paramsUsed.a === a
    && result.paramsUsed.b === b
    && result.paramsUsed.c === c
    && result.paramsUsed.d === d
    && result.paramsUsed.x2 === a * c
    && result.paramsUsed.x1 === a * d + b * c
    && result.paramsUsed.constTerm === b * d;
  const canonicalOk = validators.checkAnswer(q, canonical);
  const swappedOk = validators.checkAnswer(q, swapped);
  const incompleteOk = spec.coefficient > 1 ? validators.checkAnswer(q, incomplete) : false;
  const signErrorOk = validators.checkAnswer(q, signError);
  const wrongPairOk = validators.checkAnswer(q, wrongPair);
  check(`a=${a},b=${b},c=${c},d=${d} preserves params`, paramsOk, JSON.stringify(result.paramsUsed));
  check(`a=${a},b=${b},c=${c},d=${d} accepts canonical answer`, canonicalOk, canonical);
  check(`a=${a},b=${b},c=${c},d=${d} accepts factor order swap`, swappedOk, swapped);
  check(`a=${a},b=${b},c=${c},d=${d} rejects incomplete factorization`, !incompleteOk, incomplete);
  check(`a=${a},b=${b},c=${c},d=${d} rejects sign error`, !signErrorOk, signError);
  check(`a=${a},b=${b},c=${c},d=${d} rejects wrong factor pair`, !wrongPairOk, wrongPair);
  if (!paramsOk || !canonicalOk || !swappedOk || incompleteOk || signErrorOk || wrongPairOk) {
    comboFailures.push({ combo, paramsOk, canonicalOk, swappedOk, incompleteOk, signErrorOk, wrongPairOk, result });
  }
}
check('factor_cross all 748 legal combos pass validator checks',
  comboFailures.length === 0,
  JSON.stringify(comboFailures.slice(0, 20)));

const seen = withSeed(0xFACC0055, () => {
  const signatures = new Set();
  for (let i = 0; i < 30; i += 1) {
    const result = generators.generateQuestion(def, {});
    signatures.add(JSON.stringify({
      a: result.paramsUsed.a,
      b: result.paramsUsed.b,
      c: result.paramsUsed.c,
      d: result.paramsUsed.d,
    }));
  }
  return signatures;
});
check('factor_cross gets at least 5 distinct params in 30 generated samples',
  seen.size >= 5,
  `got ${seen.size}: ${Array.from(seen).join(' | ')}`);

if (failures.length) {
  console.error(`\n${failures.length} factor_cross failure(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`\n${passed} factor_cross checks passed.`);
