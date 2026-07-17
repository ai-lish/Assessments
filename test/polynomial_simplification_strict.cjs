#!/usr/bin/env node
'use strict';

const bank = require('../question-bank.json');
const generators = require('../tool/generators.js');
const validators = require('../tool/validators.js');

let passed = 0;
const failures = [];

function check(label, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log('  ✓ ' + label);
  } else {
    failures.push(label + (detail ? ' — ' + detail : ''));
    console.log('  ✗ ' + label + (detail ? ' — ' + detail : ''));
  }
}

function typeDef(key) {
  return bank.data.find((item) => item.key === key);
}

function assemble(key, params) {
  const def = typeDef(key);
  const result = generators.generateQuestion(def, params);
  return Object.assign({}, result, {
    typeKey: def.key,
    checkType: def.checkType || result.checkType,
    validator: def.validator || result.validator || def.checkType || result.checkType,
    answerSpec: result.answerSpec || def.answerSpec,
  });
}

function expectAnswer(question, input, expected, label) {
  check(label, validators.checkAnswer(question, input) === expected, input);
}

console.log('=== Stage 1: combined univariate polynomial answers ===');

const stage1Cases = [
  {
    key: 's1t2_alg_simplify',
    params: { a: -5, b: -7, c: 2, d: -3 },
    canonical: '-3x-10',
    reordered: '-10-3x',
    uncombined: '-5x+2x-10',
  },
  {
    key: 'expand_bracket',
    params: { k: -3, a: 2, b: -4 },
    canonical: '-6x+12',
    reordered: '12-6x',
    uncombined: '-3x-3x+12',
  },
  {
    key: 'poly_add_sub',
    params: { a: 3, b: -2, c: 5, d: 1, e: -4, f: -1, op: '-' },
    canonical: '2x^2+2x+6',
    reordered: '6+2x+2x^2',
    uncombined: '3x^2-x^2-2x+4x+6',
  },
  {
    key: 'binomial_expand',
    params: { a: 1, b: 2, c: 4, d: -1 },
    canonical: '4x^2+7x-2',
    reordered: '7x-2+4x^2',
    uncombined: '4x^2+8x-x-2',
  },
  {
    key: 's3t3_square_expand',
    params: { a: 2, b: -3, square: true },
    canonical: '4x^2-12x+9',
    reordered: '9+4x^2-12x',
    uncombined: '4x^2-6x-6x+9',
  },
  {
    key: 'alg_simplify',
    params: { a: -3, b: -4, c: 5, d: -2 },
    canonical: '2x-6',
    reordered: '-6+2x',
    uncombined: '2x+x-x-6',
  },
];

for (const item of stage1Cases) {
  const def = typeDef(item.key);
  const question = assemble(item.key, item.params);
  check(`${item.key} uses polyTerms loose metadata`, def.checkType === 'polyTerms' && def.validator === 'polyTerms' && def.answerSpec && def.answerSpec.order === 'loose');
  check(`${item.key} generated canonical answer is stable`, question.correctAnswer === item.canonical, question.correctAnswer);
  expectAnswer(question, item.canonical, true, `${item.key} accepts canonical combined answer`);
  expectAnswer(question, item.reordered, true, `${item.key} accepts combined reordered answer`);
  expectAnswer(question, item.uncombined, false, `${item.key} rejects uncombined like terms`);
}

const zeroQuestion = {
  checkType: 'polyTerms',
  validator: 'polyTerms',
  correctAnswer: '0',
  answerSpec: { order: 'loose' },
};
expectAnswer(zeroQuestion, '0', true, 'polyTerms accepts zero as the whole polynomial');
expectAnswer(assemble('binomial_expand', { a: 1, b: 2, c: 4, d: -1 }), '4x^2+7x-2+0', false, 'polyTerms rejects an explicit zero term');

console.log('\n' + '='.repeat(60));
if (failures.length > 0) {
  console.log(`❌ ${failures.length} polynomial simplification failure(s):`);
  failures.forEach((failure) => console.log('  - ' + failure));
  process.exit(1);
}
console.log(`✅ polynomial simplification checks passed (${passed} checks)`);
