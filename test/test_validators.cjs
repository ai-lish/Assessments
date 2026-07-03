#!/usr/bin/env node

const validators = require("../tool/validators.js");

let passed = 0;
const failures = [];

function check(label, condition) {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failures.push(label);
    console.log(`  ✗ ${label}`);
  }
}

function q(checkType, extra) {
  return Object.assign({ checkType, validator: checkType, correctAnswer: "5", answers: ["5"] }, extra || {});
}

console.log("=== Validator registry fixtures ===");
const fixtures = [
  ["textExact accepts exact", q("textExact", { correctAnswer: "x^2", answers: ["x^2", "x**2"] }), "x**2", true],
  ["textExact rejects wrong", q("textExact", { correctAnswer: "x^2", answers: ["x^2"] }), "x^3", false],
  ["numeric accepts tolerance", q("numeric", { correctAnswer: "10" }), "10.005", true],
  ["numeric rejects outside tolerance", q("numeric", { correctAnswer: "10" }), "10.5", false],
  ["fracPct accepts no percent", q("fracPct", { correctAnswer: "75%" }), "75", true],
  ["fracPct rejects wrong percent", q("fracPct", { correctAnswer: "75%" }), "70", false],
  ["primeFactor accepts index form", q("primeFactor", { primeFactors: { 2: 2, 3: 1 } }), "2^2x3", true],
  ["primeFactor rejects expanded form", q("primeFactor", { primeFactors: { 2: 2, 3: 1 } }), "2x2x3", false],
  ["algebraQ8 accepts commuted product", q("algebraQ8", { q8subtype: 3, answers: ["5(x+4)"] }), "(x+4)5", true],
  ["algebraQ8 rejects wrong structure", q("algebraQ8", { q8subtype: 3, answers: ["5(x+4)"] }), "5x+4", false],
  ["hcfLcm accepts exact", q("hcfLcm", { correctAnswer: "18" }), "18", true],
  ["hcfLcm rejects wrong", q("hcfLcm", { correctAnswer: "18" }), "12", false],
  ["choiceKey accepts case-insensitive", q("choiceKey", { correctAnswer: "A" }), "a", true],
  ["choiceKey rejects wrong key", q("choiceKey", { correctAnswer: "A" }), "B", false],
  ["congruenceReason accepts dotted lowercase", q("congruenceReason", { correctAnswer: "S.A.S.", answers: ["S.A.S."] }), "s.a.s.", true],
  ["congruenceReason accepts dot-stripped uppercase", q("congruenceReason", { correctAnswer: "S.A.S.", answers: ["S.A.S."] }), "SAS", true],
  ["congruenceReason rejects wrong reason", q("congruenceReason", { correctAnswer: "S.A.S.", answers: ["S.A.S."] }), "ASA", false],
  ["coordinatePoint accepts axis value", q("coordinatePoint", { correctAnswer: "-2" }), "-2", true],
  ["coordinatePoint rejects wrong axis value", q("coordinatePoint", { correctAnswer: "-2" }), "2", false],
];

for (const [label, question, input, expected] of fixtures) {
  check(label, validators.checkAnswer(question, input) === expected);
}

console.log("\n" + "=".repeat(60));
if (failures.length > 0) {
  console.log(`❌ ${failures.length} validator fixture failure(s):`);
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exit(1);
}
console.log(`✅ validator fixtures passed (${passed} checks)`);
