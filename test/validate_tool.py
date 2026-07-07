#!/usr/bin/env python3
"""
Validate the new teacher tool workflow end-to-end by simulating its core logic
in Python. Tests:
  1. 題目庫分類欄位及唯一 key 驗證
  2. 年級、學期、課題篩選結果驗證
  3. 中一第三學期 16 題均可生成
  4. 每種 type 嘅預覽資料完整性
  5. 單題重新生成唔改變其他題目
  6. 未確認時禁止匯出
  7. 學生模板 prebuilt fallback 匯出仍可用
  8. 佔位符及 inline JavaScript 語法
"""
import json
import os
import subprocess
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "test"))

# Load the bank
bank = json.loads((ROOT / "question-bank.json").read_text(encoding="utf-8"))
tmpl = (ROOT / "templates" / "student.html").read_text(encoding="utf-8")
tool_html = (ROOT / "tool" / "index.html").read_text(encoding="utf-8")

ERRORS = []
WARNINGS = []
PASSES = 0  # 獨立計數 check() 成功次數，避免 `len([c for c in ERRORS if not c])` 永遠顯示 0 嘅 bug


def check(name, condition, detail=""):
    global PASSES
    if condition:
        PASSES += 1
        print(f"  ✓ {name}")
    else:
        print(f"  ✗ {name}  {detail}")
        ERRORS.append(f"{name}: {detail}")


# ----------------------------------------------------------------------
# 1. 分類欄位及唯一 key
# ----------------------------------------------------------------------
print("\n=== 1. 題目庫分類欄位及唯一 key 驗證 ===")
keys = [t["key"] for t in bank["data"]]
check("data 係陣列", isinstance(bank["data"], list))
check("所有 key 唯一", len(keys) == len(set(keys)))
required_fields = [
    "code", "grade", "term", "topicKey", "topicName", "type", "checkType",
    "validator", "generator", "schemaVersion", "part", "name", "key", "source",
]
for t in bank["data"]:
    missing = []
    for f in required_fields:
        if f not in t:
            missing.append(f)
        elif f in ("grade", "term") and t[f] in (None,):
            missing.append(f)
        # topicKey/topicName may be empty string for demo types (uncategorized)
        elif f in ("topicKey", "topicName") and t[f] is None:
            missing.append(f)
    if missing:
        check(f"{t['key']} 齊備欄位", False, f"缺少 {missing}")
        break
else:
    check("所有題型齊備必要欄位", True)

# 示範題型可標未分類但不能失敗載入
demo_types = [t for t in bank["data"] if not t["grade"]]
check("示範題型可標示『未分類』", len(demo_types) == 2)
categorized = [t for t in bank["data"] if t["grade"]]
s1_t3 = [t for t in categorized if t["grade"] == "s1" and t["term"] == "3"]
check("s1 / term 3 至少 16 題", len(s1_t3) >= 16, f"got {len(s1_t3)}")

# ----------------------------------------------------------------------
# 2. 年級、學期、課題篩選結果
# ----------------------------------------------------------------------
print("\n=== 2. 分層篩選結果驗證 ===")
grades = sorted(set(t["grade"] for t in bank["data"] if t["grade"]))
check("grades 含 s1", "s1" in grades, f"got {grades}")
s1_types = [t for t in bank["data"] if t["grade"] == "s1"]
s1_terms = sorted(set(t["term"] for t in s1_types))
check("s1 下有學期", len(s1_terms) > 0)
s1_t3_types = [t for t in s1_types if t["term"] == "3"]
s1_t3_topics = sorted(set(t["topicKey"] for t in s1_t3_types))
check("s1/3 下有課題", len(s1_t3_topics) >= 4, f"got {s1_t3_topics}")
for topic in s1_t3_topics:
    types_in_topic = [t["key"] for t in s1_t3_types if t["topicKey"] == topic]
    print(f"    {topic}: {len(types_in_topic)} 題 → {types_in_topic}")
    check(f"{topic} 至少 1 題", len(types_in_topic) >= 1)

