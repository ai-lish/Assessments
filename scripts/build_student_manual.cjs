#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { createRequire } = require('module');

const ROOT = path.resolve(__dirname, '..');
const MANUAL_ROOT = path.join(ROOT, 'docs', 'manual');
const STUDENT_ROOT = path.join(MANUAL_ROOT, 'student');
const SOURCE = path.join(STUDENT_ROOT, 'student-manual.md');
const INCLUDES = path.join(MANUAL_ROOT, 'includes');
const CSS = path.join(STUDENT_ROOT, 'manual.css');
const OUTPUT = path.join(MANUAL_ROOT, 'output', 'student');
const HTML_OUTPUT = path.join(OUTPUT, 'index.html');
const PDF_OUTPUT = path.join(OUTPUT, 'student-manual.pdf');
const manualRequire = createRequire(path.join(MANUAL_ROOT, 'package.json'));

function chromiumLaunchOptions() {
  const candidates = [
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ].filter(Boolean);
  const executablePath = candidates.find((candidate) => fs.existsSync(candidate));
  return executablePath ? { headless: true, executablePath } : { headless: true };
}

function requireManualDependency(name) {
  try {
    return manualRequire(name);
  } catch (error) {
    console.error(`Missing ${name}. Run: npm --prefix docs/manual install`);
    throw error;
  }
}

function injectIncludes(markdown) {
  const seen = new Set();
  const pattern = /\{\{\s*include:\s*([A-Z0-9_]+)\s*\}\}/g;
  let current = markdown;
  for (let pass = 0; pass < 10; pass += 1) {
    let changed = false;
    current = current.replace(pattern, (placeholder, name) => {
      const includePath = path.join(INCLUDES, `${name}.md`);
      if (!fs.existsSync(includePath)) throw new Error(`Missing include: ${name}`);
      seen.add(name);
      changed = true;
      return fs.readFileSync(includePath, 'utf8').trim();
    });
    if (!changed) break;
  }
  if (pattern.test(current)) throw new Error('Unresolved or recursive include placeholder');
  return { markdown: current, includes: Array.from(seen).sort() };
}

function htmlDocument(body, css) {
  return `<!doctype html>
<html lang="zh-HK">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>學生練習手冊（乙本）</title>
  <style>${css}</style>
</head>
<body>
  <main>${body}</main>
</body>
</html>
`;
}

async function build() {
  const MarkdownIt = requireManualDependency('markdown-it');
  const { chromium } = requireManualDependency('playwright');
  const source = fs.readFileSync(SOURCE, 'utf8');
  const injected = injectIncludes(source);
  const md = new MarkdownIt({ html: true, breaks: false, linkify: false, typographer: false });
  md.renderer.rules.image = (tokens, index) => {
    const token = tokens[index];
    const src = md.utils.escapeHtml(token.attrGet('src') || '');
    const alt = md.utils.escapeHtml(token.content || '');
    return `<figure><img src="${src}" alt="${alt}"><figcaption>${alt}</figcaption></figure>`;
  };

  fs.rmSync(OUTPUT, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT, { recursive: true });
  fs.cpSync(path.join(STUDENT_ROOT, 'images'), path.join(OUTPUT, 'images'), { recursive: true });
  fs.writeFileSync(HTML_OUTPUT, htmlDocument(md.render(injected.markdown), fs.readFileSync(CSS, 'utf8')), 'utf8');

  const browser = await chromium.launch(chromiumLaunchOptions());
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(pathToFileURL(HTML_OUTPUT).href, { waitUntil: 'load' });
    await page.evaluate(async () => {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      await Promise.all(Array.from(document.images).map((image) => image.complete
        ? Promise.resolve()
        : new Promise((resolve, reject) => {
          image.addEventListener('load', resolve, { once: true });
          image.addEventListener('error', reject, { once: true });
        })));
    });
    await page.emulateMedia({ media: 'print' });
    await page.pdf({
      path: PDF_OUTPUT,
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: '<div style="width:100%;font-size:8px;color:#65727c;text-align:center;font-family:sans-serif;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
      margin: { top: '16mm', right: '15mm', bottom: '18mm', left: '15mm' },
      preferCSSPageSize: true,
    });
  } finally {
    await browser.close();
  }

  console.log(`HTML: ${path.relative(ROOT, HTML_OUTPUT)}`);
  console.log(`PDF:  ${path.relative(ROOT, PDF_OUTPUT)}`);
  console.log(`Includes: ${injected.includes.join(', ')}`);
}

build().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
