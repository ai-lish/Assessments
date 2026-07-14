#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const bank = JSON.parse(fs.readFileSync(path.join(ROOT, 'question-bank.json'), 'utf8'));
const pdf = require(path.join(ROOT, 'tool/pdf.js'));
const generators = require(path.join(ROOT, 'tool/generators.js'));

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

function typeDef(key) {
  const found = bank.data.find((item) => item.key === key);
  if (!found) throw new Error('Missing typeDef: ' + key);
  return JSON.parse(JSON.stringify(found));
}

function spec(key, params) {
  return { qid: key, typeKey: key, typeDef: typeDef(key), params: params || {} };
}

function teacherAnswer(html, typeKey) {
  const row = html.match(new RegExp('<article class="pdf-question-row"[^>]*data-type-key="' + typeKey + '"[\\s\\S]*?<\\/article>'));
  if (!row) return '';
  const answer = row[0].match(/<div class="pdf-answer pdf-teacher-answer">([\s\S]*?)<\/div>/);
  return answer ? answer[1] : '';
}

console.log('=== PDF Teacher Answer Display Contract ===');

const solveSpecs = [
  spec('solve_eq', { coeff: 4, xVal: -8 }),
  spec('s1t2_solve_eq_fraction', { form: 'D', a: 4, b: 6 }),
  spec('s1t2_solve_eq_negative', { coeff: 5, xVal: -3 }),
  spec('solve_eq_fraction', { form: 'B', a: 4, b: 3, c: 2 }),
  spec('solve_eq_bracket', { form: 'bracket', k: 3, m: 2, xVal: -2 }),
];
const solveSnapshot = pdf.generateSnapshotFromSpecs(solveSpecs, 'pdf-answer-solve-eq', {
  title: 'PDF answer test', presetKey: 'test', generatedAt: '2026-07-14T00:00:00.000Z', generatorApi: generators,
});
const solveTeacher = pdf.renderPDF(solveSnapshot, 'teacher', { showCode: true });
for (const item of solveSnapshot.questions) {
  const answer = teacherAnswer(solveTeacher, item.typeKey);
  check(item.typeKey + ' PDF answer has x prefix', /x\s*=/.test(answer), answer);
  check(item.typeKey + ' PDF answer has one x prefix', (answer.match(/x\s*=/g) || []).length === 1, answer);
}
check('fraction solve_eq keeps fractional value after prefix', /x\s*=\s*3\/2/.test(teacherAnswer(solveTeacher, 's1t2_solve_eq_fraction')));

const alreadyPrefixed = pdf._private.teacherAnswerText({ typeKey: 'solve_eq', displayAnswer: 'x = -8' });
check('existing solve_eq x prefix is not duplicated', alreadyPrefixed === 'x = -8', alreadyPrefixed);

const nonSolveSnapshot = {
  snapshotId: 'non-solve', title: 'Non solve', presetKey: 'test', questions: [
    { qid: 'n1', typeKey: 'formula_sub', displayAnswer: '-4', correctAnswer: '-4' },
    { qid: 'n2', typeKey: 'seq_nth', displayAnswer: '15', correctAnswer: '15' },
    { qid: 'n3', typeKey: 'round_decimal', displayAnswer: '3.14', correctAnswer: '3.14' },
  ],
};
const nonSolveTeacher = pdf.renderPDF(nonSolveSnapshot, 'teacher', { showCode: false });
for (const item of nonSolveSnapshot.questions) {
  const answer = teacherAnswer(nonSolveTeacher, item.typeKey);
  check(item.typeKey + ' does not receive x prefix', !/x\s*=/.test(answer), answer);
}

const q10 = pdf._private.answerHtml('20\\%');
check('pre-escaped percent remains escaped exactly once', q10 === '\\(20\\%\\)', q10);
check('plain percent is escaped exactly once', pdf._private.answerHtml('20%') === '\\(20\\%\\)');

const coordinateDisplay = '\\( y \\) 坐標為 2，A 點位置 (-2, 2)';
const q14 = pdf._private.answerHtml(coordinateDisplay);
check('coordinate keeps existing inline MathJax segment', q14.startsWith('\\( y \\) 坐標為 2'));
check('coordinate answer is not wrapped twice', !q14.includes('\\(\\(') && !q14.endsWith('\\)\\)'), q14);
check('coordinate answer keeps complete point text', q14.includes('A 點位置 (-2, 2)'), q14);

check('plain answer remains plain escaped HTML', pdf._private.answerHtml('S.A.S.') === 'S.A.S.');
check('inequality remains a single MathJax expression', pdf._private.answerHtml('x < 2') === '\\(x &lt; 2\\)' || pdf._private.answerHtml('x < 2') === '\\(x < 2\\)');
check('rational pi answer keeps TeX commands', pdf._private.answerHtml('\\frac{128}{3}\\pi cm^3 ≈ 134.041 cm^3').includes('\\frac{128}{3}\\pi'));
check('radical and plus-minus remain MathJax', pdf._private.answerHtml('±√9').includes('\\pm \\sqrt{9}'));
check('plain text HTML entities remain escaped', pdf._private.answerHtml('A&B') === 'A&amp;B');

const targetSpecs = [
  spec('solve_eq', { coeff: 4, xVal: -8 }),
  spec('frac_to_pct', { item: { f: '1/5', tex: '\\frac{1}{5}', ans: '20' } }),
  spec('coordinate', { rx: -2, ry: 2, askAxis: 'y' }),
];
const targetSnapshot = pdf.generateSnapshotFromSpecs(targetSpecs, 'pdf-answer-screen-fields', {
  title: 'Screen field test', presetKey: 'test', generatedAt: '2026-07-14T00:00:00.000Z', generatorApi: generators,
});
const beforeRender = targetSnapshot.questions.map((q) => q.displayAnswer);
const targetTeacher = pdf.renderPDF(targetSnapshot, 'teacher', { showCode: true });
check('solve_eq screen displayAnswer remains bare', beforeRender[0] === '-8', beforeRender[0]);
check('frac_to_pct screen displayAnswer remains pre-escaped', beforeRender[1] === '20\\%', beforeRender[1]);
check('coordinate screen displayAnswer remains mixed text', beforeRender[2] === coordinateDisplay, beforeRender[2]);
check('PDF render does not mutate screen displayAnswer fields', JSON.stringify(targetSnapshot.questions.map((q) => q.displayAnswer)) === JSON.stringify(beforeRender));
check('rendered frac_to_pct teacher answer includes percent', teacherAnswer(targetTeacher, 'frac_to_pct') === '\\(20\\%\\)');
check('rendered coordinate teacher answer has no literal duplicate delimiters', !teacherAnswer(targetTeacher, 'coordinate').includes('\\(\\('));

console.log(`\n=== Summary: ${passed} passed, ${failures.length} failed ===`);
if (failures.length) {
  failures.forEach((failure) => console.error('  - ' + failure));
  process.exit(1);
}
