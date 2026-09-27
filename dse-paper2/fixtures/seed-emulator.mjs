// dse-paper2/fixtures/seed-emulator.mjs
// Seed the Firebase Emulator with synthetic Phase 1A data.
// REQUIRES the emulator to be running on default ports (auth:9099, firestore:8080).
//
// Run with:
//   node fixtures/seed-emulator.mjs

import {
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
} from '../functions/src/fixtures.js';

const FIRESTORE = 'http://127.0.0.1:8080';
const AUTH = 'http://127.0.0.1:9099';
const PROJECT_ID = 'demo-dse-paper2';

async function patchFirestore(path, data) {
  const url = `${FISTORE_OR_EMULATOR()}${path}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: toFirestoreFields(data) }),
  });
  if (!res.ok) {
    throw new Error(`Firestore PATCH ${path} failed: ${res.status} ${await res.text()}`);
  }
}

function FISTORE_OR_EMULATOR() {
  // Use the special "emulator" host detection. firebase-tools does this.
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  return `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
}

function toFirestoreFields(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'number' && Number.isInteger(value)) return { integerValue: String(value) };
  if (typeof value === 'number') return { doubleValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreFields) } };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = toFirestoreFields(v);
    return { mapValue: { fields: out } };
  }
  return { stringValue: String(value) };
}

async function authSignUp(email, uid) {
  const res = await fetch(`http://${AUTH.replace('http://', '')}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'phase1a-fixture', returnUserToken: true }),
  });
  if (!res.ok) {
    console.warn(`auth signup for ${email} failed:`, res.status, await res.text());
  }
  return res.json();
}

async function main() {
  console.log(`Seeding emulator at ${FIRESTORE} for project ${PROJECT_ID}…`);

  // School
  await patchFirestore(`/schools/${SYNTHETIC_SCHOOL.schoolId}`, SYNTHETIC_SCHOOL);
  console.log('  ✓ schools/phase1a-school');

  // Entitlement
  await patchFirestore(`/schools/${SYNTHETIC_SCHOOL.schoolId}/entitlements/ent-1`, syntheticEntitlement('ent-1'));
  console.log('  ✓ entitlement ent-1');

  // Members
  for (const [key, u] of Object.entries(SYNTHETIC_USERS)) {
    const m = { ...syntheticMember(u.uid, u.email) };
    if (key === 'inactive') m.status = 'inactive';
    if (key === 'expired') m.status = 'active'; // entitlement is what expires
    await patchFirestore(`/schools/${SYNTHETIC_SCHOOL.schoolId}/members/${u.uid}`, m);
  }
  console.log('  ✓ members (verified / unverified / wrong-domain / inactive / expired)');

  // Question release
  await patchFirestore(`/questionReleases/${SYNTHETIC_RELEASE.releaseId}`, SYNTHETIC_RELEASE);
  console.log('  ✓ questionReleases/rel_dse_p2_phase1a_indices_v1');

  // Answer key
  await patchFirestore(`/protectedAnswerKeys/${SYNTHETIC_RELEASE.releaseId}`, SYNTHETIC_ANSWER_KEY);
  console.log('  ✓ protectedAnswerKeys/rel_dse_p2_phase1a_indices_v1');

  // Protected question packages
  const qid = SYNTHETIC_RELEASE.questionId;
  await patchFirestore(`/protectedQuestions/${qid}/packages/metadata`, SYNTHETIC_METADATA);
  await patchFirestore(`/protectedQuestions/${qid}/packages/content`, SYNTHETIC_CONTENT);
  await patchFirestore(`/protectedQuestions/${qid}/packages/feedback`, SYNTHETIC_FEEDBACK);
  console.log('  ✓ protectedQuestions/q_indices_power_of_power_div_v1/packages/{metadata,content,feedback}');

  // Auth users
  for (const u of Object.values(SYNTHETIC_USERS)) {
    await authSignUp(u.email, u.uid);
  }
  console.log('  ✓ auth users created (emulator)');

  console.log('Done. Open http://127.0.0.1:4000 to inspect.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
