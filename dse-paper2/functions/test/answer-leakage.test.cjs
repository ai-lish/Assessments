// dse-paper2/functions/test/answer-leakage.test.cjs
// Static review test: confirms VariantRenderSnapshot shape does NOT include
// any answer-revealing field. Pure JS, no Firestore.

const test = require('node:test');
const assert = require('node:assert/strict');
const { generate } = require('../src/generator-indices');
const { buildPublicRenderSnapshot } = require('../src/create-attempt-session');

const FORBIDDEN_PUBLIC_FIELDS = [
  'correctOptionId',
  'correct',
  'answer',
  'exactAnswer',
  'evaluation',
  'evaluationExpression',
  'trapMapping',
  'optionToTrap',
  'seed',
  'distractors',
];

test('VariantRenderSnapshot contains no answer-revealing field', () => {
  const v = generate({ seed: 'leak-1' });
  const snap = buildPublicRenderSnapshot({
    releaseId: 'rel_x',
    variant: {
      ...v,
      variantId: 'var_x',
      publicOptions: [
        { id: 'A', value: { type: 'rational', numerator: '1', denominator: '2' } },
        { id: 'B', value: { type: 'rational', numerator: '2', denominator: '1' } },
        { id: 'C', value: { type: 'rational', numerator: '3', denominator: '1' } },
        { id: 'D', value: { type: 'rational', numerator: '4', denominator: '1' } },
      ],
    },
    rendererVersion: '1.0.0',
    contentVersion: '1.0.0',
  });
  for (const f of FORBIDDEN_PUBLIC_FIELDS) {
    assert.equal(f in snap, false, `public snapshot leaks field: ${f}`);
  }
});

test('VariantRenderSnapshot options do not embed the correct value in any obvious way', () => {
  // We can at least check that the publicOptions are 4 objects with ids A-D and
  // a rational value; we do not include any "isCorrect" flag on each option.
  const v = generate({ seed: 'leak-2' });
  const snap = buildPublicRenderSnapshot({
    releaseId: 'rel_x',
    variant: {
      ...v,
      variantId: 'var_x',
      publicOptions: [
        { id: 'A', value: { type: 'rational', numerator: '1', denominator: '2' } },
        { id: 'B', value: { type: 'rational', numerator: '2', denominator: '1' } },
        { id: 'C', value: { type: 'rational', numerator: '3', denominator: '1' } },
        { id: 'D', value: { type: 'rational', numerator: '4', denominator: '1' } },
      ],
    },
    rendererVersion: '1.0.0',
    contentVersion: '1.0.0',
  });
  assert.equal(snap.options.length, 4);
  for (const o of snap.options) {
    assert.equal(typeof o.isCorrect, 'undefined');
    assert.equal(typeof o.trapId, 'undefined');
    assert.equal(typeof o.correct, 'undefined');
  }
});
