#!/usr/bin/env node
'use strict';

const bank = require('../question-bank.json');
const generators = require('../tool/generators.js');
const validators = require('../tool/validators.js');

const R_VALUES = [2, 3, 4, 5, 6];
const H_VALUES = [4, 5, 6, 7, 8, 9, 10, 12];
const TYPES = [
  { key: 'solid_sphere', solidType: 'sphere', expectedCombos: 5 },
  { key: 'solid_cylinder', solidType: 'cylinder', expectedCombos: 40 },
  { key: 'solid_cone', solidType: 'cone', expectedCombos: 40 },
];

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

function explicitSnapshot(solidType) {
  const def = typeDef(`solid_${solidType === 'sphere' ? 'sphere' : solidType}`);
  const result = generators.generateQuestion(def, { solidType, r: 3, h: 8 });
  return {
    correctAnswer: result.correctAnswer,
    paramsUsed: result.paramsUsed,
    answers: result.answers,
    displayAnswer: result.displayAnswer,
  };
}

console.log('=== solid_mensuration random parameter contract ===');

const expectedExplicit = {
  sphere: {
    correctAnswer: '113.097',
    paramsUsed: { solidType: 'sphere', r: 3, h: 8, piCoeff: 36, decimal: '113.097' },
    answers: ['113.097', '36π'],
    displayAnswer: '36π cm³ ≈ 113.097 cm³',
  },
  cylinder: {
    correctAnswer: '226.195',
    paramsUsed: { solidType: 'cylinder', r: 3, h: 8, piCoeff: 72, decimal: '226.195' },
    answers: ['226.195', '72π'],
    displayAnswer: '72π cm³ ≈ 226.195 cm³',
  },
  cone: {
    correctAnswer: '75.398',
    paramsUsed: { solidType: 'cone', r: 3, h: 8, piCoeff: 24, decimal: '75.398' },
    answers: ['75.398', '24π'],
    displayAnswer: '24π cm³ ≈ 75.398 cm³',
  },
};

for (const [solidType, expected] of Object.entries(expectedExplicit)) {
  const actual = explicitSnapshot(solidType);
  check(`${solidType} explicit {r:3,h:8} matches pre-fix output`,
    JSON.stringify(actual) === JSON.stringify(expected),
    JSON.stringify(actual));
}

let totalEnumerated = 0;
let totalAccepted = 0;
for (const item of TYPES) {
  const def = typeDef(item.key);
  const combos = [];
  const rPool = item.solidType === 'sphere' ? R_VALUES : R_VALUES;
  const hPool = item.solidType === 'sphere' ? [8] : H_VALUES;
  for (const r of rPool) {
    for (const h of hPool) {
      const result = generators.generateQuestion(def, { solidType: item.solidType, r, h });
      const q = assemble(def, result);
      const decimalOk = validators.checkAnswer(q, result.correctAnswer);
      const piOk = validators.checkAnswer(q, result.answers[1]);
      combos.push({ r, h, decimalOk, piOk, paramsUsed: result.paramsUsed });
      totalEnumerated += 1;
      if (decimalOk && piOk) totalAccepted += 1;
    }
  }
  const accepted = combos.filter((combo) => combo.decimalOk && combo.piOk);
  check(`${item.solidType} enumerates ${item.expectedCombos} requested combos`,
    combos.length === item.expectedCombos,
    `got ${combos.length}`);
  check(`${item.solidType} all enumerated combos pass unitNumeric as decimal and pi`,
    accepted.length === combos.length,
    JSON.stringify(combos.filter((combo) => !combo.decimalOk || !combo.piOk)));
}
check('solid_mensuration requested enumeration total = 85', totalEnumerated === 85, String(totalEnumerated));
check('solid_mensuration unitNumeric accepted enumeration total = 85', totalAccepted === 85, String(totalAccepted));

for (const item of TYPES) {
  const def = typeDef(item.key);
  const seen = withSeed(0x515000 + item.expectedCombos, () => {
    const signatures = new Set();
    for (let i = 0; i < 30; i += 1) {
      const result = generators.generateQuestion(def, {});
      signatures.add(JSON.stringify({
        solidType: result.paramsUsed.solidType,
        r: result.paramsUsed.r,
        h: result.paramsUsed.h,
      }));
    }
    return signatures;
  });
  check(`${item.solidType} gets at least 5 distinct params in 30 generated samples`,
    seen.size >= 5,
    `got ${seen.size}: ${Array.from(seen).join(' | ')}`);
}

if (failures.length) {
  console.error(`\n${failures.length} solid_mensuration failure(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`\n${passed} solid_mensuration checks passed.`);
