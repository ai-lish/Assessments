#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const bank = require(path.join(ROOT, "question-bank.json"));
const generators = require(path.join(ROOT, "tool/generators.js"));
const fixture = JSON.parse(fs.readFileSync(path.join(ROOT, "test/fixtures/generator_equivalence.json"), "utf8"));

let passed = 0;
const failures = [];

function check(label, condition, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function stable(value) {
  return JSON.stringify(value);
}

console.log("=== Generator registry equivalence ===");
for (const typeDef of bank.data) {
  const cases = fixture[typeDef.key] || [];
  check(`${typeDef.key} has registry entry`, generators.hasGenerator(typeDef.generator));
  check(`${typeDef.key} has fixture cases`, cases.length > 0);
  cases.forEach((item, index) => {
    const actual = generators.generateQuestion(typeDef, item.params);
    check(
      `${typeDef.key} case ${index + 1} matches old generate output`,
      stable(actual) === stable(item.result),
      `params=${stable(item.params)}`,
    );
  });
}

console.log("\n" + "=".repeat(60));
if (failures.length > 0) {
  console.log(`❌ ${failures.length} generator equivalence failure(s):`);
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exit(1);
}
console.log(`✅ generator equivalence passed (${passed} checks)`);
