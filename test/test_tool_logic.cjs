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
// 演示題型
check('示範題型 (no grade) → []', filterBankStrict(bank.data, '', '', 'uncategorized').length === 0);

// === 1b. uniqueValuesForKey 行為（含 falsy duplicate regression） ===
section('1b. uniqueValuesForKey 行為');
// 真實題庫：grade 唯一值必須係 ["", "s1"]，唔可以有 duplicate 空 string
const realGrades = uniqueValuesForKey(bank.data, 'grade');
check('真實題庫 grade 唯一值 = ["", "s1"] (len 2)',
      realGrades.length === 2 && realGrades[0] === '' && realGrades[1] === 's1');
const realTerms = uniqueValuesForKey(bank.data, 'term');
check('真實題庫 term 唯一值 = ["", "3"] (len 2)',
      realTerms.length === 2 && realTerms[0] === '' && realTerms[1] === '3');
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
  };
}
const mockDoc = {
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
  URL: { createObjectURL: () => '', revokeObjectURL: () => {} },
  Blob: function() {},
  MathJax: null,
  localStorage: { getItem: () => null, setItem: () => {} },
};
// Make window properties visible to the script (AssessTool = window.AssessTool etc.)
for (const k of Object.keys(sandbox)) sandbox[k === 'window' ? '__skip__' : k] = sandbox[k];

// 先載 filter.js（建立 AssessTool 全局變量）
const filterScript = fs.readFileSync(path.join(ROOT, 'tool/filter.js'), 'utf-8');
try {
  vm.createContext(sandbox);
  vm.runInContext(filterScript, sandbox, { filename: 'tool/filter.js' });
} catch (e) {
  FAILURES.push('filter.js 載入失敗: ' + e.message);
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
section('4. 模板 7 個必要佔位符');
const REQUIRED = ['{{TITLE}}', '{{QUESTIONS_DATA}}', '{{GENERATED_AT}}', '{{BANK_HASH}}', '{{PRESET_KEY}}', '{{GAS_URL}}', '{{VALIDATORS_SCRIPT}}'];
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

// === 5b. PR-UI1 teacher preview UX ===
section('5b. PR-UI1 老師工具 UX');
check('18 題全部有 code 且唯一',
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
check('頁面有 QUESTION_TYPE_NAMES mapping', toolHtmlFixed.includes('const QUESTION_TYPE_NAMES'));
check('18 個 key 全部出現在 QUESTION_TYPE_NAMES 或題庫 code UI 支援內',
      bank.data.every(t => toolHtmlFixed.includes(`${t.key}:`) || toolHtmlFixed.includes(`"${t.key}"`)));
check('題目清單/預覽有 code-badge 顯示', toolHtmlFixed.includes('code-badge'));
check('有 copyQuestionCode()', toolHtmlFixed.includes('function copyQuestionCode'));
check('預覽使用 details.advanced-data 收起技術欄位', toolHtmlFixed.includes('<details class="advanced-data">'));
check('有模擬測試面板', toolHtmlFixed.includes('function renderSimulationPanel') && toolHtmlFixed.includes('模擬測試'));
check('模擬判分調用 AssessValidators.checkAnswer',
      /submitSimulation[\s\S]{0,500}AssessValidators\.checkAnswer/.test(toolHtmlFixed));
check('模擬測試沒有 Google Sheets / fetch 寫入',
      !/function submitSimulation[\s\S]{0,900}(fetch|GAS|Sheets|attemptLog)/.test(toolHtmlFixed));

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
