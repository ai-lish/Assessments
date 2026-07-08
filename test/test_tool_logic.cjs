// Headless test: exercise tool/filter.js + extract tool/index.html's inline
// script to verify the page actually USES the shared filter. This is the
// regression test for the "selectedTopic empty shows 16" bug.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const bank = JSON.parse(fs.readFileSync(path.join(ROOT, 'question-bank.json'), 'utf-8'));
const tmpl = fs.readFileSync(path.join(ROOT, 'templates/student.html'), 'utf-8');
const questionCodeDocs = fs.readFileSync(path.join(ROOT, 'docs/question-codes.md'), 'utf-8');
const QUESTION_CODE_RE = /^(?:LSC-\d{4}-S\d+-T\d+-\d{2}-(NA|ME|GE|DH|UC)-\d+|DSE-\d{4}-P\d+-[A-Z]\d+-\d{2}-(NA|ME|GE|DH|UC)-\d+)$/;
const FAMILY_RE = /-(NA|ME|GE|DH|UC)-(\d+)$/;

let PASSED = 0, FAILED = 0;
const FAILURES = [];
function check(name, cond, detail) {
  if (cond) { PASSED++; console.log(`  ✓ ${name}`); }
  else { FAILED++; FAILURES.push(name + (detail ? ` — ${detail}` : '')); console.log(`  ✗ ${name}${detail ? '  ' + detail : ''}`); }
}
function section(title) { console.log(`\n=== ${title} ===`); }

// === 0. Load shared filter module ===
section('0. 載入共享篩選模組 (tool/filter.js)');
const { filterBankStrict, uniqueValuesForKey } = require(path.join(ROOT, 'tool/filter.js'));
check('filter.js 載入成功', typeof filterBankStrict === 'function');
check('uniqueValuesForKey 載入成功', typeof uniqueValuesForKey === 'function');

// === 1. filterBankStrict 行為 ===
section('1. filterBankStrict 行為');
// 全部空 → []
check('全部空 → []', filterBankStrict(bank.data, '', '', '').length === 0);
// 只填年級 → []
check('只填年級 s1 → []', filterBankStrict(bank.data, 's1', '', '').length === 0);
// 只填年級+學期 → []  ← 這係 PR #2 review 搵到嘅 bug
check('只填年級+學期 s1/3 → []  (regression for 16 題 bug)', filterBankStrict(bank.data, 's1', '3', '').length === 0);
// 三層齊 → 預期題數
check('s1/3/number_and_algebra → 11 題', filterBankStrict(bank.data, 's1', '3', 'number_and_algebra').length === 11);
check('s1/3/measurement → 2 題', filterBankStrict(bank.data, 's1', '3', 'measurement').length === 2);
check('s1/3/geometry → 2 題', filterBankStrict(bank.data, 's1', '3', 'geometry').length === 2);
check('s1/3/data_handling → 1 題', filterBankStrict(bank.data, 's1', '3', 'data_handling').length === 1);
check('s1/2/number_and_algebra → 11 題', filterBankStrict(bank.data, 's1', '2', 'number_and_algebra').length === 11);
check('s1/2/measurement → 1 題', filterBankStrict(bank.data, 's1', '2', 'measurement').length === 1);
check('s1/2/geometry → 2 題', filterBankStrict(bank.data, 's1', '2', 'geometry').length === 2);
check('s1/2/data_handling → 0 題', filterBankStrict(bank.data, 's1', '2', 'data_handling').length === 0);
check('s2/3/number_and_algebra → 11 題', filterBankStrict(bank.data, 's2', '3', 'number_and_algebra').length === 11);
check('s2/3/measurement → 5 題', filterBankStrict(bank.data, 's2', '3', 'measurement').length === 5);
check('s2/3/geometry → 0 題', filterBankStrict(bank.data, 's2', '3', 'geometry').length === 0);
check('s2/3/data_handling → 0 題', filterBankStrict(bank.data, 's2', '3', 'data_handling').length === 0);
check('s3/3/number_and_algebra → 8 題', filterBankStrict(bank.data, 's3', '3', 'number_and_algebra').length === 8);
check('s3/3/measurement → 5 題', filterBankStrict(bank.data, 's3', '3', 'measurement').length === 5);
check('s3/3/geometry → 1 題', filterBankStrict(bank.data, 's3', '3', 'geometry').length === 1);
check('s3/3/data_handling → 0 題', filterBankStrict(bank.data, 's3', '3', 'data_handling').length === 0);
// 演示題型
check('示範題型 (no grade) → []', filterBankStrict(bank.data, '', '', 'uncategorized').length === 0);

