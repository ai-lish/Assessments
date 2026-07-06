#!/usr/bin/env node
/*
 * publish_exercise.cjs — Stage an exported exercise HTML into exercises/ and
 * print a `gh pr create` command for an agent to commit + open the PR.
 *
 * Per the PR-EXERCISES spec (MacD, 2026-07-06):
 *   - The teacher tool produces a "publish package" (JSON) alongside the
 *     exported HTML.
 *   - Zach pastes the package to an agent, who runs this script to:
 *       1. Validate the HTML file exists and is non-empty.
 *       2. Parse the package JSON (targetPath, fileName, sourcePreset,
 *          questionCodes, generatedAt, bankHash, mode, name, topic).
 *       3. mkdir -p <targetPath> and copy the HTML in.
 *       4. Print (NOT execute) a `gh pr create` shell command for the
 *          agent to run, plus a `git` command sequence.
 *   - This script does NOT touch git itself; the agent must explicitly
 *     run git/gh to make the commit + PR. This avoids audit risk
 *     (e.g. accidental pushes from a CI environment).
 *
 * Usage:
 *   node publish_exercise.cjs <path-to-export.html> <path-to-package.json>
 *
 * The package.json is a small JSON object with these fields:
 *   {
 *     "targetPath": "exercises/2526/s1/t2",   // repo-relative target dir
 *     "fileName":   "part-a-02.html",         // final filename
 *     "sourcePreset": "s1_term2_part_a",
 *     "mode": "regular" | "custom" | "by-topic",
 *     "name": "optional-name-for-custom-or-by-topic",
 *     "topic": "optional-topicKey-for-by-topic",
 *     "questionCodes": ["LSC-2526-S1-T2-01-NA-3", ...],
 *     "generatedAt": "2026-07-06T00:00:00.000Z",
 *     "bankHash": "b46_14_abc12345"
 *   }
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

function fatal(msg) {
  console.error('FATAL: ' + msg);
  process.exit(1);
}

function info(msg) {
  console.log(msg);
}

function parseArgs(argv) {
  if (argv.length < 4) {
    console.error('Usage: node publish_exercise.cjs <html-path> <package.json-path>');
    process.exit(2);
  }
  return { htmlPath: argv[2], packagePath: argv[3] };
}

const { htmlPath, packagePath } = parseArgs(process.argv);

// --- 1. Validate HTML file ---
const htmlAbs = path.isAbsolute(htmlPath) ? htmlPath : path.join(ROOT, htmlPath);
if (!fs.existsSync(htmlAbs)) fatal(`HTML file not found: ${htmlAbs}`);
const htmlStat = fs.statSync(htmlAbs);
if (htmlStat.size === 0) fatal(`HTML file is empty: ${htmlAbs}`);
info(`✓ HTML file: ${htmlAbs} (${(htmlStat.size / 1024).toFixed(1)} KB)`);

// --- 2. Parse + validate package ---
if (!fs.existsSync(packagePath)) fatal(`Package file not found: ${packagePath}`);
let pkg;
try {
  pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
} catch (e) {
  fatal(`Cannot parse package JSON: ${e.message}`);
}
const requiredFields = ['targetPath', 'fileName', 'sourcePreset', 'mode', 'questionCodes', 'generatedAt', 'bankHash'];
for (const f of requiredFields) {
  if (!(f in pkg)) fatal(`Package missing required field: ${f}`);
}
if (!['regular', 'custom', 'by-topic'].includes(pkg.mode)) fatal(`Invalid mode: ${pkg.mode}`);
info(`✓ Package: sourcePreset=${pkg.sourcePreset} mode=${pkg.mode} target=${pkg.targetPath}/${pkg.fileName}`);

// --- 3. Compute destination + copy ---
// Reject path traversal: targetPath must be under ROOT/exercises/
const targetAbs = path.resolve(ROOT, pkg.targetPath);
const expectedRoot = path.resolve(ROOT, 'exercises');
if (!targetAbs.startsWith(expectedRoot + path.sep) && targetAbs !== expectedRoot) {
  fatal(`Refusing to write outside exercises/ (targetPath=${pkg.targetPath})`);
}
const fileAbs = path.join(targetAbs, pkg.fileName);
// Defence in depth: also verify filename doesn't escape
if (fileAbs.split(path.sep).some(seg => seg === '..' || seg.startsWith('/'))) {
  fatal(`Refusing to write to path containing '..' or absolute segment`);
}

fs.mkdirSync(targetAbs, { recursive: true });
info(`✓ mkdir -p ${path.relative(ROOT, targetAbs)}`);

// Path-traversal defence: the resolved file path MUST stay under targetAbs.
// Use path.resolve (which collapses '..' segments) and then verify.
const resolvedFile = path.resolve(targetAbs, pkg.fileName);
const resolvedTarget = path.resolve(targetAbs);
if (!resolvedFile.startsWith(resolvedTarget + path.sep) && resolvedFile !== resolvedTarget) {
  fatal(`Refusing to write outside target dir (fileName="${pkg.fileName}" resolved to ${resolvedFile})`);
}
// Also reject absolute filenames or names containing path separators / '..'
if (path.isAbsolute(pkg.fileName) || /[\\\/]/.test(pkg.fileName) || /\.\./.test(pkg.fileName)) {
  fatal(`Refusing unsafe filename: "${pkg.fileName}"`);
}

// Backup existing file if it would be overwritten
let backedUp = null;
if (fs.existsSync(fileAbs)) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = fileAbs + '.bak-' + ts;
  fs.copyFileSync(fileAbs, backupPath);
  backedUp = path.relative(ROOT, backupPath);
  info(`⚠ Existing file backed up: ${backedUp}`);
}

fs.copyFileSync(htmlAbs, fileAbs);
const newSize = fs.statSync(fileAbs).size;
info(`✓ Copied HTML → ${path.relative(ROOT, fileAbs)} (${(newSize / 1024).toFixed(1)} KB)`);

// --- 4. Build PR description (markdown) ---
const prBody = [
  '## New exercise in exercises/',
  '',
  '**Source preset:** `' + pkg.sourcePreset + '`',
  '**Mode:** ' + pkg.mode,
  pkg.name ? '**Name:** `' + pkg.name + '`' : null,
  pkg.topic ? '**Topic:** `' + pkg.topic + '`' : null,
  '**Target path:** `' + pkg.targetPath + '/' + pkg.fileName + '`',
  '**Question codes:**',
  ...pkg.questionCodes.map((c) => '  - `' + c + '`'),
  '',
  '**Generated at:** ' + pkg.generatedAt,
  '**Bank hash:** `' + pkg.bankHash + '`',
  '',
  '---',
  '',
  '🤖 This PR was created via `scripts/publish_exercise.cjs` (MacD / PR-EXERCISES).',
  '  Publish package was attached by the teacher tool;',
  '  the file content is a runtime-randomized student practice HTML',
  '  generated by `scripts/gen_exercise_html.cjs`.',
].filter(Boolean).join('\n');

// --- 5. Print git + gh command sequence for the agent ---
const fileRel = path.relative(ROOT, fileAbs);
const branchName = `exercise/${pkg.sourcePreset}-${Date.now().toString(36)}`;
const commitMsg = `exercises(${pkg.sourcePreset}): publish ${pkg.fileName}\n\nBank hash: ${pkg.bankHash}\nGenerated: ${pkg.generatedAt}\nQuestion codes: ${pkg.questionCodes.length}`;

info('');
info('=========================================================');
info('  NEXT STEPS — run these commands (the script did NOT run them)');
info('=========================================================');
info('');
info('```bash');
info('# 1. Verify the staged file');
info(`ls -la "${fileRel}"`);
info('');
info('# 2. Create branch, stage, commit (no push yet)');
info(`git checkout -b "${branchName}"`);
info(`git add "${fileRel}"`);
info(`git commit -m "$(cat <<\'EOF\'`);
info(commitMsg);
info('EOF');
info(')"');
info('');
info('# 3. Push branch');
info(`git push origin "${branchName}"`);
info('');
info('# 4. Open the PR');
info(`gh pr create \\`);
info(`  --title "exercises(${pkg.sourcePreset}): publish ${pkg.fileName}" \\`);
info(`  --body "$(cat <<\'EOF\'`);
info(prBody);
info('EOF');
info(')"');
info('```');
info('');
info('=========================================================');

// Optional: write a "publish manifest" sidecar so the agent can audit what was staged
const manifestPath = path.join(targetAbs, '.' + pkg.fileName.replace(/\.html$/, '') + '.publish-manifest.json');
const manifest = {
  htmlSource: path.relative(ROOT, htmlAbs),
  stagedAt: new Date().toISOString(),
  package: pkg,
  branch: branchName,
  fileRel,
  backedUp,
};
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
info(`✓ Wrote audit manifest: ${path.relative(ROOT, manifestPath)}`);
info('');
info('Done. The HTML is staged in exercises/. The agent (or human) must now run the commands above to commit + open the PR.');
process.exit(0);
