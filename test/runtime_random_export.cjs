#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const bank = JSON.parse(fs.readFileSync(path.join(ROOT, "question-bank.json"), "utf8"));
const template = fs.readFileSync(path.join(ROOT, "templates/student.html"), "utf8");
const validators = require(path.join(ROOT, "tool/validators.js"));
const generators = require(path.join(ROOT, "tool/generators.js"));
const pdfScript = fs.readFileSync(path.join(ROOT, "tool/pdf.js"), "utf8");

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
  { key: "s2_term3_part_a", expectedCount: 16, probeTypeKey: "alg_simplify_2var", probeKeys: ["a1", "b1", "a2", "b2", "op"] },
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
    .replace(/\{\{TITLE_HTML\}\}/g, preset.name)
    .replace(/\{\{TITLE\}\}/g, JSON.stringify(preset.name))
    .replace(/\{\{QUESTIONS_DATA\}\}/g, JSON.stringify([]))
    .replace(/\{\{QUESTION_SPECS\}\}/g, JSON.stringify(specs))
    .replace(/\{\{GENERATED_AT\}\}/g, JSON.stringify("2026-07-05T00:00:00.000Z"))
    .replace(/\{\{BANK_HASH\}\}/g, JSON.stringify("runtime_random_test"))
    .replace(/\{\{PRESET_KEY\}\}/g, JSON.stringify("s1_term3_part_a"))
    .replace(/\{\{GRADE\}\}/g, JSON.stringify("s1"))
    .replace(/\{\{GAS_URL\}\}/g, JSON.stringify(""))
    .replace(/\{\{VALIDATORS_SCRIPT\}\}/g, validators.toStandaloneScript())
    .replace(/\{\{GENERATORS_SCRIPT\}\}/g, generators.toStandaloneScript())
    .replace(/\{\{PDF_SCRIPT\}\}/g, pdfScript)
    .replace(/\{\{RUNTIME_SEED\}\}/g, JSON.stringify(null));
}

