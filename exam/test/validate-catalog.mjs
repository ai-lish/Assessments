import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const examRoot = path.resolve(here, '..');
const repositoryRoot = path.resolve(examRoot, '..');
const catalogPath = path.join(examRoot, 'data', 'catalog.json');
const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
const catalogIndex = await readFile(path.join(examRoot, 'index.html'), 'utf8');

assert.equal(catalog.schemaVersion, 1, 'catalog schemaVersion must be 1');
assert.equal(catalog.source?.repository, 'ai-lish/ai-learning');
assert.match(catalog.source?.commit ?? '', /^[0-9a-f]{40}$/i, 'catalog source commit must be a full SHA');
assert.equal(catalog.source?.root, 'exam/');
assert.ok(Array.isArray(catalog.entries) && catalog.entries.length > 0, 'catalog must contain entries');
assert.match(catalogIndex, /entries\.filter\(\(entry\)\s*=>\s*entry\.status\s*===\s*['"]ready['"]\)/, 'student index must render ready entries separately');
assert.match(catalogIndex, /entries\.filter\(\(entry\)\s*=>\s*entry\.status\s*!==\s*['"]ready['"]\)/, 'student index must render pending entries separately');
assert.match(catalogIndex, /if\s*\(entry\.status\s*===\s*['"]ready['"]\)[\s\S]*?const link\s*=\s*document\.createElement\(['"]a['"]\)/, 'pending entries must not receive student links');

const ids = new Set();
const sourceFiles = [];
const securityPatterns = [
  /AIza/i,
  /api\.minimax/i,
  /MINIMAX/i,
  /ghToken/i,
  /TEACHER_PASSWORD/i,
  /authorization\s*[:=][^\n]{0,100}token/i,
  /<input[^>]+type=["']password/i,
  /(?:href|src)=["']\//i,
  /location\.href\s*=\s*["']\//i
];

function safeRelative(file) {
  return typeof file === 'string' && file.length > 0 && !file.startsWith('/') && !file.split('/').includes('..');
}

async function walk(dir) {
  const names = await readdir(dir, { withFileTypes: true });
  for (const item of names) {
    const absolute = path.join(dir, item.name);
    if (item.isDirectory()) await walk(absolute);
    else sourceFiles.push(absolute);
  }
}

async function collectFiles(dir, result) {
  const names = await readdir(dir, { withFileTypes: true });
  for (const item of names) {
    const absolute = path.join(dir, item.name);
    if (item.isDirectory()) await collectFiles(absolute, result);
    else result.push(absolute);
  }
}

await walk(examRoot);

for (const entry of catalog.entries) {
  assert.ok(entry.id && !ids.has(entry.id), `duplicate or empty catalog id: ${entry.id}`);
  ids.add(entry.id);
  assert.ok(Array.isArray(entry.papers) && entry.papers.length > 0, `${entry.id} must list papers`);

  if (entry.status === 'ready') {
    assert.ok(safeRelative(entry.studentEntry), `${entry.id} ready entry must have a safe studentEntry`);
    const indexPath = path.join(examRoot, entry.studentEntry);
    await readFile(indexPath, 'utf8');
    for (const paper of entry.papers) {
      const paperPath = path.join(examRoot, entry.id, `${paper}.html`);
      await readFile(paperPath, 'utf8');
    }
    const indexText = await readFile(indexPath, 'utf8');
    assert.doesNotMatch(indexText, /(?:review\.html|practice\.html)/i, `${entry.id} exposes a teacher page`);
  } else {
    assert.equal(entry.studentEntry, null, `${entry.id} pending entry must not have a studentEntry`);
    assert.ok(entry.reason, `${entry.id} pending entry must explain why it is not public`);
  }
}

const required = [
  'data/s1-term3-p1.json',
  'data/s1-term3-p2.json',
  'mimic/generate.js',
  'mimic/auto_templates_exam.json',
  '2024-25-s1-term3/questions/svg_overlays'
];
for (const relative of required) {
  const absolute = path.join(examRoot, relative);
  assert.ok(await stat(absolute), `missing required migration asset: ${relative}`);
}

const readyRuntimeFiles = [];
for (const entry of catalog.entries.filter((item) => item.status === 'ready')) {
  await collectFiles(path.join(examRoot, entry.id), readyRuntimeFiles);
}

for (const absolute of readyRuntimeFiles.filter((file) => /\.html$/i.test(file))) {
  const text = await readFile(absolute, 'utf8');
  const references = [...text.matchAll(/(?:href|src)=["']([^"']+)["']/gi)].map((match) => match[1]);
  for (const reference of references) {
    if (!reference || reference.includes('${') || reference.includes('{{') || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(reference)) continue;
    const filePart = reference.split(/[?#]/, 1)[0];
    if (!filePart) continue;
    const resolved = path.resolve(path.dirname(absolute), filePart);
    assert.ok(
      resolved === repositoryRoot || resolved.startsWith(`${repositoryRoot}${path.sep}`),
      `runtime reference escapes repository: ${path.relative(examRoot, absolute)} -> ${reference}`
    );
    assert.ok(
      await stat(resolved).catch(() => null),
      `missing runtime reference: ${path.relative(examRoot, absolute)} -> ${reference}`
    );
  }
}

for (const absolute of sourceFiles) {
  if (!/\.(?:html|js|json)$/i.test(absolute)) continue;
  const text = await readFile(absolute, 'utf8');
  for (const pattern of securityPatterns) {
    assert.doesNotMatch(text, pattern, `public exam file contains forbidden pattern ${pattern}: ${path.relative(examRoot, absolute)}`);
  }
}

const readyCount = catalog.entries.filter((entry) => entry.status === 'ready').length;
const pendingCount = catalog.entries.length - readyCount;
console.log(`Exam catalog OK: ${readyCount} ready, ${pendingCount} pending, ${sourceFiles.length} files scanned.`);
