#!/usr/bin/env node
/*
 * Headless generator for hosted 初中 Part A practice HTMLs.
 *
 * Replicates the export logic from tool/index.html (function exportStudent)
 * but runs entirely in Node — no browser, no jsdom, no MathJax.
 *
 * Input:  question-bank.json + templates/student.html + tool/generators.js + tool/validators.js
 * Output: <outDir>/<fileBase>.html for each preset
 *
 * Usage: node gen_practice_html.js <bankPath> <templatePath> <outDir> [titlePrefix] [--gas-url=...] [presetKey...]
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// --- Seeded PRNG (xorshift32) for deterministic regeneration ---
// tool/generators.js 用 Math.random() 抽取參數。為咗令兩次 regen 嘅
// QUESTIONS 完全一樣，我哋喺每個 preset 開頭 override Math.random()
// 用一個 fixed seed + counter 嘅 PRNG。每個 preset 用唔同 seed
// （preset.key 派生），所以唔同 preset 之間嘅隨機性保持獨立。
// 呢個改動只影響 generator script 嘅 runtime，唔修改 tool/generators.js。
function makeSeededRng(seedStr) {
  let s = 0;
  for (let i = 0; i < seedStr.length; i++) {
    s = ((s << 5) - s + seedStr.charCodeAt(i)) | 0;
  }
  if (s === 0) s = 0x12345678;
  return function() {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    return ((s >>> 0) / 0x100000000);
  };
}
function withSeededRandom(seedStr, fn) {
  const origRandom = Math.random;
  const rng = makeSeededRng(seedStr);
  Math.random = rng;
  try { return fn(); }
  finally { Math.random = origRandom; }
}

const ROOT = process.cwd();
const bankPath = process.argv[2] || path.join(ROOT, 'question-bank.json');
const templatePath = process.argv[3] || path.join(ROOT, 'templates/student.html');
const outDir = process.argv[4] || path.join(ROOT, 's1');
const titlePrefix = process.argv[5] || '初中數學短答練習';
const extraArgs = process.argv.slice(6);
const gasUrlArg = extraArgs.find(a => a.startsWith('--gas-url='));
const gasUrl = gasUrlArg ? gasUrlArg.slice(10) : '';

const bank = JSON.parse(fs.readFileSync(bankPath, 'utf-8'));
const tmpl = fs.readFileSync(templatePath, 'utf-8');

const AssessGenerators = require(path.join(ROOT, 'tool/generators.js'));
const AssessValidators = require(path.join(ROOT, 'tool/validators.js'));
const pdfScript = fs.readFileSync(path.join(ROOT, 'tool/pdf.js'), 'utf-8');

// --- Required placeholder check (mirrors tool) ---
const REQUIRED = ['{{TITLE}}', '{{TITLE_HTML}}', '{{QUESTIONS_DATA}}', '{{QUESTION_SPECS}}', '{{GENERATED_AT}}', '{{BANK_HASH}}', '{{PRESET_KEY}}', '{{GRADE}}', '{{GAS_URL}}', '{{VALIDATORS_SCRIPT}}', '{{GENERATORS_SCRIPT}}', '{{PDF_SCRIPT}}', '{{RUNTIME_SEED}}'];
for (const ph of REQUIRED) {
  if (!tmpl.includes(ph)) { console.error('Template missing placeholder:', ph); process.exit(1); }
}

const typeByKey = new Map(bank.data.map(t => [t.key, t]));

function genQuestion(typeKey, params) {
  const t = typeByKey.get(typeKey);
  if (!t) throw new Error('Unknown typeKey in bank: ' + typeKey);
  const q = AssessGenerators.generateQuestion(t, params || {});
  // ensure every field the tool exports is present (some generators omit type/validator/checkType)
  return Object.assign({
    type: t.type,
    checkType: t.checkType || q.checkType,
    validator: t.validator,
    options: t.options,
    prefix: t.prefix,
    suffix: t.suffix,
    // 新增：題型編碼（唔影響判分，純 metadata）。
    code: t.code || null,
  }, q);
}

function genPresetQuestions(preset) {
  const out = [];
  let i = 0;
  for (const qspec of preset.questions) {
    i += 1;
    const typeKey = qspec.typeKey;
    const params = qspec.params || {};
    try {
      const q = genQuestion(typeKey, params);
      out.push({
        qid: 'q' + String(i).padStart(3, '0'),
        typeKey: typeKey,
        type: q.type,
        checkType: q.checkType,
        validator: q.validator,
        questionHTML: q.questionHTML,
        correctAnswer: q.correctAnswer,
        paramsUsed: q.paramsUsed,
        solutionHTML: q.solutionHTML,
        pdfText: q.pdfText,
        displayAnswer: q.displayAnswer,
        steps: q.steps,
        options: q.options,
        interaction: q.interaction,
        imageSvg: q.imageSvg,
        prefix: q.prefix,
        suffix: q.suffix,
        primeFactors: q.primeFactors,
        answers: q.answers,
        q8subtype: q.q8subtype,
        answerSpec: q.answerSpec,
        // 新增：題型編碼 metadata。唔影響判分。
        code: q.code !== undefined ? q.code : null,
      });
    } catch (e) {
      console.error(`  Q${i} ${typeKey} FAIL generate:`, e.message);
      throw e;
    }
  }
  return out;
}

const safeReplace = (str, pattern, replacement) => str.replace(pattern, () => replacement);

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

let bankHashBase = 'b' + bank.data.length;

// Deterministic BANK_HASH: sha1(bank content + preset key + questions).
// Avoids Date.now() random hash that would orphan existing students'
// localStorage attempts on every regeneration. The hash only changes
// when bank content or preset questions actually change.
function computeBankHash(presetKey, questions) {
  const payload = JSON.stringify({
    bank: bank.data,
    presetKey,
    questions: questions.map(q => ({
      qid: q.qid, typeKey: q.typeKey, paramsUsed: q.paramsUsed,
    })),
  });
  return `${bankHashBase}_${questions.length}_${crypto.createHash('sha1').update(payload).digest('hex').slice(0, 8)}`;
}

function deriveGrade(presetKey) {
  const m = String(presetKey || '').match(/^s(\d+)[_-]?t(?:erm)?\d+/i);
  return m ? 's' + m[1] : 'unknown';
}

const outFiles = [];
const argPresets = extraArgs.filter(a => !a.startsWith('--gas-url=')); // optional list of preset keys

const presets = argPresets.length
  ? bank.presets.filter(p => argPresets.includes(p.key))
  : bank.presets;

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const ymd = new Date().toISOString().slice(0,10).replace(/-/g, '');

for (const preset of presets) {
  console.log(`\n=== ${preset.key} (${preset.name}) ===`);
  // 固定 seed：每個 preset 用自己嘅 key 做 seed base，確保 diff stable。
  const questions = withSeededRandom('assess-samples-' + preset.key, () =>
    genPresetQuestions(preset)
  );
  const title = `${titlePrefix} — ${preset.name}`;
  const bankHash = computeBankHash(preset.key, questions);
  const generatedAt = new Date().toISOString();
  const presetKey = preset.key;

  let html = tmpl;
  html = safeReplace(html, /\{\{TITLE_HTML\}\}/g, escapeHtml(title));
  html = safeReplace(html, /\{\{TITLE\}\}/g, JSON.stringify(title));
  html = safeReplace(html, /\{\{VALIDATORS_SCRIPT\}\}/g, AssessValidators.toStandaloneScript());
  html = safeReplace(html, /\{\{GENERATORS_SCRIPT\}\}/g, AssessGenerators.toStandaloneScript());
  html = safeReplace(html, /\{\{PDF_SCRIPT\}\}/g, pdfScript);
  html = safeReplace(html, /\{\{QUESTIONS_DATA\}\}/g, JSON.stringify(questions));
  html = safeReplace(html, /\{\{QUESTION_SPECS\}\}/g, JSON.stringify([]));
  html = safeReplace(html, /\{\{RUNTIME_SEED\}\}/g, JSON.stringify(null));
  html = safeReplace(html, /\{\{GENERATED_AT\}\}/g, JSON.stringify(generatedAt));
  html = safeReplace(html, /\{\{BANK_HASH\}\}/g, JSON.stringify(bankHash));
  html = safeReplace(html, /\{\{PRESET_KEY\}\}/g, JSON.stringify(presetKey));
  html = safeReplace(html, /\{\{GRADE\}\}/g, JSON.stringify(deriveGrade(presetKey)));
  html = safeReplace(html, /\{\{GAS_URL\}\}/g, JSON.stringify(gasUrl));

  const leftover = html.match(/\{\{[A-Z_]+\}\}/g);
  if (leftover && leftover.length) { console.error('  LEFTOVER PLACEHOLDERS:', leftover); process.exit(1); }

  // Derive out file name
  const fileBase = 'student-practice-' + preset.key;
  const outPath = path.join(outDir, fileBase + '-' + ymd + '.html');
  fs.writeFileSync(outPath, html, 'utf-8');
  const size = fs.statSync(outPath).size;
  console.log(`  ${questions.length} questions, ${(size/1024).toFixed(1)} KB → ${path.relative(ROOT, outPath)}`);
  outFiles.push(outPath);
}

console.log(`\nDone. ${outFiles.length} file(s) written to ${outDir}/`);
process.exit(0);
