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
const mathJaxUrl = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
let mathJaxSource = '';
const target = `${base}/2526/s1/t3/part-a-01.html`;
const cuboidTarget = `${base}/2526/s1/t2/part-a-01.html`;
const profiles = [
  { name: 'landscape-1010x720', viewport: { width: 1010, height: 720 } },
  { name: 'desktop-1280x800', viewport: { width: 1280, height: 800 } },
  { name: 'desktop-1920x1080', viewport: { width: 1920, height: 1080 } },
  { name: 'phone-390x844', viewport: { width: 390, height: 844 } },
  { name: 'phone-390x700', viewport: { width: 390, height: 700 } },
  { name: 'phone-375x667', viewport: { width: 375, height: 667 } },
  { name: 'tablet-768x1024', viewport: { width: 768, height: 1024 } },
  { name: 'landscape-844x390', viewport: { width: 844, height: 390 } },
  { name: 'landscape-1024x768', viewport: { width: 1024, height: 768 } },
];

const results = [];
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitMath(page) {
  await page.waitForFunction(() => window.MathJax && MathJax.startup && MathJax.startup.promise);
  await page.evaluate(() => MathJax.startup.promise);
}

async function startPractice(page) {
  await page.waitForFunction(() => typeof showStudentStartScreen === 'function');
  const startVisible = await page.locator('#student-start-view').evaluate((element) => getComputedStyle(element).display !== 'none');
  if (startVisible) await page.click('#btn-start-practice');
  await page.waitForFunction(() => typeof qList !== 'undefined' && qList.length > 1);
}

