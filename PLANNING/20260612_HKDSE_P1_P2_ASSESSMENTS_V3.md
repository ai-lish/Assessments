# 20260612_HKDSE_P1_P2_ASSESSMENTS_V3

## 1. 文件狀態與目標

本文件取代 `PLANNING/20260612_HKDSE_P1_P2_ASSESSMENTS_V2.md` 作為 HKDSE
卷一／卷二遷入 `ai-lish/Assessments` 的實作依據。

`PLANNING/20260612_HKDSE_P1_P2_ONLINE_TOOLS_V1.md` 是前置盤點檔，必須保留，
不可修改或刪除。V3 覆寫 V2 中與類似題、教師審核頁、template editor、JSON 去重及
PR 分拆有關的決定；其餘未被 V3 明確變更的安全、URL、判分、效能及私隱要求繼續適用。

產品目標：

- 在 `ai-lish/Assessments` 建立獨立 HKDSE 卷一／卷二工具。
- 學生主要練習流程免登入。
- 保留並遷移可用的類似題功能，但未驗證答案不可計分。
- 遷移 HKDSE 教師 OCR 審核頁及 template editor，並先完成依賴與秘密掃描。
- 在真實 GitHub Pages 完成部署驗證後，才切換 `ai-learning` 入口及舊網址。

本 planning 只定義後續 PR。建立本文件時不得自行開 PR A／PR B、不得 merge 實作。

## 2. Repository 分工

### 2.1 `ai-lish/Assessments`

負責：

- HKDSE 學生工具首頁。
- 卷一長答題練習、官方答案顯示及學生自評。
- 卷二選擇題練習及 `choiceKey` 判分。
- 題目、答案、圖片、catalog、coverage metadata 及驗證測試。
- 類似題 runtime、已驗證模板及模板答案可靠性狀態。
- HKDSE 教師 OCR 審核頁與 template editor，頁面須明確標示「教師用」。
- 學生本機作答保存。
- GitHub Pages 正式 HKDSE 工具。

「教師用」只是一項介面標示，不是存取控制。公開 GitHub Pages 上的 HTML、JavaScript
及資料均應視為任何人可讀；前端隱藏按鈕、角色字串、localStorage flag 或 token input
都不可當作授權。

### 2.2 `ai-lish/ai-learning`

負責：

- 首頁「考試與 HKDSE」入口。
- 遷移後把學生、教師審核及 template editor 連結指向 Assessments。
- 保留 `/ai-learning/` 課堂導航。
- 為舊 HKDSE 學生 URL 提供相容導向。
- 在 PR B 修正首頁四處硬編碼年份文字。

不再負責：

- HKDSE 核心 runtime 的後續開發。
- 維護與 Assessments 分歧的第二套學生或教師頁。
- 讓初中老師工具載入 HKDSE 題庫或約 54 MB 資產。

## 3. 已核實來源基線

來源 repository：`ai-lish/ai-learning`

| 項目 | 已核實數字／狀態 |
|---|---|
| `hkdse/` | 約 54 MB，1,276 files |
| P1 題目 | 198 題；126 題有非空答案文字，72 題無答案文字 |
| P2 題目 | 495 題；437 題有 solution，58 題無 solution |
| 總題數 | 693 |
| `images-p1/` | 220 files，約 14 MB |
| `images-p2/` | 495 files，約 25 MB |
| `answer-images/` | 229 files，約 9.5 MB |
| `hkdse/index.html` | 不存在 |
| `hkdse/ocr_log.txt` | 0 bytes |

來源年份：

- P1：2012 至 2023。
- P2：2012 至 2022，每年 45 題。

首頁及工具顯示的年份、題數及 coverage 必須由 catalog／資料計算，不可繼續以分散的
硬編碼字串作唯一真相。PR B 須先以內容搜尋定位 `ai-learning/index.html` 四處
`2012–2022`，逐處判定語境，不可只依賴舊行號 451、779、787、938。HKDSE 通用標籤
才更新為 `2012–2023`；出現在 P2 專屬語境者維持其真實資料範圍，不得暗示已有
2023 P2 題目。

## 4. 不可變架構決定

### 4.1 HKDSE 不進入初中題庫

