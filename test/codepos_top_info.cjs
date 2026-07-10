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
    console.log(`  ✓ ${label}`);
  } else {
    failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

function topInfoBlock(html) {
  const start = html.indexOf('<div class="top-info">');
  const end = html.indexOf('<div class="toolbar"', start);
  return start >= 0 && end > start ? html.slice(start, end) : '';
}

function questionCardBlock(html) {
  const start = html.indexOf('<div class="question-card">');
  const end = html.indexOf('<div id="q-image"', start);
  return start >= 0 && end > start ? html.slice(start, end) : '';
}

function hasTopCodeLayout(html) {
  const top = topInfoBlock(html);
  return top.includes('id="p-text"') &&
    top.includes('id="top-code-wrap"') &&
    top.includes('id="q-code"') &&
    top.includes('id="btn-copy-code"') &&
    top.indexOf('id="p-text"') < top.indexOf('id="top-code-wrap"') &&
    top.indexOf('id="top-code-wrap"') < top.indexOf('id="score-mini"');
}

function hasNoCardCode(html) {
  return !questionCardBlock(html).includes('id="q-code"');
}

console.log('=== PR-CODEPOS top-info question code regression ===');

check('template top-info order is progress → code/copy → score', hasTopCodeLayout(template));
check('template removes q-code from question card', hasNoCardCode(template));
check('template keeps SHOW_QUESTION_CODE switch', template.includes('const SHOW_QUESTION_CODE = true;'));
check('template has compact code function for narrow viewport', template.includes('function compactQuestionCode'));
check('template has clipboard API copy path', template.includes('navigator.clipboard') && template.includes('writeText(code)'));
check('template has fallback copy path', template.includes('function fallbackCopyText') && template.includes('execCommand("copy")'));
check('showQ uses compact top code update', template.includes('updateQuestionCodeDisplay(q);'));
check('showQ uses compact Qn/total progress format', template.includes('"Q" + (currIdx + 1) + "/" + qList.length'));

for (const rel of exercisePaths) {
  const html = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  check(`${rel} has top-info code/copy layout`, hasTopCodeLayout(html));
  check(`${rel} removes q-code from question card`, hasNoCardCode(html));
  check(`${rel} has copyCurrentQuestionCode`, html.includes('function copyCurrentQuestionCode'));
}

if (failures.length) {
  console.error(`\n${failures.length} failure(s):`);
  failures.forEach((f) => console.error(`  - ${f}`));
  process.exit(1);
}

console.log(`\n✅ code position checks passed (${passed} checks)`);
