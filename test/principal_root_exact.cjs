#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const bank = require('../question-bank.json');
const generators = require('../tool/generators.js');
const validators = require('../tool/validators.js');
const pdf = require('../tool/pdf.js');

const ROOT = path.resolve(__dirname, '..');
const failures = [];
let passed = 0;

function check(label, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log('  ✓ ' + label);
  } else {
    failures.push(label + (detail ? ' — ' + detail : ''));
    console.log('  ✗ ' + label + (detail ? ' — ' + detail : ''));
  }
}

function assemble(def, result) {
  return Object.assign({}, result, {
    typeKey: def.key,
    type: def.type,
    checkType: def.checkType || result.checkType,
    validator: def.validator || result.validator || def.checkType || result.checkType,
    answerSpec: result.answerSpec || def.answerSpec,
    code: def.code,
  });
}

const rootDef = bank.data.find((item) => item.key === 'square_root_pm');
const candidateAnswers = new Map([
  [100, '10'], [144, '12'], [49, '7'], [81, '9'], [64, '8'],
  [25, '5'], [36, '6'], [16, '4'], [9, '3'], [4, '2'],
  [72, '6√2'], [50, '5√2'], [48, '4√3'], [45, '3√5'], [63, '3√7'],
  [98, '7√2'], [200, '10√2'], [80, '4√5'], [75, '5√3'], [52, '2√13'],
  [28, '2√7'], [20, '2√5'], [12, '2√3'], [8, '2√2'], [18, '3√2'],
  [27, '3√3'], [44, '2√11'], [68, '2√17'], [90, '3√10'], [150, '5√6'],
]);

console.log('=== Principal-root generator candidates ===');
check('square_root_pm keeps its stable typeKey', rootDef && rootDef.key === 'square_root_pm');
check('square_root_pm keeps code LSC-2526-S2-T3-15-NA-27', rootDef && rootDef.code === 'LSC-2526-S2-T3-15-NA-27');
check('square_root_pm uses principalRootExact metadata', rootDef && rootDef.checkType === 'principalRootExact' && rootDef.validator === 'principalRootExact');
check('square_root_pm display name is 化簡平方根', rootDef && rootDef.name === '化簡平方根');
check('square_root_pm reference answer is the positive root', rootDef && rootDef.referenceAnswer === '10');

for (const [n, expected] of candidateAnswers) {
  const generated = generators.generateQuestion(rootDef, { n });
  const question = assemble(rootDef, generated);
  const isRadical = generated.paramsUsed.m !== 1;
  check(`√${n} canonical principal root = ${expected}`, generated.correctAnswer === expected, generated.correctAnswer);
  check(`√${n} answers contains only the canonical positive root`, JSON.stringify(generated.answers) === JSON.stringify([expected]), JSON.stringify(generated.answers));
  check(`√${n} displayAnswer is the positive root`, generated.displayAnswer === expected, generated.displayAnswer);
  check(`√${n} canonical answer is accepted`, validators.checkAnswer(question, expected));
  check(`√${n} has the correct radical-hint state`, generated.questionHTML.includes('（答案以根式表示）') === isRadical, generated.questionHTML);
  check(`√${n} pdfText matches questionHTML`, generated.pdfText === generated.questionHTML);
  check(`√${n} solution uses principal-root wording`, generated.solutionHTML.includes('取主平方根'));
  check(`√${n} solution contains no plus-minus notation`, !generated.solutionHTML.includes('\\pm') && !generated.solutionHTML.includes('正負兩根'));
}

console.log('\n=== principalRootExact accepted input forms ===');
const radicalQuestion = assemble(rootDef, generators.generateQuestion(rootDef, { n: 150 }));
for (const input of ['5√6', ' 5√6 ', '5 √6', '5√ 6', '5 √ 6']) {
  check(`radical form accepted: ${JSON.stringify(input)}`, validators.checkAnswer(radicalQuestion, input));
}
const integerQuestion = assemble(rootDef, generators.generateQuestion(rootDef, { n: 144 }));
for (const input of ['12', ' 12 ']) {
  check(`integer form accepted: ${JSON.stringify(input)}`, validators.checkAnswer(integerQuestion, input));
}

console.log('\n=== principalRootExact rejected input forms ===');
for (const input of ['±5√6', '5√6xyz', '5abc', '5', '5√2', '6√5', 'abc5√6', 'x=5√6', '-5√6', '5*√6']) {
  check(`invalid radical form rejected: ${JSON.stringify(input)}`, !validators.checkAnswer(radicalQuestion, input));
}
for (const input of ['±12', '12.247', '12abc', 'abc12', '+12']) {
  check(`invalid integer form rejected: ${JSON.stringify(input)}`, !validators.checkAnswer(integerQuestion, input));
}

