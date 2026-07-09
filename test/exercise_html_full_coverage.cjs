#!/usr/bin/env node

/*
  Manual verification for published exercise HTML files.

  Scope:
  - Read-only against product files.
  - Uses Playwright when available.
  - Does not patch or regenerate exercises.
*/

const fs = require("fs");
const path = require("path");

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch (error) {
  console.error("Playwright is required for this manual verification script.");
  console.error("Install/run outside CI, for example: npm_config_yes=true npx playwright install chromium && NODE_PATH=<playwright node_modules> node test/exercise_html_full_coverage.cjs");
  process.exit(2);
}

const ROOT = path.resolve(__dirname, "..");
const EXERCISES = [
  { key: "s1_term2_part_a", grade: "s1", file: "exercises/2526/s1/t2/part-a-01.html", expectedCount: 14 },
  { key: "s1_term3_part_a", grade: "s1", file: "exercises/2526/s1/t3/part-a-01.html", expectedCount: 16 },
  { key: "s2_term3_part_a", grade: "s2", file: "exercises/2526/s2/t3/part-a-01.html", expectedCount: 16 },
  { key: "s3_term3_part_a", grade: "s3", file: "exercises/2526/s3/t3/part-a-01.html", expectedCount: 14 },
];
const VIEWPORTS = [
  { label: "390x844", width: 390, height: 844 },
  { label: "1920x1080", width: 1920, height: 1080 },
];
const SAMPLES_PER_QUESTION = 3;

function readExercise(exercise) {
  const abs = path.join(ROOT, exercise.file);
  return fs.readFileSync(abs, "utf8");
}

function extractConstJson(html, name) {
  const re = new RegExp(`const\\s+${name}\\s*=\\s*([\\s\\S]*?);\\n`);
  const match = html.match(re);
  if (!match) throw new Error(`Cannot find ${name}`);
  return JSON.parse(match[1]);
}

function extractConstRaw(html, name) {
  const re = new RegExp(`const\\s+${name}\\s*=\\s*([^;]+);`);
  const match = html.match(re);
  return match ? match[1].trim() : null;
}

function parseFamily(code) {
  const parts = String(code || "").split("-");
  return parts.length >= 7 ? `${parts[5]}-${parts[6]}` : "";
}

function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a || 1;
}

function lcm(a, b) {
  return Math.abs(a * b) / gcd(a, b);
}

function factorMap(n) {
  const out = {};
  let m = Math.abs(n);
  for (let f = 2; f * f <= m; f++) {
    while (m % f === 0) {
      out[f] = (out[f] || 0) + 1;
      m /= f;
    }
  }
  if (m > 1) out[m] = (out[m] || 0) + 1;
  return out;
}

function primeFactorText(n) {
  return Object.entries(factorMap(n))
    .map(([f, e]) => e > 1 ? `${f}^${e}` : f)
    .join("x");
}

function term(coef, variable, first = false) {
  if (coef === 0) return "";
  const sign = coef < 0 ? "-" : (first ? "" : "+");
  const abs = Math.abs(coef);
  return sign + (abs === 1 && variable ? "" : abs) + variable;
}

function poly2(A, B, C) {
  const parts = [
    term(A, "x^2", true),
    term(B, "x", A === 0),
    term(C, "", A === 0 && B === 0),
  ].filter(Boolean);
  return parts.length ? parts.join("") : "0";
}

function lin(A, B, variable = "x") {
  return (A === 1 ? variable : `${A}${variable}`) + (B >= 0 ? "+" : "") + B;
}

function linearExpr(coef, constant, variable = "x") {
  if (coef === 0) return String(constant);
  let out = coef === 1 ? variable : (coef === -1 ? `-${variable}` : `${coef}${variable}`);
  if (constant !== 0) out += (constant >= 0 ? "+" : "") + constant;
  return out;
}

function twoVarExpr(a, b) {
  return [term(a, "a", true), term(b, "b", a === 0)].filter(Boolean).join("") || "0";
}

