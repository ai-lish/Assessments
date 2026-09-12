const assert = require("node:assert/strict");
const api = require("../adapters/ai-learning-s4ch1");
const { validateQuestion } = require("../schemas/question-schema");
const shared = require("../templates/quadratic-equations/shared");

let assertions = 0;

function rngFrom(seed) {
  let value = seed >>> 0;
  return function rng() {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function assertQuestion(question, label) {
  validateQuestion(question);
  assert.equal(question.course, "s4", `${label}: course`);
  assert.equal(question.chapter, "ch1", `${label}: chapter`);
  assert.equal(question.steps.length, question.checker.steps.length, `${label}: checker step count`);
  assert.ok(question.expression.length > 0, `${label}: expression`);
  assert.ok(question.answer.length > 0, `${label}: answer`);
  assert.ok(question.solution.length > 0, `${label}: solution`);
  assert.doesNotThrow(() => JSON.stringify(question), `${label}: serializable`);
  const examples = api.inputExamples(question);
  assert.ok(examples.length > 0, `${label}: input examples`);
  for (let step = 0; step < question.steps.length; step += 1) {
    const example = examples[Math.min(step, examples.length - 1)];
    assert.equal(api.checkQuestion(question, step, example).correct, true, `${label}: step ${step + 1} accepts canonical input (${example})`);
    assertions += 1;
  }
  const final = api.checkQuestion(question, question.steps.length - 1, examples[examples.length - 1]);
  assert.equal(final.correct, true, `${label}: canonical input accepted (${examples[examples.length - 1]})`);
  const wrong = api.checkQuestion(question, question.steps.length - 1, "not-a-mathematical-answer");
  assert.equal(wrong.correct, false, `${label}: invalid input rejected`);

  const { a, b, c, delta } = question.params;
  if (question.mode === "sqrt") {
    const root = Math.sqrt(question.params.k);
    assert.ok(Number.isFinite(root) && root > 0, `${label}: square-root answer follows params`);
    if (question.difficulty === "basic") assert.equal(root, Math.round(root), `${label}: basic square-root answer is integral`);
  } else if (question.mode === "factor") {
    assert.equal(question.params.A, question.params.a, `${label}: factor leading coefficient follows params`);
    assert.equal(question.params.B, question.params.a * question.params.d + question.params.b, `${label}: factor linear coefficient follows params`);
    assert.equal(question.params.C, question.params.b * question.params.d, `${label}: factor constant follows params`);
    const factor = `(${question.params.a}x${shared.signed(question.params.b)})(x${shared.signed(question.params.d)})=0`;
    assert.equal(api.checkQuestion(question, 0, factor).correct, true, `${label}: generated factorisation accepted`);
    const scaled = `(${question.params.a * 2}x${shared.signed(question.params.b * 2)})(x${shared.signed(question.params.d)})=0`;
    assert.equal(api.checkQuestion(question, 0, scaled).correct, false, `${label}: scalar-multiple factorisation rejected`);
  } else if (question.mode === "formula" || question.mode === "calculator") {
    assert.equal(delta, b * b - 4 * a * c, `${label}: discriminant follows params`);
    if (delta >= 0) {
      for (const root of [(-b + Math.sqrt(delta)) / (2 * a), (-b - Math.sqrt(delta)) / (2 * a)]) {
        assert.ok(Math.abs(a * root * root + b * root + c) < 1e-8, `${label}: real root satisfies equation`);
      }
    } else {
      const real = -b / (2 * a);
      const imaginary = Math.sqrt(-delta) / (2 * a);
      assert.ok(Math.abs(a * (real * real - imaginary * imaginary) + b * real + c) < 1e-8, `${label}: complex real part satisfies equation`);
      assert.ok(Math.abs(2 * a * real * imaginary + b * imaginary) < 1e-8, `${label}: complex imaginary part satisfies equation`);
    }
  }
}

for (const mode of api.modes) {
  for (const difficulty of ["basic", "advanced"]) {
    for (let seed = 1; seed <= 24; seed += 1) {
      const question = api.createQuestion({ mode, difficulty, rng: rngFrom(seed * 97 + mode.length) });
      assertQuestion(question, `${mode}/${difficulty}/${seed}`);
      assertions += 10;
    }
  }
}

for (let seed = 1; seed <= 40; seed += 1) {
  const question = api.createQuestion({ mode: "mixed", difficulty: seed % 2 ? "basic" : "advanced", rng: rngFrom(seed * 31) });
  assertQuestion(question, `mixed/${seed}`);
  assertions += 10;
}

const fixed = api.createQuestion({ mode: "sqrt", difficulty: "advanced", rng: rngFrom(42) });
assert.equal(api.checkQuestion(fixed, 0, "x" + (fixed.params.p < 0 ? fixed.params.p : "+" + fixed.params.p) + "=+-" + fixed.params.outside + "sqrt(" + fixed.params.inside + ")").correct, true);
assert.equal(api.checkQuestion(fixed, 0, "x=garbage").correct, false);
assertions += 2;

const basicSquareRoot = api.createQuestion({ mode: "sqrt", difficulty: "basic", rng: rngFrom(1) });
if (basicSquareRoot.params.inside === 1) assert.ok(!basicSquareRoot.answer.includes("\\sqrt{1}"), "basic perfect-square display is simplified");
assertions += 1;

const malformed = api.createQuestion({ mode: "expand", difficulty: "basic", rng: rngFrom(7) });
for (const [field, value] of [["title", 7], ["instruction", null], ["answer", {}], ["solution", [7]], ["metadata", null], ["difficulty", "expert"]]) {
  const copy = JSON.parse(JSON.stringify(malformed));
  copy[field] = value;
  assert.throws(() => validateQuestion(copy), `schema rejects malformed ${field}`);
  assertions += 1;
}
const nonSerializable = api.createQuestion({ mode: "expand", difficulty: "basic", rng: rngFrom(8) });
nonSerializable.params.bad = () => 1;
assert.throws(() => validateQuestion(nonSerializable), "schema rejects function-valued parameters");
assertions += 1;

console.log(`S4 quadratic template tests passed (${assertions} assertions).`);
