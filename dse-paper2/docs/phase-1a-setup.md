# Phase 1A 設定指南

本文件指導由零開始啟動 `dse-paper2/` Phase 1A 工程切片。

---

## 1. 必要條件

| 工具 | 版本 | 用途 |
|---|---|---|
| Node.js | 22+ | Functions runtime + tests |
| Java JRE | 11+ | Firebase Emulator |
| Firebase CLI | 13+ | Emulator + deploy |
| Browser | Chrome / Firefox / Safari | 學生入口 |

macOS 範例：

```bash
brew install node
brew install --cask temurin@21
npm install -g firebase-tools
```

---

## 2. 安裝

```bash
git clone https://github.com/ai-lish/Assessments.git
cd Assessments/dse-paper2/functions
npm install
```

---

## 3. 填寫 Firebase 公開 config

複製 `dse-paper2/.env.example` 到 `dse-paper2/.env`（唔 commit），然後：

1. 登入 Firebase console → 揀 / 建立 `demo-dse-paper2` 項目（或自選 ID）
2. Project settings → Your apps → Register app → 攞 web config
3. 將 `apiKey` / `authDomain` / `projectId` / `appId` 填入 `dse-paper2/js/config.js`

⚠️ **公開 web config 唔係 secret**（by Firebase 設計）。真實安全由 Auth / Rules / 後端 Functions 執行。

---

## 4. 設定學校 domain allowlist

於 `dse-paper2/functions/.env.example`（或 emulator runtime config）設定：

```
ALLOWED_SCHOOL_DOMAINS=school.example.com,other-school.example.com
SCHOOL_DOMAIN_TO_ID=school.example.com:phase1a-school,other-school.example.com:school-1
```

`*.example.test` 係 RFC 6761 保留 domain，**只可作測試**。Production 必須用真實學校 domain。

---

## 5. 啟動 Emulator

```bash
cd dse-paper2/functions
npm run serve
# → Auth: http://127.0.0.1:9099
# → Functions: http://127.0.0.1:5001
# → Firestore: http://127.0.0.1:8080
# → UI: http://127.0.0.1:4000
```

---

## 6. 載入合成 fixtures

```bash
node fixtures/seed-emulator.mjs
```

呢個 script 會載入：

- 1 個 `QuestionReleaseManifest`
- 1 個 `AnswerKey`
- 1 套 `protectedQuestions/{qid}/packages/{metadata,content,feedback}`
- 1 個合成學校 + entitlement + verified / unverified / wrong-domain members
- Auth Emulator 入面建立 5 個測試 user

---

## 7. 開瀏覽器

```bash
# 學生入口（emulator 用 5002 port；production 用 GitHub Pages）
open http://127.0.0.1:5002
```

---

## 8. 跑測試

```bash
# Unit tests（pure node, ~1s）
npm run test:unit

# Emulator tests（需 Java）
npm run test:emulator
```

---

## 題目參數範圍

| 參數 | 範圍 | 排除 |
|---|---|---|
| `a` (底) | 2 – 9 | 1 |
| `m` (內指數) | -4 – 4 | |
| `n` (外指數) | 2 – 4 | 0, 1 |
| `k` (除底指數) | -6 – 6 | |
| `m·n - k` (最終指數) | -6 – 6 | |

**Rational size limit：** numerator 同 denominator 各自 ≤ 6 位數。

---

## 三個 distractor trap models

| Trap ID | 學生錯處 | 公式 |
|---|---|---|
| `trap_power_of_power_add` | `(a^m)^n` 錯算 `a^(m+n)` | `a^(m+n) / a^k = a^(m+n-k)` |
| `trap_division_exponent_add` | 同底相除指數相加 | `a^(m·n+k)` |
| `trap_negative_exponent_not_reciprocal` | 負指數冇轉倒數 | `a^|m·n-k|` (no reciprocal) |

Generator 採 **bounded retry**：每次 `a/m/n/k` 失敗（不夠 3 個 distinct distractors、size 超出、duplicate）就重抽，最多 50 次。失敗會拋出 `generator-failed`。
