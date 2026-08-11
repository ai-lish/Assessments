#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);

function option(name, fallback = null) {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
}

const source = option('--source');
const output = option('--output', path.join(repoRoot, 'docs', 'exam-migration-manifest.json'));
if (!source) {
  console.error('Usage: node scripts/build-exam-migration-manifest.mjs --source /path/to/ai-learning [--output path]');
  process.exit(2);
}

function git(...gitArgs) {
  const result = spawnSync('git', ['-C', source, ...gitArgs], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `git ${gitArgs.join(' ')} failed`);
  }
  return result.stdout.trim();
}

function classify(file) {
  const lower = file.toLowerCase();
  if (/(?:__pycache__|\.pyc$|backup|\.bak$|ocr_log|reports?\/)/.test(lower)) {
    return { category: 'exclude-rebuild', reason: 'generated log/report/cache or backup' };
  }
  if (/(?:review|teacher|practice|upload|publish|github|token|gas\/|submit)/.test(lower)) {
    return { category: 'teacher-readonly', reason: 'teacher review or remote-write workflow; do not expose as student entry' };
  }
  if (/\.(?:pdf|docx|xlsx?|pptx?)$/.test(lower) || /(?:^|\/)(?:raw|original|source|private)\//.test(lower)) {
    return { category: 'private-source', reason: 'source document or raw material requires explicit publication review' };
  }
  if (/(?:mimic|answer|solution|evidence|ocr)/.test(lower)) {
    return { category: 'manual-review', reason: 'derived, answer, OCR or mimic asset requires content and release review' };
  }
  if (/^exam\/(?:20[^/]+)\/(?:index|p[123])\.html$/.test(file) || /^exam\/(?:20[^/]+)\/p[12]\//.test(file)) {
    return { category: 'public-runtime', reason: 'student-facing school-exam page candidate' };
  }
  if (/^hkdse\/(?:index|p[12]|guide|assets|data)\//.test(file) || /^hkdse\/(?:index|guide)\.html$/.test(file)) {
    return { category: 'public-runtime', reason: 'HKDSE student runtime candidate' };
  }
  if (/^exam\/(?:ocr|mimic)\//.test(file) || /^hkdse\/(?:data|images-p1|images-p2)\//.test(file)) {
    return { category: 'manual-review', reason: 'runtime data or asset set requires allowlist and integrity review' };
  }
  return { category: 'manual-review', reason: 'not yet assigned to a public ownership package' };
}

function consumerFor(file, classification) {
  if (classification.category === 'public-runtime') {
    return file.startsWith('exam/') ? 'Assessments/exam/ candidate runtime' : 'Assessments/hkdse/ candidate runtime';
  }
  return null;
}

async function sha256(file) {
  const content = await readFile(path.join(source, file));
  return createHash('sha256').update(content).digest('hex');
}

const sourceCommit = git('rev-parse', 'HEAD');
const files = git('-c', 'core.quotePath=false', 'ls-files', '-z', '--', 'exam', 'hkdse')
  .split('\0')
  .map((file) => file.trim())
  .filter(Boolean);
const records = await Promise.all(files.map(async (file) => {
  const classification = classify(file);
  return {
    path: file,
    sha256: await sha256(file),
    consumer: consumerFor(file, classification),
    ...classification
  };
}));
const counts = Object.fromEntries(
  [...new Set(records.map((record) => record.category))]
    .map((category) => [category, records.filter((record) => record.category === category).length])
);
const sourceCounts = {
  exam: files.filter((file) => file.startsWith('exam/')).length,
  hkdse: files.filter((file) => file.startsWith('hkdse/')).length
};

const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: {
    repository: 'ai-lish/ai-learning',
    commit: sourceCommit,
    include: ['exam/', 'hkdse/'],
    fileCount: files.length,
    sourceCounts
  },
  policy: {
    publicRuntime: 'Only allowlisted student pages and reviewed assets may be copied into Assessments runtime.',
    teacherReadonly: 'Keep teacher review/export flows out of the public student runtime until real authentication and storage are approved.',
    privateSource: 'Do not publish source documents or unreleased school examination material by default.'
  },
  counts,
  records
};

const destination = path.resolve(repoRoot, output);
await mkdir(path.dirname(destination), { recursive: true });
await writeFile(destination, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`Wrote ${records.length} records to ${path.relative(repoRoot, destination)}.`);
console.log(JSON.stringify(counts));
