#!/usr/bin/env python3
"""
Add grade/term/topicKey/topicName to all 18 types in question-bank.json.

Topics for the 16 S1 Term 3 question types, derived from PLANNING/20260611_ASSESSMENTS_TEACHER_TOOL_V1.md §6.1
(中一第三學期甲部 16 個課題):

  1. 分數運算         (frac_arith)         -> 數與代數
  2. 負數的乘方       (neg_power)          -> 數與代數
  3. 質因數分解       (prime_factor)       -> 數與代數
  4. HCF／LCM         (hcf_or_lcm)         -> 數與代數
  5. 指數律           (exp_law)            -> 數與代數
  6. 代數化簡         (alg_simplify)       -> 數與代數
  7. 解方程           (solve_eq)           -> 數與代數
  8. 文字轉代數式     (word_to_alg)        -> 數與代數
  9. 有效數字         (sig_fig)            -> 度量
 10. 分數化百分數     (frac_to_pct)        -> 度量
 11. 多項式降冪排列   (poly_desc)          -> 數與代數
 12. 公式代入         (formula_sub)        -> 數與代數
 13. 全等三角形       (congruence)         -> 幾何
 14. 坐標輸入及點選   (coordinate)         -> 幾何
 15. 數列通項         (seq_nth)            -> 數與代數
 16. 離散／連續數據   (data_type)          -> 數據處理

Demo types `area_circle` and `angle_type` are kept as 'uncategorized' so the bank
load is not blocked, per PLANNING §4.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BANK = ROOT / "question-bank.json"

# key -> (grade, term, topicKey, topicName)
ASSIGN = {
    "frac_arith":     ("s1", "3", "number_and_algebra", "數與代數"),
    "neg_power":      ("s1", "3", "number_and_algebra", "數與代數"),
    "prime_factor":   ("s1", "3", "number_and_algebra", "數與代數"),
    "hcf_or_lcm":     ("s1", "3", "number_and_algebra", "數與代數"),
    "exp_law":        ("s1", "3", "number_and_algebra", "數與代數"),
    "alg_simplify":   ("s1", "3", "number_and_algebra", "數與代數"),
    "solve_eq":       ("s1", "3", "number_and_algebra", "數與代數"),
    "word_to_alg":    ("s1", "3", "number_and_algebra", "數與代數"),
    "sig_fig":        ("s1", "3", "measurement",         "度量"),
    "frac_to_pct":    ("s1", "3", "measurement",         "度量"),
    "poly_desc":      ("s1", "3", "number_and_algebra", "數與代數"),
    "formula_sub":    ("s1", "3", "number_and_algebra", "數與代數"),
    "congruence":     ("s1", "3", "geometry",            "幾何"),
    "coordinate":     ("s1", "3", "geometry",            "幾何"),
    "seq_nth":        ("s1", "3", "number_and_algebra", "數與代數"),
    "data_type":      ("s1", "3", "data_handling",       "數據處理"),
    # demo types — uncategorized
    "area_circle":    ("",    "",  "uncategorized",      "未分類"),
    "angle_type":     ("",    "",  "uncategorized",      "未分類"),
}

def main():
    data = json.loads(BANK.read_text(encoding="utf-8"))
    seen_keys = set()
    for t in data["data"]:
        if t["key"] in seen_keys:
            raise SystemExit(f"Duplicate key: {t['key']}")
        seen_keys.add(t["key"])
        if t["key"] not in ASSIGN:
            raise SystemExit(f"No assignment for key: {t['key']}")
        g, term, tk, tn = ASSIGN[t["key"]]
        t["grade"] = g
        t["term"] = term
        t["topicKey"] = tk
        t["topicName"] = tn
    BANK.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✓ Updated {len(data['data'])} types with grade/term/topicKey/topicName")
    # Print coverage summary
    print("\n=== Coverage summary ===")
    by_grade = {}
    for t in data["data"]:
        g = t["grade"] or "(uncategorized)"
        by_grade.setdefault(g, []).append(t["key"])
    for g, keys in sorted(by_grade.items()):
        print(f"  {g}: {len(keys)} types")
        for k in keys:
            print(f"    - {k}  ({next(t for t in data['data'] if t['key']==k)['topicName']})")

if __name__ == "__main__":
    main()
