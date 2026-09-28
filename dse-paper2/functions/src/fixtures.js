// dse-paper2/functions/src/fixtures.js
// Synthetic Phase 1A fixtures for emulator seeding. NO real student data, NO
// real school domains. The allowlist uses the reserved example.com namespace
// for testing). These fixtures are loaded by integration tests only.

const { canonicalRational } = require('./rational');

const PHASE1A_CONTENT_SET_ID = 'dse-paper2-phase1a-indices-v1';

const SYNTHETIC_RELEASE = {
  releaseId: 'rel_dse_p2_phase1a_indices_v1',
  questionId: 'q_indices_power_of_power_div_v1',
  contentSetId: PHASE1A_CONTENT_SET_ID,
  schemaVersion: '1.0.0',
  metadataRef: 'protectedQuestions/q_indices_power_of_power_div_v1/packages/metadata',
  contentRef: 'protectedQuestions/q_indices_power_of_power_div_v1/packages/content',
  feedbackRef: 'protectedQuestions/q_indices_power_of_power_div_v1/packages/feedback',
  visualRef: null,
  answerKeyRef: 'protectedAnswerKeys/rel_dse_p2_phase1a_indices_v1',
  packageHashes: { content: '<computed-at-deploy-time>', feedback: '<computed-at-deploy-time>' },
  releaseHash: '<computed-at-deploy-time>',
  generatorVersion: '1.0.0',
  generatorSchemaVersion: '1.0.0',
  feedbackSchemaVersion: '1.0.0',
  rendererVersion: '1.0.0',
  minimumClientVersion: '1.0.0',
  publicationStatus: 'released',
  entitlementScope: { contentSetId: PHASE1A_CONTENT_SET_ID },
  effectiveFrom: new Date('2026-06-01T00:00:00Z'),
  effectiveUntil: new Date('2027-06-01T00:00:00Z'),
  supersedesReleaseId: null,
  rollbackFromReleaseId: null,
  reviewStatus: 'approved',
  revocationPolicy: 'block_new_only',
  revocationReasonCode: null,
  createdAt: new Date('2026-06-01T00:00:00Z'),
  approvedAt: new Date('2026-06-01T00:00:00Z'),
  approvedBy: 'fixture@example.com',
  revokedAt: null,
};

const SYNTHETIC_ANSWER_KEY = {
  evaluatorType: 'indices-power-of-power-div-v1',
  canonicalExpectedRelation: 'correct = a^(m*n - k); traps: { powerOfPowerAdd, divisionExponentAdd, negativeExponentNotReciprocal }',
  trapModelDefinitions: {
    trap_power_of_power_add: '(a^m)^n 錯算為 a^(m+n)',
    trap_division_exponent_add: '同底相除指數相加而非相減',
    trap_negative_exponent_not_reciprocal: '負指數未轉倒數',
  },
  evaluationSchemaVersion: '1.0.0',
  generatorVersion: '1.0.0',
};

const SYNTHETIC_FEEDBACK = {
  feedbackSchemaVersion: '1.0.0',
  approved: true,
  approver: 'fixture@example.com',
  contentHtml: '<div>Phase 1A 自主指數題解：(a^m)^n / a^k = a^(m·n - k)</div>',
  commonMistakes: [
    { trapId: 'trap_power_of_power_add', explanation: '(a^m)^n ≠ a^(m+n)；應為 a^(m·n)。' },
    { trapId: 'trap_division_exponent_add', explanation: '同底相除應「指數相減」，非相加。' },
    { trapId: 'trap_negative_exponent_not_reciprocal', explanation: '負指數 = 倒數：a^(-p) = 1 / a^p。' },
  ],
};

const SYNTHETIC_CONTENT = {
  contentSchemaVersion: '1.0.0',
  topicKey: 'laws-of-indices',
  topicName: '指數律',
  language: 'zh-Hant',
  promptTemplate: {
    type: 'text+math',
    bodyHtml: '<p>化簡 <code>(a^{m})^{n} / a^{k}</code>，並以精確有理數表示結果。</p>',
  },
  optionCount: 4,
  multipleChoice: true,
  explanationLanguage: 'zh-Hant',
};

const SYNTHETIC_METADATA = {
  metadataSchemaVersion: '1.0.0',
  title: 'Phase 1A 指數律仿真題',
  subject: 'mathematics',
  paper: 'p2',
  year: null,
  source: 'platform-original',
  license: 'CC-BY-4.0',
  isOriginal: true,
  isAirtightOriginal: true,
  containsHkeaaContent: false,
  containsDsePastPaperContent: false,
  containsSchoolPaperContent: false,
};

const SYNTHETIC_SCHOOL = {
  schoolId: 'phase1a-school',
  name: '測試學校A',
  domain: 'example.com',
  status: 'active',
  createdAt: new Date('2026-06-01T00:00:00Z'),
};

function syntheticMember(uid, email) {
  return {
    uid,
    role: 'student',
    status: 'active',
    subjectIds: ['mathematics'],
    email,
    addedAt: new Date('2026-06-01T00:00:00Z'),
  };
}

function syntheticEntitlement(entitlementId, contentSetId = PHASE1A_CONTENT_SET_ID, validFrom, validUntil) {
  return {
    contentSetIds: [contentSetId],
    validFrom: validFrom || new Date('2026-06-01T00:00:00Z'),
    validUntil: validUntil || new Date('2027-06-01T00:00:00Z'),
    status: 'active',
    allowedModes: ['attempt', 'review'],
    internalAuthorizationReference: 'phase1a-fixture',
  };
}

const SYNTHETIC_USERS = {
  verified: {
    uid: 'uid-verified-student',
    email: 'student@example.com',
    email_verified: true,
  },
  unverified: {
    uid: 'uid-unverified-student',
    email: 'unverified@example.com',
    email_verified: false,
  },
  wrongDomain: {
    uid: 'uid-wrong-domain',
    email: 'student@other.example.com',
    email_verified: true,
  },
  inactive: {
    uid: 'uid-inactive',
    email: 'inactive@example.com',
    email_verified: true,
  },
  expired: {
    uid: 'uid-expired',
    email: 'expired@example.com',
    email_verified: true,
  },
};

module.exports = {
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
  canonicalRational,
};