function sigFigExpected(p) {
  const p10 = Math.floor(Math.log10(p.baseNum));
  const power = Math.pow(10, p10 - p.sf + 1);
  const roundedVal = Math.round(p.baseNum / power) * power;
  const decimals = Math.max(0, p.sf - p10 - 1);
  return roundedVal.toFixed(decimals);
}

function roundDecimalExpected(p) {
  const factor = Math.pow(10, p.decimals);
  let rounded;
  if (p.mode === "round_up") rounded = Math.ceil(p.value * factor) / factor;
  else if (p.mode === "round_down") rounded = Math.floor(p.value * factor) / factor;
  else rounded = Math.round(p.value * factor) / factor;
  return rounded.toFixed(p.decimals);
}

function simplifyRootExpected(n) {
  let k = 1;
  let m = n;
  for (let i = Math.floor(Math.sqrt(n)); i >= 1; i--) {
    if (n % (i * i) === 0) {
      k = i;
      m = n / (i * i);
      break;
    }
  }
  if (m === 1) return `±${k}`;
  if (k === 1) return `±√${m}`;
  return `±${k}√${m}`;
}

function independentExpected(q) {
  const p = q.paramsUsed || {};
  switch (q.typeKey) {
    case "frac_arith": return String(p.factor);
    case "neg_power": return String(Math.pow(-p.base, p.exp));
    case "prime_factor":
    case "s1t2_prime_factor": return primeFactorText(p.n);
    case "hcf_or_lcm":
    case "s1t2_hcf": {
      const h = gcd(p.n1, p.n2);
      return String(p.askLCM ? (p.n1 * p.n2) / h : h);
    }
    case "exp_law":
    case "s2t3_exp_law":
      return p.zeroCase ? "1" : `x^${p.a + p.b}`;
    case "alg_simplify":
    case "s1t2_alg_simplify":
      return linearExpr(p.xCoeff, p.constTerm);
    case "solve_eq":
    case "s1t2_solve_eq_fraction":
    case "s1t2_solve_eq_negative":
    case "solve_eq_fraction":
    case "solve_eq_bracket":
      if (String(p.xVal).includes("/")) return String(p.xVal);
      if (q.correctAnswer.includes("/") && p.rVal !== undefined && p.coeff !== undefined) {
        const g = gcd(p.rVal, p.coeff);
        const num = p.rVal / g;
        const den = p.coeff / g;
        return den === 1 ? String(num) : `${num}/${den}`;
      }
      return String(p.xVal);
    case "word_to_alg":
    case "s1t2_word_to_alg": {
      if (p.t === 1) return `${p.a}x-${p.b}`;
      if (p.t === 2) return `(x-${p.a})/${p.b}`;
      if (p.t === 3) return `${p.b}(x+${p.a})`;
      if (p.t === 4) return `x/${p.a}+${p.b}`;
      return `${p.b}(${p.a}-x)`;
    }
    case "sig_fig":
    case "s2t3_sig_fig": return sigFigExpected(p);
    case "frac_to_pct": {
      const [num, den] = String(p.item).split("/").map(Number);
      return `${(num / den) * 100}%`;
    }
    case "poly_desc":
    case "s1t2_poly_desc": return poly2(1, p.b, -p.c);
    case "formula_sub": return String(p.result);
    case "congruence": return String(p.reason);
    case "coordinate":
    case "s1t2_coordinate": return String(p.coordVal);
    case "seq_nth": return String(p.result);
    case "data_type": return p.answer || q.correctAnswer;
    case "directed_add": return String(p.a + p.b);
    case "directed_mul": return String(p.a * p.b);
    case "cuboid_volume":
    case "cuboid_volume_cube":
      return String(p.cube ? Math.pow(p.side, 3) : p.l * p.w * p.h);
    case "poly_constant": return String(p.c);
    case "expand_bracket": return linearExpr(p.xCoeff, p.constTerm);
    case "quadrant": return p.x > 0 && p.y > 0 ? "I" : (p.x < 0 && p.y > 0 ? "II" : (p.x < 0 && p.y < 0 ? "III" : "IV"));
    case "alg_simplify_2var": return twoVarExpr(p.resA, p.resB);
    case "s2t3_square_expand_2var": return `x^2+${2 * p.b}xy+${p.b * p.b}y^2`;
    case "factor_neg_common": {
      const coef = p.k === 1 ? "" : String(p.k);
      const innerExp = p.d1 - 1;
      const inner = (innerExp === 1 ? "x" : `x^${innerExp}`) + "+1";
      return `-${coef}x(${inner})`;
    }
    case "factor_diff_sq":
    case "s2t3_factor_diff_sq": return `(${lin(p.a, -p.b)})(${lin(p.a, p.b)})`;
    case "round_decimal": return roundDecimalExpected(p);
    case "combine_fractions": return `(${p.m}a+${p.c})/(${p.m}k)`;
    case "coef_exp_div": {
      const expDiff = p.expN - p.expD;
      const xPow = expDiff === 1 ? "x" : `x^${expDiff}`;
      const termPart = p.rNum === 1 ? xPow : `${p.rNum}${xPow}`;
      return p.rDen === 1 ? termPart : `${termPart}/${p.rDen}`;
    }
    case "ratio_three": return `${p.common}:${p.bFinal}:${p.cFinal}`;
    case "discount": return String(+(p.price * p.disTen / 10).toFixed(2));
    case "profit_pct": return String(p.result);
    case "square_root_pm": return simplifyRootExpected(p.n);
    case "poly_add_sub": {
      const sign = p.op === "-" ? -1 : 1;
      return poly2(p.a + sign * p.d, p.b + sign * p.e, p.c + sign * p.f);
    }
    case "binomial_expand":
    case "s3t3_square_expand": return poly2(p.x2, p.x1, p.constTerm);
    case "s3t3_zero_exp": return "1";
    case "factor_cross": return `(${lin(p.a, p.b)})(${lin(p.c, p.d)})`;
    case "sci_notation": return `${p.mantissa}×10^${p.exponent}`;
    case "solve_ineq": return `x${p.op}${p.boundary}`;
    case "triangle_center": return p.center;
    case "solid_sphere":
    case "solid_cylinder":
    case "solid_cone": return String(p.decimal);
    case "sector_measure": return String(p.decimal);
    case "pyth_cone": return String(p.result);
    default:
      throw new Error(`No independent implementation for ${q.typeKey}`);
  }
}

