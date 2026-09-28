# Phase 1A 已知限制

本切片只覆蓋規劃嘅最小子集。下列項目明確未實作 / 有限制。

---

## 故意未做嘅嘢

| 項目 | 原因 | 預計實作階段 |
|---|---|---|
| 學年（academicYear）跨年越權防護 | Phase 1A spec 唔做 | Phase 2 |
| 正式班別（classes） | Phase 1A spec 唔做 | Phase 2 |
| Teacher dashboard / 跨班分析 | Phase 1A spec 唔做 | Phase 2 |
| Roll-over / 升級路徑 | Phase 1A spec 唔做 | Phase 2 |
| 學校轉校 | Phase 1A spec 唔做 | Phase 2 |
| 學生 telemetry（詳解展開追蹤） | v2.1 私隱決策 | Phase 2 後再議 |
| 幾何 SVG Renderer | 屬 Phase 1B | Phase 1B（須 A 軌授權） |
| MathStepRenderer | 屬 Phase 1B | Phase 1B |
| Surd / PiMultiple / CAS Rational | Phase 1A 唔做 | Phase 2+ |
| 教師講解投影視圖（DEC_04） | Open Decision | 待 Phase 1 usability test |

---

## 技術限制

### Emulator tests 未執行於本環境

本機缺 Java JRE（sudo 不可用，無法安裝）。Emulator tests 嘅 source code 已齊：
- `test/security-rules.test.cjs`
- `test/attempt-session.test.cjs`
- `test/membership.test.cjs`
- `test/revocation.test.cjs`

但**未實際執行**。CI runner 必須配 JRE 11+。

### 完整 end-to-end submit + replay test 只係 skeleton

`test/attempt-session.test.cjs` 內最後一個 test case（duplicate idempotency replay）係 `test.skip()` 佔位。完整實作需要：

1. `submitAttempt` emulator 環境下完整跑一次
2. 同一 idempotency key ＋ 同一 payload 重 submit
3. 確認 AttemptRecord 數量仍係 1
4. 確認 FeedbackPackage 仍可取

需要喺 Java-enabled 環境補。

### `npm install` 未喺本機跑

`functions/package.json` 列明 `firebase-admin` / `firebase-functions` / `@firebase/rules-unit-testing`，但**本機冇裝**（避免巨大 install）。於真機／CI 上 `cd functions && npm install` 後可 deploy。

### Real Google OAuth 未實測

Frontend 用 `httpsCallable` 連 emulator endpoint。Production 部署前必須：

1. 設定 `USE_EMULATOR = false`
2. Firebase console 啟用 Google provider
3. 加入 `ai-lish.github.io` 到 Authorized domains
4. 真實 OAuth flow 必須由人手 / 真 browser 驗證

### Firestore indexes 暫只一個

`firestore.indexes.json` 只為 attemptSessions 嘅 `(releaseId, state)` query 加咗 index。其他 query（如 entitlements 嘅 contentSetIds `array-contains`）未驗證。

### 學生作答計時只係診斷用

`diagnosticDurationMs` 同 `submittedAtClient` 唔可以做權限、排序或正式計時。`submittedAtClient` 只可作診斷，可被忽略或標示 invalid。

---

## 安全／私隱待審批

- ⚠️ PDPO Retention Matrix v2.1 仍係 **Proposed**，需學校委員會審批
- ⚠️ Consent flow（v2.1 提及）仍未實作

---

## GitHub Pages base path 兼容性

入口 `index.html` 用相對路徑（`./css/...`, `./js/...`）。喺 `https://ai-lish.github.io/Assessments/dse-paper2/` 部署後，靜態資產會自動 resolve 正確。唔需要 base URL hack。
