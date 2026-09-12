const {
  gcd3,
  randInt,
  randNZ,
  signed,
  linearLatex,
  polyLatex,
  makeQuestion
} = require("./shared");

function create({ difficulty, rng, content }) {
  const advanced = difficulty === "advanced";
  let expression;
  let rawA;
  let rawB;
  let rawC;
  const steps = [];
  if (!advanced) {
    const p = randNZ(rng, -6, 6);
    const q = randNZ(rng, -6, 6);
    const k = randInt(rng, -9, 9);
    rawA = 1;
    rawB = p + q;
    rawC = p * q - k;
    expression = "\\left(" + linearLatex(p) + "\\right)\\left(" + linearLatex(q) + "\\right)=" + k;
    steps.push("展開：\\(" + linearLatex(p) + "\\cdot" + linearLatex(q) + "=" + polyLatex(1, p + q, p * q) + "=" + k + "\\)。");
  } else {
    const type = randInt(rng, 1, 3);
    if (type === 1) {
      const m1 = randInt(rng, 2, 3);
      const n1 = randNZ(rng, -5, 5);
      const m2 = randInt(rng, 2, 3);
      const n2 = randNZ(rng, -5, 5);
      const k = randInt(rng, -15, 15);
      const f1 = (m1 === 1 ? "x" : m1 + "x") + signed(n1);
      const f2 = (m2 === 1 ? "x" : m2 + "x") + signed(n2);
      rawA = m1 * m2;
      rawB = m1 * n2 + n1 * m2;
      rawC = n1 * n2 - k;
      expression = "\\left(" + f1 + "\\right)\\left(" + f2 + "\\right)=" + k;
      steps.push("展開左方：\\(" + polyLatex(rawA, rawB, n1 * n2) + "=" + k + "\\)。");
    } else if (type === 2) {
      const m = 2;
      const n1 = randNZ(rng, -4, 4);
      const n2 = randNZ(rng, -4, 4);
      const k = randInt(rng, -10, 10);
      const f1 = m + "x" + signed(n1);
      const f2 = "x" + signed(n2);
      rawA = m * m - 1;
      rawB = 2 * m * n1 - 2 * n2;
      rawC = n1 * n1 - n2 * n2 - k;
      expression = "\\left(" + f1 + "\\right)^2=\\left(" + f2 + "\\right)^2" + signed(k);
      steps.push("展開兩邊平方式：\\(" + polyLatex(m * m, 2 * m * n1, n1 * n1) + "=" + polyLatex(1, 2 * n2, n2 * n2) + signed(k) + "\\)。");
    } else {
      const m = randInt(rng, 2, 4);
      const p = randNZ(rng, -5, 5);
      const q = randNZ(rng, -5, 5);
      const k = randInt(rng, -12, 12);
      const f = "x" + signed(p);
      const g = "x" + signed(q);
      rawA = m;
      rawB = m * p - 1;
      rawC = -q - k;
      expression = m + "x\\left(" + f + "\\right)-\\left(" + g + "\\right)=" + k;
      steps.push("展開並整理同類項：\\(" + polyLatex(rawA, rawB, -q) + "=" + k + "\\)。");
    }
  }
  const common = gcd3(rawA, rawB, rawC);
  let a = rawA / common;
  let b = rawB / common;
  let c = rawC / common;
  if (a < 0) {
    a = -a;
    b = -b;
    c = -c;
  }
  if (common > 1) {
    steps.push("移項後：\\(" + polyLatex(rawA, rawB, rawC) + "=0\\)。");
    steps.push("全式同除公因數 " + common + "：\\(" + polyLatex(a, b, c) + "=0\\)。");
  } else {
    steps.push("移項並化簡：\\(" + polyLatex(a, b, c) + "=0\\)。");
  }
  const answer = "\\(" + polyLatex(a, b, c) + "=0\\)";
  return makeQuestion(content, {
    id: "expand-" + a + "-" + b + "-" + c,
    difficulty,
    params: { a, b, c, common },
    instruction: content.instruction,
    expression,
    steps: content.steps.slice(),
    answer,
    solution: steps,
    checker: {
      type: "expand",
      steps: [{ kind: "polynomial", expected: { a, b, c }, reason: "請展開、移項並約至最簡：\\(" + polyLatex(a, b, c) + "=0\\)。" }]
    }
  });
}

module.exports = { create };
