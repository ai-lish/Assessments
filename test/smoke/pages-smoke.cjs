#!/usr/bin/env node
/*
  Manual full-platform smoke test for the published Assessments GitHub Pages tool.

  This script intentionally is not wired into CI. Run manually with:

    tmpdir=$(mktemp -d /tmp/pw-smoke-XXXXXX)
    (cd "$tmpdir" && npm init -y >/dev/null && npm install playwright@latest >/dev/null)
    NODE_PATH="$tmpdir/node_modules" node test/smoke/pages-smoke.cjs

  Browser binaries, if missing:

    npx -y playwright@latest install chromium webkit

  Outputs:
    test/smoke/artifacts/smoke-report.json
    test/smoke/artifacts/*.html
    test/smoke/artifacts/*.png on failures
*/

const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { chromium, webkit } = require("playwright");
const { formatExactPiAnswer } = require("./pi-answer.cjs");

const PAGE_URL = process.env.PAGE_URL || "https://ai-lish.github.io/Assessments/tool/index.html";
const BANK_URL = process.env.BANK_URL || "https://raw.githubusercontent.com/ai-lish/Assessments/main/question-bank.json";
const TEMPLATE_URL = process.env.TEMPLATE_URL || "https://raw.githubusercontent.com/ai-lish/Assessments/main/templates/student.html";
const ARTIFACT_DIR = path.resolve(__dirname, "artifacts");
const RUN_ID = new Date().toISOString().replace(/[:.]/g, "-");
const CODE_RE = /^LSC-\d{4}-S\d+-T\d+-\d{2}-(NA|ME|GE|DH|UC)-\d+$/;

const PRESETS = [
  { key: "s1_term3_part_a", grade: "s1", term: "3", expected: 16 },
  { key: "s1_term2_part_a", grade: "s1", term: "2", expected: 14 },
  { key: "s2_term3_part_a", grade: "s2", term: "3", expected: 16 },
  { key: "s3_term3_part_a", grade: "s3", term: "3", expected: 14 },
];

const PROJECTS = [
  { name: "chromium-desktop", browserType: chromium, viewport: { width: 1920, height: 1080 } },
  { name: "webkit-ipad-sim", browserType: webkit, viewport: { width: 1024, height: 768 }, note: "WebKit engine simulation; not real iPad Safari." },
  { name: "webkit-iphone-sim", browserType: webkit, viewport: { width: 390, height: 844 }, mobileOnly: true, note: "WebKit engine simulation; not real iPhone Safari." },
];

fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fileNameSafe(s) {
  return String(s).replace(/[^a-zA-Z0-9_.-]+/g, "_");
}

async function screenshot(page, name) {
  const out = path.join(ARTIFACT_DIR, `${RUN_ID}-${fileNameSafe(name)}.png`);
  await page.screenshot({ path: out, fullPage: true }).catch(() => {});
  return out;
}

async function record(report, project, item, status, detail = {}) {
  report.results.push({
    project,
    item,
    status,
    ...detail,
  });
}

async function step(report, project, item, page, fn) {
  process.stdout.write(`[smoke] ${project} ${item} ... `);
  try {
    const detail = await Promise.race([
      fn(),
      new Promise((_, reject) => setTimeout(() => reject(new Error(`step timeout after 120000 ms: ${item}`)), 120000)),
    ]);
    await record(report, project, item, "pass", detail || {});
    process.stdout.write("PASS\n");
    return detail;
  } catch (error) {
    const screenshotPath = page ? await screenshot(page, `${project}-${item}`) : null;
    await record(report, project, item, "fail", {
      error: error && error.message ? error.message : String(error),
      screenshotPath,
    });
    process.stdout.write(`FAIL: ${error && error.message ? error.message : String(error)}\n`);
    return null;
  }
}

async function newContext(browser, viewport) {
  const context = await browser.newContext({
    viewport,
    acceptDownloads: true,
    ignoreHTTPSErrors: true,
  });
  return context;
}

