#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const validators = require('../tool/validators.js');
const generators = require('../tool/generators.js');
const bank = require('../question-bank.json');
const pdf = require('../tool/pdf.js');
const generatorFixtures = require('./fixtures/generator_equivalence.json');

const ROOT = path.resolve(__dirname, '..');
const template = fs.readFileSync(path.join(ROOT, 'templates/student.html'), 'utf8');
let passed = 0;
const failures = [];

function check(label, condition, detail = '') {
  if (condition) { passed += 1; console.log('  ✓ ' + label); }
  else { failures.push(label + (detail ? ' — ' + detail : '')); console.log('  ✗ ' + label + (detail ? ' — ' + detail : '')); }
}

function extractFunction(source, name) {
  const start = source.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('missing function ' + name);
  const brace = source.indexOf('{', start);
  let depth = 0;
  for (let i = brace; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') depth -= 1;
    if (depth === 0) return source.slice(start, i + 1);
  }
  throw new Error('unterminated function ' + name);
}

console.log('=== Student UI/UX six-item contract ===');

check('three utility controls share one non-wrapping grid row',
  /\.pdf-action-row\s*\{[^}]*grid-template-columns:\s*repeat\(3,[^}]*\}/.test(template) &&
  /\.pdf-secondary-btn\s*\{[^}]*white-space:\s*nowrap/.test(template) &&
  /class="pdf-action-row"[\s\S]{0,1500}id="btn-similar-pdf"[\s\S]{0,800}id="btn-whole-pdf"[\s\S]{0,800}id="btn-shift-keypad"/.test(template));
check('utility controls use short labels and accessible full names',
  />同類 PDF<\/button>/.test(template) && />整卷 PDF<\/button>/.test(template) && />鍵盤 ↑<\/button>/.test(template) &&
  (template.match(/aria-label="[^"]+"/g) || []).length >= 3);

const configMatch = template.match(/const INPUT_KEYPAD_CONFIG = (\{[\s\S]*?\n\});/);
const config = configMatch && JSON.parse(configMatch[1]);
check('keypad keeps exactly three nine-slot rows', config && config.baseRows.length === 3 &&
  config.fixedRows.length === 3 && config.baseRows.every((row) => row.length === 4) &&
  config.fixedRows.every((row) => row.length === 2) && /repeat\(9,/.test(template));
check('four operators occupy fixed rows for every keyboard question', config &&
  JSON.stringify(config.fixedRows.slice(0, 2)) === JSON.stringify([['+', '-'], ['×', '÷']]) &&
  JSON.stringify(config.constantOperators) === JSON.stringify(['+', '-', '×', '÷']));
check('choice questions hide keys while preserving the fixed keypad slot',
  /if \(!q \|\| q\.type === "choice"\)[\s\S]{0,180}setKeypadVisible\(false\)/.test(template) &&
  /\.keypad-area\.keypad-unavailable \.key-grid/.test(template));
check('context symbols have nine reserved slots and are balanced across rows',
  /extras\.forEach\(\(key, index\) => extraSlots\[index % extraSlots\.length\]\.push\(key\)\)/.test(template) &&
  /extraSlots\[rowIndex\]\.length; i < 3/.test(template));

check('check and next occupy one fixed-size grid slot',
  /class="btn-row answer-action-slot"[\s\S]{0,400}id="btn-check"[\s\S]{0,400}id="btn-next"/.test(template) &&
  /\.answer-action-slot \.main-btn\s*\{[^}]*grid-area:\s*1 \/ 1[^}]*min-height:\s*45px/.test(template));
check('answer controls stay visible but locked after checking',
  /setKeypadInputVisible\(false\)/.test(template) &&
  /classList\.add\("answer-control-locked"\)/.test(template) &&
  /setAttribute\("aria-disabled", "true"\)/.test(template) &&
  !/function collapseAnswerControlsAfterCheck\(\)[\s\S]{0,500}style\.visibility = "hidden"/.test(template) &&
  !/function collapseAnswerControlsAfterCheck\(\)[\s\S]{0,500}style\.display = "none"/.test(template));
check('portrait review releases the fixed solution and keypad slots',
  /\.answer-detail-slot\s*\{[^}]*height:\s*148px[^}]*display:\s*grid[^}]*grid-template-rows:[^}]*40px/.test(template) &&
  /#quiz-view\.reviewed \.answer-detail-slot\s*\{[^}]*height:\s*auto[^}]*overflow:\s*visible/.test(template) &&
  /#quiz-view\.reviewed \.solution-box\s*\{[^}]*max-height:\s*none[^}]*overflow:\s*visible/.test(template) &&
  /#quiz-view\.reviewed \.keypad-area\s*\{[^}]*display:\s*none !important/.test(template));
check('work scroll keeps answer content above the fixed control dock',
  /id="work-scroll"[\s\S]*id="question-scroll"[\s\S]*id="answer-dock"[\s\S]*id="bottom-dock"[\s\S]*id="control-dock"/.test(template) &&
  /\.keypad-area\s*\{[^}]*height:\s*122px[^}]*flex:\s*0 0 122px/.test(template) &&
  /\.action-area\s*\{[^}]*min-height:\s*63px/.test(template));
check('keypad raise uses the action visibility boundary rather than question height',
  /getElementById\("bottom-dock"\)[\s\S]{0,400}classList\.toggle\("keypad-raised", keypadRaised\)/.test(template) &&
  /getElementById\("action-area"\)/.test(template) &&
  /visualViewport\.offsetTop/.test(template) &&
  /baseActionBottom[\s\S]*viewportBottom/.test(template) &&
  !/minimumQuestionHeight|questionHeight - 72/.test(template));
