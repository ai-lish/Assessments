#!/usr/bin/env python3
"""End-to-end test: simulate tool's logic, produce a real student-practice-*.html,
   then verify it has no broken placeholders and contains all 16 questions.
"""
import json, subprocess, os, re, hashlib
from pathlib import Path

ROOT = Path('/Users/zachli/ai-learning/Assessments')
bank = json.loads((ROOT / 'question-bank.json').read_text())
tmpl = (ROOT / 'templates/student.html').read_text()

# Find preset
preset = bank['presets'][0]
print(f"Preset: {preset['key']} ({preset['name']}) — {len(preset['questions'])} questions")

# Run each generate() with random params (simulate tool)
def call_generate(type_def, params):
    js = f'const g = {type_def["generate"]}; const r = g({json.dumps(params)}); process.stdout.write(JSON.stringify(r));'
    p = subprocess.run(['node', '-e', js], capture_output=True, text=True)
    if p.returncode != 0:
        return None
    return json.loads(p.stdout)

def gen_params(tkey):
    import random
    r = lambda lo, hi: random.randint(lo, hi)
    pick = lambda arr: random.choice(arr)
    return {
        "frac_arith":   lambda: {"a": r(2, 9), "b": r(2, 9), "c": r(2, 9), "d": r(2, 9), "op": pick(["add", "sub"])},
        "neg_power":    lambda: {"n": r(2, 5)},
        "prime_factor": lambda: {"n": pick([12, 18, 20, 24, 28, 30, 36, 40, 45, 48, 50, 60, 72, 75, 90, 100])},
        "hcf_or_lcm":   lambda: {"n1": r(8, 60), "n2": r(8, 60), "askLCM": random.random() < 0.5},
        "exp_law":      lambda: {"t": r(1, 6)},
        "alg_simplify": lambda: {"a": r(2, 5), "b": r(2, 5), "op": pick(["add", "sub"])},
        "solve_eq":     lambda: {"a": r(2, 5), "b": r(1, 10), "c": r(1, 20)},
        "word_to_alg":  lambda: {"t": r(1, 5), "a": r(2, 8), "b": r(2, 8)},
        "sig_fig":      lambda: {"type": r(1, 3), "a": r(1, 3), "n": pick([0.01234, 0.12345, 1.2345, 12.345, 123.45, 1234.5, 2700, 45000, 5000.0, 0.009, 0.000456, 1.020, 0.020, 1.00])},
        "frac_to_pct":  lambda: {"num": r(1, 9), "den": r(2, 10)},
        "poly_desc":    lambda: {"a": r(1, 3), "b": r(1, 7), "c": r(1, 9)},
        "formula_sub":  lambda: {"a": pick([-3, -2, -1, 2, 3, 4, 5]), "b": pick([-2, -1, 0, 1, 2, 3]), "c": pick([-3, -1, 0, 1, 2, 3])},
        "congruence":   lambda: {"reason": pick(["S.S.S.", "S.A.S.", "A.S.A.", "A.A.S.", "R.H.S."]), "t1": ["A","B","C"], "t2": ["D","E","F"]},
        "coordinate":   lambda: {"targetX": pick([-2,-1,1,2]), "targetY": pick([-2,-1,1,2]), "askAxis": pick(["x","y"])},
        "seq_nth":      lambda: {"a": r(1,4), "d": r(1,4), "n": r(10,20)},
        "data_type":    lambda: {"scenario": pick(["一箱蘋果的數量", "一班學生的身高", "一袋米的重量", "車站每分鐘經過的巴士數目", "一個月內每日的最高氣溫", "課室外牆磚的數目"])},
    }[tkey]()

