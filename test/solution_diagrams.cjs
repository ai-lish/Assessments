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

const cases = [
  { key:'triangle_center', params:{center:'orthocenter',shapeKey:'acute-left'}, kind:'triangle_center', attrs:{center:'orthocenter','shape-key':'acute-left'}, labels:['三條高的交點','P'] },
  { key:'pyth_cone', params:{mode:'findL',r:3,h:4,l:5}, kind:'pyth_cone', attrs:{mode:'findL',r:3,h:4,l:5}, labels:['r = 3 cm','h = 4 cm','l = 5 cm'] },
  { key:'solid_cone', params:{solidType:'cone',r:4,h:8}, kind:'solid_cone', attrs:{solid:'cone',r:4,h:8}, labels:['r = 4 cm','h = 8 cm','V = 1/3πr²h'] },
  { key:'sector_measure', params:{r:10,angle:120,ask:'arc'}, kind:'sector_measure', attrs:{r:10,angle:120,ask:'arc'}, labels:['r = 10 cm','120°','所求弧長'] },
  { key:'cuboid_volume', params:{cube:false,l:4,w:5,h:6}, kind:'cuboid_volume', attrs:{mode:'cuboid',l:4,w:5,h:6}, labels:['長 4 cm','闊 5 cm','高 6 cm'] },
  { key:'cuboid_volume_cube', params:{cube:true,side:5}, kind:'cuboid_volume_cube', attrs:{mode:'cube',l:5,w:5,h:5}, labels:['邊長 5 cm'] },
  { key:'solid_sphere', params:{solidType:'sphere',r:6,h:8}, kind:'solid_sphere', attrs:{solid:'sphere',r:6,h:8}, labels:['r = 6 cm','V = 4/3πr³'] },
  { key:'solid_hemisphere', params:{solidType:'hemisphere',r:5,h:8}, kind:'solid_hemisphere', attrs:{solid:'hemisphere',r:5,h:8}, labels:['r = 5 cm','半球體積為整球一半','V = 2/3πr³'] },
  { key:'solid_cylinder', params:{solidType:'cylinder',r:3,h:9}, kind:'solid_cylinder', attrs:{solid:'cylinder',r:3,h:9}, labels:['r = 3 cm','h = 9 cm','V = πr²h'] },
  { key:'quadrant', params:{x:-3,y:4}, kind:'quadrant', attrs:{x:-3,y:4,quadrant:'II'}, labels:['P(-3,4)','II (-,+)'] },
];

const generated = [];
for (const item of cases) {
  const typeDef = bank.data.find((entry) => entry.key === item.key);
  check(`${item.key} exists in question bank`, Boolean(typeDef));
  if (!typeDef) continue;
  const result = generators.generateQuestion(typeDef, item.params);
  generated.push({ typeDef, result });
  const html = result.solutionHTML || '';
  check(`${item.key} solution contains inline SVG`, /<svg[\s>]/i.test(html));
  check(`${item.key} solution identifies diagram type`, html.includes(`data-solution-diagram="${item.kind}"`));
  check(`${item.key} question does not receive solution marker`, !result.questionHTML.includes('data-solution-diagram='));
  check(`${item.key} solution SVG is responsive`, /max-width:(?:360px|100%)/.test(html));
  for (const [name, value] of Object.entries(item.attrs)) {
    check(`${item.key} diagram carries ${name}=${value}`, html.includes(`data-${name}="${value}"`));
  }
  for (const label of item.labels) {
    check(`${item.key} diagram labels ${label}`, html.includes(label));
  }
}

const questions = generated.map(({ typeDef, result }, index) => ({
  qid: `sol-${index + 1}`,
  typeKey: typeDef.key,
  type: typeDef.type,
  validator: typeDef.validator,
  questionHTML: result.questionHTML,
  correctAnswer: result.correctAnswer,
  paramsUsed: result.paramsUsed,
  displayAnswer: result.displayAnswer,
  solutionHTML: result.solutionHTML,
  code: typeDef.code,
}));
const snapshot = pdf.generateSnapshotFromQuestions(questions, {
  seed:'solution-diagram-fixture',
  title:'解說圖測試',
  presetKey:'solution_diagrams',
  generatedAt:'2026-07-12T00:00:00.000Z',
});
const printHtml = pdf.renderPrintDocument(snapshot, { scope:'similar', showCode:true });
const [studentPart, teacherPart = ''] = printHtml.split('<div class="pdf-page-separator"></div>');
check('student PDF part does not include solution diagrams', !studentPart.includes('data-solution-diagram='));
check('teacher PDF part includes all ten solution diagrams', (teacherPart.match(/data-solution-diagram=/g) || []).length === 10, String((teacherPart.match(/data-solution-diagram=/g) || []).length));
check('teacher PDF part includes ten solution blocks', (teacherPart.match(/class="pdf-solution"/g) || []).length === 10);
check('PDF CSS constrains solution SVG width', printHtml.includes('.pdf-solution svg{max-width:100%;height:auto;}'));

if (failures.length) {
  console.error(`FAIL: ${failures.length} solution diagram check(s) failed`);
  failures.forEach((failure) => console.error(`  - ${failure}`));
  process.exit(1);
}
console.log(`PASS: solution diagrams (${passed} checks)`);
