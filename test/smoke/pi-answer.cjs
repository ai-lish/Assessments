'use strict';

function formatExactPiAnswer(exactPiCoefficient, displayAnswer = '') {
  if (exactPiCoefficient === undefined || exactPiCoefficient === null) {
    return String(displayAnswer).split(' ')[0];
  }
  if (typeof exactPiCoefficient === 'object') {
    const numerator = exactPiCoefficient.numerator;
    const denominator = exactPiCoefficient.denominator;
    if (!Number.isInteger(numerator) || !Number.isInteger(denominator) || denominator === 0) {
      throw new Error('invalid rational exactPiCoefficient');
    }
    return denominator === 1 ? `${numerator}π` : `${numerator}π/${denominator}`;
  }
  return `${exactPiCoefficient}π`;
}

module.exports = { formatExactPiAnswer };
