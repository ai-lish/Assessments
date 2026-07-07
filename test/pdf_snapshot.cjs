#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FIXTURE_DIR = path.join(ROOT, 'test/fixtures/pdf');
const ARTIFACT_DIR = path.join(ROOT, 'test/artifacts/pdf');
const UPDATE = process.argv.includes('--update');

const bank = JSON.parse(fs.readFileSync(path.join(ROOT, 'question-bank.json'), 'utf8'));
const pdf = require(path.join(ROOT, 'tool/pdf.js'));
const generators = require(path.join(ROOT, 'tool/generators.js'));

const PRESET_KEYS = [
  's1_term2_part_a',
  's1_term3_part_a',
  's2_term3_part_a',
  's3_term3_part_a',
];

const SPECIAL_TYPES = new Map([
  ['coordinate', 'coordinate SVG / axis-value'],
  ['congruence', 'congruence SVG'],
  ['triangle_center', 'triangle center SVG choice'],
  ['sci_notation', 'scientific notation'],
  ['solve_ineq', 'inequality'],
  ['solid_sphere', 'solid mensuration pi'],
  ['solid_cylinder', 'solid mensuration pi'],
  ['solid_cone', 'solid mensuration pi'],
  ['sector_measure', 'sector measure pi'],
  ['frac_arith', 'fraction arithmetic'],
  ['discount', 'money discount'],
  ['profit_pct', 'profit percentage'],
]);

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

function stableSnapshot(snapshot) {
  return {
    snapshotId: snapshot.snapshotId,
    seed: snapshot.seed,
    title: snapshot.title,
    presetKey: snapshot.presetKey,
    questionCount: snapshot.questions.length,
    questions: snapshot.questions.map((q) => ({
      index: q.index,
      qid: q.qid,
      typeKey: q.typeKey,
      code: q.code,
      paramsUsed: q.paramsUsed,
      answerSpec: q.answerSpec,
      displayAnswer: q.displayAnswer,
    })),
  };
}

function buildSpecs(preset) {
  const typeByKey = new Map(bank.data.map((t) => [t.key, t]));
  return preset.questions.map((q, index) => {
    const typeDef = typeByKey.get(q.typeKey);
    if (!typeDef) throw new Error(`missing typeDef ${q.typeKey}`);
    return {
      qid: 'q' + String(index + 1).padStart(3, '0'),
      typeKey: q.typeKey,
      typeDef: JSON.parse(JSON.stringify(typeDef)),
      params: {},
    };
  });
}

function displaySchoolYear(yearCode) {
  const s = String(yearCode || '');
  const m = s.match(/^(\d{2})(\d{2})$/);
  return m ? `20${m[1]}-${m[2]}` : s;
}

function deriveYearFromPreset(preset) {
  const typeByKey = new Map(bank.data.map((t) => [t.key, t]));
  const first = preset.questions && preset.questions[0] && typeByKey.get(preset.questions[0].typeKey);
  const m = first && first.code && first.code.match(/^LSC-(\d{4})-/);
  return m ? m[1] : '';
}

function normalizePartName(name) {
  return String(name || '').replace(/[（(]?甲部[）)]?/g, '(甲部)');
}

function buildPracticeTitle(preset) {
  const year = deriveYearFromPreset(preset);
  return `${displaySchoolYear(year)} 年度 ${normalizePartName(preset.name)}短答練習`;
}

function readFixture(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
}

function writeFixture(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

function assertFixture(name, content) {
  const file = path.join(FIXTURE_DIR, name);
  if (UPDATE || !fs.existsSync(file)) {
    writeFixture(file, content);
    check(`updated fixture ${name}`, true);
    return;
  }
  const expected = readFixture(file);
  check(`fixture stable ${name}`, expected === content, expected === content ? '' : 'run node test/pdf_snapshot.cjs --update after intentional PDF change');
}

function qNumbersIn(html) {
  return [...html.matchAll(/<div class="pdf-qno">\((\d+)\)<\/div>/g)].map((m) => Number(m[1]));
}

function arraysEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

const foundSpecial = new Set();

console.log('=== PDF Snapshot Fixture Test ===');
for (const presetKey of PRESET_KEYS) {
  const preset = bank.presets.find((p) => p.key === presetKey);
  if (!preset) throw new Error(`missing preset ${presetKey}`);
  console.log(`\n--- ${presetKey} ---`);
  const specs = buildSpecs(preset);
  const title = buildPracticeTitle(preset);
  const snapshot = pdf.generateSnapshotFromSpecs(specs, `pdf-a3-fixture:${presetKey}`, {
    title,
    presetKey,
    generatedAt: '2026-07-07T00:00:00.000Z',
    generatorApi: generators,
  });
  const snapshotStable = JSON.stringify(stableSnapshot(snapshot), null, 2) + '\n';
  const studentHtml = pdf.renderPDF(snapshot, 'student', { showCode: true }) + '\n';
  const teacherHtml = pdf.renderPDF(snapshot, 'teacher', { showCode: true }) + '\n';
  const printHtml = pdf.renderPrintDocument(snapshot, { showCode: true });

  assertFixture(`${presetKey}.snapshot.json`, snapshotStable);
  assertFixture(`${presetKey}.student.html`, studentHtml);
  assertFixture(`${presetKey}.teacher.html`, teacherHtml);

  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, `${presetKey}.print.html`), printHtml, 'utf8');

  const studentNos = qNumbersIn(studentHtml);
  const teacherNos = qNumbersIn(teacherHtml);
  const expectedNos = Array.from({ length: snapshot.questions.length }, (_, i) => i + 1);
  check(`${presetKey} student q numbers match instance order`, arraysEqual(studentNos, expectedNos));
  check(`${presetKey} teacher q numbers match student`, arraysEqual(teacherNos, studentNos));
  check(`${presetKey} both modes share snapshot id`, studentHtml.includes(snapshot.snapshotId) && teacherHtml.includes(snapshot.snapshotId));
  check(`${presetKey} teacher answer count`, (teacherHtml.match(/pdf-teacher-answer/g) || []).length === snapshot.questions.length);
  check(`${presetKey} student has answer lines`, (studentHtml.match(/pdf-answer-line/g) || []).length === snapshot.questions.length);
  check(`${presetKey} combined print has MathJax wait`, printHtml.includes('waitForMathJax') && printHtml.includes('MathJax.typesetPromise'));
  check(`${presetKey} combined print waits for two animation frames`, (printHtml.match(/await nextFrame\(\)/g) || []).length >= 2);
  check(`${presetKey} combined print does not use setTimeout`, !/setTimeout\s*\(/.test(printHtml));

  for (const q of snapshot.questions) {
    if (SPECIAL_TYPES.has(q.typeKey)) {
      foundSpecial.add(q.typeKey);
      check(`${q.typeKey} answerSpec/displayAnswer present`, q.displayAnswer !== undefined && ('answerSpec' in q));
      check(`${q.typeKey} appears in teacher HTML`, teacherHtml.includes(`data-type-key="${q.typeKey}"`));
      if (['coordinate', 'congruence', 'triangle_center'].includes(q.typeKey)) {
        check(`${q.typeKey} SVG appears in print HTML`, /<svg[\s>]/i.test(printHtml));
      }
    }
  }
}

console.log('\n--- Special type matrix ---');
for (const [typeKey, label] of SPECIAL_TYPES) {
  check(`${typeKey} covered (${label})`, foundSpecial.has(typeKey));
}

console.log(`\n=== Summary: ${passed} passed, ${failures.length} failed ===`);
if (failures.length) {
  failures.forEach((f) => console.error('  - ' + f));
  process.exit(1);
}
