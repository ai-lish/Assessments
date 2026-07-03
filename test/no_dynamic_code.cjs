#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const banned = [
  { label: "dynamic constructor", re: /\bnew\s+Function\b/ },
  { label: "direct dynamic runner", re: /\beval\s*\(/ },
];
const skipDirs = new Set([".git", "hkdse", "node_modules"]);
const skipFiles = new Set(["test/no_dynamic_code.cjs"]);
const targets = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!skipDirs.has(entry.name)) walk(path.join(dir, entry.name));
      continue;
    }
    const file = path.join(dir, entry.name);
    const rel = path.relative(ROOT, file);
    if (skipFiles.has(rel)) continue;
    if (!/\.(js|cjs|mjs|html|py|json|txt|md)$/.test(entry.name)) continue;
    targets.push(file);
  }
}

walk(ROOT);

const failures = [];
for (const file of targets) {
  const rel = path.relative(ROOT, file);
  const text = fs.readFileSync(file, "utf8");
  for (const rule of banned) {
    if (rule.re.test(text)) failures.push(`${rel}: ${rule.label}`);
  }
}

if (failures.length > 0) {
  console.log("Dynamic code scan failed:");
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exit(1);
}

console.log(`dynamic code scan: ${targets.length} files checked, no banned patterns outside /hkdse/`);
