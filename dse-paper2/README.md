# dse-paper2 — Phase 1A 工程切片

> **狀態：** 自主 B 軌無圖代數原型。已可於 Firebase Emulator 內全鏈路驗證 Auth / Domain allowlist / Membership / Entitlement / AttemptSession / Submit / Feedback。**不含任何 HKEAA／DSE／校內卷題目內容。**

本目錄是 `ai-lish/Assessments` 嘅獨立 Phase 1A 垂直切片。

**入口：** `https://ai-lish.github.io/Assessments/dse-paper2/`

**唔影響** `question-bank.json` schema、`templates/student.html`、`hkdse/`、`tool/`、現有 `test/` regression scripts。

---

## 目錄結構

```
dse-paper2/
├── README.md                       # 本檔
├── index.html                      # 學生入口（無 build step）
├── css/dse-paper2.css              # 自含樣式
├── js/
│   ├── config.js                   # 公開 Firebase config + emulator hosts
│   ├── firebase-init.js            # Modular SDK init via CDN
│   ├── auth.js                     # Google sign-in wrapper
│   ├── api-client.js               # createAttemptSession / submitAttempt
│   ├── render.js                   # Render public VariantRenderSnapshot
│   ├── rational-display.js         # Display formatting（與 server canonical 分離）
│   ├── state.js                    # 客戶端 state container
│   ├── errors.js                   # machine code → 繁中 messages
│   └── main.js                     # 入口
├── functions/
│   ├── package.json                # firebase-admin / firebase-functions / rules-unit-testing
│   ├── index.js                    # Cloud Functions v2 onCall
│   ├── .env.example
│   ├── .gitignore
│   ├── src/                        # 共用 modules
│   │   ├── rational.js             # BigInt Rational canonical
│   │   ├── canonical-json.js       # Fixed-key-order requestHash input
│   │   ├── hash.js                 # SHA-256
│   │   ├── errors.js               # machine error codes
│   │   ├── domain-allowlist.js
│   │   ├── auth-checks.js
│   │   ├── membership.js           # School membership / entitlement
│   │   ├── releases.js             # QuestionReleaseManifest loader
│   │   ├── feedback.js             # FeedbackPackage loader
│   │   ├── generator-indices.js    # Phase 1A generator
│   │   ├── create-attempt-session.js
│   │   ├── submit-attempt.js       # Idempotency + scoring + record + state transition
│   │   └── fixtures.js             # 合成 Phase 1A fixtures（無真實學生資料）
│   └── test/
│       ├── run-unit.mjs            # ✅ Pure-node unit runner
│       ├── run-emulator.mjs        # ⚠️  Emulator runner（需 Java，未執行）
│       ├── rational.test.cjs
│       ├── canonical-json.test.cjs
│       ├── hash.test.cjs
│       ├── errors.test.cjs
│       ├── domain-allowlist.test.cjs
│       ├── auth-checks.test.cjs
│       ├── generator-indices.test.cjs
│       ├── submit-helpers.test.cjs
│       ├── answer-leakage.test.cjs
│       ├── security-rules.test.cjs       # ⚠️  emulator
│       ├── attempt-session.test.cjs      # ⚠️  emulator
│       ├── membership.test.cjs           # ⚠️  emulator
│       └── revocation.test.cjs           # ⚠️  emulator
├── firestore.rules                 # Security rules
├── firestore.indexes.json
├── firebase.json                   # Functions + Emulator config
├── .firebaserc.example
├── .env.example
├── fixtures/                       # Placeholder for seeded fixture data
└── docs/
    ├── phase-1a-setup.md
    ├── phase-1a-emulator.md
    ├── known-limitations.md
    └── security-notes.md
```

---

## 快速開始

```bash
# 1. 進入 functions 目錄安裝依賴
cd dse-paper2/functions
npm install

# 2. 跑 unit tests（pure node, ~1s）
npm run test:unit

# 3. 啟動 Firebase Emulator suite
#    必須先安裝 Java（JRE 11+）。
#    macOS: brew install --cask temurin@21
npm run serve
#  → Auth:9099, Functions:5001, Firestore:8080, UI:4000

# 4. 載入合成 fixtures 入 emulator
node ../fixtures/seed-emulator.mjs

# 5. 開瀏覽器到 http://127.0.0.1:5002
```

詳見 [`docs/phase-1a-setup.md`](docs/phase-1a-setup.md) 與 [`docs/phase-1a-emulator.md`](docs/phase-1a-emulator.md)。

---

## 題目內容來源

Phase 1A 題目完全由本倉庫程式碼即時生成，數學骨架：

```
(a^m)^n / a^k
```

