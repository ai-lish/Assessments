#!/usr/bin/env python3
"""
Extended validation: run the full preset, verify each question, check that
the LaTeX in the rendered output uses correct single-backslash \( \) escapes,
verify the file size, and report the full 16-question sequence.
"""
import json
import re
import sys
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BANK = ROOT / "question-bank.json"
OUT = ROOT / "test" / "generated_practice.json"
NODE = subprocess.run(["which", "node"], capture_output=True, text=True).stdout.strip()

# Reuse the same answer checker from validate_bank
sys.path.insert(0, str(ROOT / "test"))
from validate_bank import call_generate, check_answer  # type: ignore


def latex_check(s):
    """Check LaTeX balance: count \( and \) — they should be even and balanced."""
    n_open  = s.count("\\(")
    n_close = s.count("\\)")
    return n_open, n_close


def main():
    if not NODE:
        print("node not available")
        sys.exit(2)
    bank = json.loads(BANK.read_text(encoding="utf-8"))
    preset = next(p for p in bank["presets"] if p["key"] == "s1_term3_part_a")

    generated = []
    failures = 0
    print("=== Full preset: 16 questions ===")
    for i, qspec in enumerate(preset["questions"], 1):
        key = qspec["typeKey"]
        r = call_generate(bank, key, {})
        if r is None or r.get("_error"):
            print(f"  Q{i:2d} {key:14s} FAIL generate: {r}")
            failures += 1
            continue
        # Check LaTeX balance
        n_open, n_close = latex_check(r["questionHTML"])
        # Verify correct answer passes
        if r["checkType"] == "choiceKey":
            user_input = r["correctAnswer"]
        elif r["checkType"] == "fracPct":
            user_input = r["correctAnswer"]
        elif r["checkType"] == "congruenceReason":
            user_input = r["correctAnswer"]
        elif r["checkType"] == "primeFactor":
            user_input = r["correctAnswer"]
        elif r["checkType"] == "algebraQ8":
            user_input = r["answers"][0]
        else:
            user_input = r["correctAnswer"]
        ok = check_answer(r, user_input)
        # Sanity: type-specific expected fields
        type_meta = next(t for t in bank["data"] if t["key"] == key)
        rtype = type_meta["type"]
        extra = ""
        if rtype == "coordinate":
            assert "interaction" in r, "coordinate missing interaction"
            assert r["interaction"]["targetX"] in {-2, -1, 1, 2}
            assert r["interaction"]["targetY"] in {-2, -1, 1, 2}
            extra = f"  grid=({r['interaction']['targetX']},{r['interaction']['targetY']}) axis={r['interaction']['askAxis']}"
        if rtype == "congruence":
            assert r.get("imageSvg"), "congruence missing imageSvg"
            extra = f"  reason={r['correctAnswer']}"
        if rtype == "choice":
            opts = type_meta.get("options") or []
            assert opts or r["correctAnswer"] in ("離散數據", "連續數據"), "choice missing options"
        latex_ok = (n_open == n_close)
        status = "OK" if (ok and latex_ok) else "FAIL"
        print(f"  Q{i:2d} {key:14s} {status}  latex: \\(={n_open} \\)={n_close}  ans={r['correctAnswer']!r}{extra}")
        if not ok or not latex_ok:
            failures += 1
        generated.append({
            "qid": f"q{i:03d}",
            "typeKey": key,
            "type": rtype,
            "checkType": type_meta["checkType"],
            "questionHTML": r["questionHTML"],
            "correctAnswer": r["correctAnswer"],
            "paramsUsed": r["paramsUsed"],
            "solutionHTML": r["solutionHTML"],
            "pdfText": r["pdfText"],
            "answers": r.get("answers", []),
            "displayAnswer": r["displayAnswer"],
            "steps": r.get("steps", ""),
            "options": type_meta.get("options"),
            "interaction": r.get("interaction"),
            "imageSvg": r.get("imageSvg"),
            "prefix": type_meta.get("prefix"),
            "suffix": type_meta.get("suffix"),
        })

    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps(generated, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nWrote {OUT}")

    # File size
    bank_size = BANK.stat().st_size
    print(f"question-bank.json: {bank_size:,} bytes ({bank_size/1024:.1f} KB)")

    print()
    print(f"=== {len(generated)} questions generated, {failures} failures ===")
    sys.exit(0 if failures == 0 else 1)


if __name__ == "__main__":
    main()
