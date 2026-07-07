#!/usr/bin/env node
/*
 * Exercise HTML generator for ai-lish/Assessments.
 *
 * Generates runtime-randomized student practice HTMLs into the exercises/
 * archive layout. Mirrors the new (post-PR #21) export flow from
 * tool/index.html#exportStudent(): emits QUESTION_SPECS with empty params
 * so the browser runtime generates fresh params on each file load.
 *
 * Replaces the old samples/ prebuilt flow (gen_practice_html.cjs).
 *
 * Output layout:
 *   exercises/{year}/{grade}/{term}/part-a-NN.html
 *     where year  ∈ {2526, ...}    (default 2526, from preset.code prefix or override)
 *           grade ∈ {s1, s2, s3}  (derived from preset.key, e.g. s1_term2_part_a)
 *           term  ∈ {t1, t2, t3}  (derived from preset.key)
 *           NN    ∈ {01, 02, 03}  (next available, skip existing)
 *   exercises/{year}/{grade}/{term}/custom/{name}.html   (--mode=custom)
 *   exercises/{year}/{grade}/by-topic/{topicKey}/{name}.html  (--mode=by-topic)
 *
 * Usage:
 *   node gen_exercise_html.cjs [--mode=regular|custom|by-topic] [--name=...] \
 *                              [--year=2526] [--topic=...] [--out-root=exercises] \
 *                              [--gas-url=https://script.google.com/macros/s/...] \
 *                              [presetKey1 presetKey2 ...]
 *
 * Default: --mode=regular, --year=2526, all presets.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = process.cwd();
const DEFAULTS = {
  bankPath: path.join(ROOT, 'question-bank.json'),
  templatePath: path.join(ROOT, 'templates/student.html'),
  outRoot: path.join(ROOT, 'exercises'),
  year: '2526',
  mode: 'regular', // regular | custom | by-topic
  name: null,      // for custom / by-topic
  topic: null,     // for by-topic
  gasUrl: '',
};

// --- Tiny CLI parser (no external dep) ---
function parseArgs(argv) {
  const opts = Object.assign({}, DEFAULTS);
  const positional = [];
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--mode=')) opts.mode = a.slice(7);
    else if (a.startsWith('--year=')) opts.year = a.slice(7);
    else if (a.startsWith('--name=')) opts.name = a.slice(7);
    else if (a.startsWith('--topic=')) opts.topic = a.slice(8);
    else if (a.startsWith('--out-root=')) opts.outRoot = path.resolve(a.slice(11));
    else if (a.startsWith('--gas-url=')) opts.gasUrl = a.slice(10);
    else if (a === '--help' || a === '-h') {
      console.log(fs.readFileSync(__filename, 'utf-8').split('\n').filter(l => l.startsWith(' *') || l.startsWith('#')).join('\n'));
      process.exit(0);
    } else positional.push(a);
  }
  if (!['regular', 'custom', 'by-topic'].includes(opts.mode)) {
    console.error(`Invalid --mode: ${opts.mode} (must be regular|custom|by-topic)`);
    process.exit(2);
  }
  if (opts.mode === 'by-topic' && !opts.topic) {
    console.error('--mode=by-topic requires --topic=<topicKey>');
    process.exit(2);
  }
  if ((opts.mode === 'custom' || opts.mode === 'by-topic') && !opts.name) {
    console.error(`--mode=${opts.mode} requires --name=<safe-filename>`);
    process.exit(2);
  }
  return { opts, positional };
}

const { opts, positional } = parseArgs(process.argv);

const bank = JSON.parse(fs.readFileSync(opts.bankPath, 'utf-8'));
const tmpl = fs.readFileSync(opts.templatePath, 'utf-8');
const AssessGenerators = require(path.join(ROOT, 'tool/generators.js'));
const AssessValidators = require(path.join(ROOT, 'tool/validators.js'));
const pdfScript = fs.readFileSync(path.join(ROOT, 'tool/pdf.js'), 'utf-8');

// --- Required placeholder check (mirrors tool) ---
const REQUIRED = ['{{TITLE}}', '{{TITLE_HTML}}', '{{QUESTIONS_DATA}}', '{{QUESTION_SPECS}}', '{{GENERATED_AT}}', '{{BANK_HASH}}', '{{PRESET_KEY}}', '{{GRADE}}', '{{GAS_URL}}', '{{VALIDATORS_SCRIPT}}', '{{GENERATORS_SCRIPT}}', '{{PDF_SCRIPT}}', '{{RUNTIME_SEED}}'];
for (const ph of REQUIRED) {
  if (!tmpl.includes(ph)) { console.error('Template missing placeholder:', ph); process.exit(1); }
}

const typeByKey = new Map(bank.data.map(t => [t.key, t]));

// --- PR #21 export flow: emit QUESTION_SPECS with empty params ---
function buildQuestionSpecs(preset) {
  return preset.questions.map((qspec, i) => {
    const t = typeByKey.get(qspec.typeKey);
    if (!t) throw new Error(`Unknown typeKey in preset ${preset.key}: ${qspec.typeKey}`);
    // Deep-clone the entire typeDef so the runtime has access to all
    // generator-relevant fields (including `generator` and `defaultParams`).
    // Note: `key` is the bank-level key (e.g. "s1t2_prime_factor"), while
    // `generator` is the underlying generator function name (e.g. "prime_factor").
    // The runtime's generateQuestion() does `typeDef.generator || typeDef.key`,
    // so both must be present.
    return {
      qid: 'q' + String(i + 1).padStart(3, '0'),
      typeKey: qspec.typeKey,
      typeDef: JSON.parse(JSON.stringify(t)),
      // Interactive exports must not carry preview-generated params.
      // The student runtime generates fresh params on each file load.
      params: {},
    };
  });
}

function deriveGradeTerm(presetKey) {
  // preset.key pattern: s1_term2_part_a → { grade: 's1', term: 't2' }
  // also support: s1t2 (no underscore), s1_t2, etc.
  const m = presetKey.match(/^s(\d+)[_-]?t(?:erm)?(\d+)/i);
  if (!m) throw new Error(`Cannot derive grade/term from preset key: ${presetKey}`);
  return { grade: 's' + m[1], term: 't' + m[2] };
}

function deriveYear(preset) {
  // Prefer preset's first question's bank code prefix (LSC-2526-...)
  // Falls back to --year flag.
  if (preset.questions && preset.questions[0]) {
    const t = typeByKey.get(preset.questions[0].typeKey);
    if (t && t.code) {
      const m = t.code.match(/^LSC-(\d{4})-/);
      if (m) return m[1];
    }
  }
  return opts.year;
}

function displaySchoolYear(yearCode) {
  const s = String(yearCode || opts.year || '');
  const m = s.match(/^(\d{2})(\d{2})$/);
  if (!m) return s;
  return `20${m[1]}-${m[2]}`;
}

function normalizePartName(name) {
  return String(name || '').replace(/[（(]?甲部[）)]?/g, '(甲部)');
}

function buildPracticeTitle(preset, year) {
  return `${displaySchoolYear(year)} 年度 ${normalizePartName(preset.name)}短答練習`;
}

function nextAvailableNn(dir, prefix) {
  if (!fs.existsSync(dir)) return '01';
  for (let n = 1; n <= 3; n++) {
    const candidate = prefix + '-' + String(n).padStart(2, '0') + '.html';
    if (!fs.existsSync(path.join(dir, candidate))) return String(n).padStart(2, '0');
  }
  return null; // all 01-03 taken (only relevant for --mode=regular, error if so)
}

function computeBankHash(presetKey, specs) {
  const payload = JSON.stringify({
    bank: bank.data,
    presetKey,
    specs: specs.map(s => ({ qid: s.qid, typeKey: s.typeKey })),
  });
  return `b${bank.data.length}_${specs.length}_${crypto.createHash('sha1').update(payload).digest('hex').slice(0, 8)}`;
}

function safeReplace(str, pattern, replacement) {
  return str.replace(pattern, () => replacement);
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function safeName(s) {
  return String(s).replace(/[^a-zA-Z0-9_\\-]/g, '_');
}

function buildHtml({ title, presetKey, grade, gasUrl, specs, generatedAt, bankHash }) {
  let html = tmpl;
  html = safeReplace(html, /\{\{TITLE_HTML\}\}/g, escapeHtml(title));
  html = safeReplace(html, /\{\{TITLE\}\}/g, JSON.stringify(title));
  html = safeReplace(html, /\{\{VALIDATORS_SCRIPT\}\}/g, AssessValidators.toStandaloneScript());
  html = safeReplace(html, /\{\{GENERATORS_SCRIPT\}\}/g, AssessGenerators.toStandaloneScript());
  html = safeReplace(html, /\{\{PDF_SCRIPT\}\}/g, pdfScript);
  html = safeReplace(html, /\{\{QUESTIONS_DATA\}\}/g, JSON.stringify([]));
  html = safeReplace(html, /\{\{QUESTION_SPECS\}\}/g, JSON.stringify(specs));
  html = safeReplace(html, /\{\{RUNTIME_SEED\}\}/g, JSON.stringify(null));
  html = safeReplace(html, /\{\{GENERATED_AT\}\}/g, JSON.stringify(generatedAt));
  html = safeReplace(html, /\{\{BANK_HASH\}\}/g, JSON.stringify(bankHash));
  html = safeReplace(html, /\{\{PRESET_KEY\}\}/g, JSON.stringify(presetKey));
  html = safeReplace(html, /\{\{GRADE\}\}/g, JSON.stringify(grade || "unknown"));
  html = safeReplace(html, /\{\{GAS_URL\}\}/g, JSON.stringify(gasUrl || ''));
  const leftover = html.match(/\{\{[A-Z_]+\}\}/g);
  if (leftover && leftover.length) {
    console.error('  LEFTOVER PLACEHOLDERS:', leftover);
    process.exit(1);
  }
  return html;
}

const outFiles = [];
const presets = positional.length
  ? bank.presets.filter(p => positional.includes(p.key))
  : bank.presets;

if (presets.length === 0) {
  console.error('No matching presets in question-bank.json. Available:', bank.presets.map(p => p.key).join(', '));
  process.exit(1);
}

for (const preset of presets) {
  console.log(`\n=== ${preset.key} (${preset.name}) — mode=${opts.mode} ===`);
  const specs = buildQuestionSpecs(preset);
  const year = deriveYear(preset);
  const { grade } = deriveGradeTerm(preset.key);
  const title = buildPracticeTitle(preset, year);
  const bankHash = computeBankHash(preset.key, specs);
  const generatedAt = new Date().toISOString();
  const presetKey = preset.key;
  const html = buildHtml({ title, presetKey, grade, gasUrl: opts.gasUrl, specs, generatedAt, bankHash });

  // Question codes (for publish package)
  const questionCodes = specs.map(s => {
    const t = typeByKey.get(s.typeKey);
    return t && t.code ? t.code : null;
  }).filter(Boolean);

  // Determine output path
  let outPath;
  if (opts.mode === 'regular') {
    const { grade, term } = deriveGradeTerm(preset.key);
    const dir = path.join(opts.outRoot, year, grade, term);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const nn = nextAvailableNn(dir, 'part-a');
    if (!nn) {
      console.error(`  ERROR: All 01-03 taken in ${dir}. Refuse to overwrite (upper bound is 3).`);
      process.exit(3);
    }
    outPath = path.join(dir, `part-a-${nn}.html`);
  } else if (opts.mode === 'custom') {
    const { grade, term } = deriveGradeTerm(preset.key);
    const dir = path.join(opts.outRoot, year, grade, term, 'custom');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    outPath = path.join(dir, `${safeName(opts.name)}.html`);
  } else if (opts.mode === 'by-topic') {
    const { grade } = deriveGradeTerm(preset.key);
    const dir = path.join(opts.outRoot, year, grade, 'by-topic', safeName(opts.topic));
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    outPath = path.join(dir, `${safeName(opts.name)}.html`);
  }

  fs.writeFileSync(outPath, html, 'utf-8');
  const size = fs.statSync(outPath).size;
  const relPath = path.relative(ROOT, outPath);
  console.log(`  ${specs.length} questions, ${(size/1024).toFixed(1)} KB → ${relPath}`);
  outFiles.push({
    outPath: relPath,
    absPath: outPath,
    presetKey: preset.key,
    presetName: preset.name,
    questionCount: specs.length,
    questionCodes,
    bankHash,
    generatedAt,
  });
}

console.log(`\nDone. ${outFiles.length} file(s) written.`);
if (process.env.GEN_EXERCISE_JSON) {
  // Output manifest JSON for downstream publish script
  console.log(`\n---JSON-MANIFEST-START---`);
  console.log(JSON.stringify(outFiles, null, 2));
  console.log(`---JSON-MANIFEST-END---`);
}
process.exit(0);
