// dse-paper2/functions/test/revocation.test.cjs
// Emulator test: release revocation policies.
//
// ⚠️  Requires Firebase Emulator. NOT executed in this environment.

const test = require('node:test');
const assert = require('node:assert/strict');
let rt = null;
try { rt = require('@firebase/rules-unit-testing'); } catch (e) {
  test.skip('@firebase/rules-unit-testing not installed; skipped', () => {});
}

const PROJECT_ID = 'demo-dse-paper2';
const { SYNTHETIC_RELEASE } = require('../src/fixtures');
const RELEASE_ID = SYNTHETIC_RELEASE.releaseId;

test('revocation: block_new_only rejects createAttemptSession', async () => {
  if (!rt) return;
  const env = await rt.initializeTestEnvironment({ projectId: PROJECT_ID });
  await rt.loadFirestoreRules({ projectId: PROJECT_ID, rules: '' });
  await env.withSecurityRulesDisabled(async (ctx) => {
    const future = new Date(Date.now() + 1000 * 60 * 60);
    const past = new Date(Date.now() - 1000 * 60 * 60);
    await ctx.firestore().doc('/questionReleases/' + RELEASE_ID).set({
      ...SYNTHETIC_RELEASE,
      effectiveFrom: past,
      effectiveUntil: future,
      publicationStatus: 'revoked',
      revocationPolicy: 'block_new_only',
      revokedAt: new Date(),
    });
  });
  const admin = require('firebase-admin');
  const app = admin.initializeApp({ projectId: PROJECT_ID }, 'rvk-' + Date.now());
  const { loadRelease, assertReleaseUsable } = require('../src/releases');
  const r = await loadRelease(app, RELEASE_ID);
  assert.throws(() => assertReleaseUsable(r), (e) => e.code === 'release-revoked');
  await app.delete();
  await env.cleanup();
});

test('revocation: block_active_and_new marks active session as revoked', async () => {
  // Skeleton — full flow requires session + submit wiring.
  test.skip();
});
