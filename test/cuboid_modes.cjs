#!/usr/bin/env node

const bank = require('../question-bank.json');
const { generators } = require('../tool/generators.js');

const typeByKey = new Map(bank.data.map((item) => [item.key, item]));
const cuboidType = typeByKey.get('cuboid_volume');
const cubeType = typeByKey.get('cuboid_volume_cube');
let passed = 0;

function check(label, condition) {
  if (!condition) throw new Error(label);
  passed += 1;
  console.log('  ✓ ' + label);
}

console.log('=== cuboid_volume mode contract ===');
check('normal cuboid typeDef defaults to cube:false', cuboidType.defaultParams.cube === false);
check('S2 preset cube typeDef remains cube:true', cubeType.defaultParams.cube === true);

const cuboid = generators.cuboid_volume({ cube: false, l: 3, w: 4, h: 5 });
check('cuboid mode uses three dimensions', cuboid.paramsUsed.l === 3 && cuboid.paramsUsed.w === 4 && cuboid.paramsUsed.h === 5);
check('cuboid mode records cube:false', cuboid.paramsUsed.cube === false);
check('cuboid wording names 長方體', cuboid.questionHTML.includes('長方體') && !cuboid.questionHTML.includes('立方體'));
check('cuboid answer remains volume', cuboid.correctAnswer === '60');

const cube = generators.cuboid_volume({ cube: true, side: 5 });
check('cube mode records cube:true', cube.paramsUsed.cube === true && cube.paramsUsed.side === 5);
check('cube wording names 立方體', cube.questionHTML.includes('立方體') && !cube.questionHTML.includes('長方體'));
check('cube answer remains side cubed', cube.correctAnswer === '125');

console.log('\n' + passed + ' cuboid mode checks passed.');
