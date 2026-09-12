/* Generated from Assessments S4 Ch1 question templates; do not edit. */
var AssessmentsS4Ch1QuestionBundle = (() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // schemas/question-schema.js
  var require_question_schema = __commonJS({
    "schemas/question-schema.js"(exports, module) {
      var REQUIRED_FIELDS = [
        "id",
        "course",
        "chapter",
        "templateId",
        "mode",
        "difficulty",
        "params",
        "prompt",
        "expression",
        "steps",
        "answer",
        "solution",
        "checker",
        "metadata"
      ];
      function validateQuestion(question) {
        if (!question || typeof question !== "object") throw new Error("question must be an object");
        for (const field of REQUIRED_FIELDS) {
          if (!(field in question)) throw new Error(`question missing ${field}`);
        }
        if (typeof question.id !== "string" || !question.id) throw new Error("question.id must be non-empty");
        if (typeof question.course !== "string" || !question.course || typeof question.chapter !== "string" || !question.chapter) {
          throw new Error("question course/chapter must be non-empty strings");
        }
        if (typeof question.templateId !== "string" || !question.templateId || typeof question.mode !== "string" || !question.mode) {
          throw new Error("question templateId/mode must be non-empty strings");
        }
        if (question.difficulty !== "basic" && question.difficulty !== "advanced") throw new Error("question.difficulty must be basic or advanced");
        if (!question.params || typeof question.params !== "object" || Array.isArray(question.params)) throw new Error("question.params must be an object");
        if (typeof question.title !== "string" || !question.title || typeof question.topicLabel !== "string" || !question.topicLabel) {
          throw new Error("question title/topicLabel must be non-empty strings");
        }
        if (typeof question.instruction !== "string" || !question.instruction) throw new Error("question.instruction must be a non-empty string");
        if (!question.prompt || typeof question.prompt !== "object" || Array.isArray(question.prompt)) throw new Error("question.prompt must be an object");
        if (typeof question.prompt.title !== "string" || typeof question.prompt.instruction !== "string" || typeof question.prompt.expression !== "string") {
          throw new Error("question.prompt must expose title, instruction, and expression strings");
        }
        if (typeof question.expression !== "string" || !question.expression) throw new Error("question.expression must be a non-empty string");
        if (!Array.isArray(question.steps) || question.steps.length === 0) throw new Error("question.steps must be non-empty");
        if (!question.steps.every((step) => step && typeof step.label === "string" && typeof step.hint === "string")) {
          throw new Error("question steps must expose label and hint");
        }
        if (typeof question.answer !== "string" || !question.answer) throw new Error("question.answer must be a non-empty string");
        if (!Array.isArray(question.solution) || question.solution.length === 0 || !question.solution.every((step) => typeof step === "string" && step)) {
          throw new Error("question.solution must contain non-empty strings");
        }
        if (!question.checker || typeof question.checker !== "object" || typeof question.checker.type !== "string" || !Array.isArray(question.checker.steps)) {
          throw new Error("question.checker must expose a type and steps");
        }
        if (question.checker.steps.length !== question.steps.length || !question.checker.steps.every((step) => step && typeof step.kind === "string")) {
          throw new Error("question checker steps must match question steps");
        }
        if (!question.metadata || typeof question.metadata !== "object" || Array.isArray(question.metadata)) throw new Error("question.metadata must be an object");
        assertJsonValue(question, "question");
        JSON.stringify(question);
        return question;
      }
      function assertJsonValue(value, path, seen = /* @__PURE__ */ new Set()) {
        if (value === null || typeof value === "string" || typeof value === "boolean") return;
        if (typeof value === "number") {
          if (!Number.isFinite(value)) throw new Error(`${path} must contain finite numbers`);
          return;
        }
        if (typeof value !== "object") throw new Error(`${path} contains a non-serializable value`);
        if (seen.has(value)) throw new Error(`${path} contains a circular reference`);
        seen.add(value);
        if (Array.isArray(value)) value.forEach((item, index) => assertJsonValue(item, `${path}[${index}]`, seen));
        else Object.entries(value).forEach(([key, item]) => assertJsonValue(item, `${path}.${key}`, seen));
        seen.delete(value);
      }
      module.exports = { REQUIRED_FIELDS, validateQuestion };
    }
  });

  // questions/s4/ch1/index.js
  var require_ch1 = __commonJS({
    "questions/s4/ch1/index.js"(exports, module) {
      var CONTENT = {
        expand: {
          mode: "expand",
          templateId: "quadratic.expand",
          title: "\u5C55\u958B\u53CA\u5316\u7C21",
          topicLabel: "\u5C55\u958B\u70BA\u4E00\u822C\u5F0F",
          instruction: "\u8ACB\u5C07\u65B9\u7A0B\u5C55\u958B\u4E26\u5316\u7C21\u70BA\u6700\u7C21\u4E00\u822C\u5F0F\uFF1A",
          steps: [
            { label: "\u8ACB\u8F38\u5165\u5B8C\u6574\u7684\u6700\u7C21\u4E00\u822C\u5F0F\u65B9\u7A0B\uFF1A", hint: "\u4F8B\u5982\uFF1Ax^2+3x-10=0 \u6216 2x^2-5x+3=0" }
          ],
          challengeEligible: true,
          worksheetEligible: true,
          parameterRanges: {
            basic: "p,q \u2208 {-6..-1,1..6}; k \u2208 {-9..9}",
            advanced: "\u4E09\u7A2E\u5C55\u958B\u7D50\u69CB\uFF1B\u975E\u96F6\u6574\u6578\u4FC2\u6578\u53CA\u5E38\u6578"
          }
        },
        sqrt: {
          mode: "sqrt",
          templateId: "quadratic.square-root",
          title: "\u5E73\u65B9\u6839\u6CD5\u6C42\u6839",
          topicLabel: "\u5E73\u65B9\u6839\u6CD5",
          instruction: "\u5229\u7528\u5E73\u65B9\u6839\u6CD5\u6C42\u89E3\uFF1A",
          steps: [
            { label: "\u6B65\u9A5F 1\uFF1A\u5169\u908A\u540C\u6642\u53D6\u5E73\u65B9\u6839\uFF1A", hint: "\u4F8B\u5982\uFF1Ax+2=+-4" },
            { label: "\u6B65\u9A5F 2\uFF1A\u8F38\u5165\u5169\u500B\u65B9\u7A0B\u6839\uFF1A", hint: "" }
          ],
          challengeEligible: true,
          worksheetEligible: true,
          parameterRanges: {
            basic: "\u5E73\u79FB\u91CF p \u2208 {-6..-1,1..6}; k \u70BA 2\xB2 \u81F3 8\xB2 \u7684\u5B8C\u5168\u5E73\u65B9",
            advanced: "\u5E73\u79FB\u91CF p \u2208 {-6..-1,1..6}; k \u2208 {8,12,18,20,24,27,32,40,48,50}"
          }
        },
        factor: {
          mode: "factor",
          templateId: "quadratic.factorisation",
          title: "\u56E0\u5F0F\u5206\u89E3\u6CD5\u6C42\u6839",
          topicLabel: "\u56E0\u5F0F\u5206\u89E3\u6CD5",
          instruction: "\u5148\u56E0\u5F0F\u5206\u89E3\uFF0C\u518D\u5229\u7528\u96F6\u4E58\u7A4D\u6027\u8CEA\u6C42\u6839\uFF1A",
          steps: [
            { label: "\u6B65\u9A5F 1\uFF1A\u8F38\u5165\u5169\u4E00\u6B21\u56E0\u5F0F\u76F8\u4E58\uFF1A", hint: "\u4F8B\u5982\uFF1A(x-3)(2x+1)=0" },
            { label: "\u6B65\u9A5F 2\uFF1A\u8F38\u5165\u5169\u500B\u65B9\u7A0B\u6839\uFF1A", hint: "" }
          ],
          challengeEligible: true,
          worksheetEligible: true,
          parameterRanges: {
            basic: "\u5169\u500B\u4E00\u6B21\u56E0\u5F0F\u7684\u9996\u9805\u4FC2\u6578\u70BA 1",
            advanced: "\u7B2C\u4E00\u500B\u9996\u9805\u4FC2\u6578\u70BA 2 \u6216 3\uFF0C\u4E26\u6392\u9664\u53EF\u7D04\u516C\u56E0\u6578\u60C5\u6CC1"
          }
        },
        formula: {
          mode: "formula",
          templateId: "quadratic.quadratic-formula",
          title: "\u4E8C\u6B21\u516C\u5F0F\u6CD5\u6C42\u6839",
          topicLabel: "\u4E8C\u6B21\u516C\u5F0F\u6CD5",
          instruction: "\u5148\u8A08\u7B97\u5224\u5225\u5F0F\uFF0C\u518D\u4EE3\u5165\u4E8C\u6B21\u516C\u5F0F\uFF1A",
          steps: [
            { label: "\u6B65\u9A5F 1\uFF1A\u8F38\u5165\u5224\u5225\u5F0F \u0394\uFF1A", hint: "\u4F8B\u5982\uFF1A36 \u6216 -16" },
            { label: "\u6B65\u9A5F 2\uFF1A\u8F38\u5165\u5169\u500B\u65B9\u7A0B\u6839\uFF1A", hint: "" }
          ],
          challengeEligible: true,
          worksheetEligible: true,
          parameterRanges: {
            basic: "a \u2208 {1,2,3}; b \u2208 {-7..-1,1..7}; c \u2208 {-8..-1,1..8}; \u0394 \u2265 0",
            advanced: "\u5BE6\u6839\u6216\u8907\u6578\u6839\uFF1B\u7CBE\u78BA\u5206\u6578\u3001\u6839\u5F0F\u53CA\u8907\u6578\u8868\u793A"
          }
        },
        calculator: {
          mode: "calculator",
          templateId: "quadratic.calculator",
          title: "\u8A08\u7B97\u6A5F\u6CD5\u5BE6\u6230",
          topicLabel: "\u8A08\u7B97\u6A5F\u6CD5",
          instruction: "\u7528\u8A08\u7B97\u6A5F\u6A21\u5F0F\u6C42\u6839\uFF0C\u5148\u78BA\u8A8D\u5224\u5225\u5F0F\uFF1A",
          steps: [
            { label: "\u6B65\u9A5F 1\uFF1A\u8F38\u5165\u5224\u5225\u5F0F \u0394\uFF1A", hint: "\u4F8B\u5982\uFF1A25 \u6216 -11" },
            { label: "\u6B65\u9A5F 2\uFF1A\u8F38\u5165\u8A08\u7B97\u6A5F\u986F\u793A\u7684\u7D50\u679C\uFF1A", hint: "" }
          ],
          challengeEligible: true,
          worksheetEligible: true,
          parameterRanges: {
            basic: "a \u2208 {1..4}; b \u2208 {-8..-1,1..8}; c \u2208 {-10..10}",
            advanced: "a \u2208 {2..9}; b \u2208 {-15..-1,1..15}; c \u2208 {-25..25}; \u0394 \u6B63\u8CA0\u7686\u6709"
          }
        }
      };
      var MODES = ["expand", "sqrt", "factor", "formula", "calculator"];
      module.exports = {
        course: "s4",
        chapter: "ch1",
        id: "s4-ch1-quadratic-equations",
        title: "\u4E00\u5143\u4E8C\u6B21\u65B9\u7A0B\u7DF4\u7FD2",
        modes: MODES,
        content: CONTENT
      };
    }
  });

  // templates/quadratic-equations/shared.js
  var require_shared = __commonJS({
    "templates/quadratic-equations/shared.js"(exports, module) {
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
        return terms.map((term, index) => (index === 0 ? term.sign === "-" ? "-" : "" : term.sign) + term.body).join("");
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
            if (coefficient.includes("^") || !/^[0-9]+$/.test(coefficient) && coefficient !== "") return null;
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
        function peek() {
          return source[index] || "";
        }
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
          const real2 = parseExpression(raw);
          return real2 == null ? null : { real: real2, imag: 0 };
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
        if (parts.length !== 2) return "\u9032\u968E\u5206\u6578\u683C\u5F0F\u4E0D\u6B63\u78BA\u3002";
        const denominator = stripOuterParentheses(parts[1]);
        if (denominator.includes("sqrt")) return "\u5206\u6BCD\u542B\u6709\u6839\u865F\uFF0C\u8ACB\u5148\u6709\u7406\u5316\u3002";
        if (!/^[+-]?\d+$/.test(denominator)) return null;
        const coefficients = exactIntegerCoefficients(parts[0]);
        const denominatorValue = Math.abs(Number(denominator));
        if (!coefficients || !Number.isSafeInteger(denominatorValue)) return null;
        const common = coefficients.reduce((value, coefficient) => gcd(value, coefficient), denominatorValue);
        return common > 1 ? "\u5206\u6578\u672A\u7D04\u81F3\u6700\u7C21\uFF0C\u5206\u5B50\u8207\u5206\u6BCD\u5FC5\u9808\u4E92\u8CEA\u3002" : null;
      }
      function closeEnough(a, b) {
        return Math.abs(a - b) < 5e-3 || Math.abs(a - b) / Math.max(1, Math.abs(b)) < 0.01;
      }
      function checkRoots(input, expected, exact) {
        const tokens = answerTokens(input);
        const repeated = expected.length === 2 && closeEnough(expected[0].real, expected[1].real) && closeEnough(expected[0].imag, expected[1].imag);
        if (tokens.length !== expected.length && !(repeated && tokens.length === 1)) {
          return { correct: false, reason: repeated ? "\u91CD\u6839\u53EA\u9700\u8F38\u5165\u4E00\u500B\u89E3\uFF1B\u4EA6\u53EF\u8F38\u5165\u5169\u6B21\u76F8\u540C\u7684\u89E3\u3002" : "\u8ACB\u8F38\u5165 " + expected.length + " \u500B\u6839\uFF0C\u4E26\u4EE5\u300C\u6216\u300D\u6216\u9017\u865F\u5206\u9694\u3002" };
        }
        if (exact) {
          for (const token of tokens) {
            const fractionIssue = exactFractionIssue(token);
            if (fractionIssue) return { correct: false, reason: fractionIssue };
          }
        }
        const values = tokens.map(parseComplex);
        if (values.some((value) => !value)) return { correct: false, reason: "\u683C\u5F0F\u4E0D\u5B8C\u6574\uFF1B\u53EF\u8F38\u5165\u6574\u6578\u3001\u5206\u6578\u3001\u6839\u5F0F\u6216\u8907\u6578\u3002" };
        if (exact && tokens.some((token) => /[.]/.test(token))) return { correct: false, reason: "\u9032\u968E\u984C\u8ACB\u4FDD\u7559\u6700\u7C21\u6E96\u78BA\u503C\uFF0C\u4E0D\u8981\u6539\u7528\u5C0F\u6578\u3002" };
        if (exact && tokens.some((token) => /sqrt\((\d+)\)/i.test(token) && sqrtParts(Number(token.match(/sqrt\((\d+)\)/i)[1])).outside > 1)) {
          return { correct: false, reason: "\u6839\u5F0F\u672A\u5316\u81F3\u6700\u7C21\uFF0C\u8ACB\u5148\u63D0\u51FA\u6839\u865F\u5167\u7684\u5E73\u65B9\u56E0\u6578\u3002" };
        }
        if (repeated && values.length === 1) {
          return closeEnough(values[0].real, expected[0].real) && closeEnough(values[0].imag, expected[0].imag) ? { correct: true } : { correct: false, reason: "\u91CD\u6839\u7684\u6578\u503C\u4E0D\u6B63\u78BA\u3002" };
        }
        const used = /* @__PURE__ */ new Set();
        for (const value of values) {
          let found = -1;
          for (let i = 0; i < expected.length; i += 1) {
            if (used.has(i)) continue;
            if (closeEnough(value.real, expected[i].real) && closeEnough(value.imag, expected[i].imag)) {
              found = i;
              break;
            }
          }
          if (found < 0) return { correct: false, reason: "\u6839\u7684\u6578\u503C\u6216\u6B63\u8CA0\u865F\u4E0D\u6B63\u78BA\u3002" };
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
          const radical2 = complexRadicalLatex(root) + "i";
          if (root.s === 1) return (root.p === 0 ? "\\pm " : String(root.p) + "\\pm ") + radical2;
          return "\\frac{" + root.p + "\\pm " + radical2 + "}{" + root.s + "}";
        }
        const parts = sqrtParts(Math.abs(delta));
        if (parts.inside === 1) return fracText(-b + parts.outside, denominator) + "\\text{ \u6216 }" + fracText(-b - parts.outside, denominator);
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
          const radical2 = (Math.abs(root.v) === 1 ? "" : String(Math.abs(root.v))) + "sqrt(" + root.w + ")";
          if (root.s === 1) return [root.p + "+" + radical2 + "i", root.p + "-" + radical2 + "i"];
          return ["(" + root.p + "+" + radical2 + "i)/" + root.s, "(" + root.p + "-" + radical2 + "i)/" + root.s];
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
        return ["(" + numerator + "+" + radical + ")/" + denominator / common, "(" + numerator + "-" + radical + ")/" + denominator / common];
      }
      function checkSpec(spec, input) {
        if (spec.kind === "polynomial") {
          return samePolynomial(parsePolynomial(input), spec.expected) ? { correct: true } : { correct: false, reason: spec.reason || "\u8ACB\u5C55\u958B\u3001\u79FB\u9805\u4E26\u7D04\u81F3\u6700\u7C21\u3002" };
        }
        if (spec.kind === "factor") {
          const parsed = parseFactor(input);
          const expected = spec.expected;
          return parsed && expected && parsed.a === expected.a && parsed.b === expected.b && parsed.c === expected.c ? { correct: true } : { correct: false, reason: "\u5169\u62EC\u865F\u5C55\u958B\u5F8C\u5FC5\u9808\u7B49\u65BC\u539F\u65B9\u7A0B\u3002" };
        }
        if (spec.kind === "numeric") {
          return parseNumeric(input) === spec.expected ? { correct: true } : { correct: false, reason: spec.reason || "\u6578\u503C\u4E0D\u6B63\u78BA\u3002" };
        }
        if (spec.kind === "roots") return checkRoots(input, spec.expected, !!spec.exact);
        if (spec.kind === "sqrt-step") {
          const raw = normalizeRaw(input).replace(/＝/g, "=");
          const parts = raw.split("=");
          if (parts.length !== 2) return { correct: false, reason: "\u6B65\u9A5F\u5FC5\u9808\u5305\u542B\u7B49\u865F\u3002" };
          const left = parseLinear(parts[0]);
          const right = parts[1].replace(/^\+\-|^±|^pm/i, "");
          if (!left || left.m !== 1 || left.n !== spec.p) return { correct: false, reason: "\u5DE6\u65B9\u61C9\u70BA " + linearLatex(spec.p) + "\u3002" };
          if (!/^\+\-|^±|^pm/i.test(parts[1])) return { correct: false, reason: "\u53D6\u5E73\u65B9\u6839\u6642\u53F3\u65B9\u5FC5\u9808\u4FDD\u7559 \xB1\u3002" };
          return spec.acceptedRight.includes(right) ? { correct: true } : { correct: false, reason: "\u53F3\u65B9\u61C9\u70BA \xB1" + spec.rootDisplay + "\u3002" };
        }
        if (spec.kind === "no-real") {
          return /無實根|無實數根|math\s*error/i.test(input) ? { correct: true } : { correct: false, reason: "\u0394<0\uFF0C\u8A08\u7B97\u6A5F\u61C9\u986F\u793A Math ERROR\uFF0C\u8ACB\u8F38\u5165\u300C\u7121\u5BE6\u6839\u300D\u3002" };
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
    }
  });

  // templates/quadratic-equations/expand.js
  var require_expand = __commonJS({
    "templates/quadratic-equations/expand.js"(exports, module) {
      var {
        gcd3,
        randInt,
        randNZ,
        signed,
        linearLatex,
        polyLatex,
        makeQuestion
      } = require_shared();
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
          steps.push("\u5C55\u958B\uFF1A\\(" + linearLatex(p) + "\\cdot" + linearLatex(q) + "=" + polyLatex(1, p + q, p * q) + "=" + k + "\\)\u3002");
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
            steps.push("\u5C55\u958B\u5DE6\u65B9\uFF1A\\(" + polyLatex(rawA, rawB, n1 * n2) + "=" + k + "\\)\u3002");
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
            steps.push("\u5C55\u958B\u5169\u908A\u5E73\u65B9\u5F0F\uFF1A\\(" + polyLatex(m * m, 2 * m * n1, n1 * n1) + "=" + polyLatex(1, 2 * n2, n2 * n2) + signed(k) + "\\)\u3002");
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
            steps.push("\u5C55\u958B\u4E26\u6574\u7406\u540C\u985E\u9805\uFF1A\\(" + polyLatex(rawA, rawB, -q) + "=" + k + "\\)\u3002");
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
          steps.push("\u79FB\u9805\u5F8C\uFF1A\\(" + polyLatex(rawA, rawB, rawC) + "=0\\)\u3002");
          steps.push("\u5168\u5F0F\u540C\u9664\u516C\u56E0\u6578 " + common + "\uFF1A\\(" + polyLatex(a, b, c) + "=0\\)\u3002");
        } else {
          steps.push("\u79FB\u9805\u4E26\u5316\u7C21\uFF1A\\(" + polyLatex(a, b, c) + "=0\\)\u3002");
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
            steps: [{ kind: "polynomial", expected: { a, b, c }, reason: "\u8ACB\u5C55\u958B\u3001\u79FB\u9805\u4E26\u7D04\u81F3\u6700\u7C21\uFF1A\\(" + polyLatex(a, b, c) + "=0\\)\u3002" }]
          }
        });
      }
      module.exports = { create };
    }
  });

  // templates/quadratic-equations/square-root.js
  var require_square_root = __commonJS({
    "templates/quadratic-equations/square-root.js"(exports, module) {
      var {
        randInt,
        randNZ,
        sqrtParts,
        linearLatex,
        makeQuestion
      } = require_shared();
      function create({ difficulty, rng, content }) {
        const p = randNZ(rng, -6, 6);
        const advanced = difficulty === "advanced";
        const k = advanced ? [8, 12, 18, 20, 24, 27, 32, 40, 48, 50][randInt(rng, 0, 9)] : Math.pow(randInt(rng, 2, 8), 2);
        const parts = sqrtParts(k);
        const root = Math.sqrt(k);
        const rootDisplay = advanced ? "\\sqrt{" + k + "}" : String(root);
        const expected = [{ real: -p + root, imag: 0 }, { real: -p - root, imag: 0 }];
        const acceptedRight = [String(root), "sqrt(" + k + ")", parts.outside + "sqrt(" + parts.inside + ")"];
        const stepHint = advanced ? "\u4F8B\u5982\uFF1A-2+2sqrt(3) \u6216 -2-2sqrt(3)" : "\u4F8B\u5982\uFF1A2 \u6216 -6";
        const renderedRoot = advanced ? (parts.outside === 1 ? "" : " " + parts.outside) + "\\sqrt{" + parts.inside + "}" : String(root);
        const answer = "\\(x=" + -p + "\\pm " + renderedRoot + "\\)";
        return makeQuestion(content, {
          id: "sqrt-" + p + "-" + k,
          difficulty,
          params: { p, k, outside: parts.outside, inside: parts.inside },
          instruction: content.instruction,
          expression: "\\left(" + linearLatex(p) + "\\right)^2=" + k,
          steps: [content.steps[0], { ...content.steps[1], hint: stepHint }],
          answer,
          solution: [
            "\u5169\u908A\u53D6\u5E73\u65B9\u6839\uFF1A\\(" + linearLatex(p) + "=\\pm " + rootDisplay + "\\)\u3002",
            "\u89E3\u5F97\uFF1A\\(x=" + -p + "\\pm " + (advanced ? (parts.outside === 1 ? "" : " " + parts.outside) + "\\sqrt{" + parts.inside + "}" : root) + "\\)\u3002"
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
    }
  });

  // templates/quadratic-equations/factorisation.js
  var require_factorisation = __commonJS({
    "templates/quadratic-equations/factorisation.js"(exports, module) {
      var {
        gcd3,
        randInt,
        randNZ,
        signed,
        polyLatex,
        fracText,
        makeQuestion
      } = require_shared();
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
        } while ((b === a * d || advanced && gcd3(A, B, C) > 1) && attempts < 200);
        if (b === a * d || advanced && gcd3(A, B, C) > 1) {
          a = advanced ? 2 : 1;
          b = advanced ? 1 : 2;
          d = advanced ? 2 : -3;
          A = a;
          B = a * d + b;
          C = b * d;
        }
        const expected = [{ real: -b / a, imag: 0 }, { real: -d, imag: 0 }];
        const factor = "(" + (a === 1 ? "x" : a + "x") + signed(b) + ")(x" + signed(d) + ")=0";
        return makeQuestion(content, {
          id: "factor-" + a + "-" + b + "-" + d,
          difficulty,
          params: { a, b, d, A, B, C },
          instruction: content.instruction,
          expression: polyLatex(A, B, C) + "=0",
          steps: [content.steps[0], { ...content.steps[1], hint: advanced ? "\u4F8B\u5982\uFF1A-1/2 \u6216 3" : "\u4F8B\u5982\uFF1A-0.5 \u6216 3" }],
          answer: "\\(x=" + fracText(-b, a) + "\\text{ \u6216 }x=" + -d + "\\)",
          solution: [
            "\u56E0\u5F0F\u5206\u89E3\uFF1A\\(" + factor + "\\)\u3002",
            "\u7531\u96F6\u4E58\u7A4D\u6027\u8CEA\uFF1A\\(x=" + fracText(-b, a) + "\\text{ \u6216 }x=" + -d + "\\)\u3002"
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
    }
  });

  // templates/quadratic-equations/quadratic-formula.js
  var require_quadratic_formula = __commonJS({
    "templates/quadratic-equations/quadratic-formula.js"(exports, module) {
      var {
        randInt,
        randNZ,
        polyLatex,
        exactOrNumericRoots,
        exactRootPairLatex,
        makeQuestion
      } = require_shared();
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
          steps: [content.steps[0], { ...content.steps[1], hint: advanced ? "\u4F8B\u5982\uFF1A-1+i \u6216 -1-i" : "\u4F8B\u5982\uFF1A2.35 \u6216 -0.683" }],
          answer: "\\(x=" + answer + "\\)",
          solution: [
            "\u5224\u5225\u5F0F\uFF1A\\(\\Delta=(" + b + ")^2-4(" + a + ")(" + c + ")=" + delta + "\\)\u3002",
            "\u4EE3\u5165\u516C\u5F0F\uFF1A\\(x=\\frac{-b\\pm\\sqrt{\\Delta}}{2a}\\)\uFF0C\u6240\u4EE5 \\(x=" + answer + "\\)\u3002"
          ],
          checker: {
            type: "quadratic-formula",
            steps: [
              { kind: "numeric", expected: delta, reason: "\\(\\Delta=b^2-4ac=" + delta + "\\)\u3002" },
              { kind: "roots", expected, exact: advanced }
            ]
          }
        });
      }
      module.exports = { create };
    }
  });

  // templates/quadratic-equations/calculator.js
  var require_calculator = __commonJS({
    "templates/quadratic-equations/calculator.js"(exports, module) {
      var { randInt, randNZ, polyLatex, makeQuestion } = require_shared();
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
        } while (advanced && attempts < 50 && (forceNegative && delta >= 0 || !forceNegative && delta < 0));
        const real = delta >= 0;
        const roots = real ? [{ real: (-b + Math.sqrt(delta)) / (2 * a), imag: 0 }, { real: (-b - Math.sqrt(delta)) / (2 * a), imag: 0 }] : [];
        const answer = real ? "\\(x\\approx " + roots.map((value) => Number(value.real.toPrecision(3))).join(",\\ ") + "\\)" : "\\(\\text{\u7121\u5BE6\u6578\u6839\uFF08Math ERROR\uFF09}\\)";
        return makeQuestion(content, {
          id: "calculator-" + a + "-" + b + "-" + c,
          difficulty,
          params: { a, b, c, delta },
          instruction: content.instruction,
          expression: polyLatex(a, b, c) + "=0",
          steps: [content.steps[0], { ...content.steps[1], hint: real ? "\u4F8B\u5982\uFF1A2.35 \u6216 -0.683" : "\u8ACB\u8F38\u5165\uFF1A\u7121\u5BE6\u6839" }],
          answer,
          solution: [
            "\u5224\u5225\u5F0F\uFF1A\\(\\Delta=" + delta + "\\)\uFF0C" + (real ? "\u6709\u5BE6\u6839\u3002" : "\u6C92\u6709\u5BE6\u6839\u3002"),
            real ? "\u8A08\u7B97\u6A5F\u8B80\u6578\uFF1A\\(x\\approx " + roots.map((value) => Number(value.real.toPrecision(3))).join(",\\ ") + "\\)\u3002" : "\u8A08\u7B97\u6A5F\u986F\u793A Math ERROR\uFF0C\u6545\u7121\u5BE6\u6578\u6839\u3002"
          ],
          checker: {
            type: "calculator",
            steps: [
              { kind: "numeric", expected: delta, reason: "\u5224\u5225\u5F0F\u61C9\u70BA " + delta + "\u3002" },
              real ? { kind: "roots", expected: roots, exact: false } : { kind: "no-real" }
            ]
          }
        });
      }
      module.exports = { create };
    }
  });

  // adapters/ai-learning-s4ch1.js
  var require_ai_learning_s4ch1 = __commonJS({
    "adapters/ai-learning-s4ch1.js"(exports, module) {
      var { validateQuestion } = require_question_schema();
      var catalog = require_ch1();
      var expand = require_expand();
      var squareRoot = require_square_root();
      var factorisation = require_factorisation();
      var quadraticFormula = require_quadratic_formula();
      var calculator = require_calculator();
      var shared = require_shared();
      var TEMPLATES = {
        expand,
        sqrt: squareRoot,
        factor: factorisation,
        formula: quadraticFormula,
        calculator
      };
      function defaultRng() {
        return Math.random();
      }
      function createQuestion(options = {}) {
        const rng = typeof options.rng === "function" ? options.rng : defaultRng;
        let mode = options.mode || "expand";
        if (mode === "mixed") mode = catalog.modes[shared.randInt(rng, 0, catalog.modes.length - 1)];
        if (!TEMPLATES[mode]) throw new Error("unknown S4 Ch1 mode: " + mode);
        const difficulty = options.difficulty === "advanced" ? "advanced" : "basic";
        let question;
        for (let attempt = 0; attempt < 10; attempt += 1) {
          question = TEMPLATES[mode].create({ difficulty, rng, content: catalog.content[mode] });
          if (question.id !== options.excludeId || attempt === 9) break;
        }
        question.mode = mode;
        question.difficulty = difficulty;
        return validateQuestion(question);
      }
      function checkQuestion(question, stepIndex, input) {
        if (!question || !question.checker || !Array.isArray(question.checker.steps)) return { correct: false, reason: "\u984C\u76EE\u8CC7\u6599\u4E0D\u5B8C\u6574\u3002" };
        const spec = question.checker.steps[stepIndex];
        if (!spec) return { correct: false, reason: "\u6C92\u6709\u9019\u500B\u4F5C\u7B54\u6B65\u9A5F\u3002" };
        return shared.checkSpec(spec, input);
      }
      function stripLatex(value) {
        return String(value || "").replace(/^\\\(|\\\)$/g, "").replace(/\\text\{ 或 \}/g, " or ").replace(/\\approx/g, "").replace(/\\pm/g, "+-").replace(/\\,|\\ /g, " ").replace(/\\sqrt\{(\d+)\}/g, "sqrt($1)").replace(/\\frac\{(-?\d+)\}\{(\d+)\}/g, "($1)/$2").replace(/[{}]/g, "").replace(/^x=/, "").trim();
      }
      function inputExamples(question) {
        const params = question.params;
        if (question.mode === "expand") return [shared.polyLatex(params.a, params.b, params.c) + "=0"];
        if (question.mode === "sqrt") {
          const root = params.outside + "sqrt(" + params.inside + ")";
          const left = "x" + (params.p === 0 ? "" : shared.signed(params.p));
          const second = params.outside === 1 ? "sqrt(" + params.inside + ")" : root;
          return [left + "=+-" + second, "x=" + -params.p + "+" + root + " \u6216 " + -params.p + "-" + root];
        }
        if (question.mode === "factor") {
          const root = shared.reduce(-params.b, params.a);
          const first = root.d === 1 ? String(root.n) : root.n + "/" + root.d;
          return ["(" + (params.a === 1 ? "x" : params.a + "x") + shared.signed(params.b) + ")(x" + shared.signed(params.d) + ")=0", first + " \u6216 " + -params.d];
        }
        if (question.mode === "formula") {
          const formulaStep = question.checker.steps[1];
          const final = formulaStep.exact ? shared.exactRootInputs(params.a, params.b, params.c)[0] + " \u6216 " + shared.exactRootInputs(params.a, params.b, params.c)[1] : formulaStep.expected.map((value) => Number(value.real.toPrecision(3))).join(" \u6216 ");
          return [String(params.delta), final];
        }
        if (question.mode === "calculator") {
          const calculatorStep = question.checker.steps[1];
          const final = calculatorStep.kind === "no-real" ? "\u7121\u5BE6\u6839" : calculatorStep.expected.map((value) => Number(value.real.toPrecision(3))).join(" \u6216 ");
          return [String(params.delta), final];
        }
        return [stripLatex(question.answer)];
      }
      function publicCatalog() {
        return {
          id: catalog.id,
          course: catalog.course,
          chapter: catalog.chapter,
          title: catalog.title,
          modes: catalog.modes.map((mode) => ({
            mode,
            templateId: catalog.content[mode].templateId,
            title: catalog.content[mode].title,
            topicLabel: catalog.content[mode].topicLabel,
            challengeEligible: catalog.content[mode].challengeEligible,
            worksheetEligible: catalog.content[mode].worksheetEligible
          }))
        };
      }
      module.exports = {
        version: 1,
        catalog: publicCatalog(),
        modes: catalog.modes.slice(),
        createQuestion,
        checkQuestion,
        inputExamples,
        stripLatex
      };
    }
  });
  return require_ai_learning_s4ch1();
})();
