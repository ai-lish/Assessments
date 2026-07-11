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

for (let typeIndex = 0; typeIndex < bank.data.length; typeIndex += 1) {
  const typeDef = bank.data[typeIndex];
  for (let sample = 0; sample < SAMPLE_COUNT; sample += 1) {
    const seed = 0x1f0000 + typeIndex * SAMPLE_COUNT + sample;
    const result = withSeed(seed, () => generators.generateQuestion(typeDef, {}));
    generated += 1;

    for (const field of USER_VISIBLE_FIELDS) {
      const text = fieldText(result[field]);
      checkedFields += 1;
      const match = text.match(BAD_UNIT_X);
      if (match) {
        failures.push({
          key: typeDef.key,
          generator: typeDef.generator,
          seed,
          field,
          token: match[2],
          paramsUsed: result.paramsUsed,
          text,
        });
      }
    }
  }
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
  `${generated} generated questions; ${checkedFields} fields checked; no 1x/-1x output`,
);