HKDSE 真題不可加入 `question-bank.json`：

- `question-bank.json` entry 是動態生成題型。
- HKDSE entry 是固定年份、題號、圖片及答案的歷屆題目。
- P1 是草稿、答案查看及自評流程。
- P2 是固定 A、B、C、D 選項及 verified answer 判分。
- 693 題不可轉成 693 個 `generate()` 題型。

HKDSE 必須位於獨立 `Assessments/hkdse/`。現有 `tool/`、`question-bank.json`、
`preset s1_term3_part_a` 及 `test/validate_*` 不得載入 HKDSE runtime。

### 4.2 正式 URL 與大小寫

正式頁面：

```text
https://ai-lish.github.io/Assessments/hkdse/
```

如需直接讀取 raw data，只可使用：

```text
https://raw.githubusercontent.com/ai-lish/Assessments/main/...
```

跨 repository URL 必須使用大寫 `Assessments`。GitHub Pages 與 raw 路徑大小寫敏感；
`/assessments/` 或 `ai-lish/assessments` 會 404。

## 5. 目標結構

實際檔名可配合 Assessments 現有模式調整，但 ownership 必須保持：

```text
hkdse/
├── index.html
├── guide.html
├── p1/
│   └── index.html
├── p2/
│   └── index.html
├── teacher/
│   ├── review-p1.html
│   ├── review-p2.html
│   ├── review-p1-answers.html
│   └── template-editor.html
├── mimic/
│   ├── auto-templates-p2.json
│   ├── practice-p1.json
│   ├── practice-p2.json
│   └── template-validation.json
├── data/
│   ├── catalog.json
│   ├── p1-questions.json
│   ├── p1-answers.json
│   ├── p2-questions.json
│   └── p2-solutions.json
├── images/
│   ├── p1/
│   ├── p1-answers/
│   └── p2/
├── assets/
├── scripts/
│   ├── import-from-ai-learning.mjs
│   ├── build-catalog.mjs
│   └── validate-mimic-templates.mjs
└── test/
```

要求：

- 學生 runtime、教師製作資料、歷史備份及 build 工件分開。
- P1 與 P2 可共用 URL、localStorage、分頁及導航 helper，但判分模型分開。
- 教師頁可讀取經批准的資料，但不得令學生首頁自動下載教師資料。
- 類似題資產只在開啟相關功能時載入。

## 6. 遷移資產與處置

### 6.1 必須遷移

- P1、P2 精簡 runtime JSON。
- P1 被引用的答案文字及答案圖片。
- P2 canonical solution data。
- 學生實際會開啟的題目圖片。
- topic mapping、coverage、來源 commit 及 schema metadata。
- `mimic-generator/auto_templates_p2.json`。
- `mimic-generator/practice_p1.json`。
- `mimic-generator/practice_p2.json`。
- `mimic-generator/template-editor-v3.html`，遷入教師區並完成安全閘門。
- `review_p1.html`、`review_p2.html`、`review_p1_answers.html`，遷入教師區。

現有 `dse-practice-p2.html` 第 243 行實際 fetch
`mimic-generator/auto_templates_p2.json`；遷移後必須更新至新 canonical 路徑，不能留下
舊 repo 相對路徑或 404。實作時仍須按內容搜尋確認最新行號及 consumer。

### 6.2 類似題處置：遷移，附驗證閘門

V2 的「不遷移 mimic-generator」決定作廢。類似題功能及上列 runtime 一併遷入
Assessments，但必須符合：

- 每個仿題模板生成的答案逐模板驗證。
- 驗證結果寫入可追蹤 manifest，至少包含 template id、版本／hash、驗證者或方法、
  正負樣本、狀態及日期。
- 通過驗證的模板才可成為可計分題。
- 未通過或未完成驗證的模板必須停用，或清楚標示「練習用，未核對」。
- 「練習用，未核對」不可顯示為答對／答錯，不進入得分或正確率。
- 學生不可看到未驗證答案被當成正確。
- 模板、practice JSON、editor 及學生按鈕的引用必須一起測試，不可留下 404。

類似題建議放入獨立 PR A3，不阻塞核心 P1／P2 的 A1、A2。

