#!/usr/bin/env node

import {
  execFileSync,
} from "node:child_process";
import {
  dirname,
  join,
} from "node:path";
import {
  fileURLToPath,
} from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
for (const validator of [
  "validate-data.mjs",
  "validate-images.mjs",
  "validate-grading.mjs",
  "validate-reports.mjs",
]) {
  execFileSync(process.execPath, [join(testDir, validator)], {
    stdio: "inherit",
  });
}

console.log("HKDSE A1 validation: ok");
