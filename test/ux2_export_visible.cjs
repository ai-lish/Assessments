#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "tool/index.html"), "utf8");

let passed = 0;
function check(name, condition) {
  if (!condition) {
    console.error(`  ✗ ${name}`);
    process.exitCode = 1;
    return;
  }
  passed += 1;
  console.log(`  ✓ ${name}`);
}

console.log("=== PR-UX2 Export Section Visibility ===");

check("tool has no-cache meta", /http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"/.test(html));
check("filter.js has cache-busting query", /src="filter\.js\?v=[^"]+"/.test(html));
check("generators.js has cache-busting query", /src="generators\.js\?v=[^"]+"/.test(html));
check("validators.js has cache-busting query", /src="validators\.js\?v=[^"]+"/.test(html));
check("pdf.js has cache-busting query", /src="pdf\.js\?v=[^"]+"/.test(html));

check("exportCard is not initially hidden", /<div class="card" id="exportCard">/.test(html));
check("exportCard no longer has inline display:none", !/<div class="card" id="exportCard" style="display:none;">/.test(html));
check("JS no longer hides exportCard", !/getElementById\("exportCard"\)\.style\.display\s*=\s*"none"/.test(html));
check("export hint is present", /id="exportHint"/.test(html) && /請先於④生成預覽並確認全部題目/.test(html));
check("publish package button starts disabled", /id="btn-copy-pkg" disabled/.test(html));
check("DOMContentLoaded refreshes export gates", /validateGasUrlField\(\);\s*updateExportGates\(\);/.test(html));
check("renderBasket refreshes export gates", /function renderBasket\(\)[\s\S]*updateExportGates\(\);[\s\S]*}\s*\/\* ============================================================\s*Preset 模式/.test(html));
check("markPreviewDirty refreshes export gates", /function markPreviewDirty\(\)[\s\S]*updateExportGates\(\);[\s\S]*}\s*function genParamsForType/.test(html));
check("updateExportGates disables student export", /if \(exportBtn\) exportBtn\.disabled = !canExport;/.test(html));
check("updateExportGates disables PDF export", /if \(pdfBtn\) pdfBtn\.disabled = !canExport;/.test(html));
check("updateExportGates disables publish package", /if \(pkgBtn\) pkgBtn\.disabled = !canExport;/.test(html));
check("updateExportGates shows pre-confirmation hint", /hint\.textContent = canExport[\s\S]*請先於④確認全部題目/.test(html));

if (process.exitCode) {
  console.error("\nUX2 export visibility regression failed.");
  process.exit(process.exitCode);
}

console.log(`\n=== Summary: ${passed} passed ===`);