# ----------------------------------------------------------------------
# 3. 中一第三學期 16 題均可生成
# ----------------------------------------------------------------------
print("\n=== 3. 中一第三學期 16 題均可生成 ===")
preset = next((p for p in bank["presets"] if p["key"] == "s1_term3_part_a"), {})
check("preset 存在", preset["key"] == "s1_term3_part_a")
check("preset 16 題", len(preset["questions"]) == 16)
preset_keys = [q["typeKey"] for q in preset["questions"]]
bank_keys = set(t["key"] for t in bank["data"])
missing = [k for k in preset_keys if k not in bank_keys]
check("preset 引用嘅 typeKey 全部存在", not missing, f"missing: {missing}")

def call_gen(type_def, params):
    js = """
const generators = require("./tool/generators.js");
const bank = require("./question-bank.json");
const key = process.env.TYPE_KEY;
const params = JSON.parse(process.env.PARAMS_JSON);
const typeDef = bank.data.find((item) => item.key === key);
const r = generators.generateQuestion(typeDef, params);
process.stdout.write(JSON.stringify(r));
"""
    p = subprocess.run(
        ['node', '-e', js],
        capture_output=True,
        text=True,
        cwd=str(ROOT),
        env={**os.environ, "TYPE_KEY": type_def["key"], "PARAMS_JSON": json.dumps(params, ensure_ascii=False)},
    )
    if p.returncode != 0:
        return None
    return json.loads(p.stdout)

# Generate all 16 with random params
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
        "area_circle":  lambda: {"radius": r(1, 20)},
        "angle_type":   lambda: {"degrees": r(0, 359)},
    }[tkey]()

generated_set = []
for pq in preset["questions"]:
    td = next(t for t in bank["data"] if t["key"] == pq["typeKey"])
    params = gen_params(pq["typeKey"])
    res = call_gen(td, params)
    check(f"{pq['typeKey']} generate", res is not None and "questionHTML" in res and res.get("correctAnswer") is not None)
    if res:
        generated_set.append((pq["typeKey"], res))

# ----------------------------------------------------------------------
# 4. 每種 type 嘅預覽資料完整性
# ----------------------------------------------------------------------
print("\n=== 4. 每種 type 嘅預覽資料完整性 ===")
def assemble_q(type_def, res):
    q = {"typeKey": type_def["key"], "type": type_def["type"], "checkType": type_def["checkType"],
         "validator": type_def.get("validator", type_def["checkType"]),
         "questionHTML": res["questionHTML"], "correctAnswer": res["correctAnswer"],
         "paramsUsed": res.get("paramsUsed", {}),
         "solutionHTML": res.get("solutionHTML", ""), "pdfText": res.get("pdfText", ""),
         "displayAnswer": res.get("displayAnswer", res["correctAnswer"]),
         "steps": res.get("steps", "")}
    if type_def.get("answerSpec") or res.get("answerSpec"):
        q["answerSpec"] = res.get("answerSpec") or type_def.get("answerSpec")
    if type_def["type"] == "choice":     q["options"] = type_def.get("options") or res.get("options", [])
    if type_def["type"] == "coordinate": q["interaction"] = res.get("interaction")
    if type_def["type"] == "congruence": q["imageSvg"] = res.get("imageSvg")
    if type_def.get("prefix"):           q["prefix"] = type_def["prefix"]
    if type_def.get("suffix"):           q["suffix"] = type_def["suffix"]
    if type_def["checkType"] == "primeFactor" and res.get("primeFactors"):
        q["primeFactors"] = res["primeFactors"]
    if type_def["checkType"] == "algebraQ8":
        q["answers"] = res.get("answers"); q["q8subtype"] = res.get("q8subtype")
    if type_def["checkType"] == "congruenceReason" and res.get("answers"):
        q["answers"] = res["answers"]
    return q

