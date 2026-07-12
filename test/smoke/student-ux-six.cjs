#!/usr/bin/env node
'use strict';

/*
  Manual browser contract for the six-item student UX change.
  Run against a locally served generated archive or a deployed preview:
    NODE_PATH=<playwright-node-modules> node test/smoke/student-ux-six.cjs \
      http://127.0.0.1:8765
*/

const { chromium } = require('playwright');
const fs = require('fs');

const base = (process.argv[2] || 'http://127.0.0.1:8765').replace(/\/$/, '');
const target = `${base}/2526/s1/t2/part-a-01.html`;
const profiles = [
  { name: 'desktop-1920x1080', viewport: { width: 1920, height: 1080 } },
  { name: 'phone-390x844', viewport: { width: 390, height: 844 } },
];

const results = [];
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitMath(page) {
  await page.waitForFunction(() => window.MathJax && MathJax.startup && MathJax.startup.promise);
  await page.evaluate(() => MathJax.startup.promise);
}

async function popupContract(page, buttonId) {
  const popupPromise = page.waitForEvent('popup');
  await page.click(buttonId);
  const popup = await popupPromise;
  await popup.waitForLoadState('load');
  await popup.waitForFunction(() => document.body && document.body.dataset.printReady === 'true');
  const state = await popup.evaluate(() => ({
    student: Boolean(document.querySelector('[data-mode="student"]')),
    teacher: Boolean(document.querySelector('[data-mode="teacher"]')),
    guidance: Boolean(document.querySelector('.pdf-preview-note')),
    printCalls: window.__uxPrintCalls || 0,
  }));
  await popup.close();
  assert(state.student && state.teacher && state.guidance, `${buttonId} preview content incomplete`);
  assert(state.printCalls === 0, `${buttonId} called window.print ${state.printCalls} time(s)`);
  return state;
}

