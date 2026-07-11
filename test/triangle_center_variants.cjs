#!/usr/bin/env node
'use strict';

const bank = require('../question-bank.json');
const generators = require('../tool/generators.js');
const validators = require('../tool/validators.js');

const CENTERS = ['circumcenter', 'incenter', 'centroid', 'orthocenter'];
const SHAPES = ['acute-wide', 'acute-left', 'acute-right', 'acute-tall', 'acute-low-left', 'acute-low-right'];
const typeDef = bank.data.find((item) => item.key === 'triangle_center');
let passed = 0;
const failures = [];

function check(label, condition, detail = '') {
  if (condition) {
    passed += 1;
  } else {
    failures.push(`${label}${detail ? `: ${detail}` : ''}`);
  }
}

function makeSeededRandom(seed) {
  let state = seed | 0;
  return function random() {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
}

function withSeed(seed, fn) {
  const original = Math.random;
  Math.random = makeSeededRandom(seed);
  try { return fn(); }
  finally { Math.random = original; }
}

check('triangle_center typeDef exists', !!typeDef);
check('triangle_center keeps GE-5 code', typeDef && /-GE-5$/.test(typeDef.code));

const signatures = new Set();
const svgsByCenter = new Map(CENTERS.map((center) => [center, new Set()]));
for (const center of CENTERS) {
  for (const shapeKey of SHAPES) {
    const result = generators.generateQuestion(typeDef, { center, shapeKey });
    const question = Object.assign({}, typeDef, result, {
      validator: typeDef.validator,
      answerSpec: result.answerSpec || typeDef.answerSpec,
    });
    const signature = JSON.stringify({ center: result.paramsUsed.center, shapeKey: result.paramsUsed.shapeKey });
    signatures.add(signature);
    svgsByCenter.get(center).add(result.imageSvg);
    check(`${center}/${shapeKey} keeps requested center`, result.paramsUsed.center === center);
    check(`${center}/${shapeKey} keeps requested shape`, result.paramsUsed.shapeKey === shapeKey);
    check(`${center}/${shapeKey} answer accepted`, validators.checkAnswer(question, center));
    check(`${center}/${shapeKey} SVG is finite`, !/NaN|Infinity/.test(result.imageSvg));
  }
}

check('triangle_center resolved parameter space has 24 variants', signatures.size === 24, String(signatures.size));
for (const center of CENTERS) {
  check(`${center} has six distinct shape SVGs`, svgsByCenter.get(center).size === 6, String(svgsByCenter.get(center).size));
}

const randomCenters = new Set();
const randomShapes = new Set();
const randomSignatures = new Set();
withSeed(0x43e5, () => {
  for (let i = 0; i < 120; i += 1) {
    const result = generators.generateQuestion(typeDef, {});
    randomCenters.add(result.paramsUsed.center);
    randomShapes.add(result.paramsUsed.shapeKey);
    randomSignatures.add(`${result.paramsUsed.center}/${result.paramsUsed.shapeKey}`);
  }
});
check('default generation reaches all four centers', randomCenters.size === 4, [...randomCenters].join(','));
check('default generation reaches all six shapes', randomShapes.size === 6, [...randomShapes].join(','));
check('default generation is not fixed to centroid', randomSignatures.size >= 12, String(randomSignatures.size));

if (failures.length) {
  console.error(`triangle_center variants: ${failures.length} failure(s)`);
  failures.forEach((failure) => console.error(`  - ${failure}`));
  process.exit(1);
}
console.log(`triangle_center variants: ${passed} checks passed; explicit space=24; sampled=${randomSignatures.size}`);