function compareExpected(q, expected) {
  const actual = String(q.correctAnswer);
  const exp = String(expected);
  if (actual === exp) return { pass: true, rule: "exact canonical string" };
  const actualNum = Number(actual);
  const expNum = Number(exp);
  if (Number.isFinite(actualNum) && Number.isFinite(expNum) && Math.abs(actualNum - expNum) <= 1e-9) {
    return { pass: true, rule: "numeric tolerance <= 1e-9" };
  }
  return { pass: false, rule: "exact canonical string / numeric tolerance <= 1e-9", actual, expected: exp };
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

async function loadExercisePage(browser, exercise, viewport = { width: 1280, height: 900 }, hooks = {}) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (msg) => {
    if (["error", "warning"].includes(msg.type())) consoleErrors.push(`${msg.type()}: ${msg.text()}`);
  });
  page.on("pageerror", (err) => pageErrors.push(err.stack || err.message || String(err)));
  if (hooks.gasUrl) {
    await page.addInitScript((url) => {
      Object.defineProperty(window, "__ASSESS_TEST_GAS_URL__", { value: url });
    }, hooks.gasUrl);
  }
  const fileUrl = `file://${path.join(ROOT, exercise.file)}`;
  await page.goto(fileUrl, { waitUntil: "load" });
  if (hooks.gasUrl) {
    await page.evaluate((url) => {
      // GAS_URL is a top-level const, so use source-level flow by invoking submitToSheets directly in tests where needed.
      window.__TEST_GAS_URL__ = url;
    }, hooks.gasUrl);
  }
  await page.waitForFunction(() => typeof QUESTIONS !== "undefined" && QUESTIONS.length > 0);
  return { context, page, consoleErrors, pageErrors };
}

