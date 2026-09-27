// dse-paper2/functions/index.js
// Cloud Functions entry. v2 onCall.
//
// Exports:
//   - createAttemptSession (callable)
//   - submitAttempt        (callable)
//
// Env vars (set via `firebase functions:secrets:set` or .env in dev):
//   ALLOWED_SCHOOL_DOMAINS=phase1a.example.test
//   SCHOOL_DOMAIN_TO_ID=phase1a.example.test:phase1a-school
//   GCP_PROJECT=...

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp, getApps } = require('firebase-admin/app');

if (!getApps().length) {
  initializeApp();
}
const admin = require('firebase-admin');

const { createAttemptSessionHandler } = require('./src/create-attempt-session');
const { submitAttemptHandler } = require('./src/submit-attempt');
const { AppError, ERROR_CODES } = require('./src/errors');

function rethrow(err) {
  if (err instanceof AppError) {
    throw new HttpsError(err.code, err.message);
  }
  // Unknown error: surface as generator-failed rather than leaking details.
  console.error('Unexpected error', err);
  throw new HttpsError(ERROR_CODES.GENERATOR_FAILED, 'Internal error');
}

exports.createAttemptSession = onCall({ region: 'asia-east2' }, async (req) => {
  try {
    const result = await createAttemptSessionHandler({
      admin,
      context: req,
      input: req.data || {},
    });
    return result;
  } catch (e) {
    rethrow(e);
  }
});

exports.submitAttempt = onCall({ region: 'asia-east2' }, async (req) => {
  try {
    const result = await submitAttemptHandler({
      admin,
      context: req,
      input: req.data || {},
    });
    return result;
  } catch (e) {
    rethrow(e);
  }
});
