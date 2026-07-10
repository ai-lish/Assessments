#!/usr/bin/env node
'use strict';

/*
  Executes only the pure input-preview helper block extracted from the shipped
  template. This keeps the assertions tied to the student implementation while
  avoiding a DOM or MathJax dependency in CI.
*/

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const template = fs.readFileSync(path.join(ROOT, 'templates/student.html'), 'utf8');
const start = template.indexOf('function hasBalancedGroups(');
const end = template.indexOf('function renderInputDisplay()');
if (start < 0 || end < 0 || end <= start) throw new Error('input preview helper block not found');

const sandbox = {};
vm.runInNewContext(template.slice(start, end) + '\nglobalThis.previewInputToLatex = inputToLatex;', sandbox);
const preview = sandbox.previewInputToLatex;

let passed = 0;
const failures = [];
function check(label, actual, expected) {
  if (actual === expected) {
    passed += 1;
    console.log('  ✓ ' + label);
  } else {
    const detail = `${label} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`;
    failures.push(detail);
    console.log('  ✗ ' + detail);
  }
}

console.log('=== Input LaTeX preview contract ===');
check('pi numerator over denominator', preview('128π/3'), '\\frac{128}{3}\\pi');
check('pi trailing fraction', preview('128/3π'), '\\frac{128}{3}\\pi');
check('parenthesized pi fraction', preview('(128/3)π'), '\\frac{128}{3}\\pi');
check('literal LaTeX pi fraction', preview('\\frac{128}{3}π'), '\\frac{128}{3}\\pi');
check('parenthesized numerator fraction', preview('(a+b)/c'), '\\frac{a+b}{c}');
check('parenthesized denominator fraction', preview('a/(b+c)'), '\\frac{a}{b+c}');
check('ratio remains readable math input', preview('7:28:3'), '7:28:3');
check('comma remains readable math input', preview('1,2'), '1,2');
check('radical with group', preview('2√(a+b)'), '2\\sqrt{a+b}');
check('numeric exponent', preview('3.2×10^5'), '3.2×10^{5}');
check('unfinished fraction falls back to raw input', preview('a/'), null);
check('unfinished group falls back to raw input', preview('(a+b'), null);
check('unfinished radical falls back to raw input', preview('√'), null);

console.log(`\n=== Summary: ${passed} passed, ${failures.length} failed ===`);
if (failures.length) {
  failures.forEach((failure) => console.error('  - ' + failure));
  process.exit(1);
}
