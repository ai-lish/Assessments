#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { TextEncoder } = require('util');
const { webcrypto } = require('crypto');

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
    focus() { this.focused = true; },
    click() { if (typeof this.onclick === 'function') this.onclick(); },
  };
}

function makeStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); },
    removeItem(key) { data.delete(key); },
    clear() { data.clear(); },
    __data: data,
  };
}

function buildHtml({ grade = 's1', gasUrl = 'https://example.invalid/sheets', teacherPinHash = '' } = {}) {
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
    .replace(/\{\{TEACHER_PIN_HASH\}\}/g, JSON.stringify(teacherPinHash))
    .replace(/\{\{VALIDATORS_SCRIPT\}\}/g, validatorsScript)
    .replace(/\{\{GENERATORS_SCRIPT\}\}/g, generators.toStandaloneScript())
    .replace(/\{\{PDF_SCRIPT\}\}/g, pdfScript)
    .replace(/\{\{RUNTIME_SEED\}\}/g, JSON.stringify(null));
}

function buildSandbox(promptValues, htmlOptions = {}, sessionData = {}) {
  const elements = new Map();
  const fetchCalls = [];
  const promptCalls = [];
  const prompts = promptValues.slice();
  const ids = [
    'practice-title', 'student-start-view', 'student-id-input', 'student-id-error',
    'btn-start-practice', 'top-info', 'quiz-view', 'result-view', 'p-text', 'q-text', 'q-feedback',
    'btn-check', 'btn-next', 'btn-teach', 'solution-box', 'input-val', 'prefix',
    'suffix', 'q-hint', 'q-options', 'q-coord-hint', 'input-row', 'q-image',
    'toast', 'final-score', 'btn-retry-wrong', 'history-body', 'detail-modal',
    'modal-title', 'modal-body-content', 'btn-export', 'submit-hint', 'score-mini',
    'q-code', 'btn-back-practice', 'partial-submit-row', 'btn-partial-submit',
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

  const sessionStorage = makeStorage(sessionData);
  const localStorage = {
    getItem() { throw new Error('student runtime must not read localStorage'); },
    setItem() { throw new Error('student runtime must not write localStorage'); },
    removeItem() { throw new Error('student runtime must not remove localStorage'); },
  };
  const sandbox = {
    console,
    document,
    window: { MathJax: null, document, localStorage: null, sessionStorage: null, URL: null, Blob: null, open: () => null },
    MathJax: null,
    localStorage,
    sessionStorage,
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
    TextEncoder,
    Uint8Array,
    crypto: webcrypto,
    setTimeout: (fn) => { if (typeof fn === 'function') fn(); return 1; },
    clearTimeout: () => {},
    prompt: (message, defaultValue) => {
      promptCalls.push({ message, defaultValue });
      return prompts.shift();
    },
    fetch: (url, options) => {
      fetchCalls.push({ url, options });
      return Promise.resolve({ ok: true });
    },
    __elements: elements,
    __fetchCalls: fetchCalls,
    __promptCalls: promptCalls,
    __sessionStorage: sessionStorage,
  };
  sandbox.window.localStorage = sandbox.localStorage;
  sandbox.window.sessionStorage = sandbox.sessionStorage;
  sandbox.window.URL = sandbox.URL;
  sandbox.window.Blob = sandbox.Blob;
  sandbox.window.crypto = sandbox.crypto;

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

function digestPin(pin) {
  return require('crypto').createHash('sha256').update(String(pin)).digest('hex');
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setTimeout(resolve, 5));
  await Promise.resolve();
}

async function waitFor(condition, maxTicks = 100) {
  for (let i = 0; i < maxTicks; i += 1) {
    if (condition()) return true;
    await flushPromises();
  }
  return condition();
}

async function main() {
console.log('=== Submit Gate / Student ID / Payload ===');

console.log('\n=== Optional Student ID Start / Session Storage ===');

let sandbox = buildSandbox([]);
check('fresh page shows optional student ID start screen', sandbox.__elements.get('student-start-view').style.display === 'flex');
check('fresh page keeps quiz hidden until Start', sandbox.__elements.get('quiz-view').style.display === 'none');
run('initGame = function(){ document.getElementById("student-start-view").style.display = "none"; document.getElementById("quiz-view").style.display = "flex"; };', sandbox);
sandbox.__elements.get('student-id-input').value = '20255001f';
run('startPractice();', sandbox);
check('valid student ID enters practice', sandbox.__elements.get('quiz-view').style.display === 'flex');
check('valid student ID is normalized and stored in sessionStorage',
  sandbox.__sessionStorage.getItem('assess_student_id_submit_gate_hash') === '20255001F');

sandbox = buildSandbox([]);
run('initGame = function(){ document.getElementById("student-start-view").style.display = "none"; document.getElementById("quiz-view").style.display = "flex"; };', sandbox);
sandbox.__elements.get('student-id-input').value = '';
run('startPractice();', sandbox);
check('blank student ID skips and enters practice', sandbox.__elements.get('quiz-view').style.display === 'flex');
check('blank student ID is not stored', sandbox.__sessionStorage.getItem('assess_student_id_submit_gate_hash') === null);

sandbox = buildSandbox([]);
run('initGame = function(){ throw new Error("invalid ID must not start"); };', sandbox);
sandbox.__elements.get('student-id-input').value = '20255001X';
run('startPractice();', sandbox);
check('invalid student ID stays on start screen', sandbox.__elements.get('student-start-view').style.display === 'flex');
check('invalid student ID shows inline format error', /格式錯誤/.test(sandbox.__elements.get('student-id-error').textContent));

const savedAttempt = {
  n: 1, attemptNumber: 1, attemptType: 'initial', score: 1, total: 1,
  remainingWrongCount: 0, completedAll: true, date: '7/7', time: '10:00', details: [],
};
sandbox = buildSandbox([], {}, {
  assess_attempts_submit_gate_hash: JSON.stringify([savedAttempt]),
  assess_student_id_submit_gate_hash: '20255001F',
});
check('same-session history opens result page without asking for student ID again',
  sandbox.__elements.get('result-view').style.display === 'flex' && sandbox.__elements.get('student-start-view').style.display === 'none');
check('same-session student ID is restored', run('currentStudentId', sandbox) === '20255001F');

sandbox = buildSandbox([]);
check('new browsing context starts with no prior history',
  run('allAttempts.length', sandbox) === 0 && sandbox.__elements.get('student-start-view').style.display === 'flex');

sandbox = buildSandbox([]);
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
run('saveStudentId("20255001F");', sandbox);
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
check('completed submit asks to confirm the prefilled student ID',
  sandbox.__promptCalls[0] && sandbox.__promptCalls[0].defaultValue === '20255001F');
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

console.log('\n=== Partial Submit / PIN Gate ===');

const pinHash = digestPin('1234');

sandbox = buildSandbox([], { gasUrl: '', teacherPinHash: pinHash });
run(`
  allAttempts = [];
  lastResult = null;
  qList = new Array(16).fill(null).map((_, i) => ({ qid: "q" + String(i + 1).padStart(3, "0") }));
  sessionLog = [{ correct: true }];
  updatePartialSubmitButton();
`, sandbox);
check('partial submit hidden when GAS_URL empty', sandbox.__elements.get('partial-submit-row').style.display === 'none');

sandbox = buildSandbox([], { gasUrl: 'https://example.invalid/sheets', teacherPinHash: '' });
run(`
  allAttempts = [];
  lastResult = null;
  qList = new Array(16).fill(null).map((_, i) => ({ qid: "q" + String(i + 1).padStart(3, "0") }));
  sessionLog = [{ correct: true }];
  updatePartialSubmitButton();
`, sandbox);
check('partial submit hidden when teacher PIN hash empty', sandbox.__elements.get('partial-submit-row').style.display === 'none');

sandbox = buildSandbox([], { gasUrl: 'https://example.invalid/sheets', teacherPinHash: pinHash });
run(`
  allAttempts = [];
  lastResult = null;
  qList = new Array(16).fill(null).map((_, i) => ({ qid: "q" + String(i + 1).padStart(3, "0") }));
  sessionLog = [{ correct: true }];
  updatePartialSubmitButton();
`, sandbox);
check('partial submit visible when unfinished with GAS_URL and PIN hash', sandbox.__elements.get('partial-submit-row').style.display === 'block');
check('partial submit button enabled when visible', sandbox.__elements.get('btn-partial-submit').disabled === false);

sandbox = buildSandbox(['0000'], { gasUrl: 'https://example.invalid/sheets', teacherPinHash: pinHash });
run(`
  allAttempts = [];
  lastResult = null;
  qList = new Array(16).fill(null).map((_, i) => ({ qid: "q" + String(i + 1).padStart(3, "0"), typeKey: "dummy" }));
  sessionLog = [{ correct: true }, { correct: false }];
  sessionAnswers = ["1", "2"];
  currIdx = 2;
  handlePartialSubmit();
`, sandbox);
await waitFor(() => sandbox.__fetchCalls.length === 0);
check('wrong PIN rejects partial submit before fetch', sandbox.__fetchCalls.length === 0);
check('wrong PIN does not reset current question index', run('currIdx', sandbox) === 2);

sandbox = buildSandbox(['1234', '20255001f'], { gasUrl: 'https://example.invalid/sheets', teacherPinHash: pinHash });
run('saveStudentId("20255001F");', sandbox);
run(`
  allAttempts = [];
  lastResult = null;
  qList = new Array(16).fill(null).map((_, i) => ({ qid: "q" + String(i + 1).padStart(3, "0"), typeKey: "dummy" }));
  sessionLog = [{ correct: true }, { correct: false }];
  sessionAnswers = ["1", "2"];
  currIdx = 2;
  handlePartialSubmit();
`, sandbox);
await waitFor(() => sandbox.__fetchCalls.length === 1);
check('correct PIN and student ID sends partial submit request', sandbox.__fetchCalls.length === 1);
check('partial submit asks for PIN before confirming prefilled student ID',
  sandbox.__promptCalls.length === 2 && /老師 PIN/.test(sandbox.__promptCalls[0].message) &&
  sandbox.__promptCalls[1].defaultValue === '20255001F');
const partialPayload = JSON.parse(sandbox.__fetchCalls[0].options.body);
const partialRow = partialPayload.rows[partialPayload.rows.length - 1];
const payloadFields = [
  'studentId', 'grade', 'toolId', 'attemptNumber', 'attemptType', 'score',
  'total', 'remainingWrongCount', 'completedAll', 'date', 'time',
];
check('partial submit payload keeps 11-field contract',
      Object.keys(partialRow).length === payloadFields.length &&
      payloadFields.every((field) => Object.prototype.hasOwnProperty.call(partialRow, field)));
check('partial submit payload marks completedAll false', partialRow.completedAll === false, JSON.stringify(partialRow));
check('partial submit score counts correct answered only', partialRow.score === 1, JSON.stringify(partialRow));
check('partial submit total remains full paper length', partialRow.total === 16, JSON.stringify(partialRow));
check('partial submit normalizes student ID', partialRow.studentId === '20255001F');
check('partial submit preserves current question index after sending', run('currIdx', sandbox) === 2);
check('partial submit stores local answeredCount without sending it',
      run('allAttempts[0].answeredCount', sandbox) === 2 && !Object.prototype.hasOwnProperty.call(partialRow, 'answeredCount'),
      JSON.stringify({ local: run('allAttempts[0]', sandbox), row: partialRow }));

sandbox = buildSandbox(['1234', '20255001F', '1234', '20255001F'], { gasUrl: 'https://example.invalid/sheets', teacherPinHash: pinHash });
run(`
  allAttempts = [];
  lastResult = null;
  qList = new Array(16).fill(null).map((_, i) => ({ qid: "q" + String(i + 1).padStart(3, "0"), typeKey: "dummy" }));
  sessionLog = [{ correct: true }];
  sessionAnswers = ["1"];
  currIdx = 1;
  handlePartialSubmit();
`, sandbox);
await waitFor(() => sandbox.__fetchCalls.length === 1);
run(`
  sessionLog.push({ correct: true });
  sessionAnswers.push("2");
  currIdx = 2;
  handlePartialSubmit();
`, sandbox);
await waitFor(() => sandbox.__fetchCalls.length === 2);
check('partial submit can be repeated without resetting answer state',
      sandbox.__fetchCalls.length === 2 && run('currIdx', sandbox) === 2 && run('sessionLog.length', sandbox) === 2);

sandbox = buildSandbox(['20255001F'], { gasUrl: 'https://example.invalid/sheets', teacherPinHash: pinHash });
run(`
  allAttempts = [
    { attemptNumber: 1, attemptType: "initial", score: 16, total: 16, remainingWrongCount: 0, completedAll: true, date: "7/7", time: "10:00", details: [] }
  ];
  lastResult = allAttempts[0];
  showResult();
  handleExport();
`, sandbox);
check('normal completed submit still does not ask for teacher PIN', sandbox.__fetchCalls.length === 1);
check('normal completed submit keeps completedAll true', JSON.parse(sandbox.__fetchCalls[0].options.body).rows[0].completedAll === true);

console.log('\n=== Retry All Confirmation ===');
sandbox = buildSandbox([]);
run(`
  allAttempts = [{ attemptNumber: 1, score: 3, total: 4 }];
  window.__retryMode = null;
  window.__confirmMessages = [];
  initGame = mode => { window.__retryMode = mode; };
  window.confirm = message => { window.__confirmMessages.push(message); return false; };
  confirmRetryAll();
`, sandbox);
check('cancelled all-retry does not restart practice', sandbox.window.__retryMode === null);
check('all-retry confirmation uses the approved warning text',
  sandbox.window.__confirmMessages[0] === "確定重做全部題目?『重做錯題』會按最新一輪結果更新");
check('cancelled all-retry keeps session history', run('allAttempts.length', sandbox) === 1);
run(`
  window.confirm = message => { window.__confirmMessages.push(message); return true; };
  confirmRetryAll();
`, sandbox);
check('confirmed all-retry restarts the full practice', sandbox.window.__retryMode === 'all');
check('confirmation wrapper does not clear session history', run('allAttempts.length', sandbox) === 1);

console.log(`\n=== Summary: ${passed} passed, ${failures.length} failed ===`);
if (failures.length) {
  failures.forEach((failure) => console.error('  - ' + failure));
  process.exit(1);
}
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