### 6.3 圖片 allowlist

- import script 按 runtime JSON 真實引用建立圖片 allowlist。
- 不可直接複製整個舊 `hkdse/`。
- 相同圖片以 content hash 判斷，不以檔名判斷。
- 所有 runtime 圖片引用必須存在。
- 未引用圖片、重複 hash 及 unresolved reference 必須產生報告。
- 壓縮不可令題目文字、坐標、角標、圖形或答案不可讀。

### 6.4 逐項 disposition

「排除」只表示不複製到 Assessments runtime。A 系列及 PR B 不得從
`ai-learning` 歷史來源刪除資產；來源 cleanup 必須另開 planning。

| 舊路徑／項目 | disposition | 決定與引用檢查 |
|---|---|---|
| `hkdse/p2_solutions.json` | `keep`，canonical | 現有 live P2 頁 fetch root 版；遷入的 `p2-solutions.json` 必須可證明由此版本產生 |
| `hkdse/pages/p2_solutions.json` | `manual-review` | 與 root 同大小但 SHA-256 不同，不是真重複；產生 key／逐題差異報告，未經人工決定不可覆蓋 canonical |
| `hkdse/p2_latex_ocr_results.json` | `manual-review`／按 live fetch 保留 | 教師 P2 review 頁 fetch root 版；如新頁仍需則以 live root 版為候選 canonical |
| `hkdse/pages/p2_latex_ocr_results.json` | `manual-review` | 與 root 同大小但 SHA-256 不同；列出差異及所有 consumer，禁止靜默 deduplicate |
| `hkdse/pages/backup-20260412T031151Z/` | `exclude` | 列出內容、大小及對應 canonical；確認 HTML／JS／catalog 無 runtime 引用 |
| `hkdse/__pycache__/` | `exclude` | build 工件；確認無 `.pyc` runtime 引用，Assessments `.gitignore` 阻止加入 |
| `hkdse/evidence/` | `reference-check` | 學生 runtime 不遷；逐頁掃描教師頁，只有實際需要且完成用途／私隱審核的檔案才可放教師資料區 |
| `../ocr-output/` | `reference-check` | review／editor 頁引用 `final_merged_results.json` 及 `svg-p1`／`svg_p2`；逐頁掃描實際引用，確認檔案存在才 repoint，否則改為明確 unavailable 狀態，不留靜默 fallback 404 |
| `hkdse/mimic-generator/` | `keep-selected` | 遷移三個 runtime JSON 及 `template-editor-v3.html`；`auto_templates_all.json` 被 `review_p1.html` 及 `template-editor-v3.html` 引用，須逐項決定 keep／repoint／remove，不可留下舊相對路徑 404；其他腳本、cache、輸出物按引用及可重建性逐項處置 |
| `hkdse/ocr_log.txt` | `exclude` | 已核實 0 bytes；仍須 `rg` 確認無引用 |
| `hkdse/images-p1/` | `keep-allowlist` | 對 220 files 做引用、hash、孤兒報告 |
| `hkdse/images-p2/` | `keep-allowlist` | 對 495 files 做引用、hash、孤兒報告 |
| `hkdse/answer-images/` | `keep-allowlist` | 對 229 files 與 P1 answer records 比對；只有被引用圖片進 runtime |

manifest 最少包含：

- source path
- disposition：`keep`、`exclude`、`manual-review`、`reference-check`
- source size／file count
- destination path
- consumer／reference count
- SHA-256 或 duplicate group
- canonical reason
- unresolved difference

## 7. 資料匯入與 ownership

### 7.1 匯入規格

`import-from-ai-learning.mjs` 必須：

- 從明確指定的本機來源及 commit SHA 匯入。
- 使用 JSON parser／structured APIs，不以字串拼接修改 JSON。
- 保留穩定題號，例如 `2012Q01`。
- 正規化相對圖片路徑。
- 保留來源實際圖片／SVG 目錄名與分隔符，例如 `svg-p1` 與 `svg_p2`，不得把兩者
  正規化成同一名稱，以免斷裂教師頁引用。
