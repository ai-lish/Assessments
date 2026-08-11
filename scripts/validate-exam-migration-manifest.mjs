#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(repoRoot, 'docs', 'exam-migration-manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const allowedCategories = new Set([
  'public-runtime',
  'teacher-readonly',
  'private-source',
  'manual-review',
  'exclude-rebuild',
  'reference-only'
]);

assert.equal(manifest.schemaVersion, 1);
assert.equal(manifest.source?.repository, 'ai-lish/ai-learning');
assert.match(manifest.source?.commit ?? '', /^[0-9a-f]{40}$/i);
assert.deepEqual(manifest.source?.sourceCounts, { exam: 450, hkdse: 1276 });
assert.equal(manifest.source?.fileCount, 1726);
assert.ok(Array.isArray(manifest.records) && manifest.records.length === 1726);

const seen = new Set();
const observedCounts = {};
for (const record of manifest.records) {
  assert.ok(record.path && !record.path.startsWith('/') && !seen.has(record.path), `invalid or duplicate path: ${record.path}`);
  assert.match(record.sha256 ?? '', /^[0-9a-f]{64}$/i, `invalid hash: ${record.path}`);
  assert.ok(allowedCategories.has(record.category), `unknown category: ${record.category}`);
  assert.ok(record.consumer === null || /^Assessments\//.test(record.consumer), `invalid consumer: ${record.path}`);
  seen.add(record.path);
  observedCounts[record.category] = (observedCounts[record.category] ?? 0) + 1;
}

assert.deepEqual(observedCounts, manifest.counts);
console.log(`Exam migration manifest OK: ${manifest.records.length} files, SHA-256 present, ${manifest.source.sourceCounts.exam} exam + ${manifest.source.sourceCounts.hkdse} hkdse.`);