function buildSandbox(seed, preset = s1Term3Preset, specs = questionSpecs) {
  const elements = new Map();
  const listeners = {};
  const storage = new Map();
  const printTargets = [];
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
    window: {
      MathJax: null,
      print() {},
      open() {
        const target = {
          document: {
            html: "",
            open() { this.html = ""; },
            write(chunk) { this.html += String(chunk); },
            close() {},
          },
        };
        printTargets.push(target);
        return target;
      },
    },
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
    __printTargets: printTargets,
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

function primarySignaturesForSeeds(item, preset, specs, seeds) {
  return seeds.map((seed) => primaryParamSignature(
    buildSandbox(seed, preset, specs),
    item.probeTypeKey,
    item.probeKeys,
  ));
}

function hasAtLeastTwoDistinct(values) {
  return new Set(values).size >= 2;
}

console.log("\n=== runtime random export semantics ===");
const expectedTypeCount = bank.data.length;
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
check(`QUESTION_SPECS can cover all ${expectedTypeCount} typeDefs`, allTypeQuestionSpecs.length === expectedTypeCount && bank.data.length === expectedTypeCount);
check("QUESTION_SPECS preserves all bank type keys in order", JSON.stringify(allSpecKeys) === JSON.stringify(allBankKeys));
check(`QUESTION_SPECS preserves typeDef/defaultParams/code for all ${expectedTypeCount} types`, allSpecFieldsOk);
check("tool export source no longer writes preview b.params", !fs.readFileSync(path.join(ROOT, "tool/index.html"), "utf8").includes("params: b.params"));

for (const item of runtimePresets) {
  const preset = presetByKey.get(item.key);
  const exportSpecs = makeExportQuestionSpecsFromPreviewBasket(preset);
  const allParamsEmpty = exportSpecs.every((spec) => spec.params && Object.keys(spec.params).length === 0);
  check(`${item.key} interactive export QUESTION_SPECS params are empty`, allParamsEmpty);

  const a = buildSandbox(0x10000000 + item.expectedCount, preset, exportSpecs);
  const len = vm.runInContext("QUESTIONS.length", a);
  const primarySignatures = primarySignaturesForSeeds(item, preset, exportSpecs, [
    0x10000000 + item.expectedCount,
    0x20000000 + item.expectedCount,
    0x30000000 + item.expectedCount,
    0x40000000 + item.expectedCount,
    0x50000000 + item.expectedCount,
  ]);
  check(`${item.key} runtime export creates ${item.expectedCount} questions from specs`, len === item.expectedCount);
  check(`${item.key} fresh loads can change primary params`, hasAtLeastTwoDistinct(primarySignatures),
    primarySignatures.join(" | "));
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

const pdfClickState = vm.runInContext(`
  const captured = [];
  const originalPrintSnapshot = AssessPDF.printSnapshot;
  AssessPDF.printSnapshot = function(snapshot, options) {
    captured.push(snapshot);
    return { snapshot, html: AssessPDF.renderPrintDocument(snapshot, options || {}), target: null };
  };
  printPDF();
  printPDF();
  AssessPDF.printSnapshot = originalPrintSnapshot;
  ({
    count: captured.length,
    id1: captured[0].snapshotId,
    id2: captured[1].snapshotId,
    sig1: JSON.stringify(captured[0].questions.map(q => ({ qid: q.qid, typeKey: q.typeKey, paramsUsed: q.paramsUsed }))),
    sig2: JSON.stringify(captured[1].questions.map(q => ({ qid: q.qid, typeKey: q.typeKey, paramsUsed: q.paramsUsed }))),
    qCount1: captured[0].questions.length,
    qCount2: captured[1].questions.length
  });
`, firstLoad);
check("two PDF clicks create two snapshots from QUESTION_SPECS", pdfClickState.count === 2 && pdfClickState.qCount1 === 16 && pdfClickState.qCount2 === 16);
check("two PDF clicks produce different snapshot params", pdfClickState.sig1 !== pdfClickState.sig2, `${pdfClickState.sig1} vs ${pdfClickState.sig2}`);
check("two PDF clicks produce different snapshot ids", pdfClickState.id1 !== pdfClickState.id2);

const similarPdfState = vm.runInContext(`
  const similarCaptured = [];
  const originalSimilarPrint = AssessPDF.printSnapshot;
  AssessPDF.printSnapshot = function(snapshot, options) {
    similarCaptured.push({ snapshot, options });
    return { snapshot, html: AssessPDF.renderPrintDocument(snapshot, options || {}), target: null };
  };
  currIdx = 0;
  answered = false;
  const currentFirst = JSON.stringify(qList[currIdx].paramsUsed);
  printSimilarPDF();
  currInput = String(qList[currIdx].correctAnswer);
  checkAns();
  const correctFeedback = document.getElementById("q-feedback").className;
  printSimilarPDF();
  showQ();
  currInput = "__definitely_wrong__";
  checkAns();
  const wrongFeedback = document.getElementById("q-feedback").className;
  printSimilarPDF();
  currIdx = 1;
  showQ();
  const switchedType = qList[currIdx].typeKey;
  printSimilarPDF();
  AssessPDF.printSnapshot = originalSimilarPrint;
  ({
    count: similarCaptured.length,
    unansweredCount: similarCaptured[0].snapshot.questions.length,
    correctCount: similarCaptured[1].snapshot.questions.length,
    wrongCount: similarCaptured[2].snapshot.questions.length,
    correctFeedback,
    wrongFeedback,
    firstType: similarCaptured[0].snapshot.sourceTypeKey,
    switchedType,
    switchedPdfType: similarCaptured[3].snapshot.sourceTypeKey,
    firstSignatures: similarCaptured[0].snapshot.questions.map(q => JSON.stringify(q.paramsUsed)),
    currentFirst,
    allSimilarScope: similarCaptured.every(item => item.options.scope === "similar")
  });
`, firstLoad);
check("similar PDF works before answering", similarPdfState.count === 4 && similarPdfState.unansweredCount === 5);
check("similar PDF remains available after correct answer", similarPdfState.correctCount === 5 && /correct/.test(similarPdfState.correctFeedback));
check("similar PDF remains available after wrong answer", similarPdfState.wrongCount === 5 && /incorrect/.test(similarPdfState.wrongFeedback));
check("similar PDF follows current type after switching question", similarPdfState.switchedPdfType === similarPdfState.switchedType && similarPdfState.switchedPdfType !== similarPdfState.firstType);
check("similar PDF variants are mutually unique", new Set(similarPdfState.firstSignatures).size === similarPdfState.unansweredCount);
check("similar PDF excludes current instance", !similarPdfState.firstSignatures.includes(similarPdfState.currentFirst));
check("student caller uses shared similar PDF scope", similarPdfState.allSimilarScope);

const s1Term2Preset = presetByKey.get("s1_term2_part_a");
const s1Term2Specs = buildInteractiveQuestionSpecs(s1Term2Preset);
const zeroVariantLoad = buildSandbox(0x51515151, s1Term2Preset, s1Term2Specs);
const zeroVariantState = vm.runInContext(`
  const fixedIndex = qList.findIndex(q => q.typeKey === "s1t2_solve_eq_fraction");
  currIdx = fixedIndex;
  showQ();
  const button = document.getElementById("btn-similar-pdf");
  const hint = document.getElementById("similar-pdf-hint");
  let printCalls = 0;
  const originalZeroPrint = AssessPDF.printSnapshot;
  AssessPDF.printSnapshot = function() { printCalls += 1; };
  printSimilarPDF();
  AssessPDF.printSnapshot = originalZeroPrint;
  ({
    fixedIndex,
    disabled: button.disabled,
    title: button.title,
    hintText: hint.textContent,
    hintDisplay: hint.style.display,
    printCalls,
    toast: document.getElementById("toast").innerText
  });
`, zeroVariantLoad);
check("zero-variant type disables similar PDF button", zeroVariantState.fixedIndex >= 0 && zeroVariantState.disabled);
check("zero-variant type shows the required hint", zeroVariantState.title === "本題型暫無其他變式" && zeroVariantState.hintText === "本題型暫無其他變式" && zeroVariantState.hintDisplay === "inline");
check("zero-variant type never prints an empty document", zeroVariantState.printCalls === 0 && /本題型暫無其他變式/.test(zeroVariantState.toast));

check("in-progress toolbar whole-PDF button removed", !/<div class="toolbar"[\s\S]*?onclick="printPDF\(\)"/.test(template));
check("in-progress local export button removed", !/<button[^>]+onclick="exportStudentAnswers\(\)"/.test(template));
check("legacy Sheets-export button label absent", !/匯出記錄至(?: Google )?Sheets/.test(template));
check("completed result keeps sole teacher-submit button", /id="btn-export"[^>]+onclick="handleExport\(\)"[^>]*>📤 提交答案至老師/.test(template));
check("result page keeps whole-paper PDF button", /id="btn-result-pdf"[^>]+onclick="printPDF\(\)"/.test(template));
check("whole-paper PDF function remains available", /function printPDF\(\)/.test(template));

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
