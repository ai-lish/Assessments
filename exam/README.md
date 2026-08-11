# 校內考試學生 runtime

`exam/` 是 Assessments 維護的校內考試學生入口。學生可以免登入開啟已核對的試卷；作答資料只留在瀏覽器本機，不會由這個 runtime 上載。

## 公開範圍

- `index.html` 從 `data/catalog.json` 讀取公開目錄。
- `data/` 只放學生 runtime 所需的題目資料。
- 各學年目錄只包含學生頁面及其必要的本地資產。
- 未核對的試卷會留在 catalog，標示為 `needs-review`，不會出現在可作答入口。
- 教師 OCR 審核、GitHub 寫回、API 金鑰、原始試卷及未發布資料不屬於公開 runtime。

來源盤點記錄由 `docs/exam-migration-manifest.json` 保存；本批來源為
`ai-lish/ai-learning` commit `c277d3f927e51e8348fdcd1177363af23afbf473`。

## 驗證

在 repository root 執行：

```bash
npm test --prefix exam
```

本模組的檢查會驗證 catalog、學生入口／卷別檔案、必要資料資產、相對路徑及公開安全邊界。