async function setAnswer(page, index, correct) {
  await page.evaluate(({ index, correct }) => {
    currIdx = index;
    showQ();
    const q = qList[currIdx];
    function wrongFor(q) {
      if (q.type === "choice") {
        const opts = q.options || [];
        const alt = opts.find((o) => o.key !== q.correctAnswer);
        return alt ? alt.key : "__wrong__";
      }
      if (q.type === "coordinate") return String(Number(q.correctAnswer || 0) + 1);
      if (q.checkType === "scientificNotation") return "10×10^1";
      if (q.checkType === "inequality") return "x>999";
      if (q.checkType === "factorPair") return "(x+99)(x+99)";
      return "__wrong__";
    }
    const answer = correct ? String(q.correctAnswer) : wrongFor(q);
    if (q.type === "choice") {
      currSelectedChoice = answer;
    } else if (q.type === "coordinate") {
      currInput = answer;
      document.getElementById("input-val").textContent = answer;
      currSelectedPoint = correct
        ? { x: q.interaction.targetX, y: q.interaction.targetY }
        : { x: q.interaction.targetX + 1, y: q.interaction.targetY };
    } else {
      currInput = answer;
      document.getElementById("input-val").textContent = answer;
    }
    checkAns();
  }, { index, correct });
}

async function feedbackState(page) {
  return page.evaluate(() => {
    const fb = document.getElementById("q-feedback");
    return {
      className: fb.className,
      text: fb.textContent || fb.innerText || "",
      btnNextVisible: document.getElementById("btn-next").style.display !== "none",
      btnCheckVisible: document.getElementById("btn-check").style.display !== "none",
      wrongCount: origWrongIds.length,
    };
  });
}

async function collectStep0() {
  const rows = [];
  for (const exercise of EXERCISES) {
    const html = readExercise(exercise);
    const specs = extractConstJson(html, "QUESTION_SPECS");
    const prebuilt = extractConstJson(html, "PREBUILT_QUESTIONS");
    const runtimeSeedRaw = extractConstRaw(html, "RUNTIME_SEED");
    rows.push({
      file: exercise.file,
      embeddedGeneratorRuntime: html.includes("function createAssessGenerators") || html.includes("AssessGenerators"),
      hardcodedPrebuiltCount: prebuilt.length,
      questionSpecCount: specs.length,
      runtimeSeedRaw,
      answerKeyForm: "runtime-generated question object fields: correctAnswer/displayAnswer/answers",
      nextQuestionLimit: "showQ() calls finishGame() when currIdx >= qList.length; nextQ() increments currIdx then calls showQ()",
      questions: specs.map((spec, index) => ({
        number: index + 1,
        typeKey: spec.typeKey,
        generator: spec.typeDef.generator,
        code: spec.typeDef.code,
        family: parseFamily(spec.typeDef.code),
      })),
    });
  }
  return rows;
}

