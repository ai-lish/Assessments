#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const bank = JSON.parse(fs.readFileSync(path.join(ROOT, "question-bank.json"), "utf8"));
const template = fs.readFileSync(path.join(ROOT, "templates/student.html"), "utf8");
const generators = require(path.join(ROOT, "tool/generators.js"));
const validatorsScript = fs.readFileSync(path.join(ROOT, "tool/validators.js"), "utf8");
const generatorsScript = generators.toStandaloneScript();
const pdfScript = fs.readFileSync(path.join(ROOT, "tool/pdf.js"), "utf8");

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
function section(title) {
  console.log(`\n=== ${title} ===`);
}

const preset = bank.presets.find((p) => p.key === "s1_term3_part_a");
const expectedOrder = [
  "frac_arith", "neg_power", "prime_factor", "hcf_or_lcm",
  "exp_law", "alg_simplify", "solve_eq", "word_to_alg",
  "sig_fig", "frac_to_pct", "poly_desc", "formula_sub",
  "congruence", "coordinate", "seq_nth", "data_type",
];

function typeDef(key) {
  const found = bank.data.find((item) => item.key === key);
  if (!found) throw new Error(`missing type ${key}`);
  return found;
}

const fixedParams = {
  frac_arith: { factor: 2, bottom: -3, a: 5, b: 11, c: 4, d: 1 },
  neg_power: { base: 3, exp: 3 },
  prime_factor: { n: 60 },
  hcf_or_lcm: { n1: 12, n2: 18, askLCM: false },
  exp_law: { a: 2, b: 5 },
  alg_simplify: { a: -3, b: -4, c: 5, d: -2 },
  solve_eq: { coeff: 4, xVal: -3 },
  word_to_alg: { t: 3, a: 4, b: 5 },
  sig_fig: { baseNum: 184.62, sf: 3 },
  frac_to_pct: { item: { tex: "\\frac{3}{4}", ans: "75" } },
  poly_desc: { a: 2, b: 3, c: -5 },
  formula_sub: { a: 2, b: 3, c: -1 },
  congruence: { reason: "S.A.S.", t1: ["A", "B", "C"], t2: ["D", "E", "F"] },
  coordinate: { rx: -2, ry: 1, askAxis: "x" },
  seq_nth: { nth: 4, multiplier: 3, constant: -2 },
  data_type: {
    item: {
      q: "「一班學生的身高」",
      ans: "連續數據",
      steps: "身高的數值可以在一個實數範圍內任意取值，因此屬於<b>連續數據</b>。",
    },
  },
};

function callGenerate(def, params) {
  return generators.generateQuestion(def, params);
}

function assembleQuestions() {
  return expectedOrder.map((key, idx) => {
    const def = typeDef(key);
    const res = callGenerate(def, fixedParams[key]);
    const q = {
      qid: `q${String(idx + 1).padStart(3, "0")}`,
      typeKey: def.key,
      type: def.type,
      checkType: def.checkType,
      validator: def.validator || def.checkType,
      questionHTML: res.questionHTML,
      correctAnswer: res.correctAnswer,
      paramsUsed: res.paramsUsed,
      solutionHTML: res.solutionHTML || "",
      pdfText: res.pdfText || "",
      displayAnswer: res.displayAnswer || res.correctAnswer,
      steps: res.steps || "",
    };
    if (def.type === "choice") q.options = def.options || res.options || [];
    if (def.type === "coordinate") q.interaction = res.interaction;
    if (def.type === "congruence") q.imageSvg = res.imageSvg;
    if (def.prefix) q.prefix = def.prefix;
    if (def.suffix) q.suffix = def.suffix;
    if (def.checkType === "primeFactor" && res.primeFactors) q.primeFactors = res.primeFactors;
    if (def.checkType === "algebraQ8") {
      q.answers = res.answers;
      q.q8subtype = res.q8subtype;
    }
    if (def.checkType === "congruenceReason" && res.answers) q.answers = res.answers;
    return q;
  });
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
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    setAttribute(name, value) {
      this[name] = value;
    },
    addEventListener() {},
    click() {
      if (typeof this.onclick === "function") this.onclick();
    },
  };
}

