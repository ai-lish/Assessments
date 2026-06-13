const CONTRACTS = new Map([
  [
    "p2:2012Q05",
    {
      answer(values) {
        return formatFraction(Number(values.b) - 2 * Number(values.a), 5);
      },
    },
  ],
]);

function greatestCommonDivisor(left, right) {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

export function formatFraction(numerator, denominator) {
  const sign = denominator < 0 ? -1 : 1;
  const divisor = greatestCommonDivisor(numerator, denominator);
  const top = (numerator * sign) / divisor;
  const bottom = Math.abs(denominator) / divisor;
  return bottom === 1 ? String(top) : `${top}/${bottom}`;
}

export function normalizeMimicAnswer(value) {
  return String(value ?? "").trim().replaceAll(" ", "");
}

export function getVerifiedAnswer(templateId, values) {
  const contract = CONTRACTS.get(templateId);
  if (!contract) return null;
  return contract.answer(values);
}

export function gradeMimicAnswer(studentAnswer, expectedAnswer, verified) {
  if (!verified || !expectedAnswer) {
    return {
      correct: false,
      gradeable: false,
      status: "unavailable",
    };
  }
  const normalized = normalizeMimicAnswer(studentAnswer);
  if (!normalized) {
    return {
      correct: false,
      gradeable: false,
      status: "unanswered",
    };
  }
  const correct = normalized === normalizeMimicAnswer(expectedAnswer);
  return {
    correct,
    gradeable: true,
    status: correct ? "correct" : "wrong",
  };
}

export function seededVariationIndex(seed, templateId, length) {
  if (!Number.isInteger(length) || length < 1) return null;
  let hash = 2166136261;
  for (const character of `${seed}:${templateId}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % length;
}