check('landscape compact mode is selected by orientation only',
  /@media \(orientation: landscape\)\s*\{/.test(template) &&
  !/@media \(orientation: landscape\)[^{]*(?:min-width|max-width|hover|pointer)/.test(template));
check('landscape compact mode top-aligns content-driven left rows',
  /#quiz-view\s*\{[^}]*grid-template-rows:\s*auto auto minmax\(0, 1fr\)[^}]*align-content:\s*start/.test(template) &&
  /\.control-dock\s*\{[^}]*justify-content:\s*flex-start/.test(template));
check('landscape fixed keypad slot sits above adjacent PDF and action controls',
  /\.keypad-area\s*\{[^}]*order:\s*1/.test(template) &&
  /\.pdf-action-area\s*\{[^}]*order:\s*2/.test(template) &&
  /\.action-area\s*\{[^}]*order:\s*3/.test(template));

const sample = pdf.generateSnapshotFromSpecs([], 'ux-six-empty', { title: 'test' });
const preview = pdf.renderPrintDocument(sample, {});
check('PDF remains a standalone student/teacher preview',
  /<!DOCTYPE html>/.test(preview) && /data-mode="student"/.test(preview) && /data-mode="teacher"/.test(preview));
check('PDF waits for MathJax/assets/frames but never auto-prints',
  /waitForMathJax/.test(preview) && /waitForAssets/.test(preview) &&
  (preview.match(/await nextFrame\(\)/g) || []).length >= 2 && !/window\.print\s*\(/.test(preview));

const answerSandbox = {};
vm.runInNewContext(extractFunction(template, 'answerNeedsMathJax') + '\nthis.answerNeedsMathJax=answerNeedsMathJax;', answerSandbox);
check('pure integers and words bypass MathJax',
  !answerSandbox.answerNeedsMathJax('42') && !answerSandbox.answerNeedsMathJax('形心'));
check('fractions/pi/powers/radicals/algebra use MathJax',
  ['3/2', '128π/3', 'x^2+3x', '±5√3', '\\frac{x-1}{2}'].every(answerSandbox.answerNeedsMathJax));
for (const def of bank.data) {
  const fixture = generatorFixtures[def.generator] && generatorFixtures[def.generator][0];
  const generated = generators.generateQuestion(def, fixture ? fixture.params : (def.defaultParams || {}));
  check(`${def.key} provides a usable feedback display answer`,
    generated.displayAnswer !== undefined && generated.displayAnswer !== null &&
    String(generated.displayAnswer) !== '' && !String(generated.displayAnswer).includes('NaN'));
}
check('showQ targets only the changed question node',
  /typesetElementOnce\(questionText\)/.test(template) &&
  !/MathJax\.typesetPromise\(\[document\.getElementById\("quiz-view"\)\]\)/.test(template));
const checkSection = template.slice(template.indexOf('function checkAns()'), template.indexOf('function toggleTeach()'));
const teachSection = template.slice(template.indexOf('function toggleTeach()'), template.indexOf('function nextQ()'));
check('hidden solution is not typeset during answer checking', !/typesetElementOnce\(solBox\)/.test(checkSection));
check('solution is typeset once only when opened', /if \(opening\)[\s\S]*typesetElementOnce\(solBox\)/.test(teachSection));
check('wrong-answer display targets only the answer span',
  /renderFeedbackAnswer\(fb, ans\)/.test(template) && /typesetElementOnce\(answerSpan\)/.test(template));
check('pure numeric keypad input bypasses incremental MathJax',
  /if \(\/\^-\?\(\?:\\d\+/.test(template) && /el\.textContent = raw;[\s\S]{0,80}return;/.test(template));

function generatedQuestion(typeKey, params) {
  const def = bank.data.find((item) => item.key === typeKey);
  return Object.assign({}, generators.generateQuestion(def, params || def.defaultParams || {}), {
    validator: def.validator,
    checkType: def.checkType,
  });
}
const hcfQuestion = generatedQuestion('s1t2_hcf', { mode: 'hcf', a: 24, b: 36 });
const factorQuestion = generatedQuestion('factor_diff_sq', { a: 2, b: 5 });
const inequalityQuestion = generatedQuestion('solve_ineq', { a: -2, b: 5, boundary: -3, op: '<' });
check('fixed operators do not expand strict validator acceptance',
  validators.checkAnswer(hcfQuestion, hcfQuestion.correctAnswer) &&
  !validators.checkAnswer(hcfQuestion, String(hcfQuestion.correctAnswer) + '+') &&
  validators.checkAnswer(factorQuestion, factorQuestion.correctAnswer) &&
  !validators.checkAnswer(factorQuestion, factorQuestion.correctAnswer + '+') &&
  validators.checkAnswer(inequalityQuestion, inequalityQuestion.correctAnswer) &&
  !validators.checkAnswer(inequalityQuestion, 'x<-3') &&
  !validators.checkAnswer(inequalityQuestion, 'x>-4'));

check('MathJax CDN receives early connection hints without self-host build dependencies',
  /rel="preconnect" href="https:\/\/cdn\.jsdelivr\.net"/.test(template) &&
  /rel="dns-prefetch" href="https:\/\/cdn\.jsdelivr\.net"/.test(template));

console.log(`\n=== Summary: ${passed} passed, ${failures.length} failed ===`);
if (failures.length) {
  failures.forEach((failure) => console.error('  - ' + failure));
  process.exit(1);
}