// === 1b. uniqueValuesForKey 行為（含 falsy duplicate regression） ===
section('1b. uniqueValuesForKey 行為');
// 真實題庫：grade 唯一值唔可以有 duplicate 空 string
const realGrades = uniqueValuesForKey(bank.data, 'grade');
check('真實題庫 grade 唯一值 = ["", "s1", "s2", "s3"] (len 4)',
      realGrades.length === 4 && realGrades[0] === '' && realGrades[1] === 's1' && realGrades[2] === 's2' && realGrades[3] === 's3');
const realTerms = uniqueValuesForKey(bank.data, 'term');
check('真實題庫 term 唯一值 = ["", "2", "3"] (len 3)',
      realTerms.length === 3 && realTerms[0] === '' && realTerms[1] === '2' && realTerms[2] === '3');
// Synthetic：3 個 empty string 必須 collapse 成 1 個
// (regression for seen[v]=out.length sentinel bug — Codex review round 2)
check('3 個空 string 必須 collapse → ["","x","y"] (len 3)',
      (function () {
        const r = uniqueValuesForKey([{a:''},{a:''},{a:''},{a:'x'},{a:'x'},{a:'y'}], 'a');
        return r.length === 3 && r[0] === '' && r[1] === 'x' && r[2] === 'y';
      })());
// 排序
check('結果已排序', (function () {
  const r = uniqueValuesForKey([{a:'c'},{a:'a'},{a:'b'}], 'a');
  return r.length === 3 && r[0] === 'a' && r[1] === 'b' && r[2] === 'c';
})());

// === 2. 頁面源碼檢查：必須使用 filterBankStrict ===
section('2. 頁面源碼檢查：renderQuestionBrowser 使用共享函式');
const toolHtml = fs.readFileSync(path.join(ROOT, 'tool/filter.js').replace(/filter\.js$/, 'index.html'), 'utf-8');
// (Re-read toolHtml here because of the strange path dance above)
const toolHtmlFixed = fs.readFileSync(path.join(ROOT, 'tool/index.html'), 'utf-8');

check('頁面 <script src="filter.js?...">', /<script src="filter\.js\?v=[^"]+">/.test(toolHtmlFixed));
check('頁面 <script src="generators.js?...">', /<script src="generators\.js\?v=[^"]+">/.test(toolHtmlFixed));
check('頁面 <script src="validators.js?...">', /<script src="validators\.js\?v=[^"]+">/.test(toolHtmlFixed));
check('頁面 <script src="pdf.js?...">', /<script src="pdf\.js\?v=[^"]+">/.test(toolHtmlFixed));
check('頁面 renderQuestionBrowser 內使用 AssessTool.filterBankStrict',
      /renderQuestionBrowser[\s\S]{0,300}filterBankStrict/.test(toolHtmlFixed));
check('頁面入面冇內聯 (t.grade \|\| "") !== selectedGrade 篩選邏輯',
      !/function renderQuestionBrowser[\s\S]{0,500}\(t\.grade \|\| ""\) !== selectedGrade/.test(toolHtmlFixed));
// 確保舊嘅 buggy 條件 (selectedTopic && (t.topicKey || "uncategorized") !== selectedTopic) 唔喺 renderQuestionBrowser 入面
const renderBlock = toolHtmlFixed.match(/function renderQuestionBrowser\(\)[\s\S]{0,800}/);
if (renderBlock) {
  const buggy = /selectedTopic\s*&&\s*\(t\.topicKey \|\| "uncategorized"\)\s*!==\s*selectedTopic/.test(renderBlock[0]);
  check('renderQuestionBrowser 唔包含 buggy "selectedTopic && ..." 條件', !buggy);
} else {
  check('renderQuestionBrowser 函式存在', false, '未搵到');
}

