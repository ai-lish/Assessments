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
    code_re = re.compile(r"^(?:LSC-\d{4}-S\d+-T\d+-\d{2}-(?:NA|ME|GE|DH|UC)-\d+|DSE-\d{4}-P\d+-[A-Z]\d+-\d{2}-(?:NA|ME|GE|DH|UC)-\d+)$")
    family_re = re.compile(r"-(NA|ME|GE|DH|UC)-(\d+)$")
    required = [
        "key", "code", "grade", "term", "part", "topicKey", "topicName",
        "type", "validator", "schemaVersion", "generator", "source",
    ]
    schema_fields = bank.get("_schema_guide", {}).get("entry_fields", {})
    if "source" not in schema_fields:
        errors.append("_schema_guide.entry_fields: missing source contract")
    if not code_re.match("DSE-2025-P1-A1-01-NA-1"):
        errors.append("DSE reserved code example should match code regex")
    required_presets = {"s1_term2_part_a", "s1_term3_part_a", "s2_term3_part_a", "s3_term3_part_a"}
    for preset in bank.get("presets", []):
        if preset.get("key") in required_presets:
            if preset.get("schoolYear") != "2526":
                errors.append(f"{preset.get('key')}: schoolYear must be 2526")
            if preset.get("schoolYearLabel") != "2025-26":
                errors.append(f"{preset.get('key')}: schoolYearLabel must be 2025-26")
    docs = (ROOT / "docs/question-codes.md").read_text(encoding="utf-8")
    codes = set()
    family_by_generator = {}
    for item in bank["data"]:
        key = item.get("key", "?")
        for field in required:
            if field not in item or item[field] is None:
                errors.append(f"{key}: missing {field}")
        if "source" in item and not isinstance(item.get("source"), str):
            errors.append(f"{key}: source must be a string")
        code = item.get("code")
        if code in codes:
            errors.append(f"{key}: duplicate code {code}")
        if code:
            codes.add(code)
            match = code_re.match(code)
            if not match:
                errors.append(f"{key}: invalid code format {code}")
            else:
                family_match = family_re.search(code)
                if not family_match:
                    errors.append(f"{key}: code missing topic family suffix {code}")
                    continue
                family = f"{family_match.group(1)}-{family_match.group(2)}"
                if family.startswith("UC-"):
                    errors.append(f"{key}: UC family is reserved and must have no current members")
                generator = item.get("generator")
                previous = family_by_generator.get(generator)
                if previous and previous != family:
                    errors.append(f"{key}: generator {generator} uses multiple families: {previous}, {family}")
                family_by_generator[generator] = family
                if f"| `{family}` |" not in docs or f"`{generator}`" not in docs:
                    errors.append(f"{key}: docs/question-codes.md missing family registry for {family}/{generator}")
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
