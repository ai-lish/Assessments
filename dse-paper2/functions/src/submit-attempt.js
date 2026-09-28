// dse-paper2/functions/src/submit-attempt.js
// Cloud Function: submitAttempt
// Single Firestore transaction:
//   1. Read & validate session
//   2. Check idempotency document
//   3. Verify release/entitlement still valid
//   4. Score
//   5. Create AttemptRecord
//   6. Create idempotency document
//   7. Transition session to submitted
// Returns FeedbackPackage + AttemptResult (post-submit only).

const crypto = require('crypto');
const { AppError, ERROR_CODES } = require('./errors');
const { requireEmailVerified } = require('./auth-checks');
const { canonicalRational } = require('./rational');
const { areEqual } = require('./rational');
const { requestHash } = require('./hash');
const { loadFeedbackForRelease } = require('./feedback');
const { loadRelease, isRevocationBlockingActive } = require('./releases');

function isOptionId(s) {
  return s === 'A' || s === 'B' || s === 'C' || s === 'D';
}

function isIntStringLike(s) {
  if (typeof s !== 'string') return false;
  if (!/^-?\d+$/.test(s)) return false;
  return true;
}

function pickTrapForSelected({ selectedOptionId, optionToTrap, correctOptionId }) {
  if (selectedOptionId === correctOptionId) return null;
  return optionToTrap[selectedOptionId] || null;
}

function validateIdempotencyKey(k) {
  if (typeof k !== 'string') return false;
  if (k.length < 8 || k.length > 128) return false;
  return /^[A-Za-z0-9_\-:.]+$/.test(k);
}

function validateSubmittedAtClient(s) {
  if (s === undefined || s === null) return { ok: true, value: null };
  if (typeof s !== 'string') return { ok: false };
  const t = Date.parse(s);
  if (Number.isNaN(t)) return { ok: false };
  // Reasonable window: not before 2020, not after 2099
  if (t < Date.parse('2020-01-01T00:00:00Z')) return { ok: false };
  if (t > Date.parse('2099-12-31T23:59:59Z')) return { ok: false };
  return { ok: true, value: s };
}

