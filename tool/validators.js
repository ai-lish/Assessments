/*
   Shared answer validators for generated Assessments student tools.
   Browser: window.AssessValidators
   Node: require("./tool/validators.js")
*/
(function(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.AssessValidators = api;
})(typeof globalThis !== "undefined" ? globalThis : this, createAssessValidators);

function createAssessValidators() {
  function normalize(s) {
    return String(s || "").trim().replace(/\s+/g, "")
      .replace(/×/g, "*").replace(/÷/g, "/").replace(/π/g, "pi").replace(/−/g, "-").toUpperCase();
  }

  function equalAns(a, b) {
    if (a === b) return true;
    const na = normalize(a);
    const nb = normalize(b);
    if (na === nb) return true;
    const fa = parseFloat(na);
    const fb = parseFloat(nb);
    return !Number.isNaN(fa) && !Number.isNaN(fb) && Math.abs(fa - fb) < 0.01;
  }

  function parseSignedNumber(value) {
    const s = String(value || "").trim().replace(/−/g, "-").replace(/\s+/g, "");
    const frac = s.match(/^(-?\d+)\/(-?\d+)$/);
    if (frac) {
      const den = parseFloat(frac[2]);
      if (den === 0) return NaN;
      return parseFloat(frac[1]) / den;
    }
    return parseFloat(s);
  }

  function stripOuterParens(value) {
    let s = String(value || "");
    while (s.length >= 2 && s[0] === "(" && s[s.length - 1] === ")") {
      let depth = 0;
      let wraps = true;
      for (let i = 0; i < s.length; i += 1) {
        if (s[i] === "(") depth += 1;
        else if (s[i] === ")") depth -= 1;
        if (depth === 0 && i < s.length - 1) {
          wraps = false;
          break;
        }
      }
      if (!wraps) break;
      s = s.slice(1, -1);
    }
    return s;
  }

  function parsePiNumber(value) {
    let s = String(value || "").trim()
      .replace(/−/g, "-")
      .replace(/\s+/g, "")
      .replace(/\\pi/gi, "pi")
      .replace(/π/gi, "pi")
      .replace(/×/g, "*");
    if (s === "") return NaN;
    s = s.replace(/\\frac\{(-?\d+(?:\.\d+)?)\}\{(-?\d+(?:\.\d+)?)\}/gi, "($1/$2)");
    if (!s.toLowerCase().includes("pi")) return parseSignedNumber(s);
    s = s.replace(/x(?=pi)/gi, "*").replace(/\*/g, "");
    const parts = s.split(/pi/i);
    if (parts.length !== 2) return NaN;
    let coeffRaw = stripOuterParens(parts[0]);
    if (coeffRaw === "" || coeffRaw === "+") coeffRaw = "1";
    else if (coeffRaw === "-") coeffRaw = "-1";
    const coeff = parseSignedNumber(coeffRaw);
    let denominator = 1;
    if (parts[1] !== "") {
      if (!parts[1].startsWith("/")) return NaN;
      denominator = parseSignedNumber(stripOuterParens(parts[1].slice(1)));
    }
    if (Number.isNaN(coeff) || Number.isNaN(denominator) || denominator === 0) return NaN;
    return coeff * Math.PI / denominator;
  }

  function normalizePolynomialInput(value) {
    return String(value || "")
      .replace(/−/g, "-")
      .replace(/\s+/g, "")
      .replace(/\*\*/g, "^")
      .replace(/×/g, "*")
      .replace(/\*/g, "")
      .toLowerCase();
  }

  function parsePolynomial(value) {
    let s = normalizePolynomialInput(value);
    if (s === "") return null;
    if (s[0] !== "+" && s[0] !== "-") s = "+" + s;
    const tokenRe = /[+-][^+-]+/g;
    const tokens = s.match(tokenRe);
    if (!tokens || tokens.join("") !== s) return null;
    const coeffs = {};
    const order = [];
    for (const token of tokens) {
      const sign = token[0] === "-" ? -1 : 1;
      const body = token.slice(1);
      let coeff, degree;
      if (body.includes("x")) {
        const match = body.match(/^(\d*)x(?:\^(\d+))?$/);
        if (!match) return null;
        coeff = match[1] === "" ? 1 : parseInt(match[1], 10);
        degree = match[2] ? parseInt(match[2], 10) : 1;
      } else {
        if (!/^\d+$/.test(body)) return null;
        coeff = parseInt(body, 10);
        degree = 0;
      }
      const signedCoeff = sign * coeff;
      coeffs[degree] = (coeffs[degree] || 0) + signedCoeff;
      if (signedCoeff !== 0) order.push(degree);
    }
    Object.keys(coeffs).forEach((degree) => {
      if (coeffs[degree] === 0) delete coeffs[degree];
    });
    return { coeffs, order };
  }

  function samePolynomial(a, b) {
    if (!a || !b) return false;
    const keysA = Object.keys(a.coeffs).sort();
    const keysB = Object.keys(b.coeffs).sort();
    if (keysA.length !== keysB.length) return false;
    for (let i = 0; i < keysA.length; i += 1) {
      if (keysA[i] !== keysB[i]) return false;
      if (a.coeffs[keysA[i]] !== b.coeffs[keysB[i]]) return false;
    }
    return true;
  }

  function parseLinearFactor(raw) {
    let s = normalizePolynomialInput(raw);
    if (s === "") return null;
    if (s[0] !== "+" && s[0] !== "-") s = "+" + s;
    const tokens = s.match(/[+-][^+-]+/g);
    if (!tokens || tokens.join("") !== s) return null;
    let xCoeff = 0;
    let constant = 0;
    for (const token of tokens) {
      const sign = token[0] === "-" ? -1 : 1;
      const body = token.slice(1);
      if (body.includes("x")) {
        const match = body.match(/^(\d*)x$/);
        if (!match) return null;
        xCoeff += sign * (match[1] === "" ? 1 : parseInt(match[1], 10));
      } else {
        if (!/^\d+$/.test(body)) return null;
        constant += sign * parseInt(body, 10);
      }
    }
    if (xCoeff === 0) return null;
    return [xCoeff, constant];
  }

  function parseFactorPairInput(value) {
    const s = String(value || "").trim()
      .replace(/\s+/g, "")
      .replace(/−/g, "-")
      .replace(/[×·]/g, "*");
    if (s === "") return null;
    let i = 0;
    let coefficient = 1;
    const factors = [];
    while (i < s.length) {
      if (s[i] === "*") {
        i += 1;
        continue;
      }
      if (s[i] === "(") {
        const end = s.indexOf(")", i + 1);
        if (end < 0) return null;
        const factor = parseLinearFactor(s.slice(i + 1, end));
        if (!factor) return null;
        factors.push(factor);
        i = end + 1;
        continue;
      }
      const match = s.slice(i).match(/^[+-]?\d+/);
      if (!match) return null;
      coefficient *= parseInt(match[0], 10);
      i += match[0].length;
    }
    if (factors.length !== 2) return null;
    return { coefficient, factors };
  }

  function sameLinearFactor(a, b) {
    return Array.isArray(a) && Array.isArray(b) && a[0] === b[0] && a[1] === b[1];
  }

  function normalizeFactorSpec(value) {
    if (Array.isArray(value)) return { coefficient: 1, factors: value };
    if (value && Array.isArray(value.factors)) {
      return { coefficient: value.coefficient === undefined ? 1 : Number(value.coefficient), factors: value.factors };
    }
    return null;
  }

  function sameFactorPair(user, expected) {
    const u = normalizeFactorSpec(user);
    const e = normalizeFactorSpec(expected);
    if (!u || !e || u.coefficient !== e.coefficient || u.factors.length !== 2 || e.factors.length !== 2) return false;
    return (sameLinearFactor(u.factors[0], e.factors[0]) && sameLinearFactor(u.factors[1], e.factors[1])) ||
           (sameLinearFactor(u.factors[0], e.factors[1]) && sameLinearFactor(u.factors[1], e.factors[0]));
  }

  function parseScientificNotation(value) {
    let s = String(value || "").trim()
      .replace(/−/g, "-")
      .replace(/\s+/g, "")
      .replace(/×/g, "*")
      .replace(/X(?=10)/g, "*")
      .replace(/x(?=10)/g, "*")
      .replace(/\^\{(-?\d+)\}/g, "^$1");
    const match = s.match(/^(-?(?:\d+(?:\.\d+)?|\.\d+))\*?10\^(-?\d+)$/);
    if (!match) return null;
    const mantissa = parseFloat(match[1]);
    const exponent = parseInt(match[2], 10);
    if (Number.isNaN(mantissa) || Number.isNaN(exponent)) return null;
    return { mantissa, exponent, value: mantissa * Math.pow(10, exponent) };
  }

  function parseInequality(value, variable) {
    const v = variable || "x";
    const s = String(value || "").trim()
      .replace(/−/g, "-")
      .replace(/\s+/g, "")
      .replace(/≥/g, ">=")
      .replace(/≤/g, "<=");
    const match = s.match(/^(.+?)(>=|<=|>|<)(.+)$/);
    if (!match) return null;
    const left = match[1];
    const op = match[2];
    const right = match[3];
    const invert = { ">": "<", "<": ">", ">=": "<=", "<=": ">=" };
    if (left === v && right !== v) {
      const num = parseSignedNumber(right);
      return Number.isNaN(num) ? null : { op, value: num };
    }
    if (right === v && left !== v) {
      const num = parseSignedNumber(left);
      return Number.isNaN(num) ? null : { op: invert[op], value: num };
    }
    return null;
  }

  function checkPrimeFactorIndexForm(userInput, expectedFactors) {
    if (userInput === null || userInput === undefined) return false;
    const s = String(userInput).toUpperCase().replace(/\s+/g, "").replace(/[×*X]/g, "*");
    if (s === "") return false;
    const tokens = s.split("*").filter((token) => token !== "");
    if (tokens.length === 0) return false;
    const map = {};
    const baseCount = {};
    for (const token of tokens) {
      const match = token.match(/^(\d+)(?:\^(\d+))?$/);
      if (!match) return false;
      const base = parseInt(match[1], 10);
      const exp = match[2] ? parseInt(match[2], 10) : 1;
      if (exp < 1) return false;
      map[base] = (map[base] || 0) + exp;
      baseCount[base] = (baseCount[base] || 0) + 1;
    }
    for (const base in baseCount) {
      if (baseCount[base] > 1) return false;
    }
    const expectedKeys = Object.keys(expectedFactors || {});
    const userKeys = Object.keys(map);
    if (expectedKeys.length !== userKeys.length) return false;
    for (const key of expectedKeys) {
      if (map[key] !== expectedFactors[key]) return false;
    }
    return true;
  }

  function checkAlgebraQ8(userInput, q) {
    if (userInput === null || userInput === undefined) return false;
    const s = String(userInput).toUpperCase().replace(/\s+/g, "")
      .replace(/÷/g, "/").replace(/[×*]/g, "*");
    if (s === "") return false;
    const subtype = q.q8subtype;
    let match;
    if (subtype === 1) {
      match = (q.answers[0] || "").match(/^(\d+)x-(\d+)$/);
      if (!match) return false;
      return s === `${match[1]}X-${match[2]}`;
    }
    if (subtype === 2) {
      match = (q.answers[0] || "").match(/^\(x-(\d+)\)\/(\d+)$/);
      if (!match) return false;
      return s === `(X-${match[1]})/${match[2]}`;
    }
    if (subtype === 3) {
      match = (q.answers[0] || "").match(/^(\d+)\(x\+(\d+)\)$/);
      if (!match) return false;
      return s === `${match[1]}(X+${match[2]})` || s === `(X+${match[2]})${match[1]}` ||
             s === `${match[1]}*(X+${match[2]})` || s === `(X+${match[2]})*${match[1]}`;
    }
    if (subtype === 4) {
      match = (q.answers[0] || "").match(/^x\/(\d+)\+(\d+)$/);
      if (!match) return false;
      return s === `X/${match[1]}+${match[2]}`;
    }
    if (subtype === 5) {
      match = (q.answers[0] || "").match(/^(\d+)\((\d+)-x\)$/);
      if (!match) return false;
      return s === `${match[1]}(${match[2]}-X)` || s === `(${match[2]}-X)${match[1]}` ||
             s === `${match[1]}*(${match[2]}-X)` || s === `(${match[2]}-X)*${match[1]}`;
    }
    return false;
  }

  function normalizeCongruenceReason(value) {
    return normalize(value).replace(/\./g, "");
  }

  const validators = Object.freeze({
    textExact(q, userInput) {
      const answers = q.answers && q.answers.length > 0 ? q.answers : [q.correctAnswer];
      return answers.some((answer) => equalAns(userInput, answer));
    },
    numeric(q, userInput) {
      const normalizeNumericInput = (value) => String(value || "").trim().replace(/−/g, "-").replace(/\$/g, "");
      const user = parseFloat(normalizeNumericInput(userInput));
      const answer = parseFloat(normalizeNumericInput(q.correctAnswer));
      return !Number.isNaN(user) && !Number.isNaN(answer) && Math.abs(user - answer) < 0.01;
    },
    signedNumeric(q, userInput) {
      const user = parseSignedNumber(userInput);
      const answer = parseSignedNumber(q.correctAnswer);
      return !Number.isNaN(user) && !Number.isNaN(answer) && Math.abs(user - answer) < 0.01;
    },
    numericOrFraction(q, userInput) {
      const user = parseSignedNumber(userInput);
      const answer = parseSignedNumber(q.correctAnswer);
      return !Number.isNaN(user) && !Number.isNaN(answer) && Math.abs(user - answer) < 0.01;
    },
    unitNumeric(q, userInput) {
      const spec = q.answerSpec || {};
      let s = String(userInput || "").trim().replace(/−/g, "-");
      if (spec.allowUnit) {
        s = s.replace(/cm³/gi, "").replace(/cm\^3/gi, "").replace(/立方厘米/g, "");
        s = s.replace(/cm²/gi, "").replace(/cm\^2/gi, "").replace(/平方厘米/g, "");
        s = s.replace(/cm\b/gi, "").replace(/厘米/g, "");
      }
      const user = parsePiNumber(s);
      const answer = parsePiNumber(q.correctAnswer);
      const tolerance = spec.tolerance === undefined ? 0.05 : Number(spec.tolerance);
      return !Number.isNaN(user) && !Number.isNaN(answer) && Math.abs(user - answer) <= tolerance;
    },
    fracPct(q, userInput) {
      const sNoPct = String(userInput || "").replace(/%/g, "").trim();
      const answer = String(q.correctAnswer || "").replace(/%/g, "").trim();
      return sNoPct === answer;
    },
    primeFactor(q, userInput) {
      return checkPrimeFactorIndexForm(userInput, q.primeFactors || {});
    },
    algebraQ8(q, userInput) {
      return checkAlgebraQ8(userInput, q);
    },
    hcfLcm(q, userInput) {
      return String(userInput || "").trim() === String(q.correctAnswer).trim();
    },
    choiceKey(q, userInput) {
      return normalize(userInput) === normalize(q.correctAnswer);
    },
    congruenceReason(q, userInput) {
      const expected = q.answers || [q.correctAnswer];
      const normalizedInput = normalizeCongruenceReason(userInput);
      return expected.map(normalizeCongruenceReason).includes(normalizedInput);
    },
    coordinatePoint(q, userInput) {
      return String(userInput).trim() === String(q.correctAnswer).trim();
    },
    polyTerms(q, userInput) {
      const expected = parsePolynomial(q.correctAnswer);
      const user = parsePolynomial(userInput);
      if (!samePolynomial(user, expected)) return false;
      const mode = (q.answerSpec && q.answerSpec.order) || "loose";
      if (mode === "strict") {
        if (user.order.length !== expected.order.length) return false;
        return user.order.every((degree, index) => degree === expected.order[index]);
      }
      return true;
    },
    factorPair(q, userInput) {
      const expected = q.answerSpec;
      return sameFactorPair(parseFactorPairInput(userInput), expected);
    },
    scientificNotation(q, userInput) {
      const parsed = parseScientificNotation(userInput);
      if (!parsed) return false;
      if (Math.abs(parsed.mantissa) < 1 || Math.abs(parsed.mantissa) >= 10) return false;
      const expected = q.answerSpec && q.answerSpec.value;
      if (expected === undefined || expected === null) return false;
      return Math.abs(parsed.value - Number(expected)) <= Math.max(0.01, Math.abs(Number(expected)) * 1e-10);
    },
    inequality(q, userInput) {
      const spec = q.answerSpec || {};
      const parsed = parseInequality(userInput, spec.variable || "x");
      if (!parsed) return false;
      return parsed.op === spec.op && Math.abs(parsed.value - Number(spec.value)) < 0.01;
    },
  });

  const aliases = Object.freeze({
    textExact: "textExact",
    numeric: "numeric",
    signedNumeric: "signedNumeric",
    numericOrFraction: "numericOrFraction",
    unitNumeric: "unitNumeric",
    fracPct: "fracPct",
    primeFactor: "primeFactor",
    algebraQ8: "algebraQ8",
    hcfLcm: "hcfLcm",
    choiceKey: "choiceKey",
    congruenceReason: "congruenceReason",
    coordinatePoint: "coordinatePoint",
    polyTerms: "polyTerms",
    factorPair: "factorPair",
    scientificNotation: "scientificNotation",
    inequality: "inequality",
  });

  function getValidatorKey(key) {
    return aliases[key] || key || "textExact";
  }

  function hasValidator(key) {
    return typeof validators[getValidatorKey(key)] === "function";
  }

  function checkAnswer(q, userInput) {
    const key = getValidatorKey(q.validator || q.checkType || "textExact");
    const validator = validators[key];
    if (!validator) return false;
    return validator(q, userInput);
  }

  function toStandaloneScript() {
    return [
      "/* Embedded from tool/validators.js by tool/index.html. */",
      "(function(root, factory) {",
      "  const api = factory();",
      "  root.AssessValidators = api;",
      "})(typeof globalThis !== \"undefined\" ? globalThis : this, " + createAssessValidators.toString() + ");",
    ].join("\n");
  }

  return {
    validators,
    aliases,
    normalize,
    normalizeCongruenceReason,
    getValidatorKey,
    hasValidator,
    checkAnswer,
    toStandaloneScript,
  };
}
