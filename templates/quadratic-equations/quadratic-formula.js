const {
  randInt,
  randNZ,
  polyLatex,
  exactOrNumericRoots,
  exactRootPairLatex,
  makeQuestion
} = require("./shared");

function create({ difficulty, rng, content }) {
  const advanced = difficulty === "advanced";
  let a;
  let b;
  let c;
  let delta;
  if (!advanced) {
    do {
      a = randInt(rng, 1, 3);
      b = randNZ(rng, -7, 7);
      c = randNZ(rng, -8, 8);
      delta = b * b - 4 * a * c;
    } while (delta < 0);
  } else if (rng() < 0.4) {
    do {
      a = randInt(rng, 1, 3);
      b = randNZ(rng, -6, 6);
      c = randInt(rng, 1, 8);
      delta = b * b - 4 * a * c;
    } while (delta >= 0);
  } else {
    do {
      a = randInt(rng, 1, 3);
      b = randNZ(rng, -7, 7);
      c = randNZ(rng, -8, 8);
      delta = b * b - 4 * a * c;
    } while (delta < 0);
  }
  const expected = exactOrNumericRoots(a, b, c, advanced);
  const answer = advanced ? exactRootPairLatex(a, b, c) : expected.map((value) => Number(value.real.toPrecision(3))).join("\\, ");
  return makeQuestion(content, {
    id: "formula-" + a + "-" + b + "-" + c,
    difficulty,
    params: { a, b, c, delta },
    instruction: content.instruction,
    expression: polyLatex(a, b, c) + "=0",
    steps: [content.steps[0], { ...content.steps[1], hint: advanced ? "例如：-1+i 或 -1-i" : "例如：2.35 或 -0.683" }],
    answer: "\\(x=" + answer + "\\)",
    solution: [
      "判別式：\\(\\Delta=(" + b + ")^2-4(" + a + ")(" + c + ")=" + delta + "\\)。",
      "代入公式：\\(x=\\frac{-b\\pm\\sqrt{\\Delta}}{2a}\\)，所以 \\(x=" + answer + "\\)。"
    ],
    checker: {
      type: "quadratic-formula",
      steps: [
        { kind: "numeric", expected: delta, reason: "\\(\\Delta=b^2-4ac=" + delta + "\\)。" },
        { kind: "roots", expected, exact: advanced }
      ]
    }
  });
}

module.exports = { create };
