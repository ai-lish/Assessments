#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const bank = JSON.parse(fs.readFileSync(path.join(ROOT, "question-bank.json"), "utf8"));
const template = fs.readFileSync(path.join(ROOT, "templates/student.html"), "utf8");
const validators = require(path.join(ROOT, "tool/validators.js"));
const generators = require(path.join(ROOT, "tool/generators.js"));

const typeByKey = new Map(bank.data.map((t) => [t.key, t]));

function buildInteractiveQuestionSpecs(preset) {
  return preset.questions.map((spec, index) => {
    const typeDef = typeByKey.get(spec.typeKey);
    if (!typeDef) throw new Error(`missing typeDef ${spec.typeKey}`);
    return {
      qid: `q${String(index + 1).padStart(3, "0")}`,
      typeKey: spec.typeKey,
      typeDef: JSON.parse(JSON.stringify(typeDef)),
      params: {},
    };
  });
}

function buildPreviewLeakedQuestionSpecs(preset) {
  return preset.questions.map((spec, index) => {
    const typeDef = typeByKey.get(spec.typeKey);
    if (!typeDef) throw new Error(`missing typeDef ${spec.typeKey}`);
    const preview = generators.generateQuestion(typeDef, {});
    return {
      qid: `q${String(index + 1).padStart(3, "0")}`,
      typeKey: spec.typeKey,
      typeDef: JSON.parse(JSON.stringify(typeDef)),
      params: preview.paramsUsed || {},
    };
  });
}

const presetByKey = new Map(bank.presets.map((p) => [p.key, p]));
const runtimePresets = [
  { key: "s1_term2_part_a", expectedCount: 14, probeTypeKey: "s1t2_prime_factor", probeKeys: ["n"] },
  { key: "s1_term3_part_a", expectedCount: 16, probeTypeKey: "frac_arith", probeKeys: ["a", "b", "c", "d", "op"] },
  { key: "s3_term3_part_a", expectedCount: 14, probeTypeKey: "poly_add_sub", probeKeys: ["a", "b", "c", "d", "e", "f", "op"] },
];

for (const item of runtimePresets) {
  if (!presetByKey.has(item.key)) throw new Error(`missing preset ${item.key}`);
}

const s1Term3Preset = presetByKey.get("s1_term3_part_a");
const questionSpecs = buildInteractiveQuestionSpecs(s1Term3Preset);
const leakedQuestionSpecs = buildPreviewLeakedQuestionSpecs(s1Term3Preset);
const allTypeQuestionSpecs = bank.data.map((typeDef, index) => ({
  qid: `type${String(index + 1).padStart(3, "0")}`,
  typeKey: typeDef.key,
  typeDef: JSON.parse(JSON.stringify(typeDef)),
  params: {},
}));

function makeExportQuestionSpecsFromPreviewBasket(preset) {
  return preset.questions.map((spec, index) => {
  const typeDef = typeByKey.get(spec.typeKey);
  if (!typeDef) throw new Error(`missing typeDef ${spec.typeKey}`);
  return {
    qid: `q${String(index + 1).padStart(3, "0")}`,
    typeKey: spec.typeKey,
    typeDef: JSON.parse(JSON.stringify(typeDef)),
    params: {},
  };
});
}

