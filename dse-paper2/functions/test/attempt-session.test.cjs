// dse-paper2/functions/test/attempt-session.test.cjs
// Emulator test: full createAttemptSession + submitAttempt flow.
//
// ⚠️  Requires Firebase Emulator. NOT executed in this environment.
//
// Run with:
//   firebase emulators:exec --only firestore,auth,functions "node --test test/attempt-session.test.cjs"

const test = require('node:test');
const assert = require('node:assert/strict');

let rt = null;
try {
  rt = require('@firebase/rules-unit-testing');
} catch (e) {
  test.skip('@firebase/rules-unit-testing not installed; skipped', () => {});
}

const PROJECT_ID = 'demo-dse-paper2';
const {
  PHASE1A_CONTENT_SET_ID,
  SYNTHETIC_RELEASE,
  SYNTHETIC_ANSWER_KEY,
  SYNTHETIC_FEEDBACK,
  SYNTHETIC_CONTENT,
  SYNTHETIC_METADATA,
  SYNTHETIC_SCHOOL,
  SYNTHETIC_USERS,
  syntheticMember,
  syntheticEntitlement,
} = require('../src/fixtures');

const RELEASE_ID = SYNTHETIC_RELEASE.releaseId;

async function seedEmulatorData(env) {
  // Seed all required docs with rules disabled
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await db.doc('/questionReleases/' + RELEASE_ID).set(SYNTHETIC_RELEASE);
    await db.doc('/protectedAnswerKeys/' + RELEASE_ID).set(SYNTHETIC_ANSWER_KEY);
    await db.doc('/protectedQuestions/q_indices_power_of_power_div_v1/packages/content').set(SYNTHETIC_CONTENT);
    await db.doc('/protectedQuestions/q_indices_power_of_power_div_v1/packages/feedback').set(SYNTHETIC_FEEDBACK);
    await db.doc('/protectedQuestions/q_indices_power_of_power_div_v1/packages/metadata').set(SYNTHETIC_METADATA);
    await db.doc('/schools/' + SYNTHETIC_SCHOOL.schoolId).set(SYNTHETIC_SCHOOL);
    await db.doc('/schools/' + SYNTHETIC_SCHOOL.schoolId + '/entitlements/ent-1').set(
      syntheticEntitlement('ent-1'),
    );
    await db.doc('/schools/' + SYNTHETIC_SCHOOL.schoolId + '/members/' + SYNTHETIC_USERS.verified.uid).set(
      syntheticMember(SYNTHETIC_USERS.verified.uid, SYNTHETIC_USERS.verified.email),
    );
  });
  // Create the verified user in auth emulator
  const auth = env.auth;
  await auth.createUser({
    uid: SYNTHETIC_USERS.verified.uid,
    email: SYNTHETIC_USERS.verified.email,
    emailVerified: true,
  });
  await auth.createUser({
    uid: SYNTHETIC_USERS.unverified.uid,
    email: SYNTHETIC_USERS.unverified.email,
    emailVerified: false,
  });
  await auth.createUser({
    uid: SYNTHETIC_USERS.wrongDomain.uid,
    email: SYNTHETIC_USERS.wrongDomain.email,
    emailVerified: true,
  });
}

test('attempt-session: verified user in allowlist can create session', async () => {
  if (!rt) return;
  const env = await rt.initializeTestEnvironment({ projectId: PROJECT_ID });
  await rt.loadFirestoreRules({
    projectId: PROJECT_ID,
    rules: require('fs').readFileSync(
      require('path').join(__dirname, '..', '..', 'firestore.rules'),
      'utf-8',
    ),
  });
  await seedEmulatorData(env);
  // process.env handled by firebase.json emulators
  process.env.ALLOWED_SCHOOL_DOMAINS = 'phase1a.example.test';
  process.env.SCHOOL_DOMAIN_TO_ID = 'phase1a.example.test:phase1a-school';

  const admin = require('firebase-admin');
  const app = admin.initializeApp({ projectId: PROJECT_ID }, 'test-' + Date.now());
  const ctx = env.authenticatedContext(SYNTHETIC_USERS.verified.uid);
  const idToken = await ctx.getIdToken();
  const { createAttemptSessionHandler } = require('../src/create-attempt-session');

  // Note: the handler uses Admin SDK; in emulator we pass it directly. The
  // auth check is based on the passed-in `context.auth`. We invoke the handler
  // with a synthetic context built from the user.
  const result = await createAttemptSessionHandler({
    admin: app,
    context: { auth: { uid: SYNTHETIC_USERS.verified.uid, token: { email_verified: true, email: SYNTHETIC_USERS.verified.email } } },
    input: { releaseId: RELEASE_ID },
  });
  assert.equal(result.state, 'active');
  assert.ok(result.renderSnapshot, 'renderSnapshot present');
  assert.equal(result.renderSnapshot.correctOptionId, undefined);
  assert.equal(result.renderSnapshot.correct, undefined);
  await app.delete();
  await env.cleanup();
});

test('attempt-session: unverified email rejected', async () => {
  if (!rt) return;
  const env = await rt.initializeTestEnvironment({ projectId: PROJECT_ID });
  await rt.loadFirestoreRules({ projectId: PROJECT_ID, rules: '' });
  await seedEmulatorData(env);
  process.env.ALLOWED_SCHOOL_DOMAINS = 'phase1a.example.test';
  process.env.SCHOOL_DOMAIN_TO_ID = 'phase1a.example.test:phase1a-school';
  const admin = require('firebase-admin');
  const app = admin.initializeApp({ projectId: PROJECT_ID }, 'test-' + Date.now());
  const { createAttemptSessionHandler } = require('../src/create-attempt-session');
  await assert.rejects(
    createAttemptSessionHandler({
      admin: app,
      context: { auth: { uid: SYNTHETIC_USERS.unverified.uid, token: { email_verified: false, email: SYNTHETIC_USERS.unverified.email } } },
      input: { releaseId: RELEASE_ID },
    }),
    (err) => err.code === 'email-not-verified',
  );
  await app.delete();
  await env.cleanup();
});

test('attempt-session: wrong-domain email rejected', async () => {
  if (!rt) return;
  const env = await rt.initializeTestEnvironment({ projectId: PROJECT_ID });
  await rt.loadFirestoreRules({ projectId: PROJECT_ID, rules: '' });
  await seedEmulatorData(env);
  process.env.ALLOWED_SCHOOL_DOMAINS = 'phase1a.example.test';
  process.env.SCHOOL_DOMAIN_TO_ID = 'phase1a.example.test:phase1a-school';
  const admin = require('firebase-admin');
  const app = admin.initializeApp({ projectId: PROJECT_ID }, 'test-' + Date.now());
  const { createAttemptSessionHandler } = require('../src/create-attempt-session');
  await assert.rejects(
    createAttemptSessionHandler({
      admin: app,
      context: { auth: { uid: SYNTHETIC_USERS.wrongDomain.uid, token: { email_verified: true, email: SYNTHETIC_USERS.wrongDomain.email } } },
      input: { releaseId: RELEASE_ID },
    }),
    (err) => err.code === 'domain-not-allowed',
  );
  await app.delete();
  await env.cleanup();
});

test('attempt-session: duplicate idempotency key with same payload returns same attempt', async () => {
  if (!rt) return;
  // This is a more involved test: full submit + replay. Skeleton only.
  test.skip();
});
