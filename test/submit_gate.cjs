#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const template = fs.readFileSync(path.join(ROOT, 'templates/student.html'), 'utf8');
const validatorsScript = fs.readFileSync(path.join(ROOT, 'tool/validators.js'), 'utf8');
const generators = require(path.join(ROOT, 'tool/generators.js'));
const pdfScript = fs.readFileSync(path.join(ROOT, 'tool/pdf.js'), 'utf8');

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

function makeElement(id = '') {
  const classes = new Set();
  return {
    id,
    value: '',
    textContent: '',
    innerText: '',
    innerHTML: '',
    disabled: false,
    style: {},
    children: [],
    className: '',
    classList: {
      add: (...names) => names.forEach((name) => classes.add(name)),
      remove: (...names) => names.forEach((name) => classes.delete(name)),
      contains: (name) => classes.has(name),
    },
    appendChild(child) { this.children.push(child); return child; },
    setAttribute(name, value) { this[name] = value; },
    addEventListener() {},
    click() { if (typeof this.onclick === 'function') this.onclick(); },
  };
}

function buildHtml({ grade = 's1', gasUrl = 'https://example.invalid/sheets' } = {}) {
  return template
    .replace(/\{\{TITLE_HTML\}\}/g, 'Submit Gate Test')
    .replace(/\{\{TITLE\}\}/g, JSON.stringify('Submit Gate Test'))
    .replace(/\{\{QUESTIONS_DATA\}\}/g, JSON.stringify([]))
    .replace(/\{\{QUESTION_SPECS\}\}/g, JSON.stringify([]))
    .replace(/\{\{GENERATED_AT\}\}/g, JSON.stringify('2026-07-07T00:00:00.000Z'))
    .replace(/\{\{BANK_HASH\}\}/g, JSON.stringify('submit_gate_hash'))
    .replace(/\{\{PRESET_KEY\}\}/g, JSON.stringify('s1_term3_part_a'))
    .replace(/\{\{GRADE\}\}/g, JSON.stringify(grade))
    .replace(/\{\{GAS_URL\}\}/g, JSON.stringify(gasUrl))
    .replace(/\{\{VALIDATORS_SCRIPT\}\}/g, validatorsScript)
    .replace(/\{\{GENERATORS_SCRIPT\}\}/g, generators.toStandaloneScript())
    .replace(/\{\{PDF_SCRIPT\}\}/g, pdfScript)
    .replace(/\{\{RUNTIME_SEED\}\}/g, JSON.stringify(null));
}

function buildSandbox(promptValues, htmlOptions = {}) {
  const elements = new Map();
  const fetchCalls = [];
  const prompts = promptValues.slice();
  const ids = [
    'practice-title', 'quiz-view', 'result-view', 'p-text', 'q-text', 'q-feedback',
    'btn-check', 'btn-next', 'btn-teach', 'solution-box', 'input-val', 'prefix',
    'suffix', 'q-hint', 'q-options', 'q-coord-hint', 'input-row', 'q-image',
    'toast', 'final-score', 'btn-retry-wrong', 'history-body', 'detail-modal',
    'modal-title', 'modal-body-content', 'btn-export', 'submit-hint', 'score-mini',
    'q-code', 'btn-back-practice',
  ];
  ids.forEach((id) => elements.set(id, makeElement(id)));
  elements.get('quiz-view').style.display = 'flex';
  elements.get('result-view').style.display = 'none';
  elements.get('btn-check').style.display = 'block';
  elements.get('btn-next').style.display = 'none';

  const document = {
    body: makeElement('body'),
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, makeElement(id));
      return elements.get(id);
    },
    createElement(tag) {
      const el = makeElement(tag);
      el.tagName = String(tag).toUpperCase();
      return el;
    },
    addEventListener() {},
  };

  const sandbox = {
    console,
    document,
    window: { MathJax: null, document, localStorage: null, URL: null, Blob: null, open: () => null },
    MathJax: null,
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    URL: { createObjectURL: () => 'blob:submit', revokeObjectURL() {} },
    Blob: function Blob(parts, opts) { this.parts = parts; this.opts = opts; },
    Date,
    Math,
    JSON,
    Set,
    Map,
    Array,
    String,
    Number,
    Boolean,
    Error,
    Promise,
    setTimeout: (fn) => { if (typeof fn === 'function') fn(); return 1; },
    clearTimeout: () => {},
    prompt: () => prompts.shift(),
    fetch: (url, options) => {
      fetchCalls.push({ url, options });
      return Promise.resolve({ ok: true });
    },
    __elements: elements,
    __fetchCalls: fetchCalls,
  };
  sandbox.window.localStorage = sandbox.localStorage;
  sandbox.window.URL = sandbox.URL;
  sandbox.window.Blob = sandbox.Blob;

  const html = buildHtml(htmlOptions);
  const leftover = html.match(/\{\{[A-Z_]+\}\}/g);
  if (leftover) throw new Error('leftover placeholders: ' + leftover.join(', '));
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
    .map((m) => m[1])
    .filter((script) => !script.includes('window.MathJax ='));

  vm.createContext(sandbox);
  scripts.forEach((script, index) => vm.runInContext(script, sandbox, { filename: `submit_gate#${index}` }));
  return sandbox;
}

