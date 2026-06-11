#!/usr/bin/env python3
"""
Validate the question bank and simulate the full student flow.

Checks:
- Schema: every required field, supported type/checkType, key uniqueness
- Preset: 16 questions in correct order, all keys exist
- generate(): runs in node, returns required fields, no JS errors
- answer check: for each generated question, the correct user input passes

Outputs a structured pass/fail report.
"""
import json
import re
import sys
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BANK = ROOT / "question-bank.json"
NODE = subprocess.run(["which", "node"], capture_output=True, text=True).stdout.strip()

SUPPORTED_TYPES = {"text", "choice", "coordinate", "congruence"}
SUPPORTED_CHECKS = {
    None, "textExact", "numeric", "fracPct",
    "primeFactor", "algebraQ8", "hcfLcm",
    "choiceKey", "congruenceReason", "coordinatePoint"
}

def run_js(code, timeout=10):
    p = subprocess.run([NODE, "-e", code], capture_output=True, text=True, timeout=timeout)
    return p.stdout, p.stderr, p.returncode

def get_type(bank, key):
    for t in bank["data"]:
        if t["key"] == key:
            return t
    return None

def call_generate(bank, key, params):
    t = get_type(bank, key)
    if not t: return None
    js = f"const g = {t['generate']};\nconst r = g({json.dumps(params, ensure_ascii=False)});\nprocess.stdout.write(JSON.stringify(r));"
    out, err, rc = run_js(js)
    if rc != 0:
        return {"_error": err.strip()}
    return json.loads(out)

def check_answer(q, user_input):
    """Simulate the AnswerChecker logic from the student template."""
    ct = q.get("checkType") or "textExact"
    s = (user_input or "").strip()
    s_norm = re.sub(r"\s+", "", s).upper().replace("×", "X").replace("*", "X").replace("÷", "/")
    if ct == "textExact":
        for ans in q.get("answers") or [q.get("correctAnswer", "")]:
            a = re.sub(r"\s+", "", str(ans)).upper().replace("×", "X").replace("*", "X").replace("÷", "/")
            if a == s_norm: return True
        # numeric tolerance
        try:
            return abs(float(s) - float(q["correctAnswer"])) < 0.01
        except Exception:
            return False
    if ct == "hcfLcm":
        return s == str(q["correctAnswer"]).strip()
    if ct == "numeric":
        try:
            return abs(float(s) - float(q["correctAnswer"])) < 0.01
        except Exception:
            return False
    if ct == "fracPct":
        # accept "75%" or "75 %" or "75"
        s_no_pct = s.replace("%", "").strip()
        ans = q["correctAnswer"].replace("%", "").strip()
        return s_no_pct == ans
    if ct == "choiceKey":
        return s_norm == str(q["correctAnswer"]).strip().upper()
    if ct == "congruenceReason":
        return s_norm in [str(a).upper() for a in (q.get("answers") or [q["correctAnswer"]])]
    if ct == "primeFactor":
        # parse user like "2^2x3" (raw format) and compare to primeFactors
        # Reject expanded forms like "2x2x3" (same base appearing more than once)
        if not s: return False
        s = s.upper().replace(" ", "").replace("×", "X").replace("*", "X")
        if "X" not in s: return False
        tokens = [t for t in s.split("X") if t]
        if not tokens: return False
        m = {}
        for tok in tokens:
            mm = re.match(r"^(\d+)(?:\^(\d+))?$", tok)
            if not mm: return False
            base = int(mm.group(1))
            exp = int(mm.group(2)) if mm.group(2) else 1
            m[base] = m.get(base, 0) + exp
        # Reject if same base repeats across tokens (expanded form)
        for tok in tokens:
            base_match = re.match(r"^(\d+)", tok)
            if base_match:
                base = base_match.group(1)
                if sum(1 for t in tokens if t.startswith(base)) > 1:
                    return False
        # primeFactors in JSON has string keys; convert
        expected = {int(k): v for k, v in (q.get("primeFactors") or {}).items()}
        return m == expected
    if ct == "algebraQ8":
        # structural check, depends on q8subtype
        u = s.replace(" ", "").replace("÷", "/").replace("×", "X").replace("*", "X").upper()
        t = q.get("q8subtype")
        ans = (q.get("answers") or [""])[0]
        if t == 1:
            m = re.match(r"^(\d+)x-(\d+)$", ans.replace(" ", ""))
            if not m: return False
            return u == f"{m.group(1)}X-{m.group(2)}"
        if t == 2:
            m = re.match(r"^\(x-(\d+)\)/(\d+)$", ans.replace(" ", ""))
            if not m: return False
            return u == f"(X-{m.group(1)})/{m.group(2)}"
        if t == 3:
            m = re.match(r"^(\d+)\(x\+(\d+)\)$", ans.replace(" ", ""))
            if not m: return False
            b, a = m.group(1), m.group(2)
            return u in {f"{b}(X+{a})", f"(X+{a}){b}", f"{b}*(X+{a})", f"(X+{a})*{b}"}
        if t == 4:
            m = re.match(r"^x/(\d+)\+(\d+)$", ans.replace(" ", ""))
            if not m: return False
            return u == f"X/{m.group(1)}+{m.group(2)}"
        if t == 5:
            m = re.match(r"^(\d+)\((\d+)-x\)$", ans.replace(" ", ""))
            if not m: return False
            b, a = m.group(1), m.group(2)
            return u in {f"{b}({a}-X)", f"({a}-X){b}", f"{b}*({a}-X)", f"({a}-X)*{b}"}
        return False
    if ct == "coordinatePoint":
        # handled separately (text + click). Here we just check the text part.
        return s == str(q["correctAnswer"])
    return False


