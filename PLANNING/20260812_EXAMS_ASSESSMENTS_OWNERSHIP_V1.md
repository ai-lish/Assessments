# 20260812_EXAMS_ASSESSMENTS_OWNERSHIP_V1

## 1. 背景與目標

使用者要求：ai-learning 的考試相關內容全部抽出，改由 ai-lish/Assessments 維護。

本文件把考試資源分成校內考試、HKDSE、仿題、OCR／教師製作流程、文件及入口，建立唯一 ownership。這不是一次把兩個 repository 整個複製，也不是立即刪除 ai-learning 舊檔案。

已有 HKDSE 遷移規格仍然有效：

- HKDSE 詳細資料／學生 UI／類似題／教師頁：PLANNING/20260612_HKDSE_P1_P2_ASSESSMENTS_V3.md
- Q17 專題生成器：PLANNING/20260810_HKDSE_P1_Q17_MIMIC_GENERATOR_V1.md
- 上一階段 Q17 integration：PLANNING/20260811_ASSESSMENTS_AILEARNING_INTEGRATION_V1.md

本文件新增的範圍是：把校內 exam/ 及所有考試相關入口、文件、製作流程一併納入 Assessments ownership。

## 2. 已核實現況

### 2.1 ai-learning

Repository：/Users/zachli/Documents/少康教學網站
branch：feat/jlpt-n1-hub
HEAD：c277d3f
工作樹：已有使用者未提交／未追蹤改動，必須保留。

校內考試 exam/：

- 約 32 MB，450 個 tracked files。
- 59 HTML、29 JSON、256 PNG、29 SVG、63 TXT、4 PDF、2 DOCX、3 JS、3 Python。
- 包含學生試卷頁、考試入口、OCR JSON、題目／頁面圖片、校內仿題、review 頁及製作／測試資產。
- 可見年份／年級包括 2024-25 S1、S3、S5 及 2025-26 S1、S3、S5。

HKDSE hkdse/：

- 約 53 MB，1,276 個 tracked files。
- 693 題 runtime：P1 198 題、P2 495 題。
- P1 126 題有非空答案文字、72 題沒有答案文字；P2 437 題有 solution、58 題沒有 solution。
- images-p1 220 個、images-p2 495 個、answer-images 229 個。
- 另有 evidence 270 個、pages 12 個、mimic-generator 14 個、OCR／dual-path／GAS／review 資產。
- Q17 generator 目前在 ai-learning 有工作樹版本，Assessments 亦有尚未由最新 main 開出的本地 draft。

入口及文件：

- root index.html 有校內考試及 DSE 入口、年份／題數硬編碼及教師工具入口。
- exam/index.html 是校內考試入口。
- hkdse/dse-practice-p1.html、hkdse/dse-practice-p2.html 是舊 HKDSE 學生頁。
- REFERENCE/exam/ 是參考／規格資料，不是學生 runtime。
- 嵌套 Assessments-* 目錄是其他 branch clone，不是 ai-learning parent 的正式資源。

已發現安全風險：

- root index.html 有前端教師密碼比較。
- exam 及 hkdse review 頁有讓使用者輸入 GitHub token 並直接呼叫 GitHub Contents API PUT 的流程。
- hkdse/mimic-generator/index.html 有 MiniMax API 呼叫路徑。
- 公開 GitHub Pages 的「教師用」標示不是權限控制；HTML、JS、JSON 均可被讀取。

### 2.2 Assessments

Repository：/Users/zachli/repos/Assessments
remote main 已核實 commit：f5f6d91b74980dc6bdc4138f0400583c39c468ed
正式 URL：https://ai-lish.github.io/Assessments/

main 已有：

- 初中 question-bank、老師工具及其 tests。
- 獨立 HKDSE hkdse/ student runtime、data、images、assets 及 A1/A2 tests。
- HKDSE 目前沒有校內 exam/ 模組。

本機 Assessments 工作樹是 codex/student-id-session-storage，不是 main，且有使用者既有未追蹤 dse-paper2/。不可直接把此工作樹當正式 PR base。

### 2.3 Published status

目前已核實：

