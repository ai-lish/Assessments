#!/usr/bin/env node
'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawnSync } = require('child_process');
const { createRequire } = require('module');

const ROOT = path.resolve(__dirname, '..');
const MANUAL_ROOT = path.join(ROOT, 'docs', 'manual');
const IMAGE_ROOT = path.join(MANUAL_ROOT, 'student', 'images');
const TMP_ROOT = '/tmp/assessments-student-manual';
const TMP_SHOTS = path.join(TMP_ROOT, 'shots');
const DEMO_ROOT = path.join(TMP_ROOT, 'pin-demo');
const manualRequire = createRequire(path.join(MANUAL_ROOT, 'package.json'));
const { chromium } = manualRequire('playwright');
const MATHJAX_URL = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
const MATHJAX_CAPTURE_URL = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-svg.js';
let mathJaxSource = '';

const PHONE = { width: 390, height: 844 };
const PATHS = {
  s1t2: '/repo/exercises/2526/s1/t2/part-a-01.html',
  s1t3: '/repo/exercises/2526/s1/t3/part-a-01.html',
  s2t3: '/repo/exercises/2526/s2/t3/part-a-01.html',
  s3t3: '/repo/exercises/2526/s3/t3/part-a-01.html',
  demo: '/demo/2526/s1/t3/part-a-01.html',
};

function chromiumLaunchOptions() {
  const candidates = [
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ].filter(Boolean);
  const executablePath = candidates.find((candidate) => fs.existsSync(candidate));
  return executablePath ? { headless: true, executablePath } : { headless: true };
}

function generatePinDemo() {
  fs.rmSync(DEMO_ROOT, { recursive: true, force: true });
  fs.mkdirSync(DEMO_ROOT, { recursive: true });
  const result = spawnSync(process.execPath, [
    'scripts/gen_exercise_html.cjs',
    `--out-root=${DEMO_ROOT}`,
    '--overwrite',
    '--gas-url=https://script.google.com/macros/s/assessments-manual-demo/exec',
    '--teacher-pin=1234',
    's1_term3_part_a',
  ], { cwd: ROOT, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || 'PIN demo generation failed');
  const demoPath = path.join(DEMO_ROOT, '2526', 's1', 't3', 'part-a-01.html');
  const html = fs.readFileSync(demoPath, 'utf8');
  if (html.includes('const TEACHER_PIN_HASH = "1234"')) throw new Error('Plaintext test PIN leaked into demo HTML');
  if (!/const TEACHER_PIN_HASH = "[a-f0-9]{64}"/.test(html)) throw new Error('PIN demo hash was not injected');
  return demoPath;
}

function contentType(file) {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  if (file.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (file.endsWith('.css')) return 'text/css; charset=utf-8';
  if (file.endsWith('.png')) return 'image/png';
  return 'application/octet-stream';
}

function safeFile(root, urlPath) {
  const resolved = path.resolve(root, '.' + urlPath);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) return null;
  return resolved;
}

function createServer() {
  return http.createServer((request, response) => {
    const requestUrl = new URL(request.url, 'http://127.0.0.1');
    let root;
    let relative;
    if (requestUrl.pathname.startsWith('/repo/')) {
      root = ROOT;
      relative = requestUrl.pathname.slice('/repo'.length);
    } else if (requestUrl.pathname.startsWith('/demo/')) {
      root = DEMO_ROOT;
      relative = requestUrl.pathname.slice('/demo'.length);
    } else {
      response.writeHead(404).end('not found');
      return;
    }
    const file = safeFile(root, relative);
    if (!file || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      response.writeHead(404).end('not found');
      return;
    }
    let body = fs.readFileSync(file);
    if (file.endsWith('.html')) {
      const seed = requestUrl.searchParams.get('seed') || 'student-manual-v1';
      body = Buffer.from(body.toString('utf8').replace('const RUNTIME_SEED = null;', `const RUNTIME_SEED = ${JSON.stringify(seed)};`));
    }
    response.writeHead(200, { 'Content-Type': contentType(file), 'Cache-Control': 'no-store' });
    response.end(body);
  });
}

async function waitForReady(page) {
  await page.waitForFunction(() => typeof showQ === 'function' && document.getElementById('p-text').textContent.startsWith('Q'));
  await page.evaluate(async () => {
    if (window.MathJax && MathJax.startup && MathJax.startup.promise) {
      await MathJax.startup.promise.catch(() => {});
    }
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
  });
}

async function addAnnotations(page, annotations) {
  await page.evaluate((items) => {
    document.querySelectorAll('.manual-annotation').forEach((node) => node.remove());
    items.forEach((item, index) => {
      const target = item.selector ? document.querySelector(item.selector) : null;
      const rect = target ? target.getBoundingClientRect() : null;
      const box = document.createElement('div');
      box.className = 'manual-annotation';
      box.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;border:3px solid #e53935;border-radius:10px;box-sizing:border-box;';
      if (rect) {
        box.style.left = `${Math.max(2, rect.left - 3)}px`;
        box.style.top = `${Math.max(2, rect.top - 3)}px`;
        box.style.width = `${Math.min(innerWidth - Math.max(2, rect.left - 3) - 2, rect.width + 6)}px`;
        box.style.height = `${rect.height + 6}px`;
      } else {
        box.style.left = `${item.left || 12}px`;
        box.style.top = `${item.top || 90}px`;
        box.style.width = `${item.width || innerWidth - 24}px`;
        box.style.minHeight = `${item.height || 70}px`;
      }
      const label = document.createElement('div');
      label.textContent = item.label || String(index + 1);
      label.style.cssText = 'position:absolute;left:4px;top:4px;max-width:calc(100% - 8px);padding:4px 7px;border-radius:6px;background:#e53935;color:white;font:700 12px/1.35 -apple-system,BlinkMacSystemFont,"PingFang HK",sans-serif;white-space:normal;';
      box.appendChild(label);
      document.body.appendChild(box);
    });
  }, annotations);
}

async function clearAnnotations(page) {
  await page.evaluate(() => document.querySelectorAll('.manual-annotation').forEach((node) => node.remove()));
}

async function openExercise(browser, baseUrl, route, seed = 'student-manual-v1') {
  const context = await browser.newContext({ viewport: PHONE, deviceScaleFactor: 1, locale: 'zh-HK' });
  if (mathJaxSource) {
    await context.route(MATHJAX_URL, (requestRoute) => requestRoute.fulfill({
      status: 200,
      contentType: 'text/javascript; charset=utf-8',
      body: mathJaxSource,
    }));
  }
  if (baseUrl.startsWith('http://127.0.0.1')) {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: baseUrl });
    await context.route('https://script.google.com/**', (requestRoute) => requestRoute.fulfill({ status: 200, contentType: 'text/plain', body: 'ok' }));
  }
  const page = await context.newPage();
  const url = baseUrl.startsWith('http://127.0.0.1')
    ? `${baseUrl}${route}?seed=${encodeURIComponent(seed)}`
    : `${baseUrl}${route}`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await waitForReady(page);
  return { context, page };
}

