#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const bank = require("../question-bank.json");
const generators = require("../tool/generators.js");
const validators = require("../tool/validators.js");

const ROOT = path.resolve(__dirname, "..");
const tmpl = fs.readFileSync(path.join(ROOT, "templates/student.html"), "utf8");
const preset = bank.presets.find((p) => p.key === "s3_term3_part_a");
if (!preset) throw new Error("s3_term3_part_a preset missing");

const params = {
  poly_add_sub: { a: 3, b: -2, c: 5, d: 1, e: -4, f: -1, op: "-" },
  binomial_expand: { a: 2, b: 3, c: 1, d: -4 },
  s3t3_square_expand: { a: 2, b: -3, square: true },
  s3t3_zero_exp: { base: 7, zeroCase: true },
  factor_diff_sq: { a: 1, b: 5 },
  factor_cross: { a: 2, b: 3, c: 1, d: -4 },
  sci_notation: { mantissa: 3.2, exponent: 5 },
  solve_ineq: { a: -2, b: 5, boundary: -3, op: "<" },
  triangle_center: { center: "centroid" },
  solid_sphere: { solidType: "sphere", r: 3 },
  solid_cylinder: { solidType: "cylinder", r: 3, h: 5 },
  solid_cone: { solidType: "cone", r: 3, h: 8 },
  sector_measure: { r: 6, angle: 60, ask: "area" },
  pyth_cone: { mode: "findL", r: 5, h: 12, l: 13 },
};

function assemble(typeDef, result, index) {
  return {
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
}

const questions = preset.questions.map((spec, index) => {
  const typeDef = bank.data.find((t) => t.key === spec.typeKey);
  if (!typeDef) throw new Error(`missing typeDef ${spec.typeKey}`);
  const result = generators.generateQuestion(typeDef, params[spec.typeKey] || {});
  return assemble(typeDef, result, index);
});

let html = tmpl
  .replace(/\{\{TITLE\}\}/g, "中三第三學期甲部")
  .replace(/\{\{QUESTIONS_DATA\}\}/g, JSON.stringify(questions))
  .replace(/\{\{QUESTION_SPECS\}\}/g, JSON.stringify([]))
  .replace(/\{\{GENERATED_AT\}\}/g, "2026-07-04T00:00:00.000Z")
  .replace(/\{\{BANK_HASH\}\}/g, "test-s3-term3")
  .replace(/\{\{PRESET_KEY\}\}/g, "s3_term3_part_a")
  .replace(/\{\{GAS_URL\}\}/g, "")
  .replace(/\{\{VALIDATORS_SCRIPT\}\}/g, validators.toStandaloneScript())
  .replace(/\{\{GENERATORS_SCRIPT\}\}/g, generators.toStandaloneScript())
  .replace(/\{\{RUNTIME_SEED\}\}/g, JSON.stringify(null));

const leftovers = html.match(/\{\{[A-Z_]+\}\}/g) || [];
if (leftovers.length) throw new Error(`leftover placeholders: ${leftovers.join(", ")}`);

const out = path.join(ROOT, "test/e2e_s3_term3_student.html");
fs.writeFileSync(out, html);

const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
scripts.forEach((script, index) => {
  if (script.includes("window.MathJax")) return;
  const tmp = path.join(ROOT, `test/.tmp_s3t3_script_${index}.js`);
  fs.writeFileSync(tmp, script);
  execFileSync("node", ["--check", tmp], { stdio: "pipe" });
  fs.unlinkSync(tmp);
});

const byKey = Object.fromEntries(questions.map((q) => [q.typeKey, q]));
const checks = [
  ["Q07 scientific notation correct", validators.checkAnswer(byKey.sci_notation, "3.2×10^5")],
  ["Q07 rejects mantissa >= 10", !validators.checkAnswer(byKey.sci_notation, "32×10^4")],
  ["Q08 inequality reversed equivalent", validators.checkAnswer(byKey.solve_ineq, "-3<x")],
  ["Q08 rejects wrong direction", !validators.checkAnswer(byKey.solve_ineq, "x<-3")],
  ["Q09 triangle center correct", validators.checkAnswer(byKey.triangle_center, "centroid")],
  ["Q10 solid accepts pi answer", validators.checkAnswer(byKey.solid_sphere, byKey.solid_sphere.answers[1])],
  ["Q14 pythagoras numeric", validators.checkAnswer(byKey.pyth_cone, "13")],
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
  console.log(`❌ s3 term3 export e2e failed: ${failures.join("; ")}`);
  process.exit(1);
}
console.log(`✅ s3 term3 export e2e passed (${passed} checks)`);