- ai-learning 首頁 HTTP 200，但內容是 migration maintenance shell。
- ai-learning/exam/、舊 exam 年份頁及舊 hkdse/dse-practice-p1.html 公開 URL 目前 404。
- Assessments/hkdse/ HTTP 200。
- Assessments/exam/ 尚不存在，HTTP 404。

因此現時不能聲稱考試功能已完成遷移；本文件的第一個目標是建立可部署的 canonical target。

## 3. Canonical ownership

| 類別 | 遷移後正式來源 | ai-learning 處理 |
|---|---|---|
| HKDSE P1/P2 student runtime | Assessments/hkdse/ | 只保留 compatibility link／短期回退 |
| 校內考試 student runtime | Assessments/exam/ | 只保留 compatibility link／短期回退 |
| 已核准校內題目、答案、圖片 | Assessments/exam/data、images | 不再作第二份更新來源 |
| 已核准 HKDSE data、答案、圖片 | Assessments/hkdse/data、images | 不再作第二份更新來源 |
| 已驗證仿題 runtime | Assessments/exam/mimic 或 hkdse/mimic | ai-learning 不再新增模板 |
| OCR／仿題 authoring code | Assessments 對應 teacher／scripts 區，先完成安全閘門 | 不再作 canonical 維護 |
| 未發布／保密試卷、答案、學生資料 | 不可放入公開 Assessments；留在受保護來源 | 不得公開搬遷 |
| 參考文件及 planning | Assessments/docs 或 PLANNING | 可保留歷史副本，不能當 runtime |
| 根首頁及網站導航 | ai-learning | 只負責指向 Assessments |

Assessments 是公開 repository／Pages。凡未確定可公開的 PDF、答案、OCR 原文或個人資料，都必須先標示 manual-review，不可因使用者要求「全部抽出」而公開。

## 4. 目標結構

### 4.1 Assessments 校內考試

建議新增：

- exam/index.html：校內考試學生入口
- exam/catalog.json：年份、年級、學期、卷別、題數及 asset coverage
- exam/data/：只放已核准 student runtime JSON
- exam/images/：按 catalog／runtime reference allowlist 遷移
- exam/mimic/：已驗證仿題 runtime 及 validation manifest
- exam/teacher/：read-only review／editor code；未有真正後端授權前不得 remote write
- exam/scripts/：import、build catalog、route／data validation
- exam/test/：schema、route、grading、mimic、browser smoke tests
- exam/docs/：使用說明、source metadata、disposition manifest

不得把整個 ai-learning/exam/ 原樣放入 Assessments；PDF／marking scheme、OCR 原文、review 輸出及 build 工件須逐項 disposition。

### 4.2 Assessments HKDSE

沿用 V3 所定 hkdse/：

- student runtime 與 teacher／mimic／data 分開。
- Q17 standalone generator 歸入 hkdse/mimic/。
- P1/P2 data、圖片、答案、OCR evidence、仿題模板不可混入初中 question-bank。
- teacher review 頁在公開版先 read-only 或明確停用 remote write。

## 5. Disposition 分類

每個來源檔案必須在 machine-readable manifest 記錄：

source path、disposition、source size／count、destination、consumer、reference count、hash、canonical reason、unresolved difference。

可用 disposition：

- public-runtime：已核准的學生頁、題目 JSON、必要圖片及可公開答案。
- keep-selected：被實際 consumer 使用，需逐檔遷移及測試。
- teacher-readonly：教師 review／editor code，只可 read-only、local export 或真正後端授權。
- manual-review：答案版本、OCR、PDF、marking、image 或 visibility 有分歧。
- private-source：未發布試卷、未公開答案、學生資料或其他不可公開資產，不進公開 Assessments。
- exclude-rebuild：backup、cache、pyc、可重建報告、重複輸出，不遷移。
- compatibility-only：舊入口、返回頁及 query-preserving 導向，不保留 runtime data。
- reference-only：規格、方法、歷史 planning，不進學生頁。

初步處置：

