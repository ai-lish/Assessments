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
  "alg_simplify_2var",
  "s2t3_square_expand_2var",
  "solve_eq_fraction",
  "solve_eq_bracket",
  "factor_neg_common",
  "s2t3_factor_diff_sq",
  "s2t3_sig_fig",
  "round_decimal",
  "combine_fractions",
  "s2t3_exp_law",
  "coef_exp_div",
  "ratio_three",
  "discount",
  "profit_pct",
  "square_root_pm",
  "cuboid_volume_cube",
];

const expectedFamilies = {
  alg_simplify_2var: "NA-22",
  s2t3_square_expand_2var: "NA-17",
  solve_eq_fraction: "NA-7",
  solve_eq_bracket: "NA-7",
  factor_neg_common: "NA-23",
  s2t3_factor_diff_sq: "NA-18",
  s2t3_sig_fig: "ME-1",
  round_decimal: "ME-8",
  combine_fractions: "NA-24",
  s2t3_exp_law: "NA-5",
  coef_exp_div: "NA-25",
  ratio_three: "NA-26",
  discount: "ME-9",
  profit_pct: "ME-10",
  square_root_pm: "NA-27",
  cuboid_volume_cube: "ME-4",
};

const sampleParams = {
  alg_simplify_2var: { a1: 3, b1: 4, a2: 2, b2: 1, op: "-" },
  s2t3_square_expand_2var: { b: 3, twoVar: true },
  solve_eq_fraction: { mode: "fraction", a: 2, c: 3, d: 4, xVal: 3 },
  solve_eq_bracket: { mode: "bracket", k: 3, m: 2, xVal: -2 },
  factor_neg_common: { k: 3, d1: 2 },
  s2t3_factor_diff_sq: { a: 1, b: 5 },
  s2t3_sig_fig: { baseNum: 184.62, sf: 3 },
  round_decimal: { coeff: 0.92, decimals: 2, mode: "nearest" },
  combine_fractions: { m: 9, c: 6 },
  s2t3_exp_law: { a: 2, b: 3 },
  coef_exp_div: { expD: 2, expN: 5, rNum: 3, rDen: 4, scale: 2 },
  ratio_three: { aB: 2, bB: 8, aC: 7, cC: 3 },
  discount: { price: 42, disTen: 9 },
  profit_pct: { cost: 1000, pct: 15, isProfit: true },
  square_root_pm: { n: 36 },
  cuboid_volume_cube: { side: 5, cube: true },
};

const wrongInputs = {
  alg_simplify_2var: "a+4b",
  s2t3_square_expand_2var: "x^2+9y^2",
  solve_eq_fraction: "4",
  solve_eq_bracket: "2",
  factor_neg_common: "x(x+1)",
  s2t3_factor_diff_sq: "(x+5)(x+5)",
  s2t3_sig_fig: "184",
  round_decimal: "2.88",
  combine_fractions: "(9a+6)/(9k)",
  s2t3_exp_law: "x^6",
  coef_exp_div: "x^2",
  ratio_three: "14:56:6",
  discount: "42",
  profit_pct: "14%",
  square_root_pm: "6",
  cuboid_volume_cube: "124",
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
    primeFactors: result.primeFactors,
    q8subtype: result.q8subtype,
    interaction: result.interaction,
  };
}

section("1. preset order, code, family, registry");
const preset = bank.presets.find((p) => p.key === "s2_term3_part_a");
check("preset exists", !!preset);
const actualOrder = preset ? preset.questions.map((q) => q.typeKey) : [];
check("16題順序固定", JSON.stringify(actualOrder) === JSON.stringify(expectedOrder));
check("preset 不再使用 count:2 fallback", preset && preset.questions.every((q) => q.count === 1));

for (const key of expectedOrder) {
  const typeDef = bank.data.find((t) => t.key === key);
  check(`${key} exists`, !!typeDef);
  if (typeDef) {
    check(`${key} code family = ${expectedFamilies[key]}`, familyFromCode(typeDef.code) === expectedFamilies[key], typeDef.code);
    check(`${key} generator registered`, generators.hasGenerator(typeDef.generator), typeDef.generator);
    check(`${key} validator registered`, validators.hasValidator(typeDef.validator), typeDef.validator);
    check(`${key} has referenceAnswer`, Object.prototype.hasOwnProperty.call(typeDef, "referenceAnswer"));
  }
}

check("Q02 uses binomial_expand family NA-17",
  bank.data.find((t) => t.key === "s2t3_square_expand_2var")?.generator === "binomial_expand");
check("Q06 uses factor_diff_sq family NA-18",
  bank.data.find((t) => t.key === "s2t3_factor_diff_sq")?.generator === "factor_diff_sq");
check("Q07 uses sig_fig family ME-1",
  bank.data.find((t) => t.key === "s2t3_sig_fig")?.generator === "sig_fig");
check("Q10 uses exp_law family NA-5",
  bank.data.find((t) => t.key === "s2t3_exp_law")?.generator === "exp_law");

section("2. generate and validate fixtures");
for (const key of expectedOrder) {
  const typeDef = bank.data.find((t) => t.key === key);
  const result = generators.generateQuestion(typeDef, sampleParams[key]);
  const q = assemble(typeDef, result);
  const correctInput = result.answers && result.answers[0] ? result.answers[0] : result.correctAnswer;
  check(`${key} has solution steps`, !!result.solutionHTML && result.solutionHTML.length > 0);
  check(`${key} correct answer accepted`, validators.checkAnswer(q, correctInput), `correct=${correctInput}`);
  check(`${key} wrong answer rejected`, !validators.checkAnswer(q, wrongInputs[key]), `wrong=${wrongInputs[key]} answer=${result.correctAnswer}`);
}

section("3. S2 marking notation compatibility");
{
  const bracketType = bank.data.find((t) => t.key === "solve_eq_bracket");
  const bracket = generators.generateQuestion(bracketType, sampleParams.solve_eq_bracket);
  check("numeric accepts unicode minus for S2 equation answers",
    validators.checkAnswer(assemble(bracketType, bracket), "−2"));

  const discountType = bank.data.find((t) => t.key === "discount");
  const discount = generators.generateQuestion(discountType, sampleParams.discount);
  check("numeric accepts dollar sign for S2 money answers",
    validators.checkAnswer(assemble(discountType, discount), `$${discount.correctAnswer}`));

  const profitType = bank.data.find((t) => t.key === "profit_pct");
  const profit = generators.generateQuestion(profitType, sampleParams.profit_pct);
  check("numeric accepts percent sign for S2 percentage answers",
    validators.checkAnswer(assemble(profitType, profit), `${profit.correctAnswer}%`));

  const rootType = bank.data.find((t) => t.key === "square_root_pm");
  const root = generators.generateQuestion(rootType, sampleParams.square_root_pm);
  check("textExact accepts explicit ± answer form",
    validators.checkAnswer(assemble(rootType, root), "±6"));
}

if (failures.length) {
  console.error(`\n${failures.length} failure(s):`);
  failures.forEach((f) => console.error("- " + f));
  process.exit(1);
}
console.log(`\n${passed} S2 Term 3 baseline checks passed.`);
