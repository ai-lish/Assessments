function gcd(a, b) {
  a = Math.abs(Math.trunc(a));
  b = Math.abs(Math.trunc(b));
  while (b) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a || 1;
}

function gcd3(a, b, c) {
  return gcd(gcd(a, b), c);
}

function randInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function randNZ(rng, min, max) {
  let n = 0;
  while (!n) n = randInt(rng, min, max);
  return n;
}

function reduce(n, d) {
  if (d === 0) return { n: 0, d: 1 };
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}

function signed(n) {
  return n < 0 ? "-" + Math.abs(n) : "+" + n;
}

function linearLatex(p) {
  return "x" + (p === 0 ? "" : signed(p));
}

function termLatex(coef, power) {
  const variable = power === 2 ? "x^2" : power === 1 ? "x" : "";
  const abs = Math.abs(coef);
  const body = power === 0 ? String(abs) : abs === 1 ? variable : String(abs) + variable;
  return { sign: coef < 0 ? "-" : "+", body };
}

function polyLatex(a, b, c) {
  const terms = [termLatex(a, 2), termLatex(b, 1), termLatex(c, 0)].filter((term) => term.body !== "0");
  if (!terms.length) return "0";
  return terms.map((term, index) => (index === 0 ? (term.sign === "-" ? "-" : "") : term.sign) + term.body).join("");
}

function fracText(n, d) {
  const value = reduce(n, d);
  return value.d === 1 ? String(value.n) : "\\frac{" + value.n + "}{" + value.d + "}";
}

function sqrtParts(n) {
  let inside = n;
  let outside = 1;
  for (let i = 2; i * i <= inside; i += 1) {
    while (inside % (i * i) === 0) {
      inside /= i * i;
      outside *= i;
    }
  }
  return { outside, inside };
}

function normalizeRaw(raw) {
  return String(raw || "").replace(/[\s，；;]/g, "").replace(/−/g, "-").replace(/²/g, "^2").replace(/√/g, "sqrt");
}

function parsePolynomial(input) {
  const raw = normalizeRaw(input).toLowerCase();
  const parts = raw.split("=");
  if (parts.length !== 2 || parts[1] !== "0") return null;
  let lhs = parts[0];
  if (!lhs) return null;
  if (lhs[0] !== "+" && lhs[0] !== "-") lhs = "+" + lhs;
  if (/[()]/.test(lhs)) return null;
  const terms = lhs.match(/[+-][^+-]+/g);
  if (!terms || terms.join("") !== lhs) return null;
  let a = 0;
  let b = 0;
  let c = 0;
  for (const term of terms) {
    const sign = term[0] === "-" ? -1 : 1;
    const body = term.slice(1);
    if (!body) return null;
    if (body.includes("x^2")) {
      const coefficient = body.replace("x^2", "");
      if (!/^[0-9]+$/.test(coefficient) && coefficient !== "") return null;
      a += sign * (coefficient === "" ? 1 : Number(coefficient));
    } else if (body.includes("x")) {
      const coefficient = body.replace("x", "");
      if (coefficient.includes("^") || (!/^[0-9]+$/.test(coefficient) && coefficient !== "")) return null;
      b += sign * (coefficient === "" ? 1 : Number(coefficient));
    } else {
      if (!/^[0-9]+$/.test(body)) return null;
      c += sign * Number(body);
    }
  }
  if (!a) return null;
  return { a, b, c };
}

function canonicalPolynomial(value) {
  if (!value || !value.a) return null;
  let { a, b, c } = value;
  const g = gcd3(a, b, c);
  a /= g;
  b /= g;
  c /= g;
  if (a < 0) {
    a = -a;
    b = -b;
    c = -c;
  }
  return { a, b, c };
}

function samePolynomial(left, right) {
  const a = canonicalPolynomial(left);
  const b = canonicalPolynomial(right);
  return !!a && !!b && a.a === b.a && a.b === b.b && a.c === b.c;
}

