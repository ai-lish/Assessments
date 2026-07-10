#!/usr/bin/env node
'use strict';

/*
  Input-system contract:
  every bank type must expose a virtual-key path for at least one accepted
  answer. The configuration is read from the student template so the test
  guards the shipped input surface, not a separate copy of its key map.
*/

const fs = require('fs');
const path = require('path');
const bank = require('../question-bank.json');
const generators = require('../tool/generators.js');
const validators = require('../tool/validators.js');
const fixtures = require('./fixtures/generator_equivalence.json');

const ROOT = path.resolve(__dirname, '..');
const template = fs.readFileSync(path.join(ROOT, 'templates/student.html'), 'utf8');
const failures = [];
let passed = 0;

function check(label, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log('  ✓ ' + label);
  } else {
    const message = label + (detail ? ' — ' + detail : '');
    failures.push(message);
    console.log('  ✗ ' + message);
  }
}

function extractContextConfig(html) {
  const match = html.match(/const INPUT_CONTEXT_KEY_CONFIG = (\{[\s\S]*?\n\});/);
  if (!match) throw new Error('missing input context key configuration');
  return JSON.parse(match[1]);
}

function extractBaseKeys(html) {
  const match = html.match(/<div class="key-grid" id="keypad">([\s\S]*?)<\/div>\s*<div class="key-grid key-grid-context"/);
  if (!match) throw new Error('missing base keypad markup');
  return Array.from(match[1].matchAll(/onclick="kp\('([^']+)'\)"/g)).map((entry) => entry[1]);
}

const contextConfig = extractContextConfig(template);
const baseKeys = new Set(extractBaseKeys(template));

function contextKeysFor(def) {
  if (def.type === 'choice' || def.type === 'coordinate') return [];
  const validatorKeys = (contextConfig.validator && contextConfig.validator[def.validator || def.checkType]) || [];
  const typeKeys = (contextConfig.typeKey && contextConfig.typeKey[def.key]) || [];
  return Array.from(new Set(validatorKeys.concat(typeKeys)));
}

function buildQuestion(def) {
  const generatorKey = def.generator || def.key;
  const generatorFixture = fixtures[generatorKey] && fixtures[generatorKey][0];
  const params = generatorFixture ? generatorFixture.params : (def.defaultParams || {});
  const result = generators.generateQuestion(def, params);
  return Object.assign({}, result, {
    typeKey: def.key,
    type: def.type,
    checkType: def.checkType || result.checkType,
    validator: def.validator || result.validator || def.checkType || result.checkType,
    answerSpec: result.answerSpec || def.answerSpec,
  });
}

function charsNeeded(answer) {
  return Array.from(new Set(String(answer || '').replace(/\s/g, '').split('')));
}

function canType(answer, keys) {
  return charsNeeded(answer).every((character) => keys.has(character));
}

function inputReadyAnswers(q) {
  const candidates = [q.correctAnswer].concat(q.answers || []);
  return Array.from(new Set(candidates.filter((value) => {
    return typeof value === 'string' && !value.includes('\\') && !value.includes('{') && !value.includes('}');
  })));
}

console.log('=== Input answerability regression ===');
check('template retains a nine-column three-row numeric-left base keypad',
  /\.key-grid\s*\{[^}]*grid-template-columns:\s*repeat\(9,/.test(template) &&
  /id="keypad-context"/.test(template) &&
  /key-grid-context:empty/.test(template));
check('template keeps raw slash for physical-keyboard fraction input', /else if \(k === "\/"\) \{ kp\("\/"\)/.test(template));
check('template has structured preview helpers for fractions and radicals',
  /function topLevelSlashIndex\(/.test(template) && /function renderRadicals\(/.test(template) && /function expressionToLatex\(/.test(template));

for (const def of bank.data) {
  const q = buildQuestion(def);
  const availableKeys = new Set([...baseKeys, ...contextKeysFor(def)]);
  const answers = inputReadyAnswers(q);

  check(def.key + ' generates an input-ready accepted answer', answers.length > 0, JSON.stringify(q.answers));

  if (def.type === 'choice') {
    check(def.key + ' is choice-driven and needs no virtual text key', contextKeysFor(def).length === 0);
    continue;
  }

  if (def.type === 'coordinate') {
    const coordinateAnswer = answers.find((answer) => validators.checkAnswer(q, answer));
    check(def.key + ' retains numeric text input plus required grid interaction',
      Boolean(coordinateAnswer) && canType(coordinateAnswer, availableKeys), coordinateAnswer || 'no accepted answer');
    continue;
  }

  const typedAnswer = answers.find((answer) => validators.checkAnswer(q, answer) && canType(answer, availableKeys));
  check(def.key + ' has a validator-accepted answer typable from visible keys',
    Boolean(typedAnswer), 'answers=' + JSON.stringify(answers) + ', keys=' + Array.from(availableKeys).join(''));
}

console.log(`\n=== Summary: ${passed} passed, ${failures.length} failed ===`);
if (failures.length) {
  failures.forEach((failure) => console.error('  - ' + failure));
  process.exit(1);
}
