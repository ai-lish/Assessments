#!/usr/bin/env node
'use strict';

const bank = require('../question-bank.json');
const generators = require('../tool/generators.js');
const validators = require('../tool/validators.js');

const R_VALUES = [3, 4, 5, 6, 8, 9, 10, 12];
const ANGLES = [30, 45, 60, 90, 120, 135, 150, 180];
const ASKS = ['area', 'arc'];

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

const typeDef = bank.data.find((item) => item.key === 'sector_measure');
if (!typeDef) throw new Error('missing typeDef sector_measure');

function assemble(result) {
  return {
    typeKey: typeDef.key,
    type: typeDef.type,
    checkType: typeDef.checkType,
    validator: typeDef.validator || typeDef.checkType,
    correctAnswer: result.correctAnswer,
    answers: result.answers,
    answerSpec: result.answerSpec || typeDef.answerSpec,
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

console.log('=== sector_measure random parameter contract ===');

const explicit = generators.generateQuestion(typeDef, { r: 6, angle: 60, ask: 'area' });
const expectedExplicit = {
  questionHTML: '13. 扇形半徑為 \\(6\\text{ cm}\\)，圓心角為 \\(60^\\circ\\)。求面積。',
  correctAnswer: '18.85',
  paramsUsed: { r: 6, angle: 60, ask: 'area', piCoeff: 6, decimal: '18.85' },
  solutionHTML: '<div>公式：\\(\\frac{\\theta}{360^\\circ}\\times\\pi r^2\\)</div><div>答案：\\(6π\\text{ cm^2} \\approx 18.85\\)</div>',
  pdfText: '13. 扇形半徑為 \\(6\\text{ cm}\\)，圓心角為 \\(60^\\circ\\)。求面積。',
  answers: ['18.85', '6π'],
  displayAnswer: '6π cm^2 ≈ 18.85 cm^2',
  steps: '<div>公式：\\(\\frac{\\theta}{360^\\circ}\\times\\pi r^2\\)</div><div>答案：\\(6π\\text{ cm^2} \\approx 18.85\\)</div>',
  checkType: 'unitNumeric',
  answerSpec: { allowUnit: true, unit: 'cm^2', tolerance: 0.05, exactPiCoefficient: 6 },
};
check('explicit {r:6,angle:60,ask:"area"} matches pre-fix output',
  JSON.stringify(explicit) === JSON.stringify(expectedExplicit),
  JSON.stringify(explicit));

let total = 0;
let accepted = 0;
const failuresByCombo = [];
for (const r of R_VALUES) {
  for (const angle of ANGLES) {
    for (const ask of ASKS) {
      total += 1;
      const result = generators.generateQuestion(typeDef, { r, angle, ask });
      const q = assemble(result);
      const decimalOk = validators.checkAnswer(q, result.correctAnswer);
      const piOk = validators.checkAnswer(q, result.answers[1]);
      const textOk = ask === 'arc'
        ? result.questionHTML.includes('求弧長') && result.answerSpec.unit === 'cm'
        : result.questionHTML.includes('求面積') && result.answerSpec.unit === 'cm^2';
      if (decimalOk && piOk && textOk) {
        accepted += 1;
      } else {
        failuresByCombo.push({ r, angle, ask, decimalOk, piOk, textOk, result });
      }
    }
  }
}
check('sector_measure enumerates 128 requested combos', total === 128, String(total));
check('sector_measure all 128 combos pass unitNumeric and matching prompt/unit',
  accepted === 128,
  JSON.stringify(failuresByCombo));

const seen = withSeed(0x5ec700, () => {
  const signatures = new Set();
  for (let i = 0; i < 30; i += 1) {
    const result = generators.generateQuestion(typeDef, {});
    signatures.add(JSON.stringify({
      r: result.paramsUsed.r,
      angle: result.paramsUsed.angle,
      ask: result.paramsUsed.ask,
    }));
  }
  return signatures;
});
check('sector_measure gets at least 5 distinct params in 30 generated samples',
  seen.size >= 5,
  `got ${seen.size}: ${Array.from(seen).join(' | ')}`);

if (failures.length) {
  console.error(`\n${failures.length} sector_measure failure(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`\n${passed} sector_measure checks passed.`);
