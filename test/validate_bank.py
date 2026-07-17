#!/usr/bin/env python3
"""Validate the question bank against the PR-A2 generator and validator registries."""
import json
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BANK = ROOT / "question-bank.json"
NODE = subprocess.run(["which", "node"], capture_output=True, text=True).stdout.strip()

SUPPORTED_TYPES = {"text", "choice", "coordinate", "congruence"}
SUPPORTED_CHECKS = {
    "textExact", "principalRootExact", "numeric", "signedNumeric", "numericOrFraction", "unitNumeric", "fracPct",
    "primeFactor", "algebraQ8", "hcfLcm",
    "polyTerms", "factorPair", "scientificNotation", "inequality",
    "choiceKey", "congruenceReason", "coordinatePoint"
}
CODE_RE = re.compile(r"^(?:LSC-\d{4}-S\d+-T\d+-\d{2}-(?:NA|ME|GE|DH|UC)-\d+|DSE-\d{4}-P\d+-[A-Z]\d+-\d{2}-(?:NA|ME|GE|DH|UC)-\d+)$")
FAMILY_RE = re.compile(r"-(NA|ME|GE|DH|UC)-(\d+)$")


def run_js(code, timeout=10):
    p = subprocess.run([NODE, "-e", code], capture_output=True, text=True, timeout=timeout, cwd=str(ROOT))
    return p.stdout, p.stderr, p.returncode


def get_type(bank, key):
    return next((t for t in bank["data"] if t["key"] == key), None)


def call_generate(bank, key, params):
    t = get_type(bank, key)
    if not t:
        return None
    js = """
const generators = require("./tool/generators.js");
const bank = require("./question-bank.json");
const key = process.env.TYPE_KEY;
const params = JSON.parse(process.env.PARAMS_JSON);
const typeDef = bank.data.find((item) => item.key === key);
const result = generators.generateQuestion(typeDef, params);
process.stdout.write(JSON.stringify(result));
"""
    env = {**os.environ, "TYPE_KEY": key, "PARAMS_JSON": json.dumps(params, ensure_ascii=False)}
    p = subprocess.run([NODE, "-e", js], capture_output=True, text=True, timeout=10, cwd=str(ROOT), env=env)
    if p.returncode != 0:
        return {"_error": p.stderr.strip()}
    return json.loads(p.stdout)


def check_answer(q, user_input):
    js = """
const validators = require("./tool/validators.js");
const q = JSON.parse(process.env.QUESTION_JSON);
const userInput = JSON.parse(process.env.USER_INPUT_JSON);
process.stdout.write(validators.checkAnswer(q, userInput) ? "true" : "false");
"""
    env = {
        **os.environ,
        "QUESTION_JSON": json.dumps(q, ensure_ascii=False),
        "USER_INPUT_JSON": json.dumps(user_input, ensure_ascii=False),
    }
    p = subprocess.run([NODE, "-e", js], capture_output=True, text=True, timeout=10, cwd=str(ROOT), env=env)
    if p.returncode != 0:
        return False
    return p.stdout.strip() == "true"


