// dse-paper2/functions/src/feedback.js
// Loads FeedbackPackage from /protectedQuestions/{questionId}/packages/feedback
// and verifies the schema version matches what the release expects.

const { AppError, ERROR_CODES } = require('./errors');

async function loadFeedbackForRelease(admin, release) {
  const feedbackRef = release.data.feedbackRef;
  if (!feedbackRef) {
    throw new AppError(ERROR_CODES.GENERATOR_FAILED, 'Release missing feedbackRef', 500);
  }
  // feedbackRef expected form: "protectedQuestions/{qid}/packages/feedback"
  const parts = feedbackRef.split('/');
  if (parts.length !== 3 || parts[0] !== 'protectedQuestions' || parts[2] !== 'feedback') {
    throw new AppError(ERROR_CODES.GENERATOR_FAILED, `Malformed feedbackRef: ${feedbackRef}`, 500);
  }
  const snap = await admin.firestore().doc(feedbackRef).get();
  if (!snap.exists) {
    throw new AppError(ERROR_CODES.GENERATOR_FAILED, `Feedback not found: ${feedbackRef}`, 500);
  }
  const fb = snap.data();
  if (fb.feedbackSchemaVersion !== release.data.feedbackSchemaVersion) {
    throw new AppError(ERROR_CODES.GENERATOR_FAILED, 'Feedback schema version mismatch', 500);
  }
  if (fb.approved !== true) {
    throw new AppError(ERROR_CODES.GENERATOR_FAILED, 'Feedback not approved', 500);
  }
  return fb;
}

module.exports = { loadFeedbackForRelease };