async function answerVisibility(page, typeKey) {
  await page.evaluate((key) => {
    const question = QUESTIONS.find((item) => item.typeKey === key);
    if (!question) throw new Error(`Missing ${key}`);
    qList = [question];
    currIdx = 0;
    showQ();
    if (!keypadRaised) toggleKeypadPosition();
  }, typeKey);
  await page.waitForTimeout(260);
  return page.evaluate(() => {
    const question = qList[currIdx];
    const element = document.getElementById(question.type === 'choice' ? 'q-options' : 'input-row');
    const rect = element.getBoundingClientRect();
    let left = 0;
    let top = 0;
    let right = innerWidth;
    let bottom = innerHeight;
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent);
      if (/(auto|scroll|hidden|clip)/.test(style.overflow + style.overflowX + style.overflowY)) {
        const parentRect = parent.getBoundingClientRect();
        left = Math.max(left, parentRect.left);
        top = Math.max(top, parentRect.top);
        right = Math.min(right, parentRect.right);
        bottom = Math.min(bottom, parentRect.bottom);
      }
    }
    const visibleWidth = Math.max(0, Math.min(rect.right, right) - Math.max(rect.left, left));
    const visibleHeight = Math.max(0, Math.min(rect.bottom, bottom) - Math.max(rect.top, top));
    return rect.width && rect.height ? (visibleWidth * visibleHeight) / (rect.width * rect.height) : 0;
  });
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
  if (mathJaxSource) {
    await context.route(mathJaxUrl, (route) => route.fulfill({
      status: 200,
      contentType: 'text/javascript; charset=utf-8',
      body: mathJaxSource,
    }));
  }
  await context.addInitScript(() => {
    window.__uxPrintCalls = 0;
    window.print = () => { window.__uxPrintCalls += 1; };
  });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(target, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    window.__startShifts = [];
    new PerformanceObserver((list) => list.getEntries().forEach((entry) => window.__startShifts.push(entry.value)))
      .observe({ type: 'layout-shift', buffered: false });
  });
  await startPractice(page);
  await page.waitForTimeout(100);
  const startCls = await page.evaluate(() => (window.__startShifts || []).reduce((sum, value) => sum + value, 0));
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
    const textQuestion = QUESTIONS.find((question) => question.type === 'text');
    const choiceQuestion = QUESTIONS.find((question) => question.type === 'choice');
    qList = [textQuestion, choiceQuestion];
    currIdx = 0;
    showQ();
    await frames();
    window.__uxShifts = [];
    const before = top();
    currInput = String(qList[currIdx].correctAnswer);
    renderInputDisplay();
    checkAns();
    await frames();
    const afterCheck = top();
    toggleTeach();
    await frames();
    const afterSolution = top();
    const solutionRect = document.getElementById('solution-box').getBoundingClientRect();
    const answerRect = document.getElementById('answer-dock').getBoundingClientRect();
    nextQ();
    await frames();
    const afterChoice = top();
    const flowCls = (window.__uxShifts || []).reduce((sum, value) => sum + value, 0);
    window.__uxShifts = [];
    currIdx = 0;
    showQ();
    await frames();
    toggleKeypadPosition();
    await new Promise((resolve) => setTimeout(resolve, 260));
    const raisedTop = top();
    const raiseOffset = parseFloat(getComputedStyle(document.getElementById('bottom-dock')).getPropertyValue('--keypad-raise-offset')) || 0;
    toggleKeypadPosition();
    await new Promise((resolve) => setTimeout(resolve, 260));
    return {
      before, afterCheck, afterSolution, afterChoice, raisedTop, raiseOffset,
      solutionContained: solutionRect.bottom <= answerRect.bottom + 0.5,
      cls: flowCls,
      toggleCls: (window.__uxShifts || []).reduce((sum, value) => sum + value, 0),
    };
  });
  const tops = [action.before, action.afterCheck, action.afterSolution, action.afterChoice];
  assert(Math.max(...tops) - Math.min(...tops) < 0.5, `${profile.name} action-area moved: ${JSON.stringify(tops)}`);
  assert(action.solutionContained, `${profile.name} solution drawer escaped answer-dock`);
  assert(Math.abs((action.before - action.raisedTop) - action.raiseOffset) < 1,
    `${profile.name} raised dock mismatch ${JSON.stringify(action)}`);
  assert(action.cls < 0.05, `${profile.name} interaction CLS ${action.cls}`);
  assert(startCls < 0.01, `${profile.name} student start CLS ${startCls}`);

  const coordinateRatio = await answerVisibility(page, 'coordinate');
  const congruenceRatio = await answerVisibility(page, 'congruence');
  const cuboidPage = await context.newPage();
  await cuboidPage.goto(cuboidTarget, { waitUntil: 'domcontentloaded' });
  await startPractice(cuboidPage);
  const cuboidRatio = await answerVisibility(cuboidPage, 'cuboid_volume');
  await cuboidPage.close();
  const raisedVisibility = { coordinate: coordinateRatio, congruence: congruenceRatio, cuboid_volume: cuboidRatio };
  Object.entries(raisedVisibility).forEach(([typeKey, ratio]) => {
    assert(ratio >= 0.99, `${profile.name} ${typeKey} answer visibility ratio ${ratio}`);
  });

  const layout = await page.evaluate(async () => {
    const frames = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const settleQuestionMath = async () => {
      const question = document.getElementById('q-text');
      for (let attempt = 0; attempt < 60; attempt += 1) {
        if (!question || question.dataset.mathJaxRendered === 'true') return;
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    };
    if (keypadRaised) {
      toggleKeypadPosition();
      await new Promise((resolve) => setTimeout(resolve, 260));
    }
    const compact = QUESTIONS.find((question) => question.typeKey === 'neg_power') || QUESTIONS.find((question) => question.type === 'text');
    qList = [compact]; currIdx = 0; showQ(); await settleQuestionMath(); await frames();
    const rect = (id) => document.getElementById(id).getBoundingClientRect();
    const quiz = rect('quiz-view');
    const question = rect('question-scroll');
    const card = document.querySelector('.question-card').getBoundingClientRect();
    const answer = rect('answer-dock');
    const control = rect('control-dock');
    const keypad = rect('keypad-area');
    const pdf = rect('pdf-action-area');
    const actionBefore = rect('action-area').top;
    currInput = String(compact.correctAnswer); renderInputDisplay(); checkAns(); await frames();
    const actionAfter = rect('action-area');
    const pdfAfter = rect('pdf-action-area');
    const keypadHidden = getComputedStyle(document.getElementById('keypad')).visibility === 'hidden';

    const longQuestion = QUESTIONS.find((question) => question.typeKey === 'congruence');
    let longContent = null;
    if (longQuestion) {
      qList = [longQuestion]; currIdx = 0; showQ(); await settleQuestionMath(); await frames();
      const longScroll = document.getElementById('question-scroll');
      const longAnswer = rect('answer-dock');
      longContent = {
        clientHeight: longScroll.clientHeight,
        scrollHeight: longScroll.scrollHeight,
        overflowY: getComputedStyle(longScroll).overflowY,
        answerWithinQuiz: longAnswer.bottom <= rect('quiz-view').bottom + 0.5,
      };
    }
    return {
      orientationLandscape: matchMedia('(orientation: landscape)').matches,
      quizDisplay: getComputedStyle(document.getElementById('quiz-view')).display,
      bottomDockDisplay: getComputedStyle(document.getElementById('bottom-dock')).display,
      questionRight: question.right,
      answerRight: answer.right,
      keypadLeft: keypad.left,
      cardToAnswer: answer.top - card.bottom,
      questionToAnswer: answer.top - question.bottom,
      controlToKeypad: keypad.top - control.top,
      controlToPdf: pdf.top - control.top,
      pdfToAction: actionAfter.top - pdfAfter.bottom,
      actionDelta: actionAfter.top - actionBefore,
      keypadHidden,
      longContent,
      quizTop: quiz.top,
      pdfTop: pdf.top,
    };
  });
  if (profile.viewport.width > profile.viewport.height) {
    assert(layout.orientationLandscape && layout.quizDisplay === 'grid', `${profile.name} did not use orientation landscape grid`);
    assert(layout.questionRight < layout.keypadLeft && layout.answerRight < layout.keypadLeft,
      `${profile.name} is not left-question/right-keypad: ${JSON.stringify(layout)}`);
    assert(layout.cardToAnswer >= -0.5 && layout.cardToAnswer <= 30,
      `${profile.name} compact question/answer gap ${layout.cardToAnswer}`);
    assert(Math.abs(layout.questionToAnswer) < 0.5, `${profile.name} question row/answer gap ${layout.questionToAnswer}`);
    assert(Math.abs(layout.controlToKeypad) < 0.5, `${profile.name} control top/keypad gap ${layout.controlToKeypad}`);
    assert(layout.controlToPdf >= 121.5 && layout.controlToPdf <= 122.5,
      `${profile.name} control top/PDF gap is not the single keypad slot: ${layout.controlToPdf}`);
    assert(layout.keypadHidden && Math.abs(layout.pdfToAction) < 0.5,
      `${profile.name} hidden keypad PDF/action gap ${JSON.stringify(layout)}`);
    assert(Math.abs(layout.actionDelta) < 0.5, `${profile.name} action moved when keypad hid: ${layout.actionDelta}`);
    assert(layout.longContent && layout.longContent.answerWithinQuiz && layout.longContent.overflowY === 'auto',
      `${profile.name} long question scrolling failed: ${JSON.stringify(layout.longContent)}`);
  } else {
    assert(!layout.orientationLandscape && layout.quizDisplay === 'flex' && layout.bottomDockDisplay === 'flex',
      `${profile.name} portrait bottom dock changed: ${JSON.stringify(layout)}`);
  }

  const answerRendering = await page.evaluate(async () => {
    const waitFrames = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const originalTypeset = MathJax.typesetPromise.bind(MathJax);
    window.__uxMathTargets = [];
    MathJax.typesetPromise = (targets) => {
      window.__uxMathTargets.push((targets || []).map((target) => target && target.id));
      return originalTypeset(targets);
    };

    const mathematical = QUESTIONS.find((q) => q.typeKey === 'word_to_alg');
    qList = [mathematical]; currIdx = 0; showQ(); await waitFrames();
    window.__uxMathTargets = [];
    currInput = '999999'; checkAns(); await waitFrames();
    const mathTargets = window.__uxMathTargets.flat();
    const mathRendered = Boolean(document.querySelector('#feedback-answer mjx-container'));
    const rawAccepted = checkAnswer(mathematical, mathematical.correctAnswer);
    const latexAccepted = checkAnswer(mathematical, '\\frac{3}{2}');

    window.__uxMathTargets = [];
    toggleTeach(); await waitFrames();
    const solutionTargets = window.__uxMathTargets.flat();

    const integer = QUESTIONS.find((q) => q.typeKey === 'neg_power');
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

  // PDF rendering is covered by pdf_snapshot and exercise_pdf_export_check;
  // this browser smoke stays focused on the live student layout contract.
  const popupState = null;
  assert(errors.length === 0, `${profile.name} console/page errors: ${errors.join(' | ')}`);
  await context.close();
  return { profile: profile.name, controls, action, startCls, raisedVisibility, layout, answerRendering, popupState, errors };
}

(async () => {
  const mathJaxResponse = await fetch(mathJaxUrl);
  if (!mathJaxResponse.ok) throw new Error(`Unable to cache MathJax: HTTP ${mathJaxResponse.status}`);
  mathJaxSource = await mathJaxResponse.text();
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
