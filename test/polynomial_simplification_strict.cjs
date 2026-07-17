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
    nonCanonical: '-3x^1-10',
  },
  {
    key: 'expand_bracket',
    params: { k: -3, a: 2, b: -4 },
    canonical: '-6x+12',
    reordered: '12-6x',
    uncombined: '-3x-3x+12',
    nonCanonical: '-6x^1+12',
  },
  {
    key: 'poly_add_sub',
    params: { a: 3, b: -2, c: 5, d: 1, e: -4, f: -1, op: '-' },
    canonical: '2x^2+2x+6',
    reordered: '6+2x+2x^2',
    uncombined: '3x^2-x^2-2x+4x+6',
    nonCanonical: '2x^2+2x^1+6',
  },
  {
    key: 'binomial_expand',
    params: { a: 1, b: 2, c: 4, d: -1 },
    canonical: '4x^2+7x-2',
    reordered: '7x-2+4x^2',
    uncombined: '4x^2+8x-x-2',
    nonCanonical: '4x^2+7x^1-2',
  },
  {
    key: 's3t3_square_expand',
    params: { a: 2, b: -3, square: true },
    canonical: '4x^2-12x+9',
    reordered: '9+4x^2-12x',
    uncombined: '4x^2-6x-6x+9',
    nonCanonical: '4x^2-12x^1+9',
  },
  {
    key: 'alg_simplify',
    params: { a: -3, b: -4, c: 5, d: -2 },
    canonical: '2x-6',
    reordered: '-6+2x',
    uncombined: '2x+x-x-6',
    nonCanonical: '2x^1-6',
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
  expectAnswer(question, item.nonCanonical, false, `${item.key} rejects non-canonical x^1 notation`);
}

const zeroQuestion = {
  checkType: 'polyTerms',
  validator: 'polyTerms',
  correctAnswer: '0',
  answerSpec: { order: 'loose' },
};
expectAnswer(zeroQuestion, '0', true, 'polyTerms accepts zero as the whole polynomial');
expectAnswer(assemble('binomial_expand', { a: 1, b: 2, c: 4, d: -1 }), '4x^2+7x-2+0', false, 'polyTerms rejects an explicit zero term');

console.log('\n=== Stage 2: combined multivariable polynomial answers ===');

const multiCases = [
  {
    key: 'alg_simplify_2var',
    params: { a1: 3, b1: 4, a2: 2, b2: 1, op: '-' },
    canonical: 'a+3b',
    reordered: '3b+a',
    uncombined: '3a-2a+4b-b',
    nonCanonical: '1a+3b',
  },
  {
    key: 's2t3_square_expand_2var',
    params: { b: 3, twoVar: true },
    canonical: 'x^2+6xy+9y^2',
    reordered: '9y^2+x^2+6xy',
    uncombined: 'x^2+3xy+3xy+9y^2',
    nonCanonical: '1x^2+6xy+9y^2',
  },
];

for (const item of multiCases) {
  const def = typeDef(item.key);
  const question = assemble(item.key, item.params);
  check(`${item.key} uses multivariablePolyTerms metadata`, def.checkType === 'multivariablePolyTerms' && def.validator === 'multivariablePolyTerms');
  check(`${item.key} generated canonical answer is stable`, question.correctAnswer === item.canonical, question.correctAnswer);
  expectAnswer(question, item.canonical, true, `${item.key} accepts canonical combined answer`);
  expectAnswer(question, item.reordered, true, `${item.key} accepts combined reordered answer`);
  expectAnswer(question, item.uncombined, false, `${item.key} rejects repeated monomial signatures`);
  expectAnswer(question, item.nonCanonical, false, `${item.key} rejects an explicit unit coefficient`);
}

const genericMultivariableQuestion = {
  checkType: 'multivariablePolyTerms',
  validator: 'multivariablePolyTerms',
  correctAnswer: 'a^2+2ab+b^2',
};
expectAnswer(genericMultivariableQuestion, 'a^2+ab+ab+b^2', false, 'multivariable validator rejects a repeated ab signature');
expectAnswer(genericMultivariableQuestion, 'a^2+2ab+b^2', true, 'multivariable validator accepts canonical signatures');
expectAnswer(genericMultivariableQuestion, 'b^2+a^2+2ab', true, 'multivariable validator ignores term order');
expectAnswer(genericMultivariableQuestion, 'a^2+3ab+b^2', false, 'multivariable validator compares coefficients exactly');

