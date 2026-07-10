#!/usr/bin/env node
'use strict';

const bank = require('../question-bank.json');
const generators = require('../tool/generators.js');
const validators = require('../tool/validators.js');

const A_VALUES = [-5, -4, -3, -2, 2, 3, 4, 5];
const BOUNDARY_VALUES = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];
const B_VALUES = [-8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8];
const OP_VALUES = ['>', '<', '>=', '<='];
const INVERT = { '>': '<', '<': '>', '>=': '<=', '<=': '>=' };

let passed = 0;
const failures = [];

function check(label, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

function assertFine(label, condition, detail = '') {
  if (condition) {
    passed += 1;
  } else {
    failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
  }
}

function gcd(x, y) {
  x = Math.abs(x);
  y = Math.abs(y);
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

function simpleDenominator(a, b, boundary) {
  const rhs = a * boundary + b;
  const numerator = rhs - b;
  const denominator = a;
  const g = gcd(numerator, denominator);
  return Math.abs(denominator / g);
}

function legalCombos() {
  const combos = [];
  const excluded = [];
  for (const a of A_VALUES) {
    for (const boundary of BOUNDARY_VALUES) {
      for (const b of B_VALUES) {
        for (const op of OP_VALUES) {
          const denominator = simpleDenominator(a, b, boundary);
          const combo = { a, b, boundary, op };
          if (a !== 0 && denominator <= 4) combos.push(combo);
          else excluded.push({ ...combo, denominator });
        }
      }
    }
  }
  return { combos, excluded };
}

function typeDef() {
  const def = bank.data.find((item) => item.key === 'solve_ineq');
  if (!def) throw new Error('missing typeDef solve_ineq');
  return def;
}

function assemble(def, result) {
  return {
    typeKey: def.key,
    type: def.type,
    checkType: def.checkType,
    validator: def.validator || def.checkType,
    correctAnswer: result.correctAnswer,
    answers: result.answers,
    answerSpec: result.answerSpec || def.answerSpec,
  };
}

function makeSeededRandom(seed) {
  let s = seed | 0;
  return function random() {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    return ((s >>> 0) / 0x100000000);
  };
}

function withSeed(seed, fn) {
  const original = Math.random;
  Math.random = makeSeededRandom(seed);
  try {
    return fn();
  } finally {
    Math.random = original;
  }
}

function independentSolve(combo) {
  const rhs = combo.a * combo.boundary + combo.b;
  const solvedBoundary = (rhs - combo.b) / combo.a;
  const finalOp = combo.a < 0 ? INVERT[combo.op] : combo.op;
  return {
    rhs,
    op: finalOp,
    value: solvedBoundary,
    correctAnswer: `x${finalOp}${solvedBoundary}`,
    answerSpec: { variable: 'x', op: finalOp, value: solvedBoundary },
  };
}

function reversedEquivalent(op, value) {
  const leftOp = INVERT[op];
  return `${value}${leftOp}x`;
}

function boundaryOperatorError(op, value) {
  const wrong = op === '>' ? '>='
    : op === '>=' ? '>'
      : op === '<' ? '<='
        : '<';
  return `x${wrong}${value}`;
}

console.log('=== solve_ineq random parameter contract ===');

const def = typeDef();
check('solve_ineq uses inequality validator', (def.validator || def.checkType) === 'inequality', def.validator || def.checkType);
check('solve_ineq keeps NA-21 family code', String(def.code || '').endsWith('-NA-21'), def.code || '');
check('solve_ineq has no defaultParams lock', def.defaultParams === undefined, JSON.stringify(def.defaultParams));

const { combos, excluded } = legalCombos();
check('solve_ineq theoretical combo count = 7072', A_VALUES.length * BOUNDARY_VALUES.length * B_VALUES.length * OP_VALUES.length === 7072);
check('solve_ineq legal combo count = 7072', combos.length === 7072, String(combos.length));
check('solve_ineq excludes 0 complex-fraction combos', excluded.length === 0, JSON.stringify(excluded.slice(0, 20)));
check('solve_ineq covers all 3536 a < 0 combos', combos.filter((c) => c.a < 0).length === 3536);
check('solve_ineq covers all four original operators evenly',
  OP_VALUES.every((op) => combos.filter((c) => c.op === op).length === 1768));
check('solve_ineq covers boundary = 0 combos', combos.filter((c) => c.boundary === 0).length === 544);

const explicit = generators.generateQuestion(def, { a: -2, b: 5, boundary: -3, op: '<' });
const expectedExplicit = {
  questionHTML: '8. 解不等式 \\( -2x + 5 < 11 \\)。',
  correctAnswer: 'x>-3',
  paramsUsed: { a: -2, b: 5, rhs: 11, boundary: -3, op: '>' },
  solutionHTML: '<div>先移項，再除以 \\(-2\\)。</div><div>因為除以負數時，不等號方向要相反。</div><div style="font-size:1.05em;margin-top:5px;">\\( x > -3 \\)</div>',
  pdfText: '8. 解不等式 \\( -2x + 5 < 11 \\)。',
  answers: ['x>-3'],
  displayAnswer: 'x > -3',
  steps: '<div>先移項，再除以 \\(-2\\)。</div><div>因為除以負數時，不等號方向要相反。</div><div style="font-size:1.05em;margin-top:5px;">\\( x > -3 \\)</div>',
  checkType: 'inequality',
  answerSpec: { variable: 'x', op: '>', value: -3 },
};
for (const field of ['questionHTML', 'correctAnswer', 'paramsUsed', 'solutionHTML', 'pdfText', 'answers', 'displayAnswer', 'steps', 'checkType', 'answerSpec']) {
  check(`explicit {a:-2,b:5,boundary:-3,op:"<"} ${field} matches pre-fix output`,
    JSON.stringify(explicit[field]) === JSON.stringify(expectedExplicit[field]),
    JSON.stringify(explicit[field]));
}

let independentComparisons = 0;
let negativeAComparisons = 0;
let comboFailures = 0;
const firstFailures = [];
for (const combo of combos) {
  const result = generators.generateQuestion(def, combo);
  const q = assemble(def, result);
  const expected = independentSolve(combo);
  const canonical = expected.correctAnswer;
  const reversed = reversedEquivalent(expected.op, expected.value);
  const wrongBoundaryOp = boundaryOperatorError(expected.op, expected.value);
  const unflipped = `x${combo.op}${combo.boundary}`;

  const checks = [
    ['params a', result.paramsUsed.a === combo.a],
    ['params b', result.paramsUsed.b === combo.b],
    ['params boundary', result.paramsUsed.boundary === combo.boundary],
    ['params rhs', result.paramsUsed.rhs === expected.rhs],
    ['params final op', result.paramsUsed.op === expected.op],
    ['correctAnswer', result.correctAnswer === expected.correctAnswer],
    ['answerSpec op', result.answerSpec && result.answerSpec.op === expected.answerSpec.op],
    ['answerSpec value', result.answerSpec && result.answerSpec.value === expected.answerSpec.value],
    ['canonical accepted', validators.checkAnswer(q, canonical)],
    ['reversed equivalent accepted', validators.checkAnswer(q, reversed)],
    ['boundary operator error rejected', !validators.checkAnswer(q, wrongBoundaryOp)],
  ];
  if (combo.a < 0) {
    negativeAComparisons += 1;
    checks.push(['a<0 direction reversed', expected.op === INVERT[combo.op]]);
    checks.push(['unflipped direction rejected', !validators.checkAnswer(q, unflipped)]);
  }
  for (const [name, ok] of checks) {
    independentComparisons += 1;
    assertFine(`combo ${JSON.stringify(combo)} ${name}`, ok, JSON.stringify({ result, expected, canonical, reversed, wrongBoundaryOp, unflipped }));
    if (!ok) comboFailures += 1;
  }
  if (comboFailures > 0 && firstFailures.length < 5) firstFailures.push({ combo, result, expected });
}
check('solve_ineq all legal combos pass independent cross-checks',
  comboFailures === 0,
  JSON.stringify(firstFailures));
check('solve_ineq independent comparison count recorded', independentComparisons === 84864, String(independentComparisons));
check('solve_ineq all a < 0 combos checked for direction reversal', negativeAComparisons === 3536, String(negativeAComparisons));

const negQ = assemble(def, explicit);
check('canonical answer accepted', validators.checkAnswer(negQ, 'x>-3'));
check('equivalent reversed answer accepted', validators.checkAnswer(negQ, '-3<x'));
check('unicode >= input accepted on >= case', validators.checkAnswer(
  assemble(def, generators.generateQuestion(def, { a: 2, b: 1, boundary: 3, op: '>=' })),
  'x≥3'
));
check('direction error rejected for a < 0 case', !validators.checkAnswer(negQ, 'x<-3'));
check('boundary operator error rejected', !validators.checkAnswer(negQ, 'x>=-3'));

const seen = withSeed(0x1A2B5005, () => {
  const signatures = new Set();
  for (let i = 0; i < 30; i += 1) {
    const result = generators.generateQuestion(def, {});
    signatures.add(JSON.stringify({
      a: result.paramsUsed.a,
      b: result.paramsUsed.b,
      boundary: result.paramsUsed.boundary,
      rhs: result.paramsUsed.rhs,
      op: result.paramsUsed.op,
    }));
  }
  return signatures;
});
check('solve_ineq gets at least 5 distinct params in 30 generated samples',
  seen.size >= 5,
  `got ${seen.size}: ${Array.from(seen).join(' | ')}`);

if (failures.length) {
  console.error(`\n${failures.length} solve_ineq failure(s):`);
  failures.slice(0, 60).forEach((failure) => console.error(`- ${failure}`));
  if (failures.length > 60) console.error(`... ${failures.length - 60} more`);
  process.exit(1);
}

console.log(`\n${passed} solve_ineq checks passed.`);
console.log(`Legal combos: ${combos.length}; independent checks: ${independentComparisons}; a<0 direction checks: ${negativeAComparisons}; 30-sample distinct params: ${seen.size}.`);
