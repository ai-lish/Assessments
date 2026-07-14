#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'docs/gas/submit-endpoint.gs'), 'utf8');
const template = fs.readFileSync(path.join(root, 'templates/student.html'), 'utf8');
const exerciseFiles = [
  'exercises/2526/s1/t2/part-a-01.html',
  'exercises/2526/s1/t3/part-a-01.html',
  'exercises/2526/s2/t3/part-a-01.html',
  'exercises/2526/s3/t3/part-a-01.html',
];
let passed = 0;
const failures = [];

function check(label, condition) {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failures.push(label);
    console.log(`  ✗ ${label}`);
  }
}

console.log('=== GAS dual-contract documentation check ===');
check('keeps legacy active-sheet route', /appendLegacyRows_\(ss\.getActiveSheet\(\), payload\.rows\)/.test(source));
check('keeps legacy nine-column header', /'總分'[\s\S]*'題目摘要'[\s\S]*'正確答案'/.test(source));
check('recognizes grade + attemptType contract', /row\.grade && row\.attemptType/.test(source));
check('routes s1 to 中一', /s1:\s*'中一'/.test(source));
check('routes s2 to 中二', /s2:\s*'中二'/.test(source));
check('routes s3 to 中三', /s3:\s*'中三'/.test(source));
check('uses 未分類 fallback', /FALLBACK_SHEET\s*=\s*'未分類'/.test(source));
check('creates attempt-sheet header only when empty', /sheet\.getLastRow\(\) === 0/.test(source));
check('student template keeps GAS_URL as a generation placeholder', template.includes('const GAS_URL = {{GAS_URL}};'));
check('student template keeps TEACHER_PIN_HASH as a generation placeholder', template.includes('const TEACHER_PIN_HASH = {{TEACHER_PIN_HASH}};'));

const gasUrls = exerciseFiles.map(file => {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const match = html.match(/const GAS_URL = "([^"]+)";/);
  return match ? match[1] : '';
});
check('all published exercises embed a GAS URL', gasUrls.every(url => /^https:\/\/script\.google(?:usercontent)?\.com\//.test(url)));
check('all published exercises use the same GAS URL', new Set(gasUrls).size === 1);

console.log(`\n=== Summary: ${passed} passed, ${failures.length} failed ===`);
if (failures.length) process.exit(1);
