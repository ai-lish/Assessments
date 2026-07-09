#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const template = fs.readFileSync(path.join(ROOT, 'templates/student.html'), 'utf8');
const exercisePaths = [
  'exercises/2526/s1/t2/part-a-01.html',
  'exercises/2526/s1/t3/part-a-01.html',
  'exercises/2526/s2/t3/part-a-01.html',
  'exercises/2526/s3/t3/part-a-01.html',
];

let passed = 0;
const failures = [];

function check(label, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log('  ✓ ' + label);
  } else {
    failures.push(label + (detail ? ' — ' + detail : ''));
    console.log('  ✗ ' + label + (detail ? ' — ' + detail : ''));
  }
}

console.log('=== PR-UX1 Layout / Keyboard Regression ===');

const keyCount = (template.match(/class="key"/g) || []).length;
const colMatch = template.match(/\.key-grid\s*\{[^}]*grid-template-columns:\s*repeat\((\d+),/);
const cols = colMatch ? Number(colMatch[1]) : 0;
const rows = cols ? Math.ceil(keyCount / cols) : Infinity;

check('template has 26 virtual keys', keyCount === 26, `got ${keyCount}`);
check('template keypad uses 9 columns', cols === 9, `got ${cols}`);
check('template keypad fits within three rows', rows <= 3, `rows=${rows}`);
check('template has keypad-area id for collapse control', /id="keypad-area"/.test(template));
check('template has independent action-area id', /id="action-area"/.test(template));
check('next button lives outside keypad-area',
  /id="action-area"[\s\S]{0,500}id="btn-next"/.test(template) &&
  !/id="keypad-area"[\s\S]{0,500}id="btn-next"/.test(template));
check('template has collapseAnswerControlsAfterCheck()', /function collapseAnswerControlsAfterCheck\(\)/.test(template));
check('checkAns collapses controls after answer', /checkAns\(\)[\s\S]*collapseAnswerControlsAfterCheck\(\)/.test(template));
check('showQ restores keypad for next question', /showQ\(\)[\s\S]*setKeypadVisible\(true\)/.test(template));

for (const rel of exercisePaths) {
  const html = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  check(`${rel} includes 9-column keypad CSS`, /grid-template-columns:\s*repeat\(9,/.test(html));
  check(`${rel} includes keypad-area id`, /id="keypad-area"/.test(html));
  check(`${rel} includes independent action-area id`, /id="action-area"/.test(html));
  check(`${rel} keeps next button outside keypad-area`,
    /id="action-area"[\s\S]{0,500}id="btn-next"/.test(html) &&
    !/id="keypad-area"[\s\S]{0,500}id="btn-next"/.test(html));
  check(`${rel} includes fresh PDF seed path`, /const seed = AssessPDF\.createSnapshotSeed\(\)/.test(html));
  check(`${rel} includes collapse controls helper`, /function collapseAnswerControlsAfterCheck\(\)/.test(html));
}

console.log(`\n=== Summary: ${passed} passed, ${failures.length} failed ===`);
if (failures.length) {
  failures.forEach(f => console.error('  - ' + f));
  process.exit(1);
}