console.log('\n=== Stage 3: canonical simplified notation ===');

const genericUnivariateQuestion = {
  checkType: 'polyTerms',
  validator: 'polyTerms',
  correctAnswer: 'x^2+x-2',
  answerSpec: { order: 'loose' },
};
expectAnswer(genericUnivariateQuestion, '1x^2+x-2', false, 'univariate rejects explicit coefficient 1 on x^2');
expectAnswer(genericUnivariateQuestion, 'x^2+1x-2', false, 'univariate rejects explicit coefficient 1 on x');
expectAnswer({ ...genericUnivariateQuestion, correctAnswer: 'x^2-x-2' }, 'x^2-1x-2', false, 'univariate rejects explicit coefficient -1 on x');
expectAnswer(genericUnivariateQuestion, 'x^2+x^1-2', false, 'univariate rejects explicit exponent 1');
expectAnswer({ ...genericUnivariateQuestion, correctAnswer: 'x^2+x+1' }, 'x^2+x+x^0', false, 'univariate rejects explicit exponent 0');
expectAnswer(genericUnivariateQuestion, 'x^2+x-2+0', false, 'univariate rejects an explicit zero constant');
expectAnswer(genericUnivariateQuestion, '0x^3+x^2+x-2', false, 'univariate rejects an explicit zero variable term');
expectAnswer(genericUnivariateQuestion, 'x^2+x-2', true, 'univariate accepts omitted unit coefficients');
expectAnswer(genericUnivariateQuestion, '-2+x+x^2', true, 'univariate accepts reordered canonical terms');
expectAnswer(genericUnivariateQuestion, ' x^2 + x − 2 ', true, 'univariate accepts spaces and Unicode minus');
expectAnswer(genericUnivariateQuestion, 'x**2+x-2', true, 'univariate keeps the supported double-asterisk exponent form');

expectAnswer(genericMultivariableQuestion, '1a^2+2ab+b^2', false, 'multivariable rejects explicit coefficient 1 on a^2');
expectAnswer({ ...genericMultivariableQuestion, correctAnswer: '-a^2+2ab+b^2' }, '-1a^2+2ab+b^2', false, 'multivariable rejects explicit coefficient -1 on a^2');
expectAnswer(genericMultivariableQuestion, 'a^2+2a^1b+b^2', false, 'multivariable rejects explicit exponent 1');
expectAnswer({ ...genericMultivariableQuestion, correctAnswer: 'a^2+2ab+b^2+1' }, 'a^2+2ab+b^2+x^0', false, 'multivariable rejects explicit exponent 0');
expectAnswer(genericMultivariableQuestion, 'a^2+2ab+b^2+0', false, 'multivariable rejects an explicit zero constant');
expectAnswer(genericMultivariableQuestion, '0x+a^2+2ab+b^2', false, 'multivariable rejects an explicit zero variable term');
expectAnswer(genericMultivariableQuestion, 'a^2+2ab+b^2', true, 'multivariable accepts omitted unit coefficients');
expectAnswer(genericMultivariableQuestion, 'b^2 + a^2 + 2ab', true, 'multivariable accepts spaces and reordered terms');
expectAnswer(genericMultivariableQuestion, 'b^2+a^2+2ab', true, 'multivariable accepts all legal canonical signatures');
expectAnswer({ checkType: 'multivariablePolyTerms', validator: 'multivariablePolyTerms', correctAnswer: '0' }, '0', true, 'multivariable accepts zero as the whole polynomial');

const strictOrderQuestion = {
  checkType: 'polyTerms',
  validator: 'polyTerms',
  correctAnswer: 'x^2+3x-4',
  answerSpec: { order: 'strict' },
};
expectAnswer(strictOrderQuestion, '1x^2+3x-4', true, 'notation tightening stays scoped away from strict poly_desc marking');

console.log('\n' + '='.repeat(60));
if (failures.length > 0) {
  console.log(`❌ ${failures.length} polynomial simplification failure(s):`);
  failures.forEach((failure) => console.log('  - ' + failure));
  process.exit(1);
}
console.log(`✅ polynomial simplification checks passed (${passed} checks)`);