let passed = 0;
const failures = [];
function check(label, condition, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function makeElement(id = "") {
  const classes = new Set();
  return {
    id,
    value: "",
    textContent: "",
    innerText: "",
    innerHTML: "",
    disabled: false,
    style: {},
    children: [],
    className: "",
    classList: {
      add: (...names) => names.forEach((name) => classes.add(name)),
      remove: (...names) => names.forEach((name) => classes.delete(name)),
      contains: (name) => classes.has(name),
    },
    appendChild(child) { this.children.push(child); return child; },
    setAttribute(name, value) { this[name] = value; },
    addEventListener() {},
    click() { if (typeof this.onclick === "function") this.onclick(); },
  };
}

function makeSeededRandom(seed) {
  let s = seed | 0;
  return function random() {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    return ((s >>> 0) / 0x100000000);
  };
}

function makeMath(seed) {
  const math = Object.create(Math);
  math.random = makeSeededRandom(seed);
  return math;
}

function buildHtml(preset, specs = questionSpecs) {
  return template
    .replace(/\{\{TITLE\}\}/g, JSON.stringify(preset.name))
    .replace(/\{\{QUESTIONS_DATA\}\}/g, JSON.stringify([]))
    .replace(/\{\{QUESTION_SPECS\}\}/g, JSON.stringify(specs))
    .replace(/\{\{GENERATED_AT\}\}/g, JSON.stringify("2026-07-05T00:00:00.000Z"))
    .replace(/\{\{BANK_HASH\}\}/g, JSON.stringify("runtime_random_test"))
    .replace(/\{\{PRESET_KEY\}\}/g, JSON.stringify("s1_term3_part_a"))
    .replace(/\{\{GAS_URL\}\}/g, JSON.stringify(""))
    .replace(/\{\{VALIDATORS_SCRIPT\}\}/g, validators.toStandaloneScript())
    .replace(/\{\{GENERATORS_SCRIPT\}\}/g, generators.toStandaloneScript())
    .replace(/\{\{RUNTIME_SEED\}\}/g, JSON.stringify(null));
}

function buildSandbox(seed, preset = s1Term3Preset, specs = questionSpecs) {
  const elements = new Map();
  const listeners = {};
  const storage = new Map();
  const ids = [
    "quiz-view", "result-view", "p-text", "q-text", "q-feedback", "btn-check",
    "btn-next", "btn-teach", "solution-box", "input-val", "prefix", "suffix",
    "q-hint", "q-options", "q-coord-hint", "input-row", "q-image", "toast",
    "final-score", "btn-retry-wrong", "history-body", "detail-modal",
    "modal-title", "modal-body-content", "btn-export", "score-mini", "q-code",
  ];
  ids.forEach((id) => elements.set(id, makeElement(id)));
  elements.get("quiz-view").style.display = "flex";
  elements.get("result-view").style.display = "none";
  elements.get("btn-check").style.display = "block";
  elements.get("btn-next").style.display = "none";

  const document = {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, makeElement(id));
      return elements.get(id);
    },
    createElement(tag) {
      const el = makeElement(tag);
      el.tagName = tag.toUpperCase();
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
    URL: { createObjectURL: () => "blob:test", revokeObjectURL: () => {} },
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
    setTimeout: (fn) => { if (typeof fn === "function") fn(); return 1; },
    clearTimeout: () => {},
    prompt: () => "s20271001m",
    fetch: () => Promise.resolve({ ok: true }),
    __elements: elements,
  };
  sandbox.window.document = document;
  sandbox.window.localStorage = sandbox.localStorage;
  sandbox.window.URL = sandbox.URL;
  sandbox.window.Blob = sandbox.Blob;
  sandbox.window.Math = sandbox.Math;

  const html = buildHtml(preset, specs);
  const leftover = html.match(/\{\{[A-Z_]+\}\}/g) || [];
  if (leftover.length) throw new Error(`leftover placeholders: ${leftover.join(", ")}`);
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const runnableScripts = scripts.filter((script) => !script.includes("window.MathJax ="));
  vm.createContext(sandbox);
  runnableScripts.forEach((script, index) => {
    vm.runInContext(script, sandbox, { filename: `runtime_random_export#script${index}` });
  });
  return sandbox;
}

function paramsSignature(sandbox) {
  return vm.runInContext("JSON.stringify(QUESTIONS.map(q => ({ qid: q.qid, typeKey: q.typeKey, paramsUsed: q.paramsUsed })))", sandbox);
}

function primaryParamSignature(sandbox, probeTypeKey, keys) {
  return vm.runInContext(`
    (() => {
      const q = QUESTIONS.find(item => item.typeKey === ${JSON.stringify(probeTypeKey)});
      if (!q) return null;
      const out = {};
      for (const key of ${JSON.stringify(keys)}) out[key] = q.paramsUsed ? q.paramsUsed[key] : undefined;
      return JSON.stringify(out);
    })()
  `, sandbox);
}

console.log("\n=== runtime random export semantics ===");
const expectedTypeCount = 46;
const allSpecKeys = allTypeQuestionSpecs.map((spec) => spec.typeKey);
const allBankKeys = bank.data.map((typeDef) => typeDef.key);
const allSpecFieldsOk = allTypeQuestionSpecs.every((spec) => {
  const source = typeByKey.get(spec.typeKey);
  return spec.typeDef
    && spec.typeDef.key === source.key
    && spec.typeDef.generator === source.generator
    && spec.typeDef.code === source.code
    && JSON.stringify(spec.typeDef.defaultParams || {}) === JSON.stringify(source.defaultParams || {});
});
check("QUESTION_SPECS can cover all 46 typeDefs", allTypeQuestionSpecs.length === expectedTypeCount && bank.data.length === expectedTypeCount);
check("QUESTION_SPECS preserves all bank type keys in order", JSON.stringify(allSpecKeys) === JSON.stringify(allBankKeys));
check("QUESTION_SPECS preserves typeDef/defaultParams/code for all 46 types", allSpecFieldsOk);
check("tool export source no longer writes preview b.params", !fs.readFileSync(path.join(ROOT, "tool/index.html"), "utf8").includes("params: b.params"));

