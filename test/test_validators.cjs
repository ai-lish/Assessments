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
  ["principalRootExact accepts canonical radical", q("principalRootExact", { correctAnswer: "5√6", answers: ["5√6"] }), "5√6", true],
  ["principalRootExact accepts reasonable radical spaces", q("principalRootExact", { correctAnswer: "5√6", answers: ["5√6"] }), "5 √ 6", true],
  ["principalRootExact accepts canonical integer", q("principalRootExact", { correctAnswer: "12", answers: ["12"] }), "12", true],
  ["principalRootExact rejects old plus-minus radical", q("principalRootExact", { correctAnswer: "5√6", answers: ["5√6"] }), "±5√6", false],
  ["principalRootExact rejects missing radical", q("principalRootExact", { correctAnswer: "5√6", answers: ["5√6"] }), "5", false],
  ["principalRootExact rejects wrong radicand", q("principalRootExact", { correctAnswer: "5√6", answers: ["5√6"] }), "5√2", false],
  ["principalRootExact rejects swapped coefficient and radicand", q("principalRootExact", { correctAnswer: "5√6", answers: ["5√6"] }), "6√5", false],
  ["principalRootExact rejects trailing text", q("principalRootExact", { correctAnswer: "5√6", answers: ["5√6"] }), "5√6xyz", false],
  ["principalRootExact rejects numeric approximation", q("principalRootExact", { correctAnswer: "12", answers: ["12"] }), "12.247", false],
  ["numeric accepts tolerance", q("numeric", { correctAnswer: "10" }), "10.005", true],
  ["numeric accepts unicode minus", q("numeric", { correctAnswer: "-5" }), "−5", true],
  ["numeric accepts dollar sign", q("numeric", { correctAnswer: "37.8" }), "$37.80", true],
  ["numeric rejects outside tolerance", q("numeric", { correctAnswer: "10" }), "10.5", false],
  ["signedNumeric accepts unicode minus", q("signedNumeric", { correctAnswer: "-5" }), "−5", true],
  ["signedNumeric rejects wrong sign", q("signedNumeric", { correctAnswer: "-5" }), "5", false],
  ["numericOrFraction accepts equivalent fraction", q("numericOrFraction", { correctAnswer: "3/2" }), "1.5", true],
  ["numericOrFraction rejects wrong fraction", q("numericOrFraction", { correctAnswer: "3/2" }), "5/2", false],
  ["unitNumeric accepts optional cubic unit", q("unitNumeric", { correctAnswer: "60", answerSpec: { unit: "cm^3", allowUnit: true } }), "60 cm³", true],
  ["unitNumeric rejects wrong value", q("unitNumeric", { correctAnswer: "60", answerSpec: { unit: "cm^3", allowUnit: true } }), "61 cm³", false],
  ["unitNumeric accepts aπ/b form", q("unitNumeric", { correctAnswer: "134.041", answerSpec: { tolerance: 0.05 } }), "128π/3", true],
  ["unitNumeric accepts LaTeX fraction pi form", q("unitNumeric", { correctAnswer: "134.041", answerSpec: { tolerance: 0.05 } }), "\\frac{128}{3}π", true],
  ["unitNumeric accepts LaTeX fraction \\pi form", q("unitNumeric", { correctAnswer: "134.041", answerSpec: { tolerance: 0.05 } }), "\\frac{128}{3}\\pi", true],
  ["unitNumeric accepts coefficient-over-denominator pi form", q("unitNumeric", { correctAnswer: "134.041", answerSpec: { tolerance: 0.05 } }), "(128/3)π", true],
  ["unitNumeric rejects wrong fraction pi value", q("unitNumeric", { correctAnswer: "134.041", answerSpec: { tolerance: 0.05 } }), "\\frac{127}{3}π", false],
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
  ["congruenceReason rejects letter reordering ASS for SAS", q("congruenceReason", { correctAnswer: "S.A.S.", answers: ["S.A.S."] }), "ass", false],
  ["congruenceReason rejects independent AAS when expected SAS", q("congruenceReason", { correctAnswer: "S.A.S.", answers: ["S.A.S."] }), "aas", false],
  ["congruenceReason keeps AAS as independent valid reason", q("congruenceReason", { correctAnswer: "A.A.S.", answers: ["A.A.S."] }), "aas", true],
  ["congruenceReason rejects SAS when expected AAS", q("congruenceReason", { correctAnswer: "A.A.S.", answers: ["A.A.S."] }), "sas", false],
  ["congruenceReason rejects wrong reason", q("congruenceReason", { correctAnswer: "S.A.S.", answers: ["S.A.S."] }), "ASA", false],
  ["coordinatePoint accepts axis value", q("coordinatePoint", { correctAnswer: "-2" }), "-2", true],
  ["coordinatePoint rejects wrong axis value", q("coordinatePoint", { correctAnswer: "-2" }), "2", false],
  ["polyTerms strict accepts descending order", q("polyTerms", { correctAnswer: "x^2+3x-4", answerSpec: { order: "strict" } }), "x^2+3x-4", true],
  ["polyTerms strict rejects term reordering", q("polyTerms", { correctAnswer: "x^2+3x-4", answerSpec: { order: "strict" } }), "3x+x^2-4", false],
  ["polyTerms loose accepts term reordering", q("polyTerms", { correctAnswer: "3x-4", answerSpec: { order: "loose" } }), "-4+3x", true],
  ["polyTerms loose rejects wrong coefficient", q("polyTerms", { correctAnswer: "3x-4", answerSpec: { order: "loose" } }), "-4+2x", false],
  ["factorPair accepts factor order swap", q("factorPair", { correctAnswer: "(x+2)(x+3)", answerSpec: { factors: [[1, 2], [1, 3]] } }), "(x+3)(x+2)", true],
  ["factorPair rejects sign error", q("factorPair", { correctAnswer: "(x+2)(x+3)", answerSpec: { factors: [[1, 2], [1, 3]] } }), "(x-2)(x+3)", false],
  ["factorPair accepts common coefficient prefix", q("factorPair", { correctAnswer: "4(x-2)(x+2)", answerSpec: { coefficient: 4, factors: [[1, -2], [1, 2]] } }), "4(x-2)(x+2)", true],
  ["factorPair accepts common coefficient between factors", q("factorPair", { correctAnswer: "4(x-2)(x+2)", answerSpec: { coefficient: 4, factors: [[1, -2], [1, 2]] } }), "(x+2)·4·(x-2)", true],
  ["factorPair rejects incomplete factorization", q("factorPair", { correctAnswer: "4(x-2)(x+2)", answerSpec: { coefficient: 4, factors: [[1, -2], [1, 2]] } }), "(2x-4)(2x+4)", false],
  ["factorPair rejects wrong common coefficient", q("factorPair", { correctAnswer: "4(x-2)(x+2)", answerSpec: { coefficient: 4, factors: [[1, -2], [1, 2]] } }), "5(x-2)(x+2)", false],
  ["scientificNotation accepts structured equivalent", q("scientificNotation", { correctAnswer: "3.2×10^5", answerSpec: { value: 320000 } }), "3.2x10^5", true],
  ["scientificNotation rejects mantissa >= 10", q("scientificNotation", { correctAnswer: "3.2×10^5", answerSpec: { value: 320000 } }), "32×10^4", false],
  ["inequality accepts reversed equivalent", q("inequality", { correctAnswer: "x>-3", answerSpec: { variable: "x", op: ">", value: -3 } }), "-3<x", true],
  ["inequality rejects wrong direction", q("inequality", { correctAnswer: "x>-3", answerSpec: { variable: "x", op: ">", value: -3 } }), "x<-3", false],
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
