// dse-paper2/functions/src/membership.js
// Minimal membership / entitlement reads.
// Phase 1A: schoolId and contentSetId are derived from the entitlement that
// satisfies the request; the auth uid's email domain must be in the school's
// allowlist (server-side checked via domain-allowlist.js).
//
// All reads go through the Admin SDK. Client never sees this code path.

const { ERROR_CODES, AppError } = require('./errors');

async function findMembershipForUid(admin, uid, email) {
  // School id is derived from the email domain (e.g. student@school.edu.hk → "school").
  // The actual mapping is loaded from a server-side allowlist. For Phase 1A we
  // accept a single "schoolId" mapping per domain via env SCHOOL_DOMAIN_TO_ID.
  const domainMap = (process.env.SCHOOL_DOMAIN_TO_ID || '').split(',')
    .map((p) => p.split(':').map((s) => s.trim()))
    .filter((p) => p.length === 2);
  const at = email.lastIndexOf('@');
  const domain = at >= 0 ? email.slice(at + 1).toLowerCase() : '';
  const match = domainMap.find(([d]) => d.toLowerCase() === domain);
  if (!match) return null;
  const [, schoolId] = match;
  const ref = admin.firestore()
    .collection('schools').doc(schoolId)
    .collection('members').doc(uid);
  const snap = await ref.get();
  if (!snap.exists) return null;
  return { schoolId, data: snap.data() };
}

function assertActiveMember(membership) {
  if (!membership) {
    throw new AppError(ERROR_CODES.MEMBERSHIP_INACTIVE, 'No active membership', 403);
  }
  const status = membership.data?.status;
  if (status !== 'active') {
    throw new AppError(ERROR_CODES.MEMBERSHIP_INACTIVE, `Membership status: ${status}`, 403);
  }
}

async function findActiveEntitlement(admin, schoolId, contentSetId) {
  const ref = admin.firestore()
    .collection('schools').doc(schoolId)
    .collection('entitlements');
  const snaps = await ref.get();
  const now = Date.now();
  for (const doc of snaps.docs) {
    const data = doc.data();
    if (data.status !== 'active') continue;
    if (!Array.isArray(data.contentSetIds) || !data.contentSetIds.includes(contentSetId)) continue;
    const validFrom = data.validFrom?.toMillis?.() ?? Date.parse(data.validFrom);
    const validUntil = data.validUntil?.toMillis?.() ?? Date.parse(data.validUntil);
    if (Number.isNaN(validFrom) || Number.isNaN(validUntil)) continue;
    if (now < validFrom || now > validUntil) continue;
    return { id: doc.id, data };
  }
  return null;
}

function assertEntitlementValid(entitlement) {
  if (!entitlement) {
    throw new AppError(ERROR_CODES.ENTITLEMENT_EXPIRED, 'No active entitlement for content set', 403);
  }
  const now = Date.now();
  const validFrom = entitlement.data.validFrom?.toMillis?.() ?? Date.parse(entitlement.data.validFrom);
  const validUntil = entitlement.data.validUntil?.toMillis?.() ?? Date.parse(entitlement.data.validUntil);
  if (now < validFrom || now > validUntil) {
    throw new AppError(ERROR_CODES.ENTITLEMENT_EXPIRED, 'Entitlement window does not include now', 403);
  }
  if (entitlement.data.status !== 'active') {
    throw new AppError(ERROR_CODES.ENTITLEMENT_EXPIRED, `Entitlement status: ${entitlement.data.status}`, 403);
  }
}

module.exports = {
  findMembershipForUid,
  assertActiveMember,
  findActiveEntitlement,
  assertEntitlementValid,
};