function buildSandbox(questions) {
  const elements = new Map();
  const listeners = {};
  const storage = new Map();
  const fetchCalls = [];
  const printTargets = [];
  const ids = [
    "quiz-view", "result-view", "p-text", "q-text", "q-feedback", "btn-check",
    "btn-next", "btn-teach", "solution-box", "input-val", "prefix", "suffix",
    "q-hint", "q-options", "q-coord-hint", "input-row", "q-image", "toast",
    "final-score", "btn-retry-wrong", "history-body", "detail-modal",
    "modal-title", "modal-body-content", "btn-export", "score-mini", "q-code",
    "keypad-area",
  ];
  for (const id of ids) elements.set(id, makeElement(id));
  elements.get("quiz-view").style.display = "flex";
  elements.get("result-view").style.display = "none";
  elements.get("btn-check").style.display = "block";
  elements.get("btn-next").style.display = "none";
  elements.get("btn-export").innerText = "匯出";

  const document = {
    body: makeElement("body"),
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
      printCalled: false,
      print() { this.printCalled = true; },
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
    sessionStorage: {
      getItem(key) { return storage.has(key) ? storage.get(key) : null; },
      setItem(key, value) { storage.set(key, String(value)); },
      removeItem(key) { storage.delete(key); },
    },
    URL: {
      createObjectURL: () => "blob:baseline",
      revokeObjectURL: () => {},
    },
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
    setTimeout: (fn) => { if (typeof fn === "function") fn(); return 1; },
    clearTimeout: () => {},
    prompt: () => "s20271001m",
    fetch: (url, options) => {
      fetchCalls.push({ url, options });
      return Promise.resolve({ ok: true });
    },
    __elements: elements,
    __listeners: listeners,
    __fetchCalls: fetchCalls,
    __printTargets: printTargets,
  };
  sandbox.window.document = document;
  sandbox.window.sessionStorage = sandbox.sessionStorage;
  sandbox.window.URL = sandbox.URL;
  sandbox.window.Blob = sandbox.Blob;

  const html = template
    .replace(/\{\{TITLE_HTML\}\}/g, preset.name)
    .replace(/\{\{TITLE\}\}/g, JSON.stringify(preset.name))
    .replace(/\{\{QUESTIONS_DATA\}\}/g, JSON.stringify(questions))
    .replace(/\{\{QUESTION_SPECS\}\}/g, JSON.stringify([]))
    .replace(/\{\{GENERATED_AT\}\}/g, JSON.stringify("2026-07-03T00:00:00.000Z"))
    .replace(/\{\{BANK_HASH\}\}/g, JSON.stringify("baseline_hash"))
    .replace(/\{\{PRESET_KEY\}\}/g, JSON.stringify("s1_term3_part_a"))
    .replace(/\{\{GRADE\}\}/g, JSON.stringify("s1"))
    .replace(/\{\{GAS_URL\}\}/g, JSON.stringify("https://example.invalid/sheets"))
    .replace(/\{\{VALIDATORS_SCRIPT\}\}/g, validatorsScript)
    .replace(/\{\{GENERATORS_SCRIPT\}\}/g, generatorsScript)
    .replace(/\{\{PDF_SCRIPT\}\}/g, pdfScript)
    .replace(/\{\{RUNTIME_SEED\}\}/g, JSON.stringify(null))
    .replace(/\{\{TEACHER_PIN_HASH\}\}/g, JSON.stringify(""));
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const runnableScripts = scripts.filter((script) => !script.includes("window.MathJax ="));
  if (!runnableScripts.some((script) => script.includes("function checkAnswer"))) {
    throw new Error("student main script not found");
  }

  vm.createContext(sandbox);
  runnableScripts.forEach((script, index) => {
    vm.runInContext(script, sandbox, { filename: `templates/student.html#script${index}` });
  });
  return sandbox;
}

const questions = assembleQuestions();

