#!/usr/bin/env node

const { generators } = require('../tool/generators.js');

const bases = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25]];
const triples = bases.flatMap((base) => [1, 2, 3].map((scale) => base.map((value) => value * scale)));
let passed = 0;

function check(label, condition) {
  if (!condition) throw new Error(label);
  passed += 1;
  console.log('  ✓ ' + label);
}

console.log('=== pyth_cone triple-pool contract ===');
for (const [r, h, l] of triples) {
  const findL = generators.pyth_cone({ mode: 'findL', r, h, l });
  const findH = generators.pyth_cone({ mode: 'findH', r, h, l });
  check(`${r}-${h}-${l} is a Pythagorean triple`, r * r + h * h === l * l);
  check(`${r}-${h}-${l} findL stays integer`, Number.isInteger(Number(findL.correctAnswer)) && Number(findL.correctAnswer) === l);
  check(`${r}-${h}-${l} findH stays integer`, Number.isInteger(Number(findH.correctAnswer)) && Number(findH.correctAnswer) === h);
}

const originalRandom = Math.random;
const seen = new Set();
try {
  for (let i = 0; i < 30; i += 1) {
    Math.random = () => ((i % triples.length) + 0.25) / triples.length;
    const result = generators.pyth_cone({});
    seen.add([result.paramsUsed.r, result.paramsUsed.h, result.paramsUsed.l].join('-'));
    check(`sample ${i + 1} answer is integer`, Number.isInteger(Number(result.correctAnswer)));
  }
} finally {
  Math.random = originalRandom;
}
check('30 generated samples contain at least 5 triples', seen.size >= 5);

console.log('\n' + passed + ' pyth_cone checks passed; distinct triples=' + seen.size + '.');
