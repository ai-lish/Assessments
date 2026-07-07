/*
   Shared PDF/print snapshot renderer for Assessments.
   Browser: window.AssessPDF
   Node: require("./tool/pdf.js")
*/
(function(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.AssessPDF = api;
})(typeof globalThis !== "undefined" ? globalThis : this, createAssessPDF);

function createAssessPDF() {
  const SHOW_QUESTION_CODE = true;

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function stripScripts(html) {
    return String(html || "").replace(/<script[\s\S]*?<\/script>/gi, "");
  }

  function hashString(input) {
    let h = 0x811c9dc5;
    const s = String(input || "");
    for (let i = 0; i < s.length; i += 1) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(16).padStart(8, "0");
  }

  function makeSeededRng(seedValue) {
    let s = 0;
    const seed = String(seedValue);
    for (let i = 0; i < seed.length; i += 1) {
      s = ((s << 5) - s + seed.charCodeAt(i)) | 0;
    }
    if (s === 0) s = 0x12345678;
    return function seededRandom() {
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
      return ((s >>> 0) / 0x100000000);
    };
  }

  function withOptionalSeed(seedValue, fn) {
    if (seedValue === null || seedValue === undefined || seedValue === "") return fn();
    const originalRandom = Math.random;
    Math.random = makeSeededRng(seedValue);
    try { return fn(); }
    finally { Math.random = originalRandom; }
  }

  function createSnapshotSeed(seedValue) {
    if (seedValue !== null && seedValue !== undefined && seedValue !== "") return String(seedValue);
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      const parts = new Uint32Array(4);
      crypto.getRandomValues(parts);
      return Array.from(parts).join("-");
    }
    const perf = typeof performance !== "undefined" && performance.now ? performance.now() : 0;
    return Date.now() + "-" + perf + "-" + Math.random();
  }

  function buildInstance(spec, index, generatorApi) {
    const typeDef = spec.typeDef || spec;
    const res = generatorApi.generateQuestion(typeDef, spec.params || {});
    return normalizeQuestionInstance({
      qid: spec.qid || ("q" + String(index + 1).padStart(3, "0")),
      typeKey: spec.typeKey || typeDef.key,
      type: typeDef.type || res.type || "text",
      checkType: typeDef.checkType || res.checkType,
      validator: typeDef.validator || res.validator || typeDef.checkType || res.checkType,
      questionHTML: res.questionHTML,
      correctAnswer: res.correctAnswer,
      paramsUsed: res.paramsUsed || {},
      pdfText: res.pdfText || "",
      displayAnswer: res.displayAnswer || res.correctAnswer,
      solutionHTML: res.solutionHTML || "",
      options: typeDef.options || res.options,
      interaction: res.interaction,
      imageSvg: res.imageSvg,
      answerSpec: res.answerSpec || typeDef.answerSpec,
      code: typeDef.code || res.code || null,
      figure: res.figure || (res.imageSvg ? { imageSvg: res.imageSvg } : null),
    }, index);
  }

  function normalizeQuestionInstance(q, index) {
    return {
      qid: q.qid || ("q" + String(index + 1).padStart(3, "0")),
      index: index + 1,
      typeKey: q.typeKey,
      type: q.type || "text",
      checkType: q.checkType || q.validator,
      validator: q.validator || q.checkType,
      questionHTML: q.questionHTML || q.pdfText || "",
      correctAnswer: q.correctAnswer == null ? "" : String(q.correctAnswer),
      paramsUsed: q.paramsUsed || {},
      pdfText: q.pdfText || q.questionHTML || "",
      displayAnswer: q.displayAnswer == null ? (q.correctAnswer == null ? "" : String(q.correctAnswer)) : String(q.displayAnswer),
      solutionHTML: q.solutionHTML || "",
      options: q.options || null,
      interaction: q.interaction || null,
      imageSvg: q.imageSvg || "",
      answerSpec: q.answerSpec || null,
      code: q.code || null,
      figure: q.figure || (q.imageSvg ? { imageSvg: q.imageSvg } : null),
    };
  }

  function normalizeSource(source) {
    if (Array.isArray(source)) return { questionSpecs: source };
    return source || {};
  }

  function generateSnapshot(source, seed, options) {
    const src = normalizeSource(source);
    if (Array.isArray(src.questions)) {
      return generateSnapshotFromQuestions(src.questions, Object.assign({}, src, options || {}, { seed }));
    }
    return generateSnapshotFromSpecs(src.questionSpecs || src.specs || [], seed, Object.assign({}, src, options || {}));
  }

  function generateSnapshotFromSpecs(questionSpecs, seed, options) {
    const generatorApi = (options && options.generatorApi)
      || (typeof AssessGenerators !== "undefined" ? AssessGenerators : null)
      || (typeof window !== "undefined" ? window.AssessGenerators : null);
    if (!generatorApi || typeof generatorApi.generateQuestion !== "function") {
      throw new Error("AssessGenerators 未載入，無法產生 PDF snapshot");
    }
    const finalSeed = createSnapshotSeed(seed);
    const instances = withOptionalSeed(finalSeed, () => questionSpecs.map((spec, index) => buildInstance(spec, index, generatorApi)));
    return buildSnapshot(instances, finalSeed, options || {});
  }

  function generateSnapshotFromQuestions(questions, options) {
    const seed = options && options.seed ? String(options.seed) : "existing-runtime";
    const instances = questions.map((q, index) => normalizeQuestionInstance(q, index));
    return buildSnapshot(instances, seed, options || {});
  }

  function buildSnapshot(instances, seed, options) {
    const minimal = instances.map((q) => ({
      qid: q.qid,
      typeKey: q.typeKey,
      paramsUsed: q.paramsUsed,
      answerSpec: q.answerSpec,
      displayAnswer: q.displayAnswer,
    }));
    const snapshotId = "pdf-" + hashString(JSON.stringify({ seed, minimal }));
    return {
      snapshotId,
      seed,
      title: (options && options.title) || "初中數學短答練習",
      presetKey: (options && options.presetKey) || "custom",
      generatedAt: (options && options.generatedAt) || new Date().toISOString(),
      questions: instances,
    };
  }

  function questionHtml(q) {
    let html = stripScripts(q.questionHTML || q.pdfText || "");
    const imageSvg = stripScripts(q.imageSvg || (q.figure && q.figure.imageSvg) || "");
    if (imageSvg && !/<svg[\s>]/i.test(html)) html += '<div class="pdf-figure">' + imageSvg + "</div>";
    return html;
  }

  function answerHtml(answer) {
    const raw = String(answer == null ? "" : answer);
    if (raw === "") return "";
    const hasMath = /\\|π|√|±|≥|≤|×|%|≈|²|³|[<>]|\^/.test(raw) && !/\$/.test(raw);
    if (!hasMath) return escapeHtml(raw);
    const tex = raw
      .replace(/π/g, "\\pi")
      .replace(/√(\d+)/g, "\\sqrt{$1}")
      .replace(/±/g, "\\pm ")
      .replace(/≥/g, "\\geq ")
      .replace(/≤/g, "\\leq ")
      .replace(/×/g, "\\times ")
      .replace(/≈/g, "\\approx ")
      .replace(/²/g, "^2")
      .replace(/³/g, "^3")
      .replace(/%/g, "\\%");
    return "\\(" + tex + "\\)";
  }

  function renderPDF(snapshot, mode, options) {
    if (mode !== "student" && mode !== "teacher") throw new Error("Unknown PDF mode: " + mode);
    const showCode = !options || options.showCode !== false;
    const title = mode === "teacher" ? "(甲部) 短答題 答案版" : "(甲部) 短答題";
    const modeClass = mode === "teacher" ? "teacher" : "student";
    const rows = snapshot.questions.map((q, idx) => {
      const answer = mode === "teacher"
        ? '<div class="pdf-answer pdf-teacher-answer">' + answerHtml(q.displayAnswer || q.correctAnswer) + '</div>'
        : '<div class="pdf-answer-line"></div>';
      const code = showCode && q.code ? '<div class="pdf-code">' + escapeHtml(q.code) + '</div>' : "";
      return [
        '<article class="pdf-question-row" data-qid="' + escapeHtml(q.qid) + '" data-type-key="' + escapeHtml(q.typeKey) + '">',
        '  <div class="pdf-question-left">',
        '    <div class="pdf-question-body">' + questionHtml(q) + '</div>',
        code,
        '  </div>',
        '  <div class="pdf-answer-right">',
        '    <div class="pdf-qno">(' + (idx + 1) + ')</div>',
        answer,
        '  </div>',
        '</article>'
      ].join("\n");
    }).join("\n");

    return [
      '<section class="pdf-paper pdf-paper-' + modeClass + '" data-snapshot-id="' + escapeHtml(snapshot.snapshotId) + '" data-mode="' + mode + '">',
      '  <header class="pdf-header">',
      '    <h1>' + title + '</h1>',
      '    <div class="pdf-meta">',
      '      <span>姓名：____________________</span>',
      '      <span>班別：____________</span>',
      '      <span>日期：____________</span>',
      '    </div>',
      '    <div class="pdf-snapshot-meta">' + escapeHtml(snapshot.title) + ' · ' + escapeHtml(snapshot.presetKey) + ' · ' + escapeHtml(snapshot.snapshotId) + '</div>',
      '  </header>',
      '  <main class="pdf-questions">',
      rows,
      '  </main>',
      '</section>'
    ].join("\n");
  }

  function renderPrintDocument(snapshot, options) {
    const showCode = !options || options.showCode !== false;
    const student = renderPDF(snapshot, "student", { showCode });
    const teacher = renderPDF(snapshot, "teacher", { showCode });
    const scriptOpen = "<scr" + "ipt";
    const scriptClose = "</scr" + "ipt>";
    return '<!DOCTYPE html>\n<html lang="zh-HK">\n<head>\n<meta charset="UTF-8">\n'
      + '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
      + '<title>' + escapeHtml(snapshot.title) + ' PDF</title>\n'
      + scriptOpen + '>window.MathJax={tex:{inlineMath:[[\'\\\\(\',\'\\\\)\'],[\'$\',\'$\']],displayMath:[[\'$$\',\'$$\']]},options:{skipHtmlTags:[\'script\',\'noscript\',\'style\',\'textarea\',\'pre\']},startup:{typeset:false}};' + scriptClose + '\n'
      + scriptOpen + ' id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js">' + scriptClose + '\n'
      + '<style>' + printCss() + '</style>\n</head>\n<body data-snapshot-id="' + escapeHtml(snapshot.snapshotId) + '">\n'
      + student + '\n<div class="pdf-page-separator"></div>\n' + teacher + '\n'
      + scriptOpen + '>' + printScript() + scriptClose + '\n</body>\n</html>';
  }

  function printCss() {
    return [
      '@page{size:A4 portrait;margin:12mm;}',
      '*{box-sizing:border-box;}',
      'body{margin:0;background:#fff;color:#111;font-family:"Times New Roman","PingFang HK","Microsoft JhengHei",serif;font-size:11pt;line-height:1.35;}',
      '.pdf-paper{width:100%;}',
      '.pdf-paper-teacher{page-break-before:always;}',
      '.pdf-header{border-bottom:1.5pt solid #111;margin-bottom:8mm;padding-bottom:4mm;}',
      '.pdf-header h1{text-align:center;margin:0 0 4mm 0;font-size:16pt;letter-spacing:.08em;}',
      '.pdf-meta{display:flex;gap:10mm;justify-content:space-between;font-size:11pt;}',
      '.pdf-snapshot-meta{margin-top:2mm;color:#666;font-size:7.5pt;text-align:right;}',
      '.pdf-question-row{display:grid;grid-template-columns:minmax(0,65%) minmax(34mm,35%);gap:6mm;align-items:start;border-bottom:.5pt solid #ddd;padding:3.4mm 0;page-break-inside:avoid;break-inside:avoid;}',
      '.pdf-question-left{min-width:0;}',
      '.pdf-question-body{font-size:11pt;overflow-wrap:anywhere;}',
      '.pdf-question-body svg,.pdf-figure svg{max-width:100%;height:auto;}',
      '.pdf-code{font-family:Menlo,Consolas,monospace;font-size:7.5pt;color:#777;margin-top:1.5mm;}',
      '.pdf-answer-right{display:flex;align-items:flex-end;gap:3mm;min-height:12mm;}',
      '.pdf-qno{font-weight:bold;font-size:11pt;min-width:9mm;}',
      '.pdf-answer-line{border-bottom:1pt solid #111;flex:1;height:9mm;}',
      '.pdf-teacher-answer{border-bottom:1pt solid #111;flex:1;min-height:9mm;color:#c0392b;font-weight:700;font-size:11pt;overflow-wrap:anywhere;}',
      '.pdf-page-separator{page-break-before:always;}',
      '@media screen{body{padding:18px;max-width:900px;margin:0 auto;background:#f3f5f7;}.pdf-paper{background:#fff;padding:16mm;box-shadow:0 4px 18px rgba(0,0,0,.12);margin-bottom:24px;}.pdf-page-separator{display:none;}}',
    ].join("\n");
  }

  function printScript() {
    return [
      '(function(){',
      'function nextFrame(){return new Promise(function(resolve){requestAnimationFrame(resolve);});}',
      'function waitForMathJax(){if(window.MathJax&&MathJax.startup&&MathJax.startup.promise)return MathJax.startup.promise;return Promise.resolve();}',
      'function waitForAssets(){var imgs=Array.from(document.images||[]);return Promise.all(imgs.map(function(img){if(img.complete)return Promise.resolve();return new Promise(function(resolve,reject){img.addEventListener("load",resolve,{once:true});img.addEventListener("error",reject,{once:true});});}));}',
      'async function run(){',
      '  await waitForMathJax();',
      '  if(window.MathJax&&MathJax.typesetPromise) await MathJax.typesetPromise([document.body]);',
      '  await waitForAssets();',
      '  await nextFrame();',
      '  await nextFrame();',
      '  window.print();',
      '}',
      'if(document.readyState==="complete")run();else window.addEventListener("load",run,{once:true});',
      '})();'
    ].join("");
  }

  function printSnapshot(snapshot, options) {
    const html = renderPrintDocument(snapshot, options || {});
    const target = window.open("", "_blank");
    if (!target) throw new Error("瀏覽器阻擋了列印視窗，請允許彈出視窗後再試。");
    target.document.open();
    target.document.write(html);
    target.document.close();
    return { snapshot, html, target };
  }

  return {
    SHOW_QUESTION_CODE,
    createSnapshotSeed,
    generateSnapshot,
    generateSnapshotFromSpecs,
    generateSnapshotFromQuestions,
    renderPDF,
    renderPrintDocument,
    printSnapshot,
    _private: { hashString, printScript, printCss, answerHtml },
  };
}