- exam/各年份 student index／p1／p2／p3：public-runtime 或 manual-review，逐頁測試後遷移。
- exam/ocr/：keep-selected 或 manual-review；只有 student runtime 真正引用且可公開的記錄才進 data。
- exam/*/questions、figures、svg：按 runtime reference allowlist 遷移；孤兒及重複圖片列報告。
- exam/mimic/：另開逐模板驗證；未驗證模板不得計分。
- exam/review-p1.html、review-p2.html、年份 review.html：teacher-readonly；移除或停用公開 remote write。
- exam/README.md、REFERENCE/exam/：reference-only 或遷入 Assessments/docs/exams。
- hkdse/既有 V3 資產：按 V3 A1–A4 disposition，不與校內 exam 大批複製混合。
- hkdse/evidence、pages/backup、__pycache__、gas-project：exclude 或 manual-review，不進學生 runtime。
- hkdse/mimic-generator 舊 API／editor：keep-selected 或 teacher-readonly；不把 MiniMax API key／write flow帶入 Assessments。
- root index.html：PR B 只改 exam／DSE 入口及舊網址 compatibility，不在本 PR 重寫整個首頁。

## 6. 分階段 PR

### PR 0：Inventory／manifest

目標：兩 repo 都引用本 planning；產生 exam 與 hkdse 的來源、consumer、hash、disposition manifest。

要求：

- 以明確 source commit 建立 manifest。
- 列出 450 個 exam files 及 1,276 個 hkdse files 的處置。
- 標出公開、教師、private-source、backup、duplicate、manual-review。
- 不刪除、不改寫題目、不切換 ai-learning 入口。

### PR A：Assessments HKDSE

沿用 V3 A1/A2；先完成最新 origin/main base 的 data／runtime／Q17 canonical PR。不得使用目前 dirty branch 直接作 base。

### PR B：Assessments 校內考試 student runtime

可新增／修改 Assessments/exam/、對應 scripts、tests、README 及 planning manifest。

要求：

1. 只遷移已核准可公開內容。
2. 建立 catalog，來源年份／年級／學期／卷別由資料計算，不再靠 ai-learning root 的硬編碼。
3. 保留學生免登入流程、MathJax、圖片、作答／核對／重做行為，但修正 404、根路徑及 mobile 問題。
4. 題目／答案 coverage 不足時清楚標示，不假造正確率。
5. Assessment 初中 question-bank、tool、templates 不得受校內考試資產影響。
6. 加入 schema、route、asset、grading 及 browser tests。

### PR C：仿題 runtime

分 exam 與 HKDSE 建立逐模板 validation manifest：

- template id、hash、版本、驗證方法、正負樣本、狀態、日期。
- verified 才可自動判分。
- pending／failed 只可停用或標示「練習用，未核對」，不計分。
- 不得把 MiniMax 或未驗證答案當成 runtime 依賴。

### PR D：Teacher review／authoring

- 遷移 read-only review、local export、editor 及 scripts。
- 每頁產生 dependency manifest。
- 移除前端 GitHub token PUT；沒有真正 backend authorization 前不得 remote write。
- 「老師用」不可視為 access control。
- 如資料屬未公開／保密，改用 private source，不放公開 Assessments。

### PR E：ai-learning compatibility entry

只有對應 Assessments Pages 真實部署成功後才可做：

- root index.html 的校內考試入口改至 https://ai-lish.github.io/Assessments/exam/。
- DSE 入口改至 https://ai-lish.github.io/Assessments/hkdse/。
- 舊 exam/index.html、年份 index、hkdse 舊 student URL 提供 compatibility shell／導向並保留 query。
- 不在 ai-learning 保留第二套 runtime data／答案更新。
- 保留舊檔案至 cleanup PR，避免未驗證的 link／404。

### PR F：Cleanup／停止雙重維護

只有 PR A–E 已部署並完成 classroom smoke test 後：

- 從 ai-learning 移除已遷移的 runtime duplicates。
- 保留必要 compatibility pages、歷史 planning、source metadata 及 private-source 指引。
- 每個刪除項目需有 manifest、consumer scan、Git history 可回復性及 PR review。
- 不刪除未經 disposition 的 PDF、答案、OCR、teacher source 或學生資料。

## 7. 安全及私隱硬閘門

以下內容不可原樣搬到公開 Assessments：

- 前端密碼比較或任何 hard-coded teacher credential。
- 前端 GitHub PAT／token 輸入後直接 Contents API PUT。
- MiniMax／其他 API key 或未授權 write endpoint。
- 學生姓名、學號、班別、成績、答題紀錄或可識別資料。
- 未發布試卷、marking scheme、答案或校內考試機密。

公開 teacher page 的最低要求：

- read-only 或 local export。
- token 不進 localStorage、URL、下載檔或 log。
- 寫入流程若保留，必須由真正 backend 驗證權限、回應及失敗。
- 所有公開 source、history diff、generated files 做 secret／privacy scan。

## 8. 驗收條件

### Ownership／資料

- [ ] 450 個 exam files 及 1,276 個 hkdse files 有 disposition manifest。
- [ ] 每一個 Assessments runtime JSON／image 都有來源 commit、hash、schema version。
- [ ] 沒有把未核准 private-source 放入公開 repo。
- [ ] no duplicate canonical data：後續更新只在 Assessments。
- [ ] 初中 question-bank 與既有老師工具零改動／零 HKDSE 或校內考試大型資產載入。

### Student runtime

- [ ] Assessments/exam/ 及 Assessments/hkdse/ 可由各自入口載入。
- [ ] 未登入可完成主要學生流程。
- [ ] catalog、題目、答案、圖片、仿題依賴無 404。
- [ ] 320×568、390×844、1280×720 可用；主要公式及圖片不裁切。
- [ ] keyboard／touch、開始、輸入、核對、答案、下一題／重做流程可用。
- [ ] 缺答案／未驗證模板不被當成錯誤或正確。
- [ ] MathJax／fallback、列印及 local state 行為通過。

### Teacher／安全

- [ ] review／editor 所有 fetch／XHR／dynamic asset 有 dependency manifest。
- [ ] 公開頁沒有 password、token、API key、student data 或未授權 write。
- [ ] remote write 已移除、停用，或由真正 backend 授權及驗證。
- [ ] 未驗證模板不計分。

### Navigation／deployment

- [ ] ai-learning 主入口只在 Assessments 對應 Pages 200 且 smoke test 通過後切換。
- [ ] 舊 URL compatibility 不 404、不 loop、保留 query。
- [ ] 跨 repo URL 使用大寫 Assessments。
- [ ] live Pages 從首頁逐點擊測試，不以 localhost 或 raw file 代替。
- [ ] cleanup 前後均保留可回復路徑及明確文件。

## 9. 必要測試

Assessments 現有測試全部通過，並新增：

- manifest／hash／source commit validator。
- exam catalog／route／relative path validator。
- JSON schema／question count／answer coverage validator。
- image allowlist、missing、orphan、duplicate hash validator。
- mimic verified／pending／failed grading validator。
- public secret／private data／remote write scan。
- browser smoke：入口、返回、student core flow、teacher read-only、320／390／1280。
- GitHub Pages curl／HTML／asset／console／404 smoke。

已有 HKDSE 必須繼續通過：

- hkdse/test/run-all.mjs
- hkdse/test/validate-student-ui.mjs
- hkdse/test/validate-q17.mjs
- 根目錄 question-bank、preset、teacher tool、logic regression。

## 10. Completion definition

只有以下全部成立才可宣稱「考試已抽出由 Assessments 維護」：

1. PR 0 manifest 完成，所有來源有 disposition。
2. PR A–D 相關學生／仿題／教師功能在 Assessments 有 canonical implementation。
3. Codex Ready Review 結果清楚。
4. OpenClaw check/test/merge 已完成。
5. Assessments GitHub Pages 由入口實際 smoke test 通過。
6. ai-learning compatibility entry 已部署且無 404／loop。
7. PR F cleanup 已按 manifest 完成，沒有第二套 canonical runtime。
8. classroom requirement、planning、文件及 published behavior 一致。

在上述條件完成前，只可稱為「migration planning／分階段 draft」，不可稱為完成。

## 11. PR 交接要求

每個實作 PR 必須引用本文件，列出：

- source repo、source commit、destination path。
- scope 內及 scope 外檔案。
- disposition manifest、hash、coverage、unresolved differences。
- student／teacher／private-source 分界。
- 測試及真實 Pages 結果。
- 未完成項目、風險及下一個 PR。

禁止：

- 直接複製整個 exam/ 或 hkdse/。
- 在 dirty branch 直接作正式 migration base。
- 先切換 ai-learning 入口再部署 Assessments。
- 用「教師用」或前端密碼當作安全控制。
- 靜默合併不同答案／OCR／solution 版本。
- 未經核准刪除舊資料。

