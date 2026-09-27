// dse-paper2/functions/test/membership.test.cjs
// Emulator test: membership + entitlement gating.
//
// ⚠️  Requires Firebase Emulator. NOT executed in this environment.

const test = require('node:test');
const assert = require('node:assert/strict');
let rt = null;
try {
  rt = require('@firebase/rules-unit-testing');
} catch (e) {
  test.skip('@firebase/rules-unit-testing not installed; skipped', () => {});
}

const PROJECT_ID = 'demo-dse-paper2';
const { SYNTHETIC_SCHOOL, SYNTHETIC_USERS, syntheticMember, syntheticEntitlement } = require('../src/fixtures');

test('membership: inactive member rejected', async () => {
  if (!rt) return;
  const env = await rt.initializeTestEnvironment({ projectId: PROJECT_ID });
  await rt.loadFirestoreRules({ projectId: PROJECT_ID, rules: '' });
  await env.withSecurityRulesDisabled(async (ctx) => {
    await ctx.firestore().doc('/schools/' + SYNTHETIC_SCHOOL.schoolId).set(SYNTHETIC_SCHOOL);
    await ctx.firestore().doc('/schools/' + SYNTHETIC_SCHOOL.schoolId + '/members/' + SYNTHETIC_USERS.inactive.uid).set({
      ...syntheticMember(SYNTHETIC_USERS.inactive.uid, SYNTHETIC_USERS.inactive.email),
      status: 'inactive',
    });
  });
  const admin = require('firebase-admin');
  const app = admin.initializeApp({ projectId: PROJECT_ID }, 'mem-' + Date.now());
  const { findMembershipForUid, assertActiveMember } = require('../src/membership');
  const m = await findMembershipForUid(app, SYNTHETIC_USERS.inactive.uid, SYNTHETIC_USERS.inactive.email);
  assert.ok(m);
  assert.throws(() => assertActiveMember(m), (e) => e.code === 'membership-inactive');
  await app.delete();
  await env.cleanup();
});

test('membership: expired entitlement rejected', async () => {
  if (!rt) return;
  const env = await rt.initializeTestEnvironment({ projectId: PROJECT_ID });
  await rt.loadFirestoreRules({ projectId: PROJECT_ID, rules: '' });
  await env.withSecurityRulesDisabled(async (ctx) => {
    await ctx.firestore().doc('/schools/' + SYNTHETIC_SCHOOL.schoolId).set(SYNTHETIC_SCHOOL);
    await ctx.firestore().doc('/schools/' + SYNTHETIC_SCHOOL.schoolId + '/entitlements/ent-expired').set(
      syntheticEntitlement('ent-expired', 'dse-paper2-phase1a-indices-v1',
        new Date('2024-01-01T00:00:00Z'),
        new Date('2024-12-31T00:00:00Z'),
      ),
    );
  });
  const admin = require('firebase-admin');
  const app = admin.initializeApp({ projectId: PROJECT_ID }, 'mem-' + Date.now());
  const { findActiveEntitlement, assertEntitlementValid } = require('../src/membership');
  const e = await findActiveEntitlement(app, SYNTHETIC_SCHOOL.schoolId, 'dse-paper2-phase1a-indices-v1');
  assert.equal(e, null);
  assert.throws(() => assertEntitlementValid(e), (err) => err.code === 'entitlement-expired');
  await app.delete();
  await env.cleanup();
});
