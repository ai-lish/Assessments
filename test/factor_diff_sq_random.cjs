#!/usr/bin/env node
'use strict';

const bank = require('../question-bank.json');
const generators = require('../tool/generators.js');
const validators = require('../tool/validators.js');

const A_VALUES = [1, 2, 3];
const B_VALUES = [2, 3, 4, 5, 6, 7, 8, 9];
const TYPE_KEYS = ['s2t3_factor_diff_sq', 'factor_diff_sq'];

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

function typeDef(key) {
  const def = bank.data.find((item) => item.key === key);
  if (!def) throw new Error(`missing typeDef ${key}`);
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
  const left = a === 1 ? 'x' : `${a}x`;
  return `${left}${b >= 0 ? '+' : ''}${b}`;
}

console.log('=== factor_diff_sq random parameter contract ===');

for (const key of TYPE_KEYS) {
  const def = typeDef(key);
  check(`${key} uses factor_diff_sq generator`, def.generator === 'factor_diff_sq', def.generator);
  check(`${key} keeps NA-18 family code`, String(def.code || '').endsWith('-NA-18'), def.code || '');
  check(`${key} has no defaultParams lock`, def.defaultParams === undefined, JSON.stringify(def.defaultParams));
}

const explicitDef = typeDef('factor_diff_sq');
const explicit = generators.generateQuestion(explicitDef, { a: 1, b: 5 });
const expectedExplicit = {
  questionHTML: '5. 因式分解 \\( x^2 - 25 \\)。',
  correctAnswer: '(x-5)(x+5)',
  paramsUsed: { a: 1, b: 5 },
  solutionHTML: '<div>平方差公式：\\( A^2-B^2=(A-B)(A+B) \\)。</div><div>這裡 \\(A=x\\)，\\(B=5\\)，所以答案是 \\((x-5)(x+5)\\)。</div>',
  pdfText: '5. 因式分解 \\( x^2 - 25 \\)。',
  answers: ['(x-5)(x+5)'],
  displayAnswer: '(x-5)(x+5)',
  steps: '<div>平方差公式：\\( A^2-B^2=(A-B)(A+B) \\)。</div><div>這裡 \\(A=x\\)，\\(B=5\\)，所以答案是 \\((x-5)(x+5)\\)。</div>',
  checkType: 'factorPair',
  answerSpec: { factors: [[1, -5], [1, 5]] },
};
for (const field of ['questionHTML', 'correctAnswer', 'paramsUsed', 'solutionHTML', 'pdfText', 'answers', 'displayAnswer', 'steps', 'checkType', 'answerSpec']) {
  check(`explicit {a:1,b:5} ${field} matches pre-fix output`,
    JSON.stringify(explicit[field]) === JSON.stringify(expectedExplicit[field]),
    JSON.stringify(explicit[field]));
}

let uniqueCombos = 0;
let acceptedCombos = 0;
const comboFailures = [];
for (const a of A_VALUES) {
  for (const b of B_VALUES) {
    uniqueCombos += 1;
    let comboOk = true;
    for (const key of TYPE_KEYS) {
      const def = typeDef(key);
      const result = generators.generateQuestion(def, { a, b });
      const q = assemble(def, result);
      const answerOk = validators.checkAnswer(q, result.correctAnswer);
      const swappedOk = validators.checkAnswer(q, `(${lin(a, b)})(${lin(a, -b)})`);
      const signErrorOk = validators.checkAnswer(q, `(${lin(a, b)})(${lin(a, b)})`);
      const paramsOk = result.paramsUsed.a === a && result.paramsUsed.b === b;
      const shapeOk = result.questionHTML.includes(`${a * a === 1 ? 'x^2' : `${a * a}x^2`} - ${b * b}`)
        && result.answerSpec.factors[0][0] === a
        && result.answerSpec.factors[0][1] === -b
        && result.answerSpec.factors[1][0] === a
        && result.answerSpec.factors[1][1] === b;
      check(`${key} a=${a},b=${b} preserves params`, paramsOk, JSON.stringify(result.paramsUsed));
      check(`${key} a=${a},b=${b} accepts canonical answer`, answerOk, result.correctAnswer);
      check(`${key} a=${a},b=${b} accepts factor order swap`, swappedOk);
      check(`${key} a=${a},b=${b} rejects sign error`, !signErrorOk);
      check(`${key} a=${a},b=${b} emits expected question/answerSpec shape`, shapeOk, JSON.stringify(result));
      if (!paramsOk || !answerOk || !swappedOk || signErrorOk || !shapeOk) {
        comboOk = false;
        comboFailures.push({ key, a, b, paramsOk, answerOk, swappedOk, signErrorOk, shapeOk, result });
      }
    }
    if (comboOk) acceptedCombos += 1;
  }
}
check('factor_diff_sq requested unique enumeration total = 24', uniqueCombos === 24, String(uniqueCombos));
check('factor_diff_sq all 24 unique combos pass for both S2 and S3 typeDefs',
  acceptedCombos === 24,
  JSON.stringify(comboFailures));

for (const key of TYPE_KEYS) {
  const def = typeDef(key);
  const seen = withSeed(0xFA0000 + key.length, () => {
    const signatures = new Set();
    for (let i = 0; i < 30; i += 1) {
      const result = generators.generateQuestion(def, {});
      signatures.add(JSON.stringify({ a: result.paramsUsed.a, b: result.paramsUsed.b }));
    }
    return signatures;
  });
  check(`${key} gets at least 5 distinct params in 30 generated samples`,
    seen.size >= 5,
    `got ${seen.size}: ${Array.from(seen).join(' | ')}`);
}

if (failures.length) {
  console.error(`\n${failures.length} factor_diff_sq failure(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`\n${passed} factor_diff_sq checks passed.`);
