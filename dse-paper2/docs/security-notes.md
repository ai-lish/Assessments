# Phase 1A 私隱與安全備註

---

## 1. 公開 web config 唔係 secret

Firebase 設計上，`apiKey` / `authDomain` / `projectId` / `appId` 全部都係**公開**嘅識別碼（喺 client browser 一定見到）。真實安全由：

1. Firebase Auth (Identity Toolkit)
2. Firestore Security Rules
3. Cloud Functions + Admin SDK 嘅後端驗證

呢三層執行。Web config 洩漏**唔會**令攻擊者可以讀 protectedAnswerKeys 或寫 attempts（全部由 Rules 阻擋）。

來源：[Firebase: API key 用途](https://firebase.google.com/docs/projects/api-keys)

---

## 2. 真正嘅 secrets 處理

| 類別 | 處理 |
|---|---|
| Cloud Functions service account | 由 GCP IAM 管理；從不入 repo |
| Admin SDK 私鑰 | 同上 |
| Real OAuth client secret | Firebase Auth 內部管理；client 唔需要 |
| 學校 allowlist | env var `ALLOWED_SCHOOL_DOMAINS`；不入 repo |
| School domain → schoolId mapping | env var `SCHOOL_DOMAIN_TO_ID`；不入 repo |
| `.env` (developer local) | `.gitignore` 排除 |
| `.env.example` | 入 repo，但**只係 template**，冇真實值 |

---

## 3. `.gitignore` 覆蓋

- `.env*`（保留 `.env.example`）
- service-account*.json
- emulator-data/
- exported-data/
- *.log
- coverage/
- node_modules/

---

## 4. 合成 fixtures 範圍

Phase 1A 所有 fixture 用 `*.example.test`（RFC 6761 保留 domain）。**冇**真實學校 domain、學生名冊或 service account 入到 repo。

---

## 5. Firestore Security Rules 防線

| 路徑 | Client 訪問 |
|---|---|
| `/protectedAnswerKeys/*` | ❌ 永遠 deny |
| `/protectedQuestions/*/packages/*` | ❌ 永遠 deny |
| `/users/*/attemptSessions/*/serverOnly/*` | ❌ 永遠 deny |
| `/users/*/attemptSessions/*` | ✅ read 限本人；write ❌ |
| `/users/*/attempts/*` | ✅ read 限本人；write ❌ |
| `/users/*/attemptSessions/*/idempotency/*` | ✅ read 限本人；write ❌ |
| `/questionReleases/{id}` | ✅ read 限 signed-in + active release |
| `/schools/{id}/entitlements/*` | ❌ 永遠 deny |
| `/schools/{id}/members/{uid}` | ✅ read 限本人 |
| 其他 | ❌ catch-all deny |

⚠️ **以上係 client-only 訪問控制**。後端 Cloud Functions 用 Admin SDK 繞過 Rules 做評分、寫 attempts、建立 sessions。Client 永遠唔可以繞過。

---

## 6. 學生作答計時唔可信

`submittedAtClient` 同 `diagnosticDurationMs` 純粹係學習診斷用：

- `submittedAtClient` 可能 missing / invalid；唔可以作權限、排序或正式計時
- `diagnosticDurationMs` 只可作 `>= 0` 同 `< 6 小時` 嘅 defensive validation
- Phase 1A 唔宣稱為不可篡改正式考試計時

---

## 7. Idempotency 抗重放

`requestHash` 輸入固定為以下 4 欄 canonical JSON（key 順序鎖死）：

```json
{
  "uid": "<authenticated uid>",
  "sessionId": "<session id>",
  "releaseId": "<release id>",
  "selectedOptionId": "<A|B|C|D>"
}
```

- 不可加 / 刪任何隱式欄位
- UTF-8 編碼
- SHA-256 hex

同一 `idempotencyKey` ＋ 同一 hash → 返回原 attempt
同一 `idempotencyKey` ＋ 不同 hash → `idempotency-conflict`
唔會寫第二筆 AttemptRecord。

---

## 8. 完整 Submit Transaction

`submitAttempt` 嘅所有寫入喺單一 Firestore transaction 內：

1. 讀取 + 驗證 Session
2. 檢查 Idempotency doc
3. 驗證 release / entitlement
4. 評分
5. 建立 AttemptRecord
6. 建立 Idempotency doc
7. 將 Session 過渡到 submitted

FeedbackPackage 喺 transaction 之外讀取（保持 transaction 細小）。

---

## 9. 私隱矩陣（Proposed, 待委員會審批）

| 資料 | 保留期 | 銷毀 |
|---|---|---|
| 作答詳細軌跡 | 學生離校或畢業後當年 8 月 31 日 | Hard delete |
| 班級統計 | 永久（去識別化，N≥5） | 不可逆匿名化 |
| 系統審計日誌 | 180 天 | 滾動覆蓋 |

詳見 planning v2.1 §10。

---

## 10. 報告 vulnerability

如有 security 問題，請開 private issue 或聯絡維護者，**唔好**喺 public thread 公開討論。