async function goToType(page, typeKey) {
  const found = await page.evaluate((key) => {
    const index = qList.findIndex((question) => question.typeKey === key);
    if (index < 0) return false;
    currIdx = index;
    showQ();
    return true;
  }, typeKey);
  if (!found) throw new Error(`Type not found in exercise: ${typeKey}`);
  await page.waitForTimeout(100);
}

async function capture(page, filename, annotations = []) {
  console.log(`capture ${filename}`);
  if (annotations.length) await addAnnotations(page, annotations);
  await page.screenshot({ path: path.join(IMAGE_ROOT, filename), fullPage: false });
  if (annotations.length) await clearAnnotations(page);
}

async function captureTemp(page, filename, annotations = []) {
  if (annotations.length) await addAnnotations(page, annotations);
  const target = path.join(TMP_SHOTS, filename);
  await page.screenshot({ path: target, fullPage: false });
  if (annotations.length) await clearAnnotations(page);
  return target;
}

async function compose(browser, outputName, panels, options = {}) {
  console.log(`compose ${outputName}`);
  const width = options.width || 390;
  const height = options.height || 844;
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const rows = panels.map((panel) => {
    const data = fs.readFileSync(panel.path).toString('base64');
    return `<section><div class="label">${panel.label}</div><img src="data:image/png;base64,${data}"></section>`;
  }).join('');
  await page.setContent(`<!doctype html><style>
    *{box-sizing:border-box}body{margin:0;background:#e8edf1;font-family:-apple-system,"PingFang HK",sans-serif;display:grid;grid-template-rows:repeat(${panels.length},1fr);gap:6px;padding:6px;height:100vh;overflow:hidden}
    section{position:relative;overflow:hidden;background:white;border:1px solid #b6c3cc;border-radius:8px}.label{position:absolute;z-index:2;top:6px;left:6px;max-width:calc(100% - 12px);background:#173f5f;color:#fff;padding:4px 8px;border-radius:8px;font-weight:700;font-size:12px;line-height:1.35;white-space:normal}img{width:100%;height:100%;object-fit:${options.fit || 'cover'};object-position:top}
  </style><body>${rows}</body>`, { waitUntil: 'load' });
  await page.screenshot({ path: path.join(IMAGE_ROOT, outputName), fullPage: false });
  await page.close();
}