async function loadTeacher(page) {
  let lastError = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const cache = `smoke=${Date.now()}-${Math.random().toString(36).slice(2)}`;
    try {
      await page.goto(`${PAGE_URL}?${cache}`, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForFunction(() => typeof loadAll === "function" && window.AssessGenerators && window.AssessValidators, null, { timeout: 30000 });
      await page.fill("#bankUrl", `${BANK_URL}?${cache}`);
      await page.fill("#tmplUrl", `${TEMPLATE_URL}?${cache}`);
      await page.click('button[onclick="loadAll()"]');
      await page.waitForFunction(() => !!document.querySelector('#sel-grade option[value="s1"]'), null, { timeout: 45000 });
      await page.waitForFunction(() => /載入成功|已載入/.test(document.getElementById("loadStatus").innerText), null, { timeout: 45000 });
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function selectCascade(page, grade, term, topic) {
  await page.selectOption("#sel-grade", grade || "");
  await page.waitForTimeout(50);
  if (term !== undefined) {
    await page.selectOption("#sel-term", term || "");
    await page.waitForTimeout(50);
  }
  if (topic !== undefined) {
    await page.selectOption("#sel-topic", topic || "");
    await page.waitForTimeout(50);
  }
}

async function countVisibleQuestions(page) {
  return page.locator("#qlist-browser button[data-key]").count();
}

async function sumQuestionCountsForGradeTerm(page, grade, term) {
  await selectCascade(page, grade, term, "");
  const noTopicCount = await countVisibleQuestions(page);
  const topics = await page.locator("#sel-topic option").evaluateAll((opts) => opts.map((o) => o.value).filter(Boolean));
  let total = 0;
  const byTopic = {};
  for (const topic of topics) {
    await selectCascade(page, grade, term, topic);
    const n = await countVisibleQuestions(page);
    byTopic[topic] = n;
    total += n;
  }
  return { total, byTopic, noTopicCount };
}

async function loadPresetAndPreview(page, presetKey) {
  await page.evaluate((key) => {
    switchMode("preset");
    loadPreset(key);
    generatePreview();
  }, presetKey);
  await page.waitForFunction(() => document.querySelectorAll(".preview-card").length === basket.length && basket.length > 0, null, { timeout: 30000 });
  await page.evaluate(() => confirmAll());
  await page.waitForFunction(() => !document.getElementById("btn-export").disabled, null, { timeout: 10000 });
}

async function checkCodesAndCopy(page, preset) {
  await loadPresetAndPreview(page, preset.key);
  const sample = await page.evaluate(() => {
    const idxs = [0, Math.floor((basket.length - 1) / 2), basket.length - 1];
    return idxs.map((idx) => ({ idx, code: basket[idx].typeDef.code, key: basket[idx].typeKey }));
  });
  for (const item of sample) {
    assert(CODE_RE.test(item.code), `${preset.key} ${item.key} invalid code ${item.code}`);
    const button = page.locator(".preview-card .copy-code").nth(item.idx);
    await button.click();
    await page.waitForFunction((code) => document.getElementById("previewSummary").innerText.includes(code), item.code, { timeout: 5000 });
  }
  return { sampledCodes: sample };
}

async function simText(page, index, answer) {
  return page.evaluate(({ index, answer }) => {
    const b = basket[index - 1];
    toggleSimulation(b.id);
    const input = document.getElementById("sim-input-" + b.id);
    if (!input) throw new Error("missing simulation input for " + b.typeKey);
    input.value = answer;
    submitSimulation(b.id);
    const text = document.getElementById("sim-result-" + b.id).innerText;
    closeSimulation();
    return { key: b.typeKey, code: b.typeDef.code, text, ok: /正確/.test(text), err: /錯誤/.test(text) };
  }, { index, answer });
}

async function simChoice(page, index, answer) {
  return page.evaluate(({ index, answer }) => {
    const b = basket[index - 1];
    toggleSimulation(b.id);
    const input = document.querySelector(`input[name="sim-${b.id}"][value="${answer}"]`);
    if (!input) throw new Error("missing simulation choice for " + b.typeKey + ": " + answer);
    input.checked = true;
    submitSimulation(b.id);
    const text = document.getElementById("sim-result-" + b.id).innerText;
    closeSimulation();
    return { key: b.typeKey, code: b.typeDef.code, text, ok: /正確/.test(text), err: /錯誤/.test(text) };
  }, { index, answer });
}

async function simCoordinate(page, index, answer, useCorrectPoint) {
  return page.evaluate(({ index, answer, useCorrectPoint }) => {
    const b = basket[index - 1];
    const q = b.generated;
    toggleSimulation(b.id);
    const x = useCorrectPoint ? q.interaction.targetX : q.interaction.targetX + 1;
    const y = useCorrectPoint ? q.interaction.targetY : q.interaction.targetY;
    selectSimCoordinate(b.id, x, y);
    document.getElementById("sim-input-" + b.id).value = answer;
    submitSimulation(b.id);
    const text = document.getElementById("sim-result-" + b.id).innerText;
    closeSimulation();
    return { key: b.typeKey, code: b.typeDef.code, text, ok: /正確/.test(text), err: /錯誤/.test(text) };
  }, { index, answer, useCorrectPoint });
}

async function runPresetSimulation(page, preset) {
  await loadPresetAndPreview(page, preset.key);
  if (preset.key === "s1_term3_part_a") {
    const coord = await page.evaluate(() => basket[13].generated);
    const axis = coord.interaction.askAxis === "x" ? coord.interaction.targetX : coord.interaction.targetY;
    const correctCoord = await simCoordinate(page, 14, String(axis), true);
    const wrongText = await simCoordinate(page, 14, String(axis + 1), true);
    const wrongClick = await simCoordinate(page, 14, String(axis), false);
    const congruence = await page.evaluate(() => {
      const q = Object.assign({}, basket[12].generated, { correctAnswer: "S.A.S.", answers: ["S.A.S."] });
      return {
        key: basket[12].typeKey,
        code: basket[12].typeDef.code,
        sasLower: AssessValidators.checkAnswer(q, "sas"),
        dotted: AssessValidators.checkAnswer(q, "s.a.s."),
        assWrong: AssessValidators.checkAnswer(q, "ass"),
      };
    });
    assert(correctCoord.ok, "s1 term3 coordinate correct answer failed");
    assert(wrongText.err, "s1 term3 coordinate wrong text did not fail");
    assert(wrongClick.err, "s1 term3 coordinate wrong click did not fail");
    assert(congruence.sasLower && congruence.dotted && !congruence.assWrong, "s1 term3 congruence SAS normalization failed");
    return { checks: [correctCoord, wrongText, wrongClick, congruence] };
  }

  if (preset.key === "s1_term2_part_a") {
    const signed = await page.evaluate(() => {
      const t = basket[2].typeDef;
      const q = AssessGenerators.generateQuestion(t, { a: -2, b: -3 });
      q.type = "text";
      q.validator = t.validator;
      return {
        key: t.key,
        code: t.code,
        minusAscii: AssessValidators.checkAnswer(q, "-5"),
        minusUnicode: AssessValidators.checkAnswer(q, "−5"),
        wrong: AssessValidators.checkAnswer(q, "5"),
      };
    });
    const polyWrong = await page.evaluate(() => {
      const b = basket[8];
      const q = b.generated;
      const ans = String(q.correctAnswer);
      const parts = ans.replace(/-/g, "+-").split("+").filter(Boolean);
      const reversed = parts.slice().reverse().join("+").replace(/\+-/g, "-");
      return {
        key: b.typeKey,
        code: b.typeDef.code,
        correct: AssessValidators.checkAnswer(q, ans),
        reversed,
        reversedOk: AssessValidators.checkAnswer(q, reversed),
      };
    });
    const choice = await page.evaluate(() => basket[13].generated.correctAnswer);
    const choiceGood = await simChoice(page, 14, choice);
    const choiceBad = await page.evaluate(() => {
      const b = basket[13];
      const bad = b.generated.options.find((o) => o.key !== b.generated.correctAnswer).key;
      return bad;
    });
    const choiceWrong = await simChoice(page, 14, choiceBad);
    assert(signed.minusAscii && signed.minusUnicode && !signed.wrong, "s1 term2 Q03 signed numeric normalization failed");
    assert(polyWrong.correct && !polyWrong.reversedOk, "s1 term2 Q09 descending strict order failed");
    assert(choiceGood.ok && choiceWrong.err, "s1 term2 Q14 choice simulation failed");
    return { checks: [signed, polyWrong, choiceGood, choiceWrong] };
  }

  if (preset.key === "s2_term3_part_a") {
    const s2 = await page.evaluate(() => {
      const bracket = basket[3].generated;
      const discount = basket[12].generated;
      const profit = basket[13].generated;
      const root = basket[14].generated;
      return {
        bracketKey: basket[3].typeKey,
        bracketUnicodeMinus: AssessValidators.checkAnswer(bracket, String(bracket.correctAnswer).replace("-", "−")),
        discountKey: basket[12].typeKey,
        discountDollar: AssessValidators.checkAnswer(discount, `$${discount.correctAnswer}`),
        profitKey: basket[13].typeKey,
        profitPercent: AssessValidators.checkAnswer(profit, `${profit.correctAnswer}%`),
        rootKey: basket[14].typeKey,
        rootCorrect: AssessValidators.checkAnswer(root, root.correctAnswer),
        rootSingleWrong: AssessValidators.checkAnswer(root, String(root.correctAnswer).replace("±", "")),
      };
    });
    assert(s2.bracketUnicodeMinus, "s2 term3 equation unicode minus normalization failed");
    assert(s2.discountDollar, "s2 term3 discount dollar sign normalization failed");
    assert(s2.profitPercent, "s2 term3 profit percent sign normalization failed");
    assert(s2.rootCorrect && !s2.rootSingleWrong, "s2 term3 square-root ± check failed");
    return { checks: [s2] };
  }

  if (preset.key === "s3_term3_part_a") {
    const sci = await page.evaluate(() => {
      const b = basket[6];
      const q = b.generated;
      const m = q.answerSpec.mantissa;
      const e = q.answerSpec.exponent;
      return {
        key: b.typeKey,
        code: b.typeDef.code,
        times: AssessValidators.checkAnswer(q, `${m}×10^${e}`),
        x: AssessValidators.checkAnswer(q, `${m}x10^${e}`),
        star: AssessValidators.checkAnswer(q, `${m}*10^${e}`),
        badMantissa: AssessValidators.checkAnswer(q, `${m * 10}×10^${e - 1}`),
      };
    });
    const ineq = await page.evaluate(() => {
      const b = basket[7];
      const q = b.generated;
      const good = q.correctAnswer;
      const bad = good.includes(">") ? good.replace(">", "<") : good.replace("<", ">");
      return {
        key: b.typeKey,
        code: b.typeDef.code,
        good,
        goodOk: AssessValidators.checkAnswer(q, good),
        bad,
        badOk: AssessValidators.checkAnswer(q, bad),
      };
    });
    const center = await simChoice(page, 9, await page.evaluate(() => basket[8].generated.correctAnswer));
    const measureMeta = await page.evaluate(() => {
      const b = basket[9];
      const q = b.generated;
      return {
        exactPiCoefficient: q.answerSpec && q.answerSpec.exactPiCoefficient,
        displayAnswer: q.displayAnswer,
      };
    });
    const piAnswer = formatExactPiAnswer(measureMeta.exactPiCoefficient, measureMeta.displayAnswer);
    const measure = await page.evaluate((answer) => {
      const b = basket[9];
      const q = b.generated;
      return {
        key: b.typeKey,
        code: b.typeDef.code,
        decimal: AssessValidators.checkAnswer(q, q.correctAnswer),
        pi: AssessValidators.checkAnswer(q, answer),
        piAnswer: answer,
      };
    }, piAnswer);
    assert(sci.times && sci.x && sci.star && !sci.badMantissa, "s3 term3 Q07 scientific notation failed");
    assert(ineq.goodOk && !ineq.badOk, "s3 term3 Q08 inequality direction failed");
    assert(center.ok, "s3 term3 Q09 triangle center choice failed");
    assert(measure.decimal && measure.pi, "s3 term3 Q10 unitNumeric pi/decimal failed");
    return { checks: [sci, ineq, center, measure] };
  }
  throw new Error("unknown preset " + preset.key);
}

async function exportPreset(page, preset, projectName) {
  await loadPresetAndPreview(page, preset.key);
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 30000 }),
    page.evaluate(() => exportStudent()),
  ]);
  const out = path.join(ARTIFACT_DIR, `${RUN_ID}-${projectName}-${preset.key}.html`);
  await download.saveAs(out);
  return out;
}