section("1. s1_term3_part_a preset order and type baseline");
check("preset exists", Boolean(preset));
check("16題順序固定", JSON.stringify(preset.questions.map((q) => q.typeKey)) === JSON.stringify(expectedOrder));
check("generated 16 Question records", questions.length === 16);
check("text題數 = 13", questions.filter((q) => q.type === "text").length === 13);
check("choice題數 = 1", questions.filter((q) => q.type === "choice").length === 1);
check("coordinate題數 = 1", questions.filter((q) => q.type === "coordinate").length === 1);
check("congruence題數 = 1", questions.filter((q) => q.type === "congruence").length === 1);

const sandbox = buildSandbox(questions);
function evalInStudent(code) {
  return vm.runInContext(code, sandbox);
}
function checkStudentAnswer(typeKey, userInput) {
  sandbox.__q = questions.find((q) => q.typeKey === typeKey);
  sandbox.__input = userInput;
  return vm.runInContext("checkAnswer(__q, __input)", sandbox);
}

section("2. checkType special marking baseline");
check("textExact accepts exact generated answer", checkStudentAnswer("frac_arith", questions[0].correctAnswer));
check("numeric accepts tolerance", checkStudentAnswer("neg_power", String(Number(questions[1].correctAnswer) + 0.005)));
check("primeFactor accepts index form", checkStudentAnswer("prime_factor", questions[2].correctAnswer));
check("primeFactor rejects expanded repeated base", !checkStudentAnswer("prime_factor", "2x2x3x5"));
check("hcfLcm accepts generated numeric answer", checkStudentAnswer("hcf_or_lcm", questions[3].correctAnswer));
check("algebraQ8 accepts equivalent commuted product", checkStudentAnswer("word_to_alg", "(x+4)5"));
check("fracPct accepts answer with percent sign", checkStudentAnswer("frac_to_pct", `${questions[9].correctAnswer}%`));
check("congruenceReason accepts lowercase dotted reason", checkStudentAnswer("congruence", "s.a.s."));
check("congruenceReason accepts dot-stripped reason (PR-A2 authorized)", checkStudentAnswer("congruence", "SAS"));
check("coordinatePoint text check remains single axis value", checkStudentAnswer("coordinate", questions[13].correctAnswer));
check("choiceKey accepts generated option key", checkStudentAnswer("data_type", questions[15].correctAnswer));

section("3. retry and attempt baseline");
const wrongRetryState = evalInStudent(`
  origWrongIds = ["q003", "q014"];
  initGame("wrong");
  ({
    attemptType: currentAttemptType,
    qids: qList.map(q => q.qid),
    origWrongIds: origWrongIds.slice(),
    currIdx,
    isSingleRetry
  });
`);
check("wrong_retry uses only previous wrong qids", JSON.stringify(wrongRetryState.qids) === JSON.stringify(["q003", "q014"]));
check("wrong_retry attemptType set", wrongRetryState.attemptType === "wrong_retry");
check("wrong_retry resets current origWrongIds for this round", wrongRetryState.origWrongIds.length === 0);

const singleRetryState = evalInStudent(`
  allAttempts = [{
    n: 1, attemptNumber: 1, attemptType: "initial", score: 15, total: 16,
    remainingWrongCount: 1, completedAll: false, date: "7/3", time: "12:00",
    details: []
  }];
  lastResult = allAttempts[0];
  qList = QUESTIONS.slice();
  currIdx = 0;
  origWrongIds = ["q001"];
  currentAttemptType = "initial";
  retrySingle("q001");
  sessionLog = [{ qid: "q001", user: "bad", correct: false }];
  sessionAnswers = ["bad"];
  finishGame();
  ({
    attempts: allAttempts.length,
    qids: qList.map(q => q.qid),
    currIdx,
    origWrongIds: origWrongIds.slice(),
    attemptType: currentAttemptType,
    isSingleRetry
  });
`);
check("single retry does not append allAttempts", singleRetryState.attempts === 1);
check("single retry restores original qList", singleRetryState.qids.length === 16);
check("single retry restores wrong ids", JSON.stringify(singleRetryState.origWrongIds) === JSON.stringify(["q001"]));
check("single retry clears single retry flag", singleRetryState.isSingleRetry === false);

