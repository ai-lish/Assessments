// dse-paper2/js/errors.js
// Map machine-readable error codes to Traditional Chinese messages.
// NEVER parse free-form text from server; always rely on code.

const CODE_TO_ZH = {
  'unauthenticated': '請先登入。',
  'email-not-verified': '請先完成 email 驗證。',
  'domain-not-allowed': '此 email 嘅 domain 唔喺學校 allowlist 內。',
  'membership-inactive': '此帳戶嘅學校成員身份已停用。',
  'entitlement-expired': '授權已過期或未生效。',
  'release-not-active': '題目包尚未發佈或已過期。',
  'release-revoked': '題目包已被撤銷，無法繼續作答。',
  'session-expired': '作答階段已過期，請重新開始。',
  'session-already-submitted': '此作答階段已提交，唔可以再提交。',
  'session-conflict': '作答階段狀態異常，請重新整理。',
  'idempotency-conflict': '偵測到重複提交，但請求內容唔一致，請重新開始。',
  'client-version-unsupported': '請更新瀏覽器或重新整理頁面。',
  'invalid-option': '選項無效。',
  'generator-failed': '題目生成失敗，請重試或通知老師。',
  'network-error': '網絡錯誤，請重試。',
};

export function codeToMessage(code) {
  if (typeof code === 'string' && code in CODE_TO_ZH) return CODE_TO_ZH[code];
  return '操作失敗，請重試。';
}

export function isKnownCode(code) {
  return typeof code === 'string' && code in CODE_TO_ZH;
}