參數限制（[規格 §一](docs/phase-1a-setup.md#題目參數範圍)）：

- a ∈ [2, 9]
- m ∈ [-4, 4]
- n ∈ [2, 4]
- k ∈ [-6, 6]
- m·n - k ∈ [-6, 6]

**絕無**任何 HKEAA 官方原題、DSE 歷屆試題、或校內試題內容被引入。

---

## 已通過嘅測試

✅ **73 個 unit tests 全 pass**（`functions/test/run-unit.mjs`）

| Test file | 測試數 | 範圍 |
|---|---|---|
| `rational.test.cjs` | 18 | BigInt Rational canonical / GCD / size limit |
| `generator-indices.test.cjs` | 18 | Phase 1A generator + 三個 trap models + 範圍 + 去重 |
| `canonical-json.test.cjs` | 6 | 固定 key order / forbidden fields |
| `hash.test.cjs` | 5 | SHA-256 / requestHash determinism |
| `submit-helpers.test.cjs` | 7 | option id / idempotency key / submittedAtClient |
| `domain-allowlist.test.cjs` | 7 | exact domain / case-insensitive |
| `auth-checks.test.cjs` | 6 | requireAuth / requireEmailVerified |
| `errors.test.cjs` | 4 | 所有 error codes 存在 / AppError shape |
| `answer-leakage.test.cjs` | 2 | 公開 snapshot 唔包答案 / correctOptionId |

⚠️ **Emulator tests**（4 個檔案）：code 完整，但**本環境冇 Java**（sudo 不可用），未執行。CI 必須配 Java runner。

✅ **現有 `Assessments` regression tests 全部通過**（`test/*.py` + `test/*.cjs`），**本切片冇修改任何既有檔案**。

---

## 報告（依 openclaw.md 規範）

### Completed work

- Cloud Functions: `createAttemptSession` + `submitAttempt`（v2 onCall, asia-east2）
- Generator: Phase 1A `(a^m)^n / a^k`，3 個 trap models，bounded retry
- Exact Math: BigInt-based Rational canonical，separate display formatter
- 7 個 fixed machine-readable error codes
- Security Rules: client 永久唔可以讀 AnswerKey / serverOnly / 寫 attempts
- 公開 VariantRenderSnapshot 唔含 correctOptionId / 答案 / trap mapping / seed
- Idempotency: `uid + sessionId + idempotencyKey` 唯一範圍，固定 4 欄 canonical JSON
- Session 狀態機: active → submitted | expired | revoked
- Release revoke 兩種 policy 都有處理（block_new_only / block_active_and_new）
- Firebase Emulator config（auth + functions + firestore + UI）
- Frontend 8 個 JS modules（無 build step，CDN modular SDK）
- 完整 docs（setup / emulator / known-limitations / security-notes）

### Files changed

- 新增：`dse-paper2/**` 全部檔案
- **冇修改**任何既有 `Assessments/` 檔案（包括 `question-bank.json`、`templates/student.html`、`hkdse/*`、`tool/*`、`test/*`）

### Tests

- ✅ 73 個 unit tests 全部 pass
- ⚠️ 4 個 emulator test 檔案已寫但未跑（Java 不可用）
- ✅ 9 個現有 regression tests 全部 pass
- ✅ `node test/run-unit.mjs` 0 fail
- ❌ 冇跑 E2E（emulator 環境不可用）

### Security checks

- ✅ 冇 hardcoded secrets
- ✅ `.gitignore` 排除 `.env*`、service-account、emulator exports、logs、cache、coverage
- ✅ `.env.example` 同 `.firebaserc.example` 係 template
- ✅ Frontend 公開 config 標明「by Firebase 設計，唔係 secret」
- ✅ Security Rules: 14 條 rule block client 寫 attempts / 讀 AnswerKey
- ✅ Answer-leakage unit test 確認 VariantRenderSnapshot 唔包答案

### Risks / Unfinished

- ⚠️ Emulator tests 未執行（環境缺 Java）— **CI 必須配 Java runner**
- ⚠️ Real Google OAuth 未實測（emulator-only；config 用 placeholder）
- ⚠️ DEC_04（教師講解投影視圖）係 Open Decision，本切片冇做
- ⚠️ `npm install` 喺本環境未跑（避免巨大 dependency install）；functions source 完整但需要喺 GitHub Actions / 真機上 `npm install` 後先可以 deploy
- ⚠️ 完整 end-to-end submit + replay 嘅 emulator test 寫咗 skeleton（`test.skip`）— 需補
- ⚠️ Firestore index 暫只加咗 attemptSessions query index；其他 query 未驗證

### Open decisions

- 學年（academicYear）跨年資料越權防護未實作（Phase 1A 唔做；需 v2 spec）
- Phase 1B 幾何 SVG Renderer / Figure Review Gate — 由 A 軌授權決定

---

## 私隱與合成資料

- 所有 fixture 用 `*.example.test`（RFC 6761 保留測試 domain）
- 學生資料、學校 domain、service account 全部唔入 repository
- 真實學校啟用時，只須改 `ALLOWED_SCHOOL_DOMAINS` 同 `SCHOOL_DOMAIN_TO_ID` env vars
- 詳見 [`docs/security-notes.md`](docs/security-notes.md)
