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

const colMatch = template.match(/\.key-grid\s*\{[^}]*grid-template-columns:\s*repeat\((\d+),/);
const cols = colMatch ? Number(colMatch[1]) : 0;
const configMatch = template.match(/const INPUT_KEYPAD_CONFIG = (\{[\s\S]*?\n\});/);
const keypadConfig = configMatch ? JSON.parse(configMatch[1]) : null;

check('template keypad uses 9 columns', cols === 9, `got ${cols}`);
check('template has one dynamic keypad grid',
  /id="keypad" aria-label="題型專用按鍵"/.test(template) && !/id="keypad-context"/.test(template));
check('template keypad has exactly three configured rows',
  keypadConfig && keypadConfig.baseRows.length === 3);
check('template numeric keypad items occupy the left four columns',
  keypadConfig && keypadConfig.baseRows.every((row) => row.length === 4) &&
  '0123456789.'.split('').every((label) => keypadConfig.baseRows.flat().includes(label)),
  keypadConfig ? JSON.stringify(keypadConfig.baseRows) : 'missing config');
check('template keeps four operators fixed and delete/clear controls',
  keypadConfig && ['+', '-', '×', '÷'].every((label) => keypadConfig.constantOperators.includes(label)) &&
  ['⌫', 'C'].every((label) => keypadConfig.controlKeys.includes(label)));
check('template has keypad-area id for collapse control', /id="keypad-area"/.test(template));
check('template has independent action-area id', /id="action-area"/.test(template));
check('optional student ID screen stays outside the fixed answer action area',
  /id="student-start-view"[\s\S]*class="top-info"[\s\S]*id="quiz-view"/.test(template) &&
  !/id="action-area"[\s\S]{0,1200}id="student-start-view"/.test(template));
check('student runtime uses sessionStorage and contains no localStorage calls',
  /sessionStorage\.getItem\(storageKey\(\)\)/.test(template) &&
  /sessionStorage\.setItem\(studentIdStorageKey\(\)/.test(template) &&
  !/\blocalStorage\s*\./.test(template));
check('template places both PDF controls between answer actions and keypad',
  /id="action-area"[\s\S]*id="pdf-action-area"[\s\S]*id="btn-similar-pdf"[\s\S]*id="btn-whole-pdf"[\s\S]*id="keypad-area"/.test(template));
check('template places keypad shift with both PDF controls in one row',
  /class="pdf-action-row"[\s\S]{0,1500}id="btn-similar-pdf"[\s\S]{0,800}id="btn-whole-pdf"[\s\S]{0,800}id="btn-shift-keypad"/.test(template) &&
  !/class="keypad-tools"/.test(template));
check('partial submit stays outside action-area and is hidden by default',
  /id="pdf-action-area"[\s\S]{0,1200}id="partial-submit-row"[\s\S]{0,300}id="btn-partial-submit"/.test(template) &&
  !/id="action-area"[\s\S]{0,800}id="btn-partial-submit"/.test(template) &&
  /\.partial-submit-row\s*\{[^}]*display:\s*none/.test(template));
check('template uses short labels and full accessible descriptions',
  />同類 PDF<\/button>/.test(template) && />整卷 PDF<\/button>/.test(template) && />鍵盤 ↑<\/button>/.test(template) &&
  /id="btn-similar-pdf"[^>]+aria-label=/.test(template) && /id="btn-whole-pdf"[^>]+aria-label=/.test(template) &&
  /id="btn-shift-keypad"[^>]+aria-label=/.test(template));
check('template keeps result-page whole PDF control', /id="btn-result-pdf"[^>]+onclick="printPDF\(\)"/.test(template));
check('template applies dynamic viewport and safe-area bottom padding',
  /height:\s*100dvh/.test(template) && /env\(safe-area-inset-bottom\)/.test(template));
check('template has session keypad position toggle',
  /id="btn-shift-keypad"/.test(template) && /let keypadRaised = false/.test(template) &&
  /function toggleKeypadPosition\(\)/.test(template) && /classList\.toggle\("keypad-raised", keypadRaised\)/.test(template));
check('next button lives outside keypad-area',
  /id="action-area"[\s\S]{0,500}id="btn-next"/.test(template) &&
  !/id="keypad-area"[\s\S]{0,500}id="btn-next"/.test(template));
check('check and next share one fixed action slot',
  /class="btn-row answer-action-slot"[\s\S]{0,400}id="btn-check"[\s\S]{0,400}id="btn-next"/.test(template) &&
  /\.answer-action-slot\s*\{[^}]*display:\s*grid/.test(template));
check('template has collapseAnswerControlsAfterCheck()', /function collapseAnswerControlsAfterCheck\(\)/.test(template));
check('checkAns collapses controls after answer', /checkAns\(\)[\s\S]*collapseAnswerControlsAfterCheck\(\)/.test(template));
check('showQ restores keypad for next question', /showQ\(\)[\s\S]*setKeypadVisible\(true\)/.test(template));
check('template renders one per-question keypad when a new question is shown',
  /showQ\(\)[\s\S]*renderQuestionKeypad\(q\)/.test(template));
check('template keypad configuration includes fraction, ratio, root, congruence, and inequality inputs',
  keypadConfig && keypadConfig.validator.numericOrFraction.includes('/') &&
  keypadConfig.typeKey.ratio_three.includes(':') &&
  ['±', '√', ','].every((key) => keypadConfig.typeKey.square_root_pm.includes(key)) &&
  ['S', 'A', 'R', 'H'].every((key) => keypadConfig.validator.congruenceReason.includes(key)) &&
  ['>', '<', '=', '≥', '≤'].every((key) => keypadConfig.validator.inequality.includes(key)));
check('template computes variable keys from the current answer instead of a global variable row',
  /String\(q\.correctAnswer \|\| ""\)\.split\(""\)/.test(template) &&
  !/"alg_simplify_2var": \["a", "b"\]/.test(template));

for (const rel of exercisePaths) {
  const html = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  check(`${rel} includes 9-column keypad CSS`, /grid-template-columns:\s*repeat\(9,/.test(html));
  check(`${rel} includes keypad-area id`, /id="keypad-area"/.test(html));
  check(`${rel} includes one dynamic keypad`, /id="keypad" aria-label="題型專用按鍵"/.test(html) && !/id="keypad-context"/.test(html));
  check(`${rel} includes per-question keypad configuration`, /const INPUT_KEYPAD_CONFIG = \{/.test(html));
  check(`${rel} includes independent action-area id`, /id="action-area"/.test(html));
  check(`${rel} includes optional student ID screen before the quiz`,
    /id="student-start-view"[\s\S]*id="quiz-view"/.test(html));
  check(`${rel} uses sessionStorage with no localStorage calls`,
    /sessionStorage\.getItem\(storageKey\(\)\)/.test(html) && !/\blocalStorage\s*\./.test(html));
  check(`${rel} includes adjacent in-progress PDF controls`,
    /id="pdf-action-area"[\s\S]*id="btn-similar-pdf"[\s\S]*id="btn-whole-pdf"/.test(html));
  check(`${rel} includes hidden partial submit outside action-area`,
    /id="pdf-action-area"[\s\S]{0,1200}id="partial-submit-row"[\s\S]{0,300}id="btn-partial-submit"/.test(html) &&
    !/id="action-area"[\s\S]{0,800}id="btn-partial-submit"/.test(html) &&
    /\.partial-submit-row\s*\{[^}]*display:\s*none/.test(html));
  check(`${rel} includes keypad safe-area and position toggle`,
    /env\(safe-area-inset-bottom\)/.test(html) && /id="btn-shift-keypad"/.test(html));
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
