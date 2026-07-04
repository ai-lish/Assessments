#!/usr/bin/env python3
"""Verify Python-side filter checks execute the shared tool/filter.js.

This intentionally does not reimplement the filtering rule in Python.
"""
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

script = r"""
const fs = require("fs");
const path = require("path");
const root = process.argv[1];
const bank = JSON.parse(fs.readFileSync(path.join(root, "question-bank.json"), "utf8"));
const { filterBankStrict } = require(path.join(root, "tool/filter.js"));
const cases = [
  ["", "", "", 0],
  ["s1", "", "", 0],
  ["s1", "3", "", 0],
  ["s1", "3", "number_and_algebra", 11],
  ["s1", "3", "measurement", 2],
  ["s1", "3", "geometry", 2],
  ["s1", "3", "data_handling", 1],
  ["s1", "2", "number_and_algebra", 11],
  ["s1", "2", "measurement", 1],
  ["s1", "2", "geometry", 2],
  ["s1", "2", "data_handling", 0],
];
const results = cases.map(([grade, term, topic, expected]) => ({
  grade, term, topic, expected,
  actual: filterBankStrict(bank.data, grade, term, topic).length,
}));
process.stdout.write(JSON.stringify(results));
"""

proc = subprocess.run(
    ["node", "-e", script, str(ROOT)],
    capture_output=True,
    text=True,
    check=True,
)
results = json.loads(proc.stdout)
failures = [r for r in results if r["actual"] != r["expected"]]

for r in results:
    status = "OK" if r["actual"] == r["expected"] else "FAIL"
    print(f"{status}: {r['grade'] or '-'} / {r['term'] or '-'} / {r['topic'] or '-'} -> {r['actual']}")

if failures:
    raise SystemExit(f"filter subprocess failures: {failures}")

print("filter subprocess validation: ok")
