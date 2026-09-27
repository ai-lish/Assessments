// dse-paper2/functions/src/releases.js
// QuestionReleaseManifest loader + invariant checks.
// All loads via Admin SDK. Client never reads /questionReleases.

const { AppError, ERROR_CODES } = require('./errors');

async function loadRelease(admin, releaseId) {
  const ref = admin.firestore().collection('questionReleases').doc(releaseId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new AppError(ERROR_CODES.RELEASE_NOT_ACTIVE, `Release not found: ${releaseId}`, 404);
  }
  return { id: releaseId, data: snap.data() };
}

function assertReleaseUsable(release) {
  const d = release.data;
  if (d.publicationStatus === 'revoked') {
    if (d.revocationPolicy === 'block_active_and_new') {
      throw new AppError(ERROR_CODES.RELEASE_REVOKED, 'Release revoked (block_active_and_new)', 409);
    }
    if (d.revocationPolicy === 'block_new_only') {
      throw new AppError(ERROR_CODES.RELEASE_REVOKED, 'Release revoked (block_new_only)', 409);
    }
    throw new AppError(ERROR_CODES.RELEASE_REVOKED, 'Release revoked', 409);
  }
  if (d.publicationStatus !== 'released' && d.publicationStatus !== 'staged') {
    throw new AppError(ERROR_CODES.RELEASE_NOT_ACTIVE, `Status: ${d.publicationStatus}`, 409);
  }
  const now = Date.now();
  const from = d.effectiveFrom?.toMillis?.() ?? Date.parse(d.effectiveFrom);
  const until = d.effectiveUntil?.toMillis?.() ?? Date.parse(d.effectiveUntil);
  if (Number.isNaN(from) || Number.isNaN(until)) {
    throw new AppError(ERROR_CODES.RELEASE_NOT_ACTIVE, 'Release has invalid effective window', 409);
  }
  if (now < from) {
    throw new AppError(ERROR_CODES.RELEASE_NOT_ACTIVE, 'Release not yet effective', 409);
  }
  if (now > until) {
    throw new AppError(ERROR_CODES.RELEASE_NOT_ACTIVE, 'Release expired', 409);
  }
}

function isRevocationBlockingActive(release) {
  return (
    release.data.publicationStatus === 'revoked' &&
    release.data.revocationPolicy === 'block_active_and_new'
  );
}

module.exports = { loadRelease, assertReleaseUsable, isRevocationBlockingActive };
