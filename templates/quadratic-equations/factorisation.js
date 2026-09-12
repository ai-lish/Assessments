const {
  gcd3,
  randInt,
  randNZ,
  signed,
  polyLatex,
  fracText,
  makeQuestion
} = require("./shared");

function create({ difficulty, rng, content }) {
  const advanced = difficulty === "advanced";
  let a;
  let b;
  let d;
  let A;
  let B;
  let C;
  let attempts = 0;
  do {
    a = advanced ? randInt(rng, 2, 3) : 1;
    b = randNZ(rng, -5, 5);
    d = randNZ(rng, -5, 5);
    A = a;
    B = a * d + b;
    C = b * d;
    attempts += 1;
  } while ((b === a * d || (advanced && gcd3(A, B, C) > 1)) && attempts < 200);
  if (b === a * d || (advanced && gcd3(A, B, C) > 1)) {
    a = advanced ? 2 : 1;
    b = advanced ? 1 : 2;
    d = advanced ? 2 : -3;
    A = a;
    B = a * d + b;
    C = b * d;
  }
  const expected = [{ real: -b / a, imag: 0 }, { real: -d, imag: 0 }];
  const factor = "(" + (a === 1 ? "x" : a + "x") + signed(b) + ")(" + "x" + signed(d) + ")=0";
  return makeQuestion(content, {
    id: "factor-" + a + "-" + b + "-" + d,
    difficulty,
    params: { a, b, d, A, B, C },
    instruction: content.instruction,
    expression: polyLatex(A, B, C) + "=0",
    steps: [content.steps[0], { ...content.steps[1], hint: advanced ? "例如：-1/2 或 3" : "例如：-0.5 或 3" }],
    answer: "\\(x=" + fracText(-b, a) + "\\text{ 或 }x=" + (-d) + "\\)",
    solution: [
      "因式分解：\\(" + factor + "\\)。",
      "由零乘積性質：\\(x=" + fracText(-b, a) + "\\text{ 或 }x=" + (-d) + "\\)。"
    ],
    checker: {
      type: "factorisation",
      steps: [
        { kind: "factor", expected: { a: A, b: B, c: C } },
        { kind: "roots", expected, exact: advanced }
      ]
    }
  });
}

module.exports = { create };