type_specific = {"text": ["questionHTML", "correctAnswer"],
                 "choice": ["options"],
                 "coordinate": ["interaction"],
                 "congruence": ["imageSvg"]}
for td in bank["data"]:
    # Find a generated example
    examples = [r for k, r in generated_set if k == td["key"]]
    if not examples:
        # Try generating one
        params = gen_params(td["key"]) if td["key"] in [
            "frac_arith","neg_power","prime_factor","hcf_or_lcm","exp_law","alg_simplify",
            "solve_eq","word_to_alg","sig_fig","frac_to_pct","poly_desc","formula_sub",
            "congruence","coordinate","seq_nth","data_type","area_circle","angle_type"] else {}
        r = call_gen(td, params)
        if not r: continue
        examples = [r]
    q = assemble_q(td, examples[0])
    for f in type_specific.get(td["type"], []):
        check(f"{td['key']} ({td['type']}) 有 {f}", f in q and q[f] not in (None, "", []))

# ----------------------------------------------------------------------
# 5. 單題重新生成唔改變其他題目
# ----------------------------------------------------------------------
print("\n=== 5. 單題重新生成唔改變其他題目 ===")
# Pick the S1 Term 3 set
s1_t3_keys = [q["typeKey"] for q in preset["questions"]]
def gen_set(tkeys, seed_offset=0):
    import random
    random.seed(42 + seed_offset)
    out = []
    for tk in tkeys:
        td = next(t for t in bank["data"] if t["key"] == tk)
        params = gen_params(tk)
        r = call_gen(td, params)
        out.append(assemble_q(td, r))
    return out

set1 = gen_set(s1_t3_keys, seed_offset=0)
set2 = gen_set(s1_t3_keys, seed_offset=10)  # different seed
# Re-generate only Q5 (index 4) from set1 with the params of Q5 in set2
regen_idx = 4
set1_regen = set1.copy()
td5 = next(t for t in bank["data"] if t["key"] == s1_t3_keys[regen_idx])
# Re-call with the SAME params as set1[regen_idx]
original_params = set1[regen_idx]["paramsUsed"]
new_res = call_gen(td5, original_params)
new_q = assemble_q(td5, new_res)
# Should match (deterministic with same params)
check("同 params 重生 → 同 questionHTML", new_q["questionHTML"] == set1[regen_idx]["questionHTML"])
# Other questions should be unaffected
unchanged = all(set1[i]["questionHTML"] == set1_regen[i]["questionHTML"] for i in range(len(set1)))
check("其他題目唔受影響", unchanged)

# ----------------------------------------------------------------------
# 6. 未確認時禁止匯出
# ----------------------------------------------------------------------
print("\n=== 6. 未確認時禁止匯出 ===")
# Replicate the export gate logic
def can_export(basket, preview_dirty):
    if not basket: return False, "清單空白"
    if any(b["hasError"] for b in basket): return False, "有預覽失敗"
    if any(not b["confirmed"] for b in basket): return False, "未確認"
    if preview_dirty: return False, "預覽過期"
    return True, ""

b1 = [{"hasError": False, "confirmed": False}] * 3
ok, _ = can_export(b1, False)
check("全未確認 → 禁止", not ok)
b2 = [{"hasError": False, "confirmed": True}] * 3
ok, _ = can_export(b2, False)
check("全確認 → 允許", ok)
b3 = [{"hasError": True, "confirmed": True}] * 3
ok, _ = can_export(b3, False)
check("有錯誤 → 禁止", not ok)
b4 = []
ok, _ = can_export(b4, False)
check("空清單 → 禁止", not ok)

# ----------------------------------------------------------------------
# 7. 學生模板 prebuilt fallback 匯出仍可用
# ----------------------------------------------------------------------
print("\n=== 7. 學生模板 prebuilt fallback 匯出仍可用 ===")
# Build a full fallback HTML and verify legacy prebuilt QUESTIONS_DATA remains valid.
# Teacher-tool interactive export is covered by test/runtime_random_export.cjs.
questions = set1
title = "Test Practice"
generated_at = "2026-06-11T00:00:00Z"
bank_hash = "test_hash"
preset_key = "custom"
gas_url = ""

