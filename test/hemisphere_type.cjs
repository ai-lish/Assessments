#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const bank = require('../question-bank.json');
const generators = require('../tool/generators.js');
const validators = require('../tool/validators.js');

const ROOT = path.resolve(__dirname, '..');
const typeDef = bank.data.find((item) => item.key === 'solid_hemisphere');
const sphere = bank.data.find((item) => item.key === 'solid_sphere');
const allPresetKeys = bank.presets.flatMap((preset) => preset.questions.map((item) => item.typeKey));
const codes = bank.data.map((item) => item.code);
const toolHtml = fs.readFileSync(path.join(ROOT, 'tool/index.html'), 'utf8');
const codeDoc = fs.readFileSync(path.join(ROOT, 'docs/question-codes.md'), 'utf8');
let passed = 0;

function check(label, condition) {
  if (!condition) throw new Error(label);
  passed += 1;
  console.log('  ✓ ' + label);
}

console.log('=== solid_hemisphere type definition contract ===');
check('hemisphere typeDef exists', !!typeDef);
check('hemisphere reuses solid_mensuration', typeDef.generator === 'solid_mensuration');
check('hemisphere reuses unitNumeric', typeDef.validator === 'unitNumeric');
check('hemisphere stays in ME-5', /-ME-5$/.test(typeDef.code));
check('hemisphere code is newly registered', typeDef.code === 'LSC-2526-S3-T3-15-ME-5');
check('all question codes remain unique', new Set(codes).size === codes.length);
check('hemisphere defaultParams locks hemisphere', typeDef.defaultParams.solidType === 'hemisphere');
check('sphere defaultParams remains sphere only', sphere.defaultParams.solidType === 'sphere');
check('hemisphere is not added to any preset', !allPresetKeys.includes('solid_hemisphere'));

const generated = generators.generateQuestion(typeDef, { r: 3 });
check('hemisphere generator uses hemisphere wording', generated.questionHTML.includes('半球體'));
check('hemisphere generator records solidType', generated.paramsUsed.solidType === 'hemisphere');
check('hemisphere answer passes shared validator', validators.checkAnswer(generated, generated.answers[0]));
check('teacher tool has hemisphere Chinese label', toolHtml.includes('solid_hemisphere: "半球體量度"'));
check('teacher preview locks hemisphere sample params', toolHtml.includes('case "solid_hemisphere": return { solidType: "hemisphere"'));
check('ME-5 registry includes hemisphere code', codeDoc.includes(typeDef.code));

console.log('\n' + passed + ' hemisphere checks passed.');
