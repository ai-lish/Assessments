#!/usr/bin/env node
'use strict';

/*
  Input-system contract:
  every bank type must expose a validator-accepted answer through the same
  per-question keypad rules shipped in the student template, within 3 rows.
*/

const fs = require('fs');
const path = require('path');
const vm = require('vm');
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

function extractConfig(html) {
  const match = html.match(/const INPUT_KEYPAD_CONFIG = (\{[\s\S]*?\n\});/);
  if (!match) throw new Error('missing input keypad configuration');
  return JSON.parse(match[1]);
}

function extractFunction(html, name) {
  const start = html.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('missing function ' + name);
  const brace = html.indexOf('{', start);
  let depth = 0;
  for (let i = brace; i < html.length; i += 1) {
    if (html[i] === '{') depth += 1;
    if (html[i] === '}') depth -= 1;
    if (depth === 0) return html.slice(start, i + 1);
  }
  throw new Error('unterminated function ' + name);
}

const keypadConfig = extractConfig(template);
const sandbox = {};
vm.runInNewContext(
  'const INPUT_KEYPAD_CONFIG = ' + JSON.stringify(keypadConfig) + ';\n' +
  extractFunction(template, 'keypadKeysForQuestion') + '\n' +
  'globalThis.keypadKeysForQuestion = keypadKeysForQuestion;',
  sandbox
);
const keypadKeysForQuestion = sandbox.keypadKeysForQuestion;
const baseKeys = new Set(keypadConfig.baseRows.flat().filter((key) => key !== null));

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
  return charsNeeded(answer).every((character) => /[0-9]/.test(character) || keys.has(character));
}

function inputReadyAnswers(q) {
  const candidates = [q.correctAnswer].concat(q.answers || []);
  return Array.from(new Set(candidates.filter((value) => {
    return typeof value === 'string' && !value.includes('\\') && !value.includes('{') && !value.includes('}');
  })));
}

console.log('=== Input answerability regression ===');
check('template uses one dynamic nine-column keypad',
  /\.key-grid\s*\{[^}]*grid-template-columns:\s*repeat\(9,/.test(template) &&
  /id="keypad" aria-label="題型專用按鍵"/.test(template) &&
  !/id="keypad-context"/.test(template));
check('numeric base occupies four left slots across exactly three rows',
  keypadConfig.baseRows.length === 3 && keypadConfig.baseRows.every((row) => row.length === 4));
check('base keys include digits, decimal, minus, delete, and clear',
  '0123456789.'.split('').every((key) => baseKeys.has(key)) &&
  ['-', '⌫', 'C'].every((key) => keypadConfig.controlKeys.includes(key)));
check('template keeps raw slash for physical-keyboard fraction input', /else if \(k === "\/"\) \{ kp\("\/"\)/.test(template));
check('template has structured preview helpers for fractions and radicals',
  /function topLevelSlashIndex\(/.test(template) && /function renderRadicals\(/.test(template) && /function expressionToLatex\(/.test(template));

let maximum = { key: '', count: 0, keys: [] };
for (const def of bank.data) {
  const q = buildQuestion(def);
  const supplemental = Array.from(keypadKeysForQuestion(q));
  const availableKeys = new Set([...baseKeys, ...supplemental]);
  const answers = inputReadyAnswers(q);

  if (supplemental.length > maximum.count) maximum = { key: def.key, count: supplemental.length, keys: supplemental };
  check(def.key + ' keypad fits within three rows', supplemental.length <= 15,
    'supplemental=' + supplemental.join(''));
  check(def.key + ' generates an input-ready accepted answer', answers.length > 0, JSON.stringify(q.answers));

  if (def.type === 'choice') {
    check(def.key + ' is choice-driven and hides the virtual keypad', supplemental.length === 0);
    continue;
  }

  const typedAnswer = answers.find((answer) => validators.checkAnswer(q, answer) && canType(answer, availableKeys));
  check(def.key + ' has a validator-accepted answer typable from visible keys',
    Boolean(typedAnswer), 'answers=' + JSON.stringify(answers) + ', keys=' + Array.from(availableKeys).join(''));

  const answerChars = new Set(charsNeeded(q.correctAnswer));
  if (['a', 'b', 'k'].some((letter) => answerChars.has(letter))) {
    check(def.key + ' a/b/k answer omits unrelated x/y keys', !availableKeys.has('x') && !availableKeys.has('y'));
  }
  if (['x', 'y'].some((letter) => answerChars.has(letter)) && !['primeFactor', 'scientificNotation'].includes(q.validator)) {
    check(def.key + ' x/y answer omits unrelated a/b/k keys',
      !availableKeys.has('a') && !availableKeys.has('b') && !availableKeys.has('k'));
  }
}

const byKey = Object.fromEntries(bank.data.map((def) => [def.key, buildQuestion(def)]));
function hasKeys(typeKey, expected) {
  const keys = new Set([...baseKeys, ...keypadKeysForQuestion(byKey[typeKey])]);
  return expected.every((key) => keys.has(key));
}
check('fraction context exposes slash', hasKeys('s1t2_solve_eq_fraction', ['/']));
check('ratio context exposes colon', hasKeys('ratio_three', [':']));
check('root context exposes plus-minus, radical, and comma', hasKeys('square_root_pm', ['±', '√', ',']));
check('congruence context exposes S/A/R/H and decimal point', hasKeys('congruence', ['S', 'A', 'R', 'H', '.']));
check('inequality context exposes >/< /=/≥/≤ and x', hasKeys('solve_ineq', ['>', '<', '=', '≥', '≤', 'x']));
check('pi context exposes pi and slash', hasKeys('solid_cone', ['π', '/']));
check('maximum keypad remains within three rows', maximum.count <= 15, JSON.stringify(maximum));

console.log(`\nMost crowded keypad: ${maximum.key} (${maximum.count} supplemental keys: ${maximum.keys.join(' ')})`);
console.log(`\n=== Summary: ${passed} passed, ${failures.length} failed ===`);
if (failures.length) {
  failures.forEach((failure) => console.error('  - ' + failure));
  process.exit(1);
}
