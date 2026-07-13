#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const TARGETS = [
  { preset: 's1_term2_part_a', file: 'exercises/2526/s1/t2/part-a-01.html', count: 14 },
  { preset: 's1_term3_part_a', file: 'exercises/2526/s1/t3/part-a-01.html', count: 16 },
  { preset: 's2_term3_part_a', file: 'exercises/2526/s2/t3/part-a-01.html', count: 16 },
  { preset: 's3_term3_part_a', file: 'exercises/2526/s3/t3/part-a-01.html', count: 14 },
];

function makeElement(tag) {
  const classes = new Set();
  return {
    tagName: String(tag || '').toUpperCase(),
    children: [],
    style: {},
    dataset: {},
    textContent: '',
    innerHTML: '',
    classList: {
      add: (...names) => names.forEach((n) => classes.add(n)),
      remove: (...names) => names.forEach((n) => classes.delete(n)),
      contains: (n) => classes.has(n),
    },
    appendChild(child) { this.children.push(child); return child; },
    setAttribute(name, value) { this[name] = value; },
    addEventListener() {},
    click() { if (typeof this.onclick === 'function') this.onclick(); },
    querySelector() { return null; },
    querySelectorAll() { return []; },
  };
}

function makeSeededRandom(seed) {
  let s = seed | 0;
  return function random() {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    return ((s >>> 0) / 0x100000000);
  };
}

function buildSandbox(html, seed) {
  const elements = new Map();
  const printTargets = [];
  const storage = new Map();
  [
    'quiz-view', 'result-view', 'p-text', 'q-text', 'q-feedback', 'btn-check',
    'btn-next', 'btn-teach', 'solution-box', 'input-val', 'prefix', 'suffix',
    'q-hint', 'q-options', 'q-coord-hint', 'input-row', 'q-image', 'toast',
    'final-score', 'btn-retry-wrong', 'history-body', 'detail-modal',
    'modal-title', 'modal-body-content', 'btn-export', 'score-mini', 'q-code',
  ].forEach((id) => elements.set(id, makeElement(id)));

  const document = {
    body: makeElement('body'),
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, makeElement(id));
      return elements.get(id);
    },
    createElement(tag) { return makeElement(tag); },
    addEventListener() {},
  };

  const math = Object.create(Math);
  math.random = makeSeededRandom(seed);
  const sandbox = {
    console,
    document,
    window: {
      MathJax: null,
      document,
      open() {
        const target = {
          document: {
            html: '',
            open() { this.html = ''; },
            write(chunk) { this.html += String(chunk); },
            close() {},
          },
        };
        printTargets.push(target);
        return target;
      },
      print() {},
    },
    MathJax: null,
    localStorage: {
      getItem(key) { return storage.has(key) ? storage.get(key) : null; },
      setItem(key, value) { storage.set(key, String(value)); },
    },
    URL: { createObjectURL: () => 'blob:test', revokeObjectURL: () => {} },
    Blob: function Blob(parts, opts) { this.parts = parts; this.opts = opts; },
    Date,
    Math: math,
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
    prompt: () => 's20271001m',
    fetch: () => Promise.resolve({ ok: true }),
    __printTargets: printTargets,
  };
  sandbox.window.localStorage = sandbox.localStorage;
  sandbox.window.URL = sandbox.URL;
  sandbox.window.Blob = sandbox.Blob;
  sandbox.window.Math = sandbox.Math;
  vm.createContext(sandbox);

  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const runnable = scripts.filter((s) => !/^\s*window\.MathJax\s*=\s*\{/.test(s));
  runnable.forEach((script, index) => {
    vm.runInContext(script, sandbox, { filename: `exercise_pdf#script${index}` });
  });
  return sandbox;
}

function questionNumbers(html) {
  return [...html.matchAll(/<div class="pdf-qno">\((\d+)\)<\/div>/g)].map((m) => Number(m[1]));
}

let passed = 0;
const failures = [];
function check(label, ok, detail = '') {
  if (ok) {
    passed += 1;
    console.log('  ✓ ' + label);
  } else {
    failures.push(label + (detail ? ' — ' + detail : ''));
    console.log('  ✗ ' + label + (detail ? ' — ' + detail : ''));
  }
}

console.log('=== exercises PDF export check ===');
for (const target of TARGETS) {
  console.log(`\n--- ${target.preset} ---`);
  const html = fs.readFileSync(path.join(ROOT, target.file), 'utf8');
  check('contains AssessPDF once', (html.match(/function createAssessPDF/g) || []).length === 1);
  check('contains printPDF once', (html.match(/function printPDF/g) || []).length === 1);
  const sandbox = buildSandbox(html, 0x1234abcd);
  vm.runInContext('printPDF();', sandbox);
  const printed = sandbox.__printTargets[0] && sandbox.__printTargets[0].document.html;
  check('opens one print document', sandbox.__printTargets.length === 1);
  check('student and teacher modes present', /data-mode="student"/.test(printed || '') && /data-mode="teacher"/.test(printed || ''));
  check('teacher answers styled red/bold class present', /pdf-teacher-answer/.test(printed || '') && /color:#c0392b/.test(printed || ''));
  check('preview does not auto-call window.print', !/window\.print\s*\(/.test(printed || ''));
  check('preview includes manual print guidance and readiness marker',
    /pdf-preview-note/.test(printed || '') && /data-print-ready/.test(printed || ''));
  const nums = questionNumbers(printed || '');
  const firstHalf = nums.slice(0, target.count);
  const secondHalf = nums.slice(target.count);
  const expected = Array.from({ length: target.count }, (_, i) => i + 1);
  check('student question order consistent', JSON.stringify(firstHalf) === JSON.stringify(expected));
  check('teacher question order consistent', JSON.stringify(secondHalf) === JSON.stringify(expected));
}

console.log(`\n=== Summary: ${passed} passed, ${failures.length} failed ===`);
if (failures.length) {
  failures.forEach((f) => console.error('  - ' + f));
  process.exit(1);
}
