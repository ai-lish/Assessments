# Google Sheets 提交 Endpoint

本目錄提供 `docs/gas/submit-endpoint.gs`，供監督者部署到目標 Google Sheet。

## 功能

- 接收學生練習提交的 `rows` payload。
- 按 `grade` 分頁：
  - `s1` → `中一`
  - `s2` → `中二`
  - `s3` → `中三`
  - 其他或缺失 → `未分類`
- 分頁不存在時自動建立。
- 第一行自動寫入 header：
  `grade, studentId, toolId, attemptNumber, attemptType, score, total, remainingWrongCount, completedAll, date, time`

## 部署步驟

1. 開啟目標 Google Sheet。
2. 選擇「擴充功能」→「Apps Script」。
3. 建立或打開 `Code.gs`，貼上 `submit-endpoint.gs` 全部內容。
4. 儲存專案。
5. 選擇「部署」→「新增部署作業」。
6. 類型選「網頁應用程式」。
7. 執行身分選「我」。
8. 存取權按學校政策設定；若學生免登入提交，通常需選「任何知道連結的人」。
9. 複製 Web App URL，交由生成工具/部署流程填入 `GAS_URL`。

## 注意

- 不要把真實 Web App URL、token 或可寫入 secret 寫死入 repo。
- 學生 HTML 內的 `GAS_URL` 仍由生成參數配置；本 repo 只提供 endpoint 程式碼。
- 已發佈 `exercises/` 練習不會自動取得新 URL；部署真實 GAS URL 後，需用正式發佈管道帶 `--gas-url=...` 重新生成及發佈。
- 前端使用 `no-cors` 時無法確認伺服器是否成功寫入，老師應以 Google Sheet 內容作最終確認。
