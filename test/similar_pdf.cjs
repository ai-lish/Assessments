#!/usr/bin/env node
'use strict';

const bank = require('../question-bank.json');
const generators = require('../tool/generators.js');
const pdf = require('../tool/pdf.js');

let passed = 0;
const failures = [];
function check(label, condition, detail = '') {
  if (condition) passed += 1;
  else failures.push(`${label}${detail ? `: ${detail}` : ''}`);
}

const triangleDef = bank.data.find((item) => item.key === 'triangle_center');
const currentResult = generators.generateQuestion(triangleDef, { center: 'centroid', shapeKey: 'acute-wide' });
const currentQuestion = { typeKey: triangleDef.key, paramsUsed: currentResult.paramsUsed };
const triangleSpec = { qid: 'q009', typeKey: triangleDef.key, typeDef: triangleDef, params: {} };
const snapshot = pdf.generateVariantSnapshot(triangleSpec, currentQuestion, 5, 'similar-triangle-fixture', {
  generatorApi: generators,
  generatedAt: '2026-07-11T00:00:00.000Z',
  presetKey: 's3_term3_part_a',
});

const signatures = snapshot.questions.map((q) => pdf._private.paramsSignature(q.paramsUsed));
check('triangle similar PDF returns five variants', snapshot.questions.length === 5, String(snapshot.questions.length));
check('triangle variants are mutually unique', new Set(signatures).size === 5);
check('triangle variants exclude current instance', !signatures.includes(pdf._private.paramsSignature(currentQuestion.paramsUsed)));
check('triangle variants keep same typeKey', snapshot.questions.every((q) => q.typeKey === 'triangle_center'));
check('triangle variants keep SVG figures', snapshot.questions.every((q) => /<svg[\s>]/i.test(q.questionHTML)));
check('full variant title states five questions', snapshot.title === '同類練習（5題）', snapshot.title);

const html = pdf.renderPrintDocument(snapshot, { scope: 'similar', showCode: true });
check('similar document uses shared scope renderer', html.includes('data-pdf-scope="similar"'));
check('similar document has one student section', (html.match(/data-mode="student"/g) || []).length === 1);
check('similar document has one teacher section', (html.match(/data-mode="teacher"/g) || []).length === 1);
check('similar document repeats same five instances in both sections', (html.match(/data-type-key="triangle_center"/g) || []).length === 10);
check('teacher section has five red answers', (html.match(/class="pdf-answer pdf-teacher-answer"/g) || []).length === 5);
check('teacher section has five solution blocks', (html.match(/class="pdf-solution"/g) || []).length === 5);
check('student section has five answer lines', (html.match(/class="pdf-answer-line"/g) || []).length === 5);
check('similar document keeps shared snapshot id', (html.match(new RegExp(snapshot.snapshotId, 'g')) || []).length >= 3);
check('similar print waits for MathJax', html.includes('waitForMathJax') && html.includes('MathJax.typesetPromise'));
check('similar print waits for assets', html.includes('waitForAssets'));
check('similar print waits for two frames', (html.match(/await nextFrame\(\)/g) || []).length >= 2);
check('similar print path has no setTimeout', !/setTimeout\s*\(/.test(html));

let finiteIndex = 0;
const finiteApi = {
  generateQuestion() {
    const value = finiteIndex % 4;
    finiteIndex += 1;
    return {
      questionHTML: `value ${value}`,
      correctAnswer: String(value),
      paramsUsed: { value },
      solutionHTML: `solution ${value}`,
      displayAnswer: String(value),
      checkType: 'textExact',
    };
  },
};
const finiteSpec = { typeKey: 'finite_demo', typeDef: { key: 'finite_demo', generator: 'finite_demo', type: 'text' } };
const finiteSnapshot = pdf.generateVariantSnapshot(finiteSpec, { paramsUsed: { value: 0 } }, 5, 'finite-fixture', {
  generatorApi: finiteApi,
  maxAttempts: 40,
});
check('finite fallback emits all three available alternatives', finiteSnapshot.actualCount === 3, String(finiteSnapshot.actualCount));
check('finite fallback keeps alternatives unique', new Set(finiteSnapshot.questions.map((q) => q.paramsUsed.value)).size === 3);
check('finite fallback excludes current value', finiteSnapshot.questions.every((q) => q.paramsUsed.value !== 0));
check('finite fallback title states actual count', finiteSnapshot.title === '同類練習(本題型共 3 變式)', finiteSnapshot.title);

const zeroApi = {
  generateQuestion() {
    return {
      questionHTML: 'only value',
      correctAnswer: '1',
      paramsUsed: { value: 1 },
      solutionHTML: 'only solution',
      displayAnswer: '1',
      checkType: 'textExact',
    };
  },
};
const zeroSnapshot = pdf.generateVariantSnapshot(
  { typeKey: 'zero_demo', typeDef: { key: 'zero_demo', generator: 'zero_demo', type: 'text' } },
  { paramsUsed: { value: 1 } },
  5,
  'zero-fixture',
  { generatorApi: zeroApi, maxAttempts: 20 },
);
check('zero-space fallback emits no variants', zeroSnapshot.actualCount === 0, String(zeroSnapshot.actualCount));
check('zero-space fallback exposes an empty question list', zeroSnapshot.questions.length === 0, String(zeroSnapshot.questions.length));

const typeByKey = new Map(bank.data.map((item) => [item.key, item]));
const presetTypeKeys = [...new Set(bank.presets.flatMap((preset) => preset.questions.map((item) => item.typeKey)))];
const limitedTypes = [];
for (const typeKey of presetTypeKeys) {
  const def = typeByKey.get(typeKey);
  const current = generators.generateQuestion(def, {});
  const variants = pdf.generateVariantSnapshot(
    { typeKey, typeDef: def, params: {} },
    { paramsUsed: current.paramsUsed },
    5,
    `similar-audit:${typeKey}`,
    { generatorApi: generators, maxAttempts: 1000 },
  );
  const variantSignatures = variants.questions.map((q) => pdf._private.paramsSignature(q.paramsUsed));
  check(`${typeKey} variants are unique`, new Set(variantSignatures).size === variantSignatures.length);
  check(`${typeKey} variants exclude current params`, !variantSignatures.includes(pdf._private.paramsSignature(current.paramsUsed)));
  check(`${typeKey} emits no more than requested count`, variants.actualCount <= 5);
  if (variants.actualCount < 5) {
    limitedTypes.push(`${typeKey}:${variants.actualCount}`);
    check(`${typeKey} limited title states actual count`, variants.title.includes(`共 ${variants.actualCount} 變式`), variants.title);
  }
}
check('all preset typeKeys audited', presetTypeKeys.length >= 50, String(presetTypeKeys.length));
check('fixed s1t2 equation is detected as zero-space', limitedTypes.includes('s1t2_solve_eq_fraction:0'), limitedTypes.join(','));

if (failures.length) {
  console.error(`similar PDF: ${failures.length} failure(s)`);
  failures.forEach((failure) => console.error(`  - ${failure}`));
  process.exit(1);
}
console.log(`similar PDF: ${passed} checks passed; triangle space=24; finite fallback=3; limited=${limitedTypes.join(',') || 'none'}`);