function parseLinear(input) {
  let raw = normalizeRaw(input);
  if (raw[0] !== "+" && raw[0] !== "-") raw = "+" + raw;
  const terms = raw.match(/[+-][^+-]+/g);
  if (!terms || terms.join("") !== raw) return null;
  let m = 0;
  let n = 0;
  for (const term of terms) {
    const sign = term[0] === "-" ? -1 : 1;
    const body = term.slice(1);
    if (!body) return null;
    if (body.includes("x")) {
      const coefficient = body.replace("x", "");
      if (!/^[0-9]*$/.test(coefficient)) return null;
      m += sign * (coefficient === "" ? 1 : Number(coefficient));
    } else {
      if (!/^[0-9]+$/.test(body)) return null;
      n += sign * Number(body);
    }
  }
  return { m, n };
}

function parseFactor(input) {
  const raw = normalizeRaw(input);
  const parts = raw.split("=");
  if (parts.length !== 2 || parts[1] !== "0") return null;
  const match = parts[0].match(/^\(([^()]+)\)\(([^()]+)\)$/);
  if (!match) return null;
  const f1 = parseLinear(match[1]);
  const f2 = parseLinear(match[2]);
  if (!f1 || !f2 || !f1.m || !f2.m) return null;
  return { a: f1.m * f2.m, b: f1.m * f2.n + f1.n * f2.m, c: f1.n * f2.n };
}

function parseNumeric(input) {
  const raw = normalizeRaw(input).replace(/^x=/, "");
  if (!raw || !/^[+-]?[0-9]+(?:\/[+-]?[0-9]+)?$/.test(raw)) return null;
  const parts = raw.split("/");
  if (parts.length === 1) return Number(parts[0]);
  if (Number(parts[1]) === 0) return null;
  return Number(parts[0]) / Number(parts[1]);
}

