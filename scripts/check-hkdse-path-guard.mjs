#!/usr/bin/env node

import { execFileSync } from "node:child_process";

function parseArgs(argv) {
  const args = { base: "origin/main", head: "HEAD" };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--base") args.base = argv[++i];
    else if (argv[i] === "--head") args.head = argv[++i];
    else if (argv[i] === "--help" || argv[i] === "-h") {
      console.log("Usage: node scripts/check-hkdse-path-guard.mjs [--base origin/main] [--head HEAD]");
      console.log("Set CHANGED_FILES to a newline/comma separated list for dry-run tests.");
      process.exit(0);
    }
  }
  return args;
}

function changedFilesFromEnv() {
  const raw = process.env.CHANGED_FILES || "";
  if (!raw.trim()) return null;
  return raw
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function changedFilesFromGit(base, head) {
  const out = execFileSync("git", ["diff", "--name-only", `${base}...${head}`], {
    encoding: "utf8",
  });
  return out.split("\n").map((line) => line.trim()).filter(Boolean);
}

const { base, head } = parseArgs(process.argv.slice(2));
const changedFiles = changedFilesFromEnv() || changedFilesFromGit(base, head);
const hkdseTouched = changedFiles.filter((file) => file.replace(/^\.\//, "").startsWith("hkdse/"));

console.log(`HKDSE path guard checked ${changedFiles.length} changed file(s).`);
if (hkdseTouched.length > 0) {
  console.error("HKDSE path guard failed: PR-A1 does not allow /hkdse/ changes.");
  for (const file of hkdseTouched) console.error(`  - ${file}`);
  process.exit(1);
}

console.log("HKDSE path guard passed: no /hkdse/ files changed.");
