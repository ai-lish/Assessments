#!/usr/bin/env node
'use strict';

const { formatExactPiAnswer } = require('./smoke/pi-answer.cjs');

const cases = [
  ['integer coefficient', 36, '', '36π'],
  ['rational coefficient', { numerator: 128, denominator: 3 }, '', '128π/3'],
  ['rational denominator one', { numerator: 6, denominator: 1 }, '', '6π'],
  ['display fallback', undefined, '\\frac{5}{3}\\pi cm³ ≈ 5.236 cm³', '\\frac{5}{3}\\pi'],
];

let passed = 0;
for (const [label, coefficient, displayAnswer, expected] of cases) {
  const actual = formatExactPiAnswer(coefficient, displayAnswer);
  if (actual !== expected) {
    console.error(`✗ ${label}: expected ${expected}, got ${actual}`);
    process.exitCode = 1;
  } else {
    passed += 1;
    console.log(`✓ ${label}`);
  }
}

let rejectedInvalid = false;
try {
  formatExactPiAnswer({ numerator: 1, denominator: 0 });
} catch (_error) {
  rejectedInvalid = true;
}
if (!rejectedInvalid) {
  console.error('✗ invalid rational coefficient is rejected');
  process.exitCode = 1;
} else {
  passed += 1;
  console.log('✓ invalid rational coefficient is rejected');
}

if (!process.exitCode) console.log(`smoke pi assembly: ${passed} checks passed`);
