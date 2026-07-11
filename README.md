# Assessments — 測考工具庫

由 `ai-lish` 維護嘅測考工具系列。集中存放題目庫、學生版模板同老師選題工具，方便老師快速派發練習畀學生。

**URL：** https://ai-lish.github.io/Assessments/

## 工具清單

- **初中短答網頁製作工具**（見本 repo）— 題目庫 + 學生版模板 + 老師選題工具。
- 預載練習（中一第三學期甲部）：`s1_term3_part_a`（16 題固定組合）。

## 系統組成

| 檔案 | 用途 |
|---|---|
| `question-bank.json` | 外部題目庫：18 個題型 + 1 個 preset。每個題型有 `grade` / `term` / `topicKey` / `topicName` 供分層篩選。 |
| `templates/student.html` | 學生版模板（含佔位符，**不可直接開啟使用**） |
| `tool/index.html` | 老師選題工具：年級 → 學期 → 課題 → 題目，逐題預覽及確認後匯出 |
| `docs/attempt-types.md` | 學生作答記錄的 `initial` / `wrong_retry` / `single_retry` 契約 |
| `test/` | 測試腳本 |

學生收到的是由工具產生嘅 `student-practice-{presetKey}-YYYYMMDD.html`（或自訂模式：`student-practice-YYYYMMDD.html`），已內嵌全部題目。

## 老師選題流程

1. 開啟 `https://ai-lish.github.io/Assessments/tool/`。
2. 填 raw URL（首次使用後按「儲存網址」）：
   - `https://raw.githubusercontent.com/ai-lish/Assessments/main/question-bank.json`
   - `https://raw.githubusercontent.com/ai-lish/Assessments/main/templates/student.html`
3. 按「**載入題目庫 + 模板**」→ 載入成功後顯示題型數量。
4. 揀模式：
   - **分層自訂**（本階段主要）：依序揀「年級」→「學期」→「課題」→ 喺題目清單按「加入」。
   - **Preset**：「中一第三學期甲部」（16 題）一鍵載入。
5. 喺「**出題清單**」用「↑ / ↓」調整順序，按「移除」剔除題目。
6. 按「**生成預覽**」→ 每題以獨立卡片顯示：
   - **基本資料**：年級、學期、課題、題目名稱、題型 key、難度、type/checkType。
   - **學生看到的題目**：實際 `questionHTML`（含 MathJax 渲染、SVG 圖、選項、坐標互動說明）。
   - **作答格式**：`type` / `checkType` / `prefix` / `suffix` / 選項 / 坐標互動目標 / 全等理由提示。
   - **答案**：`correctAnswer` / `displayAnswer` / 可接受答案陣列 / 坐標目標 / 質因數分解結構。
   - **回饋及教學**：答對回饋、答錯回饋、`solutionHTML` 步驟、`pdfText` 列印文字。
7. 檢查無誤後，喺每題底部勾選「**已檢查，內容正確**」；可按「**全部確認**」一次過確認。
8. 確認全部後，底部「**匯出**」按鈕會啟用 — 自動下載 `student-practice-{presetKey or custom}-YYYYMMDD.html`。

## 匯出閘門（Export Gate）

匯出按鈕預設**停用**。必須全部以下條件先啟用：

- ✓ 出題清單有題目
- ✓ 所有題目生成成功（冇 `hasError`）
- ✓ 所有題目已勾選「已檢查，內容正確」
- ✓ 預覽結果同清單一致（自上次確認後冇再改動）

未符合時，匯出按鈕下方會列出仲欠咩。

## 重新生成單題

每題卡片有「**🔄 重新生成此題**」按鈕，會用新嘅隨機參數重新生成該題：

- 唔會改變其他題目。
- 該題嘅確認狀態會自動清除。
- 必須重新勾選「已檢查」先可以匯出。

## 安全性

- 學生版完全冇密碼；任何人都可以瀏覽。
- 唔可以將密碼當作安全控制：學生版 HTML 一旦派發就係公開檔案。
- 工具不會喺前端 collect 真密碼、token 或學生資料。
- **本階段未啟用嘅功能（後續階段）：** 教師版答案解鎖、PDF 匯出、Google Sheets 學習記錄、單題重做、錯題重做。工具 UI 已隱藏相關按鈕。
- MathJax 由 CDN 載入（`cdn.jsdelivr.net`），完全離線時 LaTeX 會顯示為 `\( ... \)` 原文字串。

## 題目庫分類結構

每個題型有以下分層欄位：

```json
{
  "key": "frac_arith",
  "grade": "s1",          // s1 / s2 / s3（示範題型可為空字串）
  "term": "3",             // "1" / "2" / "3" / "all"
  "topicKey": "number_and_algebra",   // 程式篩選用
  "topicName": "數與代數",            // 顯示用
  ...
}
```

中一第三學期（`grade=s1`, `term=3`）嘅 16 題分佈：

| 課題 (topicKey)        | 課題名稱    | 題型數 | 包含 |
|---|---|---:|---|
| `number_and_algebra`  | 數與代數    | 11 | frac_arith, neg_power, prime_factor, hcf_or_lcm, exp_law, alg_simplify, solve_eq, word_to_alg, poly_desc, formula_sub, seq_nth |
| `measurement`         | 度量        | 2  | sig_fig, frac_to_pct |
| `geometry`            | 幾何        | 2  | congruence, coordinate |
| `data_handling`       | 數據處理    | 1  | data_type |

示範題型 `area_circle`、`angle_type` 保留為「未分類」（`grade=""`），以保持向後相容。

## 開發

### 測試

```bash
# 1. 題目庫完整性
python3 test/validate_bank.py      # 18 passed, 0 failed

# 2. PR-A2 schema / generator / validator contract
python3 test/validate_schema.py
node test/test_generators_equivalence.cjs
node test/test_validators.cjs
node test/no_dynamic_code.cjs

# 3. Preset 端到端生成
python3 test/validate_preset.py    # 16 generated, 0 failures

# 4. 老師選題工具驗收
python3 test/validate_tool.py      # 123 項檢查通過

# 5. 老師工具 headless 端到端流程
node test/test_tool_logic.cjs      # 篩選 → 預覽 → 確認 → 匯出

# 6. 重建題目庫（從 parts/ 組裝）
python3 test/assemble.py
```

### 修改注意

- 改動題目庫後必須跑 `python3 test/assemble.py` 重新組裝 `question-bank.json`。
- 題庫只保存 `generator` / `validator` key；實作分別集中於 `tool/generators.js` / `tool/validators.js`。
- 學生模板改動後必須跑 `python3 test/validate_preset.py` 確認仍能生成 16 題。
- 工具改動後必須跑 `python3 test/validate_tool.py` 及 `node test/test_tool_logic.cjs`。
- 唔可以將 `test/*.html` 或 `test/generated_practice.json` commit 入 repo（已加入 `.gitignore`）。

### LaTeX Escape

- **題目庫 JSON 內：** 反斜線用 `\\`，即 `\\( x \\)` 寫作 `\\(` 同 `\\)`。
- **generator 模組內：** 反斜線按 JavaScript 字串規則保留。
- **JSON 內 `string.replace`：** 用 function 替換避免 `\\` 被當 regex replacement 解讀。

### 部署

- 全部檔案為靜態 HTML / JSON，無 build step。
- GitHub Pages：`https://ai-lish.github.io/Assessments/`（root: `main` branch）。
- 改動後 push 到 `main` 即 deploy。
