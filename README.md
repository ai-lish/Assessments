# Assessments — 測考工具庫

由 `ai-lish` 維護嘅測考工具系列。集中存放題目庫、學生版模板同生成工具，方便老師快速派發練習畀學生。

**URL：** https://ai-lish.github.io/Assessments/

## 工具清單

- **初中短答網頁製作工具**（見本 repo）— 題目庫 + 模板 + 生成工具，輸出 standalone 學生版 HTML。

## 初中短答網頁製作工具

### 系統組成

| 檔案 | 用途 |
|---|---|
| `question-bank.json` | 外部題目庫（新增題型定義於此） |
| `templates/student.html` | 學生版模板（含佔位符，**不可直接開啟使用**） |
| `tool/index.html` | 生成工具（老師使用） |

學生收到的是由生成工具產生的 `student-practice-YYYYMMDD.html`，已內嵌全部題目，毋須連線。

### 首次設置（只需一次）

1. 本倉庫已 public，raw 網址可直接讀取。
2. 三份檔案已上傳到 main branch。
3. raw 網址：
   - `https://raw.githubusercontent.com/ai-lish/Assessments/main/question-bank.json`
   - `https://raw.githubusercontent.com/ai-lish/Assessments/main/templates/student.html`
4. 開啟 `https://ai-lish.github.io/Assessments/tool/`，把兩條網址填入並按「儲存網址」即可。

### 日常使用流程（生成學生版）

1. 開啟 `https://ai-lish.github.io/Assessments/tool/`
2. 按「載入題目庫 + 模板」→ 檢查預覽表格的題型名稱、分類、難度、範例題目
3. 設定標題、教師密碼、每個題型要生成嘅題目數量
4. 按「生成學生版 HTML」→ 自動下載 `student-practice-YYYYMMDD.html`
5. 將下載嘅檔案經 eClass／Google Classroom 等派發給學生

### 新增題型（更新題目庫）

1. 開啟 `question-bank.json`，參考檔內 `_schema_guide` 及兩個示範題型（`area_circle`、`angle_type`）的格式
2. 可將 schema 連同課題要求交給 AI 生成新題型 JSON，貼入 `data` 陣列
3. 喺 GitHub 上更新 `question-bank.json`（直接在網頁編輯或重新上傳）
4. 重新執行「日常使用流程」生成新版學生 HTML 並重新派發——已派發的舊版不會自動更新

### 注意事項

- JSON 內 LaTeX 反斜線需寫四個（`\\\\`），參數語法為 `${paramName}`
- 新題型的 `key` 不可與內建 26 個題型重複
- `category` 如與現有分類名稱相同會歸入該分類，否則自動新增分類
- GitHub raw 網址更新後可能有數分鐘快取延遲，載入到舊內容請稍候再試
- 生成的學生版含教師密碼匯出、學生答案匯出、列印 / PDF 匯出功能

## 開發

- 所有檔案為靜態 HTML / JSON，無 build step。
- GitHub Pages：`https://ai-lish.github.io/Assessments/`（root: `main` branch）。
- 改動後 push 到 `main` 即 deploy。
