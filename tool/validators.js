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
      const user = parseFloat(userInput);
      const answer = parseFloat(q.correctAnswer);
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
      }
      const user = parseSignedNumber(s);
      const answer = parseSignedNumber(q.correctAnswer);
      return !Number.isNaN(user) && !Number.isNaN(answer) && Math.abs(user - answer) < 0.01;
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