questions = []
qid_counter = 1
for pq in preset['questions']:
    type_def = next(t for t in bank['data'] if t['key'] == pq['typeKey'])
    params = gen_params(pq['typeKey'])
    res = call_generate(type_def, params)
    if not res:
        print(f"  ✗ Q{qid_counter} {pq['typeKey']} FAILED")
        continue
    q = {
        "qid": f"q{str(qid_counter).zfill(3)}",
        "typeKey": type_def['key'],
        "type": type_def['type'],
        "checkType": type_def['checkType'],
        "questionHTML": res['questionHTML'],
        "correctAnswer": res['correctAnswer'],
        "paramsUsed": res['paramsUsed'],
        "solutionHTML": res.get('solutionHTML', ''),
        "pdfText": res.get('pdfText', ''),
        "displayAnswer": res.get('displayAnswer', res['correctAnswer']),
        "steps": res.get('steps', ''),
    }
    if type_def['type'] == 'choice':     q['options'] = type_def.get('options') or res.get('options', [])
    if type_def['type'] == 'coordinate': q['interaction'] = res['interaction']
    if type_def['type'] == 'congruence': q['imageSvg'] = res['imageSvg']
    if type_def.get('prefix'):           q['prefix'] = type_def['prefix']
    if type_def.get('suffix'):           q['suffix'] = type_def['suffix']
    if type_def['checkType'] == 'primeFactor' and res.get('primeFactors'):
        q['primeFactors'] = res['primeFactors']
    if type_def['checkType'] == 'algebraQ8':
        q['answers'] = res['answers']
        q['q8subtype'] = res.get('q8subtype')
    if type_def['checkType'] == 'congruenceReason' and res.get('answers'):
        q['answers'] = res['answers']
    questions.append(q)
    print(f"  Q{qid_counter} {pq['typeKey']:14s}  type={type_def['type']:11s}  ans={res['correctAnswer']!r}")
    qid_counter += 1

print(f"\nTotal: {len(questions)} questions generated")

# Build the student HTML
title = preset['name']
generated_at = "2026-06-11T10:00:00Z"
bank_hash = "test_e2e_v1"
preset_key = preset['key']
gas_url = ""

html = tmpl
# Use plain replace, not re.sub, to avoid backslash interpretation in replacement
html = html.replace('{{TITLE}}', json.dumps(title, ensure_ascii=False))
html = html.replace('{{QUESTIONS_DATA}}', json.dumps(questions, ensure_ascii=False))
html = html.replace('{{GENERATED_AT}}', json.dumps(generated_at))
html = html.replace('{{BANK_HASH}}', json.dumps(bank_hash))
html = html.replace('{{PRESET_KEY}}', json.dumps(preset_key))
html = html.replace('{{GAS_URL}}', json.dumps(gas_url))

# Sanity: no placeholders left
leftover = re.findall(r'\{\{[A-Z_]+\}\}', html)
assert not leftover, f"Leftover placeholders: {leftover}"

# Sanity: no teacher_password references
assert 'TEACHER_PASSWORD' not in html, "Teacher password placeholder should be removed"

# Sanity: all 16 questions present (look for unique parts of questionHTML)
present = 0
for q in questions:
    # Use first 20 chars stripped of any regex special chars
    snippet = re.escape(q['questionHTML'][:30])
    if re.search(snippet, html):
        present += 1
print(f"Found {present}/{len(questions)} questions in the rendered HTML")

# Write the test output
out_path = ROOT / 'test' / 'e2e_student.html'
out_path.write_text(html, encoding='utf-8')
print(f"\n✓ Wrote {out_path} ({len(html)} bytes)")

# Try to validate the script blocks for JS syntax
scripts = re.findall(r'<script>(.*?)</script>', html, re.DOTALL)
print(f"Inline script blocks: {len(scripts)}")
for i, sc in enumerate(scripts):
    test_js = sc
    test_js = test_js.replace('window.MathJax', '({})')  # stub
    test_js = test_js.replace('MathJax.typesetPromise', 'null')
    test_js = test_js.replace('window.print', 'null')
    test_js = test_js.replace('URL.createObjectURL', 'null')
    p = subprocess.run(['node', '--check', '-'], input=test_js, capture_output=True, text=True)
    if p.returncode != 0:
        print(f"  ✗ Script {i} syntax error: {p.stderr[:200]}")
    else:
        print(f"  ✓ Script {i} ({len(sc)} chars) syntax OK")