def main():
    if not NODE:
        print("node not available")
        sys.exit(2)
    bank = json.loads(BANK.read_text(encoding="utf-8"))
    failures = 0
    passes = 0

    print("=== Schema ===")
    if not CODE_RE.match("DSE-2025-P1-A1-01-NA-1"):
        print("  ERR: DSE reserved code example should match CODE_RE")
        failures += 1
    keys = {}
    codes = {}
    family_by_generator = {}
    for t in bank["data"]:
        required = (
            "key", "name", "category", "difficulty", "type", "checkType",
            "validator", "generator", "schemaVersion", "part", "code",
            "answers", "displayAnswer", "steps", "pdfText",
            "grade", "term", "topicKey", "topicName", "source",
        )
        for field in required:
            if field not in t or t[field] is None:
                print(f"  ERR: type missing '{field}': key={t.get('key','?')}")
                failures += 1
        if "generate" in t:
            print(f"  ERR: legacy generate string remains: key={t.get('key')}")
            failures += 1
        if t.get("key") in keys:
            print(f"  ERR: duplicate key: {t['key']}")
            failures += 1
        keys[t.get("key")] = t
        if t.get("code") in codes:
            print(f"  ERR: duplicate code: {t['code']}")
            failures += 1
        codes[t.get("code")] = t
        code_match = CODE_RE.match(str(t.get("code", "")))
        if not code_match:
            print(f"  ERR: invalid code format '{t.get('code')}' for key {t.get('key')}")
            failures += 1
        else:
            family_match = FAMILY_RE.search(str(t.get("code", "")))
            if not family_match:
                print(f"  ERR: code missing topic family suffix '{t.get('code')}' for key {t.get('key')}")
                failures += 1
                family = ""
            else:
                family = f"{family_match.group(1)}-{family_match.group(2)}"
            if family.startswith("UC-"):
                print(f"  ERR: UC family must have no current members: key={t.get('key')}")
                failures += 1
            generator = t.get("generator")
            if generator in family_by_generator and family_by_generator[generator] != family:
                print(f"  ERR: generator family mismatch for key {t.get('key')}: {family_by_generator[generator]} vs {family}")
                failures += 1
            family_by_generator[generator] = family
        if not isinstance(t.get("source"), str):
            print(f"  ERR: source must be string: key={t.get('key')}")
            failures += 1
        if t.get("type") not in SUPPORTED_TYPES:
            print(f"  ERR: unsupported type '{t.get('type')}' for key {t.get('key')}")
            failures += 1
        if t.get("checkType") not in SUPPORTED_CHECKS:
            print(f"  ERR: unsupported checkType '{t.get('checkType')}' for key {t.get('key')}")
            failures += 1
        if t.get("validator") != t.get("checkType"):
            print(f"  ERR: validator alias mismatch for key {t.get('key')}")
            failures += 1
        if t.get("type") == "choice" and not t.get("options"):
            print(f"  ERR: choice missing options: key={t.get('key')}")
            failures += 1
        if t.get("type") == "coordinate":
            if not t.get("answerSpec") or t["answerSpec"].get("coordinateMode") != "axis-value":
                print(f"  ERR: coordinate missing answerSpec.coordinateMode: key={t.get('key')}")
                failures += 1
            if not t.get("answerSpec", {}).get("interaction"):
                print(f"  ERR: coordinate missing answerSpec.interaction: key={t.get('key')}")
                failures += 1
        if t.get("type") == "congruence" and not t.get("figure"):
            print(f"  ERR: congruence missing figure: key={t.get('key')}")
            failures += 1

    registry_js = """
const generators = require("./tool/generators.js");
const validators = require("./tool/validators.js");
const bank = require("./question-bank.json");
const bad = [];
for (const item of bank.data) {
  if (!generators.hasGenerator(item.generator)) bad.push(`generator:${item.key}`);
  if (!validators.hasValidator(item.validator)) bad.push(`validator:${item.key}`);
}
process.stdout.write(JSON.stringify(bad));
"""
    out, err, rc = run_js(registry_js)
    bad_registry = json.loads(out) if rc == 0 else ["registry script failed: " + err]
    for item in bad_registry:
        print(f"  ERR: missing registry entry {item}")
        failures += 1
    if failures == 0:
        print("  OK")
        passes += 1

    print("=== Preset ===")
    preset_orders = {
        "s3_term3_part_a": [
            "poly_add_sub", "binomial_expand", "s3t3_square_expand", "s3t3_zero_exp",
            "factor_diff_sq", "factor_cross", "sci_notation", "solve_ineq",
            "triangle_center", "solid_sphere", "solid_cylinder", "solid_cone",
            "sector_measure", "pyth_cone",
        ],
        "s1_term3_part_a": [
            "frac_arith", "neg_power", "prime_factor", "hcf_or_lcm",
            "exp_law", "alg_simplify", "solve_eq", "word_to_alg",
            "sig_fig", "frac_to_pct", "poly_desc", "formula_sub",
            "congruence", "coordinate", "seq_nth", "data_type",
        ],
        "s1_term2_part_a": [
            "s1t2_prime_factor", "s1t2_hcf", "directed_add", "directed_mul",
            "s1t2_word_to_alg", "s1t2_solve_eq_fraction", "s1t2_solve_eq_negative",
            "cuboid_volume", "s1t2_poly_desc", "poly_constant", "s1t2_alg_simplify",
            "expand_bracket", "s1t2_coordinate", "quadrant",
        ],
        "s2_term3_part_a": [
            "alg_simplify_2var", "s2t3_square_expand_2var", "solve_eq_fraction", "solve_eq_bracket",
            "factor_neg_common", "s2t3_factor_diff_sq", "s2t3_sig_fig", "round_decimal",
            "combine_fractions", "s2t3_exp_law", "coef_exp_div", "ratio_three",
            "discount", "profit_pct", "square_root_pm", "cuboid_volume_cube",
        ],
    }
    generate_keys = []
    for preset_key, expected_order in preset_orders.items():
        preset = next((p for p in bank.get("presets", []) if p["key"] == preset_key), None)
        if not preset:
            print(f"  ERR: preset '{preset_key}' missing")
            failures += 1
            continue
        actual = [q["typeKey"] for q in preset["questions"]]
        if actual != expected_order:
            print(f"  ERR: {preset_key} order mismatch. expected={expected_order}")
            print(f"                 actual  ={actual}")
            failures += 1
        else:
            missing = [k for k in actual if k not in keys]
            if missing:
                print(f"  ERR: {preset_key} references missing types: {missing}")
                failures += 1
            else:
                print(f"  OK {preset_key} ({len(expected_order)} types in correct order)")
                passes += 1
                generate_keys.extend(expected_order)

    print("=== Generate + check ===")
    for key in generate_keys:
        t = keys.get(key)
        if not t:
            print(f"  {key:18s} SKIP (type missing)")
            continue
        ok_count = 0
        fail_count = 0
        for _trial in range(3):
            r = call_generate(bank, key, {})
            if r is None or r.get("_error"):
                print(f"  {key:18s} FAIL generate: {r}")
                fail_count += 1
                continue
            for field in ("questionHTML", "correctAnswer", "solutionHTML", "paramsUsed",
                          "answers", "displayAnswer", "steps", "pdfText", "checkType"):
                if field not in r:
                    print(f"  {key:18s} FAIL missing field: {field}")
                    fail_count += 1
            test_input = r["correctAnswer"]
            if r["checkType"] == "algebraQ8":
                test_input = r["answers"][0]
            if check_answer(r, test_input):
                ok_count += 1
            else:
                print(f"  {key:18s} FAIL correct answer rejected: {test_input}")
                fail_count += 1
        if fail_count == 0 and ok_count == 3:
            print(f"  {key:18s} OK    ({ok_count}/3 trials passed)")
            passes += 1
        else:
            failures += fail_count

    print()
    print(f"=== Summary: {passes} passed, {failures} failed ===")
    sys.exit(0 if failures == 0 else 1)


if __name__ == "__main__":
    main()
