#!/usr/bin/env node
/*
 * Headless runtime-randomness check for exercises/*.html (MacD).
 *
 * Reuses the buildSandbox pattern from test/runtime_random_export.cjs
 * (PR #21) but reads the actual on-disk exercises/{year}/{grade}/{term}/part-a-NN.html
 * files instead of re-building HTML in memory.
 *
 * For each file, run the runtime in two sandboxes with different Math.random()
 * seeds. Verify that:
 *   1. Both runs successfully build QUESTIONS.
 *   2. paramsUsed fingerprint differs between r1 and r2 (runtime random works).
 *   3. Question count matches the preset.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

const TARGETS = [
  { preset: 's1_term2_part_a', file: 'exercises/2526/s1/t2/part-a-01.html', questionCount: 14, probeQid: 'q013' },
  { preset: 's1_term3_part_a', file: 'exercises/2526/s1/t3/part-a-01.html', questionCount: 16, probeQid: 'q013' },
  { preset: 's2_term3_part_a', file: 'exercises/2526/s2/t3/part-a-01.html', questionCount: 16, probeQid: 'q001' },
  { preset: 's3_term3_part_a', file: 'exercises/2526/s3/t3/part-a-01.html', questionCount: 14, probeQid: 'q009' },
];

// --- DOM mock (mirrors runtime_random_export.cjs) ---
function makeElement(tag) {
  const classes = new Set();
  const children = [];
  const el = {
    tagName: String(tag || '').toUpperCase(),
    children,
    style: {},
    dataset: {},
    classList: {
      add: (...names) => names.forEach((n) => classes.add(n)),
      remove: (...names) => names.forEach((n) => classes.delete(n)),
      contains: (n) => classes.has(n),
    },
    appendChild(c) { children.push(c); return c; },
    setAttribute(n, v) { el[n] = v; },
    addEventListener() {},
    click() { if (typeof el.onclick === 'function') el.onclick(); },
    querySelector() { return null; },
    querySelectorAll() { return []; },
  };
  return el;
}

function makeSeededRandom(seed) {
  let s = seed | 0;
  return function random() {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    return ((s >>> 0) / 0x100000000);
  };
}

function makeMath(seed) {
  const m = Object.create(Math);
  m.random = makeSeededRandom(seed);
  return m;
}

function buildSandbox(seed, html) {
  const elements = new Map();
  const listeners = {};
  const storage = new Map();
  const ids = [
    'quiz-view', 'result-view', 'p-text', 'q-text', 'q-feedback', 'btn-check',
    'btn-next', 'btn-teach', 'solution-box', 'input-val', 'prefix', 'suffix',
    'q-hint', 'q-options', 'q-coord-hint', 'input-row', 'q-image', 'toast',
    'final-score', 'btn-retry-wrong', 'history-body', 'detail-modal',
    'modal-title', 'modal-body-content', 'btn-export', 'score-mini', 'q-code',
  ];
  ids.forEach((id) => elements.set(id, makeElement(id)));
  elements.get('quiz-view').style.display = 'flex';
  elements.get('result-view').style.display = 'none';
  elements.get('btn-check').style.display = 'block';
  elements.get('btn-next').style.display = 'none';

  const document = {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, makeElement(id));
      return elements.get(id);
    },
    createElement(tag) {
      const el = makeElement(tag);
      el.tagName = String(tag || '').toUpperCase();
      return el;
    },
    addEventListener(type, fn) {
      listeners[type] = listeners[type] || [];
      listeners[type].push(fn);
    },
  };

  const sandbox = {
    console,
    document,
    window: { MathJax: null, print() {} },
    MathJax: null,
    localStorage: {
      getItem(key) { return storage.has(key) ? storage.get(key) : null; },
      setItem(key, value) { storage.set(key, String(value)); },
    },
    URL: { createObjectURL: () => 'blob:test', revokeObjectURL: () => {} },
    Blob: function Blob(parts, opts) { this.parts = parts; this.opts = opts; },
    Date,
    Math: makeMath(seed),
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
    __elements: elements,
  };
  sandbox.window.document = document;
  sandbox.window.localStorage = sandbox.localStorage;
  sandbox.window.URL = sandbox.URL;
  sandbox.window.Blob = sandbox.Blob;
  sandbox.window.Math = sandbox.Math;

  // Run the inline scripts extracted from the exercises/ HTML
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const MATHJAX_CONFIG_RE = /^\s*window\.MathJax\s*=\s*\{/;
  const runnable = scripts.filter((s) => !MATHJAX_CONFIG_RE.test(s));
  vm.createContext(sandbox);
  let scriptErrs = 0;
  runnable.forEach((script, index) => {
    try {
      vm.runInContext(script, sandbox, { filename: `ex_runtime#script${index}` });
    } catch (e) {
      if (/MathJax/i.test(e.message)) return; // skip MathJax init failures
      console.error(`  script ${index} ERROR: ${e.message.slice(0, 200)}`);
      scriptErrs++;
    }
  });
  if (scriptErrs > 0) throw new Error(`${scriptErrs} script(s) failed`);
  return sandbox;
}

function paramsSignature(sandbox) {
  // Access let-declared QUESTIONS via vm.runInContext (same lexical scope)
  return vm.runInContext(
    "JSON.stringify(QUESTIONS.map(q => ({ qid: q.qid, typeKey: q.typeKey, paramsUsed: q.paramsUsed })))",
    sandbox
  );
}

function questionCount(sandbox) {
  return vm.runInContext('QUESTIONS.length', sandbox);
}

function validateProbeQuestion(sandbox, qid) {
  return vm.runInContext(`
    (() => {
      const q = QUESTIONS.find(item => item.qid === ${JSON.stringify(qid)}) || QUESTIONS[0];
      return {
        qid: q.qid,
        typeKey: q.typeKey,
        correct: AssessValidators.checkAnswer(q, q.correctAnswer),
        wrong: AssessValidators.checkAnswer(q, "__definitely_wrong__"),
      };
    })()
  `, sandbox);
}

let passed = 0, failed = 0;
const failures = [];

console.log('=== exercises/ Runtime-Randomness Headless Check ===\n');
for (const t of TARGETS) {
  const fullPath = path.join(ROOT, t.file);
  console.log(`--- ${t.preset} (${t.file}) ---`);
  if (!fs.existsSync(fullPath)) {
    failed++;
    failures.push(`${t.file}: file not found`);
    console.log(`  ✗ file not found at ${fullPath}`);
    continue;
  }
  const html = fs.readFileSync(fullPath, 'utf-8');

  let s1, s2;
  try {
    s1 = buildSandbox(0x11111111, html);
    s2 = buildSandbox(0x22222222, html);
  } catch (e) {
    failed++;
    failures.push(`${t.preset}: buildSandbox failed — ${e.message.slice(0, 200)}`);
    console.log(`  ✗ buildSandbox failed: ${e.message.slice(0, 200)}`);
    continue;
  }

  const count1 = questionCount(s1);
  const count2 = questionCount(s2);
  if (count1 !== t.questionCount || count2 !== t.questionCount) {
    failed++;
    failures.push(`${t.preset}: COUNT expected ${t.questionCount} got r1=${count1} r2=${count2}`);
    console.log(`  ✗ COUNT expected ${t.questionCount} got r1=${count1} r2=${count2}`);
    continue;
  }
  console.log(`  ✓ COUNT=${count1} both runs`);

  const sig1 = paramsSignature(s1);
  const sig2 = paramsSignature(s2);
  if (sig1 === sig2) {
    failed++;
    failures.push(`${t.preset}: paramsUsed FINGERPRINT identical across 2 runs — runtime NOT randomizing`);
    console.log(`  ✗ FINGERPRINT identical — runtime not randomizing`);
    continue;
  }
  console.log(`  ✓ FINGERPRINT differs between r1 and r2 (runtime random confirmed)`);
  const probeValidation = validateProbeQuestion(s1, t.probeQid);
  if (!probeValidation.correct || probeValidation.wrong) {
    failed++;
    failures.push(`${t.preset}: probe validation failed for ${probeValidation.qid}/${probeValidation.typeKey}`);
    console.log(`  ✗ probe validation failed for ${probeValidation.qid} (${probeValidation.typeKey})`);
    continue;
  }
  console.log(`  ✓ ${probeValidation.qid} (${probeValidation.typeKey}) accepts correct answer and rejects wrong answer`);
  // Show one probe sample
  try {
    const p1 = JSON.parse(sig1);
    const p2 = JSON.parse(sig2);
    const probe1 = p1.find((q) => q.qid === t.probeQid) || p1[0];
    const probe2 = p2.find((q) => q.qid === t.probeQid) || p2[0];
    console.log(`    r1 ${probe1.qid} (${probe1.typeKey}) paramsUsed=${JSON.stringify(probe1.paramsUsed)}`);
    console.log(`    r2 ${probe2.qid} (${probe2.typeKey}) paramsUsed=${JSON.stringify(probe2.paramsUsed)}`);
  } catch {}
  passed++;
}

console.log(`\n=== Summary: ${passed} passed, ${failed} failed ===`);
if (failed) {
  failures.forEach((f) => console.error('  - ' + f));
  process.exit(1);
}
process.exit(0);
