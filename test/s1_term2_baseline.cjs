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
  "s1t2_prime_factor", "s1t2_hcf", "directed_add", "directed_mul",
  "s1t2_word_to_alg", "s1t2_solve_eq_fraction", "s1t2_solve_eq_negative",
  "cuboid_volume", "s1t2_poly_desc", "poly_constant", "s1t2_alg_simplify",
  "expand_bracket", "s1t2_coordinate", "quadrant",
];
const expectedFamilies = {
  s1t2_prime_factor: "NA-3",
  s1t2_hcf: "NA-4",
  directed_add: "NA-12",
  directed_mul: "NA-13",
  s1t2_word_to_alg: "NA-8",
  s1t2_solve_eq_fraction: "NA-7",
  s1t2_solve_eq_negative: "NA-7",
  cuboid_volume: "ME-4",
  s1t2_poly_desc: "NA-9",
  poly_constant: "NA-14",
  s1t2_alg_simplify: "NA-6",
  expand_bracket: "NA-15",
  s1t2_coordinate: "GE-2",
  quadrant: "GE-4",
};
const sampleParams = {
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
const wrongInputs = {
  s1t2_prime_factor: "2x2x2x3x3",
  s1t2_hcf: "72",
  directed_add: "5",
  directed_mul: "18",
  s1t2_word_to_alg: "5x+4",
  s1t2_solve_eq_fraction: "2",
  s1t2_solve_eq_negative: "3",
  cuboid_volume: "61",
  s1t2_poly_desc: "3x+x^2-4",
  poly_constant: "8",
  s1t2_alg_simplify: "-2x-10",
  expand_bracket: "-6x-12",
  s1t2_coordinate: "2",
  quadrant: "I",
};

function familyFromCode(code) {
  const match = String(code || "").match(/-(NA|ME|GE|DH|UC)-(\d+)$/);
  return match ? `${match[1]}-${match[2]}` : "";
}

function assemble(typeDef, result) {
  const q = {
    typeKey: typeDef.key,
    type: typeDef.type,
    checkType: typeDef.checkType,
    validator: typeDef.validator || typeDef.checkType,
    correctAnswer: result.correctAnswer,
    answers: result.answers,
    answerSpec: result.answerSpec || typeDef.answerSpec,
    primeFactors: result.primeFactors,
    q8subtype: result.q8subtype,
    interaction: result.interaction,
  };
  return q;
}

section("1. preset order and family");
const preset = bank.presets.find((p) => p.key === "s1_term2_part_a");
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
const algType = bank.data.find((t) => t.key === "s1t2_alg_simplify");
check("第11題沿用 alg_simplify generator", algType && algType.generator === "alg_simplify");

section("2. generate and validate");
for (const key of expectedOrder) {
  const typeDef = bank.data.find((t) => t.key === key);
  const result = generators.generateQuestion(typeDef, sampleParams[key]);
  const q = assemble(typeDef, result);
  check(`${key} has solution steps`, !!result.solutionHTML && result.solutionHTML.length > 0);
  check(`${key} correct answer accepted`, validators.checkAnswer(q, result.answers && result.answers[0] ? result.answers[0] : result.correctAnswer));
  check(`${key} wrong answer rejected`, !validators.checkAnswer(q, wrongInputs[key]), `wrong=${wrongInputs[key]} answer=${result.correctAnswer}`);
  if (key === "s1t2_hcf") check("Q02 remains HCF mode", result.askLCM === false);
  if (key === "s1t2_solve_eq_fraction") check("Q06 can generate fraction answer", String(result.correctAnswer).includes("/"));
  if (key === "s1t2_solve_eq_negative") check("Q07 generated negative solution", parseFloat(result.correctAnswer) < 0);
  if (key === "s1t2_coordinate") {
    check("Q13 coordinate axis-value interaction", result.interaction && result.interaction.targetX === -2 && result.interaction.targetY === 1 && result.interaction.askAxis === "x");
  }
  if (key === "quadrant") {
    check("Q14 quadrant has four options", Array.isArray(result.options) && result.options.length === 4);
  }
}

console.log("\n" + "=".repeat(60));
if (failures.length > 0) {
  console.log(`❌ s1_term2 baseline failed (${failures.length} failure(s))`);
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exit(1);
}
console.log(`✅ s1_term2 baseline passed (${passed} checks)`);
