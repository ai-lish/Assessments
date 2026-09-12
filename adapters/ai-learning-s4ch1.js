const { validateQuestion } = require("../schemas/question-schema");
const catalog = require("../questions/s4/ch1");
const expand = require("../templates/quadratic-equations/expand");
const squareRoot = require("../templates/quadratic-equations/square-root");
const factorisation = require("../templates/quadratic-equations/factorisation");
const quadraticFormula = require("../templates/quadratic-equations/quadratic-formula");
const calculator = require("../templates/quadratic-equations/calculator");
const shared = require("../templates/quadratic-equations/shared");

const TEMPLATES = {
  expand,
  sqrt: squareRoot,
  factor: factorisation,
  formula: quadraticFormula,
  calculator
};

function defaultRng() {
  return Math.random();
}

function createQuestion(options = {}) {
  const rng = typeof options.rng === "function" ? options.rng : defaultRng;
  let mode = options.mode || "expand";
  if (mode === "mixed") mode = catalog.modes[shared.randInt(rng, 0, catalog.modes.length - 1)];
  if (!TEMPLATES[mode]) throw new Error("unknown S4 Ch1 mode: " + mode);
  const difficulty = options.difficulty === "advanced" ? "advanced" : "basic";
  let question;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    question = TEMPLATES[mode].create({ difficulty, rng, content: catalog.content[mode] });
    if (question.id !== options.excludeId || attempt === 9) break;
  }
  question.mode = mode;
  question.difficulty = difficulty;
  return validateQuestion(question);
}

function checkQuestion(question, stepIndex, input) {
  if (!question || !question.checker || !Array.isArray(question.checker.steps)) return { correct: false, reason: "題目資料不完整。" };
  const spec = question.checker.steps[stepIndex];
  if (!spec) return { correct: false, reason: "沒有這個作答步驟。" };
  return shared.checkSpec(spec, input);
}

function stripLatex(value) {
  return String(value || "")
    .replace(/^\\\(|\\\)$/g, "")
    .replace(/\\text\{ 或 \}/g, " or ")
    .replace(/\\approx/g, "")
    .replace(/\\pm/g, "+-")
    .replace(/\\,|\\ /g, " ")
    .replace(/\\sqrt\{(\d+)\}/g, "sqrt($1)")
    .replace(/\\frac\{(-?\d+)\}\{(\d+)\}/g, "($1)/$2")
    .replace(/[{}]/g, "")
    .replace(/^x=/, "")
    .trim();
}

function inputExamples(question) {
  const params = question.params;
  if (question.mode === "expand") return [shared.polyLatex(params.a, params.b, params.c) + "=0"];
  if (question.mode === "sqrt") {
    const root = params.outside + "sqrt(" + params.inside + ")";
    const left = "x" + (params.p === 0 ? "" : shared.signed(params.p));
    const second = params.outside === 1 ? "sqrt(" + params.inside + ")" : root;
    return [left + "=+-" + second, "x=" + (-params.p) + "+" + root + " 或 " + (-params.p) + "-" + root];
  }
  if (question.mode === "factor") {
    const root = shared.reduce(-params.b, params.a);
    const first = root.d === 1 ? String(root.n) : root.n + "/" + root.d;
    return ["(" + (params.a === 1 ? "x" : params.a + "x") + shared.signed(params.b) + ")(x" + shared.signed(params.d) + ")=0", first + " 或 " + (-params.d)];
  }
  if (question.mode === "formula") {
    const formulaStep = question.checker.steps[1];
    const final = formulaStep.exact
      ? shared.exactRootInputs(params.a, params.b, params.c)[0] + " 或 " + shared.exactRootInputs(params.a, params.b, params.c)[1]
      : formulaStep.expected.map((value) => Number(value.real.toPrecision(3))).join(" 或 ");
    return [String(params.delta), final];
  }
  if (question.mode === "calculator") {
    const calculatorStep = question.checker.steps[1];
    const final = calculatorStep.kind === "no-real"
      ? "無實根"
      : calculatorStep.expected.map((value) => Number(value.real.toPrecision(3))).join(" 或 ");
    return [String(params.delta), final];
  }
  return [stripLatex(question.answer)];
}

function publicCatalog() {
  return {
    id: catalog.id,
    course: catalog.course,
    chapter: catalog.chapter,
    title: catalog.title,
    modes: catalog.modes.map((mode) => ({
      mode,
      templateId: catalog.content[mode].templateId,
      title: catalog.content[mode].title,
      topicLabel: catalog.content[mode].topicLabel,
      challengeEligible: catalog.content[mode].challengeEligible,
      worksheetEligible: catalog.content[mode].worksheetEligible
    }))
  };
}

module.exports = {
  version: 1,
  catalog: publicCatalog(),
  modes: catalog.modes.slice(),
  createQuestion,
  checkQuestion,
  inputExamples,
  stripLatex
};
