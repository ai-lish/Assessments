const {
  randInt,
  randNZ,
  sqrtParts,
  linearLatex,
  makeQuestion
} = require("./shared");

function create({ difficulty, rng, content }) {
  const p = randNZ(rng, -6, 6);
  const advanced = difficulty === "advanced";
  const k = advanced ? [8, 12, 18, 20, 24, 27, 32, 40, 48, 50][randInt(rng, 0, 9)] : Math.pow(randInt(rng, 2, 8), 2);
  const parts = sqrtParts(k);
  const root = Math.sqrt(k);
  const rootDisplay = advanced ? "\\sqrt{" + k + "}" : String(root);
  const expected = [{ real: -p + root, imag: 0 }, { real: -p - root, imag: 0 }];
  const acceptedRight = [String(root), "sqrt(" + k + ")", parts.outside + "sqrt(" + parts.inside + ")"];
  const stepHint = advanced ? "例如：-2+2sqrt(3) 或 -2-2sqrt(3)" : "例如：2 或 -6";
  const renderedRoot = advanced
    ? (parts.outside === 1 ? "" : " " + parts.outside) + "\\sqrt{" + parts.inside + "}"
    : String(root);
  const answer = "\\(x=" + (-p) + "\\pm " + renderedRoot + "\\)";
  return makeQuestion(content, {
    id: "sqrt-" + p + "-" + k,
    difficulty,
    params: { p, k, outside: parts.outside, inside: parts.inside },
    instruction: content.instruction,
    expression: "\\left(" + linearLatex(p) + "\\right)^2=" + k,
    steps: [content.steps[0], { ...content.steps[1], hint: stepHint }],
    answer,
    solution: [
      "兩邊取平方根：\\(" + linearLatex(p) + "=\\pm " + rootDisplay + "\\)。",
      "解得：\\(x=" + (-p) + "\\pm " + (advanced ? (parts.outside === 1 ? "" : " " + parts.outside) + "\\sqrt{" + parts.inside + "}" : root) + "\\)。"
    ],
    checker: {
      type: "square-root",
      steps: [
        { kind: "sqrt-step", p, acceptedRight, rootDisplay },
        { kind: "roots", expected, exact: advanced }
      ]
    }
  });
}

module.exports = { create };
