#!/usr/bin/env node

const { generators } = require('../tool/generators.js');

const cases = [
  { params: { cost: 1000, pct: 15, isProfit: true }, answer: '15' },
  { params: { cost: 500, pct: 20, isProfit: false }, answer: '-20' },
];
let passed = 0;

for (const item of cases) {
  const result = generators.profit_pct(item.params);
  if (!result.questionHTML.includes('求百分變化。')) throw new Error('profit_pct wording was not updated');
  if (result.questionHTML.includes('求盈虧百分率。')) throw new Error('legacy profit_pct wording remains');
  if (result.correctAnswer !== item.answer) throw new Error('profit_pct signed answer changed: ' + result.correctAnswer);
  passed += 3;
}

console.log('profit_pct wording and signed-answer contract passed (' + passed + ' checks).');
