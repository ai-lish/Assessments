#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(ROOT, 'scripts/gen_exercise_html.cjs');
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'assess-overwrite-'));
const TARGET_DIR = path.join(OUT, '2526', 's1', 't2');
const PART_01 = path.join(TARGET_DIR, 'part-a-01.html');
const PART_02 = path.join(TARGET_DIR, 'part-a-02.html');
let passed = 0;

function check(label, condition, detail = '') {
  if (!condition) {
    console.error(`  ✗ ${label}${detail ? `: ${detail}` : ''}`);
    process.exitCode = 1;
    return;
  }
  passed += 1;
  console.log(`  ✓ ${label}`);
}

function run(extraArgs = []) {
  return spawnSync(process.execPath, [SCRIPT, `--out-root=${OUT}`, ...extraArgs, 's1_term2_part_a'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
}

try {
  console.log('=== gen_exercise_html --overwrite contract ===');
  const first = run();
  check('first regular generation succeeds', first.status === 0, first.stderr);
  check('first regular generation creates part-a-01', fs.existsSync(PART_01));

  fs.writeFileSync(PART_01, 'sentinel', 'utf8');
  const second = run();
  check('regular generation without flag still succeeds', second.status === 0, second.stderr);
  check('regular generation without flag preserves part-a-01', fs.readFileSync(PART_01, 'utf8') === 'sentinel');
  check('regular generation without flag creates part-a-02', fs.existsSync(PART_02));

  const overwrite = run(['--overwrite']);
  check('--overwrite generation succeeds', overwrite.status === 0, overwrite.stderr);
  check('--overwrite replaces part-a-01', fs.readFileSync(PART_01, 'utf8') !== 'sentinel');
  check('--overwrite keeps the canonical part-a-01 path', /part-a-01\.html/.test(overwrite.stdout));

  if (process.exitCode) process.exit(process.exitCode);
  console.log(`\n${passed} overwrite checks passed.`);
} finally {
  fs.rmSync(OUT, { recursive: true, force: true });
}