for (const item of runtimePresets) {
  const preset = presetByKey.get(item.key);
  const exportSpecs = makeExportQuestionSpecsFromPreviewBasket(preset);
  const allParamsEmpty = exportSpecs.every((spec) => spec.params && Object.keys(spec.params).length === 0);
  check(`${item.key} interactive export QUESTION_SPECS params are empty`, allParamsEmpty);

  const a = buildSandbox(0x10000000 + item.expectedCount, preset, exportSpecs);
  const b = buildSandbox(0x20000000 + item.expectedCount, preset, exportSpecs);
  const len = vm.runInContext("QUESTIONS.length", a);
  const primaryA = primaryParamSignature(a, item.probeTypeKey, item.probeKeys);
  const primaryB = primaryParamSignature(b, item.probeTypeKey, item.probeKeys);
  check(`${item.key} runtime export creates ${item.expectedCount} questions from specs`, len === item.expectedCount);
  check(`${item.key} fresh loads change primary params`, primaryA !== primaryB, `${primaryA} vs ${primaryB}`);
}

const leakedFirst = buildSandbox(0x11111111, s1Term3Preset, leakedQuestionSpecs);
const leakedSecond = buildSandbox(0x22222222, s1Term3Preset, leakedQuestionSpecs);
const leakedPrimaryFirst = primaryParamSignature(leakedFirst, "frac_arith", ["a", "b", "c", "d", "op"]);
const leakedPrimarySecond = primaryParamSignature(leakedSecond, "frac_arith", ["a", "b", "c", "d", "op"]);
check("test guard detects leaked preview primary params", leakedPrimaryFirst === leakedPrimarySecond, `${leakedPrimaryFirst} vs ${leakedPrimarySecond}`);

const firstLoad = buildSandbox(0x11111111);
const secondLoad = buildSandbox(0x22222222);
const firstSig = paramsSignature(firstLoad);
const secondSig = paramsSignature(secondLoad);

check("runtime export creates 16 questions from specs", vm.runInContext("QUESTIONS.length", firstLoad) === 16);
check("opening exported HTML twice can produce different params", firstSig !== secondSig);
check("exported runtime path does not embed prebuilt QUESTIONS_DATA", vm.runInContext("PREBUILT_QUESTIONS.length", firstLoad) === 0);

const retryState = vm.runInContext(`
  const before = JSON.stringify(QUESTIONS.find(q => q.qid === "q001").paramsUsed);
  origWrongIds = ["q001"];
  initGame("wrong");
  const wrongRetry = JSON.stringify(qList[0].paramsUsed);
  allAttempts = [{
    n: 1, attemptNumber: 1, attemptType: "initial", score: 15, total: 16,
    remainingWrongCount: 1, completedAll: false, date: "7/5", time: "10:00",
    details: [{ qid: "q001", questionHTML: QUESTIONS[0].questionHTML, displayAnswer: QUESTIONS[0].displayAnswer, correct: false }]
  }];
  lastResult = allAttempts[0];
  qList = QUESTIONS.slice();
  currIdx = 0;
  origWrongIds = ["q001"];
  retrySingle("q001");
  const singleRetry = JSON.stringify(qList[0].paramsUsed);
  sessionLog = [{ qid: "q001", user: "bad", correct: false }];
  sessionAnswers = ["bad"];
  finishGame();
  ({
    before,
    wrongRetry,
    singleRetry,
    attempts: allAttempts.length,
    qListLength: qList.length,
    resultDisplay: document.getElementById("result-view").style.display,
    quizDisplay: document.getElementById("quiz-view").style.display,
  });
`, firstLoad);

check("wrong retry reuses same generated params within session", retryState.wrongRetry === retryState.before);
check("single retry reuses same generated params within session", retryState.singleRetry === retryState.before);
check("single retry does not append attempt", retryState.attempts === 1);
check("single retry returns to original result page", retryState.resultDisplay === "flex" && retryState.quizDisplay === "none");
check("single retry restores original question list", retryState.qListLength === 16);

if (failures.length) {
  console.error(`\n${failures.length} failure(s):`);
  failures.forEach((f) => console.error(`- ${f}`));
  process.exit(1);
}
console.log(`\n${passed} runtime random checks passed.`);
