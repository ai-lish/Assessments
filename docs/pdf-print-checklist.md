# PDF 雙版列印人工檢查清單

PR-A3 自動測試會固定 seed 比對 snapshot JSON、學生版 print HTML、教師版 print HTML，並輸出本地人工檢查用 HTML：

```bash
node test/pdf_snapshot.cjs
open test/artifacts/pdf/s1_term2_part_a.print.html
open test/artifacts/pdf/s1_term3_part_a.print.html
open test/artifacts/pdf/s2_term3_part_a.print.html
open test/artifacts/pdf/s3_term3_part_a.print.html
```

## 必檢項目

- A4 直向列印預覽正常，無橫向裁切。
- 每題 block 沒有被分頁切開；題號按 snapshot array index 順序。
- 學生版與教師版題序、題目內容及題目 code 完全一致。
- 教師版答案以紅色粗體顯示，沒有溢出右欄。
- SVG 題型不超出左欄：coordinate、congruence、triangle_center。
- MathJax 題型渲染正常：分數、指數、科學記數法、不等式、π、百分號。
- 長答案可換行或縮在答案欄內，不覆蓋下一題。
- 列印前畫面完成 MathJax typeset，沒有 raw `\(...\)` 外露。

## 真機／瀏覽器層面

- Chrome / Edge 桌面列印預覽。
- Safari 桌面列印預覽。
- iPad Safari：可開啟列印視圖；如未能直接列印，確認可用分享或系統列印流程。

示例 HTML 不是正式派發檔；正式派發仍由老師工具或 `scripts/gen_exercise_html.cjs` 使用同一模板與 registry 產生。