- 記錄 source path、source commit、schema version 及 import time。
- 不猜測或製造缺失答案。
- 不把 OCR 未核對內容標示成 verified。
- 匯入後自動執行 schema、coverage、image 及 grading validation。

`p1_answer_ocr_results.json` 的來源結構是：

```text
{ total, successful, failed, results }
```

答案文字位於 `results[題號].text`。`successful=220` 是 OCR record／處理結果數，
不等於有答案的 P1 題數。必須先與 198 題題號取交集，再計算非空答案文字；結果為
126 題有 text、72 題無 text。匯入及 UI 不可用 `successful` 當答案 coverage。

### 7.2 canonical 一致性

- 遷入的 P2 solution canonical 必須來自 live 頁實際 fetch 的
  `hkdse/p2_solutions.json` root 版。
- source hash、輸出 hash、轉換規則及題數必須記錄。
- `pages/p2_solutions.json` 是待人工核對的分歧副本。
- PR A1 必須附 root／pages 差異報告；不同不得被描述為 deduplicated。
- latex OCR 兩個同大小但不同 hash 的版本亦須獨立報告 consumer 及差異。

### 7.3 遷移後 ownership

A 系列合併、部署及驗收後：

- Assessments `hkdse/` 是學生、類似題及已遷教師頁的正式來源。
- `ai-learning/hkdse/` 只作遷移期回退。
- 後續題目、答案、模板或年份更新在 Assessments 建 planning／PR。
- 不可在兩個 repository 同時維護兩套 canonical runtime。

## 8. 教師審核頁與 template editor

### 8.1 遷移前逐頁依賴掃描

遷移不能只複製 HTML。每頁須以 `fetch(`、XHR、GitHub API、script／image URL、
download／upload、localStorage 及動態 path 掃描產生 dependency manifest。

已發現依賴如下，實作時須再以 source commit 重跑掃描：

| 頁面 | 已發現資料／外部依賴 | V3 決定 |
|---|---|---|
| `review_p1.html` | `p1_latex_ocr_results.json`、`../ocr-output/final_merged_results.json` fallback、`p1_verified.json`、`p1_sheet_data.json`、`../ocr-output/svg-p1/<id>.svg`、`p1_answer_ocr_results.json`、`../mimic-generator/auto_templates_all.json`、GitHub Contents API PUT | 每項 keep／repoint／remove；不存在 fallback 不可保留為靜默 404；公開版先移除或停用不安全寫入 |
| `review_p2.html` | root `p2_solutions.json`、root `p2_latex_ocr_results.json`、`../ocr-output/final_merged_results.json` fallback、`p2_verified.json`、`p2_sheet_data.json`、`../ocr-output/svg_p2/<id>.svg`、`../mimic-generator/auto_templates_p2.json`、GitHub Contents API PUT | 保持 live root canonical；其他逐項 keep／repoint／remove；公開版先移除或停用不安全寫入 |
| `review_p1_answers.html` | `p1_answer_ocr_results.json`、localStorage、export download | repoint 至 Assessments canonical P1 answers；驗證 export 不包含不必要個人資料 |
| `template-editor-v3.html` | `../pages/p1_latex_ocr_results.json` 或 `../pages/p2_latex_ocr_results.json`、`auto_templates_all.json`、`auto_templates_p2.json`、`../pages/p1_answer_ocr_results.json`、`../pages/p1_sheet_data.json`、file import／export | repoint 至已核准資料；缺失資料顯示明確狀態；輸出模板須進答案可靠性驗證 |

`evidence/` 未可因名稱推斷需要遷移。只有掃描證明頁面實際引用，而且內容通過私隱、
大小及用途審核，才可列入教師資料區。`ocr-output/` fallback 也必須確認實際存在；
否則移除或改成清楚的 unavailable 狀態。

### 8.2 公開部署安全閘門

依 `CLAUDE.md` §8，`template-editor-v3.html` 及三個 review 頁在公開 Pages 前必須：

- 掃描 HTML、JS、JSON、history diff 及 generated files。
- 確認沒有內嵌 write token、PAT、GAS 部署密鑰、service account、private key、
  client secret、管理員 credential 或學生資料。
- 最少執行針對 `token`、`secret`、`service_account`、private key marker、
  GAS deployment URL 及 GitHub API write path 的掃描，並人工核對命中。
