#!/usr/bin/env python3
"""PR-A2 schema contract validation for all current question-bank entries."""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BANK = ROOT / "question-bank.json"


def main():
    bank = json.loads(BANK.read_text(encoding="utf-8"))
    errors = []
    code_re = re.compile(r"^S\d+T\d+-(NA|ME|GE|DH|UC)-\d{2}$")
    required = [
        "key", "code", "grade", "term", "part", "topicKey", "topicName",
        "type", "validator", "schemaVersion", "generator",
    ]
    codes = set()
    for item in bank["data"]:
        key = item.get("key", "?")
        for field in required:
            if field not in item or item[field] is None:
                errors.append(f"{key}: missing {field}")
        code = item.get("code")
        if code in codes:
            errors.append(f"{key}: duplicate code {code}")
        if code:
            codes.add(code)
            if not code_re.match(code):
                errors.append(f"{key}: invalid code format {code}")
        if "generate" in item:
            errors.append(f"{key}: legacy generate string remains")
        if item.get("type") == "choice" and not item.get("options"):
            errors.append(f"{key}: choice missing options")
        if item.get("type") == "coordinate":
            answer_spec = item.get("answerSpec") or {}
            if answer_spec.get("coordinateMode") != "axis-value":
                errors.append(f"{key}: coordinate missing answerSpec.coordinateMode=axis-value")
            if not answer_spec.get("interaction"):
                errors.append(f"{key}: coordinate missing answerSpec.interaction")
        if item.get("type") == "congruence" and not item.get("figure"):
            errors.append(f"{key}: congruence missing figure")

    registry = subprocess.run(
        [
            "node",
            "-e",
            """
const bank = require("./question-bank.json");
const generators = require("./tool/generators.js");
const validators = require("./tool/validators.js");
const bad = [];
for (const item of bank.data) {
  if (!generators.hasGenerator(item.generator)) bad.push(`${item.key}: missing generator`);
  if (!validators.hasValidator(item.validator)) bad.push(`${item.key}: missing validator`);
}
process.stdout.write(JSON.stringify(bad));
""",
        ],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
    )
    if registry.returncode != 0:
        errors.append(registry.stderr.strip())
    else:
        errors.extend(json.loads(registry.stdout))

    if errors:
        print("Schema validation failed:")
        for err in errors:
            print(f"  - {err}")
        sys.exit(1)
    print(f"schema validation: {len(bank['data'])}/{len(bank['data'])} entries passed")


if __name__ == "__main__":
    main()