def main():
    if not NODE:
        print("node not available")
        sys.exit(2)
    bank = json.loads(BANK.read_text(encoding="utf-8"))
    failures = 0
    passes = 0

    # Schema
    print("=== Schema ===")
    keys = {}
    for t in bank["data"]:
        for required in ("key", "name", "category", "difficulty", "type", "checkType",
                         "answers", "displayAnswer", "steps", "pdfText"):
            if required not in t:
                print(f"  ERR: type missing '{required}': key={t.get('key','?')}")
                failures += 1
        if "key" in t:
            if t["key"] in keys:
                print(f"  ERR: duplicate key: {t['key']}")
                failures += 1
            keys[t["key"]] = t
        if t.get("type") not in SUPPORTED_TYPES:
            print(f"  ERR: unsupported type '{t.get('type')}' for key {t.get('key')}")
            failures += 1
        if t.get("checkType") not in SUPPORTED_CHECKS:
            print(f"  ERR: unsupported checkType '{t.get('checkType')}' for key {t.get('key')}")
            failures += 1
    if all(t.get("type") in SUPPORTED_TYPES and t.get("checkType") in SUPPORTED_CHECKS
           and all(r in t for r in ("key","name","category","difficulty","type","checkType",
                                    "answers","displayAnswer","steps","pdfText"))
           for t in bank["data"]):
        print("  OK")
        passes += 1

    # Preset
    print("=== Preset ===")
    expected_order = [
        "frac_arith", "neg_power", "prime_factor", "hcf_or_lcm",
        "exp_law", "alg_simplify", "solve_eq", "word_to_alg",
        "sig_fig", "frac_to_pct", "poly_desc", "formula_sub",
        "congruence", "coordinate", "seq_nth", "data_type"
    ]
    preset = next((p for p in bank.get("presets", []) if p["key"] == "s1_term3_part_a"), None)
    if not preset:
        print("  ERR: preset 's1_term3_part_a' missing")
        failures += 1
    else:
        actual = [q["typeKey"] for q in preset["questions"]]
        if actual != expected_order:
            print(f"  ERR: order mismatch. expected={expected_order}")
            print(f"                 actual  ={actual}")
            failures += 1
        else:
            for k in actual:
                if k not in keys:
                    print(f"  ERR: preset references missing type: {k}")
                    failures += 1
        if not any(True for _ in [None]) and not (failures > 0):
            print(f"  OK ({len(expected_order)} types in correct order)")
            passes += 1

    # Generate & check: run each type 5 times to get a stable answer pattern
    print("=== Generate + check ===")
    for key in expected_order:
        t = keys.get(key)
        if not t:
            print(f"  {key:18s} SKIP (type missing)")
            continue
        # Run multiple times to check stability
        ok_count = 0
        fail_count = 0
        for trial in range(3):
            r = call_generate(bank, key, {})
            if r is None or r.get("_error"):
                print(f"  {key:18s} FAIL generate: {r}")
                fail_count += 1
                continue
            # Validate returned fields
            for f in ("questionHTML", "correctAnswer", "solutionHTML", "paramsUsed",
                      "answers", "displayAnswer", "steps", "pdfText", "checkType"):
                if f not in r:
                    print(f"  {key:18s} FAIL missing field: {f}")
                    fail_count += 1
                    break
            else:
                # Test that the correct answer actually passes the check
                if r["checkType"] == "choiceKey":
                    test_input = r["correctAnswer"]
                elif r["checkType"] == "fracPct":
                    test_input = r["correctAnswer"]  # "75%"
                elif r["checkType"] == "congruenceReason":
                    test_input = r["correctAnswer"]  # "S.S.S."
                elif r["checkType"] == "primeFactor":
                    test_input = r["correctAnswer"]  # "2^2x3"
                elif r["checkType"] == "algebraQ8":
                    test_input = r["answers"][0]
                else:
                    test_input = r["correctAnswer"]
                if check_answer(r, test_input):
                    ok_count += 1
                else:
                    print(f"  {key:18s} FAIL check: correct={r['correctAnswer']!r} test={test_input!r}")
                    fail_count += 1
        if fail_count == 0:
            print(f"  {key:18s} OK    ({ok_count}/3 trials passed)")
            passes += 1
        else:
            failures += 1

    print()
    print(f"=== Summary: {passes} passed, {failures} failed ===")
    sys.exit(0 if failures == 0 else 1)


if __name__ == "__main__":
    main()