- 不把 `no-cors`、HTTP request 已送出或前端成功訊息當作寫入成功證據。

現有 review 頁包含由使用者在瀏覽器輸入 GitHub token，再直接 PUT 到
`ai-lish/ai-learning` GitHub Contents API 的流程。即使 token 不是硬編碼，公開頁也不得
把此模式當作安全授權。A4 必須採用其中一項：

1. 公開 Pages 只提供 read-only review、local export，不提供 remote write；或
2. 改用經審核的後端授權、最小權限及可驗證回應。

在真正授權方案完成前，remote write control 必須停用，不可只以「教師用」文字、
隱藏 control 或 client-side role check 保護。

## 9. URL contract

學生 P1／P2 支援：

- `year=YYYY`
- `topic=...`
- `limit=5|10|20`
- `mode=ordered|random`
- `page=N`
- `seed=...`

正式路徑：

```text
/Assessments/hkdse/
/Assessments/hkdse/p1/
/Assessments/hkdse/p2/
```

要求：

- URL 參數與 control selected state 一致。
- 改變篩選後更新 URL、題數及顯示題目。
- 無效參數回到安全預設。
- 相同 seed reload 後次序一致。
- 所有 Assessments 內部連結用相對路徑。
- 返回教學網站使用 `https://ai-lish.github.io/ai-learning/`。
- 跨 repo link 及 raw URL 一律使用大寫 `Assessments`。

## 10. P1 學生流程

- P1 是草稿、查看答案及自評，不產生自動正確率。
- 每題提供多行輸入、完成狀態、答案顯示及「掌握／部分掌握／需重做」。
- 數學快捷輸入共用且可展開，不可為 198 題各渲染一套鍵盤。
- 初次及每頁最多顯示 20 題。

答案顯示必須處理三態：

1. 有非空 `text`：顯示答案文字，另有 image 時可提供原圖。
2. 無 `text`、只有有效 `image_path`：顯示答案原圖，不可顯示空白成功狀態。
3. `text` 與有效 image 均無：顯示「答案資料整理中」。

OCR 誠實標示：

- 含「這張圖片中的文字如下」或同類 OCR 描述、未清理前言、可疑辨識結果的 record，
  必須標示「整理中」或「未核對」。
- 不可把非空字串等同已驗證答案。
- coverage 要分開顯示有 text、有 image、皆無及 verified 狀態。

## 11. P2 學生流程與類似題

P2 正式真題主判分維持 HKDSE 專用 `checkType: "choiceKey"`：

- verified answer 只接受 `A|B|C|D`。
- 選擇與 verified answer 相同為 `correct`。
- 選擇另一有效 option 為 `wrong`。
- 缺失答案不判對、不判錯、不進入正確率分母。
- 空字串、`E`、長句或非字串是資料錯誤，排除計分。
- 修改答案後重核，先清除舊 class 及統計。
- 58 題無 solution 時顯示「暫未能自動核對」。

結果分開顯示已作答、可核對、正確、錯誤及未有答案資料。

類似題在模板通過 §6.2／§12 驗證後可以加入學生工具：

- 已驗證模板可顯示及按其已驗證 contract 計分。
- 未驗證模板只可停用，或顯示「練習用，未核對」且完全不計分。
- 類似題不可改寫、放寬或繞過真題 `choiceKey` 主判分。
- 類似題統計與真題統計分開，避免把不同可靠性資料混合。

## 12. 類似題答案可靠性閘門

每個模板最少驗證：

- 固定 seed／輸入可重現。
- 生成題目所有變數符合模板限制。
- 生成答案可由獨立計算或人工逐例核對。
- 正樣本獲判正確。
- 至少一個有效負樣本獲判錯誤。
- 無答案／非法答案不被當作正確。
- 顯示題幹、選項、圖片及答案引用無 404。
- template hash 改變後舊驗證立即失效，需重新驗證。

`template-validation.json` 不可只用單一全域 boolean；必須逐 template id 記錄狀態。
測試必須同時覆蓋：

- verified template：可顯示、可正確計分。
- pending／failed template：停用或標示，不計分。
- 缺失 template asset：功能 graceful failure，不留下壞按鈕或 blank question。

