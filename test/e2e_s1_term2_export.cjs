#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const bank = require("../question-bank.json");
const generators = require("../tool/generators.js");
const validators = require("../tool/validators.js");

const ROOT = path.resolve(__dirname, "..");
const tmpl = fs.readFileSync(path.join(ROOT, "templates/student.html"), "utf8");
const pdfScript = fs.readFileSync(path.join(ROOT, "tool/pdf.js"), "utf8");
const preset = bank.presets.find((p) => p.key === "s1_term2_part_a");
if (!preset) throw new Error("s1_term2_part_a preset missing");

const params = {
  s1t2_prime_factor: { n: 72 },
  s1t2_hcf: { n1: 24, n2: 36, askLCM: false },
  directed_add: { a: -7, b: 2 },
  directed_mul: { a: -3, b: 6 },
  s1t2_word_to_alg: { t: 3, a: 4, b: 5 },
  s1t2_solve_eq_fraction: { coeff: 4, rVal: 6 },
  s1t2_solve_eq_negative: { coeff: 5, xVal: -3 },
  cuboid_volume: { l: 3, w: 4, h: 5 },
  s1t2_poly_desc: { b: 3, c: 4 },
  poly_constant: { a: 2, b: 5, c: -8 },
  s1t2_alg_simplify: { a: -5, b: -7, c: 2, d: -3 },
  expand_bracket: { k: -3, a: 2, b: -4 },
  s1t2_coordinate: { rx: -2, ry: 1, askAxis: "x" },
  quadrant: { x: -2, y: 3 },
};

function assemble(typeDef, result, index) {
  const q = {
    qid: `q${String(index + 1).padStart(3, "0")}`,
    typeKey: typeDef.key,
    type: typeDef.type,
    checkType: typeDef.checkType,
    validator: typeDef.validator || typeDef.checkType,
    questionHTML: result.questionHTML,
    correctAnswer: result.correctAnswer,
    paramsUsed: result.paramsUsed || {},
    solutionHTML: result.solutionHTML || "",
    pdfText: result.pdfText || "",
    displayAnswer: result.displayAnswer || result.correctAnswer,
    steps: result.steps || "",
    options: typeDef.options || result.options,
    interaction: result.interaction,
    imageSvg: result.imageSvg,
    prefix: typeDef.prefix || result.prefix,
    suffix: typeDef.suffix || result.suffix,
    primeFactors: result.primeFactors,
    answers: result.answers,
    q8subtype: result.q8subtype,
    answerSpec: result.answerSpec || typeDef.answerSpec,
  };
  return q;
}

const questions = preset.questions.map((spec, index) => {
  const typeDef = bank.data.find((t) => t.key === spec.typeKey);
  if (!typeDef) throw new Error(`missing typeDef ${spec.typeKey}`);
  const result = generators.generateQuestion(typeDef, params[spec.typeKey] || {});
  return assemble(typeDef, result, index);
});

let html = tmpl
  .replace(/\{\{TITLE\}\}/g, "中一第二學期甲部")
  .replace(/\{\{QUESTIONS_DATA\}\}/g, JSON.stringify(questions))
  .replace(/\{\{QUESTION_SPECS\}\}/g, JSON.stringify([]))
  .replace(/\{\{GENERATED_AT\}\}/g, "2026-07-04T00:00:00.000Z")
  .replace(/\{\{BANK_HASH\}\}/g, "test-s1-term2")
  .replace(/\{\{PRESET_KEY\}\}/g, "s1_term2_part_a")
  .replace(/\{\{GAS_URL\}\}/g, "")
  .replace(/\{\{VALIDATORS_SCRIPT\}\}/g, validators.toStandaloneScript())
  .replace(/\{\{GENERATORS_SCRIPT\}\}/g, generators.toStandaloneScript())
  .replace(/\{\{PDF_SCRIPT\}\}/g, pdfScript)
  .replace(/\{\{RUNTIME_SEED\}\}/g, JSON.stringify(null));

const leftovers = html.match(/\{\{[A-Z_]+\}\}/g) || [];
if (leftovers.length) throw new Error(`leftover placeholders: ${leftovers.join(", ")}`);

const out = path.join(ROOT, "test/e2e_s1_term2_student.html");
fs.writeFileSync(out, html);

const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
scripts.forEach((script, index) => {
  if (script.includes("window.MathJax")) return;
  const tmp = path.join(ROOT, `test/.tmp_s1t2_script_${index}.js`);
  fs.writeFileSync(tmp, script);
  execFileSync("node", ["--check", tmp], { stdio: "pipe" });
  fs.unlinkSync(tmp);
});

const byKey = Object.fromEntries(questions.map((q) => [q.typeKey, q]));
const checks = [
  ["Q03 directed_add correct", validators.checkAnswer(byKey.directed_add, "-5")],
  ["Q03 directed_add unicode minus", validators.checkAnswer(byKey.directed_add, "−5")],
  ["Q09 poly strict rejects reorder", !validators.checkAnswer(byKey.s1t2_poly_desc, "3x+x^2-4")],
  ["Q13 coordinate text accepts axis", validators.checkAnswer(byKey.s1t2_coordinate, "-2")],
  ["Q13 coordinate interaction target", byKey.s1t2_coordinate.interaction.targetX === -2 && byKey.s1t2_coordinate.interaction.targetY === 1],
  ["Q14 quadrant correct", validators.checkAnswer(byKey.quadrant, "II")],
  ["Q14 quadrant rejects wrong", !validators.checkAnswer(byKey.quadrant, "I")],
];

let passed = 0;
const failures = [];
for (const [label, ok] of checks) {
  if (ok) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failures.push(label);
    console.log(`  ✗ ${label}`);
  }
}

console.log(`Generated ${questions.length}/14 questions into ${out}`);
if (questions.length !== 14) failures.push(`expected 14 questions, got ${questions.length}`);
if (failures.length) {
  console.log(`❌ s1 term2 export e2e failed: ${failures.join("; ")}`);
  process.exit(1);
}
console.log(`✅ s1 term2 export e2e passed (${passed} checks)`);
