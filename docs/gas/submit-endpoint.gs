/**
 * Assessments submission endpoint.
 *
 * Expected POST body:
 *   { rows: [{ grade, studentId, toolId, attemptNumber, attemptType,
 *              score, total, remainingWrongCount, completedAll, date, time }] }
 *
 * Deploy as a Google Apps Script Web App attached to the target spreadsheet.
 */

const SHEET_BY_GRADE = Object.freeze({
  s1: '中一',
  s2: '中二',
  s3: '中三',
});

const FALLBACK_SHEET = '未分類';

const HEADER = Object.freeze([
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
    const rows = Array.isArray(payload.rows) ? payload.rows : [];
    const ss = SpreadsheetApp.getActiveSpreadsheet();
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

    return json_({ ok: true, written });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

function parsePayload_(e) {
  const body = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
  return JSON.parse(body);
}

function normalizeGrade_(value) {
  const grade = String(value || '').trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(SHEET_BY_GRADE, grade) ? grade : '';
}

function getOrCreateSheet_(ss, name) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  ensureHeader_(sheet);
  return sheet;
}

function ensureHeader_(sheet) {
  const range = sheet.getRange(1, 1, 1, HEADER.length);
  const existing = range.getValues()[0];
  const hasHeader = existing.some(value => String(value || '').trim() !== '');
  if (!hasHeader) {
    range.setValues([HEADER]);
    sheet.setFrozenRows(1);
    return;
  }
  const same = HEADER.every((value, index) => String(existing[index] || '') === value);
  if (!same) {
    sheet.insertRowBefore(1);
    sheet.getRange(1, 1, 1, HEADER.length).setValues([HEADER]);
    sheet.setFrozenRows(1);
  }
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
