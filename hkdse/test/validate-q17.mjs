#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

await import("../mimic/p1-q17-generator.js");

const generator = globalThis.P1Q17Generator;
if (!generator) throw new Error("Q17 generator API was not exposed");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function validateOriginal(question, index) {
  const { params } = question;
  assert(Number.isInteger(params.target), `original ${index}: target is integer`);
  assert(params.base > 1, `original ${index}: logarithm base is valid`);
  assert(Number.isFinite(params.targetSum), `original ${index}: target sum finite`);
  assert(params.targetSum <= params.targetSum, `original ${index}: target boundary valid`);
  assert(params.nextSum > params.targetSum, `original ${index}: next integer fails`);
  assert(question.questionHtml.includes(`B(1)`), `original ${index}: question includes B sequence`);
  assert(question.answerBHtml.includes(`n=${params.target}`), `original ${index}: answer matches target`);
}

function validateReference(question, index) {
  const { params } = question;
  assert(Number.isInteger(params.target), `reference ${index}: target is integer`);
  assert(params.logBase > 1, `reference ${index}: logarithm base is valid`);
  assert(params.productBase === params.logBase ** params.logMultiplier, `reference ${index}: product base matches`);
  assert(Number.isFinite(params.currentValue) && Number.isFinite(params.nextValue), `reference ${index}: values finite`);
  if (params.operator === "<") {
    assert(params.currentValue < params.threshold, `reference ${index}: target satisfies <`);
    assert(params.nextValue >= params.threshold, `reference ${index}: next integer fails <`);
  } else {
    assert(params.currentValue > params.threshold, `reference ${index}: target satisfies >`);
    assert(params.nextValue <= params.threshold, `reference ${index}: next integer fails >`);
  }
  assert(question.answerBHtml.includes(`k=${params.target}`), `reference ${index}: answer matches target`);
}

const originalRng = seeded(201517);
const referenceRng = seeded(517201);
for (let index = 1; index <= 20; index += 1) {
  validateOriginal(generator.generate("original", originalRng), index);
  validateReference(generator.generate("reference", referenceRng), index);
}

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const page = readFileSync(resolve(root, "mimic/p1-q17-generator.html"), "utf8");
assert(page.includes('href="../index.html"'), "Q17 page returns to HKDSE home");
assert(page.includes('href="index.html"'), "Q17 page links to mimic hub");
assert(!page.includes('href="/'), "Q17 page has no root-relative href");
assert(!/AIza|api[_-]?key|API_KEY|token\s*[:=]|password\s*[:=]/i.test(page), "Q17 page has no secret marker");

console.log("validate-q17: ok");