function run(code, sandbox) {
  return vm.runInContext(code, sandbox);
}

console.log('=== Submit Gate / Student ID / Payload ===');

let sandbox = buildSandbox([]);
run(`
  allAttempts = [
    { attemptNumber: 1, attemptType: "initial", score: 5, total: 16, remainingWrongCount: 11, completedAll: false, date: "7/7", time: "10:00", details: [] }
  ];
  lastResult = allAttempts[0];
  showResult();
`, sandbox);
check('incomplete result disables submit button', sandbox.__elements.get('btn-export').disabled === true);
check('incomplete result shows target hint', /完成所有錯題重做後方可提交/.test(sandbox.__elements.get('submit-hint').textContent));
run('handleExport();', sandbox);
check('incomplete result does not send request', sandbox.__fetchCalls.length === 0);

sandbox = buildSandbox(['20255001f']);
run(`
  allAttempts = [
    { attemptNumber: 1, attemptType: "initial", score: 5, total: 16, remainingWrongCount: 11, completedAll: false, date: "7/7", time: "10:00", details: [] },
    { attemptNumber: 2, attemptType: "wrong_retry", score: 11, total: 11, remainingWrongCount: 0, completedAll: true, date: "7/7", time: "10:05", details: [] }
  ];
  lastResult = allAttempts[1];
  showResult();
`, sandbox);
check('completedAll result enables submit button', sandbox.__elements.get('btn-export').disabled === false);
check('completedAll result shows ready hint', /可提交學習記錄/.test(sandbox.__elements.get('submit-hint').textContent));
run('handleExport();', sandbox);
check('lowercase f is normalized and request sent', sandbox.__fetchCalls.length === 1);
const payload = JSON.parse(sandbox.__fetchCalls[0].options.body);
check('payload contains two attempt rows', payload.rows.length === 2);
check('payload studentId uppercased', payload.rows.every((row) => row.studentId === '20255001F'));
check('payload grade generated as s1', payload.rows.every((row) => row.grade === 's1'));
check('payload fields complete', [
  'studentId', 'grade', 'toolId', 'attemptNumber', 'attemptType', 'score',
  'total', 'remainingWrongCount', 'completedAll', 'date', 'time',
].every((field) => Object.prototype.hasOwnProperty.call(payload.rows[0], field)));
check('payload keeps initial/wrong_retry attempt types', payload.rows.map((row) => row.attemptType).join(',') === 'initial,wrong_retry');

for (const badId of ['2025500', '20255001X']) {
  sandbox = buildSandbox([badId]);
  run(`
    allAttempts = [
      { attemptNumber: 1, attemptType: "initial", score: 16, total: 16, remainingWrongCount: 0, completedAll: true, date: "7/7", time: "10:00", details: [] }
    ];
    lastResult = allAttempts[0];
    showResult();
    handleExport();
  `, sandbox);
  check(`invalid student ID ${badId} is rejected before fetch`, sandbox.__fetchCalls.length === 0);
}

sandbox = buildSandbox(['20255001F'], { gasUrl: '' });
run(`
  allAttempts = [
    { attemptNumber: 1, attemptType: "initial", score: 16, total: 16, remainingWrongCount: 0, completedAll: true, date: "7/7", time: "10:00", details: [] }
  ];
  lastResult = allAttempts[0];
  showResult();
  handleExport();
`, sandbox);
check('empty GAS_URL disables submit even when completedAll', sandbox.__elements.get('btn-export').disabled === true);
check('empty GAS_URL shows unconfigured destination hint', /未配置提交目的地/.test(sandbox.__elements.get('submit-hint').textContent));
check('empty GAS_URL does not send request', sandbox.__fetchCalls.length === 0);

console.log(`\n=== Summary: ${passed} passed, ${failures.length} failed ===`);
if (failures.length) {
  failures.forEach((failure) => console.error('  - ' + failure));
  process.exit(1);
}
