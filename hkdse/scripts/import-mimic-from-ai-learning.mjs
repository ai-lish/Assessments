#!/usr/bin/env node

import {
  execFileSync,
} from "node:child_process";
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import {
  dirname,
  join,
  resolve,
} from "node:path";
import {
  fileURLToPath,
} from "node:url";

export const SOURCE_COMMIT = "ef5a578a04f424754ca3733f44f16eaff590f266";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const HKDSE_ROOT = resolve(SCRIPT_DIR, "..");
const TARGET_DIR = join(HKDSE_ROOT, "mimic");
const SOURCE_FILES = [
  "auto_templates_p2.json",
  "practice_p1.json",
  "practice_p2.json",
];

function parseArgs(argv) {
  const sourceIndex = argv.indexOf("--source");
  if (sourceIndex < 0 || !argv[sourceIndex + 1]) {
    throw new Error(
      "Usage: node import-mimic-from-ai-learning.mjs --source /path/to/ai-learning",
    );
  }
  return {
    source: resolve(argv[sourceIndex + 1]),
  };
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(canonicalize(value), null, 2)}\n`);
}

const { source } = parseArgs(process.argv.slice(2));
const sourceHead = execFileSync("git", ["-C", source, "rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
if (sourceHead !== SOURCE_COMMIT) {
  throw new Error(
    `Expected ai-learning source ${SOURCE_COMMIT}, received ${sourceHead}`,
  );
}

mkdirSync(TARGET_DIR, {
  recursive: true,
});
for (const fileName of SOURCE_FILES) {
  const sourcePath = join(source, "hkdse", "mimic-generator", fileName);
  const parsed = readJson(sourcePath);
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error(`${fileName} must contain a JSON object`);
  }
  writeJson(join(TARGET_DIR, fileName), parsed);
}

writeJson(join(TARGET_DIR, "source-metadata.json"), {
  importedFiles: SOURCE_FILES,
  sourceCommit: sourceHead,
  sourceRepository: "https://github.com/ai-lish/ai-learning",
});

execFileSync(process.execPath, [join(SCRIPT_DIR, "validate-mimic-templates.mjs")], {
  stdio: "inherit",
});

console.log(`Imported mimic runtime from ai-learning ${sourceHead}`);