## 13. 效能、手機、localStorage 與私隱

### 13.1 效能

- 初次及每頁最多渲染 20 題。
- 圖片 lazy load；原始掃描圖預設收起。
- MathJax 只處理目前顯示題目。
- P1、P2、類似題及教師資料按頁按需載入。
- HKDSE 首頁不可預載全部題庫圖片或教師 OCR 資料。

### 13.2 手機與無障礙

測試 viewport：

- 320 x 568
- 390 x 844
- 1280 x 720

要求：

- 無不必要水平捲動。
- 操作列不遮題。
- 觸控目標及 keyboard flow 可完成主要操作。
- 公式及圖片不被裁切。
- 狀態不可只靠顏色表示。

### 13.3 localStorage／免登入／私隱

學生主流程毋須登入。使用 Assessments namespace，例如：

```text
assessments:hkdse:p1:v1
assessments:hkdse:p2:v1
assessments:hkdse:mimic:v1
```

只保存 schema version、題號、學生答案、自評／核對狀態、篩選、seed、page 及更新時間。
不得保存姓名、班別、學號、token、完整 user agent 或其他個人資料。

- reload、翻頁及篩選不遺失已作答內容。
- 提供清除本機紀錄。
- localStorage 不可用時仍可完成當次練習。
- 教師頁不得把 token 或敏感資料寫入 localStorage。

## 14. 實作範圍與排除

Assessments 可新增／修改：

- `hkdse/**`
- Assessments 首頁的 HKDSE 入口。
- README、`.gitignore`。
- HKDSE import、validation、route、grading 及 browser tests。
- V3 planning 的同版本副本。

不可因本任務修改：

- `question-bank.json`
- 初中題型 generate 邏輯
- `tool/` 既有流程
- `templates/student.html`
- `preset s1_term3_part_a`
- 與 HKDSE 無關的測試預期

A1 必須記錄 `question-bank.json` merge base 與 PR head 的 SHA-256，證明零改動。
若實作認為必須修改上述核心，應停止並回報，而不是擴大架構重寫。

## 15. PR 分拆與部署硬閘門

### PR A1：資料、匯入、處置及驗證

目標：`ai-lish/Assessments`

- 建立獨立 `hkdse/` schema、import script、catalog 及必要圖片。
- 完成 §6.4 manifest、manual-review 及 canonical difference report。
- 驗證 198／495／693 題、126／72 P1 text coverage、437／58 P2 solution coverage。
- 證明 `question-bank.json` hash 零改動。
- 不在此 PR 切換 `ai-learning`。

### PR A2：P1／P2 學生 UI

- HKDSE 首頁、P1、P2、guide。
- URL contract、P1 自評、P2 `choiceKey`、分頁、手機、localStorage。
- 不依賴 A3 才可完成核心學生流程。

### PR A3：類似題與逐模板驗證

- 遷移 `auto_templates_p2.json`、`practice_p1.json`、`practice_p2.json`。
- 建立逐模板 validation manifest 及正負樣本。
- 只啟用 verified templates。
- A3 可在 A2 後獨立進行，不阻塞核心 P1／P2 上線。

### PR A4：教師 review／template editor

教師頁可按實際 diff 併入合適 A PR，但建議獨立 A4：

- 遷移三個 review 頁及 `template-editor-v3.html`。
- 完成逐頁 dependency manifest。
- 完成秘密、寫入流程及私隱閘門。
- template editor 新產模板仍須通過 A3 逐模板驗證閘門才可計分。
- 更新 `ai-learning` 首頁連結之前，Assessments 對應頁必須已部署可用。

### A 系列真實 Pages 閘門

每個會成為 PR B 入口目標的 A 頁面，必須先在真實 GitHub Pages URL 實測。localhost、
raw file、PR diff 或未公開 preview 不足以通過。

必須驗證：

- `https://ai-lish.github.io/Assessments/hkdse/` 實際點擊至所有已部署學生／教師頁。
- CSS、JS、JSON、題目圖、答案圖、模板及教師依賴沒有 404。
- URL 大小寫正確。
- 桌面及手機核心流程通過。
- A3 未完成時，類似題入口不應出現或應清楚不可用。
- A4 未完成時，舊首頁教師連結不可提前切換至不存在頁面。