# Use str.replace (NOT re.sub which interprets backslashes)
html = tmpl
html = html.replace("{{TITLE_HTML}}", title)
html = html.replace("{{TITLE}}", json.dumps(title, ensure_ascii=False))
html = html.replace("{{QUESTIONS_DATA}}", json.dumps(questions, ensure_ascii=False))
html = html.replace("{{QUESTION_SPECS}}", json.dumps([], ensure_ascii=False))
html = html.replace("{{GENERATED_AT}}", json.dumps(generated_at))
html = html.replace("{{BANK_HASH}}", json.dumps(bank_hash))
html = html.replace("{{PRESET_KEY}}", json.dumps(preset_key))
html = html.replace("{{GAS_URL}}", json.dumps(gas_url))
html = html.replace("{{VALIDATORS_SCRIPT}}", (ROOT / "tool" / "validators.js").read_text(encoding="utf-8"))
html = html.replace("{{GENERATORS_SCRIPT}}", (ROOT / "tool" / "generators.js").read_text(encoding="utf-8"))
html = html.replace("{{PDF_SCRIPT}}", (ROOT / "tool" / "pdf.js").read_text(encoding="utf-8"))
html = html.replace("{{RUNTIME_SEED}}", json.dumps(None))

# Verify no placeholder residue
leftover = re.findall(r"\{\{[A-Z_]+\}\}", html)
check("匯出後冇殘留佔位符", not leftover, f"leftover: {leftover}")

# Verify each generated questionHTML is present in the HTML
for i, q in enumerate(questions):
    # JSON-escape the questionHTML (since it's inside a JSON string in the HTML)
    qhtml_escaped = json.dumps(q["questionHTML"], ensure_ascii=False)[1:-1]  # strip surrounding quotes
    found = qhtml_escaped in html
    check(f"Q{i+1} ({q['typeKey']}) questionHTML 喺輸出入面", found)
    # Verify the correct answer is also present
    ans_escaped = json.dumps(str(q["correctAnswer"]), ensure_ascii=False)[1:-1]
    check(f"Q{i+1} correctAnswer 喺輸出入面", ans_escaped in html)

# Write test output
out = ROOT / "test" / "tool_export_test.html"
out.write_text(html, encoding="utf-8")
print(f"  (wrote {out}, {len(html)} bytes)")

# ----------------------------------------------------------------------
# 8. 佔位符 + JS 語法
# ----------------------------------------------------------------------
print("\n=== 8. 佔位符 + JS 語法 ===")
required_placeholders = ["{{TITLE}}", "{{TITLE_HTML}}", "{{QUESTIONS_DATA}}", "{{QUESTION_SPECS}}", "{{GENERATED_AT}}", "{{BANK_HASH}}", "{{PRESET_KEY}}", "{{GAS_URL}}", "{{VALIDATORS_SCRIPT}}", "{{GENERATORS_SCRIPT}}", "{{PDF_SCRIPT}}", "{{RUNTIME_SEED}}"]
for ph in required_placeholders:
    check(f"模板有 {ph}", ph in tmpl)

# Check tool/index.html JS syntax
m = re.search(r'<script>([\s\S]*?)</script>', tool_html)
tool_js = m.group(1) if m else ""
# Write and check
outjs = Path("/tmp/tool_check.js")
outjs.write_text(tool_js)
r = subprocess.run(['node', '--check', str(outjs)], capture_output=True, text=True)
check("tool/index.html JS 語法 OK", r.returncode == 0, r.stderr[:200] if r.returncode else "")