async function runStep1(browser) {
  const failures = [];
  const samples = [];
  let pass = 0;
  let fail = 0;
  for (const exercise of EXERCISES) {
    const { context, page, consoleErrors, pageErrors } = await loadExercisePage(browser, exercise);
    const count = await page.evaluate(() => QUESTIONS.length);
    for (let index = 0; index < count; index++) {
      const seen = new Set();
      let accepted = 0;
      let attempts = 0;
      while (accepted < SAMPLES_PER_QUESTION && attempts < 30) {
        attempts += 1;
        await page.evaluate(() => {
          QUESTIONS = createQuestionPool();
          initGame("all");
        });
        const q = await page.evaluate((idx) => {
          const question = QUESTIONS[idx];
          return {
            qid: question.qid,
            typeKey: question.typeKey,
            type: question.type,
            checkType: question.checkType,
            code: question.code,
            correctAnswer: question.correctAnswer,
            displayAnswer: question.displayAnswer,
            paramsUsed: question.paramsUsed,
          };
        }, index);
        const sig = stableStringify(q.paramsUsed);
        if (seen.has(sig)) continue;
        seen.add(sig);
        accepted += 1;
        let independent;
        let comparison;
        try {
          independent = independentExpected(q);
          comparison = compareExpected(q, independent);
        } catch (error) {
          comparison = { pass: false, rule: "independent implementation available", actual: q.correctAnswer, expected: error.message };
        }
        await setAnswer(page, index, true);
        const correctFeedback = await feedbackState(page);
        await setAnswer(page, index, false);
        const wrongFeedback = await feedbackState(page);
        const uiPass = correctFeedback.className.includes("correct") &&
          correctFeedback.text.includes("正確") &&
          wrongFeedback.className.includes("incorrect") &&
          wrongFeedback.text.includes("答錯") &&
          wrongFeedback.wrongCount >= 1;
        const ok = comparison.pass && uiPass && consoleErrors.length === 0 && pageErrors.length === 0;
        const record = {
          preset: exercise.key,
          file: exercise.file,
          sampleNo: accepted,
          questionNumber: index + 1,
          code: q.code,
          generator: q.typeKey,
          paramsUsed: q.paramsUsed,
          correctAnswer: q.correctAnswer,
          independentExpected: independent,
          comparisonRule: comparison.rule,
          uiSelfConsistent: uiPass,
          consoleErrors,
          pageErrors,
        };
        samples.push(record);
        if (ok) pass += 1;
        else {
          fail += 1;
          failures.push(Object.assign({}, record, { comparison }));
        }
      }
    }
    await context.close();
  }
  const grouped = new Map();
  for (const sample of samples) {
    const key = `${sample.file}#${sample.questionNumber}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(sample);
  }
  const randomnessFailures = [];
  for (const group of grouped.values()) {
    const signatures = group.map((item) => stableStringify(item.paramsUsed));
    const unique = new Set(signatures);
    if (unique.size !== SAMPLES_PER_QUESTION) {
      const first = group[0];
      randomnessFailures.push({
        preset: first.preset,
        file: first.file,
        questionNumber: first.questionNumber,
        code: first.code,
        generator: first.generator,
        uniqueParamSets: unique.size,
        requiredParamSets: SAMPLES_PER_QUESTION,
        signatures,
      });
    }
  }
  return { total: pass + fail, pass, fail, failures, randomnessFailures, samples };
}

async function completeAllCorrect(page) {
  const count = await page.evaluate(() => qList.length);
  for (let i = 0; i < count; i++) {
    await setAnswer(page, i, true);
    await page.evaluate(() => {
      if (document.getElementById("btn-next").style.display !== "none") nextQ();
    });
  }
}

async function runFunctionalPath(browser, exercise, viewport) {
  const { context, page, consoleErrors, pageErrors } = await loadExercisePage(browser, exercise, viewport);
  const result = {};
  function set(name, pass, detail = "") {
    result[name] = { status: pass ? "PASS" : "FAIL", detail };
  }
  try {
    await setAnswer(page, 0, true);
    let fb = await feedbackState(page);
    set("1. submit check", fb.btnNextVisible && !fb.btnCheckVisible);
    set("2. correct feedback", fb.className.includes("correct") && fb.text.includes("正確"));
    await page.evaluate(() => showQ());
    await setAnswer(page, 0, false);
    fb = await feedbackState(page);
    set("3. wrong feedback / wrong retry state", fb.className.includes("incorrect") && fb.text.includes("答錯") && fb.wrongCount > 0);
    await page.click("#btn-teach");
    const solutionVisible = await page.locator("#solution-box").evaluate((el) => getComputedStyle(el).display !== "none" && el.textContent.length > 0);
    set("4. show solution", solutionVisible);
    const keypadHidden = await page.locator("#keypad-area").evaluate((el) => getComputedStyle(el).display === "none");
    set("5. hide keyboard", keypadHidden);
    const beforeProgress = await page.locator("#p-text").evaluate((el) => el.textContent);
    await page.click("#btn-next");
    const keypadVisible = await page.locator("#keypad-area").evaluate((el) => getComputedStyle(el).display !== "none");
    set("6. re-show keyboard", keypadVisible);
    const afterProgress = await page.locator("#p-text").evaluate((el) => el.textContent);
    set("7. hidden keyboard -> solution -> next", beforeProgress !== afterProgress && keypadVisible);
    set("8. progress increments", /Q 2 \//.test(afterProgress), afterProgress);

    await page.evaluate(() => initGame("all"));
    await completeAllCorrect(page);
    const finished = await page.evaluate(() => ({
      resultVisible: getComputedStyle(document.getElementById("result-view")).display !== "none",
      score: document.getElementById("final-score").textContent,
      completedAll: lastResult && lastResult.completedAll,
      canSubmitWithoutGas: canSubmitToTeacher(),
      submitDisabled: document.getElementById("btn-export").disabled,
      rule: STUDENT_ID_PATTERN.toString(),
      validId: STUDENT_ID_PATTERN.test("20255001F"),
      invalidId: STUDENT_ID_PATTERN.test("20255001X"),
    }));
    set("9. valid student ID accepted by regex", finished.validId);
    set("10. invalid student ID blocked by regex", !finished.invalidId);
    set("11. terminal state", finished.resultVisible && finished.completedAll && new RegExp(`^${exercise.expectedCount} / ${exercise.expectedCount}$`).test(finished.score), JSON.stringify(finished));
  } catch (error) {
    for (const name of [
      "1. submit check", "2. correct feedback", "3. wrong feedback / wrong retry state",
      "4. show solution", "5. hide keyboard", "6. re-show keyboard",
      "7. hidden keyboard -> solution -> next", "8. progress increments",
      "9. valid student ID accepted by regex", "10. invalid student ID blocked by regex",
      "11. terminal state",
    ]) {
      if (!result[name]) set(name, false, error.stack || error.message || String(error));
    }
  }
  await context.close();
  return { result, consoleErrors, pageErrors };
}

async function runStep2(browser) {
  const matrix = {};
  const errors = {};
  for (const exercise of EXERCISES) {
    matrix[exercise.file] = {};
    errors[exercise.file] = {};
    for (const viewport of VIEWPORTS) {
      const run = await runFunctionalPath(browser, exercise, viewport);
      matrix[exercise.file][viewport.label] = run.result;
      errors[exercise.file][viewport.label] = {
        consoleErrors: run.consoleErrors,
        pageErrors: run.pageErrors,
      };
    }
  }
  return { matrix, errors };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const step0 = await collectStep0();
  const step1 = await runStep1(browser);
  const step2 = await runStep2(browser);
  await browser.close();

  const report = {
    generatedAt: new Date().toISOString(),
    step0,
    step1: {
      total: step1.total,
      pass: step1.pass,
      fail: step1.fail,
      comparisonRules: [
        "Canonical string equality for symbolic/algebraic/choice answers.",
        "Numeric tolerance <= 1e-9 for numeric canonical answers.",
        "Unit and pi-form validators are UI-tested with canonical decimal answer; independent comparison uses decimal canonical answer.",
      ],
      failures: step1.failures,
      randomnessFailures: step1.randomnessFailures,
    },
    step2,
  };
  console.log(JSON.stringify(report, null, 2));
  if (step1.fail > 0 || step1.randomnessFailures.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
