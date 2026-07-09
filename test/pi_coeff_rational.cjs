#!/usr/bin/env node
'use strict';

const generators = require('../tool/generators.js');
const validators = require('../tool/validators.js');

const R_SOLID = [2, 3, 4, 5, 6];
const H_SOLID = [4, 5, 6, 7, 8, 9, 10, 12];
const R_SECTOR = [3, 4, 5, 6, 8, 9, 10, 12];
const ANGLES = [30, 45, 60, 90, 120, 135, 150, 180];
const ASKS = ['area', 'arc'];

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

function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a || 1;
}

function rational(n, d) {
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}

function expectedSolidCoeff(type, r, h) {
  if (type === 'sphere') return rational(4 * r * r * r, 3);
  if (type === 'hemisphere') return rational(2 * r * r * r, 3);
  if (type === 'cylinder') return rational(r * r * h, 1);
  return rational(r * r * h, 3);
}

function expectedSectorCoeff(r, angle, ask) {
  if (ask === 'arc') return rational(2 * r * angle, 360);
  return rational(r * r * angle, 360);
}

function expectedDisplay(coeff) {
  if (coeff.d === 1) return `${coeff.n}π`;
  return `\\frac{${coeff.n}}{${coeff.d}}\\pi`;
}

function expectedInput(coeff) {
  if (coeff.d === 1) return `${coeff.n}π`;
  return `${coeff.n}π/${coeff.d}`;
}

function expectedParam(coeff) {
  if (coeff.d === 1) return coeff.n;
  return `${coeff.n}/${coeff.d}`;
}

function roundedDecimal(coeff) {
  const value = (coeff.n / coeff.d) * Math.PI;
  return (Math.round(value * 1000) / 1000).toString();
}

function hasLongDecimalPi(value) {
  return /\d+\.\d{7,}\s*(?:π|\\pi)/.test(String(value));
}

function assemble(result) {
  return {
    validator: 'unitNumeric',
    checkType: 'unitNumeric',
    correctAnswer: result.correctAnswer,
    answers: result.answers,
    answerSpec: result.answerSpec,
  };
}

function assertRationalResult(label, result, coeff) {
  const display = expectedDisplay(coeff);
  const input = expectedInput(coeff);
  const param = expectedParam(coeff);
  const decimal = roundedDecimal(coeff);
  const piText = [result.displayAnswer, result.solutionHTML, result.answers[1]].join(' | ');

  check(`${label} display has exact rational pi form`,
    result.displayAnswer.includes(display),
    result.displayAnswer);
  check(`${label} answer pi input uses validator-supported rational form`,
    result.answers[1] === input,
    JSON.stringify(result.answers));
  check(`${label} paramsUsed piCoeff has no JS float noise`,
    result.paramsUsed.piCoeff === param,
    JSON.stringify(result.paramsUsed));
  check(`${label} answerSpec stores exact rational coefficient`,
    coeff.d === 1
      ? result.answerSpec.exactPiCoefficient === coeff.n
      : result.answerSpec.exactPiCoefficient
        && result.answerSpec.exactPiCoefficient.numerator === coeff.n
        && result.answerSpec.exactPiCoefficient.denominator === coeff.d,
    JSON.stringify(result.answerSpec));
  check(`${label} pi form has no long decimal noise`,
    !hasLongDecimalPi(piText),
    piText);
  check(`${label} decimal equals rounded exact rational times pi`,
    result.correctAnswer === decimal && result.paramsUsed.decimal === decimal,
    `expected=${decimal} actual=${result.correctAnswer}`);
  check(`${label} unitNumeric accepts generated pi input`,
    validators.checkAnswer(assemble(result), result.answers[1]),
    result.answers[1]);
}

console.log('=== Rational pi coefficient contract ===');

let solidTotal = 0;
let solidNonInteger = 0;
const solidTypes = ['sphere', 'hemisphere', 'cylinder', 'cone'];
for (const type of solidTypes) {
  const hValues = type === 'sphere' || type === 'hemisphere' ? [8] : H_SOLID;
  let nonIntegerForType = 0;
  for (const r of R_SOLID) {
    for (const h of hValues) {
      solidTotal += 1;
      const result = generators.generators.solid_mensuration({ solidType: type, r, h });
      const coeff = expectedSolidCoeff(type, r, h);
      if (coeff.d !== 1) {
        solidNonInteger += 1;
        nonIntegerForType += 1;
      }
      assertRationalResult(`solid_${type} r=${r} h=${h}`, result, coeff);
    }
  }
  const expectedNonInteger = { sphere: 3, hemisphere: 3, cylinder: 0, cone: 15 }[type];
  check(`${type} non-integer pi coefficient count = ${expectedNonInteger}`,
    nonIntegerForType === expectedNonInteger,
    String(nonIntegerForType));
}
check('solid_mensuration enumerates 90 combos including hemisphere',
  solidTotal === 90,
  String(solidTotal));
check('solid_mensuration non-integer pi coefficient count = 21',
  solidNonInteger === 21,
  String(solidNonInteger));

let sectorTotal = 0;
let sectorNonInteger = 0;
for (const r of R_SECTOR) {
  for (const angle of ANGLES) {
    for (const ask of ASKS) {
      sectorTotal += 1;
      const result = generators.generators.sector_measure({ r, angle, ask });
      const coeff = expectedSectorCoeff(r, angle, ask);
      if (coeff.d !== 1) sectorNonInteger += 1;
      assertRationalResult(`sector r=${r} angle=${angle} ask=${ask}`, result, coeff);
    }
  }
}
check('sector_measure enumerates 128 combos',
  sectorTotal === 128,
  String(sectorTotal));
check('sector_measure non-integer pi coefficient count = 71',
  sectorNonInteger === 71,
  String(sectorNonInteger));

const knownCone = generators.generators.solid_mensuration({ solidType: 'cone', r: 4, h: 8 });
check('known cone {r:4,h:8} displays \\frac{128}{3}\\pi',
  knownCone.displayAnswer.includes('\\frac{128}{3}\\pi') && knownCone.answers[1] === '128π/3',
  JSON.stringify({ displayAnswer: knownCone.displayAnswer, answers: knownCone.answers }));

const knownArc = generators.generators.sector_measure({ r: 10, angle: 120, ask: 'arc' });
check('known sector arc {r:10,angle:120} displays \\frac{20}{3}\\pi',
  knownArc.displayAnswer.includes('\\frac{20}{3}\\pi') && knownArc.answers[1] === '20π/3',
  JSON.stringify({ displayAnswer: knownArc.displayAnswer, answers: knownArc.answers }));

if (failures.length) {
  console.error(`\n${failures.length} rational pi coefficient failure(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`\n${passed} rational pi coefficient checks passed.`);
