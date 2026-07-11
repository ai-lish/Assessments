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
vm.runInNewContext(template.slice(start, end) + '\nglobalThis.previewInputToLatex = inputToLatex; globalThis.previewInputParts = inputToPreviewParts;', sandbox);
const preview = sandbox.previewInputToLatex;
const previewParts = sandbox.previewInputParts;

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

function checkParts(label, input, latex, rawTail) {
  const actual = previewParts(input);
  check(label, JSON.stringify(actual), JSON.stringify({ latex, rawTail }));
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
check('completed exponent remains rendered before addition', preview('x^2+3x'), 'x^{2}+3x');
check('fraction followed by addition keeps denominator scoped', preview('a/b+c'), '\\frac{a}{b}+c');
check('pi fraction followed by addition keeps pi term scoped', preview('128π/3+1'), '\\frac{128}{3}\\pi+1');
check('compound numerator fraction', preview('(x^2+2x)/3'), '\\frac{x^{2}+2x}{3}');
check('unfinished fraction falls back to raw input', preview('a/'), null);
check('unfinished group falls back to raw input', preview('(a+b'), null);
check('unfinished radical falls back to raw input', preview('√'), null);
checkParts('sequence x renders fully', 'x', 'x', '');
checkParts('sequence x^ keeps completed x rendered', 'x^', 'x', '^');
checkParts('sequence x^2 renders exponent', 'x^2', 'x^{2}', '');
checkParts('sequence x^2+ keeps exponent rendered', 'x^2+', 'x^{2}', '+');
checkParts('sequence x^2+3 renders complete expression', 'x^2+3', 'x^{2}+3', '');
checkParts('unfinished fraction keeps numerator rendered', 'a/', 'a', '/');

console.log(`\n=== Summary: ${passed} passed, ${failures.length} failed ===`);
if (failures.length) {
  failures.forEach((failure) => console.error('  - ' + failure));
  process.exit(1);
}
