# Assessments 手冊建置

本目錄預留三本獨立手冊：

- `teacher/`：甲本，教師工具（後續）
- `student/`：乙本，學生練習（本次）
- `submission/`：丙本，提交成績（後續）
- `includes/`：三本手冊共用的 Markdown 片段
- `output/`：本機生成的 HTML／PDF，不提交版本庫

## 乙本來源

- 正文：`student/student-manual.md`
- 截圖：`student/images/`
- 共用片段：`includes/*.md`

正文以 `{{ include: NAME }}` 引用共用片段。`scripts/build_student_manual.cjs`
會先注入片段，再用 markdown-it 產生 HTML，最後以 Playwright Chromium 產生 PDF。

## 建置

先安裝文件專用依賴，再建置：

```bash
npm --prefix docs/manual install
npm --prefix docs/manual run build:student
```

輸出：

- `docs/manual/output/student/index.html`
- `docs/manual/output/student/student-manual.pdf`

## 重新拍攝截圖

```bash
npm --prefix docs/manual run capture:student
```

腳本會優先使用 macOS 已安裝的 Google Chrome／Chromium；其他環境可設定
`PLAYWRIGHT_CHROMIUM_EXECUTABLE`，或先執行 `npx playwright install chromium`。

截圖腳本以固定 seed 載入現行 exercises。提前遞交示範檔由正式
`scripts/gen_exercise_html.cjs` 管道生成至 `/tmp/assessments-student-manual/`，
只使用測試 PIN `1234` 及虛構學號 `20255001F`，不會提交示範檔或發出真實提交請求。
為避免 headless 截圖受網絡字型載入時間影響，腳本把同版本的官方 MathJax SVG
bundle 暫存於 `/tmp`；這只影響文件截圖方式，不會改動 exercises 的產品程式。

## 中文字型

HTML/PDF 使用 `Noto Sans CJK TC` → `Noto Sans TC` → `PingFang TC` →
`Microsoft JhengHei` 的繁體中文字型 fallback。Chromium 列印時會把實際採用的
系統字型 subset 嵌入 PDF；驗收時以 `pdffonts` 確認嵌入，並把 PDF 逐頁轉成 PNG
檢查斷行、缺字及圖像裁切。
