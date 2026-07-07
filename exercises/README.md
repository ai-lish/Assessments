# exercises/

正式匯出成果庫(取代舊 `samples/`)。每份 HTML 係一份**學生版練習**,由
`scripts/gen_exercise_html.cjs` 從 `question-bank.json` + `templates/student.html`
產生,內含 `QUESTION_SPECS` 但**冇預生成題目參數**。

## 隨機聲明

- 學生每次開啟 HTML,browser runtime 會**重新生成所有題目參數**(PR #21 後嘅行為)。
- 同一題目兩次開啟,**答案 / 題型內容會唔同**;老師批改前可預覽 1 次先。
- 唯一固定嘅係題目類型同題數(由 preset 決定)。

## 目錄結構

```
exercises/
├── {學年}/                          # 4 位數,如 2526
│   ├── {年級}/                     # s1 / s2 / s3
│   │   ├── {學期}/                  # t1 / t2 / t3
│   │   │   ├── part-a-{01..03}.html # 常規練習(每年每級每學期上限 3 份)
│   │   │   └── custom/              # 自訂組合(跨學期選題)
│   │   │       └── {name}.html
│   │   └── by-topic/
│   │       └── {topicKey}/          # 按課題分類練習
│   │           └── {name}.html
│   └── ...
```

例:`exercises/2526/s1/t2/part-a-01.html` = 2025-26 學年中一第二學期甲部常規練習第 01 份。

## 命名規則

| 模式 | 目標路徑 | 檔名慣例 | 上限 |
|---|---|---|---|
| 常規(preset) | `exercises/{year}/{grade}/{term}/` | `part-a-01.html` ~ `part-a-03.html` | 每級每學期 3 份 |
| 自訂組合 | `exercises/{year}/{grade}/{term}/custom/` | `custom-{NN}.html` 或 `{slug}.html` | 不設上限 |
| 按課題 | `exercises/{year}/{grade}/by-topic/{topicKey}/` | `{topicKey}-{NN}.html` 或 `{slug}.html` | 不設上限 |

`{year}` 預設 `2526`(由 `bank.data[i].code` 前綴 `LSC-{year}-...` 抽出);`{grade}` / `{term}` 由 preset.key 嘅 `s{1,2,3}_term{1,2,3}_part_a` pattern 推導。

## 產生流程

1. 老師喺 `tool/index.html` 揀 preset(或 custom 模式自選題目)。
2. 按 **⑥ 發佈指令包** → JSON 包被複製/顯示。
3. 將 HTML 連同 JSON 指令包貼俾 agent。
4. Agent 跑 `node scripts/publish_exercise.cjs <export.html> <package.json>` →
   自動 mkdir + cp 入正確路徑,並 print `gh pr create` 指令序列。
5. Agent 跑指令 → 開 PR 入庫。
6. PR merge → GitHub Pages 自動 deploy。

詳細 prompt 範本同 publish script 嘅 gh CLI 輸出格式見
`scripts/publish_exercise.cjs`(註解 + 終端輸出)。

## 首批產出(2026-07-06,MacD)

| 檔案 | preset | 題數 | 模式 |
|---|---|---|---|
| `exercises/2526/s1/t2/part-a-01.html` | `s1_term2_part_a` | 14 | regular |
| `exercises/2526/s1/t3/part-a-01.html` | `s1_term3_part_a` | 16 | regular |
| `exercises/2526/s2/t3/part-a-01.html` | `s2_term3_part_a` | 16 | regular |
| `exercises/2526/s3/t3/part-a-01.html` | `s3_term3_part_a` | 14 | regular |

每份檔案:
- ~200 KB(inline 包含 `tool/generators.js` + `tool/validators.js` standalone)。
- `QUESTION_SPECS` populated,`QUESTIONS_DATA = []`,`RUNTIME_SEED = null`。
- 學生開啟時,browser runtime 生成 14/16 條題目,每次唔同。

## 舊 `samples/` 處理

`samples/` 已於 2026-07-06 清空(s1-t2-part-a.html / s1-t3-part-a.html / s3-t3-part-a.html
+ regenerate_samples.sh + README.md 全部刪除)。`samples/*` 嘅舊 URL 喺 GitHub Pages 上而家
係 404;首頁已加 banner 提醒用戶改用 `exercises/`。如日後需要保留舊 URL 嘅歷史紀錄,
PR description 應包含全部舊路徑 + 對應新路徑嘅 mapping。
