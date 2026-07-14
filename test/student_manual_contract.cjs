#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MANUAL = path.join(ROOT, 'docs', 'manual', 'student', 'student-manual.md');
const IMAGE_ROOT = path.join(ROOT, 'docs', 'manual', 'student');
const text = fs.readFileSync(MANUAL, 'utf8');
let checks = 0;

function check(label, condition, detail = '') {
  checks += 1;
  if (!condition) throw new Error(`FAIL ${label}${detail ? `: ${detail}` : ''}`);
  console.log(`PASS ${label}`);
}

const chapters = text.match(/^## \d+ .+$/gm) || [];
const sections = text.match(/^### \d+\.\d+ .+$/gm) || [];
const images = Array.from(text.matchAll(/!\[[^\]]+\]\((images\/[^)]+\.png)\)/g), (match) => match[1]);
const includes = Array.from(text.matchAll(/\{\{\s*include:\s*([A-Z0-9_]+)\s*\}\}/g), (match) => match[1]);

check('manual has 9 chapters', chapters.length === 9, String(chapters.length));
check('manual has 28 numbered sections', sections.length === 28, String(sections.length));
check('manual references exactly 20 screenshots', images.length === 20, String(images.length));
check('all screenshot references are unique', new Set(images).size === 20);
images.forEach((image) => check(`screenshot exists: ${image}`, fs.existsSync(path.join(IMAGE_ROOT, image))));

const expectedIncludes = [
  'INC_BASIC_REQUIREMENTS',
  'INC_BROWSER_PRINT',
  'INC_STUDENT_ID_PRIVACY',
  'INC_SUBMISSION_STATUS',
  'INC_COMMON_TROUBLESHOOTING',
];
expectedIncludes.forEach((name) => {
  check(`manual references ${name}`, includes.includes(name));
  check(`include file exists: ${name}`, fs.existsSync(path.join(ROOT, 'docs', 'manual', 'includes', `${name}.md`)));
});

check('reroll wording follows supervisor decision', text.includes('每次載入練習，題目數字會不同（重新抽題）'));
check('manual avoids misleading generation term', !text.includes('無限生成'));
check('partial-submit caveat is exact', text.includes('若你手上的練習沒有「提前遞交」按鈕，即表示不支援提前遞交，做完全部題目再提交即可'));
check('teacher enters the PIN', text.includes('請舉手請老師來輸入密碼'));
check('student manual does not disclose test PIN', !text.includes('1234'));
check('submission status is qualified', fs.readFileSync(path.join(ROOT, 'docs', 'manual', 'includes', 'INC_SUBMISSION_STATUS.md'), 'utf8').includes('不代表老師一定收到'));
check('removed answer-export feature is absent', !text.includes('匯出學生答案') && !text.includes('exportStudentAnswers'));

console.log(`Student manual contract: ${checks} checks passed`);
