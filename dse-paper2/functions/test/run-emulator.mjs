// dse-paper2/functions/test/run-emulator.mjs
// ⚠️  Emulator test runner — REQUIRES Java + Firebase CLI emulator.
// NOT executed in this environment. Provide for documentation / future CI.

import { spawnSync } from 'node:child_process';
import { readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDir = __dirname;

if (!existsSync(path.join(__dirname, '..', '..', 'node_modules'))) {
  console.error('Run `npm install` in functions/ first.');
  process.exit(2);
}

const files = readdirSync(testDir)
  .filter((f) => f.endsWith('.test.cjs') && (f.includes('security-rules') || f.includes('attempt-session') || f.includes('membership') || f.includes('revocation')))
  .sort();

let code = 0;
for (const f of files) {
  const r = spawnSync(
    'firebase',
    ['emulators:exec', '--only', 'firestore,auth,functions', `node --test ${path.join(testDir, f)}`],
    { stdio: 'inherit' },
  );
  if (r.status !== 0) code = r.status || 1;
}
process.exit(code);
