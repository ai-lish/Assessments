# Firebase Emulator 設定

本文件指導運行 Firebase Emulator suite 以全鏈路測試 Phase 1A。

---

## 為何要用 Emulator

- ✅ 全本地測試 — 唔使 production Firebase 項目
- ✅ 任何 email 都接受（可設定 allowlist）
- ✅ 預載 fixtures
- ✅ Auth emulator 提供 passwordless sign-in (for test users)
- ✅ 唔計費
- ✅ 完整 Security Rules enforcement

---

## 啟動

```bash
cd dse-paper2/functions
npm run serve
```

預期輸出：

```
✔  All emulators ready! View status and logs at http://127.0.0.1:4000
```

---

## 預設 Port

| 服務 | Port | UI |
|---|---|---|
| Auth | 9099 | http://127.0.0.1:4000/auth |
| Functions | 5001 | http://127.0.0.1:5001 |
| Firestore | 8080 | http://127.0.0.1:4000/firestore |
| UI | 4000 | http://127.0.0.1:4000 |
| Hosting | 5002 | http://127.0.0.1:5002 |

---

## 載入合成 fixtures

```bash
node fixtures/seed-emulator.mjs
```

完成後可到 Emulator UI 確認。

---

## 測試帳號

Auth Emulator 啟動後建立：

| Email | UID | 用途 |
|---|---|---|
| `student@phase1a.example.test` | `uid-verified-student` | 完整 happy path |
| `unverified@phase1a.example.test` | `uid-unverified-student` | 測試 email-not-verified 拒絕 |
| `student@external.example.org` | `uid-wrong-domain` | 測試 domain-not-allowed 拒絕 |
| `inactive@phase1a.example.test` | `uid-inactive` | 測試 membership-inactive 拒絕 |
| `expired@phase1a.example.test` | `uid-expired` | 測試 entitlement-expired 拒絕 |

---

## 真實 Google OAuth 點用

`dse-paper2/js/config.js` 預設 `USE_EMULATOR = true`。Production 部署時：

1. 設定 `USE_EMULATOR = false`
2. 喺 Firebase console → Authentication → Sign-in method → 啟用 Google provider
3. 喺 Authorized domains 加入 `ai-lish.github.io`（GitHub Pages domain）

---

## 常見問題

### Q: 點解 emulator 啟動失敗講 "Java not found"？

需要安裝 JRE 11+。macOS：`brew install --cask temurin@21`。

### Q: `firebase` command not found？

```bash
npm install -g firebase-tools
```

### Q: 點解 unit tests pass 但 emulator tests 失敗？

Emulator tests 用 `@firebase/rules-unit-testing`，需要先 `cd functions && npm install`。

### Q: 學生可唔可以唔登入就用？

**唔可以。** 整個 `dse-paper2` 流程必須登入。Existing `hkdse/` 嘅免登入工具唔受影響。
