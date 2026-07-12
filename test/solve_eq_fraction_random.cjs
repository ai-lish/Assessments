#!/usr/bin/env node
'use strict';

const bank = require('../question-bank.json');
const generators = require('../tool/generators.js');
const validators = require('../tool/validators.js');

const COEFFICIENTS = [2, 3, 4, 5, 6, 7, 8, 9];
const DENOMINATORS = [2, 3, 4, 5, 6, 7, 8, 9];
const RHS_D = [-12, -11, -10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const CONSTANTS = [-9, -8, -7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9];

let passed = 0;
const failures = [];

function check(label, condition, detail = '') {
  if (condition) passed += 1;
  else failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
}

function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    const next = a % b;
    a = b;
    b = next;
  }
  return a || 1;
}

function reduced(numerator, denominator) {
  const sign = denominator < 0 ? -1 : 1;
  numerator *= sign;
  denominator = Math.abs(denominator);
  const divisor = gcd(numerator, denominator);
  return { numerator: numerator / divisor, denominator: denominator / divisor };
}

function fractionText(value) {
  return value.denominator === 1 ? String(value.numerator) : `${value.numerator}/${value.denominator}`;
}

function makeSeededRandom(seed) {
  let state = seed | 0;
  return function random() {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
}

function withSeed(seed, fn) {
  const original = Math.random;
  Math.random = makeSeededRandom(seed);
  try { return fn(); }
  finally { Math.random = original; }
}

function typeDef(key) {
  const def = bank.data.find((item) => item.key === key);
  if (!def) throw new Error(`missing typeDef ${key}`);
  return def;
}

function assembled(def, result) {
  return {
    ...def,
    ...result,
    validator: def.validator || def.checkType,
    answerSpec: result.answerSpec || def.answerSpec,
  };
}

function same(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

const dCombos = [];
for (const a of COEFFICIENTS) {
  for (const b of RHS_D) {
    if (reduced(b, a).denominator !== 1) dCombos.push({ a, b });
  }
}

const bCombos = [];
for (const a of COEFFICIENTS) {
  for (const b of DENOMINATORS) {
    for (const c of CONSTANTS) {
      if (reduced(a, b).denominator !== 1 && reduced(b * c, a).denominator !== 1) {
        bCombos.push({ a, b, c });
      }
    }
  }
}

const cCombos = [];
for (const a of CONSTANTS) {
  for (const b of DENOMINATORS) {
    for (const c of CONSTANTS) cCombos.push({ a, b, c });
  }
}

const s1Fraction = typeDef('s1t2_solve_eq_fraction');
const s2Fraction = typeDef('solve_eq_fraction');
const bracketMixed = typeDef('solve_eq_bracket');

check('D legal combination count is 152', dCombos.length === 152, String(dCombos.length));
check('B legal combination count is 626', bCombos.length === 626, String(bCombos.length));
check('C legal combination count is 2592', cCombos.length === 2592, String(cCombos.length));
check('S1 and S2 fraction typeDefs share fraction_mixed mode',
  s1Fraction.defaultParams.mode === 'fraction_mixed' && s2Fraction.defaultParams.mode === 'fraction_mixed');
check('S1 and S2 fraction typeDefs share numericOrFraction validator',
  s1Fraction.validator === 'numericOrFraction' && s2Fraction.validator === 'numericOrFraction');
check('bracket target uses bracket_mixed and numericOrFraction',
  bracketMixed.defaultParams.mode === 'bracket_mixed' && bracketMixed.validator === 'numericOrFraction');

for (const combo of dCombos) {
  const result = generators.generateQuestion(s1Fraction, { form:'D', ...combo });
  const expected = reduced(combo.b, combo.a);
  const context = JSON.stringify(combo);
  check(`D ${context} keeps explicit params`, result.paramsUsed.a === combo.a && result.paramsUsed.b === combo.b);
  check(`D ${context} records form`, result.paramsUsed.form === 'D');
  check(`D ${context} has reduced non-integer answer`, expected.denominator !== 1 && gcd(expected.numerator, expected.denominator) === 1);
  check(`D ${context} answer matches independent calculation`, result.correctAnswer === fractionText(expected), result.correctAnswer);
  check(`D ${context} uses integer-coefficient ax=b prompt`, result.questionHTML.includes(`${combo.a}x = ${combo.b}`), result.questionHTML);
  check(`D ${context} answer accepted`, validators.checkAnswer(assembled(s1Fraction, result), result.correctAnswer));
}

for (const combo of bCombos) {
  const result = generators.generateQuestion(s1Fraction, { form:'B', ...combo });
  const coefficient = reduced(combo.a, combo.b);
  const expected = reduced(combo.b * combo.c, combo.a);
  const context = JSON.stringify(combo);
  check(`B ${context} keeps explicit params`, result.paramsUsed.a === combo.a && result.paramsUsed.b === combo.b && result.paramsUsed.c === combo.c);
  check(`B ${context} records form`, result.paramsUsed.form === 'B');
  check(`B ${context} has a genuine fractional x coefficient`, coefficient.denominator !== 1);
  check(`B ${context} has reduced non-integer answer`, expected.denominator !== 1 && gcd(expected.numerator, expected.denominator) === 1);
  check(`B ${context} answer matches independent calculation`, result.correctAnswer === fractionText(expected), result.correctAnswer);
  check(`B ${context} uses fraction prompt`, result.questionHTML.includes(`\\frac{${combo.a}x}{${combo.b}}`), result.questionHTML);
  check(`B ${context} answer accepted`, validators.checkAnswer(assembled(s1Fraction, result), result.correctAnswer));
}

for (const combo of cCombos) {
  const result = generators.generateQuestion(bracketMixed, { form:'C', ...combo });
  const expected = combo.b * combo.c - combo.a;
  const context = JSON.stringify(combo);
  check(`C ${context} keeps explicit params`, result.paramsUsed.a === combo.a && result.paramsUsed.b === combo.b && result.paramsUsed.c === combo.c);
  check(`C ${context} records form`, result.paramsUsed.form === 'C');
  check(`C ${context} answer matches independent calculation`, result.correctAnswer === String(expected), result.correctAnswer);
  check(`C ${context} uses fraction structure`, result.questionHTML.includes('\\frac{x '), result.questionHTML);
  check(`C ${context} answer accepted by numericOrFraction`, validators.checkAnswer(assembled(bracketMixed, result), result.correctAnswer));
}

const legacyCases = [
  {
    key:'solve_eq', seed:0x801, params:{},
    expected:{questionHTML:'7. 解方程 \\( 2x = -14 \\)。',correctAnswer:'-7',paramsUsed:{coeff:2,xVal:-7,rVal:-14},solutionHTML:'<div style="font-size:1.05em;margin-top:5px;">\\( \\begin{aligned} 2x &= -14 \\\\ x &= \\frac{-14}{2} \\\\ x &= -7 \\end{aligned} \\)</div>',pdfText:'7. 解方程 \\( 2x = -14 \\)。',answers:['-7'],displayAnswer:'-7',steps:'<div style="font-size:1.05em;margin-top:5px;">\\( \\begin{aligned} 2x &= -14 \\\\ x &= \\frac{-14}{2} \\\\ x &= -7 \\end{aligned} \\)</div>',checkType:'numeric',prefix:'x = '},
  },
  {
    key:'s1t2_solve_eq_negative', seed:0x802, params:{},
    expected:{questionHTML:'7. 解方程 \\( 2x = -6 \\)。',correctAnswer:'-3',paramsUsed:{coeff:2,xVal:-3,rVal:-6},solutionHTML:'<div style="font-size:1.05em;margin-top:5px;">\\( \\begin{aligned} 2x &= -6 \\\\ x &= \\frac{-6}{2} \\\\ x &= -3 \\end{aligned} \\)</div>',pdfText:'7. 解方程 \\( 2x = -6 \\)。',answers:['-3'],displayAnswer:'-3',steps:'<div style="font-size:1.05em;margin-top:5px;">\\( \\begin{aligned} 2x &= -6 \\\\ x &= \\frac{-6}{2} \\\\ x &= -3 \\end{aligned} \\)</div>',checkType:'numeric',prefix:'x = '},
  },
  {
    key:'solve_eq_bracket', seed:0x803, params:{mode:'bracket'},
    expected:{questionHTML:'4. 解方程 \\( 3(-5 - x) = 6 \\)。',correctAnswer:'-7',paramsUsed:{mode:'bracket',k:3,m:-5,xVal:-7,n:6},solutionHTML:'<div style="font-size:1.05em;margin-top:5px;">\\( \\begin{aligned} 3(-5-x) &= 6 \\\\ -15 - 3x &= 6 \\\\ -3x &= 21 \\\\ x &= -7 \\end{aligned} \\)</div>',pdfText:'4. 解方程 \\( 3(-5 - x) = 6 \\)。',answers:['-7'],displayAnswer:'-7',steps:'<div style="font-size:1.05em;margin-top:5px;">\\( \\begin{aligned} 3(-5-x) &= 6 \\\\ -15 - 3x &= 6 \\\\ -3x &= 21 \\\\ x &= -7 \\end{aligned} \\)</div>',checkType:'numeric',prefix:'x = '},
  },
];

for (const item of legacyCases) {
  const actual = withSeed(item.seed, () => generators.generateQuestion(typeDef(item.key), item.params));
  check(`${item.key} legacy branch remains byte-identical`, same(actual, item.expected), JSON.stringify(actual));
}

const legacyFraction = generators.generateQuestion(s1Fraction, { coeff:4, rVal:6 });
check('explicit legacy {coeff:4,rVal:6} remains available',
  legacyFraction.questionHTML === '7. 解方程 \\( 4x = 6 \\)。' && legacyFraction.correctAnswer === '3/2');

function sample(def, seed) {
  return withSeed(seed, () => {
    const outputs = [];
    for (let i = 0; i < 30; i += 1) outputs.push(generators.generateQuestion(def, {}));
    return outputs;
  });
}

const s1Samples = sample(s1Fraction, 0xB801);
const s2Samples = sample(s2Fraction, 0xB801);
const bracketSamples = sample(bracketMixed, 0xB802);
const forms = (items) => new Set(items.map((item) => item.paramsUsed.form || 'bracket'));
const signatures = (items) => new Set(items.map((item) => JSON.stringify(item.paramsUsed)));

check('S1 fraction 30 samples include D and B', forms(s1Samples).has('D') && forms(s1Samples).has('B'));
check('S2 fraction 30 samples include D and B', forms(s2Samples).has('D') && forms(s2Samples).has('B'));
check('bracket mixed 30 samples include bracket and C', forms(bracketSamples).has('bracket') && forms(bracketSamples).has('C'));
check('S1 fraction gets at least 5 distinct params', signatures(s1Samples).size >= 5, String(signatures(s1Samples).size));
check('S2 fraction gets at least 5 distinct params', signatures(s2Samples).size >= 5, String(signatures(s2Samples).size));
check('bracket mixed gets at least 5 distinct params', signatures(bracketSamples).size >= 5, String(signatures(bracketSamples).size));
check('S1 and S2 fraction behavior is identical under the same seed', same(s1Samples, s2Samples));

if (failures.length) {
  console.error(`solve_eq fraction modes: ${failures.length} failure(s)`);
  failures.slice(0, 80).forEach((failure) => console.error(`  - ${failure}`));
  if (failures.length > 80) console.error(`  ... ${failures.length - 80} more`);
  process.exit(1);
}

console.log(`solve_eq fraction modes: ${passed} checks passed`);
console.log(`legal combinations D=${dCombos.length}, B=${bCombos.length}, C=${cCombos.length}`);
console.log(`30-sample distinct params S1=${signatures(s1Samples).size}, S2=${signatures(s2Samples).size}, bracket=${signatures(bracketSamples).size}`);
