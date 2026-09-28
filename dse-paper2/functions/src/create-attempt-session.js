// dse-paper2/functions/src/create-attempt-session.js
// Cloud Function: createAttemptSession
// Validates the entire auth/membership/entitlement/release chain, generates a
// variant in the backend, persists an AttemptSession and server-only
// VariantEvaluationSnapshot, and returns the public VariantRenderSnapshot.

const crypto = require('crypto');
const { requireEmailVerified } = require('./auth-checks');
const { assertAllowedDomain } = require('./domain-allowlist');
const { findMembershipForUid, assertActiveMember, findActiveEntitlement, assertEntitlementValid } = require('./membership');
const { loadRelease, assertReleaseUsable, isRevocationBlockingActive } = require('./releases');
const { generate } = require('./generator-indices');
const { AppError, ERROR_CODES } = require('./errors');

function buildPublicRenderSnapshot({ releaseId, variant, rendererVersion, contentVersion }) {
  // Public VariantRenderSnapshot MUST NOT include:
  //   - correctOptionId
  //   - exact answer
  //   - evaluation expression
  //   - trap mapping
  //   - any target field that directly reveals the answer
  return {
    schemaVersion: '1.0.0',
    releaseId,
    variantId: variant.variantId,
    generatorId: variant.generatorId,
    generatorVersion: variant.generatorVersion,
    rendererVersion,
    contentVersion,
    parameters: { a: variant.parameters.a, m: variant.parameters.m, n: variant.parameters.n, k: variant.parameters.k },
    // Options shown in their public order (A,B,C,D); values are the rendered
    // rationals, but the correct one is NOT marked in any way.
    options: variant.publicOptions,
    promptHtml: variant.promptHtml,
    createdAt: new Date().toISOString(),
  };
}

function buildEvaluationSnapshot({ releaseId, variant, evaluatorVersion, answerKeyRef }) {
  return {
    schemaVersion: '1.0.0',
    releaseId,
    variantId: variant.variantId,
    evaluatorVersion,
    answerKeyRef,
    correctOptionId: variant.correctOptionId,
    exactGeneratedAnswer: variant.correct,
    optionToTrapMapping: variant.optionToTrap,
    canonicalValues: {
      correct: variant.correct,
      distractors: variant.distractors,
    },
    generatorVersion: variant.generatorVersion,
    seed: variant.seed,
    createdAt: new Date().toISOString(),
  };
}

// Create the function handler — accepts a pre-built admin/logger so it can
// be unit-tested by passing a fake admin stub.
async function createAttemptSessionHandler({ admin, context, input, now = () => new Date() }) {
  const auth = requireEmailVerified(context);
  const email = auth.token.email;
  assertAllowedDomain(email);
  const releaseId = input?.releaseId;
  if (!releaseId || typeof releaseId !== 'string') {
    throw new AppError(ERROR_CODES.RELEASE_NOT_ACTIVE, 'releaseId required', 400);
  }

  const membership = await findMembershipForUid(admin, auth.uid, email);
  assertActiveMember(membership);
  const release = await loadRelease(admin, releaseId);
  assertReleaseUsable(release);
  const contentSetId = release.data.contentSetId;
  const entitlement = await findActiveEntitlement(admin, membership.schoolId, contentSetId);
  assertEntitlementValid(entitlement);

  // Check existing active session for (uid, releaseId)
  const sessCol = admin.firestore()
    .collection('users').doc(auth.uid)
    .collection('attemptSessions');
  const existing = await sessCol.where('releaseId', '==', releaseId).where('state', '==', 'active').get();
  if (!existing.empty) {
    const doc = existing.docs[0];
    const data = doc.data();
    return {
      resumed: true,
      sessionId: doc.id,
      state: data.state,
      expiresAt: data.expiresAt,
      // Re-issue renderSnapshot from the existing session
      renderSnapshot: data.renderSnapshot,
    };
  }

  // Generate variant on the server
  const seed = crypto.randomBytes(16).toString('hex');
  const variant = generate({ seed });
  variant.variantId = `var_${crypto.randomBytes(8).toString('hex')}`;

  // Public options = order of display, no answer markings
  variant.publicOptions = [
    { id: 'A', value: variant.distractors?.[Object.keys(variant.distractors)[0]] || variant.correct /* shouldn't happen */ },
  ];
  // Build public options from the shuffle order: variant.optionToTrap tells us
  // which trap-or-correct maps to which optionId, and we need to map back to a
  // displayable rational.
  const trapToValue = { correct: variant.correct };
  for (const [tid, tval] of Object.entries(variant.distractors)) {
    trapToValue[tid] = tval;
  }
  variant.publicOptions = ['A', 'B', 'C', 'D'].map((id) => ({
    id,
    value: trapToValue[variant.optionToTrap[id]],
  }));

  const rendererVersion = release.data.rendererVersion;
  const contentVersion = release.data.contentVersion;
  const renderSnapshot = buildPublicRenderSnapshot({
    releaseId, variant, rendererVersion, contentVersion,
  });
  const evaluationSnapshot = buildEvaluationSnapshot({
    releaseId, variant,
    evaluatorVersion: release.data.answerKeyRef ? '1.0.0' : '1.0.0',
    answerKeyRef: release.data.answerKeyRef,
  });
  const sessionId = `sess_${crypto.randomBytes(10).toString('hex')}`;
  const expiresAt = new Date(now().getTime() + 30 * 60 * 1000).toISOString();
  const session = {
    sessionId,
    uid: auth.uid,
    releaseId,
    contentSetId,
    state: 'active',
    createdAt: now().toISOString(),
    expiresAt,
    renderSnapshot,
    evaluationSnapshotRef: `users/${auth.uid}/attemptSessions/${sessionId}/evaluationSnapshot`,
    idempotencyKey: null,
    attemptId: null,
  };

  // Persist session, renderSnapshot and evaluationSnapshot.
  // RenderSnapshot lives as a sub-document; evaluationSnapshot is server-only.
  const db = admin.firestore();
  await db.runTransaction(async (tx) => {
    const sessRef = db.collection('users').doc(auth.uid).collection('attemptSessions').doc(sessionId);
    const evalRef = db.collection('users').doc(auth.uid)
      .collection('attemptSessions').doc(sessionId)
      .collection('serverOnly').doc('evaluationSnapshot');
    tx.set(sessRef, session);
    tx.set(evalRef, evaluationSnapshot);
  });

  return {
    resumed: false,
    sessionId,
    state: 'active',
    expiresAt,
    renderSnapshot,
  };
}

module.exports = {
  createAttemptSessionHandler,
  buildPublicRenderSnapshot,
  buildEvaluationSnapshot,
};