const appendOnlyState = evalInStudent(`
  allAttempts = [];
  lastResult = null;
  qList = QUESTIONS.slice();
  currentAttemptType = "initial";
  sessionLog = qList.map((q, i) => ({ qid: q.qid, user: i < 5 ? String(q.correctAnswer || q.displayAnswer || "ok") : "wrong", correct: i < 5 }));
  sessionAnswers = sessionLog.map(s => s.user);
  finishGame();
  const wrongIds = allAttempts[0].details.filter(d => !d.correct).map(d => d.qid);
  qList = QUESTIONS.filter(q => wrongIds.includes(q.qid));
  currentAttemptType = "wrong_retry";
  sessionLog = qList.map(q => ({ qid: q.qid, user: String(q.correctAnswer || q.displayAnswer || "ok"), correct: true }));
  sessionAnswers = sessionLog.map(s => s.user);
  finishGame();
  qList = QUESTIONS.slice();
  currentAttemptType = "initial";
  sessionLog = qList.map(q => ({ qid: q.qid, user: String(q.correctAnswer || q.displayAnswer || "ok"), correct: true }));
  sessionAnswers = sessionLog.map(s => s.user);
  finishGame();
  document.getElementById("history-body").children = [];
  renderHistory();
  ({
    len: allAttempts.length,
    numbers: allAttempts.map(a => a.attemptNumber),
    types: allAttempts.map(a => a.attemptType),
    table: Array.from(document.getElementById("history-body").children).map(tr => tr.innerHTML)
  });
`);
check("attempt logs append-only full→wrong_retry→full", appendOnlyState.len === 3);
check("attemptNumber stays monotonic 1/2/3", JSON.stringify(appendOnlyState.numbers) === JSON.stringify([1, 2, 3]));
check("attempt types stay initial/wrong_retry/initial", JSON.stringify(appendOnlyState.types) === JSON.stringify(["initial", "wrong_retry", "initial"]));
check("history table displays all three stable records", appendOnlyState.table.length === 3 && appendOnlyState.table[0].includes("<td>1</td>") && appendOnlyState.table[2].includes("<td>3</td>"));

section("4. Google Sheets payload baseline");
evalInStudent(`
  allAttempts = [
    { attemptNumber: 1, attemptType: "initial", score: 10, total: 16, remainingWrongCount: 6, completedAll: false, date: "7/3", time: "12:00", details: [] },
    { attemptNumber: 2, attemptType: "wrong_retry", score: 6, total: 6, remainingWrongCount: 0, completedAll: true, date: "7/3", time: "12:10", details: [] }
  ];
  submitToSheets("20255001F");
`);
const payload = JSON.parse(sandbox.__fetchCalls[0].options.body);
const payloadKeys = Object.keys(payload.rows[0]).sort();
check("Google Sheets fetch uses no-cors", sandbox.__fetchCalls[0].options.mode === "no-cors");
check("Google Sheets payload has 2 rows", payload.rows.length === 2);
check(
  "Google Sheets payload fields locked",
  JSON.stringify(payloadKeys) === JSON.stringify([
    "attemptNumber", "attemptType", "completedAll", "date", "remainingWrongCount",
    "grade", "score", "studentId", "time", "toolId", "total",
  ].sort()),
);
check("Google Sheets attempt types stay initial/wrong_retry", payload.rows.map((r) => r.attemptType).join(",") === "initial,wrong_retry");
check("toolId compatibility stays assess-s1_term3_part_a", payload.rows.every((r) => r.toolId === "assess-s1_term3_part_a"));
check("Google Sheets payload grade stays s1", payload.rows.every((r) => r.grade === "s1"));
check("Google Sheets payload studentId uses new format", payload.rows.every((r) => r.studentId === "20255001F"));