async function submitAttemptHandler({ admin, context, input, loadFeedbackFn = loadFeedbackForRelease }) {
  const auth = requireEmailVerified(context);
  const {
    sessionId,
    releaseId,
    selectedOptionId,
    idempotencyKey,
    submittedAtClient = null,
  } = input || {};

  if (!isOptionId(selectedOptionId)) {
    throw new AppError(ERROR_CODES.INVALID_OPTION, `Invalid option: ${selectedOptionId}`, 400);
  }
  if (!validateIdempotencyKey(idempotencyKey)) {
    throw new AppError(ERROR_CODES.IDEMPOTENCY_CONFLICT, 'Invalid idempotency key', 400);
  }
  if (typeof sessionId !== 'string' || typeof releaseId !== 'string') {
    throw new AppError(ERROR_CODES.SESSION_CONFLICT, 'Missing sessionId/releaseId', 400);
  }
  const clientAtCheck = validateSubmittedAtClient(submittedAtClient);
  if (!clientAtCheck.ok) {
    throw new AppError(ERROR_CODES.INVALID_OPTION, 'Invalid submittedAtClient', 400);
  }

  const db = admin.firestore();
  const sessRef = db.collection('users').doc(auth.uid)
    .collection('attemptSessions').doc(sessionId);
  const idemRef = db.collection('users').doc(auth.uid)
    .collection('attemptSessions').doc(sessionId)
    .collection('idempotency').doc(idempotencyKey);
  const evalRef = db.collection('users').doc(auth.uid)
    .collection('attemptSessions').doc(sessionId)
    .collection('serverOnly').doc('evaluationSnapshot');
  const attemptRef = db.collection('users').doc(auth.uid)
    .collection('attempts').doc(`atp_${crypto.randomBytes(10).toString('hex')}`);

  // Compute request hash from canonical JSON
  const req = {
    uid: auth.uid,
    sessionId,
    releaseId,
    selectedOptionId,
  };
  const reqHash = requestHash(req);

  let attemptResult = null;
  let feedbackPackage = null;
  let evaluationSnapshot = null;

  await db.runTransaction(async (tx) => {
    const sessSnap = await tx.get(sessRef);
    if (!sessSnap.exists) {
      throw new AppError(ERROR_CODES.SESSION_CONFLICT, 'Session not found', 404);
    }
    const sess = sessSnap.data();
    if (sess.uid !== auth.uid) {
      throw new AppError(ERROR_CODES.SESSION_CONFLICT, 'Session does not belong to user', 403);
    }
    if (sess.state !== 'active') {
      throw new AppError(ERROR_CODES.SESSION_ALREADY_SUBMITTED, `Session state: ${sess.state}`, 409);
    }
    if (Date.parse(sess.expiresAt) <= Date.now()) {
      throw new AppError(ERROR_CODES.SESSION_EXPIRED, 'Session expired', 410);
    }
    if (sess.releaseId !== releaseId) {
      throw new AppError(ERROR_CODES.SESSION_CONFLICT, 'Session bound to a different release', 409);
    }

    // Idempotency: same key, same hash → return existing attempt
    const idemSnap = await tx.get(idemRef);
    if (idemSnap.exists) {
      const idem = idemSnap.data();
      if (idem.requestHash !== reqHash) {
        throw new AppError(ERROR_CODES.IDEMPOTENCY_CONFLICT, 'Idempotency key reused with different payload', 409);
      }
      const atpSnap = await tx.get(db.doc(idem.attemptRef));
      if (!atpSnap.exists) {
        throw new AppError(ERROR_CODES.SESSION_CONFLICT, 'Idempotency record references missing attempt', 500);
      }
      // Reuse: no new attempt, no transition. We still need feedback though.
      evaluationSnapshot = (await tx.get(evalRef)).data();
      feedbackPackage = await loadFeedbackFn(admin, { id: sess.releaseId, data: (await tx.get(db.collection('questionReleases').doc(sess.releaseId))).data() });
      attemptResult = atpSnap.data();
      return;
    }

    // 3. Verify release / entitlement still valid (read-only paths)
    const releaseSnap = await tx.get(db.collection('questionReleases').doc(sess.releaseId));
    if (!releaseSnap.exists) {
      throw new AppError(ERROR_CODES.RELEASE_NOT_ACTIVE, 'Release missing', 404);
    }
    const release = { id: sess.releaseId, data: releaseSnap.data() };
    if (isRevocationBlockingActive(release)) {
      throw new AppError(ERROR_CODES.RELEASE_REVOKED, 'Release revoked (block_active_and_new)', 409);
    }
    if (release.data.publicationStatus === 'revoked' && release.data.revocationPolicy === 'block_new_only') {
      // block_new_only → existing active sessions can still submit. Continue.
    }

    // 4. Score — read evaluationSnapshot
    const evalSnap = await tx.get(evalRef);
    if (!evalSnap.exists) {
      throw new AppError(ERROR_CODES.SESSION_CONFLICT, 'Evaluation snapshot missing', 500);
    }
    evaluationSnapshot = evalSnap.data();
    const { correctOptionId, optionToTrap, correct } = evaluationSnapshot;
    const isCorrect = selectedOptionId === correctOptionId;
    const trapId = isCorrect ? null : pickTrapForSelected({ selectedOptionId, optionToTrap, correctOptionId });

    // diagnosticDurationMs is purely diagnostic; we accept it from client but
    // validate format/length. We do NOT make it authoritative.
    const serverReceivedAt = new Date().toISOString();
    const attemptId = attemptRef.id;
    const attemptRecord = {
      attemptId,
      uid: auth.uid,
      sessionId,
      releaseId: sess.releaseId,
      selectedOptionId,
      submittedAtClient: clientAtCheck.value,
      submittedAtClientInvalid: !clientAtCheck.ok,
      serverReceivedAt,
      diagnosticDurationMs: Number.isInteger(input?.diagnosticDurationMs) && input.diagnosticDurationMs >= 0 && input.diagnosticDurationMs < 6 * 60 * 60 * 1000
        ? input.diagnosticDurationMs
        : null,
      idempotencyKey,
      requestHash: reqHash,
      isCorrect,
      trapId,
      renderSnapshotRef: `users/${auth.uid}/attemptSessions/${sessionId}/renderSnapshot`,
      evaluationSnapshotRef: evalRef.path,
    };

    // 5. Create attempt record
    tx.set(attemptRef, attemptRecord);

    // 6. Create idempotency document
    tx.set(idemRef, {
      requestHash: reqHash,
      attemptRef: attemptRef.path,
      createdAt: serverReceivedAt,
    });

    // 7. Transition session to submitted
    tx.update(sessRef, {
      state: 'submitted',
      submittedAt: serverReceivedAt,
      attemptId,
    });

    attemptResult = attemptRecord;

    // Feedback is loaded OUTSIDE the transaction (Firestore tx should be small).
  });

  if (!feedbackPackage) {
    feedbackPackage = await loadFeedbackFn(admin, { id: releaseId, data: (await db.collection('questionReleases').doc(releaseId).get()).data() });
  }

  return {
    attempt: attemptResult,
    feedback: feedbackPackage,
    evaluation: {
      isCorrect: attemptResult.isCorrect,
      correctOptionId: evaluationSnapshot.correctOptionId,
      trapId: attemptResult.trapId,
    },
  };
}

module.exports = {
  submitAttemptHandler,
  validateIdempotencyKey,
  validateSubmittedAtClient,
  pickTrapForSelected,
  isOptionId,
};