// === 3. 執行頁面真實的 renderQuestionBrowser ===
section('3. 執行頁面真實的 renderQuestionBrowser (DOM mock)');
// 從 tool/index.html 抽出所有 inline <script>，第一個係 MathJax config (skip)
// 第二個係主程式。第三個未必存在。
const inlineScripts = [...toolHtmlFixed.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
console.log(`  找到 ${inlineScripts.length} 個 inline <script>`);
// 揀第一個長度 > 1000 嘅（即係主程式，唔係 MathJax config）
const mainScript = inlineScripts.find(s => s.length > 1000);
if (!mainScript) { FAILURES.push('冇搵到主程式'); process.exit(1); }

// 構造 DOM mock（記住每個 getElementById 叫到嘅 element）
const docStore = {};
function makeMockEl() {
  return {
    value: '', textContent: '', innerHTML: '', disabled: false, style: {}, className: '',
    setAttribute: () => {}, addEventListener: () => {}, appendChild: () => {},
    querySelector: () => makeMockEl(), querySelectorAll: () => [],
    getElementsByTagName: () => [],
    dispatchEvent: () => {},
    click: () => {},
  };
}
const mockDoc = {
  body: makeMockEl(),
  getElementById: (id) => {
    if (!docStore[id]) docStore[id] = makeMockEl();
    return docStore[id];
  },
  querySelector: () => makeMockEl(),
  querySelectorAll: () => [],
  createElement: () => makeMockEl(),
  addEventListener: () => {},
};

// 運行主程式（會設定 window / document mock）
const vm = require('vm');
const URLShim = URL;
URLShim.createObjectURL = () => 'blob:tool-export';
URLShim.revokeObjectURL = () => {};
let lastBlobText = '';
const winMock = { addEventListener: () => {}, dispatchEvent: () => {}, document: mockDoc, localStorage: { getItem: () => null, setItem: () => {} } };
const sandbox = {
  document: mockDoc,
  window: winMock,
  console,
  setTimeout, clearTimeout,
  Math,
  Date,
  JSON,
  Object,
  Set, Map, Array, String, Number, Boolean, Error, Promise,
  URL: URLShim,
  Blob: function(parts) { lastBlobText = (parts || []).join(''); },
  navigator: { userAgent: 'node', platform: 'MacIntel', maxTouchPoints: 0, clipboard: null },
  __getLastBlobText: () => lastBlobText,
  MathJax: null,
  localStorage: { getItem: () => null, setItem: () => {} },
};
// Make window properties visible to the script (AssessTool = window.AssessTool etc.)
for (const k of Object.keys(sandbox)) sandbox[k === 'window' ? '__skip__' : k] = sandbox[k];

// 先載外部共用模組（建立 AssessTool / AssessGenerators / AssessValidators / AssessPDF globals）
const filterScript = fs.readFileSync(path.join(ROOT, 'tool/filter.js'), 'utf-8');
const generatorsScript = fs.readFileSync(path.join(ROOT, 'tool/generators.js'), 'utf-8');
const validatorsScript = fs.readFileSync(path.join(ROOT, 'tool/validators.js'), 'utf-8');
const pdfScript = fs.readFileSync(path.join(ROOT, 'tool/pdf.js'), 'utf-8');
try {
  vm.createContext(sandbox);
  vm.runInContext(filterScript, sandbox, { filename: 'tool/filter.js' });
  vm.runInContext(generatorsScript, sandbox, { filename: 'tool/generators.js' });
  vm.runInContext(validatorsScript, sandbox, { filename: 'tool/validators.js' });
  vm.runInContext(pdfScript, sandbox, { filename: 'tool/pdf.js' });
} catch (e) {
  FAILURES.push('共用模組載入失敗: ' + e.message);
  process.exit(1);
}
try {
  vm.runInContext(mainScript, sandbox, { filename: 'tool/index.html#mainScript' });
} catch (e) {
  console.log('  ⚠️ 主程式加載失敗:', e.message);
}

// 找出 renderQuestionBrowser 函式
const renderFn = sandbox.renderQuestionBrowser;
check('renderQuestionBrowser 喺 sandbox 內可訪問', typeof renderFn === 'function');

// 嘗試調用
if (typeof renderFn === 'function') {
  // 設置 bank + 全部 selection（全部喺 context 內跑，let binding 才會更新）
  const setupAndRender = (g, t, tp) => {
    const s = 'bank = ' + JSON.stringify(bank) + ';\n'
      + `selectedGrade = ${JSON.stringify(g)};\n`
      + `selectedTerm = ${JSON.stringify(t)};\n`
      + `selectedTopic = ${JSON.stringify(tp)};\n`
      + 'renderQuestionBrowser();';
    vm.runInContext(s, sandbox);
  };

  // ① s1/3/''  → 期望 empty (bug fix regression)
  try {
    setupAndRender('s1', '3', '');
    const ul = docStore['qlist-browser'];
    const html = ul ? ul.innerHTML : '';
    const listItemCount = (html.match(/<li[^>]*>/g) || []).length;
    check(`renderQuestionBrowser(s1, 3, '') → <li> 數 = ${listItemCount} (期望 1 empty li, 唔應該 16)`,
          listItemCount === 1,
          `got ${listItemCount} <li>; html: ${html.slice(0, 200)}`);
    check('empty message 提示「請先完成年級、學期及課題選擇」',
          html.includes('請先完成年級、學期及課題選擇') || html.includes('呢個組合暫無題目'));
  } catch (e) {
    FAILURES.push('renderQuestionBrowser (s1/3/empty) 調用失敗: ' + e.message);
  }

  // ② s1/3/number_and_algebra  → 期望 11
  try {
    setupAndRender('s1', '3', 'number_and_algebra');
    const ul = docStore['qlist-browser'];
    const html = ul ? ul.innerHTML : '';
    const listItemCount = (html.match(/<li[^>]*>/g) || []).length;
    check(`renderQuestionBrowser(s1, 3, number_and_algebra) → ${listItemCount} <li> (期望 11)`,
          listItemCount === 11, `got ${listItemCount}`);
  } catch (e) {
    FAILURES.push('renderQuestionBrowser(s1/3/na) 調用失敗: ' + e.message);
  }

  // ③ 全部空  → 期望 empty
  try {
    setupAndRender('', '', '');
    const ul = docStore['qlist-browser'];
    const html = ul ? ul.innerHTML : '';
    const listItemCount = (html.match(/<li[^>]*>/g) || []).length;
    check(`renderQuestionBrowser('', '', '') → ${listItemCount} <li> (期望 1)`,
          listItemCount === 1, `got ${listItemCount}`);
  } catch (e) {
    FAILURES.push('renderQuestionBrowser (all empty) 調用失敗: ' + e.message);
  }
}

// === 4. 模板佔位符 ===
section('4. 模板 13 個必要佔位符');
const REQUIRED = ['{{TITLE}}', '{{TITLE_HTML}}', '{{QUESTIONS_DATA}}', '{{QUESTION_SPECS}}', '{{GENERATED_AT}}', '{{BANK_HASH}}', '{{PRESET_KEY}}', '{{GRADE}}', '{{GAS_URL}}', '{{VALIDATORS_SCRIPT}}', '{{GENERATORS_SCRIPT}}', '{{PDF_SCRIPT}}', '{{RUNTIME_SEED}}'];
for (const ph of REQUIRED) {
  check(`模板有 ${ph}`, tmpl.includes(ph));
}

// === 5. 其他 features: MathJax / activePresetKey / export gate ===
section('5. 其他修正（MathJax / activePresetKey / 匯出閘門）');
check('頁面載入 MathJax 3 CDN', toolHtmlFixed.includes('cdn.jsdelivr.net/npm/mathjax@3'));
check('頁面有 mathjax-ready / mathjax-fail events', toolHtmlFixed.includes('mathjax-fail'));
check('頁面有 mathjaxStatus 元素', toolHtmlFixed.includes('id="mathjaxStatus"'));
check('頁面有 activePresetKey 變量', toolHtmlFixed.includes('let activePresetKey'));
check('頁面有 syncFilenameFromPreset()', toolHtmlFixed.includes('function syncFilenameFromPreset'));
check('頁面有 validateTemplate 函式', toolHtmlFixed.includes('function validateTemplate'));
check('頁面有 scheduleMathjaxTypeset 函式', toolHtmlFixed.includes('function scheduleMathjaxTypeset'));
check('匯出閘門檢查 baseName.includes(activePresetKey)',
      /baseName\.includes\(activePresetKey\)/.test(toolHtmlFixed));
check('PRESET_KEY 用 activePresetKey (唔係 hard-coded "custom")',
      /const presetKey = activePresetKey/.test(toolHtmlFixed));
check('filename 輸入框係 readonly', /id="filename"[^>]*readonly/.test(toolHtmlFixed));
check('loadAll 失敗時 reset bank = null', /bank = null; tmpl = null;/.test(toolHtmlFixed));

// === 5a. PR-GASURL teacher tool config ===
section('5a. PR-GASURL Google Sheets 目的地欄');
check('UI 有第三欄 gasUrl input', /id="gasUrl"/.test(toolHtmlFixed));
check('UI 有公開投遞信箱提醒', toolHtmlFixed.includes('等同公開投遞信箱'));
check('saveUrls 會保存 gasUrl', /gasUrl:\s*document\.getElementById\("gasUrl"\)\.value\.trim\(\)/.test(toolHtmlFixed));
check('DOMContentLoaded 會回填 saved.gasUrl', /saved\.gasUrl[\s\S]{0,80}getElementById\("gasUrl"\)\.value/.test(toolHtmlFixed));
check('exportStudent 使用 getGasUrlForExport("exportStatus")',
      /const gasUrl = getGasUrlForExport\("exportStatus"\)/.test(toolHtmlFixed));
check('發佈指令包包含 gasUrl 欄位', /questionCodes,[\s\S]{0,80}gasUrl,/.test(toolHtmlFixed));
check('三個資源欄位均有一鍵套用 Preset 按鈕',
      (toolHtmlFixed.match(/applyResourcePreset\('/g) || []).length >= 3 &&
      toolHtmlFixed.includes("applyResourcePreset('question')") &&
      toolHtmlFixed.includes("applyResourcePreset('template')") &&
      toolHtmlFixed.includes("applyResourcePreset('gas')"));
check('Preset 載入共用 DEFAULT_RESOURCE_PRESETS 與 applyResourcePreset',
      toolHtmlFixed.includes('const DEFAULT_RESOURCE_PRESETS = Object.freeze') &&
      /async function applyResourcePreset\(kind\)/.test(toolHtmlFixed));
check('GAS Preset 不寫死真實提交 URL',
      /gas:\s*\{[\s\S]{0,160}value:\s*""/.test(toolHtmlFixed));

if (typeof sandbox.validateGasUrl === 'function') {
  check('validateGasUrl 接受 script.google.com',
        sandbox.validateGasUrl('https://script.google.com/macros/s/abc/exec').ok === true);
  check('validateGasUrl 接受 script.googleusercontent.com',
        sandbox.validateGasUrl('https://script.googleusercontent.com/macros/echo?user_content_key=abc').ok === true);
  check('validateGasUrl 拒絕 http script.google.com',
        sandbox.validateGasUrl('http://script.google.com/macros/s/abc/exec').ok === false);
  check('validateGasUrl 拒絕非 Google Script 網域',
        sandbox.validateGasUrl('https://example.com/post').ok === false);
  check('validateGasUrl 留空有效且標記 empty',
        sandbox.validateGasUrl('').ok === true && sandbox.validateGasUrl('').empty === true);
} else {
  check('validateGasUrl 函式存在', false, 'sandbox 內不可訪問');
}

try {
  const typeDef = bank.data.find(t => t.grade === 's1' && t.term === '3');
  mockDoc.getElementById('title').value = 'Gas URL Export Test';
  mockDoc.getElementById('filename').value = 'student-practice-s1_term3_part_a';
  mockDoc.getElementById('gasUrl').value = 'https://script.google.com/macros/s/abc/exec';
  vm.runInContext(`
    bank = ${JSON.stringify(bank)};
    tmpl = ${JSON.stringify(tmpl)};
    activePresetKey = "s1_term3_part_a";
    basket = [{
      typeKey: ${JSON.stringify(typeDef.key)},
      typeDef: ${JSON.stringify(typeDef)},
      hasError: false,
      confirmed: true
    }];
    exportStudent();
  `, sandbox);
  const exported = sandbox.__getLastBlobText();
  check('exportStudent 會把合法 GAS URL 注入學生 HTML',
        exported.includes('const GAS_URL = "https://script.google.com/macros/s/abc/exec";'));
} catch (e) {
  check('exportStudent GAS URL 注入測試可執行', false, e.message);
}

// === 5b. PR-UI1 teacher preview UX ===
section('5b. PR-UI1 老師工具 UX');
check('全部題型有 code 且唯一',
      bank.data.every(t => QUESTION_CODE_RE.test(t.code || '') && String(t.code).startsWith('LSC-')) &&
      new Set(bank.data.map(t => t.code)).size === bank.data.length);
check('DSE 保留格式 regex 可接受假想碼',
      QUESTION_CODE_RE.test('DSE-2025-P1-A1-01-NA-1'));
check('同一 generator 只對應同一課題家族',
      (function () {
        const seen = new Map();
        for (const t of bank.data) {
          const m = String(t.code || '').match(FAMILY_RE);
          if (!m) return false;
          const family = `${m[1]}-${m[2]}`;
          if (seen.has(t.generator) && seen.get(t.generator) !== family) return false;
          seen.set(t.generator, family);
        }
        return true;
      })());
check('UC 保留但現時無題庫成員',
      bank.data.every(t => !String(t.code || '').match(/-UC-\d+$/)) &&
      questionCodeDocs.includes('UC') &&
      questionCodeDocs.includes('現時無成員'));
check('docs/question-codes.md 登記所有 generator family',
      bank.data.every(t => {
        const m = String(t.code || '').match(FAMILY_RE);
        if (!m) return false;
        return questionCodeDocs.includes(`| \`${m[1]}-${m[2]}\` |`) &&
          questionCodeDocs.includes(`\`${t.generator}\``);
      }));
const generators = require(path.join(ROOT, 'tool/generators.js'));
const validators = require(path.join(ROOT, 'tool/validators.js'));
const missingRegistryEntries = bank.data.flatMap(t => {
  const missing = [];
  if (!generators.hasGenerator(t.generator)) missing.push(`generator:${t.key}:${t.generator}`);
  if (!validators.hasValidator(t.validator)) missing.push(`validator:${t.key}:${t.validator}`);
  return missing;
});
check('題庫每個 generator / validator key 都存在於單一 registry',
      missingRegistryEntries.length === 0,
      missingRegistryEntries.join(', '));
check('頁面有 QUESTION_TYPE_NAMES mapping', toolHtmlFixed.includes('const QUESTION_TYPE_NAMES'));
check('全部 key 出現在 QUESTION_TYPE_NAMES 或題庫 code UI 支援內',
      bank.data.every(t => toolHtmlFixed.includes(`${t.key}:`) || toolHtmlFixed.includes(`"${t.key}"`)));
check('題目清單/預覽有 code-badge 顯示', toolHtmlFixed.includes('code-badge'));
check('有 copyQuestionCode()', toolHtmlFixed.includes('function copyQuestionCode'));
check('預覽使用 details.advanced-data 收起技術欄位', toolHtmlFixed.includes('<details class="advanced-data">'));
check('有模擬測試面板', toolHtmlFixed.includes('function renderSimulationPanel') && toolHtmlFixed.includes('模擬測試'));
check('模擬判分調用 AssessValidators.checkAnswer',
      /submitSimulation[\s\S]{0,500}AssessValidators\.checkAnswer/.test(toolHtmlFixed));
check('模擬測試沒有 Google Sheets / fetch 寫入',
      !/function submitSimulation[\s\S]{0,900}(fetch|GAS|Sheets|attemptLog)/.test(toolHtmlFixed));

// === 5c. PR-UX3 preset metadata + collapsible sections ===
section('5c. PR-UX3 Preset metadata / collapsible sections');
const requiredPresetKeys = ['s1_term2_part_a', 's1_term3_part_a', 's2_term3_part_a', 's3_term3_part_a'];
const presetMetaOk = requiredPresetKeys.every((key) => {
  const p = bank.presets.find((item) => item.key === key);
  return p && p.schoolYear === '2526' && p.schoolYearLabel === '2025-26';
});
check('四個現有 preset 有 2025-26 schoolYear metadata', presetMetaOk);
check('題目 code 沒因 schoolYear metadata 改格式',
      bank.data.every(t => QUESTION_CODE_RE.test(t.code || '')));
check('Preset UI 以學年分組呈現',
      toolHtmlFixed.includes('function getPresetSchoolYearLabel') &&
      toolHtmlFixed.includes('preset-year-group') &&
      /renderPresetArea[\s\S]{0,900}getPresetSchoolYearLabel/.test(toolHtmlFixed));
check('①至⑥均使用同一 collapsible-section 標記',
      ['section-resources','section-pick-mode','section-basket','section-preview-controls','section-export','section-publish-package']
        .every(id => toolHtmlFixed.includes(`id="${id}"`) && toolHtmlFixed.includes('data-collapsible')));
check('collapsible header 使用 button + aria-expanded',
      (toolHtmlFixed.match(/class="collapsible-toggle" aria-expanded="true"/g) || []).length >= 6);
check('collapsible 初始化不使用 storage 記憶狀態',
      /function initCollapsibles\(\)[\s\S]{0,700}aria-expanded/.test(toolHtmlFixed) &&
      !/function initCollapsibles\(\)[\s\S]{0,900}(localStorage|sessionStorage)/.test(toolHtmlFixed));
check('collapsible 收合不用 display:none/hidden，保留 DOM offsetParent',
      /\.collapsible-section\.is-collapsed \.collapsible-body\s*\{[^}]*max-height:\s*0/.test(toolHtmlFixed) &&
      !/\.collapsible-section\.is-collapsed \.collapsible-body\s*\{[^}]*display\s*:\s*none/.test(toolHtmlFixed) &&
      !/\.collapsible-section\.is-collapsed \.collapsible-body\s*\{[^}]*visibility\s*:\s*hidden/.test(toolHtmlFixed));

// === 6. JS 語法檢查 ===
section('6. JS 語法檢查');
const { execSync } = require('child_process');
let toolSyntaxOk = true;
inlineScripts.forEach((sc, i) => {
  if (sc.includes('MathJax-script') || sc.includes('cdn.jsdelivr.net')) return;
  const f = `/tmp/tool_test_${i}.js`;
  fs.writeFileSync(f, sc);
  try { execSync(`node --check ${f}`, { stdio: 'pipe' }); }
  catch (e) { toolSyntaxOk = false; console.log(`    script ${i} syntax error: ${e.stderr.toString().split('\n')[0]}`); }
});
check(`tool/index.html 全部 inline script 通過語法`, toolSyntaxOk);

// === Done ===
console.log('\n' + '='.repeat(60));
console.log(`✅ ${PASSED} 項通過, ${FAILED} 項失敗`);
if (FAILED > 0) {
  console.log('失敗項目:');
  for (const f of FAILURES) console.log('  - ' + f);
  process.exit(1);
}
console.log('✅ Teacher tool headless regression test passed.');
process.exit(0);