### PR B：ai-learning 入口、舊 URL 及年份

只有所有 PR B 會指向的 A 系列頁面已 merge、正式部署及通過真實 Pages 測試後，
才可 merge PR B。

PR B 內容：

- 學生 P1／P2 入口改到 `https://ai-lish.github.io/Assessments/hkdse/` 對應頁。
- `review_p1.html`、`review_p2.html`、`review_p1_answers.html`、
  `template-editor-v3.html` 的首頁連結改指 Assessments 對應頁。
- 上述教師／編輯入口目前位於 `ai-learning/index.html` 第 520–534 行附近；實作須以
  link text／舊 href 搜尋最新位置，不可只依賴行號。
- 舊學生 URL 加相容導向並保留 query string。
- 以內容搜尋逐處判定四個年份字串語境；HKDSE 通用標籤更新為 `2012–2023`，
  P2 專屬語境維持真實資料範圍。
- 保留舊 runtime 資產作回退，不在 PR B 刪除。

此為硬閘門：PR B 不可因 A PR 已開、CI 綠燈或 localhost 通過而先 merge。

## 16. 驗收條件

### Assessments

- [ ] `https://ai-lish.github.io/Assessments/hkdse/` 可載入且無 404。
- [ ] HKDSE 不在 `question-bank.json`，該檔 hash 證明零改動。
- [ ] 初中 `tool/` 不載入 HKDSE 資產。
- [ ] 未登入可完成 P1、P2 主要流程。
- [ ] P1 198 題；答案三態及 126／72 coverage 正確。
- [ ] P1 不產生虛假自動正確率。
- [ ] P2 495 題；437 可核對、58 不判錯。
- [ ] P2 `choiceKey` 正負、缺失及非法樣本通過。
- [ ] canonical P2 solutions 來自 live root 版，pages 分歧有報告。
- [ ] 類似題只有 verified template 可計分。
- [ ] 未驗證模板停用或標示「練習用，未核對」，且不計分。
- [ ] 教師／editor 每項依賴已 keep、repoint 或明確移除。
- [ ] template editor 及 review 頁無秘密外洩及未授權 remote write。
- [ ] 圖片引用完整，孤兒及 duplicate 有報告。
- [ ] 手機、效能、localStorage fallback 及私隱要求通過。
- [ ] 現有 Assessments 工具零回歸。

### ai-learning

- [ ] 首頁所有 HKDSE 學生、review、answer review、editor link 命中 Assessments。
- [ ] 沒有 orphan link、大小寫錯誤或 redirect loop。
- [ ] 舊 P1／P2 URL 導向並保留 query string。
- [ ] 四處年份字串已逐處判定語境，HKDSE 通用標籤已更新為 2012–2023。
- [ ] P2 專屬年份字串及介面維持真實資料範圍，沒有虛構 2023 題目。
- [ ] `/ai-learning/` 其他課堂工具不受影響。
- [ ] 舊 runtime 尚未刪除。

## 17. 測試矩陣

### 17.1 資料與 canonical

- [ ] P1 198 題、P2 495 題、合共 693 題，題號唯一。
- [ ] P1 answer wrapper 按 `results[id].text` 解析。
- [ ] `successful=220` 不被當成答案 coverage。
- [ ] P1 交集後 126 有非空 text、72 無 text。
- [ ] P2 437 有 solution、58 無 solution。
- [ ] 遷入 P2 solutions 等於 live root canonical 的可追蹤轉換結果。
- [ ] root／pages solutions 及 latex OCR 的 SHA-256 分歧與逐題 diff 有 report。
- [ ] 所有 runtime 圖片存在；未引用圖片及重複 hash 有 report。

### 17.2 P1

- [ ] 有 text：顯示文字。
- [ ] 只有有效 image path：顯示圖片，不出現空白成功。
- [ ] text／image 皆無：顯示整理中。
- [ ] OCR 含「這張圖片中的文字如下」等描述者標示整理中／未核對。
- [ ] 自評「掌握／部分掌握／需重做」及切換狀態。
- [ ] reload、翻頁、篩選後草稿及自評恢復。