console.log('\n=== shared textExact behavior remains unchanged ===');
const textExactBaselines = [
  ['area_circle', { radius: 3 }, '28.27', true],
  ['frac_arith', { factor: 2, bottom: -3, a: 5, b: 11, c: 4, d: 1 }, '2', true],
  ['exp_law', { a: 2, b: 5 }, 'x^7', false],
  ['alg_simplify', { a: -3, b: -4, c: 5, d: -2 }, '2x-6', true],
  ['sig_fig', { baseNum: 184.62, sf: 3 }, '185', true],
  ['poly_desc', { b: 3, c: 5 }, 'x^2+3x-5', false],
  ['alg_simplify_2var', { a1: 3, b1: 4, a2: 2, b2: 1, op: '-' }, 'a+3b', false],
  ['s2t3_square_expand_2var', { a: 2, b: 3, c: 1, d: -4 }, 'x^2+6xy+9y^2', false],
  ['factor_neg_common', { k: 3, d1: 2 }, '-3x(x+1)', true],
  ['combine_fractions', { m: 5, c: 3 }, '(5a+3)/(5k)', false],
  ['coef_exp_div', { expD: 2, expN: 5, rNum: 3, rDen: 4, scale: 2 }, '3x^3/4', true],
  ['ratio_three', { aB: 2, bB: 3, aC: 4, cC: 5 }, '4:6:5', true],
  ['s2t3_sig_fig', { baseNum: 184.62, sf: 3 }, '185', true],
  ['s2t3_exp_law', { a: 2, b: 5 }, 'x^7', false],
];
const remainingTextExact = bank.data.filter((item) => item.validator === 'textExact').map((item) => item.key);
check('exactly the other 14 typeDefs remain on textExact', JSON.stringify(remainingTextExact) === JSON.stringify(textExactBaselines.map((item) => item[0])), JSON.stringify(remainingTextExact));
for (const [key, params, expectedAnswer, expectedTailResult] of textExactBaselines) {
  const def = bank.data.find((item) => item.key === key);
  const generated = generators.generateQuestion(def, params);
  const question = assemble(def, generated);
  check(`${key} pre-change canonical answer is unchanged`, generated.correctAnswer === expectedAnswer, generated.correctAnswer);
  check(`${key} canonical textExact result remains true`, validators.checkAnswer(question, expectedAnswer));
  check(`${key} surrounding-space textExact result remains true`, validators.checkAnswer(question, ` ${expectedAnswer} `));
  check(`${key} trailing-text textExact result remains ${expectedTailResult}`, validators.checkAnswer(question, expectedAnswer + 'xyz') === expectedTailResult);
  check(`${key} obvious-wrong textExact result remains false`, !validators.checkAnswer(question, '__principal_root_wrong__'));
}

console.log('\n=== Student/PDF display contracts ===');
const specs = [{ qid: 'q015', typeKey: rootDef.key, typeDef: JSON.parse(JSON.stringify(rootDef)), params: { n: 150 } }];
const snapshot = pdf.generateSnapshotFromSpecs(specs, 'principal-root-exact', {
  title: 'Principal root fixture',
  presetKey: 'principal_root_exact',
  generatedAt: '2026-07-17T00:00:00.000Z',
  generatorApi: generators,
});
const studentHtml = pdf.renderPDF(snapshot, 'student', { showCode: true });
const teacherHtml = pdf.renderPDF(snapshot, 'teacher', { showCode: true });
check('student PDF question includes radical-form hint', studentHtml.includes('（答案以根式表示）'));
check('teacher PDF question includes radical-form hint', teacherHtml.includes('（答案以根式表示）'));
check('teacher PDF displays the positive simplified radical', teacherHtml.includes('5\\sqrt{6}'));
check('teacher PDF has no plus-minus answer', !teacherHtml.includes('\\pm'));
const template = fs.readFileSync(path.join(ROOT, 'templates/student.html'), 'utf8');
check('student keypad still exposes the radical key', /"square_root_pm":\s*\[[^\]]*"√"/.test(template));
check('keypad configuration was intentionally left unchanged', /"square_root_pm":\s*\["±",\s*"√",\s*","\]/.test(template));

console.log(`\n=== Summary: ${passed} passed, ${failures.length} failed ===`);
if (failures.length) {
  failures.forEach((failure) => console.error('  - ' + failure));
  process.exit(1);
}