function parseExpression(input) {
  let source = normalizeRaw(input).replace(/^x=/, "").replace(/sqrt/g, "S");
  let index = 0;
  function peek() { return source[index] || ""; }
  function eat(value) {
    if (source.slice(index, index + value.length) === value) {
      index += value.length;
      return true;
    }
    return false;
  }
  function factor() {
    if (eat("+")) return factor();
    if (eat("-")) return -factor();
    if (eat("(")) {
      const value = expression();
      if (!eat(")")) throw new Error("missing closing parenthesis");
      return value;
    }
    if (eat("S")) {
      if (!eat("(")) throw new Error("missing square-root parenthesis");
      const value = expression();
      if (!eat(")") || value < 0) throw new Error("invalid square root");
      return Math.sqrt(value);
    }
    const match = source.slice(index).match(/^\d+(?:\.\d+)?/);
    if (!match) throw new Error("number expected");
    index += match[0].length;
    return Number(match[0]);
  }
  function term() {
    let value = factor();
    while (true) {
      if (eat("*")) value *= factor();
      else if (eat("/")) {
        const denominator = factor();
        if (denominator === 0) throw new Error("division by zero");
        value /= denominator;
      } else if (peek() === "(" || peek() === "S" || /[0-9]/.test(peek())) value *= factor();
      else break;
    }
    return value;
  }
  function expression() {
    let value = term();
    while (true) {
      if (eat("+")) value += term();
      else if (eat("-")) value -= term();
      else break;
    }
    return value;
  }
  try {
    const value = expression();
    return index === source.length && Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function answerTokens(input) {
  const raw = String(input || "").trim().replace(/＝/g, "=").replace(/^x\s*=\s*/i, "");
  const marker = raw.match(/(\+\-|±|pm)/i);
  if (marker) {
    const before = raw.slice(0, marker.index);
    const after = raw.slice(marker.index + marker[0].length);
    return [before + "+" + after, before + "-" + after];
  }
  return raw.split(/[,，;；|]|\s+或\s+|\bor\b/i).map((value) => value.trim()).filter(Boolean);
}

function parseComplex(input) {
  let raw = normalizeRaw(input);
  if (!raw) return null;
  if (raw.includes("/")) {
    const parts = raw.split("/");
    if (parts.length !== 2) return null;
    const denominator = parseExpression(parts[1]);
    if (!denominator || denominator === 0) return null;
    raw = parts[0];
    while (raw[0] === "(" && raw[raw.length - 1] === ")") raw = raw.slice(1, -1);
    const value = parseComplex(raw);
    return value ? { real: value.real / denominator, imag: value.imag / denominator } : null;
  }
  const iAt = raw.indexOf("i");
  if (iAt < 0) {
    const real = parseExpression(raw);
    return real == null ? null : { real, imag: 0 };
  }
  if (raw.lastIndexOf("i") !== iAt) return null;
  const before = raw.slice(0, iAt);
  let split = -1;
  for (let i = 1; i < before.length; i += 1) if (before[i] === "+" || before[i] === "-") split = i;
  const realPart = split < 0 ? "" : before.slice(0, split);
  const imagPart = split < 0 ? before : before.slice(split);
  const real = realPart ? parseExpression(realPart) : 0;
  const imag = imagPart === "" || imagPart === "+" ? 1 : imagPart === "-" ? -1 : parseExpression(imagPart);
  return real == null || imag == null ? null : { real, imag };
}

function stripOuterParentheses(value) {
  let raw = value;
  while (raw[0] === "(" && raw[raw.length - 1] === ")") {
    let depth = 0;
    let wraps = true;
    for (let i = 0; i < raw.length; i += 1) {
      if (raw[i] === "(") depth += 1;
      else if (raw[i] === ")") depth -= 1;
      if (depth === 0 && i < raw.length - 1) {
        wraps = false;
        break;
      }
    }
    if (!wraps) break;
    raw = raw.slice(1, -1);
  }
  return raw;
}

function exactIntegerCoefficients(value) {
  let raw = stripOuterParentheses(normalizeRaw(value)).replace(/sqrt\(\d+\)/g, "R").replace(/i/g, "");
  if (!raw) return null;
  if (raw[0] !== "+" && raw[0] !== "-") raw = "+" + raw;
  const terms = raw.match(/[+-][^+-]+/g);
  if (!terms || terms.join("") !== raw) return null;
  const coefficients = [];
  for (const term of terms) {
    const body = term.slice(1);
    const numberMatch = body.match(/^(\d+)(?:R)?$/);
    if (numberMatch) {
      coefficients.push(Number(numberMatch[1]));
      continue;
    }
    if (body === "R") {
      coefficients.push(1);
      continue;
    }
    return null;
  }
  return coefficients;
}

function exactFractionIssue(token) {
  const raw = normalizeRaw(token);
  if (!raw.includes("/")) return null;
  const parts = raw.split("/");
  if (parts.length !== 2) return "進階分數格式不正確。";
  const denominator = stripOuterParentheses(parts[1]);
  if (denominator.includes("sqrt")) return "分母含有根號，請先有理化。";
  if (!/^[+-]?\d+$/.test(denominator)) return null;
  const coefficients = exactIntegerCoefficients(parts[0]);
  const denominatorValue = Math.abs(Number(denominator));
  if (!coefficients || !Number.isSafeInteger(denominatorValue)) return null;
  const common = coefficients.reduce((value, coefficient) => gcd(value, coefficient), denominatorValue);
  return common > 1 ? "分數未約至最簡，分子與分母必須互質。" : null;
}

function closeEnough(a, b) {
  return Math.abs(a - b) < 0.005 || Math.abs(a - b) / Math.max(1, Math.abs(b)) < 0.01;
}

function checkRoots(input, expected, exact) {
  const tokens = answerTokens(input);
  const repeated = expected.length === 2 && closeEnough(expected[0].real, expected[1].real) && closeEnough(expected[0].imag, expected[1].imag);
  if (tokens.length !== expected.length && !(repeated && tokens.length === 1)) {
    return { correct: false, reason: repeated ? "重根只需輸入一個解；亦可輸入兩次相同的解。" : "請輸入 " + expected.length + " 個根，並以「或」或逗號分隔。" };
  }
  if (exact) {
    for (const token of tokens) {
      const fractionIssue = exactFractionIssue(token);
      if (fractionIssue) return { correct: false, reason: fractionIssue };
    }
  }
  const values = tokens.map(parseComplex);
  if (values.some((value) => !value)) return { correct: false, reason: "格式不完整；可輸入整數、分數、根式或複數。" };
  if (exact && tokens.some((token) => /[.]/.test(token))) return { correct: false, reason: "進階題請保留最簡準確值，不要改用小數。" };
  if (exact && tokens.some((token) => /sqrt\((\d+)\)/i.test(token) && sqrtParts(Number(token.match(/sqrt\((\d+)\)/i)[1])).outside > 1)) {
    return { correct: false, reason: "根式未化至最簡，請先提出根號內的平方因數。" };
  }
  if (repeated && values.length === 1) {
    return closeEnough(values[0].real, expected[0].real) && closeEnough(values[0].imag, expected[0].imag)
      ? { correct: true }
      : { correct: false, reason: "重根的數值不正確。" };
  }
  const used = new Set();
  for (const value of values) {
    let found = -1;
    for (let i = 0; i < expected.length; i += 1) {
      if (used.has(i)) continue;
      if (closeEnough(value.real, expected[i].real) && closeEnough(value.imag, expected[i].imag)) {
        found = i;
        break;
      }
    }
    if (found < 0) return { correct: false, reason: "根的數值或正負號不正確。" };
    used.add(found);
  }
  return { correct: true };
}

function canonicalComplexRoot(a, b, c, sign) {
  const delta = b * b - 4 * a * c;
  if (delta >= 0) return null;
  const parts = sqrtParts(-delta);
  const denominator = 2 * a;
  const common = gcd(gcd(Math.abs(b), parts.outside), denominator);
  return {
    p: -b / common,
    u: 0,
    v: sign * parts.outside / common,
    w: parts.inside,
    s: denominator / common,
    isComplex: true
  };
}

function canonicalComplexValue(root) {
  return { real: root.p / root.s, imag: (root.u + root.v * Math.sqrt(root.w)) / root.s };
}

function complexRadicalLatex(root) {
  const coefficient = Math.abs(root.v);
  return root.w === 1 ? String(coefficient) : (coefficient === 1 ? "" : String(coefficient)) + "\\sqrt{" + root.w + "}";
}

function exactOrNumericRoots(a, b, c, exact) {
  const delta = b * b - 4 * a * c;
  if (delta < 0) {
    return [canonicalComplexValue(canonicalComplexRoot(a, b, c, 1)), canonicalComplexValue(canonicalComplexRoot(a, b, c, -1))];
  }
  if (exact && delta > 0) {
    const parts = sqrtParts(delta);
    return [
      { real: (-b + parts.outside * Math.sqrt(parts.inside)) / (2 * a), imag: 0 },
      { real: (-b - parts.outside * Math.sqrt(parts.inside)) / (2 * a), imag: 0 }
    ];
  }
  return [{ real: (-b + Math.sqrt(delta)) / (2 * a), imag: 0 }, { real: (-b - Math.sqrt(delta)) / (2 * a), imag: 0 }];
}

function exactRootPairLatex(a, b, c) {
  const delta = b * b - 4 * a * c;
  const denominator = 2 * a;
  if (delta === 0) return fracText(-b, denominator);
  if (delta < 0) {
    const root = canonicalComplexRoot(a, b, c, 1);
    const radical = complexRadicalLatex(root) + "i";
    if (root.s === 1) return (root.p === 0 ? "\\pm " : String(root.p) + "\\pm ") + radical;
    return "\\frac{" + root.p + "\\pm " + radical + "}{" + root.s + "}";
  }
  const parts = sqrtParts(Math.abs(delta));
  if (parts.inside === 1) return fracText(-b + parts.outside, denominator) + "\\text{ 或 }" + fracText(-b - parts.outside, denominator);
  const common = gcd(gcd(Math.abs(b), parts.outside), denominator);
  const numerator = -b / common;
  const radicalCoefficient = parts.outside / common;
  const reducedDenominator = denominator / common;
  const radical = (radicalCoefficient === 1 ? "" : " " + radicalCoefficient) + "\\sqrt{" + parts.inside + "}";
  return "\\frac{" + numerator + "\\pm " + radical + "}{" + reducedDenominator + "}";
}

function exactRootInputs(a, b, c) {
  const delta = b * b - 4 * a * c;
  const denominator = 2 * a;
  if (delta === 0) return [String(reduce(-b, denominator).n) + (reduce(-b, denominator).d === 1 ? "" : "/" + reduce(-b, denominator).d)];
  if (delta < 0) {
    const root = canonicalComplexRoot(a, b, c, 1);
    const radical = (Math.abs(root.v) === 1 ? "" : String(Math.abs(root.v))) + "sqrt(" + root.w + ")";
    if (root.s === 1) return [root.p + "+" + radical + "i", root.p + "-" + radical + "i"];
    return ["(" + root.p + "+" + radical + "i)/" + root.s, "(" + root.p + "-" + radical + "i)/" + root.s];
  }
  const parts = sqrtParts(delta);
  if (parts.inside === 1) {
    const plus = reduce(-b + parts.outside, denominator);
    const minus = reduce(-b - parts.outside, denominator);
    return [plus.n + (plus.d === 1 ? "" : "/" + plus.d), minus.n + (minus.d === 1 ? "" : "/" + minus.d)];
  }
  const common = gcd(gcd(Math.abs(b), parts.outside), denominator);
  const numerator = -b / common;
  const radicalCoefficient = parts.outside / common;
  const radical = (radicalCoefficient === 1 ? "" : String(radicalCoefficient)) + "sqrt(" + parts.inside + ")";
  return ["(" + numerator + "+" + radical + ")/" + (denominator / common), "(" + numerator + "-" + radical + ")/" + (denominator / common)];
}

function checkSpec(spec, input) {
  if (spec.kind === "polynomial") {
    return samePolynomial(parsePolynomial(input), spec.expected)
      ? { correct: true }
      : { correct: false, reason: spec.reason || "請展開、移項並約至最簡。" };
  }
  if (spec.kind === "factor") {
    const parsed = parseFactor(input);
    const expected = spec.expected;
    return parsed && expected && parsed.a === expected.a && parsed.b === expected.b && parsed.c === expected.c
      ? { correct: true }
      : { correct: false, reason: "兩括號展開後必須等於原方程。" };
  }
  if (spec.kind === "numeric") {
    return parseNumeric(input) === spec.expected ? { correct: true } : { correct: false, reason: spec.reason || "數值不正確。" };
  }
  if (spec.kind === "roots") return checkRoots(input, spec.expected, !!spec.exact);
  if (spec.kind === "sqrt-step") {
    const raw = normalizeRaw(input).replace(/＝/g, "=");
    const parts = raw.split("=");
    if (parts.length !== 2) return { correct: false, reason: "步驟必須包含等號。" };
    const left = parseLinear(parts[0]);
    const right = parts[1].replace(/^\+\-|^±|^pm/i, "");
    if (!left || left.m !== 1 || left.n !== spec.p) return { correct: false, reason: "左方應為 " + linearLatex(spec.p) + "。" };
    if (!/^\+\-|^±|^pm/i.test(parts[1])) return { correct: false, reason: "取平方根時右方必須保留 ±。" };
    return spec.acceptedRight.includes(right) ? { correct: true } : { correct: false, reason: "右方應為 ±" + spec.rootDisplay + "。" };
  }
  if (spec.kind === "no-real") {
    return /無實根|無實數根|math\s*error/i.test(input) ? { correct: true } : { correct: false, reason: "Δ<0，計算機應顯示 Math ERROR，請輸入「無實根」。" };
  }
  throw new Error("unknown checker spec: " + spec.kind);
}

function makeQuestion(content, values) {
  const question = {
    ...values,
    course: "s4",
    chapter: "ch1",
    templateId: content.templateId,
    mode: content.mode,
    title: content.title,
    topicLabel: content.topicLabel,
    prompt: {
      title: content.title,
      instruction: values.instruction,
      expression: values.expression
    },
    metadata: {
      challengeEligible: content.challengeEligible,
      worksheetEligible: content.worksheetEligible,
      topicLabel: content.topicLabel,
      parameterRanges: content.parameterRanges
    }
  };
  return question;
}

module.exports = {
  gcd,
  gcd3,
  randInt,
  randNZ,
  reduce,
  signed,
  linearLatex,
  polyLatex,
  fracText,
  sqrtParts,
  normalizeRaw,
  parsePolynomial,
  samePolynomial,
  parseLinear,
  parseFactor,
  parseNumeric,
  parseComplex,
  checkRoots,
  exactOrNumericRoots,
  exactRootPairLatex,
  exactRootInputs,
  checkSpec,
  makeQuestion
};
