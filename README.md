# Assessments — 測考工具庫

由 `ai-lish` 維護嘅測考工具系列。集中存放題目庫、學生版模板同生成工具，方便老師快速派發練習畀學生。

**URL：** https://ai-lish.github.io/Assessments/

## 工具清單

- **初中短答網頁製作工具**（見本 repo）— 題目庫 + 模板 + 生成工具，輸出 standalone 學生版 HTML。
- 預載練習（中一第三學期甲部）：`s1_term3_part_a`（16 題固定組合）。

## 初中短答網頁製作工具

### 系統組成

| 檔案 | 用途 |
|---|---|
| `question-bank.json` | 外部題目庫：18 個題型 + 1 個 preset（中一第三學期甲部） |
| `templates/student.html` | 學生版模板（含佔位符，**不可直接開啟使用**） |
| `tool/index.html` | 生成工具（老師使用，preset 模式 + 自訂模式） |
| `test/` | 測試腳本（驗證題目庫同 preset 端對端生成） |

學生收到的是由生成工具產生的 `student-practice-{presetKey}-YYYYMMDD.html`（或自訂模式：`student-practice-YYYYMMDD.html`），已內嵌全部題目。

### 安全性

- **學生版完全冇密碼。** 任何人都可以瀏覽/做練習；想保護答案只可以靠教師版（按「生成教師版」取得另一下載檔，內含「切換全部答案」按鈕同 PDF 匯出）。
- **唔可以用教師密碼做安全控制：** 學生版 HTML 一旦派發就係公開檔案，冇任何後端驗證。Passcode 唔可以保護資料。
- **Google Sheets 提交** 用 `no-cors` 模式：只可以喺 UI 顯示「已嘗試送出」，唔可以讀取伺服器回應。如需要 server-side 驗證，請喺 GAS script 內部以學生 ID 配對預期答案。
- **MathJax 由 CDN 載入**（`cdn.jsdelivr.net`），所以練習需要連線先可以正常渲染 LaTeX。離線時會見到 `\( ... \)` 原文字串。

### 首次設置（只需一次）

1. 本倉庫已 public，raw 網址可直接讀取。
2. 三份檔案已上傳到 main branch。
3. raw 網址：
   - `https://raw.githubusercontent.com/ai-lish/Assessments/main/question-bank.json`
   - `https://raw.githubusercontent.com/ai-lish/Assessments/main/templates/student.html`
4. 開啟 `https://ai-lish.github.io/Assessments/tool/`，把兩條網址填入並按「儲存網址」即可。

### 日常使用流程（生成學生版）

1. 開啟 `https://ai-lish.github.io/Assessments/tool/`
2. 按「載入題目庫 + 模板」→ 預設係 **Preset 模式**（揀中一第三學期甲部）
3. 設定標題（如想用「匯出記錄」功能，可揀填 Google Sheets 提交網址）
4. 按「**預載驗證**」檢查邊題會出錯（建議必做）
5. 按「**生成學生版 HTML**」→ 自動下載 `student-practice-s1_term3_part_a-YYYYMMDD.html`
6. 如想出埋有答案嘅版本，再按「**生成教師版 HTML**」→ 下載 `teacher-practice-...html`
7. 將學生版經 eClass／Google Classroom 派發給學生；教師版自留

### 自訂題目（自訂模式）

按「自訂題目」分頁可以：
- 為每個題型自由設定題目數量
- 自動儲存上次嘅選擇到 localStorage
- 適合快速生成混合練習或針對性補底練習

### 學生版功能

- **互動題目：**
  - `text` 題（textExact / numeric / fracPct / primeFactor / algebraQ8 / hcfLcm）
  - `choice` 題（按鈕選擇，data_type 類型）
  - `coordinate` 題（互動坐標平面 + 文字輸入）
  - `congruence` 題（內嵌 SVG 圖 + 5 個理由選擇）
- **作答流程：**
  - 即時核對（核對答案 → 下一題）
  - 查看教學步驟（每題嘅完整步驟同 SVG 圖解）
  - 完成一輪 → 結果頁
- **重做：**
  - **全部重做**（重設 session，重新生成新題目）
  - **重做錯題**（只重做本輪嘅錯題）
  - **單題重做**（喺結果頁按「錯題」／「正題」內嘅「重做此題」按鈕）— 唔會記錄新嘗試，純粹練習
- **匯出：**
  - 匯出學生答案為 TSV 檔
  - 匯出完整嘗試紀錄至 Google Sheets（如果設定咗 GAS_URL）
- **列印 / PDF：** `window.print()`，自動隱藏工具列同 keypad
- **本地紀錄：** 所有嘗試以 JSON 存喺 `localStorage`，key 為 `assess_attempts_<bank-hash>`，下次開啟可繼續睇返上次結果

### LaTeX Escape 規則

- **題目庫 JSON 內：** LaTeX 反斜線用 **兩個**（`\\`），即 `\\( ... \\)` 寫作 `\\(` 同 `\\)`。
- **JS template literal 內（generate() 函式體內）：** 反斜線用 **四個**（`\\\\`），例如：`html = \"\\\\( x \\\\)。\"`。
- **Python json.dumps 內：** 用 **兩個**（`\\`），json.dumps 會自動 escape。
- **JSON.parse / JS JSON.stringify：** 自動處理，唔使手動 escape。

### 新增題型

1. 開啟 `question-bank.json`，參考檔內 `_schema_guide` 及兩個示範題型（`area_circle`、`angle_type`）的格式。
2. 將新題型貼入 `data` 陣列。
3. 喺 GitHub 上更新 `question-bank.json`。
4. 重新執行「日常使用流程」生成新版學生 HTML — 已派發的舊版不會自動更新。

### 加入新 Preset

1. 喺 `question-bank.json` 嘅 `presets` 陣列加新 preset，格式：
   ```json
   {
     "key": "preset_key",
     "name": "顯示名稱",
     "description": "簡介",
     "questions": [
       { "typeKey": "題型A", "count": 5 },
       { "typeKey": "題型B", "count": 3 }
     ]
   }
   ```
2. 重新載入工具，preset 會自動出現。

## 開發

### 測試

```bash
# 1. 題目庫本身嘅完整性（每題 generate() 不 throw、LaTeX 平衡、預期欄位）
python3 test/validate_bank.py

# 2. 完整 preset 嘅端到端生成
python3 test/validate_preset.py

# 3. 所有分支題型嘅全分支覆蓋
python3 test/validate_branches.py

# 4. 模擬工具行為生成 standalone HTML
python3 test/e2e_tool.py
# 產出：test/e2e_student.html（可喺瀏覽器打開測試互動）
```

### 修改注意

- 題目庫改動後必須 `python3 test/assemble.py` 重新組裝 `question-bank.json`（parts 喺 `test/parts/`）。
- 學生模板改動後必須 `python3 test/validate_preset.py` 確認仍能生成 16 題。
- 工具改動後必須用 `python3 test/e2e_tool.py` 確認產出嘅 HTML 冇 placeholder 殘留。

### 部署

- 所有檔案為靜態 HTML / JSON，無 build step。
- GitHub Pages：`https://ai-lish.github.io/Assessments/`（root: `main` branch）。
- 改動後 push 到 `main` 即 deploy。
