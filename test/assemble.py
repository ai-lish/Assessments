#!/usr/bin/env python3
"""Assemble question-bank.json from parts/ directory."""
import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PARTS_DIR = ROOT / "test" / "parts"
OUT = ROOT / "question-bank.json"

parts = sorted(PARTS_DIR.glob("*.txt"))
print(f"Reading {len(parts)} parts: {[p.name for p in parts]}")
raw = "".join(p.read_text(encoding="utf-8") for p in parts)

# Try to parse
try:
    data = json.loads(raw)
    print(f"✓ JSON parsed successfully")
    print(f"  - {len(data['data'])} types")
    print(f"  - {len(data.get('presets', []))} presets")
    for p in data.get("presets", []):
        print(f"    preset '{p['key']}': {len(p['questions'])} questions")
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✓ Wrote {OUT}")
except json.JSONDecodeError as e:
    print(f"✗ JSON parse failed: {e}")
    # Find the error location
    lines = raw.split("\n")
    if e.lineno <= len(lines):
        start = max(0, e.lineno - 3)
        end = min(len(lines), e.lineno + 3)
        for i in range(start, end):
            marker = ">>>" if i + 1 == e.lineno else "   "
            print(f"  {marker} {i+1:5d}: {lines[i][:200]}")
    sys.exit(1)
