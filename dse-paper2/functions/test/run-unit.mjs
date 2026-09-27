// dse-paper2/functions/test/run-unit.mjs
// Pure-node runner. Loads each *.test.cjs file in /test and reports pass/fail.
// No Firebase emulator required.

import { spawnSync } from 'node:child_process';
import { readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDir = __dirname;

const files = readdirSync(testDir)
  .filter((f) => f.endsWith('.test.cjs') && f !== 'run-emulator.mjs')
  .sort();

let totalFiles = 0;
let passedFiles = 0;
const results = [];

for (const f of files) {
  totalFiles++;
  const r = spawnSync(process.execPath, ['--test', path.join(testDir, f)], {
    stdio: 'pipe',
    encoding: 'utf-8',
  });
  if (r.status === 0) {
    passedFiles++;
    results.push(`  ✓ ${f}`);
  } else {
    results.push(`  ✗ ${f}`);
    if (r.stdout) results.push(r.stdout);
    if (r.stderr) results.push(r.stderr);
  }
}

console.log('\n=== Unit Test Summary ===');
for (const line of results) console.log(line);
console.log(`\n${passedFiles}/${totalFiles} test files passed.`);
process.exit(passedFiles === totalFiles ? 0 : 1);