async function runProfile(browser, profile) {
  const context = await browser.newContext({ viewport: profile.viewport });
  await context.addInitScript(() => {
    window.__uxPrintCalls = 0;
    window.print = () => { window.__uxPrintCalls += 1; };
  });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(target, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof qList !== 'undefined' && qList.length > 1);
  await waitMath(page);

  const controls = await page.evaluate(() => {
    const ids = ['btn-similar-pdf', 'btn-whole-pdf', 'btn-shift-keypad'];
    const rects = ids.map((id) => {
      const element = document.getElementById(id);
      const rect = element.getBoundingClientRect();
      return { id, text: element.textContent.trim(), left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
    });
    const keys = [...document.querySelectorAll('#keypad .key')];
    return {
      rects,
      horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      keyRows: new Set(keys.map((key) => Math.round(key.getBoundingClientRect().top))).size,
      keyLabels: keys.map((key) => key.textContent.trim()),
    };
  });
  assert(new Set(controls.rects.map((rect) => Math.round(rect.top))).size === 1, `${profile.name} utility controls are not on one row`);
  assert(controls.rects.every((rect, index) => index === 0 || rect.left >= controls.rects[index - 1].right), `${profile.name} utility controls overlap`);
  assert(controls.horizontalOverflow <= 0, `${profile.name} horizontal overflow ${controls.horizontalOverflow}`);
  assert(controls.keyRows === 3, `${profile.name} keypad has ${controls.keyRows} rows`);
  ['+', '−', '×', '÷'].forEach((key) => assert(controls.keyLabels.includes(key), `${profile.name} missing fixed ${key}`));

  await page.evaluate(() => {
    window.__uxShifts = [];
    new PerformanceObserver((list) => list.getEntries().forEach((entry) => window.__uxShifts.push(entry.value)))
      .observe({ type: 'layout-shift', buffered: false });
  });
  const action = await page.evaluate(async () => {
    const frames = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const top = () => document.getElementById('action-area').getBoundingClientRect().top;
    const before = top();
    currInput = String(qList[currIdx].correctAnswer);
    renderInputDisplay();
    checkAns();
    await frames();
    const afterCheck = top();
    toggleTeach();
    await frames();
    const afterSolution = top();
    nextQ();
    await frames();
    const afterNext = top();
    return { before, afterCheck, afterSolution, afterNext, cls: (window.__uxShifts || []).reduce((sum, value) => sum + value, 0) };
  });
  const tops = [action.before, action.afterCheck, action.afterSolution, action.afterNext];
  assert(Math.max(...tops) - Math.min(...tops) < 0.5, `${profile.name} action-area moved: ${JSON.stringify(tops)}`);
  assert(action.cls < 0.05, `${profile.name} interaction CLS ${action.cls}`);

  const answerRendering = await page.evaluate(async () => {
    const waitFrames = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const originalTypeset = MathJax.typesetPromise.bind(MathJax);
    window.__uxMathTargets = [];
    MathJax.typesetPromise = (targets) => {
      window.__uxMathTargets.push((targets || []).map((target) => target && target.id));
      return originalTypeset(targets);
    };

    const fraction = QUESTIONS.find((q) => q.typeKey === 's1t2_solve_eq_fraction');
    qList = [fraction]; currIdx = 0; showQ(); await waitFrames();
    window.__uxMathTargets = [];
    currInput = '999999'; checkAns(); await waitFrames();
    const mathTargets = window.__uxMathTargets.flat();
    const mathRendered = Boolean(document.querySelector('#feedback-answer mjx-container'));
    const rawAccepted = checkAnswer(fraction, fraction.correctAnswer);
    const match = String(fraction.correctAnswer).match(/^(-?\d+)\/(\d+)$/);
    const latexInput = match ? `\\frac{${match[1]}}{${match[2]}}` : '\\frac{3}{2}';
    const latexAccepted = checkAnswer(fraction, latexInput);

    window.__uxMathTargets = [];
    toggleTeach(); await waitFrames();
    const solutionTargets = window.__uxMathTargets.flat();

    const integer = QUESTIONS.find((q) => q.typeKey === 'directed_add');
    qList = [integer]; currIdx = 0; showQ(); await waitFrames();
    window.__uxMathTargets = [];
    currInput = '999999'; checkAns(); await waitFrames();
    const integerTargets = window.__uxMathTargets.flat();
    const integerRendered = Boolean(document.querySelector('#feedback-answer mjx-container'));
    MathJax.typesetPromise = originalTypeset;
    return { mathTargets, mathRendered, rawAccepted, latexAccepted, solutionTargets, integerTargets, integerRendered };
  });
  assert(answerRendering.mathRendered, `${profile.name} mathematical answer was not rendered by MathJax`);
  assert(answerRendering.mathTargets.length === 1 && answerRendering.mathTargets[0] === 'feedback-answer',
    `${profile.name} answer typeset targets ${JSON.stringify(answerRendering.mathTargets)}`);
  assert(answerRendering.solutionTargets.length === 1 && answerRendering.solutionTargets[0] === 'solution-box',
    `${profile.name} solution typeset targets ${JSON.stringify(answerRendering.solutionTargets)}`);
  assert(!answerRendering.integerRendered && answerRendering.integerTargets.length === 0,
    `${profile.name} pure integer unexpectedly used MathJax`);
  assert(answerRendering.rawAccepted && !answerRendering.latexAccepted,
    `${profile.name} display/input separation changed`);

  const popupState = profile.name.startsWith('desktop')
    ? { similar: await popupContract(page, '#btn-similar-pdf'), whole: await popupContract(page, '#btn-whole-pdf') }
    : null;
  assert(errors.length === 0, `${profile.name} console/page errors: ${errors.join(' | ')}`);
  await context.close();
  return { profile: profile.name, controls, action, answerRendering, popupState, errors };
}

(async () => {
  const chrome = process.env.PLAYWRIGHT_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const browser = await chromium.launch({ headless: true, ...(fs.existsSync(chrome) ? { executablePath: chrome } : {}) });
  try {
    for (const profile of profiles) results.push(await runProfile(browser, profile));
  } finally {
    await browser.close();
  }
  console.log(JSON.stringify({ target, results }, null, 2));
  console.log('student UX browser contract: PASS');
})().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
