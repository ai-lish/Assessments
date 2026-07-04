#!/usr/bin/env node

const bank = require("../question-bank.json");
const generators = require("../tool/generators.js");
const validators = require("../tool/validators.js");

let passed = 0;
const failures = [];
function check(label, condition, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
    console.log(`  ✗ ${label}${detail ? "  " + detail : ""}`);
  }
}
function section(title) { console.log(`\n=== ${title} ===`); }

const expectedOrder = [
  "poly_add_sub", "binomial_expand", "s3t3_square_expand", "s3t3_zero_exp",
  "factor_diff_sq", "factor_cross", "sci_notation", "solve_ineq",
  "triangle_center", "solid_sphere", "solid_cylinder", "solid_cone",
  "sector_measure", "pyth_cone",
];

const expectedFamilies = {
  poly_add_sub: "NA-16",
  binomial_expand: "NA-17",
  s3t3_square_expand: "NA-17",
  s3t3_zero_exp: "NA-5",
  factor_diff_sq: "NA-18",
  factor_cross: "NA-19",
  sci_notation: "NA-20",
  solve_ineq: "NA-21",
  triangle_center: "GE-5",
  solid_sphere: "ME-5",
  solid_cylinder: "ME-5",
  solid_cone: "ME-5",
  sector_measure: "ME-6",
  pyth_cone: "ME-7",
};

const sampleParams = {
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

const wrongInputs = {
  poly_add_sub: "2x^2+2x+5",
  binomial_expand: "2x^2-5x+12",
  s3t3_square_expand: "4x^2-9",
  s3t3_zero_exp: "7",
  factor_diff_sq: "(x+5)(x+5)",
  factor_cross: "(2x-3)(x-4)",
  sci_notation: "32×10^4",
  solve_ineq: "x<-3",
  triangle_center: "orthocenter",
  solid_sphere: "100",
  solid_cylinder: "40π",
  solid_cone: "20π",
  sector_measure: "10π",
  pyth_cone: "12",
};

function familyFromCode(code) {
  const match = String(code || "").match(/-(NA|ME|GE|DH|UC)-(\d+)$/);
  return match ? `${match[1]}-${match[2]}` : "";
}

function assemble(typeDef, result) {
  return {
    typeKey: typeDef.key,
    type: typeDef.type,
    checkType: typeDef.checkType,
    validator: typeDef.validator || typeDef.checkType,
    correctAnswer: result.correctAnswer,
    answers: result.answers,
    answerSpec: result.answerSpec || typeDef.answerSpec,
    options: typeDef.options || result.options,
  };
}

section("1. preset order and family");
const preset = bank.presets.find((p) => p.key === "s3_term3_part_a");
check("preset exists", !!preset);
const actualOrder = preset ? preset.questions.map((q) => q.typeKey) : [];
check("14題順序固定", JSON.stringify(actualOrder) === JSON.stringify(expectedOrder));
for (const key of expectedOrder) {
  const typeDef = bank.data.find((t) => t.key === key);
  check(`${key} exists`, !!typeDef);
  if (typeDef) {
    check(`${key} code family = ${expectedFamilies[key]}`, familyFromCode(typeDef.code) === expectedFamilies[key], typeDef.code);
  }
}
check("Q03 沿用 binomial_expand generator", bank.data.find((t) => t.key === "s3t3_square_expand")?.generator === "binomial_expand");
check("Q04 沿用 exp_law generator", bank.data.find((t) => t.key === "s3t3_zero_exp")?.generator === "exp_law");
check("Q10-Q12 沿用 solid_mensuration generator",
  ["solid_sphere", "solid_cylinder", "solid_cone"].every((key) => bank.data.find((t) => t.key === key)?.generator === "solid_mensuration"));

section("2. generate and validate");
for (const key of expectedOrder) {
  const typeDef = bank.data.find((t) => t.key === key);
  const result = generators.generateQuestion(typeDef, sampleParams[key]);
  const q = assemble(typeDef, result);
  const correctInput = result.answers && result.answers[0] ? result.answers[0] : result.correctAnswer;
  check(`${key} has solution steps`, !!result.solutionHTML && result.solutionHTML.length > 0);
  check(`${key} correct answer accepted`, validators.checkAnswer(q, correctInput), `correct=${correctInput}`);
  check(`${key} wrong answer rejected`, !validators.checkAnswer(q, wrongInputs[key]), `wrong=${wrongInputs[key]} answer=${result.correctAnswer}`);
  if (key === "factor_diff_sq") check("Q05 rejects sign error", !validators.checkAnswer(q, "(x-5)(x-5)"));
  if (key === "factor_cross") check("Q06 accepts factor order swap", validators.checkAnswer(q, "(x-4)(2x+3)"));
  if (key === "sci_notation") {
    check("Q07 mantissa >= 10 rejected", !validators.checkAnswer(q, "32×10^4"));
    check("Q07 x multiplication accepted", validators.checkAnswer(q, "3.2x10^5"));
  }
  if (key === "solve_ineq") {
    check("Q08 reversed equivalent accepted", validators.checkAnswer(q, "-3<x"));
    check("Q08 wrong direction rejected", !validators.checkAnswer(q, "x<-3"));
  }
  if (key === "triangle_center") check("Q09 has four options", Array.isArray(result.options) && result.options.length === 4);
  if (key === "solid_sphere") check("Q10 accepts pi form", validators.checkAnswer(q, result.answers[1]));
  if (key === "sector_measure") check("Q13 accepts pi form", validators.checkAnswer(q, result.answers[1]));
}

console.log("\n" + "=".repeat(60));
if (failures.length > 0) {
  console.log(`❌ s3_term3 baseline failed (${failures.length} failure(s))`);
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exit(1);
}
console.log(`✅ s3_term3 baseline passed (${passed} checks)`);