### 17.3 P2

- [ ] `choiceKey` 答對正樣本。
- [ ] 另一有效選項答錯負樣本。
- [ ] 未作答、缺答案、非法答案不被誤判。
- [ ] 修改答案後舊 class／統計清除再判。
- [ ] 缺 solution 題不進正確率分母。

### 17.4 類似題

- [ ] verified template 可顯示、正負樣本判分正確。
- [ ] verified template 的 JSON、圖片及 editor link 無 404。
- [ ] pending／failed template 停用或標示「練習用，未核對」。
- [ ] pending／failed template 不計分、不當成正確。
- [ ] template hash 改變後驗證失效。
- [ ] 缺失 template asset graceful failure。

### 17.5 教師頁與安全

- [ ] 四頁 dependency manifest 與實際 network request 一致。
- [ ] 每個 fetch 已 keep、repoint 或移除，無靜默 fallback 404。
- [ ] `grep`／`rg` 掃描 token、secret、service_account、private key、
  client secret、GAS deployment URL 及 GitHub API write path。
- [ ] 所有命中人工核對，沒有 credential／學生資料進公開檔案。
- [ ] 「教師用」只作標示，測試不把它當授權。
- [ ] remote write 已停用，或有真正後端授權及成功／失敗驗證。
- [ ] localStorage 不保存 token。

### 17.6 URL、Pages 與入口

- [ ] 真實 Pages URL 由 HKDSE 首頁逐一點擊，沒有 404。
- [ ] 所有跨 repo URL 使用大寫 `Assessments`。
- [ ] 首頁遷移後所有 HKDSE link 命中 Assessments，無孤兒。
- [ ] 舊網址導向正確並保留 query string。
- [ ] 無 redirect loop。
- [ ] `year/topic/limit/mode/page/seed` 與 control state 一致。
- [ ] ordered／random、相同 seed、5／10／20 題及最後一頁。

### 17.7 效能、手機、免登入與私隱

- [ ] 首次最多渲染 20 題。
- [ ] 320 x 568、390 x 844、1280 x 720 通過。
- [ ] P1、P2、mimic、teacher data 按需載入。
- [ ] 免登入完成 P1／P2。
- [ ] localStorage 可用時只保存必要作答狀態。
- [ ] localStorage 不可用時仍可完成當次練習。
- [ ] 不保存姓名、班別、學號、token 或裝置識別資料。

### 17.8 Assessments 零回歸

以 Assessments 實際 `test/` 內容為準，執行其現有全部 `validate_*` 與 logic 測試；
下列檔名為現況預期，若實際檔名不同以 repository 為準。

- [ ] Assessments 首頁及 `tool/` 正常。
- [ ] `question-bank.json` hash 零改動。
- [ ] `preset s1_term3_part_a` 可選取、預覽、確認及匯出。
- [ ] `python3 test/validate_bank.py`
- [ ] `python3 test/validate_preset.py`
- [ ] `python3 test/validate_tool.py`
- [ ] `node test/test_tool_logic.cjs`
- [ ] repository 內其他 `test/validate_*` 全部通過。

## 18. PR 證據與交接

每個 A PR 描述必須包含：

- 本 planning：`PLANNING/20260612_HKDSE_P1_P2_ASSESSMENTS_V3.md`
- source repository 及 commit SHA
- scope 內／scope 外檔案
- 題數、coverage、圖片數及 runtime 大小
- manifest、hash、difference report 或 template validation report
- 自動測試及真實 Pages 測試證據
- 已知 OCR／答案／模板缺口
- 對 `question-bank.json` 及現有 Assessments 工具零回歸的證據

PR B 描述必須包含：

- 已部署的 Assessments 正式 URL
- 所有入口與舊 URL 導向清單
- query string、大小寫、404 及 redirect loop 測試
- 四處年份字串修改及 P2 年份誠實顯示證據
- 手機／桌面正式網站測試
- 明確確認舊 runtime 尚未刪除

V3 完成後保持 branch open，交回 Claude 依本文件 review。此交接不代表任何 A／B
實作已獲批准，也不授權自行 merge。
