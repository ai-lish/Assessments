const { randInt, randNZ, polyLatex, makeQuestion } = require("./shared");

function create({ difficulty, rng, content }) {
  const advanced = difficulty === "advanced";
  const forceNegative = advanced && rng() < 0.55;
  let a;
  let b;
  let c;
  let delta;
  let attempts = 0;
  do {
    a = advanced ? randInt(rng, 2, 9) : randInt(rng, 1, 4);
    b = advanced ? randNZ(rng, -15, 15) : randNZ(rng, -8, 8);
    c = advanced ? randInt(rng, -25, 25) : randInt(rng, -10, 10);
    delta = b * b - 4 * a * c;
    attempts += 1;
  } while (advanced && attempts < 50 && ((forceNegative && delta >= 0) || (!forceNegative && delta < 0)));
  const real = delta >= 0;
  const roots = real
    ? [{ real: (-b + Math.sqrt(delta)) / (2 * a), imag: 0 }, { real: (-b - Math.sqrt(delta)) / (2 * a), imag: 0 }]
    : [];
  const answer = real
    ? "\\(x\\approx " + roots.map((value) => Number(value.real.toPrecision(3))).join(",\\ ") + "\\)"
    : "\\(\\text{無實數根（Math ERROR）}\\)";
  return makeQuestion(content, {
    id: "calculator-" + a + "-" + b + "-" + c,
    difficulty,
    params: { a, b, c, delta },
    instruction: content.instruction,
    expression: polyLatex(a, b, c) + "=0",
    steps: [content.steps[0], { ...content.steps[1], hint: real ? "例如：2.35 或 -0.683" : "請輸入：無實根" }],
    answer,
    solution: [
      "判別式：\\(\\Delta=" + delta + "\\)，" + (real ? "有實根。" : "沒有實根。"),
      real ? "計算機讀數：\\(x\\approx " + roots.map((value) => Number(value.real.toPrecision(3))).join(",\\ ") + "\\)。" : "計算機顯示 Math ERROR，故無實數根。"
    ],
    checker: {
      type: "calculator",
      steps: [
        { kind: "numeric", expected: delta, reason: "判別式應為 " + delta + "。" },
        real ? { kind: "roots", expected: roots, exact: false } : { kind: "no-real" }
      ]
    }
  });
}

module.exports = { create };
