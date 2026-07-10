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

console.log('=== PR-MATHFIX contract ===');

const unitQ = { checkType: 'unitNumeric', validator: 'unitNumeric', correctAnswer: '134.041', answerSpec: { tolerance: 0.05 } };
check('unitNumeric accepts 128π/3', validators.checkAnswer(unitQ, '128π/3'));
check('unitNumeric accepts \\frac{128}{3}π', validators.checkAnswer(unitQ, '\\frac{128}{3}π'));
check('unitNumeric accepts \\frac{128}{3}\\pi', validators.checkAnswer(unitQ, '\\frac{128}{3}\\pi'));
check('unitNumeric accepts 128/3π', validators.checkAnswer(unitQ, '128/3π'));
check('unitNumeric accepts (128/3)π', validators.checkAnswer(unitQ, '(128/3)π'));
check('unitNumeric accepts 128pi/3', validators.checkAnswer(unitQ, '128pi/3'));
check('unitNumeric rejects wrong pi fraction value', !validators.checkAnswer(unitQ, '\\frac{127}{3}π'));

const diffDef = typeDef('factor_diff_sq');
const diff = generators.generateQuestion(diffDef, { a: 2, b: 4 });
const diffQ = assemble(diffDef, diff);
check('factor_diff_sq emits complete factorization', diff.correctAnswer === '4(x-2)(x+2)', diff.correctAnswer);
check('factor_diff_sq accepts coefficient prefix', validators.checkAnswer(diffQ, '4(x-2)(x+2)'));
check('factor_diff_sq accepts coefficient between factors', validators.checkAnswer(diffQ, '(x+2)·4·(x-2)'));
check('factor_diff_sq rejects incomplete factorization', !validators.checkAnswer(diffQ, '(2x-4)(2x+4)'));
check('factor_diff_sq rejects wrong coefficient', !validators.checkAnswer(diffQ, '5(x-2)(x+2)'));

const crossDef = typeDef('factor_cross');
const cross = generators.generateQuestion(crossDef, { a: 1, b: -2, c: 2, d: -6 });
const crossQ = assemble(crossDef, cross);
check('factor_cross emits complete factorization', cross.correctAnswer === '2(x-2)(x-3)', cross.correctAnswer);
check('factor_cross accepts coefficient prefix', validators.checkAnswer(crossQ, '2(x-2)(x-3)'));
check('factor_cross accepts coefficient between factors', validators.checkAnswer(crossQ, '(x-3)*2*(x-2)'));
check('factor_cross rejects incomplete factorization', !validators.checkAnswer(crossQ, '(x-2)(2x-6)'));
check('factor_cross rejects wrong coefficient', !validators.checkAnswer(crossQ, '3(x-2)(x-3)'));

const combineDef = typeDef('combine_fractions');
const combine = generators.generateQuestion(combineDef, { m: 9, c: 6 });
const combineQ = assemble(combineDef, combine);
check('combine_fractions simplifies answer', combine.correctAnswer === '(3a+2)/(3k)', combine.correctAnswer);
check('combine_fractions accepts simplified answer', validators.checkAnswer(combineQ, '(3a+2)/(3k)'));
check('combine_fractions rejects unsimplified answer', !validators.checkAnswer(combineQ, '(9a+6)/(9k)'));

const ratioDef = typeDef('ratio_three');
const ratio = generators.generateQuestion(ratioDef, { aB: 2, bB: 8, aC: 7, cC: 3 });
const ratioQ = assemble(ratioDef, ratio);
check('ratio_three simplifies answer', ratio.correctAnswer === '7:28:3', ratio.correctAnswer);
check('ratio_three accepts simplified answer', validators.checkAnswer(ratioQ, '7:28:3'));
check('ratio_three rejects unsimplified answer', !validators.checkAnswer(ratioQ, '14:56:6'));

console.log('\n' + '='.repeat(60));
if (failures.length) {
  console.log(`❌ ${failures.length} mathfix contract failure(s):`);
  failures.forEach((failure) => console.log(`  - ${failure}`));
  process.exit(1);
}
console.log(`✅ mathfix contract passed (${passed} checks)`);
