# Google Sheets 提交 Endpoint

本目錄的 `submit-endpoint.gs` 用於同一個已部署的 Google Apps Script Web App，兼容 ai-learning 舊工具與 Assessments 新練習。

## 兩種資料格式

|來源|辨識方式|寫入位置|欄位|
|---|---|---|---|
|ai-learning 舊工具|`rows` 中沒有 `grade`|維持 Apps Script 活躍分頁|日期、時間、學生編號、總分、題號、題目摘要、作答、我的答案、正確答案|
|Assessments 新練習|每筆 attempt row 有 `grade`、`attemptType`，或 payload 本身有兩者|`s1`→中一、`s2`→中二、`s3`→中三、其他→未分類|`grade, studentId, toolId, attemptNumber, attemptType, score, total, remainingWrongCount, completedAll, date, time`|

年級分頁不存在時會自動建立並寫入 header。舊格式不會改動原本活躍分頁的欄位或名稱。

## 已知舊契約差異

查證時發現目前 ai-learning 的 `2025-26-中一-第三學期-甲部.html` 送出的是沒有 `grade` 的 attempt-summary rows；而既有部署 GAS 的九欄 mapping 是逐題資料欄位。為避免改壞既有工具，本 endpoint 對所有沒有 `grade` 的 `rows` 一律保留原本活躍分頁與九欄 mapping，不自行轉換舊資料。部署時必須實測舊工具一筆資料，確認現有 Sheet 的實際結果符合老師預期。

## 部署：保留同一 URL

1. 開啟現有 Google Sheet 的 Apps Script 專案，將 `Code.gs` 全文替換成 `submit-endpoint.gs`，儲存。
2. 選擇「部署」→「管理部署作業」→現有的 Web App→「編輯」→建立新版本並部署。不要建立新的 deployment，原有 Web App URL 必須保持不變。
3. 手動測試兩次：先由 ai-learning 舊工具送出一筆舊格式資料，確認它仍寫入原活躍分頁；再由 Assessments 練習送出一筆完成的 attemptLog，確認它寫入對應的中一／中二／中三分頁。

## 生成已發佈練習

GAS URL 只作生成參數使用，template 沒有寫死 URL。部署後以正式管道重生四份練習：

```bash
node scripts/gen_exercise_html.cjs \
  --gas-url='https://script.google.com/macros/s/你的既有部署ID/exec' \
  s1_term2_part_a s1_term3_part_a s2_term3_part_a s3_term3_part_a
```

本 PR 使用現有 ai-learning endpoint 重生四份檔案。此 URL 是公開提交目的地，不含 token；如日後更換 endpoint，必須以同一參數重新生成。

## 注意

- 前端使用 `no-cors`，只代表已嘗試送出；最終以 Google Sheet 內容確認。
- Apps Script 無法在 repo 本地模擬 SpreadsheetApp。PR 只會做靜態 contract 檢查；上述兩次真實手測是部署驗收的一部分。
