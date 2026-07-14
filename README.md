# Assessments — 測考工具庫

由 `ai-lish` 維護嘅測考工具系列。集中存放題目庫、學生版模板同老師選題工具，方便老師快速派發練習畀學生。

**URL：** https://ai-lish.github.io/Assessments/

## 工具清單

- **初中短答網頁製作工具**（見本 repo）— 題目庫 + 學生版模板 + 老師選題工具。
- **2025-26 年度預載練習**：中一第二學期甲部（14 題）、中一第三學期甲部（16 題）、中二第三學期甲部（16 題）、中三第三學期甲部（14 題）。

## 系統組成

| 檔案 | 用途 |
|---|---|
| `question-bank.json` | 外部題目庫：63 個題型 + 4 個 preset。每個題型有 `grade` / `term` / `topicKey` / `topicName` 供分層篩選。 |
| `templates/student.html` | 學生版模板（含佔位符，**不可直接開啟使用**） |
| `tool/index.html` | 老師選題工具：年級 → 學期 → 課題 → 題目，逐題預覽及確認後匯出 |
| `docs/attempt-types.md` | 學生作答記錄的 `initial` / `wrong_retry` / `single_retry` 契約 |
| `exercises/2526/` | 由正式管道產生的四份 2025-26 年度學生練習 |
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
   - **Preset**：按 2025-26 學年分組，一鍵載入 `s1_term2_part_a`、`s1_term3_part_a`、`s2_term3_part_a` 或 `s3_term3_part_a`。
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
- ✓ 學生模板已成功載入

未符合時，匯出按鈕下方會列出仲欠咩。

## 重新生成單題

每題卡片有「**🔄 重新生成此題**」按鈕，會用新嘅隨機參數重新生成該題：

- 唔會改變其他題目。
- 該題嘅確認狀態會自動清除。
- 必須重新勾選「已檢查」先可以匯出。

## 安全性

- 學生版冇登入門檻；任何人都可以瀏覽主要練習。
- 唔可以將密碼當作安全控制：學生版 HTML 一旦派發就係公開檔案。
- 老師工具可設定 Google Sheets Web App URL 及 4 位提前遞交 PIN；匯出檔只會保存 PIN 的 SHA-256 hash，不會保存 PIN 明文。靜態前端 hash 只屬簡單攔截，唔係真正權限保護。
- PDF 題目／答案雙版、Google Sheets 提交、單題重做、錯題重做及提前遞交已啟用，相關入口會按現行條件顯示或啟用。
- 正常提交只會喺所有錯題完成後啟用；提前遞交需要已配置 GAS URL 及老師 PIN。GAS 採 append-only：同一學生多次提前遞交會新增多行，教師須以最後一行為準。
- MathJax 由 CDN 載入（`cdn.jsdelivr.net`），完全離線時 LaTeX 會顯示為 `\( ... \)` 原文字串。

## 學生練習功能

- 題目類型與次序由 preset 固定，學生每次重新開檔時會由 generator runtime 重新抽取參數；同一 session 內重做則保留同一批題目。
- 正確答案可同時顯示精確分數／π 形式與小數近似值；因式分解題要求完全因式分解。
- 作答中可開啟整卷 PDF 雙版或當前題型的同類練習 PDF；兩者只開獨立 HTML 預覽頁，由使用者自行選擇列印。
- 學生可重做錯題或從歷史記錄重做單題。完成全部錯題後，可用學生證編號提交至已配置的 Google Sheets。

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
python3 test/validate_bank.py

# 2. PR-A2 schema / generator / validator contract
python3 test/validate_schema.py
node test/test_generators_equivalence.cjs
node test/test_validators.cjs
node test/no_dynamic_code.cjs

# 3. 四個 Preset 端到端生成
python3 test/validate_preset.py

# 4. 老師選題工具驗收
python3 test/validate_tool.py

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
