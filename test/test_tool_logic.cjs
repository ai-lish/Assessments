// Headless test: simulate the teacher tool's full workflow
// 1. Load bank + template (skip HTTP, use local files)
// 2. Run hierarchical filter (grade=》s1, term=》3, topic=》number_and_algebra)
// 3. Add the 11 questions in that topic to the basket
// 4. Generate preview (call generate() for each)
// 5. Confirm all
// 6. Export → verify HTML

const fs = require('fs');
const path = require('path');

const ROOT = '/Users/zachli/ai-learning/Assessments';
const bank = JSON.parse(fs.readFileSync(path.join(ROOT, 'question-bank.json'), 'utf-8'));
const tmpl = fs.readFileSync(path.join(ROOT, 'templates/student.html'), 'utf-8');

// === 1. Validate bank structure ===
console.log('=== 1. 題目庫結構 ===');
const keys = new Set();
for (const t of bank.data) {
  if (keys.has(t.key)) throw new Error('Duplicate key: ' + t.key);
  keys.add(t.key);
  if (!('grade' in t)) throw new Error(t.key + ' missing grade');
  if (!('term' in t)) throw new Error(t.key + ' missing term');
  if (!('topicKey' in t)) throw new Error(t.key + ' missing topicKey');
  if (!('topicName' in t)) throw new Error(t.key + ' missing topicName');
}
console.log(`  ✓ 18 types, all unique, all have grade/term/topicKey/topicName`);

// === 2. Hierarchical filter: grade=s1, term=3, topic=number_and_algebra ===
console.log('\n=== 2. 分層篩選：s1 / 3 / number_and_algebra ===');
const selectedGrade = 's1', selectedTerm = '3', selectedTopic = 'number_and_algebra';
const filtered = bank.data.filter(t =>
  (t.grade || '') === selectedGrade &&
  (t.term || '') === selectedTerm &&
  (t.topicKey || 'uncategorized') === selectedTopic
);
console.log(`  ✓ ${filtered.length} 題:`);
filtered.forEach(t => console.log(`    - ${t.key}  ${t.name}`));
if (filtered.length < 10) throw new Error('Expected at least 10 題 in number_and_algebra');
if (filtered.length > 15) throw new Error('Expected <= 15 題');

// === 3. Add to basket & generate preview ===
console.log('\n=== 3. 預覽生成 ===');
const basket = filtered.map(t => ({ typeDef: t, params: null, generated: null, confirmed: false, hasError: false }));
const results = [];
for (const b of basket) {
  // Simple params (tool does this randomly)
  const params = genParamsForType(b.typeDef);
  b.params = params;
  try {
    const fn = new Function('p', 'return (' + b.typeDef.generate + ')(p);');
    const res = fn(params);
    if (!res || !res.questionHTML || res.correctAnswer === undefined) {
      b.hasError = true; b.errorMsg = 'missing fields'; continue;
    }
    b.generated = res;
    results.push({ typeKey: b.typeDef.key, questionHTML: res.questionHTML, correctAnswer: res.correctAnswer });
  } catch (e) {
    b.hasError = true; b.errorMsg = e.message;
  }
}
const ok = basket.filter(b => !b.hasError);
console.log(`  ✓ ${ok.length} / ${basket.length} 預覽成功`);
if (ok.length !== basket.length) throw new Error('Some previews failed: ' + JSON.stringify(basket.filter(b => b.hasError).map(b => ({key: b.typeDef.key, err: b.errorMsg}))));

// === 4. Confirm all ===
console.log('\n=== 4. 全部確認 ===');
for (const b of basket) {
  if (!b.hasError) b.confirmed = true;
}
console.log(`  ✓ ${basket.filter(b => b.confirmed).length} / ${basket.length} confirmed`);

// === 5. Export gate ===
console.log('\n=== 5. 匯出閘門 ===');
const gate_ok = basket.length > 0 &&
                !basket.some(b => b.hasError) &&
                !basket.some(b => !b.confirmed);
if (!gate_ok) throw new Error('Export gate should be open');
console.log('  ✓ 全部閘門通過');

// === 6. Export HTML ===
console.log('\n=== 6. 匯出 ===');
const questions = basket.map((b, i) => {
  const q = b.generated;
  return {
    qid: 'q' + String(i + 1).padStart(3, '0'),
    typeKey: b.typeDef.key,
    type: b.typeDef.type,
    checkType: b.typeDef.checkType,
    questionHTML: q.questionHTML,
    correctAnswer: q.correctAnswer,
    paramsUsed: q.paramsUsed,
    solutionHTML: q.solutionHTML || '',
    pdfText: q.pdfText || '',
    displayAnswer: q.displayAnswer || q.correctAnswer,
    steps: q.steps || ''
  };
});
const title = '中一第三學期 — 數與代數';
const generatedAt = new Date().toISOString();
const bankHash = 'test_tool_' + Date.now().toString(36);
const presetKey = 'custom';
const gasUrl = '';