section("5. answer controls collapse and restore");
const collapseState = evalInStudent(`
  qList = QUESTIONS.slice(0, 2);
  currIdx = 0;
  showQ();
  currInput = String(qList[0].correctAnswer || qList[0].displayAnswer || "1");
  checkAns();
  const afterCheck = {
    keypad: document.getElementById("keypad-area").style.display,
    keypadHidden: document.getElementById("keypad-area").classList.contains("keypad-input-hidden"),
    input: document.getElementById("input-row").style.display,
    inputVisibility: document.getElementById("input-row").style.visibility,
    next: document.getElementById("btn-next").style.display
  };
  nextQ();
  const afterNext = {
    keypad: document.getElementById("keypad-area").style.display,
    keypadHidden: document.getElementById("keypad-area").classList.contains("keypad-input-hidden"),
    input: document.getElementById("input-row").style.display,
    inputVisibility: document.getElementById("input-row").style.visibility,
    inputText: document.getElementById("input-val").textContent
  };
  const choiceQ = QUESTIONS.find(q => q.type === "choice");
  qList = [choiceQ];
  currIdx = 0;
  showQ();
  currSelectedChoice = choiceQ.correctAnswer;
  checkAns();
  const choiceOptions = {
    display: document.getElementById("q-options").style.display,
    visibility: document.getElementById("q-options").style.visibility
  };
  ({ afterCheck, afterNext, choiceOptions });
`);
check("checkAns visually hides keypad while preserving its layout slot", collapseState.afterCheck.keypad === "block" && collapseState.afterCheck.keypadHidden);
check("checkAns visually hides text input while preserving its layout slot", collapseState.afterCheck.input === "flex" && collapseState.afterCheck.inputVisibility === "hidden");
check("checkAns shows next button after answer", collapseState.afterCheck.next === "block");
check("nextQ restores keypad", collapseState.afterNext.keypad === "block" && !collapseState.afterNext.keypadHidden && collapseState.afterNext.inputVisibility === "visible");
check("nextQ clears input display", collapseState.afterNext.inputText === "");
check("choice answer visually hides options while preserving their layout slot", collapseState.choiceOptions.display === "flex" && collapseState.choiceOptions.visibility === "hidden");

section("6. print and virtual keypad baseline");
evalInStudent("printPDF();");
const printedHtml = sandbox.__printTargets[0] && sandbox.__printTargets[0].document.html;
check("printPDF opens shared PDF print view", sandbox.__printTargets.length === 1);
check("printPDF renders student and teacher sections", /data-mode=\"student\"/.test(printedHtml || "") && /data-mode=\"teacher\"/.test(printedHtml || ""));
check("printPDF uses shared snapshot id", /data-snapshot-id=\"pdf-[0-9a-f]+\"/.test(printedHtml || ""));
evalInStudent("printPDF();");
const firstSnapshotId = (sandbox.__printTargets[0].document.html.match(/data-snapshot-id=\"([^\"]+)\"/) || [])[1];
const secondSnapshotId = (sandbox.__printTargets[1].document.html.match(/data-snapshot-id=\"([^\"]+)\"/) || [])[1];
check("two PDF clicks create different snapshot ids", firstSnapshotId && secondSnapshotId && firstSnapshotId !== secondSnapshotId);
check("each PDF document keeps student/teacher on same snapshot", (sandbox.__printTargets[1].document.html.match(new RegExp(secondSnapshotId, "g")) || []).length >= 2);
evalInStudent("answered = false; currInput = ''; kp('1'); kp('×'); kp('x'); del();");
check("virtual keypad writes display text", sandbox.__elements.get("input-val").textContent === "1×");
evalInStudent("clearInput();");
check("virtual keypad clearInput clears display", sandbox.__elements.get("input-val").textContent === "");
const keydownListeners = sandbox.__listeners.keydown || [];
check("keyboard listener registered", keydownListeners.length === 1);

console.log("\n" + "=".repeat(60));
if (failures.length > 0) {
  console.log(`❌ ${failures.length} baseline failure(s):`);
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exit(1);
}
console.log(`✅ s1_term3 baseline passed (${passed} checks)`);
