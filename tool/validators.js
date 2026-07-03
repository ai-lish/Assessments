/*
   Shared answer validators for generated Assessments student tools.
   Browser: window.AssessValidators
   Node: require("./tool/validators.js")
*/
(function(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.AssessValidators = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function() {
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
  });

  const aliases = Object.freeze({
    textExact: "textExact",
    numeric: "numeric",
    fracPct: "fracPct",
    primeFactor: "primeFactor",
    algebraQ8: "algebraQ8",
    hcfLcm: "hcfLcm",
    choiceKey: "choiceKey",
    congruenceReason: "congruenceReason",
    coordinatePoint: "coordinatePoint",
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

  return {
    validators,
    aliases,
    normalize,
    normalizeCongruenceReason,
    getValidatorKey,
    hasValidator,
    checkAnswer,
  };
});
