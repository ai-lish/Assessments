#!/usr/bin/env node
'use strict';

const bank = require('../question-bank.json');
const generators = require('../tool/generators.js');

const SAMPLE_COUNT = 96;
const USER_VISIBLE_FIELDS = [
  'questionHTML',
  'correctAnswer',
  'displayAnswer',
  'solutionHTML',
  'pdfText',
  'steps',
  'answers',
];
const BAD_UNIT_X = /(^|[^0-9A-Za-z])(-?1x)(?![0-9A-Za-z])/;
const EXPLICIT_CASES = [
  { key: 'poly_constant', params: { a: 1, b: 1, c: -2 } },
  { key: 'expand_bracket', params: { k: 2, a: 1, b: -4 } },
  { key: 'poly_add_sub', params: { a: 1, b: 1, c: 2, d: 2, e: 0, f: 1, op: '-' } },
  { key: 'binomial_expand', params: { a: 1, b: 2, c: 1, d: -3 } },
  { key: 's3t3_square_expand', params: { a: 1, b: -3, square: true } },
  { key: 'alg_simplify', params: { a: -2, b: -4, c: 3, d: -2 } },
  { key: 'alg_simplify_2var', params: { a1: 3, b1: 4, a2: 2, b2: 3, op: '-' } },
  { key: 's2t3_square_expand_2var', params: { b: 2, twoVar: true } },
  { key: 'coef_exp_div', params: { expD: 2, expN: 3, rNum: 1, rDen: 2, scale: 2 } },
];

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
  try {
    return fn();
  } finally {
    Math.random = original;
  }
}

function fieldText(value) {
  if (Array.isArray(value)) return value.map(fieldText).join('\n');
  if (value === undefined || value === null) return '';
  return String(value);
}

const failures = [];
let generated = 0;
let checkedFields = 0;

function scanResult(typeDef, result, context) {
  for (const field of USER_VISIBLE_FIELDS) {
    const text = fieldText(result[field]);
    checkedFields += 1;
    const match = text.match(BAD_UNIT_X);
    if (match) {
      failures.push({
        key: typeDef.key,
        generator: typeDef.generator,
        context,
        field,
        token: match[2],
        paramsUsed: result.paramsUsed,
        text,
      });
    }
  }
}

for (let typeIndex = 0; typeIndex < bank.data.length; typeIndex += 1) {
  const typeDef = bank.data[typeIndex];
  for (let sample = 0; sample < SAMPLE_COUNT; sample += 1) {
    const seed = 0x1f0000 + typeIndex * SAMPLE_COUNT + sample;
    const result = withSeed(seed, () => generators.generateQuestion(typeDef, {}));
    generated += 1;
    scanResult(typeDef, result, { seed });
  }
}

for (const item of EXPLICIT_CASES) {
  const typeDef = bank.data.find((candidate) => candidate.key === item.key);
  if (!typeDef) {
    failures.push({ key: item.key, context: { explicitParams: item.params }, error: 'missing typeDef' });
    continue;
  }
  const result = generators.generateQuestion(typeDef, item.params);
  generated += 1;
  scanResult(typeDef, result, { explicitParams: item.params });
}

if (failures.length > 0) {
  console.error(`unit coefficient scan: ${failures.length} failure(s)`);
  for (const failure of failures.slice(0, 30)) {
    console.error(JSON.stringify(failure, null, 2));
  }
  if (failures.length > 30) console.error(`... ${failures.length - 30} more failure(s)`);
  process.exit(1);
}

console.log(
  `unit coefficient scan: ${bank.data.length} type definitions x ${SAMPLE_COUNT} seeds = ` +
  `${bank.data.length * SAMPLE_COUNT} random questions + ${EXPLICIT_CASES.length} explicit edge cases; ` +
  `${checkedFields} fields checked; no 1x/-1x output`,
);
