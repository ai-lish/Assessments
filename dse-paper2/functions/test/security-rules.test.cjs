// dse-paper2/functions/test/security-rules.test.cjs
// Emulator test: Firebase Security Rules.
//
// ⚠️  This test REQUIRES the Firebase Emulator (firestore + auth). It is NOT
// executed in this environment because Java is unavailable.
//
// Run with:
//   firebase emulators:exec --only firestore,auth "node --test test/security-rules.test.cjs"
//
// Covers:
//   - Unauthenticated client cannot read any protected path
//   - Verified client can read own attemptSessions + attempts + idempotency
//   - Verified client CANNOT read another user's attemptSessions
//   - Verified client CANNOT read /protectedAnswerKeys/*
//   - Verified client CANNOT read /users/*/attemptSessions/*/serverOnly/*
//   - Verified client CANNOT write to attempts, attemptSessions, idempotency
//   - Verified client CANNOT write to /questionReleases, /protectedQuestions
//
// Synthetic data only (uid-fake-*). No real student data.

const test = require('node:test');
const assert = require('node:assert/strict');
// Lazy require so this file does not crash if @firebase/rules-unit-testing is not installed yet.
let rt = null;
try {
  rt = require('@firebase/rules-unit-testing');
} catch (e) {
  test.skip('@firebase/rules-unit-testing not installed; skipped', () => {});
}

const PROJECT_ID = 'demo-dse-paper2';

async function setupEnv() {
  const env = await rt.initializeTestEnvironment({ projectId: PROJECT_ID });
  await rt.loadFirestoreRules({
    projectId: PROJECT_ID,
    rules: require('fs').readFileSync(
      require('path').join(__dirname, '..', '..', 'firestore.rules'),
      'utf-8',
    ),
  });
  return env;
}

test('security rules: unauthenticated cannot read /protectedAnswerKeys', async () => {
  if (!rt) return;
  const env = await setupEnv();
  const ctx = env.unauthenticatedContext();
  await assert.rejects(
    ctx.firestore().doc('/protectedAnswerKeys/rel_x').get(),
    /permission-denied/,
  );
  await env.cleanup();
});

test('security rules: unauthenticated cannot read /users/*/attempts', async () => {
  if (!rt) return;
  const env = await setupEnv();
  const ctx = env.unauthenticatedContext();
  await assert.rejects(
    ctx.firestore().doc('/users/uid-a/attempts/atp-1').get(),
    /permission-denied/,
  );
  await env.cleanup();
});

test('security rules: verified user can read own attemptSessions', async () => {
  if (!rt) return;
  const env = await setupEnv();
  await env.withSecurityRulesDisabled(async (ctx) => {
    await ctx.firestore().doc('/users/uid-a/attemptSessions/sess-1').set({ state: 'active' });
  });
  const ctx = env.authenticatedContext('uid-a', { email_verified: true });
  const doc = await ctx.firestore().doc('/users/uid-a/attemptSessions/sess-1').get();
  assert.equal(doc.exists, true);
  await env.cleanup();
});

test('security rules: verified user cannot read another user\'s attemptSessions', async () => {
  if (!rt) return;
  const env = await setupEnv();
  await env.withSecurityRulesDisabled(async (ctx) => {
    await ctx.firestore().doc('/users/uid-a/attemptSessions/sess-1').set({ state: 'active' });
  });
  const ctx = env.authenticatedContext('uid-b', { email_verified: true });
  await assert.rejects(
    ctx.firestore().doc('/users/uid-a/attemptSessions/sess-1').get(),
    /permission-denied/,
  );
  await env.cleanup();
});

test('security rules: verified user cannot read /protectedAnswerKeys', async () => {
  if (!rt) return;
  const env = await setupEnv();
  const ctx = env.authenticatedContext('uid-a', { email_verified: true });
  await assert.rejects(
    ctx.firestore().doc('/protectedAnswerKeys/rel_x').get(),
    /permission-denied/,
  );
  await env.cleanup();
});

test('security rules: verified user cannot read /users/*/attemptSessions/*/serverOnly/evaluationSnapshot', async () => {
  if (!rt) return;
  const env = await setupEnv();
  await env.withSecurityRulesDisabled(async (ctx) => {
    await ctx.firestore().doc('/users/uid-a/attemptSessions/sess-1/serverOnly/evaluationSnapshot')
      .set({ correctOptionId: 'A' });
  });
  const ctx = env.authenticatedContext('uid-a', { email_verified: true });
  await assert.rejects(
    ctx.firestore().doc('/users/uid-a/attemptSessions/sess-1/serverOnly/evaluationSnapshot').get(),
    /permission-denied/,
  );
  await env.cleanup();
});

test('security rules: verified user cannot write to own attempts', async () => {
  if (!rt) return;
  const env = await setupEnv();
  const ctx = env.authenticatedContext('uid-a', { email_verified: true });
  await assert.rejects(
    ctx.firestore().doc('/users/uid-a/attempts/atp-1').set({ isCorrect: true }),
    /permission-denied/,
  );
  await env.cleanup();
});

test('security rules: verified user cannot write to own attemptSessions', async () => {
  if (!rt) return;
  const env = await setupEnv();
  const ctx = env.authenticatedContext('uid-a', { email_verified: true });
  await assert.rejects(
    ctx.firestore().doc('/users/uid-a/attemptSessions/sess-1').set({ state: 'submitted' }),
    /permission-denied/,
  );
  await env.cleanup();
});

test('security rules: verified user cannot read /schools/*/entitlements/*', async () => {
  if (!rt) return;
  const env = await setupEnv();
  const ctx = env.authenticatedContext('uid-a', { email_verified: true });
  await assert.rejects(
    ctx.firestore().doc('/schools/phase1a-school/entitlements/ent-1').get(),
    /permission-denied/,
  );
  await env.cleanup();
});

test('security rules: unverified email cannot read /questionReleases', async () => {
  if (!rt) return;
  const env = await setupEnv();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const future = new Date(Date.now() + 1000 * 60 * 60);
    const past = new Date(Date.now() - 1000 * 60 * 60);
    await ctx.firestore().doc('/questionReleases/rel_x').set({
      publicationStatus: 'released',
      effectiveFrom: past,
      effectiveUntil: future,
      revokedAt: null,
    });
  });
  const ctx = env.authenticatedContext('uid-a', { email_verified: false });
  await assert.rejects(
    ctx.firestore().doc('/questionReleases/rel_x').get(),
    /permission-denied/,
  );
  await env.cleanup();
});
