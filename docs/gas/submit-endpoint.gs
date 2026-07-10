/**
 * Assessments + ai-learning submission endpoint.
 *
 * This Web App keeps one deployed URL while accepting two contracts:
 *
 * 1. Legacy ai-learning payload: { rows: [...] } without row.grade.
 *    Each row is a per-question record and is appended to the spreadsheet's
 *    active sheet using the original nine-column layout.
 *
 * 2. Assessments attempt payload: either { rows: [...] } where every row
 *    has grade, or one top-level attempt object with grade + attemptType.
 *    These summaries are routed to grade-specific sheets.
 */

const SHEET_BY_GRADE = Object.freeze({
  s1: '中一',
  s2: '中二',
  s3: '中三',
});

const FALLBACK_SHEET = '未分類';

const LEGACY_HEADER = Object.freeze([
  '日期',
  '時間',
  '學生編號',
  '總分',
  '題號',
  '題目摘要',
  '作答',
  '我的答案',
  '正確答案',
]);

const ATTEMPT_HEADER = Object.freeze([
  'grade',
  'studentId',
  'toolId',
  'attemptNumber',
  'attemptType',
  'score',
  'total',
  'remainingWrongCount',
  'completedAll',
  'date',
  'time',
]);

function doPost(e) {
  try {
    const payload = parsePayload_(e);
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (isAttemptPayload_(payload)) {
      const attempts = extractAttemptRows_(payload);
      const written = appendAttemptRows_(ss, attempts);
      return json_({ ok: true, contract: 'attemptLog', written });
    }

    if (Array.isArray(payload.rows)) {
      // Keep the historical ai-learning route unchanged: the active sheet,
      // legacy header, and one row per question are all preserved.
      const written = appendLegacyRows_(ss.getActiveSheet(), payload.rows);
      return json_({ ok: true, contract: 'legacyRows', written });
    }

    throw new Error('Unsupported payload: expected legacy rows or attemptLog fields.');
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

function parsePayload_(e) {
  const body = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
  return JSON.parse(body);
}

function isAttemptPayload_(payload) {
  if (payload && payload.grade && payload.attemptType) return true;
  return Array.isArray(payload && payload.rows) && payload.rows.length > 0 &&
    payload.rows.every(row => row && row.grade && row.attemptType);
}

function extractAttemptRows_(payload) {
  return Array.isArray(payload.rows) ? payload.rows : [payload];
}

function appendLegacyRows_(sheet, rows) {
  ensureHeader_(sheet, LEGACY_HEADER);
  rows.forEach(row => {
    sheet.appendRow([
      row.date,
      row.time,
      row.studentId,
      row.totalScore,
      row.questionId,
      row.questionText,
      row.correct,
      row.myAnswer,
      row.correctAnswer,
    ]);
  });
  return rows.length;
}

function appendAttemptRows_(ss, rows) {
  let written = 0;
  rows.forEach(row => {
    const grade = normalizeGrade_(row.grade);
    const sheetName = SHEET_BY_GRADE[grade] || FALLBACK_SHEET;
    const sheet = getOrCreateSheet_(ss, sheetName);
    sheet.appendRow([
      grade || 'unknown',
      String(row.studentId || ''),
      String(row.toolId || ''),
      row.attemptNumber,
      String(row.attemptType || ''),
      row.score,
      row.total,
      row.remainingWrongCount,
      row.completedAll,
      String(row.date || ''),
      String(row.time || ''),
    ]);
    written += 1;
  });
  return written;
}

function normalizeGrade_(value) {
  const grade = String(value || '').trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(SHEET_BY_GRADE, grade) ? grade : '';
}

function getOrCreateSheet_(ss, name) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  ensureHeader_(sheet, ATTEMPT_HEADER);
  return sheet;
}

function ensureHeader_(sheet, header) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(header);
    sheet.setFrozenRows(1);
  }
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