async function answerCurrentInStudent(correct) {
  return {
    correct,
  };
}

async function runStudentExportChecks(context, exportedPath, preset) {
  const page = await context.newPage();
  await page.goto(pathToFileURL(exportedPath).href, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForFunction(() => typeof initGame === "function" && typeof qList !== "undefined" && qList.length > 0, null, { timeout: 30000 });

  const grading = await page.evaluate(() => {
    function applyAnswer(q, correct) {
      currInput = "";
      currSelectedChoice = null;
      currSelectedPoint = null;
      if (q.type === "choice" || q.type === "congruence") {
        currSelectedChoice = correct ? q.correctAnswer : "__wrong__";
        if (!correct && q.options && q.options.length) {
          const bad = q.options.find((o) => o.key !== q.correctAnswer);
          currSelectedChoice = bad ? bad.key : "__wrong__";
        }
      } else if (q.type === "coordinate") {
        currSelectedPoint = correct ? { x: q.interaction.targetX, y: q.interaction.targetY } : { x: q.interaction.targetX + 1, y: q.interaction.targetY };
        currInput = correct ? String(q.interaction.askAxis === "x" ? q.interaction.targetX : q.interaction.targetY) : "999";
      } else {
        currInput = correct ? String(q.correctAnswer) : "__wrong__";
      }
    }
    const checks = [];
    for (const idx of [0, 1, 2]) {
      currIdx = idx;
      showQ();
      applyAnswer(qList[idx], true);
      checkAns();
      checks.push({ idx, key: qList[idx].typeKey, mode: "correct", ok: document.getElementById("q-feedback").innerText.includes("正確") });
      answered = false;
      currIdx = idx;
      showQ();
      applyAnswer(qList[idx], false);
      checkAns();
      checks.push({ idx, key: qList[idx].typeKey, mode: "wrong", ok: document.getElementById("q-feedback").innerText.includes("答錯") });
    }
    return checks;
  });
  assert(grading.every((x) => x.ok), `${preset.key} exported student grading failed`);

  const retryAndPayload = await page.evaluate(() => {
    function applyAnswer(q, correct) {
      currInput = "";
      currSelectedChoice = null;
      currSelectedPoint = null;
      if (q.type === "choice" || q.type === "congruence") {
        if (correct) currSelectedChoice = q.correctAnswer;
        else {
          const bad = q.options && q.options.find((o) => o.key !== q.correctAnswer);
          currSelectedChoice = bad ? bad.key : "__wrong__";
        }
      } else if (q.type === "coordinate") {
        currSelectedPoint = correct ? { x: q.interaction.targetX, y: q.interaction.targetY } : { x: q.interaction.targetX + 1, y: q.interaction.targetY };
        currInput = correct ? String(q.interaction.askAxis === "x" ? q.interaction.targetX : q.interaction.targetY) : "999";
      } else {
        currInput = correct ? String(q.correctAnswer) : "__wrong__";
      }
    }
    function answerRound(firstWrong) {
      for (let i = 0; i < qList.length; i += 1) {
        applyAnswer(qList[i], !(firstWrong && i === 0));
        checkAns();
        nextQ();
      }
    }
    initGame("all");
    answerRound(true);
    const afterInitial = {
      attempts: allAttempts.length,
      remaining: lastResult.remainingWrongCount,
      qid: lastResult.details.find((d) => !d.correct).qid,
    };
    initGame("wrong");
    answerRound(false);
    const afterWrongRetry = {
      attempts: allAttempts.length,
      attemptType: lastResult.attemptType,
      completedAll: lastResult.completedAll,
      remaining: lastResult.remainingWrongCount,
    };
    retrySingle(afterInitial.qid);
    applyAnswer(qList[currIdx], true);
    checkAns();
    finishGame();
    const afterSingle = {
      attempts: allAttempts.length,
      resultDisplay: getComputedStyle(document.getElementById("result-view")).display,
      quizDisplay: getComputedStyle(document.getElementById("quiz-view")).display,
    };
    const rows = allAttempts.map((r) => ({
      studentId: "s20271001m",
      toolId: TOOL_ID,
      attemptNumber: r.attemptNumber,
      attemptType: r.attemptType,
      score: r.score,
      total: r.total,
      remainingWrongCount: r.remainingWrongCount,
      completedAll: r.completedAll,
      date: r.date,
      time: r.time,
    }));
    return { afterInitial, afterWrongRetry, afterSingle, rows, fields: Object.keys(rows[0] || {}) };
  });
  const required = ["studentId", "toolId", "attemptNumber", "attemptType", "score", "total", "remainingWrongCount", "completedAll", "date", "time"];
  assert(retryAndPayload.afterInitial.remaining > 0, `${preset.key} did not create wrong item`);
  assert(retryAndPayload.afterWrongRetry.attemptType === "wrong_retry", `${preset.key} wrong retry attemptType failed`);
  assert(retryAndPayload.afterWrongRetry.completedAll === true, `${preset.key} wrong retry did not complete all`);
  assert(retryAndPayload.afterSingle.attempts === retryAndPayload.afterWrongRetry.attempts, `${preset.key} single retry changed attempt count`);
  assert(retryAndPayload.afterSingle.resultDisplay !== "none", `${preset.key} single retry did not return result page`);
  assert(required.every((f) => retryAndPayload.fields.includes(f)), `${preset.key} Google Sheets payload fields missing`);
  await page.close();
  return { grading, retryAndPayload };
}

async function runMobileChecks(context, exportedPath) {
  const page = await context.newPage();
  await page.goto(pathToFileURL(exportedPath).href, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForFunction(() => typeof initGame === "function" && typeof qList !== "undefined" && qList.length > 0, null, { timeout: 30000 });
  const result = await page.evaluate(() => {
    const scrollOk = document.documentElement.scrollWidth <= window.innerWidth + 2;
    const svgOk = Array.from(document.querySelectorAll("svg")).every((svg) => svg.getBoundingClientRect().width <= window.innerWidth + 2);
    const keypadText = document.getElementById("keypad").innerText;
    const keypadOk = keypadText.includes("≥") && keypadText.includes("≤");
    kp("≥");
    const inequalityKeyInput = currInput.includes("≥");
    clearInput();
    kp("1");
    const before = currInput;
    checkAns();
    if (document.getElementById("btn-next").style.display !== "none") nextQ();
    const cleared = currInput === "" && document.getElementById("input-val").innerText === "";
    return { scrollOk, svgOk, keypadOk, inequalityKeyInput, before, cleared, width: window.innerWidth, scrollWidth: document.documentElement.scrollWidth };
  });
  await page.close();
  assert(result.scrollOk, `mobile horizontal scroll: width=${result.width} scrollWidth=${result.scrollWidth}`);
  assert(result.svgOk, "mobile SVG overflow");
  assert(result.keypadOk && result.inequalityKeyInput, "mobile inequality keypad failed");
  assert(result.cleared, "mobile next question did not clear input");
  return result;
}

async function runProject(report, project) {
  const browser = await project.browserType.launch({ headless: true });
  const context = await newContext(browser, project.viewport);
  const page = await context.newPage();
  page.on("dialog", (dialog) => dialog.accept().catch(() => {}));
  const exported = {};

  if (project.mobileOnly) {
    await step(report, project.name, "mobile-layout-student", page, async () => {
      const desktopContext = await newContext(browser, { width: 1280, height: 900 });
      const toolPage = await desktopContext.newPage();
      toolPage.on("dialog", (dialog) => dialog.accept().catch(() => {}));
      await loadTeacher(toolPage);
      const out = await exportPreset(toolPage, PRESETS[2], project.name);
      await toolPage.close();
      await desktopContext.close();
      return runMobileChecks(context, out);
    });
    await page.close().catch(() => {});
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
    return;
  }

  await step(report, project.name, "A-load", page, async () => {
    await loadTeacher(page);
    const info = await page.evaluate(() => ({ dataCount: bank.data.length, presetCount: bank.presets.length }));
    assert(info.dataCount === 62, `expected 62 question types, got ${info.dataCount}`);
    assert(info.presetCount === 4, `expected 4 presets, got ${info.presetCount}`);
    return info;
  });

  await step(report, project.name, "B-filter", page, async () => {
    const gradeOnly = {};
    await selectCascade(page, "s1");
    gradeOnly.s1 = await countVisibleQuestions(page);
    const checks = {};
    for (const preset of PRESETS) {
      const got = await sumQuestionCountsForGradeTerm(page, preset.grade, preset.term);
      checks[preset.key] = got;
      assert(got.noTopicCount === 0, `${preset.key} showed questions without topic`);
      assert(got.total === preset.expected, `${preset.key} expected ${preset.expected}, got ${got.total}`);
    }
    assert(gradeOnly.s1 === 0, `grade-only filter expected 0, got ${gradeOnly.s1}`);
    return { gradeOnly, checks };
  });

  for (const preset of PRESETS) {
    await step(report, project.name, `C-code-${preset.key}`, page, () => checkCodesAndCopy(page, preset));
    await step(report, project.name, `D-simulation-${preset.key}`, page, () => runPresetSimulation(page, preset));
    await step(report, project.name, `E-export-download-${preset.key}`, page, async () => {
      const out = await exportPreset(page, preset, project.name);
      exported[preset.key] = out;
      assert(fs.existsSync(out) && fs.statSync(out).size > 10000, `${preset.key} downloaded HTML too small`);
      return { path: out, bytes: fs.statSync(out).size };
    });
    await step(report, project.name, `E-student-${preset.key}`, null, () => runStudentExportChecks(context, exported[preset.key], preset));
  }

  if (project.name === "chromium-desktop" && exported.s3_term3_part_a) {
    await step(report, project.name, "F-mobile-390x844-exported-s3", page, async () => {
      const mobileContext = await newContext(browser, { width: 390, height: 844 });
      const result = await runMobileChecks(mobileContext, exported.s3_term3_part_a);
      await mobileContext.close();
      return result;
    });
  }

  await page.close().catch(() => {});
  await context.close().catch(() => {});
  await browser.close().catch(() => {});
}

async function main() {
  const report = {
    runId: RUN_ID,
    pageUrl: PAGE_URL,
    bankUrl: BANK_URL,
    templateUrl: TEMPLATE_URL,
    note: "webkit projects are engine simulations, not real iPad/iPhone Safari devices.",
    results: [],
  };

  for (const project of PROJECTS) {
    await runProject(report, project);
  }

  const out = path.join(ARTIFACT_DIR, "smoke-report.json");
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  const failures = report.results.filter((r) => r.status !== "pass");
  console.log(JSON.stringify({
    report: out,
    total: report.results.length,
    passed: report.results.length - failures.length,
    failed: failures.length,
    failures,
  }, null, 2));
  if (failures.length) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