async function openPdfPreview(context, page, functionName) {
  const [popup] = await Promise.all([
    page.waitForEvent('popup', { timeout: 15000 }),
    page.evaluate((name) => window[name](), functionName),
  ]);
  await popup.setViewportSize(PHONE);
  await popup.waitForLoadState('load', { timeout: 15000 }).catch(() => {});
  await popup.waitForFunction(() => document.body && document.body.getAttribute('data-print-ready') === 'true', null, { timeout: 15000 }).catch(() => {});
  await popup.waitForFunction(() => window.MathJax && typeof MathJax.typesetPromise === 'function', null, { timeout: 3000 }).catch(() => {});
  let hasMathJax = await popup.evaluate(() => !!(window.MathJax && MathJax.typesetPromise));
  if (!hasMathJax && mathJaxSource) {
    await popup.addScriptTag({ content: mathJaxSource });
    await popup.waitForFunction(() => window.MathJax && typeof MathJax.typesetPromise === 'function', null, { timeout: 15000 });
    hasMathJax = true;
  }
  if (!hasMathJax) throw new Error('PDF preview did not load MathJax');
  await popup.evaluate(async () => {
    if (window.MathJax && MathJax.startup && MathJax.startup.promise) await MathJax.startup.promise.catch(() => {});
    if (window.MathJax && MathJax.typesetPromise) await MathJax.typesetPromise([document.body]).catch(() => {});
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  const mathState = await popup.evaluate(() => ({
    available: !!(window.MathJax && MathJax.typesetPromise),
    containers: document.querySelectorAll('mjx-container').length,
  }));
  console.log(`PDF MathJax available=${mathState.available} containers=${mathState.containers}`);
  return popup;
}

async function run() {
  fs.rmSync(TMP_ROOT, { recursive: true, force: true });
  fs.mkdirSync(TMP_SHOTS, { recursive: true });
  fs.mkdirSync(IMAGE_ROOT, { recursive: true });
  for (const file of fs.readdirSync(IMAGE_ROOT)) if (file.endsWith('.png')) fs.unlinkSync(path.join(IMAGE_ROOT, file));
  const mathJaxResponse = await fetch(MATHJAX_CAPTURE_URL);
  if (!mathJaxResponse.ok) throw new Error(`Unable to cache MathJax for screenshots: HTTP ${mathJaxResponse.status}`);
  mathJaxSource = await mathJaxResponse.text();
  fs.writeFileSync(path.join(TMP_ROOT, 'tex-mml-svg.js'), mathJaxSource, 'utf8');
  generatePinDemo();

  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch(chromiumLaunchOptions());

  try {
    // Capture PDF previews first; the screenshot-only context serves the same
    // MathJax CDN response from /tmp to avoid network timing differences.
    let opened = await openExercise(browser, baseUrl, PATHS.s3t3);
    await goToType(opened.page, 'factor_diff_sq');
    let popup = await openPdfPreview(opened.context, opened.page, 'printSimilarPDF');
    await capture(popup, '11-similar-pdf-preview.png', [{ selector: '[data-pdf-scope="similar"]', label: '先題目，後答案及教學步驟' }]);
    await popup.close();
    await opened.context.close();

    opened = await openExercise(browser, baseUrl, PATHS.s1t3);
    popup = await openPdfPreview(opened.context, opened.page, 'printPDF');
    await capture(popup, '12-whole-pdf-preview.png', [{ selector: '.pdf-preview-note', label: '預覽不會自動列印' }]);
    const printBase = await captureTemp(popup, 'print-preview.png', []);
    await popup.close();
    await opened.context.close();
    await compose(browser, '13-ipad-safari-print.png', [
      { path: printBase, label: 'iPad Safari：按「分享」→ 向下捲動 →「列印」' },
    ], { width: 1280, height: 800, fit: 'contain' });

    opened = await openExercise(browser, baseUrl, PATHS.s1t3);
    await capture(opened.page, '01-open-practice.png', [
      { selector: '.top-info', label: '題號、編碼、得分' },
      { selector: '.question-card', label: '題目' },
      { selector: '#action-area', label: '核對答案' },
    ]);
    await opened.page.evaluate(() => copyCurrentQuestionCode());
    await opened.page.waitForTimeout(100);
    await capture(opened.page, '02-copy-code.png', [{ selector: '#top-code-wrap', label: '需要回報題目時才使用「複製」' }]);
    await opened.context.close();

    opened = await openExercise(browser, baseUrl, PATHS.s1t2);
    await capture(opened.page, '03-base-keypad.png', [
      { selector: '#keypad', label: '三行九格：數字在左，+ − × ÷ 固定顯示' },
    ]);
    await opened.context.close();

    opened = await openExercise(browser, baseUrl, PATHS.s3t3);
    await goToType(opened.page, 'solid_cone');
    await opened.page.evaluate(() => { currInput = '128/3π'; renderInputDisplay(); });
    await opened.page.waitForTimeout(250);
    await capture(opened.page, '04-special-keypad-preview.png', [
      { selector: '#input-wrap', label: '已完成部分即時排成數學格式' },
      { selector: '#keypad', label: '題型需要的 / 和 π 自動出現' },
    ]);
    await opened.context.close();

    const choice = await openExercise(browser, baseUrl, PATHS.s3t3);
    await goToType(choice.page, 'triangle_center');
    const choiceShot = await captureTemp(choice.page, 'choice.png', [{ selector: '#q-options', label: '選擇題：直接撳選項' }]);
    await choice.context.close();
    const coordinate = await openExercise(browser, baseUrl, PATHS.s1t3);
    await goToType(coordinate.page, 'coordinate');
    const coordinateShot = await captureTemp(coordinate.page, 'coordinate.png', [{ selector: '#q-image', label: '坐標題：先在圖上點選位置' }]);
    await coordinate.context.close();
    await compose(browser, '05-choice-coordinate.png', [
      { path: choiceShot, label: '選擇題' },
      { path: coordinateShot, label: '坐標題' },
    ]);

    opened = await openExercise(browser, baseUrl, PATHS.s1t3);
    await opened.page.evaluate(() => { currInput = String(qList[currIdx].correctAnswer); renderInputDisplay(); checkAns(); });
    await opened.page.waitForTimeout(200);
    await capture(opened.page, '06-correct-feedback.png', [{ selector: '#q-feedback', label: '答對回饋' }]);
    await opened.context.close();

    opened = await openExercise(browser, baseUrl, PATHS.s1t3);
    await goToType(opened.page, 'frac_to_pct');
    await opened.page.evaluate(() => { currInput = '999'; renderInputDisplay(); checkAns(); });
    await opened.page.waitForTimeout(250);
    await capture(opened.page, '07-wrong-feedback.png', [{ selector: '#q-feedback', label: '答錯時會顯示正確答案' }]);
    await opened.context.close();

    opened = await openExercise(browser, baseUrl, PATHS.s3t3);
    await goToType(opened.page, 'solid_cone');
    await opened.page.evaluate(() => { currInput = '0'; renderInputDisplay(); checkAns(); toggleTeach(); });
    await opened.page.waitForTimeout(300);
    await capture(opened.page, '08-solution-steps.png', [{ selector: '#solution-box', label: '教學步驟及按本題數值生成的解說圖' }]);
    await opened.context.close();

    const before = await openExercise(browser, baseUrl, PATHS.s1t3);
    const beforeShot = await captureTemp(before.page, 'check-before.png', [{ selector: '#action-area', label: '作答前：核對答案' }]);
    await before.page.evaluate(() => { currInput = String(qList[currIdx].correctAnswer); checkAns(); });
    const afterShot = await captureTemp(before.page, 'check-after.png', [{ selector: '#action-area', label: '核對後：同一位置變成下一題' }]);
    await before.context.close();
    await compose(browser, '09-check-next-same-slot.png', [
      { path: beforeShot, label: '核對前' },
      { path: afterShot, label: '核對後' },
    ]);

    opened = await openExercise(browser, baseUrl, PATHS.s1t3);
    await opened.page.evaluate(() => toggleKeypadPosition());
    await capture(opened.page, '10-pdf-keypad-row.png', [
      { selector: '.pdf-action-row', label: '同類 PDF、整卷 PDF、鍵盤 ↓ 同一行' },
      { selector: '#keypad-area', label: '鍵盤已上調' },
    ]);
    await opened.context.close();

    opened = await openExercise(browser, baseUrl, PATHS.s1t3);
    await opened.page.evaluate(() => {
      sessionLog = qList.map((question) => ({ qid: question.qid, user: String(question.correctAnswer), correct: true }));
      sessionAnswers = qList.map((question) => String(question.correctAnswer));
      finishGame();
    });
    await capture(opened.page, '14-result-page.png', [
      { selector: '#final-score', label: '本輪分數' },
      { selector: '#result-buttons', label: '重做、PDF 及提交' },
      { selector: '.history-box', label: '歷次嘗試紀錄' },
    ]);
    await capture(opened.page, '16-normal-submit-id.png', [
      { selector: '#btn-export', label: '撳後，瀏覽器提示輸入：20255001F（虛構示例）' },
    ]);
    await opened.context.close();

    opened = await openExercise(browser, baseUrl, PATHS.s1t3, 'student-manual-history');
    await opened.page.evaluate(() => {
      sessionLog = qList.map((question, index) => ({ qid: question.qid, user: index === 0 ? '0' : String(question.correctAnswer), correct: index !== 0 }));
      sessionAnswers = qList.map((question, index) => index === 0 ? '0' : String(question.correctAnswer));
      finishGame();
      viewDetails(0, 'wrong');
    });
    await capture(opened.page, '15-history-single-retry.png', [{ selector: '#detail-modal .modal-content', label: '錯題詳情及「重做此題」' }]);
    await opened.context.close();

    opened = await openExercise(browser, baseUrl, PATHS.demo, 'student-manual-pin-demo');
    await capture(opened.page, '17-partial-submit-visible.png', [{ selector: '#partial-submit-row', label: '只在老師已設定密碼的練習中出現' }]);
    const pinPrompt = await captureTemp(opened.page, 'pin-prompt.png', [
      { selector: '#btn-partial-submit', label: '瀏覽器提示 1：請舉手，讓老師輸入 4 位密碼' },
    ]);
    const idPrompt = await captureTemp(opened.page, 'id-prompt.png', [
      { selector: '#btn-partial-submit', label: '瀏覽器提示 2：老師授權後，學生輸入 20255001F' },
    ]);
    await compose(browser, '18-partial-pin-id.png', [
      { path: pinPrompt, label: '1 老師操作：學生舉手，請老師輸入 4 位密碼' },
      { path: idPrompt, label: '2 學生操作：老師授權後，輸入 20255001F（虛構示例）' },
    ]);
    await opened.page.evaluate(() => {
      sessionLog = [{ qid: qList[0].qid, user: String(qList[0].correctAnswer), correct: true }];
      sessionAnswers = [String(qList[0].correctAnswer)];
      currIdx = 1;
      showQ();
      const replies = ['1234', '20255001F'];
      window.prompt = () => replies.shift();
      handlePartialSubmit();
    });
    await opened.page.waitForTimeout(500);
    await capture(opened.page, '19-partial-continue.png', [
      { selector: '#p-text', label: '仍在原有練習進度' },
      { selector: '#toast', label: '已嘗試送出；有疑問要向老師確認' },
    ]);
    await opened.context.close();

    let first = await openExercise(browser, baseUrl, PATHS.s3t3, 'student-manual-reroll-a');
    await goToType(first.page, 'factor_cross');
    const firstText = await first.page.locator('#q-text').innerText();
    const firstShot = await captureTemp(first.page, 'reroll-a.png', [{ selector: '.question-card', label: '第一次載入' }]);
    await first.context.close();
    let second = await openExercise(browser, baseUrl, PATHS.s3t3, 'student-manual-reroll-b');
    await goToType(second.page, 'factor_cross');
    const secondText = await second.page.locator('#q-text').innerText();
    if (firstText === secondText) {
      await second.context.close();
      second = await openExercise(browser, baseUrl, PATHS.s3t3, 'student-manual-reroll-c');
      await goToType(second.page, 'factor_cross');
    }
    const secondShot = await captureTemp(second.page, 'reroll-b.png', [{ selector: '.question-card', label: '重新載入後重新抽題' }]);
    await second.context.close();
    await compose(browser, '20-reroll-comparison.png', [
      { path: firstShot, label: '第一次載入' },
      { path: secondShot, label: '重新載入' },
    ]);

    const files = fs.readdirSync(IMAGE_ROOT).filter((file) => file.endsWith('.png')).sort();
    if (files.length !== 20) throw new Error(`Expected 20 screenshots, found ${files.length}`);
    console.log(files.join('\n'));
    console.log(`Captured ${files.length} screenshots. PIN demo remains under ${DEMO_ROOT}`);
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

run().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
