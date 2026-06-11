#!/usr/bin/env python3
"""
For each of the 18 question entries in test/parts/*.txt, insert
grade/term/topicKey/topicName fields right after `difficulty`.

This keeps the parts/ source of truth in sync with question-bank.json
so future bank rebuilds (via assemble.py) preserve the new fields.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PARTS_DIR = ROOT / "parts"

# (key, grade, term, topicKey, topicName) — order matches bank from add_grade_topics.py
ASSIGN = [
    ("area_circle",   "",   "",   "uncategorized",       "未分類"),
    ("angle_type",    "",   "",   "uncategorized",       "未分類"),
    ("frac_arith",    "s1", "3",  "number_and_algebra",  "數與代數"),
    ("neg_power",     "s1", "3",  "number_and_algebra",  "數與代數"),
    ("prime_factor",  "s1", "3",  "number_and_algebra",  "數與代數"),
    ("hcf_or_lcm",    "s1", "3",  "number_and_algebra",  "數與代數"),
    ("exp_law",       "s1", "3",  "number_and_algebra",  "數與代數"),
    ("alg_simplify",  "s1", "3",  "number_and_algebra",  "數與代數"),
    ("solve_eq",      "s1", "3",  "number_and_algebra",  "數與代數"),
    ("word_to_alg",   "s1", "3",  "number_and_algebra",  "數與代數"),
    ("sig_fig",       "s1", "3",  "measurement",         "度量"),
    ("frac_to_pct",   "s1", "3",  "measurement",         "度量"),
    ("poly_desc",     "s1", "3",  "number_and_algebra",  "數與代數"),
    ("formula_sub",   "s1", "3",  "number_and_algebra",  "數與代數"),
    ("congruence",    "s1", "3",  "geometry",            "幾何"),
    ("coordinate",    "s1", "3",  "geometry",            "幾何"),
    ("seq_nth",       "s1", "3",  "number_and_algebra",  "數與代數"),
    ("data_type",     "s1", "3",  "data_handling",       "數據處理"),
]

def insert_after_difficulty(text, key, grade, term, tk, tn):
    """Find the entry for `key` and insert grade/term/topicKey/topicName after its difficulty line."""
    # Find pattern:  "key": "<key>",\n      "name": ...,\n      "category": ...,\n      "difficulty": <n>,
    pat = re.compile(
        r'(\"key\":\s*\"' + re.escape(key) + r'\",\s*\n'
        r'\s*\"name\":[^\n]+,\s*\n'
        r'\s*\"category\":[^\n]+,\s*\n'
        r'\s*\"difficulty\":\s*\d+,)'
    )
    new_fields = (
        f'\n      "grade": "{grade}",'
        f'\n      "term": "{term}",'
        f'\n      "topicKey": "{tk}",'
        f'\n      "topicName": "{tn}",'
    )
    new_text, count = pat.subn(r'\1' + new_fields, text, count=1)
    if count != 1:
        raise SystemExit(f"Could not find entry for {key}")
    return new_text

def main():
    full = ""
    for part in sorted(PARTS_DIR.glob("*.txt")):
        full += part.read_text(encoding="utf-8")
    # Apply edits to the concatenated text
    for key, g, term, tk, tn in ASSIGN:
        full = insert_after_difficulty(full, key, g, term, tk, tn)
    # Re-distribute back to part files proportionally.
    # Simpler: rewrite each part by finding its lines via the same offsets.
    # Approach: split the full text by scanning for each `key` entry start.
    # Instead: re-emit each part file by reading the original concatenated full text
    # and reassigning lines to parts. Even simpler: do per-part insert directly.
    pass

def main_v2():
    """Edit each part file individually."""
    for part in sorted(PARTS_DIR.glob("*.txt")):
        text = part.read_text(encoding="utf-8")
        original = text
        for key, g, term, tk, tn in ASSIGN:
            # Only edit if the key is present in this part AND the entry doesn't already have grade
            if f'"key": "{key}"' not in text:
                continue
            # Check if THIS entry's nearby context already has grade
            # Look ahead ~10 lines from the key declaration
            kpos = text.find(f'"key": "{key}"')
            lookahead = text[kpos:kpos+800]
            if '"grade":' in lookahead:
                continue
            text = insert_after_difficulty(text, key, g, term, tk, tn)
        if text != original:
            part.write_text(text, encoding="utf-8")
            print(f"  ✓ updated {part.name}")
        else:
            print(f"  - skipped {part.name} (no change or already has grade)")

if __name__ == "__main__":
    main_v2()
