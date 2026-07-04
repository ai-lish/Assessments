# samples/ — 學生示例 standalone HTML

本目錄收錄三份由 `scripts/gen_practice_html.cjs` 生成嘅學生練習示例（standalone HTML），
可以直接喺 GitHub Pages 上訪問，無需登入。

> ⚠️ **示例非派發版** — 呢度嘅檔案係**示例／預覽**用途。正式派發版本請用
> `tool/index.html` 嘅「老師選題工具」按需要揀題、預覽、再匯出 standalone。
> 匯出嘅派發版可離線派發，行為同 `samples/` 一致（`scripts/gen_practice_html.cjs` 係
> headless 嘅正式匯出管道）。兩者嘅題目內容因為隨機參數唔同會有差異，但 BANK_HASH、
> 排版、判分邏輯完全相同。

## 文件清單

| 文件 | 學期 | 題數 | 第一題編碼 |
|---|---|---|---|
| `s1-t3-part-a.html` | 中一甲部 · 第三學期 | 16 | `LSC-2526-S1-T3-01-NA-1` |
| `s1-t2-part-a.html` | 中一甲部 · 第二學期 | 14 | `LSC-2526-S1-T2-01-NA-3` |
| `s3-t3-part-a.html` | 中三甲部 · 第三學期 | 14 | `LSC-2526-S3-T3-01-NA-16` |

## 線上入口

* 中一 T3 16 題：<https://ai-lish.github.io/Assessments/samples/s1-t3-part-a.html>
* 中一 T2 14 題：<https://ai-lish.github.io/Assessments/samples/s1-t2-part-a.html>
* 中三 T3 14 題：<https://ai-lish.github.io/Assessments/samples/s3-t3-part-a.html>

首頁索引：<https://ai-lish.github.io/Assessments/> → 進入「初中短答網頁製作」section。

## 生成資訊

* **生成日期（最近一次）**：見每份 HTML 入面 `const GENERATED_AT` 行（`ISO 8601` 格式 UTC）
* **來源 commit**：`e7f3618`（chore: retrigger Pages deploy after transient GitHub deployment failure）
  — 本 README 喺 PR-HOME2 修正任務中建立，PR merge 後請用 merge commit 覆寫此行。
* **生成指令**（可重現）：

  ```bash
  bash scripts/regenerate_samples.sh
  ```

  腳本內部呼叫：

  ```bash
  node scripts/gen_practice_html.cjs question-bank.json templates/student.html samples/
  ```

  再用 `mv` 將預設嘅日期後綴檔名改成 `s1-t3-part-a.html` / `s1-t2-part-a.html` / `s3-t3-part-a.html`。
  改名純粹為咗 URL 穩定，內容由 generator 直接寫出。

## 隨機性 vs 確定性

* **BANK_HASH** 係基於 `bank.data` + preset + 題目參數嘅 SHA1（前 8 hex 位），所以
  同一份 `question-bank.json` + 同一個 preset 永遠產生同一個 BANK_HASH。
* **題目內容**（數值、選項等）由 `tool/generators.js` 用 `Math.random()` 抽參數。
  為咗令兩次重生嘅 diff 穩定，`scripts/gen_practice_html.cjs` 喺每個 preset 開頭
  注入 fixed-seed PRNG（xorshift32，seed = `assess-samples-<presetKey>`）。
  結果：每次 `regenerate_samples.sh` 跑出嚟嘅 3 份檔案**除 `GENERATED_AT` 時間戳外完全相同**。
* 唔同 preset 之間嘅隨機性保持獨立（唔同 seed base），所以 S1-T3 同 S3-T3 嘅題目
  唔會因為「共用 random state」而失同步。

## 題型編碼（code 欄位）

每題 standalone 嘅 `QUESTIONS` JSON 入面都加咗 `code` 欄位（例如 `LSC-2526-S1-T3-01-NA-1`），
UI 喺題目下方會用 monospace 字體顯示「題型編碼：LSC-…」。

* 編碼規則見 [`docs/question-codes.md`](../docs/question-codes.md)
* 呢項係**授權改動**（supervisor approved）— `tool/index.html#exportStudent` 同
  `scripts/gen_practice_html.cjs` 都加咗 `code: t.code`；純 metadata，**唔影響判分邏輯**。
* 派發版（老師工具匯出）會自動繼承此改動。

## 點樣驗證？

1. 開首頁：<https://ai-lish.github.io/Assessments/>
   確認 2 大 section：「初中短答網頁製作」+「HKDSE」。
2. 開任何一份 sample，喺第 1 題下面睇到「題型編碼：LSC-…」。
3. 做 1 題：輸入答案 → 睇 ✅ / ❌ → 撳「下一題」可順利跳。
4. 關瀏覽器 → 重開：localStorage 嘅 saved attempt 會自動 restore。

## 私隱

* 學生作答只 save 喺本機 localStorage（key = `assess_attempts_<BANK_HASH>`）。
* 唔會寄出任何 telemetry。冇 cookie。冇 fingerprinting。