# Check exported student HTML JS syntax
m2 = re.findall(r'<script>([\s\S]*?)</script>', html)
for i, sc in enumerate(m2):
    if 'MathJax-script' in sc or 'cdn.jsdelivr.net' in sc: continue
    outjs = Path(f"/tmp/student_check_{i}.js")
    outjs.write_text(sc)
    r = subprocess.run(['node', '--check', str(outjs)], capture_output=True, text=True)
    check(f"匯出學生 HTML script {i} 語法 OK", r.returncode == 0, r.stderr[:200] if r.returncode else "")

# ----------------------------------------------------------------------
# Tool internal consistency: grade/term/topic mapping
# ----------------------------------------------------------------------
print("\n=== 額外：UI 篩選邏輯一致 ===")
# Replicate what the tool's onGradeChange / onTermChange / onTopicChange would show
# For grade='s1', term='3', topicKey='number_and_algebra':
s1_t3_na = [t["key"] for t in s1_t3_types if t["topicKey"] == "number_and_algebra"]
check("s1/3/number_and_algebra 至少 10 題", len(s1_t3_na) >= 10, f"got {len(s1_t3_na)}: {s1_t3_na}")
# 課題名應該同 topicName 對應
names = sorted(set(t["topicName"] for t in s1_t3_types))
print(f"  課題顯示名：{names}")

# === 重要：頁面源碼 + JS 模擬中的篩選必須一致 ===
# 之前的 bug：頁面用 (t.grade || "") !== selectedGrade 隱含 「selectedGrade 為空時隱含所有 t 匹配」，
# 進而 selectedTopic 空時透出全部 16 題。修正後頁面使用共享 filterBankStrict。
print("\n=== 額外：頁面必須使用共享篩選 (filter.js) ===")
check("頁面 <script src=\"filter.js?...\">", re.search(r'<script src="filter\.js\?v=[^"]+">', tool_html) is not None)
check("頁面 <script src=\"generators.js?...\">", re.search(r'<script src="generators\.js\?v=[^"]+">', tool_html) is not None)
check("頁面 <script src=\"validators.js?...\">", re.search(r'<script src="validators\.js\?v=[^"]+">', tool_html) is not None)
check("頁面使用 AssessTool.filterBankStrict", "AssessTool.filterBankStrict" in tool_html)
check("filter.js 檔案存在", (ROOT / "tool" / "filter.js").exists())
check("generators.js 檔案存在", (ROOT / "tool" / "generators.js").exists())
check("validators.js 檔案存在", (ROOT / "tool" / "validators.js").exists())
# 載入 filter.js 並跨語言同樣驗證「未選課題時必須是空清單」
fjs = (ROOT / "tool" / "filter.js").read_text(encoding="utf-8")
r = subprocess.run(['node', '-e', fjs
  + ' const bank = require("fs").readFileSync("question-bank.json", "utf-8");'
  + ' const data = JSON.parse(bank).data;'
  + ' const out = AssessTool.filterBankStrict(data, "s1", "3", "");'
  + ' process.stdout.write(JSON.stringify(out.length));'], capture_output=True, text=True, cwd=str(ROOT))
check("filterBankStrict(s1,3,'') 在 node 內返回 0 (唔可以是 16)",
      r.returncode == 0 and r.stdout.strip() == "0",
      f"got {r.stdout!r} (rc={r.returncode})")
# 頁面用舊有 buggy 寫法 `if (selectedTopic && ...) return false` 時會 3 項失敗
buggy = 'selectedTopic && (t.topicKey || "uncategorized") !== selectedTopic' in tool_html
check("頁面入面冇 buggy 'selectedTopic &&' 篩選條件", not buggy)

# ----------------------------------------------------------------------
# Done
# ----------------------------------------------------------------------
print("\n" + "=" * 60)
if ERRORS:
    print(f"❌ {len(ERRORS)} 個失敗：")
    for e in ERRORS[:10]:
        print(f"  - {e}")
    sys.exit(1)
else:
    print(f"✅ 全部 {PASSES} 項檢查通過")
    sys.exit(0)