const safeReplace = (str, pattern, replacement) => str.replace(pattern, () => replacement);
let html = tmpl;
html = safeReplace(html, /\{\{TITLE\}\}/g, JSON.stringify(title));
html = safeReplace(html, /\{\{QUESTIONS_DATA\}\}/g, JSON.stringify(questions));
html = safeReplace(html, /\{\{GENERATED_AT\}\}/g, JSON.stringify(generatedAt));
html = safeReplace(html, /\{\{BANK_HASH\}\}/g, JSON.stringify(bankHash));
html = safeReplace(html, /\{\{PRESET_KEY\}\}/g, JSON.stringify(presetKey));
html = safeReplace(html, /\{\{GAS_URL\}\}/g, JSON.stringify(gasUrl));

// Verify no placeholders
const leftover = html.match(/\{\{[A-Z_]+\}\}/g);
if (leftover) throw new Error('Residual placeholders: ' + leftover.join(', '));
console.log('  ✓ 匯出 HTML 冇殘留佔位符');

// Verify each questionHTML is in the output
for (let i = 0; i < questions.length; i++) {
  const q = questions[i];
  const escaped = JSON.stringify(q.questionHTML).slice(1, -1);
  if (!html.includes(escaped)) {
    throw new Error('Q' + (i+1) + ' questionHTML not found in export');
  }
}
console.log(`  ✓ 全部 ${questions.length} 題 questionHTML 都喺 HTML 內`);

// Verify JS syntax
const scripts = html.match(/<script>([\s\S]*?)<\/script>/g);
let allJsOk = true;
for (let i = 0; i < scripts.length; i++) {
  const sc = scripts[i].replace(/<script>/, '').replace(/<\/script>/, '');
  fs.writeFileSync('/tmp/tool_flow_' + i + '.js', sc);
  const { execSync } = require('child_process');
  try {
    execSync('node --check /tmp/tool_flow_' + i + '.js', { stdio: 'pipe' });
  } catch (e) {
    allJsOk = false;
    console.log('  ✗ Script ' + i + ' syntax error:', e.stderr.toString().split('\n')[0]);
  }
}
if (!allJsOk) throw new Error('Some scripts failed syntax check');
console.log(`  ✓ 全部 ${scripts.length} 個 inline script 通過語法檢查`);

// Write test output
const outFile = path.join(ROOT, 'test', 'tool_flow_export.html');
fs.writeFileSync(outFile, html);
console.log(`  ✓ Wrote ${outFile} (${html.length} bytes)`);

console.log('\n✅ Tool flow headless test passed.');

// Helper
function genParamsForType(type) {
  const r = (lo, hi) => Math.floor(Math.random() * (hi - lo + 1)) + lo;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  switch (type.key) {
    case 'frac_arith':   return { a: r(2, 9), b: r(2, 9), c: r(2, 9), d: r(2, 9), op: pick(['add', 'sub']) };
    case 'neg_power':    return { n: r(2, 5) };
    case 'prime_factor': return { n: pick([12, 18, 20, 24, 28, 30, 36, 40, 45, 48, 50, 60, 72, 75, 90, 100]) };
    case 'hcf_or_lcm':   return { n1: r(8, 60), n2: r(8, 60), askLCM: Math.random() < 0.5 };
    case 'exp_law':      return { t: r(1, 6) };
    case 'alg_simplify': return { a: r(2, 5), b: r(2, 5), op: pick(['add', 'sub']) };
    case 'solve_eq':     return { a: r(2, 5), b: r(1, 10), c: r(1, 20) };
    case 'word_to_alg':  return { t: r(1, 5), a: r(2, 8), b: r(2, 8) };
    case 'sig_fig':      return { type: r(1, 3), a: r(1, 3), n: pick([0.01234, 0.12345, 1.2345, 12.345, 123.45, 1234.5, 2700, 45000, 5000.0, 0.009, 0.000456, 1.020, 0.020, 1.00]) };
    case 'frac_to_pct':  return { num: r(1, 9), den: r(2, 10) };
    case 'poly_desc':    return { a: r(1, 3), b: r(1, 7), c: r(1, 9) };
    case 'formula_sub':  return { a: pick([-3, -2, -1, 2, 3, 4, 5]), b: pick([-2, -1, 0, 1, 2, 3]), c: pick([-3, -1, 0, 1, 2, 3]) };
    case 'congruence':   return { reason: pick(['S.S.S.', 'S.A.S.', 'A.S.A.', 'A.A.S.', 'R.H.S.']), t1: ['A','B','C'], t2: ['D','E','F'] };
    case 'coordinate':   return { targetX: pick([-2, -1, 1, 2]), targetY: pick([-2, -1, 1, 2]), askAxis: pick(['x', 'y']) };
    case 'seq_nth':      return { a: r(1,4), d: r(1,4), n: r(10,20) };
    case 'data_type':    return { scenario: pick(['一箱蘋果的數量', '一班學生的身高', '一袋米的重量']) };
    case 'area_circle':  return { radius: r(1, 20) };
    case 'angle_type':   return { degrees: r(0, 359) };
    default:             return {};
  }
}
